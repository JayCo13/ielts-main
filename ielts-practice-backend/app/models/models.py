from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON, ForeignKey, Boolean, Text, BigInteger
from sqlalchemy.dialects.mysql import LONGBLOB, LONGTEXT
from sqlalchemy.orm import relationship, deferred
from app.database import Base
from datetime import datetime
from app.utils.datetime_utils import get_vietnam_time
from enum import Enum as PyEnum
class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password = Column(Text)
    email = Column(String(100), unique=True, index=True)
    is_active = Column(Boolean, default=True)
    is_active_student = Column(Boolean, default=False)
    role = Column(Enum('admin', 'student', 'customer', 'center', 'teacher', name='role_types'))
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    image_url = Column(String(255), nullable=True)
    status = Column(Enum('online', 'offline', name='user_status'), default='offline')
    google_id = Column(String(255), nullable=True)
    last_active = Column(DateTime, nullable=True)
    is_vip = Column(Boolean, default=False)
    vip_expiry = Column(DateTime, nullable=True)
    account_activated_at = Column(DateTime, nullable=True)
    exam_results = relationship("ExamResult", back_populates="user")
    user_sessions = relationship("UserSession", back_populates="user")

class UserSession(Base):
    __tablename__ = 'user_sessions'
    
    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    device_id = Column(String(255), nullable=False)  # Device fingerprint
    device_info = Column(JSON, nullable=True)  # Browser, OS, etc.
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    login_time = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    logout_time = Column(DateTime, nullable=True)
    last_activity = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    is_active = Column(Boolean, default=True)
    session_token = Column(String(255), nullable=True)  # JWT token reference
    unique_session_id = Column(String(255), nullable=True, unique=True)  # Unique session identifier
    
    user = relationship("User", back_populates="user_sessions")

class DeviceViolation(Base):
    __tablename__ = 'device_violations'
    
    violation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    device_id = Column(String(255), nullable=False)
    violation_type = Column(Enum('account_sharing', 'multiple_sessions', name='violation_types'))
    violation_count = Column(Integer, default=1)
    first_violation = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    last_violation = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    is_device_banned = Column(Boolean, default=False)
    ban_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    
    user = relationship("User")

class LoginCooldown(Base):
    __tablename__ = 'login_cooldowns'
    
    cooldown_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    device_id = Column(String(255), nullable=False)
    cooldown_start = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    cooldown_end = Column(DateTime, nullable=False)
    reason = Column(String(255), default='account_sharing_detected')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    
    user = relationship("User")

class UserNotification(Base):
    __tablename__ = 'user_notifications'
    
    notification_id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # Notification type
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    is_active = Column(Boolean, default=True)

class UpdateKey(Base):
    __tablename__ = 'update_keys'
    
    key_id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), nullable=False, unique=True)
    type = Column(String(50), nullable=False)  # Key type
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    is_active = Column(Boolean, default=True)


class VIPPackage(Base):
    __tablename__ = 'vip_packages'
    
    package_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    duration_months = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    package_type = Column(String(200))
    skill_type = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

class VIPSubscription(Base):
    __tablename__ = 'vip_subscriptions'
    
    subscription_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    package_id = Column(Integer, ForeignKey('vip_packages.package_id'))
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    payment_status = Column(Enum('pending', 'completed', 'reject', name='payment_status_types'))
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

    user = relationship("User")
    package = relationship("VIPPackage")

class Feedback(Base):
    __tablename__ = 'feedback'
    
    feedback_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=True)  # Add this line
    image_url = Column(String(255), nullable=True)
    content = Column(Text)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    user = relationship("User")

class PackageTransaction(Base):
    __tablename__ = 'package_transactions'
    
    transaction_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    package_id = Column(Integer, ForeignKey('vip_packages.package_id'))
    subscription_id = Column(Integer, ForeignKey('vip_subscriptions.subscription_id'))
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50))
    transaction_code= Column(String(500), nullable=True)
    bank_description= Column(Text, nullable=True)
    bank_transfer_image = Column(String(255), nullable=True)
    status = Column(Enum('pending', 'completed', 'reject', name='transaction_status_types'))
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    admin_note = Column(Text, nullable=True)
    payos_order_code = Column(BigInteger, nullable=True, unique=True, index=True)
    payos_checkout_url = Column(Text, nullable=True)
    user = relationship("User")
    package = relationship("VIPPackage")
    subscription = relationship("VIPSubscription")
    
