# 项目编译与运行指南 (Build & Run Guide)

> **适用环境**: Windows (Git Bash), Linux, macOS
> **最后更新**: 2026-01-08

本指南介绍了如何从零开始编译并运行 **Nexus 网络分析平台**。

## 1. 快速开始 (推荐)

我们提供了一个自动化脚本 `build.sh`，可以自动检测环境、安装依赖、编译前端并启动应用。

在 **Git Bash** 中运行：

```bash
# 完整构建并运行
./build.sh

# 如果前端已构建过，仅运行后端 (速度更快)
./build.sh --skip-build
```

---

## 2. 手动构建步骤

如果你想深入了解构建过程，可以按照以下步骤手动操作。

### 2.1 环境准备

*   **Python**: 3.10 或更高版本
*   **Node.js**: 18.0 或更高版本 (用于前端编译)

### 2.2 安装后端依赖

```bash
pip install -r requirements.txt
```

### 2.3 编译前端

前端使用 React + Vite 构建。构建产物将输出到项目根目录的 `/dist` 文件夹中，供后端 Python 脚本调用。

```bash
cd frontend
npm install      # 仅第一次需要
npm run build    # 编译生成静态文件
cd ..
```

### 2.4 启动应用

```bash
python run.py
```

---

## 3. 常见问题 (Troubleshooting)

### Q: `ModuleNotFoundError: No module named 'paramiko'`
**A**: 缺少依赖库。请运行 `pip install -r requirements.txt`。

### Q: 界面显示空白或 "404 Not Found"
**A**: 前端尚未编译或编译失败。确保 `dist/index.html` 文件存在。请重新运行 `./build.sh`。

### Q: `npm` 命令不存在
**A**: 未安装 Node.js 或未添加到环境变量。请安装 Node.js LTS 版本。
