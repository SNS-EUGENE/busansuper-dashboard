# Git 초보자 완벽 가이드
📅 작성일: 2025-11-03
🎯 목표: 집-회사 간 코드 동기화 자동화

---

## 🤔 Git이 뭔가요?

### 간단히 말하면
**USB 없이 인터넷으로 프로젝트를 주고받는 도구**

### 비유로 설명하면
- **USB 메모리**: 파일을 통째로 복사
- **Git**: 변경된 부분만 똑똑하게 전송

예를 들어:
- 100개 파일 중 1개만 수정 → **1개 파일만 전송** (초고속!)
- 전체 프로젝트 30MB → 변경분 100KB만 전송 (99% 절약!)

### 추가 장점
1. **시간 여행**: 예전 버전으로 되돌리기 가능
2. **백업**: GitHub 서버에 자동 백업
3. **협업**: 여러 사람이 동시 작업 가능
4. **이력**: 누가 언제 무엇을 바꿨는지 기록

---

## 📦 필요한 것

### 1. Git 프로그램 설치
**Windows 사용자**
1. https://git-scm.com/download/win 접속
2. "64-bit Git for Windows Setup" 다운로드
3. 설치 (전부 기본값으로 Next 클릭)
4. 완료!

**설치 확인**
```bash
# PowerShell 또는 Git Bash 열기
git --version

# 출력 예: git version 2.42.0
```

### 2. GitHub 계정 (무료)
1. https://github.com 접속
2. "Sign up" 클릭
3. 이메일, 비밀번호 입력
4. 이메일 인증
5. 완료!

---

## 🚀 초기 설정 (집 컴퓨터에서, 한 번만)

### 1단계: Git 사용자 정보 설정
```bash
# Git Bash 또는 PowerShell 열기

# 이름 설정 (한글 OK)
git config --global user.name "허유진"

# 이메일 설정 (GitHub 가입 이메일)
git config --global user.email "your-email@example.com"

# 확인
git config --list
```

### 2단계: 프로젝트 폴더로 이동
```bash
cd "C:\허유진 폴더\업무\한국SNS인재개발원\부산슈퍼\대시보드"
```

### 3단계: Git 저장소 초기화
```bash
# 현재 폴더를 Git으로 관리 시작
git init

# 출력: Initialized empty Git repository in ...
```

### 4단계: .gitignore 확인
```bash
# 메모장으로 열기
notepad .gitignore

# 아래 내용이 있는지 확인 (없으면 추가)
```

**.gitignore 필수 내용:**
```
node_modules/
.env.local
.env
dist/
build/
.DS_Store
Thumbs.db
```

**왜 필요한가요?**
- `node_modules/` - 300MB 파일, 업로드 금지!
- `.env.local` - Supabase 비밀번호, 공개 금지!

### 5단계: 첫 커밋 (저장)
```bash
# 모든 파일 추가 (node_modules, .env.local 제외됨)
git add .

# 저장 (커밋)
git commit -m "프로젝트 초기 설정"

# 출력:
# [main (root-commit) abc1234] 프로젝트 초기 설정
# 150 files changed, 15000 insertions(+)
```

**커밋 메시지 규칙** (자유롭게)
- "판매 페이지 필터 추가"
- "데이터 분석 차트 구현"
- "버그 수정: 재고 계산 오류"

---

## 🌐 GitHub에 올리기

### 1단계: GitHub 리포지토리 생성

1. https://github.com 로그인
2. 우측 상단 "+" 클릭 → "New repository"
3. 정보 입력:
   - **Repository name**: `busansuper-dashboard`
   - **Description**: "부산슈퍼 재고관리 시스템"
   - **Private** 체크 (공개 금지!)
   - **README 추가 안함** (우리가 이미 있음)
4. "Create repository" 클릭

### 2단계: 로컬과 GitHub 연결
```bash
# GitHub에서 보여주는 URL 복사
# 예: https://github.com/yourusername/busansuper-dashboard.git

# 연결
git remote add origin https://github.com/yourusername/busansuper-dashboard.git

# 브랜치 이름 변경 (main으로 통일)
git branch -M main

# 확인
git remote -v
# 출력:
# origin  https://github.com/yourusername/busansuper-dashboard.git (fetch)
# origin  https://github.com/yourusername/busansuper-dashboard.git (push)
```

### 3단계: 첫 업로드
```bash
# GitHub에 업로드
git push -u origin main

# GitHub 로그인 창 뜸
# 이메일, 비밀번호 입력 또는
# Personal Access Token 사용 (추천)
```

**Personal Access Token 만들기** (비밀번호 대신)
1. GitHub → Settings (우측 상단 프로필)
2. Developer settings (왼쪽 맨 아래)
3. Personal access tokens → Tokens (classic)
4. "Generate new token (classic)"
5. Note: "부산슈퍼 작업용"
6. Expiration: "No expiration" (만료 없음)
7. Scopes: **repo** 체크
8. "Generate token"
9. **토큰 복사 (다시 볼 수 없음!)**
10. 비밀번호 대신 이 토큰 입력

