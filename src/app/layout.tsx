import type { Metadata } from "next";
import "./globals.css";
import { Nav, MobileNav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "课迹 CourseTrail — 把上过的课找回来",
  description:
    "跨学期的课堂记忆库：手写笔记、课件、板书统一入库，用一句模糊的回忆定位到原始那一页。基于 seekdb 混合检索。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
          <Nav />
          <div className="min-w-0 flex-1">
            <MobileNav />
            <main className="px-5 py-8 md:px-10 md:py-12">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
