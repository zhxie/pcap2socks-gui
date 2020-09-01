import React from "react";
import { notification, Layout, Row, Col, Typography, Card, Statistic, Button } from "antd";
import { LeftOutlined, FolderOpenOutlined, ExportOutlined, PlayCircleOutlined, RightOutlined, PoweroffOutlined } from "@ant-design/icons";
import { ThunderboltTwoTone, ApiTwoTone, PlaySquareTwoTone, CompassTwoTone, CheckCircleTwoTone } from "@ant-design/icons";
import { ClockCircleOutlined, HourglassOutlined, ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { promisified } from "tauri/api/tauri";

import "./MainWindow.css";
import RowSelect from "./components/RowSelect";
import RowInput from "./components/RowInput";
import RowSwitch from "./components/RowSwitch";
import Interface from "./models/Interface";
import { presets, Device } from "./models/Device";
import Proxy from "./models/Proxy";
import Convert from "./utils/Convert";

const { Content } = Layout;
const { Paragraph, Title } = Typography;

const STAGE_WELCOME: number = 0;
const STAGE_INTERFACE: number = 1;
const STAGE_DEVICE: number = 2;
const STAGE_PROXY: number = 3;
const STAGE_RUNNING: number = 4;

const ipc = async (args: any): Promise<any> => {
  return JSON.parse(await promisified(args));
};

type State = {
  // Status
  stage: number;
  loading: boolean;
  ready: boolean;
  time: number;
  latency: number;
  upload: number;
  download: number;
  // Parameters
  interfaces: { name: string; alias: string }[];
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

class MainWindow extends React.Component<{}, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      // Status
      stage: STAGE_WELCOME,
      loading: false,
      ready: false,
      time: NaN,
      latency: NaN,
      upload: NaN,
      download: NaN,
      // Parameters
      interfaces: [],
      // Interface
      interface: "",
      mtu: 0,
      // Device
      preset: 1,
      source: "10.6.0.1",
      publish: "10.6.0.2",
      // Proxy
      destination: "",
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

    // Export to file
    const a = document.createElement("a");
    a.download = "pcap2socks.json";
    a.rel = "noopener";
    a.href = URL.createObjectURL(new Blob([proxy.stringify()], { type: "application/json" }));
    a.dispatchEvent(new MouseEvent("click"));
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

    const device = Device.from(this.state);
    if (!device) {
      this.setState({ ready: false });
      notification.error({
        message: "无法运行",
        description: "此设备配置是无效的。",
      });
      return;
    }

    const proxy = Proxy.from(this.state);
    if (!proxy) {
      this.setState({ ready: false });
      notification.error({
        message: "无法运行",
        description: "此代理配置是无效的。",
      });
      return;
    }

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

    try {
      let result: { result: boolean; message: string } = await ipc({ cmd: "run", payload: payload });

      if (result.result) {
        this.setState({
          stage: STAGE_RUNNING,
          loading: false,
          ready: true,
        });
      } else {
        this.setState({ loading: false, ready: false });
        notification.error({
          message: "运行失败",
          description: result.message,
        });
      }
    } catch (e) {
      this.setState({ loading: false });
      notification.error({
        message: "未知错误",
        description: e.message,
      });
    }
  };

  stop = async () => {
    this.setState({ loading: true });

    try {
      let result: { result: boolean; message: string } = await ipc({ cmd: "stop" });

      if (result.result) {
        this.setState({
          stage: STAGE_WELCOME,
          loading: false,
          time: NaN,
          latency: NaN,
          upload: NaN,
          download: NaN,
        });
      } else {
        this.setState({ loading: false });
        notification.error({
          message: "停止运行失败",
          description: result.message,
        });
      }
    } catch (e) {
      this.setState({ loading: false });
      notification.error({
        message: "未知错误",
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
              <Paragraph type="secondary">pcap2socks 将监听指定的网卡中的所有网络流量，其中代理源设备的网络流量将被转发到代理服务器。</Paragraph>
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
                this.setState({ interface: value });
              }}
            />
            <RowInput
              label="MTU"
              valueTooltip="MTU 的合法范围为 576 到 1500，如果你希望自动判断 MTU 值，请填写 0"
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
              <Title level={3}>代理源设备</Title>
              <Paragraph type="secondary">代理源设备是你希望被代理的设备，这些设备的网络流量将被转发到代理服务器。</Paragraph>
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
              <Title level={3}>SOCKS 代理服务器</Title>
              <Paragraph type="secondary" style={{ marginBottom: "0" }}>
                代理源设备被转发到代理服务器的网络流量，可以用于维系代理源设备与目的设备间的网络连接。
              </Paragraph>
              <Paragraph type="secondary">如果你有一份来自他人的代理配置文件，在此你可以导入该代理配置。</Paragraph>
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
            <RowSwitch label="代理认证" value={this.state.authentication} onChange={(value) => this.setState({ authentication: value })} />
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
            <CheckCircleTwoTone className="content-content-icon" twoToneColor="#52c41a" />
          </Col>
        </Row>
        <Row className="content-content-row" gutter={[16, 32]} justify="center">
          <Col className="content-content-col" span={24}>
            <Paragraph>
              <Title level={3}>运行中</Title>
            </Paragraph>
          </Col>
        </Row>
        <Row gutter={[16, 0]} justify="center">
          <Col xs={24} sm={12} md={6} style={{ marginBottom: "16px" }}>
            <Card className="card" hoverable>
              <Statistic precision={2} prefix={<ClockCircleOutlined />} title="运行时间" value={Convert.convertTime(this.state.time)} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: "16px" }}>
            <Card className="card" hoverable>
              <Statistic
                precision={2}
                prefix={<HourglassOutlined />}
                title="延迟"
                value={Convert.convertDuration(this.state.latency)}
                suffix={Convert.convertDurationUnit(this.state.latency)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: "16px" }}>
            <Card className="card" hoverable>
              <Statistic
                precision={2}
                prefix={<ArrowDownOutlined />}
                title="下载速度"
                value={Convert.convertBitrate(this.state.download)}
                suffix={Convert.convertBitrateUnit(this.state.download)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ marginBottom: "16px" }}>
            <Card className="card" hoverable>
              <Statistic
                precision={2}
                prefix={<ArrowUpOutlined />}
                title="上传速度"
                value={Convert.convertBitrate(this.state.upload)}
                suffix={Convert.convertBitrateUnit(this.state.upload)}
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
                  <Button className="button" icon={<LeftOutlined />} onClick={() => this.setState({ stage: this.state.stage - 1 })}>
                    上一步
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_PROXY) {
                return (
                  <div>
                    <Button
                      className="button"
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
                    <Button className="button" icon={<ExportOutlined />} onClick={this.export}>
                      导出代理配置
                    </Button>
                  </div>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_WELCOME && this.state.ready) {
                return (
                  <Button className="button" type="primary" icon={<PlayCircleOutlined />} onClick={this.run}>
                    以上次的配置运行
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage >= STAGE_WELCOME && this.state.stage < STAGE_PROXY) {
                return (
                  <Button className="button" icon={<RightOutlined />} type="primary" onClick={() => this.setState({ stage: this.state.stage + 1 })}>
                    下一步
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_PROXY) {
                return (
                  <Button className="button" type="primary" icon={<PoweroffOutlined />} onClick={this.run}>
                    运行
                  </Button>
                );
              }
            })()}
            {(() => {
              if (this.state.stage === STAGE_RUNNING) {
                return (
                  <Button className="button" type="primary" danger icon={<PoweroffOutlined />} onClick={this.stop}>
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

    // Load interfaces
    try {
      let interfaces: { name: string; alias: string }[] = await ipc({ cmd: "listInterfaces" });
      if (interfaces.length <= 0) {
        notification.error({
          message: "无网卡",
          description: "pcap2socks 无法在此设备中找到任何有效的网卡。",
        });
      } else {
        this.setState({ interfaces: interfaces, interface: interfaces[0].name });

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
    } catch (e) {
      notification.error({
        message: "未知错误",
        description: e.message,
      });
    }
  }
}

export default MainWindow;
