import styled, { keyframes, css } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const MessageContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  margin: 1vh 0;
  padding-left: 1vw;
  width: 75%;
`;

export const BotMessageWrapper = styled.div<{ $fadeIn: boolean }>`
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: inline-block;
  max-width: 800px;
  width: fit-content;
  text-align: left;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.3s ease-out, visibility 0s linear 0.3s;

  ${({ $fadeIn }) =>
    $fadeIn &&
    css`
      opacity: 1;
      visibility: visible;
      transition: opacity 0.3s ease-out;
    `}

  .message-content {
    font-size: 16px;
    line-height: 1.6;
    color: #2c3e50;
    white-space: pre-wrap;
  }
`;

export const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 16px;
  padding: 12px;
`;

export const FeedbackTrigger = styled.button`
  background: transparent;
  border: none;
  color: #4a90e2;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 0;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s ease;

  &:hover {
    color: #357abd;
  }
`;

export const FeedbackWrapper = styled.div`
  position: relative;
  margin-top: 8px;
  margin-left: 8px;
  max-width: 500px;

  // Remove any existing background/shadow from the feedback form
  .feedback-form {
    background: transparent;
    box-shadow: none;
    padding: 0;
  }
  
  // Style the rating stars
  .star-container {
    margin: 8px 0;
  }

  // Style the text area
  textarea {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 8px;
    width: 100%;
    margin: 8px 0;
  }

  // Style the submit button
  button {
    background: #500000;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    
    &:hover {
      background: #357abd;
    }
  }
`;

export const ErrorMessage = styled.div`
  background: #fee2e2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  animation: ${fadeIn} 0.3s ease-out;

  span {
    font-size: 18px;
  }
`;

export const MessageLink = styled.a`
  color: #4a90e2;
  text-decoration: none;
  transition: color 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-all;

  &:hover {
    color: #357abd;
    text-decoration: underline;
  }
`;
