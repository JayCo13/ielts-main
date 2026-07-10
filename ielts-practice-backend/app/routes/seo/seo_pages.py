"""
Public, crawlable "đề thi" landing pages + dynamic sitemap.

Mounted at the application ROOT (no prefix, no auth) so that, via the nginx
`location /de-thi/` and `location = /sitemap.xml` blocks on the MAIN domain,
these are served from https://thiieltstrenmay.com/... with `index, follow`.

Goal: when someone Googles a full-test title (e.g. "Cambridge IELTS 19 Reading
Test 1") this server-rendered page — carrying that exact title in <title>/<h1>
plus structured data — ranks first and routes the visitor into the real
(authenticated, VIP-gated) test flow. Forecasts are never exposed here.
"""
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils import seo
from app.utils.datetime_utils import get_vietnam_time

router = APIRouter()

_E = seo.escape


def _iso_date(dt):
    try:
        return (dt or get_vietnam_time()).strftime("%Y-%m-%d")
    except Exception:
        return get_vietnam_time().strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Shared HTML shell
# ---------------------------------------------------------------------------
_BASE_CSS = """
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;background:#f8fafc;line-height:1.6}
a{color:#047857;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:920px;margin:0 auto;padding:0 20px}
header.site{background:#065f46;color:#fff}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:60px}
header.site a{color:#fff;font-weight:700;font-size:18px}
header.site nav a{font-weight:500;font-size:14px;margin-left:18px;opacity:.92}
.crumbs{font-size:13px;color:#6b7280;margin:18px 0}
.crumbs a{color:#6b7280}
h1{font-size:26px;line-height:1.3;margin:.2em 0 .4em}
h2{font-size:19px;margin:1.6em 0 .6em}
.lead{color:#374151;font-size:16px}
.meta{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}
.chip{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:500}
.cta{display:inline-block;background:#059669;color:#fff!important;font-weight:700;padding:13px 26px;border-radius:10px;margin:14px 0;font-size:16px}
.cta:hover{background:#047857;text-decoration:none}
ul.parts{padding-left:18px}ul.parts li{margin:6px 0}
h3.part-title{font-size:16px;margin:.7em 0 .2em;color:#065f46;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin:18px 0}
.card{display:block;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
.card:hover{border-color:#059669;text-decoration:none}
.card h3{margin:0 0 6px;font-size:16px;color:#111827}
.card p{margin:0;font-size:13px;color:#6b7280}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;font-size:14px;color:#92400e;margin:18px 0}
footer.site{margin-top:48px;padding:28px 0;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280}
footer.site a{margin-right:16px}
main{padding-bottom:20px}
"""


def _page(title, description, canonical, body_html, jsonld_blocks=None, noindex=False):
    robots = "noindex, follow" if noindex else "index, follow, max-image-preview:large"
    ld = ""
    for block in (jsonld_blocks or []):
        ld += '<script type="application/ld+json">%s</script>' % json.dumps(
            block, ensure_ascii=False, separators=(",", ":")
        )
    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{_E(title)}</title>
