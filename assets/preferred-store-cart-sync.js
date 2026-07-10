// assets/preferred-store-cart-sync.js

(function () {
  // Require the PreferredStore helper
  if (!window.PreferredStore) return;

  var preferredStore = window.PreferredStore.getPreferredStore();
  if (!preferredStore || !preferredStore.name) {
    // No cookie set; nothing to sync
    return;
  }

  // Step 1: Fetch current cart to inspect attributes
  fetch("/cart.js")
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load cart");
      return res.json();
    })
    .then(function (cart) {
      var currentAttrValue =
        cart.attributes &&
        cart.attributes.preferred_store_location_name;

      if (currentAttrValue === preferredStore.name) {
        // Already in sync; nothing to do
        console.log(
          "Preferred store already synced to cart attribute:",
          currentAttrValue
        );
        return;
      }

      // Step 2: Update cart attribute with the preferred store name
      return fetch("/cart/update.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          attributes: {
            // IMPORTANT: key must match what your Function expects
            preferred_store_location_name: preferredStore.name,
          },
        }),
      });
    })
    .then(function (res) {
      if (!res) return; // nothing changed
      if (!res.ok) {
        console.error("Failed to update cart attributes", res.status);
        return;
      }
      return res.json();
    })
    .then(function (data) {
      if (!data) return;
      console.log(
        "Cart attributes updated with preferred store:",
        data.attributes
      );
    })
    .catch(function (err) {
      console.error("Error syncing preferred store to cart attributes", err);
    });
})();