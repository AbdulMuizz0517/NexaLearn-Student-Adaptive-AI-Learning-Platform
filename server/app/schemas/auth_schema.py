from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
	full_name: str
	email: EmailStr
	password: str


class UserLogin(BaseModel):
	email: EmailStr
	password: str


class Token(BaseModel):
	access_token: str
	token_type: str
	user_id: int
	role: str
	full_name: str
	email: str
