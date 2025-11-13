import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TabTransition from '../components/ui/TabTransition';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TabType = 'sales' | 'products' | 'payments' | 'settlements';
type PeriodType = '7days' | '30days' | '90days' | 'all';

// Y축 포맷터 함수 (만원 단위)
const formatYAxis = (value: number) => {
  return (value / 10000).toLocaleString();
};

// Y축 포맷터 함수 (천단위 쉼표)
const formatYAxisWithComma = (value: number) => {
  return value.toLocaleString();
};

export default function Analysis() {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('30days');

  // 판매 분석 데이터
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgRevenue, setAvgRevenue] = useState(0);

  // 상품 분석 데이터
  const [topProducts, setTopProducts] = useState<any[]>([]);

  // 결제 분석 데이터
  const [paymentStats, setPaymentStats] = useState<any[]>([]);

  // 정산 분석 데이터
  const [settlementStats, setSettlementStats] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'sales') loadSalesData();
    if (activeTab === 'products') loadProductsData();
    if (activeTab === 'payments') loadPaymentsData();
    if (activeTab === 'settlements') loadSettlementsData();
  }, [period, activeTab]);

  const loadSalesData = async () => {
    try {
      setLoading(true);

      // 기간 계산
      const today = new Date();
      let startDate: Date;

      switch (period) {
        case '7days':
          startDate = new Date();
          startDate.setDate(today.getDate() - 7);
          break;
        case '30days':
          startDate = new Date();
          startDate.setDate(today.getDate() - 30);
          break;
        case '90days':
          startDate = new Date();
          startDate.setDate(today.getDate() - 90);
          break;
        case 'all':
          startDate = new Date('2000-01-01');
          break;
        default:
          startDate = new Date();
          startDate.setDate(today.getDate() - 30);
      }

      const startDateStr = startDate.toISOString().split('T')[0];

      console.log('=== 판매 분석 데이터 조회 ===');
      console.log('기간:', period);
      console.log('시작일:', startDateStr);
      console.log('오늘:', today.toISOString().split('T')[0]);

      // 판매 데이터 조회
      const { data: sales, error } = await supabase
        .from('sales')
        .select('sale_date, total_amount, discount_amount, quantity')
        .gte('sale_date', startDateStr)
        .order('sale_date', { ascending: true });

      console.log('조회된 데이터 건수:', sales?.length || 0);
      if (sales && sales.length > 0) {
        console.log('첫 번째 데이터:', sales[0]);
        console.log('마지막 데이터:', sales[sales.length - 1]);
      }

      if (error) throw error;

      // 일별 집계
      const dailyMap = new Map<string, { date: string; revenue: number; discount: number; count: number }>();

      sales?.forEach(sale => {
        const date = sale.sale_date;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, revenue: 0, discount: 0, count: 0 });
        }
        const day = dailyMap.get(date)!;
        day.revenue += sale.total_amount;
        day.discount += sale.discount_amount || 0;
        day.count += 1;
      });

      const daily = Array.from(dailyMap.values()).map(d => ({
        날짜: d.date.slice(5), // MM-DD
        매출액: d.revenue,
        할인액: d.discount,
        실매출액: d.revenue - d.discount,
        건수: d.count,
      }));

      setDailySales(daily);

      // 통계 계산
      const total = daily.reduce((sum, d) => sum + d.실매출액, 0);
      const avg = daily.length > 0 ? total / daily.length : 0;
      setTotalRevenue(total);
      setAvgRevenue(avg);

    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductsData = async () => {
    try {
      setLoading(true);

      // 기간 계산
      const startDateStr = getStartDate();

      // 상품별 판매 집계
      const { data: sales, error } = await supabase
        .from('sales')
        .select('product_id, quantity, total_amount, products(name, product_code)')
        .gte('sale_date', startDateStr)
        .gt('quantity', 0); // 판매만 (반품 제외)

      if (error) throw error;

      // 상품별 집계
      const productMap = new Map<number, { name: string; code: string; quantity: number; revenue: number }>();

      sales?.forEach(sale => {
        const pid = sale.product_id;
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            name: (sale.products as any)?.name || '알 수 없음',
            code: (sale.products as any)?.product_code || '',
            quantity: 0,
            revenue: 0,
          });
        }
        const prod = productMap.get(pid)!;
        prod.quantity += sale.quantity;
        prod.revenue += sale.total_amount;
      });

      // 상위 20개 상품
      const top20 = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20)
        .map(p => ({
          상품명: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
          판매량: p.quantity,
          매출액: p.revenue,
        }));

      setTopProducts(top20);

    } catch (error) {
      console.error('상품 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentsData = async () => {
    try {
      setLoading(true);

      const startDateStr = getStartDate();

      // 결제수단별 집계
      const { data: sales, error } = await supabase
        .from('sales')
        .select('payment_type, total_amount')
        .gte('sale_date', startDateStr);

      if (error) throw error;

      const paymentMap = new Map<string, number>();

      sales?.forEach(sale => {
        const type = sale.payment_type;
        paymentMap.set(type, (paymentMap.get(type) || 0) + sale.total_amount);
      });

      const paymentLabels: Record<string, string> = {
        cash: '현금',
        card: '카드',
        cash_receipt: '현금영수증',
        easy_pay: '간편결제',
      };

      const stats = Array.from(paymentMap.entries()).map(([type, amount]) => ({
        결제수단: paymentLabels[type] || type,
        매출액: amount,
      }));

      setPaymentStats(stats);

    } catch (error) {
      console.error('결제 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettlementsData = async () => {
    try {
      setLoading(true);

      const startDateStr = getStartDate();

      // 정산 데이터 조회
      const { data: settlements, error } = await supabase
        .from('settlements')
        .select('settlement_amount, commission_amount, status, vendors(name)')
        .gte('settlement_date', startDateStr);

      if (error) throw error;

      // 업체별 집계
      const vendorMap = new Map<string, { amount: number; commission: number; count: number }>();

      settlements?.forEach(s => {
        const vendorName = (s.vendors as any)?.name || '미지정';
        if (!vendorMap.has(vendorName)) {
          vendorMap.set(vendorName, { amount: 0, commission: 0, count: 0 });
        }
        const vendor = vendorMap.get(vendorName)!;
        vendor.amount += s.settlement_amount;
        vendor.commission += s.commission_amount || 0;
        vendor.count += 1;
      });

      const stats = Array.from(vendorMap.entries()).map(([name, data]) => ({
        업체명: name,
        정산금액: data.amount,
        수수료: data.commission,
        건수: data.count,
      }));

      setSettlementStats(stats);

    } catch (error) {
      console.error('정산 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const today = new Date();
    let startDate = new Date();

    switch (period) {
      case '7days':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'all':
        startDate = new Date('2000-01-01');
        break;
    }

    return startDate.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">데이터 분석</h1>
        <p className="text-gray-400 text-sm">매출 및 판매 데이터 분석</p>
      </div>

      {/* 탭 메뉴 및 기간 필터 */}
      <div className="flex items-center justify-between gap-4">
        {/* 메인 탭 */}
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            판매 분석
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            상품 분석
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            결제 분석
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              activeTab === 'settlements'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            정산 분석
          </button>
        </div>

        {/* 기간 필터 */}
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setPeriod('7days')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              period === '7days'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            최근 7일
          </button>
          <button
            onClick={() => setPeriod('30days')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              period === '30days'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            최근 30일
          </button>
          <button
            onClick={() => setPeriod('90days')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              period === '90days'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            최근 90일
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-6 py-3 rounded-lg transition font-bold ${
              period === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            전체
          </button>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <TabTransition activeKey={activeTab}>
          {/* 판매 분석 탭 */}
          {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">총 실매출액</p>
              <p className="text-green-400 text-3xl font-bold">
                {totalRevenue.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">일평균 실매출액</p>
              <p className="text-blue-400 text-3xl font-bold">
                {Math.round(avgRevenue).toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">총 판매건수</p>
              <p className="text-white text-3xl font-bold">
                {dailySales.reduce((sum, d) => sum + d.건수, 0).toLocaleString()}건
              </p>
            </div>
          </div>

          {/* 일별 매출 추이 차트 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">일별 매출 추이</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="날짜" stroke="#9CA3AF" />
                <YAxis
                  stroke="#9CA3AF"
                  tickFormatter={formatYAxis}
                  label={{ value: '단위: 만원', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  cursor={false}
                  formatter={(value: number) => value.toLocaleString() + '원'}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="실매출액"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
                />
                <Line
                  type="monotone"
                  dataKey="할인액"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8, stroke: '#F59E0B', strokeWidth: 2, fill: '#F59E0B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 매출액 바 차트 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">일별 매출 비교</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="날짜" stroke="#9CA3AF" />
                <YAxis
                  stroke="#9CA3AF"
                  tickFormatter={formatYAxis}
                  label={{ value: '단위: 만원', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  formatter={(value: number) => value.toLocaleString() + '원'}
                />
                <Legend />
                <Bar
                  dataKey="매출액"
                  fill="#3B82F6"
                  name="매출액"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="실매출액"
                  fill="#10B981"
                  name="실매출액"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 상품 분석 탭 */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* 인기 상품 TOP 20 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">인기 상품 TOP 20 (매출액 기준)</h2>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="상품명" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis
                  stroke="#9CA3AF"
                  tickFormatter={formatYAxis}
                  label={{ value: '단위: 만원', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                  formatter={(value: number) => value.toLocaleString() + '원'}
                />
                <Legend />
                <Bar
                  dataKey="매출액"
                  fill="#10B981"
                  name="매출액"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 판매량 TOP 20 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">인기 상품 TOP 20 (판매량 기준)</h2>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={[...topProducts].sort((a, b) => b.판매량 - a.판매량)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="상품명" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis
                  stroke="#9CA3AF"
                  tickFormatter={formatYAxisWithComma}
                  label={{ value: '단위: 개', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  formatter={(value: number) => value.toLocaleString() + '개'}
                />
                <Legend />
                <Bar
                  dataKey="판매량"
                  fill="#3B82F6"
                  name="판매량"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 결제 분석 탭 */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 결제수단별 매출 파이차트 */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">결제수단별 매출 비중</h2>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={paymentStats}
                    dataKey="매출액"
                    nameKey="결제수단"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry) => `${entry.결제수단}: ${((entry.매출액 / paymentStats.reduce((sum, p) => sum + p.매출액, 0)) * 100).toFixed(1)}%`}
                  >
                    {paymentStats.map((entry, index) => {
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => value.toLocaleString() + '원'}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 결제수단별 매출 바차트 */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">결제수단별 매출액</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={paymentStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="결제수단" stroke="#9CA3AF" />
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={formatYAxis}
                    label={{ value: '단위: 만원', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    formatter={(value: number) => value.toLocaleString() + '원'}
                  />
                  <Legend />
                  <Bar
                    dataKey="매출액"
                    fill="#3B82F6"
                    name="매출액"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 정산 분석 탭 */}
      {activeTab === 'settlements' && (
        <div className="space-y-6">
          {/* 업체별 정산 금액 */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">업체별 정산 금액</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={settlementStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="업체명" stroke="#9CA3AF" />
                <YAxis
                  stroke="#9CA3AF"
                  tickFormatter={formatYAxis}
                  label={{ value: '단위: 만원', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                  formatter={(value: number) => value.toLocaleString() + '원'}
                />
                <Legend />
                <Bar
                  dataKey="정산금액"
                  fill="#10B981"
                  name="정산금액"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="수수료"
                  fill="#F59E0B"
                  name="수수료"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">총 정산금액</p>
              <p className="text-green-400 text-3xl font-bold">
                {settlementStats.reduce((sum, s) => sum + s.정산금액, 0).toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">총 수수료</p>
              <p className="text-orange-400 text-3xl font-bold">
                {settlementStats.reduce((sum, s) => sum + s.수수료, 0).toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">총 정산건수</p>
              <p className="text-white text-3xl font-bold">
                {settlementStats.reduce((sum, s) => sum + s.건수, 0).toLocaleString()}건
              </p>
            </div>
          </div>
        </div>
      )}
        </TabTransition>
      )}
    </div>
  );
}
