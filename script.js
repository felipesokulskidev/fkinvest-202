const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

$('#year').textContent = new Date().getFullYear();

/* Header, progress bar, back-to-top */
const header = $('#header');
const progress = $('#progress');
const toTop = $('#toTop');
function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  header.classList.toggle('scrolled', y > 10);
  progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  toTop.classList.toggle('show', y > 600);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* Mobile menu */
const burger = $('#burger');
const nav = $('#nav');
function setMenu(open) {
  nav.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
}
burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
$$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));

/* Scroll reveal (with small stagger inside grids) */
$$('.cards, .steps, .stats-grid').forEach((group) =>
  $$('.reveal', group).forEach((el, i) => el.style.setProperty('--d', i * 0.08 + 's'))
);
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }),
  { threshold: 0.15 }
);
$$('.reveal').forEach((el) => io.observe(el));

/* Count-up numbers */
const countIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const end = +el.dataset.count;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const dur = 1400;
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(end * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
    countIO.unobserve(el);
  });
}, { threshold: 0.6 });
$$('[data-count]').forEach((el) => countIO.observe(el));

/* Card spotlight follows the cursor */
$$('.card, .bc').forEach((card) =>
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', e.clientX - r.left + 'px');
    card.style.setProperty('--my', e.clientY - r.top + 'px');
  })
);

/* Tabs (keyboard accessible) */
const tabs = $$('[role="tab"]');
function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (dir) e.preventDefault();
    if (dir) selectTab(tabs[(i + dir + tabs.length) % tabs.length], true);
  });
});

/* Hero: squares + iPhone that rises, zooms until the screen fills the viewport and becomes section 2 */
(function phoneScene() {
  const hero = $('#hero');
  const phone = $('#phone');
  if (!hero || !phone) return;

  const stage = $('#heroStage');
  const center = $('#heroCenter');
  const ui = $('.ph-ui', phone);
  const content = $('#phoneContent');
  const squares = $('#squares');
  const bubbles = $$('.bubble', phone);
  const counters = $$('[data-count-later]', content);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // squares behind the phone, palette of the page, deterministic "random" pattern
  function buildSquares() {
    const cell = Math.max(60, Math.min(132, window.innerWidth * 0.10));
    const cols = Math.ceil(window.innerWidth / cell) + 2;
    const rows = 2;
    squares.style.gridTemplateColumns = `repeat(${cols}, var(--sq))`;
    squares.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // large checker of bright / dark blocks with a few empty cells, like the reference
        let k = (c + r) % 2 === 0 ? 'a' : 'c';
        if ((r === 0 && (c % 5 === 1 || c % 7 === 4)) || (r === 1 && (c % 4 === 2 || c % 6 === 5))) k = '';
        const el = document.createElement('i');
        el.className = 'sq ' + k;
        el.style.setProperty('--d', ((c + r * 2) % 7) * 0.45 + 's');
        squares.appendChild(el);
      }
    }
  }
  buildSquares();

  let counted = false;
  function countUp() {
    if (counted) return;
    counted = true;
    counters.forEach((el) => {
      const end = +el.dataset.countLater, suffix = el.dataset.suffix || '';
      const t0 = performance.now(), dur = 1300;
      (function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  if (reduce) {
    hero.classList.add('static');
    counters.forEach((el) => { el.textContent = el.dataset.countLater + (el.dataset.suffix || ''); });
    return;
  }

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  let g = {};
  function layout() {
    const Wp = phone.offsetWidth, Hp = phone.offsetHeight;
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const textBottom = center.offsetTop + center.offsetHeight;
    squares.style.top = textBottom + 28 + Math.round(0.12 * Hp) + 'px'; // a bit below where the phone starts
    const yMid = sh / 2 - 0.12 * Hp;                    // phone centred on screen (origin is at 38% of its height)
    g = {
      sw, sh,
      yStart: Math.max(yMid, textBottom + 28 + 0.38 * Hp), // just under the buttons, only the top of the phone shows
      yMid,
      zoom: Math.max(sw / (Wp * 0.93), sh / (Hp * 0.93)) * 1.08
    };
  }

  function update() {
    const total = hero.offsetHeight - window.innerHeight;
    const p = clamp(-hero.getBoundingClientRect().top / total);

    // 0 -> .3: phone rises into the middle, headline fades up
    const m = easeInOut(clamp(p / 0.3));
    // .3 -> .75: zoom toward the screen
    const z = clamp((p - 0.3) / 0.45);
    const s = 1 + (g.zoom - 1) * Math.pow(z, 2.2);
    const oy = lerp(lerp(g.yStart, g.yMid, m), g.sh / 2, easeInOut(clamp(z * 1.3)));
    phone.style.left = g.sw / 2 + 'px';
    phone.style.top = oy + 'px';
    phone.style.transform = `translate(-50%, -38%) scale(${s})`;

    const tx = clamp(p / 0.2);
    center.style.opacity = 1 - tx;
    center.style.transform = `translateY(${-70 * tx}px)`;
    squares.style.opacity = 1 - clamp(z * 1.6);
    bubbles.forEach((b) => { b.style.opacity = 1 - clamp(z * 4); });

    // app UI blanks out, then section 2 takes over the screen
    ui.style.opacity = 1 - clamp((p - 0.6) / 0.14);
    const c = clamp((p - 0.74) / 0.12);
    content.style.opacity = c;
    Array.from(content.firstElementChild.children).forEach((el) => { el.style.transform = `translateY(${(1 - c) * 26}px)`; });
    content.classList.toggle('on', c > 0.6);
    if (c > 0.35) countUp();
  }

  let ticking = false, active = true;
  new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) update(); }, { rootMargin: "300px 0px" }).observe(hero);
  const onScroll = () => {
    if (!active || ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { buildSquares(); layout(); update(); });
  window.addEventListener('load', () => { layout(); update(); });
  layout();
  update();
})();

