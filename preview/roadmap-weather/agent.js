/* AI-generated (Claude) · 2026-10-15 · not reviewed by a human
 *
 * Intake agent of the roadmap page: Kaa writes free text, a language model turns it into proposals
 * (tasks, task changes, milestones, the goal, bugs / updates); Kaa ticks what to keep and applies it.
 * Nothing is changed without her click. Spec: roadmap/AGENT__ai.md · prompt: roadmap/agent/system-prompt__ai.md
 * (copied next to the page as agent-prompt.md by build.py).
 *
 * Model: OpenRouter (default model "openrouter/free" — the free models router), then Groq if a Groq key is set.
 * Keys live only in this browser (localStorage), like the GitHub token.
 *
 * Relies on the host page's globals: DEFAULTS, cfg, doc, ui, lang, I18N, T, $, esc, store, gh, repoPath, b64decode, b64encode,
 * splitHeader, YAML_OPTS, jsyaml, AREAS, STATUS, PRIORITIES, effStatus, edit, today, nextId, clean, fbA, renderConnect; window.FB, window.IDEAS, window.CAL.
 * Exposes window.AGENT = { open, toggle, isOpen, askWith, errorText, hasKey, botUrl }.
 */
(() => {
"use strict";

// the agent's contract (schema, context, answer, checks) lives in roadmap/core/agent.js — shared with the Штаб bot
const C = window.RoadmapCore;
const SCHEMA = C.agentSchema();
const JOURNAL_PATH = C.AGENT_JOURNAL_PATH;
const JOURNAL_HEAD = C.AGENT_JOURNAL_HEAD;
// Groq shut llama-3.3-70b-versatile down on 2026-08-16; openai/gpt-oss-120b is its replacement (console.groq.com/docs/deprecations)
// viaBot: ask the model through the Штаб bot (its keys; the page's GitHub token proves it's Kaa) — from Russia the browser
// often can't reach openrouter.ai; the keys below are then only a fallback. botUrl: the bot's Worker (the test bot until go-live).
const BOT_URL = "https://kaa-hq-bot-preview.dev-kat888.workers.dev";
const DEFAULT_SETTINGS = { viaBot: "1", botUrl: BOT_URL, orKey: "", model: "openrouter/free", fallbacks: "", groqKey: "", groqModel: "openai/gpt-oss-120b" };
const RETIRED_GROQ = ["llama-3.3-70b-versatile"];

/* ---------- texts ---------- */
Object.assign(I18N.en, {
  "fba.agent": "Agent panel", "ag.btn": "Agent", "ag.title": "Roadmap agent", "ag.lead": "Write what's on your mind — plans, done work, ideas, problems with the page. I'll propose tasks, changes, milestones, calendar events and bugs / updates; nothing changes until you apply it.",
  "ag.ph": "E.g.: for the blog we still need a domain, urgent. I've finished T-012. Yoga on Tue and Thu at 8:00.", "ag.send": "Send", "ag.thinking": "Thinking…",
  "ag.settings": "Settings", "ag.close": "Close", "ag.back": "Back", "ag.orKey": "OpenRouter key", "ag.model": "Model", "ag.fallbacks": "Fallback models (comma-separated, optional)",
  "ag.groqKey": "Groq key (optional, used if OpenRouter fails)", "ag.groqModel": "Groq model", "ag.save": "Save", "ag.keysNote": "Keys are kept only in this browser and sent only to openrouter.ai / api.groq.com.",
  "ag.errBotAuth": "The bot didn't accept the GitHub token: it must be the token of the owner of the repositories.", "ag.errBotNet": u => `The bot didn't answer (${u}). Without a VPN Cloudflare addresses may be blocked; check the address in the settings.`,
  "ag.viaBot": "Ask the model through the Штаб bot (no keys needed here)", "ag.botUrl": "Bot address", "ag.viaBotNote": "The bot checks your GitHub token (it must be yours) and uses its own model keys. The keys below are only a fallback.",
  "ag.needKey": "Add your OpenRouter key in the agent's settings first.", "ag.openSettings": "Open settings", "ag.needData": "The roadmap hasn't loaded yet.",
  "ag.apply": n => `Apply selected (${n})`, "ag.dismiss": "Dismiss all", "ag.applied": "Applied", "ag.dismissed": "Dismissed", "ag.nothing": "Nothing to propose.",
  "ag.questions": "Questions", "ag.via": m => `model: ${m}`, "ag.err401": "The key was not accepted. Check it in the agent's settings.",
  "ag.err429": "The free model limit is reached for now. Try again in a minute, or add a Groq key as a fallback.", "ag.errNet": "Couldn't reach the model service. Check the connection or VPN.",
  "ag.errFormat": "The model answered in an unexpected format. Try again or choose another model in the settings.", "ag.err": m => `The agent failed: ${m}`,
  "ag.op.add_task": "New task", "ag.op.update_task": "Change", "ag.op.add_milestone": "New milestone", "ag.op.update_milestone": "Change milestone", "ag.op.set_goal": "Goal",
  "ag.op.add_idea": "Idea", "ag.inv.noTags": "no project tag", "ag.inv.tag": c => `unknown project ${c}`, "ag.op.add_feedback.bug": "Bug", "ag.op.add_feedback.update": "Update", "ag.newMs": t => `new milestone “${t}”`,
  "ag.inv.task": id => `task ${id} doesn't exist`, "ag.inv.ms": id => `milestone ${id} doesn't exist`, "ag.inv.field": (f, v) => `${f}: "${v}" isn't allowed`,
  "ag.inv.title": "no title", "ag.inv.nothing": "nothing to change", "ag.inv.date": d => `bad date ${d}`, "ag.inv.type": "bug or update?",
  "ag.op.add_event": "Event", "ag.op.update_event": "Change event", "ag.op.skip_event": "Skip", "ag.op.remove_event": "Delete event", "ag.op.make_wallpaper": "Wallpaper", "ag.op.add_project": "New project", "ag.inv.code": c => `project code must be 2–5 capital letters: ${c}`, "ag.inv.codeTaken": c => `project ${c} exists already`, "ag.op.show_view": "Show", "ag.botOnly": "only the Штаб bot does this",
  "ag.inv.time": t => `bad time ${t}`, "ag.inv.minutes": m => `bad length ${m}`, "ag.inv.repeat": r => `unclear repeat ${r}`, "ag.inv.ends": "ends before it starts",
  "ag.inv.when": "no dates or repeat", "ag.inv.event": id => `no event ${id}`, "ag.noCal": "the calendar didn't load",
  "ag.journalErr": "Applied, but the journal entry wasn't saved.", "ag.clear": "New conversation", "ag.keyset": "key saved"
});
Object.assign(I18N.ru, {
  "fba.agent": "Панель агента", "ag.btn": "Агент", "ag.title": "Агент роадмапа", "ag.lead": "Напишите, что в голове: планы, сделанное, идеи, проблемы со страницей. Я предложу задачи, изменения, вехи, события в календарь и баги / апдейты; ничего не поменяется, пока вы не примените.",
  "ag.ph": "Например: к блогу надо ещё выбрать домен, срочно. T-012 я уже сделала. Йога по вт и чт в 8:00.", "ag.send": "Отправить", "ag.thinking": "Думаю…",
  "ag.settings": "Настройки", "ag.close": "Закрыть", "ag.back": "Назад", "ag.orKey": "Ключ OpenRouter", "ag.model": "Модель", "ag.fallbacks": "Запасные модели (через запятую, необязательно)",
  "ag.groqKey": "Ключ Groq (необязательно, если OpenRouter не ответит)", "ag.groqModel": "Модель Groq", "ag.save": "Сохранить", "ag.keysNote": "Ключи хранятся только в этом браузере и отправляются только на openrouter.ai / api.groq.com.",
  "ag.errBotAuth": "Бот не принял GitHub-токен: это должен быть токен владельца репозиториев.", "ag.errBotNet": u => `Бот не ответил (${u}). Без VPN адреса Cloudflare могут блокироваться; проверь адрес в настройках.`,
  "ag.viaBot": "Спрашивать модель через бота Штаб (ключи здесь не нужны)", "ag.botUrl": "Адрес бота", "ag.viaBotNote": "Бот проверяет твой GitHub-токен (он должен быть твоим) и использует свои ключи моделей. Ключи ниже — только запасной путь.",
  "ag.needKey": "Сначала добавьте ключ OpenRouter в настройках агента.", "ag.openSettings": "Открыть настройки", "ag.needData": "Роадмап ещё не загрузился.",
  "ag.apply": n => `Применить выбранное (${n})`, "ag.dismiss": "Отклонить всё", "ag.applied": "Применено", "ag.dismissed": "Отклонено", "ag.nothing": "Предложить нечего.",
  "ag.questions": "Вопросы", "ag.via": m => `модель: ${m}`, "ag.err401": "Ключ не принят. Проверьте его в настройках агента.",
  "ag.err429": "Лимит бесплатной модели пока исчерпан. Попробуйте через минуту или добавьте ключ Groq как запасной.", "ag.errNet": "Сервис модели недоступен. Проверьте интернет или VPN.",
  "ag.errFormat": "Модель ответила в неожиданном формате. Попробуйте ещё раз или выберите другую модель в настройках.", "ag.err": m => `Агент не справился: ${m}`,
  "ag.op.add_task": "Новая задача", "ag.op.update_task": "Изменение", "ag.op.add_milestone": "Новая веха", "ag.op.update_milestone": "Изменение вехи", "ag.op.set_goal": "Цель",
  "ag.op.add_idea": "Идея", "ag.inv.noTags": "нет тега проекта", "ag.inv.tag": c => `неизвестный проект ${c}`, "ag.op.add_feedback.bug": "Баг", "ag.op.add_feedback.update": "Апдейт", "ag.newMs": t => `новая веха «${t}»`,
  "ag.inv.task": id => `задачи ${id} нет`, "ag.inv.ms": id => `вехи ${id} нет`, "ag.inv.field": (f, v) => `${f}: значение «${v}» недопустимо`,
  "ag.inv.title": "нет названия", "ag.inv.nothing": "нечего менять", "ag.inv.date": d => `неверная дата ${d}`, "ag.inv.type": "баг или апдейт?",
  "ag.op.add_event": "Событие", "ag.op.update_event": "Изменение события", "ag.op.skip_event": "Пропуск", "ag.op.remove_event": "Удалить событие", "ag.op.make_wallpaper": "Заставка", "ag.op.add_project": "Новый проект", "ag.inv.code": c => `код проекта — 2–5 заглавных латинских букв: ${c}`, "ag.inv.codeTaken": c => `проект ${c} уже есть`, "ag.op.show_view": "Показать", "ag.botOnly": "это делает только бот «Штаб»",
  "ag.inv.time": t => `неверное время ${t}`, "ag.inv.minutes": m => `неверная длительность ${m}`, "ag.inv.repeat": r => `непонятный повтор ${r}`, "ag.inv.ends": "конец раньше начала",
  "ag.inv.when": "нет дат или повтора", "ag.inv.event": id => `нет события ${id}`, "ag.noCal": "календарь не загрузился",
  "ag.journalErr": "Применено, но запись в журнал не сохранилась.", "ag.clear": "Новый разговор", "ag.keyset": "ключ сохранён"
});

/* ---------- state ---------- */
let settings = Object.assign({}, DEFAULT_SETTINGS, store.get("agent", {}));
if (RETIRED_GROQ.includes(settings.groqModel)) settings.groqModel = DEFAULT_SETTINGS.groqModel;   // a saved retired model would only fail
let thread = [];        // { role: "user", text } | { role: "agent", data, model, picks: bool[], titles: string[], state: "open"|"applied"|"dismissed", results } | { role: "error", text }
let busy = false, view = "chat", promptText = null;

/* ---------- markup ---------- */
const root = document.createElement("aside");
root.className = "ag-ui";
root.id = "agent";
root.setAttribute("aria-label", "Agent");
root.hidden = true;
root.setAttribute("data-fb", "agent");
document.body.appendChild(root);
const isOpen = () => !root.hidden;
function open() { root.hidden = false; renderPanel(); setTimeout(() => root.querySelector("#ag-text")?.focus(), 30); }
function close() { root.hidden = true; $("agent-btn")?.focus(); }
function toggle() { isOpen() ? close() : open(); }
root.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); close(); } });

