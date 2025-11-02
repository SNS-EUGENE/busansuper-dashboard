-- ============================================
-- 승인내역 저장 테이블 생성
-- 승인내역을 DB에 저장하고, 재매칭 기능 제공
-- ============================================

-- 1. 카드 승인 내역 저장 테이블
DROP TABLE IF EXISTS card_approvals CASCADE;

CREATE TABLE card_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_date DATE NOT NULL,
  terminal_number TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  card_company TEXT,
  approval_amount INTEGER DEFAULT 0,
  matched BOOLEAN DEFAULT FALSE,
  matched_sale_ids TEXT[], -- 매칭된 sales ID 배열
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (approval_date, terminal_number, transaction_number)
);

CREATE INDEX idx_card_approvals_date_receipt ON card_approvals(approval_date, terminal_number, transaction_number);
CREATE INDEX idx_card_approvals_matched ON card_approvals(matched);

-- 2. 간편결제 승인 내역 저장 테이블
DROP TABLE IF EXISTS easy_pay_approvals CASCADE;

CREATE TABLE easy_pay_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_date DATE NOT NULL,
  terminal_number TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  easy_pay_company TEXT,
  approval_amount INTEGER DEFAULT 0,
  matched BOOLEAN DEFAULT FALSE,
  matched_sale_ids TEXT[], -- 매칭된 sales ID 배열
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (approval_date, terminal_number, transaction_number)
);

CREATE INDEX idx_easy_pay_approvals_date_receipt ON easy_pay_approvals(approval_date, terminal_number, transaction_number);
CREATE INDEX idx_easy_pay_approvals_matched ON easy_pay_approvals(matched);

-- 3. 현금영수증 승인 내역 저장 테이블
DROP TABLE IF EXISTS cash_receipt_approvals CASCADE;

CREATE TABLE cash_receipt_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_date DATE NOT NULL,
  terminal_number TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  approval_amount INTEGER DEFAULT 0,
  matched BOOLEAN DEFAULT FALSE,
  matched_sale_ids TEXT[], -- 매칭된 sales ID 배열
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (approval_date, terminal_number, transaction_number)
);

CREATE INDEX idx_cash_receipt_approvals_date_receipt ON cash_receipt_approvals(approval_date, terminal_number, transaction_number);
CREATE INDEX idx_cash_receipt_approvals_matched ON cash_receipt_approvals(matched);

-- 4. RLS 정책 설정 (모든 접근 허용)
ALTER TABLE card_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE easy_pay_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_receipt_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all" ON card_approvals;
CREATE POLICY "Enable all" ON card_approvals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all" ON easy_pay_approvals;
CREATE POLICY "Enable all" ON easy_pay_approvals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all" ON cash_receipt_approvals;
CREATE POLICY "Enable all" ON cash_receipt_approvals FOR ALL USING (true) WITH CHECK (true);

-- 완료 메시지
SELECT 'Approval storage tables created successfully!' as status;
