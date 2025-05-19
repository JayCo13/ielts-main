import React, { useState } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';

const PackageFormModal = ({ onClose, onSuccess, isCreate, packageData }) => {
  const [formData, setFormData] = useState({
    name: packageData?.name || '',
    duration_months: packageData?.duration_months || 1,
    price: packageData?.price || 0,
    description: packageData?.description || '',
    is_active: packageData?.is_active !== undefined ? packageData.is_active : true,
    package_type: packageData?.package_type || 'all_skills',
    skill_type: packageData?.skill_type || null
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Tên gói không được để trống';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Tên gói phải có ít nhất 3 ký tự';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Tên gói không được vượt quá 50 ký tự';
    }

    // Duration validation
    if (!formData.duration_months || formData.duration_months < 1) {
      newErrors.duration_months = 'Thời hạn phải lớn hơn hoặc bằng 1 tháng';
    } else if (formData.duration_months > 36) {
      newErrors.duration_months = 'Thời hạn không được vượt quá 36 tháng';
    }

    // Price validation for VND
    if (formData.price < 0) {
      newErrors.price = 'Giá không được âm';
    } else if (formData.price > 50000000) { // Increased max price for VND
      newErrors.price = 'Giá không được vượt quá 50,000,000 VND';
    }

    // Description validation
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Mô tả không được vượt quá 1000 ký tự';
    }

    // Skill type validation
    if (formData.package_type === 'single_skill' && !formData.skill_type) {
      newErrors.skill_type = 'Vui lòng chọn loại kỹ năng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = isCreate 
        ? 'http://localhost:8000/admin/vip/packages' 
        : `http://localhost:8000/admin/vip/packages/${packageData.package_id}`;
      
      // Build query parameters
      const params = new URLSearchParams({
        name: formData.name,
        duration_months: formData.duration_months.toString(),
        price: formData.price.toString(),
        package_type: formData.package_type,
        is_active: formData.is_active.toString()
      });

      // Add optional parameters
      if (formData.description) {
        params.append('description', formData.description);
      }
      
      if (formData.package_type === 'single_skill' && formData.skill_type) {
        params.append('skill_type', formData.skill_type);
      }

      // Append query parameters to URL
      url = `${url}?${params.toString()}`;

      const response = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Không thể lưu gói dịch vụ');
      }

      toast.success(isCreate ? 'Tạo gói dịch vụ thành công!' : 'Cập nhật gói dịch vụ thành công!');
      onSuccess();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {isCreate ? 'Tạo Gói Dịch Vụ Mới' : 'Chỉnh Sửa Gói Dịch Vụ'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên gói*
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent`}
              placeholder="VD: Gói Cao Cấp Hàng Tháng"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại gói*
            </label>
            <select
              name="package_type"
              value={formData.package_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all_skills">Tất cả kỹ năng</option>
              <option value="single_skill">Một kỹ năng</option>
            </select>
          </div>
          
          {formData.package_type === 'single_skill' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại kỹ năng*
              </label>
              <select
                name="skill_type"
                value={formData.skill_type || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Chọn kỹ năng</option>
                <option value="reading">Đọc</option>
                <option value="writing">Viết</option>
                <option value="listening">Nghe</option>
              </select>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thời hạn (tháng)*
            </label>
            <input
              type="number"
              name="duration_months"
              value={formData.duration_months}
              onChange={handleChange}
              required
              min="1"
              className={`w-full px-3 py-2 border ${errors.duration_months ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent`}
            />
            {errors.duration_months && (
              <p className="mt-1 text-xs text-red-500">{errors.duration_months}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá (VND)*
            </label>
            <div className="relative">
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="1000"
                className={`w-full px-3 py-2 border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent pr-12`}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                VND
              </span>
            </div>
            {errors.price && (
              <p className="mt-1 text-xs text-red-500">{errors.price}</p>
            )}
            {formData.price > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.price)}
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent`}
              placeholder="Mô tả gói dịch vụ (không bắt buộc)"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description}</p>
            )}
          </div>
          
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Hoạt động
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-violet-600 text-white rounded-md text-sm font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <Check size={18} className="mr-2" />
                  {isCreate ? 'Tạo gói' : 'Cập nhật gói'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageFormModal;