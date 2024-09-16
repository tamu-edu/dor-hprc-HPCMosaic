import React from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import _ from "lodash";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../style.css"; // Your custom styles

const ResponsiveReactGridLayout = WidthProvider(Responsive);

export default class AddRemoveLayout extends React.PureComponent {
  static defaultProps = {
    className: "layout",
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 100,
    margin: [10, 10],
    isResizable: true,
    isDraggable: true,
    preventCollision: true, // Prevent items from colliding when resized or moved
    compactType: null, // Disable auto-compacting for free movement
  };

  constructor(props) {
    super(props);

    this.state = {
      items: [0, 1, 2, 3, 4].map((i) => ({
        i: i.toString(),
        x: i * 2,
        y: 0,
        w: 5,
        h: 5,
      })),
      newCounter: 5, // Start counter at 5 since you already have 5 items
    };

    this.onAddItem = this.onAddItem.bind(this);
    this.onBreakpointChange = this.onBreakpointChange.bind(this);
    this.onRemoveItem = this.onRemoveItem.bind(this);
    this.onLayoutChange = this.onLayoutChange.bind(this);
  }

  createElement(el) {
    const removeStyle = {
      position: "absolute",
      right: "10px",
      top: "10px",
      cursor: "pointer",
    };
    const i = el.i;

    return (
      <div
        key={i}
        data-grid={el}
        className="bg-white shadow-lg rounded-lg p-4 relative border border-gray-300 hover:shadow-xl transition-shadow"
      >
        <span className="text-xl font-semibold text-gray-800">{i}</span>
        <span
          className="remove text-red-500 hover:text-red-700 font-bold"
          style={removeStyle}
          onClick={() => this.onRemoveItem(i)}
        >
          ×
        </span>
      </div>
    );
  }

  onAddItem() {
    console.log("adding", "n" + this.state.newCounter);
    this.setState({
      items: this.state.items.concat({
        i: "n" + this.state.newCounter,
        x: (this.state.items.length * 2) % (this.state.cols || 12),
        y: Infinity, // Puts it at the bottom
        w: 3,
        h: 3,
      }),
      newCounter: this.state.newCounter + 1,
    });
  }

  onBreakpointChange(breakpoint, cols) {
    this.setState({
      breakpoint: breakpoint,
      cols: cols,
    });
  }

  onLayoutChange(layout) {
    this.setState({ layout: layout });
  }

  onRemoveItem(i) {
    console.log("removing", i);
    this.setState({
      items: _.reject(this.state.items, { i: i }),
    });
  }

  render() {
    return (
      <div>
        <button
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600"
          onClick={this.onAddItem}
        >
          Add Item
        </button>
        <ResponsiveReactGridLayout
          onLayoutChange={this.onLayoutChange}
          onBreakpointChange={this.onBreakpointChange}
          {...this.props}
          useCSSTransforms={true} // Enable smooth transitions during dragging/resizing
          measureBeforeMount={true}
          preventCollision={true} // Ensure items don’t overlap
          compactType={null} // Disable compacting behavior for free movement
          isBounded={false} // Prevents items from jumping around when resizing or dragging
          resizeHandles={['se']} // Only show resize handle in the bottom-right corner
        >
          {_.map(this.state.items, (el) => this.createElement(el))}
        </ResponsiveReactGridLayout>
      </div>
    );
  }
}
