import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config.js';

/**
 * Manages dual cameras (Perspective 3D & Orthographic 2D), OrbitControls,
 * and smooth transitions between 2D and 3D modes.
 */
export class CameraManager {
  /**
   * @param {HTMLElement} domElement - Renderer DOM element
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   * @param {Object} bounds - Mall floor bounds for optimal initial framing
   */
  constructor(domElement, width, height, bounds) {
    this.domElement = domElement;
    this.width = width;
    this.height = height;
    this.bounds = bounds;

    this.mode = '3D'; // '3D' | '2D'
    this.isTransitioning = false;
    this.transitionProgress = 0;

    // Transition state
    this.transitionStart = {
      pos: new THREE.Vector3(),
      target: new THREE.Vector3(),
      height: CONFIG.SHOP_HEIGHT_3D
    };
    this.transitionEnd = {
      pos: new THREE.Vector3(),
      target: new THREE.Vector3(),
      height: CONFIG.SHOP_HEIGHT_3D
    };
    this.transitionDuration = CONFIG.TRANSITION_DURATION;
    this.transitionTimeElapsed = 0;

    // Callbacks for height animation hooks
    this.onHeightUpdate = null; // (currentHeight, is2D) => void
    this.onTransitionComplete = null; // (mode) => void

    this._initCameras();
    this._initControls();
  }

  _initCameras() {
    const aspect = this.width / this.height;

    // 1. Perspective Camera for 3D Mode
    const pCfg = CONFIG.CAMERA.PERSPECTIVE;
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      pCfg.fov,
      aspect,
      pCfg.near,
      pCfg.far
    );
    this.perspectiveCamera.position.set(pCfg.position.x, pCfg.position.y, pCfg.position.z);

    // 2. Orthographic Camera for 2D Floor Plan Mode
    this.frustumHeight = CONFIG.CAMERA.ORTHOGRAPHIC.frustumSize;
    this.frustumWidth = this.frustumHeight * aspect;

    this.orthographicCamera = new THREE.OrthographicCamera(
      -this.frustumWidth / 2,
      this.frustumWidth / 2,
      this.frustumHeight / 2,
      -this.frustumHeight / 2,
      CONFIG.CAMERA.ORTHOGRAPHIC.near,
      CONFIG.CAMERA.ORTHOGRAPHIC.far
    );
    this.orthographicCamera.position.set(
      CONFIG.CAMERA.ORTHOGRAPHIC.position.x,
      CONFIG.CAMERA.ORTHOGRAPHIC.position.y,
      CONFIG.CAMERA.ORTHOGRAPHIC.position.z
    );

