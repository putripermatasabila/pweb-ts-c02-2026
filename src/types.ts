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
  namaPengambil?: string; // Nama user yang login dan mengambil tiket
  userId?: number | string; // ID user dari session
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

export function saveQueueTypes(queueTypes: JenisAntrian[]): void {
  localStorage.setItem(LS_QUEUE_TYPES, JSON.stringify(queueTypes));
}

// ============================================================
// Sesi Pengguna & Auth Guard Helper
// ============================================================

export interface UserSession {
  token: string;
  role: string; // "admin" | "moderator" | "user" | dll
  firstName?: string;
  username?: string;
  [key: string]: any;
}

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (raw) {
      return JSON.parse(raw);
    }
    // Fallback: periksa key alternatif jika disimpan terpisah
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
    const role = localStorage.getItem("role");
    const firstName = localStorage.getItem("firstName") || localStorage.getItem("username");
    if (token && role) {
      return { token, role, firstName: firstName ?? "" };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: UserSession): void {
  localStorage.setItem(LS_SESSION, JSON.stringify(session));
  // Sinkronkan key individual agar kompatibel dengan skrip inline & halaman lain
  if (session.token) {
    localStorage.setItem("token", session.token);
    localStorage.setItem("accessToken", session.token);
  }
  if (session.role) {
    localStorage.setItem("role", session.role);
  }
  if (session.firstName) {
    localStorage.setItem("firstName", session.firstName);
  }
  if (session.username) {
    localStorage.setItem("username", session.username);
  }
}

export function clearSession(): void {
  localStorage.removeItem(LS_SESSION);
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("role");
  localStorage.removeItem("firstName");
  localStorage.removeItem("username");
}

// ============================================================
// Algoritma Antrian Prioritas
// Tingkatan: VIP (1) > Disabilitas (2) > Lansia (3) > Normal (4)
// Dalam prioritas sama: Urutan kedatangan (timestamp terlama duluan - FIFO)
// ============================================================

export const PRIORITY_RANKS: Record<Prioritas, number> = {
  VIP: 1,
  Disabilitas: 2,
  Lansia: 3,
  Normal: 4,
};

export function sortTicketsByPriority(tickets: Tiket[]): Tiket[] {
  return [...tickets].sort((a, b) => {
    const rankA = PRIORITY_RANKS[a.prioritas] ?? 99;
    const rankB = PRIORITY_RANKS[b.prioritas] ?? 99;
    if (rankA !== rankB) {
      return rankA - rankB; // Nilai rank lebih kecil = prioritas lebih tinggi
    }
    // Prioritas sama: urutan kedatangan (timestamp terkecil / lebih awal duluan)
    return a.timestamp - b.timestamp;
  });
}

// ============================================================
// Helper Generator Nomor Tiket Konsisten
// Format: {KODE}-{001}, misal A-001, B-001
// Robust terhadap tiket yang dihapus atau antrian yang direset
// ============================================================
export function getNextTicketNumber(kode: string, tickets: Tiket[] = getTickets()): string {
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

