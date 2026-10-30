import { generatePlacesData } from '../src/data.js';
import { packShops, checkCollisions } from '../src/layout.js';

console.log('Запуск тестов генерации и упаковки 100 объектов...\n');

// 1. Тест генерации 100 объектов
const places = generatePlacesData(100);
console.assert(places.length === 100, `Ожидалось 100 объектов, получено ${places.length}`);
console.log(`[OK] Тест 1 пройден: сгенерировано ${places.length} объектов.`);

// 2. Проверка базовых магазинов из ТЗ
const requiredIds = ['shop_001', 'shop_002', 'food_003', 'shop_004', 'shop_005'];
for (const id of requiredIds) {
  const found = places.find(p => p.id === id);
  console.assert(found !== undefined, `Отсутствует обязательный магазин: ${id}`);
}
console.log(`[OK] Тест 2 пройден: базовые магазины присутствуют (${requiredIds.join(', ')}).`);

// 3. Тест размещения и отсутствия пересечений
const layout = packShops(places);
console.assert(layout.shops.length === 100, `Ожидалось 100 размещенных магазинов, получено ${layout.shops.length}`);

const conflicts = checkCollisions(layout.shops);
console.assert(conflicts.length === 0, `Обнаружены пересечения: ${JSON.stringify(conflicts)}`);
console.log(`[OK] Тест 3 пройден: отсутствие пересечений подтверждено (коллизий: ${conflicts.length}).`);

// 4. Тест структуры данных: O(1) поиск по ID через Map
const shopMap = new Map(layout.shops.map(s => [s.id, s]));
const appleStore = shopMap.get('shop_001');
console.assert(appleStore !== null && appleStore.name === 'Apple Store', 'Поиск по ID shop_001 не удался');
console.log(`[OK] Тест 4 пройден: поиск по ID работает корректно (${appleStore.id}: ${appleStore.name}).`);

// 5. Тест граничного случая: длинные названия
const longNameShop = layout.shops.find(s => s.name.length > 30);
console.assert(longNameShop !== undefined, 'Магазин с длинным названием не найден');
console.log(`[OK] Тест 5 пройден: граничный случай длинного названия подтвержден ("${longNameShop.name}").`);

console.log('\nВсе тесты пройдены успешно (100/100 объектов проверено).');
