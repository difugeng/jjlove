import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState([]);

  const showModal = useCallback((options) => {
    const id = Date.now().toString();
    setModals(prev => [...prev, { ...options, id }]);
  }, []);

  const closeModal = useCallback((id) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      
      {/* 渲染所有活跃的 Modal */}
      <AnimatePresence>
        {modals.map(modal => (
          <div key={modal.id} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => closeModal(modal.id)}
            />
            
            <div
              className="bg-white rounded-[2rem] border-4 border-white shadow-2xl p-6 w-full max-w-sm relative z-10 transition-transform duration-300 transform scale-100"
            >
              <div className="bg-piggy-bg absolute inset-0 -z-10 opacity-50" />
              
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-black text-piggy-pink-dark">
                  {modal.title || '提示'}
                </h3>
                {modal.showClose && (
                  <button 
                    onClick={() => closeModal(modal.id)}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="text-gray-600 font-bold mb-6 whitespace-pre-wrap text-center">
                {modal.content}
              </div>
              
              <div className="flex space-x-3">
                {modal.type === 'confirm' ? (
                  <>
                    <button 
                      onClick={() => {
                        const shouldClose = modal.onCancel ? modal.onCancel() : true;
                        if (shouldClose !== false) {
                          closeModal(modal.id);
                        }
                      }}
                      className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition"
                    >
                      {modal.cancelText || '取消'}
                    </button>
                    <button 
                      onClick={() => {
                        const shouldClose = modal.onConfirm ? modal.onConfirm() : true;
                        if (shouldClose !== false) {
                          closeModal(modal.id);
                        }
                      }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-piggy-pink to-pink-400 text-white font-bold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
                    >
                      {modal.confirmText || '确定'}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      const shouldClose = modal.onConfirm ? modal.onConfirm() : true;
                      if (shouldClose !== false) {
                        closeModal(modal.id);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-piggy-pink to-pink-400 text-white font-bold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
                  >
                    {modal.confirmText || '知道了'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useModal = () => useContext(ModalContext);
