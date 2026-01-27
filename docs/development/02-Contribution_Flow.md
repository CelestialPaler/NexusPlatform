# 代码贡献与分支规范

## 分支策略 (Git Flow)

我们遵循严格的分支模型以确保代码库的稳定性。

- **`master`**: 生产就绪代码。受保护分支。
    - *规则*: 禁止直接 Commit。仅允许通过 Merge Request 合并。
- **`develop`** (可选): 下一版本的集成分支。
- **`feat/<name>`**: 功能开发分支。
    - *示例*: `feat/ipv6-support`, `feat/new-dashboard`
- **`fix/<issue>`**: Bug 修复分支。
    - *示例*: `fix/crash-on-startup`
- **`temp`**: **仅用于同步**。
    - *规则*: 用于在不同机器间传输代码的临时分支。严禁基于 `temp` 分支开发新功能。

## 提交规范 (Commit Standards)

我们强制执行 [Conventional Commits](https://www.conventionalcommits.org/) 规范。详见 Negentropy 标准 05。

### 格式要求
```text
<类型>(<作用域>): <简述>

<详细描述 (可选)>
```

### 类型 (Types)
- `feat`: 新增功能
- `fix`: 修复 Bug
- `docs`: 仅文档变更
- `style`: 格式调整 (不影响代码逻辑)
- `refactor`: 重构 (无新功能也不修 Bug)
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具变更

### 语言要求
- **简述 (Subject)**: 必须使用 **中文**。
- **详细描述 (Body)**: 中文或英文均可。

## 合并请求 (PR/MR) 流程

- **同步**: 确保你的功能分支已合并了最新的 `master` 代码。
- **测试**: 运行本地开发环境脚本 (`scripts/10_run_dev.ps1`) 确保无报错。
- **发起 PR**:
    - 标题: 遵循提交消息格式。
    - 描述: 关联对应的 Issue 或任务 ID。
- **审查**: 等待 AI 或人工审查。
- **合并**: 采用 Squash and Merge (压缩合并) 保持主线整洁。
