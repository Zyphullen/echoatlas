# Echo Atlas · AI info (v0.8)

Echo Atlas by Zyphullen is one website for knowledge, known and unknown. Every fact is coloured by certainty and linked to its sources.
This folder splits the site's data into **one file per section**, so an AI can load only the part it needs and stay inside its context limit.

**Data hash:** `49e748a9f816` (the same as `DATA_HASH` in the page and `data_hash` in every file below). **Built:** 2026-11-13.

## For AI / SI readers: what is already here
- 📦 **Each section file is complete for its section.** It holds the facts (`summary`, `details`), the colours (`certainty`), the sources (`sources`, full details in `sources_used`) and the **connections between ideas**: links inside the section and links to cards in other sections (`rel`, `related`, `section_links`, each naming the other section and card id).
- 🔗 To follow a link into another section, load that section's file (listed in `about.other_sections`) and find the card by `id`. You do not need the website or JavaScript.
- 🧭 To send a person to a card, give them its `share_url`.

## How to use the site
- 🏠 **Home** has one tile per section. **Explore** (top bar) lists them in a fixed order: From Nothing to Us (Map / Ring / History), Universe, Physics, Biology (with Virtual Cell and Human Body), Maths (Map / Ring / History), Open questions.
- 🔭 **Universe** (`#universe=1`, one stop: `#u=<id>`): drag to turn, zoom to move between scales.
- ❓ **Open questions** (`#gaps=1`): every red and orange card in one list, filter by colour or section, then jump to the real card.
- 🟡 The yellow **AI / SI info** button opens these files for people.

## Start here
1. 📂 Pick the section you need from the table and load only that file.
2. 🧭 Need everything? Load [facts.json](../facts.json) (all sections, about 558k tokens).
3. 🗂️ Need the list as data? Load [index.json](index.json).
4. 📖 Every field is explained in [FACTS-GUIDE.md](../FACTS-GUIDE.md).

## Section files
| Section | What is in it | Sources | Size |
|---|---|---|---|
| [From Nothing to Us](from-nothing-to-us.json) | 93 nodes, 145 links, 25 crosslinks_to_maths | 245 (223 papers / official) | ~82k |
| [Big Bang to Today](big-bang-to-today.json) | 22 big_bang_to_today, 41 section_links | 107 (79 papers / official) | ~25k |
| [Universe](universe.json) | 6 universe, 14 section_links | 44 (36 papers / official) | ~12k |
| [Physics](physics.json) | 32 physics, 61 section_links | 161 (123 papers / official) | ~60k |
| [Biology](biology.json) | 33 biology, 77 section_links | 195 (135 papers / official) | ~63k |
| [Maths](maths.json) | 86 maths, 25 crosslinks_to_universe | 130 (128 papers / official) | ~52k |
| [Maths History](maths-history.json) | 86 maths_history | 84 (82 papers / official) | ~19k |
| [Open questions](open-questions.json) | 57 open_questions, 28 red, 29 orange | Sources are on each real card: follow its share_url, or load its own section file. | ~4k |
| [Virtual Cell](virtual-cell.json) | 37 virtual_cell | 85 (44 papers / official) | ~14k |
| [Human Body](human-body.json) | 72 virtual_body, 21 body_to_cell | 118 (37 papers / official) | ~22k |
| [All the Elements](elements.json) | 118 elements | 14 (14 papers / official) | ~18k |

## How to read a file
- `about`: site, version, data hash, colour key, how to suggest a fix, and links to the other section files.
- `counts`: how many items are in the file.
- The section's items: each has `id`, `title`, `certainty` (green / orange / red), `summary`, `details` and `sources` (title + url, with type, year and link status).
- `share_url` on every card opens that card on the site.
- `sources_used`: every source used in this section, once each.

## Colour key
- 🟢 **green**: established (known science, or a defined / proved result in Maths).
- 🟠 **orange**: leading idea, partly tested, or partial progress.
- 🔴 **red**: unknown, or an open problem.

A link takes the colour of its less-certain end.

## Automatic checks vs science review
- 🤖 **Automatic checks** (`src/audit.py`, report in `AUDIT-v0.8.md`): Structural checks run by a script on every build (src/audit.py, report in AUDIT-v0.9.md): every card has a colour and at least one source, links point at cards that exist, share links are exact, the data hash is the same in every file, counts match, and every source URL was fetched to see that it answers. They do not read the science. Passing them does not mean a claim is right, only that it is labelled, sourced and linked.
- 🔬 **Science review**: No formal peer review yet. A science review means a person with the right expertise reads each claim against its sources and decides whether it is right, up to date and fairly coloured. The audit is **not** a peer review.
- 🙋 Every card has a Suggest a fix button (e-mail). Please check claims against the listed sources and say what looks wrong.

## Notes
- Chain Theory (Alex Wissner-Gross, Oct 2026) is shown as one candidate starting point, in orange, with its open gap in red. No established card depends on it.
- Sources are real: official papers (with DOIs where they exist), official bodies and textbooks, with Wikipedia kept alongside. Nothing is invented.
- Please fact-check against the sources and flag anything wrong or out of date: e-mail zyphullen@gmail.com with the subject "Echo Atlas fix: <card name> (<card id>)".
