import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createShopLabelMesh } from './labels.js';

/**
 * Контроллер сцены Three.js в светлом чистом стиле Яндекс Карт.
 * Поддерживает два режима подписей:
 * 1. Крупный (Large): постоянный размер на экране за счет масштабирования от zoom.
 * 2. Компактный (Compact): фиксированный размер в мировых координатах (без зум-масштабирования),
 *    аккуратный и не мешающий общему обзору этажа.
 */
export class MallScene {
  constructor(container, layoutData, onSelectShop) {
    this.container = container;
    this.shops = layoutData.shops;
    this.floorData = layoutData.floor;
    this.onSelectShop = onSelectShop;

    // Режим камеры ('3D' или '2D')
    this.mode = '3D';
    this.isTransitioning = false;

    // Режим отображения подписей
    this.labelsCompact = false;
    this.labelBlendProgress = 1.0; // 1.0 = крупный экранный режим, 0.0 = фиксированный компактный

    // Списки объектов
    this.shopMeshes = [];
    this.labelItems = [];
    this.interactiveObjects = [];

    // Интерактивность
    this.hoveredMesh = null;
    this.hoveredLabelMesh = null;
    this.selectedMesh = null;
    this.mouse = new THREE.Vector2(-1000, -1000);
    this.mouseMoved = false;
    this.raycaster = new THREE.Raycaster();

    // Плавная анимация hover-эффектов
    this.animatingHoverMeshes = new Set();
    this._colorEdgeDefault = new THREE.Color(0x000000);
    this._colorEdgeHover = new THREE.Color(0x1d4ed8);

    // Кватернион для 2D-режима (лежит плашмя в XZ)
    this.flatQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

    this._initScene();
    this._initCameras();
    this._initControls();
    this._initLights();
    this._buildFloor();
    this._buildShops();
    this._bindEvents();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    // Светлый нейтральный фон как в интерфейсе Яндекс Карт
    this.scene.background = new THREE.Color(0xf1f3f5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);
  }

  _initCameras() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;

    // 1. Перспективная камера (3D-режим под углом)
    this.perspCamera = new THREE.PerspectiveCamera(45, aspect, 1, 1000);
    this.perspCamera.position.set(0, 55, 65);
    this.perspCamera.up.set(0, 1, 0);
    this.perspCamera.lookAt(0, 0, 0);

