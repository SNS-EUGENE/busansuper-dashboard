const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'etc', 'excelfiles', '251031 구글시트 기준 재고.xlsx');
const workbook = XLSX.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// header row를 1로 설정 (2번째 행부터가 실제 헤더)
const data = XLSX.utils.sheet_to_json(worksheet, { range: 1 }); // row 1부터 시작 (0-indexed)

console.log('=== 엑셀 파일 구조 분석 ===\n');
console.log(`전체 행 수: ${data.length}`);

if (data.length > 0) {
  console.log('\n컬럼 목록:');
  const columns = Object.keys(data[0]);
  columns.forEach((col, idx) => {
    console.log(`  ${idx + 1}. ${col}`);
  });

  console.log('\n\n=== 샘플 데이터 (첫 3개) ===');
  data.slice(0, 3).forEach((row, idx) => {
    console.log(`\n[${idx + 1}번째 상품]`);
    console.log(`  순번: ${row['순번']}`);
    console.log(`  기업명: ${row['기업명']}`);
    console.log(`  카테고리: ${row['카테고리']}`);
    console.log(`  품목: ${row['품목']}`);
    console.log(`  제품명: ${row['제품명']}`);
    console.log(`  단가: ${row['단가(원)']}`);
    console.log(`  바코드: ${row['바코드 텍스트 변환']}`);
    console.log(`  최초 판매재고수량: ${row['최초 판매재고수량']}`);
    console.log(`  거래명세상 수량: ${row['거래명세상 수량']}`);

    // 추가 입고 상품 컬럼 찾기
    const additionalStock = {};
    Object.keys(row).forEach(key => {
      if (key.includes('추가 입고') && row[key]) {
        additionalStock[key] = row[key];
      }
    });

    if (Object.keys(additionalStock).length > 0) {
      console.log(`  추가 입고:`);
      Object.entries(additionalStock).forEach(([date, qty]) => {
        console.log(`    ${date}: ${qty}`);
      });
    }

    console.log(`  재고수량: ${row['재고수량']}`);
  });

  // 추가 입고가 있는 상품 통계
  console.log('\n\n=== 추가 입고 현황 ===');
  let totalWithAdditionalStock = 0;
  const additionalStockCols = columns.filter(col => col.includes('추가 입고'));

  console.log(`추가 입고 날짜 컬럼 수: ${additionalStockCols.length}`);
  console.log('추가 입고 날짜 목록:');
  additionalStockCols.forEach(col => console.log(`  - ${col}`));

  data.forEach(row => {
    const hasAdditional = additionalStockCols.some(col => row[col]);
    if (hasAdditional) totalWithAdditionalStock++;
  });

  console.log(`\n추가 입고가 있는 상품 수: ${totalWithAdditionalStock}개 (전체 ${data.length}개 중)`);
}
