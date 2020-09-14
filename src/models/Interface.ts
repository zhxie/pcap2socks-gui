class Interface {
  public interface: string;
  public mtu: number;

  constructor(inter: string, mtu: number) {
    this.interface = inter;
    this.mtu = mtu;
  }

  validate = () => {
    if (this.interface.length === 0 || !Number.isInteger(this.mtu) || this.mtu < 576 || this.mtu > 1500) {
      return false;
    }

    return true;
  };

  static from = (data: any) => {
    if (typeof data.interface === "string" && typeof data.mtu === "number") {
      const inter = new Interface(data.interface, data.mtu);

      return inter.validate() ? inter : null;
    } else {
      return null;
    }
  };

  static parse = (text: string) => {
    try {
      let data = JSON.parse(text);

      return Interface.from(data);
    } catch (e) {
      return null;
    }
  };

  stringify = () => {
    const data = {
      interface: this.interface,
      mtu: this.mtu,
    };

    return JSON.stringify(data, undefined, 2);
  };
}

export default Interface;
