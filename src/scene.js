import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createShopLabelMesh } from './labels.js';

/**
 * Контроллер сцены Three.js в светлом чистом стиле Яндекс Карт.
 * Поддерживает крупный размер названий, экранную компенсацию при отдалении
 * и дополнительное увеличение при приближении.
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

    // Списки объектов
    this.shopMeshes = [];
    this.labelItems = [];

    // Интерактивность
    this.hoveredMesh = null;
    this.selectedMesh = null;
    this.mouse = new THREE.Vector2(-1000, -1000);
    this.mouseMoved = false;
    this.raycaster = new THREE.Raycaster();

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
    const frustumSize = 85;
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

      this.shopsGroup.add(mesh);
      this.shopMeshes.push(mesh);

      // Меш подписи
      const labelMesh = createShopLabelMesh(shop);
      this.labelsGroup.add(labelMesh);
      this.labelItems.push({
        mesh: labelMesh,
        shop,
        shopPos: new THREE.Vector3(shop.x, 0, shop.z)
      });
    }
  }

  /**
   * Динамическое масштабирование подписей:
   * - При отдалении камеры: компенсирует масштаб, сохраняя читаемый размер бейджей на экране.
   * - При приближении камеры: плавно увеличивает размер бейджей для детального рассмотрения.
   */
  _updateLabelsScale() {
    if (this.mode === '2D') {
      const z = this.orthoCamera.zoom;
      let scale;
      if (z < 1.0) {
        // Отдаление: компенсируем уменьшение, чтобы бейджи не мельчали
        scale = 1.0 / z;
      } else {
        // Приближение: плавно увеличиваем бейдж
        scale = 1.0 + (z - 1.0) * 0.35;
      }

      for (const item of this.labelItems) {
        item.mesh.scale.set(scale, scale, scale);
      }
    } else {
      const refDistance = 85.0;
      const camPos = this.perspCamera.position;

      for (const item of this.labelItems) {
        const dist = camPos.distanceTo(item.shopPos);
        let scale;
        if (dist > refDistance) {
          // Отдаление: компенсируем перспективное уменьшение
          scale = dist / refDistance;
        } else {
          // Приближение: увеличиваем размер для лучшей читаемости
          scale = 1.0 + ((refDistance - dist) / refDistance) * 0.45;
        }

        item.mesh.scale.set(scale, scale, scale);
      }
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

    const startPos = this.activeCamera.position.clone();
    const startTarget = this.controls.target.clone();
    const startScaleY = this.mode === '3D' ? 1.0 : 0.04;
    const endScaleY = targetMode === '3D' ? 1.0 : 0.04;

    const endTarget = new THREE.Vector3(0, 0, 0);
    const endPos = targetMode === '3D'
      ? new THREE.Vector3(0, 55, 65)
      : new THREE.Vector3(0, 80, 0);

    const startQuats = this.labelItems.map(item => item.mesh.quaternion.clone());
    const target3DQuat = this.perspCamera.quaternion.clone();

    const startTime = performance.now();
    const duration = 750;

    if (targetMode === '3D') {
      this.perspCamera.position.copy(startPos);
      this.perspCamera.up.set(0, 1, 0);
      this.activeCamera = this.perspCamera;
      this.controls.object = this.perspCamera;
      this.controls.enableRotate = true;
    }

    const animateTransition = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.activeCamera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);

      const currentScaleY = THREE.MathUtils.lerp(startScaleY, endScaleY, ease);
      for (const mesh of this.shopMeshes) {
        mesh.scale.y = currentScaleY;
        mesh.position.y = (mesh.userData.shop.height * currentScaleY) / 2;
      }

      for (let i = 0; i < this.labelItems.length; i++) {
        const item = this.labelItems[i];
        const startH = (this.mode === '3D') ? item.shop.height + 0.42 : 0.08;
        const endH = (targetMode === '3D') ? item.shop.height + 0.42 : 0.08;
        item.mesh.position.y = THREE.MathUtils.lerp(startH, endH, ease);

        const targetQuat = (targetMode === '3D') ? target3DQuat : this.flatQuaternion;
        item.mesh.quaternion.copy(startQuats[i]).slerp(targetQuat, ease);
      }

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        this.mode = targetMode;
        this.isTransitioning = false;

        if (this.mode === '2D') {
          this.orthoCamera.position.set(0, 80, 0);
          this.orthoCamera.up.set(0, 0, -1);
          this.orthoCamera.lookAt(0, 0, 0);
          this.activeCamera = this.orthoCamera;
          this.controls.object = this.orthoCamera;
          this.controls.enableRotate = false;

          for (const item of this.labelItems) {
            item.mesh.quaternion.copy(this.flatQuaternion);
            item.mesh.position.y = 0.08;
          }
        } else {
          this.controls.enableRotate = true;
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
    const intersects = this.raycaster.intersectObjects(this.shopMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;

      if (this.hoveredMesh !== hitMesh) {
        this._clearHover();
        this.hoveredMesh = hitMesh;
        if (hitMesh !== this.selectedMesh) {
          hitMesh.material.emissive.setHex(0x334155);
          hitMesh.material.emissiveIntensity = 0.35;
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
        this.hoveredMesh.material.emissive.setHex(0x000000);
        this.hoveredMesh.material.emissiveIntensity = 0;
      }
      this.hoveredMesh = null;
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  _handleClick() {
    this.raycaster.setFromCamera(this.mouse, this.activeCamera);
    const intersects = this.raycaster.intersectObjects(this.shopMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
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
    }

    this.selectedMesh = targetMesh;
    this.selectedMesh.material.emissive.setHex(0xf59e0b);
    this.selectedMesh.material.emissiveIntensity = 0.65;

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
    if (this.mouseMoved) {
      this._checkHover();
      this.mouseMoved = false;
    }

    // Компенсация масштаба подписей (отдаление фиксирует размер, приближение увеличивает)
    this._updateLabelsScale();

    // В 3D режиме подписи следуют за ракурсом камеры (billboarding)
    if (this.mode === '3D' && !this.isTransitioning) {
      for (const item of this.labelItems) {
        item.mesh.quaternion.copy(this.perspCamera.quaternion);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.activeCamera);
  }
}
