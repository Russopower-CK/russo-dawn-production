(function () {
  if (window.__RussoOrderFormButtonsInit) return;
  window.__RussoOrderFormButtonsInit = true;

  var ENDPOINT = '/apps/russoAPI/v1/' + encodeURIComponent('orderform');

  function asBool(value) {
    return String(value || '').toLowerCase() === 'true';
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.style.display = hidden ? 'none' : 'block';
  }

  function setMessage(wrap, text, kind) {
    var msg = wrap.querySelector('.orderform-msg');
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'orderform-msg ' + kind;
    setHidden(msg, false);
  }

  function clearMessage(wrap) {
    var msg = wrap.querySelector('.orderform-msg');
    if (!msg) return;
    msg.textContent = '';
    msg.className = 'orderform-msg';
    setHidden(msg, true);
  }

  function setButtonState(btn, disabled) {
    if (!btn) return;
    btn.disabled = !!disabled;
    if (disabled) {
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.removeAttribute('aria-disabled');
    }
  }

  function applyState(wrap, inOrderForm) {
    var addBtn = wrap.querySelector('.orderform-btn.of-add');
    var removeBtn = wrap.querySelector('.orderform-btn.of-remove');
    var iconBtn = wrap.querySelector('.orderform-icon-btn');
    var addLabel = wrap.getAttribute('data-add-label') || 'Add to Favorites';
    var removeLabel = wrap.getAttribute('data-remove-label') || 'Remove from Favorites';

    setButtonState(addBtn, inOrderForm);
    setButtonState(removeBtn, !inOrderForm);

    if (iconBtn) {
      setButtonState(iconBtn, false);
      iconBtn.classList.toggle('is-active', !!inOrderForm);
      iconBtn.setAttribute('aria-pressed', inOrderForm ? 'true' : 'false');
      iconBtn.setAttribute('aria-label', inOrderForm ? removeLabel : addLabel);
    }

    wrap.setAttribute('data-in-order-form', inOrderForm ? 'true' : 'false');
  }

  function syncAllWrappers(root) {
    var scope = root || document;
    var wraps = scope.querySelectorAll('[data-orderform-buttons]');
    if (!wraps.length) return;

    wraps.forEach(function (wrap) {
      applyState(wrap, asBool(wrap.getAttribute('data-in-order-form')));
      clearMessage(wrap);
    });
  }

  document.addEventListener('click', async function (evt) {
    var btn = evt.target && evt.target.closest
      ? evt.target.closest('.orderform-btn[data-action], .orderform-icon-btn[data-action]')
      : null;
    if (!btn) return;

    var wrap = btn.closest('[data-orderform-buttons]');
    if (!wrap || wrap.getAttribute('data-orderform-busy') === 'true') return;
    if (btn.disabled) return;

    var productId = wrap.getAttribute('data-product-id');
    var actionType = btn.getAttribute('data-action');
    if (!productId || !actionType) return;

    var addBtn = wrap.querySelector('.orderform-btn.of-add');
    var removeBtn = wrap.querySelector('.orderform-btn.of-remove');

    var addLabel = wrap.getAttribute('data-add-label') || 'Add to Favorites';
    var removeLabel = wrap.getAttribute('data-remove-label') || 'Remove from Favorites';
    var processingLabel = wrap.getAttribute('data-processing-label') || 'Processing...';
    var successAddMessage = wrap.getAttribute('data-success-add') || 'Added to order form.';
    var successRemoveMessage = wrap.getAttribute('data-success-remove') || 'Removed from order form.';
    var errorMessage = wrap.getAttribute('data-error-message') || 'Update failed. Please try again.';
    var networkErrorMessage = wrap.getAttribute('data-network-error-message') || 'Network error.';

    var previousInOrderForm = asBool(wrap.getAttribute('data-in-order-form'));
    if (actionType === 'toggle') {
      actionType = previousInOrderForm ? 'remove' : 'add';
    }

    wrap.setAttribute('data-orderform-busy', 'true');
    clearMessage(wrap);
    setButtonState(addBtn, true);
    setButtonState(removeBtn, true);
    var iconBtn = wrap.querySelector('.orderform-icon-btn');
    setButtonState(iconBtn, true);
    if (iconBtn) {
      iconBtn.classList.add('is-busy');
    }

    var originalText = btn.textContent;
    if (btn.classList.contains('orderform-btn')) {
      btn.textContent = processingLabel;
    }

    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: actionType, productId: productId })
      });

      var data = null;
      try {
        data = await res.json();
      } catch (_err) {
        data = null;
      }

      if (!(res.ok && data && (data.success || data.ok))) {
        applyState(wrap, previousInOrderForm);
        setMessage(wrap, errorMessage, 'error');
        return;
      }

      var nextInOrderForm = actionType === 'add';
      applyState(wrap, nextInOrderForm);
      setMessage(wrap, nextInOrderForm ? successAddMessage : successRemoveMessage, 'success');
    } catch (_err) {
      applyState(wrap, previousInOrderForm);
      setMessage(wrap, networkErrorMessage, 'error');
    } finally {
      if (addBtn) addBtn.textContent = addLabel;
      if (removeBtn) removeBtn.textContent = removeLabel;
      if (iconBtn) {
        iconBtn.classList.remove('is-busy');
      }
      if (btn.classList.contains('orderform-btn')) {
        btn.textContent = originalText;
      }
      wrap.setAttribute('data-orderform-busy', 'false');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      syncAllWrappers(document);
    });
  } else {
    syncAllWrappers(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    syncAllWrappers(event && event.target ? event.target : document);
  });
})();
