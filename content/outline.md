# 知识点总表（全量索引）

和课文一一对应。求职前按「面试口头」整表过一遍。内容不因 8 周而删减。

## Python · 第 1 周

| 编号 | 点 | 要能做到 |
|------|----|----------|
| w01-1 | 运行、print、注释 | 激活 venv 跑脚本 |
| w01-2 | 变量、类型、转换、运算 | `// % **`、`=` vs `==` |
| w01-3 | 布尔、逻辑、真值、短路 | 空列表在 if 里的含义 |
| w01-4 | 字符串、切片、方法、f-string、input | input 结果是 str |
| w01-5 | if/elif/else、三元 | 缩进是语法 |
| w01-6 | for/while/range/enumerate/zip/break/continue/for-else | 遍历时不要删原列表 |
| w01-7 | 列表、元组、切片、拆包 | append/sort vs sorted |
| w01-8 | 字典、集合、嵌套取值 | get 与 KeyError；从 choices[0].message.content 取值 |
| w01-9 | 函数、return、作用域、文档字符串、可变默认值 | 陷阱能讲 |
| w01-10 | 推导式 | 读懂过滤列表 |

## Python · 第 2 周

| 编号 | 点 | 要能做到 |
|------|----|----------|
| w02-1 | venv、pip | 解释为什么隔离 |
| w02-2 | pathlib、utf-8、with、读写模式 | 用 `__file__` 定位 |
| w02-3 | JSON ↔ dict | dumps/loads、ensure_ascii、JSONDecodeError |
| w02-4 | 异常、Traceback | 从下往上看；具体 except |
| w02-5 | 默认参数、类型注解 | 不用可变默认值 |
| w02-6 | 类、self、实例状态 | 和函数的区别 |
| w02-7 | 模块、`__main__`、sys.path | 为什么 01_xx.py 不宜当模块名 |
| w02-8 | HTTP JSON 请求长什么样 | url/header/body；401/429 |

## 大模型调用 · 第 3–4 周

| 编号 | 点 | 要能讲清 |
|------|----|----------|
| w03-1 | 网页 vs API、兼容接口 | 只换 base_url/key/model |
| w03-2 | 三角色、请求响应 | content、choices |
| w03-3 | token、窗口、usage、费用 | 不是字数 1:1 |
| w03-4 | 多轮无状态 | 历史要自己拼；过长要截 |
| w03-5 | 流式 | delta |
| w03-6 | temperature、max_tokens | 问答用低温度 |
| w03-7 | 401/429/超时 | 不把 Key 打进日志 |
| w04-1 | 提示词是配置 | 具体、单一职责 |
| w04-2 | 流水线拆步 | 分类再生成 |
| w04-3 | JSON 输出与降级 | 剥 code fence |
| w04-4 | 评测集 | 正例/拒答/边界 |
| w04-5 | 护栏、注入 | 忽略系统提示 |

## RAG · 第 5–6 周

| 编号 | 点 | 要能讲清 |
|------|----|----------|
| w05-1 | 为何 RAG；vs 长 prompt；vs 微调 | |
| w05-2 | chunk、overlap | 太大/太小/切缝 |
| w05-3 | Jaccard 词重叠 | 可跑通的检索 |
| w05-4 | embedding、词袋、余弦公式 | 换向量只换造向量 |
| w05-5 | 引用、空检索拒答 | |
| w05-6 | 失败模式表 | 胡编/答非所问/截断 |
| w06-* | 多文件、README、10 条评测、已知问题 | 作品 |

## Agent · 第 7 周

| 编号 | 点 | 要能讲清 |
|------|----|----------|
| w07-1 | 聊天 / RAG / Agent 何时用 | |
| w07-2 | tool_calls 循环 | 模型只出调用意图 |
| w07-3 | AST 计算器 | 不用 eval |
| w07-4 | 路径逃逸 | resolve + 前缀检查 |
| w07-5 | max_steps、错误回传 | |

## 工程与求职 · 第 8 周

| 编号 | 点 | 要能讲清 |
|------|----|----------|
| w08-1 | FastAPI、Pydantic、/docs | |
| w08-2 | .env、gitignore | |
| w08-3 | 简历两段写满 | |
| w08-4 | 面试 15 问 | 见 w08 课文 |
| w08-5 | 别人按 README 能跑 | |

## 面试口头（完整列表）

1. 网页产品和自己调 API 差在哪？记忆存在哪？
2. system / user / assistant / tool 各自谁产生？
3. token 是什么？和字数？usage 两项？
4. 为什么不能把整本手册塞进一次 prompt？
5. 画 RAG 五框。
6. chunk 太大、太小、没有 overlap 会怎样？
7. 词重叠和余弦各自怎么打分？embedding 换在哪一层？
8. 检索为空为什么不能当普通聊天？
9. RAG 和微调分别解决什么？
10. 评测集为什么要有拒答题和注入题？
11. JSON 输出脏了怎么降级？
12. Agent 的工具到底谁在执行？
13. 为什么不用 eval？路径逃逸是什么？
14. 如何降低幻觉、费用、延迟？
15. FastAPI 比直接跑脚本多了什么？
