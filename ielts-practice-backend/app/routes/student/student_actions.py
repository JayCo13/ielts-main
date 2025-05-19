from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session, joinedload  # Add joinedload here
from typing import Optional
from app.database import get_db
from app.models.models import User, ExamResult, Exam, ExamSection, Question, QuestionOption, ReadingPassage, ListeningMedia, WritingTask, SpeakingTopic, SpeakingQuestion, SpeakingAnswer, StudentAnswer, WritingAnswer, ListeningAnswer
from app.routes.admin.auth import get_current_student, check_exam_access
from typing import List, Dict
from bs4 import BeautifulSoup
from fastapi.responses import StreamingResponse
from mutagen.mp3 import MP3
import io
import os
from sqlalchemy import and_, or_
from uuid import uuid4
from pydantic import BaseModel
from app.utils.datetime_utils import get_vietnam_time, convert_to_vietnam_time
from datetime import datetime, timedelta

router = APIRouter()


UPLOAD_DIR = "static/student_images"


class UpdateProfileRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None

class ExamResultResponse(BaseModel):
    exam_id: int
    exam_title: str
    total_score: float
    completion_date: datetime
    section_scores: dict

class WritingAnswerSubmit(BaseModel):
    answer_text: str
class WritingTestSubmit(BaseModel):
    part1_answer: str
    part2_answer: str


@router.get("/profile", response_model=dict)
async def get_student_profile(
    request: Request,
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    image_url = f"{request.base_url}{current_student.image_url}" if current_student.image_url else None
    
    return {
        "user_id": current_student.user_id,
        "username": current_student.username,
        "email": current_student.email,
        "image_url": image_url
    }
@router.get("/exam/{exam_id}/audio")
async def stream_audio(exam_id: int, db: Session = Depends(get_db)):
    # Get the audio file through relationships
    listening_media = (
        db.query(ListeningMedia)
        .join(ExamSection)
        .join(Exam)
        .filter(Exam.exam_id == exam_id)
        .first()
    )
    
    if not listening_media:
        raise HTTPException(status_code=404, detail="Audio file not found")
        
    return StreamingResponse(
        io.BytesIO(listening_media.audio_file),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": f"attachment; filename=exam_{exam_id}.mp3",
            "Accept-Ranges": "bytes"
        }
    )
