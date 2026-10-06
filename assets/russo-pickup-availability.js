// assets/russo-pickup-availability.js

let pickupInventoryByVariant = {};
let pickupLocationNameByVariant = {};
// Collect every unique variant ID declared by pickup availability snippets on the page.
function getPickupVariantIdsOnPage() {
  const triggers = document.querySelectorAll('[data-preferred-store-variant-trigger][data-preferred-store-variant-id]');

  return [
    ...new Set(
      Array.from(triggers)
        .map((trigger) => trigger.dataset.preferredStoreVariantId)
        .filter(Boolean),
    ),
  ];
}

// Convert a Shopify GID into the numeric/string ID used by the theme.
function getIdFromGid(gid) {
  if (!gid) return null;

  return String(gid).split('/').pop() || null;
}

// Normalize inventory while keeping the original quantity lookup intact.
// pickupInventoryByVariant[variantId][locationId] = quantity
// pickupLocationNameByVariant[variantId][locationId] = location name
function normalizePickupInventory(nodes) {
  const inventory = {};
  const locationNames = {};
  nodes.forEach((variant) => {
    const variantId = getIdFromGid(variant?.id);

    if (!variantId) return;

    inventory[variantId] = {};
    locationNames[variantId] = {};
    const inventoryLevels = variant?.inventoryItem?.inventoryLevels?.nodes || [];

    inventoryLevels.forEach((level) => {
      const locationId = getIdFromGid(level?.location?.id);

      if (!locationId) return;

      const availableQuantity = level?.quantities?.find((quantity) => quantity?.name === 'available')?.quantity;

      inventory[variantId][locationId] = typeof availableQuantity === 'number' ? availableQuantity : null;

      locationNames[variantId][locationId] = level?.location?.name || '';
    });
  });

  pickupLocationNameByVariant = {
    ...pickupLocationNameByVariant,
    ...locationNames,
  };

  return inventory;
}

// Fetch all variant inventory needed by the current page in one request.
async function loadPickupInventory() {
  if (window.isBotAgent()) return;
  const variantIds = getPickupVariantIdsOnPage();

  if (!variantIds.length) {
    pickupInventoryByVariant = {};
    pickupLocationNameByVariant = {};
    return pickupInventoryByVariant;
  }

  try {
    const response = await fetch('/apps/russoAPI/v2/getStockLevels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ variantIds }),
    });

    if (!response.ok) {
      throw new Error(`Pickup inventory request failed: ${response.status}`);
    }

    const result = await response.json();
    const nodes = result?.data?.nodes || [];

    pickupLocationNameByVariant = {};
    pickupInventoryByVariant = normalizePickupInventory(nodes);

    return pickupInventoryByVariant;
  } catch (error) {
    console.error('Unable to load pickup inventory:', error);
    pickupInventoryByVariant = {};
    pickupLocationNameByVariant = {};
    return pickupInventoryByVariant;
  }
}

// Return the available quantity for one variant at one location.
function getPickupQuantity(variantId, locationId) {
  if (!variantId || !locationId) return null;

  const normalizedVariantId = getIdFromGid(variantId);
  const normalizedLocationId = getIdFromGid(locationId);

  return pickupInventoryByVariant?.[normalizedVariantId]?.[normalizedLocationId] ?? null;
}

// Return true/false when inventory is known, or null when it is not loaded/available.
function getPickupStockState(variantId, locationId) {
  const quantity = getPickupQuantity(variantId, locationId);

  if (typeof quantity !== 'number') return null;

  return quantity > 0;
}

