import React, { useState, useEffect } from "react";
import {
  MessageContainer,
  BotMessageWrapper,  // This is our styled component
  LoadingIndicator,
  FeedbackTrigger,
  FeedbackWrapper,
  ErrorMessage,
  MessageLink,
} from "./styles";
import MarkdownRenderer from "../MarkdownRenderer";
import FeedbackComponent from "../FeedbackComponent";
import { containsMarkdownCodeBlocks } from "../../utils/markdownUtils";
import { Dots } from '../LoadingDots';

interface BotMessageProps {
  fetchMessage: () => Promise<{
    responseMessage: string;
    responseExchangeID: string;
  }>;
}

const BotMessage: React.FC<BotMessageProps> = ({ fetchMessage }) => {
  const [isLoading, setLoading] = useState(true);
  const [hasCodeBlocks, setHasCodeBlocks] = useState(false);
  const [message, setMessage] = useState("");
  const [exchangeId, setExchangeId] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    async function loadMessage() {
      try {
        setLoading(true);
        const response = await fetchMessage();
        setMessage(response.responseMessage);
        setExchangeId(response.responseExchangeID);
        setHasCodeBlocks(containsMarkdownCodeBlocks(response.responseMessage));

        // Add a small delay before showing the message for smooth transition
        setTimeout(() => {
          setFadeIn(true);
        }, 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load message");
      } finally {
        setLoading(false);
      }
    }
    loadMessage();

    return () => {
      setFadeIn(false);
    };
  }, [fetchMessage]);

  const formatMessageWithLinks = (message: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return message.split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <MessageLink
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part}
          </MessageLink>
        );
      }
      return part;
    });
  };

  if (error) {
    return (
      <ErrorMessage role="alert">
        <span>🚫</span> {error}
      </ErrorMessage>
    );
  }

  return (
    <MessageContainer>
      {isLoading ? (
        <LoadingIndicator>
          Generating the best answer for you <Dots />
        </LoadingIndicator>
      ) : (
        <>
          {/* Pass the transient prop $fadeIn instead of fadeIn */}
          <BotMessageWrapper $fadeIn={fadeIn}>
            <div className="message-content">
              {hasCodeBlocks ? (
                <MarkdownRenderer content={message} />
              ) : (
                formatMessageWithLinks(message)
              )}
            </div>

            {exchangeId && !showFeedback && (
              <FeedbackTrigger
                onClick={() => setShowFeedback(true)}
                aria-label="Give feedback"
              >
                <span role="img" aria-hidden="true">
                  ⭐
                </span>{" "}
                Rate this response
              </FeedbackTrigger>
            )}
          </BotMessageWrapper>

          {showFeedback && exchangeId && (
            <FeedbackWrapper>
              <FeedbackComponent
                exchangeId={exchangeId}
                onFeedbackSubmit={() => setShowFeedback(false)}
                onClose={() => setShowFeedback(false)}
              />
            </FeedbackWrapper>
          )}
        </>
      )}
    </MessageContainer>
  );
};

export default BotMessage;
