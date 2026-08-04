const resultadoEl = document.getElementById("resultado");
const errorEl = document.getElementById("errorBox");
const estadoEl = document.getElementById("estadoLectura");
let escanerActivo = true;

const html5QrCode = new Html5Qrcode("lector");

function alEscanear(textoDecodificado) {
  if (!escanerActivo) return;
  escanerActivo = false;
  estadoEl.textContent = "Código detectado, buscando...";
  html5QrCode.pause(true);
  buscarInvitado(textoDecodificado.trim());
}

html5QrCode.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: { width: 240, height: 240 } },
  alEscanear
).catch(err => {
  estadoEl.textContent = "No se pudo acceder a la cámara. Revisa los permisos del navegador.";
});

async function buscarInvitado(id) {
  resultadoEl.classList.remove("activo");
  errorEl.classList.remove("activo");
  try {
    const res = await fetch(`${SCRIPT_URL}?action=lookup&id=${encodeURIComponent(id)}`);
    const data = await res.json();

    if (data.encontrado && data.confirmado) {
      document.getElementById("mesaNumero").textContent = data.mesa || "Sin asignar";
      document.getElementById("nombreResultado").textContent = data.nombre || id;
      document.getElementById("invitadosResultado").textContent = "Invitados: " + (data.invitados || "—");
      resultadoEl.classList.add("activo");
      estadoEl.textContent = "";
    } else {
      errorEl.classList.add("activo");
      estadoEl.textContent = "";
    }
  } catch (err) {
    errorEl.textContent = "Error de conexión. Intenta de nuevo.";
    errorEl.classList.add("activo");
  }
}

document.getElementById("btnOtro").addEventListener("click", () => {
  resultadoEl.classList.remove("activo");
  errorEl.classList.remove("activo");
  estadoEl.textContent = "Apunta la cámara al código";
  escanerActivo = true;
  html5QrCode.resume();
});
