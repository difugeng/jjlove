import React from 'react';

const ProductImage = ({ src, alt = 'image', className = 'w-full h-full object-cover rounded-xl' }) => {
  if (!src) return <span>🍽️</span>;
  
  // 处理相对路径的图片
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('/') || src.startsWith('uploads/')) {
    // 对于相对路径的图片，添加基础URL
    const imgSrc = src.startsWith('uploads/') ? `/jjlove/${src}` : src;
    return <img src={imgSrc} alt={alt} className={className} />;
  }
  
  // Emoji or text
  return <span>{src}</span>;
};

export default ProductImage;
