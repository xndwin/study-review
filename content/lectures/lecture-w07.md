# 第 7 周：Agent 与工具调用

课文：`lessons/w07-Agent与工具.md`。

```bash
python3 code/test/agent-tools/run.py "计算 2**10，并总结 memo.txt"
python3 code/test/agent-tools/run.py "现在几点"
python3 code/test/agent-tools/run.py "读取 missing.txt"
python3 code/test/agent-tools/run.py "读取 ../rag-qa/data/notes.md"
```

## w07-1 三种系统

| | 普通聊天 | RAG | Agent |
|--|----------|-----|--------|
| 知识从哪来 | 模型参数 | 你的文档检索 | 工具返回 + 可选文档 |
| 会不会改外界 | 不会 | 不会 | 会（算数、读文件、以后可查库） |
| 典型问题 | 解释概念 | 「手册第 3 条怎么写」 | 「先读 memo 再算 2**10」 |
| 成本 | 一次生成 | 检索 + 生成 | 多轮模型 + 工具，最贵也最难测 |

能一步 prompt 解决的不要上 Agent。只要问文档，先 RAG。

## w07-2 tool calling 协议（逐步）

1. 你提供 `tools`：name、description、parameters（JSON Schema）
2. `create(..., tools=TOOLS)`
3. 若 `message.tool_calls` 非空：还不是最终对用户的话
4. 对每个 call：`json.loads(arguments)` → 在**你的 Python**里执行
5. append 模型那条，再 append `role=tool, tool_call_id=..., content=结果`
6. 再 `create`，直到没有 tool_calls 或达到 `max_steps`

模型**不会**真的进你电脑。它只输出「我想调 calculator，参数 expr=2**10」。执行权在你。实现：`code/test/lib/agent_local.py`（范文 `code/w07/agent.py`）。

## w07-3 计算器

禁止 `eval` 任意字符串（可以变成删文件的代码）。用 `ast` 只允许数字和 `+ - * / **`。非法表达式返回错误字符串，继续循环让模型看到失败原因。

## w07-4 读文件与路径逃逸

模型可能被教成 `path=../../.env`。必须：

```python
target = (root / path).resolve()
if not str(target).startswith(str(root.resolve())):
    return "错误：不允许读取目录外的文件"
```

不存在则友好错误，不要崩进程。限制长度（示例 2000 字）。

## w07-5 停止条件与报错回传

- `max_steps`：防止来回调工具死循环（本课 6 步）
- 工具失败：把错误当 tool content 回去，不要吞掉
- 可选：连续两次相同 tool+参数则打断（本课先用步数上限）

流式 + 工具更复杂，本课先非流式。

## 练习与作品（已在沙箱里）

1. 工具 `now`：上海时区当前时间。
2. 读不存在的文件：返回「不存在」，不崩。
3. `run.py` 演示「计算 + 读 memo」：`2**10` → 1024，memo 提到周五 14:00。
4. `../` 路径返回「不允许读取目录外的文件」。

没有 Key 时用规则路由，仍执行计算器、读文件和路径拦截。Agentic RAG（检索也做成 tool）先理解即可，不必本周上 LangGraph。

口头：工具谁执行；为什么不能 eval、为什么限制路径；死循环怎么停；什么时候不该用 Agent。
