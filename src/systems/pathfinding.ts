import * as THREE from 'three'
import { MathUtils } from '../utils/mathUtils'

export interface PathfindingNode {
  position: THREE.Vector3
  gCost: number // Distance from start
  hCost: number // Heuristic distance to goal
  fCost: number // g + h
  parent: PathfindingNode | null
  isWalkable: boolean
}

export interface PathfindingGrid {
  nodes: PathfindingNode[][]
  width: number
  height: number
  cellSize: number
}

export class PathfindingSystem {
  private grid: PathfindingGrid
  private obstacles: Set<string>
  private roads: Set<string>

  constructor(worldSize: number, cellSize: number = 1) {
    this.obstacles = new Set()
    this.roads = new Set()
    
    const gridWidth = Math.ceil(worldSize / cellSize)
    const gridHeight = Math.ceil(worldSize / cellSize)
    
    this.grid = {
      nodes: [],
      width: gridWidth,
      height: gridHeight,
      cellSize
    }
    
    this.initializeGrid(worldSize, cellSize)
  }

  private initializeGrid(worldSize: number, cellSize: number): void {
    const halfSize = worldSize / 2
    
    for (let x = 0; x < this.grid.width; x++) {
      this.grid.nodes[x] = []
      for (let y = 0; y < this.grid.height; y++) {
        const worldX = -halfSize + (x + 0.5) * cellSize
        const worldZ = -halfSize + (y + 0.5) * cellSize
        
        this.grid.nodes[x][y] = {
          position: new THREE.Vector3(worldX, 0, worldZ),
          gCost: 0,
          hCost: 0,
          fCost: 0,
          parent: null,
          isWalkable: true
        }
      }
    }
    
    console.log(`🗺️ Initialized pathfinding grid: ${this.grid.width}x${this.grid.height}`)
  }

