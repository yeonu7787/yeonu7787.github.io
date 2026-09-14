# 이연우 개인 블로그

## 화면
- / : 프로필 사진, 인사말, Education, 최근 공개 글 3개
- /#about : 자기소개와 이력
- /blog/ : 모든 공개 글을 최신순으로 12개씩 탐색
- /blog/?id=글ID : 게시글 전체 본문과 사진
- /admin/ : 본인 로그인 후 글 작성/수정/삭제/공개 설정

/admin, /blog는 실제 디렉터리의 index.html로 연결됩니다.
상세 페이지는 존재하는 /blog/에 쿼리만 붙이므로 직접 접속/새로고침/뒤로가기에도 경로가 유지됩니다.
임의의 /blog/글ID 경로는 지원하지 않습니다.

## 먼저 Supabase에서 설정
1. 아직 적용하지 않았다면 SQL Editor에서 supabase-setup.sql 실행
2. SQL Editor에서 supabase-media.sql 실행
3. posts에 summary(text), images(text[])가 추가되고 post-images 비공개 버킷이 생성되는지 확인
4. 관리자 계정 UID는 supabase-config.js의 owner와 일치해야 합니다.

두 SQL 파일은 이 작업에서 서버에 실행하지 않았습니다.
기존 posts 내용은 보존합니다. SQL 오류가 있으면 먼저 오류를 해결하세요.
브라우저에서 쓰기 버튼을 숨기는 것에 더해 RLS로 관리자 UID만 쓰도록 제한합니다.

## 저장 위치
content.js: 이름, 자기소개, 학력 등 홈 데이터
assets/profile.jpg: 홈 사진
Supabase posts: title, content, published, created_at, summary, images
Supabase Storage post-images: 게시글 사진 원본

학력 구조:
education: [
 { school: "실제 학교명", department: "소프트웨어 공학과",
   period: "2026년 입학", description: "직접 작성한 소개" }
]
학교명은 아직 제공되지 않아 비워 두었습니다. 학교명을 추정하지 않았습니다.
홈의 학력은 content.js를 수정하고 푸시하면 반영됩니다.
게시글과 사진은 관리자에서 저장하면 반영되며 매번 푸시하지 않아도 됩니다.

## 사진 사용
관리자 글 편집에서 JPEG/PNG/WebP를 여러 장 선택합니다.
장당 5MB 이하, 글당 최대 12장입니다. 저장을 누르면 업로드합니다.
첫 사진이 썸네일이고, 상세 페이지에는 모든 사진이 본문 아래에 순서대로 표시됩니다.
대표 사진을 바꾸려면 앞 사진을 제외하거나 원하는 순서로 사진을 추가하세요.
요약이 없으면 본문 앞 120자를 사용하고, 사진이 없으면 NOTE 영역을 표시합니다.
본문은 일반 텍스트이며 HTML을 실행하지 않습니다. 사진은 별도 images 배열로 관리합니다.

업로드 성공 후 글 저장에 실패하면 편집 화면과 업로드된 사진 목록을 유지합니다.
사진 제외/게시글 삭제는 연결만 해제하며 원본 파일은 Storage에 남겨둡니다.
남은 파일 정리는 Supabase Storage에서 관리자가 별도로 수행하세요.
사진을 올린 뒤 편집을 취소해도 업로드한 파일이 남을 수 있습니다.

사진은 공개 글에 연결된 것만 방문자가 읽을 수 있는 비공개 버킷에 저장합니다.
공개 사진 표시에는 60초짜리 서명 URL을 사용합니다.
비공개 전환 전에 발급된 URL은 남은 유효기간 동안 접근 가능하며, 이미 다운로드한 사진은 회수할 수 없습니다.
기존 버킷과 공유되지 않는 전용 post-images 버킷을 사용하세요.

## 코드
index.html + app.js: 홈/About
content.js: 홈 데이터
blog-view.js: 최신 글, Blog 카드, 상세, 사진 조회
admin/index.html + posts.js: 관리자 로그인/CRUD/업로드
blog/index.html: Blog 목록 및 쿼리 상세 진입점
supabase-config.js: 프로젝트 URL, Publishable Key, 관리자 UID (비밀 키 없음)
style.css: 기존 색상과 모바일 레이아웃
preview.mjs: 로컬 확인용 서버

## 테스트 및 공개
node --check app.js
node --check posts.js
node --check blog-view.js
node smoke.test.mjs
node posts.test.mjs
node blog-view.test.mjs
node preview.mjs

SQL 적용 후 직접 확인:
- 관리자 로그인 → 사진 2장과 요약을 넣은 비공개 글 작성
- 로그아웃한 창의 홈/Blog/상세 URL에서 해당 초안이 안 보이는지 확인
- 공개 전환 → 홈 최근 글 3개와 Blog 카드에 표시되는지 확인
- 카드 클릭 → 제목/날짜/본문/사진 2장이 표시되는지 확인
- 상세 URL 새 탭 접속/새로고침/뒤로가기와 목록 복귀 확인
- 수정/사진 제외/삭제 확인
- 일반 계정과 익명 API 요청에서 초안 및 사진 쓰기가 차단되는지 확인
- 모바일에서 카드가 한 열로 정렬되고 사진/본문이 화면 너비를 넘지 않는지 확인

자동 테스트는 모의 API 기반입니다. 실제 Auth/Storage/RLS는 계정과 SQL 적용 후 확인해야 합니다.
커밋/푸시는 수행하지 않았습니다. 변경 파일 전체를 올려 GitHub Pages 배포를 완료하세요.

## 로그인 유지와 홈 편집
auth.js가 같은 탭의 sessionStorage에 토큰을 저장합니다. 페이지 이동/새로고침 후 복원하고 Supabase /user로 확인합니다. 만료 시 토큰을 갱신하며 비밀번호는 저장하지 않습니다.
홈/Blog 메뉴에서 홈 편집, 글쓰기, 글 관리, 로그아웃을 선택할 수 있습니다.
/write/는 전용 글쓰기 화면, /admin/?view=home은 홈 편집입니다.
Supabase SQL Editor에서 supabase-home.sql을 실행해야 홈 저장이 가능합니다.
홈 편집은 이름/인사말/소개/이메일/학력을 site_profile에 저장합니다. 사진은 기존 것을 유지합니다.
기존의 '로그인은 메모리에만 저장' 설명은 이 업데이트로 대체됩니다.
node auth.test.mjs 테스트 후 실제로 로그인 → 홈 → Blog → 글쓰기 → 새로고침 → 로그아웃을 확인하세요.
SQL 적용과 GitHub 커밋/푸시는 아직 하지 않았습니다.
