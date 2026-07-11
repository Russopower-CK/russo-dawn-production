(function () {
  var DESKTOP_MEDIA_QUERY = '(min-width: 990px)';
  var MEGA_MENU_CLOSE_DELAY = 220;
  var DROPDOWN_CLOSE_DELAY = 180;

  function getDirectSummary(detailsElement) {
    return detailsElement.querySelector(':scope > summary');
  }

  function setMenuExpanded(menu, summary, expanded) {
    if (expanded) {
      menu.setAttribute('open', '');
    } else {
      menu.removeAttribute('open');
    }

    summary.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function closeAllMegaMenus(excludedMenu) {
    document
      .querySelectorAll('.russo-sidebar-mega-menu')
      .forEach(function (menu) {
        if (menu === excludedMenu) return;

        var summary = getDirectSummary(menu);

        menu.removeAttribute('open');

        if (summary) {
          summary.setAttribute('aria-expanded', 'false');
        }
      });
  }

  function closeAllStandardDropdowns(excludedDropdown) {
    document
      .querySelectorAll('.header-dropdown-menu')
      .forEach(function (dropdown) {
        if (dropdown === excludedDropdown) return;

        var summary = getDirectSummary(dropdown);

        dropdown.removeAttribute('open');

        if (summary) {
          summary.setAttribute('aria-expanded', 'false');
        }
      });
  }

  function initRussoSidebarMegaMenus() {
    var menus = document.querySelectorAll('.russo-sidebar-mega-menu');
    var desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    if (!menus.length) return;

    menus.forEach(function (menu) {
      if (menu.dataset.russoMegaInitialized === 'true') return;

      var summary = getDirectSummary(menu);
      var tabs = menu.querySelectorAll('[data-russo-mega-tab]');
      var panels = menu.querySelectorAll(
        '.russo-sidebar-mega-menu__panel'
      );

      /*
       * Do not mark the menu as initialized until all required
       * elements have been found. This allows a later initialization
       * attempt if Shopify temporarily renders incomplete markup.
       */
      if (!summary || !tabs.length || !panels.length) return;

      menu.dataset.russoMegaInitialized = 'true';

      var closeTimer;

      function openMenu() {
        if (!desktopQuery.matches) return;

        window.clearTimeout(closeTimer);

        closeAllMegaMenus(menu);
        closeAllStandardDropdowns();

        setMenuExpanded(menu, summary, true);
      }

      function closeMenu(immediate) {
        if (!desktopQuery.matches && !immediate) return;

        window.clearTimeout(closeTimer);

        if (immediate) {
          setMenuExpanded(menu, summary, false);
          return;
        }

        closeTimer = window.setTimeout(function () {
          setMenuExpanded(menu, summary, false);
        }, MEGA_MENU_CLOSE_DELAY);
      }

      function getTargetPanel(targetId) {
        var targetPanel = null;

        panels.forEach(function (panel) {
          if (
            targetPanel === null &&
            panel.getAttribute('data-russo-mega-panel') === targetId
          ) {
            targetPanel = panel;
          }
        });

        return targetPanel;
      }

      function activateTab(tab) {
        var targetId = tab.getAttribute('data-russo-mega-tab');

        if (!targetId) return;

        var targetPanel = getTargetPanel(targetId);

        if (!targetPanel) return;

        tabs.forEach(function (item) {
          var isActive = item === tab;

          item.classList.toggle('is-active', isActive);
          item.setAttribute(
            'aria-selected',
            isActive ? 'true' : 'false'
          );
        });

        panels.forEach(function (panel) {
          var isActive = panel === targetPanel;

          panel.classList.toggle('is-active', isActive);
          panel.toggleAttribute('hidden', !isActive);
        });
      }

      function focusAdjacentTab(currentTab, direction) {
        var tabList = Array.prototype.slice.call(tabs);
        var currentIndex = tabList.indexOf(currentTab);

        if (currentIndex === -1) return;

        var nextIndex;

        if (direction === 'first') {
          nextIndex = 0;
        } else if (direction === 'last') {
          nextIndex = tabList.length - 1;
        } else {
          nextIndex =
            (currentIndex + direction + tabList.length) %
            tabList.length;
        }

        var nextTab = tabList[nextIndex];

        if (!nextTab) return;

        nextTab.focus();
        activateTab(nextTab);
      }

      tabs.forEach(function (tab) {
        tab.addEventListener('mouseenter', function () {
          if (!desktopQuery.matches) return;

          openMenu();
          activateTab(tab);
        });

        tab.addEventListener('focus', function () {
          if (!desktopQuery.matches) return;

          openMenu();
          activateTab(tab);
        });

        tab.addEventListener('click', function (event) {
          if (!desktopQuery.matches) return;

          activateTab(tab);

          /*
           * Allow normal navigation when the tab is an anchor with
           * an href. Prevent default behavior only for non-link tabs.
           */
          if (
            tab.tagName.toLowerCase() === 'a' &&
            tab.getAttribute('href')
          ) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
        });

        tab.addEventListener('keydown', function (event) {
          if (!desktopQuery.matches) return;

          switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
              event.preventDefault();
              focusAdjacentTab(tab, 1);
              break;

            case 'ArrowUp':
            case 'ArrowLeft':
              event.preventDefault();
              focusAdjacentTab(tab, -1);
              break;

            case 'Home':
              event.preventDefault();
              focusAdjacentTab(tab, 'first');
              break;

            case 'End':
              event.preventDefault();
              focusAdjacentTab(tab, 'last');
              break;
          }
        });
      });

      /*
       * Keep aria-expanded synchronized with the native open state.
       * This also supports native mobile <details> interaction.
       */
      menu.addEventListener('toggle', function () {
        summary.setAttribute(
          'aria-expanded',
          menu.hasAttribute('open') ? 'true' : 'false'
        );
      });

      menu.addEventListener('mouseenter', openMenu);

      menu.addEventListener('mouseleave', function () {
        closeMenu(false);
      });

      summary.addEventListener('mouseenter', openMenu);
      summary.addEventListener('focus', openMenu);

      summary.addEventListener('click', function (event) {
        /*
         * Allow native <details> behavior below the desktop
         * breakpoint.
         */
        if (!desktopQuery.matches) return;

        event.preventDefault();
        window.clearTimeout(closeTimer);

        if (menu.hasAttribute('open')) {
          setMenuExpanded(menu, summary, false);
        } else {
          openMenu();
        }
      });

      menu.addEventListener('focusout', function (event) {
        if (!menu.contains(event.relatedTarget)) {
          closeMenu(false);
        }
      });

      /*
       * Close a desktop-opened menu when the viewport changes to the
       * mobile breakpoint. This prevents stale open states after
       * resizing the browser.
       */
      desktopQuery.addEventListener('change', function (event) {
        window.clearTimeout(closeTimer);

        if (!event.matches) {
          setMenuExpanded(menu, summary, false);
        }
      });
    });
  }

  function initStandardHeaderDropdowns() {
    var dropdowns = document.querySelectorAll(
      '.header-dropdown-menu'
    );
    var desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    if (!dropdowns.length) return;

    dropdowns.forEach(function (dropdown) {
      if (
        dropdown.dataset.standardDropdownInitialized === 'true'
      ) {
        return;
      }

      var summary = getDirectSummary(dropdown);

      /*
       * Do not mark the dropdown as initialized until its required
       * summary element has been found.
       */
      if (!summary) return;

      dropdown.dataset.standardDropdownInitialized = 'true';

      var closeTimer;

      function openDropdown() {
        if (!desktopQuery.matches) return;

        window.clearTimeout(closeTimer);

        closeAllMegaMenus();
        closeAllStandardDropdowns(dropdown);

        setMenuExpanded(dropdown, summary, true);
      }

      function closeDropdown(immediate) {
        if (!desktopQuery.matches && !immediate) return;

        window.clearTimeout(closeTimer);

        if (immediate) {
          setMenuExpanded(dropdown, summary, false);
          return;
        }

        closeTimer = window.setTimeout(function () {
          setMenuExpanded(dropdown, summary, false);
        }, DROPDOWN_CLOSE_DELAY);
      }

      /*
       * Keep aria-expanded synchronized with the native open state.
       * This also supports native mobile <details> interaction.
       */
      dropdown.addEventListener('toggle', function () {
        summary.setAttribute(
          'aria-expanded',
          dropdown.hasAttribute('open') ? 'true' : 'false'
        );
      });

      dropdown.addEventListener('mouseenter', openDropdown);

      dropdown.addEventListener('mouseleave', function () {
        closeDropdown(false);
      });

      summary.addEventListener('mouseenter', openDropdown);
      summary.addEventListener('focus', openDropdown);

      summary.addEventListener('click', function (event) {
        /*
         * Allow native <details> behavior below the desktop
         * breakpoint.
         */
        if (!desktopQuery.matches) return;

        event.preventDefault();
        window.clearTimeout(closeTimer);

        if (dropdown.hasAttribute('open')) {
          setMenuExpanded(dropdown, summary, false);
        } else {
          openDropdown();
        }
      });

      dropdown.addEventListener('focusout', function (event) {
        if (!dropdown.contains(event.relatedTarget)) {
          closeDropdown(false);
        }
      });

      /*
       * Clear any desktop-opened state when changing to the mobile
       * breakpoint.
       */
      desktopQuery.addEventListener('change', function (event) {
        window.clearTimeout(closeTimer);

        if (!event.matches) {
          setMenuExpanded(dropdown, summary, false);
        }
      });
    });
  }

  function initHeaderMenus() {
    initRussoSidebarMegaMenus();
    initStandardHeaderDropdowns();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initHeaderMenus
    );
  } else {
    initHeaderMenus();
  }

  /*
   * Reinitialize newly rendered elements in the Shopify theme
   * editor. Existing elements are skipped using their data flags.
   */
  document.addEventListener(
    'shopify:section:load',
    initHeaderMenus
  );

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    var activeElement = document.activeElement;
    var focusTarget = null;

    document
      .querySelectorAll(
        '.russo-sidebar-mega-menu, .header-dropdown-menu'
      )
      .forEach(function (menu) {
        if (!menu.hasAttribute('open')) return;

        var summary = getDirectSummary(menu);

        /*
         * Return focus only when keyboard focus is currently inside
         * the menu being closed.
         */
        if (
          !focusTarget &&
          summary &&
          menu.contains(activeElement)
        ) {
          focusTarget = summary;
        }

        menu.removeAttribute('open');

        if (summary) {
          summary.setAttribute('aria-expanded', 'false');
        }
      });

    if (focusTarget) {
      focusTarget.focus();
    }
  });
})();