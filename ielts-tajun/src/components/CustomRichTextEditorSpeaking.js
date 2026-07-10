import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Undo, Redo, Type } from 'lucide-react';

const CustomRichTextEditorSpeaking = ({ value, onChange, className }) => {
  const editorRef = useRef(null);
  const [wordCount, setWordCount] = useState(0);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [fontSize, setFontSize] = useState('16');

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

  // Format text functions
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    handleInput();
  };

  const handleFontSizeChange = (newSize) => {
    setFontSize(newSize);
    if (editorRef.current) {
      editorRef.current.style.fontSize = `${newSize}px`;
      editorRef.current.focus();
    }
  };

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <button
          type="button"
          onClick={() => formatText('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('italic')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('underline')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => formatText('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => formatText('undo')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => formatText('redo')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-gray-600" />
          <select
            value={fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
          </select>
        </div>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsEditorFocused(true)}
        onBlur={() => setIsEditorFocused(false)}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          padding: '20px',
          height: 'calc(90vh - 400px)',
          outline: 'none',
          border: isEditorFocused ? '2px solid #3b82f6' : '1px solid #d1d5db',
          borderTop: 'none',
          overflowY: 'auto',
          boxSizing: 'border-box',
          fontSize: `${fontSize}px`,
          backgroundColor: 'white'
        }}
        className="rounded-b-lg"
        suppressContentEditableWarning={true}
      />
      
      {/* Word Count - Bottom Left */}
      <div className="text-md font-bold text-gray-600 mt-2 px-2">
        Words: {wordCount}
      </div>
    </div>
  );
};

export default CustomRichTextEditorSpeaking;
