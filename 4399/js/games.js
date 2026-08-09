// 游戏数据：新增游戏只需往这个数组里加一项
// cover 为封面图，使用 text-to-image 接口生成
const GAMES = [
  {
    id: 'flappybird',
    name: 'Flappy Bird',
    category: ['敏捷', '休闲', '双人'],
    hot: 9821,
    desc: '经典像素小鸟复刻版！点击或按空格让小鸟扇动翅膀，穿越层层水管。支持双人对战模式，和朋友比一比谁飞得更远。',
    howto: '单人：空格 / 鼠标点击 控制小鸟飞起；双人对战：W 键控制上方小鸟。躲避水管，尽可能飞得更远。',
    url: '/FlappyBird/index.html',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20flappy%20bird%20game%20pixel%20art%20yellow%20bird%20flying%20through%20green%20pipes%20sky%20background%20colorful%20cartoon&image_size=square',
    banner: true,
  },
  {
    id: 'racingcar',
    name: '城市狂飙 3D',
    category: ['赛车', '动作'],
    hot: 12680,
    desc: '沉浸式 3D 城市赛车躲避游戏！驾驶赛车在城市公路上穿梭，躲避前方车辆，速度会越来越快，看你能坚持多久。支持输入城市名加载全景。',
    howto: '使用 ← / → 方向键（或 A / D）切换车道，躲避前方慢车。每躲过一辆车 +1 分，每隔 10 秒速度提升。',
    url: '/RacingCar/index.html',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=3d%20racing%20car%20game%20sports%20car%20driving%20fast%20on%20city%20highway%20at%20sunset%20neon%20lights%20dynamic%20cinematic&image_size=square',
    banner: true,
  },
];
