// Initialize Kaboom
kaboom({
    global: true,
    fullscreen: true,
    scale: 1,
    debug: true,
    // Background - Add space image
    clearColor: [0, 0, 0, 1]
})

const MOVE_SPEED = 120;
const JUMP_FORCE = 380;
const BIG_JUMP_FORCE = 550;
let CURRENT_JUMP_FORCE = JUMP_FORCE;


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



scene("game", () => {
    //Add layers for background, obj, and ui
    layers(['bg', 'obj', 'ui'], 'obj')

    const map = [
        '                                                ',
        '                                                ',
        '                                                ',
        '                                                ',
        '                                                ',
        '           %  =%  =*=%=               =====     ',
        '                                                ',
        '                                                ',
        '                              -+                ',
        '                    *    ^  ^ ()                ',
        '=================================   ============',
    ]

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
        '-': [sprite('pipe-top-left'), solid(), scale(0.5)],
        '+': [sprite('pipe-top-right'), solid(), scale(0.5)],
        '^': [sprite('evil-shroom'), solid()],
        '#': [sprite('mushroom'), solid(), 'mushroom', body()],
    }

    const gameLevel = addLevel(map, levelCfg)

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
        text('test'),
        pos(30, 6),
        layer('ui'),
        {
            value: 'test',
        }
    ])

    add([text('level ' + 'test', pos(4,6))])

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
   

    //Attach key events to player as event listeners
    keyDown('left', () => {
        player.move(-MOVE_SPEED, 0)
    })

    keyDown('right', () => {
        player.move(MOVE_SPEED, 0)
    })

    keyDown('space', () => {
        if(player.grounded()) {
            player.jump(CURRENT_JUMP_FORCE)
        }
    })

});

// Start Game
start("game");