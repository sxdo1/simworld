import { useGameStore } from '../../stores/gameStore'
import { useEconomyStore } from '../../stores/economyStore'

export function ToolPanel() {
  const { tools, selectedTool, selectTool, setGameSpeed, speed } = useGameStore()
  const { funds } = useEconomyStore()

  const categories = [
    { id: 'zones', name: 'Zoning', icon: '🏘️' },
    { id: 'roads', name: 'Roads', icon: '🛣️' },
    { id: 'services', name: 'Services', icon: '🏛️' },
    { id: 'utilities', name: 'Utilities', icon: '⚡' },
    { id: 'tools', name: 'Tools', icon: '🛠️' }
  ]

  const speedOptions = [
    { id: 'paused', name: 'Pause', icon: '⏸️' },
    { id: 'slow', name: 'Slow', icon: '▶️' },
    { id: 'normal', name: 'Normal', icon: '⏩' },
    { id: 'fast', name: 'Fast', icon: '⏭️' },
    { id: 'ultra', name: 'Ultra', icon: '🚀' }
  ]

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '20px',
      transform: 'translateY(-50%)',
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9))',
      borderRadius: '16px',
      padding: '20px',
      pointerEvents: 'auto',
      width: '280px',
      maxHeight: '80vh',
      overflowY: 'auto',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        color: '#fff', 
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        🏗️ City Tools
      </h3>

      {/* Game Speed Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          color: '#ccc', 
          fontSize: '14px',
          fontWeight: '600'
        }}>
          Game Speed
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '4px' 
        }}>
          {speedOptions.map(speedOption => (
            <button
              key={speedOption.id}
              onClick={() => setGameSpeed(speedOption.id as any)}
              style={{
                background: speed === speedOption.id 
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' 
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 4px',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
              onMouseEnter={(e) => {
                if (speed !== speedOption.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (speed !== speedOption.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <span style={{ fontSize: '14px' }}>{speedOption.icon}</span>
              <span style={{ fontSize: '10px' }}>{speedOption.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool Categories */}
      {categories.map(category => {
        const categoryTools = tools.filter(tool => tool.category === category.id)
        
        if (categoryTools.length === 0) return null

        return (
          <div key={category.id} style={{ marginBottom: '20px' }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              color: '#ccc', 
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{category.icon}</span>
              {category.name}
            </h4>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '8px' 
            }}>
              {categoryTools.map(tool => {
                const isSelected = selectedTool === tool.id
                const canAfford = !tool.cost || funds >= tool.cost
                const isDisabled = tool.cost && !canAfford

                return (
                  <button
                    key={tool.id}
                    onClick={() => !isDisabled && selectTool(tool.id)}
                    disabled={isDisabled}
                    title={tool.description}
                    style={{
                      background: isSelected 
                        ? 'linear-gradient(135deg, #10b981, #059669)' 
                        : isDisabled
                        ? 'rgba(127, 127, 127, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px',
                      color: isDisabled ? '#666' : '#fff',
                      fontSize: '12px',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      minHeight: '60px',
                      opacity: isDisabled ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isDisabled) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isDisabled) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{tool.icon}</span>
                    <span style={{ 
                      fontWeight: '500',
                      textAlign: 'center',
                      lineHeight: '1.2'
                    }}>
                      {tool.name}
                    </span>
                    {tool.cost && (
                      <span style={{ 
                        fontSize: '10px', 
                        color: canAfford ? '#4ade80' : '#ef4444',
                        fontWeight: '600'
                      }}>
                        ${tool.cost.toLocaleString()}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Quick Stats */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#ccc'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Quick Stats</div>
        <div>Buildings: {/* would get from store */}12</div>
        <div>Roads: {/* would get from store */}5.2 km</div>
        <div>Zones: {/* would get from store */}8 areas</div>
      </div>
    </div>
  )
}
