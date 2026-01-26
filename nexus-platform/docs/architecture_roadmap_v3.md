---
uuid: 20260126-ARCH-NEXUS-V3
created: 2026-01-25
updated: 2026-01-26
type: doc
tags: [架构, 规划, Nexus, 插件化, Automation]
status: Draft
---

# Nexus Platform 架构演进与重构路线图 v3.0 (插件化生态版)

> **版本**: 3.0
> **目标**: 构建基于微内核的插件化平台，实现工具的独立分发、热插拔与自动化编排。

## 1. 核心哲学 (Philosophy)

1.  **微内核 (Microkernel)**: 平台核心只提供“插座”和“总线”，不包含具体业务。
2.  **万物皆插件 (Everything is a Plugin)**: 无论是重量级的自动化测试，还是轻量级的 Ping 工具，都是同等地位的插件。
3.  **可编排 (Orchestratable)**: 所有的插件必须暴露原子化的 Action，供 Automation 引擎调用，从而实现跨插件的流程协作。

## 2. 三层架构体系 (Three-Tier Architecture)

```mermaid
graph TD
    User((用户))
    
    subgraph "Tier 1: Nexus Host (平台宿主/微内核)"
        GUI[Web Shell (React)]
        PluginLoader[Plugin Manager]
        EventBus[Event Bus / IPC]
        ConfigMgr[Configuration]
    end

    subgraph "Tier 2: Core Services (核心服务)"
        AutoEngine[🚀 Automation Engine (中枢神经)]
        DataStore[Data Warehouse / Log DB]
        Visualize[Viz Engine (BI/ECharts)]
    end

    subgraph "Tier 3: Plugin Ecosystem (工具生态)"
        p_rd[研发类插件]
        p_qa[测试/QA类插件]
        p_util[通用工具类插件]
    end

    User --> GUI
    GUI --> PluginLoader
    PluginLoader --> p_rd & p_qa & p_util
    
    AutoEngine -->|Execute Action| p_rd
    AutoEngine -->|Execute Action| p_qa
    AutoEngine -->|Execute Action| p_util
```

### Tier 1: Nexus Host (平台宿主)
*   **职责**: 负责生命周期管理、界面框架渲染、插件加载与卸载。
*   **技术栈**: React (Frontend) + Python (Backend Adapter).
*   **能力**:
    *   **Marketplace**: 扫描本地/远程仓库，安装/更新/删除插件 (`.whl` 或 `.zip`).
    *   **Routing**: 根据插件配置，动态生成左侧菜单栏和路由。

### Tier 2: Core Services (核心服务)
这里是“重量级程序”的归宿。它们不是具体业务，而是赋能业务的引擎。

*   **🚀 Automation Engine (自动化引擎)**:
    *   **定位**: 系统的中枢神经。
    *   **职责**: 这里不写具体的测试用例，它只负责**执行**用例。
    *   **机制**: 它是一个“任务调度器”。它读取 XML/YAML/JSON 格式的测试流程定义，然后通过 EventBus 指挥各个插件干活。
    *   *Example*: "Step 1: 调用[常用工具-Web Server]启动服务; Step 2: 调用[研发-Iperf]开始打流; Step 3: 调用[测试-抓包]记录数据。"
*   **Visualization Engine (可视化引擎)**:
    *   提供一套标准的绘图协议。插件只需返回数据配置，引擎负责画出专业的时序图、频谱图。

### Tier 3: Plugin Ecosystem (插件生态)
根据您的需求，我们将插件分为三类。每个插件是一个独立的 Python Package，拥有独立的 `plugin.yaml` 描述文件。

#### Type A: 研发深度分析类 (Deep Analysis)
*   **特征**: 计算密集，需要复杂的自定义绘图。
*   **示例**: `nexus-plugin-rtp` (RTP分析), `nexus-plugin-algo-eval` (算法评估).
*   **形态**: 提供一个 CLI 入口和一个 React 组件页面（用于展示复杂报告）。

#### Type B: 测试与监控类 (QA & Monitor)
*   **特征**: 流程密集，IO 密集，强调实时面板。
*   **示例**: `nexus-plugin-topology` (拓扑发现), `nexus-plugin-channel-qoe` (信道质量看板).
*   **形态**: 深度集成 Automation Engine。它的主要产出是 Dashboards (BI 看板)。

#### Type C: 通用工具类 (Utilities)
*   **特征**: 简单，独立，往往作为后台服务存在。
*   **示例**: `nexus-plugin-server-ftp`, `nexus-plugin-serial`.
*   **形态**: 往往只有一个开关按钮（Start/Stop）和一个日志窗口。

## 3. Automation 的处理方案

**Automation 不再只是一个“程序”，而是一套“语言”**。

1.  **Action Registry (动作注册表)**:
    *   每个插件在启动时，必须向 Automation Engine 注册自己能干什么。
    *   *例*: FTP 插件注册 `ftp.start`, `ftp.stop`。Iperf 插件注册 `iperf.run`。

2.  **Task Flow (任务流)**:
    *   用户（或上层业务）编写 YAML 流程文件。
    *   Automation Engine 解析 YAML，按顺序调度插件。

此时，**"GUI 自动化工具"** 本身变成了一个 **Type B 插件** (`nexus-plugin-automation-studio`)，它提供一个图形化界面让用户拖拽生成上述的 YAML 文件。

## 4. 插件技术规范 (Plugin Protocol)

一个合法的 Nexus 插件结构如下：

```text
nexus-plugin-demo/
├── plugin.yaml          # 元数据 (名称, 版本, 依赖, 菜单位置)
├── backend/
│   ├── __init__.py      # Python 入口
│   ├── actions.py       # 暴露给 Automation 的动作
│   └── logic.py         # 业务逻辑
└── frontend/            # (可选) 前端组件
    ├── index.tsx        # React 入口
    └── panel.tsx
```

## 5. 迁移演进路线 v3.0

### Phase 1: 核心剥离 (Kernel Extraction)
1.  **建立 `nexus-sdk`**: 定义插件基类、通信协议。
2.  **重构 Host**: 将 `nexus-platform` 改造为支持动态加载 `backend/plugins/` 目录下模块的加载器。

### Phase 2: Automation 服务化
1.  将现有的 `automation` 模块提炼为核心服务。
2.  设计 `Action 注册机制`。

### Phase 3: 插件拆解 (Plugin Splitting)
1.  **Type C 先行**: 将简单的功能（如果有的话）拆解为独立插件验证架构。
2.  **Type A 跟进**: 将 RTP, Trace 分析拆解为插件。
3.  **Type B 落地**: 构建 BI 看板插件。

---
**总结**: 您想要的“独立安装包”通过 Python 的 `pip` (后端) + 动态 import 机制实现；“功能去除”如果不安装对应插件包，平台就不加载对应菜单；“研发/测试/通用”三种分类由插件的元数据决定其在 UI 上的展示位置。
