# Requirements

Confirmed via user interview on 2026-09-26. This supersedes the informal
requirements draft from earlier in the project; see `CLAUDE.md` for
architecture conventions and `PROGRESS.md` for build status.

## Data model

### Catalog (`catalog.json` — one file, source of truth for known items)

```
{ id, name, default_quantity, default_last_price }
```

- Managed through its own screen: add / edit / remove entries directly,
  independent of any shopping list.
- Append/edit/remove is in scope now (not deferred) — catalog management is
  a first-class screen, not just a side effect of adding items to a list.

### Shopping list (`shopping-list-YYYYMMDDvN.json` — one file per list)

Exactly **one active list** exists at a time. Past lists are archived
(read-only) files, never deleted or merged into one growing file.

```
{
  id,              // e.g. "20260926v1" — date + version for same-day duplicates
  created_at,
  items: [
    { id, catalog_item_id: str | None, name, quantity, price, done }
  ]
}
```

- `catalog_item_id` is set when the item was added from the catalog;
  `None` for one-off items not saved to the catalog.
- `price` defaults from the catalog entry's `default_last_price` when the
  item is added (blank for one-offs with no catalog link).
- `name`/`quantity`/`price` are copied onto the list item at add time — the
  list item is self-contained even if the catalog entry later changes or is
  removed.

## Basic features (build now)

1. **Catalog management** — add, edit, and remove catalog entries via a
   dedicated screen.
2. **Active list** — add items (from the catalog, or by typing a new name),
   remove items, check/uncheck items.
3. **Add-from-catalog with confirm-to-create** — typing a name not in the
   catalog prompts "add to catalog?":
   - Confirm → item is saved to the catalog and linked (`catalog_item_id`
     set).
   - Decline → item exists only on the current list (`catalog_item_id:
     None`), never touches the catalog.
4. **Price sync on check-off** — when an item's `done` transitions to
   `true`, if its `price` differs from the linked catalog entry's
   `default_last_price`, update the catalog entry to match. Skipped for
   items with `catalog_item_id: None`. No sync happens except at this
   transition (editing price without checking off the item does not
   propagate).
5. **Create new list** — archives the current active list (becomes
   read-only history) and starts a new one:
   - Auto-named `YYYYMMDD`, with a version suffix (`v1`, `v2`, ...) for
     multiple lists created the same day.
   - All **unchecked** items from the previous list carry over automatically
     (name, quantity, price, catalog link intact) — no prompt, no carry-over
     opt-out in this version.
   - Checked items do not carry over; they remain only in the archived list.
6. **History screen** — browse past (archived) lists by name/date, view
   their items and final checked state. Read-only: no editing, no
   per-item or bulk "add back to active list" actions in this version.

## Explicitly deferred (not designed or built now)

- **Price trend history** — only the single `default_last_price` ("last
  known value") is tracked; no time series of price changes over time.
- **Purchase-pattern suggestions** — no analysis of shopping history to
  recommend items.
- **Multi-user / shared lists** — would require a hosted backend, real
  accounts, and either shared Drive access or a shared datastore; a
  distinct cost/architecture decision to revisit later, not something
  today's design accounts for.
- **No database** — Drive JSON files remain the entire datastore for every
  feature above. If a future feature (e.g. suggestions) turns out to need
  fast querying across many archived lists, evaluate a local database
  (e.g. SQLite) at that point, either as a read-side cache alongside Drive
  (source of truth stays on Drive) or, if Drive is dropped entirely, as a
  full replacement — a decision for when that feature is actually
  scheduled.

## Open items for a future round

- Whether history-screen actions (re-adding a past item, duplicating a past
  list) are ever wanted — deferred, revisit if it becomes a pain point.
- Whether catalog entries should support categories (e.g. "produce",
  "dairy") for grouping — not requested, not built.
