import * as THREE from 'three';

/**
 * Utility for generating high-DPI canvas textures for shop labels.
 * Handles edge cases like very long shop names via measurement & ellipsis truncation.
 */
export class CanvasTextGenerator {
  /**
   * Generates a CanvasTexture with shop name, category icon, and background badge.
   *
   * @param {Object} shop - PlacedShop object
   * @param {Object} options
   * @returns {THREE.CanvasTexture}
   */
  static createRoofLabelTexture(shop, options = {}) {
    const scale = 4; // High-DPI supersampling for crispness
    const width = Math.round(shop.width * 64 * scale);
    const depth = Math.round(shop.depth * 64 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(256, width);
    canvas.height = Math.max(128, depth);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Padding inside shop boundaries
    const pad = 12 * scale;
    const maxTextWidth = canvas.width - (pad * 2);

    // Font size dynamic based on shop dimensions
    const baseFontSize = Math.min(
      Math.max(14 * scale, Math.floor(shop.width * 3.5 * scale)),
      24 * scale
    );

    // Shop ID subtitle
    ctx.font = `600 ${Math.floor(baseFontSize * 0.55)}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${shop.categoryIcon} ${shop.id.toUpperCase()}`, canvas.width / 2, canvas.height / 2 - (baseFontSize * 0.75));

    // Shop Name with smart truncation for long names
    ctx.font = `bold ${baseFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';

    const truncatedName = this.truncateText(ctx, shop.name, maxTextWidth);
    ctx.fillText(truncatedName, canvas.width / 2, canvas.height / 2 + (baseFontSize * 0.4));

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;

    return texture;
  }

  /**
   * Generates a billboard sprite texture with glassmorphic badge.
   */
  static createSpriteBadgeTexture(shop) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 140;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw rounded badge background
    const x = 16;
    const y = 16;
    const w = canvas.width - 32;
    const h = canvas.height - 32;
    const radius = 24;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = shop.colorHex || '#38bdf8';
    ctx.stroke();

    // Category icon + ID
    ctx.font = '600 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${shop.categoryIcon} ${shop.id}`, canvas.width / 2, y + 32);

    // Shop Name
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f8fafc';
    const truncatedName = this.truncateText(ctx, shop.name, w - 48);
    ctx.fillText(truncatedName, canvas.width / 2, y + 72);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Measures text width and truncates with ellipsis '...' if it exceeds maxWidth.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} maxWidth
   * @returns {string}
   */
  static truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }

    const ellipsis = '...';
    const ellipsisWidth = ctx.measureText(ellipsis).width;

    if (ellipsisWidth >= maxWidth) {
      return ellipsis;
    }

    let low = 0;
    let high = text.length;
    let best = '';

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const sub = text.slice(0, mid);
      if (ctx.measureText(sub).width + ellipsisWidth <= maxWidth) {
        best = sub;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return best.trim() + ellipsis;
  }
}
