import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Creates the architectural floor baseplate, corridors, and floor grid for the mall.
 */
export class FloorPlan {
  /**
   * @param {Object} floorBounds - Bounds of the mall floor
   * @param {Array<Object>} aisles - Corridor definitions from packer
   */
  constructor(floorBounds, aisles = []) {
    this.floorBounds = floorBounds;
    this.aisles = aisles;
    this.group = new THREE.Group();
    this.group.name = 'FloorPlanGroup';

    this._buildFloor();
    this._buildCorridors();
    this._buildPerimeterWall();
  }

  _buildFloor() {
    const { width, depth } = this.floorBounds;

    // Main floor baseplate
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.FLOOR,
      roughness: 0.85,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2
    });

    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.01;
    floorMesh.receiveShadow = true;
    floorMesh.name = 'MallFloorBase';
    this.group.add(floorMesh);

    // Subtle architectural grid on floor
    const gridHelper = new THREE.GridHelper(
      Math.max(width, depth),
      Math.round(Math.max(width, depth) / 4),
      CONFIG.COLORS.FLOOR_GRID,
      CONFIG.COLORS.FLOOR_GRID
    );
    gridHelper.position.y = 0.005;
    // Lower opacity on grid
    if (gridHelper.material) {
      gridHelper.material.opacity = 0.35;
      gridHelper.material.transparent = true;
    }
    this.group.add(gridHelper);
  }

  _buildCorridors() {
    // Render pedestrian walkway highlight strips along aisles
    const aisleMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.AISLE_PATH,
      roughness: 0.9,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    for (const aisle of this.aisles) {
      const geo = new THREE.PlaneGeometry(aisle.width, aisle.depth * 0.85);
      const mesh = new THREE.Mesh(geo, aisleMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, 0.002, aisle.z);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    // Central Grand Boulevard
    const centralBoulevardGeo = new THREE.PlaneGeometry(
      CONFIG.CROSS_AISLE_WIDTH * 0.9,
      this.floorBounds.depth * 0.95
    );
    const boulevardMesh = new THREE.Mesh(centralBoulevardGeo, aisleMat);
    boulevardMesh.rotation.x = -Math.PI / 2;
    boulevardMesh.position.set(0, 0.0025, 0);
    boulevardMesh.receiveShadow = true;
    this.group.add(boulevardMesh);
  }

  _buildPerimeterWall() {
    // Subtle outer border / plinth around mall floor
    const { width, depth } = this.floorBounds;
    const borderThickness = 0.4;
    const borderHeight = 0.3;

    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.2
    });

    // Outer boundary line
    const points = [
      new THREE.Vector3(-width / 2, 0.01, -depth / 2),
      new THREE.Vector3(width / 2, 0.01, -depth / 2),
      new THREE.Vector3(width / 2, 0.01, depth / 2),
      new THREE.Vector3(-width / 2, 0.01, depth / 2),
      new THREE.Vector3(-width / 2, 0.01, -depth / 2)
    ];

    const borderGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x475569,
      linewidth: 2
    });
    const borderLine = new THREE.Line(borderGeo, lineMat);
    this.group.add(borderLine);
  }

  getGroup() {
    return this.group;
  }
}
