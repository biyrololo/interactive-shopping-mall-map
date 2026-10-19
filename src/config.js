/**
 * Global Configuration for WebGL Shopping Mall Interactive Map
 */
export const CONFIG = {
  // Mall dimensions & packing
  TOTAL_SHOPS: 100,
  SHOP_HEIGHT_3D: 2.0,
  SHOP_HEIGHT_2D: 0.08,
  SHOP_MIN_WIDTH: 3.0,
  SHOP_MAX_WIDTH: 7.5,
  SHOP_MIN_DEPTH: 3.0,
  SHOP_MAX_DEPTH: 6.5,
  SHOP_PADDING: 0.6,       // Space between shops in the same block
  AISLE_WIDTH: 4.0,        // Width of walking corridors between shop blocks
  CROSS_AISLE_WIDTH: 5.0,  // Central cross boulevard walkway
  FLOOR_PADDING: 6.0,      // Padding around entire mall floor

  // Camera Settings
  TRANSITION_DURATION: 1.1, // seconds
  CAMERA: {
    // 3D Perspective Mode
    PERSPECTIVE: {
      fov: 48,
      near: 0.5,
      far: 1000,
      position: { x: 0, y: 55, z: 65 },
      target: { x: 0, y: 0, z: 0 }
    },
    // 2D Orthographic Mode
    ORTHOGRAPHIC: {
      near: 0.1,
      far: 1000,
      frustumSize: 90,
      position: { x: 0, y: 80, z: 0.001 }, // slight z offset to avoid gimbal ambiguity
      target: { x: 0, y: 0, z: 0 }
    }
  },

  // Visual Styling
  COLORS: {
    BACKGROUND: 0x0f141c,         // Dark architectural modern theme
    FLOOR: 0x1b2230,              // Main mall floor tile color
    FLOOR_GRID: 0x273349,         // Subtle corridor grid
    AISLE_PATH: 0x232c3d,         // Walking path fill
    SHOP_EDGE: 0xffffff,          // Top edge wireframe
    SHOP_EDGE_OPACITY: 0.25,
    HOVER_EMISSIVE: 0x334466,      // Hover glow
    SELECTION_OUTLINE: 0x00f0ff,  // Glowing cyan outline
    SELECTION_FILL: 0x00f0ff,
    SHADOW_COLOR: 0x000000
  },

  // Categories for realistic mall data
  CATEGORIES: [
    { name: 'Fashion & Apparel', color: 0x4d79ff, icon: '👕' },
    { name: 'Electronics & Tech', color: 0xff9900, icon: '📱' },
    { name: 'Food & Dining', color: 0xff5577, icon: '🍔' },
    { name: 'Beauty & Cosmetics', color: 0xdd55dd, icon: '💄' },
    { name: 'Sport & Outdoor', color: 0x22cc88, icon: '⚽' },
    { name: 'Jewelry & Watches', color: 0xf5b041, icon: '💎' },
    { name: 'Home & Lifestyle', color: 0x17a589, icon: '🛋️' },
    { name: 'Entertainment & Books', color: 0x9b59b6, icon: '🎮' }
  ]
};
