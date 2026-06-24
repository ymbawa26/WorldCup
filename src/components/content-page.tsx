import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ContentPage({
  children,
  eyebrow,
  icon: Icon,
  intro,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  icon: LucideIcon;
  intro: string;
  title: string;
}) {
  return (
    <div className="relative isolate min-h-[calc(100vh-9rem)] overflow-hidden px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="mx-auto max-w-5xl">
        <div className="grid size-13 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Icon aria-hidden="true" className="size-6" />
        </div>
        <p className="eyebrow mt-7">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
          {intro}
        </p>
        <div className="mt-12">{children}</div>
      </div>
    </div>
  );
}
