(function () {
  var sidebar   = document.getElementById('sidebar');
  var overlay   = document.getElementById('overlay');
  var toggle    = document.getElementById('navToggle');
  var navEl     = document.getElementById('sidebarNav');
  var mainEl    = document.getElementById('mainContent');
  var contentEl = document.getElementById('pageContent');

  var pages = [];  // [{file, id, title}]
  var cache = {};  // id → rendered html

  /* ── marked.js config ────────────────────────────────── */
  marked.use({ gfm: true, breaks: false });

  /* ── Mobile sidebar ──────────────────────────────────── */
  function openSidebar()  { sidebar.classList.add('open');    overlay.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

  if (toggle) toggle.addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);

  /* ── Helpers ─────────────────────────────────────────── */
  function extractTitle(md) {
    var m = md.match(/^#\s+(.+)/m);
    return m ? m[1].trim() : null;
  }

  function titleToId(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /* ── Show content ────────────────────────────────────── */
  function showContent(html) {
    contentEl.classList.remove('page-in');
    contentEl.innerHTML = html;

    contentEl.querySelectorAll('a[href^="http"]').forEach(function (a) {
      if (!a.target) a.target = '_blank';
      if (!a.rel)    a.rel    = 'noopener';
    });

    contentEl.querySelectorAll('table').forEach(function (t) {
      if (!t.closest('.table-wrap')) {
        var wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        t.parentNode.insertBefore(wrap, t);
        wrap.appendChild(t);
      }
    });

    mainEl.scrollTop = 0;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { contentEl.classList.add('page-in'); });
    });
  }

  /* ── Navigate ────────────────────────────────────────── */
  function navigate(id) {
    var page = pages.find(function (p) { return p.id === id; });
    if (!page && pages.length) page = pages[0];
    if (!page) return;

    navEl.querySelectorAll('a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.page === page.id);
    });
    document.title = page.title + ' — Bhascraft Docs';
    showContent(cache[page.id] || '');
  }

  function handleRoute() { navigate(location.hash.slice(1)); }
  window.addEventListener('hashchange', handleRoute);

  /* ── Build nav after all pages are discovered ─────────── */
  function boot() {
    pages.forEach(function (page) {
      var a = document.createElement('a');
      a.href = '#' + page.id;
      a.dataset.page = page.id;
      a.textContent = page.title;
      a.addEventListener('click', function () {
        if (window.innerWidth <= 768) closeSidebar();
      });
      navEl.appendChild(a);
    });

    if (document.documentElement.classList.contains('first-load')) {
      var links = navEl.querySelectorAll('a');
      var done  = 0;
      links.forEach(function (a) {
        a.addEventListener('animationend', function () {
          if (++done === links.length) {
            document.documentElement.classList.remove('first-load');
          }
        }, { once: true });
      });
    }

    handleRoute();
  }

  /* ── Sequential probe ────────────────────────────────── */
  // Fetches pages/1.md, pages/2.md, ... stopping at the first 404.
  // Title and route ID come from the # heading inside each file.
  // Content is cached during discovery so all navigation is instant.
  function probe(i) {
    fetch('pages/' + i + '.md')
      .then(function (r) {
        if (!r.ok) { boot(); return; }
        return r.text().then(function (md) {
          var title = extractTitle(md) || 'Page ' + i;
          var id    = titleToId(title);
          cache[id] = marked.parse(md);
          pages.push({ file: i + '.md', id: id, title: title });
          probe(i + 1);
        });
      })
      .catch(function () { boot(); });
  }

  probe(1);

})();
