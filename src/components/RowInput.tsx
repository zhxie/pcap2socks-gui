import React from "react";
import { Row, Col, Input } from "antd";

type Props = {
  offset?: number;
  label?: string;
  prefix?: React.ReactNode;
  password?: boolean;
  placeholder?: string;
  value?: string | number | readonly string[];
  onChange?: (value: string) => void;
  tail?: boolean;
};

class RowInput extends React.Component<Props, {}> {
  static defaultProps = {
    offset: 24,
    password: false,
    tail: false,
  };

  render() {
    return (
      <Row gutter={[16, this.props.tail ? 0 : 16]}>
        <Col span={8}>
          <span style={{ marginLeft: this.props.offset + "px" }}>
            {this.props.label}
          </span>
        </Col>
        <Col span={16}>
          {(() => {
            if (this.props.password) {
              return (
                <Input.Password
                  prefix={this.props.prefix}
                  value={this.props.value}
                  onChange={(ev) => {
                    if (this.props.onChange) {
                      this.props.onChange(ev.target.value);
                    }
                  }}
                />
              );
            } else {
              return (
                <Input
                  prefix={this.props.prefix}
                  placeholder={this.props.placeholder}
                  value={this.props.value}
                  onChange={(ev) => {
                    if (this.props.onChange) {
                      this.props.onChange(ev.target.value);
                    }
                  }}
                />
              );
            }
          })()}
        </Col>
      </Row>
    );
  }
}

export default RowInput;
