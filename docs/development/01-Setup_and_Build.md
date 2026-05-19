# 环境搭建与构建指南

> 文档状态: Draft
> 说明: 本文仍包含历史 Windows / Super Venv 叙述，当前仅作为迁移前参考，正式治理以统一构建入口和治理总纲为准。

> **适用系统**: Windows 10/11
> **命令行**: PowerShell 5.1/7+
> **Python版本**: 3.10+ (由 SuperVenv 托管)

## 环境初始化

我们采用 "Super Venv" 策略以避免 OneDrive 同步冲突并确保环境一致性。

### 首次配置

- **打开 VS Code** 进入工作区根目录。
- 按下 `Ctrl+Shift+P` (命令面板)。
- 输入 `Run Task` 并选择 **`🔧 Reinit Python Environment`**。
    - 该脚本 (`reinit_env.ps1`) 将执行以下操作：
        - 在 `%USERPROFILE%\.venvs\negentropy` 创建虚拟环境。
        - 根据 `requirements.txt` 安装所有依赖。
        - 注册 Jupyter Kernel。

### 前端配置

前端部分需要单独安装依赖。

```powershell
cd nexus-platform/frontend
pnpm install
# 或者
npm install
```

## 运行与调试

我们提供了标准的 VS Code 任务，请尽量避免手动运行命令。

### 标准运行 (Debug 模式)

- **任务名称**: `Nexus: 编译并运行 (Build & Run)`
- **执行动作**: 编译前端资源 -> 启动 Python 后端。
- **适用场景**: 修改了前端代码，需要查看完整效果。

### 快速运行 (仅后端)

- **任务名称**: `Nexus: 仅运行 (Run)`
- **执行动作**: 跳过前端编译 -> 直接启动 Python 后端。
- **适用场景**: 仅修改了 Python 代码 (`.py`)。

### 断点调试

- 打开 VS Code 左侧的 **运行与调试 (Run and Debug)** 面板。
- 选择 **`Debug Nexus Platform (Attach)`** 或 `Launch` 配置。
- 在 `nexus-platform/backend/managers` 或 `nexus-core` 代码中设置断点即可。

## 发布构建

如果需要生成独立的 `.exe` 可执行文件：

- 运行任务: **`Nexus: 构建Release版本 (Output Release)`**。
- 产物位置: `nexus-platform/dist/NexusPlatform.exe`。
- **注意**: 构建使用 `PyInstaller`。如果你添加了新的动态加载插件，可能需要修改 `NexusPlatform.spec` 文件中的 hidden imports 配置。

## 手动指令参考

如果任务执行失败，可在 PowerShell 中手动运行以下指令：

```powershell
# 编译前端
cd nexus-platform/frontend; npm run build; cd ../..

# 启动后端
& "C:\Users\%USERNAME%\.venvs\negentropy\Scripts\python.exe" nexus-platform/run.py
```
