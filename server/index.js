const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const db = require('./db/database');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // 增加请求体大小限制以支持 Base64 图片
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// 暴露静态资源目录，用于访问上传的图片
app.use('/jjlove/uploads', express.static(path.join(__dirname, 'db/uploads')));

const API_PREFIX = '/jjlove/api';

// 使用新的商品路由
app.use(`${API_PREFIX}/products`, productRoutes);

// --- 原有路由 (Routes) ---

// 获取用户列表 (用于登录)
app.get(`${API_PREFIX}/users`, (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ users: rows });
    });
});

// 验证 PIN 码
app.post(`${API_PREFIX}/login`, (req, res) => {
    const { userId, pin } = req.body;
    db.get("SELECT * FROM users WHERE id = ? AND pin = ?", [userId, pin], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ success: true, user: row });
        } else {
            res.json({ success: false, message: "PIN incorrect" });
        }
    });
});

// 获取分类列表
app.get(`${API_PREFIX}/categories`, (req, res) => {
    db.all("SELECT * FROM categories", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ categories: rows.map(r => ({...r, sub: JSON.parse(r.sub_categories)})) });
    });
});

// 添加分类
app.post(`${API_PREFIX}/categories`, (req, res) => {
    const { name, sub } = req.body;
    const stmt = db.prepare("INSERT INTO categories (name, sub_categories) VALUES (?, ?)");
    stmt.run(name, JSON.stringify(sub), function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// 更新分类
app.put(`${API_PREFIX}/categories/:id`, (req, res) => {
    const { name, sub } = req.body;
    const stmt = db.prepare("UPDATE categories SET name = ?, sub_categories = ? WHERE id = ?");
    stmt.run(name, JSON.stringify(sub), req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 删除分类
app.delete(`${API_PREFIX}/categories/:id`, (req, res) => {
    const categoryId = parseInt(req.params.id);
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // 先更新该分类下的商品，将它们的category_id设置为NULL
        db.run("UPDATE products SET category_id = NULL WHERE category_id = ?", [categoryId], function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            
            // 然后删除分类
            db.run("DELETE FROM categories WHERE id = ?", [categoryId], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                
                db.run("COMMIT");
                res.json({ success: true });
            });
        });
    });
});

// 创建订单
app.post(`${API_PREFIX}/orders`, (req, res) => {
    const { user_id, items, total_price, note } = req.body;
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // 修改了这里，使用了 datetime('now', 'localtime') 保证时区正确
        const stmt = db.prepare("INSERT INTO orders (user_id, total_price, note, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))");
        stmt.run(user_id, total_price, note || '', function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            
            const orderId = this.lastID;
            const itemStmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, is_backup, parent_item_id, snapshot_name, snapshot_price, snapshot_image, snapshot_category, snapshot_sub_category, snapshot_remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            // 异步插入可能导致问题，但在 serialize 中 run 是顺序的，不过为了拿到主商品的 ID 赋给备选商品，需要特殊处理
            // 这里我们采用 Promise 封装来处理层级关系
            
            const insertItems = async () => {
                try {
                    for (const item of items) {
                        // 插入主商品
                        const mainItemId = await new Promise((resolve, reject) => {
                            itemStmt.run(orderId, item.id, item.quantity, 0, null, item.name, item.price, item.image, item.category_name, item.sub_category, item.remark || '', function(err) {
                                if (err) reject(err);
                                else resolve(this.lastID);
                            });
                        });

                        // 插入该主商品的备选商品
                        if (item.backups && item.backups.length > 0) {
                            for (const backup of item.backups) {
                                await new Promise((resolve, reject) => {
                                    itemStmt.run(orderId, backup.id, backup.quantity || 1, 1, mainItemId, backup.name, backup.price, backup.image, backup.category_name, backup.sub_category, backup.remark || '', function(err) {
                                        if (err) reject(err);
                                        else resolve(this.lastID);
                                    });
                                });
                            }
                        }
                    }
                    itemStmt.finalize();
                    db.run("COMMIT", () => {
                        res.json({ success: true, order_id: orderId });
                    });
                } catch (error) {
                    itemStmt.finalize();
                    db.run("ROLLBACK");
                    res.status(500).json({ error: error.message });
                }
            };
            
            insertItems();
        });
        stmt.finalize();
    });
});

