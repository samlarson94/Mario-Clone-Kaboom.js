// ════════════════════════════════════════════════════════════════════════════
//  SUPER MARIO — retro Kaboom.js platformer
//  4 themed worlds · touch controls · chiptune SFX · CSS parallax backdrops
// ════════════════════════════════════════════════════════════════════════════

// ── Chiptune SFX (WebAudio square-wave synth — no audio files needed) ────────
const SFX = (() => {
    let ctx = null;
    function tone(freq, dur, delay = 0, type = 'square', vol = 0.06) {
        try {
            if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
            const t = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + dur);
        } catch (e) { /* audio unavailable — play silently */ }
    }
    return {
        jump()  { tone(320, 0.10); tone(480, 0.08, 0.05); },
        coin()  { tone(988, 0.08); tone(1319, 0.16, 0.07); },
        stomp() { tone(220, 0.10, 0, 'triangle', 0.10); tone(150, 0.12, 0.07, 'triangle', 0.10); },
        power() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.09, i * 0.07)); },
        die()   { [392, 330, 262, 196, 147].forEach((f, i) => tone(f, 0.14, i * 0.11)); },
        warp()  { [200, 320, 480, 720].forEach((f, i) => tone(f, 0.06, i * 0.05)); },
        select() { tone(660, 0.06); },
    };
})();

