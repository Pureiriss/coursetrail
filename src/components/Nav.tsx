"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "首页", hint: "总览与检索" },
  { href: "/library", label: "资料库", hint: "上传与归档" },
  { href: "/review", label: "复习", hint: "到期卡片" },
  { href: "/devlog", label: "开发日志", hint: "怎么用 Qoder 做的" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-line px-5 py-8 md:flex">
      <Link href="/" className="mb-10 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-serif text-white">
          课
        </span>
        <span>
          <span className="block font-serif text-lg leading-tight">课迹</span>
          <span className="block text-[10px] uppercase tracking-[0.22em] text-muted">
            CourseTrail
          </span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group rounded-xl px-3 py-2.5 transition ${
                active ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-paper-deep"
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span
                className={`block text-[11px] ${active ? "text-accent/70" : "text-muted"}`}
              >
                {item.hint}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-line bg-card/60 p-3">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          seekdb · 混合检索
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          向量 + 全文 + 结构化条件，一条 SQL 完成召回
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:hidden">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-serif text-sm text-white">
          课
        </span>
        <span className="font-serif text-base">课迹</span>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${
                active ? "bg-accent text-white" : "border border-line text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
