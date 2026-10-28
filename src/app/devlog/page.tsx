import Link from "next/link";

export const metadata = {
  title: "开发日志 — 课迹 CourseTrail",
};

type Entry = {
  time: string;
  title: string;
  qoder: string[];
  human: string[];
  issue?: string;
};

const ENTRIES: Entry[] = [
  {
    time: "选题",
    title: "从三个痛点里砍到只剩一个",
    qoder: [
      "把「文献综述 / 周报拼接 / 跨学期笔记」拆成用户、数据来源、技术承重点三列对比",
      "给出四个方向的功能边界和演示脚本，标出每个方向对 seekdb 的依赖程度",
    ],
    human: [
      "选在校学生场景：数据能自己造，演示不需要碰别人的聊天记录",
      "砍掉 PowerContext，只保留 seekdb，减少一个服务和一类故障",
    ],
  },
  {
    time: "环境",
    title: "先验证数据库，再写一行业务代码",
    qoder: [
      "写探针脚本直接连 seekdb，逐条尝试建表语法",
      "确认 IK 中文分词、COSINE 向量索引、cosine_distance() 都可用后，才生成 schema",
    ],
    human: ["发现 Docker Hub 超时，改用镜像源拉取 oceanbase/seekdb 镜像"],
    issue: "第一次 DDL 尝试没有加 ORGANIZATION = HEAP，建表成功但索引行为不符合预期；对照文档补上。",
  },
  {
    time: "数据层",
    title: "一条 SQL 同时拿到两种分数",
    qoder: [
      "设计 courses / materials / chunks / cards 四张主表，chunks 同时挂全文索引和 HNSW 向量索引",
      "把余弦距离与 MATCH…AGAINST 写进同一条查询，应用层只做归一化融合",
    ],
    human: ["决定在 chunks 上冗余 course_id，换取筛选时不用回表 join"],
  },
  {
    time: "入库",
    title: "PDF、图片、文字走同一条管线",
    qoder: [
      "用 pdfjs-dist 逐页抽文字，保留页码用于溯源",
      "写本地特征哈希向量作为兜底，没配 embedding 服务也能跑通全流程",
      "配置了视觉模型时，手写照片自动转写成带 LaTeX 的文字",
    ],
    human: ["切块上限从 480 字调到 260 字，片段更聚焦，定位更准"],
    issue: "pdfjs v5 的文档对象没有 destroy()，调用后整条上传返回 500，改成 cleanup() 后恢复。",
  },
  {
    time: "检索",
    title: "把噪声从结果里赶出去",
    qoder: [
      "第一版排序把「贝叶斯 后验」召回了 15 条，其中 13 条只是弱关键词命中（相关度 0.2 左右）",
      "加上相关度阈值，并让 SQL 里的排序表达式和前端展示的分数保持一致",
    ],
    human: ["把切块改成按句子边界重叠，片段不再从半句话开始"],
    issue: "重叠窗口按字符截断导致片段开头是「意事件 A：」，改成按完整句子回溯取重叠。",
  },
  {
    time: "复习",
    title: "FSRS 排期接上真实数据",
    qoder: [
      "用 ts-fsrs 做评分到下次到期时间的映射，四档评分写回复习日志表",
      "生成示例课程的手写复习卡，替换掉模板化的问题",
    ],
    human: ["卡片正面要求考察理解而不是背诵原文"],
  },
  {
    time: "工程",
    title: "三个让页面打不开的低级问题",
    qoder: ["逐条定位构建日志和运行时堆栈，给出最小修复"],
    human: ["用无头浏览器截图做视觉验收，而不是只看接口返回 200"],
    issue:
      "① 缺少 PostCSS 配置，Tailwind 的 @theme 未被识别，整站无样式；② Turbopack worker 崩溃后没有自动恢复，重启 dev server 即可；③ 文件接口用 Node 流转 Web Stream 会拖垮 worker，改成直接读 Buffer。",
  },
  {
    time: "验收",
    title: "端到端跑一遍再收工",
    qoder: ["生成 2 页示例讲义 PDF，验证上传、页码溯源、混合检索与原文打开"],
    human: [
      "tsc、eslint、next build 全部通过",
      "22 个片段、16 张卡片，复习队列可正常评分并顺延",
    ],
  },
];

export default function DevlogPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="eyebrow">开发日志</p>
        <h1 className="mt-2 font-serif text-3xl">这个项目是怎么被做出来的</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          开发全程在 Qoder 内完成：需求拆解、建表、入库管线、检索 SQL、前端页面、调试都由 Qoder
          生成与修改，人负责选型判断、验收和取舍。下面是关键节点，包括踩过的坑。
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Meta label="开发方式" value="Qoder 全程" />
        <Meta label="数据层" value="seekdb" />
        <Meta label="验证" value="tsc · lint · build" />
      </div>

      <ol className="relative border-l border-line pl-6">
        {ENTRIES.map((entry) => (
          <li key={entry.title} className="mb-8 last:mb-0">
            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">
                {entry.time}
              </span>
            </div>
            <h2 className="mt-2 font-serif text-xl">{entry.title}</h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-card p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-accent">
                  Qoder 完成
                </p>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-ink-soft">
                  {entry.qoder.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-line bg-card p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber">
                  人工判断
                </p>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-ink-soft">
                  {entry.human.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {entry.issue && (
              <p className="mt-2 rounded-xl bg-amber-soft/60 px-3 py-2 text-xs leading-relaxed text-ink-soft">
                <span className="font-medium text-amber">踩坑：</span>
                {entry.issue}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="panel mt-8 p-5">
        <p className="eyebrow">下一步</p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-ink-soft">
          <li>· 接入 bge-m3 embedding，替换本地哈希向量，提升语义召回</li>
          <li>· 用 Qoder Sites 发布作品门户，内置演示视频与架构说明</li>
          <li>· 补充 50 条回忆式 query 的评测集，对比纯向量 / 纯全文 / 混合检索</li>
        </ul>
        <Link href="/" className="btn mt-4">
          回首页体验
        </Link>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-3">
      <p className="text-[10px] tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