    // 2. Ортографическая камера (2D-режим "вид сверху")
    this.orthoFrustumSize = 85;
    const frustumSize = this.orthoFrustumSize;
    this.orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      1,
      1000
    );
    this.orthoCamera.position.set(0, 80, 0);
    this.orthoCamera.up.set(0, 0, -1);
    this.orthoCamera.lookAt(0, 0, 0);

    this.activeCamera = this.perspCamera;
  }

  _initControls() {
    this.controls = new OrbitControls(this.activeCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Не уходить под пол в 3D
    this.controls.minDistance = 15;
    this.controls.maxDistance = 250;
    this.controls.target.set(0, 0, 0);
  }

  _initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.45);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
    dirLight.position.set(40, 75, 45);
    this.scene.add(dirLight);
  }

  _buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(this.floorData.width, this.floorData.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.01;
    this.scene.add(floorMesh);

    // Тонкая сетка проходов
    const maxDim = Math.max(this.floorData.width, this.floorData.depth);
    const grid = new THREE.GridHelper(maxDim, Math.round(maxDim / 5), 0xe2e8f0, 0xf1f5f9);
    grid.position.y = 0.005;
    this.scene.add(grid);
  }

  _buildShops() {
    this.shopsGroup = new THREE.Group();
    this.labelsGroup = new THREE.Group();
    this.scene.add(this.shopsGroup);
    this.scene.add(this.labelsGroup);

    for (const shop of this.shops) {
      const geo = new THREE.BoxGeometry(shop.width, shop.height, shop.depth);
      const mat = new THREE.MeshStandardMaterial({
        color: shop.color,
        roughness: 0.5,
        metalness: 0.05,
        emissive: 0x000000,
        emissiveIntensity: 0
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(shop.x, shop.height / 2, shop.z);
      mesh.userData = { shop, originalColor: shop.color };

      // Тонкая аккуратная обводка граней для архитектурной четкости
      const edgesGeo = new THREE.EdgesGeometry(geo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.12
      });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edges);

      // Меш подписи
      const labelMesh = createShopLabelMesh(shop);
      this.labelsGroup.add(labelMesh);
      this.labelItems.push({
        mesh: labelMesh,
        shop,
        shopPos: new THREE.Vector3(shop.x, 0, shop.z)
      });

      mesh.userData = {
        shop,
        originalColor: shop.color,
        edges,
        labelMesh,
        hoverProgress: 0.0,
        targetHoverProgress: 0.0
      };
      labelMesh.userData.shopMesh = mesh;

      this.shopsGroup.add(mesh);
      this.shopMeshes.push(mesh);
      this.interactiveObjects.push(mesh, labelMesh);
    }
  }

  /**
   * Переключение между крупными названиями и компактным режимом.
   * @returns {boolean} true, если активен крупный режим
   */
  toggleLabels() {
    this.labelsCompact = !this.labelsCompact;
    return !this.labelsCompact;
  }

  /**
   * Динамическое масштабирование подписей:
   * - В крупном режиме: масштабируются от zoom / distance, сохраняя постоянный размер на экране.
   * - В компактном режиме: имеют фиксированный размер в мировых координатах (без масштабирования от zoom).
   */
  _updateLabelsScale() {
    const targetBlend = this.labelsCompact ? 0.0 : 1.0;
    this.labelBlendProgress = THREE.MathUtils.lerp(
      this.labelBlendProgress,
      targetBlend,
      0.15
    );

    // Фиксированный размер в компактном режиме (не зависит от zoom)
    const compactScale = 0.58;

    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(this.perspCamera.fov / 2));
    const camPos = this.perspCamera.position;

    for (const item of this.labelItems) {
      let largeScale;
      if (this.activeCamera === this.orthoCamera) {
        largeScale = 1.0 / this.orthoCamera.zoom;
      } else {
        const dist = camPos.distanceTo(item.shopPos);
        const currentVisibleHeight = 2 * dist * tanHalfFov;
        largeScale = currentVisibleHeight / this.orthoFrustumSize;
      }

      let currentScale = THREE.MathUtils.lerp(compactScale, largeScale, this.labelBlendProgress);

      // Плавный transition размера плашки при наведении или выборе (+15%)
      const shopMesh = item.mesh.userData.shopMesh;
      if (shopMesh) {
        const isSelected = (shopMesh === this.selectedMesh);
        const p = isSelected ? 1.0 : (shopMesh.userData.hoverProgress || 0.0);
        if (p > 0) {
          currentScale *= (1.0 + 0.15 * p);
        }
      }

      item.mesh.scale.set(currentScale, currentScale, currentScale);
    }
  }

  toggleMode() {
    if (this.isTransitioning) return;
    this.setMode(this.mode === '3D' ? '2D' : '3D');
  }

  setMode(targetMode) {
    if (targetMode === this.mode || this.isTransitioning) return;

    this.isTransitioning = true;
    this.targetMode = targetMode;

    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(this.perspCamera.fov / 2));
    const orthoTargetDist = (this.orthoFrustumSize / this.orthoCamera.zoom) / (2 * tanHalfFov);

    let startSpherical;
    let endSpherical;
    const startTarget = this.controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);

    const startScaleY = this.mode === '3D' ? 1.0 : 0.04;
    const endScaleY = targetMode === '3D' ? 1.0 : 0.04;

    if (targetMode === '2D') {
      // 3D -> 2D
      const offset = new THREE.Vector3().subVectors(this.perspCamera.position, this.controls.target);
      const sph = new THREE.Spherical().setFromVector3(offset);

      // Нормализуем азимут по кратчайшей дуге (-PI..PI)
      let sTheta = sph.theta % (2 * Math.PI);
      if (sTheta > Math.PI) sTheta -= 2 * Math.PI;
      if (sTheta < -Math.PI) sTheta += 2 * Math.PI;

      startSpherical = {
        radius: sph.radius,
        phi: Math.max(0.0001, sph.phi),
        theta: sTheta
      };

      endSpherical = {
        radius: orthoTargetDist,
        phi: 0.0001,
        theta: 0
      };

      this.activeCamera = this.perspCamera;
    } else {
      // 2D -> 3D
      startSpherical = {
        radius: orthoTargetDist,
        phi: 0.0001,
        theta: 0
      };

      const defRadius = Math.hypot(55, 65);
      const defPhi = Math.acos(55 / defRadius);

      endSpherical = {
        radius: defRadius,
        phi: defPhi,
        theta: 0
      };

      // Ставим perspCamera точно в текущий орто-ракурс перед началом полета
      const startOffset = new THREE.Vector3().setFromSphericalCoords(
        startSpherical.radius,
        startSpherical.phi,
        startSpherical.theta
      );
      this.perspCamera.position.copy(startTarget).add(startOffset);
      this.perspCamera.up.set(0, 1, 0);
      this.perspCamera.lookAt(startTarget);

      this.activeCamera = this.perspCamera;
      this.controls.object = this.perspCamera;
    }

    const startTime = performance.now();
    const duration = 750;

    const animateTransition = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // 1. Плавный сферический облет камеры без резкого доворота
      const curRadius = THREE.MathUtils.lerp(startSpherical.radius, endSpherical.radius, ease);
      const curPhi = THREE.MathUtils.lerp(startSpherical.phi, endSpherical.phi, ease);
      const curTheta = THREE.MathUtils.lerp(startSpherical.theta, endSpherical.theta, ease);

      const curTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, ease);
      const curOffset = new THREE.Vector3().setFromSphericalCoords(curRadius, curPhi, curTheta);

      this.perspCamera.position.copy(curTarget).add(curOffset);
      this.perspCamera.up.set(0, 1, 0);
      this.perspCamera.lookAt(curTarget);
      this.controls.target.copy(curTarget);

      // 2. Плавная трансформация высоты параллелепипедов магазинов
      const currentScaleY = THREE.MathUtils.lerp(startScaleY, endScaleY, ease);
      for (const mesh of this.shopMeshes) {
        mesh.scale.y = currentScaleY;
        mesh.position.y = (mesh.userData.shop.height * currentScaleY) / 2;
      }

      // 3. Плавный доворот плашек: плашки точно следуют за ракурсом камеры, плавно ложась на крыши
      for (const item of this.labelItems) {
        const startH = (this.mode === '3D') ? item.shop.height + 0.45 : 0.08;
        const endH = (targetMode === '3D') ? item.shop.height + 0.45 : 0.08;
        item.mesh.position.y = THREE.MathUtils.lerp(startH, endH, ease);
        item.mesh.quaternion.copy(this.perspCamera.quaternion);
      }

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        this.mode = targetMode;
        this.isTransitioning = false;

        if (this.mode === '2D') {
          this.orthoCamera.position.set(endTarget.x, 100, endTarget.z);
          this.orthoCamera.up.set(0, 0, -1);
          this.orthoCamera.lookAt(endTarget);
          this.activeCamera = this.orthoCamera;
          this.controls.object = this.orthoCamera;
          this.controls.target.copy(endTarget);
          this.controls.enableRotate = false;
          this.controls.update();

          for (const item of this.labelItems) {
            item.mesh.quaternion.copy(this.flatQuaternion);
            item.mesh.position.y = 0.08;
          }
        } else {
          this.perspCamera.position.set(0, 55, 65);
          this.perspCamera.up.set(0, 1, 0);
          this.perspCamera.lookAt(endTarget);
          this.activeCamera = this.perspCamera;
          this.controls.object = this.perspCamera;
          this.controls.target.copy(endTarget);
          this.controls.enableRotate = true;
          this.controls.update();

          for (const item of this.labelItems) {
            item.mesh.quaternion.copy(this.perspCamera.quaternion);
          }
        }
      }
    };

    requestAnimationFrame(animateTransition);
  }

  _bindEvents() {
    window.addEventListener('resize', this._onResize.bind(this));

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.mouseMoved = true;
    });

    this.renderer.domElement.addEventListener('pointerleave', () => {
      this.mouse.set(-1000, -1000);
      this.mouseMoved = true;
    });

    let pointerDownPos = { x: 0, y: 0 };
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 5) {
        this._handleClick();
      }
    });
  }

  _onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;

    this.renderer.setSize(width, height);
    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();

    const frustumSize = 85;
    this.orthoCamera.left = (-frustumSize * aspect) / 2;
    this.orthoCamera.right = (frustumSize * aspect) / 2;
    this.orthoCamera.top = frustumSize / 2;
    this.orthoCamera.bottom = -frustumSize / 2;
    this.orthoCamera.updateProjectionMatrix();
  }

  _checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.activeCamera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, false);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const hitMesh = hitObj.userData.shopMesh || hitObj;

      if (this.hoveredMesh !== hitMesh) {
        this._clearHover();
        this.hoveredMesh = hitMesh;
        this.hoveredLabelMesh = hitMesh.userData.labelMesh;

        if (hitMesh !== this.selectedMesh) {
          hitMesh.material.emissive.setHex(0xffffff);
          hitMesh.userData.targetHoverProgress = 1.0;
          this.animatingHoverMeshes.add(hitMesh);
        }

        if (this.hoveredLabelMesh) {
          this.hoveredLabelMesh.renderOrder = 1000;
        }

        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      this._clearHover();
    }
  }

  _clearHover() {
    if (this.hoveredMesh) {
      if (this.hoveredMesh !== this.selectedMesh) {
        this.hoveredMesh.userData.targetHoverProgress = 0.0;
        this.animatingHoverMeshes.add(this.hoveredMesh);
      }

      this.hoveredMesh = null;
      this.hoveredLabelMesh = null;
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  /**
   * Плавный transition hover-эффекта (мягкое включение и затухание подсветки/контура за ~180-200ms)
   */
  _updateHoverTransitions() {
    if (this.animatingHoverMeshes.size === 0) return;

    for (const mesh of this.animatingHoverMeshes) {
      const target = mesh.userData.targetHoverProgress || 0.0;
      mesh.userData.hoverProgress = THREE.MathUtils.lerp(
        mesh.userData.hoverProgress || 0.0,
        target,
        0.18
      );

      if (Math.abs(mesh.userData.hoverProgress - target) < 0.005) {
        mesh.userData.hoverProgress = target;
        this.animatingHoverMeshes.delete(mesh);
        if (target === 0.0 && mesh !== this.selectedMesh && mesh.userData.labelMesh) {
          mesh.userData.labelMesh.renderOrder = 999;
        }
      }

      const p = mesh.userData.hoverProgress;
      if (mesh !== this.selectedMesh) {
        mesh.material.emissiveIntensity = p * 0.45;
        if (mesh.userData.edges) {
          mesh.userData.edges.material.opacity = THREE.MathUtils.lerp(0.12, 0.95, p);
          mesh.userData.edges.material.color.lerpColors(this._colorEdgeDefault, this._colorEdgeHover, p);
        }
      }
    }
  }

  _handleClick() {
    if (this.isTransitioning) return;
    this.raycaster.setFromCamera(this.mouse, this.activeCamera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, false);

    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const hitMesh = hitObj.userData.shopMesh || hitObj;
      this.selectShop(hitMesh.userData.shop);
    } else {
      this.deselect();
    }
  }

  selectShop(shop) {
    const targetMesh = this.shopMeshes.find(m => m.userData.shop.id === shop.id);
    if (!targetMesh) return;

    if (this.selectedMesh) {
      this.selectedMesh.material.emissive.setHex(0x000000);
      this.selectedMesh.material.emissiveIntensity = 0;
      if (this.selectedMesh.userData.edges) {
        this.selectedMesh.userData.edges.material.color.setHex(0x000000);
        this.selectedMesh.userData.edges.material.opacity = 0.12;
      }
      if (this.selectedMesh.userData.labelMesh) {
        this.selectedMesh.userData.labelMesh.renderOrder = 999;
      }
      this.selectedMesh.userData.hoverProgress = 0.0;
      this.selectedMesh.userData.targetHoverProgress = 0.0;
      this.animatingHoverMeshes.delete(this.selectedMesh);
    }

    this.selectedMesh = targetMesh;
    this.selectedMesh.userData.hoverProgress = 1.0;
    this.selectedMesh.userData.targetHoverProgress = 1.0;
    this.animatingHoverMeshes.delete(this.selectedMesh);

    this.selectedMesh.material.emissive.setHex(0xf59e0b);
    this.selectedMesh.material.emissiveIntensity = 0.75;
    if (this.selectedMesh.userData.edges) {
      this.selectedMesh.userData.edges.material.color.setHex(0xb45309);
      this.selectedMesh.userData.edges.material.opacity = 1.0;
    }
    if (this.selectedMesh.userData.labelMesh) {
      this.selectedMesh.userData.labelMesh.renderOrder = 1001;
    }

    console.log(`[Shop Selected] ID: ${shop.id}, Name: "${shop.name}", Position:`, {
      x: Number(shop.x.toFixed(2)),
      y: Number(shop.y.toFixed(2)),
      z: Number(shop.z.toFixed(2))
    });

    if (this.onSelectShop) {
      this.onSelectShop(shop);
    }
  }

  deselect() {
    if (this.selectedMesh) {
      this.selectedMesh.material.emissive.setHex(0x000000);
      this.selectedMesh.material.emissiveIntensity = 0;
      if (this.selectedMesh.userData.edges) {
        this.selectedMesh.userData.edges.material.color.setHex(0x000000);
        this.selectedMesh.userData.edges.material.opacity = 0.12;
      }
      if (this.selectedMesh.userData.labelMesh) {
        this.selectedMesh.userData.labelMesh.renderOrder = 999;
      }
      this.selectedMesh.userData.hoverProgress = 0.0;
      this.selectedMesh.userData.targetHoverProgress = 0.0;
      this.animatingHoverMeshes.delete(this.selectedMesh);
      this.selectedMesh = null;
    }
    if (this.onSelectShop) {
      this.onSelectShop(null);
    }
  }

  focusOnShop(shop) {
    this.controls.target.set(shop.x, 0, shop.z);
    if (this.mode === '3D') {
      this.activeCamera.position.set(shop.x, 25, shop.z + 30);
    } else {
      this.activeCamera.position.set(shop.x, 80, shop.z);
    }
  }

  zoomIn() {
    if (this.mode === '3D') {
      this.activeCamera.position.lerp(this.controls.target, 0.2);
    } else {
      this.orthoCamera.zoom = Math.min(this.orthoCamera.zoom * 1.25, 3.5);
      this.orthoCamera.updateProjectionMatrix();
    }
  }

  zoomOut() {
    if (this.mode === '3D') {
      const dir = new THREE.Vector3().subVectors(this.activeCamera.position, this.controls.target).normalize();
      this.activeCamera.position.addScaledVector(dir, 15);
    } else {
      this.orthoCamera.zoom = Math.max(this.orthoCamera.zoom / 1.25, 0.4);
      this.orthoCamera.updateProjectionMatrix();
    }
  }

  render() {
    if (this.mouseMoved && !this.isTransitioning) {
      this._checkHover();
      this.mouseMoved = false;
    }

    // Плавный transition hover-эффекта (мягкое свечение и контур)
    this._updateHoverTransitions();

    // Компенсация масштаба подписей (в крупном режиме — экранная, в компактном — фиксированная)
    this._updateLabelsScale();

    // В 3D режиме подписи следуют за ракурсом камеры (billboarding)
    if (this.mode === '3D' && !this.isTransitioning) {
      for (const item of this.labelItems) {
        item.mesh.quaternion.copy(this.perspCamera.quaternion);
      }
    }

    if (!this.isTransitioning) {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.activeCamera);
  }
}
