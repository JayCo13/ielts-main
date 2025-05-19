from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, WritingTask, WritingAnswer
from app.routes.admin.auth import get_current_student
from typing import Dict
from bs4 import BeautifulSoup
from datetime import datetime
import groq
import os
from pydantic import BaseModel

router = APIRouter()

client = groq.Groq(api_key=os.getenv("GROQ_API_KEY"))

class EssayEvaluationRequest(BaseModel):
    part_number: int
    essay_text: str
    instructions: str
    task_id: int

async def evaluate_with_groq(essay_text: str, instructions: str, part_number: int) -> Dict:
    # Clean up the input text
    essay_text = essay_text.strip().replace('\n', ' ').replace('\r', '')
    instructions = instructions.strip().replace('\n', ' ').replace('\r', '')
    
    task_type = "Task 1" if part_number == 1 else "Task 2"
    json_template = '''{
    "band_score": "<overall_score>",
    "criteria_scores": {
        "task_achievement": "<score>",
        "coherence_cohesion": "<score>",
        "lexical_resource": "<score>",
        "grammatical_range": "<score>"
    },
    "mistakes": {
        "task_achievement": [
            {"phrase": "<original_text>", "explanation": "<loi_bang_tieng_viet>"}
        ],
        "coherence_cohesion": [
            {"phrase": "<original_text>", "explanation": "<loi_bang_tieng_viet>"}
        ],
        "lexical_resource": [
            {"phrase": "<original_text>", "explanation": "<loi_bang_tieng_viet>"}
        ],
        "grammatical_range": [
            {"phrase": "<original_text>", "explanation": "<loi_bang_tieng_viet>"}
        ]
    },
    "improvement_suggestions": {
        "task_achievement": [
            {"phrase": "<original_text>", "suggestion": "<goi_y_bang_tieng_viet>"}
        ],
        "coherence_cohesion": [
            {"phrase": "<original_text>", "suggestion": "<goi_y_bang_tieng_viet>"}
        ],
        "lexical_resource": [
            {"phrase": "<original_text>", "suggestion": "<goi_y_bang_tieng_viet>"}
        ],
        "grammatical_range": [
            {"phrase": "<original_text>", "suggestion": "<goi_y_bang_tieng_viet>"}
        ]
    },
    "rewritten_essay": "<new_essay_achieving_band_8>"
}'''

    prompt = f'''You are an IELTS Writing Examiner. Evaluate the following IELTS Writing {task_type} essay strictly according to the official IELTS Writing band descriptors. Follow these steps:

1. **Evaluate the Essay**:
   - You MUST assess the essay based on ALL four IELTS Writing criteria: Task Achievement, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy.
   - For EACH of the four criteria, identify at least 2-3 specific phrases or sentences that need improvement.
   - For each identified phrase, provide the original text and explain in Vietnamese what's wrong with it.
   - Suggest specific improvements in Vietnamese for each identified phrase.
   - Do not leave any of the four criteria blank or empty.

2. **Rewrite the Essay**:
   - Write a new essay IN ENGLISH following the structure of the original essay but achieving a band score of 8.0.
   - Ensure the rewritten essay demonstrates near-native proficiency, with advanced vocabulary, complex sentence structures, and clear, well-developed ideas.
IMPORTANT: You MUST provide evaluations for ALL four criteria (Task Achievement, Coherence and Cohesion, Lexical Resource, and Grammatical Range). Do not leave any criteria empty or missing.
Return your evaluation and rewritten essay in the following JSON format ONLY. All mistakes and improvement suggestions MUST be in Vietnamese language, but the rewritten essay MUST be in English:


{json_template}

Task Type: IELTS Writing {task_type}
Task Instructions: {instructions}
Student Essay: {essay_text}
'''

    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": "You are an expert IELTS examiner. Always respond in the exact JSON format specified."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2048
        )
        
        return parse_evaluation_response(completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI evaluation failed: {str(e)}"
        )

