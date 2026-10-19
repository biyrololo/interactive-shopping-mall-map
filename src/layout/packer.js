import { CONFIG } from '../config.js';

/**
 * Packs 100 shopping mall units onto the XZ plane without any intersections.
 *
 * Algorithm Concept: "Architectural Dual-Aisle Mall Gallery Packer"
 * -----------------------------------------------------------------
 * Real shopping malls are structured around pedestrian avenues with storefronts
 * facing each other across wide corridors, and back-to-back service corridors.
 *
 * The algorithm organizes shops into double-sided avenues (blocks):
 * 1. Shops are grouped into rows along the X-axis.
 * 2. Between adjacent shops in the same row, a buffer of `SHOP_PADDING` is maintained.
 * 3. Every pair of rows forms a street:
 *    - Back-to-back shops share a narrow service gap (`SHOP_PADDING`).
 *    - Facing storefronts are separated by wide pedestrian walkways (`AISLE_WIDTH`).
 * 4. A central perpendicular boulevard (`CROSS_AISLE_WIDTH`) splits the layout
 *    into West and East shopping galleries.
 * 5. Entire floor is normalized and centered at coordinate origin (0, 0, 0).
 * 6. Explicit 2D Axis-Aligned Bounding Box (AABB) intersection verification is run.
 */

/**
 * @typedef {Object} PlacedShop
 * @property {string} id
 * @property {string} name
 * @property {number} width
 * @property {number} depth
 * @property {number} height
 * @property {number} color
 * @property {string} category
 * @property {string} categoryIcon
 * @property {string} colorHex
 * @property {number} x - Center X in world space
 * @property {number} y - Center Y (half height)
 * @property {number} z - Center Z in world space
 * @property {Object} bounds - { minX, maxX, minZ, maxZ }
 */

/**
 * Places shops on a non-overlapping XZ grid.
 *
 * @param {Array<Object>} places - List of raw shop objects from placesData
 * @param {Object} options - Custom packing options
 * @returns {{ shops: PlacedShop[], bounds: Object, aisles: Array<Object> }}
 */
