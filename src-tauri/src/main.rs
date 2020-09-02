#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use ipnetwork::Ipv4Network;
use std::io;
use std::sync::atomic::Ordering;
use std::sync::Arc;

pub mod cmd;
pub mod lib;
use cmd::{Cmd, GetStatusResponse, Interface, RunResponse, TestNatTypeResponse};
use lib::Status;

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
                            let interfaces = lib::interfaces()
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
                    Cmd::TestNatType {
                        payload,
                        callback,
                        error,
                    } => tauri::execute_promise(
                        _webview,
                        move || {
                            let auth = match payload.authentication {
                                true => Some((payload.username, payload.password)),
                                false => None,
                            };
                            let proxy = lib::resolve_addr(payload.proxy.as_str())?;

                            // NAT type test
                            let nat = lib::test_nat_type(proxy, auth)?;

                            Ok(TestNatTypeResponse {
                                nat: nat.to_string(),
                            })
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
                                let auth = match payload.authentication {
                                    true => Some((payload.username, payload.password)),
                                    false => None,
                                };
                                let proxy = lib::resolve_addr(payload.destination.as_str())?;

                                // NAT type test
                                let nat = lib::test_nat_type(proxy, auth.clone())?;

                                // Interface
                                let interface = match lib::interface(&payload.interface) {
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
                                let src = payload.source.parse::<Ipv4Network>()?;
                                let publish = match payload.publish.is_empty() {
                                    true => None,
                                    false => Some(payload.publish.parse()?),
                                };
                                let gw = match publish {
                                    Some(publish) => publish,
                                    None => interface.ip_addr().unwrap(),
                                };
                                let mask = lib::calc_mask(src, gw);

                                // Proxy
                                if !payload.extra.is_empty() {
                                    lib::run_shadowsocks(
                                        payload.extra.as_str(),
                                        proxy,
                                        Arc::clone(&status.is_running),
                                    )?;
                                }
                                status.is_running.store(true, Ordering::Relaxed);
                                status.latency.store(0, Ordering::Relaxed);
                                status.upload.store(0, Ordering::Relaxed);
                                status.download.store(0, Ordering::Relaxed);
                                lib::run_pcap2socks(
                                    interface,
                                    mtu,
                                    src,
                                    publish,
                                    proxy,
                                    auth.clone(),
                                    Arc::clone(&status.is_running),
                                    Arc::clone(&status.upload),
                                    Arc::clone(&status.download),
                                )?;
                                lib::ping(
                                    proxy,
                                    auth.clone(),
                                    Arc::clone(&status.is_running),
                                    Arc::clone(&status.latency),
                                )?;

                                Ok(RunResponse {
                                    nat: nat.to_string(),
                                    ip: src.to_string(),
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
                                status.download.store(0, Ordering::Relaxed);

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
                                };
                                status.upload.store(0, Ordering::Relaxed);
                                status.download.store(0, Ordering::Relaxed);
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
