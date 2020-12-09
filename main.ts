scene.setTileMapLevel(tilemap`mlevel`)


// let bandPalettes: Buffer[];

// // The top row is just the palette, each row gets darker
// const palette_ramps = image.ofBuffer(hex`e4100400ffff0000d1cb0000a2ff0000b3fc0000e4fc000045ce000086fc000067c80000c8ff000069c80000bafc0000cbff0000fcff0000bdfc0000ceff0000ffff0000`);
// bandPalettes = [];
// for (let band = 0; band < 6; band++) {
//     const buffer = pins.createBuffer(16);
//     for (let i = 0; i < 16; i++) {
//         buffer[i] = palette_ramps.getPixel(i, band + 1);
//     }
//     bandPalettes.push(buffer);
// }


// function toHex(bytes: Buffer) {
//     let r = ""
//     for (let i = 0; i < bytes.length; ++i)
//         r += formatHex(bytes[i])
//     return r
// }

// let chars = "0123456789ABCDEF"
// function formatHex(num: number) {
//     if (num < 16) {
//         return "0" + chars[num];
//     }
//     return chars[(num >> 4) & 0xf] + chars[num & 0xf];
// }


// for (const pallette of bandPalettes) {
//     console.log("hex`" + toHex(pallette) + "`")
// }

namespace shader {
    const shade_1 = hex`0F0D0A0B0E0408060C060B0C0F0B0C0F`
    const shade_2 = hex`0F0B0F0C0C0E0C080F080C0F0F0C0F0F`
    const shade_3 = hex`0F0C0F0F0F0C0F0C0F0C0F0F0F0F0F0F`
    const shade_4 = hex`00000000000000000000000000000000`
    let screenRowsBuffer: Buffer;
    let maskRowsBuffer: Buffer;

    export enum ShadeLevel {
        One = 1,
        Two = 2,
        Three = 3,
        Four = 4
    }

    class ShaderSprite extends Sprite {
        protected shadePalette: Buffer;
        shadeRectangle: boolean;

        constructor(image: Image, shadePalette: Buffer) {
            super(image);
            this.shadePalette = shadePalette;
            this.shadeRectangle = true;
        }

        __drawCore(camera: scene.Camera) {
            if (this.isOutOfScreen(camera)) return;

            const ox = (this.flags & sprites.Flag.RelativeToCamera) ? 0 : camera.drawOffsetX;
            const oy = (this.flags & sprites.Flag.RelativeToCamera) ? 0 : camera.drawOffsetY;

            const l = this.left - ox;
            const t = this.top - oy;

            if (this.shadeRectangle) {
                screen.mapRect(l, t, this.image.width, this.image.height, this.shadePalette);
            }
            else {
                shadeImage(screen, l, t, this.image, this.shadePalette);
            }


            if (this.flags & SpriteFlag.ShowPhysics) {
                const font = image.font5;
                const margin = 2;
                let tx = l;
                let ty = t + this.height + margin;
                screen.print(`${this.x >> 0},${this.y >> 0}`, tx, ty, 1, font);
                tx -= font.charWidth;
                if (this.vx || this.vy) {
                    ty += font.charHeight + margin;
                    screen.print(`v${this.vx >> 0},${this.vy >> 0}`, tx, ty, 1, font);
                }
                if (this.ax || this.ay) {
                    ty += font.charHeight + margin;
                    screen.print(`a${this.ax >> 0},${this.ay >> 0}`, tx, ty, 1, font);
                }
            }

            // debug info
            if (game.debug) {
                screen.drawRect(
                    Fx.toInt(this._hitbox.left) - ox,
                    Fx.toInt(this._hitbox.top) - oy,
                    Fx.toInt(this._hitbox.width),
                    Fx.toInt(this._hitbox.height),
                    1
                );
            }
        }
    }


    function shadeImage(target: Image, left: number, top: number, mask: Image, palette: Buffer) {
        if (!screenRowsBuffer || screenRowsBuffer.length < target.height) {
            screenRowsBuffer = pins.createBuffer(target.height);
        }
        if (!maskRowsBuffer || maskRowsBuffer.length < target.height) {
            maskRowsBuffer = pins.createBuffer(mask.height);
        }

        let targetX = left | 0;
        let targetY = top | 0;
        let y: number;
        let x: number;

        for (x = 0; x < mask.width; x++, targetX++) {
            if (targetX >= target.width) break;
            else if (targetX < 0) continue;

            mask.getRows(x, maskRowsBuffer);
            target.getRows(targetX, screenRowsBuffer);

            for (y = 0, targetY = top | 0; y < mask.height; y++, targetY++) {
                if (targetY >= target.height) break;
                else if (targetY < 0) continue;

                if (maskRowsBuffer[y]) screenRowsBuffer[targetY] = palette[screenRowsBuffer[targetY]];
            }
            target.setRows(targetX, screenRowsBuffer)
        }
    }

    //% blockId=shader_createRectangularShaderSprite
    //% block="create rectangular shader with width $width height $height and level $shadeLevel"
    //% shadeLevel.shadow=shader_shadelevel
    export function createRectangularShaderSprite(width: number, height: number, shadeLevel: ShadeLevel): Sprite {
        const scene = game.currentScene();

        let palette: Buffer;

        switch (shadeLevel) {
            case 1: palette = shade_1; break;
            case 2: palette = shade_2; break;
            case 3: palette = shade_3; break;
            case 4:
            default: palette = shade_4; break;
        }
        const i = image.create(width, height);
        i.fill(3);

        const sprite = new ShaderSprite(i, palette)
        sprite.setKind(_ShaderKind);
        scene.physicsEngine.addSprite(sprite);

        return sprite
    }

