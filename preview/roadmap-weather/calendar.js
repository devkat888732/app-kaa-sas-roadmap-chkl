/* AI-generated (Claude) · 2026-10-21 · not reviewed by a human
 *
 * Calendar: events kept as rules in roadmap/calendar/events__ai.yaml (on the data branch), shown as
 *   - the «Calendar» tab (month grid; a list by days on a phone), with a form to add / change an event,
 *     «skip this time» and «delete»;
 *   - «The week» strip under the status counters: the next 7 days as a chain — events plus deadlines of open tasks
 *     and milestones (deadlines appear only here, not in the month).
 * The intake agent proposes events (add / change / skip / delete); they are applied here (applyAgent).
 * The phone subscription (.ics) is served by the Штаб bot — the link is in the bot (📅 Неделя → 📲).
 * Spec: roadmap/designs/calendar__ai.md · logic: roadmap/core/calendar.js (shared with the bot).
 * Relies on the host page's globals (DEFAULTS, cfg, ui, doc, lang, I18N, T, $, esc, store, gh, repoPath, b64decode, b64encode,
 * splitHeader, render, today, effStatus, fbA, plural); toasts use feedback.css.
 * The weather of the next 8 days (core/weather.js; the bot fetches it, POST <bot>/weather): rain / sun «точно» by hour, for Kaa's
 * place (this device's geolocation once she allows it, else the place she sent the bot) or a trip's place on its days.
 * Exposes window.CAL = { load, events, categories, busy, count, renderView, bindView, renderWeek, bindWeek, applyAgent, ruleText, opText, weather }.
 */
