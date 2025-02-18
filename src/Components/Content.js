import React, { useState, useEffect, useCallback } from "react";
import { ItemTypes } from "./ItemTypes";
import { useDrop } from "react-dnd";
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { debounce } from "lodash";
import { v4 as uuidv4 } from "uuid"; // For unique IDs

// Elements
import PyVenvManager from "../Charts/PyVenvManager";
import ClusterInfo from "../Charts/ClusterInfo";
import UserJobs from "../Charts/UserJobs";
import Chatbot from "../Charts/Chatbot";
import Composer from "../Charts/Composer";
import QuotaInfo from "../Charts/QuotaInfo";
import UserGroups from "../Charts/UserGroups";
import Accounts from "../Charts/Accounts";

const ReactGridLayout = WidthProvider(RGL);

const Content = (props) => {
  const [row, setRow] = useState([]);
  const [layout, setLayout] = useState([]);

  // Default layout
  const defaultLayout = [
    { name: "Accounts", i: uuidv4(), x: 0, y: 0, w: 10, h: 10 }, // Full width at top
    { name: "Node Utilization", i: uuidv4(), x: 0, y: 6, w: 5, h: 18 }, 
    { name: "PyVenvManager", i: uuidv4(), x: 5, y: 5, w: 5, h: 20 },
    { name: "Quota Info", i: uuidv4(), x: 0, y: 18, w: 5, h: 18 },
    { name: "User Groups", i: uuidv4(), x: 5, y: 16, w: 5, h: 18 },
  ];

  // Load default layout on component mount
  useEffect(() => {
    setRow(defaultLayout);
    setLayout(defaultLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
  }, []);

  // Update layout when elements change
  const onLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  // Function to add a new element
// Function to add a new element
const addNewElement = (item) => {
  // Define default width and height based on item type
  const width = item.name === "Node Utilization" ? 5 : 4; // Adjust size if needed
  const height = item.name === "Node Utilization" ? 15 : 10;

  // Prevent duplicate elements
  if (row.some((ele) => ele.name === item.name)) {
    console.warn(`${item.name} is already added!`);
    return;
  }

  const newItem = {
    name: item.name,
    i: uuidv4(), // Unique ID
    x: row.length % 4,  // Spread them out horizontally
    y: Math.floor(row.length / 4), // Stagger rows
    w: width,
    h: height,
  };

  const newRow = [...row, newItem];
  setRow(newRow);
  setLayout(newRow.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
};


  // Drop functionality
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.CARD,
    drop: (item) => addNewElement(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  // Debounced state update
  const debouncedChange = useCallback(
    debounce((newRow) => {
      props.change(newRow);
    }, 100),
    [props]
  );

  useEffect(() => {
    debouncedChange(row);
  }, [row, debouncedChange]);

  // Remove an element
  const removeElement = (index) => {
    const removedItemId = row[index].i;
  
    // Filter out the removed item
    const newRow = row.filter((_, i) => i !== index);
    
    // Preserve size & position by only removing the deleted item from the layout
    const newLayout = layout.filter((item) => item.i !== removedItemId);
  
    setRow(newRow);
    setLayout(newLayout);
  };
  

  // Render appropriate component
  const renderChart = (ele) => {
    switch (ele.name) {
      case "Node Utilization":
        return <ClusterInfo />;
      case "User Jobs":
        return <UserJobs />;
      case "PyVenvManager":
        return <PyVenvManager />;
      case "Chatbot":
        return <Chatbot />;
      // case "Composer":
      //   return <Composer />;
      case "Quota Info":
        return <QuotaInfo />;
      case "User Groups":
        return <UserGroups />;
      case "Accounts":
        return <Accounts />;
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
      width={1200}
      cols={10}
      rowHeight={20} // Reduce this to make height increments smaller
      isBounded={false}
      isDroppable={true}
      isResizable={true}
      isDraggable={true}
      preventCollision={false}
      compactType="vertical"
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
            <div className="h-full w-full">{renderChart(ele)}</div>
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
};

export default Content;
