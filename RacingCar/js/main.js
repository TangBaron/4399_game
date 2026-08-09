import * as THREE from 'three';
import { CONFIG } from './config.js?v=7';
import { Input } from './input.js?v=7';
import { CityBackground } from './cityBackground.js?v=7';
import { Road } from './road.js?v=7';
import { createCar } from './car.js?v=7';
import { EnemyManager } from './enemyManager.js?v=7';

const STATE = {
  INPUT_CITY: 'input',
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
};

class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.state = STATE.INPUT_CITY;

    this.score = 0;
    this.elapsed = 0;
    this.scrollSpeed = CONFIG.road.scrollBaseSpeed;
    this.currentLane = 0;
    // 玩家始终固定在世界原点附近（z=0），道路与城市向 +Z 滚动，
    // 从而避免坐标无限增长导致驶出天球/离开道路。
    this.playerZ = 0;
    this.scrollDist = 0;
    this.cityName = '';

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();

    // 场景内容
    this.cityBackground = new CityBackground(this.scene);
    this.road = new Road(this.scene);
    this.player = createCar(0x2cc8ff, true);
    this.player.position.set(CONFIG.lanePositions[0], 0, this.playerZ);
    this.scene.add(this.player);

    this.enemyManager = new EnemyManager(this.scene);
    this.input = new Input();
    this.input.attach();

    this.clock = new THREE.Clock();

    this._bindUI();
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._loop = this._loop.bind(this);
    this.renderer.setAnimationLoop(this._loop);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x1a2440, 60, 380);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 2000);
    // 第三人称追尾视角
    this.cameraBase = new THREE.Vector3(0, 5.5, 10);
    this.cameraLookAt = new THREE.Vector3(0, 1.5, -10);
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(this.cameraLookAt);
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0x8aa0c8, 0.55);
    this.scene.add(ambient);

    // 黄昏主光
    const hemi = new THREE.HemisphereLight(0xffb88a, 0x2a3550, 0.7);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffd9b0, 1.1);
    dir.position.set(-30, 60, 20);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 200;
    dir.shadow.camera.left = -30;
    dir.shadow.camera.right = 30;
    dir.shadow.camera.top = 30;
    dir.shadow.camera.bottom = -30;
    this.scene.add(dir);

    // 玩家车灯（前照灯）
    const head = new THREE.SpotLight(0xfff4d0, 1.2, 40, Math.PI / 6, 0.5, 1.2);
    head.position.set(0, 1.2, -1.5);
    head.target.position.set(0, 0, -20);
    this.playerHeadLight = head;
    this.scene.add(head);
    this.scene.add(head.target);
  }

  _bindUI() {
    this.ui = {
      cityModal: document.getElementById('city-modal'),
      cityInput: document.getElementById('city-input'),
      cityConfirm: document.getElementById('city-confirm'),
      startModal: document.getElementById('start-modal'),
      startCity: document.getElementById('start-city'),
      startBtn: document.getElementById('start-btn'),
      gameoverModal: document.getElementById('gameover-modal'),
      finalScore: document.getElementById('final-score'),
      finalTime: document.getElementById('final-time'),
      restartBtn: document.getElementById('restart-btn'),
      hud: document.getElementById('hud'),
      score: document.getElementById('score'),
      speed: document.getElementById('speed'),
      cityLabel: document.getElementById('city-label'),
      loading: document.getElementById('loading'),
      loadingText: document.getElementById('loading-text'),
    };

    this.ui.cityConfirm.addEventListener('click', () => this._onCitySubmit());
    this.ui.cityInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._onCitySubmit();
    });
    this.ui.startBtn.addEventListener('click', () => this._startGame());
    this.ui.restartBtn.addEventListener('click', () => this._restartToInput());
  }

  // ---------- 状态流转 ----------
  async _onCitySubmit() {
    const name = (this.ui.cityInput.value || '').trim() || '北京';
    this.cityName = name;
    this.ui.cityModal.classList.add('hidden');

    // 立即生成程序化城市天际线（同步、零网络），马上进入准备状态；
    // 真实全景图会在后台静默加载，成功则自动替换。
    await this.cityBackground.loadPanorama(name);

    this.ui.cityLabel.textContent = name;
    this.ui.startCity.textContent = `即将进入：${name}`;
    this.ui.startModal.classList.remove('hidden');
    this.state = STATE.READY;
  }

  _startGame() {
    this.ui.startModal.classList.add('hidden');
    this.ui.hud.classList.remove('hidden');
    this.score = 0;
    this.elapsed = 0;
    this.scrollDist = 0;
    this.playerZ = 0;
    this.currentLane = 0;
    this.player.position.set(CONFIG.lanePositions[0], 0, 0);
    this.enemyManager.reset();
    this.scrollSpeed = CONFIG.road.scrollBaseSpeed;
    this.state = STATE.PLAYING;
  }

  _gameOver() {
    this.state = STATE.GAMEOVER;
    this.ui.finalScore.textContent = this.score;
    this.ui.finalTime.textContent = `${this.elapsed.toFixed(1)}s`;
    this.ui.gameoverModal.classList.remove('hidden');
  }

  _restartToInput() {
    this.ui.gameoverModal.classList.add('hidden');
    this.ui.hud.classList.add('hidden');
    this.ui.cityInput.value = '';
    this.ui.cityModal.classList.remove('hidden');
    this.state = STATE.INPUT_CITY;
  }

  // ---------- 主循环 ----------
  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === STATE.PLAYING) {
      this._updatePlaying(dt);
    } else if (this.state === STATE.READY) {
      // 准备状态下也保持道路轻微滚动，展示沉浸感
      this.scrollDist += CONFIG.road.scrollBaseSpeed * 0.25 * dt;
      this.road.update(this.scrollDist);
      this.cityBackground.update(dt, CONFIG.road.scrollBaseSpeed * 0.25, this.scrollDist);
      if (this.input.consumeAnyPress()) this._startGame();
    }

    // 摄像机动画（始终平滑跟随）
    this._updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updatePlaying(dt) {
    this.elapsed += dt;

    // 难度
    this.enemyManager.setDifficulty(this.elapsed);
    this.scrollSpeed = CONFIG.road.scrollBaseSpeed * this.enemyManager.speedMultiplier;

    // 累计滚动距离（玩家保持在原点，世界向身后移动）
    this.scrollDist += this.scrollSpeed * dt;
    this.playerZ = 0;

    // 车道切换（输入）
    if (this.input.left && this.currentLane > 0) {
      this.currentLane--;
      this.input.left = false; // 消费一次
    }
    if (this.input.right && this.currentLane < CONFIG.lanePositions.length - 1) {
      this.currentLane++;
      this.input.right = false;
    }

    // 平滑过渡
    const targetX = CONFIG.lanePositions[this.currentLane];
    this.player.position.x = THREE.MathUtils.damp(
      this.player.position.x,
      targetX,
      CONFIG.player.switchSpeed,
      dt
    );
    // 玩家固定在原点，不随时间漂移
    this.player.position.z = 0;

    // 车身轻微侧倾
    const tilt = THREE.MathUtils.clamp((targetX - this.player.position.x) * 0.15, -0.25, 0.25);
    this.player.rotation.z = THREE.MathUtils.damp(this.player.rotation.z, -tilt, 8, dt);
    // 上下浮动
    this.player.position.y = Math.sin(this.elapsed * 12) * 0.04;

    // 玩家车轮旋转（视觉反馈）
    this.player.children.forEach((child) => {
      if (child.userData && child.userData.isWheel) {
        child.rotation.x -= this.scrollSpeed * dt * 0.6;
      }
    });

    // 道路与城市滚动（基于累计距离，始终围绕原点）
    this.road.update(this.scrollDist);
    this.cityBackground.update(dt, this.scrollSpeed, this.scrollDist);

    // 敌人更新
    this.enemyManager.update(dt, this.scrollSpeed);
    this.score += this.enemyManager.scoredThisFrame;

    // 碰撞检测
    if (this._checkCollision()) {
      this._gameOver();
    }

    // HUD
    this.ui.score.textContent = this.score;
    this.ui.speed.textContent = Math.round(this.scrollSpeed * 3.6 * 1.2);
  }

  _checkCollision() {
    const p = this.player.position;
    const pb = this.player.userData.bounds;
    for (const e of this.enemyManager.getActiveCars()) {
      const eb = e.userData.bounds;
      const ex = e.position.x;
      const ez = e.position.z;
      // AABB
      if (
        Math.abs(p.x - ex) < pb.hw + eb.hw - 0.3 &&
        Math.abs(p.z - ez) < pb.hl + eb.hl - 0.3
      ) {
        return true;
      }
    }
    return false;
  }

  _updateCamera(dt) {
    // 玩家固定在原点，摄像机在其身后 (+Z) 朝前方 (-Z) 看
    const desired = new THREE.Vector3(
      this.player.position.x * 0.35,
      5.5,
      10
    );
    this.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    const look = new THREE.Vector3(
      this.player.position.x * 0.5,
      1.5,
      -10
    );
    this.camera.lookAt(look);

    // 车灯跟随（朝前方 -Z 照射）
    if (this.playerHeadLight) {
      this.playerHeadLight.position.set(this.player.position.x * 0.8, 1.2, -1.5);
      this.playerHeadLight.target.position.set(this.player.position.x * 0.8, 0, -20);
    }
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// 启动
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
