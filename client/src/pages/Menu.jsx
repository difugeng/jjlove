import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBasket, Plus, Minus, User, BellRing, Award, X, CornerDownRight, ScrollText, Menu as MenuIcon } from 'lucide-react';
import { useModal } from '../components/ui/ModalProvider';
import { useNavigate } from 'react-router-dom';
import { useImagePreview } from '../components/ui/ImagePreviewProvider';
import ProductImage from '../components/ui/ProductImage';

const Menu = () => {
  const { user, logout } = useAuth();
  const { cart, addToCart, removeFromCart, addBackupToItem, removeBackupFromItem, totalItems, totalPrice, clearCart, updateCartItemQuantity, removeCartItemCompletely, updateBackupQuantity } = useCart();
  const { showModal } = useModal();
  const { showPreview } = useImagePreview();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSub, setActiveSub] = useState('全部');
  const [loading, setLoading] = useState(true);
  
  // 分页相关状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Checkout Drawer State
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  
  // Backup Selection State
  const [selectingBackupFor, setSelectingBackupFor] = useState(null);
  
  // Menu State
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchProducts = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      // 当isInitial为true时，强制使用page=1
      const currentPage = isInitial ? 1 : page;
      const res = await api.getProducts(activeCategory, currentPage, 10, activeSub);
      
      if (isInitial) {
        setProducts(res.data.data.products);
        // 重新检查未分类商品状态，确保未分类标签能及时显示
        await fetchCategoriesWithUncategorized();
      } else {
        setProducts(prev => [...prev, ...res.data.data.products]);
      }
      
      // 检查是否还有更多数据
      setHasMore(res.data.data.products.length === 10);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (activeCategory) {
      // 分类切换时重置分页
      setPage(1);
      setHasMore(true);
      fetchProducts(true);
    }
  }, [activeCategory]); // Removed fetchProducts to fix infinite loop warning, it's defined inside component and uses state

  // 监听页面变化，加载更多数据
  useEffect(() => {
    if (page > 1 && activeCategory) {
      fetchProducts(false);
    }
  }, [page, activeCategory]);

  // 监听子分类变化，重置分页并重新加载
  useEffect(() => {
    if (activeCategory) {
      setPage(1);
      setHasMore(true);
      fetchProducts(true);
    }
  }, [activeSub, activeCategory]);

  // 滚动加载更多
  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 && hasMore && !isLoadingMore) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore]);

  const fetchCategoriesWithUncategorized = async () => {
    try {
      const res = await api.getCategories();
      
      // Check if there are any uncategorized products before adding the tab
      const productsRes = await api.getProducts('uncategorized');
      const hasUncategorized = productsRes.data.data.products.length > 0;
      
      let categoriesWithUncategorized = [...res.data.categories];
      
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

  const fetchInitialData = async () => {
    await fetchCategoriesWithUncategorized();
  };

  const filteredProducts = activeSub === '全部' 
    ? products 
    : products.filter(p => p.sub_category === activeSub || (activeCategory === 'uncategorized' && !p.sub_category));

  const submitOrder = async () => {
    if (cart.length === 0) return;
    try {
      const res = await api.createOrder({
        user_id: user.id,
        items: cart, // cart now contains backups array inside items
        total_price: totalPrice,
        note: orderNote
      });
      if (res.data.success) {
        showModal({
          title: '点单成功！🎉',
          content: '订单已发送给大宝贝！🐷',
          type: 'info',
          confirmText: '好耶'
        });
        clearCart();
        setShowCheckout(false);
        setOrderNote('');
      }
    } catch (err) {
      console.error(err);
      showModal({
        title: '哎呀！',
        content: '发送失败，请重试 😭',
        type: 'info',
        confirmText: '知道了'
      });
    }
  };

  const handleSelectBackup = (product) => {
    if (selectingBackupFor) {
      addBackupToItem(selectingBackupFor.id, product);
      setSelectingBackupFor(null);
      showModal({ title: '备选添加成功', content: `已将 ${product.name} 添加为备选！`, type: 'info' });
    }
  };

  const handleBlindBox = () => {
    // 盲盒逻辑修改：只在当前筛选列表（filteredProducts）中随机
    if (filteredProducts.length === 0) {
      showModal({
        title: '哎呀！',
        content: '当前分类下没有可以抽的菜品哦 😭',
        type: 'info',
        confirmText: '知道了'
      });
      return;
    }

    drawBlindBox();
  };

  const drawBlindBox = () => {
    const randomProduct = filteredProducts[Math.floor(Math.random() * filteredProducts.length)];
    
    showModal({
      title: '🎉 惊喜盲盒 🎉',
      content: `为你抽中了：${randomProduct.name}\n要不要来一份？`,
      type: 'confirm',
      confirmText: '加入购物车',
      cancelText: '重新抽',
      showClose: true,
      onConfirm: () => {
        addToCart(randomProduct);
        showModal({
          title: '加入成功！',
          content: `${randomProduct.name} 已经在购物车等你啦 🐷`,
          type: 'info',
          confirmText: '好耶'
        });
      },
      onCancel: () => {
        // 直接重新抽盲盒，不关闭弹框
        drawBlindBox();
      }
    });
  };

  const handleUrge = () => {
    showModal({
      title: '饿饿，饭饭！🥺',
      content: '已经发送催单电波给大宝贝啦！',
      type: 'info',
      confirmText: '乖乖等饭'
    });
  };

  // 不再在菜单页支持编辑功能，仅限点单
  // 但我们可以显示工厂按钮让采购方跳转过去
  const canEdit = user.role === 'purchaser';

  return (
    <div className="min-h-screen bg-piggy-bg pb-24 font-piggy relative">
      {/* Header - Style C */}
      <div className="bg-white p-6 pb-2 border-b-4 border-pink-100 sticky top-0 z-40">
        <div className="flex justify-between items-center mb-4 relative">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-pink-200 rounded-full flex items-center justify-center border-2 border-pink-400 overflow-hidden shadow-sm flex-shrink-0">
               <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover scale-110" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-piggy-pink-dark leading-none">
                {user.name}
              </h1>
              <div className="text-xs font-bold text-gray-400 mt-1">
                饲养员的小猪铺
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!canEdit && (
              <button 
                onClick={handleUrge}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-200 text-pink-400 shadow-sm active:translate-y-0.5 active:shadow-none transition hover:bg-pink-50"
              >
                <BellRing size={20} />
              </button>
            )}
            <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-200 text-pink-400 shadow-sm active:translate-y-0.5 active:shadow-none transition">
              <MenuIcon size={20} />
            </button>
          </div>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 top-14 bg-white rounded-2xl border-2 border-pink-200 shadow-xl z-20 w-40 overflow-hidden animate-fade-in-up origin-top-right">
                <button onClick={() => { navigate('/orders'); setShowMenu(false); }} className="w-full px-4 py-3 flex items-center space-x-3 text-pink-500 font-bold hover:bg-pink-50 border-b border-pink-50">
                  <ScrollText size={18} />
                  <span>历史账单</span>
                </button>
                <button onClick={() => { navigate('/memory-wall'); setShowMenu(false); }} className="w-full px-4 py-3 flex items-center space-x-3 text-pink-500 font-bold hover:bg-pink-50 border-b border-pink-50">
                  <Award size={18} />
                  <span>投喂回忆墙</span>
                </button>
                <button onClick={() => { logout(); setShowMenu(false); }} className="w-full px-4 py-3 flex items-center space-x-3 text-gray-500 font-bold hover:bg-gray-50">
                  <User size={18} />
                  <span>退出登录</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Categories - Style C */}
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

        {/* Sub Categories - Style C */}
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

        {/* Blind Box Button */}
        <button 
          onClick={handleBlindBox}
          className="mt-2 w-full bg-gradient-to-r from-purple-100 to-pink-100 py-3 rounded-[1.5rem] border-4 border-white shadow-sm font-bold text-purple-900 transition-all hover:scale-[1.01] active:scale-95"
        >
          惊喜盲盒抽一个✨
        </button>
      </div>

      {/* Product List - Style C */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-10 font-bold text-xl text-piggy-pink animate-pulse">加载中... 🐷</div>
        ) : (
          <>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 font-bold text-xl text-piggy-pink">
                <div className="text-6xl mb-4">😢</div>
                当前分类下没有商品
              </div>
            ) : (
              filteredProducts.map(product => {
                const cartItem = cart.find(item => item.id === product.id);
                const quantity = cartItem ? cartItem.quantity : 0;
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
                      {product.remark ? (
                        <p className="text-[11px] text-gray-400 mt-1 bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100 truncate max-w-full">
                          📝 {product.remark}
                        </p>
                      ) : (
                        <p className="text-xs text-pink-400 mt-1">好吃不胖！</p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-piggy-pink-dark text-lg font-black">¥ {product.price}</span>
                        
                        {selectingBackupFor ? (
                          // 备选模式下：检查是否已经是主商品，或者已经是该主商品的备选
                          (selectingBackupFor.id === product.id || selectingBackupFor.backups?.some(b => b.id === product.id) || cart.some(c => c.id === product.id && c.id !== selectingBackupFor.id)) ? (
                            <button 
                              disabled
                              className="px-3 py-1 bg-gray-100 text-gray-400 font-bold rounded-full text-xs border-2 border-gray-200 cursor-not-allowed"
                            >
                              已在单中
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleSelectBackup(product)}
                              className="px-3 py-1 bg-purple-100 text-purple-600 font-bold rounded-full text-xs border-2 border-purple-200 active:scale-95 transition"
                            >
                              选为备选
                            </button>
                          )
                        ) : (
                          // 正常点单模式
                          quantity > 0 ? (
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => removeFromCart(product.id)}
                                className="w-7 h-7 rounded-full bg-white border-2 border-pink-200 text-pink-400 flex items-center justify-center hover:bg-pink-50 active:scale-95 transition"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-piggy-pink-dark font-bold w-6 text-center">{quantity}</span>
                              <button 
                                onClick={() => addToCart(product)}
                                className="w-7 h-7 rounded-full bg-piggy-pink text-white border-2 border-piggy-pink-dark flex items-center justify-center shadow-piggy-btn active:translate-y-[2px] active:shadow-none transition"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => addToCart(product)}
                              className="w-7 h-7 rounded-full bg-piggy-pink text-white border-2 border-piggy-pink-dark flex items-center justify-center shadow-piggy-btn active:translate-y-[2px] active:shadow-none transition"
                            >
                              <Plus size={14} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {isLoadingMore && (
              <div className="text-center py-4 font-bold text-piggy-pink animate-pulse">加载更多... 🐷</div>
            )}
            {!hasMore && filteredProducts.length > 0 && (
              <div className="text-center py-4 font-bold text-gray-400">没有更多商品啦～ 🎉</div>
            )}
          </>
        )}
      </div>

      {/* Floating Cart Bar - Style C */}
      {cart.length > 0 && !showCheckout && !selectingBackupFor && (
        <div className="fixed bottom-0 w-full bg-white border-t-4 border-pink-100 p-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2rem] z-20">
          <div className="flex justify-between items-center">
            <div className="relative -top-8" onClick={() => setShowCheckout(true)}>
              <div className="w-16 h-16 bg-piggy-pink rounded-full flex items-center justify-center text-white text-2xl border-4 border-white shadow-lg shadow-pink-200 transform transition active:scale-95 cursor-pointer">
                <ShoppingBasket size={28} />
              </div>
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                {totalItems}
              </span>
            </div>
            <div className="text-right flex-1 pr-6">
              <p className="text-xs text-pink-400 font-bold">一共要花 (预计)</p>
              <p className="text-3xl text-piggy-pink-dark font-black">¥ {totalPrice}</p>
            </div>
            <button 
              onClick={() => setShowCheckout(true)}
              className="bg-piggy-pink text-white px-8 py-3 rounded-full font-bold border-b-4 border-piggy-pink-dark active:border-b-0 active:translate-y-1 transition text-lg shadow-lg"
            >
              去结算 🐷
            </button>
          </div>
        </div>
      )}

      {/* Backup Selection Banner */}
      {selectingBackupFor && (
        <div className="fixed bottom-0 w-full bg-purple-100 border-t-4 border-purple-200 p-4 pb-8 z-20 flex justify-between items-center">
          <div className="flex-1">
            <p className="text-sm font-bold text-purple-600">正在为 <span className="text-purple-800 font-black">{selectingBackupFor.name}</span> 选择备选...</p>
            <p className="text-xs text-purple-400">请在上方列表中点击“选为备选”</p>
          </div>
          <button 
            onClick={() => setSelectingBackupFor(null)}
            className="px-4 py-2 bg-white text-purple-600 font-bold rounded-full border-2 border-purple-200 shadow-sm"
          >
            取消
          </button>
        </div>
      )}

      {/* Checkout Drawer */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCheckout(false)} />
          <div className="bg-white rounded-t-[2rem] w-full max-h-[85vh] flex flex-col relative z-10 border-t-4 border-pink-200 shadow-2xl animate-fade-in-up">
            <div className="p-4 border-b-2 border-pink-100 flex justify-between items-center bg-pink-50 rounded-t-[2rem]">
              <h2 className="text-xl font-black text-piggy-pink-dark">确认投喂单 📝</h2>
              <button onClick={() => setShowCheckout(false)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-500 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="bg-white border-2 border-pink-100 rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3 flex-1">
                      <span
                        className="text-2xl cursor-pointer hover:scale-110 transition-transform w-8 h-8 flex items-center justify-center bg-pink-50 rounded-lg overflow-hidden"
                        onClick={() => showPreview(item.image, item.name)}
                      >
                        <ProductImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{item.name}</p>
                        {(item.category_name || item.sub_category) && (
                          <p className="text-[10px] text-gray-400 mt-0.5 bg-gray-50 inline-block px-1.5 py-0.5 rounded border border-gray-100 truncate max-w-full">
                            {item.category_name || ''}{item.category_name && item.sub_category && item.sub_category !== '全部' ? ' - ' : ''}{item.sub_category && item.sub_category !== '全部' ? item.sub_category : ''}
                          </p>
                        )}
                        {item.remark && (
                          <p className="text-[10px] text-gray-500 mt-0.5 bg-yellow-50 inline-block px-1.5 py-0.5 rounded border border-yellow-100 truncate max-w-full">
                            📝 {item.remark}
                          </p>
                        )}
                        <p className="text-xs text-pink-400 mt-1">¥ {item.price}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* 数量控制 */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-white border-2 border-pink-200 text-pink-400 flex items-center justify-center hover:bg-pink-50 active:scale-95 transition"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-piggy-pink-dark font-bold w-5 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-piggy-pink text-white border-2 border-piggy-pink-dark flex items-center justify-center shadow-sm active:scale-95 transition"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      {/* 删除按钮 */}
                      <button
                        onClick={() => removeCartItemCompletely(item.id)}
                        className="w-6 h-6 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 active:scale-95 transition ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Backups List */}
                  {item.backups && item.backups.length > 0 && (
                    <div className="mt-2 pl-2 space-y-2">
                      {item.backups.map(backup => (
                        <div key={backup.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <CornerDownRight size={14} className="text-gray-400 shrink-0" />
                            <span
                              className="text-lg cursor-pointer hover:scale-110 transition-transform w-6 h-6 flex items-center justify-center bg-gray-100 rounded-md overflow-hidden shrink-0"
                              onClick={() => showPreview(backup.image, backup.name)}
                            >
                              <ProductImage src={backup.image} alt={backup.name} className="w-full h-full object-cover" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-600 truncate">{backup.name}</p>
                              {(backup.category_name || backup.sub_category) && (
                                <p className="text-[9px] text-gray-400 mt-0.5 bg-gray-100 inline-block px-1 py-0.5 rounded border border-gray-100 truncate max-w-full">
                                  {backup.category_name || ''}{backup.category_name && backup.sub_category && backup.sub_category !== '全部' ? ' - ' : ''}{backup.sub_category && backup.sub_category !== '全部' ? backup.sub_category : ''}
                                </p>
                              )}
                              {backup.remark && (
                                <p className="text-[9px] text-gray-400 bg-white inline-block px-1 py-0.5 rounded border border-gray-100 truncate max-w-full">
                                  📝 {backup.remark}
                                </p>
                              )}
                              <p className="text-[10px] text-purple-400 mt-0.5">¥ {backup.price}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {/* 备选商品数量控制 */}
                            <button
                              onClick={() => updateBackupQuantity(item.id, backup.id, backup.quantity - 1)}
                              className="w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-gray-600 font-bold w-4 text-center text-xs">{backup.quantity}</span>
                            <button
                              onClick={() => updateBackupQuantity(item.id, backup.id, backup.quantity + 1)}
                              className="w-5 h-5 rounded-full bg-purple-400 text-white flex items-center justify-center shadow-sm active:scale-95 transition"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              onClick={() => removeBackupFromItem(item.id, backup.id)}
                              className="w-5 h-5 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 active:scale-95 transition ml-1"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 添加备选按钮 */}
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setShowCheckout(false);
                        setSelectingBackupFor(item);
                      }}
                      className="text-xs font-bold text-purple-500 bg-purple-50 px-2 py-1 rounded-md border border-purple-200"
                    >
                      + 备选
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="mt-4">
                <label className="block text-sm font-bold text-gray-500 mb-2">📝 小留言 (选填)</label>
                <textarea 
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  placeholder="例如：都要冰的！或者：辛苦大宝贝啦~ 😘"
                  className="w-full bg-pink-50 border-2 border-pink-200 rounded-xl p-3 font-bold text-gray-700 outline-none focus:border-piggy-pink-dark h-24"
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-pink-100 pb-8">
               <div className="flex justify-between items-center mb-4">
                 <span className="font-bold text-gray-500">预计花费</span>
                 <span className="text-2xl font-black text-piggy-pink-dark">¥ {totalPrice}</span>
               </div>
               <button
                 onClick={submitOrder}
                 className="w-full bg-piggy-pink text-white py-4 rounded-xl font-black text-lg border-b-4 border-piggy-pink-dark active:border-b-0 active:translate-y-1 transition shadow-piggy-btn"
               >
                 发送电波！⚡️
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
