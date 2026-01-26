# 🛠️ Nexus Platform 脚本库 (Scripts)

这里存放了 **Nexus Network Analysis Platform** 的所有构建、测试和运行脚本。为了保持项目根目录的整洁，将它们统一归档于此。

> **注意**: 所有的 `.ps1` 和 `.sh` 脚本已配置为自动定位到项目根目录，您可以直接在此目录运行它们，无需手动切换路径。

## 📂 脚本列表

| 脚本文件                | 平台      | 描述                                                             |
| :---------------------- | :-------- | :--------------------------------------------------------------- |
| **`build_and_run.ps1`** | Windows   | **[推荐]** 一键构建前端并启动后端。适用于开发调试。              |
| **`build.ps1`**         | Windows   | 仅执行构建流程 (前端 `npm run build` + 资源复制)，不运行程序。   |
| **`build_release.ps1`** | Windows   | **[发布]** 生成无窗口的纯净 Release 版本，输出至 `bin/release`。 |
| **`build_debug.ps1`**   | Windows   | **[调试]** 生成带控制台窗口的 Debug 版本，输出至 `bin/debug`。   |
| **`test_launch.ps1`**   | Windows   | 测试启动脚本。会自动杀掉残留进程，启动后端并检查是否正常运行。   |
| **`build.sh`**          | Linux/Mac | Linux 环境下的构建脚本 (Git Bash 兼容)。                         |

## 🚀 使用指南

### 1. 开发模式 (构建 + 运行)

这是最常用的脚本，它会先编译 React 前端，然后启动 Python 后端。

```powershell
./build_and_run.ps1
```

### 2. 发布打包 (Build)

按照用途选择不同的构建脚本：

*   **发布正式版 (Release)**: 无黑框，适合最终交付。
    ```powershell
    ./build_release.ps1
    ```
    产物位于: `bin/release/`

*   **构建调试版 (Debug)**: 带控制台黑框，显示详细日志，适合排查崩溃问题。
    ```powershell
    ./build_debug.ps1
    ```
    产物位于: `bin/debug/`

### 3. 仅构建前端

如果你只修改了前端代码，想更新 `dist/` 资源：

```powershell
./build.ps1
```

---

## ⚠️ 常见问题

*   **执行策略错误**: 如果 PowerShell 提示禁止运行脚本，请以管理员身份运行 PowerShell 并执行:
    ```powershell
    Set-ExecutionPolicy RemoteSigned
    ```
*   **路径问题**: 脚本内部会自动执行 `cd ..` 切换到项目根目录，因此请确保保持 `scripts/` 文件夹相对于项目根目录的位置不变。
