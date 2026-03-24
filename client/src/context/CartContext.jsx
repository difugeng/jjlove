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
        const existingBackup = item.backups.find(b => b.id === backupProduct.id);
        if (existingBackup) {
          // 如果已存在，增加数量
          return { ...item, backups: item.backups.map(b => b.id === backupProduct.id ? { ...b, quantity: b.quantity + 1 } : b) };
        }
        return { ...item, backups: [...item.backups, { ...backupProduct, quantity: 1 }] };
      }
      return item;
    }));
  };

  // 更新购物车商品数量
  const updateCartItemQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
    } else {
      setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item));
    }
  };

  // 完全删除购物车商品
  const removeCartItemCompletely = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  // 更新备选商品数量
  const updateBackupQuantity = (mainProductId, backupProductId, quantity) => {
    setCart(prev => prev.map(item => {
      if (item.id === mainProductId) {
        if (quantity <= 0) {
          return { ...item, backups: item.backups.filter(b => b.id !== backupProductId) };
        }
        return { ...item, backups: item.backups.map(b => b.id === backupProductId ? { ...b, quantity } : b) };
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
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, addBackupToItem, removeBackupFromItem, clearCart, totalItems, totalPrice, updateCartItemQuantity, removeCartItemCompletely, updateBackupQuantity }}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
