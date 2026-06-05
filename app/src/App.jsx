import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DollarSign, Server, Database, Network, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import "./style.css";

const fallbackData = {
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
  ],

  cachedAt: new Date().toISOString()
};

function MetricCard({ title, value, subtitle, icon }) {
  return (
    <div className="card metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="metric-title">{title}</p>
        <h2>{value}</h2>
        <p className="metric-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState(fallbackData);
  const [status, setStatus] = useState("Loading API data...");

  useEffect(() => {
    fetch("/api/GetCostSummary")
      .then((response) => response.json())
      .then((apiData) => {
        setData(apiData);
        setStatus("Live");
      })
      .catch(() => {
        setStatus("Using fallback sample data");
      });
  }, []);

  const currentSpend = Number(data.currentSpend || 0);
  const budget = Number(data.budget || 200);
  const utilization = Math.round((currentSpend / budget) * 100);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Derby City FinOps Portfolio Project</p>
          <h1>Azure Cost Visibility Dashboard</h1>
          <p className="cache-time">
            Last Updated: {new Date(data.cachedAt).toLocaleString()}
          </p>
          <p className="hero-text">
            Business-friendly cloud cost visibility for Azure spending, budget utilization,
            weekly trends, and top cost drivers.
          </p>
        </div>
        <div className="status-pill">{status}</div>
      </section>

      <section className="grid metrics">
        <MetricCard
          title="Current Spend"
          value={`$${Number(data.currentSpend).toFixed(2)}`}
          subtitle="Month-to-date Azure spend"
          icon={<DollarSign size={26} />}
        />
        <MetricCard
          title="Monthly Budget"
          value={`$${budget.toFixed(2)}`}
          subtitle={`${utilization}% of budget used`}
          icon={<AlertTriangle size={26} />}
        />
        <MetricCard
          title="Weekly Change"
          value={`+${data.weeklyChangePercent}%`}
          subtitle="Compared to last week"
          icon={<Network size={26} />}
        />
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Budget Utilization</h2>
          <span>{utilization}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(utilization, 100)}%` }} />
        </div>
      </section>

      <section className="grid charts">
        <div className="card">
          <h2>Daily Cost Trend</h2>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.dailyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cost" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Top Cost Drivers</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topDrivers}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2>Business-Friendly Cost Mapping</h2>
        <div className="table">
          {data.topDrivers.map((item) => (
            <div className="table-row" key={item.name}>
              <div>
                <strong>{item.category}</strong>
                <p>{item.name}</p>
              </div>
              <span>${item.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid notes">
        <div className="card note-card">
          <Server />
          <h3>Cloud Operations</h3>
          <p>Provides visibility into Azure resource spend across services and resource categories.</p>
        </div>
        <div className="card note-card">
          <Database />
          <h3>FinOps Awareness</h3>
          <p>Shows budget usage and cost drivers in language business users can understand.</p>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
