/* AI-generated (Claude) · 2026-10-21 · not reviewed by a human
 *
 * Roadmap core: «🔥 На ревью в первую очередь» built on request (roadmap/review-focus__ai.yaml).
 *   1. gatherFocusCandidates — files of the open PRs and AI-made files on main of the given repositories, and the
 *      open PRs themselves, each with signals (size, age, PRs stacked on it, deploy / secrets / agent / data …);
 *   2. Kaa's settings: how many files and branches, filters (repositories, file types, only AI-made, a path part);
 *   3. a score from the signals ranks them (and is the answer when no model answers);
 *   4. a language model fills the places Kaa didn't set and judges the priorities she set (focusMessages /
 *      parseFocusAnswer): two variants — hers (her pins at their places) and the model's;
 *   5. the chosen variant is written to the file the banner and the bot show.
 * Used by the roadmap page and the Штаб bot. The only network is the `get(path)` the caller passes (GitHub API JSON).
 * Spec: roadmap/designs/review-focus__ai.md.
 */
(function (root) {
"use strict";
const C = root.RoadmapCore;
if (!C || !C.clean) throw new Error("load roadmap/core/common.js before focus.js");

C.FOCUS_PATH = "roadmap/review-focus__ai.yaml";
C.FOCUS_TYPES = ["doc", "code", "data", "config"];
C.focusHeadDefault = () => "# AI-generated (Claude) · 2026-10-21 · not reviewed by a human\n#\n# What Kaa reviews first: shown as a banner on the roadmap page and under «🔥 В первую очередь» in the Штаб bot (👀 Ревью).\n# Built with «🔄 Пересобрать» (her settings + a language model) or by hand; an empty list (or no file) hides the banner.\n#   files:    repo, path, branch (where the file is now), pr (optional), why\n#   branches: repo, branch, pr (number), why\n#   settings: what the list was built from (files, branches, filters, Kaa's own priorities)";

/* ---------- the file ---------- */
C.parseFocus = text => {
  const d = (text && C.yaml().load(text, C.yamlOpts())) || {};
  const list = x => (Array.isArray(x) ? x : []).filter(o => o && typeof o === "object").map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, C.asText(v)])));
  return { updated: C.asText(d.updated), files: list(d.files), branches: list(d.branches), settings: d.settings && typeof d.settings === "object" ? d.settings : null };
};
C.serializeFocus = (data, head) => {
  const num = v => /^\d+$/.test(String(v)) ? Number(v) : v;
  const body = {
    updated: data.updated || "",
    files: data.files.map(f => C.ordered(C.clean({ repo: f.repo, path: f.path, branch: f.branch, pr: f.pr ? num(f.pr) : "", why: f.why }), ["repo", "path", "branch", "pr", "why"])),
    branches: data.branches.map(b => C.ordered(C.clean({ repo: b.repo, branch: b.branch, pr: b.pr ? num(b.pr) : "", why: b.why }), ["repo", "branch", "pr", "why"]))
  };
  if (data.settings && Object.keys(C.clean(data.settings)).length) body.settings = C.clean(data.settings);
  return (head || C.focusHeadDefault()) + "\n\n" + C.yaml().dump(body, C.dumpOpts());
};

/* ---------- signals of a path ---------- */
C.focusType = path => {
  const p = String(path).toLowerCase(), name = p.split("/").pop();
  if (/^\.github\/|(^|\/)(wrangler\.toml|package(-lock)?\.json|\.npmrc|\.gitignore|tsconfig\.json)$/.test(p) || /\.(toml|ini|env)$/.test(name)) return "config";
  if (/\.(md|txt|rst)$/.test(name)) return "doc";
  if (/\.(ya?ml|json|csv|tsv)$/.test(name)) return "data";
  return "code";
};
const FLAG_RULES = [
  ["secrets", /account|token|secret|credential|password|keys?\b/i],
  ["deploy", /deploy|wrangler|\.github\/workflows|set-webhook|pages|publish/i],
  ["agent", /system-prompt|agent-instructions|(^|\/)agent[^/]*__ai|prompt|skill/i],
  ["design", /(^|\/)designs?\//i],
  ["data", /tasks__ai|feedback\/items|calendar\/events|ideas\/captured|review-focus/i]
];
C.focusFlags = path => FLAG_RULES.filter(([, re]) => re.test(path)).map(([f]) => f);
const SKIP = /(^|\/)(package-lock\.json|\.nojekyll|_site\/)|\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|map|min\.js)$/i;
const isAi = path => /__ai(\.|$)/.test(path);
const short = repo => String(repo).split("/").pop();
const days = (iso, now) => iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / 864e5)) : 0;

