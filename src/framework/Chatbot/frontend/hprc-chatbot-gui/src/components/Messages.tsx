import React from "react";
import { useEffect, useRef } from "react";

interface MessagesProps {
  messages: React.ReactNode;
}

export default function Messages({ messages }: MessagesProps) {
  const el = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    if (el.current) {
      el.current.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="messages">
      {messages}
      <div id={"el"} ref={el} />
    </div>
  );
}
