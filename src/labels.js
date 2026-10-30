import * as THREE from 'three';

/**
 * Создает табличку с названием магазина (Mesh с PlaneGeometry).
 * В 2D режиме лежит плашмя на крыше магазина параллельно полу (XZ).
 * В 3D режиме ориентируется на камеру или наклоняется под 45 градусов.
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

  // Фон плашки
  const pad = 6;
  const x = pad;
  const y = pad;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const radius = 20;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fill();

  // Рамка цвета категории/магазина
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#' + shop.color.toString(16).padStart(6, '0');
  ctx.stroke();

  // Текст с обрезкой
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = w - 40;
  const displayName = truncateText(ctx, shop.name, maxTextWidth);

  ctx.fillText(displayName, canvas.width / 2, canvas.height / 2);

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

  // По умолчанию в 3D ставим под углом 45 градусов над крышей
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
