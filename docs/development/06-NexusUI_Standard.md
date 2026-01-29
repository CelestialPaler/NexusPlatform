# NexusUI 组件库开发规范 (Component Standards)

> **核心目标**: 确保手写的前端代码具有 "Low-Code" 般的开发效率与一致性。
> **命名空间**: `@/components/nexus-ui`

## 1. 核心设计原则 (Design Principles)

### 1.1 原子化 (Atomic)
每个组件应当是无状态的（Stateless）或自包含状态的，且不依赖于具体的业务逻辑（如具体的 Tool ID）。

### 1.2 组合优于继承 (Composition > Inheritance)
通过 `wrapperClassName` 和 `children` 提供灵活性，而不是创建大量特定的 Props。

### 1.3 显式接口 (Explicit Interface)
所有表单类组件必须遵循统一的 Props 签名，从根本上降低认知负荷。

## 2. 统一 API 签名 (Standard Props)

所有 **Input/Form 类组件** 必须实现以下接口：

| Prop 参数名        | 类型         | 必须    | 说明                          | 示例                   |
| :----------------- | :----------- | :------ | :---------------------------- | :--------------------- |
| `label`            | `string`     | No      | 字段标题，位于上方            | `"目标 IP"`            |
| `error`            | `string`     | No      | 错误信息，位于下方红字        | `"IP 格式不正确"`      |
| `helpText`         | `string`     | No      | 帮助文本，位于下方灰字        | `"支持 IPv4/IPv6"`     |
| `className`        | `string`     | No      | **输入框本体-核心元素**的样式 | `bg-red-500`           |
| `wrapperClassName` | `string`     | No      | **最外层容器**的样式          | `mb-4 w-1/2`           |
| `icon`             | `LucideIcon` | No      | 左侧装饰图标                  | `Search`               |
| `ref`              | `Ref`        | **Yes** | 必须支持 `forwardRef`         | (用于 React Hook Form) |

## 3. 代码模板 (Boilerplate)

新建组件时，请直接复制此模板：

```jsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 1. 统一的样式合并工具
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// 2. 必须使用 forwardRef
const MyComponent = React.forwardRef(({ 
    label, 
    error, 
    className, 
    wrapperClassName, 
    helpText, 
    ...props // 3. 透传其余原生 props (onChange, onBlur 等)
}, ref) => {
    return (
        <div className={cn("w-full", wrapperClassName)}>
            {/* Label 区 */}
            {label && (
                <label className="block text-sm font-medium text-gray-400 mb-1 ml-1">
                    {label}
                </label>
            )}
            
            {/* 核心控件区 */}
            <div className="relative">
                <input
                    ref={ref}
                    className={cn(
                        "w-full bg-white dark:bg-gray-900 border rounded-md px-3 py-2",
                        // 错误状态自动处理
                        error ? "border-red-500" : "border-gray-700",
                        className
                    )}
                    {...props}
                />
            </div>
            
            {/* 提示信息区 */}
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
            {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
        </div>
    );
});

MyComponent.displayName = 'MyComponent'; // 4. 调试名称
export default MyComponent;
```

## 4. 目录结构规范

```text
nexus-platform/frontend/src/components/nexus-ui/
├── index.js          # Barrel Export (必须更新此文件导出新组件)
├── Button.jsx        # 基础组件
├── Input.jsx
├── Select.jsx
├── Switch.jsx
├── LogConsole.jsx
├── Layout/           # 布局类组件 (可选)
│   ├── Card.jsx
│   └── SplitView.jsx
└── DataDisplay/      # 数据展示类 (可选)
    ├── JsonView.jsx
    └── HexViewer.jsx
```

## 5. 引用规范

禁止直接引用具体文件，必须从索引引用：

*   ❌ `import Input from '@/components/nexus-ui/Input';`
*   ✅ `import { Input } from '@/components/nexus-ui';`
