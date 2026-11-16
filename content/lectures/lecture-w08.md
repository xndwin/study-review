# 第 8 周：接口、工程习惯、求职

课文：`lessons/w08-部署与求职.md`。第 1–7 周知识点不删。

## w08-1 FastAPI

脚本是给你自己跑的；HTTP 接口是给前端、评测脚本、同事用的。

```bash
cd 仓库根目录/code/test
source ../../.venv/bin/activate
uvicorn api:app --reload
```

打开 http://127.0.0.1:8000/docs

- `GET /health` 探活
- `POST /rag` 请求体 `{"question": "..."}`，Pydantic 校验；缺字段自动 422
- `POST /agent` 同样结构，走工具循环

内部仍调用 `ask()` / `run_agent()`。概念：路由、JSON、OpenAPI 文档、校验。本周不要求鉴权、上云，但要知道还差：HTTPS、Key、限流、日志。

自检（不启服务）：`python3 code/test/run_all.py` 里已用 TestClient 打过三个接口。

## w08-2 环境变量与仓库卫生

- 密钥只在 `.env`，模板是 `.env.example`（无真实 Key）
- `.gitignore` 已忽略 `.env`、`.venv`、`__pycache__`
- 日志最多打印 Key 前四位
- README 写：Python 版本、venv、如何填 Key、如何跑 ask / eval / uvicorn

```bash
python3 code/test/w08_2_env.py
```

## w08-3 简历项目描述

两段已写满，按你的领域改数字后贴进简历：`code/test/resume.md`。

- RAG：切块 180/40、Jaccard、10 条评测、空检索拒答
- Agent：AST 计算器、路径限制、`now`、最大 6 步

## w08-4 面试口头（15 题）

合上电脑答。提纲在 `code/test/w08_interview.md`，对照 `docs/知识点总表.md`。答不出就回到对应周课文，不要跳过。

1. 网页产品和自己调 API 差在哪？记忆存在哪？
2. system / user / assistant / tool 各自谁产生？
3. token 是什么？和字数？usage 两项？
4. 为什么不能把整本手册塞进一次 prompt？
5. 画 RAG 五框：文档、切块、索引、检索、生成。
6. chunk 太大、太小、没有 overlap 会怎样？
7. 词重叠和余弦各自怎么打分？embedding 换在哪一层？
8. 检索为空为什么不能当普通聊天？
9. RAG 和微调分别解决什么？
10. 评测集为什么要有拒答题和注入题？
11. JSON 输出脏了怎么降级？
12. Agent 的工具到底谁在执行？
13. 为什么不用 eval？路径逃逸是什么？
14. 如何降低幻觉、费用、延迟？（各举两条）
15. FastAPI 比直接跑脚本多了什么？

## w08-5 别人能跑

两个 README 已含：安装、环境变量、最小命令、评测命令、本机示例。合格线：两个能演示的项目 + 上表能讲。不是证书。

后续（不替代本课）：Chroma/Qdrant、LangGraph、更细的忠实度评测。