  public updateRoads(roadPoints: THREE.Vector3[][]): void {
    this.roads.clear()
    
    roadPoints.forEach(road => {
      for (let i = 0; i < road.length - 1; i++) {
        const start = road[i]
        const end = road[i + 1]
        const distance = start.distanceTo(end)
        const segments = Math.ceil(distance / this.grid.cellSize)
        
        for (let j = 0; j <= segments; j++) {
          const t = j / segments
          const point = new THREE.Vector3().lerpVectors(start, end, t)
          const gridPos = this.worldToGrid(point)
          
          if (this.isValidGridPosition(gridPos.x, gridPos.y)) {
            const key = `${gridPos.x},${gridPos.y}`
            this.roads.add(key)
            
            // Also mark adjacent cells as roads for wider paths
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                const adjX = gridPos.x + dx
                const adjY = gridPos.y + dy
                
                if (this.isValidGridPosition(adjX, adjY)) {
                  this.roads.add(`${adjX},${adjY}`)
                }
              }
            }
          }
        }
      }
    })
    
    console.log(`🛣️ Updated roads in pathfinding grid: ${this.roads.size} road cells`)
  }

  public updateObstacles(buildings: Array<{ position: THREE.Vector3, size?: { width: number, depth: number } }>): void {
    this.obstacles.clear()
    
    buildings.forEach(building => {
      const size = building.size || { width: 2, depth: 2 }
      const halfWidth = size.width / 2
      const halfDepth = size.depth / 2
      
      // Mark all cells occupied by the building as obstacles
      const minX = building.position.x - halfWidth
      const maxX = building.position.x + halfWidth
      const minZ = building.position.z - halfDepth
      const maxZ = building.position.z + halfDepth
      
      for (let x = minX; x <= maxX; x += this.grid.cellSize / 2) {
        for (let z = minZ; z <= maxZ; z += this.grid.cellSize / 2) {
          const gridPos = this.worldToGrid(new THREE.Vector3(x, 0, z))
          
          if (this.isValidGridPosition(gridPos.x, gridPos.y)) {
            this.obstacles.add(`${gridPos.x},${gridPos.y}`)
            
            if (this.grid.nodes[gridPos.x] && this.grid.nodes[gridPos.x][gridPos.y]) {
              this.grid.nodes[gridPos.x][gridPos.y].isWalkable = false
            }
          }
        }
      }
    })
    
    // Update walkability for all nodes
    for (let x = 0; x < this.grid.width; x++) {
      for (let y = 0; y < this.grid.height; y++) {
        const key = `${x},${y}`
        const node = this.grid.nodes[x][y]
        
        if (this.obstacles.has(key)) {
          node.isWalkable = false
        } else {
          node.isWalkable = true
        }
      }
    }
    
    console.log(`🏢 Updated obstacles in pathfinding grid: ${this.obstacles.size} obstacle cells`)
  }

  public findPath(startPos: THREE.Vector3, endPos: THREE.Vector3): THREE.Vector3[] {
    const startGrid = this.worldToGrid(startPos)
    const endGrid = this.worldToGrid(endPos)
    
    if (!this.isValidGridPosition(startGrid.x, startGrid.y) || 
        !this.isValidGridPosition(endGrid.x, endGrid.y)) {
      return this.generateDirectPath(startPos, endPos)
    }
    
    const startNode = this.grid.nodes[startGrid.x][startGrid.y]
    const endNode = this.grid.nodes[endGrid.x][endGrid.y]
    
    if (!startNode.isWalkable || !endNode.isWalkable) {
      return this.generateDirectPath(startPos, endPos)
    }
    
    const path = this.aStarSearch(startNode, endNode)
    
    if (path.length === 0) {
      return this.generateDirectPath(startPos, endPos)
    }
    
    return this.smoothPath(path)
  }

  private aStarSearch(startNode: PathfindingNode, endNode: PathfindingNode): THREE.Vector3[] {
    const openSet: PathfindingNode[] = [startNode]
    const closedSet: Set<PathfindingNode> = new Set()
    
    // Reset node costs
    for (let x = 0; x < this.grid.width; x++) {
      for (let y = 0; y < this.grid.height; y++) {
        const node = this.grid.nodes[x][y]
        node.gCost = Infinity
        node.hCost = 0
        node.fCost = 0
        node.parent = null
      }
    }
    
    startNode.gCost = 0
    startNode.hCost = this.calculateHeuristic(startNode, endNode)
    startNode.fCost = startNode.gCost + startNode.hCost
    
    while (openSet.length > 0) {
      // Find node with lowest fCost
      let currentNode = openSet[0]
      let currentIndex = 0
      
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].fCost < currentNode.fCost || 
           (openSet[i].fCost === currentNode.fCost && openSet[i].hCost < currentNode.hCost)) {
          currentNode = openSet[i]
          currentIndex = i
        }
      }
      
      openSet.splice(currentIndex, 1)
      closedSet.add(currentNode)
      
      // Check if we reached the goal
      if (currentNode === endNode) {
        return this.reconstructPath(endNode)
      }
      
      // Check neighbors
      const neighbors = this.getNeighbors(currentNode)
      
      for (const neighbor of neighbors) {
        if (!neighbor.isWalkable || closedSet.has(neighbor)) {
          continue
        }
        
        const tentativeGCost = currentNode.gCost + this.calculateDistance(currentNode, neighbor)
        
        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor)
        } else if (tentativeGCost >= neighbor.gCost) {
          continue
        }
        
        neighbor.parent = currentNode
        neighbor.gCost = tentativeGCost
        neighbor.hCost = this.calculateHeuristic(neighbor, endNode)
        neighbor.fCost = neighbor.gCost + neighbor.hCost
      }
    }
    
    return [] // No path found
  }

  private getNeighbors(node: PathfindingNode): PathfindingNode[] {
    const neighbors: PathfindingNode[] = []
    const gridPos = this.worldToGrid(node.position)
    
    const offsets = [
      { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }, // Cardinal directions
      { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }  // Diagonal directions
    ]
    
    for (const offset of offsets) {
      const neighborX = gridPos.x + offset.x
      const neighborY = gridPos.y + offset.y
      
      if (this.isValidGridPosition(neighborX, neighborY)) {
        neighbors.push(this.grid.nodes[neighborX][neighborY])
      }
    }
    
    return neighbors
  }

  private calculateHeuristic(nodeA: PathfindingNode, nodeB: PathfindingNode): number {
    // Manhattan distance with diagonal movement allowed
    const dx = Math.abs(nodeA.position.x - nodeB.position.x)
    const dz = Math.abs(nodeA.position.z - nodeB.position.z)
    
    // Octile distance (combines Manhattan and diagonal movement)
    return Math.max(dx, dz) + (Math.sqrt(2) - 1) * Math.min(dx, dz)
  }

  private calculateDistance(nodeA: PathfindingNode, nodeB: PathfindingNode): number {
    const dx = Math.abs(nodeA.position.x - nodeB.position.x)
    const dz = Math.abs(nodeA.position.z - nodeB.position.z)
    
    // Prefer roads for movement
    const nodeKey = this.worldToGrid(nodeB.position)
    const isRoad = this.roads.has(`${nodeKey.x},${nodeKey.y}`)
    const roadBonus = isRoad ? 0.5 : 1.0 // Roads are faster
    
    return Math.sqrt(dx * dx + dz * dz) * roadBonus
  }

  private reconstructPath(endNode: PathfindingNode): THREE.Vector3[] {
    const path: THREE.Vector3[] = []
    let currentNode: PathfindingNode | null = endNode
    
    while (currentNode !== null) {
      path.unshift(currentNode.position.clone())
      currentNode = currentNode.parent
    }
    
    return path
  }

  private smoothPath(path: THREE.Vector3[]): THREE.Vector3[] {
    if (path.length <= 2) return path
    
    const smoothed: THREE.Vector3[] = [path[0]]
    let currentIndex = 0
    
    while (currentIndex < path.length - 1) {
      let farthestIndex = currentIndex + 1
      
      // Find the farthest point we can reach directly
      for (let i = currentIndex + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[currentIndex], path[i])) {
          farthestIndex = i
        } else {
          break
        }
      }
      
      smoothed.push(path[farthestIndex])
      currentIndex = farthestIndex
    }
    
    return smoothed
  }

  private hasLineOfSight(start: THREE.Vector3, end: THREE.Vector3): boolean {
    const distance = start.distanceTo(end)
    const steps = Math.ceil(distance / (this.grid.cellSize / 2))
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const point = new THREE.Vector3().lerpVectors(start, end, t)
      const gridPos = this.worldToGrid(point)
      
      if (!this.isValidGridPosition(gridPos.x, gridPos.y)) return false
      
      const key = `${gridPos.x},${gridPos.y}`
      if (this.obstacles.has(key)) return false
    }
    
    return true
  }

  private generateDirectPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] {
    const distance = start.distanceTo(end)
    const segments = Math.max(2, Math.floor(distance / 5))
    const path: THREE.Vector3[] = []
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = new THREE.Vector3().lerpVectors(start, end, t)
      point.y = 0.5 // Keep above ground
      path.push(point)
    }
    
    return path
  }

  private worldToGrid(worldPos: THREE.Vector3): { x: number, y: number } {
    const halfWidth = (this.grid.width * this.grid.cellSize) / 2
    const halfHeight = (this.grid.height * this.grid.cellSize) / 2
    
    const x = Math.floor((worldPos.x + halfWidth) / this.grid.cellSize)
    const z = Math.floor((worldPos.z + halfHeight) / this.grid.cellSize)
    
    return { x: Math.max(0, Math.min(this.grid.width - 1, x)), 
             y: Math.max(0, Math.min(this.grid.height - 1, z)) }
  }

  private isValidGridPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.grid.width && y >= 0 && y < this.grid.height
  }

  public getGridSize(): { width: number, height: number } {
    return { width: this.grid.width, height: this.grid.height }
  }

  public isPositionWalkable(worldPos: THREE.Vector3): boolean {
    const gridPos = this.worldToGrid(worldPos)
    
    if (!this.isValidGridPosition(gridPos.x, gridPos.y)) {
      return false
    }
    
    return this.grid.nodes[gridPos.x][gridPos.y].isWalkable
  }

  public getNearestWalkablePosition(worldPos: THREE.Vector3): THREE.Vector3 {
    const gridPos = this.worldToGrid(worldPos)
    
    // Spiral outward to find nearest walkable position
    const maxRadius = 10
    
    for (let radius = 0; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const x = gridPos.x + dx
            const y = gridPos.y + dy
            
            if (this.isValidGridPosition(x, y) && this.grid.nodes[x][y].isWalkable) {
              return this.grid.nodes[x][y].position.clone()
            }
          }
        }
      }
    }
    
    return worldPos // Return original if no walkable position found
  }

  public getPathfindingDebugInfo(): {
    totalNodes: number
    walkableNodes: number
    obstacles: number
    roads: number
  } {
    let walkableCount = 0
    
    for (let x = 0; x < this.grid.width; x++) {
      for (let y = 0; y < this.grid.height; y++) {
        if (this.grid.nodes[x][y].isWalkable) {
          walkableCount++
        }
      }
    }
    
    return {
      totalNodes: this.grid.width * this.grid.height,
      walkableNodes: walkableCount,
      obstacles: this.obstacles.size,
      roads: this.roads.size
    }
  }
}
