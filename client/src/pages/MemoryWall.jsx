import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ArrowLeft, Heart, Award, TrendingUp, CalendarHeart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductImage from '../components/ui/ProductImage';

const MemoryWall = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_orders: 0,
    total_spent: 0,
    top_products: [],
    days_used: 1
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.getStats();
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-piggy-bg font-piggy relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-20 -left-10 text-6xl opacity-10 transform -rotate-12">💖</div>
      <div className="absolute top-40 -right-10 text-6xl opacity-10 transform rotate-12">✨</div>
      <div className="absolute bottom-40 left-10 text-6xl opacity-10 transform -rotate-45">🍔</div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 pb-4 border-b-4 border-pink-100 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-pink-200 text-pink-400 shadow-sm active:translate-y-0.5 active:shadow-none transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-xs font-bold text-pink-400 mb-0.5">Our Story</div>
            <h1 className="text-xl font-black text-piggy-pink-dark">投喂回忆墙 🏆</h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 font-bold text-xl text-piggy-pink animate-pulse">翻阅回忆中... 🐷</div>
      ) : (
        <div className="p-4 space-y-6 relative z-10 pb-10">
          
          {/* Top Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="piggy-card p-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-piggy-pink-dark mb-2">
                <CalendarHeart size={24} />
              </div>
              <p className="text-xs text-gray-500 font-bold">相爱相杀</p>
              <p className="text-2xl font-black text-piggy-pink-dark">{stats.days_used} <span className="text-sm">天</span></p>
            </div>
            
            <div className="piggy-card p-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2">
                <Heart size={24} fill="currentColor" />
              </div>
              <p className="text-xs text-gray-500 font-bold">累计投喂</p>
              <p className="text-2xl font-black text-purple-700">{stats.total_orders} <span className="text-sm">次</span></p>
            </div>
          </div>

          {/* Money Spent Card */}
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-6 rounded-[1.5rem] border-4 border-white shadow-piggy relative overflow-hidden">
            <div className="absolute right-0 top-0 text-8xl opacity-20 transform translate-x-4 -translate-y-4">💰</div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 text-orange-600 mb-1">
                <TrendingUp size={20} />
                <span className="font-bold">为你花的钱</span>
              </div>
              <p className="text-4xl font-black text-orange-600">¥ {stats.total_spent || 0}</p>
              <p className="text-xs text-orange-400 font-bold mt-2">（这都是沉甸甸的爱啊！😭）</p>
            </div>
          </div>

          {/* Top Products */}
          <div>
            <div className="flex items-center space-x-2 mb-4 px-2">
              <Award className="text-piggy-pink-dark" />
              <h2 className="text-lg font-black text-piggy-pink-dark">最爱吃 Top 3</h2>
            </div>
            
            <div className="space-y-3">
              {stats.top_products.length === 0 ? (
                <div className="text-center py-10 bg-white/50 rounded-2xl border-2 border-dashed border-pink-200">
                  <p className="text-pink-400 font-bold">还没有投喂记录哦~</p>
                </div>
              ) : (
                stats.top_products.map((p, index) => (
                  <div key={index} className="bg-white p-3 rounded-2xl border-3 border-pink-100 shadow-sm flex items-center space-x-4 transform transition hover:-translate-y-1">
                    <div className="w-12 h-12 bg-piggy-bg rounded-xl flex items-center justify-center text-2xl border-2 border-pink-200 font-black text-pink-400">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border-2 border-purple-100 overflow-hidden shrink-0">
                      <ProductImage src={p.image} alt={p.name} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{p.name}</h3>
                      <p className="text-sm text-pink-500 font-bold mt-1">被翻牌 {p.count} 次</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default MemoryWall;
