# 작업공간 이동 가이드
📅 작성일: 2025-11-03
🔄 목적: 집 ↔ 회사 컴퓨터 간 효율적인 프로젝트 이동

---

## 🎯 핵심 원칙

### ✅ 이동해야 할 것
**크기: 약 20-30MB** (node_modules 제외)

1. **소스 코드** - `src/` 폴더 전체
2. **설정 파일** - 루트의 모든 설정 파일
3. **환경변수** - `.env.local` (Supabase 키 포함)
4. **문서** - `etc/docs/` (선택사항)

### ❌ 이동하지 않아도 되는 것
**크기: 약 300MB+**

1. **node_modules/** - npm install로 재생성
2. **.git/** - Git 사용 시 리모트로 동기화
3. **etc/excelfiles/** - 샘플 데이터 (필요시만)
4. **etc/sql/** - 데이터베이스 스키마 (참고용)

---

## 📦 방법 1: 압축 파일 (현재 방식 개선)

### 압축 전 체크리스트
```bash
# 1. 개발 서버 종료
# Ctrl+C로 npm run dev 종료

# 2. node_modules 삭제 (선택사항)
# 압축 크기를 대폭 줄이려면 삭제
# 삭제 안하면 압축이 오래 걸림
```

### Windows에서 압축하기
1. `대시보드` 폴더 우클릭
2. "압축" 또는 "Send to > Compressed folder"
3. 파일명: `대시보드_251103.zip` (날짜 포함)

### 압축 크기 비교
- **node_modules 포함**: 300MB+, 압축 시간 5-10분
- **node_modules 제외**: 20-30MB, 압축 시간 1분 미만

### 압축 해제 후
```bash
# 1. 압축 해제
# 대시보드_251103.zip 우클릭 → 압축 풀기

# 2. 터미널 열기
cd "C:\허유진 폴더\업무\한국SNS인재개발원\부산슈퍼\대시보드"

# 3. node_modules 재생성 (삭제했을 경우만)
npm install
# 예상 시간: 3-5분 (인터넷 속도에 따라)

# 4. 개발 서버 실행
npm run dev

# 5. 브라우저에서 확인
# http://localhost:5173
```

---

## 🌐 방법 2: Git (권장)

### 초기 설정 (한 번만)

#### 1. GitHub/GitLab 리포지토리 생성
- GitHub 추천 (무료 Private 리포지토리)
- 리포지토리명: `busansuper-dashboard`

#### 2. Git 초기화
```bash
# 대시보드 폴더에서
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/busansuper-dashboard.git
git push -u origin main
```

#### 3. .gitignore 확인
```
node_modules/
.env.local
dist/
.DS_Store
```

### 일상적인 작업 흐름

#### 집 컴퓨터에서 작업 종료 시
```bash
# 1. 변경사항 저장
git add .
git commit -m "작업 내용 요약"
git push

# 예: git commit -m "데이터 분석 페이지 차트 추가"
```

#### 회사 컴퓨터에서 작업 시작 시
```bash
# 1. 최신 코드 받기
git pull

# 2. 의존성 설치 (package.json 변경된 경우만)
npm install

# 3. 개발 서버 실행
npm run dev
```

### Git 장점
- ✅ **빠름**: 변경된 파일만 전송
- ✅ **버전 관리**: 이전 버전으로 되돌리기 가능
- ✅ **협업**: 여러 사람과 작업 가능
- ✅ **백업**: 클라우드에 자동 백업

---

## ☁️ 방법 3: 클라우드 동기화 (간편)

### OneDrive / Google Drive / Dropbox 활용

#### 설정 방법
1. 클라우드 폴더에 프로젝트 배치
   ```
   C:\Users\허유진\OneDrive\프로젝트\대시보드\
   ```

2. node_modules 제외 설정
   - OneDrive: 파일 탐색기에서 node_modules 우클릭 → "이 장치에서만 유지"
   - 또는 `.onedriveignore` 파일 생성

#### 장점
- ✅ 자동 동기화
- ✅ 설정 한 번이면 끝
- ✅ 파일 버전 관리 (제한적)

#### 단점
- ⚠️ node_modules 동기화 느림 (제외 권장)
- ⚠️ 동시 작업 시 충돌 가능

---

## 📋 이동 체크리스트

### 작업 종료 전 (출발 컴퓨터)
- [ ] 개발 서버 종료 (Ctrl+C)
- [ ] 코드 저장 (Ctrl+S)
- [ ] Git commit & push (Git 사용 시)
- [ ] .env.local 백업 확인
- [ ] 최근 작업 내용 메모

### 작업 시작 전 (도착 컴퓨터)
- [ ] Git pull (Git 사용 시)
- [ ] npm install (package.json 변경 시)
- [ ] .env.local 존재 확인
- [ ] npm run dev 실행
- [ ] 브라우저에서 작동 확인

---

## 🚨 주의사항

### 환경변수 (.env.local)
**절대 Git에 커밋하지 말 것!**
- Supabase API 키 노출 위험
- .gitignore에 `.env.local` 포함 필수
- 수동으로 복사하거나 별도 보관

### node_modules
- **300MB+ 크기**
- 압축/이동 시간 낭비
- `npm install`로 재생성 가능 (3-5분)

### 데이터베이스
- Supabase 클라우드 사용 중
- 로컬 DB 아님, 어디서든 동일한 데이터
- 인터넷 연결 필요

---

## 💡 최적화 팁

### 1. 압축 방식 개선
**Before (비효율적)**
```
대시보드 폴더 전체 압축
→ 300MB+, 10분 소요
```

**After (효율적)**
```bash
# node_modules 제외하고 압축
# PowerShell 사용 (Windows)
Compress-Archive -Path "C:\허유진 폴더\업무\한국SNS인재개발원\부산슈퍼\대시보드\*" -DestinationPath "대시보드_251103.zip" -Exclude "node_modules"

# 결과: 20-30MB, 1분 미만
```

### 2. 7-Zip 활용 (추천)
```bash
# 7-Zip 설치 후
# node_modules 제외 압축 (CLI)
7z a -xr!node_modules 대시보드_251103.7z "C:\허유진 폴더\업무\한국SNS인재개발원\부산슈퍼\대시보드\*"

# 압축률 더 좋음 (15-20MB)
```

### 3. 배치 스크립트 작성
`backup.bat` 파일 생성
```batch
@echo off
echo 프로젝트 백업 시작...

cd "C:\허유진 폴더\업무\한국SNS인재개발원\부산슈퍼\대시보드"

REM node_modules 삭제 (선택)
REM rmdir /s /q node_modules

REM 날짜 기반 파일명
set today=%date:~0,4%%date:~5,2%%date:~8,2%
set filename=대시보드_%today%.zip

REM 압축
powershell Compress-Archive -Path * -DestinationPath %filename% -Force

echo 백업 완료: %filename%
pause
```

---

## 📊 이동 시간 비교

| 방법 | 크기 | 업로드 | 다운로드 | 재설정 | 총 시간 |
|------|------|--------|----------|--------|---------|
| 전체 압축 | 300MB | 10분 | 10분 | 0분 | **20분** |
| node_modules 제외 | 30MB | 1분 | 1분 | 5분 | **7분** |
| Git (초기) | 30MB | 2분 | 2분 | 5분 | **9분** |
| Git (일상) | 1MB | 10초 | 10초 | 0분 | **20초** |
| 클라우드 동기화 | 30MB | 자동 | 자동 | 0분 | **자동** |

---

## 🎯 추천 방법

### 단기 (지금 당장)
**node_modules 제외 압축**
- 가장 간단하고 빠름
- 추가 설정 불필요
- 약 7분 소요

### 중기 (이번 주 내)
**Git + GitHub 설정**
- 초기 설정 30분 투자
- 이후 매번 20초만 소요
- 버전 관리 가능
- **강력 추천!**

### 장기 (다음 주)
**OneDrive 동기화**
- 자동화 완성
- 신경 쓸 필요 없음
- Git과 병행 가능

---

## 🔧 문제 해결

### Q: npm install이 실패해요
```bash
# 1. package-lock.json 삭제
rm package-lock.json

# 2. node_modules 삭제 (있다면)
rm -rf node_modules

# 3. 캐시 정리
npm cache clean --force

# 4. 재설치
npm install
```

### Q: .env.local이 없어요
```bash
# .env.example 복사
cp .env.example .env.local

# Supabase 키 입력
# 이전 컴퓨터에서 복사하거나
# Supabase 대시보드에서 확인
```

### Q: 포트 5173이 이미 사용 중이에요
```bash
# 다른 포트 사용
npm run dev -- --port 5174

# 또는 기존 프로세스 종료 (작업 관리자)
```

---

## 📝 작업 일지 템플릿

작업 종료 시 간단히 메모하면 도움됨:

```
2025-11-03
- 데이터 분석 페이지 시작
- Recharts 라이브러리 설치
- 일별 매출 차트 50% 완성
- 다음: 주별/월별 차트 구현
```

---

## 🎓 Git 빠른 가이드

### 기본 명령어
```bash
# 상태 확인
git status

# 변경사항 저장
git add .
git commit -m "메시지"
git push

# 최신 코드 받기
git pull

# 브랜치 생성 (기능 개발 시)
git checkout -b feature/data-analysis

# 브랜치 병합
git checkout main
git merge feature/data-analysis
```

### .gitignore 필수 내용
```
# 의존성
node_modules/

# 환경변수
.env.local
.env

# 빌드 결과물
dist/
build/

# IDE 설정
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## 🌟 최종 권장사항

1. **오늘부터**: node_modules 제외 압축 사용
2. **이번 주**: Git + GitHub 설정 완료
3. **다음 주**: OneDrive 동기화 추가

**결과**: 매번 20초 만에 작업공간 이동! 🚀
