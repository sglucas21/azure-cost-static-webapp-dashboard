const { ClientSecretCredential } = require("@azure/identity");
const axios = require("axios");

module.exports = async function (context, req) {
  try {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    const monthlyBudget = Number(process.env.MONTHLY_BUDGET || 200);

    if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
      throw new Error("Missing one or more required environment variables.");
    }

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
      `/providers/Microsoft.CostManagement/query?api-version=2023-03-01`;

    async function queryCost(body, retries = 3) {
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
          const status = error.response?.status;

          if (status === 429) {
            const retryAfter =
              error.response.headers["retry-after"] ||
              error.response.headers["x-ms-ratelimit-microsoft.costmanagement-entity-retry-after"] ||
              10;

            context.log(
              `429 throttling received. Waiting ${retryAfter} seconds before retrying.`
            );

            await new Promise((resolve) =>
              setTimeout(resolve, Number(retryAfter) * 1000)
            );

            continue;
          }

          throw error;
        }
      }

      throw new Error("Cost Management API throttled after multiple retries.");
    }

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
      cost: Number(Number(row[0]).toFixed(2))
    }));

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
        cost: Number(Number(row[0]).toFixed(2))
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
    context.log("ERROR MESSAGE:", error.message);
    context.log("ERROR STATUS:", error.response?.status);
    context.log("ERROR BODY:", JSON.stringify(error.response?.data));

    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        error: "Failed to load Azure cost data.",
        details: error.message,
        status: error.response?.status || null,
        apiResponse: error.response?.data || null
      }
    };
  }
};

function friendlyCategory(serviceName) {
  const name = serviceName.toLowerCase();

  if (name.includes("virtual machine")) return "Servers";
  if (name.includes("storage")) return "Storage";
  if (name.includes("network")) return "Networking";
  if (name.includes("monitor")) return "Monitoring";
  if (name.includes("log analytics")) return "Monitoring";
  if (name.includes("key vault")) return "Security";
  if (name.includes("app service")) return "Web Hosting";
  if (name.includes("functions")) return "Automation";
  if (name.includes("static web")) return "Web Hosting";

  return "Other";
}