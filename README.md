# 부산슈퍼 재고관리 대시보드

> 소매점 재고, 판매, 정산을 통합 관리하는 웹 대시보드

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)

## 주요 기능

| 메뉴 | 기능 |
|------|------|
| **대시보드** | 실시간 매출/재고 현황, 주요 지표 요약 |
| **상품 관리** | 상품 등록/수정/삭제, 엑셀 일괄 업로드 |
| **재고 변동** | 입고/출고/조정 내역 관리 |
| **업체 관리** | 거래처/공급업체 정보 관리 |
| **판매 데이터** | 영수증별 매출 상세, 카드 승인 내역 업로드 |
| **정산 관리** | 카드사별 정산, 수수료 계산, 거래처 정산 |
| **데이터 분석** | 매출 추이, 상품별/기간별 분석 |

## 스크린샷
<img width="2536" height="1264" alt="image" src="https://github.com/user-attachments/assets/45da09d9-e86a-4140-a838-34fcc1690e5f" />
<img width="2536" height="1264" alt="image" src="https://github.com/user-attachments/assets/29f1212e-03bc-4a2d-8166-d7c21ee0b709" />



## 빠른 시작

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에 Supabase 키 입력

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **React Router** - 클라이언트 라우팅

### Backend
- **Supabase** - 데이터베이스 + 인증 + 실시간

### 라이브러리
- **xlsx** - 엑셀 파일 파싱/생성
- **date-fns** - 날짜 처리
- **zustand** - 상태 관리

## 프로젝트 구조

```
src/
├── components/
│   ├── layout/          # Layout, Sidebar, Header
│   └── ui/              # Modal, TabTransition 등
├── contexts/            # AlertContext
├── features/
│   ├── inventory/       # ExcelUpload, ProductForm
│   ├── sales/           # ApprovalUpload, SaleForm
│   ├── settlements/     # CardCompanyManager, SettlementForm
│   └── vendors/         # VendorForm
├── lib/
│   ├── supabase.ts      # Supabase 클라이언트
│   └── utils.ts         # 유틸리티 함수
├── pages/               # 페이지 컴포넌트
├── types/               # TypeScript 타입 정의
├── App.tsx              # 라우팅 설정
└── main.tsx             # 엔트리포인트
```

## 환경 변수

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 관련 프로젝트

- [busansuper-payments](https://github.com/SNS-EUGENE/busansuper-payments) - 카드결제 정산 분석 도구

## 라이선스

MIT License

---

Made with ☕ by 부산슈퍼 개발팀