// ── Chiptune background music (WebAudio square/triangle step sequencer) ──────
// Each track loops forever: a lead line (square wave) over a bass pulse
// (triangle wave). No audio files — every note is synthesized, just like SFX.
const MUSIC = (() => {
    let ctx = null;
    let masterGain = null;
    let muted = false;
    try { muted = localStorage.getItem('marioMusicMuted') === '1'; } catch (e) {}

    let currentTrack = null;
    let genToken = 0;
    let timerId = null;

    function ensureCtx() {
        try {
            if (!ctx) {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
                masterGain = ctx.createGain();
                masterGain.gain.value = muted ? 0 : 0.2;
                masterGain.connect(ctx.destination);
            }
            if (ctx.state === 'suspended') ctx.resume();
        } catch (e) { /* audio unavailable — fail silently */ }
    }

    // note name ('C4', 'F#3', ...) -> frequency, equal temperament, A4 = 440Hz
    const SEMI = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
    function freq(note) {
        if (!note) return 0; // rest
        const m = /^([A-G]#?)(\d)$/.exec(note);
        if (!m) return 0;
        const semi = SEMI[m[1]] + (parseInt(m[2], 10) - 4) * 12;
        return 440 * Math.pow(2, semi / 12);
    }

    function playNote(f, t, dur, type, vol) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + dur + 0.03);
    }

    // line: [[noteName|null, beats], ...] — schedules starting at startAt, returns total duration
    function scheduleLine(line, startAt, beat, type, vol) {
        let t = startAt;
        line.forEach(([note, beats]) => {
            const dur = beats * beat;
            const f = freq(note);
            if (f > 0) playNote(f, t, dur * 0.88, type, vol);
            t += dur;
        });
        return t - startAt;
    }
    const TRACKS = {
        title: { // bright C-major fanfare loop for the world-select screen
            tempo: 150,
            lead: [
                ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5],
                ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5],
                ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5],
                ['D5', 0.5], ['F5', 0.5], ['E5', 1],
                ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5],
                ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 0.5],
                ['D5', 1], ['G4', 1],
            ],
            bass: [
                ['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1],
                ['F2', 1], ['C3', 1], ['G2', 1], ['C3', 1],
                ['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1],
                ['F2', 1], ['G2', 1], ['C3', 2],
            ],
        },
        space: { // mysterious A-minor arpeggios — WORLD 1
            tempo: 118,
            lead: [
                ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5],
                ['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5],
                ['F5', 0.5], ['A5', 0.5], ['C6', 0.5], ['A5', 0.5],
                ['E5', 0.5], ['C5', 0.5], ['A4', 1],
                ['B4', 0.5], ['D5', 0.5], ['F5', 0.5], ['D5', 0.5],
                ['B4', 0.5], ['G4', 0.5], ['E4', 1],
            ],
            bass: [
                ['A2', 2], ['A2', 2], ['F2', 2], ['F2', 2],
                ['C3', 2], ['C3', 2], ['E2', 2], ['E2', 2],
            ],
        },
        sunset: { // driving synthwave groove — WORLD 2
            tempo: 128,
            lead: [
                ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5],
                ['E5', 0.5], ['E5', 0.5], ['E5', 1],
                ['D5', 0.5], ['D5', 0.5], ['D5', 1],
                ['E5', 0.5], ['G5', 0.5], ['G5', 1],
                ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5],
                ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5],
                ['C5', 2],
            ],
            bass: [
                ['A2', 0.5], ['A2', 0.5], ['A2', 0.5], ['A2', 0.5],
                ['F2', 0.5], ['F2', 0.5], ['F2', 0.5], ['F2', 0.5],
                ['G2', 0.5], ['G2', 0.5], ['G2', 0.5], ['G2', 0.5],
                ['E2', 0.5], ['E2', 0.5], ['E2', 0.5], ['E2', 0.5],
            ],
        },
        prairie: { // bouncy pastoral G-major walk — WORLD 3
            tempo: 140,
            lead: [
                ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 0.5],
                ['D5', 0.5], ['B4', 0.5], ['G4', 1],
                ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['A5', 0.5],
                ['E5', 0.5], ['C5', 0.5], ['A4', 1],
                ['B4', 0.5], ['D5', 0.5], ['G5', 0.5], ['B5', 0.5],
                ['A5', 0.5], ['G5', 0.5], ['F#5', 0.5], ['G5', 0.5],
                ['D5', 1], ['G4', 1],
            ],
            bass: [
                ['G2', 1], ['B2', 1], ['D3', 1], ['B2', 1],
                ['A2', 1], ['C3', 1], ['E3', 1], ['C3', 1],
                ['B2', 1], ['D3', 1], ['G3', 1], ['D3', 1],
            ],
        },
        spooky: { // eerie minor crawl — WORLD 4
            tempo: 96,
            lead: [
                ['D5', 0.5], ['A#4', 0.5], ['D5', 0.5], ['F5', 0.5],
                ['D#5', 0.5], ['C5', 0.5], ['A#4', 1],
                ['D5', 0.5], ['A#4', 0.5], ['G#4', 0.5], ['A4', 0.5],
                ['D5', 1], ['C5', 1],
                ['A#4', 0.5], ['G4', 0.5], ['A#4', 0.5], ['D5', 0.5],
                ['C5', 0.5], ['A4', 0.5], ['G4', 1],
            ],
            bass: [
                ['D3', 2], ['D3', 2], ['A#2', 2], ['A#2', 2],
                ['G#2', 2], ['G#2', 2], ['A2', 2], ['A2', 2],
            ],
        },
    };

    function runLoop(name, token) {
        if (token !== genToken || !ctx) return;
        const track = TRACKS[name];
        const beat = 60 / track.tempo;
        const startAt = ctx.currentTime + 0.05;
        const dur = scheduleLine(track.lead, startAt, beat, 'square', 0.22);
        if (track.bass) scheduleLine(track.bass, startAt, beat, 'triangle', 0.16);
        timerId = setTimeout(() => runLoop(name, token), Math.max(80, (dur - 0.12) * 1000));
    }

    return {
        play(name) {
            if (!TRACKS[name] || currentTrack === name) return;
            ensureCtx();
            if (!ctx) return;
            currentTrack = name;
            genToken++;
            clearTimeout(timerId);
            runLoop(name, genToken);
        },
        stop() {
            currentTrack = null;
            genToken++;
            clearTimeout(timerId);
        },
        toggleMute() {
            muted = !muted;
            try { localStorage.setItem('marioMusicMuted', muted ? '1' : '0'); } catch (e) {}
            if (masterGain) masterGain.gain.value = muted ? 0 : 0.2;
            return muted;
        },
        isMuted() { return muted; },
    };
})();

