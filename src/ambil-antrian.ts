import {
  getQueueTypes,
  getTickets,
  saveTickets,
  getSession,
  clearSession,
  getNextTicketNumber,
  JenisAntrian,
  Tiket,
  Prioritas,
  LS_QUEUE_TYPES,
} from "./types";

// ============================================================
// Auth Guard Halaman Ambil Antrian
// Sesuai revisi: Semua user harus login untuk mengambil antrian
// ============================================================
function enforceAuthGuard(): boolean {
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

// Seed data demo — hanya dipakai jika LocalStorage masih kosong
// (akan otomatis diganti data asli dari index.html milik Satya)
function seedIfEmpty(): void {
  if (getQueueTypes().length === 0) {
    const demo: JenisAntrian[] = [
      { id: "1", kode: "A", nama: "Poli Umum", statusAktif: true },
      { id: "2", kode: "B", nama: "Poli Gigi", statusAktif: true },
      { id: "3", kode: "C", nama: "Farmasi", statusAktif: true },
    ];
    localStorage.setItem(LS_QUEUE_TYPES, JSON.stringify(demo));
  }
}

// ============================================================
// Elemen DOM
// ============================================================
const typeGrid = document.getElementById("type-grid") as HTMLElement;
const emptyState = document.getElementById("empty-state") as HTMLParagraphElement;
const lastUpdated = document.getElementById("last-updated") as HTMLSpanElement;
const template = document.getElementById("type-card-template") as HTMLTemplateElement;
const dialog = document.getElementById("ticket-dialog") as HTMLDialogElement;
const ticketNumber = document.getElementById("ticket-number") as HTMLParagraphElement;
const ticketService = document.getElementById("ticket-service") as HTMLSpanElement;
const ticketPriority = document.getElementById("ticket-priority") as HTMLSpanElement;
const ticketWaiting = document.getElementById("ticket-waiting") as HTMLSpanElement;
const ticketClose = document.getElementById("ticket-close") as HTMLButtonElement;
const ticketPrint = document.getElementById("ticket-print") as HTMLButtonElement | null;
const ticketPatientName = document.getElementById("ticket-patient-name") as HTMLElement;

// ============================================================
// Pengaturan Tampilan Profil Pengguna di Navbar
// ============================================================
function setupUserProfile(): void {
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
    const navAdmin = document.getElementById("nav-item-admin");
    if (navAdmin) {
      navAdmin.style.display =
        roleNormalized === "admin" || roleNormalized === "moderator"
          ? "inline-block"
          : "none";
    }
    const navOperator = document.getElementById("nav-item-operator");
    if (navOperator) {
      navOperator.style.display =
        roleNormalized === "admin" ||
        roleNormalized === "moderator" ||
        roleNormalized === "operator"
          ? "inline-block"
          : "none";
    }
  } else {
    const navAdmin = document.getElementById("nav-item-admin");
    if (navAdmin) navAdmin.style.display = "none";
    const navOperator = document.getElementById("nav-item-operator");
    if (navOperator) navOperator.style.display = "none";
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

// ============================================================
// Generate nomor tiket berikutnya
// Format: {kode}-{nomor 3 digit}, misal "A-001"
// ============================================================
function nextTicketNumber(kode: string): string {
  return getNextTicketNumber(kode);
}

// ============================================================
// Hitung tiket menunggu untuk jenis tertentu
// ============================================================
function waitingCount(kode: string, excludeTicketNumber?: string): number {
  return getTickets().filter(
    (t) =>
      t.jenis === kode &&
      t.status === "Menunggu" &&
      t.nomorTiket !== excludeTicketNumber
  ).length;
}

// ============================================================
// Buat tiket baru dan simpan ke LocalStorage
// ============================================================
function createTicket(jenis: JenisAntrian, prioritas: Prioritas): Tiket | null {
  const session = getSession();
  if (!session || !session.token) {
    alert("Sesi login Anda telah berakhir. Silakan login kembali untuk mengambil antrian.");
    window.location.replace("login.html?redirect=ambil-antrian.html");
    return null;
  }

  const tiket: Tiket = {
    nomorTiket: nextTicketNumber(jenis.kode),
    jenis: jenis.kode,
    prioritas,
    status: "Menunggu",
    timestamp: Date.now(),
    namaPengambil: session.firstName || session.username || "Pengguna",
    userId: session.id,
  };

  const tickets = getTickets();
  tickets.push(tiket);
  saveTickets(tickets);

  return tiket;
}

// ============================================================
// Tampilkan dialog tiket
// ============================================================
function showTicketDialog(tiket: Tiket, namaLayanan: string): void {
  ticketNumber.textContent = tiket.nomorTiket;
  ticketService.textContent = namaLayanan;
  ticketPriority.textContent =
    tiket.prioritas !== "Normal" ? `· ${tiket.prioritas}` : "";
  if (ticketPatientName) {
    ticketPatientName.textContent = tiket.namaPengambil || "Pengguna";
  }
  const count = waitingCount(tiket.jenis, tiket.nomorTiket);
  ticketWaiting.textContent =
    count > 0
      ? `${count} tiket lain menunggu untuk layanan ini`
      : "Kamu tiket menunggu pertama!";
  dialog.showModal();
}

// ============================================================
// Render satu kartu jenis antrian dari template
// ============================================================
function renderCard(jenis: JenisAntrian): void {
  const clone = template.content.cloneNode(true) as DocumentFragment;
  const card = clone.querySelector(".type-card") as HTMLElement;

  (card.querySelector(".service-name") as HTMLElement).textContent = jenis.nama;
  (card.querySelector(".code-badge") as HTMLElement).textContent = jenis.kode;

  // Tampilkan badge jumlah orang yang sedang menunggu
  const waitingEl = card.querySelector(".waiting-badge") as HTMLElement | null;
  if (waitingEl) {
    const count = waitingCount(jenis.kode);
    waitingEl.textContent = count > 0 ? `⏳ ${count} Menunggu` : "🟢 Tidak Ada Antrian";
    waitingEl.className = count > 0 ? "waiting-badge has-queue" : "waiting-badge is-empty";
  }

  // Pasang event handler untuk semua tombol ambil nomor
  card.querySelectorAll<HTMLButtonElement>(".btn-take").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prioritas = (btn.dataset.priority ?? "Normal") as Prioritas;
      const tiket = createTicket(jenis, prioritas);
      if (tiket) {
        showTicketDialog(tiket, jenis.nama);
      }
    });
  });

  typeGrid.appendChild(card);
}

