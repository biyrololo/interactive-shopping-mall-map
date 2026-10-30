import * as THREE from 'three';

/**
 * Создает крупную табличку с названием магазина в стиле Яндекс Карт.
 * Базовый размер увеличен на 50%, шрифт крупный (76px) и четкий.
 *
 * @param {Object} shop - Данные о магазине
 * @returns {THREE.Mesh}
 */
export function createShopLabelMesh(shop) {
  // Высокое разрешение холста (800x200) для кристальной четкости увеличенного текста
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 200;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Mesh();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Белая подложка со скругленными углами
  const pad = 6;
  const x = pad;
  const y = pad;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const radius = 38;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Тонкая аккуратная граница
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  // 2. Цветовая полоска категории слева
  const barWidth = 24;
  ctx.beginPath();
  ctx.roundRect(x + 7, y + 7, barWidth, h - 14, [radius - 4, 10, 10, radius - 4]);
  ctx.fillStyle = '#' + shop.color.toString(16).padStart(6, '0');
  ctx.fill();

  // 3. Название магазина (очень крупный жирный шрифт 76px)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 76px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = w - 100;
  const displayName = truncateText(ctx, shop.name, maxTextWidth);

  ctx.fillText(displayName, canvas.width / 2 + 14, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  // Базовые габариты плашки увеличены на 50%
  const baseWidth = Math.min(Math.max(shop.width * 1.5, 6.5), 11.5);
  const baseHeight = baseWidth * (200 / 800); // 1.62м - 2.87м в высоту

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
  mesh.position.set(shop.x, shop.height + 0.45, shop.z);
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
