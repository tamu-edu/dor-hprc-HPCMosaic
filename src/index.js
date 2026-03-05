import React, { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Joyride from "react-joyride";
import "./style.css";
import SandboxGrid from "./SandboxGrid";
import { createRoot } from "react-dom/client";
import ChatbotComponent from "./framework/ChatbotComponent";
import { Toaster } from "react-hot-toast";
import { useChatbotVisibility, ChatbotVisibilityProvider } from "./framework/ChatbotVisibilityContext"; // Import the context provider
import { ThemeProvider } from "./context/ThemeContext";

const App = () => {
  const [runTour, setRunTour] = useState(false);
  const steps = [
    {
      target: ".add-element-btn",
      content: "Click here to add a new element to your dashboard.",
      disableBeacon: true,
    },
    {
      target: ".request-help-btn",
      content: "Click here to submit a ticket if you require any further assistance.",
    },
    {
      target: ".dashboard-grid",
      content: "This is your main dashboard where you can arrange and resize elements. You start off with a default view, but you can add and remove elements as needed.",
    },
    {
      target: ".resizable-element",
      content: "Try dragging the bottom-right corner to resize this element.",
      disableOverlay: true,
      spotlightClicks: true,
    },
    {
      target: ".feedback-btn",
      content: "We'd love your feedback! Click here to submit your thoughts.",
      placement: "left",
      disableOverlay: true,
      spotlightClicks: true,
    },
  ];
  
  return (
    <ThemeProvider>
      <ChatbotVisibilityProvider> {/* Wrap the app with the provider */}
        <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <DndProvider backend={HTML5Backend}>
          <Joyride
            steps={steps}
            run={runTour}
            continuous
            showProgress
            showSkipButton
            callback={(data) => {
              if (data.status === "finished" || data.status === "skipped") {
                setRunTour(false);
              }
            }}
            styles={{
              options: {
                primaryColor: "#5c0025",
                zIndex: 1000
              },
              buttonNext: {
                backgroundColor: "#5c0025",
                color: "#ffffff", // text color
                borderRadius: "6px",
                padding: "10px 20px", // Button padding
              },
              buttonBack: {
                color: "#555",
              },
              buttonClose: {
                color: "#000",
              }
            }}
          />
          <div className="p-10 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
	    <SandboxGrid setRunTour={setRunTour} />
            <Toaster position="bottom-right" reverseorder={false} toastOptions={{ duration: 30000 }} />
            <EnhancedChatbotComponent />
          </div>
        </DndProvider>
        </div>
      </ChatbotVisibilityProvider>
    </ThemeProvider>
  );
};

// Enhanced chatbot component that respects visibility context
const EnhancedChatbotComponent = () => {
  const { isChatbotVisible } = useChatbotVisibility();
  
  if (!isChatbotVisible) {
    return null; // Don't render if not visible
  }
  
  //Removed chatbot for now, doesn't work
  return null;
  return <ChatbotComponent />;
};

const root = createRoot(document.getElementById("root"));
root.render(<App />);