/* ---------- 1. candidates ---------- */
/* get(path) → GitHub API JSON (throws on errors); repos = ["owner/name", …]. Returns { files, branches, errors }.
 * Files: of every open PR (not removed ones) and AI-made files (…__ai.*) on main not touched by an open PR. */
C.gatherFocusCandidates = async (get, repos, { now = Date.now(), maxMainFiles = 40 } = {}) => {
  const files = [], branches = [], errors = [];
  await Promise.all(repos.map(async repo => {
    let pulls;
    try { pulls = await get(`/repos/${repo}/pulls?state=open&per_page=50`); }
    catch (e) { errors.push(`${short(repo)}: ${e && (e.status === 403 || e.status === 404) ? "нет доступа" : "ошибка " + ((e && e.status) || "")}`); return; }
    // how many open PRs stand on a branch, directly or through others
    const onTop = head => { let n = 0; const seen = new Set(); const walk = h => pulls.filter(p => p.base.ref === h && !seen.has(p.number)).forEach(p => { seen.add(p.number); n++; walk(p.head.ref); }); walk(head); return n; };
    const touched = new Set();
    await Promise.all(pulls.map(async p => {
      let list = [];
      try { list = await get(`/repos/${repo}/pulls/${p.number}/files?per_page=100`); } catch { errors.push(`${short(repo)} #${p.number}: файлы не прочитались`); }
      const stack = onTop(p.head.ref), age = days(p.created_at, now);
      branches.push({ kind: "branch", repo, branch: p.head.ref, pr: String(p.number), title: p.title || "", base: p.base.ref, draft: !!p.draft,
        files: list.length, additions: list.reduce((a, f) => a + (f.additions || 0), 0), deletions: list.reduce((a, f) => a + (f.deletions || 0), 0), age_days: age, stack });
      list.filter(f => f.status !== "removed" && !SKIP.test(f.filename)).forEach(f => {
        touched.add(f.filename);
        files.push({ kind: "file", repo, path: f.filename, branch: p.head.ref, pr: String(p.number), change: f.status === "added" ? "added" : "modified",
          additions: f.additions || 0, deletions: f.deletions || 0, ai: isAi(f.filename), type: C.focusType(f.filename), flags: C.focusFlags(f.filename), age_days: age, stack });
      });
    }));
    try {
      const tree = await get(`/repos/${repo}/git/trees/main?recursive=1`);
      (tree.tree || []).filter(t => t.type === "blob" && isAi(t.path) && !SKIP.test(t.path) && !touched.has(t.path)).slice(0, maxMainFiles).forEach(t => {
        files.push({ kind: "file", repo, path: t.path, branch: "main", pr: "", change: "main", additions: 0, deletions: 0, ai: true,
          type: C.focusType(t.path), flags: C.focusFlags(t.path), age_days: 0, stack: 0 });
      });
    } catch { errors.push(`${short(repo)}: main не прочитался`); }
  }));
  // the same file in several stacked PRs: keep the lowest PR (the one to review first)
  const seen = new Map();
  files.sort((a, b) => (Number(a.pr) || 1e9) - (Number(b.pr) || 1e9)).forEach(f => { const k = f.repo + ":" + f.path; if (!seen.has(k)) seen.set(k, f); });
  const out = { files: [...seen.values()], branches, errors };
  out.files.forEach(f => Object.assign(f, C.scoreFocus(f)));
  out.branches.forEach(b => Object.assign(b, C.scoreFocus(b)));
  out.files.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).forEach((f, i) => { f.id = "f" + (i + 1); });
  out.branches.sort((a, b) => b.score - a.score || a.branch.localeCompare(b.branch)).forEach((b, i) => { b.id = "b" + (i + 1); });
  return out;
};

