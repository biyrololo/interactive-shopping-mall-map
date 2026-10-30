import * as THREE from 'three';

/**
 * Создает табличку с названием магазина в стиле карточек Яндекс Карт:
 * Светлый чистый бейдж с мягкой тенью, цветовым маркером категории и четким темным текстом.
 *
 * @param {Object} shop - Данные о магазине
 * @returns {THREE.Mesh}
 */
export function createShopLabelMesh(shop) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Mesh();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Фон бейджа (чистый белый прямоугольник с мягким скруглением)
  const pad = 6;
  const x = pad;
  const y = pad;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const radius = 24;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Тонкая аккуратная граница
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  // Цветовой индикатор категории (акцентная полоска слева)
  const barWidth = 14;
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 4, barWidth, h - 8, [radius - 4, 4, 4, radius - 4]);
  ctx.fillStyle = '#' + shop.color.toString(16).padStart(6, '0');
  ctx.fill();

  // Название магазина (темный четкий шрифт)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = w - 60;
  const displayName = truncateText(ctx, shop.name, maxTextWidth);

  // Текст с легким смещением вправо относительно цветного маркера
  ctx.fillText(displayName, canvas.width / 2 + 6, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const labelWidth = Math.min(Math.max(shop.width * 0.85, 2.8), 4.2);
  const labelHeight = labelWidth * (128 / 512);

  const geo = new THREE.PlaneGeometry(labelWidth, labelHeight);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 999;
  mesh.userData = { shop, labelWidth, labelHeight };

  // По умолчанию в 3D ставим над крышей с наклоном 45 градусов к камере
  mesh.position.set(shop.x, shop.height + 0.35, shop.z);
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
