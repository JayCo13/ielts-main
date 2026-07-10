import React from 'react';
import { useDeviceCheck } from './DeviceCheckProvider';

const DeviceAwareButton = ({ 
  onClick, 
  children, 
  disabled = false, 
  className = '', 
  type = 'button',
  ...props 
}) => {
  const { withDeviceCheck, isCheckingDevice } = useDeviceCheck();

  const handleClick = withDeviceCheck(onClick);

  const isDisabled = disabled || isCheckingDevice;

  const defaultClassName = `
    px-4 py-2 rounded-lg font-medium transition-all duration-200
    ${isDisabled 
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
    }
    ${isCheckingDevice ? 'opacity-75' : ''}
  `.trim();

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={className || defaultClassName}
      {...props}
    >
      {isCheckingDevice ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Đang kiểm tra...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default DeviceAwareButton;