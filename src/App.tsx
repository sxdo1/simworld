import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { GameScene } from './components/GameScene'
import { GameUI } from './components/ui/GameUI'
import { Controls } from './types/controls'

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.jump, keys: ['Space'] },
  { name: Controls.run, keys: ['ShiftLeft'] },
  { name: Controls.action, keys: ['KeyE'] },
  { name: Controls.place, keys: ['LeftClick'] },
  { name: Controls.cancel, keys: ['Escape'] },
  { name: Controls.pause, keys: ['KeyP'] },
  { name: Controls.debug, keys: ['F3'] },
]

function App() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative',
      background: '#000',
      overflow: 'hidden'
    }}>
      <KeyboardControls map={keyMap}>
        <Canvas
          camera={{ 
            position: [30, 25, 30], 
            fov: 60,
            near: 0.1,
            far: 2000 
          }}
          shadows
          gl={{
            antialias: true,
            powerPreference: "high-performance"
          }}
          style={{ 
            background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)' 
          }}
        >
          <Suspense fallback={null}>
            <GameScene />
          </Suspense>
        </Canvas>
        <GameUI />
      </KeyboardControls>
    </div>
  )
}

export default App
