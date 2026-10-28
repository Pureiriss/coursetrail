"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Card = {
  id: number;
  front: string;
  back: string;
  due: string;
  state: number;
  reps: number;
  sourceTitle: string | null;
  materialId: number | null;
  pageNo: number | null;
  fileName: string | null;
  courseName: string | null;
};

type Stats = { due: number; total: number; reviewedToday: number };

const RATINGS = [
  { value: 1, label: "重来", hint: "完全想不起来" },
  { value: 2, label: "困难", hint: "想起来但很费劲" },
  { value: 3, label: "记得", hint: "顺利回忆" },
  { value: 4, label: "简单", hint: "一眼就会" },
];

export function ReviewBoard({ goal = 10 }: { goal?: number }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [stats, setStats] = useState<Stats>({ due: 0, total: 0, reviewedToday: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/cards/due?limit=20");
      const data = (await response.json()) as {
        cards?: Card[];
        stats?: Stats;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "读取失败");
      setCards(data.cards ?? []);
      setStats(data.stats ?? { due: 0, total: 0, reviewedToday: 0 });
      setIndex(0);
      setDone(0);
      setFlipped(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取失败");
      setCards([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = cards && index < cards.length ? cards[index] : null;

  const rate = useCallback(
    async (rating: number) => {
      if (!current || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/cards/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: current.id, rating }),
        });
        const data = (await response.json()) as { stats?: Stats; error?: string };
        if (!response.ok) throw new Error(data.error ?? "提交失败");
        if (data.stats) setStats(data.stats);
        setDone((value) => value + 1);
        setIndex((value) => value + 1);
        setFlipped(false);
      } catch (rateError) {
        setError(rateError instanceof Error ? rateError.message : "提交失败");
      } finally {
        setSubmitting(false);
      }
    },
    [current, submitting],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!current) return;
      if (event.code === "Space") {
        event.preventDefault();
        setFlipped((value) => !value);
        return;
      }
      if (flipped && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        void rate(Number(event.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, rate]);

  if (cards === null) {
    return (
      <div className="panel p-10 text-center text-sm text-muted">正在读取复习队列…</div>
    );
  }

  if (error && cards.length === 0) {
    return (
      <div className="panel p-8">
        <p className="font-serif text-xl">复习队列读不出来</p>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
        <p className="mt-2 text-xs text-muted">
          先确认 seekdb 已启动（docker compose up -d），再刷新页面。
        </p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="panel p-10 text-center">
        <p className="font-serif text-2xl">暂时没有到期卡片</p>
        <p className="mt-2 text-sm text-ink-soft">
          上传资料后会自动生成复习卡，或者等下一批卡片到期。
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/library" className="btn-primary">
            去上传资料
          </Link>
          <Link href="/" className="btn">
            回首页
          </Link>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="panel p-10 text-center">
        <p className="eyebrow">这一轮结束</p>
        <p className="mt-2 font-serif text-3xl">今天复习了 {done} 张</p>
        <p className="mt-2 text-sm text-ink-soft">
          累计复习 {stats.reviewedToday} 张 · 还有 {stats.due} 张到期
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => void load()}>
            再抽一批
          </button>
          <Link href="/" className="btn">
            回首页
          </Link>
        </div>
      </div>
    );
  }

  const progress = Math.round((done / cards.length) * 100);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>
          本轮 {done} / {cards.length}
        </span>
        <span>
          今日已复习 {stats.reviewedToday} / {goal} 张 · 剩余到期 {stats.due} 张
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <article className="panel p-6 md:p-8">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>
            {current.courseName ?? "复习卡"}
            {current.reps > 0 ? ` · 已复习 ${current.reps} 次` : " · 新卡"}
          </span>
          <span>按空格翻面</span>
        </div>

        <p className="mt-6 min-h-[72px] font-serif text-xl leading-relaxed md:text-2xl">
          {current.front}
        </p>

        {flipped ? (
          <div className="mt-6 border-t border-line pt-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-ink-soft">{current.back}</p>
            {current.materialId && (
              <a
                href={`/api/files/${current.materialId}${current.pageNo ? `#page=${current.pageNo}` : ""}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-xs text-accent hover:underline"
              >
                回到原文：{current.sourceTitle}
                {current.pageNo ? ` 第 ${current.pageNo} 页` : ""} →
              </a>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() => setFlipped(true)}
          >
            显示答案
          </button>
        )}

        {flipped && (
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            {RATINGS.map((rating) => (
              <button
                key={rating.value}
                type="button"
                disabled={submitting}
                onClick={() => void rate(rating.value)}
                className="rounded-xl border border-line px-3 py-3 text-left transition hover:border-accent/50 hover:bg-accent-soft/60 disabled:opacity-50"
              >
                <span className="block text-sm font-medium">
                  {rating.label}
                  <span className="ml-1 text-[10px] text-muted">{rating.value}</span>
                </span>
                <span className="mt-0.5 block text-[10px] leading-tight text-muted">
                  {rating.hint}
                </span>
              </button>
            ))}
          </div>
        )}

        {error && <p className="mt-4 text-xs text-red-700">{error}</p>}
      </article>

      <p className="mt-4 text-center text-[11px] text-muted">
        评分会写回 seekdb，按 FSRS 计算下次到期时间
      </p>
    </div>
  );
}
