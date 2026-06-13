import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { TorusKnotGeometry, MeshPhysicalMaterial, type Mesh, type PointLight } from "three";

function TorusMesh() {
  const meshRef = useRef<Mesh>(null);
  const light1Ref = useRef<PointLight>(null);
  const light2Ref = useRef<PointLight>(null);

  const geometry = useMemo(() => new TorusKnotGeometry(1.2, 0.3, 150, 20, 2, 3), []);
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: "#b7ff00",
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      }),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y += 0.005;
    meshRef.current.rotation.x += 0.002;
    meshRef.current.position.y = Math.sin(t * 0.001) * 0.1;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material}>
      <pointLight ref={light1Ref} position={[0, 0, 5]} intensity={40} color="#b7ff00" />
      <pointLight ref={light2Ref} position={[-5, 0, 0]} intensity={20} color="#4285f4" />
    </mesh>
  );
}

export default function SonicTorus() {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} color="#ffffff" />
        <TorusMesh />
      </Canvas>
    </div>
  );
}
