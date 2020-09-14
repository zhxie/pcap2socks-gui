#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use ipnetwork::Ipv4Network;
use std::io;
use std::net::Ipv4Addr;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

pub mod cmd;
pub mod ext;
use cmd::{Cmd, GetStatusResponse, Interface, RunResponse, TestResponse};
use ext::Status;

fn main() {
    let status = Arc::new(Status::new());

    tauri::AppBuilder::new()
        .invoke_handler(move |_webview, arg| match serde_json::from_str(arg) {
            Err(e) => Err(e.to_string()),
            Ok(command) => {
                match command {
                    Cmd::ListInterfaces { callback, error } => tauri::execute_promise(
                        _webview,
                        move || {
                            let interfaces = ext::interfaces()
                                .into_iter()
                                .map(|inter| {
                                    Interface::new(inter.name().clone(), inter.alias().clone())
                                })
                                .collect::<Vec<_>>();

                            Ok(interfaces)
                        },
                        callback,
                        error,
                    ),
                    Cmd::Test {
                        payload,
                        callback,
                        error,
                    } => tauri::execute_promise(
                        _webview,
                        {
                            let status = Arc::clone(&status);
                            move || {
                                let proxy = ext::resolve_addr(payload.destination.as_str())?;
                                let auth = match payload.authentication {
                                    true => Some((payload.username, payload.password)),
                                    false => None,
                                };

                                // Proxy
                                status.is_running.store(true, Ordering::Relaxed);
                                if !payload.extra.is_empty() {
                                    ext::run_shadowsocks(
                                        payload.extra.as_str(),
                                        proxy,
                                        Arc::clone(&status.is_running),
                                    )?;
                                    thread::sleep(Duration::new(1, 0));
                                }
                                let nat = match ext::test_nat_type(proxy, auth.clone()) {
                                    Ok(nat) => nat,
                                    Err(e) => {
                                        status.is_running.store(false, Ordering::Relaxed);
                                        return Err(e.into());
                                    }
                                };
                                status.is_running.store(false, Ordering::Relaxed);

                                Ok(TestResponse {
                                    nat: nat.to_string(),
                                })
                            }
                        },
                        callback,
                        error,
                    ),
                    Cmd::Run {
                        payload,
                        callback,
                        error,
                    } => tauri::execute_promise(
                        _webview,
                        {
                            let status = Arc::clone(&status);
                            move || {
                                // Proxy
                                let proxy = ext::resolve_addr(payload.destination.as_str())?;
                                let auth = match payload.authentication {
                                    true => Some((payload.username, payload.password)),
                                    false => None,
                                };

                                // Interface
                                let interface = match ext::interface(&payload.interface) {
                                    Some(interface) => interface,
                                    None => {
                                        return Err(io::Error::from(io::ErrorKind::NotFound).into())
                                    }
                                };
                                let mtu = match payload.mtu {
                                    0 => interface.mtu(),
                                    _ => payload.mtu,
                                };
                                if mtu <= 0 {
                                    return Err(io::Error::new(
                                        io::ErrorKind::InvalidData,
                                        "cannot detect MTU of the interface",
                                    )
                                    .into());
                                }

                                // Device
                                let src = match payload.preset {
                                    0 => payload.source.parse::<Ipv4Network>()?,
                                    1 => Ipv4Network::new(Ipv4Addr::new(10, 6, 0, 1), 32).unwrap(),
                                    2 => {
                                        let mut ip_octets = interface.ip_addr().unwrap().octets();
                                        ip_octets[0] = 172;
                                        ip_octets[1] = 24;
                                        ip_octets[2] = ip_octets[2].checked_add(1).unwrap_or(0);

                                        Ipv4Network::new(Ipv4Addr::from(ip_octets), 32).unwrap()
                                    }
                                    _ => unreachable!(),
                                };
                                let publish = match payload.preset {
                                    0 => match payload.publish.is_empty() {
                                        true => None,
                                        false => Some(payload.publish.parse()?),
                                    },
                                    1 => Some(Ipv4Addr::new(10, 6, 0, 2)),
                                    2 => {
                                        let mut ip_octets = interface.ip_addr().unwrap().octets();
                                        ip_octets[0] = 172;
                                        ip_octets[1] = 24;

                                        Some(Ipv4Addr::from(ip_octets))
                                    }
                                    _ => unreachable!(),
                                };
                                let gw = match publish {
                                    Some(publish) => publish,
                                    None => interface.ip_addr().unwrap(),
                                };
                                let mask = ext::calc_mask(src, gw);

                                // Proxy
                                status.is_running.store(true, Ordering::Relaxed);
                                status.latency.store(0, Ordering::Relaxed);
                                status.upload.store(0, Ordering::Relaxed);
                                status.download.store(0, Ordering::Relaxed);
                                if !payload.extra.is_empty() {
                                    ext::run_shadowsocks(
                                        payload.extra.as_str(),
                                        proxy,
                                        Arc::clone(&status.is_running),
                                    )?;
                                    thread::sleep(Duration::new(1, 0));
                                }
                                let nat = match ext::test_nat_type(proxy, auth.clone()) {
                                    Ok(nat) => nat,
                                    Err(e) => {
                                        status.is_running.store(false, Ordering::Relaxed);
                                        return Err(e.into());
                                    }
                                };
                                if let Err(e) = ext::run_pcap2socks(
                                    interface,
                                    mtu,
                                    src,
                                    publish,
                                    proxy,
                                    auth.clone(),
                                    Arc::clone(&status.is_running),
                                    Arc::clone(&status.upload),
                                    Arc::clone(&status.upload_count),
                                    Arc::clone(&status.download),
                                    Arc::clone(&status.download_count),
                                    Arc::clone(&status.download_latency),
                                ) {
                                    status.is_running.store(false, Ordering::Relaxed);
                                    return Err(e.into());
                                };
                                if let Err(e) = ext::ping(
                                    proxy,
                                    auth.clone(),
                                    Arc::clone(&status.is_running),
                                    Arc::clone(&status.latency),
                                ) {
                                    status.is_running.store(false, Ordering::Relaxed);
                                    return Err(e.into());
                                };

                                let ip_str = match src.size() {
                                    1 => src.network().to_string(),
                                    _ => format!("{} - {}", src.network(), src.broadcast()),
                                };
                                Ok(RunResponse {
                                    nat: nat.to_string(),
                                    ip: ip_str,
                                    mask: mask.to_string(),
                                    gateway: gw.to_string(),
                                    mtu,
                                })
                            }
                        },
                        callback,
                        error,
                    ),
                    Cmd::Stop { callback, error } => tauri::execute_promise(
                        _webview,
                        {
                            let status = Arc::clone(&status);
                            move || {
                                status.is_running.store(false, Ordering::Relaxed);
                                status.latency.store(0, Ordering::Relaxed);
                                status.upload.store(0, Ordering::Relaxed);
                                status.upload_count.store(0, Ordering::Relaxed);
                                status.download.store(0, Ordering::Relaxed);
                                status.download_count.store(0, Ordering::Relaxed);
                                status.download_latency.store(0, Ordering::Relaxed);

                                Ok(())
                            }
                        },
                        callback,
                        error,
                    ),
                    Cmd::GetStatus { callback, error } => tauri::execute_promise(
                        _webview,
                        {
                            let status = Arc::clone(&status);
                            move || {
                                let response = GetStatusResponse {
                                    run: status.is_running.load(Ordering::Relaxed),
                                    latency: status.latency.load(Ordering::Relaxed),
                                    upload: status.upload.load(Ordering::Relaxed),
                                    download: status.download.load(Ordering::Relaxed),
                                    download_latency: status
                                        .download_latency
                                        .load(Ordering::Relaxed),
                                };
                                status.upload.store(0, Ordering::Relaxed);
                                status.upload_count.store(0, Ordering::Relaxed);
                                status.download.store(0, Ordering::Relaxed);
                                status.download_count.store(0, Ordering::Relaxed);
                                status.download_latency.store(0, Ordering::Relaxed);
                                Ok(response)
                            }
                        },
                        callback,
                        error,
                    ),
                }
                Ok(())
            }
        })
        .build()
        .run();
}