<meta name="description" content="{_E(description)}"/>
<meta name="robots" content="{robots}"/>
<link rel="canonical" href="{_E(canonical)}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="{_E(title)}"/>
<meta property="og:description" content="{_E(description)}"/>
<meta property="og:url" content="{_E(canonical)}"/>
<meta property="og:locale" content="vi_VN"/>
<meta property="og:site_name" content="thiieltstrenmay.com"/>
<meta name="twitter:card" content="summary"/>
<style>{_BASE_CSS}</style>
{ld}
</head>
<body>
<header class="site"><div class="wrap">
<a href="{seo.SITE_URL}/">thiieltstrenmay.com</a>
<nav>
<a href="{seo.SITE_URL}/de-thi/ielts-reading">Reading</a>
<a href="{seo.SITE_URL}/de-thi/ielts-listening">Listening</a>
<a href="{seo.SITE_URL}/de-thi/ielts-writing">Writing</a>
</nav>
</div></header>
<div class="wrap"><main>
{body_html}
</main>
<footer class="site"><div>
<a href="{seo.SITE_URL}/">Trang chủ</a>
<a href="{seo.SITE_URL}/de-thi">Tất cả đề thi</a>
<a href="{seo.SITE_URL}/about">Giới thiệu</a>
<a href="{seo.SITE_URL}/vip-packages">Gói VIP</a>
<div style="margin-top:10px">© thiieltstrenmay.com — Luyện thi IELTS trên máy tính giống thi thật 100%.</div>
</div></footer>
</div>
</body>
</html>"""
    return HTMLResponse(html)


def _breadcrumbs(trail):
    """trail: list of (name, url|None). Returns (html, jsonld)."""
    parts = []
    items = []
    for i, (name, url) in enumerate(trail):
        if url:
            parts.append(f'<a href="{_E(url)}">{_E(name)}</a>')
        else:
            parts.append(_E(name))
        items.append({
            "@type": "ListItem",
            "position": i + 1,
            "name": name,
            **({"item": url} if url else {}),
        })
    html = '<div class="crumbs">' + " / ".join(parts) + "</div>"
    jsonld = {"@context": "https://schema.org", "@type": "BreadcrumbList",
              "itemListElement": items}
    return html, jsonld


# ---------------------------------------------------------------------------
# /de-thi  — master index
# ---------------------------------------------------------------------------
@router.get("/de-thi", response_class=HTMLResponse)
@router.get("/de-thi/", response_class=HTMLResponse)
async def seo_master_index(db: Session = Depends(get_db)):
    counts = {skill: len(seo.get_fulltests(db, skill)) for skill in seo.SKILLS}
    crumbs_html, crumbs_ld = _breadcrumbs([("Trang chủ", seo.SITE_URL + "/"),
                                           ("Đề thi IELTS", None)])
    cards = ""
    for skill, cfg in seo.SKILLS.items():
        cards += (
            f'<a class="card" href="{seo.skill_index_url(skill)}">'
            f'<h3>{_E(cfg["label_vi"])}</h3>'
            f'<p>{counts[skill]} đề thi full test miễn phí luyện trực tuyến</p></a>'
        )
    body = f"""{crumbs_html}
<h1>Đề thi IELTS online — Reading, Listening, Writing</h1>
<p class="lead">Tổng hợp toàn bộ đề thi IELTS full test trên thiieltstrenmay.com, giao diện chấm điểm tự động giống bài thi máy thật 100%. Chọn kỹ năng để xem danh sách đề.</p>
<div class="grid">{cards}</div>
<div class="note">Mỗi đề là một bài full test hoàn chỉnh. Nhấn vào đề bạn muốn luyện để bắt đầu làm bài và nhận điểm ngay.</div>"""
    return _page(
        title="Đề thi IELTS online — Reading, Listening, Writing | thiieltstrenmay.com",
        description="Tổng hợp đề thi IELTS full test online: Reading, Listening, Writing. Luyện thi trên máy tính giống thi thật, chấm điểm tự động tại thiieltstrenmay.com.",
        canonical=f"{seo.SITE_URL}/de-thi",
        body_html=body,
        jsonld_blocks=[crumbs_ld],
    )


# ---------------------------------------------------------------------------
# /de-thi/ielts-{skill}  — per-skill index
# ---------------------------------------------------------------------------
@router.get("/de-thi/{skill_path}", response_class=HTMLResponse)
async def seo_skill_index(skill_path: str, db: Session = Depends(get_db)):
    skill = seo.PATH_TO_SKILL.get(skill_path)
    if not skill:
        return _not_found()
    cfg = seo.SKILLS[skill]
    tests = sorted(seo.get_fulltests(db, skill), key=lambda t: t["title"].lower())
    crumbs_html, crumbs_ld = _breadcrumbs([
        ("Trang chủ", seo.SITE_URL + "/"),
        ("Đề thi IELTS", seo.SITE_URL + "/de-thi"),
        (cfg["label"], None),
    ])
    cards = ""
    item_list = []
    for i, t in enumerate(tests):
        url = seo.test_url(t)
        sub = " · ".join(filter(None, [
            f"{int(t['duration'])} phút" if t.get("duration") else "",
            f"{len(t['part_titles'])} phần" if t["part_titles"] else "",
        ]))
        cards += (f'<a class="card" href="{url}"><h3>{_E(t["title"])}</h3>'
                  f'<p>{_E(sub)}</p></a>')
        item_list.append({"@type": "ListItem", "position": i + 1, "url": url, "name": t["title"]})
    if not cards:
        cards = '<p>Hiện chưa có đề thi nào.</p>'
    body = f"""{crumbs_html}
