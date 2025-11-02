import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface Product {
  id: string;
  product_code: string;
  barcode: string | null;
  name: string;
  price: number;
  vendor_id: string | null;
  category_id: string | null;
  initial_stock: number;
  optimal_stock: number;
  current_stock: number;
  low_stock_threshold: number;
}

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Vendor {
  id: string;
  company: string;
  short_name: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const isEditMode = !!product;

  const [formData, setFormData] = useState({
    product_code: product?.product_code || '',
    barcode: product?.barcode || '',
    name: product?.name || '',
    price: product?.price || 0,
    vendor_id: product?.vendor_id || '',
    category_id: product?.category_id || '',
    initial_stock: product?.initial_stock || 0,
    optimal_stock: product?.optimal_stock || 0,
    current_stock: product?.current_stock || 0,
    low_stock_threshold: product?.low_stock_threshold || 10,
  });

  useEffect(() => {
    loadVendorsAndCategories();
  }, []);

  const loadVendorsAndCategories = async () => {
    try {
      const [vendorsRes, categoriesRes] = await Promise.all([
        supabase.from('vendors').select('id, company, short_name').order('company'),
        supabase.from('categories').select('id, name').order('name'),
      ]);

      if (vendorsRes.data) setVendors(vendorsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        vendor_id: formData.vendor_id || null,
        category_id: formData.category_id || null,
      };

      if (isEditMode && product) {
        // 수정 모드
        const { error } = await supabase
          .from('products')
          .update(data)
          .eq('id', product.id);

        if (error) throw error;
        showAlert('상품이 수정되었습니다!', 'success');
      } else {
        // 추가 모드
        const { error } = await supabase.from('products').insert([data]);

        if (error) throw error;
        showAlert('상품이 추가되었습니다!', 'success');
      }

      onSuccess();
    } catch (error: any) {
      console.error(`상품 ${isEditMode ? '수정' : '추가'} 실패:`, error);
      showAlert(`오류: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 상품코드 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            상품코드 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.product_code}
            onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="PRD001"
          />
        </div>

        {/* 바코드 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            바코드
          </label>
          <input
            type="text"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="8801234567890"
          />
        </div>
      </div>

      {/* 상품명 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">
          상품명 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="신라면"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 업체 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            업체
          </label>
          <select
            value={formData.vendor_id}
            onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">선택하세요</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.short_name || vendor.company}
              </option>
            ))}
          </select>
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            카테고리
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">선택하세요</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 단가 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            단가 (원) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            required
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 초기 재고 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            초기 재고 <span className="text-gray-500 text-xs">(참고용)</span>
          </label>
          <input
            type="number"
            min="0"
            value={formData.initial_stock}
            onChange={(e) => {
              const value = Number(e.target.value);
              setFormData({
                ...formData,
                initial_stock: value,
                optimal_stock: value,
                current_stock: value,
              });
            }}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 적정 재고 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            적정 재고
          </label>
          <input
            type="number"
            min="0"
            value={formData.optimal_stock}
            onChange={(e) =>
              setFormData({ ...formData, optimal_stock: Number(e.target.value) })
            }
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            재고율 계산 기준 (비워두면 자동 설정)
          </p>
        </div>

        {/* 재고 부족 기준 (퍼센티지) */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            재고 부족 기준 (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.low_stock_threshold}
            onChange={(e) =>
              setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })
            }
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="10"
          />
          <p className="text-xs text-gray-400 mt-1">
            적정재고 대비 현재재고 비율이 이 값 이하면 재고부족으로 표시
          </p>
        </div>
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
          {loading
            ? (isEditMode ? '수정 중...' : '추가 중...')
            : (isEditMode ? '수정' : '추가')
          }
        </button>
      </div>
    </form>
  );
}
