/* Cigars & More: page behavior. No dependencies. */
(() => {
  'use strict';
  const B = window.CM_BUSINESS || {};
  const PLAN = window.CM_MEDIA_PLAN || { humidor: [], gallery: [], story: [] };
  const FILES = window.CM_MEDIA_FILES || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
    return n;
  };
  document.documentElement.classList.remove('no-js');

  /* ---------------- Media ---------------- */
  const srcset = (sizes, fmt) => sizes.map((s) => `${s[fmt]} ${s.w}w`).join(', ');
  const largest = (sizes) => sizes[sizes.length - 1];

  function pending(source, note) {
    return el('div', { class: 'pending', role: 'img', 'aria-label': `Photo pending: ${source}` },
      el('span', { class: 'pending__tag', text: 'Photo pending' }),
      el('span', { class: 'pending__file', text: source }),
      note ? el('span', { class: 'pending__note', text: note }) : null);
  }

  /** Build a .media box for a slot. Falls back to a labeled pending panel. */
  function media(slot, { source, alt = '', sizes = '100vw', eager = false, mobile = false, position } = {}) {
    const box = el('div', { class: 'media' });
    const f = FILES[slot];
    const set = f && (f.sizes || (f.poster));
    if (!set || !set.length) {
      box.append(pending(source || slot, 'Run the media pipeline with the original file to fill this spot.'));
      return box;
    }
    const pic = el('picture');
    if (mobile && f.mobile) {
      pic.append(el('source', { media: '(max-width: 700px)', type: 'image/webp', srcset: srcset(f.mobile, 'webp'), sizes: '100vw' }));
      pic.append(el('source', { media: '(max-width: 700px)', srcset: srcset(f.mobile, 'jpg'), sizes: '100vw' }));
    }
    pic.append(el('source', { type: 'image/webp', srcset: srcset(set, 'webp'), sizes }));
    const top = largest(set);
    const img = el('img', {
      src: set[Math.min(1, set.length - 1)].jpg, srcset: srcset(set, 'jpg'), sizes, alt,
      width: top.w, height: top.h, loading: eager ? 'eager' : 'lazy', decoding: 'async',
      fetchpriority: eager ? 'high' : null,
    });
    if (position) img.style.objectPosition = position;
    const done = () => img.classList.add('is-loaded');
    img.addEventListener('load', done);
    img.addEventListener('error', () => { pic.remove(); box.append(pending(source || slot, 'This image failed to load.')); });
    pic.append(img);
    box.append(pic);
    if (img.complete && img.naturalWidth) done();
    return box;
  }

  const hiRes = (slot) => {
    const f = FILES[slot];
    const set = f && (f.sizes || f.poster);
    return set && set.length ? largest(set) : null;
  };

  /* ---------------- Business facts ---------------- */
  function renderBusiness() {
    const age = Number(B.minimumAge) || 21;
    const ageText = `Adults only. You must be ${age} or older to buy tobacco or nicotine products. ID required.`;
    $('[data-age-line]').textContent = `${age}+ only`;
    $('[data-age-note]').textContent = ageText;
    $('[data-footer-age]').textContent = ageText;
    $$('[data-biz="descriptor"]').forEach((n) => { if (B.descriptor) n.textContent = B.descriptor; });

    const tbd = () => el('span', { class: 'tbd', title: 'Development placeholder: fill from the verified business brief' }, 'Pending verification');
    const addr = B.address;
    const addrLine = addr ? [addr.street, [addr.city, addr.state].filter(Boolean).join(', '), addr.zip].filter(Boolean).join(' · ') : null;
    const mapsUrl = addr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([B.officialName || B.signName, addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', '))}` : null;
    const tel = B.phone ? `tel:${B.phone.replace(/[^\d+]/g, '')}` : null;

    const rows = [
      ['Address', addrLine ? el('span', {}, addrLine) : tbd()],
      ['Hours', Array.isArray(B.hours) && B.hours.length
        ? el('ul', { class: 'hours' }, B.hours.map((h) => el('li', {}, el('span', { text: h.days }), el('span', { text: h.time }))))
        : tbd()],
      ['Phone', B.phone ? el('a', { href: tel, text: B.phone }) : tbd()],
    ];
    if (B.parking) rows.push(['Parking', el('span', { text: B.parking })]);
    if (B.accessibility) rows.push(['Access', el('span', { text: B.accessibility })]);
    if (B.website) rows.push(['Website', el('a', { href: B.website, rel: 'noopener', target: '_blank', text: B.website.replace(/^https?:\/\//, '').replace(/\/$/, '') })]);
    for (const s of B.social || []) rows.push([s.label, el('a', { href: s.url, rel: 'noopener', target: '_blank', text: s.label })]);
    const facts = $('[data-facts]');
    rows.forEach(([k, v]) => facts.append(el('div', {}, el('dt', { text: k }), el('dd', {}, v))));

    const actions = $('[data-visit-actions]');
    if (mapsUrl) actions.append(el('a', { class: 'btn btn--solid', href: mapsUrl, target: '_blank', rel: 'noopener', text: 'Get directions' }));
    if (tel) actions.append(el('a', { class: 'btn btn--outline', href: tel, text: `Call ${B.phone}` }));
    if (!actions.children.length) actions.remove();

    const mv = $('[data-menu-visit]');
    if (addrLine) mv.append(el('span', { text: addrLine }));
    if (mapsUrl) mv.append(el('a', { class: 'btn btn--solid', href: mapsUrl, target: '_blank', rel: 'noopener', text: 'Get directions' }));
    if (tel) mv.append(el('a', { class: 'btn btn--outline', href: tel, text: `Call ${B.phone}` }));
    if (!mv.children.length) mv.append(el('a', { class: 'btn btn--solid', href: '#visit', 'data-navlink': '', text: 'Visit the Store' }));

    $('[data-footer-address]').textContent = addrLine || 'Address pending verification';
    if (B.story) {
      const story = $('[data-story]');
      story.prepend(el('p', { text: B.story }));
    }
  }

  /* ---------------- Static slots ---------------- */
  function renderSlots() {
    const hero = PLAN.hero || {};
    $('[data-hero]').append(media('hero', { source: hero.source, alt: hero.alt, eager: true, mobile: true, position: hero.position }));
    const storeAlt = Object.fromEntries((PLAN.story || []).map((s) => [s.slot, s]));
    $$('[data-slot]').forEach((fig) => {
      const slot = fig.dataset.slot;
      const s = slot === 'hero' ? hero : storeAlt[slot] || {};
      fig.append(media(slot, { source: s.source, alt: s.alt, sizes: '(max-width: 900px) 90vw, 50vw' }));
    });
  }

  /* ---------------- Inspector (full screen zoom) ---------------- */
  const Inspector = (() => {
    const dlg = $('[data-inspector]');
    const canvas = $('[data-canvas]', dlg);
    const frame = $('[data-frame]', dlg);
    const title = $('[data-ins-title]', dlg);
    const zoomLabel = $('[data-zoom-level]', dlg);
    const status = $('[data-ins-status]', dlg);
    const prevBtn = $('[data-ins-prev]', dlg);
    const nextBtn = $('[data-ins-next]', dlg);
    let items = [], index = 0, onChange = null, returnFocus = null;
    let s = 1, tx = 0, ty = 0;
    const MIN = 1, MAX = 5;
    const pointers = new Map();
    let pinch = null, drag = null, lastTap = 0;

    const apply = (animate) => {
      frame.style.transition = animate && !reduceMotion.matches ? 'transform 260ms cubic-bezier(.22,1,.36,1)' : 'none';
      frame.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
      zoomLabel.textContent = `${Math.round(s * 100)}%`;
    };
    const clamp = () => {
      const r = canvas.getBoundingClientRect();
      const minX = r.width - r.width * s, minY = r.height - r.height * s;
      tx = Math.min(0, Math.max(minX, tx));
      ty = Math.min(0, Math.max(minY, ty));
      if (s <= 1) { tx = 0; ty = 0; }
    };
    const zoomAt = (ns, cx, cy, animate) => {
      ns = Math.min(MAX, Math.max(MIN, ns));
      const r = canvas.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      tx = px - (px - tx) * (ns / s);
      ty = py - (py - ty) * (ns / s);
      s = ns; clamp(); apply(animate);
    };
    const zoomCenter = (f) => { const r = canvas.getBoundingClientRect(); zoomAt(s * f, r.left + r.width / 2, r.top + r.height / 2, true); };
    const reset = () => { s = 1; tx = 0; ty = 0; apply(true); };

    function show(i) {
      index = (i + items.length) % items.length;
      const it = items[index];
      reset();
      frame.replaceChildren();
      status.hidden = true;
      title.textContent = it.title || '';
      const top = hiRes(it.slot);
      if (!top) {
        frame.append(pending(it.source || it.slot, 'Original photograph not prepared yet.'));
      } else {
        status.hidden = false; status.textContent = 'Loading full-resolution photo…';
        const img = el('img', { alt: it.alt || '', draggable: 'false' });
        img.addEventListener('load', () => { status.hidden = true; });
        img.addEventListener('error', () => { status.hidden = false; status.textContent = 'This photo could not be loaded.'; });
        img.src = top.webp;
        frame.append(img);
      }
      const multi = items.length > 1;
      prevBtn.hidden = nextBtn.hidden = !multi;
      if (onChange) onChange(index);
    }

    function open(list, i, opts = {}) {
      items = list; onChange = opts.onChange || null; returnFocus = document.activeElement;
      show(i);
      dlg.showModal();
      document.body.style.overflow = 'hidden';
    }
    dlg.addEventListener('close', () => {
      document.body.style.overflow = '';
      frame.replaceChildren();
      if (returnFocus && returnFocus.focus) returnFocus.focus();
    });
    $('[data-close]', dlg).addEventListener('click', () => dlg.close());
    $('[data-zoom-in]', dlg).addEventListener('click', () => zoomCenter(1.5));
    $('[data-zoom-out]', dlg).addEventListener('click', () => zoomCenter(1 / 1.5));
    $('[data-zoom-reset]', dlg).addEventListener('click', reset);
    prevBtn.addEventListener('click', () => show(index - 1));
    nextBtn.addEventListener('click', () => show(index + 1));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && s === 1) { e.preventDefault(); show(index + 1); }
      else if (e.key === 'ArrowLeft' && s === 1) { e.preventDefault(); show(index - 1); }
      else if (e.key === '+' || e.key === '=') zoomCenter(1.5);
      else if (e.key === '-') zoomCenter(1 / 1.5);
      else if (e.key === '0') reset();
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomAt(s * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY, false);
    }, { passive: false });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s };
        drag = null;
      } else {
        drag = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
        const now = Date.now();
        if (now - lastTap < 300) { s > 1 ? reset() : zoomAt(2.5, e.clientX, e.clientY, true); drag = null; }
        lastTap = now;
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt(pinch.s * d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2, false);
      } else if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; canvas.classList.add('is-dragging'); }
        if (s > 1) { tx = drag.tx + dx; ty = drag.ty + dy; clamp(); apply(false); }
      }
    });
    const end = (e) => {
      if (drag && drag.moved && s === 1 && items.length > 1) {
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 60) show(index + (dx < 0 ? 1 : -1));
      }
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!pointers.size) { drag = null; canvas.classList.remove('is-dragging'); }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    return { open };
  })();

  /* ---------------- Digital Humidor ---------------- */
  function initHumidor() {
    const root = $('[data-viewer]');
    const scenes = PLAN.humidor || [];
    if (!root || !scenes.length) return;
    const stage = $('[data-stage]', root);
    const sceneWrap = $('[data-scenes]', root);
    const tabs = $('[data-tabs]', root);
    const count = $('[data-count]', root);
    const caption = $('[data-caption]', root);
    const hotWrap = $('[data-hotspots]', root);
    const pad = (n) => String(n).padStart(2, '0');
    let current = -1;

    const sceneEls = scenes.map((sc, i) => {
      const n = el('div', { class: 'scene', id: `scene-${i}`, role: 'tabpanel', 'aria-labelledby': `tab-${i}`, 'aria-hidden': 'true' });
      // Only the first scene loads immediately; others load when the section nears the viewport.
      n.dataset.idx = i;
      sceneWrap.append(n);
      return n;
    });
    const loadScene = (i) => {
      const n = sceneEls[i];
      if (n.dataset.loaded) return;
      n.dataset.loaded = '1';
      const sc = scenes[i];
      n.append(media(sc.slot, { source: sc.source, alt: sc.alt, sizes: '(max-width: 1320px) 100vw, 1320px', eager: i === 0 }));
    };
    const tabEls = scenes.map((sc, i) => {
      const thumb = el('span', { class: 'tab__thumb' });
      const t = el('button', {
        class: 'tab', type: 'button', role: 'tab', id: `tab-${i}`, 'aria-controls': `scene-${i}`,
        'aria-selected': 'false', tabindex: '-1', onclick: () => go(i),
      }, thumb, el('span', { class: 'tab__label' }, el('span', { class: 'tab__num', text: pad(i + 1) }), sc.label));
      thumb.append(media(sc.slot, { source: sc.source, alt: '', sizes: '170px' }));
      tabs.append(t);
      return t;
    });
    tabs.addEventListener('keydown', (e) => {
      const k = e.key;
      let n = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = current + 1;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') n = current - 1;
      else if (k === 'Home') n = 0;
      else if (k === 'End') n = scenes.length - 1;
      if (n == null) return;
      e.preventDefault();
      go(n);
      tabEls[current].focus();
    });

    function renderHotspots(sc) {
      hotWrap.replaceChildren();
      if (!FILES[sc.slot]) return; // hotspots describe real image content only
      (sc.hotspots || []).forEach((h) => {
        const tip = el('span', { class: 'hotspot__tip', role: 'tooltip' }, el('strong', { text: h.title }), h.text || '');
        const b = el('button', { class: 'hotspot', type: 'button', 'aria-expanded': 'false', 'aria-label': h.title, style: `left:${h.x}%;top:${h.y}%` }, tip);
        b.addEventListener('click', () => b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'));
        b.addEventListener('blur', () => b.setAttribute('aria-expanded', 'false'));
        hotWrap.append(b);
      });
    }

    function go(i) {
      i = (i + scenes.length) % scenes.length;
      if (i === current) return;
      const dir = current === -1 ? 0 : (i > current ? 1 : -1);
      const prev = sceneEls[current];
      loadScene(i);
      if (i + 1 < scenes.length) loadScene(i + 1);
      const next = sceneEls[i];
      // Incoming scene starts offset in the direction of travel; outgoing drifts the other way.
      next.style.setProperty('--dx', `${dir * 4}%`);
      next.classList.remove('is-leaving');
      void next.offsetWidth;
      next.classList.add('is-active');
      next.setAttribute('aria-hidden', 'false');
      if (prev) {
        prev.style.setProperty('--dx', `${dir * -3}%`);
        prev.classList.remove('is-active');
        prev.classList.add('is-leaving');
        prev.setAttribute('aria-hidden', 'true');
        setTimeout(() => prev.classList.remove('is-leaving'), 800);
      }
      tabEls.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      const tb = tabEls[i];
      tabs.scrollTo({ left: tb.offsetLeft - tabs.clientWidth / 2 + tb.clientWidth / 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      current = i;
      count.textContent = `${pad(i + 1)} / ${pad(scenes.length)}`;
      caption.textContent = `${scenes[i].label} · ${scenes[i].caption}`;
      renderHotspots(scenes[i]);
    }

    $('[data-prev]', root).addEventListener('click', () => go(current - 1));
    $('[data-next]', root).addEventListener('click', () => go(current + 1));
    $('[data-inspect]', root).addEventListener('click', () => {
      Inspector.open(scenes.map((sc) => ({ slot: sc.slot, source: sc.source, alt: sc.alt, title: `${sc.label} · ${sc.caption}` })), current, { onChange: (k) => go(k) });
    });
    stage.addEventListener('dblclick', () => $('[data-inspect]', root).click());

    // Horizontal swipe changes view; vertical movement scrolls the page (touch-action: pan-y).
    let sx = null, sy = null;
    stage.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; sx = e.clientX; sy = e.clientY; });
    stage.addEventListener('pointerup', (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(current + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', () => { sx = null; });
    stage.addEventListener('dragstart', (e) => e.preventDefault()); // native image drag would cancel the swipe

    // Subtle depth: the active photo drifts a few pixels with the pointer (fine pointers only).
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    stage.addEventListener('pointermove', (e) => {
      if (!fine.matches || reduceMotion.matches) return;
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      const a = sceneEls[current];
      if (a) { a.style.setProperty('--px', `${(-nx * 14).toFixed(1)}px`); a.style.setProperty('--py', `${(-ny * 10).toFixed(1)}px`); }
    });
    stage.addEventListener('pointerleave', () => {
      const a = sceneEls[current];
      if (a) { a.style.setProperty('--px', '0px'); a.style.setProperty('--py', '0px'); }
    });

    go(0);
    // Preload the rest once the section approaches.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { scenes.forEach((_, k) => loadScene(k)); io.disconnect(); }
    }, { rootMargin: '400px 0px' });
    io.observe(root);
  }

  /* ---------------- Gallery ---------------- */
  function initGallery() {
    const grid = $('[data-gallery]');
    const items = PLAN.gallery || [];
    const viewable = items.filter((it) => it.kind === 'image' || FILES[it.slot]?.poster);
    items.forEach((it) => {
      const cls = ['tile', it.feature ? 'tile--feature' : '', it.wide ? 'tile--wide' : ''].filter(Boolean).join(' ');
      const fig = el('figure', { class: `${cls} reveal` });
      const f = FILES[it.slot];
      const box = media(it.slot, { source: it.source, alt: it.alt, sizes: it.feature ? '(max-width: 900px) 100vw, 58vw' : '(max-width: 900px) 100vw, 40vw' });
      fig.append(box);
      if (it.kind === 'video' && f && f.clip) {
        const btn = el('button', { class: 'play', type: 'button', 'aria-label': `Play video: ${it.title}` },
          el('span', { class: 'play__icon', 'aria-hidden': 'true', text: '▶' }), `Play · ${Math.round(f.clip.seconds)}s`);
        btn.addEventListener('click', () => {
          const v = el('video', { src: f.clip.mp4, poster: f.poster[0].jpg, controls: true, muted: true, playsinline: true, preload: 'metadata', 'aria-label': it.alt });
          v.muted = true;
          v.addEventListener('error', () => box.replaceChildren(pending(it.source, 'This video could not be played.')));
          box.replaceChildren(v);
          btn.remove();
          v.play().catch(() => {});
          v.focus();
        });
        fig.append(btn);
      } else if (it.kind === 'image' || (f && f.poster)) {
        const vi = viewable.indexOf(it);
        fig.append(el('button', {
          class: 'tile__btn', type: 'button', 'aria-label': `Open larger: ${it.title}`,
          onclick: () => Inspector.open(viewable.map((v) => ({ slot: v.slot, source: v.source, alt: v.alt, title: v.title })), vi),
        }));
      }
      fig.append(el('figcaption', { class: 'tile__cap' }, el('strong', { text: it.title }), el('span', { text: it.kind === 'video' ? 'Video' : 'Photo' })));
      grid.append(fig);
    });
  }

  /* ---------------- Navigation ---------------- */
  function initNav() {
    const nav = $('[data-nav]');
    const toggle = $('[data-menu-toggle]');
    const menu = $('[data-menu]');
    const hero = $('.hero');
    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      nav.classList.toggle('menu-open', open);
      if (open) $('a', menu)?.focus();
    };
    toggle.addEventListener('click', () => setMenu(menu.hidden));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-menu] a')) setMenu(false);
      else if (!menu.hidden && !e.target.closest('[data-nav]')) setMenu(false);
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

    new IntersectionObserver(([en]) => nav.classList.toggle('is-solid', !en.isIntersecting), { rootMargin: `-${80}px 0px 0px 0px` })
      .observe($('.hero__title') || hero);

    const links = $$('[data-navlink]');
    const ids = ['store', 'humidor', 'interior', 'visit'];
    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => visible.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
      let best = null, bestR = 0;
      ids.forEach((id) => { const r = visible.get(id) || 0; if (r > bestR) { best = id; bestR = r; } });
      links.forEach((a) => {
        const on = best && a.getAttribute('href') === `#${best}`;
        a.classList.toggle('is-active', !!on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }, { threshold: [0, 0.15, 0.3, 0.5, 0.75], rootMargin: '-30% 0px -40% 0px' });
    ids.forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------------- Reveal ---------------- */
  function initReveal() {
    const els = $$('.reveal');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const show = (e) => { e.classList.add('is-in'); io.unobserve(e); };
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      show(en.target);
      // A fast jump can skip sections entirely; never leave anything above the fold hidden.
      const top = en.target.getBoundingClientRect().top;
      els.forEach((e) => { if (!e.classList.contains('is-in') && e.getBoundingClientRect().bottom < top) show(e); });
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }

  renderBusiness();
  renderSlots();
  initHumidor();
  initGallery();
  initNav();
  initReveal();
})();
