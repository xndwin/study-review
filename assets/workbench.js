
(function () {
  var holder = document.querySelector("[data-workbench]");
  if (!holder || !window.STUDY_LABS) return;

  var slug = holder.getAttribute("data-slug") || "";
  var lab = window.STUDY_LABS[slug];
  var fallbackStarter = holder.getAttribute("data-default-code") || "";
  if (!lab && !fallbackStarter) return;

  if (!lab) {
    lab = {
      task_code: slug,
      target_file: "",
      quiz_pass: 0,
      quizzes: [],
      starter: fallbackStarter,
      stdin_presets: [],
      hint: "可直接修改代码并按 ⌘+Enter 运行。",
      checker: ""
    };
  }

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    if (window.studyWriteSync && k.indexOf("study-v2:") === 0) {
      window.studyWriteSync(k, v);
      return;
    }
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var quizKey = "study-v2:quiz-first:" + slug;
  var draftKey = "study-v2:code-draft:" + slug;
  var savedFirst = null;
  try {
    var rawFirst = lsGet(quizKey);
    if (rawFirst) savedFirst = JSON.parse(rawFirst);
  } catch (e) {}

  var currentAnswers = (savedFirst && savedFirst.answers) ? Object.assign({}, savedFirst.answers) : {};
  var firstScoreLocked = Boolean(savedFirst && savedFirst.completed);

  var htmlParts = [];

  // 1. Compact Quiz Section
  if (lab.quizzes && lab.quizzes.length > 0) {
    htmlParts.push(
      '<div class="wb-section" data-quiz-panel>' +
        '<div class="wb-bar">' +
          '<h2 class="wb-heading">小测验</h2>' +
          '<span class="wb-pill" data-quiz-score>0 / ' + lab.quizzes.length + '</span>' +
        '</div>' +
        '<div class="quiz-list" data-main-quiz></div>' +
        '<div class="quiz-foot">' +
          '<button type="button" class="wb-link-btn" data-quiz-reset>重做</button>' +
          (lab.retry_quizzes && lab.retry_quizzes.length
            ? '<button type="button" class="wb-link-btn" data-retry-toggle>巩固变体 (' + lab.retry_quizzes.length + ' 题)</button>'
            : '') +
        '</div>' +
        (lab.retry_quizzes && lab.retry_quizzes.length
          ? '<div class="retry-box" data-retry-box hidden><div class="quiz-list" data-retry-quiz></div></div>'
          : '') +
      '</div>'
    );
  }

  // 2. Compact Code Runner Section
  var presetsHtml = "";
  if (lab.stdin_presets && lab.stdin_presets.length > 0) {
    presetsHtml = lab.stdin_presets.map(function (p, idx) {
      return '<button type="button" class="wb-preset-chip" data-preset-idx="' + idx + '">' + esc(p.label) + '</button>';
    }).join("");
  }

  var showStdinDefault = Boolean(lab.stdin_presets && lab.stdin_presets.length > 0);
  var primaryLabel = lab.checker ? "▶ 运行检查 (⌘+Enter)" : "▶ 运行 (⌘+Enter)";
  var codeHeading = lab.target_file ? "写代码 · " + esc(lab.target_file.split("/").pop()) : "在线试跑";

  htmlParts.push(
    '<div class="wb-section" data-code-panel>' +
      '<div class="wb-bar">' +
        '<h2 class="wb-heading">' + codeHeading + '</h2>' +
        '<span class="wb-pill" data-runtime-pill>连接中…</span>' +
      '</div>' +
      '<div class="wb-editor-wrap">' +
        '<div class="wb-editor-bar">' +
          '<span>' + esc(lab.target_file || "Python 3") + '</span>' +
          '<span data-save-status>自动暂存</span>' +
        '</div>' +
        '<textarea class="wb-editor" data-wb-editor spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>' +
      '</div>' +
      '<div class="wb-stdin-box" data-stdin-wrap' + (showStdinDefault ? '' : ' hidden') + '>' +
        '<div class="wb-stdin-head">' +
          '<span>测试输入（每行对应一次 input）</span>' +
          '<div class="wb-presets">' + presetsHtml + '</div>' +
        '</div>' +
        '<textarea class="wb-stdin" data-wb-stdin rows="2" placeholder="一行代表一次输入…"></textarea>' +
      '</div>' +
      '<div class="wb-toolbar">' +
        '<div class="wb-toolbar-left">' +
          '<button type="button" class="wb-btn-primary" data-run-grade>' + primaryLabel + '</button>' +
          (lab.checker ? '<button type="button" class="wb-btn-ghost" data-run-only>仅运行</button>' : '') +
          (!showStdinDefault ? '<button type="button" class="wb-btn-ghost" data-toggle-stdin>输入参数</button>' : '') +
        '</div>' +
        '<div class="wb-toolbar-right">' +
          (lab.hint ? '<button type="button" class="wb-btn-ghost" data-toggle-hint>提示</button>' : '') +
          '<button type="button" class="wb-btn-ghost" data-download-py>下载</button>' +
          '<button type="button" class="wb-btn-ghost" data-reset-code>重置</button>' +
        '</div>' +
      '</div>' +
      (lab.hint ? '<div class="wb-hint" data-hint-box hidden>' + esc(lab.hint) + '</div>' : '') +
      '<div class="wb-output-wrap" data-output-wrap hidden>' +
        '<div class="wb-pass-banner" data-pass-banner hidden></div>' +
        '<div class="wb-console" data-console></div>' +
        '<div class="wb-checks" data-checks hidden></div>' +
      '</div>' +
    '</div>'
  );

  holder.innerHTML = htmlParts.join("");

  function renderQuizGroup(container, items, stateObj, onPick) {
    if (!container) return;
    container.innerHTML = "";
    items.forEach(function (q, qIdx) {
      var row = document.createElement("div");
      var picked = stateObj[q.id];
      var answered = typeof picked === "number";
      var isOk = answered && picked === q.answer;
      row.className = "quiz-row" + (answered ? (isOk ? " correct" : " wrong") : "");

      var optsHtml = q.options.map(function (optText, optIdx) {
        var cls = "quiz-opt";
        if (answered) {
          if (optIdx === picked) cls += isOk ? " picked-ok" : " picked-bad";
          else if (optIdx === q.answer) cls += " reveal-ok";
        }
        var mark = (answered && optIdx === picked) ? (isOk ? " ✓" : " ✗") : "";
        return '<button type="button" class="' + cls + '" data-opt="' + optIdx + '"' + (answered ? " disabled" : "") + '>' + esc(optText) + mark + '</button>';
      }).join("");

      var promptHtml = esc(q.prompt);
      if (q.prompt.length < 28 && !/[\u4e00-\u9fa5]/.test(q.prompt)) {
        promptHtml = "<code>" + promptHtml + "</code>";
      }

      row.innerHTML =
        '<div class="quiz-main">' +
          '<div class="quiz-q"><span class="quiz-idx">' + String(qIdx + 1).padStart(2, "0") + '</span><span>' + promptHtml + '</span></div>' +
          '<div class="quiz-opts">' + optsHtml + '</div>' +
        '</div>' +
        (answered ? '<div class="quiz-exp' + (isOk ? '' : ' bad') + '">' + esc(q.explain) + '</div>' : '');

      row.querySelectorAll("[data-opt]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          onPick(q.id, Number(btn.getAttribute("data-opt")));
        });
      });
      container.appendChild(row);
    });
  }

  function updateQuizHeader() {
    var scoreBadge = holder.querySelector("[data-quiz-score]");
    if (!scoreBadge || !lab.quizzes.length) return;
    var total = lab.quizzes.length;
    var count = 0;
    var right = 0;
    lab.quizzes.forEach(function (q) {
      if (typeof currentAnswers[q.id] === "number") {
        count += 1;
        if (currentAnswers[q.id] === q.answer) right += 1;
      }
    });

    if (count === total && !firstScoreLocked) {
      firstScoreLocked = true;
      savedFirst = { completed: true, score: right, total: total, answers: Object.assign({}, currentAnswers) };
      lsSet(quizKey, JSON.stringify(savedFirst));
    } else if (!firstScoreLocked) {
      lsSet(quizKey, JSON.stringify({ completed: false, score: right, total: total, answers: currentAnswers }));
    }

    var firstInfo = (savedFirst && savedFirst.completed) ? "首次 " + savedFirst.score + "/" + savedFirst.total : "";
    if (count < total) {
      scoreBadge.className = "wb-pill";
      scoreBadge.textContent = (firstInfo ? firstInfo + " · " : "") + count + " / " + total;
    } else {
      var passed = right >= (lab.quiz_pass || total);
      scoreBadge.className = "wb-pill " + (passed ? "ok" : "warn");
      scoreBadge.textContent = (firstInfo ? firstInfo + " · " : "") + "对 " + right + " / " + total + (passed ? " ✓" : "");
    }
  }

  var mainQuizBox = holder.querySelector("[data-main-quiz]");
  if (mainQuizBox) {
    function refreshMainQuiz() {
      renderQuizGroup(mainQuizBox, lab.quizzes, currentAnswers, function (qid, chosen) {
        currentAnswers[qid] = chosen;
        refreshMainQuiz();
        updateQuizHeader();
      });
      updateQuizHeader();
    }
    refreshMainQuiz();
    var resetQuizBtn = holder.querySelector("[data-quiz-reset]");
    if (resetQuizBtn) {
      resetQuizBtn.addEventListener("click", function () {
        currentAnswers = {};
        refreshMainQuiz();
      });
    }
  }

  var retryBox = holder.querySelector("[data-retry-box]");
  var retryToggle = holder.querySelector("[data-retry-toggle]");
  var retryQuizBox = holder.querySelector("[data-retry-quiz]");
  var retryAnswers = {};
  if (retryToggle && retryBox && retryQuizBox) {
    function refreshRetry() {
      renderQuizGroup(retryQuizBox, lab.retry_quizzes, retryAnswers, function (qid, chosen) {
        retryAnswers[qid] = chosen;
        refreshRetry();
      });
    }
    refreshRetry();
    retryToggle.addEventListener("click", function () {
      retryBox.hidden = !retryBox.hidden;
    });
  }

  var editor = holder.querySelector("[data-wb-editor]");
  var stdinBox = holder.querySelector("[data-wb-stdin]");
  var stdinWrap = holder.querySelector("[data-stdin-wrap]");
  var runtimePill = holder.querySelector("[data-runtime-pill]");
  var saveStatus = holder.querySelector("[data-save-status]");
  var outputWrap = holder.querySelector("[data-output-wrap]");
  var consoleEl = holder.querySelector("[data-console]");
  var checksEl = holder.querySelector("[data-checks]");
  var passBanner = holder.querySelector("[data-pass-banner]");
  var runGradeBtn = holder.querySelector("[data-run-grade]");
  var runOnlyBtn = holder.querySelector("[data-run-only]");

  if (stdinBox && lab.stdin_presets && lab.stdin_presets.length > 0) {
    stdinBox.value = lab.stdin_presets[0].stdin;
  }

  var localDraft = lsGet(draftKey);
  editor.value = (localDraft !== null && localDraft.trim() !== "") ? localDraft : (lab.starter || "");

  var localServerAvailable = false;

  fetch("/api/ping", { method: "GET" })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (data) {
      if (data && data.ok) {
        localServerAvailable = true;
        runtimePill.className = "wb-pill ok";
        runtimePill.textContent = "● 本机 Python（通过自动保存）";
        if (lab.target_file) {
          fetch("/api/code?file=" + encodeURIComponent(lab.target_file))
            .then(function (r) { return r.json(); })
            .then(function (f) {
              if (f && f.exists && f.code && f.code.trim() && !localDraft) {
                editor.value = f.code;
                saveStatus.textContent = "已加载本地作业";
              }
            })
            .catch(function () {});
        }
      }
    })
    .catch(function () {
      localServerAvailable = false;
      runtimePill.className = "wb-pill";
      runtimePill.textContent = (window.studyHasRepoSync && window.studyHasRepoSync())
        ? "● 网页 Python · 直连 GitHub 仓库"
        : "○ 网页 Python";
      if (lab.target_file && window.studyLoadRepoFile && window.studyHasRepoSync && window.studyHasRepoSync()) {
        window.studyLoadRepoFile(lab.target_file).then(function (repoCode) {
          if (repoCode && repoCode.trim() && !localDraft) {
            editor.value = repoCode;
            saveStatus.textContent = "已加载 GitHub 仓库作业";
          }
        });
      }
    });

  editor.addEventListener("input", function () {
    lsSet(draftKey, editor.value);
    if (saveStatus) saveStatus.textContent = "已暂存";
  });

  editor.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      executeCode(Boolean(lab.checker));
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      var start = editor.selectionStart;
      var end = editor.selectionEnd;
      var val = editor.value;
      editor.value = val.slice(0, start) + "    " + val.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
      lsSet(draftKey, editor.value);
      return;
    }
    if (e.key === "Enter") {
      var pos = editor.selectionStart;
      var before = editor.value.slice(0, pos);
      var lineStart = before.lastIndexOf("\n") + 1;
      var curLine = before.slice(lineStart);
      var indentMatch = curLine.match(/^[ \t]*/);
      var indent = indentMatch ? indentMatch[0] : "";
      if (curLine.trimEnd().endsWith(":")) indent += "    ";
      if (indent) {
        e.preventDefault();
        var after = editor.value.slice(editor.selectionEnd);
        editor.value = before + "\n" + indent + after;
        editor.selectionStart = editor.selectionEnd = pos + 1 + indent.length;
        lsSet(draftKey, editor.value);
      }
    }
  });

  holder.querySelectorAll("[data-preset-idx]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var idx = Number(chip.getAttribute("data-preset-idx"));
      var preset = lab.stdin_presets[idx];
      if (preset && stdinBox) {
        stdinBox.value = preset.stdin;
        executeCode(false);
      }
    });
  });

  var toggleStdinBtn = holder.querySelector("[data-toggle-stdin]");
  if (toggleStdinBtn && stdinWrap) {
    toggleStdinBtn.addEventListener("click", function () {
      stdinWrap.hidden = !stdinWrap.hidden;
    });
  }

  var toggleHintBtn = holder.querySelector("[data-toggle-hint]");
  var hintBox = holder.querySelector("[data-hint-box]");
  if (toggleHintBtn && hintBox) {
    toggleHintBtn.addEventListener("click", function () {
      hintBox.hidden = !hintBox.hidden;
    });
  }

  var resetCodeBtn = holder.querySelector("[data-reset-code]");
  if (resetCodeBtn) {
    resetCodeBtn.addEventListener("click", function () {
      if (window.confirm("恢复初始代码模板？")) {
        editor.value = lab.starter || "";
        lsSet(draftKey, editor.value);
        outputWrap.hidden = true;
      }
    });
  }

  var dlBtn = holder.querySelector("[data-download-py]");
  if (dlBtn) {
    dlBtn.addEventListener("click", function () {
      var blob = new Blob([editor.value], { type: "text/x-python;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      var fname = (lab.target_file || (slug + ".py")).split("/").pop();
      a.download = fname;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  var pyodidePromise = null;
  function ensurePyodide() {
    if (pyodidePromise) return pyodidePromise;
    pyodidePromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
      script.onload = function () {
        window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" })
          .then(resolve)
          .catch(reject);
      };
      script.onerror = function () {
        pyodidePromise = null;
        reject(new Error("无法加载网页 Python，请检查网络或本地运行 python3 site/serve.py。"));
      };
      document.head.appendChild(script);
    });
    return pyodidePromise;
  }

  function runInPyodide(code, stdinText, checkerId) {
    runtimePill.textContent = "加载网页 Python…";
    return ensurePyodide().then(function (py) {
      runtimePill.className = "wb-pill ok";
      runtimePill.textContent = "● 网页 Python";
      py.globals.set("_U_CODE", code);
      py.globals.set("_U_STDIN", stdinText ? (stdinText.endsWith("\n") ? stdinText : stdinText + "\n") : "");
      py.globals.set("_C_ID", checkerId || "");
      var driver = window.STUDY_CHECKER_PY + "\n" +
        "_ok, _out, _err, _ = run_with_stdin(_U_CODE, _U_STDIN)\n" +
        "_checks = grade(_C_ID, _U_CODE) if _C_ID else []\n" +
        "json.dumps({'ok': _ok, 'stdout': _out, 'stderr': _err, 'checks': _checks, 'allPassed': bool(_checks) and all(c['passed'] for c in _checks)}, ensure_ascii=False)\n";
      return JSON.parse(py.runPython(driver));
    });
  }

  function renderRunResult(res, withGrade) {
    outputWrap.hidden = false;
    var outText = (res.stdout || "").trimEnd();
    var errText = (res.stderr || "").trimEnd();

    if (errText) {
      consoleEl.className = "wb-console err";
      consoleEl.textContent = (outText ? outText + "\n\n" : "") + errText;
    } else {
      consoleEl.className = "wb-console";
      consoleEl.textContent = outText || "（无 print 输出）";
    }

    var checks = withGrade ? (res.checks || []) : [];
    if (checks.length > 0) {
      checksEl.hidden = false;
      var passCount = checks.filter(function (c) { return c.passed; }).length;
      var itemsHtml = checks.map(function (c) {
        return (
          '<div class="wb-check-item ' + (c.passed ? "ok" : "fail") + '">' +
            '<div><strong>' + (c.passed ? "✓ " : "✗ ") + esc(c.name) + '</strong></div>' +
            '<div class="wb-check-detail">' + esc(c.detail || "") + '</div>' +
          '</div>'
        );
      }).join("");
      checksEl.innerHTML =
        '<div class="wb-checks-head"><span>检查项</span><span>' + passCount + " / " + checks.length + ' 通过</span></div>' +
        itemsHtml;
    } else {
      checksEl.hidden = true;
    }

    if (withGrade && res.allPassed) {
      passBanner.hidden = false;
      if (saveStatus && res.savedTo) saveStatus.textContent = "已存盘";

      var doneBtn = document.querySelector("[data-done-toggle]");
      if (doneBtn && doneBtn.getAttribute("aria-pressed") !== "true") {
        doneBtn.click();
      } else {
        lsSet("study-v2:completed:" + slug, "1");
      }

      var firstStr = (savedFirst && savedFirst.completed)
        ? "首次测验 " + savedFirst.score + "/" + savedFirst.total
        : "实训通过";

      function showBanner(savedPathText) {
        var saveNote = savedPathText ? "，已存 " + savedPathText : "";
        var syncCmd = "完成：" + (lab.task_code || slug) + "（" + firstStr + "，代码检查通过" + saveNote + "）";
        passBanner.innerHTML =
          '<span><strong>✓ 全部通过</strong>' +
          (savedPathText ? ' · 已自动写入 <code>' + esc(savedPathText) + '</code>' : '') +
          '</span>' +
          '<button type="button" class="wb-btn-primary" data-copy-sync>复制完成口令</button>';

        var copySyncBtn = passBanner.querySelector("[data-copy-sync]");
        if (copySyncBtn) {
          copySyncBtn.addEventListener("click", function () {
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(syncCmd).then(function () {
              copySyncBtn.textContent = "已复制 ✓";
              setTimeout(function () { copySyncBtn.textContent = "复制完成口令"; }, 1800);
            });
          });
        }
      }

      if (res.savedTo) {
        showBanner(res.savedTo);
      } else if (lab.target_file && window.studySaveRepoFile && window.studyHasRepoSync && window.studyHasRepoSync()) {
        showBanner("正在提交到 GitHub 仓库…");
        window.studySaveRepoFile(lab.target_file, editor.value, lab.task_code || slug)
          .then(function (repoPath) {
            if (saveStatus && repoPath) saveStatus.textContent = "已提交仓库";
            showBanner(repoPath ? ("GitHub:" + repoPath) : "");
          })
          .catch(function () {
            showBanner("");
          });
      } else {
        showBanner("");
      }
    } else {
      passBanner.hidden = true;
    }
  }

  function executeCode(withGrade) {
    var code = editor.value;
    var stdinVal = stdinBox ? stdinBox.value : "";
    var checkerId = withGrade ? (lab.checker || "") : "";
    if (runGradeBtn) runGradeBtn.disabled = true;
    if (runOnlyBtn) runOnlyBtn.disabled = true;

    var job = localServerAvailable
      ? fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code,
            stdin: stdinVal,
            checker: checkerId,
            targetFile: lab.target_file || "",
            autoSave: true
          })
        }).then(function (r) { return r.json(); })
      : runInPyodide(code, stdinVal, checkerId);

    job
      .then(function (res) { renderRunResult(res, withGrade); })
      .catch(function (err) {
        outputWrap.hidden = false;
        checksEl.hidden = true;
        passBanner.hidden = true;
        consoleEl.className = "wb-console err";
        consoleEl.textContent = String(err && err.message ? err.message : err);
      })
      .finally(function () {
        if (runGradeBtn) runGradeBtn.disabled = false;
        if (runOnlyBtn) runOnlyBtn.disabled = false;
      });
  }

  if (runGradeBtn) runGradeBtn.addEventListener("click", function () { executeCode(Boolean(lab.checker)); });
  if (runOnlyBtn) runOnlyBtn.addEventListener("click", function () { executeCode(false); });

  window.addEventListener("study:hydrated", function () {
    try {
      var raw = lsGet(quizKey);
      if (raw) {
        savedFirst = JSON.parse(raw);
        currentAnswers = (savedFirst && savedFirst.answers) ? Object.assign({}, savedFirst.answers) : {};
        firstScoreLocked = Boolean(savedFirst && savedFirst.completed);
        if (mainQuizBox) {
          renderQuizGroup(mainQuizBox, lab.quizzes, currentAnswers, function (qid, chosen) {
            currentAnswers[qid] = chosen;
            updateQuizHeader();
          });
          updateQuizHeader();
        }
      }
      var remoteDraft = lsGet(draftKey);
      if (remoteDraft && document.activeElement !== editor) {
        editor.value = remoteDraft;
      }
    } catch (e) {}
  });
})();
