/* ============================================================================
   Interview Prep Guides — page engine (no dependencies)

   AUTHORING CONTRACT (content authors only need these attributes; never edit the engine):

   PAGE      <body data-guide="java">  … <main class="container"> <section class="section" id="s-jvm"> <h2>…</h2> …
   TERM CARD <article class="term-card" id="uniq" data-level="core|important|tough" data-freq="1-5" data-tags="a,b" data-type="concept|tool|pattern|code">
               <header class="term-head"><h3>Title</h3></header>
               <div class="term-body"><div class="inner"> .why .explanation figure.anim pre.code .walk .example table .pitfalls .followups .note </div></div>
             </article>
             (engine injects badges, stars, toggle chevron, "Read" checkbox; header text after <h3> is kept)
   CODE      <pre class="code" data-lang="java|sql|yaml|bash|properties|text"><code>…escape &lt; &gt;… <mark>key line</mark></code></pre>
   ANIM      <figure class="anim" data-anim="id" data-steps="N" [data-autoplay] [data-speed="1"] [data-loop] [data-title="…"]>
               <svg viewBox="…">
                 <g data-step="2">              visible from step 2 onward
                 <g data-step="2" data-until="3"> visible steps 2..3
                 <g data-step="1,4">            visible only on 1 and 4
                 <g data-step="3" data-fx="pulse|draw|slide-x|slide-y|highlight|fade">
                 <g data-move="1:0,0;3:120,0">  translate(x,y) per step; last defined step persists
               </svg>
               <div class="anim-captions"><p data-step="1">…</p></div>
             </figure>
   WALK      <div class="walk" data-walk="id" [data-title]>
               <pre class="code" data-lang="java"><code>…</code></pre>
               <ol class="walk-steps"><li data-lines="1-3,7" data-state='{"stack":[..],"heap":{k:v},"table":[[..]],"hi":[[r,c]],"msg":"…"}'>caption</li></ol>
             </div>
   QUIZ      <section class="quiz" data-quiz="java-s1" [data-title]>
               <div class="q" data-q="1" data-answer="b"><p class="q-text">…</p>
                 <label><input type="radio" name="java-s1-1" value="a"> …</label> …
                 <div class="q-explain">…</div></div>
             </section>
   PROBLEM   <article class="problem" id="uniq" data-diff="easy|medium|hard" [data-level="tough"] [data-hifreq] [data-walmart] [data-lc="two-sum"]>
               <header><h4>Title</h4></header>
               <div class="pbody"> .prompt .meta details.hint details.solution </div>
             </article>
   TRACKING  any element with data-track="read|problem" inside an element with an id is persisted.
   ============================================================================ */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const GUIDE = document.body.dataset.guide || 'misc';
  const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';

  /* ---------------------------------------------------------------- storage */
  const Store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };

  /* ---------------------------------------------------------------- progress */
  const Progress = {
    key: g => 'ip.progress.' + g,
    get(g) { return Store.get(this.key(g || GUIDE), { read: {}, problem: {}, quiz: {} }); },
    set(g, data) { data.updatedAt = Date.now(); Store.set(this.key(g || GUIDE), data); },
    mark(kind, id, val) { const p = this.get(); if (val) p[kind][id] = val; else delete p[kind][id]; this.set(GUIDE, p); render(); },
    counts(g) {
      const p = this.get(g);
      return { read: Object.keys(p.read).length, problem: Object.keys(p.problem).length, quiz: Object.keys(p.quiz).length };
    },
    /* totals are cached per guide so index.html can compute % without loading the page */
    totals(g) { return Store.get('ip.totals.' + (g || GUIDE), null); },
    saveTotals() {
      Store.set('ip.totals.' + GUIDE, { read: $$('.term-card').length, problem: $$('.problem').length, quiz: $$('.quiz .q').length });
    },
    pct(g) {
      const t = this.totals(g); if (!t) return 0;
      const c = this.counts(g);
      const part = (n, d, w) => d ? (Math.min(n, d) / d) * w : 0;
      const weights = { read: t.read ? 60 : 0, problem: t.problem ? 25 : 0, quiz: t.quiz ? 15 : 0 };
      const wsum = weights.read + weights.problem + weights.quiz || 1;
      return Math.round((part(c.read, t.read, weights.read) + part(c.problem, t.problem, weights.problem) + part(c.quiz, t.quiz, weights.quiz)) * 100 / wsum);
    },
    exportAll() {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('ip.')) out[k] = Store.get(k); }
      return JSON.stringify(out, null, 2);
    },
    importAll(json) { const o = JSON.parse(json); Object.keys(o).forEach(k => { if (k.startsWith('ip.')) Store.set(k, o[k]); }); }
  };

  function render() {
    const pct = Progress.pct(GUIDE);
    $$('.ring-wrap[data-guide="' + GUIDE + '"], .topbar .ring-wrap').forEach(w => Ring.set(w, pct));
    // TOC ticks
    const p = Progress.get();
    $$('.toc a[data-card]').forEach(a => a.classList.toggle('done', !!p.read[a.dataset.card]));
  }

  /* ---------------------------------------------------------------- rings */
  const Ring = {
    build(w) {
      if (w.querySelector('svg')) return;
      w.innerHTML = '<svg class="ring" viewBox="0 0 40 40"><circle class="track" cx="20" cy="20" r="17"/><circle class="fill" cx="20" cy="20" r="17"/></svg><span class="pct">0%</span>';
    },
    set(w, pct) {
      this.build(w);
      const c = w.querySelector('.fill'), circ = 2 * Math.PI * 17;
      c.style.strokeDasharray = circ; c.style.strokeDashoffset = circ * (1 - pct / 100);
      w.querySelector('.pct').textContent = pct + '%';
      w.setAttribute('aria-label', 'Progress ' + pct + '%');
    }
  };

  /* ---------------------------------------------------------------- theme */
  const Theme = {
    init() {
      const saved = Store.get('ip.theme', null);
      const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      this.sync();
    },
    toggle() {
      const d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = d; Store.set('ip.theme', d); this.sync();
    },
    sync() { const b = $('#theme-btn'); if (b) b.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'; }
  };

  /* ---------------------------------------------------------------- term cards */
  const LEVEL_LABEL = { tough: 'Tough', important: 'Important', core: 'Core' };
  const TYPE_LABEL = { concept: 'Concept', tool: 'Tool', pattern: 'Pattern', code: 'Code', theorem: 'Theorem', api: 'API' };

  function initCards() {
    const p = Progress.get();
    $$('.term-card').forEach(card => {
      const head = $('.term-head', card), body = $('.term-body', card);
      if (!head || !body) return;
      if (!$('.inner', body)) { const inner = document.createElement('div'); inner.className = 'inner'; while (body.firstChild) inner.appendChild(body.firstChild); body.appendChild(inner); }
      const level = card.dataset.level || 'core';
      const frag = document.createDocumentFragment();
      const lb = document.createElement('span'); lb.className = 'badge badge-' + level; lb.textContent = LEVEL_LABEL[level] || level; frag.appendChild(lb);
      if (card.dataset.type) { const tb = document.createElement('span'); tb.className = 'badge badge-' + card.dataset.type; tb.textContent = TYPE_LABEL[card.dataset.type] || card.dataset.type; frag.appendChild(tb); }
      const f = parseInt(card.dataset.freq || '0', 10);
      if (f) { const s = document.createElement('span'); s.className = 'stars'; s.title = 'Interview frequency ' + f + '/5'; s.innerHTML = '★'.repeat(f) + '<span class="off">' + '★'.repeat(5 - f) + '</span>'; frag.appendChild(s); }
      const done = document.createElement('label'); done.className = 'done'; done.innerHTML = '<input type="checkbox" data-track="read"> Read';
      const cb = done.querySelector('input'); cb.checked = !!p.read[card.id];
      done.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => Progress.mark('read', card.id, cb.checked));
      frag.appendChild(done);
      const tg = document.createElement('span'); tg.className = 'toggle'; tg.textContent = '▼'; frag.appendChild(tg);
      head.appendChild(frag);
      head.setAttribute('tabindex', '0'); head.setAttribute('role', 'button'); head.setAttribute('aria-expanded', 'false');
      const toggle = () => { card.classList.contains('open') ? closeCard(card) : openCard(card); };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      card.classList.add('reveal');
    });
    // Keep open cards sized correctly when inner content changes (animations, details)
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(entries => entries.forEach(en => { const card = en.target.closest('.term-card'); if (card && card.classList.contains('open')) $('.term-body', card).style.maxHeight = 'none'; }));
      $$('.term-body > .inner').forEach(i => ro.observe(i));
    }
  }
  function openCard(card) {
    const body = $('.term-body', card);
    card.classList.add('open'); $('.term-head', card).setAttribute('aria-expanded', 'true');
    body.style.maxHeight = body.scrollHeight + 'px';
    setTimeout(() => { if (card.classList.contains('open')) body.style.maxHeight = 'none'; }, 400);
    Anim.autoplayIn(card);
  }
  function closeCard(card) {
    const body = $('.term-body', card);
    body.style.maxHeight = body.scrollHeight + 'px';
    requestAnimationFrame(() => { body.style.maxHeight = '0px'; });
    card.classList.remove('open'); $('.term-head', card).setAttribute('aria-expanded', 'false');
  }

  /* ---------------------------------------------------------------- problems */
  function initProblems() {
    const p = Progress.get();
    $$('.problem').forEach(pr => {
      const head = $('header', pr); if (!head) return;
      const frag = document.createDocumentFragment();
      const diff = pr.dataset.diff;
      if (diff) { const b = document.createElement('span'); b.className = 'badge badge-' + diff; b.textContent = diff[0].toUpperCase() + diff.slice(1); frag.appendChild(b); }
      if (pr.dataset.level === 'tough') { const b = document.createElement('span'); b.className = 'badge badge-tough'; b.textContent = 'Tough'; frag.appendChild(b); }
      if ('hifreq' in pr.dataset) { const s = document.createElement('span'); s.className = 'hifreq'; s.title = 'High frequency'; s.textContent = '★ High-freq'; frag.appendChild(s); }
      if ('walmart' in pr.dataset) { const b = document.createElement('span'); b.className = 'badge badge-tool'; b.textContent = 'Walmart list'; frag.appendChild(b); }
      const done = document.createElement('label'); done.className = 'done'; done.innerHTML = '<input type="checkbox" data-track="problem"> Solved';
      const cb = done.querySelector('input'); cb.checked = !!p.problem[pr.id];
      done.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', () => Progress.mark('problem', pr.id, cb.checked));
      frag.appendChild(done);
      const tg = document.createElement('span'); tg.className = 'toggle'; tg.textContent = '▼'; frag.appendChild(tg);
      head.appendChild(frag);
      if (pr.dataset.lc) { const a = document.createElement('a'); a.className = 'lc'; a.href = 'https://leetcode.com/problems/' + pr.dataset.lc + '/'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'LeetCode ↗'; const body = $('.pbody', pr); if (body) body.prepend(a); }
      head.addEventListener('click', () => { pr.classList.toggle('open'); if (pr.classList.contains('open')) Anim.autoplayIn(pr); });
      pr.classList.add('reveal');
    });
  }

  /* ---------------------------------------------------------------- quiz */
  function initQuiz() {
    const p = Progress.get();
    $$('.quiz').forEach(qz => {
      const id = qz.dataset.quiz; const qs = $$('.q', qz);
      const head = document.createElement('div'); head.className = 'quiz-head';
      head.innerHTML = '<h3>📝 ' + (qz.dataset.title || 'Quick check') + '</h3><span class="score">0/' + qs.length + '</span>';
      qz.prepend(head);
      const foot = document.createElement('div'); foot.className = 'quiz-foot';
      foot.innerHTML = '<button class="btn" type="button">Reset quiz</button><span class="muted" style="font-size:.85em;color:var(--muted)">Answers are saved locally.</span>';
      qz.appendChild(foot);
      const score = $('.score', head);
      const update = () => {
        let ok = 0; qs.forEach(q => { if (q.dataset.result === 'ok') ok++; });
        score.textContent = ok + '/' + qs.length; score.style.background = ok === qs.length && qs.length ? 'var(--core)' : 'var(--brand)';
      };
      const lock = (q, choice, animate) => {
        const ans = q.dataset.answer; q.classList.add('locked');
        $$('label', q).forEach(l => {
          const inp = $('input', l); inp.disabled = true;
          if (inp.value === ans) l.classList.add('answer');
          if (inp.value === choice) { inp.checked = true; l.classList.add(choice === ans ? 'is-correct' : 'is-wrong'); }
          else if (inp.value === ans && choice !== ans) l.classList.add('is-correct');
        });
        q.dataset.result = choice === ans ? 'ok' : 'no';
      };
      qs.forEach(q => {
        const qid = id + '-' + q.dataset.q;
        $$('input', q).forEach(inp => inp.addEventListener('change', () => {
          lock(q, inp.value, true); update();
          const pr = Progress.get(); pr.quiz[qid] = inp.value; Progress.set(GUIDE, pr); render();
        }));
        if (p.quiz[qid]) lock(q, p.quiz[qid], false);
      });
      update();
      $('button', foot).addEventListener('click', () => {
        const pr = Progress.get();
        qs.forEach(q => { delete pr.quiz[id + '-' + q.dataset.q]; q.classList.remove('locked'); delete q.dataset.result; $$('label', q).forEach(l => { l.classList.remove('is-correct', 'is-wrong', 'answer'); const i = $('input', l); i.disabled = false; i.checked = false; }); });
        Progress.set(GUIDE, pr); update(); render();
      });
    });
  }

  /* ---------------------------------------------------------------- animation engine */
  class Anim {
    constructor(fig) {
      this.fig = fig; this.steps = parseInt(fig.dataset.steps || '1', 10); this.cur = 0; this.timer = null; this.playing = false;
      this.speed = parseFloat(fig.dataset.speed || '1'); this.loop = 'loop' in fig.dataset; this.played = false;
      this.items = $$('[data-step]', fig).filter(el => !el.closest('.anim-captions'));
      this.items.forEach(el => { el.__on = Anim.parse(el.dataset.step, el.dataset.until, this.steps); });
      this.movers = $$('[data-move]', fig).map(el => ({ el, map: Anim.parseMoves(el.dataset.move) }));
      this.caps = $$('.anim-captions p', fig);
      if (fig.dataset.title) { const t = document.createElement('div'); t.className = 'anim-title'; t.textContent = fig.dataset.title; fig.prepend(t); }
      this.buildControls();
      fig.setAttribute('tabindex', '0');
      fig.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.pause(); this.next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this.pause(); this.prev(); }
        else if (e.key === ' ') { e.preventDefault(); this.toggle(); }
      });
      this.goto(1);
      fig.__anim = this;
    }
    static parse(spec, until, max) {
      const set = new Set();
      if (until) { for (let i = parseInt(spec, 10); i <= parseInt(until, 10); i++) set.add(i); return set; }
      const parts = String(spec).split(',').map(s => s.trim());
      if (parts.length === 1 && !parts[0].includes('-')) { for (let i = parseInt(parts[0], 10); i <= max; i++) set.add(i); return set; }
      parts.forEach(p => { if (p.includes('-')) { const [a, b] = p.split('-').map(Number); for (let i = a; i <= b; i++) set.add(i); } else set.add(Number(p)); });
      return set;
    }
    static parseMoves(spec) {
      const m = {}; spec.split(';').forEach(s => { const [k, v] = s.split(':'); if (k && v) m[parseInt(k, 10)] = v.split(',').map(Number); }); return m;
    }
    buildControls() {
      const c = document.createElement('div'); c.className = 'anim-controls';
      c.innerHTML = '<button type="button" class="first" title="Restart" aria-label="Restart">⏮</button><button type="button" class="prev" title="Previous step" aria-label="Previous step">◀</button><button type="button" class="play" aria-label="Play">▶ Play</button><button type="button" class="next" title="Next step" aria-label="Next step">▶|</button><select aria-label="Speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><span class="stepinfo"></span><div class="bar"><i></i></div>';
      this.fig.appendChild(c);
      $('.first', c).addEventListener('click', () => { this.pause(); this.goto(1); });
      $('.prev', c).addEventListener('click', () => { this.pause(); this.prev(); });
      $('.next', c).addEventListener('click', () => { this.pause(); this.next(); });
      $('.play', c).addEventListener('click', () => this.toggle());
      const sel = $('select', c); sel.value = String(this.speed); sel.addEventListener('change', () => { this.speed = parseFloat(sel.value); });
      this.ctl = c;
    }
    goto(n) {
      this.cur = Math.max(1, Math.min(this.steps, n));
      this.items.forEach(el => { const on = el.__on.has(this.cur); el.classList.toggle('is-on', on); el.classList.toggle('is-off', !on); });
      this.movers.forEach(({ el, map }) => { let pos = null; for (let s = this.cur; s >= 1; s--) if (map[s]) { pos = map[s]; break; } if (!pos) pos = map[Object.keys(map)[0]] || [0, 0]; el.style.transform = 'translate(' + pos[0] + 'px,' + pos[1] + 'px)'; });
      let shown = null; this.caps.forEach(p => { const s = parseInt(p.dataset.step, 10); if (s <= this.cur && (shown === null || s >= shown)) shown = s; });
      this.caps.forEach(p => p.classList.toggle('is-on', parseInt(p.dataset.step, 10) === shown));
      $('.stepinfo', this.ctl).textContent = 'step ' + this.cur + '/' + this.steps;
      $('.bar i', this.ctl).style.width = (this.cur / this.steps * 100) + '%';
      this.fig.dataset.active = this.cur;
    }
    next() { if (this.cur < this.steps) this.goto(this.cur + 1); else if (this.loop && this.playing) this.goto(1); else this.pause(); }
    prev() { this.goto(this.cur - 1); }
    play() {
      if (this.playing) return; this.playing = true; this.played = true;
      $('.play', this.ctl).textContent = '⏸ Pause';
      if (this.cur >= this.steps) this.goto(1);
      const tick = () => { this.timer = setTimeout(() => { if (!this.playing) return; if (this.cur >= this.steps && !this.loop) { this.pause(); return; } this.next(); tick(); }, 1800 / this.speed); };
      tick();
    }
    pause() { this.playing = false; clearTimeout(this.timer); $('.play', this.ctl).textContent = this.cur >= this.steps ? '↻ Replay' : '▶ Play'; }
    toggle() { this.playing ? this.pause() : this.play(); }
    static initAll() {
      $$('figure.anim').forEach(f => { if (!f.__anim) new Anim(f); });
      if (REDUCED()) return;
      const io = new IntersectionObserver(entries => entries.forEach(en => {
        const a = en.target.__anim; if (!a) return;
        if (en.isIntersecting) { if ('autoplay' in en.target.dataset && !a.played && en.target.offsetParent) a.play(); }
        else if (a.playing) a.pause();
      }), { threshold: 0.5 });
      $$('figure.anim').forEach(f => io.observe(f));
    }
    static autoplayIn(root) {
      if (REDUCED()) return;
      setTimeout(() => $$('figure.anim[data-autoplay]', root).forEach(f => { const a = f.__anim; if (a && !a.played) { const r = f.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) a.play(); } }), 420);
    }
  }

  /* ---------------------------------------------------------------- code walkthrough */
  class Walk {
    constructor(root) {
      this.root = root; const pre = $('pre.code', root); const steps = $$('.walk-steps li', root);
      this.steps = steps.map(li => ({ lines: Walk.parseLines(li.dataset.lines), state: li.dataset.state ? JSON.parse(li.dataset.state) : null, html: li.innerHTML }));
      this.lines = $$('.ln', pre);
      const hasState = this.steps.some(s => s.state);
      const grid = document.createElement('div'); grid.className = 'walk-grid' + (hasState ? '' : ' no-state');
      pre.replaceWith(grid); grid.appendChild(pre);
      if (hasState) { this.panel = document.createElement('div'); this.panel.className = 'walk-state'; grid.appendChild(this.panel); }
      const caps = document.createElement('div'); caps.className = 'anim-captions';
      caps.innerHTML = this.steps.map((s, i) => '<p data-step="' + (i + 1) + '">' + s.html + '</p>').join('');
      root.appendChild(caps);
      // Reuse the Anim controller by faking a figure API
      this.fig = root; root.dataset.steps = this.steps.length; if (root.dataset.title) { const t = document.createElement('div'); t.className = 'anim-title'; t.textContent = root.dataset.title; root.prepend(t); delete root.dataset.title; }
      this.anim = new Anim(root); const orig = this.anim.goto.bind(this.anim);
      this.anim.goto = n => { orig(n); this.show(this.anim.cur); };
      this.prevState = null; this.show(1);
    }
    static parseLines(spec) { const s = new Set(); (spec || '').split(',').forEach(p => { p = p.trim(); if (!p) return; if (p.includes('-')) { const [a, b] = p.split('-').map(Number); for (let i = a; i <= b; i++) s.add(i); } else s.add(Number(p)); }); return s; }
    show(n) {
      const st = this.steps[n - 1]; if (!st) return;
      this.lines.forEach((l, i) => { const on = st.lines.has(i + 1); l.classList.toggle('is-active', on); l.classList.toggle('is-dim', st.lines.size > 0 && !on); });
      const first = this.lines.find((l, i) => st.lines.has(i + 1)); if (first) first.scrollIntoView({ block: 'nearest', behavior: REDUCED() ? 'auto' : 'smooth' });
      if (this.panel) this.renderState(st.state, this.prevState); this.prevState = st.state;
    }
    renderState(s, prev) {
      if (!s) { return; }
      let h = '';
      if (s.stack) h += '<h5>Stack</h5><div class="stack">' + s.stack.map(f => '<span>' + esc(f) + '</span>').join('') + '</div>';
      if (s.heap) h += '<h5>Heap / variables</h5><div class="heap">' + Object.keys(s.heap).map(k => { const ch = prev && prev.heap && String(prev.heap[k]) !== String(s.heap[k]); return '<span class="' + (ch ? 'changed' : '') + '"><b>' + esc(k) + '</b> = ' + esc(String(s.heap[k])) + '</span>'; }).join('') + '</div>';
      if (s.table) { const hi = new Set((s.hi || []).map(p => p.join(','))); const ok = new Set((s.ok || []).map(p => p.join(','))); h += '<h5>' + esc(s.tableTitle || 'Table') + '</h5><table class="grid">' + s.table.map((row, r) => '<tr>' + row.map((v, c) => '<td class="' + (hi.has(r + ',' + c) ? 'hi' : ok.has(r + ',' + c) ? 'ok' : '') + '">' + esc(String(v)) + '</td>').join('') + '</tr>').join('') + '</table>'; }
      if (s.msg) h += '<p class="msg">' + esc(s.msg) + '</p>';
      this.panel.innerHTML = h;
    }
    static initAll() { $$('.walk').forEach(w => { if (!w.__walk) w.__walk = new Walk(w); }); }
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------------------------------------------------------------- TOC + scroll spy */
  function buildToc() {
    const nav = $('.toc'); if (!nav) return;
    const sections = $$('main .section[id]');
    let html = '<h4>Contents</h4><ul>';
    sections.forEach(sec => {
      const h2 = $('h2', sec); if (!h2) return;
      const title = h2.childNodes[0].textContent.trim() || h2.textContent.trim();
      html += '<li><a href="#' + sec.id + '" data-sec="' + sec.id + '">' + esc(title) + '</a>';
      const cards = $$('.term-card[id]', sec);
      if (cards.length) {
        html += '<ul>' + cards.map(c => '<a href="#' + c.id + '" data-card="' + c.id + '">' + (c.dataset.level === 'tough' ? '<span class="dot" title="Tough"></span>' : '') + esc($('h3', c).textContent.trim()) + '<span class="tick">✓</span></a>').map(a => '<li>' + a + '</li>').join('') + '</ul>';
      }
      html += '</li>';
    });
    nav.innerHTML = html + '</ul>';
    nav.addEventListener('click', e => {
      const a = e.target.closest('a[data-card]'); if (!a) return;
      const card = document.getElementById(a.dataset.card); if (card && !card.classList.contains('open')) openCard(card);
      if (window.innerWidth <= 960) document.body.classList.remove('sidebar-open');
    });
    const links = $$('a[data-sec]', nav);
    const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { links.forEach(l => l.classList.toggle('active', l.dataset.sec === en.target.id)); } }), { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(s => io.observe(s));
  }

  /* ---------------------------------------------------------------- search & filters */
  const Filter = {
    text: '', level: 'all', toughOnly: false,
    apply() {
      const t = this.text.toLowerCase();
      $$('.section').forEach(sec => {
        let shown = 0, total = 0;
        $$('.term-card, .problem', sec).forEach(el => {
          total++;
          const lvl = el.dataset.level || (el.dataset.diff === 'hard' ? 'tough' : 'core');
          let ok = true;
          if (this.toughOnly && lvl !== 'tough') ok = false;
          if (this.level !== 'all' && lvl !== this.level) ok = false;
          if (ok && t) { const hay = (el.textContent + ' ' + (el.dataset.tags || '')).toLowerCase(); ok = hay.includes(t); }
          el.classList.toggle('is-hidden', !ok); if (ok) shown++;
        });
        const cnt = $('h2 .count', sec); if (cnt && total) cnt.textContent = (shown === total ? total : shown + ' of ' + total) + ' shown';
        sec.classList.toggle('is-empty', total > 0 && shown === 0);
        if (!$('.section-empty', sec) && total) { const e = document.createElement('p'); e.className = 'section-empty'; e.textContent = 'Nothing here matches the current filter.'; $('h2', sec).after(e); }
        if (t) $$('.term-card:not(.is-hidden)', sec).forEach(c => { if (!c.classList.contains('open')) openCard(c); });
      });
      document.body.classList.toggle('tough-only', this.toughOnly);
    }
  };
  function initSearch() {
    const inp = $('#search'); if (inp) { let tm; inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { Filter.text = inp.value.trim(); Filter.apply(); }, 150); }); }
    const tb = $('#tough-btn'); if (tb) tb.addEventListener('click', () => { Filter.toughOnly = !Filter.toughOnly; tb.setAttribute('aria-pressed', Filter.toughOnly); Filter.apply(); });
    $$('.filter-chips .chip').forEach(ch => ch.addEventListener('click', () => { $$('.filter-chips .chip').forEach(c => c.setAttribute('aria-pressed', 'false')); ch.setAttribute('aria-pressed', 'true'); Filter.level = ch.dataset.level; Filter.apply(); }));
    $$('.section').forEach(sec => { const h2 = $('h2', sec); if (h2 && !$('.count', h2) && $$('.term-card, .problem', sec).length) { const s = document.createElement('span'); s.className = 'count'; h2.appendChild(s); } });
    Filter.apply();
  }

  /* ---------------------------------------------------------------- shortcuts, misc */
  function initMisc() {
    const btt = $('.back-to-top');
    if (btt) { window.addEventListener('scroll', () => btt.classList.toggle('show', window.pageYOffset > 400), { passive: true }); btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: REDUCED() ? 'auto' : 'smooth' })); }
    const tb = $('#theme-btn'); if (tb) tb.addEventListener('click', () => Theme.toggle());
    const mb = $('#menu-btn'); if (mb) mb.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
    const sm = $('.settings-menu'); if (sm) {
      $('button.tb-btn', sm).addEventListener('click', e => { e.stopPropagation(); sm.classList.toggle('open'); });
      document.addEventListener('click', () => sm.classList.remove('open'));
      const act = {
        expand: () => $$('.term-card').forEach(openCard),
        collapse: () => $$('.term-card.open').forEach(closeCard),
        export: () => { const blob = new Blob([Progress.exportAll()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'interview-progress.json'; a.click(); },
        import: () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json'; i.onchange = () => { const r = new FileReader(); r.onload = () => { try { Progress.importAll(r.result); location.reload(); } catch (e) { alert('Invalid file'); } }; r.readAsText(i.files[0]); }; i.click(); },
        reset: () => { if (confirm('Clear all saved progress for this guide?')) { Store.del(Progress.key(GUIDE)); location.reload(); } },
        motion: () => { const h = document.documentElement; h.dataset.motion = h.dataset.motion === 'reduce' ? '' : 'reduce'; Store.set('ip.motion', h.dataset.motion); },
        shortcuts: () => $('.shortcuts-sheet').classList.add('show')
      };
      $$('.dropdown button', sm).forEach(b => b.addEventListener('click', () => act[b.dataset.act] && act[b.dataset.act]()));
    }
    const sheet = $('.shortcuts-sheet'); if (sheet) sheet.addEventListener('click', e => { if (e.target === sheet) sheet.classList.remove('show'); });
    if (Store.get('ip.motion', '') === 'reduce') document.documentElement.dataset.motion = 'reduce';

    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) { if (e.key === 'Escape') e.target.blur(); return; }
      const cards = $$('.term-card:not(.is-hidden)');
      const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('.term-card');
      let idx = focused ? cards.indexOf(focused) : -1;
      switch (e.key) {
        case '/': e.preventDefault(); const s = $('#search'); if (s) s.focus(); break;
        case 't': $('#tough-btn') && $('#tough-btn').click(); break;
        case 'd': Theme.toggle(); break;
        case '?': $('.shortcuts-sheet') && $('.shortcuts-sheet').classList.toggle('show'); break;
        case 'Escape': $('.shortcuts-sheet') && $('.shortcuts-sheet').classList.remove('show'); document.body.classList.remove('sidebar-open'); break;
        case 'j': case 'k': {
          if (!cards.length) break; e.preventDefault();
          idx = e.key === 'j' ? Math.min(cards.length - 1, idx + 1) : Math.max(0, idx - 1);
          const h = $('.term-head', cards[idx]); h.focus(); h.scrollIntoView({ block: 'center', behavior: REDUCED() ? 'auto' : 'smooth' }); break;
        }
      }
    });

    // Reveal-on-scroll
    if (!REDUCED() && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); const b = $('.badge-tough', en.target); if (b) b.classList.add('flash'); io.unobserve(en.target); } }), { threshold: 0.08 });
      $$('.reveal').forEach(el => io.observe(el));
    } else $$('.reveal').forEach(el => el.classList.add('in'));

    // Open card from hash on load / hash change
    const openHash = () => { const id = location.hash.slice(1); if (!id) return; const el = document.getElementById(id); if (!el) return; const card = el.closest('.term-card'); if (card) openCard(card); const pr = el.closest('.problem'); if (pr) pr.classList.add('open'); };
    window.addEventListener('hashchange', openHash); setTimeout(openHash, 50);

    // Tabs
    $$('.tabs').forEach(tabs => $$('button', tabs).forEach(b => b.addEventListener('click', () => {
      $$('button', tabs).forEach(x => x.setAttribute('aria-selected', 'false')); b.setAttribute('aria-selected', 'true');
      const wrap = tabs.parentElement; $$('.tab-panel', wrap).forEach(p => p.classList.toggle('active', p.id === b.dataset.tab));
    })));
  }

  /* ---------------------------------------------------------------- hub (index.html) */
  function initHub() {
    $$('.hub-card[data-guide]').forEach(card => {
      const g = card.dataset.guide; const w = $('.ring-wrap', card); const pct = Progress.pct(g); Ring.set(w, pct);
      const c = Progress.counts(g), t = Progress.totals(g);
      const st = $('.stat', card); if (st) st.textContent = t ? (c.read + '/' + t.read + ' topics · ' + c.problem + '/' + t.problem + ' problems') : 'Not started';
    });
    const all = $$('.hub-card[data-guide]').map(c => Progress.pct(c.dataset.guide));
    const ov = $('#overall'); if (ov) Ring.set(ov, Math.round(all.reduce((a, b) => a + b, 0) / (all.length || 1)));
  }

  /* ---------------------------------------------------------------- boot */
  Theme.init();
  document.addEventListener('DOMContentLoaded', () => {
    if (window.Highlight) Highlight.highlightAll();
    if (document.body.classList.contains('hub')) { initHub(); initMisc(); return; }
    initCards(); initProblems(); initQuiz(); Anim.initAll(); Walk.initAll(); buildToc(); initSearch(); initMisc();
    Progress.saveTotals(); render();
    const t = $('.topbar .ring-wrap'); if (t) Ring.set(t, Progress.pct(GUIDE));
  });

  window.Guide = { Progress, Anim, Walk, openCard, closeCard, Filter };
})();
