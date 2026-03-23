import React, { createContext, useContext, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const ImagePreviewContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useImagePreview = () => useContext(ImagePreviewContext);

export const ImagePreviewProvider = ({ children }) => {
  const [previewData, setPreviewData] = useState(null); // { image: string, title: string }

  const showPreview = (image, title = '') => {
    setPreviewData({ image, title });
  };

  const closePreview = () => {
    setPreviewData(null);
  };

  // 检查是否是Emoji
  // 如果是空值、undefined，或者是单纯的文本（非 http 且非 data:），我们都当成 Emoji/文本处理
  const isEmoji = !previewData?.image || 
                  (typeof previewData.image === 'string' && 
                   !previewData.image.startsWith('http') && 
                   !previewData.image.startsWith('data:'));

  return (
    <ImagePreviewContext.Provider value={{ showPreview, closePreview }}>
      {children}
      <AnimatePresence>
        {previewData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity duration-300"
              onClick={closePreview}
            />
            
            <div
              className="relative z-10 flex flex-col items-center max-w-full max-h-full pointer-events-none transition-transform duration-300 transform scale-100"
            >
              {isEmoji ? (
                <div className="text-[150px] leading-none drop-shadow-2xl animate-bounce-slow">
                  {previewData.image || '🍽️'}
                </div>
              ) : (
                <img 
                  src={previewData.image} 
                  alt="Preview" 
                  className="max-w-[90vw] max-h-[70vh] object-contain rounded-3xl border-4 border-white shadow-2xl pointer-events-auto"
                  onError={(e) => {
                    // 如果图片加载失败（比如无效链接），回退显示默认 emoji
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-[150px] leading-none drop-shadow-2xl animate-bounce-slow">🍽️</div>';
                  }}
                />
              )}
              
              {previewData.title && (
                <div className="mt-6 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30 shadow-lg pointer-events-auto">
                  <p className="text-white font-bold text-xl drop-shadow-md">
                    {previewData.title}
                  </p>
                </div>
              )}
              
              <button 
                onClick={closePreview}
                className="absolute -top-12 right-0 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 transition-colors pointer-events-auto"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </ImagePreviewContext.Provider>
  );
};
