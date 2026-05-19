# Nexus 变体构建与产物工程方案

> 文档状态: Draft
> 目标读者: 项目 Owner、平台开发者、发布维护者、CI 维护者
> 适用范围: `nexus-platform`、`nexus-core`、`tools/`、构建与发布流程

## 1. 文档目标

这份文档回答一个更具体的问题：

同一套 Nexus 源码，如何在不同宿主环境、不同能力约束和不同交付目标下，稳定地产生不同变体和对应产物。

这里讨论的重点不是某个平台上的单次打包，而是整个变体系统如何设计、如何命名、如何输出、如何长期维护。

## 2. 当前问题不只是跨平台

如果只把问题定义成“Windows、macOS、Linux 三平台如何打包”，后续还是会继续堆脚本。

对 Nexus 来说，真正需要工程化的至少有四个维度：

1. 运行平台
2. 能力档位
3. 交付形态
4. 外部依赖策略

### 2.1 运行平台

当前至少需要考虑：

1. Windows
2. macOS
3. Linux

### 2.2 能力档位

当前和未来都可能存在多种能力组合，例如：

1. Full
2. Demo
3. Headless
4. Cross-platform safe

### 2.3 交付形态

同一套代码在不同阶段可能对应不同形态：

1. 开发态
2. 调试态
3. 发布态
4. 便携目录包
5. 安装包

### 2.4 外部依赖策略

同一个功能依赖的外部资源，处理方式也不一样：

1. 系统自带
2. 随应用分发
3. 用户预装
4. 远端宿主提供

如果这四个维度继续分别散落在代码、脚本、目录和 README 里，后续变体数量一多，构建系统会很快失控。

## 3. 建议的基本思路

建议把“变体”本身定义为一等公民，而不是继续让产物等于“执行某个脚本之后的结果”。

建议后续统一为：

1. 源码是稳定基线
2. profile 定义变体
3. 构建系统根据 profile 生成产物

这样以后讨论的对象就不再是：

1. 哪个脚本该改
2. 哪个目录该复制
3. 哪个平台要额外判断

而是：

1. 要新增哪个 profile
2. 该 profile 开哪些 feature
3. 该 profile 输出什么产物

## 4. 推荐的三层差异模型

为了避免差异逻辑继续混在一起，建议把变化来源拆成三层。

### 4.1 平台差异

由平台适配层负责，例如：

1. GUI 宿主差异
2. 窗口行为差异
3. 权限模型差异
4. 系统命令参数差异

这一层属于代码运行时能力，不属于构建脚本。

### 4.2 能力差异

由 feature profile 负责，例如：

1. 是否启用 Automation
2. 是否启用本地无线抓包
3. 是否启用多窗口工具
4. 是否启用远端控制能力

这一层描述的是“这个变体要提供什么”。

### 4.3 发布差异

由 build profile 负责，例如：

1. 输出 `.exe` 还是 `.app`
2. 输出 one-folder 还是 one-file
3. 是否签名
4. 是否包含调试资源

这一层描述的是“这个变体怎么交付”。

## 5. 建议引入两类 Profile

建议至少显式定义两类 profile，而不是把所有差异塞进一个配置文件。

### 5.1 Feature Profile

Feature Profile 负责描述产品能力面。

示例问题：

1. 这个包是否包含 Automation
2. 这个包是否允许本地抓包
3. 这个包是否只保留演示能力
4. 这个包是否适合无 GUI 环境

### 5.2 Build Profile

Build Profile 负责描述构建与交付面。

示例问题：

1. 目标平台是什么
2. 由哪个宿主系统构建
3. 使用什么打包格式
4. 产物输出到哪里
5. 是否签名

### 5.3 两者关系

建议一个最终变体由以下组合决定：

1. `feature profile`
2. `build profile`
3. 当前 Git revision

换句话说，一个产物不应该只是“release build”，而应该能明确回答：

1. 它是什么平台
2. 它是什么能力档位
3. 它是什么交付形态

## 6. 推荐的 Profile 结构

建议在仓库中新增 `profiles/` 目录。

```text
profiles/
  features/
    full.yaml
    demo.yaml
    headless.yaml
    cross_platform_safe.yaml
  builds/
    windows-debug.yaml
    windows-release.yaml
    macos-debug.yaml
    macos-release.yaml
    linux-debug.yaml
    linux-release.yaml
```

### 6.1 Feature Profile 建议字段

建议至少包含：

1. profile 名称
2. 开启的 feature 列表
3. 关闭的 feature 列表
4. 依赖的外部工具策略
5. UI 能力可见性策略

### 6.2 Build Profile 建议字段

建议至少包含：

1. 目标操作系统
2. 构建宿主限制
3. 打包格式
4. 输出目录
5. 是否签名
6. 是否包含调试信息
7. 允许打进包的工具列表

