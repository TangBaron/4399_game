import * as THREE from 'three';
import { CONFIG } from './config.js?v=7';

/**
 * 无限道路：由若干段路面组成，随玩家移动回收复用。
 * 使用合并的 BufferGeometry 降低 draw call。
 */
export class Road {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.segments = [];
    this.segmentLength = CONFIG.road.segmentLength;
    this.totalLength = this.segmentLength * CONFIG.road.segmentCount;
    this.halfLength = this.totalLength / 2;

    this._roadMat = new THREE.MeshStandardMaterial({
      color: 0x1b1d24,
      roughness: 0.92,
      metalness: 0.05,
    });
    // 路缘/人行道
    this._curbMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: 0.8, metalness: 0.1 });
    // 标线
    this._lineMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
    this._edgeMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });

    this._buildSegments();
  }

  _buildSegments() {
    const width = CONFIG.road.width;
    for (let i = 0; i < CONFIG.road.segmentCount; i++) {
      const seg = new THREE.Group();
      const z = -this.halfLength + i * this.segmentLength + this.segmentLength / 2;

      // 路面
      const roadGeo = new THREE.PlaneGeometry(width, this.segmentLength, 1, 1);
      const road = new THREE.Mesh(roadGeo, this._roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0;
      road.receiveShadow = true;
      seg.add(road);

      // 两侧路缘
      for (const side of [-1, 1]) {
        const curbGeo = new THREE.BoxGeometry(0.6, 0.25, this.segmentLength);
        const curb = new THREE.Mesh(curbGeo, this._curbMat);
        curb.position.set(side * (width / 2 + 0.3), 0.12, 0);
        curb.receiveShadow = true;
        seg.add(curb);
      }

      // 边缘白线
      for (const side of [-1, 1]) {
        const edgeGeo = new THREE.PlaneGeometry(0.18, this.segmentLength);
        const edge = new THREE.Mesh(edgeGeo, this._edgeMat);
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(side * (width / 2 - 0.5), 0.015, 0);
        seg.add(edge);
      }

      // 中央虚线（两段拼接，保证 segmentLength 为虚线周期整数倍）
      // 虚线模式：3m 实线 + 3m 空
      const dashLen = 3;
      const gapLen = 3;
      const period = dashLen + gapLen;
      const count = Math.floor(this.segmentLength / period);
      for (let k = 0; k < count; k++) {
        const dashGeo = new THREE.PlaneGeometry(0.2, dashLen);
        const dash = new THREE.Mesh(dashGeo, this._lineMat);
        dash.rotation.x = -Math.PI / 2;
        const localZ = -this.segmentLength / 2 + k * period + dashLen / 2;
        dash.position.set(0, 0.02, localZ);
        seg.add(dash);
      }

      seg.position.z = z;
      seg.userData.baseZ = z;
      this.group.add(seg);
      this.segments.push(seg);
    }
  }

  /**
   * 根据累计滚动距离滚动道路段，实现无限延伸。
   * 所有路段始终折叠在 [-halfLength, halfLength] 区间内，
   * 因此无论开多远道路都不会离开原点（配合固定的天球）。
   * @param {number} scrollDist 累计滚动距离（正值）
   */
  update(scrollDist) {
    for (const seg of this.segments) {
      // 世界向 +Z（摄像机/玩家身后）流动，从而产生车辆冲向屏幕深处（-Z）的感觉
      let z = seg.userData.baseZ + (scrollDist % this.totalLength);
      z = ((z + this.halfLength) % this.totalLength + this.totalLength) % this.totalLength - this.halfLength;
      seg.position.z = z;
    }
  }
}
