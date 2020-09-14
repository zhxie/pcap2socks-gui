import React from "react";
import { ConfigProvider } from "antd";
import { notification, Layout, Row, Col, Typography, Card, Statistic, Button, Tooltip } from "antd";
import zhCN from "antd/es/locale/zh_CN";
import {
  LeftOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  ExportOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  RightOutlined,
  GlobalOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import {
  ThunderboltTwoTone,
  ApiTwoTone,
  PlaySquareTwoTone,
  CompassTwoTone,
  QuestionCircleTwoTone,
  CheckCircleTwoTone,
} from "@ant-design/icons";
import { ClockCircleOutlined, HourglassOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { promisified } from "tauri/api/tauri";

import "./App.css";
import RowSelect from "./components/RowSelect";
import RowInput from "./components/RowInput";
import RowSwitch from "./components/RowSwitch";
import Interface from "./models/Interface";
import { presets, Device } from "./models/Device";
import Proxy from "./models/Proxy";
import Convert from "./utils/Convert";

const { Content } = Layout;
const { Paragraph, Title, Text } = Typography;

const STAGE_WELCOME: number = 0;
const STAGE_INTERFACE: number = 1;
const STAGE_DEVICE: number = 2;
const STAGE_PROXY: number = 3;
const STAGE_RUNNING: number = 4;

const TRAFFIC_DISPLAY_TRAFFIC: number = 0;
const TRAFFIC_DISPLAY_TRAFFIC_TOTAL: number = 1;
const TRAFFIC_DISPLAY_PACKET: number = 2;
const TRAFFIC_DISPLAY_PACKET_TOTAL: number = 3;

const isTauri = !!window.__TAURI_INVOKE_HANDLER__;
const ipc = async (args: any): Promise<any> => {
  if (!isTauri) {
    throw new Error("请通过可执行文件启动 pcap2socks。");
  }
  try {
    const result: string = await promisified(args);

    return result;
  } catch (e) {
    throw new Error(e);
  }
};

const natTypes = new Map([
  ["A", "开放 (A, 1)"],
  ["B", "中等 (B, 2)"],
  ["C", "严格 (C ,3)"],
  ["D", "严格 (D, 3)"],
  ["F", "不可用 (F)"],
]);

type State = {
  // Status
  stage: number;
  loading: number;
  ready: boolean;
  ip: string;
  mask: string;
  gateway: string;
  time: number;
  latency: number;
  upload: number;
  uploadTotal: number;
  uploadCount: number;
  uploadCountTotal: number;
  download: number;
  downloadTotal: number;
  downloadCount: number;
  downloadCountTotal: number;
  // Parameters
  interfaces: { name: string; alias: string; mtu: number }[];
  trafficDisplay: number;
  // Interface
  interface: string;
  mtu: number;
  // Device
  preset: number;
  source: string;
  publish: string;
  // Proxy
  destination: string;
  authentication: boolean;
  username: string;
  password: string;
  extra: string;
};

class App extends React.Component<{}, State> {
  public timer: any;
  constructor(props: any) {
    super(props);
    this.state = {
      // Status
      stage: STAGE_WELCOME,
      loading: 0,
      ready: false,
      ip: "",
      mask: "",
      gateway: "",
      time: NaN,
      latency: NaN,
      upload: NaN,
      uploadTotal: NaN,
      uploadCount: NaN,
      uploadCountTotal: NaN,
      download: NaN,
      downloadTotal: NaN,
      downloadCount: NaN,
      downloadCountTotal: NaN,
      // Parameters
      interfaces: [],
      trafficDisplay: 0,
      // Interface
      interface: "",
      mtu: 0,
      // Device
      preset: 1,
      source: "10.6.0.1",
      publish: "10.6.0.2",
      // Proxy
      destination: "localhost:1080",
      authentication: false,
      username: "",
      password: "",
      extra: "",
    };
  }

  import = (event: React.ChangeEvent<HTMLInputElement>) => {
    let reader = new FileReader();
    reader.onload = (ev) => {
      try {
        if (!ev.target) {
          return;
        }
        let proxy = Proxy.parse(String(ev.target.result));
        if (!proxy) {
          throw new Error("此代理配置是无效的。");
        }

        this.setState({
          destination: proxy.destination,
          authentication: proxy.authentication,
          username: proxy.username,
          password: proxy.password,
          extra: proxy.extra,
        });
      } catch (e) {
        notification.error({
          message: "无法导入代理配置",
          description: e.message,
        });
      }
    };
    if (!event.target || !event.target.files) {
      return;
    }
    reader.readAsText(event.target.files[0]);
    // Clear input
    const node = document.getElementById("open");
    if (node) {
      (node as HTMLInputElement).value = "";
    }
  };

  export = () => {
    const proxy = Proxy.from(this.state);
    if (!proxy) {
      notification.error({
        message: "无法导出代理配置",
        description: "此代理配置是无效的。",
      });
      return;
    }
    const data = proxy.stringify();

    // Export to file
    const a = document.createElement("a");
    a.download = "pcap2socks.json";
    a.rel = "noopener";
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.dispatchEvent(new MouseEvent("click"));

    notification.info({
      message: "导出代理配置",
      description: data,
    });
  };

  switchTraffic = () => {
    this.setState({ trafficDisplay: (this.state.trafficDisplay + 1) % 4 });
  };

  showUploadValue = () => {
    switch (this.state.trafficDisplay) {
      case TRAFFIC_DISPLAY_TRAFFIC:
        return Convert.convertRate(this.state.upload);
      case TRAFFIC_DISPLAY_TRAFFIC_TOTAL:
        return Convert.convertThroughput(this.state.uploadTotal);
      case TRAFFIC_DISPLAY_PACKET:
        return Convert.convertRate(this.state.uploadCount);
      case TRAFFIC_DISPLAY_PACKET_TOTAL:
        return Convert.convertThroughput(this.state.uploadCountTotal);
      default:
        throw new Error("out of range");
    }
  };

  showUploadUnit = () => {
    switch (this.state.trafficDisplay) {
      case TRAFFIC_DISPLAY_TRAFFIC:
        return Convert.convertBitrateUnit(this.state.upload);
      case TRAFFIC_DISPLAY_TRAFFIC_TOTAL:
        return Convert.convertBitThroughputUnit(this.state.uploadTotal);
      case TRAFFIC_DISPLAY_PACKET:
        return Convert.convertPacketRateUnit(this.state.uploadCount);
      case TRAFFIC_DISPLAY_PACKET_TOTAL:
        return Convert.convertPacketThroughputUnit(this.state.uploadCountTotal);
      default:
        throw new Error("out of range");
    }
  };

  showDownloadValue = () => {
    switch (this.state.trafficDisplay) {
      case TRAFFIC_DISPLAY_TRAFFIC:
        return Convert.convertRate(this.state.download);
      case TRAFFIC_DISPLAY_TRAFFIC_TOTAL:
        return Convert.convertThroughput(this.state.downloadTotal);
      case TRAFFIC_DISPLAY_PACKET:
        return Convert.convertRate(this.state.downloadCount);
      case TRAFFIC_DISPLAY_PACKET_TOTAL:
        return Convert.convertThroughput(this.state.downloadCountTotal);
      default:
        throw new Error("out of range");
    }
  };

  showDownloadUnit = () => {
    switch (this.state.trafficDisplay) {
      case TRAFFIC_DISPLAY_TRAFFIC:
        return Convert.convertBitrateUnit(this.state.download);
      case TRAFFIC_DISPLAY_TRAFFIC_TOTAL:
        return Convert.convertBitThroughputUnit(this.state.downloadTotal);
      case TRAFFIC_DISPLAY_PACKET:
        return Convert.convertPacketRateUnit(this.state.downloadCount);
      case TRAFFIC_DISPLAY_PACKET_TOTAL:
        return Convert.convertPacketThroughputUnit(this.state.downloadCountTotal);
      default:
        throw new Error("out of range");
    }
  };

  notifyTest = (title: string, nat: string, ip: string) => {
    const natStr = natTypes.get(nat) ?? nat;
    notification.success({
      message: title,
      description: (
        <div>
          {(() => {
            if (ip) {
              return (
                <Paragraph style={{ marginBottom: "0" }}>
                  代理服务器的 IP 为 <Text strong>{ip}</Text>，
                </Paragraph>
              );
            }
          })()}
          <Paragraph style={{ marginBottom: "0" }}>
            代理服务器的 NAT 类型为 <Text strong>{natStr}</Text>。
          </Paragraph>
        </div>
      ),
    });
  };

  notifyNetwork = () => {
    notification.info({
      key: "network",
      message: "网络设置",
      description: (
        <div>
          <Paragraph>请将代理源设备的网络设置配置为：</Paragraph>
          <Row gutter={[16, 0]}>
            <Col span={6}>
              <span>IP 地址</span>
            </Col>
            <Col span={18}>
              <span>{this.state.ip}</span>
            </Col>
          </Row>
          <Row gutter={[16, 0]}>
            <Col span={6}>
              <span>子网掩码</span>
            </Col>
            <Col span={18}>
              <span>{this.state.mask}</span>
            </Col>
          </Row>
          <Row gutter={[16, 0]}>
            <Col span={6}>
              <span>网关</span>
            </Col>
            <Col span={18}>
              <span>{this.state.gateway}</span>
            </Col>
          </Row>
          <Row gutter={[16, 0]}>
            <Col span={6}>
              <span>MTU</span>
            </Col>
            <Col span={18}>
              <span>不超过 {this.state.mtu}</span>
            </Col>
          </Row>
        </div>
      ),
      duration: 0,
    });
  };

  updateInterfaces = async () => {
    this.setState({ loading: 1 });

    try {
      let interfaces: { name: string; alias: string; mtu: number }[] = await ipc({ cmd: "listInterfaces" });
      if (interfaces.length <= 0) {
        this.setState({ loading: 0, ready: false, interfaces: [], interface: "" });
        notification.error({
          message: "无网卡",
          description: "pcap2socks 无法在此设备中找到任何有效的网卡。",
        });
      } else {
        this.setState({ loading: 0, interfaces: interfaces, interface: interfaces[0].name, mtu: interfaces[0].mtu });
      }
    } catch (e) {
      this.setState({ loading: 0, ready: false });
      notification.error({
        message: "获取网卡失败",
        description: e.message,
      });
    }
  };

  test = async () => {
    const proxy = Proxy.from(this.state);
    if (!proxy) {
      this.setState({ ready: false });
      notification.error({
        message: "无法测试代理服务器",
        description: "此代理配置是无效的。",
      });
      return;
    }

    const payload = {
      destination: proxy.destination,
      authentication: proxy.authentication,
      username: proxy.username,
      password: proxy.password,
      extra: proxy.extra,
    };

    this.setState({ loading: 2 });

    try {
      let res: { nat: string; ip: string } = await ipc({ cmd: "test", payload: payload });
      this.setState({ loading: 0 });

      this.notifyTest("测试代理服务器成功", res.nat, res.ip);
    } catch (e) {
      this.setState({ loading: 0, ready: false });
      notification.error({
        message: "测试代理服务器失败",
        description: e.message,
      });
    }
  };

  run = async () => {
    const inter = Interface.from(this.state);
    if (!inter) {
      this.setState({ ready: false });
      notification.error({
        message: "无法运行",
        description: "此网卡配置是无效的。",
      });
      return;
    }
    localStorage.setItem("interface", inter.stringify());

    const device = Device.from(this.state);
    if (!device) {
      this.setState({ ready: false });
      notification.error({
        message: "无法运行",
        description: "此设备配置是无效的。",
      });
      return;
    }
    localStorage.setItem("device", device.stringify());

    const proxy = Proxy.from(this.state);
    if (!proxy) {
      this.setState({ ready: false });
      notification.error({
        message: "无法运行",
        description: "此代理配置是无效的。",
      });
      return;
    }
    localStorage.setItem("proxy", proxy.stringify());

    const payload = {
      interface: inter.interface,
      mtu: inter.mtu,
      preset: device.preset,
      source: device.source,
      publish: device.publish,
      destination: proxy.destination,
      authentication: proxy.authentication,
      username: proxy.username,
      password: proxy.password,
      extra: proxy.extra,
    };

    this.setState({ loading: 3 });

    try {
      let res: { nat: string; remoteIp: string; srcIp: string; mask: string; gateway: string } = await ipc({
        cmd: "run",
        payload: payload,
      });

      this.setState({
        stage: STAGE_RUNNING,
        loading: 0,
        ready: true,
        ip: res.srcIp,
        mask: res.mask,
        gateway: res.gateway,
        time: NaN,
        latency: NaN,
        upload: NaN,
        uploadTotal: NaN,
        uploadCount: NaN,
        uploadCountTotal: NaN,
        download: NaN,
        downloadTotal: NaN,
        downloadCount: NaN,
        downloadCountTotal: NaN,
      });
      this.timer = setInterval(this.getStatus, 1000);

      this.notifyTest("运行成功", res.nat, res.remoteIp);
      this.notifyNetwork();
    } catch (e) {
      this.setState({
        loading: 0,
        ready: false,
        ip: "",
        mask: "",
        gateway: "",
        time: NaN,
        latency: NaN,
        upload: NaN,
        uploadTotal: NaN,
        uploadCount: NaN,
        uploadCountTotal: NaN,
        download: NaN,
        downloadTotal: NaN,
        downloadCount: NaN,
        downloadCountTotal: NaN,
      });
      notification.error({
        message: "运行失败",
        description: e.message,
      });
    }
  };

  stop = async () => {
    this.setState({ loading: 4 });

    try {
      await ipc({ cmd: "stop" });

      this.setState({
        stage: STAGE_WELCOME,
        loading: 0,
        ip: "",
        mask: "",
        gateway: "",
        time: NaN,
        latency: NaN,
        upload: NaN,
        uploadTotal: NaN,
        uploadCount: NaN,
        uploadCountTotal: NaN,
        download: NaN,
        downloadTotal: NaN,
        downloadCount: NaN,
        downloadCountTotal: NaN,
      });
      clearInterval(this.timer);

      notification.close("network");
    } catch (e) {
      this.setState({ loading: 0 });
      notification.error({
        message: "停止运行失败",
        description: e.message,
      });
    }
  };

  getStatus = async () => {
    try {
      let status: {
        run: boolean;
        latency: number;
        upload: number;
        uploadCount: number;
        download: number;
        downloadCount: number;
      } = await ipc({ cmd: "getStatus" });

      this.setState({
        time: status.run ? (Number.isNaN(this.state.time) ? 1 : this.state.time + 1) : NaN,
        latency: status.latency > 1000 ? Infinity : status.latency,
        upload: status.upload,
        uploadTotal: Number.isNaN(this.state.uploadTotal) ? status.upload : this.state.uploadTotal + status.upload,
        uploadCount: status.uploadCount,
        uploadCountTotal: Number.isNaN(this.state.uploadCountTotal)
          ? status.uploadCount
          : this.state.uploadCountTotal + status.uploadCount,
        download: status.download,
        downloadTotal: Number.isNaN(this.state.downloadTotal)
          ? status.download
          : this.state.downloadTotal + status.download,
        downloadCount: status.downloadCount,
        downloadCountTotal: Number.isNaN(this.state.downloadCountTotal)
          ? status.downloadCount
          : this.state.downloadCountTotal + status.downloadCount,
      });
    } catch (e) {
      notification.error({
        message: "获取运行状态失败",
        description: e.message,
      });
    }
  };

  renderWelcome = () => {
    return (
      <div className="content-content">
        <Row className="content-content-row" gutter={[16, 16]} justify="center">
          <Col className="content-content-col" span={24}>
            <ThunderboltTwoTone className="content-content-icon" />
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 0]} justify="center">
          <Col className="content-content-col" span={24}>
            <Paragraph>
              <Title level={3}>欢迎使用 pcap2socks</Title>
              <Paragraph type="secondary" style={{ marginBottom: "0" }}>
                pcap2socks 是一款通过 pcap 重定向流量到 SOCKS 代理的代理。
              </Paragraph>
              <Paragraph type="secondary">在使用 pcap2socks 前，你需要进行简单的配置，请点击“下一步”以继续。</Paragraph>
            </Paragraph>
          </Col>
        </Row>
      </div>
    );
  };

  renderInterface = () => {
    return (
      <div className="content-content">
        <Row className="content-content-row" gutter={[16, 16]} justify="center">
          <Col className="content-content-col" span={24}>
            <ApiTwoTone className="content-content-icon" />
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 32]} justify="center">
          <Col className="content-content-col" span={24}>
            <Paragraph>
              <Title level={3}>网卡</Title>
              <Paragraph type="secondary" style={{ marginBottom: "0" }}>
                pcap2socks 将监听指定的网卡中的所有网络流量，其中源设备的网络流量将被转发到代理服务器。
              </Paragraph>
              <Paragraph type="secondary">
                通常，你可以选择此设备用于上网的网卡，但如果你的源设备通过此设备的移动热点上网，请选择这张用于网络共享的网卡。
              </Paragraph>
            </Paragraph>
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 0]} justify="center">
          <Col className="content-content-col" xs={24} sm={18} md={12}>
            <RowSelect
              label="网卡"
              options={this.state.interfaces.map((ele) => {
                return { label: ele.alias ? ele.alias : ele.name, value: ele.name };
              })}
              value={this.state.interface}
              onChange={(value) => {
                const inter = this.state.interfaces.find((ele) => ele.name === value);
                let mtu = 0;
                if (inter) {
                  mtu = Math.min(1500, inter.mtu);
                }

                this.setState({ interface: value, mtu: mtu });
              }}
            />
            <RowInput
              label="MTU"
              valueTooltip="MTU 的合法范围为 576 到 1500，如果你不清楚 MTU，请保留默认值"
              value={this.state.mtu}
              onChange={(value) => {
                this.setState({ mtu: Number(value) });
              }}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} justify="center"></Row>
      </div>
    );
  };

  renderDevice = () => {
    return (
      <div className="content-content">
        <Row className="content-content-row" gutter={[16, 16]} justify="center">
          <Col className="content-content-col" span={24}>
            <PlaySquareTwoTone className="content-content-icon" />
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 32]} justify="center">
          <Col className="content-content-col" span={24}>
            <Paragraph>
              <Title level={3}>源设备</Title>
              <Paragraph type="secondary" style={{ marginBottom: "0" }}>
                源设备是你希望被代理的设备，和此设备处于同一网络中的任何设备都可以是源设备。
              </Paragraph>
              <Paragraph type="secondary">如果你不清楚如何配置，你可以任选一个预设方案尝试并继续。</Paragraph>
            </Paragraph>
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 0]} justify="center">
          <Col className="content-content-col" xs={24} sm={18} md={12}>
            <RowSelect
              label="预设方案"
              options={presets}
              valueTooltip="预设方案不影响使用效果，但如果你在使用 pcap2socks 的同时也使用其它加速器，使用预设方案将免去你频繁修改网络设置的烦恼"
              value={this.state.preset}
              onChange={(value) => this.setState({ preset: Number(value) })}
            />
            {(() => {
              if (this.state.preset === 0) {
                return (
                  <div>
                    <RowInput
                      label="源 IP 地址"
                      valueTooltip="如果你需要代理多台设备的网络流量，请填写源 CIDR 地址"
                      value={this.state.source}
                      onChange={(value) => {
                        this.setState({ source: value });
                      }}
                    />
                    <RowInput
                      label="虚拟网关"
                      valueTooltip="虚拟网关可以用于创建代理源设备与此设备间的网络隔离环境，如果你不希望使用虚拟网关，请留空"
                      value={this.state.publish}
                      onChange={(value) => {
                        this.setState({ publish: value });
                      }}
                    />
                  </div>
                );
              }
            })()}
          </Col>
        </Row>
        <Row gutter={[16, 16]} justify="center"></Row>
      </div>
    );
  };

  renderProxy = () => {
    return (
      <div className="content-content">
        <Row className="content-content-row" gutter={[16, 16]} justify="center">
          <Col className="content-content-col" span={24}>
            <CompassTwoTone className="content-content-icon" />
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 32]} justify="center">
          <Col className="content-content-col" span={24}>
            <Paragraph>
              <Title level={3}>代理服务器</Title>
              <Paragraph type="secondary" style={{ marginBottom: "0" }}>
                源设备被转发到代理服务器的网络流量将用于维系源设备与目的设备间的网络联系。
              </Paragraph>
              <Paragraph type="secondary">如果你有一份来自他人的代理配置文件，你可以导入该代理配置。</Paragraph>
            </Paragraph>
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 0]} justify="center">
          <Col className="content-content-col" xs={24} sm={18} md={12}>
            <RowInput
              label="代理地址"
              value={this.state.destination}
              onChange={(value) => {
                this.setState({ destination: value });
              }}
            />
            <RowSwitch
              label="代理认证"
              value={this.state.authentication}
              onChange={(value) => this.setState({ authentication: value })}
            />
            {(() => {
              if (this.state.authentication) {
                return (
                  <div>
                    <RowInput
                      label="用户名"
                      value={this.state.username}
                      onChange={(value) => {
                        this.setState({ username: value });
                      }}
                    />
                    <RowInput
                      label="密码"
                      password
                      value={this.state.password}
                      onChange={(value) => {
                        this.setState({ password: value });
                      }}
                    />
                  </div>
                );
              }
            })()}
            <RowInput
              label="高级选项"
              valueTooltip="如果你不清楚高级选项，请留空"
              value={this.state.extra}
              onChange={(value) => {
                this.setState({ extra: value });
              }}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} justify="center"></Row>
      </div>
    );
  };

  renderRunning = () => {
    return (
      <div className="content-content">
        <Row className="content-content-row" gutter={[16, 16]} justify="center">
          <Col className="content-content-col" span={24}>
            {(() => {
              if (Number.isNaN(this.state.time)) {
                return <QuestionCircleTwoTone className="content-content-icon" />;
              } else {
                return <CheckCircleTwoTone className="content-content-icon" twoToneColor="#52c41a" />;
              }
            })()}
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 32]} justify="center">
          <Col className="content-content-col" span={24}>
            <Paragraph>
              <Title level={3}>
                {(() => {
                  if (Number.isNaN(this.state.time)) {
                    return "未运行";
                  } else {
                    return "运行中";
                  }
                })()}
              </Title>
            </Paragraph>
          </Col>
        </Row>
        <Row gutter={[16, 0]} justify="center">
          <Col xs={24} sm={12} md={6} style={{ marginBottom: "16px" }}>
            <Card className="card" hoverable>
              <Statistic
                precision={2}
                prefix={<ClockCircleOutlined />}
                title="运行时间"
                value={Convert.convertTime(this.state.time)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: "16px" }}>
            <Card className="card" hoverable>
              <Statistic
                prefix={<HourglassOutlined />}
                title="延迟"
                value={Convert.convertDuration(this.state.latency)}
                valueStyle={(() => {
                  if (this.state.latency === Infinity) {
                    return { color: "#cf1322" };
                  } else if (this.state.latency >= 100) {
                    return { color: "#faad14" };
                  }
                })()}
                suffix={Convert.convertDurationUnit(this.state.latency)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: "16px" }}>
            <Card hoverable onClick={this.switchTraffic}>
              <Statistic
                precision={2}
                prefix={<ArrowUpOutlined />}
                title="上传"
                value={this.showUploadValue()}
                suffix={this.showUploadUnit()}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: "16px" }}>
            <Card hoverable onClick={this.switchTraffic}>
              <Statistic
                precision={2}
                prefix={<ArrowDownOutlined />}
                title="下载"
                value={this.showDownloadValue()}
                suffix={this.showDownloadUnit()}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  render() {
    return (
      <Layout className="layout">
        <Content className="content-wrapper">
          <div className="content">
            {(() => {
              switch (this.state.stage) {
                case STAGE_WELCOME:
                  return this.renderWelcome();
                case STAGE_INTERFACE:
                  return this.renderInterface();
                case STAGE_DEVICE:
                  return this.renderDevice();
                case STAGE_PROXY:
                  return this.renderProxy();
                case STAGE_RUNNING:
                  return this.renderRunning();
                default:
                  return;
              }
            })()}
          </div>
          <div className="footer">
            {(() => {
              if (this.state.stage > STAGE_WELCOME && this.state.stage <= STAGE_PROXY) {
                return (
                  <Button
                    className="button"
                    disabled={this.state.loading > 0}
                    icon={<LeftOutlined />}
                    onClick={() => this.setState({ stage: this.state.stage - 1 })}
                  >
                    上一步
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_INTERFACE) {
                return (
                  <Button
                    className="button"
                    disabled={this.state.loading > 0 && this.state.loading !== 1}
                    icon={<ReloadOutlined />}
                    onClick={this.updateInterfaces}
                  >
                    刷新网卡列表
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_PROXY) {
                return (
                  <Button
                    className="button"
                    disabled={this.state.loading > 0}
                    icon={<FolderOpenOutlined />}
                    onClick={() => {
                      const node = document.getElementById("open");
                      if (node) {
                        node.click();
                      }
                    }}
                  >
                    导入代理配置
                    <input id="open" type="file" onChange={this.import} style={{ display: "none" }} />
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_PROXY) {
                return (
                  <Button className="button" icon={<ExportOutlined />} onClick={this.export}>
                    导出代理配置
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_PROXY) {
                return (
                  <Button
                    className="button"
                    disabled={this.state.loading > 0 && this.state.loading !== 2}
                    loading={this.state.loading === 2}
                    icon={<ExperimentOutlined />}
                    onClick={this.test}
                  >
                    测试代理服务器
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_WELCOME && this.state.ready) {
                return (
                  <Tooltip title={this.state.destination}>
                    <Button
                      className="button"
                      type="primary"
                      disabled={this.state.loading > 0 && this.state.loading !== 3}
                      loading={this.state.loading === 3}
                      icon={<PlayCircleOutlined />}
                      onClick={this.run}
                    >
                      以上次的配置运行
                    </Button>
                  </Tooltip>
                );
              }
            })()}
            {(() => {
              if (this.state.stage >= STAGE_WELCOME && this.state.stage < STAGE_PROXY) {
                return (
                  <Button
                    className="button"
                    disabled={this.state.loading > 0}
                    icon={<RightOutlined />}
                    type="primary"
                    onClick={() => this.setState({ stage: this.state.stage + 1 })}
                  >
                    下一步
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_PROXY) {
                return (
                  <Button
                    className="button"
                    type="primary"
                    disabled={this.state.loading > 0 && this.state.loading !== 3}
                    loading={this.state.loading === 3}
                    icon={<PoweroffOutlined />}
                    onClick={this.run}
                  >
                    运行
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_RUNNING) {
                return (
                  <Button className="button" icon={<GlobalOutlined />} onClick={this.notifyNetwork}>
                    显示网络设置
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_RUNNING) {
                return (
                  <Button
                    className="button"
                    type="primary"
                    danger
                    disabled={this.state.loading > 0 && this.state.loading !== 4}
                    loading={this.state.loading === 4}
                    icon={<PoweroffOutlined />}
                    onClick={this.stop}
                  >
                    停止
                  </Button>
                );
              }
            })()}
          </div>
        </Content>
      </Layout>
    );
  }

  async componentDidMount() {
    let ready = 0;

    // Load device from local storage
    const deviceText = localStorage.getItem("device");
    if (deviceText) {
      const device = Device.parse(deviceText);
      if (device) {
        this.setState({
          preset: device.preset,
          source: device.source,
          publish: device.publish,
        });
        ready++;
      }
    }

    // Load proxy from local storage
    const proxyText = localStorage.getItem("proxy");
    if (proxyText) {
      const proxy = Proxy.parse(proxyText);
      if (proxy) {
        this.setState({
          destination: proxy.destination,
          authentication: proxy.authentication,
          username: proxy.username,
          password: proxy.password,
          extra: proxy.extra,
        });
        ready++;
      }
    }

    await this.updateInterfaces();
    const interfaces = this.state.interfaces;
    if (interfaces.length > 0) {
      // Load interface from local storage
      const interText = localStorage.getItem("interface");
      if (interText) {
        const inter = Interface.parse(interText);
        if (inter) {
          let exist = interfaces.findIndex((ele) => ele.name === inter.interface) > -1;
          if (exist) {
            this.setState({
              interface: inter.interface,
              mtu: inter.mtu,
              ready: ready === 2,
            });
          } else {
            notification.warn({
              message: "网卡已更新",
              description: "您的网卡自上次运行以来已发生变化，请重新配置 pcap2socks。",
            });
          }
        }
      }
    }
  }
}

export default () => (
  <ConfigProvider autoInsertSpaceInButton={false} locale={zhCN}>
    <App />
  </ConfigProvider>
);
