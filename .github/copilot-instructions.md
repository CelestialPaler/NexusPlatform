# Copilot 指引 (AI Instructions)

本文档用于约束 AI 助手在当前 Nexus 仓库中的工作方式。若与过时文档或历史目录认知冲突，应以当前仓库结构和 `docs/development/11-Repository_Governance_Baseline.md` 为准。

## 0. 核心交互规则

- **语言**: 与用户交流必须全程使用中文，除非用户明确要求其他语言。
- **代码注释**: 新增注释、文档字符串、说明性文本默认使用中文。
- **现实优先**: AI 必须以真实仓库为准，禁止沿用已经失效的单体项目叙事。

## 1. 当前仓库上下文

### 1.1 仓库形态

当前仓库是 **monorepo**，而不是单一桌面应用目录。

主分层如下：

1. `nexus-contracts`: 共享契约层
2. `nexus-core`: 逻辑实现层
3. `nexus-platform`: 桌面宿主层

### 1.2 关键路径

- GUI 启动入口: `nexus-platform/run.py`
- 宿主后端: `nexus-platform/backend/`
- 前端源码: `nexus-platform/frontend/src/`
- 产品版本事实源: `nexus-platform/config/versions.json`
- 构建入口: `build-system/build.py`
- 构建 profile: `profiles/builds/`
- 功能 profile: `profiles/features/`
- 文档中心: `docs/README.md`
- 仓库治理总纲: `docs/development/11-Repository_Governance_Baseline.md`

### 1.3 技术栈

- 前端: React + Vite + TailwindCSS
- 图表: `recharts`
- 图标: `lucide-react`
- 桌面壳: Python + pywebview
- 核心逻辑: Python
- 构建体系: profile-driven build system + PyInstaller

### 1.4 平台策略

- Windows 是当前主成熟平台。
- macOS 目标是先保证稳定启动和核心通用能力可用。
- Linux 目前仍处于较早阶段，不应假设所有功能可用。
- 平台能力以 `nexus-platform/backend/capabilities.py` 暴露的信息为准，不要在前端或文档中硬编码“所有平台都支持”。

## 2. AI 工作原则

### 2.1 结构边界优先

- 涉及目录、入口、构建、版本、平台支持时，优先检查是否与治理总纲冲突。
- 不要继续把仓库描述为只有 `frontend/`、`backend/`、`run.py` 的单项目结构。
- 禁止让 `nexus-core` 依赖 `nexus-platform`。
- 允许的依赖方向是：
  - `nexus-platform` -> `nexus-core`
  - `nexus-platform` -> `nexus-contracts`
  - `nexus-core` -> `nexus-contracts`

### 2.2 改动要服务当前收敛方向

- 新增构建逻辑优先进入 `build-system/`，而不是继续扩大历史脚本职责。
- 仓库级包装命令优先放入 `scripts/`，但应保持薄包装属性。
- 仅供个人记录的 development 文档使用 `*.local.md` 命名，不进入正式规范体系。

### 2.3 代码生成通用规则

1. 代码注释使用中文。
2. UI 默认使用英文文案；多语言 key 保持英文。
3. React 必须使用函数式组件和 Hooks。
4. 样式优先使用 TailwindCSS utility classes。
5. Python 优先兼容项目当前实际运行环境；不要为了“新特性”引入不必要风险。

## 3. 常见任务指引

### 3.1 新增工具

新增工具时，默认按当前三层结构理解，不要把实现直接堆进宿主层。

推荐路径：

1. 在 `nexus-core` 中实现纯逻辑能力。
2. 如涉及共享类型、元数据、异常，优先复用 `nexus-contracts`。
3. 在 `nexus-platform/backend/` 中添加 manager 或桥接 API。
4. 在 `nexus-platform/frontend/src/` 中补对应 UI。
5. 更新 `translations.js` 与必要文档。

如果功能需要按平台降级，必须同时考虑 `capabilities.py` 和前端可见性控制。

### 3.2 修改前后端桥接

- Python -> JS 事件链路关注 `window.dispatchEvent`。
- JS -> Python 调用关注 `window.pywebview.api`。
- 新接口必须考虑错误捕获和平台能力差异。

### 3.3 修改构建或发布

- 优先检查 `build-system/build.py`、`profiles/builds/`、`profiles/features/`。
- 不要默认旧的 PowerShell 脚本就是事实构建入口。
- 若改动会影响产物路径、版本注入或工具打包，需同步检查文档与 profile。

## 4. 安全与错误处理

- Python 中执行 `subprocess` 必须校验输入参数，避免命令注入。
- 避免硬编码敏感信息。
- 前后端通信必须保留错误捕获机制。
- 前端调用后端 API 时，必须处理 Promise 错误分支。

## 5. 提交与文档要求

- 提交信息必须使用中文。
- 格式要求：第一行为简短标题，空一行后写详细正文。
- 正文说明修改动机、内容和潜在影响。
- 任何涉及以下内容的改动，都应检查文档是否需要同步：
  - 目录结构
  - 构建入口
  - 版本字段
  - 平台支持状态
  - CI / 发布流程

## 6. 调试建议

- 前端调试优先查看浏览器开发者工具 Console。
- 后端调试优先检查 `nexus-platform/run.py` 与 `nexus-platform/backend/app.py` 的启动链路。
- 平台相关问题优先检查 `capabilities.py`、平台特化 manager、以及是否错误加载了非目标平台实现。
