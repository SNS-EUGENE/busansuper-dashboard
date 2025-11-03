import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from '../components/ui/Modal';
import ProductForm from '../features/inventory/ProductForm';
import ExcelUpload from '../features/inventory/ExcelUpload';
import { useAlert } from '../contexts/AlertContext';

interface Product {
  id: string;
  product_code: string;
  barcode: string | null;
  name: string;
  price: number;
  initial_stock: number;
  optimal_stock: number;
  current_stock: number;
  low_stock_threshold: number;
  vendor_id: string | null;
  category_id: string | null;
  created_at: string;
}

export default function Products() {
  const { showAlert, showConfirm } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'code' | 'barcode'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortField, setSortField] = useState<keyof Product | 'stock_rate' | 'stock_status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30); // 한 페이지에 30개씩

  // 재고율 계산
  const getStockRate = (product: Product) => {
    if (product.optimal_stock === 0) return 0;
    return Math.round((product.current_stock / product.optimal_stock) * 100);
  };

  // 재고 상태 계산 (적정재고 대비 퍼센티지)
  const getStockStatus = (product: Product) => {
    if (product.current_stock === 0) {
      return { status: 'out', label: '재고 소진', color: 'text-red-400', bgColor: 'bg-red-900/50' };
    }
    if (product.optimal_stock === 0) {
      return { status: 'normal', label: '정상', color: 'text-green-400', bgColor: 'bg-green-900/50' };
    }
    const percentage = (product.current_stock / product.optimal_stock) * 100;
    if (percentage <= product.low_stock_threshold) {
      return { status: 'low', label: '재고 부족', color: 'text-yellow-400', bgColor: 'bg-yellow-900/50' };
    }
    return { status: 'normal', label: '정상', color: 'text-green-400', bgColor: 'bg-green-900/50' };
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('상품 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Product | 'stock_rate' | 'stock_status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredProducts = products
    .filter((product) => {
      if (!searchTerm) return true;

      const term = searchTerm.toLowerCase();

      switch (searchField) {
        case 'name':
          return product.name.toLowerCase().includes(term);
        case 'code':
          return product.product_code.toLowerCase().includes(term);
        case 'barcode':
          return product.barcode?.toLowerCase().includes(term) || false;
        case 'all':
        default:
          return (
            product.name.toLowerCase().includes(term) ||
            product.product_code.toLowerCase().includes(term) ||
            (product.barcode && product.barcode.toLowerCase().includes(term))
          );
      }
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      let aVal: any;
      let bVal: any;

      // 재고율 정렬
      if (sortField === 'stock_rate') {
        aVal = getStockRate(a);
        bVal = getStockRate(b);
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // 상태 정렬 (out < low < normal 순서)
      if (sortField === 'stock_status') {
        const statusOrder = { out: 0, low: 1, normal: 2 };
        aVal = statusOrder[getStockStatus(a).status as keyof typeof statusOrder];
        bVal = statusOrder[getStockStatus(b).status as keyof typeof statusOrder];
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // 기존 필드 정렬
      aVal = a[sortField as keyof Product];
      bVal = b[sortField as keyof Product];

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
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // 검색어, 검색필드, 정렬이 변경되면 첫 페이지로
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchField, sortField, sortDirection]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    showConfirm(`"${name}" 상품을 삭제하시겠습니까?`, async () => {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) throw error;

        showAlert('상품이 삭제되었습니다.', 'success');
        loadProducts();
      } catch (error: any) {
        console.error('상품 삭제 실패:', error);
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
          <h1 className="text-3xl font-bold text-white mb-2">상품 관리</h1>
          <p className="text-gray-400 text-sm">전체 {products.length}개 상품</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsExcelUploadOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            📤 엑셀 업로드
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            ➕ 상품 추가
          </button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="mb-4 flex gap-3 flex-shrink-0">
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="all">전체</option>
          <option value="name">상품명</option>
          <option value="code">상품코드</option>
          <option value="barcode">바코드</option>
        </select>
        <input
          type="text"
          placeholder={
            searchField === 'all'
              ? '상품명, 상품코드, 바코드로 검색...'
              : searchField === 'name'
              ? '상품명으로 검색...'
              : searchField === 'code'
              ? '상품코드로 검색...'
              : '바코드로 검색...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 md:flex-none md:w-96 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 상품 목록 (유동적) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <p className="text-4xl mb-4">📦</p>
          <p className="text-xl text-gray-400">등록된 상품이 없습니다</p>
          <p className="text-gray-500 mt-2">엑셀 파일을 업로드하거나 상품을 추가하세요</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <table className="w-full" style={{ minWidth: '1100px' }}>
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th
                    onClick={() => handleSort('product_code')}
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '120px' }}
                  >
                    상품코드 {sortField === 'product_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('barcode')}
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '140px' }}
                  >
                    바코드 {sortField === 'barcode' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-4 text-left text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition"
                  >
                    상품명 {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('price')}
                    className="px-6 py-4 text-right text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '100px' }}
                  >
                    단가 {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('optimal_stock')}
                    className="px-6 py-4 text-right text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '100px' }}
                  >
                    적정재고 {sortField === 'optimal_stock' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('current_stock')}
                    className="px-6 py-4 text-right text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '100px' }}
                  >
                    현재재고 {sortField === 'current_stock' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('stock_rate')}
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '80px' }}
                  >
                    재고율 {sortField === 'stock_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('stock_status')}
                    className="px-6 py-4 text-center text-sm font-bold text-gray-300 cursor-pointer hover:bg-gray-600 transition whitespace-nowrap"
                    style={{ minWidth: '100px' }}
                  >
                    상태 {sortField === 'stock_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-300 whitespace-nowrap" style={{ minWidth: '120px' }}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {currentProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '120px' }}>
                      <span className="text-blue-400 font-mono text-sm">{product.product_code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" style={{ minWidth: '140px' }}>
                      <span className="text-gray-400 font-mono text-sm">
                        {product.barcode || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{product.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '100px' }}>
                      <span className="text-white">{product.price.toLocaleString()}원</span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '100px' }}>
                      <span className="text-gray-300">{product.optimal_stock}개</span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap" style={{ minWidth: '100px' }}>
                      {(() => {
                        const stockStatus = getStockStatus(product);
                        return (
                          <span className={`font-bold ${stockStatus.color}`}>
                            {product.current_stock}개
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '80px' }}>
                      {(() => {
                        const rate = getStockRate(product);
                        const stockStatus = getStockStatus(product);
                        return (
                          <span className={`font-bold ${stockStatus.color}`}>
                            {rate}%
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '100px' }}>
                      {(() => {
                        const stockStatus = getStockStatus(product);
                        return (
                          <span className={`inline-block px-3 py-1 ${stockStatus.bgColor} ${stockStatus.color} text-xs font-bold rounded-full`}>
                            {stockStatus.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap" style={{ minWidth: '120px' }}>
                      <button
                        onClick={() => handleEdit(product)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition mr-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
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
          {filteredProducts.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-400">
                전체 {filteredProducts.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)}개 표시
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

      {/* 상품 추가 모달 */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="상품 추가"
      >
        <ProductForm
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadProducts();
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* 상품 수정 모달 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        title="상품 수정"
      >
        {selectedProduct && (
          <ProductForm
            product={selectedProduct}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setSelectedProduct(null);
              loadProducts();
            }}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </Modal>

      {/* 엑셀 업로드 모달 */}
      <Modal
        isOpen={isExcelUploadOpen}
        onClose={() => setIsExcelUploadOpen(false)}
        title="엑셀 업로드"
      >
        <ExcelUpload
          onSuccess={() => {
            setIsExcelUploadOpen(false);
            loadProducts();
          }}
          onCancel={() => setIsExcelUploadOpen(false)}
        />
      </Modal>
    </div>
  );
}
