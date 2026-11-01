# Shelar Residence — 3D walkthrough

An interactive 3D model of the house, built from the architect's drawing **`2D_R0_JSW_Shelar Residence_31102026.pdf`** (31 Oct 2026, six sheets: site and height details, ground floor, 1st floor, 2nd floor, 3rd floor/penthouse, upper terrace).

Live: https://shelar-residence-3d.vercel.app · or open `index.html` directly. It is one self-contained file and works offline.

## Using it

- **Tour**: one tap walks through all four floors with a short description of each space.
- **Overview**: shows the whole house, or one floor cut open like a dollhouse with room names and sizes. Drag to turn, pinch or scroll to zoom, and tap a room to walk into it.
- **Person view**: the same walking controls, but you see a person walking ahead of the camera. The camera stays inside rooms and slides in front of walls and tall furniture. Scroll or pinch to move it closer or further.
- **Walk inside**: tap the floor where you want to go, or use the round joystick (up walks, sideways turns). Drag to look around. Doors open as you approach. Walk onto a staircase, or press the orange button that appears beside it, to change floors. Tap the mini-map to walk to that spot.
- **Room chips** jump to any room on the current floor. **Plan** shows the original drawing sheets. **Furniture** and **Labels** show or hide the furniture and room names (both choices are remembered). **☀** switches between morning, noon and evening light and can hide the surroundings (grass, road, trees, compound wall). The **⌄** tab on the control panel hides it for a clear view; **Show controls** brings it back.
- Keyboard: W/S or ↑/↓ to walk, A/D or ←/→ to turn, Q/E to step sideways, Shift to go faster.

## What the model shows

| Level | Height | Spaces |
|---|---|---|
| Ground | +2′6″ (parking +2′0″) | Bedroom with dressing and toilet, hall with open kitchen, utility (projects to the 1′8″ left setback as drawn), parking for a car and two bikes, entrance lobby with stairs |
| 1st | +13′6″ | Living, dining under the stair void, kitchen, utility, guest bedroom, toilet and common toilet, lobby with main door |
| 2nd | +24′6″ | Master bedroom and second bedroom, each with walk-in wardrobe, toilet and balcony; living with study desks; pooja |
| Penthouse | +35′6″ | Bedroom suite with balcony, stair lobby, open terrace with skylight over the pooja and a safety ladder to the roof |
| Roof | +46′6″, parapet +47′6″ | Overhead tank above the penthouse rooms |

The lobby staircase connects the ground and first floors. The internal U-shaped staircase connects the first floor, second floor and penthouse around an open void.

Rooms are laid out from the printed sizes, not scaled off the sheet: every labelled room has exactly its printed clear size, with 9″ outer walls and 4½″ partitions, inside the 36′1″ × 23′4″ building from the site plan. `src/plan.js` records the arithmetic for each floor. Where the printed figures contradict each other, the model follows the room sizes:

- Ground floor parking: the sheet prints 11′3″, but the bedroom, toilet and lobby widths leave 10′6″ between the hall wall and the lobby.
- Ground floor utility: printed 3′2″ × 10′10″, but the hall depth (10′5½″) fixes it at 10′5½″. Its outer wall is 4½″, so it ends on the 1′8″ setback line.
- First floor living: printed 12′8½″ × 7′4″, but the space between the kitchen wall and the lobby wall is 11′1½″. The front-to-back figures on this floor total 23′4½″, so the front wall is 8½″.

Elevations were not supplied: facade colours, window heights, finishes and furniture are illustrative. The 1st-floor sheet repeats the lobby flight numbering 23–44, but the 2nd floor has rooms above it, so that staircase ends at the first floor.

## Editing

The source is in `src/`:

- `plan.js`: every room, wall, door, window, piece of furniture, staircase and tour stop, in metres measured off the sheets. Most changes happen here.
- `builder.js`: turns the plan into geometry (walls with openings, animated doors, stairs, furniture, site).
- `materials.js`: procedurally painted textures, so no image downloads are needed.
- `character.js`: the jointed person used in Person view, with its walking and standing animation. It is original to this project.
- `nav.js`: walkable grid, path finding and stair rides. `main.js` handles the viewer, controls, tour and UI. `template.html` is the page shell and styles.

```bash
npm install
npm run bundle        # writes index.html
```

`npm test` runs `tests/smoke.mjs`, which walks from the road to every floor and back through both staircases. It needs Playwright and a local server (`python3 -m http.server 8765`); set `CHROME_PATH` to use an installed Chrome.

Three.js is MIT licensed; see `THREE-LICENSE.txt`. The drawing sheets in `plans/` belong to the architect.
