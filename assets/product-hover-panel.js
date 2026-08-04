document.addEventListener('DOMContentLoaded', function () {
  function ProductActionsFlyout() {
    this.panel = document.getElementById('product-hover-panel');
    this.cards = document.querySelectorAll('.hover-actions-enabled');

    this.activeCard = null;
    this.activeActions = null;
    this.placeholder = null;
    this.hideTimeout = null;
    this.scrollRafId = null;
    this.followRafId = null;
    this.pointerX = null;
    this.pointerY = null;
  }

  ProductActionsFlyout.prototype.init = function () {
    if (!this.panel || !this.cards.length) return;

    if (this.panel.parentNode !== document.body) {
      document.body.appendChild(this.panel);
    }

    this.bindEvents();
  };

  ProductActionsFlyout.prototype.bindEvents = function () {
    const self = this;

    const scheduleSync = function () {
      if (self.scrollRafId) return;

      self.scrollRafId = window.requestAnimationFrame(function () {
        self.scrollRafId = null;
        self.syncCardUnderPointer();
      });
    };

    document.addEventListener('pointermove', function (e) {
      self.pointerX = e.clientX;
      self.pointerY = e.clientY;

      if (self.activeCard) {
        scheduleSync();
      }
    });

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

    document.addEventListener(
      'scroll',
      function () {
        if (!self.activeCard) return;
        scheduleSync();
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      'scroll',
      function () {
        if (!self.activeCard) return;
        scheduleSync();
      },
      { passive: true }
    );

    window.addEventListener('resize', function () {
      if (self.activeCard) {
        self.position();
      }
    });
  };

  ProductActionsFlyout.prototype.getCardUnderPointer = function () {
    if (this.pointerX === null || this.pointerY === null) return null;

    const hovered = document.elementFromPoint(this.pointerX, this.pointerY);
    if (!hovered) return null;

    return hovered.closest('.hover-actions-enabled');
  };

  ProductActionsFlyout.prototype.position = function () {
    if (!this.activeCard) return;

    const cardBox = this.activeCard.querySelector('.card') || this.activeCard;
    const rect = cardBox.getBoundingClientRect();

    this.panel.style.left = rect.left + window.scrollX + 'px';
    this.panel.style.top = rect.bottom - 1 + window.scrollY + 'px';
    this.panel.style.width = rect.width + 'px';
  };

  ProductActionsFlyout.prototype.startFollowing = function () {
    if (this.followRafId) return;

    const self = this;

    const follow = function () {
      if (!self.activeCard || !document.body.contains(self.activeCard)) {
        self.followRafId = null;
        return;
      }

      self.position();
      self.followRafId = window.requestAnimationFrame(follow);
    };

    this.followRafId = window.requestAnimationFrame(follow);
  };

  ProductActionsFlyout.prototype.stopFollowing = function () {
    if (!this.followRafId) return;

    window.cancelAnimationFrame(this.followRafId);
    this.followRafId = null;
  };

  ProductActionsFlyout.prototype.open = function (card) {
    if (!card || this.activeCard === card) return;

    this.close();

    const actions = card.querySelector('.card__actions');
    if (!actions || !actions.parentNode) return;

    this.activeCard = card;
    this.activeActions = actions;
    this.activeCard.classList.add('is-hover-active');

    this.placeholder = document.createComment('card-actions-placeholder');
    actions.parentNode.insertBefore(this.placeholder, actions);

    this.panel.appendChild(actions);
    this.panel.style.display = 'block';

    this.position();
    this.startFollowing();
  };

  ProductActionsFlyout.prototype.close = function () {
    if (this.activeActions && this.placeholder && this.placeholder.parentNode) {
      this.placeholder.parentNode.insertBefore(this.activeActions, this.placeholder);
      this.placeholder.remove();
    }

    if (this.activeCard) {
      this.activeCard.classList.remove('is-hover-active');
    }

    this.panel.style.display = 'none';
    this.stopFollowing();

    this.activeCard = null;
    this.activeActions = null;
    this.placeholder = null;
  };

  ProductActionsFlyout.prototype.queueHide = function () {
    const self = this;

    this.hideTimeout = setTimeout(function () {
      const hoveredCard = self.getCardUnderPointer();

      if (hoveredCard) {
        self.open(hoveredCard);
        return;
      }

      if (!self.panel.matches(':hover')) {
        self.close();
      }
    }, 40);
  };

  ProductActionsFlyout.prototype.syncCardUnderPointer = function () {
    const hoveredCard = this.getCardUnderPointer();

    if (hoveredCard) {
      clearTimeout(this.hideTimeout);

      if (hoveredCard !== this.activeCard) {
        this.open(hoveredCard);
      } else {
        this.position();
      }
      return;
    }

    if (this.activeCard && !this.panel.matches(':hover')) {
      this.queueHide();
    } else if (this.activeCard) {
      this.position();
    }
  };

  new ProductActionsFlyout().init();
});