    //% blockId=shader_createImageShaderSprite
    //% block="create image shader with $image and level $shadeLevel"
    //% image.shadow=screen_image_picker
    //% shadeLevel.shadow=shader_shadelevel
    export function createImageShaderSprite(image: Image, shadeLevel: ShadeLevel): Sprite {
        const scene = game.currentScene();

        let palette: Buffer;

        switch (shadeLevel) {
            case 1: palette = shade_1; break;
            case 2: palette = shade_2; break;
            case 3: palette = shade_3; break;
            case 4:
            default: palette = shade_4; break;
        }

        const sprite = new ShaderSprite(image, palette)
        sprite.setKind(_ShaderKind);
        scene.physicsEngine.addSprite(sprite);
        sprite.shadeRectangle = false;

        return sprite
    }

    //% blockId=shader_shadelevel
    //% block="$level"
    //% shim=TD_ID
    export function _shadeLevel(level: ShadeLevel): number {
        return level;
    }
}


const _ShaderKind = SpriteKind.create();


// const i = img`
//     . . . . . . . . . . . . . . . .
//     . . . . . . . . . . . . . . . .
//     . . . . . . . . . b 5 5 b . . .
//     . . . . . . b b b b b b . . . .
//     . . . . . b b 5 5 5 5 5 b . . .
//     . b b b b b 5 5 5 5 5 5 5 b . .
//     . b d 5 b 5 5 5 5 5 5 5 5 b . .
//     . . b 5 5 b 5 d 1 f 5 d 4 f . .
//     . . b d 5 5 b 1 f f 5 4 4 c . .
//     b b d b 5 5 5 d f b 4 4 4 4 b .
//     b d d c d 5 5 b 5 4 4 4 4 4 4 b
//     c d d d c c b 5 5 5 5 5 5 5 b .
//     c b d d d d d 5 5 5 5 5 5 5 b .
//     . c d d d d d d 5 5 5 5 5 d b .
//     . . c b d d d d d 5 5 5 b b . .
//     . . . c c c c c c c c b b . . .
// `

// i.mapRect(0, 0, 16, 16, shade_1);

// sprites.create(i);




const i = img`
    ............3333bb..bb33333.....
    ........3bb31111d3b311d111d33...
    .......3bdd11111dbd11d11111113..
    .......bdddd1111bd11d111dd11113.
    ......3d111dd111b11d111dd33d11d3
    ......3d11111dd1d11d111d11d33113
    ....bb3d111111dd13dd111d1dd3b31b
    ...b3d3dd111111dd13dd11d1dddbbdb
    ...3ddd31d111111dd133dddddddb.b.
    ..311111d1ddd1111dd11dddddd33...
    ..3111111d111dd111dd1111dd3313..
    ..bddd1111ddd11dd111d111111113..
    ..311ddd111dddd11dd11ddd1111ddb.
    ..31111dd111dddd11dd111dddddddb.
    ...bd1111d1113ddd11dd1111111d3b.
    ...4dd1111d1113ddd11ddd111d333b.
    ..4dbdddd11d11133ddddddddddddb..
    .4ddbddddd11d111d33ddddddddd3b..
    .4dddb11ddd11dd111d333dddd3bb...
    .4dd55b111d11dd11111d3333bbb....
    .445555b111d11dddd111111ddb.....
    .4455555bd1d311ddddddddddd3.....
    .45455555bb1d3111ddddddd113.....
    .4554555555b333d1111111113......
    455554555555bbb33d11111d33......
    4d555545555555dbbb3d11d33.......
    4dd5555455555ddddd43333.........
    45dd555544ddddddd4..............
    .45dd5555d44dddd4...............
    ..45dd55dddd4444................
    ...45dd55444....................
    ....44444.......................
`


// game.onShade(() => {
//     shadeImage(screen, 10, 10, i, shade_1)
// })




// const player = createShaderSprite(20, 20, 1);

const player = shader.createImageShaderSprite(img`
    ................................
    ................................
    ................................
    ................................
    .......................33333....
    ......33333............33333....
    ......33333............33333....
    ......33333............33333....
    ......33333............33333....
    ......33333.....................
    ................................
    ................................
    ................................
    ................................
    ......................33333.....
    ......................33333.....
    ......................33333.....
    .33333...............333333.....
    .333333............33333333.....
    .3333333...........33333333.....
    .333333333.......3333333333.....
    .33333333333333333333333333.....
    .3333333333333333333333333......
    ...333333333333333333333........
    ....33333333333333333333........
    ......333333333333333...........
    ............33333333............
    ................................
    ................................
    ................................
    ................................
    ................................
`, 1);


const other = shader.createImageShaderSprite(img`
    . . . . a a a a a a a . . . .
    . . a a a a a a a a a a a . .
    . a a a a a a a a a a a a a .
    . a a a a a a a a a a a a a .
    a a a a a a a a a a a a a a a
    a a a a a a a a a a a a a a a
    a a a a a a a a a a a a a a a
    a a a a a a a a a a a a a a a
    a a a a a a a a a a a a a a a
    a a a a a a a a a a a a a a a
    a a a a a a a a a a a a a a a
    . a a a a a a a a a a a a a .
    . a a a a a a a a a a a a a .
    . . a a a a a a a a a a a . .
    . . . . a a a a a a a . . . .
`, 1);

controller.moveSprite(player)
scene.cameraFollowSprite(player)
