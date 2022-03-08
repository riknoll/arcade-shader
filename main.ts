namespace SpriteKind {
    export const Shader = SpriteKind.create();
}

//% color="#9e6eb8" icon="\uf0eb"
namespace shader {
    const shade_1 = hex`0F0D0A0B0E0408060C060B0C0F0B0C0F`
    const shade_2 = hex`0F0B0F0C0C0E0C080F080C0F0F0C0F0F`
    const shade_3 = hex`0F0C0F0F0F0C0F0C0F0C0F0F0F0F0F0F`
    const shade_4 = hex`00000000000000000000000000000000`
    let screenRowsBuffer: Buffer;
    let maskRowsBuffer: Buffer;

    export enum ShadeLevel {
        //% block="one"
        One = 1,
        //% block="two"
        Two = 2,
        //% block="three"
        Three = 3,
        //% block="four"
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
            screenRowsBuffer = control.createBuffer(target.height);
        }
        if (!maskRowsBuffer || maskRowsBuffer.length < target.height) {
            maskRowsBuffer = control.createBuffer(mask.height);
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
    //% block="create rectangular shader with width $width height $height shade $shadeLevel"
    //% shadeLevel.shadow=shader_shadelevel
    //% width.defl=16
    //% height.defl=16
    //% weight=90
    export function createRectangularShaderSprite(width: number, height: number, shadeLevel: number): Sprite {
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
        sprite.setKind(SpriteKind.Shader);
        scene.physicsEngine.addSprite(sprite);

        return sprite
    }

    //% blockId=shader_createImageShaderSprite
    //% block="create image shader with $image shade $shadeLevel"
    //% image.shadow=screen_image_picker
    //% shadeLevel.shadow=shader_shadelevel
    //% weight=100
    export function createImageShaderSprite(image: Image, shadeLevel: number): Sprite {
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
        sprite.setKind(SpriteKind.Shader);
        scene.physicsEngine.addSprite(sprite);
        sprite.shadeRectangle = false;

        return sprite
    }

    //% blockId=shader_shadelevel
    //% block="$level"
    //% shim=TD_ID
    //% weight=80
    export function _shadeLevel(level: ShadeLevel): number {
        return level;
    }
}