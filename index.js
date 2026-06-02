const {
  clients,
  fetchInstances,
  fetchStaticIps,
  detachStaticIp,
  releaseStaticIp,
  allocateStaticIp,
  attachStaticIp,
} = require("./lightsail");
const { checkConnectivity } = require("./checker");
const { sendMsgByServerChan } = require("./notifier");
const { log } = require("./logger");
const config = require("./config");

// ============================================================
// 业务流程编排
// ============================================================

/**
 * 获取所有 Lightsail 实例并逐个检查 IP 连通性
 */
async function getInstances() {
  log("INFO", "开始新一轮 IP 检查");

  // 并发获取所有区域的实例列表
  const results = await Promise.allSettled(
    clients.map(async (client) => {
      const servers = await fetchInstances(client);
      return { client, servers };
    })
  );

  const allChecks = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { client, servers } = result.value;
      for (const server of servers) {
        allChecks.push(checkIp(client, server));
      }
    } else {
      log("ERROR", `获取实例列表失败: ${result.reason.message}`);
    }
  }

  // 等待所有检测完成并输出汇总
  const checkResults = await Promise.allSettled(allChecks);
  const stats = { reachable: 0, changed: 0, failed: 0 };

  for (const r of checkResults) {
    if (r.status === "fulfilled") {
      stats[r.value.status]++;
    } else {
      stats.failed++;
    }
  }

  log("INFO", `本轮检查完成: ${stats.reachable} 个可达, ${stats.changed} 个已更换, ${stats.failed} 个失败`);
}

/**
 * 检测指定实例 IP 连通性，不可达时自动更换
 */
/**
 * 检测指定实例 IP 连通性，不可达时自动更换
 * @returns {Promise<{server: object, status: string}>}
 */
async function checkIp(client, server) {
  return new Promise((resolve) => {
    const host = server.publicIpAddress;
    log("INFO", `正在检查 ${server.name} (${host}) 连通性`);

    checkConnectivity(
      host,
      // 可达
      () => resolve({ server, status: "reachable" }),
      // 不可达
      async () => {
        log("INFO", `${server.name} (${host}) IP不可达，开始更换`);
        try {
          if (server.isStaticIp) {
            await rotateStaticIp(client, server);
          } else {
            await allocateAndAttach(client, server);
          }
          resolve({ server, status: "changed" });
        } catch (err) {
          log("ERROR", `${host} IP更换失败: ${err.message}`);
          resolve({ server, status: "failed" });
        }
      }
    );
  });
}

/**
 * 处理已有静态 IP 的实例：解绑旧 IP → 释放旧 IP → 分配新 IP → 绑定新 IP
 */
async function rotateStaticIp(client, server) {
  log("INFO", "正在获取区域所有静态 IP 列表");
  const staticIps = await fetchStaticIps(client);
  log("INFO", "获取区域所有静态 IP 列表成功");

  const oldIp = server.publicIpAddress;
  const activeStaticIpItem = staticIps.find(
    (item) => item.ipAddress === oldIp
  );

  if (activeStaticIpItem) {
    log("INFO", `正在解绑静态 IP: ${activeStaticIpItem.name} (${activeStaticIpItem.ipAddress})`);
    await detachStaticIp(client, activeStaticIpItem.name);
    log("INFO", "解绑成功");

    log("INFO", `正在释放静态 IP: ${activeStaticIpItem.name} (${activeStaticIpItem.ipAddress})`);
    await releaseStaticIp(client, activeStaticIpItem.name);
    log("INFO", "释放静态 IP 成功");
  } else {
    log("INFO", `${oldIp} 未找到对应静态 IP，直接分配新 IP`);
  }

  await allocateAndAttach(client, server);
}

/**
 * 分配新静态 IP 并绑定到实例
 */
async function allocateAndAttach(client, server) {
  const oldIp = server.publicIpAddress;
  const staticIpName = `${server.name}-${Date.now()}`;

  log("INFO", `正在创建新的静态 IP`);
  try {
    await allocateStaticIp(client, staticIpName);
  } catch (err) {
    log("ERROR", `创建静态 IP 失败: ${err.message}`);
    return;
  }
  log("INFO", "创建静态 IP 成功！");

  log("INFO", `正在绑定静态 IP ${staticIpName} 到实例 ${server.name}`);
  try {
    await attachStaticIp(client, server.name, staticIpName);
  } catch (err) {
    log("ERROR", `绑定静态 IP 失败: ${err.message}`);
    return;
  }

  log("INFO", "绑定新 IP 成功！");
  await sendMsgByServerChan({
    instanceName: server.name,
    region: server.location?.regionName || "未知",
    oldIp,
    newIp: staticIpName,
  });
}

// ============================================================
// 启动校验
// ============================================================

const configErrors = config.validateConfig();
if (configErrors.length > 0) {
  log("ERROR", "配置校验失败:");
  configErrors.forEach((err) => log("ERROR", `  - ${err}`));
  log("ERROR", "请检查 .env 文件或环境变量后重试");
  process.exit(1);
}

// ============================================================
// 优雅退出
// ============================================================

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  log("INFO", `收到 ${signal} 信号，正在停止...`);
  clearInterval(timer);

  // 等待进行中的操作完成后退出
  setTimeout(() => {
    log("INFO", "程序已退出");
    process.exit(0);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ============================================================
// 启动
// ============================================================

log("INFO", `lightsail-ip-rotator 启动，检测间隔: ${config.interval} 秒`);
getInstances();
const timer = setInterval(() => {
  getInstances();
}, config.interval * 1000);
