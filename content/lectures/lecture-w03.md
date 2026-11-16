# 第 3 周：调用大模型

课文：`lessons/w03-调用大模型.md`。没有真实 Key 时，`code/test` 走离线降级，概念和流程仍能跑。

## w03-1 网页产品和 API 的差别

网页 ChatGPT：厂商帮你存历史、画界面、限流、过滤。  
应用岗写的是：**你的程序用 HTTP 调模型，再接到业务**（知识库、表单、内部系统）。

国内很多模型提供 **OpenAI 兼容** 接口：路径、字段和官方 SDK 一样，只换 `base_url` 和 `api_key`。本仓库默认 DeepSeek。换通义 / Kimi / 本地 vLLM，通常只改 `.env` 三行。

SDK（`openai` 包）替你：拼 JSON、带 Header、解析响应、流式迭代。第 2 周组出来的 payload，就是它发出去的东西。

```bash
python3 code/test/w03_1_web_vs_api.py
```

## w03-2 messages 与一次请求

| role | 谁写的 | 作用 |
|------|--------|------|
| system | 你（开发者） | 长期规矩；用户通常看不到 |
| user | 终端用户或你的代码 | 这一轮问题 |
| assistant | 模型上一轮的话 | 多轮时必须原样带回去 |
| tool | 你的函数返回 | 第 7 周才用 |

一次调用：`chat.completions.create(model=..., messages=..., temperature=..., max_tokens=...)`  
常用返回：`choices[0].message.content`，以及 `usage`。公共封装范文：`code/w03/llm.py`。

```bash
python3 code/test/w03_2_messages.py
```

## w03-3 token、窗口、费用

token 是计费和长度单位，**不是汉字个数**。英文常 1 token≈0.75 词；中文常见 1 字≈1–2 token。

- `prompt_tokens`：你发进去的（system + 历史 + 资料）
- `completion_tokens`：模型新写的
- 账单两者都算

上下文窗口：一次 messages 总长不能超过上限。整本手册塞进去会爆窗口、又贵、又稀释重点——所以要检索。

```bash
python3 code/test/w03_3_usage.py
```

## w03-4 多轮

**无状态：** 每次 HTTP 彼此独立。网页能「记住」，是因为又把历史发给模型。

1. `history` 先放 system  
2. 用户一句 → append user  
3. 调接口 → append assistant（content 原样）  
4. 下一轮把整个 history 发出去  

太长要截断（留 system + 最近 N 轮）。本周先不截，但要知道。

```bash
python3 code/test/w03_4_history.py
```

交互版范文：`python code/w03/02_multi_turn.py`（输入 quit 结束）。

## w03-5 流式

非流式：等全部生成完才返回。流式：`stream=True`，每次拿一小段 `delta.content` 就打印或推给前端。有的供应商只在最后一块给 `usage`。

```bash
python3 code/test/w03_5_stream.py
```

## w03-6 常用参数

| 参数 | 含义 |
|------|------|
| temperature | 0～0.3 稳，适合问答；偏高更散，适合草稿 |
| max_tokens | 限制**输出**长度和费用；太小会截断句子 |
| model | 换模型不换 messages 结构 |
| tools | 第 7 周 |

```bash
python3 code/test/w03_6_params.py
python3 code/test/w03_ex_system.py
```

## w03-7 失败与重试

| 情况 | 常见原因 | 怎么做 |
|------|----------|--------|
| 401 | Key 错或没带 | 查 `.env`，Key 不进日志 |
| 402/429 | 欠费或限流 | 退避重试 |
| 超时 | 网络或模型慢 | 设 timeout；可先流式出字 |
| 5xx | 服务端 | 有限次重试 |

产品里要给人话，不要整段 Traceback。变量：`LLM_API_KEY` `LLM_BASE_URL` `LLM_MODEL`。

```bash
python3 code/test/w03_7_errors.py
```

## 练习

- 改 system 对比：`w03_ex_system.py`
- 总结本地文本 + usage：`python3 code/test/w03_ex_summarize.py`

口头：网页记忆 vs 应用记忆；三角色谁写；token 不是 1:1 字数；401 / 429 各是什么。
