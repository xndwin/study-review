# 现行学法（2026-11-17）

课文 `lessons/` 不删。学到调用模型、结构化输出、RAG 和工具时，以这一页和供应商当天的文档为准。模型名、域名、价格和某个参数是否支持都会变，写进代码前打开官方页核对。

这一页只记录应用开发还在用的接口。预训练、推理引擎和多 Agent 平台仍不作为这半年的主线。

2026-11-17 核对过的来源：

- [Migrate to the Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)：OpenAI 新项目用 Responses。Chat Completions 仍可用。Assistants API 已于 2026-08-26 停用。
- [Chat Completions](https://developers.openai.com/api/reference/resources/chat)：页面写明新项目去看 Responses。
- [DeepSeek 第一次调用](https://api-docs.deepseek.com/)：同时给出 OpenAI 兼容和 Anthropic 兼容。当天示例模型是 `deepseek-flash`。
- [DeepSeek 聊天机器人](https://api-docs.deepseek.com/guides/build_a_chatbot/)：Messages、Responses、Chat Completions 三条路径都列着。
- [DeepSeek 工具调用](https://api-docs.deepseek.com/guides/tool_calls.md)：工具仍由调用方执行；思考模式和普通模式的限制不同。
- [通义 OpenAI 兼容 Chat](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)：当天仍用 Chat Completions。`base_url` 带业务空间，按账号地域从帮助页抄。
- [通义多轮对话](https://help.aliyun.com/zh/model-studio/multi-round-conversation)：Chat Completions 的历史要自己拼；Responses 被标成另一条更省事的多轮路径。
- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)、[checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers)。

## 现在写哪套接口

两家都要能跑的作业，用 Chat Completions：`messages`、`tools`、`stream`、`response_format`。2026-11-17 通义帮助页仍把它当作兼容入口，DeepSeek 也还提供 `POST /chat/completions`。所以第 9 周互换供应商时，只改 `base_url`、密钥和模型名。

OpenAI 自家的新项目用 Responses。DeepSeek 同样提供 `POST /responses`。通义把 Responses 写成多轮对话的另一条路径。简历里要能说出差别：

| | Chat Completions | Responses |
|---|---|---|
| 请求 | `messages` | `input`，系统要求放在 `instructions` |
| 结果 | `choices[0].message` | `output` 里的条目；SDK 可用 `output_text` |
| 结构化输出 | `response_format` | `text.format` |
| 流式 | `choices[].delta` | 事件类型不同，解析代码不能混用 |
| 多轮 | 自己保存并重发历史 | 可用 `previous_response_id` 或会话接口；自己保存历史仍然有效 |

Assistants API 已经停用。看到 threads、assistants 的旧教程，不要照抄。

Chat Completions 里的旧字段 `function_call` 已由 `tools` / `tool_calls` 代替。Responses 里的 `function_call` 是输出条目的类型名，和那个旧字段不是同一个东西。

从 GPT-5.4 起，OpenAI 的 Chat Completions 在 `reasoning_effort` 不是 `none` 时不做工具调用。要同时用推理和工具，走 Responses。国内模型的思考开关以当天文档为准：DeepSeek 示例放在 `thinking.type` 和 `reasoning_effort`；通义示例放在 `extra_body`。

## 模型名和地址

模型名从控制台或当天模型列表抄进环境变量，不写死在业务代码里。2026-11-17 DeepSeek 文档的示例名是 `deepseek-flash`，由当时的 V4 系列 Flash 提供；旧名即使还能转发，也不要写进新代码。通义页面上同时出现 `qwen-plus`、`qwen4-max` 等名字，以你账号里能开通的那个为准。

参考脚本里如果还印着 `deepseek-chat`，那是旧示例。运行前改成环境变量里的模型名。

通义的 `base_url` 按地域和业务空间从帮助页抄。北京地域当天写的是带 `{WorkspaceId}` 的 `maas` 地址。控制台如果给你另一条地址，以控制台为准。

## 结构化输出

1. Chat Completions 上，供应商支持时用 `response_format` 的 `json_schema`，并设严格模式。Responses 上改放到 `text.format`。
2. 不支持时，退到 `json_object`，或在提示里要求只输出 JSON。
3. 两种都要在自己的代码里校验字段、枚举和空值。schema 不管业务规则，例如「分数必须在 0 到 100」仍由代码判断。
4. 模型拒绝、输出截断、接口报错，要和「JSON 合格」分开处理。

## 检索

项目一保持固定顺序：切块、召回、再生成。厂商自带的网页搜索是另一项能力，例如 DeepSeek 的 `deepseek_web_search`。它可以回答公开网页上的问题，不能代替你自己的文档、权限和引用评测。

词匹配和向量都留下。两路各取若干段，按来源去重，再交给生成。

索引旁记下 embedding 模型名。换模型或换维度，就重建索引。模型名从供应商当天的文档抄。

评测分开记两列：检索有没有找到标注证据；回答里的事实有没有被引用片段支撑。人工核对是依据。用模型给模型打分只能当辅助，而且要另记费用。

## 工具和人工确认

工具由你声明 JSON Schema，模型只返回想调用的名字和参数。真正执行的是你的 Python。参数先校验，再调用白名单里的函数。

DeepSeek 写明：Chat Completions 不能在对话中途插入一条不是模型自己产生的工具调用；Responses 和 Anthropic Messages 可以。第 17 周如果要插入这种记录，就用 Responses 那一条路径，并在笔记里写明当时哪家支持。

迁到 LangGraph 时：

- 图在进入需要人决定的节点里调用 `interrupt()`。
- 编译时带上 checkpointer。学习用 SQLite 这类会落盘的实现。
- 每次调用带同一个 `thread_id`。
- 人做出决定后，用 `Command(resume=...)` 继续。
- 「没有确认不能写入」仍由你的规则和测试保证。
