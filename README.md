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
