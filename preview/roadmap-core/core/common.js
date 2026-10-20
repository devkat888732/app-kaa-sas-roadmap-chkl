/* AI-generated (Claude) · 2026-10-20 · not reviewed by a human
 *
 * Roadmap core — pure logic shared by the roadmap page and the Штаб bot (kaa-hq-bot), decision T4 of
 * kaa-infra/projects/HQ/stages/roadmap-module. No DOM, no network, no i18n: callers do those.
 *
 * Plain scripts, no modules: each file adds functions to globalThis.RoadmapCore. The page loads them with
 * <script src="core/…">; the bot imports them for their side effect (a copy lives in kaa-hq-bot/src/core/).
 * YAML: js-yaml 4.1.0 as globalThis.jsyaml, CORE_SCHEMA (dates stay strings).
 * Files: common.js (helpers) · tasks.js · feedback.js · ideas.js · agent.js. Tests: roadmap/core/test/.
 */
(function (root) {
"use strict";
const C = root.RoadmapCore = root.RoadmapCore || {};

C.yaml = () => {
  if (!root.jsyaml) throw new Error("js-yaml (globalThis.jsyaml) is not loaded");
  return root.jsyaml;
};
C.yamlOpts = () => ({ schema: C.yaml().CORE_SCHEMA });
C.dumpOpts = extra => ({ ...C.yamlOpts(), lineWidth: -1, noRefs: true, ...extra });

C.asText = x => x == null ? "" : String(x);
C.asList = x => Array.isArray(x) ? x.map(C.asText).filter(Boolean)
  : C.asText(x) ? C.asText(x).split(",").map(s => s.trim()).filter(Boolean) : [];

// drop empty values ("" / null / [] ) so the YAML stays short
C.clean = obj => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v == null || (Array.isArray(v) && !v.length)) continue;
    out[k] = v;
  }
  return out;
};
// keys in the given order first, then any others in their own order
C.ordered = (obj, order) => {
  const o = {};
  order.forEach(k => { if (k in obj) o[k] = obj[k]; });
  Object.keys(obj).forEach(k => { if (!(k in o)) o[k] = obj[k]; });
  return o;
};
// [leading comment block, rest]; the header is kept when a file is saved
C.splitHeader = text => {
  const lines = String(text).split("\n"); let i = 0;
  while (i < lines.length && (lines[i].startsWith("#") || lines[i].trim() === "")) i++;
  return [lines.slice(0, i).join("\n").replace(/\s+$/, ""), lines.slice(i).join("\n")];
};
// "YYYY-MM-DD" in the local time of the caller (page: the browser; bot: pass a Date shifted to Moscow if needed)
C.today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// "YYYY-MM-DD HH:MM" in Moscow time — timestamps of bugs / updates and ideas
C.nowMsk = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit",
  day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
// next "<prefix>NNN" over the given ids
C.nextNumber = (ids, prefix) => {
  const n = Math.max(0, ...ids.map(C.asText).filter(id => id.startsWith(prefix)).map(id => parseInt(id.slice(prefix.length), 10) || 0)) + 1;
  return prefix + String(n).padStart(3, "0");
};
})(typeof globalThis !== "undefined" ? globalThis : this);
