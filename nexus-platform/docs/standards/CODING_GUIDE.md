# 编程规范 (Coding Guide)

## 1. 通用原则

- **语言**: 代码注释、文档、提交信息 (Commit Message) 统一使用 **中文**。
- **国际化 (i18n)**: 软件界面必须支持 **中英双语**。任何 UI 改动或新功能必须同时包含中文和英文的翻译资源。
- **命名**: 变量名使用英文，保持语义清晰。
- **文件编码**: 统一使用 `UTF-8`。

## 2. 前端规范 (React/JS)

### 2.1 命名约定
- **组件文件**: PascalCase (如 `PingPanel.jsx`)。
- **普通文件**: camelCase (如 `utils.js`)。
- **组件名**: PascalCase (如 `function PingPanel() {}`)。
- **状态变量**: `[value, setValue]` 格式。

### 2.2 代码风格
- 使用 Functional Components + Hooks。
- 避免在 `useEffect` 中遗漏依赖项。
- 使用 TailwindCSS 进行样式开发，避免行内 `style` 属性 (动态值除外)。
- 所有的异步操作需处理 `try/catch` 或 Promise 错误。

### 2.3 目录结构
```
src/
  components/   # 业务组件
  assets/       # 静态资源
  hooks/        # 自定义 Hooks
  utils/        # 工具函数
```

## 3. 后端规范 (Python)

### 3.1 命名约定
- **变量/函数**: snake_case (如 `run_iperf_task`)。
- **类名**: PascalCase (如 `NetworkAnalyzer`)。
- **常量**: UPPER_CASE (如 `DEFAULT_TIMEOUT`)。

### 3.2 代码风格
- 遵循 **PEP 8** 规范。
- 使用 Type Hints (类型提示) 增强代码可读性 (推荐)。
- 异常处理: 捕获具体异常而非裸 `except:`。
- 所有的外部命令调用 (`subprocess`) 必须使用绝对路径或安全路径，防止命令注入。

### 3.3 异步与并发
- 耗时操作 (IO 密集型) 使用 `threading` 或 `asyncio`，严禁阻塞主线程 (GUI 线程)。
- 线程间通信尽量减少共享状态，使用队列或事件回调。

## 4. 注释规范

- **文件头**: 每个主要文件开头应简要说明文件用途。
- **函数/方法**: 复杂函数需编写 Docstring (Google Style 或 NumPy Style)，说明参数、返回值和异常。
- **行内注释**: 仅在逻辑复杂处添加，解释“为什么”这样做，而不是“在做什么”。

**示例**:
```python
def calculate_percentile(data, percentile):
    """
    计算给定数据的百分位数。
    
    Args:
        data (list): 数值列表
        percentile (float): 百分位 (0-100)
        
    Returns:
        float: 计算结果
    """
    # ...
```
