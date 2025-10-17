import React, { useState, useEffect, useCallback, useRef } from "react";
import { ItemTypes } from "./ItemTypes";
import { useDrop } from "react-dnd";
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { debounce } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import components
import PyVenvManager from "../Charts/PyVenvManager";
import ClusterInfo from "../Charts/ClusterInfo";
import UserJobs from "../Charts/UserJobs";
import Chatbot from "../Charts/Chatbot";
import QuotaInfo from "../Charts/QuotaInfo";
import UserGroups from "../Charts/UserGroups";
import Accounts from "../Charts/Accounts";
import Composer from "../Charts/Composer";
import QuotaButton from "../Charts/QuotaButton";
import AcknowledgementForm from "../Charts/AcknowledgementForm";

const ReactGridLayout = WidthProvider(RGL);

// Component-specific minimum size configurations
const getMinSize = (componentName) => {
  // Default minimums if no specific values are set
  const defaultMin = { minW: 3, minH: 5 };

  // Component-specific minimum sizes
  const componentMinSizes = {
    "Accounts": { minW: 5, minH: 8 },
    "Node Utilization": { minW: 3, minH: 6 },
    "PyVenvManager": { minW: 4, minH: 10 },
    "Quota Info": { minW: 3, minH: 8 },
    "User Groups": { minW: 3, minH: 6 },
    "User Jobs": { minW: 3, minH: 6 },
    "Button Testing": { minW: 2, minH: 2 },
    "Composer": { minW: 2, minH: 2 },
    "Chatbot": { minW: 4, minH: 8 },
    "Quota Button": { minW: 2, minH: 2 },
    "AcknowledgementForm": { minW: 3, minH: 6 },
  };

  return componentMinSizes[componentName] || defaultMin;
};

