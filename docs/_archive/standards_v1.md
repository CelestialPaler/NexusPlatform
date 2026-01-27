---
uuid: 20260126-SPEC-NEXUS-DEV
created: 2026-01-26
updated: 2026-01-26
type: spec
tags: [规范, 开发, Nexus, Python, 协议]
status: Draft
---

# Nexus 开发者标准 v1.0：模块规范与数据协议

> **版本**: 1.0
> **适用**: 所有接入 Nexus Platform v5.0+ 的 Python 工具模组
> **目标**: 确保任意两个由不同开发者编写的工具，不仅风格统一，更能通过蓝图系统无缝交换数据。

## 1. 编程规范 (Coding Standards)

所有模组代码必须通过 `ruff` 或 `flake8` 检查，并遵循以下核心原则。

### 1.1 风格与类型 (Style & Typing)
*   **PEP 8**: 严格遵守 Python 代码风格指南。
*   **Type Hints (强制)**: 所有的函数入参和返回值必须标注类型。这是蓝图系统能正确连线的基础。
    ```python
    # ✅ Good
    def analyze_rtp(pcap_path: Path, jitter_threshold: float = 30.0) -> AnalysisResult: ...
    
    # ❌ Bad
    def analyze_rtp(path, threshold): ...
    ```
*   **Docstrings**: 使用 Google Style Docstrings，清晰描述参数含义。

### 1.2 异常处理 (Error Handling)
*   **严禁直接 Crash**: 任何工具内部的错误必须捕获，并抛出 `NexusPluginError` 或其子类。
*   **结构化错误**: 错误信息应包含 `code` (错误码) 和 `message` (用户可读信息)。

## 2. 模组设计规范 (Module Structure)

一个标准的 Nexus 工具模组就是一个标准的 Python Package，但需要包含特定的元数据。

### 2.1 目录结构
```text
nexus-plugin-example/
├── pyproject.toml       # 构建配置 & 依赖声明
├── plugin.yaml          # Nexus 专用元数据
├── src/
│   └── nexus_plugin_example/
│       ├── __init__.py  # 暴露 Plugin 类
│       ├── core.py      # 核心逻辑 (纯 Python, 无 GUI 依赖)
│       └── nodes.py     # 蓝图节点定义 (Input/Output 映射)
├── tests/               # 单元测试
└── README.md            # 使用说明
```

### 2.2 元数据 (`plugin.yaml`)
```yaml
id: "nexus.tools.rtp_analyzer"
name: "RTP Protocol Analyzer"
version: "1.2.0"
author: "Network Team"
category: "Protocol"
description: "Analyzes RTP streams for jitter and packet loss."
dependencies:
  system: ["tshark>=3.0"]  # 系统级依赖
  python: ["pandas>=1.3", "scapy"]
```

## 3. 统一数据交换协议 (Data Exchange Protocol, NDXP)

这是蓝图“连线”成功的关键。所有工具的 Input/Output 必须基于以下标准类型。

### 3.1 核心数据类型 (Core Types)
Nexus SDK (`nexus.core.types`) 提供以下标准封装：

| 类型名       | Python 类型        | 说明                                          | 序列化格式    |
| :----------- | :----------------- | :-------------------------------------------- | :------------ |
| **NXPath**   | `pathlib.Path`     | 文件绝对路径 (如 PCAP 文件)。大文件仅传路径。 | String        |
| **NXTable**  | `pandas.DataFrame` | 表格数据 (如 10万行抓包记录)。                | Parquet/Arrow |
| **NXImage**  | `bytes` / `Path`   | 图片/图表 (如拓扑图)。                        | Base64/PNG    |
| **NXSignal** | `np.ndarray`       | 信号/波形数据 (如 CSI 数据)。                 | Numpy Binary  |
| **NXReport** | `Dict[str, Any]`   | 结构化报告 (用于最终展示)。                   | JSON          |

### 3.2 自定义数据 (Custom Data)
如果模组间需要传递复杂对象（比如 `RTPStream` 对象），该对象必须实现 `NXSerializable` 接口：
```python
class RTPStream(NXSerializable):
    def to_dict(self) -> dict: ...
    @classmethod
    def from_dict(cls, data: dict): ...
```

## 4. 节点交互契约 (Node Contract)

在 `nodes.py` 中，开发者通过装饰器将 Python 函数注册为蓝图节点。

### 4.1 节点定义示例
```python
from nexus.sdk.decorators import nexus_node
from nexus.sdk.types import NXPath, NXTable

@nexus_node(
    id="analyze_jitter",
    inputs={
        "source_pcap": NXPath, 
        "ssrc_filter": str
    },
    outputs={
        "jitter_data": NXTable,
        "summary": dict
    }
)
def run_analysis(source_pcap: Path, ssrc_filter: str) -> dict:
    # 1. 接收输入: source_pcap 自动转换为 Path 对象
    # 2. 调用核心逻辑
    df, meta = core.calculate_jitter(source_pcap, ssrc_filter)
    
    # 3. 返回输出: 必须严格匹配 outputs 定义的 Key
    return {
        "jitter_data": df,
        "summary": meta
    }
```

### 4.2 运行时校验
Nexus Host 会在运行时拦截数据流：
1.  **Type Check**: 检查上游输出类型是否匹配下游输入类型（如: 不能把 `NXTable` 连给需要 `NXPath` 的节点）。
2.  **Validation**: 检查文件是否存在，数值是否越界。

## 5. 日志与监控规范
*   **Log**: 使用 `logging.getLogger("nexus.plugin.{id}")`。
*   **Progress**: 耗时任务必须通过 `ctx.report_progress(50, "Processing frame 100...")` 回调平台，以便 UI 显示进度条。
