import { useState, useEffect, useCallback, useRef } from 'react';

const useTextSelection = (isTranslatorEnabled = false, isReviewMode = false) => {
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [showTranslator, setShowTranslator] = useState(false);
  const lastSelectionRef = useRef('');
  const isSelectingRef = useRef(false);

  // Handle text selection - only triggered on mouseup to avoid interference during drag
  const handleTextSelection = useCallback((event) => {
    if (!isTranslatorEnabled || !isReviewMode) return;

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text && text.length > 0 && text !== lastSelectionRef.current) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Validate selection - make sure it's a reasonable size
          // This helps prevent selecting entire article
          if (rect.width > 0 && rect.height > 0 && rect.height < 500) {
            setSelectedText(text);
            setSelectionPosition({
              x: rect.left + rect.width / 2,
              y: rect.top - 10
            });
            setShowTranslator(true);
            lastSelectionRef.current = text;
          }
        } catch (e) {
          // Selection might be invalid, ignore
        }
      } else if (!text) {
        setShowTranslator(false);
        setSelectedText('');
        lastSelectionRef.current = '';
      }
      isSelectingRef.current = false;
    }, 50);
  }, [isTranslatorEnabled, isReviewMode]);

  // Track when selection starts
  const handleMouseDown = useCallback(() => {
    if (!isTranslatorEnabled || !isReviewMode) return;
    isSelectingRef.current = true;
  }, [isTranslatorEnabled, isReviewMode]);

  // Handle click outside to close translator in review mode
  const handleClickOutside = useCallback((event) => {
    if (!isReviewMode) return;

    // Don't close if user is still selecting text
    if (isSelectingRef.current) return;

    // Add delay to check if this is a new selection or just a click
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection.toString().trim()) {
        setShowTranslator(false);
        setSelectedText('');
        lastSelectionRef.current = '';
      }
    }, 100);
  }, [isReviewMode]);

  const closeTranslator = useCallback(() => {
    setShowTranslator(false);
    setSelectedText('');
    lastSelectionRef.current = '';

    // Clear any text selection
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }, []);

  // Set up event listeners for automatic translation in review mode
  useEffect(() => {
    if (!isTranslatorEnabled || !isReviewMode) return;

    // Only use mouseup for selection to avoid issues with phrase selection
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isTranslatorEnabled, isReviewMode, handleTextSelection, handleClickOutside, handleMouseDown]);

  // Clean up when translator is disabled
  useEffect(() => {
    if (!isTranslatorEnabled) {
      setShowTranslator(false);
      setSelectedText('');
      lastSelectionRef.current = '';
    }
  }, [isTranslatorEnabled]);

  return {
    selectedText,
    selectionPosition,
    showTranslator,
    closeTranslator,
    // Utility function to manually trigger translation
    translateText: (text, position) => {
      if (isTranslatorEnabled && text && text.trim()) {
        setSelectedText(text.trim());
        setSelectionPosition(position || { x: window.innerWidth / 2, y: 100 });
        setShowTranslator(true);
        lastSelectionRef.current = text.trim();
      }
    }
  };
};

export default useTextSelection;