**토큰 저장** (다음부터 안 물어봄)
```bash
# Windows Credential Manager에 저장됨
# 한 번만 입력하면 끝!
```

---

## 🔄 일상적인 사용법

### 🏠 집에서 작업 끝날 때

```bash
# 1. 개발 서버 종료
# Ctrl+C

# 2. 변경된 파일 확인
git status

# 출력 예:
# modified:   src/pages/Sales.tsx
# modified:   src/components/ui/Modal.tsx
# 빨간색으로 표시됨

# 3. 모든 변경사항 추가
git add .

# 4. 저장 (커밋)
git commit -m "판매 페이지 필터 기능 추가"

# 5. GitHub에 업로드
git push

# 출력:
# Enumerating objects: 5, done.
# Counting objects: 100% (5/5), done.
# ...
# To https://github.com/yourusername/busansuper-dashboard.git
#    abc1234..def5678  main -> main
```

**완료! 이제 회사에서 받을 수 있음** ✅

---

### 🏢 회사에서 작업 시작할 때

#### 첫날만 (Git 설치 + 프로젝트 다운로드)

```bash
# 1. Git 설치 (위와 동일)

# 2. 사용자 정보 설정 (집과 동일하게)
git config --global user.name "허유진"
git config --global user.email "your-email@example.com"

# 3. 원하는 폴더로 이동
cd "C:\Users\허유진\프로젝트"

# 4. GitHub에서 프로젝트 복제
git clone https://github.com/yourusername/busansuper-dashboard.git

# 출력:
# Cloning into 'busansuper-dashboard'...
# ...
# Receiving objects: 100% (150/150), done.

# 5. 프로젝트 폴더로 이동
cd busansuper-dashboard

# 6. node_modules 설치 (3-5분)
npm install

# 7. .env.local 파일 생성
notepad .env.local
# Supabase 키 복사해서 붙여넣기

# 8. 개발 서버 실행
npm run dev
```

#### 둘째 날부터 (매일)

```bash
# 1. 프로젝트 폴더로 이동
cd "C:\Users\허유진\프로젝트\busansuper-dashboard"

# 2. 최신 코드 받기
git pull

# 출력:
# remote: Enumerating objects: 5, done.
# ...
# Updating abc1234..def5678
# Fast-forward
#  src/pages/Sales.tsx | 10 +++++-----
#  1 file changed, 5 insertions(+), 5 deletions(-)

# 3. package.json이 변경됐다면
npm install

# 4. 개발 서버 실행
npm run dev
```

**5초 만에 최신 코드 받기 완료!** ✅

---

### 🏢 회사에서 작업 끝날 때

```bash
# 집에서와 똑같음!

git add .
git commit -m "데이터 분석 차트 구현 중"
git push
```

---

## 🎨 실전 시나리오

### 시나리오 1: 집에서 작업 → 회사에서 이어서

**금요일 저녁 (집)**
```bash
# 판매 페이지 필터 만들다가 시간 끝남
git add .
git commit -m "판매 페이지 필터 50% 완성"
git push
```

**월요일 아침 (회사)**
```bash
git pull
npm run dev

# 정확히 금요일 저녁 상태로 복원!
# 이어서 작업 시작
```

**월요일 저녁 (회사)**
```bash
# 필터 기능 완성!
git add .
git commit -m "판매 페이지 필터 완성"
git push
```

**월요일 밤 (집)**
```bash
git pull
npm run dev

# 회사에서 작업한 내용 그대로!
```

---

### 시나리오 2: 실수로 파일 삭제했을 때

```bash
# 앗! 중요한 파일 삭제했다!

# 걱정 마세요, Git이 기억합니다
git checkout -- src/pages/Sales.tsx

# 또는 전체 복원
git checkout .

# 마지막 커밋 상태로 되돌림
```

---

### 시나리오 3: 예전 버전으로 되돌리기

```bash
# 어제 작업한 게 더 나았어...

# 1. 커밋 이력 보기
git log --oneline

# 출력:
# def5678 (HEAD -> main) 데이터 분석 차트 추가
# abc1234 판매 페이지 필터 완성
# 9876543 재고 페이지 수정

# 2. 돌아가고 싶은 버전 선택
git checkout abc1234

# 3. 확인 후 계속 쓰려면
git checkout -b 복구본
git push -u origin 복구본
```

---

## 🛡️ 중요한 주의사항

### ⚠️ .env.local 절대 업로드 금지!

**왜?**
- Supabase API 키 = 은행 비밀번호
- GitHub에 올리면 전세계에 공개됨
- 해커가 데이터베이스 접근 가능

**.gitignore 확인**
```bash
# .gitignore 파일에 반드시 있어야 함
.env.local
.env
```

**업로드됐는지 확인**
```bash
git status

# .env.local이 빨간색으로 뜨면 안됨!
# .gitignore에 추가했는데도 뜨면:
git rm --cached .env.local
```

---

### ⚠️ node_modules 업로드 금지!

**왜?**
- 300MB 크기, 업로드 시간 낭비
- npm install로 재생성 가능
- GitHub 용량 제한 (1GB)

