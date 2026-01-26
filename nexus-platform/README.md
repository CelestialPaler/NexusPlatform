# 网络分析平台 (Network Analysis Platform)

这是一个综合性的网络分析与性能测试工具，采用 React 前端与 Python 后端架构。**新增 GUI 自动化控制模块，支持对外部应用程序的联动控制。**

## 项目结构

- `backend/`: Python 后端应用逻辑。
- `frontend/`: React 前端源代码。
- `dist/`: 编译后的前端资源。
- `scripts/`: 构建、测试与运行脚本库。
- `tools/`: 外部工具 (如 iPerf, Ping)。
- `data/`: 数据存储 (测试结果, 日志)。
- `config/`: 配置文件。
- `docs/`: 项目文档与规范。

## 环境要求

- Python 3.12+
- Node.js 18+ (用于前端开发，请确保已添加到系统 PATH 环境变量)

## 快速启动 (Quick Start)

我们提供了致力于“熵减”的自动化脚本，一键完成环境检查、依赖安装、编译与启动。

### 1. Windows (PowerShell) - 推荐
**启动应用**:
```powershell
.\scripts\build_and_run.ps1
```

**仅编译**:
```powershell
.\scripts\build.ps1
```

### 2. Linux / macOS / Git Bash
```bash
./scripts/build.sh
```

## 手动安装指南 (Manual Installation)

如果您需要手动分步安装：

1.  创建并激活虚拟环境:
    - **Windows (PowerShell)**:
      ```powershell
      python -m venv .venv
      .\.venv\Scripts\Activate.ps1
      ```
    - **Windows (Git Bash)**:
      ```bash
      python -m venv .venv
      source .venv/Scripts/activate
      ```
    - **Linux/macOS**:
      ```bash
      python3 -m venv .venv
      source .venv/bin/activate
      ```

2.  安装 Python 依赖:
    ```bash
    pip install -r requirements.txt
    ```

3.  (可选) 编译前端:
    ```bash
    cd frontend
    npm install
    npm run build
    ```

## 使用方法

运行应用程序:
```bash
python run.py
```

## 功能特性 (Features)

### 1. 核心工具 (Tools)
- **Wireless Capture (无线抓包)**: [NEW]
  - **远程 SSH**: 连接嵌入式设备 (tcpdump) 进行远程抓包。
  - **一键配置**: 动态切换信道 (Channel)、频宽 (BW)、模式 (Managed/Monitor)。
  - **实时反馈**: 实时显示抓包时长与文件大小。
- **iPerf 流量生成**: 集成 iPerf3 进行带宽测试，支持实时图表。
- **Ping / Advanced Ping**: 
  - 基础连通性检测。
  - **高级分析**: 时序图、抖动分析 (Jitter)、CDF 曲线及 P99 统计。
- **RTP 分析**: 针对流媒体/VoIP 的 RTP 包分析。

### 2. 自动化 (Automation)
- **网络拓扑可视化**: 节点编辑与连接管理。
- **Python 脚本引擎**: 内置脚本执行与任务调度。

## 开发文档

请参考 `docs/standards/` 目录下的规范文档：
- [架构设计 (Architecture)](docs/standards/ARCHITECTURE.md)
- [编程规范 (Coding Guide)](docs/standards/CODING_GUIDE.md)
- [版本管理 (Version Control)](docs/standards/VERSION_CONTROL.md)
- [Copilot 指引 (AI Instructions)](docs/standards/COPILOT_INSTRUCTIONS.md)
