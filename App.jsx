import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// ---------- Dummy Data ----------
const dummyTimeSeries = [
  { date: '2025-01-01', leads: 120 },
  { date: '2025-02-01', leads: 180 },
  { date: '2025-03-01', leads: 240 },
  { date: '2025-04-01', leads: 310 },
  { date: '2025-05-01', leads: 360 },
  { date: '2025-06-01', leads: 400 },
  { date: '2025-07-01', leads: 430 },
  { date: '2025-08-01', leads: 420 },
];

const dummyCampaigns = [
  { campaign: 'Q4 Webinar Series', type: 'Webinar', status: 'ACTIVE', leads: 320, conversions: 18, cost: 3000, revenue: 125000 },
  { campaign: 'Email Campaign - Product Launch', type: 'Email', status: 'COMPLETED', leads: 580, conversions: 43, cost: 7000, revenue: 310000 },
  { campaign: 'Trade Show - TechConf 2025', type: 'Event', status: 'COMPLETED', leads: 94, conversions: 9, cost: 30000, revenue: 94000 },
  { campaign: 'Social Media - Brand Awareness', type: 'Social Media', status: 'ACTIVE', leads: 450, conversions: 11, cost: 67000, revenue: 67000 },
  { campaign: 'PPC - Lead Generation', type: 'Paid Search', status: 'ACTIVE', leads: 380, conversions: 29, cost: 18000, revenue: 185000 },
  { campaign: 'Content Marketing - Blog Series', type: 'Content', status: 'ACTIVE', leads: 275, conversions: 16, cost: 10000, revenue: 89000 },
  { campaign: 'Partner Channel - Referrals', type: 'Partner', status: 'ACTIVE', leads: 125, conversions: 22, cost: 4000, revenue: 185000 },
  { campaign: 'Retargeting Campaign', type: 'Display Ads', status: 'PAUSED', leads: 196, conversions: 7, cost: 7000, revenue: 42000 },
].map((r) => ({ ...r, roi: r.cost > 0 ? Math.round(((r.revenue - r.cost) / r.cost) * 100) : 0 }));

const currency = (n) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

