from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Exam, ExamSection, Question, QuestionOption, ReadingPassage, QuestionGroup, User
from app.routes.admin.auth import get_current_admin
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel
from sqlalchemy.sql import func

router = APIRouter()

# Request models
class ReadingTestInit(BaseModel):
    title: str
    duration: int = 60  # Default 60 minutes
    total_marks: float = 40.0  # Default 40 marks

class PassageCreate(BaseModel):
    content: str
    title: str

class ReadingQuestionCreate(BaseModel):
    question_text: str
    question_type: str  # 'multiple_choice', 'true_false', 'matching', 'fill_blank', etc.
    correct_answer: str
    marks: int
    question_number: int  # The question number in the test (e.g., 1, 2, 3...)
    options: Optional[List[dict]] = None  # For multiple choice questions

class QuestionGroupCreate(BaseModel):
    instruction: str
    question_range: str  # e.g., "1-6", "7-13"
    group_type: str  # e.g., "true_false_ng", "fill_blank"
    order_number: int
    questions: List[ReadingQuestionCreate]

class ReadingPartUpdate(BaseModel):
    passage: PassageCreate
    question_groups: List[QuestionGroupCreate]

# Initialize a new reading test
@router.post("/initialize-reading-test", response_model=dict)
async def initialize_reading_test(
    test_data: ReadingTestInit,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Initialize a new IELTS reading test with three parts"""
    
    # Check if an exam with the same title already exists
    existing_exam = db.query(Exam).filter(Exam.title == test_data.title).first()
    if existing_exam:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An exam with the title '{test_data.title}' already exists"
        )
    
    # Create new exam
    new_exam = Exam(
        title=test_data.title,
        created_at=datetime.utcnow(),
        is_active=False,  # Will be set to true when all parts are completed
        created_by=current_admin.user_id
    )
    db.add(new_exam)
    db.flush()
    
    # Create 3 sections for IELTS reading parts with specific question counts
    part_question_counts = {1: 13, 2: 13, 3: 14}
    
    for part in range(1, 4):
        reading_section = ExamSection(
            exam_id=new_exam.exam_id,
            section_type='reading',
            duration=test_data.duration // 3,  # Split duration among parts
            total_marks=test_data.total_marks * (part_question_counts[part] / 40),  # Proportional marks
            order_number=part
        )
        db.add(reading_section)
    
    db.commit()
    
    return {
        "message": "Reading test initialized successfully",
        "exam_id": new_exam.exam_id,
        "title": new_exam.title,
        "parts": 3,
        "question_counts": part_question_counts
    }

# Get all reading tests
@router.get("/reading-tests", response_model=List[dict])
async def get_reading_tests(
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all reading tests"""
    
    # Query exams that have reading sections
    reading_exams = db.query(Exam)\
        .join(ExamSection)\
        .filter(ExamSection.section_type == 'reading')\
        .distinct()\
        .all()
    
    result = []
    for exam in reading_exams:
        # Get sections
        sections = db.query(ExamSection)\
            .filter(
                ExamSection.exam_id == exam.exam_id,
                ExamSection.section_type == 'reading'
            )\
            .order_by(ExamSection.order_number)\
            .all()
        
        # Check if each section has a passage
        section_status = []
        for section in sections:
            passage = db.query(ReadingPassage)\
                .filter(ReadingPassage.section_id == section.section_id)\
                .first()
            
            questions_count = db.query(func.count(Question.question_id))\
                .filter(Question.section_id == section.section_id)\
                .scalar()
            
            # Get expected question count based on part number
            expected_count = 13 if section.order_number < 3 else 14
            
            section_status.append({
                "section_id": section.section_id,
                "order_number": section.order_number,
                "has_passage": passage is not None,
                "questions_count": questions_count or 0,
                "expected_questions": expected_count,
                "is_complete": (passage is not None) and (questions_count == expected_count)
            })
        
        result.append({
            "exam_id": exam.exam_id,
            "title": exam.title,
            "created_at": exam.created_at,
            "is_active": exam.is_active,
            "sections": section_status
        })
    
    return result

# Get a specific reading test
@router.get("/reading-test/{exam_id}", response_model=dict)
async def get_reading_test(
    exam_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get details of a specific reading test"""
    
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Reading test not found")
    
    sections = db.query(ExamSection)\
        .filter(
            ExamSection.exam_id == exam_id,
            ExamSection.section_type == 'reading'
        )\
        .order_by(ExamSection.order_number)\
        .all()
    
    section_details = []
    for section in sections:
        passage = db.query(ReadingPassage)\
            .filter(ReadingPassage.section_id == section.section_id)\
            .first()
        
        # Get question groups
        question_groups = db.query(QuestionGroup)\
            .filter(QuestionGroup.section_id == section.section_id)\
            .order_by(QuestionGroup.order_number)\
            .all()
        
        group_details = []
        for group in question_groups:
            questions = db.query(Question)\
                .filter(Question.group_id == group.group_id)\
                .order_by(Question.question_number)\
                .all()
            
            question_details = []
            for question in questions:
                options = db.query(QuestionOption)\
                    .filter(QuestionOption.question_id == question.question_id)\
                    .all()
                
                question_details.append({
                    "question_id": question.question_id,
                    "question_number": question.question_number,
                    "text": question.question_text,
                    "type": question.question_type,
                    "marks": question.marks,
                    "correct_answer": question.correct_answer,
                    "options": [
                        {
                            "option_id": option.option_id,
                            "text": option.option_text,
                            "is_correct": option.is_correct
                        } for option in options
                    ] if options else []
                })
            
            group_details.append({
                "group_id": group.group_id,
                "instruction": group.instruction,
                "question_range": group.question_range,
                "group_type": group.group_type,
                "order_number": group.order_number,
                "questions": question_details
            })
        
        # Expected question count based on part number
        expected_count = 13 if section.order_number < 3 else 14
        
        section_details.append({
            "section_id": section.section_id,
            "order_number": section.order_number,
            "duration": section.duration,
            "total_marks": section.total_marks,
            "expected_questions": expected_count,
            "passage": {
                "passage_id": passage.passage_id if passage else None,
                "title": passage.title if passage else None,
                "content": passage.content if passage else None,
                "word_count": passage.word_count if passage else 0
            } if passage else None,
            "question_groups": group_details
        })
    
    return {
        "exam_id": exam.exam_id,
        "title": exam.title,
        "created_at": exam.created_at,
        "is_active": exam.is_active,
        "sections": section_details
    }

# Update a reading part (passage and questions)
@router.post("/reading-test/{exam_id}/part/{part_number}", response_model=dict)
async def update_reading_part(
    exam_id: int,
    part_number: int,
    part_data: ReadingPartUpdate,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a reading part with passage and question groups"""
    
    if not 1 <= part_number <= 3:
        raise HTTPException(status_code=400, detail="Part number must be between 1 and 3")
    
    # Get the exam
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Reading test not found")
    
    # Get the section
    section = db.query(ExamSection)\
        .filter(
            ExamSection.exam_id == exam_id,
            ExamSection.section_type == 'reading',
            ExamSection.order_number == part_number
        )\
        .first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Reading section not found")
    
    # Validate question count based on part number
    expected_count = 13 if part_number < 3 else 14
    actual_count = sum(len(group.questions) for group in part_data.question_groups)
    
    if actual_count != expected_count:
        raise HTTPException(
            status_code=400, 
            detail=f"Part {part_number} must have exactly {expected_count} questions, but got {actual_count}"
        )
    
    # Check if passage already exists
    existing_passage = db.query(ReadingPassage)\
        .filter(ReadingPassage.section_id == section.section_id)\
        .first()
    
    # Delete existing passage if it exists
    if existing_passage:
        db.delete(existing_passage)
    
    # Delete existing question groups and questions
    existing_groups = db.query(QuestionGroup)\
        .filter(QuestionGroup.section_id == section.section_id)\
        .all()
    
    for group in existing_groups:
        # Get questions in this group
        questions = db.query(Question)\
            .filter(Question.group_id == group.group_id)\
            .all()
        
        for question in questions:
            # Delete options
            db.query(QuestionOption)\
                .filter(QuestionOption.question_id == question.question_id)\
                .delete()
            
            # Delete question
            db.delete(question)
        
        # Delete group
        db.delete(group)
    
    # Create new passage
    word_count = len(part_data.passage.content.split())
    new_passage = ReadingPassage(
        section_id=section.section_id,
        content=part_data.passage.content,
        title=part_data.passage.title,
        word_count=word_count
    )
    db.add(new_passage)
    db.flush()
    
    # Create new question groups and questions
    total_marks = 0
    
    for group_data in part_data.question_groups:
        # Create question group
        new_group = QuestionGroup(
            section_id=section.section_id,
            instruction=group_data.instruction,
            question_range=group_data.question_range,
            group_type=group_data.group_type,
            order_number=group_data.order_number
        )
        db.add(new_group)
        db.flush()
        
        # Create questions for this group
        for q_data in group_data.questions:
            # Validate question number is within the correct range for this part
            start_num = 1 if part_number == 1 else (14 if part_number == 2 else 27)
            end_num = 13 if part_number == 1 else (26 if part_number == 2 else 40)
            
            if not (start_num <= q_data.question_number <= end_num):
                raise HTTPException(
                    status_code=400,
                    detail=f"Question number {q_data.question_number} is out of range for part {part_number}. "
                           f"Must be between {start_num} and {end_num}."
                )
            
            new_question = Question(
                section_id=section.section_id,
                group_id=new_group.group_id,
                question_text=q_data.question_text,
                question_type=q_data.question_type,
                correct_answer=q_data.correct_answer,
                marks=q_data.marks,
                question_number=q_data.question_number
            )
            db.add(new_question)
            db.flush()
            
            # Add options if provided
            if q_data.options:
                for opt_data in q_data.options:
                    new_option = QuestionOption(
                        question_id=new_question.question_id,
                        option_text=opt_data.get("option_text", ""),
                        is_correct=opt_data.get("is_correct", False)
                    )
                    db.add(new_option)
            
            total_marks += q_data.marks
    
    # Update section marks
    section.total_marks = total_marks
    db.add(section)
    
    # Check if all parts are completed
    all_parts_completed = True
    all_sections = db.query(ExamSection)\
        .filter(
            ExamSection.exam_id == exam_id,
            ExamSection.section_type == 'reading'
        )\
        .all()
    
    for s in all_sections:
        passage_exists = db.query(ReadingPassage)\
            .filter(ReadingPassage.section_id == s.section_id)\
            .first() is not None
        
        # Check if the section has the correct number of questions
        expected_q_count = 13 if s.order_number < 3 else 14
        actual_q_count = db.query(func.count(Question.question_id))\
            .filter(Question.section_id == s.section_id)\
            .scalar() or 0
        
        if not (passage_exists and actual_q_count == expected_q_count):
            all_parts_completed = False
            break
    
    # If all parts are completed, activate the exam
    if all_parts_completed:
        exam.is_active = True
        db.add(exam)
    
    db.commit()
    
    return {
        "message": f"Reading part {part_number} updated successfully",
        "exam_id": exam_id,
        "section_id": section.section_id,
        "passage_id": new_passage.passage_id,
        "question_groups": len(part_data.question_groups),
        "total_questions": actual_count,
        "expected_questions": expected_count,
        "total_marks": total_marks,
        "is_exam_active": all_parts_completed
    }

# Delete a reading test
@router.delete("/reading-test/{exam_id}", response_model=dict)
async def delete_reading_test(
    exam_id: int,
    current_admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a reading test and all its components"""
    
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Reading test not found")
    
    # Get all sections
    sections = db.query(ExamSection)\
        .filter(
            ExamSection.exam_id == exam_id,
            ExamSection.section_type == 'reading'
        )\
        .all()
    
    for section in sections:
        # Delete passages
        db.query(ReadingPassage)\
            .filter(ReadingPassage.section_id == section.section_id)\
            .delete()
        
        # Delete question groups and questions
        groups = db.query(QuestionGroup)\
            .filter(QuestionGroup.section_id == section.section_id)\
            .all()
        
        for group in groups:
            questions = db.query(Question)\
                .filter(Question.group_id == group.group_id)\
                .all()
            
            for question in questions:
                db.query(QuestionOption)\
                    .filter(QuestionOption.question_id == question.question_id)\
                    .delete()
                
                db.delete(question)
            
            db.delete(group)
        
        # Delete section
        db.delete(section)
    
    # Delete exam
    db.delete(exam)
    db.commit()
    
    return {
        "message": "Reading test deleted successfully",
        "exam_id": exam_id
    }