"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CourseOption = { id: number; name: string; semester: string };

export function UploadPanel({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [courseId, setCourseId] = useState<number>(courses[0]?.id ?? 0);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!courseId) {
      setError("请先在下面新建一门课程");
      return;
    }
    if (!file) {
      setError("请选择文件");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.set("courseId", String(courseId));
      form.set("file", file);
      if (title.trim()) form.set("title", title.trim());
      if (caption.trim()) form.set("caption", caption.trim());

      const response = await fetch("/api/materials", { method: "POST", body: form });
      const data = (await response.json()) as {
        error?: string;
        chunkCount?: number;
        cardCount?: number;
        conceptCount?: number;
        usedVision?: boolean;
        usedLLM?: boolean;
      };
      if (!response.ok) throw new Error(data.error ?? "上传失败");

      setMessage(
        `已入库：${data.chunkCount} 个片段、${data.conceptCount ?? 0} 个概念、${data.cardCount} 张复习卡${
          data.usedVision ? "，图片已自动转写" : ""
        }${data.usedLLM ? "，概念由模型抽取" : ""}`,
      );
      setFile(null);
      setTitle("");
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel p-5">
      <h2 className="font-serif text-xl">上传资料</h2>
      <p className="mt-1 text-xs text-muted">支持 PDF、图片（手写/板书）和文字笔记</p>

      <div className="mt-4">
        <label className="label" htmlFor="course">
          课程
        </label>
        <select
          id="course"
          className="input"
          value={courseId}
          onChange={(event) => setCourseId(Number(event.target.value))}
        >
          {courses.length === 0 && <option value={0}>还没有课程</option>}
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name} · {course.semester}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="file">
          文件
        </label>
        <input
          id="file"
          ref={inputRef}
          type="file"
          accept=".pdf,image/*,.txt,.md"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full cursor-pointer rounded-xl border border-dashed border-line bg-paper px-3 py-3 text-xs text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-xs file:text-accent"
        />
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="title">
          标题（可选）
        </label>
        <input
          id="title"
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="不填就用文件名"
        />
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="caption">
          补充说明（可选）
        </label>
        <textarea
          id="caption"
          className="input min-h-[72px] resize-y"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="比如：这是第三周讲贝叶斯公式时的板书，右下角是例题"
        />
      </div>

      <button type="submit" className="btn-primary mt-4 w-full" disabled={busy}>
        {busy ? "解析并入库中…" : "开始入库"}
      </button>

      {message && (
        <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs leading-relaxed text-accent">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

export function CourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("2025-2026 秋");
  const [teacher, setTeacher] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, semester, teacher }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "创建失败");
      setName("");
      setTeacher("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="panel p-5">
      <summary className="cursor-pointer text-sm font-medium">新建课程</summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="课程名，比如：概率论与数理统计"
          required
        />
        <input
          className="input"
          value={semester}
          onChange={(event) => setSemester(event.target.value)}
          placeholder="学期，比如：2025-2026 秋"
          required
        />
        <input
          className="input"
          value={teacher}
          onChange={(event) => setTeacher(event.target.value)}
          placeholder="老师（可选）"
        />
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "创建中…" : "创建课程"}
        </button>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </form>
    </details>
  );
}
