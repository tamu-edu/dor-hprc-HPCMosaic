import React, { useEffect } from "react";
import { useDrag } from "react-dnd";

// Draggable element inside the popup with preview logic
const DraggableComponent = ({ type, name }) => {

  console.log("In draggable component, element type: ", type);
  console.log("In draggable component, element name: ", name);
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: "YOUR_DRAGGABLE_ITEM_TYPE", // Make sure this matches the `accept` type in `useDrop`
    item: { type }, // Pass the type of the item to the drop handler
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  // Transparent image for drag preview (1x1 pixel)
  const transparentImage = new Image();
  transparentImage.src =
    "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

  useEffect(() => {
    // Set the transparent image as the drag preview to hide the text
    preview(transparentImage, { offsetX: 0, offsetY: 0 });
  }, [preview, transparentImage]);

  return (
    <div
      ref={drag}
      className={`bg-gray-200 p-4 rounded-md cursor-pointer ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{ marginBottom: "10px" }}
    >
      {name}
    </div>
  );
};

export default DraggableComponent;
