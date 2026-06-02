const {
  LightsailClient,
  GetInstancesCommand,
  AttachStaticIpCommand,
  DetachStaticIpCommand,
  ReleaseStaticIpCommand,
  GetStaticIpsCommand,
  AllocateStaticIpCommand,
} = require("@aws-sdk/client-lightsail");
const config = require("./config");
const { log } = require("./logger");

// 创建客户端，配置 AWS SDK 内置重试（最多 3 次，指数退避）
const clients = config.regions.map(
  (region) =>
    new LightsailClient({
      region,
      credentials: config.credentials,
      maxAttempts: 3,
    })
);

/**
 * 带重试的 API 调用包装（在 AWS SDK 内置重试之上增加日志）
 */
async function withRetry(operation, context) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err.name === "ThrottlingException" ||
        err.name === "RequestLimitExceeded" ||
        err.name === "ServiceUnavailableException" ||
        err.$metadata?.httpStatusCode === 429;

      if (!isRetryable || attempt === 3) {
        log("ERROR", `${context} 失败: ${err.message}`);
        throw err;
      }

      const delay = Math.pow(2, attempt) * 1000;
      log("WARN", `${context} 限流，${delay / 1000}s 后重试 (${attempt}/2)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

async function fetchInstances(client) {
  return withRetry(async () => {
    const command = new GetInstancesCommand({});
    const response = await client.send(command);
    return response.instances || [];
  }, "获取实例列表");
}

async function fetchStaticIps(client) {
  return withRetry(async () => {
    const command = new GetStaticIpsCommand({});
    const response = await client.send(command);
    return response.staticIps || [];
  }, "获取静态 IP 列表");
}

async function detachStaticIp(client, staticIpName) {
  return withRetry(async () => {
    const command = new DetachStaticIpCommand({ staticIpName });
    await client.send(command);
  }, `解绑静态 IP ${staticIpName}`);
}

async function releaseStaticIp(client, staticIpName) {
  return withRetry(async () => {
    const command = new ReleaseStaticIpCommand({ staticIpName });
    await client.send(command);
  }, `释放静态 IP ${staticIpName}`);
}

async function allocateStaticIp(client, staticIpName) {
  return withRetry(async () => {
    const command = new AllocateStaticIpCommand({ staticIpName });
    await client.send(command);
  }, `创建静态 IP ${staticIpName}`);
}

async function attachStaticIp(client, instanceName, staticIpName) {
  return withRetry(async () => {
    const command = new AttachStaticIpCommand({ instanceName, staticIpName });
    await client.send(command);
  }, `绑定静态 IP ${staticIpName} 到 ${instanceName}`);
}

module.exports = {
  clients,
  fetchInstances,
  fetchStaticIps,
  detachStaticIp,
  releaseStaticIp,
  allocateStaticIp,
  attachStaticIp,
};
