const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const db = require('../db/database');
const path = require('path');
const fs = require('fs');

// 图片上传接口
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传图片文件' });
    }

    // 返回相对路径，用于数据库存储
    const relativePath = path.join('uploads', req.file.filename);
    
    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        filename: req.file.filename,
        path: relativePath,
        url: `/api/images/${relativePath}`
      }
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ error: '图片上传失败' });
  }
});

// 获取商品列表（分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const categoryId = req.query.category_id;
    const subCategory = req.query.sub_category;

    // 构建查询条件
    let whereClause = '';
    let params = [];
    
    if (categoryId && categoryId !== 'uncategorized') {
      whereClause = 'WHERE category_id = ?';
      params.push(categoryId);
      
      // 如果提供了子分类，添加子分类过滤
      if (subCategory && subCategory !== '全部') {
        whereClause += ' AND sub_category = ?';
        params.push(subCategory);
      }
    } else if (categoryId === 'uncategorized') {
      whereClause = 'WHERE category_id IS NULL OR category_id = \'\'';
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    db.get(countQuery, params, (err, totalResult) => {
      if (err) {
        console.error('获取商品总数失败:', err);
        return res.status(500).json({ error: '获取商品列表失败' });
      }
      
      const total = totalResult.total;

      // 获取分页数据
      const query = `
        SELECT p.id, p.name, p.price, p.image, p.category_id, p.sub_category, p.remark, p.create_time, p.update_time,
               c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY p.create_time DESC
        LIMIT ? OFFSET ?
      `;
      
      db.all(query, [...params, limit, offset], (err, products) => {
        if (err) {
          console.error('获取商品数据失败:', err);
          return res.status(500).json({ error: '获取商品列表失败' });
        }

        res.json({
          success: true,
          data: {
            products: products,
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
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 获取单个商品
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.id, p.name, p.price, p.image, p.category_id, p.sub_category, p.remark, p.create_time, p.update_time,
             c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;

    db.get(query, [id], (err, product) => {
      if (err) {
        console.error('获取商品失败:', err);
        return res.status(500).json({ error: '获取商品失败' });
      }

      if (!product) {
        return res.status(404).json({ error: '商品不存在' });
      }

      res.json({
        success: true,
        data: product
      });
    });
  } catch (error) {
    console.error('获取商品失败:', error);
    res.status(500).json({ error: '获取商品失败' });
  }
});

// 处理base64编码的图片
const handleBase64Image = (base64String) => {
  try {
    // 检查是否是base64编码的图片
    if (!base64String || !base64String.startsWith('data:image/')) {
      return null;
    }

    // 提取base64数据
    const base64Data = base64String.split(',')[1];
    if (!base64Data) return null;

    // 解码base64数据
    const buffer = Buffer.from(base64Data, 'base64');

    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'upload_' + uniqueSuffix + '.jpg';
    const uploadDir = path.join(__dirname, '../db/uploads');

    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 保存文件
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    // 返回相对路径
    return path.join('uploads', filename);
  } catch (error) {
    console.error('处理base64图片失败:', error);
    return null;
  }
};

// 创建商品
router.post('/', upload.single('image'), (req, res) => {
  try {
    const { name, price, remark, category_id, sub_category, image_url, image } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: '商品名称和价格不能为空' });
    }

    let imagePath = null;
    if (req.file) {
      // 处理实际文件上传
      imagePath = path.join('uploads', req.file.filename);
    } else if (image) {
      // 处理base64编码的图片
      imagePath = handleBase64Image(image);
    } else if (image_url) {
      // 处理URL或Emoji
      imagePath = image_url;
    }

    const query = `
      INSERT INTO products (name, price, image, category_id, sub_category, remark, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `;
    
    const result = db.prepare(query).run(name, price, imagePath, category_id, sub_category, remark || '');
    
    res.json({
      success: true,
      message: '商品创建成功',
      data: {
        id: result.lastInsertRowid,
        image: imagePath
      }
    });
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(500).json({ error: '创建商品失败' });
  }
});

// 更新商品
router.put('/:id', upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, remark, category_id, sub_category, image_url, image } = req.body;
    
    // 先获取原商品信息
    const selectQuery = 'SELECT image FROM products WHERE id = ?';
    
    db.get(selectQuery, [id], (err, existingProduct) => {
      if (err) {
        console.error('查询商品信息失败:', err);
        return res.status(500).json({ error: '查询商品信息失败' });
      }
      
      if (!existingProduct) {
        return res.status(404).json({ error: '商品不存在' });
      }

      let imagePath = existingProduct.image;
      
      if (req.file) {
        // 处理实际文件上传
        imagePath = path.join('uploads', req.file.filename);
      } else if (image) {
        // 处理base64编码的图片
        const base64ImagePath = handleBase64Image(image);
        if (base64ImagePath) {
          imagePath = base64ImagePath;
        }
      } else if (image_url !== undefined) {
        // 处理URL或Emoji
        imagePath = image_url;
      }

      // 如果图片发生变化且原图片是本地文件，删除原图片
      if (existingProduct.image && existingProduct.image !== imagePath && existingProduct.image.startsWith('uploads/')) {
        const oldImagePath = path.join(__dirname, '../db', existingProduct.image);
        console.log('尝试删除旧图片文件:', oldImagePath);
        if (fs.existsSync(oldImagePath)) {
          console.log('旧图片文件存在，执行删除操作');
          try {
            fs.unlinkSync(oldImagePath);
            console.log('旧图片文件删除成功');
          } catch (err) {
            console.error('删除旧图片文件失败:', err);
          }
        } else {
          console.log('旧图片文件不存在:', oldImagePath);
        }
      }

      const query = `
        UPDATE products 
        SET name = ?, price = ?, image = ?, category_id = ?, sub_category = ?, remark = ?, update_time = datetime('now', 'localtime')
        WHERE id = ?
      `;
      
      db.run(query, [name, price, imagePath, category_id, sub_category, remark || '', id], (err) => {
        if (err) {
          console.error('更新商品失败:', err);
          return res.status(500).json({ error: '更新商品失败' });
        }
        
        res.json({
          success: true,
          message: '商品更新成功',
          data: {
            image: imagePath
          }
        });
      });
    });
  } catch (error) {
    console.error('更新商品失败:', error);
    res.status(500).json({ error: '更新商品失败' });
  }
});