class ExamAccessType(Base):
    __tablename__ = 'exam_access_types'
    
    exam_id = Column(Integer, ForeignKey('exams.exam_id'), primary_key=True)
    access_type = Column(Enum('no vip', 'vip', 'student', name='access_types'), primary_key=True)
    
    exam = relationship("Exam", back_populates="access_types")
class ExamResult(Base):
    __tablename__ = 'exam_results'
    
    result_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    exam_id = Column(Integer, ForeignKey('exams.exam_id'))
    total_score = Column(Float)
    completion_date = Column(DateTime)
    section_scores = Column(JSON)
    attempt_number = Column(Integer, nullable=False, default=1)
    is_forecast = Column(Boolean, default=False)  # True if this is a forecast (single part) result
    forecast_part = Column(Integer, nullable=True)  # Which part (1-4 for listening, 1-3 for reading) if forecast
    user = relationship("User", back_populates="exam_results")
    exam = relationship("Exam", back_populates="exam_results")
    answers = relationship("StudentAnswer", back_populates="exam_result")

class StudentAnswer(Base):
    __tablename__ = 'student_answers'
    
    answer_id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey('exam_results.result_id'))
    question_id = Column(Integer, ForeignKey('questions.question_id'))
    student_answer = Column(Text)
    score = Column(Float)
    
    exam_result = relationship("ExamResult", back_populates="answers")
    question = relationship("Question", back_populates="student_answers")

class ListeningAnswer(Base):
    __tablename__ = 'listening_answers'
    
    answer_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    exam_id = Column(Integer, ForeignKey('exams.exam_id'))
    result_id = Column(Integer, ForeignKey('exam_results.result_id'))
    question_id = Column(Integer, ForeignKey('questions.question_id'))
    student_answer = Column(Text)
    score = Column(Float)
    created_at = Column(DateTime)
    
    user = relationship("User")
    exam = relationship("Exam")
    exam_result = relationship("ExamResult")
    question = relationship("Question", back_populates="listening_answers")

class Exam(Base):
    __tablename__ = 'exams'
    
    exam_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100))
    created_at = Column(DateTime)
    description = Column(LONGTEXT, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey('users.user_id'))
    access_types = relationship("ExamAccessType", back_populates="exam")
    exam_results = relationship("ExamResult", back_populates="exam")
    exam_sections = relationship("ExamSection", back_populates="exam")
   
class ExamSection(Base):
    __tablename__ = 'exam_sections'
    
    section_id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey('exams.exam_id'))
    section_type = Column(String(255))
    duration = Column(Integer)
    total_marks = Column(Float)
    order_number = Column(Integer)
    description = Column(LONGTEXT, nullable=True)
    part_title = Column(LONGTEXT, nullable=True)  # Short display title for each part
    is_forecast = Column(Boolean, default=False)
    forecast_title = Column(String(200), nullable=True)
    is_recommended = Column(Boolean, default=False)  # Starred/recommended forecast
    question_type_tags = Column(JSON, nullable=True)  # Admin-set tags for filtering, e.g. ["true_false_ng", "fill_blank"]
    exam = relationship("Exam", back_populates="exam_sections")
    questions = relationship("Question", back_populates="section")

class QuestionGroup(Base):
    __tablename__ = 'question_groups'
    
    group_id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey('exam_sections.section_id'))
    instruction = Column(Text)
    question_range = Column(String(50))  # e.g., "1-6", "7-13"
    group_type = Column(String(50))  # e.g., "true_false_ng", "fill_blank"
    order_number = Column(Integer)
    
    # Add relationships
    section = relationship("ExamSection", backref="question_groups")
    questions = relationship("Question", back_populates="group")

class Question(Base):
    # Add these lines to your existing Question model
    group_id = Column(Integer, ForeignKey('question_groups.group_id'), nullable=True)
    question_number = Column(Integer)  # The question number within the test
    group = relationship("QuestionGroup", back_populates="questions")
    __tablename__ = 'questions'
    
    question_id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey('exam_sections.section_id'))
    group_id = Column(Integer, ForeignKey('question_groups.group_id'), nullable=True)
    question_type = Column(Text)
    question_text = Column(LONGTEXT)
    explanation = Column(LONGTEXT, nullable=True)
    locate = Column(LONGTEXT, nullable=True)
    correct_answer = Column(Text)
    marks = Column(Integer, default=1)
    media_url = Column(String(255))
    additional_data = Column(JSON)
    question_number = Column(Integer)  # Add this to track the question number within the test

    section = relationship("ExamSection", back_populates="questions")
    group = relationship("QuestionGroup", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question")
    student_answers = relationship("StudentAnswer", back_populates="question")
    listening_answers = relationship("ListeningAnswer", back_populates="question")  # Add this line
    
class QuestionOption(Base):
    __tablename__ = 'question_options'
    
    option_id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey('questions.question_id'))
    option_text = Column(Text)
    is_correct = Column(Boolean)

    question = relationship("Question", back_populates="options")


  



class WritingTask(Base):
    __tablename__ = 'writing_tasks'
    
    task_id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey('exams.exam_id'))
    part_number = Column(Integer)
    task_type = Column(Enum('essay', 'report', 'letter', name='task_types'))
    title = Column(String(200), nullable=True)
    instructions = Column(LONGTEXT)  # Keep using LONGTEXT instead of Text
    word_limit = Column(Integer)
    total_marks = Column(Float)
    duration = Column(Integer)
    is_forecast = Column(Boolean, default=False)
    is_recommended = Column(Boolean, default=False)  # Starred/recommended forecast
    question_type_tags = Column(JSON, nullable=True)
    sample_essay = Column(LONGTEXT, nullable=True)

    exam = relationship("Exam", backref="writing_tasks")
    student_answers = relationship("WritingAnswer", back_populates="task")

class WritingAnswer(Base):
    __tablename__ = 'writing_answers'
    
    answer_id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey('writing_tasks.task_id'))
    user_id = Column(Integer, ForeignKey('users.user_id'))
    answer_text = Column(LONGTEXT, nullable=False)
    score = Column(Float, nullable=True)
    is_ai_evaluated = Column(Boolean, default=False)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    
    # Scores for each criterion
    task_achievement_score = Column(Float, nullable=True)
    coherence_cohesion_score = Column(Float, nullable=True)
    lexical_resource_score = Column(Float, nullable=True)
    grammatical_range_score = Column(Float, nullable=True)
    
    # New evaluation fields
    mistakes = Column(JSON, nullable=True)
    improvement_suggestions = Column(JSON, nullable=True)
    rewritten_essay = Column(LONGTEXT, nullable=True)

    task = relationship("WritingTask", back_populates="student_answers")
    user = relationship("User")


class ListeningMedia(Base):
    __tablename__ = "listening_media"

    media_id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("exam_sections.section_id"))
    audio_file = deferred(Column(LONGBLOB))  # Deferred to avoid loading large blobs by default
    audio_filename = Column(String(255))
    transcript = Column(LONGTEXT)
    duration = Column(Integer)



class ReadingPassage(Base):
    __tablename__ = 'reading_passages'
    
    passage_id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey('exam_sections.section_id'))
    content = Column(Text)
    title = Column(String(100))
    word_count = Column(Integer)
class AdminNotificationRead(Base):
    __tablename__ = 'admin_notification_reads'
    
    read_id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey('users.user_id'))
    notification_id = Column(String(255), nullable=False)  # Format: "type_id"
    notification_type = Column(String(50), nullable=False)  # e.g., "transaction", "writing", "speaking"
    item_id = Column(String(50), nullable=False)  # The actual ID of the item
    read_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    
    admin = relationship("User")


