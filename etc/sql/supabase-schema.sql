-- ================================================
-- 부산슈퍼 재고관리 시스템 - 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요
-- ================================================

-- 1. 카테고리 테이블
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 품목 테이블
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 업체 테이블
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  representative VARCHAR(100),
  contact VARCHAR(20),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_company UNIQUE(company)
);

-- 4. 상품 테이블
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code VARCHAR(50) NOT NULL,
  barcode VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id),
  item_id UUID REFERENCES items(id),
  vendor_id UUID REFERENCES vendors(id),
  initial_stock INT DEFAULT 0,
  current_stock INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  tour_guide BOOLEAN DEFAULT false,
  sponsor BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_product_code UNIQUE(product_code)
);

-- 5. 카드사 수수료율 테이블
CREATE TABLE IF NOT EXISTS card_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_company VARCHAR(100) NOT NULL UNIQUE,
  fee_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. 영수증 마스터 테이블
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) NOT NULL,
  receipt_datetime TIMESTAMP NOT NULL,
  payment_method VARCHAR(20),
  card_company_id UUID REFERENCES card_companies(id),
  card_company_name VARCHAR(100),
  card_fee_rate DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  card_fee DECIMAL(10, 2) DEFAULT 0,
  settlement_amount DECIMAL(10, 2) DEFAULT 0,
  upload_batch_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_receipt_number UNIQUE(receipt_number)
);

-- 7. 영수증 상세 항목 테이블
CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  vendor_id UUID REFERENCES vendors(id),
  product_code VARCHAR(50),
  barcode VARCHAR(50),
  product_name VARCHAR(255),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  total_price DECIMAL(10, 2) DEFAULT 0,
  card_fee DECIMAL(10, 2) DEFAULT 0,
  vendor_settlement DECIMAL(10, 2) DEFAULT 0,
  type VARCHAR(10) CHECK (type IN ('매출', '반품')),
  matched BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. 판매 거래 테이블 (기존 호환성 유지)
CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date TIMESTAMP NOT NULL,
  receipt_id UUID REFERENCES receipts(id),
  product_id UUID REFERENCES products(id),
  product_code VARCHAR(50),
  barcode VARCHAR(50),
  product_name VARCHAR(255),
  quantity INT NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('매출', '반품')),
  total_amount DECIMAL(10, 2),
  receipt_number VARCHAR(50),
  matched BOOLEAN DEFAULT false,
  upload_batch_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. 월별 거래처 정산 테이블
CREATE TABLE IF NOT EXISTS vendor_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_month VARCHAR(7) NOT NULL,
  vendor_id UUID REFERENCES vendors(id),
  vendor_name VARCHAR(255),
  total_sales DECIMAL(12, 2) DEFAULT 0,
  total_card_fee DECIMAL(12, 2) DEFAULT 0,
  settlement_amount DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT '미정산' CHECK (status IN ('미정산', '정산완료')),
  settled_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_vendor_month UNIQUE(settlement_month, vendor_id)
);

-- 10. 업로드 이력 테이블
CREATE TABLE IF NOT EXISTS upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  upload_date TIMESTAMP DEFAULT NOW(),
  file_type VARCHAR(20),
  sales_count INT DEFAULT 0,
  return_count INT DEFAULT 0,
  matched_count INT DEFAULT 0,
  unmatched_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed',
  error_message TEXT,
  inventory_snapshot JSONB,
  processed_items JSONB
);

-- ================================================
-- 인덱스 생성 (성능 향상)
-- ================================================

-- 상품 인덱스
CREATE INDEX IF NOT EXISTS idx_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_product_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_product_name ON products(name);

-- 업체 인덱스
CREATE INDEX IF NOT EXISTS idx_vendor_short_name ON vendors(short_name);

-- 영수증 인덱스
CREATE INDEX IF NOT EXISTS idx_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipt_datetime ON receipts(receipt_datetime);
CREATE INDEX IF NOT EXISTS idx_receipt_card_company ON receipts(card_company_id);

-- 영수증 상세 인덱스
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product ON receipt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_vendor ON receipt_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_code ON receipt_items(product_code);

