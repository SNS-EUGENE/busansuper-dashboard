const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCurrentData() {
  console.log('=== 현재 데이터 현황 파악 ===\n');

  // 1. Sales 데이터
  console.log('1. Sales 데이터 확인...');
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id, sale_date, payment_type, quantity, product_id')
    .order('sale_date', { ascending: false });

  if (salesError) {
    console.error('Sales 조회 실패:', salesError);
  } else {
    console.log(`   - 총 판매 건수: ${sales.length}개`);

    const dates = [...new Set(sales.map(s => s.sale_date))];
    console.log(`   - 판매 날짜 범위: ${dates.length}일`);
    if (dates.length > 0) {
      console.log(`   - 최초: ${dates[dates.length - 1]}, 최근: ${dates[0]}`);
    }

    const totalQty = sales.reduce((sum, s) => sum + s.quantity, 0);
    console.log(`   - 총 판매 수량: ${totalQty}개\n`);
  }

  // 2. 판매(sale) 타입 재고 변동
  console.log('2. 판매(sale) 타입 재고 변동 확인...');
  const { data: saleChanges, error: saleChangesError } = await supabase
    .from('inventory_changes')
    .select('id, product_id, quantity, created_at, note')
    .eq('change_type', 'sale');

  if (saleChangesError) {
    console.error('재고변동 조회 실패:', saleChangesError);
  } else {
    console.log(`   - 판매 타입 재고 변동: ${saleChanges.length}개`);

    const totalSaleQty = saleChanges.reduce((sum, s) => sum + Math.abs(s.quantity), 0);
    console.log(`   - 총 차감 수량: ${totalSaleQty}개\n`);

    // 샘플 출력
    console.log('   샘플 (최근 5개):');
    saleChanges.slice(0, 5).forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${new Date(c.created_at).toLocaleString()} - 수량: ${c.quantity}, 메모: ${c.note || '없음'}`);
    });
  }

  // 3. 상품별 현재 재고 (판매가 많은 상위 10개)
  console.log('\n\n3. 판매가 많은 상품 TOP 10...');
  const productSales = {};

  sales.forEach(sale => {
    if (!productSales[sale.product_id]) {
      productSales[sale.product_id] = 0;
    }
    productSales[sale.product_id] += sale.quantity;
  });

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [productId, qty] of topProducts) {
    const { data: product } = await supabase
      .from('products')
      .select('name, current_stock')
      .eq('id', productId)
      .single();

    if (product) {
      console.log(`   - ${product.name}: 판매 ${qty}개, 현재 재고 ${product.current_stock}개`);
    }
  }

  console.log('\n=== 데이터 현황 파악 완료 ===');
}

checkCurrentData()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류:', error);
    process.exit(1);
  });
