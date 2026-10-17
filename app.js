(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const STORE_KEY = "snipurl-links-v1";
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const appView = $("app-view");
  const redirectView = $("redirect-view");
  const form = $("shorten-form");
  const urlInput = $("url-input");
  const aliasInput = $("alias-input");
  const formMsg = $("form-msg");
  const result = $("result");
  const resultLink = $("result-link");
  const resultCopy = $("result-copy");
  const resultOriginal = $("result-original");
  const listEl = $("link-list");
  const emptyMsg = $("empty-msg");
  const searchInput = $("search");
  const toast = $("toast");

  const shortBase = () =>
    `${location.origin}${location.pathname}#/`;

  /* ---------- Storage ---------- */
  const loadLinks = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch {
      return {};
    }
  };
  const saveLinks = (links) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(links));
    } catch { /* storage full/unavailable */ }
  };

  const bumpClicks = (code) => {
    const links = loadLinks();
    if (links[code]) {
      links[code].clicks = (links[code].clicks || 0) + 1;
      saveLinks(links);
    }
  };

  /* ---------- Helpers ---------- */
  const randInt = (max) => {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  };

  const newCode = (links, len = 6) => {
    let code;
    do {
      code = Array.from({ length: len }, () => ALPHA[randInt(ALPHA.length)]).join("");
    } while (links[code]);
    return code;
  };

  const normalizeUrl = (raw) => {
    let value = raw.trim();
    if (!value) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.href;
  };

  const timeAgo = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? "yesterday" : `${d}d ago`;
  };

  let toastTimer;
  const showToast = (text) => {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 1800);
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      showToast("Copied to clipboard");
    } catch {
      showToast("Copy failed — select it manually");
    }
  };

  /* ---------- Redirect route (#/code) ---------- */
  let redirectTimer;
  const stopRedirect = () => {
    clearInterval(redirectTimer);
    redirectTimer = undefined;
  };

  const handleRedirect = () => {
    const match = location.hash.match(/^#\/([A-Za-z0-9_-]+)$/);
    if (!match) return false;

    const code = match[1];
    const links = loadLinks();
    const entry = links[code];

    appView.hidden = true;
    redirectView.hidden = false;

    const title = $("redirect-title");
    const urlEl = $("redirect-url");
    const note = $("redirect-note");
    const goLink = $("redirect-link");
    const back = $("redirect-back");

    if (!entry) {
      title.textContent = "🔍 Snip not found";
      urlEl.textContent = `snip code: ${code}`;
      note.textContent = "This snip doesn't exist in this browser — snips are stored locally, so links created on another device won't resolve here.";
      goLink.hidden = true;
      back.textContent = "Create a snip";
      document.title = "Snip not found — SnipURL";
      return true;
    }

    bumpClicks(code);
    document.title = `Redirecting… — SnipURL`;
    urlEl.textContent = entry.url;
    goLink.href = entry.url;
    note.textContent = "You'll be redirected automatically in a moment.";

    let seconds = 3;
    title.textContent = `Taking you there in ${seconds}…`;
    redirectTimer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(redirectTimer);
        try {
          location.replace(entry.url);
          return;
        } catch { /* fall through to manual link */ }
      }
      title.textContent = `Taking you there in ${seconds}…`;
    }, 1000);

    return true;
  };

  /* ---------- Router ---------- */
  const route = () => {
    stopRedirect();
    if (!handleRedirect()) {
      appView.hidden = false;
      redirectView.hidden = true;
      document.title = "SnipURL — Fast Link Shortener";
      render();
    }
  };

  window.addEventListener("hashchange", route);

  /* ---------- Stats & history ---------- */
  const renderStats = (links) => {
    const codes = Object.keys(links);
    const clicks = codes.reduce((sum, c) => sum + (links[c].clicks || 0), 0);
    const saved = codes.reduce(
      (sum, c) => sum + Math.max(links[c].url.length - (shortBase().length + c.length), 0),
      0
    );
    $("stat-links").textContent = codes.length;
    $("stat-clicks").textContent = clicks.toLocaleString("en-US");
    $("stat-chars").textContent = saved.toLocaleString("en-US");
  };

  const linkItem = (code, entry) => {
    const li = document.createElement("li");
    li.className = "link-item";
    li.dataset.code = code;

    const top = document.createElement("div");
    top.className = "link-item-top";

    const short = document.createElement("a");
    short.className = "link-short";
    short.href = `${shortBase()}${code}`;
    short.textContent = `${shortBase().replace(/^https?:\/\//, "")}${code}`;

    const actions = document.createElement("div");
    actions.className = "link-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "mini-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => copyText(`${shortBase()}${code}`));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "mini-btn danger";
    delBtn.textContent = "Delete";
    delBtn.setAttribute("aria-label", `Delete snip ${code}`);
    delBtn.addEventListener("click", () => {
      const links = loadLinks();
      delete links[code];
      saveLinks(links);
      render();
      showToast("Snip deleted");
    });

    actions.append(copyBtn, delBtn);
    top.append(short, actions);

    const orig = document.createElement("a");
    orig.className = "link-original";
    orig.href = entry.url;
    orig.target = "_blank";
    orig.rel = "noopener noreferrer";
    orig.textContent = entry.url;

    const meta = document.createElement("p");
    meta.className = "link-meta";
    const clicks = document.createElement("span");
    clicks.className = "clicks";
    clicks.textContent = `${entry.clicks || 0} clicks`;
    const created = document.createElement("span");
    created.textContent = timeAgo(entry.created);
    meta.append(clicks, created);

    li.append(top, orig, meta);
    return li;
  };

  const render = () => {
    const links = loadLinks();
    const query = searchInput.value.trim().toLowerCase();
    const codes = Object.keys(links)
      .sort((a, b) => links[b].created - links[a].created)
      .filter(
        (c) =>
          !query ||
          c.toLowerCase().includes(query) ||
          links[c].url.toLowerCase().includes(query)
      );

    listEl.replaceChildren(...codes.map((c) => linkItem(c, links[c])));
    emptyMsg.hidden = codes.length > 0;
    emptyMsg.textContent = query
      ? `No snips match “${query}”.`
      : "No links yet — snip your first one above.";
    renderStats(links);
  };

  /* ---------- Form ---------- */
  const showMsg = (text, ok = false) => {
    formMsg.textContent = text;
    formMsg.classList.toggle("is-ok", ok);
    formMsg.hidden = false;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const url = normalizeUrl(urlInput.value);
    if (!url) {
      urlInput.classList.add("is-invalid");
      showMsg("That doesn't look like a valid URL. Try something like example.com/page");
      urlInput.focus();
      return;
    }
    urlInput.classList.remove("is-invalid");

    const links = loadLinks();
    const existing = Object.entries(links).find(([, v]) => v.url === url);
    const alias = aliasInput.value.trim();

    if (alias) {
      if (!/^[A-Za-z0-9_-]+$/.test(alias)) {
        aliasInput.classList.add("is-invalid");
        showMsg("Alias can only use letters, numbers, dashes and underscores.");
        aliasInput.focus();
        return;
      }
      if (links[alias] && (!existing || existing[0] !== alias)) {
        aliasInput.classList.add("is-invalid");
        showMsg(`Alias “${alias}” is already taken.`);
        aliasInput.focus();
        return;
      }
    }
    aliasInput.classList.remove("is-invalid");

    const code = alias || (existing ? existing[0] : newCode(links));
    links[code] = existing && existing[0] === code ? existing[1] : { url, created: Date.now(), clicks: 0 };
    saveLinks(links);

    const short = `${shortBase()}${code}`;
    resultLink.href = short;
    resultLink.textContent = short.replace(/^https?:\/\//, "");
    resultOriginal.textContent = url;
    result.hidden = false;

    formMsg.hidden = true;
    if (existing && existing[0] === code) {
      showMsg("This URL was already snipped — here's your existing link.", true);
    } else {
      showToast("Snip created");
    }

    urlInput.value = "";
    aliasInput.value = "";
    render();
    result.scrollIntoView({ block: "nearest" });
  });

  urlInput.addEventListener("input", () => {
    urlInput.classList.remove("is-invalid");
    formMsg.hidden = true;
  });
  aliasInput.addEventListener("input", () => aliasInput.classList.remove("is-invalid"));

  resultCopy.addEventListener("click", () => copyText(resultLink.href));

  searchInput.addEventListener("input", render);

  $("alias-prefix").textContent = shortBase().replace(/^https?:\/\//, "");
  $("year").textContent = new Date().getFullYear();

  route();
})();