<h1>{_E(cfg["label_vi"])} — Tổng hợp đề full test</h1>
<p class="lead">Danh sách {len(tests)} đề thi {_E(cfg["label"])} full test trên thiieltstrenmay.com. Luyện trực tuyến trên giao diện giống bài thi máy thật, chấm điểm tự động ngay sau khi nộp bài.</p>
<div class="grid">{cards}</div>"""
    item_ld = {"@context": "https://schema.org", "@type": "ItemList",
               "name": cfg["label_vi"], "itemListElement": item_list}
    return _page(
        title=f"{cfg['label_vi']} — Tổng hợp đề thi full test online | thiieltstrenmay.com",
        description=f"Danh sách đề thi {cfg['label']} full test, luyện thi IELTS online trên máy giống thi thật, chấm điểm tự động tại thiieltstrenmay.com.",
        canonical=seo.skill_index_url(skill),
        body_html=body,
        jsonld_blocks=[crumbs_ld, item_ld],
    )


# ---------------------------------------------------------------------------
# /de-thi/ielts-{skill}/{slug}  — single full-test landing page
# ---------------------------------------------------------------------------
@router.get("/de-thi/{skill_path}/{slug}", response_class=HTMLResponse)
async def seo_test_landing(skill_path: str, slug: str, db: Session = Depends(get_db)):
    skill = seo.PATH_TO_SKILL.get(skill_path)
    if not skill:
        return _not_found()
    exam_id = seo.parse_exam_id_from_slug(slug)
    if exam_id is None:
        return _not_found()
    item = seo.find_fulltest(db, skill, exam_id)
    if not item:
        return _not_found()

    canonical = seo.test_url(item)
    # Redirect any non-canonical slug (wrong/old title, bare id) to the canonical
    # URL so Google consolidates ranking on one address.
    if f"{seo.SITE_URL}/de-thi/{skill_path}/{slug}" != canonical:
        return RedirectResponse(url=canonical, status_code=301)

    cfg = seo.SKILLS[skill]
    title = item["title"]
    duration = int(item["duration"]) if item.get("duration") else None
    qlabels = [seo.question_type_label(q) for q in item["question_types"]]

    meta_chips = ""
    if duration:
        meta_chips += f'<span class="chip">⏱ {duration} phút</span>'
    if item["part_titles"]:
        meta_chips += f'<span class="chip">📄 {len(item["part_titles"])} phần</span>'
    meta_chips += f'<span class="chip">{_E(cfg["label"])}</span>'
    meta_chips += '<span class="chip">Chấm điểm tự động</span>'

    # Render each part/passage title as its own heading (an <h3> carries far more
    # ranking weight than a plain <li>), so a search for a specific passage name
    # like "Beechen Festival" can surface this page — not just the test title.
    part_noun = {"reading": "Passage", "listening": "Part", "writing": "Phần"}[skill]
    parts_html = ""
    if item["part_titles"]:
        heads = ""
        for i, p in enumerate(item["part_titles"], 1):
            label = f"{part_noun} {i}: {p}" if part_noun else p
            heads += f"<h3 class='part-title'>{_E(label)}</h3>"
        parts_html = f"<h2>Nội dung các phần trong đề {_E(title)}</h2>{heads}"

    qtypes_html = ""
    if qlabels:
        lis = "".join(f"<li>{_E(q)}</li>" for q in qlabels)
        qtypes_html = f"<h2>Dạng câu hỏi xuất hiện</h2><ul class='parts'>{lis}</ul>"

    cta_url = f"{seo.SITE_URL}{seo.SKILL_SPA_LIST[skill]}?open={item['exam_id']}"

    skill_desc = {
        "reading": "đọc hiểu",
        "listening": "nghe hiểu",
        "writing": "viết luận",
    }[skill]
    description = (
        f"Luyện đề {title} ({cfg['label']}) online trên thiieltstrenmay.com — "
        f"bài full test {skill_desc} giống bài thi máy thật, chấm điểm tự động ngay khi nộp."
    )
    # Surface the passage/section names in the meta description too, so they are a
    # ranking signal for part-name searches, not only visible body text.
    if item["part_titles"]:
        description += " Các phần trong đề: " + ", ".join(item["part_titles"]) + "."

    crumbs_html, crumbs_ld = _breadcrumbs([
        ("Trang chủ", seo.SITE_URL + "/"),
        ("Đề thi IELTS", seo.SITE_URL + "/de-thi"),
        (cfg["label"], seo.skill_index_url(skill)),
        (title, None),
    ])

    body = f"""{crumbs_html}
