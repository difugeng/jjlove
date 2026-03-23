import React, { useState } from 'react';

const CategoryModal = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [subStr, setSubStr] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const sub = subStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
    if (!sub.includes('全部')) sub.unshift('全部');
    
    onSubmit({ name, sub });
    setName('');
    setSubStr('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] border-4 border-white shadow-2xl p-6 w-full max-w-sm animate-fade-in-up">
        <h3 className="text-xl font-black text-piggy-pink-dark mb-4 text-center">
          添加新分类 📂
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-1">一级分类</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border-2 border-pink-100 focus:border-piggy-pink outline-none font-bold"
              placeholder="例如：🥐 早餐"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-500 mb-1">二级分类 (支持中英文逗号分隔，选填)</label>
            <textarea 
              value={subStr}
              onChange={e => setSubStr(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border-2 border-pink-100 focus:border-piggy-pink outline-none font-bold h-24"
              placeholder="例如：主食, 饮品，汤羹"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white text-gray-500 font-bold rounded-xl border-2 border-gray-200 shadow-sm active:scale-95 transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-piggy-pink text-white font-bold rounded-xl border-2 border-piggy-pink-dark shadow-piggy-btn active:translate-y-[2px] active:shadow-none transition"
            >
              保存 ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
