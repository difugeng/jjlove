#!/bin/bash

# jjlove 自动化部署脚本
# 适用系统: Ubuntu/Debian
# 请使用 root 权限或 sudo 执行此脚本

echo "======================================================="
echo "💖 正在开始部署 jjlove 项目..."
echo "======================================================="

# 1. 检查并安装 Node.js 和 npm
if ! command -v node &> /dev/null
then
    echo "📦 未检测到 Node.js，正在安装 Node.js (v18.x)..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js 已安装: $(node -v)"
fi

# 2. 检查并安装 PM2
if ! command -v pm2 &> /dev/null
then
    echo "📦 未检测到 PM2，正在全局安装 PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 已安装: $(pm2 -v)"
fi

# 3. 检查并安装 Nginx
if ! command -v nginx &> /dev/null
then
    echo "📦 未检测到 Nginx，正在安装 Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
else
    echo "✅ Nginx 已安装"
fi

# 4. 获取当前项目绝对路径
PROJECT_ROOT=$(pwd)
SERVER_DIR="$PROJECT_ROOT/server"
CLIENT_DIR="$PROJECT_ROOT/client"

echo "📂 项目根目录: $PROJECT_ROOT"

# 5. 部署后端服务
echo "======================================================="
echo "⚙️ 正在部署后端服务..."
echo "======================================================="
cd "$SERVER_DIR" || exit
echo "📦 安装并重新编译后端依赖..."
# 强制清理旧的依赖并重新安装编译，解决 sqlite3 等原生模块在不同系统/架构下的二进制兼容性问题
rm -rf node_modules
npm install --build-from-source

echo "🚀 使用 PM2 启动后端服务..."
# 确保 pm2 命令的正确执行路径，并在启动时指定工作目录，防止找不到相对路径的 sqlite 数据库文件等
# 如果服务已经存在，先删除再启动，确保环境变量和路径更新
if pm2 describe jjlove-api > /dev/null 2>&1; then
    echo "🔄 重启已存在的 jjlove-api 服务..."
    pm2 delete jjlove-api
fi

echo "▶️ 启动新的 jjlove-api 服务..."
# 切换到 server 目录，确保相对路径（如 './db/database.js'）正确解析
cd "$SERVER_DIR" || exit
pm2 start index.js --name "jjlove-api" --watch

# 保存 PM2 进程列表，设置开机自启
pm2 save
pm2 startup | tail -n 1 | bash

# 6. 部署前端服务
echo "======================================================="
echo "🎨 正在打包前端服务..."
echo "======================================================="
cd "$CLIENT_DIR" || exit
echo "📦 安装前端依赖..."
npm install

echo "🔨 正在构建前端静态文件..."
npm run build

if [ -d "$CLIENT_DIR/dist" ]; then
    echo "✅ 前端构建成功，产物目录: $CLIENT_DIR/dist"
    # 根据你的操作习惯，前端产物就留在 client/dist 下即可
    # Nginx 会直接指向这里，不需要移动文件
else
    echo "❌ 前端构建失败，请检查错误日志！"
    exit 1
fi

# 7. 配置 Nginx
echo "======================================================="
echo "🌐 正在配置 Nginx..."
echo "======================================================="

# 获取当前服务器的公网 IP (用于 Nginx 配置提示)
PUBLIC_IP=$(curl -s ifconfig.me || echo "你的服务器IP")

NGINX_CONF="/etc/nginx/sites-available/jjlove"
NGINX_LINK="/etc/nginx/sites-enabled/jjlove"

# 创建 Nginx 配置文件
CLIENT_DIST_DIR="$PROJECT_ROOT/client/dist"
UPLOADS_DIR="$PROJECT_ROOT/server/db/uploads"

sudo bash -c "cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name _; # 匹配任意域名或IP

    # 1. 根路径：指向原来的网站目录 (保留原网站访问)
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ =404;
    }

    # 2. jjlove 前端页面访问 (支持 React Router 单页应用)
    location /jjlove {
        # 指向客户端构建产物目录
        alias $CLIENT_DIST_DIR;
        index index.html;
        try_files \$uri \$uri/ /jjlove/index.html;
    }

    # 3. jjlove 后端 API
    location /jjlove/api/ {
        # 代理到后端服务
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 允许上传大文件
        client_max_body_size 50M;
    }

    # 4. 静态资源访问（上传的图片）
    location /jjlove/uploads/ {
        alias $UPLOADS_DIR;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
EOF"

# 启用配置
sudo ln -sf "$NGINX_CONF" "$NGINX_LINK"
# 移除默认配置（如果存在）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试并重启 Nginx
echo "🔄 正在重启 Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    echo "✅ Nginx 重启成功"
else
    echo "❌ Nginx 配置有误，请手动检查 $NGINX_CONF"
fi

echo "======================================================="
echo "🎉 部署完成！"
echo "👉 现在你可以通过浏览器访问: http://$PUBLIC_IP/jjlove"
echo "📱 手机端访问该地址后，可通过浏览器菜单【添加到主屏幕】将应用安装为桌面 App。"
echo "======================================================="
