# Nexus Core API 参考手册

> 文档状态: Draft
> 文档角色: 核心层 API 与插件模型参考
> 适用范围: `nexus-core`、`nexus-contracts`、插件开发与工具实现
> 最后更新: 2026-04-21
> 说明: 本文档已按当前仓库结构补充状态说明，但内容仍保留部分旧插件模型表述，后续需继续与真实代码和契约边界对齐。

Nexus Core 是系统的逻辑实现层，它不负责 React 界面、pywebview 宿主或平台专属桌面壳逻辑。

当前阶段应这样理解它的边界：

1. `nexus-core` 负责工具实现、分析逻辑和运行时能力。
2. `nexus-contracts` 负责共享类型、装饰器和通用异常等公共契约。
3. `nexus-platform` 负责桌面宿主、前后端桥接和交互呈现。

如果本文档与当前仓库治理基线冲突，应优先以 `docs/00-设计概要.md` 和 `docs/development/11-Repository_Governance_Baseline.md` 为准。

## ITool 接口规范

当前代码中，工具运行时接口 `ITool` 仍定义在：

1. `nexus-core/nexus_core/interfaces.py`

所有走当前运行时工具模型的插件（如 Ping、iPerf 等）都应围绕该接口实现。

### get_metadata
返回工具的元数据模式（Schema）。这类元数据会影响工具描述、输入输出约束和上层界面或运行时的消费方式。

**代码示例**:
```python
{
    "name": "Ping Tool",
    "description": "基础 ICMP 回显请求工具",
    "version": "1.0.0",
    "inputs": {
        "target": {"type": "string", "default": "8.8.8.8", "label": "目标 IP/域名"},
        "count": {"type": "number", "default": 4, "label": "发包数量"}
    },
    "outputs": {
        "events": ["ping-update", "ping-complete"]
    }
}
```

### run

执行工具的主要逻辑。

*   **config**: 字典类型，必须匹配 metadata 中定义的 `inputs` 结构。
*   **callback(event_name, payload)**: (可选) 回调函数，用于向上传递实时事件数据。

**返回值**:
必须返回一个简单的确认字典，例如 `{"status": "started", "pid": 1234}`。
**注意**: 严禁在 `run()` 中阻塞主线程执行耗时任务。请使用线程 (threading) 或子进程 (subprocess)，并通过 `callback` 异步报告结果。

### stop

清理资源，终止正在运行的工具实例。

## 插件目录结构

当前插件主要位于：

1. `nexus-core/nexus_core/plugins/`

现阶段这是逻辑层能力的主要组织目录，但并不意味着未来所有契约都继续放在 `nexus-core` 内部。

```text
nexus_core/
  plugins/
    category/ (分类目录)
      tool_name/ (工具名称)
        __init__.py
        tool.py      <-- 必须包含 ITool 的具体实现
```

## 数据类型定义

如果插件或节点实现需要共享类型、装饰器或异常，应优先查看 `nexus-contracts` 中的公共定义，而不是在工具实现里重复发明一套平行结构。

在 `inputs` 中支持以下通用数据类型：

- `string`: 文本输入框。
- `number`: 数字输入框。
- `boolean`: 开关 (Toggle)。
- `file`: 文件选择器 (返回文件路径字符串)。
- `select`: 下拉菜单 (需要在 metadata 中定义 `options` 列表)。
