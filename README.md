# Explorer generator (v6, November 10, 2026)

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
