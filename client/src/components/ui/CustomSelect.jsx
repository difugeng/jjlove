import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

const CustomSelect = ({ options, value, onChange, placeholder = '请选择', allowClear = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value.toString() === value?.toString());

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Select trigger button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all bg-white
          ${isOpen ? 'border-piggy-pink shadow-sm ring-2 ring-pink-100' : 'border-pink-100 hover:border-pink-200'}`}
      >
        <span className={`font-bold truncate pr-4 flex-1 text-left ${selectedOption ? 'text-gray-800' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center space-x-1 shrink-0">
          {allowClear && selectedOption && (
            <div 
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-pink-100 text-gray-300 hover:text-pink-500 transition-colors"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown 
            size={18} 
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-pink-100 rounded-xl shadow-xl overflow-hidden animate-fade-in-up origin-top max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.value.toString() === value?.toString();
            return (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-4 py-3 flex justify-between items-center cursor-pointer transition-colors border-b border-pink-50 last:border-b-0
                  ${isSelected ? 'bg-pink-50 text-piggy-pink-dark' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <span className={`font-bold ${isSelected ? 'font-black' : ''}`}>
                  {option.label}
                </span>
                {isSelected && <Check size={16} className="text-piggy-pink-dark" />}
              </div>
            );
          })}
          {options.length === 0 && (
            <div className="px-4 py-3 text-gray-400 text-sm font-bold text-center">
              没有选项哦~
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
