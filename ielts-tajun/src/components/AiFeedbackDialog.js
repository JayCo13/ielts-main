import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Copy, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIFeedbackDialog = ({ isOpen, onClose, result, loading, setSelectedPart, setEditDialogOpen }) => {
  const [activeTab, setActiveTab] = useState('evaluation');
  const [activeSection, setActiveSection] = useState(null);
  const sectionRefs = useRef({});

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const renderBandScore = (score) => {
    const getScoreColor = (score) => {
      if (score >= 7.5) return 'from-amber-500 to-amber-600';
      if (score >= 6.5) return 'from-[#0096b1] to-[#0078a3]';
      if (score >= 5.5) return 'from-yellow-500 to-amber-600';
      return 'from-red-500 to-rose-600';
    };

    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="sticky top-0 z-10 mb-8 bg-black p-6 rounded-2xl shadow-lg"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${getScoreColor(result.score)} opacity-10 rounded-2xl`} />
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col"
          >
            <span className="text-2xl font-semibold text-gray-700">Your IELTS Score</span>
            <span className="text-gray-500 mt-1">Overall Band Score</span>
          </motion.div>
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-6xl font-bold bg-gradient-to-r ${getScoreColor(result.band_score)} bg-clip-text text-transparent`}
          >
            {result.band_score}
          </motion.div>
        </div>
      </motion.div>
    );
  };

  const renderMistake = (mistake, suggestion, index) => {
    return (
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: index * 0.1 }}
        className="mb-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300"
      >
        <div className="flex gap-4">
          <AlertCircle className="w-6 h-6 text-[#0096b1] flex-shrink-0 mt-1" />
          <div className="space-y-4 w-full">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
            >
              <p className="font-medium text-gray-900">Original:</p>
              <p className="text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg">{mistake.phrase}</p>
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.3 }}
            >
              <p className="font-medium text-gray-900">Explanation:</p>
              <p className="text-gray-600 mt-2">{mistake.explanation}</p>
            </motion.div>
            {suggestion && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.4 }}
                className="pt-4 border-t"
              >
                <p className="font-medium text-[#0096b1]">Suggested Improvement:</p>
                <p className="text-[#0096b1] mt-2 bg-[#0096b1]/10 p-3 rounded-lg">{suggestion.suggestion}</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderEvaluationContent = () => {
    if (!result?.evaluation_result) return null;

    const { mistakes, improvement_suggestions } = result.evaluation_result;
    const sections = [
      { id: 'task', title: 'Task Achievement', mistakes: mistakes.task_achievement, suggestions: improvement_suggestions.task_achievement },
      { id: 'coherence', title: 'Coherence & Cohesion', mistakes: mistakes.coherence_cohesion, suggestions: improvement_suggestions.coherence_cohesion },
      { id: 'lexical', title: 'Lexical Resource', mistakes: mistakes.lexical_resource, suggestions: improvement_suggestions.lexical_resource },
      { id: 'grammar', title: 'Grammar', mistakes: mistakes.grammatical_range, suggestions: improvement_suggestions.grammatical_range }
    ];

    return (
      <div className="flex gap-6">
        {/* Navigation Menu */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 flex-shrink-0"
        >
          <div className="sticky top-4 space-y-6">
            {/* Band Score Card */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="bg-gradient-to-br from-[#0096b1] to-[#0078a3] p-6 text-white">
                <h3 className="text-xl font-semibold mb-1">IELTS Band Score</h3>
                <p className="text-[#e6f7fb] text-sm">Overall Performance</p>
              </div>
              <div className="p-6 flex items-center justify-center bg-gradient-to-br from-white to-[#e6f7fb]">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-7xl font-bold text-[#0096b1]"
                >
                  {result.band_score}
                </motion.div>
              </div>
            </motion.div>

            {/* Section Navigation */}
            <div className="rounded-xl shadow-lg p-4 space-y-2">
              {sections.map((section) => (
                <motion.button
                  key={section.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${activeSection === section.id
                    ? 'bg-[#0096b1] text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{section.title}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    activeSection === section.id ? 'rotate-90' : ''
                  }`} />
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 space-y-8"
        >
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              ref={el => sectionRefs.current[section.id] = el}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.2 }}
              className="mt-8 scroll-mt-4"
            >
              <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                <div className="w-2 h-8 bg-[#0096b1] rounded-full mr-4"></div>
                {section.title}
              </h3>
              {(!section.mistakes || section.mistakes.length === 0) ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-6 bg-[#e6f7fb] rounded-xl border border-[#0096b1]/20 shadow-sm"
                >
                  <div className="flex items-center gap-3 text-[#0096b1]">
                    <div className="w-3 h-3 bg-[#0096b1] rounded-full"></div>
                    <p className="text-lg">Excellent work in this section! No improvements needed.</p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {section.mistakes.map((mistake, idx) => (
                    renderMistake(
                      mistake,
                      section.suggestions?.find(s => s.phrase === mistake.phrase),
                      idx
                    )
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  };

  const renderImprovedEssay = () => {
    if (!result?.evaluation_result?.rewritten_essay) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="prose max-w-none"
      >
        <div className="flex justify-end items-center mb-6 gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
            className="flex items-center gap-2 px-6 py-3 bg-[#0096b1] text-white rounded-xl hover:bg-[#0078a3] transition-colors shadow-md"
          >
            <Copy className="w-5 h-5" />
            Copy & Edit
          </motion.button>
        </div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-8 bg-gray-50 rounded-2xl shadow-inner whitespace-pre-wrap"
        >
          {result.evaluation_result.rewritten_essay}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] flex shadow-2xl overflow-hidden"
          >
            {/* Left Navigation Panel */}
            <div className="w-48 bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col shadow-lg rounded-l-2xl overflow-hidden border-r border-gray-200"> 
              <motion.button 
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 10px 15px -3px rgba(0, 150, 177, 0.4), 0 4px 6px -4px rgba(0, 150, 177, 0.3)",
                  y: -5
                }} 
                whileTap={{ 
                  scale: 0.95,
                  boxShadow: "0 5px 10px -3px rgba(0, 150, 177, 0.3), 0 2px 4px -2px rgba(0, 150, 177, 0.2)"
                }} 
                onClick={() => { 
                  setActiveTab('evaluation'); 
                  setActiveSection(null); 
                }} 
                className={`flex-1 px-6 py-8 font-medium transition-all duration-300 flex items-center justify-center text-lg relative overflow-hidden ${ 
                  activeTab === 'evaluation' 
                    ? 'bg-gradient-to-r from-[#0096b1] to-[#0078a3] text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-gray-100' 
                }`} 
              > 
                {activeTab === 'evaluation' && ( 
                  <>
                    <motion.div 
                      className="absolute inset-0 bg-white opacity-20" 
                      initial={{ x: '-100%' }} 
                      animate={{ x: '100%' }} 
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} 
                    />
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-30"
                      initial={{ y: '100%' }}
                      animate={{ y: '-100%' }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
                    />
                  </> 
                )} 
                <motion.span
                  initial={false}
                  animate={activeTab === 'evaluation' ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  Đánh giá 
                </motion.span>
              </motion.button> 
              <motion.button 
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 10px 15px -3px rgba(0, 150, 177, 0.4), 0 4px 6px -4px rgba(0, 150, 177, 0.3)",
                  y: -5
                }} 
                whileTap={{ 
                  scale: 0.95,
                  boxShadow: "0 5px 10px -3px rgba(0, 150, 177, 0.3), 0 2px 4px -2px rgba(0, 150, 177, 0.2)"
                }} 
                onClick={() => { 
                  setActiveTab('improved'); 
                  setActiveSection(null); 
                }} 
                className={`flex-1 px-6 py-8 font-medium transition-all duration-300 flex items-center justify-center text-lg relative overflow-hidden ${ 
                  activeTab === 'improved' 
                    ? 'bg-gradient-to-r from-[#0096b1] to-[#0078a3] text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-gray-100' 
                }`} 
              > 
                {activeTab === 'improved' && ( 
                  <>
                    <motion.div 
                      className="absolute inset-0 bg-white opacity-20" 
                      initial={{ x: '-100%' }} 
                      animate={{ x: '100%' }} 
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} 
                    />
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-30"
                      initial={{ y: '100%' }}
                      animate={{ y: '-100%' }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
                    />
                  </> 
                )} 
                <motion.span
                  initial={false}
                  animate={activeTab === 'improved' ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  Gợi ý bài viết 8+ (dựa trên bài viết của bạn) 
                </motion.span>
              </motion.button> 
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              
              <div className="flex items-center justify-end p-4 border-b">
              <motion.h1 
                className='text-center flex-1 flex items-center justify-center text-4xl font-bold bg-gradient-to-r from-[#0096b1] to-[#0078a3] bg-clip-text text-transparent'
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  duration: 0.8, 
                  type: "spring",
                  bounce: 0.4 
                }}
              >
                Kết quả đánh giá bài viết từ thiieltstrenmay.com AI
              </motion.h1>
              
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                  
                </motion.button>
                
              </div>

              <div className="flex-1 p-8 overflow-auto bg-gray-50">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-full space-y-6"
                    >
                      
                      <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin">
                        
                      </div>
                      <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-700"
                      >
                        Đang phân tích bài luận của bạn...
                      </motion.p>
                      <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-gray-500"
                      >
                        Hãy đợi hệ thống một lúc nhé!
                      </motion.p>
                      <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-amber-600 text-sm mt-4 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200"
                      >
                        Lưu ý: Kết quả đánh giá chỉ mang tính tương đối, kết quả có thể bị lệch 0.5-1 band
                      </motion.p>
                    </motion.div>
                  ) : result?.error ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 shadow-sm"
                    >
                      {result.error}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      
                    >
                      {activeTab === 'evaluation' ? renderEvaluationContent() : renderImprovedEssay()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIFeedbackDialog;
