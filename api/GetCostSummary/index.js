let cachedResult = null;
let cachedAt = null;
const CACHE_MINUTES = 30;

module.exports = async function (context, req) {
  const now = Date.now();

  if (
    cachedResult &&
    cachedAt &&
    now - cachedAt < CACHE_MINUTES * 60 * 1000
  ) {
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        ...cachedResult,
        cacheStatus: "Returned cached cost data"
      }
    };
    return;
  }
  try {
    const { ClientSecretCredential } = require("@azure/identity");
    const axios = require("axios");

    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    const token = await credential.getToken(
      "https://management.azure.com/.default"
    );

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
          granularity: "None",
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

    const currentSpend = topDrivers.reduce(
      (sum, item) => sum + item.cost,
      0
    );

    const result = {
      currentSpend: Number(currentSpend.toFixed(2)),
      budget: monthlyBudget,
      weeklyChangePercent: 0,
      topDrivers,
      weeklyTrend: []
    };

    cachedResult = result;
    cachedAt = Date.now();

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: result
    };
  } 
  
  catch (error) {

  if (cachedResult && cachedAt) {
    context.res = {
      status: 200,
      body: {
        ...cachedResult,
        cacheStatus: "Using cached data due to Azure throttling"
      }
    };
    return;
  }

  context.res = {
    status: 200,
    body: {
      currentSpend: 0,
      budget: Number(process.env.MONTHLY_BUDGET || 200),
      topDrivers: [],
      weeklyChangePercent: 0,
      weeklyTrend: [],
      warning: "Azure Cost Management API unavailable",
      details: error.response?.data?.error?.message || error.message
    }
  };
}
};

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