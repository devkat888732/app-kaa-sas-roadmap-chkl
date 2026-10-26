/* AI-generated (Claude) · 2026-10-26 · not reviewed by a human
 *
 * Roadmap core: the week's weather for the calendar — WHEN it will surely rain and when the sun will surely shine.
 * (Kaa, 2026-10-26: «нужно брать самые точные сведения; важно знать, когда точно будет дождь и когда точно солнце».)
 *
 * Input: Open-Meteo answers, fetched by the Штаб bot (src/weather.js) — this file only reads them, so the page and the bot
 * judge the same way and the tests need no network:
 *   - ensemble forecasts (ECMWF IFS 51 members, ICON-EU / ICON 40, GFS 31…): each member is the same model run from slightly
 *     different starting conditions; the share of members with rain in an hour is the chance of rain;
 *   - deterministic forecasts of several models (best_match, ECMWF IFS, ICON, GFS, MET Nordic): they must agree too.
 * An hour is
 *   - rain «точно» when ≥ 80 % of all members give ≥ 0.1 mm and at least 2 of 3 models do; «возможно» from 30 % or when any model does;
 *   - sun «точно» (daytime only) when ≥ 80 % of members give cloud cover ≤ 30 % and no rain, and every model ≤ 40 %; «возможно» from 40 %.
 * The further ahead, the more the members disagree — so far days honestly get «возможно», not «точно».
 * Needs common.js and calendar.js. Tests: roadmap/core/test/weather.test.js.
 */
