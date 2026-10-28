import Link from "next/link";

type Props = {
  defaultValue?: string;
  courseId?: number;
  kind?: string;
  courses?: { id: number; name: string; semester: string }[];
  compact?: boolean;
};

export function SearchForm({ defaultValue = "", courseId, kind, courses = [], compact }: Props) {
  return (
    <form action="/search" method="get" className="w-full">
      <div
        className={`flex items-center gap-2 rounded-2xl border border-line bg-card px-3 shadow-[0_14px_40px_-30px_rgba(32,28,23,0.6)] ${
          compact ? "py-2" : "py-2.5"
        }`}
      >
        <span className="pl-1 text-muted" aria-hidden>
          ⌕
        </span>
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="试试「概率论那张画树状图的笔记」或「SVD 和特征值的关系」"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-muted/70"
          autoComplete="off"
        />
        {courses.length > 0 && (
          <select
            name="courseId"
            defaultValue={courseId ?? ""}
            className="hidden rounded-lg border border-line bg-paper px-2 py-1.5 text-xs text-ink-soft outline-none sm:block"
          >
            <option value="">全部课程</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        )}
        <select
          name="kind"
          defaultValue={kind ?? ""}
          className="hidden rounded-lg border border-line bg-paper px-2 py-1.5 text-xs text-ink-soft outline-none sm:block"
        >
          <option value="">全部类型</option>
          <option value="pdf">PDF</option>
          <option value="image">图片</option>
          <option value="text">文字</option>
        </select>
        <button type="submit" className="btn-primary shrink-0 px-4 py-2 text-xs sm:text-sm">
          检索
        </button>
      </div>
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>不知道怎么说？</span>
          {["特征值分解", "贝叶斯 后验", "过拟合", "最小二乘"].map((word) => (
            <Link
              key={word}
              href={`/search?q=${encodeURIComponent(word)}`}
              className="chip hover:border-accent/40 hover:text-accent"
            >
              {word}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}
