const ping = require("ping");
const config = require("./config");
const { log } = require("./logger");

/**
 * 检测指定主机 IP 连通性
 * @param {string} host - 目标 IP 地址
 * @param {Function} onReachable - IP 可达时的回调
 * @param {Function} onUnreachable - IP 不可达时的回调函数
 */
async function checkConnectivity(host, onReachable, onUnreachable) {
  log("INFO", `正在 Ping ${host}`);

  try {
    const result = await ping.promise.probe(host, {
      timeout: config.pingTimeout,
      extra: ["-c", "10", "-i", "0.5"],  // 5秒内持续发10个包，每0.5秒一个
    });

    const loss = parseFloat(result.packetLoss);
    const time = result.time ? `${result.time}ms` : "超时";

    if (loss < 100) {
      log("INFO", `${host} Ping 通 (${time}，丢包 ${result.packetLoss})，无需变更`);
      if (onReachable) onReachable();
    } else {
      log("WARN", `${host} 持续 ${config.pingTimeout}s Ping 无回复，判定为不通`);
      onUnreachable();
    }
  } catch (err) {
    log("ERROR", `${host} Ping 检测异常: ${err.message}`);
    onUnreachable();
  }
}

module.exports = { checkConnectivity };
