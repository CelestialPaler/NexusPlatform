# Nexus 网络分析平台 (Nexus Network Analysis Platform)

欢迎来到 Nexus 单体仓库 (Monorepo)。这里是下一代网络分析工具链的统一代码库。

## 📚 文档中心
> **快速入口**: [技术文档索引](docs/README.md)

- [系统架构概览](docs/architecture/01-System_Overview.md)
- [环境搭建指南](docs/development/01-Setup_and_Build.md)
- [代码贡献规范](docs/development/02-Contribution_Flow.md)

## 🏗️ 项目结构
- **[nexus-core](nexus-core/)**: 纯 Python 逻辑引擎 (插件、工具核心)。
- **[nexus-platform](nexus-platform/)**: 基于 React + PyWebView 的 GUI 应用程序 (Core 的外壳)。
- **[nexus-sdk](nexus-sdk/)**: (规划中) 用于第三方插件开发的 SDK。

## 🚀 快速开始
```powershell
# 初始化环境
运行 VS Code 任务: "🔧 Reinit Python Environment"

# 启动应用
运行 VS Code 任务: "Nexus: 编译并运行 (Build & Run)"
```
