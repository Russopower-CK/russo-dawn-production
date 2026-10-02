// assets/russo-store-selector-drawer.js

function sortLocationsByDistance(locations) {
  const userLocation = getCurrentUserLocation();

  if (!userLocation) {
    return locations;
  }

  return locations
    .map((location) => {
      const storeLat = location.address?.latitude;
      const storeLng = location.address?.longitude;

      if (typeof storeLat !== 'number' || typeof storeLng !== 'number') {
        return {
          ...location,
          distanceMi: null,
        };
      }

      return {
        ...location,
        distanceMi: calculateDistanceMiles(userLocation.lat, userLocation.lng, storeLat, storeLng),
      };
    })
    .sort((a, b) => {
      if (a.distanceMi === null) return 1;
      if (b.distanceMi === null) return -1;

      return a.distanceMi - b.distanceMi;
    });
}

function renderPickupLocations(locations) {
  const list = document.querySelector('[data-preferred-store-list]');

  if (!list) return;

  list.innerHTML = '';

  locations.forEach((location) => {
    list.appendChild(createPickupLocationCard(location));
  });
}

function createPickupLocationCard(loc) {
  const card = document.createElement('button');

  card.type = 'button';
  card.className = 'preferred-store-card';
  card.dataset.id = loc.id;
  card.dataset.name = loc.name;

  // Mark the currently selected store
  const preferredStore = getPreferredStore();

  if (preferredStore?.id && String(preferredStore.id) === String(loc.id)) {
    card.classList.add('preferred-store-card--selected');

    const selectedBadge = document.createElement('span');
    selectedBadge.className = 'preferred-store-card__selected-badge';
  }

  // Store name
  const nameNode = document.createElement('div');
  nameNode.className = 'preferred-store-card__name';
  nameNode.textContent = loc.name;
  card.appendChild(nameNode);

  // Address
  const formattedAddress = loc?.address?.formatted;

  if (Array.isArray(formattedAddress) && formattedAddress.length) {
    const addrNode = document.createElement('div');
    addrNode.className = 'preferred-store-card__address';

    const addressLines = formattedAddress.filter(Boolean).filter((line) => line !== 'United States');
    addrNode.textContent = '';

    addressLines.forEach((line, index) => {
      if (index > 0) {
        addrNode.appendChild(document.createElement('br'));
      }

      addrNode.appendChild(document.createTextNode(line));
    });

    card.appendChild(addrNode);
  }

  // Phone
  const phone = loc?.address?.phone;

  if (phone) {
    const phoneNode = document.createElement('div');
    phoneNode.className = 'preferred-store-card__phone';

    const phoneLink = document.createElement('a');
    phoneLink.href = `tel:${phone}`;
    phoneLink.textContent = formatPickupPhone(phone);

    phoneLink.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    phoneNode.appendChild(phoneLink);
    card.appendChild(phoneNode);
  }

  // Distance from current user location
  if (typeof loc.distanceMi === 'number') {
    const distanceNode = document.createElement('div');
    distanceNode.className = 'preferred-store-card__distance';
    distanceNode.textContent = `${loc.distanceMi.toFixed(1)} mi away`;
    card.appendChild(distanceNode);
  }

  // Store hours for the current day
  const todayHours = getTodayStoreHoursText(loc);

  if (todayHours) {
    const hoursNode = document.createElement('div');
    hoursNode.className = 'preferred-store-card__hours';
    hoursNode.textContent = todayHours;
    card.appendChild(hoursNode);
  }

  // Store info
  const landingPageUrl = loc?.landing_page?.value;

  if (landingPageUrl) {
    const detailsNode = document.createElement('div');
    detailsNode.className = 'preferred-store-card__details-link';

    const detailsLink = document.createElement('a');
    detailsLink.href = landingPageUrl;
    detailsLink.textContent = 'Store Info';
    detailsLink.target = '_blank';
    detailsLink.rel = 'noopener noreferrer';

    detailsLink.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    detailsNode.appendChild(detailsLink);
    card.appendChild(detailsNode);
  }

  //stock
  if (preferredStoreDrawerVariantId) {
  const quantity = getPickupQuantity(
    preferredStoreDrawerVariantId,
    loc.id
  );

  if (typeof quantity === 'number') {
    const stockNode = document.createElement('div');

    if (quantity > 0) {
      stockNode.className =
        'preferred-store-card__stock preferred-store-card__stock--yes';

      stockNode.textContent = 'In stock at this store';
    } else {
      stockNode.className =
        'preferred-store-card__stock preferred-store-card__stock--no';

      stockNode.textContent = 'Pickup unavailable';
    }

    card.appendChild(stockNode);
  }
}

  // Select this store
  card.addEventListener('click', async () => {
    await setPreferredStore(loc);

    // Re-render so the selected class/badge immediately moves to this card
    const locations = await loadPickupLocations();
    const sortedLocations = sortLocationsByDistance(locations);
    renderPickupLocations(sortedLocations);

    closePreferredStoreDrawer();
  });

  return card;
}

