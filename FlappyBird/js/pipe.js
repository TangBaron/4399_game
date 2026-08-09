/**
 * Pipe.js - 管道类
 * 一组管道由上下两根组成，中间留有间隙
 */
class Pipe {
    /**
     * @param {number} x - 管道 x 坐标
     * @param {number} canvasHeight - 画布高度
     * @param {number} groundHeight - 地面高度
     */
    constructor(x, canvasHeight, groundHeight) {
        this.x = x;
        this.width = 62;
        this.canvasHeight = canvasHeight;
        this.groundHeight = groundHeight;

        // 随机生成间隙位置
        this.gapHeight = 150;
        const minGapY = 60;
        const maxGapY = canvasHeight - groundHeight - this.gapHeight - 60;
        this.gapY = minGapY + Math.random() * (maxGapY - minGapY);

        this.scored = false; // 是否已被计分
    }

    /** 管道移动速度（全局统一） */
    static get SPEED() {
        return 2.5;
    }

    update() {
        this.x -= Pipe.SPEED;
    }

    /** 管道是否完全移出屏幕 */
    isOffScreen() {
        return this.x + this.width < 0;
    }

    /**
     * 绘制管道
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} offsetX
     */
    draw(ctx, offsetX = 0) {
        const x = offsetX + this.x;
        const pipeBodyColor = '#5cb83a';
        const pipeHighlight = '#7ed957';
        const pipeDark = '#3d8b27';
        const capHeight = 26;
        const capExtra = 4;

        // ===== 上管道 =====
        const topHeight = this.gapY;
        this._drawPipeSegment(ctx, x, 0, this.width, topHeight, pipeBodyColor, pipeHighlight, pipeDark);

        // 上管道管帽
        this._drawCap(ctx, x - capExtra, topHeight - capHeight, this.width + capExtra * 2, capHeight, pipeBodyColor, pipeHighlight, pipeDark, true);

        // ===== 下管道 =====
        const lowerY = this.gapY + this.gapHeight;
        const lowerHeight = this.canvasHeight - this.groundHeight - lowerY;
        this._drawPipeSegment(ctx, x, lowerY, this.width, lowerHeight, pipeBodyColor, pipeHighlight, pipeDark);

        // 下管道管帽
        this._drawCap(ctx, x - capExtra, lowerY, this.width + capExtra * 2, capHeight, pipeBodyColor, pipeHighlight, pipeDark, false);
    }

    /** 绘制管道主体 */
    _drawPipeSegment(ctx, x, y, w, h, color, highlight, dark) {
        if (h <= 0) return;
        // 主体
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        // 高光
        ctx.fillStyle = highlight;
        ctx.fillRect(x + 4, y, 6, h);
        // 暗边
        ctx.fillStyle = dark;
        ctx.fillRect(x + w - 8, y, 8, h);
        // 边框
        ctx.strokeStyle = '#2d6b1c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }

    /** 绘制管帽 */
    _drawCap(ctx, x, y, w, h, color, highlight, dark, isTop) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = highlight;
        ctx.fillRect(x + 4, y + 2, 6, h - 4);
        ctx.fillStyle = dark;
        ctx.fillRect(x + w - 8, y + 2, 6, h - 4);
        ctx.strokeStyle = '#2d6b1c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}
