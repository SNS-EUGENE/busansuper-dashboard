# 프로젝트 구조 설명서
📅 작성일: 2025-11-03

## 📁 루트 디렉토리 구조

```
대시보드/
├── .claude/                  # Claude Code 설정
├── .env.example             # 환경변수 예제 파일
├── .env.local              # 환경변수 (실제 사용, Git 제외)
├── .gitignore              # Git 제외 파일 목록
├── eslint.config.js        # ESLint 설정
├── index.html              # HTML 진입점
├── package.json            # NPM 패키지 정보
├── package-lock.json       # NPM 의존성 잠금 파일
├── postcss.config.js       # PostCSS 설정
├── README.md               # 프로젝트 설명서
├── tailwind.config.js      # Tailwind CSS 설정
├── tsconfig.json           # TypeScript 설정 (메인)
├── tsconfig.app.json       # TypeScript 앱 설정
├── tsconfig.node.json      # TypeScript Node 설정
├── vite.config.ts          # Vite 빌드 설정
│
├── etc/                    # 기타 파일 보관소
│   ├── docs/              # 문서 파일
│   ├── excelfiles/        # 엑셀 작업 파일
│   └── sql/               # SQL 스크립트
│
├── node_modules/          # NPM 패키지 (이동 불필요!)
├── public/                # 정적 리소스
└── src/                   # 소스 코드
    ├── assets/           # 이미지, 폰트 등
    ├── components/       # 재사용 컴포넌트
    │   ├── forms/       # 폼 컴포넌트
    │   ├── layout/      # 레이아웃 컴포넌트
    │   ├── tables/      # 테이블 컴포넌트
    │   └── ui/          # UI 기본 컴포넌트
    ├── contexts/         # React Context
    ├── features/         # 기능별 모듈
    │   ├── analysis/    # 데이터 분석
    │   ├── inventory/   # 재고 관리
    │   ├── pda/         # PDA 관련
    │   ├── sales/       # 판매 관리
    │   ├── settlements/ # 정산 관리
    │   └── vendors/     # 업체 관리
    ├── hooks/            # Custom React Hooks
    ├── lib/              # 라이브러리 (Supabase 등)
    ├── pages/            # 페이지 컴포넌트
    ├── stores/           # 상태 관리
    ├── types/            # TypeScript 타입
    └── workers/          # Web Workers
```

---

## 📄 주요 파일 역할

### 🔧 설정 파일

| 파일 | 역할 | 이동 필요 |
|------|------|----------|
| `.env.local` | Supabase API 키 등 환경변수 | ✅ 필수 |
| `package.json` | NPM 의존성 목록 | ✅ 필수 |
| `package-lock.json` | 의존성 버전 잠금 | ✅ 필수 |
| `vite.config.ts` | Vite 빌드 설정 | ✅ 필수 |
| `tailwind.config.js` | Tailwind 스타일 설정 | ✅ 필수 |
| `tsconfig.*.json` | TypeScript 컴파일러 설정 | ✅ 필수 |
| `eslint.config.js` | 코드 린팅 규칙 | ✅ 필수 |
| `postcss.config.js` | CSS 후처리 설정 | ✅ 필수 |

### 📦 디렉토리

| 폴더 | 역할 | 이동 필요 |
|------|------|----------|
| `node_modules/` | NPM 패키지 | ❌ **불필요** (npm install로 재생성) |
| `src/` | 소스 코드 | ✅ 필수 |
| `public/` | 정적 파일 | ✅ 필수 |
| `etc/` | 문서/SQL/엑셀 | ⚠️ 선택적 (문서 필요시) |
| `.claude/` | Claude 설정 | ⚠️ 선택적 |

---

## 🎯 핵심 소스 코드 구조

### Pages (페이지)
- `Dashboard.tsx` - 대시보드 (통계 요약)
- `Products.tsx` - 상품 관리
- `InventoryChanges.tsx` - 재고 변동 내역
- `Vendors.tsx` - 업체 관리
- `Sales.tsx` - 판매 데이터
- `Settlements.tsx` - 정산 관리

### Features (기능 모듈)
각 페이지의 세부 기능을 담당하는 컴포넌트들

