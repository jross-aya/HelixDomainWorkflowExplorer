# Explorer generator (v4, November 10, 2026)

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

v4: the "Shared record state machines" table has four columns: Record, Owner, Created by, Why it must be
defined first. "Created by" lists the workflows that create the record, separated by "; ", each optionally
followed by a parenthetical such as "(Predicted)". Each name must match a workflow heading in the Doc; the
page renders it as a chip linking to that workflow's card. The parser stops if the third header is not
"Created by".

Regenerate and publish to https://claude.ai/artifact/2P9cNRF9giRyFwbJrdY1PF after every Doc change.
