from dotenv import load_dotenv
import os
import requests
import json
load_dotenv()

USERNAME = os.environ["username"]
PASSWORD = os.environ["password"]
COLLECTION_ID = os.environ["collection_id"]

LOGIN_URL = "https://login.pryon.net/oauth/token"
BASE_URL = "https://api.pryon.net/"
GENERATE_URL = BASE_URL + "api/conversation/v1/exchange-events/sse"
FEEDBACK_URL = BASE_URL + "api/conversation/v1/generative-ratings"

class Conversation:
    def __init__(self, messages: list = None, conversation_id: str = None):
        self.messages = messages
        self.conversation_id = conversation_id
        self.access_token = None
        self._login()

    def _post_request(self,endpoint, data, stream= False):
        headers = {
            'Content-Type': 'application/json',
        }
        if(self.access_token):
            headers["Authorization"] = f'Bearer {self.access_token}'
        try:
            response = requests.post(endpoint, headers=headers, json=data, stream=stream)
            return response
        except Exception as e:
            print(f"An exception occured when making a post request to {endpoint}:")
            print(e)

    def _login(self):
        data = {
            "client_id": USERNAME,
            "client_secret": PASSWORD,
            "audience": "https://pryon/api",
            "grant_type": "client_credentials"
        }
        credentials = self._post_request(LOGIN_URL, data).json()
        self.access_token = credentials["access_token"]
    def send_feedback(self, rating, exchange_id, comments):
        #exchange id is the one you get from send_query
        data = {
            "data":
            {
                "generative_exchange_id" : exchange_id,
                "rank": rating,
                "message":comments
            }
        }
        response = self._post_request(FEEDBACK_URL, data)
        return response
    def verify_source(self, source):
        if("pryon" in source):
            return False
        return True
    """
    send_query returns a tuple: (reponse, exchange_id)
    """
    def send_query(self, query: str):
        data = {
            "input" : {
                "option": {
                    "collection_id": COLLECTION_ID
                },
                "raw_text": query
            }
        }
        if(self.conversation_id):
            data["conversation_id"] = self.conversation_id
        response = self._post_request(GENERATE_URL, data=data, stream=True)
        source_string = ""
        response_text = ""
        exchange_id = ""
        for line in response.iter_lines(): #iterating through the incoming data stream
            if line:
                #decoded_line = line.decode('utf-8')
                json_data = line[len("data:"):].strip()
                json_obj = json.loads(json_data)
                if(json_obj["state"] == "EXCHANGE_RESPONSE_COMPLETE"):
                    outputs = json_obj["exchange_response_data"].get("output", [])
                    for i in range(1, len(outputs) + 1):
                        source_dict = outputs[i-1].get("attachments", None)
                        source = None
                        if(source_dict):
                            source = source_dict.get("content_origin_source_location", None)
                            
                            if(not source):  
                                source = source_dict.get("content_source_location", None)
                            if(source):
                                source = source.get("content", None)
                            if(self.verify_source(source)):
                                source_string += f"[{i}]: {source}\n"
                    self.conversation_id = json_obj["exchange_response_data"]["conversation_id"]
                if(json_obj["state"] == "GENERATIVE_EXCHANGE_RESPONSE_COMPLETE"):
                    exchange_id = json_obj["generative_exchange_conversation_data"]["data"]["generative_exchange_id"]
                elif(json_obj["state"] == "GENERATIVE_EXCHANGE_RESPONSE_DELTA"):
                    response_text += json_obj["generative_exchange_conversation_data"]["data"]["text"]
        
        response = response_text + "\n\n" + source_string
        return response, exchange_id
    
