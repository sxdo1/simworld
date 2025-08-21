import { useGameStore } from '../../stores/gameStore'
import { useEconomyStore } from '../../stores/economyStore'
import { ToolPanel } from './ToolPanel'
import { InfoPanel } from './InfoPanel'
import { EconomyPanel } from './EconomyPanel'
import { DebugPanel } from './DebugPanel'

export function GameUI() {
  const { 
    gameTime, 
    cityStats,
    selectedTool,
    showDebug,
    speed,
    phase,
    dayCount
  } = useGameStore()

  const {
    funds,
    totalLoans,
    netIncome
  } = useEconomyStore()

  // Convert game time to hours and minutes
  const totalMinutes = Math.floor(gameTime)
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1000,
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Top Status Bar */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9))',
        padding: '12px 20px',
        borderRadius: '12px',
        pointerEvents: 'auto',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
          {cityStats.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>👥</span>
          <span>{cityStats.population.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>💰</span>
          <span style={{ color: funds >= 0 ? '#4ade80' : '#ef4444' }}>
            ${funds.toLocaleString()}
          </span>
        </div>
        {totalLoans > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏛️</span>
            <span style={{ color: '#fbbf24' }}>
              -${totalLoans.toLocaleString()}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📈</span>
          <span style={{ color: netIncome >= 0 ? '#4ade80' : '#ef4444' }}>
            {netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString()}/mo
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{phase === 'day' ? '☀️' : '🌙'}</span>
          <span>Day {dayCount}</span>
          <span>{formatTime(hours, minutes)}</span>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          color: speed === 'paused' ? '#ef4444' : speed === 'fast' ? '#fbbf24' : '#4ade80'
        }}>
          <span>
            {speed === 'paused' ? '⏸️' : speed === 'slow' ? '▶️' : speed === 'fast' ? '⏩' : speed === 'ultra' ? '⏭️' : '▶️'}
          </span>
          <span style={{ fontSize: '12px', textTransform: 'uppercase' }}>
            {speed}
          </span>
        </div>
      </div>

      {/* Selected Tool Indicator */}
      {selectedTool && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '8px 16px',
          borderRadius: '8px',
          pointerEvents: 'auto',
          fontSize: '14px'
        }}>
          Selected: {selectedTool.replace('_', ' ').toUpperCase()}
        </div>
      )}

      {/* Left Tool Panel */}
      <ToolPanel />

      {/* Right Info Panel */}
      <InfoPanel />

      {/* Bottom Economy Panel */}
      <EconomyPanel />

      {/* Debug Panel (Development only) */}
      {process.env.NODE_ENV === 'development' && showDebug && <DebugPanel />}

      {/* Controls Help */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        pointerEvents: 'auto',
        maxWidth: '200px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Controls:</div>
        <div>WASD/Arrow Keys: Move Camera</div>
        <div>Mouse: Rotate & Zoom</div>
        <div>Click: Place Selected Tool</div>
        <div>E: Action/Info</div>
        <div>P: Pause/Resume</div>
        <div>F3: Toggle Debug</div>
      </div>

      {/* Happiness & City Stats Indicators */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '12px',
        borderRadius: '8px',
        pointerEvents: 'auto',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>City Health</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span>😊</span>
          <div style={{ 
            width: '60px', 
            height: '4px', 
            background: '#333', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${cityStats.happiness}%`,
              height: '100%',
              background: cityStats.happiness > 70 ? '#4ade80' : cityStats.happiness > 40 ? '#fbbf24' : '#ef4444',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span>{cityStats.happiness}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span>💼</span>
          <div style={{ 
            width: '60px', 
            height: '4px', 
            background: '#333', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${cityStats.employment}%`,
              height: '100%',
              background: cityStats.employment > 70 ? '#4ade80' : cityStats.employment > 40 ? '#fbbf24' : '#ef4444',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span>{cityStats.employment}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span>🎓</span>
          <div style={{ 
            width: '60px', 
            height: '4px', 
            background: '#333', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${cityStats.education}%`,
              height: '100%',
              background: cityStats.education > 70 ? '#4ade80' : cityStats.education > 40 ? '#fbbf24' : '#ef4444',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span>{cityStats.education}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🌱</span>
          <div style={{ 
            width: '60px', 
            height: '4px', 
            background: '#333', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${cityStats.environment}%`,
              height: '100%',
              background: cityStats.environment > 70 ? '#4ade80' : cityStats.environment > 40 ? '#fbbf24' : '#ef4444',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span>{cityStats.environment}%</span>
        </div>
      </div>
    </div>
  )
}
