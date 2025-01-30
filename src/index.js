import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import './style.css';
import { METRIC_TYPES } from './utils/metricTypes';
import SandboxGrid from "./SandboxGrid";
import { createRoot } from "react-dom/client";
import ChatbotComponent from "./Components/ChatbotComponent";

const App = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const layoutRef = useRef();

  const handleLayoutChange = (layout) => {
    console.log("Layout changed:", layout);
  };

  const openPopup = () => {
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-gray-50 p-10 min-h-screen">
        <SandboxGrid/>
        <ChatbotComponent />
      </div>
    </DndProvider>
  );
};


const root = createRoot(document.getElementById("root"));
root.render(<App />);
