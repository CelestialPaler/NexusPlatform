# Nexus 跨平台构建与第三方依赖治理

> 文档状态: Draft
> 目标读者: 平台开发者、发布维护者、工具链维护者
> 适用范围: `nexus-platform`、`nexus-core`、`tools/`

## 1. 文档目标

这份文档回答三个问题：

1. Nexus 如何产出面向 Windows、macOS、Linux 的桌面发行物。
2. 在现有技术栈下，哪些跨平台构建可以做，哪些不能直接做。
3. 像 `ping`、`iperf`、`tshark`、`tcpdump` 这类第三方程序，应该如何按平台维护和分发。

文档重点不是罗列理论方案，而是结合 Nexus 当前的技术栈和仓库现状，给出后续可以执行的维护策略。

## 2. 当前技术栈与约束

### 2.1 当前桌面形态

Nexus 当前的桌面端结构如下：

1. 前端: React + Vite
2. 桌面壳: pywebview
3. 后端与工具编排: Python
4. 打包方式: PyInstaller

这一组合的特点是：

1. 前端天然跨平台。
2. Python 业务逻辑本身也具备跨平台基础。
3. 最终发行物是否可用，取决于宿主系统的原生运行时、PyInstaller 的目标平台、以及外部工具是否齐全。

### 2.2 当前仓库里的现状

从现有脚本和代码可以看出，Nexus 目前仍然明显偏向 Windows：

1. 根目录的 `scripts/20_build_debug.ps1` 和 `scripts/30_build_release.ps1` 直接生成 `.exe`。
2. `nexus-platform/scripts/build_release.ps1` 也是 Windows 发布脚本。
3. `nexus-core/plugins/network/nexus_iperf/tool.py` 当前只识别 `iperf3.exe` 和 `iperf-2.2.1-win64.exe`。
4. `nexus-core/plugins/wifi/capture/tool.py` 的本地抓包依赖 `tshark`，远端抓包依赖 `tcpdump`、`iw`、`nmcli` 等系统工具。
5. `ping` 属于系统命令，不需要随应用分发，但参数在不同平台上不同。

这意味着 Nexus 的跨平台问题不只是 GUI 壳层兼容，还包括打包方式、外部工具分发、命令参数差异、系统权限模型差异。

## 3. 面向不同操作系统的产物策略

建议把 Nexus 的产物分成三类，而不是继续用单一 `.exe` 心智去看待所有平台。

### 3.1 Windows 产物

建议产物：

1. `NexusPlatform.exe`
2. 调试版目录或压缩包
3. 发布版目录或安装包

当前仓库已有基础：

1. `scripts/20_build_debug.ps1`
2. `scripts/30_build_release.ps1`
3. `scripts/40_sign_release.ps1`

Windows 侧的重点不是“能不能打包”，而是把当前 PyInstaller 流程稳定化，并把外部工具目录一起打包或外置。

### 3.2 macOS 产物

建议产物：

1. `.app` 目录
2. `.dmg` 分发包

在当前技术栈下，macOS 并不适合继续沿用“单文件 exe”式思路。更合理的发布结构是：

1. 使用 PyInstaller 生成 macOS 对应的应用目录或 `.app`
2. 将前端 `dist/`、配置文件、工具清单一起组织进分发目录
3. 后续补 `codesign` 与 `notarization`

### 3.3 Linux 产物

建议产物：

1. 一目录分发包
2. `tar.gz`
3. 后续再考虑 `AppImage`

Linux 的主要问题不在 Python 业务逻辑，而在系统原生依赖和发行版差异。对 Nexus 来说，Linux 初期更适合采用“目录包 + 明确安装依赖说明”的方式，而不是一开始就追求统一安装器。

## 4. 交叉编译边界

## 4.1 当前技术栈下的基本结论

在当前 `Python + pywebview + PyInstaller` 方案下，不建议把“跨平台交叉编译”作为主路径。

PyInstaller 的官方说明很明确：输出产物是针对当前活跃操作系统和当前 Python 版本生成的。换句话说：

1. 在 macOS 上构建的是 macOS 产物。
2. 在 Windows 上构建的是 Windows 产物。
3. 在 Linux 上构建的是 Linux 产物。

如果要给不同操作系统出包，推荐做法是“在目标操作系统上原生构建”。

### 4.2 为什么不建议把交叉编译当主方案

原因主要有四类：

1. PyInstaller 自带的 bootloader 是目标平台相关的。
2. Python 解释器和扩展模块也是目标平台相关的。
3. pywebview 依赖目标平台原生 GUI 后端。
4. Nexus 还依赖一些平台专属或系统集成能力，例如窗口壳、权限、外部命令路径。

这意味着就算勉强在 macOS 上拼出 Windows 可执行文件，后续也很难验证稳定性。

