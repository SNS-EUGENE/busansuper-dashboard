import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { path: '/', icon: '📊', label: '대시보드' },
  { path: '/products', icon: '📦', label: '상품 관리' },
  { path: '/inventory-changes', icon: '📋', label: '재고 변동' },
  { path: '/vendors', icon: '🏢', label: '업체 관리' },
  { path: '/sales', icon: '💰', label: '판매 데이터' },
  { path: '/settlements', icon: '💳', label: '정산 관리' },
  { path: '/analysis', icon: '📈', label: '데이터 분석' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0" style={{ minWidth: '16rem' }}>
      {/* 로고 */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white whitespace-nowrap">🚀 부산슈퍼</h1>
        <p className="text-gray-400 text-sm mt-1 whitespace-nowrap">재고관리 시스템</p>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <span className="font-medium whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 하단 정보 */}
      <div className="p-4 border-t border-gray-700 text-gray-400 text-sm">
        <p className="whitespace-nowrap">버전 1.0.0</p>
        <p className="mt-1 whitespace-nowrap">© 2025 부산슈퍼</p>
      </div>
    </aside>
  );
}
