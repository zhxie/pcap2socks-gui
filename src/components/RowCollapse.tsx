import React from "react";
import { Row, Col, Collapse } from "antd";

const { Panel } = Collapse;

type Props = {
  accordion?: boolean;
  panels?: { label: string; text: string }[];
  tail?: boolean;
};

class RowCollapse extends React.Component<Props, {}> {
  static defaultProps = { panels: [], tail: false };

  getGutter = () => {
    if (this.props.tail) {
      return 16;
    } else {
      return [16, 16];
    }
  };

  render() {
    return (
      <Row gutter={[16, this.props.tail ? 0 : 16]}>
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
