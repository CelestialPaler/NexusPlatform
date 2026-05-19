# Nexus 契约层与仓库目录治理方案

> 文档状态: Draft
> 目标读者: 项目 Owner、架构设计者、核心开发者
> 适用范围: `nexus-contracts`、`nexus-core`、`nexus-platform`、仓库根目录
> 执行现状: `nexus-sdk/` 目录已删除，仓库当前以 `nexus-contracts` 作为唯一契约入口；本文档保留为迁移动机与边界判断记录。

## 1. 文档目的

这份文档沉淀两类决定，作为当时执行迁移前的基线，并保留为后续回看迁移动机的依据。

1. 是否应该把当前 `nexus-sdk` 调整为独立的契约层。
2. 针对当前 monorepo 的代码架构和目录组织，应该如何收敛边界。

本文档只定义方向、边界和迁移建议，不直接修改现有实现。

## 2. 当前状态判断

### 2.1 当前主分层是对的

Nexus 现在的主线分层仍然成立：

1. `nexus-core` 负责逻辑实现。
2. `nexus-platform` 负责桌面宿主、前后端桥接和界面。

这条主线不应推翻。

### 2.2 当前第三层命名与职责不匹配

`nexus-sdk` 当前承载的内容主要包括：

1. 类型别名
2. 装饰器与元数据模型
3. 异常定义
4. 插件开发辅助接口

问题在于，`SDK` 这个名字暗示它是一个面向第三方开发者、可独立发布、边界稳定的开发工具包，但仓库当前并没有形成这一层的完整生态。

更现实的判断是：当前 `nexus-sdk` 更接近“契约层”和“插件开发辅助层”的混合体，而不是一个成熟的外部 SDK。

### 2.3 当前存在两套扩展模型并存的问题

从代码现状看，仓库里实际上存在两套扩展思路：

1. 运行时主路径基于 `ITool`。
2. 另一套声明式节点思路基于 `nexus_node`、`NodeMetadata`、`NX*` 类型。

当前 Platform 真正运行时加载的是 `ITool` 路线，因此第二套模型还没有成为主契约。

这会造成三个问题：

1. 开发者不知道新增能力应该走哪条路径。
2. `core` 与 `sdk` 的边界看起来独立，实际上已经交叉依赖。
3. 架构图、目录命名和运行时现实不一致。

## 3. 目标原则

后续改造建议遵循以下原则。

### 3.1 契约层独立，但必须最小化

如果单独拆出契约层，它必须是最小、最稳定、最低依赖的公共层。

### 3.2 契约与实现分离

接口、元数据、事件 schema、异常、能力声明，应放在契约层。

工具实现、平台桥接、UI、线程管理，不应进入契约层。

### 3.3 规范文档不进入 Python 契约包

“契约”与“规范”不能混为一谈。

应该分开处理：

1. 运行时代码契约进入独立 Python 包。
2. 工程流程规范、文档规范、提交规范继续放在 `docs/`。

### 3.4 先统一运行时主契约，再扩生态

在真正支持第三方独立开发之前，优先明确当前唯一正式运行时契约，而不是提前抽象过度。

## 4. 推荐的总体分层

建议将仓库收敛为三层主结构。

### 4.1 `nexus-contracts`

角色：稳定契约层

职责：

1. 工具接口协议
2. 元数据 schema
3. 事件 schema
4. 通用异常
5. 能力模型 schema
6. 序列化协议

### 4.2 `nexus-core`

角色：逻辑实现层

职责：

1. 各类工具与分析实现
2. 具体插件逻辑
3. 数据处理与协议分析
4. 工具调度与运行时行为

### 4.3 `nexus-platform`

角色：桌面宿主层

职责：

1. pywebview 宿主
2. 前端 React 应用
3. 后端 managers 与桥接 API
4. 系统集成与打包发布

## 5. 对 `nexus-sdk` 的建议结论

### 5.1 不建议保留 `sdk` 这个名字

原因不是技术实现本身有问题，而是命名在当前阶段不准确。

`sdk` 这个名字会误导使用者认为：

