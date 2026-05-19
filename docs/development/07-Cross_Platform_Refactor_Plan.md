# Nexus 跨平台重构方案

> 文档状态: Draft
> 目标读者: 项目 Owner、平台开发者、GUI 开发者
> 适用范围: `nexus-platform`、`nexus-core`

## 1. 背景

Nexus 当前是在 Windows 环境中持续迭代出来的桌面应用，已经具备较完整的前后端结构，但平台边界没有收住。部分 Windows 专属能力已经进入应用启动主链，导致项目虽然在文档中声明兼容 macOS 和 Linux，实际上并不具备稳定的跨平台启动能力。

当前最直接的问题不是某一个工具不能运行，而是应用壳层和平台专属实现耦合过深，导致非 Windows 平台在依赖安装、模块导入、窗口初始化三个阶段都可能失败。

这份文档的目标不是一次性解决所有跨平台问题，而是定义一条可执行的重构路线，先让 Nexus 在 macOS 上稳定亮出 GUI 首页，再逐步恢复真正值得跨平台保留的能力。

## 2. 目标与非目标

### 2.1 第一阶段目标

第一阶段只追求以下结果：

1. macOS 可以完成 Python 依赖安装和前端构建。
2. `python run.py` 可以启动主窗口并进入 Nexus 首页。
3. Settings、Tools 首页、基础版本信息等通用界面可正常显示。
4. Windows 强绑定功能不会阻塞应用启动。
5. Automation 等暂不支持的功能在 macOS/Linux 上隐藏或降级，而不是报错崩溃。

### 2.2 非目标

第一阶段不处理以下内容：

1. 不要求 Automation 在 macOS/Linux 上可用。
2. 不要求所有工具在三个平台上行为完全一致。
3. 不要求立即打通 macOS `.app` 打包与签名流程。
4. 不在本阶段重写前端整体交互风格。

## 3. 现状问题

### 3.1 依赖分层缺失

`nexus-platform/requirements.txt` 当前把通用依赖和 Windows 专属依赖混在一起，例如 `pywin32`、`pydirectinput`、`pygetwindow`。这会导致 macOS 在依赖安装阶段直接失败，应用甚至还没有机会进入启动逻辑。

### 3.2 平台专属模块进入启动主链

`nexus-platform/backend/app.py` 在 `Api` 初始化时直接创建 `AutomationManager`。而 `backend/managers/automation.py`、`backend/automation/action_engine.py`、`backend/automation/visualizer.py` 等模块含有顶层 Win32 导入。这意味着当前的问题不是 Automation 页面不能用，而是整个应用会被 Automation 模块拖死。

### 3.3 前端能力开关缺失

`frontend/src/App.jsx` 默认把 Automation 作为主导航的一部分渲染。前端目前没有能力感知机制，无法根据运行平台决定哪些页面应该显示、哪些页面应该隐藏、哪些功能应该标记为受限。

### 3.4 窗口壳层和 Windows 装饰层混杂

`run.py` 和 `backend/app.py` 中同时存在通用窗口逻辑和 Windows 专属窗口修饰逻辑，例如：

1. DPI Awareness
2. Win11 全屏样式修正
3. 无边框标题栏行为
4. 管理员提权

这些逻辑不应进入跨平台壳层的默认路径。

## 4. 设计原则

### 4.1 先保证可启动，再恢复能力

跨平台改造的第一目标是把应用壳稳定跑起来，而不是在同一阶段追求全部功能可用。

### 4.2 共性上提，差异下沉

共性逻辑应进入统一的 Core 或 Shell 层，平台差异必须下沉到适配层，不能分散在页面组件、管理器和入口脚本各处。

### 4.3 功能按能力声明，不按理想假定

系统不默认认为所有平台都支持所有功能，而是通过显式能力声明告诉前端当前平台支持什么、不支持什么。

### 4.4 禁止平台专属依赖进入导入时执行路径

任何 Windows 专属能力都不能在应用入口的模块导入阶段被触发。平台特化代码只能在平台判断之后再加载。

## 5. 目标架构

建议将 `nexus-platform` 的桌面端结构分成三层。

### 5.1 Core 层

职责：

1. 工具逻辑
2. 数据模型
3. 配置读写
4. 版本信息
5. 通用日志
6. 离线分析与协议处理

这部分不应依赖 Win32、Cocoa、GTK 等平台 API。

### 5.2 Shell 层

职责：

1. pywebview 应用启动
2. 前后端桥接
3. 主窗口创建
4. 前端资源加载
5. 能力查询接口

这一层负责把应用壳拉起来，但不负责实现平台专属增强能力。

### 5.3 Platform Adapter 层

职责：

1. Windows 窗口修饰
2. 管理员提权
3. GUI 自动化
4. 平台权限检查
5. 本地系统集成

这一层必须按平台拆分，至少分成：

1. `windows`
2. `macos`
3. `linux`
4. `noop` 或 `stub`

## 6. 能力模型

后端新增统一能力接口，例如 `get_capabilities()`，返回当前平台和功能可用性。

建议返回结构如下：

```json
{
  "platform": "darwin",
  "features": {
    "automation": false,
    "customWindowChrome": false,
    "adminElevation": false,
    "wirelessCaptureLocalControl": false,
    "wirelessCaptureRemoteControl": true,
    "toolMultiWindow": true
  }
}
```

前端据此决定：

1. 是否显示 Automation Tab
2. 是否启用自定义标题栏
3. 是否显示管理员提权入口
4. 某些工具是否展示为受限模式

