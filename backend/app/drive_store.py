import io
import json
import re
import uuid
from datetime import datetime, timezone

from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

from app.schemas import (
    CatalogItem,
    CatalogItemCreate,
    CatalogItemUpdate,
    ListItem,
    ListItemCreate,
    ListItemUpdate,
    ShoppingList,
    ShoppingListSummary,
)

CATALOG_FILENAME = "catalog.json"
LIST_PREFIX = "shopping-list-"
LIST_ID_RE = re.compile(r"^(\d{8})v(\d+)$")


class NotFound(Exception):
    pass


# --- generic Drive JSON file helpers -------------------------------------


def _find_file(service, name: str) -> str | None:
    resp = (
        service.files()
        .list(q=f"name = '{name}' and trashed = false", fields="files(id, name)")
        .execute()
    )
    files = resp.get("files", [])
    return files[0]["id"] if files else None


def _read_json(service, file_id: str):
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, service.files().get_media(fileId=file_id))
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return json.loads(buf.getvalue().decode("utf-8"))


def _write_json(service, file_id: str, data) -> None:
    media = MediaIoBaseUpload(
        io.BytesIO(json.dumps(data).encode("utf-8")), mimetype="application/json"
    )
    service.files().update(fileId=file_id, media_body=media).execute()


def _create_json(service, name: str, data) -> str:
    media = MediaIoBaseUpload(
        io.BytesIO(json.dumps(data).encode("utf-8")), mimetype="application/json"
    )
    file = (
        service.files()
        .create(body={"name": name}, media_body=media, fields="id")
        .execute()
    )
    return file["id"]


# --- catalog ---------------------------------------------------------------


def _get_catalog_file_id(service) -> str:
    file_id = _find_file(service, CATALOG_FILENAME)
    if file_id is None:
        file_id = _create_json(service, CATALOG_FILENAME, [])
    return file_id


def get_catalog(service) -> list[CatalogItem]:
    file_id = _get_catalog_file_id(service)
    return [CatalogItem(**item) for item in _read_json(service, file_id)]


def _save_catalog(service, file_id: str, items: list[CatalogItem]) -> None:
    _write_json(service, file_id, [item.model_dump() for item in items])


def add_catalog_item(service, item: CatalogItemCreate) -> CatalogItem:
    file_id = _get_catalog_file_id(service)
    items = get_catalog(service)
    new_item = CatalogItem(id=str(uuid.uuid4()), **item.model_dump())
    items.append(new_item)
    _save_catalog(service, file_id, items)
    return new_item


def update_catalog_item(service, item_id: str, patch: CatalogItemUpdate) -> CatalogItem:
    file_id = _get_catalog_file_id(service)
    items = get_catalog(service)
    for i, item in enumerate(items):
        if item.id == item_id:
            updated = item.model_copy(
                update=patch.model_dump(exclude_unset=True)
            )
            items[i] = updated
            _save_catalog(service, file_id, items)
            return updated
    raise NotFound(f"catalog item {item_id} not found")


def delete_catalog_item(service, item_id: str) -> None:
    file_id = _get_catalog_file_id(service)
    items = [item for item in get_catalog(service) if item.id != item_id]
    _save_catalog(service, file_id, items)


# --- lists -------------------------------------------------------------


def _list_all_list_files(service) -> list[tuple[str, str]]:
    """Returns [(list_id, drive_file_id), ...] for every shopping-list file."""
    resp = (
        service.files()
        .list(
            q=f"name contains '{LIST_PREFIX}' and trashed = false",
            fields="files(id, name)",
        )
        .execute()
    )
    results = []
    for f in resp.get("files", []):
        list_id = f["name"][len(LIST_PREFIX) :].removesuffix(".json")
        if LIST_ID_RE.match(list_id):
            results.append((list_id, f["id"]))
    return results


def _sort_key(list_id: str) -> tuple[int, int]:
    m = LIST_ID_RE.match(list_id)
    return (int(m.group(1)), int(m.group(2)))


def _list_filename(list_id: str) -> str:
    return f"{LIST_PREFIX}{list_id}.json"


def _create_empty_list(service, list_id: str) -> ShoppingList:
    shopping_list = ShoppingList(
        id=list_id, created_at=datetime.now(timezone.utc), items=[]
    )
    _create_json(service, _list_filename(list_id), _serialize_list(shopping_list))
    return shopping_list


def _serialize_list(shopping_list: ShoppingList) -> dict:
    data = shopping_list.model_dump()
    data["created_at"] = shopping_list.created_at.isoformat()
    return data


