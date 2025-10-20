import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const LoadingSpinner = keyframes`
  to { transform: rotate(360deg); }
`;

export const Container = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 20px auto;
  animation: ${fadeIn} 0.3s ease-out;
`;

export const StarContainer = styled.div`
  font-size: 32px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
`;

export const Star = styled.span<{ filled: boolean }>`
  color: ${props => props.filled ? '#FFD700' : '#e0e0e0'};
  transition: all 0.2s ease-in-out;
  transform-origin: center;
  
  &:hover {
    color: #FFD700;
    transform: scale(1.2);
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  margin: 10px 0;
  font-family: inherit;
  font-size: 16px;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }
`;

export const Button = styled.button<{ isSubmitting?: boolean }>`
  background: ${props => props.isSubmitting ? '#a0a0a0' : '#4a90e2'};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: ${props => props.isSubmitting ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: #357abd;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

export const Error = styled.div`
  color: #e74c3c;
  font-size: 14px;
  margin: 8px 0;
  padding: 8px 12px;
  background: #fde8e8;
  border-radius: 4px;
  animation: ${fadeIn} 0.2s ease-out;
`;

export const ThankYouMessage = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 20px;
  color: #2ecc71;
  font-weight: 600;
  animation: ${fadeIn} 0.3s ease-out;
`;

export const RatingLabel = styled.div`
  text-align: center;
  margin-bottom: 8px;
  font-size: 18px;
  color: #666;
`;

export const SpinnerContainer = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: ${LoadingSpinner} 0.8s linear infinite;
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 30px;
  right: 8px;
  background: transparent;
  border: none;
  color: #666;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s ease;

  &:hover {
    color: #333;
  }
`;
