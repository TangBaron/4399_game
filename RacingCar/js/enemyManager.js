import * as THREE from 'three';
import { CONFIG } from './config.js?v=7';
import { createCar } from './car.js?v=7';

/**
 * 敌方车辆管理：
 *  - 对象池
 *  - 生成时保证左右车道不同时出现（同一时刻只在一条车道生成新车）
 *  - 难度递增：生成间隔缩短、相对速度提升
 */
export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    this.lastSpawnLane = -1;
    this.spawnTimer = 0;
    this.currentInterval = CONFIG.enemies.initialSpawnInterval;
    this.speedMultiplier = 1;
    this.scoredThisFrame = 0;

    this._initPool();
  }

  _initPool() {
    for (let i = 0; i < CONFIG.enemies.poolSize; i++) {
      const color = CONFIG.enemyColors[i % CONFIG.enemyColors.length];
      const car = createCar(color, false);
      car.visible = false;
      this.scene.add(car);
      this.pool.push(car);
    }
  }

  reset() {
    for (const car of this.active) {
      car.visible = false;
      this.pool.push(car);
    }
    this.active.length = 0;
    this.lastSpawnLane = -1;
    this.spawnTimer = 0;
    this.currentInterval = CONFIG.enemies.initialSpawnInterval;
    this.speedMultiplier = 1;
    this.scoredThisFrame = 0;
  }

  /**
   * @param {number} elapsed 游戏已运行秒数
   */
  setDifficulty(elapsed) {
    const steps = Math.floor(elapsed / CONFIG.difficulty.rampUpEvery);
    this.speedMultiplier = Math.min(
      CONFIG.difficulty.maxSpeedMultiplier,
      Math.pow(CONFIG.difficulty.speedMultiplier, steps)
    );
    this.currentInterval = Math.max(
      CONFIG.enemies.minSpawnInterval,
      CONFIG.enemies.initialSpawnInterval * Math.pow(CONFIG.difficulty.intervalMultiplier, steps)
    );
  }

  update(dt, scrollSpeed) {
    this.scoredThisFrame = 0;
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.currentInterval) {
      this.spawnTimer = 0;
      this._spawn();
    }

    // 敌方是"同向行驶的慢车"：世界以 scrollSpeed 向 +Z 滚动，
    // 而敌车自身以 |relativeSpeed| 向 -Z 行驶（相对世界），
    // 因此敌车相对摄像机的靠近速度 = scrollSpeed - |relativeSpeed|，
    // 玩家会从后方追上它们。
    const catchUpSpeed =
      (scrollSpeed + CONFIG.enemies.relativeSpeed) * this.speedMultiplier;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const car = this.active[i];
      // 相对摄像机向 +Z 靠近
      car.position.z += catchUpSpeed * dt;

      // 车轮旋转（视觉反馈）
      car.children.forEach((child) => {
        if (child.userData && child.userData.isWheel) {
          child.rotation.x -= scrollSpeed * dt * 0.5;
        }
      });

      // 计分：敌车被玩家超过（落到玩家身后）
      if (!car.userData.scored && car.position.z > 2) {
        car.userData.scored = true;
        this.scoredThisFrame++;
      }

      // 回收：移出身后视野
      if (car.position.z > CONFIG.enemies.despawnZ) {
        car.visible = false;
        car.userData.scored = false;
        this.active.splice(i, 1);
        this.pool.push(car);
      }
    }
  }

  _spawn() {
    if (this.pool.length === 0) return;

    // 选择车道：与上次不同（左右交替/随机但不重复）
    let lane;
    if (this.lastSpawnLane === -1) {
      lane = Math.random() < 0.5 ? 0 : 1;
    } else {
      lane = this.lastSpawnLane === 0 ? 1 : 0;
    }
    this.lastSpawnLane = lane;

    // 世界原点即玩家位置，前方为 -Z
    const spawnZ = CONFIG.enemies.spawnZ + (Math.random() * 10 - 5);
    const x = CONFIG.lanePositions[lane];

    // 防止新生成车辆与同车道已存在车辆过近（保证避让空间，避免死局）
    for (const car of this.active) {
      if (Math.abs(car.position.x - x) < 0.5 && Math.abs(car.position.z - spawnZ) < 24) {
        return;
      }
    }

    const car = this.pool.pop();
    car.visible = true;
    car.position.set(x, 0, spawnZ);
    // 同向行驶：车头朝向 -Z（与玩家一致），不需要旋转
    car.rotation.set(0, 0, 0);
    car.userData.scored = false;
    car.userData.lane = lane;
    this.active.push(car);
  }

  getActiveCars() {
    return this.active;
  }
}
