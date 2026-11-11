# Changelog

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
