const protocols = [
  { label: "SOCKS5", value: 0 },
  { label: "Shadowsocks", value: 1 },
];

class Proxy {
  public protocol: number;
  public destination: string;
  public authentication: boolean;
  public username: string;
  public password: string;

  constructor(protocol: number, destination: string, authentication: boolean, username: string, password: string) {
    this.protocol = protocol;
    this.destination = destination;
    this.authentication = authentication;
    this.username = username;
    this.password = password;
  }

  validate = () => {
    if (!Number.isInteger(this.protocol) || this.protocol < 0 || this.protocol > 1 || this.destination.length === 0) {
      return false;
    }

    return true;
  };

  static from = (data: any) => {
    if (
      typeof data.protocol === "number" &&
      typeof data.destination === "string" &&
      typeof data.authentication === "boolean" &&
      typeof data.username === "string" &&
      typeof data.password === "string"
    ) {
      const proxy = new Proxy(data.protocol, data.destination, data.authentication, data.username, data.password);

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
      return null;
    }
  };

  stringify = () => {
    const data = {
      protocol: this.protocol,
      destination: this.destination,
      authentication: this.authentication,
      username: this.username,
      password: this.password,
    };

    return JSON.stringify(data, undefined, 2);
  };
}

export {protocols, Proxy};
