import React, { useState, useEffect } from "react";
import { AiOutlineRobot } from "react-icons/ai";
import { IoCloseSharp } from "react-icons/io5";
import Chatbot from "./Chatbot/frontend/hprc-chatbot-gui/src/App";

const ChatbotComponent = () => {
  const [visible, setVisible] = useState(false);
  const [showCloud, setShowCloud] = useState(true);

  useEffect(() => {
    setShowCloud(true);
  }, []);

  const toggleChat = () => setVisible(!visible);
  const closeCloud = () => setShowCloud(false);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Speech Bubble */}
      {showCloud && (
        <div className="absolute bottom-20 right-1 w-80">
          {/* Main bubble */}
	          <div className="relative theme-surface rounded-lg shadow-md p-4 border theme-border">
	             {/* Tail */}
	            <div className="absolute -bottom-2 right-8 w-4 h-4 theme-surface border-r border-b theme-border transform rotate-45" />

	            <div className="flex justify-between items-center mb-2">
	              <span className="font-semibold theme-text-primary">
	                Howdy! Have any questions? We're here to help!
	              </span>
	              <button onClick={closeCloud} className="theme-text-secondary theme-hover-danger">
                <IoCloseSharp size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot popup (always mounted, hidden when not visible) */}
      <div
	        className={`fixed bottom-24 right-4 theme-surface border theme-border rounded-xl shadow-2xl overflow-hidden transition-all transform ${
          visible ? "block" : "hidden"
        }`}
      >
	        <div className="flex justify-between items-center px-4 py-3 theme-button-primary rounded-t-xl">
          <span className="font-bold text-lg">HPRC Chatbot</span>
	          <button onClick={toggleChat}>
            <IoCloseSharp size={22} />
          </button>
        </div>

        {/*Base layout */}
        <div className="p-0 h-[400px] w-[500px] max-w-full max-h-full flex flex-col">
          {/* Custom overrides */}
          <style>
            {`
              .chatbot {
                width: 100% !important;
                height: 100% !important;
                display: flex;
                flex-direction: column;
              }

              .messages-container {
                flex-grow: 1;
                overflow-y: auto;
                padding: 10px;
              }

              .header {
                display: none; /* Hide chatbot's default header */
              }

              .bot-message,
              .user-message {
                max-width: 90%;
                word-wrap: break-word;
              }
            `}
          </style>
          <Chatbot />
        </div>
      </div>

      {/* Chatbot toggle button */}
      <button
        onClick={toggleChat}
	        className="theme-button-primary w-16 h-16 rounded-full flex justify-center items-center shadow-lg transition"
      >
	        <AiOutlineRobot size={30} />
      </button>
    </div>
  );
};

export default ChatbotComponent;
