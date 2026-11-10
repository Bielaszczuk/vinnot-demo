import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BAR_GLASS_HEIGHT,
  BAR_SCORE_GAP,
  BAR_TRACK,
  BOTTLES,
  GLASSES,
  POUR_ANGLE,
  RATING_MAX,
  RATING_MIN,
  REST_ANGLE,
  WINE_TYPES,
  bottleStage,
  bubbleSpots,
  clampRating,
  UNCORK_ART,
  barFillWidth,
  barLayout,
  barThumbFill,
  barThumbLeft,
  barXAtRating,
  corkBox,
  examplesFor,
  fillOf,
  formatRating,
  glassFills,
  labelsFor,
  lookFor,
  phase,
  pourFrame,
  pourLayout,
  ratingForKey,
  ratingAtBarX,
  ratingFromPointer,
  scoreRoom,
  settle,
  standPose,
  surfaceClip,
  trackGradient,
  uncorkProps,
  uncorkScene,
  wineClip,
  wineLeft,
  wineSurfaceY,
} from '../src/components/PourRating/pour.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

describe('clampRating', () => {
  it('rounds to one decimal, so 2.15 becomes 2.2', () => {
    assert.equal(clampRating(2.15), 2.2);
    assert.equal(clampRating(3.64), 3.6);
    assert.equal(clampRating(0.3), 0.3);
    assert.equal(clampRating(0.1 + 0.2), 0.3);
  });

  it('keeps the value between 0.1 and 5.0', () => {
    assert.equal(clampRating(0), RATING_MIN);
    assert.equal(clampRating(-3), 0.1);
    assert.equal(clampRating(5.04), RATING_MAX);
    assert.equal(clampRating(9), 5);
  });

  it('treats a value that is not a number as the minimum', () => {
    assert.equal(clampRating(Number.NaN), 0.1);
  });
});

describe('fillOf and glassFills', () => {
  it('fills each glass by its fraction: 2.2 is two full glasses and 0.2 of the third', () => {
    const fills = glassFills(2.2);
    assert.equal(fills.length, 5);
    assert.deepEqual(fills.slice(0, 2), [1, 1]);
    assert.ok(Math.abs(fills[2] - 0.2) < 1e-9);
    assert.deepEqual(fills.slice(3), [0, 0]);
  });

  it('keeps every fraction between 0 and 1', () => {
    assert.equal(fillOf(5, 4), 1);
    assert.equal(fillOf(0.1, 3), 0);
    assert.deepEqual(glassFills(5), [1, 1, 1, 1, 1]);
  });
});

describe('formatRating', () => {
  it('always shows one decimal', () => {
    assert.equal(formatRating(4), '4.0');
    assert.equal(formatRating(3.6), '3.6');
  });
});

describe('lookFor', () => {
  it('chooses glass, wine, bottle and pour colour by wine type, like the AI profile scene', () => {
    assert.deepEqual(lookFor('red'), { glass: 'bordeaux', wine: 'red', bottle: 'dark', pour: '#7A1F2E' });
    assert.deepEqual(lookFor('fortified'), { glass: 'bordeaux', wine: 'ruby', bottle: 'dark', pour: '#8E2A36' });
    assert.deepEqual(lookFor('rose'), { glass: 'rose', wine: 'rose', bottle: 'clear-rose', pour: '#E39A8E' });
    assert.deepEqual(lookFor('white'), { glass: 'tulip', wine: 'white', bottle: 'clear-white', pour: '#E3CF7C' });
    assert.deepEqual(lookFor('orange'), { glass: 'tulip', wine: 'amber', bottle: 'clear-amber', pour: '#D08A3A' });
    assert.deepEqual(lookFor('dessert'), lookFor('orange'));
    assert.deepEqual(lookFor('sparkling'), { glass: 'flute', wine: 'sparkling', bottle: 'sparkling', pour: '#E8C860' });
  });

  it('reads upper-case types and falls back to red for an unknown or missing type', () => {
    assert.deepEqual(lookFor('SPARKLING'), lookFor('sparkling'));
    assert.deepEqual(lookFor('champagne'), lookFor('red'));
    assert.deepEqual(lookFor(undefined), lookFor('red'));
    assert.deepEqual(lookFor(null), lookFor('red'));
  });

  it('offers the six wine-type chips in the prototype order, with an image for every look', () => {
    assert.deepEqual(WINE_TYPES, ['red', 'fortified', 'rose', 'white', 'orange', 'sparkling']);
    for (const type of WINE_TYPES) {
      const look = lookFor(type);
      assert.ok(GLASSES[look.glass], `glass for ${type}`);
      assert.ok(BOTTLES[look.bottle], `bottle for ${type}`);
    }
  });
});

