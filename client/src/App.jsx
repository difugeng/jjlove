import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ModalProvider } from './components/ui/ModalProvider';
import { ImagePreviewProvider } from './components/ui/ImagePreviewProvider';
import Login from './pages/Login';
import Menu from './pages/Menu';
import TaskList from './pages/TaskList';
import Factory from './pages/Factory';
import MemoryWall from './pages/MemoryWall';
import OrderHistory from './pages/OrderHistory';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-piggy-bg font-piggy text-2xl font-black">Loading... 🐷</div>;
  return user ? children : <Navigate to="/login" />;
};

const Dashboard = () => {
  const { user } = useAuth();
  
  if (user.role === 'orderer') {
    return <Menu />;
  } else if (user.role === 'purchaser') {
    return <TaskList />;
  }
  
  return <div className="p-4 bg-piggy-bg text-center font-bold">Unknown role 🐷</div>;
};

const App = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <ModalProvider>
          <ImagePreviewProvider>
            <Router basename="/jjlove">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/factory" element={<PrivateRoute><Factory /></PrivateRoute>} />
                <Route path="/memory-wall" element={<PrivateRoute><MemoryWall /></PrivateRoute>} />
                <Route path="/orders" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Router>
          </ImagePreviewProvider>
        </ModalProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
