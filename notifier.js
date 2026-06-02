const axios = require("axios").default;
const config = require("./config");
const { log } = require("./logger");

/**
 * 通过 Server酱 发送 IP 更换通知
 * @param {object} details - 更换详情
 * @param {string} details.instanceName - 实例名称
 * @param {string} details.region - 区域
 * @param {string} details.oldIp - 旧 IP
 * @param {string} details.newIp - 新 IP
 */
async function sendMsgByServerChan(details = {}) {
  const { instanceName = "", region = "", oldIp = "", newIp = "" } = details;
  const desp = [
    `实例: ${instanceName}`,
    `区域: ${region}`,
    `旧 IP: ${oldIp}`,
    `新 IP: ${newIp}`,
    `时间: ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
  ].join("\n");

  log("CHANGE", `${instanceName} IP已更换 ${oldIp} → ${newIp}`);

  if (!config.serverChanToken) return;

  try {
    await axios.request({
      method: "POST",
      url: `https://sctapi.ftqq.com/${config.serverChanToken}.send`,
      headers: { "Content-Type": "application/json" },
      data: {
        title: `AWS Lightsail IP 更换 - ${instanceName}`,
        desp,
      },
    });
    log("INFO", "Server酱 通知发送成功");
  } catch (err) {
    log("ERROR", `Server酱 通知发送失败: ${err.message}`);
  }
}

module.exports = { sendMsgByServerChan };
