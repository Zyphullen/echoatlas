# Changelog

## v0.5 (12 Nov 2026)
1. ⚛️ Physics section: 32 ideas on forces, particles and light, with official papers or textbooks next to Wikipedia
2. 🗺️ A “you are here” mini-map on the maps, rings and Physics (the timeline has its own era strip)
3. 🔎 Category titles above the bands (and ring sectors, Physics categories) grow when you zoom out, all to the same size; grey lane names inside the map stay as they are; node names stay the same size
4. 🧪 A bigger Atom Sandbox
5. 🔗 Links between sections (related facts in different sections can be opened from each other)
6. ⏳ Big Bang to Today: 22 dated events, from the first instant to today
7. ⚡ Section code (Planet Earth, Virtual Cell, Human Body, Atom Sandbox, Physics, Big Bang to Today, and the rings) loads only when that section is opened; the page looks and works the same

### Bugs found and fixed before release
1. 🖼️ Home tiles for Physics, Big Bang to Today and the other explorers showed the Back bar in the preview: recaptured without it
2. 🗺️ The mini-map sat in the bottom left: now top right, just under the top bar
3. ⚛️ Physics stopped you dragging to the far left or right when zoomed in, and zoom could slip off the mouse: you can now reach those ideas, and zoom stays on the pointer
4. 🏷️ Grey lane names inside the map were growing, and the titles above the bands ended up different sizes: only the titles above grow now, all the same size

### v0.5c fixes (before release)
1. 👆 Phones: tapping a Big Bang to Today event no longer also presses a button on the card that opens
2. 🗺️ Desktop: the mini-map moves left of an open card on the maps and rings, so they never overlap
3. 🔍 Physics: zooming with the mouse past the map’s edge no longer makes the view jump

## v0.4 (12 Nov 2026)
1. 📂 One AI data file per section (`ai/from-nothing-to-us.json`, `maths`, `maths-history`, `planet-earth`, `virtual-cell`, `human-body`, `elements`), each with the same data hash as the page; the biggest is about 81k tokens
2. 🔘 AI info read-me (`ai/README.md`, `ai/index.json`) and an **AI info** button at the top right; **All site data** (`facts.json`) sits inside the panel after the section files, with sizes and token counts
3. 🔍 Home search: pages, map and Maths cards, Maths History events, Earth layers, cell and body cards and all 118 elements; keyboard (/, arrows, Enter, Esc), mouse and touch
4. 📄 88 new sources checked on 12 Nov 2026: DOI papers (each resolved in Crossref), OpenStax textbooks and NASA/NOAA pages, added next to Wikipedia; no Cell, Body, Earth, map or Maths card is Wikipedia-only now
5. 🖼️ Source badges (📄 paper, 📘 textbook, 🏛 official, W Wikipedia), a size ruler on map cards, a depth strip on Earth layers, gentle card and Home animations, shorter Home text
6. ⚡ Home ready in ~0.8–1.1 s instead of ~2–2.4 s on a slow phone; Home pictures load only when on screen; the map is laid out only when needed and still draws only what is on screen; card details still load on tap
7. 🔧 Small fixes (below)

### Bugs found and fixed before release
1. 🖱️ Clicking the Home search box sent focus back to the first tile
2. 🖼️ Home tile pictures were out of date (old map labels): re-captured
3. 🏷️ A map line named a person instead of the idea: now just "one candidate start"
4. 🔗 One new paper had a wrong DOI and one NASA page timed out: both caught by the link check and replaced
5. ⌨️ Esc did not close AI info after scrolling it
6. 🔍 Search missed plurals ("mitochondria") and a clicked result could close the card it opened
7. 📚 Card sources ran together in one line; badges were misaligned
8. 📏 Size ruler labels overlapped on small cards
9. 🐢 The first speed change made opening the map slower: the map now warms up while you are on Home
10. 🟨 The gold tagline was off-centre: now centred
11. 🏷️ The title repeated BY ZYPHULLEN: removed (credit already sits top left)
12. ⬆️ Home was nudged up a little to cut the gap under the top bar
13. 🤖 All data was a second button: now only AI info sits at the top right, and All site data is in the panel

