import Link from "next/link";
import { Highlight } from "@/components/Highlight";
import { SearchForm } from "@/components/SearchForm";
import { SetupNotice } from "@/components/SetupNotice";
import { KIND_LABEL } from "@/lib/labels";
import { listCourses } from "@/lib/repo";
import { hybridSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; courseId?: string; kind?: string }>;
};

const MATCH_LABEL: Record<string, string> = {
  hybrid: "语义 + 关键词",
  semantic: "语义命中",
  lexical: "关键词命中",
  none: "兜底结果",
};

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const courseId = params.courseId ? Number(params.courseId) : undefined;
  const kind = params.kind || undefined;

  const data = await Promise.all([
    listCourses(),
    hybridSearch({ query, courseId, kind, limit: 15 }),
  ])
    .then(([courses, hits]) => ({ courses, hits }))
    .catch((error) => {
      console.error(error);
      return null;
    });
  if (!data) return <SetupNotice />;

  const { courses, hits } = data;
  const courseOptions = courses.map((course) => ({
      id: course.id,
      name: course.name,
      semester: course.semester,
    }));

    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="eyebrow">{query ? "检索结果" : "知识片段"}</p>
          <h1 className="mt-2 font-serif text-3xl">
            {query ? `「${query}」` : "全部知识片段"}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {query
              ? `命中 ${hits.length} 段。每条结果同时给出语义相似度与关键词相关度。`
              : "输入一句回忆，或者直接浏览最近入库的内容。"}
          </p>
        </div>

        <div className="mb-8">
          <SearchForm
            defaultValue={query}
            courseId={courseId}
            kind={kind}
            courses={courseOptions}
            compact
          />
        </div>

        {hits.length === 0 ? (
          <div className="panel p-10 text-center">
            <p className="font-serif text-xl">没找到相关的片段</p>
            <p className="mt-2 text-sm text-ink-soft">
              换个说法试试，比如只描述画面、老师讲过的例子，或者去掉课程筛选。
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["树状图", "特征值", "后验概率", "梯度下降"].map((word) => (
                <Link
                  key={word}
                  href={`/search?q=${encodeURIComponent(word)}`}
                  className="chip hover:border-accent/40 hover:text-accent"
                >
                  {word}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {hits.map((hit) => (
              <article key={hit.id} className="panel p-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <span className="chip">{KIND_LABEL[hit.kind] ?? hit.kind}</span>
                  <span>
                    {hit.courseName} · {hit.semester}
                  </span>
                  <span className="text-line">|</span>
                  <span className="truncate">{hit.title}</span>
                  {hit.pageNo ? <span>第 {hit.pageNo} 页</span> : null}
                  <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-accent">
                    {MATCH_LABEL[hit.matchedBy]}
                  </span>
                </div>

                <div className="mt-3 flex gap-3">
                  {hit.kind === "image" && hit.materialId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/${hit.materialId}`}
                      alt={hit.title}
                      className="h-20 w-20 shrink-0 rounded-lg border border-line object-cover"
                    />
                  ) : null}
                  <p className="text-sm leading-7 text-ink">
                    <Highlight text={hit.content} query={query} />
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3">
                  <ScoreBar label="语义" value={hit.semantic} />
                  <ScoreBar label="关键词" value={hit.lexical} />
                  <ScoreBar label="融合" value={hit.score} accent />
                  {hit.materialId ? (
                    <a
                      href={`/api/files/${hit.materialId}${hit.pageNo ? `#page=${hit.pageNo}` : ""}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-xs text-accent hover:underline"
                    >
                      打开原文 →
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="panel mt-8 p-5">
          <p className="eyebrow">这条结果是怎么来的</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            每个片段在 seekdb 里同时建有 HNSW 向量索引与 IK 中文全文索引。
            上面这条 SQL 里 <code className="rounded bg-paper-deep px-1">cosine_distance()</code> 与{" "}
            <code className="rounded bg-paper-deep px-1">MATCH ... AGAINST</code> 一次计算完成，
            再按 0.62 / 0.38 融合排序，课程与资料类型作为标量条件直接下推。
          </p>
        </div>
      </div>
    );
}

function ScoreBar({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-paper-deep">
        <span
          className={`block h-full rounded-full ${accent ? "bg-accent" : "bg-amber/70"}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="font-mono text-[10px] text-muted">{percent}</span>
    </div>
  );
}
