import React, { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { X, Check } from 'lucide-react';

const EditEssayDialog = ({ isOpen, onClose, taskId, partNumber }) => {
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [testTitle, setTestTitle] = useState(''); // Add this line
  const [isSaving, setIsSaving] = useState(false);
  
  // Add isSaving reset to useEffect
  useEffect(() => {
    if (isOpen && taskId) {
      setIsSaving(false); // Reset saving state when dialog opens
      if (taskId.rewritten_essay) {
        const formattedEssay = taskId.rewritten_essay
          .split(/\n\n|\r\n\r\n/)
          .map(paragraph => `<p>${paragraph.trim()}</p>`)
          .join('\n');
        setEssay(formattedEssay);
        setLoading(false);
      } else {
        fetchEssay();
      }
    }
  }, [isOpen, taskId]);

  // Update fetchEssay function
  const fetchEssay = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/student/writing/part/${taskId.task_id}/essay`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        setEssay(data.essay?.answer_text || '');
        setTestTitle(data.test_title || '');
      }
    } catch (error) {
      console.error('Error fetching essay:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Update handleSave function
  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple clicks
    setIsSaving(true);
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/student/writing/part/${taskId.task_id}/essay`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answer_text: essay
        })
      });
  
      if (response.ok) {
        setNotification({ 
          show: true, 
          message: 'Essay updated successfully!' 
        });
        
        // Hide notification after 5 seconds
        setTimeout(() => {
          setNotification({ show: false, message: '' });
        }, 3000);

        // Close dialog after notification disappears
        setTimeout(() => {
          onClose(true);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating essay:', error);
      setNotification({ 
        show: true, 
        message: 'Failed to update essay. Please try again.' 
      });
      // Hide error notification after 5 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '' });
      }, 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {notification.show && (
          <div className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg ${
            notification.message.includes('successfully') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {notification.message.includes('successfully') && <Check className="w-4 h-4" />}
            {notification.message}
          </div>
        )}
        
        <div className="flex justify-between items-center p-4 border-b">
          <button onClick={() => onClose(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <h2 className="flex-1 text-xl font-semibold text-center">
            {taskId && typeof taskId === 'object' && taskId.rewritten_essay ? (
              <div className="flex flex-col items-center">
                <span>Chỉnh sửa - Phiên bản 8+</span>
              </div>
            ) : (
              <span>Edit Part {partNumber} - {testTitle}</span>
            )}
          </h2>
          <div className="w-9"></div>
        </div>

        {taskId && typeof taskId === 'object' && taskId.rewritten_essay && (
          <div className="bg-lime-50 border-b border-lime-100 px-4 py-4 m-2">
            <p className="text-sm text-lime-700 text-center">
            Đây là phiên bản 8+ của bài luận dựa trên cấu trúc bài của bạn được gợi ý bằng AI. Bạn có thể chỉnh sửa thêm trước khi lưu.
            </p>
          </div>
        )}
        
        <div className="flex-1 p-4 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading essay...</p>
            </div>
          ) : (
            <Editor
              apiKey="mbitaig1o57ii8l8aa8wx4b4le9cc1e0aw5t2c1lo4axii6u"
              value={essay}
              onEditorChange={(content) => setEssay(content)}
              init={{
                height: 'calc(100vh-300px)',
                width: '100%',
                menubar: false,
                plugins: ['wordcount'],
                toolbar: false,
                content_style: `
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                    font-size: 16px; 
                    padding: 20px;
                    line-height: 1.6;
                  }
                  p {
                    margin-bottom: 1.5em;
                  }
                `,
                formats: {
                  p: { block: 'p', styles: { 'margin-bottom': '1.5em' } }
                },
                forced_root_block: 'p',
                statusbar: false,
              }}
            />
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isSaving 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-lime-500 hover:bg-lime-600 text-white'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEssayDialog;