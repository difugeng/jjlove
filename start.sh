#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== jjlove 项目启动脚本 ===${NC}"

# 检查并安装后端依赖
if [ ! -d "server/node_modules" ]; then
    echo -e "${GREEN}正在安装后端依赖...${NC}"
    cd server && npm install && cd ..
fi

# 检查并安装前端依赖
if [ ! -d "client/node_modules" ]; then
    echo -e "${GREEN}正在安装前端依赖...${NC}"
    cd client && npm install && cd ..
fi

# 启动后端服务
echo -e "${GREEN}正在启动后端服务 (端口 3000)...${NC}"
cd server
npm start &
SERVER_PID=$!
cd ..

# 等待后端启动
sleep 2

# 启动前端服务
echo -e "${GREEN}正在启动前端服务...${NC}"
cd client
npm run dev &
CLIENT_PID=$!
cd ..

echo -e "${BLUE}项目已启动! 按 Ctrl+C 停止所有服务${NC}"

# 捕获退出信号，清理进程
trap "kill $SERVER_PID $CLIENT_PID; exit" SIGINT SIGTERM

# 保持脚本运行
wait
