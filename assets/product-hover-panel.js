document.addEventListener('DOMContentLoaded', function () {
  function ProductActionsFlyout() {
    this.panel = document.getElementById('product-hover-panel');
    this.cards = document.querySelectorAll('.hover-actions-enabled');

    this.activeCard = null;
    this.activeActions = null;
    this.placeholder = null;
    this.hideTimeout = null;
    this.rafId = null;

    this.boundPosition = this.position.bind(this);
  }

  // Batches position() to once per frame so it stays in lockstep with scroll instead of thrashing layout on every scroll event.
  ProductActionsFlyout.prototype.schedulePosition = function () {
    if (this.rafId) return;

    const self = this;

    this.rafId = requestAnimationFrame(function () {
      self.rafId = null;
      if (self.activeCard) self.position();
    });
  };

  ProductActionsFlyout.prototype.init = function () {
    if (!this.cards.length) return;

    if (!this.panel) {
      this.panel = document.createElement('div');
      this.panel.id = 'product-hover-panel';
      document.body.appendChild(this.panel);
    }

    if (this.panel.parentNode !== document.body) {
      document.body.appendChild(this.panel);
    }

    this.bindEvents();
  };

  ProductActionsFlyout.prototype.bindEvents = function () {
    const self = this;

    this.cards.forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        clearTimeout(self.hideTimeout);
        self.open(card);
      });

      card.addEventListener('mouseleave', function () {
        self.queueHide();
      });
    });

    this.panel.addEventListener('mouseenter', function () {
      clearTimeout(self.hideTimeout);
    });

    this.panel.addEventListener('mouseleave', function () {
      self.queueHide();
    });

    document.addEventListener('submit', function (e) {
      if (e.target.matches('form[action*="/cart/add"]')) {
        setTimeout(function () {
          self.close();
        }, 250);
      }
    });

    // capture:true needed because scroll events (e.g. from a horizontal card carousel) don't bubble to window
    document.addEventListener(
      'scroll',
      function () {
        self.schedulePosition();
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      'resize',
      function () {
        self.schedulePosition();
      },
      { passive: true }
    );
  };

  ProductActionsFlyout.prototype.position = function () {
    if (!this.activeCard) return;

    const cardBox =
      this.activeCard.querySelector('.card') ||
      this.activeCard;

    const rect = cardBox.getBoundingClientRect();

    this.panel.style.left =
      rect.left + window.scrollX + 'px';

    this.panel.style.top =
      rect.bottom + window.scrollY + 'px';

    this.panel.style.width =
      rect.width + 'px';
  };

  ProductActionsFlyout.prototype.open = function (card) {
    if (!card) return;

    // Already showing this card's actions, just keep it positioned instead of tearing down and rebuilding.
    if (this.activeCard === card) {
      this.position();
      return;
    }

    this.close();

    const actions =
      card.querySelector('.card__actions');

    if (!actions || !actions.parentNode) return;

    this.activeCard = card;
    this.activeActions = actions;

    card.classList.add('is-hover-active');

    this.placeholder =
      document.createComment(
        'card-actions-placeholder'
      );

    actions.parentNode.insertBefore(
      this.placeholder,
      actions
    );

    this.panel.appendChild(actions);
    this.panel.style.display = 'block';

    this.position();

    this.panel.classList.remove('is-revealing');
    // Force reflow so animation restarts on each card hover.
    void this.panel.offsetWidth;
    this.panel.classList.add('is-revealing');
  };

  ProductActionsFlyout.prototype.close = function () {
    if (
      this.activeActions &&
      this.placeholder &&
      this.placeholder.parentNode
    ) {
      this.placeholder.parentNode.insertBefore(
        this.activeActions,
        this.placeholder
      );

      this.placeholder.remove();
    }

    if (this.activeCard) {
      this.activeCard.classList.remove(
        'is-hover-active'
      );
    }

    this.panel.classList.remove('is-revealing');
    this.panel.style.display = 'none';

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.activeCard = null;
    this.activeActions = null;
    this.placeholder = null;
  };

  ProductActionsFlyout.prototype.queueHide = function () {
    const self = this;

    clearTimeout(this.hideTimeout);

    this.hideTimeout = setTimeout(function () {
      if (!self.panel.matches(':hover')) {
        self.close();
      }
    }, 80);
  };

  new ProductActionsFlyout().init();
});