// 获取待处理订单
app.get(`${API_PREFIX}/orders/pending`, (req, res) => {
    // 联合查询订单和商品详情 (包括备选信息和留言)
    const sql = `
        SELECT o.id as order_id, o.total_price, o.note, o.status, o.created_at, u.name as user_name,
               oi.id as item_id, oi.quantity, oi.purchased, oi.is_backup, oi.parent_item_id, oi.product_id,
               oi.snapshot_name as product_name, oi.snapshot_price as price, oi.snapshot_image as image,
               oi.snapshot_category as category_name, oi.snapshot_sub_category as sub_category,
               oi.snapshot_remark as remark
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status IN ('pending', 'purchasing')
        ORDER BY o.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // 按订单分组
        const orders = {};
        rows.forEach(row => {
            if (!orders[row.order_id]) {
                orders[row.order_id] = {
                    id: row.order_id,
                    user_name: row.user_name,
                    total_price: row.total_price,
                    note: row.note,
                    status: row.status,
                    created_at: row.created_at,
                    items: []
                };
            }
            
            const itemObj = {
                id: row.item_id,
                product_id: row.product_id,
                name: row.product_name,
                price: row.price,
                image: row.image,
                category_name: row.category_name,
                sub_category: row.sub_category,
                remark: row.remark,
                quantity: row.quantity,
                purchased: row.purchased,
                is_backup: row.is_backup,
                parent_item_id: row.parent_item_id,
                backups: []
            };
            
            if (row.is_backup) {
                // 这是一个备选商品，找到它的主商品并放入 backups 数组
                const parent = orders[row.order_id].items.find(i => i.id === row.parent_item_id);
                if (parent) {
                    parent.backups.push(itemObj);
                } else {
                    // 如果主商品还没被处理到（因为排序问题），先放到根目录，后面可以做二次整理，但通常用树状结构一次处理较难
                    // 为简单起见，我们先都放到一维数组，前端再去组合。或者这里直接处理。
                    // 假设数据库返回顺序能保证主商品在前面（这里并没有保证）。
                    orders[row.order_id].items.push(itemObj);
                }
            } else {
                orders[row.order_id].items.push(itemObj);
            }
        });
        
        // 二次整理：将备选商品移动到主商品的 backups 里
        Object.values(orders).forEach(order => {
            const mainItems = [];
            const backupItems = [];
            
            order.items.forEach(item => {
                if (item.is_backup) backupItems.push(item);
                else mainItems.push(item);
            });
            
            backupItems.forEach(backup => {
                const parent = mainItems.find(m => m.id === backup.parent_item_id);
                if (parent) {
                    if (!parent.backups) parent.backups = [];
                    parent.backups.push(backup);
                }
            });
            
            order.items = mainItems;
        });
        
        res.json({ orders: Object.values(orders) });
    });
});

// 更新订单项状态 (划线打勾)
app.put(`${API_PREFIX}/order-items/:id`, (req, res) => {
    const { purchased, order_id } = req.body;
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        db.run("UPDATE order_items SET purchased = ? WHERE id = ?", [purchased ? 1 : 0, req.params.id], function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            
            // 只要打勾，订单状态就变为投喂中
            db.run("UPDATE orders SET status = 'purchasing' WHERE id = ? AND status = 'pending'", [order_id], function(err) {
                 if (err) {
                     db.run("ROLLBACK");
                     return res.status(500).json({ error: err.message });
                 }
                 db.run("COMMIT", () => {
                     res.json({ success: true });
                 });
            });
        });
    });
});

// 完成订单并结算
app.put(`${API_PREFIX}/orders/:id/complete`, (req, res) => {
    const { id } = req.params;
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // 1. 计算实际花费 (只计算 purchased = 1 的 order_items)
        const calcSql = `
            SELECT SUM(oi.quantity * oi.snapshot_price) as actual_total
            FROM order_items oi
            WHERE oi.order_id = ? AND oi.purchased = 1
        `;
        
        db.get(calcSql, [id], (err, row) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            
            const actualTotal = row.actual_total || 0;
            
            // 2. 更新订单状态和实际花费
            db.run("UPDATE orders SET status = 'completed', actual_price = ? WHERE id = ?", [actualTotal, id], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }

                // 3. 奖励心愿币给采购方
                db.run("UPDATE users SET coins = coins + 10 WHERE role = 'purchaser'", function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                    
                    db.run("COMMIT", () => {
                        res.json({ success: true, earned_coins: 10, actual_total: actualTotal });
                    });
                });
            });
        });
    });
});

// 获取回忆墙数据统计
app.get(`${API_PREFIX}/stats`, (req, res) => {
    // 修改统计逻辑：只计算 actual_price，不再计算 total_price
    db.get("SELECT COUNT(*) as total_orders, SUM(actual_price) as total_spent FROM orders WHERE status = 'completed'", (err, orderStats) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // 统计 top_products: 按照商品在订单中出现的次数统计（无论数量多少，一个订单中出现一次即算一次）
        // 同样只计算 purchased = 1 的
        db.all(`
            SELECT oi.snapshot_name as name, oi.snapshot_image as image, COUNT(DISTINCT o.id) as count 
            FROM order_items oi 
            JOIN orders o ON oi.order_id = o.id 
            WHERE o.status = 'completed' AND oi.purchased = 1
            GROUP BY oi.product_id 
            ORDER BY count DESC 
            LIMIT 3
        `, (err, topProducts) => {
            if (err) return res.status(500).json({ error: err.message });

            db.get("SELECT MIN(created_at) as first_order_date FROM orders", (err, dateRow) => {
                let days = 1;
                if (dateRow && dateRow.first_order_date) {
                    const start = new Date(dateRow.first_order_date);
                    const now = new Date();
                    days = Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
                }
                
                res.json({
                    total_orders: orderStats.total_orders || 0,
                    total_spent: orderStats.total_spent || 0,
                    top_products: topProducts || [],
                    days_used: days
                });
            });
        });
    });
});

// 获取所有订单记录（双方共用）
app.get(`${API_PREFIX}/orders/history`, (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // 先获取订单ID列表（分页）
        const orderIdsSql = `
            SELECT id FROM orders 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        db.all(orderIdsSql, [limit, offset], (err, orderIdRows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const orderIds = orderIdRows.map(row => row.id);
            
            if (orderIds.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        orders: [],
                        pagination: {
                            page: page,
                            limit: limit,
                            total: 0,
                            pages: 0
                        }
                    }
                });
            }

            // 获取订单总数
            const countSql = 'SELECT COUNT(*) as total FROM orders';
            db.get(countSql, (err, countResult) => {
                if (err) return res.status(500).json({ error: err.message });
                
                const total = countResult.total;
                
                // 联合查询订单和商品详情
                const sql = `
                    SELECT o.id as order_id, o.total_price, o.actual_price, o.note, o.status, o.created_at, u.name as user_name,
                           oi.id as item_id, oi.quantity, oi.purchased, oi.is_backup, oi.parent_item_id, oi.product_id,
                           oi.snapshot_name as product_name, oi.snapshot_price as price, oi.snapshot_image as image,
                           oi.snapshot_category as category_name, oi.snapshot_sub_category as sub_category,
                           oi.snapshot_remark as remark
                    FROM orders o
                    JOIN users u ON o.user_id = u.id
                    JOIN order_items oi ON o.id = oi.order_id
                    WHERE o.id IN (${orderIds.map(() => '?').join(',')})
                    ORDER BY o.created_at DESC
                `;
                
                db.all(sql, orderIds, (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    const orders = {};
                    rows.forEach(row => {
                        if (!orders[row.order_id]) {
                            orders[row.order_id] = {
                                id: row.order_id,
                                user_name: row.user_name,
                                total_price: row.total_price,
                                actual_price: row.actual_price,
                                note: row.note,
                                status: row.status,
                                created_at: row.created_at,
                                items: []
                            };
                        }
                        
                        const itemObj = {
                            id: row.item_id,
                            product_id: row.product_id,
                            name: row.product_name,
                            price: row.price,
                            image: row.image,
                            category_name: row.category_name,
                            sub_category: row.sub_category,
                            remark: row.remark,
                            quantity: row.quantity,
                            purchased: row.purchased,
                            is_backup: row.is_backup,
                            parent_item_id: row.parent_item_id,
                            backups: []
                        };
                        
                        if (row.is_backup) {
                            const parent = orders[row.order_id].items.find(i => i.id === row.parent_item_id);
                            if (parent) {
                                parent.backups.push(itemObj);
                            } else {
                                orders[row.order_id].items.push(itemObj);
                            }
                        } else {
                            orders[row.order_id].items.push(itemObj);
                        }
                    });
                    
                    Object.values(orders).forEach(order => {
                        const mainItems = [];
                        const backupItems = [];
                        order.items.forEach(item => {
                            if (item.is_backup) backupItems.push(item);
                            else mainItems.push(item);
                        });
                        backupItems.forEach(backup => {
                            const parent = mainItems.find(m => m.id === backup.parent_item_id);
                            if (parent) {
                                if (!parent.backups) parent.backups = [];
                                parent.backups.push(backup);
                            }
                        });
                        order.items = mainItems;
                    });
                    
                    // 确保顺序与 orderIds 一致
                    const orderedOrders = orderIds.map(id => orders[id]).filter(Boolean);
                    
                    res.json({
                        success: true,
                        data: {
                            orders: orderedOrders,
                            pagination: {
                                page: page,
                                limit: limit,
                                total: total,
                                pages: Math.ceil(total / limit)
                            }
                        }
                    });
                });
            });
        });
    } catch (error) {
        console.error('获取订单历史失败:', error);
        res.status(500).json({ error: '获取订单历史失败' });
    }
});

// 删除订单
app.delete(`${API_PREFIX}/orders/:id`, (req, res) => {
    const { id } = req.params;
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // 先删除订单项
        db.run("DELETE FROM order_items WHERE order_id = ?", [id], function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            
            // 再删除订单
            db.run("DELETE FROM orders WHERE id = ?", [id], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                
                // 重置自增ID
                db.get("SELECT MAX(id) as maxId FROM orders", (err, row) => {
                    const maxId = row ? row.maxId || 0 : 0;
                    db.run("UPDATE sqlite_sequence SET seq = ? WHERE name = 'orders'", [maxId], function(err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: err.message });
                        }
                        db.run("COMMIT", () => {
                            res.json({ success: true });
                        });
                    });
                });
            });
        });
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});