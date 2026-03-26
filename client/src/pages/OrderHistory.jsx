import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { ArrowLeft, Clock, ShoppingBag, CheckCircle2, ChevronRight, MessageSquare, CornerDownRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../components/ui/ModalProvider';
import ProductImage from '../components/ui/ProductImage';

import { useImagePreview } from '../components/ui/ImagePreviewProvider';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { showModal } = useModal();
  const { showPreview } = useImagePreview();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 分页相关状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchHistory = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const res = await api.getOrderHistory(page, 10);
      
      if (isInitial) {
        setOrders(res.data.data.orders);
      } else {
        setOrders(prev => [...prev, ...res.data.data.orders]);
      }
      
      // 检查是否还有更多数据
      setHasMore(res.data.data.orders.length === 10);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, []);

  // 滚动加载更多
  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isLoadingMore]);

  // 监听页面变化，加载更多数据
  useEffect(() => {
    if (page > 1) {
      fetchHistory(false);
    }
  }, [page]);

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

  const deleteOrder = (orderId) => {
    showModal({
      title: '删除记录',
      content: '确定要删掉这条投喂记录吗？',
      type: 'confirm',
      confirmText: '删掉',
      cancelText: '留着',
      onConfirm: async () => {
        try {
          await api.deleteOrder(orderId);
          // 删除后重置分页并重新加载数据
          setPage(1);
          setHasMore(true);
          fetchHistory(true);
          showModal({ title: '删除成功', content: '记录已删除 ✨', type: 'info' });
        } catch (err) {
          console.error(err);
          showModal({ title: '哎呀！', content: '删除失败，请重试 😭', type: 'info' });
        }
      }
    });
  };

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'pending': return { text: '待投喂', color: 'text-blue-500', bg: 'bg-blue-100', icon: <Clock size={16} /> };
      case 'purchasing': return { text: '投喂中', color: 'text-orange-500', bg: 'bg-orange-100', icon: <ShoppingBag size={16} /> };
      case 'completed': return { text: '已投喂', color: 'text-green-500', bg: 'bg-green-100', icon: <CheckCircle2 size={16} /> };
      default: return { text: '未知', color: 'text-gray-500', bg: 'bg-gray-100', icon: null };
    }
  };

  const showOrderDetails = (order) => {
    const statusStyle = getStatusDisplay(order.status);
    const content = (
      <div className="text-left space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* 时间和状态显示 */}
        <div className="text-center pb-2 border-b border-pink-100">
          <p className="text-sm font-black text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
          <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-bold mt-2 ${statusStyle.bg} ${statusStyle.color}`}>
            {statusStyle.icon}
            <span>{statusStyle.text}</span>
          </div>
        </div>

        {order.note && (
          <div className="bg-pink-50 p-3 rounded-xl border border-pink-100 flex items-start space-x-2">
            <MessageSquare size={16} className="text-pink-400 mt-0.5 shrink-0" />
            <p className="text-sm font-bold text-gray-700 italic">"{order.note}"</p>
          </div>
        )}
        
        <div className="space-y-3">
          {order.items.map(item => (
            <div key={item.id} className="space-y-2">
              <div className={`flex items-center space-x-3 p-2 rounded-xl border-2 ${item.purchased ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                <div 
                  className="text-3xl cursor-pointer hover:scale-110 transition-transform w-12 h-12 flex items-center justify-center overflow-hidden"
                  onClick={() => showPreview(item.image, item.name)}
                >
                  <ProductImage src={item.image} alt={item.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${item.purchased ? 'text-green-700' : 'text-gray-500 line-through'}`}>{item.name}</p>
                  <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{item.category_name} - {item.sub_category}</span>
                    <span className="text-xs font-bold text-piggy-pink-dark">¥{item.price}</span>
                  </div>
                  {item.remark && (
                    <div className="mt-1 text-[10px] text-gray-500 bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                      📝 {item.remark}
                    </div>
                  )}
                </div>
                <div className="font-black text-sm bg-white text-gray-600 px-1.5 rounded border border-gray-200">
                  x{item.quantity}
                </div>
                {item.purchased && <CheckCircle2 size={18} className="text-green-500 ml-1" />}
              </div>
              
              {item.backups && item.backups.length > 0 && (
                <div className="pl-6 space-y-2 border-l-2 border-dashed border-purple-100 ml-4 relative">
                  <div className="absolute -left-3 top-2 text-[10px] font-bold text-purple-300 bg-white px-0.5">备选</div>
                  {item.backups.map(backup => (
                    <div key={backup.id} className={`flex items-center space-x-2 p-1.5 rounded-lg border ${backup.purchased ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                      <CornerDownRight size={14} className="text-gray-300 shrink-0" />
                      <div 
                        className="text-2xl cursor-pointer hover:scale-110 transition-transform w-8 h-8 flex items-center justify-center overflow-hidden"
                        onClick={() => showPreview(backup.image, backup.name)}
                      >
                        <ProductImage src={backup.image} alt={backup.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-xs ${backup.purchased ? 'text-green-700' : 'text-gray-400 line-through'}`}>{backup.name}</p>
                        <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                           <span className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded">{backup.category_name} - {backup.sub_category}</span>
                           <span className="text-[10px] font-bold text-purple-500">¥{backup.price}</span>
                        </div>
                        {backup.remark && (
                          <div className="mt-1 text-[9px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-100">
                            📝 {backup.remark}
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-xs bg-white text-gray-500 px-1 rounded border border-gray-200">
                        x{backup.quantity}
                      </div>
                      {backup.purchased && <CheckCircle2 size={14} className="text-green-500 ml-1" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="pt-3 border-t-2 border-dashed border-pink-100 flex justify-between items-center">
          <span className="text-gray-500 font-bold">实际花费</span>
          <span className="text-xl font-black text-piggy-pink-dark">¥ {order.actual_price}</span>
        </div>
      </div>
    );

    showModal({
      title: `订单 #${order.id}`,
      content: content,
      type: 'info',
      confirmText: '看完了'
    });
  };

  return (
    <div className="min-h-screen bg-piggy-bg font-piggy pb-10">
      {/* Header */}
      <div className="bg-white p-6 pb-4 border-b-4 border-pink-100 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-200 text-pink-400 shadow-sm active:translate-y-0.5 active:shadow-none transition flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-piggy-pink-dark leading-none">
              订单记录 📜
            </h1>
            <div className="text-xs font-bold text-gray-400 mt-1">
              投喂历史账单
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-20 font-bold text-xl text-piggy-pink animate-pulse">翻阅账单中... 🐷</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-bold">暂无投喂记录哦~</div>
        ) : (
          <>
            {orders.map(order => {
              const statusStyle = getStatusDisplay(order.status);
              
              return (
                <div 
                  key={order.id} 
                  onClick={() => showOrderDetails(order)}
                  className="bg-white rounded-2xl border-3 border-pink-200 shadow-sm overflow-hidden cursor-pointer transform transition hover:-translate-y-1 active:scale-95"
                >
                  <div className="bg-pink-50/50 p-3 border-b-2 border-pink-100 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-500 text-sm">{new Date(order.created_at).toLocaleString()}</span>
                      {order.note && <p className="text-xs text-pink-500 mt-1 max-w-[13rem]">📝 "{order.note}"</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold ${statusStyle.bg} ${statusStyle.color}`}>
                        {statusStyle.icon}
                        <span>{statusStyle.text}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                        className="text-red-300 hover:text-red-500 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="flex overflow-x-auto space-x-2 pb-2 hide-scrollbar">
                      {order.items.map(item => (
                        <div key={item.id} className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 overflow-hidden ${item.purchased ? 'bg-green-50 border-green-200 opacity-100' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
                            <ProductImage src={item.image} alt={item.name} />
                          </div>
                          {item.backups && item.backups.length > 0 && (
                            <div className="absolute -bottom-1 -right-1 flex space-x-0.5">
                              {item.backups.map(b => (
                                <div key={b.id} className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border border-white overflow-hidden ${b.purchased ? 'bg-green-100' : 'bg-gray-100'}`}>
                                  <ProductImage src={b.image} alt={b.name} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
                      <div className="text-xs text-gray-400 font-bold">
                        共 {order.items.length} 组商品
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          {order.status === 'completed' ? (
                            <>
                              <p className="text-xs text-gray-400 line-through leading-none mb-1">预计: ¥{order.total_price}</p>
                              <p className="text-lg font-black text-piggy-pink-dark leading-none">实付: ¥{order.actual_price}</p>
                            </>
                          ) : (
                            <p className="text-lg font-black text-gray-500 leading-none">预计: ¥{order.total_price}</p>
                          )}
                        </div>
                        <ChevronRight size={20} className="text-pink-300" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* 加载更多指示器 */}
            {isLoadingMore && (
              <div className="text-center py-4">
                <div className="text-piggy-pink animate-pulse">加载更多... 🐷</div>
              </div>
            )}
            
            {!hasMore && orders.length > 0 && (
              <div className="text-center py-4 text-gray-400">
                已经到底啦 🎉
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