### 4.3 在 macOS 上出 Windows 包，推荐怎么做

推荐顺序如下：

1. 首选: 使用 CI 的 Windows Runner 原生构建
2. 次选: 在本地使用 Windows 虚拟机构建
3. 最后才考虑基于 Wine 的实验性流程

对 Nexus 来说，最稳的方案不是在 macOS 上直接交叉生成 `.exe`，而是：

1. macOS 负责提交代码和触发构建
2. Windows Runner 负责生成 `.exe`
3. macOS Runner 负责生成 `.app`
4. Linux Runner 负责生成 Linux 分发目录或压缩包

### 4.4 交叉编译的建议结论

建议把发布策略定为：

1. 开发环境可以跨平台开发
2. 发布产物采用目标系统原生构建
3. 交叉编译仅作为实验或临时验证手段，不作为正式发布链路

## 5. 推荐的构建矩阵

建议为 Nexus 建立明确的构建矩阵。

| 目标平台 | 构建宿主 | 推荐程度 | 产物 | 备注 |
| :-- | :-- | :-- | :-- | :-- |
| Windows | Windows | 高 | `.exe` / 目录包 | 当前脚本基础已存在 |
| macOS | macOS | 高 | `.app` / `.dmg` | 需要补签名与公证 |
| Linux | Linux | 高 | 目录包 / `tar.gz` / AppImage | 先做目录包即可 |
| Windows | macOS | 低 | 理论可尝试，非主路径 | 不作为正式发布 |
| Windows | Linux | 低 | 理论可尝试，非主路径 | 不作为正式发布 |
| macOS | Windows/Linux | 低 | 不建议 | 验证成本高 |

## 6. CI/CD 建议

建议把 CI 分成两个层次。

### 6.1 校验层

每个平台都执行：

1. Python 依赖安装
2. 前端依赖安装
3. `npm run build`
4. `import backend.app`
5. 少量 smoke test

这一层的目标是尽快发现“代码已经失去跨平台可运行性”的问题。

### 6.2 产物层

只在对应平台生成目标产物：

1. Windows Runner 生成 `.exe`
2. macOS Runner 生成 `.app`
3. Linux Runner 生成目录包或压缩包

后续可以把版本号、签名、压缩和上传发布资产接进同一条流水线。

## 7. 第三方依赖分类

Nexus 涉及的第三方依赖不能统一处理，建议分成四类。

### 7.1 系统自带命令

代表：`ping`

特点：

1. 通常由宿主系统提供
2. 无需随应用打包
3. 参数和输出格式存在平台差异

治理方式：

1. 不分发二进制
2. 做平台适配层，统一参数构造和输出解析
3. 启动时做可用性探测

### 7.2 推荐外置但可由用户安装的工具

代表：`tshark`

特点：

1. 宿主系统通常不会默认安装
2. 不同平台安装方式不同
3. 版本差异会影响功能可用性

治理方式：

1. 应用启动或工具打开时做检测
2. 前端提示“未安装/版本不满足”
3. 文档给出平台对应安装方式
4. 不建议私自静默下载系统级抓包工具

### 7.3 需要随应用分发的可执行工具

代表：`iperf3`、`iperf2`

特点：

1. 应用功能直接依赖它们
2. 目标用户未必会自己安装
3. 不同平台产物不同

治理方式：

1. 在仓库中维护按平台分目录的工具包
2. 打包时只带当前目标平台对应版本
3. 运行时通过 manifest 查找而不是写死文件名

### 7.4 远端宿主依赖

代表：`tcpdump`、`iw`、`nmcli`

特点：

1. 不运行在 Nexus 所在机器上
2. 由远端 Linux 设备提供
3. Nexus 只能做探测、告警和兼容处理，不能替远端环境兜底

治理方式：

1. 建立远端环境自检逻辑
2. 在连接后返回工具存在性和版本信息
3. 明确区分“本地桌面依赖”和“远端目标机依赖”

## 8. Nexus 当前第三方依赖清单

结合当前代码，至少应明确以下依赖。

### 8.1 Ping

位置：`nexus-core/plugins/network/nexus_ping/tool_v2.py`

依赖类型：系统自带命令

平台差异：

1. Windows 与 Unix 参数不同
2. 输出格式不同
3. 停止方式行为不同

维护要求：统一命令构造与日志解析，禁止在业务层写死某个平台参数。

### 8.2 iPerf

位置：`nexus-core/plugins/network/nexus_iperf/tool.py`

依赖类型：随应用分发的外部工具

当前现状：代码里只识别 Windows `.exe`

后续要求：

1. 改成按平台查找 `tools/iperf/<platform>/...`
2. 建立版本清单文件
3. 将工具路径选择从硬编码升级为 manifest 驱动

### 8.3 Wireless Capture

位置：`nexus-core/plugins/wifi/capture/tool.py`