## 7. 建议的 Profile 示例

下面给一个简化示意，说明 profile 想表达什么。

```yaml
name: macos-demo
target_os: macos
host_os: macos
feature_profile: demo
packaging:
  format: app
  mode: one-folder
signing:
  enabled: false
bundled_tools:
  iperf3: bundled
  tshark: external
runtime:
  require_frontend_dist: true
  admin_elevation: false
```

这类 profile 的意义在于：

1. 能力选择变成显式配置
2. 构建输出变成显式配置
3. 外部依赖策略变成显式配置

## 8. 建议的构建系统结构

当前脚本可以保留，但建议逐步从“脚本集合”收敛为“统一构建入口 + 多 profile 驱动”。

建议新增一个构建系统层，例如：

```text
build-system/
  build.py
  profile_loader.py
  feature_resolver.py
  artifact_writer.py
  validators/
  packagers/
```

### 8.1 建议的统一入口

例如：

1. `python build-system/build.py --profile macos-release --feature demo`
2. CI 也调用同一个入口
3. 本地脚本只做参数包装

### 8.2 不建议继续扩大平台专属脚本职责

可以保留：

1. `scripts/20_build_debug.ps1`
2. `scripts/30_build_release.ps1`

但建议它们只做转调，不再承载完整业务逻辑。

否则后续很容易演化成：

1. Windows 一套逻辑
2. macOS 一套逻辑
3. Linux 一套逻辑
4. CI 再复制一套逻辑

## 9. 建议的构建流程分层

建议把整体流程拆成两条流水线。

### 9.1 校验流水线

目标：证明代码在目标 profile 下可运行。

建议内容：

1. 安装 Python 依赖
2. 安装前端依赖
3. 构建前端资源
4. 后端导入检查
5. feature 组合检查
6. 少量 smoke test

这条流水线不一定产出最终包，但它应该先于打包发生。

### 9.2 产物流水线

目标：基于通过校验的 profile 生成交付物。

建议内容：

1. 读取 build profile
2. 读取 feature profile
3. 解析外部依赖策略
4. 选择 packager
5. 写入产物目录
6. 生成 manifest

## 10. 对当前打包方式的建议

### 10.1 开发态优先 one-folder

对于当前阶段，建议默认优先 one-folder 或目录包。

原因不是 one-file 不可用，而是：

1. one-folder 更容易定位缺文件问题
2. 更适合验证跨平台差异
3. 更适合检查外部工具是否正确进入包内

### 10.2 发布态再考虑 one-file

当目录包稳定后，再根据平台需要收缩成：

1. Windows one-file
2. macOS `.app`
3. Linux `tar.gz` 或 AppImage

### 10.3 不同平台不要强行统一成单一形式

建议接受现实差异：

1. Windows 可以更偏 `.exe`
2. macOS 更适合 `.app`
3. Linux 初期更适合目录包

产物形式统一不是目标，流程可维护才是目标。

## 11. 外部依赖在变体系统中的处理建议

建议把外部依赖策略也显式纳入 profile，而不是继续分散在代码和脚本里。

### 11.1 系统命令

代表：`ping`

策略：

1. 不打包
2. 在运行时探测
3. 由代码适配平台差异

### 11.2 可随包分发的工具

代表：`iperf3`

策略：

1. 在构建阶段按目标平台筛选
2. 只把目标平台对应版本打进产物
3. 由 manifest 记录其版本和路径

### 11.3 外置系统级工具

代表：`tshark`

策略：

1. 默认不随包分发
2. 在运行时检测
3. 由 UI 提示用户安装

### 11.4 远端宿主依赖

代表：`tcpdump`、`iw`、`nmcli`

策略：

1. 不进入本地桌面产物
2. 由远端连接阶段做自检
3. 将结果回传前端

## 12. 建议的产物目录结构

当前仓库里的产物路径仍偏历史积累，后续建议统一为稳定结构。

```text
artifacts/
  windows/
    debug/
    release/
  macos/
    debug/
    release/
  linux/
    debug/
    release/
```

如果后续变体增多，可以继续细化为：

```text
artifacts/
  macos/
    demo/
    full/
  windows/
    demo/
    full/
```

### 12.1 产物目录应稳定

建议避免以下情况继续扩大：

1. 一部分产物在 `bin/debug`
2. 一部分产物在 `bin/release_temp`
3. 一部分产物在项目根目录

路径不稳定会直接增加 CI、签名、分发和排障成本。

## 13. 每个产物都应附带 Manifest

建议每个最终产物目录都生成一份 manifest 文件，例如：

1. `artifact-manifest.json`

建议至少记录：

1. 版本号
2. Git revision
3. 构建时间
4. 目标平台
5. feature profile
6. build profile
7. 打包方式
8. 包含的外部工具
9. 需要用户外置安装的工具

