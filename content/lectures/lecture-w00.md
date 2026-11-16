# w00 环境（第一天）

课文：仓库根目录 `README.md`。第 0 周在进度表是 `w00-1` … `w00-3`。

## w00-1 虚拟环境与依赖

```bash
cd 仓库根目录
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

提示符出现 `(.venv)` 才算激活。系统 Python 不要往里装本课的包。

## w00-2 环境变量

```bash
cp .env.example .env
```

Key 可到第 3 周再填。没有 Key 时第 1–2 周照常学 Python；`code/test` 从第 3 周起有离线降级。

## w00-3 跑通 hello

```bash
source .venv/bin/activate
python code/w01/01_hello.py
python3 code/test/w01_1_hello.py
```

两条都能打出文字即环境 OK。