function formatPickupPhone(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.charAt(0) === '1') {
    return `+1(${cleaned.slice(1, 4)})-${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
  }

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)})-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }

  return phone;
}

function getGoogleHoursValue(loc) {
  const hours = loc?.google_hours;

  if (!hours) return null;

  if (hours.jsonValue) {
    return hours.jsonValue;
  }

  if (typeof hours.value === 'string') {
    try {
      return JSON.parse(hours.value);
    } catch (error) {
      return null;
    }
  }

  return hours;
}

function getTodayStoreHoursText(loc) {
  const googleHours = getGoogleHoursValue(loc);
  const place = googleHours?.place;
  const openingHours = place?.currentOpeningHours || place?.regularOpeningHours || null;
  const weekdayDescriptions = openingHours?.weekdayDescriptions;

  if (!Array.isArray(weekdayDescriptions) || !weekdayDescriptions.length) {
    return null;
  }

  const todayName = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
  });

  return (
    weekdayDescriptions.find(
      (description) => typeof description === 'string' && description.startsWith(`${todayName}:`),
    ) || null
  );
}

async function openPreferredStoreDrawer() {
  const dialog = document.querySelector('[data-preferred-store-dialog]');

  if (!dialog) return;

  const locations = await loadPickupLocations();
  const sortedLocations = sortLocationsByDistance(locations);

  renderPickupLocations(sortedLocations);
  dialog.showModal();
}

async function refreshPickupLocationsByCurrentLocation() {
  const locations = await loadPickupLocations();
  const sortedLocations = sortLocationsByDistance(locations);
  renderPickupLocations(sortedLocations);
}

function setLocationStatus(message) {
  const status = document.querySelector('[data-preferred-store-zip-status]');

  if (status) {
    status.textContent = message;
  }
}

async function searchPickupLocationsByZip() {
  const input = document.querySelector('[data-preferred-store-zip]');
  const zip = input?.value.trim();

  if (!/^\d{5}$/.test(zip || '')) {
    setLocationStatus('Enter a valid 5-digit ZIP code.');
    return;
  }

  try {
    setLocationStatus('Finding stores...');

    const response = await fetch(`/apps/russoAPI/v1/geocode-zip?zip=${encodeURIComponent(zip)}`);

    if (!response.ok) {
      throw new Error(`ZIP lookup failed: ${response.status}`);
    }

    const result = await response.json();

    if (typeof result.lat !== 'number' || typeof result.lng !== 'number') {
      throw new Error('ZIP lookup did not return coordinates');
    }

    setCurrentUserLocation(result.lat, result.lng, 'zip');
    await refreshPickupLocationsByCurrentLocation();
    setLocationStatus(`Showing stores near ${zip}.`);
  } catch (error) {
    console.error('Unable to find stores by ZIP:', error);
    setLocationStatus('Unable to find that ZIP code.');
  }
}

function useCurrentBrowserLocation() {
  if (!navigator.geolocation) {
    setLocationStatus('Location is not available in this browser.');
    return;
  }

  setLocationStatus('Getting your location...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      setCurrentUserLocation(position.coords.latitude, position.coords.longitude, 'browser');

      await refreshPickupLocationsByCurrentLocation();
      setLocationStatus('Showing stores near your current location.');
    },
    (error) => {
      console.error('Unable to get browser location:', error);
      setLocationStatus('Unable to get your current location.');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    },
  );
}

function closePreferredStoreDrawer() {
  const dialog = document.querySelector('[data-preferred-store-dialog]');

  if (!dialog) return;

  dialog.close();
}

// Open drawer
let preferredStoreDrawerVariantId = null;

document.querySelectorAll('[data-preferred-store-open]').forEach((button) => {
  button.addEventListener('click', () => {
    preferredStoreDrawerVariantId =
      button.dataset.preferredStoreVariantId || null;

    openPreferredStoreDrawer();
  });
});

// ZIP search
document.querySelectorAll('[data-preferred-store-zip-btn]').forEach((button) => {
  button.addEventListener('click', searchPickupLocationsByZip);
});

// Allow Enter inside the ZIP field
document.querySelectorAll('[data-preferred-store-zip]').forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchPickupLocationsByZip();
    }
  });
});

// Use precise browser location
document.querySelectorAll('[data-preferred-store-use-geo]').forEach((button) => {
  button.addEventListener('click', useCurrentBrowserLocation);
});

// Close drawer
document.querySelectorAll('[data-preferred-store-close]').forEach((button) => {
  button.addEventListener('click', closePreferredStoreDrawer);
});