// ── World metadata (theme class drives the CSS backdrop scene) ───────────────
const WORLD_INFO = [
    { name: 'SPACE',   css: 'theme-space' },
    { name: 'SUNSET',  css: 'theme-sunset' },
    { name: 'PRAIRIE', css: 'theme-prairie' },
    { name: 'SPOOKY',  css: 'theme-halloween' },
    { name: 'STADIUM', css: 'theme-stadium' },
    { name: 'BEACH',   css: 'theme-beach' },
    { name: 'JUNGLE',  css: 'theme-jungle' },
];

// ── DOM helpers & UI state ───────────────────────────────────────────────────
const $id = (id) => document.getElementById(id);
const pad3 = (n) => String(n).padStart(3, '0');

let currentLevel = 0;
let gameState = 'title';          // 'title' | 'playing' | 'over'
let hiScore = 0;
try { hiScore = parseInt(localStorage.getItem('marioHiScore')) || 0; } catch (e) {}

function saveHi(score) {
    if (score > hiScore) {
        hiScore = score;
        try { localStorage.setItem('marioHiScore', hiScore); } catch (e) {}
        return true;
    }
    return false;
}

function setTheme(level) {
    document.body.className = WORLD_INFO[level].css;
}

function setHud(score, level) {
    liveScore = score;
    $id('hud-score').textContent = 'SCORE ' + pad3(score);
    $id('hud-hi').textContent    = 'HI ' + pad3(Math.max(hiScore, score));
    $id('hud-world').textContent = 'WORLD ' + (level + 1) + ' · ' + WORLD_INFO[level].name;
}

let toastTimer = null;
function toast(msg, ms = 1800) {
    const el = $id('hud-toast');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.display = 'none'; }, ms);
}

function focusCanvas() {
    const c = document.querySelector('canvas');
    if (c) setTimeout(() => c.focus(), 0);
}

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ── Screen navigation (called from HTML buttons too) ─────────────────────────
let liveScore = 0;

window.startGame = (level, score = 0) => {
    currentLevel = level;
    gameState = 'playing';
    window.__paused = false;
    SFX.warp();
    MUSIC.play(WORLD_INFO[level].music);
    $id('title-screen').style.display     = 'none';
    $id('game-over-screen').style.display = 'none';
    $id('warp-screen').style.display      = 'none';
    $id('game-hud').style.display         = 'flex';
    $id('mobile-controls').style.display  = isTouchDevice() ? 'flex' : 'none';
    go('game', { level, score });
    focusCanvas();
};

window.retryGame = () => window.startGame(currentLevel);

window.goToTitle = () => {
    gameState = 'title';
    window.__paused = true;
    setTheme(0);
    MUSIC.play('title');
    $id('game-over-screen').style.display = 'none';
    $id('warp-screen').style.display      = 'none';
    $id('game-hud').style.display         = 'none';
    $id('mobile-controls').style.display  = 'none';
    $id('title-screen').style.display     = 'flex';
};

window.openWarp = () => {
    if (gameState !== 'playing') return;
    window.__paused = true;
    SFX.select();
    $id('warp-screen').style.display = 'flex';
};

window.closeWarp = () => {
    window.__paused = false;
    SFX.select();
    $id('warp-screen').style.display = 'none';
    focusCanvas();
};

function updateMuteButtons(muted) {
    ['btn-mute-title', 'btn-mute-hud'].forEach((id) => {
        const el = $id(id);
        if (el) el.textContent = muted ? '♪ OFF' : '♪ ON';
    });
}

window.toggleMusic = () => {
    updateMuteButtons(MUSIC.toggleMute());
    SFX.select();
};