/* ---------- context sent to the model ---------- */
function context() {
  return C.agentContext(doc, {
    today: today(), weekday: new Date().toLocaleDateString("en-GB", { weekday: "long" }), lang, project: DEFAULTS.project || "SASMP",
    statusOf: effStatus,
    openFeedback: window.FB && FB.openItems ? FB.openItems() : [],
    openIdeas: window.IDEAS ? IDEAS.openIdeas() : [],
    projects: window.IDEAS ? IDEAS.projects() : [],
    events: window.CAL ? CAL.events() : []
  });
}
async function systemPrompt() {
  if (promptText) return promptText;
  const res = await fetch("agent-prompt.md", { cache: "no-store" });
  if (!res.ok) throw new Error("agent-prompt.md " + res.status);
  promptText = C.agentPromptText(await res.text());
  return promptText;
}
async function messages(text) {
  const out = [{ role: "system", content: await systemPrompt() }];
  // earlier turns of this conversation (for clarifications), the latest few only
  thread.filter(x => x.role === "user" || x.role === "agent").slice(-6).forEach(x => {
    if (x.role === "user") out.push({ role: "user", content: "MESSAGE:\n" + x.text });
    else out.push({ role: "assistant", content: JSON.stringify(x.data) });
  });
  out.push({ role: "user", content: C.agentUserMessage(context(), text) });
  return out;
}

