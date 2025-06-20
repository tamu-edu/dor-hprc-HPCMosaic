import React, { useRef } from "react";
import { useDrag, DragPreviewImage } from "react-dnd";
import { ItemTypes } from "./ItemTypes";

// Create a custom card preview component for dragging
const createCardPreview = (title, icon) => {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 120;
  const ctx = canvas.getContext("2d");
  
  // Draw card background
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 2;
  ctx.roundRect(0, 0, 240, 120, 8);
  ctx.fill();
  ctx.stroke();
  
  // Draw title
  ctx.fillStyle = "#1F2937";
  ctx.font = "bold 16px Inter, system-ui, sans-serif";
  ctx.fillText(title || "Component", 20, 30);
  
  // Draw a placeholder icon/shape
  ctx.fillStyle = "#3B82F6";
  ctx.beginPath();
  ctx.roundRect(20, 50, 200, 40, 4);
  ctx.fill();
  
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "14px Inter, system-ui, sans-serif";
  ctx.fillText("Drop to add to dashboard", 50, 74);
  
  return canvas.toDataURL();
};

const Card = ({ name, title, description, icon }) => {
  const ref = useRef(null);
  const previewSrc = createCardPreview(title, icon);
  
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.CARD,
    item: { name, title, description },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item, monitor) => {
      // You can add logic here that runs when a drag operation ends
      const didDrop = monitor.didDrop();
      if (!didDrop) {
        // The item was not dropped on a valid drop target
        console.log('Card was not dropped on grid');
      }
    }
  });

  // Apply the drag ref to the card
  drag(ref);

  return (
    <>
      {/* Custom DragPreview for better visual feedback */}
      <DragPreviewImage connect={preview} src={previewSrc} />
      
      <div
        ref={ref}
        className={`relative flex flex-col transition-all
          border rounded-lg shadow-sm overflow-hidden 
          ${isDragging ? "opacity-50 border-blue-300 scale-95" : "border-gray-200 hover:border-blue-300 hover:shadow-md"}
          cursor-grab active:cursor-grabbing bg-white`}
        style={{ 
          width: "100%", 
          touchAction: "none",
          transition: 'all 0.2s ease-in-out' 
        }}
      >
        {/* Card header */}
        <div className="p-4 flex items-center space-x-3 border-b border-gray-100">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <div className="text-xs text-gray-500">Click and drag to dashboard</div>
          </div>
        </div>
        
        {/* Card description */}
        <div className="p-4 text-sm text-gray-600 flex-grow">
          <p className="line-clamp-3">{description}</p>
        </div>
        
        {/* Add badge/tag to show category */}
        <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
          {name.includes("User") ? "User" : 
           name.includes("Node") || name.includes("PyVenv") || name.includes("Quota") ? "System" : 
           "Analytics"}
        </div>
      </div>
    </>
  );
};

export default Card;