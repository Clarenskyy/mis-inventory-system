from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()

# Local connection (MongoDB running on your PC)
MONGO_URL = "mongodb://localhost:27017" # change to real mongo URL
client = AsyncIOMotorClient(MONGO_URL)
db = client.myappdb  # database name

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI + MongoDB"}

@app.post("/add_user")
async def add_user(user: dict):
    result = await db.users.insert_one(user)
    return {"inserted_id": str(result.inserted_id)}

@app.get("/users")
async def get_users():
    users = await db.users.find().to_list(100)
    return users
