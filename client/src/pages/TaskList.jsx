import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../components/ui/ModalProvider';
import { User, CheckCircle, Circle, RefreshCw, Factory, Award, CornerDownRight, MessageSquare, ScrollText, Menu as MenuIcon, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductImage from '../components/ui/ProductImage';

import { useImagePreview } from '../components/ui/ImagePreviewProvider';

const TaskList = () => {
  const { user, logout, updateUser } = useAuth();
  const { showModal } = useModal();
  const { showPreview } = useImagePreview();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getPendingOrders();
      setOrders(res.data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemPurchased = async (item, orderId) => {
    // 乐观更新：先在前端修改状态，避免页面闪烁
    setOrders(prevOrders => 
      prevOrders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: 'purchasing', // 只要勾选就变更为采购中
            items: order.items.map(i => {
              if (i.id === item.id) return { ...i, purchased: !item.purchased };
              if (i.backups) {
                return {
                  ...i,
                  backups: i.backups.map(b => b.id === item.id ? { ...b, purchased: !item.purchased } : b)
                };
              }
              return i;
            })
          };
        }
        return order;
      })
    );

    try {
      await api.updateOrderItem(item.id, { purchased: !item.purchased, order_id: orderId });
      // 后台默默重新拉取一次以确保数据一致性，但因为已经乐观更新了，不需要显示 loading 遮罩
      const res = await api.getPendingOrders();
      setOrders(res.data.orders);
    } catch (err) {
      console.error(err);
      // 如果失败，回滚状态（这里简单处理为重新拉取一遍）
      fetchOrders();
    }
  };

  const deleteOrder = (orderId) => {
    showModal({
      title: '删除订单',
      content: '确定要删掉这个投喂任务吗？这操作撤不回来哦 😱',
      type: 'confirm',
      confirmText: '无情删掉',
      cancelText: '手滑了',
      onConfirm: async () => {
        try {
          await api.deleteOrder(orderId);
          fetchOrders();
          showModal({ title: '删除成功', content: '订单已删除 ✨', type: 'info' });
        } catch (err) {
          console.error(err);
          showModal({ title: '哎呀！', content: '删除失败，请重试 😭', type: 'info' });
        }
      }
    });
  };

  const completeOrder = async (orderId) => {
    showModal({
      title: '完成采购',
      content: '确定全部买好了吗？🐷',
      type: 'confirm',
      confirmText: '搞定',
      cancelText: '再等等',
      onConfirm: async () => {
        try {
          const res = await api.completeOrder(orderId);
          setOrders(prev => prev.filter(o => o.id !== orderId));
          
          if (res.data.success && res.data.earned_coins) {
             updateUser({ coins: (user.coins || 0) + res.data.earned_coins });
             showModal({
                title: '辛苦啦！🎉',
                content: `任务完成！获得 ${res.data.earned_coins} 个心愿币！💰`,
                type: 'info',
                confirmText: '开心'
             });
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-piggy-bg pb-24 font-piggy">
      {/* Header - Style C */}
      <div className="bg-white p-6 pb-2 border-b-4 border-pink-100 sticky top-0 z-40">
        <div className="flex justify-between items-center relative">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-pink-200 rounded-full flex items-center justify-center border-2 border-pink-400 overflow-hidden shadow-sm flex-shrink-0">
               <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover scale-110" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-piggy-pink-dark leading-none">
                {user.name}
              </h1>
              <div className="text-xs font-bold text-yellow-600 mt-1">
                💰 {user.coins || 0}
              </div>
              <div className="text-xs font-bold text-gray-400 mt-0.5">
                投喂任务清单
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button onClick={fetchOrders} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-200 text-pink-400 shadow-sm active:translate-y-0.5 active:shadow-none transition">
              <RefreshCw size={20} />
            </button>
            <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-200 text-pink-400 shadow-sm active:translate-y-0.5 active:shadow-none transition">
              <MenuIcon size={20} />
            </button>
          </div>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 top-14 bg-white rounded-2xl border-2 border-pink-200 shadow-xl z-20 w-40 overflow-hidden animate-fade-in-up origin-top-right">
                <button onClick={() => { navigate('/factory'); setShowMenu(false); }} className="w-full px-4 py-3 flex items-center space-x-3 text-pink-500 font-bold hover:bg-pink-50 border-b border-pink-50">
                  <Factory size={18} />
                  <span>饲料厂</span>
                </button>
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
      </div>

      {/* Task List - Style C */}
      <div className="p-4 space-y-6">
        {loading ? (
          <div className="text-center py-10 font-bold text-xl text-piggy-pink animate-pulse">加载任务中... 🐷</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-black text-piggy-pink-dark">暂无任务</h2>
            <p className="text-pink-400 font-bold mt-2">你可以休息啦！</p>
          </div>
        ) : (
          orders.map(order => {
            // Calculate current actual price
            let currentActualPrice = 0;
            order.items.forEach(i => {
              if (i.purchased) currentActualPrice += i.price * i.quantity;
              if (i.backups) {
                i.backups.forEach(b => {
                  if (b.purchased) currentActualPrice += b.price * b.quantity;
                });
              }
            });

            return (
              <div key={order.id} className="bg-white border-4 border-white rounded-[1.5rem] shadow-piggy overflow-hidden">
                <div className="bg-pink-50 p-4 border-b-2 border-pink-100">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-lg text-piggy-pink-dark">Order #{order.id}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${order.status === 'purchasing' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {order.status === 'purchasing' ? '投喂中 🏃' : '待投喂 ⏳'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-pink-400">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-xs text-gray-500 font-bold">预计 ¥ {order.total_price}</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="bg-white px-2 py-1 rounded-lg border-2 border-pink-200 font-black text-piggy-pink-dark shadow-sm">
                        已选 ¥ {currentActualPrice}
                      </div>
                    </div>
                  </div>

                  {order.note && (
                    <div className="bg-white/80 p-3 rounded-xl border border-pink-200 mt-2 flex items-start space-x-2">
                      <MessageSquare size={16} className="text-pink-400 mt-0.5 shrink-0" />
                      <p className="text-sm font-bold text-gray-700 italic">"{order.note}"</p>
                    </div>
                  )}
                </div>
                
                <div className="p-4 space-y-4">
                  {order.items.map(item => (
                    <div key={item.id} className="space-y-2">
                      {/* Main Item */}
                      <div 
                        onClick={() => toggleItemPurchased(item, order.id)}
                        className={`flex items-center p-3 rounded-xl border-2 transition-all cursor-pointer active:scale-95 ${item.purchased ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-pink-100 shadow-sm hover:border-pink-300'}`}
                      >
                        <div className="mr-3 text-piggy-pink shrink-0">
                          {item.purchased ? <CheckCircle size={24} fill="#22c55e" color="white" /> : <Circle size={24} color="#F472B6" />}
                        </div>
                        <div 
                          className={`w-16 h-16 mr-3 rounded-xl flex items-center justify-center text-3xl shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden ${item.purchased ? 'bg-green-100 opacity-70' : 'bg-pink-100'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            showPreview(item.image, item.name);
                          }}
                        >
                          <ProductImage src={item.image} alt={item.name} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold text-lg leading-tight ${item.purchased ? 'text-green-700' : 'text-gray-700'}`}>
                            {item.name}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">{item.category_name} - {item.sub_category}</span>
                            <span className="text-sm font-bold text-piggy-pink-dark">¥{item.price}</span>
                          </div>
                        </div>
                        <div className="font-black text-lg bg-pink-50 text-piggy-pink-dark px-2 rounded border border-pink-100">
                          x{item.quantity}
                        </div>
                      </div>

                      {/* Backup Items */}
                      {item.backups && item.backups.length > 0 && (
                        <div className="pl-6 space-y-2 border-l-2 border-dashed border-purple-200 ml-4 relative">
                          <div className="absolute -left-[1.2rem] top-4 text-xs font-bold text-purple-400 transform -rotate-90 bg-white px-1">备选</div>
                          {item.backups.map(backup => (
                            <div 
                              key={backup.id}
                              onClick={() => toggleItemPurchased(backup, order.id)}
                              className={`flex items-center p-2 rounded-xl border-2 transition-all cursor-pointer active:scale-95 ${backup.purchased ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-100'}`}
                            >
                              <div className="mr-2 shrink-0">
                                {backup.purchased ? <CheckCircle size={20} fill="#22c55e" color="white" /> : <Circle size={20} color="#a855f7" />}
                              </div>
                              <div 
                                className="text-xl mr-2 cursor-pointer hover:scale-110 transition-transform shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showPreview(backup.image, backup.name);
                                }}
                              >
                                <ProductImage src={backup.image} alt={backup.name} />
                              </div>
                              <div className="flex-1">
                                <p className={`font-bold text-sm leading-tight ${backup.purchased ? 'text-green-700' : 'text-purple-700'}`}>
                                  {backup.name}
                                </p>
                                <span className="text-xs font-bold text-purple-500">¥{backup.price}</span>
                              </div>
                              <div className="font-bold text-sm bg-white text-purple-600 px-1.5 rounded border border-purple-200">
                                x{backup.quantity}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-green-50 border-t-2 border-green-100">
                  <button 
                    onClick={() => completeOrder(order.id)}
                    className="w-full py-3 bg-green-400 text-white font-black rounded-xl border-2 border-green-600 shadow-[2px_2px_0px_#166534] active:translate-y-1 active:shadow-none transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} />
                    完成这单 (结算: ¥{currentActualPrice})
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskList;
