"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/types.ts
  function getSession() {
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (raw) {
        return JSON.parse(raw);
      }
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      const role = localStorage.getItem("role");
      const firstName = localStorage.getItem("firstName") || localStorage.getItem("username");
      if (token && role) {
        return { token, role, firstName: firstName != null ? firstName : "" };
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function saveSession(session) {
    localStorage.setItem(LS_SESSION, JSON.stringify(session));
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
  function clearSession() {
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    localStorage.removeItem("username");
  }
  var LS_SESSION;
  var init_types = __esm({
    "src/types.ts"() {
      "use strict";
      LS_SESSION = "currentSession";
    }
  });

  // src/login.ts
  var require_login = __commonJS({
    "src/login.ts"() {
      init_types();
      var form = document.getElementById("login-form");
      var inputUsername = document.getElementById("input-username");
      var inputPassword = document.getElementById("input-password");
      var btnSubmit = document.getElementById("btn-submit");
      var btnSubmitSpinner = document.getElementById("btn-submit-spinner");
      var btnSubmitText = document.getElementById("btn-submit-text");
      var btnTogglePwd = document.getElementById("btn-toggle-password");
      var errorAlert = document.getElementById("login-error");
      var errorText = document.getElementById("login-error-text");
      var successAlert = document.getElementById("login-success");
      var successText = document.getElementById("login-success-text");
      var alreadyLoggedBox = document.getElementById("already-logged-box");
      var loggedUsername = document.getElementById("logged-username");
      var loggedRole = document.getElementById("logged-role");
      var btnContinueSession = document.getElementById("btn-continue-session");
      var btnClearSession = document.getElementById("btn-clear-session");
      function showError(message) {
        errorText.textContent = message;
        errorAlert.hidden = false;
        successAlert.hidden = true;
      }
      function clearError() {
        errorAlert.hidden = true;
      }
      function showSuccess(message) {
        successText.textContent = message;
        successAlert.hidden = false;
        errorAlert.hidden = true;
      }
      function setLoading(isLoading) {
        const fillButtons = document.querySelectorAll(".btn-fill-account");
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
      function checkExistingSession() {
        const session = getSession();
        if (session && session.token) {
          const roleNormalized = (session.role || "").toLowerCase();
          const destination = roleNormalized === "admin" || roleNormalized === "moderator" ? "index.html" : "operator.html";
          if (alreadyLoggedBox && loggedUsername && loggedRole) {
            loggedUsername.textContent = session.firstName || session.username || "Pengguna";
            loggedRole.textContent = roleNormalized.toUpperCase();
            btnContinueSession.href = destination;
            btnContinueSession.textContent = `Lanjut ke ${roleNormalized === "admin" || roleNormalized === "moderator" ? "Dashboard Admin" : "Panel Operator"}`;
            alreadyLoggedBox.hidden = false;
          }
        }
      }
      async function resolveUserRole(loginData, rawUsername) {
        if (loginData.role) {
          return String(loginData.role).toLowerCase();
        }
        if (loginData.accessToken) {
          try {
            const meRes = await fetch("https://dummyjson.com/auth/me", {
              headers: {
                Authorization: `Bearer ${loginData.accessToken}`
              }
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.role) {
                return String(meData.role).toLowerCase();
              }
            }
          } catch (e) {
          }
        }
        if (loginData.id) {
          try {
            const userRes = await fetch(`https://dummyjson.com/users/${loginData.id}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.role) {
                return String(userData.role).toLowerCase();
              }
            }
          } catch (e) {
          }
        }
        const u = rawUsername.toLowerCase().trim();
        if (u === "emilys") return "admin";
        if (u === "oliviaw") return "moderator";
        return "user";
      }
      async function handleLogin(e) {
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
          const response = await fetch("https://dummyjson.com/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              username,
              password,
              expiresInMins: 60
            })
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            const errorMsg = (data == null ? void 0 : data.message) || "Username atau password salah. Silakan periksa kembali.";
            throw new Error(errorMsg);
          }
          const token = data.accessToken || data.token;
          if (!token) {
            throw new Error("Token autentikasi tidak ditemukan pada respons server.");
          }
          const role = await resolveUserRole(data, username);
          const session = {
            token,
            role,
            // "admin" | "moderator" | "user"
            firstName: data.firstName || data.username || username,
            username: data.username || username,
            id: data.id,
            image: data.image
          };
          saveSession(session);
          showSuccess(
            `Login berhasil! Selamat datang, ${session.firstName}. Mengalihkan...`
          );
          const targetUrl = role === "admin" || role === "moderator" ? "index.html" : "operator.html";
          setTimeout(() => {
            window.location.replace(targetUrl);
          }, 600);
        } catch (error) {
          setLoading(false);
          console.error("Kesalahan saat autentikasi:", error);
          if (error instanceof TypeError && error.message.includes("fetch")) {
            showError(
              "Gagal terhubung ke server autentikasi. Pastikan koneksi internet Anda aktif."
            );
          } else {
            showError(
              (error == null ? void 0 : error.message) || "Terjadi kesalahan saat masuk. Silakan coba lagi."
            );
          }
        }
      }
      function init() {
        checkExistingSession();
        form.addEventListener("submit", handleLogin);
        inputUsername.addEventListener("input", clearError);
        inputPassword.addEventListener("input", clearError);
        btnTogglePwd.addEventListener("click", () => {
          const isPassword = inputPassword.type === "password";
          inputPassword.type = isPassword ? "text" : "password";
          btnTogglePwd.setAttribute(
            "aria-label",
            isPassword ? "Sembunyikan password" : "Lihat password"
          );
          btnTogglePwd.innerHTML = isPassword ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
        });
        const fillButtons = document.querySelectorAll(".btn-fill-account");
        fillButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            var _a, _b;
            const user = (_a = btn.dataset.user) != null ? _a : "";
            const pass = (_b = btn.dataset.pass) != null ? _b : "";
            inputUsername.value = user;
            inputPassword.value = pass;
            clearError();
            inputPassword.focus();
          });
        });
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
      init();
    }
  });
  require_login();
})();
