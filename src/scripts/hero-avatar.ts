// ============================================================
// Hero 3D 形象（GLB 网格 + 交互系统）
// ------------------------------------------------------------
// 模型：public/models/avatar.glb
//   图像转 3D 高精度网格（含烘焙贴图），优化管线：
//   83.4MB 原始 → 减面 20% → 贴图 2048 WebP(q88) → meshopt 顶点量化 → 3.81MB
//   依赖扩展：EXT_meshopt_compression（MeshoptDecoder）+ KHR_mesh_quantization
// 交互：
//   · 待机：呼吸浮动 / 微摆（reduced-motion 关闭）
//   · 页面滚动：滚动进度驱动转身「目送」（scroll-linked，不劫持滚轮）
//   · 拖拽：按住左右拖 → 自由旋转（释放带惯性）
//   · 点按：跳跃 + squash & stretch（无骨骼，整模动作）
//   · 指针悬停：整模轻微倾斜跟随
// 生命周期（ClientRouter 软导航纪律，见 MOTION_GUIDE §4）：
//   挂载走 document 级 astro:page-load；astro:before-swap 时 dispose
//   （renderer / 监听器 / 观察者 / geometry / material / texture 全回收）。
// 调试：window.__ORIN_AVATAR__.getState()。
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const INK = 0x141414;
const TARGET_HEIGHT = 1.8; // 归一化后人物高度（取景用）

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
const damp = (cur: number, target: number, lambda: number, dt: number) =>
  lerp(cur, target, 1 - Math.exp(-lambda * dt));

/** 分段曲线插值：给定点列 [(p, v), ...] 线性插值 */
function curve(p: number, points: [number, number][]) {
  if (p <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (p <= points[i][0]) {
      const [p0, v0] = points[i - 1];
      const [p1, v1] = points[i];
      return lerp(v0, v1, (p - p0) / (p1 - p0));
    }
  }
  return points[points.length - 1][1];
}

interface AvatarInstance {
  dispose(): void;
  popIn(): void;
  getState(): Record<string, unknown>;
}

