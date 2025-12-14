"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stage, Environment } from "@react-three/drei";

interface ModelProps {
  url: string;
}

function Model({ url }: ModelProps) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

interface GLBViewerProps {
  glbUrl: string;
  className?: string;
}

export default function GLBViewer({ glbUrl, className = "" }: GLBViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          {/* 조명 설정 */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />

          {/* 환경 맵 (반사 효과) */}
          <Environment preset="sunset" />

          {/* 3D 모델 */}
          <Stage environment={null} adjustCamera={1.2}>
            <Model url={glbUrl} />
          </Stage>

          {/* 마우스로 회전 및 확대/축소 */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
