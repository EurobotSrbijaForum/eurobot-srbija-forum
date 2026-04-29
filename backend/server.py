from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import secrets as py_secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Query, Header
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ------------------ Setup ------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = "HS256"
APP_NAME = os.environ.get("APP_NAME", "bolt-forum")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ------------------ Object Storage ------------------
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage unavailable")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 403:
        # refresh
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage unavailable")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ------------------ Models ------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: str = "user"
    created_at: str
    karma: int = 0

class CategoryOut(BaseModel):
    slug: str
    name: str
    description: str
    color: str
    icon: str
    thread_count: int = 0

class ThreadCreate(BaseModel):
    title: str
    body: str
    category: str
    tags: List[str] = []
    image_url: Optional[str] = None

class ThreadOut(BaseModel):
    thread_id: str
    title: str
    body: str
    category: str
    tags: List[str]
    image_url: Optional[str] = None
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    upvotes: int = 0
    downvotes: int = 0
    score: int = 0
    comment_count: int = 0
    is_pinned: bool = False
    is_locked: bool = False
    user_vote: int = 0
    created_at: str

class CommentCreate(BaseModel):
    thread_id: str
    body: str
    parent_id: Optional[str] = None

class CommentOut(BaseModel):
    comment_id: str
    thread_id: str
    parent_id: Optional[str] = None
    body: str
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    upvotes: int = 0
    downvotes: int = 0
    score: int = 0
    user_vote: int = 0
    created_at: str

class VoteIn(BaseModel):
    target_id: str
    target_type: str  # thread or comment
    value: int  # 1, -1, or 0 to remove

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

# ------------------ Helpers ------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_jwt(user_id: str, days: int = 7) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=days), "type": "session"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key="session_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=7 * 24 * 3600, path="/"
    )

def serialize_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "email": u["email"],
        "name": u["name"],
        "avatar_url": u.get("avatar_url"),
        "bio": u.get("bio"),
        "role": u.get("role", "user"),
        "created_at": u.get("created_at", datetime.now(timezone.utc).isoformat()),
        "karma": u.get("karma", 0),
    }

async def get_user_by_token(token: str) -> Optional[dict]:
    # Try our JWT first
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user:
                return user
    except Exception:
        pass
    # Try emergent session
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if sess:
        expires_at = sess.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at < datetime.now(timezone.utc):
            return None
        user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
        return user
    return None

async def current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user

async def optional_user(request: Request) -> Optional[dict]:
    try:
        return await current_user(request)
    except HTTPException:
        return None

# ------------------ Seed ------------------
DEFAULT_CATEGORIES = [
    {"slug": "general", "name": "General", "description": "Anything goes here", "color": "#FF4500", "icon": "ChatCircle"},
    {"slug": "tech", "name": "Tech & Dev", "description": "Programming, gadgets, software", "color": "#00C3FF", "icon": "Code"},
    {"slug": "design", "name": "Design", "description": "UI, UX, art, creativity", "color": "#FF007F", "icon": "Palette"},
    {"slug": "gaming", "name": "Gaming", "description": "Video games and esports", "color": "#39FF14", "icon": "GameController"},
    {"slug": "music", "name": "Music", "description": "Share and discuss music", "color": "#FFD700", "icon": "MusicNote"},
    {"slug": "random", "name": "Random", "description": "Off-topic and fun", "color": "#9B5DE5", "icon": "Sparkle"},
]

async def seed():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.threads.create_index("thread_id", unique=True)
    await db.comments.create_index("comment_id", unique=True)
    await db.votes.create_index([("user_id", 1), ("target_id", 1)], unique=True)
    await db.threads.create_index([("category", 1), ("created_at", -1)])

    # categories
    for c in DEFAULT_CATEGORIES:
        await db.categories.update_one({"slug": c["slug"]}, {"$set": c}, upsert=True)

    # admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@forum.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "avatar_url": None,
            "bio": "Forum administrator",
            "karma": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif existing.get("password_hash") and not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})

    # demo user
    demo_email = "demo@forum.com"
    if not await db.users.find_one({"email": demo_email}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": demo_email,
            "password_hash": hash_password("demo123"),
            "name": "DemoUser",
            "role": "user",
            "avatar_url": None,
            "bio": "Just hanging out",
            "karma": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

@app.on_event("startup")
async def startup_evt():
    await seed()
    init_storage()
    logger.info("Forum backend ready.")

# ------------------ Auth Endpoints ------------------
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip() or email.split("@")[0],
        "role": "user",
        "avatar_url": None,
        "bio": "",
        "karma": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_jwt(user_id)
    set_session_cookie(response, token)
    return serialize_user(doc)

@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user["user_id"])
    set_session_cookie(response, token)
    return serialize_user(user)

@api_router.post("/auth/logout")
async def logout(response: Response, request: Request):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user=Depends(current_user)):
    return serialize_user(user)

