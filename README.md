# Echo Atlas

**Echo Atlas by Zyphullen**: a free, interactive atlas of all knowledge, from the universe to life and maths.
*Explore the known. Map the unknown.*

Live: https://zyphullen.github.io/echoatlas/

## Current version: v0.9 (13 Nov 2026)

1. ⚡ Universe opens faster, with a loading spinner
2. 🔭 Sharper Universe pictures (8K Earth) that stay crisp when you zoom in
3. 🔍 Zooming never jumps to another Universe stop
4. 🌿 Biology gets a Ring and a History
5. ⚛️ Physics gets a Ring and a History
6. 📖 From Nothing to Us reads top to bottom, in bordered sections
7. 🔘 Every section has Book · Ring · Map; Book opens first
8. 🕸️ Map is a spider web of links: click any dot for its card
9. 💾 Each section remembers the view you used last
10. 🔠 Ring section names stay readable at every zoom

## v0.8 (12 Nov 2026)

1. 🏷️ The browser tab shows the open page (e.g. “From Nothing to Us · History · Echo Atlas”), or the card name when a card is open
2. 🎹 ♫ Music button on every page, Home too: pick any of the 12 songs, or let them play at random until you mute
3. 🧹 Top left: Echo Atlas, the version and the name of the open page (and card)
4. 🤖 AI / SI panel shows the real counts: 57 open questions (28 red, 29 orange), 22 dated events, 6 Universe stops
5. ⚡ Physics, Virtual Cell and the other explorers open instantly, even the first time after a hard refresh
6. ✂️ No version pill next to the big Home title (the top left still shows it)
7. ⬆️ The Home title sits a line higher
8. ✨ Slow, gentle star twinkles behind Home (still when “reduce motion” is on)
9. 🧾 Home footer: “Built with Grok Bot, made by Zyphullen”
10. 🧭 No second bar (Back, name, version) on Physics, Virtual Cell and the other explorers; their own zoom and layer buttons stay
11. 📐 One top bar that looks the same on every page: Home, Explore, Music and AI / SI always in the same place; search on Map, Ring and History

### Fixes before live (13 Nov 2026, still shown as v0.8)
1. 🧹 Top left is Echo Atlas (version + open page name under it), then Home and Explore beside it, on every page
2. 🎹 Music is the flame, speaker and i (song list + Random), like v0.7; About stays a link in that list
3. ⬇️ The Home title sits one line lower so it does not sit under the top bar
4. 🗺️ From Nothing to Us and Maths open Map directly; History / Map / Ring sit in the top bar (no Explore dropdowns)
5. 🌍 Planet Earth is parked; Universe covers Earth. Old `#planet=` links open Universe
6. ⚛️ Atom Sandbox is parked; All the Elements (periodic table) stays. Old `#atom=` links open Home
7. 🔭 Universe step bar, Cell speed bar and Human Body layer buttons sit just under the top bar
8. 🗺️ The “You are here” mini-map box is gone (the timeline era strip stays)
9. 🧫 The “Human cell” label above the cell is gone
10. ❓ Open questions starts just under the top bar, with no empty gap

## v0.7 (12 Nov 2026)

1. 🎹 12 piano tracks that shuffle each visit, with no instant repeat
2. ⏳ From Nothing to Us has a History view: the Big Bang to Today timeline
3. 🧭 Shorter Explore: From Nothing to Us and Maths open into Map / Ring / History
4. 🔭 Universe: a 3D zoom through real NASA / ESA / Hubble / Webb / Planck / Gaia images, with credits
5. 🤖 Automatic checks and science review are clearly split (no formal peer review yet)
6. 📦 Clearer AI / SI guidance: each section file holds the facts, colours, sources and links
7. ❓ Open questions: every red and orange card in one list, with rival ideas and tests
8. 🧹 Field guide and version labels brought up to date
9. 🏷️ The tab title shows the open card's name, so tabs are easy to tell apart

## v0.6 (12 Nov 2026)

1. 🌿 Biology section: 33 ideas on cells, evolution and life systems, each fact coloured by certainty and linked to official papers or textbooks next to Wikipedia
2. 🧬 Virtual Cell and Human Body now sit with Biology on Home (From Nothing to Us still links to them)
3. 🔗 Biology links to From Nothing to Us, Physics, Big Bang to Today, the Elements and single Virtual Cell / Human Body cards
4. 🗺️ The Biology map has the same “you are here” mini-map, Key and growing category titles as Physics

### Fixes before release (still shown as v0.6)
1. 🤖 AI / SI guidance is in the page for AIs (hidden from people); the yellow button stays
2. 🧭 Explore stays in one fixed order; Virtual Cell and Human Body only under Biology
3. 📱 Mini-map off on phones (desktop keeps it)
4. 🖼️ Clearer Biology Home tile
5. 🟡 The AI / SI button stays gold on phones
6. ✏️ “AI info” is now “AI / SI info”

### v0.5 (12 Nov 2026)

1. ⚛️ Physics section: forces, particles and light, each fact coloured by certainty and linked to sources
2. 🗺️ A “you are here” mini-map on the maps, rings and Physics (the timeline has its own era strip)
3. 🔎 Category titles above the bands grow when you zoom out, all to the same size, so you can read them from afar; names stay the same size
4. 🧪 A bigger Atom Sandbox
5. 🔗 Links between sections, so related facts can be reached from each other
6. ⏳ Big Bang to Today: a timeline of 22 dated events, from the first instant to now
7. ⚡ Sections load only when you open them, so the first page is lighter (looks and works the same)

