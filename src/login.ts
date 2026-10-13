// ============================================================
// login.ts - Logika Autentikasi Front-End & Role Dispatching
// Disusun oleh: Satya
// Spesifikasi:
// 1. Integrasi API dummyjson.com/auth/login
// 2. Loading state & penanganan error visual (try...catch)
// 3. Penyimpanan sesi ke LocalStorage (token, role, firstName)
// 4. Aturan Role: moderator setara admin
// 5. Auto Redirect: admin/moderator -> index.html, user -> operator.html
// ============================================================

import {
  saveSession,
  getSession,
  clearSession,
  UserSession,
} from "./types";

// ============================================================
// Elemen-elemen DOM
// ============================================================
const form = document.getElementById("login-form") as HTMLFormElement;
const inputUsername = document.getElementById("input-username") as HTMLInputElement;
const inputPassword = document.getElementById("input-password") as HTMLInputElement;
const btnSubmit = document.getElementById("btn-submit") as HTMLButtonElement;
const btnSubmitSpinner = document.getElementById("btn-submit-spinner") as HTMLElement;
const btnSubmitText = document.getElementById("btn-submit-text") as HTMLElement;
const btnTogglePwd = document.getElementById("btn-toggle-password") as HTMLButtonElement;
const errorAlert = document.getElementById("login-error") as HTMLElement;
const errorText = document.getElementById("login-error-text") as HTMLElement;
const successAlert = document.getElementById("login-success") as HTMLElement;
const successText = document.getElementById("login-success-text") as HTMLElement;

// Elemen info sesi yang sudah ada
const alreadyLoggedBox = document.getElementById("already-logged-box") as HTMLElement;
const loggedUsername = document.getElementById("logged-username") as HTMLElement;
const loggedRole = document.getElementById("logged-role") as HTMLElement;
const btnContinueSession = document.getElementById("btn-continue-session") as HTMLAnchorElement;
const btnClearSession = document.getElementById("btn-clear-session") as HTMLButtonElement;

// ============================================================
// Utilitas UI (Alert & Loading State)
// ============================================================

function showError(message: string): void {
  errorText.textContent = message;
  errorAlert.hidden = false;
  successAlert.hidden = true;
}

function clearError(): void {
  errorAlert.hidden = true;
}

function showSuccess(message: string): void {
  successText.textContent = message;
  successAlert.hidden = false;
  errorAlert.hidden = true;
}

function setLoading(isLoading: boolean): void {
  const fillButtons = document.querySelectorAll<HTMLButtonElement>(".btn-fill-account");
  fillButtons.forEach((btn) => {
    btn.disabled = isLoading;
  });

  if (isLoading) {
    btnSubmit.disabled = true;
    inputUsername.disabled = true;
    inputPassword.disabled = true;
    btnSubmitSpinner.hidden = false;
    btnSubmitText.textContent = "Memverifikasi Kredensial...";
    clearError();
  } else {
    btnSubmit.disabled = false;
    inputUsername.disabled = false;
    inputPassword.disabled = false;
    btnSubmitSpinner.hidden = true;
    btnSubmitText.textContent = "Masuk Sekarang";
  }
}

// ============================================================
// Periksa Sesi yang Sudah Login
// ============================================================
function checkExistingSession(): void {
  const session = getSession();
  if (session && session.token) {
    const roleNormalized = (session.role || "").toLowerCase();
    const destination =
      roleNormalized === "admin" || roleNormalized === "moderator"
        ? "index.html"
        : "operator.html";

    // Tampilkan banner bahwa sesi masih aktif
    if (alreadyLoggedBox && loggedUsername && loggedRole) {
      loggedUsername.textContent = session.firstName || session.username || "Pengguna";
      loggedRole.textContent = roleNormalized.toUpperCase();
      btnContinueSession.href = destination;
      btnContinueSession.textContent = `Lanjut ke ${
        roleNormalized === "admin" || roleNormalized === "moderator"
          ? "Dashboard Admin"
          : "Panel Operator"
      }`;
      alreadyLoggedBox.hidden = false;
    }
  }
}

