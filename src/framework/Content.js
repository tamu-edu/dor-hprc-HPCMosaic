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

import CardConfig from "./CardConfig"
import { createDefaultLayout } from "./DefaultLayout";

const ReactGridLayout = WidthProvider(RGL);
const DASHBOARD_COLUMNS = 12;
const CARD_NAME_ALIASES = {
  "GPU Utilization": "GPU Resources",
};

const getCardConfig = (componentName) => CardConfig[CARD_NAME_ALIASES[componentName] || componentName];

// Component-specific minimum size configurations
const getMinSize = (componentName) => {
  const config = getCardConfig(componentName);

  return config ? { minW: config.minW ?? 3, minH: config.minH ?? 5} : {minW: 3, minH: 5};
};

const Content = ({ layoutData, setLayoutData, change, getLatestLayout, layoutLocked }) => {
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [placeholderPos, setPlaceholderPos] = useState({ x: 0, y: 0 });
  const [placeholderSize, setPlaceholderSize] = useState({ w: 4, h: 10 });
  const [currentDragItem, setCurrentDragItem] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const gridRef = useRef(null);
  const layoutRef = useRef([]);

  const [row, setRow] = useState(() => layoutData?.length > 0 ? layoutData : createDefaultLayout());
  const [layout, setLayout] = useState(() =>
    (layoutData?.length > 0 ? layoutData : row).map(({ i, x, y, w, h, name }) => ({ i, x, y, w, h, name }))
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
      //console.log("🔄 Updating Content.js with new layoutData:", layoutData);
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
    const cols = DASHBOARD_COLUMNS; // Grid column count
    const rowHeight = 20; // Grid row height

    const gridX = Math.floor((relX / gridRect.width) * cols);
    const gridY = Math.floor(relY / rowHeight);

    return { x: Math.max(0, Math.min(gridX, cols - 2)), y: Math.max(0, gridY) };
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
    if (layoutLocked) {
      toast.error('Cannot add elements - layout is locked', {
        autoClose: 2000,
	position: "top-right",
	hideProgressBar: true,
      });
      return;
    }

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
  
  const config = getCardConfig(ele.name);

  if (!config) return <div className = "text-center text-red-500">Unknown widget: {ele.name}</div>;
  const ChartComponent = config.chartComponent;

  return <ChartComponent description = {config.description} category={config.category} />;
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
      className={`dashboard-grid-dropzone max-w-full h-auto relative ${isOver ? "theme-selected" : ""}`}
    >
      {/* Toast Notification Container */}
      <ToastContainer />

      <ReactGridLayout
        layout={combinedLayout}
        onLayoutChange={onLayoutChange}
        cols={DASHBOARD_COLUMNS}
        rowHeight={20}
        isBounded={false}
        isDroppable={!layoutLocked}
        isResizable={!layoutLocked}
        isDraggable={!layoutLocked}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        autoSize={true}
	className="dashboard-react-grid"
        draggableCancel=".non-draggable"
      >
        {/* Render actual grid items */}
        {row.map((ele, index) => {
          const { minW, minH } = getMinSize(ele.name);
          return (
            <div
              key={ele.i}
              data-grid={{...ele, minW, minH}}
              className={`resizable-element relative h-full w-full overflow-hidden rounded-[5px] border bg-mosaic-surface shadow-[0_10px_22px_rgba(0,0,0,0.2)] transition-[border-color,box-shadow,background-color] duration-150 hover:border-mosaic-border-strong hover:shadow-[0_14px_28px_rgba(0,0,0,0.28)] ${
		      layoutLocked
	                ? 'border-2'
			: 'border-mosaic-border'
	      }`}
              style={{
	        borderColor: layoutLocked ? '#500000' : undefined
	      }}
            >
              {/* Clean, elegant remove button - only show when not locked */}
	      {!layoutLocked && (
	                <button
                  onClick={() => removeElement(index) }
                  className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-[5px] border border-mosaic-border bg-mosaic-surface text-mosaic-secondary opacity-90 transition-all duration-100 hover:border-mosaic-danger-bg hover:bg-mosaic-danger-bg hover:text-white"
                  title="Remove this element"
                >
                  <span className="text-sm">✕</span>
                </button>
	      )}

              {/* Component content */}
              <div className="h-full min-h-0 w-full text-card-14">{renderChart(ele)}</div>
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
	            className="border-2 border-dashed rounded-md flex items-center justify-center theme-selected"
	            style={{ borderColor: "var(--mosaic-color-primary)" }}
          >
            <div className="theme-surface px-3 py-1.5 rounded-md shadow-sm">
	              <span className="theme-link font-medium">
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
