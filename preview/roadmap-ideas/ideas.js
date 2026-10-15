/* AI-generated (Claude) · 2026-10-15 · not reviewed by a human
 *
 * Ideas: capture an idea about any kaa project, tag it with one or more projects (the first is primary),
 * browse ideas by tag, turn an idea into a task or a product update.
 * Spec: roadmap/IDEAS__ai.md · format, ids, folders: kaa-infra/projects/README.md.
 *
 * Data (in this repository, on the data branch):
 *   DEFAULTS.ideas_source    master copy of ideas captured on this page (written here)
 *   DEFAULTS.ideas_all       copy of kaa-infra's index of all ideas (read-only, written by the sync job)
 *   DEFAULTS.ideas_projects  copy of kaa-infra's project registry (read-only, written by the sync job)
 * Relies on the host page's globals (DEFAULTS, cfg, ui, doc, lang, I18N, T, $, esc, store, gh, repoPath, b64decode, b64encode,
 * splitHeader, YAML_OPTS, jsyaml, AREAS, render, edit, nextId, today, fmtDate, fbA, clean) and window.FB (styles, addItem).
 * Exposes window.IDEAS = { load, openCount, renderView, bindView, busy, openForm, projects, openIdeas, addIdea }.
 */
(() => {
"use strict";

const FIELDS = ["id", "projects", "title", "description", "status", "links", "reporter", "source", "created", "updated"];
const STATUSES = ["new", "exploring", "planned", "parked", "rejected"];
const ACTIVE = new Set(["new", "exploring"]);
const SOURCE = "roadmap-page";
const SRC_PATH = DEFAULTS.ideas_source || "roadmap/ideas/captured__ai.yaml";
const ALL_PATH = DEFAULTS.ideas_all || "roadmap/ideas/all-ideas__ai.yaml";
const REG_PATH = DEFAULTS.ideas_projects || "roadmap/ideas/projects__ai.yaml";
const HEAD_DEFAULT = "# Ideas captured on the roadmap page — the master copy of these ideas (source: roadmap-page).\n# Written by the page (report button → Idea, the Ideas tab, the agent), by hand or by agents.\n# The sync job writes each idea to kaa-infra/projects/<PRIMARY>/ideas/<id>-<slug>.md. Format: kaa-infra/projects/README.md.\n# new_projects: project tags created on this page that the registry doesn't have yet (the sync adds them).\n# Comments in this header are kept when the page saves; comments further down are not.";
const CODE_RE = /^[A-Z]{2,5}$/;

Object.assign(I18N.en, {
  "tab.ideas": "Ideas", "idMissing": "The ideas module (ideas.js) didn't load. Reload the page.",
  "id.menu": "Idea", "id.menuHint": "A thought about any project", "id.new": "New idea", "id.title": "Idea", "id.titlePh": "In one line: what if…",
  "id.desc": "Details", "id.descPh": "Why, for whom, first thoughts (optional)", "id.tags": "Projects", "id.tagsHint": "Tap one or more; the first is the main one.",
  "id.newTag": "+ New project", "id.code": "Code", "id.codePh": "2–5 letters", "id.name": "Name", "id.addTag": "Add", "id.badCode": "Code: 2–5 Latin letters, not used yet.",
  "id.save": "Save", "id.close": "Close", "id.discard": "Delete the draft", "id.needTitle": "Write the idea and pick at least one project.",
  "id.saved": i => `Idea saved: ${i}`, "id.savedEdits": "Ideas saved", "id.saving": "Saving the idea…", "id.loadErr": "Couldn't load ideas: ",
  "id.st.new": "New", "id.st.exploring": "Exploring", "id.st.planned": "Planned", "id.st.parked": "Parked", "id.st.rejected": "Rejected",
  "id.v.active": "Active", "id.v.all": "Any status", "id.v.search": "Search ideas", "id.v.allTags": "All projects", "id.v.none": "No ideas yet. Capture one with the button in the bottom-right corner or here.",
  "id.v.empty": "No ideas match the filters.", "id.v.syncPending": "Only ideas captured on this page for now: ideas from other places appear once the sync with kaa-infra is set up.",
  "id.v.readOnly": s => `Read-only here: this idea's master copy is "${s}".`, "id.v.links": "Links (task ids, update ids, URLs; comma-separated)",
  "id.v.toTask": "Make a task", "id.v.toUpdate": "Make an update", "id.v.taskTitle": "Task title (English)", "id.v.create": "Create",
  "id.v.createdTask": t => `Task ${t} created from the idea`, "id.v.createdUpdate": u => `Update ${u} created from the idea`, "id.v.primary": "main",
  "fba.ideas-filters": "Idea filters", "fba.ideas-list": "Ideas list"
});
Object.assign(I18N.ru, {
  "tab.ideas": "Идеи", "idMissing": "Модуль идей (ideas.js) не загрузился. Перезагрузите страницу.",
  "id.menu": "Идея", "id.menuHint": "Мысль про любой проект", "id.new": "Новая идея", "id.title": "Идея", "id.titlePh": "Одной строкой: а что если…",
  "id.desc": "Подробности", "id.descPh": "Зачем, для кого, первые мысли (необязательно)", "id.tags": "Проекты", "id.tagsHint": "Отметьте один или несколько; первый — основной.",
  "id.newTag": "+ Новый проект", "id.code": "Код", "id.codePh": "2–5 букв", "id.name": "Название", "id.addTag": "Добавить", "id.badCode": "Код: 2–5 латинских букв, ещё не занятый.",
  "id.save": "Сохранить", "id.close": "Закрыть", "id.discard": "Удалить черновик", "id.needTitle": "Напишите идею и отметьте хотя бы один проект.",
  "id.saved": i => `Идея сохранена: ${i}`, "id.savedEdits": "Идеи сохранены", "id.saving": "Сохраняю идею…", "id.loadErr": "Не удалось загрузить идеи: ",
  "id.st.new": "Новая", "id.st.exploring": "Обдумываю", "id.st.planned": "В плане", "id.st.parked": "Отложена", "id.st.rejected": "Отклонена",
  "id.v.active": "Активные", "id.v.all": "Любой статус", "id.v.search": "Поиск по идеям", "id.v.allTags": "Все проекты", "id.v.none": "Идей пока нет. Запишите первую кнопкой в правом нижнем углу или здесь.",
  "id.v.empty": "Нет идей под эти фильтры.", "id.v.syncPending": "Пока только идеи, записанные на этой странице: идеи из других мест появятся, когда заработает синхронизация с kaa-infra.",
  "id.v.readOnly": s => `Здесь только просмотр: основная копия этой идеи — «${s}».`, "id.v.links": "Связи (id задач, апдейтов, ссылки; через запятую)",
  "id.v.toTask": "Сделать задачей", "id.v.toUpdate": "Сделать апдейтом", "id.v.taskTitle": "Название задачи (по-английски)", "id.v.create": "Создать",
  "id.v.createdTask": t => `Из идеи создана задача ${t}`, "id.v.createdUpdate": u => `Из идеи создан апдейт ${u}`, "id.v.primary": "основной",
  "fba.ideas-filters": "Фильтры идей", "fba.ideas-list": "Список идей"
});

/* ---------- data ---------- */
let own = null, ownHead = "", ownSha = null, newProjects = [], others = [], registry = [], othersLoaded = false, loadErr = null;
let pending = [], saving = false, saveTimer = null, saveErr = null, openId = null, toTaskId = null;
const v = Object.assign({ tags: [], status: "active", q: "" }, store.get("ideasView", {}));
const asText = x => x == null ? "" : String(x);
const asList = x => Array.isArray(x) ? x.map(asText).filter(Boolean) : asText(x) ? asText(x).split(",").map(s => s.trim()).filter(Boolean) : [];
const norm = x => ({ ...Object.fromEntries(Object.entries(x).map(([k, val]) => [k, Array.isArray(val) ? val.map(asText) : asText(val)])), projects: asList(x.projects), links: asList(x.links) });
const nowMsk = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

function projects() {
  const seen = new Set(), out = [];
  [...registry, ...newProjects].forEach(p => { if (p && p.code && !seen.has(p.code)) { seen.add(p.code); out.push({ code: p.code, name: p.name || p.code }); } });
  return out;
}
const projectName = code => projects().find(p => p.code === code)?.name || code;
function parseSource(text) {
  const data = jsyaml.load(text, YAML_OPTS) || {};
  return { ideas: (Array.isArray(data.ideas) ? data.ideas : []).filter(x => x && typeof x === "object").map(norm),
    newProjects: (Array.isArray(data.new_projects) ? data.new_projects : []).filter(p => p && p.code).map(p => ({ code: asText(p.code), name: asText(p.name) })) };
}
function serialize(ideas, np) {
  const body = jsyaml.dump({
    new_projects: np.map(p => ({ code: p.code, name: p.name })),
    ideas: ideas.map(it => { const o = {}; FIELDS.forEach(f => { const val = it[f]; if (Array.isArray(val) ? val.length || f === "projects" || f === "links" : asText(val) !== "") o[f] = val; }); return o; })
  }, { ...YAML_OPTS, lineWidth: -1, noRefs: true, flowLevel: 3 });
  return (ownHead || HEAD_DEFAULT) + "\n\n" + body;
}
function validate(ideas, np) {
  const errs = [], seen = new Set(), codes = new Set([...registry.map(p => p.code), ...np.map(p => p.code)]);
  ideas.forEach(it => {
    const m = /^([A-Z]{2,5})-I-(\d{3,})$/.exec(it.id || "");
    if (!m) errs.push(`${it.id || "?"}: bad id`);
    if (seen.has(it.id)) errs.push(`${it.id}: duplicate id`); seen.add(it.id);
    if (!it.projects.length) errs.push(`${it.id}: no project`);
    it.projects.forEach(c => { if (!codes.has(c)) errs.push(`${it.id}: unknown project ${c}`); });
    if (m && it.projects[0] !== m[1]) errs.push(`${it.id}: id must start with the first project`);
    if (!asText(it.title).trim()) errs.push(`${it.id}: no title`);
    if (asText(it.title).length > 100) errs.push(`${it.id}: title longer than 100 characters`);
    if (!STATUSES.includes(it.status)) errs.push(`${it.id}: unknown status ${it.status}`);
  });
  np.forEach(p => { if (!CODE_RE.test(p.code)) errs.push(`project code ${p.code}: 2–5 uppercase letters`); });
  return errs;
}
function nextIdeaId(primary, ideas) {
  const prefix = `${primary}-I-`;
  const n = Math.max(0, ...[...ideas, ...others].filter(i => asText(i.id).startsWith(prefix)).map(i => parseInt(i.id.slice(prefix.length), 10) || 0)) + 1;
  return prefix + String(n).padStart(3, "0");
}

async function load() {
  if (pending.length || saving) return;
  const get = path => gh(`${repoPath()}/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`).catch(e => { if (e.status === 404) return null; throw e; });
  try {
    const [a, b, r] = await Promise.all([get(SRC_PATH), get(ALL_PATH), get(REG_PATH)]);
    if (a) { const text = b64decode(a.content); ownHead = splitHeader(text)[0]; const p = parseSource(text); own = p.ideas; newProjects = p.newProjects; ownSha = a.sha; }
    else { own = []; newProjects = []; ownSha = null; ownHead = ""; }
    others = b ? ((jsyaml.load(b64decode(b.content), YAML_OPTS) || {}).ideas || []).filter(x => x && typeof x === "object").map(norm).filter(i => i.source !== SOURCE) : [];
    othersLoaded = !!b;
    // the registry copy in the repo; if it isn't there yet, the copy that ships with the page (build.py → projects.yaml)
    const regText = r ? b64decode(r.content) : await fetch("projects.yaml", { cache: "no-store" }).then(x => x.ok ? x.text() : "").catch(() => "");
    const reg = ((regText && jsyaml.load(regText, YAML_OPTS)) || {}).projects || [];
    if (reg.length) registry = reg.filter(p => p && p.code).map(p => ({ code: asText(p.code), name: asText(p.name) }));
    loadErr = null;
  } catch (e) {
    loadErr = T("id.loadErr") + e.message;
    if (!own) own = [];
  }
}

/* ops are replayed on a newer file if it changed meanwhile */
function apply(state, op) {
  if (op.type === "project") {
    if (!state.np.some(p => p.code === op.project.code) && !registry.some(p => p.code === op.project.code)) state.np.push({ ...op.project });
  } else if (op.type === "add") {
    if (state.ideas.some(i => i.id === op.item.id)) op.item.id = nextIdeaId(op.item.projects[0], state.ideas);
    state.ideas.push({ ...op.item, projects: [...op.item.projects], links: [...op.item.links] });
  } else if (op.type === "update") {
    const it = state.ideas.find(i => i.id === op.id);
    if (it) Object.assign(it, op.fields);
  }
}
function edit_(op, soon) {
  const st = { ideas: own, np: newProjects }; apply(st, op);
  pending.push(op); saveErr = null;
  clearTimeout(saveTimer); saveTimer = setTimeout(save, soon ? 50 : 1500);
  render();
}
function describe(ops) {
  return [...new Set(ops.map(op => op.type === "project" ? `tag ${op.project.code} added` : op.type === "add" ? `${op.item.id} added`
    : op.fields.status ? `${op.id} → ${op.fields.status}` : `${op.id} edited`))].join(", ");
}
async function save() {
  if (saving || !pending.length) return;
  const errs = validate(own, newProjects);
  if (errs.length) { saveErr = T("save.not") + errs.join("; "); toast(esc(saveErr), 0, true); return; }
  saving = true; toast(T("id.saving"));
  const ops = pending.slice(), message = `ideas: ${describe(ops)}\n\nSaved from the roadmap page.`;
  const put = (ideas, np, sha) => gh(`${repoPath()}/contents/${SRC_PATH}`, { method: "PUT",
    body: { message, content: b64encode(serialize(ideas, np)), branch: cfg.branch, ...(sha ? { sha } : {}) } });
  try {
    let res;
    try { res = await put(own, newProjects, ownSha); }
    catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      const latest = await gh(`${repoPath()}/contents/${SRC_PATH}?ref=${encodeURIComponent(cfg.branch)}`).catch(x => { if (x.status === 404) return null; throw x; });
      const base = latest ? parseSource(b64decode(latest.content)) : { ideas: [], newProjects: [] };
      if (latest) ownHead = splitHeader(b64decode(latest.content))[0];
      const st = { ideas: base.ideas, np: base.newProjects };
      ops.forEach(op => apply(st, op));
      res = await put(st.ideas, st.np, latest ? latest.sha : null);
      pending.slice(ops.length).forEach(op => apply(st, op));
      own = st.ideas; newProjects = st.np;
    }
    ownSha = res.content.sha; pending = pending.slice(ops.length);
    const added = ops.filter(op => op.type === "add").map(op => op.item.id);
    if (added.length) { store.set("ideaDraft", null); toast(T("id.saved", `<span class="mono">${esc(added.at(-1))}</span>`), 6000); } else toast(T("id.savedEdits"), 2500);
  } catch (e) {
    saveErr = e instanceof TypeError ? T("save.offline") : e.status === 401 || e.status === 403 ? T("save.perm") : T("save.not") + e.message;
    toast(esc(saveErr), 0, true);
  } finally {
    saving = false; render();
    if (pending.length && !saveErr) { clearTimeout(saveTimer); saveTimer = setTimeout(save, 800); }
  }
}

/* public: used by the form, the Ideas tab and the intake agent */
function addIdea({ title, description, projects: tags, reporter }) {
  if (!own) throw new Error("ideas not loaded");
  const codes = asList(tags);
  const now = nowMsk();
  const item = { id: nextIdeaId(codes[0], own), projects: codes, title: asText(title).trim().slice(0, 100), description: asText(description).trim(),
    status: "new", links: [], reporter: reporter || "kaa", source: SOURCE, created: now, updated: now };
  edit_({ type: "add", item }, true);
  return item;
}
const openIdeas = () => [...(own || []), ...others].filter(i => ACTIVE.has(i.status)).map(i => ({ id: i.id, projects: i.projects, title: i.title }));

/* ---------- markup: form and toast (styles from feedback.css) ---------- */
const root = document.createElement("div");
root.className = "fb-ui";
root.innerHTML = `<div class="fb-modal" id="id-modal" hidden></div><div class="fb-toast" id="id-toast" role="status" hidden></div>`;
document.body.appendChild(root);
const modal = root.querySelector("#id-modal"), toastEl = root.querySelector("#id-toast");
let toastTimer = null;
function toast(html, ms, retry) {
  clearTimeout(toastTimer);
  toastEl.innerHTML = `<span>${html}</span>${retry ? `<button type="button" data-act="retry">${T("fb.retry")}</button>` : ""}`;
  toastEl.hidden = false;
  if (ms) toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}
toastEl.addEventListener("click", e => { if (e.target.closest('[data-act="retry"]')) { saveErr = null; toastEl.hidden = true; save(); } });

const getDraft = () => store.get("ideaDraft", null) || { title: "", description: "", projects: [] };
const setDraft = d => store.set("ideaDraft", d);
let tagFormOpen = false;
function tagChips(selected, attr) {
  return projects().map(p => {
    const i = selected.indexOf(p.code);
    return `<button type="button" class="id-chip" ${attr}="${esc(p.code)}" aria-pressed="${i >= 0}" title="${esc(p.name)}">${i === 0 ? "★ " : i > 0 ? `${i + 1} · ` : ""}<span class="mono">${esc(p.code)}</span> ${esc(p.name)}</button>`;
  }).join("");
}
function openForm(preset) {
  if (preset) setDraft({ ...getDraft(), ...preset });
  tagFormOpen = false; renderForm(); modal.hidden = false; modal.querySelector("#id-title")?.focus();
}
function closeForm() { modal.hidden = true; modal.innerHTML = ""; }
function renderForm(error) {
  const d = getDraft();
  modal.innerHTML = `<form class="fb-form" role="dialog" aria-modal="true" aria-labelledby="id-form-h" novalidate>
    <h2 id="id-form-h">${T("id.new")}</h2>
    <label class="field"><span>${T("id.title")}</span><input type="text" id="id-title" maxlength="100" value="${esc(d.title)}" placeholder="${T("id.titlePh")}"></label>
    <label class="field"><span>${T("id.desc")}</span><textarea id="id-desc" rows="4" placeholder="${T("id.descPh")}">${esc(d.description)}</textarea></label>
    <div class="field"><span>${T("id.tags")}</span><div class="id-chips">${tagChips(d.projects, "data-tag")}
      <button type="button" class="id-chip id-chip-add" data-act="tag-form">${T("id.newTag")}</button></div>
      <small class="muted">${T("id.tagsHint")}</small></div>
    ${tagFormOpen ? `<div class="id-newtag"><label class="field"><span>${T("id.code")}</span><input type="text" id="id-code" maxlength="5" placeholder="${T("id.codePh")}" style="text-transform:uppercase"></label>
      <label class="field"><span>${T("id.name")}</span><input type="text" id="id-name"></label><button class="btn" type="button" data-act="tag-add">${T("id.addTag")}</button></div>` : ""}
    ${error ? `<div class="fb-err">${esc(error)}</div>` : ""}
    <div class="actions">
      <div style="display:flex;gap:8px"><button class="btn primary" type="submit">${T("id.save")}</button><button class="btn" type="button" data-act="close">${T("id.close")}</button></div>
      <button class="btn danger" type="button" data-act="discard">${T("id.discard")}</button>
    </div></form>`;
  const f = modal.querySelector("form"), upd = patch => setDraft({ ...getDraft(), ...patch });
  f.querySelector("#id-title").oninput = e => upd({ title: e.target.value });
  f.querySelector("#id-desc").oninput = e => upd({ description: e.target.value });
  f.querySelectorAll("[data-tag]").forEach(b => b.onclick = () => {
    const cur = getDraft().projects, c = b.dataset.tag;
    upd({ projects: cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c] }); renderForm();
  });
  f.querySelector('[data-act="tag-form"]').onclick = () => { tagFormOpen = !tagFormOpen; renderForm(); modal.querySelector("#id-code")?.focus(); };
  const addTag = f.querySelector('[data-act="tag-add"]');
  if (addTag) addTag.onclick = () => {
    const code = asText(modal.querySelector("#id-code").value).trim().toUpperCase(), name = asText(modal.querySelector("#id-name").value).trim() || code;
    if (!CODE_RE.test(code) || projects().some(p => p.code === code)) return renderForm(T("id.badCode"));
    pendingTags.push({ code, name }); newProjects.push({ code, name });   // shown at once; saved with the idea
    upd({ projects: [...getDraft().projects, code] }); tagFormOpen = false; renderForm();
  };
  f.querySelector('[data-act="close"]').onclick = closeForm;
  f.querySelector('[data-act="discard"]').onclick = () => { setDraft(null); closeForm(); };
  const submit = e => {
    e.preventDefault();
    const d2 = getDraft();
    if (!asText(d2.title).trim() || !d2.projects.length) return renderForm(T("id.needTitle"));
    if (!own || !cfg.token) return renderForm(T("fb.notLoaded"));
    // a tag created in this form becomes a "project" op so it is saved (and replayed) together with the idea
    pendingTags.splice(0).forEach(p => { newProjects = newProjects.filter(x => x.code !== p.code); edit_({ type: "project", project: p }, true); });
    closeForm();
    addIdea({ title: d2.title, description: d2.description, projects: d2.projects });
  };
  f.addEventListener("submit", submit); f.querySelector('[type="submit"]').addEventListener("click", submit);
}
const pendingTags = [];
modal.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); closeForm(); } });
modal.addEventListener("pointerdown", e => { if (e.target === modal) closeForm(); });

