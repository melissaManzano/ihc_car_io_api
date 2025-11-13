// =========================
// Config / Catálogo
// =========================
const API_BASE = "http://3.230.98.116:5500/api";
const CATALOGO = {
  1: "Adelante",
  2: "Atrás",
  3: "Detener",
  4: "Vuelta adelante derecha",
  5: "Vuelta adelante izquierda",
  6: "Vuelta atrás derecha",
  7: "Vuelta atrás izquierda",
  8: "Giro 90° derecha",
  9: "Giro 90° izquierda",
  10: "Giro 360° derecha",
  11: "Giro 360° izquierda",
};

// =========================
// Utilidades UI
// =========================
const statusEl = document.getElementById("status");
const tsEl = document.getElementById("timestamp");
const toastEl = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const toast = new bootstrap.Toast(toastEl, { delay: 2000 });

function showToast(msg) {
  toastMsg.textContent = msg;
  toast.show();
}

function setStatus(texto, fecha = null) {
  if (statusEl) statusEl.textContent = (texto || "—").toUpperCase();
  if (tsEl) tsEl.textContent = fecha ? new Date(fecha).toLocaleString() : "";
}

// =========================
// API Movimientos
// =========================
async function postMovimiento(id_movimiento) {
  const res = await fetch(`${API_BASE}/movimientos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_movimiento }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json && json.message ? json.message : `Error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function getUltimoMovimiento() {
  const res = await fetch(`${API_BASE}/movimientos/ultimo`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json && json.message ? json.message : `Error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// /movimientos/ultimos?n=...
async function getMovimientos(n = 20) {
  const res = await fetch(`${API_BASE}/movimientos/ultimos?n=${n}`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json && json.message ? json.message : `Error HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (Array.isArray(json)) return { data: json };
  return json || { data: [] };
}

function renderMovimientos(rows = []) {
  const tbody = document.getElementById("movimientos-body");
  const stamp = document.getElementById("mov-last-update");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="text-center text-muted py-4">Sin registros</td></tr>';
  } else {
    tbody.innerHTML = rows
      .map((r) => {
        const id = r.id ?? r.id_movimiento ?? "";
        const mov = r.movimiento ?? r.descripcion ?? "—";
        const fh = r.fecha_hora
          ? new Date(r.fecha_hora).toLocaleString()
          : "—";
        return `<tr>
          <td><code>${id}</code></td>
          <td>${mov}</td>
          <td>${fh}</td>
        </tr>`;
      })
      .join("");
  }

  if (stamp)
    stamp.textContent = `Actualizado: ${new Date().toLocaleTimeString()}`;
}

// =========================
// Lógica Panel de Control
// =========================
async function enviarMovimiento(idMov) {
  try {
    setStatus(CATALOGO[idMov]);
    await postMovimiento(idMov);
    showToast(`Enviado: ${CATALOGO[idMov]}`);
    await refrescarUltimo();
  } catch (e) {
    showToast(`Error: ${e.message}`);
  }
}

async function refrescarUltimo() {
  try {
    const json = await getUltimoMovimiento();
    const data = Array.isArray(json) ? json[0] : json?.data;
    if (data) {
      setStatus(data.movimiento, data.fecha_hora);
      setStatusVoz(data.movimiento, data.fecha_hora); // sincroniza panel voz
    }
  } catch (e) {
    // silencioso
  }
}

// Botones de control
document.querySelectorAll("[data-mov]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = Number(btn.dataset.mov);
    enviarMovimiento(id);
  });
});

// Atajos de teclado
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "w") enviarMovimiento(1);
  if (k === "s") enviarMovimiento(2);
  if (k === " ") enviarMovimiento(3);
  if (k === "e") enviarMovimiento(4);
  if (k === "q") enviarMovimiento(5);
  if (k === "c") enviarMovimiento(6);
  if (k === "z") enviarMovimiento(7);
  if (k === "d") enviarMovimiento(8);
  if (k === "a") enviarMovimiento(9);
  if (k === "x") enviarMovimiento(10);
  if (k === "y") enviarMovimiento(11);
});

// =========================
// Modal Movimientos auto-refresh
// =========================
let movInterval = null;

