const XLSX = require('xlsx');
const path = require('path');

// 샘플 파일 읽기
const filePath = path.join(__dirname, 'etc', 'excelfiles', '250901-251102', '영수증별매출상세현황', '251101 영수증별매출상세현황.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('=== 영수증별 매출상세현황 파일 분석 ===\n');
console.log('시트명:', workbook.SheetNames);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Raw 데이터로 읽기
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('\n전체 행 수:', rawData.length);

// 처음 5개 행 출력
console.log('\n=== 처음 5개 행 (구조 파악) ===');
for (let i = 0; i < Math.min(5, rawData.length); i++) {
  console.log(`\n[${i}행]`);
  console.log(rawData[i]);
}

// 헤더 찾기 (보통 '영수증번호', '상품코드' 같은 키워드가 여러 개 있는 행)
let headerRowIndex = -1;
for (let i = 0; i < Math.min(20, rawData.length); i++) {
  const row = rawData[i];
  if (row && row.includes('영수증번호') && row.includes('상품코드')) {
    headerRowIndex = i;
    break;
  }
}

console.log('\n\n=== 헤더 행 찾음 ===');
console.log(`헤더 행 인덱스: ${headerRowIndex}`);
if (headerRowIndex >= 0) {
  const headers = rawData[headerRowIndex];
  console.log('\n헤더 목록:');
  headers.forEach((header, idx) => {
    if (header) {
      console.log(`  [${idx}] ${header}`);
    }
  });

  // 데이터 샘플 (헤더 다음 행부터 5개)
  console.log('\n\n=== 데이터 샘플 (헤더 매핑) ===');
  for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 6, rawData.length); i++) {
    const row = rawData[i];
    console.log(`\n[데이터 ${i - headerRowIndex}]`);
    headers.forEach((header, idx) => {
      if (header && row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
        console.log(`  ${header}: ${row[idx]}`);
      }
    });
  }
}
