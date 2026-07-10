
  var storeLocationChanged = false; // Starts as false when the page loads

(function () {
  if (window.__preferredStoreMainLoaded) return;
  window.__preferredStoreMainLoaded = true;

  // -----------------------------
  // Config & API Endpoints
  // -----------------------------
  const API_BASE = '/apps/russoAPI/v1';
  function getConfig() {
    var cfg = window.__PreferredStoreConfig || {};
    return {
      // Geo
      locationsEndpoint: cfg.locationsEndpoint || `${API_BASE}/pickuplocations`,
      geoipEndpoint: cfg.geoipEndpoint || `${API_BASE}/geoip`,
      geocodeZipEndpoint: cfg.geocodeZipEndpoint || `${API_BASE}/geocode-zip`,

      // Order Form
      orderFormEndpoint: cfg.orderFormEndpoint || `${API_BASE}/orderform`,
      customerOrderFormMetafieldsEndpoint: cfg.customerOrderFormMetafieldsEndpoint || `${API_BASE}/customerOrderForm`,

      // Utils
      calculateDistanceEndpoint: cfg.calculateDistanceEndpoint || `${API_BASE}/calculate-distance`,
      calculateDistanceMatrixEndpoint: cfg.calculateDistanceMatrixEndpoint || `${API_BASE}/calculate-distance-matrix`,

      enableGeoipSort: cfg.enableGeoipSort !== false
    };
  }

  function toUniqueList(items) {
    var out = [];
    (items || []).forEach(function (item) {
      var value = String(item || '').trim();
      if (!value) return;
      if (out.indexOf(value) === -1) out.push(value);
    });
    return out;
  }

  function buildProxyCandidates(primary, requestType) {
    var p = String(primary || '').trim();
    var legacy = '/apps/russoAPI?RequestType=' + encodeURIComponent(requestType);
    var v1 = '/apps/russoAPI/v1/' + encodeURIComponent(requestType);

    // Try the configured endpoint first, then fallback to the alternate proxy shape.
    if (p.indexOf('/apps/russoAPI/v1/') !== -1) return toUniqueList([p, legacy]);
    if (p.indexOf('/apps/russoAPI?') !== -1 || p.indexOf('RequestType=') !== -1) return toUniqueList([p, v1]);
    if (p) return toUniqueList([p, v1, legacy]);
    return toUniqueList([v1, legacy]);
  }

  function fetchJsonWithFallback(urls) {
    var queue = toUniqueList(urls);
    var failures = [];

    function attempt(index) {
      if (index >= queue.length) {
        throw new Error('Proxy request failed: ' + failures.join(' | '));
      }

      var url = queue[index];
      return fetch(url, { headers: { Accept: 'application/json' } })
        .then(function (res) {
          var contentType = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
          return res.text().then(function (raw) {
            var bodySnippet = String(raw || '').slice(0, 220).replace(/\s+/g, ' ').trim();

            if (!res.ok) {
              throw new Error(url + ' -> HTTP ' + res.status + ' [' + contentType + '] ' + bodySnippet);
            }

            var data;
            try {
              data = raw ? JSON.parse(raw) : null;
            } catch (parseErr) {
              throw new Error(url + ' -> invalid JSON [' + contentType + '] ' + bodySnippet);
            }

            return { data: data, url: url };
          });
        })
        .catch(function (err) {
          failures.push(err && err.message ? err.message : (url + ' -> request failed'));
          return attempt(index + 1);
        });
    }

    return attempt(0);
  }

  // -----------------------------
  // Cookie helpers (persist 1 year)
  // -----------------------------
  var COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

  function setCookie(name, value) {
    document.cookie =
      name + '=' + encodeURIComponent(value) +
      '; path=/; max-age=' + COOKIE_MAX_AGE;
  }

  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
  }

  function getPreferredStore() {
    var id = getCookie('preferred_store_location_id');
    var name = getCookie('preferred_store_location_name');
    if (!id || !name) return null;
    return { id: id, name: name };
  }

  function setPreferredStore(preferred) {
    if (!preferred || !preferred.id || !preferred.name) return;
    setCookie('preferred_store_location_id', preferred.id);
    setCookie('preferred_store_location_name', preferred.name);
  }

  function updateAllTriggerLabels(name) {
    var labels = document.querySelectorAll('[data-preferred-store-current-label]');
    if (!labels || !labels.length) return;

    var finalName = name;
    if (!finalName) {
      var preferred = getPreferredStore();
      finalName = preferred ? preferred.name : null;
    }
    if (!finalName) return;

    labels.forEach(function (el) {
      el.textContent = finalName;
    });
  }

  // -----------------------------
  // Product availability
  // Reads location names from variant metafield
  // -----------------------------
  function normalizeKey(s) {
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  function buildInStockSetFromLocations(locations) {
    var set = {};
    if (!Array.isArray(locations)) return set;

    locations.forEach(function (loc) {
      var trimmed = String(loc || '').trim();
      if (trimmed) {
        set[normalizeKey(trimmed)] = true;
      }
    });

    return set;
  }

  // Build once per page load (product page block sets this)
  var productInStockSet = (function () {
    var ctx = window.__PreferredStoreProductContext || {};
    return buildInStockSetFromLocations(ctx.locations || []);
  })();

  function getStockStateForStore(storeName) {
    // If no product context (non-product page), return null (don’t show stock text)
    if (!productInStockSet) return null;

    // If product has no relevant tags, treat as "unknown" (return null)
    // so we don’t incorrectly show "unavailable" everywhere.
    var keys = Object.keys(productInStockSet);
    if (!keys.length) return null;

    return !!productInStockSet[normalizeKey(storeName)];
  }

  function updatePickupStatusLine() {
    // Optional: update the product-page pickup line if present
    var statusEl = document.querySelector('[data-preferred-store-pickup-status]');
    if (!statusEl) return;

    var selectedName = getCookie('preferred_store_location_name');
    if (!selectedName) {
      statusEl.textContent = 'Choose a store to see pickup availability.';
      return;
    }

    var stock = getStockStateForStore(selectedName);
    if (stock === null) {
      // Unknown / no tags
      statusEl.textContent = 'Pickup availability unknown at ' + selectedName;
      return;
    }

    statusEl.textContent = stock
      ? ('Pickup: available at ' + selectedName)
      : ('Pickup: unavailable at ' + selectedName);
  }

  // -----------------------------
  // Storage
  // -----------------------------
  var STORAGE_KEY = 'preferred_store_locations_v2';
  var ZIP_CACHE_KEY = 'preferred_store_zip_cache_v1';
  var SESSION_ORIGIN_KEY = '__preferred_store_origin_v1';

  function loadLocationsFromStorage() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveLocationsToStorage(locations) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(locations || []));
    } catch (e) {}
  }

  function loadZipCache() {
    try {
      var raw = window.localStorage.getItem(ZIP_CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveZipCache(cacheObj) {
    try {
      window.localStorage.setItem(ZIP_CACHE_KEY, JSON.stringify(cacheObj || {}));
    } catch (e) {}
  }

  // -----------------------------
  // Distance (miles)
  // -----------------------------
  function toRad(deg) { return (deg * Math.PI) / 180; }

  function haversineDistanceMi(lat1, lon1, lat2, lon2) {
    var R = 3958.7613;
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // -----------------------------
  // ZIP
  // -----------------------------
  function normalizeZip(raw) {
    var s = String(raw || '').trim();
    var m = s.match(/^(\d{5})(?:-\d{4})?$/);
    return m ? m[1] : null;
  }

  function geocodeZipToLatLng(zip5) {
    return new Promise(function (resolve, reject) {
      var cache = loadZipCache();
      if (cache[zip5] && isFinite(cache[zip5].lat) && isFinite(cache[zip5].lng)) {
        return resolve(cache[zip5]);
      }

      var cfg = getConfig();
      var endpoints = buildProxyCandidates(cfg.geocodeZipEndpoint, 'geocode-zip').map(function (url) {
        return url + '?zip=' + encodeURIComponent(zip5);
      });

      fetchJsonWithFallback(endpoints)
        .then(function (result) {
          var data = result.data;
          var lat = Number(data && data.lat);
          var lng = Number(data && data.lng);
          if (!isFinite(lat) || !isFinite(lng)) throw new Error('bad zip response');
          var result = { lat: lat, lng: lng };
          cache[zip5] = result;
          saveZipCache(cache);
          resolve(result);
        })
        .catch(reject);
    });
  }

  // -----------------------------
  // Accurate browser geo (button only)
  // (More reliable defaults than high accuracy)
  // -----------------------------
  function getUserPosition() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        function (pos) { resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        reject,
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 30 * 60 * 1000 }
      );
    });
  }

  // -----------------------------
  // Fast GeoIP origin (session cached)
  // -----------------------------
  function getFastSessionOrigin(geoipEndpoint) {
    try {
      var cached = sessionStorage.getItem(SESSION_ORIGIN_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && isFinite(parsed.lat) && isFinite(parsed.lng)) {
          return Promise.resolve(parsed);
        }
      }
    } catch (e) {}

    var endpoints = buildProxyCandidates(geoipEndpoint, 'geoip');
    return fetchJsonWithFallback(endpoints)
      .then(function (result) {
        var data = result.data;
        var lat = Number(data && data.lat);
        var lng = Number(data && data.lng);
        if (!isFinite(lat) || !isFinite(lng)) throw new Error('geoip missing lat/lng');
        var origin = {
          lat: lat,
          lng: lng,
          source: (data && data.source) || 'ip',
          accuracy: (data && data.accuracy) || 'approx'
        };
        try { sessionStorage.setItem(SESSION_ORIGIN_KEY, JSON.stringify(origin)); } catch (e) {}
        return origin;
      });
  }

  // -----------------------------
  // DOM helpers
  // -----------------------------
  function getDrawerEls() {
    var dialog = document.querySelector('[data-preferred-store-dialog]');
    if (!dialog) return null;
    return {
      dialog: dialog,
      overlay: dialog.querySelector('.preferred-store-drawer__overlay'),
      messageEl: dialog.querySelector('[data-preferred-store-message]'),
      listEl: dialog.querySelector('[data-preferred-store-list]'),
      loadingEl: dialog.querySelector('[data-preferred-store-loading]'),
      searchInput: dialog.querySelector('[data-preferred-store-search]'),
      zipInput: dialog.querySelector('[data-preferred-store-zip]'),
      zipBtn: dialog.querySelector('[data-preferred-store-zip-btn]'),
      useGeoBtn: dialog.querySelector('[data-preferred-store-use-geo]'),
      zipStatusEl: dialog.querySelector('[data-preferred-store-zip-status]'),
      closeEls: dialog.querySelectorAll('[data-preferred-store-close]')
    };
  }

  function setStatus(msg, isError) {
    var els = getDrawerEls();
    if (!els || !els.zipStatusEl) return;
    els.zipStatusEl.textContent = msg || '';
    els.zipStatusEl.style.color = isError ? '#b00020' : '';
  }

  function updateMessage(name) {
    var els = getDrawerEls();
    if (!els || !els.messageEl) return;
    els.messageEl.textContent = name
      ? "You're shopping at: " + name
      : 'Choose your store to see local pickup options.';
  }

  function removeLoading() {
    var els = getDrawerEls();
    if (!els || !els.loadingEl) return;
    els.loadingEl.remove();
  }

  // -----------------------------
  // Module state
  // -----------------------------
  var allLocations = [];
  var hasFetchedLocations = false;
  var currentOrigin = null;

  // -----------------------------
  // Rendering
  // -----------------------------
  function formatPhoneDisplay(phone) {
    // Format phone for display: +1(847)-678-9525
    var cleaned = String(phone || '').replace(/\D/g, '');
    
    // US format: +1(XXX)-XXX-XXXX
    if (cleaned.length === 11 && cleaned.charAt(0) === '1') {
      return '+1(' + cleaned.substr(1, 3) + ')-' + cleaned.substr(4, 3) + '-' + cleaned.substr(7, 4);
    }
    
    // 10-digit format: (XXX)-XXX-XXXX
    if (cleaned.length === 10) {
      return '(' + cleaned.substr(0, 3) + ')-' + cleaned.substr(3, 3) + '-' + cleaned.substr(6, 4);
    }
    
    // Return as-is if it doesn't match expected formats
    return phone;
  }

  function createCard(loc) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'preferred-store-card';
    card.dataset.id = loc.id;
    card.dataset.name = loc.name;

    // Add special class if this is the selected store
    var selectedId = getCookie && getCookie('preferred_store_location_id');
    if (selectedId && String(loc.id) === String(selectedId)) {
      card.classList.add('preferred-store-card--selected');
    }

    var nameNode = document.createElement('div');
    nameNode.className = 'preferred-store-card__name';
    nameNode.textContent = loc.name;
    card.appendChild(nameNode);

    var formattedAddress = loc && loc.address && loc.address.formatted;
    if (Array.isArray(formattedAddress) && formattedAddress.length) {
      var addrNode = document.createElement('div');
      addrNode.className = 'preferred-store-card__address';
      addrNode.innerHTML = formattedAddress.filter(Boolean).join('<br>');
      card.appendChild(addrNode);
    }

      var phone = (loc && loc.address && loc.address.phone) || loc.phone || null;

      if (phone) {
        var phoneNode = document.createElement('div');
        phoneNode.className = 'preferred-store-card__phone';

        var phoneLink = document.createElement('a');
        phoneLink.href = 'tel:' + phone;

        // Create SVG element
        var svgNS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "16");
        svg.setAttribute("height", "16");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.style.marginRight = "6px";
        svg.style.verticalAlign = "middle";

        var path = document.createElementNS(svgNS, "path");
        path.setAttribute("fill", "currentColor");
        path.setAttribute("d", "M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.11.37 2.3.57 3.58.57a1 1 0 011 1v3.5a1 1 0 01-1 1C10.07 22 2 13.93 2 3.5a1 1 0 011-1H6.5a1 1 0 011 1c0 1.28.2 2.47.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z");

        svg.appendChild(path);

        // Create text node
        var textNode = document.createTextNode(formatPhoneDisplay(phone));

        // Append SVG + text to link
        phoneLink.appendChild(svg);
        phoneLink.appendChild(textNode);

        phoneLink.addEventListener('click', function (e) {
          e.stopPropagation(); // Prevent card click from firing
        });

        phoneNode.appendChild(phoneLink);
        card.appendChild(phoneNode);
      }

    if (typeof loc.distanceMi === 'number') {
      var distanceNode = document.createElement('div');
      distanceNode.className = 'preferred-store-card__distance';
      distanceNode.textContent = loc.distanceMi.toFixed(1) + ' mi away';
      card.appendChild(distanceNode);
    }

    //Stock line
    var stock = getStockStateForStore(loc.name);
    if (stock === true) {
      var stockYes = document.createElement('div');
      stockYes.className = 'preferred-store-card__stock preferred-store-card__stock--yes';
      stockYes.textContent = 'In stock at this store';
      card.appendChild(stockYes);
    } else if (stock === false) {
      var stockNo = document.createElement('div');
      stockNo.className = 'preferred-store-card__stock preferred-store-card__stock--no';
      stockNo.textContent = 'Pickup unavailable';
      card.appendChild(stockNo);
    }

    // Store Details link
    var landingPageUrl = loc && loc.metafield && loc.metafield.jsonValue;
    if (landingPageUrl) {
      var storeDetailsLink = document.createElement('div');
      storeDetailsLink.className = 'preferred-store-card__details-link';
      var linkEl = document.createElement('a');
      linkEl.href = landingPageUrl;
      linkEl.textContent = 'Store Info';
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      linkEl.addEventListener('click', function (e) {
        e.stopPropagation(); // Prevent card click from firing
      });
      storeDetailsLink.appendChild(linkEl);
      card.appendChild(storeDetailsLink);
    }

    card.addEventListener('click', function () {
      var id = card.dataset.id;
      var name = card.dataset.name;
      if (!id || !name) return;

      setPreferredStore({ id: id, name: name });

      updateAllTriggerLabels(name);
      updateMessage(name);
      updatePickupStatusLine();

      fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          attributes: {
            preferred_store_location_id: id,
            preferred_store_location_name: name
          }
        })
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Cart update failed: ' + res.status);
          return res.json();
        })
        .then(function () {     
            storeLocationChanged = true; 
            
            renderFilteredLocations('');
          // setTimeout(function () { window.location.reload(); }, 150); 
          } )
        .catch(function (err) { console.error('Preferred store: cart update error', err); });

      //closeDrawer();
    });

    return card;
  }

  function renderFilteredLocations(searchTerm, locations) {
    var els = getDrawerEls();
    if (!els || !els.listEl) return;
    var locs = Array.isArray(locations) ? locations : allLocations;
    var term = String(searchTerm || '').toLowerCase().trim();
    els.listEl.innerHTML = '';

    if (!locs.length) {
      var empty = document.createElement('p');
      empty.className = 'preferred-store-list__loading';
      empty.textContent = 'No stores available.';
      els.listEl.appendChild(empty);
      return;
    }

    var filtered = locs.filter(function (loc) {
      if (!loc || !loc.name) return false;
      var haystack = [loc.name];
      if (loc.address && Array.isArray(loc.address.formatted)) haystack = haystack.concat(loc.address.formatted);
      var combined = haystack.filter(Boolean).join(' ').toLowerCase();
      return term ? combined.indexOf(term) !== -1 : true;
    });

    if (!filtered.length) {
      var none = document.createElement('p');
      none.className = 'preferred-store-list__loading';
      none.textContent = 'No stores match your search.';
      els.listEl.appendChild(none);
      return;
    }

    // Pin selected store to top if present
    var selectedId = getCookie('preferred_store_location_id');
    var pinned = null;
    if (selectedId) {
      var idx = filtered.findIndex(function (loc) { return String(loc.id) === String(selectedId); });
      if (idx !== -1) {
        pinned = filtered.splice(idx, 1)[0];
      }
    }

    if (pinned) {
      els.listEl.appendChild(createCard(pinned));
    }
    filtered.forEach(function (loc) {
      els.listEl.appendChild(createCard(loc));
    });
  }

  function recomputeDistancesAndSort(origin, locations) {
    var orig = origin || currentOrigin;
    if (!orig) return;
    var oLat = orig.lat;
    var oLng = orig.lng;

    var locs = Array.isArray(locations) ? locations : allLocations;


    var updated = locs.map(function (loc) {
      var lat = loc && loc.address && typeof loc.address.latitude === 'number' ? loc.address.latitude : null;
      var lng = loc && loc.address && typeof loc.address.longitude === 'number' ? loc.address.longitude : null;

      var copy = Object.assign({}, loc);
      copy.distanceMi = (lat != null && lng != null) ? haversineDistanceMi(oLat, oLng, lat, lng) : null;
      return copy;
    });

    updated.sort(function (a, b) {
      var da = typeof a.distanceMi === 'number' ? a.distanceMi : Number.POSITIVE_INFINITY;
      var db = typeof b.distanceMi === 'number' ? b.distanceMi : Number.POSITIVE_INFINITY;
      return da - db;
    });

    // If called without explicit locations, update allLocations in place
    if (!locations) allLocations = updated;
    return updated;
  }

  function applyOriginAndRender(origin, statusText) {
    currentOrigin = origin;
    recomputeDistancesAndSort();
    var els = getDrawerEls();
    renderFilteredLocations(els && els.searchInput ? els.searchInput.value : '');
    if (statusText) setStatus(statusText, false);
  }

  // -----------------------------
  // Fetch locations
  // -----------------------------
  function extractLocations(data) {
    var nodes = data && data.data && data.data.locations && data.data.locations.nodes;
    return Array.isArray(nodes) ? nodes : [];
  }

  function fetchLocationsIfNeeded() {
    if (hasFetchedLocations) return;
    hasFetchedLocations = true;

    var cfg = getConfig();
    var els = getDrawerEls();
    if (els && els.loadingEl) els.loadingEl.textContent = 'Loading stores…';

    var endpoints = buildProxyCandidates(cfg.locationsEndpoint, 'pickuplocations');

    fetchJsonWithFallback(endpoints)
      .then(function (result) {
        var data = result.data;
        allLocations = extractLocations(data) || [];
        saveLocationsToStorage(allLocations);

        removeLoading();
        renderFilteredLocations('');

        if (!cfg.enableGeoipSort || currentOrigin) {
          setStatus('Tip: Enter a ZIP or click “Use my location” to sort by distance.', false);
          return;
        }

        // Only auto-fetch if geoipEnabled is true (from metafield)
        if (window.__PreferredStoreGeoipEnabled) {
          return getFastSessionOrigin(cfg.geoipEndpoint)
            .then(function (origin) {
              applyOriginAndRender(origin, 'Showing stores near you (approx). Click “Use my location” for precise distance.');
            })
            .catch(function () {
              setStatus('Tip: Enter a ZIP or click “Use my location” to sort by distance.', false);
            });
        } else {
          setStatus('Tip: Enter a ZIP or click “Use my location” to sort by distance.', false);
          return;
        }
      })
      .catch(function (err) {
        console.error('Preferred store: failed to load locations from app proxy', err);
        var els2 = getDrawerEls();
        if (els2 && els2.loadingEl) els2.loadingEl.textContent = 'Failed to load stores.';
        setStatus('Could not load stores from app proxy. Check app proxy endpoint and network.', true);
      });
  }

  // -----------------------------
  // Drawer open/close
  // -----------------------------
  function openDrawer() {
    var els = getDrawerEls();
    if (!els) return;

    fetchLocationsIfNeeded();

    if (typeof els.dialog.showModal === 'function') els.dialog.showModal();
    else els.dialog.setAttribute('open', 'open');

    if (els.searchInput) setTimeout(function () { els.searchInput.focus(); }, 150);
  }

  function closeDrawer() {
    var els = getDrawerEls();
    if (storeLocationChanged) {
      window.location.reload();
    }
    if (!els) return;

    if (typeof els.dialog.close === 'function') els.dialog.close();
    else els.dialog.removeAttribute('open');

    // Dispatch a custom event so other scripts can listen for drawer close
    document.dispatchEvent(new CustomEvent('preferred-store-drawer:close'));
  }

  // -----------------------------
  // Bind drawer controls once
  // -----------------------------
  function bindDrawerInputs() {
    var els = getDrawerEls();
    if (!els) return;

    // Close buttons / overlay
    els.closeEls.forEach(function (el) {
      if (el.__psBound) return;
      el.__psBound = true;
      el.addEventListener('click', function (e) { e.preventDefault(); closeDrawer(); });
    });

    if (els.overlay && !els.overlay.__psBound) {
      els.overlay.__psBound = true;
      els.overlay.addEventListener('click', function (e) { e.preventDefault(); closeDrawer(); });
    }

    // Search
    if (els.searchInput && !els.searchInput.__psBound) {
      els.searchInput.__psBound = true;
      els.searchInput.addEventListener('input', function (e) {
        renderFilteredLocations(e.target.value || '');
      });
    }

          // 1. Find your main dialog element near the top of bindDrawerInputs()
      var dialogEl = document.querySelector('.preferred-store-drawer');
      var panelEl = document.querySelector('.preferred-store-drawer__panel');

      // 2. Add this click listener to detect clicks outside the panel box
      if (dialogEl && panelEl && !dialogEl.__psBackdropBound) {
        dialogEl.__psBackdropBound = true;
        
        dialogEl.addEventListener('click', function (e) {
          // If the click happened on the dialog layout background, but NOT inside the panel content box
          if (!panelEl.contains(e.target)) {
            closeDrawer();
          }
        });
      }

    // ZIP
    function useZipOrigin(rawZip) {
      var zip5 = normalizeZip(rawZip);
      if (!zip5) return setStatus('Please enter a valid ZIP (e.g., 60601).', true);

      setStatus('Finding stores near ' + zip5 + '…', false);
      geocodeZipToLatLng(zip5)
        .then(function (pos) {
          applyOriginAndRender(
            { lat: pos.lat, lng: pos.lng, source: 'zip', label: zip5, accuracy: 'zip-centroid' },
            'Showing stores near ZIP ' + zip5 + '.'
          );
        })
        .catch(function () {
          setStatus('Could not find that ZIP. Try another.', true);
        });
    }

    if (els.zipBtn && !els.zipBtn.__psBound) {
      els.zipBtn.__psBound = true;
      els.zipBtn.addEventListener('click', function () {
        useZipOrigin(els.zipInput ? els.zipInput.value : '');
      });
    }

    if (els.zipInput && !els.zipInput.__psBound) {
      els.zipInput.__psBound = true;
      els.zipInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          useZipOrigin(els.zipInput.value || '');
        }
      });
    }

    // Accurate geo
    if (els.useGeoBtn && !els.useGeoBtn.__psBound) {
      els.useGeoBtn.__psBound = true;
      els.useGeoBtn.addEventListener('click', function () {
        setStatus('Getting your location…', false);
        getUserPosition()
          .then(function (pos) {
            applyOriginAndRender(
              { lat: pos.lat, lng: pos.lng, source: 'geo', accuracy: 'precise' },
              'Showing stores near your location.'
            );
          })
          .catch(function (err) {
            // More useful error messaging
            var msg = 'Could not get your location. Enter a ZIP instead.';
            if (err && err.code === 1) msg = 'Location permission denied. Enter a ZIP instead.';
            if (err && err.code === 2) msg = 'Location unavailable. Enter a ZIP instead.';
            if (err && err.code === 3) msg = 'Location timed out. Enter a ZIP instead.';
            setStatus(msg, true);
          });
      });
    }
  }

  // -----------------------------
  // Init now (lazy-loaded script)
  // -----------------------------
  (function init() {
    bindDrawerInputs();

    // Update labels from cookies immediately
    updateAllTriggerLabels();

    // Update pickup line if present (product page)
    updatePickupStatusLine();

    // If we have stored locations, render instantly
    var els = getDrawerEls();
    if (els) {
      var stored = loadLocationsFromStorage();
      if (stored && stored.length) {
        allLocations = stored;
        removeLoading();
        renderFilteredLocations(els.searchInput ? els.searchInput.value : '');
      }
    }
  })();


  window.__PreferredStoreAPI = window.__PreferredStoreAPI || {};
  window.__PreferredStoreAPI.open = openDrawer;
})();