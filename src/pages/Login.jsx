import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { GlassBackdrop, BrandMark, GlassCard } from "@/components/xgpt/GlassAuthChrome";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "/";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.loginViaEmailPassword(email.trim(), password);
      nav(returnTo);
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackdrop>
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-12">
        <div className="w-full">
          <BrandMark />
          <GlassCard className="mt-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="mt-2 text-sm text-white/45">Sign in to your Soft Store account</p>
            </div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none placeholder:text-white/35 focus:border-white/30" />
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none placeholder:text-white/35 focus:border-white/30" />
              <button disabled={loading} className="h-12 w-full rounded-xl bg-white font-semibold text-black transition hover:bg-white/90 disabled:opacity-50">
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <div className="mt-5 flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-white/45 hover:text-white">Forgot password?</Link>
              <Link to={`/register${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`} className="font-medium text-white hover:underline">Create account</Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </GlassBackdrop>
  );
}
