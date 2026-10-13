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
  function clearSession() {
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    localStorage.removeItem("username");
  }
  function getNextTicketNumber(kode, tickets = getTickets()) {
    const existing = tickets.filter((t) => t.jenis === kode);
    let maxNum = 0;
    for (const t of existing) {
      const parts = t.nomorTiket.split("-");
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    const nextNum = Math.max(maxNum + 1, existing.length + 1);
    return `${kode}-${String(nextNum).padStart(3, "0")}`;
  }
  var LS_QUEUE_TYPES, LS_TICKETS, LS_SESSION;
  var init_types = __esm({
    "src/types.ts"() {
      "use strict";
      LS_QUEUE_TYPES = "queueTypes";
      LS_TICKETS = "tickets";
      LS_SESSION = "currentSession";
    }
  });

  // src/ambil-antrian.ts
  var require_ambil_antrian = __commonJS({
    "src/ambil-antrian.ts"() {
      init_types();
      function enforceAuthGuard() {
        const session = getSession();
        if (!session || !session.token) {
          window.location.replace("login.html?redirect=ambil-antrian.html");
          return false;
        }
        const role = (session.role || "").toLowerCase();
        if (role === "operator") {
          window.location.replace("operator.html");
          return false;
        }
        if (role !== "user" && role !== "admin" && role !== "moderator") {
          window.location.replace("login.html?redirect=ambil-antrian.html");
          return false;
        }
        return true;
      }
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
      var ticketPatientName = document.getElementById("ticket-patient-name");
      function setupUserProfile() {
        const session = getSession();
        const userBadge = document.getElementById("user-profile-badge");
        const userName = document.getElementById("user-name");
        const userRole = document.getElementById("user-role");
        const userAvatar = document.getElementById("user-avatar");
        const btnLogout = document.getElementById("btn-logout");
        const btnLoginNav = document.getElementById("btn-login-nav");
        const greetingUser = document.getElementById("greeting-user");
        if (session && session.token) {
          if (userBadge) userBadge.style.display = "inline-flex";
          if (btnLogout) btnLogout.style.display = "inline-flex";
          if (btnLoginNav) btnLoginNav.style.display = "none";
          const displayName = session.firstName || session.username || "Pengguna";
          if (userName) userName.textContent = displayName;
          if (greetingUser) greetingUser.textContent = displayName;
          if (userRole) {
            const roleStr = (session.role || "user").toUpperCase();
            userRole.textContent = roleStr === "USER" ? "PASIEN" : roleStr;
          }
          if (userAvatar) {
            userAvatar.textContent = displayName.slice(0, 2).toUpperCase();
          }
          const roleNormalized = (session.role || "").toLowerCase();
        } else {
          if (userBadge) userBadge.style.display = "none";
          if (btnLogout) btnLogout.style.display = "none";
          if (btnLoginNav) btnLoginNav.style.display = "inline-flex";
          if (greetingUser) greetingUser.textContent = "Pengunjung";
        }
        if (btnLogout) {
          btnLogout.addEventListener("click", () => {
            if (confirm("Apakah Anda yakin ingin keluar dari sesi antrian?")) {
              clearSession();
              window.location.replace("login.html?redirect=ambil-antrian.html");
            }
          });
        }
      }
      function nextTicketNumber(kode) {
        return getNextTicketNumber(kode);
      }
      function waitingCount(kode, excludeTicketNumber) {
        return getTickets().filter(
          (t) => t.jenis === kode && t.status === "Menunggu" && t.nomorTiket !== excludeTicketNumber
        ).length;
      }
      function createTicket(jenis, prioritas) {
        const session = getSession();
        if (!session || !session.token) {
          alert("Sesi login Anda telah berakhir. Silakan login kembali untuk mengambil antrian.");
          window.location.replace("login.html?redirect=ambil-antrian.html");
          return null;
        }
        const tiket = {
          nomorTiket: nextTicketNumber(jenis.kode),
          jenis: jenis.kode,
          prioritas,
          status: "Menunggu",
          timestamp: Date.now(),
          namaPengambil: session.firstName || session.username || "Pengguna",
          userId: session.id
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
        if (ticketPatientName) {
          ticketPatientName.textContent = tiket.namaPengambil || "Pengguna";
        }
        const count = waitingCount(tiket.jenis, tiket.nomorTiket);
        ticketWaiting.textContent = count > 0 ? `${count} tiket lain menunggu untuk layanan ini` : "Kamu tiket menunggu pertama!";
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
            if (tiket) {
              showTicketDialog(tiket, jenis.nama);
            }
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
        if (!enforceAuthGuard()) return;
        setupUserProfile();
        seedIfEmpty();
        render();
        setInterval(render, 3e3);
        window.addEventListener("storage", (e) => {
          if (e.key === LS_QUEUE_TYPES) {
            render();
          }
        });
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
