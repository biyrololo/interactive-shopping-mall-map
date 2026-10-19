/**
 * Spatial Index and Data Structures for O(1) Lookups
 *
 * Implements:
 * 1. Primary ID Index: JavaScript Map<string, PlacedShop> for O(1) retrieval by shop ID.
 * 2. 2D Spatial Hash Grid: O(1) average-time point and range queries on the XZ plane.
 *
 * Why Spatial Hash Grid?
 * ----------------------
 * While a linear scan takes O(N) comparisons (acceptable for 100 items, but degrades for 1,000-10,000),
 * a 2D Spatial Hash Grid buckets objects into cells of size `cellSize`.
 * A coordinate lookup (x, z) maps directly to cellKey `${floor(x/cellSize)},${floor(z/cellSize)}`,
 * checking only the 1-3 candidate objects in that bucket.
 */
export class SpatialIndex {
  /**
   * @param {number} cellSize - Width/depth of each spatial bucket in world units
   */
  constructor(cellSize = 8) {
    this.cellSize = cellSize;
    /** @type {Map<string, Object>} */
    this.idMap = new Map();
    /** @type {Map<string, Set<Object>>} */
    this.grid = new Map();
    /** @type {Array<Object>} */
    this.allShops = [];
  }

  /**
   * Generates a unique spatial key for grid cell (cellX, cellZ)
   */
  _cellKey(cellX, cellZ) {
    return `${cellX}:${cellZ}`;
  }

  /**
   * Clears the index and builds it from an array of placed shops.
   * @param {Array<Object>} shops
   */
  build(shops) {
    this.clear();
    this.allShops = shops;

    for (const shop of shops) {
      // 1. Primary ID index for O(1) ID lookups
      this.idMap.set(shop.id, shop);

      // 2. Spatial Hash Grid indexing across all overlapping cells
      const minCellX = Math.floor(shop.bounds.minX / this.cellSize);
      const maxCellX = Math.floor(shop.bounds.maxX / this.cellSize);
      const minCellZ = Math.floor(shop.bounds.minZ / this.cellSize);
      const maxCellZ = Math.floor(shop.bounds.maxZ / this.cellSize);

      for (let cx = minCellX; cx <= maxCellX; cx++) {
        for (let cz = minCellZ; cz <= maxCellZ; cz++) {
          const key = this._cellKey(cx, cz);
          if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
          }
          this.grid.get(key).add(shop);
        }
      }
    }
  }

  /**
   * Clears all indexes
   */
  clear() {
    this.idMap.clear();
    this.grid.clear();
    this.allShops = [];
  }

  /**
   * O(1) lookup by Shop ID
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    return this.idMap.get(id) || null;
  }

  /**
   * O(1) average lookup by 2D coordinates (x, z) on floor plane
   * @param {number} x
   * @param {number} z
   * @returns {Object|null}
   */
  getByCoords(x, z) {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const key = this._cellKey(cx, cz);
    const bucket = this.grid.get(key);

    if (!bucket || bucket.size === 0) return null;

    // Check precise AABB for candidates in the bucket
    for (const shop of bucket) {
      if (
        x >= shop.bounds.minX &&
        x <= shop.bounds.maxX &&
        z >= shop.bounds.minZ &&
        z <= shop.bounds.maxZ
      ) {
        return shop;
      }
    }

    return null;
  }

  /**
   * Range query: Returns all shops within an Axis-Aligned Bounding Box
   * @param {number} minX
   * @param {number} minZ
   * @param {number} maxX
   * @param {number} maxZ
   * @returns {Array<Object>}
   */
  queryRange(minX, minZ, maxX, maxZ) {
    const minCellX = Math.floor(minX / this.cellSize);
    const maxCellX = Math.floor(maxX / this.cellSize);
    const minCellZ = Math.floor(minZ / this.cellSize);
    const maxCellZ = Math.floor(maxZ / this.cellSize);

    const candidates = new Set();

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = this._cellKey(cx, cz);
        const bucket = this.grid.get(key);
        if (bucket) {
          for (const s of bucket) candidates.add(s);
        }
      }
    }

    // Filter by exact bounding box
    const results = [];
    for (const shop of candidates) {
      if (
        shop.bounds.maxX >= minX &&
        shop.bounds.minX <= maxX &&
        shop.bounds.maxZ >= minZ &&
        shop.bounds.minZ <= maxZ
      ) {
        results.push(shop);
      }
    }
    return results;
  }

  /**
   * Search shops by partial text match on name or ID
   * @param {string} query
   * @returns {Array<Object>}
   */
  search(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return this.allShops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }
}
