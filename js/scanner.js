const resultadoEl = document.getElementById("resultado");
const errorEl = document.getElementById("errorBox");
const errorTextoEl = document.getElementById("errorTexto");
const btnReintentar = document.getElementById("btnReintentar");
const estadoEl = document.getElementById("estadoLectura");
let escanerActivo = true;
let ultimoIdEscaneado = null;

// Tiempo máximo de espera por la respuesta del servidor antes de avisar
// que se está tardando (Apps Script puede tardar varios segundos, sobre
// todo si varios invitados escanean casi al mismo tiempo en la entrada).
const TIMEOUT_MS = 12000;

const html5QrCode = new Html5Qrcode("lector");

// fps más bajo = menos carga de CPU/batería mientras la cámara está activa,
// para no competir tanto con la petición de red en celulares más lentos.
html5QrCode.start(
  { facingMode: "environment" },
  { fps: 8, qrbox: { width: 240, height: 240 } },
  alEscanear
).catch(err => {
  estadoEl.textContent = "No se pudo acceder a la cámara. Revisa los permisos del navegador.";
});

function alEscanear(textoDecodificado) {
  if (!escanerActivo) return;
  escanerActivo = false;
  ultimoIdEscaneado = textoDecodificado.trim();
  estadoEl.textContent = "Código detectado, buscando...";
  html5QrCode.pause(true);
  buscarInvitado(ultimoIdEscaneado);
}

function fetchConTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function buscarInvitado(id) {
  resultadoEl.classList.remove("activo");
  errorEl.classList.remove("activo");
  btnReintentar.style.display = "none";

  // Aviso de que puede tardar, para que no parezca que se congeló
  const avisoLento = setTimeout(() => {
    estadoEl.textContent = "Esto está tardando más de lo normal, un momento...";
  }, 4000);

  try {
    const res = await fetchConTimeout(`${SCRIPT_URL}?action=lookup&id=${encodeURIComponent(id)}`, TIMEOUT_MS);
    clearTimeout(avisoLento);
    const data = await res.json();

    if (data.encontrado && data.confirmado) {
      document.getElementById("mesaNumero").textContent = data.mesa || "Sin asignar";
      document.getElementById("nombreResultado").textContent = data.nombre || id;
      document.getElementById("invitadosResultado").textContent = "Invitados: " + (data.invitados || "—");
      resultadoEl.classList.add("activo");
      estadoEl.textContent = "";
    } else if (data.encontrado) {
      mostrarError("Esta invitación aún no ha confirmado asistencia.", false);
    } else {
      mostrarError("No se encontró esta invitación.", false);
    }
  } catch (err) {
    clearTimeout(avisoLento);
    if (err.name === "AbortError") {
      mostrarError("La conexión está muy lenta o se cortó. Revisa tu wifi/datos e intenta de nuevo.", true);
    } else {
      mostrarError("Error de conexión. Intenta de nuevo.", true);
    }
  }
}

function mostrarError(texto, mostrarBotonReintentar) {
  errorTextoEl.textContent = texto;
  errorEl.classList.add("activo");
  estadoEl.textContent = "";
  btnReintentar.style.display = mostrarBotonReintentar ? "block" : "none";
}

// Reintenta la MISMA búsqueda sin necesidad de volver a escanear el QR
btnReintentar.addEventListener("click", () => {
  if (ultimoIdEscaneado) {
    estadoEl.textContent = "Reintentando...";
    buscarInvitado(ultimoIdEscaneado);
  }
});

document.getElementById("btnOtro").addEventListener("click", () => {
  resultadoEl.classList.remove("activo");
  errorEl.classList.remove("activo");
  btnReintentar.style.display = "none";
  estadoEl.textContent = "Apunta la cámara al código";
  escanerActivo = true;
  html5QrCode.resume();
});
