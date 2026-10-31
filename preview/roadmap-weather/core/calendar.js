/* AI-generated (Claude) · 2026-10-21 · not reviewed by a human
 *
 * Roadmap core: the calendar (roadmap/calendar/events__ai.yaml) — events kept as rules ("Mon, Wed, Fri at 19:00
 * from 26 Oct"), not as lists of dates. Read, write, validate, ids, edit operations, dates of a range,
 * the week ahead (events + deadlines of open tasks and milestones), the .ics feed for a phone calendar.
 * Needs common.js. Spec: roadmap/designs/calendar__ai.md. Dates are "YYYY-MM-DD" in Moscow time.
 */
(function (root) {
"use strict";
const C = root.RoadmapCore;
if (!C || !C.clean) throw new Error("load roadmap/core/common.js before calendar.js");

C.CALENDAR_PATH = "roadmap/calendar/events__ai.yaml";
C.EVENT_FIELDS = ["id", "title", "time", "minutes", "every", "interval", "days", "month_day", "dates", "from", "until", "except", "place", "category", "notes", "created"];
C.EVENT_EVERY = ["day", "week", "month"];
C.WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
C.EVENT_ID_RE = /^EV-(\d{3,})$/;
C.calendarHeadDefault = () => "# AI-generated (Claude) · 2026-10-21 · not reviewed by a human\n#\n# Kaa's calendar: events as rules. Written by the roadmap page (Calendar tab, the agent) and the Штаб bot.\n# Format: roadmap/designs/calendar__ai.md. One-off dates → dates: [...]; repeats → every: day | week | month,\n# interval (every N), days (for week), month_day (for month), from, until, except. time \"HH:MM\" Moscow; no time = all day.\n# Comments in this header are kept when the page saves; comments further down are not.";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
C.isDate = s => DATE_RE.test(String(s || "")) && !isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
C.isTime = s => TIME_RE.test(String(s || ""));

/* ---------- dates as strings ---------- */
const toUtc = s => new Date(s + "T00:00:00Z");
const fromUtc = d => d.toISOString().slice(0, 10);
C.addDays = (s, n) => { const d = toUtc(s); d.setUTCDate(d.getUTCDate() + n); return fromUtc(d); };
C.weekdayOf = s => C.WEEKDAYS[(toUtc(s).getUTCDay() + 6) % 7];        // "mon" … "sun"
const dayNo = s => Math.round(toUtc(s).getTime() / 864e5);
const mondayOf = s => C.addDays(s, -C.WEEKDAYS.indexOf(C.weekdayOf(s)));
C.mondayOf = mondayOf;
// today in Moscow, whatever the caller's clock zone (the bot runs in UTC)
C.todayMsk = (d = new Date()) => C.nowMsk(d).slice(0, 10);

/* ---------- file ---------- */
C.normEvent = x => {
  const e = {};
  Object.entries(x || {}).forEach(([k, v]) => { e[k] = Array.isArray(v) ? v.map(C.asText) : C.asText(v); });
  ["days", "dates", "except"].forEach(f => { e[f] = C.asList(x[f]).map(s => s.toLowerCase()); });
  e.minutes = e.minutes ? e.minutes : "";
  e.interval = e.interval ? e.interval : "";
  return e;
};
C.parseEvents = text => {
  const data = (text && C.yaml().load(text, C.yamlOpts())) || {};
  return (Array.isArray(data.events) ? data.events : []).filter(x => x && typeof x === "object").map(C.normEvent);
};
/* the calendar's own list of categories (top-level `categories:` in the events file): set by Kaa at the start
 * (the defaults, some removed, her own added) and as she goes; null while she hasn't set it (= the defaults) */
C.parseCategories = text => {
  const data = (text && C.yaml().load(text, C.yamlOpts())) || {};
  return Array.isArray(data.categories) ? [...new Set(data.categories.map(c => C.asText(c).trim()).filter(c => c && c !== C.CATEGORY_OTHER))] : null;
};
C.serializeEvents = (events, head, categories = null) => {
  const num = v => /^\d+$/.test(String(v)) ? Number(v) : v;
  const out = events.map(e => {
    const o = C.ordered(C.clean({ ...e, minutes: e.minutes ? num(e.minutes) : "", interval: e.interval && String(e.interval) !== "1" ? num(e.interval) : "",
      month_day: e.month_day ? num(e.month_day) : "" }), C.EVENT_FIELDS);
    return o;
  });
  // the list keeps the categories events use too (a new one given to an event joins the list)
  const cats = categories ? C.eventCategories(events, categories).filter(c => c !== C.CATEGORY_OTHER) : null;
  return (head || C.calendarHeadDefault()) + "\n\n" + C.yaml().dump(cats ? { categories: cats, events: out } : { events: out }, C.dumpOpts({ flowLevel: 3 }));
};
C.validateEvents = events => {
  const errs = [], seen = new Set();
  events.forEach(e => {
    const id = e.id || "?";
    if (!C.EVENT_ID_RE.test(e.id || "")) errs.push(`${id}: bad id`);
    if (seen.has(e.id)) errs.push(`${id}: duplicate id`); seen.add(e.id);
    if (!C.asText(e.title).trim()) errs.push(`${id}: no title`);
    if (C.asText(e.title).length > 100) errs.push(`${id}: title longer than 100 characters`);
    if (C.asText(e.category).length > C.MAX_CATEGORY) errs.push(`${id}: category longer than ${C.MAX_CATEGORY} characters`);
    if (e.time && !C.isTime(e.time)) errs.push(`${id}: time must be HH:MM`);
    if (e.minutes && !/^\d+$/.test(e.minutes)) errs.push(`${id}: minutes must be a number`);
    if (!e.every && !e.dates.length) errs.push(`${id}: needs dates or every`);
    if (e.every && !C.EVENT_EVERY.includes(e.every)) errs.push(`${id}: every must be day, week or month`);
    if (e.every && !C.isDate(e.from)) errs.push(`${id}: a repeating event needs from (YYYY-MM-DD)`);
    if (e.interval && !/^[1-9]\d*$/.test(e.interval)) errs.push(`${id}: interval must be 1 or more`);
    e.days.forEach(d => { if (!C.WEEKDAYS.includes(d)) errs.push(`${id}: unknown day ${d}`); });
    if (e.month_day && !(/^\d+$/.test(e.month_day) && +e.month_day >= 1 && +e.month_day <= 31)) errs.push(`${id}: month_day must be 1–31`);
    [...e.dates, ...e.except, ...(e.from ? [e.from] : []), ...(e.until ? [e.until] : [])].forEach(d => { if (!C.isDate(d)) errs.push(`${id}: bad date ${d}`); });
    if (e.from && e.until && e.until < e.from) errs.push(`${id}: until is before from`);
  });
  return errs;
};
C.nextEventId = events => C.nextNumber(events.map(e => e.id), "EV-");

/* Edit operations on a list of events, replayed on a newer file when it changed meanwhile:
 *   { type: "add", item }   { type: "update", id, fields }   { type: "skip", id, dates: [...] }   { type: "remove", id } */
C.applyEventOp = (events, op) => {
  if (op.type === "add") {
    if (events.some(e => e.id === op.item.id)) op.item.id = C.nextEventId(events);
    events.push(C.normEvent(op.item));
  } else if (op.type === "update") {
    const e = events.find(x => x.id === op.id);
    if (e) Object.assign(e, C.normEvent({ ...e, ...op.fields }));
  } else if (op.type === "skip") {
    const e = events.find(x => x.id === op.id);
    if (e) e.except = [...new Set([...e.except, ...op.dates])].sort();
  } else if (op.type === "remove") {
    const i = events.findIndex(x => x.id === op.id);
    if (i >= 0) events.splice(i, 1);
  }
};
C.describeEventOps = ops => [...new Set(ops.map(op => op.type === "add" ? `${op.item.id} added` : op.type === "skip" ? `${op.id} skips ${op.dates.join(", ")}`
  : op.type === "remove" ? `${op.id} removed` : `${op.id} edited`))].join(", ");

/* ---------- repeat rules ---------- */
// does the rule put the event on this date (ignoring from / until / except / dates)
const onRule = (e, d) => {
  const n = +e.interval || 1;
  if (e.every === "day") return (dayNo(d) - dayNo(e.from)) % n === 0;
  if (e.every === "week") {
    const days = e.days.length ? e.days : [C.weekdayOf(e.from)];
    return days.includes(C.weekdayOf(d)) && ((dayNo(mondayOf(d)) - dayNo(mondayOf(e.from))) / 7) % n === 0;
  }
  if (e.every === "month") {
    const md = +e.month_day || +e.from.slice(8), [y, m] = d.split("-").map(Number), [fy, fm] = e.from.split("-").map(Number);
    return +d.slice(8) === md && ((y - fy) * 12 + (m - fm)) % n === 0;
  }
  return false;
};
C.eventOn = (e, d) => {
  if (e.except.includes(d)) return false;
  if (e.dates.includes(d)) return true;
  if (!e.every || !e.from || d < e.from || (e.until && d > e.until)) return false;
  return onRule(e, d);
};
// every occurrence in [from, to] (inclusive), sorted by date and time: { date, time, minutes, id, title, event }
C.occurrences = (events, from, to) => {
  const out = [];
  for (let d = from; d <= to; d = C.addDays(d, 1))
    events.forEach(e => { if (C.eventOn(e, d)) out.push({ date: d, time: e.time || "", minutes: e.minutes || "", id: e.id, title: e.title, event: e }); });
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "") || a.id.localeCompare(b.id));
};
/* «покажи поездки в декабре и январе», «когда тренировки в ноябре»: the events of from..to that match her words.
 * query: "" = every event; trip words («поездки», «путешествия», «командировки») = the trips (an event with a place,
 * or titled «Поездка …»); other words = events whose title or place has one of them (by stem: «тренировки» finds
 * «Тренировка»). One entry per run of consecutive dates of one event (a trip of Sat–Sun is one line):
 * { id, title, time, minutes, place, from, to, count } sorted by date and time. */
