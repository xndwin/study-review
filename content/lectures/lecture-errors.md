# 全程易错点（求职常被问）

和课文、讲义对照，不替代 `lessons/`。

## Python

- `=` 赋值，`==` 比较。和 `None` 用 `is`。
- `input()` 永远是 str；`int("hi")` 会 ValueError。
- `for x in xs` 里不要增删 `xs`。
- `[]` 空列表，`{}` 空字典，`set()` 空集合。
- 函数用 `return`；不要用 `[]` 当默认参数。
- `sorted` 出新列表，`sort` 原地改。
- 嵌套取值：`resp["choices"][0]["message"]["content"]`。
- 中文读写写 `encoding="utf-8"`；路径用 `Path(__file__)`。
- `ensure_ascii=False` 才能在 JSON 文件里看见中文。
- except 写具体类型；Traceback 从下往上看。
- `__name__ == "__main__"`：直接运行才是主程序。

## 调模型

- 网页记忆在对方服务器；API 的 history 要自己存。
- system / user / assistant / tool 谁写的，面试必问。
- token ≠ 字数；usage 两项都计费。
- 401=Key；429=限流。Key 只打前四位。
- 提示词是仓库里的配置，不是聊天习惯。
- JSON 先剥 \`\`\` 再 loads，失败要降级。
- 「忽略以上指令」仍以代码里的 system 为准。

## RAG / Agent

- 长 prompt、微调、RAG 三件事：窗口、权重、可更新文档。
- chunk 太大噪音、太小切断、无 overlap 丢缝。
- Jaccard 是交集/并集；余弦是夹角；embedding 只换造向量。
- 空检索必须拒答，不能当闲聊，否则幻觉营收。
- 资料里不要写「本公司没有营收」这种句子，否则检索会误命中。
- 工具由你的 Python 执行；模型只出调用意图。
- 不用 `eval`；路径 `resolve` 后必须落在 data/ 内。
- 能 RAG 解决的不要上 Agent。

## 工程

- FastAPI 多了路由、校验、`/docs`。
- `.env` 不进 git；别人按 README 能跑才算作品完成。