// Update every pickup availability snippet on the page for the preferred store.
function renderPickupAvailability() {
  if (window.isBotAgent()) return;
  const preferredStore = getPreferredStore();

  if (!preferredStore?.id || !preferredStore?.name) return;

  document.querySelectorAll('[data-preferred-store-variant-trigger]').forEach((trigger) => {
    const variantId = trigger.dataset.preferredStoreVariantId;
    const quantity = getPickupQuantity(variantId, preferredStore.id);
    const inStock = typeof quantity === 'number' && quantity > 0;
    const inventoryKnown = typeof quantity === 'number';

    const label = trigger.querySelector('[data-preferred-store-product-label]');
    const icon = trigger.querySelector('.preffered-store-pickup__status-icon');
    const specialOrderNote = trigger.querySelector('[data-preferred-store-special-order-note]');
    const specialOrderLabel = trigger.querySelector('[data-preferred-store-special-order-label]');
    const tooltipTitle = trigger.querySelector('[data-preferred-store-special-order-tooltip-title]');
    const tooltipBody = trigger.querySelector('[data-preferred-store-special-order-tooltip-body]');

    // Reset the previous state first.
    if (icon) {
      icon.classList.remove(
        'preffered-store-pickup__status-icon--in-stock',
        'preffered-store-pickup__status-icon--unavailable',
      );
      icon.textContent = '';
    }

    if (specialOrderNote) {
      specialOrderNote.classList.add('preferred-store-special-order-note--hidden');
    }

    if (label) {
      label.hidden = false;
    }
    // No inventory level exists for the preferred store.
    // If this variant is stocked at exactly one other location, show that location.

    if (!inventoryKnown) {
      const normalizedVariantId = getIdFromGid(variantId);
      const variantInventory = pickupInventoryByVariant?.[normalizedVariantId] || {};

      const availableLocationIds = Object.entries(variantInventory)
        .filter(([, locationQuantity]) => typeof locationQuantity === 'number' && locationQuantity > 0)
        .map(([locationId]) => locationId);
      if (availableLocationIds.length === 1) {
        const availableLocationId = availableLocationIds[0];
        const availableLocationName = pickupLocationNameByVariant?.[normalizedVariantId]?.[availableLocationId];

        if (label && availableLocationName) {
          label.textContent = `Only available at ${availableLocationName.replace(/^Russo\s+/i, '')}`;
        }

        return;
      }

      if (label) {
        label.textContent = '';
      }
      return;
    }

    if (inStock) {
      if (label) {
        label.textContent = `Available at ${preferredStore.name.replace(/^Russo\s+/i, '')}`;
      }

      if (icon) {
        icon.classList.add('preffered-store-pickup__status-icon--in-stock');
        icon.textContent = '✓';
      }

      return;
    }

    const unavailableLabel = trigger.dataset.preferredStoreUnavailableLabel || 'Special Order';
    const unavailableTitle = trigger.dataset.preferredStoreUnavailableTooltipTitle || unavailableLabel;
    const unavailableTemplate = trigger.dataset.preferredStoreUnavailableTooltipBody || 'Unavailable at {store}.';
    const unavailableBody = unavailableTemplate.replace(/\{store\}/g, preferredStore.name);

    if (label) {
      label.textContent = '';
      label.hidden = true;
    }

    if (icon) {
      icon.classList.add('preffered-store-pickup__status-icon--unavailable');
      icon.textContent = '✕';
    }

    if (specialOrderLabel) {
      specialOrderLabel.textContent = unavailableLabel;
    }

    if (tooltipTitle) {
      tooltipTitle.textContent = unavailableTitle;
    }

    if (tooltipBody) {
      tooltipBody.textContent = unavailableBody;
    }

    if (specialOrderNote) {
      specialOrderNote.classList.remove('preferred-store-special-order-note--hidden');
    }
  });
}

// Look for variants that were added to the page after the initial inventory request.
// Dynamic sections can call this after they finish rendering.
async function loadMissingPickupInventory() {
  if (window.isBotAgent()) return;
  const variantIds = getPickupVariantIdsOnPage();

  const missingVariantIds = variantIds.filter(
    (variantId) => !Object.prototype.hasOwnProperty.call(pickupInventoryByVariant, getIdFromGid(variantId)),
  );

  if (!missingVariantIds.length) {
    renderPickupAvailability();
    return pickupInventoryByVariant;
  }

  try {
    const response = await fetch('/apps/russoAPI/v2/getStockLevels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ variantIds: missingVariantIds }),
    });

    if (!response.ok) {
      throw new Error(`Pickup inventory request failed: ${response.status}`);
    }

    const result = await response.json();
    const nodes = result?.data?.nodes || [];
    const newInventory = normalizePickupInventory(nodes);

    pickupInventoryByVariant = {
      ...pickupInventoryByVariant,
      ...newInventory,
    };

    renderPickupAvailability();

    return pickupInventoryByVariant;
  } catch (error) {
    console.error('Unable to load missing pickup inventory:', error);
    return pickupInventoryByVariant;
  }
}

// Initial page inventory load.
async function initPickupAvailability() {
  await loadPickupInventory();

  renderPickupAvailability();
}

initPickupAvailability();
