(function () {
  var root = document.documentElement;

  /* ── Hex → "R, G, B" for building rgba() values ─────── */
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16)
    ].join(', ');
  }

  /* ── Apply color tokens as CSS custom properties ─────── */
  function applyColors(colors) {
    Object.keys(colors).forEach(function (key) {
      root.style.setProperty('--' + key, colors[key]);
    });
    // Auto-derive accent glow/outline from the accent hex
    if (colors.accent) {
      var rgb = hexToRgb(colors.accent);
      root.style.setProperty('--accent-glow',    'rgba(' + rgb + ', 0.18)');
      root.style.setProperty('--accent-outline',  'rgba(' + rgb + ', 0.25)');
    }
  }

  /* ── Inject Google Fonts stylesheet ──────────────────── */
  var FONT_MAP = {
    'Inter':          'Inter:wght@400;500;600;700',
    'Press Start 2P': 'Press+Start+2P',
    'JetBrains Mono': 'JetBrains+Mono:wght@400;500',
    'Roboto':         'Roboto:wght@400;500;700',
    'Poppins':        'Poppins:wght@400;500;600',
    'Fira Code':      'Fira+Code:wght@400;500',
    'Space Mono':     'Space+Mono',
    'VT323':          'VT323'
  };

  function applyFonts(fonts) {
    var seen = {}, families = [];
    [fonts.body, fonts.heading, fonts.mono].forEach(function (name) {
      if (name && FONT_MAP[name] && !seen[name]) {
        seen[name] = true;
        families.push('family=' + FONT_MAP[name]);
      }
    });
    if (families.length) {
      var link   = document.createElement('link');
      link.rel   = 'stylesheet';
      link.href  = 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap';
      document.head.appendChild(link);
    }
    if (fonts.body)    root.style.setProperty('--font-body',    '"' + fonts.body    + '", system-ui, -apple-system, sans-serif');
    if (fonts.heading) root.style.setProperty('--font-heading',  '"' + fonts.heading + '", monospace');
    if (fonts.mono)    root.style.setProperty('--font-mono',     '"' + fonts.mono    + '", monospace');
  }

  /* ── Apply sidebar settings ──────────────────────────── */
  function applySidebar(sidebar) {
    if (sidebar.width) root.style.setProperty('--sidebar-w', sidebar.width);
  }

  /* ── Apply button settings ───────────────────────────── */
  function applyButtons(buttons) {
    if (buttons.radius) {
      root.style.setProperty('--btn-radius', buttons.radius);
    }
    if (buttons.depth) {
      root.style.setProperty('--btn-depth', buttons.depth);
    }
    if (buttons.hoverLift) {
      var lift = parseFloat(buttons.hoverLift);
      root.style.setProperty('--btn-hover-lift', '-' + lift + 'px');
    }
  }

  /* ── Apply site metadata to the DOM ─────────────────── */
  function applySite(site) {
    if (site.name) document.title = site.name;
    var logo = document.querySelector('.brand-logo');
    if (logo && site.logo) logo.src = site.logo;
    var brand = document.querySelector('.brand');
    if (brand && site.homeLink) brand.href = site.homeLink;
    var navLabel = document.querySelector('.nav-section-label');
    if (navLabel && site.navLabel) navLabel.textContent = site.navLabel;
  }

  /* ── Apply everything and reveal ────────────────────── */
  function applyConfig(config, themeColors) {
    applyColors(themeColors || config.colors || {});
    if (config.fonts)   applyFonts(config.fonts);
    if (config.sidebar) applySidebar(config.sidebar);
    if (config.buttons) applyButtons(config.buttons);
    if (config.site)    applySite(config.site);
    root.style.visibility = '';
  }

  /* ── Boot ────────────────────────────────────────────── */
  fetch('config.json')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (config) {
      if (config.theme && config.theme !== 'custom') {
        fetch('themes/' + config.theme + '.json')
          .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (theme) { applyConfig(config, theme); })
          .catch(function ()     { applyConfig(config, {}); });
      } else {
        applyConfig(config, null);
      }
    })
    .catch(function () {
      // Config unavailable (e.g. file://) — reveal with CSS defaults
      root.style.visibility = '';
    });

})();
