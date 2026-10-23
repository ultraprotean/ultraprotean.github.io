/* The look of this page: a theme, a background pattern, and a slow drift, picked at random for each
   visit (kept for the life of the tab). The drift is a small velocity-easing loop, the same idea as
   the one in the VibeMail app, so changing the look glides instead of jumping. */
(function () {
  'use strict';

  var THEMES = ['hearthside', 'moonlit', 'meadow'];
  var PATTERNS = ['grain', 'gingham', 'clouds', 'stardust'];
  var DIRECTIONS = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se', 'circle'];
  var SPINS = ['cw', 'ccw'];
  var VECTORS = { n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0], nw: [-1, -1] };
  // Repeat size of each pattern in pixels; must match --tile in styles.css.
  var TILES = { grain: 240, gingham: 56, clouds: 360, stardust: 320 };
  var LOOK_KEY = 'ultraprotean.look';
  var MOTION_KEY = 'ultraprotean.motion';

  var CIRCLE_RADIUS = 500; // px
  var EASE_SECONDS = 0.6;
  var MAX_STEP = 0.1; // seconds
  var PX_PER_SECOND_PER_LEVEL = 4;

  var root = document.documentElement;
  var layer = document.querySelector('.backdrop-layer');
  var reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function newLook() {
    return { theme: pick(THEMES), pattern: pick(PATTERNS), dir: pick(DIRECTIONS), speed: 1 + Math.floor(Math.random() * 5), spin: pick(SPINS) };
  }

  function validLook(look) {
    return Boolean(
      look &&
        THEMES.indexOf(look.theme) > -1 &&
        PATTERNS.indexOf(look.pattern) > -1 &&
        DIRECTIONS.indexOf(look.dir) > -1 &&
        SPINS.indexOf(look.spin) > -1 &&
        look.speed >= 1 &&
        look.speed <= 5 &&
        look.speed % 1 === 0,
    );
  }

  function saveLook(look) {
    try {
      sessionStorage.setItem(LOOK_KEY, JSON.stringify(look));
    } catch (e) {
      /* the look then lasts until reload */
    }
  }

  // The inline script in <head> already picked the look before first paint.
  var look = validLook(window.__look) ? window.__look : null;
  if (!look) {
    try {
      var stored = JSON.parse(sessionStorage.getItem(LOOK_KEY) || 'null');
      if (validLook(stored)) look = stored;
    } catch (e) {
      /* fall through */
    }
  }
  if (!look) {
    look = newLook();
    saveLook(look);
  }

  function motionAllowed() {
    var saved = null;
    try {
      saved = localStorage.getItem(MOTION_KEY);
    } catch (e) {
      /* default to on */
    }
    return !(reducedQuery && reducedQuery.matches) && saved !== 'off';
  }

  // --- drift engine -----------------------------------------------------------------------------

  var state = { x: 0, y: 0, vx: 0, vy: 0, angle: Math.PI / 4, mode: 'compass' };
  var frame = 0;
  var last = null;

  function target() {
    var speed = look.speed * PX_PER_SECOND_PER_LEVEL;
    if (!motionAllowed()) return { kind: 'compass', vx: 0, vy: 0 };
    if (look.dir === 'circle') return { kind: 'circle', speed: speed, spin: look.spin };
    var v = VECTORS[look.dir];
    var length = Math.hypot(v[0], v[1]);
    return { kind: 'compass', vx: (speed * v[0]) / length, vy: (speed * v[1]) / length };
  }

  function wrap(value, tile) {
    return tile > 0 ? ((value % tile) + tile) % tile : 0;
  }

  function step(t, dtSeconds, tile) {
    var dt = Math.min(Math.max(dtSeconds, 0), MAX_STEP);
    var tvx;
    var tvy;
    if (t.kind === 'circle') {
      if (state.mode !== 'circle') {
        // join the circle already heading the way we are going: no sudden turn
        if (Math.hypot(state.vx, state.vy) > 0.05) state.angle = Math.atan2(state.vy, state.vx);
        state.mode = 'circle';
      }
      state.angle = (state.angle + (t.spin === 'cw' ? 1 : -1) * (t.speed / CIRCLE_RADIUS) * dt) % (Math.PI * 2);
      tvx = t.speed * Math.cos(state.angle);
      tvy = t.speed * Math.sin(state.angle);
    } else {
      state.mode = 'compass';
      tvx = t.vx;
      tvy = t.vy;
    }
    var ease = 1 - Math.exp(-dt / EASE_SECONDS);
    state.vx += (tvx - state.vx) * ease;
    state.vy += (tvy - state.vy) * ease;
    state.x = wrap(state.x + state.vx * dt, tile);
    state.y = wrap(state.y + state.vy * dt, tile);
  }

  function tick(now) {
    var t = target();
    var dt = last === null ? 0 : (now - last) / 1000;
    last = now;
    step(t, dt, TILES[look.pattern]);
    if (layer) layer.style.transform = 'translate3d(' + state.x + 'px, ' + state.y + 'px, 0)';
    var stopped = t.kind === 'compass' && t.vx === 0 && t.vy === 0 && Math.hypot(state.vx, state.vy) < 0.05;
    frame = stopped ? 0 : requestAnimationFrame(tick);
  }

  function startLoop() {
    if (frame) return;
    last = null;
    frame = requestAnimationFrame(tick);
  }

  // --- look and controls ------------------------------------------------------------------------

  var themeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  var shuffleButton = document.getElementById('shuffle');
  var motionButton = document.getElementById('motion');

  function applyLook() {
    root.dataset.theme = look.theme;
    root.dataset.pattern = look.pattern;
    root.dataset.motion = motionAllowed() ? 'on' : 'off';
    themeButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-theme-choice') === look.theme));
    });
    if (motionButton) {
      var reduced = Boolean(reducedQuery && reducedQuery.matches);
      var on = motionAllowed();
      motionButton.setAttribute('aria-pressed', String(on));
      motionButton.disabled = reduced;
      motionButton.textContent = on ? 'Motion on' : 'Motion off';
      motionButton.title = reduced ? 'Off because your device asks for reduced motion' : 'Turn the gentle animation on or off';
    }
    startLoop();
  }

  themeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      look.theme = button.getAttribute('data-theme-choice');
      saveLook(look);
      applyLook();
    });
  });

  if (shuffleButton) {
    shuffleButton.addEventListener('click', function () {
      var next = newLook();
      for (var attempt = 0; attempt < 6 && next.theme === look.theme && next.pattern === look.pattern && next.dir === look.dir; attempt += 1) {
        next = newLook();
      }
      look = next;
      saveLook(look);
      applyLook();
    });
  }

  if (motionButton) {
    motionButton.addEventListener('click', function () {
      try {
        localStorage.setItem(MOTION_KEY, motionAllowed() ? 'off' : 'on');
      } catch (e) {
        /* preference not saved */
      }
      applyLook();
    });
  }

  if (reducedQuery && reducedQuery.addEventListener) reducedQuery.addEventListener('change', applyLook);

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  applyLook();
})();