describe('geometry tables', () => {
  it('uses the S8 geometry of the 360-px-high art', () => {
    assert.deepEqual(GLASSES.bordeaux, { w: 177, h: 360, box: [0.027, 0.2009, 0.9459, 0.2939] });
    assert.deepEqual(GLASSES.rose, { w: 172, h: 360, box: [0.0279, 0.1967, 0.9443, 0.2885] });
    assert.deepEqual(GLASSES.tulip, { w: 148, h: 360, box: [0.0289, 0.2128, 0.9386, 0.2872] });
    assert.deepEqual(GLASSES.flute, { w: 122, h: 360, box: [0.1261, 0.1512, 0.7478, 0.3774] });
    const still = { art: 'cork', w: 76, h: 172, size: 0.26, inNeck: 0.5, kind: 'still' };
    const sparkling = { art: 'cork-sparkling', w: 113, h: 160, size: 0.42, inNeck: 0.3, kind: 'sparkling' };
    assert.deepEqual(BOTTLES.dark, { w: 104, h: 360, lip: [51.7, 3.6], cork: still, wine: [0.3, 0.97] });
    assert.deepEqual(BOTTLES['clear-white'], { w: 105, h: 360, lip: [52.2, 3.6], cork: still, wine: [0.28, 0.97] });
    assert.deepEqual(BOTTLES['clear-rose'], { w: 105, h: 360, lip: [51.9, 3.6], cork: still, wine: [0.28, 0.97] });
    assert.deepEqual(BOTTLES['clear-amber'], { w: 106, h: 360, lip: [52.3, 3.6], cork: still, wine: [0.28, 0.97] });
    assert.deepEqual(BOTTLES.sparkling, { w: 116, h: 360, lip: [55.7, 3.6], cork: sparkling, wine: [0.35, 0.97] });
  });

  it('sizes the uncorking props of the AI profile scene', () => {
    assert.deepEqual(UNCORK_ART, {
      corkscrew: { w: 224, h: 273 },
      cage: { w: 135, h: 149 },
      wisp: { w: 45, h: 150 },
    });
  });
});

describe('bottleStage', () => {
  it('is corked before any rating, pours from 0.1 to 4.9 and is finished at 5.0', () => {
    assert.equal(bottleStage(0), 'corked');
    assert.equal(bottleStage(0.1), 'pouring');
    assert.equal(bottleStage(4.9), 'pouring');
    assert.equal(bottleStage(5), 'finished');
  });
});

describe('standPose', () => {
  it('stands the bottle upright on the glasses base line, left of the first glass', () => {
    const layout = pourLayout(600, lookFor('red'));
    const pose = standPose(layout);
    assert.equal(pose.rotate, 0);
    near(pose.left, layout.gh * 0.2);
    near(pose.top + layout.bh, layout.top + layout.gh);
    assert.ok(pose.left + layout.bw < layout.glasses[0]);
  });

  it('leaves 8 px under the standing bottle for its shadow', () => {
    const layout = pourLayout(600, lookFor('red'));
    const pose = standPose(layout);
    assert.ok(Math.abs(layout.height - (pose.top + layout.bh) - 8) <= 0.5);
  });
});

describe('corkBox', () => {
  it('centres the cork on the lip with part of it above the lip', () => {
    for (const type of ['red', 'sparkling']) {
      const look = lookFor(type);
      const layout = pourLayout(600, look);
      const bottle = BOTTLES[look.bottle];
      const cork = corkBox(layout, look);
      const lipX = (bottle.lip[0] / bottle.w) * layout.bw;
      const lipY = (bottle.lip[1] / bottle.h) * layout.bh;
      near(cork.left + cork.width / 2, lipX);
      near(cork.width, layout.bw * bottle.cork.size);
      near(cork.height, (cork.width * bottle.cork.h) / bottle.cork.w);
      assert.ok(cork.top < lipY && cork.top + cork.height > lipY);
      near(lipY - cork.top, cork.height * (1 - bottle.cork.inNeck));
    }
  });
});

