import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  product_code: string;
  current_stock: number;
  optimal_stock: number;
  low_stock_threshold: number;
}

interface Sale {
  id: string;
  total_amount: number;
  sale_date: string;
  products: {
    name: string;
  };
}

interface InventoryChange {
  id: string;
  change_type: string;
  quantity: number;
  created_at: string;
  products: {
    name: string;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalVendors: 0,
    lowStockCount: 0,
    todaySales: 0,
    todayRevenue: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentChanges, setRecentChanges] = useState<InventoryChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 상품 수
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // 업체 수
      const { count: vendorsCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true });

      // 모든 상품 조회 (재고율 계산을 위해)
      const { data: allProducts } = await supabase.from('products').select('*');

      // 재고 부족 상품 필터링 (optimal_stock 기준)
      const lowStock =
        allProducts?.filter((p) => {
          if (p.current_stock === 0) return true;
          if (p.optimal_stock === 0) return false;
          const rate = (p.current_stock / p.optimal_stock) * 100;
          return rate <= p.low_stock_threshold;
        }) || [];

      // 재고율이 낮은 순으로 정렬하고 상위 10개만
      const sortedLowStock = lowStock
        .sort((a, b) => {
          const rateA = a.optimal_stock === 0 ? 100 : (a.current_stock / a.optimal_stock) * 100;
          const rateB = b.optimal_stock === 0 ? 100 : (b.current_stock / b.optimal_stock) * 100;
          return rateA - rateB;
        })
        .slice(0, 10);

      setLowStockProducts(sortedLowStock);

      // 오늘 날짜
      const today = new Date().toISOString().split('T')[0];

      // 오늘 판매 데이터
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('*')
        .eq('sale_date', today);

      const todaySalesCount = todaySalesData?.length || 0;
      const todayRevenue =
        todaySalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

      // 최근 판매 내역 (최근 10건)
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select(
          `
          *,
          products (name)
        `
        )
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentSales(recentSalesData || []);

      // 최근 재고 변동 (최근 5건)
      const { data: recentChangesData } = await supabase
        .from('inventory_changes')
        .select(
          `
          *,
          products (name)
        `
        )
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentChanges(recentChangesData || []);

      setStats({
        totalProducts: productsCount || 0,
        totalVendors: vendorsCount || 0,
        lowStockCount: lowStock.length,
        todaySales: todaySalesCount,
        todayRevenue,
      });
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockRate = (product: Product) => {
    if (product.optimal_stock === 0) return 0;
    return Math.round((product.current_stock / product.optimal_stock) * 100);
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'in':
        return { label: '입고', color: 'text-green-400' };
      case 'out':
        return { label: '출고', color: 'text-red-400' };
      case 'adjust':
        return { label: '조정', color: 'text-yellow-400' };
      default:
        return { label: '-', color: 'text-gray-400' };
    }
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
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-white">대시보드</h1>
      </div>

      {/* 통계 카드 (고정) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-4 flex-shrink-0">
        <Link to="/products">
          <StatCard icon="📦" title="전체 상품" value={stats.totalProducts} unit="개" color="blue" />
        </Link>
        <Link to="/vendors">
          <StatCard icon="🏢" title="등록 업체" value={stats.totalVendors} unit="개" color="green" />
        </Link>
        <StatCard
          icon="⚠️"
          title="재고 부족"
          value={stats.lowStockCount}
          unit="개"
          color="red"
        />
        <Link to="/sales">
          <StatCard icon="💰" title="오늘 판매" value={stats.todaySales} unit="건" color="purple" />
        </Link>
        <Link to="/sales">
          <StatCard
            icon="💵"
            title="오늘 매출"
            value={Math.round(stats.todayRevenue / 10000)}
            unit="만원"
            color="cyan"
          />
        </Link>
      </div>

      {/* 메인 콘텐츠 (유동적) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* 재고 부족 상품 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">재고 부족 상품</h2>
            <Link
              to="/products"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="p-6">
            {lowStockProducts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">재고 부족 상품이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => {
                  const rate = getStockRate(product);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{product.name}</p>
                        <p className="text-gray-400 text-sm">{product.product_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">
                          {product.current_stock}/{product.optimal_stock}개
                        </p>
                        <p
                          className={`text-sm font-bold ${
                            rate === 0 ? 'text-red-400' : 'text-yellow-400'
                          }`}
                        >
                          {rate}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 최근 판매 내역 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">최근 판매</h2>
            <Link to="/sales" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              전체 보기 →
            </Link>
          </div>
          <div className="p-6">
            {recentSales.length === 0 ? (
              <p className="text-gray-400 text-center py-8">판매 내역이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{sale.products.name}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(sale.sale_date).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <p className="text-green-400 font-bold">
                      {sale.total_amount.toLocaleString()}원
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 최근 재고 변동 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">최근 재고 변동</h2>
            <Link
              to="/inventory-changes"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="p-6">
            {recentChanges.length === 0 ? (
              <p className="text-gray-400 text-center py-8">재고 변동 내역이 없습니다</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentChanges.map((change) => {
                  const typeInfo = getChangeTypeLabel(change.change_type);
                  return (
                    <div
                      key={change.id}
                      className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{change.products.name}</p>
                        <p className="text-gray-400 text-sm">
                          {new Date(change.created_at).toLocaleString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${typeInfo.color}`}>
                          {change.quantity > 0 ? '+' : ''}
                          {change.quantity}개
                        </p>
                        <p className="text-gray-400 text-sm">{typeInfo.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  title: string;
  value: number;
  unit: string;
  color: 'blue' | 'green' | 'red' | 'purple' | 'cyan';
}

function StatCard({ icon, title, value, unit, color }: StatCardProps) {
  const colors = {
    blue: 'border-blue-500 bg-blue-900/20 hover:bg-blue-900/30',
    green: 'border-green-500 bg-green-900/20 hover:bg-green-900/30',
    red: 'border-red-500 bg-red-900/20 hover:bg-red-900/30',
    purple: 'border-purple-500 bg-purple-900/20 hover:bg-purple-900/30',
    cyan: 'border-cyan-500 bg-cyan-900/20 hover:bg-cyan-900/30',
  };

  return (
    <div className={`${colors[color]} border-2 rounded-lg p-6 transition cursor-pointer`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-4xl">{icon}</span>
        <span className="text-gray-400 text-sm">{title}</span>
      </div>
      <div className="mt-4">
        <span className="text-3xl font-bold text-white">{value.toLocaleString()}</span>
        <span className="text-gray-400 ml-2">{unit}</span>
      </div>
    </div>
  );
}