C.TRIP_WORDS = /поезд|путешеств|выезд|командиров|отпуск|\btrips?\b|travel/i;
C.isTrip = e => !!String(e.place || "").trim() || /^\s*(поездк|путешеств|командиров|отпуск)/i.test(String(e.title || ""));
C.findEvents = (events, from, to, query = "") => {
  const q = String(query || "").trim().toLowerCase(), trips = C.TRIP_WORDS.test(q);
  const stems = trips ? [] : q.split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2).map(w => w.length > 5 ? w.slice(0, w.length - 2) : w);
  const hit = e => trips ? C.isTrip(e) : !stems.length || stems.some(st => `${e.title || ""} ${e.place || ""} ${C.categoryOf(e)}`.toLowerCase().includes(st));
  const out = [], last = {};
  C.occurrences(events.filter(hit), from, to).forEach(o => {
    const run = last[o.id];
    if (run && run.to === C.addDays(o.date, -1)) { run.to = o.date; run.count++; return; }
    last[o.id] = { id: o.id, title: o.title, time: o.time, minutes: o.minutes, place: String(o.event.place || "").trim(), from: o.date, to: o.date, count: 1 };
    out.push(last[o.id]);
  });
  return out;
};
/* Categories of events (Kaa): few of them. Three obvious ones from the start, found by the event's words when it has
 * no category of its own; she makes others herself by giving an event a new category («тату — в категорию Личное»).
 * An event without one and not matching any is «Другое». A category exists while an event has it (no separate list). */
