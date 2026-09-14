# Yeonu 개인 홈페이지

홈에는 사진과 짧은 인사말을, About / CV에는 자기소개·학력·경력·관심 분야를 표시합니다.
로그인, 관리자 화면, 데이터베이스 연결은 제거했습니다. 내용은 저장소 파일로 관리합니다.

## 내 내용으로 바꾸기
content.js만 열어 name, greeting, introduction, biography를 수정하세요.
여러 줄 내용은 백틱 안에 작성합니다.
학력 education, 경력 experience에는 아래 형식으로 항목을 추가합니다.

    education: [
      { period: "실제 재학 기간", title: "실제 학교명", detail: "전공 및 학위" }
    ],

위 예시는 입력 형식이며 실제 이력이 아닙니다.
interests에는 ["관심 분야", "다른 관심 분야"] 형식으로 입력합니다.
email은 비워두면 연락처가 숨겨집니다. 입력한 내용은 모두 공개됩니다.
브라우저에서 내용을 저장하는 기능은 없습니다. 저장소 쓰기 권한이 있는 사람이 파일을 변경합니다.

## 사진 넣기
1. assets 폴더에 본인 사진을 profile.jpg로 저장합니다.
2. content.js에서 photo: ""를 photo: "assets/profile.jpg"로 바꿉니다.
3. photoAlt에 사진 설명을 적습니다.
PNG/WebP/AVIF도 가능합니다. 확장자와 대소문자를 실제 파일과 맞추세요.
사진이 없거나 경로가 틀리면 '사진 준비 중'으로 표시됩니다.

## 확인과 공개 반영
index.html을 직접 열어 확인하거나 node preview.mjs로 로컬 미리보기를 실행합니다.
수정한 파일과 사진을 커밋/푸시하면 기존 GitHub Pages 배포 설정에 따라 반영됩니다.
이 변경 자체는 자동으로 커밋하거나 푸시하지 않습니다.
사이트 이름을 바꾸면 index.html의 title과 description도 함께 수정하세요.

## 주소
/ 또는 /index.html → Home
/#about → 자기소개와 이력
/#home → Home
해시 주소를 유지하므로 메뉴 주소로 직접 접근하거나 새로고침할 수 있습니다.
/about 같은 해시 없는 하위 경로는 사용하지 않습니다.
기존 Blog, Projects, 관리자 주소는 더 이상 제공하지 않습니다.

## 점검
node --check app.js
node --check content.js
node smoke.test.mjs

원격 Supabase 프로젝트가 따로 있다면 이 작업에서는 변경하거나 삭제하지 않습니다.

## 관리자 / Blog 기능 (추가)
- /admin 또는 /admin/ : 이메일/비밀번호 로그인 및 게시글 관리
- /blog/ : 공개 글만 최신순 표시 (20개씩)
- 로그인은 Supabase Auth, 데이터는 기존 posts의 id/title/content/published/created_at 사용
- 홈 디자인과 정적 홈 대체 화면은 유지합니다.
- Publishable Key만 사용합니다. 브라우저의 UID 검사는 편의상 차단이고 실제 보안은 아래 RLS가 담당합니다.

### 배포 전에 Supabase에서 할 일
1. SQL Editor에서 supabase-setup.sql을 실행합니다. 기존 posts 내용은 삭제하지 않습니다.
2. Authentication > Users에서 관리자 UID가 259f2b6a-41fc-4df6-aa1e-b5f46a7d21e4인지 확인합니다.
3. 해당 계정의 이메일/비밀번호로 로그인합니다. 비밀번호는 코드에 넣지 않습니다.
4. 본인만 사용하는 사이트라면 공개 회원가입을 끕니다.
5. 기존 테이블에 추가적인 필수 열이나 제한적인 정책이 있다면 저장 오류가 날 수 있습니다.
   SQL 실행 오류가 나면 오류를 확인한 뒤 진행합니다. 관리 권한을 넓히는 임시 정책을 추가하지 마세요.

### 로그인 유지
토큰은 메모리에만 보관하며 새로고침하면 다시 로그인합니다.
세션이 만료된 상태에서 저장하면 오류를 표시하고 작성 중인 입력은 남깁니다.
이때 본문을 복사해 보관한 후 로그아웃/재로그인하세요.
로그아웃은 브라우저 상태를 지우고 Supabase 서버 세션 종료를 요청합니다.
사진 업로드는 이번 게시글 관리 구현에 포함되어 있지 않습니다.

### 테스트
node --check posts.js
node posts.test.mjs
node smoke.test.mjs
node preview.mjs 후 http://127.0.0.1:4173/admin/ 열기

Supabase 설정 후 실제 계정으로:
1. 로그아웃 상태에서 /admin/ 직접 접속 및 새로고침 → 로그인 폼만 표시
2. 잘못된 비밀번호와 다른 사용자 계정 → 관리자 목록 접근 거부
3. 본인 로그인 → 전체 목록
4. 비공개 글 작성 → 관리자에는 보이고 로그아웃한 /blog/에는 안 보임
5. 수정 후 공개 → /blog/에 내용 반영, 최신 작성일순
6. 다시 비공개 → 공개 목록에서 사라짐
7. 삭제 확인 취소 → 유지, 삭제 확인 → 목록에서 제거
8. 로그아웃 → 관리자 목록 숨김
9. 익명 및 다른 계정으로 API 직접 호출 시 쓰기 및 초안 조회가 거부되는지 확인
10. GitHub Pages 배포 후 /admin 과 /admin/, /blog/ 직접 접근 및 새로고침 확인

자동 테스트는 모의 API 기반입니다. 실제 비밀번호 로그인, RLS 차단, 실제 DB 변경은 별도 검증이 필요합니다.
공개 키로 기존 posts의 필요한 열이 조회 가능한 것은 확인했으며 SQL 정책 적용은 아직 수행하지 않았습니다.
GitHub Desktop에서 변경 파일 전체를 커밋/푸시하면 기존 Pages 배포 흐름으로 반영됩니다.