这份 manifest 的价值很直接：

1. 方便排障
2. 方便版本追踪
3. 方便 CI 上传和回溯

## 14. 建议的 CI/CD 方向

建议 CI 后续也围绕 profile 构建，而不是围绕平台写死。

### 14.1 校验矩阵

建议矩阵至少覆盖：

1. 平台
2. 关键 feature profile

### 14.2 产物矩阵

建议产物矩阵至少覆盖：

1. Windows release
2. macOS release
3. Linux release

如果 demo 是正式交付物，则应把它也作为正式矩阵一部分，而不是临时特殊脚本。

## 15. 对当前目录组织的进一步建议

从变体工程的角度，建议在根目录逐步补齐以下内容：

```text
NexusPlatform/
├── build-system/
├── profiles/
├── artifacts/
├── tools/
├── nexus-contracts/
├── nexus-core/
├── nexus-platform/
└── docs/
```

说明：

1. `build-system/` 放统一构建逻辑
2. `profiles/` 放变体定义
3. `artifacts/` 放稳定产物输出
4. `tools/` 放按平台治理的外部工具资源

## 16. 推荐的落地顺序

建议按下面顺序推进，而不是先大规模改代码。

### 16.1 第一批

1. 确认 profile 驱动是后续构建方向
2. 新增 `profiles/` 目录并定义最小字段
3. 新增统一构建入口，但先只接管一个平台

### 16.2 第二批

1. 把现有 `ps1` 和 `sh` 脚本改成薄包装
2. 统一产物输出目录
3. 统一生成 `artifact-manifest.json`

### 16.3 第三批

1. 让 feature profile 与 runtime capabilities 接通
2. 让 CI 按 profile 跑校验和打包
3. 把外部工具打包策略彻底改成 manifest 驱动

## 17. 建议结论

围绕“同一套代码在不同环境下变体并产生产物”这个目标，建议正式确定以下结论：

1. 变体本身要工程化，不能继续靠散落的构建脚本和临时目录约定支撑。
2. 平台差异、能力差异、发布差异要分三层处理，不能混在一起。
3. 后续构建系统应由 profile 驱动，而不是由脚本名驱动。
4. 每个产物都应具有稳定输出路径和明确的 manifest。
5. 目录结构、构建流程和运行时能力模型应逐步收敛到同一套命名和边界上。

## 18. 下一步建议

当前最小骨架已经完成，后续的重点不再是“把入口立起来”，而是继续收敛剩余边角：

1. 把签名、notarization 和发布后处理接入 profile 驱动入口
2. 把第三方工具从“目录约定”继续收敛到 manifest 驱动
3. 让 CI 直接调用统一入口，而不是再复制一套构建逻辑

## 19. 当前骨架落地说明

当前仓库已经落下最小骨架，包含：

1. `build-system/build.py`
2. `build-system/profile_loader.py`
3. `profiles/features/demo.json`
4. `profiles/features/full.json`
5. `profiles/builds/macos-demo.json`
6. `profiles/builds/windows-debug.json`
7. `profiles/builds/windows-release.json`

当前阶段这套入口已经负责：

1. 解析 build profile
2. 解析 feature profile
3. 组合成构建计划并输出
4. 执行只读校验并输出结果
5. 执行前端构建
6. 执行 PyInstaller 打包
7. 将最终产物写入 `artifacts/` 目录
8. 生成 `artifact-manifest.json`
9. 基于 `tools/manifests/tools.json` 解析按平台分层的 bundled tools
10. 在 macOS `.app` 产物上执行 `xattr` 清理和最终签名尝试

当前阶段它仍然没有完全接管的部分主要是：

1. 正式签名、证书管理与 notarization
2. 更细粒度的第三方工具 manifest 治理
3. CI 矩阵编排

当前第一批脚本接入状态如下：

1. `scripts/20_build_debug.ps1` 已退化为统一入口的参数包装。
2. `scripts/30_build_release.ps1` 已退化为统一入口的参数包装。

也就是说，当前真实打包、产物整理和 manifest 写入已经由 `build-system/build.py` 接管，旧脚本只保留用户入口和环境选择职责。

当前工具资源治理也已经开始从“目录猜测”转向“manifest 驱动”：

1. `tools/iperf/windows/` 作为按平台分层后的首个落点
2. `tools/manifests/tools.json` 作为 bundled tool 资产描述的事实来源

当前 macOS 签名流程也已经接入统一入口，但它的状态是“尝试并报告”，不是“正式发布级成功保证”：

1. 构建前后会对相关路径执行 `xattr -cr`
2. staged `.app` 会尝试执行 ad-hoc `codesign`
3. 如果 PyInstaller 当前输出内容仍导致签名失败，构建不会中断，而是记录 `codesign-warn`，等待后续进一步治理 bundle 内容或正式证书链