function exportToCSV(filename, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportToExcel(filename, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
}

export default function App() {
  const [campaignRows, setCampaignRows] = useState(dummyCampaigns);
  const [seriesRows, setSeriesRows] = useState(dummyTimeSeries);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState({ key: 'campaign', dir: 'asc' });
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [preview, setPreview] = useState([]);
  const [message, setMessage] = useState('');

  const filteredSeries = useMemo(() => {
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    return seriesRows.filter((r) => {
      const d = new Date(r.date);
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  }, [seriesRows, startDate, endDate]);

  const kpis = useMemo(() => {
    const totalCampaigns = campaignRows.length;
    const revenue = campaignRows.reduce((a, r) => a + (Number(r.revenue) || 0), 0);
    const leads = campaignRows.reduce((a, r) => a + (Number(r.leads) || 0), 0);
    const totalCost = campaignRows.reduce((a, r) => a + (Number(r.cost) || 0), 0);
    const avgRoi = totalCost > 0 ? Math.round(((revenue - totalCost) / totalCost) * 100) : 0;
    return { totalCampaigns, revenue, avgRoi, leads };
  }, [campaignRows]);

  const roiBarData = useMemo(() => campaignRows.map(({ campaign, roi }) => ({ campaign, roi })), [campaignRows]);

  const funnelData = useMemo(() => {
    const totals = campaignRows.reduce(
      (acc, r) => ({
        leads: acc.leads + (Number(r.leads) || 0),
        mqls: acc.mqls + (Number(r.mqls) || Math.round((r.leads || 0) * 0.6)),
        sqls: acc.sqls + (Number(r.sqls) || Math.round((r.leads || 0) * 0.35)),
        opps: acc.opps + (Number(r.opportunities) || Math.round((r.leads || 0) * 0.2)),
        closed: acc.closed + (Number(r.closed) || Number(r.conversions) || Math.round((r.leads || 0) * 0.08)),
      }),
      { leads: 0, mqls: 0, sqls: 0, opps: 0, closed: 0 }
    );
    return [
      { name: 'Leads', value: totals.leads },
      { name: 'MQLs', value: totals.mqls },
      { name: 'SQLs', value: totals.sqls },
      { name: 'Opportunities', value: totals.opps },
      { name: 'Closed Won', value: totals.closed },
    ];
  }, [campaignRows]);

  const revenueByType = useMemo(() => {
    const byType = {};
    campaignRows.forEach((r) => {
      const key = r.type || 'Other';
      byType[key] = (byType[key] || 0) + (Number(r.revenue) || 0);
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [campaignRows]);

  const leadsTime = useMemo(() => filteredSeries.map((r) => ({ date: r.date, leads: Number(r.leads) || 0 })), [filteredSeries]);

  function handleCSVUpload(e) {
    const files = Array.from(e.target.files || []);
    let combined = [];
    let previewRows = [];

    files.forEach((file, idx) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const rows = results.data.filter((r) => Object.keys(r).length > 0);
          combined = combined.concat(rows);
          previewRows = previewRows.concat(rows.slice(0, 5));
          if (idx === files.length - 1) applyUploadedRows(combined, previewRows);
        },
      });
    });
  }

  function handleExcelUpload(e) {
    const files = Array.from(e.target.files || []);
    let combined = [];
    let previewRows = [];

    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: true });
        combined = combined.concat(rows);
        previewRows = previewRows.concat(rows.slice(0, 5));
        if (idx === files.length - 1) applyUploadedRows(combined, previewRows);
      };
      reader.readAsBinaryString(file);
    });
  }

  function applyUploadedRows(rows, previewRows) {
    setPreview(previewRows.slice(0, 10));
    setMessage(`Uploaded ${rows.length} rows`);

    const hasDate = rows.some((r) => 'date' in r);
    const hasLeads = rows.some((r) => 'leads' in r);
    if (hasDate && hasLeads) {
      const ts = rows
        .filter((r) => r.date)
        .map((r) => ({ date: String(r.date).slice(0, 10), leads: Number(r.leads) || 0 }));
      if (ts.length) setSeriesRows(ts);
    }

    const looksLikeCampaign = rows.some((r) => 'campaign' in r || 'Campaign' in r);
    if (looksLikeCampaign) {
      const mapped = rows
        .filter((r) => r.campaign || r.Campaign)
        .map((r) => ({
          campaign: r.campaign || r.Campaign,
          type: r.type || r.Type || 'Other',
          status: r.status || r.Status || 'ACTIVE',
          leads: Number(r.leads ?? r.Leads ?? 0),
          conversions: Number(r.conversions ?? r.Conversions ?? 0),
          cost: Number(r.cost ?? r.Cost ?? 0),
          revenue: Number(r.revenue ?? r.Revenue ?? 0),
        }))
        .map((r) => ({ ...r, roi: r.cost > 0 ? Math.round(((r.revenue - r.cost) / r.cost) * 100) : 0 }));
      if (mapped.length) setCampaignRows(mapped);
    }
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = campaignRows.filter((r) => (!q ? true : String(r.campaign).toLowerCase().includes(q)));
    rows = rows.sort((a, b) => {
      const { key, dir } = sortBy;
      const va = a[key];
      const vb = b[key];
      if (va === vb) return 0;
      const comp = va > vb ? 1 : -1;
      return dir === 'asc' ? comp : -1 * comp;
    });
    const start = (page - 1) * pageSize;
    return { rows: rows.slice(start, start + pageSize), total: rows.length };
  }, [campaignRows, search, sortBy, page]);

  function toggleSort(key) {
    setSortBy((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  return (
    <div className="p-6 grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns Performance Overview 2025</h1>
        <div className="flex gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border px-2 py-1 rounded" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border px-2 py-1 rounded" />
          {(startDate || endDate) && (
            <button className="px-3 py-1 border rounded" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>
          )}
        </div>
      </div>

      {message && <div className="p-2 bg-green-100 text-green-700 rounded">{message}</div>}

      <div className="flex gap-4 items-center flex-wrap">
        <div>
          <p className="text-sm mb-1">Upload CSV (multi)</p>
          <input type="file" accept=".csv" multiple onChange={handleCSVUpload} />
        </div>
        <div>
          <p className="text-sm mb-1">Upload Excel (multi)</p>
          <input type="file" accept=".xlsx,.xls" multiple onChange={handleExcelUpload} />
        </div>
        <button className="px-3 py-1 border rounded" onClick={() => { setCampaignRows(dummyCampaigns); setSeriesRows(dummyTimeSeries); setPreview([]); setMessage('Reset to dummy data'); }}>Reset</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI title="Total Campaigns Active" value={kpis.totalCampaigns} sub="+2 from last period" icon="📊" />
        <KPI title="Total Campaign Revenue" value={currency(kpis.revenue)} sub="+8% from last period" icon="💰" />
        <KPI title="Average ROI" value={`${kpis.avgRoi}%`} sub="+4% from last period" icon="📈" />
        <KPI title="Total Leads Generated" value={kpis.leads.toLocaleString()} sub="+12% from last period" icon="👥" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Campaign ROI Comparison</h2>
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToCSV('roi_bar.csv', roiBarData)}>Export CSV</button>
              <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToExcel('roi_bar.xlsx', roiBarData)}>Export</button>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={roiBarData}>
                <XAxis dataKey="campaign" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="roi" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Campaign Performance Funnel</h2>
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToCSV('funnel.csv', funnelData)}>Export CSV</button>
              <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToExcel('funnel.xlsx', funnelData)}>Export</button>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Revenue by Campaign Type</h2>
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToCSV('revenue_by_type.csv', revenueByType)}>Export CSV</button>
              <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToExcel('revenue_by_type.xlsx', revenueByType)}>Export</button>
            </div>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie data={revenueByType} dataKey="value" nameKey="name" outerRadius={110}>
                  {revenueByType.map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Leads Generated Over Time</h2>
            <div className="flex gap-2">
              <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToCSV('leads_over_time.csv', leadsTime)}>Export CSV</button>
              <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToExcel('leads_over_time.xlsx', leadsTime)}>Export</button>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={leadsTime}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="leads" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="bg-white border rounded shadow p-4 overflow-auto">
          <h2 className="text-lg font-semibold mb-2">Uploaded Data Preview (first 10 rows)</h2>
          <table className="min-w-full text-sm border">
            <thead>
              <tr>
                {Object.keys(preview[0]).map((c) => (
                  <th key={c} className="border px-2 py-1 text-left">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  {Object.keys(preview[0]).map((c) => (
                    <td key={c} className="border px-2 py-1">{String(row[c] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border rounded shadow p-4 overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Campaign Performance Summary</h2>
          <div className="flex gap-2 items-center">
            <input placeholder="Search campaigns..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border px-2 py-1 rounded w-56" />
            <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToCSV('campaigns.csv', campaignRows)}>Export CSV</button>
            <button className="px-2 py-1 border rounded text-sm" onClick={() => exportToExcel('campaigns.xlsx', campaignRows)}>Export</button>
          </div>
        </div>
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
              {[
                ['campaign', 'Campaign Name'],
                ['type', 'Type'],
                ['status', 'Status'],
                ['leads', 'Leads'],
                ['conversions', 'Conversions'],
                ['cost', 'Cost'],
                ['revenue', 'Revenue'],
                ['roi', 'ROI%'],
              ].map(([key, label]) => (
                <th key={key} className="border px-2 py-2 text-left cursor-pointer select-none" onClick={() => toggleSort(key)}>
                  {label} {sortBy.key === key ? (sortBy.dir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.rows.map((r, i) => (
              <tr key={i} className="odd:bg-gray-50">
                <td className="border px-2 py-2">{r.campaign}</td>
                <td className="border px-2 py-2">{r.type}</td>
                <td className="border px-2 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${r.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : r.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                </td>
                <td className="border px-2 py-2">{r.leads?.toLocaleString?.() ?? r.leads}</td>
                <td className="border px-2 py-2">{r.conversions?.toLocaleString?.() ?? r.conversions}</td>
                <td className="border px-2 py-2">{currency(r.cost)}</td>
                <td className="border px-2 py-2">{currency(r.revenue)}</td>
                <td className="border px-2 py-2">{r.roi}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between mt-3 text-sm">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(displayed.total, page * pageSize)} of {displayed.total}
          </span>
          <div className="flex gap-2">
            <button className="px-2 py-1 border rounded text-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </button>
            <button className="px-2 py-1 border rounded text-sm" disabled={page * pageSize >= displayed.total} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ title, value, sub, icon }) {
  return (
    <div className="bg-white border rounded shadow p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl" aria-hidden>
          {icon}
        </div>
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="text-xl font-semibold">{value}</div>
          <div className="text-xs text-green-700">{sub}</div>
        </div>
      </div>
    </div>
  );
}