def parse_evaluation_response(response: str) -> Dict:
    try:
        import json
        evaluation = json.loads(response)
        
        # Initialize default structures for missing fields
        default_criteria = {
            "task_achievement": [],
            "coherence_cohesion": [],
            "lexical_resource": [],
            "grammatical_range": []
        }
        
        # Ensure all required sections exist
        evaluation['mistakes'] = evaluation.get('mistakes', default_criteria.copy())
        evaluation['improvement_suggestions'] = evaluation.get('improvement_suggestions', default_criteria.copy())
        
        # Ensure all criteria exist in mistakes and suggestions
        for category in ['task_achievement', 'coherence_cohesion', 'lexical_resource', 'grammatical_range']:
            evaluation['mistakes'][category] = evaluation['mistakes'].get(category, [])
            evaluation['improvement_suggestions'][category] = evaluation['improvement_suggestions'].get(category, [])
        
        return {
            "band_score": float(evaluation.get('band_score', 0.0)),
            "criteria_scores": {
                "task_achievement": float(evaluation.get('criteria_scores', {}).get('task_achievement', 0.0)),
                "coherence_cohesion": float(evaluation.get('criteria_scores', {}).get('coherence_cohesion', 0.0)),
                "lexical_resource": float(evaluation.get('criteria_scores', {}).get('lexical_resource', 0.0)),
                "grammatical_range": float(evaluation.get('criteria_scores', {}).get('grammatical_range', 0.0))
            },
            "mistakes": evaluation['mistakes'],
            "improvement_suggestions": evaluation['improvement_suggestions'],
            "rewritten_essay": evaluation.get('rewritten_essay', '')
        }
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process AI response: {str(e)}"
        )

@router.post("/evaluate", response_model=Dict)
async def evaluate_essay(
    request: EssayEvaluationRequest = Body(..., embed=True),
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Clean HTML tags from input data
    essay_text = BeautifulSoup(request.essay_text, "html.parser").get_text().strip()
    instructions = BeautifulSoup(request.instructions, "html.parser").get_text().strip()
    
    # Validate input
    if not essay_text or not instructions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Essay text and instructions cannot be empty"
        )
    
    task = db.query(WritingTask).filter(
        WritingTask.task_id == request.task_id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing task not found"
        )

    evaluation = await evaluate_with_groq(
        essay_text=essay_text,
        instructions=instructions
    )

    return {
        "task_id": request.task_id,
        "evaluation_timestamp": datetime.utcnow(),
        "word_count": len(essay_text.split()),
        "evaluation_result": evaluation
    }

