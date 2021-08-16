import React from "react";
import ReactDOM from "react-dom";
import { ConfigProvider } from "antd";
import zhCN from "antd/es/locale/zh_CN";

import "./index.css";
import App from "./App";


ReactDOM.render(
  <React.StrictMode>
    <ConfigProvider autoInsertSpaceInButton={false} locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
