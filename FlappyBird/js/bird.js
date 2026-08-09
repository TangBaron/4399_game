/**
 * Bird.js - 小鸟类
 * 负责小鸟的物理运动、绘制和旋转动画
 */
class Bird {
    /**
     * @param {number} x - 小鸟中心 x 坐标
     * @param {number} y - 小鸟中心 y 坐标
     * @param {string} color - 小鸟主体颜色（双人模式用于区分玩家）
     */
    constructor(x, y, color = '#f7d54a') {
        this.x = x;
        this.y = y;
        this.radius = 16;          // 小鸟碰撞半径
        this.width = 34;
        this.height = 26;
        this.color = color;

        // 物理参数
        this.velocity = 0;
        this.gravity = 0.45;
        this.jumpForce = -7.5;
        this.maxFallSpeed = 10;
        this.rotation = 0;

        // 翅膀拍动动画
        this.wingPhase = 0;
        this.alive = true;
    }

    /** 让小鸟向上飞升 */
    flap() {
        if (!this.alive) return;
        this.velocity = this.jumpForce;
    }

    /** 每帧更新物理状态 */
    update() {
        if (!this.alive) {
            // 死亡后继续下落
            this.velocity += this.gravity;
            this.y += this.velocity;
            this.rotation = Math.PI / 2;
            return;
        }

        this.velocity += this.gravity;
        if (this.velocity > this.maxFallSpeed) this.velocity = this.maxFallSpeed;
        this.y += this.velocity;

        // 根据速度计算旋转角度：上升时抬头，下降时低头
        if (this.velocity < 0) {
            this.rotation = -0.4;
        } else {
            this.rotation = Math.min(Math.PI / 2, this.rotation * 0.9 + (this.velocity / this.maxFallSpeed) * 0.15);
        }

        // 翅膀拍动
        this.wingPhase += 0.3;
    }

    /**
     * 绘制小鸟
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} offsetX - 绘制偏移量（双人模式分屏）
     */
    draw(ctx, offsetX = 0) {
        ctx.save();
        ctx.translate(offsetX + this.x, this.y);
        ctx.rotate(this.rotation);

        const w = this.width;
        const h = this.height;

        // 身体
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 腹部（浅色）
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.ellipse(2, 4, w / 2 - 6, h / 2 - 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 翅膀（拍动）
        const wingY = Math.sin(this.wingPhase) * 4;
        ctx.fillStyle = '#e8a92b';
        ctx.beginPath();
        ctx.ellipse(-4, wingY, 9, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 眼睛（眼白）
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 瞳孔
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(10, -5, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // 喙
        ctx.fillStyle = '#ff8c1a';
        ctx.beginPath();
        ctx.moveTo(14, -1);
        ctx.lineTo(22, 1);
        ctx.lineTo(14, 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#cc6600';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    /**
     * 碰撞盒检测（使用圆形近似）
     * @param {Pipe} pipe
     * @param {number} groundY
     */
    hitPipe(pipe) {
        // 小鸟矩形碰撞盒
        const bx = this.x - this.width / 2 + 4;
        const by = this.y - this.height / 2 + 4;
        const bw = this.width - 8;
        const bh = this.height - 8;

        // 上管道
        if (bx < pipe.x + pipe.width && bx + bw > pipe.x &&
            by < pipe.gapY && by + bh > 0) {
            return true;
        }
        // 下管道
        const lowerY = pipe.gapY + pipe.gapHeight;
        if (bx < pipe.x + pipe.width && bx + bw > pipe.x &&
            by + bh > lowerY) {
            return true;
        }
        return false;
    }

    /**
     * 是否撞到地面或天花板
     * @param {number} groundY
     */
    hitBoundary(groundY) {
        if (this.y - this.radius < 0) return true;
        if (this.y + this.radius >= groundY) return true;
        return false;
    }
}
