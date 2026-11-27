
(function () {
  var FILE_NAME = "study-review-sync.json";
  var TOKEN_KEY = "study-sync:token";
  var GIST_KEY = "study-sync:gist-id";
  var META_KEY = "study-sync:meta-ts";

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  function lsRemove(k) {
    try { localStorage.removeItem(k); } catch (e) {}
  }

  function readMeta() {
    try {
      return JSON.parse(lsGet(META_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function writeMeta(m) {
    lsSet(META_KEY, JSON.stringify(m));
  }

  function isSyncableKey(k) {
    return k && k.indexOf("study-v2:") === 0;
  }

  function collectLocalSnapshot() {
    var meta = readMeta();
    var items = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (isSyncableKey(k)) {
          items[k] = {
            value: localStorage.getItem(k) || "",
            ts: Number(meta[k] || 1)
          };
        }
      }
    } catch (e) {}
    return items;
  }

  var btn = document.querySelector("[data-sync-open]");
  var modal = document.getElementById("syncModal");
  if (!btn || !modal) return;

  var labelEl = btn.querySelector("[data-sync-label]");
  var tokenInput = modal.querySelector("[data-sync-token]");
  var statusLine = modal.querySelector("[data-sync-status]");
  var saveBtn = modal.querySelector("[data-sync-save]");
  var nowBtn = modal.querySelector("[data-sync-now]");
  var clearBtn = modal.querySelector("[data-sync-clear]");
  var closeBtn = modal.querySelector("[data-sync-close]");

  function setUiState(kind, text, detail) {
    btn.className = "sync-btn" + (kind ? " " + kind : "");
    if (labelEl) labelEl.textContent = text;
    if (statusLine && detail !== undefined) statusLine.textContent = detail;
  }

  function apiHeaders(token) {
    return {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function findOrCreateGist(token) {
    var savedId = lsGet(GIST_KEY);
    if (savedId) {
      return fetch("https://api.github.com/gists/" + encodeURIComponent(savedId), {
        headers: apiHeaders(token),
        cache: "no-store"
      }).then(function (r) {
        if (r.ok) return r.json();
        lsRemove(GIST_KEY);
        return findOrCreateGist(token);
      });
    }

    return fetch("https://api.github.com/gists?per_page=50", {
      headers: apiHeaders(token),
      cache: "no-store"
    })
      .then(function (r) {
        if (!r.ok) throw new Error("Token 验证失败（HTTP " + r.status + "），请确认勾选了 gist 权限");
        return r.json();
      })
      .then(function (list) {
        var found = null;
        if (Array.isArray(list)) {
          for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i].files && list[i].files[FILE_NAME]) {
              found = list[i];
              break;
            }
          }
        }
        if (found) {
          lsSet(GIST_KEY, found.id);
          return fetch("https://api.github.com/gists/" + found.id, {
            headers: apiHeaders(token),
            cache: "no-store"
          }).then(function (r) { return r.json(); });
        }
        var initPayload = {
          description: "AI 应用开发读本 · 跨设备学习进度与作业同步存档（私有）",
          public: false,
          files: {}
        };
        initPayload.files[FILE_NAME] = {
          content: JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), items: collectLocalSnapshot() }, null, 2)
        };
        return fetch("https://api.github.com/gists", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, apiHeaders(token)),
          body: JSON.stringify(initPayload)
        }).then(function (r) {
          if (!r.ok) throw new Error("创建私有存档失败（HTTP " + r.status + "）");
          return r.json();
        }).then(function (created) {
          lsSet(GIST_KEY, created.id);
          return created;
        });
      });
  }

  var syncing = false;
  var pendingPush = false;

  function syncWithCloud(pushChanges) {
    var token = (lsGet(TOKEN_KEY) || "").trim();
    if (!token) {
      setUiState("", "云同步", "尚未配置同步口令。");
      return Promise.resolve(false);
    }
    if (syncing) {
      if (pushChanges) pendingPush = true;
      return Promise.resolve(false);
    }
    syncing = true;
    setUiState("ok", "同步中…", "正在与 GitHub 私有存档同步…");

    return findOrCreateGist(token)
      .then(function (gist) {
        var fileObj = gist.files && gist.files[FILE_NAME];
        var remoteData = { items: {} };
        if (fileObj && fileObj.content) {
          try { remoteData = JSON.parse(fileObj.content) || { items: {} }; } catch (e) {}
        }
        var remoteItems = remoteData.items || {};
        var localItems = collectLocalSnapshot();
        var meta = readMeta();
        var merged = {};
        var localChanged = false;
        var remoteNeedsUpdate = false;

        var allKeys = {};
        Object.keys(remoteItems).forEach(function (k) { allKeys[k] = true; });
        Object.keys(localItems).forEach(function (k) { allKeys[k] = true; });

        Object.keys(allKeys).forEach(function (k) {
          if (!isSyncableKey(k)) return;
          var r = remoteItems[k];
          var l = localItems[k];
          if (r && !l) {
            lsSet(k, r.value);
            meta[k] = r.ts || Date.now();
            merged[k] = r;
            localChanged = true;
          } else if (l && !r) {
            merged[k] = { value: l.value, ts: l.ts || Date.now() };
            remoteNeedsUpdate = true;
          } else if (r && l) {
            var rTs = Number(r.ts || 0);
            var lTs = Number(l.ts || 0);
            if (rTs > lTs && r.value !== l.value) {
              lsSet(k, r.value);
              meta[k] = rTs;
              merged[k] = r;
              localChanged = true;
            } else if (lTs > rTs && l.value !== r.value) {
              merged[k] = l;
              remoteNeedsUpdate = true;
            } else {
              merged[k] = lTs >= rTs ? l : r;
            }
          }
        });

        writeMeta(meta);
        if (localChanged) {
          window.dispatchEvent(new CustomEvent("study:hydrated"));
        }

        if (pushChanges || remoteNeedsUpdate) {
          var body = { files: {} };
          body.files[FILE_NAME] = {
            content: JSON.stringify({
              version: 1,
              updatedAt: new Date().toISOString(),
              items: merged
            }, null, 2)
          };
          return fetch("https://api.github.com/gists/" + gist.id, {
            method: "PATCH",
            headers: Object.assign({ "Content-Type": "application/json" }, apiHeaders(token)),
            body: JSON.stringify(body)
          }).then(function (r) {
            if (!r.ok) throw new Error("上传存档失败（HTTP " + r.status + "）");
            return localChanged;
          });
        }
        return localChanged;
      })
      .then(function () {
        var nowStr = new Date().toTimeString().slice(0, 5);
        setUiState("ok", "已同步", "上次同步：" + nowStr + "（私有 Gist 加密存储）");
      })
      .catch(function (err) {
        setUiState("err", "同步失败", err && err.message ? err.message : "网络或口令异常");
      })
      .finally(function () {
        syncing = false;
        if (pendingPush) {
          pendingPush = false;
          syncWithCloud(true);
        }
      });
  }

  // Record timestamp & debounce push whenever any study-v2 key changes
  var pushTimer = null;
  window.studyWriteSync = function (key, val) {
    lsSet(key, val);
    if (isSyncableKey(key)) {
      var meta = readMeta();
      meta[key] = Date.now();
      writeMeta(meta);
      if (lsGet(TOKEN_KEY)) {
        clearTimeout(pushTimer);
        pushTimer = setTimeout(function () {
          syncWithCloud(true);
        }, 1200);
      }
    }
  };

  btn.addEventListener("click", function () {
    tokenInput.value = lsGet(TOKEN_KEY) || "";
    modal.hidden = false;
  });

  if (closeBtn) closeBtn.addEventListener("click", function () { modal.hidden = true; });
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.hidden = true;
  });

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var t = tokenInput.value.trim();
      if (!t) {
        statusLine.textContent = "请先粘贴包含 gist 权限的 GitHub Token。";
        return;
      }
      lsSet(TOKEN_KEY, t);
      lsRemove(GIST_KEY);
      syncWithCloud(true).then(function () {
        if (!btn.classList.contains("err")) {
          setTimeout(function () { modal.hidden = true; }, 500);
        }
      });
    });
  }

  if (nowBtn) {
    nowBtn.addEventListener("click", function () {
      syncWithCloud(true);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      lsRemove(TOKEN_KEY);
      lsRemove(GIST_KEY);
      tokenInput.value = "";
      setUiState("", "云同步", "已断开当前浏览器的云同步连接。");
    });
  }

  // Auto-sync on page open & when switching back to tab on phone/PC
  if (lsGet(TOKEN_KEY)) {
    syncWithCloud(false);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && lsGet(TOKEN_KEY)) {
      syncWithCloud(false);
    }
  });
})();