// ============================================================
// Render semua jenis antrian aktif
// ============================================================
function render(): void {
  const allTypes = getQueueTypes();
  const active = allTypes.filter((t) => t.statusAktif);

  // Bersihkan grid
  typeGrid.innerHTML = "";

  if (active.length === 0) {
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    active.forEach(renderCard);
  }

  lastUpdated.textContent = new Date().toLocaleTimeString("id-ID");
}

// ============================================================
// Inisialisasi
// ============================================================
function init(): void {
  // Auth Guard: Pastikan user sudah login
  if (!enforceAuthGuard()) return;

  // Pasang badge profil user dan tombol logout
  setupUserProfile();

  seedIfEmpty();
  render();

  // Polling setiap 3 detik agar sinkron dengan perubahan dari halaman lain
  setInterval(render, 3000);

  // Sinkronisasi instan via event storage
  window.addEventListener("storage", (e) => {
    if (e.key === LS_QUEUE_TYPES || e.key === "tickets") {
      render();
    }
  });

  // Tombol tutup dialog
  ticketClose.addEventListener("click", () => {
    dialog.close();
  });

  // Tombol cetak tiket
  if (ticketPrint) {
    ticketPrint.addEventListener("click", () => {
      window.print();
    });
  }

  // Tutup dialog jika klik di luar area dialog
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

init();
