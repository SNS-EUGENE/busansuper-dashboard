# 🚀 부산슈퍼 재고관리 시스템 - 설치 가이드

## 📋 현재 진행 상황

✅ **완료된 작업**
- [x] React + TypeScript + Vite 프로젝트 생성
- [x] 필요한 npm 패키지 설치
- [x] Tailwind CSS 설정
- [x] 프로젝트 폴더 구조 생성
- [x] Supabase 연동 설정 파일 생성
- [x] 환경 변수 파일 생성
- [x] TypeScript 타입 정의

## 📦 설치된 패키지

### 메인 의존성
```json
{
  "@supabase/supabase-js": "^latest",
  "@tanstack/react-query": "^latest",
  "zustand": "^latest",
  "react-router-dom": "^latest",
  "xlsx": "^latest",
  "date-fns": "^latest",
  "sonner": "^latest",
  "clsx": "^latest",
  "tailwind-merge": "^latest"
}
```

### 개발 의존성
```json
{
  "tailwindcss": "^latest",
  "postcss": "^latest",
  "autoprefixer": "^latest"
}
```

## 🔧 다음 단계

### 1. Supabase 프로젝트 설정

#### 1.1 Supabase 계정 생성 및 프로젝트 생성
1. [Supabase](https://supabase.com) 방문
2. "Start your project" 클릭
3. GitHub/Google 계정으로 로그인
4. "New Project" 클릭
5. 다음 정보 입력:
   - **Name**: busansuper (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 생성 (기억할 것!)
   - **Region**: Northeast Asia (Seoul) 선택 (가장 빠름)
6. "Create new project" 클릭

#### 1.2 API 키 가져오기
1. 프로젝트 대시보드에서 왼쪽 메뉴 "Settings" → "API" 클릭
2. **Project URL** 복사
3. **anon public** 키 복사

#### 1.3 환경 변수 설정
\`\`\`bash
# .env.local 파일 열기
# 아래 값을 복사한 정보로 변경

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME=부산슈퍼 재고관리
VITE_APP_VERSION=1.0.0
VITE_DEBUG=true
\`\`\`

### 2. 데이터베이스 스키마 적용

#### 2.1 Supabase SQL Editor 열기
1. Supabase 대시보드에서 왼쪽 메뉴 "SQL Editor" 클릭
2. "New Query" 클릭

#### 2.2 스키마 SQL 실행
`REACT_MIGRATION_PLAN.md` 파일의 "데이터베이스 설계" 섹션에 있는 SQL 스크립트를 복사하여 실행:

\`\`\`sql
-- 1. products 테이블 생성
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  ...
);

-- 2. vendors 테이블 생성
CREATE TABLE vendors (...);

-- 3. 나머지 테이블 생성
-- (REACT_MIGRATION_PLAN.md 참고)
\`\`\`

#### 2.3 RLS (Row Level Security) 정책 적용
\`\`\`sql
-- products 테이블 RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
ON products FOR SELECT
TO authenticated
USING (true);

-- (REACT_MIGRATION_PLAN.md의 RLS 섹션 참고)
\`\`\`

### 3. 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`

브라우저에서 http://localhost:5173 열기

### 4. 기존 데이터 마이그레이션 (선택사항)

기존 Vanilla JS 버전의 LocalStorage 데이터를 Supabase로 마이그레이션하려면:

1. 기존 브라우저에서 개발자 도구 열기 (F12)
2. Console 탭에서 다음 실행:
\`\`\`javascript
// LocalStorage 데이터 추출
const inventory = JSON.parse(localStorage.getItem('busanSuperInventory'));
const vendors = JSON.parse(localStorage.getItem('busanSuperVendorData'));
const sales = JSON.parse(localStorage.getItem('busanSuperSalesHistory'));

// JSON 파일로 다운로드
const data = { inventory, vendors, sales };
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'busansuper-backup-' + new Date().toISOString().split('T')[0] + '.json';
a.click();
\`\`\`

3. 다운로드된 JSON 파일을 새 시스템에서 import

## 🎨 추가 설정 (선택사항)

### shadcn/ui 컴포넌트 설치
\`\`\`bash
npx shadcn@latest init
\`\`\`

설정:
- Style: Default
- Base color: Slate
- CSS variables: Yes

### 필요한 컴포넌트 추가
\`\`\`bash
npx shadcn@latest add button
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add toast
\`\`\`

## 📱 PWA 설정 (나중에)

\`\`\`bash
npm install -D vite-plugin-pwa
\`\`\`

## 🧪 테스트 설정 (나중에)

\`\`\`bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
\`\`\`

## 📚 참고 자료

- [React 공식 문서](https://react.dev)
- [Vite 공식 문서](https://vitejs.dev)
- [Supabase 공식 문서](https://supabase.com/docs)
- [TanStack Query 문서](https://tanstack.com/query)
- [Tailwind CSS 문서](https://tailwindcss.com)
- [shadcn/ui 문서](https://ui.shadcn.com)

## 🐛 문제 해결

### Supabase 연결 오류
- `.env.local` 파일이 올바르게 설정되었는지 확인
- Supabase 프로젝트가 활성화되었는지 확인
- API 키가 정확한지 확인

### 빌드 오류
\`\`\`bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
\`\`\`

### 타입 오류
\`\`\`bash
# TypeScript 타입 체크
npm run type-check
\`\`\`

## 💡 유용한 명령어

\`\`\`bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 린트 실행
npm run lint

# 타입 체크
npm run type-check
\`\`\`

---

**문의**: 문제가 발생하면 `REACT_MIGRATION_PLAN.md` 파일을 참고하거나 개발자에게 문의하세요.
