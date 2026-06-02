require("dotenv").config();

const config = {
  // AWS 区域（多个用逗号分隔，如 "ap-northeast-1,us-east-1"）
  regions: (process.env.AWS_REGIONS || "ap-northeast-1").split(",").map((r) => r.trim()),

  // AWS 凭证
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },

  // Ping 检测时长（秒），默认 150
  pingTimeout: parseInt(process.env.PING_TIMEOUT || "150", 10),

  // 检测间隔（秒），默认 150
  interval: parseInt(process.env.CHECK_INTERVAL_SEC || "150", 10),

  // Server酱 推送 Token（可选，留空不推送）
  serverChanToken: process.env.SERVER_CHAN_TOKEN || "",
};

/**
 * 校验配置是否完整
 * @returns {string[]} 错误信息数组，为空则配置正常
 */
function validateConfig() {
  const errors = [];

  if (!config.credentials.accessKeyId) {
    errors.push("AWS_ACCESS_KEY_ID 未设置");
  }
  if (!config.credentials.secretAccessKey) {
    errors.push("AWS_SECRET_ACCESS_KEY 未设置");
  }
  if (config.regions.length === 0 || !config.regions[0]) {
    errors.push("AWS_REGIONS 未设置或格式不正确");
  }
  if (Number.isNaN(config.pingTimeout) || config.pingTimeout < 1) {
    errors.push("PING_TIMEOUT 不是有效的数字");
  }
  if (Number.isNaN(config.min) || config.min < 1) {
    errors.push("CHECK_INTERVAL_SEC 必须大于 0");
  }

  return errors;
}

module.exports = config;
module.exports.validateConfig = validateConfig;
