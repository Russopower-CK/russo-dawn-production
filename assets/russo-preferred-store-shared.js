(function () {
  if (window.__PreferredStoreShared) return;

  function normalizeKey(s) {
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
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

    if (p.indexOf('/apps/russoAPI/v1/') !== -1) return toUniqueList([p, legacy]);
    if (p.indexOf('/apps/russoAPI?') !== -1 || p.indexOf('RequestType=') !== -1) return toUniqueList([p, v1]);
    if (p) return toUniqueList([p, v1, legacy]);
    return toUniqueList([v1, legacy]);
  }

  function fetchJsonWithFallback(urls, requestInit, options) {
    var queue = toUniqueList(urls);
    var failures = [];
    var init = requestInit || { headers: { Accept: 'application/json' } };
    var opts = options || {};
    var errorPrefix = opts.errorPrefix || 'Proxy request failed';
    var includeBodySnippet = opts.includeBodySnippet === true;

    function attempt(index) {
      if (index >= queue.length) {
        throw new Error(errorPrefix + ': ' + failures.join(' | '));
      }

      var url = queue[index];
      return fetch(url, init)
        .then(function (res) {
          var contentType = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
          return res.text().then(function (raw) {
            var bodySnippet = String(raw || '').slice(0, 220).replace(/\s+/g, ' ').trim();

            if (!res.ok) {
              if (includeBodySnippet) {
                throw new Error(url + ' -> HTTP ' + res.status + ' [' + contentType + '] ' + bodySnippet);
              }
              throw new Error(url + ' -> HTTP ' + res.status);
            }

            try {
              return { data: raw ? JSON.parse(raw) : null, url: url };
            } catch (parseErr) {
              if (includeBodySnippet) {
                throw new Error(url + ' -> invalid JSON [' + contentType + '] ' + bodySnippet);
              }
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

  window.__PreferredStoreShared = {
    normalizeKey: normalizeKey,
    toUniqueList: toUniqueList,
    buildProxyCandidates: buildProxyCandidates,
    fetchJsonWithFallback: fetchJsonWithFallback,
    parseVariantIdFromGid: parseVariantIdFromGid,
    inventoryLevelNodes: inventoryLevelNodes,
    extractVariantNodes: extractVariantNodes,
    toLocationNameFromStockItem: toLocationNameFromStockItem,
    toAvailableQtyFromStockItem: toAvailableQtyFromStockItem,
    buildStockMaps: buildStockMaps,
    addLocationIdCandidates: addLocationIdCandidates,
    getStockLookupCandidates: getStockLookupCandidates,
    getLiveStockForSelectedStore: getLiveStockForSelectedStore,
    buildInStockSetFromLocations: buildInStockSetFromLocations
  };
})();
