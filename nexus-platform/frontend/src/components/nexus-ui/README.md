# Nexus Platform UI Component Kit

统一的 UI 组件库，用于保持应用程序风格一致。位于 `frontend/src/components/common/`。

## 🧩 核心组件 (Core Components)

### 1. Button (按钮)
通用按钮组件，支持多种变体和尺寸。

```jsx
import Button from './nexus-ui/Button';

<Button variant="primary" onClick={handleClick}>保存</Button>
<Button variant="danger" icon={Trash2}>删除</Button>
<Button loading={isLoading}>加载中...</Button>
```

| Prop      | Values                                               | Description      |
| :-------- | :--------------------------------------------------- | :--------------- |
| `variant` | `primary`, `secondary`, `danger`, `success`, `ghost` | 按钮风格         |
| `size`    | `sm`, `md`, `lg`, `icon`                             | 按钮尺寸         |
| `loading` | `boolean`                                            | 是否显示加载转圈 |
| `icon`    | `LucideIcon`                                         | 可选图标组件     |

### 2. Input (输入框)
带样式的输入框，内置标签、错误提示和图标支持。

```jsx
import Input from './nexus-ui/Input';
import { Search } from 'lucide-react';

<Input 
    label="用户名" 
    icon={Search} 
    placeholder="请输入..." 
    error={errors.username}
    helpText="必须包含字母"
/>
```

### 3. Modals (模态框)

#### PromptModal (输入对话框)
替代 `window.prompt`。

```jsx
import PromptModal from './nexus-ui/PromptModal';

<PromptModal
    isOpen={showPrompt}
    title="新建脚本"
    message="请输入脚本名称:"
    placeholder="MyScript"
    onConfirm={(value) => handleCreate(value)}
    onClose={() => setShowPrompt(false)}
/>
```

#### ConfirmModal (确认对话框)
替代 `window.confirm`。

```jsx
import ConfirmModal from './nexus-ui/ConfirmModal';

<ConfirmModal
    isOpen={showConfirm}
    type="danger" // warning, info, danger
    title="删除确认"
    message="确定要删除这个项目吗？此操作无法撤销。"
    onConfirm={handleDelete}
    onCancel={() => setShowConfirm(false)}
/>
```

### 4. Tooltip (悬浮提示)
替代 `title` 属性，提供黑底白字的美观提示。

```jsx
import Tooltip, { InfoParams } from './common/Tooltip';

<Tooltip content="这是详细说明">
    <button>Hover Me</button>
</Tooltip>

// 快捷用法 (小问号图标)
<InfoParams text="点击此处查看更多信息" />
```
