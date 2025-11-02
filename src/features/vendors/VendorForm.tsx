import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface Vendor {
  id: string;
  company: string;
  short_name: string | null;
  contact: string | null;
  email: string | null;
  address: string | null;
  business_number: string | null;
}

interface VendorFormProps {
  vendor?: Vendor;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function VendorForm({ vendor, onSuccess, onCancel }: VendorFormProps) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const isEditMode = !!vendor;

  const [formData, setFormData] = useState({
    company: vendor?.company || '',
    short_name: vendor?.short_name || '',
    contact: vendor?.contact || '',
    email: vendor?.email || '',
    address: vendor?.address || '',
    business_number: vendor?.business_number || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        company: formData.company.trim(),
        short_name: formData.short_name.trim() || null,
        contact: formData.contact.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        business_number: formData.business_number.trim() || null,
      };

      if (isEditMode && vendor) {
        const { error } = await supabase
          .from('vendors')
          .update(data)
          .eq('id', vendor.id);

        if (error) throw error;
        showAlert('업체 정보가 수정되었습니다!', 'success');
      } else {
        const { error } = await supabase.from('vendors').insert([data]);

        if (error) throw error;
        showAlert('업체가 추가되었습니다!', 'success');
      }

      onSuccess();
    } catch (error: any) {
      console.error(`업체 ${isEditMode ? '수정' : '추가'} 실패:`, error);
      showAlert(`오류: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 거래처명 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            거래처명 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="(주)농심"
          />
        </div>

        {/* 약칭 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            약칭
          </label>
          <input
            type="text"
            value={formData.short_name}
            onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="농심"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 연락처 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            연락처
          </label>
          <input
            type="tel"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="02-1234-5678"
          />
        </div>

        {/* 이메일 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            이메일
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="contact@company.com"
          />
        </div>
      </div>

      {/* 주소 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">
          주소
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="서울특별시 강남구..."
        />
      </div>

      {/* 사업자등록번호 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">
          사업자등록번호
        </label>
        <input
          type="text"
          value={formData.business_number}
          onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="123-45-67890"
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
          {loading
            ? (isEditMode ? '수정 중...' : '추가 중...')
            : (isEditMode ? '수정' : '추가')
          }
        </button>
      </div>
    </form>
  );
}
