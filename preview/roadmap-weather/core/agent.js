/* AI-generated (Claude) · 2026-10-20 · not reviewed by a human
 *
 * Roadmap core: the intake agent's contract — answer schema, the context sent to the model, reading the answer,
 * checking proposals against the roadmap, and turning accepted proposals into edit operations of the tasks file.
 * Used by the roadmap page (app/agent.js) and the Штаб bot. Prompt: roadmap/agent/system-prompt__ai.md.
 * Needs common.js and tasks.js (and calendar.js for events).
 */
(function (root) {
"use strict";
const C = root.RoadmapCore;
if (!C || !C.applyTaskOp) throw new Error("load roadmap/core/common.js and tasks.js before agent.js");

C.AGENT_PROMPT_PATH = "roadmap/agent/system-prompt__ai.md";
C.AGENT_JOURNAL_PATH = "roadmap/agent/inbox__ai.yaml";
C.AGENT_JOURNAL_HEAD = "# AI-generated (Claude) · 2026-10-15 · not reviewed by a human\n#\n# Journal of the roadmap intake agent: what Kaa wrote, what the agent proposed, what she applied.\n# Written by the roadmap page when proposals are applied. Used to build evals (roadmap/agent/evals__ai.yaml).";
C.AGENT_OPS = ["add_task", "update_task", "add_milestone", "update_milestone", "set_goal", "add_feedback", "add_idea", "add_project", "add_event", "update_event", "skip_event", "remove_event",
  "make_wallpaper", "show_view"];
C.AGENT_EVENT_OPS = ["add_event", "update_event", "skip_event", "remove_event"];
/* requests, not changes: the Штаб bot does them at once (a wallpaper from her data; a screen of the bot); the page can't */
C.AGENT_BOT_OPS = ["make_wallpaper", "show_view"];
C.WALLPAPER_VIEWS = ["tasks", "ideas", "roadmap", "calendar", "last"];
C.SHOW_VIEWS = ["week", "events", "tasks", "ideas", "status", "review", "history", "walls"];
C.AGENT_FIELDS = ["ref", "task_id", "milestone_id", "title", "area", "status", "owner", "priority", "due", "notes", "description", "feedback_type", "projects",
  "event_id", "time", "minutes", "repeat", "dates", "starts", "ends", "place", "category", "component", "view"];
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
 * statusOf(task) (the page's effective status), openFeedback, openIdeas, projects, events (calendar, parsed) } */
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
    events: (x.events || []).map(e => ({ id: e.id, title: e.title, time: e.time || null, minutes: e.minutes || null, repeat: C.repeatOf ? C.repeatOf(e) || null : null,
      dates: e.dates.length ? e.dates.join(",") : null, starts: e.from || null, ends: e.until || null, place: e.place || null, category: C.categoryOf(e, x.categories || null), skipped: e.except.length ? e.except.join(",") : null })),
    event_categories: C.eventCategories ? C.eventCategories(x.events || [], x.categories || null) : [],
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
 * (a task may point at a milestone proposed in the same answer by its ref); projects = [{ code }] for idea tags;
 * events = the calendar (parsed), for event proposals */
C.agentProblems = (op, ops, data, projects, events = []) => {
  const out = [], e = (key, ...args) => out.push({ key, args });
  const msIds = new Set(data.milestones.map(m => m.id)), refs = new Set(ops.filter(o => o.op === "add_milestone" && o.ref).map(o => o.ref));
  const allowed = { area: C.AREAS, status: C.TASK_STATUSES, owner: C.OWNERS, priority: C.PRIORITIES };
  Object.entries(allowed).forEach(([f, ok]) => { if (op[f] && !ok.includes(op[f])) e("ag.inv.field", f, op[f]); });
  if (op.due && !/^\d{4}-\d{2}-\d{2}$/.test(op.due)) e("ag.inv.date", op.due);
  if (C.AGENT_EVENT_OPS.includes(op.op)) { C.agentEventProblems(op, a => e(...a), events); return out; }
  if (op.op === "make_wallpaper" && op.view && !C.WALLPAPER_VIEWS.includes(op.view)) e("ag.inv.field", "view", op.view);
  if (op.op === "show_view" && !C.SHOW_VIEWS.includes(op.view)) e("ag.inv.field", "view", op.view || "—");
  if (op.op === "show_view" && op.view === "events") {   // the period: dates, the end not before the start
    [op.starts, op.ends].forEach(d => { if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) e("ag.inv.date", d); });
    if (op.starts && op.ends && op.ends < op.starts) e("ag.inv.date", `${op.starts} … ${op.ends}`);
  }
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
    if (op.component && !C.FEEDBACK_COMPONENTS.includes(op.component)) e("ag.inv.field", "component", op.component);
    if (!op.title) e("ag.inv.title");
  } else if (op.op === "add_project") {
    // a new project tag for ideas: projects = its code (2–5 capital Latin letters), title = its name
    const code = String(op.projects || "").trim().toUpperCase();
    if (!C.PROJECT_CODE_RE.test(code)) e("ag.inv.code", op.projects || "—");
    else if ((projects || []).some(p => p.code === code)) e("ag.inv.codeTaken", code);
    if (!op.title) e("ag.inv.title");
  } else if (op.op === "add_idea") {
    // known projects and the ones proposed in the same answer
    const codes = new Set([...(projects || []).map(p => p.code), ...ops.filter(o => o.op === "add_project" && o.projects).map(o => String(o.projects).trim().toUpperCase())]);
    const tags = C.agentTags(op);
    if (!op.title) e("ag.inv.title");
    if (!tags.length) e("ag.inv.noTags");
    tags.filter(c => !codes.has(c)).forEach(c => e("ag.inv.tag", c));
  }
  return out;
};

/* calendar proposals: report([key, ...args]) for each problem; events = the calendar (parsed) */
C.agentEventProblems = (op, report, events = []) => {
  const e = (key, ...args) => report([key, ...args]);
  const dates = C.asList(op.dates);
  if (op.time && !C.isTime(op.time)) e("ag.inv.time", op.time);
  if (op.minutes && !/^\d+$/.test(op.minutes)) e("ag.inv.minutes", op.minutes);
  dates.forEach(d => { if (!C.isDate(d)) e("ag.inv.date", d); });
  [op.starts, op.ends].forEach(d => { if (d && !C.isDate(d)) e("ag.inv.date", d); });
  if (op.repeat && !C.parseRepeat(op.repeat)) e("ag.inv.repeat", op.repeat);
  if (op.starts && op.ends && op.ends < op.starts) e("ag.inv.ends");
  if (op.category && String(op.category).length > C.MAX_CATEGORY) e("ag.inv.field", "category", op.category);
  const known = () => events.some(x => x.id === op.event_id);
  if (op.op === "add_event") {
    if (!op.title) e("ag.inv.title");
    if (!op.repeat && !dates.length) e("ag.inv.when");
  } else if (op.op === "update_event") {
    if (!known()) e("ag.inv.event", op.event_id || "?");
    if (!["title", "time", "minutes", "repeat", "dates", "starts", "ends", "place", "category", "notes"].some(f => op[f])) e("ag.inv.nothing");
  } else if (op.op === "skip_event") {
    if (!known()) e("ag.inv.event", op.event_id || "?");
    if (!dates.length) e("ag.inv.when");
  } else if (op.op === "remove_event") {
    if (!known()) e("ag.inv.event", op.event_id || "?");
  }
};
/* Accepted calendar proposals → edit operations of the calendar file, applied to events as they go.
 * Returns { ops, results } like agentTaskOps; results[i] = the event id. */
C.agentEventOps = (proposals, events, today) => {
  const ops = [], results = [];
  const run = op => { C.applyEventOp(events, op); ops.push(op); };
  const ruleOf = op => {
    if (!op.repeat) return null;
    if (/^none$/i.test(op.repeat)) return { every: "", interval: "", days: [], month_day: "" };
    return C.parseRepeat(op.repeat);
  };
  // the same event proposed again (a clarification answered before the first proposals were applied): same title and
  // the same repeat or dates → it changes that event instead of adding a twin
  const twin = (op, rule) => events.find(e => String(e.title).trim().toLowerCase() === String(op.title || "").trim().toLowerCase()
    && (e.every || "") === (rule.every || "") && String(+e.interval || 1) === String(+rule.interval || 1)
    && [...e.days].sort().join() === [...(rule.days || [])].sort().join() && (e.month_day || "") === (rule.month_day || "")
    && (rule.every ? true : [...e.dates].sort().join() === C.asList(op.dates).sort().join()));
  proposals.forEach((op, i) => {
    if (op.op === "add_event" && twin(op, ruleOf(op) || {})) {
      const e = twin(op, ruleOf(op) || {}), fields = {};
      ["time", "minutes", "place", "category", "notes"].forEach(f => { if (op[f]) fields[f] = op[f]; });
      if (op.starts) fields.from = op.starts;
      if (op.ends) fields.until = op.ends;
      run({ type: "update", id: e.id, fields });
      results[i] = e.id;
    } else if (op.op === "add_event") {
      const id = C.nextEventId(events), rule = ruleOf(op) || {};
      run({ type: "add", item: C.clean({ id, title: op.title, time: op.time || "", minutes: op.minutes || "", ...rule, dates: C.asList(op.dates),
        from: rule.every ? op.starts || today : op.starts || "", until: op.ends || "", place: op.place || "", category: op.category || "", notes: op.notes || "", created: today }) });
      results[i] = id;
    } else if (op.op === "update_event") {
      const fields = {}, rule = ruleOf(op);
      ["title", "time", "minutes", "place", "category", "notes"].forEach(f => { if (op[f]) fields[f] = op[f]; });
      if (op.dates) fields.dates = C.asList(op.dates);
      if (op.starts) fields.from = op.starts;
      if (op.ends) fields.until = op.ends;
      if (rule) { Object.assign(fields, rule); const ev = events.find(x => x.id === op.event_id); if (rule.every && !fields.from && !(ev && ev.from)) fields.from = today; }
      run({ type: "update", id: op.event_id, fields });
      results[i] = op.event_id;
    } else if (op.op === "skip_event") {
      run({ type: "skip", id: op.event_id, dates: C.asList(op.dates) });
      results[i] = op.event_id;
    } else if (op.op === "remove_event") {
      run({ type: "remove", id: op.event_id });
      results[i] = op.event_id;
    }
  });
  return { ops, results };
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
