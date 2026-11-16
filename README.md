# dsh-quick-jump

把数字键绑到「侧栏面板 / 置顶会话 / 会话」的顺序位置上，一个键切过去。

## 功能

- `⌘1`–`⌘9`（Windows `Ctrl+1`–`Ctrl+9`，浏览器端默认 `⌘⌥1`–`⌘⌥9`）直达第 N 项。
- 两种排序，在 **设置 › 通用** 的「数字键直达」一行切换：
  - **会话优先**（默认）：置顶会话在前（最近置顶的排第 1），然后是其余会话，按侧栏顺序。
  - **面板优先**：侧栏面板行在前（工作台、看板、插件页等按侧栏顺序），然后是同样的会话序列。
- 越界不动作；已归档会话和空占位会话不计入。
- 键位是宿主的普通命令，可在 **设置 › 快捷键** 里重绑、清除或恢复默认。

## 安装

从 GitHub 装进 profile（`<profile>` 换成你的 profile 名，桌面版通常是 `desktop`）：

```
dsh plugin --profile <profile> add github:everywan/dsh-quick-jump
```

钉版本就把 ref 加上：

```
dsh plugin --profile <profile> add github:everywan/dsh-quick-jump#v0.1.0
```

本机改代码时用 link 安装，改动不用重新发布：

```
dsh plugin --profile <profile> add link:/path/to/dsh-quick-jump
```

装完重启 DSH。也可以在插件管理页用「添加插件」填入同样的地址。

## 已知限制

- 会话顺序按侧栏分组顺序计算（工作区顺序 → 工作区内顺序），侧栏收起不影响编号。
- 浏览器版里 `⌘/Ctrl+数字` 被浏览器标签页占用，所以 Web 默认是 `⌘⌥/Ctrl+Alt+数字`；桌面版不受影响。
- 面板数量大于 9 时，后面的面板拿不到编号。
