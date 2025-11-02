-- ============================================
-- 결제 타입 확장: 간편결제, 현금영수증 지원
-- ============================================

-- 1. 간편결제사 테이블 생성
DROP TABLE IF EXISTS easy_pay_companies CASCADE;

CREATE TABLE easy_pay_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  fee_rate DECIMAL(5,2) DEFAULT 3.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE easy_pay_companies ENABLE ROW LEVEL SECURITY;

-- 모든 권한 허용
DROP POLICY IF EXISTS "Enable all" ON easy_pay_companies;
CREATE POLICY "Enable all" ON easy_pay_companies FOR ALL USING (true) WITH CHECK (true);

-- 2. sales 테이블에 간편결제사 ID 컬럼 추가
ALTER TABLE sales ADD COLUMN IF NOT EXISTS easy_pay_company_id UUID REFERENCES easy_pay_companies(id);

-- 3. payment_type 체크 제약 조건 업데이트 (기존 제약 조건 삭제 후 재생성)
-- 먼저 기존 제약 조건 이름 확인 필요 (일반적으로 sales_payment_type_check 형태)
DO $$
BEGIN
  -- 기존 제약 조건 삭제 (존재하는 경우)
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%payment_type%'
    AND table_name = 'sales'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_type_check;
  END IF;

  -- 새로운 제약 조건 추가: cash, card, cash_receipt, easy_pay
  ALTER TABLE sales ADD CONSTRAINT sales_payment_type_check
    CHECK (payment_type IN ('cash', 'card', 'cash_receipt', 'easy_pay'));
END $$;

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sales_easy_pay_company ON sales(easy_pay_company_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_type ON sales(payment_type);

-- 5. 초기 간편결제사 데이터 삽입 (선택사항)
INSERT INTO easy_pay_companies (name, fee_rate) VALUES
  ('카카오페이', 3.0),
  ('네이버페이', 3.0),
  ('토스페이', 3.0),
  ('페이코', 3.0)
ON CONFLICT (name) DO NOTHING;

-- 완료 메시지
SELECT 'Database migration completed successfully!' as status;
