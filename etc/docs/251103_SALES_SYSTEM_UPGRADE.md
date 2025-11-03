# 판매 시스템 업그레이드 완료 보고서

📅 작업일: 2025-11-03
👨‍💻 작업자: Claude
🎯 목표: 판매 데이터 시각 정확성 개선 및 할인 정보 추가

---

## 🔍 문제점 발견

### 1. 시각 문제
- **증상**: 재고변동 페이지에서 판매 시각이 엑셀 업로드 시각으로 표시됨
- **원인**: `inventory_changes` 테이블의 `created_at`이 업로드 시각으로 자동 저장
- **영향**: 실제 판매 시각과 다른 시각이 기록됨

### 2. 할인 정보 누락
- **증상**: 엑셀 파일에는 할인액, 실매출액이 있지만 DB에는 저장 안됨
- **원인**: DB 스키마에 해당 컬럼 없음, 파싱 로직에서 무시
- **영향**: 향후 일별/주별/월별 심층 분석 시 정확한 수치 파악 불가

---

## ✅ 수행 작업

### 1단계: 데이터 정리 ✅
```
✅ 재고 원복: 38개 상품
✅ 판매 데이터 삭제: 52건
✅ 재고 변동 삭제: 95건
```

**복원된 재고 예시:**
- 부산엽서: 23 → 30 (+7개)
- 부산커피믹스 씨쏠트카라멜: -1 → 10 (+11개)
- 부산 IPA: 71 → 80 (+9개)

### 2단계: DB 스키마 확장 ✅

**파일**: `etc/sql/enhance_sales_schema.sql`

추가된 컬럼:
```sql
-- sales 테이블
ALTER TABLE sales ADD COLUMN sale_datetime TIMESTAMP;         -- 결제시각
ALTER TABLE sales ADD COLUMN discount_amount DECIMAL(10,2);   -- 할인액
ALTER TABLE sales ADD COLUMN actual_sale_amount DECIMAL(10,2); -- 실매출액
```

인덱스 추가:
```sql
CREATE INDEX idx_sales_datetime ON sales(sale_datetime);
```

### 3단계: 코드 개선 ✅

**파일**: `src/features/sales/ReceiptDetailUpload.tsx`

#### 변경 1: 인터페이스 확장
```typescript
interface ReceiptDetailRow {
  date: string;
  terminalNumber: string;
  transactionNumber: string;
  paymentType: string;
  saleTime: string;              // ⭐ 추가
  productCode: string;
  barcode: string;
  quantity: number;
  totalAmount: number;           // ⭐ 추가
  discountAmount: number;        // ⭐ 추가
  actualSaleAmount: number;      // ⭐ 추가
}
```

#### 변경 2: 파싱 로직 개선
```typescript
// 엑셀 파일 구조
// [5] 결제시각
// [10] 총매출액
// [11] 할인액
// [13] 실매출액

rows.push({
  saleTime: String(row[5]).trim(),         // 결제시각
  totalAmount: Number(row[10]) || 0,       // 총매출액
  discountAmount: Number(row[11]) || 0,    // 할인액
  actualSaleAmount: Number(row[13]) || 0,  // 실매출액
});
```

#### 변경 3: Sales 데이터 저장 개선
```typescript
const saleDatetime = row.saleTime
  ? `${row.date} ${row.saleTime}`  // 날짜 + 시각 결합
  : row.date;

await supabase.from('sales').insert({
  sale_date: row.date,
  sale_datetime: saleDatetime,          // ⭐ 추가
  total_amount: row.totalAmount,
  discount_amount: row.discountAmount,  // ⭐ 추가
  actual_sale_amount: row.actualSaleAmount, // ⭐ 추가
  // ... 기타
});
```

#### 변경 4: 재고변동 기록 개선
```typescript
await supabase.from('inventory_changes').insert({
  change_type: 'sale',           // 'out' → 'sale' 변경
  created_at: saleDatetime,      // ⭐ 판매 시각으로 명시적 지정
  // ... 기타
});
```

---

## 📊 개선 효과

### Before (개선 전)
```
판매 시각: 2025-11-03 00:37:22 (업로드 시각)
총매출액: 4,500원
할인액: (없음)
실매출액: (없음)
재고변동 시각: 2025-11-03 00:37:22 (업로드 시각)
```

### After (개선 후)
```
판매 시각: 2025-11-01 14:24:11 (실제 결제 시각)
총매출액: 4,500원
할인액: 4,500원
실매출액: 0원
재고변동 시각: 2025-11-01 14:24:11 (실제 판매 시각)
```

---

## 🚀 다음 단계

### 필수 작업
1. **Supabase SQL Editor에서 마이그레이션 실행**
   - 파일: `etc/sql/enhance_sales_schema.sql`
   - 위치: Supabase 대시보드 → SQL Editor

2. **판매 데이터 재업로드**
   - 경로: `etc/excelfiles/250901-251102/영수증별매출상세현황/`
   - 파일: 날짜별 엑셀 파일들 (250903 ~ 251102)
   - 방법: 판매 데이터 탭 → 영수증별 상세 업로드

### 선택 작업
- 데이터 분석 페이지에서 할인 정보 활용
- 일별/주별/월별 분석 시 실매출액 기준 차트 추가

---

## 📝 주의사항

### 데이터 재업로드 시
1. 날짜 순서대로 업로드 (오래된 것부터)
2. 각 파일 업로드 후 성공 메시지 확인
3. 재고 부족 오류 발생 시 "강제 차감" 옵션 고려

### 엑셀 파일 구조
```
[3행] 헤더
포스번호(0), 영수증번호(1), 구분(2), 테이블명(3),
최초주문(4), 결제시각(5), 상품코드(6), 바코드(7),
상품명(8), 수량(9), 총매출액(10), 할인액(11),
할인구분(12), 실매출액(13), 가액(14), 부가세(15)
```

---

## 🔧 생성된 파일 목록

### 스크립트
- `check_current_data.cjs` - 데이터 현황 파악
- `cleanup_sales_data.cjs` - 데이터 정리 및 재고 원복

### SQL
- `etc/sql/enhance_sales_schema.sql` - DB 스키마 확장

### 문서
- `etc/docs/251103_SALES_SYSTEM_UPGRADE.md` - 본 문서

---

## ✨ 마무리

모든 작업이 안전하게 완료되었습니다!

- ✅ 기존 데이터 안전하게 정리
- ✅ 재고 정확하게 원복
- ✅ DB 스키마 확장 준비 완료
- ✅ 코드 개선 완료

**이제 Supabase에서 SQL을 실행하고, 판매 데이터를 재업로드하면 됩니다!**

---

📌 **문의사항이나 문제 발생 시 본 문서 참고**
