"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GoalForm({ goal }: { goal: number }) {
  const router = useRouter();
  const [value, setValue] = useState(goal);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/memory/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: value }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "保存失败");
      setState("saved");
      setMessage("已保存，下次打开仍然生效");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "保存失败");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={(event) => {
            setValue(Number(event.target.value));
            setState("idle");
            setMessage("");
          }}
          className="input w-24"
          aria-label="每日复习目标"
        />
        <span className="text-xs text-muted">张 / 天</span>
        <button type="button" className="btn" onClick={() => void save()} disabled={state === "saving"}>
          {state === "saving" ? "保存中…" : "保存目标"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${state === "error" ? "text-red-700" : "text-accent"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