(function () {
  var root = document.documentElement;
  var rail = document.getElementById("rail");
  var menuBtn = document.querySelector(".menu-btn");
  var scrim = document.querySelector(".scrim");
  var bar = document.querySelector(".progress");
  var metaTheme = document.getElementById("metaThemeColor");
  var inLearn = root.getAttribute("data-in-learn") === "1";
  var INTERVALS = [1, 3, 7, 14];

  function todayISO() {
    var now = new Date();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + m + "-" + d;
  }

  function addDays(iso, n) {
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    dt.setDate(dt.getDate() + n);
    var m = String(dt.getMonth() + 1).padStart(2, "0");
    var d = String(dt.getDate()).padStart(2, "0");
    return dt.getFullYear() + "-" + m + "-" + d;
  }

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    if (window.studyWriteSync && k && k.indexOf("study-v2:") === 0) {
      window.studyWriteSync(k, v);
      return;
    }
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function slugKey(slug, field) {
    return "study-v2:" + field + ":" + slug;
  }

  // Backward-compatible reader for legacy pathname-keyed storage
  function readChapterField(slug, field) {
    var v = lsGet(slugKey(slug, field));
    if (v !== null) return v;
    if (location.pathname.indexOf(slug + ".html") !== -1) {
      var legacy = lsGet("study-" + field + ":" + location.pathname);
      if (legacy !== null) {
        lsSet(slugKey(slug, field), legacy);
        return legacy;
      }
    }
    return "";
  }

  function writeChapterField(slug, field, val) {
    lsSet(slugKey(slug, field), val);
    if (location.pathname.indexOf(slug + ".html") !== -1) {
      lsSet("study-" + field + ":" + location.pathname, val);
    }
  }

  function chapterStatus(slug, nowIso) {
    var seen = readChapterField(slug, "seen");
    var done = readChapterField(slug, "completed") === "1";
    var gap = (readChapterField(slug, "gap") || "").trim();
    var dueGap = 0;
    if (seen) {
      for (var i = 0; i < INTERVALS.length; i++) {
        var g = INTERVALS[i];
        var checked = readChapterField(slug, "done-" + g) === "1";
        if (!checked && addDays(seen, g) <= nowIso) {
          dueGap = g;
          break;
        }
        if (checked) done = true;
      }
    }
    return { seen: seen, done: done, gap: gap, dueGap: dueGap };
  }

  // Font Size & Theme Controls
  function syncSize() {
    var current = getComputedStyle(root).getPropertyValue("--read").trim();
    document.querySelectorAll("[data-size]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-size") === current ? "true" : "false");
    });
  }

  var themeBtn = document.querySelector(".theme-btn");
  function syncTheme() {
    var night = root.getAttribute("data-theme") === "night";
    if (metaTheme) metaTheme.setAttribute("content", night ? "#0e1512" : "#edf1ec");
    if (!themeBtn) return;
    themeBtn.setAttribute("aria-pressed", night ? "true" : "false");
    var label = themeBtn.querySelector(".theme-label");
    if (label) label.textContent = night ? "暖纸" : "夜间";
  }
  syncSize();
  syncTheme();

  document.querySelectorAll("[data-size]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var size = btn.getAttribute("data-size");
      root.style.setProperty("--read", size);
      lsSet("study-read-size", size);
      syncSize();
    });
  });

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var night = root.getAttribute("data-theme") === "night";
      if (night) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", "night");
      lsSet("study-theme", night ? "paper" : "night");
      syncTheme();
    });
  }

  // Copy Code Buttons
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var fig = btn.closest("figure.code");
      var code = fig && fig.querySelector("code");
      if (!code || !navigator.clipboard) return;
      navigator.clipboard.writeText(code.textContent || "").then(function () {
        var orig = btn.textContent;
        btn.textContent = "已复制 ✓";
        setTimeout(function () { btn.textContent = orig; }, 1500);
      }).catch(function () {});
    });
  });

  // Chapter Active Recall Card + Curtain
  var study = document.querySelector("[data-study]");
  if (study) {
    var slug = study.getAttribute("data-slug") || root.getAttribute("data-page-slug") || "";
    var nowIso = todayISO();
    var seen = readChapterField(slug, "seen");
    if (!seen) {
      seen = nowIso;
      writeChapterField(slug, "seen", seen);
    }

    var seenLabel = study.querySelector("[data-seen-label]");
    if (seenLabel) {
      seenLabel.textContent = "间隔复习打卡（首次学习 " + seen.slice(5) + "）：";
    }

    // Done Toggle (sync all buttons on page)
    var doneBtns = document.querySelectorAll("[data-done-toggle]");
    function syncDoneBtn() {
      var isDone = readChapterField(slug, "completed") === "1";
      doneBtns.forEach(function (btn) {
        btn.setAttribute("aria-pressed", isDone ? "true" : "false");
        btn.textContent = isDone ? "已学 ✓" : "标记已学";
      });
    }
    syncDoneBtn();
    doneBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = readChapterField(slug, "completed") !== "1";
        writeChapterField(slug, "completed", next ? "1" : "0");
        syncDoneBtn();
        decorateNavigation();
      });
    });

    // Curtain Toggle (sync all buttons on page)
    var stage = document.querySelector("[data-prose-stage]");
    var overlay = document.querySelector("[data-curtain-overlay]");
    var curtainBtns = document.querySelectorAll("[data-curtain-toggle]");
    var revealBtn = document.querySelector("[data-curtain-reveal]");
    var autoCheck = study.querySelector("[data-auto-curtain]");

    function setCurtain(masked) {
      if (!stage) return;
      stage.classList.toggle("curtained", masked);
      if (overlay) overlay.hidden = !masked;
      curtainBtns.forEach(function (btn) {
        btn.setAttribute("aria-pressed", masked ? "true" : "false");
        btn.textContent = masked ? "揭开课文" : "遮住课文";
      });
    }

    var autoCurtain = lsGet("study-auto-curtain") === "1";
    if (autoCheck) {
      autoCheck.checked = autoCurtain;
      autoCheck.addEventListener("change", function () {
        lsSet("study-auto-curtain", autoCheck.checked ? "1" : "0");
      });
    }
    if (autoCurtain) setCurtain(true);

    curtainBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setCurtain(!stage || !stage.classList.contains("curtained"));
      });
    });
    if (revealBtn) {
      revealBtn.addEventListener("click", function () {
        setCurtain(false);
      });
    }

    // Spaced Repetition Pills (+1 / +3 / +7 / +14)
    var reviewsBox = study.querySelector("[data-reviews]");
    if (reviewsBox) {
      INTERVALS.forEach(function (gap) {
        var btn = document.createElement("button");
        btn.type = "button";
        var targetDate = addDays(seen, gap);
        var checked = readChapterField(slug, "done-" + gap) === "1";
        var isDue = !checked && targetDate <= nowIso;

        function renderPill() {
          btn.className = "rev-pill" + (!checked && targetDate <= nowIso ? " due" : "");
          btn.setAttribute("aria-pressed", checked ? "true" : "false");
          btn.textContent = "+" + gap + "天 · " + targetDate.slice(5) + (checked ? " ✓" : (isDue ? " 到期" : ""));
        }
        renderPill();
        btn.addEventListener("click", function () {
          checked = !checked;
          writeChapterField(slug, "done-" + gap, checked ? "1" : "0");
          if (checked) {
            writeChapterField(slug, "completed", "1");
            syncDoneBtn();
          }
          renderPill();
          decorateNavigation();
        });
        reviewsBox.appendChild(btn);
      });
    }

    // Persisted Scratchpad & Gap Question Inputs
    study.querySelectorAll("textarea[data-note]").forEach(function (area) {
      var kind = area.getAttribute("data-note");
      area.value = readChapterField(slug, kind) || "";
      area.addEventListener("input", function () {
        writeChapterField(slug, kind, area.value);
      });
    });
  }

  // Hydrate Badges on Chapter Lists, Rail Dots, Week Progress & Home Due/Gap Boards
  function decorateNavigation() {
    var nowIso = todayISO();

    document.querySelectorAll("[data-badges-for]").forEach(function (holder) {
      var cSlug = holder.getAttribute("data-badges-for");
      var st = chapterStatus(cSlug, nowIso);
      var pills = [];
      if (st.dueGap) pills.push('<i class="mini-badge due">+' + st.dueGap + 'd 待复测</i>');
      else if (st.done) pills.push('<i class="mini-badge done">已学</i>');
      if (st.gap) pills.push('<i class="mini-badge gap">有错题</i>');
      holder.innerHTML = pills.join("");
    });

    document.querySelectorAll("[data-dot-for]").forEach(function (dot) {
      var cSlug = dot.getAttribute("data-dot-for");
      var st = chapterStatus(cSlug, nowIso);
      dot.className = "rail-dot" + (st.dueGap ? " due" : (st.done ? " done" : ""));
    });

    if (window.STUDY_CATALOG && Array.isArray(window.STUDY_CATALOG)) {
      var byParent = {};
      var dueList = [];
      var gapList = [];
      var totalDone = 0;
      var mainTotal = 0;

      window.STUDY_CATALOG.forEach(function (item) {
        var isWeek = /^a\d+$/.test(item.parent);
        var st = chapterStatus(item.slug, nowIso);
        if (!byParent[item.parent]) byParent[item.parent] = { total: 0, done: 0 };
        byParent[item.parent].total += 1;
        if (st.done) byParent[item.parent].done += 1;
        if (isWeek) {
          mainTotal += 1;
          if (st.done) totalDone += 1;
        }
        if (st.dueGap) {
          dueList.push({ item: item, gap: st.dueGap });
        }
        if (st.gap) {
          gapList.push({ item: item, text: st.gap });
        }
      });

      Object.keys(byParent).forEach(function (pSlug) {
        var info = byParent[pSlug];
        var statEl = document.querySelector('[data-week-stat="' + pSlug + '"]');
        if (statEl && info.done > 0) {
          statEl.textContent = info.done + " / " + info.total + " 章";
        }
        var progEl = document.querySelector('[data-week-progress="' + pSlug + '"]');
        if (progEl && info.done > 0) {
          progEl.textContent = "已学 " + info.done + " / " + info.total + " 章";
        }
        var barEl = document.querySelector('[data-week-bar="' + pSlug + '"]');
        if (barEl && info.total > 0) {
          barEl.style.width = Math.round((info.done / info.total) * 100) + "%";
        }
      });

      var globalStat = document.querySelector("[data-global-stat]");
      if (globalStat && totalDone > 0) {
        globalStat.textContent = "已学 " + totalDone + " / " + mainTotal + " 节主线章";
      }

      var dueBoard = document.querySelector("[data-due-board]");
      if (dueBoard) {
        if (dueList.length > 0) {
          dueBoard.hidden = false;
          var htmlRows = dueList.slice(0, 6).map(function (entry) {
            var href = (inLearn ? "" : "learn/") + entry.item.slug + ".html";
            return (
              '<a class="due-item" href="' + href + '">' +
              "<span><strong>" + escapeHtml(entry.item.title) + "</strong> · <small>" + escapeHtml(entry.item.parentLabel) + "</small></span>" +
              '<span class="due-tag">+' + entry.gap + " 天到期 →</span></a>"
            );
          }).join("");
          dueBoard.innerHTML =
            '<div class="board-head"><span>今日到期复测（先不看课文闭卷做一题）</span><span>' + dueList.length + " 节</span></div>" +
            '<div class="due-items">' + htmlRows + "</div>";
        } else {
          dueBoard.hidden = true;
        }
      }

      var gapsBoard = document.querySelector("[data-gaps-board]");
      if (gapsBoard) {
        if (gapList.length > 0) {
          gapsBoard.hidden = false;
          var gapRows = gapList.slice(0, 8).map(function (entry) {
            var href = (inLearn ? "" : "learn/") + entry.item.slug + ".html";
            return (
              '<a class="gap-item" href="' + href + '">' +
              "<strong>" + escapeHtml(entry.item.title) + "</strong>" +
              '<span class="gap-snippet">' + escapeHtml(entry.text) + "</span></a>"
            );
          }).join("");
          gapsBoard.innerHTML =
            '<details><summary class="board-head" style="margin:0;cursor:pointer;">' +
            "<span>我的卡住题本（点击展开 " + gapList.length + " 道自留小题）</span><span>▾</span></summary>" +
            '<div class="gap-items" style="margin-top:0.6rem;">' + gapRows + "</div></details>";
        } else {
          gapsBoard.hidden = true;
        }
      }
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  decorateNavigation();

  window.addEventListener("study:hydrated", function () {
    decorateNavigation();
    if (study) {
      var sSlug = study.getAttribute("data-slug") || root.getAttribute("data-page-slug") || "";
      var isDone = readChapterField(sSlug, "completed") === "1";
      document.querySelectorAll("[data-done-toggle]").forEach(function (b) {
        b.setAttribute("aria-pressed", isDone ? "true" : "false");
        b.textContent = isDone ? "已学 ✓" : "标记已学";
      });
      study.querySelectorAll("textarea[data-note]").forEach(function (area) {
        if (document.activeElement !== area) {
          area.value = readChapterField(sSlug, area.getAttribute("data-note")) || "";
        }
      });
    }
  });

  // Scroll Memory per Page
  var pageId = root.getAttribute("data-page-slug") || location.pathname;
  var scrollKey = "study-scroll:" + pageId;
  if (!location.hash && pageId !== "home") {
    var savedY = lsGet(scrollKey) || lsGet("study-scroll:" + location.pathname);
    if (savedY) window.scrollTo(0, Number(savedY) || 0);
  }
  var scrollTimer;
  function rememberScroll() {
    if (pageId === "home") return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      lsSet(scrollKey, String(window.scrollY));
    }, 140);
  }
  window.addEventListener("pagehide", function () {
    if (pageId !== "home") lsSet(scrollKey, String(window.scrollY));
  });

  // Mobile Drawer Menu
  function setMenu(open) {
    if (!rail || !menuBtn || !scrim) return;
    rail.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    scrim.hidden = !open;
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      setMenu(!rail.classList.contains("open"));
    });
  }
  var closeBtn = document.querySelector("[data-rail-close]");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      setMenu(false);
    });
  }
  if (scrim) {
    scrim.addEventListener("click", function () {
      setMenu(false);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && rail && rail.classList.contains("open")) {
      setMenu(false);
    }
  });
  if (rail) {
    rail.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });
    var currentLink = rail.querySelector(".here");
    if (currentLink) {
      var rTop = rail.getBoundingClientRect().top;
      var lTop = currentLink.getBoundingClientRect().top;
      rail.scrollTop += lTop - rTop - rail.clientHeight / 3;
    }
  }

  // Reading Progress & Sticky TOC Spy
  function onScroll() {
    if (bar) {
      var max = root.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.width = (p * 100) + "%";
    }
    var tocLinks = document.querySelectorAll(".toc a");
    if (!tocLinks.length) return;
    var activeLink = null;
    tocLinks.forEach(function (link) {
      var id = decodeURIComponent(link.getAttribute("href") || "").slice(1);
      var el = id && document.getElementById(id);
      if (el && el.getBoundingClientRect().top < 128) activeLink = link;
      link.classList.remove("active");
    });
    if (activeLink) activeLink.classList.add("active");
  }
  onScroll();
  window.addEventListener("scroll", function () {
    onScroll();
    rememberScroll();
  }, { passive: true });
})();
