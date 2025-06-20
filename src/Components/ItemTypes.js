// ItemTypes.js - Define drag and drop item types with enhanced configuration

export const ItemTypes = {
    CARD: 'card',
    WIDGET: 'widget'
  };
  
  // Configure drag preview options
  export const dragPreviewOptions = {
    // Disable overlap detection for smoother dragging
    enableOverlapCheck: false,
    // Enable custom drag layer rendering
    enableCustomDragLayer: true,
    // Controls the opacity of the dragged item
    dragItemOpacity: 0.6
  };