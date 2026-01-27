# Nexus 动态插件加载架构 (Dynamic Plugin System)

> **目标**: 解除 Core 工具更新与 Platform 代码发布之间的强耦合。
> **现状**: 需要手动编写 Manager 和 App 路由。
> **未来**: 基于元数据的自动发现与动态 UI 生成。

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

#### 1.2 前端改造 (Schema-Driven UI)
引入 **Visual Builder** 概念。不再手写表单，而是根据 Metadata 自动生成。

1.  Frontend 调用 `get_all_tools_metadata()`。
2.  遍历列表，为每个工具生成一个 Card。
3.  点击进入，根据 `inputs` schema 渲染表单：
    *   `type: string` -> `<input type="text">`
    *   `type: boolean` -> `<Switch>`
    *   `type: select` -> `<Select>`
4.  点击“运行” -> 调用 `invoke(tool_name, 'run', form_data)`。

## 2. 版本解耦效果

在此架构下，当 **Ping 工具** 升级（例如新增 `timeout` 参数）：

1.  **Core**: 开发者在 `PingTool` 中修改 `metadata` 和 `run` 逻辑。
2.  **Platform**: **无需修改**。`UniversalManager` 不关心具体参数，只负责透传 JSON。
3.  **Frontend**: **无需修改**。动态表单引擎会自动读取新 metadata 并渲染出 `Timeout` 输入框。

> **结论**: 工具的迭代将不再触发 Platform 的发版。Platform 真正退化为纯粹的“操作系统”。

## 3. 特殊情况处理 (Escape Hatch)

对于像 `WirelessCapture` 这样需要复杂交互（实时绘图、特殊文件流处理）的工具：

*   保留 **自定义 Manager** 机制。
*   在 Metadata 中标记 `"ui_mode": "custom"`。
*   前端看到此标记，加载专门的 React 组件；否则使用通用渲染器。

## 4. 实施计划

1.  **Refactor**: 在 `nexus-core` 中完善 `Metadata` 规范，确保所有输入字段都有明确 UI 定义。
2.  **Backend**: 实现 `PluginLoader`，能够遍历 Python 包并实例化插件。
3.  **Frontend**: 开发 `DynamicToolRunner` 组件。