/* ---------- calling the model ---------- */
async function post(url, key, body, extra) {
  let res;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key, ...(extra || {}) }, body: JSON.stringify(body) });
  } catch (e) { const err = new Error(T("ag.errNet")); err.kind = "net"; throw err; }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const err = new Error((json.error && (json.error.message || json.error)) || res.statusText); err.status = json.error?.code || res.status; throw err;
  }
  const choice = json.choices && json.choices[0];
  if (choice && choice.error) { const err = new Error(choice.error.message || "model error"); err.status = choice.error.code; throw err; }
  return { content: choice?.message?.content ?? "", model: json.model || body.model };
}
const parseAnswer = C.parseAgentAnswer;
async function ask(text) {
  const r = await askWith(await messages(text), { schema: { name: "roadmap_proposals", schema: SCHEMA }, parse: parseAnswer });
  return { data: r.result, model: r.model };
}
/* any answer: { schema: { name, schema } (strict, optional), parse(content) → result (throws → next model), onAttempt(n, total, label) }
 * → { result, model }. Used by the agent and by «🔄 Пересобрать» of the review-first banner. */
async function askWith(msgs, { schema, parse, onAttempt } = {}) {
  const attempts = [];
  const orHeaders = { "HTTP-Referer": location.origin + location.pathname, "X-Title": "SAS kaa Roadmap" };
  const fallbacks = settings.fallbacks.split(",").map(s => s.trim()).filter(Boolean);
  const orBody = extra => ({ ...(fallbacks.length ? { models: [settings.model, ...fallbacks] } : { model: settings.model }), messages: msgs, temperature: 0.2, ...extra });
  if (settings.viaBot && cfg.token) attempts.push(["Штаб", async () => {
    let res;
    try {
      res = await fetch(settings.botUrl.replace(/\/$/, "") + "/model", { method: "POST", headers: { "Content-Type": "application/json", "X-GitHub-Token": cfg.token },
        body: JSON.stringify({ messages: msgs, ...(schema ? { schema } : {}) }) });
    } catch { const e = new Error(T("ag.errNet")); e.kind = "net"; e.viaBot = true; throw e; }
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.error) { const e = new Error((j.error && j.error.message) || res.statusText); e.status = (j.error && j.error.code) || res.status; e.viaBot = true; throw e; }
    return { content: j.content, model: j.model ? `${j.model} · через бота` : "через бота" };
  }]);
  if (settings.orKey) {
    if (schema) attempts.push(["OpenRouter", () => post("https://openrouter.ai/api/v1/chat/completions", settings.orKey,
      orBody({ response_format: { type: "json_schema", json_schema: { name: schema.name, strict: true, schema: schema.schema } }, provider: { require_parameters: true } }), orHeaders)]);
    attempts.push(["OpenRouter", () => post("https://openrouter.ai/api/v1/chat/completions", settings.orKey, orBody({ response_format: { type: "json_object" } }), orHeaders)]);
  }
  if (settings.groqKey) attempts.push(["Groq", () => post("https://api.groq.com/openai/v1/chat/completions", settings.groqKey,
    { model: settings.groqModel, messages: msgs, temperature: 0.2, response_format: { type: "json_object" } })]);
  if (!attempts.length) { const e = new Error(T("ag.needKey")); e.status = 401; throw e; }
  let last = null;
  for (const [k, [label, attempt]] of attempts.entries()) {
    if (onAttempt) onAttempt(k + 1, attempts.length, label);
    try {
      const r = await attempt();
      try { return { result: parse ? parse(r.content) : r.content, model: r.model }; }
      catch { const e = new Error("format"); e.kind = "format"; throw e; }
    } catch (e) {
      last = e;
      if ((e.status === 401 || e.status === 403) && !e.viaBot) break;   // a wrong key won't get better on the next attempt with the same key
    }
  }
  throw last || new Error("no attempts");
}
function errorText(e) {
  if (!e) return T("ag.err", "?");
  if (e.viaBot && (e.status === 401 || e.status === 403)) return T("ag.errBotAuth");
  if (e.viaBot && e.kind === "net") return T("ag.errBotNet", settings.botUrl);
  if (e.status === 401 || e.status === 403) return T("ag.err401");
  if (e.status === 429) return T("ag.err429");
  if (e.kind === "net") return T("ag.errNet");
  if (e.kind === "format" || e instanceof SyntaxError) return T("ag.errFormat");
  return T("ag.err", e.message);
}

