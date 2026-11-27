# 现行学法（2026-11-27 精炼版）

课文 `lessons/` 原文保留不删。学到第 9 周后（模型接口、结构化输出、RAG、工具调用），以本页和厂商当天文档为准。

2026-11-17 核对来源：
- [Migrate to Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses) · [Chat Completions](https://developers.openai.com/api/reference/resources/chat)（Assistants API 已于 2026-08-26 停用）
- [DeepSeek 文档](https://api-docs.deepseek.com/) · [聊天指南](https://api-docs.deepseek.com/guides/build_a_chatbot/) · [工具调用](https://api-docs.deepseek.com/guides/tool_calls.md)
- [通义兼容接口](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions) · [多轮对话](https://help.aliyun.com/zh/model-studio/multi-round-conversation)
- [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) · [checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers)

## 现在写哪套接口

- **跨厂商通用作业写 Chat Completions**：通义、DeepSeek 均兼容，换厂商只改 `base_url`、`api_key`、`model`。
- **新项目与面试需认识 Responses**：OpenAI 主推、DeepSeek 等已支持。

| 对比项 | Chat Completions | Responses |
|---|---|---|
| 输入字段 | `messages` 列表 | `input` 放提问，`instructions` 放系统规则 |
| 取回答正文 | `choices[0].message.content` | `response.output_text` |
| 结构化输出 | `response_format` | `text.format` |
| 流式增量 | `choices[0].delta.content` | 事件格式不同，解析代码不可混用 |
| 多轮历史 | 自己保存并每次重发 | 可自己重发，也可传 `previous_response_id` |

避坑：不学已停用的 Assistants / Threads；工具调用统一用 `tools` / `tool_calls`（不用旧 `function_call` 参数）；GPT-5.4 起推理思考配工具调用需走 Responses。

## 模型名和地址

模型名与 `base_url` 统一放 `.env` 环境变量，不写死在代码里（例如 `deepseek-flash`、`qwen-plus` 等按当天控制台列表填写）。

## 上下文管理（省钱与防错）

1. **固定内容放最前（前缀缓存）**：两次请求开头文字完全相同时，厂商直接复用缓存，输入费省一半以上且响应更快。把不变的「系统规则 + 工具定义」放最前，每轮变化的「检索片段 + 最新提问」放末尾。
2. **按需给工具和资料**：不把几十个工具一次全塞进请求，先分类再挂载相关工具，减少噪音与“中间迷失”。
3. **长流程状态存数据库**：多步工单把当前进度落库，每轮只发精简状态快照，不靠无限堆聊天记录。
4. **外部文本加隔离框，权限靠代码拦**：用户文档或工单用 `<context>...</context>` 包裹，声明仅作资料不作指令；谁能读哪篇文档、能否写库必须由 Python / SQL 强制校验。

## 结构化输出

1. 厂商支持时优先开 `json_schema` 严格模式；不支持则降级用 `json_object`。
2. 拿到 JSON 后必须用代码再查业务范围、枚举与空值（如分数必须在 `0–100`）。
3. 把「接口报错、模型拒答、超长截断、合格 JSON」四类情况分开处理。

## 检索（知识库 RAG）

固定流程：**切块 → 召回 → 生成**（厂商自带联网搜索只查公开网页，不能替代私有文档与权限校验）。

1. **切块加抬头（防丢主语）**：每段入库前拼上 `[文档名 | 章节 | 版本]`，避免切出孤立一句“超 7 天不退”却不知对应哪款产品。
2. **关键词 + 向量两路合并（RRF）**：向量懂同义词，关键词抓型号与报错码。两路各取前 20–30 段，按各自名次累加 `1 / (60 + 名次)` 排序去重，无需手调分数权重。
3. **粗筛后重排（Reranker）**：条件允许时，合并结果过一层重排模型，只留最准的前 3–5 段喂给大模型。换 embedding 模型时必须重建索引。
4. **引用硬核验与分列评测**：校验模型返回的 `chunk_id` 确实在本次召回列表且不越权；评测分开统计「检索命中率」和「回答忠实度」，快速定位错在哪一层。

## 工具和人工确认

模型只返回“想调哪个函数及参数”，真正执行函数的是你的 Python 白名单代码。

1. **固定流程（Workflow）优先于自由 Agent**：步骤明确的业务直接用代码固定顺序，不让模型无限自由循环试探。
2. **写操作必须可暂停与恢复**：迁到 LangGraph 时，在审批节点调 `interrupt()`，配落盘 `checkpointer` 和固定 `thread_id`；人工确认后用 `Command(resume=...)` 恢复。无确认禁写库仍由代码测试兜底。
3. **工具返回保持精简**：无论本地函数还是封装 MCP，只回传关键字段和清晰错误说明，不把整张大表或长堆栈塞回上下文。

## 评测与错误归因

1. **留全链路日志**：每次调用将输入、召回 ID、提示版本、原始输出、校验结果、耗时与 Token 记入一行 JSONL。
2. **先人工归因错题**：手看 30–50 条失败记录，按真实死法分桶（如表格切碎、漏召回、无答案瞎编、字段越界），哪类最多先修哪类。
3. **代码断言优先**：格式、拒答、引用存在性、权限拦截全用 `pytest` 判「通过 / 不通过」；仅语义忠实度辅助用裁判模型打 `0 / 1` 合格分，并与人工抽检核对。
