import React from "react";
import styled from 'styled-components';

const MessageContainer = styled.div`
  margin: 16px 0;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding-right: 16px;
`;

const UserMessageWrapper = styled.div`
  background: #800000; // Maroon color from the image
  color: white;
  border-radius: 12px;
  padding: 16px;
  max-width: 800px;
  width: fit-content;
  text-align: left;
  margin-right: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-size: 16px;
  line-height: 1.6;
`;

interface UserMessageProps {
  text: string;
}

export default function UserMessage({ text }: UserMessageProps) {
  return (
    <MessageContainer>
      <UserMessageWrapper>{text}</UserMessageWrapper>
    </MessageContainer>
  );
}