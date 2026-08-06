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
- `location_input_mode = location_rows`: location rows with product quantity columns (transposed matrix view).
- `location_input_mode = auto`: switches to dropdown when `company_available_locations_count > location_column_threshold`.

### Totals behavior
- Price E/A shown from `product.selected_or_first_available_variant.price`.
- `show_pricing` toggle controls money visibility in UI:
  - `true`: show Price E/A, optional Freight, row Total, grand total, and summary dollar amounts.
  - `false`: hide Price E/A, Freight, row Total, grand total, and summary dollar amounts; keep quantity and product breakdown behavior.
- Optional per-location freight charge can be enabled via section settings using company location metafield path `namespace.key` (default `custom.salt_zone_charge`).
- Freight column is rendered only when `enable_location_freight_charge` is enabled; when enabled, it appears at line level before Total and shows freight amount for that row's displayed scope (selected location in dropdown mode, all locations in columns mode).
- Row total:
  - columns mode: sum of all location qty inputs for that row.
  - dropdown mode: qty for the **currently selected location** only.
  - location_rows mode: per-location row total across all product qty inputs in that location row.
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
  - collapsed: location name and total qty; total amount is shown only when `show_pricing` is enabled.
  - optional freight line: shown only when `show_pricing` is enabled and freight total for that location is greater than 0.
  - expanded: itemized products with qty.
- Expanded state is preserved across summary re-renders.
- Sticky summary pane is offset from the top by `var(--header-height)` to avoid overlap with the sticky site header.

### Payload behavior
- Payload is rebuilt by `writePayload()` and rendered in `[data-payload-output]`.
- Recompute triggers:
  - qty input changes (`input` event)
  - location dropdown change (`change` event)
  - metadata input changes (`purchase order`, `requested delivery date`, optional `note`)
  - manual generate/copy actions
- Optional note field behavior:
  - `allow_note = false` hides `[data-order-note]`.
  - JS initialization must not require `[data-order-note]`; payload, totals, summary, and submit behavior must still initialize and function.
- On payload writes, a per-customer/per-section draft is persisted in `localStorage`.
- Draft is restored on page load before totals/summary are recalculated.
- Payload lines now include `unit_price_cents`, `freight_charge_per_quantity_cents`, `freight_charge_per_quantity`, and `line_total_cents`.
- Payload root includes `includes_location_freight_charge`.
- Payload root includes `requested_delivery_date` from the date input field.
- Payload root includes `customer_email` from the logged-in customer context.

### Order metadata fields
- Purchase order text field is always shown.
- Requested delivery date field is always shown (`type=date`) with fixed label text.
- Requested delivery date disclaimer text is configurable via section setting.
- Requested delivery date disclaimer is displayed inline with the field label for alignment.
- Requested delivery date cannot be set to a past date (min date is today; stale past draft values are cleared on restore).
- Disclaimer text is informational only (requested date is not guaranteed).
- Optional note field is controlled by `allow_note`.

### Draft persistence and submit behavior
- Storage key is isolated by store + customer + section (`data-storage-key`).
- Draft stores:
  - dropdown mode: `allocations` map + selected location
  - columns mode: per-input quantity map
  - latest payload snapshot
- Top-right submit button uses reusable snippet `snippets/russo-confirm-modal.liquid` (Dawn `modal-opener` + `modal-dialog`) for confirmation, then posts payload to `fake_submit_endpoint` (default `/apps/russoAPI/v1/submit-order-form`) and, on success, clears local draft state and resets form values.
- Submit confirmation action labels are static (`Confirm submit`, `Cancel`).
- Submit status messages are section settings and rendered via `[data-submit-status]`.

### Developer tools labels
- Developer tools labels are static:
  - `Generate payload`
  - `Copy payload`
  - `Payload preview (JSON)`

### Safe edit rules for this file
- Keep data attributes in sync with JS selectors (`data-order-form-row`, `data-location-select`, `data-location-summary-list`, etc.).
- If changing row/summary math, keep row total and grand total semantics above intact.
- If changing freight logic, maintain the optional toggle behavior: disabled must keep freight at 0 and preserve legacy totals semantics.
- Preserve B2B gating checks (`customer`, `customer.b2b?`, location count checks).
- Re-validate with Theme Check after edits.
- If `sections/russo-multi-location-order-form.liquid` behavior, structure, selectors, settings, or payload logic changes, update this `AGENTS.md` section in the same change.
