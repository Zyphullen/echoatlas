# AUDIT v0.8 · Echo Atlas by Zyphullen
Data hash `7a9b6b5a6725` · generated 2026-11-13 by src/audit.py from facts.json.

> 🤖 **These are automatic checks, not a science review.** A script checks structure: colours, sources, links, share links, counts, data hash and that source URLs answer. It does not read the science, so passing does not mean a claim is right. 🔬 **Science review: no formal peer review yet.** Please check claims against their sources and use Suggest a fix.

**Result:** ✅ no hard problems · 38 notes.

| Check | Count |
|---|---|
| nodes | 93 |
| links | 145 |
| cell | 37 |
| body | 72 |
| elements | 118 |
| math_nodes | 86 |
| math_links | 143 |
| universe_stops | 6 |
| open_questions | 57 |
| physics_nodes | 32 |
| biology_nodes | 33 |
| timeline_events | 22 |
| section_links | 193 |
| crosslinks | 25 |
| sources | 588 |
| history_nodes | 86 |
| history_events | 92 |

- ✅ Universe stops with no sources: none
- ✅ Universe stops with no certainty colour: none
- ✅ Universe stops missing an exact share_url: none
- ✅ Universe stops with Wikipedia only: none
- ✅ Universe stops with no image credit: none
- ✅ Universe stops with a missing image file: none
- ✅ Open questions list count mismatch: none
- ✅ Open questions list holds a green card: none
- ✅ Biology cards with no sources: none
- ✅ Biology cards with empty summary: none
- ✅ Biology cards with no certainty colour: none
- ✅ Biology cards missing an exact share_url: none
- ✅ Biology cards with Wikipedia only: none
- ✅ Dangling biology links: none
- ✅ Physics cards with no sources: none
- ✅ Physics cards with empty summary: none
- ✅ Physics cards with no certainty colour: none
- ✅ Physics cards missing an exact share_url: none
- ✅ Physics cards with Wikipedia only: none
- ✅ Dangling physics links: none
- ✅ Timeline events with no sources: none
- ✅ Timeline events with no certainty colour: none
- ✅ Dangling links between sections: none
- ✅ Links between sections with no sources: none
- ✅ Links with no reason: none
- ✅ Sources with no type/year/last-checked: none
- ✅ Broken source links: none
- ✅ Duplicate node ids: none
- ✅ Nodes with no sources: none
- ✅ Nodes with empty summary: none
- ✅ Parents that point to a missing node: none
- ✅ Dangling links: none
- ✅ Nodes with no links at all: none
- ✅ Count mismatches: none
- ✅ Source URLs that are not https: none
- ✅ Tests with no source: none
- ✅ Rival ideas with no source: none
- ✅ Nodes missing an exact share_url: none
- ✅ Links with no label: none
- ✅ Maths nodes missing an exact share_url: none
- ✅ Maths links out of sync with node parents: none
- ✅ Maths nodes with no sources: none
- ✅ Maths nodes with empty summary: none
- ✅ Dangling maths links: none
- ✅ Dangling cross-map links: none
- ✅ Cross-map links with no sources: none
- ✅ Maths colour/status mismatch: none
- ✅ History events tied to missing Maths nodes: none
- ✅ History events with no sources: none
- ✅ Maths History records with no events: none
- ✅ History event kind unclear: none
- ✅ History event missing numeric date: none
- ✅ Chain Theory items not orange: none
- ✅ AI section files out of sync: none
- ✅ virtual_cell cards with no source: none
- ✅ virtual_body cards with no source: none

**Audit review:** The 40 initially reported notes included 32 references actually used by historical events; those are now counted as used. Eight additional original/foundational references are intentionally retained as optional bibliography for future reading—not as card/event evidence. Retaining them cannot hide a missing citation: all card, relationship and event evidence is checked above.

## ℹ️ Sources reserved but not linked on a card or event (info) (34)
- babylon
- kolmogorov
- turing
- shannon
- wiles
- taylor
- primeNumberTheorem
- lorenz
- horo96
- reheat
- pdgastro
- borexino
- galli13
- mckee07
- whiterees
- kormendy
- bethe39
- fermi13
- whw02
- maoz14
- heitler27
- draine03
- dalrymple
- mccollom99
- brocchieri
- blattner
- fischer16
- archibald15
- raichle
- nirenberg61
- ph_hubble1929
- ph_os_conservation
- ph_os_bigbang
- ph_w_hubble_s_law

## ℹ️ Source links to recheck (check) (4)
- 30 × site down on check day (HTTP 502); page confirmed in Web Archive
- 1 × site down on check day (HTTP 503); page confirmed in Web Archive
- 1 × site unreachable on check day (HTTP 503); recheck
- 1 × site unreachable on check day; page confirmed in Web Archive

## Check before changing
- Viewport or touch-action changes can break page scrolling (Elements, Home, cards): run the scroll tests on a 390px phone and with the wheel.
- The Ring's two ends (Us and Before the Big Bang?) must touch at the top.
- Wheel and trackpad zoom anchor at the cursor; pinch zoom at the fingers.
- Every node must sit in its panel and be reachable within the pan limits.
- The Key opens on the first visit to each map and ring, then keeps the visitor's choice; on phones it must not cover the map.
- Official names only for theories, laws and sources; never invent a source.
- v0.4: Home must only open a page from a tile; a click in the search box, AI info or All data must not reset Home.
- v0.4: the map sleeps while Home is open (content-visibility); anything that measures the map must run after it is shown, and cull() must run before its first layout.
- v0.4: ai/*.json, facts.json, llms.txt and ai/README.md must all carry DATA_HASH; always rebuild with src/build.py (never hand-edit ai/).
- v0.4: add sources with tools/papers_v04.py so every DOI is resolved in Crossref and every page is fetched; never type a title from memory.
- v0.4: index.html loads thumbs/*.webp from the thumbs/ folder (publish it); the TEST file keeps them inside.
- v0.5: section code loads only when opened. index.html loads js/*.js (publish the js/ folder); the TEST file keeps the same code inside. Anything that calls VCELL, VBODY, VPHYS or VTIME must go through SCREENS.show (or LAZY.need) first.
- v0.5: the Universe Ring, Maths Map and Maths Ring are drawn the first time they are opened. Code that looks for their nodes must call setScene / mathScene first; never query #gCircle, #gMathMap or #gMathCircle at start-up.
- v0.5: category labels (lanes, size bands, ring sectors, Physics categories) grow when zoomed out; node names must stay the same size. Do not put node text in the label lists.
- v0.5: the mini-map hides behind cards on phones; check it never covers the Key, the zoom buttons or a card.
- v0.5: Physics and Big Bang to Today open their Key on the first visit, like every map; add new sources with tools/papers_v05.py (DOIs resolved in Crossref, pages fetched).
- v0.5: links between sections reuse the two cards' sources; a new link claim needs a real source on one of its two cards.
- v0.6: Biology is a section like Physics (src/biology.js data, src/biology-view.js map, js/biology.js loads only when opened, #biology=1 / #b=<id>); add its sources with tools/papers_v06.py.
- v0.7: Universe (src/universe.js data, src/universe-view.js, js/cosmos.js loads only when opened, #universe=1 / #u=<id>) uses only real NASA / ESA images in universe/*.webp; only resize, crop or reproject them, and keep the credit on screen.
- v0.7: Open questions (src/gaps-view.js, #gaps=1) only gathers red and orange cards already in the data; it adds no science.
- v0.7: music is a shuffle bag of music/*.mp3 (index.html loads each file when it plays; the TEST file carries them inline, so it is about 16 MB).
