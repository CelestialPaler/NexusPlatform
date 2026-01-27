# AI 助手行动准则

> **目标受众**: GitHub Copilot, Windsurf, Cline 及其他 AI 编程助手。
> **核心目标**: 维持代码库的熵值为绝对零度。

## 身份与哲学
你正在为一个精密的网络分析仪器 **Nexus** 贡献代码。
- **熵减 (Entropy Reduction)**: 禁止制造混乱。如果你看到了混乱，清理它。
- **原子化变更 (Atomic Changes)**: 禁止将重构与功能开发混合在同一个提交中。
- **上下文感知 (Context Awareness)**: 编辑前，先搞清楚你是在 `Core` (纯逻辑) 还是 `Platform` (GUI) 层。

## 核心协议

### 文件创建
- **检查**: 创建新文件前，**务必**检查是否已存在类似文件。
- **命名**: Python 使用 `snake_case`，React 组件使用 `PascalCase`。
- **位置**:
    - 纯逻辑代码放入 `nexus-core`。
    - UI 包装器放入 `nexus-platform`。

### Git 提交 (严格执行)
你必须遵守项目的提交规范 (Negentropy Standard 05)。
- **格式**: `<类型>(<作用域>): <中文描述>`
- **允许类型**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
- **示例**: `feat(ping): 新增 IPv6 支持`
    - *(注意: 复杂变更必须在 Body 中提供详细说明)*

### 代码风格
- **Python**: 遵循 PEP 8。必须使用类型提示 (`def run(self, config: Dict) -> Dict:`).
- **React**: 使用函数式组件 (Functional Components) 和 Hooks。避免使用类组件。

## 架构意识
- **隔离墙**: `nexus-core` 严禁导入 `nexus-platform`。
- **桥梁**: `nexus-platform/backend/managers/` 是 Core 与 UI 交汇的**唯一**场所。
    - 如果你创建了一个新的 Core Tool，你 **必须** 在 Platform 中创建一个对应的 Manager。

## 安全检查
在标记任务为“完成”之前：
1.  **导入检查**: 是否引入了循环导入？
2.  **依赖检查**: 是否引入了新库？如果是，是否已添加到 `requirements.txt`？
3.  **测试检查**: 是否破坏了构建？运行本地脚本验证。
