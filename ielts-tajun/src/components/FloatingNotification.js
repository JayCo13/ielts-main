import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import {Bell, ZoomIn, X} from 'lucide-react';
import { createPortal } from 'react-dom';
import 'swiper/css';
import 'swiper/css/pagination';
import './FloatingNotification.css';
import { API_BASE } from '../config/api';
// Remove ImagePreviewModal import as we're creating our own

// Create a new NotificationImageModal component for full screen display
const NotificationImageModal = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-50 p-2 bg-black bg-opacity-50 rounded-full"
        aria-label="Close modal"
      >
        <X size={28} strokeWidth={2} />
      </button>
      
      <img 
        src={imageUrl} 
        alt="Notification image" 
        className="w-screen h-screen object-contain"
      />
    </div>,
    document.body
  );
};

const FloatingNotification = ({ notifications = [], onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Reset visibility when new notifications arrive
    setIsVisible(true);
  }, [notifications]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose(); // This will now set lastClosedTime in the context
  };

  useEffect(() => {
    if (isVisible && notifications.length > 0) {
      // Auto-hide after 30 minutes of being visible
      const timer = setTimeout(() => {
        handleClose();
      }, 1800000); // 30 minutes in milliseconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, notifications]);

  // Group notifications by day
  const groupedNotifications = {};
  notifications.forEach(notification => {
    // Extract date from notification (assuming there's a created_at field)
    const date = notification.created_at ?
      new Date(notification.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) : 'Today';

    if (!groupedNotifications[date]) {
      groupedNotifications[date] = [];
    }
    groupedNotifications[date].push(notification);
  });

  // Convert grouped notifications to array for Swiper
  const notificationGroups = Object.entries(groupedNotifications).map(([date, items]) => ({
    date,
    items
  }));

  return (
    <AnimatePresence>
      {isVisible && notifications.length > 0 && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.95 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
            mass: 0.5
          }}
          className="fixed top-40 right-3 -translate-x-1/2 z-50 pointer-events-auto w-full max-w-[90vw] sm:max-w-md px-4"
        >
          <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-4 min-w-[300px] max-w-md relative">
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-full p-1 hover:bg-gray-100 focus:outline-none z-10"
              aria-label="Đóng thông báo"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <Swiper
              modules={[Autoplay, Pagination]}
              spaceBetween={30}
              slidesPerView={1}
              pagination={{
                clickable: true,
                dynamicBullets: true
              }}
              autoplay={{
                delay: 8000,
                disableOnInteraction: false
              }}
              loop={notificationGroups.length > 1}
              className="notification-swiper"
            >
              {notificationGroups.map((group, groupIndex) => (
                <SwiperSlide key={`group-${groupIndex}`}>
                  <div className="notification-date text-xs text-gray-500 mb-3"> <Bell className="inline-block size-4" strokeWidth={3} /> Thông báo ngày: {group.date}</div>

                  {group.items.length > 1 ? (
                    <Swiper
                      modules={[Autoplay]}
                      spaceBetween={20}
                      slidesPerView={1}
                      autoplay={{
                        delay: 5000,
                        disableOnInteraction: false
                      }}
                      loop={group.items.length > 1}
                      nested={true}
                      className="nested-notification-swiper"
                    >
                      {group.items.map((notification, index) => (
                        <SwiperSlide key={`notification-${index}`}>
                          <NotificationItem notification={notification} />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  ) : (
                    <NotificationItem notification={group.items[0]} />
                  )}
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Extracted notification item component
const NotificationItem = ({ notification }) => {
  const { content, type = 'announcement', image_url } = notification;
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const handleImageClick = (e) => {
    e.stopPropagation(); // Stop event propagation
    setIsImageModalOpen(true);
  };
  
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex flex-col">
        <p className={`font-medium
          ${type === 'update' ? 'text-green-700' : ''}
          ${type === 'announcement' ? 'text-blue-700' : ''}
          ${type === 'maintenance' ? 'text-orange-700' : ''}
        `}>{content}</p>
        {image_url && (
          <div 
            className="relative cursor-pointer"
            onClick={handleImageClick}
          >
            <img 
              src={`${API_BASE}${image_url}`}
              alt="Notification image"
              className="rounded-lg w-full max-w-[600px] max-h-[50vh] object-contain mx-auto transition-transform duration-300 hover:scale-105"
            /> 
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg">
              <ZoomIn className="text-white absolute top-2 right-2 bg-black bg-opacity-40 p-1 rounded-full" size={24} strokeWidth={3}/>
            </div>
 
          </div>
        )}
      </div>
      
      {/* Use our new NotificationImageModal for full screen display */}
      <NotificationImageModal 
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={image_url ? `${API_BASE}${image_url}` : ''}
      />
    </div>
  );
};

export default FloatingNotification;
