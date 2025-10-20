import React, { useState } from "react";
import {
  Container,
  StarContainer,
  Star,
  TextArea,
  Button,
  Error,
  ThankYouMessage,
  CloseButton,
  RatingLabel,
  SpinnerContainer,
} from "./styles";
import ChatbotService from "../../services/chatbotService";

interface FeedbackProps {
  exchangeId: string;
  onFeedbackSubmit?: () => void;
  onClose: () => void;
}

const FeedbackComponent: React.FC<FeedbackProps> = ({
  exchangeId,
  onFeedbackSubmit,
  onClose,
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const getRatingLabel = (rating: number | null) => {
    if (!rating) return "Rate your experience";
    const labels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
    return labels[rating - 1];
  };

  const handleMouseOver = (index: number) => {
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  const handleClick = (index: number) => {
    setRating(index);
    setError(null);
  };

  const renderStars = () => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1;
      const filled = hoverRating
        ? starValue <= hoverRating
        : starValue <= (rating ?? 0);

      return (
        <Star
          key={index}
          filled={filled}
          onMouseOver={() => handleMouseOver(starValue)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(starValue)}
          role="button"
          aria-label={`Rate ${starValue} stars`}
        >
          {filled ? "★" : "☆"}
        </Star>
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError("Please select a rating before submitting");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await ChatbotService.sendFeedback(rating, exchangeId, comment);
      setIsSubmitted(true);
      if (onFeedbackSubmit) {
        onFeedbackSubmit();
      }
    } catch (err) {
      console.error("FeedbackComponent error:", err);
      setError("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Container>
        <ThankYouMessage>
          Thank you for your valuable feedback! 🎉
        </ThankYouMessage>
        <CloseButton onClick={onClose} aria-label="Close feedback">
          ×
        </CloseButton>
      </Container>
    );
  }

  return (
    <Container>
      <CloseButton onClick={onClose} aria-label="Close feedback">
        ×
      </CloseButton>
      <form onSubmit={handleSubmit}>
        <RatingLabel>{getRatingLabel(hoverRating || rating)}</RatingLabel>
        <StarContainer>{renderStars()}</StarContainer>
        <TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us more about your experience (optional)"
          aria-label="Feedback comments"
          maxLength={500}
        />
        {error && <Error role="alert">{error}</Error>}
        <Button
          type="submit"
          disabled={isSubmitting}
          isSubmitting={isSubmitting}
        >
          {isSubmitting ? (
            <>
              Submitting
              <SpinnerContainer />
            </>
          ) : (
            "Submit Feedback"
          )}
        </Button>
      </form>
    </Container>
  );
};

export default FeedbackComponent;
