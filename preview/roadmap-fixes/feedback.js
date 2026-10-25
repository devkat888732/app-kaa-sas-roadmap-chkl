/* AI-generated (Claude) · 2026-10-15 · not reviewed by a human
 *
 * Report widget (bugs / updates) and the Feedback view of the roadmap page.
 * Spec: roadmap/FEEDBACK__ai.md · data format, ids, CSV: kaa-infra/feedback/README.md.
 *
 * Self-contained module (styles in feedback.css). It relies on the host page's globals:
 *   DEFAULTS (project, feedback_items, feedback_all, build, preview), cfg, ui, lang, I18N, T, $, esc, store, gh, repoPath,
 *   b64decode, b64encode, splitHeader, YAML_OPTS, jsyaml, TABS, fmtDate, render, renderConnect, openEditor,
 *   and window.RoadmapCore (roadmap/core/feedback.js: format, validation, ids, edit operations — shared with the Штаб bot)
 * and exposes window.FB = { load, openCount, renderView, bindView, busy } for the host page.
 * Interface areas are marked by the host page with data-fb (machine name) and data-fb-label (human name).
 */
(() => {
"use strict";

/* ---------- format (kaa-infra/feedback/README.md); the logic lives in roadmap/core/feedback.js ---------- */
const C = window.RoadmapCore;
const STATUSES = C.FEEDBACK_STATUSES;
const CLOSED = new Set(C.FEEDBACK_CLOSED);
const ENUMS = C.FEEDBACK_ENUMS;
const FIELDS = C.FEEDBACK_FIELDS;   // CSV columns
const PROJECT = DEFAULTS.project || "SASMP";
const ITEMS_PATH = DEFAULTS.feedback_items, ALL_PATH = DEFAULTS.feedback_all;
const HEAD_DEFAULT = C.feedbackHeadDefault(PROJECT);

/* ---------- texts ---------- */
Object.assign(I18N.en, {
  "fb.btn": "Report a bug or an update", "fb.report": "Report", "fb.bug": "Bug", "fb.bugHint": "Something works wrong", "fb.update": "Update", "fb.updateHint": "An improvement or a new idea",
  "fb.draft": "Continue the draft", "fb.needToken": "Connect to GitHub to report.", "fb.openSettings": "Open settings",
  "fb.pickBug": "Click the part of the page the bug is about", "fb.pickUpdate": "Click the part of the page the update is about",
  "fb.inside": l => `inside “${l}”`, "fb.wholePage": "Whole page", "fb.cancel": "Cancel", "fb.levelUp": "Level up",
  "fb.goInside": "Go inside", "fb.up": "Up one level", "fb.confirm": "Choose this place",
  "fb.keys": "Enter — choose · → inside · ← up · Tab — next · Esc — cancel",
  "fb.newBug": "New bug", "fb.newUpdate": "New update", "fb.where": "Where", "fb.change": "Change",
  "fb.title": "Title", "fb.titlePhBug": "Short: what's wrong", "fb.titlePhUpdate": "Short: what to improve",
  "fb.desc": "Description", "fb.descPhBug": "What happened\nWhat you expected\nHow to repeat it", "fb.descPhUpdate": "What should change and why",
  "fb.priority": "Priority", "fb.ctx": "Details sent with the report", "fb.save": "Save", "fb.discard": "Delete the draft", "fb.close": "Close",
  "fb.required": "Fill in the title and the description.", "fb.notLoaded": "The roadmap hasn't loaded yet. Wait a second and press Save again.",
  "fb.saving": "Saving…", "fb.saved": id => `Saved ${id}`, "fb.savedEdits": "Changes saved", "fb.copy": "Copy id", "fb.copied": "Copied", "fb.open": "Open",
  "fb.retry": "Retry", "fb.loadErr": "Couldn't load the feedback log: ",
  "fb.c.page": "Page", "fb.c.branch": "Branch", "fb.c.build": "Build", "fb.c.viewport": "Screen", "fb.c.theme": "Theme", "fb.c.lang": "Language", "fb.c.user_agent": "Browser",
  "fb.t.bug": "Bug", "fb.t.update": "Update", "fb.comp": "About", "fb.cp.site": "🌐 Site", "fb.cp.bot": "🤖 Bot", "fb.cp.both": "🌐🤖 Both", "fb.cp.none": "—", "fb.v.anyComp": "Site and bot", "fb.f.component": "About",
  "fb.st.new": "New", "fb.st.accepted": "Accepted", "fb.st.in-progress": "In progress", "fb.st.in-review": "In review", "fb.st.done": "Done", "fb.st.rejected": "Rejected", "fb.st.duplicate": "Duplicate",
  "fb.v.project": "Project", "fb.v.allProjects": "All projects", "fb.v.anyType": "Any type", "fb.v.open": "Open", "fb.v.all": "Any status", "fb.v.anyPriority": "Any priority",
  "fb.v.search": "Search id, title, description, place", "fb.v.csvAll": "CSV: all items", "fb.v.csvFiltered": "CSV: this filter",
  "fb.v.id": "Id", "fb.v.type": "Type", "fb.v.status": "Status", "fb.v.priority": "Priority", "fb.v.title": "Title", "fb.v.location": "Where", "fb.v.created": "Created",
  "fb.v.empty": "No items match the filters.", "fb.v.none": "No bugs or updates yet. Use the button in the bottom-right corner to report one.",
  "fb.v.syncPending": p => `Only ${p} items for now: other projects appear here once the sync with kaa-infra is set up.`,
  "fb.v.readOnly": p => `Read-only here: ${p} items are edited on that project's own page.`,
  "fb.v.showOnPage": "Show on page", "fb.v.notFound": "This place isn't on the page any more.",
  "fb.f.screenshot": "Screenshot", "fb.shotErr": "The screenshot didn't load.", "fb.f.description": "Description", "fb.f.location": "Where", "fb.f.anchor": "Area", "fb.f.selector": "Element", "fb.f.page": "Page", "fb.f.branch": "Branch",
  "fb.f.build": "Build", "fb.f.viewport": "Screen", "fb.f.theme": "Theme", "fb.f.lang": "Language", "fb.f.user_agent": "Browser", "fb.f.reporter": "Reported by",
  "fb.f.created": "Created", "fb.f.updated": "Updated", "fb.f.closed": "Closed", "fb.f.resolution": "Resolution", "fb.f.work_branch": "Work branch", "fb.f.pr": "PR", "fb.f.task": "Roadmap task",
  "fba.page": "Whole page", "fba.header": "Header", "fba.title": "Title", "fba.toolbar": "Toolbar", "fba.previews-menu": "Previews menu", "fba.language": "Language switch",
  "fba.theme": "Theme switch", "fba.preview-banner": "Preview banner", "fba.summary": "Summary", "fba.progress": "Overall progress", "fba.status-cards": "Status cards",
  "fba.tabs": "Tabs", "fba.filters": "Filters", "fba.editor": "Editor", "fba.settings": "Settings", "fba.save-bar": "Save bar",
  "fba.fb-filters": "Feedback filters", "fba.fb-table": "Feedback table", "fba.roadmap": "Roadmap", "fba.goal": "Final result"
});
Object.assign(I18N.ru, {
  "fb.btn": "Сообщить о баге или апдейте", "fb.report": "Сообщить", "fb.bug": "Баг", "fb.bugHint": "Что-то работает не так", "fb.update": "Апдейт", "fb.updateHint": "Улучшение или новая идея",
  "fb.draft": "Продолжить черновик", "fb.needToken": "Чтобы сообщить, подключитесь к GitHub.", "fb.openSettings": "Открыть настройки",
  "fb.pickBug": "Нажмите на часть страницы, к которой относится баг", "fb.pickUpdate": "Нажмите на часть страницы, к которой относится апдейт",
  "fb.inside": l => `внутри «${l}»`, "fb.wholePage": "Вся страница", "fb.cancel": "Отмена", "fb.levelUp": "Уровнем выше",
  "fb.goInside": "Провалиться внутрь", "fb.up": "На уровень выше", "fb.confirm": "Выбрать это место",
  "fb.keys": "Enter — выбрать · → внутрь · ← выше · Tab — следующая · Esc — отмена",
  "fb.newBug": "Новый баг", "fb.newUpdate": "Новый апдейт", "fb.where": "Где", "fb.change": "Изменить",
  "fb.title": "Название", "fb.titlePhBug": "Коротко: что не так", "fb.titlePhUpdate": "Коротко: что улучшить",
  "fb.desc": "Описание", "fb.descPhBug": "Что произошло\nЧего ожидали\nКак повторить", "fb.descPhUpdate": "Что поменять и зачем",
  "fb.priority": "Приоритет", "fb.ctx": "Что отправится вместе с отчётом", "fb.save": "Сохранить", "fb.discard": "Удалить черновик", "fb.close": "Закрыть",
  "fb.required": "Заполните название и описание.", "fb.notLoaded": "Роадмап ещё не загрузился. Подождите секунду и нажмите «Сохранить» снова.",
  "fb.saving": "Сохраняю…", "fb.saved": id => `Сохранено: ${id}`, "fb.savedEdits": "Изменения сохранены", "fb.copy": "Копировать id", "fb.copied": "Скопировано", "fb.open": "Открыть",
  "fb.retry": "Повторить", "fb.loadErr": "Не удалось загрузить журнал багов и апдейтов: ",
  "fb.c.page": "Страница", "fb.c.branch": "Ветка", "fb.c.build": "Сборка", "fb.c.viewport": "Экран", "fb.c.theme": "Тема", "fb.c.lang": "Язык", "fb.c.user_agent": "Браузер",
  "fb.t.bug": "Баг", "fb.t.update": "Апдейт", "fb.comp": "Относится к", "fb.cp.site": "🌐 Сайт", "fb.cp.bot": "🤖 Бот", "fb.cp.both": "🌐🤖 Оба", "fb.cp.none": "—", "fb.v.anyComp": "Сайт и бот", "fb.f.component": "Относится к",
  "fb.st.new": "Новый", "fb.st.accepted": "Принят", "fb.st.in-progress": "В работе", "fb.st.in-review": "На проверке", "fb.st.done": "Готово", "fb.st.rejected": "Отклонён", "fb.st.duplicate": "Дубликат",
  "fb.v.project": "Проект", "fb.v.allProjects": "Все проекты", "fb.v.anyType": "Любой тип", "fb.v.open": "Открытые", "fb.v.all": "Любой статус", "fb.v.anyPriority": "Любой приоритет",
  "fb.v.search": "Поиск по id, названию, описанию, месту", "fb.v.csvAll": "CSV: все пункты", "fb.v.csvFiltered": "CSV: по фильтру",
  "fb.v.id": "Id", "fb.v.type": "Тип", "fb.v.status": "Статус", "fb.v.priority": "Приоритет", "fb.v.title": "Название", "fb.v.location": "Где", "fb.v.created": "Создан",
  "fb.v.empty": "Нет пунктов под эти фильтры.", "fb.v.none": "Багов и апдейтов пока нет. Сообщить можно кнопкой в правом нижнем углу.",
  "fb.v.syncPending": p => `Пока только пункты ${p}: другие проекты появятся здесь, когда заработает синхронизация с kaa-infra.`,
  "fb.v.readOnly": p => `Здесь только просмотр: пункты ${p} меняются на странице своего проекта.`,
  "fb.v.showOnPage": "Показать на странице", "fb.v.notFound": "Этого места на странице больше нет.",
  "fb.f.screenshot": "Скриншот", "fb.shotErr": "Скриншот не загрузился.", "fb.f.description": "Описание", "fb.f.location": "Где", "fb.f.anchor": "Область", "fb.f.selector": "Элемент", "fb.f.page": "Страница", "fb.f.branch": "Ветка",
  "fb.f.build": "Сборка", "fb.f.viewport": "Экран", "fb.f.theme": "Тема", "fb.f.lang": "Язык", "fb.f.user_agent": "Браузер", "fb.f.reporter": "Кто сообщил",
  "fb.f.created": "Создан", "fb.f.updated": "Изменён", "fb.f.closed": "Закрыт", "fb.f.resolution": "Итог", "fb.f.work_branch": "Ветка работы", "fb.f.pr": "PR", "fb.f.task": "Задача роадмапа",
  "fba.page": "Вся страница", "fba.header": "Шапка", "fba.title": "Заголовок", "fba.toolbar": "Панель кнопок", "fba.previews-menu": "Меню превью", "fba.language": "Выбор языка",
  "fba.theme": "Выбор темы", "fba.preview-banner": "Плашка превью", "fba.summary": "Сводка", "fba.progress": "Общий прогресс", "fba.status-cards": "Карточки статусов",
  "fba.tabs": "Вкладки", "fba.filters": "Фильтры", "fba.editor": "Редактор", "fba.settings": "Настройки", "fba.save-bar": "Плашка сохранения",
  "fba.fb-filters": "Фильтры багов и апдейтов", "fba.fb-table": "Таблица багов и апдейтов", "fba.roadmap": "Роадмап", "fba.goal": "Конечный результат"
});

/* ---------- data: this project's items (master copy) + the merged copy of all projects ---------- */
let own = null, ownHead = "", ownSha = null, others = [], othersLoaded = false, loadErr = null;
let pending = [], saving = false, saveTimer = null, saveErr = null, openId = null;
const v = Object.assign({ project: "", type: "", component: "", status: "open", priority: "", q: "", sort: "created", dir: "desc" }, store.get("fbView", {}));
const COMPS = RoadmapCore.FEEDBACK_COMPONENTS;
const compIcon = c => c === "site" ? "🌐" : c === "bot" ? "🤖" : c === "both" ? "🌐🤖" : "";

const asText = C.asText;
const parseItems = C.parseFeedback;
const serialize = items => C.serializeFeedback(items, ownHead || HEAD_DEFAULT);
const validate = items => C.validateFeedback(items, PROJECT);
const nextId = (items, type) => C.nextFeedbackId(items, PROJECT, type);
const nowMsk = () => C.nowMsk();
let itemOpened = false;
async function load() {
  if (pending.length || saving) return;   // local edits go out first; their save refreshes the file
  const get = path => gh(`${repoPath()}/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`).catch(e => { if (e.status === 404) return null; throw e; });
  try {
    const [a, b] = await Promise.all([get(ITEMS_PATH), get(ALL_PATH)]);
    if (a) { const text = b64decode(a.content); ownHead = splitHeader(text)[0]; own = parseItems(text); ownSha = a.sha; }
    else { own = []; ownSha = null; ownHead = ""; }
    others = b ? parseItems(b64decode(b.content)).filter(i => i.project !== PROJECT) : [];
    othersLoaded = !!b; loadErr = null;
    // ?item=SASMP-B-006 (the bot's «🔗 На странице» under a saved bug / update): open it once, after the first load
    const want = new URLSearchParams(location.search).get("item");
    if (want && !itemOpened && allItems().some(i => i.id === want)) { itemOpened = true; setTimeout(() => openItem(want), 0); }
  } catch (e) {
    loadErr = T("fb.loadErr") + e.message;
    if (!own) own = [];
  }
}

/* edits are ops, replayed on a newer file when someone else saved meanwhile (same approach as the tasks file) */
const apply = C.applyFeedbackOp;
function edit(op, soon) {
  apply(own, op); pending.push(op); saveErr = null;
  clearTimeout(saveTimer); saveTimer = setTimeout(save, soon ? 50 : 1500);
  render();
}
const describe = C.describeFeedbackOps;
async function save() {
  if (saving || !pending.length) return;
  const errs = validate(own);
  if (errs.length) { saveErr = T("save.not") + errs.join("; "); showError(); return; }
  saving = true; toast(`<span>${T("fb.saving")}</span>`);
  const ops = pending.slice();
  const message = `feedback: ${describe(ops)}\n\nSaved from the roadmap page.`;
  const put = (items, sha) => gh(`${repoPath()}/contents/${ITEMS_PATH}`, { method: "PUT",
    body: { message, content: b64encode(serialize(items)), branch: cfg.branch, ...(sha ? { sha } : {}) } });
  try {
    let res;
    try {
      res = await put(own, ownSha);
    } catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      const latest = await gh(`${repoPath()}/contents/${ITEMS_PATH}?ref=${encodeURIComponent(cfg.branch)}`).catch(x => { if (x.status === 404) return null; throw x; });
      const base = latest ? parseItems(b64decode(latest.content)) : [];
      if (latest) ownHead = splitHeader(b64decode(latest.content))[0];
      ops.forEach(op => apply(base, op));
      res = await put(base, latest ? latest.sha : null);
      pending.slice(ops.length).forEach(op => apply(base, op));
      own = base;
    }
    ownSha = res.content.sha;
    pending = pending.slice(ops.length);
    const added = ops.filter(op => op.type === "add").map(op => op.item.id);
    if (added.length) { clearDraft(); savedToast(added.at(-1)); } else toast(`<span>${T("fb.savedEdits")}</span>`, 2500);
  } catch (e) {
    saveErr = e instanceof TypeError ? T("save.offline") : e.status === 401 || e.status === 403 ? T("save.perm") : T("save.not") + e.message;
    showError();
  } finally {
    saving = false; render();
    if (pending.length && !saveErr) { clearTimeout(saveTimer); saveTimer = setTimeout(save, 800); }
  }
}

/* ---------- widget markup ---------- */
const root = document.createElement("div");
root.className = "fb-ui";
root.innerHTML = `
  <div class="fb-dock" id="fb-dock">
    <div class="fb-menu" id="fb-menu" role="menu" hidden></div>
    <button class="fb-btn" id="fb-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="fb-menu">
      <svg class="fb-reticle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
        <g class="ring"><path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5"/><path d="M19.5 12a7.5 7.5 0 0 1-7.5 7.5"/><path d="M12 19.5A7.5 7.5 0 0 1 4.5 12"/><path d="M4.5 12A7.5 7.5 0 0 1 9 5.1"/></g>
        <g class="ticks"><path d="M12 1.5v3"/><path d="M12 19.5v3"/><path d="M1.5 12h3"/><path d="M19.5 12h3"/></g>
        <circle class="dot-bug" cx="10.4" cy="10.4" r="1.9" stroke="none"/><circle class="dot-upd" cx="13.6" cy="13.6" r="1.9" stroke="none"/>
      </svg>
      <span class="fb-btn-label" id="fb-btn-label"></span>
    </button>
  </div>
  <div class="fb-overlay" id="fb-overlay" hidden></div>
  <div class="fb-hl" id="fb-scope" hidden></div>
  <div class="fb-hl" id="fb-hover" hidden><span></span></div>
  <div class="fb-hl sel" id="fb-sel" hidden><span></span></div>
  <div class="fb-hl flash" id="fb-flash" hidden></div>
  <div class="fb-bar" id="fb-bar" role="status" hidden></div>
  <div class="fb-panel" id="fb-panel" role="dialog" hidden></div>
  <div class="fb-modal" id="fb-modal" hidden></div>
  <div class="fb-toast" id="fb-toast" role="status" hidden></div>`;
document.body.appendChild(root);
const q = id => root.querySelector("#" + id);
const dock = q("fb-dock"), menu = q("fb-menu"), btn = q("fb-btn"), overlay = q("fb-overlay"), scopeHl = q("fb-scope"), hoverHl = q("fb-hover"),
  selHl = q("fb-sel"), flashHl = q("fb-flash"), bar = q("fb-bar"), panel = q("fb-panel"), modal = q("fb-modal"), toastEl = q("fb-toast");
const canHover = () => matchMedia("(hover: hover)").matches;
const typeDot = t => `<i class="fb-type-dot ${t}"></i>`;
function labelBtn() { btn.setAttribute("aria-label", T("fb.btn")); btn.title = T("fb.btn"); q("fb-btn-label").textContent = T("fb.report"); }
labelBtn();

/* ---------- 1. button and menu ---------- */
let menuTimer = null;
function renderMenu() {
  labelBtn();
  const d = getDraft();
  menu.innerHTML = !cfg.token
    ? `<div class="fb-note">${T("fb.needToken")}</div><button type="button" role="menuitem" data-act="settings"><b>${T("fb.openSettings")}</b></button>`
    : `${d ? `<button type="button" role="menuitem" data-act="draft"><b>${typeDot(d.type)}${T("fb.draft")}</b><small>${esc(d.title || d.location)}</small></button>` : ""}
       <button type="button" role="menuitem" data-act="bug"><b>${typeDot("bug")}${T("fb.bug")}</b><small>${T("fb.bugHint")}</small></button>
       <button type="button" role="menuitem" data-act="update"><b>${typeDot("update")}${T("fb.update")}</b><small>${T("fb.updateHint")}</small></button>
       ${window.IDEAS ? `<button type="button" role="menuitem" data-act="idea"><b>${typeDot("idea")}${T("id.menu")}</b><small>${T("id.menuHint")}</small></button>` : ""}`;
}
function openMenu(focusFirst) {
  clearTimeout(menuTimer); renderMenu(); menu.hidden = false; dock.classList.add("is-open"); btn.setAttribute("aria-expanded", "true");
  if (focusFirst) menu.querySelector("button")?.focus();
}
function closeMenu() { clearTimeout(menuTimer); menu.hidden = true; dock.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }
dock.addEventListener("mouseenter", () => { if (canHover()) openMenu(false); else clearTimeout(menuTimer); });
dock.addEventListener("mouseleave", () => { if (canHover()) menuTimer = setTimeout(closeMenu, 300); });
btn.addEventListener("click", () => { if (menu.hidden) openMenu(false); else if (!canHover()) closeMenu(); });
btn.addEventListener("keydown", e => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); openMenu(true); } });
menu.addEventListener("click", e => {
  const act = e.target.closest("[data-act]")?.dataset.act; if (!act) return;
  closeMenu();
  if (act === "settings") renderConnect(true);
  else if (act === "draft") openForm(null);
  else if (act === "idea") IDEAS.openForm();   // ideas need no place on the page
  else startPick(act);
});
menu.addEventListener("keydown", e => {
  const items = [...menu.querySelectorAll("button")], i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items.at((i + (e.key === "ArrowDown" ? 1 : -1)) % items.length)?.focus(); }
  else if (e.key === "Escape") { e.stopPropagation(); closeMenu(); btn.focus(); }
});
document.addEventListener("pointerdown", e => { if (!menu.hidden && !dock.contains(e.target)) closeMenu(); });

