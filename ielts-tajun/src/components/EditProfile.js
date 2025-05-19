import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// In EditProfile.js, modify the component definition:
const EditProfile = ({ onProfileUpdate }) => {
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    image: null
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:8000/student/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
          setFormData({
            username: data.username,
            email: data.email,
            image: null
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveMessage.type === 'success') {
      const timer = setTimeout(() => {
        setSaveMessage({ type: '', text: '' });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      
      // Create preview URL for immediate display
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage({ type: '', text: '' });

    const formDataToSend = new FormData();
    formDataToSend.append('username', formData.username);
    formDataToSend.append('email', formData.email);
    if (formData.image) {
      formDataToSend.append('image', formData.image);
    }

    try {
      const response = await fetch('http://localhost:8000/student/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        setSaveMessage({ 
          type: 'success', 
          text: 'Cập nhật hồ sơ thành công!' 
        });
        
        // Get updated data from response
        const updatedData = await response.json();
        
        // If we uploaded a new image, use the preview image until page reload
        // This ensures we see the new image immediately
        if (formData.image && previewImage) {
          updatedData.image_url = previewImage;
        } 
        // Otherwise, force a cache refresh on the existing image
        else if (updatedData.image_url) {
          const timestamp = new Date().getTime();
          updatedData.image_url = `${updatedData.image_url.split('?')[0]}?t=${timestamp}`;
        }
        
        // Update the profile data with the modified image URL
        setProfileData(updatedData);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Reset image state but keep the updated data
        setFormData({
          username: updatedData.username,
          email: updatedData.email,
          image: null
        });
        
        // Only clear preview if we're not using it as the current display image
        if (!formData.image) {
          setPreviewImage(null);
        }
        
        // Call the onProfileUpdate callback to refresh the parent component
        if (onProfileUpdate) {
          onProfileUpdate();
        }
      } else {
        setSaveMessage({ 
          type: 'error', 
          text: 'Không thể cập nhật hồ sơ. Vui lòng thử lại.' 
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage({ 
        type: 'error', 
        text: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Determine which image to display with a timestamp to prevent caching
  const displayImage = previewImage || 
    (profileData?.image_url ? 
      (profileData.image_url.includes('?') ? 
        profileData.image_url : 
        `${profileData.image_url}?t=${new Date().getTime()}`) : 
      "/default-avatar.jpg");

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h2 className="text-2xl text-center font-bold mb-6">Chỉnh Sửa Hồ Sơ</h2>
        
        {saveMessage.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            saveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {saveMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Ảnh Đại Diện</label>
            <div className="flex items-center space-x-4">
              <img
                key={displayImage} // Add key to force re-render
                src={displayImage}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover border-2 border-gray-200"
              />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleImageChange}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100"
                accept="image/*"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Tên Người Dùng</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              disabled={isSaving}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors
              ${isSaving 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-lime-500 hover:bg-lime-600'}`}
          >
            {isSaving ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