class SpeakingMaterial(Base):
    __tablename__ = 'speaking_materials'

    material_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    part_type = Column(Enum('part1', 'part2_3', name='speaking_part_types'))
    pdf_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    
    access_types = relationship("SpeakingMaterialAccessType", back_populates="material", cascade="all, delete-orphan")


class SpeakingMaterialAccessType(Base):
    __tablename__ = 'speaking_material_access_types'
    
    material_id = Column(Integer, ForeignKey('speaking_materials.material_id', ondelete='CASCADE'), primary_key=True)
    access_type = Column(Enum('no vip', 'vip', 'student', name='access_types'), primary_key=True)
    
    material = relationship("SpeakingMaterial", back_populates="access_types")


class SavedVocabulary(Base):
    __tablename__ = 'saved_vocabulary'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    word = Column(String(255), nullable=False)
    context = Column(Text, nullable=True)
    source_type = Column(Enum('listening', 'reading', name='vocab_source_types'), nullable=False)
    source_exam_id = Column(Integer, nullable=True)
    source_exam_title = Column(String(255), nullable=True)
    is_important = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    
    user = relationship("User", backref="saved_vocabulary")


class DictationUnit(Base):
    __tablename__ = 'dictation_units'
    
    unit_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    
    words = relationship("DictationWord", back_populates="unit", cascade="all, delete-orphan")


class DictationWord(Base):
    __tablename__ = 'dictation_words'
    
    word_id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey('dictation_units.unit_id', ondelete='CASCADE'), nullable=False)
    word = Column(String(255), nullable=False)
    order_index = Column(Integer, default=0)
    is_important = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    
    unit = relationship("DictationUnit", back_populates="words")


class StudentImportantWord(Base):
    """Junction table to track which student marked which word as important."""
    __tablename__ = 'student_important_words'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    word_id = Column(Integer, ForeignKey('dictation_words.word_id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    
    # Unique constraint: one user can only mark a word as important once
    __table_args__ = (
        {'mysql_charset': 'utf8mb4'},
    )

class EmailBroadcast(Base):
    __tablename__ = 'email_broadcasts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject = Column(String(500), nullable=False)
    body_html = Column(LONGTEXT, nullable=False)
    status = Column(Enum('pending', 'sending', 'completed', 'failed', name='broadcast_status'), default='pending')
    target_filter = Column(String(50), default='non_vip')  # non_vip, all, vip
    total_recipients = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))
    completed_at = Column(DateTime, nullable=True)


# ─────────────────────────────────────────────────────────────────────────────
# Center (Trung tâm) management — 3-level org: Center → Teacher → Student.
# A Center owns a login User (role='center'), a wallet, teachers/students
# (Users linked via CenterMembership) and classrooms. Teachers use role
# 'teacher' (exam access like a VIP customer); center-managed students stay
# role 'customer' and depend purely on VIP the center buys (no 90-day window).
# ─────────────────────────────────────────────────────────────────────────────

class Center(Base):
    __tablename__ = 'centers'

    center_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False, unique=True)  # login account, role='center'
    name = Column(String(200), nullable=False)
    logo_url = Column(String(255), nullable=True)
    # Wallet (VND). balance = deposited - used (kept explicit for auditing).
    wallet_balance = Column(Float, default=0, nullable=False)
    wallet_deposited = Column(Float, default=0, nullable=False)   # cumulative topped up
    wallet_used = Column(Float, default=0, nullable=False)        # cumulative spent
    # Tiered VIP discount, derived from cumulative purchase count:
    #   count 1-5 -> 0%, 6-20 -> 5%, 21+ -> 10%
    vip_purchase_count = Column(Integer, default=0, nullable=False)
    discount_rate = Column(Float, default=0, nullable=False)      # current %, cached from count
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

    user = relationship("User")


class Classroom(Base):
    __tablename__ = 'classrooms'

    class_id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey('centers.center_id'), nullable=False)
    name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

    center = relationship("Center")