/* ---------- 2. picking an interface area ---------- */
let pick = null;   // { type, scope, sel ("page" | element), target, scopePath, selPath }
const markedParent = el => el.parentElement ? el.parentElement.closest("[data-fb]") : null;
const isVisible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const own_ = el => !el.closest(".fb-ui");
function areaLabel(el) {
  if (el.dataset.fbLabel) return el.dataset.fbLabel;
  const key = "fba." + el.dataset.fb, t = T(key);
  return t === key ? el.dataset.fb : t;
}
function chain(el) { const out = []; for (let a = el; a; a = markedParent(a)) out.unshift(a); return out; }
const pathOf = el => chain(el).map(a => a.dataset.fb).join("/");
const locationOf = el => chain(el).map(areaLabel).join(" › ");
function children(el) { return [...el.querySelectorAll("[data-fb]")].filter(c => markedParent(c) === el && isVisible(c)); }
function topLevel() { return [...document.querySelectorAll("[data-fb]")].filter(c => own_(c) && !markedParent(c) && isVisible(c)); }
function resolve(path) {
  let scope = null, el = null;
  for (const seg of path.split("/")) {
    el = [...document.querySelectorAll(`[data-fb="${CSS.escape(seg)}"]`)].find(x => own_(x) && markedParent(x) === scope);
    if (!el) return null;
    scope = el;
  }
  return el;
}
function under(x, y) { return document.elementsFromPoint(x, y).filter(own_); }
function selectorOf(el) {
  const parts = [];
  for (let a = el, i = 0; a && a !== document.body && i < 4; a = a.parentElement, i++) {
    if (a.id) { parts.unshift("#" + CSS.escape(a.id)); break; }
    const cls = [...a.classList].filter(c => !c.startsWith("fb-")).slice(0, 2).map(c => "." + CSS.escape(c)).join("");
    parts.unshift(a.tagName.toLowerCase() + cls);
  }
  return parts.join(" > ").slice(0, 200);
}
function place(hl, el, text) {
  if (!el || !el.isConnected) { hl.hidden = true; return; }
  const r = el.getBoundingClientRect();
  Object.assign(hl.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  const span = hl.querySelector("span"); if (span) span.textContent = text ?? areaLabel(el);
  hl.hidden = false;
}
function startPick(type) {
  closeMenu();
  pick = { type, scope: null, sel: null, target: null, scopePath: "", selPath: "" };
  dock.hidden = true; overlay.hidden = false; panel.hidden = true;
  [hoverHl, selHl, scopeHl].forEach(h => h.hidden = true);
  renderBar();
  document.addEventListener("keydown", pickKeys, true);
}
function endPick() {
  pick = null; overlay.hidden = true; bar.hidden = true; panel.hidden = true; dock.hidden = false;
  [hoverHl, selHl, scopeHl].forEach(h => h.hidden = true);
  document.removeEventListener("keydown", pickKeys, true);
}
function renderBar() {
  const scopeName = pick.scope ? areaLabel(pick.scope) : "";
  bar.innerHTML = `<span><b>${pick.type === "bug" ? T("fb.pickBug") : T("fb.pickUpdate")}</b>${scopeName ? ` · ${esc(T("fb.inside", scopeName))}` : ""}</span>
    ${pick.scope ? `<button class="btn" type="button" data-act="bar-up">${T("fb.levelUp")}</button>` : ""}
    <button class="btn" type="button" data-act="page">${T("fb.wholePage")}</button>
    <button class="btn ghost" type="button" data-act="cancel">${T("fb.cancel")}</button>`;
  bar.hidden = false;
  place(scopeHl, pick.scope, "");
}
function setLevel(scope, sel, target) {
  pick.scope = scope; pick.sel = sel; pick.target = target || null;
  pick.scopePath = scope ? pathOf(scope) : ""; pick.selPath = sel && sel !== "page" ? pathOf(sel) : sel || "";
  hoverHl.hidden = true; renderBar(); showSel();
}
function showSel() {
  if (!pick.sel) { selHl.hidden = true; panel.hidden = true; return; }
  if (pick.sel === "page") selHl.hidden = true; else place(selHl, pick.sel, locationOf(pick.sel));
  renderPanel();
}
function renderPanel() {
  const sel = pick.sel, page = sel === "page", ch = page ? [] : chain(sel);
  const crumbs = page ? `<button type="button" aria-current="true">${T("fb.wholePage")}</button>`
    : ch.map((a, i) => `${i ? "<i>›</i>" : ""}<button type="button" data-crumb="${i}" aria-current="${a === sel}">${esc(areaLabel(a))}</button>`).join("");
  panel.innerHTML = `<div class="fb-crumbs">${crumbs}</div>
    <div class="fb-actions">
      <button class="btn primary" type="button" data-act="confirm">${T("fb.confirm")}</button>
      ${!page && children(sel).length ? `<button class="btn" type="button" data-act="inside">${T("fb.goInside")}</button>` : ""}
      ${!page && markedParent(sel) ? `<button class="btn" type="button" data-act="up">${T("fb.up")}</button>` : ""}
      <button class="btn ghost" type="button" data-act="cancel">${T("fb.cancel")}</button>
    </div>
    ${canHover() ? `<p class="fb-keys">${T("fb.keys")}</p>` : ""}`;
  panel.hidden = false;
  positionPanel();
}
function positionPanel() {
  if (panel.hidden || !pick) return;
  if (matchMedia("(max-width: 720px)").matches) { panel.style.left = ""; panel.style.top = ""; return; }
  const w = panel.offsetWidth, h = panel.offsetHeight;
  const r = pick.sel === "page" || !pick.sel.isConnected ? { left: (innerWidth - w) / 2, bottom: innerHeight / 2 - h / 2, top: innerHeight / 2 } : pick.sel.getBoundingClientRect();
  let top = r.bottom + 14;
  if (top + h > innerHeight - 12) top = r.top - h - 14;
  if (top < 64) top = Math.min(innerHeight - h - 12, 64);
  panel.style.top = top + "px";
  panel.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + "px";
}
function confirmPick() {
  const sel = pick.sel; if (!sel) return;
  const area = sel === "page" ? { location: T("fb.wholePage"), anchor: "page", selector: "" }
    : { location: locationOf(sel), anchor: pathOf(sel), selector: selectorOf(pick.target && sel.contains(pick.target) ? pick.target : sel) };
  const type = pick.type;
  endPick();
  openForm({ type, ...area });
}
function goInside() { if (pick.sel && pick.sel !== "page" && children(pick.sel).length) setLevel(pick.sel, null); }
function goUp() {
  if (pick.sel && pick.sel !== "page") { const p = markedParent(pick.sel); if (p) setLevel(markedParent(p), p); }
  else if (pick.scope) setLevel(markedParent(pick.scope), pick.scope);
}
// the area under the pointer: the innermost marked one (the task, not the whole checklist — SASMP-B-001 of the site);
// «Выше» and the crumbs go out from there
const deepArea = el => { const a = el && el.closest("[data-fb]"); return a && own_(a) ? a : null; };
overlay.addEventListener("pointermove", e => {
  if (!pick) return;
  const a = deepArea(under(e.clientX, e.clientY)[0]);
  if (a && a !== pick.sel) place(hoverHl, a, locationOf(a)); else hoverHl.hidden = true;
});
overlay.addEventListener("pointerleave", () => { hoverHl.hidden = true; });
overlay.addEventListener("click", e => {
  if (!pick) return;
  const target = under(e.clientX, e.clientY)[0], a = deepArea(target);
  if (a) setLevel(markedParent(a), a, target);
});
[bar, panel].forEach(el => el.addEventListener("click", e => {
  const crumb = e.target.closest("[data-crumb]");
  if (crumb && pick.sel && pick.sel !== "page") { const a = chain(pick.sel)[+crumb.dataset.crumb]; setLevel(markedParent(a), a); return; }
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "cancel") endPick();
  else if (act === "page") setLevel(pick.scope, "page");
  else if (act === "confirm") confirmPick();
  else if (act === "inside") goInside();
  else if (act === "up" || act === "bar-up") goUp();
}));
function pickKeys(e) {
  if (!pick) return;
  const keys = { Escape: endPick, Enter: confirmPick, ArrowRight: goInside, ArrowLeft: goUp };
  if (keys[e.key] && !(e.key === "Enter" && e.target.closest?.(".fb-panel, .fb-bar"))) { e.preventDefault(); e.stopPropagation(); keys[e.key](); }
  else if (e.key === "Tab" && !e.target.closest?.(".fb-panel, .fb-bar")) {
    e.preventDefault(); e.stopPropagation();
    const list = pick.scope ? children(pick.scope) : topLevel();
    if (!list.length) return;
    const i = list.indexOf(pick.sel);
    const next = e.shiftKey ? list.at(i <= 0 ? -1 : i - 1) : list.at((i + 1) % list.length);
    next.scrollIntoView({ block: "nearest" });
    setLevel(pick.scope, next, next);
  }
}
// keep the outlines on their areas while the page scrolls, resizes or re-renders
function reposition() {
  if (pick) {
    if (pick.scope && !pick.scope.isConnected) pick.scope = pick.scopePath ? resolve(pick.scopePath) : null;
    if (pick.sel && pick.sel !== "page" && !pick.sel.isConnected) pick.sel = resolve(pick.selPath);
    place(scopeHl, pick.scope, "");
    if (pick.sel && pick.sel !== "page") place(selHl, pick.sel, locationOf(pick.sel)); else selHl.hidden = true;
    positionPanel();
  }
  if (!flashHl.hidden && flashEl) place(flashHl, flashEl);
}
let rafPending = false;
const schedule = () => { if (!rafPending) { rafPending = true; requestAnimationFrame(() => { rafPending = false; reposition(); }); } };
addEventListener("scroll", schedule, { passive: true, capture: true });
addEventListener("resize", schedule);

