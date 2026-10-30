/**
 * Алгоритм размещения 100 объектов на плоскости XZ без пересечений.
 *
 * Подход: "Ряды торговых галерей с динамическим шагом"
 * - 100 магазинов упорядочиваются по рядам (по 10 магазинов в ряду).
 * - По оси X магазины следуют друг за другом с фиксированным технологическим зазором (gapX).
 * - По оси Z каждый ряд отделен пешеходным проходом (aisleGap), рассчитанным
 *   от максимальной глубины магазинов текущего ряда.
 * - После раскладки весь план центрируется в точку (0, 0, 0).
 * - Этот подход гарантирует 100% отсутствие пересечений и соответствует
 *   реальной логике планировки торговых центров (магазины вдоль проходов).
 */

export function packShops(places, options = {}) {
  const itemsPerRow = options.itemsPerRow || 10;
  const gapX = options.gapX || 1.2;          // Зазор между магазинами в одном ряду
  const aisleGapZ = options.aisleGapZ || 3.5; // Пешеходный проход между рядами
  const baseHeight = options.height || 2.0;   // Фиксированная высота в 3D

  const placedShops = [];
  const total = places.length;

  let currentZ = 0;
  let rowStartIndex = 0;

  while (rowStartIndex < total) {
    const rowEndIndex = Math.min(rowStartIndex + itemsPerRow, total);
    const rowShops = places.slice(rowStartIndex, rowEndIndex);

    // Максимальная глубина в текущем ряду
    const maxRowDepth = Math.max(...rowShops.map(s => s.depth));

    let currentX = 0;
    for (const shop of rowShops) {
      const centerX = currentX + shop.width / 2;
      const centerZ = currentZ + shop.depth / 2;

      placedShops.push({
        ...shop,
        x: centerX,
        y: baseHeight / 2, // Центр коробки по высоте
        z: centerZ,
        height: baseHeight,
        bounds: {
          minX: currentX,
          maxX: currentX + shop.width,
          minZ: currentZ,
          maxZ: currentZ + shop.depth
        }
      });

      currentX += shop.width + gapX;
    }

    currentZ += maxRowDepth + aisleGapZ;
    rowStartIndex = rowEndIndex;
  }

  // Вычисляем границы для центрирования
  const minX = Math.min(...placedShops.map(s => s.bounds.minX));
  const maxX = Math.max(...placedShops.map(s => s.bounds.maxX));
  const minZ = Math.min(...placedShops.map(s => s.bounds.minZ));
  const maxZ = Math.max(...placedShops.map(s => s.bounds.maxZ));

  const offsetX = (minX + maxX) / 2;
  const offsetZ = (minZ + maxZ) / 2;

  // Центрируем все объекты относительно (0, 0, 0)
  for (const shop of placedShops) {
    shop.x -= offsetX;
    shop.z -= offsetZ;
    shop.bounds.minX -= offsetX;
    shop.bounds.maxX -= offsetX;
    shop.bounds.minZ -= offsetZ;
    shop.bounds.maxZ -= offsetZ;
  }

  const floorWidth = (maxX - minX) + 10;
  const floorDepth = (maxZ - minZ) + 10;

  return {
    shops: placedShops,
    floor: {
      width: floorWidth,
      depth: floorDepth
    }
  };
}

/**
 * Проверка на отсутствие пересечений (AABB 2D Collision Check)
 * Возвращает массив конфликтов (должен быть пуст)
 */
export function checkCollisions(shops) {
  const conflicts = [];
  const count = shops.length;
  const eps = 0.001; // Погрешность с плавающей запятой

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a = shops[i].bounds;
      const b = shops[j].bounds;

      const overlapX = a.minX < b.maxX - eps && a.maxX > b.minX + eps;
      const overlapZ = a.minZ < b.maxZ - eps && a.maxZ > b.minZ + eps;

      if (overlapX && overlapZ) {
        conflicts.push({ a: shops[i].id, b: shops[j].id });
      }
    }
  }

  return conflicts;
}