@router.get("/my-test-statistics", response_model=Dict)
async def get_student_test_statistics(
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all exam results for the current student
    exam_results = db.query(ExamResult).filter(
        ExamResult.user_id == current_student.user_id
    ).order_by(ExamResult.completion_date.desc()).all()
    
    # Get latest test if available
    latest_test = None
    if exam_results:
        latest_result = exam_results[0]
        latest_test = {
            "result_id": latest_result.result_id,
            "exam_id": latest_result.exam_id,
            "exam_title": latest_result.exam.title,
            "total_score": latest_result.total_score,
            "completion_date": latest_result.completion_date,
            "section_scores": latest_result.section_scores
        }
    
    # Calculate statistics for listening exams
    listening_exams = []
    listening_accuracy = 0
    listening_avg_score = 0
    listening_total_questions = 0
    listening_correct_answers = 0
    
    for result in exam_results:
        # Check if this is a listening exam
        exam_sections = db.query(ExamSection).filter(
            ExamSection.exam_id == result.exam_id
        ).all()
        
        is_listening_exam = any(section.section_type == 'listening' for section in exam_sections)
        
        if is_listening_exam:
            # Get answers for this exam
            answers = db.query(ListeningAnswer).filter(
                ListeningAnswer.exam_id == result.exam_id,
                ListeningAnswer.user_id == current_student.user_id
            ).all()
            
            # Calculate accuracy for this exam
            correct_count = sum(1 for answer in answers if answer.score > 0)
            total_questions = len(answers)
            
            if total_questions > 0:
                exam_accuracy = (correct_count / total_questions) * 100
            else:
                exam_accuracy = 0
                
            listening_exams.append({
                "result_id": result.result_id,
                "exam_id": result.exam_id,
                "exam_title": result.exam.title,
                "total_score": result.total_score,
                "accuracy": exam_accuracy,
                "completion_date": result.completion_date
            })
            
            # Accumulate for overall statistics
            listening_total_questions += total_questions
            listening_correct_answers += correct_count
    
    # Calculate overall listening statistics
    if listening_total_questions > 0:
        listening_accuracy = (listening_correct_answers / listening_total_questions) * 100
        listening_avg_score = sum(exam["total_score"] for exam in listening_exams) / len(listening_exams)
    
    # Get writing test statistics
    writing_tests = []
    writing_tasks_completed = 0
    
    # Fix: Get distinct test_ids first instead of using GROUP BY
    test_ids = db.query(WritingTask.test_id).distinct().all()
    test_ids = [test_id[0] for test_id in test_ids]
    
    for test_id in test_ids:
        # Get all tasks for this test
        tasks = db.query(WritingTask).filter(
            WritingTask.test_id == test_id
        ).all()
        
        # Get answers for these tasks
        task_ids = [task.task_id for task in tasks]
        answers = db.query(WritingAnswer).filter(
            WritingAnswer.task_id.in_(task_ids),
            WritingAnswer.user_id == current_student.user_id
        ).all()
        
        if answers:
            # This test has been attempted
            test = db.query(Exam).filter(Exam.exam_id == test_id).first()
            
            writing_tests.append({
                "test_id": test_id,
                "title": test.title,
                "parts_completed": len(answers),
                "total_parts": len(tasks),
                "is_completed": len(answers) == len(tasks),
                "latest_update": max(answer.updated_at for answer in answers)
            })
            
            writing_tasks_completed += len(answers)
    
    return {
        "total_exams_completed": len(exam_results),
        "latest_test": latest_test,
        "listening_statistics": {
            "exams_completed": len(listening_exams),
            "average_accuracy": round(listening_accuracy, 2),
            "average_score": round(listening_avg_score, 2) if listening_exams else 0,
            "exams": listening_exams
        },
        "writing_statistics": {
            "tests_attempted": len(writing_tests),
            "tasks_completed": writing_tasks_completed,
            "tests": writing_tests
        }
    }
@router.put("/profile", response_model=dict)
async def update_student_profile(
    email: str = Form(None),
    username: str = Form(None),
    image: UploadFile = File(None),
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    if email:
        current_student.email = email
    
    if username:
        current_student.username = username
    
    if image:
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"{uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        
        current_student.image_url = file_path

    db.commit()
    db.refresh(current_student)
    
    return {
        "message": "Profile updated successfully",
        "email": current_student.email,
        "username": current_student.username,
        "image_url": current_student.image_url
    }
    
@router.get("/available-listening-exams", response_model=List[dict])
async def get_available_listening_exams(
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Query exams that have listening sections
    query = db.query(Exam).join(ExamSection)\
        .filter(
            Exam.is_active == True,
            ExamSection.section_type == 'listening'
        )
    
    exams = query.distinct().all()
    
    exam_details = []
    for exam in exams:
        # Check access permission
        has_access = await check_exam_access(current_student, exam.exam_id, db)
        if not has_access:
            continue
            
        listening_section = db.query(ExamSection).filter(
            ExamSection.exam_id == exam.exam_id,
            ExamSection.section_type == 'listening'
        ).first()
        
        listening_answers = db.query(ListeningAnswer).filter(
            ListeningAnswer.exam_id == exam.exam_id,
            ListeningAnswer.user_id == current_student.user_id
        ).first()
        
        if listening_section:
            exam_details.append({
                "exam_id": exam.exam_id,
                "title": exam.title,
                "created_at": exam.created_at,
                "duration": listening_section.duration,
                "total_marks": listening_section.total_marks,
                "is_completed": bool(listening_answers)
            })
    
    return exam_details
@router.delete("/listening/exam/{exam_id}/retake", response_model=dict)
async def retake_listening_exam(
    exam_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Verify exam exists
    exam = db.query(Exam).filter(
        Exam.exam_id == exam_id,
        Exam.is_active == True
    ).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found or not active"
        )
    
    # Delete all previous answers for this exam from the current student
    deleted_count = db.query(ListeningAnswer).filter(
        ListeningAnswer.exam_id == exam_id,
        ListeningAnswer.user_id == current_student.user_id
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {
        "message": "Listening exam reset successfully. You can now retake the exam.",
        "exam_id": exam_id,
        "answers_deleted": deleted_count
    }
@router.get("/exam/{exam_id}/audio-lengths", response_model=Dict)
async def get_audio_file_lengths(
    exam_id: int,
    db: Session = Depends(get_db)
):
    # Get all audio files for this exam through listening media
    listening_media = db.query(ListeningMedia)\
        .join(ExamSection)\
        .filter(ExamSection.exam_id == exam_id)\
        .all()
    
    if not listening_media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No audio files found for this exam"
        )
    
    part_lengths = []
    total_length = 0
    
    for i, media in enumerate(listening_media):
        if media.audio_file:
            # Create a BytesIO object from the audio data
            audio_data = io.BytesIO(media.audio_file)
            # Load the MP3 file and get its length
            try:
                audio = MP3(audio_data)
                length = int(audio.info.length)  # Length in seconds
                total_length += length
                part_lengths.append({
                    "part_number": i + 1,
                    "length": length,
                    "length_formatted": f"{length // 60}:{length % 60:02d}"  # MM:SS format
                })
            except Exception as e:
                part_lengths.append({
                    "part_number": i + 1,
                    "length": 0,
                    "length_formatted": "00:00",
                    "error": str(e)
                })
    
    return {
        "exam_id": exam_id,
        "total_length": total_length,
        "total_length_formatted": f"{total_length // 60}:{total_length % 60:02d}",
        "part_lengths": part_lengths,
        "parts_count": len(listening_media)
    }
@router.put("/status/update", response_model=dict)
async def update_student_status(
    status: str,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Update the online/offline status of the current student
    Status should be either 'online' or 'offline'
    """
    if status not in ['online', 'offline']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'online' or 'offline'"
        )
    
    # Update the status in the database
    current_student.status = status
    current_student.last_active = datetime.utcnow()
    db.commit()
    
    return {
        "message": f"Status updated to {status}",
        "user_id": current_student.user_id,
        "status": status,
        "last_active": current_student.last_active
    }
def calculate_band_score(total_score: float) -> float:
    # IELTS band score calculation logic
    # This is a simplified version - adjust according to actual IELTS scoring rules
    band_score = (total_score / 40) * 9
    return round(band_score * 2) / 2  # Rounds to nearest 0.5

@router.get("/exam/{exam_id}/start", response_model=Dict)
async def start_exam(
    exam_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(
        Exam.exam_id == exam_id,
        Exam.is_active == True
    ).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found or not active"
        )

    sections = []
    exam_sections = db.query(ExamSection).filter(
        ExamSection.exam_id == exam_id
    ).order_by(ExamSection.order_number).all()

    for section in exam_sections:
        section_data = {
            "section_id": section.section_id,
            "section_type": section.section_type,
            "duration": section.duration,
            "total_marks": float(section.total_marks),
            "order_number": section.order_number,
            "questions": []
        }

        if section.section_type == 'reading':
            passages = db.query(ReadingPassage).filter(
                ReadingPassage.section_id == section.section_id
            ).all()
            section_data["passages"] = [
                {
                    "passage_id": p.passage_id,
                    "title": p.title.strip(),
                    "content": p.content.strip(),
                    "word_count": p.word_count
                } for p in passages
            ]

        elif section.section_type == 'listening':
            media = db.query(ListeningMedia).filter(
                ListeningMedia.section_id == section.section_id
            ).first()
            if media:
                section_data["media"] = {
                    "media_id": media.media_id,
                    "audio_filename": media.audio_filename,
                    "transcript": media.transcript.strip() if media.transcript else None,
                    "duration": media.duration
                }

        questions = db.query(Question).filter(
            Question.section_id == section.section_id
        ).order_by(Question.question_id).all()

        for question in questions:
            question_data = {
                "question_id": question.question_id,
                "question_text": question.question_text.strip(),
                "question_type": question.question_type.strip(),
                "marks": int(question.marks) if question.marks is not None else 0,
                "options": []
            }

            options = db.query(QuestionOption).filter(
                QuestionOption.question_id == question.question_id
            ).order_by(QuestionOption.option_id).all()
            
            question_data["options"] = [
                {
                    "option_id": opt.option_id,
                    "option_text": opt.option_text.strip()
                } for opt in options
            ]

            section_data["questions"].append(question_data)

        sections.append(section_data)

    return {
        "exam_id": exam.exam_id,
        "title": exam.title.strip(),
        "start_time": datetime.utcnow(),
        "sections": sections
    }


@router.post("/exam/{exam_id}/submit", response_model=Dict)
async def submit_exam_answers(
    exam_id: int,
    answers: Dict[str, str],
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Verify exam exists
    exam = db.query(Exam).filter(
        Exam.exam_id == exam_id,
        Exam.is_active == True
    ).first()
    
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found or not active"
        )

    # Get exam sections to determine the type
    exam_sections = db.query(ExamSection).filter(
        ExamSection.exam_id == exam_id
    ).all()
    
    # Check if this is a listening exam
    is_listening_exam = any(section.section_type == 'listening' for section in exam_sections)

    # Create exam result record
    exam_result = ExamResult(
        user_id=current_student.user_id,
        exam_id=exam_id,
        completion_date=datetime.utcnow(),
        section_scores={}
    )
    db.add(exam_result)
    db.flush()

    total_score = 0
    section_scores = {}

    # Process each answer
    for question_id, student_answer in answers.items():
        question = db.query(Question).filter(
            Question.question_id == int(question_id)
        ).first()
        
        if question:
            # Normalize student answer to lowercase
            normalized_student_answer = student_answer.lower().strip() if student_answer else ""
            
            # Check if correct answer has multiple options (separated by "or")
            correct_answers = [ans.lower().strip() for ans in question.correct_answer.split(" or ")] if question.correct_answer else []
            
            # Calculate score for this question - correct if student's answer matches any of the correct options
            is_correct = normalized_student_answer in correct_answers
            score = question.marks if is_correct else 0
            total_score += score

            # Store the answer based on exam type
            if is_listening_exam:
                # Save to ListeningAnswer for listening exams
                answer_record = ListeningAnswer(
                    user_id=current_student.user_id,
                    exam_id=exam_id,
                    question_id=question.question_id,
                    student_answer=student_answer,
                    score=score,
                    created_at=datetime.utcnow()
                )
            else:
                # Use StudentAnswer for other exam types
                answer_record = StudentAnswer(
                    result_id=exam_result.result_id,
                    question_id=question.question_id,
                    student_answer=student_answer,
                    score=score
                )
            
            db.add(answer_record)

            # Aggregate section scores
            section_id = question.section_id
            if section_id not in section_scores:
                section_scores[section_id] = {"earned": 0, "total": 0}
            section_scores[section_id]["earned"] += score
            section_scores[section_id]["total"] += question.marks

    # Update exam result with total score and section scores
    exam_result.total_score = total_score
    exam_result.section_scores = section_scores
    db.commit()

    return {
        "result_id": exam_result.result_id,
        "total_score": total_score,
        "section_scores": section_scores,
        "completion_date": exam_result.completion_date
    }

@router.get("/exam-result/{result_id}", response_model=Dict)
async def get_exam_result_details(
    result_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get exam result with validation
    exam_result = db.query(ExamResult).filter(
        ExamResult.result_id == result_id,
        ExamResult.user_id == current_student.user_id
    ).first()
    
    if not exam_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam result not found"
        )

    # Get exam sections to determine the type
    exam_sections = db.query(ExamSection).filter(
        ExamSection.exam_id == exam_result.exam_id
    ).all()
    
    # Check if this is a listening exam
    is_listening_exam = any(section.section_type == 'listening' for section in exam_sections)

    detailed_answers = []
    
    if is_listening_exam:
        # Get detailed answers from ListeningAnswer table for listening exams
        listening_answers = db.query(ListeningAnswer).filter(
            ListeningAnswer.exam_id == exam_result.exam_id,
            ListeningAnswer.user_id == current_student.user_id
        ).all()
        
        for answer in listening_answers:
            question = answer.question
            detailed_answers.append({
                "question_id": question.question_id,
                "question_text": question.question_text,
                "student_answer": answer.student_answer,
                "correct_answer": question.correct_answer,
                "score": answer.score,
                "max_marks": question.marks
            })
    else:
        # Get detailed answers from StudentAnswer table for other exam types
        student_answers = db.query(StudentAnswer).filter(
            StudentAnswer.result_id == result_id
        ).all()
        
        for answer in student_answers:
            question = answer.question
            detailed_answers.append({
                "question_id": question.question_id,
                "question_text": question.question_text,
                "student_answer": answer.student_answer,
                "correct_answer": question.correct_answer,
                "score": answer.score,
                "max_marks": question.marks
            })

    return {
        "exam_id": exam_result.exam_id,
        "completion_date": exam_result.completion_date,
        "total_score": exam_result.total_score,
        "section_scores": exam_result.section_scores,
        "detailed_answers": detailed_answers
    }
@router.get("/my-exam-history", response_model=List[dict])
async def get_student_exam_history(
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    exam_results = db.query(ExamResult).filter(
        ExamResult.user_id == current_student.user_id
    ).order_by(ExamResult.completion_date.desc()).all()
    
    return [{
        "result_id": result.result_id,
        "exam_id": result.exam_id,
        "exam_title": result.exam.title,
        "total_score": result.total_score,
        "completion_date": result.completion_date,
        "section_scores": result.section_scores
    } for result in exam_results]

@router.get("/my-exam-result/{result_id}", response_model=Dict)
async def get_student_exam_detail(
    result_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    exam_result = db.query(ExamResult).filter(
        ExamResult.result_id == result_id,
        ExamResult.user_id == current_student.user_id
    ).first()
    
    if not exam_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam result not found"
        )

    answers = db.query(StudentAnswer).filter(
        StudentAnswer.result_id == result_id
    ).all()

    sections = {}
    for answer in answers:
        question = answer.question
        section = question.section
        
        if section.section_id not in sections:
            sections[section.section_id] = {
                "section_type": section.section_type,
                "duration": section.duration,
                "total_marks": section.total_marks,
                "answers": []
            }
            
        sections[section.section_id]["answers"].append({
            "question_id": question.question_id,
            "question_text": question.question_text,
            "student_answer": answer.student_answer,
            "correct_answer": question.correct_answer,
            "score": answer.score,
            "max_marks": question.marks
        })

    return {
        "exam_id": exam_result.exam_id,
        "exam_title": exam_result.exam.title,
        "completion_date": exam_result.completion_date,
        "total_score": exam_result.total_score,
        "section_scores": exam_result.section_scores,
        "sections": sections
    }
@router.get("/speaking/topics", response_model=List[dict])
async def get_speaking_topics_for_student(
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    topics = db.query(SpeakingTopic)\
        .options(joinedload(SpeakingTopic.speaking_questions))\
        .all()
    
    return [{
        "topic_id": topic.topic_id,
        "title": topic.title,
        "description": topic.description,
        "created_at": topic.created_at,
        "speaking_questions": [
            {
                "question_id": q.question_id,
                "question_text": q.question_text,
                "order_number": q.order_number
            } for q in topic.speaking_questions
        ]
    } for topic in topics]
    
@router.get("/speaking/topics/{topic_id}", response_model=dict)
async def get_speaking_topic_detail(
    topic_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    topic = db.query(SpeakingTopic).filter(
        SpeakingTopic.topic_id == topic_id,
    ).first()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaking topic not found"
        )

    questions = db.query(SpeakingQuestion).filter(
        SpeakingQuestion.topic_id == topic_id
    ).order_by(SpeakingQuestion.order_number).all()

    # Convert SQLAlchemy objects to dictionaries to avoid serialization issues
    return {
        "topic_id": int(topic.topic_id),
        "title": str(topic.title) if topic.title else "",
        "description": str(topic.description) if topic.description else "",
        "questions": [{
            "question_id": int(q.question_id),
            "question_text": str(q.question_text) if q.question_text else "",
            "sample_answer": str(q.sample_answer) if q.sample_answer else "",
            "order_number": int(q.order_number) if q.order_number else 0,
            # Extract the actual enum value from the SQLAlchemy Column object
            "part_type": str(q.part_type.value) if hasattr(q.part_type, 'value') else 
                        (str(q.part_type) if q.part_type else "")
        } for q in questions]
    }
class SpeakingAnswerSubmit(BaseModel):
    answer_text: str

@router.post("/speaking/answers/{question_id}", response_model=dict)  # Changed from PUT to POST
async def submit_speaking_answer(
    question_id: int,
    answer_data: SpeakingAnswerSubmit,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    question = db.query(SpeakingQuestion).filter(
        SpeakingQuestion.question_id == question_id
    ).first()
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaking question not found"
        )

    # Check if answer already exists
    speaking_answer = db.query(SpeakingAnswer).filter(
        SpeakingAnswer.question_id == question_id,
        SpeakingAnswer.user_id == current_student.user_id
    ).first()

    if speaking_answer:
        # Update existing answer
        speaking_answer.answer_text = answer_data.answer_text
        speaking_answer.updated_at = datetime.utcnow()
    else:
        # Create new answer
        speaking_answer = SpeakingAnswer(
            question_id=question_id,
            user_id=current_student.user_id,
            answer_text=answer_data.answer_text,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(speaking_answer)

    db.commit()

    return {
        "message": "Speaking answer submitted successfully",
        "question_id": question_id,
        "user_id": current_student.user_id,
        "answer_text": answer_data.answer_text
    }
@router.get("/speaking/my-answers", response_model=List[dict])
async def get_student_speaking_answers(
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Query both SpeakingQuestion and SpeakingAnswer together
    answers = db.query(SpeakingQuestion, SpeakingAnswer)\
        .join(SpeakingAnswer, SpeakingQuestion.question_id == SpeakingAnswer.question_id)\
        .filter(SpeakingAnswer.user_id == current_student.user_id)\
        .all()
    
    return [{
        "question_id": question.question_id,
        "topic_id": question.topic_id,
        "question_text": question.question_text,
        "answer_text": answer.answer_text,
        "order_number": question.order_number
    } for question, answer in answers]
    
@router.get("/writing/tasks", response_model=List[dict])
async def get_writing_tasks(
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all writing tasks and join with Exam table
    tasks = db.query(WritingTask, Exam.title, Exam.created_at).join(
        Exam, WritingTask.test_id == Exam.exam_id
    ).order_by(WritingTask.test_id, WritingTask.part_number).all()
    
    # Group tasks by test_id
    grouped_tasks = {}
    for task, exam_title, created_at in tasks:
        if task.test_id not in grouped_tasks:
            # Get answers for this test
            answers = db.query(WritingAnswer).filter(
                WritingAnswer.task_id == task.task_id,
                WritingAnswer.user_id == current_student.user_id
            ).all()
            
            grouped_tasks[task.test_id] = {
                "test_id": task.test_id,
                "title": exam_title,
                "created_at": created_at,  # Add created_at from Exam table
                "is_completed": bool(answers),
                "parts": []
            }
        grouped_tasks[task.test_id]["parts"].append({
            "task_id": task.task_id,
            "part_number": task.part_number,
            "task_type": task.task_type,
            "instructions": task.instructions,
            "word_limit": task.word_limit,
            "total_marks": task.total_marks,
            "duration": task.duration
        })
    
    return list(grouped_tasks.values())

@router.get("/writing/tasks/{task_id}", response_model=dict)
async def get_writing_task_detail(
    task_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    task = db.query(WritingTask).filter(
        WritingTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing task not found"
        )
    
    # Get student's previous answer if exists using WritingAnswer
    previous_answer = db.query(WritingAnswer).filter(
        WritingAnswer.task_id == task_id,
        WritingAnswer.user_id == current_student.user_id
    ).first()

    return {
        "task_id": task.task_id,
        "part_number": task.part_number,
        "task_type": task.task_type,
        "instructions": task.instructions,
        "word_limit": task.word_limit,
        "total_marks": task.total_marks,
        "duration": task.duration,
        "previous_answer": {
            "answer_text": previous_answer.answer_text,
            "score": previous_answer.score,
            "created_at": previous_answer.created_at,
            "updated_at": previous_answer.updated_at
        } if previous_answer else None
    }

# Add this new endpoint to get all writing answers for a test
@router.get("/writing/test/{test_id}/answers", response_model=dict)
async def get_writing_test_answers(
    test_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all tasks and answers for this test
    answers = db.query(WritingTask, WritingAnswer)\
        .outerjoin(WritingAnswer, and_(
            WritingAnswer.task_id == WritingTask.task_id,
            WritingAnswer.user_id == current_student.user_id
        ))\
        .filter(WritingTask.test_id == test_id)\
        .order_by(WritingTask.part_number)\
        .all()
    
    if not answers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No writing tasks found for this test"
        )
    
    return {
        "test_id": test_id,
        "parts": [{
            "task_id": task.task_id,
            "part_number": task.part_number,
            "task_type": task.task_type,
            "instructions": task.instructions,
            "word_limit": task.word_limit,
            "answer": {
                "answer_text": answer.answer_text if answer else None,
                "score": answer.score if answer else None,
                "created_at": answer.created_at if answer else None,
                "updated_at": answer.updated_at if answer else None
            }
        } for task, answer in answers]
    }
@router.post("/writing/test/{test_id}/submit", response_model=dict)
async def submit_complete_writing_test(
    test_id: int,
    answers: WritingTestSubmit,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get both tasks for this test
    tasks = db.query(WritingTask).filter(
        WritingTask.test_id == test_id
    ).order_by(WritingTask.part_number).all()
    
    if len(tasks) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Writing test must have exactly two parts"
        )

    # Process both parts
    submissions = []
    for task in tasks:
        answer_text = answers.part1_answer if task.part_number == 1 else answers.part2_answer
        
        # Create or update answer
        writing_answer = db.query(WritingAnswer).filter(
            WritingAnswer.task_id == task.task_id,
            WritingAnswer.user_id == current_student.user_id
        ).first()

        if writing_answer:
            writing_answer.answer_text = answer_text
            writing_answer.updated_at = datetime.utcnow()
        else:
            writing_answer = WritingAnswer(
                task_id=task.task_id,
                user_id=current_student.user_id,
                answer_text=answer_text,
                score=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(writing_answer)
        
        submissions.append({
            "part_number": task.part_number,
            "word_count": len(answer_text.split()),
            "task_type": task.task_type
        })

    db.commit()

    return {
        "message": "Writing test submitted successfully",
        "test_id": test_id,
        "submissions": submissions
    }
@router.post("/writing/tasks/{task_id}/save-draft", response_model=dict)
async def submit_writing_answer(
    task_id: int,
    answer_data: WritingAnswerSubmit,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    task = db.query(WritingTask).filter(
        WritingTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing task not found"
        )

    # Save current answer
    writing_answer = db.query(WritingAnswer).filter(
        WritingAnswer.task_id == task_id,
        WritingAnswer.user_id == current_student.user_id
    ).first()

    if writing_answer:
        writing_answer.answer_text = answer_data.answer_text
        writing_answer.updated_at = datetime.utcnow()
    else:
        writing_answer = WritingAnswer(
            task_id=task_id,
            user_id=current_student.user_id,
            answer_text=answer_data.answer_text,
            score=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(writing_answer)
        db.flush()

    # Get other part's status
    other_part = db.query(WritingTask, WritingAnswer).outerjoin(
        WritingAnswer,
        and_(
            WritingAnswer.task_id == WritingTask.task_id,
            WritingAnswer.user_id == current_student.user_id
        )
    ).filter(
        WritingTask.test_id == task.test_id,
        WritingTask.task_id != task_id
    ).first()

    db.commit()

    return {
        "message": "Writing answer submitted successfully",
        "task_id": task_id,
        "part_number": task.part_number,
        "word_count": len(answer_data.answer_text.split()),
        "answer_text": writing_answer.answer_text,
        "other_part": {
            "task_id": other_part[0].task_id if other_part else None,
            "part_number": other_part[0].part_number if other_part else None,
            "submitted": bool(other_part[1]) if other_part else False
        } if other_part else None
    }
@router.get("/writing/test/{test_id}/answers", response_model=dict)
async def get_writing_test_answers(
    test_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all tasks and answers for this test
    answers = db.query(WritingTask, WritingAnswer)\
        .outerjoin(WritingAnswer, and_(
            WritingAnswer.task_id == WritingTask.task_id,
            WritingAnswer.user_id == current_student.user_id
        ))\
        .filter(WritingTask.test_id == test_id)\
        .order_by(WritingTask.part_number)\
        .all()
    
    if not answers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No writing tasks found for this test"
        )
    
    # Check if all parts are submitted
    total_tasks = len(answers)
    submitted_answers = sum(1 for _, answer in answers if answer is not None)
    is_completed = total_tasks == submitted_answers
    
    return {
        "test_id": test_id,
        "is_completed": is_completed,  # This is calculated on-the-fly
        "total_parts": total_tasks,
        "submitted_parts": submitted_answers,
        "parts": [...]
    }
@router.get("/writing/test/{test_id}/parts", response_model=List[dict])
async def get_writing_test_parts(
    test_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all tasks for this test
    tasks = db.query(WritingTask).filter(
        WritingTask.test_id == test_id
    ).order_by(WritingTask.part_number).all()
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No writing tasks found for this test"
        )
    
    return [{
        "task_id": task.task_id,
        "part_number": task.part_number,
        "task_type": task.task_type,
        "duration": task.duration,
        "word_limit": task.word_limit
    } for task in tasks]
@router.delete("/writing/test/{test_id}/reset", response_model=dict)
async def reset_writing_test(
    test_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all tasks for this test
    tasks = db.query(WritingTask).filter(
        WritingTask.test_id == test_id
    ).all()
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No writing tasks found for this test"
        )

    # Get all answers for this test's tasks from the current student
    task_ids = [task.task_id for task in tasks]
    deleted_count = db.query(WritingAnswer).filter(
        WritingAnswer.task_id.in_(task_ids),
        WritingAnswer.user_id == current_student.user_id
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "message": "Writing test answers reset successfully",
        "test_id": test_id,
        "answers_deleted": deleted_count
    }
# Add this new endpoint
@router.get("/writing/part/{task_id}/essay", response_model=dict)
async def get_writing_part_essay(
    task_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get the task and its associated test
    task = db.query(WritingTask).filter(
        WritingTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing task not found"
        )

    # Get the student's answer for this task
    answer = db.query(WritingAnswer).filter(
        WritingAnswer.task_id == task_id,
        WritingAnswer.user_id == current_student.user_id
    ).first()

    # Get the test title
    test = db.query(Exam).filter(
        Exam.exam_id == task.test_id
    ).first()

    return {
        "test_id": task.test_id,
        "test_title": test.title if test else None,
        "task_id": task.task_id,
        "part_number": task.part_number,
        "task_type": task.task_type,
        "instructions": task.instructions,
        "word_limit": task.word_limit,
        "essay": {
            "answer_text": answer.answer_text if answer else None,
            "score": answer.score if answer else None,
            "created_at": answer.created_at if answer else None,
            "updated_at": answer.updated_at if answer else None
        } if answer else None
    }

# Add this new endpoint for editing
@router.put("/writing/part/{task_id}/essay", response_model=dict)
async def update_writing_part_essay(
    task_id: int,
    answer_data: WritingAnswerSubmit,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    task = db.query(WritingTask).filter(
        WritingTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing task not found"
        )

    # Get or create answer
    writing_answer = db.query(WritingAnswer).filter(
        WritingAnswer.task_id == task_id,
        WritingAnswer.user_id == current_student.user_id
    ).first()

    if writing_answer:
        writing_answer.answer_text = answer_data.answer_text
        writing_answer.updated_at = datetime.utcnow()
    else:
        writing_answer = WritingAnswer(
            task_id=task_id,
            user_id=current_student.user_id,
            answer_text=answer_data.answer_text,
            score=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(writing_answer)

    db.commit()

    return {
        "message": "Essay updated successfully",
        "task_id": task_id,
        "part_number": task.part_number,
        "word_count": len(answer_data.answer_text.split()),
        "answer_text": writing_answer.answer_text,
        "updated_at": writing_answer.updated_at
    }
@router.get("/writing/test/{test_id}/answers", response_model=dict)
async def get_writing_test_answers(
    test_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all tasks and answers for this test
    answers = db.query(WritingTask, WritingAnswer)\
        .outerjoin(WritingAnswer, and_(
            WritingAnswer.task_id == WritingTask.task_id,
            WritingAnswer.user_id == current_student.user_id
        ))\
        .filter(WritingTask.test_id == test_id)\
        .order_by(WritingTask.part_number)\
        .all()
    
    if not answers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No writing tasks found for this test"
        )
    
    return {
        "test_id": test_id,
        "parts": [{
            "task_id": task.task_id,
            "part_number": task.part_number,
            "task_type": task.task_type,
            "instructions": task.instructions,
            "word_limit": task.word_limit,
            "answer": {
                "answer_text": answer.answer_text if answer else None,
                "score": answer.score if answer else None,
                "created_at": answer.created_at if answer else None,
                "updated_at": answer.updated_at if answer else None
            }
        } for task, answer in answers]
    }
@router.post("/writing/tasks/{task_id}/submit", response_model=dict)
async def submit_writing_answer(
    task_id: int,
    answer_data: WritingAnswerSubmit,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    task = db.query(WritingTask).filter(
        WritingTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing task not found"
        )

    # Save current answer
    writing_answer = db.query(WritingAnswer).filter(
        WritingAnswer.task_id == task_id,
        WritingAnswer.user_id == current_student.user_id
    ).first()

    if writing_answer:
        writing_answer.answer_text = answer_data.answer_text
        writing_answer.updated_at = datetime.utcnow()
    else:
        writing_answer = WritingAnswer(
            task_id=task_id,
            user_id=current_student.user_id,
            answer_text=answer_data.answer_text,
            score=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(writing_answer)
        db.flush()

    # Get other part's status
    other_part = db.query(WritingTask, WritingAnswer).outerjoin(
        WritingAnswer,
        and_(
            WritingAnswer.task_id == WritingTask.task_id,
            WritingAnswer.user_id == current_student.user_id
        )
    ).filter(
        WritingTask.test_id == task.test_id,
        WritingTask.task_id != task_id
    ).first()

    db.commit()

    return {
        "message": "Writing answer submitted successfully",
        "task_id": task_id,
        "part_number": task.part_number,
        "word_count": len(answer_data.answer_text.split()),
        "answer_text": writing_answer.answer_text,
        "other_part": {
            "task_id": other_part[0].task_id if other_part else None,
            "part_number": other_part[0].part_number if other_part else None,
            "submitted": bool(other_part[1]) if other_part else False
        } if other_part else None
    }
@router.get("/writing/test/{test_id}/answers", response_model=dict)
async def get_writing_test_answers(
    test_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all tasks and answers for this test
    answers = db.query(WritingTask, WritingAnswer)\
        .outerjoin(WritingAnswer, and_(
            WritingAnswer.task_id == WritingTask.task_id,
            WritingAnswer.user_id == current_student.user_id
        ))\
        .filter(WritingTask.test_id == test_id)\
        .order_by(WritingTask.part_number)\
        .all()
    
    if not answers:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No writing tasks found for this test"
        )
    
    # Check if all parts are submitted
    total_tasks = len(answers)
    submitted_answers = sum(1 for _, answer in answers if answer is not None)
    is_completed = total_tasks == submitted_answers
    
    return {
        "test_id": test_id,
        "is_completed": is_completed,  # This is calculated on-the-fly
        "total_parts": total_tasks,
        "submitted_parts": submitted_answers,
        "parts": [...]
    }
@router.get("/writing/test/{test_id}/parts", response_model=List[dict])
async def get_writing_test_parts(
    test_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all tasks for this test
    tasks = db.query(WritingTask).filter(
        WritingTask.test_id == test_id
    ).order_by(WritingTask.part_number).all()
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No writing tasks found for this test"
        )
    
    return [{
        "task_id": task.task_id,
        "part_number": task.part_number,
        "task_type": task.task_type,
        "duration": task.duration,
        "word_limit": task.word_limit
    } for task in tasks]
@router.delete("/writing/test/{test_id}/reset", response_model=dict)
async def reset_writing_test(
    test_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Get all tasks for this test
    tasks = db.query(WritingTask).filter(
        WritingTask.test_id == test_id
    ).all()
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No writing tasks found for this test"
        )

    # Get all answers for this test's tasks from the current student
    task_ids = [task.task_id for task in tasks]
    deleted_count = db.query(WritingAnswer).filter(
        WritingAnswer.task_id.in_(task_ids),
        WritingAnswer.user_id == current_student.user_id
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "message": "Writing test answers reset successfully",
        "test_id": test_id,
        "answers_deleted": deleted_count
    }
 