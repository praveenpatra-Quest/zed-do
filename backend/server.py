import os
import secrets
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import List, Optional
import requests

# Load environment variables
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import bcrypt
import jwt
import resend

# --- CONFIGURATION ---
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
SECRET_KEY = os.environ.get("JWT_SECRET", "zen-do-super-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
RESEND_API_KEY = "re_KVUTZQS7_FcghzeKYVe4HjRnSAGFQUuNv"

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

app = FastAPI(title="Zen-Do API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE ---
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def format_doc(doc: dict) -> dict:
    if not doc:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

# --- MODELS ---
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    name: str
    password: str
    origin: Optional[str] = None

class UserResponse(UserBase):
    id: str
    is_verified: bool = False
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class GoogleAuthRequest(BaseModel):
    access_token: str

class TodoBase(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    completed: bool = False

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None

class TodoResponse(TodoBase):
    id: str
    user_id: str
    created_at: datetime

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    origin: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr
    origin: Optional[str] = None

# --- AUTH UTILS ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return format_doc(user)

# --- EMAIL UTILS ---
async def send_verification_email(email: str, token: str, base_url: str, name: str = ""):
    if not RESEND_API_KEY:
        print(f"MOCK EMAIL: Verify at {base_url}/verify-email?token={token}")
        return
    
    verify_url = f"{base_url}/verify-email?token={token}"
    greeting = f"Hi {name}," if name else "Welcome to Zen-Do!"
    
    try:
        resend.Emails.send({
            "from": "Zen-Do <onboarding@resend.dev>",
            "to": email,
            "subject": "Verify your Zen-Do account",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0d9488;">{greeting}</h2>
                    <p>Thank you for signing up. Please verify your email address to start managing your tasks.</p>
                    <a href="{verify_url}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Email Address</a>
                    <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">If the button doesn't work, copy and paste this link: {verify_url}</p>
                </div>
            """
        })
    except Exception as e:
        print(f"Error sending email: {e}")

async def send_reset_password_email(email: str, token: str, base_url: str):
    if not RESEND_API_KEY:
        print(f"MOCK EMAIL: Reset at {base_url}/reset-password?token={token}")
        return
        
    reset_url = f"{base_url}/reset-password?token={token}"
    
    try:
        resend.Emails.send({
            "from": "Zen-Do <onboarding@resend.dev>",
            "to": email,
            "subject": "Reset your Zen-Do password",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0d9488;">Password Reset Request</h2>
                    <p>We received a request to reset your Zen-Do password. Click the button below to choose a new one.</p>
                    <a href="{reset_url}" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
                    <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.</p>
                </div>
            """
        })
    except Exception as e:
        print(f"Error sending email: {e}")

# --- ROUTES ---

@app.get("/api")
async def health_check():
    return {"status": "ok", "message": "Zen-Do API is running"}

# --- AUTH ROUTES ---

@app.post("/api/auth/signup", response_model=UserResponse)
async def signup(user_in: UserCreate, request: Request):
    existing_user = await db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    verification_token = secrets.token_urlsafe(32)
    
    user_dict = {
        "email": user_in.email,
        "name": user_in.name,
        "hashed_password": hash_password(user_in.password),
        "is_verified": False,
        "verification_token": verification_token,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Use origin from body if provided, else try headers
    origin = user_in.origin
    if not origin:
        origin = request.headers.get("origin")
    if not origin:
        host = request.headers.get("host")
        scheme = "https" if request.headers.get("x-forwarded-proto") == "https" else "http"
        origin = f"{scheme}://{host}"
    
    await send_verification_email(user_in.email, verification_token, origin, user_in.name)
    
    return format_doc(user_dict)

@app.post("/api/auth/login", response_model=Token)
async def login(user_in: UserCreate):
    # Note: Using UserCreate model here but password is the only required field besides email for login
    # In a real app we'd use a separate Login model
    user = await db.users.find_one({"email": user_in.email})
    if not user or not verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your email first")
        
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/google", response_model=Token)
async def google_auth(request: GoogleAuthRequest):
    # Verify google token
    google_res = requests.get(f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={request.access_token}")
    if not google_res.ok:
        raise HTTPException(status_code=400, detail="Invalid Google token")
    
    google_user = google_res.json()
    email = google_user.get("email")
    name = google_user.get("name")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")
    
    user = await db.users.find_one({"email": email})
    if not user:
        # Create new user for google signup
        user_dict = {
            "email": email,
            "name": name,
            "is_verified": True, # Google emails are already verified
            "created_at": datetime.utcnow(),
            "google_id": google_user.get("sub")
        }
        result = await db.users.insert_one(user_dict)
        user = user_dict
        user["_id"] = result.inserted_id
    elif not user.get("name") and name:
        # Update name if it was missing
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": name}})
    
    access_token = create_access_token(data={"sub": email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/api/auth/verify")
async def verify_email(token: str = Query(...)):
    user = await db.users.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True}, "$unset": {"verification_token": ""}}
    )
    return {"message": "Email verified successfully"}

@app.post("/api/auth/resend-verification")
async def resend_verification(request_body: ResendVerificationRequest, request: Request):
    user = await db.users.find_one({"email": request_body.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.get("is_verified", False):
        return {"message": "Email is already verified"}
        
    verification_token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"verification_token": verification_token}}
    )
    
    origin = request_body.origin
    if not origin:
        origin = request.headers.get("origin")
    if not origin:
        host = request.headers.get("host")
        scheme = "https" if request.headers.get("x-forwarded-proto") == "https" else "http"
        origin = f"{scheme}://{host}"
        
    await send_verification_email(request_body.email, verification_token, origin, user.get("name", ""))
    return {"message": "Verification email resent"}

@app.post("/api/auth/forgot-password")
async def forgot_password(request_body: ForgotPasswordRequest, request: Request):
    user = await db.users.find_one({"email": request_body.email})
    if not user:
        return {"message": "If an account exists with that email, a reset link has been sent."}
        
    reset_token = secrets.token_urlsafe(32)
    reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expires": reset_token_expires
        }}
    )
    
    origin = request_body.origin
    if not origin:
        origin = request.headers.get("origin")
    if not origin:
        host = request.headers.get("host")
        scheme = "https" if request.headers.get("x-forwarded-proto") == "https" else "http"
        origin = f"{scheme}://{host}"
        
    await send_reset_password_email(request_body.email, reset_token, origin)
    return {"message": "If an account exists with that email, a reset link has been sent."}

