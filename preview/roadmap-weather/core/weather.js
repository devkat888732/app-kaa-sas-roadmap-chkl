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
 *   - rain «точно» when, in its 3-hour window, ≥ 80 % of all members give ≥ 0.1 mm and at least 2 of 3 models do (the members
 *     disagree on the exact hour rain starts, not on whether it comes within those hours); «возможно» from 30 % in the hour or when any model;
 *   - sun «точно» (between sunrise and sunset) when ≥ 80 % of members give cloud cover ≤ 30 % and no rain, and every model ≤ 40 %; «возможно» from 40 %.
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

/* sources = { ensembles: [hourly block…], models: [{ name, hourly, daily? }…] } — hourly blocks with `time` (local "YYYY-MM-DDTHH:MM").
 * The first model is the reference for temperature, daylight (its `daily.sunrise / sunset`, else `is_day`) and the probability.
 * Rain «точно» is judged on 3-hour windows (00–03, 03–06, …): the members rarely agree on the very hour a rain starts, but they
 * do agree that it rains within those 3 hours — a member counts when it rains in any hour of the window. The window's hours then
 * shown are the ones the rain is likely in (≥ 30 %), or the whole window.
 * → { "YYYY-MM-DD": { hours: [{ h, rain: "sure"|"maybe"|"", sun: …, pRain, pSun, t }], tmin, tmax, members, models } } */
C.wxHours = sources => {
  const W = C.WX, days = {}, wet = v => v != null && v >= W.RAIN_MM;
  const times = new Set();
  // members: { pr: Map(time → mm), cl: Map(time → %) }, aligned member by member
  const members = [];
  (sources.ensembles || []).forEach(h => {
    const pr = C.wxSeries(h, "precipitation"), cl = C.wxSeries(h, "cloud_cover");
    pr.forEach((a, j) => {
      const m = { pr: new Map(), cl: new Map() };
      (h.time || []).forEach((time, i) => { times.add(time); if (a[i] != null) m.pr.set(time, +a[i]); if (cl[j] && cl[j][i] != null) m.cl.set(time, +cl[j][i]); });
      members.push(m);
    });
  });
  const models = (sources.models || []).filter(m => m && m.hourly && m.hourly.time).map(m => {
    const h = m.hourly, o = { pr: new Map(), cl: new Map(), t: new Map(), day: new Map(), prob: new Map() };
    h.time.forEach((time, i) => {
      times.add(time);
      const put = (map, arr, f = Number) => { if (arr && arr[i] != null) map.set(time, f(arr[i])); };
      put(o.pr, h.precipitation); put(o.cl, h.cloud_cover); put(o.t, h.temperature_2m); put(o.day, h.is_day, v => !!+v);
      put(o.prob, h.precipitation_probability, v => +v / 100);
    });
    return o;
  });
  const ref = models[0] || null;
  // daylight from the reference model's sunrise / sunset ("YYYY-MM-DDTHH:MM"), as fractional hours
  const light = {};
  const daily = ((sources.models || [])[0] || {}).daily;
  if (daily && daily.time) daily.time.forEach((d, i) => {
    const hrs = s => (s ? +s.slice(11, 13) + +s.slice(14, 16) / 60 : null);
    if (daily.sunrise && daily.sunset) light[d] = [hrs(daily.sunrise[i]), hrs(daily.sunset[i])];
  });
  const share = (a, f) => (a.length ? a.filter(f).length / a.length : null);
  const sorted = [...times].sort();
  const hourOf = new Map(sorted.map(time => [time, {}]));
  sorted.forEach(time => {
    const date = time.slice(0, 10), hour = +time.slice(11, 13), x = hourOf.get(time);
    const mpr = members.map(m => m.pr.get(time)).filter(v => v != null);
    const dpr = models.map(m => m.pr.get(time)).filter(v => v != null), dcl = models.map(m => m.cl.get(time)).filter(v => v != null);
    const prob = ref ? ref.prob.get(time) : null;
    x.pRain = mpr.length >= W.MIN_MEMBERS ? share(mpr, wet) : prob != null ? prob : share(dpr, wet);
    x.modelsWet = share(dpr, wet);
    x.rain = (x.pRain != null && x.pRain >= W.RAIN_MAYBE) || x.modelsWet > 0 ? "maybe" : "";
    const lt = light[date];
    x.daytime = lt && lt[0] != null ? hour + 0.5 > lt[0] && hour + 0.5 < lt[1] : ref && ref.day.has(time) ? ref.day.get(time) : hour >= 8 && hour < 17;
    // sun: members with cloud ≤ 30 % and no rain in that hour (member by member)
    const clear = members.filter(m => m.cl.has(time)).map(m => m.cl.get(time) <= W.CLEAR && !wet(m.pr.get(time)));
    x.pSun = clear.length >= W.MIN_MEMBERS ? share(clear, v => v) : share(models.filter(m => m.cl.has(time)).map(m => m.cl.get(time) <= W.CLEAR && !wet(m.pr.get(time))), v => v);
    x.sunModelsOk = dcl.every(c => c <= W.MODEL_CLEAR);
    x.t = ref && ref.t.has(time) ? ref.t.get(time) : null;
    x.date = date; x.h = hour;
  });
  // rain «точно» by 3-hour windows
  const byDate = {};
  sorted.forEach(time => { const x = hourOf.get(time); (byDate[x.date] = byDate[x.date] || []).push([time, x]); });
  Object.values(byDate).forEach(list => {
    for (let b = 0; b < 24; b += 3) {
      const win = list.filter(([, x]) => x.h >= b && x.h < b + 3);
      if (!win.length) continue;
      const ts = win.map(([t]) => t);
      const memb = members.filter(m => ts.some(t => m.pr.has(t))).map(m => ts.some(t => wet(m.pr.get(t))));
      const mods = models.filter(m => ts.some(t => m.pr.has(t))).map(m => ts.some(t => wet(m.pr.get(t))));
      const pWin = memb.length >= W.MIN_MEMBERS ? share(memb, v => v) : share(win.map(([, x]) => x.pRain != null && x.pRain >= W.SURE), v => v) > 0 ? 1 : 0;
      const modelsOk = mods.length < 2 || share(mods, v => v) >= 2 / 3;
      if (pWin >= W.SURE && modelsOk) {
        const likely = win.filter(([, x]) => x.pRain != null && x.pRain >= W.RAIN_MAYBE);
        (likely.length ? likely : win).forEach(([, x]) => { x.rain = "sure"; });
      }
    }
  });
  sorted.forEach(time => {
    const x = hourOf.get(time);
    let sun = "";
    if (x.daytime && x.rain !== "sure" && x.pSun != null) {
      if (x.pSun >= W.SURE && x.sunModelsOk) sun = "sure";
      else if (x.pSun >= W.SUN_MAYBE) sun = "maybe";
    }
    const d = days[x.date] || (days[x.date] = { hours: [], tmin: null, tmax: null });
    d.hours.push({ h: x.h, rain: x.rain, sun, pRain: x.pRain == null ? null : Math.round(x.pRain * 100) / 100, pSun: x.pSun == null ? null : Math.round(x.pSun * 100) / 100, t: x.t });
    if (x.t != null) { d.tmin = d.tmin == null ? x.t : Math.min(d.tmin, x.t); d.tmax = d.tmax == null ? x.t : Math.max(d.tmax, x.t); }
  });
  Object.values(days).forEach(d => { d.members = members.length; d.models = models.length; });
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
