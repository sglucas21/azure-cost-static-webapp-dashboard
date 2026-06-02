module.exports = async function (context, req) {
  const costSummary = {
    currentSpend: 145.22,
    budget: 200,
    weeklyChangePercent: 12,
    topDrivers: [
      { name: "Virtual Machines", category: "Servers", cost: 72.35 },
      { name: "Storage Accounts", category: "Storage", cost: 28.14 },
      { name: "Virtual Network", category: "Networking", cost: 19.62 },
      { name: "Log Analytics", category: "Monitoring", cost: 15.5 }
    ],
    weeklyTrend: [
      { week: "Week 1", cost: 84 },
      { week: "Week 2", cost: 97 },
      { week: "Week 3", cost: 129 },
      { week: "Week 4", cost: 145 }
    ]
  };

  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: costSummary
  };
};
