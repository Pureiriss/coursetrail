export function SetupNotice({ title = "数据库还没连上" }: { title?: string }) {
  return (
    <div className="panel mx-auto max-w-2xl p-8">
      <p className="eyebrow">需要一步准备</p>
      <h2 className="mt-2 font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        课迹把资料存在 seekdb 里。先在终端启动数据库并初始化表结构，然后刷新页面。
      </p>
      <pre className="mt-5 overflow-x-auto rounded-xl bg-ink px-4 py-3 text-xs leading-relaxed text-paper">
{`docker compose up -d
npm run db:init
npm run db:seed   # 可选：灌入示例课程`}
      </pre>
      <p className="mt-4 text-xs text-muted">
        如果 Docker 拉取镜像超时，可以设置镜像加速后重试。
      </p>
    </div>
  );
}
