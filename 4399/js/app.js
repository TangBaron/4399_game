// 4399 平台主逻辑：hash 路由、搜索、分类、轮播、iframe 游玩
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const viewHome = $('#view-home');
  const viewPlay = $('#view-play');
  const gameGrid = $('#game-grid');
  const gameCount = $('#game-count');
  const emptyTip = $('#empty-tip');
  const sectionTitle = $('#section-title');
  const searchInput = $('#search-input');

  let currentCat = 'all';
  let currentKeyword = '';

  // ---------- 工具 ----------
  function formatHot(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toString();
  }

  function getGame(id) {
    return GAMES.find((g) => g.id === id);
  }

  // ---------- 渲染游戏卡片 ----------
  function renderGames() {
    let list = GAMES.slice();
    if (currentCat !== 'all') {
      list = list.filter((g) => g.category.includes(currentCat));
    }
    if (currentKeyword) {
      const kw = currentKeyword.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(kw) ||
          g.category.some((c) => c.toLowerCase().includes(kw)) ||
          g.desc.toLowerCase().includes(kw)
      );
    }

    gameGrid.innerHTML = '';
    gameCount.textContent = `共 ${list.length} 款`;

    if (list.length === 0) {
      emptyTip.classList.remove('hidden');
      return;
    }
    emptyTip.classList.add('hidden');

    for (const g of list) {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <img class="game-cover" src="${g.cover}" alt="${g.name}" loading="lazy"
             onerror="this.style.background='linear-gradient(135deg,#ff8a33,#ff4d4f)';this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/>'">
        <div class="game-info">
          <div class="game-name">${g.name}<span class="game-hot">🔥${formatHot(g.hot)}</span></div>
          <div class="game-tags">
            ${g.category.map((c) => `<span class="tag">${c}</span>`).join('')}
          </div>
        </div>`;
      card.addEventListener('click', () => location.hash = `#/play/${g.id}`);
      gameGrid.appendChild(card);
    }
  }

  // ---------- 分类切换 ----------
  function setCategory(cat) {
    currentCat = cat;
    const label =
      {
        all: '全部游戏',
        敏捷: '敏捷类游戏',
        赛车: '赛车类游戏',
        休闲: '休闲类游戏',
        动作: '动作类游戏',
        双人: '双人对战',
      }[cat] || cat;
    sectionTitle.textContent = label;
    $$('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.cat === cat));
    $$('.side-cats li').forEach((el) => el.classList.toggle('active', el.dataset.cat === cat));
    renderGames();
  }

  // ---------- 搜索 ----------
  function doSearch() {
    currentKeyword = searchInput.value.trim();
    location.hash = '#/';
    renderGames();
  }

  // ---------- 排行榜 ----------
  function renderRank() {
    const rank = $('#rank-list');
    const top = GAMES.slice().sort((a, b) => b.hot - a.hot).slice(0, 8);
    rank.innerHTML = '';
    for (const g of top) {
      const li = document.createElement('li');
      li.textContent = g.name;
      li.addEventListener('click', () => (location.hash = `#/play/${g.id}`));
      rank.appendChild(li);
    }
  }

  // ---------- 轮播 ----------
  let bannerIdx = 0;
  let bannerTimer = null;
  function renderBanner() {
    const slides = $('#banner-slides');
    const dots = $('#banner-dots');
    const banners = GAMES.filter((g) => g.banner);
    slides.innerHTML = banners
      .map(
        (g) => `
      <div class="banner-slide" style="background-image:url('${g.cover}')">
        <div class="banner-info">
          <h2>${g.name}</h2>
          <p>${g.desc.substring(0, 40)}...</p>
          <a class="play-btn" href="#/play/${g.id}">立即开始 ▶</a>
        </div>
      </div>`
      )
      .join('');
    dots.innerHTML = banners.map(() => '<span></span>').join('');
    dots.querySelectorAll('span').forEach((d, i) =>
      d.addEventListener('click', () => goBanner(i))
    );
    goBanner(0);
  }
  function goBanner(i) {
    const slides = $('#banner-slides');
    const dots = $('#banner-dots').children;
    const total = slides.children.length;
    bannerIdx = (i + total) % total;
    slides.style.transform = `translateX(-${bannerIdx * 100}%)`;
    for (let k = 0; k < dots.length; k++) dots[k].classList.toggle('active', k === bannerIdx);
  }

  // ---------- 游玩页 ----------
  function enterPlay(id) {
    const g = getGame(id);
    if (!g) {
      location.hash = '#/';
      return;
    }
    viewHome.classList.add('hidden');
    viewPlay.classList.remove('hidden');
    $('#play-title').textContent = g.name;
    $('#play-meta').innerHTML =
      g.category.map((c) => `<span class="tag">${c}</span>`).join('') +
      `<span>🔥 人气 ${formatHot(g.hot)}</span>`;
    $('#play-desc').innerHTML = `<h3>游戏介绍</h3><p>${g.desc}</p>
      <h3 style="margin-top:12px">操作说明</h3><p>${g.howto}</p>`;

    const frame = $('#game-frame');
    const tip = $('#player-tip');
    tip.style.display = 'block';
    frame.src = g.url;
    frame.onload = () => (tip.style.display = 'none');
    window.scrollTo(0, 0);
  }

  function goHome() {
    viewPlay.classList.add('hidden');
    viewHome.classList.remove('hidden');
    $('#game-frame').src = 'about:blank';
  }

  // ---------- 路由 ----------
  function route() {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/play\/(.+)$/);
    if (m) {
      enterPlay(m[1]);
    } else {
      goHome();
    }
  }

  // ---------- 初始化 ----------
  function init() {
    renderGames();
    renderRank();
    renderBanner();

    // 顶部分类
    $$('.nav-item').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.preventDefault();
        setCategory(el.dataset.cat);
      })
    );
    // 侧边分类
    $$('.side-cats li').forEach((el) =>
      el.addEventListener('click', () => setCategory(el.dataset.cat))
    );
    // 搜索
    $('#search-btn').addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });

    // 轮播控制
    $('#banner-prev').addEventListener('click', () => goBanner(bannerIdx - 1));
    $('#banner-next').addEventListener('click', () => goBanner(bannerIdx + 1));
    bannerTimer = setInterval(() => goBanner(bannerIdx + 1), 5000);

    // 返回 / 全屏 / 重玩
    $('#btn-back').addEventListener('click', () => (location.hash = '#/'));
    $('#btn-refresh').addEventListener('click', () => {
      const f = $('#game-frame');
      f.src = f.src;
    });
    $('#btn-fullscreen').addEventListener('click', () => {
      const el = document.getElementById('game-frame');
      if (el.requestFullscreen) el.requestFullscreen();
    });

    window.addEventListener('hashchange', route);
    route();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
