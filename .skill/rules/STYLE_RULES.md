# 开发规范

## 样式规范

### 禁止内联样式

**没有特殊情况禁止写内联样式，样式必须统一写在样式文件中。**

- ✅ 使用 SCSS 文件编写样式
- ✅ 使用 `className` 绑定样式类名
- ✅ 推荐使用 **CSS Modules**（`.module.scss`），避免类名冲突
- ❌ 禁止在 JSX/TSX 中使用 `style={{}}` 内联样式
- ❌ 禁止使用 `styled-components` 等 CSS-in-JS 方案

**例外情况：**
- 动态计算的值无法预先定义类名时（如拖拽位置、滚动偏移量等运行时数据）
- 第三方组件强制要求的 style 属性

### CSS Modules 使用规范

- 页面级组件使用 `index.module.scss`，与页面同名
- 组件级样式使用 `组件名.module.scss`
- 全局通用样式放在 `index.scss`
- 导入方式：`import styles from './xxx.module.scss'`
- 使用方式：`className={styles.className}`
