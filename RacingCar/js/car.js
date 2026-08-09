import * as THREE from 'three';

/**
 * 使用基础几何体组合一辆低多边形汽车。
 * 坐标系：车头朝向 -Z（游戏行驶方向）。
 * 车身尺寸约：宽 2.0，高 1.2，长 4.0。
 */
export function createCar(bodyColor = 0xff3344, isPlayer = false) {
  const car = new THREE.Group();

  // 车身主体
  const bodyGeo = new THREE.BoxGeometry(2.0, 0.7, 4.0);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.35,
    metalness: 0.55,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  body.receiveShadow = true;
  car.add(body);

  // 驾驶舱（稍窄）
  const cabinGeo = new THREE.BoxGeometry(1.7, 0.6, 2.0);
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d28,
    roughness: 0.15,
    metalness: 0.6,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 1.15, -0.1);
  cabin.castShadow = true;
  car.add(cabin);

  // 前后挡风玻璃（亮色高光）
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88c0ff,
    roughness: 0.05,
    metalness: 0.8,
    transparent: true,
    opacity: 0.75,
  });
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 0.08), glassMat);
  frontGlass.position.set(0, 1.2, -1.08);
  frontGlass.rotation.x = -0.25;
  car.add(frontGlass);

  // 前大灯
  const headMat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0xfff4c2 : 0xffd28a });
  for (const x of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    h.position.set(x, 0.6, -2.0);
    car.add(h);
  }

  // 尾灯
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-0.65, 0.65]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    t.position.set(x, 0.6, 2.0);
    car.add(t);
  }

  // 轮子
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.85, metalness: 0.1 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.4, metalness: 0.8 });
  const wheelPositions = [
    [-1.0, 0.42, -1.3],
    [1.0, 0.42, -1.3],
    [-1.0, 0.42, 1.3],
    [1.0, 0.42, 1.3],
  ];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    wheel.userData.isWheel = true;
    car.add(wheel);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.37, 8), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    car.add(rim);
  }

  // 玩家车顶尾翼
  if (isPlayer) {
    const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.7 });
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.5), spoilerMat);
    spoiler.position.set(0, 1.05, 1.85);
    car.add(spoiler);
    for (const x of [-0.75, 0.75]) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), spoilerMat);
      stand.position.set(x, 0.9, 1.85);
      car.add(stand);
    }
  }

  // 碰撞盒尺寸（半尺寸，用于 AABB 检测）
  car.userData.bounds = { hw: 1.0, hh: 0.75, hl: 1.95 };
  return car;
}
