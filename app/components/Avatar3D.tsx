'use client'

import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ── Face texture (flat plane, no UV distortion) ─────────── */
function buildFaceTexture(gender: string, accent: string): THREE.CanvasTexture {
  const S = 512
  const cv = document.createElement('canvas')
  cv.width = S; cv.height = S
  const c = cv.getContext('2d')!
  const mx = S / 2, my = S / 2

  c.clearRect(0, 0, S, S)

  /* face oval clipped region */
  c.save()
  c.beginPath()
  c.ellipse(mx, my * 0.97, 222, 244, 0, 0, Math.PI * 2)
  c.clip()
  const fg = c.createRadialGradient(mx - 28, my - 70, 10, mx, my, 238)
  fg.addColorStop(0,   '#FDDBB4')
  fg.addColorStop(0.6, '#EEC08A')
  fg.addColorStop(1,   '#C88050')
  c.fillStyle = fg
  c.fillRect(0, 0, S, S)
  c.restore()

  /* eyebrows */
  const brow = (sx: number, sy: number, ex: number, ey: number) => {
    c.save()
    c.strokeStyle = '#1A0F06'
    c.lineWidth = gender === 'female' ? 9 : 13
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(sx, sy)
    c.quadraticCurveTo((sx + ex) / 2, Math.min(sy, ey) - 16, ex, ey)
    c.stroke()
    c.restore()
  }
  brow(mx - 135, my - 88, mx - 28, my - 108)
  brow(mx +  28, my - 108, mx + 135, my - 88)

  /* eyes */
  const eye = (ex: number, ey: number, r: number) => {
    c.fillStyle = 'white'
    c.beginPath(); c.ellipse(ex, ey, r * 1.52, r, 0, 0, Math.PI * 2); c.fill()

    const ig = c.createRadialGradient(ex - r * .25, ey - r * .3, 0, ex, ey, r)
    ig.addColorStop(0, '#7A5030'); ig.addColorStop(.45, '#3E2010'); ig.addColorStop(1, '#0C0604')
    c.fillStyle = ig; c.beginPath(); c.arc(ex, ey, r, 0, Math.PI * 2); c.fill()

    c.fillStyle = '#060302'; c.beginPath(); c.arc(ex, ey, r * .55, 0, Math.PI * 2); c.fill()

    c.strokeStyle = accent; c.lineWidth = 2.5; c.globalAlpha = .22
    c.beginPath(); c.arc(ex, ey, r * .88, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1

    c.fillStyle = 'rgba(255,255,255,.97)'
    c.beginPath(); c.ellipse(ex + r*.28, ey - r*.36, r*.44, r*.32, -.3, 0, Math.PI*2); c.fill()
    c.fillStyle = 'rgba(255,255,255,.62)'
    c.beginPath(); c.arc(ex - r*.32, ey + r*.32, r*.18, 0, Math.PI*2); c.fill()

    c.strokeStyle = '#0A0402'; c.lineWidth = r * .36; c.lineCap = 'round'
    c.beginPath()
    c.moveTo(ex - r * 1.46, ey + r * .1)
    c.quadraticCurveTo(ex, ey - r * 1.32, ex + r * 1.46, ey - r * .3)
    c.stroke()
    c.lineWidth = r * .2
    c.beginPath(); c.moveTo(ex + r * 1.44, ey - r * .3); c.lineTo(ex + r * 1.9, ey + r * .44); c.stroke()

    c.strokeStyle = '#3A1A08'; c.lineWidth = r * .14; c.globalAlpha = .52
    c.beginPath()
    c.moveTo(ex - r * 1.36, ey + r * .15)
    c.quadraticCurveTo(ex, ey + r * 1.12, ex + r * 1.32, ey + r * .44)
    c.stroke(); c.globalAlpha = 1
  }

  const er = gender === 'female' ? 48 : 42
  eye(mx - 98, my - 28, er)
  eye(mx + 98, my - 28, er)

  /* nose */
  c.strokeStyle = '#C08858'; c.lineWidth = 4; c.lineCap = 'round'; c.globalAlpha = .35
  c.beginPath(); c.moveTo(mx - 18, my + 88); c.quadraticCurveTo(mx, my + 108, mx + 18, my + 88); c.stroke()
  c.globalAlpha = 1

  /* lips */
  if (gender === 'female') {
    c.fillStyle = '#D87070'
    c.beginPath()
    c.moveTo(mx - 74, my + 158); c.quadraticCurveTo(mx, my + 138, mx + 74, my + 158)
    c.quadraticCurveTo(mx + 42, my + 196, mx, my + 202)
    c.quadraticCurveTo(mx - 42, my + 196, mx - 74, my + 158); c.fill()
    c.fillStyle = '#EE9090'
    c.beginPath()
    c.moveTo(mx - 70, my + 158); c.quadraticCurveTo(mx - 26, my + 140, mx, my + 146)
    c.quadraticCurveTo(mx + 26, my + 140, mx + 70, my + 158); c.fill()
    c.strokeStyle = 'rgba(255,255,255,.52)'; c.lineWidth = 6
    c.beginPath(); c.moveTo(mx - 42, my + 143); c.quadraticCurveTo(mx, my + 136, mx + 42, my + 143); c.stroke()
  } else {
    c.fillStyle = '#C47060'
    c.beginPath()
    c.moveTo(mx - 62, my + 154); c.quadraticCurveTo(mx, my + 136, mx + 62, my + 154)
    c.quadraticCurveTo(mx + 36, my + 186, mx, my + 190)
    c.quadraticCurveTo(mx - 36, my + 186, mx - 62, my + 154); c.fill()
    c.fillStyle = '#D88070'
    c.beginPath(); c.moveTo(mx - 58, my + 154); c.quadraticCurveTo(mx, my + 138, mx + 58, my + 154); c.fill()
  }

  /* blush */
  c.fillStyle = 'rgba(255,182,193,.30)'
  c.beginPath(); c.ellipse(mx - 155, my + 60, 86, 42, -.15, 0, Math.PI * 2); c.fill()
  c.beginPath(); c.ellipse(mx + 155, my + 60, 86, 42, .15, 0, Math.PI * 2); c.fill()

  const t = new THREE.CanvasTexture(cv)
  t.needsUpdate = true
  return t
}

/* ── 3D character ─────────────────────────────────────────── */
type CProps = { gender: string; outfit: string; aura: string }

function Character({ gender, outfit, aura }: CProps) {
  const root = useRef<THREE.Group>(null)
  const isFemale = gender === 'female'

  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.position.y = Math.sin(clock.elapsedTime * 1.3) * 0.03
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.45) * 0.07
  })

  const gradMap = useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = 3; cv.height = 1
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#303030'; ctx.fillRect(0, 0, 1, 1)
    ctx.fillStyle = '#909090'; ctx.fillRect(1, 0, 1, 1)
    ctx.fillStyle = '#ffffff'; ctx.fillRect(2, 0, 1, 1)
    const t = new THREE.CanvasTexture(cv)
    t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter
    return t
  }, [])

  const faceTex = useMemo(() => buildFaceTexture(gender, outfit), [gender, outfit])

  const skin = () => ({ color: '#FDDBB4', gradientMap: gradMap })
  const hair = () => ({ color: '#1A0F06', gradientMap: gradMap })
  const out  = () => ({ color: outfit,    gradientMap: gradMap })
  const dk   = (c: string) => ({ color: c, gradientMap: gradMap })

  /*
   * Layout (y = world space, group has no offset):
   *   0.00  ground
   *   0.10  shoe sole center
   *   0.55  knee
   *   1.00  hip
   *   1.00–1.58  skirt (cylinder, flares at hem)
   *   1.00–2.05  torso (capsule, narrow)
   *   2.05  shoulder / arm attachment
   *   2.18  neck center
   *   2.40  head center
   *   2.88  hair top
   */

  return (
    <group ref={root}>

      {/* ── SHOES ── */}
      {isFemale ? <>
        {/* left heeled sandal */}
        <mesh position={[-0.145, 0.07, 0.05]}>
          <boxGeometry args={[0.155, 0.065, 0.28]} />
          <meshToonMaterial {...dk('#181818')} />
        </mesh>
        <mesh position={[-0.145, 0.02, -0.07]}>
          <boxGeometry args={[0.055, 0.1, 0.055]} />
          <meshToonMaterial {...dk('#101010')} />
        </mesh>
        <mesh position={[-0.145, 0.10, 0.10]}>
          <boxGeometry args={[0.16, 0.035, 0.04]} />
          <meshToonMaterial color={outfit} gradientMap={gradMap} />
        </mesh>
        {/* right heeled sandal */}
        <mesh position={[0.145, 0.07, 0.05]}>
          <boxGeometry args={[0.155, 0.065, 0.28]} />
          <meshToonMaterial {...dk('#181818')} />
        </mesh>
        <mesh position={[0.145, 0.02, -0.07]}>
          <boxGeometry args={[0.055, 0.1, 0.055]} />
          <meshToonMaterial {...dk('#101010')} />
        </mesh>
        <mesh position={[0.145, 0.10, 0.10]}>
          <boxGeometry args={[0.16, 0.035, 0.04]} />
          <meshToonMaterial color={outfit} gradientMap={gradMap} />
        </mesh>
      </> : <>
        {/* left sneaker */}
        <mesh position={[-0.155, 0.08, 0.06]}>
          <boxGeometry args={[0.19, 0.09, 0.34]} />
          <meshToonMaterial {...dk('#1C1C1C')} />
        </mesh>
        <mesh position={[-0.155, 0.115, 0.06]}>
          <boxGeometry args={[0.20, 0.028, 0.35]} />
          <meshToonMaterial color={aura} gradientMap={gradMap} />
        </mesh>
        {/* right sneaker */}
        <mesh position={[0.155, 0.08, 0.06]}>
          <boxGeometry args={[0.19, 0.09, 0.34]} />
          <meshToonMaterial {...dk('#1C1C1C')} />
        </mesh>
        <mesh position={[0.155, 0.115, 0.06]}>
          <boxGeometry args={[0.20, 0.028, 0.35]} />
          <meshToonMaterial color={aura} gradientMap={gradMap} />
        </mesh>
      </>}

      {/* ── LEGS ── */}
      {isFemale ? <>
        <mesh position={[-0.145, 0.54, 0]}>
          <capsuleGeometry args={[0.09, 0.70, 4, 16]} />
          <meshToonMaterial {...skin()} />
        </mesh>
        <mesh position={[0.145, 0.54, 0]}>
          <capsuleGeometry args={[0.09, 0.70, 4, 16]} />
          <meshToonMaterial {...skin()} />
        </mesh>
      </> : <>
        <mesh position={[-0.15, 0.56, 0]}>
          <capsuleGeometry args={[0.11, 0.76, 4, 16]} />
          <meshToonMaterial {...dk('#1A2035')} />
        </mesh>
        <mesh position={[0.15, 0.56, 0]}>
          <capsuleGeometry args={[0.11, 0.76, 4, 16]} />
          <meshToonMaterial {...dk('#1A2035')} />
        </mesh>
      </>}

      {/* ── SKIRT / HIP ── */}
      {isFemale ? (
        /* A-line skirt: narrow top, wide bottom — cylinderGeometry(rTop, rBottom, h) */
        <mesh position={[0, 1.28, 0]}>
          <cylinderGeometry args={[0.26, 0.54, 0.58, 22]} />
          <meshToonMaterial {...out()} />
        </mesh>
      ) : (
        /* trouser seat — slightly wider sphere squished flat */
        <mesh position={[0, 1.1, 0]} scale={[0.6, 0.2, 0.48]}>
          <sphereGeometry args={[0.52, 20, 20]} />
          <meshToonMaterial {...dk('#1A2035')} />
        </mesh>
      )}

      {/* ── TORSO ── */}
      {isFemale ? (
        <mesh position={[0, 1.72, 0]} scale={[0.68, 1, 0.56]}>
          <capsuleGeometry args={[0.28, 0.40, 4, 16]} />
          <meshToonMaterial {...out()} />
        </mesh>
      ) : (
        <mesh position={[0, 1.72, 0]} scale={[0.82, 1, 0.60]}>
          <capsuleGeometry args={[0.32, 0.44, 4, 16]} />
          <meshToonMaterial {...out()} />
        </mesh>
      )}

      {/* ── ARMS ── hang straight down from shoulders, slight outward lean */}
      {/* left arm */}
      <mesh
        position={[isFemale ? -0.50 : -0.58, isFemale ? 1.92 : 1.95, 0]}
        rotation={[0, 0, isFemale ? 0.18 : 0.20]}
      >
        <capsuleGeometry args={[isFemale ? 0.08 : 0.10, 0.46, 4, 16]} />
        <meshToonMaterial {...out()} />
      </mesh>
      {/* right arm */}
      <mesh
        position={[isFemale ? 0.50 : 0.58, isFemale ? 1.92 : 1.95, 0]}
        rotation={[0, 0, isFemale ? -0.18 : -0.20]}
      >
        <capsuleGeometry args={[isFemale ? 0.08 : 0.10, 0.46, 4, 16]} />
        <meshToonMaterial {...out()} />
      </mesh>

      {/* hands */}
      <mesh position={[isFemale ? -0.58 : -0.68, isFemale ? 1.60 : 1.62, 0]}>
        <sphereGeometry args={[isFemale ? 0.085 : 0.10, 16, 16]} />
        <meshToonMaterial {...skin()} />
      </mesh>
      <mesh position={[isFemale ? 0.58 : 0.68, isFemale ? 1.60 : 1.62, 0]}>
        <sphereGeometry args={[isFemale ? 0.085 : 0.10, 16, 16]} />
        <meshToonMaterial {...skin()} />
      </mesh>

      {/* ── NECK ── */}
      <mesh position={[0, 2.20, 0]}>
        <cylinderGeometry args={[0.10, 0.12, 0.18, 16]} />
        <meshToonMaterial {...skin()} />
      </mesh>

      {/* ── HEAD SPHERE (skin, no texture) ── */}
      <mesh position={[0, 2.44, 0]} scale={[1, 1.1, 0.9]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshToonMaterial {...skin()} />
      </mesh>

      {/* ── FACE PLANE — in front of head sphere, transparent background ── */}
      <mesh position={[0, 2.44, 0.40]}>
        <planeGeometry args={[0.64, 0.80]} />
        <meshBasicMaterial map={faceTex} transparent={true} depthWrite={false} />
      </mesh>

      {/* ears */}
      <mesh position={[-0.43, 2.44, 0]}>
        <sphereGeometry args={[0.085, 12, 12]} />
        <meshToonMaterial {...skin()} />
      </mesh>
      <mesh position={[0.43, 2.44, 0]}>
        <sphereGeometry args={[0.085, 12, 12]} />
        <meshToonMaterial {...skin()} />
      </mesh>

      {/* ── HAIR ── main mass behind head ── */}
      <mesh position={[0, 2.60, -0.14]} scale={[1.06, 0.90, 0.82]}>
        <sphereGeometry args={[0.47, 32, 32]} />
        <meshToonMaterial {...hair()} />
      </mesh>
      {/* bangs — sits on forehead, above eye level */}
      <mesh position={[0, 2.82, 0.22]} scale={[0.94, 0.19, 0.34]}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshToonMaterial {...hair()} />
      </mesh>
      {/* side bangs */}
      <mesh position={[-0.35, 2.74, 0.18]} scale={[0.24, 0.15, 0.26]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshToonMaterial {...hair()} />
      </mesh>
      <mesh position={[0.35, 2.74, 0.18]} scale={[0.24, 0.15, 0.26]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshToonMaterial {...hair()} />
      </mesh>

      {/* long side hair (female) */}
      {isFemale && <>
        <mesh position={[-0.42, 2.10, -0.07]} scale={[0.18, 0.72, 0.16]}>
          <capsuleGeometry args={[1, 0.6, 4, 16]} />
          <meshToonMaterial {...hair()} />
        </mesh>
        <mesh position={[0.42, 2.10, -0.07]} scale={[0.18, 0.72, 0.16]}>
          <capsuleGeometry args={[1, 0.6, 4, 16]} />
          <meshToonMaterial {...hair()} />
        </mesh>
        <mesh position={[-0.43, 1.72, -0.08]} scale={[0.16, 0.52, 0.15]}>
          <capsuleGeometry args={[1, 0.4, 4, 16]} />
          <meshToonMaterial {...hair()} />
        </mesh>
        <mesh position={[0.43, 1.72, -0.08]} scale={[0.16, 0.52, 0.15]}>
          <capsuleGeometry args={[1, 0.4, 4, 16]} />
          <meshToonMaterial {...hair()} />
        </mesh>
      </>}

      {/* male side hair */}
      {!isFemale && <>
        <mesh position={[-0.40, 2.40, 0.10]} scale={[0.17, 0.42, 0.20]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshToonMaterial {...hair()} />
        </mesh>
        <mesh position={[0.40, 2.40, 0.10]} scale={[0.17, 0.42, 0.20]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshToonMaterial {...hair()} />
        </mesh>
      </>}

    </group>
  )
}

/* ── Canvas wrapper ───────────────────────────────────────── */
type Props = { gender: 'male' | 'female'; groupColor?: string; size?: number }

export default function Avatar3D({ gender, groupColor, size = 160 }: Props) {
  const outfit = groupColor || (gender === 'female' ? '#C084FC' : '#3B82F6')

  return (
    <Canvas
      style={{ width: size, height: size * 2.4, display: 'block' }}
      camera={{ position: [0, 0, 4.2], fov: 55 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[2.5, 5, 4]} intensity={1.1} />
      <directionalLight position={[-2, 2, -1]} intensity={0.28} color="#aabbff" />
      <pointLight position={[0, 3, 2]} intensity={0.38} color={outfit} />
      <Suspense fallback={null}>
        {/* shift character so it's centered at y=0 (camera lookAt) */}
        <group position={[0, -1.44, 0]}>
          <Character gender={gender} outfit={outfit} aura={outfit} />
        </group>
      </Suspense>
    </Canvas>
  )
}
