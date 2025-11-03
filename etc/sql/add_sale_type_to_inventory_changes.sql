-- ================================================
-- 재고 변동 타입에 '판매' 추가
-- Supabase SQL Editor에서 실행하세요
-- ================================================

-- inventory_changes 테이블의 change_type 제약조건 수정
-- 기존: 'in', 'out', 'adjust'
-- 변경: 'in', 'sale', 'out', 'adjust'

-- 1. 기존 제약조건 삭제 (있다면)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'inventory_changes_change_type_check'
    ) THEN
        ALTER TABLE inventory_changes DROP CONSTRAINT inventory_changes_change_type_check;
    END IF;
END $$;

-- 2. 새로운 제약조건 추가
ALTER TABLE inventory_changes
  ADD CONSTRAINT inventory_changes_change_type_check
  CHECK (change_type IN ('in', 'sale', 'out', 'adjust'));

-- 완료
SELECT 'inventory_changes 테이블에 sale 타입 추가 완료' AS status;