class CenterMembership(Base):
    """Links a teacher/student User to a Center. One row per user per center."""
    __tablename__ = 'center_memberships'

    membership_id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey('centers.center_id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    member_type = Column(Enum('teacher', 'student', name='center_member_types'), nullable=False)
    is_paused = Column(Boolean, default=False)     # tạm dừng (temporarily suspended)
    is_disabled = Column(Boolean, default=False)   # vô hiệu hoá (deactivated)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

    center = relationship("Center")
    user = relationship("User")

    __table_args__ = (
        {'mysql_charset': 'utf8mb4'},
    )


class ClassMember(Base):
    """Many-to-many: which users (teachers or students) belong to a classroom.
    A teacher may belong to several classes; a center-student to 0 or 1 class
    (no row => 'khách lẻ')."""
    __tablename__ = 'class_members'

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey('classrooms.class_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

    classroom = relationship("Classroom")
    user = relationship("User")


class CenterWalletTransaction(Base):
    __tablename__ = 'center_wallet_transactions'

    transaction_id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey('centers.center_id'), nullable=False)
    type = Column(Enum('deposit', 'vip_purchase', name='center_txn_types'), nullable=False)
    amount = Column(Float, nullable=False)                 # deposit: credited; vip_purchase: charged
    method = Column(String(50), nullable=True)            # 'payos' for deposits
    status = Column(Enum('pending', 'completed', 'reject', name='center_txn_status'), default='pending')
    target_user_id = Column(Integer, ForeignKey('users.user_id'), nullable=True)  # vip_purchase: who got VIP
    package_id = Column(Integer, ForeignKey('vip_packages.package_id'), nullable=True)
    discount_rate = Column(Float, nullable=True)          # discount applied on a vip_purchase
    payos_order_code = Column(BigInteger, nullable=True, unique=True, index=True)
    payos_checkout_url = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

    center = relationship("Center")


class ChatMessage(Base):
    """Teacher<->student direct messages and teacher->class messages.
    is_pinned marks an important/homework message that shouldn't scroll away."""
    __tablename__ = 'chat_messages'

    message_id = Column(Integer, primary_key=True, index=True)
    center_id = Column(Integer, ForeignKey('centers.center_id'), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    scope = Column(Enum('direct', 'class', name='chat_scopes'), nullable=False)
    class_id = Column(Integer, ForeignKey('classrooms.class_id'), nullable=True, index=True)   # scope='class'
    recipient_id = Column(Integer, ForeignKey('users.user_id'), nullable=True)                 # scope='direct'
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None), index=True)

    center = relationship("Center")
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
    classroom = relationship("Classroom")


class ExamProgress(Base):
    """Live exam-taking heartbeat for the teacher realtime dashboard. One row
    per user (upserted); Redis is the fast read path, this table is durability."""
    __tablename__ = 'exam_progress'

    progress_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False, unique=True, index=True)
    center_id = Column(Integer, ForeignKey('centers.center_id'), nullable=True, index=True)
    exam_id = Column(Integer, nullable=True)
    skill = Column(String(30), nullable=True)             # listening/reading/writing/speaking
    title = Column(String(255), nullable=True)            # e.g. "Part 1: Chicken"
    questions_done = Column(Integer, default=0)
    total_questions = Column(Integer, nullable=True)
    last_question = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)             # currently in an exam
    started_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

    user = relationship("User")


class Announcement(Base):
    """Homepage "Thông tin mới" news items, authored from the admin dashboard
    and shown at the top of the public student landing page. `is_important`
    pins an item to the top of the list ("không bị trôi")."""
    __tablename__ = 'announcements'

    announcement_id = Column(Integer, primary_key=True, index=True)
    icon = Column(String(16), nullable=True)          # emoji, e.g. 🔥 / 🆕 / 📅
    title = Column(String(255), nullable=True)        # headline shown on the homepage list
    content = Column(Text, nullable=True)             # full body (rich HTML, may embed images)
    link = Column(String(500), nullable=True)         # optional external URL (used instead of the detail page)
    is_important = Column(Boolean, default=False)     # pinned at top of the list
    display_order = Column(Integer, default=0)        # manual ordering (asc)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: get_vietnam_time().replace(tzinfo=None))