// 删除商品
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // 先获取商品信息（包括图片路径）
    const selectQuery = 'SELECT image FROM products WHERE id = ?';
    
    db.get(selectQuery, [id], (err, product) => {
      if (err) {
        console.error('查询商品信息失败:', err);
        return res.status(500).json({ error: '查询商品信息失败' });
      }
      
      console.log('查询到的商品信息:', product);
      console.log('商品ID:', id);
      
      if (!product) {
        console.log('商品不存在:', id);
        return res.status(404).json({ error: '商品不存在' });
      }

      // 保存图片路径以便后续删除
      const imagePathToDelete = product.image;
      console.log('准备删除的图片路径:', imagePathToDelete);

      // 删除商品记录
      const deleteQuery = 'DELETE FROM products WHERE id = ?';
      db.run(deleteQuery, [id], (err) => {
        if (err) {
          console.error('删除商品记录失败:', err);
          return res.status(500).json({ error: '删除商品失败' });
        }
        
        console.log('删除商品记录成功');
        
        // 如果有图片且不是URL或Emoji，删除服务器上的图片文件
        console.log('删除商品时的图片信息:', imagePathToDelete);
        if (imagePathToDelete && imagePathToDelete.startsWith('uploads/')) {
          const imagePath = path.join(__dirname, '../db', imagePathToDelete);
          console.log('尝试删除图片文件:', imagePath);
          if (fs.existsSync(imagePath)) {
            console.log('图片文件存在，执行删除操作');
            try {
              fs.unlinkSync(imagePath);
              console.log('图片文件删除成功');
            } catch (err) {
              console.error('删除图片文件失败:', err);
            }
          } else {
            console.log('图片文件不存在:', imagePath);
          }
        } else {
          console.log('图片路径不符合删除条件，跳过删除操作');
        }
        
        res.json({
          success: true,
          message: '商品删除成功'
        });
      });
    });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({ error: '删除商品失败' });
  }
});

module.exports = router;