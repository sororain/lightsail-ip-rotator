# lightsail-ip-rotator

定时检测 AWS Lightsail 实例 IP 连通性，当 IP 被阻断时自动更换。

> 请部署在国内服务器上，放在国外无法有效检测 IP 连通性。

## 工作原理

1. 获取所有 Lightsail 实例列表
2. 对每个实例的 IP 进行持续 Ping 检测（60 秒内发 60 个包，有任一回复即视为可达）
3. 如果 IP 不可达，自动执行更换流程：
   - **已有静态 IP** → 解绑旧 IP → 释放旧 IP → 分配新 IP → 绑定新 IP
   - **无静态 IP** → 直接分配新静态 IP → 绑定
4. 每 1 分钟循环检测（可配置）

## 前置要求

- Node.js 20 LTS+
- AWS 账号及 [IAM 访问密钥](https://console.aws.amazon.com/iam/home?region=ap-northeast-1#/security_credentials)
- pm2（推荐生产使用）

## 安装

```bash
# 1. 安装 Node.js（推荐使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | sh
reboot
nvm install --lts
npm i pm2 -g

# 2. 下载项目
git clone https://github.com/sororain/lightsail-ip-rotator.git
cd lightsail-ip-rotator

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 AWS 凭证和配置
```

## 配置

通过环境变量配置，支持 `.env` 文件：

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `AWS_ACCESS_KEY_ID` | 是 | - | AWS 访问密钥 ID |
| `AWS_SECRET_ACCESS_KEY` | 是 | - | AWS 秘密访问密钥 |
| `AWS_REGIONS` | 否 | `ap-northeast-1` | AWS 区域，多个用逗号分隔 |
| `PING_TIMEOUT` | 否 | `60` | Ping 检测时长（秒），持续发包，全丢才算不通 |
| `CHECK_INTERVAL_MIN` | 否 | `1` | 检测间隔（分钟） |
| `SERVER_CHAN_TOKEN` | 否 | - | Server酱 推送 Token |

## 运行

```bash
# 开发模式（nodemon 热重载）
npm start

# 生产模式（pm2 守护进程）
npm run build
```

PM2 管理命令：

```bash
pm2 list               # 查看进程列表
pm2 logs lightsail     # 查看日志
pm2 restart lightsail  # 重启
pm2 stop lightsail     # 停止
```

## 项目结构

```
lightsail-ip-rotator/
├── index.js       # 入口文件，业务流程编排
├── config.js      # 配置管理（环境变量读取）
├── lightsail.js   # AWS Lightsail API 操作封装
├── checker.js     # TCP 连通性检测
├── notifier.js    # 消息通知（Server酱）
├── logger.js      # 本地日志记录
├── .env.example   # 环境变量模板
├── package.json
└── README.md
```

## 支持的区域

- us-east-2, us-east-1, us-west-2
- ap-south-1, ap-northeast-2, ap-southeast-1, ap-southeast-2, ap-northeast-1
- ca-central-1
- eu-central-1, eu-west-1, eu-west-2, eu-west-3, eu-north-1
