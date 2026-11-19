/* SenseFrame UI mockup — view switching, theme, and the mock run data.
   No backend: everything here is stand-in data for the design review. */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------- theme */

const THEME_KEY = 'senseframe-theme';

function setTheme(mode) {
  document.documentElement.dataset.theme = mode;
  $$('#theme button').forEach(b => b.classList.toggle('is-on', b.dataset.themeSet === mode));
  try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* private window */ }
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
  // Dark is the design's home — the bento cards and the spectrum were drawn
  // for a near-black canvas. A saved choice still wins.
  setTheme(saved || 'dark');
})();

$$('#theme button').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));

/* -------------------------------------------------------------- views */

// Drives whatever panes exist rather than a fixed list, so a stale cached
// index.html can't throw partway through and leave every pane hidden.
function goto(pane) {
  const panes = $$('.pane');
  if (!panes.some(p => p.id === 'pane-' + pane)) pane = 'empty';
  panes.forEach(p => { p.hidden = p.id !== 'pane-' + pane; });
  // A run and its preview both read as part of Runs, so that nav item stays lit.
  const lit = (pane === 'run' || pane === 'preview') ? 'runs' : pane;
  $$('.nav-item[data-goto]').forEach(b =>
    b.classList.toggle('is-active', b.dataset.goto === lit));
}

$('#do-login').addEventListener('click', () => {
  $('#view-login').hidden = true;
  $('#view-app').hidden = false;
});

$$('[data-goto]').forEach(b => b.addEventListener('click', () => goto(b.dataset.goto)));

$('#url').addEventListener('keydown', e => { if (e.key === 'Enter') $('#do-capture').click(); });

/* --------------------------------------------------------- run view */

let RUN = null;

const band = n => (n == null ? '' : n >= 85 ? '' : n >= 60 ? 'warn' : 'bad');

// The stepper used to be fixed markup that always read "3 Review", so a
// finished run looked like it was still working.
const STEPS = ['Capture', 'Clone', 'Review', 'Elementor', 'Live'];

function renderStepper(run, at) {
  $('#stepper').innerHTML = STEPS.map((name, i) => {
    const cls = i < at ? 'done' : i === at ? 'now' : '';
    const num = i < at ? '&#10003;' : i + 1;
    return `<span class="step ${cls}"><span class="num">${num}</span> ${name}</span>`;
  }).join('<span class="step-sep"></span>');
}

function renderRun(run) {
  RUN = run;
  // Captured and cloned by definition; scored means Review is reached.
  renderStepper(run, run.elementor ? 3 : 2);
  const host = $('#sections');
  host.innerHTML = '';

  $('#run-title').textContent = run.title ? run.title.split('—')[0].trim() : run.slug;
  $('#run-stack').textContent = run.stack || 'unknown';
  $('#run-url').textContent = run.source_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const mean = run.mean_score;
  const fid = $('#run-fidelity');
  fid.className = 'chip chip-' + (band(mean) === '' ? 'good' : band(mean) === 'warn' ? 'warn' : 'bad');
  fid.innerHTML = `<span class="dot"></span> ${mean == null ? 'not scored' : mean + ' mean fidelity'}`;
  $('#sec-count').textContent = run.sections.length;

  run.sections.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'sec' + (i === 0 ? ' is-active' : '');
    b.innerHTML =
      `<span class="sec-bar ${band(s.score)}"></span>
       <span class="sec-txt">
         <span class="sec-name">${s.name}</span>
         <span class="sec-meta">${s.id} &middot; ${s.blocks} blocks &middot; ${s.height}px</span>
       </span>
       <span class="score ${band(s.score)}">${s.score == null ? '—' : s.score}</span>`;
    b.addEventListener('click', () => {
      $$('.sec', host).forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      showSection(s);
    });
    host.appendChild(b);
  });

  renderTicks(run);
  renderRail(run);
  if (run.sections.length) showSection(run.sections[0]);
}

function showSection(s) {
  const put = (sel, src) => {
    const el = $(sel);
    el.innerHTML = src
      ? `<img src="${src}" alt="">`
      : '<div class="shot-empty">no screenshot</div>';
  };
  put('#shot-src', s.shots && s.shots.src);
  put('#shot-cln', s.shots && s.shots.cln);
  $('#shot-score').textContent = s.score == null ? '—' : s.score;
  $('#shot-score').className = 'chip chip-' + (band(s.score) === '' ? 'good' : band(s.score) === 'warn' ? 'warn' : 'bad');
  const d = $('#delta');
  const bits = [];
  if (s.parts) {
    bits.push(`<strong>Colour ${s.parts.colour} &middot; layout ${s.parts.layout} ` +
              `&middot; detail ${s.parts.detail}.</strong>`);
  }
  if (s.regions && s.regions.length) {
    bits.push('Largest differences: ' + s.regions.map(r => `${r.where} ${r.diff}%`).join(', ') + '.');
  }
  d.hidden = !bits.length;
  d.innerHTML = bits.join(' ');
}

function renderTicks(run) {
  const host = $('#ticks');
  host.innerHTML = '';
  run.sections.forEach((s, i) => {
    const t = document.createElement('button');
    const v = s.score == null ? 0 : s.score;
    t.className = 'tick ' + band(s.score);
    t.title = `${s.id} ${s.name} — ${s.score == null ? 'not scored' : s.score}`;
    t.innerHTML = `<i style="height:${6 + v * 0.26}px"></i><span>${s.id}</span>`;
    t.addEventListener('click', () => {
      $$('.sec', $('#sections'))[i].click();
      $$('.tick', host).forEach(x => x.classList.remove('is-on'));
      t.classList.add('is-on');
    });
    host.appendChild(t);
  });
  const first = $('.tick', host);
  if (first) first.classList.add('is-on');
}