/* ---------- 3. score (higher = earlier) with the reasons in words ---------- */
C.scoreFocus = c => {
  let s = 0; const why = [];
  const add = (n, text) => { s += n; if (text) why.push(text); };
  if (c.kind === "branch") {
    if (c.stack) add(3 * Math.min(c.stack, 5), `на ней стоят ещё ${c.stack} PR`);
    if (c.base === "main") add(2, "можно сливать в main");
    else add(0, `поверх ${c.base}`);
    if (c.age_days >= 2) add(Math.min(c.age_days, 6), `ждёт ${c.age_days} дн`);
    if (c.draft) add(-4, "черновик");
    if (c.files > 30) add(1, `большой: ${c.files} файлов`);
    return { score: s, reasons: why };
  }
  const F = new Set(c.flags || []);
  if (F.has("secrets")) add(4, "ключи и доступы");
  if (F.has("deploy")) add(3, "деплой");
  if (F.has("agent")) add(3, "инструкция для агента");
  if (F.has("design")) add(3, "решение по дизайну");
  if (F.has("data")) add(1, "данные");
  if (c.ai) add(2, "написан ИИ, не проверен");
  if (c.stack) add(Math.min(c.stack, 3), `в PR, на котором стоят ещё ${c.stack}`);
  if (c.change === "added") add(1, "новый файл");
  const size = (c.additions || 0) + (c.deletions || 0);
  if (size > 200) add(2, `${size} строк изменений`); else if (size > 50) add(1, null);
  if (c.age_days >= 3) add(1, `ждёт ${c.age_days} дн`);   // a file's age matters less than what it is
  if (c.change === "main") add(-1, "уже в main");
  if (/(^|\/)(test|tests|__tests__)\/|\.test\./.test(c.path)) add(-3, "тест");
  if (/(^|\/)README|LICENSE/i.test(c.path)) add(-1, null);
  return { score: s, reasons: why };
};

/* ---------- 2. Kaa's settings ---------- */
C.focusDefaults = () => ({ files: 5, branches: 2, repos: [], types: [], ai_only: false, path: "", pins: "" });
C.focusFilter = (cands, st) => {
  const s = { ...C.focusDefaults(), ...st };
  const repoOk = r => !s.repos.length || s.repos.includes(short(r));
  return {
    files: cands.files.filter(f => repoOk(f.repo) && (!s.types.length || s.types.includes(f.type)) && (!s.ai_only || f.ai)
      && (!s.path || f.path.toLowerCase().includes(String(s.path).toLowerCase()))),
    branches: cands.branches.filter(b => repoOk(b.repo))
  };
};
C.focusSettingsText = st => {
  const s = { ...C.focusDefaults(), ...st }, TYPE = { doc: "документы", code: "код", data: "данные", config: "настройки" };
  return [`${s.files} ${s.files === 1 ? "файл" : s.files < 5 && s.files ? "файла" : "файлов"} и ${s.branches} ${s.branches === 1 ? "ветка" : s.branches < 5 && s.branches ? "ветки" : "веток"}`,
    s.repos.length ? "репозитории: " + s.repos.join(", ") : "все репозитории",
    s.types.length ? "типы: " + s.types.map(t => TYPE[t] || t).join(", ") : "",
    s.ai_only ? "только написанные ИИ" : "", s.path ? `путь содержит «${s.path}»` : ""].filter(Boolean).join(" · ");
};

