import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Menu, Users, MessageSquare, Code2, Star, Activity, Shield, AlertCircle, TrendingUp, Smartphone, ExternalLink, Save, Copy, Check, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from "recharts";
import Sidebar from "@/components/xgpt/Sidebar";
import { isAdminUser } from "@/lib/adminEmails";
import { toast } from "@/components/ui/use-toast";
import { getAppConfig, saveAppConfig, isValidMediaFireUrl } from "@/lib/appDownload";

const CHART_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"];

function GlassCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function AppDownloadCard() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newNoteVersion, setNewNoteVersion] = useState("");
  const [newNoteText, setNewNoteText] = useState("");

  useEffect(() => {
    getAppConfig().then(setConfig);
  }, []);

  if (!config) {
    return (
      <GlassCard className="mb-6">
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
      </GlassCard>
    );
  }

  const update = (patch) => setConfig((c) => ({ ...c, ...patch }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isValidMediaFireUrl(config.apkUrl)) {
      toast({ title: "That doesn't look like a MediaFire link", description: "Paste the full mediafire.com link to your APK." });
      return;
    }
    setSaving(true);
    const saved = await saveAppConfig({
      apkUrl: config.apkUrl,
      version: config.version,
      sizeLabel: config.sizeLabel,
      iosAvailable: config.iosAvailable,
      iosUrl: config.iosUrl,
    });
    setConfig(saved);
    setSaving(false);
    toast({ title: "Download settings saved", description: "The /download page now reflects these changes." });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(config.apkUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "Paste it into Telegram, WhatsApp, wherever." });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Couldn't copy", description: "Select and copy the link manually." });
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const entry = {
      version: newNoteVersion.trim() || config.version,
      date: new Date().toISOString().slice(0, 10),
      notes: newNoteText.split("\n").map((n) => n.trim()).filter(Boolean),
    };
    const changelog = [entry, ...(config.changelog || [])];
    const saved = await saveAppConfig({ changelog });
    setConfig(saved);
    setNewNoteVersion("");
    setNewNoteText("");
    toast({ title: "Release note added" });
  };

  const handleDeleteNote = async (idx) => {
    const changelog = (config.changelog || []).filter((_, i) => i !== idx);
    const saved = await saveAppConfig({ changelog });
    setConfig(saved);
  };

  return (
    <GlassCard className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-medium text-neutral-200">App Download</h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
          <span>{config.downloadCount || 0} downloads</span>
          <span>&middot;</span>
          <span>updated {timeAgo(config.updatedAt)}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* MediaFire link */}
        <div>
          <label className="mb-1 block text-[11px] text-neutral-500">MediaFire link (Android APK)</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              required
              placeholder="https://www.mediafire.com/file/..."
              value={config.apkUrl}
              onChange={(e) => update({ apkUrl: e.target.value })}
              className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-white/25"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs text-neutral-300 hover:bg-white/5 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={config.apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs text-neutral-300 hover:bg-white/5 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Preview
              </a>
            </div>
          </div>
        </div>

        {/* Version + size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-neutral-500">Version</label>
            <input
              type="text"
              value={config.version}
              onChange={(e) => update({ version: e.target.value })}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-neutral-200 outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-neutral-500">File size</label>
            <input
              type="text"
              placeholder="e.g. 42 MB"
              value={config.sizeLabel}
              onChange={(e) => update({ sizeLabel: e.target.value })}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-white/25"
            />
          </div>
        </div>

        {/* iOS */}
        <div className="rounded-xl border border-white/10 p-3">
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={!!config.iosAvailable}
              onChange={(e) => update({ iosAvailable: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-white/20 bg-transparent"
            />
            iOS app is available
          </label>
          {config.iosAvailable && (
            <input
              type="url"
              placeholder="App Store or TestFlight link"
              value={config.iosUrl}
              onChange={(e) => update({ iosUrl: e.target.value })}
              className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-white/25"
            />
          )}
          {!config.iosAvailable && (
            <p className="mt-1.5 text-[11px] text-neutral-600">Until this is checked, the download page shows an email waitlist instead.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* Changelog */}
      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="mb-2 text-[11px] font-medium text-neutral-400">What's new (release notes)</p>
        <form onSubmit={handleAddNote} className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Version (optional)"
            value={newNoteVersion}
            onChange={(e) => setNewNoteVersion(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-white/25 sm:w-32"
          />
          <input
            type="text"
            placeholder="One line per note"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-white/25"
          />
          <button type="submit" className="flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-neutral-300 hover:bg-white/5 hover:text-white">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </form>
        <div className="space-y-2">
          {(config.changelog || []).map((entry, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
              <div>
                <p className="text-[11px] font-semibold text-neutral-300">{entry.version} &middot; {entry.date}</p>
                <ul className="mt-0.5">
                  {(entry.notes || []).map((n, i) => (
                    <li key={i} className="text-[11px] text-neutral-500">&bull; {n}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => handleDeleteNote(idx)} className="text-neutral-600 hover:text-red-400" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(!config.changelog || config.changelog.length === 0) && (
            <p className="text-[11px] text-neutral-600">No release notes yet.</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default function Admin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.auth.isAuthenticated().then((authed) => {
      if (authed) {
        api.auth.me().then((u) => {
          setUser(u);
          if (isAdminUser(u)) {
            loadStats(u.email);
          } else {
            setError("You are not authorized to view this page.");
            setLoading(false);
          }
        });
      } else {
        setError("Please sign in to access the admin dashboard.");
        setLoading(false);
      }
    });
  }, []);

  const loadStats = async (email) => {
    try {
      const res = await api.functions.invoke("adminStats", { email });
      setData(res.data);
    } catch (e) {
      setError(e.message || "Failed to load admin data.");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] text-neutral-100">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen items-center justify-center md:pl-72">
          <div className="w-8 h-8 border-4 border-neutral-700 border-t-neutral-300 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#08080a] text-neutral-100">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 md:pl-72">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-sm text-neutral-400">{error}</p>
          <Link to="/" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200">
            Back to chat
          </Link>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Conversations", value: stats.totalConversations, icon: MessageSquare, color: "text-emerald-400" },
    { label: "Messages", value: stats.totalMessages, icon: Activity, color: "text-violet-400" },
    { label: "Code Files", value: stats.totalCodeFiles, icon: Code2, color: "text-amber-400" },
    { label: "Feedback", value: stats.totalFeedback, icon: Star, color: "text-pink-400" },
  ];

  // Chart data
  const barData = [
    { name: "Users", value: stats.totalUsers || 0 },
    { name: "Convos", value: stats.totalConversations || 0 },
    { name: "Messages", value: stats.totalMessages || 0 },
    { name: "Code Files", value: stats.totalCodeFiles || 0 },
    { name: "Feedback", value: stats.totalFeedback || 0 },
  ];

  const pieData = [
    { name: "Conversations", value: stats.totalConversations || 0 },
    { name: "Messages", value: stats.totalMessages || 0 },
    { name: "Code Files", value: stats.totalCodeFiles || 0 },
    { name: "Feedback", value: stats.totalFeedback || 0 },
  ];

  const areaData = (data?.users || []).map((u, i) => ({
    name: `U${i + 1}`,
    users: i + 1,
  }));

  return (
    <div className="min-h-screen bg-[#08080a] text-neutral-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-72">
        <header className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-4 backdrop-blur-xl md:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-neutral-400" />
          </button>
          <span className="flex items-center gap-2 font-display tracking-tight">
            <Shield className="h-4 w-4 text-violet-400" /> Admin
          </span>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-blue-500/[0.03]" />

          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20 backdrop-blur-xl">
              <Shield className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <h1 className="font-display text-xl tracking-tight md:text-2xl">Admin Dashboard</h1>
              <p className="text-xs text-neutral-500">System overview, charts, users & feedback</p>
            </div>
          </div>

          <AppDownloadCard />

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((s) => (
              <GlassCard key={s.label} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-xl font-bold text-white md:text-2xl">{s.value}</p>
                <p className="text-xs text-neutral-500">{s.label}</p>
              </GlassCard>
            ))}
          </div>

          {/* Charts */}
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <GlassCard>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-medium text-neutral-200">Overview</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "#a3a3a3" }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard>
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-medium text-neutral-200">Distribution</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1a1a1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          <div className="mb-6">
            <GlassCard>
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-medium text-neutral-200">User Growth</h2>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#userGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          {/* Users table */}
          <div className="mb-6">
            <GlassCard className="p-0">
              <div className="border-b border-white/10 px-5 py-3">
                <h2 className="text-sm font-medium text-neutral-200">All Users</h2>
              </div>
              <div className="divide-y divide-white/5">
                {data?.users?.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs text-neutral-300">
                      {(u.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-200">{u.full_name || "Unknown"}</p>
                      <p className="truncate text-xs text-neutral-500">{u.email}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${u.role === "admin" ? "bg-violet-500/20 text-violet-300" : "bg-white/5 text-neutral-400"}`}>
                      {u.role || "user"}
                    </span>
                  </div>
                ))}
                {(!data?.users || data.users.length === 0) && (
                  <p className="px-5 py-8 text-center text-sm text-neutral-600">No users found.</p>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Feedback */}
          <GlassCard className="p-0">
            <div className="border-b border-white/10 px-5 py-3">
              <h2 className="text-sm font-medium text-neutral-200">Feedback Reports</h2>
            </div>
            <div className="divide-y divide-white/5">
              {data?.feedback?.map((f) => (
                <div key={f.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${f.vote === "up" ? "text-green-400" : "text-red-400"}`}>
                      {f.vote === "up" ? "👍" : "👎"}
                    </span>
                    <span className="text-xs text-neutral-400">Rating: {f.rating}/5</span>
                    <span className="ml-auto text-[10px] text-neutral-600">
                      {f.created_date ? new Date(f.created_date).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  {f.improvement && (
                    <p className="mt-1 text-xs text-neutral-400">"{f.improvement}"</p>
                  )}
                </div>
              ))}
              {(!data?.feedback || data.feedback.length === 0) && (
                <p className="px-5 py-8 text-center text-sm text-neutral-600">No feedback yet.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}