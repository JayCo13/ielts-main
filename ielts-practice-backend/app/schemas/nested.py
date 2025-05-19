class QuestionWithOptionsResponse(QuestionResponse):
    options: List[QuestionOptionResponse]

class ExamSectionWithQuestionsResponse(ExamSectionResponse):
    questions: List[QuestionWithOptionsResponse]

class ExamWithSectionsResponse(ExamResponse):
    exam_sections: List[ExamSectionWithQuestionsResponse]

class SpeakingTopicWithQuestionsResponse(SpeakingTopicResponse):
    speaking_questions: List[SpeakingQuestionResponse]