-- 카드사(매입사) 테이블 생성
CREATE TABLE IF NOT EXISTS card_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  fee_rate DECIMAL(5,2) DEFAULT 0, -- 수수료율 (%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE card_companies IS '카드사(매입사) 정보';
COMMENT ON COLUMN card_companies.name IS '카드사명 (예: 신한카드, 하나카드)';
COMMENT ON COLUMN card_companies.fee_rate IS '카드 수수료율 (%)';

-- sales 테이블에 결제 정보 추가
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash' CHECK (payment_type IN ('cash', 'card')),
  ADD COLUMN IF NOT EXISTS card_company_id UUID REFERENCES card_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT;

COMMENT ON COLUMN sales.payment_type IS '결제 방식 (cash: 현금, card: 카드)';
COMMENT ON COLUMN sales.card_company_id IS '카드사 ID (카드 결제 시)';
COMMENT ON COLUMN sales.receipt_number IS '영수증번호 (단말기번호+거래번호)';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_sales_receipt_number ON sales(receipt_number);
CREATE INDEX IF NOT EXISTS idx_sales_card_company ON sales(card_company_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_type ON sales(payment_type);

-- settlements 테이블에 카드사 정보 추가
ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS card_company_id UUID REFERENCES card_companies(id) ON DELETE SET NULL;

COMMENT ON COLUMN settlements.card_company_id IS '카드사별 정산 (NULL이면 전체 정산)';

-- 기존 데이터 기본값 설정
UPDATE sales SET payment_type = 'cash' WHERE payment_type IS NULL;