#### sales/ (판매 관리)
- `ApprovalUploadOptimized.tsx` - 승인내역 업로드 (최적화 버전)
- `CardApprovalUpload.tsx` - 카드 승인내역
- `ReceiptBatchUpload.tsx` - 영수증 일괄 업로드
- `ReceiptDetailUpload.tsx` - 영수증 상세 업로드

#### inventory/ (재고 관리)
- `ProductForm.tsx` - 상품 등록/수정 폼
- `ExcelUpload.tsx` - 엑셀 업로드
- `InventoryChangeForm.tsx` - 재고 변동 기록

#### settlements/ (정산 관리)
- `SettlementForm.tsx` - 정산 생성 폼
- `CardCompanyManager.tsx` - 카드사 관리

#### vendors/ (업체 관리)
- `VendorForm.tsx` - 업체 등록/수정 폼

### Components (공통 컴포넌트)
- `layout/Layout.tsx` - 전체 레이아웃
- `layout/Sidebar.tsx` - 사이드바 네비게이션
- `layout/Header.tsx` - 상단 헤더
- `ui/Modal.tsx` - 모달 팝업

### Contexts (전역 상태)
- `AlertContext.tsx` - 알림/확인 메시지 관리

### Lib (라이브러리)
- `supabase.ts` - Supabase 클라이언트 설정

---

## 🗄️ 데이터베이스 구조 (Supabase)

### 주요 테이블

#### products (상품)
- 상품 정보 (코드, 바코드, 이름, 가격)
- 재고 정보 (현재재고, 적정재고, 부족임계값)
- 업체 연결 (vendor_id)

#### vendors (업체)
- 업체 정보 (회사명, 약칭, 연락처, 이메일)
- 사업자번호, 주소

#### sales (판매)
- 판매 정보 (상품, 수량, 금액, 날짜)
- 결제 정보 (결제수단, 영수증번호)
- 카드/간편결제 연결 (card_company_id, easy_pay_company_id)

#### inventory_changes (재고변동)
- 변동 유형 (입고/출고/조정)
- 변동 수량, 이전/현재 재고
- 메모

#### settlements (정산)
- 정산 기간, 금액
- 카드 수수료율, 수수료
- 상태 (대기/완료)

#### card_approvals (카드 승인내역)
- 승인일자, 단말기번호, 거래번호
- 카드사, 승인금액
- 매칭 여부, 매칭된 판매 ID

#### easy_pay_approvals (간편결제 승인내역)
- 승인일자, 단말기번호, 거래번호
- 간편결제사, 승인금액
- 매칭 여부, 매칭된 판매 ID

#### cash_receipt_approvals (현금영수증 승인내역)
- 승인일자, 단말기번호, 거래번호
- 승인금액
- 매칭 여부, 매칭된 판매 ID

#### card_companies (카드사)
- 카드사명

#### easy_pay_companies (간편결제사)
- 간편결제사명

---

## 🔗 주요 의존성

### 프론트엔드
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **React Router** - 라우팅
- **Tailwind CSS** - 스타일링

### 백엔드/DB
- **Supabase** - PostgreSQL 데이터베이스 + 인증

### 유틸리티
- **xlsx** - 엑셀 파일 처리
- **date-fns** - 날짜 처리

---

## 📝 파일 이동 시 주의사항

### ✅ 반드시 이동해야 할 것
1. `src/` - 모든 소스 코드
2. `.env.local` - 환경변수 (Supabase 키 포함)
3. `package.json`, `package-lock.json` - 의존성 정보
4. 모든 설정 파일 (tsconfig, vite.config, tailwind.config 등)

### ❌ 이동하지 않아도 되는 것
1. `node_modules/` - **300MB+**, npm install로 재생성 가능
2. `.git/` - Git 리포지토리 (Git 사용 시에만)

### ⚠️ 선택적으로 이동
1. `etc/docs/` - 문서 필요시
2. `etc/sql/` - 데이터베이스 스키마 참고용
3. `etc/excelfiles/` - 샘플 엑셀 파일

---

## 🚀 새 환경에서 시작하기

1. 프로젝트 폴더 복사 (node_modules 제외)
2. `npm install` 실행 → node_modules 재생성
3. `.env.local` 파일 확인 (Supabase 키 올바른지)
4. `npm run dev` 실행
5. http://localhost:5173 접속

**예상 소요 시간**: 5-10분 (인터넷 속도에 따라)
