
(function () {
  if (window.__PreferredStoreEntryLoaded) return;
  window.__PreferredStoreEntryLoaded = true;

  // -----------------------------
  // Cookies
  // -----------------------------
  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
  }

  // -----------------------------
  // Label hydration (header triggers)
  // -----------------------------
  function updateLabelsFromCookies() {
    var name = getCookie('preferred_store_location_name');
    if (!name) return;

    var labels = document.querySelectorAll('[data-preferred-store-current-label]');
    if (!labels || !labels.length) return;

    labels.forEach(function (el) {
      el.textContent = name;
    });
  }

  // Header/nav often renders after scripts; retry for ~2s max.
  function retryLabelHydration() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      updateLabelsFromCookies();
      var labels = document.querySelectorAll('[data-preferred-store-current-label]');
      if ((labels && labels.length) || tries >= 20) clearInterval(t);
    }, 100);
  }

  function moveTriggerIntoHeader() {
    var cfg = window.__PreferredStoreConfig || {};
    var targetSelector = String(cfg.headerTargetSelector || '').trim();
    var anchorPlacement = String(cfg.headerAnchorPlacement || 'after').toLowerCase();
    var insertPosition = anchorPlacement === 'before' ? 'beforebegin' : 'afterend';
    if (!targetSelector) return;

    var trigger = document.querySelector('.preferred-store-trigger--side-tab[data-preferred-store-open]');
    if (!trigger) return;

    var target = document.querySelector(targetSelector);
    if (!target) return;

    if (trigger.dataset.preferredStoreMountedTarget === targetSelector) return;

    target.insertAdjacentElement(insertPosition, trigger);
    trigger.classList.remove('preferred-store-trigger--side-tab');
    trigger.classList.add('preferred-store-trigger--header-inline');
    trigger.dataset.preferredStoreMountedTarget = targetSelector;
  }

  function retryHeaderMount() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      moveTriggerIntoHeader();
      if (document.querySelector('.preferred-store-trigger--header-inline') || tries >= 30) {
        clearInterval(t);
      }
    }, 100);
  }

  // -----------------------------
  // Product pickup status
  // Requires window.__PreferredStoreProductContext = { locations: [...] }
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

  function updatePickupStatusLine() {
    // Only runs if the product block exists on page
    var statusEl = document.querySelector('[data-preferred-store-pickup-status]');
    if (!statusEl) return;

    var selectedName = getCookie('preferred_store_location_name');
    if (!selectedName) {
      statusEl.textContent = 'Choose a store to see pickup availability.';
      return;
    }

    var ctx = window.__PreferredStoreProductContext || {};
    var locations = ctx.locations || [];
    var inStockSet = buildInStockSetFromLocations(locations);

    var selectedKey = normalizeKey(selectedName);
    var isInStock = !!inStockSet[selectedKey];
    var PICKUP_ICON_AVAILABLE =
    '<svg class="surface-pick-up-embed__in-stock-icon surface-pick-up-embed__svg-placeholder" width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
    '<path d="M4.33346 10.5625L3.80311 11.0928L4.33344 11.6232L4.86379 11.0928L4.33346 10.5625ZM0.191824 7.48134L3.80311 11.0928L4.8638 10.0322L1.25251 6.4207L0.191824 7.48134ZM4.86379 11.0928L12.9888 2.96783L11.9281 1.90717L3.80313 10.0322L4.86379 11.0928Z"></path>' +
    '</svg>';

    var PICKUP_ICON_UNAVAILABLE =
    '<svg class="surface-pick-up-embed__out-of-stock-icon surface-pick-up-embed__svg-placeholder" width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
    '<path d="M1.46967 2.53033L5.96967 7.03033L7.03033 5.96967L2.53033 1.46967L1.46967 2.53033ZM5.96967 7.03033L10.4697 11.5303L11.5303 10.4697L7.03033 5.96967L5.96967 7.03033ZM7.03033 7.03033L11.5303 2.53033L10.4697 1.46967L5.96967 5.96967L7.03033 7.03033ZM10.4697 1.46967L1.46967 10.4697L2.53033 11.5303L11.5303 2.53033L10.4697 1.46967Z"></path>' +
    '</svg>';

    statusEl.innerHTML = (isInStock
      ? ('Pickup: '+ PICKUP_ICON_AVAILABLE + 'available at <span class="preferred-store-selected-name">' + selectedName + '</span>')
      : ('Pickup: '+PICKUP_ICON_UNAVAILABLE + 'unavailable at <span class="preferred-store-selected-name">' + selectedName + '</span>'));
  }

  // Retry pickup line briefly too (product section may render after initial JS)
  function retryPickupHydration() {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      updatePickupStatusLine();
      if (document.querySelector('[data-preferred-store-pickup-status]') || tries >= 20) clearInterval(t);
    }, 100);
  }

  // -----------------------------
  // Lazy loader helpers
  // -----------------------------
  function getBaseUrl() {
    var s =
      document.currentScript ||
      document.querySelector('script[src*="preferred-store-entry.js"]');
    if (!s || !s.src) return null;
    return s.src.substring(0, s.src.lastIndexOf('/') + 1);
  }

  function openDialogImmediately() {
    var dialog = document.querySelector('[data-preferred-store-dialog]');
    if (!dialog) return;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', 'open');
    }

    var loadingEl = dialog.querySelector('[data-preferred-store-loading]');
    if (loadingEl) loadingEl.textContent = 'Loading stores…';
  }

  function loadMain() {
    return new Promise(function (resolve, reject) {
      // If already loaded:
      if (window.__PreferredStoreAPI && typeof window.__PreferredStoreAPI.open === 'function') {
        resolve();
        return;
      }

      // If already in-flight:
      if (window.__PreferredStoreMainLoading) {
        var check = setInterval(function () {
          if (window.__PreferredStoreAPI && typeof window.__PreferredStoreAPI.open === 'function') {
            clearInterval(check);
            resolve();
          }
        }, 50);
        setTimeout(function () {
          clearInterval(check);
          reject(new Error('Preferred store: main load timeout'));
        }, 8000);
        return;
      }

      window.__PreferredStoreMainLoading = true;

      var cfg = window.__PreferredStoreConfig || {};
      var configuredMainUrl = cfg.mainScriptUrl ? String(cfg.mainScriptUrl).trim() : '';
      var base = getBaseUrl();
      var mainSrc = configuredMainUrl;

      if (!mainSrc) {
        if (!base) {
          reject(new Error('Preferred store: cannot determine assets base URL'));
          return;
        }
        mainSrc = base + 'russo-preferred-store-main.js?v=' + Date.now();
      }

      var script = document.createElement('script');
      script.src = mainSrc;
      script.async = true;
      script.defer = true;
      console.info('Preferred store: loading main script', { src: script.src });
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Preferred store: failed to load main')); };
      document.head.appendChild(script);
    });
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

  function buildStockEndpointCandidates(primary) {
    var p = String(primary || '').trim();
    var v1 = '/apps/russoAPI/v1/getStockLevels';
    var legacy = '/apps/russoAPI?RequestType=getStockLevels';

    if (p.indexOf('/apps/russoAPI/v1/') !== -1) return toUniqueList([p, legacy]);
    if (p.indexOf('/apps/russoAPI?') !== -1 || p.indexOf('RequestType=') !== -1) return toUniqueList([p, v1]);
    if (p) return toUniqueList([p, v1, legacy]);
    return toUniqueList([v1, legacy]);
  }

  function fetchJsonWithFallback(urls, requestInit) {
    var queue = toUniqueList(urls);
    var failures = [];

    function attempt(index) {
      if (index >= queue.length) {
        throw new Error('Batch stock request failed: ' + failures.join(' | '));
      }

      var url = queue[index];
      return fetch(url, requestInit)
        .then(function (res) {
          return res.text().then(function (raw) {
            if (!res.ok) throw new Error(url + ' -> HTTP ' + res.status);
            try {
              return { data: raw ? JSON.parse(raw) : null, url: url };
            } catch (e) {
              throw new Error(url + ' -> invalid JSON');
            }
          });
        })
        .catch(function (err) {
          failures.push(err && err.message ? err.message : (url + ' -> request failed'));
          return attempt(index + 1);
        });
    }

    return attempt(0);
  }

  function collectBatchVariantIds() {
    var triggers = document.querySelectorAll('[data-preferred-store-variant-trigger][data-auto-status-fetch="false"]');
    var ids = [];

    triggers.forEach(function (node) {
      var id = node && node.dataset ? node.dataset.preferredStoreVariantId : null;
      if (!id) return;
      var normalized = String(id).trim();
      if (!/^\d+$/.test(normalized)) return;
      ids.push(normalized);
    });

    return toUniqueList(ids);
  }

  function clearPickupIcon(root) {
    var iconRoot = root.querySelector('.preffered-store-pickup__status-icon');
    if (!iconRoot) return;
    iconRoot.innerHTML = '';
  }

  function setPickupIcon(root, inStock) {
    var iconRoot = root.querySelector('.preffered-store-pickup__status-icon');
    if (!iconRoot) return;

    if (inStock === true) {
      iconRoot.innerHTML =
        '<svg class="surface-pick-up-embed__in-stock-icon" width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
        '<path d="M4.33346 10.5625L3.80311 11.0928L4.33344 11.6232L4.86379 11.0928L4.33346 10.5625ZM0.191824 7.48134L3.80311 11.0928L4.8638 10.0322L1.25251 6.4207L0.191824 7.48134ZM4.86379 11.0928L12.9888 2.96783L11.9281 1.90717L3.80313 10.0322L4.86379 11.0928Z"></path>' +
        '</svg>';
      return;
    }

    if (inStock === false) {
      iconRoot.innerHTML =
        '<svg class="surface-pick-up-embed__out-of-stock-icon" width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
        '<path d="M1.46967 2.53033L5.96967 7.03033L7.03033 5.96967L2.53033 1.46967L1.46967 2.53033ZM5.96967 7.03033L10.4697 11.5303L11.5303 10.4697L7.03033 5.96967L5.96967 7.03033ZM7.03033 7.03033L11.5303 2.53033L10.4697 1.46967L5.96967 5.96967L7.03033 7.03033ZM10.4697 1.46967L1.46967 10.4697L2.53033 11.5303L11.5303 2.53033L10.4697 1.46967Z"></path>' +
        '</svg>';
      return;
    }

    iconRoot.innerHTML = '';
  }

  function setPickupLabel(root, text) {
    var label = root.querySelector('[data-preferred-store-product-label]');
    if (!label) return;
    label.textContent = text;
  }

  function parseVariantIdFromGid(gid) {
    var raw = String(gid || '');
    var match = raw.match(/ProductVariant\/(\d+)/i);
    return match && match[1] ? String(match[1]) : null;
  }

  function inventoryLevelNodes(levels) {
    if (!levels || typeof levels !== 'object') return [];
    if (Array.isArray(levels.nodes)) return levels.nodes;
    if (Array.isArray(levels.edges)) {
      return levels.edges
        .map(function (edge) { return edge && edge.node ? edge.node : null; })
        .filter(Boolean);
    }
    return [];
  }

  function extractVariantNodes(data) {
    if (!data || typeof data !== 'object') return [];
    if (data.data && Array.isArray(data.data.nodes)) return data.data.nodes;
    if (Array.isArray(data.nodes)) return data.nodes;
    if (data.data && data.data.productVariant) return [data.data.productVariant];
    if (data.data && data.data.productVariants && Array.isArray(data.data.productVariants.nodes)) {
      return data.data.productVariants.nodes;
    }
    if (data.data && data.data.productVariants && Array.isArray(data.data.productVariants.edges)) {
      return data.data.productVariants.edges
        .map(function (edge) { return edge && edge.node ? edge.node : null; })
        .filter(Boolean);
    }
    return [];
  }

  function toLocationNameFromStockItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.location && typeof item.location === 'object' && item.location.name) {
      return item.location.name;
    }
    return item.locationName || item.location_name || item.location || item.name || item.storeName || item.store_name || null;
  }

  function toAvailableQtyFromStockItem(item) {
    if (!item || typeof item !== 'object') return null;

    if (Array.isArray(item.quantities)) {
      var availableNode = item.quantities.find(function (q) {
        return q && String(q.name || '').toLowerCase() === 'available';
      });
      if (availableNode && isFinite(Number(availableNode.quantity))) {
        return Number(availableNode.quantity);
      }
    }

    var value =
      item.inventoryAvailable ??
      item.inventory_available ??
      item.available ??
      item.quantityAvailable ??
      item.quantity_available ??
      item.quantity ??
      item.stock;
    var n = Number(value);
    return isFinite(n) ? n : null;
  }

  function buildStockMaps(items) {
    var stockMap = {};
    var qtyMap = {};

    (items || []).forEach(function (item) {
      var locationName = toLocationNameFromStockItem(item);
      if (!locationName) return;

      var qty = toAvailableQtyFromStockItem(item);
      if (qty === null) return;

      var normalizedName = normalizeKey(locationName);
      stockMap[normalizedName] = qty > 0;
      qtyMap[normalizedName] = qty;

      var noRussoPrefixName = normalizeKey(String(locationName || '').replace(/^russo\s+/i, ''));
      if (noRussoPrefixName) {
        stockMap[noRussoPrefixName] = qty > 0;
        qtyMap[noRussoPrefixName] = qty;
      }

      if (item.location && item.location.id) {
        var locationId = String(item.location.id);
        stockMap[locationId] = qty > 0;
        qtyMap[locationId] = qty;

        var idMatch = locationId.match(/gid:\/\/shopify\/Location\/(\d+)/i);
        if (idMatch && idMatch[1]) {
          stockMap[idMatch[1]] = qty > 0;
          qtyMap[idMatch[1]] = qty;
        }
      }
    });

    return { stockMap: stockMap, qtyMap: qtyMap };
  }

  function addLocationIdCandidates(target, locationId) {
    var rawId = String(locationId || '').trim();
    if (!rawId) return;
    if (target.indexOf(rawId) === -1) target.push(rawId);

    if (/^\d+$/.test(rawId)) {
      var gid = 'gid://shopify/Location/' + rawId;
      if (target.indexOf(gid) === -1) target.push(gid);
      return;
    }

    var gidMatch = rawId.match(/gid:\/\/shopify\/Location\/(\d+)/i);
    if (gidMatch && gidMatch[1] && target.indexOf(gidMatch[1]) === -1) {
      target.push(gidMatch[1]);
    }
  }

  function getStockLookupCandidates(selectedName, selectedId) {
    var candidates = [];
    var normalizedName = normalizeKey(selectedName);
    if (normalizedName) candidates.push(normalizedName);

    var noRussoPrefix = normalizeKey(String(selectedName || '').replace(/^russo\s+/i, ''));
    if (noRussoPrefix && candidates.indexOf(noRussoPrefix) === -1) {
      candidates.push(noRussoPrefix);
    }

    addLocationIdCandidates(candidates, selectedId);
    return candidates;
  }

  function getLiveStockForSelectedStore(mapped, selectedName, selectedId) {
    if (!mapped || !mapped.stockMap || !mapped.qtyMap) return null;
    var candidates = getStockLookupCandidates(selectedName, selectedId);

    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      if (Object.prototype.hasOwnProperty.call(mapped.stockMap, candidate)) {
        return {
          inStock: !!mapped.stockMap[candidate],
          qty: mapped.qtyMap[candidate]
        };
      }
    }

    return null;
  }

  function hydrateBatchPickupStatuses() {
    var triggers = document.querySelectorAll('[data-preferred-store-variant-trigger][data-auto-status-fetch="false"]');
    if (!triggers.length) return;

    var selectedName = getCookie('preferred_store_location_name');
    var selectedId = getCookie('preferred_store_location_id');
    var cache = window.__PreferredStoreVariantStockCache || {};

    triggers.forEach(function (root) {
      var defaultLabel = (root.dataset && root.dataset.preferredStoreDefaultLabel)
        ? String(root.dataset.preferredStoreDefaultLabel)
        : 'Choose a Store';
      var variantId = root.dataset ? String(root.dataset.preferredStoreVariantId || '').trim() : '';

      if (!selectedName) {
        setPickupLabel(root, defaultLabel);
        clearPickupIcon(root);
        return;
      }

      if (!variantId || !cache[variantId]) {
        setPickupLabel(root, 'Pickup Availability unknown at ' + selectedName);
        clearPickupIcon(root);
        return;
      }

      var live = getLiveStockForSelectedStore(cache[variantId], selectedName, selectedId);
      if (!live) {
        setPickupLabel(root, 'Pickup Availability unknown at ' + selectedName);
        clearPickupIcon(root);
        return;
      }

      setPickupIcon(root, live.inStock);
      setPickupLabel(root, live.inStock
        ? ('Available at ' + selectedName.replace('Russo ', ''))
        : ('Unavailable at ' + selectedName.replace('Russo ', '')));
    });
  }

  function mergeBatchResponseIntoVariantCache(data) {
    var variantNodes = extractVariantNodes(data);
    if (!variantNodes.length) return;

    var cache = window.__PreferredStoreVariantStockCache || {};

    variantNodes.forEach(function (variantNode) {
      if (!variantNode || typeof variantNode !== 'object') return;

      var variantId = parseVariantIdFromGid(variantNode.id) || String(variantNode.id || '').trim();
      if (!variantId) return;

      var levels = inventoryLevelNodes(
        variantNode.inventoryItem && variantNode.inventoryItem.inventoryLevels
      );

      cache[String(variantId)] = buildStockMaps(levels);
    });

    window.__PreferredStoreVariantStockCache = cache;
  }

  function batchProbeVariantStock() {
    var variantIds = collectBatchVariantIds();
    if (!variantIds.length) return;

    var state = window.__PreferredStoreBatchProbeState || {};
    var signature = variantIds.join(',');

    if (state.inFlight && state.signature === signature) return;
    if (state.lastSuccessSignature === signature) return;

    state.inFlight = true;
    state.signature = signature;
    window.__PreferredStoreBatchProbeState = state;

    var cfg = window.__PreferredStoreConfig || {};
    var endpoints = buildStockEndpointCandidates(cfg.stockLevelsEndpoint || '/apps/russoAPI/v1/getStockLevels');
    var requestInit = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variantIds: variantIds,
        variant_ids: variantIds
      })
    };

    fetchJsonWithFallback(endpoints, requestInit)
      .then(function (result) {
        state.inFlight = false;
        state.lastSuccessSignature = signature;
        window.__PreferredStoreBatchProbeState = state;
        window.__PreferredStoreBatchStockResponse = result.data;
        mergeBatchResponseIntoVariantCache(result.data);
        hydrateBatchPickupStatuses();
        console.info('Preferred store batch probe: success', {
          variantCount: variantIds.length,
          endpoint: result.url
        });
      })
      .catch(function (err) {
        state.inFlight = false;
        window.__PreferredStoreBatchProbeState = state;
        console.error('Preferred store batch probe: failed', err);
      });
  }

  function ensureMainThenOpen(options) {
    // UX: show the drawer immediately on first click
    openDialogImmediately();

    // Then load the main logic and let it fully init + fetch + sort + render
    loadMain()
      .then(function () {
        if (window.__PreferredStoreAPI && typeof window.__PreferredStoreAPI.open === 'function') {
          window.__PreferredStoreAPI.open(options || {});
        }
      })
      .catch(function (e) {
        console.error(e);
      });
  }

  // Public opener so specific PDP buttons can call directly with context.
  window.__PreferredStoreOpen = function (options) {
    if (options && options.variantId) {
      var ctx = window.__PreferredStoreProductContext || {};
      ctx.variantId = String(options.variantId);
      if (Array.isArray(options.locations)) ctx.locations = options.locations;
      window.__PreferredStoreProductContext = ctx;
    }

    console.info('Preferred store: open requested', {
      variantId: options && options.variantId ? String(options.variantId) : null,
      hasEntry: !!window.__PreferredStoreEntryLoaded
    });

    ensureMainThenOpen(options || {});
  };

  // -----------------------------
  // Run hydration now + later
  // -----------------------------
  updateLabelsFromCookies();
  retryLabelHydration();
  moveTriggerIntoHeader();
  retryHeaderMount();
  updatePickupStatusLine();
  retryPickupHydration();
  batchProbeVariantStock();
  hydrateBatchPickupStatuses();


  document.addEventListener('preferred-store-drawer:close', function () {
    updatePickupStatusLine();
    hydrateBatchPickupStatuses();
  });
  document.addEventListener('DOMContentLoaded', function () {
    updateLabelsFromCookies();
    retryLabelHydration();
    moveTriggerIntoHeader();
    retryHeaderMount();
    updatePickupStatusLine();
    retryPickupHydration();
    batchProbeVariantStock();
    hydrateBatchPickupStatuses();
  });

  document.addEventListener('shopify:section:load', function () {
    updateLabelsFromCookies();
    retryLabelHydration();
    moveTriggerIntoHeader();
    retryHeaderMount();
    updatePickupStatusLine();
    retryPickupHydration();
    batchProbeVariantStock();
    hydrateBatchPickupStatuses();
  });

  // Import-on-interaction: open drawer + lazy load main.
  // Use capture phase so section-level click handlers cannot swallow the event
  // before this delegated listener sees it.
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest && e.target.closest('[data-preferred-store-open]');
    if (!trigger) return;

    // PDP direct triggers call window.__PreferredStoreOpen themselves.
    if (trigger.dataset && trigger.dataset.preferredStoreDirect === 'true') return;

    console.info('Preferred store: delegated click trigger detected');

    e.preventDefault();
    e.stopPropagation();
    ensureMainThenOpen({
      source: 'delegated-trigger',
      skipStockLookup: true
    });
  }, true);
})();