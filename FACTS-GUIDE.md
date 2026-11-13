# facts.json guide · Echo Atlas by Zyphullen (v0.8)

## One AI file per section

The same data is also split into one file per section in `ai/`, so an AI can load only what it needs:
`ai/from-nothing-to-us.json`, `ai/big-bang-to-today.json`, `ai/universe.json`, `ai/physics.json`, `ai/biology.json`, `ai/maths.json`, `ai/maths-history.json`, `ai/open-questions.json`, `ai/virtual-cell.json`, `ai/human-body.json`, `ai/elements.json`.

Each section file already holds that section's facts, colours, sources and the links between ideas, including links to cards in other sections (`related`, `section_links`). Load another section file only to read the card at the other end of a link.

| Field | What it holds |
|---|---|
| `about` | Site, version, `data_hash` (same as the page), colour key, how to suggest a fix, the other section files |
| `counts` | How many items are in this file |
| the section's items | Same fields as in `facts.json`; each source is `title`, `url`, `type` |
| `sources_used` | Every source used in this section once, with `type`, `year` and `link_status` |

`ai/index.json` lists every file with its size and rough token count; `ai/README.md` is the read-me (also shown by the gold **AI / SI info** button on the site). All of these are made by `src/aifiles.py`, called from `src/build.py`. Links inside a section file drop `reason_sources` (they are the sources on the link's two cards).

`facts.json` holds every fact on the site, its certainty colour and its sources. It is built by `src/build.py` from the same data block as the page, so the page, `facts.json`, `llms.txt` and `knowledge.html` always match. `data_hash` in `facts.json` matches `DATA_HASH` in `index.html`.

## Certainty (every card and link)

| `certainty` | `certainty_word` | Meaning |
|---|---|---|
| `green` | known | Established science, or a defined / proved result in Maths |
| `orange` | we think | Leading idea, partly tested, or partial progress |
| `red` | unknown | Open question / open problem |

A link takes the colour of its less-certain end, the same as the line on the map. One exception: a labelled maths "frontier start" link stays green.

## Top level

| Field | What it holds |
|---|---|
| `name`, `full_name`, `tagline`, `version`, `author`, `sections` | Site details |
| `data_hash`, `generated` | Build stamp (same hash as the page) |
| `key` | The colour key |
| `counts` | How many of each item (checked by the build) |
| `nodes`, `links` | From Nothing to Us map (Universe → Us) |
| `big_bang_to_today` | The dated timeline (`eras`, `events`); on the site it is also the History view of From Nothing to Us |
| `universe` | Universe stops: real NASA / ESA images, one per scale (`stops`, each with `image.file` and `image.credit`) |
| `physics`, `biology` | Section maps (`categories`, `nodes`, `links`) |
| `section_links` | Links between cards in different sections (`from`, `to`, `label`, `note`, `sources`) |
| `open_questions` | Every red and orange card already in the data, in one list (`red`, `orange`, `items`) |
| `quality` | What the automatic checks do, and that no formal science review has been done yet |
| `maths`, `maths_history`, `crosslinks` | Maths map, dated Maths History, Maths ↔ Universe links |
| `virtual_cell`, `virtual_body`, `body_to_cell` | The explorers' cards |
| `elements` | 118 elements and where they come from (`origin_key`, `list`, `not_yet_made`) |
| `sources`, `source_check` | Every source and the link check (date, method, summary) |
| `suggest_a_fix` | E-mail and subject format for corrections |

## A map node (`nodes[]`)

| Field | Type | Notes |
|---|---|---|
| `id` | text | Unique. The share link is `#n=<id>` |
| `title`, `subtitle` | text | Card name and one-line tag |
| `certainty`, `certainty_word` | text | See the key above |
| `label`, `label_note` | text | Only on Chain Theory cards: "Chain Theory" (the gap card: "Gap in Chain Theory"); shown in orange, which already marks it as not settled |
| `share_url` | URL | Opens this card directly |
| `size`, `log10_metres` | text, number | Size words and scale (null if no size) |
| `summary`, `details`, `deeper` | list of text | The card's 3 layers |
| `parents` | list of ids | The cards this one comes from (each one is also a `links[]` entry) |
| `sources` | list of source objects | See "A source" |
| `rivals`, `tests` | lists | Other ideas (`title`, `certainty`, `summary`, `sources`) and tests we could run (`summary`, `chain_theory_test`, `source_note`, `sources`) |

## A link (`links[]`, `maths[].links[]`, `crosslinks[]`)

| Field | Notes |
|---|---|
| `from`, `to` | Node ids |
| `label` | The short words on the line |
| `certainty` | Colour of the line |
| `reason`, `reason_certainty_note` | Why the two are linked, in plain words |
| `sources` | v0.3, map links: sources for this exact step |
| `sources_note` | v0.3: honest note, e.g. "No source for this exact step was found." |
| `reason_sources` | The sources on the cards at each end |
| `label_ct` | Only on Chain Theory links: "Chain Theory" |

Share link for a link card: `#l=<from>%3E<to>` (for example `#l=bbn%3Eatoms`).

## Other cards

| List | Share link | Main fields |
|---|---|---|
| `maths[]` | `#m=<id>` | `id`, `title`, `subtitle`, `certainty`, `status`, `date`, `summary`, `details`, `parents`, `sources`, `links` |
| `maths_history.nodes[]` | via `#m=<id>` | `id`, `share_url`, `events[]` (`index`, `year`, `end_year`, `label`, `kind` idea/proof, `text`, `certainty`, `sources`) |
| `virtual_cell[]` | `#cell=<id>` | `id`, `title`, `certainty`, `summary`, `details`, `drawing_note`, `map_node`, `sources` |
| `virtual_body[]` | `#body=<id>` | same as the cell |
| `elements.list[]` | `#ptable=1&el=<z>` | `z`, `symbol`, `name`, `group`, `main_origin`, `also_from`, `sources` |
| `physics.nodes[]`, `biology.nodes[]` | `#p=<id>`, `#b=<id>` | `id`, `title`, `category`, `subtitle`, `certainty`, `summary`, `details`, `parents`, `sources`, `related` |
| `big_bang_to_today.events[]` | `#t=<id>` | `id`, `title`, `when`, `seconds_after_big_bang`, `certainty`, `summary`, `sources`, `related` |
| `universe.stops[]` | `#u=<id>` | `id`, `order`, `title`, `subtitle`, `size`, `shown_as`, `certainty`, `summary`, `details`, `image`, `sources`, `related` |
| `open_questions.items[]` | its `share_url` | `section`, `id`, `title`, `certainty`, `rival_ideas`, `tests` (the full card stays in its own section) |

## A source

`key`, `title`, `url`, `type` (paper, preprint, review, textbook, encyclopedia, agency / lab, blog …), `year` (or null), `year_note` (how the year was found, or why there is none), `last_checked` (the day the link was really checked), `link_status`, and `archived_copy` when the site was down or blocks checks.

For living pages (Wikipedia, MacTutor, Stanford Encyclopedia) `year` is the year the page was last revised, and `year_note` says so.

## Automatic checks vs science review

- 🤖 `src/audit.py` (report in `AUDIT-v0.8.md`) checks structure: colours, sources, links, share links, counts, data hash and that source links answer. It does not read the science.
- 🔬 No formal science review / peer review has been done yet. Check claims against their sources and use **Suggest a fix**.

## Adding a fact fast

1. **Map card**: add an object to `src/nodes.js`: `{id, r, x, s:'k'|'t'|'u', ic, name, line, sz, szt, info:[…], L2:[…], L3:[…], src:['key'], p:['parent-id'], el:{parent:'line label'}}`. `r` is the stage column. Add `es:{parent:'u'}` only to make one line less certain.
2. **Source**: add `key:['Title (year)', 'https://…']` to `src/sources.js`. Prefer the paper or the official page; a Wikipedia page can be an extra key.
3. **Link source**: add `'parent>child':'key1 key2'` to `LINK_SRC` in `src/link-sources.js` (an empty string plus a `LINK_SRC_NOTE` if none exists).
4. **Explorer card**: `src/cellparts.js`, `src/bodyparts.js`. **Maths**: `src/maths-nodes.js`, `src/maths-history.js`. **Physics / Biology / timeline**: `src/physics.js`, `src/biology.js`, `src/cosmic-timeline.js`. **Universe stop**: `src/universe.js` (real images only, in `src/universe/`, with the credit).
5. Check new links: `python3 tools/source_meta_v03.py` after a link check, then `python3 src/build.py`. The build stops on a missing source, a missing parent or a JavaScript error, and `python3 src/audit.py` runs the automatic checks (structure only, not a science review); `node test-v0.7.js` runs the browser tests.

Spot a mistake? Every card has **Suggest a fix**, or e-mail zyphullen@gmail.com with the subject `Echo Atlas fix: <card name> (<card id>)`.