/* ---------- checking proposals against the roadmap (roadmap/core/agent.js) ---------- */
const tagsOf = C.agentTags;
function problems(op, ops) {
  const out = C.agentProblems(op, ops, doc, window.IDEAS ? IDEAS.projects() : [], window.CAL ? CAL.events() : []).map(e => T(e.key, ...e.args));
  if (C.AGENT_EVENT_OPS.includes(op.op) && !window.CAL) out.push(T("ag.noCal"));
  if (C.AGENT_BOT_OPS.includes(op.op)) out.push(T("ag.botOnly"));
  return out;
}

/* ---------- applying the accepted proposals ---------- */
function applyProposals(entry) {
  const ops = entry.data.operations, picked = ops.map((op, i) => ({ op: { ...op, title: entry.titles[i] ?? op.title }, i })).filter(x => entry.picks[x.i] && !entry.bad[x.i].length);
  const refMap = {}, results = [];
  const msTarget = id => id && refMap[id] ? refMap[id] : id;
  // milestones first, so tasks can point at them
  picked.filter(x => x.op.op === "add_milestone").forEach(({ op, i }) => {
    const n = Math.max(0, ...doc.milestones.map(m => parseInt(String(m.id).slice(1), 10) || 0)) + 1, id = "m" + n;
    refMap[op.ref] = id;
    edit({ type: "add-ms", ms: clean({ id, title: op.title, due: op.due || "", description: op.description || "" }) });
    results[i] = id;
  });
  // new project tags before the ideas that use them (saved with them, in the ideas file)
  picked.filter(x => x.op.op === "add_project" && window.IDEAS && IDEAS.addProject).forEach(({ op, i }) => {
    results[i] = IDEAS.addProject({ code: String(op.projects).trim().toUpperCase(), name: op.title });
  });
  picked.forEach(({ op, i }) => {
    if (op.op === "add_task") {
      const id = nextId();
      const status = op.status || "todo";
      edit({ type: "add-task", task: clean({ id, title: op.title, milestone: msTarget(op.milestone_id) || "", area: op.area, status, owner: op.owner || "kaa",
        priority: op.priority && op.priority !== "normal" ? op.priority : "", created: today(), due: op.due || "", done: status === "done" ? today() : "", notes: op.notes || "" }) });
      results[i] = id;
    } else if (op.op === "update_task") {
      const fields = {};
      ["title", "area", "status", "owner", "priority", "due", "notes"].forEach(f => { if (op[f]) fields[f] = op[f]; });
      if (op.milestone_id) fields.milestone = msTarget(op.milestone_id);
      if (fields.priority === "normal") fields.priority = "";
      if (fields.status) fields.done = fields.status === "done" ? today() : "";
      edit({ type: "task", id: op.task_id, fields });
      results[i] = op.task_id;
    } else if (op.op === "update_milestone") {
      const fields = {};
      ["title", "due", "description"].forEach(f => { if (op[f]) fields[f] = op[f]; });
      edit({ type: "ms", id: op.milestone_id, fields });
      results[i] = op.milestone_id;
    } else if (op.op === "set_goal") {
      edit({ type: "goal", goal: { title: op.title, due: op.due || "", description: op.description || "" } });
      results[i] = "goal";
    } else if (op.op === "add_idea" && window.IDEAS) {
      results[i] = IDEAS.addIdea({ title: op.title, description: op.description || "", projects: tagsOf(op) }).id;
    } else if (op.op === "add_feedback" && window.FB && FB.addItem) {
      results[i] = FB.addItem({ type: op.feedback_type, title: op.title, description: op.description || op.reason, priority: op.priority, component: op.component }).id;
    }
  });
  const calPicked = picked.filter(x => C.AGENT_EVENT_OPS.includes(x.op.op));
  if (calPicked.length && window.CAL) Object.assign(results, CAL.applyAgent(calPicked));
  entry.state = "applied"; entry.results = results;
  journal(entry, picked.map(x => `${x.op.op}${results[x.i] ? " " + results[x.i] : ""}: ${x.op.title || x.op.task_id || x.op.milestone_id || x.op.event_id || ""}`));
}