/* Hero card tilts toward the pointer */
(function heroCardTilt() {
  const hero = $('#hero');
  const card = $('#heroCard');
  if (!hero || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 22).toFixed(2)}deg)`;
  });
  hero.addEventListener('pointerleave', () => { card.style.transform = 'none'; });
})();

/* Card -> wallet -> zoom, driven by scroll progress through the pinned scene */
(function walletScene() {
  const scene = $('#cartao');
  if (!scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { scene.classList.add('static'); return; }

  const stage = $('.stage', scene);
  const wallet = $('#wallet');
  const card = $('#fkCard');
  const infos = $$('.info', scene);
  const dots = $$('.info-dots li', scene);
  const glow = $('.stage-glow', scene);
  const content = $('#sceneContent');
  const ringBack = $('#neonBack'), ringFront = $('#neonFront');
  const backPaths = $$('path', ringBack), frontPaths = $$('path', ringFront);
  const arcPaths = $$('.neon-arc path', content);

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- neon ring around the card -------------------------------------------------
  // The ring is a tilted ellipse split in two halves: the top half is drawn behind the card,
  // the bottom half in front of it, so the light seems to travel around the card.
  const TAIL = [0.38, 0.24, 0.1];                      // three stacked dashes = glowing comet tail
  function setHalf(path, offset, segs) {
    for (const [s0, s1] of segs) {
      const lo = Math.max(s0, offset), hi = Math.min(s1, offset + 0.5);
      if (hi > lo) {
        path.style.display = '';
        path.style.strokeDasharray = `${(hi - lo) * 2} 10`;
        path.style.strokeDashoffset = -((lo - offset) * 2);
        return;
      }
    }
    path.style.display = 'none';
  }
  function drawRing(p, cx, cy, s, y, z) {
    const dy = y + g.cardH / 2 - 0.65 * g.H;           // card centre relative to the wallet origin
    const ccx = cx, ccy = cy + s * dy;
    const rx = s * g.cardW * 0.8, ry = s * g.cardH * 0.62;
    const tf = `translate(${ccx.toFixed(1)} ${ccy.toFixed(1)}) rotate(-16)`;
    const start = 0.54;                                // the line only begins once the card is inside the wallet
    const head = (Math.max(0, p - start) / 0.38 * 2) % 1 + 0.02;
    const dBack = `M ${-rx} 0 A ${rx} ${ry} 0 0 1 ${rx} 0`;
    const dFront = `M ${rx} 0 A ${rx} ${ry} 0 0 1 ${-rx} 0`;
    TAIL.forEach((len, i) => {
      const segs = head - len >= 0 ? [[head - len, head]] : [[0, head], [1 + head - len, 1]];
      [[backPaths[i], 0, dBack], [frontPaths[i], 0.5, dFront]].forEach(([el, off, d]) => {
        el.setAttribute('d', d);
        el.setAttribute('transform', tf);
        setHalf(el, off, segs);
      });
    });
    const vis = clamp((p - start) / 0.03) * (1 - clamp(z * 1.6));
    ringBack.style.opacity = vis;
    ringFront.style.opacity = vis;
  }

  let g = {};
  function layout() {
    const W = wallet.offsetWidth, H = wallet.offsetHeight, cardH = card.offsetHeight;
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const mobile = sw <= 900;
    const x0 = mobile ? sw / 2 : sw * 0.74;            // wallet sits on the right (below the text on phones)
    const y0 = mobile ? sh * 0.8 : sh * 0.62;
    const top = y0 - 0.65 * H;                         // wallet top edge on the stage
    g = {
      sw, sh, x0, y0, H, cardH, cardW: card.offsetWidth,
      yRest: 0.28 * H - 0.35 * cardH,                 // card tip showing above the pocket
      yHover: 0.28 * H - cardH - 18,                  // card fully visible, just above the pocket line
      yStart: mobile ? 0.47 * sh - top                // phones: starts under the text
                     : 0.1 * sh - top,                // desktop: already visible near the top when the section arrives
      zoom: Math.max(sw / W, sh / (0.7 * H)) * 1.35   // enough for the pocket to cover the screen
    };
  }

  function update() {
    const total = scene.offsetHeight - window.innerHeight;
    const p = clamp(-scene.getBoundingClientRect().top / total);

    // 0 -> .36: the card falls on the right, spinning, while the infos change on the left
    const t = clamp(p / 0.36);
    const e = easeInOut(t);
    const rotY = 720 * e;                              // two full turns, ends facing front
    const rotX = 22 * (1 - e);
    const rotZ = -14 * (1 - e) + 6 * Math.sin(t * Math.PI * 3) * (1 - e);
    // .40 -> .54: the card slides into its pocket while the last infos are still on screen
    const eu = easeInOut(clamp((p - 0.40) / 0.14));
    const y = lerp(lerp(g.yStart, g.yHover, e), g.yRest, eu);
    card.style.transform =
      `translateX(-50%) translateY(${y}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${lerp(1.1, 1, e)})`;

    // .26 -> .40: wallet rises into view under the falling card
    const ea = easeInOut(clamp((p - 0.26) / 0.14));
    wallet.style.setProperty('--appear', ea);

    // .66 -> .92: wallet grows until it fills the screen
    const z = clamp((p - 0.66) / 0.26);
    const s = 1 + (g.zoom - 1) * Math.pow(z, 2.3);
    wallet.style.transform = `translate(-50%, -65%) scale(${s})`;
    // wallet drifts from the right column to the centre while it zooms
    const ez = easeInOut(clamp(z * 1.4));
    const cx = lerp(g.x0, g.sw / 2, ez), cy = lerp(g.y0, g.sh / 2, ez);
    wallet.style.left = cx + 'px';
    wallet.style.top = cy + 'px';
    glow.style.left = cx + 'px';
    glow.style.top = cy + 'px';
    glow.style.opacity = 1 - clamp(z * 1.2);
    drawRing(p, cx, cy, s, y, z);

    // left column: one info at a time, cross-fading as the card falls
    const step = 0.14, half = step / 2;
    let active = 0;
    infos.forEach((el, i) => {
      const ci = 0.03 + step * (i + 0.5);
      const first = i === 0 && p < ci;                // the first info is already on screen when the section arrives
      const d = first ? 0 : Math.abs(p - ci);
      el.style.opacity = clamp((half - d) / 0.025);
      el.style.transform = `translateY(${first ? 0 : clamp((ci - p) / half, -1, 1) * 28}px)`;
      if (d < Math.abs(p - (0.03 + step * (active + 0.5)))) active = i;
    });
    dots.forEach((d, i) => d.classList.toggle('on', i === active));
    $('#sceneInfo').style.opacity = 1 - clamp((p - 0.6) / 0.06);
    $('#sceneHint').style.opacity = 1 - clamp(p / 0.05);

    // final content fades in over the zoomed wallet
    const c = clamp((p - 0.88) / 0.09);
    content.style.opacity = c;
    content.style.transform = 'none';
    Array.from(content.children).forEach((el) => {
      if (el.tagName.toLowerCase() !== 'svg') el.style.transform = `translateY(${(1 - c) * 24}px)`;
    });
    content.classList.toggle('on', c > 0.6);

    // the line finishes at the section change and then rests as a static arc
    const arc = easeInOut(clamp((p - 0.9) / 0.07));
    arcPaths.forEach((el) => { el.style.strokeDasharray = '1'; el.style.strokeDashoffset = 1 - arc; });
  }

  let ticking = false, active = true;
  new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) update(); }, { rootMargin: "300px 0px" }).observe(scene);
  const onScroll = () => {
    if (!active || ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { layout(); update(); });
  layout();
  update();
})();

/* Real quote example (PETR4) from the public brapi.dev API, informative only.
   Intraday closes are drawn as a thin line; refreshed every minute while the card is visible.
   If the request fails, a flat illustrative line is shown and no price is displayed. */
(function liveChart() {
  const svg = $('#liveChart');
  if (!svg) return;
  const line = $('#liveLine'), area = $('#liveArea'), base = $('#liveBase'), dot = $('#liveDot');
  const priceEl = $('#livePrice'), chgEl = $('#liveChg');
  const badge = $('#liveBadge'), badgeTxt = $('#liveBadgeTxt'), meta = $('#liveMeta');
  const card = svg.closest('.bc');
  const W = 400, H = 140, PAD = 18;
  const URL = 'https://brapi.dev/api/quote/PETR4?range=1d&interval=5m';
  const brl = (n) => 'R$ ' + n.toFixed(2).replace('.', ',');
  const pct = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2).replace('.', ',') + '%';
  const hhmm = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  let timer = null, vis = false, loaded = false;

  function draw(closes, ref) {
    const all = ref != null ? closes.concat(ref) : closes;
    const mn = Math.min(...all), mx = Math.max(...all);
    const span = Math.max(mx - mn, mn * 0.002);
    const y = (v) => H - PAD - ((v - mn) / span) * (H - PAD * 2);
    const n = closes.length;
    const d = closes.map((v, i) => (i ? 'L' : 'M') + ((i / (n - 1)) * W).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
    line.setAttribute('d', d);
    area.setAttribute('d', d + `L${W} ${H} L0 ${H}Z`);
    if (ref != null) { base.setAttribute('y1', y(ref)); base.setAttribute('y2', y(ref)); base.style.display = ''; }
    else base.style.display = 'none';
    dot.style.top = (y(closes[n - 1]) / H * 100) + '%';
    dot.style.display = '';
  }

  function fallback() {
    const demo = Array.from({ length: 40 }, (_, i) => 50 + Math.sin(i / 5) * 2 + i * 0.05);
    draw(demo, null);
    dot.style.display = 'none';
    priceEl.textContent = '—'; chgEl.textContent = '';
    badge.classList.add('closed'); badgeTxt.textContent = 'Indisponível';
    meta.textContent = 'Cotação indisponível no momento. Linha ilustrativa, apenas informativa.';
  }

  async function load() {
    try {
      const res = await fetch(URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('http ' + res.status);
      const data = (await res.json()).results?.[0];
      const closes = (data?.historicalDataPrice || []).map((h) => h.close).filter((v) => typeof v === 'number');
      if (!data || closes.length < 5) throw new Error('empty');

      draw(closes, data.regularMarketPreviousClose ?? null);
      priceEl.textContent = brl(data.regularMarketPrice);
      chgEl.textContent = pct(data.regularMarketChangePercent);
      chgEl.className = data.regularMarketChangePercent >= 0 ? 'up' : 'down';

      const t = new Date(data.regularMarketTime);
      const ageMin = (Date.now() - t.getTime()) / 60000;
      const fresh = ageMin < 30;
      badge.classList.toggle('closed', !fresh);
      badgeTxt.textContent = fresh ? 'Ao vivo' : 'Último pregão';
      meta.textContent = (fresh
        ? `Cotação com atraso, atualizada às ${hhmm(t)}.`
        : `Último pregão: ${t.toLocaleDateString('pt-BR')}.`) +
        ' PETR4 é só um exemplo informativo, não é recomendação de compra ou venda. Fonte: brapi.dev.';
      loaded = true;
    } catch (e) {
      if (!loaded) fallback();
    }
  }

  function loop() { if (!vis) return; load(); timer = setTimeout(loop, 60000); }

  fallback();
  new IntersectionObserver(([e]) => {
    const was = vis;
    vis = e.isIntersecting && !document.hidden;
    if (vis && !was) loop(); else if (!vis) clearTimeout(timer);
  }, { threshold: 0.2 }).observe(card);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { vis = false; clearTimeout(timer); } });
})();

/* Investment simulator: personalised, hypothetical rates chosen by the user (never a recommendation) */
(function simulator() {
  const host = $('#smControls');
  if (!host) return;

  /* ---------- formatting ---------- */
  const num = (n) => (Number.isFinite(n) ? n : 0);
  const brl = (n) => num(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = (n, d = 0) => num(n).toFixed(d).replace('.', ',') + '%';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- state ---------- */
  const PROFILES = [{ n: 'Conservador', r: 8 }, { n: 'Moderado', r: 11 }, { n: 'Arrojado', r: 14 }];
  const S = {
    initial: 5000, monthly: 500, growth: 0, years: 10,
    mode: 'perfil', profile: 1, custom: 11,
    classes: [
      { n: 'Renda fixa', w: 50, r: 9, col: '#46e0c3' },
      { n: 'Ações', w: 25, r: 12, col: '#129ca0' },
      { n: 'FIIs', w: 15, r: 10, col: '#9df2e0' },
      { n: 'Cripto', w: 10, r: 15, col: '#ffffff' }
    ],
    inflation: 4, fee: 0, tax: 0, goal: 300000, withdraw: 4
  };
  const PRESETS = [
    { n: 'Reserva de emergência', v: { initial: 0, monthly: 1000, growth: 0, years: 2, goal: 30000, profile: 0 } },
    { n: 'Viagem', v: { initial: 2000, monthly: 500, growth: 0, years: 3, goal: 25000, profile: 0 } },
    { n: 'Imóvel', v: { initial: 30000, monthly: 2000, growth: 3, years: 8, goal: 400000, profile: 1 } },
    { n: 'Aposentadoria', v: { initial: 10000, monthly: 1500, growth: 3, years: 25, goal: 2000000, profile: 1 } }
  ];
  const FIELDS = {
    initial:   { label: 'Valor inicial', min: 0, max: 500000, step: 500, pre: 'R$' },
    monthly:   { label: 'Aporte mensal', min: 0, max: 20000, step: 50, pre: 'R$' },
    growth:    { label: 'Reajuste anual do aporte', min: 0, max: 15, step: 0.5, suf: '%' },
    years:     { label: 'Prazo', min: 1, max: 40, step: 1, suf: 'anos' },
    custom:    { label: 'Rentabilidade anual', min: 0, max: 30, step: 0.5, suf: '%', cls: 'only-custom' },
    inflation: { label: 'Inflação anual (hipotética)', min: 0, max: 15, step: 0.5, suf: '%' },
    fee:       { label: 'Taxa de administração', min: 0, max: 3, step: 0.1, suf: '% a.a.' },
    tax:       { label: 'Imposto sobre rendimentos', min: 0, max: 25, step: 1, suf: '%' },
    goal:      { label: 'Meta (em valores de hoje)', min: 0, max: 5000000, step: 10000, pre: 'R$' },
    withdraw:  { label: 'Taxa de retirada anual', min: 1, max: 10, step: 0.5, suf: '%' }
  };

  /* ---------- controls (built here to keep the HTML small) ---------- */
  const field = (id) => {
    const f = FIELDS[id];
    return `<div class="sm-field ${f.cls || ''}">
      <div class="sm-label"><label for="n-${id}">${f.label}</label>
        <span class="sm-in">${f.pre ? `<em>${f.pre}</em>` : ''}<input id="n-${id}" type="number" inputmode="decimal" data-f="${id}" data-t="n" min="${f.min}" step="${f.step}" value="${S[id]}">${f.suf ? `<em>${f.suf}</em>` : ''}</span>
      </div>
      <input type="range" aria-label="${f.label}" data-f="${id}" data-t="r" min="${f.min}" max="${f.max}" step="${f.step}" value="${S[id]}">
    </div>`;
  };
  const allocRows = S.classes.map((c, i) => `<div class="sm-arow">
      <i style="background:${c.col}"></i><b>${c.n}</b>
      <input type="range" aria-label="Peso de ${c.n}" data-ci="${i}" data-k="w" min="0" max="100" step="5" value="${c.w}">
      <em data-pct="${i}"></em>
      <span class="sm-in sm-in-sm"><input type="number" aria-label="Retorno anual de ${c.n}" data-ci="${i}" data-k="r" step="0.5" value="${c.r}"><em>% a.a.</em></span>
    </div>`).join('');

  host.innerHTML = `
    <div class="sm-presets" id="smPresets" role="group" aria-label="Objetivos prontos">
      <span>Comece por um objetivo</span>
      ${PRESETS.map((p, i) => `<button type="button" data-preset="${i}">${p.n}</button>`).join('')}
    </div>
    <details class="sm-group" open><summary><i>01</i>Valores e prazo</summary>${field('initial')}${field('monthly')}${field('growth')}${field('years')}</details>
    <details class="sm-group" open><summary><i>02</i>Retorno esperado</summary>
      <div class="sm-seg" id="smModes" role="radiogroup" aria-label="Como definir o retorno">
        <button type="button" role="radio" data-mode="perfil">Perfil</button>
        <button type="button" role="radio" data-mode="custom">Taxa própria</button>
        <button type="button" role="radio" data-mode="carteira">Carteira</button>
      </div>
      <div class="sm-seg only-perfil" id="smProfiles" role="radiogroup" aria-label="Perfil de investidor">
        ${PROFILES.map((p, i) => `<button type="button" role="radio" data-profile="${i}">${p.n}<small>${p.r}% a.a.</small></button>`).join('')}
      </div>
      ${field('custom')}
      <div class="only-carteira">
        ${allocRows}
        <p class="sm-hint">Pesos normalizados para somar 100%. Os retornos por classe são hipóteses suas, editáveis.</p>
      </div>
    </details>
    <details class="sm-group"><summary><i>03</i>Inflação, custos e impostos</summary>${field('inflation')}${field('fee')}${field('tax')}
      <p class="sm-hint">O imposto é aplicado sobre o rendimento no resgate. Use a alíquota que fizer sentido para o seu caso.</p>
    </details>
    <details class="sm-group" open><summary><i>04</i>Meta e renda</summary>${field('goal')}${field('withdraw')}</details>`;

  /* ---------- engine ---------- */
  function portfolio() {
    if (S.mode === 'perfil') return { w: [1], r: [PROFILES[S.profile].r] };
    if (S.mode === 'custom') return { w: [1], r: [S.custom] };
    const sum = S.classes.reduce((a, c) => a + c.w, 0);
    return { w: S.classes.map((c) => (sum ? c.w / sum : 1 / S.classes.length)), r: S.classes.map((c) => c.r) };
  }
  const infl = (months) => Math.pow(1 + S.inflation / 100, months / 12);

  // Monthly simulation. Returns balances (gross), invested and net-of-tax series, one value per month.
  function run(delta, months, pm, p0) {
    const { w, r } = portfolio();
    const m = r.map((x) => Math.pow(1 + Math.max(-0.95, (x + delta - S.fee) / 100), 1 / 12) - 1);
    let b = w.map((x) => p0 * x), inv = p0;
    const invA = [p0], balA = [p0], netA = [p0];
    for (let t = 1; t <= months; t++) {
      const c = pm * Math.pow(1 + S.growth / 100, Math.floor((t - 1) / 12));
      b = b.map((v, i) => v * (1 + m[i]) + c * w[i]);
      inv += c;
      const bal = b.reduce((a, v) => a + v, 0);
      invA.push(inv); balA.push(bal);
      netA.push(bal - (S.tax / 100) * Math.max(0, bal - inv));
    }
    return { invA, balA, netA, b, w };
  }

  /* ---------- results ---------- */
  const el = (id) => document.getElementById(id);
  const chart = el('sim-chart'), plot = el('sm-plot'), guide = el('sm-guide'), dot = el('sm-dot'), tip = el('sm-tip');
  const W = 400, H = 180, TOP = 12, BOT = 6;
  const view = { real: false, scen: true };
  let R = null;   // last computed results

  function compute() {
    const N = S.years * 12;
    const base = run(0, N, S.monthly, S.initial);
    const lo = run(-3, N, S.monthly, S.initial);
    const hi = run(3, N, S.monthly, S.initial);
    const fN = infl(N);
    const inv = base.invA[N], bal = base.balA[N], net = base.netA[N];
    const gross = bal - inv, taxAmt = (S.tax / 100) * Math.max(0, gross);
    const out = { N, base, lo, hi, fN, inv, bal, net, gross, taxAmt, netGain: gross - taxAmt, real: net / fN,
                  incomeNom: (net * S.withdraw) / 100 / 12 };
    out.incomeReal = out.incomeNom / fN;

    // goal: progress, time to reach and monthly contribution needed
    out.goal = null;
    if (S.goal > 0) {
      const goalNom = S.goal * fN;
      let reach = null;
      for (let t = 0; t <= N; t++) if (base.netA[t] / infl(t) >= S.goal) { reach = t; break; }
      let beyond = null;
      if (reach === null) {
        const ext = run(0, 600, S.monthly, S.initial);
        for (let t = N + 1; t <= 600; t++) if (ext.netA[t] / infl(t) >= S.goal) { beyond = t; break; }
      }
      const n0 = run(0, N, 0, S.initial).netA[N], n1 = run(0, N, 1, S.initial).netA[N];
      const needed = n1 > n0 ? (goalNom - n0) / (n1 - n0) : null;
      out.goal = { goalNom, pctDone: net / goalNom, reach, beyond, needed };
    }
    return out;
  }

  const yearVal = (arr, y, real) => (real ? arr[y * 12] / infl(y * 12) : arr[y * 12]);
  const yOf = (v, max) => H - BOT - (v / max) * (H - TOP - BOT);

  function series() {
    const n = S.years, r = view.real;
    const mk = (arr) => Array.from({ length: n + 1 }, (_, y) => yearVal(arr, y, r));
    const goal = S.goal > 0 ? Array.from({ length: n + 1 }, (_, y) => (r ? S.goal : S.goal * infl(y * 12))) : null;
    return { base: mk(R.base.netA), inv: mk(R.base.invA), lo: mk(R.lo.netA), hi: mk(R.hi.netA), goal, n };
  }

  function drawChart() {
    const s = (R.series = series());
    const others = [...s.base, ...s.inv, ...(view.scen ? [...s.lo, ...s.hi] : [])];
    // a goal far above the curves would flatten the chart, so it is only drawn when on a comparable scale
    if (s.goal && Math.max(...s.goal) > 1.6 * Math.max(...others, 1)) s.goal = null;
    s.max = Math.max(...others, ...(s.goal || []), 1);
    const pts = (a) => a.map((v, i) => `${((i / s.n) * W).toFixed(1)},${yOf(v, s.max).toFixed(1)}`).join(' ');
    const grid = [0.25, 0.5, 0.75].map((f) => {
      const y = (TOP + (H - TOP - BOT) * f).toFixed(1);
      return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.07)" vector-effect="non-scaling-stroke"/>`;
    }).join('');
    const line = (a, stroke, w, extra = '') => `<polyline points="${pts(a)}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" ${extra}/>`;
    chart.innerHTML =
      `<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46e0c3" stop-opacity=".26"/><stop offset="1" stop-color="#46e0c3" stop-opacity="0"/></linearGradient></defs>` +
      grid +
      `<polygon points="0,${H} ${pts(s.base)} ${W},${H}" fill="url(#sg)"/>` +
      (view.scen ? line(s.lo, '#9df2e0', 1.3, 'stroke-opacity=".55" stroke-dasharray="2 4"') + line(s.hi, '#9df2e0', 1.3, 'stroke-opacity=".55" stroke-dasharray="2 4"') : '') +
      (s.goal ? line(s.goal, '#ffffff', 1.4, 'stroke-opacity=".8" stroke-dasharray="1 5"') : '') +
      line(s.inv, '#ffffff', 1.5, 'stroke-opacity=".5" stroke-dasharray="4 5"') +
      line(s.base, '#46e0c3', 2.6);
    el('sm-mid').textContent = S.years > 1 ? `Ano ${Math.round(S.years / 2)}` : '';
    el('sm-end').textContent = `Ano ${S.years}`;
    el('smLegend').innerHTML =
      `<li><i class="l-base"></i>Cenário base</li><li><i class="l-inv"></i>Total investido</li>` +
      (view.scen ? `<li><i class="l-scen"></i>Otimista e pessimista</li>` : '') + (s.goal ? `<li><i class="l-goal"></i>Meta</li>` : '');
    showAt(s.n);
  }

  function showAt(i, active) {
    const s = R.series, x = (i / s.n) * 100;
    guide.style.left = dot.style.left = x + '%';
    dot.style.top = (yOf(s.base[i], s.max) / H) * 100 + '%';
    guide.style.opacity = dot.style.opacity = '1';
    if (active) {
      tip.innerHTML = `<b>Ano ${i}${view.real ? ' · valores de hoje' : ''}</b><span>${brl(s.base[i])}</span>` +
        (view.scen ? `<small>Pessimista ${brl(s.lo[i])} · Otimista ${brl(s.hi[i])}</small>` : '') +
        `<small>Investido ${brl(s.inv[i])}</small>`;
      tip.style.left = clamp(x, 22, 78) + '%';
      tip.style.opacity = '1';
    } else tip.style.opacity = '0';
  }
  const onMove = (e) => {
    const r = plot.getBoundingClientRect();
    showAt(Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * R.series.n), true);
  };
  plot.addEventListener('pointermove', onMove);
  plot.addEventListener('pointerdown', onMove);
  plot.addEventListener('pointerleave', () => R && showAt(R.series.n));

  // the big number glides to its new value instead of jumping (and counts up the first time it is seen)
  const tweenReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tweenTo(node, to) {
    cancelAnimationFrame(node._raf);
    const from = node._v ?? to;
    node._v = to;
    if (tweenReduce || Math.abs(to - from) < 1) { node.textContent = brl(to); return; }
    const t0 = performance.now(), dur = 520;
    (function step(now) {
      const k = Math.min((now - t0) / dur, 1);
      node.textContent = brl(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) node._raf = requestAnimationFrame(step);
    })(t0);
  }
  window.__simFirstView = () => { const n = el('r-total'); if (n && R) { n._v = 0; tweenTo(n, R.net); } };

  function render() {
    R = compute();
    const yrs = S.years + (S.years === 1 ? ' ano' : ' anos');
    el('r-years').textContent = yrs;
    tweenTo(el('r-total'), R.net);
    el('r-real').textContent = `Equivale a ${brl(R.real)} em valores de hoje (inflação de ${pct(S.inflation, 1)} a.a.)`;

    el('smKpis').innerHTML = [
      ['Total investido', brl(R.inv), ''],
      ['Rendimento bruto', brl(R.gross), 'pos'],
      ['Imposto estimado', brl(R.taxAmt), ''],
      ['Rendimento líquido', brl(R.netGain), 'pos'],
      ['Renda mensal estimada', brl(R.incomeNom), ''],
      ['Renda em valores de hoje', brl(R.incomeReal), '']
    ].map(([k, v, c]) => `<div><span>${k}</span><strong class="${c}">${v}</strong></div>`).join('');

    const share = R.net > 0 ? clamp(R.netGain / R.net, 0, 1) : 0;
    el('sm-bar-inv').style.width = (1 - share) * 100 + '%';
    el('sm-bar-gain').style.width = share * 100 + '%';
    el('sm-share').textContent = `${Math.round(share * 100)}% do patrimônio vem do rendimento hipotético · renda mensal com retirada de ${pct(S.withdraw, 1)} a.a.`;

    // goal block
    const g = R.goal, goalEl = el('smGoal');
    if (!g) { goalEl.hidden = true; }
    else {
      goalEl.hidden = false;
      const done = clamp(g.pctDone, 0, 1) * 100;
      let when;
      if (g.reach !== null) when = g.reach === 0 ? 'A meta já está atingida.' : `Nesta simulação, a meta é atingida em ${Math.floor(g.reach / 12)} anos e ${g.reach % 12} meses.`;
      else if (g.beyond !== null) when = `Dentro do prazo não chega lá. Nesta simulação, seriam necessários cerca de ${Math.floor(g.beyond / 12)} anos e ${g.beyond % 12} meses.`;
      else when = 'Com estes valores, a meta não é atingida em 50 anos.';
      let need = '';
      if (g.needed !== null) need = g.needed <= 0 ? ' Só o valor inicial já cobriria a meta no prazo.'
        : ` Para chegar a ${brl(S.goal)} em valores de hoje em ${S.years} ${S.years === 1 ? 'ano' : 'anos'}, o aporte mensal inicial seria de cerca de ${brl(g.needed)}.`;
      goalEl.innerHTML = `<div class="sm-goal-top"><span>Meta de ${brl(S.goal)} <small>(hoje) · ${brl(g.goalNom)} no fim do prazo</small></span><b>${Math.round(g.pctDone * 100)}%</b></div>
        <div class="sm-goal-bar"><i style="width:${done}%"></i></div><p>${when}${need}</p>`;
    }

    // allocation (portfolio mode only)
    const al = el('smAlloc');
    if (S.mode === 'carteira') {
      al.hidden = false;
      const tot = R.base.b.reduce((a, v) => a + v, 0) || 1;
      al.innerHTML = `<h4>Composição projetada <small>(antes de impostos)</small></h4>
        <div class="sm-abar">${S.classes.map((c, i) => `<i style="width:${(R.base.b[i] / tot) * 100}%;background:${c.col}"></i>`).join('')}</div>
        <ul>${S.classes.map((c, i) => `<li><i style="background:${c.col}"></i>${c.n}<b>${brl(R.base.b[i])}</b><small>${pct((R.base.b[i] / tot) * 100)}</small></li>`).join('')}</ul>`;
    } else al.hidden = true;

    // yearly table
    let rows = '', prevInv = R.base.invA[0];
    for (let y = 1; y <= S.years; y++) {
      const t = y * 12, inv = R.base.invA[t], net = R.base.netA[t];
      rows += `<tr><td>${y}</td><td>${brl(inv - prevInv)}</td><td>${brl(inv)}</td><td>${brl(net)}</td><td>${brl(net / infl(t))}</td></tr>`;
      prevInv = inv;
    }
    el('smTable').innerHTML = `<thead><tr><th>Ano</th><th>Aportes no ano</th><th>Total investido</th><th>Patrimônio líquido</th><th>Em valores de hoje</th></tr></thead><tbody>${rows}</tbody>`;

    drawChart();
  }

  /* ---------- wiring ---------- */
  const paint = (r) => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
  function syncDom() {
    host.dataset.mode = S.mode;
    $$('[data-f]', host).forEach((i) => { i.value = S[i.dataset.f]; if (i.type === 'range') paint(i); });
    $$('[data-ci]', host).forEach((i) => { i.value = S.classes[+i.dataset.ci][i.dataset.k]; if (i.type === 'range') paint(i); });
    $$('[data-mode]', host).forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === S.mode));
    $$('[data-profile]', host).forEach((b) => b.setAttribute('aria-checked', +b.dataset.profile === S.profile));
    const sum = S.classes.reduce((a, c) => a + c.w, 0) || 1;
    $$('[data-pct]', host).forEach((e) => { e.textContent = pct((S.classes[+e.dataset.pct].w / sum) * 100); });
  }
  const clearPreset = () => $$('[data-preset]', host).forEach((b) => b.classList.remove('on'));

  host.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.f) {
      const f = FIELDS[t.dataset.f];
      S[t.dataset.f] = clamp(parseFloat(t.value) || 0, f.min, t.dataset.t === 'n' ? 1e9 : f.max);
      S.years = clamp(Math.round(S.years), 1, 60);       // keeps the simulation light
      const sib = host.querySelector(`[data-f="${t.dataset.f}"][data-t="${t.dataset.t === 'n' ? 'r' : 'n'}"]`);
      if (sib) { sib.value = S[t.dataset.f]; if (sib.type === 'range') paint(sib); }
      if (t.type === 'range') paint(t);
    } else if (t.dataset.ci) {
      S.classes[+t.dataset.ci][t.dataset.k] = parseFloat(t.value) || 0;
      if (t.type === 'range') paint(t);
      const sum = S.classes.reduce((a, c) => a + c.w, 0) || 1;
      $$('[data-pct]', host).forEach((x) => { x.textContent = pct((S.classes[+x.dataset.pct].w / sum) * 100); });
    } else return;
    clearPreset();
    render();
  });

  host.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mode) { S.mode = b.dataset.mode; clearPreset(); }
    else if (b.dataset.profile) { S.profile = +b.dataset.profile; S.mode = 'perfil'; clearPreset(); }
    else if (b.dataset.preset) {
      Object.assign(S, PRESETS[+b.dataset.preset].v, { mode: 'perfil' });
      syncDom(); clearPreset(); b.classList.add('on'); render(); return;
    } else return;
    syncDom(); render();
  });

  el('smScen').addEventListener('change', (e) => { view.scen = e.target.checked; drawChart(); });
  el('smReal').addEventListener('change', (e) => { view.real = e.target.checked; drawChart(); });

  /* ---------- export ---------- */
  const summary = () => `Simulação fkInvest (hipotética, informativa)
Prazo: ${S.years} anos · Valor inicial: ${brl(S.initial)} · Aporte mensal: ${brl(S.monthly)} (reajuste ${pct(S.growth, 1)} a.a.)
Patrimônio líquido estimado: ${brl(R.net)} (${brl(R.real)} em valores de hoje)
Total investido: ${brl(R.inv)} · Rendimento líquido: ${brl(R.netGain)}
Inflação ${pct(S.inflation, 1)} a.a. · Taxa de administração ${pct(S.fee, 1)} a.a. · Imposto ${pct(S.tax)}
Taxas hipotéticas definidas pelo usuário. Não é recomendação de investimento.`;
  el('smCopy').addEventListener('click', async () => {
    const msg = el('smCopied');
    try { await navigator.clipboard.writeText(summary()); msg.textContent = 'Resumo copiado.'; }
    catch (e) { msg.textContent = 'Não foi possível copiar.'; }
    setTimeout(() => (msg.textContent = ''), 2500);
  });
  el('smCsv').addEventListener('click', () => {
    const n = (v) => v.toFixed(2).replace('.', ',');
    const lines = [['Ano', 'Aportes no ano', 'Total investido', 'Patrimonio liquido', 'Em valores de hoje'].join(';')];
    let prev = R.base.invA[0];
    for (let y = 1; y <= S.years; y++) {
      const t = y * 12, inv = R.base.invA[t], net = R.base.netA[t];
      lines.push([y, n(inv - prev), n(inv), n(net), n(net / infl(t))].join(';'));
      prev = inv;
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'simulacao-fkinvest.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  syncDom();
  render();
})();

/* How to start: steps advance by themselves (pause on hover), can be clicked, and the phone follows the pointer */
(function howTo() {
  const section = $('#como-funciona');
  const steps = $$('#hwSteps li');
  if (!section || !steps.length) return;
  const views = $$('.hw-view', section), dots = $$('.hw-dots i', section);
  const title = $('#hwTitle'), num = $('#hwNum'), phone = $('#hwPhone'), stage = $('#hwStage');
  const titles = ['Cadastro', 'Verificação', 'Primeiro aporte'];
  const prog = $('.hw-prog i', section);
  const DUR = 5000;

  // background: a static candlestick field (deterministic, trending up) like a price chart
  (function candles() {
    const svg = $('#hwCandles');
    if (!svg) return;
    const W = 1600, H = 420, n = 64, step = W / n;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let p = 0.22, html = '', ma = [];
    const data = [];
    for (let i = 0; i < n; i++) {
      const o = p, c = p + (rnd() - 0.42) * 0.09 + 0.004;
      data.push({ o, c, h: Math.max(o, c) + rnd() * 0.04, l: Math.min(o, c) - rnd() * 0.04 });
      p = Math.min(0.9, Math.max(0.1, c));
    }
    const y = (v) => H - 20 - v * (H - 60);
    data.forEach((d, i) => {
      const x = i * step + step / 2, up = d.c >= d.o, col = up ? '#129ca0' : '#7aa6ad';
      const top = y(Math.max(d.o, d.c)), bh = Math.max(3, Math.abs(y(d.o) - y(d.c)));
      html += `<line x1="${x}" x2="${x}" y1="${y(d.h)}" y2="${y(d.l)}" stroke="${col}" stroke-width="2" opacity=".7"/>` +
              `<rect x="${x - step * 0.3}" y="${top}" width="${step * 0.6}" height="${bh}" rx="2" fill="${col}" opacity="${up ? 0.55 : 0.4}"/>`;
      const from = Math.max(0, i - 7), sl = data.slice(from, i + 1);
      ma.push(`${x},${y(sl.reduce((a, k) => a + k.c, 0) / sl.length)}`);
    });
    html += `<polyline points="${ma.join(' ')}" fill="none" stroke="#46e0c3" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`;
    svg.innerHTML = html;
  })();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0, timer = null, startedAt = 0, remaining = DUR, visible = false, hover = false;

  function show(i) {
    cur = i;
    steps.forEach((s) => s.classList.remove('on'));
    void section.offsetWidth;                       // restarts the progress bar animation
    steps[i].classList.add('on');
    views.forEach((v, k) => v.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    title.textContent = titles[i];
    num.textContent = i + 1;
    prog.style.width = ((i + 1) / steps.length) * 100 + '%';
  }
  function schedule(ms) {
    clearTimeout(timer);
    if (reduce || !visible || hover) return;
    startedAt = performance.now(); remaining = ms;
    timer = setTimeout(() => { show((cur + 1) % steps.length); schedule(DUR); }, ms);
  }
  function pause() {
    hover = true;
    section.classList.add('hw-paused');
    clearTimeout(timer);
    remaining = Math.max(300, remaining - (performance.now() - startedAt));
  }
  function resume() {
    hover = false;
    section.classList.remove('hw-paused');
    schedule(remaining);
  }

  steps.forEach((s, i) => $('button', s).addEventListener('click', () => { show(i); remaining = DUR; schedule(DUR); }));
  stage.addEventListener('pointerenter', pause);
  stage.addEventListener('pointerleave', () => { resume(); phone.style.transform = ''; });
  stage.addEventListener('pointermove', (e) => {
    if (reduce) return;
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    phone.style.transform = `rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg)`;
  });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { if (!hover) schedule(remaining); } else clearTimeout(timer);
  }, { threshold: 0.35 }).observe(section);
})();

