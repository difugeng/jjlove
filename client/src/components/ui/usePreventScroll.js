import { useEffect } from 'react';

const usePreventScroll = (isOpen) => {
  useEffect(() => {
    if (isOpen) {
      // 保存当前的滚动状态
      const originalStyle = window.getComputedStyle(document.body).overflow;
      
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
      
      // 清理函数：恢复滚动状态
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);
};

export default usePreventScroll;