(function () {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('overlay');
  const toggle    = document.getElementById('navToggle');
  const mainEl    = document.getElementById('mainContent');

  const PAGE_TITLES = {
    home:      'Home — Bhascraft Docs',
    survival:  'Survival — Bhascraft Docs',
    creative:  'Creative — Bhascraft Docs',
    skyblock:  'Skyblock — Bhascraft Docs',
    pvp:       'PVP — Bhascraft Docs',
    commands:  'Commands — Bhascraft Docs',
    technical: 'Technical Info — Bhascraft Docs',
  };

  /* ── Mobile sidebar ──────────────────────────────────── */
  function openSidebar()  { sidebar.classList.add('open');    overlay.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

  toggle?.addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);

  /* ── Page routing ────────────────────────────────────── */
  function navigate(pageId) {
    if (!PAGE_TITLES[pageId]) pageId = 'home';

    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.remove('active', 'page-in');
    });
    document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
      a.classList.remove('active');
    });

    var page = document.querySelector('.page[data-page="' + pageId + '"]');
    if (page) {
      page.classList.add('active');
      // Double rAF so display:block paints before the animation class is added
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          page.classList.add('page-in');
        });
      });
      mainEl.scrollTop = 0;
    }

    var link = document.querySelector('.sidebar-nav a[data-page="' + pageId + '"]');
    if (link) link.classList.add('active');

    document.title = PAGE_TITLES[pageId];
  }

  function handleRoute() {
    navigate(location.hash.slice(1) || 'home');
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  /* ── Gamemode card links also navigate ───────────────── */
  document.querySelectorAll('.gm-card[data-page]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.preventDefault();
      var target = card.getAttribute('data-page');
      history.pushState(null, '', '#' + target);
      navigate(target);
    });
  });

  /* ── Close mobile sidebar on nav link click ──────────── */
  document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  /* ── Remove first-load class after all nav animations ── */
  if (document.documentElement.classList.contains('first-load')) {
    var navLinks = document.querySelectorAll('.sidebar-nav a');
    var done = 0;
    navLinks.forEach(function (a) {
      a.addEventListener('animationend', function () {
        done++;
        if (done === navLinks.length) {
          document.documentElement.classList.remove('first-load');
        }
      }, { once: true });
    });
  }
})();
