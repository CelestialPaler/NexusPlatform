# Nexus 文档中心

> 文档状态: Active
> 文档角色: 文档总入口 / 阅读导航页
> 适用范围: `docs/` 全目录与仓库级文档入口
> 最后更新: 2026-04-21

欢迎来到 Nexus 文档中心。

当前 docs 的组织目标，不再是简单堆叠说明文件，而是形成一套可以明确项目定义、工程边界、版本规则、构建路径和开发流程的正式文档体系。

如果你只想快速进入正确阅读路径，建议按下面顺序开始：

1. 先读 `00-设计概要.md`，理解项目定义、边界、版本和总体构成。
2. 再读 `03-开发指南.md`，获取研发入口、常用命令和专题文档导航。
3. 需要了解正式工程规则时，优先读 `development/11-Repository_Governance_Baseline.md`。
4. 需要理解 docs 自身的组织与收口规则时，读 `development/12-Documentation_Governance_and_Closure_Plan.md`。

## 📚 文档索引

### 0. [Nexus 设计概要 (Design Overview)](00-设计概要.md)
> **面向对象**: 项目 Owner、架构师、立项评审、核心研发
*   项目定义与目标
*   产品边界与当前范围
*   版本状态与规划方向
*   技术栈、系统构成与构建交付路线

### 1. [Nexus 设计愿景 (Design Vision)](01-设计愿景.md)
> **面向对象**: 产品经理、架构师、项目Owner
*   项目背景与痛点分析
*   设计哲学 (物理分离/逻辑统一)
*   架构全景图
*   产品演进路线 (Roadmap)

### 2. [Nexus 使用指南 (User Guide)](02-使用指南.md)
> **面向对象**: 测试工程师、现场支持人员、最终用户
*   快速启动 (Quick Start)
*   核心功能手册 (Debug, Charts, Analysis)
*   工具使用详解 (Ping, Iperf, Capture)
*   常见问题与故障排查 (Troubleshooting)

### 3. [Nexus 开发指南 (Developer Guide)](03-开发指南.md)
> **面向对象**: 研发人员、贡献者
*   研发阅读入口与文档导航
*   当前 monorepo 结构与事实入口
*   最小开发命令与构建入口
*   仓库治理、版本治理与专题规范索引

## 文档治理

### 4. [Nexus 文档治理与收口方案](development/12-Documentation_Governance_and_Closure_Plan.md)
> **面向对象**: 项目 Owner、架构师、文档维护者、核心研发
*   docs 体系分层
*   当前权威文档矩阵
*   文档状态与元信息规则
*   文档收口阶段与执行顺序

### 5. [Nexus 仓库治理总纲](development/11-Repository_Governance_Baseline.md)
> **面向对象**: 项目 Owner、核心研发、治理维护者
*   仓库治理边界
*   目录组织基线
*   版本与 CI 基线
*   多平台治理原则

## 📦 快速链接
*   [设计概要](00-设计概要.md)
*   [开发指南](03-开发指南.md)
*   [文档治理与收口方案](development/12-Documentation_Governance_and_Closure_Plan.md)
*   [更新日志 (CHANGELOG)](../CHANGELOG.md)
*   [构建指南 (COMPILING)](../COMPILING.md)
*   [仓库治理总纲](development/11-Repository_Governance_Baseline.md)
*   [跨平台重构方案](development/07-Cross_Platform_Refactor_Plan.md)
*   [跨平台构建与第三方依赖治理](development/08-Cross_Platform_Build_and_Dependencies.md)
*   [契约层与仓库目录治理方案](development/09-Contracts_and_Repo_Organization_Proposal.md)
*   [变体构建与产物工程方案](development/10-Variant_Build_and_Artifact_Engineering.md)

## 状态说明

后续正式文档统一采用以下状态：

1. `Active`: 当前有效文档
2. `Draft`: 正在收敛中的文档
3. `Proposal`: 提案文档
4. `Archive`: 历史文档

若某篇旧文档尚未补状态说明，不应直接假定为当前正式规则；请优先回到本文档、`00-设计概要` 和治理总纲判断其角色。
