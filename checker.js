const net = require("net");
const config = require("./config");
const { log } = require("./logger");

/**
 * 检测指定主机 IP 连通性
 * @param {string} host - 目标 IP 地址
 * @param {Function} onReachable - IP 可达时的回调
 * @param {Function} onUnreachable - IP 不可达时的回调函数
 */
function checkConnectivity(host, onReachable, onUnreachable) {
  const netClient = net.createConnection(
    { port: config.port, host },
    () => {
      log("INFO", `${host} 可连接，无需变更`);
      netClient.destroy();
      if (onReachable) onReachable();
    }
  );

  netClient.setTimeout(3000);
  netClient.unref();

  netClient.on("timeout", () => {
    netClient.destroy();
    onUnreachable();
  });

  netClient.on("error", () => {
    log("INFO", `${host} 连接超时`);
    netClient.destroy();
    onUnreachable();
  });
}

module.exports = { checkConnectivity };