const Content = ({ layoutData, setLayoutData, change, getLatestLayout }) => {
  // Default layout (used on first load)
  const defaultLayout = [
    { name: "Accounts", i: uuidv4(), x: 0, y: 0, w: 10, h: 10 },
    { name: "Node Utilization", i: uuidv4(), x: 0, y: 6, w: 5, h: 18 },
    { name: "PyVenvManager", i: uuidv4(), x: 5, y: 5, w: 5, h: 20 },
    { name: "Quota Info", i: uuidv4(), x: 0, y: 18, w: 5, h: 18 },
    { name: "AcknowledgementForm", i: uuidv4(), x: 5, y: 25, w: 5, h: 12 },
    { name: "User Groups", i: uuidv4(), x: 5, y: 16, w: 5, h: 18 },
    { name: "User Jobs", i: uuidv4(), x: 5, y: 20, w: 5, h: 10 },
  ];

  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [placeholderPos, setPlaceholderPos] = useState({ x: 0, y: 0 });
  const [placeholderSize, setPlaceholderSize] = useState({ w: 4, h: 10 });
  const [currentDragItem, setCurrentDragItem] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const gridRef = useRef(null);
  const layoutRef = useRef([]);

  // Ensure the initial layout is set correctly
  const [row, setRow] = useState(layoutData?.length > 0 ? layoutData : defaultLayout);
  const [layout, setLayout] = useState(
    layoutData?.length > 0
    ? layoutData.map(({ i, x, y, w, h, name }) => ({ i, x, y, w, h, name }))
    : []
  );

  // Capture latest layout when saving
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // Provide the latest layout when needed
  useEffect(() => {
    getLatestLayout(() => layoutRef.current);
  }, [getLatestLayout]);

  // Listen for changes to layoutData and update the state
  useEffect(() => {
    if (layoutData && Array.isArray(layoutData) && layoutData.length > 0) {
      console.log("🔄 Updating Content.js with new layoutData:", layoutData);
      setRow(layoutData);
      setLayout(layoutData.map(({ i, x, y, w, h, name }) => ({ i, x, y, w, h, name })));
    }
  }, [layoutData]);

  // Calculate grid position based on mouse position
  const calculateGridPosition = (clientX, clientY) => {
    if (!gridRef.current) return { x: 0, y: 0 };

    const gridRect = gridRef.current.getBoundingClientRect();
    const relX = clientX - gridRect.left;
    const relY = clientY - gridRect.top;

    // Convert pixel position to grid position
    const cols = 10; // Grid column count
    const rowHeight = 20; // Grid row height

    const gridX = Math.floor((relX / gridRect.width) * cols);
    const gridY = Math.floor(relY / rowHeight);

    return { x: Math.max(0, Math.min(gridX, cols - 4)), y: Math.max(0, gridY) };
  };

  // Add a placeholder item to preview element placement
  const addPlaceholderToLayout = (pos, item) => {
    // Get component-specific minimum sizes
    const { minW, minH } = getMinSize(item.name);

    // Use appropriate sizes for placeholder
    const w = Math.max(4, minW);
    const h = Math.max(10, minH);

    setPlaceholderSize({ w, h });
    setPlaceholderPos(pos);
    setShowPlaceholder(true);
  };

  // Function to add a new element
  const addNewElement = (item, dropPosition) => {
    if (row.some((ele) => ele.name === item.name)) {
      toast.warn(`"${item.name}" is already added!`, {
        autoClose: 2000,
        position: "top-right",
        hideProgressBar: true,
      });
      return;
    }

    // Get minimum sizes for this component type
    const { minW, minH } = getMinSize(item.name);

    // Use drop position from placeholder
    const newItem = {
      name: item.name,
      i: uuidv4(),
      x: dropPosition.x,
      y: dropPosition.y,
      w: Math.max(4, minW),
      h: Math.max(10, minH),
    };

    const newRow = [...row, newItem];
    setRow(newRow);
    setLayout(newRow.map(({ i, x, y, w, h, name }) => ({ i, x, y, w, h, name })));
    setLayoutData(newRow);

    // Show a success toast
    toast.success(`Added ${item.name} to dashboard`, {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: true,
    });
  };

  // Enhanced drop functionality with displacement preview
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.CARD,
    hover: (item, monitor) => {
      setCurrentDragItem(item);
      setIsDraggingOver(true);

      const clientOffset = monitor.getClientOffset();
      if (clientOffset) {
        const gridPos = calculateGridPosition(clientOffset.x, clientOffset.y);
        addPlaceholderToLayout(gridPos, item);
      }
    },
    drop: (item, monitor) => {
      setShowPlaceholder(false);
      setIsDraggingOver(false);

      // Add the new element at the placeholder position
      addNewElement(item, placeholderPos);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  // Clear placeholder when leaving drop area
  useEffect(() => {
    if (!isOver) {
      setShowPlaceholder(false);
      setIsDraggingOver(false);
    }
  }, [isOver]);

  // Debounced state update
  const debouncedChange = useCallback(
    debounce((newRow) => {
      change(newRow);
    }, 100),
    [change]
  );

  useEffect(() => {
    debouncedChange(row);
  }, [row, debouncedChange]);

  // Function to remove an element
  const removeElement = (index) => {
    const deletedName = row[index].name;
    const newRow = row.filter((_, i) => i !== index);
    const newLayout = layout.filter((item) => item.i !== row[index].i);

    setRow(newRow);
    setLayout(newLayout);
    setLayoutData(newRow);

    toast.info(`Removed ${deletedName}`, {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: true,
    });
  };

  const onLayoutChange = (newLayout) => {
    //console.log("📌 Layout Changed:", newLayout);
    setLayout(newLayout);

    // Preserve the name when updating layout
    const updatedRow = row.map((item) => {
        const newItem = newLayout.find((l) => l.i === item.i);
        return newItem
            ? {
                ...item,
                x: newItem.x,
                y: newItem.y,
                w: newItem.w,
                h: newItem.h
              }
            : item;
    });

    setRow(updatedRow);
    setLayoutData(updatedRow);
  };

  // Function to render correct charts
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
      case "AcknowledgementForm":
        return <AcknowledgementForm />;
      default:
        return <div className="text-center text-red-500">Unknown Chart</div>;
    }
  };

  // Create a combined layout that includes both regular items and the placeholder
  const combinedLayout = showPlaceholder
    ? [...layout, {
        i: 'placeholder',
        x: placeholderPos.x,
        y: placeholderPos.y,
        w: placeholderSize.w,
        h: placeholderSize.h,
        isPlaceholder: true
      }]
    : layout;

  return (
    <div
      ref={(node) => {
        drop(node);
        gridRef.current = node;
      }}
      className={`max-w-full h-auto p-4 relative ${isOver ? "bg-blue-50" : ""}`}
    >
      {/* Toast Notification Container */}
      <ToastContainer />

      <ReactGridLayout
        layout={combinedLayout}
        onLayoutChange={onLayoutChange}
        width={1200}
        cols={10}
        rowHeight={20}
        isBounded={false}
        isDroppable={true}
        isResizable={true}
        isDraggable={true}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        autoSize={true}
	className="bg-gradient-to-b from-transparent via-[#500000] to-transparent rounded-lg"
        draggableCancel=".non-draggable"
      >
        {/* Render actual grid items */}
        {row.map((ele, index) => {
          const { minW, minH } = getMinSize(ele.name);
          return (
            <div
              key={ele.i}
              data-grid={{...ele, minW, minH}}
              className="resizable-element bg-white rounded-md border border-gray-300 relative h-full w-full overflow-hidden"
            >
              {/* Clean, elegant remove button */}
              <button
                onClick={() => removeElement(index) }
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white bg-opacity-80 hover:bg-red-500 text-gray-500 hover:text-white flex items-center justify-center transition-all duration-100 z-20"
                title="Remove this element"
              >
                <span className="text-sm">✕</span>
              </button>

              {/* Component content */}
              <div className="h-full w-full p-0">{renderChart(ele)}</div>
            </div>
          );
        })}

        {/* Render placeholder item */}
        {showPlaceholder && (
          <div
            key="placeholder"
            data-grid={{
              x: placeholderPos.x,
              y: placeholderPos.y,
              w: placeholderSize.w,
              h: placeholderSize.h,
              isResizable: false,
              isDraggable: false,
            }}
            className="border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-50 rounded-md flex items-center justify-center"
          >
            <div className="bg-white px-3 py-1.5 rounded-md shadow-sm">
              <span className="text-blue-600 font-medium">
                {currentDragItem ? `Drop to add ${currentDragItem.name}` : 'Drop here'}
              </span>
            </div>
          </div>
        )}
      </ReactGridLayout>
    </div>
  );
};

export default Content;
