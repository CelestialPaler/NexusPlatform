---
uuid: 20260126-PLAN-PHASE1
created: 2026-01-26
updated: 2026-01-26
type: plan
tags: [计划, Phase1, 基础建设, 契约先行]
status: Active
---

# Nexus 开发计划 Phase 1: 筑基与可用性 (Foundation & Usability)

> **战略目标**: 建立 SDK 标准，实现工具的插件化开发与直连运行。确保所有工具 "Blueprint Ready"，优先交付“可用”的独立工具集。

## 1. 核心任务分解 (Work Breakdown)

### 1.1 基础设施层 (Infrastructure)
*   [ ] **Nexus SDK (`nexus-sdk`)**: 
    *   定义核心数据类型 (`NXPath`, `NXTable`, `NXReport`).
    *   **实现 `@nexus_tool` 装饰器**: 用于标注函数的输入输出（这就是未来的蓝图节点定义，现在用于生成 GUI 表单）。
    *   实现插件基类与加载协议。
*   [ ] **Nexus Host Core**:
    *   **Plugin Loader**: 实现对 `.whl` 或源码目录的插件扫描与加载。
    *   **Direct Runner**: 一个简单的执行器，不经过 DAG 调度，直接 `输入参数 -> 调用函数 -> 展示结果`。

### 1.2 高优先级工具模组 (Priority Plugins)
我们将现有的混乱脚本重构为标准插件，验证 SDK 的合理性。

*   [ ] **基础工具包 (`nexus-plugin-basic`)**:
    *   **iPerf3 Wrapper**: 封装 iPerf3，支持 Server/Client 模式。
    *   **Ping/Latency**: 简单的网络延迟探测。
*   [ ] **核心分析包 (`nexus-plugin-analyzer`)**:
    *   **RTP Analysis**: 从现有代码迁移，移除 Flask 依赖，纯算法化。
    *   **PCAP Parser**: 基于 TShark/Scapy 的标准解析器。

### 1.3 平台交互层 (Nexus Platform GUI)
*   [ ] **动态菜单系统**: 根据加载的插件，自动生成左侧导航栏。
*   [ ] **自动表单引擎 (Auto-Form)**: 
    *   读取插件的 `@nexus_tool` 定义（例如 `target_ip: str`）。
    *   自动渲染为 React 表单（文本框、文件选择器）。
*   [ ] **结果查看器**:
    *   如果插件返回 `NXTable`，自动显示为 AntD Table。
    *   如果插件返回 `NXImage`，自动显示图片。

## 2. 实施步骤 (Execution Steps)

### Step 1: SDK 定义 (Days 1-3)
*   **目标**: 确定“法律条文”。
*   **动作**: 创建 `Arsenal/30-零部件/nexus-sdk` 项目。
*   **产出**: 安装包 `nexus-sdk-0.1.0`，包含类型定义和装饰器。

### Step 2: 样板房搭建 (Days 4-7)
*   **目标**: 验证“法律条文”是否可行。
*   **动作**: 
    1.  创建 `Arsenal/30-零部件/nexus-plugin-demo`。
    2.  编写一个简单的 "Hello World" 工具（例如计算 MD5）。
    3.  在 Nexus Host 中尝试加载它，看能不能自动生成界面并运行。

### Step 3: 核心资产迁移 (Days 8-14)
*   **目标**: 将现有 RTP/BA 分析工具“洗白”为插件。
*   **动作**: 
    *   重构 `rtp_analysis.py`，引用 `nexus-sdk`。
    *   确保不仅可以通过 Platform 运行，也可以直接在命令行运行 (`python -m nexus_plugin_analyzer.rtp ...`)。

## 3. 架构收益 (Benefits)
1.  **零技术负债**: 虽然没有蓝图引擎，但所有工具都按“蓝图节点”的标准写好了 Input/Output。未来蓝图系统上线，这些工具**一行代码都不用改**就能直接拖进画布。
2.  **立即通过验收**: 即使不做蓝图，现在的 Nexus 也是一个功能强大的“工具箱平台”，研发和测试部门马上就能用起来。
