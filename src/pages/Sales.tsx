import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import SaleForm from '../features/sales/SaleForm';
import ReceiptDetailUpload from '../features/sales/ReceiptDetailUpload';
import ApprovalUpload from '../features/sales/ApprovalUploadOptimized';
import { useAlert } from '../contexts/AlertContext';

interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  created_at: string;
  receipt_number: string;
  payment_type: string;
  products: {
    name: string;
    product_code: string;
  };
  card_companies?: {
    name: string;
  } | null;
  easy_pay_companies?: {
    name: string;
  } | null;
}

export default function Sales() {
  const { showAlert, showConfirm } = useAlert();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Sale | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // 날짜 디폴트값: 오늘 기준 일주일 전부터 오늘까지
  const getDefaultDates = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    return {
      from: formatDate(weekAgo),
      to: formatDate(today)
    };
  };

  const defaultDates = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [viewMode, setViewMode] = useState<'list' | 'receipt' | 'approval'>('list');

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select(
          `
          *,
          products (
            name,
            product_code
          )
        `
        )
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 카드사 및 간편결제사 정보를 별도로 조회
      if (data && data.length > 0) {
        const cardCompanyIds = data
          .filter(s => s.card_company_id)
          .map(s => s.card_company_id);
        const easyPayCompanyIds = data
          .filter(s => s.easy_pay_company_id)
          .map(s => s.easy_pay_company_id);

        let cardCompanies: any[] = [];
        let easyPayCompanies: any[] = [];

        if (cardCompanyIds.length > 0) {
          const { data: cardData } = await supabase
            .from('card_companies')
            .select('id, name')
            .in('id', cardCompanyIds);
          cardCompanies = cardData || [];
        }

        if (easyPayCompanyIds.length > 0) {
          const { data: easyPayData } = await supabase
            .from('easy_pay_companies')
            .select('id, name')
            .in('id', easyPayCompanyIds);
          easyPayCompanies = easyPayData || [];
        }

        // 매핑
        const cardCompanyMap = new Map(cardCompanies.map(c => [c.id, c]));
        const easyPayCompanyMap = new Map(easyPayCompanies.map(e => [e.id, e]));

        const enrichedData = data.map(sale => ({
          ...sale,
          card_companies: sale.card_company_id ? cardCompanyMap.get(sale.card_company_id) : null,
          easy_pay_companies: sale.easy_pay_company_id ? easyPayCompanyMap.get(sale.easy_pay_company_id) : null,
        }));

        setSales(enrichedData);
      } else {
        setSales(data || []);
      }
    } catch (error) {
      console.error('판매 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, productName: string) => {
    showConfirm(`"${productName}" 판매 기록을 삭제하시겠습니까?\n재고는 복구되지 않습니다.`, async () => {
      try {
        const { error } = await supabase.from('sales').delete().eq('id', id);

        if (error) throw error;

        showAlert('판매 기록이 삭제되었습니다.', 'success');
        loadSales();
      } catch (error: any) {
        console.error('판매 기록 삭제 실패:', error);
        showAlert(`오류: ${error.message}`, 'error');
      }
    });
  };

  // 정렬 핸들러
  const handleSort = (field: keyof Sale) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredSales = sales.filter((sale) => {
    // 날짜 필터
    if (dateFrom && sale.sale_date < dateFrom) return false;
    if (dateTo && sale.sale_date > dateTo) return false;

    // 결제수단 필터
    if (paymentFilter !== 'all' && sale.payment_type !== paymentFilter) return false;

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        sale.products.name.toLowerCase().includes(term) ||
        sale.products.product_code.toLowerCase().includes(term)
      );
    }

    return true;
  });

  // 정렬된 결과
  const sortedSales = [...filteredSales].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // 중첩된 객체 처리
    if (sortField === 'products') {
      return 0; // products는 객체라 정렬 불가
    }

    // 날짜 정렬
    if (sortField === 'sale_date' || sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 통계 계산
  const totalRevenue = sortedSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalQuantity = sortedSales.reduce((sum, sale) => sum + sale.quantity, 0);

  // 페이지네이션
  const totalPages = Math.ceil(sortedSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSales = sortedSales.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo]);

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
      <div className="flex-shrink-0 mb-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">판매 데이터</h1>
          <p className="text-gray-400 text-sm">전체 {sales.length}건의 판매 기록</p>
        </div>

        <div className="flex items-center justify-between">
          {/* 뷰 모드 전환 */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition font-bold ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              판매 내역
            </button>
            <button
              onClick={() => setViewMode('receipt')}
              className={`px-4 py-2 rounded-lg transition font-bold ${
                viewMode === 'receipt'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              영수증 업로드
            </button>
            <button
              onClick={() => setViewMode('approval')}
              className={`px-4 py-2 rounded-lg transition font-bold ${
                viewMode === 'approval'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              승인내역 업로드
            </button>
          </div>

          {viewMode === 'list' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              ➕ 판매 기록
            </button>
          )}
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* 영수증 업로드 모드 */}
        {viewMode === 'receipt' && (
          <div className="h-full overflow-y-auto">
            <ReceiptDetailUpload />
          </div>
        )}

        {/* 승인내역 업로드 모드 */}
        {viewMode === 'approval' && (
          <div className="h-full overflow-y-auto">
            <ApprovalUpload />
          </div>
        )}

        {/* 판매 내역 모드 */}
        {viewMode === 'list' && (
          <div className="h-full flex flex-col">
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">총 판매 건수</p>
                <p className="text-white text-2xl font-bold">{filteredSales.length}건</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">총 판매 수량</p>
                <p className="text-white text-2xl font-bold">{totalQuantity.toLocaleString()}개</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">총 판매액</p>
                <p className="text-green-400 text-2xl font-bold">{totalRevenue.toLocaleString()}원</p>
              </div>
            </div>

            {/* 필터 */}
            <div className="mb-4 flex gap-2 flex-wrap flex-shrink-0">
              {/* 날짜 범위 */}
              <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="시작 날짜"
            />
            <span className="text-gray-400 flex items-center">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="종료 날짜"
            />

            {/* 결제수단 필터 */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">전체 결제수단</option>
              <option value="cash">현금</option>
              <option value="card">카드</option>
              <option value="cash_receipt">현금영수증</option>
              <option value="easy_pay">간편결제</option>
            </select>

            {/* 검색 */}
            <input
              type="text"
              placeholder="상품명, 상품코드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[250px] bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            />

            {/* 필터 초기화 */}
            {(dateFrom || dateTo || searchTerm || paymentFilter !== 'all') && (
              <button
                onClick={() => {
                  const defaultDates = getDefaultDates();
                  setDateFrom(defaultDates.from);
                  setDateTo(defaultDates.to);
                  setSearchTerm('');
                  setPaymentFilter('all');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                초기화
              </button>
            )}

            {/* 새로고침 버튼 */}
            <button
              onClick={() => loadSales()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              새로고침
            </button>
          </div>

          {/* 판매 내역 목록 */}
          {sortedSales.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
              <p className="text-4xl mb-4">💰</p>
              <p className="text-xl text-gray-400">판매 기록이 없습니다</p>
              <p className="text-gray-500 mt-2">판매를 기록해주세요</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <table className="w-full" style={{ minWidth: '1000px' }}>
                  <thead className="bg-gray-700 sticky top-0 z-10">
                    <tr>
                      <th
                        onClick={() => handleSort('sale_date')}
                        className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap cursor-pointer hover:bg-gray-600 transition"
                        style={{ minWidth: '120px' }}
                      >
                        <div className="flex items-center gap-2">
                          판매 날짜
                          {sortField === 'sale_date' && (
                            <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap"
                        style={{ minWidth: '130px' }}
                      >
                        영수증번호
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap"
                        style={{ minWidth: '130px' }}
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
                        onClick={() => handleSort('quantity')}
                        className="px-6 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap cursor-pointer hover:bg-gray-600 transition"
                        style={{ minWidth: '100px' }}
                      >
                        <div className="flex items-center justify-end gap-2">
                          수량
                          {sortField === 'quantity' && (
                            <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('unit_price')}
                        className="px-6 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap cursor-pointer hover:bg-gray-600 transition"
                        style={{ minWidth: '120px' }}
                      >
                        <div className="flex items-center justify-end gap-2">
                          단가
                          {sortField === 'unit_price' && (
                            <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('total_amount')}
                        className="px-6 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap cursor-pointer hover:bg-gray-600 transition"
                        style={{ minWidth: '150px' }}
                      >
                        <div className="flex items-center justify-end gap-2">
                          총액
                          {sortField === 'total_amount' && (
                            <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap"
                        style={{ minWidth: '100px' }}
                      >
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800">
                    {currentSales.map((sale) => (
                      <React.Fragment key={sale.id}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === sale.id ? null : sale.id)}
                        className="hover:bg-gray-700/50 transition cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '120px' }}>
                          <span className="text-gray-400">
                            {new Date(sale.sale_date).toLocaleDateString('ko-KR')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '130px' }}>
                          <span className="text-purple-400 font-mono text-xs">
                            {sale.receipt_number || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '130px' }}>
                          <span className="text-blue-400 font-mono text-sm">
                            {sale.products.product_code}
                          </span>
                        </td>
                        <td className="px-6 py-4" style={{ minWidth: '200px' }}>
                          <span className="text-white font-medium">{sale.products.name}</span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '100px' }}>
                          <span className="text-white">{sale.quantity}개</span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '120px' }}>
                          <span className="text-gray-300">{sale.unit_price.toLocaleString()}원</span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '150px' }}>
                          <span className="text-green-400 font-bold">
                            {sale.total_amount.toLocaleString()}원
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '100px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(sale.id, sale.products.name);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                      {/* 아코디언 상세정보 */}
                      {expandedRow === sale.id && (
                        <tr className="bg-gray-750">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-400">영수증번호:</span>
                                <span className="text-white ml-2 font-mono">{sale.receipt_number || '-'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">결제수단:</span>
                                <span className="text-white ml-2">
                                  {sale.payment_type === 'cash' && '현금'}
                                  {sale.payment_type === 'card' && '카드'}
                                  {sale.payment_type === 'cash_receipt' && '현금영수증'}
                                  {sale.payment_type === 'easy_pay' && '간편결제'}
                                </span>
                              </div>
                              {sale.payment_type === 'card' && sale.card_companies && (
                                <div>
                                  <span className="text-gray-400">카드사:</span>
                                  <span className="text-white ml-2">{sale.card_companies.name}</span>
                                </div>
                              )}
                              {sale.payment_type === 'easy_pay' && sale.easy_pay_companies && (
                                <div>
                                  <span className="text-gray-400">간편결제사:</span>
                                  <span className="text-white ml-2">{sale.easy_pay_companies.name}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-400">결제일자:</span>
                                <span className="text-white ml-2">
                                  {new Date(sale.sale_date).toLocaleDateString('ko-KR')}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {filteredSales.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
                  <div className="text-sm text-gray-400">
                    전체 {filteredSales.length}개 중 {startIndex + 1}-
                    {Math.min(endIndex, filteredSales.length)}개 표시
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
          </div>
        )}
      </div>

      {/* 판매 기록 모달 */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="판매 기록"
      >
        <SaleForm
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadSales();
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
