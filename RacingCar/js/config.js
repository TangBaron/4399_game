// 全局游戏配置
export const CONFIG = {
  // 车道中心 X 坐标（同向双车道，玩家沿 -Z 方向行驶）
  laneWidth: 4.2,
  lanePositions: [-2.1, 2.1],

  // 玩家车辆
  player: {
    startZ: 0,
    switchSpeed: 10,        // 车道切换速度（越大越快）
  },

  // 道路
  road: {
    width: 12,
    segmentLength: 60,     // 每段道路长度
    segmentCount: 6,       // 道路段数量
    scrollBaseSpeed: 48,   // 基础行驶速度（单位/秒）
  },

  // 敌方车辆（同向行驶的慢车，从前方 -Z 生成，被玩家从后方追上后在 +Z 回收）
  enemies: {
    spawnZ: -220,          // 敌车生成位置（前方远处）
    despawnZ: 20,          // 被玩家超过后回收位置（身后）
    initialSpawnInterval: 1.35, // 初始生成间隔（秒）
    minSpawnInterval: 0.45,     // 最小生成间隔
    relativeSpeed: -14,    // 敌方相对世界的速度（负值=同向慢车，玩家更快从而追上）
    poolSize: 24,
  },

  // 难度递增
  difficulty: {
    rampUpEvery: 10,       // 每隔多少秒提升难度
    speedMultiplier: 1.12, // 每次速度倍率
    intervalMultiplier: 0.86, // 每次生成间隔倍率
    maxSpeedMultiplier: 3.2,
  },

  // 车辆颜色池（敌方）
  enemyColors: [0xe74c3c, 0xf39c12, 0x27ae60, 0x2980b9, 0x8e44ad, 0x1abc9c, 0xecf0f1, 0x34495e],
};
