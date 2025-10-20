import React, { useState, useEffect, useCallback } from "react";
// import ReactDOM from "react-dom/client";
import { v4 as uuidv4 } from "uuid";

import BotMessage from "./components/BotMessage";
import Header from "./components/Header";
import Input from "./components/Input";
import Messages from "./components/Messages";
import UserMessage from "./components/UserMessage";

import ChatbotService from "./services/chatbotService";

import "./App.css";

function Chatbot() {
  const [messages, setMessages] = useState<React.ReactElement[]>([]);

  useEffect(() => {
    async function loadWelcomeMessage() {
      try {
        setMessages([
          <BotMessage
            key={uuidv4()}
            fetchMessage={async () => await ChatbotService.getChatbotResponse("hello") }
          />,
        ]);
      } catch (error) {
        console.error("Error loading welcome message:", error);
        // Handle error (e.g., display error message to user)
      }
    }
    loadWelcomeMessage();
  }, []);

  const send = useCallback(
    async (text: string) => {
      try {
        const newMessages = messages.concat(
          <UserMessage key={uuidv4()} text={text} />,
          <BotMessage
            key={uuidv4()}
            fetchMessage={async () => {
              const response = await ChatbotService.getChatbotResponse(text);
              return response;
            }}
          />
        );
        setMessages(newMessages);

        setTimeout(() => {
          const messagesContainer = document.querySelector('.messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.error("Error sending message:", error);
        // Handle error (e.g., display error message to user)
      }
    },
    [messages]
  );

  return (
    <div className="chatbot" role="region" aria-label="Chatbot interface">
      <Header />
      <div className="messages-container">
        <Messages messages={messages} />
      </div>
      <Input onSend={send} />
    </div>
  );
}

// const root = ReactDOM.createRoot(
//   document.getElementById("root") as HTMLElement
// );

// root.render(<Chatbot />);

export default Chatbot;
