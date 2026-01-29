# Nexus 动态插件加载架构 (Dynamic Plugin System)

> **目标**: 解除 Core 工具更新与 Platform 代码发布之间的强耦合。
> **现状**: 需要手动编写 Manager 和 App 路由 (Manager Hell)。
> **未来**: 基于元数据的自动发现与组件化的 UI 构建。

## 0. 核心设计哲学 (Core Philosophy)

本架构旨在建立一种绝对的**正交 (Orthogonal)** 关系：

$$
\text{Nexus System} = \text{Pure Logic (Core)} \times \text{Universal Routing (Platform)} \times \text{Explicit Interaction (Frontend)}
$$

1.  **工具即逻辑 (Tool is Logic)**: 
    *   底层 `nexus-core` 中的工具只需关注**元数据声明**与**执行逻辑**。
    *   它完全不感知自己是运行在 CLI、Web 还是桌面应用中。
2.  **平台即通道 (Platform is Router)**: 
    *   后端 `nexus-platform` 不再为每个工具编写专属 Manager。
    *   它是通用的**反射路由器**：接收 ID，反射调用，透传结果。
3.  **UI即画皮 (UI is Skin)**: 
    *   前端负责呈现与交互。
    *   **显式设计 (Explicit Design)**: 摒弃自动生成，追求极致的掌控力。
    *   **组件赋能**: 通过 `NexusUI` 组件库实现“积木式”开发，平衡效率与体验。

## 1. 架构演进路线

### 阶段一：硬编码 (Current)
*   每增加一个 Tool，需要：
    1.  Core: 实现 `ITool`。
    2.  Platform: 编写 `XxxManager` (Adapter)。
    3.  Platform: 在 `app.py` 注册实例。
    4.  Frontend: 编写 `XxxPanel.jsx`。
*   **痛点**: 任何参数变更都需要全链路修改。

### 阶段二：通用适配器 (Proposed)
引入 `UniversalToolManager`，利用反射机制统管所有标准工具。

#### 1.1 后端改造
在 `nexus-platform` 中实现自动扫描：

```python
# backend/managers/universal.py
class UniversalManager(BaseManager):
    def __init__(self, base_dir):
        self._registry = {}
        # 1. 自动扫描 nexus-core/plugins 目录
        # 2. 动态 import 所有实现了 ITool 的类
        # 3. 注册到 self._registry = {'ping': PingToolInstance, ...}
    
    def invoke(self, tool_name, command, payload):
        # 通用调用入口
        tool = self._registry.get(tool_name)
        if command == 'run':
            return tool.run(payload, callback=self.generic_callback)
        elif command == 'stop':
            return tool.stop(payload)
```

#### 1.2 前端改造 (Unified Component System)
摒弃 "Auto-Generated UI" 的理想化设计，回归 **Explicit Design**，但通过**高度复用的控件库**来提升效率。

1.  **Component Library**: 建立 `NexusUI` 库，提供标准化的配置组件 (`<IPInput>`, `<DeviceSelector>`, `<LogViewer>`)。
2.  **Tool Panel**: 每个工具**必须**显式实现自己的前端面板 (`PingPanel.jsx`)。
3.  **Communication**: 虽然 UI 是手写的，但通信层依然走 `UniversalManager` 通道。
    ```javascript
    // PingPanel.jsx
    const handleRun = (data) => {
        // 不需要专门写后端接口，直接调用通用通道
        UniversalDriver.invoke('ping', 'run', data);
    }
    ```

## 2. 版本解耦效果

在此架构下，当 **Ping 工具** 升级（例如新增 `timeout` 参数）：

1.  **Core**: 开发者在 `PingTool` 中修改 `run` 逻辑，并更新 `metadata` (用于校验)。
2.  **Platform**: **无需修改**。`UniversalManager` 透传 JSON。
3.  **Frontend**: **需要修改**。开发者需要在 `PingPanel.jsx` 中手动添加一个 `<NumberInput name="timeout" />`。
    *   *权衡*: 虽然牺牲了部分自动化，但换来了**绝对并一致的 UI 掌控力**和**用户体验**。

> **结论**: 平台的稳定性(Platform Stability)得到了保证，工具的迭代只需关注 Core(逻辑) + Frontend(界面)。

## 3. UI 渲染策略 (Unified Design Strategy)

我们放弃 "No-Code" 的幻想，转而追求 "High-Efficiency Code"。

### 策略 A: 标准工具 (Standard Tool)
- **适用**: 绝大多数工具 (Ping, Iperf, MTU Test)。
- **机制**: 
    - **Frontend**: 手写面板，大量拼装 `NexusUI` 的标准组件。
    - **Backend**: 复用 `UniversalManager`，**零后端代码**。
- **优势**: 开发极快（拼积木），体验统一，后端免维护。

### 策略 B: 深度定制工具 (Deep Integration Tool)
- **适用**: 极度复杂场景 (如 Wireless Capture, Spectrum Analyser)。
- **机制**: 
    - **Frontend**: 手写 D3/Canvas 复杂可视化。
    - **Backend**: 如有必要（如共享内存、Root权限流），可保留独立 Manager，否则依然优先使用 `UniversalManager`。

## 4. 实施计划

1.  **Backend**: 实现 `UniversalManager` 与 `PluginLoader`。
2.  **Frontend**: 建立 **NexusUI 组件库** (提取现有的 Form 组件)。
3.  **Frontend**: 改造现有工具 (Ping/Iperf) 为 "策略 A" 模式。
