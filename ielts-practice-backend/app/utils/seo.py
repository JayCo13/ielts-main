"""
SEO helpers for the public, crawlable "đề thi" landing pages.

These helpers power a PUBLIC (no-auth) surface that exists purely so Google can
discover and rank each FULL TEST by its title. They deliberately:

  * expose ONLY full tests (ExamSection / WritingTask with is_forecast falsy) —
    forecasts are never listed, so the blur/VIP gating on the SPA is untouched;
  * expose ONLY metadata already printed on the public test cards (title,
    duration, marks, question-type tags, part titles) — never the questions,
    answers, audio, or passages themselves. Taking a test still goes through the
    normal authenticated + VIP-checked flow in the SPA.

Nothing here mutates state or reads per-user data, so it is safe to serve
anonymously and to cache.
"""
import os
import re
import unicodedata
from html import escape as _escape

from app.models.models import (
    Exam,
    ExamSection,
    ReadingPassage,
    WritingTask,
)

# Canonical public origin (main student domain). Overridable for staging.
SITE_URL = os.getenv("SITE_URL", "https://thiieltstrenmay.com").rstrip("/")

# Per-skill config. `path` is the URL segment under /de-thi/.
# `std_minutes` is the canonical IELTS full-test duration shown on the landing
# page. We use the standard figure rather than the per-section DB `duration`
# field, which is stored in seconds with inconsistent units across skills and
# would otherwise render nonsense like "1200 phút".
SKILLS = {
    "reading": {"path": "ielts-reading", "label": "IELTS Reading", "label_vi": "Đề thi IELTS Reading", "std_minutes": 60},
    "listening": {"path": "ielts-listening", "label": "IELTS Listening", "label_vi": "Đề thi IELTS Listening", "std_minutes": 30},
    "writing": {"path": "ielts-writing", "label": "IELTS Writing", "label_vi": "Đề thi IELTS Writing", "std_minutes": 60},
}
# Map a URL path segment back to its skill key.
PATH_TO_SKILL = {cfg["path"]: skill for skill, cfg in SKILLS.items()}

# Which SPA list route a "Làm bài" CTA should deep-link into.
SKILL_SPA_LIST = {
    "reading": "/reading_list",
    "listening": "/listening_list",
    "writing": "/writing_list",
}

# Human-readable Vietnamese labels for the internal question-type tags. Unknown
# tags fall back to a title-cased, de-underscored version so we never crash on a
# newly added tag.
QUESTION_TYPE_LABELS = {
    "true_false_ng": "True / False / Not Given",
    "yes_no_ng": "Yes / No / Not Given",
    "fill_blank": "Điền từ vào chỗ trống",
    "sentence_completion": "Hoàn thành câu",
    "summary_completion": "Hoàn thành đoạn tóm tắt",
    "note_completion": "Hoàn thành ghi chú",
    "table_completion": "Hoàn thành bảng",
    "form_completion": "Hoàn thành biểu mẫu",
    "flowchart_completion": "Hoàn thành sơ đồ",
    "diagram_labelling": "Gắn nhãn sơ đồ",
    "map_labelling": "Gắn nhãn bản đồ",
    "matching_headings": "Nối tiêu đề",
    "matching_information": "Nối thông tin",
    "matching_features": "Nối đặc điểm",
    "matching_sentence_endings": "Nối phần kết câu",
    "multiple_choice": "Trắc nghiệm",
    "short_answer": "Trả lời ngắn",
    "essay": "Essay (Task 2)",
    "report": "Report (Task 1 Academic)",
    "letter": "Letter (Task 1 General)",
}


def escape(value) -> str:
    """HTML-escape any value (None -> '')."""
    if value is None:
        return ""
    return _escape(str(value), quote=True)


def question_type_label(tag) -> str:
    if not tag:
        return ""
    return QUESTION_TYPE_LABELS.get(tag, str(tag).replace("_", " ").strip().title())


# ---------------------------------------------------------------------------
# Slugs
# ---------------------------------------------------------------------------
_VN_MAP = str.maketrans({"đ": "d", "Đ": "D"})


def slugify(text: str) -> str:
    """Vietnamese-aware slug: strip diacritics, lowercase, hyphenate.

    'Cambridge IELTS 19 – Reading Test 1' -> 'cambridge-ielts-19-reading-test-1'
    """
    if not text:
        return "de-thi"
    text = text.translate(_VN_MAP)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "de-thi"


def canonical_slug(item: dict) -> str:
    """`<slugified-title>-<exam_id>` — id suffix guarantees uniqueness/resolvability."""
    return f"{slugify(item['title'])}-{item['exam_id']}"


def parse_exam_id_from_slug(slug: str):
    """Pull the trailing numeric id out of a slug. Returns int or None."""
    m = re.search(r"-(\d+)$", slug or "")
    if m:
        return int(m.group(1))
    # Bare numeric id also accepted.
    if (slug or "").isdigit():
        return int(slug)
    return None


def test_url(item: dict) -> str:
    cfg = SKILLS[item["skill"]]
    return f"{SITE_URL}/de-thi/{cfg['path']}/{canonical_slug(item)}"


def skill_index_url(skill: str) -> str:
    return f"{SITE_URL}/de-thi/{SKILLS[skill]['path']}"


