import { ReviewBoard } from "@/components/ReviewBoard";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="eyebrow">间隔复习</p>
        <h1 className="mt-2 font-serif text-3xl">今天该复习的这些</h1>
        <p className="mt-2 text-sm text-ink-soft">
          卡片从原文片段生成，评分后按遗忘曲线安排下一次。操作：空格翻面，1–4 评分。
        </p>
      </div>
      <ReviewBoard />
    </div>
  );
}
