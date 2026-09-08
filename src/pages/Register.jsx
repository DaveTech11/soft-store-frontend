import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { GlassBackdrop, BrandMark, GlassCard } from "@/components/xgpt/GlassAuthChrome";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

function GlassField({ icon: Icon, endAdornment, ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-11 pr-11 text-[13px] tracking-wide text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/30 focus:bg-white/[0.06]"
      />
      {endAdornment}
    </div>
  );
}

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const returnTo = safeReturnTo();
  const loginHref = "/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }
    setLoading(true);
    try {
      await api.auth.register({ email, password, name: fullName });
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await api.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        api.auth.setToken(result.access_token);
      }
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await api.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    api.auth.loginWithProvider("google", returnTo);
  };

  return (
    <div className="relative min-h-screen">
      <GlassBackdrop />
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <BrandMark className="mb-8" />

          <GlassCard>
            {showOtp ? (
              <>
                <div className="mb-6 text-center">
                  <h1 className="text-lg font-semibold tracking-[0.15em] text-white">VERIFY YOUR EMAIL</h1>
                  <p className="mt-1 text-xs tracking-wide text-white/40">We sent a code to {email}</p>
                </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="mb-6 flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <button
                  onClick={handleVerify}
                  disabled={loading || otpCode.length < 6}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white/20 to-white/[0.06] text-[13px] font-semibold tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> VERIFYING...
                    </>
                  ) : (
                    "VERIFY"
                  )}
                </button>

                <p className="mt-4 text-center text-sm text-white/40">
                  Didn't receive the code?{" "}
                  <button onClick={handleResend} className="font-medium text-white hover:underline">
                    Resend
                  </button>
                </p>
              </>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <h1 className="text-lg font-semibold tracking-[0.15em] text-white">CREATE ACCOUNT</h1>
                  <p className="mt-1 text-[11px] tracking-[0.1em] text-white/40">
                    JOIN SOFT STORE AND START SHOPPING
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  <GlassField
                    icon={User}
                    type="text"
                    placeholder="Full name"
                    autoComplete="name"
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <GlassField
                    icon={Mail}
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <GlassField
                    icon={Lock}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  <GlassField
                    icon={Lock}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />

                  <label className="flex items-start gap-2 pt-1 text-[11px] leading-snug text-white/50">
                    <Checkbox
                      checked={agreed}
                      onCheckedChange={(v) => setAgreed(!!v)}
                      className="mt-0.5 border-white/25 data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <span>
                      I agree to the{" "}
                      <Link to="/terms" className="text-white/80 underline underline-offset-2 hover:text-white">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-white/80 underline underline-offset-2 hover:text-white">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white/20 to-white/[0.06] text-[13px] font-semibold tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> CREATING ACCOUNT...
                      </>
                    ) : (
                      <>
                        CREATE ACCOUNT <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-black px-3 text-[10px] tracking-[0.2em] text-white/30">OR</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogle}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-[12px] font-medium tracking-[0.15em] text-white/80 transition-colors hover:bg-white/[0.06]"
                >
                  <GoogleIcon className="h-4 w-4" /> CONTINUE WITH GOOGLE
                </button>

                <p className="mt-6 text-center text-[11px] tracking-wide text-white/40">
                  ALREADY HAVE AN ACCOUNT?{" "}
                  <Link to={loginHref} className="font-semibold text-white underline underline-offset-2">
                    LOGIN
                  </Link>
                </p>
                <p className="mt-3 text-center text-[11px] tracking-wide text-white/30">
                  <Link to="/download" className="hover:text-white/60">Get the Android app &rarr;</Link>
                </p>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
