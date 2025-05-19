import json
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Exam, ExamSection, Question, SpeakingAnswer, QuestionOption, ReadingPassage,WritingAnswer, ListeningMedia, WritingTask, SpeakingTopic, User, SpeakingQuestion, ExamResult, PackageTransaction, VIPPackage,ExamAccessType, AdminNotificationRead
from app.routes.admin.auth import get_current_admin
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from pydantic import BaseModel
import shutil
from bs4 import BeautifulSoup
import re
import os
from sqlalchemy.sql import func
from sqlalchemy import and_, distinct, or_

router = APIRouter()

class QuestionOptionCreate(BaseModel):
    option_text: str
    is_correct: bool

class ExamAccessUpdate(BaseModel):
    access_types: List[str] 

class NotificationMarkRead(BaseModel):
    notification_ids: List[str]

class QuestionCreate(BaseModel):
    question_text: str
    question_type: str
    correct_answer: str
    marks: int
    media_url: Optional[str] = None
    options: List[QuestionOptionCreate] = None
    required_choices: Optional[int] = None
    
class ListeningTestInit(BaseModel):
    title: str
    duration: int = 30
    total_marks: float = 40.0

class ListeningPartUpdate(BaseModel):
    transcript: Optional[str] = None
    questions: List[QuestionCreate]

class ExamSectionCreate(BaseModel):
    section_type: str
    duration: int
    total_marks: float
    order_number: int
    questions: List[QuestionCreate]

class IELTSExamCreate(BaseModel):
    title: str
    sections: List[ExamSectionCreate]

class ReadingQuestionCreate(BaseModel):
    question_text: str
    question_type: str
    correct_answer: str
    marks: int
    passage_reference: Optional[str] = None
    options: List[QuestionOptionCreate] = None

class ReadingTestCreate(BaseModel):
    title: str
    passages: List[str]
    questions: List[ReadingQuestionCreate]
    duration: int = 60
    total_marks: float = 40.0

class ListeningQuestionCreate(BaseModel):
    title: str
    audio_url: str
    transcript: Optional[str] = None
    questions: List[QuestionCreate]
    duration: int = 30
    total_marks: float = 40.0

# Add these new models at the top with other BaseModel classes
class SpeakingTopicBase(BaseModel):
    title: str
    description: Optional[str] = None  # Make description optional with default None

class SpeakingQuestionAdd(BaseModel):
    question_text: str
    sample_answer: str
    order_number: int
    part_type: str  # 'part1', 'part2', or 'part3'

class SpeakingTopicCreate(BaseModel):
    title: str
    description: str
    questions: List[str]
    duration: int = 15
    total_marks: float = 40.0

# Add these new models at the top with other BaseModel classes
class WritingTestInit(BaseModel):
    title: str

class WritingTaskCreate(BaseModel):
    part_number: int  # 1 or 2
    task_type: str  # 'essay', 'report', or 'letter'
    instructions: str
    word_limit: int
    total_marks: float = 20.0  # default marks for each part
    duration: int = 60  # default duration in minutes
