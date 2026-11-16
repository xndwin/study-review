# 现行学法（2026-11-16）

课文 `lessons/` 不删。学到调用模型、结构化输出、RAG 和工具时，以这一页和供应商当天的文档为准。模型名、价格和某家是否支持某个参数都会变，写进代码前打开官方页核对。

来源：

- [Chat Completions](https://developers.openai.com/api/reference/resources/chat)：仍可用。新接 OpenAI 自家平台时，文档建议改看 Responses API。
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)：`json_schema` 能约束字段；`json_object` 只保证是 JSON。
- [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)：两套流式事件不一样，解析代码不能混用。
- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)、[checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers)：暂停用 `interrupt()`，恢复用 `Command(resume=...)`，靠 `thread_id` 找到存档。
- [Evaluate a RAG application](https://docs.langchain.com/langsmith/evaluate-rag-tutorial)：检索质量和回答质量分开打分。

## 调用哪套接口

国内供应商的兼容接口仍是 Chat Completions：`messages`、`tools`、`stream`、`response_format`。`a09` 的两家供应商就用这一套，只改 `base_url`、密钥和模型名。

OpenAI 文档把 Responses API 标成自家新项目的入口。它的流式事件是分类型的，不是 Chat Completions 里的 `choices[].delta`。本计划不把 Responses 当作第一套代码，因为两家兼容供应商对不齐。简历里要能说出两套接口的差别。

旧字段 `function_call` 已由 `tools` / `tool_calls` 代替。看到只教 `function_call` 的例子，不要照抄。

## 结构化输出

1. 供应商支持时，用 `response_format` 的 `json_schema`，并设严格模式。
2. 不支持时，退到 `json_object`，或在提示里要求只输出 JSON。
3. 两种都要在自己的代码里校验字段、枚举和空值。schema 不管业务规则，例如「分数必须在 0 到 100」仍由代码判断。
4. 模型拒绝、输出截断、接口报错，要和「JSON 合格」分开处理。

## 检索

项目一保持固定顺序：切块、召回、再生成。不要先做成「由模型决定要不要检索」的 Agentic RAG。那是项目二才会碰到的选择。

词匹配和向量都留下。比较之后做一个简单合并：两路各取若干段，按来源去重，再交给生成。不要比较完只留一路。

索引旁记下 embedding 模型名。换模型或换维度，就重建索引，不把旧向量和新向量混在同一次检索里。模型名从供应商当天的文档抄，不写死已经退市的名字。

评测至少分开记两列：检索有没有找到标注证据；回答里的事实有没有被引用片段支撑。和标准答案是否一致、回答是否对准问题，可以再记，但不要合成一个模糊分数。人工核对是依据。用模型给模型打分只能当辅助，而且要另记费用。

## 工具和人工确认

工具由你声明 JSON Schema，模型只返回想调用的名字和参数。真正执行的是你的 Python。参数先校验，再调用白名单里的函数。

迁到 LangGraph 时：

- 图在进入需要人决定的节点里调用 `interrupt()`。
- 编译时带上 checkpointer。学习用 SQLite 这类会落盘的实现。只放在内存里的存档，进程一关就恢复不了。
- 每次调用带同一个 `thread_id`，才能读到上次的存档。
- 人做出决定后，用 `Command(resume=...)` 继续。不要新开一个空线程假装恢复。
- 业务上「没有确认不能写入」仍由你的规则和测试保证，不交给模型说一句「用户已同意」。

官方还有一种由模型决定何时检索的图教程。项目一不要从那篇教程起手。
