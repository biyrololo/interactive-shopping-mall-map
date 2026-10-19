import * as THREE from 'three';
import { CONFIG } from './config.js';
import { generatePlacesData } from './data/placesData.js';
import { packShops } from './layout/packer.js';
import { SpatialIndex } from './data/spatialIndex.js';
import { FloorPlan } from './layout/floorPlan.js';
import { SceneManager } from './scene/sceneManager.js';
import { ShopMeshBuilder } from './scene/shopMeshBuilder.js';
import { SelectionOutline } from './interaction/selectionOutline.js';
import { LabelManager } from './labels/labelManager.js';
import { CameraManager } from './scene/cameraManager.js';
import { InteractionManager } from './interaction/interactionManager.js';
import { UIController } from './ui/uiController.js';

/**
 * Main Application Orchestrator
 */
class MallApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    this._init();
  }

  _init() {
    console.log('🚀 Initializing WebGL Shopping Mall Floor Plan (100 objects)...');

    // 1. Generate 100 shop data records
    const rawPlaces = generatePlacesData(CONFIG.TOTAL_SHOPS);
    console.log(`📦 Generated ${rawPlaces.length} shop records.`);

    // 2. Pack shops into non-overlapping architectural layout
    const layout = packShops(rawPlaces);
    this.placedShops = layout.shops;
    this.bounds = layout.bounds;
    this.floorBounds = layout.floorBounds;
    this.aisles = layout.aisles;

    // 3. Build spatial index for O(1) lookups and search
    this.spatialIndex = new SpatialIndex(8);
    this.spatialIndex.build(this.placedShops);

    // 4. Initialize Three.js Scene, Renderer & Lights
    this.sceneManager = new SceneManager(this.container);
    const scene = this.sceneManager.getScene();
    const domElement = this.sceneManager.getDomElement();

    // 5. Build Floor Baseplate, Corridors & Grid
    this.floorPlan = new FloorPlan(this.floorBounds, this.aisles);
    scene.add(this.floorPlan.getGroup());

    // 6. Build 3D Shop Cuboids
    this.shopMeshBuilder = new ShopMeshBuilder(scene, this.placedShops);

    // 7. Visual Selection Outline
    this.selectionOutline = new SelectionOutline(scene);

    // 8. Text Labels Manager (CSS2D & Canvas Sprites & Roof Text)
    this.labelManager = new LabelManager(scene, this.placedShops);

    // 9. Camera Manager (Dual cameras & smooth 2D/3D transitions)
    this.cameraManager = new CameraManager(
      domElement,
      window.innerWidth,
      window.innerHeight,
      this.bounds
    );

    // Hook height updates during 2D/3D transition
    this.cameraManager.onHeightUpdate = (currentHeight, is2D) => {
      this.shopMeshBuilder.setHeight(currentHeight);
      this.labelManager.updateHeight(currentHeight, is2D);
      this.selectionOutline.updateHeight(currentHeight);
    };

    // 10. Interaction Manager (Raycasting, hover, click selection)
    this.interactionManager = new InteractionManager(
      domElement,
      this.cameraManager,
      this.shopMeshBuilder,
      this.labelManager,
      this.selectionOutline
    );

    // 11. UI Controller (Vanilla JS controls, search, info card, modal)
    this.uiController = new UIController({
      cameraManager: this.cameraManager,
      labelManager: this.labelManager,
      interactionManager: this.interactionManager,
      spatialIndex: this.spatialIndex,
      totalShops: this.placedShops.length
    });

    // 12. Window Resize Handler
    window.addEventListener('resize', this._onResize.bind(this));

    // 13. Select first shop by default for great initial UX
    const firstShop = this.spatialIndex.getById('shop_001');
    if (firstShop) {
      setTimeout(() => {
        this.interactionManager.selectShop(firstShop);
      }, 500);
    }

    console.log('✨ Mall Map initialized successfully!');

    // 14. Start Render Loop
    this._animate();
  }

  _onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.sceneManager.onResize(width, height);
    this.cameraManager.onResize(width, height);
  }

  _animate() {
    requestAnimationFrame(this._animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Update camera transitions & controls
    this.cameraManager.update(delta);

    // Update selection outline pulse effect
    this.selectionOutline.update(elapsedTime);

    // Render WebGL & CSS2D scenes
    const activeCamera = this.cameraManager.getActiveCamera();
    this.sceneManager.render(activeCamera);
  }
}

// Bootstrap application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new MallApp();
});
