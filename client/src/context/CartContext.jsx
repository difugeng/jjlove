import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, backups: [] }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing.quantity > 1) {
        return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  // 添加备选商品
  const addBackupToItem = (mainProductId, backupProduct) => {
    setCart(prev => prev.map(item => {
      if (item.id === mainProductId) {
        // 检查是否已经有这个备选了
        if (!item.backups.find(b => b.id === backupProduct.id)) {
          return { ...item, backups: [...item.backups, { ...backupProduct, quantity: 1 }] };
        }
      }
      return item;
    }));
  };

  // 移除备选商品
  const removeBackupFromItem = (mainProductId, backupProductId) => {
    setCart(prev => prev.map(item => {
      if (item.id === mainProductId) {
        return { ...item, backups: item.backups.filter(b => b.id !== backupProductId) };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0); // 备选不计入预计总价

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, addBackupToItem, removeBackupFromItem, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
