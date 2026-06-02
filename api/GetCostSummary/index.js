module.exports = async function (context, req) {
  try {
    let identityLoaded = false;
    let axiosLoaded = false;

    const { ClientSecretCredential } = require("@azure/identity");
    identityLoaded = true;

    const axios = require("axios");
    axiosLoaded = true;

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        message: "Function loaded successfully",
        identityLoaded,
        axiosLoaded,
        envCheck: {
          AZURE_TENANT_ID: !!process.env.AZURE_TENANT_ID,
          AZURE_CLIENT_ID: !!process.env.AZURE_CLIENT_ID,
          AZURE_CLIENT_SECRET: !!process.env.AZURE_CLIENT_SECRET,
          AZURE_SUBSCRIPTION_ID: !!process.env.AZURE_SUBSCRIPTION_ID,
          MONTHLY_BUDGET: !!process.env.MONTHLY_BUDGET
        }
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        error: "Diagnostic test failed",
        details: error.message
      }
    };
  }
};