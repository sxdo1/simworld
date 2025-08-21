import * as THREE from 'three'

export class MathUtils {
  // Distance calculations
  static distance2D(a: THREE.Vector3, b: THREE.Vector3): number {
    const dx = a.x - b.x
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dz * dz)
  }

  static distance3D(a: THREE.Vector3, b: THREE.Vector3): number {
    return a.distanceTo(b)
  }

  // Interpolation
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  static lerpVector3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
    return new THREE.Vector3().lerpVectors(a, b, t)
  }

  // Bezier curve calculations for road construction
  static calculateBezierPoint(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
    const u = 1 - t
    const tt = t * t
    const uu = u * u
    const uuu = uu * u
    const ttt = tt * t

    const point = new THREE.Vector3()
    point.addScaledVector(p0, uuu)
    point.addScaledVector(p1, 3 * uu * t)
    point.addScaledVector(p2, 3 * u * tt)
    point.addScaledVector(p3, ttt)

    return point
  }

  // Generate smooth curve points for roads
  static generateCurvePoints(startPoint: THREE.Vector3, endPoint: THREE.Vector3, controlPoint1?: THREE.Vector3, controlPoint2?: THREE.Vector3, segments = 20): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    
    // Default control points if not provided
    if (!controlPoint1) {
      const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize()
      controlPoint1 = startPoint.clone().addScaledVector(direction, 0.33)
    }
    
    if (!controlPoint2) {
      const direction = new THREE.Vector3().subVectors(startPoint, endPoint).normalize()
      controlPoint2 = endPoint.clone().addScaledVector(direction, 0.33)
    }

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = this.calculateBezierPoint(t, startPoint, controlPoint1, controlPoint2, endPoint)
      points.push(point)
    }

    return points
  }

  // Grid and coordinate utilities
  static snapToGrid(position: THREE.Vector3, gridSize = 1): THREE.Vector3 {
    return new THREE.Vector3(
      Math.round(position.x / gridSize) * gridSize,
      position.y,
      Math.round(position.z / gridSize) * gridSize
    )
  }

  static worldToGrid(worldPosition: THREE.Vector3, gridSize = 1): { x: number, z: number } {
    return {
      x: Math.floor(worldPosition.x / gridSize),
      z: Math.floor(worldPosition.z / gridSize)
    }
  }

  static gridToWorld(gridX: number, gridZ: number, gridSize = 1): THREE.Vector3 {
    return new THREE.Vector3(gridX * gridSize, 0, gridZ * gridSize)
  }

  // Angle calculations
  static angleBetweenVectors(a: THREE.Vector3, b: THREE.Vector3): number {
    return Math.acos(a.dot(b) / (a.length() * b.length()))
  }

  static rotationFromDirection(direction: THREE.Vector3): number {
    return Math.atan2(direction.x, direction.z)
  }

  // Random utilities with deterministic seeding
  static seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  static randomInRange(min: number, max: number, seed?: number): number {
    const random = seed !== undefined ? this.seededRandom(seed) : Math.random()
    return min + random * (max - min)
  }

  static randomPointInCircle(center: THREE.Vector3, radius: number, seed?: number): THREE.Vector3 {
    const angle = this.randomInRange(0, Math.PI * 2, seed)
    const distance = this.randomInRange(0, radius, seed ? seed + 1 : undefined)
    return new THREE.Vector3(
      center.x + Math.cos(angle) * distance,
      center.y,
      center.z + Math.sin(angle) * distance
    )
  }

  // Terrain calculations
  static calculateSlope(point1: THREE.Vector3, point2: THREE.Vector3): number {
    const distance = this.distance2D(point1, point2)
    if (distance === 0) return 0
    const heightDifference = Math.abs(point2.y - point1.y)
    return heightDifference / distance
  }

  static calculateTerrainValue(position: THREE.Vector3, factors: {
    waterDistance?: number
    elevation?: number
    pollution?: number
    noise?: number
    scenic?: number
  }): number {
    let value = 0.5 // Base value

    // Water proximity bonus (closer = better)
    if (factors.waterDistance !== undefined) {
      const waterBonus = Math.max(0, (50 - factors.waterDistance) / 50) * 0.3
      value += waterBonus
    }

    // Elevation bonus (higher = better, up to a point)
    if (factors.elevation !== undefined) {
      const elevationBonus = Math.max(0, Math.min(1, factors.elevation / 20)) * 0.2
      value += elevationBonus
    }

    // Pollution penalty
    if (factors.pollution !== undefined) {
      value -= factors.pollution * 0.5
    }

    // Noise penalty
    if (factors.noise !== undefined) {
      value -= factors.noise * 0.3
    }

    // Scenic bonus
    if (factors.scenic !== undefined) {
      value += factors.scenic * 0.4
    }

    return Math.max(0, Math.min(1, value))
  }

  // Economic calculations
  static calculateSupplyDemandRatio(supply: number, demand: number): number {
    if (demand === 0) return supply > 0 ? Infinity : 1
    return supply / demand
  }

  static calculatePriceFromSupplyDemand(basePrice: number, supply: number, demand: number): number {
    const ratio = this.calculateSupplyDemandRatio(supply, demand)
    const multiplier = Math.max(0.5, Math.min(3, 2 - ratio))
    return basePrice * multiplier
  }

  // Pathfinding utilities
  static calculateManhattanDistance(a: THREE.Vector3, b: THREE.Vector3): number {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z)
  }

  static getNeighbors(position: THREE.Vector3, gridSize = 1): THREE.Vector3[] {
    const neighbors: THREE.Vector3[] = []
    const offsets = [
      { x: -1, z: 0 }, { x: 1, z: 0 },
      { x: 0, z: -1 }, { x: 0, z: 1 },
      { x: -1, z: -1 }, { x: 1, z: -1 },
      { x: -1, z: 1 }, { x: 1, z: 1 }
    ]

    for (const offset of offsets) {
      neighbors.push(new THREE.Vector3(
        position.x + offset.x * gridSize,
        position.y,
        position.z + offset.z * gridSize
      ))
    }

    return neighbors
  }
}