## 7. 目录与模块建议

建议新增或整理以下结构。

```text
nexus-platform/
  backend/
    app.py
    capabilities.py
    platform/
      base.py
      windows/
        automation.py
        window_chrome.py
        elevation.py
      macos/
        platform_services.py
      linux/
        platform_services.py
      noop/
        automation.py
        window_chrome.py
        elevation.py
    managers/
      automation_stub.py
      automation.py
```

### 7.1 `backend/capabilities.py`

负责根据 `sys.platform` 和运行环境生成统一能力描述，供 `Api` 暴露给前端。

### 7.2 `backend/managers/automation_stub.py`

提供与 `AutomationManager` 相同的方法签名，但所有方法返回 `unsupported` 或空结果，保证前端调用时不会崩溃。

### 7.3 `backend/platform/*`

放置窗口样式、权限管理、平台特化行为。这样 `app.py` 中就不再需要直接包含大量 Win32 细节。

## 8. 分阶段实施计划

### 8.1 Phase 1: Boot on macOS

目标：让 macOS 能稳定亮出 GUI 首页。

建议动作：

1. 拆分依赖文件，移除通用依赖中的 Windows 专属包。
2. 把 Automation 改为平台选择式加载，在非 Windows 上使用 stub manager。
3. 新增 `get_capabilities()` 接口。
4. 前端根据能力信息隐藏 Automation 和 Windows 特有入口。
5. 非 Windows 平台先禁用自定义标题栏，恢复系统原生标题栏。

验收标准：

1. macOS 上 `pip install` 成功。
2. `npm run build` 成功。
3. `python run.py` 可打开首页。
4. 首页、Settings、Tools 可正常切换。

### 8.2 Phase 2: Shell 与平台层解耦

目标：把平台特化逻辑从 `app.py` 中抽离。

建议动作：

1. 将 Win32 全屏、圆角、DPI 逻辑迁移到 `backend/platform/windows/window_chrome.py`。
2. 将管理员提权逻辑迁移到 `backend/platform/windows/elevation.py`。
3. 将窗口创建参数按能力配置，而不是写死在入口文件中。

验收标准：

1. `app.py` 只保留应用壳职责。
2. 平台差异代码集中在 `backend/platform/`。

### 8.3 Phase 3: 工具按平台恢复

目标：在不破坏启动稳定性的前提下，逐步恢复通用工具。

恢复顺序建议如下：

1. Ping
2. iPerf
3. RTP / BA 离线分析
4. Wireless Capture 的远端控制能力
5. Wireless Capture 的本地控制能力
6. 最后再评估 macOS 自动化

### 8.4 Phase 4: 发布体系整理

目标：建立稳定的多平台构建与发布策略。

建议动作：

1. 开发态采用统一启动器，Shell 和 PowerShell 仅作为薄包装。
2. Windows、macOS、Linux 分别维护各自发布流程。
3. CI 建立三平台矩阵验证。

## 9. 构建与发布策略

### 9.1 开发态构建

建议新增统一的 Python 启动脚本，例如 `scripts/dev.py`，负责：

1. 判断当前平台
2. 安装对应依赖组
3. 构建前端
4. 启动后端

`build.sh` 和 `build_and_run.ps1` 只负责转调这个统一入口，避免脚本逻辑分叉。

### 9.2 发布态构建

建议按平台分别处理：

1. Windows: `.exe`
2. macOS: `.app`
3. Linux: `AppImage` 或压缩包

不建议在当前阶段追求单机交叉打包所有平台产物。

## 10. 测试与验收

建议建立最小 smoke test，按平台执行。

### 10.1 Windows

1. 依赖安装
2. 前端构建
3. 后端导入
4. 主窗口启动
5. Automation 页面仍可正常显示

### 10.2 macOS

1. 依赖安装
2. 前端构建
3. 后端导入
4. 主窗口启动
5. Automation 不显示或显示为 disabled

### 10.3 Linux

1. 依赖安装
2. 前端构建
3. 后端导入
4. 主窗口启动

CI 初期至少要保证下面三件事：

1. `pip install` 成功
2. `npm run build` 成功
3. `import backend.app` 成功

## 11. 风险与约束

### 11.1 pywebview 后端差异

pywebview 在不同平台的窗口后端和依赖要求不同，macOS 与 Linux 需要单独确认本地原生依赖。应用壳层要尽量避免依赖某个平台特定窗口行为。

### 11.2 无边框窗口不是跨平台基础能力

无边框标题栏、自定义拖拽区、全屏修饰属于增强体验，不应成为应用启动前提。

### 11.3 Automation 需要单独定级

Automation 本质上是平台增强模块，不应继续被视为 Nexus 的基础跨平台能力。Windows 可以继续保留完整实现，macOS 和 Linux 后续如果要支持，需要独立评估权限模型和底层实现方式。

## 12. 推荐的第一批改动

若按最小闭环推进，建议优先改动以下内容：

1. `nexus-platform/requirements.txt` 或重构后的依赖文件
2. `nexus-platform/backend/app.py`
3. `nexus-platform/backend/managers/automation.py`
4. `nexus-platform/backend/managers/automation_stub.py`
5. `nexus-platform/backend/capabilities.py`
6. `nexus-platform/frontend/src/App.jsx`
7. `nexus-platform/frontend/src/components/TitleBar.jsx`

第一批改动的验收目标只有一个：在 macOS 上稳定亮出 Nexus GUI 首页，不再让 Windows 专属能力阻断启动。
