// Initialize Kaboom
https://unsplash.com/photos/4dpAqfTbvKA
kaboom({
    global: true,
    fullscreen: true,
    scale: 1,
    debug: true,
    // Background - Add space image
    clearColor: [0, 0, 1, 2]
})

const MOVE_SPEED = 120;
const JUMP_FORCE = 380;
const BIG_JUMP_FORCE = 550;
let CURRENT_JUMP_FORCE = JUMP_FORCE;
let isJumping = true;
const FALL_DEATH = 400;


loadRoot('https://i.imgur.com/')
loadSprite('coin', 'wbKxhcd.png')
loadSprite('evil-shroom', 'KPO3fR9.png')
loadSprite('brick', 'pogC9x5.png')
loadSprite('block', 'M6rwarW.png')
// Find Custom Astronaut Mario
loadSprite('mario', 'Wb1qfhK.png') 
loadSprite('mushroom', '0wMd92p.png')
loadSprite('surprise', 'gesQ1KP.png')
loadSprite('unboxed', 'bdrLpi6.png')
loadSprite('pipe-top-left', 'ReTPiWY.png')
loadSprite('pipe-top-right', 'hj2GK4n.png')
loadSprite('pipe-bottom-left', 'c1cYSbt.png')
loadSprite('pipe-bottom-right', 'nqQ79eI.png')

//Blue Sprites
loadSprite('blue-block', 'fVscIbn.png')
loadSprite('blue-brick', '3e5YRQd.png')
loadSprite('blue-steel', 'gqVoI2b.png')
loadSprite('blue-evil-shroom', 'SvV4ueD.png')
loadSprite('blue-surprise', 'RMqCc1G.png')
loadSprite('blue-block', '3e5YRQd.png')
loadSprite('blue-block', '3e5YRQd.png')


scene("game", ({ level, score }) => {
    //Add layers for background, obj, and ui
    layers(['bg', 'obj', 'ui'], 'obj')

    const maps = [[
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
    ]]

    const levelCfg = {
        width: 20, 
        height: 20, 
        '=': [sprite('block'), solid()],
        '$': [sprite('coin'), 'coin'],
        '%': [sprite('surprise'), solid(), 'coin-suprise-box'],
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
        '@': [sprite('blue-surprise'), solid(), scale(0.5), 'coin-surprise-box'],
        'm': [sprite('blue-surprise'), solid(), scale(0.5), 'mushroom-surprise'],
        'z': [sprite('blue-evil-shroom'), solid(), scale(0.5), 'dangerous'],

    }

    const gameLevel = addLevel(maps[level], levelCfg)

    // Big Function
    function big() {
        let timer = 0
        let isBig = false
        return {
            update() {
                if (isBig) {
                    CURRENT_JUMP_FORCE = BIG_JUMP_FORCE
                    timer -=dt()
                    if (timer <= 0) {
                        this.smallify()
                    }
                }
            },
            isBig() {
                return isBig
            },
            smallify() {
                this.scale = vec2(1)
                CURRENT_JUMP_FORCE = JUMP_FORCE
                timer = 0
                isBig = false
            },
            biggify() {
                this.scale = vec2(2)
                CURRENT_JUMP_FORCE = BIG_JUMP_FORCE
                timer = time
                isBig = true
            }
        }
    }

    const scoreLabel = add([
        text("SCORE: " + score),
        pos(30, 6),
        layer('ui'),
        {
            value: score,
        }
    ])

    add([text('level ' + parseInt(level + 1)), pos(40,25)])

    const player = add([
        sprite('mario'), 
        solid(), 
        // Starting Position
        pos(30, 0),
        // Body method will automatically add gravity
        body(), 
        origin('bot'),
        big(),
    ])

    //Action for moving mushroom
    action('mushroom', (m) => {
        m.move(20, 0)
    })

    //Make evil mushrooms move
    const ENEMY_SPEED = 20
    action('dangerous', (d) => {
        d.move(-ENEMY_SPEED, 0)
    })

    //HeadBump
    player.on("headbump", (obj) => {
        //Add conditional for coin-suprise headbump
        if (obj.is('coin-suprise-box')) {
            //Spawn coin right above object's position
            gameLevel.spawn('$', obj.gridPos.sub(0,1))
            //Destroy object
            destroy(obj)
            //Replace object with unboxed version of the surprise box
            gameLevel.spawn('}', obj.gridPos.sub(0,0))
        }
        //Add conditional for mushroom-surprise headbump
        if (obj.is('mushroom-surprise')) {
            //Spawn shroom right above object's position
            gameLevel.spawn('#', obj.gridPos.sub(0,1))
            //Destroy object
            destroy(obj)
            //Replace object with unboxed version of the surprise box
            gameLevel.spawn('}', obj.gridPos.sub(0,0))
        }
    })

    //Mario Eats Mushroom and Grows
    player.collides('mushroom', (m) => {
        destroy(m)
        player.biggify(6)
    })

    //Mario Collects Coin
    player.collides('coin', (c) => {
        destroy(c)
        scoreLabel.value++
        scoreLabel.text = scoreLabel.value
    })

    //Mario collides with Enemies
    player.collides('dangerous', (d) => {
        if (isJumping) {
            destroy(d)
        } else {
            go('lose', { score: scoreLabel.value })
        }
    })
   
    //Establish Camera Position and Bottom of Game
    player.action(() => {
        //Put Camera on Player
        camPos(player.pos)
        //Establish "bottom"
        if (player.pos.y >= FALL_DEATH) {
            go('lose', { score: scoreLabel.value })
        }
    })

    // Transfer player and score to next level (Using Pipe)
    player.collides('pipe', () => {
        keyDown('down', () => {
            go('game', {
                level: (level + 1) % maps.length,
                score: scoreLabel.value,
            })
        })
    })

    //Attach key events to player as event listeners
    keyDown('left', () => {
        player.move(-MOVE_SPEED, 0)
    })

    keyDown('right', () => {
        player.move(MOVE_SPEED, 0)
    })

    player.action(() => {
        if (player.grounded()) {
            isJumping = false
        }
    })

    keyDown('space', () => {
        if(player.grounded()) {
            isJumping = true
            player.jump(CURRENT_JUMP_FORCE)
        }
    })

});

scene('lose', ({ score }) => {
    add([text(score, 32), origin('center'), pos(width()/2, height()/2)])
});

// Start Game
start("game", { level: 0, score: 0 });