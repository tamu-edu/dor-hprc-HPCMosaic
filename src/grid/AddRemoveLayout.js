import React from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import _ from "lodash";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../style.css";
import GridComponent from "./GridComponent";

const ResponsiveReactGridLayout = WidthProvider(Responsive);

export default class AddRemoveLayout extends React.PureComponent {
  static defaultProps = {
    className: "layout",
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 100,
    margin: [10, 10],
    isResizable: true,
    isDraggable: true,
    preventCollision: false,
    compactType: "vertical",
  };

  constructor(props) {
    super(props);

    this.state = {
      items: [],
      newCounter: 0,
      layouts: { lg: [] },
      droppingItem: null,
    };

    this.onAddItem = this.onAddItem.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.onLayoutChange = this.onLayoutChange.bind(this);
    this.onDrop = this.onDrop.bind(this);
  }

  // Handles adding new items to the grid when dropped
  onAddItem(type, x, y) {
    this.setState({
      items: this.state.items.concat({
        i: "n" + this.state.newCounter,
        x: x,
        y: y,
        w: 3,
        h: 3,
        type: type,
      }),
      newCounter: this.state.newCounter + 1,
    });
  }

  onRemoveItem(i) {
    this.setState({
      items: _.reject(this.state.items, { i }),
    });
  }

  onLayoutChange(layout) {
    this.props.onLayoutChange(layout);
  }

  // Handles drop event for external draggable elements
  onDrop(layout, layoutItem, event) {
    const itemType = event.dataTransfer.getData("text/plain"); // Get the dropped element type
    this.onAddItem(itemType, layoutItem.x, layoutItem.y); // Add the item with correct position
    console.log(`Dropped element props:\n${JSON.stringify(layoutItem, ["x", "y", "w", "h"], 2)}`);
  }

  render() {
    return (
      <ResponsiveReactGridLayout
        {...this.props}
        layouts={this.state.layouts}
        onLayoutChange={this.onLayoutChange}
        onDrop={this.onDrop} // Handle drop event here
        droppingItem={{ i: "new", w: 3, h: 3 }} // Set default size for dropped items
        isDroppable={true} // Enable droppable grid
      >
        {_.map(this.state.items, (el) => this.createElement(el))}
      </ResponsiveReactGridLayout>
    );
  }

  createElement(el) {
    const removeStyle = {
      position: 'absolute',
      right: '10px',
      top: '10px',
      cursor: 'pointer',
    };

    console.log("New element: ", el.type);

    return (
      <div
        key={el.i}
        data-grid={el}
        className="bg-white shadow-lg rounded-lg p-4 relative border border-gray-300"
      >
        <div type={el.type} /> {/* Renders the appropriate component */}
        <span
          className="remove"
          style={removeStyle}
          onClick={() => this.onRemoveItem(el.i)}
        >
          ×
        </span>
      </div>
    );
  }
}
