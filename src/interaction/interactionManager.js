import * as THREE from 'three';

/**
 * Handles mouse / pointer interactions:
 * - Raycasting
 * - Hover highlight
 * - Click selection with console logging (ID, Name, position)
 * - Keyboard shortcuts (Space: toggle 2D/3D, Esc: deselect)
 */
export class InteractionManager {
  /**
   * @param {HTMLElement} domElement
   * @param {import('../scene/cameraManager.js').CameraManager} cameraManager
   * @param {import('../scene/shopMeshBuilder.js').ShopMeshBuilder} meshBuilder
   * @param {import('../labels/labelManager.js').LabelManager} labelManager
   * @param {import('./selectionOutline.js').SelectionOutline} selectionOutline
   */
  constructor(domElement, cameraManager, meshBuilder, labelManager, selectionOutline) {
    this.domElement = domElement;
    this.cameraManager = cameraManager;
    this.meshBuilder = meshBuilder;
    this.labelManager = labelManager;
    this.selectionOutline = selectionOutline;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1000, -1000);

    this.hoveredShopId = null;
    this.selectedShop = null;

    // Track drag to prevent accidental click on pan/orbit
    this.pointerDownPos = { x: 0, y: 0 };
    this.isDragging = false;

    // Event callbacks
    this.onShopSelect = null; // (shopData | null) => void
    this.onShopHover = null;  // (shopData | null) => void

    this._bindEvents();
  }

  _bindEvents() {
    this.domElement.addEventListener('pointermove', this._onPointerMove.bind(this));
    this.domElement.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this.domElement.addEventListener('pointerup', this._onPointerUp.bind(this));
    this.domElement.addEventListener('pointerleave', this._onPointerLeave.bind(this));

    window.addEventListener('keydown', this._onKeyDown.bind(this));
  }

  _updateMouseCoords(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onPointerMove(event) {
    this._updateMouseCoords(event);
    this._checkHover();
  }

  _onPointerDown(event) {
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
    this.isDragging = false;
  }

  _onPointerUp(event) {
    const dist = Math.hypot(
      event.clientX - this.pointerDownPos.x,
      event.clientY - this.pointerDownPos.y
    );

    // If movement is small, treat as click rather than orbit/pan drag
    if (dist < 6) {
      this._updateMouseCoords(event);
      this._checkClick();
    }
  }

  _onPointerLeave() {
    this.mouse.set(-1000, -1000);
    this._clearHover();
  }

  _checkHover() {
    const camera = this.cameraManager.getActiveCamera();
    this.raycaster.setFromCamera(this.mouse, camera);

    const meshes = this.meshBuilder.getInteractiveMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const topHit = intersects[0];
      const shopData = topHit.object.userData.shopData;

      if (this.hoveredShopId !== shopData.id) {
        this._clearHover();

        this.hoveredShopId = shopData.id;
        this.meshBuilder.setHoverHighlight(shopData.id, true);
        this.labelManager.setHovered(shopData.id, true);
        this.domElement.style.cursor = 'pointer';

        if (this.onShopHover) {
          this.onShopHover(shopData);
        }
      }
    } else {
      if (this.hoveredShopId !== null) {
        this._clearHover();
      }
    }
  }

  _clearHover() {
    if (this.hoveredShopId) {
      this.meshBuilder.setHoverHighlight(this.hoveredShopId, false);
      this.labelManager.setHovered(this.hoveredShopId, false);
      this.hoveredShopId = null;
      this.domElement.style.cursor = 'default';

      if (this.onShopHover) {
        this.onShopHover(null);
      }
    }
  }

  _checkClick() {
    const camera = this.cameraManager.getActiveCamera();
    this.raycaster.setFromCamera(this.mouse, camera);

    const meshes = this.meshBuilder.getInteractiveMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const topHit = intersects[0];
      const shopData = topHit.object.userData.shopData;
      this.selectShop(shopData);
    } else {
      // Clicked on empty space / floor
      this.deselect();
    }
  }

  /**
   * Programmatically or interactively selects a shop
   *
   * @param {Object} shopData
   */
  selectShop(shopData) {
    this.selectedShop = shopData;

    // Requirement 3: Log ID, Name, and Position to console
    console.log(
      `%c🏢 [SHOP SELECTED]%c ${shopData.name}`,
      'background: #0284c7; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      'color: #38bdf8; font-weight: bold;',
      {
        ID: shopData.id,
        Name: shopData.name,
        Position: {
          x: Number(shopData.x.toFixed(2)),
          y: Number(shopData.y.toFixed(2)),
          z: Number(shopData.z.toFixed(2))
        },
        Dimensions: {
          width: shopData.width,
          depth: shopData.depth,
          height: shopData.height
        },
        Category: shopData.category,
        Color: shopData.colorHex
      }
    );

    // Visual selection outline & label highlight
    const currentHeight = this.cameraManager.getMode() === '2D' ? 0.08 : 2.0;
    this.selectionOutline.select(shopData, currentHeight);
    this.labelManager.setSelected(shopData.id, true);

    if (this.onShopSelect) {
      this.onShopSelect(shopData);
    }
  }

  /**
   * Deselects current shop
   */
  deselect() {
    if (this.selectedShop) {
      this.selectedShop = null;
      this.selectionOutline.clear();
      this.labelManager.setSelected(null, false);

      if (this.onShopSelect) {
        this.onShopSelect(null);
      }
    }
  }

  _onKeyDown(event) {
    // Avoid triggering if user is typing in a search input
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.cameraManager.toggleMode();
    } else if (event.code === 'Escape') {
      this.deselect();
    } else if (event.code === 'KeyF' && this.selectedShop) {
      this.cameraManager.focusOnShop(this.selectedShop);
    }
  }

  getSelectedShop() {
    return this.selectedShop;
  }
}
