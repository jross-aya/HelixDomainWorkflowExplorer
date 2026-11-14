#!/usr/bin/env python3
"""Build the Explorer page from the three master Docs.

Usage: gen.py doc.md hitl.md retention.md head.html tail.js > index.html

Everything that reaches the page comes from the three markdown exports:
  doc.md       Helix Domains & Workflows   -> DOC
  hitl.md      Helix Human-in-the-Loop Map -> HITL
  retention.md Helix Record Retention Table -> RETENTION
The only thing this file adds is presentation metadata per domain (id, hue, layer, type,
role), which lives in META_DOMAINS and carries no content. Anything the parser does not
recognize stops the run; nothing is dropped silently.
"""
import json, re, sys

TYPES = ["Travel", "Per Diem", "WFD", "Locums", "Perm", "Local Long Term", "IRP"]
HELIX = TYPES[:6]  # the Helix employment types; IRP is Per Diem x client-employed

# Presentation only. Keyed by the Doc's "## " heading.
META_DOMAINS = {
    "Client Contracts & Account": dict(id="client-contracts", hue=205, layer="Layer 1", type="Supporting"),
    "Foundational Data Services": dict(id="foundational-data", hue=160, layer="Layer 0", type="Supporting", kind="Foundation"),
    "Integration Hub": dict(id="integration-hub", hue=270, layer="Platform service", type="Supporting", kind="Platform"),
    "Jobs": dict(id="jobs", hue=30, layer="Layer 2", type="Supporting"),
    "Job Pricing": dict(id="job-pricing", hue=48, layer="Layer 3", type="Core"),
    "Talent": dict(id="talent", hue=340, layer="Layer 2", type="Supporting"),
    "Matching": dict(id="matching", hue=190, layer="Layer 4", type="Core"),
    "Fulfillment": dict(id="fulfillment", hue=12, layer="Layer 5", type="Core"),
    "Employment Agreements": dict(id="employment-agreements", hue=225, layer="Layer 6", type="Supporting"),
    "Compliance": dict(id="compliance", hue=95, layer="Layer 3", type="Supporting + Generic"),
    "Mobilization": dict(id="mobilization", hue=320, layer="Layer 7", type="Core"),
    "Finance": dict(id="finance", hue=245, layer="Layer 9", type="Generic + Supporting"),
    "Talent Advocacy": dict(id="talent-advocacy", hue=140, layer="Alongside", type="Core"),
    "Client Advocacy": dict(id="client-advocacy", hue=15, layer="Alongside", type="Core"),
}
FIELDS = ["Key decision", "Decision", "Listens for", "Applies to", "Tasks", "Emits", "Measure", "Edge cases"]
REQUIRED = ["Key decision", "Listens for", "Tasks", "Emits", "Measure"]

def die(msg): raise SystemExit("gen.py: " + msg)

def clean(s):
    return s.replace("\\_", "_").replace("\\*", "*").replace("\\$", "$").replace("\\&", "&").strip()

def sentences(text):
    return [p.strip() for p in re.split(r'(?<=[.!?])\s+(?=[A-Z("\u201c])', text) if p.strip()]

def md_table(lines, ncols):
    rows = []
    for line in lines:
        if not line.startswith("|"): continue
        cells = [clean(c) for c in line.strip().strip("|").split(" | ")]
        if all(re.fullmatch(r'-+', c) for c in cells): continue
        if len(cells) != ncols: die(f"table row has {len(cells)} cells, expected {ncols}: {line[:80]!r}")
        rows.append(cells)
    return rows[0], rows[1:]

def split_h(md, level):
    marker = "#" * level + " "
    parts = re.split(r'\n(?=' + re.escape(marker) + ')', "\n" + md)
    out, order = {}, []
    for p in parts:
        p = p.strip("\n")
        if not p.startswith(marker): out["_head"] = p; continue
        title, _, body = p.partition("\n")
        t = title[len(marker):].strip()
        if t in out: die(f"duplicate heading {t!r}")
        out[t] = body.strip("\n"); order.append(t)
    return out, order

# ---------- Domains & Workflows ----------