1. 这是一个对外稳定 API。
2. 它可以独立于 monorepo 长期版本化。
3. 它代表完整的插件开发入口。

现阶段这三点都没有完全成立。

### 5.2 推荐改为 `nexus-contracts`

如果要独立成包，推荐名称为：

1. `nexus-contracts`

不推荐：

1. `nexus-contract`
2. 继续保留 `nexus-sdk`

原因很简单：这里存放的不是一个单一 contract，而是一组跨层公共契约。

### 5.3 是否保留“SDK”概念

可以，但不应先出现在物理目录层。

更稳妥的做法是：

1. 先建立 `nexus-contracts`
2. 等第三方插件生态成熟后，再在其上扩一个真正的 `nexus-sdk`

换句话说：

1. `contracts` 是运行时公共底座
2. `sdk` 是未来可以建立在 `contracts` 之上的开发者体验层

## 6. `nexus-contracts` 的边界建议

建议只放“运行时代码契约”，不要把任何流程类规范放进去。

### 6.1 适合放进 `nexus-contracts` 的内容

1. `ITool` 一类接口定义
2. `NodeMetadata`、`ToolMetadata` 等 schema
3. `NexusError`、`NexusPluginError` 等通用错误
4. 事件 payload schema
5. capability schema
6. `NXSerializable` 这类协议定义
7. 插件声明用的装饰器或轻量 helper

### 6.2 不适合放进 `nexus-contracts` 的内容

1. 任何具体工具实现
2. 任何 GUI、webview、frontend 代码
3. 平台桥接 manager
4. 构建脚本
5. 文档规范、提交规范、SOP

### 6.3 依赖控制建议

`nexus-contracts` 应尽量避免重依赖。

建议原则：

1. 尽量只依赖标准库和轻量 schema 库
2. 如无必要，不要把 `pandas`、`numpy` 放进契约层
3. 契约层应该描述结构，不应该绑定过重的运行时对象实现

## 7. 当前仓库目录组织的主要问题

### 7.1 根目录层次还不够语义化

当前根目录已经有 monorepo 轮廓，但还缺少“公共层”的清晰表达。

现状更像：

1. `core`
2. `platform`
3. `sdk`

而实际更合理的抽象应该是：

1. `contracts`
2. `core`
3. `platform`

### 7.2 `nexus-core` 内部的“契约”和“实现”仍有混放

目前 `ITool` 位于 `nexus_core.interfaces`，但它已经不只是 `core` 的内部类型，而是跨层公共契约。

这类内容如果长期留在 `core` 内部，会让 `platform` 与未来插件都在语义上依赖实现层。

### 7.3 `nexus-platform` 内部目录仍偏功能堆叠

当前 `backend/` 下很多内容是按历史演进堆出来的，已经有一定混杂：

1. app 入口逻辑
2. managers
3. 平台能力判断
4. 某些系统集成能力

随着跨平台改造推进，后续最好把“应用壳职责”和“平台特化职责”进一步分开。

### 7.4 `tools/` 和外部依赖目录治理还未完全产品化

当前外部工具目录已经存在，但仍然更偏“临时资源堆放点”，还没有彻底形成 manifest 驱动的治理方式。

## 8. 推荐的仓库根目录结构

建议后续逐步收敛成下面的结构。

```text
NexusPlatform/
├── docs/                    # 文档与工程规范
├── nexus-contracts/         # 稳定契约层
│   └── src/nexus_contracts/
├── nexus-core/              # 逻辑实现层
│   └── nexus_core/
├── nexus-platform/          # GUI 宿主与桌面应用
│   ├── backend/
│   ├── frontend/
│   └── run.py
├── scripts/                 # 仓库级脚本
└── tools/                   # 外部工具与二进制资源
```

这个结构的优点是：

1. 名字与职责一致
2. 公共契约有明确落点
3. `core` 和 `platform` 的依赖方向更清晰

## 9. 推荐的包内目录建议

### 9.1 `nexus-contracts`

建议目录：

