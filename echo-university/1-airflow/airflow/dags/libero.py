# %%
import json
import os
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

def slackbot_libero():
# Function to load the list from a file
    def load_list(filename):
        with open(filename, 'r') as file:
            return json.load(file)

    # Function to save the list to a file
    def save_list(lst, filename):
        with open(filename, 'w') as file:
            json.dump(lst, file)

    def send_message_to_slack(message, channel):
        try:
            response = client.chat_postMessage(
                channel=channel,
                text=message
            )
            assert response["message"]["text"] == message
        except SlackApiError as e:
            print(f"Error posting message: {e.response['error']}")

    # File where the list is stored
    filename = '/Users/hichamghermani/Desktop/projects/echo-university/1-airflow/employees.json'

    # Load the list from the file
    test = load_list(filename)

    # Initialize the Slack client with the bot token
    slack_token = "xoxb-1822194588947-7481942048736-dpLXdmQjabSHTcjM5gYCStPw"  # Ensure you set this environment variable
    client = WebClient(token=slack_token)

    channel = "libero"
    # Print the first element
    for i in test:
        message = f"Hey {i}\nYou are the libero of this week, enjoy !"
        print(message)
        send_message_to_slack(message, channel)
        break

    # Move the first element to the last position
    first_element = test.pop(0)
    test.append(first_element)

    # Save the updated list back to the file
    save_list(test, filename)

    # %%
# %%
slackbot_libero()
# %%
