/**
 * Main.js - 入口文件
 * 负责主菜单切换、键盘绑定、游戏结束结算
 */
(function () {
    const menu = document.getElementById('menu');
    const gameScreen = document.getElementById('game-screen');
    const canvas = document.getElementById('game-canvas');
    const btnSingle = document.getElementById('btn-single');
    const btnDual = document.getElementById('btn-dual');
    const btnBack = document.getElementById('btn-back');
    const btnRestart = document.getElementById('btn-restart');
    const btnMenu = document.getElementById('btn-menu');
    const gameOverEl = document.getElementById('game-over');
    const overTitle = document.getElementById('over-title');
    const overScores = document.getElementById('over-scores');
    const overWinner = document.getElementById('over-winner');
    const readyTip = document.getElementById('ready-tip');

    let game = null;

    /** 显示主菜单 */
    function showMenu() {
        if (game) {
            game.stop();
            game = null;
        }
        gameScreen.classList.remove('active');
        menu.classList.add('active');
        gameOverEl.classList.add('hidden');
        readyTip.classList.add('hidden');
    }

    /** 启动指定模式 */
    function startGame(mode) {
        menu.classList.remove('active');
        gameScreen.classList.add('active');
        gameOverEl.classList.add('hidden');
        readyTip.classList.remove('hidden');

        // 双人模式将画布扩大，单人模式使用标准尺寸
        if (mode === 'dual') {
            canvas.width = 800;
            canvas.height = 600;
        } else {
            canvas.width = 500;
            canvas.height = 600;
        }

        game = new Game(canvas, mode, {
            onGameOver: handleGameOver
        });
        game.start();
        game._updateReadyText();
    }

    /** 游戏结束处理 */
    function handleGameOver(results) {
        overScores.innerHTML = '';
        results.forEach(r => {
            const p = document.createElement('p');
            p.textContent = `${r.label}：${r.score} 分`;
            overScores.appendChild(p);
        });

        if (results.length === 2) {
            overTitle.textContent = '游戏结束';
            const [p1, p2] = results;
            if (p1.score > p2.score) {
                overWinner.textContent = `🎉 ${p1.label} 获胜！`;
            } else if (p2.score > p1.score) {
                overWinner.textContent = `🎉 ${p2.label} 获胜！`;
            } else {
                overWinner.textContent = '平局！';
            }
        } else {
            overTitle.textContent = '游戏结束';
            overWinner.textContent = `本局得分：${results[0].score}`;
        }

        // 延迟显示遮罩，让死亡动画播放一会
        setTimeout(() => {
            gameOverEl.classList.remove('hidden');
        }, 500);
    }

    // ===== 按钮事件 =====
    btnSingle.addEventListener('click', () => startGame('single'));
    btnDual.addEventListener('click', () => startGame('dual'));
    btnBack.addEventListener('click', showMenu);
    btnMenu.addEventListener('click', showMenu);
    btnRestart.addEventListener('click', () => {
        gameOverEl.classList.add('hidden');
        if (game) game.restart();
    });

    // ===== 键盘事件 =====
    document.addEventListener('keydown', (e) => {
        // 菜单下按任意模式键开始（可选增强）
        if (!game) return;

        const key = e.key.toLowerCase();

        // 防止空格/方向键滚动页面
        if ([' ', 'arrowup', 'arrowdown', 'w'].includes(key)) {
            e.preventDefault();
        }

        if (game.mode === 'single') {
            if (key === ' ' || key === 'arrowup' || key === 'w') {
                game.flap('single');
            }
        } else {
            // 双人模式：W 控制 P1，↑ 控制 P2
            if (key === 'w') {
                game.flap('p1');
            } else if (key === 'arrowup') {
                game.flap('p2');
            }
        }
    });
})();
