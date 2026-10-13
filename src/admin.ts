// ============================================================
// admin.ts - Logika Dashboard Administrator Antrian Rumah Sakit
// Disusun oleh: Satya
// Fitur:
// 1. Auth Guard & Role Guard (admin & moderator)
// 2. Profil pengguna & navigasi Logout
// 3. Manajemen Master Jenis Antrian (CRUD, Validasi Duplikasi, Toggle Aktif/Nonaktif)
// 4. Reset Seluruh Antrian & penomoran kembali ke awal
// 5. Penerbitan Tiket Manual untuk pasien
// 6. Pemantauan Antrian Real-Time & Sinkronisasi LocalStorage
// ============================================================

import {
  getQueueTypes,
  saveQueueTypes,
  getTickets,
  saveTickets,
  getSession,
  clearSession,
  getNextTicketNumber,
  JenisAntrian,
  Tiket,
  Prioritas,
  StatusTiket,
  LS_QUEUE_TYPES,
  LS_TICKETS,
} from "./types";

// ============================================================
// 1. AUTH GUARD & ROLE GUARD
// ============================================================
function enforceAdminGuard(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  // Bypass untuk pengujian lokal jika parameter ?demo=1 disertakan
  if (urlParams.get("demo") === "1" || urlParams.get("dev") === "1") {
    if (!getSession()) {
      localStorage.setItem(
        "currentSession",
        JSON.stringify({
          token: "demo-token-admin",
          role: "admin",
          firstName: "Emily",
          username: "emilys",
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
  // Role moderator diperlakukan setara dengan admin
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

// Jalankan guard segera
if (!enforceAdminGuard()) {
  throw new Error("Akses ditolak: Administrator login required.");
}

// ============================================================
// 2. SEED DATA AWAL JIKA LOCAL STORAGE MASIH KOSONG
// ============================================================
function seedIfEmpty(): void {
  if (getQueueTypes().length === 0) {
    const defaultTypes: JenisAntrian[] = [
      { id: "1", kode: "A", nama: "Poli Umum", statusAktif: true },
      { id: "2", kode: "B", nama: "Poli Gigi", statusAktif: true },
      { id: "3", kode: "C", nama: "Farmasi", statusAktif: true },
    ];
    saveQueueTypes(defaultTypes);
  }
}

// ============================================================
// 3. REFERENSI ELEMEN DOM
// ============================================================
// Profil User & Logout
const userNameEl = document.getElementById("user-name") as HTMLElement;
const userRoleEl = document.getElementById("user-role") as HTMLElement;
const userAvatarEl = document.getElementById("user-avatar") as HTMLElement;
const btnLogout = document.getElementById("btn-logout") as HTMLButtonElement;

// Statistik
const statActiveServices = document.getElementById("stat-active-services") as HTMLElement;
const statTotalTickets = document.getElementById("stat-total-tickets") as HTMLElement;
const statWaitingTickets = document.getElementById("stat-waiting-tickets") as HTMLElement;
const statCompletedTickets = document.getElementById("stat-completed-tickets") as HTMLElement;

// Form Tambah Jenis Antrian
const formTambahJenis = document.getElementById("form-tambah-jenis") as HTMLFormElement;
const inputKodeJenis = document.getElementById("input-kode-jenis") as HTMLInputElement;
const inputNamaJenis = document.getElementById("input-nama-jenis") as HTMLInputElement;
const feedbackKode = document.getElementById("feedback-kode") as HTMLElement;
const feedbackNama = document.getElementById("feedback-nama") as HTMLElement;
const alertFormJenis = document.getElementById("alert-form-jenis") as HTMLElement;
const alertFormJenisText = document.getElementById("alert-form-jenis-text") as HTMLElement;

// Tabel Master Jenis Antrian
const tbodyJenisAntrian = document.getElementById("tbody-jenis-antrian") as HTMLTableSectionElement;
const emptyStateJenis = document.getElementById("empty-state-jenis") as HTMLElement;
const badgeTotalJenis = document.getElementById("badge-total-jenis") as HTMLElement;

// Tombol Reset Antrian
const btnResetAntrian = document.getElementById("btn-reset-antrian") as HTMLButtonElement;

// Form Penerbitan Tiket Manual
const formTiketManual = document.getElementById("form-tiket-manual") as HTMLFormElement;
const selectManualJenis = document.getElementById("select-manual-jenis") as HTMLSelectElement;
const feedbackManualJenis = document.getElementById("feedback-manual-jenis") as HTMLElement;

// Modal Dialog Hasil Tiket
const dialogTicketResult = document.getElementById("dialog-ticket-result") as HTMLDialogElement;
const ticketResultNumber = document.getElementById("ticket-result-number") as HTMLElement;
const ticketResultService = document.getElementById("ticket-result-service") as HTMLElement;
const ticketResultPriority = document.getElementById("ticket-result-priority") as HTMLElement;
const ticketResultTime = document.getElementById("ticket-result-time") as HTMLElement;
const btnPrintTicket = document.getElementById("btn-print-ticket") as HTMLButtonElement;
const btnCloseTicketResult = document.getElementById("btn-close-ticket-result") as HTMLButtonElement;

// Modal Dialog Konfirmasi
const dialogConfirm = document.getElementById("dialog-confirm") as HTMLDialogElement;
const dialogConfirmTitle = document.getElementById("dialog-confirm-title") as HTMLElement;
const dialogConfirmMessage = document.getElementById("dialog-confirm-message") as HTMLElement;
const btnConfirmCancel = document.getElementById("btn-confirm-cancel") as HTMLButtonElement;
const btnConfirmProceed = document.getElementById("btn-confirm-proceed") as HTMLButtonElement;

// Tabel Pemantauan Tiket Real-time
const tbodyLiveTickets = document.getElementById("tbody-live-tickets") as HTMLTableSectionElement;
const emptyStateTickets = document.getElementById("empty-state-tickets") as HTMLElement;
const filterAntrianStatus = document.getElementById("filter-antrian-status") as HTMLSelectElement;

// Toast Container
const toastContainer = document.getElementById("toast-container") as HTMLElement;

// Variabel callback konfirmasi aksi
let onConfirmAction: (() => void) | null = null;

// ============================================================
// 4. SISTEM NOTIFIKASI TOAST NATIVE
// ============================================================
function showToast(
  message: string,
  type: "success" | "warning" | "danger" | "info" = "success"
): void {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconSvg =
    type === "success"
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
      : type === "danger"
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================
// 5. HELPER DIALOG KONFIRMASI NATIVE
// ============================================================
function openConfirmModal(
  title: string,
  message: string,
  onProceed: () => void
): void {
  dialogConfirmTitle.textContent = title;
  dialogConfirmMessage.textContent = message;
  onConfirmAction = onProceed;
  dialogConfirm.showModal();
}

// ============================================================
// 6. RENDER DATA PENGGUNA DI NAVBAR
// ============================================================
function renderUserProfile(): void {
  const session = getSession();
  if (session) {
    const displayName = session.firstName || session.username || "Admin";
    userNameEl.textContent = displayName;
    const roleNormalized = (session.role || "admin").toUpperCase();
    userRoleEl.textContent = roleNormalized;

    // Inisial avatar
    const initials = displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    userAvatarEl.textContent = initials || "AD";
  }
}

// ============================================================
// 7. RENDER RINGKASAN STATISTIK
// ============================================================
function renderStats(): void {
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

// ============================================================
// 8. RENDER TABEL MASTER JENIS ANTRIAN (CRUD)
// ============================================================
function renderQueueTypesTable(): void {
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

    // Hitung antrian aktif untuk jenis ini
    const waitingForThis = tickets.filter(
      (t) => t.jenis === jenis.kode && t.status === "Menunggu"
    ).length;

    // 1. Kolom Kode
    const tdKode = document.createElement("td");
    tdKode.style.textAlign = "center";
    tdKode.innerHTML = `<span class="service-code-circle">${jenis.kode}</span>`;
    tr.appendChild(tdKode);

    // 2. Kolom Nama Layanan
    const tdNama = document.createElement("td");
    tdNama.innerHTML = `<strong>${jenis.nama}</strong>`;
    tr.appendChild(tdNama);

    // 3. Kolom Status Layanan (Badge & Toggle Switch)
    const tdStatus = document.createElement("td");
    tdStatus.style.textAlign = "center";
    const statusBadgeClass = jenis.statusAktif ? "badge-aktif" : "badge-nonaktif";
    const statusText = jenis.statusAktif ? "Aktif" : "Nonaktif";
    tdStatus.innerHTML = `<span class="badge ${statusBadgeClass}">${statusText}</span>`;
    tr.appendChild(tdStatus);

    // 4. Kolom Jumlah Antrian Aktif
    const tdWaiting = document.createElement("td");
    tdWaiting.style.textAlign = "center";
    tdWaiting.innerHTML = `<span class="badge badge-normal">${waitingForThis} Pasien</span>`;
    tr.appendChild(tdWaiting);

    // 5. Kolom Aksi (Toggle Aktif/Nonaktif & Tombol Hapus)
    const tdAksi = document.createElement("td");
    tdAksi.style.textAlign = "center";
    tdAksi.style.whiteSpace = "nowrap";

    const btnToggle = document.createElement("button");
    btnToggle.type = "button";
    btnToggle.className = `btn btn-sm ${jenis.statusAktif ? "btn-warning" : "btn-success"}`;
    btnToggle.style.marginRight = "8px";
    btnToggle.innerHTML = jenis.statusAktif
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> Nonaktifkan`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Aktifkan`;

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

// ============================================================
// 9. TOGGLE STATUS AKTIF / NONAKTIF JENIS ANTRIAN
// ============================================================
function toggleQueueTypeStatus(id: string): void {
  const types = getQueueTypes();
  const target = types.find((t) => t.id === id);
  if (!target) return;

  target.statusAktif = !target.statusAktif;
  saveQueueTypes(types);

  showToast(
    `Layanan "${target.nama}" (${target.kode}) berhasil ${
      target.statusAktif ? "diaktifkan" : "dinonaktifkan"
    }.`,
    target.statusAktif ? "success" : "warning"
  );

  renderAll();
}

// ============================================================
// 10. HAPUS JENIS ANTRIAN DENGAN KONFIRMASI
// ============================================================
function confirmDeleteQueueType(jenis: JenisAntrian): void {
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

// ============================================================
// 11. TAMBAH JENIS ANTRIAN BARU & VALIDASI KETAT
// ============================================================
function handleTambahJenis(e: Event): void {
  e.preventDefault();

  // Reset feedback
  feedbackKode.textContent = "";
  feedbackKode.classList.remove("is-error");
  feedbackNama.textContent = "";
  feedbackNama.classList.remove("is-error");
  alertFormJenis.hidden = true;

  const rawKode = inputKodeJenis.value.trim().toUpperCase();
  const rawNama = inputNamaJenis.value.trim();

  let hasError = false;

  // 1. Validasi Kode: Wajib tepat 1 huruf kapital
  if (!rawKode) {
    feedbackKode.textContent = "Kode antrian wajib diisi.";
    feedbackKode.classList.add("is-error");
    hasError = true;
  } else if (!/^[A-Z]$/.test(rawKode)) {
    feedbackKode.textContent = "Kode harus tepat 1 karakter huruf alfabet (A-Z).";
    feedbackKode.classList.add("is-error");
    hasError = true;
  }

  // 2. Validasi Nama: Wajib diisi minimal 2 karakter
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

  // 3. Validasi Duplikasi Kode dan Nama (Case-Insensitive)
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

  // 4. Buat objek JenisAntrian baru
  const newJenis: JenisAntrian = {
    id: Date.now().toString(),
    kode: rawKode,
    nama: rawNama,
    statusAktif: true,
  };

  existingTypes.push(newJenis);
  saveQueueTypes(existingTypes);

  // Bersihkan form
  inputKodeJenis.value = "";
  inputNamaJenis.value = "";

  showToast(`Jenis antrian "${newJenis.nama}" (${newJenis.kode}) berhasil ditambahkan!`, "success");
  renderAll();
}

// ============================================================
// 12. RESET SELURUH ANTRIAN (KOSONGKAN & NOMOR MULAI DARI AWAL)
// ============================================================
function handleResetAntrian(): void {
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

// ============================================================
// 13. DROPDOWN PENERBITAN TIKET MANUAL (HANYA LAYANAN AKTIF)
// ============================================================
function renderManualTicketDropdown(): void {
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

// ============================================================
// 14. GENERATE NOMOR TIKET BERIKUTNYA SECARA KONSISTEN
// ============================================================
function generateNextTicketNumber(kode: string): string {
  return getNextTicketNumber(kode);
}

// ============================================================
// 15. PENERBITAN TIKET MANUAL
// ============================================================
function handleTerbitkanTiketManual(e: Event): void {
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

  // Ambil prioritas yang dipilih
  const priorityRadio = document.querySelector<HTMLInputElement>(
    'input[name="priority"]:checked'
  );
  const priority: Prioritas = (priorityRadio?.value as Prioritas) || "Normal";

  // Buat tiket baru
  const nomorTiket = generateNextTicketNumber(targetJenis.kode);
  const timestampNow = Date.now();

  const newTicket: Tiket = {
    nomorTiket,
    jenis: targetJenis.kode,
    prioritas: priority,
    status: "Menunggu",
    timestamp: timestampNow,
  };

  const tickets = getTickets();
  tickets.push(newTicket);
  saveTickets(tickets);

  // Tampilkan hasil tiket di dialog modal
  ticketResultNumber.textContent = newTicket.nomorTiket;
  ticketResultService.textContent = targetJenis.nama;
  ticketResultPriority.textContent = newTicket.prioritas;

  // Atur kelas badge prioritas
  ticketResultPriority.className = `badge badge-${newTicket.prioritas.toLowerCase()}`;
  ticketResultTime.textContent = new Date(timestampNow).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  dialogTicketResult.showModal();

  showToast(`Tiket ${newTicket.nomorTiket} (${targetJenis.nama}) berhasil diterbitkan!`, "success");
  renderAll();
}

// ============================================================
// 16. RENDER PEMANTAUAN TIKET REAL-TIME (LIVE MONITOR)
// ============================================================
function renderLiveTicketsTable(): void {
  const tickets = getTickets();
  const types = getQueueTypes();
  const statusFilter = filterAntrianStatus.value;

  tbodyLiveTickets.innerHTML = "";

  const filteredTickets =
    statusFilter === "ALL"
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);

  if (filteredTickets.length === 0) {
    emptyStateTickets.hidden = false;
    return;
  }
  emptyStateTickets.hidden = true;

  // Tampilkan urutan tiket terbaru di atas
  const displayTickets = [...filteredTickets].reverse();

  displayTickets.forEach((t) => {
    const tr = document.createElement("tr");

    // Jenis Layanan
    const serviceName = types.find((k) => k.kode === t.jenis)?.nama || `Layanan ${t.jenis}`;

    // Status Badge
    let statusBadgeClass = "badge-status-menunggu";
    if (t.status === "Dipanggil") statusBadgeClass = "badge-status-dipanggil";
    else if (t.status === "Selesai") statusBadgeClass = "badge-status-selesai";
    else if (t.status === "Dilewati") statusBadgeClass = "badge-status-dilewati";

    // Prioritas Badge
    const priorityBadgeClass = `badge-${t.prioritas.toLowerCase()}`;

    // Waktu Ambil
    const timeFormatted = new Date(t.timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
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

// ============================================================
// 17. RE-RENDER SELURUH KOMPONEN DASHBOARD
// ============================================================
function renderAll(): void {
  renderStats();
  renderQueueTypesTable();
  renderManualTicketDropdown();
  renderLiveTicketsTable();
}

// ============================================================
// 18. LOGOUT ADMIN
// ============================================================
function handleLogout(): void {
  openConfirmModal(
    "Keluar dari Sesi?",
    "Apakah Anda yakin ingin keluar dari sesi Dashboard Administrator?",
    () => {
      clearSession();
      window.location.replace("login.html");
    }
  );
}

// ============================================================
// 19. INISIALISASI HALAMAN
// ============================================================
function init(): void {
  // Pastikan data awal tersedia
  seedIfEmpty();

  // Tampilkan profil admin
  renderUserProfile();

  // Render seluruh tampilan
  renderAll();

  // Polling real-time setiap 3 detik
  setInterval(renderAll, 3000);

  // Listener storage untuk sinkronisasi antar tab instan
  window.addEventListener("storage", (e) => {
    if (e.key === LS_QUEUE_TYPES || e.key === LS_TICKETS) {
      renderAll();
    }
  });

  // Event handler Logout
  btnLogout.addEventListener("click", handleLogout);

  // Form Tambah Jenis Antrian
  formTambahJenis.addEventListener("submit", handleTambahJenis);

  // Input kode auto-uppercase saat diketik
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

  // Tombol Reset Antrian
  btnResetAntrian.addEventListener("click", handleResetAntrian);

  // Form Penerbitan Tiket Manual
  formTiketManual.addEventListener("submit", handleTerbitkanTiketManual);
  selectManualJenis.addEventListener("change", () => {
    feedbackManualJenis.textContent = "";
    feedbackManualJenis.classList.remove("is-error");
  });

  // Filter Live Tickets
  filterAntrianStatus.addEventListener("change", renderLiveTicketsTable);

  // Modal Dialog Hasil Tiket
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

  // Modal Dialog Konfirmasi
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

// Eksekusi inisialisasi saat DOM siap
init();
