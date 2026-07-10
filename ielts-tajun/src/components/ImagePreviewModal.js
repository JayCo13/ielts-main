import React from 'react';
import { X } from 'lucide-react';

const ImagePreviewModal = ({ isOpen, onClose, imageUrl, altText }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X size={24} />
        </button>
        <img 
          src={imageUrl} 
          alt={altText} 
          className="w-[450px] h-auto rounded-lg object-contain mx-auto"
        />
      </div>
    </div>
  );
};

export default ImagePreviewModal;
