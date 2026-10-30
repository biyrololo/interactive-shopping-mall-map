import * as THREE from 'three';

/**
 * Создает табличку с названием магазина в стиле Яндекс Карт:
 * Крупный, контрастный и легко читаемый шрифт на белой плашке со скруглением
 * и цветовой полоской категории.
 *
 * @param {Object} shop - Данные о магазине
 * @returns {THREE.Mesh}
 */
export function createShopLabelMesh(shop) {
  // Высокое разрешение холста для четкости текста
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 160;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Mesh();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Белый фон бейджа
  const pad = 6;
  const x = pad;
  const y = pad;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const radius = 28;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Тонкая аккуратная граница
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  // 2. Цветовой маркер категории (вертикальная полоска слева)
  const barWidth = 18;
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 5, barWidth, h - 10, [radius - 4, 6, 6, radius - 4]);
  ctx.fillStyle = '#' + shop.color.toString(16).padStart(6, '0');
  ctx.fill();

  // 3. Название магазина (крупный, жирный, контрастный шрифт)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = w - 75;
  const displayName = truncateText(ctx, shop.name, maxTextWidth);

  ctx.fillText(displayName, canvas.width / 2 + 10, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  // Базовые габариты плашки в мировых единицах
  const baseWidth = Math.min(Math.max(shop.width * 0.95, 4.2), 6.8);
  const baseHeight = baseWidth * (160 / 640);

  const geo = new THREE.PlaneGeometry(baseWidth, baseHeight);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 999;
  mesh.userData = { shop, baseWidth, baseHeight };

  // В 3D ставим над крышей с наклоном 45 градусов к камере
  mesh.position.set(shop.x, shop.height + 0.38, shop.z);
  mesh.rotation.set(-Math.PI / 4, 0, 0);

  return mesh;
}

/**
 * Обрезает текст и добавляет "...", если он шире maxTextWidth
 */
function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  const ellipsis = '...';
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + ellipsis).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return (truncated.trim() || '') + ellipsis;
}