/* ---------- 4. the model ---------- */
C.FOCUS_SYSTEM = [
  "You help Kaa decide what to review first in her repositories. You get CANDIDATES (files and open pull requests / branches,",
  "with signals and a score computed from them), her SETTINGS (how many files and branches she wants) and her own PRIORITIES",
  "as free text in Russian (may be empty). Answer with ONE JSON object only:",
  '{"summary": "<1–2 sentences in Russian: the main idea of the order>",',
  '"files": [{"id": "<candidate id f…>", "why": "<one short Russian sentence: why this file now>"}],',
  '"branches": [{"id": "<candidate id b…>", "why": "<one short Russian sentence>"}],',
  '"pins": [{"id": "<f… or b…>", "rank": <the place Kaa wants, 1-based, within files or within branches>, "verdict": "agree" | "move",',
  '"suggested_rank": <a place you suggest, or null>, "why": "<one short Russian sentence: why you agree or what you suggest>"}],',
  '"questions": ["<a question in Russian if her priorities are unclear>"]}.',
  "Rules: `files` and `branches` are YOUR best order with exactly the number she asked for (fewer only if there are no more",
  "candidates); use only ids from CANDIDATES. Rank by risk and by what unblocks other work: keys / access, deploy, agent",
  "instructions and design decisions waiting for her come first; a branch other PRs stand on comes before them; tests and",
  "small edits come later. The score is a hint, not the answer. PRIORITIES: find every file or branch she mentions",
  "(by name, path part or meaning) and the place she gives it («первым» = 1, «третьим» = 3, «в конце» = the last place,",
  "«обязательно» without a place = she wants it in the list, rank 0). Judge each: agree, or move with a suggested place and",
  "a reason. If she mentions something not in CANDIDATES, say so in questions. Never invent ids. Write `why` for her: concrete,",
  "about this file or branch, not generic."
].join(" ");
C.focusSchema = () => {
  const item = { type: "object", additionalProperties: false, required: ["id", "why"], properties: { id: { type: "string" }, why: { type: "string" } } };
  return { type: "object", additionalProperties: false, required: ["summary", "files", "branches", "pins", "questions"], properties: {
    summary: { type: "string" }, files: { type: "array", items: item }, branches: { type: "array", items: item },
    pins: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "rank", "verdict", "suggested_rank", "why"], properties: {
      id: { type: "string" }, rank: { type: "integer" }, verdict: { type: "string", enum: ["agree", "move"] }, suggested_rank: { type: ["integer", "null"] }, why: { type: "string" } } } },
    questions: { type: "array", items: { type: "string" } } } };
};
// the user message: settings, priorities and the best candidates (compact)
C.focusUserMessage = (cands, st, { maxFiles = 40, maxBranches = 15 } = {}) => {
  const s = { ...C.focusDefaults(), ...st }, f = C.focusFilter(cands, s);
  const files = f.files.slice(0, maxFiles).map(x => ({ id: x.id, repo: short(x.repo), path: x.path, where: x.change === "main" ? "main" : `PR #${x.pr} ${x.branch}`,
    type: x.type, flags: x.flags, ai_made: x.ai, lines_changed: x.additions + x.deletions, days_waiting: x.age_days, prs_on_top: x.stack, score: x.score }));
  const branches = f.branches.slice(0, maxBranches).map(x => ({ id: x.id, repo: short(x.repo), branch: x.branch, pr: Number(x.pr), title: x.title, base: x.base,
    draft: x.draft, files: x.files, lines_changed: x.additions + x.deletions, days_waiting: x.age_days, prs_on_top: x.stack, score: x.score }));
  return "SETTINGS:\n" + JSON.stringify({ files: s.files, branches: s.branches }) + "\n\nPRIORITIES:\n" + (String(s.pins || "").trim() || "(none)")
    + "\n\nCANDIDATES:\n" + JSON.stringify({ files, branches });
};
/* the answer → { summary, questions, model: { files, branches }, pins } — only known ids, no repeats, filled up to the
 * asked number from the score order; throws { kind: "format" } when it isn't JSON at all */