-- 판매 거래 인덱스
CREATE INDEX IF NOT EXISTS idx_sales_product_code ON sales_transactions(product_code);
CREATE INDEX IF NOT EXISTS idx_sales_transaction_date ON sales_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sales_upload_batch ON sales_transactions(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_sales_receipt ON sales_transactions(receipt_id);

-- 정산 인덱스
CREATE INDEX IF NOT EXISTS idx_settlement_month ON vendor_settlements(settlement_month);
CREATE INDEX IF NOT EXISTS idx_settlement_vendor ON vendor_settlements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_settlement_status ON vendor_settlements(status);

-- ================================================
-- RLS (Row Level Security) 정책
-- 지금은 간단하게 모든 사용자가 접근 가능하도록 설정
-- 나중에 인증 추가 시 수정 가능
-- ================================================

-- products 테이블 RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON products
FOR ALL USING (true) WITH CHECK (true);

-- vendors 테이블 RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON vendors
FOR ALL USING (true) WITH CHECK (true);

-- categories 테이블 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON categories
FOR ALL USING (true) WITH CHECK (true);

-- items 테이블 RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON items
FOR ALL USING (true) WITH CHECK (true);

-- sales_transactions 테이블 RLS
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON sales_transactions
FOR ALL USING (true) WITH CHECK (true);

-- upload_history 테이블 RLS
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON upload_history
FOR ALL USING (true) WITH CHECK (true);

-- card_companies 테이블 RLS
ALTER TABLE card_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON card_companies
FOR ALL USING (true) WITH CHECK (true);

-- receipts 테이블 RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON receipts
FOR ALL USING (true) WITH CHECK (true);

-- receipt_items 테이블 RLS
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON receipt_items
FOR ALL USING (true) WITH CHECK (true);

-- vendor_settlements 테이블 RLS
ALTER TABLE vendor_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for all users" ON vendor_settlements
FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- 샘플 데이터 (테스트용)
-- ================================================

-- 카테고리 샘플
INSERT INTO categories (name) VALUES
  ('식품'),
  ('음료'),
  ('생활용품'),
  ('주류')
ON CONFLICT (name) DO NOTHING;

-- 품목 샘플
INSERT INTO items (name) VALUES
  ('과자'),
  ('라면'),
  ('음료수'),
  ('세제')
ON CONFLICT (name) DO NOTHING;

-- 업체 샘플
INSERT INTO vendors (company, short_name, contact) VALUES
  ('농심', '농심', '02-1234-5678'),
  ('오리온', '오리온', '02-2345-6789'),
  ('롯데칠성', '롯데칠성', '02-3456-7890')
ON CONFLICT (company) DO NOTHING;

-- 카드사 수수료율 샘플
INSERT INTO card_companies (card_company, fee_rate, notes) VALUES
  ('신한카드', 3.00, '일반 수수료율'),
  ('삼성카드', 2.80, '일반 수수료율'),
  ('현대카드', 3.00, '일반 수수료율'),
  ('KB국민카드', 2.90, '일반 수수료율'),
  ('롯데카드', 3.00, '일반 수수료율'),
  ('하나카드', 2.90, '일반 수수료율'),
  ('BC카드', 3.00, '일반 수수료율'),
  ('NH농협카드', 2.80, '일반 수수료율'),
  ('현금', 0.00, '수수료 없음')
ON CONFLICT (card_company) DO NOTHING;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 데이터베이스 스키마가 성공적으로 생성되었습니다!';
  RAISE NOTICE '📊 생성된 테이블:';
  RAISE NOTICE '   - categories (카테고리)';
  RAISE NOTICE '   - items (품목)';
  RAISE NOTICE '   - vendors (업체)';
  RAISE NOTICE '   - products (상품)';
  RAISE NOTICE '   - card_companies (카드사 수수료율)';
  RAISE NOTICE '   - receipts (영수증 마스터)';
  RAISE NOTICE '   - receipt_items (영수증 상세)';
  RAISE NOTICE '   - sales_transactions (판매 거래)';
  RAISE NOTICE '   - vendor_settlements (월별 거래처 정산)';
  RAISE NOTICE '   - upload_history (업로드 이력)';
  RAISE NOTICE '🔐 RLS 정책이 활성화되었습니다';
  RAISE NOTICE '📝 샘플 데이터가 추가되었습니다 (카드사 수수료율 포함)';
  RAISE NOTICE '💰 정산 기능을 위한 테이블이 준비되었습니다';
END $$;
