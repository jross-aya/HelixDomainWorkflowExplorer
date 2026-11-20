
// Links to the other master docs. Not content: these are the spine's own links.
const DOCS = [
  ["Helix Domains & Workflows (master doc)", "https://claude.ai/artifact/52bJejmTcBnvzPnxngdHhz"],
  ["Helix Decisions Log", "https://claude.ai/artifact/XTj571E3pwSU9DcnZqaZ9g"],
  ["Helix Human-in-the-Loop Map", "https://claude.ai/artifact/KjKEj197fg2aZTV8A3rQaZ"],
  ["Helix Record Retention Table", "https://claude.ai/artifact/5u9zcu9DuuwrxhVL3RdX8i"],
  ["Helix Notification Register", "https://claude.ai/artifact/AGFoXtoUnMjLwtvUCzLuwt"]   // v15
];

// Content of the Human-in-the-Loop Map and the Record Retention Table (master Claude Docs, linked in DOCS). Mirrored here November 4, 2026; the Docs stay the master copies.

const STAGES = [
  { id: "shared", name: "Shared", sc: "var(--muted)", ids: ["foundational-data", "integration-hub"] },
  { id: "setup", name: "Set up", sc: "var(--amber)", ids: ["client-contracts", "jobs", "talent", "job-pricing"] },
  { id: "match", name: "Match & submit", sc: "var(--coral)", ids: ["matching", "fulfillment"] },
  { id: "place", name: "Place", sc: "var(--violet)", ids: ["employment-agreements", "compliance", "mobilization"] },
  { id: "work", name: "Work", sc: "var(--aqua)", ids: ["finance"] },
  { id: "alongside", name: "Alongside", sc: "var(--aqua)", ids: ["talent-advocacy", "client-advocacy"] }
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
const VIEWS = { start: 1, domains: 1, records: 1, rules: 1, humans: 1, retention: 1, notifications: 1, notmodeled: 1, about: 1 };  // v11: Open items view removed; v15: Notifications view added
let state = { view: "domains", domain: DOMAINS[0].id, wf: null, q: "", event: null, nfRecipient: "", nfCategory: "" };
const layerTag = d => { const m = /Layer (\d+)/.exec(d.layer); return m ? "L" + m[1] : "PL"; };
const plus = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const EVENTS = new Set(); WF.forEach(w => w.emits.forEach(e => EVENTS.add(e)));

function renderHero() {
  document.getElementById("eyebrow").textContent = `Helix is Aya \u00b7 Regenerated ${DOC.built}`;  // v9: build stamp, not the Doc byline date
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
      ${w.types.length ? `<dt>Employment types</dt><dd><div class="types">${w.types.map(t => `<span class="tt" title="${t==='IRP'?'Per Diem × client-employed; not a type of its own':''}">${esc(t==='IRP'?'IRP (Per Diem × client-employed)':t)}</span>`).join("")}</div><ul class="typenotes">${w.typeNotes.map(s => `<li>${md(s)}</li>`).join("")}</ul></dd>` : ""}
      <dt>Listens for</dt><dd>${md(w.triggers)}</dd>
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
function stateList(sent) {  // v13: chips carry the state name only; a parenthetical after a state becomes a note
  const body = sent.replace(/^[^:(]{0,80}:\s*/, "").replace(/\.$/, "");  // a label such as "States:" is stripped only if it comes before any parenthesis
  const parts = []; let cur = "", depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "(") depth++; else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === "," && body[i + 1] === " ") { parts.push(cur.trim()); cur = ""; i++; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  if (parts.length < 3 || parts.length > 14) return null;
  const states = [], notes = [];
  for (const p of parts) {
    const m = p.match(/^([^(]+?)\s*\((.+)\)\s*$/);
    const name = (m ? m[1] : p).trim(), detail = m ? m[2].trim() : "";
    if (!/^[A-Z]/.test(name) || name.split(/\s+/).length > 5) return null;
    states.push(name);
    if (detail) notes.push(`${name}: ${detail}.`);
  }
  return { states, notes };
}
function recordCard(r, idx) {
  const sents = splitSentences(r[3]);
  const creators = r[2].split(/;\s*/).filter(Boolean).map(c => { const m = c.match(/^(.*?)\s*(\(.*\))?$/); const w = WF.find(w => w.name === m[1].trim()); return w ? `<a class="creator" href="#${w.slug}">${tq(m[1])}${m[2] ? `<small>${tq(m[2])}</small>` : ""}</a>` : `<span class="creator">${tq(c)}</span>`; }).join("");
  const dom = DOMAINS.find(d => r[1].startsWith(d.name) || (d.id==="job-pricing" && r[1].startsWith("Pricing")) || (d.id==="foundational-data" && r[1].startsWith("Foundational")));
  let states = null, si = -1;
  let stateNotes = [];
  for (let i = 0; i < Math.min(sents.length, 3); i++) { const st = stateList(sents[i]); if (st) { states = st.states; stateNotes = st.notes; si = i; break; } }
  const rest = sents.filter((_, i) => i !== si);
  const summary = rest.shift() || "";
  rest.unshift(...stateNotes);
  return `<section class="rec${dom ? " d" : ""}" data-i="${idx % 4}"${dom ? ` style="--h:${dom.hue}"` : ""}><div class="rechd"><h2>${md(r[0])}</h2>${ownerChip(r[1])}</div>
    ${creators ? `<p class="created"><span class="lbl">Created by</span>${creators}</p>` : ""}
    ${states ? `<div class="states">${states.map(s => `<span class="st">${md(s)}</span>`).join("")}</div>` : ""}
    ${summary ? `<p class="recsum">${md(summary)}</p>` : ""}
    ${transHtml(r[0])}
    ${rest.length ? `<details class="recmore"><summary>Details <span>${rest.length} ${rest.length === 1 ? "note" : "notes"}</span></summary><ul>${rest.map(x => `<li>${md(x)}</li>`).join("")}</ul></details>` : ""}</section>`;
}
function transCell(v, kind) {  // v14: one cell of a transitions table
  if (!v) return kind === "from" ? `<span class="tcreate">Created</span>` : "";
  const open = v.match(/^open: (DL-\d{3})$/);
  if (open) return `<span class="topen">open: ${open[1]}</span>`;
  if (kind === "from" || kind === "to") return `<span class="st">${md(v)}</span>`;
  if (kind === "owner") { const w = WF.find(w => w.name === v); return w ? `<a class="creator" href="#${w.slug}">${tq(v)}</a>` : tq(v); }
  if (kind === "events") {  // comma list outside parentheses; Capitalized items are event names, lower-case items are sources
    // Event chips here use .tev, not .ev: the page-wide .ev click handler opens the Domains view's event panel,
    // which the Records view does not have. A .tev chip links to the workflow that emits the event instead.
    return v.split(/,\s*(?![^()]*\))/).map(x => x.trim()).filter(Boolean).map(x => {
      if (!/^[A-Z]/.test(x)) return `<span class="src">${md(x)}</span>`;
      const base = x.replace(/\s*\([^()]*\)\s*$/, "");
      const w = WF.find(w => w.emits.some(e => e.replace(/\s*\([^()]*\)\s*$/, "") === base));
      return w ? `<a class="tev" href="#${w.slug}" title="Emitted by ${esc(w.name)}">${md(x)}</a>` : `<span class="tev">${md(x)}</span>`;
    }).join("");
  }
  return md(v);
}
function transHtml(rec) {  // v14: the record's rows from the Doc's "Record transitions" section, if it has them
  const rows = ((DOC.rules.transitions || {}).records || {})[rec];
  if (!rows) return "";
  // v16: collapsed by default; the Records view lists every record, so an open table per record meant a long scroll.
  return `<details class="trans"><summary class="lbl">Transitions <span>${rows.length} ${rows.length === 1 ? "row" : "rows"}</span></summary><div class="tblwrap"><table><thead><tr><th>From</th><th>To</th><th>Owning workflow</th><th>Listens for</th><th>Emits</th><th>Pending human</th></tr></thead><tbody>${rows.map(r => `<tr><td>${transCell(r[0], "from")}</td><td>${transCell(r[1], "to")}</td><td>${transCell(r[2], "owner")}</td><td>${transCell(r[3], "events")}</td><td>${transCell(r[4], "events")}</td><td>${transCell(r[5], "human")}</td></tr>`).join("")}</tbody></table></div></details>`;
}
function renderRecords() {
  const t = DOC.rules.transitions || { lede: "", records: {} }, nt = Object.keys(t.records).length;
  return `<div class="dhead"><p class="eyebrow"><b>Records</b><span>${RECORDS.length} record types${nt ? ` · ${nt} with transitions` : ""}</span></p><h1>Shared record state machines</h1><p class="lead">${md(DOC.rules.recordsLede)}</p>${t.lede ? `<p class="lead translede">${md(t.lede)}</p>` : ""}</div>
  <div class="recs">${RECORDS.map((r, i) => recordCard(r, i)).join("")}</div>`;
}
function renderRules() {
  const wc = DOC.rules.workClassification || [];
  const blocks = wc.map(b => b.p != null ? `<p>${md(b.p)}</p>`
    : `<div class="tblwrap wc"><table><thead><tr>${b.table.head.map(c => `<th>${md(c)}</th>`).join("")}</tr></thead><tbody>${b.table.rows.map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`).join("");
  return `<div class="dhead"><p class="eyebrow"><b>Rules</b><span>${RULES.length} rules, every workflow</span></p><h1>Rules that apply to every workflow</h1><p class="lead">${md(DOC.rules.lede)}</p></div>
  <ol class="rules">${RULES.map(r => `<li><div><b>${md(r[0])}</b>${md(r[1])}${(r[2] && r[2].length) ? `<ul>${r[2].map(x => `<li>${md(x)}</li>`).join("")}</ul>` : ""}</div></li>`).join("")}</ol>
  ${wc.length ? `<h2 class="parth">Work Classification</h2><div class="prose">${blocks}</div>` : ""}`;
}
function renderNotModeled() {  // v10: the master Doc's "Not modeled" section, one row per area Helix has not scoped
  const n = DOC.notModeled;
  return `<div class="dhead"><p class="eyebrow"><b>Not modeled</b><span>${n.rows.length} areas not yet scoped</span></p><h1>Not modeled</h1><p class="lead">${md(n.lede)}</p></div>
  <div class="tblwrap ret"><table><thead><tr><th>Area</th><th>What it is</th><th>Why it is not modeled</th><th>What brings it in</th></tr></thead><tbody>${n.rows.map(r => `<tr><td>${md(r[0])}</td><td>${md(r[1])}</td><td>${md(r[2])}</td><td>${md(r[3])}</td></tr>`).join("")}</tbody></table></div>
  ${n.footer ? `<p class="lead" style="margin-top:26px;font-size:14.5px">${md(n.footer)}</p>` : ""}
  <h2 class="docsh">Master docs</h2><div class="docs">${DOCS.slice(0, 2).map(x => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${tq(x[0])}<small>Claude Doc</small></a>`).join("")}</div>`;
}
function renderAbout() {
  return `<div class="dhead"><p class="eyebrow"><b>About</b><span>${esc(DOC.byline)}</span></p><h1>${tq(DOC.title)}</h1><p class="lead">${md(DOC.asof)}</p></div>
  <h2 class="parth">How to read this</h2><div class="prose">${mdBlocks(DOC.how)}</div>
  ${DOC.rules.assumptions.length ? `<h2 class="parth">${tq(DOC.rules.assumptionsTitle)}</h2><div class="prose"><ul>${DOC.rules.assumptions.map(a => `<li>${md(a)}</li>`).join("")}</ul></div>` : ""}
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
  <h2 class="docsh">Master doc</h2><div class="docs"><a href="${esc(DOCS[2][1])}" target="_blank" rel="noopener">${tq(DOCS[2][0])}<small>Claude Doc</small></a></div>`;
}
function renderRetention() {
  return `<div class="dhead"><p class="eyebrow"><b>Retention</b><span>${RETENTION.rows.length} record rows, draft pending Aya legal</span></p><h1>Record retention table</h1><p class="lead">${md(RETENTION.lede)}</p></div>
  <h2 class="parth">Two corrections to common assumptions</h2><div class="prose"><ul>${RETENTION.corrections.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
  <h2 class="parth">Retention by record</h2><div class="tblwrap ret"><table><thead><tr><th>Record</th><th>Owning domain</th><th>Keep for</th><th>Clock starts</th><th>Forced by</th><th>On deletion request</th></tr></thead><tbody>${RETENTION.rows.map(r => `<tr><td>${md(r[0])}</td><td>${r[1].split(", ").map(o => ownerChip(o)).join(" ")}</td><td>${md(r[2])}</td><td>${md(r[3])}</td><td>${md(r[4])}</td><td>${md(r[5])}</td></tr>`).join("")}</tbody></table></div>
  <h2 class="parth">What this forces on the design</h2><div class="prose"><ul>${RETENTION.forces.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
  <h2 class="parth">Sources checked</h2><div class="prose"><ul>${RETENTION.sources.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
  <h2 class="docsh">Master doc</h2><div class="docs"><a href="${esc(DOCS[3][1])}" target="_blank" rel="noopener">${tq(DOCS[3][0])}<small>Claude Doc</small></a></div>`;
}
// v15: the Notification Register. One row per trigger; the Trigger cell links each event to the workflow that
// emits it (as the transitions tables do) and each "Record: State" to the owning workflow. Filters are per
// viewer and not kept.
const NF_RECIPIENTS = ["Talent", "Client User", "Partner contact"];
function nfTrigger(cell) {
  return cell.split(";").map(x => x.trim()).filter(Boolean).map(x => {
    if (/^pending human/i.test(x) || !/^[A-Z]/.test(x)) return `<span class="src">${md(x)}</span>`;
    const base = x.replace(/\s*\([^()]*\)\s*$/, "");
    const w = WF.find(w => w.emits.some(e => e.replace(/\s*\([^()]*\)\s*$/, "") === base));
    if (w) return `<a class="tev" href="#${w.slug}" title="Emitted by ${esc(w.name)}">${md(x)}</a>`;
    return `<a class="tev" href="#records" title="A record and state; see the Records view">${md(x)}</a>`;
  }).join("");
}
function nfOwner(cell) { return cell.split(";").map(x => x.trim()).filter(Boolean).map(v => { const w = WF.find(w => w.name === v); return w ? `<a class="creator" href="#${w.slug}">${tq(v)}</a>` : tq(v); }).join("; "); }
function nfCell(v) { const o = v.match(/^open: (DL-\d{3})$/); return o ? `<span class="topen">open: ${o[1]}</span>` : md(v); }
function renderNotifications() {
  const rows = REGISTER.rows.filter(r => (!state.nfRecipient || r[3].includes(state.nfRecipient)) && (!state.nfCategory || r[4] === state.nfCategory));
  const counts = c => REGISTER.rows.filter(r => r[4] === c).length;
  const chip = (k, v, label) => `<button class="nf" data-nf="${k}" data-v="${esc(v)}" aria-pressed="${state[k] === v}">${esc(label)}</button>`;
  const how = REGISTER.how.map(b => b.p != null ? `<p>${md(b.p)}</p>`
    : `<div class="tblwrap"><table><thead><tr>${b.table.head.map(c => `<th>${md(c)}</th>`).join("")}</tr></thead><tbody>${b.table.rows.map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`).join("");
  return `<div class="dhead"><p class="eyebrow"><b>Notifications</b><span>${REGISTER.rows.length} triggers: ${counts("Required")} required, ${counts("Transactional")} transactional; ${REGISTER.advocateRows.length} advocate-owned</span></p><h1>Notification register</h1><p class="lead">${md(REGISTER.lede)}</p></div>
  <h2 class="parth">How to read this</h2><div class="prose">${how}</div>
  <h2 class="parth">Required and transactional sends</h2>
  <div class="nffilters"><span>Recipient</span>${chip("nfRecipient", "", "All")}${NF_RECIPIENTS.map(r => chip("nfRecipient", r, r)).join("")}<span>Category</span>${chip("nfCategory", "", "All")}${["Required", "Transactional"].map(c => chip("nfCategory", c, c)).join("")}<em>${rows.length} of ${REGISTER.rows.length} rows</em></div>
  <div class="tblwrap nf"><table><thead><tr>${["Domain", "Trigger", "Owning workflow", "Recipient", "Category", "Caller", "Legal basis", "Channel fixed", "Deadline"].map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr><td>${tq(r[0])}</td><td>${nfTrigger(r[1])}</td><td>${nfOwner(r[2])}</td><td>${nfCell(r[3])}</td><td><span class="cat ${r[4].toLowerCase().replace(/[^a-z]/g, "")}">${nfCell(r[4])}</span></td><td>${nfCell(r[5])}</td><td>${nfCell(r[6])}</td><td>${nfCell(r[7])}</td><td>${nfCell(r[8])}</td></tr>`).join("")}</tbody></table></div>
  ${REGISTER.footer ? `<p class="lead" style="margin-top:18px;font-size:14.5px">${md(REGISTER.footer)}</p>` : ""}
  <h2 class="parth">${tq(REGISTER.advocateTitle)}</h2><p class="lead" style="font-size:14.5px">${md(REGISTER.advocateLede)}</p>
  <div class="tblwrap nf"><table><thead><tr>${["Trigger", "Emitting workflow", "Advocate", "Recipient", "What the master Doc says"].map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${REGISTER.advocateRows.map(r => `<tr><td>${nfTrigger(r[0])}</td><td>${nfOwner(r[1])}</td><td>${md(r[2])}</td><td>${md(r[3])}</td><td>${nfCell(r[4])}</td></tr>`).join("")}</tbody></table></div>
  <h2 class="docsh">Master doc</h2><div class="docs"><a href="${esc(DOCS[4][1])}" target="_blank" rel="noopener">${tq(DOCS[4][0])}<small>Claude Doc</small></a></div>`;
}
function renderSearch() {
  const q = state.q.toLowerCase();
  const hits = WF.filter(w => [w.name, w.decision, w.triggers, w.measure, w.added || "", w.edges || "", ...w.tasks, ...w.emits, ...w.types].join(" ").toLowerCase().includes(q));
  const recs = RECORDS.filter(r => r.join(" ").toLowerCase().includes(q));
  const hps = HITL.points.filter(p => p.join(" ").toLowerCase().includes(q));
  const rets = RETENTION.rows.filter(r => r.join(" ").toLowerCase().includes(q));
  const nfs = REGISTER.rows.filter(r => r.join(" ").toLowerCase().includes(q));   // v15
  const parts = [`${hits.length} workflow${hits.length===1?"":"s"}`]; if (recs.length) parts.push(`${recs.length} record${recs.length===1?"":"s"}`); if (hps.length) parts.push(`${hps.length} human point${hps.length===1?"":"s"}`); if (rets.length) parts.push(`${rets.length} retention row${rets.length===1?"":"s"}`); if (nfs.length) parts.push(`${nfs.length} notification${nfs.length===1?"":"s"}`);
  let html = `<div class="dhead"><h1>Results</h1><p class="hits">${parts.join(", ")} match.</p></div>`;
  if (recs.length) html += `<div class="tblwrap"><table><thead><tr><th>Record</th><th>Owner</th><th>Why it must be defined first</th></tr></thead><tbody>${recs.map(r => `<tr><td>${md(r[0])}</td><td>${ownerChip(r[1])}</td><td>${md(r[3])}</td></tr>`).join("")}</tbody></table></div><br>`;
  if (hps.length) html += `<h2 class="parth">Human points</h2><div class="tblwrap hp"><table><thead><tr><th>Workflow</th><th>Human point</th><th>Reason</th><th>Role</th></tr></thead><tbody>${hps.map(p => `<tr><td>${tq(p[0])}</td><td>${md(p[1])}</td><td>${reasonChips(p[2])}</td><td>${md(p[3])}</td></tr>`).join("")}</tbody></table></div><br>`;
  if (rets.length) html += `<h2 class="parth">Retention</h2><div class="tblwrap ret"><table><thead><tr><th>Record</th><th>Owning domain</th><th>Keep for</th><th>Clock starts</th><th>On deletion request</th></tr></thead><tbody>${rets.map(r => `<tr><td>${md(r[0])}</td><td>${tq(r[1])}</td><td>${md(r[2])}</td><td>${md(r[3])}</td><td>${md(r[5])}</td></tr>`).join("")}</tbody></table></div><br>`;
  if (nfs.length) html += `<h2 class="parth">Notifications</h2><div class="tblwrap nf"><table><thead><tr><th>Trigger</th><th>Owning workflow</th><th>Recipient</th><th>Category</th><th>Caller</th></tr></thead><tbody>${nfs.map(r => `<tr><td>${nfTrigger(r[1])}</td><td>${nfOwner(r[2])}</td><td>${nfCell(r[3])}</td><td>${nfCell(r[4])}</td><td>${nfCell(r[5])}</td></tr>`).join("")}</tbody></table></div><br>`;
  if (!hits.length && !recs.length && !hps.length && !rets.length && !nfs.length) html += `<div class="empty">Nothing matches. Try an event name as it appears in an Emits line, a record name, or an employment type.</div>`;
  hits.forEach(w => { html += wfHtml(w, true); });
  return html;
}

function render() {
  document.body.dataset.view = state.q.length >= 2 ? "search" : state.view;   // v18: the hero header is shown on the Start here view only
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
  else if (state.view === "notifications") c.innerHTML = renderNotifications();   // v15
  else if (state.view === "notmodeled") c.innerHTML = renderNotModeled();
  else if (state.view === "about") c.innerHTML = renderAbout();
  else if (state.view === "start") { c.innerHTML = document.getElementById("start-here").innerHTML; startMount(c); }   // v18: hand-written primer from head.html, figures drawn below
  else c.innerHTML = renderDomains() + `<h2 class="docsh">Master docs</h2><p class="asof">${esc(DOC.asof)}</p><div class="docs">${DOCS.map(x => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${tq(x[0])}<small>Claude Doc</small></a>`).join("")}</div>`;
  if (state.wf && !state.q) { const el = document.getElementById("wf-" + state.wf); if (el) el.scrollIntoView({ block: "start" }); }
}


// ---------- v18: Start here figures. Words are in head.html's template; everything drawn here comes from DOC. ----------
const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = ms => new Promise(r => setTimeout(r, REDUCED ? 0 : ms));
const LAYER_ORDER = ["Platform service", "Layer 0", "Layer 1", "Layer 2", "Layer 3", "Layer 4", "Layer 5", "Layer 6", "Layer 7", "Layer 8", "Layer 9", "Alongside"];
const LAYER_LABEL = { "Platform service": "Platform", "Layer 0": "Foundation", "Alongside": "Alongside" };
const layerIdx = d => LAYER_ORDER.indexOf(d.layer);
function depVerdict(a, b) {
  if (a.id === b.id) return [false, `A domain does not depend on itself.`];
  if (b.kind === "Platform" || b.kind === "Foundation") return [true, `<b>Allowed.</b> ${tq(b.name)} is shared: every domain may read it, and it depends on no business domain.`];
  if (a.kind === "Platform" || a.kind === "Foundation") return [false, `<b>Rejected.</b> ${tq(a.name)} is shared and depends on no business domain; the arrow would point the wrong way.`];
  if (b.layer === "Alongside") return [false, `<b>Rejected.</b> Nothing in the flow depends on ${tq(b.name)}: advocacy listens to every stage and no stage waits on it.`];
  if (a.layer === "Alongside") return [true, `<b>Allowed.</b> ${tq(a.name)} may listen to anything in the flow.`];
  const ia = layerIdx(a), ib = layerIdx(b);
  if (ib < ia) return [true, `<b>Allowed.</b> ${tq(b.name)} (${tq(b.layer)}) is earlier in the flow than ${tq(a.name)} (${tq(a.layer)}), so the arrow points forward.`];
  if (ib === ia) return [false, `<b>Rejected.</b> Both sit in ${tq(a.layer)}. Two domains in one layer talk through events, never by depending on each other.`];
  return [false, `<b>Rejected.</b> ${tq(b.name)} (${tq(b.layer)}) is later in the flow than ${tq(a.name)} (${tq(a.layer)}). That arrow points backward and would make a cycle; the later domain reacts to an event instead.`];
}
function figLadder() {
  const groups = LAYER_ORDER.filter(l => DOMAINS.some(d => d.layer === l));
  const biz = DOMAINS.filter(d => true);
  const opts = sel => biz.map(d => `<option value="${d.id}"${d.id === sel ? " selected" : ""}>${tq(d.name)}</option>`).join("");
  return `<div class="fig ladder" data-fig-ladder>
    <div class="bar"><span class="cap">May <select data-from>${opts("jobs")}</select> depend on <select data-to>${opts("matching")}</select>?</span><button class="play" data-check>Check</button></div>
    ${groups.map(l => `<div class="lrow"><span class="lk">${esc(LAYER_LABEL[l] || l)}</span><div class="lcells">${DOMAINS.filter(d => d.layer === l).map(d => `<span class="dm" data-dm="${d.id}" style="--h:${d.hue}"><i></i>${tq(d.name)}<small>${esc(d.type)}</small></span>`).join("")}</div></div>`).join("")}
    <div class="verdict">Pick two domains and press Check. Arrows may only point to earlier layers or to shared domains.</div>
    <p style="margin:0;font-size:13px">Type badge: <b>Core</b> is where Aya wins (build and invest), <b>Supporting</b> is Aya-specific (build lean), <b>Generic</b> is commodity (buy or integrate).</p>
  </div>`;
}
const SORT_ITEMS = [
  ["A worksite's name and address", "fact"], ["Which health screens an Acute Care placement needs", "policy"],
  ["Acute Care as a worksite's work setting", "fact"], ["An RN license must not expire within 90 days of start", "policy"],
  ["A profession's scope of practice", "fact"], ["Who at a client approves a job before it is released", "policy"]
];
function figSorter() {
  return `<div class="fig" data-fig-sorter><div class="bar"><span class="cap">Six records. Which are facts and which are policies?</span><button class="play" data-sort>Sort them</button><button class="play" data-unsort>Reset</button></div>
  <div class="sorter"><div class="pile">${SORT_ITEMS.map((it, i) => `<span class="it" data-i="${i}">${tq(it[0])}</span>`).join("")}</div>
  <div class="bin" data-bin="fact"><h3>Facts<small>live in Foundational Data; many domains read them, none changes them</small></h3></div>
  <div class="bin" data-bin="policy"><h3>Policies<small>live with the workflow that enforces them (Jobs, Client Contracts & Account, Compliance)</small></h3></div></div></div>`;
}
function figVerbs() {
  const steps = [
    ["Asks for data", `the talent: which stipend split, which days off`],
    ["Checks against rules", `the terms against the client contract and the person's stated needs`],
    ["Hands a decision to a person", `the talent asks for more than the rule allows, so a person decides <span class="hp">Pending human</span>`],
    ["Moves its record", `the Offer <span class="st">Presented</span> → <span class="st to">Accepted</span>`],
    ["Announces", `<span class="evx">Offer Accepted</span> so Agreement Generation can start`]
  ];
  return `<div class="fig" data-fig-verbs><div class="bar"><span class="cap">Offer Out, one offer, start to finish.</span><button class="play" data-verbs>Play</button></div>
  <div class="verbs">${steps.map((x, i) => `<div class="vb" data-vb="${i}"><b>${i + 1}. ${x[0]}</b><span>${x[1]}</span></div>`).join("")}</div></div>`;
}
function figStates() {
  const row = RECORDS.find(r => r[0] === "Assignment"); const sts = row ? statesOf(row) : ["Scheduled", "Started", "Blocked", "Ending", "Ended", "Cancelled"];
  return `<div class="fig" data-fig-states><div class="bar"><span class="cap">The Assignment record's states, from the Doc. Click one.</span></div>
  <div class="strip">${sts.map(s => `<span class="st" data-st="${esc(s)}" tabindex="0">${esc(s)}</span>`).join("")}</div><div data-sdetail></div></div>`;
}
function statesOf(row) {  // the chip list tail.js already draws on the Records view
  const m = /(?:^|\. )((?:[A-Z][\w-]*(?: [A-Z][\w-]*){0,3}(?:, | or )?){3,})\./.exec(row[3].replace(/\s*\([^()]*\)/g, ""));
  if (!m) return [];
  return m[1].split(/, | or /).map(s => s.trim()).filter(s => /^[A-Z]/.test(s));
}
function figTwo() {
  return `<div class="fig"><div class="two"><div class="rc"><b>Assignment</b><span class="st">Started</span><div style="font-size:13px;margin-top:6px">13-week ICU contract, week 9</div></div><div class="who">one person</div><div class="rc"><b>Candidacy</b><span class="st">Submitted</span><div style="font-size:13px;margin-top:6px">the next job, submitted to the client</div></div></div></div>`;
}
const STEPS = [["Submitted to Client", "Candidacy Created"], ["Offer", "Candidacy Selected"], ["Employment Agreement", "Offer Accepted"], ["Compliance", "Agreement Signed"], ["Payroll", "Agreement Signed"]];
const NEW_STEP = ["Interview", "Client Status Changed (Interview)"];
function figEvents() {
  return `<div class="fig" data-fig-events><div class="bar"><span class="cap">Five pieces of work, two ways. Add Interview to both, then run a placement where the client selects without interviewing.</span><button class="play" data-add>Add Interview</button><button class="play" data-run>Run</button><button class="play" data-reset>Reset</button></div>
  <div class="cve"><div><h3>A chain: each step calls the next</h3><div class="chain" data-chain>${STEPS.map((n, i) => `${i ? `<span class="ar">→</span>` : ""}<span class="nd" data-ch>${esc(n[0])}</span>`).join("")}</div><div class="note" data-note-ch>&nbsp;</div><div class="count" data-count-ch>&nbsp;</div></div>
  <div><h3>Events: each piece listens for a fact</h3><div class="evs" data-evs>${STEPS.map(n => `<span class="nd" data-l>${esc(n[0])}<small>listens for ${esc(n[1])}</small></span>`).join("")}</div><div class="note" data-note-ev>&nbsp;</div><div class="count" data-count-ev>&nbsp;</div></div></div></div>`;
}
const VIEW_CARDS = [["domains", "Domains", "every workflow card; click an event chip to see who listens"], ["records", "Records", "every record, its states and transitions"], ["rules", "Rules", "the nine rules and the Work Classification inputs"], ["humans", "Humans", "every place a person decides, with role and deadline"], ["notifications", "Notifications", "every message Helix sends, and its trigger"], ["notmodeled", "Not modeled", "what Helix has not taken on, and what would bring it in"]];
function figViews() { return `<div class="views">${VIEW_CARDS.map(v => `<button data-view-go="${v[0]}">${v[1]}<small>${v[2]}</small></button>`).join("")}</div>`; }

function startMount(c) {
  const put = (k, html) => { const el = c.querySelector(`[data-fig="${k}"]`); if (el) el.outerHTML = html; };
  put("ladder", figLadder()); put("sorter", figSorter()); put("verbs", figVerbs()); put("states", figStates()); put("two", figTwo()); put("events", figEvents()); put("views", figViews());
  // ladder
  const lad = c.querySelector("[data-fig-ladder]");
  if (lad) lad.querySelector("[data-check]").onclick = () => {
    const a = DOMAINS.find(d => d.id === lad.querySelector("[data-from]").value), b = DOMAINS.find(d => d.id === lad.querySelector("[data-to]").value);
    lad.querySelectorAll(".dm").forEach(x => x.classList.remove("from", "to", "ok", "bad"));
    const [ok, text] = depVerdict(a, b);
    lad.querySelector(`[data-dm="${a.id}"]`).classList.add("from"); lad.querySelector(`[data-dm="${b.id}"]`).classList.add("to", ok ? "ok" : "bad");
    const v = lad.querySelector(".verdict"); v.className = "verdict " + (ok ? "ok" : "bad"); v.innerHTML = text;
  };
  // sorter
  const so = c.querySelector("[data-fig-sorter]");
  if (so) {
    so.querySelector("[data-sort]").onclick = async () => { so.querySelector("[data-sort]").classList.add("done");
      for (const it of [...so.querySelectorAll(".it")]) { const k = SORT_ITEMS[+it.dataset.i][1]; it.style.opacity = 0; await wait(120); so.querySelector(`[data-bin="${k}"]`).appendChild(it); it.classList.add(k); it.style.opacity = 1; await wait(160); }
    };
    so.querySelector("[data-unsort]").onclick = () => { so.querySelector("[data-sort]").classList.remove("done"); const pile = so.querySelector(".pile"); [...so.querySelectorAll(".it")].sort((x, y) => x.dataset.i - y.dataset.i).forEach(it => { it.className = "it"; it.style.opacity = 1; pile.appendChild(it); }); };
  }
  // five verbs
  const vf = c.querySelector("[data-fig-verbs]");
  if (vf) vf.querySelector("[data-verbs]").onclick = async () => { vf.querySelector("[data-verbs]").classList.add("done"); const cards = vf.querySelectorAll(".vb"); cards.forEach(x => x.classList.remove("on")); for (const x of cards) { x.classList.add("on"); await wait(1300); } };
  // states: click a chip, see the rows of the Assignment table that enter and leave it
  const sf = c.querySelector("[data-fig-states]");
  if (sf) sf.querySelectorAll(".st").forEach(ch => ch.onclick = () => {
    const st = ch.dataset.st, rows = ((DOC.rules.transitions || {}).records || {})["Assignment"] || [];
    sf.querySelectorAll(".st").forEach(x => x.classList.toggle("on", x === ch));
    const li = (r, dir) => `<li>${dir === "in" ? (r[0] ? `from <span class="st">${esc(r[0])}</span>` : "created") : `to <span class="st">${esc(r[1])}</span>`} when ${tq(r[3].replace(/\s*\([^()]*\)/g, ""))}</li>`;
    const ins = rows.filter(r => r[1] === st), outs = rows.filter(r => r[0] === st);
    sf.querySelector("[data-sdetail]").innerHTML = `<div class="sdetail"><div><h4>How it gets to ${esc(st)}</h4>${ins.length ? `<ul>${ins.map(r => li(r, "in")).join("")}</ul>` : "Nothing moves it here."}</div><div><h4>Where it goes from ${esc(st)}</h4>${outs.length ? `<ul>${outs.map(r => li(r, "out")).join("")}</ul>` : "Nowhere: this state is final."}</div></div>`;
  });
  // events: adding Interview to a chain versus to a listener set, then running a placement with no interview
  const ef = c.querySelector("[data-fig-events]");
  if (ef) {
    const base = ef.innerHTML;
    let added = false;
    const q = s => ef.querySelector(s), qa = s => [...ef.querySelectorAll(s)];
    const add = async () => {
      if (added) return; added = true; q("[data-add]").classList.add("done");
      const chain = q("[data-chain]"), nodes = qa("[data-ch]"), ars = qa(".chain .ar");
      ars[0].classList.add("cut"); nodes[0].classList.add("edit"); nodes[1].classList.add("edit");
      q("[data-note-ch]").textContent = "Submitted to Client used to call Offer; that link is cut";
      await wait(1100);
      const nn = document.createElement("span"); nn.className = "nd new"; nn.setAttribute("data-ch", ""); nn.textContent = NEW_STEP[0];
      const a1 = document.createElement("span"); a1.className = "ar new"; a1.textContent = "→";
      ars[0].classList.remove("cut"); ars[0].classList.add("new");
      chain.insertBefore(nn, nodes[1]); chain.insertBefore(a1, nodes[1]);
      q("[data-note-ch]").textContent = "Submitted to Client now calls Interview; Interview must call Offer";
      q("[data-count-ch]").textContent = "3 things changed, and every placement now goes through Interview, whether or not the client wants one";
      await wait(500);
      const ln = document.createElement("span"); ln.className = "nd new"; ln.setAttribute("data-l", ""); ln.innerHTML = `${esc(NEW_STEP[0])}<small>listens for ${esc(NEW_STEP[1])}</small>`; q("[data-evs]").appendChild(ln);
      q("[data-note-ev]").textContent = "Interview listens for the client asking for one. Offer still listens for Candidacy Selected; nothing else was touched.";
      q("[data-count-ev]").textContent = "1 thing changed, and it runs only when a client asks";
    };
    const run = async () => {
      const nodes = qa("[data-ch]"), lsn = qa("[data-l]");
      nodes.forEach(x => { x.classList.remove("lit", "stall", "skip"); x.classList.add("wait"); }); lsn.forEach(x => { x.classList.remove("lit", "skip"); x.classList.add("wait"); });
      q("[data-note-ch]").textContent = "the client selects straight from the submittal"; q("[data-note-ev]").textContent = "the client selects straight from the submittal";
      // events side: facts arrive; each listener lights when its fact does; Compliance and Payroll together
      const byName = n => lsn.find(x => x.firstChild.textContent === n);
      const evRun = (async () => {
        for (const ev of ["Candidacy Created", "Candidacy Selected", "Offer Accepted", "Agreement Signed"]) {
          lsn.filter(x => x.querySelector("small").textContent.endsWith(ev)).forEach(x => { x.classList.remove("wait"); x.classList.add("lit"); });
          await wait(650);
        }
        const iv = byName("Interview"); if (iv) { iv.classList.remove("wait"); iv.classList.add("skip"); q("[data-note-ev]").textContent = "no interview was asked for: Interview never ran, and nothing waited for it"; }
        else q("[data-note-ev]").textContent = "Compliance and Payroll started together on Agreement Signed";
      })();
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].classList.remove("wait"); nodes[i].classList.add("lit");
        if (nodes[i].textContent === "Interview") { nodes[i].classList.add("stall"); q("[data-note-ch]").textContent = "Interview runs anyway, and Offer waits until it is done"; await wait(1500); nodes[i].classList.remove("stall"); }
        await wait(500);
      }
      q("[data-note-ch]").textContent = added ? "done, one step at a time, with a step nobody asked for" : "done, one step at a time";
      await evRun;
    };
    const reset = () => { ef.innerHTML = base; added = false; wire(); };
    const wire = () => { q("[data-add]").onclick = add; q("[data-run]").onclick = run; q("[data-reset]").onclick = reset; };
    wire();
  }
  c.querySelectorAll("[data-view-go]").forEach(b => b.onclick = () => { go(b.dataset.viewGo === "domains" ? state.domain : b.dataset.viewGo); document.getElementById("content").scrollIntoView({ block: "start" }); });
}

