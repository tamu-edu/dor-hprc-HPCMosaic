// ChatbotVisibilityContext.js - Create this new file in your components folder
import React, { createContext, useContext, useState } from 'react';

// Create a context to manage chatbot visibility
const ChatbotVisibilityContext = createContext();

// Create a provider component
export const ChatbotVisibilityProvider = ({ children }) => {
  const [isChatbotVisible, setIsChatbotVisible] = useState(true);
  
  // Function to hide chatbot
  const hideChatbot = () => setIsChatbotVisible(false);
  
  // Function to show chatbot
  const showChatbot = () => setIsChatbotVisible(true);
  
  // Toggle chatbot visibility
  const toggleChatbot = () => setIsChatbotVisible(prev => !prev);

  return (
    <ChatbotVisibilityContext.Provider 
      value={{ 
        isChatbotVisible, 
        hideChatbot, 
        showChatbot, 
        toggleChatbot 
      }}
    >
      {children}
    </ChatbotVisibilityContext.Provider>
  );
};

// Custom hook to use the chatbot visibility context
export const useChatbotVisibility = () => {
  const context = useContext(ChatbotVisibilityContext);
  if (context === undefined) {
    throw new Error('useChatbotVisibility must be used within a ChatbotVisibilityProvider');
  }
  return context;
};