C.CATEGORY_DEFAULTS = [
  { name: "Поездки", test: e => C.isTrip(e) },
  { name: "Тренировки", test: e => /тренировк|трениров|йог|\bбег\b|пробежк|спорт|фитнес|плаван|бассейн|растяжк|пилатес|велосипед|\bзал\b|качалк|танц/i.test(String(e.title || "")) },
  { name: "Работа", test: e => /работ|созвон|митинг|стендап|ревью|разбор|дедлайн|отч[её]т|совещан|планёрк|планерк|интервью|собеседован|\bsas\b/i.test(String(e.title || "")) },
];
C.CATEGORY_OTHER = "Другое";
C.MAX_CATEGORY = 30;
// cats = the calendar's list (C.parseCategories) or null (= the defaults): an obvious one is found by words only if it's in the list
C.categoryOf = (e, cats = null) => {
  if (!Array.isArray(cats)) cats = null;   // also as a .map() callback
  const own = String((e && e.category) || "").trim();
  if (own) return own;
  const d = C.CATEGORY_DEFAULTS.find(c => (!cats || cats.includes(c.name)) && c.test(e || {}));
  return d ? d.name : C.CATEGORY_OTHER;
};
// every category: the list (or the defaults), then the ones events have that aren't in it; «Другое» last
C.eventCategories = (events, cats = null) => {
  const base = cats || C.CATEGORY_DEFAULTS.map(c => c.name);
  const mine = [...new Set((events || []).map(e => String(e.category || "").trim()).filter(Boolean))];
  const all = [...base, ...mine.filter(n => !base.some(b => b.toLowerCase() === n.toLowerCase()))];
  return [...new Set(all)].filter(n => n !== C.CATEGORY_OTHER).concat(C.CATEGORY_OTHER);
};
/* categories the service suggests as events pile up: «Другое» events that share an obvious theme (2 or more).
 * → [{ name, ids: [event ids], titles }] — not those in the list, nor those she said no to (skip) */
