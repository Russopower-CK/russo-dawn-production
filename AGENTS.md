# Repository AI Notes

## B2B Order Form Section

Primary file: `sections/russo-multi-location-order-form.liquid`

### Purpose
- B2B-only order form section.
- Products come from `section.settings.source_collection`.
- Destination locations come from `customer.company_available_locations`.
- Builds a JSON payload preview for downstream submission.

### Rendering modes
- `location_input_mode = columns`: one quantity input per location column.
- `location_input_mode = dropdown`: one quantity column + location selector + right summary pane.
- `location_input_mode = auto`: switches to dropdown when `company_available_locations_count > location_column_threshold`.

### Totals behavior
- Price E/A shown from `product.selected_or_first_available_variant.price`.
- Optional per-location freight charge can be enabled via section settings using company location metafield path `namespace.key` (default `custom.salt_zone_charge`).
- Freight column is rendered at line level before Total and shows freight amount for that row's displayed scope (selected location in dropdown mode, all locations in columns mode).
- Row total:
  - columns mode: sum of all location qty inputs for that row.
  - dropdown mode: qty for the **currently selected location** only.
- When freight is enabled, row and grand totals include `quantity * (unit price + location freight charge)`.
- Grand total: sum across all saved location allocations.

### Dropdown-mode allocation model
- Quantities per product/location are stored in JS memory (`allocations[productId][locationId]`).
- Switching location:
  - hydrates visible qty inputs from `allocations` for selected location.
  - does not lose prior values for other locations.

### Summary pane behavior
- Shown only in dropdown mode.
- Grouped by location.
- Each group is a collapsible `<details>` card:
  - collapsed: location name, total qty, total amount.
  - optional freight line: shown when freight total for that location is greater than 0.
  - expanded: itemized products with qty.
- Expanded state is preserved across summary re-renders.
- Sticky summary pane is offset from the top by `var(--header-height)` to avoid overlap with the sticky site header.

### Payload behavior
- Payload is rebuilt by `writePayload()` and rendered in `[data-payload-output]`.
- Recompute triggers:
  - qty input changes (`input` event)
  - location dropdown change (`change` event)
  - manual generate/copy actions
- On payload writes, a per-customer/per-section draft is persisted in `localStorage`.
- Draft is restored on page load before totals/summary are recalculated.
- Payload lines now include `unit_price_cents`, `freight_charge_per_quantity_cents`, `freight_charge_per_quantity`, and `line_total_cents`.
- Payload root includes `includes_location_freight_charge`.

### Draft persistence and submit behavior
- Storage key is isolated by store + customer + section (`data-storage-key`).
- Draft stores:
  - dropdown mode: `allocations` map + selected location
  - columns mode: per-input quantity map
  - latest payload snapshot
- Top-right submit button uses reusable snippet `snippets/russo-confirm-modal.liquid` (Dawn `modal-opener` + `modal-dialog`) for confirmation, then posts payload to `fake_submit_endpoint` (default `/apps/russoAPI/v1/submit-order-form`) and, on success, clears local draft state and resets form values.
- Submit status messages are section settings and rendered via `[data-submit-status]`.

### Safe edit rules for this file
- Keep data attributes in sync with JS selectors (`data-order-form-row`, `data-location-select`, `data-location-summary-list`, etc.).
- If changing row/summary math, keep row total and grand total semantics above intact.
- If changing freight logic, maintain the optional toggle behavior: disabled must keep freight at 0 and preserve legacy totals semantics.
- Preserve B2B gating checks (`customer`, `customer.b2b?`, location count checks).
- Re-validate with Theme Check after edits.
- If `sections/russo-multi-location-order-form.liquid` behavior, structure, selectors, settings, or payload logic changes, update this `AGENTS.md` section in the same change.