### Bugs found and fixed before release (v0.5)
1. 🖼️ New Home tiles showed the Back bar in the preview: recaptured without it
2. 🗺️ The mini-map sat in the bottom left: now top right, just under the top bar
3. ⚛️ Physics stopped you dragging to the far left or right when zoomed in, and zoom could slip off the mouse: you can now reach those ideas, and zoom stays on the pointer
4. 🏷️ Grey lane names inside the map were growing, and the titles above the bands ended up different sizes: only the titles above grow now, all the same size

### v0.5c fixes (before release)
1. 👆 Phones: tapping a Big Bang to Today event no longer also presses a button on the card that opens
2. 🗺️ Desktop: the mini-map moves left of an open card on the maps and rings, so they never overlap
3. 🔍 Physics: zooming with the mouse past the map’s edge no longer makes the view jump

### v0.4 (12 Nov 2026)

1. 📂 One AI data file per section in `ai/`, so an AI can load just the part it needs
2. 🔘 **AI info** at the top right: a read-me of what the site holds, with sizes and token counts for each section file. **All site data** (`facts.json`) sits inside that panel, after the section files
3. 🔍 Search on Home: jump to any page, card, element or dated event (type `/` to start)
4. 📄 Official papers and textbooks next to Wikipedia: every Cell, Body and Earth card now has one
5. 🖼️ More pictures, less text: source badges, a size ruler on map cards, a depth strip on Earth layers, shorter Home text
6. ⚡ Faster start: Home is ready in about half the time on phones; the map wakes only when you open it
7. 🔧 Small fixes (below)

### Bugs found and fixed before release (v0.4)
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

## Version history

### v0.3 (11 Nov 2026)

- Home menu with real screenshots of every section
- From Nothing to Us: the universe map and ring, from nothing to life
- Maths: map, ring and Maths History timeline (zoom, eras, proposed ideas in violet)
- Every fact coloured by certainty and linked to sources (`facts.json`, `knowledge.html`, `llms.txt`)
- Tap any line to see why two cards are linked and that line's own sources
- Copy link on every card opens that exact fact for anyone you send it to
- Chain Theory is tagged "Chain Theory" in orange, on its own side branch of the map
- Adding facts? Read `FACTS-GUIDE.md`
- Spot a mistake? Use **Suggest a fix** on any card, or email zyphullen@gmail.com

**Bugs found and fixed before release (v0.3)**
Found by Zyphullen while testing: phone Ring squashed into an oval (now a circle) · a Chain Theory Ring segment pulled the touching ends apart (moved back off the ring) · Chain Theory labels repeated words (now "Chain Theory") · Maths Map zoomed to the screen centre, not the cursor · Maths nodes outside their panels could not be reached · messy Maths Ring lines · Elements page could not be scrolled down or dragged (now wheel, drag, touch and keys all work) · the Chain Theory arc line and label came back on the Ring (removed) · the Key was not open on the first visit · the Maths Ring was much thinner than the From Nothing to Us Ring (now the same size).
Found during checks: shared Earth layer and heart links did not open their card · Copy link button wrapped and looked greyed out · "Link copied" note hidden behind cards · shared line links did not centre on the line · a syntax slip in a planet code comment.

### v0.2 (10 Nov 2026)
- Tap any line: a card says why two cards are linked, how sure we are, and its sources
- Every source shows its type, year and when it was last checked (all 457 links checked, 5 fixed; archived copies for down sites)
- Suggest a fix on every fact card
- Maths lines use the less-certain end's colour; Maths Ring opens zoomed in so names are readable
- Home tiles re-captured for phones; bigger Human Body figure; Maths History labels fit on phones
- Drawn atom icon; automatic checks on ids, links, sources, certainty and the data hash

### v0.1 (10 Nov 2026)
First release as Echo Atlas, a fresh start that continues the From Nothing to Us project.
- New name: Echo Atlas by Zyphullen
- Opens on a Home menu; each section is its own page
- Tidy top bar: Home, Explore, Search, then section controls
- Maths Map, Maths Ring and a rebuilt Maths History with zoom and era jumps
- Home tiles are real screenshots of each section

### Before Echo Atlas: From Nothing to Us (v3 to v12, Oct to Nov 2026)
Echo Atlas grew out of [From Nothing to Us](https://github.com/Zyphullen/from-nothing-to-us), a map of the journey from nothing to life, inspired by Chain Theory. Full notes are in that repo's CHANGELOG.
- **v12 (6 Nov)**: Atom Sandbox, cleaner map lines, clearer link certainty, gold and turquoise polish, data review
- **v11 (5 Nov)**: Planet Earth zoom layer by layer, Site data link, `knowledge.html`, tidier UI
- **v10 (5 Nov)**: `facts.json` and `llms.txt` for AI readers, Body to Cell bridge, beating heart, smooth zoom, science review
- **v9 (2 Nov)**: Human Cell to scale, DNA zoom, Human Body with 5 layers
- **v8 (2 Nov)**: Explore menu, All the Elements, Virtual Cell deep zoom, keyboard support, phone fixes
- **v7 (2 Nov)**: the Ring (Circle) view and the dashed loop from Us back to Before the Big Bang?
- **v6 (26 Oct)**: share a node link, first-visit help card, Suggest a fix, bounty dates
- **v5 (26 Oct)**: open bounties, Echo-Flame, soft piano music
- **v4 (26 Oct)**: research update, rival ideas, tests we could run, Not yet made elements, 3D views
- **v3**: search bar, colour key, cleaner labels and bug fixes

Runs in the browser, no download. Created by Zyphullen.