/* ---------- 3. the form ---------- */
const getDraft = () => store.get("fbDraft", null);
const setDraft = d => store.set("fbDraft", d);
const clearDraft = () => store.set("fbDraft", null);
function themeName() {
  return document.documentElement.getAttribute("data-skin") || (matchMedia("(prefers-color-scheme: dark)").matches ? "system-dark" : "system-light");
}
function context() {
  return { page: location.pathname + location.hash, branch: DEFAULTS.preview || "main", build: DEFAULTS.build || "dev",
    viewport: `${innerWidth}x${innerHeight}`, theme: themeName(), lang, user_agent: navigator.userAgent };
}
function openForm(area) {
  const old = getDraft();
  const d = area ? { type: area.type, location: area.location, anchor: area.anchor, selector: area.selector, page: location.pathname + location.hash,
    title: old?.title || "", description: old?.description || "", priority: old?.priority || "normal" } : old;
  if (!d) return;
  setDraft(d); renderForm(); modal.hidden = false;
  modal.querySelector("#fb-title")?.focus();
}
function closeForm() { modal.hidden = true; modal.innerHTML = ""; }
function renderForm(error) {
  const d = getDraft(), ctx = context(), bug = d.type === "bug";
  modal.innerHTML = `<form class="fb-form" role="dialog" aria-modal="true" aria-labelledby="fb-form-h" novalidate>
    <h2 id="fb-form-h">${bug ? T("fb.newBug") : T("fb.newUpdate")}</h2>
    <div class="fb-seg" role="group">
      <button type="button" data-type="bug" aria-pressed="${bug}">${typeDot("bug")}${T("fb.bug")}</button>
      <button type="button" data-type="update" aria-pressed="${!bug}">${typeDot("update")}${T("fb.update")}</button>
    </div>
    <div class="field"><span>${T("fb.where")}</span><div class="fb-where"><span>${esc(d.location)}</span><button class="btn ghost" type="button" data-act="change">${T("fb.change")}</button></div></div>
    <label class="field"><span>${T("fb.title")}</span><input type="text" id="fb-title" maxlength="100" required value="${esc(d.title)}" placeholder="${bug ? T("fb.titlePhBug") : T("fb.titlePhUpdate")}"></label>
    <span class="fb-count" id="fb-count">${d.title.length}/100</span>
    <label class="field"><span>${T("fb.desc")}</span><textarea id="fb-desc" rows="5" required placeholder="${esc(bug ? T("fb.descPhBug") : T("fb.descPhUpdate"))}">${esc(d.description)}</textarea></label>
    <label class="field"><span>${T("fb.comp")}</span><select id="fb-comp">${COMPS.map(c => `<option value="${c}" ${c === (d.component || "site") ? "selected" : ""}>${esc(T("fb.cp." + c))}</option>`).join("")}</select></label>
    <label class="field"><span>${T("fb.priority")}</span><select id="fb-pri">${["high", "normal", "low"].map(p => `<option value="${p}" ${p === d.priority ? "selected" : ""}>${esc(T("pri." + p))}</option>`).join("")}</select></label>
    <details class="fb-ctx"><summary>${T("fb.ctx")}</summary><dl>${Object.entries(ctx).map(([k, val]) => `<dt>${T("fb.c." + k)}</dt><dd>${esc(val)}</dd>`).join("")}</dl></details>
    ${error ? `<div class="fb-err">${esc(error)}</div>` : ""}
    <div class="actions">
      <div style="display:flex;gap:8px"><button class="btn primary" type="submit">${T("fb.save")}</button><button class="btn" type="button" data-act="close">${T("fb.close")}</button></div>
      <button class="btn danger" type="button" data-act="discard">${T("fb.discard")}</button>
    </div></form>`;
  const form = modal.querySelector("form");
  const upd = patch => setDraft({ ...getDraft(), ...patch });
  form.querySelector("#fb-title").oninput = e => { upd({ title: e.target.value }); modal.querySelector("#fb-count").textContent = `${e.target.value.length}/100`; };
  form.querySelector("#fb-desc").oninput = e => upd({ description: e.target.value });
  form.querySelector("#fb-pri").onchange = e => upd({ priority: e.target.value });
  form.querySelector("#fb-comp").onchange = e => upd({ component: e.target.value });
  form.querySelectorAll("[data-type]").forEach(b => b.onclick = () => { upd({ type: b.dataset.type }); renderForm(); });
  form.querySelector('[data-act="change"]').onclick = () => { const t = getDraft().type; closeForm(); startPick(t); };
  form.querySelector('[data-act="close"]').onclick = closeForm;
  form.querySelector('[data-act="discard"]').onclick = () => { clearDraft(); closeForm(); };
  // sandboxed frames may never fire submit, so the button drives it too (as in the host page)
  const submit = e => { e.preventDefault(); submitForm(); };
  form.addEventListener("submit", submit);
  form.querySelector('[type="submit"]').addEventListener("click", submit);
}
function submitForm() {
  const d = getDraft();
  if (!d.title.trim() || !d.description.trim()) return renderForm(T("fb.required"));
  if (!own || !cfg.token) return renderForm(T("fb.notLoaded"));
  const now = nowMsk(), ctx = context();
  const item = { id: nextId(own, d.type), project: PROJECT, type: d.type, component: d.component || "site", status: "new", priority: d.priority || "normal",
    title: d.title.trim().slice(0, 100), description: d.description.trim(), location: d.location, anchor: d.anchor, selector: d.selector,
    page: d.page || ctx.page, branch: ctx.branch, build: ctx.build, viewport: ctx.viewport, theme: ctx.theme, lang: ctx.lang,
    user_agent: ctx.user_agent, reporter: "kaa", created: now, updated: now };
  closeForm();
  edit({ type: "add", item }, true);
}
modal.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); closeForm(); btn.focus(); } });
modal.addEventListener("pointerdown", e => { if (e.target === modal) closeForm(); });

