# 第 2 周：Python 核心

课文：`lessons/w02-python核心.md`。范文在 `code/w02/`，不要改。本周全部是后面调 API、读文档、写 RAG 每天都要用的。

## w02-1 虚拟环境与 pip

系统 Python 不要直接往里装一堆包。虚拟环境是本项目专用的 Python。

```bash
cd 仓库根目录
source .venv/bin/activate
pip install -r requirements.txt
```

提示符出现 `(.venv)` 才算激活。`pip list` 查看已装。不要随便 `pip freeze` 覆盖本仓库已经写好的 `requirements.txt`。

```bash
python3 code/test/w02_1_venv.py
```

看打印的解释器路径是否包含 `.venv`。

## w02-2 文件、编码、pathlib、with

中文用 `utf-8`。路径用 `pathlib.Path`。`Path(__file__).resolve().parent / "data" / "sample.txt"` 不依赖你在哪个目录敲命令。

`with` 离开块时自动关文件。模式：`"r"` 读，`"w"` 覆盖写，`"a"` 追加，二进制 `"rb"`。

```bash
python3 code/test/w02_2_files.py
```

应看到 4 行，并写出 `data/copy_sample.txt`，中文不乱码。

## w02-3 JSON

JSON 是 API 和配置的通用格式：对象 `{}`、数组 `[]`、字符串必须双引号。

| JSON | Python |
|------|--------|
| object | dict |
| array | list |
| string | str |
| number | int/float |
| true/false | True/False |
| null | None |

```python
import json
s = json.dumps({"model": "deepseek-chat", "备注": "中文"}, ensure_ascii=False, indent=2)
obj = json.loads(s)
```

`ensure_ascii=False` 才能在文件里直接看到中文，否则是 `\uXXXX`。`indent=2` 方便人读。

读文件：`json.loads(path.read_text(encoding="utf-8"))`  
写文件：`path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")`

模型经常返回「像 JSON 的字符串」，还可能包 \`\`\`json 代码块，要先剥掉再 `loads`。非法 JSON 会 `json.JSONDecodeError`。

```bash
python3 code/test/w02_3_json.py
```

## w02-4 异常与 Traceback

出错会抛异常。不接住，程序停，终端打印 Traceback。**从下往上看：最后一行才是错误类型和原因**，上面是谁调用了谁。

```python
try:
    n = int("x")
except ValueError as e:
    print("转换失败", e)
```

常见：`ValueError` `TypeError` `KeyError` `IndexError` `FileNotFoundError` `json.JSONDecodeError` `ZeroDivisionError`。

- 先抓具体类型，不要一上来 `except Exception` 全吞（会把真 bug 藏起来）
- `except A as e` 里 `e` 是错误对象
- `raise RuntimeError("说明") from e` 保留因果（`llm.py` 里用过）
- `finally`：无论成败都执行；有 `with` 时较少手写

```bash
python3 code/test/w02_4_errors.py
```

应看到：找不到文件、正常读配置、坏 JSON 三路都不崩溃。

## w02-5 默认参数、可变默认值、类型注解

默认参数必须放后面。`list` / `dict` 不要当默认值，多次调用会共用同一个对象。正确：

```python
def add_msg(item: str, history: list[str] | None = None) -> list[str]:
    if history is None:
        history = []
    history.append(item)
    return history
```

类型注解给人和编辑器看，默认不强制运行时检查。`str | None` 表示可以是 None。后面 FastAPI / Pydantic 会强制检查请求体。

```bash
python3 code/test/w02_5_defaults.py
```

对比 `append_wrong`：两次调用会共享同一个列表。

## w02-6 类

类把「数据 + 操作」捆在一起。RAG 检索器、Agent 工具箱都会长成这样。

- `__init__` 构造；`self` 是当前实例
- `self.used` 是这个对象自己的数据，两个对象互不影响
- 方法第一个参数必须是 `self`（调用时不用传）

函数是「拿参数算一次」；对象是「记得自己上次到哪了」。继承先混个眼熟：`class FileRetriever(Retriever)`。本周不要求写复杂继承。

```bash
python3 code/test/w02_6_class.py
```

`TokenBudget(100)` 加 40 成功，再加 70 失败，`used` 仍是 40。

## w02-7 模块与入口

一个 `.py` 就是一个模块。`import json` 标准库；`import openai` 要先 pip。

文件名必须是合法标识符才能 `import`（不要 `import 01_chat`）。公共客户端放在 `code/w03/llm.py`。教学写法：

```python
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.greet import hello
```

正规项目用包或 `pip install -e .`。

`if __name__ == "__main__":`：直接 `python 文件.py` 时 `__name__` 是 `"__main__"`；被别人 import 时不是。避免 import 时立刻跑演示。

```bash
python3 code/test/w02_7_module.py
python3 code/test/lib/greet.py
```

## w02-8 HTTP 与 JSON 响应

调大模型本质是：对某个 URL 发 HTTP POST，body 是 JSON，回来也是 JSON。SDK 替你做了这些。

要记住：`url`、`method`、`headers`（Authorization）、`body`。401 多半是 Key；404 是路径；429 是限流。

本文件只组请求体，不真发网络。真发在第 3 周用 SDK。

```bash
python3 code/test/w02_8_http.py
```

## 练习

1. 词频：按空白切，打印最多的 10 个词。  
   `python3 code/test/w02_ex_wordcount.py`
2. 配置缺省：缺 `max_tokens` 用 256；文件不存在或坏了不崩。  
   `python3 code/test/w02_ex_config.py`

口头：为什么要用 venv；utf-8 和 with；JSON 和 dict、`ensure_ascii=False`；except 为什么要具体类型；`__name__ == "__main__"`。
