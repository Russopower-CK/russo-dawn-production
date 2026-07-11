(function () {
  'use strict';

  var DESKTOP_MEDIA_QUERY = '(min-width: 990px)';
  var MEGA_MENU_CLOSE_DELAY = 220;
  var DROPDOWN_CLOSE_DELAY = 180;
  var DESKTOP_NAV_OPEN_CLASS = 'russo-desktop-nav-open';
  var DESKTOP_TOGGLE_ATTRIBUTE = 'data-russo-desktop-nav-toggle';
  var DESKTOP_STYLE_ID = 'RussoDesktopStickyNavigationStyles';

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
          if (!targetPanel && panel.getAttribute('data-russo-mega-panel') === targetId) {
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
          nextIndex = (currentIndex + direction + tabList.length) % tabList.length;
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
        summary.setAttribute('aria-expanded', menu.hasAttribute('open') ? 'true' : 'false');
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
        summary.setAttribute('aria-expanded', dropdown.hasAttribute('open') ? 'true' : 'false');
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

  function addDesktopStickyNavigationStyles() {
    var style;

    if (document.getElementById(DESKTOP_STYLE_ID)) return;

    style = document.createElement('style');
    style.id = DESKTOP_STYLE_ID;
    style.textContent = [
      '[data-russo-desktop-nav-toggle] { display: none; }',
      '@media screen and (min-width: 990px) {',
      '  .scrolled-past-header [data-russo-desktop-nav-toggle] {',
      '    appearance: none;',
      '    display: inline-flex;',
      '    align-items: center;',
      '    justify-content: center;',
      '    flex: 0 0 auto;',
      '    width: 4.4rem;',
      '    height: 4.4rem;',
      '    margin: 0 1.2rem 0 0;',
      '    padding: 0;',
      '    color: rgb(var(--color-foreground));',
      '    background: transparent;',
      '    border: 0;',
      '    cursor: pointer;',
      '  }',
      '  .scrolled-past-header [data-russo-desktop-nav-toggle] svg {',
      '    display: block;',
      '    width: 2.6rem;',
      '    height: 2.6rem;',
      '  }',
      '  .scrolled-past-header header-drawer { display: none !important; }',
      '  .scrolled-past-header:not(.russo-desktop-nav-open) .header__menu_wrapper,',
      '  .scrolled-past-header:not(.russo-desktop-nav-open) .header_secondary_wraper {',
      '    display: none !important;',
      '  }',
      '  .scrolled-past-header.russo-desktop-nav-open .header__menu_wrapper,',
      '  .scrolled-past-header.russo-desktop-nav-open .header_secondary_wraper {',
      '    display: block !important;',
      '  }',
      '  .scrolled-past-header:not(.russo-desktop-nav-open) .header__heading-logo-wrapper {',
      '    width: 75%;',
      '  }',
      '  .header__heading-logo-wrapper { transition: width 200ms ease; }',
      '}',
      '@media screen and (max-width: 989px) {',
      '  [data-russo-desktop-nav-toggle] { display: none !important; }',
      '}'
    ].join('\n');

    document.head.appendChild(style);
  }

  function createDesktopNavigationToggle() {
    var button = document.createElement('button');

    button.type = 'button';
    button.setAttribute(DESKTOP_TOGGLE_ATTRIBUTE, '');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open desktop navigation');
    button.innerHTML = [
      '<svg class="russo-desktop-nav-toggle__hamburger" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '  <path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      '</svg>',
      '<svg class="russo-desktop-nav-toggle__close" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" hidden>',
      '  <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      '</svg>'
    ].join('');

    return button;
  }

  function initDesktopStickyNavigation(root) {
    var scope = root || document;
    var sectionHeaders = scope.matches && scope.matches('.section-header')
      ? [scope]
      : scope.querySelectorAll('.section-header');

    addDesktopStickyNavigationStyles();

    Array.prototype.forEach.call(sectionHeaders, function (sectionHeader) {
      var headerLeft;
      var desktopNavigation;
      var secondaryNavigation;
      var button;
      var hamburgerIcon;
      var closeIcon;
      var desktopQuery;
      var observer;

      if (sectionHeader.dataset.russoDesktopNavigationInitialized === 'true') return;

      headerLeft = sectionHeader.querySelector('.header-left');
      desktopNavigation = sectionHeader.querySelector('.header__menu_wrapper');
      secondaryNavigation = sectionHeader.querySelector('.header_secondary_wraper');

      if (!headerLeft || !desktopNavigation) return;

      sectionHeader.dataset.russoDesktopNavigationInitialized = 'true';
      button = createDesktopNavigationToggle();
      hamburgerIcon = button.querySelector('.russo-desktop-nav-toggle__hamburger');
      closeIcon = button.querySelector('.russo-desktop-nav-toggle__close');
      desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

      if (!desktopNavigation.id) {
        desktopNavigation.id = 'RussoDesktopHeaderNavigation';
      }

      button.setAttribute('aria-controls', desktopNavigation.id);
      headerLeft.insertBefore(button, headerLeft.firstChild);

      function setExpanded(expanded, restoreFocus) {
        sectionHeader.classList.toggle(DESKTOP_NAV_OPEN_CLASS, expanded);
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        button.setAttribute('aria-label', expanded ? 'Close desktop navigation' : 'Open desktop navigation');
        hamburgerIcon.hidden = expanded;
        closeIcon.hidden = !expanded;

        if (!expanded) {
          closeAllMegaMenus();
          closeAllStandardDropdowns();
        }

        if (restoreFocus) {
          button.focus();
        }
      }

      button.addEventListener('click', function () {
        setExpanded(!sectionHeader.classList.contains(DESKTOP_NAV_OPEN_CLASS), false);
      });

      sectionHeader.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (!sectionHeader.classList.contains(DESKTOP_NAV_OPEN_CLASS)) return;

        setExpanded(false, true);
      });

      desktopQuery.addEventListener('change', function (event) {
        if (!event.matches) {
          setExpanded(false, false);
        }
      });

      observer = new MutationObserver(function () {
        if (!sectionHeader.classList.contains('scrolled-past-header')) {
          setExpanded(false, false);
        }
      });

      observer.observe(sectionHeader, {
        attributes: true,
        attributeFilter: ['class']
      });

      if (secondaryNavigation) {
        secondaryNavigation.setAttribute('data-russo-secondary-navigation', '');
      }
    });
  }

  function initHeaderMenus(root) {
    initRussoSidebarMegaMenus();
    initStandardHeaderDropdowns();
    initDesktopStickyNavigation(root || document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initHeaderMenus(document);
    });
  } else {
    initHeaderMenus(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    initHeaderMenus(event.target);
  });

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