describe('wineLeft', () => {
  it('keeps the share of wine not poured yet: full at 0, half at 2.5, empty at 5', () => {
    assert.equal(wineLeft(0), 1);
    assert.equal(wineLeft(2.5), 0.5);
    near(wineLeft(3.6), 0.28);
    assert.equal(wineLeft(5), 0);
  });

  it('stays between 0 and 1', () => {
    assert.equal(wineLeft(-1), 1);
    assert.equal(wineLeft(6), 0);
  });
});

describe('wineSurfaceY', () => {
  const look = lookFor('red');
  const layout = pourLayout(600, look);
  const cy = 200;

  it('upright, fills from the base (0.97) up to the shoulder (0.3)', () => {
    near(wineSurfaceY(50, cy, 0, 1, layout, look), cy + (0.3 - 0.5) * layout.bh);
    near(wineSurfaceY(50, cy, 0, 0, layout, look), cy + (0.97 - 0.5) * layout.bh);
    near(wineSurfaceY(50, cy, 0, 0.5, layout, look), cy + (0.635 - 0.5) * layout.bh);
  });

  it('lying on its side, the wine spans the bottle width', () => {
    near(wineSurfaceY(50, cy, 90, 0, layout, look), cy + layout.bw / 2);
    near(wineSurfaceY(50, cy, 90, 1, layout, look), cy - layout.bw / 2);
  });

  it('turned past horizontal, the wine gathers at the shoulder', () => {
    near(wineSurfaceY(50, cy, 180, 0, layout, look), cy + 0.2 * layout.bh);
    const full = wineSurfaceY(50, cy, POUR_ANGLE, 1, layout, look);
    const empty = wineSurfaceY(50, cy, POUR_ANGLE, 0, layout, look);
    assert.ok(full < empty);
  });

  it('keeps the remaining share between 0 and 1', () => {
    near(wineSurfaceY(50, cy, 0, 2, layout, look), wineSurfaceY(50, cy, 0, 1, layout, look));
    near(wineSurfaceY(50, cy, 0, -1, layout, look), wineSurfaceY(50, cy, 0, 0, layout, look));
  });
});

describe('phase and settle', () => {
  it('phase eases in and out between start and end', () => {
    assert.equal(phase(-1, 0, 1), 0);
    near(phase(0.25, 0, 1), 0.0625);
    near(phase(0.75, 0, 1), 0.9375);
    assert.equal(phase(2, 0, 1), 1);
    near(phase(0.5, 0.4, 0.6), 0.5);
  });

  it('settle slows down like an object coming to rest', () => {
    assert.equal(settle(0, 0, 1), 0);
    near(settle(0.5, 0, 1), 0.875);
    assert.equal(settle(3, 0, 1), 1);
  });
});

describe('uncorkScene', () => {
  const s = 2;
  const opacities = scene => Object.values(scene).map(part => part.opacity);

  it('still wine: the cork waits in the neck and the corkscrew comes in', () => {
    const start = uncorkScene(0, 'still', s);
    for (const [key, expected] of Object.entries({ dx: 0, dy: 0, rotate: 0, scaleX: 1, opacity: 1 })) {
      near(start.cork[key], expected);
    }
    assert.equal(start.screw.opacity, 0);
    assert.equal(start.wisp.opacity, 0);
    assert.equal(start.cage.opacity, 0);
    assert.equal(start.foam.opacity, 0);
    assert.equal(uncorkScene(0.04, 'still', s).screw.opacity, 1);
  });

  it('still wine: the corkscrew turns into the cork and pulls it out', () => {
    const turned = uncorkScene(0.46, 'still', s);
    near(turned.screw.dy, 14 * s);
    near(turned.screw.scaleX, -1);
    const pulled = uncorkScene(0.8, 'still', s);
    near(pulled.cork.dy, -20 * s);
    near(pulled.screw.dy, 14 * s - 20 * s);
  });

  it('still wine: the aroma rises and fades', () => {
    near(uncorkScene(0.78, 'still', s).wisp.opacity, 0.35);
    near(uncorkScene(0.9, 'still', s).wisp.opacity, 0.4375);
    near(uncorkScene(1, 'still', s).wisp.dy, -18 * s);
  });

  it('sparkling: the cage comes off, the cork wiggles, pops and foam wells up', () => {
    const start = uncorkScene(0, 'sparkling', s);
    assert.equal(start.cage.opacity, 1);
    assert.equal(start.cork.opacity, 1);
    assert.equal(start.foam.opacity, 0);
    assert.equal(start.screw.opacity, 0);
    assert.equal(start.wisp.opacity, 0);
    const off = uncorkScene(0.36, 'sparkling', s);
    near(off.cage.dx, 16 * s);
    near(off.cage.dy, -12 * s);
    near(off.cage.rotate, 28);
    near(uncorkScene(0.43, 'sparkling', s).cork.rotate, 7 * Math.sin(0.0625 * 6 * Math.PI));
    const flying = uncorkScene(0.7, 'sparkling', s);
    near(flying.cork.dx, 10 * s * 0.875);
    near(flying.cork.dy, -70 * s * 0.875);
    near(flying.cork.rotate, 220 * 0.875);
    const foam = uncorkScene(0.86, 'sparkling', s).foam;
    near(foam.dy, -9 * s);
    near(foam.scaleX, 1);
    near(foam.opacity, 1);
  });

  it('every prop is gone at the end, so the bottle can be lifted', () => {
    for (const kind of ['still', 'sparkling']) {
      assert.deepEqual(opacities(uncorkScene(1, kind, s)), [0, 0, 0, 0, 0]);
    }
  });
});

