# 第 1 周：Python 基础

课文：`lessons/w01-python基础.md`。范文在 `code/w01/`，不要改。每天：读一节 → 跑脚本 → 改几个数字再跑。

## w01-1 程序怎么运行、print、注释

Python 从上到下执行。`print(...)` 把结果打到屏幕。`#` 后面是注释，不执行。

```bash
python3 code/test/w01_1_hello.py
```

## w01-2 变量、命名、类型、转换、运算

变量是贴在对象上的名字。常用：`int` `float` `str` `bool`。命名：字母/数字/下划线，不能以数字开头；不要用 `list` `str` `type` 当名字。习惯 `max_tokens`。

`int("10")` → 10；`int(3.9)` → 3（截断，不是四舍五入）；`int("hi")` → ValueError。  
`/` 永远得到小数；`//` 整数除；`%` 余数；`**` 幂。`n += 1` 等于 `n = n + 1`。  
**`=` 赋值，`==` 比较。**

```bash
python3 code/test/w01_2_types.py
```

## w01-3 布尔、比较、逻辑、真值

比较：`== != > < >= <=`。和 `None` 用 `is`。`and` / `or` 短路。  
if 里相当于假：`0` `0.0` `""` `[]` `{}` `None` `False`。  
`0 or 5` 得到 `5`，`3 and 7` 得到 `7`。空列表 `if not items` 会走进去；改成 `[1, 2]` 就不进。

```bash
python3 code/test/w01_3_bool.py
```

## w01-4 输入与字符串

`input()` 永远是 str，当数字必须 `int(...)`。字符串不可变：`s[0:2]` 含头不含尾，不能 `s[0] = "p"`。  
方法返回新串：`strip` `lower` `split` `join` `replace` `endswith` `find`（找不到 -1）。  
f-string：`f"分数是 {score}"`。`\n` 换行。

```bash
python3 code/test/w01_4_string.py
```

## w01-5 条件

`if` / `elif` / `else` 从上到下只走第一条为真的分支。缩进 4 空格是语法。嵌套别超过两层。  
三元：`"及格" if score >= 60 else "不及格"`。`if xs:` 表示列表非空。

```bash
python3 code/test/w01_5_if.py
```

## w01-6 循环

`range(start, stop, step)` 不含 stop。`enumerate` 带编号，`zip` 并排。  
`continue` 跳过本轮；`break` 离开循环；`for`/`while` 的 `else` 只在**没有 break** 时执行。  
不要在 `for x in xs` 里增删 `xs`，用 `xs[:]` 或建新列表。

```bash
python3 code/test/w01_6_loop.py
```

## w01-7 列表、元组

列表可变：`append` `insert` `pop` `remove`。`sorted(xs)` 新列表；`xs.sort()` 原地。切片含头不含尾。  
元组不可变：`t = (1, 2)`，单元素 `(1,)`。拆包：`a, b = t`。可套列表：`matrix[1][0]`。

```bash
python3 code/test/w01_7_list.py
```

## w01-8 字典、集合、嵌套

键必须不可变。`person.get("email", "(无)")` 避免 KeyError。  
集合去重、无序；交 `&` 并 `|`。空集合 `set()`，`{}` 是空字典。  
LLM 响应：`resp["choices"][0]["message"]["content"]`。

```bash
python3 code/test/w01_8_dict.py
```

## w01-9 函数、返回值、作用域、文档字符串

`return` 给下一行代码用，`print` 给人看。不要用 `[]`/`{}` 当默认值，用 `None` 再新建。  
多个返回值是元组。函数内赋值是局部的。`"""..."""` 是文档字符串。

```bash
python3 code/test/w01_9_func.py
```

## w01-10 推导式

`[n * n for n in range(5)]`、`[n for n in range(10) if n % 2 == 0]`、`{n: n * n for n in range(3)}`。  
能读懂、会写简单过滤即可。太长仍写普通 for。

```bash
python3 code/test/w01_10_comprehension.py
```

## 练习（单独勾选）

1. 猜数字：`python3 code/test/w01_ex_guess.py`（交互对照 `code/w01/02_guess.py`）
2. 成绩统计：平均 / 最高 / 及格人数 — `python3 code/test/w01_ex_scores.py`
3. 词表过滤：长度 ≥ 2、去重、排序 — `python3 code/test/w01_ex_filter.py`

## 本周口头

- `=` 和 `==`、`is` 和 `==`（和 None）
- 为什么 for 里不要直接删正在遍历的列表
- 为什么函数要用 return 而不是只 print
- `[]`、`{}`、`set()` 各是什么
- 从嵌套字典取出 `content` 怎么写