<h1>{_E(title)}</h1>
<p class="lead">{_E(description)}</p>
<div class="meta">{meta_chips}</div>
<a class="cta" href="{_E(cta_url)}">▶ Làm bài test này ngay</a>
{parts_html}
{qtypes_html}
<h2>Về bài thi này</h2>
<p>Đây là bài <strong>{_E(cfg['label'])} full test</strong> trên thiieltstrenmay.com. Bạn sẽ làm bài trên giao diện mô phỏng bài thi IELTS trên máy tính (computer-delivered) giống thi thật 100%, hệ thống tự động chấm điểm và quy đổi band điểm ngay sau khi nộp bài.</p>
<div class="note">Cần đăng nhập để làm bài. Một số đề dành cho thành viên VIP — bạn có thể xem các gói tại <a href="{seo.SITE_URL}/vip-packages">trang Gói VIP</a>.</div>
<a class="cta" href="{_E(cta_url)}">▶ Bắt đầu làm bài</a>"""

    learning_ld = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": title,
        "url": canonical,
        "inLanguage": "en",
        "learningResourceType": f"IELTS {skill} practice test",
        "educationalLevel": "IELTS",
        "teaches": "IELTS " + skill,
        "description": description,
        "isAccessibleForFree": False,
        "provider": {
            "@type": "EducationalOrganization",
            "name": "thiieltstrenmay.com",
            "url": seo.SITE_URL + "/",
        },
        "potentialAction": {"@type": "Action", "name": "Làm bài", "target": cta_url},
    }
    if qlabels:
        learning_ld["about"] = qlabels
    if duration:
        learning_ld["timeRequired"] = f"PT{duration}M"
    if item["part_titles"]:
        learning_ld["hasPart"] = [
            {"@type": "CreativeWork", "name": p} for p in item["part_titles"]
        ]

    return _page(
        title=f"{title} — Luyện đề {cfg['label']} online | thiieltstrenmay.com",
        description=description,
        canonical=canonical,
        body_html=body,
        jsonld_blocks=[crumbs_ld, learning_ld],
    )


def _not_found():
    body = ('<h1>Không tìm thấy đề thi</h1><p class="lead">Đề thi bạn tìm không tồn tại hoặc đã bị gỡ. '
            f'Xem <a href="{seo.SITE_URL}/de-thi">tất cả đề thi IELTS</a>.</p>')
    resp = _page("Không tìm thấy đề thi | thiieltstrenmay.com",
                 "Không tìm thấy đề thi.", f"{seo.SITE_URL}/de-thi", body, noindex=True)
    resp.status_code = 404
    return resp


# ---------------------------------------------------------------------------
# /sitemap.xml  — dynamic, covers static pages + every full-test landing page
# ---------------------------------------------------------------------------
# Static public marketing/info pages (everything crawlable on the SPA).
_STATIC_PAGES = [
    ("/", "1.0", "daily"),
    ("/de-thi", "0.95", "daily"),
    ("/de-thi/ielts-reading", "0.9", "daily"),
    ("/de-thi/ielts-listening", "0.9", "daily"),
    ("/de-thi/ielts-writing", "0.9", "daily"),
    ("/about", "0.6", "monthly"),
    ("/instruction", "0.6", "monthly"),
    ("/achievements", "0.6", "monthly"),
    ("/vip-packages", "0.8", "weekly"),
    ("/login", "0.4", "yearly"),
    ("/register", "0.5", "yearly"),
    ("/privacy-policy", "0.3", "yearly"),
    ("/payment-policy", "0.3", "yearly"),
    ("/comp-policy", "0.3", "yearly"),
    ("/deli-policy", "0.3", "yearly"),
    ("/permission", "0.3", "yearly"),
]


@router.get("/sitemap.xml")
async def sitemap(db: Session = Depends(get_db)):
    today = get_vietnam_time().strftime("%Y-%m-%d")
    rows = []
    for path, prio, freq in _STATIC_PAGES:
        rows.append(
            f"<url><loc>{seo.SITE_URL}{path}</loc><lastmod>{today}</lastmod>"
            f"<changefreq>{freq}</changefreq><priority>{prio}</priority></url>"
        )
    for item in seo.get_all_fulltests(db):
        rows.append(
            f"<url><loc>{_E(seo.test_url(item))}</loc>"
            f"<lastmod>{_iso_date(item.get('created_at'))}</lastmod>"
            f"<changefreq>monthly</changefreq><priority>0.8</priority></url>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(rows)
        + "\n</urlset>"
    )
    return Response(content=xml, media_type="application/xml")