async function cargarMovimientos() {
  try {
    const { data } = await getMovimientos(20);
    renderMovimientos(data || []);
  } catch (e) {
    renderMovimientos([]);
    showToast(`Error al cargar movimientos: ${e.message}`);
  }
}

document.addEventListener("shown.bs.modal", (ev) => {
  if (ev.target.id === "movimientosModal") {
    cargarMovimientos();
    movInterval = setInterval(cargarMovimientos, 2000);
  }
});

document.addEventListener("hidden.bs.modal", (ev) => {
  if (ev.target.id === "movimientosModal") {
    if (movInterval) {
      clearInterval(movInterval);
      movInterval = null;
    }
  }
});

// =========================
// Navegación entre secciones
// =========================
const secControl = document.getElementById("panel-control");
const secVoz = document.getElementById("panel-voz");
const btnShowControl = document.getElementById("btnShowControl");
const btnShowVoz = document.getElementById("btnShowVoz");

function showSection(which) {
  if (!secControl || !secVoz) return;
  if (which === "voz") {
    secControl.style.display = "none";
    secVoz.style.display = "";
  } else {
    secVoz.style.display = "none";
    secControl.style.display = "";
  }
}

if (btnShowControl) {
  btnShowControl.addEventListener("click", () => showSection("control"));
}
if (btnShowVoz) {
  btnShowVoz.addEventListener("click", () => showSection("voz"));
}

// =========================
// ---- Panel de Voz ----
// =========================
const COMMANDS = [
  { id: 1, key: "adelante" },
  { id: 2, key: "atrás" },
  { id: 3, key: "detener" },
  { id: 4, key: "vuelta adelante derecha" },
  { id: 5, key: "vuelta adelante izquierda" },
  { id: 6, key: "vuelta atrás derecha" },
  { id: 7, key: "vuelta atrás izquierda" },
  { id: 8, key: "giro 90 derecha" },
  { id: 9, key: "giro 90 izquierda" },
  { id: 10, key: "giro 360 derecha" },
  { id: 11, key: "giro 360 izquierda" },
];

const WAKE_WORD = "tony"; // <-- aquí ya es Tony

// Para simplificar, usaremos solo clasificador local (sin OpenAI) ----------------
const SpeechRec =
  window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let listening = false;

const el = {
  btn: document.getElementById("btnToggle"),
  micState: document.getElementById("micState"),
  lastHeard: document.getElementById("lastHeard"),
  detected: document.getElementById("detected"),
  action: document.getElementById("action"),
};

