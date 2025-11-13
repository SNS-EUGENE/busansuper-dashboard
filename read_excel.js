const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'etc', 'excelfiles', '251031 구글시트 기준 재고.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('시트명:', workbook.SheetNames);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// JSON으로 변환
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('\n컬럼 (첫 번째 행 기준):');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}

console.log('\n처음 5개 데이터:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));

console.log(`\n전체 행 수: ${data.length}`);

// 통계 정보
console.log('\n=== 분석 ===');
if (data.length > 0) {
  const columns = Object.keys(data[0]);
  console.log('컬럼 개수:', columns.length);
  console.log('컬럼 목록:', columns.join(', '));
}
