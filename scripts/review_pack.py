"""Build the compliance review pack for the practice shift from the content pack.

Run from the repo root:  python3 scripts/review_pack.py
Writes docs/review/first-shift-review-pack.md and .docx. Nothing here is typed by hand: it is the pack, laid out for sign-off.
"""
import json, re, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "src/content/clients/the-intro-broadbent"
OUT = ROOT / "docs/review"

client = json.loads((PACK / "client.json").read_text())
rules = json.loads((PACK / "rules.json").read_text())
codes = json.loads((PACK / "dispositions.json").read_text())
shift = json.loads((PACK / "shift.json").read_text())
names = {k: client[k] for k in ("employer", "client", "clientShort", "caller")}

def fill(text):
    return re.sub(r"\{\{(\w+)\}\}", lambda m: names.get(m.group(1), m.group(0)), text)

rule_by_id = {r["id"]: r for r in rules}
code_by_id = {c["id"]: c for c in codes}
WHO = {"prospect": "Prospect", "you": "Caller (played for the learner)", "note": "Narration"}

# One flat list of rows. Each row is one thing a reviewer ticks or changes.
sections = []

rows = [(f"R{i + 1}", r["title"], fill(r["quote"]), f'{r["doc"]}, {r["section"]}', "Critical if broken" if r["critical"] else "Standard")
        for i, r in enumerate(rules)]
sections.append(("1. Rules quoted in the debrief",
                 "Each rule is quoted word for word from the source named beside it. Check the wording, the source and whether a breach should be critical.",
                 ["Ref", "Rule", "Exact words shown to the learner", "Source", "Weight"], rows))

rows = [(f"D{i + 1}", c["name"], fill(c["when"])) for i, c in enumerate(codes)]
sections.append(("2. Wrap codes",
                 "The list the learner picks from after every call. Taken from SOP v1.4, section 2.2.",
                 ["Ref", "Code", "When to use"], rows))

for n, call in enumerate(shift["calls"], 1):
    rows = []
    k = 0
    for node_id, node in call["nodes"].items():
        for line in node["lines"]:
            k += 1
            rows.append((f"C{n}.{k}", WHO[line["who"]], fill(line["text"]), ""))
        for o in node.get("options", []):
            k += 1
            kept = ", ".join(rule_by_id[r]["title"] for r in o["keeps"])
            broken = ", ".join(rule_by_id[r]["title"] for r in o["breaks"])
            verdict = "Right line" if not o["breaks"] else "Weak line"
            detail = "; ".join(x for x in [f"Keeps: {kept}" if kept else "", f"Breaks: {broken}" if broken else ""] if x)
            rows.append((f"C{n}.{k}", f'Learner option. {verdict}. Moment: {node.get("moment", "")}', fill(o["text"]), detail))
    d = call["disposition"]
    right = " or ".join(code_by_id[c]["name"] for c in d["correct"])
    k += 1
    rows.append((f"C{n}.{k}", "Right wrap code", right,
                 f'{rule_by_id[d["rule"]]["title"]}. {"Any other code is a critical error." if d["missIsCritical"] else "Any other code is scored as wrong."}'))
    sections.append((f'{n + 2}. Call {n}: {call["prospect"]["name"]} (fictional)',
                     "Every line the learner hears or can say on this call, in order.",
                     ["Ref", "What it is", "Words", "Rules it keeps or breaks"], rows))

QUESTIONS = [
    "SOP 2.6 says to end the call if a customer will not be recorded. It does not name the wrap code. Which code should the learner pick?",
    'SOP 3.1 says "Disposition as Over 60s". The list in SOP 2.2 has no such code. Which is right?',
    "The draft treats three breaches as critical: a missed DNC, giving advice or a quote, and saying you are from the client. Is that the right list?",
    "The caller's line when someone asks not to be called again is our draft. The sources give the rule but no set words. Please confirm or replace it.",
]

today = datetime.date.today().strftime("%-d %B %Y")
title = f'{client["title"]}: compliance review pack'
intro = [
    f'For {client["reviewers"]} at {client["employer"]}. Built on {today} from the content pack. Status of every item: review pending.',
    "How to use it: tick the box if the item can go live as written. If not, write the change in the last column. Sign the block at the end.",
    f'Every prospect is fictional. Nothing here is advice. The simulation shows "{client["draftLabel"]}" on screen until this pack is signed.',
]

# ---- Markdown ----
def cell(text):
    return str(text).replace("|", "\\|").replace("\n", " ")

md = [f"# {title}", ""] + [p + "\n" for p in intro]
for heading, note, cols, rows in sections:
    md += [f"## {heading}", "", note, "", "| " + " | ".join(cols + ["OK", "Change needed"]) + " |", "|" + "---|" * (len(cols) + 2)]
    md += ["| " + " | ".join([cell(c) for c in r] + ["☐", ""]) + " |" for r in rows]
    md.append("")
md += ["## Questions the sources do not answer", ""] + [f"{i}. {q}" for i, q in enumerate(QUESTIONS, 1)] + [""]
md += ["## Sign-off", "", "| | |", "|---|---|", "| Reviewed by (print) | |", "| Role | |", "| Approved as written, or approved with the changes marked | |", "| Signature | |", "| Date | |", ""]
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "first-shift-review-pack.md").write_text("\n".join(md).replace(" — ", ", ").replace("—", ","))

# ---- Word ----
from docx import Document
from docx.enum.section import WD_ORIENT
from docx.shared import Pt, Cm

doc = Document()
sec = doc.sections[0]
sec.orientation = WD_ORIENT.LANDSCAPE
sec.page_width, sec.page_height = sec.page_height, sec.page_width
for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
    setattr(sec, side, Cm(1.6))
doc.styles["Normal"].font.name = "Arial"
doc.styles["Normal"].font.size = Pt(9.5)

def clean(text):
    return str(text).replace(" — ", ", ").replace("—", ",")

doc.add_heading(title, 0)
for p in intro:
    doc.add_paragraph(p)
for heading, note, cols, rows in sections:
    doc.add_heading(clean(heading), 1)
    doc.add_paragraph(note)
    head = cols + ["OK", "Change needed"]
    table = doc.add_table(rows=1, cols=len(head))
    table.style = "Table Grid"
    for i, h in enumerate(head):
        c = table.rows[0].cells[i]
        c.text = h
        for run in c.paragraphs[0].runs:
            run.bold = True
    for r in rows:
        cells = table.add_row().cells
        for i, v in enumerate(list(r) + ["☐", ""]):
            cells[i].text = clean(v)
    widths = {"Ref": 1.3, "OK": 1.0, "Change needed": 5.5}
    for i, h in enumerate(head):
        if h in widths:
            for row in table.rows:
                row.cells[i].width = Cm(widths[h])
doc.add_heading("Questions the sources do not answer", 1)
for q in QUESTIONS:
    doc.add_paragraph(q, style="List Number")
doc.add_heading("Sign-off", 1)
table = doc.add_table(rows=0, cols=2)
table.style = "Table Grid"
for label in ["Reviewed by (print)", "Role", "Approved as written, or approved with the changes marked", "Signature", "Date"]:
    cells = table.add_row().cells
    cells[0].text = label
    cells[1].text = ""
doc.save(OUT / "first-shift-review-pack.docx")
print("review pack written:", sum(len(r) for _, _, _, r in sections), "items")
