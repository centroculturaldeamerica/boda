/* ============================================
   1. LEER EL ID DE INVITACIÓN DESDE LA URL
   (aquí SÍ funciona leerlo de window.location, porque esta página
   vive en un hosting normal, sin los iframes anidados de Apps Script)
   ============================================ */
const params = new URLSearchParams(window.location.search);
const idInvitacion = params.get("id");
let cupoMaximo = 0;

async function iniciar() {
  if (!idInvitacion) { mostrarError(); return; }
  try {
    const res = await fetch(`${SCRIPT_URL}?action=lookup&id=${encodeURIComponent(idInvitacion)}`);
    const data = await res.json();

    if (!data.encontrado) { mostrarError(); return; }

    document.getElementById("estadoCarga").style.display = "none";
    document.getElementById("contenido").style.display = "block";

    if (data.confirmado) {
      document.getElementById("seccionRSVP").querySelector("form").style.display = "none";
      mostrarConfirmacion(idInvitacion);
    } else {
      cupoMaximo = Number(data.cupo) || 1;
      document.getElementById("nombreInvitado").textContent = data.nombre || "";
      document.getElementById("cupoTexto").textContent = cupoMaximo;
      document.getElementById("cupoDisplay").textContent = cupoMaximo;
      renderAcompanantes(cupoMaximo);
    }
  } catch (err) {
    mostrarError();
  }
}

function mostrarError() {
  document.getElementById("estadoCarga").style.display = "none";
  document.getElementById("estadoError").style.display = "block";
}

/* ============================================
   2. GENERAR CAMPOS DE ACOMPAÑANTES SEGÚN CUPO
   ============================================ */
function renderAcompanantes(cupo) {
  const cont = document.getElementById("listaAcompanantes");
  cont.innerHTML = "";
  for (let i = 1; i <= cupo; i++) {
    const bloque = document.createElement("div");
    bloque.className = "acompanante-bloque";
    bloque.innerHTML = `
      <p class="num-acomp">Invitado ${i}</p>
      <div class="campo">
        <label>Nombre y apellido</label>
        <input type="text" class="input-acompanante" placeholder="Nombre completo" required>
      </div>
    `;
    cont.appendChild(bloque);
  }
}

/* ============================================
   3. TOGGLE ASISTE SÍ / NO
   ============================================ */
document.querySelectorAll('input[name="asiste"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const asiste = document.querySelector('input[name="asiste"]:checked').value === "si";
    document.getElementById("camposAsistencia").style.display = asiste ? "block" : "none";
    document.getElementById("labelSi").classList.toggle("activo", asiste);
    document.getElementById("labelNo").classList.toggle("activo", !asiste);
  });
});
document.getElementById("labelSi").classList.add("activo");

/* ============================================
   4. COUNTDOWN
   ============================================ */
function actualizarCountdown() {
  const ahora = new Date();
  let diff = FECHA_EVENTO - ahora;
  if (diff < 0) diff = 0;

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const min = Math.floor((diff / (1000 * 60)) % 60);
  const seg = Math.floor((diff / 1000) % 60);

  document.getElementById("cdDias").textContent = String(dias).padStart(2, "0");
  document.getElementById("cdHoras").textContent = String(horas).padStart(2, "0");
  document.getElementById("cdMin").textContent = String(min).padStart(2, "0");
  document.getElementById("cdSeg").textContent = String(seg).padStart(2, "0");
}
setInterval(actualizarCountdown, 1000);
actualizarCountdown();

/* ============================================
   5. AUDIO
   ============================================ */
const audioEl = document.getElementById("audioFondo");
const btnPlay = document.getElementById("btnPlay");
document.getElementById("tituloCancion").textContent = NOMBRE_CANCION;
if (AUDIO_URL) audioEl.src = AUDIO_URL;

btnPlay.addEventListener("click", () => {
  if (!AUDIO_URL) return;
  if (audioEl.paused) {
    audioEl.play();
    btnPlay.textContent = "❚❚";
  } else {
    audioEl.pause();
    btnPlay.textContent = "▶";
  }
});

/* ============================================
   6. ENVÍO DEL FORMULARIO
   ============================================ */
document.getElementById("formRSVP").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("btnEnviar");
  const msg = document.getElementById("msgEstado");
  const asiste = document.querySelector('input[name="asiste"]:checked').value === "si";

  if (!asiste) {
    btn.disabled = true;
    msg.textContent = "Enviando...";
    await enviarConfirmacion([], "");
    return;
  }

  const nombres = Array.from(document.querySelectorAll(".input-acompanante"))
    .map(input => input.value.trim())
    .filter(v => v.length > 0);

  const telefono = document.getElementById("telefono").value.trim();

  if (nombres.length === 0 || !telefono) {
    msg.textContent = "Por favor completa los nombres y el teléfono.";
    return;
  }

  btn.disabled = true;
  msg.textContent = "Enviando...";
  await enviarConfirmacion(nombres, telefono);
});

async function enviarConfirmacion(nombres, telefono) {
  const msg = document.getElementById("msgEstado");
  const btn = document.getElementById("btnEnviar");

  const payload = {
    id: idInvitacion,
    telefono: telefono,
    invitados: nombres,
    cancion: document.getElementById("cancion").value.trim(),
    mensaje: document.getElementById("mensaje").value.trim()
  };

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById("formRSVP").style.display = "none";
      mostrarConfirmacion(idInvitacion);
    } else {
      msg.textContent = data.error || "Ocurrió un error, intenta de nuevo.";
      btn.disabled = false;
    }
  } catch (err) {
    msg.textContent = "No se pudo conectar. Revisa tu internet e intenta de nuevo.";
    btn.disabled = false;
  }
}

/* ============================================
   7. PANTALLA FINAL CON QR
   ============================================ */
function mostrarConfirmacion(id) {
  document.getElementById("pantallaConfirmacion").classList.add("activa");
  document.getElementById("qrcode").innerHTML = "";
  new QRCode(document.getElementById("qrcode"), {
    text: id,
    width: 180,
    height: 180,
    colorDark: "#2E2822",
    colorLight: "#ffffff"
  });
}

iniciar();
