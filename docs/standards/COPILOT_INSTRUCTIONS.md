# Copilot 指引 (AI Instructions)

本文档旨在指导 AI 助手 (GitHub Copilot, Cursor AI 等) 如何更好地协助本项目开发。

## 0. 核心交互规则 (Core Interaction Rules)
- **语言**: 你和用户的交流必须 **全程使用中文**。无论用户使用何种语言提问，除非用户明确要求，否则请始终用中文回复。
- **代码**: 代码中的注释、文档字符串也应尽量使用中文。

## 1. 项目上下文 (Context)

- **项目类型**: 桌面应用程序 (Desktop Application)。
- **核心框架**: 
  - 前端: React + Vite + TailwindCSS。
  - 后端: Python + pywebview。
- **运行环境**: Windows (主要), 兼容 Linux/macOS。
- **关键路径**:
  - 前端源码: `frontend/src/`
  - 后端源码: `backend/`
  - 入口文件: `run.py`

## 2. 代码生成原则

1.  **语言偏好**:
    - 代码注释必须使用 **中文**。
    - 用户交互界面 (UI) 默认使用 **英文** (通过 `translations.js` 支持多语言，但 Key 使用英文)。
    - 提交信息建议使用 **中文**。

2.  **技术约束**:
    - **Python**: 优先使用 Python 3.12+ 特性。避免使用已弃用的库。
    - **React**: 必须使用 Functional Components 和 Hooks。禁止使用 Class Components。
    - **样式**: 优先使用 TailwindCSS Utility Classes，避免编写独立的 `.css` 文件 (除 `index.css` 全局样式外)。
    - **图表**: 统一使用 `recharts` 库。
    - **图标**: 统一使用 `lucide-react` 库。

3.  **安全性**:
    - 在 Python 中执行系统命令 (`subprocess`) 时，必须对输入参数进行校验，防止命令注入。
    - 避免在代码中硬编码敏感信息 (如 API Key, 密码)。

4.  **错误处理**:
    - 前后端通信 (`pywebview`) 必须包含错误捕获机制。
    - 前端调用后端 API 时，需处理 `Promise` 的 `catch` 或 `async/await` 的 `try/catch`。

## 3. 常见任务指引

### 新增工具 (Adding a Tool)
1.  在 `backend/app.py` 中添加对应的 `run_<tool>` 和 `stop_<tool>` 方法。
2.  在 `frontend/src/components/` 下创建 `<ToolName>Panel.jsx`。
3.  在 `frontend/src/components/ToolsPanel.jsx` 中注册新工具入口。
4.  在 `frontend/src/App.jsx` 中添加路由/Tab 切换逻辑。
5.  更新 `translations.js` 添加相关文本。

### 修改图表 (Modifying Charts)
- 确保数据源 (`data`) 格式与 Recharts 要求一致 (通常是对象数组)。
- 对于实时数据，注意控制数组长度 (如 `slice(-50)`) 以免内存溢出或渲染卡顿。

## 4. 调试建议

- **前端调试**: 使用浏览器开发者工具 (F12) 查看 Console 日志。
- **后端调试**: `run.py` 中设置 `debug=True` 可开启 pywebview 的调试模式。
- **通信调试**: 关注 `window.dispatchEvent` (Python -> JS) 和 `window.pywebview.api` (JS -> Python) 的调用链路。
