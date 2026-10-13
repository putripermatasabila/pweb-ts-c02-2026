import {
  getQueueTypes,
  getTickets,
  saveTickets,
  JenisAntrian,
  Tiket,
  Prioritas,
  LS_QUEUE_TYPES,
} from "./types";

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

// ============================================================
// Generate nomor tiket berikutnya
// Format: {kode}-{nomor 3 digit}, misal "A-001"
// ============================================================
function nextTicketNumber(kode: string): string {
  const tickets = getTickets();
  const existing = tickets.filter((t) => t.jenis === kode);
  const next = existing.length + 1;
  return `${kode}-${String(next).padStart(3, "0")}`;
}

// ============================================================
// Hitung tiket menunggu untuk jenis tertentu
// ============================================================
function waitingCount(kode: string): number {
  return getTickets().filter(
    (t) => t.jenis === kode && t.status === "Menunggu"
  ).length;
}

// ============================================================
// Buat tiket baru dan simpan ke LocalStorage
// ============================================================
function createTicket(jenis: JenisAntrian, prioritas: Prioritas): Tiket {
  const tiket: Tiket = {
    nomorTiket: nextTicketNumber(jenis.kode),
    jenis: jenis.kode,
    prioritas,
    status: "Menunggu",
    timestamp: Date.now(),
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
  const count = waitingCount(tiket.jenis);
  ticketWaiting.textContent =
    count > 0 ? `${count} orang menunggu di depan kamu` : "Kamu yang pertama!";
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

  // Pasang event handler untuk semua tombol ambil nomor
  card.querySelectorAll<HTMLButtonElement>(".btn-take").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prioritas = (btn.dataset.priority ?? "Normal") as Prioritas;
      const tiket = createTicket(jenis, prioritas);
      showTicketDialog(tiket, jenis.nama);
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
  seedIfEmpty();
  render();

  // Polling setiap 3 detik agar sinkron dengan perubahan dari halaman lain
  setInterval(render, 3000);

  // Sinkronisasi instan via event storage
  window.addEventListener("storage", (e) => {
    if (e.key === LS_QUEUE_TYPES) {
      render();
    }
  });

  // Tombol tutup dialog
  ticketClose.addEventListener("click", () => {
    dialog.close();
  });

  // Tutup dialog jika klik di luar area dialog
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

init();