## v0.3 (11 Nov 2026)
- Chain Theory is tagged "Chain Theory" on every node, card and line; orange already marks it as not settled
- Chain Theory is now one candidate starting point on its own side branch of the map, no longer under the Standard Model; on the Ring it sits off the main ring near its stages, as in v0.2, so the two ends touch
- Every fact has a share link: Copy link on every card, line, cell, body part, Earth layer, element and the Atom Sandbox
- Every line's card lists its own sources (137 of 145); the other 8 say plainly why none is given
- 20 Wikipedia main sources swapped for papers or official pages (Wikipedia kept as an extra link); the blog check is marked as not peer-reviewed
- All 506 source links checked 11 Nov 2026; 396 now show a year (210 more than before); sites that were down point to archived copies
- Ring stays a circle on phones, fitted to the screen; cards and the Elements page can be pinch-zoomed, while maps keep their own zoom
- Maths Map: wheel and trackpad zoom at the cursor, pinch zooms at your fingers; every node sits in its panel and can be reached
- Maths Ring: linked areas sit next to each other, so lines are shorter and cross less; lines meet the node centres
- The Key opens by itself the first time you open each map or ring, then keeps your choice; on phones it stays short and folds at your first touch
- Drawn icons for Virtual Cell and Human Body (no more emoji boxes)
- Suggest a fix in the Atom Sandbox, named after the atom on screen
- New FACTS-GUIDE.md: what every field in facts.json means and how to add a fact
- Fixes: Copy link toast shows above cards; shared Earth layer and heart links open their card
- New automatic checks: every share link opens, every line has sources or a note, Chain Theory labels, phone Ring, zoom at the cursor, every node reachable, page scrolling on phone and desktop, Key on first visit

### Bugs found and fixed before release
Found by Zyphullen while testing:
- Ring on phones was squashed into an oval: back to a true circle
- A Chain Theory segment on the Ring pulled the two touching ends apart: moved back off the ring as in v0.2
- Chain Theory labels repeated words: now just "Chain Theory"
- Maths Map zoomed to the screen centre, not the cursor
- Some Maths nodes sat outside their panels and could not be reached
- Maths Ring lines were messy and did not line up with the nodes
- Elements page could not be scrolled down or dragged around (reported twice): wheel, mouse drag, touch drag and arrow keys now all move it, and a short tap still picks an element
- The Chain Theory arc line and label on the Ring came back after being asked to remove them: removed
- The Key was not open on the first visit to each page
- Maths Ring band was much thinner than the From Nothing to Us Ring: now the same size and thickness
Found during checks:
- Shared Earth layer and heart chamber links did not open their card
- Copy link button wrapped onto two lines and looked greyed out
- The "Link copied" note was hidden behind cards
- A shared line link (#l=) did not centre the camera on the line
- A syntax slip in a planet code comment

## v0.2 (10 Nov 2026)
- Tap any line: a link card says why two cards are linked, how sure we are, and the sources
- Every source shows its type, year and when it was last checked (all 457 links checked 10 Nov 2026; 5 wrong or broken links fixed)
- Links that failed the check were rechecked; where a site was down, the card offers an archived copy
- Suggest a fix on every fact card: opens an email with the card already filled in
- Maths lines now use the less-certain end's colour, matching the key and facts.json
- Maths Ring opens zoomed in so the names are readable; on phones, nodes grow when zoomed out so more fit on screen
- Home tiles re-captured so they read well on phones, without zoom buttons or the Key; bigger Human Body figure
- Maths History shows more labels on phones, with no overlaps
- Atom icon is now a drawn glyph, not an emoji
- No stray focus ring on Back after tapping; keyboard focus still shows
- New automatic checks on ids, links, reasons, sources, certainty, counts and the data hash

## v0.1 (10 Nov 2026)
First release as Echo Atlas (fresh start; continues the From Nothing to Us project).
- New name: Echo Atlas by Zyphullen
- Opens on the Home menu; each section is its own screen
- Tidy top bar: Home, Explore, Search, then section controls
- Maths Map, Ring and rebuilt Maths History with zoom and era jumps
- Home tiles are real screenshots of each section
