# 提交清单

## 1. 项目网站（公开）

- 网址：https://coursetrail-ukrnh1e2s5p.qoder.zone
- 可见范围：**任何人都可访问**（匿名请求返回 200）
- 托管：Qoder Sites
- 站点内容包括：项目介绍、真实功能截图、seekdb 架构与检索 SQL、示例数据与评测、开发日志、本地运行指引。

## 2. 代码仓库

- 地址：https://github.com/Pureiriss/coursetrail
- 可见性：**Public**（匿名访问返回 200）
- 默认分支：`main`
- 当前提交：`e8845bd`
- 克隆：`git clone git@github.com:Pureiriss/coursetrail.git`

仓库不包含：`node_modules/`、`.next/`、`data/uploads/`、`.env.local`、截图临时文件与 Qoder 站点描述文件。

## 3. 运行说明

见 [README.md](../README.md)，包含：

- 运行环境与依赖版本（Node 20+、Docker、seekdb 镜像、端口）
- seekdb 的 Docker 部署方式与连接参数（`127.0.0.1:2881`，root，空密码）
- 从安装到启动的完整步骤（`docker compose up -d` → `npm ci` → `db:init` → `db:seed` → `dev`）
- 可选模型接口的配置方式与降级行为

## 4. 验证样例

见 [verification.md](verification.md)，包含四个可执行样例：

- A：混合检索（输入「树状图」，预期 2 条结果，含图片资料）
- B：seekdb 索引与双分数 SQL（`SHOW CREATE TABLE`、`cosine_distance` + `MATCH … AGAINST`）
- C：复习评分写回（`POST /api/cards/review`，`due` 顺延、`reviews` 新增）
- D：PDF 页码溯源（页码与原文一致）

每个样例都给出了初始数据、输入、步骤、预期结果与 seekdb 发挥作用的证据。

## 5. Qoder 开发记录

见 [qoder-record.md](qoder-record.md)，包含开发时间线、Qoder 在各环节完成的工作、人工判断点，以及待补充的截图清单。

- Qoder 账号 UID：**待填写**（桌面端「设置 → 账号」可查看）
- 截图/录屏：**待补充**（清单见文档第 4 节）
