---
uuid: 20260126-ARCH-NEXUS-V4
created: 2026-01-25
updated: 2026-01-26
type: doc
tags: [架构, 规划, Nexus, 插件化, Automation, 蓝图系统]
status: Draft
---

# Nexus Platform 架构演进与重构路线图 v4.0 (蓝图节点版)

> **版本**: 4.0
> **目标**: 引入可视化**节点蓝图系统 (Blueprint System)**，实现工具链的可视化编排与数据流驱动。

## 1. 核心哲学 (Philosophy)

1.  **微内核 (Microkernel)**: 平台核心只提供“插座”和“总线”。
2.  **万物皆节点 (Everything is a Node)**: 每个工具插件不仅仅是菜单项，更是一个可被编排的逻辑节点（Block）。
3.  **数据流驱动 (Dataflow Driven)**: 通过连接节点的输入输出端口（Pins），定义数据如何在工具间流动。

## 2. 总体架构图 (Architecture Diagram)

```mermaid
graph TD
    User((用户))
    
    subgraph "Tier 1: Nexus Host (平台宿主)"
        GUI[Web Shell]
        BlueprintEditor[🎨 Blueprint Editor (React Flow)]
        PluginLoader[Plugin Manager]
    end

    subgraph "Tier 2: Core Services (核心服务)"
        DAGEngine[🕸️ Blueprint Engine (DAG Scheduler)]
        DataBus[Data Exchange Bus / Shared Memory]
    end

    subgraph "Tier 3: Plugin Ecosystem (工具节点)"
        p_cap[节点: 抓包工具]
        p_rtp[节点: RTP分析]
        p_ba[节点: BA分析]
        p_rpt[节点: 报告生成]
    end

    User --> BlueprintEditor
    BlueprintEditor -->|JSON Graph| DAGEngine
    
    DAGEngine -->|Execute| p_cap
    p_cap -->|PCAP File| DataBus
    DataBus -->|PCAP File| p_rtp & p_ba
    
    p_rtp -->|Metrics| DataBus
    p_ba -->|Metrics| DataBus
    
    DataBus -->|All Metrics| p_rpt
```

## 3. 核心特性: 节点蓝图系统 (Blueprint System)

这是 Nexus 的灵魂所在，类似 Unreal Engine Blueprints 或 ComfyUI。

### 3.1 蓝图编辑器 (The Editor)
*   **技术选型**: React Flow 或 AntV X6。
*   **交互**: 
    *   左侧是从插件加载的“工具节点库”。
    *   中间是画布，用户拖拽节点，连线。
    *   右侧是选中节点的参数配置面板（Properties）。

### 3.2 节点协议 (Node Protocol)
每个插件必须在 `plugin.yaml` 或代码装饰器中严格定义自己的 I/O 契约。

**示例定义 (Python Decorator):**

```python
@nexus_node(
    category="Analysis",
    label="RTP Analyzer",
    icon="chart-line"
)
class RTPNode(BaseNode):
    # 定义输入端口 (Pin)
    inputs = {
        "pcap_path": InputType.FILE_PATH,
        "rtp_port": InputType.INTEGER(default=5004)
    }
    
    # 定义输出端口 (Pin)
    outputs = {
        "jitter_chart": OutputType.JSON,
        "loss_rate": OutputType.FLOAT,
        "report_data": OutputType.DATAFRAME
    }

    def execute(self, inputs):
        # 业务逻辑...
        return results
```

### 3.3 执行引擎 (The Engine)
*   **模型**: DAG (Directed Acyclic Graph) 有向无环图。
*   **调度**:
    *   **拓扑排序**: 解析蓝图，确定执行顺序（谁先谁后）。
    *   **并发执行**: 能够识别并行的分支（例如：抓包完成后，RTP分析和BA分析可以同时跑）。
    *   **数据透传**: 负责将上一个节点的 Output 搬运给下一个节点的 Input。对于大文件（如 10GB PCAP），只传递文件路径而非内容。

## 4. 典型场景：全流程自动化 (The Pipeline)

您描述的场景将完美适配此架构：

1.  **Node A (Producer)**: **[全能抓包工具]**
    *   *Input*: 网卡ID, 抓包时长(60s)
    *   *Output*: `capture.pcap` (FilePath)
    
2.  **Node B, C, D (Consumers/Processors)**: 
    *   **[RTP 分析器]** <- 连线 <- `capture.pcap`
    *   **[TCP 吞吐分析]** <- 连线 <- `capture.pcap`
    *   **[网络拓扑绘制]** <- 连线 <- `capture.pcap`
    
3.  **Node E (Aggregator)**: **[统一报告生成器]**
    *   *Input 1*: RTP Result (JSON)
    *   *Input 2*: TCP Result (JSON)
    *   *Input 3*: Topology Image (PNG)
    *   *Output*: Final_Report.pdf

## 5. 插件生态分级 v4.0

*   **Atomic Nodes (原子节点)**: 只做一件事，输入输出极其纯粹（如：计算MD5，格式转换）。
*   **Composite Nodes (复合节点/子图)**: 由其他节点组合而成的“黑盒”，简化视觉复杂度。
*   **Interactive Nodes (交互节点)**: 运行时会弹出 UI 请求用户确认（如：人工判定 Pass/Fail）。

## 6. 迁移路线修正

1.  **Phase 1: Core Adaptation**: 所有的 Core 工具（原 `nexus-core`）必须补充 I/O 描述元数据，使其能被包装为 Node。
2.  **Phase 2: Graph Engine**: 开发后端的 DAG 调度器。
3.  **Phase 3: Visual Editor**: 开发前端的蓝图编辑器。
4.  **Phase 4: Ecosystem**: 将现有的分析脚本全面封装为 Nodes。
