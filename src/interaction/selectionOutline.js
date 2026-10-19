import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Visual selection highlight: High-contrast glowing cyan outline around selected shop.
 */
export class SelectionOutline {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'SelectionOutlineGroup';
    this.group.visible = false;
    this.scene.add(this.group);

    this.selectedShop = null;
    this._initOutlineMesh();
  }

  _initOutlineMesh() {
    // Top perimeter glowing outline
    const baseGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      color: CONFIG.COLORS.SELECTION_OUTLINE,
      linewidth: 3,
      transparent: true,
      opacity: 0.95
    });

    this.outlineLine = new THREE.LineLoop(baseGeo, lineMat);
    this.group.add(this.outlineLine);

    // Floor highlight plane with subtle cyan glow
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const planeMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLORS.SELECTION_FILL,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    this.glowPlane = new THREE.Mesh(planeGeo, planeMat);
    this.glowPlane.rotation.x = -Math.PI / 2;
    this.group.add(this.glowPlane);
  }

  /**
   * Updates outline bounds and position to match selected shop.
   *
   * @param {Object|null} shop - PlacedShop object
   * @param {number} currentHeight - Current shop height
   */
  select(shop, currentHeight = CONFIG.SHOP_HEIGHT_3D) {
    this.selectedShop = shop;

    if (!shop) {
      this.group.visible = false;
      return;
    }

    const pad = 0.12; // Slight expansion outside shop walls
    const w = shop.width + pad * 2;
    const d = shop.depth + pad * 2;
    const halfW = w / 2;
    const halfD = d / 2;
    const topY = currentHeight + 0.04;

    // Build 3D boundary line around top edge
    const points = [
      new THREE.Vector3(-halfW, topY, -halfD),
      new THREE.Vector3(halfW, topY, -halfD),
      new THREE.Vector3(halfW, topY, halfD),
      new THREE.Vector3(-halfW, topY, halfD)
    ];

    this.outlineLine.geometry.dispose();
    this.outlineLine.geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Adjust bottom glow plane
    this.glowPlane.scale.set(w, d, 1);
    this.glowPlane.position.set(0, 0.02, 0);

    this.group.position.set(shop.x, 0, shop.z);
    this.group.visible = true;
  }

  /**
   * Updates vertical height of selection outline during 2D/3D transitions.
   */
  updateHeight(currentHeight) {
    if (this.selectedShop) {
      this.select(this.selectedShop, currentHeight);
    }
  }

  /**
   * Called on animation loop for gentle glowing pulse.
   */
  update(elapsedTime) {
    if (!this.group.visible) return;
    const pulse = 0.8 + 0.2 * Math.sin(elapsedTime * 4.5);
    if (this.outlineLine.material) {
      this.outlineLine.material.opacity = pulse;
    }
  }

  clear() {
    this.selectedShop = null;
    this.group.visible = false;
  }
}