function renderRail(run) {
  const m = run.lead_motion;
  const props = m ? m.properties.map(p =>
    `${p.name} ${p.from ?? p.from_px}&rarr;${p.to ?? p.to_px}`).join(', ') : null;
  $('#rail-motion').innerHTML = m
    ? `<div class="kv"><span>Dominant</span><b>${props}</b></div>
       <div class="kv"><span>Duration</span><b>${m.duration_ms}ms, stagger ${m.stagger_ms}ms</b></div>
       <div class="kv"><span>Applies to</span><b>${m.applies_to} elements</b></div>
       <div class="kv"><span>Method</span><b>${m.method}, confidence ${m.confidence}</b></div>`
    : '<p>No entrance motion detected.</p>';

  const counts = Object.entries(run.motion_counts || {})
    .map(([k, v]) => `${v} ${k}`).join(', ') || 'none';
  $('#rail-facts').innerHTML =
    `<div class="kv"><span>Source</span><b>${run.page_height}px</b></div>
     <div class="kv"><span>Clone</span><b>${run.clone_height ?? '—'}px${
       run.height_ratio ? ` (${run.height_ratio}&times;)` : ''}</b></div>
     <div class="kv"><span>Tracked</span><b>${run.tracked} elements</b></div>
     <div class="kv"><span>Motion</span><b>${counts}</b></div>`;

  const flags = $('#rail-flags');
  const w = run.warnings || [];
  flags.innerHTML = w.length
    ? w.map(x => `<div class="flag"><i></i><div><strong>${x.code || x}</strong>
        <span>${x.msg || ''}</span></div></div>`).join('')
    : '<div class="flag"><i style="background:var(--good)"></i><div>'
      + '<strong>No capture warnings</strong><span>Nothing flagged on this page</span></div></div>';
}

/* Runs are listed, not preloaded. The app used to fetch one hardcoded run on
   startup, so every visit landed on the same old capture. */

function card(r) {
  const s = r.mean_score;
  const cls = s == null ? '' : s >= 85 ? 'chip-good' : s >= 60 ? 'chip-warn' : 'chip-bad';
  const b = document.createElement('button');
  b.className = 'run-card';
  b.innerHTML =
    `<img class="thumb" src="data/runs/${r.slug}/00-src.jpg" alt="" loading="lazy">
     <div class="run-body">
       <strong>${(r.title || r.slug).split('—')[0].trim()}</strong>
       <p>${r.source_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
       <span class="chip ${cls}">${s == null ? 'not scored' : s + ' fidelity'}</span>
     </div>`;
  b.addEventListener('click', () => openRun(r.slug));
  return b;
}

function openRun(slug) {
  return fetch(`data/runs/${slug}.json?t=${Date.now()}`)
    .then(r => r.json())
    .then(run => { renderRun(run); goto('run'); })
    .catch(() => alert('Could not load that run.'));
}

// Fills the home "Recent" strip and the Runs list from the same file, so a
// finished capture shows up in both without a reload.
function loadRuns() {
  return fetch(`data/runs.json?t=${Date.now()}`)
    .then(r => r.json())
    .then(runs => {
      const rc = $('#runs-count'); if (rc) rc.textContent = runs.length || '';
      const nc = $('#run-count');
      if (nc) nc.textContent = runs.length === 1 ? '1 capture' : `${runs.length} captures`;
      [['#run-grid', 'Paste a link above.'],
       ['#runs-grid', 'Paste a link to begin.']].forEach(([sel, hint]) => {
        const grid = $(sel);
        if (!grid) return;
        grid.innerHTML = '';
        if (!runs.length) {
          grid.innerHTML = `<div class="empty-state">
            <img src="assets/mascot/shrug.png" alt="">
            <p class="empty">No captures yet. ${hint}</p></div>`;
          return;
        }
        runs.forEach(r => grid.appendChild(card(r)));
      });
      return runs;
    })
    .catch(() => {
      const rc = $('#runs-count'); if (rc) rc.textContent = '';
      $$('#run-grid, #runs-grid').forEach(g =>
        g.innerHTML = '<p class="empty">Could not read data/runs.json.</p>');
      return [];
    });
}

$('#runs-new')?.addEventListener('click', () => goto('empty'));
loadRuns();

/* --------------------------------------------------- template library */

const FONT_CHOICES = ['Inter', 'Manrope', 'Geist', 'Plus Jakarta Sans', 'Poppins',
                      'Figtree', 'Sora', 'Outfit', 'DM Sans', 'Source Sans 3'];

let TEMPLATES = [];

