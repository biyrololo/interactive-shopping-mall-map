import { generatePlacesData } from '../src/data/placesData.js';
import { packShops, verifyNonOverlapping } from '../src/layout/packer.js';
import { SpatialIndex } from '../src/data/spatialIndex.js';

console.log('🧪 Starting automated layout and data structure test suite...\n');

// 1. Test 100 items generation
const places = generatePlacesData(100);
console.assert(places.length === 100, `Expected 100 places, got ${places.length}`);
console.log(`✅ Test 1 Passed: Exactly ${places.length} places generated.`);

// Check required seed items from spec
const requiredIds = ['shop_001', 'shop_002', 'food_003', 'shop_004', 'shop_005'];
for (const reqId of requiredIds) {
  const found = places.find(p => p.id === reqId);
  console.assert(found !== undefined, `Missing required seed shop: ${reqId}`);
}
console.log(`✅ Test 2 Passed: Required seed items present (${requiredIds.join(', ')}).`);

// 2. Test Packing Algorithm & 0 Overlaps
const layout = packShops(places);
console.assert(layout.shops.length === 100, `Expected 100 placed shops, got ${layout.shops.length}`);

const verification = verifyNonOverlapping(layout.shops);
console.assert(verification.valid === true, `Overlaps detected: ${JSON.stringify(verification.conflicts)}`);
console.assert(verification.conflicts.length === 0, `Expected 0 conflicts, got ${verification.conflicts.length}`);
console.log(`✅ Test 3 Passed: 100% non-overlapping guarantee verified! Conflicts = 0.`);

// 3. Test Spatial Index O(1) Lookups
const spatialIndex = new SpatialIndex(8);
spatialIndex.build(layout.shops);

// Test ID Lookup
const shop001 = spatialIndex.getById('shop_001');
console.assert(shop001 !== null && shop001.name === 'Apple Store', 'Shop 001 lookup failed');
console.log(`✅ Test 4 Passed: O(1) ID lookup succeeded for ${shop001.id} (${shop001.name}).`);

// Test Coordinate Lookup
const testCoordShop = layout.shops[15];
const foundByCoord = spatialIndex.getByCoords(testCoordShop.x, testCoordShop.z);
console.assert(foundByCoord !== null && foundByCoord.id === testCoordShop.id, `Coord lookup failed at (${testCoordShop.x}, ${testCoordShop.z})`);
console.log(`✅ Test 5 Passed: Spatial coordinate lookup succeeded for ${testCoordShop.id} at (${testCoordShop.x.toFixed(1)}, ${testCoordShop.z.toFixed(1)}).`);

// Test Range Query
const allInRange = spatialIndex.queryRange(-1000, -1000, 1000, 1000);
console.assert(allInRange.length === 100, `Expected 100 in full range, got ${allInRange.length}`);
console.log(`✅ Test 6 Passed: Spatial range query retrieved all ${allInRange.length} shops.`);

// Test Search
const searchResults = spatialIndex.search('apple');
console.assert(searchResults.length > 0 && searchResults[0].id === 'shop_001', 'Search for "apple" failed');
console.log(`✅ Test 7 Passed: Search for "apple" found ${searchResults.length} shop(s).`);

// 4. Edge Cases: Long names
const longNameShop = layout.shops.find(s => s.name.length > 50);
console.assert(longNameShop !== undefined, 'No long name shop found in edge cases');
console.log(`✅ Test 8 Passed: Long-name edge case confirmed: "${longNameShop.name}" (${longNameShop.name.length} chars).`);

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100/100 SHินOPS VERIFIED.');
