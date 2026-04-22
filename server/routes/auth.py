"""Authentication routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import db
from auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "researcher"


@router.post("/login")
def login(req: LoginRequest):
    user = db.get_user_by_username(req.username)
    if user is None or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["username"], user["role"])
    return {"token": token, "username": user["username"], "role": user["role"]}


@router.post("/register")
def register(req: RegisterRequest):
    existing = db.get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user_id = db.create_user(req.username, hash_password(req.password), req.role)
    return {"id": user_id, "username": req.username, "role": req.role}


@router.get("/users")
def list_users():
    return db.list_users()
