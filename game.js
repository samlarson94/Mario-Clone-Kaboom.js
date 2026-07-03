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
const JUMP_FORCE = 380;
const BIG_JUMP_FORCE = 550;
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
        '                                                                ====                                ',
        '              ====                           %                   ()                                 ',
        '          *    ()                      ====                      ()                                 ',
        '               ()                       ()                       ()                                 ',
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
    '^': [sprite('evil-shroom'), solid(), 'dangerous'],
    '#': [sprite('mushroom'), solid(), 'mushroom', body()],
    '!': [sprite('blue-block'), solid(), scale(0.5)],
    '/': [sprite('blue-brick'), solid(), scale(0.5)],
    's': [sprite('blue-steel'), solid(), scale(0.5)],
    '@': [sprite('blue-surprise'), solid(), scale(0.5), 'blue-coin-surprise-box'],
    'm': [sprite('blue-surprise'), solid(), scale(0.5), 'blue-mushroom-surprise'],
    'z': [sprite('blue-evil-shroom'), solid(), scale(0.5), 'dangerous'],
});

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

    // Enemy & mushroom movement (frozen while the warp menu is open)
    action('mushroom', (m) => {
        if (window.__paused) return;
        m.move(20, 0);
    });

    action('dangerous', (d) => {
        if (window.__paused) return;
        d.move(-20, 0);
    });

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
start('menu');
