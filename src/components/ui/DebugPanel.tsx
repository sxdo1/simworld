import { useGameStore } from '../../stores/gameStore'
import { useTerrainStore } from '../../stores/terrainStore'
import { useEconomyStore } from '../../stores/economyStore'

export function DebugPanel() {
  const { 
    gameTime,
    buildings,
    roads,
    agents,
    speed,
    isInitialized,
    addDebugBuildings,
    addDebugAgents
  } = useGameStore()
  
  const { 
    terrainCells,
    isInitialized: terrainInitialized,
    calculateDevelopmentPressure
  } = useTerrainStore()
  
  const { 
    funds,
    businesses,
    addFunds
  } = useEconomyStore()

  return (
    <div style={{
      position: 'absolute',
      top: '120px',
      right: '20px',
      background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.9), rgba(101, 67, 33, 0.9))',
      borderRadius: '12px',
      padding: '16px',
      pointerEvents: 'auto',
      width: '280px',
      maxHeight: '60vh',
      overflowY: 'auto',
      backdropFilter: 'blur(10px)',
      border: '2px solid rgba(255, 165, 0, 0.3)',
      boxShadow: '0 6px 24px rgba(139, 69, 19, 0.4)',
      fontSize: '12px',
      color: '#fff'
    }}>
      <h3 style={{ 
        margin: '0 0 12px 0', 
        color: '#ffa500', 
        fontSize: '16px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        🐛 Debug Panel
      </h3>

      {/* System Status */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ 
          margin: '0 0 6px 0', 
          color: '#ffb347', 
          fontSize: '13px',
          fontWeight: '600'
        }}>
          🔧 System Status
        </h4>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          borderRadius: '6px', 
          padding: '8px',
          lineHeight: '1.4'
        }}>
          <div>Game Initialized: {isInitialized ? '✅' : '❌'}</div>
          <div>Terrain Initialized: {terrainInitialized ? '✅' : '❌'}</div>
          <div>Game Speed: {speed}</div>
          <div>Game Time: {Math.floor(gameTime / 60)}h {Math.floor(gameTime % 60)}m</div>
          <div>Frame Rate: ~60 FPS</div>
        </div>
      </div>

      {/* World Statistics */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ 
          margin: '0 0 6px 0', 
          color: '#ffb347', 
          fontSize: '13px',
          fontWeight: '600'
        }}>
          🌍 World Data
        </h4>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          borderRadius: '6px', 
          padding: '8px',
          lineHeight: '1.4'
        }}>
          <div>Buildings: {buildings.length}</div>
          <div>Roads: {roads.length} segments</div>
          <div>Agents: {agents.length}</div>
          <div>Terrain Cells: {terrainCells.size}</div>
          <div>Businesses: {businesses.length}</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ 
          margin: '0 0 6px 0', 
          color: '#ffb347', 
          fontSize: '13px',
          fontWeight: '600'
        }}>
        ⚡ Performance
        </h4>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          borderRadius: '6px', 
          padding: '8px',
          lineHeight: '1.4'
        }}>
          <div>Memory Usage: ~{Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB</div>
          <div>Render Calls: ~{buildings.length + roads.length}</div>
          <div>Active Simulations: {agents.length + businesses.length}</div>
        </div>
      </div>

      {/* Debug Actions */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ 
          margin: '0 0 6px 0', 
          color: '#ffb347', 
          fontSize: '13px',
          fontWeight: '600'
        }}>
          🛠️ Debug Actions
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
          <button
            onClick={() => addFunds(50000, 'Debug')}
            style={{
              background: 'rgba(74, 222, 128, 0.7)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              padding: '6px 8px',
              fontSize: '11px'
            }}
          >
            💰 Add $50,000
          </button>
          <button
            onClick={addDebugBuildings}
            style={{
              background: 'rgba(59, 130, 246, 0.7)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              padding: '6px 8px',
              fontSize: '11px'
            }}
          >
            🏗️ Add Test Buildings
          </button>
          <button
            onClick={addDebugAgents}
            style={{
              background: 'rgba(168, 85, 247, 0.7)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              padding: '6px 8px',
              fontSize: '11px'
            }}
          >
            👥 Add Test Agents
          </button>
          <button
            onClick={calculateDevelopmentPressure}
            style={{
              background: 'rgba(245, 158, 11, 0.7)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              padding: '6px 8px',
              fontSize: '11px'
            }}
          >
            📊 Recalc Terrain
          </button>
        </div>
      </div>

      {/* Economic Debug */}
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ 
          margin: '0 0 6px 0', 
          color: '#ffb347', 
          fontSize: '13px',
          fontWeight: '600'
        }}>
          💰 Economy Debug
        </h4>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          borderRadius: '6px', 
          padding: '8px',
          lineHeight: '1.4'
        }}>
          <div>Treasury: ${funds.toLocaleString()}</div>
          <div>Active Businesses: {businesses.filter(b => b.isOperational).length}</div>
          <div>Failed Businesses: {businesses.filter(b => !b.isOperational).length}</div>
        </div>
      </div>

      {/* Console Shortcut */}
      <div style={{
        background: 'rgba(255, 165, 0, 0.2)',
        borderRadius: '6px',
        padding: '8px',
        fontSize: '11px',
        color: '#ffb347',
        textAlign: 'center'
      }}>
        Open browser console (F12) for detailed logs
      </div>
    </div>
  )
}
