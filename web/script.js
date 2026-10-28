document.documentElement.classList.add("js");

const header = document.getElementById("header");
const navLinks = Array.from(document.querySelectorAll(".nav a")).filter((link) =>
  (link.getAttribute("href") ?? "").startsWith("#"),
);
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function onScroll() {
  if (header) header.classList.toggle("scrolled", window.scrollY > 8);

  let activeId = "";
  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    if (rect.top <= 140) activeId = `#${section.id}`;
  }
  for (const link of navLinks) {
    link.classList.toggle("active", link.getAttribute("href") === activeId);
  }
}

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  reveals.forEach((el) => observer.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("in"));
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const block = button.closest(".code-block");
    const code = block?.querySelector("code");
    if (!code) return;
    const text = code.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      const original = button.textContent;
      button.textContent = "已复制";
      setTimeout(() => {
        button.textContent = original;
      }, 1600);
    } catch {
      button.textContent = "复制失败";
    }
  });
}

const live = document.getElementById("live-demo");
if (live) {
  const note = document.getElementById("live-note");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  fetch(`${live.href}/api/stats`, { mode: "no-cors", cache: "no-store", signal: controller.signal })
    .catch(() => {
      live.classList.add("offline");
      live.textContent = "在线实例离线 · 请本地运行";
      if (note) note.textContent = "在线实例当前不可达，可按下方步骤在本地启动完整应用。";
    })
    .finally(() => clearTimeout(timer));
}