def _next_list_id_for_today(existing_ids: list[str]) -> str:
    today = datetime.now().strftime("%Y%m%d")
    versions = [
        int(LIST_ID_RE.match(lid).group(2))
        for lid in existing_ids
        if LIST_ID_RE.match(lid).group(1) == today
    ]
    next_version = max(versions, default=0) + 1
    return f"{today}v{next_version}"


def _get_active_list_file(service) -> tuple[str, str]:
    """Returns (list_id, drive_file_id) for the active list, creating one if needed."""
    files = _list_all_list_files(service)
    if not files:
        shopping_list = _create_empty_list(service, _next_list_id_for_today([]))
        return shopping_list.id, _find_file(service, _list_filename(shopping_list.id))
    return max(files, key=lambda f: _sort_key(f[0]))


def get_active_list(service) -> ShoppingList:
    _, file_id = _get_active_list_file(service)
    return ShoppingList(**_read_json(service, file_id))


def create_new_list(service) -> ShoppingList:
    current = get_active_list(service)
    carried_items = [
        ListItem(
            id=str(uuid.uuid4()),
            catalog_item_id=item.catalog_item_id,
            name=item.name,
            quantity=item.quantity,
            price=item.price,
            done=False,
        )
        for item in current.items
        if not item.done
    ]
    all_ids = [f[0] for f in _list_all_list_files(service)]
    new_id = _next_list_id_for_today(all_ids)
    new_list = ShoppingList(
        id=new_id, created_at=datetime.now(timezone.utc), items=carried_items
    )
    _create_json(service, _list_filename(new_id), _serialize_list(new_list))
    return new_list


def get_list_history(service) -> list[ShoppingListSummary]:
    files = _list_all_list_files(service)
    if not files:
        return []
    active_id, _ = max(files, key=lambda f: _sort_key(f[0]))
    summaries = []
    for list_id, file_id in files:
        if list_id == active_id:
            continue
        data = _read_json(service, file_id)
        summaries.append(ShoppingListSummary(id=data["id"], created_at=data["created_at"]))
    summaries.sort(key=lambda s: _sort_key(s.id), reverse=True)
    return summaries


def get_list(service, list_id: str) -> ShoppingList:
    for lid, file_id in _list_all_list_files(service):
        if lid == list_id:
            return ShoppingList(**_read_json(service, file_id))
    raise NotFound(f"list {list_id} not found")


def add_item(service, item: ListItemCreate) -> ShoppingList:
    _, file_id = _get_active_list_file(service)
    shopping_list = ShoppingList(**_read_json(service, file_id))

    catalog_item_id = item.catalog_item_id
    name = item.name
    quantity = item.quantity
    price = item.price

    if catalog_item_id is not None:
        catalog_items = get_catalog(service)
        catalog_item = next((c for c in catalog_items if c.id == catalog_item_id), None)
        if catalog_item is None:
            raise NotFound(f"catalog item {catalog_item_id} not found")
        name = name or catalog_item.name
        quantity = quantity if quantity is not None else catalog_item.default_quantity
        price = price if price is not None else catalog_item.default_last_price
    elif item.add_to_catalog:
        new_catalog_item = add_catalog_item(
            service,
            CatalogItemCreate(name=name, default_quantity=quantity, default_last_price=price),
        )
        catalog_item_id = new_catalog_item.id

    new_item = ListItem(
        id=str(uuid.uuid4()),
        catalog_item_id=catalog_item_id,
        name=name,
        quantity=quantity,
        price=price,
        done=False,
    )
    shopping_list.items.append(new_item)
    _write_json(service, file_id, _serialize_list(shopping_list))
    return shopping_list


def update_item(service, item_id: str, patch: ListItemUpdate) -> ShoppingList:
    _, file_id = _get_active_list_file(service)
    shopping_list = ShoppingList(**_read_json(service, file_id))

    target = next((i for i in shopping_list.items if i.id == item_id), None)
    if target is None:
        raise NotFound(f"item {item_id} not found")

    updates = patch.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(target, field, value)

    if updates.get("done") is True and target.catalog_item_id is not None:
        catalog_items = get_catalog(service)
        catalog_item = next(
            (c for c in catalog_items if c.id == target.catalog_item_id), None
        )
        if catalog_item is not None and catalog_item.default_last_price != target.price:
            update_catalog_item(
                service,
                target.catalog_item_id,
                CatalogItemUpdate(default_last_price=target.price),
            )

    _write_json(service, file_id, _serialize_list(shopping_list))
    return shopping_list


def delete_item(service, item_id: str) -> ShoppingList:
    _, file_id = _get_active_list_file(service)
    shopping_list = ShoppingList(**_read_json(service, file_id))
    shopping_list.items = [i for i in shopping_list.items if i.id != item_id]
    _write_json(service, file_id, _serialize_list(shopping_list))
    return shopping_list