    // Active camera starts as Perspective
    this.activeCamera = this.perspectiveCamera;
  }

  _initControls() {
    this.controls = new OrbitControls(this.activeCamera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below floor in 3D
    this.controls.minDistance = 10;
    this.controls.maxDistance = 250;
    this.controls.target.set(0, 0, 0);
  }

  /**
   * Toggles between 2D and 3D mode with smooth transition
   */
  toggleMode() {
    if (this.isTransitioning) return;
    const nextMode = this.mode === '3D' ? '2D' : '3D';
    this.setMode(nextMode);
  }

  /**
   * Triggers smooth animation to desired mode ('2D' or '3D')
   *
   * @param {'2D'|'3D'} targetMode
   */
  setMode(targetMode) {
    if (targetMode === this.mode && !this.isTransitioning) return;

    this.isTransitioning = true;
    this.targetMode = targetMode;
    this.transitionTimeElapsed = 0;

    // Record starting coordinates
    this.transitionStart.pos.copy(this.activeCamera.position);
    this.transitionStart.target.copy(this.controls.target);
    this.transitionStart.height = (this.mode === '3D') ? CONFIG.SHOP_HEIGHT_3D : CONFIG.SHOP_HEIGHT_2D;

    if (targetMode === '2D') {
      // 3D -> 2D Target
      // Camera moves to top-down view directly above the current target (or origin)
      const topHeight = 85;
      this.transitionEnd.pos.set(this.controls.target.x, topHeight, this.controls.target.z + 0.001);
      this.transitionEnd.target.set(this.controls.target.x, 0, this.controls.target.z);
      this.transitionEnd.height = CONFIG.SHOP_HEIGHT_2D;
    } else {
      // 2D -> 3D Target
      // Switch active camera to perspective right away for seamless flight back
      this._switchToPerspective();
      const pCfg = CONFIG.CAMERA.PERSPECTIVE;
      this.transitionEnd.pos.set(pCfg.position.x, pCfg.position.y, pCfg.position.z);
      this.transitionEnd.target.set(0, 0, 0);
      this.transitionEnd.height = CONFIG.SHOP_HEIGHT_3D;
    }
  }

  _switchToPerspective() {
    this.perspectiveCamera.position.copy(this.activeCamera.position);
    this.perspectiveCamera.updateProjectionMatrix();

    this.activeCamera = this.perspectiveCamera;
    this.controls.object = this.perspectiveCamera;
    this.controls.enableRotate = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minPolarAngle = 0;
  }

  _switchToOrthographic() {
    // Match orthographic zoom to current perspective view
    this.orthographicCamera.position.copy(this.perspectiveCamera.position);
    this.orthographicCamera.lookAt(this.controls.target);
    this.orthographicCamera.updateProjectionMatrix();

    this.activeCamera = this.orthographicCamera;
    this.controls.object = this.orthographicCamera;
    // In 2D floor plan mode, lock rotation so it stays strictly top-down
    this.controls.enableRotate = false;
  }

  /**
   * Smoothly animates camera focus to a specific shop's coordinates
   *
   * @param {Object} shop
   */
  focusOnShop(shop) {
    if (this.isTransitioning) return;

    this.isTransitioning = true;
    this.targetMode = this.mode;
    this.transitionTimeElapsed = 0;
    this.transitionDuration = 0.8; // quick snap

    this.transitionStart.pos.copy(this.activeCamera.position);
    this.transitionStart.target.copy(this.controls.target);
    this.transitionStart.height = (this.mode === '3D') ? CONFIG.SHOP_HEIGHT_3D : CONFIG.SHOP_HEIGHT_2D;

    if (this.mode === '3D') {
      this.transitionEnd.pos.set(shop.x, 28, shop.z + 32);
      this.transitionEnd.target.set(shop.x, 0, shop.z);
    } else {
      this.transitionEnd.pos.set(shop.x, 80, shop.z + 0.001);
      this.transitionEnd.target.set(shop.x, 0, shop.z);
    }
    this.transitionEnd.height = this.transitionStart.height;
  }

  /**
   * Cubic ease-in-out curve
   */
  _easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Per-frame animation update
   * @param {number} delta - Delta time in seconds
   */
  update(delta) {
    if (this.isTransitioning) {
      this.transitionTimeElapsed += delta;
      const rawT = Math.min(1, this.transitionTimeElapsed / this.transitionDuration);
      const easeT = this._easeInOutCubic(rawT);

      // Interpolate camera position & controls target
      this.activeCamera.position.lerpVectors(
        this.transitionStart.pos,
        this.transitionEnd.pos,
        easeT
      );
      this.controls.target.lerpVectors(
        this.transitionStart.target,
        this.transitionEnd.target,
        easeT
      );

      // Interpolate mesh heights
      const currentHeight = THREE.MathUtils.lerp(
        this.transitionStart.height,
        this.transitionEnd.height,
        easeT
      );

      if (this.onHeightUpdate) {
        this.onHeightUpdate(currentHeight, this.targetMode === '2D');
      }

      // Check for completion
      if (rawT >= 1) {
        this.isTransitioning = false;
        this.mode = this.targetMode;
        this.transitionDuration = CONFIG.TRANSITION_DURATION; // reset default duration

        if (this.mode === '2D') {
          this._switchToOrthographic();
        } else {
          this._switchToPerspective();
        }

        if (this.onTransitionComplete) {
          this.onTransitionComplete(this.mode);
        }
      }
    }

    this.controls.update();
  }

  /**
   * Window resize handler
   */
  onResize(width, height) {
    this.width = width;
    this.height = height;
    const aspect = width / height;

    // Update Perspective Camera
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    // Update Orthographic Camera
    this.frustumWidth = this.frustumHeight * aspect;
    this.orthographicCamera.left = -this.frustumWidth / 2;
    this.orthographicCamera.right = this.frustumWidth / 2;
    this.orthographicCamera.top = this.frustumHeight / 2;
    this.orthographicCamera.bottom = -this.frustumHeight / 2;
    this.orthographicCamera.updateProjectionMatrix();
  }

  getActiveCamera() {
    return this.activeCamera;
  }

  getMode() {
    return this.mode;
  }
}