```text
nexus-contracts/
└── src/nexus_contracts/
    ├── interfaces/
    ├── schemas/
    ├── events/
    ├── errors/
    ├── capabilities/
    └── __init__.py
```

说明：

1. `interfaces/` 放运行时协议
2. `schemas/` 放元数据和结构定义
3. `events/` 放事件格式
4. `errors/` 放统一错误类型
5. `capabilities/` 放平台能力声明结构

### 9.2 `nexus-core`

建议目录：

```text
nexus-core/
└── nexus_core/
    ├── runtime/
    ├── plugins/
    ├── analyzers/
    ├── adapters/
    └── cli.py
```

说明：

1. `plugins/` 保留领域插件
2. `runtime/` 放工具调度、发现、执行辅助
3. `analyzers/` 放偏纯分析库
4. `adapters/` 只放与外部库或文件格式交互的技术适配

### 9.3 `nexus-platform`

建议目录：

```text
nexus-platform/
├── backend/
│   ├── api/
│   ├── managers/
│   ├── platform/
│   ├── capabilities/
│   └── utils/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── styles/
└── tests/
```

说明：

1. `backend/api/` 放对 pywebview 暴露的 API 面
2. `backend/managers/` 放桥接和调度
3. `backend/platform/` 放平台特化能力
4. `frontend/features/` 放按工具域拆分的页面逻辑，避免所有业务组件继续堆在 `components/`

## 10. 推荐的依赖方向

后续建议严格控制依赖方向如下：

1. `nexus-platform` -> `nexus-core`
2. `nexus-platform` -> `nexus-contracts`
3. `nexus-core` -> `nexus-contracts`
4. `nexus-contracts` -> 不依赖 `core` 或 `platform`

禁止：

1. `nexus-core` -> `nexus-platform`
2. `nexus-contracts` -> `nexus-platform`
3. `nexus-contracts` -> 具体工具实现

## 11. 对“规范”的处理建议

如果这里的“规范”指工程规范、文档规范、提交流程规范，那么不建议进入 `nexus-contracts`。

建议保留在：

1. `docs/development/`
2. `docs/architecture/`
3. 根目录说明文档

原因是：

1. 这类规范不是运行时代码的一部分
2. 它们不应参与 Python 包版本管理
3. 它们的消费对象是人，不是运行时模块

## 12. 迁移建议

建议按三步走，而不是一次性大迁移。

### 12.1 第一步：定名与定边界

先完成以下决定：

1. 确认 `nexus-sdk` 后续不再作为长期名称
2. 确认 `nexus-contracts` 为目标命名
3. 确认 `contracts` 只承载运行时代码契约

### 12.2 第二步：迁移最稳定的公共项

优先迁移：

1. `ITool`
2. 通用异常
3. 元数据 schema
4. capability schema

暂缓迁移：

1. 与未来 Blueprint 强绑定但尚未落地的接口
2. 过于依赖 `pandas` / `numpy` 的重类型表达

### 12.3 第三步：收口 import 和文档

在契约层稳定后，再统一：

1. 代码 import 路径
2. 开发指南
3. 架构图和目录示意
4. 新工具开发 SOP

## 13. 建议结论

本轮讨论建议正式确定以下结论：

1. 保留 `nexus-core` 和 `nexus-platform` 作为主分层。
2. 不建议继续保留 `nexus-sdk` 这一命名作为长期结构。
3. 推荐建立 `nexus-contracts` 作为最小稳定公共契约层。
4. `nexus-contracts` 只放运行时代码契约，不放工程流程规范。
5. 目录治理的目标不是增加层数，而是让名字、依赖方向和实际职责一致。

## 14. 后续动作建议

如果进入正式改造阶段，建议下一步按以下顺序执行：

1. 新建 `nexus-contracts` 包骨架。
2. 迁移 `ITool`、异常、元数据 schema。
3. 调整 `nexus-core` 与 `nexus-platform` 的 import。
4. 更新新工具开发文档和系统架构图。
5. 最后再决定 `nexus_node` 等声明式接口是否保留、降级或另行演进。