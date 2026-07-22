(function () {
  var sidebar       = document.getElementById('sidebar');
  var overlay       = document.getElementById('overlay');
  var toggle        = document.getElementById('navToggle');
  var navEl         = document.getElementById('sidebarNav');
  var navLabel      = document.getElementById('navLabel');
  var mainEl        = document.getElementById('mainContent');
  var contentEl     = document.getElementById('pageContent');
  var searchInput   = document.getElementById('searchInput');
  var searchClear   = document.getElementById('searchClear');
  var searchResults = document.getElementById('searchResults');

  var pages         = [];
  var cache         = {};
  var rawCache      = {};
  var pendingSearch = null;
  var searchTimer;

  marked.use({ gfm: true, breaks: false });

  /* ── Sidebar ────────────────────────────────────────────── */
  function openSidebar()  { sidebar.classList.add('open');    overlay.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

  if (toggle) toggle.addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);

  /* ── Utilities ──────────────────────────────────────────── */
  function extractTitle(md) {
    var m = md.match(/^#\s+(.+)/m);
    return m ? m[1].trim() : null;
  }
  function titleToId(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function escapeRe(s)   { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ── Content rendering ──────────────────────────────────── */
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

  /* ── Scroll to first match in rendered content ──────────── */
  function findAndScrollToMatch(term) {
    if (!term) return;
    var lower  = term.toLowerCase();
    var walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) {
      var idx = node.nodeValue.toLowerCase().indexOf(lower);
      if (idx !== -1) {
        var before = document.createTextNode(node.nodeValue.slice(0, idx));
        var hl     = document.createElement('mark');
        hl.className   = 'search-highlight';
        hl.textContent = node.nodeValue.slice(idx, idx + term.length);
        var after  = document.createTextNode(node.nodeValue.slice(idx + term.length));
        var parent = node.parentNode;
        parent.replaceChild(after, node);
        parent.insertBefore(hl, after);
        parent.insertBefore(before, hl);
        hl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  }

  /* ── Navigation ─────────────────────────────────────────── */
  function navigate(id) {
    var page = pages.find(function (p) { return p.id === id; });
    if (!page && pages.length) page = pages[0];
    if (!page) return;
    navEl.querySelectorAll('a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.page === page.id);
    });
    document.title = page.title + ' — Bhascraft Docs';
    showContent(cache[page.id] || '');
    if (pendingSearch) {
      var term  = pendingSearch;
      pendingSearch = null;
      setTimeout(function () { findAndScrollToMatch(term); }, 60);
    }
  }

  function handleRoute() { navigate(location.hash.slice(1)); }
  window.addEventListener('hashchange', handleRoute);

  /* ── Search ─────────────────────────────────────────────── */
  function getSnippet(text, term) {
    var idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return '';
    var start = Math.max(0, idx - 50);
    var end   = Math.min(text.length, idx + term.length + 60);
    var raw   = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    return raw.replace(new RegExp('(' + escapeRe(term) + ')', 'gi'), '<mark>$1</mark>');
  }

  // Fade a card out, then remove it.
  function exitCard(card) {
    card.classList.add('out');
    setTimeout(function () {
      if (card.parentNode) card.parentNode.removeChild(card);
    }, 160);
  }

  // Single delegated listener — no per-card listeners to update
  searchResults.addEventListener('click', function (e) {
    var card = e.target.closest('.search-result');
    if (!card) return;
    var page = pages.find(function (p) { return p.id === card.dataset.pageId; });
    if (!page) return;
    pendingSearch = card.dataset.searchTerm;
    clearSearch();
    history.pushState(null, '', '#' + page.id);
    navigate(page.id);
    if (window.innerWidth <= 768) closeSidebar();
  });

  // Fade out whatever's showing, then fade in the fresh set of matches.
  function renderResults(matches, term) {
    searchResults.querySelectorAll('.search-result, .search-empty').forEach(exitCard);

    setTimeout(function () {
      if (!matches.length) {
        navLabel.textContent = 'No results';
        var empty = document.createElement('div');
        empty.className   = 'search-empty';
        empty.textContent = 'Nothing matched "' + term + '"';
        searchResults.appendChild(empty);
        return;
      }

      navLabel.textContent = matches.length + (matches.length === 1 ? ' result' : ' results');

      matches.forEach(function (page) {
        var snippet = getSnippet(rawCache[page.id] || '', term);
        var card = document.createElement('div');
        card.className          = 'search-result';
        card.dataset.pageId     = page.id;
        card.dataset.searchTerm = term;
        card.innerHTML =
          '<div class="search-result-title">' + escapeHtml(page.title) + '</div>' +
          (snippet ? '<div class="search-result-snippet">' + snippet + '</div>' : '');
        searchResults.appendChild(card);
      });
    }, 160);
  }

  function doSearch(raw) {
    var term = raw.trim();
    clearTimeout(searchTimer);
    if (!term) { clearSearch(); return; }

    var fresh = !navEl.classList.contains('search-active');
    navEl.classList.add('search-active');

    searchTimer = setTimeout(function () {
      var lower   = term.toLowerCase();
      var matches = pages.filter(function (p) {
        return p.title.toLowerCase().indexOf(lower) !== -1 ||
               (rawCache[p.id] || '').toLowerCase().indexOf(lower) !== -1;
      });
      renderResults(matches, term);
    }, fresh ? 200 : 80);
  }

  function clearSearch() {
    clearTimeout(searchTimer);
    searchInput.value = '';
    navEl.classList.remove('search-active');
    navLabel.textContent = 'Navigation';
    searchResults.querySelectorAll('.search-result, .search-empty').forEach(exitCard);
    setTimeout(function () { searchResults.innerHTML = ''; }, 250);
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () { doSearch(this.value); });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { clearSearch(); this.blur(); }
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', function () { clearSearch(); searchInput.focus(); });
  }

  /* ── Boot ────────────────────────────────────────────────── */
  function boot() {
    pages.forEach(function (page) {
      var a          = document.createElement('a');
      a.href         = '#' + page.id;
      a.dataset.page = page.id;
      a.textContent  = page.title;
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

  /* ── Sequential probe ───────────────────────────────────── */
  function probe(i) {
    fetch('pages/' + i + '.md')
      .then(function (r) {
        if (!r.ok) { boot(); return; }
        return r.text().then(function (md) {
          var title = extractTitle(md) || 'Page ' + i;
          var id    = titleToId(title);
          var html  = marked.parse(md);
          cache[id] = html;
          var tmp   = document.createElement('div');
          tmp.innerHTML = html;
          rawCache[id]  = tmp.textContent;
          pages.push({ file: i + '.md', id: id, title: title });
          probe(i + 1);
        });
      })
      .catch(function () { boot(); });
  }

  probe(1);
})();
