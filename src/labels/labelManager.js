import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CanvasTextGenerator } from './canvasText.js';
import { CONFIG } from '../config.js';

/**
 * Manages all text labels for the 100 shopping units.
 * Supports:
 * - CSS2D HTML Billboard Badges (interactive, crisp DOM badges)
 * - Canvas Sprites (pure WebGL billboards)
 * - Flat Roof Plane Labels (architectural floor plan text)
 */
export class LabelManager {
  /**
   * @param {THREE.Scene} scene
   * @param {Array<Object>} placedShops
   */
  constructor(scene, placedShops) {
    this.scene = scene;
    this.placedShops = placedShops;

    // Groups
    this.css2dGroup = new THREE.Group();
    this.css2dGroup.name = 'CSS2D_Labels_Group';
    this.scene.add(this.css2dGroup);

    this.spriteGroup = new THREE.Group();
    this.spriteGroup.name = 'Sprites_Group';
    this.spriteGroup.visible = false; // default off in favor of CSS2D
    this.scene.add(this.spriteGroup);

    this.roofGroup = new THREE.Group();
    this.roofGroup.name = 'Roof_Labels_Group';
    this.scene.add(this.roofGroup);

    /** @type {Map<string, { css2d: CSS2DObject, element: HTMLElement, sprite?: THREE.Sprite, roofMesh?: THREE.Mesh }>} */
    this.labelMap = new Map();

    this.activeMode = 'css2d'; // 'css2d' | 'roof' | 'sprite' | 'both'

    this._createLabels();
  }

  _createLabels() {
    for (const shop of this.placedShops) {
      // 1. Create CSS2D DOM Label Object
      const element = document.createElement('div');
      element.className = 'mall-shop-label';
      element.dataset.shopId = shop.id;

      // Color accent border indicator
      element.style.setProperty('--shop-color', shop.colorHex);

      element.innerHTML = `
        <span class="mall-label-icon">${shop.categoryIcon}</span>
        <span class="mall-label-name" title="${this._escapeHtml(shop.name)}">${this._escapeHtml(shop.name)}</span>
      `;

      const css2dObj = new CSS2DObject(element);
      css2dObj.position.set(shop.x, CONFIG.SHOP_HEIGHT_3D + 0.35, shop.z);
      this.css2dGroup.add(css2dObj);

      // 2. Create Flat Roof Texture Label (parallel to XZ floor plan)
      const roofTex = CanvasTextGenerator.createRoofLabelTexture(shop);
      let roofMesh = null;
      if (roofTex) {
        const roofGeo = new THREE.PlaneGeometry(shop.width * 0.95, shop.depth * 0.95);
        const roofMat = new THREE.MeshBasicMaterial({
          map: roofTex,
          transparent: true,
          opacity: 0.92,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });
        roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.rotation.x = -Math.PI / 2;
        roofMesh.position.set(shop.x, CONFIG.SHOP_HEIGHT_3D + 0.015, shop.z);
        roofMesh.name = `RoofLabel_${shop.id}`;
        this.roofGroup.add(roofMesh);
      }

      // 3. Create WebGL Canvas Sprite (billboard)
      const spriteTex = CanvasTextGenerator.createSpriteBadgeTexture(shop);
      let sprite = null;
      if (spriteTex) {
        const spriteMat = new THREE.SpriteMaterial({
          map: spriteTex,
          transparent: true,
          depthTest: false
        });
        sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(shop.x, CONFIG.SHOP_HEIGHT_3D + 1.2, shop.z);
        // Scale sprite proportional to shop width
        const aspect = 512 / 140;
        const spriteHeight = Math.min(2.0, shop.width * 0.4);
        sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);
        this.spriteGroup.add(sprite);
      }

      this.labelMap.set(shop.id, {
        css2d: css2dObj,
        element,
        sprite,
        roofMesh
      });
    }
  }

  /**
   * Updates vertical Y position of labels when transitioning between 3D and 2D.
   *
   * @param {number} currentHeight - Current interpolated height of shops (between SHOP_HEIGHT_2D and SHOP_HEIGHT_3D)
   * @param {boolean} is2D - Whether target mode is 2D
   */
  updateHeight(currentHeight, is2D = false) {
    for (const [id, item] of this.labelMap.entries()) {
      const shop = this.placedShops.find(s => s.id === id);
      if (!shop) continue;

      if (item.css2d) {
        item.css2d.position.y = currentHeight + (is2D ? 0.2 : 0.35);
      }
      if (item.roofMesh) {
        item.roofMesh.position.y = currentHeight + 0.015;
      }
      if (item.sprite) {
        item.sprite.position.y = currentHeight + (is2D ? 0.5 : 1.2);
      }
    }
  }

  /**
   * Sets active display mode for labels:
   * 'css2d' | 'roof' | 'sprite' | 'both'
   */
  setMode(mode) {
    this.activeMode = mode;
    this.css2dGroup.visible = (mode === 'css2d' || mode === 'both');
    this.roofGroup.visible = (mode === 'roof' || mode === 'both');
    this.spriteGroup.visible = (mode === 'sprite');

    // Also toggle CSS container visibility
    const cssContainer = document.querySelector('.mall-labels-container');
    if (cssContainer) {
      cssContainer.style.display = this.css2dGroup.visible ? 'block' : 'none';
    }
  }

  /**
   * Highlights label corresponding to a shop on hover
   */
  setHovered(shopId, isHovered) {
    const item = this.labelMap.get(shopId);
    if (!item) return;

    if (item.element) {
      if (isHovered) {
        item.element.classList.add('is-hovered');
      } else {
        item.element.classList.remove('is-hovered');
      }
    }
  }

  /**
   * Sets selected visual state on label
   */
  setSelected(shopId, isSelected) {
    for (const [id, item] of this.labelMap.entries()) {
      if (item.element) {
        if (id === shopId && isSelected) {
          item.element.classList.add('is-selected');
        } else {
          item.element.classList.remove('is-selected');
        }
      }
    }
  }

  _escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
}
