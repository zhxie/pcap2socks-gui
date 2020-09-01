const presets = [
  { label: "自定义", value: 0 },
  { label: "腾讯网游加速器", value: 1 },
  { label: "网易 UU 加速器", value: 2 },
];

class Device {
  public preset: number;
  public source: string;
  public publish: string;

  constructor(preset: number, source: string, publish: string) {
    this.preset = preset;
    this.source = source;
    this.publish = publish;
  }

  validate = () => {
    if (!Number.isInteger(this.preset) || this.preset < 0 || this.preset > 2 || this.source.length === 0) {
      return false;
    }

    return true;
  };

  static from = (data: any) => {
    if (typeof data.preset === "number" && typeof data.source === "string" && typeof data.publish === "string") {
      const device = new Device(data.preset, data.source, data.publish);

      return device.validate() ? device : null;
    } else {
      return null;
    }
  };

  static parse = (text: string) => {
    try {
      let data = JSON.parse(text);

      return Device.from(data);
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  stringify = () => {
    const data = {
      preset: this.preset,
      source: this.source,
      publish: this.publish,
    };

    return JSON.stringify(data, undefined, 2);
  };
}

export { presets, Device };
