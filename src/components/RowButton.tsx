import React from "react";
import { Row, Col, Button } from "antd";

type Props = {
  offset?: number;
  label?: string;
  type?: "default" | "primary";
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  tail?: boolean;
};

class RowButton extends React.Component<Props, {}> {
  static defaultProps = {
    offset: 24,
    type: "default",
    danger: false,
    disabled: false,
    loading: false,
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
          <Button
            type={this.props.type}
            danger={this.props.danger}
            disabled={this.props.disabled}
            loading={this.props.loading}
            onClick={this.props.onClick}
          >
            {this.props.text}
          </Button>
        </Col>
      </Row>
    );
  }
}

export default RowButton;
