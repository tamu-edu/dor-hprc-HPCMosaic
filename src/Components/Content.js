import React, { useState, useEffect, useCallback } from "react";
import { ItemTypes } from "./ItemTypes";
import { useDrop } from "react-dnd";
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { debounce } from "lodash";
import { v4 as uuidv4 } from "uuid"; // For unique IDs
import { toast, ToastContainer } from "react-toastify"; // ✅ Import Toastify
import "react-toastify/dist/ReactToastify.css"; // ✅ Import Toastify styles

// Elements
import PyVenvManager from "../Charts/PyVenvManager";
import ClusterInfo from "../Charts/ClusterInfo";
import UserJobs from "../Charts/UserJobs";
import Chatbot from "../Charts/Chatbot";
import QuotaInfo from "../Charts/QuotaInfo";
import QuotaButton from "../Charts/QuotaButton";
import UserGroups from "../Charts/UserGroups";
import Accounts from "../Charts/Accounts";
import Composer from "../Charts/Composer";

const ReactGridLayout = WidthProvider(RGL);

const Content = ({ layoutData, setLayoutData, change }) => {
  // ✅ Default layout (used on first load)
  const defaultLayout = [
    { name: "Accounts", i: uuidv4(), x: 0, y: 0, w: 10, h: 10 },
    { name: "Node Utilization", i: uuidv4(), x: 0, y: 6, w: 5, h: 18 },
    { name: "PyVenvManager", i: uuidv4(), x: 5, y: 5, w: 5, h: 20 },
    { name: "Quota Info", i: uuidv4(), x: 0, y: 18, w: 5, h: 18 },
    { name: "User Groups", i: uuidv4(), x: 5, y: 16, w: 5, h: 18 },
    { name: "User Jobs", i: uuidv4(), x: 5, y: 20, w: 5, h: 10 },
  ];

  // ✅ Ensure the initial layout is set correctly
  const [row, setRow] = useState(layoutData?.length > 0 ? layoutData : defaultLayout);
  const [layout, setLayout] = useState(
    layoutData?.length > 0 ? layoutData.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })) : []
  );

  // ✅ Listen for changes to layoutData and update the state
  useEffect(() => {
    if (layoutData && Array.isArray(layoutData) && layoutData.length > 0) {
      console.log("🔄 Updating Content.js with new layoutData:", layoutData);
      setRow(layoutData);
      setLayout(layoutData.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
    }
  }, [layoutData]);

  // ✅ Function to add a new element
  const addNewElement = (item) => {
    if (row.some((ele) => ele.name === item.name)) {
      toast.warn(`"${item.name}" is already added!`, {
        autoClose: 2000,
        position: "top-right",
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
      return;
    }

    const newItem = {
      name: item.name,
      i: uuidv4(),
      x: row.length % 4,
      y: Math.floor(row.length / 4),
      w: 4,
      h: 10,
    };

    const newRow = [...row, newItem];
    setRow(newRow);
    setLayout(newRow.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
    setLayoutData(newRow); // ✅ Updates the global layout
  };

  // ✅ Drop functionality
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.CARD,
    drop: (item) => addNewElement(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  // ✅ Debounced state update
  const debouncedChange = useCallback(
    debounce((newRow) => {
      change(newRow);
    }, 100),
    [change]
  );

  useEffect(() => {
    debouncedChange(row);
  }, [row, debouncedChange]);

  // ✅ Function to remove an element
  const removeElement = (index) => {
    const newRow = row.filter((_, i) => i !== index);
    const newLayout = layout.filter((item) => item.i !== row[index].i);

    setRow(newRow);
    setLayout(newLayout);
    setLayoutData(newRow); // ✅ Update global state
  };

  // ✅ Function to render correct charts
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
      case "Composer":
        return <Composer />;
      case "Quota Button":
        return <QuotaButton />;
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
    <div ref={drop} className={`max-w-full h-auto p-4 ${isOver ? "bg-gray-100" : ""}`}>
      {/* ✅ Toast Notification Container */}
      <ToastContainer />

      <ReactGridLayout
        layout={layout}
        onLayoutChange={(newLayout) => setLayout(newLayout)}
        width={1200}
        cols={10}
        rowHeight={20}
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
            className="resizable-element bg-white shadow-lg rounded-md p-4 border border-gray-300 relative h-full w-full"
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
