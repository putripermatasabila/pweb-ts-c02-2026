"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/types.ts
  function getQueueTypes() {
    var _a;
    try {
      return JSON.parse((_a = localStorage.getItem(LS_QUEUE_TYPES)) != null ? _a : "[]");
    } catch (e) {
      return [];
    }
  }
  function getTickets() {
    var _a;
    try {
      return JSON.parse((_a = localStorage.getItem(LS_TICKETS)) != null ? _a : "[]");
    } catch (e) {
      return [];
    }
  }
  function getSession() {
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (raw) {
        return JSON.parse(raw);
      }
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      const role = localStorage.getItem("role");
      const firstName = localStorage.getItem("firstName") || localStorage.getItem("username");
      if (token && role) {
        return { token, role, firstName: firstName != null ? firstName : "" };
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function sortTicketsByPriority(tickets) {
    return [...tickets].sort((a, b) => {
      var _a, _b;
      const rankA = (_a = PRIORITY_RANKS[a.prioritas]) != null ? _a : 99;
      const rankB = (_b = PRIORITY_RANKS[b.prioritas]) != null ? _b : 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.timestamp - b.timestamp;
    });
  }
  var LS_QUEUE_TYPES, LS_TICKETS, LS_SESSION, PRIORITY_RANKS;
  var init_types = __esm({
    "src/types.ts"() {
      "use strict";
      LS_QUEUE_TYPES = "queueTypes";
      LS_TICKETS = "tickets";
      LS_SESSION = "currentSession";
      PRIORITY_RANKS = {
        VIP: 1,
        Disabilitas: 2,
        Lansia: 3,
        Normal: 4
      };
    }
  });

  // src/layar.ts
  var require_layar = __commonJS({
    "src/layar.ts"() {
      init_types();
      var displayGrid = document.getElementById("display-grid");
      var emptyState = document.getElementById("empty-state");
      var lastUpdated = document.getElementById("last-updated");
      var template = document.getElementById(
        "display-card-template"
      );
      var btnFullscreen = document.getElementById(
        "btn-fullscreen"
      );
      var btnLoginLayar = document.getElementById(
        "btn-login-layar"
      );
      function getCalledTicket(kode) {
        const called = getTickets().filter((t) => t.jenis === kode && t.status === "Dipanggil").sort((a, b) => b.timestamp - a.timestamp);
        return called[0];
      }
      function getNextWaitingTicket(kode) {
        const waiting = getTickets().filter(
          (t) => t.jenis === kode && t.status === "Menunggu"
        );
        const sorted = sortTicketsByPriority(waiting);
        return sorted[0];
      }
      function waitingCount(kode) {
        return getTickets().filter(
          (t) => t.jenis === kode && t.status === "Menunggu"
        ).length;
      }
      function renderCard(jenis) {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector(".display-card");
        card.dataset.kode = jenis.kode;
        card.querySelector(".service-name").textContent = jenis.nama;
        card.querySelector(".code-badge").textContent = jenis.kode;
        const calledNumberEl = card.querySelector(".called-number");
        const waitingEl = card.querySelector(".waiting-count");
        const nextQueueNumEl = card.querySelector(".next-queue-num");
        const called = getCalledTicket(jenis.kode);
        if (called) {
          calledNumberEl.textContent = called.nomorTiket;
          card.classList.remove("is-empty");
        } else {
          card.classList.add("is-empty");
        }
        const nextTicket = getNextWaitingTicket(jenis.kode);
        if (nextQueueNumEl) {
          nextQueueNumEl.textContent = nextTicket ? nextTicket.nomorTiket : "-";
        }
        waitingEl.textContent = String(waitingCount(jenis.kode));
        displayGrid.appendChild(card);
      }
      function updateCard(jenis) {
        var _a;
        const card = displayGrid.querySelector(
          `[data-kode="${jenis.kode}"]`
        );
        if (!card) return;
        const calledNumberEl = card.querySelector(".called-number");
        const waitingEl = card.querySelector(".waiting-count");
        const nextQueueNumEl = card.querySelector(".next-queue-num");
        const called = getCalledTicket(jenis.kode);
        const previousNumber = ((_a = calledNumberEl.textContent) == null ? void 0 : _a.trim()) || "";
        if (called) {
          if (previousNumber !== called.nomorTiket && previousNumber !== "") {
            calledNumberEl.classList.remove("flash");
            void calledNumberEl.offsetWidth;
            calledNumberEl.classList.add("flash");
          }
          calledNumberEl.textContent = called.nomorTiket;
          card.classList.remove("is-empty");
        } else {
          card.classList.add("is-empty");
          calledNumberEl.textContent = "";
        }
        const nextTicket = getNextWaitingTicket(jenis.kode);
        if (nextQueueNumEl) {
          nextQueueNumEl.textContent = nextTicket ? nextTicket.nomorTiket : "-";
        }
        waitingEl.textContent = String(waitingCount(jenis.kode));
      }
      function syncDisplay() {
        const allTypes = getQueueTypes();
        const active = allTypes.filter((t) => t.statusAktif);
        if (active.length === 0) {
          displayGrid.innerHTML = "";
          emptyState.hidden = false;
          lastUpdated.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID");
          return;
        }
        emptyState.hidden = true;
        const activeCodes = new Set(active.map((t) => t.kode));
        displayGrid.querySelectorAll("[data-kode]").forEach((card) => {
          if (!activeCodes.has(card.dataset.kode)) {
            card.remove();
          }
        });
        active.forEach((jenis) => {
          const existing = displayGrid.querySelector(`[data-kode="${jenis.kode}"]`);
          if (!existing) {
            renderCard(jenis);
          } else {
            updateCard(jenis);
          }
        });
        lastUpdated.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID");
      }
      function updateFullscreenIcon() {
        const isFullscreen = !!document.fullscreenElement;
        btnFullscreen.setAttribute(
          "title",
          isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"
        );
        btnFullscreen.setAttribute(
          "aria-label",
          isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"
        );
        btnFullscreen.innerHTML = isFullscreen ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      </svg>` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>`;
      }
      function toggleFullscreen() {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
          });
        } else {
          document.exitFullscreen();
        }
      }
      document.addEventListener("fullscreenchange", updateFullscreenIcon);
      function seedIfEmpty() {
        if (getQueueTypes().length === 0) {
          const demo = [
            { id: "1", kode: "A", nama: "Poli Umum", statusAktif: true },
            { id: "2", kode: "B", nama: "Poli Gigi", statusAktif: true },
            { id: "3", kode: "C", nama: "Farmasi", statusAktif: true }
          ];
          localStorage.setItem(LS_QUEUE_TYPES, JSON.stringify(demo));
        }
      }
      function init() {
        if (btnLoginLayar) {
          const session = getSession();
          if (session && session.token) {
            const role = (session.role || "").toLowerCase();
            let destination = "ambil-antrian.html";
            let destTitle = "Ambil Nomor";
            if (role === "admin" || role === "moderator") {
              destination = "index.html";
              destTitle = "Dashboard Admin";
              const navAdmin = document.getElementById("nav-item-admin");
              if (navAdmin) navAdmin.style.display = "inline-block";
              const navOp = document.getElementById("nav-item-operator");
              if (navOp) navOp.style.display = "inline-block";
            } else if (role === "operator") {
              destination = "operator.html";
              destTitle = "Panel Operator";
              const navOp = document.getElementById("nav-item-operator");
              if (navOp) navOp.style.display = "inline-block";
            }
            btnLoginLayar.textContent = destTitle;
            btnLoginLayar.href = destination;
            btnLoginLayar.title = `Buka ${destTitle}`;
          }
        }
        seedIfEmpty();
        syncDisplay();
        setInterval(syncDisplay, 2e3);
        window.addEventListener("storage", (e) => {
          if (e.key === "tickets" || e.key === "queueTypes") {
            syncDisplay();
          }
        });
        btnFullscreen.addEventListener("click", toggleFullscreen);
      }
      init();
    }
  });
  require_layar();
})();
