/* AI-generated (Claude) · 2026-10-20 · not reviewed by a human
 *
 * Roadmap core: bugs and updates of one project (roadmap/feedback/items-<PROJECT>__ai.yaml) — read, write,
 * validate, ids, edit operations. Needs common.js. Format: kaa-infra/feedback/README.md.
 */
(function (root) {
"use strict";
const C = root.RoadmapCore;
if (!C || !C.clean) throw new Error("load roadmap/core/common.js before feedback.js");

C.FEEDBACK_FIELDS = ["id", "project", "type", "status", "priority", "title", "description", "location", "anchor", "selector",
  "page", "branch", "build", "viewport", "theme", "lang", "user_agent", "reporter", "created", "updated",
  "closed", "resolution", "work_branch", "pr", "task"];
C.FEEDBACK_REQUIRED = ["id", "project", "type", "status", "priority", "title", "description", "location", "anchor", "page",
  "branch", "build", "viewport", "theme", "lang", "user_agent", "reporter", "created", "updated"];
C.FEEDBACK_STATUSES = ["new", "accepted", "in-progress", "in-review", "done", "rejected", "duplicate"];
C.FEEDBACK_CLOSED = ["done", "rejected", "duplicate"];
C.FEEDBACK_ENUMS = { type: ["bug", "update"], status: C.FEEDBACK_STATUSES, priority: ["high", "normal", "low"], lang: ["en", "ru"] };
C.FEEDBACK_ID_RE = /^([A-Z]{2,5})-([BU])-(\d{3,})$/;

C.feedbackPath = project => `roadmap/feedback/items-${project}__ai.yaml`;
C.feedbackHeadDefault = project => `# Bugs and updates of project ${project} — the master copy of these items.\n# Written by the roadmap page (report button, Feedback tab), by hand or by agents.\n# Field reference, ids, statuses, CSV: kaa-infra/feedback/README.md. Widget: roadmap/FEEDBACK__ai.md.\n# Comments in this header are kept when the page saves; comments further down are not.`;

// text → items, every value a string
C.parseFeedback = text => {
  const data = C.yaml().load(text, C.yamlOpts()) || {};
  return (Array.isArray(data.items) ? data.items : []).filter(x => x && typeof x === "object")
    .map(x => Object.fromEntries(Object.entries(x).map(([k, val]) => [k, C.asText(val)])));
};
C.serializeFeedback = (items, head) => {
  const body = C.yaml().dump({ items: items.map(it => {
    const o = {};
    C.FEEDBACK_FIELDS.forEach(f => { if (C.asText(it[f]) !== "") o[f] = C.asText(it[f]); });
    return o;
  }) }, C.dumpOpts());
  return head + "\n\n" + body;
};
// problems as English strings (they go into "Not saved: …" messages and logs as they are)
C.validateFeedback = (items, project) => {
  const errs = [], seen = new Set();
  items.forEach(it => {
    const m = C.FEEDBACK_ID_RE.exec(it.id || "");
    if (!m) errs.push(`${it.id || "?"}: bad id`);
    if (seen.has(it.id)) errs.push(`${it.id}: duplicate id`); seen.add(it.id);
    C.FEEDBACK_REQUIRED.forEach(f => { if (!C.asText(it[f]).trim()) errs.push(`${it.id}: ${f} is empty`); });
    Object.entries(C.FEEDBACK_ENUMS).forEach(([f, ok]) => { if (it[f] && !ok.includes(it[f])) errs.push(`${it.id}: unknown ${f} ${it[f]}`); });
    if (it.project !== project) errs.push(`${it.id}: project must be ${project}`);
    if (m && (m[1] !== project || m[2] !== (it.type === "bug" ? "B" : "U"))) errs.push(`${it.id}: id doesn't match project or type`);
    if (C.asText(it.title).length > 100) errs.push(`${it.id}: title longer than 100 characters`);
  });
  return errs;
};
C.nextFeedbackId = (items, project, type) => C.nextNumber(items.map(i => i.id), `${project}-${type === "bug" ? "B" : "U"}-`);
/* Edit operations, replayed on a newer file when it changed meanwhile:
 *   { type: "add", item }   { type: "update", id, fields }
 * add takes the next free id of its project and type if its id got taken (and writes it back into the op). */
C.applyFeedbackOp = (items, op) => {
  if (op.type === "add") {
    if (items.some(i => i.id === op.item.id)) op.item.id = C.nextFeedbackId(items, op.item.project, op.item.type);
    items.push({ ...op.item });
  } else if (op.type === "update") {
    const it = items.find(i => i.id === op.id);
    if (it) Object.assign(it, op.fields);
  }
};
C.describeFeedbackOps = ops => [...new Set(ops.map(op => op.type === "add" ? `${op.item.id} added (${op.item.type})`
  : op.fields.status ? `${op.id} → ${op.fields.status}` : `${op.id} edited`))].join(", ");
})(typeof globalThis !== "undefined" ? globalThis : this);
