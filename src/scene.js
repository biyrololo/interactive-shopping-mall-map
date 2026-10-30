import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createShopLabelMesh } from './labels.js';

/**
 * Контроллер сцены Three.js, рендерера, камер и взаимодействия
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

    // Заранее подготовленный кватернион для 2D-режима (лежит плашмя в XZ)
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
    this.scene.background = new THREE.Color(0x0a0f1d);

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
    // ВАЖНО: для взгляда сверху вдоль оси -Y вектор up ДОЛЖЕН быть (0, 0, -1),
    // чтобы ось X была направлена вправо, а -Z (север) — вверх экрана.
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

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(40, 70, 40);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x60a5fa, 0.35);
    backLight.position.set(-40, 50, -40);
    this.scene.add(backLight);
  }

  _buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(this.floorData.width, this.floorData.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x131c2e,
      roughness: 0.9
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.01;
    this.scene.add(floorMesh);

    // Легкая сетка пола
    const maxDim = Math.max(this.floorData.width, this.floorData.depth);
    const grid = new THREE.GridHelper(maxDim, Math.round(maxDim / 5), 0x24324f, 0x1a263d);
    grid.position.y = 0.005;
    this.scene.add(grid);
  }

  _buildShops() {
    this.shopsGroup = new THREE.Group();
    this.labelsGroup = new THREE.Group();
    this.scene.add(this.shopsGroup);
    this.scene.add(this.labelsGroup);

    for (const shop of this.shops) {
      // 1. Меш магазина (прямоугольный параллелепипед)
      const geo = new THREE.BoxGeometry(shop.width, shop.height, shop.depth);
      const mat = new THREE.MeshStandardMaterial({
        color: shop.color,
        roughness: 0.45,
        metalness: 0.1,
        emissive: 0x000000,
        emissiveIntensity: 0
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(shop.x, shop.height / 2, shop.z);
      mesh.userData = { shop, originalColor: shop.color };
      this.shopsGroup.add(mesh);
      this.shopMeshes.push(mesh);

      // 2. Меш подписи (PlaneMesh)
      // ВАЖНО: добавляем в отдельную группу labelsGroup, а НЕ внутрь mesh,
      // чтобы масштабирование высоты коробки mesh.scale.y не сжимало подпись в полоску!
      const labelMesh = createShopLabelMesh(shop);
      this.labelsGroup.add(labelMesh);
      this.labelItems.push({ mesh: labelMesh, shop });
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

    // Запоминаем начальные ориентации подписей для интерполяции
    const startQuats = this.labelItems.map(item => item.mesh.quaternion.clone());
    const target3DQuat = this.perspCamera.quaternion.clone();

    const startTime = performance.now();
    const duration = 800; // 0.8с

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

      // Интерполяция камеры и таргета
      this.activeCamera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);

      // Интерполяция высоты магазинов
      const currentScaleY = THREE.MathUtils.lerp(startScaleY, endScaleY, ease);
      for (const mesh of this.shopMeshes) {
        mesh.scale.y = currentScaleY;
        mesh.position.y = (mesh.userData.shop.height * currentScaleY) / 2;
      }

      // Интерполяция положения и ориентации подписей
      for (let i = 0; i < this.labelItems.length; i++) {
        const item = this.labelItems[i];
        const startH = (this.mode === '3D') ? item.shop.height + 0.35 : 0.08;
        const endH = (targetMode === '3D') ? item.shop.height + 0.35 : 0.08;
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
          // В 2D переключаем на ортографическую камеру со строгим видом сверху
          this.orthoCamera.position.set(0, 80, 0);
          this.orthoCamera.up.set(0, 0, -1);
          this.orthoCamera.lookAt(0, 0, 0);
          this.activeCamera = this.orthoCamera;
          this.controls.object = this.orthoCamera;
          this.controls.enableRotate = false; // Блокируем наклон в 2D

          // В 2D все подписи строго лежат на плоскости XZ
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
          hitMesh.material.emissive.setHex(0x38bdf8);
          hitMesh.material.emissiveIntensity = 0.45;
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
    this.selectedMesh.material.emissive.setHex(0x00f0ff);
    this.selectedMesh.material.emissiveIntensity = 0.7;

    // Требование ТЗ: Вывод в консоль ID, Name, позиция
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

  render() {
    if (this.mouseMoved) {
      this._checkHover();
      this.mouseMoved = false;
    }

    // В 3D режиме поворачиваем подписи к камере (billboarding), если камера вращается
    if (this.mode === '3D' && !this.isTransitioning) {
      for (const item of this.labelItems) {
        item.mesh.quaternion.copy(this.perspCamera.quaternion);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.activeCamera);
  }
}
