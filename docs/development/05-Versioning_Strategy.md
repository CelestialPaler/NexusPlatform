# Nexus 版本管理与兼容性策略

> **生效日期**: 2026-01-27
> **适用范围**: Nexus Core, Nexus Platform, All Plugins

为了管理各组件独立演进带来的兼容性挑战，我们采用 **语义化版本 (SemVer)** + **API Level 契约** 的混合管理模式。

## 1. 版本架构 (Versioning Architecture)

系统由三个独立演进的实体组成，它们拥有各自的版本号。

### 1.1 Nexus Core (内核)
*   **变量**: `nexus_core.__version__`
*   **角色**: **API 提供者 (Provider)**。
*   **规则**:
    *   **Major (X.y.z)**: 破坏性变更 (如 `ITool` 接口签名修改)。
    *   **Minor (x.Y.z)**: 向下兼容的新特性 (如新增 `BaseManager` 方法)。
    *   **Patch (x.y.Z)**: 内部 Bug 修复。

### 1.2 Nexus Platform (宿主)
*   **变量**: `package.json` (version)
*   **角色**: **集成者 (Integrator)**。
*   **规则**:
    *   通常与 Core 的 Minor 版本保持步调，但 Patch 版本独立。
    *   **Runtime Check**: Platform 启动时会打印 `Loaded Core vX.Y.Z`。

### 1.3 Tools (插件)
*   **变量**: `get_metadata()["version"]`
*   **角色**: **消费者 (Consumer)**。
*   **规则**: 独立演进。Ping 工具可以升级到 v5.0，而 Core 仍停留在 v1.0，只要**所需接口**未变。

## 2. 兼容性握手 (Compatibility Handshake)

为了防止版本不匹配导致的运行时崩溃，所有工具必须在元数据中声明对 Core 的依赖。

### 2.1 声明依赖 (Manifest)
在 `tool.py` 的 `get_metadata` 中新增 `engines` 字段：

```python
def get_metadata(self):
    return {
        "name": "Super Ping",
        "version": "2.1.0",         # 工具本身的版本
        "engines": {
            "nexus_core": ">=1.5.0" # 依赖的最低内核版本
        }
    }
```

### 2.2 运行时检查 (Runtime Guard)
**Manager 层**在加载工具时必须执行以下逻辑：

1.  读取 Tool Metadata。
2.  解析 `engines.nexus_core` 表达式。
3.  获取当前环境的 `nexus_core.__version__`。
4.  **判定**:
    *   **Pass**: 加载工具。
    *   **Fail**: 标记工具为 `Incompatible` (灰色不可点)，并在 UI 显示 "Requires Core v1.5+"。

## 3. GUI 与 Standalone 的同步

由于 Platform (React) 需要根据 Metadata 渲染 UI，这里存在隐式依赖：

*   **UI Schema Versioning**:
    *   如果 Core 引入了新的输入类型 (例如 `type: "date-picker"`), 只有新版 Platform 才能渲染它。
    *   **解决方案**: Metadata 中增加 `ui_schema_version`。
    *   React 前端检查：如果遇到不支持的 UI 类型，降级渲染为文本框或提示升级。

## 4. 发布与 Git 标签 (Release Strategy)

### 4.1 Monorepo Tagging
由于我们在单体仓库中，建议使用 **前缀标签** 区分不同实体的发布：

*   **平台发布**: `v1.5.0` (默认标签，代表整个集成包)
*   **核心发布**: `core-v1.5.0` (仅当 nexus-core 独立发布 PyPI 包时)
*   **工具发布**: `tool-ping-v2.1.0` (仅当工具发生重大变更需标记时)

### 4.2 CHANGELOG 维护
*   **Global CHANGELOG**: 根目录下的 CHANGELOG 记录 Platform 的用户可见变更。
*   **Core CHANGELOG**: `nexus-core/CHANGELOG.md` 记录 API 变更（给工具开发者看）。

## 5. 灾难恢复
如果出现版本严重不匹配（如 Platform v2.0 加载了 v1.0 的旧代码）：
*   **Safe Mode**: Platform 启动时若捕获到 `ImportError` 或 `AttributeError`，应自动禁用对应插件，而不是闪退。
