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
    observarSecciones();

    cupoMaximo = Number(data.cupo) || 1;
    document.getElementById("nombreInvitado").textContent = data.nombre || "";
    document.getElementById("cupoTexto").textContent = cupoMaximo;
    document.getElementById("cupoDisplay").textContent = cupoMaximo;

    if (data.confirmado) {
      document.getElementById("seccionRSVP").querySelector("form").style.display = "none";
      if (data.invitados === "No asistirá") {
        mostrarNoAsiste();
      } else {
        mostrarConfirmacion(idInvitacion);
      }
    } else {
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
const youtubeContainer = document.getElementById("youtubeContainer");
document.getElementById("tituloCancion").textContent = NOMBRE_CANCION;

let youtubeReproduciendo = false;

if (AUDIO_URL) {
  audioEl.src = AUDIO_URL;
  btnPlay.addEventListener("click", () => {
    if (audioEl.paused) {
      audioEl.play();
      btnPlay.textContent = "❚❚";
    } else {
      audioEl.pause();
      btnPlay.textContent = "▶";
    }
  });
} else if (YOUTUBE_ID) {
  btnPlay.addEventListener("click", () => {
    if (!youtubeReproduciendo) {
      youtubeContainer.innerHTML = `<iframe width="220" height="124" src="https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&mute=0&controls=0&playsinline=1" allow="autoplay; encrypted-media" frameborder="0"></iframe>`;
      btnPlay.textContent = "❚❚";
      youtubeReproduciendo = true;
    } else {
      youtubeContainer.innerHTML = "";
      btnPlay.textContent = "▶";
      youtubeReproduciendo = false;
    }
  });
}

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
    await enviarConfirmacion([], "", false);
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
  await enviarConfirmacion(nombres, telefono, true);
});

async function enviarConfirmacion(nombres, telefono, asiste) {
  const msg = document.getElementById("msgEstado");
  const btn = document.getElementById("btnEnviar");

  const payload = {
    id: idInvitacion,
    telefono: telefono,
    invitados: nombres,
    asiste: asiste,
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
      if (asiste) {
        mostrarConfirmacion(idInvitacion);
      } else {
        mostrarNoAsiste();
      }
    } else {
      msg.textContent = data.error || "Ocurrió un error, intenta de nuevo.";
      btn.disabled = false;
    }
  } catch (err) {
    msg.textContent = "No se pudo conectar. Revisa tu internet e intenta de nuevo.";
    btn.disabled = false;
  }
}

function mostrarNoAsiste() {
  const cont = document.getElementById("pantallaConfirmacion");
  cont.classList.add("activa");
  cont.innerHTML = `
    <p class="eyebrow">Gracias por avisarnos</p>
    <h2 class="script" style="font-size:2.2rem;">Los extrañaremos</h2>
    <p class="nota" style="margin-top:18px;">Lamentamos que no puedan acompañarnos, pero agradecemos muchísimo que se hayan tomado el tiempo de responder. ¡Un abrazo!</p>
  `;
}

/* ============================================
   7. PANTALLA FINAL CON QR
   ============================================ */
function mostrarConfirmacion(id) {
  document.getElementById("pantallaConfirmacion").classList.add("activa");
  document.getElementById("qrcode").innerHTML = "";

  // El QR guarda un LINK (no solo el texto del ID), para que cualquier
  // cámara o Google Lens abra directamente la página con los datos del invitado.
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
  const urlMesa = base + "mesa.html?id=" + encodeURIComponent(id);

  new QRCode(document.getElementById("qrcode"), {
    text: urlMesa,
    width: 180,
    height: 180,
    colorDark: "#2E2822",
    colorLight: "#ffffff"
  });
}

iniciar();

/* ============================================
   8. BARRA DE PROGRESO DE SCROLL
   ============================================ */
window.addEventListener("scroll", () => {
  const alto = document.documentElement.scrollHeight - window.innerHeight;
  const progreso = alto > 0 ? (window.scrollY / alto) * 100 : 0;
  document.getElementById("barraProgreso").style.width = progreso + "%";
});

/* ============================================
   9. ANIMACIONES FADE-IN AL HACER SCROLL
   ============================================ */
const observador = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.15 });

// Se activa una vez que el contenido ya es visible (después de iniciar())
const observarSecciones = () => {
  document.querySelectorAll(".fade-in").forEach(el => observador.observe(el));
};

/* ============================================
   10. BOTÓN FLOTANTE "CONFIRMAR ASISTENCIA"
   ============================================ */
const btnFlotante = document.getElementById("btnFlotante");
btnFlotante.addEventListener("click", () => {
  document.getElementById("seccionRSVP").scrollIntoView({ behavior: "smooth" });
});

window.addEventListener("scroll", () => {
  const rsvp = document.getElementById("seccionRSVP");
  if (!rsvp || document.getElementById("contenido").style.display === "none") return;
  const rectRsvp = rsvp.getBoundingClientRect();
  const rectPortada = document.querySelector(".portada").getBoundingClientRect();
  // Se muestra después de pasar la portada, se oculta al llegar al formulario
  const mostrar = rectPortada.bottom < 0 && rectRsvp.top > window.innerHeight * 0.3;
  btnFlotante.classList.toggle("visible", mostrar);
});

