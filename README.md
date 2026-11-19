# SCU CS 综测记录

适配手机的德、智、体、美、劳与综合评价记录网页，按2025年版细则分层浏览。

- 模块显示已得分、最高分和提交状态。
- 最多四级菜单，具体分档和出处放在详情中。
- 提交后以绿色区分，修改后回到待提交。
- 记录保存在当前浏览器，不上传学校系统，不跨设备同步。
- 综合分使用专业学习成绩及五育核定分；原文存在歧义的计分口径在详情中说明，最终以学院认定为准。

直接打开 `index.html` 即可使用，无需安装依赖。它已内嵌全部样式、规则和计分程序。

## 维护与检查

修改 `app.js`、`styles.css` 或 `scoring.js` 后，运行：

```sh
python build.py
node --check app.js
node scoring.test.js
```

`source-data.json` 保存规则层级；`build.py` 生成 `data.js` 和独立网页。个人填写记录仅存在浏览器中，不包含在仓库文件内。

## 部署

GitHub 仓库 Settings → Pages → Deploy from a branch，选择 `main` 分支和根目录后保存。

使用方式详见 [使用说明](使用说明.md)。
