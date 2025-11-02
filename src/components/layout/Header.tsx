export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">부산슈퍼 재고관리</h2>
          <p className="text-gray-400 text-sm">Real-time Inventory Management</p>
        </div>

        <div className="flex items-center gap-4">
          {/* 알림 */}
          <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition">
            <span className="text-2xl">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* 사용자 */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-700 rounded-lg">
            <span className="text-2xl">👤</span>
            <div className="text-sm">
              <p className="text-white font-medium">관리자</p>
              <p className="text-gray-400">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
