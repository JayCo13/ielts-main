import React, { useState, useRef, useEffect } from 'react';

const ExplanationModal = ({ isOpen, onClose, title, description }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedText, setHighlightedText] = useState(description);
  const contentRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm) return;

    const content = contentRef.current;
    if (!content) return;

    // Reset previous highlights
    const text = description;
    if (!text) return;

    // Create highlighted version
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const newText = text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    setHighlightedText(newText);

    // Find and scroll to the first occurrence
    const firstHighlight = content.querySelector('mark');
    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Reset highlights when search term is cleared
  useEffect(() => {
    if (!searchTerm) {
      setHighlightedText(description);
    }
  }, [searchTerm, description]);

  return (
    isOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className='flex flex-col items-center'>
            <h2 className="text-2xl font-bold text-center text-blue-600">Transcript - {title}</h2>
            <span className="text-center mt-1 text-sm text-gray-500">-- Bản quyền transcript thuộc về thiieltstrenmay.com --</span>

            {/* Search form */}
            <form onSubmit={handleSearch} className="w-full max-w-md mt-4 flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập từ cần tìm..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Tìm kiếm
              </button>
            </form>
          </div>

          <div ref={contentRef} className="prose max-w-none mt-6 max-h-[70vh] overflow-y-auto">
            <p
              className="text-gray-600 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightedText }}
            />
          </div>
        </div>
      </div>
    )
  );
};

export default ExplanationModal;

