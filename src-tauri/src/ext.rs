use dnsping::{self, RW as _};
use ipnetwork::Ipv4Network;
use ninat::{self, NatType, RW as _};
use pcap2socks::pcap::Interface;
use pcap2socks::{Forwarder, ProxyConfig, Redirector};
use shadowsocks::{self, ClientConfig, Config, ConfigType, Mode, ServerConfig};
use std::collections::VecDeque;
use std::io;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, SocketAddrV4};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tokio::runtime::Runtime;
use tokio::time;

pub fn interfaces() -> Vec<Interface> {
    pcap2socks::interfaces()
}

pub fn interface(name: &str) -> Option<Interface> {
    interfaces()
        .into_iter()
        .filter(|inter| inter.is_up() && !inter.is_loopback())
        .filter(|inter| inter.name() == name)
        .next()
}

pub fn resolve_ip(url: &str) -> io::Result<Ipv4Addr> {
    let ip = match url.parse::<Ipv4Addr>() {
        Ok(ip) => ip,
        Err(e) => match dns_lookup::lookup_host(url)?
            .into_iter()
            .filter(|ip| ip.is_ipv4())
            .collect::<VecDeque<_>>()
            .pop_front()
        {
            Some(ip) => match ip {
                IpAddr::V4(ip) => ip,
                _ => unreachable!(),
            },
            None => return Err(io::Error::new(io::ErrorKind::NotFound, e)),
        },
    };

    Ok(ip)
}

pub fn resolve_addr(addr: &str) -> io::Result<SocketAddrV4> {
    let index = addr.rfind(":");
    return match index {
        Some(index) => {
            let ip = addr.chars().take(index).collect::<String>();
            let port = addr
                .chars()
                .skip(index.checked_add(1).unwrap_or(usize::MAX))
                .collect::<String>();

            let ip = resolve_ip(ip.as_str())?;
            let port = match port.parse::<u16>() {
                Ok(port) => port,
                Err(e) => return Err(io::Error::new(io::ErrorKind::InvalidInput, e)),
            };

            Ok(SocketAddrV4::new(ip, port))
        }
        None => Err(io::Error::from(io::ErrorKind::InvalidInput)),
    };
}

pub fn calc_mask(src: Ipv4Network, gw: Ipv4Addr) -> Ipv4Addr {
    let src_octets = src.network().octets();
    let mask_octets = src.mask().octets();
    let gw_octets = gw.octets();

    // Mask, align to 8 bytes
    let mut mask_octets = [
        !(src_octets[0] ^ gw_octets[0]) & mask_octets[0],
        !(src_octets[1] ^ gw_octets[1]) & mask_octets[1],
        !(src_octets[2] ^ gw_octets[2]) & mask_octets[2],
        !(src_octets[3] ^ gw_octets[3]) & mask_octets[3],
    ];
    let mut is_zero = false;
    mask_octets.iter_mut().for_each(|b| {
        if is_zero || *b != u8::MAX {
            *b = 0;
            is_zero = true;
        }
    });
    let mask_value = u32::from_be_bytes(mask_octets);
    Ipv4Addr::from(mask_value)
}

const NAT_TYPE_TEST_TIMEOUT: u64 = 3000;

pub fn test_nat_type(proxy: SocketAddrV4, auth: Option<(String, String)>) -> io::Result<NatType> {
    let datagram = ninat::Datagram::bind(
        proxy,
        SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0),
        auth.clone(),
    )?;
    datagram.set_read_timeout(Some(Duration::from_millis(NAT_TYPE_TEST_TIMEOUT)))?;
    let rw1: Box<dyn ninat::RW> = Box::new(datagram);

    let datagram = ninat::Datagram::bind(
        proxy,
        SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0),
        auth.clone(),
    )?;
    datagram.set_read_timeout(Some(Duration::from_millis(NAT_TYPE_TEST_TIMEOUT)))?;
    let rw2: Box<dyn ninat::RW> = Box::new(datagram);

    let server1 = ninat::lookup_host_v4("nncs1-lp1.n.n.srv.nintendo.net")?;
    let server2 = ninat::lookup_host_v4("nncs2-lp1.n.n.srv.nintendo.net")?;

    let (_, nat) = ninat::nat_test(&rw1, &rw2, server1, server2)?;

    Ok(nat)
}

pub struct Status {
    pub is_running: Arc<AtomicBool>,
    pub latency: Arc<AtomicUsize>,
    pub upload: Arc<AtomicUsize>,
    pub upload_count: Arc<AtomicUsize>,
    pub download: Arc<AtomicUsize>,
    pub download_count: Arc<AtomicUsize>,
    pub download_latency: Arc<AtomicUsize>,
}