def applies(line):
    """'Applies to' line -> ordered list of types it runs for.

    v6: the line is written in Work Classification field terms, with the employment types for
    human readers in a trailing parenthetical, e.g. "(Travel, Local Long Term; not Perm, IRP)" or
    "(all six types, IRP included)". The chips come from that parenthetical. A line with no
    parenthetical falls back to the v5 reading of the whole line."""
    m = [g for g in re.findall(r'\(([^()]*)\)', line)
         if re.search(r'all six|all five|' + '|'.join(r'\b' + re.escape(t) + r'\b' for t in TYPES), g)]
    s = m[-1] if m else line
    pos, neg = re.split(r'\bNot\b|\bnot\b', s, 1) if re.search(r'\bNot\b|\bnot\b', s) else (s, "")
    if re.search(r'\bonly\b', pos): pos = pos.split('only', 1)[0]   # "(Perm only)", "(IRP only: ...)"
    if re.search(r'all six (employment )?types', pos):
        types = list(HELIX) + (["IRP"] if "IRP" in pos else [])
    elif re.search(r'all five (employment )?types', pos):
        die(f"Applies to line still says five types (there are six): {line[:80]!r}")
    else:
        types = [t for t in TYPES if re.search(r'\b' + re.escape(t) + r'\b', pos)]
    if not types: die(f"Applies to line names no type: {line[:80]!r}")
    return types

def type_notes(w):
    pool = [w.get("added", ""), w["decision"], w["triggers"], *w["tasks"], w["measure"], w.get("edges", "")]
    notes = ["Applies to: " + w["applies"]] if "applies" in w else []
    for field in pool:
        for s in sentences(field):
            if any(re.search(r'\b' + re.escape(t) + r'\b', s) for t in TYPES): notes.append(s)
    return notes

def parse_workflow(name, body, part=None):
    w = {"name": name}
    if part: w["part"] = part
    m = re.search(r'\n\*\*(Key decision|Decision):\*\*', "\n" + body)
    if not m: die(f"{name}: no Key decision")
    pre = clean(("\n" + body)[:m.start()])
    if pre: w["added"] = pre
    rest = ("\n" + body)[m.start() + 1:]
    chunks = re.split(r'\n(?=\*\*[A-Za-z ]+(?: \([^)]*\))?:\*\*)', rest)
    seen, tasks_loose = set(), []
    for c in chunks:
        m = re.match(r'\*\*([A-Za-z ]+)(?: \(([^)]*)\))?:\*\*\s*(.*)', c, re.S)
        if not m: die(f"unparsed text in {name}: {c[:80]!r}")
        label, qual, val = m.group(1), m.group(2), m.group(3).strip()
        if label not in FIELDS: die(f"unknown field {label!r} in {name}")
        if label == "Decision": label = "Key decision"
        if label in seen: die(f"{name}: field {label!r} twice")
        seen.add(label)
        if label != "Tasks" and "\n- " in "\n" + val:
            # a bare list under a non-Tasks field: only legal as the task list of a workflow with no Tasks label
            lines = val.split("\n"); head = []
            for l in lines:
                if l.startswith("- "): tasks_loose.append(clean(l[2:]))
                elif l.strip() and tasks_loose: die(f"{name}: text after a loose list under {label}: {l[:60]!r}")
                else: head.append(l)
            val = "\n".join(head).strip()
        if label == "Tasks":
            items = [clean(l[2:]) for l in val.split("\n") if l.startswith("- ")]
            stray = [l for l in val.split("\n") if l.strip() and not l.startswith("- ")]
            if stray: die(f"non-list text in Tasks of {name}: {stray[0][:80]!r}")
            w["tasks"] = items
        elif label == "Emits":
            first, *note = sentences(clean(val))
            w["emits"] = [e.strip() for e in re.split(r",\s*(?![^()]*\))", first.rstrip(".")) if e.strip()]
            if note: w["emitsNote"] = " ".join(note)
        elif label == "Key decision": w["decision"] = clean(val)
        elif label == "Listens for": w["triggers"] = clean(val)
        elif label == "Applies to": w["applies"] = clean(val)
        elif label == "Measure": w["measure"] = clean(val)
        elif label == "Edge cases":
            w["edges"] = clean(val)
            if qual: w["edgesQual"] = clean(qual)
    if tasks_loose:
        if "Tasks" in seen: die(f"{name}: both a Tasks label and loose list items")
        w["tasks"] = tasks_loose; seen.add("Tasks")
    for f in REQUIRED:
        if f not in seen: die(f"{name} is missing {f}")
    if "applies" in w:
        w["types"] = applies(w["applies"])
    else:
        print(f"WARNING: {name} has no Applies to line; no type chips", file=sys.stderr)
        w["types"] = []
    w["typeNotes"] = type_notes(w)
    return w

