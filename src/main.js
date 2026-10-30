import { generatePlacesData } from './data.js';
import { packShops, checkCollisions } from './layout.js';
import { MallScene } from './scene.js';

// 1. Генерация 100 объектов по ТЗ
const rawShops = generatePlacesData(100);

// 2. Размещение на сетке XZ без пересечений
const layout = packShops(rawShops);

// 3. Проверка на пересечения
const collisions = checkCollisions(layout.shops);
if (collisions.length > 0) {
  console.warn(`Внимание: обнаружено ${collisions.length} пересечений!`, collisions);
} else {
  console.log(`✅ 100 магазинов успешно размещены без пересечений.`);
}

// 4. Инициализация сцены Three.js
const container = document.getElementById('canvas-container');
const infoCard = document.getElementById('shop-info-card');
const infoName = document.getElementById('card-shop-name');
const infoId = document.getElementById('card-shop-id');
const infoCat = document.getElementById('card-shop-category');
const infoSize = document.getElementById('card-shop-size');
const infoPos = document.getElementById('card-shop-pos');

let currentSelectedShop = null;

const mallScene = new MallScene(container, layout, (shop) => {
  currentSelectedShop = shop;
  if (!shop) {
    infoCard.classList.remove('visible');
    return;
  }
  infoName.textContent = shop.name;
  infoId.textContent = shop.id;
  infoCat.textContent = shop.category || 'Магазин';
  infoSize.textContent = `${shop.width} × ${shop.depth} м (высота ${shop.height} м)`;
  infoPos.textContent = `X: ${shop.x.toFixed(1)}, Z: ${shop.z.toFixed(1)}`;
  infoCard.classList.add('visible');
});

// 5. Кнопки переключения 2D / 3D
const btn3D = document.getElementById('btn-mode-3d');
const btn2D = document.getElementById('btn-mode-2d');

function updateModeButtons(mode) {
  if (mode === '3D') {
    btn3D.classList.add('active');
    btn2D.classList.remove('active');
  } else {
    btn2D.classList.add('active');
    btn3D.classList.remove('active');
  }
}

btn3D.addEventListener('click', () => {
  mallScene.setMode('3D');
  updateModeButtons('3D');
});

btn2D.addEventListener('click', () => {
  mallScene.setMode('2D');
  updateModeButtons('2D');
});

// Переключение по клавише Пробел
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    mallScene.toggleMode();
    updateModeButtons(mallScene.mode === '3D' ? '2D' : '3D');
  } else if (e.code === 'Escape') {
    mallScene.deselect();
  }
});

// Кнопки зума
document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
  mallScene.zoomIn();
});

document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
  mallScene.zoomOut();
});

// Кнопка переключения крупных/компактных названий
const btnToggleLabels = document.getElementById('btn-toggle-labels');
btnToggleLabels?.addEventListener('click', () => {
  const isLarge = mallScene.toggleLabels();
  if (isLarge) {
    btnToggleLabels.classList.remove('muted');
    btnToggleLabels.title = 'Скрыть крупные названия (сделать компактными)';
  } else {
    btnToggleLabels.classList.add('muted');
    btnToggleLabels.title = 'Показать крупные названия';
  }
});

// Кнопки карточки выбранного магазина
document.getElementById('card-close-btn')?.addEventListener('click', () => {
  mallScene.deselect();
});

document.getElementById('card-focus-btn')?.addEventListener('click', () => {
  if (currentSelectedShop) {
    mallScene.focusOnShop(currentSelectedShop);
  }
});

// Поиск магазина в стиле Яндекс Карт
const searchInput = document.getElementById('shop-search-input');
const searchDropdown = document.getElementById('search-results');

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      searchDropdown.style.display = 'none';
      return;
    }

    const matches = layout.shops
      .filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      .slice(0, 6);

    if (matches.length === 0) {
      searchDropdown.innerHTML = '<div class="search-empty">Магазин не найден</div>';
    } else {
      searchDropdown.innerHTML = matches.map(s => `
        <div class="search-item" data-id="${s.id}">
          <span>${s.name}</span>
          <span style="font-size: 11px; color: #64748b;">${s.id}</span>
        </div>
      `).join('');
    }
    searchDropdown.style.display = 'block';
  });

  searchDropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.search-item');
    if (!item) return;
    const shop = layout.shops.find(s => s.id === item.dataset.id);
    if (shop) {
      mallScene.selectShop(shop);
      mallScene.focusOnShop(shop);
      searchDropdown.style.display = 'none';
      searchInput.value = shop.name;
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchDropdown.style.display = 'none';
    }
  });
}

// 6. Главный цикл отрисовки
function animate() {
  requestAnimationFrame(animate);
  mallScene.render();
}
animate();
