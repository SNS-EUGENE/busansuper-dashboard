const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// 날짜 파싱 함수
function parseDate(dateStr) {
  // "추가 입고\n상품(~9/16)" -> "2024-09-16"
  // "추가 입고상품(9/26)" -> "2024-09-26"
  // "추가 입고상품(10/1)" -> "2024-10-01"

  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;

  const month = match[1].padStart(2, '0');
  const day = match[2].padStart(2, '0');

  // 2024년으로 가정
  return `2024-${month}-${day}`;
}

async function migrateAdditionalStock() {
  console.log('=== 추가 입고 데이터 마이그레이션 시작 ===\n');

  // 1. 엑셀 파일 읽기
  console.log('1. 엑셀 파일 읽기...');
  const filePath = path.join(__dirname, 'etc', 'excelfiles', '251031 구글시트 기준 재고.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const headers = rawData[1]; // 2번째 행이 헤더
  const dataRows = rawData.slice(2); // 3번째 행부터 데이터

  console.log(`   - 전체 상품 수: ${dataRows.length}개`);

  // 2. 추가 입고 컬럼 찾기
  const additionalStockColumns = [];
  headers.forEach((header, idx) => {
    if (header && header.toString().includes('추가')) {
      const date = parseDate(header);
      if (date) {
        additionalStockColumns.push({ index: idx, header, date });
      }
    }
  });

  console.log(`   - 추가 입고 날짜: ${additionalStockColumns.length}개\n`);

  // 3. Supabase에서 모든 상품 조회 (바코드 매칭용)
  console.log('2. Supabase에서 상품 목록 조회...');
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, barcode, name, current_stock');

  if (productsError) {
    console.error('상품 조회 실패:', productsError);
    return;
  }

  console.log(`   - DB 상품 수: ${products.length}개\n`);

  // 바코드 -> 상품 ID 매핑
  const barcodeMap = {};
  products.forEach(p => {
    if (p.barcode) {
      barcodeMap[p.barcode.toString().trim()] = p;
    }
  });

  // 4. 추가 입고 데이터 수집
  console.log('3. 추가 입고 데이터 수집 중...');
  const inventoryChanges = [];
  const stockUpdates = {}; // product_id -> total additional stock

  let matchedCount = 0;
  let unmatchedCount = 0;
  let totalAdditionalStock = 0;

  dataRows.forEach((row, rowIdx) => {
    const barcode = row[7]?.toString().trim(); // 바코드 컬럼 (인덱스 7)
    const productName = row[5]; // 제품명

    if (!barcode) return;

    const product = barcodeMap[barcode];

    if (!product) {
      unmatchedCount++;
      return;
    }

    let hasAdditionalStock = false;

    // 각 추가 입고 컬럼 확인
    additionalStockColumns.forEach(({ index, header, date }) => {
      const qty = row[index];

      if (qty && !isNaN(qty) && qty > 0) {
        hasAdditionalStock = true;
        totalAdditionalStock += qty;

        // 재고 변동 기록 추가
        inventoryChanges.push({
          product_id: product.id,
          change_type: 'in',
          quantity: qty,
          previous_stock: product.current_stock + (stockUpdates[product.id] || 0),
          new_stock: product.current_stock + (stockUpdates[product.id] || 0) + qty,
          note: `추가 입고 (${date}) - ${productName}`,
          created_at: new Date(date + 'T09:00:00').toISOString(), // 날짜 지정
        });

        // 누적 재고 업데이트
        stockUpdates[product.id] = (stockUpdates[product.id] || 0) + qty;
      }
    });

    if (hasAdditionalStock) {
      matchedCount++;
    }
  });

  console.log(`   - 매칭 성공: ${matchedCount}개 상품`);
  console.log(`   - 매칭 실패: ${unmatchedCount}개 상품`);
  console.log(`   - 생성할 재고 변동 기록: ${inventoryChanges.length}개`);
  console.log(`   - 총 추가 입고 수량: ${totalAdditionalStock}개\n`);

  if (inventoryChanges.length === 0) {
    console.log('추가 입고 데이터가 없습니다. 종료합니다.');
    return;
  }

  // 5. Supabase에 재고 변동 기록 삽입
  console.log('4. Supabase에 재고 변동 기록 삽입 중...');

  // 배치로 나눠서 삽입 (한 번에 너무 많으면 실패할 수 있음)
  const batchSize = 50;
  let insertedCount = 0;

  for (let i = 0; i < inventoryChanges.length; i += batchSize) {
    const batch = inventoryChanges.slice(i, i + batchSize);

    const { error } = await supabase
      .from('inventory_changes')
      .insert(batch);

    if (error) {
      console.error(`배치 ${Math.floor(i / batchSize) + 1} 삽입 실패:`, error);
      // 계속 진행
    } else {
      insertedCount += batch.length;
      console.log(`   - 진행: ${insertedCount}/${inventoryChanges.length}`);
    }
  }

  console.log(`   - 완료: ${insertedCount}개 기록 삽입\n`);

  // 6. 상품별 재고 업데이트
  console.log('5. 상품 재고 수량 업데이트 중...');

  let updatedCount = 0;
  for (const [productId, additionalQty] of Object.entries(stockUpdates)) {
    const product = products.find(p => p.id === productId);
    if (!product) continue;

    const newStock = product.current_stock + additionalQty;

    const { error } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', productId);

    if (error) {
      console.error(`상품 ${productId} 재고 업데이트 실패:`, error);
    } else {
      updatedCount++;
      console.log(`   - ${product.name}: ${product.current_stock} -> ${newStock} (+${additionalQty})`);
    }
  }

  console.log(`\n   - 완료: ${updatedCount}개 상품 재고 업데이트\n`);

  console.log('=== 마이그레이션 완료 ===');
  console.log(`총 ${insertedCount}개의 재고 변동 기록이 생성되었습니다.`);
  console.log(`총 ${updatedCount}개의 상품 재고가 업데이트되었습니다.`);
}

// 실행
migrateAdditionalStock()
  .then(() => {
    console.log('\n✅ 성공적으로 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
