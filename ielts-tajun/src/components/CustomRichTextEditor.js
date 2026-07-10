import React, { useState, useRef, useEffect } from 'react';

const CustomRichTextEditor = ({ value, onChange, textSize, colorTheme, className }) => {
  const editorRef = useRef(null);
  const [wordCount, setWordCount] = useState(0);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  // Calculate word count
  useEffect(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const words = text.split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    }
  }, [value]);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current && onChange) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  // Get theme-based styles
  const getThemeStyles = () => {
    const fontSize = textSize === 'regular' ? '17px' : textSize === 'large' ? '20px' : '24px';
    
    switch (colorTheme) {
      case 'black-on-white':
        return {
          backgroundColor: 'white',
          color: 'black',
          fontSize
        };
      case 'white-on-black':
        return {
          backgroundColor: 'black',
          color: 'white',
          fontSize
        };
      case 'yellow-on-black':
        return {
          backgroundColor: 'black',
          color: '#fde047',
          fontSize
        };
      default:
        return {
          backgroundColor: 'white',
          color: 'black',
          fontSize
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <div className={className}>
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsEditorFocused(true)}
        onBlur={() => setIsEditorFocused(false)}
        style={{
          ...themeStyles,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          padding: '20px',
          height: 'calc(90vh - 350px)',
          outline: 'none',
          borderRadius: '10px',
          border: isEditorFocused ? '2px solid #3b82f6' : '1px solid #d1d5db',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
        suppressContentEditableWarning={true}
      />
      
      {/* Word Count - Bottom Left */}
      <div className={`text-lg font-bold mt-2 ${colorTheme !== 'black-on-white' ? 'text-white' : 'text-gray-600'}`}>
        Words: {wordCount}
      </div>
    </div>
  );
};

export default CustomRichTextEditor;