def parse_domain(title, body):
    meta = META_DOMAINS.get(title)
    if not meta: die(f"no presentation metadata for domain {title!r}; add it to META_DOMAINS")
    secs, order = split_h(body, 3)
    d = dict(meta, name=title, intro=clean(secs.get("_head", "")), workflows=[])
    if "#### " in body:
        # parts mode: each ### is a part with a blurb, workflows are ####
        d["parts"] = []
        for part in order:
            wsecs, worder = split_h(secs[part], 4)
            d["parts"].append({"name": part, "blurb": clean(wsecs.get("_head", ""))})
            for wname in worder:
                d["workflows"].append(parse_workflow(wname, wsecs[wname], part=part))
    else:
        for wname in order:
            d["workflows"].append(parse_workflow(wname, secs[wname]))
    return d

def parse_blocks(md):
    """Prose lines and pipe tables, in order, as a list of {"p": text} | {"table": {"head": [...], "rows": [...]}}."""
    out, tbl = [], []
    def flush():
        if tbl:
            n = len(tbl[0].strip().strip("|").split(" | "))
            head, rows = md_table(tbl, n)
            out.append({"table": {"head": head, "rows": rows}}); tbl.clear()
    for line in md.split("\n"):
        if line.startswith("|"): tbl.append(line)
        else:
            flush()
            if line.strip(): out.append({"p": clean(line)})
    flush()
    return out

def parse_rules(body):
    main, _, rest = body.partition("\n### Shared record state machines")
    if not rest: die("Rules: no 'Shared record state machines' section")
    main, _, wc_md = main.partition("\n### Work Classification")
    if not wc_md: die("Rules: no 'Work Classification' section between the rules and the record table")
    lede, items = [], []
    for line in main.split("\n"):
        m = re.match(r'\d+\.\s+\*\*(.+?)\*\*\s*(.*)', line)
        b = re.match(r'\s+[-*]\s+(.*)', line)
        if m: items.append([clean(m.group(1)), clean(m.group(2)), []])
        elif b and items: items[-1][2].append(clean(b.group(1)))   # v7: a rule's own sub-bullets
        elif b: die(f"Rules: a bullet before the first numbered rule: {line.strip()[:60]!r}")
        elif line.strip(): lede.append(clean(line))
    wc = parse_blocks(wc_md)
    if sum(1 for b in wc if "table" in b) < 1: die("Work Classification: no inputs table")
    recs_md, _, assumptions = rest.partition("\n### Assumptions")   # v8: optional; the Doc dropped it November 12, 2026
    recs_md, _, trans_md = recs_md.partition("\n### Record transitions")   # v14: optional until the first table lands
    rec_lede = [clean(l) for l in recs_md.split("\n") if l.strip() and not l.startswith("|")]
    hdr, records = md_table(recs_md.split("\n"), 4)
    if hdr[2] != "Created by": die(f"Records table: third column must be 'Created by', got {hdr[2]!r}")
    transitions = parse_transitions(trans_md, records) if trans_md else {"lede": "", "records": {}}
    assum_title, assum = "", []
    if assumptions:
        assum_title, _, assum_body = assumptions.partition("\n")
        assum = [clean(l[2:]) for l in assum_body.split("\n") if l.startswith("- ")]
        stray = [l for l in assum_body.split("\n") if l.strip() and not l.startswith("- ")]
        if stray: die(f"Assumptions: non-list text {stray[0][:60]!r}")
    return {"lede": " ".join(lede), "rules": items, "workClassification": wc, "recordsLede": " ".join(rec_lede), "records": records,
            "transitions": transitions, "assumptionsTitle": clean(assum_title), "assumptions": assum}

# ---------- Record transitions (v14) ----------

TRANS_COLS = ["From", "To", "Owning workflow", "Listens for", "Emits", "Pending human"]
OPEN = re.compile(r'^open: DL-\d{3}$')   # a cell not yet decided: the Decisions Log entry id and nothing else

