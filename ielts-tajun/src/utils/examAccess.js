export const checkExamAccess = (userRole, isVIP, examAccessType, examHistory) => {
  if (!examAccessType) return { canAccess: true };

  if (userRole === 'student' && examAccessType === 'student') {
    return { canAccess: true };
  }

  if (userRole === 'customer') {
    if (examAccessType === 'no_vip') {
      const noVipCount = examHistory.filter(exam => 
        exam.exam_access_type === 'no_vip' && exam.is_completed
      ).length;
      
      if (noVipCount >= 2 && !isVIP) {
        return {
          canAccess: false,
          message: 'You have reached the maximum number of free tests'
        };
      }
      return { canAccess: true };
    }

    if (examAccessType === 'vip' && isVIP) {
      return { canAccess: true };
    }
  }

  return {
    canAccess: false,
    message: isVIP ? 'Access not allowed' : 'VIP access required'
  };
};

export const getNoVipExamCount = (userRole, examHistory) => {
  if (userRole !== 'customer') return Infinity;
  
  return examHistory.filter(exam => 
    exam.exam_access_type === 'no_vip'
  ).length;
};

export const canAccessExam = (userRole, isVIP, examAccessType, examHistory) => {
  if (!checkExamAccess(userRole, isVIP, examAccessType)) {
    return {
      canAccess: false,
      message: 'You do not have permission to access this exam.'
    };
  }

  if (userRole === 'customer' && !isVIP && examAccessType === 'no_vip') {
    const noVipCount = getNoVipExamCount(userRole, examHistory);
    if (noVipCount >= 2) {
      return {
        canAccess: false,
        message: 'You have reached the maximum number of free exams. Please upgrade to VIP to access more exams.'
      };
    }
  }

  return {
    canAccess: true,
    message: ''
  };
};