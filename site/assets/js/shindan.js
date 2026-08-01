/* きせらく診断 — 決定木＋静的JSON。全処理をこの端末内で完結（外部通信ゼロ） */
(function () {
  'use strict';
  var el = document.getElementById('shindan-data');
  var stage = document.getElementById('sh-stage');
  if (!el || !stage) return;
  var DATA = JSON.parse(el.textContent);
  var Q = (DATA.shindan && DATA.shindan.questions) || [];
  var answers = [];

  /* ?r=数字列 で結果を復元（共有URL） */
  var m = location.search.match(/[?&]r=(\d+)/);
  if (m && m[1].length === Q.length) {
    answers = m[1].split('').map(Number);
    var valid = answers.every(function (a, i) { return Q[i] && a < Q[i].options.length; });
    if (valid) { renderResult(); } else { answers = []; renderQ(0); }
  } else {
    renderQ(0);
  }

  function bar(pct) { document.getElementById('sh-bar').style.setProperty('--w', pct + '%'); }

  function renderQ(i) {
    var q = Q[i];
    if (!q) { renderResult(); return; }
    bar(Math.round(i / Q.length * 100));
    var html = '<p class="sh-count">質問 ' + (i + 1) + ' / ' + Q.length + '</p>' +
      '<h2 class="sh-q">' + esc(q.q) + '</h2>' +
      (q.help ? '<p class="sh-help">' + esc(q.help) + '</p>' : '') +
      '<div class="sh-opts">' +
      q.options.map(function (o, j) {
        return '<button type="button" class="sh-opt" data-j="' + j + '">' + esc(o.label) + '</button>';
      }).join('') + '</div>' +
      (i > 0 ? '<button type="button" class="sh-back">← ひとつ前に戻る</button>' : '');
    stage.innerHTML = html;
    stage.querySelectorAll('.sh-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        answers[i] = +b.dataset.j;
        answers.length = i + 1;
        renderQ(i + 1);
        stage.closest('.shindan-app').scrollIntoView({ block: 'nearest' });
      });
    });
    var back = stage.querySelector('.sh-back');
    if (back) back.addEventListener('click', function () { renderQ(i - 1); });
  }

  function collect() {
    var trouble = {}, func = {}, target = {}, washDays = 3, changes = 1;
    answers.forEach(function (a, i) {
      var o = Q[i].options[a] || {};
      (o.trouble || []).forEach(function (t) { trouble[t] = (trouble[t] || 0) + 1; });
      (o.func || o.function || []).forEach(function (f) { func[f] = (func[f] || 0) + 1; });
      (o.target || []).forEach(function (t) { target[t] = 1; });
      if (o.wash) washDays = o.wash;
      if (o.changes) changes = o.changes;
    });
    return { trouble: trouble, func: func, target: target, washDays: washDays, changes: changes };
  }

  function scoreProduct(p, c) {
    var s = 0;
    p.trouble.forEach(function (t) { s += (c.trouble[t] || 0) * 3; });
    p.func.forEach(function (f) { s += (c.func[f] || 0) * 2; });
    var wantTargets = Object.keys(c.target);
    if (wantTargets.length) {
      var hit = p.target.some(function (t) { return c.target[t]; });
      if (p.target.length && !hit) return -1; /* 性別指定に合わない商品は除外 */
      if (hit) s += 1;
    }
    return s;
  }

  function nameOf(list, slug) {
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i].name;
    return slug;
  }

  function renderResult() {
    bar(100);
    var c = collect();
    var topTroubles = Object.keys(c.trouble).sort(function (a, b) { return c.trouble[b] - c.trouble[a]; });
    var topFuncs = Object.keys(c.func).sort(function (a, b) { return c.func[b] - c.func[a]; });
    var typeName = topTroubles.length ? nameOf(DATA.troubles, topTroubles[0]) : 'ご自身のペースで選べるタイプ';
    var count = c.washDays * c.changes + 2;

    var recos = DATA.products
      .map(function (p) { return { p: p, s: scoreProduct(p, c) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 3);

    var why = topFuncs.length
      ? '「' + (topTroubles.length ? nameOf(DATA.troubles, topTroubles[0]) : 'いまの着替えの様子') + '」に合わせて、' +
        topFuncs.slice(0, 2).map(function (f) { return nameOf(DATA.funcs, f); }).join('・') + 'の肌着を選びました。'
      : 'いまの着替えの様子から、無理なく着られる肌着を選びました。';

    var share = location.origin + location.pathname + '?r=' + answers.join('');

    var html = '<div class="sh-result-head"><p class="sh-count">診断結果</p>' +
      '<p class="sh-type">' + esc(typeName) + '</p></div>' +
      '<div class="sh-count-box"><span class="sh-count-num">' + count + '枚</span>' +
      '<span>1人分の必要枚数の目安<br><small>（洗濯間隔 ' + c.washDays + '日 × 1日 ' + c.changes + '回着替え ＋ 予備2枚）</small></span>' +
      '<span class="sh-count-note">乾きにくい季節は1〜2枚多めをおすすめします。</span></div>';

    if (recos.length) {
      html += '<p class="sh-why">' + esc(why) + '</p><div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">' +
        recos.map(function (x) {
          var p = x.p;
          return '<article class="card"><a class="card-link" href="' + DATA.base + '/p/' + encodeURIComponent(p.sku) + '/">' +
            '<figure class="card-img ratio-sq"><img src="' + esc(p.thumb ? DATA.base + '/' + p.thumb : DATA.placeholder) + '" alt="' + esc(p.name) + '" width="600" height="600" loading="lazy"></figure>' +
            '<h3 class="card-name">' + esc(p.name) + '</h3>' +
            (p.sec != null ? '<div class="raku"><span class="raku-label">着替え介助 目安</span><span class="raku-num"><b>' + p.sec + '</b>秒</span></div>' : '') +
            '<p class="card-price">' + (p.price != null ? '<span class="price"><b>¥' + Number(p.price).toLocaleString() + '</b><small>（税込）</small></span>' : '<span class="price price-tbd">価格 準備中</span>') + '</p>' +
            '</a></article>';
        }).join('') + '</div>';
    } else {
      html += '<div class="sh-empty"><p><b>このタイプに合う商品は現在準備中です。</b></p>' +
        '<p>公開までいましばらくお待ちください。困りごと別のページもご覧いただけます。</p>' +
        '<p style="margin-top:10px"><a class="btn btn-ghost" href="' + DATA.base + '/">トップページへ</a></p></div>';
    }

    html += '<div class="sh-share"><label for="sh-share-url" style="font-size:13px;font-weight:700">結果を共有：</label>' +
      '<input id="sh-share-url" type="text" readonly value="' + esc(share) + '">' +
      '<button type="button" class="btn btn-ghost" id="sh-copy" style="min-height:44px;padding:8px 18px">コピー</button></div>' +
      '<p style="text-align:center;margin-top:22px"><button type="button" class="sh-back" id="sh-retry">もう一度診断する</button></p>';

    stage.innerHTML = html;
    var copy = document.getElementById('sh-copy');
    if (copy) copy.addEventListener('click', function () {
      var inp = document.getElementById('sh-share-url');
      inp.select();
      try { navigator.clipboard ? navigator.clipboard.writeText(inp.value) : document.execCommand('copy'); } catch (e) {}
      copy.textContent = 'コピーしました';
    });
    document.getElementById('sh-retry').addEventListener('click', function () {
      answers = [];
      if (history.replaceState) history.replaceState(null, '', location.pathname);
      renderQ(0);
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
})();
