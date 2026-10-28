import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { SetupNotice } from "@/components/SetupNotice";
import { KIND_LABEL } from "@/lib/labels";
import { getStats, listCourses, listMaterials } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await Promise.all([getStats(), listCourses(), listMaterials()])
    .then(([stats, courses, materials]) => ({ stats, courses, materials }))
    .catch((error) => {
      console.error(error);
      return null;
    });
  if (!data) return <SetupNotice />;

  const { stats, courses, materials } = data;
  const recent = materials.slice(0, 6);
    const courseOptions = courses.map((course) => ({
      id: course.id,
      name: course.name,
      semester: course.semester,
    }));

    return (
      <div className="mx-auto max-w-5xl">
        <section className="mb-10">
          <p className="eyebrow">跨学期课堂记忆</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.15] md:text-5xl">
            把上过的课，
            <br className="hidden md:block" />
            变成找得回来的记忆
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft md:text-base">
            手写笔记、课件、板书照片，统一进 seekdb。
            一句模糊的回忆，也能定位到原始那一页。
          </p>
          <div className="mt-6 max-w-3xl">
            <SearchForm courses={courseOptions} />
          </div>
        </section>

        <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="课程" value={stats.courses} href="/library" />
          <Stat label="资料" value={stats.materials} href="/library" />
          <Stat label="知识片段" value={stats.chunks} href="/library" />
          <Stat label="待复习" value={stats.due} href="/review" accent />
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">最近入库</p>
              <h2 className="mt-1 font-serif text-2xl">这些资料已经在记忆里了</h2>
            </div>
            <Link href="/library" className="text-xs text-accent hover:underline">
              去资料库 →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="text-sm text-ink-soft">还没有资料。先上传一页笔记试试。</p>
              <Link href="/library" className="btn-primary mt-4">
                去上传
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recent.map((material) => (
                <Link
                  key={material.id}
                  href={`/search?courseId=${material.courseId}`}
                  className="panel panel-hover p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted">
                      {material.courseName} · {material.semester}
                    </span>
                    <span className="chip">{KIND_LABEL[material.kind] ?? material.kind}</span>
                  </div>
                  <h3 className="mt-2 font-medium leading-snug">{material.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                    {material.summary ?? "—"}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
                    <span>{material.chunkCount} 段</span>
                    <span>{material.cardCount} 张卡</span>
                    <span>{material.createdAt}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Step index="01" title="把资料丢进来" body="PDF 逐页解析，手写照片交给视觉模型转写，文字笔记直接粘贴。" />
          <Step index="02" title="用回忆去搜" body="一句口语化的描述，同时匹配语义、关键词和课程范围。" />
          <Step index="03" title="按遗忘曲线复习" body="从原文自动出卡片，到期提醒，四年下来就是你的课程记忆。" />
        </section>

        <p className="mt-10 text-center text-[11px] text-muted">
          数据层：seekdb（向量 + 全文 + 结构化条件的混合检索）
        </p>
      </div>
  );
}

function Stat({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="panel panel-hover px-4 py-4">
      <span className="text-[11px] tracking-wide text-muted">{label}</span>
      <div className={`mt-1 font-serif text-3xl ${accent ? "text-amber" : "text-ink"}`}>
        {value}
      </div>
    </Link>
  );
}

function Step({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="panel p-5">
      <span className="font-serif text-xs text-accent">{index}</span>
      <h3 className="mt-2 text-sm font-medium">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
