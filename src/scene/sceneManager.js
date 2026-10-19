import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG } from '../config.js';

/**
 * Manages the Three.js Scene, WebGLRenderer, CSS2DRenderer, and lighting.
 */
export class SceneManager {
  /**
   * @param {HTMLElement} container - DOM container element
   */
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    this._initScene();
    this._initRenderers();
    this._initLighting();
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.COLORS.BACKGROUND);
    // Subtle fog for depth in 3D
    this.scene.fog = new THREE.FogExp2(CONFIG.COLORS.BACKGROUND, 0.004);
  }

  _initRenderers() {
    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // 2. CSS2D Renderer for HTML billboarding text labels
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(this.width, this.height);
    this.css2dRenderer.domElement.className = 'mall-labels-container';
    this.css2dRenderer.domElement.style.position = 'absolute';
    this.css2dRenderer.domElement.style.top = '0';
    this.css2dRenderer.domElement.style.left = '0';
    this.css2dRenderer.domElement.style.pointerEvents = 'none';

    this.container.appendChild(this.css2dRenderer.domElement);
  }

  _initLighting() {
    // 1. Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // 2. Hemisphere Light for soft architectural sky/ground contrast
    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x0f172a, 0.4);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // 3. Directional Sun Light with shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(40, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.radius = 2.5;

    this.scene.add(dirLight);
    this.dirLight = dirLight;
  }

  /**
   * Renders a frame using the active camera
   * @param {THREE.Camera} camera
   */
  render(camera) {
    this.renderer.render(this.scene, camera);
    this.css2dRenderer.render(this.scene, camera);
  }

  /**
   * Handles viewport resize
   * @param {number} width
   * @param {number} height
   */
  onResize(width, height) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.css2dRenderer.setSize(width, height);
  }

  getScene() {
    return this.scene;
  }

  getDomElement() {
    return this.renderer.domElement;
  }
}
