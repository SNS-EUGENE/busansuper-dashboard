import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import VendorForm from '../features/vendors/VendorForm';
import { useAlert } from '../contexts/AlertContext';

interface Vendor {
  id: string;
  company: string;
  short_name: string | null;
  contact: string | null;
  email: string | null;
  address: string | null;
  business_number: string | null;
  created_at: string;
  product_count?: number;
}

export default function Vendors() {
  const { showAlert, showConfirm } = useAlert();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [sortField, setSortField] = useState<keyof Vendor | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);

      // 업체 목록 조회
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (vendorsError) throw vendorsError;

      // 각 업체별 상품 수 조회
      const vendorsWithCount = await Promise.all(
        (vendorsData || []).map(async (vendor) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id);

          return {
            ...vendor,
            product_count: count || 0,
          };
        })
      );

      setVendors(vendorsWithCount);
    } catch (error) {
      console.error('업체 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Vendor) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredVendors = vendors
    .filter((vendor) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        vendor.company.toLowerCase().includes(term) ||
        (vendor.short_name && vendor.short_name.toLowerCase().includes(term)) ||
        (vendor.contact && vendor.contact.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  // 페이지네이션
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVendors = filteredVendors.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string, company: string) => {
    showConfirm(`"${company}" 업체를 삭제하시겠습니까?`, async () => {
      try {
        // 업체에 연결된 상품 확인
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', id);

        if (count && count > 0) {
          showAlert(
            `이 업체에 ${count}개의 상품이 연결되어 있습니다. 먼저 상품의 업체 연결을 해제해주세요.`,
            'warning'
          );
          return;
        }

        const { error } = await supabase.from('vendors').delete().eq('id', id);

        if (error) throw error;

        showAlert('업체가 삭제되었습니다.', 'success');
        loadVendors();
      } catch (error: any) {
        console.error('업체 삭제 실패:', error);
        showAlert(`오류: ${error.message}`, 'error');
      }
    });
  };

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
          <h1 className="text-3xl font-bold text-white mb-2">업체 관리</h1>
          <p className="text-gray-400 text-sm">전체 {vendors.length}개 업체</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
        >
          ➕ 업체 추가
        </button>
      </div>

      {/* 검색 */}
      <div className="mb-4 flex-shrink-0">
        <input
          type="text"
          placeholder="거래처명, 약칭, 연락처로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 업체 목록 (유동적) */}
      {filteredVendors.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <p className="text-4xl mb-4">🏢</p>
          <p className="text-xl text-gray-400">등록된 업체가 없습니다</p>
          <p className="text-gray-500 mt-2">업체를 추가해주세요</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <table className="w-full" style={{ minWidth: '1100px' }}>
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th
                    onClick={() => handleSort('company')}
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '200px' }}
                  >
                    거래처명 {sortField === 'company' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('short_name')}
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '120px' }}
                  >
                    약칭 {sortField === 'short_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '150px' }}
                  >
                    연락처
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '200px' }}
                  >
                    이메일
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '150px' }}
                  >
                    사업자번호
                  </th>
                  <th
                    onClick={() => handleSort('product_count')}
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '100px' }}
                  >
                    상품 수 {sortField === 'product_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap"
                    style={{ minWidth: '140px' }}
                  >
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {currentVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '200px' }}>
                      <span className="text-white font-bold">{vendor.company}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '120px' }}>
                      <span className="text-gray-300">{vendor.short_name || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '150px' }}>
                      <span className="text-gray-400 text-sm">{vendor.contact || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '200px' }}>
                      <span className="text-gray-400 text-sm">{vendor.email || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '150px' }}>
                      <span className="text-gray-400 font-mono text-sm">
                        {vendor.business_number || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '100px' }}>
                      <span className="inline-block px-3 py-1 bg-blue-900/50 text-blue-400 text-sm font-bold rounded-full">
                        {vendor.product_count}개
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '140px' }}>
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition mr-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(vendor.id, vendor.company)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {filteredVendors.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-400">
                전체 {filteredVendors.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredVendors.length)}개 표시
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

      {/* 업체 추가 모달 */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="업체 추가"
      >
        <VendorForm
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadVendors();
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* 업체 수정 모달 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedVendor(null);
        }}
        title="업체 수정"
      >
        {selectedVendor && (
          <VendorForm
            vendor={selectedVendor}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setSelectedVendor(null);
              loadVendors();
            }}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedVendor(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
