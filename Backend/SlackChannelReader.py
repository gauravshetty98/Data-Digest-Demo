import os
import time
from dotenv import load_dotenv
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from decimal import Decimal, ROUND_DOWN

import logging
logger = logging.getLogger("slack_reader")

# Load environment variables (can be called here or in the main execution script)
load_dotenv()

class SlackChannelReader:
    def __init__(self, token=None, default_channel_id=None):
        """
        Initialize the Slack Client.
        
        Args:
            token (str): Optional. Uses env variable SLACK_TOKEN if not provided.
            default_channel_id (str): Optional. Uses env variable CHANNEL_ID if not provided.
        """
        self.slack_token = token or os.getenv("SLACK_TOKEN")
        self.default_channel_id = default_channel_id or os.getenv("CHANNEL_ID")

        if not self.slack_token:
            raise ValueError("Error: SLACK_TOKEN not found in environment or arguments.")

        self.client = WebClient(token=self.slack_token)
        # Optional: Cache user names to avoid repeated API calls
        self.user_cache = {}

    def get_user_name(self, user_id):
        """
        Helper method to resolve User IDs to Real Names.
        """
        # Return cached name if we've seen this user before
        if user_id in self.user_cache:
            return self.user_cache[user_id]

        try:
            response = self.client.users_info(user=user_id)
            real_name = response["user"]["real_name"]
            self.user_cache[user_id] = real_name
            return real_name
        except Exception:
            return f"User {user_id}"

    def extract_messages(self, channel_id=None, lookback_minutes=20, print_output=True):
        """
        Fetches messages from a Slack channel.

        Args:
            channel_id (str): Override the default channel ID.
            lookback_minutes (int): How many minutes back to search (default: 20).
            print_output (bool): If True, prints logs to console (like the original script).

        Returns:
            list: A list of dictionaries containing parsed message data.
        """
        target_channel = channel_id or self.default_channel_id
        
        if not target_channel:
            print("Error: No Channel ID provided.")
            return []

        # Calculate the timestamp
        oldest_timestamp = Decimal(str(time.time())) - Decimal(lookback_minutes * 60)
        oldest_str = format(oldest_timestamp.quantize(Decimal("0.000001"), rounding=ROUND_DOWN), "f")

        
        if print_output:
            print(f"Connecting to Slack to fetch messages from {target_channel}...\n")

        logger.info(
            "extract_messages start channel=%s lookback=%s oldest_epoch=%.3f",
            target_channel, lookback_minutes, oldest_timestamp
        )

        extracted_data = []

        try:
            result = self.client.conversations_history(
                channel=target_channel,
                oldest=oldest_str,
                inclusive= True,
                limit=100
            )
            print(result)
            messages = result["messages"]

            logger.info("conversations_history returned raw=%d has_more=%s", len(messages), result.get("has_more"))


            if not messages:
                if print_output: print("No messages found! (Did you invite the bot?)")
                return []

            if print_output: print(f"--- Found {len(messages)} Messages ---\n")

            for msg in messages:
                # 1. Filter out system events
                if "subtype" in msg:
                    continue

                # 2. Extract Data
                user_id = msg.get("user")
                text = msg.get("text")
                ts = msg.get("ts")
                
                # 3. Resolve Name
                name = self.get_user_name(user_id)
                
                # 4. Store Data
                message_obj = {
                    "timestamp": ts,
                    "author": name,
                    "text": text,
                    "has_thread": "thread_ts" in msg
                }
                extracted_data.append(message_obj)

                # 5. Print (Optional)
                if print_output:
                    print(f"[{ts}] {name}: {text}")
                    if message_obj["has_thread"]:
                        print(f"    (This message has a thread/replies!)")
                    print("-" * 30)

            return extracted_data

        except SlackApiError as e:
            error_code = e.response.get('error', 'unknown_error')

            err = e.response.get("error", "unknown_error") if getattr(e, "response", None) else "no_response"
            logger.exception("SlackApiError channel=%s lookback=%s error=%s", target_channel, lookback_minutes, err)

            error_msg = f"Slack API error: {error_code}"
            if error_code == 'not_in_channel':
                error_msg += ". Bot is not in the channel. Go to the Slack channel and type '/invite @YourBotName'"
            elif error_code == 'missing_scope':
                error_msg += ". Missing required Slack API scope. Add 'channels:history' to your Bot Scopes."
            elif error_code == 'channel_not_found':
                error_msg += f". Channel ID '{target_channel}' not found. Please verify the channel ID is correct."
            if print_output:
                print(f"Error fetching messages: {error_msg}")
            # Re-raise the exception so the API can handle it
            raise ValueError(error_msg) from e

# --- EXECUTION BLOCK ---
if __name__ == "__main__":
    # This block only runs if you execute this file directly.
    # It will not run if you import this class into another file.
    
    try:
        # Initialize the bot
        bot = SlackChannelReader()
        
        # Run the extraction
        messages = bot.extract_messages()

        
        # Example: Doing something with the returned list
        print(f"\nSummary: Successfully extracted {len(messages)} valid messages.")
        print("messages: \n", messages)
    except ValueError as e:
        print(e)