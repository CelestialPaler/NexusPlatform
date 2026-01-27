# Nexus Core API 参考手册

> **最后更新**: 2026-01-27
> **适用版本**: Nexus v1.5+

Nexus Core 是系统的纯逻辑引擎，它不包含任何 React、WebView 或 Windows GUI 的相关代码。

## ITool 接口规范

所有插件（如 Ping, Iperf, DNS 等）都必须实现 `ITool` 接口。

### get_metadata
返回工具的元数据模式 (Schema)。这将驱动可视化编辑器 (Visual Editor) 中的节点生成与 UI 渲染。

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

插件统一存放于 `nexus-core/nexus_core/plugins/` 目录下。

```text
nexus_core/
  plugins/
    category/ (分类目录)
      tool_name/ (工具名称)
        __init__.py
        tool.py      <-- 必须包含 ITool 的具体实现
```

## 数据类型定义

在 `inputs` 中支持以下通用数据类型：

- `string`: 文本输入框。
- `number`: 数字输入框。
- `boolean`: 开关 (Toggle)。
- `file`: 文件选择器 (返回文件路径字符串)。
- `select`: 下拉菜单 (需要在 metadata 中定义 `options` 列表)。