@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}, timeout=15
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to verify google session: {e}")
    email = data.get("email", "").lower()
    name = data.get("name", "User")
    picture = data.get("picture")
    session_token = data["session_token"]
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "avatar_url": picture or existing.get("avatar_url")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "avatar_url": picture,
            "bio": "",
            "role": "user",
            "karma": 0,
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"session_token": session_token, "user_id": user_id, "expires_at": expires.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    set_session_cookie(response, session_token)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return serialize_user(user)

# ------------------ Categories ------------------
@api_router.get("/categories")
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    for c in cats:
        c["thread_count"] = await db.threads.count_documents({"category": c["slug"]})
    return cats

# ------------------ Threads ------------------
async def enrich_thread(t: dict, user: Optional[dict]) -> dict:
    user_vote = 0
    if user:
        v = await db.votes.find_one({"user_id": user["user_id"], "target_id": t["thread_id"]}, {"_id": 0})
        if v:
            user_vote = v["value"]
    t["user_vote"] = user_vote
    t["score"] = t.get("upvotes", 0) - t.get("downvotes", 0)
    t["comment_count"] = await db.comments.count_documents({"thread_id": t["thread_id"]})
    return t

@api_router.get("/threads")
async def list_threads(
    request: Request,
    category: Optional[str] = None,
    q: Optional[str] = None,
    tag: Optional[str] = None,
    sort: str = "hot",
    limit: int = 30,
):
    user = await optional_user(request)
    query = {}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}}, {"body": {"$regex": q, "$options": "i"}}]
    if sort == "new":
        cursor = db.threads.find(query, {"_id": 0}).sort([("is_pinned", -1), ("created_at", -1)])
    elif sort == "top":
        cursor = db.threads.find(query, {"_id": 0}).sort([("is_pinned", -1), ("upvotes", -1)])
    else:  # hot = score then recent
        cursor = db.threads.find(query, {"_id": 0}).sort([("is_pinned", -1), ("upvotes", -1), ("created_at", -1)])
    threads = await cursor.to_list(limit)
    return [await enrich_thread(t, user) for t in threads]

@api_router.get("/threads/{thread_id}")
async def get_thread(thread_id: str, request: Request):
    user = await optional_user(request)
    t = await db.threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
    return await enrich_thread(t, user)

