from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CatalogItem(BaseModel):
    id: str
    name: str
    default_quantity: Optional[str] = None
    default_last_price: Optional[float] = None


class CatalogItemCreate(BaseModel):
    name: str
    default_quantity: Optional[str] = None
    default_last_price: Optional[float] = None


class CatalogItemUpdate(BaseModel):
    name: Optional[str] = None
    default_quantity: Optional[str] = None
    default_last_price: Optional[float] = None


class ListItem(BaseModel):
    id: str
    catalog_item_id: Optional[str] = None
    name: str
    quantity: Optional[str] = None
    price: Optional[float] = None
    done: bool = False


class ListItemCreate(BaseModel):
    catalog_item_id: Optional[str] = None
    name: Optional[str] = None
    quantity: Optional[str] = None
    price: Optional[float] = None
    add_to_catalog: bool = False


class ListItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[str] = None
    price: Optional[float] = None
    done: Optional[bool] = None


class ShoppingList(BaseModel):
    id: str
    created_at: datetime
    items: list[ListItem] = []


class ShoppingListSummary(BaseModel):
    id: str
    created_at: datetime
