document.addEventListener('DOMContentLoaded', function () {
  function ProductActionsFlyout() {
    this.panel = document.getElementById('product-hover-panel');
    this.cards = document.querySelectorAll('.hover-actions-enabled');

    this.activeCard = null;
    this.activeActions = null;
    this.placeholder = null;
    this.hideTimeout = null;

    this.boundPosition = this.position.bind(this);
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

    window.addEventListener(
      'scroll',
      function () {
        if (self.activeCard) {
          self.position();
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'resize',
      function () {
        if (self.activeCard) {
          self.position();
        }
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
      rect.bottom + window.scrollY - 1 + 'px';

    this.panel.style.width =
      rect.width + 'px';
  };

  ProductActionsFlyout.prototype.open = function (card) {
    if (!card || this.activeCard === card) return;

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

    this.panel.style.display = 'none';

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