describe('uncorkProps', () => {
  it('places the corkscrew and the aroma over the cork of a still bottle', () => {
    const look = lookFor('red');
    const layout = pourLayout(600, look);
    const cork = corkBox(layout, look);
    const props = uncorkProps(layout, look);
    assert.equal(props.kind, 'still');
    near(props.scale, cork.width / 12);
    near(props.lipX, cork.left + cork.width / 2);
    near(props.lipY, (3.6 / 360) * layout.bh);
    assert.deepEqual(props.cork, cork);
    const s = props.scale;
    near(props.screw.width, 224 * 0.17 * s);
    near(props.screw.height, 273 * 0.17 * s);
    near(props.screw.left, props.lipX - 110 * 0.17 * s);
    near(props.screw.top, cork.top - 2 * s - props.screw.height);
    near(props.screw.tip, 110 * 0.17 * s);
    near(props.wisp.width, 45 * 0.2 * s);
    near(props.wisp.height, 150 * 0.2 * s);
    near(props.wisp.left + props.wisp.width / 2, props.lipX);
    near(props.wisp.top, props.lipY - 26 * s);
  });

  it('places the cage and six foam bubbles on a sparkling bottle', () => {
    const look = lookFor('sparkling');
    const layout = pourLayout(600, look);
    const cork = corkBox(layout, look);
    const props = uncorkProps(layout, look);
    assert.equal(props.kind, 'sparkling');
    const s = cork.width / 16;
    near(props.scale, s);
    near(props.cage.width, (cork.width * 135) / 113);
    near(props.cage.height, (cork.width * 149) / 113);
    near(props.cage.left + props.cage.width / 2, props.lipX);
    near(props.cage.top, cork.top - s);
    assert.equal(props.foam.length, 6);
    near(props.foam[0].x, props.lipX - 4 * s);
    near(props.foam[0].size, 7 * s);
    near(props.foam[2].size, 10 * s);
  });

  it('hides whatever is below the lip, inside the neck', () => {
    const look = lookFor('red');
    const props = uncorkProps(pourLayout(600, look), look);
    assert.ok(props.neckClip.startsWith('polygon('));
    assert.ok(props.neckClip.includes(`${props.lipY.toFixed(2)}px`));
  });
});

describe('wineClip and surfaceClip', () => {
  const box = GLASSES.bordeaux.box;

  it('uncovers the wine from the bottom of its box up to the level', () => {
    assert.equal(wineClip(box, 1), 'inset(20.09% 0 0 0)');
    assert.equal(wineClip(box, 0), 'inset(49.48% 0 0 0)');
    assert.equal(wineClip(box, 0.5), 'inset(34.78% 0 0 0)');
  });

  it('draws a thin surface line at the level and hides it in an empty glass', () => {
    assert.equal(surfaceClip(box, 1), 'inset(20.09% 0 78.51% 0)');
    assert.equal(surfaceClip(box, 0), 'inset(100% 0 0 0)');
  });
});

