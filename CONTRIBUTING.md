# 参与贡献

感谢你愿意改进 Tabstead。

## 提交问题

为了便于复现，请尽量提供：

- Chrome 版本与操作系统
- 清晰的复现步骤
- 预期行为和实际行为
- `chrome://extensions` 中的扩展错误信息或截图
- 问题是否在重新加载扩展后仍然出现

请勿在公开问题中提交账号、私人网址、Cookie、访问令牌或其他敏感信息。

## 本地开发

项目没有构建步骤：

1. Fork 或克隆仓库。
2. 在 `chrome://extensions` 开启开发者模式。
3. 通过“加载已解压的扩展程序”选择仓库中的 `src` 目录。
4. 修改代码后，在扩展管理页点击“重新加载”。

提交前运行：

```bash
node --check src/background.js
node --check src/sidepanel.js
node --check src/theme-init.js
python3 -m json.tool src/manifest.json >/dev/null
python3 scripts/package_extension.py
```

并至少手动验证：

- 打开、切换、关闭和新建标签
- 顶部固定入口及浏览器重启后的恢复
- 固定文件夹的保存、打开、移入和移出
- 同站点临时标签聚合
- 重复标签复用、手动复制和重复清理
- Chrome 原生标签组展示
- 长列表滚动和窄侧边栏布局

## 修改原则

- 默认只管理当前窗口。
- 优先保持操作可撤销，避免静默改变用户标签结构。
- 不修改 Chrome 原生标签组中语义不明确或不可恢复的状态。
- 保持界面克制，非必要信息按需出现。
- 新权限、新网络请求或新的持久化数据必须在 README 和隐私说明中同步解释。
