// assets/russo-store-experience.js

const PICKUP_LOCATIONS_KEY = 'russoPickupLocationsV2';
const PICKUP_LOCATIONS_CACHE_TIME = 60 * 60 * 1000; // 1 hour
const PREFERRED_STORE_KEY = 'russoPreferredStoreV2';
const USER_LOCATION_KEY = 'russoUserLocationV2';
// Fetch/cache pickup locations
async function loadPickupLocations() {
  try {
    let locations;

    const cachedData = localStorage.getItem(PICKUP_LOCATIONS_KEY);

    if (cachedData) {
      const cache = JSON.parse(cachedData);

      if (Date.now() < cache.expiresAt) {
        locations = cache.locations;
      }
    }

    // No valid cache, get fresh locations
    if (!locations) {
      const response = await fetch('/apps/russoAPI/v1/pickuplocations');

      if (!response.ok) {
        throw new Error(`Pickup locations request failed: ${response.status}`);
      }

      const result = await response.json();
      locations = result.data.locations.nodes;

      localStorage.setItem(
        PICKUP_LOCATIONS_KEY,
        JSON.stringify({
          locations,
          expiresAt: Date.now() + PICKUP_LOCATIONS_CACHE_TIME,
        }),
      );
    }

    return locations;
  } catch (error) {
    console.error('Unable to load pickup locations:', error);
    return [];
  }
}

// Save the user's current reference location.
// GeoIP, ZIP search, and browser geolocation all use this same shape.
let currentUserLocation = null;

function setCurrentUserLocation(lat, lng, source = null) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  currentUserLocation = {
    lat,
    lng,
    source,
  };

  localStorage.setItem(USER_LOCATION_KEY, JSON.stringify(currentUserLocation));
  return currentUserLocation;
}

function getCurrentUserLocation() {
  if (currentUserLocation) {
    return currentUserLocation;
  }
  try {
    const stored = localStorage.getItem(USER_LOCATION_KEY);
    if (!stored) return null;

    const location = JSON.parse(stored);

    if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') {
      return null;
    }

    currentUserLocation = location;
    return currentUserLocation;
  } catch (error) {
    console.error('Unable to read user location:', error);
    return null;
  }
}

// Get approximate connection location for initial store selection
async function getGeoIpLocation() {
  try {
    const response = await fetch('/apps/russoAPI/geoip');

    if (!response.ok) {
      throw new Error(`GeoIP request failed: ${response.status}`);
    }

    const geo = await response.json();

    if (typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
      return null;
    }

    return setCurrentUserLocation(geo.lat, geo.lng, 'geoip');
  } catch (error) {
    console.error('Unable to get GeoIP location:', error);
    return null;
  }
}

// Calculate distance between two latitude/longitude points
function calculateDistanceMiles(lat1, lng1, lat2, lng2) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

// Find closest store when none is selected
function findClosestStore(locations, lat, lng) {
  let closestStore = null;
  let closestDistance = Infinity;

  locations.forEach((location) => {
    const storeLat = location.address?.latitude;
    const storeLng = location.address?.longitude;

    if (typeof storeLat !== 'number' || typeof storeLng !== 'number') {
      return;
    }

    const distance = calculateDistanceMiles(lat, lng, storeLat, storeLng);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestStore = location;
    }
  });

  return closestStore;
}

// Update all store selector labels
function updateStoreSelectorLabel(store) {
  if (!store) return;

  document.querySelectorAll('[data-store-selector-label]').forEach((label) => {
    label.textContent = store.name;
  });
}

// Update preferred store attributes on the current Shopify cart
async function updatePreferredStoreCartAttributes(store) {
  try {
    const response = await fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        attributes: {
          preferred_store_location_id: store.id,
          preferred_store_location_name: store.name,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Cart attribute update failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Unable to update preferred store cart attributes:', error);
    return null;
  }
}

// Set the preferred store everywhere client-side
function setPreferredStore(store) {
  if (!store?.id || !store?.name) return;

  const preferredStore = {
    id: store.id,
    name: store.name,
  };

  localStorage.setItem(PREFERRED_STORE_KEY, JSON.stringify(preferredStore));

  updateStoreSelectorLabel(preferredStore);
  updatePreferredStoreCartAttributes(preferredStore);
  // Refresh any pickup availability already loaded on the page
  if (typeof renderPickupAvailability === 'function') {
    renderPickupAvailability();
  }
}

// Get the currently selected preferred store
function getPreferredStore() {
  try {
    const stored = localStorage.getItem(PREFERRED_STORE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Unable to read preferred store:', error);
    return null;
  }
}

// Make sure the current Shopify cart attributes match the preferred store
async function syncPreferredStoreToCart(store) {
  if (!store?.id || !store?.name) return;

  try {
    const response = await fetch('/cart.js', {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Cart request failed: ${response.status}`);
    }

    const cart = await response.json();

    const cartStoreId = cart.attributes?.preferred_store_location_id;
    const cartStoreName = cart.attributes?.preferred_store_location_name;

    if (cartStoreId !== store.id || cartStoreName !== store.name) {
      await updatePreferredStoreCartAttributes(store);
    }
  } catch (error) {
    console.error('Unable to sync preferred store with cart:', error);
  }
}

// Full initialization of store experience
async function initStoreExperience() {
  const locations = await loadPickupLocations();

  if (!locations.length) return; // Restore the user's saved reference location first.
  // If none exists yet, initialize it from GeoIP and save it.

  let userLocation = getCurrentUserLocation();

  if (!userLocation) {
    userLocation = await getGeoIpLocation();
  }

  // Already selected previously
  let preferredStore = getPreferredStore();

  if (preferredStore) {
    updateStoreSelectorLabel(preferredStore); // Cart attributes can disappear when the cart changes/reset,
    // so make sure they still match the locally saved preference.

    await syncPreferredStoreToCart(preferredStore);
    return;
  } // No preferred store yet. Use the current reference location
  // to automatically choose the closest store.

  if (!userLocation) return;
  preferredStore = findClosestStore(locations, userLocation.lat, userLocation.lng);
  if (preferredStore) {
    setPreferredStore(preferredStore);
  }
}

initStoreExperience();