describe('ratingForKey', () => {
  it('moves 0.1 with the arrows and 0.5 with Page Up and Page Down', () => {
    assert.equal(ratingForKey('ArrowRight', 3.6), 3.7);
    assert.equal(ratingForKey('ArrowUp', 3.6), 3.7);
    assert.equal(ratingForKey('ArrowLeft', 3.6), 3.5);
    assert.equal(ratingForKey('ArrowDown', 3.6), 3.5);
    assert.equal(ratingForKey('PageUp', 3.6), 4.1);
    assert.equal(ratingForKey('PageDown', 3.6), 3.1);
  });

  it('jumps to the minimum and the maximum with Home and End, and stays in range', () => {
    assert.equal(ratingForKey('Home', 3.6), 0.1);
    assert.equal(ratingForKey('End', 3.6), 5);
    assert.equal(ratingForKey('PageUp', 4.8), 5);
    assert.equal(ratingForKey('ArrowDown', 0.1), 0.1);
  });

  it('ignores any other key', () => {
    assert.equal(ratingForKey('Enter', 3.6), null);
    assert.equal(ratingForKey('a', 3.6), null);
  });
});

describe('pourLayout', () => {
  it('lays five glasses over the width with the glass proportions', () => {
    const layout = pourLayout(600, lookFor('red'));
    near(layout.end, 42);
    near(layout.side + layout.inner + layout.end, 600);
    near(layout.slot, layout.inner / 5);
    near(layout.gh, layout.slot * 1.35);
    near(layout.top, layout.gh * 0.9);
    near(layout.gw, (layout.gh * 177) / 360);
    assert.equal(layout.height, Math.round(layout.top + layout.gh + 8));
    assert.equal(layout.glasses.length, 5);
    near(layout.glasses[0], layout.side + (layout.slot - layout.gw) / 2);
    near(layout.bw, (layout.bh * 104) / 360);
  });

  it('makes the bottle 1.3 glass heights tall', () => {
    const layout = pourLayout(600, lookFor('red'));
    near(layout.bh, layout.gh * 1.3);
    assert.ok(layout.bh > 150);
  });

  it('leaves room left of the glasses for the standing bottle', () => {
    const layout = pourLayout(600, lookFor('red'));
    near(layout.side, layout.gh * (0.2 + 0.45) + layout.bw);
  });

  it('keeps a minimum margin on a phone', () => {
    const layout = pourLayout(320, lookFor('sparkling'));
    assert.equal(layout.end, 34);
    near(layout.top, layout.gh * 0.9);
    near(layout.side + layout.inner + layout.end, 320);
  });
});

describe('pourFrame', () => {
  const look = lookFor('red');
  const layout = pourLayout(600, look);

  it('tilts the bottle to the pouring angle and shows the stream while the score rises', () => {
    const frame = pourFrame(layout, look, 2.2, true);
    assert.equal(POUR_ANGLE, 125);
    assert.equal(frame.rotate, 125);
    assert.equal(frame.streamOpacity, 1);
    assert.deepEqual(frame.fills.slice(0, 2), [1, 1]);
    assert.ok(Math.abs(frame.fills[2] - 0.2) < 1e-9);
    // the lip follows the score along the rail
    assert.ok(Math.abs(frame.lip.x - (layout.side + (2.2 / 5) * layout.inner)) < 1e-9);
    assert.match(frame.stream, /^M[\d.]+,[\d.]+ Q[\d.]+,[\d.]+ [\d.]+,[\d.]+$/);
    // the stream lands in the third glass, the one being filled
    const third = layout.side + 2 * layout.slot;
    assert.ok(frame.target.x > third && frame.target.x < third + layout.slot);
  });

  it('places the bottle so its lip sits on the rail at the pouring angle', () => {
    const frame = pourFrame(layout, look, 3.6, true);
    const bottle = BOTTLES[look.bottle];
    const a = (POUR_ANGLE * Math.PI) / 180;
    const ox = (bottle.lip[0] / bottle.w - 0.5) * layout.bw;
    const oy = (bottle.lip[1] / bottle.h - 0.5) * layout.bh;
    const cx = frame.left + layout.bw / 2;
    const cy = frame.top + layout.bh / 2;
    assert.ok(Math.abs(cx + ox * Math.cos(a) - oy * Math.sin(a) - frame.lip.x) < 1e-9);
    assert.ok(Math.abs(cy + ox * Math.sin(a) + oy * Math.cos(a) - frame.lip.y) < 1e-9);
  });

  it('lifts the bottle and hides the stream while the score falls or rests', () => {
    const frame = pourFrame(layout, look, 3.6, false);
    assert.equal(REST_ANGLE, 62);
    assert.equal(frame.rotate, 62);
    assert.equal(frame.streamOpacity, 0);
  });

  it('aims at the first glass before any rating, so the stream stays a valid path', () => {
    const frame = pourFrame(layout, look, 0, false);
    assert.deepEqual(frame.fills, [0, 0, 0, 0, 0]);
    assert.ok(Number.isFinite(frame.target.x) && Number.isFinite(frame.target.y));
    assert.doesNotMatch(frame.stream, /NaN/);
  });

  it('pours into the last glass at the maximum', () => {
    const frame = pourFrame(layout, look, 5, true);
    const fifth = layout.side + 4 * layout.slot;
    assert.ok(frame.target.x > fifth && frame.target.x < fifth + layout.slot);
  });
});

