if (!customElements.get('pickup-availability')) {
  customElements.define(
    'pickup-availability',
    class PickupAvailability extends HTMLElement {
      constructor() {
        super();

        this.displayConfig = this.getDisplayConfig();
        this.onPreviewButtonClick = this.onPreviewButtonClick.bind(this);

        if (!this.hasAttribute('available')) return;

        const template = this.querySelector('template');
        this.errorHtml = template?.content?.firstElementChild?.cloneNode(true) || null;
        this.onClickRefreshList = this.onClickRefreshList.bind(this);

        // Ensure SSR-rendered previews are interactive even before/without a fetch refresh.
        this.bindPreviewButton();
        this.fetchAvailability(this.dataset.variantId);
      }

      getDisplayConfig() {
        return {
          showHeadline: this.dataset.showPickupHeadline !== 'false',
          showTime: this.dataset.showPickupTime !== 'false',
          showButton: this.dataset.showPickupButton !== 'false',
        };
      }

      applyPreviewVisibility(container) {
        const info = container.querySelector('.pickup-availability-info');
        if (!info) return;

        if (!this.displayConfig.showHeadline) {
          info.querySelectorAll('.caption-large').forEach((element) => element.remove());
        }

        if (!this.displayConfig.showTime) {
          info.querySelectorAll('.caption').forEach((element) => element.remove());
        }

        if (!this.displayConfig.showButton) {
          info.querySelectorAll('.pickup-availability-button').forEach((element) => element.remove());
        }

        if (!info.children.length) {
          info.remove();
        }
      }

      fetchAvailability(variantId) {
        if (!variantId) return;

        let rootUrl = this.dataset.rootUrl;
        if (!rootUrl.endsWith('/')) {
          rootUrl = rootUrl + '/';
        }
        const variantSectionUrl = `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;

        fetch(variantSectionUrl)
          .then((response) => response.text())
          .then((text) => {
            const sectionInnerHTML = new DOMParser()
              .parseFromString(text, 'text/html')
              .querySelector('.shopify-section');
            this.renderPreview(sectionInnerHTML);
          })
          .catch((e) => {
            const button = this.querySelector('button');
            if (button) button.removeEventListener('click', this.onClickRefreshList);
            this.renderError();
          });
      }

      onClickRefreshList() {
        this.fetchAvailability(this.dataset.variantId);
      }

      update(variant) {
        if (variant?.available) {
          this.fetchAvailability(variant.id);
        } else {
          this.removeAttribute('available');
          this.innerHTML = '';
        }
      }

      onPreviewButtonClick(evt) {
        const variantId = this.dataset.variantId;
        let drawerElement = document.querySelector(`pickup-availability-drawer[data-variant-id="${variantId}"]`);

        if (!drawerElement) {
          drawerElement = document.querySelector('pickup-availability-drawer');
          if (drawerElement && !drawerElement.getAttribute('data-variant-id')) {
            drawerElement.setAttribute('data-variant-id', variantId);
          }
        }

        if (drawerElement) {
          drawerElement.show(evt.currentTarget || evt.target);
          return;
        }

        // Recover by re-fetching availability when the drawer is missing.
        this.fetchAvailability(variantId);
      }

      bindPreviewButton() {
        const button = this.querySelector('.pickup-availability-button');
        if (!button) return;
        button.removeEventListener('click', this.onPreviewButtonClick);
        button.addEventListener('click', this.onPreviewButtonClick);
      }

      renderError() {
        this.innerHTML = '';
        if (!this.errorHtml) return;
        this.appendChild(this.errorHtml);
        this.applyPreviewVisibility(this);

        const button = this.querySelector('button');
        if (button) {
          button.addEventListener('click', this.onClickRefreshList);
        }
      }

      renderPreview(sectionInnerHTML) {
        const variantId = this.dataset.variantId;
        const existingDrawer = document.querySelector(`pickup-availability-drawer[data-variant-id="${variantId}"]`);
        if (existingDrawer) existingDrawer.remove();
        if (!sectionInnerHTML.querySelector('pickup-availability-preview')) {
          this.innerHTML = '';
          this.removeAttribute('available');
          return;
        }

        this.innerHTML = sectionInnerHTML.querySelector('pickup-availability-preview').outerHTML;
        this.applyPreviewVisibility(this);
        this.setAttribute('available', '');

        const drawer = sectionInnerHTML.querySelector('pickup-availability-drawer');
        if (this.displayConfig.showButton && drawer) {
          drawer.setAttribute('data-variant-id', variantId);
          document.body.appendChild(drawer);
          const colorClassesToApply = this.dataset.productPageColorScheme.split(' ');
          colorClassesToApply.forEach((colorClass) => {
            drawer.classList.add(colorClass);
          });
        }

        this.bindPreviewButton();
      }
    }
  );
}

if (!customElements.get('pickup-availability-drawer')) {
  customElements.define(
    'pickup-availability-drawer',
    class PickupAvailabilityDrawer extends HTMLElement {
      constructor() {
        super();

        this.onBodyClick = this.handleBodyClick.bind(this);

        this.querySelector('button').addEventListener('click', () => {
          this.hide();
        });

        this.addEventListener('keyup', (event) => {
          if (event.code.toUpperCase() === 'ESCAPE') this.hide();
        });
      }

      handleBodyClick(evt) {
        const target = evt.target;
        const clickedPickupTrigger =
          target instanceof Element && target.closest('.pickup-availability-button, #ShowPickupAvailabilityDrawer');
        if (
          target != this &&
          !target.closest('pickup-availability-drawer') &&
          !clickedPickupTrigger
        ) {
          this.hide();
        }
      }

      hide() {
        this.removeAttribute('open');
        document.body.removeEventListener('click', this.onBodyClick);
        document.body.classList.remove('overflow-hidden');
        removeTrapFocus(this.focusElement);
      }

      show(focusElement) {
        this.focusElement = focusElement;
        this.setAttribute('open', '');
        document.body.addEventListener('click', this.onBodyClick);
        document.body.classList.add('overflow-hidden');
        trapFocus(this);
      }
    }
  );
}
