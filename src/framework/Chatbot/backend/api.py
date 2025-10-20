import sys
import os
from typing import Dict, Any, Tuple
from flask import Flask, request, jsonify, Response, render_template, redirect, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import BadRequest
import logging
from dotenv import load_dotenv
from http import HTTPStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Add parent directory to sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.normpath(os.path.join(script_dir, ".."))
sys.path.append(parent_dir)

try:
    from backend.pryon_conversation import Conversation
except ImportError as e:
    logger.error(f"Failed to import Conversation: {e}")
    sys.exit(1)

class APIError(Exception):
    """Custom exception for API-related errors"""
    def __init__(self, message: str, status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR):
        super().__init__(message)
        self.status_code = status_code

class Config:
    """Application configuration"""
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    PORT = int(os.environ.get('FLASK_PORT', 5000))
    VALID_RATINGS = {1, 2, 3, 4, 5}  # Set of valid rating values

# app = Flask(__name__)
app = Flask(__name__, static_folder="static/build")

CORS(app)

def validate_chat_request(data: Dict[str, Any]) -> str:
    """
    Validate chat request data and return the message.
    Raises BadRequest if validation fails.
    """
    if not data:
        raise BadRequest("No JSON data provided")
    
    message = data.get('message')
    if not message:
        raise BadRequest("No message provided")
    if not isinstance(message, str):
        raise BadRequest("Message must be a string")
    
    return message

def validate_feedback_request(data: Dict[str, Any]) -> Tuple[int, str, str]:
    """
    Validate feedback request data and return rating, exchange_id, and comments.
    Raises BadRequest if validation fails.
    """
    if not data:
        raise BadRequest("No JSON data provided")

    rating = data.get('rating')
    exchange_id = data.get('exchange_id')
    comments = data.get('comments', '')

    if not isinstance(rating, int):
        raise BadRequest("Rating must be an integer")
    if rating not in Config.VALID_RATINGS:
        raise BadRequest(f"Rating must be between {min(Config.VALID_RATINGS)} and {max(Config.VALID_RATINGS)}")
    if not exchange_id:
        raise BadRequest("Exchange ID is required")
    if not isinstance(exchange_id, str):
        raise BadRequest("Exchange ID must be a string")
    if not isinstance(comments, str):
        raise BadRequest("Comments must be a string")

    return rating, exchange_id, comments

def create_error_response(message: str, status_code: int) -> Response:
    """Create a JSON error response"""
    return jsonify({'error': message}), status_code

def create_success_response(data: Dict[str, Any], status_code: int = HTTPStatus.OK) -> Response:
    """Create a JSON success response"""
    return jsonify(data), status_code

@app.errorhandler(BadRequest)
def handle_bad_request(e: BadRequest) -> Response:
    """Handle BadRequest exceptions"""
    logger.warning(f"Bad request: {str(e)}")
    return create_error_response(str(e), HTTPStatus.BAD_REQUEST)

@app.errorhandler(APIError)
def handle_api_error(e: APIError) -> Response:
    """Handle API-related exceptions"""
    logger.error(f"API error: {str(e)}")
    return create_error_response(str(e), e.status_code)

@app.errorhandler(Exception)
def handle_exception(e: Exception) -> Response:
    """Handle unexpected exceptions"""
    logger.exception("An unexpected error occurred")
    return create_error_response(
        "An unexpected error occurred", 
        HTTPStatus.INTERNAL_SERVER_ERROR
    )

# @app.route("/")
# def index():
#     return render_template("index.html")

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

# Add route to serve other static assets
@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)


@app.route('/api/chat', methods=['POST'])
def handle_chat_request() -> Response:
    """Handle incoming chat requests"""
    try:
        message = validate_chat_request(request.json)
        
        my_conversation = Conversation()
        response_message, exchange_id = my_conversation.send_query(message)
        
        return create_success_response({
            'exchange_id': exchange_id,
            'response_message': response_message,
        })

    except BadRequest:
        raise
    except Exception as e:
        logger.exception("Error processing chat request")
        raise APIError("Failed to process chat request")

@app.route('/api/feedback', methods=['POST'])
def handle_feedback_request() -> Response:
    """Handle feedback submissions"""
    try:
        rating, exchange_id, comments = validate_feedback_request(request.json)
        
        my_conversation = Conversation()
        response = my_conversation.send_feedback(rating, exchange_id, comments)
        
        if response.status_code != HTTPStatus.OK:
            raise APIError(
                "Failed to submit feedback",
                status_code=response.status_code
            )

        return create_success_response(
            {'message': 'Feedback submitted successfully'},
            HTTPStatus.CREATED
        )

    except BadRequest:
        raise
    except Exception as e:
        logger.exception("Error processing feedback request")
        raise APIError("Failed to process feedback request")

@app.before_request
def log_request_info() -> None:
    """Log information about incoming requests"""
    logger.info(f"Request: {request.method} {request.url}")
    logger.debug(f"Headers: {dict(request.headers)}")
    logger.debug(f"Body: {request.get_data()}")

@app.after_request
def log_response_info(response: Response) -> Response:
    """Log information about outgoing responses"""
    logger.info(f"Response status: {response.status}")
    logger.debug(f"Response headers: {dict(response.headers)}")
    return response

if __name__ == "__main__":
    logger.info(f"Starting Flask app on {Config.HOST}:{Config.PORT}")
    app.run(
        debug=Config.DEBUG,
        host=Config.HOST,
        port=Config.PORT
    )