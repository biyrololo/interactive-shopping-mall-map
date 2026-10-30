import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createShopLabelSprite } from './labels.js';

/**
 * Основной контроллер сцены Three.js, рендерера, камер и взаимодействия
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

    // Интерактивность
    this.hoveredMesh = null;
    this.selectedMesh = null;
    this.mouse = new THREE.Vector2(-1000, -1000);
    this.mouseMoved = false;
    this.raycaster = new THREE.Raycaster();
    this.shopMeshes = [];

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

    // 1. Перспективная камера (3D-режим)
    this.perspCamera = new THREE.PerspectiveCamera(45, aspect, 1, 1000);
    this.perspCamera.position.set(0, 55, 65);

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
    this.orthoCamera.position.set(0, 80, 0.001); // 0.001 по Z для корректной ориентации lookAt
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
    // Равномерный мягкий свет (без тяжелых теней)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(40, 70, 40);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x60a5fa, 0.3);
    backLight.position.set(-40, 50, -40);
    this.scene.add(backLight);
  }

  _buildFloor() {
    // Основание этажа ТЦ
    const floorGeo = new THREE.PlaneGeometry(this.floorData.width, this.floorData.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x131c2e,
      roughness: 0.9
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.01;
    this.scene.add(floorMesh);

    // Легкая сетка пола для ориентирования
    const maxDim = Math.max(this.floorData.width, this.floorData.depth);
    const grid = new THREE.GridHelper(maxDim, Math.round(maxDim / 5), 0x24324f, 0x1a263d);
    grid.position.y = 0.005;
    this.scene.add(grid);
  }

  _buildShops() {
    this.shopsGroup = new THREE.Group();
    this.scene.add(this.shopsGroup);

    for (const shop of this.shops) {
      // Геометрия прямоугольного параллелепипеда
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

      // Текстовая подпись (WebGL Sprite)
      const sprite = createShopLabelSprite(shop);
      mesh.add(sprite);
      // Спрайт в локальных координатах меша над его верхом
      sprite.position.set(0, shop.height / 2 + 0.6, 0);

      this.shopsGroup.add(mesh);
      this.shopMeshes.push(mesh);
    }
  }

  /**
   * Плавное переключение между 2D и 3D режимами
   */
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
      : new THREE.Vector3(0, 80, 0.001);

    const startTime = performance.now();
    const duration = 800; // 0.8 секунды на анимацию

    // Если переходим в 3D, сразу делаем активной перспективную камеру для плавного полета
    if (targetMode === '3D') {
      this.perspCamera.position.copy(startPos);
      this.activeCamera = this.perspCamera;
      this.controls.object = this.perspCamera;
      this.controls.enableRotate = true;
    }

    const animateTransition = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Плавное ускорение и замедление (easeInOutCubic)
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Интерполяция позиции камеры и точки фокуса
      this.activeCamera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);

      // Интерполяция высоты объектов
      const currentScaleY = THREE.MathUtils.lerp(startScaleY, endScaleY, ease);
      for (const mesh of this.shopMeshes) {
        mesh.scale.y = currentScaleY;
        mesh.position.y = (mesh.userData.shop.height * currentScaleY) / 2;
      }

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        // Завершение анимации
        this.mode = targetMode;
        this.isTransitioning = false;

        if (this.mode === '2D') {
          // В 2D переключаем на ортографическую камеру и блокируем наклон
          this.activeCamera = this.orthoCamera;
          this.controls.object = this.orthoCamera;
          this.controls.enableRotate = false;
        } else {
          this.controls.enableRotate = true;
        }
      }
    };

    requestAnimationFrame(animateTransition);
  }

  _bindEvents() {
    window.addEventListener('resize', this._onResize.bind(this));

    // Мышь для Raycaster
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

    // Клик по объекту
    let pointerDownPos = { x: 0, y: 0 };
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      // Проверяем, что это был именно клик, а не вращение камеры
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
        // Подсветка при наведении (emissive свечение)
        if (hitMesh !== this.selectedMesh) {
          hitMesh.material.emissive.setHex(0x38bdf8);
          hitMesh.material.emissiveIntensity = 0.4;
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

  /**
   * Выделение магазина
   */
  selectShop(shop) {
    const targetMesh = this.shopMeshes.find(m => m.userData.shop.id === shop.id);
    if (!targetMesh) return;

    // Сбрасываем предыдущий выбранный
    if (this.selectedMesh) {
      this.selectedMesh.material.emissive.setHex(0x000000);
      this.selectedMesh.material.emissiveIntensity = 0;
    }

    this.selectedMesh = targetMesh;

    // Подсветка выбранного объекта ярким неоновым цветом
    this.selectedMesh.material.emissive.setHex(0x00f0ff);
    this.selectedMesh.material.emissiveIntensity = 0.65;

    // ТРЕБОВАНИЕ ТЗ: При клике на объект в консоль выводится ID, Name, позиция
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

  /**
   * Фокусировка камеры на магазине
   */
  focusOnShop(shop) {
    this.controls.target.set(shop.x, 0, shop.z);
    if (this.mode === '3D') {
      this.activeCamera.position.set(shop.x, 25, shop.z + 30);
    } else {
      this.activeCamera.position.set(shop.x, 75, shop.z + 0.001);
    }
  }

  /**
   * Основной цикл отрисовки
   */
  render() {
    // Raycaster проверяется только при движении мыши (максимум 1 раз за кадр)
    if (this.mouseMoved) {
      this._checkHover();
      this.mouseMoved = false;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.activeCamera);
  }
}
