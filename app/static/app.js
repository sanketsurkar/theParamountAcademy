/* Paramount Academy Lite v2 — interactions. Plain JavaScript, no libraries, works offline. */
(function () {
  "use strict";
  var doc = document, body = doc.body;
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var csrf = (doc.querySelector('meta[name="csrf"]') || {}).content || "";
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function inr(n) { return "\u20B9" + Math.round(n).toLocaleString("en-IN"); }

  /* ------------------------------------------------------------ service worker */
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(function () {});

  /* ------------------------------------------------------------ theme toggle */
  function setTheme(t) {
    doc.documentElement.dataset.theme = t;
    try { localStorage.setItem("tpa-theme", t); } catch (e) {}
    $$("[data-theme-toggle]").forEach(paintToggle);
  }
  function paintToggle(b) {
    var dark = currentTheme() === "dark";
    b.textContent = (dark ? "\u2600\uFE0F" : "\uD83C\uDF19") + (b.hasAttribute("data-label") ? "  " + (dark ? "Light mode" : "Dark mode") : "");
  }
  function currentTheme() {
    return doc.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  $$("[data-theme-toggle]").forEach(function (b) {
    paintToggle(b);
    b.addEventListener("click", function () { setTheme(currentTheme() === "dark" ? "light" : "dark"); });
  });

  /* ------------------------------------------------------------ toasts */
  var toastBox = $("#toasts");
  window.toast = function (msg, kind) {
    if (!toastBox) return;
    var t = doc.createElement("div");
    t.className = "toast " + (kind || "");
    t.setAttribute("role", "status");
    t.innerHTML = '<span></span><button class="x" aria-label="Dismiss">\u00D7</button>';
    t.firstChild.textContent = msg;
    toastBox.appendChild(t);
    setTimeout(function () { t.remove(); }, kind === "error" ? 9000 : 5600);
  };
  doc.addEventListener("click", function (e) {
    var x = e.target.closest(".toast .x");
    if (x) x.parentNode.remove();
  });
  $$(".toast.error").forEach(function (t) { setTimeout(function () { t.remove(); }, 9000); });

  /* ------------------------------------------------------------ offline banner */
  var banner = $("#offline");
  function updateBanner() {
    if (!banner) return;
    banner.textContent = "\uD83D\uDCF6 You're offline \u2014 showing the copy saved " + (body.dataset.rendered || "earlier");
    banner.hidden = navigator.onLine;
  }
  addEventListener("online", function () { updateBanner(); });
  addEventListener("offline", updateBanner);
  updateBanner();

  /* ------------------------------------------------------------ top progress bar + button spinners */
  var np = $("#nprogress");
  function startProgress() { if (np) { np.classList.remove("on"); void np.offsetWidth; np.classList.add("on"); } }
  addEventListener("pageshow", function () {
    if (np) np.classList.remove("on");
    $$(".btn.loading").forEach(function (b) { b.classList.remove("loading"); b.disabled = false; });
  });
  doc.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute("download")) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto|tel|upi|javascript):/i.test(href) || a.origin !== location.origin) return;
    if (a.hasAttribute("data-panel") || a.hasAttribute("data-noprogress")) return;
    startProgress();
  });
  doc.addEventListener("submit", function (e) {
    var form = e.target;
    var msg = form.getAttribute("data-confirm");
    if (msg && !confirm(msg)) { e.preventDefault(); return; }
    if (form.hasAttribute("data-upload") || e.defaultPrevented) return;
    var btn = e.submitter || $("button[type=submit], button:not([type])", form);
    if (btn && btn.classList.contains("btn")) {
      setTimeout(function () { btn.classList.add("loading"); btn.disabled = true; }, 0);
    }
    startProgress();
  });

  /* ------------------------------------------------------------ dialogs (sheets & modals) */
  function closeDialog(d) {
    if (!d || !d.open) return;
    if (reduceMotion) { d.close(); return; }
    d.classList.add("closing");
    setTimeout(function () { d.classList.remove("closing"); d.close(); }, 200);
  }
  window.openDialog = function (d) { if (d && !d.open) { d.showModal(); var f = $("[autofocus]", d); if (f) f.focus(); } };
  doc.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-open]");
    if (opener) {
      var d = doc.getElementById(opener.getAttribute("data-open"));
      if (!d) return;
      e.preventDefault();
      var form = $("form", d);
      var action = opener.getAttribute("data-action");
      if (form && action) form.setAttribute("action", action);
      var values = opener.getAttribute("data-values");
      if (values) {
        try {
          var v = JSON.parse(values);
          Object.keys(v).forEach(function (k) {
            $$('[name="' + k + '"]', d).forEach(function (el) {
              if (el.type === "radio" || el.type === "checkbox") el.checked = String(el.value) === String(v[k]);
              else el.value = v[k];
            });
            $$('[data-text="' + k + '"]', d).forEach(function (el) { el.textContent = v[k]; });
          });
        } catch (err) {}
      }
      openDialog(d);
      return;
    }
    if (e.target.closest("[data-close]")) { closeDialog(e.target.closest("dialog")); return; }
    if (e.target.tagName === "DIALOG") {  // click on backdrop
      var r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(e.target);
    }
  });
  doc.addEventListener("cancel", function (e) {
    if (e.target.tagName === "DIALOG") { e.preventDefault(); closeDialog(e.target); }
  }, true);

  /* ------------------------------------------------------------ side panel (loads a page fragment) */
  var panel = $("#panel");
  doc.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-panel]");
    if (!a || !panel || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    var bodyEl = $(".sheet-body", panel);
    $(".sheet-head h3", panel).textContent = a.getAttribute("data-title") || "";
    bodyEl.innerHTML = '<div class="skeleton" style="width:60%"></div><div class="skeleton tall"></div><div class="skeleton"></div><div class="skeleton" style="width:80%"></div>';
    openDialog(panel);
    fetch(a.href, { headers: { "X-Partial": "1" }, credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) { bodyEl.innerHTML = html; init(bodyEl); })
      .catch(function () { location.href = a.href; });
  });

  /* ------------------------------------------------------------ count-up numbers */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var money = el.hasAttribute("data-money");
    var pre = el.getAttribute("data-pre") || "", suf = el.getAttribute("data-suf") || "";
    function fmt(n) { return pre + (money ? inr(n) : n.toFixed(dec)) + suf; }
    if (reduceMotion) { el.textContent = fmt(target); return; }
    var start = performance.now(), dur = body.classList.contains("staff") ? 700 : 1100;
    function step(t) {
      var p = Math.min((t - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------ carousel dots */
  function initCarousel(c) {
    var dots = c.nextElementSibling;
    if (!dots || !dots.classList.contains("dots")) return;
    var items = c.children;
    dots.innerHTML = "";
    for (var i = 0; i < items.length; i++) dots.appendChild(doc.createElement("i"));
    function update() {
      var best = 0, bestDist = Infinity, mid = c.scrollLeft + c.clientWidth / 2;
      for (var i = 0; i < items.length; i++) {
        var d = Math.abs(items[i].offsetLeft + items[i].offsetWidth / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      Array.prototype.forEach.call(dots.children, function (dot, i) { dot.classList.toggle("on", i === best); });
    }
    c.addEventListener("scroll", function () { requestAnimationFrame(update); }, { passive: true });
    update();
    if (items.length < 2) dots.hidden = true;
  }

  /* ------------------------------------------------------------ instant search filter */
  function initFilter(input) {
    var target = $(input.getAttribute("data-filter"));
    var empty = $(input.getAttribute("data-empty") || "#nomatch");
    if (!target) return;
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase(), shown = 0;
      Array.prototype.forEach.call(target.children, function (row) {
        var hit = !q || row.textContent.toLowerCase().indexOf(q) >= 0;
        row.hidden = !hit;
        if (hit) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  }

  /* ------------------------------------------------------------ save course files offline */
  function initSaveButtons(root) {
    var buttons = $$("[data-save]", root);
    if (!buttons.length) return;
    if (!("caches" in window)) { buttons.forEach(function (b) { b.hidden = true; }); return; }
    caches.open("tpa-files").then(function (cache) {
      buttons.forEach(function (btn) {
        var url = btn.getAttribute("data-save");
        function mark(saved) {
          btn.dataset.saved = saved ? "1" : "";
          btn.textContent = saved ? "\u2713 Saved" : "\u2B07 Save offline";
        }
        cache.match(url).then(function (hit) { mark(!!hit); });
        btn.addEventListener("click", function () {
          if (btn.dataset.saved) { cache.delete(url).then(function () { mark(false); toast("Removed from this phone", "info"); }); return; }
          btn.classList.add("loading");
          fetch(url, { credentials: "same-origin" }).then(function (res) {
            if (!res.ok || res.redirected) throw new Error("failed");
            return cache.put(url, res);
          }).then(function () { mark(true); toast("Saved \u2014 opens without internet now"); })
            .catch(function () { toast("Couldn't save. Check your connection.", "error"); })
            .then(function () { btn.classList.remove("loading"); });
        });
      });
    });
  }

  /* ------------------------------------------------------------ password show/hide, copy */
  doc.addEventListener("click", function (e) {
    var b = e.target.closest("[data-reveal]");
    if (b) {
      var input = b.parentNode.querySelector("input");
      input.type = input.type === "password" ? "text" : "password";
      b.textContent = input.type === "password" ? "\uD83D\uDC41" : "\uD83D\uDE48";
      return;
    }
    var c = e.target.closest("[data-copy]");
    if (c) {
      var text = c.getAttribute("data-copy");
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
        toast("Copied " + text);
      }, function () { prompt("Copy this:", text); });
      return;
    }
    if (e.target.closest("[data-print]")) { print(); return; }
    if (e.target.closest("[data-back]") && history.length > 1) { e.preventDefault(); history.back(); return; }
    var fill = e.target.closest("[data-fill-login]");
    if (fill) {
      var parts = fill.getAttribute("data-fill-login").split("|");
      $("#login_id").value = parts[0]; $("#password").value = parts[1];
      $("#password").focus();
    }
  });

  /* ------------------------------------------------------------ drag & drop upload with progress */
  function initUpload(form) {
    var zone = $(".dropzone", form), input = $("input[type=file]", form);
    var picked = $(".picked", form), barWrap = $(".upbar", form), bar = barWrap && $("i", barWrap);
    var maxMb = parseFloat(form.getAttribute("data-max-mb") || "10");
    var accept = (input.getAttribute("accept") || "").split(",").map(function (s) { return s.trim().toLowerCase(); });
    function show() {
      var f = input.files[0];
      if (!f) { picked.textContent = ""; return; }
      picked.textContent = "\uD83D\uDCC4 " + f.name + " \u00B7 " + (f.size / 1048576).toFixed(1) + " MB";
      var title = $('input[name="title"]', form);
      if (title && !title.value) title.value = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    }
    ["dragenter", "dragover"].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("drag"); }); });
    ["dragleave", "drop"].forEach(function (ev) { zone.addEventListener(ev, function () { zone.classList.remove("drag"); }); });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; show(); }
    });
    input.addEventListener("change", show);
    form.addEventListener("submit", function (e) {
      if (e.defaultPrevented) return;
      var f = input.files[0];
      if (!f) { e.preventDefault(); toast("Choose a file first.", "error"); return; }
      var ext = "." + f.name.split(".").pop().toLowerCase();
      if (accept.length && accept[0] && accept.indexOf(ext) < 0) { e.preventDefault(); toast("This file type isn't allowed here.", "error"); return; }
      if (f.size > maxMb * 1048576) { e.preventDefault(); toast("File is larger than " + maxMb + " MB. Compress it and try again.", "error"); return; }
      if (!window.FormData || !bar) return;  // fall back to a normal submit
      e.preventDefault();
      var btn = $("button[type=submit]", form);
      if (btn) { btn.classList.add("loading"); btn.disabled = true; }
      barWrap.hidden = false;
      var xhr = new XMLHttpRequest();
      xhr.open("POST", form.action);
      xhr.upload.onprogress = function (ev) { if (ev.lengthComputable) bar.style.width = (ev.loaded / ev.total * 100) + "%"; };
      xhr.onload = function () { location.href = xhr.responseURL || location.href; };
      xhr.onerror = function () {
        toast("Upload failed. Check your connection and try again.", "error");
        if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
        barWrap.hidden = true; bar.style.width = "0";
      };
      xhr.send(new FormData(form));
    });
  }

  /* ------------------------------------------------------------ marks grid: keyboard, live totals, autosave */
  function initMarks(table) {
    var max = parseFloat(table.getAttribute("data-max"));
    var url = table.getAttribute("data-autosave");
    var state = $("#save-state"), stateText = state && $("span", state);
    var inputs = $$("input.mk", table);
    var pending = {}, timer = null, inflight = false;
    var rows = $$("tbody tr", table);

    function valid(input) {
      var v = input.value.trim();
      if (v === "") return true;
      var n = Number(v);
      return !isNaN(n) && n >= 0 && n <= max;
    }
    function check(input) {
      var ok = valid(input);
      input.classList.toggle("bad", !ok);
      input.classList.toggle("done", ok && input.value.trim() !== "");
      input.setAttribute("aria-invalid", ok ? "false" : "true");
      return ok;
    }
    function totals() {
      rows.forEach(function (tr) {
        var sum = 0, n = 0;
        $$("input.mk", tr).forEach(function (i) { if (i.value.trim() !== "" && valid(i)) { sum += Number(i.value); n++; } });
        var cell = $(".tot", tr);
        if (cell) cell.textContent = n ? Math.round(sum / (n * max) * 1000) / 10 + "%" : "\u2014";
      });
      $$("[data-avg]", table).forEach(function (cell) {
        var col = cell.getAttribute("data-avg"), sum = 0, n = 0;
        $$('input.mk[data-col="' + col + '"]', table).forEach(function (i) { if (i.value.trim() !== "" && valid(i)) { sum += Number(i.value); n++; } });
        cell.textContent = n ? "Avg " + (Math.round(sum / n * 10) / 10) : "\u2014";
      });
      var filled = inputs.filter(function (i) { return i.value.trim() !== "" && valid(i); }).length;
      var fc = $("#filled"); if (fc) fc.textContent = filled + " / " + inputs.length + " marks entered";
    }
    function setState(kind, text) {
      if (!state) return;
      state.className = "save-state " + kind;
      stateText.textContent = text;
    }
    function flush() {
      if (!url || inflight) return;
      var keys = Object.keys(pending);
      if (!keys.length) return;
      var batch = pending; pending = {}; inflight = true;
      setState("saving", "Saving\u2026");
      fetch(url, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf, "Accept": "application/json" },
        body: JSON.stringify({ cells: batch })
      }).then(function (r) {
        if (r.status === 401) { location.href = "/login"; throw new Error("auth"); }
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }).then(function (data) {
        inflight = false;
        var badCount = $$("input.mk.bad", table).length;
        if (data.problems && data.problems.length) { setState("error", "Some marks are invalid"); toast(data.problems[0], "error"); }
        else if (badCount) setState("error", badCount + " red cell" + (badCount > 1 ? "s" : "") + " not saved (0\u2013" + max + ")");
        else setState("", "All changes saved \u2713 " + data.at);
        if (Object.keys(pending).length) flush();
      }).catch(function () {
        inflight = false;
        Object.keys(batch).forEach(function (k) { if (!(k in pending)) pending[k] = batch[k]; });
        setState("error", "Not saved \u2014 will retry when you're back online");
      });
    }
    function queue(input) {
      if (input.classList.contains("mk") && !check(input)) { setState("error", "Fix the red cell (0\u2013" + max + ")"); return; }
      pending[input.name] = input.value.trim();
      clearTimeout(timer);
      timer = setTimeout(flush, 700);
      setState("saving", "Unsaved changes\u2026");
    }
    inputs.forEach(check);
    totals();
    $$("input", table).forEach(function (input) {
      input.addEventListener("input", function () { if (input.classList.contains("mk")) { check(input); totals(); } });
      input.addEventListener("change", function () { queue(input); });
      input.addEventListener("focus", function () {
        rows.forEach(function (r) { r.classList.remove("focus"); });
        input.closest("tr").classList.add("focus");
        input.select && input.select();
      });
      input.addEventListener("keydown", function (e) {
        var td = input.closest("td"), tr = td.parentNode;
        var col = Array.prototype.indexOf.call(tr.children, td);
        var ri = rows.indexOf(tr), target = null;
        if (e.key === "Enter" || e.key === "ArrowDown") target = rows[ri + 1];
        else if (e.key === "ArrowUp") target = rows[ri - 1];
        if (target) {
          e.preventDefault();
          var next = target.children[col] && $("input", target.children[col]);
          if (next) next.focus();
          return;
        }
        if ((e.key === "ArrowRight" && input.selectionEnd === input.value.length) || (e.key === "ArrowLeft" && input.selectionStart === 0)) {
          var cells = $$("input", tr), i = cells.indexOf(input) + (e.key === "ArrowRight" ? 1 : -1);
          if (cells[i]) { e.preventDefault(); cells[i].focus(); }
        }
      });
    });
    addEventListener("online", flush);
    addEventListener("beforeunload", function (e) {
      if (Object.keys(pending).length || inflight) { flush(); e.preventDefault(); e.returnValue = ""; }
    });
    var form = table.closest("form");
    if (form && url) form.addEventListener("submit", function () { pending = {}; });
  }

  /* ------------------------------------------------------------ student tab indicator */
  function initTabs() {
    var ind = $(".tabbar .ind");
    if (!ind) return;
    var cur = parseInt(ind.getAttribute("data-i"), 10);
    if (cur < 0) { ind.classList.add("none"); return; }
    var prev = parseInt(sessionStorage.getItem("tpa-tab") || String(cur), 10);
    if (!reduceMotion && prev !== cur && prev >= 0) {
      ind.style.transition = "none";
      ind.style.setProperty("--i", prev);
      void ind.offsetWidth;
      ind.style.transition = "";
    }
    requestAnimationFrame(function () { ind.style.setProperty("--i", cur); });
    sessionStorage.setItem("tpa-tab", cur);
  }

  /* ------------------------------------------------------------ pull to refresh (student app) */
  function initPullToRefresh() {
    if (!body.classList.contains("student") || !("ontouchstart" in window)) return;
    var ptr = doc.createElement("div"); ptr.className = "ptr"; ptr.textContent = "\u21BB"; body.appendChild(ptr);
    var startY = null, dy = 0;
    addEventListener("touchstart", function (e) {
      if (scrollY <= 0 && !doc.querySelector("dialog[open]")) startY = e.touches[0].clientY; else startY = null;
    }, { passive: true });
    addEventListener("touchmove", function (e) {
      if (startY === null) return;
      dy = Math.max(0, Math.min(e.touches[0].clientY - startY, 140));
      ptr.style.setProperty("--y", (dy * 0.6 - 40) + "px");
      ptr.style.setProperty("--o", Math.min(dy / 80, 1));
    }, { passive: true });
    addEventListener("touchend", function () {
      if (startY === null) return;
      if (dy > 85 && navigator.onLine) { ptr.classList.add("go"); startProgress(); location.reload(); }
      else { ptr.style.setProperty("--o", 0); ptr.style.setProperty("--y", "-80px"); }
      startY = null; dy = 0;
    });
  }

  /* ------------------------------------------------------------ confetti (top-3 rank, once per exam) */
  function confetti() {
    var key = body.getAttribute("data-confetti");
    if (!key || reduceMotion) return;
    try { if (localStorage.getItem("tpa-cf-" + key)) return; localStorage.setItem("tpa-cf-" + key, "1"); } catch (e) {}
    var c = doc.createElement("canvas"); c.id = "confetti"; body.appendChild(c);
    var ctx = c.getContext("2d"), W = c.width = innerWidth, H = c.height = innerHeight;
    var colors = ["#f59e0b", "#3352d6", "#16a34a", "#e11d48", "#7c3aed", "#0ea5e9"], parts = [];
    for (var i = 0; i < 140; i++) parts.push({
      x: W / 2 + (Math.random() - .5) * 80, y: H * .35, vx: (Math.random() - .5) * 14, vy: Math.random() * -14 - 4,
      s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[i % colors.length]
    });
    var start = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += .38; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (t - start < 3200) requestAnimationFrame(frame); else c.remove();
    })(start);
  }

  /* ------------------------------------------------------------ logged-out: wipe offline copies */
  if (body.hasAttribute("data-clear-cache") && "caches" in window) {
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k === "tpa-pages" || k === "tpa-files"; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { var m = $("#clear-msg"); if (m) m.textContent = "Saved pages were removed from this device."; });
    try { sessionStorage.removeItem("tpa-tab"); } catch (e) {}
  }

  /* ------------------------------------------------------------ init (also used for panel content) */
  function init(root) {
    root = root || doc;
    var counters = $$("[data-count]", root);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); io.unobserve(en.target); } });
      });
      counters.forEach(function (el) { io.observe(el); });
    } else counters.forEach(countUp);
    $$(".carousel", root).forEach(initCarousel);
    $$("[data-filter]", root).forEach(initFilter);
    $$("form[data-upload]", root).forEach(initUpload);
    $$("table[data-max]", root).forEach(initMarks);
    initSaveButtons(root);
    $$(".chips .chip.on", root).forEach(function (c) {
      var box = c.parentNode;
      box.scrollLeft = c.offsetLeft - box.clientWidth / 2 + c.offsetWidth / 2;
    });
  }
  window.tpaInit = init;
  init(doc);
  initTabs();
  initPullToRefresh();
  setTimeout(confetti, 900);
})();
