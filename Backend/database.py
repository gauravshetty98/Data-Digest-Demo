import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine (singleton - created once)
engine = create_engine(DATABASE_URL)

# Optional: Function to get engine
def get_engine():
    return engine