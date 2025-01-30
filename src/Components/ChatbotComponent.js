import React, { useState, useEffect } from "react";
import { AiOutlineRobot } from "react-icons/ai";
import { IoCloseSharp } from "react-icons/io5";

const ChatbotComponent = () => {
  const [visible, setVisible] = useState(false);
  const [showCloud, setShowCloud] = useState(true);

  useEffect(() => {
    setShowCloud(true);
  }, []);

  const toggleChat = () => setVisible(!visible);
  const closeCloud = () => setShowCloud(false);

  return (
    <div className="fixed bottom-4 right-5 z-50">
      {/* Speech Bubble */}
      {showCloud && (
        <div className="absolute bottom-20 right-1 w-80">
          {/* Main bubble */}
          <div className="relative bg-white rounded-lg shadow-md p-4 border border-gray-200">
            {/* Tail */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45" />

            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-800">
                Howdy! Have any questions? We're here to help!
              </span>
              <button onClick={closeCloud} className="text-gray-600 hover:text-gray-900">
                <IoCloseSharp size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot popup (always mounted, hidden when not visible) */}
      <div
        className={`fixed bottom-24 right-4 w-[700px] h-[600px] bg-[#F0F0F0] border border-gray-300 rounded-xl shadow-2xl overflow-hidden ${
          visible ? "block" : "hidden"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-[#500000] text-white rounded-t-xl">
          <span className="font-bold text-lg">HPRC Chatbot</span>
          <button onClick={toggleChat} className="hover:text-gray-300">
            <IoCloseSharp size={22} />
          </button>
        </div>

        {/* Chatbot iframe (always kept mounted) */}
        <iframe
          src="https://portal-grace.hprc.tamu.edu/pun/sys/dor-hprc-chat"
          title="Chatbot"
          className="w-full h-[90%] border-t"
        />
      </div>

      {/* Chatbot toggle button */}
      <button
        onClick={toggleChat}
        className="bg-[#500000] text-white w-16 h-16 rounded-full flex justify-center items-center shadow-lg hover:bg-[#4B0000] transition"
      >
        <AiOutlineRobot size={30} className="text-white" />
      </button>
    </div>
  );
};

export default ChatbotComponent;