export function packShops(places, options = {}) {
  const shopPadding = options.shopPadding ?? CONFIG.SHOP_PADDING;
  const aisleWidth = options.aisleWidth ?? CONFIG.AISLE_WIDTH;
  const crossAisleWidth = options.crossAisleWidth ?? CONFIG.CROSS_AISLE_WIDTH;
  const shopsPerRowTarget = options.shopsPerRowTarget ?? 10;

  const placedShops = [];
  const aisles = []; // Coordinates of corridors for rendering floor paths

  // Sort large anchor stores (like Food Court, Hypermarket) to distribute evenly or keep order
  // Keeping original sequence preserves seed shop IDs (shop_001, shop_002, etc.)
  const total = places.length;

  // We organize into 5 double-row avenues (10 rows total, ~10 shops per row)
  const rows = [];
  let currentRow = [];
  let currentCount = 0;

  for (let i = 0; i < total; i++) {
    currentRow.push(places[i]);
    currentCount++;

    // Wrap to next row when reaching target per row, or on last element
    if (currentCount >= shopsPerRowTarget || i === total - 1) {
      rows.push(currentRow);
      currentRow = [];
      currentCount = 0;
    }
  }

  let currentZ = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const maxDepth = Math.max(...row.map(s => s.depth));

    // Determine row X starting position
    // We split row into Left Gallery and Right Gallery separated by central boulevard
    const halfRowIndex = Math.ceil(row.length / 2);
    const leftWing = row.slice(0, halfRowIndex);
    const rightWing = row.slice(halfRowIndex);

    // Calculate left wing width
    const leftWidth = leftWing.reduce((sum, s) => sum + s.width + shopPadding, 0) - shopPadding;
    // Calculate right wing width
    const rightWidth = rightWing.reduce((sum, s) => sum + s.width + shopPadding, 0) - shopPadding;

    // Place left wing (to the left of central boulevard)
    let leftX = -(crossAisleWidth / 2) - leftWidth;
    for (const shop of leftWing) {
      const centerX = leftX + (shop.width / 2);
      const centerZ = currentZ + (shop.depth / 2);

      placedShops.push(createPlacedShop(shop, centerX, centerZ));
      leftX += shop.width + shopPadding;
    }

    // Place right wing (to the right of central boulevard)
    let rightX = (crossAisleWidth / 2);
    for (const shop of rightWing) {
      const centerX = rightX + (shop.width / 2);
      const centerZ = currentZ + (shop.depth / 2);

      placedShops.push(createPlacedShop(shop, centerX, centerZ));
      rightX += shop.width + shopPadding;
    }

    // Advance Z position:
    // If r is even (0, 2, 4...), rows r and r+1 are back-to-back (narrow service gap).
    // If r is odd (1, 3, 5...), rows r and r+1 face each other across a pedestrian corridor!
    const isBackToBack = (r % 2 === 0);
    const gap = isBackToBack ? shopPadding : aisleWidth;

    // Record aisle walkway area for visualization
    if (!isBackToBack && r < rows.length - 1) {
      aisles.push({
        z: currentZ + maxDepth + (gap / 2),
        width: Math.max(leftWidth, rightWidth) * 2 + crossAisleWidth + 10,
        depth: gap
      });
    }

    currentZ += maxDepth + gap;
  }

  // Calculate layout bounds before centering
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const shop of placedShops) {
    if (shop.bounds.minX < minX) minX = shop.bounds.minX;
    if (shop.bounds.maxX > maxX) maxX = shop.bounds.maxX;
    if (shop.bounds.minZ < minZ) minZ = shop.bounds.minZ;
    if (shop.bounds.maxZ > maxZ) maxZ = shop.bounds.maxZ;
  }

  // Center entire mall layout around (0, 0, 0)
  const offsetX = (minX + maxX) / 2;
  const offsetZ = (minZ + maxZ) / 2;

  for (const shop of placedShops) {
    shop.x -= offsetX;
    shop.z -= offsetZ;
    shop.bounds.minX -= offsetX;
    shop.bounds.maxX -= offsetX;
    shop.bounds.minZ -= offsetZ;
    shop.bounds.maxZ -= offsetZ;
  }

  for (const aisle of aisles) {
    aisle.z -= offsetZ;
  }

  // Recalculate centered bounds
  const centeredBounds = {
    minX: minX - offsetX,
    maxX: maxX - offsetX,
    minZ: minZ - offsetZ,
    maxZ: maxZ - offsetZ,
    width: maxX - minX,
    depth: maxZ - minZ
  };

  // Add mall floor bounds with perimeter padding
  const floorBounds = {
    minX: centeredBounds.minX - CONFIG.FLOOR_PADDING,
    maxX: centeredBounds.maxX + CONFIG.FLOOR_PADDING,
    minZ: centeredBounds.minZ - CONFIG.FLOOR_PADDING,
    maxZ: centeredBounds.maxZ + CONFIG.FLOOR_PADDING,
    width: centeredBounds.width + (CONFIG.FLOOR_PADDING * 2),
    depth: centeredBounds.depth + (CONFIG.FLOOR_PADDING * 2)
  };

  // Rigorous verification: Ensure NO overlaps exist
  const verification = verifyNonOverlapping(placedShops);
  if (!verification.valid) {
    console.error('❌ Overlap detected during layout packing:', verification.conflicts);
    throw new Error(`Packing algorithm failed: ${verification.conflicts.length} overlaps found`);
  } else {
    console.log(`✅ Layout verification passed: 100% of ${placedShops.length} shops placed with 0 overlaps.`);
  }

  return {
    shops: placedShops,
    bounds: centeredBounds,
    floorBounds,
    aisles
  };
}

/**
 * Creates a PlacedShop record with bounding box
 */
function createPlacedShop(shop, x, z) {
  const halfW = shop.width / 2;
  const halfD = shop.depth / 2;
  return {
    ...shop,
    x,
    y: CONFIG.SHOP_HEIGHT_3D / 2, // Centered vertically on floor
    z,
    height: CONFIG.SHOP_HEIGHT_3D,
    bounds: {
      minX: x - halfW,
      maxX: x + halfW,
      minZ: z - halfD,
      maxZ: z + halfD
    }
  };
}

/**
 * Rigorously checks for 2D Axis-Aligned Bounding Box (AABB) collisions
 * between all pairs of shops.
 *
 * @param {PlacedShop[]} shops
 * @returns {{ valid: boolean, conflicts: Array<Object> }}
 */
export function verifyNonOverlapping(shops) {
  const conflicts = [];
  const count = shops.length;
  const tolerance = 0.0001; // Epsilon for floating point precision

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a = shops[i];
      const b = shops[j];

      // Overlap occurs if and only if both intervals overlap
      const overlapX = (a.bounds.minX < b.bounds.maxX - tolerance) && (a.bounds.maxX > b.bounds.minX + tolerance);
      const overlapZ = (a.bounds.minZ < b.bounds.maxZ - tolerance) && (a.bounds.maxZ > b.bounds.minZ + tolerance);

      if (overlapX && overlapZ) {
        conflicts.push({
          shopA: { id: a.id, name: a.name, bounds: a.bounds },
          shopB: { id: b.id, name: b.name, bounds: b.bounds }
        });
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts
  };
}
