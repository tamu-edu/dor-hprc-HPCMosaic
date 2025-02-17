import React from "react";
import { useState, ChangeEvent, FormEvent } from "react";

interface InputProps {
  onSend: (text: string) => void;
}

export default function Input({ onSend }: InputProps) {
  const [text, setText] = useState("");

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleSend = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSend(text);
    setText("");
  };

  return (
    <div className="input">
      <form onSubmit={handleSend}>
        <input
          id="input"
          type="text"
          onChange={handleInputChange}
          value={text}
          placeholder="Enter your message here"
        />
        <button>
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 500 500"
          >
            <g>
              <g>
                <polygon points="0,497.25 535.5,267.75 0,38.25 0,216.75 382.5,267.75 0,318.75" />
              </g>
            </g>
          </svg>
        </button>
      </form>
    </div>
  );
}