/* FAQ: only one open at a time */
const faqs = $$('.faq details');
faqs.forEach((d) =>
  d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach((o) => o !== d && (o.open = false));
  })
);

/* Hero background: candlestick chart scrolling + floating quotes */
(function marketBackground() {
  const canvas = $('#marketBg');
  if (!canvas) return; // the clean hero no longer draws the chart background
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const YELLOW = '157,242,224'; // aqua-soft (nome mantido por compatibilidade)
  const W_CANDLE = 16;   // candle slot width (px)
  const SPEED = 0.35;    // px per frame
  let w, h, dpr, candles = [], offset = 0, running = true, last = 0;

  const symbols = ['AAPL', 'MSFT', 'PETR4', 'VALE3', 'ITUB4', 'NVDA', 'TSLA', 'AMZN', 'USD/BRL', 'BTC', 'GOLD', 'IBOV', 'S&P', 'NASDAQ', 'EUR/USD', 'OIL'];
  const quotes = symbols.map((s) => ({
    s, price: 20 + Math.random() * 480,
    x: Math.random(), y: Math.random(), v: 0.00004 + Math.random() * 0.00008,
    chg: 0, a: 0.15 + Math.random() * 0.2
  }));

  let price = 100;
  function nextCandle() {
    const open = price;
    const close = open + (Math.random() - 0.47) * 6;
    const high = Math.max(open, close) + Math.random() * 4;
    const low = Math.min(open, close) - Math.random() * 4;
    price = close;
    return { open, close, high, low };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const need = Math.ceil(w / W_CANDLE) + 3;
    while (candles.length < need) candles.push(nextCandle());
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // horizontal grid
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = (h / 6) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // scale to visible candles
    const vis = candles.slice(0, Math.ceil(w / W_CANDLE) + 2);
    let min = Infinity, max = -Infinity;
    vis.forEach((c) => { min = Math.min(min, c.low); max = Math.max(max, c.high); });
    const top = h * 0.18, bottom = h * 0.82;
    const y = (p) => bottom - ((p - min) / (max - min || 1)) * (bottom - top);

    // candles
    vis.forEach((c, i) => {
      const x = i * W_CANDLE - offset + W_CANDLE / 2;
      const up = c.close >= c.open;
      const col = up ? YELLOW : '255,255,255';
      const alpha = up ? 0.38 : 0.16;
      ctx.strokeStyle = `rgba(${col},${alpha})`;
      ctx.fillStyle = `rgba(${col},${alpha})`;
      ctx.beginPath(); ctx.moveTo(x, y(c.high)); ctx.lineTo(x, y(c.low)); ctx.stroke();
      const bt = y(Math.max(c.open, c.close));
      ctx.fillRect(x - 4, bt, 8, Math.max(2, Math.abs(y(c.open) - y(c.close))));
    });

    // moving average line
    ctx.beginPath();
    vis.forEach((c, i) => {
      const from = Math.max(0, i - 6);
      const avg = vis.slice(from, i + 1).reduce((s, k) => s + k.close, 0) / (i - from + 1);
      const x = i * W_CANDLE - offset + W_CANDLE / 2;
      i ? ctx.lineTo(x, y(avg)) : ctx.moveTo(x, y(avg));
    });
    ctx.strokeStyle = `rgba(${YELLOW},.7)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `rgba(${YELLOW},.8)`;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // floating quotes
    ctx.font = '600 12px Inter, sans-serif';
    quotes.forEach((q) => {
      const up = q.chg >= 0;
      const px = q.x * w, py = q.y * h;
      ctx.fillStyle = `rgba(255,255,255,${q.a})`;
      ctx.fillText(q.s, px, py);
      ctx.fillStyle = up ? `rgba(70,224,195,${q.a + .1})` : `rgba(255,155,142,${q.a + .1})`;
      ctx.fillText(`${q.price.toFixed(2)} ${up ? '▲' : '▼'}`, px, py + 16);
    });
  }

  function step(dt) {
    offset += SPEED * dt;
    while (offset >= W_CANDLE) { offset -= W_CANDLE; candles.shift(); candles.push(nextCandle()); }
    quotes.forEach((q) => {
      q.x -= q.v * dt; if (q.x < -0.1) { q.x = 1.05; q.y = Math.random(); }
      if (Math.random() < 0.03) { const d = (Math.random() - 0.5) * 2; q.price = Math.max(1, q.price + d); q.chg = d; }
    });
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min((t - last) / 16.7, 3) || 1;
    last = t;
    step(dt); draw();
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  if (reduce) { draw(); return; }

  // only animate while the hero is visible
  new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }).observe(hero);
  requestAnimationFrame(frame);
})();

/* Forms */
$$('[data-form]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input[type="email"]', form);
    const msg = $('.form-msg', form);
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());

    msg.className = 'form-msg ' + (valid ? 'ok' : 'error');
    if (!valid) {
      msg.textContent = 'Digite um e-mail válido.';
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      return;
    }

    // TODO: enviar { email: input.value } para o fluxo de abertura de conta / CRM
    msg.textContent = '🎉 Quase lá! Enviamos o próximo passo para o seu e-mail.';
    form.reset();
  });
});

/* MacBook: wakes up, the lid opens, then the laptop dives into its screen and hands over to the next (black) section */
(function macbookScene() {
  const scene = $('#macbook');
  if (!scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { scene.classList.add('static'); return; }
  const stage = $('#mbStage'), dark = $('#mbDark'), mb = $('#mb'), lid = $('#mbLid'), screen = $('#mbScreen'), title = $('#mbTitle');
  const ui = $('.mb-ui', screen), wall = $('.mb-wall', screen), off = $('.mb-off', screen);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let zoom = 8;

  function layout() {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    zoom = Math.max(sw / screen.offsetWidth, sh / screen.offsetHeight) * 1.06;   // the screen alone must cover the viewport
  }
  function update() {
    const total = scene.offsetHeight - window.innerHeight;
    const p = clamp(-scene.getBoundingClientRect().top / total);

    // 0 -> .2: the lid lifts and the screen wakes up
    const open = easeInOut(clamp(p / 0.2));
    lid.style.setProperty('--open', (72 * (1 - open)).toFixed(1) + 'deg');
    off.style.opacity = (1 - clamp((p - 0.07) / 0.15)).toFixed(3);

    // .22 -> .9: continuous (exponential) zoom, so the speed feels constant to the eye
    const zp = clamp((p - 0.22) / 0.68);
    const s = Math.exp(Math.log(zoom) * easeCubic(zp));
    const rise = (1 - open) * 40;
    mb.style.transform = `translate(-50%, calc(-48.78% + ${rise.toFixed(1)}px)) scale(${s.toFixed(4)})`;

    // the page around the laptop darkens while we dive in, then the desktop melts into pure black
    const k = clamp((zp - 0.08) / 0.55);
    dark.style.opacity = k.toFixed(3);
    scene.classList.toggle('zooming', zp > 0);
    ui.style.opacity = (1 - clamp((zp - 0.6) / 0.22)).toFixed(3);
    wall.style.opacity = (1 - clamp((zp - 0.76) / 0.18)).toFixed(3);

    const t = clamp((p - 0.14) / 0.14);            // headline leaves as the zoom starts
    title.style.opacity = (1 - t).toFixed(3);
    title.style.transform = `translateY(${(-30 * t).toFixed(1)}px)`;
  }
  let ticking = false, active = true;
  new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active) update(); }, { rootMargin: "300px 0px" }).observe(scene);
  const onScroll = () => { if (!active || ticking) return; ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { layout(); update(); });
  window.addEventListener('load', () => { layout(); update(); });
  layout();
  update();
})();

/* Tiers: three upright cards fan out like playing cards while you scroll, and stay open (the scene ends here).
   Scroll progress is eased (inertia), so the opening stays fluid with a notchy mouse wheel. */
(function tiersScene() {
  const scene = $('#niveis');
  if (!scene) return;
  const L = $('#trL'), M = $('#trM'), Rr = $('#trR');
  const stage = $('#trStage'), labs = $('#trLabs');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scene.classList.add('static');
    L.style.transform = 'rotate(-17deg) translateX(-6%)';
    Rr.style.transform = 'rotate(17deg) translateX(6%)';
    M.style.transform = 'translateY(-5%)';
    labs.style.opacity = 1;
    return;
  }
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  let H = 380;

  function layout() { H = M.offsetHeight; }
  const readTarget = () => clamp(-scene.getBoundingClientRect().top / (scene.offsetHeight - window.innerHeight));

  function render(p) {
    // 0 -> .6: the stack opens like a hand of cards (pivot near the bottom of each card); then it just stays open
    const f = easeInOut(clamp(p / 0.6));
    L.style.transform = `rotate(${(-17 * f).toFixed(2)}deg) translate(${(-6 * f).toFixed(1)}%, 0)`;
    Rr.style.transform = `rotate(${(17 * f).toFixed(2)}deg) translate(${(6 * f).toFixed(1)}%, 0)`;
    M.style.transform = `translateY(${(-0.05 * H * f).toFixed(1)}px)`;

    const labIn = clamp((p - 0.35) / 0.25);
    labs.style.opacity = labIn.toFixed(3);
    labs.style.transform = `translateX(-50%) translateY(${((1 - labIn) * 16).toFixed(1)}px)`;
  }

  let target = 0, shown = 0, raf = 0, active = true;
  function tick() {
    shown += (target - shown) * 0.14;
    if (Math.abs(target - shown) < 0.0004) shown = target;
    render(shown);
    raf = shown !== target && active ? requestAnimationFrame(tick) : 0;
  }
  function kick() { target = readTarget(); if (!raf) raf = requestAnimationFrame(tick); }
  new IntersectionObserver(([e]) => {
    active = e.isIntersecting;
    if (active) { target = shown = readTarget(); render(shown); }
  }, { rootMargin: '300px 0px' }).observe(scene);
  window.addEventListener('scroll', () => { if (active) kick(); }, { passive: true });
  window.addEventListener('resize', () => { layout(); kick(); });
  window.addEventListener('load', () => { layout(); target = shown = readTarget(); render(shown); });
  layout();
  target = shown = readTarget();
  render(shown);
})();

/* Extra interactions for the lower sections (all lightweight: transforms/opacity only, rAF-throttled) */
(function interactions() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* 1. Directional entrances + stagger for the card grids */
  const dirs = {
    '.bento': ['left', 'up', 'right', 'scale', 'left', 'right'],
    '.rcg': ['scale', 'scale', 'scale', 'left', 'right'],
    '.sc-grid': ['left', 'up', 'right', 'scale']
  };
  Object.entries(dirs).forEach(([sel, list]) => {
    const grid = $(sel);
    if (!grid) return;
    [...grid.children].forEach((el, i) => {
      el.style.setProperty('--d', i * 0.09 + 's');
      if (!reduce) el.dataset.from = list[i % list.length];
    });
  });
  const cleanIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    setTimeout(() => el.removeAttribute('data-from'), 1700);   // so hover transitions stay snappy afterwards
    cleanIO.unobserve(el);
  }), { threshold: 0.1 });
  $$('[data-from]').forEach((el) => cleanIO.observe(el));

  /* 2. Headings light up word by word while you scroll past them */
  function wrapWords(node) {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') wrapWords(n);
    });
  }
  const heads = reduce ? [] : $$('.section-head h2, .hw-left h2, .cta h2');
  heads.forEach((h) => { wrapWords(h); h._words = $$('.w', h); h.classList.add('scrub'); });

  /* 3. Parallax for the decorative layers of "Como começar" */
  const hw = $('#como-funciona');
  const layers = hw && !reduce ? [
    [$('.hw-tape.t1', hw), -70], [$('.hw-tape.t2', hw), 70], [$('.hf-a', hw), -36], [$('.hf-b', hw), 44], [$('.hw-arc', hw), 40]
  ].filter(([el]) => el) : [];

  /* scroll loop */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vh = window.innerHeight;
      heads.forEach((h) => {
        const r = h.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = clamp((vh * 0.88 - r.top) / (vh * 0.42 + r.height));
        const n = h._words.length, lit = p * (n + 1);
        h._words.forEach((w, i) => w.classList.toggle('on', i < lit));
      });
      if (layers.length) {
        const r = hw.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          const p = clamp((vh - r.top) / (vh + r.height)) - 0.5;
          layers.forEach(([el, amp]) => { el.style.transform = `translate3d(0, ${(p * amp * 2).toFixed(1)}px, 0)`; });
        }
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* 4. Tilt + glare on the cards (pointer devices only) */
  if (fine && !reduce) {
    $$('.bc, .rc-card, .sc-card').forEach((card) => {
      let raf = 0;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transition = 'transform .12s ease-out, box-shadow .35s, background .35s, border-color .35s';
          card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-5px)`;
          card.style.setProperty('--mx', e.clientX - r.left + 'px');
          card.style.setProperty('--my', e.clientY - r.top + 'px');
        });
      });
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        card.style.transition = '';
        card.style.transform = '';
      });
    });

    /* 5. Magnetic buttons */
    $$('.btn, .hw-cta').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = `translate(${(dx * 0.16).toFixed(1)}px, ${(dy * 0.26).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* 6. Count-ups when first seen: "100%" in Recursos, and the simulator total */
  const stat = $('.rc-stat b');
  const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    if (e.target === stat) {
      if (reduce) return;
      const t0 = performance.now();
      (function step(now) {
        const k = Math.min((now - t0) / 1400, 1);
        stat.textContent = Math.round(100 * (1 - Math.pow(1 - k, 3))) + '%';
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    } else if (window.__simFirstView) window.__simFirstView();
  }), { threshold: 0.4 });
  if (stat) countIO.observe(stat);
  const simPanel = $('#simulador .sm-panel');
  if (simPanel) countIO.observe(simPanel);

  /* 7. FAQ: smooth open/close */
  $$('.faq details').forEach((d) => {
    const s = $('summary', d), body = $('p', d);
    s.addEventListener('click', (e) => {
      if (reduce || !body.animate) return;
      e.preventDefault();
      if (d._busy) return;
      d._busy = true;
      if (!d.open) {
        d.open = true;
        body.animate([{ height: '0px', opacity: 0 }, { height: body.scrollHeight + 'px', opacity: 1 }], { duration: 320, easing: 'ease' })
          .onfinish = () => { d._busy = false; };
      } else {
        body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 260, easing: 'ease' })
          .onfinish = () => { d.open = false; d._busy = false; };
      }
    });
  });
})();

/* Pause every CSS animation that lives in a section while that section is off screen (saves CPU/GPU) */
(function pauseOffscreen() {
  const secs = $$('main > section');
  if (!secs.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '250px 0px' });
  secs.forEach((s) => io.observe(s));
})();
