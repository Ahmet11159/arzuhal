'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Havuz ağı: merkezde ortak havuz (hub), iç kabukta üye işletmeler,
 * dış kabukta tedarikçiler. Darbeler tedarikçiden havuza, havuzdan üyelere akar —
 * "hacmi birleştir, birlikte al" fikrinin görsel karşılığı.
 */

const MEMBER_COUNT = 56;
const SUPPLIER_COUNT = 12;
const PULSE_COUNT = 70;

function fibonacciSphere(n: number, radius: number, jitter = 0.12, seed = 1) {
  const pts: THREE.Vector3[] = [];
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = phi * i;
    const rr = radius * (1 + (rnd() - 0.5) * jitter);
    pts.push(new THREE.Vector3(Math.cos(t) * r * rr, y * rr * 0.82, Math.sin(t) * r * rr));
  }
  return pts;
}

function useGlowTexture() {
  return useMemo(() => {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Hub({ glow }: { glow: THREE.Texture }) {
  const shell = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (shell.current) {
      shell.current.rotation.y += dt * 0.25;
      shell.current.rotation.x += dt * 0.08;
    }
    if (ring1.current) ring1.current.rotation.z += dt * 0.4;
    if (ring2.current) ring2.current.rotation.z -= dt * 0.25;
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);
  });
  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshStandardMaterial color="#f5b453" emissive="#f59e2b" emissiveIntensity={1.4} roughness={0.25} metalness={0.1} />
      </mesh>
      <sprite scale={[2.6, 2.6, 1]}>
        <spriteMaterial map={glow} color="#f5b453" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh ref={shell}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial color="#2cc79a" emissive="#0e8f6e" emissiveIntensity={0.6} wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={ring1} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.35, 0.012, 16, 160]} />
        <meshBasicMaterial color="#2cc79a" transparent opacity={0.7} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 1.7, 0.4, 0]}>
        <torusGeometry args={[1.6, 0.008, 16, 160]} />
        <meshBasicMaterial color="#f5b453" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function Network({ glow }: { glow: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const members = useMemo(() => fibonacciSphere(MEMBER_COUNT, 2.55, 0.25, 7), []);
  const suppliers = useMemo(() => fibonacciSphere(SUPPLIER_COUNT, 3.6, 0.1, 13), []);
  const memberMesh = useRef<THREE.InstancedMesh>(null);
  const pulseMesh = useRef<THREE.InstancedMesh>(null);
  const { pointer } = useThree();

  // Bağlantı çizgileri (hub ↔ düğümler) tek bir LineSegments ile çizilir.
  const lines = useMemo(() => {
    const arr: number[] = [];
    for (const p of [...members, ...suppliers]) arr.push(0, 0, 0, p.x, p.y, p.z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, [members, suppliers]);

  // Darbeler: tedarikçi → hub (amber) veya hub → üye (yeşil)
  const pulses = useMemo(
    () =>
      Array.from({ length: PULSE_COUNT }, (_, i) => {
        const inbound = i % 3 === 0;
        const target = inbound ? suppliers[i % SUPPLIER_COUNT] : members[(i * 7) % MEMBER_COUNT];
        return { inbound, target, speed: 0.18 + ((i * 37) % 100) / 400, phase: ((i * 53) % 100) / 100 };
      }),
    [members, suppliers],
  );

  const tmp = useMemo(() => new THREE.Object3D(), []);
  const colorA = useMemo(() => new THREE.Color('#f5b453'), []);
  const colorB = useMemo(() => new THREE.Color('#5ef0c4'), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y += dt * 0.06;
      // İmleç paralaksı (yumuşatılmış)
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.25, 0.04);
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, pointer.x * 0.12, 0.04);
    }
    if (memberMesh.current) {
      members.forEach((p, i) => {
        const s = 0.055 + Math.sin(t * 1.6 + i) * 0.012;
        tmp.position.copy(p);
        tmp.scale.setScalar(s / 0.06);
        tmp.updateMatrix();
        memberMesh.current!.setMatrixAt(i, tmp.matrix);
      });
      memberMesh.current.instanceMatrix.needsUpdate = true;
    }
    if (pulseMesh.current) {
      pulses.forEach((p, i) => {
        const k = (t * p.speed + p.phase) % 1;
        const f = p.inbound ? 1 - k : k;
        tmp.position.copy(p.target).multiplyScalar(f);
        const fade = Math.sin(k * Math.PI);
        tmp.scale.setScalar(0.35 + fade * 0.9);
        tmp.updateMatrix();
        pulseMesh.current!.setMatrixAt(i, tmp.matrix);
      });
      pulseMesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <Hub glow={glow} />
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#2cc79a" transparent opacity={0.13} depthWrite={false} />
      </lineSegments>
      <instancedMesh ref={memberMesh} args={[undefined, undefined, MEMBER_COUNT]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#5ef0c4" emissive="#2cc79a" emissiveIntensity={1.2} />
      </instancedMesh>
      <instancedMesh
        ref={(m: THREE.InstancedMesh | null) => {
          if (!m) return;
          suppliers.forEach((p, i) => {
            tmp.position.copy(p);
            tmp.scale.setScalar(1);
            tmp.updateMatrix();
            m.setMatrixAt(i, tmp.matrix);
          });
          m.instanceMatrix.needsUpdate = true;
        }}
        args={[undefined, undefined, SUPPLIER_COUNT]}
      >
        <octahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color="#f5b453" emissive="#e08a1e" emissiveIntensity={0.9} flatShading />
      </instancedMesh>
      {/* Düğüm parıltıları */}
      {suppliers.map((p, i) => (
        <sprite key={`s${i}`} position={p} scale={[0.7, 0.7, 1]}>
          <spriteMaterial map={glow} color={colorA} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
      <instancedMesh ref={pulseMesh} args={[undefined, undefined, PULSE_COUNT]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={colorB} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export default function NetworkScene({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 7.4], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      aria-hidden
    >
      <SceneContents />
    </Canvas>
  );
}

function SceneContents() {
  const glow = useGlowTexture();
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0, 0]} intensity={18} color="#f5b453" distance={6} />
      <directionalLight position={[4, 5, 3]} intensity={1.1} color="#d8fff1" />
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.5}>
        <Network glow={glow} />
      </Float>
      <Sparkles count={90} scale={[12, 7, 6]} size={1.6} speed={0.25} opacity={0.5} color="#9ff5da" />
    </>
  );
}