/* the journal: one entry per applied conversation turn, saved in this repository */
async function journal(entry, applied) {
  const userText = [...thread].slice(0, thread.indexOf(entry)).reverse().find(x => x.role === "user")?.text || "";
  const record = { at: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
    model: entry.model || "", text: userText, summary: entry.data.summary, proposed: entry.data.operations.length, applied };
  const url = `${repoPath()}/contents/${JOURNAL_PATH}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const cur = await gh(`${url}?ref=${encodeURIComponent(cfg.branch)}`).catch(e => { if (e.status === 404) return null; throw e; });
      const text = cur ? b64decode(cur.content) : "";
      const body = C.appendJournal(text, record);
      await gh(url, { method: "PUT", body: { message: `agent: journal (${applied.length} applied)`, content: b64encode(body), branch: cfg.branch, ...(cur ? { sha: cur.sha } : {}) } });
      return;
    } catch (e) {
      if (attempt === 1 || (e.status !== 409 && e.status !== 422)) { entry.journalError = true; renderPanel(); return; }
    }
  }
}

/* ---------- rendering ---------- */
const opLabel = op => op.op === "add_feedback" ? T("ag.op.add_feedback." + (op.feedback_type === "bug" ? "bug" : "update")) : T("ag.op." + op.op);
const msName = id => { const m = doc.milestones.find(x => x.id === id); return m ? m.title : id; };
// a new milestone proposed in the same answer is shown by its (possibly edited) title, not by its ref
const newMsName = (ref, ops, entry) => { const i = ops.findIndex(o => o.op === "add_milestone" && o.ref === ref); return T("ag.newMs", (entry && entry.titles[i]) || ops[i]?.title || ref); };
function opDetails(op, ops, entry) {
  const parts = [];
  if (C.AGENT_EVENT_OPS.includes(op.op)) return window.CAL ? esc(CAL.opText(op)) : "";
  if (op.op === "update_task") {
    const t = doc.tasks.find(x => x.id === op.task_id);
    const show = (label, from, to) => to ? parts.push(`${label}: ${esc(from || "—")} → <b>${esc(to)}</b>`) : null;
    if (t) {
      show(T("status").toLowerCase(), STATUS.find(s => s.key === effStatus(t))?.label, op.status && STATUS.find(s => s.key === op.status)?.label);
      show(T("priority").toLowerCase(), t.priority || "normal", op.priority);
      show(T("dueLabel").toLowerCase(), t.due, op.due);
      show(T("milestone").toLowerCase(), msName(t.milestone), op.milestone_id && (ops.some(o => o.ref === op.milestone_id) ? newMsName(op.milestone_id, ops, entry) : msName(op.milestone_id)));
      show(T("area").toLowerCase(), t.area, op.area);
      show(T("owner").toLowerCase(), t.owner, op.owner);
      if (op.title) parts.push(`${T("title").toLowerCase()}: <b>${esc(op.title)}</b>`);
      if (op.notes) parts.push(esc(op.notes));
    }
    return parts.join(" · ");
  }
  if (op.milestone_id) parts.push(esc(ops.some(o => o.ref === op.milestone_id) ? newMsName(op.milestone_id, ops, entry) : msName(op.milestone_id)));
  if (op.area) parts.push(esc(op.area));
  if (op.owner && op.owner !== "kaa") parts.push(esc(op.owner));
  if (op.priority && op.priority !== "normal") parts.push(`<span class="${op.priority === "high" ? "late" : ""}">${esc(T("pri." + op.priority))}</span>`);
  if (op.due) parts.push(esc(T("due", fmtDate(op.due))));
  if (op.status && op.status !== "todo") parts.push(esc(STATUS.find(s => s.key === op.status)?.label || op.status));
  if (op.op === "add_project") parts.push(`<span class="mono" style="font-weight:600">${esc(String(op.projects || "").toUpperCase())}</span>`);
  if (op.op === "add_idea") parts.push(tagsOf(op).map((c, k) => `<span class="mono"${k ? "" : ' style="font-weight:600"'}>${esc(c)}</span>`).join(" "));
  if (op.description) parts.push(esc(op.description));
  if (op.notes) parts.push(esc(op.notes));
  return parts.join(" · ");
}
function renderEntry(x, idx) {
  if (x.role === "user") return `<div class="ag-msg ag-user">${esc(x.text)}</div>`;
  if (x.role === "error") return `<div class="ag-msg ag-error">${esc(x.text)}</div>`;
  const ops = x.data.operations, n = ops.filter((_, i) => x.picks[i] && !x.bad[i].length).length, done = x.state !== "open";
  return `<div class="ag-msg ag-agent" data-entry="${idx}">
    ${x.data.summary ? `<p class="ag-summary">${esc(x.data.summary)}</p>` : ""}
    ${x.data.questions.length ? `<div class="ag-questions"><span class="label">${T("ag.questions")}</span><ul>${x.data.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul></div>` : ""}
    ${!ops.length ? `<p class="muted">${T("ag.nothing")}</p>` : `<ul class="ag-ops">${ops.map((op, i) => {
      const bad = x.bad[i], editable = ["add_task", "add_milestone", "set_goal", "add_feedback", "add_idea", "add_event"].includes(op.op);
      const ev = op.event_id && window.CAL ? CAL.events().find(e => e.id === op.event_id) : null;
      const head = op.op === "update_task" ? `<span class="mono">${esc(op.task_id || "?")}</span> ${esc(doc.tasks.find(t => t.id === op.task_id)?.title || "")}`
        : op.op === "update_milestone" ? esc(msName(op.milestone_id))
        : op.event_id ? `<span class="mono">${esc(op.event_id)}</span> ${esc(ev ? ev.title : "")}${op.op === "update_event" && op.title ? ` → <b>${esc(op.title)}</b>` : ""}` : "";
      return `<li class="ag-op ${bad.length ? "is-bad" : ""} ${done && x.picks[i] && !bad.length ? "is-applied" : ""}">
        <label class="ag-pick"><input type="checkbox" data-pick="${i}" ${x.picks[i] && !bad.length ? "checked" : ""} ${bad.length || done ? "disabled" : ""} aria-label="${esc(opLabel(op))}"></label>
        <div class="ag-op-body">
          <div class="ag-op-head"><span class="ag-kind ag-${esc(op.op)}${op.op === "add_feedback" ? " ag-" + esc(op.feedback_type) : ""}">${esc(opLabel(op))}</span>
            ${x.results && x.results[i] ? `<span class="mono ag-result">${esc(x.results[i])}</span>` : ""}</div>
          ${editable ? (done ? `<div class="ag-op-title">${esc(x.titles[i] ?? op.title ?? "")}</div>` : `<input class="ag-op-title-in" type="text" data-title="${i}" value="${esc(x.titles[i] ?? op.title ?? "")}" maxlength="100" aria-label="${T("title")}">`) : `<div class="ag-op-title">${head}</div>`}
          <div class="ag-op-meta">${opDetails(op, ops, x)}</div>
          ${op.reason ? `<div class="ag-op-reason">${esc(op.reason)}</div>` : ""}
          ${bad.length ? `<div class="ag-op-bad">${bad.map(esc).join("; ")}</div>` : ""}
        </div></li>`;
    }).join("")}</ul>
    ${done ? `<p class="ag-state">${x.state === "applied" ? T("ag.applied") : T("ag.dismissed")}${x.journalError ? ` · <span class="late">${T("ag.journalErr")}</span>` : ""}</p>`
      : `<div class="ag-actions"><button class="btn primary" type="button" data-apply="${idx}" ${n ? "" : "disabled"}>${T("ag.apply", n)}</button><button class="btn ghost" type="button" data-dismiss="${idx}">${T("ag.dismiss")}</button></div>`}`}
    ${x.model ? `<p class="ag-via mono">${esc(T("ag.via", x.model))}</p>` : ""}
  </div>`;
}
function renderPanel() {
  if (root.hidden) return;
  const head = `<div class="ag-head"><h2>${T("ag.title")}</h2><div class="ag-head-btns">
      ${view === "chat" ? `${thread.length ? `<button class="btn ghost" type="button" data-act="clear">${T("ag.clear")}</button>` : ""}<button class="btn" type="button" data-act="settings">${T("ag.settings")}</button>`
        : `<button class="btn" type="button" data-act="back">${T("ag.back")}</button>`}
      <button class="btn ghost ag-x" type="button" data-act="close" aria-label="${T("ag.close")}">✕</button></div></div>`;
  if (view === "settings") {
    root.innerHTML = head + `<form class="ag-settings" id="ag-settings">
      <label class="field ag-check"><span><input type="checkbox" name="viaBot" value="1" ${settings.viaBot ? "checked" : ""}> ${T("ag.viaBot")}</span></label>
      <label class="field"><span>${T("ag.botUrl")}</span><input type="text" name="botUrl" value="${esc(settings.botUrl)}"></label>
      <p class="muted ag-note">${T("ag.viaBotNote")}</p>
      <label class="field"><span>${T("ag.orKey")}</span><input type="password" name="orKey" value="${esc(settings.orKey)}" placeholder="sk-or-…" autocomplete="off"></label>
      <label class="field"><span>${T("ag.model")}</span><input type="text" name="model" value="${esc(settings.model)}"></label>
      <label class="field"><span>${T("ag.fallbacks")}</span><input type="text" name="fallbacks" value="${esc(settings.fallbacks)}" placeholder="meta-llama/llama-3.3-70b-instruct:free"></label>
      <label class="field"><span>${T("ag.groqKey")}</span><input type="password" name="groqKey" value="${esc(settings.groqKey)}" placeholder="gsk_…" autocomplete="off"></label>
      <label class="field"><span>${T("ag.groqModel")}</span><input type="text" name="groqModel" value="${esc(settings.groqModel)}"></label>
      <p class="muted ag-note">${T("ag.keysNote")}</p>
      <div class="actions"><button class="btn primary" type="submit">${T("ag.save")}</button></div></form>`;
    const f = root.querySelector("#ag-settings");
    const saveSettings = e => { e.preventDefault(); const fd = new FormData(f); Object.keys(DEFAULT_SETTINGS).forEach(k => settings[k] = k === "viaBot" ? (fd.get("viaBot") ? "1" : "") : String(fd.get(k) || "").trim() || DEFAULT_SETTINGS[k]); store.set("agent", settings); view = "chat"; renderPanel(); };
    f.addEventListener("submit", saveSettings); f.querySelector('[type="submit"]').addEventListener("click", saveSettings);
  } else {
    const need = !hasKey();
    root.innerHTML = head + `<div class="ag-thread" id="ag-thread">
        ${!thread.length ? `<p class="ag-lead muted">${T("ag.lead")}</p>` : ""}
        ${thread.map(renderEntry).join("")}
        ${busy ? `<div class="ag-msg ag-agent ag-busy">${T("ag.thinking")}</div>` : ""}
      </div>
      ${need ? `<div class="ag-need"><span>${T("ag.needKey")}</span><button class="btn" type="button" data-act="settings">${T("ag.openSettings")}</button></div>` : ""}
      <form class="ag-compose" id="ag-compose">
        <textarea id="ag-text" rows="3" placeholder="${esc(T("ag.ph"))}" ${busy ? "disabled" : ""}>${esc(draft)}</textarea>
        <button class="btn primary" type="submit" ${busy || need ? "disabled" : ""}>${T("ag.send")}</button>
      </form>`;
    const ta = root.querySelector("#ag-text");
    ta.oninput = e => { draft = e.target.value; store.set("agentDraft", draft); };
    ta.onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } };
    const f = root.querySelector("#ag-compose");
    const run = e => { e.preventDefault(); send(); };
    f.addEventListener("submit", run); f.querySelector('[type="submit"]').addEventListener("click", run);
    const th = root.querySelector("#ag-thread"); th.scrollTop = th.scrollHeight;
  }
  root.querySelectorAll("[data-act]").forEach(b => b.onclick = () => {
    const a = b.dataset.act;
    if (a === "close") close(); else if (a === "settings") { view = "settings"; renderPanel(); } else if (a === "back") { view = "chat"; renderPanel(); }
    else if (a === "clear") { thread = []; renderPanel(); }
  });
  root.querySelectorAll("[data-pick]").forEach(cb => cb.onchange = () => { const x = entryOf(cb); x.picks[+cb.dataset.pick] = cb.checked; renderPanel(); });
  root.querySelectorAll("[data-title]").forEach(inp => inp.oninput = () => { entryOf(inp).titles[+inp.dataset.title] = inp.value; });
  root.querySelectorAll("[data-apply]").forEach(b => b.onclick = () => { const x = thread[+b.dataset.apply]; applyProposals(x); renderPanel(); });
  root.querySelectorAll("[data-dismiss]").forEach(b => b.onclick = () => { thread[+b.dataset.dismiss].state = "dismissed"; renderPanel(); });
}
const entryOf = el => thread[+el.closest("[data-entry]").dataset.entry];
let draft = store.get("agentDraft", "") || "";

async function send() {
  const text = draft.trim();
  if (!text || busy) return;
  if (!doc) { thread.push({ role: "error", text: T("ag.needData") }); renderPanel(); return; }
  thread.push({ role: "user", text });
  draft = ""; store.set("agentDraft", ""); busy = true; renderPanel();
  try {
    const { data, model } = await ask(text);
    const bad = data.operations.map(op => problems(op, data.operations));
    thread.push({ role: "agent", data, model, picks: data.operations.map((_, i) => !bad[i].length), titles: data.operations.map(op => op.title), bad, state: "open" });
  } catch (e) {
    thread.push({ role: "error", text: errorText(e) });
  } finally {
    busy = false; renderPanel();
  }
}

function hasKey() { return !!((settings.viaBot && cfg.token) || settings.orKey || settings.groqKey); }
// the bot's address (settings, else the default) — the calendar asks it for the weather too
const botUrl = () => String(settings.botUrl || BOT_URL).replace(/\/$/, "");
window.AGENT = { open, toggle, isOpen, askWith, errorText, hasKey, botUrl, _test: { parseAnswer, problems, SCHEMA, context } };
})();
