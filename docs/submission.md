# 提交清单

## 1. 项目网站（公开）

- 网址：https://coursetrail-ukrnh1e2s5p.qoder.zone
- 可见范围：**任何人都可访问**
- 托管：Qoder Sites
- 站点内容包括：项目介绍、真实功能截图、seekdb 架构与检索 SQL、示例数据与评测、开发日志、本地运行指引，以及代码仓库与验证样例入口。

### 体验入口

- 在线实例（临时）：https://stated-antenna-heel-slope.trycloudflare.com
- 说明：实例以生产构建运行在开发机上，通过 Cloudflare 临时隧道暴露；仅在服务开启时可访问，重启隧道后地址会变化。门户的「在线体验」按钮会自动检测，不可达时降级提示本地运行。
- 长期可用：按「运行说明」在任意支持 Docker 的主机执行同样五步即可。

## 2. 代码仓库

- 地址：https://github.com/Pureiriss/coursetrail
- 可见性：**Public**
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

- Qoder 账号 UID：1442293114196855
- 截图/录屏：
  
  ![48308fec-b697-4250-8dbb-85aa76fa5382](file:///C:/Users/iris/Pictures/Typedown/48308fec-b697-4250-8dbb-85aa76fa5382.png)
