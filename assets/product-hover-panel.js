document.addEventListener('DOMContentLoaded', function () {
  const panel = document.getElementById('product-hover-panel');

  if (!panel) return;

  let activeCard = null;
  let activeActions = null;
  let placeholder = null;
  let hideTimeout = null;

  function positionPanel() {
    if (!activeCard) return;

    const rect = activeCard.getBoundingClientRect();

    panel.style.left = rect.left + 'px';
    panel.style.top = rect.bottom - 1 + 'px';
    panel.style.width = rect.width + 'px';
  }

  function hidePanel() {
    if (activeActions && placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(activeActions, placeholder);
      placeholder.remove();
    }

    if (activeCard) {
      activeCard.classList.remove('is-hover-active');
    }

    panel.style.display = 'none';

    activeCard = null;
    activeActions = null;
    placeholder = null;
  }

  document.querySelectorAll('.hover-actions-enabled').forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      clearTimeout(hideTimeout);

      if (activeCard === card) return;

      hidePanel();

      const actions = card.querySelector('.card__actions');

      if (!actions) return;

      activeCard = card;
      activeActions = actions;

      card.classList.add('is-hover-active');

      placeholder = document.createComment('card-actions-placeholder');
      actions.parentNode.insertBefore(placeholder, actions);

      panel.appendChild(actions);

      panel.style.display = 'block';

      positionPanel();
    });

    card.addEventListener('mouseleave', function () {
      hideTimeout = setTimeout(function () {
        if (!panel.matches(':hover')) {
          hidePanel();
        }
      }, 150);
    });
  });

  panel.addEventListener('mouseenter', function () {
    clearTimeout(hideTimeout);
  });

  panel.addEventListener('mouseleave', function () {
    hidePanel();
  });

  document.addEventListener('submit', function (e) {
    if (e.target.matches('form[action*="/cart/add"]')) {
      setTimeout(function () {
        hidePanel();
      }, 250);
    }
  });

  window.addEventListener(
    'scroll',
    function () {
      if (activeCard) {
        hidePanel();
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', function () {
    if (activeCard) {
      positionPanel();
    }
  });
});