impl Status {
    pub fn new() -> Status {
        Status {
            is_running: Arc::new(AtomicBool::new(false)),
            latency: Arc::new(AtomicUsize::new(0)),
            upload: Arc::new(AtomicUsize::new(0)),
            upload_count: Arc::new(AtomicUsize::new(0)),
            download: Arc::new(AtomicUsize::new(0)),
            download_count: Arc::new(AtomicUsize::new(0)),
            download_latency: Arc::new(AtomicUsize::new(0)),
        }
    }
}

pub fn run_shadowsocks(
    proxy: &str,
    local: SocketAddrV4,
    is_running: Arc<AtomicBool>,
) -> io::Result<()> {
    let server = match ServerConfig::from_url(proxy) {
        Ok(config) => config,
        Err(e) => return Err(io::Error::new(io::ErrorKind::InvalidData, e)),
    };
    let mut config = Config::new(ConfigType::Socks5Local);
    config.local_addr = Some(ClientConfig::from(SocketAddr::from(local)));
    config.server = vec![server];
    config.mode = Mode::TcpAndUdp;

    let mut rt = Runtime::new()?;

    thread::spawn(move || {
        let _ = rt.block_on(run_shadowsocks_impl(config, Arc::clone(&is_running)));
        is_running.store(false, Ordering::Relaxed);
    });

    Ok(())
}

pub async fn run_shadowsocks_impl(
    config: Config,
    is_running: Arc<AtomicBool>,
) -> io::Result<((), ())> {
    let ss = shadowsocks::run(config);
    let close = delay_for_check(is_running);

    tokio::pin!(ss, close);

    tokio::try_join!(ss, close)
}

pub async fn delay_for_check(b: Arc<AtomicBool>) -> io::Result<()> {
    loop {
        time::delay_for(time::Duration::new(1, 0)).await;
        if !b.load(Ordering::Relaxed) {
            return Err(io::Error::from(io::ErrorKind::NotConnected));
        }
    }
}

pub fn run_pcap2socks(
    interface: Interface,
    mtu: usize,
    src: Ipv4Network,
    publish: Option<Ipv4Addr>,
    proxy: SocketAddrV4,
    auth: Option<(String, String)>,
    is_running: Arc<AtomicBool>,
    upload: Arc<AtomicUsize>,
    upload_count: Arc<AtomicUsize>,
    download: Arc<AtomicUsize>,
    download_count: Arc<AtomicUsize>,
    latency: Arc<AtomicUsize>,
) -> io::Result<()> {
    let (tx, mut rx) = interface.open()?;
    let forwarder = Forwarder::new_monitored(
        tx,
        mtu,
        interface.hardware_addr(),
        interface.ip_addr().unwrap(),
        Some(download),
        Some(latency),
        Some(download_count),
    );
    let mut redirector = Redirector::new(
        Arc::new(Mutex::new(forwarder)),
        src,
        publish.unwrap_or(interface.ip_addr().unwrap()),
        publish,
        ProxyConfig::new_socks(proxy, false, false, auth),
    );

    let mut rt = Runtime::new()?;
    thread::spawn(move || {
        let is_running_cloned = Arc::clone(&is_running);
        let _ = rt.block_on(redirector.open_monitored(&mut rx, is_running, upload, upload_count));
        is_running_cloned.store(false, Ordering::Relaxed);
    });

    Ok(())
}

const PING_TIMEOUT: u64 = 3000;

pub fn ping(
    proxy: SocketAddrV4,
    auth: Option<(String, String)>,
    is_running: Arc<AtomicBool>,
    latency: Arc<AtomicUsize>,
) -> io::Result<()> {
    let datagram = dnsping::Datagram::bind(
        SocketAddr::V4(proxy),
        SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0)),
        auth,
    )?;
    datagram.set_read_timeout(Some(Duration::from_millis(PING_TIMEOUT)))?;
    let rw: Box<dyn dnsping::RW> = Box::new(datagram);
    let mut id: u16 = 0;
    let host = "www.google.com".to_string();

    thread::spawn(move || loop {
        if !is_running.load(Ordering::Relaxed) {
            break;
        }
        id = id.checked_add(1).unwrap_or(0);
        match dnsping::ping(
            &rw,
            SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::new(8, 8, 8, 8), 53)),
            id,
            false,
            &host,
        ) {
            Ok((_, duration)) => {
                latency.store(duration.as_millis() as usize, Ordering::Relaxed);
            }
            Err(_) => {
                latency.store(usize::MAX, Ordering::Relaxed);
            }
        }
    });

    Ok(())
}
