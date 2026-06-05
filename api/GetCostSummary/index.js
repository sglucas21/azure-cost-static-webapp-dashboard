const { BlobServiceClient } = require("@azure/storage-blob");

let memoryCache = null;
let memoryCacheAt = null;
const CACHE_MINUTES = 1;
const BLOB_NAME = "latest-cost-summary.json";

module.exports = async function (context, req) {
  try {
    const now = Date.now();

    if (
      memoryCache &&
      memoryCacheAt &&
      now - memoryCacheAt < CACHE_MINUTES * 60 * 1000
    ) {
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          ...memoryCache,
          cacheStatus: "Returned in-memory cached cost data"
        }
      };
      return;
    }

    const storedCache = await readCostCache();

    if (storedCache && storedCache.cachedAt) {
      const cacheAge = now - new Date(storedCache.cachedAt).getTime();

      if (cacheAge < CACHE_MINUTES * 60 * 1000) {
        memoryCache = storedCache;
        memoryCacheAt = Date.now();

        context.res = {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: {
            ...storedCache,
            cacheStatus: "Returned Blob Storage cached cost data"
          }
        };
        return;
      }
    }

    const liveResult = await getAzureCostData();

    const result = {
      ...liveResult,
      cachedAt: new Date().toISOString()
    };

    await writeCostCache(result);

    memoryCache = result;
    memoryCacheAt = Date.now();

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        ...result,
        cacheStatus: "Returned live Azure Cost Management data"
      }
    };
  } catch (error) {
    const storedCache = await readCostCache();

    if (storedCache) {
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          ...storedCache,
          cacheStatus: "Returned last known good Blob cache because live API failed",
          warning: "Azure Cost Management API unavailable",
          details: error.response?.data?.error?.message || error.message
        }
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        currentSpend: 0,
        budget: Number(process.env.MONTHLY_BUDGET || 200),
        weeklyChangePercent: 0,
        topDrivers: [],
        weeklyTrend: [],
        warning: "Azure Cost Management API unavailable and no cache exists",
        details: error.response?.data?.error?.message || error.message
      }
    };
  }
};

async function getAzureCostData() {
  const { ClientSecretCredential } = require("@azure/identity");
  const axios = require("axios");

  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );

  const token = await credential.getToken("https://management.azure.com/.default");

  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  const monthlyBudget = Number(process.env.MONTHLY_BUDGET || 200);

  const endpoint =
    `https://management.azure.com/subscriptions/${subscriptionId}` +
    `/providers/Microsoft.CostManagement/query?api-version=2023-03-01`;

  const response = await axios.post(
    endpoint,
    {
      type: "ActualCost",
      timeframe: "MonthToDate",
      dataset: {
        granularity: "Daily",
        aggregation: {
          totalCost: {
            name: "Cost",
            function: "Sum"
          }
        },
        grouping: [
          {
            type: "Dimension",
            name: "ServiceName"
          }
        ]
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json"
      }
    }
  );

  const rows = response.data.properties.rows || [];

  const topDrivers = rows
    .map((row) => {
      const cost = Number(row[0]);
      const serviceName = row[1] || "Unknown Service";

      return {
        name: serviceName,
        category: friendlyCategory(serviceName),
        cost: Number(cost.toFixed(2))
      };
    })
    .filter((item) => item.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const currentSpend = topDrivers.reduce((sum, item) => sum + item.cost, 0);

  return {
    currentSpend: Number(currentSpend.toFixed(2)),
    budget: monthlyBudget,
    weeklyChangePercent: 0,
    topDrivers,
    dailyTrend: rows.map((row) => ({
      date: String(row[2]),
      cost: Number(Number(row[0]).toFixed(2))
    }))
  };
}

async function readCostCache() {
  try {
    const containerClient = getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);

    const exists = await blockBlobClient.exists();

    if (!exists) {
      return null;
    }

    const downloadResponse = await blockBlobClient.download();
    const downloaded = await streamToString(downloadResponse.readableStreamBody);

    return JSON.parse(downloaded);
  } catch {
    return null;
  }
}

async function writeCostCache(data) {
  const containerClient = getContainerClient();

  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);
  const json = JSON.stringify(data, null, 2);

  await blockBlobClient.upload(json, Buffer.byteLength(json), {
    blobHTTPHeaders: {
      blobContentType: "application/json"
    }
  });
}

function getContainerClient() {
  const connectionString = process.env.COST_CACHE_CONNECTION_STRING;
  const containerName = process.env.COST_CACHE_CONTAINER || "cost-cache";

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);

  return blobServiceClient.getContainerClient(containerName);
}

async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    readableStream.on("data", (data) => {
      chunks.push(data.toString());
    });

    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });

    readableStream.on("error", reject);
  });
}

function friendlyCategory(serviceName) {
  const name = serviceName.toLowerCase();

  if (name.includes("virtual machine")) return "Virtual Machines";
  if (name.includes("storage")) return "Storage";
  if (name.includes("network")) return "Networking";
  if (name.includes("static web")) return "Static Web Apps";
  if (name.includes("functions")) return "Functions";
  if (name.includes("app service")) return "App Services";
  if (name.includes("monitor")) return "Monitoring";
  if (name.includes("log analytics")) return "Log Analytics";

  return "Other";
}