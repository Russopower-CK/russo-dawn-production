# Repository AI Notes

## B2B Order Form Section

Primary file: `sections/russo-multi-location-order-form.liquid`

### Purpose
- B2B-only order form section.
- Products come from resolved `source_collection`:
  - uses `section.settings.form_configuration_entry.form_collection` when selected and non-blank.
  - otherwise falls back to `section.settings.source_collection`.
- Destination locations come from `customer.company_available_locations`.
- Builds a JSON payload preview for downstream submission.
- Section heading comes from resolved `resolved_heading`:
  - uses `section.settings.form_configuration_entry.form_title` when selected and non-blank.
  - otherwise falls back to `section.settings.heading`.
- Section description comes from resolved `resolved_description`:
  - uses `section.settings.form_configuration_entry.form_description` when selected and non-blank.
  - otherwise falls back to `section.settings.description`.
- Supports selecting a `multi_location_order_form` metaobject entry via `section.settings.form_configuration_entry`.
- In Theme Editor, `heading` fallback is hidden when `form_configuration_entry` is selected using `visible_if`.
- In this schema context, `visible_if` is not accepted for the current `description` (`textarea`) and `source_collection` (`collection`) settings.

### Company access restriction
- Optional restriction toggle: `section.settings.restricted_order_form`.
- When enabled and a form configuration entry is selected, the current company must include that entry in `company.metafields.custom.allowed_order_forms`.
- If the selected entry is not in the company's allowed list, the form is not rendered and `section.settings.restricted_order_form_message` is shown.
- Restriction now runs fail-closed when enabled and checks company from: `customer.current_company`, fallback `customer.company`, fallback `customer.current_location.company`.
- Allowed-form matching supports metaobject `id`, `handle`, and `form_id` field value to handle different reference payload shapes.

### Rendering modes
- `location_input_mode = columns`: one quantity input per location column.
- `location_input_mode = dropdown`: one quantity column + location selector + right summary pane.
- `location_input_mode = location_rows`: location rows with product quantity columns (transposed matrix view).
- `location_input_mode = auto`: switches to dropdown when `company_available_locations_count > location_column_threshold`.
- On small screens, `location_rows` uses a stacked card layout per location row (header + labeled product quantity rows) to avoid horizontal-only visibility of early columns.

### Totals behavior
- Price E/A shown from each row/column variant price (`variant.price`).
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
- Payload lines include variant mapping fields: `variant_id`, `sku`, `line_key`, and `line_title`.
- Payload root includes `includes_location_freight_charge`.
- Payload root includes `requested_delivery_date` from the date input field.
- Payload root includes `customer_email` from the logged-in customer context.
- Payload root includes `company_id` when a current company context exists.
- Payload root includes `form_id` from the selected `form_configuration_entry.form_id` value.
- Payload root includes `form_metaobject_id` from the selected `form_configuration_entry.id` (Metaobject GID).
- Payload root includes `form_metaobject_handle` from the selected `form_configuration_entry.handle` as a fallback reference when GID is unavailable in storefront runtime.
- Submission payload shape is controlled by `section.settings.payload_submission_format`:
  - `legacy`: original single payload object with root `lines` array.
  - `orders_by_location`: payload root is `{ OrdersToMake: [...] }`, with one object per location and nested `Lines` array.
  - in `orders_by_location`, `customer_id`, `form_id`, and form metaobject reference fields are at payload root (not per-order).

### Quantity input controls
- Quantity inputs are rendered through reusable snippet `snippets/russo-order-qty-input.liquid` across all input modes.
- Control includes styled decrement/increment buttons (`data-qty-action`) and numeric input.
- Button clicks dispatch an `input` event on the underlying quantity field so existing totals, summary, draft persistence, and payload rebuild logic run unchanged.
- Quantity control data attributes now carry variant identity (`data-variant-id`, `data-variant-sku`) and line identity (`data-line-key`, `data-line-title`).

### Variant row model
- Non-location-rows modes render one row per variant (not one row per product).
- `location_rows` mode renders one quantity column per variant across each company location row.

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
