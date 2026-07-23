import { useEffect, useRef } from 'react';
import { API_BASE } from '../config/api';

// Reports a student's live exam progress to the backend (~every 8s) so a
// teacher's realtime board can show it. Design: polling + Redis on the server;
// this side is fire-and-forget and must NEVER disrupt the exam — every call is
// wrapped and errors are swallowed. The backend no-ops for non-center students.
//
// Usage (call once at the top level of an exam layout, before any early return):
//   useExamHeartbeat({
//     enabled: !!examId,
//     skill: 'listening',
//     examId,
//     title: examData?.exam_title,
//     questionsDone,
//     totalQuestions,
//     lastQuestion: currentQuestion,
//   });
export default function useExamHeartbeat({
  enabled,
  skill,
  examId,
  title,
  questionsDone,
  totalQuestions,
  lastQuestion,
}) {
  // Keep the latest values in a ref so the interval always sends fresh data
  // without re-subscribing on every keystroke.
  const dataRef = useRef({});
  dataRef.current = {
    skill,
    exam_id: examId ?? null,
    title: title ?? null,
    questions_done: questionsDone ?? 0,
    total_questions: totalQuestions ?? null,
    last_question: lastQuestion ?? null,
  };

  useEffect(() => {
    if (!enabled || !examId) return undefined;

    const post = (path, body) => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        fetch(`${API_BASE}${path}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          keepalive: true,
        }).catch(() => {});
      } catch (e) {
        /* never disrupt the exam */
      }
    };

    // Immediate first beat, then a steady pulse.
    post('/student/exam/heartbeat', dataRef.current);
    const id = setInterval(() => post('/student/exam/heartbeat', dataRef.current), 8000);

    return () => {
      clearInterval(id);
      // Drop off the board promptly on submit/leave instead of waiting for TTL.
      post('/student/exam/heartbeat/stop');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, examId]);
}