/* ============================================
   11. GUARDAR TARJETA COMPLETA COMO PDF
   ============================================
   Nota: html2canvas no siempre logra capturar bien el <canvas>/<img>
   que genera qrcode.js (queda en blanco, sobre todo al compartir desde
   el navegador móvil). Para evitarlo, capturamos la tarjeta SIN el QR
   y luego dibujamos el QR manualmente encima usando su bitmap ya
   renderizado — así nunca sale vacío. */

// qrcode.js corre una prueba asíncrona interna antes de insertar el QR real
// en el DOM. Esta función espera activamente hasta confirmar que el QR ya
// existe y tiene contenido dibujado (no solo un canvas vacío del tamaño
// correcto), en vez de asumir que está listo apenas se llamó new QRCode().
function elementoQRTieneContenido(el) {
  if (!el) return false;
  if (el.tagName === "IMG") return el.complete && el.naturalWidth > 0;
  if (el.tagName === "CANVAS") {
    if (el.width === 0 || el.height === 0) return false;
    // Revisamos que no esté completamente en blanco muestreando el centro
    try {
      const ctx = el.getContext("2d");
      const { data } = ctx.getImageData(Math.floor(el.width / 2) - 5, Math.floor(el.height / 2) - 5, 10, 10);
      // Si hay algún pixel que no sea blanco puro, asumimos que ya se dibujó el QR
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
      }
      return false;
    } catch (e) {
      // Si por algún motivo no se puede leer el canvas, confiamos en que ya está listo
      return true;
    }
  }
  return false;
}

async function esperarQRListo(qrBox, timeoutMs = 3000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const el = qrBox.querySelector("canvas") || qrBox.querySelector("img");
    if (elementoQRTieneContenido(el)) return el;
    await new Promise(r => setTimeout(r, 80));
  }
  return null;
}

document.getElementById("btnGuardarQR").addEventListener("click", async () => {
  const tarjeta = document.getElementById("pantallaConfirmacion");
  const btnGuardar = document.getElementById("btnGuardarQR");
  const linkWsp = document.querySelector(".link-whatsapp");
  const qrBox = document.getElementById("qrcode");
  const textoOriginalBtn = btnGuardar.textContent;

  // Ocultamos los botones/enlace mientras se toma la captura, para que no salgan en el PDF
  btnGuardar.disabled = true;
  btnGuardar.textContent = "Generando PDF...";
  btnGuardar.style.visibility = "hidden";
  if (linkWsp) linkWsp.style.visibility = "hidden";

  try {
    // qrcode.js hace una prueba interna asíncrona antes de insertar el QR real
    // en el DOM (por eso a veces "no está listo" aunque new QRCode() ya haya
    // retornado). Esperamos activamente hasta confirmar que existe Y tiene
    // contenido dibujado de verdad, en lugar de asumirlo.
    const qrFuente = await esperarQRListo(qrBox);
    if (!qrFuente) throw new Error("El código QR aún no está listo. Intenta de nuevo en unos segundos.");

    const escala = 2;
    const rectTarjeta = tarjeta.getBoundingClientRect();
    const rectQr = qrFuente.getBoundingClientRect();
    const offsetX = (rectQr.left - rectTarjeta.left) * escala;
    const offsetY = (rectQr.top - rectTarjeta.top) * escala;
    const anchoQr = rectQr.width * escala;
    const altoQr = rectQr.height * escala;

    // 1. Capturamos toda la tarjeta EXCEPTO el QR
    const canvas = await html2canvas(tarjeta, {
      backgroundColor: "#2E2822",
      scale: escala,
      ignoreElements: (el) => el.id === "qrcode"
    });

    // 2. Dibujamos el QR manualmente encima (fondo blanco + bitmap real del QR)
    const ctx = canvas.getContext("2d");
    const margen = 10 * escala;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(offsetX - margen, offsetY - margen, anchoQr + margen * 2, altoQr + margen * 2);
    ctx.drawImage(qrFuente, offsetX, offsetY, anchoQr, altoQr);

    // 3. Convertimos el resultado a un PDF con el mismo tamaño/proporción que la tarjeta
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);

    const nombreArchivo = "mi-invitacion-boda.pdf";

    if (navigator.share && navigator.canShare) {
      const archivo = new File([pdf.output("blob")], nombreArchivo, { type: "application/pdf" });
      if (navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: "Mi confirmación - Boda" });
          return;
        } catch (e) { /* si cancela, seguimos con la descarga normal */ }
      }
    }
    pdf.save(nombreArchivo);
  } catch (err) {
    alert("No se pudo generar el PDF. Intenta de nuevo.");
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = textoOriginalBtn;
    btnGuardar.style.visibility = "visible";
    if (linkWsp) linkWsp.style.visibility = "visible";
  }
});
