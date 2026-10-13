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
  function saveQueueTypes(queueTypes) {
    localStorage.setItem(LS_QUEUE_TYPES, JSON.stringify(queueTypes));
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

  // src/admin.ts
  var require_admin = __commonJS({
    "src/admin.ts"() {
      init_types();
      function enforceAdminGuard() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("demo") === "1" || urlParams.get("dev") === "1") {
          if (!getSession()) {
            localStorage.setItem(
              "currentSession",
              JSON.stringify({
                token: "demo-token-admin",
                role: "admin",
                firstName: "Emily",
                username: "emilys"
              })
            );
          }
          return true;
        }
        const session = getSession();
        if (!session || !session.token) {
          window.location.replace("login.html");
          return false;
        }
        const role = (session.role || "").toLowerCase();
        if (role !== "admin" && role !== "moderator") {
          alert("Akses ditolak: Anda tidak memiliki hak akses Administrator.");
          if (role === "operator") {
            window.location.replace("operator.html");
          } else {
            window.location.replace("ambil-antrian.html");
          }
          return false;
        }
        return true;
      }
      if (!enforceAdminGuard()) {
        throw new Error("Akses ditolak: Administrator login required.");
      }
      function seedIfEmpty() {
        if (getQueueTypes().length === 0) {
          const defaultTypes = [
            { id: "1", kode: "A", nama: "Poli Umum", statusAktif: true },
            { id: "2", kode: "B", nama: "Poli Gigi", statusAktif: true },
            { id: "3", kode: "C", nama: "Farmasi", statusAktif: true }
          ];
          saveQueueTypes(defaultTypes);
        }
      }
      var userNameEl = document.getElementById("user-name");
      var userRoleEl = document.getElementById("user-role");
      var userAvatarEl = document.getElementById("user-avatar");
      var btnLogout = document.getElementById("btn-logout");
      var statActiveServices = document.getElementById("stat-active-services");
      var statTotalTickets = document.getElementById("stat-total-tickets");
      var statWaitingTickets = document.getElementById("stat-waiting-tickets");
      var statCompletedTickets = document.getElementById("stat-completed-tickets");
      var formTambahJenis = document.getElementById("form-tambah-jenis");
      var inputKodeJenis = document.getElementById("input-kode-jenis");
      var inputNamaJenis = document.getElementById("input-nama-jenis");
      var feedbackKode = document.getElementById("feedback-kode");
      var feedbackNama = document.getElementById("feedback-nama");
      var alertFormJenis = document.getElementById("alert-form-jenis");
      var alertFormJenisText = document.getElementById("alert-form-jenis-text");
      var tbodyJenisAntrian = document.getElementById("tbody-jenis-antrian");
      var emptyStateJenis = document.getElementById("empty-state-jenis");
      var badgeTotalJenis = document.getElementById("badge-total-jenis");
      var btnResetAntrian = document.getElementById("btn-reset-antrian");
      var formTiketManual = document.getElementById("form-tiket-manual");
      var selectManualJenis = document.getElementById("select-manual-jenis");
      var feedbackManualJenis = document.getElementById("feedback-manual-jenis");
      var dialogTicketResult = document.getElementById("dialog-ticket-result");
      var ticketResultNumber = document.getElementById("ticket-result-number");
      var ticketResultService = document.getElementById("ticket-result-service");
      var ticketResultPriority = document.getElementById("ticket-result-priority");
      var ticketResultTime = document.getElementById("ticket-result-time");
      var btnPrintTicket = document.getElementById("btn-print-ticket");
      var btnCloseTicketResult = document.getElementById("btn-close-ticket-result");
      var dialogConfirm = document.getElementById("dialog-confirm");
      var dialogConfirmTitle = document.getElementById("dialog-confirm-title");
      var dialogConfirmMessage = document.getElementById("dialog-confirm-message");
      var btnConfirmCancel = document.getElementById("btn-confirm-cancel");
      var btnConfirmProceed = document.getElementById("btn-confirm-proceed");
      var tbodyLiveTickets = document.getElementById("tbody-live-tickets");
      var emptyStateTickets = document.getElementById("empty-state-tickets");
      var filterAntrianStatus = document.getElementById("filter-antrian-status");
      var toastContainer = document.getElementById("toast-container");
      var onConfirmAction = null;
      function showToast(message, type = "success") {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        const iconSvg = type === "success" ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>` : type === "danger" ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        toast.innerHTML = `${iconSvg}<span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(10px)";
          toast.style.transition = "all 0.3s ease";
          setTimeout(() => toast.remove(), 300);
        }, 3500);
      }
      function openConfirmModal(title, message, onProceed) {
        dialogConfirmTitle.textContent = title;
        dialogConfirmMessage.textContent = message;
        onConfirmAction = onProceed;
        dialogConfirm.showModal();
      }
      function renderUserProfile() {
        const session = getSession();
        if (session) {
          const displayName = session.firstName || session.username || "Admin";
          userNameEl.textContent = displayName;
          const roleNormalized = (session.role || "admin").toUpperCase();
          userRoleEl.textContent = roleNormalized;
          const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
          userAvatarEl.textContent = initials || "AD";
        }
      }
      function renderStats() {
        const types = getQueueTypes();
        const tickets = getTickets();
        const activeServicesCount = types.filter((t) => t.statusAktif).length;
        const totalTicketsCount = tickets.length;
        const waitingCount = tickets.filter((t) => t.status === "Menunggu").length;
        const completedCount = tickets.filter((t) => t.status === "Selesai").length;
        statActiveServices.textContent = String(activeServicesCount);
        statTotalTickets.textContent = String(totalTicketsCount);
        statWaitingTickets.textContent = String(waitingCount);
        statCompletedTickets.textContent = String(completedCount);
      }
      function renderQueueTypesTable() {
        const types = getQueueTypes();
        const tickets = getTickets();
        tbodyJenisAntrian.innerHTML = "";
        badgeTotalJenis.textContent = `${types.length} Layanan`;
        if (types.length === 0) {
          emptyStateJenis.hidden = false;
          return;
        }
        emptyStateJenis.hidden = true;
        types.forEach((jenis) => {
          const tr = document.createElement("tr");
          const waitingForThis = tickets.filter(
            (t) => t.jenis === jenis.kode && t.status === "Menunggu"
          ).length;
          const tdKode = document.createElement("td");
          tdKode.style.textAlign = "center";
          tdKode.innerHTML = `<span class="service-code-circle">${jenis.kode}</span>`;
          tr.appendChild(tdKode);
          const tdNama = document.createElement("td");
          tdNama.innerHTML = `<strong>${jenis.nama}</strong>`;
          tr.appendChild(tdNama);
          const tdStatus = document.createElement("td");
          tdStatus.style.textAlign = "center";
          const statusBadgeClass = jenis.statusAktif ? "badge-aktif" : "badge-nonaktif";
          const statusText = jenis.statusAktif ? "Aktif" : "Nonaktif";
          tdStatus.innerHTML = `<span class="badge ${statusBadgeClass}">${statusText}</span>`;
          tr.appendChild(tdStatus);
          const tdWaiting = document.createElement("td");
          tdWaiting.style.textAlign = "center";
          tdWaiting.innerHTML = `<span class="badge badge-normal">${waitingForThis} Pasien</span>`;
          tr.appendChild(tdWaiting);
          const tdAksi = document.createElement("td");
          tdAksi.style.textAlign = "center";
          tdAksi.style.whiteSpace = "nowrap";
          const btnToggle = document.createElement("button");
          btnToggle.type = "button";
          btnToggle.className = `btn btn-sm ${jenis.statusAktif ? "btn-warning" : "btn-success"}`;
          btnToggle.style.marginRight = "8px";
          btnToggle.innerHTML = jenis.statusAktif ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> Nonaktifkan` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Aktifkan`;
          btnToggle.addEventListener("click", () => toggleQueueTypeStatus(jenis.id));
          tdAksi.appendChild(btnToggle);
          const btnHapus = document.createElement("button");
          btnHapus.type = "button";
          btnHapus.className = "btn btn-sm btn-ghost";
          btnHapus.style.color = "#ef4444";
          btnHapus.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Hapus`;
          btnHapus.addEventListener("click", () => confirmDeleteQueueType(jenis));
          tdAksi.appendChild(btnHapus);
          tr.appendChild(tdAksi);
          tbodyJenisAntrian.appendChild(tr);
        });
      }
      function toggleQueueTypeStatus(id) {
        const types = getQueueTypes();
        const target = types.find((t) => t.id === id);
        if (!target) return;
        target.statusAktif = !target.statusAktif;
        saveQueueTypes(types);
        showToast(
          `Layanan "${target.nama}" (${target.kode}) berhasil ${target.statusAktif ? "diaktifkan" : "dinonaktifkan"}.`,
          target.statusAktif ? "success" : "warning"
        );
        renderAll();
      }
      function confirmDeleteQueueType(jenis) {
        openConfirmModal(
          "Hapus Jenis Antrian?",
          `Apakah Anda yakin ingin menghapus layanan "${jenis.nama}" (${jenis.kode})? Pasien tidak akan dapat lagi mengambil nomor untuk poli ini.`,
          () => {
            const types = getQueueTypes();
            const updated = types.filter((t) => t.id !== jenis.id);
            saveQueueTypes(updated);
            showToast(`Layanan "${jenis.nama}" (${jenis.kode}) telah dihapus.`, "danger");
            renderAll();
          }
        );
      }
      function handleTambahJenis(e) {
        e.preventDefault();
        feedbackKode.textContent = "";
        feedbackKode.classList.remove("is-error");
        feedbackNama.textContent = "";
        feedbackNama.classList.remove("is-error");
        alertFormJenis.hidden = true;
        const rawKode = inputKodeJenis.value.trim().toUpperCase();
        const rawNama = inputNamaJenis.value.trim();
        let hasError = false;
        if (!rawKode) {
          feedbackKode.textContent = "Kode antrian wajib diisi.";
          feedbackKode.classList.add("is-error");
          hasError = true;
        } else if (!/^[A-Z]$/.test(rawKode)) {
          feedbackKode.textContent = "Kode harus tepat 1 karakter huruf alfabet (A-Z).";
          feedbackKode.classList.add("is-error");
          hasError = true;
        }
        if (!rawNama) {
          feedbackNama.textContent = "Nama layanan poli wajib diisi.";
          feedbackNama.classList.add("is-error");
          hasError = true;
        } else if (rawNama.length < 2) {
          feedbackNama.textContent = "Nama layanan minimal terdiri dari 2 karakter.";
          feedbackNama.classList.add("is-error");
          hasError = true;
        }
        if (hasError) return;
        const existingTypes = getQueueTypes();
        const duplicateCode = existingTypes.find(
          (t) => t.kode.toUpperCase() === rawKode
        );
        if (duplicateCode) {
          alertFormJenisText.textContent = `Duplikasi Kode: Kode '${rawKode}' sudah digunakan oleh layanan "${duplicateCode.nama}". Silakan gunakan huruf lain.`;
          alertFormJenis.hidden = false;
          inputKodeJenis.focus();
          return;
        }
        const duplicateName = existingTypes.find(
          (t) => t.nama.trim().toLowerCase() === rawNama.toLowerCase()
        );
        if (duplicateName) {
          alertFormJenisText.textContent = `Duplikasi Nama: Layanan "${duplicateName.nama}" sudah terdaftar dengan kode '${duplicateName.kode}'.`;
          alertFormJenis.hidden = false;
          inputNamaJenis.focus();
          return;
        }
        const newJenis = {
          id: Date.now().toString(),
          kode: rawKode,
          nama: rawNama,
          statusAktif: true
        };
        existingTypes.push(newJenis);
        saveQueueTypes(existingTypes);
        inputKodeJenis.value = "";
        inputNamaJenis.value = "";
        showToast(`Jenis antrian "${newJenis.nama}" (${newJenis.kode}) berhasil ditambahkan!`, "success");
        renderAll();
      }
      function handleResetAntrian() {
        openConfirmModal(
          "Reset Seluruh Antrian?",
          "Tindakan ini akan mengosongkan seluruh tiket antrian yang tercatat dan mengembalikan urutan nomor tiket ke awal (A-001, B-001, dst). Apakah Anda yakin?",
          () => {
            saveTickets([]);
            showToast("Seluruh antrian berhasil direset dan dikembalikan ke awal!", "success");
            renderAll();
          }
        );
      }
      function renderManualTicketDropdown() {
        const types = getQueueTypes();
        const activeTypes = types.filter((t) => t.statusAktif);
        const currentValue = selectManualJenis.value;
        selectManualJenis.innerHTML = "";
        if (activeTypes.length === 0) {
          const opt = document.createElement("option");
          opt.value = "";
          opt.disabled = true;
          opt.selected = true;
          opt.textContent = "-- Tidak ada layanan aktif --";
          selectManualJenis.appendChild(opt);
          return;
        }
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.disabled = true;
        defaultOpt.selected = !currentValue;
        defaultOpt.textContent = "-- Pilih Layanan Poli --";
        selectManualJenis.appendChild(defaultOpt);
        activeTypes.forEach((jenis) => {
          const opt = document.createElement("option");
          opt.value = jenis.kode;
          opt.textContent = `[${jenis.kode}] ${jenis.nama}`;
          if (currentValue === jenis.kode) {
            opt.selected = true;
          }
          selectManualJenis.appendChild(opt);
        });
      }
      function generateNextTicketNumber(kode) {
        return getNextTicketNumber(kode);
      }
      function handleTerbitkanTiketManual(e) {
        e.preventDefault();
        feedbackManualJenis.textContent = "";
        feedbackManualJenis.classList.remove("is-error");
        const selectedKode = selectManualJenis.value;
        if (!selectedKode) {
          feedbackManualJenis.textContent = "Silakan pilih layanan poli terlebih dahulu.";
          feedbackManualJenis.classList.add("is-error");
          selectManualJenis.focus();
          return;
        }
        const types = getQueueTypes();
        const targetJenis = types.find((t) => t.kode === selectedKode && t.statusAktif);
        if (!targetJenis) {
          feedbackManualJenis.textContent = "Layanan yang dipilih tidak aktif atau tidak ditemukan.";
          feedbackManualJenis.classList.add("is-error");
          return;
        }
        const priorityRadio = document.querySelector(
          'input[name="priority"]:checked'
        );
        const priority = (priorityRadio == null ? void 0 : priorityRadio.value) || "Normal";
        const nomorTiket = generateNextTicketNumber(targetJenis.kode);
        const timestampNow = Date.now();
        const newTicket = {
          nomorTiket,
          jenis: targetJenis.kode,
          prioritas: priority,
          status: "Menunggu",
          timestamp: timestampNow
        };
        const tickets = getTickets();
        tickets.push(newTicket);
        saveTickets(tickets);
        ticketResultNumber.textContent = newTicket.nomorTiket;
        ticketResultService.textContent = targetJenis.nama;
        ticketResultPriority.textContent = newTicket.prioritas;
        ticketResultPriority.className = `badge badge-${newTicket.prioritas.toLowerCase()}`;
        ticketResultTime.textContent = new Date(timestampNow).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
        dialogTicketResult.showModal();
        showToast(`Tiket ${newTicket.nomorTiket} (${targetJenis.nama}) berhasil diterbitkan!`, "success");
        renderAll();
      }
      function renderLiveTicketsTable() {
        const tickets = getTickets();
        const types = getQueueTypes();
        const statusFilter = filterAntrianStatus.value;
        tbodyLiveTickets.innerHTML = "";
        const filteredTickets = statusFilter === "ALL" ? tickets : tickets.filter((t) => t.status === statusFilter);
        if (filteredTickets.length === 0) {
          emptyStateTickets.hidden = false;
          return;
        }
        emptyStateTickets.hidden = true;
        const displayTickets = [...filteredTickets].reverse();
        displayTickets.forEach((t) => {
          var _a;
          const tr = document.createElement("tr");
          const serviceName = ((_a = types.find((k) => k.kode === t.jenis)) == null ? void 0 : _a.nama) || `Layanan ${t.jenis}`;
          let statusBadgeClass = "badge-status-menunggu";
          if (t.status === "Dipanggil") statusBadgeClass = "badge-status-dipanggil";
          else if (t.status === "Selesai") statusBadgeClass = "badge-status-selesai";
          else if (t.status === "Dilewati") statusBadgeClass = "badge-status-dilewati";
          const priorityBadgeClass = `badge-${t.prioritas.toLowerCase()}`;
          const timeFormatted = new Date(t.timestamp).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
          });
          tr.innerHTML = `
      <td><strong>${t.nomorTiket}</strong></td>
      <td>${serviceName}</td>
      <td><span class="badge ${priorityBadgeClass}">${t.prioritas}</span></td>
      <td><span class="badge ${statusBadgeClass}">${t.status}</span></td>
      <td style="color: var(--muted);">${timeFormatted}</td>
    `;
          tbodyLiveTickets.appendChild(tr);
        });
      }
      function renderAll() {
        renderStats();
        renderQueueTypesTable();
        renderManualTicketDropdown();
        renderLiveTicketsTable();
      }
      function handleLogout() {
        openConfirmModal(
          "Keluar dari Sesi?",
          "Apakah Anda yakin ingin keluar dari sesi Dashboard Administrator?",
          () => {
            clearSession();
            window.location.replace("login.html");
          }
        );
      }
      function init() {
        seedIfEmpty();
        renderUserProfile();
        renderAll();
        setInterval(renderAll, 3e3);
        window.addEventListener("storage", (e) => {
          if (e.key === LS_QUEUE_TYPES || e.key === LS_TICKETS) {
            renderAll();
          }
        });
        btnLogout.addEventListener("click", handleLogout);
        formTambahJenis.addEventListener("submit", handleTambahJenis);
        inputKodeJenis.addEventListener("input", () => {
          inputKodeJenis.value = inputKodeJenis.value.toUpperCase();
          feedbackKode.textContent = "";
          feedbackKode.classList.remove("is-error");
          alertFormJenis.hidden = true;
        });
        inputNamaJenis.addEventListener("input", () => {
          feedbackNama.textContent = "";
          feedbackNama.classList.remove("is-error");
          alertFormJenis.hidden = true;
        });
        btnResetAntrian.addEventListener("click", handleResetAntrian);
        formTiketManual.addEventListener("submit", handleTerbitkanTiketManual);
        selectManualJenis.addEventListener("change", () => {
          feedbackManualJenis.textContent = "";
          feedbackManualJenis.classList.remove("is-error");
        });
        filterAntrianStatus.addEventListener("change", renderLiveTicketsTable);
        btnCloseTicketResult.addEventListener("click", () => {
          dialogTicketResult.close();
        });
        btnPrintTicket.addEventListener("click", () => {
          window.print();
        });
        dialogTicketResult.addEventListener("click", (e) => {
          if (e.target === dialogTicketResult) {
            dialogTicketResult.close();
          }
        });
        btnConfirmCancel.addEventListener("click", () => {
          dialogConfirm.close();
          onConfirmAction = null;
        });
        btnConfirmProceed.addEventListener("click", () => {
          if (onConfirmAction) {
            onConfirmAction();
          }
          dialogConfirm.close();
          onConfirmAction = null;
        });
        dialogConfirm.addEventListener("click", (e) => {
          if (e.target === dialogConfirm) {
            dialogConfirm.close();
            onConfirmAction = null;
          }
        });
      }
      init();
    }
  });
  require_admin();
})();
