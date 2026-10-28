import type { RowDataPacket } from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createEmptyCard } from "ts-fsrs";
import { rows, run } from "../src/lib/db";
import { ingestMaterial } from "../src/lib/ingest";
import { createCourse } from "../src/lib/repo";

type SeedCourse = {
  name: string;
  semester: string;
  teacher: string;
  materials: { title: string; text: string }[];
};

const COURSES: SeedCourse[] = [
  {
    name: "概率论与数理统计",
    semester: "2024-2025 秋",
    teacher: "王建国",
    materials: [
      {
        title: "条件概率、全概率与贝叶斯公式",
        text: `条件概率与乘法公式
P(A|B) = P(AB) / P(B)，要求 P(B) > 0。乘法公式 P(AB) = P(A|B)P(B)。

全概率公式
如果 B1, B2, ..., Bn 是样本空间的一个划分，且每个 P(Bi) > 0，那么对任意事件 A：
P(A) = Σ P(A|Bi) P(Bi)。做题时先找“完备事件组”，再按原因分解。

贝叶斯公式
P(Bi|A) = P(A|Bi) P(Bi) / P(A)，分母用全概率公式展开。贝叶斯公式本质是“由结果反推原因”。
先验概率 P(Bi)、似然 P(A|Bi)、后验概率 P(Bi|A)。老师画了一棵树状图：第一层是原因（患病 / 不患病），第二层是检测结果（阳性 / 阴性），把每条路径的概率相乘再相加。

例题：某疾病患病率 0.1%，检测灵敏度 99%，假阳性率 2%。若某人检测阳性，真正患病的概率约为 4.7%，远低于直觉。这说明后验概率同时受先验和似然影响，不能只看检测准确率。

易错点：分母漏掉 P(A) 的其他来源；把 P(A|B) 和 P(B|A) 混为一谈。`,
      },
      {
        title: "随机变量与常见分布",
        text: `随机变量与分布函数
随机变量是把样本空间映射到实数的函数。分布函数 F(x) = P(X ≤ x)，单调不减、右连续，F(-∞)=0，F(+∞)=1。

离散型随机变量用分布律描述：P(X = xk) = pk，Σpk = 1。常见分布：0-1 分布、二项分布 B(n,p)、泊松分布 P(λ)。

连续型随机变量的密度函数 f(x) 满足 f(x) ≥ 0 且 ∫f(x)dx = 1，F(x) 是 f 的积分。均匀分布、指数分布、正态分布 N(μ, σ²) 是最常用的三个连续分布。正态分布的标准化：Z = (X - μ) / σ ~ N(0,1)，查表计算概率。

二维随机变量要区分联合分布、边缘分布和条件分布。独立性的判断：F(x,y) = FX(x)FY(y)，离散型等价于 pij = pi·p·j。

协方差 Cov(X,Y) = E(XY) - E(X)E(Y)，相关系数 ρ 衡量线性相关程度。协方差矩阵是对称半正定矩阵。`,
      },
      {
        title: "大数定律与中心极限定理",
        text: `切比雪夫不等式
P(|X - E(X)| ≥ ε) ≤ D(X)/ε²，用来估计偏离均值的概率上界。

大数定律说明样本均值依概率收敛到总体均值。辛钦大数定律只要求独立同分布且期望存在；伯努利大数定律说明频率稳定于概率。

中心极限定理：独立同分布、方差有限的随机变量之和，标准化后依分布收敛于标准正态分布。列维-林德伯格定理是考试重点，近似计算时把和写成 (ΣXi - nμ) / (σ√n) ≈ N(0,1)。

应用：抛硬币 10000 次，正面次数近似服从 N(5000, 2500)，可以估计偏差超过 200 次的概率。

注意区分：大数定律讲“均值稳定”，中心极限定理讲“波动近似正态”。`,
      },
      {
        title: "数学期望、方差与协方差",
        text: `数学期望与方差
期望 E(X) 是随机变量的加权平均，离散型 E(X)=Σxk pk，连续型 E(X)=∫x f(x)dx。期望的线性性：E(aX+bY)=aE(X)+bE(Y)，不要求独立。

方差 D(X)=E(X²)-[E(X)]²，衡量波动大小。D(aX+b)=a²D(X)。常见分布：二项分布 E=np、D=np(1-p)；泊松分布 E=D=λ；均匀分布 U(a,b) 的期望 (a+b)/2，方差 (b-a)²/12；正态分布 N(μ,σ²) 的期望 μ、方差 σ²。

协方差与相关系数：Cov(X,Y)=E(XY)-E(X)E(Y)，ρ=Cov/(σXσY)，|ρ|≤1。ρ=0 只说明不线性相关，不一定独立。

矩母函数和特征函数用于求分布、证明极限定理。切比雪夫不等式给出偏离均值的概率上界。`,
      },
    ],
  },
  {
    name: "线性代数",
    semester: "2024-2025 春",
    teacher: "李梅",
    materials: [
      {
        title: "特征值与特征向量",
        text: `特征值与特征向量
对方阵 A，若存在非零向量 x 和数 λ 使 Ax = λx，则 λ 是特征值，x 是对应特征向量。特征多项式 det(λI - A) = 0 的根就是特征值，代数重数是根的阶数，几何重数是特征子空间维数。

性质：特征值之和等于迹 tr(A)，特征值之积等于 det(A)。不同特征值对应的特征向量线性无关。实对称矩阵一定可以正交对角化：A = QΛQᵀ，其中 Q 的列是标准正交特征向量。

对角化的用途：计算 A^k 时先算 Λ^k；解微分方程组时把耦合项解耦。相似矩阵有相同的特征多项式，但特征向量一般不同。

易错：特征向量不能是零向量；可对角化要求几何重数等于代数重数。行列式为零等价于有零特征值。`,
      },
      {
        title: "奇异值分解 SVD",
        text: `奇异值分解 SVD
任意 m×n 矩阵 A 都可以分解为 A = UΣVᵀ。U 是左奇异向量（AAᵀ 的特征向量），V 是右奇异向量（AᵀA 的特征向量），Σ 对角线是奇异值，非负且降序。

奇异值是 AᵀA 特征值的平方根。SVD 把矩阵分解成若干秩一矩阵的加权和，权重就是奇异值。截断 SVD 只保留前 k 个奇异值，是最优的低秩近似（Eckart–Young 定理），用于图像压缩、降维和推荐系统。

与特征值分解的关系：正方阵且可对角化时，SVD 退化为特征分解；一般矩阵没有足够特征向量，但一定有 SVD。PCA 就是对中心化后的数据做 SVD，主成分方向是右奇异向量。

应用：潜在语义分析 LSA、协同过滤中的矩阵分解、噪声过滤。矩阵分解也是推荐系统的经典方法。`,
      },
      {
        title: "最小二乘与正交投影",
        text: `最小二乘与投影
线性方程组 Ax = b 无解时，找使 ‖Ax - b‖² 最小的 x̂，称为最小二乘解。正规方程 AᵀA x̂ = Aᵀb。当 A 列满秩时 x̂ = (AᵀA)⁻¹Aᵀb。

几何解释：Ax̂ 是 b 在 A 的列空间上的正交投影，残差 b - Ax̂ 与列空间正交。投影矩阵 P = A(AᵀA)⁻¹Aᵀ，满足 P² = P、Pᵀ = P。

数值上不建议直接求逆，用 QR 分解 A = QR，则 x̂ = R⁻¹Qᵀb，条件数更好。若 A 列不满秩，正规方程有无穷多解，可加岭正则项得到 x̂ = (AᵀA + λI)⁻¹Aᵀb。

应用：线性回归、曲线拟合、GPS 定位中的超定方程。子空间投影也是理解 PCA 的基础。`,
      },
      {
        title: "矩阵的秩与线性方程组",
        text: `矩阵的秩与线性方程组
矩阵的秩 rank(A) 是行向量组（或列向量组）的极大线性无关组大小。初等行变换不改变秩。

齐次方程组 Ax=0 有非零解当且仅当 rank(A) < n，基础解系含 n-rank(A) 个向量。非齐次方程组 Ax=b 有解当且仅当 rank(A)=rank([A|b])；有唯一解时等于 n，无穷多解时小于 n。

解的结构：特解 + 齐次通解。克拉默法则只适用于方阵且行列式非零，计算量大，实际多用消元法。

四个基本子空间：列空间、零空间、行空间、左零空间，维数关系 rank + nullity = n。矩阵的秩也等于非零奇异值的个数。`,
      },
    ],
  },
  {
    name: "机器学习导论",
    semester: "2025-2026 秋",
    teacher: "陈昊",
    materials: [
      {
        title: "过拟合、正则化与偏差方差",
        text: `过拟合与正则化
过拟合：模型在训练集上误差很小，在验证集上误差明显变大，说明学到了噪声而不是规律。判断方法：训练误差持续下降而验证误差回升；学习曲线出现明显开口；参数范数快速增大。

正则化通过在损失函数中加入参数惩罚抑制过拟合：L2 正则（岭回归）λ‖w‖²，让权重整体变小；L1 正则（Lasso）λ‖w‖₁，产生稀疏解，可用于特征选择；弹性网络结合两者。

偏差-方差权衡：模型太简单偏差大（欠拟合），太复杂方差大（过拟合）。常用手段：增加数据、数据增强、早停、Dropout、降低模型复杂度、交叉验证选择超参数。

注意：正则化系数 λ 需要在验证集上调，不能看测试集。交叉验证常用 5 折或 10 折。`,
      },
      {
        title: "梯度下降与学习率",
        text: `梯度下降与学习率
梯度下降沿负梯度方向更新参数：θ ← θ - η∇L(θ)。η 是学习率。

学习率太大会震荡甚至发散，太小收敛慢。常见策略：学习率预热、余弦退火、按验证损失衰减。批量梯度下降用全量数据，稳定但慢；随机梯度下降 SGD 每次用一个样本，噪声大；小批量 mini-batch 是折中，也是深度学习默认做法。

动量法累积历史梯度，缓解峡谷地形的震荡：v ← βv + ∇L，θ ← θ - ηv。Adam 结合一阶矩和二阶矩估计，自适应调整每个参数的学习率，是常用的默认优化器。

判断训练是否正常：损失曲线是否平滑下降，梯度范数是否爆炸或消失，学习率是否过大导致 loss 变成 NaN。`,
      },
      {
        title: "决策树与集成学习",
        text: `决策树与集成学习
决策树通过递归划分特征空间做预测。划分准则：信息增益（ID3）、信息增益率（C4.5）、基尼指数（CART）。树的生长容易过拟合，需要预剪枝（限制深度、最小样本数）或后剪枝（代价复杂度剪枝）。

随机森林用自助采样 bagging 训练多棵树，并在每次分裂时随机选特征子集，降低方差。袋外样本 OOB 可以估计泛化误差。

梯度提升 GBDT 串行训练，每棵树拟合前一轮的残差；XGBoost 加入二阶导数和正则项，LightGBM 用直方图与叶子生长策略加速。

特征重要性：基于不纯度下降或置换检验。集成模型通常比单棵树稳定，但可解释性下降，可用 SHAP 解释。`,
      },
    ],
  },
];

