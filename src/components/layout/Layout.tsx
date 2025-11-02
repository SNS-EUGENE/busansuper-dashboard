import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden" style={{ minWidth: '1200px' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto hidden-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