(function (root) {
"use strict";
const C = root.RoadmapCore;
if (!C || !C.occurrences) throw new Error("load roadmap/core/common.js and calendar.js before weather.js");

C.WX = { RAIN_MM: 0.1, SURE: 0.8, RAIN_MAYBE: 0.3, SUN_MAYBE: 0.4, CLEAR: 30, MODEL_CLEAR: 40, MIN_MEMBERS: 10 };

/* The series of one variable in an Open-Meteo hourly block, whatever the members and models are called:
 * `precipitation`, `precipitation_member01`, `precipitation_ecmwf_ifs025`, `precipitation_member07_icon_seamless`…
 * (spreads, means and other variables starting with the same word are left out). */
const OTHER = { precipitation: /^precipitation_probability/, cloud_cover: /^cloud_cover_(low|mid|high)/ };
C.wxSeries = (hourly, variable) => Object.keys(hourly || {})
  .filter(k => (k === variable || k.startsWith(variable + "_")) && !(OTHER[variable] && OTHER[variable].test(k)) && !/_(spread|mean)(_|$)/.test(k))
  .map(k => hourly[k]).filter(Array.isArray);

/* sources = { ensembles: [hourly block…], models: [{ name, hourly }…] } — hourly blocks with `time` (local "YYYY-MM-DDTHH:MM").
 * The first model is the reference for temperature, daytime and the weather code (best_match).
 * → { "YYYY-MM-DD": { hours: [{ h, rain: "sure"|"maybe"|"", sun: …, pRain, pSun, t }], tmin, tmax, members, models } } */
C.wxHours = sources => {
  const W = C.WX, days = {};
  const at = new Map();   // "YYYY-MM-DDTHH:MM" → { pr: [], cl: [], dpr: [], dcl: [], t, day, prob }
  const slot = time => { if (!at.has(time)) at.set(time, { pr: [], cl: [], dpr: [], dcl: [], t: null, day: null, prob: null }); return at.get(time); };
  let members = 0;
  (sources.ensembles || []).forEach(h => {
    const pr = C.wxSeries(h, "precipitation"), cl = C.wxSeries(h, "cloud_cover");
    members += pr.length;
    (h.time || []).forEach((time, i) => {
      const s = slot(time);
      pr.forEach(a => { if (a[i] != null) s.pr.push(+a[i]); });
      cl.forEach(a => { if (a[i] != null) s.cl.push(+a[i]); });
    });
  });
  const models = (sources.models || []).filter(m => m && m.hourly && m.hourly.time);
  models.forEach((m, k) => {
    const h = m.hourly, pr = h.precipitation, cl = h.cloud_cover;
    h.time.forEach((time, i) => {
      const s = slot(time);
      if (pr && pr[i] != null) s.dpr.push(+pr[i]);
      if (cl && cl[i] != null) s.dcl.push(+cl[i]);
      if (k === 0 || s.t == null) {
        if (h.temperature_2m && h.temperature_2m[i] != null) s.t = +h.temperature_2m[i];
        if (h.is_day && h.is_day[i] != null) s.day = !!+h.is_day[i];
        if (h.precipitation_probability && h.precipitation_probability[i] != null) s.prob = +h.precipitation_probability[i] / 100;
      }
    });
  });
  const share = (a, f) => (a.length ? a.filter(f).length / a.length : null);
  [...at.keys()].sort().forEach(time => {
    const s = at.get(time), date = time.slice(0, 10), hour = +time.slice(11, 13);
    const wet = v => v >= W.RAIN_MM;
    const ens = s.pr.length >= W.MIN_MEMBERS;
    const pRain = ens ? share(s.pr, wet) : s.prob != null ? s.prob : share(s.dpr, wet);
    const modelsWet = share(s.dpr, wet);
    let rain = "";
    if (pRain != null && pRain >= W.SURE && (s.dpr.length < 2 || modelsWet >= 2 / 3)) rain = "sure";
    else if ((pRain != null && pRain >= W.RAIN_MAYBE) || modelsWet > 0) rain = "maybe";
    const daytime = s.day != null ? s.day : hour >= 8 && hour < 18;
    // members: cloud ≤ 30 % and no rain in the same member (when both are there, member by member)
    const clear = [];
    if (s.cl.length >= W.MIN_MEMBERS) s.cl.forEach((c, i) => clear.push(c <= W.CLEAR && !(s.pr.length === s.cl.length && wet(s.pr[i]))));
    const pSun = clear.length ? share(clear, x => x) : share(s.dcl.map((c, i) => c <= W.CLEAR && !wet(s.dpr[i] || 0)), x => x);
    let sun = "";
    if (daytime && rain !== "sure" && pSun != null) {
      if (pSun >= W.SURE && s.dcl.every(c => c <= W.MODEL_CLEAR)) sun = "sure";
      else if (pSun >= W.SUN_MAYBE) sun = "maybe";
    }
    const d = days[date] || (days[date] = { hours: [], tmin: null, tmax: null });
    d.hours.push({ h: hour, rain, sun, pRain: pRain == null ? null : Math.round(pRain * 100) / 100, pSun: pSun == null ? null : Math.round(pSun * 100) / 100, t: s.t });
    if (s.t != null) { d.tmin = d.tmin == null ? s.t : Math.min(d.tmin, s.t); d.tmax = d.tmax == null ? s.t : Math.max(d.tmax, s.t); }
  });
  Object.values(days).forEach(d => { d.members = members; d.models = models.length; });
  return days;
};

/* hours → windows [from, to) of a state: [[14, 18], …]; «maybe» windows leave out the «sure» hours */
C.wxWindows = (hours, key, state) => {
  const out = [];
  hours.forEach(x => {
    if (x[key] !== state) return;
    const last = out[out.length - 1];
    if (last && last[1] === x.h) last[1] = x.h + 1; else out.push([x.h, x.h + 1]);
  });
  return out;
};
const snowy = (hours, w) => { const ts = hours.filter(x => x.h >= w[0] && x.h < w[1] && x.t != null).map(x => x.t); return ts.length && Math.max(...ts) <= 0.5; };

/* a day of C.wxHours → what the calendar shows:
 * { icon, tmin, tmax, rainSure, rainMaybe, sunSure, sunMaybe (windows), snow, text (Russian, one line), short (for the bot's week line) } */
C.wxDay = d => {
  if (!d || !d.hours.length) return null;
  const rainSure = C.wxWindows(d.hours, "rain", "sure"), rainMaybe = C.wxWindows(d.hours, "rain", "maybe");
  const sunSure = C.wxWindows(d.hours, "sun", "sure"), sunMaybe = C.wxWindows(d.hours, "sun", "maybe");
  const snow = [...rainSure, ...rainMaybe].length > 0 && [...rainSure, ...rainMaybe].every(w => snowy(d.hours, w));
  const sunHours = sunSure.reduce((n, w) => n + w[1] - w[0], 0);
  const icon = rainSure.length ? (snow ? "🌨" : "🌧") : rainMaybe.length ? (snow ? "🌨" : "🌦") : sunHours >= 3 ? "☀️" : sunSure.length || sunMaybe.length ? "⛅" : "☁️";
  const r = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(Math.round(n));
  const temp = d.tmin != null ? (Math.round(d.tmin) === Math.round(d.tmax) ? r(d.tmin) : `${r(d.tmin)}…${r(d.tmax)}`) : "";
  const span = ws => ws.map(([a, b]) => (b - a === 1 ? `${a}` : `${a}–${b}`)).join(", ");
  const what = snow ? "снег" : "дождь";
  const parts = [];
  if (rainSure.length) parts.push(`${what} точно ${span(rainSure)}`);
  if (rainMaybe.length) parts.push(`${rainSure.length ? "возможен" : what + " возможен"} ${span(rainMaybe)}`);
  if (sunSure.length) parts.push(`солнце точно ${span(sunSure)}`);
  else if (sunMaybe.length) parts.push(`солнце возможно ${span(sunMaybe)}`);
  if (!parts.length) parts.push("без осадков, пасмурно");
  const short = [rainSure.length ? `${snow ? "❄️" : "☔"}${span(rainSure)}` : "", !rainSure.length && sunSure.length ? `☀️${span(sunSure)}` : ""].filter(Boolean).join(" ");
  return { icon, tmin: d.tmin, tmax: d.tmax, temp, rainSure, rainMaybe, sunSure, sunMaybe, snow, text: `${icon} ${temp}${temp ? " · " : ""}${parts.join(" · ")}`,
    short: `${icon}${temp ? " " + temp : ""}${short ? " " + short : ""}`, members: d.members, models: d.models };
};

/* Where a day's weather is for: the place of an event that day (a trip), else home.
 * place: the event's `place`, or the town in «Поездка в Приозерск» / «поездка на Валаам» when the event has none. */
C.wxPlaceOf = e => {
  if (e.place) return String(e.place).trim();
  const m = /поездк\S*\s+(?:в|во|на)\s+(.+?)\s*$/i.exec(String(e.title || ""));
  return m ? m[1].replace(/[«»"]/g, "").trim() : "";
};
/* the places of the days from..to: { "YYYY-MM-DD": "Приозерск" } (a multi-day trip's every date; the first event wins) */
C.wxPlaces = (events, from, to) => {
  const out = {};
  C.occurrences(events, from, to).forEach(o => {
    const ev = events.find(e => e.id === o.id), place = ev ? C.wxPlaceOf(ev) : "";
    if (place && !out[o.date]) out[o.date] = place;
  });
  return out;
};
})(typeof globalThis !== "undefined" ? globalThis : this);
