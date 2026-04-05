from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import re

from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.auth_schema import Token, UserCreate, UserLogin

router = APIRouter()


@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
	existing_user = db.query(User).filter(User.email == user_in.email).first()
	if existing_user:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

	new_user = User(
		email=user_in.email,
		full_name=user_in.full_name,
		hashed_password=get_password_hash(user_in.password),
		role="student",
	)
	db.add(new_user)
	db.commit()
	db.refresh(new_user)

	access_token = create_access_token(subject=new_user.id)
	return {
		"access_token": access_token,
		"token_type": "bearer",
		"user_id": new_user.id,
		"role": new_user.role,
		"full_name": new_user.full_name,
		"email": new_user.email,
	}


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
	user = db.query(User).filter(User.email == user_in.email).first()
	if not user or not verify_password(user_in.password, user.hashed_password):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

	access_token = create_access_token(subject=user.id)
	return {
		"access_token": access_token,
		"token_type": "bearer",
		"user_id": user.id,
		"role": user.role,
		"full_name": user.full_name,
		"email": user.email,
	}


from pydantic import BaseModel as _BaseModel

class ChangePasswordRequest(_BaseModel):
	user_id: int
	old_password: str
	new_password: str


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db)):
	user = db.query(User).filter(User.id == req.user_id).first()
	if not user:
		raise HTTPException(status_code=404, detail="User not found")

	if user.is_active is False:
		raise HTTPException(status_code=403, detail="User account is inactive")

	if not verify_password(req.old_password, user.hashed_password):
		raise HTTPException(status_code=400, detail="Current password is incorrect")

	if req.new_password == req.old_password:
		raise HTTPException(status_code=400, detail="New password must differ from current password")

	if len(req.new_password) < 6:
		raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
	if not re.search(r"[A-Z]", req.new_password):
		raise HTTPException(status_code=400, detail="New password must include at least one uppercase letter")
	if not re.search(r"[0-9]", req.new_password):
		raise HTTPException(status_code=400, detail="New password must include at least one number")
	if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", req.new_password):
		raise HTTPException(status_code=400, detail="New password must include at least one symbol")

	user.hashed_password = get_password_hash(req.new_password)
	db.commit()

	return {"message": "Password changed successfully"}
