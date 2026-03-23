import React, { useState } from 'react';
import CustomSelect from './ui/CustomSelect';
import { ImagePlus } from 'lucide-react';
import ProductImage from './ui/ProductImage';
import { useModal } from './ui/ModalProvider';

const ProductModal = ({ isOpen, onClose, onSubmit, initialData = null, categories = [] }) => {
  const { showModal } = useModal();
  
  // Default to empty strings for "请选择"
  const defaultCategoryId = '';
  const defaultSubCategory = '';

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    image: '',
    category_id: defaultCategoryId,
    sub_category: defaultSubCategory,
    remark: ''
  });

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          price: initialData.price || '',
          image: initialData.image || null,
          category_id: initialData.category_id || defaultCategoryId,
          sub_category: initialData.sub_category || defaultSubCategory,
          remark: initialData.remark || ''
        });
      } else {
        setFormData({
          name: '',
          price: '',
          image: '',
          category_id: defaultCategoryId,
          sub_category: defaultSubCategory,
          remark: ''
        });
      }
    }
  }, [isOpen, initialData, defaultCategoryId, defaultSubCategory]);

  if (!isOpen) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 检查文件大小，如果大于 10MB，给出友好提示并拦截
      const limitSize = 10 * 1024 * 1024; // 10MB
      if (file.size > limitSize) {
        showModal({
          title: '哎呀！',
          content: '图片太大了，不能超过 10MB 哦！请换一张小一点的图~ 🐷',
          type: 'info'
        });
        // 清空 input 的值，以便下次选择同一张图片时仍能触发 onChange
        e.target.value = '';
        return;
      }

      // 无论多大，都进行前端压缩以节省服务器空间和提升加载速度
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // 设置最大宽高为 800px 进行压缩
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // 统一压缩为 jpeg，质量 0.7
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData({ ...formData, image: dataUrl });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 前端校验
    if (!formData.name.trim()) {
      showModal({
        title: '提示',
        content: '商品名称不能为空哦！',
        type: 'info',
        confirmText: '知道了'
      });
      return;
    }
    
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      showModal({
        title: '提示',
        content: '请输入有效的价格！',
        type: 'info',
        confirmText: '知道了'
      });
      return;
    }
    
    onSubmit(formData);
    onClose();
  };

  // Find current selected category to show its sub-categories
  const currentCategory = categories.find(c => c.id.toString() === formData.category_id.toString());
  const subCategories = currentCategory ? currentCategory.sub : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] border-4 border-white shadow-2xl p-6 w-full max-w-sm animate-fade-in-up">
        <h3 className="text-xl font-black text-piggy-pink-dark mb-4 text-center">
          {initialData ? '编辑美食' : '添加新美食'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-1">名称</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border-2 border-pink-100 focus:border-piggy-pink outline-none font-bold"
              placeholder="例如：红烧肉"
            />
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-500 mb-1">价格</label>
              <input 
                type="number" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border-2 border-pink-100 focus:border-piggy-pink outline-none font-bold"
                placeholder="¥"
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-bold text-gray-500 mb-1">图片</label>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 rounded-xl border-2 border-pink-100 flex items-center justify-center overflow-hidden bg-white shrink-0">
                   <ProductImage src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="relative flex-shrink-0 w-11 h-11 bg-pink-100 rounded-xl flex items-center justify-center text-pink-500 hover:bg-pink-200 transition cursor-pointer overflow-hidden">
                  <ImagePlus size={20} />
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="点击上传图片"
                  />
                </div>
              </div>
              <input 
                type="text" 
                value={formData.image && typeof formData.image === 'string' && !(formData.image.startsWith('http') || formData.image.startsWith('data:') || formData.image.startsWith('/')) ? formData.image : ''}
                onChange={e => setFormData({...formData, image: e.target.value})}
                className="w-full mt-2 px-2 py-1 rounded-lg border-2 border-pink-50 focus:border-piggy-pink outline-none font-bold text-center text-xs text-gray-400 placeholder-pink-200"
                placeholder="输入Emoji"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-bold text-gray-500 mb-1">分类</label>
              <CustomSelect 
                options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                value={formData.category_id}
                onChange={value => {
                  const cat = categories.find(c => c.id.toString() === value.toString());
                  setFormData({...formData, category_id: value, sub_category: cat ? cat.sub[1] || '全部' : '全部'});
                }}
                placeholder="请选择"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-bold text-gray-500 mb-1">子分类</label>
              <CustomSelect 
                options={subCategories.filter(s => s !== '全部').map(sub => ({ value: sub, label: sub }))}
                value={formData.sub_category}
                onChange={value => setFormData({...formData, sub_category: value})}
                placeholder="请选择"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-500 mb-1">备注</label>
            <input 
              type="text" 
              value={formData.remark || ''}
              onChange={e => setFormData({...formData, remark: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border-2 border-pink-100 focus:border-piggy-pink outline-none font-bold"
              placeholder="例如：少糖，或者特定品牌的描述"
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

export default ProductModal;