C.parseFocusAnswer = (content, cands, st) => {
  const s = { ...C.focusDefaults(), ...st }, f = C.focusFilter(cands, s);
  const text = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let d;
  try { const a = text.indexOf("{"), b = text.lastIndexOf("}"); d = JSON.parse(a >= 0 ? text.slice(a, b + 1) : text); }
  catch { throw Object.assign(new Error("format"), { kind: "format" }); }
  if (!d || typeof d !== "object") throw Object.assign(new Error("format"), { kind: "format" });
  const pick = (list, pool, n) => {
    const byId = new Map(pool.map(c => [c.id, c])), out = [], seen = new Set();
    (Array.isArray(list) ? list : []).forEach(x => { const c = x && byId.get(String(x.id)); if (c && !seen.has(c.id) && out.length < n) { seen.add(c.id); out.push({ id: c.id, why: String(x.why || "").trim() || c.reasons.join(", ") }); } });
    pool.forEach(c => { if (out.length < n && !seen.has(c.id)) { seen.add(c.id); out.push({ id: c.id, why: c.reasons.join(", ") || "по сигналам", filled: true }); } });
    return out;
  };
  const all = new Map([...cands.files, ...cands.branches].map(c => [c.id, c]));
  const pins = (Array.isArray(d.pins) ? d.pins : []).filter(p => p && all.has(String(p.id))).map(p => ({
    id: String(p.id), kind: all.get(String(p.id)).kind, rank: Math.max(0, parseInt(p.rank, 10) || 0), verdict: p.verdict === "move" ? "move" : "agree",
    suggested_rank: p.suggested_rank == null ? null : Math.max(1, parseInt(p.suggested_rank, 10) || 1), why: String(p.why || "").trim() }));
  return { summary: String(d.summary || ""), questions: (Array.isArray(d.questions) ? d.questions : []).map(String).filter(Boolean),
    model: { files: pick(d.files, f.files, s.files), branches: pick(d.branches, f.branches, s.branches) }, pins };
};
// without a model: the score order
C.focusByScore = (cands, st) => {
  const s = { ...C.focusDefaults(), ...st }, f = C.focusFilter(cands, s);
  const take = (pool, n) => pool.slice(0, n).map(c => ({ id: c.id, why: c.reasons.join(", ") || "по сигналам" }));
  return { summary: "", questions: [], model: { files: take(f.files, s.files), branches: take(f.branches, s.branches) }, pins: [] };
};
/* Kaa's variant: her pins at the places she gave (rank 0 = «in the list», keeps the model's place or goes last),
 * the other places in the model's order. Same lengths as the model's lists. */
C.focusUserOrder = (ans, cands) => {
  const all = new Map([...cands.files, ...cands.branches].map(c => [c.id, c]));
  const build = (kind, list) => {
    const n = list.length, pins = ans.pins.filter(p => p.kind === kind);
    if (!pins.length) return list.slice();
    const slots = new Array(n).fill(null), used = new Set();
    const whyOf = id => (list.find(x => x.id === id) || {}).why || (all.get(id) ? all.get(id).reasons.join(", ") : "");
    pins.filter(p => p.rank > 0).sort((a, b) => a.rank - b.rank).forEach(p => {
      let i = Math.min(p.rank, n) - 1;
      while (i < n && slots[i]) i++;
      if (i >= n) { i = slots.lastIndexOf(null); if (i < 0) return; }
      slots[i] = { id: p.id, why: whyOf(p.id), pinned: true }; used.add(p.id);
    });
    pins.filter(p => p.rank === 0 && !used.has(p.id)).forEach(p => {
      const at = list.findIndex(x => x.id === p.id);
      let i = at >= 0 && !slots[at] ? at : slots.lastIndexOf(null);
      if (i < 0) i = n - 1;
      slots[i] = { id: p.id, why: whyOf(p.id), pinned: true }; used.add(p.id);
    });
    const rest = list.filter(x => !used.has(x.id));
    return slots.map(x => x || rest.shift()).filter(Boolean);
  };
  return { files: build("file", ans.model.files), branches: build("branch", ans.model.branches) };
};
// an order → the file's data
C.focusFromOrder = (order, cands, st, today) => {
  const all = new Map([...cands.files, ...cands.branches].map(c => [c.id, c]));
  const s = { ...C.focusDefaults(), ...st };
  return {
    updated: today,
    files: order.files.map(x => { const c = all.get(x.id); return { repo: c.repo, path: c.path, branch: c.branch, pr: c.pr || "", why: x.why }; }),
    branches: order.branches.map(x => { const c = all.get(x.id); return { repo: c.repo, branch: c.branch, pr: c.pr, why: x.why }; }),
    settings: C.clean({ files: s.files, branches: s.branches, repos: s.repos, types: s.types, ai_only: s.ai_only || "", path: s.path, priorities: String(s.pins || "").trim() })
  };
};
// the label of a candidate for lists: "kaa-hq-bot/DEPLOY__ai.md (main)" / "kaa-hq-bot · hq-calendar · PR #9"
C.focusLabel = c => c.kind === "branch" ? `${short(c.repo)} · ${c.branch} · PR #${c.pr}` : `${short(c.repo)}/${c.path}${c.branch !== "main" ? ` (${c.branch})` : ""}`;
})(typeof globalThis !== "undefined" ? globalThis : this);
