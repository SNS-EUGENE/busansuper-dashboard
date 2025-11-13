import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import TabTransition from '../components/ui/TabTransition';
import InventoryChangeForm from '../features/inventory/InventoryChangeForm';
import { useAlert } from '../contexts/AlertContext';

interface InventoryChange {
  id: string;
  product_id: string;
  change_type: 'in' | 'sale' | 'out' | 'adjust';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  note: string | null;
  created_at: string;
  products: {
    name: string;
    product_code: string;
  };
}

export default function InventoryChanges() {
  const { showAlert } = useAlert();
  const [changes, setChanges] = useState<InventoryChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'sale' | 'out' | 'adjust'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);

  useEffect(() => {
    loadChanges();
  }, []);

  const loadChanges = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_changes')
        .select(
          `
          *,
          products (
            name,
            product_code
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChanges(data || []);
    } catch (error) {
      console.error('재고 변동 내역 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'in':
        return { label: '입고', color: 'text-green-400', bg: 'bg-green-900/50' };
      case 'sale':
        return { label: '판매', color: 'text-blue-400', bg: 'bg-blue-900/50' };
      case 'out':
        return { label: '출고', color: 'text-red-400', bg: 'bg-red-900/50' };
      case 'adjust':
        return { label: '조정', color: 'text-yellow-400', bg: 'bg-yellow-900/50' };
      default:
        return { label: '-', color: 'text-gray-400', bg: 'bg-gray-900/50' };
    }
  };

  const filteredChanges = changes.filter((change) => {
    // 타입 필터
    if (filterType !== 'all' && change.change_type !== filterType) {
      return false;
    }

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        change.products.name.toLowerCase().includes(term) ||
        change.products.product_code.toLowerCase().includes(term) ||
        (change.note && change.note.toLowerCase().includes(term))
      );
    }

    return true;
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredChanges.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentChanges = filteredChanges.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 (고정) */}
      <div className="flex items-center justify-between flex-shrink-0 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">재고 변동 관리</h1>
          <p className="text-gray-400 text-sm">전체 {changes.length}건의 변동 기록</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
        >
          ➕ 재고 변동 기록
        </button>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex gap-3 flex-wrap flex-shrink-0">
        {/* 타입 필터 */}
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilterType('in')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              filterType === 'in'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            입고
          </button>
          <button
            onClick={() => setFilterType('sale')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              filterType === 'sale'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            판매
          </button>
          <button
            onClick={() => setFilterType('out')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              filterType === 'out'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            출고
          </button>
          <button
            onClick={() => setFilterType('adjust')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              filterType === 'adjust'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            조정
          </button>
        </div>

        {/* 검색 */}
        <input
          type="text"
          placeholder="상품명, 상품코드, 메모로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[300px] bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      <TabTransition activeKey={filterType}>
        {/* 변동 내역 목록 (유동적) */}
        {filteredChanges.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-xl text-gray-400">재고 변동 내역이 없습니다</p>
          <p className="text-gray-500 mt-2">재고 변동을 기록해주세요</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <table className="w-full" style={{ minWidth: '1200px' }}>
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '180px' }}
                  >
                    일시
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '150px' }}
                  >
                    상품코드
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300"
                    style={{ minWidth: '200px' }}
                  >
                    상품명
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '100px' }}
                  >
                    타입
                  </th>
                  <th
                    className="px-6 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '120px' }}
                  >
                    변동 수량
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '180px' }}
                  >
                    재고 변화
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300"
                    style={{ minWidth: '250px' }}
                  >
                    메모
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {currentChanges.map((change) => {
                  const typeInfo = getTypeLabel(change.change_type);
                  return (
                    <tr key={change.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '180px' }}>
                        <span className="text-gray-400 text-sm">
                          {new Date(change.created_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '150px' }}>
                        <span className="text-blue-400 font-mono text-sm">
                          {change.products.product_code}
                        </span>
                      </td>
                      <td className="px-6 py-4" style={{ minWidth: '200px' }}>
                        <span className="text-white font-medium">{change.products.name}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '100px' }}>
                        <span
                          className={`inline-block px-3 py-1 ${typeInfo.bg} ${typeInfo.color} text-xs font-bold rounded-full`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '120px' }}>
                        <span
                          className={`font-bold ${
                            change.quantity > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {change.quantity > 0 ? '+' : ''}
                          {change.quantity}개
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '180px' }}>
                        <span className="text-gray-400">
                          {change.previous_stock}개
                        </span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="text-white font-bold">{change.new_stock}개</span>
                      </td>
                      <td className="px-6 py-4" style={{ minWidth: '250px' }}>
                        <span className="text-gray-400 text-sm">{change.note || '-'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {filteredChanges.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-400">
                전체 {filteredChanges.length}개 중 {startIndex + 1}-
                {Math.min(endIndex, filteredChanges.length)}개 표시
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  처음
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  이전
                </button>

                {/* 페이지 번호 */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded transition ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  다음
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  마지막
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </TabTransition>

      {/* 재고 변동 기록 모달 */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="재고 변동 기록"
      >
        <InventoryChangeForm
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadChanges();
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
