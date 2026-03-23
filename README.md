# jjlove 项目

一个为情侣设计的点餐和采购管理系统，帮助情侣之间更便捷地管理日常餐饮需求。

## 技术栈

### 前端
- React 19
- React Router v7
- Tailwind CSS
- Axios
- Lucide React (图标库)

### 后端
- Node.js
- Express
- SQLite
- Multer (文件上传)

## 项目结构

```
jjlove/
├── client/           # 前端代码
│   ├── public/       # 静态资源
│   ├── src/          # 源代码
│   │   ├── components/  # 组件
│   │   ├── context/     # 上下文
│   │   ├── pages/       # 页面
│   │   ├── services/    # API 服务
│   │   ├── App.jsx      # 应用入口
│   │   └── main.jsx     # 主入口
│   └── package.json  # 前端依赖
├── server/           # 后端代码
│   ├── db/           # 数据库
│   │   ├── uploads/  # 上传的图片
│   │   └── database.js # 数据库配置
│   ├── middleware/   # 中间件
│   ├── routes/       # 路由
│   ├── index.js      # 后端入口
│   └── package.json  # 后端依赖
├── deploy.sh         # 部署脚本
├── start.sh          # 启动脚本
└── README.md         # 项目说明
```

## 功能特性

### 前端功能
- 用户登录（PIN码验证）
- 商品浏览和分类筛选
- 购物车管理
- 订单创建和提交
- 订单历史记录
- 商品管理（添加、编辑、删除）
- 分类管理
- 回忆墙（统计数据）

### 后端功能
- 用户认证
- 商品管理 API
- 分类管理 API
- 订单管理 API
- 图片上传服务
- 数据统计 API

## 安装和运行

### 前置要求
- Node.js 18+
- npm 或 yarn

### 安装步骤

1. 克隆项目
   ```bash
   git clone <repository-url>
   cd jjlove
   ```

2. 安装前端依赖
   ```bash
   cd client
   npm install
   cd ..
   ```

3. 安装后端依赖
   ```bash
   cd server
   npm install
   cd ..
   ```

### 本地运行

1. 启动后端服务
   ```bash
   cd server
   npm start
   # 或使用 PM2 运行
   pm2 start index.js --name "jjlove-api"
   ```

2. 启动前端开发服务器
   ```bash
   cd client
   npm run dev
   ```

3. 访问应用
   - 前端：http://localhost:5173
   - 后端 API：http://localhost:3000/jjlove/api

## 部署

项目提供了自动化部署脚本，适用于 Ubuntu/Debian 系统：

1. 确保脚本有执行权限
   ```bash
   chmod +x deploy.sh
   ```

2. 执行部署脚本
   ```bash
   sudo ./deploy.sh
   ```

部署完成后，可通过服务器 IP 访问应用：http://服务器IP/jjlove

## 数据库说明

- 项目使用 SQLite 数据库，文件位于 `server/db/jjlove.db`
- 首次运行时会自动创建数据库表结构
- 初始数据包含两个用户：
  - 采购方
  - 点单方
- 初始分类包含：早餐、晚餐、零食

## 注意事项

1. **数据库备份**：定期备份 `server/db/jjlove.db` 文件
2. **图片存储**：上传的图片存储在 `server/db/uploads/` 目录
3. **安全性**：建议在生产环境中配置 HTTPS
4. **性能优化**：对于大量商品或订单，可能需要优化数据库查询