/* ---------- toast ---------- */
let toastTimer = null;
function toast(html, ms) {
  clearTimeout(toastTimer); toastEl.innerHTML = html; toastEl.hidden = false;
  if (ms) toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}
function savedToast(id) {
  toast(`<span>${T("fb.saved", `<span class="mono">${esc(id)}</span>`)}</span>
    <button type="button" data-act="copy" data-id="${esc(id)}">${T("fb.copy")}</button>
    <button type="button" data-act="open" data-id="${esc(id)}">${T("fb.open")}</button>`, 9000);
}
function showError() { toast(`<span>${esc(saveErr)}</span><button type="button" data-act="retry">${T("fb.retry")}</button>`); }
toastEl.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "retry") { saveErr = null; toastEl.hidden = true; save(); }
  else if (b.dataset.act === "copy") copyId(b.dataset.id);
  else if (b.dataset.act === "open") { toastEl.hidden = true; openItem(b.dataset.id); }
});
function copyId(id) {
  try { navigator.clipboard.writeText(id).then(() => toast(`<span>${T("fb.copied")}: <span class="mono">${esc(id)}</span></span>`, 1800), () => {}); } catch {}
}
function openItem(id) {
  openId = id; ui.tab = "feedback"; render();
  requestAnimationFrame(() => document.querySelector(`[data-fb-row="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" }));
}

/* ---------- 4. the feedback view ---------- */
const allItems = () => [...others, ...(own || [])];
const isOwn = it => it.project === PROJECT;
function openCount() { labelBtn(); return allItems().filter(i => !CLOSED.has(i.status)).length; }
function filtered() {
  const s = v.q.trim().toLowerCase();
  const list = allItems().filter(i => (!v.project || i.project === v.project) && (!v.type || i.type === v.type) && (!v.priority || i.priority === v.priority)
    && (!v.component || i.component === v.component || (i.component === "both" && v.component !== "both"))
    && (v.status === "all" || (v.status === "open" ? !CLOSED.has(i.status) : i.status === v.status))
    && (!s || [i.id, i.title, i.description, i.location].join(" ").toLowerCase().includes(s)));
  const key = v.sort, dir = v.dir === "asc" ? 1 : -1;
  const rank = { status: x => STATUSES.indexOf(x.status), priority: x => ["high", "normal", "low"].indexOf(x.priority) };
  return list.sort((a, b) => {
    const x = rank[key] ? rank[key](a) - rank[key](b) : asText(a[key]).localeCompare(asText(b[key]), undefined, { numeric: true });
    return (x || asText(a.id).localeCompare(asText(b.id), undefined, { numeric: true })) * dir;
  });
}
const fmtWhen = s => s ? `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}`.trim() : "";
const pill = (cls, text) => `<span class="fb-pill ${cls}">${text}</span>`;
function renderView() {
  if (own === null && !loadErr) return `<div class="note" style="margin-top:14px">${T("loading")}</div>`;
  const projects = [...new Set([PROJECT, ...others.map(i => i.project)])].sort();
  const opt = (val, label, cur) => `<option value="${esc(val)}" ${val === cur ? "selected" : ""}>${esc(label)}</option>`;
  const list = filtered();
  const th = (key, label) => `<th><button type="button" data-sort="${key}">${label}${v.sort === key ? (v.dir === "asc" ? " ↑" : " ↓") : ""}</button></th>`;
  const rows = list.map(it => {
    const open = openId === it.id;
    return `<tr class="fb-row" data-fb-row="${esc(it.id)}" aria-expanded="${open}"${fbA("item-" + it.id, it.id)}>
      <td class="mono fb-c-id">${esc(it.id)}</td>
      <td class="fb-c-type">${pill("", typeDot(it.type) + T("fb.t." + it.type))}</td>
      <td class="fb-c-comp" title="${esc(it.component ? T("fb.cp." + it.component) : "")}">${compIcon(it.component) || '<span class="muted">—</span>'}</td>
      <td class="fb-c-status">${pill("st-" + esc(it.status), esc(T("fb.st." + it.status)))}</td>
      <td class="fb-c-pri">${pill("pri-" + esc(it.priority), esc(T("pri." + it.priority)))}</td>
      <td class="mono fb-c-proj">${esc(it.project)}</td>
      <td class="fb-title fb-c-title">${esc(it.title)}</td>
      <td class="fb-loc fb-c-loc">${esc(it.location)}</td>
      <td class="muted fb-c-created" style="white-space:nowrap">${esc(fmtWhen(it.created))}</td></tr>
      ${open ? `<tr class="fb-detail-row"><td colspan="9">${renderDetail(it)}</td></tr>` : ""}`;
  }).join("");
  return `<div class="fb-view">
    ${loadErr ? `<div class="error">${esc(loadErr)}</div>` : ""}
    ${!othersLoaded ? `<div class="note">${T("fb.v.syncPending", PROJECT)}</div>` : ""}
    <div class="fb-filters"${fbA("fb-filters")}>
      <input type="search" id="fbv-q" placeholder="${T("fb.v.search")}" aria-label="${T("fb.v.search")}" value="${esc(v.q)}">
      <select id="fbv-project" aria-label="${T("fb.v.project")}">${opt("", T("fb.v.allProjects"), v.project)}${projects.map(p => opt(p, p, v.project)).join("")}</select>
      <select id="fbv-type" aria-label="${T("fb.v.type")}">${opt("", T("fb.v.anyType"), v.type)}${ENUMS.type.map(t => opt(t, T("fb.t." + t), v.type)).join("")}</select>
      <select id="fbv-component" aria-label="${T("fb.comp")}">${opt("", T("fb.v.anyComp"), v.component)}${COMPS.map(c => opt(c, T("fb.cp." + c), v.component)).join("")}</select>
      <select id="fbv-status" aria-label="${T("fb.v.status")}">${opt("open", T("fb.v.open"), v.status)}${opt("all", T("fb.v.all"), v.status)}${STATUSES.map(s => opt(s, T("fb.st." + s), v.status)).join("")}</select>
      <select id="fbv-priority" aria-label="${T("fb.v.priority")}">${opt("", T("fb.v.anyPriority"), v.priority)}${ENUMS.priority.map(p => opt(p, T("pri." + p), v.priority)).join("")}</select>
      <span class="fb-spacer"></span>
      <span class="fb-csv"><button class="btn" type="button" id="fbv-csv-filtered">${T("fb.v.csvFiltered")}</button>
      <button class="btn" type="button" id="fbv-csv-all">${T("fb.v.csvAll")}</button></span>
    </div>
    ${!allItems().length ? `<div class="note">${T("fb.v.none")}</div>`
      : !list.length ? `<div class="note">${T("fb.v.empty")}</div>`
      : `<div class="table-wrap"${fbA("fb-table")}><table class="fb-table"><thead><tr>${th("id", T("fb.v.id"))}${th("type", T("fb.v.type"))}${th("component", T("fb.comp"))}${th("status", T("fb.v.status"))}${th("priority", T("fb.v.priority"))}${th("project", T("fb.v.project"))}${th("title", T("fb.v.title"))}${th("location", T("fb.v.location"))}${th("created", T("fb.v.created"))}</tr></thead><tbody>${rows}</tbody></table></div>`}
  </div>`;
}
function renderDetail(it) {
  const shown = ["component", "location", "anchor", "selector", "page", "branch", "build", "viewport", "theme", "lang", "user_agent", "reporter", "created", "updated", "closed", "resolution", "work_branch", "pr", "task"];
  const link = (f, val) => f === "pr" && /^https?:\/\//.test(val) ? `<a href="${esc(val)}" target="_blank" rel="noopener">${esc(val)}</a>` : f === "component" ? esc(T("fb.cp." + val)) : esc(val);
  const editable = isOwn(it);
  const input = (f) => `<label class="field"><span>${T("fb.f." + f)}</span><input type="text" name="${f}" value="${esc(it[f] || "")}"></label>`;
  const opt2 = (val, label, cur) => `<option value="${esc(val)}" ${val === cur ? "selected" : ""}>${esc(label)}</option>`;
  return `<div class="fb-detail">
    <p class="desc">${esc(it.description)}</p>
    ${it.screenshot ? `<figure class="fb-shot"><a href="https://github.com/${esc(cfg.owner)}/${esc(cfg.repo)}/blob/${esc(cfg.branch)}/${esc(it.screenshot)}" target="_blank" rel="noopener"><img data-fb-shot="${esc(it.screenshot)}" alt="${esc(T("fb.f.screenshot"))}"></a></figure>` : ""}
    <div class="actions" style="justify-content:flex-start">
      ${editable && it.anchor && it.anchor !== "page" ? `<button class="btn" type="button" data-fb-show="${esc(it.anchor)}">${T("fb.v.showOnPage")}</button>` : ""}
      <button class="btn ghost" type="button" data-fb-copy="${esc(it.id)}">${T("fb.copy")}</button>
    </div>
    ${editable ? `<form class="editor" data-fb-edit="${esc(it.id)}" style="grid-column:auto;margin:0">
      <div class="grid2">
        <label class="field"><span>${T("fb.v.status")}</span><select name="status">${STATUSES.map(s => `<option value="${s}" ${s === it.status ? "selected" : ""}>${esc(T("fb.st." + s))}</option>`).join("")}</select></label>
        <label class="field"><span>${T("fb.comp")}</span><select name="component">${opt2("", T("fb.cp.none"), it.component || "")}${COMPS.map(c => opt2(c, T("fb.cp." + c), it.component || "")).join("")}</select></label>
        <label class="field"><span>${T("fb.v.priority")}</span><select name="priority">${ENUMS.priority.map(p => `<option value="${p}" ${p === it.priority ? "selected" : ""}>${esc(T("pri." + p))}</option>`).join("")}</select></label>
        ${input("work_branch")}${input("pr")}${input("task")}
      </div>
      ${input("resolution")}
      <div class="actions"><div style="display:flex;gap:8px"><button class="btn primary" type="submit">${T("save")}</button><button class="btn" type="button" data-fb-close>${T("cancel")}</button></div></div>
    </form>` : `<div class="note">${T("fb.v.readOnly", esc(it.project))}</div>`}
    <dl>${shown.filter(f => asText(it[f])).map(f => `<dt>${T("fb.f." + f)}</dt><dd${f === "anchor" || f === "selector" || f === "build" ? ' class="mono"' : ""}>${link(f, it[f])}</dd>`).join("")}</dl>
  </div>`;
}
const shots = new Map();
function bindView(rootEl) {
  const keep = () => store.set("fbView", v);
  const q = rootEl.querySelector("#fbv-q");
  if (q) q.oninput = e => { v.q = e.target.value; keep(); const pos = e.target.selectionStart; render(); const n = $("fbv-q"); n.focus(); n.setSelectionRange(pos, pos); };
  ["project", "type", "component", "status", "priority"].forEach(k => { const el = rootEl.querySelector("#fbv-" + k); if (el) el.onchange = e => { v[k] = e.target.value; keep(); render(); }; });
  rootEl.querySelectorAll("[data-sort]").forEach(b => b.onclick = () => {
    const k = b.dataset.sort; if (v.sort === k) v.dir = v.dir === "asc" ? "desc" : "asc"; else { v.sort = k; v.dir = k === "created" ? "desc" : "asc"; }
    keep(); render();
  });
  rootEl.querySelectorAll("[data-fb-row]").forEach(tr => tr.onclick = () => { openId = openId === tr.dataset.fbRow ? null : tr.dataset.fbRow; render(); });
  rootEl.querySelectorAll("[data-fb-close]").forEach(b => b.onclick = () => { openId = null; render(); });
  rootEl.querySelectorAll("[data-fb-copy]").forEach(b => b.onclick = () => copyId(b.dataset.fbCopy));
  // screenshots live in the private repository: loaded through the API with the token, kept for the session
  rootEl.querySelectorAll("img[data-fb-shot]").forEach(img => {
    const p = img.dataset.fbShot;
    if (shots.has(p)) { img.src = shots.get(p); return; }
    gh(`${repoPath()}/contents/${p.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(cfg.branch)}`)
      .then(f => { const url = `data:${/\.png$/i.test(p) ? "image/png" : "image/jpeg"};base64,${String(f.content || "").replace(/\s/g, "")}`; shots.set(p, url); img.src = url; })
      .catch(() => { img.replaceWith(Object.assign(document.createElement("span"), { className: "muted", textContent: T("fb.shotErr") })); });
  });
  rootEl.querySelectorAll("[data-fb-show]").forEach(b => b.onclick = () => showOnPage(b.dataset.fbShow));
  rootEl.querySelectorAll("[data-fb-edit]").forEach(f => {
    const run = e => {
      e.preventDefault();
      const it = own.find(x => x.id === f.dataset.fbEdit); if (!it) return;
      const fd = new FormData(f), fields = {};
      ["status", "priority", "component", "work_branch", "pr", "task", "resolution"].forEach(k => { const val = asText(fd.get(k)).trim(); if (val !== asText(it[k])) fields[k] = val; });
      if (!Object.keys(fields).length) { openId = null; render(); return; }
      if (fields.status) fields.closed = CLOSED.has(fields.status) ? (CLOSED.has(it.status) && it.closed ? it.closed : nowMsk().slice(0, 10)) : "";
      fields.updated = nowMsk();
      openId = null;
      edit({ type: "update", id: it.id, fields });
    };
    f.addEventListener("submit", run);
    f.querySelector('[type="submit"]').addEventListener("click", run);
  });
  const csvAll = rootEl.querySelector("#fbv-csv-all"), csvF = rootEl.querySelector("#fbv-csv-filtered");
  if (csvAll) csvAll.onclick = () => download([...allItems()].sort((a, b) => (a.project + a.id).localeCompare(b.project + b.id, undefined, { numeric: true })), "");
  if (csvF) csvF.onclick = () => download(filtered(), v.project);
}

/* ---------- show an item's place on the page ---------- */
let flashEl = null, flashTimer = null;
function showOnPage(anchor) {
  const tab = anchor.split("/").find(seg => TABS.some(t => t.key === seg));
  if (tab === "checklist") jumpToChecklist((anchor.match(/task-([A-Z]+-\d+)/) || [])[1] || null);
  else if (tab) ui.tab = tab;
  openId = null; render();
  requestAnimationFrame(() => {
    const el = resolve(anchor);
    if (!el) { toast(`<span>${T("fb.v.notFound")}</span>`, 3000); return; }
    el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    flashEl = el; place(flashHl, el); clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashHl.hidden = true; flashEl = null; }, 2800);
  });
}

/* ---------- CSV (kaa-infra/feedback/README.md → CSV export) ---------- */
function csv(items) {
  const cell = val => { const s = asText(val); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [FIELDS.join(","), ...items.map(it => FIELDS.map(f => cell(it[f])).join(","))].join("\r\n") + "\r\n";
}
function download(items, project) {
  const day = nowMsk().slice(0, 10);
  const url = URL.createObjectURL(new Blob([csv(items)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = project ? `kaa-feedback-${project}-${day}.csv` : `kaa-feedback-${day}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* used by the intake agent (agent.js): open items as context, and adding an item Kaa accepted from a proposal */
function openItems() { return (own || []).filter(i => !CLOSED.has(i.status)).map(i => ({ id: i.id, type: i.type, status: i.status, title: i.title })); }
function addItem({ type, title, description, priority, component }) {
  if (!own) throw new Error("feedback log not loaded");
  const now = nowMsk(), ctx = context();
  const item = { id: nextId(own, type), project: PROJECT, type, component: component || RoadmapCore.componentOf(`${title} ${description}`, "site"), status: "new", priority: priority || "normal",
    title: asText(title).trim().slice(0, 100), description: asText(description).trim() || asText(title).trim(),
    location: T("fb.wholePage"), anchor: "page", selector: "", page: ctx.page, branch: ctx.branch, build: ctx.build,
    viewport: ctx.viewport, theme: ctx.theme, lang: ctx.lang, user_agent: ctx.user_agent, reporter: "kaa", created: now, updated: now };
  edit({ type: "add", item }, true);
  return item;   // its id may still change if the file changed meanwhile; the save toast shows the final one
}
window.FB = { load, openCount, renderView, bindView, busy: () => pending.length > 0 || saving, csv, openItems, addItem, _state: () => ({ own, others, pending }) };
})();
