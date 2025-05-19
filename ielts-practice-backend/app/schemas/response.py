class UserResponse(UserBase):
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ExamResponse(ExamBase):
    exam_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ExamSectionResponse(ExamSectionBase):
    section_id: int
    exam_id: int

    class Config:
        from_attributes = True

class QuestionResponse(QuestionBase):
    question_id: int
    section_id: int

    class Config:
        from_attributes = True

class QuestionOptionResponse(QuestionOptionBase):
    option_id: int
    question_id: int

    class Config:
        from_attributes = True

class SpeakingTopicResponse(SpeakingTopicBase):
    topic_id: int

    class Config:
        from_attributes = True

class SpeakingQuestionResponse(SpeakingQuestionBase):
    question_id: int
    topic_id: int

    class Config:
        from_attributes = True

class WritingTaskResponse(WritingTaskBase):
    task_id: int

    class Config:
        from_attributes = True

class ListeningMediaResponse(ListeningMediaBase):
    media_id: int
    section_id: int

    class Config:
        from_attributes = True

class ReadingPassageResponse(ReadingPassageBase):
    passage_id: int
    section_id: int

    class Config:
        from_attributes = True