describe('pourLayout room for the score', () => {
  it('widens the right margin so the last glass centre leaves the asked room', () => {
    for (const width of [320, 600, 900]) {
      const layout = pourLayout(width, lookFor('red'), 150);
      near(layout.side + layout.inner + layout.end, width);
      near(width - (layout.glasses[4] + layout.gw / 2), 150);
    }
  });

  it('keeps the usual margin when the room already fits', () => {
    assert.deepEqual(pourLayout(600, lookFor('red'), 10), pourLayout(600, lookFor('red')));
  });

  it('asks room for the bar glass, the gap and the score', () => {
    const look = lookFor('red');
    const bar = barLayout(pourLayout(600, look), look);
    near(scoreRoom(look, 90), bar.glassWidth / 2 + 1 + BAR_SCORE_GAP + 90);
    assert.equal(scoreRoom(look, Number.NaN), scoreRoom(look, 0));
  });
});

describe('slider bar', () => {
  const look = lookFor('red');
  const layout = pourLayout(600, look);
  const centre = index => layout.glasses[index] + layout.gw / 2;

  it('puts 1 under the first glass centre and 5 under the last', () => {
    near(barXAtRating(1, layout), centre(0));
    near(barXAtRating(5, layout), centre(4));
    for (let score = 1; score <= 5; score += 1) near(barXAtRating(score, layout), centre(score - 1));
  });

  it('puts 0 one slot left of the first glass and holds the scale at 0 and 5', () => {
    near(barXAtRating(0, layout), centre(0) - layout.slot);
    near(barXAtRating(-3, layout), barXAtRating(0, layout));
    near(barXAtRating(9, layout), barXAtRating(5, layout));
    near(barXAtRating(2.5, layout), centre(0) + 1.5 * layout.slot);
  });

  it('turns a bar position back into a raw score, held at 0 and 5', () => {
    for (const score of [0, 0.1, 1, 2.37, 4.9, 5]) near(ratingAtBarX(barXAtRating(score, layout), layout), score);
    assert.equal(ratingAtBarX(-500, layout), 0);
    assert.equal(ratingAtBarX(10_000, layout), 5);
  });

  it('runs the track from the score 0 to the last glass centre, with a 38 px glass centred on it', () => {
    const bar = barLayout(layout, look);
    near(bar.trackLeft, barXAtRating(0, layout));
    near(bar.trackLeft + bar.trackWidth, centre(4));
    assert.equal(BAR_GLASS_HEIGHT, 38);
    assert.equal(bar.height, 38);
    assert.equal(bar.glassHeight, 38);
    near(bar.glassWidth, (38 * GLASSES.bordeaux.w) / GLASSES.bordeaux.h);
    near(bar.trackTop + BAR_TRACK / 2, bar.height / 2);
    assert.equal(bar.width, Math.ceil(centre(4) + bar.glassWidth / 2));
    assert.ok(bar.width < 600);
  });

  it('centres the thumb glass on the score and fills the track up to it', () => {
    const bar = barLayout(layout, look);
    near(barThumbLeft(3, layout, bar) + bar.glassWidth / 2, centre(2));
    near(barFillWidth(3, layout, bar), centre(2) - bar.trackLeft);
    near(barFillWidth(5, layout, bar), bar.trackWidth);
    assert.equal(barFillWidth(0, layout, bar), 0);
  });

  it('fills the thumb glass with the score out of five', () => {
    assert.equal(barThumbFill(0), 0);
    assert.equal(barThumbFill(2.5), 0.5);
    assert.equal(barThumbFill(3.6), 0.72);
    assert.equal(barThumbFill(5), 1);
    assert.equal(barThumbFill(7), 1);
  });
});

