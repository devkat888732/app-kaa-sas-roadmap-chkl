/* AI-generated (Claude) · 2026-10-20 · not reviewed by a human
 *
 * Roadmap core: ideas with project tags (roadmap/ideas/captured__ai.yaml, the master copy of ideas captured
 * on the page and in the Штаб bot) — read, write, validate, ids, edit operations; the project registry.
 * Needs common.js. Format, ids, folders: kaa-infra/projects/README.md.
 */
(function (root) {
"use strict";
const C = root.RoadmapCore;
if (!C || !C.clean) throw new Error("load roadmap/core/common.js before ideas.js");

C.IDEAS_SOURCE_PATH = "roadmap/ideas/captured__ai.yaml";
C.IDEAS_ALL_PATH = "roadmap/ideas/all-ideas__ai.yaml";
C.IDEAS_PROJECTS_PATH = "roadmap/ideas/projects__ai.yaml";
C.IDEA_FIELDS = ["id", "projects", "title", "description", "status", "links", "reporter", "source", "created", "updated"];
C.IDEA_STATUSES = ["new", "exploring", "planned", "parked", "rejected"];
C.IDEA_ACTIVE = ["new", "exploring"];
C.IDEA_ID_RE = /^([A-Z]{2,5})-I-(\d{3,})$/;
C.PROJECT_CODE_RE = /^[A-Z]{2,5}$/;
C.ideasHeadDefault = () => "# Ideas captured on the roadmap page — the master copy of these ideas (source: roadmap-page).\n# Written by the page (report button → Idea, the Ideas tab, the agent), by hand or by agents.\n# The sync job writes each idea to kaa-infra/projects/<PRIMARY>/ideas/<id>-<slug>.md. Format: kaa-infra/projects/README.md.\n# new_projects: project tags created on this page that the registry doesn't have yet (the sync adds them).\n# Comments in this header are kept when the page saves; comments further down are not.";

// values as strings, projects / links as lists
C.normIdea = x => ({ ...Object.fromEntries(Object.entries(x).map(([k, val]) => [k, Array.isArray(val) ? val.map(C.asText) : C.asText(val)])),
  projects: C.asList(x.projects), links: C.asList(x.links) });
// captured__ai.yaml → { ideas, newProjects }
C.parseIdeas = text => {
  const data = C.yaml().load(text, C.yamlOpts()) || {};
  return { ideas: (Array.isArray(data.ideas) ? data.ideas : []).filter(x => x && typeof x === "object").map(C.normIdea),
    newProjects: (Array.isArray(data.new_projects) ? data.new_projects : []).filter(p => p && p.code).map(p => ({ code: C.asText(p.code), name: C.asText(p.name) })) };
};
// all-ideas__ai.yaml (index of all projects, written by the sync) → ideas
C.parseAllIdeas = text => ((C.yaml().load(text, C.yamlOpts()) || {}).ideas || []).filter(x => x && typeof x === "object").map(C.normIdea);
// projects__ai.yaml (copy of kaa-infra's registry) → [{ code, name }]
C.parseRegistry = text => (((text && C.yaml().load(text, C.yamlOpts())) || {}).projects || [])
  .filter(p => p && p.code).map(p => ({ code: C.asText(p.code), name: C.asText(p.name) }));
// registry + tags made on the page, without repeats
C.mergeProjects = (registry, newProjects) => {
  const seen = new Set(), out = [];
  [...registry, ...newProjects].forEach(p => { if (p && p.code && !seen.has(p.code)) { seen.add(p.code); out.push({ code: p.code, name: p.name || p.code }); } });
  return out;
};
C.serializeIdeas = (ideas, newProjects, head) => {
  const body = C.yaml().dump({
    new_projects: newProjects.map(p => ({ code: p.code, name: p.name })),
    ideas: ideas.map(it => { const o = {}; C.IDEA_FIELDS.forEach(f => { const val = it[f]; if (Array.isArray(val) ? val.length || f === "projects" || f === "links" : C.asText(val) !== "") o[f] = val; }); return o; })
  }, C.dumpOpts({ flowLevel: 3 }));
  return head + "\n\n" + body;
};
// problems as English strings; registry = [{ code }] known projects
C.validateIdeas = (ideas, newProjects, registry) => {
  const errs = [], seen = new Set(), codes = new Set([...registry.map(p => p.code), ...newProjects.map(p => p.code)]);
  ideas.forEach(it => {
    const m = C.IDEA_ID_RE.exec(it.id || "");
    if (!m) errs.push(`${it.id || "?"}: bad id`);
    if (seen.has(it.id)) errs.push(`${it.id}: duplicate id`); seen.add(it.id);
    if (!it.projects.length) errs.push(`${it.id}: no project`);
    it.projects.forEach(c => { if (!codes.has(c)) errs.push(`${it.id}: unknown project ${c}`); });
    if (m && it.projects[0] !== m[1]) errs.push(`${it.id}: id must start with the first project`);
    if (!C.asText(it.title).trim()) errs.push(`${it.id}: no title`);
    if (C.asText(it.title).length > 100) errs.push(`${it.id}: title longer than 100 characters`);
    if (!C.IDEA_STATUSES.includes(it.status)) errs.push(`${it.id}: unknown status ${it.status}`);
  });
  newProjects.forEach(p => { if (!C.PROJECT_CODE_RE.test(p.code)) errs.push(`project code ${p.code}: 2–5 uppercase letters`); });
  return errs;
};
// next <PRIMARY>-I-NNN over this file's ideas and the other sources' ideas (the index of all ideas)
C.nextIdeaId = (primary, ideas, others = []) => C.nextNumber([...ideas, ...others].map(i => i.id), `${primary}-I-`);
/* Edit operations on state = { ideas, np } (np = new_projects), replayed on a newer file when it changed meanwhile:
 *   { type: "project", project: { code, name } }   { type: "add", item }   { type: "update", id, fields }
 * ctx = { registry, others } — known projects and the other sources' ideas (for free ids). */
C.applyIdeaOp = (state, op, ctx = {}) => {
  const registry = ctx.registry || [], others = ctx.others || [];
  if (op.type === "project") {
    if (!state.np.some(p => p.code === op.project.code) && !registry.some(p => p.code === op.project.code)) state.np.push({ ...op.project });
  } else if (op.type === "add") {
    if (state.ideas.some(i => i.id === op.item.id)) op.item.id = C.nextIdeaId(op.item.projects[0], state.ideas, others);
    state.ideas.push({ ...op.item, projects: [...op.item.projects], links: [...op.item.links] });
  } else if (op.type === "update") {
    const it = state.ideas.find(i => i.id === op.id);
    if (it) Object.assign(it, op.fields);
  }
};
C.describeIdeaOps = ops => [...new Set(ops.map(op => op.type === "project" ? `tag ${op.project.code} added` : op.type === "add" ? `${op.item.id} added`
  : op.fields.status ? `${op.id} → ${op.fields.status}` : `${op.id} edited`))].join(", ");
})(typeof globalThis !== "undefined" ? globalThis : this);
