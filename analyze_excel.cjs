const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'etc', 'excelfiles', '251031 구글시트 기준 재고.xlsx');
const workbook = XLSX.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// 원본 데이터 전부 읽기 (헤더 없이)
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== Raw 데이터 구조 분석 ===\n');
console.log(`전체 행 수: ${rawData.length}`);

// 첫 2개 행 (헤더 확인)
console.log('\n첫 번째 행 (타이틀 행):');
console.log(rawData[0]);

console.log('\n두 번째 행 (실제 헤더):');
console.log(rawData[1]);

console.log('\n세 번째 행 (첫 번째 데이터):');
console.log(rawData[2]);

// 두 번째 행을 헤더로 사용
const headers = rawData[1];
console.log('\n\n=== 헤더 분석 ===');
console.log(`헤더 개수: ${headers.length}`);

console.log('\n전체 헤더 목록:');
headers.forEach((header, idx) => {
  console.log(`  [${idx}] ${header}`);
});

// 추가 입고 관련 컬럼 찾기
console.log('\n\n=== 추가 입고 관련 컬럼 ===');
const additionalStockIndexes = [];
headers.forEach((header, idx) => {
  if (header && header.toString().includes('추가')) {
    console.log(`  [${idx}] ${header}`);
    additionalStockIndexes.push(idx);
  }
});

console.log(`\n추가 입고 컬럼 개수: ${additionalStockIndexes.length}개`);

// 샘플 데이터 (헤더 매핑)
console.log('\n\n=== 샘플 데이터 (헤더 매핑) ===');
for (let i = 2; i < Math.min(5, rawData.length); i++) {
  console.log(`\n[${i-1}번째 상품]`);
  const row = rawData[i];

  console.log(`  순번: ${row[0]}`);
  console.log(`  기업명: ${row[1]}`);
  console.log(`  제품명: ${row[5]}`);
  console.log(`  바코드: ${row[7]}`);
  console.log(`  최초 판매재고수량: ${row[10]}`);

  // 추가 입고 확인
  const hasAdditional = additionalStockIndexes.some(idx => row[idx]);
  if (hasAdditional) {
    console.log('  추가 입고:');
    additionalStockIndexes.forEach(idx => {
      if (row[idx]) {
        console.log(`    ${headers[idx]}: ${row[idx]}`);
      }
    });
  }

  console.log(`  재고수량: ${row[row.length - 1]}`);
}

// 추가 입고가 있는 상품 통계
console.log('\n\n=== 추가 입고 통계 ===');
let totalWithAdditional = 0;
const additionalByDate = {};

for (let i = 2; i < rawData.length; i++) {
  const row = rawData[i];
  let hasAny = false;

  additionalStockIndexes.forEach(idx => {
    if (row[idx]) {
      hasAny = true;
      const dateKey = headers[idx];
      if (!additionalByDate[dateKey]) {
        additionalByDate[dateKey] = { count: 0, total: 0 };
      }
      additionalByDate[dateKey].count++;
      additionalByDate[dateKey].total += (row[idx] || 0);
    }
  });

  if (hasAny) totalWithAdditional++;
}

console.log(`추가 입고가 있는 상품 수: ${totalWithAdditional}개 (전체 ${rawData.length - 2}개 중)`);

console.log('\n날짜별 추가 입고 현황:');
Object.entries(additionalByDate).forEach(([date, stats]) => {
  console.log(`  ${date}: ${stats.count}개 상품, 총 ${stats.total}개 입고`);
});
