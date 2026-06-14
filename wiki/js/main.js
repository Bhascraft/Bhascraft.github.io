
(function () {
  const toggle  = document.getElementById('navToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  function open() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
  }
  function close() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }

  toggle?.addEventListener('click', function () {
    sidebar.classList.contains('open') ? close() : open();
  });
  overlay.addEventListener('click', close);

  // Close sidebar when a nav link is clicked on mobile
  sidebar.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.innerWidth <= 768) close();
    });
  });
})();