def record_states(row):
    """The state list of a records-table row, read the way tail.js reads it for the chips (v13): the first of
    the row's first three sentences that is a comma list of 3 to 14 Capitalized names of at most five words,
    each optionally followed by a parenthetical. Returns [] when the row has no such list (a status list in
    prose, or a row with no states)."""
    for sent in sentences(row[3])[:3]:
        body = re.sub(r'^[^:(]{0,80}:\s*', '', sent).rstrip('.')
        parts, cur, depth = [], "", 0
        i = 0
        while i < len(body):
            ch = body[i]
            if ch == "(": depth += 1
            elif ch == ")": depth = max(0, depth - 1)
            if depth == 0 and ch == "," and body[i + 1:i + 2] == " ":
                parts.append(cur.strip()); cur = ""; i += 2; continue
            cur += ch; i += 1
        if cur.strip(): parts.append(cur.strip())
        if not 3 <= len(parts) <= 14: continue
        states = []
        for p in parts:
            m = re.match(r'^([^(]+?)\s*\((.+)\)\s*$', p)
            name = (m.group(1) if m else p).strip()
            if not re.match(r'^[A-Z]', name) or len(name.split()) > 5: states = None; break
            states.append(name)
        if states: return states
    return []

def parse_transitions(md, records):
    """v14: the "### Record transitions" section: a lede, then one "#### <Record>" per record with one
    six-column table (TRANS_COLS). Cells hold the value, nothing, or "open: DL-nnn". Listens for lists the
    events that move the record, each spelled exactly as its emitter's Emits line spells it (a parenthetical
    qualifier is allowed), or a source written in lower case (a person's action, a date arriving), separated
    by commas. The three checks run in main() once every workflow is parsed; here the shape is checked."""
    secs, order = split_h(md, 4)
    lede = " ".join(clean(l) for l in secs.get("_head", "").split("\n") if l.strip())
    names = {r[0] for r in records}
    out = {}
    for rec in order:
        if rec not in names: die(f"Record transitions: {rec!r} is not a row of the records table")
        body = secs[rec]
        lines = body.split("\n")
        tbl = [l for l in lines if l.startswith("|")]
        if not tbl: die(f"Record transitions: {rec} has no table")
        stray = [l for l in lines if l.strip() and not l.startswith("|")]
        if stray: die(f"Record transitions: {rec}: text outside the table: {stray[0][:60]!r}")
        hdr, rows = md_table(tbl, 6)
        if hdr != TRANS_COLS: die(f"Record transitions: {rec}: columns must be {TRANS_COLS}, got {hdr}")
        for r in rows:
            frm, to, owner, listens, emits, human = r
            if not to: die(f"Record transitions: {rec}: a row with no To state: {r}")
            if not owner: die(f"Record transitions: {rec}: {frm or 'Created'} -> {to} has no owning workflow")
            for c in r:
                if c.lower().startswith("open:") and not OPEN.match(c): die(f"Record transitions: {rec}: an open cell reads {c!r}; it must be exactly 'open: DL-nnn'")
        out[rec] = rows
    return {"lede": lede, "records": out}

def split_events(cell):
    """A Listens for or Emits cell -> list of (name, is_event). Items are comma-separated outside parentheses;
    a trailing parenthetical is a qualifier, not part of the name. An item that starts with a capital letter is
    an event name; one that starts in lower case is a source and is not checked."""
    if not cell or OPEN.match(cell): return []
    items = [e.strip() for e in re.split(r",\s*(?![^()]*\))", cell) if e.strip()]
    out = []
    for it in items:
        name = re.sub(r'\s*\([^()]*\)\s*$', '', it).strip()
        out.append((name, bool(re.match(r'^[A-Z]', name))))
    return out

