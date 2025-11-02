# 📝 TODO - 부산슈퍼 재고관리 시스템

> **마지막 업데이트**: 2025-10-31
> **현재 진행률**: 초기 설정 완료 (20%)

---

## ✅ 완료된 작업

- [x] React + TypeScript + Vite 프로젝트 생성
- [x] Supabase 프로젝트 생성 및 연동
- [x] 데이터베이스 스키마 생성 (6개 테이블)
- [x] 개발 서버 실행 및 연결 테스트 성공
- [x] 샘플 데이터 추가 (업체 3개)

---

## 🎯 다음에 할 일

### 1단계: 테스트 데이터 추가 (10분) ⭐ 최우선
```
1. Supabase 대시보드 접속 (https://supabase.com)
2. Table Editor → products 테이블 선택
3. "Insert row" 버튼으로 샘플 상품 5~10개 추가
   예) 새우깡, 포카칩, 초코파이 등
4. 브라우저 새로고침해서 확인
```

### 2단계: 상품 목록 페이지 만들기 (1~2시간)
```
- [ ] 상품 목록 테이블 컴포넌트 생성
- [ ] TanStack Table 설치 및 설정
- [ ] 상품 데이터 표시
- [ ] 검색 기능 추가
```

### 3단계: 상품 추가 기능 (1~2시간)
```
- [ ] 상품 추가 모달/폼 만들기
- [ ] React Hook Form 설정
- [ ] Supabase에 데이터 저장
- [ ] 성공 알림 토스트
```

### 4단계: 기본 레이아웃 (30분~1시간)
```
- [ ] 헤더 컴포넌트
- [ ] 사이드바 네비게이션
- [ ] React Router 설정
```

---

## 🚀 빠른 시작 가이드

### 개발 서버 실행
```bash
cd "C:\한국SNS인재개발원\부산슈퍼\대시보드\busansuper"
npm run dev
```
→ http://localhost:5173 (또는 5174, 5175 등)

### 서버 중지
```
Ctrl + C
```

### Supabase 접속
- URL: https://supabase.com/dashboard
- 프로젝트: busansuper (또는 생성한 이름)

---

## 📁 중요 파일 위치

```
busansuper/
├── .env.local              # Supabase API 키 (절대 공유 금지!)
├── src/
│   ├── App.tsx            # 현재 테스트 페이지
│   ├── lib/supabase.ts    # Supabase 클라이언트
│   └── types/database.ts  # TypeScript 타입
├── TODO.md                # 이 파일
├── 현재상태.md            # 현재 프로젝트 상태
└── NEXT_STEPS.md          # 개발 가이드 (코드 예제)
```

---

## 💡 유용한 명령어

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드 (나중에)
npm run build

# 타입 체크
npm run type-check
```

---

## 🐛 문제 해결

### 연결 안됨
1. `.env.local` 파일 확인
2. Supabase 프로젝트 활성화 확인
3. 개발 서버 재시작

### 패키지 오류
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 참고 자료

- [Supabase 문서](https://supabase.com/docs)
- [React Query 문서](https://tanstack.com/query)
- [Tailwind CSS 문서](https://tailwindcss.com)
- 프로젝트 상세 가이드: `REACT_MIGRATION_PLAN.md`

---

## ⚠️ 주의사항

1. **`.env.local` 파일 절대 공유 금지** (API 키 포함)
2. 작업 전 항상 git pull (협업 시)
3. 의미있는 단위로 자주 커밋
4. 막히면 `NEXT_STEPS.md` 참고

---

**화이팅! 🚀**
