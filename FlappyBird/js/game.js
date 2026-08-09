/**
 * Game.js - 游戏引擎
 * 负责游戏状态管理、管道生成、碰撞检测、分屏渲染与计分
 */
class Game {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {'single'|'dual'} mode
     * @param {Object} callbacks - 游戏事件回调 { onGameOver }
     */
    constructor(canvas, mode, callbacks = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mode = mode; // 'single' | 'dual'
        this.callbacks = callbacks;

        this.WIDTH = canvas.width;
        this.HEIGHT = canvas.height;
        this.GROUND_HEIGHT = 80;
        this.GROUND_Y = this.HEIGHT - this.GROUND_HEIGHT;

        // 游戏状态：ready(待开始) | playing(进行中) | over(已结束)
        this.state = 'ready';

        // 管道相关
        this.pipeInterval = 190; // 管道间隔（像素）
        this.pipes = [];

        // 背景云 & 地面偏移
        this.clouds = this._initClouds();
        this.groundOffset = 0;

        // 玩家
        if (mode === 'single') {
            this.players = [
                {
                    bird: new Bird(120, this.HEIGHT / 2, '#f7d54a'),
                    score: 0,
                    alive: true,
                    label: '玩家',
                    key: 'single'
                }
            ];
            this.viewWidth = this.WIDTH;
        } else {
            this.players = [
                {
                    bird: new Bird(120, this.HEIGHT / 2, '#f7d54a'),
                    score: 0,
                    alive: true,
                    label: 'P1 (W)',
                    key: 'p1'
                },
                {
                    bird: new Bird(120, this.HEIGHT / 2, '#4ab0f7'),
                    score: 0,
                    alive: true,
                    label: 'P2 (↑)',
                    key: 'p2'
                }
            ];
            this.viewWidth = this.WIDTH / 2;
        }

        this.animationId = null;
        this._loop = this._loop.bind(this);
    }

    /** 初始化云朵 */
    _initClouds() {
        const clouds = [];
        for (let i = 0; i < 6; i++) {
            clouds.push({
                x: Math.random() * this.WIDTH,
                y: 40 + Math.random() * 180,
                scale: 0.6 + Math.random() * 0.6,
                speed: 0.2 + Math.random() * 0.3
            });
        }
        return clouds;
    }

    /** 开始游戏循环 */
    start() {
        this.state = 'ready';
        this._reset();
        if (!this.animationId) {
            this.animationId = requestAnimationFrame(this._loop);
        }
    }

    /** 重置游戏 */
    _reset() {
        this.pipes = [];
        this.players.forEach(p => {
            p.bird = new Bird(120, this.HEIGHT / 2, p.bird.color);
            p.score = 0;
            p.alive = true;
        });
        this._spawnInitialPipes();
    }

    /** 生成初始管道（从屏幕外排队进入） */
    _spawnInitialPipes() {
        const startX = this.WIDTH + 100;
        for (let i = 0; i < 4; i++) {
            this.pipes.push(new Pipe(startX + i * this.pipeInterval, this.HEIGHT, this.GROUND_HEIGHT));
        }
    }

    /** 玩家操作（上升） */
    flap(playerKey) {
        if (this.state === 'ready') {
            this.state = 'playing';
            // 隐藏待开始提示
            const tip = document.getElementById('ready-tip');
            if (tip) tip.classList.add('hidden');
        }
        const player = this.players.find(p => p.key === playerKey);
        if (player && player.alive && this.state !== 'over') {
            player.bird.flap();
        }
    }

    /** 主循环 */
    _loop() {
        this._update();
        this._draw();
        this.animationId = requestAnimationFrame(this._loop);
    }

