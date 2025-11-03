import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface Product {
  id: string;
  name: string;
  product_code: string;
  current_stock: number;
}

interface InventoryChangeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function InventoryChangeForm({ onSuccess, onCancel }: InventoryChangeFormProps) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductList, setShowProductList] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    current_stock: 0,
    change_type: 'in' as 'in' | 'sale' | 'out' | 'adjust',
    quantity: 0,
    note: '',
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
        .select('id, name, product_code, current_stock')
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
      current_stock: product.current_stock,
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

    if (formData.quantity === 0) {
      showAlert('수량을 입력해주세요.', 'warning');
      return;
    }

    setLoading(true);

    try {
      // 수량 계산 (입고: +, 판매: -, 출고: -, 조정: 절대값)
      let actualQuantity = formData.quantity;
      if (formData.change_type === 'sale' || formData.change_type === 'out') {
        actualQuantity = -Math.abs(formData.quantity);
      } else if (formData.change_type === 'in') {
        actualQuantity = Math.abs(formData.quantity);
      }

      let newStock: number;
      if (formData.change_type === 'adjust') {
        // 조정: 절대값으로 설정
        newStock = formData.quantity;
      } else {
        // 입고/판매/출고: 현재 재고에 더하기/빼기
        newStock = formData.current_stock + actualQuantity;
      }

      // 재고가 음수가 되는지 체크
      if (newStock < 0) {
        showAlert('재고가 부족합니다. 현재 재고를 확인해주세요.', 'error');
        setLoading(false);
        return;
      }

      // 트랜잭션: inventory_changes에 기록 + products 업데이트
      const { error: changeError } = await supabase.from('inventory_changes').insert([
        {
          product_id: formData.product_id,
          change_type: formData.change_type,
          quantity: actualQuantity,
          previous_stock: formData.current_stock,
          new_stock: newStock,
          note: formData.note.trim() || null,
        },
      ]);

      if (changeError) throw changeError;

      const { error: productError } = await supabase
        .from('products')
        .update({ current_stock: newStock })
        .eq('id', formData.product_id);

      if (productError) throw productError;

      showAlert('재고 변동이 기록되었습니다!', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('재고 변동 기록 실패:', error);
      showAlert(`오류: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

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
                  {product.product_code} | 현재 재고: {product.current_stock}개
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
          <p className="text-gray-400 text-sm mt-1">
            현재 재고: <span className="text-white font-bold">{formData.current_stock}개</span>
          </p>
        </div>
      )}

      {/* 변동 타입 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">
          변동 타입 <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, change_type: 'in' })}
            className={`py-3 px-4 rounded-lg font-bold transition ${
              formData.change_type === 'in'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ➕ 입고
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, change_type: 'sale' })}
            className={`py-3 px-4 rounded-lg font-bold transition ${
              formData.change_type === 'sale'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            💰 판매
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, change_type: 'out' })}
            className={`py-3 px-4 rounded-lg font-bold transition ${
              formData.change_type === 'out'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ➖ 출고
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, change_type: 'adjust' })}
            className={`py-3 px-4 rounded-lg font-bold transition ${
              formData.change_type === 'adjust'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔄 조정
          </button>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          {formData.change_type === 'in' && '• 입고: 재고를 추가합니다'}
          {formData.change_type === 'sale' && '• 판매: 판매로 인한 재고 차감입니다'}
          {formData.change_type === 'out' && '• 출고: 반품, 폐기 등으로 재고를 차감합니다'}
          {formData.change_type === 'adjust' && '• 조정: 재고를 입력한 수량으로 정확히 설정합니다'}
        </p>
      </div>

      {/* 수량 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">
          수량 <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          required
          min="0"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder={formData.change_type === 'adjust' ? '조정할 재고 수량' : '변동 수량'}
        />
        {formData.product_id && formData.quantity > 0 && (
          <p className="text-sm mt-2 text-gray-400">
            변동 후 재고:{' '}
            <span className="text-white font-bold">
              {formData.change_type === 'adjust'
                ? formData.quantity
                : formData.change_type === 'in'
                ? formData.current_stock + formData.quantity
                : formData.current_stock - formData.quantity}
              개
            </span>
          </p>
        )}
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">메모</label>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
          rows={3}
          placeholder="변동 사유나 특이사항을 입력하세요"
        />
      </div>

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
          {loading ? '기록 중...' : '기록'}
        </button>
      </div>
    </form>
  );
}
