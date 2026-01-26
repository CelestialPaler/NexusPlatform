# 架构设计文档 (Architecture Design)

## 1. 系统概览

本系统是一个基于 **Python (pywebview)** 和 **React** 的混合桌面应用程序，旨在提供专业的网络分析与性能测试功能。

### 核心技术栈
- **前端**: React 18, Vite, TailwindCSS, Recharts, Lucide React
- **后端**: Python 3.12, pywebview (GUI 桥接), subprocess (工具调用)
- **通信机制**: `pywebview.api` (JS 调用 Python) 和 `window.dispatchEvent` (Python 推送事件到 JS)

## 2. 架构图

```mermaid
graph TD
    User[用户] --> GUI[React 前端界面]
    GUI -- "API 调用 (run_iperf, run_ping)" --> Bridge[pywebview JS API]
    Bridge -- "Python 方法" --> Backend[Python 后端 (app.py)]
    
    Backend -- "subprocess" --> Tools[外部工具 (iPerf3, Ping)]
    Tools -- "stdout/stderr" --> Backend
    
    Backend -- "Event (ping-data, iperf-log)" --> Bridge
    Bridge -- "window.dispatchEvent" --> GUI
    
    GUI -- "实时渲染" --> Charts[Recharts 图表]
```

## 3. 模块设计

### 3.1 前端 (Frontend)
- **入口**: `src/main.jsx` (移除 StrictMode 以避免双重渲染)
- **路由/导航**: `App.jsx` 使用状态管理 `activeTab` 进行视图切换。
- **国际化**: 使用 `translations.js` 管理中英文字典，支持动态语言切换。
- **组件**:
  - `Dashboard`: 概览面板。
  - `ToolsPanel`: 工具选择入口。
  - `IperfPanel`: iPerf 专用控制与展示面板。
  - `PingPanel`: 基础 Ping 工具。
  - `AdvancedPingPanel`: 高级 Ping 分析工具 (含统计与分布图)。
  - `NodeEditor`: 网络拓扑编辑器。

### 3.2 后端 (Backend)
- **入口**: `run.py` (启动 pywebview)。
- **核心逻辑**: `backend/app.py` (`Api` 类)。
- **并发模型**:
  - 每个耗时任务 (iPerf, Ping) 在独立的 `threading.Thread` 中运行。
  - 使用 `subprocess.Popen` 调用系统命令。
  - 通过 `iter(process.stdout.readline, '')` 实现实时日志流读取。

### 3.3 数据流 (Data Flow)
1.  **命令下发**: 前端调用 `window.pywebview.api.run_task(config)`。
2.  **任务执行**: 后端启动子进程，返回 `task_id`。
3.  **实时反馈**: 后端线程读取子进程输出，解析关键数据 (如带宽、延迟)。
4.  **事件推送**: 后端通过 `window.evaluate_js` 触发前端自定义事件 (`CustomEvent`)。
5.  **状态更新**: 前端监听事件，更新 React State (`logs`, `chartData`)。

## 4. 目录规范

- `backend/`: 存放 Python 源码。
- `frontend/src/components/`: 存放 React 组件，按功能命名。
- `tools/`: 存放第三方可执行文件 (需区分 OS 版本)。
- `data/results/`: 存放测试报告 (JSON 格式)。
