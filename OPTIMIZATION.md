# lightsail-ip-rotator 优化计划

## 📁 代码结构

### 1. 拆分模块
将 `index.js` 拆分为以下模块，避免单文件过于臃肿：

| 文件 | 职责 |
|------|------|
| `config.js` | 配置读取（环境变量、常量） |
| `lightsail.js` | AWS Lightsail API 操作封装 |
| `checker.js` | IP 连通性检测 |
| `notifier.js` | 消息通知（Server酱等） |
| `index.js` | 入口文件，组织调度逻辑 |

### 2. 引入 `.env` 配置管理
- 使用 `dotenv` 包管理环境变量
- 创建 `.env.example` 文件列出所有配置项
- 不再在源码中直接引用 `process.env`

---

## 🛡 健壮性

### 3. `detachStaticIp` 缺少 try/catch
解绑静态 IP 时如果 AWS API 调用失败（如 IP 已被其他实例占用），会导致整个流程崩溃。需要增加错误处理。

### 4. `releaseStaticIp` 缺少 try/catch
释放静态 IP 时同样缺少错误处理，应统一增加 try/catch 并记录错误日志。

### 5. TCP 连接超时后资源清理
`netClient.destroy()` 后应调用 `netClient.unref()`，确保 TCP socket 不会阻止 Node.js 进程退出。

---

## 🚀 功能增强

### 6. 优雅退出
监听 `SIGINT` / `SIGTERM` 信号，在程序退出前：
- 等待正在进行的 IP 更换操作完成
- 关闭定时器
- 打印退出日志

```js
process.on("SIGINT", async () => {
  console.log("正在优雅退出...");
  clearInterval(timer);
  // 等待进行中的操作
  process.exit(0);
});
```

### 7. 更换成功通知增强
Server酱 通知内容应包含更多有用信息：
- 实例名称
- 旧 IP 地址
- 新 IP 地址
- 更换时间

### 8. 并发 TCP 检测
当前多个实例的 TCP 检测是串行执行的，可以使用 `Promise.allSettled()` 并行检测所有实例的 IP，提高效率。

### 9. 更换记录日志
将每次 IP 更换记录到文件（如 `history.log`），包含：
- 时间戳
- 实例名称/区域
- 旧 IP → 新 IP
- 更换结果

---

## 📝 文档

### 10. 更新 README
当前 README 还是旧版本的说明，需要更新为：
- 新的项目名称和仓库地址
- 环境变量配置方式
- 安装和使用步骤
- 运行原理说明

### 11. 添加 `.env.example`
```env
# AWS 凭证
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# AWS 区域（多个用逗号分隔）
AWS_REGIONS=ap-northeast-1

# IP 检测配置
PING_TIMEOUT=150
CHECK_INTERVAL_SEC=150

# Server酱 通知（可选）
SERVER_CHAN_TOKEN=your_token
```

---

## 🎯 小优化

### 12. IP 名称可读性增强
当前静态 IP 名称格式：
```
StaticIp-${crypto.randomUUID()}-${Date.now()}
```
建议改为包含实例名前缀，便于在 AWS 控制台中识别：
```
${server.name}-${Date.now()}
```

### 13. `request()` 函数风格统一
将 `.then()/.catch()` 的 Promise 链改为统一的 `async/await` 风格，保持代码一致性。

### 14. 端口可基于实例配置
不同实例可能需要检测不同端口（SSH=22, RDP=3389, HTTP=80），可以通过实例 Tag 或额外配置来实现按实例指定检测端口。
