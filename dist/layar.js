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
  var LS_QUEUE_TYPES, LS_TICKETS;
  var init_types = __esm({
    "src/types.ts"() {
      "use strict";
      LS_QUEUE_TYPES = "queueTypes";
      LS_TICKETS = "tickets";
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
      function getCalledTicket(kode) {
        const called = getTickets().filter((t) => t.jenis === kode && t.status === "Dipanggil").sort((a, b) => b.timestamp - a.timestamp);
        return called[0];
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
        const emptyNoteEl = card.querySelector(".empty-note");
        const waitingEl = card.querySelector(".waiting-count");
        const called = getCalledTicket(jenis.kode);
        if (called) {
          calledNumberEl.textContent = called.nomorTiket;
          calledNumberEl.hidden = false;
          emptyNoteEl.hidden = true;
        } else {
          calledNumberEl.hidden = true;
          emptyNoteEl.hidden = false;
        }
        waitingEl.textContent = String(waitingCount(jenis.kode));
        displayGrid.appendChild(card);
      }
      function updateCard(jenis) {
        const card = displayGrid.querySelector(
          `[data-kode="${jenis.kode}"]`
        );
        if (!card) return;
        const calledNumberEl = card.querySelector(".called-number");
        const emptyNoteEl = card.querySelector(".empty-note");
        const waitingEl = card.querySelector(".waiting-count");
        const called = getCalledTicket(jenis.kode);
        if (called) {
          calledNumberEl.textContent = called.nomorTiket;
          calledNumberEl.hidden = false;
          emptyNoteEl.hidden = true;
        } else {
          calledNumberEl.hidden = true;
          emptyNoteEl.hidden = false;
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
      function toggleFullscreen() {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
          });
          btnFullscreen.textContent = "Keluar Layar Penuh";
        } else {
          document.exitFullscreen();
          btnFullscreen.textContent = "Layar Penuh";
        }
      }
      document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement) {
          btnFullscreen.textContent = "Layar Penuh";
        }
      });
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
        seedIfEmpty();
        syncDisplay();
        setInterval(syncDisplay, 2e3);
        btnFullscreen.addEventListener("click", toggleFullscreen);
      }
      init();
    }
  });
  require_layar();
})();
