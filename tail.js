
// Links to the other master docs. Not content: these are the spine's own links.
const DOCS = [
  ["Helix Domains & Workflows (master doc)", "https://claude.ai/artifact/52bJejmTcBnvzPnxngdHhz"],
  ["Helix Decisions Log", "https://claude.ai/artifact/XTj571E3pwSU9DcnZqaZ9g"],
  ["Helix Human-in-the-Loop Map", "https://claude.ai/artifact/KjKEj197fg2aZTV8A3rQaZ"],
  ["Helix Record Retention Table", "https://claude.ai/artifact/5u9zcu9DuuwrxhVL3RdX8i"]
];

// Content of the Human-in-the-Loop Map and the Record Retention Table (master Claude Docs, linked in DOCS). Mirrored here November 4, 2026; the Docs stay the master copies.

const STAGES = [
  { id: "shared", name: "Shared", sc: "var(--muted)", ids: ["foundational-data", "integration-hub"] },
  { id: "setup", name: "Set up", sc: "var(--amber)", ids: ["client-contracts", "jobs", "talent", "job-pricing"] },
  { id: "match", name: "Match & submit", sc: "var(--coral)", ids: ["matching", "fulfillment"] },
  { id: "place", name: "Place", sc: "var(--violet)", ids: ["employment-agreements", "compliance", "mobilization"] },
  { id: "work", name: "Work", sc: "var(--aqua)", ids: ["work-support", "finance"] }
];
const slug = s => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const RESERVED = new Set(["settings","sidebar","customize","upgrade","downloads"]);
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const tq = s => esc(s).replace(/(^|[\s(])"/g, "$1\u201c").replace(/"/g, "\u201d").replace(/'/g, "\u2019");
// Inline markdown the Doc uses: **bold** and bare URLs. Everything else is text.
const md = s => tq(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
// Block markdown for the How-to-read section: paragraphs, "- " lists, "| |" tables.
function mdBlocks(text) {
  const out = []; const lines = text.split("\n"); let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("- ")) { const items = []; while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2)); out.push(`<ul>${items.map(x => `<li>${md(x)}</li>`).join("")}</ul>`); continue; }
    if (l.startsWith("|")) { const rows = []; while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]); const cells = r => r.trim().replace(/^\||\|$/g, "").split(" | ").map(c => c.trim());
      const head = cells(rows[0]); const body = rows.slice(2).map(cells);
      out.push(`<div class="tblwrap"><table><thead><tr>${head.map(c => `<th>${md(c)}</th>`).join("")}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !lines[i].startsWith("- ") && !lines[i].startsWith("|")) para.push(lines[i++]);
    out.push(`<p>${md(para.join(" "))}</p>`);
  }
  return out.join("");
}

const DOMAINS = DOC.domains.slice().sort((a,b)=>({Platform:0,Foundation:1}[a.kind]??2)-({Platform:0,Foundation:1}[b.kind]??2));
const WF = []; DOMAINS.forEach(d => d.workflows.forEach(w => { w.slug = slug(w.name); w.domain = d; WF.push(w); }));
const RECORDS = DOC.rules.records, RULES = DOC.rules.rules;
const VIEWS = { domains: 1, records: 1, rules: 1, humans: 1, retention: 1, open: 1, about: 1 };
let state = { view: "domains", domain: DOMAINS[0].id, wf: null, q: "", event: null };
const layerTag = d => { const m = /Layer (\d+)/.exec(d.layer); return m ? "L" + m[1] : "PL"; };
const plus = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const EVENTS = new Set(); WF.forEach(w => w.emits.forEach(e => EVENTS.add(e)));

function renderHero() {
  document.getElementById("eyebrow").textContent = `Helix is Aya \u00b7 Last updated ${DOC.byline.split(" \u00b7 ")[0]}`;
  document.getElementById("stats").innerHTML =
    `<span class="nums"><span><b>${DOMAINS.length}</b>domains</span><span><b>${WF.length}</b>workflows</span><span><b>${RECORDS.length}</b>records</span><span><b>${EVENTS.size}</b>named events</span><span><b>${HITL.points.filter(p => p[1] && !/^None expected/.test(p[1])).length}</b>human points</span></span>`;
  document.getElementById("flow").innerHTML = STAGES.map(s => `<div class="stg ${s.id}" style="--sc:${s.sc}"><h2>${esc(s.name)}</h2>${
    s.ids.map(id => { const d = DOMAINS.find(x => x.id === id); if (!d) return "";
      const on = state.view === "domains" && state.domain === d.id && !state.q;
      return `<button class="fd d" style="--h:${d.hue}" data-dom="${d.id}" aria-pressed="${on}"><i></i><span>${tq(d.name)}</span><small>${d.workflows.length}</small></button>`; }).join("")}</div>`).join("");
}

function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ""));
  state.event = null;
  if (!h || RESERVED.has(h)) { state.view = "domains"; state.domain = DOMAINS[0].id; state.wf = null; }
  else if (VIEWS[h] && h !== "domains") { state.view = h; }
  else if (DOMAINS.some(d => d.id === h)) { state.view = "domains"; state.domain = h; state.wf = null; }
  else { const w = WF.find(w => w.slug === h); if (w) { state.view = "domains"; state.domain = w.domain.id; state.wf = w.slug; } }
  render();
}
function go(h) { if (location.hash !== "#" + h) location.hash = h; else render(); }

function renderSpine() {
  const el = document.getElementById("spine"); let html = ""; let lastGrp = null;
  DOMAINS.forEach(d => {
    const grp = d.kind ? "Shared by every domain" : "In flow order";
    if (grp !== lastGrp) { html += `<div class="grp">${grp}</div>`; lastGrp = grp; }
    const on = state.view === "domains" && state.domain === d.id && !state.q;
    const li = w => `<li><a href="#${w.slug}" aria-current="${on && state.wf===w.slug}">${tq(w.name)}</a></li>`;
    let inner = "";
    if (d.parts) d.parts.forEach(pt => { const ws = d.workflows.filter(w => w.part === pt.name); inner += `<div class="part">${tq(pt.name)}</div>` + (ws.length ? `<ul>${ws.map(li).join("")}</ul>` : `<div class="none">no workflow yet</div>`); });
    else inner = `<ul>${d.workflows.map(li).join("")}</ul>`;
    html += `<div class="dom d" style="--h:${d.hue}" data-on="${on}"><a class="dn" href="#${d.id}"><span class="num">${layerTag(d)}</span>${tq(d.name)}</a>${inner}</div>`;
  });
  el.innerHTML = html;
}

function wfHtml(w, open) {
  const d = w.domain;
  return `<section class="wf d" style="--h:${d.hue}" id="wf-${w.slug}" ${open ? "open" : ""}>
  <button class="hd" aria-expanded="${open}" data-wf="${w.slug}"><h2>${tq(w.name)}</h2><span class="n">${esc(d.name)}</span><span class="tog" aria-hidden="true">${plus}</span></button>
  <div class="bd">
    ${w.added ? `<p class="added">${md(w.added)}</p>` : ""}
    <p class="decision">${md(w.decision)}</p>
    <dl class="grid">
      ${w.types.length ? `<dt>Employment types</dt><dd><div class="types">${w.types.map(t => `<span class="tt" title="${t==='IRP'?'Per Diem × client-employed; not a sixth employment type':''}">${esc(t==='IRP'?'IRP (Per Diem × client-employed)':t)}</span>`).join("")}</div><ul class="typenotes">${w.typeNotes.map(s => `<li>${md(s)}</li>`).join("")}</ul></dd>` : ""}
      <dt>Turns on when</dt><dd>${md(w.triggers)}</dd>
      <dt>Tasks</dt><dd><ul>${w.tasks.map(t => `<li>${md(t)}</li>`).join("")}</ul></dd>
      <dt>Emits</dt><dd>${w.emits.map(e => `<span class="ev" role="button" tabindex="0" data-ev="${esc(e)}">${tq(e)}</span>`).join("")}${w.emitsNote ? `<span class="note">${md(w.emitsNote)}</span>` : ""}</dd>
      <dt>Measure</dt><dd>${md(w.measure)}</dd>
      ${(hp => hp.length ? `<dt>Human points</dt><dd><ul class="hpts">${hp.map(p => `<li>${md(p[1])} ${reasonChips(p[2])}<span class="note">${md(p[3])}</span></li>`).join("")}</ul></dd>` : "")(humanPointsFor(w))}
    </dl>
    ${w.edges ? `<div class="edges"><b>Edge cases.</b> ${md(w.edges)}</div>` : ""}
  </div></section>`;
}

function listeners(ev) {
  const base = ev.replace(/\s*\(.*\)$/, "");
  return WF.filter(w => w.triggers.includes(base) || w.tasks.some(t => t.includes(base))).filter(w => !w.emits.includes(ev));
}

function renderDomains() {
  const d = DOMAINS.find(x => x.id === state.domain);
  const stage = STAGES.find(s => s.ids.includes(d.id));
  let html = `<div class="d" style="--h:${d.hue}"><div class="dhead">
  <p class="eyebrow"><b>${esc(d.kind || "Business")} domain</b><span>${esc(d.layer)}</span>${stage ? `<span>${esc(stage.name)}</span>` : ""}</p>
  <h1>${tq(d.name)}</h1>
  <div class="prose lead">${mdBlocks(d.intro)}</div>
  <div class="meta"><span class="tag c">${esc(d.type)}</span><span class="tag">${d.workflows.length} workflow${d.workflows.length>1?"s":""}</span><span class="tag">${d.workflows.reduce((n,w)=>n+w.emits.length,0)} events emitted</span></div></div>`;
  if (state.event) {
    const ls = listeners(state.event);
    html += `<div class="evpanel"><button data-close>Close</button><b>${tq(state.event)}</b><p>${ls.length ? "Listened for by: " + ls.map(w => `<a href="#${w.slug}">${tq(w.name)}</a>`).join(", ") : "No workflow names this event in its triggers or tasks. Either it has no listener yet or a listener uses a different name; flag it rather than inventing one."}</p></div>`;
  }
  if (d.parts) d.parts.forEach(pt => {
    html += `<h2 class="parth">${tq(pt.name)}</h2>` + (pt.blurb ? `<div class="prose lead">${mdBlocks(pt.blurb)}</div>` : "");
    const ws = d.workflows.filter(w => w.part === pt.name);
    if (!ws.length) html += `<div class="empty">No workflow in the inventory yet. The record and its governance are owned here; a workflow gets written when something needs to change the record on an event.</div>`;
    ws.forEach(w => { html += wfHtml(w, state.wf === w.slug); });
  });
  else d.workflows.forEach(w => { html += wfHtml(w, state.wf === w.slug); });
  return html + `</div>`;
}

function ownerChip(owner) {
  const d = DOMAINS.find(d => owner.startsWith(d.name) || (d.id==="job-pricing" && owner.startsWith("Pricing")) || (d.id==="foundational-data" && owner.startsWith("Foundational")));
  return d ? `<span class="own d" style="--h:${d.hue}">${tq(owner)}</span>` : tq(owner);
}
function splitSentences(t) { return t.split(/(?<=[.!?])\s+(?=[A-Z"(\u201c])/).map(x => x.trim()).filter(Boolean); }
function stateList(sent) {
  const body = sent.replace(/^[^:]{0,80}:\s*/, "").replace(/\.$/, "");
  const parts = body.split(/,\s+/).map(x => x.trim()).filter(Boolean);
  if (parts.length < 3 || parts.length > 14) return null;
  const ok = parts.every(p => /^[A-Z]/.test(p.replace(/^\(/, "")) && p.replace(/\s*\(.*?\)\s*/g, " ").trim().split(/\s+/).length <= 5);
  return ok ? parts : null;
}
function recordCard(r, idx) {
  const sents = splitSentences(r[2]);
  const dom = DOMAINS.find(d => r[1].startsWith(d.name) || (d.id==="job-pricing" && r[1].startsWith("Pricing")) || (d.id==="foundational-data" && r[1].startsWith("Foundational")));
  let states = null, si = -1;
  for (let i = 0; i < Math.min(sents.length, 3); i++) { const st = stateList(sents[i]); if (st) { states = st; si = i; break; } }
  const rest = sents.filter((_, i) => i !== si);
  const summary = rest.shift() || "";
  return `<section class="rec${dom ? " d" : ""}" data-i="${idx % 4}"${dom ? ` style="--h:${dom.hue}"` : ""}><div class="rechd"><h2>${md(r[0])}</h2>${ownerChip(r[1])}</div>
    ${states ? `<div class="states">${states.map(s => `<span class="st">${md(s)}</span>`).join("")}</div>` : ""}
    ${summary ? `<p class="recsum">${md(summary)}</p>` : ""}
    ${rest.length ? `<details class="recmore"><summary>Details <span>${rest.length} ${rest.length === 1 ? "note" : "notes"}</span></summary><ul>${rest.map(x => `<li>${md(x)}</li>`).join("")}</ul></details>` : ""}</section>`;
}
function renderRecords() {
  return `<div class="dhead"><p class="eyebrow"><b>Records</b><span>${RECORDS.length} record types</span></p><h1>Shared record state machines</h1><p class="lead">${md(DOC.rules.recordsLede)}</p></div>
  <div class="recs">${RECORDS.map((r, i) => recordCard(r, i)).join("")}</div>`;
}
function renderRules() {
  return `<div class="dhead"><p class="eyebrow"><b>Rules</b><span>${RULES.length} rules, every workflow</span></p><h1>Rules that apply to every workflow</h1><p class="lead">${md(DOC.rules.lede)}</p></div>
  <ol class="rules">${RULES.map(r => `<li><div><b>${md(r[0])}</b>${md(r[1])}</div></li>`).join("")}</ol>`;
}
function renderOpen() {
  const o = DOC.open; const groups = o.groups.slice().reverse();
  return `<div class="open"><div class="dhead"><p class="eyebrow"><b>Open items</b><span>${groups.find(g=>!g.done)?.items.length ?? 0} open</span></p><h1>Still open</h1><p class="lead">${md(o.lede)}</p></div>
  ${groups.map(g => `<h2>${esc(g.title)}</h2><ul>${g.items.map(x => `<li class="${g.done ? "done" : ""}">${md(x)}</li>`).join("")}</ul>`).join("")}
  ${o.footer ? `<p class="lead" style="margin-top:26px;font-size:14.5px">${md(o.footer)}</p>` : ""}</div>`;
}
function renderAbout() {
  return `<div class="dhead"><p class="eyebrow"><b>About</b><span>${esc(DOC.byline)}</span></p><h1>${tq(DOC.title)}</h1><p class="lead">${md(DOC.asof)}</p></div>
  <h2 class="parth">How to read this</h2><div class="prose">${mdBlocks(DOC.how)}</div>
  <h2 class="parth">${tq(DOC.rules.assumptionsTitle)}</h2><div class="prose"><ul>${DOC.rules.assumptions.map(a => `<li>${md(a)}</li>`).join("")}</ul></div>
  <h2 class="docsh">Master docs</h2><div class="docs">${DOCS.map(x => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${tq(x[0])}<small>Claude Doc</small></a>`).join("")}</div>`;
}

const WFNAME_ALIAS = { "Shift Fulfillment (IRP)": "Shift Fulfillment", "EoR Hand-Off": "Employer of Record Hand-Off" };
const wfFor = name => WF.find(w => w.name === (WFNAME_ALIAS[name] || name));
const reasonChips = r => r.split(";").map(x => x.trim()).filter(Boolean).map(x => { const k = x.replace(/\s*\(.*\)$/, ""); return `<span class="rsn" data-r="${esc(k)}">${esc(x)}</span>`; }).join("");
function humanPointsFor(w) { return HITL.points.filter(p => (WFNAME_ALIAS[p[0]] || p[0]) === w.name && p[1] && !/^None expected/.test(p[1])); }
function renderHumans() {
  const n = HITL.points.filter(p => p[1] && !/^None expected/.test(p[1])).length;
  return `<div class="dhead"><p class="eyebrow"><b>Humans</b><span>${n} human points, ${HITL.roles.length} roles</span></p><h1>Human-in-the-loop map</h1><p class="lead">${md(HITL.lede)}</p></div>
  <h2 class="parth">${esc(HITL.reasonsTitle)}</h2><div class="reasons">${HITL.reasons.map(r => `<div><b><span class="rsn" data-r="${esc(r[0])}">${esc(r[0])}</span></b>${md(r[1])}</div>`).join("")}</div>
  <h2 class="parth">Design rule</h2><div class="prose">${mdBlocks(HITL.rule)}</div>
  <h2 class="parth">Roles</h2><div class="tblwrap"><table><thead><tr><th>Role</th><th>Owns</th></tr></thead><tbody>${HITL.roles.map(r => `<tr><td>${md(r[0])}</td><td>${md(r[1])}</td></tr>`).join("")}</tbody></table></div>
  <h2 class="parth">Human points by workflow</h2><div class="tblwrap hp"><table><thead><tr><th>Workflow</th><th>Human point</th><th>Reason</th><th>Role</th></tr></thead><tbody>${HITL.points.map(p => { const w = wfFor(p[0]); const nm = w ? `<a href="#${w.slug}">${tq(p[0])}</a>` : tq(p[0]); return `<tr><td>${nm}</td><td>${md(p[1])}</td><td>${reasonChips(p[2])}</td><td>${md(p[3])}</td></tr>`; }).join("")}</tbody></table></div>
  <h2 class="parth">Open</h2><div class="prose"><ul>${HITL.open.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
  <h2 class="docsh">Master doc</h2><div class="docs"><a href="${esc(DOCS[2][1])}" target="_blank" rel="noopener">${tq(DOCS[2][0])}<small>Claude Doc</small></a></div>`;
}
function renderRetention() {
  return `<div class="dhead"><p class="eyebrow"><b>Retention</b><span>${RETENTION.rows.length} record rows, draft pending Aya legal</span></p><h1>Record retention table</h1><p class="lead">${md(RETENTION.lede)}</p></div>
  <h2 class="parth">Two corrections to common assumptions</h2><div class="prose"><ul>${RETENTION.corrections.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
  <h2 class="parth">Retention by record</h2><div class="tblwrap ret"><table><thead><tr><th>Record</th><th>Owning domain</th><th>Keep for</th><th>Clock starts</th><th>Forced by</th><th>On deletion request</th></tr></thead><tbody>${RETENTION.rows.map(r => `<tr><td>${md(r[0])}</td><td>${r[1].split(", ").map(o => ownerChip(o)).join(" ")}</td><td>${md(r[2])}</td><td>${md(r[3])}</td><td>${md(r[4])}</td><td>${md(r[5])}</td></tr>`).join("")}</tbody></table></div>
  <h2 class="parth">What this forces on the design</h2><div class="prose"><ul>${RETENTION.forces.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
  <h2 class="parth">Still open</h2><div class="prose"><ul>${RETENTION.open.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
  <h2 class="parth">Sources checked</h2><div class="prose"><ul>${RETENTION.sources.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
  <h2 class="docsh">Master doc</h2><div class="docs"><a href="${esc(DOCS[3][1])}" target="_blank" rel="noopener">${tq(DOCS[3][0])}<small>Claude Doc</small></a></div>`;
}
function renderSearch() {
  const q = state.q.toLowerCase();
  const hits = WF.filter(w => [w.name, w.decision, w.triggers, w.measure, w.added || "", w.edges || "", ...w.tasks, ...w.emits, ...w.types].join(" ").toLowerCase().includes(q));
  const recs = RECORDS.filter(r => r.join(" ").toLowerCase().includes(q));
  const hps = HITL.points.filter(p => p.join(" ").toLowerCase().includes(q));
  const rets = RETENTION.rows.filter(r => r.join(" ").toLowerCase().includes(q));
  const parts = [`${hits.length} workflow${hits.length===1?"":"s"}`]; if (recs.length) parts.push(`${recs.length} record${recs.length===1?"":"s"}`); if (hps.length) parts.push(`${hps.length} human point${hps.length===1?"":"s"}`); if (rets.length) parts.push(`${rets.length} retention row${rets.length===1?"":"s"}`);
  let html = `<div class="dhead"><h1>Results</h1><p class="hits">${parts.join(", ")} match.</p></div>`;
  if (recs.length) html += `<div class="tblwrap"><table><thead><tr><th>Record</th><th>Owner</th><th></th></tr></thead><tbody>${recs.map(r => `<tr><td>${md(r[0])}</td><td>${ownerChip(r[1])}</td><td>${md(r[2])}</td></tr>`).join("")}</tbody></table></div><br>`;
  if (hps.length) html += `<h2 class="parth">Human points</h2><div class="tblwrap hp"><table><thead><tr><th>Workflow</th><th>Human point</th><th>Reason</th><th>Role</th></tr></thead><tbody>${hps.map(p => `<tr><td>${tq(p[0])}</td><td>${md(p[1])}</td><td>${reasonChips(p[2])}</td><td>${md(p[3])}</td></tr>`).join("")}</tbody></table></div><br>`;
  if (rets.length) html += `<h2 class="parth">Retention</h2><div class="tblwrap ret"><table><thead><tr><th>Record</th><th>Owning domain</th><th>Keep for</th><th>Clock starts</th><th>On deletion request</th></tr></thead><tbody>${rets.map(r => `<tr><td>${md(r[0])}</td><td>${tq(r[1])}</td><td>${md(r[2])}</td><td>${md(r[3])}</td><td>${md(r[5])}</td></tr>`).join("")}</tbody></table></div><br>`;
  if (!hits.length && !recs.length && !hps.length && !rets.length) html += `<div class="empty">Nothing matches. Try an event name as it appears in an Emits line, a record name, or an employment type.</div>`;
  hits.forEach(w => { html += wfHtml(w, true); });
  return html;
}

function render() {
  renderHero();
  renderSpine();
  const c = document.getElementById("content");
  document.querySelector("main").classList.toggle("nonav", state.view !== "domains" || state.q.length >= 2);
  document.querySelectorAll("nav.views button").forEach(b => b.setAttribute("aria-current", b.dataset.view === state.view && !state.q ? "page" : "false"));
  if (state.q.length >= 2) c.innerHTML = renderSearch();
  else if (state.view === "records") c.innerHTML = renderRecords();
  else if (state.view === "rules") c.innerHTML = renderRules();
  else if (state.view === "humans") c.innerHTML = renderHumans();
  else if (state.view === "retention") c.innerHTML = renderRetention();
  else if (state.view === "open") c.innerHTML = renderOpen();
  else if (state.view === "about") c.innerHTML = renderAbout();
  else c.innerHTML = renderDomains() + `<h2 class="docsh">Master docs</h2><p class="asof">${esc(DOC.asof)}</p><div class="docs">${DOCS.map(x => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${tq(x[0])}<small>Claude Doc</small></a>`).join("")}</div>`;
  if (state.wf && !state.q) { const el = document.getElementById("wf-" + state.wf); if (el) el.scrollIntoView({ block: "start" }); }
}

document.addEventListener("click", e => {
  const f = e.target.closest(".flow .fd"); if (f) { state.q = ""; document.getElementById("q").value = ""; go(f.dataset.dom); document.getElementById("content").scrollIntoView({ block: "start" }); return; }
  const v = e.target.closest("nav.views button"); if (v) { state.q = ""; document.getElementById("q").value = ""; go(v.dataset.view === "domains" ? state.domain : v.dataset.view); document.getElementById("content").scrollIntoView({ block: "start" }); return; }
  const h = e.target.closest("button.hd"); if (h) { const s = h.parentElement; const open = !s.hasAttribute("open"); s.toggleAttribute("open", open); h.setAttribute("aria-expanded", open); if (open && !state.q) { state.wf = h.dataset.wf; history.replaceState(null, "", "#" + state.wf); } return; }
  const ev = e.target.closest(".ev"); if (ev) { state.event = ev.dataset.ev; state.q = ""; document.getElementById("q").value = ""; render(); document.querySelector(".evpanel").scrollIntoView({ block: "start" }); return; }
  if (e.target.closest("[data-close]")) { state.event = null; render(); }
});
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.classList.contains("ev")) e.target.click(); });
document.getElementById("q").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });
window.addEventListener("hashchange", route);
route();
</script>
</body>
</html>
