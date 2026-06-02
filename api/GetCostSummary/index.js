const { ClientSecretCredential } = require("@azure/identity");
const axios = require("axios");

module.exports = async function (context, req) {

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
                granularity: "Daily",
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

    const rows = response.data.properties.rows;

    let totalCost = 0;

    rows.forEach(row => {
        totalCost += row[0];
    });

    context.res = {
        status: 200,
        body: {
            currentSpend: totalCost,
            budget: 200,
            weeklyChangePercent: 0,
            topDrivers: [],
            weeklyTrend: []
        }
    };
};