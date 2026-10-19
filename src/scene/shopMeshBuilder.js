import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Builds 3D cuboid meshes for all 100 shopping units.
 * Supports smooth height scaling between 3D (height=2.0) and 2D (height=0.08).
 */
export class ShopMeshBuilder {
  /**
   * @param {THREE.Scene} scene
   * @param {Array<Object>} placedShops
   */
  constructor(scene, placedShops) {
    this.scene = scene;
    this.placedShops = placedShops;

    this.group = new THREE.Group();
    this.group.name = 'ShopsGroup';
    this.scene.add(this.group);

    /** @type {Map<string, { mesh: THREE.Mesh, edges: THREE.LineSegments, initialColor: number, originalY: number }>} */
    this.meshMap = new Map();
    /** @type {Array<THREE.Mesh>} */
    this.interactiveMeshes = [];

    this._buildMeshes();
  }

  _buildMeshes() {
    const baseHeight = CONFIG.SHOP_HEIGHT_3D;

    for (const shop of this.placedShops) {
      // 1. Box Geometry for shop cuboid
      const geometry = new THREE.BoxGeometry(shop.width, baseHeight, shop.depth);

      // 2. Material with custom shop color
      const material = new THREE.MeshStandardMaterial({
        color: shop.color,
        roughness: 0.45,
        metalness: 0.12,
        emissive: 0x000000,
        emissiveIntensity: 0
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(shop.x, baseHeight / 2, shop.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Attach data reference for Raycaster
      mesh.userData = {
        isShop: true,
        shopId: shop.id,
        shopData: shop
      };

      // 3. Crisp architectural edges
      const edgesGeo = new THREE.EdgesGeometry(geometry);
      const edgesMat = new THREE.LineBasicMaterial({
        color: CONFIG.COLORS.SHOP_EDGE,
        transparent: true,
        opacity: CONFIG.COLORS.SHOP_EDGE_OPACITY
      });
      const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edgesMesh);

      this.group.add(mesh);
      this.interactiveMeshes.push(mesh);

      this.meshMap.set(shop.id, {
        mesh,
        edges: edgesMesh,
        initialColor: shop.color,
        originalHeight: baseHeight
      });
    }
  }

  /**
   * Sets height of all shops (animates scale.y and position.y).
   *
   * @param {number} currentHeight - Current height between SHOP_HEIGHT_2D and SHOP_HEIGHT_3D
   */
  setHeight(currentHeight) {
    const scaleY = currentHeight / CONFIG.SHOP_HEIGHT_3D;
    const posY = currentHeight / 2;

    for (const [, item] of this.meshMap.entries()) {
      item.mesh.scale.y = scaleY;
      item.mesh.position.y = posY;
    }
  }

  /**
   * Highlights a shop on hover by modifying emissive color
   */
  setHoverHighlight(shopId, isHovered) {
    const item = this.meshMap.get(shopId);
    if (!item) return;

    if (isHovered) {
      item.mesh.material.emissive.setHex(CONFIG.COLORS.HOVER_EMISSIVE);
      item.mesh.material.emissiveIntensity = 0.4;
    } else {
      item.mesh.material.emissive.setHex(0x000000);
      item.mesh.material.emissiveIntensity = 0;
    }
  }

  /**
   * Returns list of meshes for Raycaster raycasting
   * @returns {THREE.Mesh[]}
   */
  getInteractiveMeshes() {
    return this.interactiveMeshes;
  }

  /**
   * Returns shop mesh by ID
   */
  getMeshById(shopId) {
    return this.meshMap.get(shopId)?.mesh || null;
  }
}
