import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GlassBackdrop, BrandMark, GlassCard } from "@/components/xgpt/GlassAuthChrome";
import { getAppConfig, incrementDownloadCount } from "@/lib/appDownload";
import { Loader2, ArrowLeft } from "lucide-react";

// Landing page the QR code points at. Counts the scan as a download, then
// forwards the phone's browser straight to the MediaFire link.
export default function DownloadRedirect() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await incrementDownloadCount();
      const config = await getAppConfig();
      if (cancelled) return;
      if (config.apkUrl) {
        window.location.replace(config.apkUrl);
      } else {
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <GlassBackdrop />
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <BrandMark className="mb-8" />
          <GlassCard>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              {failed ? (
                <>
                  <p className="text-sm text-white/70">We couldn't find a download link.</p>
                  <Link to="/download" className="text-xs text-white underline underline-offset-2">
                    Go to the download page instead
                  </Link>
                </>
              ) : (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                  <p className="text-[13px] tracking-wide text-white/70">Redirecting to your download&hellip;</p>
                  <Link to="/download" className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60">
                    <ArrowLeft className="h-3 w-3" /> Not working? Go back
                  </Link>
                </>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
