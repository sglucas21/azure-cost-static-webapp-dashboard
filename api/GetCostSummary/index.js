const { ClientSecretCredential } = require("@azure/identity");
const axios = require("axios");

module.exports = async function (context, req) {
  try {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    const monthlyBudget = Number(process.env.MONTHLY_BUDGET || 200);

    const credential = new ClientSecretCredential(
      tenantId,
      clientId,
      clientSecret
    );

    const token = await credential.getToken(
      "https://management.azure.com/.default"
    );

    const endpoint =
      `https://management.azure.com/subscriptions/${subscriptionId}` +
      `/providers/Microsoft.CostManagement/query?api-version=2025-03-01`;

async function queryCost(body, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.post(endpoint, body, {
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json"
        }
      });

      return response.data.properties.rows || [];
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter =
          error.response.headers["retry-after"] ||
          error.response.headers["x-ms-ratelimit-microsoft.costmanagement-entity-retry-after"] ||
          10;

        context.log(`429 received. Waiting ${retryAfter} seconds before retrying...`);

        await new Promise(resolve =>
          setTimeout(resolve, Number(retryAfter) * 1000)
        );

        continue;
      }

      throw error;
    }
  }

  throw new Error("Cost Management API throttled after multiple retries.");
}

    // 1. Month-to-date total spend
    const totalRows = await queryCost({
      type: "ActualCost",
      timeframe: "MonthToDate",
      dataset: {
        granularity: "None",
        aggregation: {
          totalCost: {
            name: "Cost",
            function: "Sum"
          }
        }
      }
    });

    const currentSpend = totalRows.length ? Number(totalRows[0][0]) : 0;

    // 2. Daily trend for this month
    const dailyRows = await queryCost({
      type: "ActualCost",
      timeframe: "MonthToDate",
      dataset: {
        granularity: "Daily",
        aggregation: {
          totalCost: {
            name: "Cost",
            function: "Sum"
          }
        }
      }
    });

    const weeklyTrend = dailyRows.map((row) => ({
      week: String(row[1]),
      cost: Number(row[0].toFixed(2))
    }));

    // 3. Top cost drivers by service
    const serviceRows = await queryCost({
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
    });

    const topDrivers = serviceRows
      .map((row) => ({
        name: row[1] || "Unknown Service",
        category: friendlyCategory(row[1] || "Unknown Service"),
        cost: Number(row[0].toFixed(2))
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        currentSpend: Number(currentSpend.toFixed(2)),
        budget: monthlyBudget,
        weeklyChangePercent: 0,
        topDrivers,
        weeklyTrend
      }
    };
  } catch (error) {
    context.log(error.message);

    context.res = {
      status: 500,
      body: {
        error: "Failed to load Azure cost data.",
        details: error.message
      }
    };
  }
};

function friendlyCategory(serviceName) {
  const name = serviceName.toLowerCase();

  if (name.includes("virtual machines")) return "Servers";
  if (name.includes("storage")) return "Storage";
  if (name.includes("network")) return "Networking";
  if (name.includes("monitor")) return "Monitoring";
  if (name.includes("log analytics")) return "Monitoring";
  if (name.includes("key vault")) return "Security";
  if (name.includes("app service")) return "Web Hosting";
  if (name.includes("functions")) return "Automation";

  return "Other";
}