def check_transitions(doc):
    """v14: the three checks. (1) every chip state of the record appears in From or To, and every From/To
    state is a chip state; (2) every event a row emits is on the owning workflow's Emits line; (3) every event
    a row listens for is emitted by some workflow. An open cell is skipped. Any failure stops the run."""
    trans = doc["rules"]["transitions"]["records"]
    if not trans: return
    wfs = {w["name"]: w for d in doc["domains"] for w in d["workflows"]}
    emitted = {}
    for w in wfs.values():
        for e in w["emits"]:
            emitted.setdefault(re.sub(r'\s*\([^()]*\)\s*$', '', e).strip(), set()).add(w["name"])
    byname = {r[0]: r for r in doc["rules"]["records"]}
    for rec, rows in trans.items():
        row = byname[rec]
        states = record_states(row)
        if not states: die(f"Record transitions: {rec} has a table but its record row has no state list the page can read")
        creators = {re.sub(r'\s*\(.*\)$', '', c).strip() for c in row[2].split(";") if c.strip()}
        seen = set()
        for frm, to, owner, listens, emits, human in rows:
            if owner not in wfs: die(f"Record transitions: {rec}: owning workflow {owner!r} is not a workflow in the Doc")
            if not frm and owner not in creators: die(f"Record transitions: {rec}: {owner} creates the record but is not in its Created by column")
            for s in (frm, to):
                if s and not OPEN.match(s):
                    if s not in states: die(f"Record transitions: {rec}: state {s!r} is not in the record's state list {states}")
                    seen.add(s)
            for name, is_event in split_events(emits):
                if not is_event: die(f"Record transitions: {rec}: {frm or 'Created'} -> {to}: Emits {name!r} is not an event name")
                if name not in [re.sub(r'\s*\([^()]*\)\s*$', '', e).strip() for e in wfs[owner]["emits"]]:
                    die(f"Record transitions: {rec}: {frm or 'Created'} -> {to} emits {name!r}, which is not on {owner}'s Emits line (Rule 9: fix the name in one place, do not invent a third)")
            for name, is_event in split_events(listens):
                if is_event and name not in emitted:
                    die(f"Record transitions: {rec}: {frm or 'Created'} -> {to} listens for {name!r}, which no workflow emits (Rule 9: use the emitter's name, or write a source in lower case)")
        missing = [s for s in states if s not in seen]
        if missing: die(f"Record transitions: {rec}: states with no transition row: {missing}")
    n = sum(len(r) for r in trans.values())
    print(f"transitions: {len(trans)} records, {n} rows; checks passed (states, Emits on owner, Listens for emitted)", file=sys.stderr)

def parse_doc(md):
    secs, order = split_h(md, 2)
    head_lines = [l for l in secs.pop("_head").split("\n") if l.strip()]
    title = head_lines[0].lstrip("# ").strip()
    byline = clean(head_lines[1]); asof = clean(" ".join(head_lines[2:]))
    how = secs.pop("How to read this")
    rules = parse_rules(secs.pop("Rules that apply to every workflow"))
    if "Still open" in secs: die('"Still open" section: open items live only in the Decisions Log (v11); remove the section from the Doc')  # v11
    not_modeled = parse_not_modeled(secs.pop("Not modeled")) if "Not modeled" in secs else {"lede": "", "rows": [], "footer": ""}  # v10
    domains = [parse_domain(t, secs[t]) for t in order if t in secs]
    import datetime, zoneinfo  # v9: stamp the regeneration date so the page's "Regenerated" never lags the Docs
    try: tz = zoneinfo.ZoneInfo("America/Los_Angeles")
    except zoneinfo.ZoneInfoNotFoundError: die("no time zone data for America/Los_Angeles; on Windows run: pip install tzdata")
    now = datetime.datetime.now(tz)
    # built by hand, not with %-d / %-I, which Windows strftime rejects
    built = f"{now:%b} {now.day}, {now.year}, {now.hour % 12 or 12}:{now:%M %p} PT"
    return {"title": title, "byline": byline, "asof": asof, "built": built, "how": clean(how), "rules": rules, "notModeled": not_modeled, "domains": domains}

def parse_not_modeled(body):
    """v10: the master Doc's optional "## Not modeled" section: a lede, one 4-column table
    (Area, What it is, Why it is not modeled, What brings it in), and an optional footer."""
    lines = body.split("\n")
    tbl = [l for l in lines if l.startswith("|")]
    if not tbl: die("Not modeled: no table")
    first = next(i for i, l in enumerate(lines) if l.startswith("|"))
    last = max(i for i, l in enumerate(lines) if l.startswith("|"))
    lede = " ".join(clean(l) for l in lines[:first] if l.strip())
    footer = " ".join(clean(l) for l in lines[last + 1:] if l.strip())
    _, rows = md_table(tbl, 4)
    return {"lede": lede, "rows": rows, "footer": footer}

# ---------- Human-in-the-Loop Map ----------

# Short keys the page uses as chips, by reason title. Any reason title not listed here stops the run.
REASON_KEYS = {"Required by law or policy": "Law", "Authority over money or liability": "Authority", "Stuck": "Stuck",
               "Physical world or no API": "No-API", "Relationship": "Relationship"}