/** 初始化 Hero 3D 画布。幂等：同一容器重复调用返回已有实例。 */
export function initHeroAvatar(container: HTMLElement): AvatarInstance {
  if ((container as any).__avatarInstance) return (container as any).__avatarInstance as AvatarInstance;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modelUrl = container.dataset.model || 'models/avatar.glb';

  // ---------- 场景 / 相机 / 渲染器 ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
  camera.position.set(0, 1.35, 3.55);
  camera.lookAt(0, 1.02, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0); // 透明：卡片白底 + 海报图兜底
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'pan-y'; // 移动端纵向滚动穿透，横向拖拽留给旋转
  canvas.style.cursor = 'grab';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    '我的 Q 版 3D 形象：黑刺猬头、圆框眼镜、手持咖啡，可拖拽旋转、点击跳跃',
  );

  // 扁平三点布光（柔和日光 + 背部补光）
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe9ff, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(2.2, 3.2, 3.6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-2.6, 2.2, -2.4);
  scene.add(rim);

  // 地面接触阴影（扁平贴纸风：实色半透明圆片）
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 26),
    new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.16 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.001;
  scene.add(shadow);

  // ---------- 交互状态 ----------
  const state = {
    yaw: 0,
    dragYaw: 0,
    dragVel: 0,
    scrollYaw: 0,
    pitch: 0,
    dragging: false,
    jumping: false,
    jumpStart: -1,
    popT: -1, // popIn 出场动画进度（-1 未激活）
    popStart: -1,
    pointerNX: 0,
    pointerNY: 0,
    pointerActive: false,
    visible: true,
    modelReady: false,
    loadError: false,
  };

  // 模型容器：squash/stretch 以脚底（原点）为枢轴
  const avatar = new THREE.Group();
  scene.add(avatar);
  const disposables: { geometry?: THREE.BufferGeometry; materials?: THREE.Material[] }[] = [];
  let pendingPop = false; // 模型未就绪时收到的弹出请求，加载完成后补播

  // ---------- 指针交互 ----------
  let downX = 0, downY = 0, downT = 0, lastX = 0, lastDX = 0;

  const onPointerDown = (e: PointerEvent) => {
    try { canvas.setPointerCapture?.(e.pointerId); } catch { /* 合成事件无活跃指针时忽略 */ }
    state.dragging = true;
    state.dragVel = 0;
    downX = lastX = e.clientX;
    downY = e.clientY;
    downT = performance.now();
    canvas.style.cursor = 'grabbing';
  };
  const onPointerMove = (e: PointerEvent) => {
    if (state.dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      lastDX = dx;
      state.dragYaw += dx * 0.012;
    } else {
      const rect = container.getBoundingClientRect();
      state.pointerNX = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      state.pointerNY = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      state.pointerActive = true;
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    try { canvas.releasePointerCapture?.(e.pointerId); } catch { /* 忽略 */ }
    state.dragging = false;
    canvas.style.cursor = 'grab';
    const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
    const elapsed = performance.now() - downT;
    if (dist < 8 && elapsed < 450) {
      // 点按（非拖拽）：跳跃 + squash
      state.jumping = true;
      state.jumpStart = performance.now() / 1000;
    } else {
      state.dragVel = clamp(lastDX * 0.012, -0.25, 0.25); // 惯性
      lastDX = 0;
    }
  };
  const onPointerLeave = () => {
    state.pointerActive = false;
    state.pointerNX = 0;
    state.pointerNY = 0;
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  // ---------- 滚动联动（只读进度，不劫持滚轮） ----------
  const onScroll = () => {
    const p = clamp(window.scrollY / (window.innerHeight * 0.85), 0, 1);
    state.scrollYaw = p * 2.6; // ~150°：下滑侧后目送，回滚转回
    state.pitch = p * 0.1;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- 可见性门控 ----------
  const io = new IntersectionObserver((entries) => {
    state.visible = entries[0].isIntersecting;
  });
  io.observe(container);

  // ---------- 尺寸自适应 ----------
  function fit() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(container);

  // ---------- 加载模型 ----------
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      // 归一化：等比缩放到目标高度，脚踩 y=0，x/z 居中
      const s = TARGET_HEIGHT / size.y;
      model.scale.setScalar(s);
      model.position.set(
        -((box.min.x + box.max.x) / 2) * s,
        -box.min.y * s,
        -((box.min.z + box.max.z) / 2) * s,
      );
      avatar.add(model);

      // 收集可释放资源
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          disposables.push({ geometry: mesh.geometry, materials: Array.isArray(mesh.material) ? mesh.material : [mesh.material] });
        }
      });

      state.modelReady = true;
      // canvas 淡入由 CSS（body.hero-3d-mode）接管，海报层退场同样由模式类控制。
      // 首次切入时点击早于模型就绪：补播弹出动画
      if (pendingPop) {
        pendingPop = false;
        state.popStart = performance.now() / 1000;
        state.popT = 0;
      }
    },
    undefined,
    () => {
      // 加载失败：自动切回平面模式（海报永久兜底）
      state.loadError = true;
      document.body.classList.remove('hero-3d-mode');
      const btn = document.getElementById('hero-mode-toggle');
      if (btn) btn.setAttribute('aria-pressed', 'false');
      try { localStorage.setItem('hero-mode', 'flat'); } catch { /* 忽略 */ }
    },
  );

  // ---------- 渲染循环 ----------
  let rafId = 0;
  let lastT = performance.now() / 1000;

  // 跳跃曲线（squash & stretch 四段）：
  // 0~0.14 蓄力压扁 → 0.14~0.5 跳起（y 抛物线 + 起跳拉伸）→ 0.5~0.72 落地再压扁 → 0.72~1 回弹归位
  const JUMP_MS = 950;
  const jumpY = (p: number) => curve(p, [[0, 0], [0.14, 0], [0.32, 0.24], [0.5, 0], [1, 0]]);
  const jumpSY = (p: number) => curve(p, [[0, 1], [0.14, 0.86], [0.2, 1.1], [0.32, 1.04], [0.5, 0.98], [0.6, 0.88], [0.72, 1.05], [0.85, 0.98], [1, 1]]);

  // 切入 3D 的出场弹出动画时长
  const POP_MS = 700;

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!state.visible || !state.modelReady) return;

    const now = performance.now() / 1000;
    const dt = clamp(now - lastT, 0, 0.05);
    lastT = now;
    const t = now;

    // 目标 yaw = 滚动联动 + 拖拽偏移（含惯性衰减）
    if (!state.dragging) {
      state.dragYaw += state.dragVel;
      state.dragVel *= Math.pow(0.06, dt);
    }
    state.yaw = damp(state.yaw, state.scrollYaw + state.dragYaw, 6, dt);

    // 基础旋转：yaw（转身）+ pitch（滚动俯仰）+ 悬停倾斜 + 待机微摆
    const leanZ = state.pointerActive ? -state.pointerNX * 0.05 : 0;
    const leanX = state.pointerActive ? state.pointerNY * 0.04 : 0;
    const idleSway = reduceMotion ? 0 : Math.sin(t * 0.8) * 0.015;
    avatar.rotation.y = state.yaw;
    avatar.rotation.x = state.pitch + leanX;
    avatar.rotation.z = leanZ + idleSway;

    // 待机呼吸浮动 + 影子同步
    let bob = 0;
    if (!reduceMotion) {
      bob = Math.sin(t * 1.7) * 0.02;
      shadow.material.opacity = 0.16 - bob * 0.25;
      shadow.scale.setScalar(1 - bob * 1.2);
    }

    // 切入 3D 弹出动画：从小到大 + 过冲回弹（带轻微 y 上升）
    // 动画期间接管 scale/position，结束后交还给待机/跳跃逻辑
    if (state.popT >= 0) {
      const p = (t - state.popStart) / (POP_MS / 1000);
      if (p >= 1) {
        state.popT = -1;
      } else {
        // 弹性曲线：easeOutBack（从 0 长到 1，过冲到 1.08 再回1）
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const q = clamp(p, 0, 1);
        const s = 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2);
        // 底部地面基准：缩放为 0 时从脚底长出（脚底固定在地面，头向上长）
        const base = 0.001;
        const scale = base + (1 - base) * s;
        avatar.scale.set(scale, scale, scale);
        // 出场伴随轻微上浮：中段抬 0.15 再落回（视觉上"跳出来"）
        avatar.position.y = bob + Math.sin(q * Math.PI) * 0.18;
        // 影子随缩放同步生长
        shadow.scale.setScalar(scale);
        shadow.material.opacity = 0.16 * scale;
      }
    }

    // 点按跳跃：squash & stretch（reduced-motion 降级为轻微原地压弹）
    if (state.jumping) {
      const p = (t - state.jumpStart) / (JUMP_MS / 1000);
      if (p >= 1) {
        state.jumping = false;
        avatar.position.y = 0;
        avatar.scale.set(1, 1, 1);
      } else if (reduceMotion) {
        const tiny = Math.sin(p * Math.PI) * 0.04;
        avatar.position.y = 0;
        avatar.scale.set(1 + tiny * 0.5, 1 - tiny, 1 + tiny * 0.5);
      } else {
        avatar.position.y = bob + jumpY(p);
        const sy = jumpSY(p);
        avatar.scale.set(1 + (1 - sy) * 0.6, sy, 1 + (1 - sy) * 0.6);
        avatar.rotation.z += Math.sin(p * Math.PI) * 0.05; // 跳跃中微歪
      }
    } else if (state.popT < 0) {
      // 非弹出、非跳跃：待机常态
      avatar.position.y = bob;
      avatar.scale.set(1, 1, 1);
    }

    renderer.render(scene, camera);
  }
  tick();

  const instance: AvatarInstance = {
    // 切入 3D 时调用：模型从小到大弹出（模型未就绪则标记待播，加载完自动播）
    popIn() {
      if (state.modelReady) {
        state.popStart = performance.now() / 1000;
        state.popT = 0;
        // 出场时顺便重置拖拽偏移，面向用户弹出
        state.dragYaw = 0;
        state.dragVel = 0;
      } else {
        pendingPop = true;
      }
    },
    dispose() {
      cancelAnimationFrame(rafId);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      for (const d of disposables) {
        d.geometry?.dispose();
        for (const m of d.materials || []) {
          const std = m as THREE.MeshStandardMaterial;
          std.map?.dispose();
          std.normalMap?.dispose();
          std.roughnessMap?.dispose();
          std.metalnessMap?.dispose();
          std.aoMap?.dispose();
          m.dispose();
        }
      }
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
      renderer.dispose();
      canvas.remove();
      delete (container as any).__avatarInstance;
    },
    getState() {
      return {
        modelReady: state.modelReady,
        loadError: state.loadError,
        yaw: +state.yaw.toFixed(3),
        dragYaw: +state.dragYaw.toFixed(3),
        scrollYaw: +state.scrollYaw.toFixed(3),
        dragging: state.dragging,
        jumping: state.jumping,
        popActive: state.popT >= 0,
        pendingPop,
        pointerNX: +state.pointerNX.toFixed(3),
        pointerNY: +state.pointerNY.toFixed(3),
        pointerActive: state.pointerActive,
        reduceMotion,
        visible: state.visible,
        canvasAttached: !!container.contains(canvas),
      };
    },
  };
  (container as any).__avatarInstance = instance;
  (window as any).__ORIN_AVATAR__ = instance;
  return instance;
}
