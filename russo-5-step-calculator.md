# Russo 5-Step Fertilizer Calculator

Source snippet: snippets/russo-5-step-calculator.liquid

## Purpose
- Provides a 5-round fertilizer program calculator.
- Product dropdown options come from a passed collection handle.
- Price display uses `snippets/price.liquid` for listing-consistent output.
- Calculates per-round and annual totals using selected product data.

## Render Usage
Pass a collection handle when rendering the snippet:

```liquid
{% render 'russo-5-step-calculator', collection_handle: 'fertilizer-program' %}
```

- `collection_handle` is required for product options.
- If the handle is missing/invalid or collection has no products, the snippet shows a warning message.

## Core Formulas
- LBS Nitrogen per 1,000 sq ft = ((50 / bag_coverage) * nitrogen_percent) * 10
- Bags Needed = (43560 / bag_coverage) * acres
- Cost per Acre = price_per_bag * bags_needed

Constants used in JS:
- SQ_FT_PER_ACRE = 43560
- BAG_WEIGHT_LBS = 50
- NITROGEN_MULTIPLIER = 10

## File Structure
- Markup: calculator heading, acres input, 5 round rows (no Description column), annual totals row.
- Hidden price template container: pre-renders one `price` snippet per collection product.
- JavaScript:
  - `roundData`: per-round coverage defaults.
  - `updateProduct(round)`: updates product name, coverage, nitrogen defaults, and rendered price block.
  - `calculateRow(round)`: computes row output values.
  - `calculateTotals()`: sums annual totals across all rounds.
  - `calculateAll()`: recalculates all rows.
- CSS: desktop table layout, tablet horizontal scroll, mobile card layout.

## Safe Edit Rules
- Keep element IDs and JS selectors synchronized.
  - Example pattern: `product-select-<round>`, `nitrogen-<round>`, `cost-<round>`.
- If changing formulas, update both:
  - the comment block in the snippet header
  - this markdown formula section
- If changing round count (currently 1-5), update all loops in JS and the table markup.
- If changing output formatting, keep totals parsable in `calculateTotals()`.
- Keep mobile `td::before { content: attr(data-label) }` behavior in mind.
  - Add `data-label` attributes to cells if card labels are required in mobile view.

## Product Data Maintenance
When adding or editing products:
1. Add/remove products in the source Shopify collection.
2. For coverage and nitrogen auto-fill, use metafields:
  - `fertilizer.bag_coverage_sq_ft` (variant decimal)
  - `fertilizer.nitrogen` (variant decimal)
3. If metafields are missing, coverage falls back to round defaults and nitrogen remains user-editable.
4. Confirm coverage is non-zero to avoid divide-by-zero results.

## Manual QA Checklist
1. Load page and confirm all 5 product dropdowns are populated.
2. Select a product in each round and verify:
  - Product name updates and links to the product page
   - Coverage updates
   - Nitrogen input auto-fills
  - Price column renders using `price.liquid`
3. Change acres and verify all rows and annual totals recalculate.
4. Change nitrogen in a row and verify row + annual totals update.
5. Test mobile width (<768px) and confirm card layout readability.
6. Confirm totals display formats:
   - Nitrogen: 2 decimals
   - Bags: 2 decimals
   - Cost: currency with `$` and 2 decimals

## Known Risk Areas
- Parsing costs from rendered text in `calculateTotals()` is string-dependent.
- `price.liquid` currently renders based on `selected_or_first_available_variant` for each product template.
- Product title link uses `product.url`; verify URL behavior in preview/live context.
- Missing `data-label` attributes reduce clarity in mobile card mode.
- Inline JS/CSS in Liquid can be harder to diff than split assets.

## Suggested Future Improvements
- Move JS and CSS to theme assets for cleaner versioning.
- Add runtime guard for invalid coverage values.
- Add a simple reset button for all rounds.
- Add optional localization for currency/number formatting.
