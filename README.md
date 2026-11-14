# Explorer generator (v14, November 13, 2026)

Builds the Explorer page from the three master Docs. Nothing on the page is typed by hand.

    python3 gen.py doc.md hitl.md retention.md head.html tail.js > index.html

Inputs: markdown exports of Helix Domains & Workflows (doc.md), Helix Human-in-the-Loop Map (hitl.md),
Helix Record Retention Table (retention.md). head.html and tail.js are the page's CSS and JavaScript;
style changes go there, never in index.html.

The parser stops on anything it does not recognize (a new field label, a new section, a table with the
wrong column count, a reason title with no chip key). It warns when a workflow has no "Applies to" line
(no type chips) and when a Human-in-the-Loop row names a workflow the Doc does not have.

v3: the Human-in-the-Loop reasons section may be headed "Four", "Five" or "Six reasons a human is needed";
the count must match the list. Reason titles map to chip keys in REASON_KEYS in gen.py (Relationship added);
a new reason title needs a key there and a .rsn color rule in head.html. The page reads the heading from the Doc.

v4: the workflow field "Turns on when" is renamed "Listens for" in the Doc and in FIELDS/REQUIRED; the parser stops on the old label. The "Shared record state machines" table has four columns: Record, Owner, Created by, Why it must be
defined first. "Created by" lists the workflows that create the record, separated by "; ", each optionally
followed by a parenthetical such as "(Predicted)". Each name must match a workflow heading in the Doc; the
page renders it as a chip linking to that workflow's card. The parser stops if the third header is not
"Created by".

Regenerate and publish to https://claude.ai/artifact/2P9cNRF9giRyFwbJrdY1PF after every Doc change.

v5: six Helix employment types (Local Long Term added; `HELIX` replaces `FIVE`); an Applies-to line saying "all five employment types" stops the run. The Doc's "### Work Classification" section, between the numbered rules and "### Shared record state machines", is parsed as prose blocks and pipe tables in order (`rules.workClassification`) and rendered on the Rules view under the rules list.

v6: Applies-to lines are written in Work Classification field terms (engagement unit, employed-by, and so on), with the employment types for human and Aya readers in a trailing parenthetical such as "(Travel, Local Long Term, Per Diem, WFD, Locums; not Perm, IRP)" or "(all six types, IRP included)". The type chips are read from the last parenthetical that names a type (so a later aside such as "(definition open)" is skipped): types before its first "not" are on, types after are off; "all six types" expands to the six Helix types, plus IRP when the parenthetical says so; "X only" means X and nothing after the word only is read. A line with no parenthetical is read as in v5. The field terms themselves are shown as the line's note and are not parsed.

v7: a numbered rule may carry its own indented sub-bullets ("   - ..."); they attach to the rule above and render as a list inside its card (a bullet before the first rule stops the run). Before v7 those lines were swept into the lead paragraph.

v8: the Rules view's "### Assumptions" section is optional. The Doc dropped it on November 12, 2026 (decisions and their dates live only in the Decisions Log); when it is absent the page renders no Assumptions heading. A present section is parsed as before.

v9: gen.py stamps the regeneration date and time (Pacific, 12-hour clock) into the page as `built`, and the hero eyebrow shows "Regenerated <stamp>" instead of the master Doc's byline date, which only changed when someone edited the Doc by hand. The hero lede in head.html (hand-written scope text, the one hand-typed paragraph on the page) now states the Helix-as-Aya operating model and the employment types scoped in and out; re-check it whenever the Doc's "How to read this" section changes.

v9 (same release): the hero's domains-by-stage strip (the flow grid under the counts) is a collapsible section, open by default; the viewer's open/closed choice is kept in localStorage per browser.

v10: the master Doc may carry a "## Not modeled" section (a lede, a four-column table of Area, What it is, Why it is not modeled, What brings it in, and an optional footer). gen.py parses it into DOC.notModeled and the page shows it as a "Not modeled" view beside Open items. The section is optional; a Doc without it still builds.

v11: the Open items view is removed. Open items live only in the Decisions Log, as numbered entries (DL-nnn) with owner, due date and status, where the resolution, who decided it and when are recorded on the same entry. gen.py stops if the master Doc still carries a "## Still open" section; DOC.open no longer exists and tail.js has no renderOpen. 

v12: the Human-in-the-Loop Map's "## Open" section and the Retention Table's "## Still open" section are removed; their items are DL entries in the Decisions Log. gen.py stops if either section comes back; HITL.open and RETENTION.open no longer exist and their views render no open list.

v12 (November 13, 2026, later): the hero lede's scoped-out sentence in head.html now points to the Not modeled view instead of naming Access Control, since the table carries every scoped-out area.

v13 (November 13, 2026): on the Records view a state chip shows the state name only. A parenthetical after a state in the record row's state list (a Pending human role, a deadline, a review date) is moved into the card's Details notes as "State: detail." Splitting the state list now respects parentheses, so a parenthetical with a comma no longer breaks the chips.

v14 (November 13, 2026): the master Doc may carry a "### Record transitions" section after the "Shared record
state machines" table (before "### Assumptions" if that ever returns): a lede, then one "#### <Record>" per
record with one six-column table: From, To, Owning workflow, Listens for, Emits, Pending human. <Record> must
match the first column of a records-table row. From is blank on a creation row; a cell that is not decided
reads exactly "open: DL-nnn". Listens for and Emits are comma lists outside parentheses; an item starting with a
capital letter is an event name (a trailing parenthetical is a qualifier, not part of the name), an item in lower
case is a source and is not checked. gen.py parses it into DOC.rules.transitions and runs three checks that stop
the run: every state in the record row's chip list appears in From or To and every From/To state is in that
list; every event a row emits is on the owning workflow's Emits line; every event a row listens for is emitted by
some workflow. The owning workflow must be a workflow in the Doc, and a creation row's owner must be in the
record's Created by column. The section is optional; a Doc without it still builds. tail.js draws each record's
table under its card on the Records view (state chips, owner chip linked to the workflow, event chips, open
cells as dashed amber chips) and shows the section lede under the Records lead; head.html styles .trans.