describe('trackGradient', () => {
  it('gives every wine look its two-stop wine gradient', () => {
    assert.deepEqual(trackGradient(lookFor('red')), ['#2A0A3B', '#7E1A47']);
    assert.deepEqual(trackGradient(lookFor('fortified')), ['#5A1027', '#9E2338']);
    assert.deepEqual(trackGradient(lookFor('rose')), ['#C9606B', '#F0B0A4']);
    assert.deepEqual(trackGradient(lookFor('white')), ['#F6DE92', '#E4B654']);
    assert.deepEqual(trackGradient(lookFor('orange')), ['#9A5A1E', '#D9A04F']);
    assert.deepEqual(trackGradient(lookFor('dessert')), ['#9A5A1E', '#D9A04F']);
    assert.deepEqual(trackGradient(lookFor('sparkling')), ['#F3E3A0', '#E2C25A']);
    for (const type of WINE_TYPES) assert.equal(trackGradient(lookFor(type)).length, 2);
  });

  it('falls back to the red gradient for an unknown wine layer', () => {
    assert.deepEqual(trackGradient({ glass: 'bordeaux', wine: 'mystery', bottle: 'dark', pour: '#000' }), [
      '#2A0A3B',
      '#7E1A47',
    ]);
  });
});

describe('ratingFromPointer', () => {
  it('maps the pointer position over the glasses to a score', () => {
    const layout = pourLayout(600, lookFor('red'));
    assert.equal(ratingFromPointer(100 + layout.side + layout.inner / 2, 100, layout), 2.5);
    assert.equal(ratingFromPointer(0, 100, layout), 0.1);
    assert.equal(ratingFromPointer(10_000, 100, layout), 5);
  });
});

describe('bubbleSpots', () => {
  it('spreads four bubbles inside a flute and none in other glasses', () => {
    const flute = pourLayout(600, lookFor('sparkling'));
    const spots = bubbleSpots('flute', flute.gh);
    assert.equal(spots.length, 4);
    assert.deepEqual(spots.map(spot => spot.delay), [0, 0.45, 0.9, 1.35]);
    for (const spot of spots) {
      assert.ok(spot.left > 12 && spot.left < 88);
      assert.ok(spot.rise > 0);
    }
    assert.deepEqual(bubbleSpots('bordeaux', 100), []);
  });
});

describe('labels and examples', () => {
  it('speaks Spanish by default and English for en', () => {
    assert.equal(labelsFor('es').yourRating, 'Tu puntuación');
    assert.equal(labelsFor('en').yourRating, 'Your rating');
    assert.equal(labelsFor('fr').yourRating, 'Tu puntuación');
    assert.equal(labelsFor('es').valueText(3.6), '3.6 de 5');
    assert.equal(labelsFor('en').valueText(3.6), '3.6 of 5');
    assert.equal(labelsFor('es').noValue, 'Sin puntuación');
    assert.equal(labelsFor('en').noValue, 'No rating yet');
    assert.equal(labelsFor('es').types.rose, 'Rosado');
    assert.equal(labelsFor('en').types.rose, 'Rosé');
    assert.equal(labelsFor('es').hint, 'Deslizá la botella o la barra para puntuar');
    assert.equal(labelsFor('en').hint, 'Drag the bottle or the bar to rate');
    for (const type of WINE_TYPES) {
      assert.ok(labelsFor('es').types[type]);
      assert.ok(labelsFor('en').types[type]);
    }
  });

  it('shows the same four example rows in both languages', () => {
    const es = examplesFor('es');
    const en = examplesFor('en');
    assert.equal(es.length, 4);
    assert.deepEqual(es.map(row => [row.type, row.value]), en.map(row => [row.type, row.value]));
    assert.deepEqual(es.map(row => row.value), [4.3, 2.2, 3.7, 4.8]);
    assert.match(es[0].note, /reseñas/);
    assert.match(en[0].note, /reviews/);
    assert.deepEqual(examplesFor('fr'), es);
  });
});
