const { StarTwoTone, Layers, LocalDrinkTwoTone } = require("@material-ui/icons")

// Initialize Kaboom
kaboom({
    global: true,
    fullscreen: true,
    scale: 1,
    debug: true,
    // Background
    clearColor: [0, 0, 0, 1]
})
//Coin Sprite
loadSprite('coin', 'https://imgur.com/wbKxhcd');
//Shroom Sprite
loadSprite('evil-shroom', 'https://imgur.com/KPO3fR9');
//Brick
loadSprite('brick', 'https://imgur.com/pogC9x5');
//Block
loadSprite('block', 'https://imgur.com/bdrLpi6');
//Turtle
// loadSprite('coin', 'https://imgur.com/KPO3fR9');
//Mario
loadSprite('mario', 'https://imgur.com/Wb1qfhK');
//Mushroom
loadSprite('mushroom', 'https://imgur.com/0wMd92p');
//Flower
loadSprite('flower', 'https://imgur.com/uaUm9sN');
// Surprise
loadSprite('surprise', 'https://imgur.com/gesQ1KP');
//Unboxed
loadSprite('unboxed', 'https://imgur.com/fVscIbn');
//Pipes
loadSprite('pipe-top-left', 'https://imgur.com/nqQ79eI');
loadSprite('pipe-top-right', 'https://imgur.com/rl3cTER');
loadSprite('pipe-bottom-left', 'https://imgur.com/ReTPiWY');
loadSprite('pipe-bottom-right', 'https://imgur.com/c1cYSbt');



screen("game", () => {
    //Add layers for background, obj, and ui
    layers(['bg', 'obj', 'ui'], 'obj')



})

// Start Game
start("game")