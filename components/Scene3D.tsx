"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles, Stars } from "@react-three/drei";
import { type ComponentRef, useMemo, useRef } from "react";
import * as THREE from "three";

export type Mood = "idle" | "thinking" | "blocked";

const MOOD_COLORS: Record<Mood, { core: string; glow: string }> = {
  idle: { core: "#3b82f6", glow: "#22d3ee" },
  thinking: { core: "#8b5cf6", glow: "#a78bfa" },
  blocked: { core: "#ef4444", glow: "#f97316" },
};

function Orb({ mood }: { mood: Mood }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const material = useRef<ComponentRef<typeof MeshDistortMaterial>>(null);
  const light = useRef<THREE.PointLight>(null);
  const { viewport, pointer } = useThree();
  const target = useMemo(() => new THREE.Color(), []);
  const wide = viewport.width > 9;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const { core, glow } = MOOD_COLORS[mood];
    if (material.current) {
      material.current.color.lerp(target.set(core), delta * 3);
      material.current.emissive.lerp(target.set(glow), delta * 3);
      const distort = mood === "thinking" ? 0.55 : mood === "blocked" ? 0.7 : 0.35;
      material.current.distort = THREE.MathUtils.lerp(material.current.distort, distort, delta * 2);
    }
    if (light.current) light.current.color.lerp(target.set(glow), delta * 3);
    if (mesh.current) {
      const pulse = mood === "blocked" ? 1 + Math.sin(t * 18) * 0.04 : 1 + Math.sin(t * 2) * 0.03;
      mesh.current.scale.setScalar(pulse);
    }
    if (ring.current) ring.current.rotation.z += delta * (mood === "thinking" ? 1.6 : 0.4);
    if (ring2.current) ring2.current.rotation.z -= delta * (mood === "thinking" ? 1.2 : 0.25);
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.5, delta * 2);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.3, delta * 2);
    }
  });

  return (
    <group ref={group} position={wide ? [-viewport.width / 4.2, 0.2, 0] : [0, viewport.height / 4, -1]}>
      <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
        <mesh ref={mesh}>
          <icosahedronGeometry args={[1.35, 64]} />
          <MeshDistortMaterial
            ref={material}
            color={MOOD_COLORS.idle.core}
            emissive={MOOD_COLORS.idle.glow}
            emissiveIntensity={0.55}
            roughness={0.15}
            metalness={0.6}
            distort={0.35}
            speed={mood === "idle" ? 1.5 : 4}
          />
        </mesh>
        <mesh ref={ring} rotation={[Math.PI / 2.4, 0.2, 0]}>
          <torusGeometry args={[2.1, 0.015, 16, 160]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.55} />
        </mesh>
        <mesh ref={ring2} rotation={[Math.PI / 1.8, -0.4, 0]}>
          <torusGeometry args={[2.5, 0.01, 16, 160]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.35} />
        </mesh>
        <pointLight ref={light} intensity={30} distance={8} color={MOOD_COLORS.idle.glow} />
      </Float>
    </group>
  );
}

type Shape = { pos: [number, number, number]; geo: "oct" | "box" | "tor"; color: string; s: number };

const SHAPES: Shape[] = [
    { pos: [4.5, 2.4, -3], geo: "oct", color: "#38bdf8", s: 0.35 },
    { pos: [-5.5, -2.6, -4], geo: "box", color: "#818cf8", s: 0.3 },
    { pos: [5.8, -2.2, -5], geo: "tor", color: "#22d3ee", s: 0.32 },
    { pos: [-3.2, 3, -6], geo: "oct", color: "#c084fc", s: 0.28 },
    { pos: [1.5, -3.4, -4], geo: "box", color: "#60a5fa", s: 0.22 },
];

function FloatingShapes() {
  return (
    <>
      {SHAPES.map((s, i) => (
        <Float key={i} speed={1 + i * 0.3} rotationIntensity={2} floatIntensity={2}>
          <mesh position={s.pos} scale={s.s}>
            {s.geo === "oct" && <octahedronGeometry args={[1, 0]} />}
            {s.geo === "box" && <boxGeometry args={[1, 1, 1]} />}
            {s.geo === "tor" && <torusKnotGeometry args={[0.8, 0.25, 96, 12]} />}
            <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.4} wireframe={i % 2 === 0} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

export default function Scene3D({ mood }: { mood: Mood }) {
  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 50 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={["#030712"]} />
      <fog attach="fog" args={["#030712", 8, 22]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#93c5fd" />
      <directionalLight position={[-5, -3, 2]} intensity={0.6} color="#a78bfa" />
      <Stars radius={80} depth={40} count={3500} factor={4} saturation={0.4} fade speed={0.8} />
      <Sparkles count={70} scale={[14, 8, 6]} size={2.5} speed={0.4} color="#7dd3fc" />
      <Orb mood={mood} />
      <FloatingShapes />
    </Canvas>
  );
}
