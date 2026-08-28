import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import LightPillar from '../common/LightPillar';

export default function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#081215]">
      {/* Animated LightPillar background — full screen behind everything */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <LightPillar
          topColor="#3B1F8E"
          bottomColor="#1a1040"
          intensity={0.8}
          rotationSpeed={0.15}
          glowAmount={0.005}
          pillarWidth={3.0}
          pillarHeight={0.35}
          noiseIntensity={0.3}
          mixBlendMode="screen"
          quality="medium"
        />
      </div>
      <Sidebar />
      <div className="ml-64 relative z-10">
        <main className="min-h-screen">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
