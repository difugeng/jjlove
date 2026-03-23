import axios from 'axios';

const API_PREFIX = '/jjlove/api';

const api = {
  // --- 用户 (Users) ---
  getUsers: () => axios.get(`${API_PREFIX}/users`),
  login: (data) => axios.post(`${API_PREFIX}/login`, data),

  // --- 分类 (Categories) ---
  getCategories: () => axios.get(`${API_PREFIX}/categories`),
  addCategory: (data) => axios.post(`${API_PREFIX}/categories`, data),
  updateCategory: (id, data) => axios.put(`${API_PREFIX}/categories/${id}`, data),
  deleteCategory: (id) => axios.delete(`${API_PREFIX}/categories/${id}`),

  // --- 商品 (Products) ---
  getProducts: (categoryId = '', page = 1, limit = 10, subCategory = '') => {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (subCategory && subCategory !== '全部') params.append('sub_category', subCategory);
    params.append('page', page);
    params.append('limit', limit);
    return axios.get(`${API_PREFIX}/products?${params.toString()}`);
  },
  addProduct: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'image') {
        // 只在image是base64编码时添加到FormData，URL和Emoji作为普通字段添加
        if (data[key] && typeof data[key] === 'string') {
          if (data[key].startsWith('data:')) {
            formData.append(key, data[key]);
          } else {
            formData.append('image_url', data[key]);
          }
        }
      } else {
        formData.append(key, data[key]);
      }
    });
    return axios.post(`${API_PREFIX}/products`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateProduct: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'image') {
        // 只在image是base64编码时添加到FormData，URL和Emoji作为普通字段添加
        if (data[key] && typeof data[key] === 'string') {
          if (data[key].startsWith('data:')) {
            formData.append(key, data[key]);
          } else {
            formData.append('image_url', data[key]);
          }
        }
      } else {
        formData.append(key, data[key]);
      }
    });
    return axios.put(`${API_PREFIX}/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteProduct: (id) => axios.delete(`${API_PREFIX}/products/${id}`),

  // --- 图片上传 (Image Upload) ---
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return axios.post('/jjlove/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // --- 订单 (Orders) ---
  createOrder: (data) => axios.post(`${API_PREFIX}/orders`, data),
  getPendingOrders: () => axios.get(`${API_PREFIX}/orders/pending`),
  getOrderHistory: (page = 1, limit = 10) => {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    return axios.get(`${API_PREFIX}/orders/history?${params.toString()}`);
  },
  updateOrderItem: (id, data) => axios.put(`${API_PREFIX}/order-items/${id}`, data),
  completeOrder: (id) => axios.put(`${API_PREFIX}/orders/${id}/complete`),
  deleteOrder: (id) => axios.delete(`${API_PREFIX}/orders/${id}`),

  // --- 统计 (Stats) ---
  getStats: () => axios.get(`${API_PREFIX}/stats`),
};

export default api;