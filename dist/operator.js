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
  function getQueueTypes() {
    var _a;
    try {
      return JSON.parse((_a = localStorage.getItem(LS_QUEUE_TYPES)) != null ? _a : "[]");
    } catch (e) {
      return [];
    }
  }
  function getTickets() {
    var _a;
    try {
      return JSON.parse((_a = localStorage.getItem(LS_TICKETS)) != null ? _a : "[]");
    } catch (e) {
      return [];
    }
  }
  function saveTickets(tickets) {
    localStorage.setItem(LS_TICKETS, JSON.stringify(tickets));
  }
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
  function clearSession() {
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    localStorage.removeItem("username");
  }
  function sortTicketsByPriority(tickets) {
    return [...tickets].sort((a, b) => {
      var _a, _b;
      const rankA = (_a = PRIORITY_RANKS[a.prioritas]) != null ? _a : 99;
      const rankB = (_b = PRIORITY_RANKS[b.prioritas]) != null ? _b : 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.timestamp - b.timestamp;
    });
  }
  var LS_QUEUE_TYPES, LS_TICKETS, LS_SESSION, PRIORITY_RANKS;
  var init_types = __esm({
    "src/types.ts"() {
      "use strict";
      LS_QUEUE_TYPES = "queueTypes";
      LS_TICKETS = "tickets";
      LS_SESSION = "currentSession";
      PRIORITY_RANKS = {
        VIP: 1,
        Disabilitas: 2,
        Lansia: 3,
        Normal: 4
      };
    }
  });

  // src/audio.ts
  function isAudioEnabled() {
    const val = localStorage.getItem(LS_AUDIO_ENABLED);
    return val === null ? true : val === "true";
  }
  function setAudioEnabled(enabled) {
    localStorage.setItem(LS_AUDIO_ENABLED, String(enabled));
  }
  function playHospitalChime() {
    return new Promise((resolve) => {
      if (!isAudioEnabled()) {
        resolve();
        return;
      }
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          resolve();
          return;
        }
        const ctx = new AudioContextClass();
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        const notes = [
          { freq: 523.25, start: 0, duration: 0.35 },
          { freq: 659.25, start: 0.28, duration: 0.35 },
          { freq: 783.99, start: 0.56, duration: 0.65 }
        ];
        const now = ctx.currentTime;
        notes.forEach(({ freq, start, duration }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + start);
          gain.gain.setValueAtTime(1e-3, now + start);
          gain.gain.exponentialRampToValueAtTime(0.3, now + start + 0.03);
          gain.gain.exponentialRampToValueAtTime(1e-4, now + start + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + start);
          osc.stop(now + start + duration);
        });
        setTimeout(() => {
          try {
            ctx.close();
          } catch (e) {
          }
          resolve();
        }, 1200);
      } catch (e) {
        console.warn("Gagal memainkan nada chime:", e);
        resolve();
      }
    });
  }
  function formatTicketSpelling(nomorTiket) {
    var _a, _b;
    const parts = nomorTiket.split("-");
    const kode = (_a = parts[0]) != null ? _a : "";
    const angkaRaw = (_b = parts[1]) != null ? _b : "";
    const digitMap = {
      "0": "nol",
      "1": "satu",
      "2": "dua",
      "3": "tiga",
      "4": "empat",
      "5": "lima",
      "6": "enam",
      "7": "tujuh",
      "8": "delapan",
      "9": "sembilan"
    };
    const angkaSpelled = angkaRaw.split("").map((d) => {
      var _a2;
      return (_a2 = digitMap[d]) != null ? _a2 : d;
    }).join(" ");
    return { kode, angka: angkaSpelled };
  }
  async function announceTicket(nomorTiket, namaLayanan, onStart, onEnd) {
    if (!isAudioEnabled()) {
      return;
    }
    await playHospitalChime();
    if (!("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const { kode, angka } = formatTicketSpelling(nomorTiket);
    const text = `Nomor antrian, ${kode}, ${angka}, silakan menuju ke ${namaLayanan}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
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
  var LS_AUDIO_ENABLED;
  var init_audio = __esm({
    "src/audio.ts"() {
      "use strict";
      LS_AUDIO_ENABLED = "operator_sound_enabled";
    }
  });

  // src/operator.ts
  var require_operator = __commonJS({
    "src/operator.ts"() {
      init_types();
      init_audio();
      function enforceAuthGuard() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("demo") === "1" || urlParams.get("dev") === "1") {
          if (!getSession()) {
            localStorage.setItem(
              "currentSession",
              JSON.stringify({
                token: "demo-token-12345",
                role: "operator",
                firstName: "Evan",
                username: "evan_operator"
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
      if (!enforceAuthGuard()) {
        throw new Error("Akses ditolak: Silakan login terlebih dahulu.");
      }
      function seedIfEmpty() {
        if (getQueueTypes().length === 0) {
          const demoServices = [
            { id: "1", kode: "A", nama: "Poli Umum", statusAktif: true },
            { id: "2", kode: "B", nama: "Poli Gigi", statusAktif: true },
            { id: "3", kode: "C", nama: "Farmasi", statusAktif: true }
          ];
          localStorage.setItem(LS_QUEUE_TYPES, JSON.stringify(demoServices));
        }
      }
      var userNameEl = document.getElementById("user-name");
      var userRoleEl = document.getElementById("user-role");
      var btnLogout = document.getElementById("btn-logout");
      var serviceFilterSelect = document.getElementById(
        "service-filter"
      );
      var activeServingStatus = document.getElementById(
        "active-serving-status"
      );
      var activeTicketNum = document.getElementById(
        "active-ticket-num"
      );
      var activeTicketService = document.getElementById(
        "active-ticket-service"
      );
      var activeTicketBadges = document.getElementById(
        "active-ticket-badges"
      );
      var activeTicketMeta = document.getElementById(
        "active-ticket-meta"
      );
      var btnCallNext = document.getElementById(
        "btn-call-next"
      );
      var btnRecall = document.getElementById("btn-recall");
      var btnSkip = document.getElementById("btn-skip");
      var btnSkipMark = document.getElementById("btn-skip-mark");
      var btnFinish = document.getElementById("btn-finish");
      var audioToggle = document.getElementById("audio-toggle");
      var btnTestAudio = document.getElementById(
        "btn-test-audio"
      );
      var speakingIndicator = document.getElementById(
        "speaking-indicator"
      );
      var tabWaitingBtn = document.getElementById("tab-waiting");
      var tabSkippedBtn = document.getElementById("tab-skipped");
      var tabFinishedBtn = document.getElementById("tab-finished");
      var countWaitingEl = document.getElementById("count-waiting");
      var countSkippedEl = document.getElementById("count-skipped");
      var countFinishedEl = document.getElementById("count-finished");
      var queueContainer = document.getElementById(
        "queue-container"
      );
      var emptyQueueState = document.getElementById(
        "empty-queue-state"
      );
      var statWaiting = document.getElementById("stat-waiting");
      var statActive = document.getElementById("stat-active");
      var statFinished = document.getElementById("stat-finished");
      var statSkipped = document.getElementById("stat-skipped");
      var btnSeedDemoTickets = document.getElementById(
        "btn-seed-demo-tickets"
      );
      var activeTab = "waiting";
      var selectedServiceCode = "ALL";
      function getServiceName(kode) {
        const service = getQueueTypes().find((s) => s.kode === kode);
        return service ? service.nama : `Layanan ${kode}`;
      }
      function getActiveCalledTicket() {
        const tickets = getTickets();
        const called = tickets.filter(
          (t) => t.status === "Dipanggil" && (selectedServiceCode === "ALL" || t.jenis === selectedServiceCode)
        );
        if (called.length === 0) return void 0;
        called.sort((a, b) => b.timestamp - a.timestamp);
        return called[0];
      }
      function showToast(message, type = "info") {
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
      function triggerCallAnnouncement(nomorTiket, namaLayanan) {
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
      function handleCallNext() {
        const tickets = getTickets();
        const currentActive = getActiveCalledTicket();
        if (currentActive) {
          const activeIdx = tickets.findIndex(
            (t) => t.nomorTiket === currentActive.nomorTiket
          );
          if (activeIdx !== -1) {
            tickets[activeIdx].status = "Selesai";
          }
        }
        const waitingTickets = tickets.filter(
          (t) => t.status === "Menunggu" && (selectedServiceCode === "ALL" || t.jenis === selectedServiceCode)
        );
        const sortedWaiting = sortTicketsByPriority(waitingTickets);
        if (sortedWaiting.length === 0) {
          saveTickets(tickets);
          render();
          showToast("Tidak ada tiket antrian yang sedang menunggu.", "warning");
          return;
        }
        const nextTicket = sortedWaiting[0];
        const nextIdx = tickets.findIndex(
          (t) => t.nomorTiket === nextTicket.nomorTiket
        );
        if (nextIdx !== -1) {
          tickets[nextIdx].status = "Dipanggil";
          tickets[nextIdx].timestamp = Date.now();
        }
        saveTickets(tickets);
        render();
        const serviceName = getServiceName(nextTicket.jenis);
        triggerCallAnnouncement(nextTicket.nomorTiket, serviceName);
        showToast(`Memanggil nomor ${nextTicket.nomorTiket} (${nextTicket.prioritas})`, "success");
      }
      function handleRecall() {
        const currentActive = getActiveCalledTicket();
        if (!currentActive) {
          showToast("Tidak ada tiket yang sedang dipanggil saat ini.", "warning");
          return;
        }
        const serviceName = getServiceName(currentActive.jenis);
        triggerCallAnnouncement(currentActive.nomorTiket, serviceName);
        showToast(`Memanggil ulang nomor ${currentActive.nomorTiket}`, "info");
      }
      function handleSkipToBack() {
        const tickets = getTickets();
        const currentActive = getActiveCalledTicket();
        if (!currentActive) {
          showToast("Tidak ada tiket yang sedang dipanggil untuk dilewati.", "warning");
          return;
        }
        const idx = tickets.findIndex((t) => t.nomorTiket === currentActive.nomorTiket);
        if (idx !== -1) {
          tickets[idx].status = "Menunggu";
          tickets[idx].timestamp = Date.now();
          saveTickets(tickets);
          render();
          showToast(`Tiket ${currentActive.nomorTiket} dipindahkan ke akhir antrian.`, "warning");
        }
      }
      function handleMarkSkipped() {
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
      function handleFinish() {
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
      function handleCallSpecificTicket(nomorTiket) {
        const tickets = getTickets();
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
      function handleReturnToQueue(nomorTiket) {
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
      function renderActiveTicket() {
        const current = getActiveCalledTicket();
        if (!current) {
          activeServingStatus.innerHTML = `
      <span class="status-idle">
        <span class="idle-dot"></span> Siap Memanggil
      </span>
    `;
          activeTicketNum.textContent = "---";
          activeTicketNum.classList.add("empty");
          activeTicketService.textContent = selectedServiceCode === "ALL" ? "Semua Layanan Antrian" : getServiceName(selectedServiceCode);
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
          second: "2-digit"
        });
        activeTicketMeta.textContent = `Dipanggil pukul ${callTime}`;
        btnRecall.disabled = false;
        btnSkip.disabled = false;
        btnSkipMark.disabled = false;
        btnFinish.disabled = false;
      }
      function renderStats() {
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
      function renderQueueList() {
        queueContainer.innerHTML = "";
        const tickets = getTickets();
        const filtered = tickets.filter(
          (t) => selectedServiceCode === "ALL" || t.jenis === selectedServiceCode
        );
        let targetList = [];
        if (activeTab === "waiting") {
          const waiting = filtered.filter((t) => t.status === "Menunggu");
          targetList = sortTicketsByPriority(waiting);
        } else if (activeTab === "skipped") {
          targetList = filtered.filter((t) => t.status === "Dilewati");
        } else if (activeTab === "finished") {
          targetList = filtered.filter((t) => t.status === "Selesai").sort((a, b) => b.timestamp - a.timestamp);
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
            minute: "2-digit"
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
          const btnCall = li.querySelector('[data-action="call"]');
          if (btnCall) {
            btnCall.addEventListener("click", () => {
              handleCallSpecificTicket(ticket.nomorTiket);
            });
          }
          const btnReturn = li.querySelector('[data-action="return"]');
          if (btnReturn) {
            btnReturn.addEventListener("click", () => {
              handleReturnToQueue(ticket.nomorTiket);
            });
          }
          queueContainer.appendChild(li);
        });
      }
      function render() {
        renderActiveTicket();
        renderStats();
        renderQueueList();
      }
      function syncServiceOptions() {
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
      function seedDemoTickets() {
        const existing = getTickets();
        const now = Date.now();
        const demoList = [
          { nomorTiket: "A-001", jenis: "A", prioritas: "Normal", status: "Menunggu", timestamp: now - 5e4 },
          { nomorTiket: "A-002", jenis: "A", prioritas: "VIP", status: "Menunggu", timestamp: now - 4e4 },
          { nomorTiket: "A-003", jenis: "A", prioritas: "Lansia", status: "Menunggu", timestamp: now - 3e4 },
          { nomorTiket: "B-001", jenis: "B", prioritas: "Disabilitas", status: "Menunggu", timestamp: now - 2e4 },
          { nomorTiket: "A-004", jenis: "A", prioritas: "VIP", status: "Menunggu", timestamp: now - 1e4 }
        ];
        const merged = [...existing, ...demoList];
        saveTickets(merged);
        render();
        showToast("5 tiket uji prioritas berhasil ditambahkan!", "success");
      }
      function init() {
        seedIfEmpty();
        const session = getSession();
        if (session) {
          userNameEl.textContent = session.firstName || session.username || "Operator";
          userRoleEl.textContent = (session.role || "Operator").toUpperCase();
        }
        btnLogout.addEventListener("click", () => {
          clearSession();
          window.location.replace("login.html");
        });
        syncServiceOptions();
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
        btnCallNext.addEventListener("click", handleCallNext);
        btnRecall.addEventListener("click", handleRecall);
        btnSkip.addEventListener("click", handleSkipToBack);
        btnSkipMark.addEventListener("click", handleMarkSkipped);
        btnFinish.addEventListener("click", handleFinish);
        serviceFilterSelect.addEventListener("change", () => {
          selectedServiceCode = serviceFilterSelect.value;
          render();
        });
        const setTab = (tab) => {
          activeTab = tab;
          tabWaitingBtn.classList.toggle("active", tab === "waiting");
          tabSkippedBtn.classList.toggle("active", tab === "skipped");
          tabFinishedBtn.classList.toggle("active", tab === "finished");
          renderQueueList();
        };
        tabWaitingBtn.addEventListener("click", () => setTab("waiting"));
        tabSkippedBtn.addEventListener("click", () => setTab("skipped"));
        tabFinishedBtn.addEventListener("click", () => setTab("finished"));
        if (btnSeedDemoTickets) {
          btnSeedDemoTickets.addEventListener("click", seedDemoTickets);
        }
        setInterval(() => {
          render();
          syncServiceOptions();
        }, 2e3);
        window.addEventListener("storage", (e) => {
          if (e.key === LS_TICKETS || e.key === LS_QUEUE_TYPES) {
            render();
            syncServiceOptions();
          }
        });
        render();
      }
      init();
    }
  });
  require_operator();
})();