@api_router.post("/threads")
async def create_thread(payload: ThreadCreate, user=Depends(current_user)):
    cat = await db.categories.find_one({"slug": payload.category}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=400, detail="Invalid category")
    thread_id = f"thr_{uuid.uuid4().hex[:12]}"
    doc = {
        "thread_id": thread_id,
        "title": payload.title.strip(),
        "body": payload.body,
        "category": payload.category,
        "tags": [t.strip().lower() for t in payload.tags if t.strip()][:5],
        "image_url": payload.image_url,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_avatar": user.get("avatar_url"),
        "upvotes": 1,
        "downvotes": 0,
        "is_pinned": False,
        "is_locked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.threads.insert_one(doc)
    # auto-upvote by author
    await db.votes.insert_one({
        "user_id": user["user_id"], "target_id": thread_id, "target_type": "thread", "value": 1,
    })
    return await enrich_thread({k: v for k, v in doc.items() if k != "_id"}, user)

@api_router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str, user=Depends(current_user)):
    t = await db.threads.find_one({"thread_id": thread_id})
    if not t:
        raise HTTPException(404, "Not found")
    if t["author_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(403, "Forbidden")
    await db.threads.delete_one({"thread_id": thread_id})
    await db.comments.delete_many({"thread_id": thread_id})
    await db.votes.delete_many({"target_id": thread_id})
    return {"ok": True}

@api_router.post("/threads/{thread_id}/pin")
async def pin_thread(thread_id: str, user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    t = await db.threads.find_one({"thread_id": thread_id})
    if not t:
        raise HTTPException(404, "Not found")
    await db.threads.update_one({"thread_id": thread_id}, {"$set": {"is_pinned": not t.get("is_pinned", False)}})
    return {"ok": True}

@api_router.post("/threads/{thread_id}/lock")
async def lock_thread(thread_id: str, user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    t = await db.threads.find_one({"thread_id": thread_id})
    if not t:
        raise HTTPException(404, "Not found")
    await db.threads.update_one({"thread_id": thread_id}, {"$set": {"is_locked": not t.get("is_locked", False)}})
    return {"ok": True}

# ------------------ Comments ------------------
@api_router.get("/threads/{thread_id}/comments")
async def list_comments(thread_id: str, request: Request):
    user = await optional_user(request)
    cs = await db.comments.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    out = []
    for c in cs:
        if user:
            v = await db.votes.find_one({"user_id": user["user_id"], "target_id": c["comment_id"]}, {"_id": 0})
            c["user_vote"] = v["value"] if v else 0
        else:
            c["user_vote"] = 0
        c["score"] = c.get("upvotes", 0) - c.get("downvotes", 0)
        out.append(c)
    return out

@api_router.post("/comments")
async def create_comment(payload: CommentCreate, user=Depends(current_user)):
    t = await db.threads.find_one({"thread_id": payload.thread_id})
    if not t:
        raise HTTPException(404, "Thread not found")
    if t.get("is_locked"):
        raise HTTPException(403, "Thread is locked")
    cid = f"cmt_{uuid.uuid4().hex[:12]}"
    doc = {
        "comment_id": cid,
        "thread_id": payload.thread_id,
        "parent_id": payload.parent_id,
        "body": payload.body,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_avatar": user.get("avatar_url"),
        "upvotes": 1,
        "downvotes": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.comments.insert_one(doc)
    await db.votes.insert_one({
        "user_id": user["user_id"], "target_id": cid, "target_type": "comment", "value": 1,
    })
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["user_vote"] = 1
    out["score"] = 1
    return out

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user=Depends(current_user)):
    c = await db.comments.find_one({"comment_id": comment_id})
    if not c:
        raise HTTPException(404, "Not found")
    if c["author_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(403, "Forbidden")
    await db.comments.delete_one({"comment_id": comment_id})
    await db.votes.delete_many({"target_id": comment_id})
    return {"ok": True}

# ------------------ Votes ------------------
@api_router.post("/vote")
async def vote(payload: VoteIn, user=Depends(current_user)):
    if payload.value not in (-1, 0, 1):
        raise HTTPException(400, "Invalid value")
    coll = db.threads if payload.target_type == "thread" else db.comments
    id_field = "thread_id" if payload.target_type == "thread" else "comment_id"
    target = await coll.find_one({id_field: payload.target_id})
    if not target:
        raise HTTPException(404, "Target not found")

    existing = await db.votes.find_one({"user_id": user["user_id"], "target_id": payload.target_id})
    old = existing["value"] if existing else 0
    new = payload.value

    # diff: remove old, add new
    delta_up = (1 if new == 1 else 0) - (1 if old == 1 else 0)
    delta_down = (1 if new == -1 else 0) - (1 if old == -1 else 0)

    if new == 0:
        await db.votes.delete_one({"user_id": user["user_id"], "target_id": payload.target_id})
    else:
        await db.votes.update_one(
            {"user_id": user["user_id"], "target_id": payload.target_id},
            {"$set": {"user_id": user["user_id"], "target_id": payload.target_id, "target_type": payload.target_type, "value": new}},
            upsert=True,
        )
    await coll.update_one({id_field: payload.target_id}, {"$inc": {"upvotes": delta_up, "downvotes": delta_down}})
    # update author karma
    await db.users.update_one({"user_id": target["author_id"]}, {"$inc": {"karma": delta_up - delta_down}})

    updated = await coll.find_one({id_field: payload.target_id}, {"_id": 0})
    updated["user_vote"] = new
    updated["score"] = updated.get("upvotes", 0) - updated.get("downvotes", 0)
    return updated

# ------------------ Users ------------------
@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(404, "User not found")
    return serialize_user(u)

@api_router.get("/users/{user_id}/threads")
async def user_threads(user_id: str, request: Request):
    user = await optional_user(request)
    threads = await db.threads.find({"author_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [await enrich_thread(t, user) for t in threads]

@api_router.put("/users/me")
async def update_me(payload: ProfileUpdate, user=Depends(current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
        # propagate name/avatar to threads/comments
        if "name" in update or "avatar_url" in update:
            new_name = update.get("name", user["name"])
            new_avatar = update.get("avatar_url", user.get("avatar_url"))
            await db.threads.update_many({"author_id": user["user_id"]}, {"$set": {"author_name": new_name, "author_avatar": new_avatar}})
            await db.comments.update_many({"author_id": user["user_id"]}, {"$set": {"author_name": new_name, "author_avatar": new_avatar}})
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return serialize_user(u)

# ------------------ Upload ------------------
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), user=Depends(current_user)):
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    ct = file.content_type or "application/octet-stream"
    if ct not in allowed:
        raise HTTPException(400, "Only image files allowed")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() or "bin"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Max 5MB")
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4().hex}.{ext}"
    result = put_object(path, data, ct)
    file_id = str(uuid.uuid4())
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "uploader_id": user["user_id"],
        "content_type": ct,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    backend_origin = ""  # use relative URL
    return {"file_id": file_id, "url": f"/api/files/{file_id}"}

@api_router.get("/files/{file_id}")
async def get_file(file_id: str):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "File not found")
    data, ct = get_object(rec["storage_path"])
    return FastAPIResponse(content=data, media_type=rec.get("content_type", ct))

# ------------------ Tags / Stats ------------------
@api_router.get("/tags/popular")
async def popular_tags():
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    res = await db.threads.aggregate(pipeline).to_list(20)
    return [{"tag": r["_id"], "count": r["count"]} for r in res]

@api_router.get("/stats")
async def stats():
    return {
        "threads": await db.threads.count_documents({}),
        "comments": await db.comments.count_documents({}),
        "users": await db.users.count_documents({}),
    }

# ------------------ App wiring ------------------
app.include_router(api_router)

cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