def parse_hitl(md):
    secs, order = split_h(md, 2)
    head = [l for l in secs.pop("_head").split("\n") if l.strip()]
    lede = " ".join(clean(l) for l in head[2:])  # title, byline, then the lede paragraphs
    reasons_title = next((t for t in order if re.fullmatch(r'(Four|Five|Six) reasons a human is needed', t)), None)
    if not reasons_title: die("HITL: no 'N reasons a human is needed' section")
    reasons = []
    for line in secs.pop(reasons_title).split("\n"):
        m = re.match(r'\d+\.\s+\*\*(.+?)\.?\*\*\s*(.*)', line)
        if m: reasons.append([clean(m.group(1)), clean(m.group(2))])
        elif line.strip(): die(f"HITL reasons: non-list line {line[:60]!r}")
    expected = {"Four": 4, "Five": 5, "Six": 6}[reasons_title.split()[0]]
    if len(reasons) != expected: die(f"HITL: {len(reasons)} reasons, heading says {expected}")
    unknown = [t for t, _ in reasons if t not in REASON_KEYS]
    if unknown: die(f"HITL: reason with no chip key: {unknown}; add it to REASON_KEYS")
    reasons = [[REASON_KEYS[t], t + ". " + body if not body.startswith(t) else body] for t, body in reasons]
    rule = clean(secs.pop("Design rule"))
    _, roles = md_table(secs.pop("Roles").split("\n"), 2)
    _, points = md_table(secs.pop("Human points by workflow").split("\n"), 4)
    if "Open" in secs: die('HITL "Open" section: open items live only in the Decisions Log (v12); remove the section from the Doc')  # v12
    if secs: die(f"HITL: unknown sections {list(secs)}")
    return {"lede": lede, "reasonsTitle": reasons_title, "reasons": reasons, "rule": rule, "roles": roles, "points": points}

# ---------- Record Retention Table ----------

def parse_retention(md):
    secs, order = split_h(md, 2)
    head = [l for l in secs.pop("_head").split("\n") if l.strip()]
    lede = " ".join(clean(l) for l in head[2:])
    bullets = lambda k: [clean(l[2:]) for l in secs.pop(k).split("\n") if l.startswith("- ")]
    corrections = bullets("Two corrections to common assumptions")
    _, rows = md_table(secs.pop("Retention by record").split("\n"), 6)
    forces = bullets("What this forces on the design")
    if "Still open" in secs: die('Retention "Still open" section: open items live only in the Decisions Log (v12); remove the section from the Doc')  # v12
    sources = bullets("Sources checked")
    if secs: die(f"Retention: unknown sections {list(secs)}")
    return {"lede": lede, "corrections": corrections, "rows": rows, "forces": forces, "sources": sources}

# ---------- main ----------

def main():
    if len(sys.argv) != 6: die(__doc__)
    rd = lambda p: open(p, encoding="utf-8").read()
    doc = parse_doc(rd(sys.argv[1]))
    hitl = parse_hitl(rd(sys.argv[2]))
    ret = parse_retention(rd(sys.argv[3]))
    # cross-check: every HITL workflow name must exist in the Doc (modulo the page's alias table)
    check_transitions(doc)   # v14
    names = {w["name"] for d in doc["domains"] for w in d["workflows"]}
    alias = {"Shift Fulfillment (IRP)": "Shift Fulfillment", "EoR Hand-Off": "Employer of Record Hand-Off"}
    missing = sorted({p[0] for p in hitl["points"] if alias.get(p[0], p[0]) not in names})
    if missing: print(f"WARNING: HITL rows name workflows not in the Doc: {missing}", file=sys.stderr)
    js = ("const DOC = " + json.dumps(doc, ensure_ascii=False, indent=1) + ";\n"
          + "const HITL = " + json.dumps(hitl, ensure_ascii=False, indent=1) + ";\n"
          + "const RETENTION = " + json.dumps(ret, ensure_ascii=False, indent=1) + ";\n")
    sys.stdout.write(rd(sys.argv[4]) + js + rd(sys.argv[5]))
    n = sum(len(d["workflows"]) for d in doc["domains"])
    wc_rows = next(len(b["table"]["rows"]) for b in doc["rules"]["workClassification"] if "table" in b)  # first table; parse_rules guarantees one
    print(f"domains={len(doc['domains'])} workflows={n} records={len(doc['rules']['records'])} rules={len(doc['rules']['rules'])} wc-inputs={wc_rows} "
          f"hitl-points={len(hitl['points'])} retention-rows={len(ret['rows'])} not-modeled={len(doc['notModeled']['rows'])}", file=sys.stderr)

if __name__ == "__main__": main()
