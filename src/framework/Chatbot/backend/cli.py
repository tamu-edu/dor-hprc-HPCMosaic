import os
import subprocess
from pryon_conversation import Conversation
def main():
    my_conversation = Conversation();
    last_exchange_id = None;
    print("Welcome to the chatbot interface!\nYou can communicate with the bot by entering your question following =>.\nIf you would like to provide feedback for the bot, you can enter \'f\'\nIf you would like to exit the application, enter \'q\'. \n\n")

    while(True):
        my_input = input("=> ");
        if(my_input == 'q'):
            break;
        if(my_input == 'f'):
            if(not last_exchange_id):
                print("No previous response found in this conversation. Please ask a question before providing feedback.\n")
                continue
            rating = input("Please rate the last response between 1 and 5: ")
            while(True):
                try:
                    rating = int(rating)
                    if(rating < 1 or rating > 5):
                        rating = input("Invalid input. Please rate the last response between 1 and 5: ")
                        continue
                    break;
                except:
                    rating = input("Invalid input. Please rate the last response between 1 and 5: ")
            comment = input("Please provide any additional comments: ")
            response = my_conversation.send_feedback(rating, last_exchange_id, comment)            
        else:
            result, last_exchange_id = my_conversation.send_query(my_input)
            print(result)
        


            
if __name__ == "__main__":
    main()