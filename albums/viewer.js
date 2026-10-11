(function () {
  var pdfjs = window["pdfjs-dist/build/pdf"];
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  var cfg = document.getElementById("viewer").dataset;
  var pagesEl = document.getElementById("pages"), status = document.getElementById("status"), pager = document.getElementById("pager");
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  var firstLayout = true;
  var pdf, zoom = 1, slots = [], rendered = {}, current = 1;

  function fitWidth() { return Math.min(window.innerWidth - 24, 1100); }

  function layout() {
    pagesEl.querySelectorAll(".page").forEach(function (el) { el.remove(); });
    slots = []; rendered = {};
    var tasks = [];
    for (var n = 1; n <= pdf.numPages; n++) tasks.push(pdf.getPage(n));
    Promise.all(tasks).then(function (pgs) {
      pgs.forEach(function (pg, i) {
        var base = pg.getViewport({ scale: 1 }), w = fitWidth() * zoom, h = w * base.height / base.width;
        var el = document.createElement("div");
        el.className = "page"; el.style.width = w + "px"; el.style.height = h + "px"; el.dataset.n = i + 1;
        pagesEl.appendChild(el); slots.push({ el: el, pg: pg, w: w });
        io.observe(el);
      });
      status.remove();
      if (firstLayout) { firstLayout = false; pagesEl.scrollTop = 0; }
      update();
    });
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var n = +e.target.dataset.n;
      if (e.isIntersecting && !rendered[n]) { rendered[n] = true; draw(slots[n - 1]); }
    });
  }, { root: pagesEl, rootMargin: "800px 0px" });

  function draw(s) {
    var dpr = window.devicePixelRatio || 1, vp = s.pg.getViewport({ scale: s.w / s.pg.getViewport({ scale: 1 }).width * dpr });
    var c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height;
    s.pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise.then(function () { s.el.appendChild(c); });
  }

  function update() {
    var top = pagesEl.scrollTop + pagesEl.clientHeight / 3, cur = 1;
    slots.forEach(function (s, i) { if (s.el.offsetTop <= top) cur = i + 1; });
    current = cur;
    pager.textContent = cur + " / " + pdf.numPages;
  }

  function goTo(n) {
    if (!pdf) return;
    n = Math.max(1, Math.min(pdf.numPages, n));
    slots[n - 1] && pagesEl.scrollTo({ top: slots[n - 1].el.offsetTop - 56, behavior: "smooth" });
  }

  function setZoom(z) {
    var ratio = pagesEl.scrollTop / (pagesEl.scrollHeight || 1);
    zoom = Math.max(.5, Math.min(3, z)); layout();
    setTimeout(function () { pagesEl.scrollTop = ratio * pagesEl.scrollHeight; }, 50);
  }

  document.getElementById("zin").onclick = function () { setZoom(zoom + .25); };
  document.getElementById("zout").onclick = function () { setZoom(zoom - .25); };
  document.getElementById("prev").onclick = function () { goTo(current - 1); };
  document.getElementById("next").onclick = function () { goTo(current + 1); };
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goTo(current - 1); }
    else if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goTo(current + 1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(1); }
    else if (e.key === "End") { e.preventDefault(); goTo(pdf.numPages); }
  });
  pagesEl.addEventListener("scroll", function () { pdf && update(); });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { pdf && layout(); }, 200); });

  pdfjs.getDocument({ url: cfg.pdf }).promise.then(function (d) { pdf = d; layout(); }, function () {
    status.textContent = "Couldn't load this album.";
  });
})();
