import * as THREE from 'three';

/**
 * Создает легковесный Three.js Sprite с текстовой подписью магазина.
 * Использует небольшой 2D Canvas (256x64), что дает:
 * - 100% WebGL рендеринг на GPU (0 DOM-элементов, 0 тормозов).
 * - Автоматический Billboarding (спрайт всегда повернут к камере и в 2D, и в 3D).
 * - Грамотную обработку длинных названий (обрезка с многоточием "...").
 *
 * @param {Object} shop - Данные о магазине
 * @returns {THREE.Sprite}
 */
export function createShopLabelSprite(shop) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  // Очистка
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Фон бейджа (закругленный прямоугольник)
  const pad = 4;
  const x = pad;
  const y = pad;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const radius = 12;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.fill();

  // Рамка цвета категории/магазина
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#' + shop.color.toString(16).padStart(6, '0');
  ctx.stroke();

  // Шрифт и обрезка длинного текста
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxTextWidth = w - 24;
  const displayName = truncateText(ctx, shop.name, maxTextWidth);

  ctx.fillText(displayName, canvas.width / 2, canvas.height / 2);

  // Создаем WebGL текстуру
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false // Подпись не перекрывается гранями своей же коробки
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  // Масштаб спрайта в мировых единицах (соотношение 4:1)
  const spriteHeight = 1.0;
  const spriteWidth = spriteHeight * (canvas.width / canvas.height);
  sprite.scale.set(spriteWidth, spriteHeight, 1);

  // Позиционируем над крышей магазина
  sprite.position.set(shop.x, shop.height + 0.7, shop.z);
  sprite.renderOrder = 999;

  return sprite;
}

/**
 * Обрезает текст и добавляет "...", если он не влезает в заданную ширину
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
