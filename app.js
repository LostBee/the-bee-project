const app = document.getElementById('app');
const HIVE_KEY = 'bee_hives_v1';

let stages = [];
let risks = [];

init();

async function init() {
  const [sRes, rRes] = await Promise.all([
    fetch('data/stages.json'),
    fetch('data/risks.json'),
  ]);
  stages = await sRes.json();
  risks = await rRes.json();
  if (!location.hash) location.hash = '#/dashboard';
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

function getHives() {
  return JSON.parse(localStorage.getItem(HIVE_KEY) || '[]');
}

function saveHives(hives) {
  localStorage.setItem(HIVE_KEY, JSON.stringify(hives));
}

function stageBySlug(slug) {
  return stages.find((s) => s.slug === slug);
}

function riskBySlug(slug) {
  return risks.find((r) => r.slug === slug);
}

function renderRoute() {
  const hash = location.hash.slice(2);
  const [route, id] = hash.split('/');
  if (route === 'dashboard') return renderDashboard();
  if (route === 'hives') return id ? renderHiveDetail(id) : renderHiveList();
  if (route === 'edit-hive') return renderHiveForm(id);
  if (route === 'stages') return id ? renderStageDetail(id) : renderStageGuide();
  if (route === 'risks') return id ? renderRiskDetail(id) : renderRiskLibrary();
  return renderDashboard();
}

function renderDashboard() {
  const hives = getHives();
  app.innerHTML = `
    <section class="card">
      <h2>Dashboard</h2>
      <p><strong>Total hives:</strong> ${hives.length}</p>
      <p><a href="#/hives">Manage hives</a> · <a href="#/risks">Open risks library</a></p>
    </section>
  `;
  if (!hives.length) {
    app.innerHTML += `<div class="empty">No hives yet. <a href="#/edit-hive/new">Add your first hive</a>.</div>`;
    return;
  }

  const cards = hives
    .map((h) => {
      const stage = stageBySlug(h.current_stage);
      const immediateCount = stage?.immediate_tasks?.length || 0;
      const riskCount = stage?.key_risks?.length || 0;
      return `
        <article class="card">
          <h3>${h.name}</h3>
          <p><strong>Stage:</strong> ${stage?.name || 'Unknown'}</p>
          <p>${immediateCount} tasks now · ${riskCount} key risks</p>
          <div class="actions">
            <a href="#/hives/${h.id}">Open checklist</a>
          </div>
        </article>
      `;
    })
    .join('');
  app.innerHTML += cards;
}

function renderHiveList() {
  const hives = getHives();
  app.innerHTML = `
    <section class="card">
      <div class="actions"><h2>Hives</h2><a href="#/edit-hive/new"><button class="primary">Add hive</button></a></div>
    </section>
  `;

  if (!hives.length) {
    app.innerHTML += `<div class="empty">No hives yet.</div>`;
    return;
  }

  app.innerHTML += hives
    .map((h) => {
      const stage = stageBySlug(h.current_stage);
      const riskBadges = (stage?.key_risks || [])
        .slice(0, 3)
        .map((slug) => `<span class="badge">${riskBySlug(slug)?.name || slug}</span>`)
        .join('');
      return `
      <article class="card">
        <h3>${h.name}</h3>
        <p><strong>Current stage:</strong> ${stage?.name || 'Unknown'}</p>
        <p><strong>Next tasks:</strong> ${stage?.immediate_tasks?.length || 0}</p>
        <div>${riskBadges}</div>
        <div class="actions">
          <a href="#/hives/${h.id}">Open</a>
          <a href="#/edit-hive/${h.id}">Edit</a>
          <button data-archive="${h.id}">Archive</button>
        </div>
      </article>`;
    })
    .join('');

  app.querySelectorAll('[data-archive]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.archive;
      saveHives(hives.filter((h) => h.id !== id));
      renderHiveList();
    });
  });
}

function renderHiveForm(id) {
  const hives = getHives();
  const existing = id && id !== 'new' ? hives.find((h) => h.id === id) : null;
  app.innerHTML = `
    <section class="card">
      <h2>${existing ? 'Edit hive' : 'Add hive'}</h2>
      <form id="hive-form">
        <label>Hive name <input required name="name" value="${existing?.name || ''}" /></label>
        <label>Hive code <input name="optional_code" value="${existing?.optional_code || ''}" /></label>
        <label>Apiary / location <input name="optional_apiary_name" value="${existing?.optional_apiary_name || ''}" /></label>
        <label>Notes <textarea name="optional_notes">${existing?.optional_notes || ''}</textarea></label>
        <label>Current stage
          <select name="current_stage" required>
            <option value="">Select stage</option>
            ${stages
              .map(
                (s) =>
                  `<option value="${s.slug}" ${existing?.current_stage === s.slug ? 'selected' : ''}>${s.name}</option>`
              )
              .join('')}
          </select>
        </label>
        <div class="actions">
          <button class="primary" type="submit">Save</button>
          <a href="#/hives">Cancel</a>
        </div>
      </form>
    </section>
  `;

  document.getElementById('hive-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const now = new Date().toISOString();
    const payload = {
      id: existing?.id || crypto.randomUUID(),
      name: fd.get('name'),
      optional_code: fd.get('optional_code'),
      optional_apiary_name: fd.get('optional_apiary_name'),
      optional_notes: fd.get('optional_notes'),
      current_stage: fd.get('current_stage'),
      updated_at: now,
      created_at: existing?.created_at || now,
    };

    const next = existing ? hives.map((h) => (h.id === existing.id ? payload : h)) : [...hives, payload];
    saveHives(next);
    location.hash = '#/hives';
  });
}

