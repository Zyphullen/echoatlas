# Echo Atlas

**Echo Atlas by Zyphullen**: a free, interactive atlas of all knowledge, from the universe to maths.
*Explore the known. Map the unknown.*

Live: https://zyphullen.github.io/echoatlas/

## Current version: v0.4 (12 Nov 2026)

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
