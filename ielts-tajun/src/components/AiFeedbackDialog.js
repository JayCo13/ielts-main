import React, { useState } from 'react';
import { X, AlertCircle, Copy } from 'lucide-react';

// Change the initial state to 'task'
// Update the component props
const AIFeedbackDialog = ({ isOpen, onClose, result, loading, setSelectedPart, setEditDialogOpen }) => {
  const [activeSection, setActiveSection] = useState('task');
  if (!isOpen) return null;

  const renderBandScore = (score) => {
    return (
      <div className="flex items-center justify-center">
        <div className="text-6xl font-bold text-lime-600">{score}</div>
      </div>
    );
  };



  const navigationItems = [
    { id: 'task', label: 'Task Achievement' },
    { id: 'coherence', label: 'Coherence & Cohesion' },
    { id: 'lexical', label: 'Lexical Resource' },
    { id: 'grammar', label: 'Grammar' },
    { id: 'essay', label: 'Bài viết 8+ (dựa trên bài viết của bạn)' },
  ];

  const renderMistake = (mistake, suggestion) => {
    return (
      <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
          <div className="space-y-3 w-full">
            <div>
              <p className="font-medium text-gray-900">Original:</p>
              <p className="text-gray-600 mt-1">{mistake.phrase}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Explanation:</p>
              <p className="text-gray-600 mt-1">{mistake.explanation}</p>
            </div>
            {suggestion && (
              <div className="pt-2 border-t">
                <p className="font-medium text-green-700">Suggested Improvement:</p>
                <p className="text-green-600 mt-1">{suggestion.suggestion}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!result?.evaluation_result) return null;

    const { mistakes, improvement_suggestions } = result.evaluation_result;

    const renderSection = (title, mistakes, suggestions) => {
      if (!mistakes || mistakes.length === 0) {
        return (
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center gap-2 text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p>No improvements needed for this section. Well done!</p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">{title}</h3>
          {mistakes.map((mistake, index) => (
            renderMistake(
              mistake,
              suggestions?.find(s => s.phrase === mistake.phrase)
            )
          ))}
        </div>
      );
    };

    switch (activeSection) {
      case 'task':
        return renderSection(
          'Task Achievement Feedback',
          mistakes.task_achievement,
          improvement_suggestions.task_achievement
        );

      case 'coherence':
        return renderSection(
          'Coherence & Cohesion Feedback',
          mistakes.coherence_cohesion,
          improvement_suggestions.coherence_cohesion
        );

      case 'lexical':
        return renderSection(
          'Vocabulary Feedback',
          mistakes.lexical_resource,
          improvement_suggestions.lexical_resource
        );

      case 'grammar':
        return renderSection(
          'Grammar Feedback',
          mistakes.grammatical_range,
          improvement_suggestions.grammatical_range
        );

      // In the essay case of renderContent()
      case 'essay':
        return (
          <div className="prose max-w-none">
            <div className="flex justify-end items-center mb-4 gap-1">
              <Copy className="w-4 h-4 text-lime-600" />
              <span
                onClick={() => {
                  setSelectedPart({
                    task_id: result.task_id,
                    part_number: result.part_number,
                    rewritten_essay: result.evaluation_result.rewritten_essay,
                    isAIVersion: true
                  });
                  setEditDialogOpen(true);
                  onClose();
                }}
                className="text-md text-lime-600 hover:text-lime-700 cursor-pointer"
              >
                Copy & Edit
              </span>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg whitespace-pre-wrap">
              {result.evaluation_result.rewritten_essay}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex shadow-xl">
        <div className="w-64 border-r bg-gradient-to-b from-gray-50 to-white rounded-l-xl p-6">
          <nav className="space-y-2">
            {navigationItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeSection === item.id
                  ? 'bg-lime-500 text-white shadow-md hover:bg-lime-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-lime-500 to-lime-600 text-white relative">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-center">Kết quả đánh giá bài viết của AI</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 text-lg">Phân tích bài luận của bạn...</p>
                <p className="text-gray-500 text-sm">Hãy đợi hệ thống một lúc nhé!</p>
              </div>
            ) : result?.error ? (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                {result.error}
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFeedbackDialog;