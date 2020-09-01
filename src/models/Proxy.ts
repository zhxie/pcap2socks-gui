class Proxy {
  public destination: string;
  public authentication: number;
  public username: string;
  public password: string;
  public association: number;
  public extra: number;
  public shadowsocks: string;

  constructor(
    destination: string,
    authentication: number,
    username: string,
    password: string,
    association: number,
    extra: number,
    shadowsocks: string
  ) {
    this.destination = destination;
    this.authentication = authentication;
    this.username = username;
    this.password = password;
    this.association = association;
    this.extra = extra;
    this.shadowsocks = shadowsocks;
  }

  validate = () => {
    if (
      this.destination.length === 0 ||
      !Number.isInteger(this.authentication) ||
      this.authentication < 0 ||
      this.authentication > 1 ||
      !Number.isInteger(this.association) ||
      this.association < 0 ||
      this.association > 2 ||
      !Number.isInteger(this.extra) ||
      this.extra < 0 ||
      this.extra > 1
    ) {
      return false;
    }

    return true;
  };

  static from = (data: any) => {
    if (
      typeof data.destination === "string" &&
      typeof data.authentication === "number" &&
      typeof data.username === "string" &&
      typeof data.password === "string" &&
      typeof data.association === "number" &&
      typeof data.extra === "number" &&
      typeof data.shadowsocks === "string"
    ) {
      const proxy = new Proxy(
        data.destination,
        data.authentication,
        data.username,
        data.password,
        data.association,
        data.extra,
        data.shadowsocks
      );

      return proxy.validate() ? proxy : null;
    } else {
      return null;
    }
  };

  static parse = (text: string) => {
    try {
      let data = JSON.parse(text);

      return Proxy.from(data);
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  stringify = () => {
    const data = {
      destination: this.destination,
      authentication: this.authentication,
      username: this.username,
      password: this.password,
      association: this.association,
      extra: this.extra,
      shadowsocks: this.shadowsocks,
    };

    return JSON.stringify(data, undefined, 2);
  };
}

export default Proxy;
