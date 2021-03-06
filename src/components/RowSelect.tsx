import React from "react";
import { Row, Col, Select, Tooltip } from "antd";

type Props = {
  gutter: number;
  offset: number;
  label?: string;
  tooltip?: string | number | boolean | React.ReactNode;
  options?: { label: string; value: any }[];
  valueTooltip?: string | number | boolean | React.ReactNode;
  value?: any;
  onChange?: ((value: any) => void) | undefined;
  tail?: boolean;
};

class RowSelect extends React.Component<Props, {}> {
  static defaultProps = {
    gutter: 8,
    offset: 0,
    options: [],
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
          <Tooltip title={this.props.valueTooltip}>
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
          </Tooltip>
        </Col>
      </Row>
    );
  }
}

export default RowSelect;