document.addEventListener("click", e => {
  const f = e.target.closest(".flow .fd"); if (f) { state.q = ""; document.getElementById("q").value = ""; go(f.dataset.dom); document.getElementById("content").scrollIntoView({ block: "start" }); return; }
  const v = e.target.closest("nav.views button"); if (v) { state.q = ""; document.getElementById("q").value = ""; go(v.dataset.view === "domains" ? state.domain : v.dataset.view); document.getElementById("content").scrollIntoView({ block: "start" }); return; }
  const h = e.target.closest("button.hd"); if (h) { const s = h.parentElement; const open = !s.hasAttribute("open"); s.toggleAttribute("open", open); h.setAttribute("aria-expanded", open); if (open && !state.q) { state.wf = h.dataset.wf; history.replaceState(null, "", "#" + state.wf); } return; }
  const nf = e.target.closest("button.nf"); if (nf) { state[nf.dataset.nf] = nf.dataset.v; render(); return; }   // v15: register filters
  const ev = e.target.closest(".ev"); if (ev) {
    state.event = ev.dataset.ev; state.q = ""; document.getElementById("q").value = "";
    if (state.view !== "domains") {   // v18: an event chip outside the Domains view (the Start here primer) opens the panel on the emitter's domain
      const em = WF.find(w => w.emits.some(x => x.replace(/\s*\(.*\)$/, "") === state.event));
      state.view = "domains"; state.domain = em ? em.domain.id : state.domain; state.wf = null;
      history.replaceState(null, "", "#" + state.domain);
    }
    render(); const pnl = document.querySelector(".evpanel"); if (pnl) pnl.scrollIntoView({ block: "start" }); return; }
  if (e.target.closest("[data-close]")) { state.event = null; render(); }
});
document.addEventListener("keydown", e => { if (e.key === "Enter" && (e.target.classList.contains("ev") || e.target.classList.contains("st"))) e.target.click(); });
document.getElementById("q").addEventListener("input", e => { state.q = e.target.value.trim(); render(); });
window.addEventListener("hashchange", route);
// v9: remember whether the viewer collapsed the flow strip (per browser; storage may be unavailable).
// Set up once at load, not in renderHero, which runs on every render.
(() => {
  const fw = document.getElementById("flowwrap");
  try { if (localStorage.getItem("helix.flow") === "closed") fw.open = false; } catch (e) {}
  fw.addEventListener("toggle", () => { try { localStorage.setItem("helix.flow", fw.open ? "open" : "closed"); } catch (e) {} });
})();
route();
</script>
</body>
</html>
