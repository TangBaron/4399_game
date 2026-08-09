import * as THREE from 'three';
import { CONFIG } from './config.js?v=7';

/**
 * 城市背景：
 *  - 天穹（天空渐变色）
 *  - 程序化生成的城市建筑（两侧，随道路滚动并循环）
 *  - 路灯
 *  - 可选：从网络加载等距柱状投影全景图作为天空球
 */
export class CityBackground {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.buildings = [];
    this.streetLights = [];
    this.cityLength = CONFIG.road.segmentLength * CONFIG.road.segmentCount;

    this._createSkyDome();
    this._createGround();
    this._createCity();
    this._createStreetLights();
    this._createStars();
  }

  // ---------- 天空 ----------
  _createSkyDome() {
    const geo = new THREE.SphereGeometry(900, 32, 24);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1a3a) },
        midColor: { value: new THREE.Color(0x2b4c8a) },
        bottomColor: { value: new THREE.Color(0xff9a6b) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col;
          if (h > 0.0) {
            col = mix(midColor, topColor, smoothstep(0.0, 0.7, h));
          } else {
            col = mix(midColor, bottomColor, smoothstep(0.0, -0.35, h));
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.group.add(this.sky);

    // 太阳/月亮圆盘
    const sunGeo = new THREE.CircleGeometry(40, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.9, fog: false });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(-300, 180, -600);
    this.group.add(this.sun);
  }

  _createStars() {
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // 上半球
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 50;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.8, fog: false });
    this.stars = new THREE.Points(geo, mat);
    this.group.add(this.stars);
  }

  // ---------- 地面 / 草地 ----------
  _createGround() {
    const geo = new THREE.PlaneGeometry(2000, 2000);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  // ---------- 程序化城市建筑 ----------
  _createCity() {
    // 建筑风格调色板（黄昏城市）
    const palette = [0x1f2a44, 0x2a3656, 0x3d2f56, 0x264653, 0x4a3a5c, 0x1d3557, 0x3a2e4f];
    const windowColors = [0xffe08a, 0xffb86b, 0x9ed0ff, 0xffffff];

    const buildingCount = 56;
    const halfLength = this.cityLength / 2;

    for (let i = 0; i < buildingCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -halfLength + Math.random() * this.cityLength;
      // 建筑离道路更远，避免遮挡全景天空
      const x = side * (18 + Math.random() * 50);
      const w = 5 + Math.random() * 9;
      const d = 5 + Math.random() * 9;
      const h = 12 + Math.random() * 75;

      const baseColor = palette[Math.floor(Math.random() * palette.length)];
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85,
        metalness: 0.15,
        emissive: new THREE.Color(baseColor).multiplyScalar(0.08),
      });
      const b = new THREE.Mesh(geo, mat);
      b.position.set(x, h / 2, z);
      b.castShadow = true;
      b.receiveShadow = true;
      b.userData = { baseX: x, baseZ: z, w, d, h };
      this.group.add(b);
      this.buildings.push(b);

      // 窗户外发光层（在朝阳面贴一张 canvas 纹理）
      const winTex = this._makeWindowTexture(w, h, windowColors);
      const winMat = new THREE.MeshBasicMaterial({
        map: winTex,
        transparent: true,
        opacity: 0.9,
        fog: true,
      });
      const winGeo = new THREE.PlaneGeometry(w * 0.92, h * 0.92);
      const windows = new THREE.Mesh(winGeo, winMat);
      // 面朝道路
      windows.position.set(x + (side < 0 ? w / 2 + 0.06 : -w / 2 - 0.06), h / 2, z);
      windows.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      this.group.add(windows);
      b.userData.windows = windows;
    }
  }

  _makeWindowTexture(w, h, palette) {
    const canvas = document.createElement('canvas');
    const cw = 128;
    const ch = 256;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, cw, ch);

    const cols = Math.max(3, Math.floor(w / 1.8));
    const rows = Math.max(6, Math.floor(h / 2.2));
    const cellW = cw / cols;
    const cellH = ch / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.45) {
          ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
          ctx.globalAlpha = 0.5 + Math.random() * 0.5;
          const pad = 1.5;
          ctx.fillRect(c * cellW + pad, r * cellH + pad, cellW - pad * 2, cellH - pad * 2);
        }
      }
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ---------- 路灯 ----------
  _createStreetLights() {
    const spacing = 20;
    const halfLength = this.cityLength / 2;
    const positions = [];
    for (let z = -halfLength; z < halfLength; z += spacing) {
      positions.push(z);
    }
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.6, metalness: 0.7 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8 });
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6, 6);
    const armGeo = new THREE.BoxGeometry(1.6, 0.15, 0.15);
    const bulbGeo = new THREE.SphereGeometry(0.28, 8, 8);

    for (const z of positions) {
      for (const side of [-1, 1]) {
        const lightGroup = new THREE.Group();
        const x = side * (CONFIG.road.width / 2 + 0.8);

        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 3;
        lightGroup.add(pole);

        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(-side * 0.8, 5.9, 0);
        lightGroup.add(arm);

        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(-side * 1.5, 5.85, 0);
        lightGroup.add(bulb);

        // 点光源（仅给少量灯加光，避免性能问题）
        if (Math.random() < 0.3) {
          const pl = new THREE.PointLight(0xffd28a, 0.6, 18, 2);
          pl.position.copy(bulb.position);
          lightGroup.add(pl);
        }

        lightGroup.position.set(x, 0, z);
        lightGroup.userData.baseZ = z;
        this.group.add(lightGroup);
        this.streetLights.push(lightGroup);
      }
    }
  }

  // ---------- 每帧更新：让城市随道路一同向前滚动 ----------
  update(delta, scrollSpeed, scrollDist) {
    // 所有城市元素折叠在 [-halfLength, halfLength]，始终围绕原点
    const halfLength = this.cityLength / 2;
    // 世界向 +Z（身后）流动，产生车冲进屏幕深处的感觉
    const offset = scrollDist % this.cityLength;

    for (const b of this.buildings) {
      const ud = b.userData;
      let z = ud.baseZ + offset;
      z = ((z + halfLength) % this.cityLength + this.cityLength) % this.cityLength - halfLength;
      b.position.z = z;
      if (ud.windows) ud.windows.position.z = z;
    }
    for (const l of this.streetLights) {
      let z = l.userData.baseZ + offset;
      z = ((z + halfLength) % this.cityLength + this.cityLength) % this.cityLength - halfLength;
      l.position.z = z;
    }

    // 星空缓慢旋转
    if (this.stars) this.stars.rotation.y += delta * 0.005;
  }

  // ---------- 加载城市全景图作为天空球 ----------
  // 优先加载 panoramas/ 文件夹下的本地全景图（零网络、无跨域问题）；
  // 找不到则程序化生成该城市的天际线兜底。
  async loadPanorama(cityName) {
    const fileNames = this._localPanoramaCandidates(cityName);
    for (const file of fileNames) {
      const url = `panoramas/${file}`;
      try {
        const texture = await this._loadTextureWithTimeout(url, 3000);
        this._applyPanoramaTexture(texture);
        console.log('[Panorama] 本地全景加载成功:', url);
        return true;
      } catch (e) {
        console.log('[Panorama] 本地全景不存在，尝试下一个:', url);
      }
    }
    // 没有本地图，使用程序化生成（以城市名为种子）
    this._applyProceduralPanorama(cityName);
    console.log('[Panorama] 使用程序化城市天际线:', cityName);
    return true;
  }

  // 给定城市名，返回 panoramas/ 目录下可能的文件名（按优先级）
  _localPanoramaCandidates(cityName) {
    const en = this._toEnglishCityName(cityName);
    const norm = (s) =>
      s
        .toLowerCase()
        .replace(/[\s\-_]+/g, '')
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
    const names = new Set();
    // 英文名（如 newyork.jpg）
    if (/^[a-z0-9]+$/i.test(en)) names.add(norm(en) + '.jpg');
    // 用户原始输入（如 北京.jpg）
    names.add(norm(cityName) + '.jpg');
    return Array.from(names);
  }

  _applyPanoramaTexture(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.sky.material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.scene.environment = texture;
    if (this.stars) this.stars.visible = false;
    if (this.sun) this.sun.visible = false;
  }

  // 带超时的纹理加载
  _loadTextureWithTimeout(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('timeout'));
        }
      }, timeoutMs);

      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        url,
        (texture) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(texture);
          }
        },
        undefined,
        (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        }
      );
    });
  }

  // 用 Canvas 程序化生成一张 2:1 等距柱状投影城市天际线，并贴到天空球
  _applyProceduralPanorama(cityName) {
    const W = 2048;
    const H = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 以城市名作为随机种子，保证同一城市天际线一致
    const rand = this._seededRandom(this._hashString(cityName || 'city'));

    // 天空渐变（黄昏/夜幕）
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a1230');
    sky.addColorStop(0.45, '#1d3a6e');
    sky.addColorStop(0.7, '#5b3a6a');
    sky.addColorStop(0.85, '#d1704a');
    sky.addColorStop(1, '#2a1c2e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 星星（上半部分）
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 260; i++) {
      const x = rand() * W;
      const y = rand() * H * 0.5;
      const r = rand() * 1.4 + 0.3;
      ctx.globalAlpha = 0.3 + rand() * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 月亮/落日
    const moonX = W * 0.72;
    const moonY = H * 0.58;
    const glow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 140);
    glow.addColorStop(0, 'rgba(255,225,170,0.95)');
    glow.addColorStop(0.3, 'rgba(255,170,110,0.45)');
    glow.addColorStop(1, 'rgba(255,170,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - 160, moonY - 160, 320, 320);
    ctx.fillStyle = '#ffe9b8';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 34, 0, Math.PI * 2);
    ctx.fill();

    // 地平线位置（等距柱状投影里，天际线放在画面偏下，绕球一周形成闭环）
    const horizonY = H * 0.74;

    // 画一层城市剪影（建筑数组沿 X 平铺以保证左右无缝循环）
    const drawBuildings = (opts) => {
      const { baseY, minH, maxH, minW, maxW, color, windowChance, windowAlpha } = opts;
      let x = 0;
      while (x < W) {
        const bw = minW + rand() * (maxW - minW);
        const bh = minH + rand() * (maxH - minH);
        const by = baseY;
        ctx.fillStyle = color;
        ctx.fillRect(x, by - bh, bw, bh);

        // 顶部装饰（天线/屋顶）
        if (rand() < 0.25) {
          ctx.fillRect(x + bw / 2 - 1, by - bh - 10 - rand() * 20, 2, 10 + rand() * 20);
        }

        // 窗户灯光
        if (windowChance > 0) {
          const wx = 4;
          const wy = 6;
          for (let yy = by - bh + 8; yy < by - 6; yy += wy + 2) {
            for (let xx = x + 3; xx < x + bw - 3; xx += wx + 2) {
              if (rand() < windowChance) {
                ctx.fillStyle = `rgba(255,${200 + Math.floor(rand() * 55)},${120 + Math.floor(rand() * 80)},${windowAlpha})`;
                ctx.fillRect(xx, yy, wx - 1, wy - 2);
                ctx.fillStyle = color;
              }
            }
          }
        }
        x += bw + 1;
      }
    };

    // 远景层（淡、矮）
    drawBuildings({
      baseY: horizonY + 30,
      minH: 40,
      maxH: 120,
      minW: 18,
      maxW: 46,
      color: '#23263f',
      windowChance: 0.15,
      windowAlpha: 0.5,
    });
    // 中景层
    drawBuildings({
      baseY: horizonY + 70,
      minH: 80,
      maxH: 200,
      minW: 26,
      maxW: 64,
      color: '#161827',
      windowChance: 0.35,
      windowAlpha: 0.8,
    });
    // 近景层（深、高、窗户更亮）
    drawBuildings({
      baseY: horizonY + 130,
      minH: 140,
      maxH: 320,
      minW: 36,
      maxW: 90,
      color: '#0a0b14',
      windowChance: 0.55,
      windowAlpha: 0.95,
    });

    // 地平线道路光带（模拟城市光污染）
    const band = ctx.createLinearGradient(0, horizonY - 10, 0, horizonY + 40);
    band.addColorStop(0, 'rgba(255,150,90,0.0)');
    band.addColorStop(0.5, 'rgba(255,150,90,0.25)');
    band.addColorStop(1, 'rgba(255,150,90,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, horizonY - 10, W, 60);

    // 城市名水印（半透明，让玩家明确"在哪个城市"）
    ctx.save();
    ctx.font = 'bold 64px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillText(cityName || '', W / 2, H * 0.94);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;

    this.sky.material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.scene.environment = texture;
    if (this.stars) this.stars.visible = false;
    if (this.sun) this.sun.visible = false;
  }

  // 将字符串转为 32 位整数种子
  _hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // 基于种子的伪随机数生成器（mulberry32），返回 0~1
  _seededRandom(seed) {
    let a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 常见中文城市名 -> 英文，用于映射 panoramas/ 下的本地文件名。
   * 不在此表中的城市，会直接用用户输入名（去空格/符号）作为文件名。
   */
  _toEnglishCityName(name) {
    const trimmed = (name || '').trim();
    const map = {
      北京: 'Beijing',
      上海: 'Shanghai',
      广州: 'Guangzhou',
      深圳: 'Shenzhen',
      成都: 'Chengdu',
      杭州: 'Hangzhou',
      武汉: 'Wuhan',
      西安: "Xi'an",
      重庆: 'Chongqing',
      南京: 'Nanjing',
      天津: 'Tianjin',
      苏州: 'Suzhou',
      青岛: 'Qingdao',
      大连: 'Dalian',
      厦门: 'Xiamen',
      长沙: 'Changsha',
      香港: 'Hong Kong',
      澳门: 'Macau',
      台北: 'Taipei',
      东京: 'Tokyo',
      纽约: 'New York',
      伦敦: 'London',
      巴黎: 'Paris',
      首尔: 'Seoul',
      新加坡: 'Singapore',
      悉尼: 'Sydney',
      迪拜: 'Dubai',
      莫斯科: 'Moscow',
      柏林: 'Berlin',
      罗马: 'Rome',
      洛杉矶: 'Los Angeles',
      芝加哥: 'Chicago',
      多伦多: 'Toronto',
      旧金山: 'San Francisco',
      拉斯维加斯: 'Las Vegas',
      西雅图: 'Seattle',
      曼谷: 'Bangkok',
      吉隆坡: 'Kuala Lumpur',
    };
    return map[trimmed] || trimmed;
  }
}
