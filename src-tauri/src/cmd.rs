use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct TestNatTypePayload {
    pub proxy: String,
    pub authentication: bool,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RunPayload {
    pub interface: String,
    pub mtu: usize,
    pub preset: usize,
    pub source: String,
    pub publish: String,
    pub destination: String,
    pub authentication: bool,
    pub username: String,
    pub password: String,
    pub extra: String,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Cmd {
    ListInterfaces {
        callback: String,
        error: String,
    },
    TestNatType {
        payload: TestNatTypePayload,
        callback: String,
        error: String,
    },
    Run {
        payload: RunPayload,
        callback: String,
        error: String,
    },
    Stop {
        callback: String,
        error: String,
    },
    GetStatus {
        callback: String,
        error: String,
    },
}

#[derive(Debug, Serialize)]
pub struct Interface {
    name: String,
    alias: Option<String>,
}

impl Interface {
    pub fn new(name: String, alias: Option<String>) -> Interface {
        Interface { name, alias }
    }

    pub fn parse(str: &str) -> Interface {
        let chars = str.chars().collect::<Vec<_>>();

        let mut iter = chars.into_iter();

        let mut name = Vec::new();
        loop {
            match iter.next() {
                Some(char) => match char {
                    ' ' => break,
                    _ => name.push(char),
                },
                None => break,
            }
        }
        let name = name.into_iter().collect::<String>();

        let mut alias = Vec::new();
        let mut n: usize = 0;
        loop {
            match iter.next() {
                Some(char) => match char {
                    '(' => {
                        if n != 0 {
                            alias.push(char);
                        }
                        n = n.checked_add(1).unwrap_or(usize::MAX);
                    }
                    ')' => {
                        n = n.checked_sub(1).unwrap_or(0);
                        if n == 0 {
                            break;
                        } else {
                            alias.push(char);
                        }
                    }
                    _ => {
                        if n <= 0 {
                            break;
                        } else {
                            alias.push(char);
                        }
                    }
                },
                None => break,
            }
        }
        let alias = match alias.len() {
            0 => None,
            _ => Some(alias.into_iter().collect::<String>()),
        };

        Interface::new(name, alias)
    }
}

#[derive(Debug, Serialize)]
pub struct TestNatTypeResponse {
    pub nat: String,
}

#[derive(Debug, Serialize)]
pub struct RunResponse {
    pub nat: String,
    pub ip: String,
    pub mask: String,
    pub gateway: String,
    pub mtu: usize,
}

#[derive(Debug, Serialize)]
pub struct GetStatusResponse {
    pub run: bool,
    pub latency: usize,
    pub upload: usize,
    pub download: usize,
}
