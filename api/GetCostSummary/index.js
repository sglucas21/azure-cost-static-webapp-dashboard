module.exports = async function (context, req) {
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
          }
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
    const currentSpend = rows.length ? Number(rows[0][0]) : 0;

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        currentSpend: Number(currentSpend.toFixed(2)),
        budget: monthlyBudget,
        weeklyChangePercent: 0,
        topDrivers: [],
        weeklyTrend: []
      }
    };
  } catch (error) {
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        currentSpend: 0,
        budget: Number(process.env.MONTHLY_BUDGET || 200),
        weeklyChangePercent: 0,
        topDrivers: [],
        weeklyTrend: [],
        warning: "Azure Cost Management API unavailable",
        details: error.response?.data?.error?.message || error.message
      }
    };
  }
};