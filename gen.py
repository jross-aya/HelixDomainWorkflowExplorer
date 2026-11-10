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

TYPES = ["Travel", "Per Diem", "WFD", "Locums", "Perm", "IRP"]
FIVE = TYPES[:5]

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
    """'Applies to' line -> ordered list of types it runs for."""
    s = line
    pos, neg = re.split(r'\bNot\b|\bnot\b', s, 1) if re.search(r'\bNot\b|\bnot\b', s) else (s, "")
    if re.search(r'all (five|six) employment types', pos):
        types = list(FIVE) + (["IRP"] if "IRP" in pos else [])
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

def parse_rules(body):
    main, _, rest = body.partition("\n### Shared record state machines")
    if not rest: die("Rules: no 'Shared record state machines' section")
    lede, items = [], []
    for line in main.split("\n"):
        m = re.match(r'\d+\.\s+\*\*(.+?)\*\*\s*(.*)', line)
        if m: items.append([clean(m.group(1)), clean(m.group(2))])
        elif line.strip(): lede.append(clean(line))
    recs_md, _, assumptions = rest.partition("\n### Assumptions")
    if not assumptions: die("Rules: no 'Assumptions' section")
    rec_lede = [clean(l) for l in recs_md.split("\n") if l.strip() and not l.startswith("|")]
    hdr, records = md_table(recs_md.split("\n"), 4)
    if hdr[2] != "Created by": die(f"Records table: third column must be 'Created by', got {hdr[2]!r}")
    assum_title, _, assum_body = assumptions.partition("\n")
    assum = [clean(l[2:]) for l in assum_body.split("\n") if l.startswith("- ")]
    stray = [l for l in assum_body.split("\n") if l.strip() and not l.startswith("- ")]
    if stray: die(f"Assumptions: non-list text {stray[0][:60]!r}")
    return {"lede": " ".join(lede), "rules": items, "recordsLede": " ".join(rec_lede), "records": records,
            "assumptionsTitle": clean(assum_title), "assumptions": assum}

def parse_open(body):
    out = {"lede": "", "groups": [], "footer": ""}
    cur = None
    for line in body.split("\n"):
        if not line.strip(): continue
        if re.match(r'^(Decided .*|Still open):$', line):
            cur = {"title": line.rstrip(":"), "items": [], "done": not line.startswith("Still")}; out["groups"].append(cur)
        elif line.startswith("- [x] ") or line.startswith("- [ ] "):
            if cur is None:
                cur = {"title": "Still open", "items": [], "done": False}; out["groups"].append(cur)
            cur["items"].append(clean(line[6:]))
        elif cur is None: out["lede"] += clean(line) + " "
        else: out["footer"] += clean(line) + " "
    out["lede"] = out["lede"].strip(); out["footer"] = out["footer"].strip()
    if not out["groups"]: die("Still open: no items")
    return out

def parse_doc(md):
    secs, order = split_h(md, 2)
    head_lines = [l for l in secs.pop("_head").split("\n") if l.strip()]
    title = head_lines[0].lstrip("# ").strip()
    byline = clean(head_lines[1]); asof = clean(" ".join(head_lines[2:]))
    how = secs.pop("How to read this")
    rules = parse_rules(secs.pop("Rules that apply to every workflow"))
    open_ = parse_open(secs.pop("Still open"))
    domains = [parse_domain(t, secs[t]) for t in order if t in secs]
    return {"title": title, "byline": byline, "asof": asof, "how": clean(how), "rules": rules, "open": open_, "domains": domains}

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
    open_ = [clean(l[2:]) for l in secs.pop("Open").split("\n") if l.startswith("- ")]
    if secs: die(f"HITL: unknown sections {list(secs)}")
    return {"lede": lede, "reasonsTitle": reasons_title, "reasons": reasons, "rule": rule, "roles": roles, "points": points, "open": open_}

# ---------- Record Retention Table ----------

def parse_retention(md):
    secs, order = split_h(md, 2)
    head = [l for l in secs.pop("_head").split("\n") if l.strip()]
    lede = " ".join(clean(l) for l in head[2:])
    bullets = lambda k: [clean(l[2:]) for l in secs.pop(k).split("\n") if l.startswith("- ")]
    corrections = bullets("Two corrections to common assumptions")
    _, rows = md_table(secs.pop("Retention by record").split("\n"), 6)
    forces = bullets("What this forces on the design")
    open_ = bullets("Still open")
    sources = bullets("Sources checked")
    if secs: die(f"Retention: unknown sections {list(secs)}")
    return {"lede": lede, "corrections": corrections, "rows": rows, "forces": forces, "open": open_, "sources": sources}

# ---------- main ----------

def main():
    if len(sys.argv) != 6: die(__doc__)
    rd = lambda p: open(p, encoding="utf-8").read()
    doc = parse_doc(rd(sys.argv[1]))
    hitl = parse_hitl(rd(sys.argv[2]))
    ret = parse_retention(rd(sys.argv[3]))
    # cross-check: every HITL workflow name must exist in the Doc (modulo the page's alias table)
    names = {w["name"] for d in doc["domains"] for w in d["workflows"]}
    alias = {"Shift Fulfillment (IRP)": "Shift Fulfillment", "EoR Hand-Off": "Employer of Record Hand-Off"}
    missing = sorted({p[0] for p in hitl["points"] if alias.get(p[0], p[0]) not in names})
    if missing: print(f"WARNING: HITL rows name workflows not in the Doc: {missing}", file=sys.stderr)
    js = ("const DOC = " + json.dumps(doc, ensure_ascii=False, indent=1) + ";\n"
          + "const HITL = " + json.dumps(hitl, ensure_ascii=False, indent=1) + ";\n"
          + "const RETENTION = " + json.dumps(ret, ensure_ascii=False, indent=1) + ";\n")
    sys.stdout.write(rd(sys.argv[4]) + js + rd(sys.argv[5]))
    n = sum(len(d["workflows"]) for d in doc["domains"])
    print(f"domains={len(doc['domains'])} workflows={n} records={len(doc['rules']['records'])} rules={len(doc['rules']['rules'])} "
          f"open={sum(len(g['items']) for g in doc['open']['groups'])} hitl-points={len(hitl['points'])} retention-rows={len(ret['rows'])}", file=sys.stderr)

if __name__ == "__main__": main()
