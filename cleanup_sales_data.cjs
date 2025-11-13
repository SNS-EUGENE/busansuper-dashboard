const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function cleanupSalesData() {
  console.log('=== 판매 데이터 정리 및 재고 원복 시작 ===\n');

  try {
    // 1. 판매(sale) 타입 재고 변동 조회
    console.log('1. 판매(sale) 타입 재고 변동 조회...');
    const { data: saleChanges, error: saleChangesError } = await supabase
      .from('inventory_changes')
      .select('id, product_id, quantity, previous_stock, new_stock, note')
      .eq('change_type', 'sale');

    if (saleChangesError) {
      throw new Error(`재고변동 조회 실패: ${saleChangesError.message}`);
    }

    console.log(`   - 찾은 판매 재고 변동: ${saleChanges.length}개\n`);

    // 2. 재고 원복
    console.log('2. 재고 원복 중...');
    const stockRestores = {};

    // 상품별로 그룹핑
    saleChanges.forEach(change => {
      if (!stockRestores[change.product_id]) {
        stockRestores[change.product_id] = {
          totalChange: 0,
          count: 0,
        };
      }
      // quantity가 음수이므로 빼면 원복
      stockRestores[change.product_id].totalChange -= change.quantity;
      stockRestores[change.product_id].count++;
    });

    console.log(`   - 원복 대상 상품: ${Object.keys(stockRestores).length}개\n`);

    let restoredCount = 0;
    for (const [productId, info] of Object.entries(stockRestores)) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, current_stock')
        .eq('id', productId)
        .single();

      if (productError) {
        console.error(`   상품 조회 실패 (${productId}):`, productError.message);
        continue;
      }

      const restoredStock = product.current_stock + info.totalChange;

      console.log(`   - ${product.name}: ${product.current_stock} → ${restoredStock} (+${info.totalChange}, ${info.count}건)`);

      const { error: updateError } = await supabase
        .from('products')
        .update({ current_stock: restoredStock })
        .eq('id', productId);

      if (updateError) {
        console.error(`   재고 원복 실패 (${product.name}):`, updateError.message);
      } else {
        restoredCount++;
      }
    }

    console.log(`\n   - 재고 원복 완료: ${restoredCount}개 상품\n`);

    // 3. Sales 데이터 삭제
    console.log('3. Sales 데이터 삭제...');
    const { data: deletedSales, error: deleteSalesError } = await supabase
      .from('sales')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 데이터
      .select();

    if (deleteSalesError) {
      throw new Error(`Sales 삭제 실패: ${deleteSalesError.message}`);
    }

    console.log(`   - 삭제된 판매 데이터: ${deletedSales.length}건\n`);

    // 4. 재고변동(sale) 데이터 삭제
    console.log('4. 판매(sale) 타입 재고 변동 삭제...');
    const { data: deletedChanges, error: deleteChangesError } = await supabase
      .from('inventory_changes')
      .delete()
      .eq('change_type', 'sale')
      .select();

    if (deleteChangesError) {
      throw new Error(`재고변동 삭제 실패: ${deleteChangesError.message}`);
    }

    console.log(`   - 삭제된 재고 변동: ${deletedChanges.length}건\n`);

    // 5. 검증
    console.log('5. 정리 결과 검증...');
    const { data: remainingSales } = await supabase
      .from('sales')
      .select('id');

    const { data: remainingSaleChanges } = await supabase
      .from('inventory_changes')
      .select('id')
      .eq('change_type', 'sale');

    console.log(`   - 남은 판매 데이터: ${remainingSales.length}건`);
    console.log(`   - 남은 판매 재고 변동: ${remainingSaleChanges.length}건\n`);

    console.log('=== 정리 완료 ===');
    console.log(`✅ 재고 원복: ${restoredCount}개 상품`);
    console.log(`✅ 판매 데이터 삭제: ${deletedSales.length}건`);
    console.log(`✅ 재고 변동 삭제: ${deletedChanges.length}건`);

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    throw error;
  }
}

cleanupSalesData()
  .then(() => {
    console.log('\n🎉 모든 작업이 성공적으로 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 작업 실패:', error);
    process.exit(1);
  });