@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    user = await db.users.find_one({
        "reset_token": request.token,
        "reset_token_expires": {"$gt": datetime.utcnow()}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"hashed_password": hash_password(request.new_password)},
            "$unset": {"reset_token": "", "reset_token_expires": ""}
        }
    )
    return {"message": "Password reset successfully"}

# --- TODO ROUTES ---

@app.get("/api/todos", response_model=List[TodoResponse])
async def get_todos(current_user: dict = Depends(get_current_user)):
    cursor = db.todos.find({"user_id": current_user["id"]}).sort("created_at", -1)
    todos = await cursor.to_list(length=100)
    return [format_doc(todo) for todo in todos]

@app.post("/api/todos", response_model=TodoResponse)
async def create_todo(todo_in: TodoCreate, current_user: dict = Depends(get_current_user)):
    todo_dict = todo_in.dict()
    todo_dict.update({
        "user_id": current_user["id"],
        "created_at": datetime.utcnow()
    })
    result = await db.todos.insert_one(todo_dict)
    todo_dict["_id"] = result.inserted_id
    return format_doc(todo_dict)

@app.patch("/api/todos/{todo_id}", response_model=TodoResponse)
async def update_todo(todo_id: str, todo_in: TodoUpdate, current_user: dict = Depends(get_current_user)):
    todo = await db.todos.find_one({"_id": ObjectId(todo_id), "user_id": current_user["id"]})
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
        
    update_data = {k: v for k, v in todo_in.dict().items() if v is not None}
    await db.todos.update_one({"_id": ObjectId(todo_id)}, {"$set": update_data})
    
    updated_todo = await db.todos.find_one({"_id": ObjectId(todo_id)})
    return format_doc(updated_todo)

@app.delete("/api/todos/{todo_id}")
async def delete_todo(todo_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.todos.delete_one({"_id": ObjectId(todo_id), "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Todo not found")
    return {"message": "Todo deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
