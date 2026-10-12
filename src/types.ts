// ============================================================
// Tipe data bersama – disepakati seluruh anggota tim
// ============================================================

export interface JenisAntrian {
  id: string;
  kode: string; // 1 huruf kapital, misal "A", "B", "C"
  nama: string; // misal "Poli Umum"
  statusAktif: boolean;
}

export type Prioritas = "Normal" | "Lansia" | "Disabilitas" | "VIP";
export type StatusTiket = "Menunggu" | "Dipanggil" | "Selesai" | "Dilewati";

export interface Tiket {
  nomorTiket: string; // format "A-001"
  jenis: string; // kode jenis antrian, misal "A"
  prioritas: Prioritas;
  status: StatusTiket;
  timestamp: number; // Date.now()
}

// ============================================================
// LocalStorage keys – WAJIB konsisten dengan seluruh halaman
// ============================================================
export const LS_QUEUE_TYPES = "queueTypes";
export const LS_TICKETS = "tickets";
export const LS_SESSION = "currentSession";

// ============================================================
// Helper LocalStorage
// ============================================================

export function getQueueTypes(): JenisAntrian[] {
  try {
    return JSON.parse(localStorage.getItem(LS_QUEUE_TYPES) ?? "[]");
  } catch {
    return [];
  }
}

export function getTickets(): Tiket[] {
  try {
    return JSON.parse(localStorage.getItem(LS_TICKETS) ?? "[]");
  } catch {
    return [];
  }
}

export function saveTickets(tickets: Tiket[]): void {
  localStorage.setItem(LS_TICKETS, JSON.stringify(tickets));
}