C.CATEGORY_THEMES = [
  { name: "Учёба", re: /учёб|учеб|курс|урок|лекци|семинар|вебинар|экзамен|занятие|английск|язык/i },
  { name: "Досуг", re: /концерт|кино|театр|выставк|музей|комик|стендап-шоу|вечеринк|корпоратив|фестивал|дискотек|диско|спектакл|квиз/i },
  { name: "Здоровье", re: /врач|доктор|стоматолог|зубн|анализ|массаж|поликлиник|клиник|приём у|прием у|осмотр/i },
  { name: "Дом", re: /уборк|ремонт|дача|стирк|переезд|мастер|сантехник|электрик/i },
  { name: "Красота", re: /тату|маникюр|педикюр|стрижк|парикмахер|салон|бров|ресниц/i },
  { name: "Семья и друзья", re: /день рождени|\bдр\b|мама|папа|бабушк|дедушк|друз|подруг|свадьб|гости/i },
];
C.suggestCategories = (events, cats = null, skip = []) => {
  const have = C.eventCategories(events, cats).map(c => c.toLowerCase()), no = skip.map(c => String(c).toLowerCase());
  const other = (events || []).filter(e => C.categoryOf(e, cats) === C.CATEGORY_OTHER);
  return C.CATEGORY_THEMES.filter(t => !have.includes(t.name.toLowerCase()) && !no.includes(t.name.toLowerCase()))
    .map(t => { const hit = other.filter(e => t.re.test(String(e.title || ""))); return { name: t.name, ids: hit.map(e => e.id), titles: [...new Set(hit.map(e => e.title))] }; })
    .filter(x => x.ids.length >= 2);
};
// occurrences → [[category, count]] by count (more first), «Другое» last
C.categoryCounts = (occ, cats = null) => {
  const n = {};
  occ.forEach(o => { const c = C.categoryOf(o.event || o, cats); n[c] = (n[c] || 0) + 1; });
  return Object.entries(n).sort((a, b) => (a[0] === C.CATEGORY_OTHER) - (b[0] === C.CATEGORY_OTHER) || b[1] - a[1] || a[0].localeCompare(b[0]));
};
// first date of the event on or after a date (within a year), or ""
C.nextOccurrence = (e, from) => {
  for (let d = from, i = 0; i < 400; i++, d = C.addDays(d, 1)) if (C.eventOn(e, d)) return d;
  return "";
};

/* The week ahead: 7 days from today, each with its events and the deadlines of open tasks and milestones.
 * tasks / milestones = the tasks file's lists; statusOf(task) = the caller's effective status. */
/* from = the first day (today for «the next 7 days», C.mondayOf(today) for «this week»); mark = today */
C.weekAgenda = ({ events = [], tasks = [], milestones = [], statusOf = t => t.status }, today, n = 7, mark = today) => {
  const end = C.addDays(today, n - 1), occ = C.occurrences(events, today, end);
  const msDone = id => { const ts = tasks.filter(t => t.milestone === id); return ts.length > 0 && ts.every(t => statusOf(t) === "done"); };
  return Array.from({ length: n }, (_, i) => {
    const date = C.addDays(today, i);
    const items = [
      ...occ.filter(o => o.date === date).map(o => ({ kind: "event", id: o.id, title: o.title, time: o.time, minutes: o.minutes })),
      ...milestones.filter(m => m.due === date && !msDone(m.id)).map(m => ({ kind: "milestone", id: m.id, title: m.title, time: "" })),
      ...tasks.filter(t => t.due === date && statusOf(t) !== "done").map(t => ({ kind: "task", id: t.id, title: t.title, time: "" }))
    ];
    return { date, weekday: C.weekdayOf(date), today: date === mark, past: date < mark, items };
  });
};

/* ---------- agent's compact repeat: "day", "day/2", "week:mon,wed", "week/2:tue", "month:15", "month" ---------- */
C.parseRepeat = s => {
  const m = /^\s*(day|week|month)(?:\s*\/\s*(\d+))?(?:\s*:\s*([a-z0-9 ,]+))?\s*$/i.exec(String(s || ""));
  if (!m) return null;
  const every = m[1].toLowerCase(), interval = m[2] && m[2] !== "1" ? m[2] : "", rest = (m[3] || "").toLowerCase();
  if (every === "week") {
    const days = C.asList(rest).map(d => d.slice(0, 3));
    if (days.some(d => !C.WEEKDAYS.includes(d))) return null;
    return { every, interval, days, month_day: "" };
  }
  if (every === "month") {
    if (rest && !(/^\d+$/.test(rest.trim()) && +rest >= 1 && +rest <= 31)) return null;
    return { every, interval, days: [], month_day: rest.trim() };
  }
  return rest ? null : { every, interval, days: [], month_day: "" };
};
C.repeatOf = e => !e.every ? "" : e.every + (e.interval && e.interval !== "1" ? "/" + e.interval : "")
  + (e.every === "week" && e.days.length ? ":" + e.days.join(",") : e.every === "month" && e.month_day ? ":" + e.month_day : "");

