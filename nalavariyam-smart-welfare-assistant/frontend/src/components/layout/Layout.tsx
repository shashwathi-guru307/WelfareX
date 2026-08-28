import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <main className="min-h-screen">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
