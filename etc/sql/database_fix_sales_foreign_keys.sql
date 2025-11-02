-- ============================================
-- sales 테이블에 card_company_id 추가 (누락 수정)
-- ============================================

-- 1. card_company_id 컬럼 추가 (이미 있다면 스킵됨)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS card_company_id UUID REFERENCES card_companies(id);

-- 2. easy_pay_company_id 컬럼 추가 (이미 있다면 스킵됨)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS easy_pay_company_id UUID REFERENCES easy_pay_companies(id);

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sales_card_company ON sales(card_company_id);
CREATE INDEX IF NOT EXISTS idx_sales_easy_pay_company ON sales(easy_pay_company_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_type ON sales(payment_type);
CREATE INDEX IF NOT EXISTS idx_sales_receipt_date ON sales(sale_date, receipt_number);

-- 완료 메시지
SELECT 'Sales table foreign keys fixed successfully!' as status;
