// ============================================================
// audio.ts - Efek Suara Panggilan & Text-to-Speech (TTS)
// Disusun oleh: Evan (Fitur Nilai Tambah / Bonus Nilai)
// Wajib Native: Menggunakan Web Audio API & Web Speech API murni
// ============================================================

const LS_AUDIO_ENABLED = "operator_sound_enabled";

// Cek apakah suara diaktifkan (default: aktif)
export function isAudioEnabled(): boolean {
  const val = localStorage.getItem(LS_AUDIO_ENABLED);
  return val === null ? true : val === "true";
}

// Simpan preferensi suara
export function setAudioEnabled(enabled: boolean): void {
  localStorage.setItem(LS_AUDIO_ENABLED, String(enabled));
}

// ============================================================
// 1. Web Audio API - Lonceng Panggilan Rumah Sakit (Chime)
// Menghasilkan nada 3-tone chime (C5 -> E5 -> G5) kristal & jernih
// ============================================================
export function playHospitalChime(): Promise<void> {
  return new Promise((resolve) => {
    if (!isAudioEnabled()) {
      resolve();
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        resolve();
        return;
      }

      const ctx = new AudioContextClass();
      // Resume jika AudioContext suspended karena autoplay policy
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Frekuensi nada nada C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
      const notes = [
        { freq: 523.25, start: 0.0, duration: 0.35 },
        { freq: 659.25, start: 0.28, duration: 0.35 },
        { freq: 783.99, start: 0.56, duration: 0.65 },
      ];

      const now = ctx.currentTime;

      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);

        // Exponential decay untuk efek lonceng alami
        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.3, now + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      });

      // Selesai setelah seluruh rangkaian nada selesai
      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // Abaikan jika sudah tertutup
        }
        resolve();
      }, 1200);
    } catch (e) {
      console.warn("Gagal memainkan nada chime:", e);
      resolve();
    }
  });
}

// ============================================================
// 2. Format Penyebutan Nomor Tiket dalam Bahasa Indonesia
// Contoh: "A-001" -> huruf "A", "nol nol satu"
// ============================================================
function formatTicketSpelling(nomorTiket: string): { kode: string; angka: string } {
  const parts = nomorTiket.split("-");
  const kode = parts[0] ?? "";
  const angkaRaw = parts[1] ?? "";

  const digitMap: Record<string, string> = {
    "0": "nol",
    "1": "satu",
    "2": "dua",
    "3": "tiga",
    "4": "empat",
    "5": "lima",
    "6": "enam",
    "7": "tujuh",
    "8": "delapan",
    "9": "sembilan",
  };

  const angkaSpelled = angkaRaw
    .split("")
    .map((d) => digitMap[d] ?? d)
    .join(" ");

  return { kode, angka: angkaSpelled };
}

// ============================================================
// 3. Web Speech API - Text-to-Speech (TTS) Panggilan Antrian
// ============================================================
export async function announceTicket(
  nomorTiket: string,
  namaLayanan: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  if (!isAudioEnabled()) {
    return;
  }

  // Mainkan lonceng terlebih dahulu
  await playHospitalChime();

  if (!("speechSynthesis" in window)) {
    return;
  }

  // Batalkan ujaran sebelumnya jika masih berbicara
  window.speechSynthesis.cancel();

  const { kode, angka } = formatTicketSpelling(nomorTiket);
  const text = `Nomor antrian, ${kode}, ${angka}, silakan menuju ke ${namaLayanan}.`;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  utterance.rate = 0.88; // Tempo pengucapan tenang & jelas
  utterance.pitch = 1.05;

  // Cari suara Bahasa Indonesia yang tersedia di browser jika ada
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(
    (v) => v.lang.toLowerCase().includes("id") || v.lang.toLowerCase().includes("ind")
  );
  if (idVoice) {
    utterance.voice = idVoice;
  }

  if (onStart) utterance.onstart = () => onStart();
  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);
}