@router.post("/evaluate-and-save/{task_id}", response_model=Dict)
async def evaluate_and_save_essay(
    task_id: int,
    essay_text: str = Body(...),
    instructions: str = Body(...),
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

    # Clean HTML tags from input data
    clean_essay = BeautifulSoup(essay_text, "html.parser").get_text().strip()
    clean_instructions = BeautifulSoup(instructions, "html.parser").get_text().strip()

    # Check if essay already has AI evaluation
    existing_answer = db.query(WritingAnswer).filter(
        WritingAnswer.task_id == task_id,
        WritingAnswer.user_id == current_student.user_id,
        WritingAnswer.is_ai_evaluated == True
    ).first()

    if existing_answer:
        return {
            "task_id": task_id,
            "evaluation_timestamp": existing_answer.updated_at,
            "word_count": len(existing_answer.answer_text.split()),
            "evaluation_result": {
                "band_score": existing_answer.score,
                "criteria_scores": {
                    "task_achievement": existing_answer.task_achievement_score,
                    "coherence_cohesion": existing_answer.coherence_cohesion_score,
                    "lexical_resource": existing_answer.lexical_resource_score,
                    "grammatical_range": existing_answer.grammatical_range_score
                },
                "mistakes": existing_answer.mistakes,
                "improvement_suggestions": existing_answer.improvement_suggestions,
                "rewritten_essay": existing_answer.rewritten_essay
            },
            "saved": True,
            "answer_id": existing_answer.answer_id,
            "is_ai_evaluated": True
        }

    evaluation = await evaluate_with_groq(
        essay_text=clean_essay,
        instructions=clean_instructions,
        part_number=task.part_number
    )

    writing_answer = db.query(WritingAnswer).filter(
        WritingAnswer.task_id == task_id,
        WritingAnswer.user_id == current_student.user_id
    ).first()

    if writing_answer:
        writing_answer.answer_text = essay_text
        writing_answer.score = evaluation["band_score"]
        writing_answer.task_achievement_score = evaluation["criteria_scores"]["task_achievement"]
        writing_answer.coherence_cohesion_score = evaluation["criteria_scores"]["coherence_cohesion"]
        writing_answer.lexical_resource_score = evaluation["criteria_scores"]["lexical_resource"]
        writing_answer.grammatical_range_score = evaluation["criteria_scores"]["grammatical_range"]
        writing_answer.mistakes = evaluation["mistakes"]
        writing_answer.improvement_suggestions = evaluation["improvement_suggestions"]
        writing_answer.rewritten_essay = evaluation["rewritten_essay"]
        writing_answer.is_ai_evaluated = True
        writing_answer.updated_at = datetime.utcnow()
    else:
        writing_answer = WritingAnswer(
            task_id=task_id,
            user_id=current_student.user_id,
            answer_text=essay_text,
            score=evaluation["band_score"],
            task_achievement_score=evaluation["criteria_scores"]["task_achievement"],
            coherence_cohesion_score=evaluation["criteria_scores"]["coherence_cohesion"],
            lexical_resource_score=evaluation["criteria_scores"]["lexical_resource"],
            grammatical_range_score=evaluation["criteria_scores"]["grammatical_range"],
            mistakes=evaluation["mistakes"],
            improvement_suggestions=evaluation["improvement_suggestions"],
            rewritten_essay=evaluation["rewritten_essay"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(writing_answer)

    db.commit()
    db.refresh(writing_answer)

    return {
        "task_id": task_id,
        "evaluation_timestamp": datetime.utcnow(),
        "word_count": len(clean_essay.split()),
        "evaluation_result": evaluation,
        "saved": True,
        "answer_id": writing_answer.answer_id
    }

@router.get("/evaluation/{answer_id}", response_model=Dict)
async def get_evaluation_data(
    answer_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    writing_answer = db.query(WritingAnswer).filter(
        WritingAnswer.answer_id == answer_id,
        WritingAnswer.user_id == current_student.user_id
    ).first()
    
    if not writing_answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing answer not found"
        )

    return {
        "task_id": writing_answer.task_id,
        "evaluation_timestamp": writing_answer.updated_at,
        "word_count": len(writing_answer.answer_text.split()),
        "answer_text": writing_answer.answer_text,
        "evaluation_result": {
            "band_score": writing_answer.score,
            "criteria_scores": {
                "task_achievement": writing_answer.task_achievement_score,
                "coherence_cohesion": writing_answer.coherence_cohesion_score,
                "lexical_resource": writing_answer.lexical_resource_score,
                "grammatical_range": writing_answer.grammatical_range_score
            },
            "mistakes": writing_answer.mistakes,
            "improvement_suggestions": writing_answer.improvement_suggestions,
            "rewritten_essay": writing_answer.rewritten_essay
        }
    }
@router.get("/evaluation-status/{answer_id}", response_model=Dict)
async def get_evaluation_status(
    answer_id: int,
    current_student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    writing_answer = db.query(WritingAnswer).filter(
        WritingAnswer.answer_id == answer_id,
        WritingAnswer.user_id == current_student.user_id
    ).first()
    
    if not writing_answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing answer not found"
        )

    return {
        "is_ai_evaluated": writing_answer.is_ai_evaluated,
        "answer_id": writing_answer.answer_id,
        "task_id": writing_answer.task_id
    }