# pcap2socks GUI

**pcap2socks GUI** is a front-end interface for [pcap2socks](https://github.com/zhxie/pcap2socks).

For development convenience, this project is currently in _Simplified Chinese_ only.

## Troubleshoot

1. To use pcap2socks GUI in Windows, you may enable loopback for WebViewHost with the command below in an **administrative** console. Please refer to [the documentation of Tauri](https://tauri.studio/en/docs/getting-started/setup-windows#4-enable-loopback) for more information. 

   ```
   CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy"
   ```

## License

pcap2socks GUI is licensed under [the MIT License](/LICENSE).
