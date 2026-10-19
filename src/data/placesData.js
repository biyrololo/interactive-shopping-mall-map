import { CONFIG } from '../config.js';

/**
 * Curated seed brands representing a realistic shopping mall floor.
 * Includes international brands, local stores, cafes, and edge cases (long names).
 */
const SEED_PLACES = [
  { id: 'shop_001', name: 'Apple Store', width: 5, depth: 5, color: 0xffaa00, category: 'Electronics & Tech' },
  { id: 'shop_002', name: 'Starbucks', width: 3.5, depth: 3.5, color: 0x00aa55, category: 'Food & Dining' },
  { id: 'food_003', name: 'Фуд-корт', width: 8, depth: 6.5, color: 0xaa44aa, category: 'Food & Dining' },
  { id: 'shop_004', name: 'Zara', width: 6.5, depth: 5, color: 0x4444aa, category: 'Fashion & Apparel' },
  { id: 'shop_005', name: 'H&M', width: 6, depth: 5, color: 0xaa4444, category: 'Fashion & Apparel' },
  { id: 'shop_006', name: 'Sephora', width: 4.5, depth: 4, color: 0xdd4488, category: 'Beauty & Cosmetics' },
  { id: 'shop_007', name: 'Nike Flagship', width: 6, depth: 5, color: 0x22aa66, category: 'Sport & Outdoor' },
  { id: 'shop_008', name: 'LEGO Certified Store', width: 5, depth: 4.5, color: 0xffcc00, category: 'Entertainment & Books' },
  { id: 'shop_009', name: 'Uniqlo', width: 7, depth: 5.5, color: 0xcc2222, category: 'Fashion & Apparel' },
  { id: 'shop_010', name: 'Nespresso Boutique', width: 3.5, depth: 3, color: 0x8b5a2b, category: 'Food & Dining' },
  { id: 'shop_011', name: 'Sony Centre', width: 5, depth: 4, color: 0x2e4053, category: 'Electronics & Tech' },
  { id: 'shop_012', name: 'Золотое Яблоко', width: 7.5, depth: 6, color: 0x16a085, category: 'Beauty & Cosmetics' },
  { id: 'shop_013', name: 'Adidas Originals', width: 5.5, depth: 4.5, color: 0x1b4f72, category: 'Sport & Outdoor' },
  { id: 'shop_014', name: 'Massimo Dutti', width: 5, depth: 4, color: 0x5d6d7e, category: 'Fashion & Apparel' },
  { id: 'shop_015', name: 'Swarovski', width: 3.5, depth: 3, color: 0x5dade2, category: 'Jewelry & Watches' },
  { id: 'shop_016', name: 'Dyson Demo Store', width: 4, depth: 3.5, color: 0x9b59b6, category: 'Electronics & Tech' },
  { id: 'shop_017', name: 'Cinnabon & Bakery', width: 3.5, depth: 3, color: 0xd35400, category: 'Food & Dining' },
  { id: 'shop_018', name: 'Mango', width: 5.5, depth: 4.5, color: 0xba4a00, category: 'Fashion & Apparel' },
  { id: 'shop_019', name: 'Pull&Bear', width: 5, depth: 4, color: 0x27ae60, category: 'Fashion & Apparel' },
  { id: 'shop_020', name: 'Bershka', width: 5, depth: 4, color: 0x8e44ad, category: 'Fashion & Apparel' },
  { id: 'shop_021', name: 'Reebok Classic', width: 4.5, depth: 4, color: 0xc0392b, category: 'Sport & Outdoor' },
  { id: 'shop_022', name: 'Pandora', width: 3.5, depth: 3, color: 0xf1948a, category: 'Jewelry & Watches' },
  { id: 'shop_023', name: 'L\'Occitane en Provence', width: 4, depth: 3.5, color: 0xf39c12, category: 'Beauty & Cosmetics' },
  { id: 'shop_024', name: 'Читай-город', width: 6.5, depth: 5, color: 0x2980b9, category: 'Entertainment & Books' },
  { id: 'shop_025', name: 'Samsung Galaxy Experience', width: 6, depth: 4.5, color: 0x1f618d, category: 'Electronics & Tech' },
  { id: 'shop_026', name: 'Calvin Klein Jeans', width: 4.5, depth: 4, color: 0x34495e, category: 'Fashion & Apparel' },
  { id: 'shop_027', name: 'Tommy Hilfiger', width: 5, depth: 4, color: 0x1a5276, category: 'Fashion & Apparel' },
  { id: 'shop_028', name: 'Levi\'s Store', width: 4.5, depth: 4, color: 0x922b21, category: 'Fashion & Apparel' },
  { id: 'shop_029', name: 'KFC Express', width: 4.5, depth: 4, color: 0xb03a2e, category: 'Food & Dining' },
  { id: 'shop_030', name: 'Burger King', width: 5, depth: 4, color: 0xd68910, category: 'Food & Dining' },
  { id: 'shop_031', name: 'Вкусно — и точка', width: 7, depth: 5.5, color: 0x1e8449, category: 'Food & Dining' },
  { id: 'shop_032', name: 'Додо Пицца', width: 6, depth: 4.5, color: 0xe67e22, category: 'Food & Dining' },
  { id: 'shop_033', name: 'Tissot Swiss Watches', width: 3.5, depth: 3, color: 0x7b7d7d, category: 'Jewelry & Watches' },
  { id: 'shop_034', name: 'Stradivarius', width: 4.5, depth: 4, color: 0xaf7ac5, category: 'Fashion & Apparel' },
  { id: 'shop_035', name: 'Oysho Intimates', width: 4, depth: 3.5, color: 0xedbb99, category: 'Fashion & Apparel' },
  { id: 'shop_036', name: 'Intimissimi', width: 3.5, depth: 3, color: 0xd7bde2, category: 'Fashion & Apparel' },
  { id: 'shop_037', name: 'Calzedonia', width: 3.5, depth: 3, color: 0xa9cce3, category: 'Fashion & Apparel' },
  { id: 'shop_038', name: 'MAC Cosmetics', width: 4, depth: 3.5, color: 0x17202a, category: 'Beauty & Cosmetics' },
  { id: 'shop_039', name: 'Рив Гош', width: 6, depth: 4.5, color: 0x6c3483, category: 'Beauty & Cosmetics' },
  { id: 'shop_040', name: 'Л\'Этуаль', width: 6.5, depth: 5, color: 0x117a65, category: 'Beauty & Cosmetics' },
  { id: 'shop_041', name: 'Xiaomi Mi Home', width: 5, depth: 4, color: 0xe59866, category: 'Electronics & Tech' },
  { id: 'shop_042', name: 're:Store Premium Reseller', width: 4.5, depth: 4, color: 0x566573, category: 'Electronics & Tech' },
  { id: 'shop_043', name: 'SuperStep Sneakers', width: 4.5, depth: 4, color: 0x2874a6, category: 'Sport & Outdoor' },
  { id: 'shop_044', name: 'Puma Performance', width: 5, depth: 4, color: 0x78281f, category: 'Sport & Outdoor' },
  { id: 'shop_045', name: 'Under Armour', width: 5, depth: 4, color: 0x1b2631, category: 'Sport & Outdoor' },
  { id: 'shop_046', name: 'Спортмастер PRO', width: 7.5, depth: 6, color: 0x2471a3, category: 'Sport & Outdoor' },
  { id: 'shop_047', name: 'Детский Мир Hyper', width: 7.5, depth: 6, color: 0x28b463, category: 'Entertainment & Books' },
  { id: 'shop_048', name: 'Hamleys Toy Store', width: 6, depth: 5, color: 0xc0392b, category: 'Entertainment & Books' },
  { id: 'shop_049', name: 'Mothercare Baby', width: 4.5, depth: 4, color: 0x76d7c4, category: 'Fashion & Apparel' },
  { id: 'shop_050', name: 'Choupette Boutique', width: 3.5, depth: 3, color: 0xf5cba7, category: 'Fashion & Apparel' },
  // Edge cases with very long names to test text wrapping and truncation
  { id: 'shop_051', name: 'Флагманский гипермаркет электроники и бытовой техники «М.Видео-Эльдорадо»', width: 7.5, depth: 6, color: 0xd98880, category: 'Electronics & Tech' },
  { id: 'shop_052', name: 'The Body Shop — 100% Vegetarian & Cruelty-Free British Cosmetics', width: 5, depth: 4, color: 0x145a32, category: 'Beauty & Cosmetics' },
  { id: 'shop_053', name: 'Le Pain Quotidien — Artisan Bakery, Organic Coffee & Breakfast Bistro', width: 6, depth: 4.5, color: 0x935116, category: 'Food & Dining' },
  { id: 'shop_054', name: 'Sunglass Hut Designer Eyewear Collection (Ray-Ban, Oakley, Gucci)', width: 4.5, depth: 3.5, color: 0x4a235a, category: 'Fashion & Apparel' },
  { id: 'shop_055', name: 'Henderson — Мужские костюмы, рубашки и аксессуары премиум-класса', width: 5.5, depth: 4.5, color: 0x1b4f72, category: 'Fashion & Apparel' }
];

