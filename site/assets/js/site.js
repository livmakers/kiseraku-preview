/* きせらく 公開側共通JS（バニラ・外部通信ゼロ） */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* スタッガー出現＋ラク度メーターのカウントアップ（1回だけ） */
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        e.target.querySelectorAll('.raku-count[data-count]').forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.stagger').forEach(function (el) {
      Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', i); });
      io.observe(el);
    });
    document.querySelectorAll('.raku').forEach(function (el) { io.observe(el); });
    /* アンカージャンプ等で一気に通過した要素は交差イベントが発生しないため、
       スクロールのたびに「ビューポートより上に行った未発火要素」を回収する */
    var catching = false;
    function catchUp() {
      catching = false;
      document.querySelectorAll('.stagger:not(.is-in)').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('is-in');
          el.querySelectorAll('.raku-count[data-count]').forEach(countUp);
          io.unobserve(el);
        }
      });
    }
    window.addEventListener('scroll', function () {
      if (!catching) { catching = true; requestAnimationFrame(catchUp); }
    }, { passive: true });
    window.addEventListener('hashchange', function () { requestAnimationFrame(catchUp); });
    catchUp();
  } else {
    document.querySelectorAll('.stagger').forEach(function (el) { el.classList.add('is-in'); });
  }

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = parseInt(el.dataset.count, 10) || 0;
    var t0 = null;
    function tick(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / 700, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* モバイルメニュー：リンククリックで閉じる */
  document.querySelectorAll('.mnav nav a').forEach(function (a) {
    a.addEventListener('click', function () { a.closest('details').removeAttribute('open'); });
  });

  /* 商品詳細ギャラリー（サムネ切替） */
  var main = document.querySelector('.pd-gallery-main img');
  if (main) {
    document.querySelectorAll('.pd-thumbs button').forEach(function (b) {
      b.addEventListener('click', function () {
        main.src = b.dataset.src;
        main.alt = b.dataset.alt || main.alt;
        document.querySelectorAll('.pd-thumbs button').forEach(function (x) { x.removeAttribute('aria-current'); });
        b.setAttribute('aria-current', 'true');
      });
    });
  }
})();
