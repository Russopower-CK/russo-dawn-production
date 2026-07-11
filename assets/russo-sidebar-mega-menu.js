(function () {
  'use strict';

  var DESKTOP_MEDIA_QUERY = '(min-width: 990px)';
  var MEGA_MENU_CLOSE_DELAY = 220;
  var DROPDOWN_CLOSE_DELAY = 180;

  function getDirectSummary(detailsElement) {
    var children = detailsElement.children;
    var index;

    for (index = 0; index < children.length; index += 1) {
      if (children[index].tagName === 'SUMMARY') {
        return children[index];
      }
    }

    return null;
  }

  function setMenuExpanded(menu, summary, expanded) {
    menu.toggleAttribute('open', expanded);
    summary.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function closeMenus(selector, excludedMenu) {
    document.querySelectorAll(selector).forEach(function (menu) {
      var summary;

      if (menu === excludedMenu) return;

      summary = getDirectSummary(menu);
      menu.removeAttribute('open');

      if (summary) {
        summary.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function closeAllMegaMenus(excludedMenu) {
    closeMenus('.russo-sidebar-mega-menu', excludedMenu);
  }

  function closeAllStandardDropdowns(excludedDropdown) {
    closeMenus('.header-dropdown-menu', excludedDropdown);
  }

  function initRussoSidebarMegaMenus() {
    var menus = document.querySelectorAll('.russo-sidebar-mega-menu');
    var desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    menus.forEach(function (menu) {
      var summary;
      var tabs;
      var panels;
      var closeTimer;

      if (menu.dataset.russoMegaInitialized === 'true') return;

      summary = getDirectSummary(menu);
      tabs = menu.querySelectorAll('[data-russo-mega-tab]');
      panels = menu.querySelectorAll('.russo-sidebar-mega-menu__panel');

      if (!summary || !tabs.length || !panels.length) return;

      menu.dataset.russoMegaInitialized = 'true';

      function openMenu() {
        if (!desktopQuery.matches) return;

        window.clearTimeout(closeTimer);
        closeAllMegaMenus(menu);
        closeAllStandardDropdowns();
        setMenuExpanded(menu, summary, true);
      }

      function closeMenu(immediate) {
        window.clearTimeout(closeTimer);

        if (immediate) {
          setMenuExpanded(menu, summary, false);
          return;
        }

        if (!desktopQuery.matches) return;

        closeTimer = window.setTimeout(function () {
          setMenuExpanded(menu, summary, false);
        }, MEGA_MENU_CLOSE_DELAY);
      }

      function findTargetPanel(targetId) {
        var targetPanel = null;

        panels.forEach(function (panel) {
          if (
            !targetPanel &&
            panel.getAttribute('data-russo-mega-panel') === targetId
          ) {
            targetPanel = panel;
          }
        });

        return targetPanel;
      }

      function activateTab(tab) {
        var targetId = tab.getAttribute('data-russo-mega-tab');
        var targetPanel;

        if (!targetId) return;

        targetPanel = findTargetPanel(targetId);
        if (!targetPanel) return;

        tabs.forEach(function (item) {
          var isActive = item === tab;

          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-selected', isActive ? 'true' : 'false');
          item.setAttribute('tabindex', isActive ? '0' : '-1');
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
        var nextIndex;
        var nextTab;

        if (currentIndex === -1) return;

        if (direction === 'first') {
          nextIndex = 0;
        } else if (direction === 'last') {
          nextIndex = tabList.length - 1;
        } else {
          nextIndex =
            (currentIndex + direction + tabList.length) % tabList.length;
        }

        nextTab = tabList[nextIndex];
        if (!nextTab) return;

        activateTab(nextTab);
        nextTab.focus();
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

          if (tab.tagName === 'A' && tab.getAttribute('href')) return;

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

      desktopQuery.addEventListener('change', function (event) {
        window.clearTimeout(closeTimer);

        if (!event.matches) {
          closeMenu(true);
        }
      });

      activateTab(menu.querySelector('[data-russo-mega-tab].is-active') || tabs[0]);
    });
  }

  function initStandardHeaderDropdowns() {
    var dropdowns = document.querySelectorAll('.header-dropdown-menu');
    var desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    dropdowns.forEach(function (dropdown) {
      var summary;
      var closeTimer;

      if (dropdown.dataset.standardDropdownInitialized === 'true') return;

      summary = getDirectSummary(dropdown);
      if (!summary) return;

      dropdown.dataset.standardDropdownInitialized = 'true';

      function openDropdown() {
        if (!desktopQuery.matches) return;

        window.clearTimeout(closeTimer);
        closeAllMegaMenus();
        closeAllStandardDropdowns(dropdown);
        setMenuExpanded(dropdown, summary, true);
      }

      function closeDropdown(immediate) {
        window.clearTimeout(closeTimer);

        if (immediate) {
          setMenuExpanded(dropdown, summary, false);
          return;
        }

        if (!desktopQuery.matches) return;

        closeTimer = window.setTimeout(function () {
          setMenuExpanded(dropdown, summary, false);
        }, DROPDOWN_CLOSE_DELAY);
      }

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

      desktopQuery.addEventListener('change', function (event) {
        window.clearTimeout(closeTimer);

        if (!event.matches) {
          closeDropdown(true);
        }
      });
    });
  }

  function initHeaderMenus() {
    initRussoSidebarMegaMenus();
    initStandardHeaderDropdowns();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderMenus);
  } else {
    initHeaderMenus();
  }

  document.addEventListener('shopify:section:load', initHeaderMenus);

  document.addEventListener('keydown', function (event) {
    var activeElement;
    var focusTarget = null;

    if (event.key !== 'Escape') return;

    activeElement = document.activeElement;

    document
      .querySelectorAll('.russo-sidebar-mega-menu, .header-dropdown-menu')
      .forEach(function (menu) {
        var summary;

        if (!menu.hasAttribute('open')) return;

        summary = getDirectSummary(menu);

        if (!focusTarget && summary && menu.contains(activeElement)) {
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