# ---------------------------------------------------------------------------
# Full-test discovery (forecasts excluded by construction)
# ---------------------------------------------------------------------------
def _normalize(skill, exam, question_types, part_titles):
    return {
        "skill": skill,
        "exam_id": exam.exam_id,
        "title": (exam.title or "").strip() or f"IELTS {skill.title()} Test {exam.exam_id}",
        "description": exam.description,
        "created_at": exam.created_at,
        "duration": SKILLS[skill]["std_minutes"],  # canonical IELTS minutes
        "question_types": sorted({q for q in question_types if q}),
        "part_titles": [t for t in part_titles if t],
    }


def _has_full_section(db, exam_id, section_type):
    """A real full test has at least one NON-forecast section of this type.
    (Pure-forecast exams — only is_forecast sections — are excluded from SEO.)"""
    return (
        db.query(ExamSection.section_id)
        .filter(
            ExamSection.exam_id == exam_id,
            ExamSection.section_type == section_type,
            ExamSection.is_forecast.in_([False, None]),
        )
        .first()
        is not None
    )


def get_reading_fulltests(db):
    exams = (
        db.query(Exam)
        .join(ExamSection)
        .filter(
            Exam.is_active == True,  # noqa: E712
            ExamSection.section_type == "reading",
            ExamSection.is_forecast.in_([False, None]),
        )
        .distinct()
        .all()
    )
    results = []
    for exam in exams:
        # The full test loads ALL reading sections (the single-test endpoint does
        # not filter is_forecast), so list every passage title — these are the
        # reading passages of the full test, NOT the standalone forecast_title.
        sections = (
            db.query(ExamSection)
            .filter(
                ExamSection.exam_id == exam.exam_id,
                ExamSection.section_type == "reading",
            )
            .order_by(ExamSection.order_number)
            .all()
        )
        if not sections:
            continue
        section_ids = [s.section_id for s in sections]
        passage_title_by_section = {
            p.section_id: p.title
            for p in db.query(ReadingPassage)
            .filter(ReadingPassage.section_id.in_(section_ids))
            .all()
        }
        part_titles, qtypes = [], set()
        for s in sections:
            title = s.part_title or passage_title_by_section.get(s.section_id)
            if title:
                part_titles.append(title)
            if s.question_type_tags:
                qtypes.update(s.question_type_tags)
        results.append(_normalize("reading", exam, qtypes, part_titles))
    return results


def get_listening_fulltests(db):
    exams = (
        db.query(Exam)
        .join(ExamSection)
        .filter(
            Exam.is_active == True,  # noqa: E712
            ExamSection.section_type == "listening",
            ExamSection.is_forecast.in_([False, None]),
        )
        .distinct()
        .all()
    )
    results = []
    for exam in exams:
        sections = (
            db.query(ExamSection)
            .filter(
                ExamSection.exam_id == exam.exam_id,
                ExamSection.section_type == "listening",
            )
            .order_by(ExamSection.order_number)
            .all()
        )
        if not sections:
            continue
        part_titles, qtypes = [], set()
        for s in sections:
            if s.part_title:
                part_titles.append(s.part_title)
            if s.question_type_tags:
                qtypes.update(s.question_type_tags)
        results.append(_normalize("listening", exam, qtypes, part_titles))
    return results


def get_writing_fulltests(db):
    # A writing "full test" is an active exam whose ESSAY ExamSection is not a
    # forecast — the same signal the /writing/tasks list page uses. Note:
    # WritingTask.is_forecast is unreliable here (legacy default = True for all
    # rows), so we deliberately key off ExamSection, mirroring reading/listening.
    exams = (
        db.query(Exam)
        .join(ExamSection)
        .filter(
            Exam.is_active == True,  # noqa: E712
            ExamSection.section_type == "essay",
            ExamSection.is_forecast.in_([False, None]),
        )
        .distinct()
        .all()
    )
    results = []
    for exam in exams:
        sections = (
            db.query(ExamSection)
            .filter(
                ExamSection.exam_id == exam.exam_id,
                ExamSection.section_type == "essay",
                ExamSection.is_forecast.in_([False, None]),
            )
            .order_by(ExamSection.order_number)
            .all()
        )
        if not sections:
            continue
        tasks = (
            db.query(WritingTask)
            .filter(WritingTask.test_id == exam.exam_id)
            .order_by(WritingTask.part_number)
            .all()
        )
        part_titles, qtypes = [], set()
        for t in tasks:
            if t.title:
                part_titles.append(t.title)
            if t.task_type:
                qtypes.add(t.task_type)
            if t.question_type_tags:
                qtypes.update(t.question_type_tags)
        results.append(_normalize("writing", exam, qtypes, part_titles))
    return results


_SKILL_FETCHERS = {
    "reading": get_reading_fulltests,
    "listening": get_listening_fulltests,
    "writing": get_writing_fulltests,
}


def get_fulltests(db, skill):
    return _SKILL_FETCHERS[skill](db)


def get_all_fulltests(db):
    out = []
    for skill in SKILLS:
        out.extend(_SKILL_FETCHERS[skill](db))
    return out


def find_fulltest(db, skill, exam_id):
    for item in get_fulltests(db, skill):
        if item["exam_id"] == exam_id:
            return item
    return None
