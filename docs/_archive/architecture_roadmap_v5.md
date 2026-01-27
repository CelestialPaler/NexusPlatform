---
uuid: 20260126-ARCH-NEXUS-V5
created: 2026-01-26
updated: 2026-01-26
type: doc
tags: [架构, 规划, Nexus, 模组化, 蓝图系统]
status: Final
---

# Nexus Platform 架构演进与重构路线图 v5.0 (全模组化蓝图版)

> **版本**: 5.0
> **目标**: 构建一个**完全模组化**的操作系统级平台。以**蓝图系统**和**GUI自动化**为核心基础模组，以**工具插件**为可插拔能力，实现无限扩展的工具编排能力。

## 1. 核心设计哲学 (Core Philosophy)

1.  **完全模组化 (Total Modularity)**: 
    *   Nexus 本身只是一个空壳（Host）。
    *   **能力即模组**: 无论是核心的流程控制，还是具体的协议分析，全部封装为模组。
    *   **热插拔**: 所有工具模块支持按需安装/卸载/更新，不影响平台主体。

2.  **蓝图即代码 (Blueprint as Logic)**: 
    *   蓝图系统不仅仅是连线，它包含完整的图灵完备逻辑（变量、判断、循环）。
    *   蓝图文件定义了业务逻辑，它对环境有**依赖声明**。

3.  **依赖管理 (Dependency Governance)**: 
    *   蓝图在运行前，必须校验其依赖的“工具模组”是否已安装及其版本是否匹配。

## 2. 总体架构：星系模型 (Galaxy Architecture)

我们将系统视为一个星系，中央是恒星（基础服务），周围环绕着行星（工具模组）。

```mermaid
graph TD
    subgraph "Core: Nexus Host (恒星/微内核)"
        Kernel[Plugin Loader & LifeCycle Mgr]
        Marketplace[Extension Center / Tools Mgr]
        Security[Permission & Isolation]
    end

    subgraph "Foundation Modules (核心主要模组)"
        BP_Sys[🎨 Blueprint System<br/>(Vars, Conditions, Loops)]
        GUI_Auto[🤖 UI Automation Core<br/>(Computer Vision, Control)]
        Data_Hub[📊 Data Visualization & Bus]
    end

    subgraph "Extension Modules (工具模组/行星)"
        Tool_Net[📦 Network Tools<br/>(Iperf, Ping, TShark)]
        Tool_Proto[📦 Protocol Analyzers<br/>(RTP, Modbus, 802.11)]
        Tool_Util[📦 Utility Kit<br/>(Web Srv, Serial, FTP)]
    end

    User --> Kernel
    Kernel --> BP_Sys
    Kernel --> GUI_Auto
    
    BP_Sys -->|Orchestrate| Tool_Net
    BP_Sys -->|Orchestrate| Tool_Proto
    
    Marketplace -->|Install/Uninstall| Tool_Net
    Marketplace -->|Install/Uninstall| Tool_Proto
    Marketplace -->|Install/Uninstall| Tool_Util
```

## 3. 核心基础模组 (Foundation Modules)

这是 Nexus 出厂自带的“两大护法”，提供平台级能力。

### 3.1 🎨 蓝图系统 (Blueprint System)
这是一个强大的可视化逻辑编排引擎。它远不止“A -> B”这么简单。

*   **逻辑节点 (Logic Nodes)**:
    *   `Set Variable`: 设置局部/全局变量 (如 `TargetIP = 192.168.1.1`).
    *   `Branch (If/Else)`: 条件判断 (如 `Wait for Ping Result == Success`).
    *   `Loop (For/While)`: 循环执行 (如 `Run Iperf 10 times`).
    *   `Compare`: 数值比较, 字符串匹配.
*   **依赖管理 (Dependency Check)**:
    *   每个 `.blueprint` 文件包含 Header 元数据：
        ```yaml
        requires:
          - module: "nexus.tools.network"
            version: ">=1.2.0"
          - module: "nexus.tools.rtp"
            version: "*"
        ```
    *   导入蓝图时，系统自动检查当前环境是否满足，若不满足则提示一键安装。

### 3.2 🤖 GUI 自动化核心 (UI Automation Core)
这是一个通用的视觉与控制服务。

*   **能力**:
    *   **对象识别**: 基于 OpenCV/YOLO 的屏幕元素识别。
    *   **HID 模拟**: 键盘鼠标输入模拟。
*   **服务化**: 它不直接跑脚本，而是提供 API 供 Blueprint 调用 (Node: `Click Image`, Node: `Type Text`).

## 4. 扩展工具模组 (Extension Modules)

这是用户在“工具管理界面”中看到的列表。每个模组包含：
*   **Manifest**: `plugin.yaml` (定义名称、版本、依赖)。
*   **Nodes**: 暴露给蓝图的节点集合。
*   **GUI**: (可选) 独立的交互界面。

### 场景示例
1.  **研发专用包**: 安装 `Protocol Analyzer Pack`, `Algo Evaluation Pack`.
2.  **现场支持包**: 安装 `Network Topology`, `Wifi Channel Monitor`.
3.  **通用工具包**: 安装 `FTP Server`, `Serial Tool`, `Telnet Client`.

## 5. 交互流程设计

### 5.1 工具管理 (Tool Management)
*   **统一界面**: "Extension Store" (扩展商店)。
*   **操作**:
    *   列出已安装模组 (Enabled/Disabled).
    *   检查更新 (Check Updates).
    *   浏览线上仓库/本地加载 `.nx_plugin` 包。

### 5.2 蓝图执行 (Blueprint Execution)
1.  用户打开 `Stability_Test.blueprint`.
2.  **环境自检**: 系统警告 "此蓝图需要 `nexus.tools.traffic_gen` 但未安装"。
3.  **自动修复**: 用户点击 "Install Missing Dependencies"。
4.  **执行**: 
    *   Step 1: 蓝图节点 `Set Var: LoopCount = 5`.
    *   Step 2: 蓝图节点 `Loop Start`.
    *   Step 3: 调用模组 `Wifi Channel Monitor` -> 获取当前信道质量.
    *   Step 4: 逻辑节点 `If Quality < 50` -> 调用模组 `Serial Tool` -> 发送 `reboot`.
    *   Step 5: `Loop End`.

## 6. 演进路线 v5.0 (Roadmap)

### Phase 1: 内核与基础 (Kernel & Foundation)
1.  **Host 重构**: 实现支持版本管理的 `Plugin System`.
2.  **Blueprint 0.1**: 实现基础 DAG 执行 + 简单的变量支持。

### Phase 2: 工具标准化 (Standardization)
1.  **Wrapper**: 将现有的 Python 脚本封装为标准 `Extension Module`.
2.  **Manifest**: 为每个工具定义 `plugin.yaml`。

### Phase 3: 逻辑增强 (Logic Enhancement)
1.  **Blueprint 1.0**: 加入 If/Else, Loop 等高级逻辑节点。
2.  **Store**: 开发“扩展商店”界面用于管理本地/远程模组。

### Phase 4: 生态完善 (Ecosystem)
1.  实现蓝图文件的**依赖自动解析与安装引导**。
