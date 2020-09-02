class Proxy {
  public destination: string;
  public authentication: boolean;
  public username: string;
  public password: string;
  public extra: string;

  constructor(destination: string, authentication: boolean, username: string, password: string, extra: string) {
    this.destination = destination;
    this.authentication = authentication;
    this.username = username;
    this.password = password;
    this.extra = extra;
  }

  validate = () => {
    if (this.destination.length === 0) {
      return false;
    }

    return true;
  };

  static from = (data: any) => {
    if (
      typeof data.destination === "string" &&
      typeof data.authentication === "boolean" &&
      typeof data.username === "string" &&
      typeof data.password === "string" &&
      typeof data.extra === "string"
    ) {
      const proxy = new Proxy(data.destination, data.authentication, data.username, data.password, data.extra);

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
      destination: this.destination,
      authentication: this.authentication,
      username: this.username,
      password: this.password,
      extra: this.extra,
    };

    return JSON.stringify(data, undefined, 2);
  };
}

export default Proxy;
