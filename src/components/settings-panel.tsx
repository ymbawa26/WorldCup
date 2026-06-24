"use client";

import { useInterfaceStore } from "@/stores/interface-store";

export function SettingsPanel() {
  const compactStatistics = useInterfaceStore(
    (state) => state.compactStatistics,
  );
  const setCompactStatistics = useInterfaceStore(
    (state) => state.setCompactStatistics,
  );

  return (
    <div className="max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045]">
      <div className="flex items-start justify-between gap-5 p-7">
        <div>
          <h2 className="font-bold text-white">Compact statistic panels</h2>
          <p className="mt-2 leading-6 text-slate-400">
            Prefer denser match-center readouts on laptop-sized screens.
          </p>
        </div>
        <label className="relative inline-flex min-h-11 cursor-pointer items-center">
          <span className="sr-only">Compact statistic panels</span>
          <input
            checked={compactStatistics}
            className="peer sr-only"
            onChange={(event) => setCompactStatistics(event.target.checked)}
            type="checkbox"
          />
          <span className="h-7 w-12 rounded-full border border-white/15 bg-slate-700 transition peer-checked:bg-cyan-300 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#070b21] after:absolute after:top-2 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>
      <div className="border-t border-white/10 p-7 text-sm leading-6 text-slate-500">
        Language, audio, animation, and save preferences will be added with
        their owning systems. Operating-system reduced-motion settings are
        already respected.
      </div>
    </div>
  );
}
