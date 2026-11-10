import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  actionForKey,
  apply,
  chapterFill,
  countAt,
  eased,
  formatClock,
  formatNumber,
  hashFor,
  progress,
  slideFromHash,
  swipeAction,
} from '../src/components/Presentation/deck.mjs';

// Three slides: the first builds in two steps, the second in one and the last in three.
const STEPS = [2, 1, 3];
const at = (slide, step) => ({ slide, step });

describe('actionForKey', () => {
  it('moves forward with the arrows, space, Enter and PageDown', () => {
    for (const key of ['ArrowRight', 'ArrowDown', ' ', 'Enter', 'PageDown']) {
      assert.equal(actionForKey(key), 'next', key);
    }
  });

  it('moves back with the arrows, Backspace and PageUp', () => {
    for (const key of ['ArrowLeft', 'ArrowUp', 'Backspace', 'PageUp']) {
      assert.equal(actionForKey(key), 'prev', key);
    }
  });

  it('jumps to the ends with Home and End and toggles full screen with F', () => {
    assert.equal(actionForKey('Home'), 'first');
    assert.equal(actionForKey('End'), 'last');
    assert.equal(actionForKey('f'), 'fullscreen');
    assert.equal(actionForKey('F'), 'fullscreen');
  });

  it('ignores every other key', () => {
    assert.equal(actionForKey('a'), null);
    assert.equal(actionForKey('Escape'), null);
  });
});

describe('apply', () => {
  it('reveals the next step before leaving a slide', () => {
    assert.deepEqual(apply(at(0, 0), 'next', STEPS), at(0, 1));
    assert.deepEqual(apply(at(0, 1), 'next', STEPS), at(1, 0));
  });

  it('stays on the last step of the last slide', () => {
    assert.deepEqual(apply(at(2, 2), 'next', STEPS), at(2, 2));
  });

  it('hides a step before going back, and lands on the previous slide fully built', () => {
    assert.deepEqual(apply(at(2, 1), 'prev', STEPS), at(2, 0));
    assert.deepEqual(apply(at(2, 0), 'prev', STEPS), at(1, 0));
    assert.deepEqual(apply(at(1, 0), 'prev', STEPS), at(0, 1));
  });

  it('stays on the first step of the first slide', () => {
    assert.deepEqual(apply(at(0, 0), 'prev', STEPS), at(0, 0));
  });

  it('jumps to the start or to the last slide fully built', () => {
    assert.deepEqual(apply(at(1, 0), 'first', STEPS), at(0, 0));
    assert.deepEqual(apply(at(0, 1), 'last', STEPS), at(2, 2));
  });

  it('keeps the position for actions it does not move with', () => {
    const position = at(1, 0);
    assert.equal(apply(position, 'fullscreen', STEPS), position);
  });
});

describe('slideFromHash and hashFor', () => {
  it('reads the 1-based slide number from the address', () => {
    assert.equal(slideFromHash('#2', 3), 1);
    assert.equal(slideFromHash('3', 3), 2);
  });

  it('clamps numbers outside the deck', () => {
    assert.equal(slideFromHash('#9', 3), 2);
    assert.equal(slideFromHash('#0', 3), 0);
  });

  it('starts at the first slide when the address has no number', () => {
    assert.equal(slideFromHash('', 3), 0);
    assert.equal(slideFromHash('#intro', 3), 0);
  });

  it('writes the 1-based slide number', () => {
    assert.equal(hashFor(0), '#1');
    assert.equal(hashFor(11), '#12');
  });
});

describe('swipeAction', () => {
  it('turns a horizontal swipe into a move', () => {
    assert.equal(swipeAction(-80, 10), 'next');
    assert.equal(swipeAction(80, -10), 'prev');
  });

  it('ignores short or mostly vertical swipes', () => {
    assert.equal(swipeAction(-20, 0), null);
    assert.equal(swipeAction(-80, 120), null);
    assert.equal(swipeAction(30, 0, 20), 'prev');
  });
});

describe('progress', () => {
  it('counts revealed steps over every step in the deck', () => {
    assert.equal(progress(at(0, 0), STEPS), 0);
    assert.equal(progress(at(1, 0), STEPS), 2 / 5);
    assert.equal(progress(at(2, 2), STEPS), 1);
  });

  it('reports a one-step deck as complete', () => {
    assert.equal(progress(at(0, 0), [1]), 1);
  });
});

describe('chapterFill', () => {
  // Slides 0 and 1 belong to intro, slide 2 to close.
  const chapters = ['intro', 'intro', 'close'];
  const order = ['intro', 'build', 'close'];

  it('weighs each chapter by its steps and skips chapters without slides', () => {
    assert.deepEqual(chapterFill(at(0, 0), STEPS, chapters, order).map(part => [part.chapter, part.weight]), [
      ['intro', 3],
      ['close', 3],
    ]);
  });

  it('fills finished chapters, part of the current one and none of the next', () => {
    assert.deepEqual(chapterFill(at(1, 0), STEPS, chapters, order).map(part => part.fill), [1, 0]);
    assert.deepEqual(chapterFill(at(0, 1), STEPS, chapters, order).map(part => part.fill), [2 / 3, 0]);
    assert.deepEqual(chapterFill(at(2, 2), STEPS, chapters, order).map(part => part.fill), [1, 1]);
  });
});

describe('eased and countAt', () => {
  it('eases out and clamps time to the 0..1 range', () => {
    assert.equal(eased(-1), 0);
    assert.equal(eased(0), 0);
    assert.equal(eased(0.5), 0.875);
    assert.equal(eased(1), 1);
    assert.equal(eased(2), 1);
  });

  it('counts up to the target with the requested decimals', () => {
    assert.equal(countAt(362, 0), 0);
    assert.equal(countAt(362, 0.5), 317);
    assert.equal(countAt(362, 1), 362);
    assert.equal(countAt(83.31, 1, 2), 83.31);
    assert.equal(countAt(83.31, 0.5, 2), 72.9);
  });
});

describe('formatNumber', () => {
  it('uses the separators of each language', () => {
    assert.equal(formatNumber(20000, 'es'), '20.000');
    assert.equal(formatNumber(20000, 'en'), '20,000');
    assert.equal(formatNumber(83.31, 'es', 2), '83,31');
    assert.equal(formatNumber(83.3, 'en', 2), '83.30');
  });
});

describe('formatClock', () => {
  it('shows elapsed minutes and seconds', () => {
    assert.equal(formatClock(0), '00:00');
    assert.equal(formatClock(65_400), '01:05');
    assert.equal(formatClock(20 * 60_000), '20:00');
  });

  it('never shows negative time', () => {
    assert.equal(formatClock(-5000), '00:00');
  });
});
