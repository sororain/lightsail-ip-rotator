const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "lightsail.log");

/**
 * 写入本地日志文件
 * @param {string} level - 日志级别 (INFO / CHANGE / ERROR)
 * @param {string} message - 日志内容
 */
function log(level, message) {
  const timestamp = new Date().toLocaleString("zh-CN", { hour12: false });
  const line = `[${timestamp}] [${level}] ${message}\n`;

  console.log(line.trim());

  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error("写入日志文件失败:", err.message);
  });
}

module.exports = { log };
