const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'jjlove.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// 初始化数据表
db.serialize(() => {
    // 用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL, -- 'orderer' (点单方) 或 'purchaser' (采购方)
        pin TEXT NOT NULL,
        avatar TEXT,
        coins INTEGER DEFAULT 0
    )`);

    // 分类表
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sub_categories TEXT -- JSON 数组格式
    )`);

    // 商品表
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        image TEXT,
        category_id INTEGER,
        sub_category TEXT,
        remark TEXT DEFAULT '',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id)
    )`, () => {
        // 尝试添加新字段（如果已经存在则会报错，这里捕获并忽略）
        db.run(`ALTER TABLE products ADD COLUMN remark TEXT DEFAULT ''`, (err) => {});
        db.run(`ALTER TABLE products ADD COLUMN create_time DATETIME DEFAULT '2026-03-19 17:00:00'`, (err) => {
            if (!err) {
                // 如果成功添加了 create_time 列，说明是旧数据，将现有数据的时间设置为 2026-03-19 17:00:00
                db.run(`UPDATE products SET create_time = '2026-03-19 17:00:00' WHERE create_time IS NULL`);
            }
        });
        db.run(`ALTER TABLE products ADD COLUMN update_time DATETIME DEFAULT '2026-03-19 17:00:00'`, (err) => {});
    });

    // 订单表
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        status TEXT DEFAULT 'pending', -- 状态: 'pending' (待投喂), 'purchasing' (投喂中), 'completed' (已投喂)
        total_price REAL, -- 预计总价
        actual_price REAL DEFAULT 0, -- 实际花费总价
        note TEXT, -- 小留言
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // 订单项表
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER DEFAULT 1,
        purchased BOOLEAN DEFAULT 0,
        is_backup BOOLEAN DEFAULT 0, -- 是否是备选商品
        parent_item_id INTEGER, -- 关联的主商品项的id (如果是备选商品)
        snapshot_name TEXT, -- 商品名称快照
        snapshot_price REAL, -- 商品价格快照
        snapshot_image TEXT, -- 商品图片快照
        snapshot_category TEXT, -- 商品分类快照
        snapshot_sub_category TEXT, -- 商品子分类快照
        snapshot_remark TEXT, -- 商品备注快照
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`, () => {
        db.run(`ALTER TABLE order_items ADD COLUMN snapshot_name TEXT`, (err) => {});
        db.run(`ALTER TABLE order_items ADD COLUMN snapshot_price REAL`, (err) => {});
        db.run(`ALTER TABLE order_items ADD COLUMN snapshot_image TEXT`, (err) => {});
        db.run(`ALTER TABLE order_items ADD COLUMN snapshot_category TEXT`, (err) => {});
        db.run(`ALTER TABLE order_items ADD COLUMN snapshot_sub_category TEXT`, (err) => {
            if (!err) {
                // 如果成功添加了新列，说明是旧数据，需要通过关联 products 表来回填数据
                db.run(`
                    UPDATE order_items
                    SET
                        snapshot_name = (SELECT name FROM products WHERE id = order_items.product_id),
                        snapshot_price = (SELECT price FROM products WHERE id = order_items.product_id),
                        snapshot_image = (SELECT image FROM products WHERE id = order_items.product_id),
                        snapshot_category = (SELECT c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = order_items.product_id),
                        snapshot_sub_category = (SELECT sub_category FROM products WHERE id = order_items.product_id)
                    WHERE snapshot_name IS NULL
                `);

                // 对于商品已经被删除的订单项，给一个默认提示
                db.run(`UPDATE order_items SET snapshot_name = '已下架商品' WHERE snapshot_name IS NULL`);
            }
        });
        db.run(`ALTER TABLE order_items ADD COLUMN snapshot_remark TEXT`, (err) => {
            if (!err) {
                // 回填 remark 数据
                db.run(`
                    UPDATE order_items
                    SET snapshot_remark = (SELECT remark FROM products WHERE id = order_items.product_id)
                    WHERE snapshot_remark IS NULL
                `);
            }
        });
    });

    // 如果数据库为空，则注入初始数据
    db.get("SELECT count(*) as count FROM users", (err, row) => {
        if (row.count === 0) {
            console.log("正在注入初始数据...");
            const stmt = db.prepare("INSERT INTO users (name, role, pin, avatar, coins) VALUES (?, ?, ?, ?, ?)");
            stmt.run("大宝贝", "purchaser", "5678", "https://api.dicebear.com/9.x/fun-emoji/svg?seed=King", 0);
            stmt.run("小藏獒", "orderer", "1234", "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Princess", 0);
            stmt.finalize();

            const catStmt = db.prepare("INSERT INTO categories (name, sub_categories) VALUES (?, ?)");
            catStmt.run("🥐 早餐", JSON.stringify(["全部", "主食", "饮品"]));
            catStmt.run("🍱 晚餐", JSON.stringify(["全部", "主食", "汤羹"]));
            catStmt.run("🍿 零食", JSON.stringify(["全部", "甜食", "咸口"]))
            catStmt.finalize();

            const prodStmt = db.prepare("INSERT INTO products (name, price, image, category_id, sub_category) VALUES (?, ?, ?, ?, ?)");
            prodStmt.run("牛奶", 5.0, "🥛", 1, "饮品");
            prodStmt.run("可乐", 3.0, "🥤", 3, "甜食");
            prodStmt.finalize();
        }
    });
});

module.exports = db;
