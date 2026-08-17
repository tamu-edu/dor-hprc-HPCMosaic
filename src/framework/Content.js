import React, { useState, useEffect, useRef } from "react";
import { ItemTypes } from "./ItemTypes";
import { useDrop } from "react-dnd";
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-hot-toast";

import CardConfig from "./CardConfig"

const ReactGridLayout = WidthProvider(RGL);
const DASHBOARD_COLUMNS = 12;
const DEFAULT_CARD_SIZE = { w: 4, h: 10 };
const CARD_NAME_ALIASES = {
  "GPU Utilization": "GPU Resources",
  "Accounts Usage Summary": "Accounts",
};

const getCardConfig = (componentName) => CardConfig[CARD_NAME_ALIASES[componentName] || componentName];

// Component-specific minimum size configurations
const getMinSize = (componentName) => {
  const config = getCardConfig(componentName);

  return config ? { minW: config.minW ?? 3, minH: config.minH ?? 5} : {minW: 3, minH: 5};
};

const toGridSize = (value, fallback) => {
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? size : fallback;
};

const getInitialSize = (componentName) => {
  const config = getCardConfig(componentName);
  const { minW, minH } = getMinSize(componentName);
  const defaultW = toGridSize(config?.defaultW, DEFAULT_CARD_SIZE.w);
  const defaultH = toGridSize(config?.defaultH, DEFAULT_CARD_SIZE.h);

  return {
    w: Math.min(DASHBOARD_COLUMNS, Math.max(defaultW, minW)),
    h: Math.max(defaultH, minH),
  };
};

const clampXForWidth = (x, w) => Math.max(0, Math.min(x, DASHBOARD_COLUMNS - w));

const toGridLayout = (items) =>
  items.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));

const Content = ({ layoutData, onAddItem, onRemoveItem, onCommitGridLayout, layoutLocked, canManageAnnouncements = false }) => {
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [placeholderPos, setPlaceholderPos] = useState({ x: 0, y: 0 });
  const [placeholderSize, setPlaceholderSize] = useState({ w: 4, h: 10 });
  const [currentDragItem, setCurrentDragItem] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const gridRef = useRef(null);
  const items = (Array.isArray(layoutData) ? layoutData : []).filter((item) => {
    const config = getCardConfig(item.name);
    return config && (!config.adminOnly || canManageAnnouncements);
  });
  const gridLayout = toGridLayout(items);

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
    const { w, h } = getInitialSize(item.name);

    setPlaceholderSize({ w, h });
    setPlaceholderPos({ ...pos, x: clampXForWidth(pos.x, w) });
    setShowPlaceholder(true);
  };

  // Function to add a new element
  const addNewElement = (item, dropPosition) => {
    if (layoutLocked) {
      toast.error('Cannot add elements - layout is locked', {
        duration: 2000,
      });
      return;
    }

    if (items.some((ele) => ele.name === item.name)) {
      toast(`"${item.name}" is already added!`, {
        duration: 2000,
        icon: "❗",
      });
      return;
    }

    const { w, h } = getInitialSize(item.name);

    // Use drop position from placeholder
    const newItem = {
      name: item.name,
      i: uuidv4(),
      x: clampXForWidth(dropPosition.x, w),
      y: dropPosition.y,
      w,
      h,
    };

    onAddItem(newItem);

    // Show a success toast
    toast.success(`Added ${item.name} to dashboard`, {
      duration: 2000,
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

  // Function to remove an element
  const removeElement = (item) => {
    const deletedName = item.name;
    onRemoveItem(item.i);
    toast(`Removed ${deletedName}`, {
      duration: 2000,
      icon: "❌",
    });
  };

  const commitUserLayoutChange = (committedLayout) => {
    onCommitGridLayout(committedLayout);
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
    ? [...gridLayout, {
        i: 'placeholder',
        x: placeholderPos.x,
        y: placeholderPos.y,
        w: placeholderSize.w,
        h: placeholderSize.h,
        isPlaceholder: true
      }]
    : gridLayout;

  return (
    <div
      ref={(node) => {
        drop(node);
        gridRef.current = node;
      }}
      className={`dashboard-grid-dropzone max-w-full h-auto relative ${isOver ? "theme-selected" : ""}`}
    >
      <ReactGridLayout
        layout={combinedLayout}
        cols={DASHBOARD_COLUMNS}
        rowHeight={20}
        isBounded={false}
        isDroppable={false}
        isResizable={!layoutLocked}
        isDraggable={!layoutLocked}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        autoSize={true}
	className="dashboard-react-grid"
        draggableCancel=".non-draggable"
        onDragStop={commitUserLayoutChange}
        onResizeStop={commitUserLayoutChange}
      >
        {/* Render actual grid items */}
        {items.map((ele, index) => {
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
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeElement(ele);
                  }}
                  className="non-draggable absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-[5px] border border-mosaic-border bg-mosaic-surface text-mosaic-secondary opacity-90 transition-all duration-100 hover:border-mosaic-danger-bg hover:bg-mosaic-danger-bg hover:text-white"
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
