# Preferred Store Architecture

This document explains how the Preferred Store feature is wired, where responsibilities live, and what to update when behavior changes.

## Scope

Primary runtime files:
- `assets/russo-preferred-store-shared.js`
- `assets/russo-preferred-store-entry.js`
- `assets/russo-preferred-store-main.js`

Primary Liquid entry points:
- `sections/header.liquid`
- `blocks/russo-preferred-store-embed.liquid`
- `snippets/russo-preferred-store-variant-trigger.liquid`
- `snippets/russo-preferred-store-drawer.liquid`

## Runtime Responsibilities

### 1) Entry bootstrap (`russo-preferred-store-entry.js`)

Owns:
- Initial label hydration from cookies (`[data-preferred-store-current-label]`)
- Trigger mount/move into header target
- Lightweight pickup status hydration for product status line
- Batch stock probe for product-card/pdp trigger blocks
- Lazy-load of main drawer runtime (`russo-preferred-store-main.js`)
- Delegated click handling for `[data-preferred-store-open]`

Exposes:
- `window.__PreferredStoreOpen(options)`

Depends on:
- `window.__PreferredStoreShared` from `assets/russo-preferred-store-shared.js`

### 2) Main drawer runtime (`russo-preferred-store-main.js`)

Owns:
- Drawer open/close lifecycle
- Store list fetch/render/search
- Distance sorting (GeoIP/ZIP/browser geo)
- Active variant stock lookup and per-store stock display
- Preferred-store persistence and cart attribute sync
- ZIP cache and location list cache

Exposes:
- `window.__PreferredStoreAPI.open(options)`

### 3) Shared helper namespace

Shared helpers are centralized on:
- `window.__PreferredStoreShared`

Defined in:
- `assets/russo-preferred-store-shared.js`

Core helper areas:
- URL fallback construction (`buildProxyCandidates`)
- Retry fetch with endpoint fallback (`fetchJsonWithFallback`)
- Stock normalization and map building
- Variant/inventory node extraction from response shapes
- Store key normalization and lookup candidates

Note:
- `main.js` expects shared helpers to exist and aborts with a console error if not present.
- `entry.js` also expects shared helpers and aborts with a console error if not present.

## Script Load Order

Current load order in Liquid:
1. `assets/russo-preferred-store-shared.js`
2. `assets/russo-preferred-store-entry.js`
3. `assets/russo-preferred-store-main.js` (lazy-loaded by entry)

References:
- `sections/header.liquid`
- `blocks/russo-preferred-store-embed.liquid`

## Data Flow

## A) Trigger click flow

1. User clicks an element with `[data-preferred-store-open]`.
2. Entry script intercepts delegated click unless `data-preferred-store-direct="true"`.
3. Entry opens dialog shell immediately for perceived speed.
4. Entry lazy-loads `russo-preferred-store-main.js` (if needed).
5. Main runtime initializes and opens the drawer.

## B) Product stock flow

1. Product context is provided on `window.__PreferredStoreProductContext`.
2. Entry batch-probes stock for visible variant triggers.
3. Response is normalized into `window.__PreferredStoreVariantStockCache`.
4. Trigger labels/icons hydrate against selected preferred-store cookie.
5. Main runtime performs active-variant stock lookup when drawer opens.

## C) Preferred store selection flow

1. User selects a store card.
2. Cookies are updated:
   - `preferred_store_location_id`
   - `preferred_store_location_name`
3. Header/trigger labels update.
4. Cart attributes are updated via `/cart/update.js`.
5. Drawer closes and page refresh may occur if location changed.

## Storage and Globals

Cookies:
- `preferred_store_location_id`
- `preferred_store_location_name`

Local Storage:
- `preferred_store_locations_v2`
- `preferred_store_zip_cache_v1`

Session Storage:
- `__preferred_store_origin_v1`

Globals:
- `window.__PreferredStoreConfig`
- `window.__PreferredStoreProductContext`
- `window.__PreferredStoreShared`
- `window.__PreferredStoreOpen`
- `window.__PreferredStoreAPI`
- `window.__PreferredStoreVariantStockCache`

## App Proxy Endpoints and Fallback Strategy

Expected endpoint intents:
- `pickuplocations`
- `getStockLevels`
- `geoip`
- `geocode-zip`

Fallback pattern:
- Prefer configured endpoint in `window.__PreferredStoreConfig`
- Fall back across both forms when available:
  - `/apps/russoAPI/v1/<requestType>`
  - `/apps/russoAPI?RequestType=<requestType>`

## Integration Contracts

Required data attributes:
- `[data-preferred-store-open]`
- `[data-preferred-store-current-label]`
- `[data-preferred-store-dialog]`
- `[data-preferred-store-list]`
- `[data-preferred-store-variant-trigger]`
- `[data-preferred-store-product-label]`

Important custom event:
- `preferred-store-drawer:close`

## Safe Edit Rules

1. Keep shared helper function behavior backward-compatible across entry/main.
2. Do not change global names without updating all Liquid snippets and JS callers.
3. Preserve endpoint fallback behavior for both proxy URL shapes.
4. Keep data-attribute selectors in sync with snippet markup.
5. Keep trigger behavior consistent for delegated vs direct open flows.
6. Validate storefront behavior on:
   - Header trigger
   - Product page trigger/status
   - Product card trigger/status
7. Run Theme Check after meaningful edits.

## Suggested Next Refactor (Phase 2)

1. Move shared helpers into a dedicated asset file (for example `assets/russo-preferred-store-shared.js`) loaded before entry/main.
2. Split main runtime by responsibility:
   - API/data client module
   - stock-state module
   - drawer UI module
3. Keep entry script as a thin orchestrator only.
4. Keep current globals as compatibility adapters during migration.
