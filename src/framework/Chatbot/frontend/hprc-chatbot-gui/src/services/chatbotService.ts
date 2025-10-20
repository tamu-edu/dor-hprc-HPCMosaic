import axios, { AxiosError } from 'axios';

// Define proper interface for API response
interface ChatbotResponse {
  response_message: string;
  exchange_id: string;
}

// Define error types
interface ApiError {
  error: string;
}

class ChatbotError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ChatbotError';
  }
}

// const API_BASE_URL = 'http://127.0.0.1:5000';
const API_BASE_URL = "/pun/sys/dor-hprc-chat";

const ChatbotService = {
  /**
   * Gets a response from the chatbot for a given message
   * @param message - The user's message
   * @returns Promise with response message and exchange ID
   * @throws ChatbotError if the request fails
   */
  getChatbotResponse: async (
    message: string
  ): Promise<{ responseMessage: string; responseExchangeID: string }> => {
    try {
      // Handle greeting with case-insensitive comparison
      if (message.toLowerCase() === 'hello') {
        return {
          responseMessage: 'Hello! How can I help you today?',
          responseExchangeID: '',
        };
      }

      // Make API request
      const response = await axios.post<ChatbotResponse>(
        `${API_BASE_URL}/api/chat`,
        { message },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        }
      );

      return {
        responseMessage: response.data.response_message,
        responseExchangeID: response.data.exchange_id,
      };
    } catch (error) {
      console.error('ChatbotService error:', error);
      // Handle specific error types
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        
        if (axiosError.response) {
          // Server responded with error
          console.error('ChatbotService error:', axiosError.response.data);
          const errorMessage = axiosError.response.data.error || 
            'Server returned an error response';
          throw new ChatbotError(errorMessage, {
            status: axiosError.response.status,
            data: axiosError.response.data,
          });
        } else if (axiosError.request) {
          // Request made but no response received
          throw new ChatbotError('No response received from server. Please check your connection.');
        } else {
          // Error in request configuration
          throw new ChatbotError('Failed to send request', axiosError.message);
        }
      }

      // Handle unexpected errors
      console.error('Unexpected error in ChatbotService:', error);
      throw new ChatbotError('An unexpected error occurred');
    }
  },

  /**
   * Sends feedback for a chat exchange
   * @param rating - Numeric rating (1-5)
   * @param exchangeId - The exchange ID to rate
   * @param comments - Optional feedback comments
   */
  sendFeedback: async (
    rating: number,
    exchangeId: string,
    comments: string = ''
  ): Promise<void> => {
    try {
      // Validate rating
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new ChatbotError('Rating must be an integer between 1 and 5');
      }

      // Validate exchange ID
      if (!exchangeId) {
        throw new ChatbotError('Exchange ID is required');
      }

      await axios.post(
        `${API_BASE_URL}/api/feedback`,
        {
          rating,
          exchange_id: exchangeId,
          comments,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000, // 5 second timeout
        }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiError>;
        throw new ChatbotError(
          'Failed to submit feedback',
          axiosError.response?.data || axiosError.message
        );
      }
      throw new ChatbotError('Failed to submit feedback');
    }
  },
};

export default ChatbotService;