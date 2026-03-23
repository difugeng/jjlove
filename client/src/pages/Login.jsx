import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.getUsers();
        setUsers(res.data.users);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, []);

  const handleLogin = async () => {
    if (!selectedUser || !pin) return;
    const result = await login(selectedUser.id, pin);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'PIN 错误');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-piggy-bg font-piggy">
      <div className="w-full max-w-md bg-white border-4 border-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center space-y-8 relative">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-block bg-piggy-pink px-4 py-1 rounded-full text-white font-bold shadow-piggy-btn transform -rotate-2 border-2 border-piggy-pink-dark">
            小藏獒投喂站
          </div>
          <h1 className="text-3xl font-black text-piggy-pink-dark">Who are you?</h1>
          <p className="text-gray-400 font-bold text-sm">请选择你的身份</p>
        </div>

        {/* Avatars */}
        <div className="flex justify-center space-x-8 w-full">
          {users.map(user => (
            <div 
              key={user.id} 
              onClick={() => { setSelectedUser(user); setError(''); setPin(''); }}
              className={`flex flex-col items-center cursor-pointer transition-transform duration-200 ${selectedUser?.id === user.id ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
            >
              <div className={`w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-piggy-bg flex items-center justify-center shadow-lg mb-3 ${selectedUser?.id === user.id ? 'ring-4 ring-piggy-pink ring-offset-2' : ''}`}>
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover scale-110" />
              </div>
              <span className={`font-bold text-lg px-3 py-1 rounded-lg border-2 shadow-sm ${selectedUser?.id === user.id ? 'bg-piggy-pink text-white border-piggy-pink-dark' : 'bg-white text-gray-500 border-gray-100'}`}>
                {user.name}
              </span>
            </div>
          ))}
        </div>

        {/* PIN Input */}
        {selectedUser && (
          <div className="w-full space-y-4 animate-fade-in-up">
            <div className="text-center">
              <p className="text-sm font-bold text-gray-400 mb-2">输入 PIN 码进入</p>
              <input 
                type="password" 
                maxLength="4"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center text-3xl tracking-widest py-3 border-2 border-piggy-pink rounded-xl shadow-piggy-sm focus:outline-none focus:ring-4 focus:ring-piggy-pink/30 bg-white font-mono text-piggy-pink-dark"
                placeholder="****"
              />
            </div>
            
            {error && <p className="text-red-500 text-center font-bold animate-bounce">{error}</p>}

            <button 
              onClick={handleLogin}
              className="w-full py-4 bg-piggy-pink text-white text-xl font-black rounded-xl border-2 border-piggy-pink-dark shadow-piggy-btn active:translate-y-[2px] active:shadow-none transition-all"
            >
              进入小屋 🏠
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-8 text-piggy-pink font-bold text-sm opacity-60">© 2026 jjlove Studio</p>
    </div>
  );
};

export default Login;
