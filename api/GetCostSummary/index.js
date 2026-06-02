module.exports = async function (context, req) {
  try {
    const { ClientSecretCredential } = require("@azure/identity");
    const axios = require("axios");

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;

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

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        message: "Cost Management query succeeded",
        rows: response.data.properties.rows,
        columns: response.data.properties.columns
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        error: "Cost Management query failed",
        message: error.message,
        status: error.response?.status || null,
        data: error.response?.data || null
      }
    };
  }
};