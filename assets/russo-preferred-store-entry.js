
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

      var base = getBaseUrl();
      if (!base) {
        reject(new Error('Preferred store: cannot determine assets base URL'));
        return;
      }

      var script = document.createElement('script');
      script.src = base + 'russo-preferred-store-main.js';
      script.async = true;
      script.defer = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Preferred store: failed to load main')); };
      document.head.appendChild(script);
    });
  }

  function ensureMainThenOpen() {
    // UX: show the drawer immediately on first click
    openDialogImmediately();

    // Then load the main logic and let it fully init + fetch + sort + render
    loadMain()
      .then(function () {
        if (window.__PreferredStoreAPI && typeof window.__PreferredStoreAPI.open === 'function') {
          window.__PreferredStoreAPI.open();
        }
      })
      .catch(function (e) {
        console.error(e);
      });
  }

  // -----------------------------
  // Run hydration now + later
  // -----------------------------
  updateLabelsFromCookies();
  retryLabelHydration();
  moveTriggerIntoHeader();
  retryHeaderMount();
  updatePickupStatusLine();
  retryPickupHydration();


  document.addEventListener('preferred-store-drawer:close', function () {
  updatePickupStatusLine();
  // ...any other hydration you need
      updatePickupStatusLine();
});
  document.addEventListener('DOMContentLoaded', function () {
    updateLabelsFromCookies();
    retryLabelHydration();
    moveTriggerIntoHeader();
    retryHeaderMount();
    updatePickupStatusLine();
    retryPickupHydration();
  });

  document.addEventListener('shopify:section:load', function () {
    updateLabelsFromCookies();
    retryLabelHydration();
    moveTriggerIntoHeader();
    retryHeaderMount();
    updatePickupStatusLine();
    retryPickupHydration();
  });

  // Import-on-interaction: open drawer + lazy load main
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest && e.target.closest('[data-preferred-store-open]');
    if (!trigger) return;

    e.preventDefault();
    e.stopPropagation();
    ensureMainThenOpen();
  });
})();