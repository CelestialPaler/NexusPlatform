---
uuid: 20260125-ARCH-NEXUS-V2
created: 2026-01-25
updated: 2026-01-25
type: doc
tags: [架构, 规划, Nexus]
status: Draft
---

# Nexus Platform 架构演进与重构路线图 v2.0

> **版本**: 2.0
> **目标**: 将 Nexus 升级为“Core + Shell”双层架构，实现工具原子化与平台集成化的分离。

## 1. 核心哲学 (Philosophy)

本项目遵循以下 **Unix 哲学** 与软件工程原则：

1.  **单一职责 (Do one thing and do it well)**: 
    *   分析工具只负责分析数据，不关心如何展示。
    *   GUI 平台只负责交互与渲染，不关心底层协议细节。
2.  **高内聚，低耦合**: Core 层与 Platform 层物理隔离，仅通过标准 API 通讯。
3.  **CLI First**: 所有核心功能必须优先支持命令行调用，GUI 只是 CLI 的可视化包装。

## 2. 总体架构设计 (Architecture Overview)

我们将系统划分为两个物理隔离的层级：**内核层 (Nexus Core)** 与 **表现层 (Nexus Platform)**。

```mermaid
graph TD
    User((用户))
    
    subgraph "Shell: Nexus Platform (表现层)"
        GUI[React Frontend]
        Viz[ECharts/Visualization]
        TaskMgr[Task Orchestrator]
        Adapter[Core Python Adapter]
    end

    subgraph "Core: Nexus Toolkit (内核层)"
        CLI[Unified CLI Entry]
        
        subgraph "Modules (Pure Python)"
            RTP[RTP Analyzer]
            BA[BA/QoS Analyzer]
            Iperf[iPerf Wrapper]
            Pinger[Net Pinger]
            PCAP[PCAP Parser]
        end
    end

    User <-->|GUI Interaction| GUI
    User -.->|Command Line| CLI
    
    GUI -->|RPC/Process Call| Adapter
    Adapter -->|Import/Subprocess| CLI
    CLI --> Modules
    
    Modules -->|Structured Data (JSON/DF)| Adapter
    Adapter -->|JSON| GUI
    GUI --> Viz
```

### 2.1 内核层: `nexus-core` (The Engine)
*   **定位**: 原子化的 Python 网络分析工具库。
*   **物理位置**: `Arsenal/30-零部件/nexus-core`
*   **特性**:
    *   **纯粹性**: 严禁引入 `webview`, `flask`, `qt` 等 GUI 依赖。
    *   **独立性**: 每个模块（如 RTP 分析）都必须可独立运行、独立测试。
    *   **标准输入**: 接受 CLI 参数或标准 Python 对象（Dict, Path）。
    *   **标准输出**: 返回结构化数据（JSON, Pandas DataFrame, TypedDict），严禁直接 print 文本（除非是 CLI 模式下的日志）。
*   **构成**:
    *   `nexus.core.protocols`: 协议解析 (RTP, TCP, 802.11)
    *   `nexus.core.tools`: 外部工具封装 (iPerf, Ping, TShark)
    *   `nexus.core.analysis`: 纯算法层 (抖动计算、丢包统计)

### 2.2 表现层: `nexus-platform` (The Cockpit)
*   **定位**: 统一的交互终端与数据可视化平台。
*   **物理位置**: `Arsenal/20-核心项目/nexus-platform`
*   **职责**:
    *   **交互 (UI)**: 提供风格统一的 React 界面，配置参数。
    *   **编排 (Orchestration)**: 管理长时间运行的任务（如 "连续测试 1 小时"），处理进度条、取消操作。
    *   **渲染 (Visualization)**: 将 Core 返回的 JSON 数据渲染为图表、拓扑图。
    *   **持久化 (Storage)**: 管理历史记录、报告导出。
*   **调用方式**: 
    1.  **Library Mode (优选)**: 通过 `import nexus.core` 直接调用 Python 函数（同进程）。
    2.  **CLI Mode (隔离)**: 通过 `subprocess` 调用 `nexus-cli`（子进程，防崩溃）。

## 3. 接口规范 (Interface Specification)

为了确保两层“完全隔离”，必须定义严格的数据交换契约。

### 3.1 核心工具类定义范式
每个核心工具必须继承自基类，实现标准方法：

```python
# nexus-core/interfaces.py (伪代码)

class AnalysisResult(BaseModel):
    """标准返回结构"""
    success: bool
    metrics: Dict[str, Any]  # 关键指标 (用于列表展示)
    data: Optional[pd.DataFrame] # 详细数据 (用于绘图)
    error: Optional[str]

class BaseAnalyzer:
    def run(self, input_file: Path, config: Dict) -> AnalysisResult:
        """核心执行逻辑"""
        pass
        
    def get_cli_arguments(self):
        """定义 CLI 参数"""
        pass
```

### 3.2 平台调用范式
Platform 层不应包含业务逻辑，只能包含**胶水代码**：

```python
# nexus-platform/backend/adapters/rtp_adapter.py

from nexus.core.protocols.rtp import RTPAnalyzer

def run_rtp_analysis_task(filepath):
    # 1. 调用 Core
    analyzer = RTPAnalyzer()
    result = analyzer.run(filepath)
    
    # 2. 转换为前端友好格式
    chart_data = adapt_to_echarts(result.data)
    
    # 3. 返回前端
    return {
        "summary": result.metrics,
        "charts": chart_data
    }
```

## 4. 迁移演进路线 (Migration Roadmap)

### Phase 1: 基础设施建设 (Infrastructure)
1.  [ ] 在 `Arsenal/30-零部件/nexus-core` 初始化标准 Python 包结构。
2.  [ ] 定义 `BaseAnalyzer` 和 `AnalysisResult` 协议。
3.  [ ] 在 `nexus-platform` 中配置 `pyproject.toml` 或 `requirements.txt` 以 Editable Mode 安装 Core (`pip install -e ../../30-零部件/nexus-core`)。

### Phase 2: 模块剥离 (Detachment)
**原则**: 先剥离无状态、纯计算的模块。

1.  **RTP Analysis**: 
    *   将 `backend/rtp_analysis` 移动至 `nexus-core/protocols/rtp`。
    *   剥离其中的 Flask/API 相关代码，只保留解析逻辑。
    *   为移动后的模块编写 `__main__.py` 实现 CLI 调用。
2.  **BA/QoS Analysis**:
    *   同上，将 BA 分析器迁移至 `nexus-core/protocols/80211`。

### Phase 3: 平台重构 (Refactoring)
1.  **后端瘦身**: 删除 `nexus-platform/backend` 中残留的业务逻辑，替换为对 `nexus-core` 的调用。
2.  **CLI 工具链**: 完善 `nexus-core` 的 `cli.py`，确保用户可以通过命令直接使用所有功能。

## 5. 预期收益 (Expected Benefits)

1.  **可测试性**: 核心算法不再依赖 GUI 环境，可以轻松编写单元测试 (PyTest)。
2.  **复用性**: 分析脚本可以被其他自动化系统（如 Jenkins, CI/CD）直接复用。
3.  **稳定性**: GUI 的崩溃不会影响底层分析能力的正确性；底层算法的 bug 修复只需更新 Core 库。
4.  **生态扩展**: 未来可以开发 Web 版前端或 Qt 版前端，只需复用同一个 Core。
