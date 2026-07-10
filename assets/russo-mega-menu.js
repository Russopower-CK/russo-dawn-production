(function () {
  function initrussoSidebarMegaMenus() {
    var menus = document.querySelectorAll('.russo-sidebar-mega-menu');
    var desktopQuery = window.matchMedia('(min-width: 990px)');

    if (!menus.length) return;

    menus.forEach(function (menu) {
      if (menu.dataset.russoMegaInitialized === 'true') return;
      menu.dataset.russoMegaInitialized = 'true';

      var summary = menu.querySelector('summary');
      var tabs = menu.querySelectorAll('[data-russo-mega-tab]');
      var panels = menu.querySelectorAll('.russo-sidebar-mega-menu__panel');

      if (!summary || !tabs.length || !panels.length) return;

      var closeTimer;

      function closeOtherMegaMenus(currentMenu) {
        menus.forEach(function (otherMenu) {
          if (otherMenu === currentMenu) return;

          var otherSummary = otherMenu.querySelector('summary');

          otherMenu.removeAttribute('open');

          if (otherSummary) {
            otherSummary.setAttribute('aria-expanded', 'false');
          }
        });
      }

      function closeStandardDropdowns() {
        document.querySelectorAll('.header-dropdown-menu').forEach(function (dropdown) {
          var dropdownSummary = dropdown.querySelector('summary');

          dropdown.removeAttribute('open');

          if (dropdownSummary) {
            dropdownSummary.setAttribute('aria-expanded', 'false');
          }
        });
      }

      function openMenu() {
        if (!desktopQuery.matches) return;

        window.clearTimeout(closeTimer);

        closeOtherMegaMenus(menu);
        closeStandardDropdowns();

        menu.setAttribute('open', '');
        summary.setAttribute('aria-expanded', 'true');
      }

      function closeMenu() {
        if (!desktopQuery.matches) return;

        closeTimer = window.setTimeout(function () {
          menu.removeAttribute('open');
          summary.setAttribute('aria-expanded', 'false');
        }, 220);
      }

      function activateTab(tab) {
        var targetId = tab.getAttribute('data-russo-mega-tab');

        if (!targetId) return;

        var targetPanel = menu.querySelector('[data-russo-mega-panel="' + targetId + '"]');

        if (!targetPanel) return;

        tabs.forEach(function (item) {
          item.classList.remove('is-active');
          item.setAttribute('aria-selected', 'false');
        });

        panels.forEach(function (panel) {
          panel.classList.remove('is-active');
          panel.setAttribute('hidden', 'hidden');
        });

        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        targetPanel.classList.add('is-active');
        targetPanel.removeAttribute('hidden');
      }

      tabs.forEach(function (tab) {
        tab.addEventListener('mouseenter', function () {
          if (!desktopQuery.matches) return;

          openMenu();
          activateTab(tab);
        });

        tab.addEventListener('mouseover', function () {
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
            If the tab is an anchor link, allow normal navigation.
            If the tab is still a button, prevent default.
          */
          if (tab.tagName.toLowerCase() === 'a' && tab.getAttribute('href')) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
        });
      });

      menu.addEventListener('mouseenter', openMenu);
      menu.addEventListener('mouseleave', closeMenu);

      summary.addEventListener('mouseenter', openMenu);
      summary.addEventListener('focus', openMenu);

      summary.addEventListener('click', function (event) {
        if (!desktopQuery.matches) return;

        event.preventDefault();

        if (menu.hasAttribute('open')) {
          menu.removeAttribute('open');
          summary.setAttribute('aria-expanded', 'false');
        } else {
          openMenu();
        }
      });

      menu.addEventListener('focusout', function (event) {
        if (!menu.contains(event.relatedTarget)) {
          closeMenu();
        }
      });
    });
  }

  function initStandardHeaderDropdowns() {
    var dropdowns = document.querySelectorAll('.header-dropdown-menu');
    var desktopQuery = window.matchMedia('(min-width: 990px)');

    if (!dropdowns.length) return;

    dropdowns.forEach(function (dropdown) {
      if (dropdown.dataset.standardDropdownInitialized === 'true') return;
      dropdown.dataset.standardDropdownInitialized = 'true';

      var summary = dropdown.querySelector('summary');

      if (!summary) return;

      var closeTimer;

      function closeMegaMenus() {
        document.querySelectorAll('.russo-sidebar-mega-menu').forEach(function (menu) {
          var menuSummary = menu.querySelector('summary');

          menu.removeAttribute('open');

          if (menuSummary) {
            menuSummary.setAttribute('aria-expanded', 'false');
          }
        });
      }

      function closeOtherDropdowns(currentDropdown) {
        dropdowns.forEach(function (otherDropdown) {
          if (otherDropdown === currentDropdown) return;

          var otherSummary = otherDropdown.querySelector('summary');

          otherDropdown.removeAttribute('open');

          if (otherSummary) {
            otherSummary.setAttribute('aria-expanded', 'false');
          }
        });
      }

      function openDropdown() {
        if (!desktopQuery.matches) return;

        window.clearTimeout(closeTimer);

        closeMegaMenus();
        closeOtherDropdowns(dropdown);

        dropdown.setAttribute('open', '');
        summary.setAttribute('aria-expanded', 'true');
      }

      function closeDropdown() {
        if (!desktopQuery.matches) return;

        closeTimer = window.setTimeout(function () {
          dropdown.removeAttribute('open');
          summary.setAttribute('aria-expanded', 'false');
        }, 180);
      }

      dropdown.addEventListener('mouseenter', openDropdown);
      dropdown.addEventListener('mouseleave', closeDropdown);

      summary.addEventListener('mouseenter', openDropdown);
      summary.addEventListener('focus', openDropdown);

      summary.addEventListener('click', function (event) {
        if (!desktopQuery.matches) return;

        event.preventDefault();

        if (dropdown.hasAttribute('open')) {
          dropdown.removeAttribute('open');
          summary.setAttribute('aria-expanded', 'false');
        } else {
          openDropdown();
        }
      });

      dropdown.addEventListener('focusout', function (event) {
        if (!dropdown.contains(event.relatedTarget)) {
          closeDropdown();
        }
      });
    });
  }

  function initHeaderMenus() {
    initrussoSidebarMegaMenus();
    initStandardHeaderDropdowns();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderMenus);
  } else {
    initHeaderMenus();
  }

  document.addEventListener('shopify:section:load', initHeaderMenus);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    document.querySelectorAll('.russo-sidebar-mega-menu, .header-dropdown-menu').forEach(function (menu) {
      var summary = menu.querySelector('summary');

      menu.removeAttribute('open');

      if (summary) {
        summary.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();