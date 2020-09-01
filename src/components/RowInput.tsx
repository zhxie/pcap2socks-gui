import React from "react";
import { Row, Col, Input, Tooltip } from "antd";

type Props = {
  gutter: number;
  offset: number;
  label?: string;
  tooltip?: string | number | boolean | React.ReactNode;
  prefix?: React.ReactNode;
  password?: boolean;
  placeholder?: string;
  valueTooltip?: string | number | boolean | React.ReactNode;
  value?: string | number | readonly string[];
  onChange?: (value: string) => void;
  tail?: boolean;
};

class RowInput extends React.Component<Props, {}> {
  static defaultProps = {
    gutter: 8,
    offset: 0,
    password: false,
    tail: false,
  };

  render() {
    return (
      <Row gutter={[this.props.gutter, this.props.tail ? 0 : this.props.gutter]}>
        <Col span={8} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Tooltip title={this.props.tooltip}>
            <span style={{ marginLeft: this.props.offset + "px" }}>{this.props.label}</span>
          </Tooltip>
        </Col>
        <Col span={16}>
          {(() => {
            if (this.props.password) {
              return (
                <Tooltip title={this.props.valueTooltip}>
                  <Input.Password
                    prefix={this.props.prefix}
                    value={this.props.value}
                    onChange={(ev) => {
                      if (this.props.onChange) {
                        this.props.onChange(ev.target.value);
                      }
                    }}
                    style={{ textAlign: "center" }}
                  />
                </Tooltip>
              );
            } else {
              return (
                <Tooltip title={this.props.valueTooltip}>
                  <Input
                    prefix={this.props.prefix}
                    placeholder={this.props.placeholder}
                    value={this.props.value}
                    onChange={(ev) => {
                      if (this.props.onChange) {
                        this.props.onChange(ev.target.value);
                      }
                    }}
                    style={{ textAlign: "center" }}
                  />
                </Tooltip>
              );
            }
          })()}
        </Col>
      </Row>
    );
  }
}

export default RowInput;