**.gitignore 확인**
```bash
# 반드시 있어야 함
node_modules/
```

---

### ⚠️ 충돌 해결 (같은 파일 동시 수정)

**드물지만 발생 가능**

```bash
# git pull 했을 때
# CONFLICT (content): Merge conflict in src/pages/Sales.tsx
# Automatic merge failed

# 파일 열어보면
<<<<<<< HEAD
현재 내 코드
=======
GitHub에 있던 코드
>>>>>>> abc1234

# 해결 방법:
# 1. 파일 편집해서 원하는 코드만 남기기
# 2. <<<<, ====, >>>> 표시 삭제
# 3. 저장

git add .
git commit -m "충돌 해결"
git push
```

**충돌 피하기**
- 작업 시작 전 **항상 git pull**
- 같은 파일 동시 수정 피하기

---

## 📝 자주 쓰는 명령어 정리

### 기본 흐름
```bash
# 1. 최신 코드 받기
git pull

# 2. 작업...

# 3. 저장하기
git add .
git commit -m "메시지"
git push
```

### 상태 확인
```bash
# 변경된 파일 보기
git status

# 정확히 뭐가 바뀌었는지 보기
git diff

# 커밋 이력 보기
git log --oneline
```

### 실수 복구
```bash
# 작업 전부 취소 (마지막 커밋으로)
git checkout .

# 특정 파일만 복구
git checkout -- 파일명

# 마지막 커밋 메시지 수정
git commit --amend -m "새 메시지"
```

---

## 🎯 실습 체크리스트

### 오늘 (집에서)
- [ ] Git 설치
- [ ] GitHub 계정 생성
- [ ] Git 사용자 정보 설정
- [ ] 프로젝트 폴더에서 `git init`
- [ ] `.gitignore` 확인
- [ ] 첫 커밋 `git commit`
- [ ] GitHub 리포지토리 생성
- [ ] `git push` 성공

### 내일 (회사에서)
- [ ] Git 설치
- [ ] Git 사용자 정보 설정 (동일하게)
- [ ] `git clone` 프로젝트 받기
- [ ] `npm install`
- [ ] `.env.local` 생성
- [ ] `npm run dev` 확인

### 모레 (회사에서)
- [ ] `git pull` 습관화
- [ ] 작업 후 `git push`

---

## 🤝 도움받기

### GitHub Desktop (GUI 도구, 추천!)

**명령어가 어려우면 GUI 사용**

1. https://desktop.github.com 다운로드
2. 설치 후 GitHub 로그인
3. "Clone repository" 클릭
4. 버튼으로 쉽게 commit, push, pull

**장점**
- 버튼 클릭으로 모든 작업
- 시각적으로 변경사항 확인
- 초보자 친화적

**단점**
- 명령어보다 느림
- 고급 기능 제한적

---

## 💡 추가 팁

### VS Code에서 Git 사용
```
VS Code 열기
→ 왼쪽 Source Control (Ctrl+Shift+G)
→ Changes에서 파일 확인
→ "+" 클릭해서 Stage
→ 메시지 입력하고 ✓ 클릭 (Commit)
→ ... → Push
```

### 커밋 메시지 템플릿
```bash
# 기능 추가
"feat: 판매 페이지 필터 추가"

# 버그 수정
"fix: 재고 계산 오류 수정"

# 스타일 변경
"style: 버튼 색상 변경"

# 문서 수정
"docs: README 업데이트"
```

---

## 🎓 더 공부하기

### 무료 강의
- **생활코딩 Git**: https://opentutorials.org/course/3837
- **Git 공식 문서 (한글)**: https://git-scm.com/book/ko/v2

### 연습 사이트
- **Learn Git Branching**: https://learngitbranching.js.org/?locale=ko

---

## ❓ FAQ

**Q: Git이 꼭 필요한가요?**
A: 장기적으로 필수입니다. 초기 30분 투자로 평생 편해집니다.

**Q: GitHub가 해킹당하면?**
A: Private 리포지토리는 안전합니다. 추가로 로컬에도 백업되어 있습니다.

**Q: 회사 컴퓨터에서 GitHub 접속 안되면?**
A: USB로 git clone한 폴더 통째로 옮긴 후 git pull/push 사용.

**Q: 실수로 .env.local 올렸어요!**
A: 즉시 Supabase 키 재발급! GitHub 히스토리에 영원히 남습니다.

**Q: 명령어가 너무 어려워요**
A: GitHub Desktop 사용하세요. GUI로 쉽게 할 수 있습니다.

---

## 🌟 결론

### 지금 방식 vs Git
| | 현재 | Git |
|---|---|---|
| 시간 | 20분 | 20초 |
| 크기 | 300MB | 1MB |
| 백업 | X | O |
| 이력 | X | O |
| 복구 | X | O |

### 투자 대비 효과
- **초기 투자**: 30분 (설정)
- **일일 절약**: 19분 40초
- **일주일**: 98분 절약
- **한 달**: 6시간 절약!

**완전히 가치 있는 투자입니다!** 🚀

---

자세한 질문 있으면 언제든 물어보세요!
