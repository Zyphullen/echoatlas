# Echo Atlas · AI info (v0.4)

Echo Atlas by Zyphullen is one website for knowledge, known and unknown. Every fact is coloured by certainty and linked to its sources.
This folder splits the site's data into **one file per section**, so an AI can load only the part it needs and stay inside its context limit.

**Data hash:** `3ca624a114cc` (the same as `DATA_HASH` in the page and `data_hash` in every file below). **Built:** 2026-11-12.

## Start here
1. 📂 Pick the section you need from the table and load only that file.
2. 🧭 Need everything? Load [facts.json](../facts.json) (all sections, about 329k tokens).
3. 🗂️ Need the list as data? Load [index.json](index.json).
4. 📖 Every field is explained in [FACTS-GUIDE.md](../FACTS-GUIDE.md).

## Section files
| Section | What is in it | Sources | Size |
|---|---|---|---|
| [From Nothing to Us](from-nothing-to-us.json) | 93 nodes, 145 links, 25 crosslinks_to_maths | 245 (223 papers / official) | ~81k |
| [Maths](maths.json) | 86 maths, 25 crosslinks_to_universe | 130 (128 papers / official) | ~51k |
| [Maths History](maths-history.json) | 86 maths_history | 84 (82 papers / official) | ~19k |
| [Planet Earth](planet-earth.json) | 18 planet | 28 (9 papers / official) | ~5k |
| [Virtual Cell](virtual-cell.json) | 37 virtual_cell | 85 (44 papers / official) | ~13k |
| [Human Body](human-body.json) | 72 virtual_body, 21 body_to_cell | 118 (37 papers / official) | ~22k |
| [All the Elements (and Atom Sandbox)](elements.json) | 118 elements | 14 (14 papers / official) | ~18k |

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

## Notes
- Chain Theory (Alex Wissner-Gross, Oct 2026) is shown as one candidate starting point, in orange, with its open gap in red. No established card depends on it.
- Sources are real: official papers (with DOIs where they exist), official bodies and textbooks, with Wikipedia kept alongside. Nothing is invented.
- The Atom Sandbox is a teaching toy with preset reactions, not a quantum simulator.
- Please fact-check against the sources and flag anything wrong or out of date: e-mail zyphullen@gmail.com with the subject "Echo Atlas fix: <card name> (<card id>)".
