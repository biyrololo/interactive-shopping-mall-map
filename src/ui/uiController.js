/**
 * Pure Vanilla JavaScript UI Controller
 * Zero external frameworks (No React, Vue, Angular, Svelte)
 */
export class UIController {
  /**
   * @param {Object} options
   * @param {import('../scene/cameraManager.js').CameraManager} options.cameraManager
   * @param {import('../labels/labelManager.js').LabelManager} options.labelManager
   * @param {import('../interaction/interactionManager.js').InteractionManager} options.interactionManager
   * @param {import('../data/spatialIndex.js').SpatialIndex} options.spatialIndex
   * @param {number} options.totalShops
   */
  constructor(options) {
    this.cameraManager = options.cameraManager;
    this.labelManager = options.labelManager;
    this.interactionManager = options.interactionManager;
    this.spatialIndex = options.spatialIndex;
    this.totalShops = options.totalShops;

    this._cacheElements();
    this._bindEvents();
    this._bindCameraEvents();
    this._bindInteractionEvents();
  }

  _cacheElements() {
    this.btn3D = document.getElementById('btn-mode-3d');
    this.btn2D = document.getElementById('btn-mode-2d');
    this.labelSelect = document.getElementById('label-mode-select');
    this.searchInput = document.getElementById('shop-search-input');
    this.searchResults = document.getElementById('search-results');
    this.infoCard = document.getElementById('shop-info-card');
    this.infoCardName = document.getElementById('card-shop-name');
    this.infoCardCategory = document.getElementById('card-shop-category');
    this.infoCardIcon = document.getElementById('card-category-icon');
    this.infoCardId = document.getElementById('card-shop-id');
    this.infoCardPos = document.getElementById('card-shop-pos');
    this.infoCardSize = document.getElementById('card-shop-size');
    this.infoCardFocusBtn = document.getElementById('card-focus-btn');
    this.infoCardCloseBtn = document.getElementById('card-close-btn');

    this.docsBtn = document.getElementById('btn-open-docs');
    this.docsModal = document.getElementById('docs-modal');
    this.docsCloseBtn = document.getElementById('btn-close-docs');
  }

  _bindEvents() {
    // Mode toggles
    this.btn3D.addEventListener('click', () => {
      this.cameraManager.setMode('3D');
    });

    this.btn2D.addEventListener('click', () => {
      this.cameraManager.setMode('2D');
    });

    // Label Mode Selector
    if (this.labelSelect) {
      this.labelSelect.addEventListener('change', (e) => {
        this.labelManager.setMode(e.target.value);
      });
    }

    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this._handleSearch(e.target.value);
      });

      this.searchInput.addEventListener('focus', (e) => {
        if (e.target.value.trim()) {
          this._handleSearch(e.target.value);
        }
      });

      // Close search results on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
          this.searchResults.style.display = 'none';
        }
      });
    }

    // Info card close & focus buttons
    if (this.infoCardCloseBtn) {
      this.infoCardCloseBtn.addEventListener('click', () => {
        this.interactionManager.deselect();
      });
    }

    if (this.infoCardFocusBtn) {
      this.infoCardFocusBtn.addEventListener('click', () => {
        const selected = this.interactionManager.getSelectedShop();
        if (selected) {
          this.cameraManager.focusOnShop(selected);
        }
      });
    }

    // Docs modal open/close
    if (this.docsBtn && this.docsModal) {
      this.docsBtn.addEventListener('click', () => {
        this.docsModal.classList.add('open');
      });

      this.docsCloseBtn?.addEventListener('click', () => {
        this.docsModal.classList.remove('open');
      });

      this.docsModal.addEventListener('click', (e) => {
        if (e.target === this.docsModal) {
          this.docsModal.classList.remove('open');
        }
      });
    }
  }

  _bindCameraEvents() {
    this.cameraManager.onTransitionComplete = (mode) => {
      this.updateModeUI(mode);
    };
  }

  _bindInteractionEvents() {
    this.interactionManager.onShopSelect = (shop) => {
      this.showShopInfo(shop);
    };
  }

  updateModeUI(mode) {
    if (mode === '3D') {
      this.btn3D.classList.add('active');
      this.btn2D.classList.remove('active');
    } else {
      this.btn2D.classList.add('active');
      this.btn3D.classList.remove('active');
    }
  }

  _handleSearch(query) {
    if (!query || !query.trim()) {
      this.searchResults.style.display = 'none';
      this.searchResults.innerHTML = '';
      return;
    }

    const matches = this.spatialIndex.search(query).slice(0, 8); // Top 8 matches

    if (matches.length === 0) {
      this.searchResults.innerHTML = `
        <div style="padding: 10px; font-size: 12px; color: #94a3b8; text-align: center;">
          Объекты не найдены
        </div>
      `;
      this.searchResults.style.display = 'block';
      return;
    }

    this.searchResults.innerHTML = matches.map(s => `
      <div class="search-result-item" data-id="${s.id}">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <span>${s.categoryIcon}</span>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name}</span>
        </div>
        <span class="search-result-id">${s.id}</span>
      </div>
    `).join('');

    this.searchResults.style.display = 'block';

    // Click handler for search items
    this.searchResults.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const shop = this.spatialIndex.getById(id);
        if (shop) {
          this.interactionManager.selectShop(shop);
          this.cameraManager.focusOnShop(shop);
          this.searchResults.style.display = 'none';
          this.searchInput.value = shop.name;
        }
      });
    });
  }

  showShopInfo(shop) {
    if (!shop) {
      this.infoCard.classList.remove('visible');
      return;
    }

    this.infoCardName.textContent = shop.name;
    this.infoCardName.title = shop.name;
    this.infoCardCategory.textContent = shop.category;
    this.infoCardIcon.textContent = shop.categoryIcon;
    this.infoCardId.textContent = shop.id;
    this.infoCardPos.textContent = `X: ${shop.x.toFixed(1)}, Z: ${shop.z.toFixed(1)}`;
    this.infoCardSize.textContent = `${shop.width} × ${shop.depth} м`;

    this.infoCard.classList.add('visible');
  }
}
