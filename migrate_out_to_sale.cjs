const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function migrateOutToSale() {
  console.log('=== 출고(out) → 판매(sale) 변경 시작 ===\n');

  // 1. 현재 'out' 타입 재고 변동 조회
  console.log('1. 출고(out) 타입 재고 변동 조회 중...');
  const { data: outChanges, error: fetchError } = await supabase
    .from('inventory_changes')
    .select('id, product_id, quantity, note, created_at, products(name)')
    .eq('change_type', 'out');

  if (fetchError) {
    console.error('조회 실패:', fetchError);
    return;
  }

  console.log(`   - 찾은 출고 내역: ${outChanges.length}개\n`);

  if (outChanges.length === 0) {
    console.log('출고 타입의 재고 변동이 없습니다. 종료합니다.');
    return;
  }

  // 샘플 출력
  console.log('샘플 데이터 (처음 5개):');
  outChanges.slice(0, 5).forEach((change, idx) => {
    console.log(`  ${idx + 1}. ${change.products.name} - ${change.quantity}개 (${new Date(change.created_at).toLocaleDateString()})`);
    if (change.note) console.log(`     메모: ${change.note}`);
  });
  console.log('');

  // 2. 'out' → 'sale' 변경
  console.log('2. 출고(out) → 판매(sale) 변경 중...');

  const { data: updateData, error: updateError } = await supabase
    .from('inventory_changes')
    .update({ change_type: 'sale' })
    .eq('change_type', 'out')
    .select();

  if (updateError) {
    console.error('변경 실패:', updateError);
    return;
  }

  console.log(`   - 변경 완료: ${updateData.length}개 변경\n`);

  // 3. 검증
  console.log('3. 변경 검증 중...');
  const { data: remainingOut, error: verifyError } = await supabase
    .from('inventory_changes')
    .select('id')
    .eq('change_type', 'out');

  if (verifyError) {
    console.error('검증 실패:', verifyError);
    return;
  }

  console.log(`   - 남은 출고(out) 내역: ${remainingOut.length}개`);

  const { data: saleChanges, error: saleError } = await supabase
    .from('inventory_changes')
    .select('id')
    .eq('change_type', 'sale');

  if (saleError) {
    console.error('판매 조회 실패:', saleError);
    return;
  }

  console.log(`   - 현재 판매(sale) 내역: ${saleChanges.length}개\n`);

  console.log('=== 변경 완료 ===');
  console.log(`총 ${updateData.length}개의 출고 내역이 판매로 변경되었습니다.`);
}

// 실행
migrateOutToSale()
  .then(() => {
    console.log('\n✅ 성공적으로 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