    _update() {
        // 云朵移动
        this.clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x < -60) c.x = this.WIDTH + 60;
        });

        if (this.state === 'playing') {
            // 地面滚动
            this.groundOffset = (this.groundOffset + Pipe.SPEED) % 24;

            // 管道移动
            this.pipes.forEach(pipe => pipe.update());

            // 移除屏幕外管道并补充新管道
            if (this.pipes.length && this.pipes[0].isOffScreen()) {
                this.pipes.shift();
                const lastX = this.pipes[this.pipes.length - 1].x;
                this.pipes.push(new Pipe(lastX + this.pipeInterval, this.HEIGHT, this.GROUND_HEIGHT));
            }

            // 更新每个玩家
            this.players.forEach(player => {
                if (!player.alive) {
                    // 死亡后鸟继续下落动画
                    player.bird.update();
                    if (player.bird.y > this.GROUND_Y) {
                        player.bird.y = this.GROUND_Y - player.bird.radius;
                    }
                    return;
                }

                player.bird.update();

                // 边界碰撞
                if (player.bird.hitBoundary(this.GROUND_Y)) {
                    if (player.bird.y - player.bird.radius < 0) {
                        player.bird.y = player.bird.radius;
                        player.bird.velocity = 0;
                    }
                    this._killPlayer(player);
                    return;
                }

                // 管道碰撞 & 计分（每个玩家独立计分，使用 player.key 作为标记）
                for (const pipe of this.pipes) {
                    if (player.bird.hitPipe(pipe)) {
                        this._killPlayer(player);
                        break;
                    }
                    if (!pipe['scored_' + player.key] && pipe.x + pipe.width < player.bird.x) {
                        pipe['scored_' + player.key] = true;
                        player.score++;
                    }
                }
            });

            // 检查游戏是否结束
            this._checkGameOver();
        } else if (this.state === 'ready') {
            // 待开始时小鸟轻微浮动
            this.players.forEach(p => {
                p.bird.wingPhase += 0.2;
            });
        }
    }

    /** 玩家死亡 */
    _killPlayer(player) {
        player.alive = false;
        player.bird.alive = false;
    }

    /** 检查游戏是否结束 */
    _checkGameOver() {
        if (this.mode === 'single') {
            if (!this.players[0].alive) {
                this.state = 'over';
                this._onGameOver();
            }
        } else {
            // 双人模式：双方都死亡才结束
            if (this.players.every(p => !p.alive)) {
                this.state = 'over';
                this._onGameOver();
            }
        }
    }

    _onGameOver() {
        if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver(this.players.map(p => ({
                label: p.label,
                score: p.score
            })));
        }
    }

    /** 停止循环 */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /** 重新开始 */
    restart() {
        this.state = 'ready';
        this._reset();
        const tip = document.getElementById('ready-tip');
        if (tip) tip.classList.remove('hidden');
        this._updateReadyText();
    }

    _updateReadyText() {
        const el = document.getElementById('ready-text');
        if (!el) return;
        if (this.mode === 'single') {
            el.textContent = '按 ↑ 或 空格 开始';
        } else {
            el.textContent = 'P1 按 W · P2 按 ↑ 开始';
        }
    }

    // ====== 渲染 ======
    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

        if (this.mode === 'single') {
            this._drawScene(0, this.WIDTH, this.players[0], false);
        } else {
            // 左半屏 P1
            this._drawScene(0, this.viewWidth, this.players[0], true);
            // 中间分割线
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.viewWidth - 2, 0, 4, this.HEIGHT);
            // 右半屏 P2
            this._drawScene(this.viewWidth, this.viewWidth, this.players[1], true);
        }
    }

    /**
     * 绘制单个场景（含背景、管道、地面、小鸟、分数）
     * @param {number} offsetX - 该场景在画布上的 x 偏移
     * @param {number} width - 场景宽度
     * @param {Object} player - 玩家对象
     * @param {boolean} showLabel - 是否显示玩家标签（双人模式）
     */
    _drawScene(offsetX, width, player, showLabel) {
        const ctx = this.ctx;

        // 天空背景渐变
        const gradient = ctx.createLinearGradient(0, 0, 0, this.HEIGHT);
        gradient.addColorStop(0, '#4ec0ca');
        gradient.addColorStop(1, '#a8e6cf');
        ctx.fillStyle = gradient;
        ctx.fillRect(offsetX, 0, width, this.HEIGHT);

        // 云朵
        this._drawClouds(ctx, offsetX, width);

        // 远景山丘
        this._drawHills(ctx, offsetX, width);

        // 管道
        this.pipes.forEach(pipe => {
            // 仅绘制在该视图范围内的管道
            if (pipe.x + pipe.width > 0 && pipe.x < width) {
                pipe.draw(ctx, offsetX);
            }
        });

        // 地面
        this._drawGround(ctx, offsetX, width);

        // 小鸟
        player.bird.draw(ctx, offsetX);

        // 分数
        this._drawScore(ctx, offsetX, width, player, showLabel);
    }

    _drawClouds(ctx, offsetX, width) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        this.clouds.forEach(c => {
            // 为了左右两屏云一致，使用相同的 x 模运算
            const cx = ((c.x % (this.WIDTH + 120)) + (this.WIDTH + 120)) % (this.WIDTH + 120);
            // 双屏模式下，右半屏的云需要减去 viewWidth
            let drawX;
            if (offsetX === 0) {
                drawX = cx;
            } else {
                drawX = cx - this.viewWidth;
            }
            if (drawX < -50 || drawX > width + 50) return;
            const s = c.scale;
            ctx.beginPath();
            ctx.arc(drawX, c.y, 18 * s, 0, Math.PI * 2);
            ctx.arc(drawX + 20 * s, c.y - 5 * s, 22 * s, 0, Math.PI * 2);
            ctx.arc(drawX + 42 * s, c.y, 18 * s, 0, Math.PI * 2);
            ctx.arc(drawX + 20 * s, c.y + 8 * s, 16 * s, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    _drawHills(ctx, offsetX, width) {
        ctx.fillStyle = '#8fbc8f';
        ctx.beginPath();
        ctx.moveTo(offsetX, this.GROUND_Y);
        const hillSpacing = 120;
        for (let x = 0; x <= width; x += hillSpacing) {
            ctx.quadraticCurveTo(
                offsetX + x + hillSpacing / 2,
                this.GROUND_Y - 50,
                offsetX + x + hillSpacing,
                this.GROUND_Y
            );
        }
        ctx.lineTo(offsetX + width, this.GROUND_Y);
        ctx.closePath();
        ctx.fill();
    }

    _drawGround(ctx, offsetX, width) {
        // 地面主体
        ctx.fillStyle = '#ded895';
        ctx.fillRect(offsetX, this.GROUND_Y, width, this.GROUND_HEIGHT);

        // 地面顶部草皮
        ctx.fillStyle = '#7ed957';
        ctx.fillRect(offsetX, this.GROUND_Y, width, 14);
        ctx.fillStyle = '#5cb83a';
        ctx.fillRect(offsetX, this.GROUND_Y + 12, width, 4);

        // 地面纹理（斜线条纹，随移动偏移）
        ctx.fillStyle = '#c4b97a';
        const stripeW = 24;
        for (let x = -this.groundOffset; x < width; x += stripeW) {
            ctx.beginPath();
            ctx.moveTo(offsetX + x, this.GROUND_Y + 16);
            ctx.lineTo(offsetX + x + 12, this.GROUND_Y + 16);
            ctx.lineTo(offsetX + x + 2, this.HEIGHT);
            ctx.lineTo(offsetX + x - 10, this.HEIGHT);
            ctx.closePath();
            ctx.fill();
        }
    }

    _drawScore(ctx, offsetX, width, player, showLabel) {
        ctx.save();
        // 分数显示在各视图右上角
        const scoreX = offsetX + width - 20;
        const scoreY = 40;

        if (showLabel) {
            ctx.font = 'bold 16px "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.textAlign = 'right';
            ctx.fillText(player.label, scoreX + 2, 26);
            ctx.fillStyle = player.bird.color === '#f7d54a' ? '#fff3c4' : '#c4e4ff';
            ctx.fillText(player.label, scoreX, 24);
        }

        // 分数（带描边）
        ctx.font = 'bold 42px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        ctx.strokeText(player.score, scoreX + 2, scoreY + 2);
        ctx.fillText(player.score, scoreX, scoreY);

        // 死亡提示
        if (!player.alive && this.mode === 'dual') {
            ctx.font = 'bold 20px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff4444';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText('OUT', offsetX + width / 2, this.HEIGHT / 2 - 60);
            ctx.fillText('OUT', offsetX + width / 2, this.HEIGHT / 2 - 60);
        }

        ctx.restore();
    }
}
