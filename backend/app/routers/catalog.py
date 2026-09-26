from fastapi import APIRouter, Depends, HTTPException

from app import drive_store
from app.deps import get_drive_service
from app.schemas import CatalogItem, CatalogItemCreate, CatalogItemUpdate

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("", response_model=list[CatalogItem])
def list_catalog(service=Depends(get_drive_service)):
    return drive_store.get_catalog(service)


@router.post("", response_model=CatalogItem)
def create_catalog_item(item: CatalogItemCreate, service=Depends(get_drive_service)):
    return drive_store.add_catalog_item(service, item)


@router.put("/{item_id}", response_model=CatalogItem)
def update_catalog_item(
    item_id: str, patch: CatalogItemUpdate, service=Depends(get_drive_service)
):
    try:
        return drive_store.update_catalog_item(service, item_id, patch)
    except drive_store.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{item_id}")
def delete_catalog_item(item_id: str, service=Depends(get_drive_service)):
    drive_store.delete_catalog_item(service, item_id)
    return {"ok": True}
