# SEO cho Full Test (đưa bài test lên top Google)

Mục tiêu: khi user search **tiêu đề một bài full test** trên Google, trang của ta hiện
đầu tiên — và **không** ảnh hưởng tới logic gating/VIP/làm mờ. Forecast **không** được SEO.

## Cách hoạt động

Toàn bộ nội dung "làm bài" vẫn nằm sau `StudentGuard` + check VIP như cũ (không đụng tới).
Ta thêm **một lớp landing page công khai, server-render bởi backend**, chỉ chứa *metadata*
đã công khai trên thẻ test (title, thời lượng, số phần, dạng câu hỏi) — **không** lộ câu hỏi,
đáp án, audio hay passage, và **chỉ full test** (`is_forecast` falsy), forecast bị loại hoàn toàn.

### URL công khai (trên domain chính, `index, follow`)
- `https://thiieltstrenmay.com/de-thi` — index tổng
- `https://thiieltstrenmay.com/de-thi/ielts-reading` (và `-listening`, `-writing`) — index theo kỹ năng
- `https://thiieltstrenmay.com/de-thi/ielts-reading/<slug>-<exam_id>` — **landing 1 bài full test**
  - `<title>`/`<h1>` = đúng tiêu đề bài test → đây là thứ giúp rank theo tiêu đề.
  - Có JSON-LD `LearningResource` + `BreadcrumbList`, canonical, OG tags.
  - Slug sai/cũ → **301** về slug chuẩn (gộp ranking về 1 URL).
- `https://thiieltstrenmay.com/sitemap.xml` — **sitemap động**, tự liệt kê mọi landing page full test + trang tĩnh.

### Nút "Làm bài" (CTA)
Trỏ về `/<skill>_list?open=<exam_id>` trong SPA. Khi đã đăng nhập, list load xong sẽ **tự mở**
đúng bài đó (qua flow gốc → vẫn check quyền/VIP ở backend). Nếu không có quyền (VIP-only) hoặc
chưa đăng nhập → hiển thị list bình thường / về trang login. Logic blur/VIP **không đổi**.

## File đã thay đổi

**Backend**
- `ielts-practice-backend/app/utils/seo.py` *(mới)* — slugify (hỗ trợ tiếng Việt), truy vấn full test theo kỹ năng (lọc forecast), build URL/HTML.
- `ielts-practice-backend/app/routes/seo/seo_pages.py` *(mới)* — endpoint công khai (no-auth): landing pages + `/sitemap.xml`.
- `ielts-practice-backend/app/routes/__init__.py` — mount `seo_router` ở root (no prefix).

**nginx**
- `nginx/conf.d/default.conf` — thêm `location /de-thi` và `location = /sitemap.xml` proxy về backend (chỉ trên domain chính).
- `nginx/robots.txt` — thêm `Allow: /de-thi`.

**Student UI (`ielts-tajun`)**
- `src/components/Reading_Fe.js`, `Listening_Fe.js`, `Writing_Fe.js` — thêm effect tự mở bài khi có `?open=<id>` (additive, không sửa gating).
- `public/robots.txt` — thêm `Allow: /de-thi`.

> `ielts-tajun/public/sitemap.xml` (tĩnh) giờ bị nginx che bởi sitemap động ở domain chính — để lại cũng vô hại.

## Triển khai lên VPS (KHÔNG tự pull từ git — phải upload tay)

1. **Upload các file backend đã đổi** (`app/utils/seo.py`, `app/routes/seo/`, `app/routes/__init__.py`) lên VPS.
2. Rebuild/restart backend để nạp router mới (code được mount nên restart là đủ):
   ```bash
   docker-compose restart backend      # hoặc: docker-compose up -d --build backend
   docker-compose logs -f backend      # xác nhận không lỗi import
   ```
3. **Upload `nginx/conf.d/default.conf` và `nginx/robots.txt`**, kiểm tra cú pháp rồi reload:
   ```bash
   docker-compose exec nginx nginx -t
   docker-compose exec nginx nginx -s reload
   ```
4. **Rebuild student UI** (vì sửa `Reading_Fe/Listening_Fe/Writing_Fe` + robots.txt — UI bake vào image):
   ```bash
   docker-compose up -d --build user-ui
   ```
5. **Kiểm tra nhanh** (thay <id> bằng exam_id thật):
   ```bash
   curl -s https://thiieltstrenmay.com/sitemap.xml | head
   curl -s https://thiieltstrenmay.com/de-thi/ielts-reading | grep -o '<title>.*</title>'
   curl -sI https://thiieltstrenmay.com/de-thi/ielts-reading/sai-slug-<id>   # mong đợi 301
   ```
6. **Google Search Console**: Sitemaps → submit `https://thiieltstrenmay.com/sitemap.xml`.
   Dùng URL Inspection để "Request indexing" cho vài landing page chủ lực.

## Lưu ý / mở rộng (không bắt buộc)

- **Giữ logged-out → đúng bài sau login**: hiện logged-out bấm CTA sẽ về `/login` (mất `?open`).
  Muốn quay lại đúng bài: cho list component truyền `state={from}` khi `navigate('/login')` và cho
  `LoginForm` redirect về `from`. (Đã cố tình chưa làm để tránh đụng auth.)
- **Thêm kỹ năng Speaking**: speaking miễn phí cho mọi người — có thể thêm vào `SKILLS` trong `seo.py`
  + một fetcher tương tự nếu muốn SEO luôn.
- Bài mới admin tạo sẽ **tự** xuất hiện trong sitemap & có landing page (query động), không cần rebuild.
