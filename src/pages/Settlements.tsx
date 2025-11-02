import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import SettlementForm from '../features/settlements/SettlementForm';
import CardCompanyManager from '../features/settlements/CardCompanyManager';
import { useAlert } from '../contexts/AlertContext';

interface Settlement {
  id: string;
  vendor_id: string;
  settlement_date: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  card_fee_rate: number;
  card_fee: number;
  settlement_amount: number;
  status: 'pending' | 'completed';
  created_at: string;
  vendors: {
    company: string;
    short_name: string | null;
  };
}

export default function Settlements() {
  const { showAlert, showConfirm } = useAlert();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settlements')
        .select(
          `
          *,
          vendors (
            company,
            short_name
          )
        `
        )
        .order('settlement_date', { ascending: false });

      if (error) throw error;
      setSettlements(data || []);
    } catch (error) {
      console.error('정산 내역 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'pending' | 'completed') => {
    try {
      const { error } = await supabase
        .from('settlements')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      showAlert(
        status === 'completed' ? '정산이 완료 처리되었습니다.' : '정산 상태가 변경되었습니다.',
        'success'
      );
      loadSettlements();
    } catch (error: any) {
      console.error('정산 상태 변경 실패:', error);
      showAlert(`오류: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (id: string, vendorName: string) => {
    showConfirm(`"${vendorName}" 정산 내역을 삭제하시겠습니까?`, async () => {
      try {
        const { error } = await supabase.from('settlements').delete().eq('id', id);

        if (error) throw error;

        showAlert('정산 내역이 삭제되었습니다.', 'success');
        loadSettlements();
      } catch (error: any) {
        console.error('정산 내역 삭제 실패:', error);
        showAlert(`오류: ${error.message}`, 'error');
      }
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: '대기', color: 'text-yellow-400', bg: 'bg-yellow-900/50' };
      case 'completed':
        return { label: '완료', color: 'text-green-400', bg: 'bg-green-900/50' };
      default:
        return { label: '-', color: 'text-gray-400', bg: 'bg-gray-900/50' };
    }
  };

  const filteredSettlements = settlements.filter((settlement) => {
    // 상태 필터
    if (filterStatus !== 'all' && settlement.status !== filterStatus) {
      return false;
    }

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const vendorName = settlement.vendors.short_name || settlement.vendors.company;
      return vendorName.toLowerCase().includes(term);
    }

    return true;
  });

  // 통계 계산
  const totalSettlementAmount = filteredSettlements.reduce(
    (sum, s) => sum + s.settlement_amount,
    0
  );
  const totalCardFee = filteredSettlements.reduce((sum, s) => sum + s.card_fee, 0);
  const pendingCount = filteredSettlements.filter((s) => s.status === 'pending').length;

  // 페이지네이션
  const totalPages = Math.ceil(filteredSettlements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSettlements = filteredSettlements.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* 헤더 (고정) */}
      <div className="flex items-center justify-between flex-shrink-0 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">정산 관리</h1>
          <p className="text-gray-400 text-sm">전체 {settlements.length}건의 정산 내역</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
        >
          ➕ 정산 생성
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 flex-shrink-0">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-2">대기 중인 정산</p>
          <p className="text-yellow-400 text-3xl font-bold">{pendingCount}건</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-2">총 카드 수수료</p>
          <p className="text-red-400 text-3xl font-bold">{totalCardFee.toLocaleString()}원</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-2">총 정산 금액</p>
          <p className="text-green-400 text-3xl font-bold">
            {totalSettlementAmount.toLocaleString()}원
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex gap-3 flex-wrap flex-shrink-0">
        {/* 상태 필터 */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            대기
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            완료
          </button>
        </div>

        {/* 검색 */}
        <input
          type="text"
          placeholder="업체명으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[250px] bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 정산 내역 목록 (유동적) */}
      {filteredSettlements.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <p className="text-4xl mb-4">💳</p>
          <p className="text-xl text-gray-400">정산 내역이 없습니다</p>
          <p className="text-gray-500 mt-2">정산을 생성해주세요</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col flex-shrink-0 mb-8">
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar" style={{ maxHeight: '500px' }}>
            <table className="w-full" style={{ minWidth: '1300px' }}>
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '150px' }}
                  >
                    업체명
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '200px' }}
                  >
                    정산 기간
                  </th>
                  <th
                    className="px-6 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '150px' }}
                  >
                    총 판매액
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '120px' }}
                  >
                    수수료율
                  </th>
                  <th
                    className="px-6 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '150px' }}
                  >
                    카드 수수료
                  </th>
                  <th
                    className="px-6 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '150px' }}
                  >
                    정산 금액
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '100px' }}
                  >
                    상태
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '180px' }}
                  >
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {currentSettlements.map((settlement) => {
                  const statusInfo = getStatusInfo(settlement.status);
                  return (
                    <tr key={settlement.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '150px' }}>
                        <span className="text-white font-bold">
                          {settlement.vendors.short_name || settlement.vendors.company}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '200px' }}>
                        <span className="text-gray-400 text-sm">
                          {new Date(settlement.period_start).toLocaleDateString('ko-KR')} ~{' '}
                          {new Date(settlement.period_end).toLocaleDateString('ko-KR')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '150px' }}>
                        <span className="text-white">
                          {settlement.total_sales.toLocaleString()}원
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '120px' }}>
                        <span className="text-gray-300">{settlement.card_fee_rate}%</span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '150px' }}>
                        <span className="text-red-400 font-bold">
                          -{settlement.card_fee.toLocaleString()}원
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '150px' }}>
                        <span className="text-green-400 font-bold text-lg">
                          {settlement.settlement_amount.toLocaleString()}원
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '100px' }}>
                        <span
                          className={`inline-block px-3 py-1 ${statusInfo.bg} ${statusInfo.color} text-xs font-bold rounded-full`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '180px' }}>
                        {settlement.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(settlement.id, 'completed')}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition mr-2"
                          >
                            완료
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleDelete(
                              settlement.id,
                              settlement.vendors.short_name || settlement.vendors.company
                            )
                          }
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {filteredSettlements.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-400">
                전체 {filteredSettlements.length}개 중 {startIndex + 1}-
                {Math.min(endIndex, filteredSettlements.length)}개 표시
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

      {/* 카드사(매입사) 관리 */}
      <div className="flex-shrink-0">
        <CardCompanyManager />
      </div>

      {/* 정산 생성 모달 */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="정산 생성">
        <SettlementForm
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadSettlements();
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
