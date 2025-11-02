import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../contexts/AlertContext';

interface Vendor {
  id: string;
  company: string;
  short_name: string | null;
}

interface SettlementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SettlementForm({ onSuccess, onCancel }: SettlementFormProps) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [salesData, setSalesData] = useState<any>(null);

  const [formData, setFormData] = useState({
    vendor_id: '',
    date_from: '',
    date_to: '',
    card_fee_rate: 3.0, // 기본 3% (나중에 OKPOS에서 확인 후 수정)
  });

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (formData.vendor_id && formData.date_from && formData.date_to) {
      calculateSales();
    }
  }, [formData.vendor_id, formData.date_from, formData.date_to]);

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, company, short_name')
        .order('company');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('업체 로드 실패:', error);
    }
  };

  const calculateSales = async () => {
    try {
      // 해당 기간 업체의 판매 데이터 조회
      const { data, error } = await supabase
        .from('sales')
        .select(
          `
          *,
          products!inner (
            vendor_id
          )
        `
        )
        .eq('products.vendor_id', formData.vendor_id)
        .gte('sale_date', formData.date_from)
        .lte('sale_date', formData.date_to);

      if (error) throw error;

      const totalSales = data?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const cardFee = totalSales * (formData.card_fee_rate / 100);
      const settlementAmount = totalSales - cardFee;

      setSalesData({
        count: data?.length || 0,
        totalSales,
        cardFee,
        settlementAmount,
      });
    } catch (error) {
      console.error('판매 집계 실패:', error);
      setSalesData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      showAlert('업체를 선택해주세요.', 'warning');
      return;
    }

    if (!formData.date_from || !formData.date_to) {
      showAlert('정산 기간을 선택해주세요.', 'warning');
      return;
    }

    if (!salesData || salesData.totalSales === 0) {
      showAlert('정산할 판매 데이터가 없습니다.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('settlements').insert([
        {
          vendor_id: formData.vendor_id,
          settlement_date: formData.date_to,
          period_start: formData.date_from,
          period_end: formData.date_to,
          total_sales: salesData.totalSales,
          card_fee_rate: formData.card_fee_rate,
          card_fee: salesData.cardFee,
          settlement_amount: salesData.settlementAmount,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      showAlert('정산이 생성되었습니다!', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('정산 생성 실패:', error);
      showAlert(`오류: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 업체 선택 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">
          업체 <span className="text-red-400">*</span>
        </label>
        <select
          required
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

      {/* 정산 기간 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            시작 날짜 <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.date_from}
            onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            종료 날짜 <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.date_to}
            onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 카드 수수료율 */}
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">
          카드 수수료율 (%) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          required
          min="0"
          max="100"
          step="0.1"
          value={formData.card_fee_rate}
          onChange={(e) => setFormData({ ...formData, card_fee_rate: Number(e.target.value) })}
          className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <p className="text-yellow-400 text-sm mt-1">
          ⚠️ OKPOS에서 카드사별 정확한 수수료율 확인 후 수정 필요
        </p>
      </div>

      {/* 집계 정보 */}
      {salesData && (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-6 space-y-4">
          <h3 className="text-white font-bold text-lg mb-4">정산 정보</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">판매 건수</p>
              <p className="text-white text-xl font-bold">{salesData.count}건</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">총 판매액</p>
              <p className="text-blue-400 text-xl font-bold">
                {salesData.totalSales.toLocaleString()}원
              </p>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">카드 수수료 ({formData.card_fee_rate}%)</span>
              <span className="text-red-400 font-bold">
                -{salesData.cardFee.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-white font-bold">정산 금액</span>
              <span className="text-green-400 font-bold text-2xl">
                {salesData.settlementAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      )}

      {salesData && salesData.totalSales === 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-400">해당 기간에 판매 데이터가 없습니다.</p>
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
          disabled={loading || !salesData || salesData.totalSales === 0}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50"
        >
          {loading ? '생성 중...' : '정산 생성'}
        </button>
      </div>
    </form>
  );
}
