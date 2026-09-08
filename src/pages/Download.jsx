import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GlassBackdrop, BrandMark, GlassCard } from "@/components/xgpt/GlassAuthChrome";
import { getAppConfig, incrementDownloadCount } from "@/lib/appDownload";
import { toast } from "@/components/ui/use-toast";
import {
  Download,
  CheckCircle2,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  FolderDown,
  MousePointerClick,
  Sparkles,
  Apple,
  Bell,
} from "lucide-react";

const WAITLIST_KEY = "softstore_ios_waitlist";

function DownloadButton({ apkUrl }) {
  const [status, setStatus] = useState("idle"); // idle | downloading | done
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startDownload = () => {
    if (status === "downloading") return;
    setStatus("downloading");
    setProgress(0);

    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + (100 - p) * 0.12;
        return next >= 92 ? 92 : next;
      });
    }, 120);

    setTimeout(() => {
      incrementDownloadCount();
      window.open(apkUrl, "_blank", "noopener,noreferrer");
      clearInterval(timerRef.current);
      setProgress(100);
      setStatus("done");
      setTimeout(() => {
        setStatus("idle");
        setProgress(0);
      }, 2400);
    }, 1400);
  };

  return (
    <button
      onClick={startDownload}
      disabled={status === "downloading"}
      className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/20 to-white/[0.06] text-[13px] font-semibold tracking-[0.2em] text-white transition-opacity disabled:opacity-90"
    >
      <span
        className="absolute inset-y-0 left-0 bg-white/15 transition-[width] duration-150 ease-out"
        style={{ width: `${status === "idle" ? 0 : progress}%` }}
        aria-hidden="true"
      />
      <span className="relative flex items-center gap-2">
        {status === "downloading" && (
          <>
            <Download className="h-4 w-4 animate-bounce" />
            DOWNLOADING&nbsp;{Math.round(progress)}%
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            DOWNLOAD STARTED
          </>
        )}
        {status === "idle" && (
          <>
            <Download className="h-4 w-4" />
            DOWNLOAD APK
          </>
        )}
      </span>
    </button>
  );
}

const ANDROID_STEPS = [
  {
    icon: FolderDown,
    title: "Download the APK",
    desc: "Tap the button above — it opens MediaFire in a new tab. Tap MediaFire's green download button there to save the file.",
  },
  {
    icon: ShieldCheck,
    title: "Allow installs from this source",
    desc: "Open the downloaded file from your notifications or Downloads folder. If Android blocks it, tap Settings and allow installs from this app — this only needs to be done once.",
  },
  {
    icon: MousePointerClick,
    title: "Install and open",
    desc: "Tap Install, wait a few seconds, then open Soft Store from your home screen.",
  },
];

function InstallSteps() {
  return (
    <GlassCard className="mt-4">
      <h2 className="mb-4 text-sm font-semibold tracking-[0.15em] text-white">HOW TO INSTALL</h2>
      <div className="space-y-4">
        {ANDROID_STEPS.map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                <Icon className="h-4 w-4 text-white/70" />
              </div>
              {i < ANDROID_STEPS.length - 1 && <div className="mt-1 w-px flex-1 bg-white/10" />}
            </div>
            <div className="pb-1">
              <p className="text-[13px] font-medium text-white">{title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-white/45">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function Changelog({ changelog }) {
  if (!changelog?.length) return null;
  return (
    <GlassCard className="mt-4">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-[0.15em] text-white">
        <Sparkles className="h-4 w-4 text-white/60" /> WHAT'S NEW
      </h2>
      <div className="space-y-4">
        {changelog.map((entry, idx) => (
          <div key={`${entry.version}-${idx}`}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-white">{entry.version}</span>
              <span className="text-[10px] tracking-wide text-white/35">{entry.date}</span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {(entry.notes || []).map((note, i) => (
                <li key={i} className="text-[12px] leading-relaxed text-white/50">
                  &bull; {note}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function IosCard({ iosAvailable, iosUrl }) {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  if (iosAvailable) {
    return (
      <GlassCard className="mt-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Apple className="h-5 w-5 text-white/70" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-white">Soft Store for iOS</p>
            <p className="text-[11px] text-white/40">Now available</p>
          </div>
          <a
            href={iosUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold tracking-wide text-white hover:bg-white/[0.1]"
          >
            GET
          </a>
        </div>
      </GlassCard>
    );
  }

  const handleJoin = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const list = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]");
      if (!list.includes(email.trim().toLowerCase())) {
        list.push(email.trim().toLowerCase());
        localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
      }
    } catch {
      // ignore storage errors
    }
    setJoined(true);
    toast({ title: "You're on the list", description: "We'll email you when Soft Store for iOS is ready." });
  };

  return (
    <GlassCard className="mt-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Apple className="h-5 w-5 text-white/70" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-white">Soft Store for iOS</p>
          <p className="text-[11px] text-white/40">Coming soon</p>
        </div>
      </div>

      {joined ? (
        <p className="mt-3 flex items-center gap-2 text-[12px] text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> We'll let you know when it's ready.
        </p>
      ) : (
        <form onSubmit={handleJoin} className="mt-3 flex gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
          />
          <button
            type="submit"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[11px] font-semibold tracking-wide text-white hover:bg-white/[0.1]"
          >
            <Bell className="h-3.5 w-3.5" /> NOTIFY ME
          </button>
        </form>
      )}
    </GlassCard>
  );
}

export default function DownloadPage() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    getAppConfig().then(setConfig);
  }, []);

  if (!config) {
    return (
      <div className="relative min-h-screen">
        <GlassBackdrop />
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        </div>
      </div>
    );
  }

  const scanUrl = `${window.location.origin}/d`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&color=255-255-255&bgcolor=0-0-0&data=${encodeURIComponent(
    scanUrl
  )}`;

  return (
    <div className="relative min-h-screen">
      <GlassBackdrop />
      <div className="flex min-h-screen flex-col items-center px-4 py-12">
        <div className="mb-6 w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs tracking-wide text-white/40 hover:text-white/70">
            <ArrowLeft className="h-3.5 w-3.5" /> BACK
          </Link>
        </div>

        <div className="w-full max-w-md">
          <BrandMark className="mb-8" />

          <GlassCard>
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Smartphone className="h-6 w-6 text-white/70" />
              </div>
              <h1 className="text-lg font-semibold tracking-[0.15em] text-white">GET THE APP</h1>
              <p className="mt-1 text-[11px] tracking-[0.1em] text-white/40">
                SOFT STORE FOR ANDROID &middot; {config.version} &middot; {config.sizeLabel}
              </p>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-stretch">
              <div className="w-full sm:flex-1">
                <DownloadButton apkUrl={config.apkUrl} />
                <p className="mt-4 text-center text-[11px] leading-relaxed text-white/35 sm:text-left">
                  Opens in a new MediaFire tab — tap MediaFire's green download button there to save the file.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-xl border border-white/10 bg-white p-2">
                  <img src={qrSrc} alt="QR code to download the Soft Store APK" width={104} height={104} className="block" />
                </div>
                <p className="text-[10px] tracking-wide text-white/35">SCAN TO DOWNLOAD</p>
              </div>
            </div>
          </GlassCard>

          <InstallSteps />
          <Changelog changelog={config.changelog} />
          <IosCard iosAvailable={config.iosAvailable} iosUrl={config.iosUrl} />
        </div>
      </div>
    </div>
  );
}