const CONCEPTS = [
  "贝叶斯公式",
  "全概率公式",
  "条件概率",
  "协方差",
  "大数定律",
  "中心极限定理",
  "特征值",
  "奇异值分解",
  "最小二乘",
  "矩阵的秩",
  "过拟合",
  "正则化",
  "梯度下降",
  "决策树",
  "随机森林",
];

const CURATED_CARDS: { match: string; front: string; back: string }[] = [
  {
    match: "检测阳性",
    front: "检测结果阳性，真正患病的概率为什么可能远低于直觉？",
    back: "后验 P(患病|阳性) 同时受先验患病率和似然影响。患病率只有 0.1% 时，即使灵敏度 99%、假阳性 2%，阳性者真正患病的概率也只有约 4.7%：大量健康人的假阳性淹没了少数真阳性。",
  },
  {
    match: "贝叶斯公式本质",
    front: "写出贝叶斯公式，并说明分母为什么用全概率公式。",
    back: "P(Bi|A) = P(A|Bi)P(Bi) / P(A)，其中 P(A) = ΣP(A|Bj)P(Bj) 遍历所有原因。分母是结果 A 发生的总概率，漏掉其他来源就会算错。",
  },
  {
    match: "全概率公式",
    front: "拿到一道概率题，怎么判断该用全概率公式？",
    back: "当事件 A 能按一组互斥且完备的原因 B1…Bn 分解时。先找完备事件组，再按 P(A)=ΣP(A|Bi)P(Bi) 加权求和。",
  },
  {
    match: "条件概率与乘法公式",
    front: "P(A|B) 和 P(B|A) 有什么区别？",
    back: "P(A|B)=P(AB)/P(B) 是在 B 已发生的条件下 A 的概率。两者分母不同，一般不等：检测问题里 P(阳性|患病) 是灵敏度，P(患病|阳性) 才是后验。",
  },
  {
    match: "实对称矩阵一定可以正交对角化",
    front: "实对称矩阵为什么一定能正交对角化？",
    back: "实对称矩阵特征值全为实数，不同特征值对应的特征向量正交；重特征值也能取到一组标准正交特征向量，因此 A=QΛQᵀ，Q 为正交矩阵。",
  },
  {
    match: "特征值之和等于迹",
    front: "特征值与迹、行列式有什么关系？",
    back: "所有特征值之和等于迹 tr(A)，所有特征值之积等于 det(A)。由此可快速判断：det(A)=0 等价于存在零特征值。",
  },
  {
    match: "任意 m×n 矩阵",
    front: "为什么任意矩阵都有 SVD，而特征分解不一定存在？",
    back: "SVD 由 AAᵀ 和 AᵀA 的特征分解构造，二者都是半正定对称矩阵，一定有正交特征向量；因此任意 m×n 矩阵都能写成 UΣVᵀ，不要求方阵或可对角化。",
  },
  {
    match: "Eckart",
    front: "截断 SVD 为什么被称为最优低秩近似？",
    back: "Eckart–Young 定理：在 Frobenius 范数下，保留前 k 个奇异值的截断 SVD 误差最小，是所有秩不超过 k 的矩阵中最接近原矩阵的。",
  },
  {
    match: "正交投影",
    front: "最小二乘的几何意义是什么？",
    back: "Ax=b 无解时，Ax̂ 是 b 在 A 的列空间上的正交投影，残差 b-Ax̂ 垂直于列空间，因此 ‖Ax-b‖² 最小。",
  },
  {
    match: "QR 分解",
    front: "为什么数值上更推荐 QR 分解而不是直接求逆？",
    back: "直接构造 AᵀA 会把条件数平方放大，求逆不稳定；QR 分解后解 R x = Qᵀb，只需回代，数值更稳定。",
  },
  {
    match: "大数定律说明",
    front: "大数定律和中心极限定理分别在说什么？",
    back: "大数定律说样本均值依概率收敛到总体均值，描述稳定性；中心极限定理说标准化后的和近似服从正态分布，描述波动的形态。",
  },
  {
    match: "过拟合",
    front: "训练误差下降但验证误差上升，说明什么？",
    back: "模型开始拟合噪声，泛化变差。可增加数据、加正则化、早停、降低模型复杂度，或用交叉验证重新选择超参数。",
  },
  {
    match: "L1 正则",
    front: "L1 和 L2 正则化有什么区别？",
    back: "L1 惩罚 |w| 之和，容易把部分权重压到 0，产生稀疏解，可做特征选择；L2 惩罚 w² 之和，让权重整体变小，解更平滑。",
  },
  {
    match: "学习率太大",
    front: "学习率太大会发生什么？",
    back: "参数更新步子过大，损失震荡甚至发散，严重时出现 NaN。可以减小学习率、加预热，或改用自适应优化器。",
  },
  {
    match: "随机森林",
    front: "随机森林为什么能降低方差？",
    back: "用自助采样训练多棵差异较大的树，并对结果取平均。特征随机化削弱了树之间的相关性，平均后方差显著下降。",
  },
  {
    match: "rank(A)",
    front: "Ax=b 有解的充要条件是什么？",
    back: "rank(A)=rank([A|b])。若等于未知数个数 n 则唯一解；小于 n 则无穷多解，通解 = 特解 + 齐次通解。",
  },
];

