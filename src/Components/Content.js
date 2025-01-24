import React, { useState, useEffect, useCallback } from "react";
import { ItemTypes } from "./ItemTypes";
import { useDrop } from "react-dnd";
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { debounce } from "lodash";

// Elements
import PyVenvManager from "../Charts/PyVenvManager";
import ClusterInfo from "../Charts/ClusterInfo";
import Chatbot from "../Charts/Chatbot";
import QuotaInfo from "../Charts/QuotaInfo";
import UserGroups from "../Charts/UserGroups";

const ReactGridLayout = WidthProvider(RGL);

const Content = (props) => {
  const [row, setRow] = useState([]);
  const [layout, setLayout] = useState([]);

  // Default layout
  const defaultLayout = [
    {
      name: "Node Utilization",
      i: "0",
      x: 0,
      y: 0,
      w: 2,
      h: 3,
    },
    {
      name: "PyVenvManager",
      i: "1",
      x: 2,
      y: 0,
      w: 2,
      h: 3,
    },
    {
      name: "Chatbot",
      i: "2",
      x: 0,
      y: 3,
      w: 2,
      h: 3,
    },
    {
      name: "Quota Info",
      i: "3",
      x: 2,
      y: 3,
      w: 2,
      h: 3,
    },
    {
      name: "User Groups",
      i: "4",
      x: 2,
      y: 4,
      w: 2,
      h: 3,
    },
  ];

  // Load default layout on component mount
  useEffect(() => {
    setRow(defaultLayout);
    setLayout(defaultLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
  }, []);

  const onLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  const onResize = (layouts) => {
    setLayout(layouts);
  };

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.CARD,
    drop: (item) => {
      const width = item.name === "Node Utilization" ? 2 : 1;
      const height = item.name === "Node Utilization" ? 3 : 1;

      const newItem = {
        name: item.name,
        id: item.id,
        i: `${row.length}`,
        x: row.length % 4,
        y: Math.floor(row.length / 4),
        w: width,
        h: height,
      };

      setRow([...row, newItem]);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const debouncedChange = useCallback(
    debounce((newRow) => {
      props.change(newRow);
    }, 100),
    [props]
  );

  useEffect(() => {
    debouncedChange(row);
  }, [row, debouncedChange]);

  const removeElement = (index) => {
    const newRow = row.filter((_, i) => i !== index);
    setRow(newRow);
  };

  const renderChart = (ele, index) => {
    switch (ele.name) {
      case "Node Utilization":
        return <ClusterInfo />;
      case "PyVenvManager":
        return <PyVenvManager />;
      case "Chatbot":
        return <Chatbot />;
      case "Quota Info":
        return <QuotaInfo />;
      case "User Groups":
        return <UserGroups />;
      default:
        return <div className="text-center text-red-500">Unknown Chart</div>;
    }
  };

  return (
    <div
      ref={drop}
      className={`max-w-full h-auto p-4 ${isOver ? "bg-gray-100" : ""}`}
    >
      <ReactGridLayout
        layout={layout}
        onLayoutChange={onLayoutChange}
        onResize={onResize}
        width={"100%"}
        cols={4}
        isBounded={false}
        isDroppable={true}
        isResizable={true}
        isDraggable={true}
        preventCollision={true}
        compactType={null}
        autoSize={true}
        className="bg-white rounded-lg"
      >
        {row.map((ele, index) => (
          <div
            key={ele.i}
            data-grid={ele}
            className="bg-white shadow-lg rounded-md p-4 border border-gray-300 relative h-full w-full"
          >
            <button
              onClick={() => removeElement(index)}
              className="absolute top-4 right-4 bg-red-400 hover:bg-red-500 text-white p-2 rounded-full text-sm"
            >
              X
            </button>
            <div className="h-full w-full">
              {renderChart(ele, index)}
            </div>
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
};

export default Content;
