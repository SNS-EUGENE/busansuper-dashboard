import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface Product {
  id: string;
  name: string;
  product_code: string;
  price: number;
  current_stock: number;
}

interface SaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SaleForm({ onSuccess, onCancel }: SaleFormProps) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductList, setShowProductList] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    product_price: 0,
    current_stock: 0,
    quantity: 1,
    price: 0,
    sale_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchProducts();
    } else {
      setProducts([]);
    }
  }, [searchTerm]);

  const searchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, product_code, price, current_stock')
        .or(`name.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setProducts(data || []);
      setShowProductList(true);
    } catch (error) {
      console.error('상품 검색 실패:', error);
    }
  };

  const selectProduct = (product: Product) => {
    setFormData({
      ...formData,
      product_id: product.id,
      product_name: product.name,
      product_price: product.price,
      current_stock: product.current_stock,
      price: product.price,
    });
    setSearchTerm(product.name);
    setShowProductList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id) {
      showAlert('상품을 선택해주세요.', 'warning');
      return;
    }

    if (formData.quantity <= 0) {
      showAlert('판매 수량을 입력해주세요.', 'warning');
      return;
    }

    if (formData.quantity > formData.current_stock) {
      showAlert('재고가 부족합니다.', 'error');
      return;
    }

    setLoading(true);

    try {
      const totalAmount = formData.quantity * formData.price;

      // 판매 기록 추가
      const { error: saleError } = await supabase.from('sales').insert([
        {
          product_id: formData.product_id,
          quantity: formData.quantity,
          price: formData.price,
          total_amount: totalAmount,
          sale_date: formData.sale_date,
        },
      ]);

      if (saleError) throw saleError;

      // 재고 차감
      const newStock = formData.current_stock - formData.quantity;
      const { error: productError } = await supabase
        .from('products')
        .update({ current_stock: newStock })
        .eq('id', formData.product_id);

      if (productError) throw productError;

      // 재고 변동 기록
      await supabase.from('inventory_changes').insert([
        {
          product_id: formData.product_id,
          change_type: 'out',
          quantity: -formData.quantity,
          previous_stock: formData.current_stock,
          new_stock: newStock,
          note: '판매로 인한 출고',
        },
      ]);

      showAlert('판매가 기록되었습니다!', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('판매 기록 실패:', error);
      showAlert(`오류: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = formData.quantity * formData.price;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 상품 검색 */}
      <div className="relative">
        <label className="block text-sm font-bold text-gray-300 mb-2">
          상품 검색 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowProductList(true)}
          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="상품명, 상품코드, 바코드로 검색 (2자 이상)"
        />

        {/* 상품 목록 드롭다운 */}
        {showProductList && products.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => selectProduct(product)}
                className="w-full px-4 py-3 text-left hover:bg-gray-600 transition border-b border-gray-600 last:border-b-0"
              >
                <div className="text-white font-medium">{product.name}</div>
                <div className="text-gray-400 text-sm mt-1">
                  {product.product_code} | 단가: {product.price.toLocaleString()}원 | 재고:{' '}
                  {product.current_stock}개
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 선택된 상품 정보 */}
      {formData.product_id && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <p className="text-blue-300 font-bold mb-1">선택된 상품</p>
          <p className="text-white text-lg font-bold">{formData.product_name}</p>
          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
            <div>
              <span className="text-gray-400">단가: </span>
              <span className="text-white font-bold">{formData.product_price.toLocaleString()}원</span>
            </div>
            <div>
              <span className="text-gray-400">현재 재고: </span>
              <span className="text-white font-bold">{formData.current_stock}개</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 판매 수량 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            판매 수량 <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            required
            min="1"
            max={formData.current_stock}
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 판매 단가 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            판매 단가 (원) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            required
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <p className="text-gray-400 text-xs mt-1">기본 단가와 다르게 설정 가능</p>
        </div>
      </div>

      {/* 판매 날짜 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">
          판매 날짜 <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          required
          value={formData.sale_date}
          onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 총액 표시 */}
      {formData.product_id && formData.quantity > 0 && formData.price > 0 && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <p className="text-green-300 font-bold mb-1">판매 총액</p>
          <p className="text-white text-2xl font-bold">{totalAmount.toLocaleString()}원</p>
          <p className="text-gray-400 text-sm mt-1">
            {formData.quantity}개 × {formData.price.toLocaleString()}원
          </p>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50"
        >
          {loading ? '기록 중...' : '판매 기록'}
        </button>
      </div>
    </form>
  );
}