async function main() {
  for (const course of COURSES) {
    const existing = await rows<RowDataPacket & { id: number }>(
      "SELECT id FROM courses WHERE name = ?",
      [course.name],
    );
    const courseId =
      existing[0]?.id ??
      (await createCourse({
        name: course.name,
        semester: course.semester,
        teacher: course.teacher,
      }));

    for (const material of course.materials) {
      const exists = await rows<RowDataPacket>(
        "SELECT id FROM materials WHERE title = ? AND course_id = ?",
        [material.title, courseId],
      );
      if (exists.length) {
        console.log(`跳过已存在：${material.title}`);
        continue;
      }

      const result = await ingestMaterial({
        courseId,
        title: material.title,
        kind: "text",
        text: material.text,
        mime: "text/plain",
      });
      console.log(
        `✓ ${course.name} / ${material.title} → ${result.chunkCount} 段, ${result.cardCount} 张卡`,
      );
    }
  }

  for (const name of CONCEPTS) {
    await run("INSERT IGNORE INTO concepts (name, aliases) VALUES (?, ?)", [name, ""]);
    const found = await rows<RowDataPacket & { id: number }>(
      "SELECT id FROM concepts WHERE name = ?",
      [name],
    );
    if (!found[0]) continue;
    await run(
      `INSERT IGNORE INTO chunk_concepts (chunk_id, concept_id)
       SELECT id, ? FROM chunks WHERE content LIKE ?`,
      [found[0].id, `%${name}%`],
    );
  }

  const sampleMaterials: {
    course: string;
    title: string;
    kind: "image" | "pdf";
    file: string;
    mime: string;
    caption: string;
  }[] = [
    {
      course: "概率论与数理统计",
      title: "板书 · 贝叶斯树状图",
      kind: "image",
      file: "public/samples/bayes-notes.png",
      mime: "image/png",
      caption:
        "第三周课堂板书照片：贝叶斯公式的树状图。第一层分原因（患病 0.1% / 不患病 99.9%），第二层分检测结果（阳性 / 阴性），每条分支上写着条件概率，最下面用全概率公式求分母。",
    },
    {
      course: "概率论与数理统计",
      title: "第 6 讲 马尔可夫链",
      kind: "pdf",
      file: "public/samples/markov-lecture.pdf",
      mime: "application/pdf",
      caption: "",
    },
  ];

  for (const sample of sampleMaterials) {
    const course = await rows<RowDataPacket & { id: number }>(
      "SELECT id FROM courses WHERE name = ?",
      [sample.course],
    );
    if (!course[0]) continue;

    const exists = await rows<RowDataPacket>(
      "SELECT id FROM materials WHERE title = ? AND course_id = ?",
      [sample.title, course[0].id],
    );
    if (exists.length) {
      console.log(`跳过已存在：${sample.title}`);
      continue;
    }

    const buffer = await readFile(path.join(process.cwd(), sample.file));
    const result = await ingestMaterial({
      courseId: course[0].id,
      title: sample.title,
      kind: sample.kind,
      buffer,
      mime: sample.mime,
      fileName: path.basename(sample.file),
      caption: sample.caption,
    });
    console.log(
      `✓ 示例资料 ${sample.title} → ${result.chunkCount} 段, ${result.cardCount} 张卡`,
    );
  }

  const titles = COURSES.flatMap((course) => course.materials.map((material) => material.title));
  const titlePlaceholders = titles.map(() => "?").join(",");
  await run(
    `DELETE FROM cards WHERE chunk_id IN (
       SELECT id FROM chunks WHERE material_id IN (
         SELECT id FROM materials WHERE title IN (${titlePlaceholders})
       )
     )`,
    titles,
  );

  const empty = createEmptyCard(new Date());
  let curatedCount = 0;
  const covered = new Set<number>();
  for (const card of CURATED_CARDS) {
    const found = await rows<RowDataPacket & { id: number; course_id: number }>(
      "SELECT id, course_id FROM chunks WHERE content LIKE ? LIMIT 1",
      [`%${card.match}%`],
    );
    if (!found[0]) continue;
    await run(
      `INSERT INTO cards (chunk_id, course_id, front, back, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        found[0].id,
        found[0].course_id,
        card.front,
        card.back,
        empty.due,
        empty.stability,
        empty.difficulty,
        empty.elapsed_days,
        empty.scheduled_days,
        empty.learning_steps,
        empty.reps,
        empty.lapses,
        empty.state,
      ],
    );
    covered.add(found[0].id);
    curatedCount += 1;
  }

  let fallbackCount = 0;
  const uncovered = await rows<
    RowDataPacket & { id: number; course_id: number; content: string }
  >(
    `SELECT c.id, c.course_id, c.content
     FROM chunks c JOIN materials m ON m.id = c.material_id
     WHERE m.title IN (${titlePlaceholders})
     ${covered.size ? `AND c.id NOT IN (${[...covered].map(() => "?").join(",")})` : ""}`,
    [...titles, ...covered],
  );
  for (const chunk of uncovered) {
    const heading = String(chunk.content).split("\n")[0].trim();
    const usable = heading.length > 1 && heading.length <= 30 && !heading.includes("。");
    await run(
      `INSERT INTO cards (chunk_id, course_id, front, back, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chunk.id,
        chunk.course_id,
        usable ? `用自己的话解释「${heading}」` : "这段笔记的核心内容是什么？",
        String(chunk.content).slice(0, 180),
        empty.due,
        empty.stability,
        empty.difficulty,
        empty.elapsed_days,
        empty.scheduled_days,
        empty.learning_steps,
        empty.reps,
        empty.lapses,
        empty.state,
      ],
    );
    fallbackCount += 1;
  }

  await run(
    "UPDATE cards SET due = DATE_ADD(NOW(), INTERVAL (id % 6 + 1) DAY) WHERE id % 3 = 0",
  );

  const [chunks] = await rows<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM chunks",
  );
  const [cards] = await rows<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM cards",
  );
  const [due] = await rows<RowDataPacket & { total: number }>(
    "SELECT COUNT(*) AS total FROM cards WHERE due <= NOW()",
  );

  console.log(
    `\n种子数据完成：${chunks?.total ?? 0} 个片段，${cards?.total ?? 0} 张卡片（手写 ${curatedCount} 张，模板 ${fallbackCount} 张），${
      due?.total ?? 0
    } 张当前待复习`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