const BRAND_NAME_TEMPLATES = [
  'Boutique', 'Gallery', 'Studio', 'Corner', 'Outlet', 'Market', 'Lab', 'Club', 'House', 'World',
  'Trend', 'Space', 'Prime', 'City', 'Point', 'Atelier', 'Concept', 'Plaza', 'Express', 'Select'
];

const PREFIXES = [
  'Urban', 'Nordic', 'Royal', 'Grand', 'Echo', 'Apex', 'Nova', 'Vogue', 'Luxe', 'Aura',
  'Zenith', 'Velvet', 'Atlas', 'Cosmo', 'Metro', 'Terra', 'Amber', 'Silk', 'Onyx', 'Sol'
];

/**
 * Generates dynamically an array of exactly `count` places (100 objects).
 * Combines curated anchor stores, edge cases with long names, and procedurally generated shops.
 *
 * @param {number} count - Total number of shops to generate (default: 100)
 * @returns {Array<{id: string, name: string, width: number, depth: number, color: number, category: string, categoryIcon: string}>}
 */
export function generatePlacesData(count = CONFIG.TOTAL_SHOPS) {
  const places = [];

  // 1. Add seed stores first
  for (let i = 0; i < Math.min(count, SEED_PLACES.length); i++) {
    const seed = SEED_PLACES[i];
    const categoryObj = CONFIG.CATEGORIES.find(c => c.name === seed.category) || CONFIG.CATEGORIES[0];
    places.push({
      id: seed.id,
      name: seed.name,
      width: seed.width,
      depth: seed.depth,
      color: seed.color,
      category: seed.category,
      categoryIcon: categoryObj.icon,
      colorHex: '#' + seed.color.toString(16).padStart(6, '0')
    });
  }

  // 2. Procedurally generate the remaining stores up to count
  for (let i = places.length; i < count; i++) {
    const idNum = (i + 1).toString().padStart(3, '0');
    const id = `shop_${idNum}`;
    const categoryObj = CONFIG.CATEGORIES[i % CONFIG.CATEGORIES.length];

    const prefix = PREFIXES[i % PREFIXES.length];
    const template = BRAND_NAME_TEMPLATES[(i * 3) % BRAND_NAME_TEMPLATES.length];
    const name = `${prefix} ${template}`;

    // Dimensions: variation between 3.0 and 6.5
    // Small kiosks (3x3), standard shops (4.5x4), medium boutiques (5.5x4.5)
    const sizeVariation = (i * 7) % 5;
    let width = 3.5 + (sizeVariation * 0.7);
    let depth = 3.2 + ((i % 4) * 0.6);
    width = Math.round(width * 10) / 10;
    depth = Math.round(depth * 10) / 10;

    // Harmonious color slightly offset from category base color
    const hueShift = ((i * 37) % 60) - 30; // slight color variation within category
    const baseColor = categoryObj.color;
    const r = Math.min(255, Math.max(0, ((baseColor >> 16) & 255) + hueShift));
    const g = Math.min(255, Math.max(0, ((baseColor >> 8) & 255) + (hueShift * 0.5)));
    const b = Math.min(255, Math.max(0, (baseColor & 255) - (hueShift * 0.5)));
    const color = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

    places.push({
      id,
      name,
      width,
      depth,
      color,
      category: categoryObj.name,
      categoryIcon: categoryObj.icon,
      colorHex: '#' + color.toString(16).padStart(6, '0')
    });
  }

  return places;
}
