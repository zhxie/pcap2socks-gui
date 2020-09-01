import React from "react";
import { Row, Col, Collapse } from "antd";

const { Panel } = Collapse;

type Props = {
  gutter: number;
  accordion?: boolean;
  panels?: { label: string; text: string }[];
  tail?: boolean;
};

class RowCollapse extends React.Component<Props, {}> {
  static defaultProps = { gutter: 8, panels: [], tail: false };

  render() {
    return (
      <Row gutter={[this.props.gutter, this.props.tail ? 0 : this.props.gutter]}>
        <Col span={24}>
          <Collapse accordion={this.props.accordion} ghost>
            {() => {
              if (this.props.panels) {
                this.props.panels.map((value, index) => {
                  return (
                    <Panel key={index} header={value.label}>
                      {value.text}
                    </Panel>
                  );
                });
              }
            }}
          </Collapse>
        </Col>
      </Row>
    );
  }
}

export default RowCollapse;
