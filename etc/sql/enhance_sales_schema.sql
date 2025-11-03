-- ================================================
-- Sales 테이블 스키마 확장
-- 결제시각, 할인 정보 추가
-- Supabase SQL Editor에서 실행하세요
-- ================================================

-- 1. sale_datetime 컬럼 추가 (결제 시각)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS sale_datetime TIMESTAMP;

-- 2. discount_amount 컬럼 추가 (할인액)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- 3. actual_sale_amount 컬럼 추가 (실매출액 = total_amount - discount_amount)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS actual_sale_amount DECIMAL(10, 2);

-- 4. sale_datetime 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sales_datetime ON sales(sale_datetime);

-- 5. 기존 데이터 마이그레이션 (sale_datetime이 NULL인 경우 sale_date로 채우기)
UPDATE sales
SET sale_datetime = sale_date::timestamp
WHERE sale_datetime IS NULL AND sale_date IS NOT NULL;

-- 6. 기존 데이터 마이그레이션 (actual_sale_amount = total_amount - discount_amount)
UPDATE sales
SET actual_sale_amount = total_amount - COALESCE(discount_amount, 0)
WHERE actual_sale_amount IS NULL;

-- 완료 메시지
SELECT
  'Sales 테이블 스키마 확장 완료!' as status,
  COUNT(*) as total_sales
FROM sales;