function normalizeText(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function setMicState(on) {
  listening = on;
  if (!el.micState || !el.btn) return;

  el.micState.textContent = on ? "Mic ON" : "Mic OFF";
  el.micState.classList.toggle("live", on);
  el.micState.classList.toggle("off", !on);
  el.btn.textContent = on ? "🛑 Detener" : "🎙 Iniciar";
  el.btn.disabled = false;
}

// clasificador muy simple
function localClassify(text) {
  const t = normalizeText(text);

  if (/\b(detener|para|alto|stop)\b/.test(t))
    return { id: 3, key: "detener" };
  if (/\b(adelante|avanza|frente)\b/.test(t))
    return { id: 1, key: "adelante" };
  if (/\b(atras|retrocede|reversa|regresa)\b/.test(t))
    return { id: 2, key: "atrás" };

  if (/\b(360|completo|vuelta completa)\b/.test(t) && /\bderech/.test(t))
    return { id: 10, key: "giro 360 derecha" };
  if (/\b(360|completo|vuelta completa)\b/.test(t) && /\bizquier/.test(t))
    return { id: 11, key: "giro 360 izquierda" };

  if (/\b(90|noventa)\b/.test(t) && /\bderech/.test(t))
    return { id: 8, key: "giro 90 derecha" };
  if (/\b(90|noventa)\b/.test(t) && /\bizquier/.test(t))
    return { id: 9, key: "giro 90 izquierda" };

  if (
    /\b(adelante|frente|avanza)\b/.test(t) &&
    /\bderech/.test(t) &&
    /\bvuelta\b/.test(t)
  )
    return { id: 4, key: "vuelta adelante derecha" };
  if (
    /\b(adelante|frente|avanza)\b/.test(t) &&
    /\bizquier/.test(t) &&
    /\bvuelta\b/.test(t)
  )
    return { id: 5, key: "vuelta adelante izquierda" };

  if (
    /\b(atras|reversa|retrocede)\b/.test(t) &&
    /\bderech/.test(t) &&
    /\bvuelta\b/.test(t)
  )
    return { id: 6, key: "vuelta atrás derecha" };
  if (
    /\b(atras|reversa|retrocede)\b/.test(t) &&
    /\bizquier/.test(t) &&
    /\bvuelta\b/.test(t)
  )
    return { id: 7, key: "vuelta atrás izquierda" };

  // por defecto, detener
  return { id: 3, key: "detener" };
}

const speak = (text) => {
  const chk = document.getElementById("chkTTS");
  const enabled = chk ? chk.checked : false;
  if (!enabled) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-MX";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
};

function setStatusVoz(texto, fecha = null) {
  const elText = document.getElementById("status-voz");
  const elTs = document.getElementById("timestamp-voz");
  if (elText) elText.textContent = (texto || "—").toUpperCase();
  if (elTs) elTs.textContent = fecha ? new Date(fecha).toLocaleString() : "";
}

function performAction(id, key) {
  if (el.action) el.action.textContent = `Ejecutando: ${key}`;

  postMovimiento(id)
    .then(() => {
      refrescarUltimo(); // actualiza estatus en ambos paneles
      const modalEl = document.getElementById("movimientosModal");
      const isOpen = modalEl && modalEl.classList.contains("show");
      if (isOpen) cargarMovimientos();
      showToast(`Registrado: ${key}`);
    })
    .catch((err) => {
      showToast(`No se pudo registrar: ${err.message}`);
      console.warn("Error registrando movimiento:", err);
    });

  const confirmations = {
    1: "Avanzando.",
    2: "Retrocediendo.",
    3: "Deteniendo.",
    4: "Adelante con giro a la derecha.",
    5: "Adelante con giro a la izquierda.",
    6: "Atrás con giro a la derecha.",
    7: "Atrás con giro a la izquierda.",
    8: "Giro noventa grados a la derecha.",
    9: "Giro noventa grados a la izquierda.",
    10: "Giro completo a la derecha.",
    11: "Giro completo a la izquierda.",
  };
  speak(confirmations[id] || "Listo.");
}

function initRecognition() {
  if (!SpeechRec) {
    console.warn("Este navegador no soporta Web Speech API.");
    return;
  }

  rec = new SpeechRec();
  rec.lang = "es-MX";
  rec.interimResults = true;
  rec.continuous = true;

  rec.onresult = (e) => {
    const idx = e.resultIndex;
    const transcript = Array.from(e.results)
      .slice(idx)
      .map((r) => r[0].transcript)
      .join(" ")
      .trim();
    if (!transcript) return;

    if (el.lastHeard) el.lastHeard.textContent = transcript;

    const lower = transcript.toLowerCase();
    const wakeIdx = lower.indexOf(WAKE_WORD);
    if (wakeIdx === -1) return;

    const afterWake = transcript.slice(wakeIdx + WAKE_WORD.length).trim();
    if (afterWake.length < 2) return;

    const isFinal = Array.from(e.results).pop().isFinal;
    if (!isFinal) return;

    const result = localClassify(afterWake);
    if (el.detected) el.detected.textContent = `${result.id} — ${result.key}`;
    performAction(result.id, result.key);
  };

  rec.onerror = (ev) => {
    console.warn("Speech error:", ev.error);
    if (el.action)
      el.action.textContent = `Error de micrófono: ${ev.error}`;
    setMicState(false);
  };

  rec.onend = () => {
    if (listening && rec) rec.start();
  };
}

// =========================
// Inicialización
// =========================
showSection("control");
refrescarUltimo();
initRecognition();

if (el.btn) {
  el.btn.addEventListener("click", () => {
    if (!rec) {
      alert("Tu navegador no soporta Web Speech API. Prueba en Chrome.");
      return;
    }
    el.btn.disabled = true;
    if (!listening) {
      try {
        rec.start();
        setMicState(true);
        speak("Listo. Di Tony y tu orden.");
      } catch (e) {
        console.error(e);
        setMicState(false);
      }
    } else {
      try {
        rec.stop();
      } finally {
        setMicState(false);
      }
    }
  });
}
