# Shelar Residence — revised-plan 3D walkthrough

This viewer uses the four-sheet `2D_R0_JSW_Shelar Residence_06102026.pdf` supplied by the owner. Open the self-contained `index.html` in a browser or serve this directory. All scripts, source drawing images and the character are embedded.

Choose a level or the entire house. Drag to orbit in 3D view; scroll or use +/− to zoom. Walk POV and Follow cam use WASD or arrow keys to move, drag to look, Shift to run, and E or the on-screen button to open and close nearby doors. Follow cam displays a character asset from [Kenney Blocky Characters](https://kenney.nl/assets/blocky-characters), licensed CC0; see `assets/character/LICENSE.txt`. Use the floor selector to move directly between levels, or take the staircase in walkthrough mode. Tap movement buttons on touch screens.

The revised plan shows one car and bikes at stilt level, plus a bedroom, living area, kitchen and utility; living/dining, bedroom, kitchen and utility on the first floor; two bedroom suites, living, pooja and balconies on the second floor; and a bedroom and open terrace at penthouse level. Room labels display dimensions transcribed from the drawing.

The drawing is marked NTS. Geometry, openings, roof, furnishing and materials are indicative, not measured CAD or construction documentation. Printed levels are +2′6″, +13′6″ and +24′6″; the penthouse level is inferred at +35′6″ from the 11′ interval.

`model.js` is the readable scene source; `index.html` contains its embedded published copy, the four source-sheet images, Three.js and GLTFLoader. Three.js is MIT licensed; see `THREE-LICENSE.txt`. Character attribution is in `assets/character/LICENSE.txt`.

## Revision audit and controls
The published viewer contains only the four sheets dated 06 October 2026. The stilt car bay opens toward the road; the car points along its access axis. The lobby stair connects stilt to first floor, and the internal stair connects the upper floors. The first-floor main entry connects its lobby to living rather than opening onto an upper-storey exterior wall. Suite toilets, wardrobes, bedroom doors, balconies and terrace partitions are modeled separately.

Both walkthrough modes keep walls full height. Cutaway applies to overview modes only. The follow camera retracts around walls, door leaves and furniture and hides the avatar at very short camera distances. Furniture and animated door leaves have movement collision. Procedural plaster, stone, tile and wood textures are bundled and require no external network requests.

This is still an interpreted floor-plan visualization: heights, materials and road approach are illustrative; no elevations or sections were supplied.
