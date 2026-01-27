# 版本管理规范 (Version Control)

## 1. 分支管理 (Branching Strategy)

本项目采用简化版的 **Git Flow** 模式。

- **main**: 主分支，存放随时可部署的稳定代码。
- **develop**: 开发分支，集成了最新的开发功能。
- **feature/**: 功能分支，从 develop 检出，开发完成后合并回 develop。
  - 命名: `feature/功能名` (如 `feature/advanced-ping`)
- **fix/**: 修复分支，用于修复 bug。
  - 命名: `fix/bug描述` (如 `fix/chart-render-error`)

## 2. 提交信息规范 (Commit Messages)

统一使用 **Conventional Commits** 规范，并使用 **中文** 描述。

### 格式
```
<类型>(<范围>): <描述>

[可选的正文]
```

### 类型 (Type)
- **feat**: 新功能 (feature)
- **fix**: 修补 bug
- **docs**: 文档修改
- **style**: 代码格式修改 (不影响代码运行的变动)
- **refactor**: 重构 (即不是新增功能，也不是修改 bug 的代码变动)
- **perf**: 性能优化
- **test**: 增加测试
- **chore**: 构建过程或辅助工具的变动

### 示例
- `feat(ping): 增加高级 Ping 分析面板`
- `fix(iperf): 修复实时日志显示延迟的问题`
- `docs(readme): 更新项目安装文档`
- `refactor(backend): 重构 subprocess 调用逻辑`

## 3. 提交流程

1.  拉取最新代码: `git pull origin develop`
2.  创建分支: `git checkout -b feature/new-feature`
3.  开发并提交: `git commit -m "feat: ..."`
4.  推送到远程: `git push origin feature/new-feature`
5.  发起 Pull Request (PR) 请求合并到 `develop`。

## 4. 版本号规范

遵循 **Semantic Versioning 2.0.0** (语义化版本)。

- **主版本号 (Major)**: 当你做了不兼容的 API 修改。
- **次版本号 (Minor)**: 当你做了向下兼容的功能性新增。
- **修订号 (Patch)**: 当你做了向下兼容的问题修正。
