# 新工具开发指南

如果你想为 Nexus 添加新能力（例如 DNS 分析器），请遵循此标准作业程序 (SOP)。

## 核心实现 (Nexus Core)

首先创建纯逻辑库。**此时不要涉及任何 UI 代码。**

- 进入 `nexus-core/nexus_core/plugins/` 目录。
- 创建文件夹：`network/nexus_dns/`。
- 创建 `tool.py`：
    ```python
    from nexus_core.interfaces import ITool

    class DnsTool(ITool):
        def get_metadata(self):
            return {
                "name": "DNS Analyzer",
                "inputs": {"domain": {"type": "string"}},
                "outputs": {"events": ["dns-result"]}
            }

        def run(self, config, callback=None):
            # 执行查询逻辑...
            result = my_dns_lookup(config['domain'])
            if callback:
                callback('dns-result', result)
            return {"status": "success"}
    ```

## 管理器实现 (Nexus Platform)

创建后端桥梁。

- 进入 `nexus-platform/backend/managers/` 目录。
- 创建 `dns.py`：
    ```python
    from backend.managers.base import BaseManager
    from nexus_core.plugins.network.nexus_dns.tool import DnsTool

    class DnsManager(BaseManager):
        def __init__(self, base_dir):
            super().__init__(base_dir)
            self.tool = DnsTool(base_dir)

        def resolve(self, domain):
            # 回调包装器
            def cb(event, data):
                self.send_to_js({'type': event, 'detail': data})
            
            return self.tool.run({"domain": domain}, callback=cb)
    ```

## 注册 (app.py)

将管理器挂载到主程序。

- 打开 `nexus-platform/backend/app.py`。
- 导入 `DnsManager`。
- 在 `__init__` 中初始化：`self._dns_manager = DnsManager(self.base_dir)`。
- 暴露方法：
    ```python
    def dns_resolve(self, domain):
        return self._dns_manager.resolve(domain)
    ```

## UI 实现 (Frontend)

- 创建 `frontend/src/components/DnsPanel.jsx`。
- 调用 API：
    ```javascript
    const handleCheck = () => {
        window.pywebview.api.dns_resolve("google.com");
    }
    ```
- 监听结果：
    ```javascript
    useEffect(() => {
        window.addEventListener('dns-result', (e) => console.log(e.detail));
    }, []);
    ```

## 提交前检查清单
- [ ] 工具核心代码可独立运行（编写简单的 Python 脚本测试 Core）。
- [ ] 前端 UI 能正确接收并显示事件。
- [ ] 已实现 `start()` 和 `stop()` 方法（如果是长时间运行的任务）。
