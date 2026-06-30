// Virtual key state — shared between touch buttons and the game loop
const virtualKeys = { left: false, right: false, jump: false, down: false };
let currentLevel = 0;

// ── Window-exposed API (called from HTML buttons) ────────────────────────────
window.startGame = (level) => {
    currentLevel = level;
    document.getElementById('title-screen').style.display      = 'none';
    document.getElementById('game-over-screen').style.display  = 'none';
    document.getElementById('warp-screen').style.display       = 'none';
    document.getElementById('game-hud').style.display          = 'block';

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    document.getElementById('mobile-controls').style.display = isTouch ? 'flex' : 'none';

    go('game', { level, score: 0 });
};

window.retryGame = () => {
    document.getElementById('game-over-screen').style.display = 'none';
    window.startGame(currentLevel);
};

window.goToTitle = () => {
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('game-hud').style.display         = 'none';
    document.getElementById('mobile-controls').style.display  = 'none';
    document.getElementById('title-screen').style.display     = 'flex';
};

window.openWarp = () => {
    document.getElementById('warp-screen').style.display = 'flex';
};

window.closeWarp = () => {
    document.getElementById('warp-screen').style.display = 'none';
};

// ── Touch / mouse binding for on-screen control buttons ──────────────────────
function bindCtrlBtn(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    const press   = (e) => { e.preventDefault(); virtualKeys[key] = true;  };
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

// ── Kaboom init ──────────────────────────────────────────────────────────────
kaboom({
    global: true,
    fullscreen: true,
    scale: 1,
    debug: false,
    clearColor: [0, 0, 0.5, 1],
});

const MOVE_SPEED = 120;
const JUMP_FORCE = 380;
const BIG_JUMP_FORCE = 550;
let CURRENT_JUMP_FORCE = JUMP_FORCE;
let isJumping = true;
const FALL_DEATH = 400;

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

// ── Scenes ───────────────────────────────────────────────────────────────────

// Menu scene: nothing rendered — the HTML title screen overlay covers the canvas
scene('menu', () => {});

scene('game', ({ level, score }) => {
    currentLevel = level;

    // Reset shared state on each scene entry
    isJumping = true;
    CURRENT_JUMP_FORCE = JUMP_FORCE;
    Object.keys(virtualKeys).forEach((k) => { virtualKeys[k] = false; });

    layers(['bg', 'obj', 'ui'], 'obj');

    const maps = [
        // World 1-1
        [
            '                                                ',
            '                                               ',
            '                                               ',
            '                                               ',
            '                                               ',
            '   ===        %  =%  =*=%=               =====  ',
            '                                               ',
            '                                               ',
            '                              -+               ',
            '                    *    ^  ^ ()               ',
            '=================================   ============',
        ],
        // World 1-2
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
        // World 1-3
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
    ];

    const levelCfg = {
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
    };

    const gameLevel = addLevel(maps[level], levelCfg);

    // Power-up component — manages big/small state with a proper countdown timer
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

    const scoreLabel = add([
        text('SCORE: ' + score),
        pos(30, 6),
        layer('ui'),
        { value: score },
    ]);

    add([text('WORLD 1-' + (level + 1)), pos(30, 25), layer('ui')]);

    const player = add([
        sprite('mario'),
        solid(),
        pos(30, 0),
        body(),
        origin('bot'),
        big(),
    ]);

    // Enemy AI
    action('mushroom',  (m) => m.move(20, 0));
    action('dangerous', (d) => d.move(-20, 0));

    // Head-bump surprise boxes
    player.on('headbump', (obj) => {
        if (obj.is('coin-surprise-box')) {
            gameLevel.spawn('$', obj.gridPos.sub(0, 1));
            destroy(obj);
            gameLevel.spawn('}', obj.gridPos.sub(0, 0));
        }
        if (obj.is('mushroom-surprise')) {
            gameLevel.spawn('#', obj.gridPos.sub(0, 1));
            destroy(obj);
            gameLevel.spawn('}', obj.gridPos.sub(0, 0));
        }
        if (obj.is('blue-coin-surprise-box')) {
            gameLevel.spawn('$', obj.gridPos.sub(0, 1));
            destroy(obj);
            gameLevel.spawn('/', obj.gridPos.sub(0, 0));
        }
        if (obj.is('blue-mushroom-surprise')) {
            gameLevel.spawn('#', obj.gridPos.sub(0, 1));
            destroy(obj);
            gameLevel.spawn('/', obj.gridPos.sub(0, 0));
        }
    });

    // Collectibles & hazards
    player.collides('mushroom', (m) => {
        destroy(m);
        player.biggify(6);
    });

    player.collides('coin', (c) => {
        destroy(c);
        scoreLabel.value++;
        scoreLabel.text = 'SCORE: ' + scoreLabel.value;
    });

    player.collides('dangerous', (d) => {
        if (isJumping) {
            destroy(d);
        } else {
            go('lose', { score: scoreLabel.value });
        }
    });

    // Pipe — enter to advance to the next level
    let nearPipe = false;
    player.collides('pipe', () => {
        nearPipe = true;
        // Keyboard path
        keyDown('down', () => {
            go('game', {
                level: (level + 1) % maps.length,
                score: scoreLabel.value,
            });
        });
    });

    // Main player action loop — handles camera, fall death, and touch input
    player.action(() => {
        camPos(player.pos);

        if (player.grounded()) isJumping = false;

        // Touch / on-screen movement
        if (virtualKeys.left)  player.move(-MOVE_SPEED, 0);
        if (virtualKeys.right) player.move(MOVE_SPEED, 0);

        // Touch jump — consume the flag so it fires once per tap
        if (virtualKeys.jump && player.grounded()) {
            isJumping = true;
            player.jump(CURRENT_JUMP_FORCE);
            virtualKeys.jump = false;
        }

        // Touch pipe entry
        if (nearPipe && virtualKeys.down) {
            nearPipe = false;
            virtualKeys.down = false;
            go('game', {
                level: (level + 1) % maps.length,
                score: scoreLabel.value,
            });
        }

        if (player.pos.y >= FALL_DEATH) {
            go('lose', { score: scoreLabel.value });
        }
    });

    // Keyboard bindings
    keyDown('left',  () => player.move(-MOVE_SPEED, 0));
    keyDown('right', () => player.move(MOVE_SPEED, 0));
    keyDown('space', () => {
        if (player.grounded()) {
            isJumping = true;
            player.jump(CURRENT_JUMP_FORCE);
        }
    });

    // Escape key opens the Warp Zone level-select overlay
    keyDown('escape', () => window.openWarp());
});

scene('lose', ({ score }) => {
    document.getElementById('final-score').textContent        = score;
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('game-hud').style.display         = 'none';
    document.getElementById('mobile-controls').style.display  = 'none';
});

// Start on the menu scene — HTML title screen overlay handles the UI
start('menu');