依赖类型：本地外部工具 + 远端宿主依赖

本地依赖：

1. `tshark`
2. 文件浏览命令 `open` / `xdg-open` / `os.startfile`

远端依赖：

1. `tcpdump`
2. `iw`
3. `nmcli`
4. SSH 环境

维护要求：

1. 本地桌面环境只负责探测和提示
2. 远端工具存在性必须通过连接后检查返回
3. 平台上不具备本地能力时，只保留远端模式

## 9. 建议的工具目录结构

建议把第三方可执行文件统一放到明确的平台分层目录，而不是继续在代码里写死 Windows 文件名。

```text
tools/
  iperf/
    windows/
      iperf3.exe
      iperf-2.2.1-win64.exe
    macos/
      iperf3
    linux/
      iperf3
  manifests/
    tools.json
```

`tools.json` 建议至少包含：

1. 工具 ID
2. 版本
3. 平台
4. 相对路径
5. 校验值
6. 是否允许外部系统版本替代

示例：

```json
{
  "iperf3": {
    "windows": {
      "path": "tools/iperf/windows/iperf3.exe",
      "version": "3.18"
    },
    "macos": {
      "path": "tools/iperf/macos/iperf3",
      "version": "3.18"
    },
    "linux": {
      "path": "tools/iperf/linux/iperf3",
      "version": "3.18"
    }
  }
}
```

## 10. 构建时如何处理第三方依赖

建议把第三方依赖的构建策略定成以下原则。

### 10.1 系统命令不打包

代表：`ping`

策略：

1. 不进入发行包
2. 只保留平台适配逻辑
3. 启动时检测是否存在

### 10.2 外部工具按目标平台筛选后打包

代表：`iperf3`

策略：

1. Windows 包只带 Windows 二进制
2. macOS 包只带 macOS 二进制
3. Linux 包只带 Linux 二进制

不要把所有平台的工具一起塞进单个平台产物。

### 10.3 系统级抓包工具默认不内置

代表：`tshark`

策略：

1. 文档明确安装方法
2. 应用里做检测和引导
3. 仅在后续确有必要时，再评估是否提供辅助安装脚本

### 10.4 远端依赖不进入本地产物

代表：`tcpdump`

策略：

1. 不把远端工具打进桌面包
2. 在连接时做预检查
3. 把检查结果回传给前端

## 11. 发布与运维建议

### 11.1 先用目录包，再考虑单文件

PyInstaller 的 one-file 模式适合最终交付，但不适合当前阶段做多平台问题定位。建议顺序如下：

1. 开发态优先 one-folder 或目录包
2. 发布态再考虑 one-file
3. macOS 初期优先 `.app` 或目录结构，不急着收缩成单体文件

### 11.2 平台说明文档和自检界面必须同步存在

不要只依赖 README。对每个受外部工具影响的功能，应用里都应该能明确告诉用户：

1. 当前需要什么工具
2. 当前缺什么工具
3. 当前是本地缺失还是远端缺失

### 11.3 版本与兼容矩阵要产品化

建议维护一份独立兼容矩阵，至少记录：

1. 支持的操作系统版本
2. 支持的 Python 版本
3. 支持的 Node.js 版本
4. `iperf3` 推荐版本
5. `tshark` 推荐版本
6. 远端 Linux 依赖要求

## 12. 建议的落地顺序

建议按下面顺序推进。

### 12.1 第一批

1. 把当前发布流程从“只服务 Windows”整理成构建矩阵说明。
2. 为 `iperf` 建立平台目录和工具 manifest。
3. 把 `ping`、`iperf`、`wireless capture` 的依赖检查统一收口到一个能力或诊断接口。

### 12.2 第二批

1. 新增 macOS 原生打包脚本。
2. 新增 Linux 目录包脚本。
3. 在 CI 中接入 Windows/macOS/Linux 三平台构建。

### 12.3 第三批

1. 评估 Windows/macOS 的正式签名流程。
2. 评估 Linux 的 AppImage 或其他分发格式。
3. 把外部工具下载、校验和版本治理流程做成自动化。

## 13. 结论

对 Nexus 来说，跨平台的关键不是“能不能让一台 macOS 直接产出 Windows 包”，而是建立一套能长期维护的构建和依赖治理体系。

建议的核心结论如下：

1. Nexus 的源码可以跨平台开发。
2. Nexus 的正式发行物应在目标平台原生构建。
3. 第三方依赖必须分类治理，不能继续用同一种方式处理所有外部工具。
4. 对系统命令、可分发二进制、系统级工具、远端宿主依赖，分别建立不同的检测、打包和发布规则。

后续如果继续推进，建议下一步直接把 `iperf` 的工具目录和 manifest 方案落到仓库里，再把对应的打包脚本改成按平台筛选工具文件。