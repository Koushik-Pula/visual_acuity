from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# --- NEW: Sub-models for Test History ---
class TestAttempt(BaseModel):
    acuity: str
    couldSee: bool

class TestReport(BaseModel):
    test_type: str = "LandoltC"
    final_acuity: str
    decimal_acuity: float
    history: List[TestAttempt]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- User Models ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    focal_length: Optional[float] = None
    pixels_per_mm: Optional[float] = None
    screen_ppi: Optional[float] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    focal_length: Optional[float] = None
    pixels_per_mm: Optional[float] = None
    screen_ppi: Optional[float] = None

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    focal_length: Optional[float] = None
    pixels_per_mm: Optional[float] = None
    screen_ppi: Optional[float] = None
    
    # NEW: Store list of reports
    test_history: List[TestReport] = []
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class User(UserBase):
    id: PyObjectId = Field(alias="_id")
    focal_length: Optional[float] = None
    pixels_per_mm: Optional[float] = None
    screen_ppi: Optional[float] = None
    
    # NEW: Return history to frontend
    test_history: List[TestReport] = []
    
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class CalibrationData(BaseModel):
    focal_length: Optional[float] = None
    pixels_per_mm: Optional[float] = None
    screen_ppi: Optional[float] = None