@router.put("/ielts-exams/{exam_id}/access", response_model=dict)
async def update_exam_access(
    exam_id: int,
    access_data: ExamAccessUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update exam access types"""
    
    # Validate access types
    valid_types = ['no vip', 'vip', 'student']
    for access_type in access_data.access_types:
        if access_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid access type: {access_type}. Must be one of: {', '.join(valid_types)}"
            )
    
    # Check if exam exists
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Delete existing access types
    db.query(ExamAccessType).filter(ExamAccessType.exam_id == exam_id).delete()
    
    # Add new access types
    for access_type in access_data.access_types:
        new_access = ExamAccessType(
            exam_id=exam_id,
            access_type=access_type
        )
        db.add(new_access)
    
    db.commit()
    
    return {
        "message": "Exam access types updated successfully",
        "exam_id": exam_id,
        "access_types": access_data.access_types
    }
@router.get("/ielts-exams/{exam_id}/access", response_model=dict)
async def get_exam_access_types(
    exam_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get current access types for an exam"""
    
    # Check if exam exists
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Get access types
    access_types = db.query(ExamAccessType)\
        .filter(ExamAccessType.exam_id == exam_id)\
        .all()
    
    return {
        "exam_id": exam_id,
        "title": exam.title,
        "access_types": [access.access_type for access in access_types]
    }
@router.post("/initialize-listening-test", response_model=dict)
async def initialize_listening_test(
    test_data: ListeningTestInit,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Check if an exam with the same title already exists
    existing_exam = db.query(Exam).filter(Exam.title == test_data.title).first()
    if existing_exam:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An exam with the title '{test_data.title}' already exists"
        )
    
    new_exam = Exam(
        title=test_data.title,
        created_at=datetime.utcnow(),
        is_active=True,
        created_by=current_admin.user_id
    )
    db.add(new_exam)
    db.flush()

    # Create 4 sections for IELTS listening parts
    for part in range(1, 5):
        listening_section = ExamSection(
            exam_id=new_exam.exam_id,
            section_type='listening',
            duration=test_data.duration // 4,  # Split duration among parts
            total_marks=test_data.total_marks / 4,  # Split marks among parts
            order_number=part
        )
        db.add(listening_section)
    
    db.commit()
    return {
        "message": "Listening test initialized successfully",
        "exam_id": new_exam.exam_id,
        "title": new_exam.title
    }

@router.put("/listening-test/{exam_id}/part/{part_number}", response_model=dict)
async def update_listening_part(
    exam_id: int,
    part_number: int,
    audio_file: UploadFile = File(...),
    transcript: Optional[str] = Form(None),
    questions_json: str = Form(...),
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if not 1 <= part_number <= 4:
        raise HTTPException(status_code=400, detail="Part number must be between 1 and 4")

    try:
        questions_data = json.loads(questions_json)
        if not isinstance(questions_data, list):
            raise HTTPException(status_code=400, detail="Questions data must be an array")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid questions JSON format")

    section = db.query(ExamSection).filter(
        ExamSection.exam_id == exam_id,
        ExamSection.order_number == part_number
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Handle audio file
    audio_content = await audio_file.read()
    audio_filename = audio_file.filename

    # Delete existing media and questions
    db.query(ListeningMedia).filter(ListeningMedia.section_id == section.section_id).delete()
    existing_questions = db.query(Question).filter(Question.section_id == section.section_id).all()
    for q in existing_questions:
        db.query(QuestionOption).filter(QuestionOption.question_id == q.question_id).delete()
    db.query(Question).filter(Question.section_id == section.section_id).delete()

    # Parse transcript to extract question contexts
    soup = BeautifulSoup(transcript, 'html.parser')
    bold_elements = soup.find_all(['strong', 'b'])
    question_contexts = []
    processed_numbers = set()
    
    for bold_elem in bold_elements:
        text = bold_elem.get_text().strip()
        parent = bold_elem.find_parent(['p', 'div', 'td'])
        if parent:
            context = parent.get_text().strip()
            
            if text.isdigit():
                num = int(text)
                processed_numbers.add(num)
                question_contexts.append({
                    'number': num,
                    'context': context,
                    'required_choices': None,
                    
                })
            elif "Choose THREE" in text or "THREE" in text:
                for i in range(3):
                    question_contexts.append({
                        'number': None,
                        'context': context,
                        'required_choices': 3,
                        
                    })
            elif "Choose TWO" in text or "TWO" in text:
                for i in range(2):
                    question_contexts.append({
                        'number': None,
                        'context': context,
                        'required_choices': 2,
                       
                    })


    # Add new listening media
    formatted_transcript = transcript.strip().replace('\r\n', '\n') if transcript else None
    listening_media = ListeningMedia(
        section_id=section.section_id,
        audio_file=audio_content,
        audio_filename=audio_filename,
        transcript=formatted_transcript,
        duration=section.duration
    )
    db.add(listening_media)
    db.flush()

    # Create main text question for the transcript
    main_question = Question(
        section_id=section.section_id,
        question_type='main_text',
        question_text=transcript,
        additional_data={'part_number': part_number}
    )
    db.add(main_question)
    db.flush()

    # Process questions with their contexts
    for q_data, context_data in zip(questions_data, question_contexts):
        question = Question(
            section_id=section.section_id,
            question_type=q_data['question_type'],  # Use the type from frontend
            question_text=context_data['context'],
            correct_answer=q_data['correct_answer'],
            marks=int(q_data['marks']),
            additional_data={
                'question_number': context_data['number'],
                'main_text_id': main_question.question_id,
                'full_context': transcript,
                'required_choices': context_data.get('required_choices'),
            }
        )
        db.add(question)
        db.flush()

        # Handle options if present
        if q_data.get('options'):
            if not isinstance(q_data['options'], list):
                raise HTTPException(status_code=400, detail="Options must be an array")
                
            for opt_data in q_data['options']:
                if not all(field in opt_data for field in ['option_text', 'is_correct']):
                    raise HTTPException(status_code=400, detail="Missing required fields in option data")
                    
                option = QuestionOption(
                    question_id=question.question_id,
                    option_text=opt_data['option_text'].strip(),
                    is_correct=bool(opt_data['is_correct'])
                )
                db.add(option)

    # Check if all parts are completed
    completed_parts = db.query(ListeningMedia).join(ExamSection).filter(
        ExamSection.exam_id == exam_id
    ).count()
    
    if completed_parts == 4:
        exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
        exam.is_active = True
        db.add(exam)

    db.commit()
    
    return {
        "message": f"Part {part_number} updated successfully",
        "section_id": section.section_id,
        "filename": audio_filename,
        "questions_count": len(questions_data),
        "questions_found": len(question_contexts)
    }

@router.post("/initialize-writing-test", response_model=dict)
async def initialize_writing_test(
    test_data: WritingTestInit,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_exam = Exam(
        title=test_data.title,
        created_at=datetime.utcnow(),
        is_active=False,  # Set to True when both parts are added
        created_by=current_admin.user_id
    )
    db.add(new_exam)
    db.flush()

    # Create writing section
    writing_section = ExamSection(
        exam_id=new_exam.exam_id,
        section_type='essay',
        duration=60,  # Default duration
        total_marks=40.0,  # Total marks for writing test
        order_number=1
    )
    db.add(writing_section)
    db.commit()

    return {
        "message": "Writing test initialized successfully",
        "exam_id": new_exam.exam_id,
        "title": new_exam.title
    }

@router.post("/writing-test/{exam_id}/part", response_model=dict)
async def add_writing_task(
    exam_id: int,
    task_data: WritingTaskCreate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if not 1 <= task_data.part_number <= 2:
        raise HTTPException(status_code=400, detail="Part number must be 1 or 2")

    # Verify exam exists and is a writing test
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    section = db.query(ExamSection).filter(
        ExamSection.exam_id == exam_id
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Check if part already exists
    existing_task = db.query(WritingTask).filter(
        WritingTask.test_id == exam_id,
        WritingTask.part_number == task_data.part_number
    ).first()

    if existing_task:
        # Delete existing task if it exists
        db.delete(existing_task)

    # Create new writing task
    writing_task = WritingTask(
        test_id=exam_id,
        part_number=task_data.part_number,
        task_type=task_data.task_type,
        instructions=task_data.instructions,
        word_limit=task_data.word_limit,
        total_marks=task_data.total_marks,
        duration=task_data.duration
    )
    db.add(writing_task)

    # Check if both parts are completed
    db.flush()
    task_count = db.query(WritingTask).filter(
        WritingTask.test_id == exam_id
    ).count()

    if task_count == 2:
        exam.is_active = True
        section.duration = (
            db.query(func.sum(WritingTask.duration))
            .filter(WritingTask.test_id == exam_id)
            .scalar()
        )
        section.total_marks = (
            db.query(func.sum(WritingTask.total_marks))
            .filter(WritingTask.test_id == exam_id)
            .scalar()
        )
        db.add(exam)
        db.add(section)

    db.commit()

    return {
        "message": f"Writing task part {task_data.part_number} added successfully",
        "exam_id": exam_id,
        "part_number": task_data.part_number,
        "is_complete": task_count == 2
    }


@router.post("/speaking/topics", response_model=dict)
async def create_speaking_topic(
    topic_data: SpeakingTopicBase,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    speaking_topic = SpeakingTopic(
        title=topic_data.title,
        description=topic_data.description,  # Will be None if not provided
        is_active=True
    )
    db.add(speaking_topic)
    db.commit()
    db.refresh(speaking_topic)

    return {
        "message": "Speaking topic created successfully",
        "topic_id": speaking_topic.topic_id,
        "title": speaking_topic.title,
        "description": speaking_topic.description
    }

@router.post("/speaking/topics/{topic_id}/questions", response_model=dict)
async def add_question_to_topic(
    topic_id: int,
    question_data: SpeakingQuestionAdd,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Validate part type
    if question_data.part_type not in ['part1', 'part2', 'part3']:
        raise HTTPException(
            status_code=400, 
            detail="Part type must be one of: part1, part2, part3"
        )

    topic = db.query(SpeakingTopic).filter(SpeakingTopic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    speaking_question = SpeakingQuestion(
        topic_id=topic_id,
        question_text=question_data.question_text,
        sample_answer=question_data.sample_answer,
        order_number=question_data.order_number,
        part_type=question_data.part_type
    )
    db.add(speaking_question)
    db.commit()
    db.refresh(speaking_question)

    return {
        "message": "Question added successfully",
        "question_id": speaking_question.question_id,
        "topic_id": topic_id,
        "part_type": speaking_question.part_type
    }

@router.get("/speaking/topics", response_model=List[dict])
async def get_speaking_topics(
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    topics = db.query(SpeakingTopic).all()
    return [{
        "topic_id": topic.topic_id,
        "title": topic.title,
        "description": topic.description,
    } for topic in topics]
@router.get("/dashboard/notifications", response_model=List[dict])
async def get_admin_notifications(
    days: int = 30,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get recent notifications for admin dashboard about student activities"""
    
    # Get read notifications for this admin
    read_notifications = db.query(AdminNotificationRead.notification_id)\
        .filter(AdminNotificationRead.admin_id == current_admin.user_id)\
        .all()
    read_notification_ids = [record[0] for record in read_notifications]
    


    # Get recent transactions
    recent_transactions = db.query(PackageTransaction, User, VIPPackage)\
        .join(User, User.user_id == PackageTransaction.user_id)\
        .join(VIPPackage, VIPPackage.package_id == PackageTransaction.package_id)\
        .filter(
            PackageTransaction.created_at >= datetime.utcnow() - timedelta(days=days),
            PackageTransaction.status == "pending"
        )\
        .order_by(PackageTransaction.created_at.desc())\
        .limit(50)\
        .all()
    
    notifications = []
    
    # Add transaction notifications
    for transaction, user, package in recent_transactions:
        notifications.append({
            "id": f"transaction_{transaction.transaction_id}",
            "type": "vip_transaction",
            "title": f"New VIP Package Purchase",
            "message": f"{user.username} purchased {package.name} (${float(transaction.amount)})",
            "timestamp": transaction.created_at,
            "user_id": user.user_id,
            "transaction_id": transaction.transaction_id,
            "package_id": package.package_id,
            "payment_method": transaction.payment_method,
            "bank_transfer_image": transaction.bank_transfer_image,
            "amount": float(transaction.amount),
            "is_read": f"transaction_{transaction.transaction_id}" in read_notification_ids
        })
    
   
    
    
    # Sort all notifications by timestamp (newest first)
    notifications.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return notifications
@router.post("/notifications/mark-read", response_model=dict)
async def mark_notifications_read(
    data: NotificationMarkRead,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Mark notifications as read by the admin"""
    
    # Create a new AdminNotificationRead record for each notification
    for notification_id in data.notification_ids:
        # Parse the notification ID to get the type and actual ID
        parts = notification_id.split('_')
        if len(parts) != 2:
            continue
            
        notification_type, item_id = parts
        
        # Check if this notification is already marked as read
        existing = db.query(AdminNotificationRead).filter(
            AdminNotificationRead.admin_id == current_admin.user_id,
            AdminNotificationRead.notification_id == notification_id
        ).first()
        
        if not existing:
            # Create a new read record
            read_record = AdminNotificationRead(
                admin_id=current_admin.user_id,
                notification_id=notification_id,
                notification_type=notification_type,
                item_id=item_id,
                read_at=datetime.utcnow()
            )
            db.add(read_record)
    
    db.commit()
    
    return {
        "message": f"Marked {len(data.notification_ids)} notifications as read",
        "notification_ids": data.notification_ids
    }
@router.put("/ielts-exams/{exam_id}/status", response_model=dict)
async def update_exam_status(
    exam_id: int,
    active: bool,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Enable or disable an exam"""
    
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    exam.is_active = active
    db.commit()
    
    return {
        "message": f"Exam {'activated' if active else 'deactivated'} successfully",
        "exam_id": exam.exam_id,
        "title": exam.title,
        "is_active": exam.is_active
    }
@router.get("/ielts-exams", response_model=List[dict])
async def get_ielts_exams(
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    exams = db.query(Exam).all()
    return [{"exam_id": exam.exam_id, "title": exam.title, "created_at": exam.created_at, "is_active": exam.is_active} for exam in exams]

@router.delete("/delete-test/{exam_id}", response_model=dict)
async def delete_test(
    exam_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Test not found")

    # Delete all related records
    
    # First delete exam access types
    db.query(ExamAccessType).filter(ExamAccessType.exam_id == exam_id).delete()
    
    # Delete writing tasks
    db.query(WritingTask).filter(WritingTask.test_id == exam_id).delete()
    
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).all()
    for section in sections:
        # Delete listening media
        db.query(ListeningMedia).filter(ListeningMedia.section_id == section.section_id).delete()
        
        # Delete question options and questions
        questions = db.query(Question).filter(Question.section_id == section.section_id).all()
        for question in questions:
            db.query(QuestionOption).filter(QuestionOption.question_id == question.question_id).delete()
        db.query(Question).filter(Question.section_id == section.section_id).delete()
        
    # Delete sections
    db.query(ExamSection).filter(ExamSection.exam_id == exam_id).delete()
    
    # Delete exam
    db.query(Exam).filter(Exam.exam_id == exam_id).delete()
    
    db.commit()
    
    return {
        "message": "Test deleted successfully",
        "exam_id": exam_id
    }

@router.get("/ielts-exam/{exam_id}", response_model=dict)
async def get_ielts_exam_detail(
    exam_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    sections = []
    for section in exam.exam_sections:
        questions = []
        for question in section.questions:
            options = [{"option_id": opt.option_id, "text": opt.option_text} 
                      for opt in question.options]
            questions.append({
                "question_id": question.question_id,
                "text": question.question_text,
                "type": question.question_type,
                "marks": question.marks,
                "options": options
            })
        
        sections.append({
            "section_id": section.section_id,
            "type": section.section_type,
            "duration": section.duration,
            "total_marks": section.total_marks,
            "questions": questions
        })

    return {
        "exam_id": exam.exam_id,
        "title": exam.title,
        "created_at": exam.created_at,
        "sections": sections
    }

# Add these endpoints after the existing ones

@router.get("/writing", response_model=List[dict])
async def get_writing_tests(
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Get all writing tests with their tasks
    writing_tests = db.query(Exam)\
        .join(ExamSection)\
        .filter(ExamSection.section_type == 'essay')\
        .all()
    
    result = []
    for test in writing_tests:
        tasks = db.query(WritingTask)\
            .filter(WritingTask.test_id == test.exam_id)\
            .order_by(WritingTask.part_number)\
            .all()
            
        # Count total submissions for this test
        submission_count = db.query(func.count(distinct(WritingAnswer.user_id)))\
            .join(WritingTask, WritingTask.task_id == WritingAnswer.task_id)\
            .filter(WritingTask.test_id == test.exam_id)\
            .scalar()
        
        result.append({
            "test_id": test.exam_id,
            "title": test.title,
            "created_at": test.created_at,
            "is_active": test.is_active,
            "total_submissions": submission_count or 0,
            "parts": [{
                "task_id": task.task_id,
                "part_number": task.part_number,
                "task_type": task.task_type,
                "word_limit": task.word_limit,
                "duration": task.duration,
                "total_marks": task.total_marks
            } for task in tasks]
        })
    
    return result

@router.get("/students/writing/{test_id}", response_model=List[dict])
async def get_students_with_writing_submissions(
    test_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Get all students who have submitted answers for this test
    students = db.query(User).join(WritingAnswer)\
        .join(WritingTask, WritingTask.task_id == WritingAnswer.task_id)\
        .filter(WritingTask.test_id == test_id)\
        .distinct().all()
    
    return [{
        "student_id": student.user_id,
        "username": student.username,
        "email": student.email,
        "last_submission": db.query(WritingAnswer.updated_at)\
            .join(WritingTask)\
            .filter(
                WritingTask.test_id == test_id,
                WritingAnswer.user_id == student.user_id
            )\
            .order_by(WritingAnswer.updated_at.desc())\
            .first()[0]
    } for student in students]

@router.get("/students/speaking/{topic_id}", response_model=List[dict])
async def get_students_with_speaking_submissions(
    topic_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Get all students who have submitted answers for this topic
    students = db.query(User).join(SpeakingAnswer)\
        .join(SpeakingQuestion)\
        .filter(SpeakingQuestion.topic_id == topic_id)\
        .distinct().all()
    
    return [{
        "student_id": student.user_id,
        "username": student.username,
        "email": student.email,
        "last_submission": db.query(SpeakingAnswer.updated_at)\
            .join(SpeakingQuestion)\
            .filter(
                SpeakingQuestion.topic_id == topic_id,
                SpeakingAnswer.user_id == student.user_id
            )\
            .order_by(SpeakingAnswer.updated_at.desc())\
            .first()[0]
    } for student in students]

@router.get("/student/{student_id}/writing/{test_id}", response_model=dict)
async def get_student_writing_submission(
    student_id: int,
    test_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Get student info
    student = db.query(User).filter(User.user_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get all tasks and answers for this test
    submissions = db.query(WritingTask, WritingAnswer)\
        .outerjoin(WritingAnswer, and_(
            WritingAnswer.task_id == WritingTask.task_id,
            WritingAnswer.user_id == student_id
        ))\
        .filter(WritingTask.test_id == test_id)\
        .order_by(WritingTask.part_number)\
        .all()

    return {
        "student_id": student.user_id,
        "username": student.username,
        "email": student.email,
        "parts": [{
            "task_id": task.task_id,
            "part_number": task.part_number,
            "task_type": task.task_type,
            "instructions": task.instructions,
            "word_limit": task.word_limit,
            "answer": {
                "answer_text": answer.answer_text if answer else None,
                "score": answer.score if answer else None,
                "submitted_at": answer.created_at if answer else None,
                "last_updated": answer.updated_at if answer else None
            } if answer else None
        } for task, answer in submissions]
    }

@router.get("/student/{student_id}/speaking/{topic_id}", response_model=dict)
async def get_student_speaking_submission(
    student_id: int,
    topic_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Get student info
    student = db.query(User).filter(User.user_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get topic info
    topic = db.query(SpeakingTopic).filter(SpeakingTopic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Get all questions and answers
    submissions = db.query(SpeakingQuestion, SpeakingAnswer)\
        .outerjoin(SpeakingAnswer, and_(
            SpeakingAnswer.question_id == SpeakingQuestion.question_id,
            SpeakingAnswer.user_id == student_id
        ))\
        .filter(SpeakingQuestion.topic_id == topic_id)\
        .order_by(SpeakingQuestion.order_number)\
        .all()

    return {
        "student_id": student.user_id,
        "username": student.username,
        "email": student.email,
        "topic": {
            "topic_id": topic.topic_id,
            "title": topic.title,
            "description": topic.description
        },
        "answers": [{
            "question_id": question.question_id,
            "question_text": question.question_text,
            "order_number": question.order_number,
            "sample_answer": question.sample_answer,
            "student_answer": {
                "answer_text": answer.answer_text if answer else None,
                "submitted_at": answer.created_at if answer else None,
                "last_updated": answer.updated_at if answer else None
            } if answer else None
        } for question, answer in submissions]
    }

# Dashboard endpoints
@router.get("/dashboard/statistics", response_model=dict)
async def get_dashboard_statistics(
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get overall system statistics for the admin dashboard"""
    
    # Count total students
    total_students = db.query(func.count(User.user_id)).filter(User.role == 'student').scalar()
    
    # Count total exams
    total_exams = db.query(func.count(Exam.exam_id)).scalar()
    
    # Count active students (with is_active=True)
    active_students = db.query(func.count(User.user_id))\
        .filter(
            User.role == 'student',
            User.is_active == True
        ).scalar()
    
    # Count total exam attempts
    total_attempts = db.query(func.count(ExamResult.result_id)).scalar()
    
    # Count exams by type
    exam_types = db.query(
        ExamSection.section_type,
        func.count(distinct(Exam.exam_id))
    ).join(Exam).group_by(ExamSection.section_type).all()
    
    # Get recent exam results (last 10)
    recent_results = db.query(ExamResult, User, Exam)\
        .join(User, User.user_id == ExamResult.user_id)\
        .join(Exam, Exam.exam_id == ExamResult.exam_id)\
        .order_by(ExamResult.completion_date.desc())\
        .limit(10)\
        .all()
    
    return {
        "total_students": total_students or 0,
        "total_exams": total_exams or 0,
        "active_students": active_students or 0,
        "total_attempts": total_attempts or 0,
        "exam_types": {
            section_type: count for section_type, count in exam_types
        },
        "recent_results": [{
            "result_id": result.result_id,
            "student_name": user.username,
            "exam_title": exam.title,
            "score": result.total_score,
            "completion_date": result.completion_date
        } for result, user, exam in recent_results]
    }
@router.get("/dashboard/students", response_model=List[dict])
async def get_all_students(
    search: Optional[str] = None,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all students with pagination and search"""
    
    query = db.query(User).filter(User.role == 'student')
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
    
    total = query.count()
    students = query.order_by(User.user_id).all()
    
    return [{
        "user_id": student.user_id,
        "username": student.username,
        "email": student.email,
        "status": getattr(student, 'status', "offline"),
        "is_active": student.is_active,
        "created_at": student.created_at,
        "image_url": student.image_url
    } for student in students]
    
@router.get("/dashboard/student/{student_id}/activity", response_model=dict)
async def get_student_activity(
    student_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed activity for a specific student"""
    
    student = db.query(User).filter(
        User.user_id == student_id,
        User.role == 'student'
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get exam results
    exam_results = db.query(ExamResult, Exam)\
        .join(Exam, Exam.exam_id == ExamResult.exam_id)\
        .filter(ExamResult.user_id == student_id)\
        .order_by(ExamResult.completion_date.desc())\
        .all()
    
    # Get writing submissions
    writing_submissions = db.query(WritingAnswer, WritingTask, Exam)\
        .join(WritingTask, WritingTask.task_id == WritingAnswer.task_id)\
        .join(Exam, Exam.exam_id == WritingTask.test_id)\
        .filter(WritingAnswer.user_id == student_id)\
        .order_by(WritingAnswer.updated_at.desc())\
        .all()
    
    # Get speaking submissions
    speaking_submissions = db.query(SpeakingAnswer, SpeakingQuestion, SpeakingTopic)\
        .join(SpeakingQuestion, SpeakingQuestion.question_id == SpeakingAnswer.question_id)\
        .join(SpeakingTopic, SpeakingTopic.topic_id == SpeakingQuestion.topic_id)\
        .filter(SpeakingAnswer.user_id == student_id)\
        .order_by(SpeakingAnswer.updated_at.desc())\
        .all()
    
    return {
        "student": {
            "user_id": student.user_id,
            "username": student.username,
            "email": student.email,
            "status": getattr(student, 'status', "offline"),
            "is_active": student.is_active,
            "created_at": student.created_at
        },
        "exam_results": [{
            "result_id": result.result_id,
            "exam_title": exam.title,
            "score": result.total_score,
            "completion_date": result.completion_date
        } for result, exam in exam_results],
        "writing_submissions": [{
            "answer_id": answer.answer_id,
            "exam_title": exam.title,
            "part_number": task.part_number,
            "task_type": task.task_type,
            "updated_at": answer.updated_at,
            "score": answer.score
        } for answer, task, exam in writing_submissions],
        "speaking_submissions": [{
            "answer_id": answer.answer_id,
            "topic_title": topic.title,
            "question_text": question.question_text,
            "updated_at": answer.updated_at
        } for answer, question, topic in speaking_submissions]
    }

@router.put("/dashboard/student/{student_id}/status", response_model=dict)
async def update_student_status(
    student_id: int,
    active: bool,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Enable or disable a student account"""
    
    student = db.query(User).filter(
        User.user_id == student_id,
        User.role == 'student'
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student.is_active = active
    db.commit()
    
    return {
        "message": f"Student account {'activated' if active else 'deactivated'} successfully",
        "user_id": student.user_id,
        "is_active": student.is_active
    }

@router.get("/dashboard/exams", response_model=List[dict])
async def get_all_exams(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    exam_type: Optional[str] = None,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all exams with pagination, search and filtering"""
    
    query = db.query(Exam)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(Exam.title.ilike(search_term))
    
    if exam_type:
        query = query.join(ExamSection).filter(ExamSection.section_type == exam_type)
    
    total = query.count()
    exams = query.order_by(Exam.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for exam in exams:
        # Get exam type from sections
        sections = db.query(ExamSection).filter(ExamSection.exam_id == exam.exam_id).all()
        section_types = [section.section_type for section in sections]
        
        # Count attempts
        attempts = db.query(func.count(ExamResult.result_id))\
            .filter(ExamResult.exam_id == exam.exam_id)\
            .scalar()
        
        result.append({
            "exam_id": exam.exam_id,
            "title": exam.title,
            "created_at": exam.created_at,
            "is_active": exam.is_active,
            "section_types": section_types,
            "attempts": attempts or 0
        })
    
    return result

@router.get("/dashboard/system-logs", response_model=List[dict])
async def get_system_logs(
    days: int = 7,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get system activity logs for monitoring"""
    
    # Get recent active users
    recent_active_users = db.query(User)\
        .filter(
            User.is_active == True,
            User.role == 'student'
        )\
        .order_by(User.created_at.desc())\
        .limit(100)\
        .all()
    
    # Get recent exam submissions
    recent_submissions = db.query(ExamResult, User, Exam)\
        .join(User, User.user_id == ExamResult.user_id)\
        .join(Exam, Exam.exam_id == ExamResult.exam_id)\
        .filter(
            ExamResult.completion_date >= datetime.utcnow() - timedelta(days=days)
        )\
        .order_by(ExamResult.completion_date.desc())\
        .limit(100)\
        .all()
    
    logs = []
    
    # Add user logs
    for user in recent_active_users:
        logs.append({
            "timestamp": user.created_at,
            "event_type": "user_created",
            "user_id": user.user_id,
            "username": user.username,
            "details": f"User account created"
        })
    
    # Add submission logs
    for result, user, exam in recent_submissions:
        logs.append({
            "timestamp": result.completion_date,
            "event_type": "exam_submission",
            "user_id": user.user_id,
            "username": user.username,
            "details": f"Completed exam: {exam.title} with score: {result.total_score}"
        })
    
    # Sort logs by timestamp
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return logs