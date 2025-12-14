/* global React, ReactDOM */
(() => {
  const { useState, useEffect, useMemo } = React;

  // Branding
  // #78b4ff => RGB 120 180 255
  const BRAND_PRIMARY_RGB = "120 180 255";
  const BRAND_LOGO_SRC = "assets/img/logo-nh-glow.svg";

  // Footer Social Links: URLs bitte anpassen
  const SOCIAL_LINKS = [
    { label: "GitHub", href: "#", icon: "github" },
    { label: "LinkedIn", href: "#", icon: "linkedin" },
    { label: "E-Mail", href: "mailto:your@mail.tld", icon: "mail" },
    { label: "No Cookies", href: "javascript:void(0)", icon: "cookie", nocookies: true }
  ];

  // ---- IPv4 Helpers -----------------------------------------------------
  function ipToInt(ip) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some(x => Number.isNaN(x) || x < 0 || x > 255)) return null;
    return (((p[0] << 24) >>> 0) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  }

  function intToIp(i) {
    return [(i >>> 24) & 255, (i >>> 16) & 255, (i >>> 8) & 255, i & 255].join(".");
  }

  function maskFromPrefix(pr) {
    return pr === 0 ? 0 : (0xffffffff << (32 - pr)) >>> 0;
  }

  function networkAddress(i, pr) {
    return (i & maskFromPrefix(pr)) >>> 0;
  }

  function broadcastAddress(i, pr) {
    const m = maskFromPrefix(pr);
    return (i | (~m >>> 0)) >>> 0;
  }

  function parseCIDR(s) {
    const m = s.trim().match(/^([0-9.]+)\/(\d{1,2})$/);
    if (!m) return null;
    const ip = ipToInt(m[1]);
    const p = +m[2];
    if (ip == null || p < 0 || p > 32) return null;
    return { base: networkAddress(ip, p), prefix: p };
  }

  function rangeFor(p, b) {
    const f = b >>> 0;
    const l = broadcastAddress(b, p) >>> 0;
    let uf = f, ul = l;
    if (p <= 30) { uf = f + 1; ul = l - 1; }
    return {
      first: f, last: l,
      usableFirst: uf, usableLast: ul,
      hosts: p >= 31 ? 2 ** (32 - p) : Math.max(0, 2 ** (32 - p) - 2)
    };
  }

  function splitInto(p, b, tp) {
    const c = 2 ** (tp - p);
    const bs = 2 ** (32 - tp);
    return Array.from({ length: c }, (_, i) => ({ base: (b + i * bs) >>> 0, prefix: tp }));
  }

  function fmtRange(a, b) { return `${intToIp(a)} - ${intToIp(b)}`; }

  function fmtUsable(p, r) {
    return p >= 31 ? fmtRange(r.first, r.last)
      : (r.usableFirst > r.usableLast ? "—" : fmtRange(r.usableFirst, r.usableLast));
  }

  function dottedMask(prefix) { return intToIp(maskFromPrefix(prefix) >>> 0); }

  function wildcardMask(prefix) {
    const m = maskFromPrefix(prefix) >>> 0;
    return intToIp((~m) >>> 0);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  }

  function iconSvg(name) {
    if (name === "github") return `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.73.5.75 5.7.75 12.1c0 5.1 3.2 9.4 7.6 10.9.6.1.8-.3.8-.6v-2.2c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1.8 2.6 3.3 1.9.1-.8.4-1.3.7-1.6-2.5-.3-5.1-1.3-5.1-5.7 0-1.3.4-2.3 1.1-3.1-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 3 .1.9-.3 1.9-.4 2.9-.4 1 0 2 .1 2.9.4 2.1-.4 3-.1 3-.1.6 1.5.2 2.6.1 2.9.7.8 1.1 1.8 1.1 3.1 0 4.4-2.6 5.4-5.1 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.4-1.5 7.6-5.8 7.6-10.9C23.25 5.7 18.27.5 12 .5z"/></svg>`;
    if (name === "linkedin") return `
      <svg viewBox="0 0 448 512" aria-hidden="true"><path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"/></svg>`;
    if (name === "mail") return `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.1-.5 7.4 5.1c.3.2.7.2 1 0L19.9 6H4.1Zm15.9 2.3-6.7 4.6c-1 .7-2.4.7-3.4 0L3.2 8.3V17.5c0 .7.6 1.5 1.3 1.5h15c.7 0 1.5-.8 1.5-1.5V8.3Z"/></svg>`;
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10c0-.3 0-.6-.1-.9-1.2.2-2.4-.3-3.2-1.1-.9-.9-1.3-2.2-1.1-3.4-.3 0-.6.1-.9.1-1.1 0-2.2-.4-3-1.2-.8-.8-1.2-1.9-1.2-3.1 0-.2 0-.3 0-.5C12.6 2 12.3 2 12 2Zm-3.5 9A1.5 1.5 0 1 1 7 12.5 1.5 1.5 0 0 1 8.5 11Zm7 2A1.5 1.5 0 1 1 14 14.5 1.5 1.5 0 0 1 15.5 13ZM10 15.5A1.5 1.5 0 1 1 8.5 17 1.5 1.5 0 0 1 10 15.5Z"/></svg>`;
  }

  // ---- UI Primitives ----------------------------------------------------
  function IconButton({ label, onClick, variant, disabled }) {
    const base = "px-2.5 py-1.5 rounded-xl text-xs border flex items-center gap-2";
    const cls = variant === "light"
      ? base + " border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:text-slate-400 disabled:hover:bg-white"
      : base + " border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 disabled:text-slate-600 disabled:hover:bg-white/5";
    return React.createElement("button", { onClick, className: cls, disabled, title: label }, label);
  }

  // ---- Row --------------------------------------------------------------
  function Row({ node, level, onAction, isLight, notify }) {
    const r = rangeFor(node.prefix, node.base);
    const dashes = level > 0 ? Array(level).fill("-").join(" ") + " " : "";

    const trCls = isLight
      ? "border-t border-slate-200 hover:bg-slate-50/70"
      : "border-t border-white/10 hover:bg-white/[0.03]";

    const actionBtnDivide = isLight
      ? "px-2.5 py-1.5 rounded-lg text-sky-700 hover:bg-sky-50 disabled:text-slate-400 disabled:hover:bg-transparent"
      : "px-2.5 py-1.5 rounded-lg text-sky-300 hover:bg-sky-400/10 disabled:text-slate-600 disabled:hover:bg-transparent";

    const actionBtnJoin = isLight
      ? "px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-transparent"
      : "px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 disabled:text-slate-700 disabled:hover:bg-transparent";

    return React.createElement("tr", { className: trCls },
      React.createElement("td", { className: "px-3 py-2 font-mono relative", style: { paddingLeft: `${level * 24 + 14}px` } },
        level > 0 && React.createElement("span", { className: "absolute left-0 top-0 bottom-0 tree-line" }),
        level > 0 && React.createElement("span", { className: "absolute left-0 tree-branch" }),
        React.createElement("span", { className: isLight ? "text-slate-400 select-none" : "text-slate-500 select-none" }, dashes),
        `${intToIp(node.base)}/${node.prefix}`
      ),
      React.createElement("td", { className: "px-3 py-2 font-mono" }, fmtRange(r.first, r.last)),
      React.createElement("td", { className: "px-3 py-2 font-mono" }, fmtUsable(node.prefix, r)),
      React.createElement("td", { className: "px-3 py-2" }, r.hosts.toLocaleString()),
      React.createElement("td", { className: "px-3 py-2" },
        React.createElement("button", {
          onClick: () => onAction(node, "divide"),
          className: actionBtnDivide,
          disabled: node.prefix >= 32
        }, "Divide")
      ),
      React.createElement("td", { className: "px-3 py-2" },
        React.createElement("button", {
          onClick: () => onAction(node, "join"),
          className: actionBtnJoin,
          disabled: !node.expanded
        }, "Join")
      ),
      React.createElement("td", { className: "px-3 py-2" },
        React.createElement(IconButton, {
          label: "Copy CIDR",
          variant: isLight ? "light" : "dark",
          onClick: async () => {
            const ok = await copyToClipboard(`${intToIp(node.base)}/${node.prefix}`);
            notify(ok ? "CIDR kopiert" : "Kopieren fehlgeschlagen");
          }
        })
      )
    );
  }

  // ---- App --------------------------------------------------------------
  function App() {
    const [cidr, setCidr] = useState("10.2.0.0/20");
    const [error, setError] = useState("");
    const [tree, setTree] = useState([]);
    const [theme, setTheme] = useState("dark"); // 'dark' | 'light'
    const [toast, setToast] = useState("");

    const isLight = theme === "light";

    function notify(msg) {
      setToast(msg);
      window.clearTimeout(window.__toastTimer);
      window.__toastTimer = window.setTimeout(() => setToast(""), 1800);
    }

    const parsed = useMemo(() => parseCIDR(cidr), [cidr]);
    const summary = useMemo(() => {
      if (!parsed) return null;
      const r = rangeFor(parsed.prefix, parsed.base);
      const net = intToIp(parsed.base);
      const bcast = intToIp(broadcastAddress(parsed.base, parsed.prefix) >>> 0);
      const usable = fmtUsable(parsed.prefix, r);
      return {
        cidr: `${net}/${parsed.prefix}`,
        network: net,
        broadcast: bcast,
        netmask: dottedMask(parsed.prefix),
        wildcard: wildcardMask(parsed.prefix),
        range: fmtRange(r.first, r.last),
        usable,
        hosts: r.hosts.toLocaleString()
      };
    }, [parsed]);

    useEffect(() => {
      if (cidr.trim() === "") { setError(""); return; }
      if (!parsed) setError("Ungültiges CIDR (z. B. 10.2.0.0/20)");
      else setError("");
    }, [cidr, parsed]);

    function handleSubmit() {
      if (!parsed) { setError("Ungültiges CIDR (z. B. 10.2.0.0/20)"); return; }
      setTree([{ ...parsed, children: [], expanded: false }]);
      notify("Analyse erstellt");
    }

    function onAction(target, action) {
      function recur(nodes) {
        return nodes.map(n => {
          if (n.base === target.base && n.prefix === target.prefix) {
            if (action === "divide") {
              if (!n.expanded && n.prefix < 32) {
                const nextP = Math.min(32, n.prefix + 1);
                n.children = splitInto(n.prefix, n.base, nextP).map(c => ({ ...c, children: [], expanded: false }));
                n.expanded = true;
              }
            } else if (action === "join") {
              n.children = [];
              n.expanded = false;
            }
          } else if (n.children && n.children.length) {
            n.children = recur(n.children);
          }
          return n;
        });
      }
      setTree(recur([...tree]));
    }

    function renderRows(nodes, level = 0) {
      return nodes.flatMap(n => [
        React.createElement(Row, {
          key: `${n.base}/${n.prefix}:${level}`,
          node: n,
          level,
          onAction,
          isLight,
          notify
        }),
        n.expanded ? renderRows(n.children, level + 1) : []
      ]);
    }

    const bgAccents = isLight
      ? "pointer-events-none fixed inset-0 bg-[radial-gradient(800px_circle_at_20%_10%,rgba(120,180,255,0.18),transparent_60%),radial-gradient(700px_circle_at_80%_20%,rgba(99,102,241,0.10),transparent_55%)]"
      : "pointer-events-none fixed inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(120,180,255,0.16),transparent_60%),radial-gradient(800px_circle_at_80%_20%,rgba(99,102,241,0.12),transparent_55%)]";

    const cardCls = isLight
      ? "rounded-2xl border border-slate-200 bg-white shadow-sm"
      : "rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

    const inputCls = isLight
      ? "flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none ring-primary font-mono"
      : "flex-1 px-3 py-2.5 rounded-xl border border-white/10 bg-slate-950/30 focus:outline-none ring-primary font-mono";

    const tableHeadCls = isLight
      ? "bg-slate-50 sticky top-0 z-10"
      : "bg-slate-950/40 sticky top-0 z-10 backdrop-blur";

    const thCls = isLight
      ? "px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200"
      : "px-3 py-2 text-left font-semibold text-slate-200 border-b border-white/10";

    return React.createElement("div", {
    id: "top",
    className:
        (isLight
        ? "min-h-screen bg-slate-50 text-slate-900"
        : "min-h-screen bg-slate-950 text-slate-100") + " safe-bottom"
    },
      React.createElement("div", { className: bgAccents }),

      React.createElement("div", { className: "relative max-w-6xl mx-auto px-4 py-6 space-y-4" },

        // Header (no links)
        React.createElement("header", { className: "flex items-center justify-between gap-3" },
          React.createElement("a", { href: "#top", className: "flex items-center gap-3" },
            React.createElement("div", {
              className: isLight
                ? "h-10 w-10 rounded-2xl bg-white border border-slate-200 grid place-items-center overflow-hidden"
                : "h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden"
            },
              React.createElement("img", {
                src: BRAND_LOGO_SRC,
                alt: "NH Logo",
                style: { width: "34px", height: "34px", display: "block" }
              })
            ),
            React.createElement("div", null,
              React.createElement("div", { className: "text-base sm:text-lg font-semibold tracking-tight" }, "Subnet Calculator"),
              React.createElement("div", { className: isLight ? "text-xs text-slate-600" : "text-xs text-slate-400" },
                "IPv4 Analyse, Baum-Splitting (/+1), Copy-to-Clipboard"
              )
            )
          ),

          React.createElement("button", {
            onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
            className: isLight
              ? "px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              : "px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          }, `Theme: ${isLight ? "Light" : "dark"}`)
        ),

        // Input Card
        React.createElement("div", { className: `${cardCls} p-3` },
          React.createElement("div", { className: "flex flex-col sm:flex-row gap-2" },
            React.createElement("div", { className: "flex-1" },
              React.createElement("div", { className: "flex items-center justify-between mb-1" },
                React.createElement("div", { className: isLight ? "text-xs text-slate-600" : "text-xs text-slate-400" }, "CIDR Eingabe"),
                
              ),
              React.createElement("div", { className: "relative" },

              React.createElement("input", {
                value: cidr,
                onChange: e => setCidr(e.target.value),
                placeholder: "10.2.0.0/20",
                className: inputCls + " pr-28"   // Platz für Badge rechts
              }),

              // Badge rechts im Input (nur anzeigen wenn etwas eingegeben wurde)
              cidr.trim() !== "" && React.createElement("div", {
                className:
                  "status-badge absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-xs border select-none " +
                  (parsed
                      ? (isLight
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-700"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200")
                      : (isLight
                          ? "bg-red-50/80 border-red-200 text-red-700"
                          : "bg-red-500/10 border-red-500/30 text-red-200"))
              }, parsed ? "gültig" : "ungültig")
            ),

              error && React.createElement("div", { className: isLight ? "mt-2 text-sm text-red-600" : "mt-2 text-sm text-red-400" }, error)
            ),

            React.createElement("div", { className: "flex flex-col sm:flex-row gap-2 sm:items-end" },
              React.createElement("button", {
                onClick: handleSubmit,
                className: (isLight
                  ? "px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  : "px-4 py-2.5 rounded-xl btn-primary font-semibold") + " disabled:opacity-40 disabled:cursor-not-allowed",
                disabled: !parsed
              }, "Analysieren"),
              React.createElement(IconButton, {
                label: "Beispiel: 10.2.0.0/20",
                variant: isLight ? "light" : "dark",
                onClick: () => setCidr("10.2.0.0/20")
              }),
              React.createElement(IconButton, {
                label: "Beispiel: 192.168.1.0/24",
                variant: isLight ? "light" : "dark",
                onClick: () => setCidr("192.168.1.0/24")
              })
            )
          )
        ),

        // Summary Card
        summary && React.createElement("div", { className: `${cardCls} p-4` },
          React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" },
            React.createElement("div", { className: "flex items-center gap-2" },
              React.createElement("div", { className: "text-sm font-semibold" }, "Summary"),
              React.createElement("span", { className: "inline-flex items-center px-2.5 py-1 rounded-full text-xs border badge-primary" }, "IPv4")
            ),
            React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
              React.createElement(IconButton, {
                label: "Copy CIDR",
                variant: isLight ? "light" : "dark",
                onClick: async () => notify((await copyToClipboard(summary.cidr)) ? "CIDR kopiert" : "Kopieren fehlgeschlagen")
              }),
              React.createElement(IconButton, {
                label: "Copy Netmask",
                variant: isLight ? "light" : "dark",
                onClick: async () => notify((await copyToClipboard(summary.netmask)) ? "Netmask kopiert" : "Kopieren fehlgeschlagen")
              }),
              React.createElement(IconButton, {
                label: "Copy Usable Range",
                variant: isLight ? "light" : "dark",
                onClick: async () => notify((await copyToClipboard(summary.usable)) ? "Usable Range kopiert" : "Kopieren fehlgeschlagen")
              })
            )
          ),

          React.createElement("div", { className: "mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" },
            metricCard("CIDR", summary.cidr),
            metricCard("Network / Broadcast", `${summary.network} / ${summary.broadcast}`),
            metricCard("Netmask / Wildcard", `${summary.netmask} / ${summary.wildcard}`),
            metricCard("Range", summary.range),
            metricCard("Usable IPs", summary.usable),
            metricCard("Hosts", summary.hosts, true)
          )
        ),

        // Tree Table
        tree.length > 0 && React.createElement("div", { className: `${cardCls} overflow-hidden` },
          React.createElement("div", { className: "overflow-auto" },
            React.createElement("table", { className: "min-w-full text-sm" },
              React.createElement("thead", { className: tableHeadCls },
                React.createElement("tr", null,
                  ["Subnet address", "Range of addresses", "Useable IPs", "Hosts", "Divide", "Join", "Copy"]
                    .map(h => React.createElement("th", { key: h, className: thCls }, h))
                )
              ),
              React.createElement("tbody", null, renderRows(tree))
            )
          )
        )
      ),

      // Fixed Footer
      React.createElement("footer", null,
        React.createElement("div", { className: "social-icons" },
          SOCIAL_LINKS.map(l => React.createElement("a", {
            key: l.label,
            href: l.href,
            className: l.nocookies ? "nocookies-tooltip" : "",
            target: (l.href && l.href.startsWith("http")) ? "_blank" : undefined,
            rel: (l.href && l.href.startsWith("http")) ? "noopener noreferrer" : undefined,
            "aria-label": l.label,
            dangerouslySetInnerHTML: { __html: iconSvg(l.icon) }
          }))
        ),
        React.createElement("p", null, `© ${new Date().getFullYear()} Nils Höppner · Subnet Calculator`)
      ),

      toast && React.createElement("div", { className: "toast" }, toast)
    );

    function metricCard(label, value, strong) {
      const cls = isLight
        ? "p-3 rounded-2xl border border-slate-200 bg-slate-50"
        : "p-3 rounded-2xl border border-white/10 bg-slate-950/20";
      return React.createElement("div", { key: label, className: cls },
        React.createElement("div", { className: isLight ? "text-xs text-slate-600" : "text-xs text-slate-400" }, label),
        React.createElement("div", { className: `mt-1 ${strong ? "text-sm font-semibold" : "font-mono text-sm"}` }, value)
      );
    }
  }

  // Mount
  ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
})();
