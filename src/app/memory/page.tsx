import Link from "next/link";
import { GoalForm } from "@/components/GoalForm";
import { SetupNotice } from "@/components/SetupNotice";
import { getMemorySummary } from "@/lib/memory";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const data = await getMemorySummary().catch((error) => {
    console.error(error);
    return null;
  });
  if (!data) return <SetupNotice />;

  const percent = Math.min(
    100,
    Math.round((data.todayReviews / Math.max(data.goal, 1)) * 100),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="eyebrow">学习记忆</p>
        <h1 className="mt-2 font-serif text-3xl">它记得你学到哪了</h1>
        <p className="mt-2 text-sm text-ink-soft">
          检索历史、复习目标、评分记录都写在 seekdb 里。换一次会话、重启服务，下次打开仍然接得上。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-[11px] tracking-wide text-muted">今日复习</p>
          <p className="mt-1 font-serif text-3xl">
            {data.todayReviews}
            <span className="ml-1 text-base text-muted">/ {data.goal}</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-deep">
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="panel p-5">
          <p className="text-[11px] tracking-wide text-muted">连续复习</p>
          <p className="mt-1 font-serif text-3xl">
            {data.streakDays}
            <span className="ml-1 text-base text-muted">天</span>
          </p>
          <p className="mt-2 text-[11px] text-muted">按 reviews 表的日期计算</p>
        </div>
        <div className="panel p-5">
          <p className="text-[11px] tracking-wide text-muted">累计评分</p>
          <p className="mt-1 font-serif text-3xl">
            {data.totalReviews}
            <span className="ml-1 text-base text-muted">次</span>
          </p>
          <p className="mt-2 text-[11px] text-muted">每次评分都会写回数据库</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">最近检索</h2>
            <span className="text-[11px] text-muted">来自 search_history</span>
          </div>
          {data.recentSearches.length === 0 ? (
            <p className="mt-3 text-xs text-muted">还没有检索记录。去首页搜一次，回来就能看到。</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {data.recentSearches.map((item) => (
                <li key={`${item.query}-${item.at}`}>
                  <Link
                    href={`/search?q=${encodeURIComponent(item.query)}`}
                    className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm transition hover:border-accent/40 hover:bg-accent-soft/40"
                  >
                    <span className="truncate">{item.query}</span>
                    <span className="ml-3 shrink-0 text-[11px] text-muted">
                      {item.hits} 条 · {item.at}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">需要加强</h2>
            <span className="text-[11px] text-muted">按遗忘程度排序</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {data.weakCards.map((card) => (
              <li
                key={card.id}
                className="rounded-xl border border-line px-3 py-2"
              >
                <p className="line-clamp-2 text-sm">{card.front}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {card.source ?? "复习卡"}
                  {card.pageNo ? ` · 第 ${card.pageNo} 页` : ""} ·{" "}
                  {card.lapses > 0 ? `答错 ${card.lapses} 次` : "稳定性最低"}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/review" className="mt-3 inline-block text-xs text-accent hover:underline">
            去复习 →
          </Link>
        </section>
      </div>

      <section className="panel mt-4 p-5">
        <h2 className="font-serif text-xl">每日目标</h2>
        <p className="mt-1 text-xs text-muted">
          存在 prefs 表；保存后首页和复习页都会按这个目标显示进度。
        </p>
        <div className="mt-3">
          <GoalForm goal={data.goal} />
        </div>
      </section>

      <p className="mt-4 text-center text-[11px] text-muted">
        读取时间 {data.storedAt} · 数据表：search_history / reviews / cards / prefs
      </p>
    </div>
  );
}
