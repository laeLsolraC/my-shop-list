from fastapi import APIRouter, Depends, HTTPException

from app import drive_store
from app.deps import get_drive_service
from app.schemas import ListItemCreate, ListItemUpdate, ShoppingList, ShoppingListSummary

router = APIRouter(prefix="/lists", tags=["lists"])


@router.get("/active", response_model=ShoppingList)
def get_active_list(service=Depends(get_drive_service)):
    return drive_store.get_active_list(service)


@router.post("", response_model=ShoppingList)
def create_new_list(service=Depends(get_drive_service)):
    return drive_store.create_new_list(service)


@router.get("", response_model=list[ShoppingListSummary])
def get_history(service=Depends(get_drive_service)):
    return drive_store.get_list_history(service)


@router.get("/{list_id}", response_model=ShoppingList)
def get_list(list_id: str, service=Depends(get_drive_service)):
    try:
        return drive_store.get_list(service, list_id)
    except drive_store.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/active/items", response_model=ShoppingList)
def add_item(item: ListItemCreate, service=Depends(get_drive_service)):
    try:
        return drive_store.add_item(service, item)
    except drive_store.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/active/items/{item_id}", response_model=ShoppingList)
def update_item(item_id: str, patch: ListItemUpdate, service=Depends(get_drive_service)):
    try:
        return drive_store.update_item(service, item_id, patch)
    except drive_store.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/active/items/{item_id}", response_model=ShoppingList)
def delete_item(item_id: str, service=Depends(get_drive_service)):
    return drive_store.delete_item(service, item_id)
