"use client";

import { BarChart3, CircleDot, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/tournament-model", label: "Tournament model" },
  { href: "/data-quality", label: "Data quality" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/methodology", label: "Methodology" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-30 border-b border-white/10 bg-[#070b21]/75 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link
          className="flex items-center gap-3 rounded-md text-white focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
          href="/"
        >
          <span className="relative grid size-9 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200">
            <CircleDot aria-hidden="true" className="size-5" />
            <span className="absolute -right-1 -bottom-1 size-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.8)]" />
          </span>
          <span>
            <span className="block text-sm font-black tracking-[0.22em] uppercase">
              World Stage
            </span>
            <span className="block text-[0.63rem] tracking-[0.18em] text-slate-400 uppercase">
              Tournament simulator
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {navigation.map((item) => (
            <Button asChild key={item.href} variant="ghost">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-emerald-300 uppercase">
            <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.7)]" />
            Model verified
          </span>
          <Button
            aria-label="Tournament data status"
            size="icon"
            variant="secondary"
          >
            <BarChart3 aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <Button
          aria-expanded={menuOpen}
          aria-label="Open navigation menu"
          className="md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          size="icon"
          variant="secondary"
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </div>
      {menuOpen ? (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-white/10 px-5 py-4 md:hidden"
        >
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
            {navigation.map((item) => (
              <Button asChild key={item.href} variant="ghost">
                <Link href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              </Button>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
