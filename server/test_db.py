import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine
print("DATABASE_URL:", os.getenv('DATABASE_URL'))
engine = create_engine(os.getenv('DATABASE_URL'))
try:
    with engine.connect() as conn:
        print("SUCCESS")
except Exception as e:
    print(str(e))
