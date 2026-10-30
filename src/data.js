/**
 * Генерация данных для 100 объектов торгового центра в стиле Яндекс Карт.
 * Базовые магазины строго соответствуют спецификации ТЗ.
 */

// Базовые магазины из ТЗ
const SEED_SHOPS = [
  { id: 'shop_001', name: 'Apple Store', width: 4, depth: 4, color: 0x475569, category: 'Электроника' },
  { id: 'shop_002', name: 'Starbucks', width: 3, depth: 3, color: 0x059669, category: 'Кафе' },
  { id: 'food_003', name: 'Фуд-корт', width: 8, depth: 6, color: 0xe11d48, category: 'Рестораны' },
  { id: 'shop_004', name: 'Zara', width: 6, depth: 5, color: 0x2563eb, category: 'Одежда' },
  { id: 'shop_005', name: 'H&M', width: 6, depth: 5, color: 0xdc2626, category: 'Одежда' },
  { id: 'shop_006', name: 'Sephora', width: 4.5, depth: 4, color: 0xdb2777, category: 'Красота' },
  { id: 'shop_007', name: 'Nike', width: 5.5, depth: 4.5, color: 0x16a34a, category: 'Спорт' },
  { id: 'shop_008', name: 'LEGO', width: 5, depth: 4, color: 0xd97706, category: 'Детям' },
  { id: 'shop_009', name: 'Uniqlo', width: 7, depth: 5, color: 0xb91c1c, category: 'Одежда' },
  { id: 'shop_010', name: 'Золотое Яблоко', width: 7, depth: 5.5, color: 0x0d9488, category: 'Красота' },
  // Граничный случай: очень длинное название для проверки обрезки
  { id: 'shop_011', name: 'М.Видео - Гипермаркет электроники и бытовой техники', width: 8, depth: 6, color: 0xbe123c, category: 'Электроника' }
];

const BRAND_NAMES = [
  'Adidas', 'Puma', 'Reebok', 'Mango', 'Pull&Bear', 'Bershka', 'Massimo Dutti',
  'Samsung', 'Xiaomi', 'Sony', 'Dyson', 'Читай-город', 'Детский Мир', 'Спортмастер',
  'Л\'Этуаль', 'Рив Гош', 'Pandora', 'Swarovski', 'Calvin Klein', 'Tommy Hilfiger',
  'Levi\'s', 'Додо Пицца', 'Вкусно — и точка', 'Burger King', 'KFC', 'Cinnabon',
  'Nespresso', 'SuperStep', 'Under Armour', 'Stradivarius', 'Oysho', 'Intimissimi',
  'Calzedonia', 'MAC Cosmetics', 'Choupette', 'L\'Occitane', 'Henderson', 'Guess',
  'Lacoste', 'Timberland', 'New Balance', 'Vans', 'Converse', 'Ecco', 'Geox',
  'Rendez-Vous', 'Связной', 're:Store', 'iPort', 'DNS', 'Tefal', 'Bork'
];

// Палитра категорий в мягких тонах Яндекс Карт
const CATEGORIES = [
  { name: 'Одежда и обувь', color: 0x3b82f6 },
  { name: 'Электроника', color: 0x64748b },
  { name: 'Кафе и рестораны', color: 0xf97316 },
  { name: 'Красота и здоровье', color: 0xec4899 },
  { name: 'Спорт и активный отдых', color: 0x10b981 },
  { name: 'Аксессуары и часы', color: 0x8b5cf6 },
  { name: 'Книги и хобби', color: 0x0284c7 }
];

/**
 * Генерирует массив из ровно count объектов магазинов
 * @param {number} count - Количество объектов (по умолчанию 100)
 */
export function generatePlacesData(count = 100) {
  const places = [];

  // Добавляем базовые магазины
  for (let i = 0; i < Math.min(count, SEED_SHOPS.length); i++) {
    places.push({ ...SEED_SHOPS[i] });
  }

  // Генерируем оставшиеся до count
  let nameIndex = 0;
  for (let i = places.length; i < count; i++) {
    const idNum = String(i + 1).padStart(3, '0');
    const id = `shop_${idNum}`;
    const brand = BRAND_NAMES[nameIndex % BRAND_NAMES.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    nameIndex++;

    const width = 3.5 + ((i * 3) % 5) * 0.8;
    const depth = 3.2 + ((i * 2) % 4) * 0.7;

    places.push({
      id,
      name: `${brand} #${Math.floor(i / BRAND_NAMES.length) + 1}`,
      width: Math.round(width * 10) / 10,
      depth: Math.round(depth * 10) / 10,
      color: category.color,
      category: category.name
    });
  }

  return places;
}