/* ---------- the Ideas tab ---------- */
const all = () => [...others, ...(own || [])];
function openCount() { return all().filter(i => ACTIVE.has(i.status)).length; }
function filtered() {
  const s = v.q.trim().toLowerCase();
  return all().filter(i => (!v.tags.length || i.projects.some(c => v.tags.includes(c)))
    && (v.status === "all" || (v.status === "active" ? ACTIVE.has(i.status) : i.status === v.status))
    && (!s || [i.id, i.title, i.description].join(" ").toLowerCase().includes(s)))
    .sort((a, b) => asText(b.created).localeCompare(asText(a.created)) || b.id.localeCompare(a.id, undefined, { numeric: true }));
}
const fmtWhen = s => s ? `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}`.trim() : "";
function renderView() {
  if (own === null && !loadErr) return `<div class="note" style="margin-top:14px">${T("loading")}</div>`;
  const list = filtered();
  const opt = (val, label, cur) => `<option value="${esc(val)}" ${val === cur ? "selected" : ""}>${esc(label)}</option>`;
  return `<div class="fb-view">
    ${loadErr ? `<div class="error">${esc(loadErr)}</div>` : ""}
    ${!othersLoaded ? `<div class="note">${T("id.v.syncPending")}</div>` : ""}
    <div class="fb-filters"${fbA("ideas-filters")}>
      <input type="search" id="idv-q" placeholder="${T("id.v.search")}" aria-label="${T("id.v.search")}" value="${esc(v.q)}">
      <select id="idv-status" aria-label="${T("fb.v.status")}">${opt("active", T("id.v.active"), v.status)}${opt("all", T("id.v.all"), v.status)}${STATUSES.map(s => opt(s, T("id.st." + s), v.status)).join("")}</select>
      <span class="fb-spacer"></span>
      <button class="btn primary" type="button" id="idv-new">${T("id.new")}</button>
    </div>
    <div class="id-chips id-filter-chips"><button type="button" class="id-chip" data-ftag="" aria-pressed="${!v.tags.length}">${T("id.v.allTags")}</button>
      ${projects().map(p => `<button type="button" class="id-chip" data-ftag="${esc(p.code)}" aria-pressed="${v.tags.includes(p.code)}" title="${esc(p.name)}"><span class="mono">${esc(p.code)}</span> ${esc(p.name)}</button>`).join("")}</div>
    ${!all().length ? `<div class="note">${T("id.v.none")}</div>` : !list.length ? `<div class="note">${T("id.v.empty")}</div>`
      : `<ul class="id-list"${fbA("ideas-list")}>${list.map(renderCard).join("")}</ul>`}
  </div>`;
}
function renderCard(it) {
  const open = openId === it.id, mine = it.source === SOURCE;
  return `<li class="id-card ${open ? "is-open" : ""}"${fbA("idea-" + it.id, it.id + " · " + it.title)}>
    <button type="button" class="id-head" data-open-idea="${esc(it.id)}" aria-expanded="${open}">
      <span class="id-top"><span class="mono id-id">${esc(it.id)}</span><span class="fb-pill id-st-${esc(it.status)}">${esc(T("id.st." + it.status))}</span><span class="muted id-when">${esc(fmtWhen(it.created))}</span></span>
      <span class="id-name">${esc(it.title)}</span>
      <span class="id-tags">${it.projects.map((c, i) => `<span class="id-tag ${i === 0 ? "is-primary" : ""}" title="${esc(projectName(c))}${i === 0 ? " · " + T("id.v.primary") : ""}">${esc(c)}</span>`).join("")}</span>
    </button>
    ${open ? renderDetail(it, mine) : ""}
  </li>`;
}
function renderDetail(it, mine) {
  const msOpt = doc.milestones.map(m => `<option value="${esc(m.id)}">${esc(m.title)}</option>`).join("");
  return `<div class="id-detail">
    ${it.description ? `<p class="desc" style="white-space:pre-wrap;margin:0">${esc(it.description)}</p>` : ""}
    <p class="muted" style="margin:0;font-size:13px">${it.projects.map(c => `${esc(c)} — ${esc(projectName(c))}`).join(" · ")}</p>
    ${!mine ? `<div class="note">${esc(T("id.v.readOnly", it.source))}</div>` : `
    <form class="editor" data-idea-form="${esc(it.id)}" style="grid-column:auto;margin:0">
      <div class="grid2">
        <label class="field"><span>${T("fb.v.status")}</span><select name="status">${STATUSES.map(s => `<option value="${s}" ${s === it.status ? "selected" : ""}>${esc(T("id.st." + s))}</option>`).join("")}</select></label>
        <label class="field"><span>${T("id.v.links")}</span><input type="text" name="links" value="${esc(it.links.join(", "))}"></label>
      </div>
      <div class="actions"><div style="display:flex;gap:8px"><button class="btn primary" type="submit">${T("save")}</button>
        <button class="btn" type="button" data-to-task="${esc(it.id)}">${T("id.v.toTask")}</button>
        <button class="btn" type="button" data-to-update="${esc(it.id)}">${T("id.v.toUpdate")}</button></div></div>
    </form>
    ${toTaskId === it.id ? `<form class="editor" data-task-from="${esc(it.id)}" style="grid-column:auto;margin:0">
      <label class="field"><span>${T("id.v.taskTitle")}</span><input type="text" name="title" value="${esc(it.title)}" required></label>
      <div class="grid2">
        <label class="field"><span>${T("milestone")}</span><select name="milestone"><option value="">${T("none")}</option>${msOpt}</select></label>
        <label class="field"><span>${T("area")}</span><select name="area">${AREAS.map(a => `<option value="${a}">${esc(T("area." + a))}</option>`).join("")}</select></label>
      </div>
      <div class="actions"><div style="display:flex;gap:8px"><button class="btn primary" type="submit">${T("id.v.create")}</button><button class="btn" type="button" data-task-cancel>${T("cancel")}</button></div></div>
    </form>` : ""}`}
  </div>`;
}
function link(it, ref) {
  const links = [...new Set([...it.links, ref])];
  edit_({ type: "update", id: it.id, fields: { links, status: "planned", updated: nowMsk() } });
}
function bindView(rootEl) {
  const keep = () => store.set("ideasView", v);
  const q = rootEl.querySelector("#idv-q");
  if (q) q.oninput = e => { v.q = e.target.value; keep(); const pos = e.target.selectionStart; render(); const n = $("idv-q"); n.focus(); n.setSelectionRange(pos, pos); };
  const st = rootEl.querySelector("#idv-status"); if (st) st.onchange = e => { v.status = e.target.value; keep(); render(); };
  rootEl.querySelector("#idv-new")?.addEventListener("click", () => openForm(v.tags.length ? { projects: [...v.tags] } : null));
  rootEl.querySelectorAll("[data-ftag]").forEach(b => b.onclick = () => {
    const c = b.dataset.ftag; v.tags = !c ? [] : v.tags.includes(c) ? v.tags.filter(x => x !== c) : [...v.tags, c]; keep(); render();
  });
  rootEl.querySelectorAll("[data-open-idea]").forEach(b => b.onclick = () => { openId = openId === b.dataset.openIdea ? null : b.dataset.openIdea; toTaskId = null; render(); });
  const formRun = (f, fn) => { const run = e => { e.preventDefault(); fn(new FormData(f)); }; f.addEventListener("submit", run); f.querySelector('[type="submit"]').addEventListener("click", run); };
  rootEl.querySelectorAll("[data-idea-form]").forEach(f => formRun(f, fd => {
    const it = own.find(x => x.id === f.dataset.ideaForm); if (!it) return;
    const fields = {}, links = asList(fd.get("links"));
    if (fd.get("status") !== it.status) fields.status = fd.get("status");
    if (links.join(",") !== it.links.join(",")) fields.links = links;
    if (Object.keys(fields).length) edit_({ type: "update", id: it.id, fields: { ...fields, updated: nowMsk() } }); else render();
  }));
  rootEl.querySelectorAll("[data-to-task]").forEach(b => b.onclick = () => { toTaskId = toTaskId === b.dataset.toTask ? null : b.dataset.toTask; render(); });
  rootEl.querySelectorAll("[data-task-cancel]").forEach(b => b.onclick = () => { toTaskId = null; render(); });
  rootEl.querySelectorAll("[data-task-from]").forEach(f => formRun(f, fd => {
    const it = own.find(x => x.id === f.dataset.taskFrom), title = asText(fd.get("title")).trim(); if (!it || !title) return;
    const id = nextId();
    edit({ type: "add-task", task: clean({ id, title, milestone: fd.get("milestone") || "", area: fd.get("area"), status: "todo", owner: "kaa", created: today(), notes: `From idea ${it.id}` }) });
    toTaskId = null; link(it, id); toast(T("id.v.createdTask", `<span class="mono">${esc(id)}</span>`), 5000);
  }));
  rootEl.querySelectorAll("[data-to-update]").forEach(b => b.onclick = () => {
    const it = own.find(x => x.id === b.dataset.toUpdate); if (!it || !window.FB?.addItem) return;
    const item = FB.addItem({ type: "update", title: it.title, description: `${it.description || it.title}\n\nFrom idea ${it.id}`, priority: "normal" });
    link(it, item.id); toast(T("id.v.createdUpdate", `<span class="mono">${esc(item.id)}</span>`), 5000);
  });
}

window.IDEAS = { load, openCount, renderView, bindView, busy: () => pending.length > 0 || saving, openForm: () => openForm(null), projects, openIdeas, addIdea };
})();
