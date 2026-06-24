import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050819]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>Original football simulation. No affiliation with FIFA or EA.</p>
        <div className="flex gap-5">
          <Link className="hover:text-white" href="/methodology">
            Data & methodology
          </Link>
          <Link className="hover:text-white" href="/how-it-works">
            How it works
          </Link>
        </div>
      </div>
    </footer>
  );
}
