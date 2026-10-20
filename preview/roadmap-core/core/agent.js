/* AI-generated (Claude) · 2026-10-20 · not reviewed by a human
 *
 * Roadmap core: the intake agent's contract — answer schema, the context sent to the model, reading the answer,
 * checking proposals against the roadmap, and turning accepted proposals into edit operations of the tasks file.
 * Used by the roadmap page (app/agent.js) and the Штаб bot. Prompt: roadmap/agent/system-prompt__ai.md.
 * Needs common.js and tasks.js.
 */
(function (root) {
"use strict";
const C = root.RoadmapCore;
if (!C || !C.applyTaskOp) throw new Error("load roadmap/core/common.js and tasks.js before agent.js");

C.AGENT_PROMPT_PATH = "roadmap/agent/system-prompt__ai.md";
C.AGENT_JOURNAL_PATH = "roadmap/agent/inbox__ai.yaml";
C.AGENT_JOURNAL_HEAD = "# AI-generated (Claude) · 2026-10-15 · not reviewed by a human\n#\n# Journal of the roadmap intake agent: what Kaa wrote, what the agent proposed, what she applied.\n# Written by the roadmap page when proposals are applied. Used to build evals (roadmap/agent/evals__ai.yaml).";
C.AGENT_OPS = ["add_task", "update_task", "add_milestone", "update_milestone", "set_goal", "add_feedback", "add_idea"];
C.AGENT_FIELDS = ["ref", "task_id", "milestone_id", "title", "area", "status", "owner", "priority", "due", "notes", "description", "feedback_type", "projects"];
C.agentSchema = () => {
  const nullable = { type: ["string", "null"] };
  return {
    type: "object", additionalProperties: false, required: ["summary", "questions", "operations"],
    properties: {
      summary: { type: "string" },
      questions: { type: "array", items: { type: "string" } },
      operations: { type: "array", items: {
        type: "object", additionalProperties: false, required: ["op", "reason", ...C.AGENT_FIELDS],
        properties: { op: { type: "string", enum: C.AGENT_OPS }, reason: { type: "string" }, ...Object.fromEntries(C.AGENT_FIELDS.map(f => [f, nullable])) }
      } }
    }
  };
};
// the prompt file without its leading <!-- … --> marking comment
C.agentPromptText = text => String(text || "").replace(/^<!--[\s\S]*?-->\s*/, "");

/* CONTEXT of the user message. data = parsed tasks file; x = { today, weekday, lang ("ru" | "en"), project,
 * statusOf(task) (the page's effective status), openFeedback, openIdeas, projects } */
C.agentContext = (data, x) => {
  const statusOf = x.statusOf || (t => t.status);
  const ms = data.milestones.map(m => {
    const ts = data.tasks.filter(t => t.milestone === m.id);
    return { id: m.id, title: m.title, due: m.due || null, description: m.description || null, tasks_total: ts.length, tasks_done: ts.filter(t => statusOf(t) === "done").length };
  });
  return {
    today: x.today, weekday: x.weekday, language_of_user: x.lang === "en" ? "English" : "Russian",
    project: x.project || "SASMP",
    goal: data.goal && data.goal.title ? data.goal : null,
    milestones: ms,
    tasks: data.tasks.map(t => ({ id: t.id, title: t.title, milestone: t.milestone || null, area: t.area, status: statusOf(t), owner: t.owner, priority: t.priority || "normal", due: t.due || null })),
    open_feedback: x.openFeedback || [],
    open_ideas: x.openIdeas || [],
    projects: x.projects || [],
    allowed: { area: C.AREAS, status: C.TASK_STATUSES, owner: C.OWNERS, priority: C.PRIORITIES, feedback_type: ["bug", "update"] }
  };
};
C.agentUserMessage = (context, text) => "CONTEXT:\n" + JSON.stringify(context) + "\n\nMESSAGE:\n" + text;

// the model's answer → { summary, questions, operations } with every field a string or null; throws { kind: "format" }
C.parseAgentAnswer = content => {
  const text = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  const data = JSON.parse(start >= 0 ? text.slice(start, end + 1) : text);
  if (!data || typeof data !== "object" || !Array.isArray(data.operations)) throw Object.assign(new Error("format"), { kind: "format" });
  data.summary = String(data.summary || "");
  data.questions = Array.isArray(data.questions) ? data.questions.map(String).filter(Boolean) : [];
  data.operations = data.operations.filter(o => o && C.AGENT_OPS.includes(o.op)).map(o => {
    const op = { op: o.op, reason: String(o.reason || "") };
    C.AGENT_FIELDS.forEach(f => { op[f] = o[f] == null || o[f] === "" ? null : String(o[f]).trim(); });
    return op;
  });
  return data;
};

C.agentTags = op => String(op.projects || "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
/* what's wrong with a proposal, as { key, args } (page keys "ag.inv.*"); ops = all proposals of the answer
 * (a task may point at a milestone proposed in the same answer by its ref); projects = [{ code }] for idea tags */
C.agentProblems = (op, ops, data, projects) => {
  const out = [], e = (key, ...args) => out.push({ key, args });
  const msIds = new Set(data.milestones.map(m => m.id)), refs = new Set(ops.filter(o => o.op === "add_milestone" && o.ref).map(o => o.ref));
  const allowed = { area: C.AREAS, status: C.TASK_STATUSES, owner: C.OWNERS, priority: C.PRIORITIES };
  Object.entries(allowed).forEach(([f, ok]) => { if (op[f] && !ok.includes(op[f])) e("ag.inv.field", f, op[f]); });
  if (op.due && !/^\d{4}-\d{2}-\d{2}$/.test(op.due)) e("ag.inv.date", op.due);
  const msOk = id => !id || msIds.has(id) || refs.has(id);
  if (op.op === "add_task") {
    if (!op.title) e("ag.inv.title");
    if (!op.area) e("ag.inv.field", "area", "—");
    if (!msOk(op.milestone_id)) e("ag.inv.ms", op.milestone_id);
  } else if (op.op === "update_task") {
    if (!data.tasks.some(t => t.id === op.task_id)) e("ag.inv.task", op.task_id || "?");
    if (!["title", "milestone_id", "area", "status", "owner", "priority", "due", "notes"].some(f => op[f])) e("ag.inv.nothing");
    if (!msOk(op.milestone_id)) e("ag.inv.ms", op.milestone_id);
  } else if (op.op === "add_milestone") {
    if (!op.title) e("ag.inv.title");
  } else if (op.op === "update_milestone") {
    if (!msIds.has(op.milestone_id)) e("ag.inv.ms", op.milestone_id || "?");
    if (!["title", "due", "description"].some(f => op[f])) e("ag.inv.nothing");
  } else if (op.op === "set_goal") {
    if (!op.title) e("ag.inv.title");
  } else if (op.op === "add_feedback") {
    if (!["bug", "update"].includes(op.feedback_type)) e("ag.inv.type");
    if (!op.title) e("ag.inv.title");
  } else if (op.op === "add_idea") {
    const codes = new Set((projects || []).map(p => p.code)), tags = C.agentTags(op);
    if (!op.title) e("ag.inv.title");
    if (!tags.length) e("ag.inv.noTags");
    tags.filter(c => !codes.has(c)).forEach(c => e("ag.inv.tag", c));
  }
  return out;
};

/* Accepted proposals → edit operations of the tasks file, applied to data as they go (so ids follow each other).
 * Covers add_milestone, add_task, update_task, update_milestone, set_goal; ideas and bugs / updates go to their own
 * files (the caller handles them). Returns { ops, results } — results[i] = the id each proposal got / changed. */
C.agentTaskOps = (proposals, data, today) => {
  const ops = [], results = [], refMap = {};
  const run = op => { C.applyTaskOp(data, op); ops.push(op); };
  const msTarget = id => id && refMap[id] ? refMap[id] : id;
  proposals.forEach((op, i) => {   // milestones first, so tasks can point at them
    if (op.op !== "add_milestone") return;
    const id = "m" + (Math.max(0, ...data.milestones.map(m => parseInt(String(m.id).slice(1), 10) || 0)) + 1);
    if (op.ref) refMap[op.ref] = id;
    run({ type: "add-ms", ms: C.clean({ id, title: op.title, due: op.due || "", description: op.description || "" }) });
    results[i] = id;
  });
  proposals.forEach((op, i) => {
    if (op.op === "add_task") {
      const id = C.nextTaskId(data), status = op.status || "todo";
      run({ type: "add-task", task: C.clean({ id, title: op.title, milestone: msTarget(op.milestone_id) || "", area: op.area, status, owner: op.owner || "kaa",
        priority: op.priority && op.priority !== "normal" ? op.priority : "", created: today, due: op.due || "", done: status === "done" ? today : "", notes: op.notes || "", links: [] }) });
      results[i] = id;
    } else if (op.op === "update_task") {
      const fields = {};
      ["title", "area", "status", "owner", "priority", "due", "notes"].forEach(f => { if (op[f]) fields[f] = op[f]; });
      if (op.milestone_id) fields.milestone = msTarget(op.milestone_id);
      if (fields.priority === "normal") fields.priority = "";
      if (fields.status) fields.done = fields.status === "done" ? today : "";
      run({ type: "task", id: op.task_id, fields });
      results[i] = op.task_id;
    } else if (op.op === "update_milestone") {
      const fields = {};
      ["title", "due", "description"].forEach(f => { if (op[f]) fields[f] = op[f]; });
      run({ type: "ms", id: op.milestone_id, fields });
      results[i] = op.milestone_id;
    } else if (op.op === "set_goal") {
      run({ type: "goal", goal: { title: op.title, due: op.due || "", description: op.description || "" } });
      results[i] = "goal";
    }
  });
  return { ops, results };
};

// one journal record; channel: "page" or "telegram"
C.agentJournalRecord = ({ at, model, text, summary, proposed, applied, channel }) =>
  ({ at, model: model || "", text, summary, proposed, applied, ...(channel ? { channel } : {}) });
C.appendJournal = (fileText, record) => {
  const head = fileText ? C.splitHeader(fileText)[0] || C.AGENT_JOURNAL_HEAD : C.AGENT_JOURNAL_HEAD;
  const data = fileText ? (C.yaml().load(fileText, C.yamlOpts()) || {}) : {};
  const entries = Array.isArray(data.entries) ? data.entries : [];
  entries.push(record);
  return head + "\n\n" + C.yaml().dump({ entries }, C.dumpOpts());
};
})(typeof globalThis !== "undefined" ? globalThis : this);
