import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { SetupNotice } from "@/components/SetupNotice";
import { CourseForm, UploadPanel } from "@/components/UploadPanel";
import { KIND_HINT, KIND_LABEL } from "@/lib/labels";
import { listCourses, listMaterials } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const data = await Promise.all([listCourses(), listMaterials()])
    .then(([courses, materials]) => ({ courses, materials }))
    .catch((error) => {
      console.error(error);
      return null;
    });
  if (!data) return <SetupNotice />;

  const { courses, materials } = data;
  const groups = courses.map((course) => ({
      course,
      items: materials.filter((material) => material.courseId === course.id),
    }));
    const courseOptions = courses.map((course) => ({
      id: course.id,
      name: course.name,
      semester: course.semester,
    }));

    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="eyebrow">资料库</p>
          <h1 className="mt-2 font-serif text-3xl">所有课上过的东西，都在这里</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {materials.length} 份资料，分布在 {courses.length} 门课里。
          </p>
        </div>

        <div className="mb-8 max-w-3xl">
          <SearchForm courses={courseOptions} compact />
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-4">
            <UploadPanel courses={courseOptions} />
            <CourseForm />
          </div>

          <div className="flex flex-col gap-6">
            {groups.length === 0 && (
              <div className="panel p-8 text-center text-sm text-ink-soft">
                还没有课程。先在左边新建一门课，再上传资料。
              </div>
            )}

            {groups.map(({ course, items }) => (
              <section key={course.id}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-xl">{course.name}</h2>
                    <p className="text-[11px] text-muted">
                      {course.semester}
                      {course.teacher ? ` · ${course.teacher}` : ""} · {items.length} 份资料 ·{" "}
                      {course.chunkCount} 个片段
                    </p>
                  </div>
                  <Link
                    href={`/search?courseId=${course.id}`}
                    className="text-xs text-accent hover:underline"
                  >
                    查看这门课的全部片段 →
                  </Link>
                </div>

                <div className="flex flex-col gap-2">
                  {items.map((material) => (
                    <article
                      key={material.id}
                      className="panel panel-hover flex flex-wrap items-start gap-3 p-4"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {material.kind === "image" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/files/${material.id}`}
                            alt={material.title}
                            className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="chip">
                              {KIND_LABEL[material.kind] ?? material.kind}
                            </span>
                            <h3 className="truncate text-sm font-medium">{material.title}</h3>
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-muted">
                            {KIND_HINT[material.kind] ?? ""} · {material.summary ?? "—"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                            {material.pageCount > 0 && <span>{material.pageCount} 页</span>}
                            <span>{material.chunkCount} 段</span>
                            <span>{material.cardCount} 张卡</span>
                            <span>{material.createdAt}</span>
                          </div>
                        </div>
                      </div>
                      {material.fileName && (
                        <a
                          href={`/api/files/${material.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn shrink-0 px-3 py-1.5 text-xs"
                        >
                          打开原文
                        </a>
                      )}
                    </article>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
                      这门课还没有资料
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
}
