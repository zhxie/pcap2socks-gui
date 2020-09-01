import React from "react";
import { Row, Col, Select } from "antd";

type Props = {
  offset?: number;
  label?: string;
  options?: { label: string; value: any }[];
  value?: any;
  onChange?: ((value: any) => void) | undefined;
  tail?: boolean;
};

class RowSelect extends React.Component<Props, {}> {
  static defaultProps = {
    offset: 24,
    options: [],
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
          <Select
            options={this.props.options}
            value={this.props.value}
            onChange={(value) => {
              if (this.props.onChange) {
                this.props.onChange(value);
              }
            }}
            style={{ width: "100%" }}
          />
        </Col>
      </Row>
    );
  }
}

export default RowSelect;