const relLum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [relLum(a), relLum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// How many of a category show before you ask for the rest. Four fills one
// row at desktop, so a collapsed category reads as a single tidy band.
const TPL_PREVIEW = 4;
let TPL_OPEN = null;          // only one category is expanded at a time

function tplCard(t) {
  const b = document.createElement('button');
  b.className = 'tpl';
  b.innerHTML =
    `<img class="thumb" src="${t.thumb}" alt="" loading="lazy">
     <span class="tpl-scrim"></span>
     <span class="tpl-mode">${t.mode}</span>
     <span class="tpl-body">
       <strong>${t.name}</strong>
       <em>${t.note || t.category}</em>
     </span>`;
  b.addEventListener('click', () => openTemplate(t));
  return b;
}

function renderTemplates() {
  const host = $('#tpl-sections');
  if (!host) return;
  host.innerHTML = '';

  if (!TEMPLATES.length) {
    host.innerHTML = '<div class="empty-state"><img src="assets/mascot/shrug.png" alt="">'
      + '<p class="empty">No templates yet. Capture a reference site, '
      + 'then save it to the library under a category.</p></div>';
    $('#tpl-count').textContent = '';
    return;
  }

  const cats = [...new Set(TEMPLATES.map(t => t.category).filter(Boolean))];
  $('#tpl-count').textContent = `${TEMPLATES.length} across ${cats.length} categories`;

  cats.forEach((cat, ci) => {
    const items = TEMPLATES.filter(t => t.category === cat);
    const open = TPL_OPEN === cat;

    const sec = document.createElement('section');
    // Three block patterns in rotation. Every category composed the same way
    // read as one long repeat; rotating gives each section its own shape
    // without the layout looking shuffled.
    const pattern = ['a', 'b', 'c'][ci % 3];
    sec.className = `tpl-sec tpl-${pattern}` + (open ? ' is-open' : '');
    sec.style.setProperty('--c', `var(--${['blue','violet','magenta','red','orange','amber','lime','teal','indigo'][ci % 9]})`);

    const head = document.createElement('div');
    head.className = 'tpl-sec-head';
    head.innerHTML = `<span class="tpl-dot"></span><h3>${cat}</h3><span class="tpl-n">${items.length}</span>`;
    sec.appendChild(head);

    // Every card is built once; CSS hides the overflow. Re-rendering the list
    // on each toggle re-created 100 img tags and blanked the screen while they
    // decoded.
    const grid = document.createElement('div');
    grid.className = 'tpl-grid';
    items.forEach(t => grid.appendChild(tplCard(t)));
    sec.appendChild(grid);

    if (items.length > TPL_PREVIEW) {
      // The CTA is a tile in the grid, not a bar under it: a solid block of
      // the category's colour among the screenshots, which is what stops a
      // grid of websites reading as wallpaper.
      const more = document.createElement('button');
      more.className = 'tpl-more';
      more.innerHTML = open
        ? '<span class="tpl-more-n">Show less</span>'
        : `<span class="tpl-more-n">${items.length}</span>
           <span class="tpl-more-t">templates in<br>${cat}</span>
           <span class="tpl-more-go">Show all</span>`;
      more.addEventListener('click', () => {
        const wasOpen = sec.classList.contains('is-open');
        // opening one closes whichever was open before
        $$('.tpl-sec.is-open').forEach(o => {
          o.classList.remove('is-open');
          const btn = o.querySelector('.tpl-more');
          if (btn) btn.innerHTML = `<span class="tpl-more-n">${o.querySelectorAll('.tpl').length}</span>
             <span class="tpl-more-t">templates in<br>${o.querySelector('h3').textContent}</span>
             <span class="tpl-more-go">Show all</span>`;
        });
        TPL_OPEN = wasOpen ? null : cat;
        if (!wasOpen) {
          sec.classList.add('is-open');
          more.innerHTML = '<span class="tpl-more-n">Show less</span>';
        }
      });
      grid.appendChild(more);
    }
    host.appendChild(sec);
  });
}

let TPL_CURRENT = null;

function openTemplate(t) {
  TPL_CURRENT = t;
  $('#tpl-thumb').src = t.thumb;
  $('#tpl-thumb').alt = t.name;
  $('#tpl-name').textContent = t.name;
  $('#tpl-note').textContent = t.note;

  $('#tpl-facts').innerHTML = [
    ['Source', t.source_url.replace(/^https?:\/\//, '').replace(/\/$/, '')],
    ['Sections', t.sections],
    ['Page height', t.page_height.toLocaleString() + 'px'],
    ['Display', t.fonts.display || '—'],
    ['Body', t.fonts.body || '—'],
    ['Scroll', t.smooth_scroll || 'native'],
  ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');

  $('#tpl-outline').innerHTML = t.outline
    .map(s => `<li>${(s.heading || 'Untitled block').slice(0, 46)}</li>`).join('');

  const old = $('.warn-line');
  if (old) old.remove();
  if (t.warnings.length) {
    const w = document.createElement('p');
    w.className = 'warn-line';
    w.textContent = t.warnings[0];
    $('#tpl-note').after(w);
  }

  // The published viewer replaces this whole panel, so none of its fields
  // exist. Reading them threw partway through and the dialog never opened.
  if (!VIEWER) seedBrief(t);
  $('#tpl-modal').hidden = false;
}

function seedBrief(t) {
  // Seed from the MEASURED page background, not palette[0] — the most-painted
  // colour is often a dark feature band, which seeded Captured's page as black
  // when its hero is cream. Accent picks the most saturated palette entry.
  const sat = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx === 0 ? 0 : (mx - mn) / mx;
  };
  const page = t.page_bg || t.palette[0] || '#FFFFFF';
  // Raw saturation rates near-blacks highly ((max-min)/max blows up as max
  // approaches 0), so an accent must also sit in a usable lightness band.
  const usable = t.palette.filter(c => {
    const l = relLum(c);
    return l > 0.04 && l < 0.82 && sat(c) > 0.22;
  });
  const accent = usable.sort((a, b) => sat(b) - sat(a))[0]
    || (relLum(page) > 0.5 ? '#111111' : '#FFFFFF');
  const surface = t.palette.find(c =>
    c !== page && c !== accent && Math.abs(relLum(c) - relLum(page)) < 0.22) || page;
  const seed = [page, accent, t.text_colors[0] || '#111111', surface];
  const names = ['Page', 'Accent', 'Text', 'Surface'];
  $('#b-colors').innerHTML = seed.map((hex, i) =>
    `<label class="picker"><input type="color" value="${hex}" data-role="${names[i].toLowerCase()}"><span>${names[i]}</span></label>`
  ).join('');
  $$('#b-colors input').forEach(inp => inp.addEventListener('input', checkContrast));

  const opts = fams => [...new Set([fams, ...FONT_CHOICES].filter(Boolean))]
    .map(f => `<option>${f}</option>`).join('');
  $('#b-display').innerHTML = opts(t.fonts.display);
  $('#b-body').innerHTML = opts(t.fonts.body);

  checkContrast();
}

function checkContrast() {
  const note = $('#contrast-note');
  if (!note) return;
  const get = r => ($(`#b-colors input[data-role="${r}"]`) || {}).value || '#ffffff';
  const ratio = contrast(get('text'), get('page'));
  const ok = ratio >= 4.5;
  note.textContent = ok
    ? `Text on page ${ratio.toFixed(1)}:1 — passes AA.`
    : `Text on page ${ratio.toFixed(1)}:1 — below AA 4.5:1, this would be blocked before emit.`;
  note.style.color = ok ? 'var(--text-faint)' : 'var(--bad)';
}

$('#tpl-close').addEventListener('click', () => { $('#tpl-modal').hidden = true; });
$('#tpl-modal').addEventListener('click', e => {
  if (e.target.id === 'tpl-modal') $('#tpl-modal').hidden = true;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $('#tpl-modal').hidden = true;
});
$$('#b-copy button').forEach(b => b.addEventListener('click', () => {
  $$('#b-copy button').forEach(x => x.classList.remove('is-on'));
  b.classList.add('is-on');
}));


fetch('data/templates.json')
  .then(r => r.json())
  .then(t => { TEMPLATES = t; renderTemplates(); })
  .catch(() => { $('#tpl-count').textContent = 'template library not built yet'; });


/* ---------------------------------------------------------- viewer mode */

// The published build sets window.SF_VIEWER. Everything that posts to the API
// runs Python on one particular Mac, so on a static host it cannot work — and
// a screen of buttons that do nothing is worse than a screen without them.
// What survives is everything worth looking at.

const VIEWER = window.SF_VIEWER || null;

function applyViewer() {
  if (!VIEWER) return;
  document.documentElement.classList.add('is-viewer');

  ['#do-capture', '#url', '#act-repair', '#act-rescore', '#act-elementor',
   '#act-edit', '#pv-edit', '#tpl-use', '#runs-new'].forEach(s => {
    const el = $(s);
    if (el) el.hidden = true;
  });
  const bar = $('.url-bar');
  if (bar) bar.hidden = true;

  // The brief form collects what a rebuild would use, and there is no rebuild.
  const right = $('.modal-right');
  if (right) {
    right.innerHTML =
      `<h2>Make it yours</h2>
       <p class="modal-sub">In the live tool this panel takes the brand name,
       colours, type and photo brief, and rebuilds the whole template around
       them in about two minutes. This is the read-only copy, so it only
       shows what was measured.</p>`;
  }

  const hero = $('.hero p');
  if (hero) {
    hero.textContent = 'A read-only copy of the tool. Browse the template '
      + 'library, open any run to see how closely it was rebuilt, and open '
      + 'the preview to walk the finished page on desktop and phone.';
  }

  const foot = document.createElement('p');
  foot.className = 'viewer-foot';
  foot.innerHTML = `Read-only copy, built ${VIEWER.built}.`
    + (VIEWER.credits ? ' <a href="credits.html">Photo credits</a>.' : '');
  ($('.sidebar-foot') || document.body).prepend(foot);
}

/* ------------------------------------------------------------ job runner */

let JOB_TIMER = null;

async function post(path, body) {
  const r = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const j = await r.json();
  if (!r.ok) {
    // Carry the body through. A refused Elementor export sends the checklist
    // with it, and a bare Error string would throw that away.
    const err = new Error(j.error || `${r.status}`);
    Object.assign(err, j);
    throw err;
  }
  return j;
}

function showJob(job, title) {
  const b = $('#job-buddy');
  if (b) { b.src = 'assets/mascot/think.png'; b.className = 'job-buddy is-in'; }
  $('#job-title').textContent = title;
  $('#job').hidden = false;
  $('#job-log').textContent = '';
  poll(job.id);
}

function poll(id) {
  clearInterval(JOB_TIMER);
  const tick = async () => {
    let j;
    try {
      j = await (await fetch('/api/job/' + id)).json();
    } catch (e) { return; }

    $('#job-steps').innerHTML = j.steps.map(s => {
      const done = j.steps.indexOf(s) < j.steps.indexOf(j.step) || j.status === 'done';
      const now = s === j.step;
      return `<span class="chip ${now ? 'chip-warn' : done ? 'chip-good' : ''}">${s}</span>`;
    }).join('');

    const log = $('#job-log');
    const stuck = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
    log.textContent = j.log.join('\n');
    if (stuck) log.scrollTop = log.scrollHeight;

    const spin = $('#job-spin');
    spin.className = 'spin' + (j.status === 'done' ? ' done' : j.status === 'failed' ? ' failed' : '');
    // Framey reads the job back to you: thinking while it runs, thumbs up when
    // it lands, a shrug when it does not.
    const buddy = $('#job-buddy');
    if (buddy) {
      const pose = j.status === 'done' ? 'thumbs-up'
                 : j.status === 'failed' ? 'shrug' : 'think';
      const want = 'assets/mascot/' + pose + '.png';
      if (!buddy.src.endsWith(want)) { buddy.src = want; buddy.className = 'job-buddy is-in'; }
    }
    if (j.status === 'running') return;

    clearInterval(JOB_TIMER);
    $('#job-title').textContent = j.status === 'done' ? 'Finished' : 'Failed — ' + (j.error || '');
    if (j.status === 'done' && j.slug) {
      loadRuns();
      // A finished job hands you the next step rather than a closed dialog:
      // a template build lands in the copy fields, a rebuild lands in preview.
      openRun(j.slug).then(() => {
        if (!j.then) return;
        $('#job').hidden = true;
        if (j.then === 'edit') openEditor('copy');
        if (j.then === 'preview') openPreview(j.slug);
      });
    }
  };
  tick();
  JOB_TIMER = setInterval(tick, 1200);
}

$('#job-close').addEventListener('click', () => {
  $('#job').hidden = true;
  clearInterval(JOB_TIMER);
});

async function fire(btn, title, path, body) {
  const el = $(btn);
  if (!el) return;
  el.addEventListener('click', async () => {
    const was = el.textContent;
    el.disabled = true; el.textContent = 'Starting…';
    try {
      showJob(await post(path, typeof body === 'function' ? body() : body), title);
    } catch (e) {
      alert(e.message);
    } finally {
      el.disabled = false; el.textContent = was;
    }
  });
}

fire('#do-capture', 'Capturing', '/api/capture', () => ({ url: $('#url').value.trim() }));
fire('#act-repair', 'Repair loop', '/api/repair', () => ({ slug: RUN && RUN.slug, rounds: 3 }));
fire('#act-rescore', 'Re-cloning', '/api/rescore', () => ({ slug: RUN && RUN.slug }));
/* ------------------------------------------------------ the checklist */

// The MYSense pre-launch checklist, run against the rebuilt page before the
// Elementor pack is written. A row this tool cannot answer — plugins, SSL,
// PageSpeed, a sign-off — says so instead of passing quietly, and is never
// counted as a pass.

const QC_GROUPS = ['Developer QA', 'PM QA', 'After go-live', 'Needs a person'];
const QC_WORD = { pass: 'Pass', fail: 'Fix this', warn: 'Have a look', skip: 'Not here' };

function renderQC(rep) {
  const c = rep.counts;
  $('#qc-tally').textContent =
    `${c.pass} pass · ${c.fail} to fix · ${c.warn} to look at`;
  $('#qc-tally').className = 'chip chip-' + (c.fail ? 'bad' : c.warn ? 'warn' : 'good');
  $('#qc-sub').textContent = rep.blocking
    ? `${rep.blocking} of these stop the Elementor pack. The ${c.skip} rows at the `
      + `bottom cannot be answered from a page and are not counted as passes.`
    : `Nothing is blocking the Elementor pack. The ${c.skip} rows at the bottom `
      + `still need the live site or a person.`;

  const host = $('#qc-list');
  host.innerHTML = '';
  QC_GROUPS.forEach(g => {
    const rows = rep.checks.filter(x => x.group === g);
    if (!rows.length) return;
    const deferred = g === 'After go-live' || g === 'Needs a person';
    const sec = document.createElement('section');
    sec.className = 'qc-sec' + (deferred ? ' is-shut' : '');
    const head = document.createElement('button');
    head.className = 'qc-sec-head';
    head.innerHTML = `<h4>${g}</h4><span>${rows.length}</span>`;
    head.addEventListener('click', () => sec.classList.toggle('is-shut'));
    sec.appendChild(head);

    rows.forEach(r => {
      const el = document.createElement('div');
      el.className = 'qc-row qc-' + r.state;
      const list = r.items && r.items.length
        ? `<ul class="qc-items">${r.items.map(i =>
            `<li>${String(i).replace(/</g, '&lt;')}</li>`).join('')}${
            r.more ? `<li class="qc-more">and ${r.more} more</li>` : ''}</ul>`
        : '';
      el.innerHTML =
        `<span class="qc-mark">${r.state === 'pass' ? '&#10003;'
          : r.state === 'fail' ? '&#33;' : r.state === 'warn' ? '&#8226;' : '&ndash;'}</span>
         <div class="qc-body">
           <strong>${r.item}</strong>
           <span class="qc-state">${QC_WORD[r.state]}</span>
           <p>${r.detail}</p>
           ${list}
           ${r.fix ? `<p class="qc-fix">${r.fix}</p>` : ''}
         </div>`;
      sec.appendChild(el);
    });
    host.appendChild(sec);
  });
  $('#qc').hidden = false;
}

async function runQC(btn) {
  const was = btn && btn.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
  try {
    // Nothing can be run from a static host, but the last report each run was
    // given was published with it, and that is the part worth reading.
    const rep = VIEWER
      ? await fetch(`data/runs/${RUN.slug}.qc.json?t=${Date.now()}`)
          .then(r => (r.ok ? r.json() : Promise.reject(
            new Error('This run has not been through the checklist.'))))
      : await post('/api/qc', { slug: RUN.slug });
    $('#qc-go').hidden = VIEWER || !rep.blocking;
    $('#qc-again').hidden = !!VIEWER;
    renderQC(rep);
  } catch (e) {
    alert('Could not run the checklist: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = was; }
  }
}

$('#act-qc')?.addEventListener('click', () => runQC($('#act-qc')));
$('#qc-close').addEventListener('click', () => { $('#qc').hidden = true; });
$('#qc-again').addEventListener('click', () => runQC($('#qc-again')));
$('#qc').addEventListener('click', e => { if (e.target.id === 'qc') $('#qc').hidden = true; });

async function emitPack(override) {
  const btn = $('#act-elementor');
  const was = btn.textContent;
  btn.disabled = true;
  btn.textContent = override ? 'Exporting…' : 'Checking…';
  try {
    const job = await post('/api/elementor', { slug: RUN && RUN.slug, override });
    $('#qc').hidden = true;
    showJob(job, 'Elementor pack');
  } catch (e) {
    // 409 means the checklist stopped it. The report rides along, so show the
    // rows rather than an error nobody can act on.
    if (e.qc) {
      $('#qc-go').hidden = false;
      renderQC(e.qc);
    } else {
      alert(e.message);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = was;
  }
}

$('#act-elementor').addEventListener('click', () => emitPack(false));
$('#qc-go').addEventListener('click', () => emitPack(true));

/* --------------------------------------------------- preview workspace */

// The clone running live at two real viewport widths, side by side. The page
// is scaled, never the viewport: narrow the iframe to fit instead and you are
// looking at the tablet layout while the label says desktop.
const DESK_W = 1440;
const PHONE = { w: 402, h: 874 };          // iPhone 17 Pro, in CSS points

let PV = { slug: null, which: 'rebrand', hasRebrand: false };

function pvPath(which) {
  const dir = which === 'rebrand' ? PV.slug + '-rebrand' : PV.slug;
  return `data/clones/${dir}/index.html`;
}

function fitPreview() {
  const box = $('#pv-desk-box');
  const fr = $('#pv-desk');
  if (box && fr && box.clientWidth) {
    const k = box.clientWidth / DESK_W;
    fr.style.width = DESK_W + 'px';
    // Give the frame back the height the scale takes away, so the window
    // shows a full screen of page rather than a letterboxed strip.
    fr.style.height = Math.max(600, Math.round(box.clientHeight / k)) + 'px';
    fr.style.transform = `scale(${k})`;
    const sz = $('#pv-size');
    if (sz) sz.textContent = `${DESK_W} wide · ${Math.round(k * 100)}%`;
  }

  const pbox = $('#pv-phone-box');
  const ph = $('.phone-frame');
  if (pbox && ph && pbox.clientHeight) {
    // 24px is the frame's own padding top and bottom.
    const k = Math.min(1, (pbox.clientHeight - 4) / (PHONE.h + 24));
    ph.style.transform = `scale(${k})`;
    pbox.style.width = Math.round((PHONE.w + 24) * k) + 'px';
  }
}

function loadPreview() {
  const src = pvPath(PV.which) + '?t=' + Date.now();
  $('#pv-desk').src = src;
  $('#pv-phone').src = src;
  $('#pv-url').textContent = '127.0.0.1 / ' + pvPath(PV.which);
  fitPreview();
}

// The box has no size until the pane is shown, and a requestAnimationFrame is
// not reliably delivered to a pane the window is not painting — which left the
// frames unscaled at their raw 1440. A ResizeObserver fires on the layout
// itself, so the fit lands whenever the box actually gets a size.
new ResizeObserver(fitPreview).observe($('#pv-desk-box'));

async function openPreview(slug) {
  PV.slug = slug;
  // Ask for both before opening either. A template that has only been cloned
  // has no rebranded copy, and the published viewer carries only some of the
  // clones — offering a tab that 404s is worse than not offering it.
  const has = async which =>
    fetch(pvPath(which), { method: 'HEAD' }).then(r => r.ok).catch(() => false);
  PV.hasRebrand = await has('rebrand');
  PV.hasPlain = await has('plain');
  if (!PV.hasRebrand && !PV.hasPlain) {
    alert('There is no built page for this run to preview.');
    return;
  }
  PV.which = PV.hasRebrand ? 'rebrand' : 'plain';

  $$('#pv-which button').forEach(b => {
    const got = b.dataset.which === 'rebrand' ? PV.hasRebrand : PV.hasPlain;
    b.classList.toggle('is-on', b.dataset.which === PV.which);
    b.disabled = !got;
    b.title = b.disabled
      ? (VIEWER ? 'Not published in the read-only copy' : 'Fill in Edit content first')
      : '';
  });
  $('#pv-title').textContent = RUN && RUN.title
    ? RUN.title.split('—')[0].trim() : slug;

  goto('preview');
  loadPreview();
}

$$('#pv-which button').forEach(b => b.addEventListener('click', () => {
  if (b.disabled) return;
  PV.which = b.dataset.which;
  $$('#pv-which button').forEach(x => x.classList.toggle('is-on', x === b));
  loadPreview();
}));

$('#pv-back').addEventListener('click', () => goto('run'));
$('#pv-reload').addEventListener('click', loadPreview);
$('#pv-edit').addEventListener('click', () => openEditor('copy'));
$('#pv-tab').addEventListener('click', () => window.open(pvPath(PV.which), '_blank'));
window.addEventListener('resize', fitPreview);

$('#act-open').addEventListener('click', () => { if (RUN) openPreview(RUN.slug); });
/* ------------------------------------------- template -> your own page */

// What the "Make it yours" panel is actually worth: the brief the rebrand
// runs on. Until now it collected all this and threw it away.
function tplBrief() {
  const pick = r => {
    const el = $(`#b-colors input[data-role="${r}"]`);
    return el ? el.value : null;
  };
  const v = sel => ($(sel) || {}).value && $(sel).value.trim() || null;
  return {
    name: v('#b-name'),
    what: v('#b-what'),
    who: v('#b-who'),
    action: v('#b-goal'),
    colors: { page: pick('page'), text: pick('text'), accent: pick('accent') },
    fonts: { display: v('#b-display'), body: v('#b-body') },
    // The template's photographs belong to whoever made the template, so they
    // are always replaced. This decides what replaces them.
    image_query: v('#b-photos') || v('#b-what') || 'abstract texture minimal',
  };
}

$('#tpl-use').addEventListener('click', async () => {
  const t = TPL_CURRENT;
  if (!t) return;
  const btn = $('#tpl-use');
  const draft = !!$('#b-copy button.is-on[data-copy="draft"]');
  const brief = tplBrief();
  if (!brief.name) {
    const n = $('#b-name');
    n.focus();
    n.classList.add('is-bad');
    setTimeout(() => n.classList.remove('is-bad'), 1600);
    return;
  }
  btn.disabled = true;
  const was = btn.textContent;
  btn.textContent = 'Starting…';
  try {
    const job = await post('/api/template', { url: t.source_url, brief, draft });
    $('#tpl-modal').hidden = true;
    showJob(job, `Building ${brief.name} on ${t.name}`);
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = was;
  }
});


/* ----------------------------------------------------------- the editor */

// The system could rebrand but had nowhere to type, so every text block came
// out `placeholder` and deploy stayed blocked. This is that missing step:
// the brand brief, plus the actual words, per block.

let EDIT_SPEC = null;     // the measured capture, source of the block list
let EDIT_COPY = {};       // "<section>:<block>" -> text the user wrote

const textish = b => b.text && b.type !== 'image';

function briefFromSpec(spec) {
  const b = spec.brief || {};
  return {
    name: b.name || '', what: b.what || '', who: b.who || '', action: b.action || '',
    colors: b.colors || {}, fonts: b.fonts || {},
    image_query: b.image_query || '',
    phone: b.phone || '', email: b.email || '', address: b.address || '',
  };
}

// The nav is edited like any section. It carried the template's own menu —
// "The Assessment", "Membership" — into the client's page, and it is the first
// row anybody reads, so leaving it out of the editor left it unfixable.
function navBlocks() {
  return (EDIT_SPEC && EDIT_SPEC.nav && EDIT_SPEC.nav.blocks) || [];
}

function fillSections() {
  const sel = $('#edit-sec');
  const nav = navBlocks().filter(textish).length;
  const opts = EDIT_SPEC.sections.map(s => {
    const n = (s.blocks || []).filter(textish).length;
    const name = (s.heading || `Section ${s.i}`).slice(0, 44);
    return `<option value="${s.i}">s${String(s.i).padStart(2, '0')} · ${name} · ${n} text</option>`;
  });
  if (nav) opts.unshift(`<option value="nav">nav · Menu and header · ${nav} text</option>`);
  sel.innerHTML = opts.join('');
  renderFields();
}

function currentBlocks() {
  const v = $('#edit-sec').value;
  if (v === 'nav') return { key: 'nav', blocks: navBlocks() };
  const sec = EDIT_SPEC.sections.find(s => s.i === +v) || { i: 0, blocks: [] };
  return { key: String(sec.i), blocks: sec.blocks || [] };
}

function renderFields() {
  const { key: skey, blocks: all } = currentBlocks();
  const wrap = $('#edit-fields');
  wrap.innerHTML = '';
  const blocks = all.map((b, j) => [b, j]).filter(([b]) => textish(b));
  $('#edit-copy-note').textContent =
    `${blocks.length} editable text blocks. Leave one blank to keep the template's words.`;
  // draft.py works a section at a time off the measured section list; the nav
  // is not one, so say that rather than failing on the way in.
  const dbtn = $('#edit-draft');
  if (dbtn) {
    dbtn.disabled = skey === 'nav';
    dbtn.title = dbtn.disabled ? 'Menu labels are written by hand' : '';
  }

  blocks.forEach(([b, j]) => {
    const key = `${skey}:${j}`;
    const row = document.createElement('label');
    row.className = 'edit-field';
    const long = (b.text || '').length > 60;
    row.innerHTML =
      `<span class="edit-kind">${b.type}</span>
       ${long ? '<textarea rows="3"></textarea>' : '<input>'}
       <small>${(b.text || '').slice(0, 120).replace(/</g, '&lt;')}</small>`;
    const f = row.querySelector('textarea, input');
    f.value = EDIT_COPY[key] || '';
    f.placeholder = b.text || '';
    f.addEventListener('input', () => {
      if (f.value.trim()) EDIT_COPY[key] = f.value;
      else delete EDIT_COPY[key];
    });
    wrap.appendChild(row);
  });
}

function openEditor(tab) {
  if (!RUN) return;
  const slug = RUN.slug;
  // Two files, not one. The capture holds the block list; the brief holds what
  // you typed last time and anything the drafter wrote, so reopening the
  // editor shows your own words rather than an empty form over them.
  Promise.all([
    fetch(`data/captures/${slug}.json?t=${Date.now()}`).then(r => r.json()),
    fetch(`data/captures/${slug}.brief.json?t=${Date.now()}`)
      .then(r => (r.ok ? r.json() : {})).catch(() => ({})),
  ])
    .then(([spec, saved]) => {
      EDIT_SPEC = spec;
      EDIT_COPY = { ...(saved.copy || {}) };
      const b = briefFromSpec({ ...spec, brief: { ...(spec.brief || {}), ...saved } });
      $('#e-name').value    = b.name;
      $('#e-what').value    = b.what;
      $('#e-who').value     = b.who;
      $('#e-action').value  = b.action;
      $('#e-page').value    = b.colors.page   || spec.page_bg || '#ffffff';
      $('#e-text').value    = b.colors.text   || '#111111';
      $('#e-accent').value  = b.colors.accent || '#0f7b6c';
      $('#e-display').value = b.fonts.display || '';
      $('#e-body').value    = b.fonts.body    || '';
      $('#e-imgq').value    = b.image_query || '';
      $('#e-phone').value   = b.phone || '';
      $('#e-email').value   = b.email || '';
      $('#e-address').value = b.address || '';
      fillSections();
      showEditTab(tab || 'brand');
      $('#editor').hidden = false;
    })
    .catch(() => alert('Could not read the capture for this run.'));
}

function showEditTab(name) {
  $$('.edit-tab').forEach(x => x.classList.toggle('is-on', x.dataset.tab === name));
  $('#edit-brand').hidden = name !== 'brand';
  $('#edit-copy').hidden  = name !== 'copy';
}

function saveEditor() {
  const brief = {
    name: $('#e-name').value.trim() || null,
    what: $('#e-what').value.trim() || null,
    who: $('#e-who').value.trim() || null,
    action: $('#e-action').value.trim() || null,
    colors: { page: $('#e-page').value, text: $('#e-text').value, accent: $('#e-accent').value },
    fonts: { display: $('#e-display').value.trim() || null,
             body: $('#e-body').value.trim() || null },
    image_query: $('#e-imgq').value.trim() || 'abstract texture minimal',
    phone: $('#e-phone').value.trim() || null,
    email: $('#e-email').value.trim() || null,
    address: $('#e-address').value.trim() || null,
    copy: EDIT_COPY,
  };
  $('#editor').hidden = true;
  post('/api/rebrand', { slug: RUN.slug, brief })
    .then(job => showJob(job, 'Rebuilding with your content'))
    .catch(e => alert('Rebuild failed: ' + e.message));
}

$('#act-edit')?.addEventListener('click', openEditor);
$('#edit-cancel')?.addEventListener('click', () => { $('#editor').hidden = true; });
$('#edit-save')?.addEventListener('click', saveEditor);
$('#edit-sec')?.addEventListener('change', () => { $('#edit-draft-note').textContent = ''; renderFields(); });

// Drafting writes language, never facts. Blocks the brief cannot support come
// back empty and keep the template's words, so "12 of 24" is a good result,
// not a failure — the rest genuinely need a human.
$('#edit-draft')?.addEventListener('click', async () => {
  const btn = $('#edit-draft');
  const note = $('#edit-draft-note');
  const sec = +$('#edit-sec').value;
  const brief = {
    name: $('#e-name').value.trim() || null,
    what: $('#e-what').value.trim() || null,
    who: $('#e-who').value.trim() || null,
    action: $('#e-action').value.trim() || null,
  };
  if (!brief.name && !brief.what) {
    note.textContent = 'Fill in the Brand tab first. With an empty brief almost '
      + 'every block comes back blank.';
    return;
  }
  btn.disabled = true;
  const was = btn.textContent;
  btn.textContent = 'Drafting…';
  note.textContent = 'Writing copy for this section. This takes a moment.';
  try {
    const r = await post('/api/draft', { slug: RUN.slug, brief, section: sec });
    const got = r.blocks || {};
    Object.entries(got).forEach(([k, v]) => { EDIT_COPY[k] = v; });
    renderFields();
    $$('#edit-fields .edit-field').forEach(f => {
      const el = f.querySelector('textarea, input');
      if (el && el.value.trim()) f.classList.add('is-drafted');
    });
    const n = Object.keys(got).length;
    const total = $$('#edit-fields .edit-field').length;
    note.textContent = n
      ? `${n} of ${total} blocks drafted. The rest were left alone because the `
        + `brief does not supply the fact they state.`
      : 'Nothing could be written from this brief without inventing facts. '
        + 'Add more detail on the Brand tab, or write these yourself.';
  } catch (e) {
    note.textContent = 'Drafting failed: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = was;
  }
});
$$('.edit-tab').forEach(t =>
  t.addEventListener('click', () => showEditTab(t.dataset.tab)));

// Last, so it hides controls other code has already bound its handlers to.
applyViewer();
