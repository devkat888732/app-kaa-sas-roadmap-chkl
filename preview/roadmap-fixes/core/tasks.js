/* AI-generated (Claude) · 2026-10-20 · not reviewed by a human
 *
 * Roadmap core: the tasks file (roadmap/tasks__ai.yaml) — read, write, validate, ids, edit operations.
 * Needs common.js. Field reference: the header of roadmap/tasks__ai.yaml.
 */
(function (root) {
"use strict";
const C = root.RoadmapCore;
if (!C || !C.clean) throw new Error("load roadmap/core/common.js before tasks.js");

C.TASKS_PATH = "roadmap/tasks__ai.yaml";
C.TASK_STATUSES = ["todo", "doing", "review", "done", "blocked"];
C.AREAS = ["macros", "blog", "infra", "docs", "research"];
C.OWNERS = ["kaa", "ai"];
C.PRIORITIES = ["high", "normal", "low"];
C.TASK_ORDER = ["id", "title", "milestone", "area", "status", "owner", "priority", "created", "due", "done", "links", "notes", "done_when"];
C.MS_ORDER = ["id", "title", "due", "description"];
C.GOAL_ORDER = ["title", "due", "description"];
C.TASK_ID_RE = /^T-\d{3,}$/;

// text → { head, data } with milestones / tasks / links always present
C.parseTasks = text => {
  const [head] = C.splitHeader(text);
  const data = C.yaml().load(text, C.yamlOpts()) || {};
  data.milestones = data.milestones || []; data.tasks = data.tasks || [];
  data.tasks.forEach(t => { t.links = t.links || []; });
  return { head, data };
};
C.serializeTasks = (data, head) => {
  const goal = data.goal && typeof data.goal === "object" ? C.clean(data.goal) : null;
  const body = C.yaml().dump({
    ...(goal && goal.title ? { goal: C.ordered(goal, C.GOAL_ORDER) } : {}),
    milestones: data.milestones.map(m => C.ordered(C.clean(m), C.MS_ORDER)),
    tasks: data.tasks.map(t => C.ordered(C.clean(t), C.TASK_ORDER))
  }, C.dumpOpts({ flowLevel: 3 }));
  return (head ? head + "\n\n" : "") + body;
};
// problems as { key, args } — the caller turns them into text (page: T(key, ...args), keys "v.*")
C.validateTasks = data => {
  const errs = [], ms = new Set(), ids = new Set(), e = (key, ...args) => errs.push({ key, args });
  if (data.goal && typeof data.goal === "object" && Object.keys(C.clean(data.goal)).length && !String(data.goal.title || "").trim()) e("v.goal");
  data.milestones.forEach(m => { if (!m.id || !m.title) e("v.msNoId"); if (ms.has(m.id)) e("v.dupMs", m.id); ms.add(m.id); });
  data.tasks.forEach(t => {
    if (!C.TASK_ID_RE.test(t.id || "")) e("v.badId", t.id);
    if (ids.has(t.id)) e("v.dupTask", t.id); ids.add(t.id);
    if (!t.title || !String(t.title).trim()) e("v.empty", t.id);
    if (!C.TASK_STATUSES.includes(t.status)) e("v.status", t.id);
    if (!C.AREAS.includes(t.area)) e("v.area", t.id);
    if (!C.OWNERS.includes(t.owner)) e("v.owner", t.id);
    if (t.priority && !C.PRIORITIES.includes(t.priority)) e("v.priority", t.id);
    if (t.milestone && !ms.has(t.milestone)) e("v.milestone", t.id, t.milestone);
  });
  return errs;
};
C.nextTaskId = data => {
  const n = Math.max(0, ...data.tasks.map(t => parseInt(String(t.id).slice(2), 10) || 0)) + 1;
  return "T-" + String(n).padStart(3, "0");
};
/* Edit operations. They are kept until saved and replayed on a newer file when someone else committed meanwhile.
 *   { type: "task", id, fields }        { type: "add-task", task }     { type: "delete-task", id }
 *   { type: "ms", id, fields }          { type: "add-ms", ms }         { type: "goal", goal }
 * add-task takes the next free id if its id got taken (and writes the new id back into the op). */
C.applyTaskOp = (data, op) => {
  if (op.type === "task") {
    const t = data.tasks.find(x => x.id === op.id);
    if (t) Object.assign(t, op.fields);
  } else if (op.type === "add-task") {
    if (data.tasks.some(x => x.id === op.task.id)) op.task.id = C.nextTaskId(data);
    data.tasks.push(structuredClone(op.task));
  } else if (op.type === "delete-task") {
    data.tasks = data.tasks.filter(x => x.id !== op.id);
  } else if (op.type === "ms") {
    const m = data.milestones.find(x => x.id === op.id);
    if (m) Object.assign(m, op.fields);
  } else if (op.type === "add-ms") {
    if (!data.milestones.some(x => x.id === op.ms.id)) data.milestones.push(structuredClone(op.ms));
  } else if (op.type === "goal") {
    const g = C.clean(op.goal);
    if (g.title) data.goal = g; else delete data.goal;
  }
};
// short commit-message summary of the ops ("T-012 → done, T-020 added")
C.describeTaskOps = ops => {
  const parts = [];
  ops.forEach(op => {
    if (op.type === "task") parts.push(op.fields.status ? `${op.id} → ${op.fields.status}` : `${op.id} edited`);
    else if (op.type === "add-task") parts.push(`${op.task.id} added`);
    else if (op.type === "delete-task") parts.push(`${op.id} deleted`);
    else if (op.type === "ms") parts.push(`${op.id} edited`);
    else if (op.type === "add-ms") parts.push(`${op.ms.id} added`);
    else if (op.type === "goal") parts.push("goal edited");
  });
  return [...new Set(parts)].join(", ");
};
})(typeof globalThis !== "undefined" ? globalThis : this);
