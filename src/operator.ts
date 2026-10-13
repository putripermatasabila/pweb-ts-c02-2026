// ============================================================
// operator.ts - Logika Halaman Operator Antrian Rumah Sakit
// Disusun oleh: Evan
// Fitur:
// 1. Auth Guard berbasis LocalStorage
// 2. Algoritma Antrian Prioritas (VIP > Disabilitas > Lansia > Normal)
// 3. Fungsionalitas Tombol: Panggil Berikutnya, Lewati, Selesai
// 4. Efek Suara Panggilan & Text-to-Speech (Web Speech + Web Audio)
// 5. Polling & Sinkronisasi Real-Time
// ============================================================

import {
  getQueueTypes,
  getTickets,
  saveTickets,
  getSession,
  clearSession,
  sortTicketsByPriority,
  JenisAntrian,
  Tiket,
  Prioritas,
  LS_QUEUE_TYPES,
  LS_TICKETS,
} from "./types";

import {
  announceTicket,
  playHospitalChime,
  isAudioEnabled,
  setAudioEnabled,
} from "./audio";

// ============================================================
// 1. AUTH GUARD
// Memeriksa keberadaan data sesi login di LocalStorage.
// Jika belum login, redirect paksa kembali ke login.html.
// ============================================================
function enforceAuthGuard(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  // Bypass untuk pengujian lokal jika parameter ?demo=1 disertakan
  if (urlParams.get("demo") === "1" || urlParams.get("dev") === "1") {
    if (!getSession()) {
      localStorage.setItem(
        "currentSession",
        JSON.stringify({
          token: "demo-token-12345",
          role: "operator",
          firstName: "Evan",
          username: "evan_operator",
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

  return true;
}

// Langsung jalankan Auth Guard sebelum manipulasi DOM lainnya
if (!enforceAuthGuard()) {
  // Hentikan eksekusi skrip jika diarahkan
  throw new Error("Akses ditolak: Silakan login terlebih dahulu.");
}

// ============================================================
// Demo Seed Data (jika LocalStorage masih kosong)
// ============================================================
function seedIfEmpty(): void {
  if (getQueueTypes().length === 0) {
    const demoServices: JenisAntrian[] = [
      { id: "1", kode: "A", nama: "Poli Umum", statusAktif: true },
      { id: "2", kode: "B", nama: "Poli Gigi", statusAktif: true },
      { id: "3", kode: "C", nama: "Farmasi", statusAktif: true },
    ];
    localStorage.setItem(LS_QUEUE_TYPES, JSON.stringify(demoServices));
  }
}

// ============================================================
// Referensi Elemen DOM
// ============================================================
const userNameEl = document.getElementById("user-name") as HTMLElement;
const userRoleEl = document.getElementById("user-role") as HTMLElement;
const btnLogout = document.getElementById("btn-logout") as HTMLButtonElement;

// Filter Loket / Layanan
const serviceFilterSelect = document.getElementById(
  "service-filter"
) as HTMLSelectElement;

// Card Pemanggilan Aktif
const activeServingStatus = document.getElementById(
  "active-serving-status"
) as HTMLElement;
const activeTicketNum = document.getElementById(
  "active-ticket-num"
) as HTMLElement;
const activeTicketService = document.getElementById(
  "active-ticket-service"
) as HTMLElement;
const activeTicketBadges = document.getElementById(
  "active-ticket-badges"
) as HTMLElement;
const activeTicketMeta = document.getElementById(
  "active-ticket-meta"
) as HTMLElement;

// Tombol Kontrol Operator
const btnCallNext = document.getElementById(
  "btn-call-next"
) as HTMLButtonElement;
const btnRecall = document.getElementById("btn-recall") as HTMLButtonElement;
const btnSkip = document.getElementById("btn-skip") as HTMLButtonElement;
const btnSkipMark = document.getElementById("btn-skip-mark") as HTMLButtonElement;
const btnFinish = document.getElementById("btn-finish") as HTMLButtonElement;

// Audio & TTS Controls
const audioToggle = document.getElementById("audio-toggle") as HTMLInputElement;
const btnTestAudio = document.getElementById(
  "btn-test-audio"
) as HTMLButtonElement;
const speakingIndicator = document.getElementById(
  "speaking-indicator"
) as HTMLElement;

// Tab & Kontainer Daftar Antrian
const tabWaitingBtn = document.getElementById("tab-waiting") as HTMLButtonElement;
const tabSkippedBtn = document.getElementById("tab-skipped") as HTMLButtonElement;
const tabFinishedBtn = document.getElementById("tab-finished") as HTMLButtonElement;
const countWaitingEl = document.getElementById("count-waiting") as HTMLElement;
const countSkippedEl = document.getElementById("count-skipped") as HTMLElement;
const countFinishedEl = document.getElementById("count-finished") as HTMLElement;

const queueContainer = document.getElementById(
  "queue-container"
) as HTMLUListElement;
const emptyQueueState = document.getElementById(
  "empty-queue-state"
) as HTMLElement;

// Ringkasan Statistik
const statWaiting = document.getElementById("stat-waiting") as HTMLElement;
const statActive = document.getElementById("stat-active") as HTMLElement;
const statFinished = document.getElementById("stat-finished") as HTMLElement;
const statSkipped = document.getElementById("stat-skipped") as HTMLElement;

// Demo Quick-Add Button (bantuan pengujian)
const btnSeedDemoTickets = document.getElementById(
  "btn-seed-demo-tickets"
) as HTMLButtonElement | null;

// ============================================================
// State Aplikasi Operator
// ============================================================
let activeTab: "waiting" | "skipped" | "finished" = "waiting";
let selectedServiceCode: string = "ALL"; // "ALL" atau kode tertentu seperti "A"

// ============================================================
// Helper Fungsi Layanan & Nama
// ============================================================
function getServiceName(kode: string): string {
  const service = getQueueTypes().find((s) => s.kode === kode);
  return service ? service.nama : `Layanan ${kode}`;
}

// Dapatkan tiket yang sedang berstatus "Dipanggil"
function getActiveCalledTicket(): Tiket | undefined {
  const tickets = getTickets();
  const called = tickets.filter(
    (t) =>
      t.status === "Dipanggil" &&
      (selectedServiceCode === "ALL" || t.jenis === selectedServiceCode)
  );

  if (called.length === 0) return undefined;

  // Ambil yang paling baru dipanggil
  called.sort((a, b) => b.timestamp - a.timestamp);
  return called[0];
}

// ============================================================
// Toast Notifikasi Sederhana
// ============================================================
function showToast(
  message: string,
  type: "success" | "warning" | "danger" | "info" = "info"
): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// ============================================================
// Trigger Suara & TTS Panggilan
// ============================================================
function triggerCallAnnouncement(nomorTiket: string, namaLayanan: string): void {
  if (!isAudioEnabled()) return;

  announceTicket(
    nomorTiket,
    namaLayanan,
    () => {
      if (speakingIndicator) speakingIndicator.classList.add("active");
    },
    () => {
      if (speakingIndicator) speakingIndicator.classList.remove("active");
    }
  );
}

// ============================================================
// 2. LOGIKA AKSI OPERATOR
// ============================================================

/**
 * Panggil Berikutnya:
 * 1. Mengubah tiket aktif sebelumnya menjadi Selesai (jika ada).
 * 2. Memanggil tiket antrian berikutnya sesuai pengurutan prioritas.
 */
function handleCallNext(): void {
  const tickets = getTickets();

  // 1. Ubah tiket aktif sebelumnya menjadi Selesai
  const currentActive = getActiveCalledTicket();
  if (currentActive) {
    const activeIdx = tickets.findIndex(
      (t) => t.nomorTiket === currentActive.nomorTiket
    );
    if (activeIdx !== -1) {
      tickets[activeIdx].status = "Selesai";
    }
  }

  // 2. Ambil tiket menunggu yang sesuai dengan filter layanan
  const waitingTickets = tickets.filter(
    (t) =>
      t.status === "Menunggu" &&
      (selectedServiceCode === "ALL" || t.jenis === selectedServiceCode)
  );

  // Jalankan algoritma prioritas
  const sortedWaiting = sortTicketsByPriority(waitingTickets);

  if (sortedWaiting.length === 0) {
    saveTickets(tickets);
    render();
    showToast("Tidak ada tiket antrian yang sedang menunggu.", "warning");
    return;
  }

  // Ambil tiket urutan pertama hasil algoritma prioritas
  const nextTicket = sortedWaiting[0];
  const nextIdx = tickets.findIndex(
    (t) => t.nomorTiket === nextTicket.nomorTiket
  );

  if (nextIdx !== -1) {
    tickets[nextIdx].status = "Dipanggil";
    tickets[nextIdx].timestamp = Date.now(); // Perbarui waktu panggil
  }

  saveTickets(tickets);
  render();

  // Umumkan melalui suara & TTS
  const serviceName = getServiceName(nextTicket.jenis);
  triggerCallAnnouncement(nextTicket.nomorTiket, serviceName);
  showToast(`Memanggil nomor ${nextTicket.nomorTiket} (${nextTicket.prioritas})`, "success");
}

/**
 * Panggil Ulang:
 * Mengumumkan kembali nomor tiket yang sedang aktif dipanggil
 */
function handleRecall(): void {
  const currentActive = getActiveCalledTicket();
  if (!currentActive) {
    showToast("Tidak ada tiket yang sedang dipanggil saat ini.", "warning");
    return;
  }

  const serviceName = getServiceName(currentActive.jenis);
  triggerCallAnnouncement(currentActive.nomorTiket, serviceName);
  showToast(`Memanggil ulang nomor ${currentActive.nomorTiket}`, "info");
}

/**
 * Lewati:
 * Memindahkan tiket yang tidak hadir ke akhir antrian
 * (status: Menunggu, timestamp diperbarui ke Date.now() sehingga berada di posisi paling belakang antrian)
 */
function handleSkipToBack(): void {
  const tickets = getTickets();
  const currentActive = getActiveCalledTicket();

  if (!currentActive) {
    showToast("Tidak ada tiket yang sedang dipanggil untuk dilewati.", "warning");
    return;
  }

  const idx = tickets.findIndex((t) => t.nomorTiket === currentActive.nomorTiket);
  if (idx !== -1) {
    // Pindahkan ke akhir antrian
    tickets[idx].status = "Menunggu";
    tickets[idx].timestamp = Date.now();
    saveTickets(tickets);
    render();
    showToast(`Tiket ${currentActive.nomorTiket} dipindahkan ke akhir antrian.`, "warning");
  }
}

/**
 * Tandai Dilewati:
 * Menandai tiket yang tidak hadir secara definitif sebagai status "Dilewati"
 */
function handleMarkSkipped(): void {
  const tickets = getTickets();
  const currentActive = getActiveCalledTicket();

  if (!currentActive) {
    showToast("Tidak ada tiket yang sedang dipanggil untuk dilewati.", "warning");
    return;
  }

  const idx = tickets.findIndex((t) => t.nomorTiket === currentActive.nomorTiket);
  if (idx !== -1) {
    tickets[idx].status = "Dilewati";
    saveTickets(tickets);
    render();
    showToast(`Tiket ${currentActive.nomorTiket} ditandai sebagai Dilewati.`, "danger");
  }
}

/**
 * Selesai:
 * Menutup tiket yang sedang dipanggil tanpa otomatis memanggil antrian berikutnya
 */
function handleFinish(): void {
  const tickets = getTickets();
  const currentActive = getActiveCalledTicket();

  if (!currentActive) {
    showToast("Tidak ada tiket yang sedang dipanggil untuk diselesaikan.", "warning");
    return;
  }

  const idx = tickets.findIndex((t) => t.nomorTiket === currentActive.nomorTiket);
  if (idx !== -1) {
    tickets[idx].status = "Selesai";
    saveTickets(tickets);
    render();
    showToast(`Tiket ${currentActive.nomorTiket} berhasil diselesaikan.`, "success");
  }
}

/**
 * Panggil Langsung Tiket Tertentu dari Daftar Antrian
 */
function handleCallSpecificTicket(nomorTiket: string): void {
  const tickets = getTickets();

  // Selesaikan tiket aktif saat ini terlebih dahulu jika ada
  const currentActive = getActiveCalledTicket();
  if (currentActive && currentActive.nomorTiket !== nomorTiket) {
    const activeIdx = tickets.findIndex(
      (t) => t.nomorTiket === currentActive.nomorTiket
    );
    if (activeIdx !== -1) {
      tickets[activeIdx].status = "Selesai";
    }
  }

  const targetIdx = tickets.findIndex((t) => t.nomorTiket === nomorTiket);
  if (targetIdx !== -1) {
    tickets[targetIdx].status = "Dipanggil";
    tickets[targetIdx].timestamp = Date.now();
    saveTickets(tickets);
    render();

    const target = tickets[targetIdx];
    const serviceName = getServiceName(target.jenis);
    triggerCallAnnouncement(target.nomorTiket, serviceName);
    showToast(`Memanggil nomor ${target.nomorTiket}`, "success");
  }
}

/**
 * Kembalikan Tiket yang Dilewati ke Antrian Menunggu
 */
function handleReturnToQueue(nomorTiket: string): void {
  const tickets = getTickets();
  const targetIdx = tickets.findIndex((t) => t.nomorTiket === nomorTiket);
  if (targetIdx !== -1) {
    tickets[targetIdx].status = "Menunggu";
    tickets[targetIdx].timestamp = Date.now();
    saveTickets(tickets);
    render();
    showToast(`Tiket ${nomorTiket} dikembalikan ke antrian menunggu.`, "info");
  }
}

// ============================================================
// 3. RENDER TAMPILAN
// ============================================================

function renderActiveTicket(): void {
  const current = getActiveCalledTicket();

  if (!current) {
    activeServingStatus.innerHTML = `
      <span class="status-idle">
        <span class="idle-dot"></span> Siap Memanggil
      </span>
    `;
    activeTicketNum.textContent = "---";
    activeTicketNum.classList.add("empty");
    activeTicketService.textContent =
      selectedServiceCode === "ALL"
        ? "Semua Layanan Antrian"
        : getServiceName(selectedServiceCode);
    activeTicketBadges.innerHTML = "";
    activeTicketMeta.textContent = "Tekan 'Panggil Berikutnya' untuk memulai antrian.";

    btnRecall.disabled = true;
    btnSkip.disabled = true;
    btnSkipMark.disabled = true;
    btnFinish.disabled = true;
    return;
  }

  activeServingStatus.innerHTML = `
    <span class="status-serving">
      <span class="pulse-dot"></span> Sedang Dilayani
    </span>
  `;
  activeTicketNum.textContent = current.nomorTiket;
  activeTicketNum.classList.remove("empty");
  activeTicketService.textContent = getServiceName(current.jenis);

  const priorityClass = `badge-${current.prioritas.toLowerCase()}`;
  activeTicketBadges.innerHTML = `
    <span class="badge ${priorityClass}">
      Prioritas: ${current.prioritas}
    </span>
    <span class="badge badge-status-dipanggil">
      Status: Dipanggil
    </span>
    <span class="badge badge-kode">
      ${current.jenis}
    </span>
  `;

  const callTime = new Date(current.timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  activeTicketMeta.textContent = `Dipanggil pukul ${callTime}`;

  btnRecall.disabled = false;
  btnSkip.disabled = false;
  btnSkipMark.disabled = false;
  btnFinish.disabled = false;
}

function renderStats(): void {
  const tickets = getTickets();
  const filtered = tickets.filter(
    (t) => selectedServiceCode === "ALL" || t.jenis === selectedServiceCode
  );

  const waitingCount = filtered.filter((t) => t.status === "Menunggu").length;
  const activeCount = filtered.filter((t) => t.status === "Dipanggil").length;
  const finishedCount = filtered.filter((t) => t.status === "Selesai").length;
  const skippedCount = filtered.filter((t) => t.status === "Dilewati").length;

  statWaiting.textContent = String(waitingCount);
  statActive.textContent = String(activeCount);
  statFinished.textContent = String(finishedCount);
  statSkipped.textContent = String(skippedCount);

  countWaitingEl.textContent = String(waitingCount);
  countSkippedEl.textContent = String(skippedCount);
  countFinishedEl.textContent = String(finishedCount);
}

function renderQueueList(): void {
  queueContainer.innerHTML = "";
  const tickets = getTickets();
  const filtered = tickets.filter(
    (t) => selectedServiceCode === "ALL" || t.jenis === selectedServiceCode
  );

  let targetList: Tiket[] = [];

  if (activeTab === "waiting") {
    // Terapkan algoritma prioritas
    const waiting = filtered.filter((t) => t.status === "Menunggu");
    targetList = sortTicketsByPriority(waiting);
  } else if (activeTab === "skipped") {
    targetList = filtered.filter((t) => t.status === "Dilewati");
  } else if (activeTab === "finished") {
    targetList = filtered
      .filter((t) => t.status === "Selesai")
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  if (targetList.length === 0) {
    emptyQueueState.hidden = false;
    return;
  }

  emptyQueueState.hidden = true;

  targetList.forEach((ticket, index) => {
    const li = document.createElement("li");
    const isFirstInQueue = activeTab === "waiting" && index === 0;

    li.className = `queue-item ${isFirstInQueue ? "queue-item-next" : ""}`;

    const priorityClass = `badge-${ticket.prioritas.toLowerCase()}`;
    const timeFormatted = new Date(ticket.timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let actionBtnHtml = "";
    if (activeTab === "waiting") {
      actionBtnHtml = `
        <button type="button" class="btn btn-sm ${isFirstInQueue ? "btn-primary" : "btn-ghost"}" data-action="call" data-id="${ticket.nomorTiket}">
          ${isFirstInQueue ? "Panggil Sekarang" : "Panggil"}
        </button>
      `;
    } else if (activeTab === "skipped") {
      actionBtnHtml = `
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn btn-sm btn-primary" data-action="call" data-id="${ticket.nomorTiket}">
            Panggil
          </button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="return" data-id="${ticket.nomorTiket}">
            Ke Antrian
          </button>
        </div>
      `;
    }

    li.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <span class="queue-item-number">${ticket.nomorTiket}</span>
        <div>
          <div class="queue-item-info">
            <span class="badge ${priorityClass}">
              ${ticket.prioritas}
            </span>
            <span class="badge badge-kode">${ticket.jenis}</span>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--ink);">
              ${getServiceName(ticket.jenis)}
            </span>
            ${isFirstInQueue ? '<span class="badge btn-primary" style="font-size: 0.72rem;">Berikutnya</span>' : ""}
          </div>
          <div style="font-size: 0.78rem; color: var(--muted); margin-top: 3px;">
            Waktu: ${timeFormatted}
          </div>
        </div>
      </div>
      <div>
        ${actionBtnHtml}
      </div>
    `;

    // Pasang event listener tombol di dalam item
    const btnCall = li.querySelector<HTMLButtonElement>('[data-action="call"]');
    if (btnCall) {
      btnCall.addEventListener("click", () => {
        handleCallSpecificTicket(ticket.nomorTiket);
      });
    }

    const btnReturn = li.querySelector<HTMLButtonElement>('[data-action="return"]');
    if (btnReturn) {
      btnReturn.addEventListener("click", () => {
        handleReturnToQueue(ticket.nomorTiket);
      });
    }

    queueContainer.appendChild(li);
  });
}

function render(): void {
  renderActiveTicket();
  renderStats();
  renderQueueList();
}

// Sinkronisasi opsi dropdown pilihan layanan
function syncServiceOptions(): void {
  const types = getQueueTypes().filter((t) => t.statusAktif);
  const currentVal = serviceFilterSelect.value || "ALL";

  serviceFilterSelect.innerHTML = `<option value="ALL">Semua Layanan Antrian</option>`;

  types.forEach((type) => {
    const opt = document.createElement("option");
    opt.value = type.kode;
    opt.textContent = `[${type.kode}] ${type.nama}`;
    serviceFilterSelect.appendChild(opt);
  });

  serviceFilterSelect.value = currentVal;
}

// ============================================================
// 4. BANTUAN SEED TIKET UJI PRIORITAS (DEMO BUTTON)
// ============================================================
function seedDemoTickets(): void {
  const existing = getTickets();
  const now = Date.now();

  const demoList: Tiket[] = [
    { nomorTiket: "A-001", jenis: "A", prioritas: "Normal", status: "Menunggu", timestamp: now - 50000 },
    { nomorTiket: "A-002", jenis: "A", prioritas: "VIP", status: "Menunggu", timestamp: now - 40000 },
    { nomorTiket: "A-003", jenis: "A", prioritas: "Lansia", status: "Menunggu", timestamp: now - 30000 },
    { nomorTiket: "B-001", jenis: "B", prioritas: "Disabilitas", status: "Menunggu", timestamp: now - 20000 },
    { nomorTiket: "A-004", jenis: "A", prioritas: "VIP", status: "Menunggu", timestamp: now - 10000 },
  ];

  const merged = [...existing, ...demoList];
  saveTickets(merged);
  render();
  showToast("5 tiket uji prioritas berhasil ditambahkan!", "success");
}

// ============================================================
// 5. INISIALISASI & EVENT LISTENERS
// ============================================================
function init(): void {
  seedIfEmpty();

  // Tampilkan data sesi pengguna
  const session = getSession();
  if (session) {
    userNameEl.textContent = session.firstName || session.username || "Operator";
    userRoleEl.textContent = (session.role || "Operator").toUpperCase();

    const roleNormalized = (session.role || "").toLowerCase();
    const navAdmin = document.getElementById("operator-nav-admin");
    if (navAdmin) {
      navAdmin.style.display =
        roleNormalized === "admin" || roleNormalized === "moderator"
          ? "inline-block"
          : "none";
    }
  }

  // Tombol Logout
  btnLogout.addEventListener("click", () => {
    clearSession();
    window.location.replace("login.html");
  });

  // Sinkronisasi Layanan
  syncServiceOptions();

  // Preferensi Audio
  audioToggle.checked = isAudioEnabled();
  audioToggle.addEventListener("change", () => {
    setAudioEnabled(audioToggle.checked);
    showToast(
      audioToggle.checked ? "Suara panggilan diaktifkan" : "Suara panggilan dibisukan",
      "info"
    );
  });

  btnTestAudio.addEventListener("click", async () => {
    btnTestAudio.disabled = true;
    showToast("Menguji suara dan ucapan Text-to-Speech...", "info");
    await playHospitalChime();
    announceTicket(
      "A-001",
      "Poli Umum",
      () => {
        if (speakingIndicator) speakingIndicator.classList.add("active");
      },
      () => {
        if (speakingIndicator) speakingIndicator.classList.remove("active");
        btnTestAudio.disabled = false;
      }
    );
  });

  // Tombol Kontrol Panggilan
  btnCallNext.addEventListener("click", handleCallNext);
  btnRecall.addEventListener("click", handleRecall);
  btnSkip.addEventListener("click", handleSkipToBack);
  btnSkipMark.addEventListener("click", handleMarkSkipped);
  btnFinish.addEventListener("click", handleFinish);

  // Filter Layanan
  serviceFilterSelect.addEventListener("change", () => {
    selectedServiceCode = serviceFilterSelect.value;
    render();
  });

  // Tab Navigasi
  const setTab = (tab: "waiting" | "skipped" | "finished") => {
    activeTab = tab;
    tabWaitingBtn.classList.toggle("active", tab === "waiting");
    tabSkippedBtn.classList.toggle("active", tab === "skipped");
    tabFinishedBtn.classList.toggle("active", tab === "finished");
    renderQueueList();
  };

  tabWaitingBtn.addEventListener("click", () => setTab("waiting"));
  tabSkippedBtn.addEventListener("click", () => setTab("skipped"));
  tabFinishedBtn.addEventListener("click", () => setTab("finished"));

  // Tombol Demo Bantuan Pengujian
  if (btnSeedDemoTickets) {
    btnSeedDemoTickets.addEventListener("click", seedDemoTickets);
  }

  // Polling Real-time setiap 2 detik
  setInterval(() => {
    render();
    syncServiceOptions();
  }, 2000);

  // Event Storage antar Tab Browser
  window.addEventListener("storage", (e) => {
    if (e.key === LS_TICKETS || e.key === LS_QUEUE_TYPES) {
      render();
      syncServiceOptions();
    }
  });

  // Render awal
  render();
}

// Mulai aplikasi
init();

