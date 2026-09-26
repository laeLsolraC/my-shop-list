from typing import Optional
from pydantic import BaseModel


class Item(BaseModel):
    id: str
    name: str
    quantity: Optional[str] = None
    done: bool = False


class ItemCreate(BaseModel):
    name: str
    quantity: Optional[str] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[str] = None
    done: Optional[bool] = None