// Browsers block audio until a user gesture — start the title theme on the
// first tap/click/keypress anywhere, so it's playing by the time they choose.
document.addEventListener('pointerdown', function unlockMusic() {
    document.removeEventListener('pointerdown', unlockMusic);
    if (gameState === 'title') MUSIC.play('title');
}, { once: true });
document.addEventListener('keydown', function unlockMusicKey() {
    document.removeEventListener('keydown', unlockMusicKey);
    if (gameState === 'title') MUSIC.play('title');
}, { once: true });

// Keyboard shortcuts that work regardless of canvas focus
document.addEventListener('keydown', (e) => {
    const titleUp = $id('title-screen').style.display !== 'none';
    const warpUp  = $id('warp-screen').style.display !== 'none' &&
                    $id('warp-screen').style.display !== '';
    const overUp  = $id('game-over-screen').style.display === 'flex';

    const worldKey = parseInt(e.key);
    if ((titleUp || warpUp || overUp) && worldKey >= 1 && worldKey <= WORLD_INFO.length) {
        window.startGame(worldKey - 1);
    } else if (titleUp && e.key === 'Enter') {
        window.startGame(0);
    } else if (overUp && e.key === 'Enter') {
        window.retryGame();
    } else if (e.key === 'Escape' && gameState === 'playing') {
        warpUp ? window.closeWarp() : window.openWarp();
    }
});

// Kaboom 0.5.0 sizes its canvas once and never resizes — on device rotation,
// save the run, reload, and resume seamlessly at the new dimensions.
window.addEventListener('orientationchange', () => {
    if (gameState === 'playing') {
        try {
            sessionStorage.setItem('marioResume',
                JSON.stringify({ level: currentLevel, score: liveScore }));
        } catch (e) {}
    }
    setTimeout(() => location.reload(), 250);
});

let resumeData = null;
try {
    resumeData = JSON.parse(sessionStorage.getItem('marioResume'));
    sessionStorage.removeItem('marioResume');
} catch (e) {}

// ── Touch / mouse bindings for the on-screen pad ─────────────────────────────
const virtualKeys = { left: false, right: false, jump: false, down: false };

