import { getQueueTypes, getTickets, JenisAntrian, Tiket, LS_QUEUE_TYPES } from "./types";

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

  // Set id agar bisa di-update saat polling tanpa flicker
  card.dataset.kode = jenis.kode;

  (card.querySelector(".service-name") as HTMLElement).textContent = jenis.nama;
  (card.querySelector(".code-badge") as HTMLElement).textContent = jenis.kode;

  const calledNumberEl = card.querySelector(".called-number") as HTMLElement;
  const emptyNoteEl = card.querySelector(".empty-note") as HTMLElement;
  const waitingEl = card.querySelector(".waiting-count") as HTMLElement;

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

// ============================================================
// Update satu kartu yang sudah ada (tanpa re-render penuh)
// ============================================================
function updateCard(jenis: JenisAntrian): void {
  const card = displayGrid.querySelector<HTMLElement>(
    `[data-kode="${jenis.kode}"]`
  );
  if (!card) return;

  const calledNumberEl = card.querySelector(".called-number") as HTMLElement;
  const emptyNoteEl = card.querySelector(".empty-note") as HTMLElement;
  const waitingEl = card.querySelector(".waiting-count") as HTMLElement;

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
function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      // Browser tidak mendukung atau permission ditolak
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
  seedIfEmpty();
  syncDisplay();

  // Polling setiap 2 detik sesuai spesifikasi
  setInterval(syncDisplay, 2000);

  btnFullscreen.addEventListener("click", toggleFullscreen);
}

init();
