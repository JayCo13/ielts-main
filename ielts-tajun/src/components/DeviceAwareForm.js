import React from 'react';
import { useDeviceCheck } from './DeviceCheckProvider';

const DeviceAwareForm = ({ 
  onSubmit, 
  children, 
  className = '',
  ...props 
}) => {
  const { withDeviceCheck, isCheckingDevice } = useDeviceCheck();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create a device-aware submit handler
    const deviceAwareSubmit = withDeviceCheck((event) => {
      if (onSubmit) {
        onSubmit(event);
      }
    });
    
    deviceAwareSubmit(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${className} ${isCheckingDevice ? 'pointer-events-none opacity-75' : ''}`}
      {...props}
    >
      {children}
      {isCheckingDevice && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700">Đang kiểm tra thiết bị...</span>
          </div>
        </div>
      )}
    </form>
  );
};

export default DeviceAwareForm;