function bindCtrlBtn(id, key) {
    const el = $id(id);
    if (!el) return;
    const press   = (e) => { e.preventDefault(); virtualKeys[key] = true; };
    const release = (e) => { e.preventDefault(); virtualKeys[key] = false; };
    el.addEventListener('touchstart',  press,   { passive: false });
    el.addEventListener('touchend',    release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    el.addEventListener('mousedown',   press);
    el.addEventListener('mouseup',     release);
    el.addEventListener('mouseleave',  release);
}

bindCtrlBtn('btn-left',  'left');
bindCtrlBtn('btn-right', 'right');
bindCtrlBtn('btn-down',  'down');
bindCtrlBtn('btn-jump',  'jump');

// ── Kaboom init — transparent canvas so the CSS backdrop shows through ───────
kaboom({
    global: true,
    fullscreen: true,
    scale: 1,
    debug: false,
    clearColor: [0, 0, 0, 0],
});

const MOVE_SPEED = 120;
const JUMP_FORCE = 450;
const BIG_JUMP_FORCE = 650;
let CURRENT_JUMP_FORCE = JUMP_FORCE;
const FALL_DEATH = 400;
const COYOTE_TIME = 0.1;   // grace period to jump after walking off a ledge

loadRoot('https://i.imgur.com/');
loadSprite('coin',              'wbKxhcd.png');
loadSprite('evil-shroom',       'KPO3fR9.png');
loadSprite('brick',             'pogC9x5.png');
loadSprite('block',             'M6rwarW.png');
loadSprite('mario',             'Wb1qfhK.png');
loadSprite('mushroom',          '0wMd92p.png');
loadSprite('surprise',          'gesQ1KP.png');
loadSprite('unboxed',           'bdrLpi6.png');
loadSprite('pipe-top-left',     'ReTPiWY.png');
loadSprite('pipe-top-right',    'hj2GK4n.png');
loadSprite('pipe-bottom-left',  'c1cYSbt.png');
loadSprite('pipe-bottom-right', 'nqQ79eI.png');
loadSprite('blue-block',        'fVscIbn.png');
loadSprite('blue-brick',        '3e5YRQd.png');
loadSprite('blue-steel',        'gqVoI2b.png');
loadSprite('blue-evil-shroom',  'SvV4ueD.png');
loadSprite('blue-surprise',     'RMqCc1G.png');

// ── Level maps ───────────────────────────────────────────────────────────────
const MAPS = [
    // WORLD 1 · SPACE — the classic
    [
        '                                                ',
        '                                                ',
        '                                                ',
        '                                                ',
        '                                                ',
        '   ===        %  =%  =*=%=               =====  ',
        '                                                ',
        '                                                ',
        '                              -+                ',
        '                    *    ^  ^ ()                ',
        '=================================   ============',
    ],
    // WORLD 2 · SUNSET — the blue caverns
    [
        's                                                       s',
        's                                                       s',
        's                                                       s',
        's                                                       s',
        's                                                       s',
        's                                                       s',
        's                                                       s',
        's                                            /          s',
        's         !@!       @!   !m!!              ///       -+ s',
        's                                        /////       () s',
        's                                       //////       () s',
        's                          z   z  /    ///////       () s',
        's!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!  !!!!!!!!!!  !!!!!!!s',
    ],
    // WORLD 3 · PRAIRIE — the long trek
    [
        's                                                                                                      s',
        's                                                                                                      s',
        's                                                                                                      s',
        's                                                                        @m                            s',
        's                                                                                                      s',
        's                                                   @@                                                 s',
        's                                                                 !!!!!!!                              s',
        's                                                          !!!!                                        s',
        's         !@!       @!   !m!!                      !!!!                                                s',
        's                                        /////                                                         s',
        's                                       //////                                                      -+ s',
        's                          z   z  /    ///////                      z       z       z               () s',
        's!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!  !!!!!!!!!!    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!s',
    ],
    // WORLD 4 · SPOOKY — all-new Halloween gauntlet
    [
        '                                                                                    ',
        '                                                                                    ',
        '                    %                                                               ',
        '                                            =%=                                     ',
        '       ===                                                        ===               ',
        '                     =*=                                                            ',
        '                ^                     ^                        ^                    ',
        '           ======                ======         ======      ======                  ',
        '                                                                               -+   ',
        '                 z       ^  ^            z            ^   ^                    ()   ',
        '=============================   ============   ====================================',
    ],
    // WORLD 5 · STADIUM — sprint the gridiron, hurdle the blockers
    [
        '                                                                                          ',
        '                                                                                          ',
        '                                                                                          ',
        '                                         %%%                                              ',
        '                                                                                          ',
        '            %%%               *                   %%             %                        ',
        '                                                                                          ',
        '                                                                                          ',
        '                                          =                                =          -+  ',
        '            =        =           ^        =         ^       =       ^      =    ^     ()  ',
        '==========================================================================================',
    ],
    // WORLD 6 · BEACH — island hops over the surf
    [
        '                                                                                               ',
        '                                                                                               ',
        '                                                                                               ',
        '                                                                                               ',
        '                                                                                               ',
        '        %                               *                %%                                    ',
        '                                                                                               ',
        '                              ======                                  ======                   ',
        '                                                       =                                   -+  ',
        '                      ^                     ^          =      ^                   ^        ()  ',
        '===============   =============    ==============   ===================    ====================',
    ],
    // WORLD 7 · JUNGLE — climb the pipe-trunk trees
    [
        '                                                                                                    ',
        '                                                                                                    ',
        '                               z                                                                    ',
        '                              ====                ====                                              ',
        '                                                                                                    ',
        '              ====                           %                                                      ',
        '          *    ()                      ====                                                         ',
        '               ()                       ()                      ====                                 ',
        '               ()                       ()                       ()                             -+  ',
        '               ()                  z    ()     z                 ()     z                 z     ()  ',
        '=========================   ===========================   ======================   =================',
    ],
];

// Built lazily — sprite() can only run once assets are loaded
const levelCfg = () => ({
    width: 20,
    height: 20,
    '=': [sprite('block'), solid()],
    '$': [sprite('coin'), 'coin'],
    '%': [sprite('surprise'), solid(), 'coin-surprise-box'],
    '*': [sprite('surprise'), solid(), 'mushroom-surprise'],
    '}': [sprite('unboxed'), solid()],
    '(': [sprite('pipe-bottom-left'), solid(), scale(0.5)],
    ')': [sprite('pipe-bottom-right'), solid(), scale(0.5)],
    '-': [sprite('pipe-top-left'), solid(), scale(0.5), 'pipe'],
    '+': [sprite('pipe-top-right'), solid(), scale(0.5), 'pipe'],
    '^': [sprite('evil-shroom'), solid(), body(), 'dangerous'],
    '#': [sprite('mushroom'), solid(), 'mushroom', body()],
    '!': [sprite('blue-block'), solid(), scale(0.5)],
    '/': [sprite('blue-brick'), solid(), scale(0.5)],
    's': [sprite('blue-steel'), solid(), scale(0.5)],
    '@': [sprite('blue-surprise'), solid(), scale(0.5), 'blue-coin-surprise-box'],
    'm': [sprite('blue-surprise'), solid(), scale(0.5), 'blue-mushroom-surprise'],
    'z': [sprite('blue-evil-shroom'), solid(), body(), scale(0.5), 'dangerous'],
});

// Static tiles a foe can stand on (everything solid except the foes themselves)
const SOLID_TERRAIN = new Set(['=', '%', '*', '}', '(', ')', '-', '+', '!', '/', 's', '@', 'm']);

// ── Scenes ───────────────────────────────────────────────────────────────────

// Menu: nothing on canvas — the HTML title screen covers everything.
// If we just reloaded for an orientation change, resume the run instead.
scene('menu', () => {
    if (resumeData && Number.isInteger(resumeData.level)) {
        const r = resumeData;
        resumeData = null;
        window.startGame(r.level % MAPS.length, r.score || 0);
    }
});

scene('game', ({ level, score }) => {
    currentLevel = level;
    gameState = 'playing';
    CURRENT_JUMP_FORCE = JUMP_FORCE;
    Object.keys(virtualKeys).forEach((k) => { virtualKeys[k] = false; });
    setTheme(level);
    setHud(score, level);

    layers(['bg', 'obj', 'ui'], 'obj');

    const gameLevel = addLevel(MAPS[level], levelCfg());

    // Solidity grid (in tile coordinates) so foes can sense walls and ledges
    const map = MAPS[level];
    const MAP_ROWS = map.length;
    const solidGrid = map.map((row) => {
        const arr = [];
        for (let i = 0; i < row.length; i++) arr.push(SOLID_TERRAIN.has(row[i]));
        return arr;
    });
    function solidAt(col, row) {
        if (row < 0 || row >= MAP_ROWS) return false;
        const r = solidGrid[row];
        return col >= 0 && col < r.length && r[col];
    }
    // Is there any platform below this column within the world? (vs a bottomless
    // pit that would drop a foe off the map)
    function hasFloorBelow(col, fromRow) {
        for (let r = fromRow; r < MAP_ROWS; r++) if (solidAt(col, r)) return true;
        return false;
    }

    // Power-up component — big for `duration` seconds, then shrink back
    function big() {
        let timer = 0;
        let isBig = false;
        return {
            update() {
                if (isBig) {
                    CURRENT_JUMP_FORCE = BIG_JUMP_FORCE;
                    timer -= dt();
                    if (timer <= 0) this.smallify();
                }
            },
            isBig()    { return isBig; },
            smallify() {
                this.scale = vec2(1);
                CURRENT_JUMP_FORCE = JUMP_FORCE;
                timer = 0;
                isBig = false;
            },
            biggify(duration) {
                this.scale = vec2(2);
                CURRENT_JUMP_FORCE = BIG_JUMP_FORCE;
                timer = duration || 6;
                isBig = true;
            },
        };
    }

    const player = add([
        sprite('mario'),
        solid(),
        pos(30, 0),
        body(),
        origin('bot'),
        big(),
    ]);

    let scoreVal = score;
    let isJumping = true;
    let lastGrounded = 0;
    let warped = false;
    let nearPipe = false;
    let pipeHinted = false;

    // Smooth-follow camera state (fully owned here — no camPos() getter needed)
    let camX = player.pos.x;
    let camY = player.pos.y;

    // Parallax backdrop layers (CSS, behind the transparent canvas)
    const bdMid  = $id('bd-mid');
    const bdNear = $id('bd-near');

    function addScore(n, at) {
        scoreVal += n;
        setHud(scoreVal, level);
        popup('+' + n, at);
    }

    function popup(txt, at) {
        const p = add([
            text(txt, 10),
            pos(at.x, at.y - 14),
            color(1, 0.85, 0.25),
            layer('obj'),
            { life: 0 },
        ]);
        p.action(() => {
            p.life += dt();
            p.pos.y -= 36 * dt();
            if (p.life > 0.6) destroy(p);
        });
    }

    function shake(n) {
        try { camShake(n); } catch (e) {}
    }

    function die() {
        if (warped) return;
        warped = true;
        SFX.die();
        MUSIC.stop();
        saveHi(scoreVal);
        go('lose', { score: scoreVal });
    }

    function warpNext() {
        if (warped) return;
        warped = true;
        SFX.warp();
        go('game', {
            level: (level + 1) % MAPS.length,
            score: scoreVal,
        });
    }

    function doJump() {
        isJumping = true;
        player.jump(CURRENT_JUMP_FORCE);
        SFX.jump();
    }

    // Gravity-driven patrol: a foe walks, falls onto whatever platform is
    // below it, turns around at walls, drops off ledges that land on a lower
    // platform, and bounces back from ledges that would drop it off the map.
    // (All movement is frozen while the warp menu is open.)
    const ENEMY_SPEED = 24;
    const SHROOM_SPEED = 20;

    function patrol(e, speed, startDir) {
        if (window.__paused) return;
        if (e.dir === undefined) e.dir = startDir;

        // Only steer while grounded; mid-air, let gravity carry the drop
        const plat = e.curPlatform && e.curPlatform();
        if (plat && plat.gridPos) {
            const col = plat.gridPos.x;        // tile column beneath the foe
            const groundRow = plat.gridPos.y;  // row of that supporting tile
            const ahead = col + e.dir;

            if (solidAt(ahead, groundRow - 1)) {
                e.dir *= -1;                                   // wall ahead
            } else if (!solidAt(ahead, groundRow) &&
                       !hasFloorBelow(ahead, groundRow + 1)) {
                e.dir *= -1;                                   // off-map drop
            }
            // else: ledge with a platform below → walk off and fall
        }

        e.move(e.dir * speed, 0);

        // Safety net: if one ever escapes the world, remove it
        if (e.pos.y > MAP_ROWS * 20 + 240) destroy(e);
    }

    action('dangerous', (d) => patrol(d, ENEMY_SPEED, -1));
    action('mushroom',  (m) => patrol(m, SHROOM_SPEED, 1));

    // Surprise boxes
    player.on('headbump', (obj) => {
        if (obj.is('coin-surprise-box')) {
            gameLevel.spawn('$', obj.gridPos.sub(0, 1));
            destroy(obj);
            gameLevel.spawn('}', obj.gridPos.sub(0, 0));
            SFX.select();
        }
        if (obj.is('mushroom-surprise')) {
            gameLevel.spawn('#', obj.gridPos.sub(0, 1));
            destroy(obj);
            gameLevel.spawn('}', obj.gridPos.sub(0, 0));
            SFX.select();
        }
        if (obj.is('blue-coin-surprise-box')) {
            gameLevel.spawn('$', obj.gridPos.sub(0, 1));
            destroy(obj);
            gameLevel.spawn('/', obj.gridPos.sub(0, 0));
            SFX.select();
        }
        if (obj.is('blue-mushroom-surprise')) {
            gameLevel.spawn('#', obj.gridPos.sub(0, 1));
            destroy(obj);
            gameLevel.spawn('/', obj.gridPos.sub(0, 0));
            SFX.select();
        }
    });

    // Pickups & hazards
    player.collides('mushroom', (m) => {
        destroy(m);
        player.biggify(6);
        SFX.power();
        toast('POWER UP!', 1200);
    });

    player.collides('coin', (c) => {
        destroy(c);
        SFX.coin();
        addScore(1, c.pos);
    });

    player.collides('dangerous', (d) => {
        if (isJumping) {
            destroy(d);
            SFX.stomp();
            shake(4);
            addScore(2, d.pos);
        } else {
            die();
        }
    });

    // Main loop — camera, parallax, touch input, pipe warp, fall death
    player.action(() => {
        if (window.__paused) return;

        // Smooth camera follow
        const ease = Math.min(1, dt() * 8);
        camX += (player.pos.x - camX) * ease;
        camY += (player.pos.y - camY) * ease;
        camPos(vec2(camX, camY));

        // CSS parallax — far scenery drifts slower than the world
        if (bdMid)  bdMid.style.transform  = 'translate3d(' + (-camX * 0.04) + 'px,0,0)';
        if (bdNear) bdNear.style.transform = 'translate3d(' + (-camX * 0.10) + 'px,0,0)';

        if (player.grounded()) {
            isJumping = false;
            lastGrounded = time();
        }

        // Touch movement
        if (virtualKeys.left)  player.move(-MOVE_SPEED, 0);
        if (virtualKeys.right) player.move(MOVE_SPEED, 0);

        const canJump = player.grounded() || (!isJumping && time() - lastGrounded < COYOTE_TIME);
        if (virtualKeys.jump && canJump) doJump();

        // Pipe proximity (manual overlap test — reliable every frame)
        nearPipe = false;
        every('pipe', (p) => {
            if (Math.abs(p.pos.x - player.pos.x) <= 22 &&
                Math.abs(p.pos.y - player.pos.y) <= 12) {
                nearPipe = true;
            }
        });
        if (nearPipe && !pipeHinted) {
            pipeHinted = true;
            toast('PRESS ▼ TO WARP');
        }
        if (nearPipe && virtualKeys.down) warpNext();

        if (player.pos.y >= FALL_DEATH) die();
    });

    // Keyboard
    keyDown('left',  () => { if (!window.__paused) player.move(-MOVE_SPEED, 0); });
    keyDown('right', () => { if (!window.__paused) player.move(MOVE_SPEED, 0); });
    keyDown('a',     () => { if (!window.__paused) player.move(-MOVE_SPEED, 0); });
    keyDown('d',     () => { if (!window.__paused) player.move(MOVE_SPEED, 0); });
    keyDown('down',  () => { if (!window.__paused && nearPipe) warpNext(); });

    const jumpKeys = ['space', 'up', 'w'];
    jumpKeys.forEach((k) => keyPress(k, () => {
        if (window.__paused) return;
        const canJump = player.grounded() || (!isJumping && time() - lastGrounded < COYOTE_TIME);
        if (canJump) doJump();
    }));
});

scene('lose', ({ score }) => {
    gameState = 'over';
    const isRecord = score >= hiScore && score > 0;
    $id('final-score').textContent = pad3(score);
    $id('final-hi').textContent    = pad3(hiScore);
    $id('new-record').style.display = isRecord ? 'block' : 'none';
    $id('game-over-screen').style.display = 'flex';
    $id('game-hud').style.display         = 'none';
    $id('mobile-controls').style.display  = 'none';
});

// Boot to the title screen
setTheme(0);
updateMuteButtons(MUSIC.isMuted());
start('menu');
