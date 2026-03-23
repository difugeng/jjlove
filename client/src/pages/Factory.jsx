import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useModal } from '../components/ui/ModalProvider';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import CategoryModal from '../components/CategoryModal';
import ProductImage from '../components/ui/ProductImage';

import { useImagePreview } from '../components/ui/ImagePreviewProvider';

const Factory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showModal } = useModal();
  const { showPreview } = useImagePreview();
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'categories'
  const [categories, setCategories] = useState([]);
  const [originalCategories, setOriginalCategories] = useState([]); // 原始分类数据，不包含未分类
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 分类相关状态
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSub, setActiveSub] = useState('全部');

  // 分页相关状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchCategoriesWithUncategorized = async () => {
    try {
      const catRes = await api.getCategories();
      
      // 保存原始分类数据（不包含未分类）
      setOriginalCategories(catRes.data.categories);
      
      // 检查是否有未分类商品
      const uncategorizedRes = await api.getProducts('uncategorized', 1, 1);
      const hasUncategorized = uncategorizedRes.data.data.products.length > 0;
      
      const categoriesWithUncategorized = [...catRes.data.categories];
      
      if (hasUncategorized) {
        categoriesWithUncategorized.push({ id: 'uncategorized', name: '未分类', sub: ['全部'] });
      }
      
      setCategories(categoriesWithUncategorized);
      
      if (categoriesWithUncategorized.length > 0 && !activeCategory) {
        setActiveCategory(categoriesWithUncategorized[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      // 先获取分类和未分类状态
      await fetchCategoriesWithUncategorized();
      
      // 然后获取商品数据
      const prodRes = await api.getProducts(activeCategory, isInitial ? 1 : page, 10, activeSub);
      
      if (isInitial) {
        setProducts(prodRes.data.data.products);
      } else {
        setProducts(prev => [...prev, ...prodRes.data.data.products]);
      }
      
      // 检查是否还有更多数据
      setHasMore(prodRes.data.data.products.length === 10);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 滚动加载更多
  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && activeTab === 'products') {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isLoadingMore, activeTab]);

  // 监听页面变化，加载更多数据
  useEffect(() => {
    if (page > 1 && activeTab === 'products') {
      fetchData(false);
    }
  }, [page, activeTab]);

  // 监听标签切换，重置分页
  useEffect(() => {
    if (activeTab === 'products') {
      setPage(1);
      setHasMore(true);
      fetchData(true);
    }
  }, [activeTab]);

  // 监听分类变化，重置分页并重新加载
  useEffect(() => {
    if (activeTab === 'products' && activeCategory) {
      setPage(1);
      setHasMore(true);
      fetchData(true);
    }
  }, [activeCategory, activeTab]);

  // 监听子分类变化，重置分页并重新加载
  useEffect(() => {
    if (activeTab === 'products' && activeCategory) {
      setPage(1);
      setHasMore(true);
      fetchData(true);
    }
  }, [activeSub, activeCategory, activeTab]);

  // --- Product Management ---
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (product) => {
    showModal({
      title: '删除美食',
      content: `确定要删除 ${product.name} 吗？😱`,
      type: 'confirm',
      confirmText: '删掉',
      cancelText: '留着',
      onConfirm: async () => {
        try {
          await api.deleteProduct(product.id);
          // 删除后刷新当前页数据
          setPage(1);
          setHasMore(true);
          fetchData(true);
        } catch (err) {
          console.error(err);
          showModal({ title: '哎呀！', content: '删除美食失败 😭', type: 'info', confirmText: '知道了' });
        }
      }
    });
  };

  const handleSaveProduct = async (formData) => {
    try {
      if (editingProduct) {
        // 编辑商品：只更新本地数据，不刷新整个列表
        const updatedProduct = await api.updateProduct(editingProduct.id, formData);
        // 在本地更新商品数据
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === editingProduct.id 
              ? { ...product, ...formData } 
              : product
          )
        );
        // 重新检查未分类商品状态
        await fetchCategoriesWithUncategorized();
      } else {
        // 添加商品：保持现有逻辑，全量刷新列表
        await api.addProduct(formData);
        setPage(1);
        setHasMore(true);
        fetchData(true);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
      showModal({ title: '哎呀！', content: '保存失败 😭', type: 'info', confirmText: '知道了' });
    }
  };

  // --- Category Management ---
  const handleAddCategory = () => {
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (data) => {
    try {
      await api.addCategory(data);
      // 重新加载数据，包括分类和商品
      setPage(1);
      setHasMore(true);
      fetchData(true);
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error(err);
      showModal({ title: '哎呀！', content: '添加分类失败 😭', type: 'info', confirmText: '知道了' });
    }
  };

  const handleDeleteCategory = (cat) => {
    showModal({
      title: '删除分类',
      content: `确定要删除分类 ${cat.name} 吗？这可能会影响该分类下的菜品哦！😱`,
      type: 'confirm',
      onConfirm: async () => {
        try {
          await api.deleteCategory(cat.id);
          // 重新加载数据，包括分类和商品
          setPage(1);
          setHasMore(true);
          // 如果删除的是当前选中的分类，重置分类选择
          if (activeCategory === cat.id) {
            setActiveCategory(null);
            setActiveSub('全部');
          }
          fetchData(true);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // 滚动到底部加载更多
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  return (
    <div className="min-h-screen bg-piggy-bg pb-24 font-piggy">
      {/* Header */}
      <div className="bg-white p-6 pb-4 border-b-4 border-pink-100 sticky top-0 z-40">
        <div className="flex items-center space-x-3 mb-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-200 text-pink-400 shadow-sm active:translate-y-0.5 active:shadow-none transition flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-piggy-pink-dark leading-none">
              {user.name || 'Admin'}
            </h1>
            <div className="text-xs font-bold text-gray-400 mt-1">
              饲料厂
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-4">
          <button 
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2 rounded-xl font-bold border-2 transition-all ${activeTab === 'products' ? 'bg-piggy-pink text-white border-piggy-pink-dark shadow-piggy-btn' : 'bg-white text-gray-500 border-pink-200'}`}
          >
            🍔 饲料管理
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2 rounded-xl font-bold border-2 transition-all ${activeTab === 'categories' ? 'bg-piggy-pink text-white border-piggy-pink-dark shadow-piggy-btn' : 'bg-white text-gray-500 border-pink-200'}`}
          >
            📂 分类体系
          </button>
        </div>

        {/* Sticky Action Buttons */}
        {activeTab === 'products' ? (
          <>
            {/* Categories */}
            <div className="flex space-x-3 overflow-x-auto pb-4 pt-1 hide-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setActiveSub('全部'); }}
                  className={`px-5 py-2 rounded-2xl font-bold whitespace-nowrap border-2 shadow-sm transition-all active:translate-y-0.5 ${
                    activeCategory === cat.id 
                      ? 'bg-piggy-bg text-piggy-pink-dark border-piggy-pink-dark' 
                      : 'bg-white text-piggy-pink border-pink-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Sub Categories */}
            <div className="flex space-x-3 px-1 pb-2 text-sm font-bold overflow-x-auto hide-scrollbar items-center">
              {categories.find(c => c.id === activeCategory)?.sub.map(sub => (
                <span 
                  key={sub}
                  onClick={() => setActiveSub(sub)}
                  className={`cursor-pointer pb-1 border-b-2 transition-colors shrink-0 ${
                    activeSub === sub 
                      ? 'text-piggy-pink-dark border-piggy-pink-dark' 
                      : 'text-pink-300 border-transparent hover:text-pink-400'
                  }`}
                >
                  {sub}
                </span>
              ))}
            </div>

            <button 
              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
              className="w-full py-3 rounded-[1.5rem] border-2 border-dashed border-pink-300 text-pink-400 font-bold bg-white/50 hover:bg-white transition flex items-center justify-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <Plus size={20} />
              </div>
              添加新美食
            </button>
          </>
        ) : (
          <button 
            onClick={handleAddCategory}
            className="w-full py-3 rounded-[1.5rem] border-2 border-dashed border-pink-300 text-pink-400 font-bold bg-white/50 hover:bg-white transition flex items-center justify-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
              <Plus size={20} />
            </div>
            添加分类
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-10 font-bold text-xl text-piggy-pink animate-pulse">加载中... 🐷</div>
        ) : activeTab === 'products' ? (
          <>
            {products.length === 0 ? (
              <div className="text-center py-10 font-bold text-xl text-piggy-pink">
                <div className="text-6xl mb-4">😢</div>
                当前分类下没有商品
              </div>
            ) : (
              products.map(product => {
                const catName = categories.find(c => c.id === product.category_id)?.name || '未知分类';
                const isNew = product.create_time && (Date.now() - new Date(product.create_time.replace(/-/g, '/')).getTime() < 48 * 60 * 60 * 1000);
                
                return (
                  <div key={product.id} className="piggy-card p-3 flex items-center space-x-4 relative">
                    {isNew && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-sm z-10 animate-bounce">
                        NEW
                      </div>
                    )}
                    <div 
                      onClick={() => showPreview(product.image, product.name)}
                      className="w-20 h-20 bg-pink-50 rounded-xl flex items-center justify-center text-4xl border-2 border-pink-100 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    >
                      <ProductImage src={product.image} alt={product.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-piggy-pink-dark truncate">{product.name}</h3>
                      <p className="text-xs text-pink-400 mt-1">{catName} - {product.sub_category}</p>
                      {product.remark && (
                        <p className="text-[11px] text-gray-400 mt-1 bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100 truncate max-w-full">
                          📝 {product.remark}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-piggy-pink-dark text-lg font-black">¥ {product.price}</span>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditProduct(product)}
                            className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center border-2 border-blue-200"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product)}
                            className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center border-2 border-red-200"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* 加载更多指示器 */}
            {isLoadingMore && (
              <div className="text-center py-4">
                <div className="text-piggy-pink animate-pulse">加载更多... 🐷</div>
              </div>
            )}
            
            {!hasMore && products.length > 0 && (
              <div className="text-center py-4 text-gray-400">
                已经到底啦 🎉
              </div>
            )}
          </>
        ) : (
          <>
            {originalCategories.length === 0 ? (
              <div className="text-center py-10 font-bold text-xl text-piggy-pink">
                <div className="text-6xl mb-4">😢</div>
                还没有分类，点击下方按钮添加
              </div>
            ) : (
              originalCategories.map(cat => (
                <div key={cat.id} className="bg-white rounded-2xl border-3 border-pink-200 p-4 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-black text-piggy-pink-dark">{cat.name}</h3>
                    <button onClick={() => handleDeleteCategory(cat)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.sub.map(s => (
                      <span key={s} className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs font-bold border border-pink-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      <ProductModal 
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={handleSaveProduct}
        initialData={editingProduct}
        categories={originalCategories}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleSaveCategory}
      />
    </div>
  );
};

export default Factory;