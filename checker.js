const ping = require("ping");
const config = require("./config");
const { log } = require("./logger");

/**
 * 检测指定主机 IP 连通性（60秒内持续 Ping，有一次回复即判定为通）
 * @param {string} host - 目标 IP 地址
 * @param {Function} onReachable - IP 可达时的回调
 * @param {Function} onUnreachable - IP 不可达时的回调函数
 */
async function checkConnectivity(host, onReachable, onUnreachable) {
  log("INFO", `正在持续 Ping ${host}（最长 ${config.pingTimeout} 秒）`);

  try {
    const deadline = Date.now() + config.pingTimeout * 1000;

    while (Date.now() < deadline) {
      const result = await ping.promise.probe(host, {
        timeout: 5,
        extra: ["-c", "1"],
      });

      if (result.alive) {
        log("INFO", `${host} Ping 通，跳过本轮检测`);
        if (onReachable) onReachable();
        return; // 有回复立即结束，不等60秒
      }

      // 还没到截止时间，等 1 秒再试
      if (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    log("WARN", `${host} 持续 ${config.pingTimeout} 秒 Ping 无回复，判定为不通`);
    onUnreachable();
  } catch (err) {
    log("ERROR", `${host} Ping 检测异常: ${err.message}`);
    onUnreachable();
  }
}

module.exports = { checkConnectivity };
