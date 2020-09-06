import React from "react";
import { Row, Col, Checkbox, Input, Tooltip } from "antd";

import "./RowCheckboxInput.css";

type Props = {
  gutter: number;
  offset: number;
  label?: string;
  tooltip?: string | number | boolean | React.ReactNode;
  checkTooltip?: string | number | boolean | React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (value: boolean) => void;
  checkLabel?: string;
  valueVisible?: boolean;
  prefix?: React.ReactNode;
  placeholder?: string;
  valueTooltip?: string | number | boolean | React.ReactNode;
  value?: string | number | readonly string[];
  onChange?: (value: string) => void;
  tail?: boolean;
};

class RowCheckboxInput extends React.Component<Props, {}> {
  static defaultProps = {
    gutter: 8,
    offset: 0,
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
          <div className="checkbox-input-wrapper" style={{ display: "flex", alignItems: "center" }}>
            <Tooltip title={this.props.checkTooltip}>
              <Checkbox
                checked={this.props.checked}
                onChange={(ev) => {
                  if (this.props.onCheckedChange) {
                    this.props.onCheckedChange(ev.target.checked);
                  }
                }}
              >
                {this.props.checkLabel}
              </Checkbox>
            </Tooltip>
            {(() => {
              if (this.props.valueVisible) {
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
          </div>
        </Col>
      </Row>
    );
  }
}

export default RowCheckboxInput;
