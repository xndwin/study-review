
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
