import {
  getQueueTypes,
  getTickets,
  getSession,
  JenisAntrian,
  Tiket,
  LS_QUEUE_TYPES,
} from "./types";

// ============================================================
// Elemen DOM
// ============================================================
const displayGrid = document.getElementById("display-grid") as HTMLElement;
const emptyState = document.getElementById("empty-state") as HTMLParagraphElement;
const lastUpdated = document.getElementById("last-updated") as HTMLSpanElement;
const template = document.getElementById(
  "display-card-template"
) as HTMLTemplateElement;
const btnFullscreen = document.getElementById(
  "btn-fullscreen"
) as HTMLButtonElement;
const btnLoginLayar = document.getElementById(
  "btn-login-layar"
) as HTMLAnchorElement | null;

// ============================================================
// Tiket "dipanggil" terakhir untuk suatu jenis antrian
// ============================================================
function getCalledTicket(kode: string): Tiket | undefined {
  const called = getTickets()
    .filter((t) => t.jenis === kode && t.status === "Dipanggil")
    .sort((a, b) => b.timestamp - a.timestamp); // terbaru dulu
  return called[0];
}

// ============================================================
// Jumlah tiket menunggu untuk suatu jenis antrian
// ============================================================
function waitingCount(kode: string): number {
  return getTickets().filter(
    (t) => t.jenis === kode && t.status === "Menunggu"
  ).length;
}

// ============================================================
// Render satu kartu display dari template
// ============================================================
function renderCard(jenis: JenisAntrian): void {
  const clone = template.content.cloneNode(true) as DocumentFragment;
  const card = clone.querySelector(".display-card") as HTMLElement;

  card.dataset.kode = jenis.kode;

  (card.querySelector(".service-name") as HTMLElement).textContent = jenis.nama;
  (card.querySelector(".code-badge") as HTMLElement).textContent = jenis.kode;

  const calledNumberEl = card.querySelector(".called-number") as HTMLElement;
  const waitingEl = card.querySelector(".waiting-count") as HTMLElement;

  const called = getCalledTicket(jenis.kode);
  if (called) {
    calledNumberEl.textContent = called.nomorTiket;
    card.classList.remove("is-empty");
  } else {
    card.classList.add("is-empty");
  }

  waitingEl.textContent = String(waitingCount(jenis.kode));

  displayGrid.appendChild(card);
}

// ============================================================
// Update satu kartu yang sudah ada (tanpa re-render penuh)
// ============================================================
function updateCard(jenis: JenisAntrian): void {
  const card = displayGrid.querySelector<HTMLElement>(
    `[data-kode="${jenis.kode}"]`
  );
  if (!card) return;

  const calledNumberEl = card.querySelector(".called-number") as HTMLElement;
  const waitingEl = card.querySelector(".waiting-count") as HTMLElement;

  const called = getCalledTicket(jenis.kode);
  if (called) {
    calledNumberEl.textContent = called.nomorTiket;
    card.classList.remove("is-empty");
  } else {
    card.classList.add("is-empty");
  }

  waitingEl.textContent = String(waitingCount(jenis.kode));
}

// ============================================================
// Render/sinkronisasi semua jenis antrian aktif
// Strategi: tambah kartu baru jika belum ada, update jika sudah ada,
//           hapus jika jenis sudah tidak aktif.
// ============================================================
function syncDisplay(): void {
  const allTypes = getQueueTypes();
  const active = allTypes.filter((t) => t.statusAktif);

  if (active.length === 0) {
    displayGrid.innerHTML = "";
    emptyState.hidden = false;
    lastUpdated.textContent = new Date().toLocaleTimeString("id-ID");
    return;
  }

  emptyState.hidden = true;

  // Hapus kartu yang jenisnya sudah tidak aktif
  const activeCodes = new Set(active.map((t) => t.kode));
  displayGrid
    .querySelectorAll<HTMLElement>("[data-kode]")
    .forEach((card) => {
      if (!activeCodes.has(card.dataset.kode!)) {
        card.remove();
      }
    });

  // Tambah atau update kartu
  active.forEach((jenis) => {
    const existing = displayGrid.querySelector(`[data-kode="${jenis.kode}"]`);
    if (!existing) {
      renderCard(jenis);
    } else {
      updateCard(jenis);
    }
  });

  lastUpdated.textContent = new Date().toLocaleTimeString("id-ID");
}

// ============================================================
// Fullscreen API
// ============================================================
function updateFullscreenIcon(): void {
  const isFullscreen = !!document.fullscreenElement;
  btnFullscreen.setAttribute(
    "title",
    isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"
  );
  btnFullscreen.setAttribute(
    "aria-label",
    isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"
  );

  btnFullscreen.innerHTML = isFullscreen
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      </svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>`;
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      // Browser tidak mendukung atau permission ditolak
    });
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener("fullscreenchange", updateFullscreenIcon);

// ============================================================
// Inisialisasi
// ============================================================
function seedIfEmpty(): void {
  if (getQueueTypes().length === 0) {
    const demo = [
      { id: "1", kode: "A", nama: "Poli Umum", statusAktif: true },
      { id: "2", kode: "B", nama: "Poli Gigi", statusAktif: true },
      { id: "3", kode: "C", nama: "Farmasi", statusAktif: true },
    ];
    localStorage.setItem(LS_QUEUE_TYPES, JSON.stringify(demo));
  }
}

function init(): void {
  // Cek apakah ada sesi aktif untuk tombol navigasi
  if (btnLoginLayar) {
    const session = getSession();
    if (session && session.token) {
      const role = (session.role || "").toLowerCase();
      let destination = "ambil-antrian.html";
      let destTitle = "Ambil Antrian";

      if (role === "admin" || role === "moderator") {
        destination = "index.html";
        destTitle = "Dashboard Admin";
      } else if (role === "operator") {
        destination = "operator.html";
        destTitle = "Panel Operator";
      }

      btnLoginLayar.textContent = session.firstName || session.username || "Akun Saya";
      btnLoginLayar.href = destination;
      btnLoginLayar.title = `Buka ${destTitle}`;
    }
  }

  seedIfEmpty();
  syncDisplay();

  // Polling setiap 2 detik sesuai spesifikasi
  setInterval(syncDisplay, 2000);

  // Sinkronisasi instan via event storage
  window.addEventListener("storage", (e) => {
    if (e.key === "tickets" || e.key === "queueTypes") {
      syncDisplay();
    }
  });

  btnFullscreen.addEventListener("click", toggleFullscreen);
}

init();
