/* AI-generated (Claude) · 2026-10-21 · not reviewed by a human
 *
 * «🔄 Пересобрать» of the review-first banner: Kaa sets how many files and branches, filters and her own priorities
 * in words; the page gathers the candidates (files of the open PRs and AI-made files on main of REVIEW_REPOS, the PRs)
 * with her GitHub token, the agent's model (its keys in this browser) fills the places she didn't set and judges hers;
 * she saves her variant or the model's into roadmap/review-focus__ai.yaml — the banner and the Штаб bot show it.
 * Logic: roadmap/core/focus.js (shared with the bot). Spec: roadmap/designs/review-focus__ai.md.
 * Relies on the host page's globals (cfg, lang, I18N, T, $, esc, gh, repoPath, b64decode, b64encode, splitHeader, today,
 * reviewFocus, loadFocus) and window.AGENT (askWith, errorText, hasKey, open). Exposes window.FOCUSUI = { open }.
 */
(() => {
"use strict";
const C = window.RoadmapCore;
// the repositories of the review feed (the bot's REVIEW_REPOS)
const REVIEW_REPOS = ["devkat888732/kaa_sas_knwbase", "devkat888732/kaa-infra", "devkat888732/kaa-hq-bot"];

Object.assign(I18N.en, {
  "fr.btn": "🔄 Rebuild", "fr.title": "Rebuild «review first»", "fr.files": "Files", "fr.branches": "Branches", "fr.repos": "Repositories", "fr.types": "File types",
  "fr.t.doc": "docs", "fr.t.code": "code", "fr.t.data": "data", "fr.t.config": "settings", "fr.ai": "only AI-made files", "fr.path": "Path contains (optional)",
  "fr.pins": "My priorities (optional)", "fr.pinsPh": "In words: «DEPLOY first, the tasks file third, branch roadmap-core for sure». The model fills the rest and judges yours.",
  "fr.go": "🧠 Build", "fr.cancel": "Close", "fr.gather": n => `Gathering candidates from ${n} repositories…`, "fr.asking": (n, t, l, s) => `Model ${n} of ${t}: ${l} · ${s} s`,
  "fr.none": "Nothing matches these filters.", "fr.noKey": "No model key in the agent's settings — the order is by signals; your priorities aren't applied.",
  "fr.failed": e => `The model didn't answer (${e}) — the order is by signals; your priorities aren't applied.`,
  "fr.proposal": "Proposal", "fr.mine": "Your variant (📌 — your places)", "fr.yours": "Your priorities", "fr.agree": "agree", "fr.place": n => n ? `place ${n}` : "in the list",
  "fr.move": (a, b) => `you: ${a}, I suggest ${b ? "place " + b : "another"}`, "fr.saveModel": "✓ Save the proposal", "fr.saveMine": "✓ Save mine", "fr.save": "✓ Save",
  "fr.back": "‹ Settings", "fr.saved": "Saved — the banner shows the new list.", "fr.saveErr": "Not saved: ", "fr.errors": "Not read: "
});
Object.assign(I18N.ru, {
  "fr.btn": "🔄 Пересобрать", "fr.title": "Пересобрать «в первую очередь»", "fr.files": "Файлов", "fr.branches": "Веток", "fr.repos": "Репозитории", "fr.types": "Типы файлов",
  "fr.t.doc": "документы", "fr.t.code": "код", "fr.t.data": "данные", "fr.t.config": "настройки", "fr.ai": "только написанные ИИ", "fr.path": "Путь содержит (необязательно)",
  "fr.pins": "Мои приоритеты (необязательно)", "fr.pinsPh": "Словами: «DEPLOY первым, файл задач третьим, ветку roadmap-core обязательно». Остальное заполнит модель и оценит твои.",
  "fr.go": "🧠 Собрать", "fr.cancel": "Закрыть", "fr.gather": n => `Собираю кандидатов из ${n} репозиториев…`, "fr.asking": (n, t, l, s) => `Модель ${n} из ${t}: ${l} · ${s} с`,
  "fr.none": "Под эти фильтры ничего нет.", "fr.noKey": "В настройках агента нет ключа модели — порядок по сигналам, твои приоритеты не учтены.",
  "fr.failed": e => `Модель не ответила (${e}) — порядок по сигналам, твои приоритеты не учтены.`,
  "fr.proposal": "Предложение", "fr.mine": "Твой вариант (📌 — твои места)", "fr.yours": "Твои приоритеты", "fr.agree": "согласна", "fr.place": n => n ? `${n}-е место` : "в списке",
  "fr.move": (a, b) => `ты: ${a}, предлагаю ${b ? b + "-е" : "другое"}`, "fr.saveModel": "✓ Сохранить предложение", "fr.saveMine": "✓ Сохранить мой", "fr.save": "✓ Сохранить",
  "fr.back": "‹ Настройки", "fr.saved": "Сохранила — плашка показывает новый список.", "fr.saveErr": "Не сохранилось: ", "fr.errors": "Не прочиталось: "
});

const root = document.createElement("div");
root.className = "fb-ui";
root.innerHTML = `<div class="fb-modal" id="fr-modal" hidden></div>`;
document.body.appendChild(root);
const modal = root.querySelector("#fr-modal");
modal.addEventListener("pointerdown", e => { if (e.target === modal && phase !== "busy") close(); });
modal.addEventListener("keydown", e => { if (e.key === "Escape" && phase !== "busy") close(); });

let st = null, phase = "form", progress = "", result = null, message = "";
const short = r => String(r).split("/").pop();

function open() {
  const cur = typeof reviewFocus !== "undefined" ? reviewFocus : null, s = (cur && cur.settings) || {};
  st = { ...C.focusDefaults(), ...s, pins: String(s.priorities || "") };
  delete st.priorities;
  phase = "form"; result = null; message = "";
  modal.hidden = false; render();
  modal.querySelector("input,textarea,button")?.focus();
}
function close() { modal.hidden = true; modal.innerHTML = ""; }

function render() {
  const box = inner => `<div class="fb-form fr-form" role="dialog" aria-modal="true" aria-labelledby="fr-h"><h2 id="fr-h">${T("fr.title")}</h2>${inner}</div>`;
  if (phase === "busy") { modal.innerHTML = box(`<p class="fr-progress" role="status">${esc(progress)}</p>`); return; }
  if (phase === "result") { modal.innerHTML = box(renderResult()); bindResult(); return; }
  const chk = (name, value, on, label) => `<label class="fr-chk"><input type="checkbox" name="${name}" value="${esc(value)}" ${on ? "checked" : ""}> ${esc(label)}</label>`;
  const on = (list, v) => !list.length || list.includes(v);
  modal.innerHTML = box(`<form id="fr-f" novalidate>
    ${message ? `<div class="note">${esc(message)}</div>` : ""}
    <div class="grid2">
      <label class="field"><span>${T("fr.files")}</span><input type="number" name="files" min="0" max="10" value="${st.files}"></label>
      <label class="field"><span>${T("fr.branches")}</span><input type="number" name="branches" min="0" max="6" value="${st.branches}"></label>
    </div>
    <fieldset class="field fr-set"><legend>${T("fr.repos")}</legend>${REVIEW_REPOS.map(r => chk("repos", short(r), on(st.repos, short(r)), short(r))).join("")}</fieldset>
    <fieldset class="field fr-set"><legend>${T("fr.types")}</legend>${C.FOCUS_TYPES.map(t => chk("types", t, on(st.types, t), T("fr.t." + t))).join("")}
      ${chk("ai_only", "1", st.ai_only, T("fr.ai"))}</fieldset>
    <label class="field"><span>${T("fr.path")}</span><input type="text" name="path" value="${esc(st.path || "")}" placeholder="roadmap/"></label>
    <label class="field"><span>${T("fr.pins")}</span><textarea name="pins" rows="3" placeholder="${esc(T("fr.pinsPh"))}">${esc(st.pins || "")}</textarea></label>
    <div class="actions"><div style="display:flex;gap:8px"><button class="btn primary" type="submit">${T("fr.go")}</button><button class="btn" type="button" data-fr-close>${T("fr.cancel")}</button></div></div>
  </form>`);
  modal.querySelector("[data-fr-close]").onclick = close;
  modal.querySelector("#fr-f").onsubmit = e => { e.preventDefault(); readForm(e.target); build(); };
}
function readForm(f) {
  const fd = new FormData(f), all = (name, list) => { const v = fd.getAll(name); return v.length === list.length || !v.length ? [] : v; };
  st = { files: Math.max(0, Math.min(10, +fd.get("files") || 0)), branches: Math.max(0, Math.min(6, +fd.get("branches") || 0)),
    repos: all("repos", REVIEW_REPOS), types: all("types", C.FOCUS_TYPES), ai_only: fd.get("ai_only") === "1",
    path: String(fd.get("path") || "").trim(), pins: String(fd.get("pins") || "").trim().slice(0, 600) };
}

async function build() {
  phase = "busy"; progress = T("fr.gather", REVIEW_REPOS.length); message = ""; render();
  try {
    const cands = await C.gatherFocusCandidates(p => gh(p), REVIEW_REPOS);
    const pool = C.focusFilter(cands, st);
    if (!pool.files.length && !pool.branches.length) {
      phase = "form"; message = T("fr.none") + (cands.errors.length ? " " + T("fr.errors") + cands.errors.join("; ") : ""); render(); return;
    }
    let ans, note = "";
    if (!window.AGENT || !AGENT.hasKey()) { ans = C.focusByScore(cands, st); note = T("fr.noKey"); }
    else {
      const started = Date.now();
      try {
        ans = (await AGENT.askWith([{ role: "system", content: C.FOCUS_SYSTEM }, { role: "user", content: C.focusUserMessage(cands, st) }], {
          schema: { name: "review_focus", schema: C.focusSchema() },
          parse: content => C.parseFocusAnswer(content, cands, st),
          onAttempt: (n, total, label) => { progress = T("fr.asking", n, total, label, Math.round((Date.now() - started) / 1000)); render(); }
        })).result;
      } catch (e) {
        ans = C.focusByScore(cands, st); note = T("fr.failed", AGENT.errorText(e));
      }
    }
    result = { cands, ans, mine: C.focusUserOrder(ans, cands), note };
    phase = "result"; render();
  } catch (e) {
    phase = "form"; message = String((e && e.message) || e); render();
  }
}

function renderResult() {
  const { cands, ans, mine, note } = result;
  const by = new Map([...cands.files, ...cands.branches].map(c => [c.id, c]));
  const link = c => c.kind === "branch" ? `https://github.com/${c.repo}/pull/${c.pr}` : `https://github.com/${c.repo}/blob/${encodeURIComponent(c.branch)}/${c.path}`;
  const item = x => { const c = by.get(x.id); return `<li><a href="${esc(link(c))}" target="_blank" rel="noopener">${esc(C.focusLabel(c))}</a>${x.pinned ? " 📌" : ""}<span class="why">${esc(x.why)}</span></li>`; };
  const lists = o => `${o.files.length ? `<h3>${T("focus.files")}</h3><ol>${o.files.map(item).join("")}</ol>` : ""}${o.branches.length ? `<h3>${T("focus.branches")}</h3><ol>${o.branches.map(item).join("")}</ol>` : ""}`;
  const differs = JSON.stringify(mine) !== JSON.stringify(ans.model);
  return `<div class="fr-result">
    <p class="muted" style="margin:0">${esc(C.focusSettingsText(st))}</p>
    ${note ? `<div class="note">${esc(note)}</div>` : ""}
    ${message ? `<div class="error">${esc(message)}</div>` : ""}
    ${ans.summary ? `<p class="fr-summary">🤖 ${esc(ans.summary)}</p>` : ""}
    <section><h3 class="fr-h">${T("fr.proposal")}</h3>${lists(ans.model)}</section>
    ${ans.pins.length ? `<section><h3 class="fr-h">${T("fr.yours")}</h3><ul class="fr-pins">${ans.pins.map(p => `<li class="${p.verdict === "agree" ? "ok" : "move"}">${p.verdict === "agree" ? "✓" : "↕️"} <b>${esc(C.focusLabel(by.get(p.id)))}</b> — ${esc(p.verdict === "agree" ? T("fr.place", p.rank) + ": " + T("fr.agree") : T("fr.move", T("fr.place", p.rank), p.suggested_rank))}<span class="why">${esc(p.why)}</span></li>`).join("")}</ul></section>` : ""}
    ${ans.pins.length && differs ? `<section><h3 class="fr-h">${T("fr.mine")}</h3>${lists(mine)}</section>` : ""}
    ${ans.questions.length ? `<ul class="fr-q">${ans.questions.map(q => `<li>❓ ${esc(q)}</li>`).join("")}</ul>` : ""}
    ${result.cands.errors && result.cands.errors.length ? `<p class="muted" style="font-size:13px">${esc(T("fr.errors") + result.cands.errors.join("; "))}</p>` : ""}
    <div class="actions"><div style="display:flex;gap:8px;flex-wrap:wrap">
      ${ans.pins.length && differs ? `<button class="btn primary" type="button" data-fr-save="m">${T("fr.saveModel")}</button><button class="btn" type="button" data-fr-save="u">${T("fr.saveMine")}</button>`
        : `<button class="btn primary" type="button" data-fr-save="m">${T("fr.save")}</button>`}
      <button class="btn ghost" type="button" data-fr-back>${T("fr.back")}</button><button class="btn ghost" type="button" data-fr-close>${T("fr.cancel")}</button></div></div>
  </div>`;
}
function bindResult() {
  modal.querySelector("[data-fr-back]").onclick = () => { phase = "form"; message = ""; render(); };
  modal.querySelector("[data-fr-close]").onclick = close;
  modal.querySelectorAll("[data-fr-save]").forEach(b => b.onclick = () => save(b.dataset.frSave));
}
async function save(which) {
  const order = which === "u" ? result.mine : result.ans.model;
  const data = C.focusFromOrder(order, result.cands, st, today());
  const url = `${repoPath()}/contents/${C.FOCUS_PATH}`, ref = `?ref=${encodeURIComponent(cfg.branch)}`;
  const msg = `review-focus: ${data.files.length} files, ${data.branches.length} branches — ${which === "u" ? "Kaa's order" : "the model's order"}\n\nRebuilt on the roadmap page (🔄 Пересобрать).`;
  phase = "busy"; progress = "…"; render();
  try {
    for (let attempt = 0; ; attempt++) {
      const cur = await gh(url + ref).catch(e => { if (e.status === 404) return null; throw e; });
      const head = cur ? splitHeader(b64decode(cur.content))[0] : "";
      try {
        await gh(url, { method: "PUT", body: { message: msg, content: b64encode(C.serializeFocus(data, head || C.focusHeadDefault())), branch: cfg.branch, ...(cur ? { sha: cur.sha } : {}) } });
        break;
      } catch (e) { if (attempt || (e.status !== 409 && e.status !== 422)) throw e; }
    }
    close();
    try { store.set("focusHidden", ""); store.set("focusOpen", true); } catch {}
    await loadFocus();
    $("focus-banner")?.scrollIntoView({ block: "nearest" });
  } catch (e) {
    phase = "result"; message = T("fr.saveErr") + ((e && e.message) || e); render();
  }
}

window.FOCUSUI = { open };
})();
