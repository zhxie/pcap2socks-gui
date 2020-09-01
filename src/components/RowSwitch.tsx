import React from "react";
import { Row, Col, Switch, Tooltip } from "antd";

type Props = {
  gutter: number;
  offset: number;
  label?: string;
  tooltip?: string | number | boolean | React.ReactNode;
  valueTooltip?: string | number | boolean | React.ReactNode;
  value?: boolean;
  onChange?: ((value: boolean) => void) | undefined;
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
        <Col span={16} style={{ display: "flex" }}>
          <Tooltip title={this.props.valueTooltip}>
            <Switch
              checked={this.props.value}
              onChange={(value) => {
                if (this.props.onChange) {
                  this.props.onChange(value);
                }
              }}
            />
          </Tooltip>
        </Col>
      </Row>
    );
  }
}

export default RowSelect;
