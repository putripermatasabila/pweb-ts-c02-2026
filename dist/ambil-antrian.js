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
  function saveTickets(tickets) {
    localStorage.setItem(LS_TICKETS, JSON.stringify(tickets));
  }
  var LS_QUEUE_TYPES, LS_TICKETS;
  var init_types = __esm({
    "src/types.ts"() {
      "use strict";
      LS_QUEUE_TYPES = "queueTypes";
      LS_TICKETS = "tickets";
    }
  });

  // src/ambil-antrian.ts
  var require_ambil_antrian = __commonJS({
    "src/ambil-antrian.ts"() {
      init_types();
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
      var typeGrid = document.getElementById("type-grid");
      var emptyState = document.getElementById("empty-state");
      var lastUpdated = document.getElementById("last-updated");
      var template = document.getElementById("type-card-template");
      var dialog = document.getElementById("ticket-dialog");
      var ticketNumber = document.getElementById("ticket-number");
      var ticketService = document.getElementById("ticket-service");
      var ticketPriority = document.getElementById("ticket-priority");
      var ticketWaiting = document.getElementById("ticket-waiting");
      var ticketClose = document.getElementById("ticket-close");
      function nextTicketNumber(kode) {
        const tickets = getTickets();
        const existing = tickets.filter((t) => t.jenis === kode);
        const next = existing.length + 1;
        return `${kode}-${String(next).padStart(3, "0")}`;
      }
      function waitingCount(kode) {
        return getTickets().filter(
          (t) => t.jenis === kode && t.status === "Menunggu"
        ).length;
      }
      function createTicket(jenis, prioritas) {
        const tiket = {
          nomorTiket: nextTicketNumber(jenis.kode),
          jenis: jenis.kode,
          prioritas,
          status: "Menunggu",
          timestamp: Date.now()
        };
        const tickets = getTickets();
        tickets.push(tiket);
        saveTickets(tickets);
        return tiket;
      }
      function showTicketDialog(tiket, namaLayanan) {
        ticketNumber.textContent = tiket.nomorTiket;
        ticketService.textContent = namaLayanan;
        ticketPriority.textContent = tiket.prioritas !== "Normal" ? `\xB7 ${tiket.prioritas}` : "";
        const count = waitingCount(tiket.jenis);
        ticketWaiting.textContent = count > 0 ? `${count} orang menunggu di depan kamu` : "Kamu yang pertama!";
        dialog.showModal();
      }
      function renderCard(jenis) {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector(".type-card");
        card.querySelector(".service-name").textContent = jenis.nama;
        card.querySelector(".code-badge").textContent = jenis.kode;
        card.querySelectorAll(".btn-take").forEach((btn) => {
          btn.addEventListener("click", () => {
            var _a;
            const prioritas = (_a = btn.dataset.priority) != null ? _a : "Normal";
            const tiket = createTicket(jenis, prioritas);
            showTicketDialog(tiket, jenis.nama);
          });
        });
        typeGrid.appendChild(card);
      }
      function render() {
        const allTypes = getQueueTypes();
        const active = allTypes.filter((t) => t.statusAktif);
        typeGrid.innerHTML = "";
        if (active.length === 0) {
          emptyState.hidden = false;
        } else {
          emptyState.hidden = true;
          active.forEach(renderCard);
        }
        lastUpdated.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID");
      }
      function init() {
        seedIfEmpty();
        render();
        setInterval(render, 3e3);
        ticketClose.addEventListener("click", () => {
          dialog.close();
        });
        dialog.addEventListener("click", (e) => {
          if (e.target === dialog) dialog.close();
        });
      }
      init();
    }
  });
  require_ambil_antrian();
})();