(() => {
"use strict";

const C = window.RoadmapCore;
const PATH = DEFAULTS.calendar || C.CALENDAR_PATH;

Object.assign(I18N.en, {
  "tab.calendar": "Calendar", "cal.week": "The week", "cal.weekEmpty": "Nothing planned for the next 7 days.", "cal.today": "Today", "cal.new": "+ Event",
  "cal.month": "Month", "cal.list": "List", "cal.prev": "Previous month", "cal.next": "Next month", "cal.more": n => `+${n}`,
  "cal.none": "No events this month. Tell the agent («yoga on Tue and Thu at 8:00») or add one here.", "cal.dayEmpty": "Nothing on this day.",
  "cal.loading": "Loading the calendar…", "cal.loadErr": "Couldn't load the calendar: ", "cal.saving": "Saving the calendar…", "cal.saved": "Calendar saved",
  "cal.allDay": "all day", "cal.skip": "Skip this time", "cal.skipped": "skipped", "cal.edit": "Edit", "cal.del": "Delete", "cal.delAsk": t => `Delete “${t}” with all its dates?`,
  "cal.f.title": "What", "cal.f.titlePh": "Yoga, a call, a birthday…", "cal.f.kind": "Repeats", "cal.f.once": "On dates", "cal.f.day": "Every day", "cal.f.week": "Every week",
  "cal.f.monthly": "Every month", "cal.f.interval": "Every N", "cal.f.days": "Days", "cal.f.dates": "Dates", "cal.f.datesPh": "2026-11-14, 2026-11-28", "cal.f.monthDay": "Day of month",
  "cal.f.time": "Time (empty = all day)", "cal.f.minutes": "Minutes", "cal.f.from": "From", "cal.f.until": "Until (optional)", "cal.f.notes": "Notes", "cal.f.save": "Save", "cal.f.cancel": "Cancel",
  "cal.f.bad": "Check the fields: ", "cal.task": "task deadline", "cal.ms": "milestone deadline",
  "cal.r.day": n => n > 1 ? `every ${n} days` : "every day", "cal.r.week": (n, d) => (n > 1 ? `every ${n} weeks` : "weekly") + (d ? ": " + d : ""),
  "cal.r.month": (n, d) => (n > 1 ? `every ${n} months` : "monthly") + ` on the ${d}th`, "cal.r.from": d => `from ${d}`, "cal.r.until": d => `until ${d}`,
  "cal.r.dates": d => d, "cal.r.except": d => `not ${d}`,
  "cal.phone": "Phone calendar: the Штаб bot → 📅 Неделя → 📲 Подписка — the events appear in your phone's calendar and update by themselves.",
  "fba.calendar": "Calendar", "fba.week": "The week", "cal.f.place": "Where (a town, for the weather)", "cal.f.category": "Category (empty — found by the name)", "cal.f.placePh": "empty = where you are",
  "wx.ask": "📍 Weather for where I am", "wx.loading": "weather…", "wx.off": "Weather: the bot doesn't answer", "wx.nohome": "Weather: tell the bot where you are (📅 Неделя → 📍) or allow the location here",
  "wx.denied": "The browser didn't give the location: weather for the place you sent the bot", "wx.note": "«Точно» — almost all forecast variants agree (≥ 80 %), «возможен» — from 30 %. Local hours.",
  "wx.src": (s, n) => `Open-Meteo: ${s}${n ? ` · ${n} variants` : ""}`
});
Object.assign(I18N.ru, {
  "tab.calendar": "Календарь", "cal.week": "Неделя", "cal.weekEmpty": "На ближайшие 7 дней ничего не запланировано.", "cal.today": "Сегодня", "cal.new": "+ Событие",
  "cal.month": "Месяц", "cal.list": "Список", "cal.prev": "Предыдущий месяц", "cal.next": "Следующий месяц", "cal.more": n => `+${n}`,
  "cal.none": "В этом месяце событий нет. Напишите агенту («йога по вт и чт в 8:00») или добавьте здесь.", "cal.dayEmpty": "В этот день ничего нет.",
  "cal.loading": "Загружаю календарь…", "cal.loadErr": "Не удалось загрузить календарь: ", "cal.saving": "Сохраняю календарь…", "cal.saved": "Календарь сохранён",
  "cal.allDay": "весь день", "cal.skip": "Пропустить этот раз", "cal.skipped": "пропуск", "cal.edit": "Изменить", "cal.del": "Удалить", "cal.delAsk": t => `Удалить «${t}» со всеми датами?`,
  "cal.f.title": "Что", "cal.f.titlePh": "Йога, созвон, день рождения…", "cal.f.kind": "Повтор", "cal.f.once": "По датам", "cal.f.day": "Каждый день", "cal.f.week": "Каждую неделю",
  "cal.f.monthly": "Каждый месяц", "cal.f.interval": "Раз в N", "cal.f.days": "Дни", "cal.f.dates": "Даты", "cal.f.datesPh": "2026-11-14, 2026-11-28", "cal.f.monthDay": "Число месяца",
  "cal.f.time": "Время (пусто — весь день)", "cal.f.minutes": "Минут", "cal.f.from": "С", "cal.f.until": "До (необязательно)", "cal.f.notes": "Заметки", "cal.f.save": "Сохранить", "cal.f.cancel": "Отмена",
  "cal.f.bad": "Проверьте поля: ", "cal.task": "срок задачи", "cal.ms": "срок вехи",
  "cal.r.day": n => n > 1 ? `раз в ${n} ${plural(n, "день", "дня", "дней")}` : "каждый день", "cal.r.week": (n, d) => (n > 1 ? `раз в ${n} ${plural(n, "неделю", "недели", "недель")}` : "каждую неделю") + (d ? ": " + d : ""),
  "cal.r.month": (n, d) => (n > 1 ? `раз в ${n} ${plural(n, "месяц", "месяца", "месяцев")}` : "каждый месяц") + `, ${d}-го`, "cal.r.from": d => `с ${d}`, "cal.r.until": d => `до ${d}`,
  "cal.r.dates": d => d, "cal.r.except": d => `кроме ${d}`,
  "cal.phone": "Календарь в телефоне: бот Штаб → 📅 Неделя → 📲 Подписка — события появятся в календаре телефона и будут обновляться сами.",
  "fba.calendar": "Календарь", "fba.week": "Неделя", "cal.f.place": "Где (город — для погоды)", "cal.f.category": "Категория (пусто — по названию)", "cal.f.placePh": "пусто — там, где ты",
  "wx.ask": "📍 Погода для моего места", "wx.loading": "погода…", "wx.off": "Погода: бот не отвечает", "wx.nohome": "Погода: скажи боту, где ты (📅 Неделя → 📍), или разреши здесь геолокацию",
  "wx.denied": "Браузер не дал геолокацию: погода для места, которое ты отправила боту", "wx.note": "«Точно» — почти все варианты прогноза сходятся (≥ 80 %), «возможен» — от 30 %. Часы местные.",
  "wx.src": (s, n) => `Open-Meteo: ${s}${n ? ` · ${n} вариантов` : ""}`
});

/* ---------- toast (own, like ideas.js) ---------- */
const uiRoot = document.createElement("div");
uiRoot.className = "fb-ui";
uiRoot.innerHTML = `<div class="fb-toast" id="cal-toast" role="status" hidden></div>`;
document.body.appendChild(uiRoot);
const toastEl = uiRoot.querySelector("#cal-toast");
let toastTimer = null;
function toast(html, ms, retry) {
  clearTimeout(toastTimer);
  toastEl.innerHTML = `<span>${html}</span>${retry ? `<button type="button" data-act="retry">${T("fb.retry")}</button>` : ""}`;
  toastEl.hidden = false;
  if (ms) toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}
toastEl.addEventListener("click", e => { if (e.target.closest('[data-act="retry"]')) { saveErr = null; toastEl.hidden = true; save(); } });

/* ---------- data ---------- */
let events = null, head = "", cats = null, sha = null, loadErr = null, pending = [], saving = false, saveTimer = null, saveErr = null;
const v = Object.assign({ month: "", day: "", view: "" }, store.get("calView", {}));
let form = null;   // null | { id: "" (new) | event id, date }

async function load() {
  if (pending.length || saving) return;
  try {
    const f = await gh(`${repoPath()}/contents/${PATH}?ref=${encodeURIComponent(cfg.branch)}`).catch(e => { if (e.status === 404) return null; throw e; });
    if (f) { const text = b64decode(f.content); head = splitHeader(text)[0]; events = C.parseEvents(text); cats = C.parseCategories(text); sha = f.sha; }
    else { events = []; head = ""; cats = null; sha = null; }
    loadErr = null;
  } catch (e) {
    loadErr = T("cal.loadErr") + e.message;
    if (!events) events = [];
  }
}
function edit(op) {
  C.applyEventOp(events, op);
  pending.push(op); saveErr = null;
  clearTimeout(saveTimer); saveTimer = setTimeout(save, 400);
}
async function save() {
  if (saving || !pending.length) return;
  const errs = C.validateEvents(events);
  if (errs.length) { saveErr = T("save.not") + errs.join("; "); toast(esc(saveErr), 0, true); return; }
  saving = true; toast(T("cal.saving"));
  const ops = pending.slice(), message = `calendar: ${C.describeEventOps(ops)}\n\nSaved from the roadmap page.`;
  const put = (list, s) => gh(`${repoPath()}/contents/${PATH}`, { method: "PUT",
    body: { message, content: b64encode(C.serializeEvents(list, head || C.calendarHeadDefault(), cats)), branch: cfg.branch, ...(s ? { sha: s } : {}) } });
  try {
    let res;
    try { res = await put(events, sha); }
    catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      // the file changed meanwhile (the bot, another tab): replay the same operations on the newer file
      const latest = await gh(`${repoPath()}/contents/${PATH}?ref=${encodeURIComponent(cfg.branch)}`).catch(x => { if (x.status === 404) return null; throw x; });
      const base = latest ? C.parseEvents(b64decode(latest.content)) : [];
      if (latest) { head = splitHeader(b64decode(latest.content))[0]; cats = C.parseCategories(b64decode(latest.content)); }
      ops.forEach(op => C.applyEventOp(base, op));
      res = await put(base, latest ? latest.sha : null);
      pending.slice(ops.length).forEach(op => C.applyEventOp(base, op));
      events = base;
    }
    sha = res.content.sha; pending = pending.slice(ops.length);
    toast(T("cal.saved"), 2500);
  } catch (e) {
    saveErr = e instanceof TypeError ? T("save.offline") : e.status === 401 || e.status === 403 ? T("save.perm") : T("save.not") + e.message;
    toast(esc(saveErr), 0, true);
  } finally {
    saving = false; render();
    if (pending.length && !saveErr) { clearTimeout(saveTimer); saveTimer = setTimeout(save, 800); }
  }
}

/* ---------- texts ---------- */
const locale = () => lang === "ru" ? "ru-RU" : "en-GB";
const utc = d => new Date(d + "T00:00:00Z");
const wdShort = wd => utc(C.addDays("2026-10-26", C.WEEKDAYS.indexOf(wd))).toLocaleDateString(locale(), { weekday: "short", timeZone: "UTC" }).replace(".", "");
const dayLabel = d => utc(d).toLocaleDateString(locale(), { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "");
const dayLong = d => utc(d).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthLabel = m => { const s = utc(m + "-01").toLocaleDateString(locale(), { month: "long", year: "numeric", timeZone: "UTC" }); return s[0].toUpperCase() + s.slice(1); };
const endTime = (t, min) => { const [h, m] = t.split(":").map(Number), x = h * 60 + m + Number(min); return `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
const timeText = e => !e.time ? T("cal.allDay") : e.minutes ? `${e.time}–${endTime(e.time, e.minutes)}` : e.time;
// "every week: Mon, Wed · from 26 Oct · until 31 Dec · not 4 Nov"
function ruleText(e) {
  const n = +e.interval || 1, parts = [];
  if (e.every === "day") parts.push(T("cal.r.day", n));
  else if (e.every === "week") parts.push(T("cal.r.week", n, (e.days.length ? e.days : e.from ? [C.weekdayOf(e.from)] : []).map(wdShort).join(", ")));
  else if (e.every === "month") parts.push(T("cal.r.month", n, +e.month_day || (e.from ? +e.from.slice(8) : "?")));
  if (e.dates.length) parts.push(T("cal.r.dates", e.dates.map(dayLabel).join(", ")));
  if (e.every && e.from) parts.push(T("cal.r.from", dayLabel(e.from)));
  if (e.until) parts.push(T("cal.r.until", dayLabel(e.until)));
  if (e.except.length) parts.push(T("cal.r.except", e.except.map(dayLabel).join(", ")));
  return parts.join(" · ");
}
// an agent proposal as an event-like object (for the same texts)
function opEvent(op) {
  const r = op.repeat && !/^none$/i.test(op.repeat) ? C.parseRepeat(op.repeat) || {} : {};
  return C.normEvent({ title: op.title || "", time: op.time || "", minutes: op.minutes || "", ...r, dates: C.asList(op.dates), from: op.starts || (r.every ? today() : ""), until: op.ends || "" });
}
function opText(op) {
  if (op.op === "skip_event") return T("cal.r.except", C.asList(op.dates).map(d => C.isDate(d) ? dayLabel(d) : d).join(", "));
  if (op.op === "remove_event") return "";
  const e = opEvent(op), parts = [];
  if (op.time || op.minutes || op.op === "add_event") parts.push(timeText(e));
  const rule = ruleText({ ...e, from: op.starts || (op.op === "add_event" && e.every ? today() : "") });
  if (rule) parts.push(rule);
  if (op.place) parts.push("📍" + op.place);
  if (op.category) parts.push("🏷 " + op.category);
  if (op.notes) parts.push(op.notes);
  return parts.join(" · ");
}

/* ---------- the weather (asked from the bot) ---------- */
let wx = { status: "idle", days: {}, home: null, used: [], note: "" };
const wxOn = () => store.get("wxGeo", false);
function position() {
  // inside Telegram: its own location manager when it has one; else the browser's (asks once, remembered by the browser)
  return new Promise((res, rej) => {
    const lm = window.Telegram && Telegram.WebApp && Telegram.WebApp.LocationManager;
    const browser = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude }), rej,
      { timeout: 10000, maximumAge: 30 * 60 * 1000 }) : rej(new Error("no geolocation"));
    if (lm && lm.init) { try { lm.init(() => lm.isLocationAvailable ? lm.getLocation(l => (l ? res({ lat: l.latitude, lon: l.longitude }) : browser())) : browser()); return; } catch {} }
    browser();
  });
}
async function loadWeather(force) {
  if (!cfg.token || !events || (wx.status === "loading") || (!force && wx.status !== "idle")) return;
  wx.status = "loading";
  const from = today(), to = C.addDays(from, 7), dates = [];
  for (let d = from; d <= to; d = C.addDays(d, 1)) dates.push(d);
  const body = { dates, places: C.wxPlaces(events, from, to) };
  if (wxOn()) {
    try { Object.assign(body, await position(), { save: true }); wx.note = ""; } catch { wx.note = T("wx.denied"); }
  }
  try {
    const url = (window.AGENT && AGENT.botUrl ? AGENT.botUrl() : "https://kaa-hq-bot-preview.dev-kat888.workers.dev") + "/weather";
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-GitHub-Token": cfg.token }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.error) throw new Error((j.error && j.error.message) || res.status);
    wx = { ...wx, status: Object.keys(j.days || {}).length ? "ok" : j.home ? "empty" : "nohome", days: j.days || {}, home: j.home, used: j.used || [] };
  } catch {
    wx = { ...wx, status: "off", days: {} };
  }
  render();
}
const wxOf = d => wx.days[d] || null;
const wxChip = (w, full) => w ? `<span class="wx" title="${esc((w.place ? "📍" + w.place + " · " : "") + w.text)}">${esc(full ? w.text : w.short)}${w.place ? ` <span class="wx-place">📍${esc(w.place)}</span>` : ""}</span>` : "";

/* ---------- the week strip ---------- */
function weekDays() {
  return C.weekAgenda({ events: events || [], tasks: doc.tasks, milestones: doc.milestones, statusOf: effStatus }, today());
}
const count = () => events ? C.occurrences(events, today(), C.addDays(today(), 6)).length : 0;
function renderWeek() {
  if (!events) return "";
  if (wx.status === "idle") setTimeout(() => loadWeather(), 0);
  const days = weekDays(), any = days.some(d => d.items.length);
  const wxHead = wx.status === "loading" ? `<span class="muted wx-state">${T("wx.loading")}</span>`
    : wx.status === "off" ? `<span class="muted wx-state">${T("wx.off")}</span>`
    : wx.status === "nohome" || (!wxOn() && wx.status !== "idle" && !(wx.home && wx.home.src === "page")) ? `<button class="btn ghost wx-ask" type="button" data-wx-ask>${T("wx.ask")}</button>` : "";
  const item = it => {
    const color = it.kind === "event" ? "var(--accent)" : it.kind === "milestone" ? "var(--review)" : `var(--${effStatus(doc.tasks.find(t => t.id === it.id) || { status: "todo" })})`;
    const label = it.kind === "task" ? T("cal.task") : it.kind === "milestone" ? T("cal.ms") : "";
    return `<li class="wk-item wk-${it.kind}" title="${esc((it.time ? it.time + " " : "") + it.title + (label ? " · " + label : ""))}">
      <i class="dot" style="background:${color}"></i>${it.time ? `<span class="mono wk-time">${esc(it.time)}</span>` : it.kind === "milestone" ? `<span aria-hidden="true">⚑</span>` : it.kind === "task" ? `<span class="mono wk-time">${esc(it.id)}</span>` : ""}<span class="wk-title">${esc(it.title)}</span></li>`;
  };
  return `<section class="panel week" aria-label="${T("cal.week")}"${fbA("week")}>
    <div class="wk-head"><span class="label">${T("cal.week")}</span>${any ? "" : `<span class="muted">${T("cal.weekEmpty")}</span>`}<span class="fb-spacer"></span>${wxHead}</div>
    <ol class="wk-chain">${days.map(d => `<li class="wk-day ${d.today ? "is-today" : ""} ${d.items.length ? "" : "is-empty"}">
      <button type="button" class="wk-date" data-wk-day="${d.date}" title="${esc(dayLong(d.date))}"><b>${esc(wdShort(d.weekday))}</b> <span>${esc(dayLabel(d.date))}</span></button>
      ${wxChip(wxOf(d.date))}
      ${d.items.length ? `<ul>${d.items.slice(0, 3).map(item).join("")}${d.items.length > 3 ? `<li class="wk-more muted">${T("cal.more", d.items.length - 3)}</li>` : ""}</ul>` : `<span class="wk-none" aria-hidden="true">—</span>`}
    </li>`).join("")}</ol>
  </section>`;
}
function bindWeek(root) {
  root.querySelectorAll("[data-wk-day]").forEach(b => b.onclick = () => openDay(b.dataset.wkDay));
  root.querySelectorAll("[data-wx-ask]").forEach(b => b.onclick = () => { store.set("wxGeo", true); loadWeather(true); });
}
function openDay(date) {
  v.day = date; v.month = date.slice(0, 7); store.set("calView", v);
  ui.tab = "calendar"; render();
  document.querySelector(".cal-dayview")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* ---------- the Calendar tab ---------- */
const narrow = () => window.matchMedia && matchMedia("(max-width: 640px)").matches;
function renderView() {
  if (!events && !loadErr) return `<div class="note" style="margin-top:14px">${T("cal.loading")}</div>`;
  const month = v.month || today().slice(0, 7), first = month + "-01";
  const last = C.addDays(C.addDays(first, 32).slice(0, 7) + "-01", -1);
  const occ = C.occurrences(events, first, last);
  // a phone shows the list, except inside Telegram (opened to see the calendar as a calendar)
  const view = v.view || (narrow() && !document.documentElement.classList.contains("tg-app") ? "list" : "month");
  const sel = v.day && v.day.startsWith(month) ? v.day : (today().startsWith(month) ? today() : "");
  const chip = o => `<span class="cal-chip" title="${esc(timeText(o.event) + " · " + o.title)}">${o.time ? `<span class="mono">${esc(o.time)}</span> ` : ""}${esc(o.title)}</span>`;
  let body;
  if (view === "month") {
    const start = C.addDays(first, -C.WEEKDAYS.indexOf(C.weekdayOf(first))), cells = [];
    for (let d = start; d <= last || C.weekdayOf(d) !== "mon"; d = C.addDays(d, 1)) cells.push(d);
    body = `<div class="cal-grid" role="grid">
      ${C.WEEKDAYS.map(w => `<div class="cal-wd" role="columnheader">${esc(wdShort(w))}</div>`).join("")}
      ${cells.map(d => { const its = occ.filter(o => o.date === d), out = !d.startsWith(month);
        return `<button type="button" role="gridcell" class="cal-cell ${out ? "is-out" : ""} ${d === today() ? "is-today" : ""} ${d === sel ? "is-sel" : ""}" data-cal-day="${d}" aria-label="${esc(dayLong(d))}${its.length ? ": " + esc(its.map(o => o.title).join(", ")) : ""}">
          <span class="cal-num">${+d.slice(8)}${!out && wxOf(d) ? ` <span class="wx-icon" title="${esc(wxOf(d).text)}">${esc(wxOf(d).icon)}</span>` : ""}</span>${out ? "" : its.slice(0, 3).map(chip).join("")}${!out && its.length > 3 ? `<span class="cal-more muted">${T("cal.more", its.length - 3)}</span>` : ""}</button>`; }).join("")}
    </div>${sel ? renderDay(sel) : ""}`;
  } else {
    // the current month from today on; a tap on a day opens it (with its actions) above the list
    const days = [...new Set(occ.map(o => o.date))].filter(d => !today().startsWith(month) || d >= today());
    body = `${sel && v.day === sel ? renderDay(sel) : ""}${days.length ? `<ol class="cal-list">${days.map(d => `<li class="${d === today() ? "is-today" : ""} ${d === sel ? "is-sel" : ""}">
      <button type="button" class="cal-list-day" data-cal-day="${d}">${esc(dayLong(d))}</button>
      <ul class="cal-lines">${occ.filter(o => o.date === d).map(o => `<li><span class="mono">${esc(o.time || T("cal.allDay"))}</span> ${esc(o.title)}</li>`).join("")}</ul></li>`).join("")}</ol>`
      : `<div class="note">${T("cal.none")}</div>`}`;
  }
  return `<div class="fb-view cal-view">
    ${loadErr ? `<div class="error">${esc(loadErr)}</div>` : ""}
    <div class="fb-filters cal-bar"${fbA("calendar-bar")}>
      <button class="btn" type="button" data-cal-move="-1" aria-label="${T("cal.prev")}">‹</button>
      <b class="cal-month">${esc(monthLabel(month))}</b>
      <button class="btn" type="button" data-cal-move="1" aria-label="${T("cal.next")}">›</button>
      <button class="btn ghost" type="button" data-cal-today>${T("cal.today")}</button>
      <span class="fb-spacer"></span>
      <div class="cal-seg" role="group"><button type="button" class="btn ${view === "month" ? "primary" : ""}" data-cal-view="month">${T("cal.month")}</button><button type="button" class="btn ${view === "list" ? "primary" : ""}" data-cal-view="list">${T("cal.list")}</button></div>
      <button class="btn primary" type="button" data-cal-new>${T("cal.new")}</button>
    </div>
    ${form ? renderForm() : ""}
    ${view === "month" && !occ.length ? `<div class="note">${T("cal.none")}</div>` : ""}
    ${body}
    ${Object.keys(wx.days).length ? `<p class="muted cal-phone">${T("wx.note")} ${esc(T("wx.src", wx.used.join(", "), (Object.values(wx.days)[0] || {}).members))}${wx.note ? " · " + esc(wx.note) : ""}</p>` : ""}
    <p class="muted cal-phone">${T("cal.phone")}</p>
  </div>`;
}
function renderItems(d) {
  const its = C.occurrences(events, d, d);
  if (!its.length) return `<p class="muted" style="margin:0">${T("cal.dayEmpty")}</p>`;
  return `<ul class="cal-items">${its.map(o => `<li class="cal-item"${fbA("event-" + o.id, o.title)}>
    <span class="mono cal-when">${esc(timeText(o.event))}</span>
    <span class="cal-what"><b>${esc(o.title)}</b><span class="muted">${esc(ruleText(o.event))}${C.wxPlaceOf(o.event) ? ` · 📍${esc(C.wxPlaceOf(o.event))}` : ""}</span>${o.event.notes ? `<span class="muted">${esc(o.event.notes)}</span>` : ""}</span>
    <span class="cal-acts">${o.event.every ? `<button class="btn ghost" type="button" data-cal-skip="${esc(o.id)}" data-date="${d}">${T("cal.skip")}</button>` : ""}
      <button class="btn ghost" type="button" data-cal-edit="${esc(o.id)}">${T("cal.edit")}</button>
      <button class="btn ghost danger" type="button" data-cal-del="${esc(o.id)}">${T("cal.del")}</button></span>
  </li>`).join("")}</ul>`;
}
const renderDay = d => `<section class="cal-dayview panel"><h3>${esc(dayLong(d))}</h3>${wxOf(d) ? `<p class="wx-day">${wxChip(wxOf(d), true)}</p>` : ""}${renderItems(d)}</section>`;
function renderForm() {
  const e = form.id ? events.find(x => x.id === form.id) : null;
  const x = e || C.normEvent({ title: "", dates: form.date ? [form.date] : [], from: form.date || today() });
  const kind = x.every || "once";
  const opt = (k, label) => `<option value="${k}" ${kind === k ? "selected" : ""}>${label}</option>`;
  return `<form class="editor cal-form" data-cal-form style="grid-column:auto;margin:0">
    <label class="field"><span>${T("cal.f.title")}</span><input type="text" name="title" maxlength="100" required value="${esc(x.title)}" placeholder="${T("cal.f.titlePh")}"></label>
    <div class="grid2">
      <label class="field"><span>${T("cal.f.kind")}</span><select name="every">${opt("once", T("cal.f.once"))}${opt("day", T("cal.f.day"))}${opt("week", T("cal.f.week"))}${opt("month", T("cal.f.monthly"))}</select></label>
      <label class="field" data-show="day week month"><span>${T("cal.f.interval")}</span><input type="number" name="interval" min="1" max="52" value="${esc(x.interval || "1")}"></label>
    </div>
    <fieldset class="field cal-days" data-show="week"><legend>${T("cal.f.days")}</legend>${C.WEEKDAYS.map(w => `<label><input type="checkbox" name="days" value="${w}" ${x.days.includes(w) ? "checked" : ""}> ${esc(wdShort(w))}</label>`).join("")}</fieldset>
    <label class="field" data-show="month"><span>${T("cal.f.monthDay")}</span><input type="number" name="month_day" min="1" max="31" value="${esc(x.month_day)}"></label>
    <label class="field" data-show="once"><span>${T("cal.f.dates")}</span><input type="text" name="dates" value="${esc(x.dates.join(", "))}" placeholder="${T("cal.f.datesPh")}"></label>
    <div class="grid2">
      <label class="field"><span>${T("cal.f.time")}</span><input type="time" name="time" value="${esc(x.time)}"></label>
      <label class="field"><span>${T("cal.f.minutes")}</span><input type="number" name="minutes" min="5" step="5" value="${esc(x.minutes)}"></label>
    </div>
    <div class="grid2" data-show="day week month">
      <label class="field"><span>${T("cal.f.from")}</span><input type="date" name="from" value="${esc(x.from || today())}"></label>
      <label class="field"><span>${T("cal.f.until")}</span><input type="date" name="until" value="${esc(x.until)}"></label>
    </div>
    <label class="field"><span>${T("cal.f.place")}</span><input type="text" name="place" maxlength="80" value="${esc(x.place || "")}" placeholder="${T("cal.f.placePh")}"></label>
    <label class="field"><span>${T("cal.f.category")}</span><input type="text" name="category" maxlength="${C.MAX_CATEGORY}" list="cal-cats" value="${esc(x.category || "")}" placeholder="${esc(C.categoryOf(x, cats))}">
      <datalist id="cal-cats">${C.eventCategories(events || [], cats).filter(c => c !== C.CATEGORY_OTHER).map(c => `<option value="${esc(c)}">`).join("")}</datalist></label>
    <label class="field"><span>${T("cal.f.notes")}</span><input type="text" name="notes" value="${esc(x.notes || "")}"></label>
    <div class="actions"><div style="display:flex;gap:8px"><button class="btn primary" type="submit">${T("cal.f.save")}</button><button class="btn" type="button" data-cal-cancel>${T("cal.f.cancel")}</button></div></div>
  </form>`;
}
function showFor(f) {
  const k = f.elements.every.value;
  f.querySelectorAll("[data-show]").forEach(el => { el.hidden = !el.dataset.show.split(" ").includes(k); });
}
function bindView(root) {
  const go = m => { v.month = m; v.day = ""; store.set("calView", v); render(); };
  root.querySelectorAll("[data-cal-move]").forEach(b => b.onclick = () => {
    const [y, m] = (v.month || today().slice(0, 7)).split("-").map(Number), d = new Date(Date.UTC(y, m - 1 + Number(b.dataset.calMove), 1));
    go(d.toISOString().slice(0, 7));
  });
  root.querySelector("[data-cal-today]") && (root.querySelector("[data-cal-today]").onclick = () => { v.month = today().slice(0, 7); v.day = today(); store.set("calView", v); render(); });
  root.querySelectorAll("[data-cal-view]").forEach(b => b.onclick = () => { v.view = b.dataset.calView; store.set("calView", v); render(); });
  root.querySelectorAll("[data-cal-day]").forEach(b => b.onclick = () => {
    v.day = b.dataset.calDay; store.set("calView", v); render();
    document.querySelector(".cal-dayview")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  root.querySelector("[data-cal-new]") && (root.querySelector("[data-cal-new]").onclick = () => { form = { id: "", date: v.day || "" }; render(); root.querySelector('[data-cal-form] input[name="title"]')?.focus(); });
  root.querySelectorAll("[data-cal-edit]").forEach(b => b.onclick = () => { form = { id: b.dataset.calEdit }; render(); $("view")?.querySelector("[data-cal-form]")?.scrollIntoView({ block: "nearest" }); });
  root.querySelectorAll("[data-cal-skip]").forEach(b => b.onclick = () => { edit({ type: "skip", id: b.dataset.calSkip, dates: [b.dataset.date] }); render(); });
  root.querySelectorAll("[data-cal-del]").forEach(b => b.onclick = () => {
    const e = events.find(x => x.id === b.dataset.calDel);
    if (e && confirm(T("cal.delAsk", e.title))) { edit({ type: "remove", id: e.id }); render(); }
  });
  const f = root.querySelector("[data-cal-form]");
  if (!f) return;
  showFor(f);
  f.elements.every.onchange = () => showFor(f);
  f.querySelector("[data-cal-cancel]").onclick = () => { form = null; render(); };
  f.onsubmit = ev => {
    ev.preventDefault();
    const fd = new FormData(f), kind = fd.get("every"), rep = kind !== "once";
    const fields = {
      title: String(fd.get("title")).trim(), time: fd.get("time") || "", minutes: fd.get("minutes") || "",
      every: rep ? kind : "", interval: rep && +fd.get("interval") > 1 ? String(+fd.get("interval")) : "",
      days: kind === "week" ? fd.getAll("days") : [], month_day: kind === "month" ? String(fd.get("month_day") || "") : "",
      dates: rep ? (form.id ? (events.find(x => x.id === form.id)?.dates || []) : []) : C.asList(fd.get("dates")),
      from: rep ? fd.get("from") || today() : "", until: rep ? fd.get("until") || "" : "", place: String(fd.get("place") || "").trim(), category: String(fd.get("category") || "").trim(), notes: String(fd.get("notes") || "").trim()
    };
    const probe = C.normEvent({ id: form.id || "EV-999", ...fields, except: [] }), errs = C.validateEvents([probe]);
    if (errs.length) { toast(esc(T("cal.f.bad") + errs.map(s => s.replace(/^EV-\d+: /, "")).join("; ")), 6000); return; }
    if (form.id) edit({ type: "update", id: form.id, fields });
    else edit({ type: "add", item: C.clean({ id: C.nextEventId(events), ...fields, created: today() }) });
    v.day = fields.dates[0] || C.nextOccurrence(probe, today()) || v.day; if (v.day) v.month = v.day.slice(0, 7); store.set("calView", v);
    form = null; render();
  };
}

/* ---------- the intake agent's accepted calendar proposals → results[i] = event id ---------- */
function applyAgent(picked) {
  const { ops, results } = C.agentEventOps(picked.map(x => x.op), JSON.parse(JSON.stringify(events)), today());
  ops.forEach(edit);
  const out = {};
  picked.forEach((x, k) => { out[x.i] = results[k]; });
  return out;
}

window.CAL = { load, weather: () => wx, events: () => events || [], categories: () => cats, busy: () => pending.length > 0 || saving, count, renderView, bindView, renderWeek, bindWeek, applyAgent, ruleText, opText, openDay };
})();