// ============================================================
// Mengambil Role Pengguna dari dummyjson
// ============================================================
async function resolveUserRole(
  loginData: any,
  rawUsername: string
): Promise<string> {
  // 1. Cek langsung dari payload loginData jika server menyediakannya
  if (loginData.role) {
    return String(loginData.role).toLowerCase();
  }

  // 2. Cek melalui endpoint /auth/me menggunakan token
  if (loginData.accessToken) {
    try {
      const meRes = await fetch("https://dummyjson.com/auth/me", {
        headers: {
          Authorization: `Bearer ${loginData.accessToken}`,
        },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.role) {
          return String(meData.role).toLowerCase();
        }
      }
    } catch {
      // Lanjut ke fallback berikutnya
    }
  }

  // 3. Cek melalui endpoint detail user berdasarkan id
  if (loginData.id) {
    try {
      const userRes = await fetch(`https://dummyjson.com/users/${loginData.id}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.role) {
          return String(userData.role).toLowerCase();
        }
      }
    } catch {
      // Lanjut ke fallback berikutnya
    }
  }

  // 4. Fallback berbasis data uji dummyjson standar
  const u = rawUsername.toLowerCase().trim();
  if (u === "emilys") return "admin";
  if (u === "oliviaw") return "moderator";
  return "user";
}

// ============================================================
// Proses Autentikasi Utama
// ============================================================
async function handleLogin(e: Event): Promise<void> {
  e.preventDefault();

  const username = inputUsername.value.trim();
  const password = inputPassword.value;

  if (!username) {
    showError("Silakan masukkan username Anda.");
    inputUsername.focus();
    return;
  }

  if (!password) {
    showError("Silakan masukkan password Anda.");
    inputPassword.focus();
    return;
  }

  setLoading(true);

  try {
    // 1. Kirim HTTP POST request ke dummyjson
    const response = await fetch("https://dummyjson.com/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        expiresInMins: 60,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        "Username atau password salah. Silakan periksa kembali.";
      throw new Error(errorMsg);
    }

    // 2. Ambil token & role pengguna
    const token = data.accessToken || data.token;
    if (!token) {
      throw new Error("Token autentikasi tidak ditemukan pada respons server.");
    }

    const role = await resolveUserRole(data, username);

    // 3. Simpan data sesi ke LocalStorage sesuai arsitektur data
    const session: UserSession = {
      token,
      role, // "admin" | "moderator" | "user"
      firstName: data.firstName || data.username || username,
      username: data.username || username,
      id: data.id,
      image: data.image,
    };
    saveSession(session);

    // 4. Feedback visual sukses
    showSuccess(
      `Login berhasil! Selamat datang, ${session.firstName}. Mengalihkan...`
    );

    // 5. Aturan Hak Akses & Auto Redirect Berdasarkan Role:
    // Moderator diperlakukan setara dengan Admin -> ke index.html
    // User biasa -> ke operator.html
    const targetUrl =
      role === "admin" || role === "moderator"
        ? "index.html"
        : "operator.html";

    setTimeout(() => {
      window.location.replace(targetUrl);
    }, 600);
  } catch (error: any) {
    setLoading(false);
    console.error("Kesalahan saat autentikasi:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      showError(
        "Gagal terhubung ke server autentikasi. Pastikan koneksi internet Anda aktif."
      );
    } else {
      showError(
        error?.message || "Terjadi kesalahan saat masuk. Silakan coba lagi."
      );
    }
  }
}

// ============================================================
// Event Listeners & Inisialisasi
// ============================================================
function init(): void {
  // Cek apakah ada sesi aktif sebelumnya
  checkExistingSession();

  // Submit form login
  form.addEventListener("submit", handleLogin);

  // Bersihkan error jika pengguna mengetik ulang
  inputUsername.addEventListener("input", clearError);
  inputPassword.addEventListener("input", clearError);

  // Toggle tampilkan password
  btnTogglePwd.addEventListener("click", () => {
    const isPassword = inputPassword.type === "password";
    inputPassword.type = isPassword ? "text" : "password";
    btnTogglePwd.setAttribute(
      "aria-label",
      isPassword ? "Sembunyikan password" : "Lihat password"
    );
    btnTogglePwd.innerHTML = isPassword
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
  });

  // Tombol Quick Fill Akun Uji
  const fillButtons = document.querySelectorAll<HTMLButtonElement>(".btn-fill-account");
  fillButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const user = btn.dataset.user ?? "";
      const pass = btn.dataset.pass ?? "";
      inputUsername.value = user;
      inputPassword.value = pass;
      clearError();
      inputPassword.focus();
    });
  });

  // Tombol Ganti Akun / Hapus Sesi
  if (btnClearSession) {
    btnClearSession.addEventListener("click", () => {
      clearSession();
      if (alreadyLoggedBox) alreadyLoggedBox.hidden = true;
      inputUsername.value = "";
      inputPassword.value = "";
      inputUsername.focus();
    });
  }
}

// Inisialisasi saat DOM siap
init();