function renderHiveDetail(id) {
  const hives = getHives();
  const hive = hives.find((h) => h.id === id);
  if (!hive) {
    app.innerHTML = `<div class="empty">Hive not found.</div>`;
    return;
  }
  const stage = stageBySlug(hive.current_stage);
  if (!stage) {
    app.innerHTML = `<div class="empty">Stage not found for this hive.</div>`;
    return;
  }

  const stageIdx = stages.findIndex((s) => s.slug === stage.slug);
  const prev = stages[stageIdx - 1]?.name || '—';

  app.innerHTML = `
    <article class="card">
      <h2>${hive.name}</h2>
      <p><strong>Current stage:</strong> ${stage.name}</p>
      <div class="actions"><a href="#/edit-hive/${hive.id}"><button>Change stage</button></a></div>
    </article>

    <section class="card">
      <h3>How to determine this stage</h3>
      <ul>${stage.determine_content.map((x) => `<li>${x}</li>`).join('')}</ul>
      <a href="#/stages/${stage.slug}">Open full stage guide</a>
    </section>

    <section class="grid cols-2">
      <article class="card">
        <h3>Immediate tasks</h3>
        <ul>${stage.immediate_tasks.map((x) => `<li>${x}</li>`).join('')}</ul>
      </article>
      <article class="card">
        <h3>Near-future tasks</h3>
        <ul>${stage.near_future_tasks.map((x) => `<li>${x}</li>`).join('')}</ul>
      </article>
    </section>

    <section class="card">
      <h3>Key risks</h3>
      <ul>${stage.key_risks
        .map((r) => `<li><a href="#/risks/${r}">${riskBySlug(r)?.name || r}</a></li>`)
        .join('')}</ul>
    </section>

    <section class="card">
      <h3>Simple progress / timeline</h3>
      <div class="stepper">
        <span class="step">${prev}</span>
        <span>→</span>
        <span class="step current">${stage.name}</span>
        <span>→</span>
        <span class="step">${stage.next_stages.join(' / ')}</span>
      </div>
    </section>
  `;
}

function renderStageGuide() {
  app.innerHTML = `
    <section class="card">
      <h2>Stage Guide</h2>
      <p>Fixed content for manual stage selection and checklist support.</p>
      <ul>${stages.map((s) => `<li><a href="#/stages/${s.slug}">${s.name}</a> — ${s.short_description}</li>`).join('')}</ul>
    </section>
  `;
}

function renderStageDetail(slug) {
  const stage = stageBySlug(slug);
  if (!stage) return (app.innerHTML = `<div class="empty">Stage not found.</div>`);

  app.innerHTML = `
    <article class="card">
      <h2>${stage.name}</h2>
      <p>${stage.short_description}</p>
      <h3>How to determine this stage</h3>
      <ul>${stage.determine_content.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h3>Immediate tasks</h3>
      <ul>${stage.immediate_tasks.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h3>Near-future tasks</h3>
      <ul>${stage.near_future_tasks.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h3>Key risks</h3>
      <ul>${stage.key_risks.map((r) => `<li><a href="#/risks/${r}">${riskBySlug(r)?.name || r}</a></li>`).join('')}</ul>
      <p><strong>Likely next stages:</strong> ${stage.next_stages.join(', ')}</p>
    </article>
  `;
  app.appendChild(renderSources(stage.sources));
}

function renderRiskLibrary() {
  const grouped = risks.reduce((acc, risk) => {
    acc[risk.category] ||= [];
    acc[risk.category].push(risk);
    return acc;
  }, {});

  app.innerHTML = `
    <section class="card">
      <h2>Risks / Incidents Library</h2>
      <p>Reference pages for irregular issues.</p>
    </section>
  `;

  Object.entries(grouped).forEach(([category, items]) => {
    const section = document.createElement('section');
    section.className = 'card';
    section.innerHTML = `
      <h3>${category}</h3>
      <ul>${items.map((r) => `<li><a href="#/risks/${r.slug}">${r.name}</a> — ${r.short_description}</li>`).join('')}</ul>
    `;
    app.appendChild(section);
  });
}

function renderRiskDetail(slug) {
  const risk = riskBySlug(slug);
  if (!risk) return (app.innerHTML = `<div class="empty">Risk not found.</div>`);

  app.innerHTML = `
    <article class="card">
      <h2>${risk.name}</h2>
      <p><span class="badge">${risk.category}</span></p>
      <p>${risk.short_description}</p>
      <h3>How to identify it</h3>
      <ul>${risk.identify_content.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h3>What to do now</h3>
      <ul>${risk.resolve_now_content.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h3>What to do next</h3>
      <ul>${risk.resolve_next_content.map((x) => `<li>${x}</li>`).join('')}</ul>
      <h3>When to seek expert help</h3>
      <ul>${risk.seek_help_content.map((x) => `<li>${x}</li>`).join('')}</ul>
      <p><strong>Related stages:</strong> ${risk.related_stages.map((s) => stageBySlug(s)?.name || s).join(', ')}</p>
    </article>
  `;
  app.appendChild(renderSources(risk.sources));
}

function renderSources(sources = []) {
  const template = document.getElementById('source-template');
  const node = template.content.firstElementChild.cloneNode(true);
  const list = node.querySelector('.source-list');
  list.innerHTML = sources
    .slice(0, 3)
    .map((s) => `<li><strong>Source: ${s.label}</strong>${s.url ? ` — <a href="${s.url}" target="_blank" rel="noreferrer">Read more</a>` : ''}</li>`)
    .join('');
  return node;
}