/* ---------- .ics (RFC 5545) for a phone calendar subscription ---------- */
const icsText = s => C.asText(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// lines longer than 75 bytes are folded (continuation lines start with a space)
const fold = line => {
  const bytes = s => new TextEncoder().encode(s).length;
  if (bytes(line) <= 75) return line;
  const parts = []; let cur = "";
  for (const ch of line) {
    if (bytes(cur + ch) > (parts.length ? 74 : 75)) { parts.push(cur); cur = ""; }
    cur += ch;
  }
  parts.push(cur);
  return parts.join("\r\n ");
};
const compact = d => d.replace(/-/g, "");
const stamp = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const BYDAY = { mon: "MO", tue: "TU", wed: "WE", thu: "TH", fri: "FR", sat: "SA", sun: "SU" };
const TZ = ["BEGIN:VTIMEZONE", "TZID:Europe/Moscow", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0300", "TZNAME:MSK", "END:STANDARD", "END:VTIMEZONE"];
function vevent({ uid, e, date, rule, now }) {
  const timed = !!e.time, t = timed ? e.time.replace(":", "") + "00" : "";
  const at = d => timed ? `;TZID=Europe/Moscow:${compact(d)}T${t}` : `;VALUE=DATE:${compact(d)}`;
  const L = ["BEGIN:VEVENT", `UID:${uid}@kaa-roadmap`, `DTSTAMP:${stamp(now)}`, `SUMMARY:${icsText(e.title)}`, `DTSTART${at(date)}`,
    timed ? `DURATION:PT${+e.minutes || 60}M` : `DTEND;VALUE=DATE:${compact(C.addDays(date, 1))}`];
  if (rule) {
    const p = [`FREQ=${{ day: "DAILY", week: "WEEKLY", month: "MONTHLY" }[e.every]}`];
    if (+e.interval > 1) p.push(`INTERVAL=${+e.interval}`);
    if (e.every === "week") p.push(`BYDAY=${(e.days.length ? e.days : [C.weekdayOf(e.from)]).map(d => BYDAY[d]).join(",")}`);
    if (e.every === "month") p.push(`BYMONTHDAY=${+e.month_day || +e.from.slice(8)}`);
    // UNTIL is UTC for a timed start: the end of that day in Moscow = 20:59:59Z
    if (e.until) p.push(`UNTIL=${compact(e.until)}${timed ? "T205959Z" : ""}`);
    L.push(`RRULE:${p.join(";")}`);
    const ex = e.except.filter(d => d >= date && onRule(e, d));
    if (ex.length) L.push(`EXDATE${timed ? ";TZID=Europe/Moscow:" + ex.map(d => compact(d) + "T" + t).join(",") : ";VALUE=DATE:" + ex.map(compact).join(",")}`);
  }
  if (e.place) L.push(`LOCATION:${icsText(e.place)}`);
  if (e.notes) L.push(`DESCRIPTION:${icsText(e.notes)}`);
  L.push("END:VEVENT");
  return L;
}
/* events → the text of an .ics file; one VEVENT with an RRULE per repeating event, one VEVENT per extra / one-off date */
C.toICS = (events, { name = "Kaa · calendar", now = new Date() } = {}) => {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//kaa//roadmap calendar//RU", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(name)}`, "X-WR-TIMEZONE:Europe/Moscow", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H", ...TZ];
  events.forEach(e => {
    if (e.every && C.isDate(e.from)) {
      const first = C.nextOccurrence({ ...e, dates: [], except: [] }, e.from);
      if (first && (!e.until || first <= e.until)) L.push(...vevent({ uid: e.id, e, date: first, rule: true, now }));
    }
    e.dates.filter(d => C.isDate(d) && !e.except.includes(d) && !(e.every && e.from && d >= e.from && (!e.until || d <= e.until) && onRule(e, d)))
      .forEach(d => L.push(...vevent({ uid: `${e.id}-${compact(d)}`, e, date: d, rule: false, now })));
  });
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n") + "\r\n";
};
})(typeof globalThis !== "undefined" ? globalThis : this);
