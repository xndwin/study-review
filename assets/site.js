
(function () {
  var root = document.documentElement;
  var rail = document.getElementById("rail");
  var menu = document.querySelector(".menu");
  var scrim = document.querySelector(".scrim");
  var bar = document.querySelector(".progress");

  function syncSize() {
    var current = getComputedStyle(root).getPropertyValue("--read").trim();
    document.querySelectorAll("[data-size]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-size") === current ? "true" : "false");
    });
  }
  var themeBtn = document.querySelector("button.theme");
  function syncTheme() {
    if (!themeBtn) return;
    var night = root.getAttribute("data-theme") === "night";
    themeBtn.setAttribute("aria-pressed", night ? "true" : "false");
    themeBtn.textContent = night ? "纸色" : "夜间";
  }
  syncSize();
  syncTheme();

  var study = document.querySelector("[data-study]");
  if (study) {
    function studyKey(name) {
      return "study-" + name + ":" + location.pathname;
    }
    function addDays(iso, n) {
      var d = new Date(iso + "T00:00:00");
      d.setDate(d.getDate() + n);
      var month = String(d.getMonth() + 1);
      var day = String(d.getDate());
      if (month.length < 2) month = "0" + month;
      if (day.length < 2) day = "0" + day;
      return d.getFullYear() + "-" + month + "-" + day;
    }
    var seenKey = studyKey("seen");
    var seen = "";
    try { seen = localStorage.getItem(seenKey) || ""; } catch (e) {}
    if (!seen) {
      var now = new Date();
      var month = String(now.getMonth() + 1);
      var day = String(now.getDate());
      if (month.length < 2) month = "0" + month;
      if (day.length < 2) day = "0" + day;
      seen = now.getFullYear() + "-" + month + "-" + day;
      try { localStorage.setItem(seenKey, seen); } catch (e) {}
    }
    var box = study.querySelector("[data-reviews]");
    [1, 3, 7, 14].forEach(function (gap) {
      var btn = document.createElement("button");
      btn.type = "button";
      var done = false;
      try { done = localStorage.getItem(studyKey("done-" + gap)) === "1"; } catch (e) {}
      btn.textContent = "第 " + gap + " 天 · " + addDays(seen, gap).slice(5);
      btn.setAttribute("aria-pressed", done ? "true" : "false");
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", next ? "true" : "false");
        try { localStorage.setItem(studyKey("done-" + gap), next ? "1" : "0"); } catch (e) {}
      });
      box.appendChild(btn);
    });
    var area = study.querySelector("textarea");
    if (area) {
      try { area.value = localStorage.getItem(studyKey("gap")) || ""; } catch (e) {}
      area.addEventListener("input", function () {
        try { localStorage.setItem(studyKey("gap"), area.value); } catch (e) {}
      });
    }
  }

  var scrollKey = "study-scroll:" + location.pathname;
  if (!location.hash) {
    try {
      var saved = localStorage.getItem(scrollKey);
      if (saved) window.scrollTo(0, Number(saved) || 0);
    } catch (e) {}
  }
  var scrollTimer;
  function rememberScroll() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      try { localStorage.setItem(scrollKey, String(window.scrollY)); } catch (e) {}
    }, 120);
  }
  window.addEventListener("pagehide", function () {
    try { localStorage.setItem(scrollKey, String(window.scrollY)); } catch (e) {}
  });

  document.querySelectorAll("[data-size]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var size = btn.getAttribute("data-size");
      root.style.setProperty("--read", size);
      try { localStorage.setItem("study-read-size", size); } catch (e) {}
      syncSize();
    });
  });
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var night = root.getAttribute("data-theme") === "night";
      if (night) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", "night");
      try { localStorage.setItem("study-theme", night ? "paper" : "night"); } catch (e) {}
      syncTheme();
    });
  }

  function setMenu(open) {
    if (!rail || !menu || !scrim) return;
    rail.classList.toggle("open", open);
    menu.setAttribute("aria-expanded", open ? "true" : "false");
    scrim.hidden = !open;
  }
  if (menu) menu.addEventListener("click", function () { setMenu(!rail.classList.contains("open")); });
  if (scrim) scrim.addEventListener("click", function () { setMenu(false); });
  if (rail) {
    rail.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
    var current = rail.querySelector(".here");
    if (current) {
      var railTop = rail.getBoundingClientRect().top;
      var linkTop = current.getBoundingClientRect().top;
      rail.scrollTop += linkTop - railTop - rail.clientHeight / 3;
    }
  }

  function onScroll() {
    if (!bar) return;
    var max = root.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.width = (p * 100) + "%";
    var links = document.querySelectorAll(".toc a");
    if (!links.length) return;
    var passed = null;
    links.forEach(function (link) {
      var id = decodeURIComponent(link.getAttribute("href") || "").slice(1);
      var el = id && document.getElementById(id);
      if (el && el.getBoundingClientRect().top < 120) passed = link;
      link.classList.remove("active");
    });
    if (passed) passed.classList.add("active");
  }
  onScroll();
  window.addEventListener("scroll", function () {
    onScroll();
    rememberScroll();
  }, { passive: true });
})();
