console.log("%c[boda script.js] versión 2026-08-04-v7 (dibujo 100% manual con Canvas, sin html2canvas)", "color:#DD7E63;font-weight:bold;");

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
   11. GUARDAR TARJETA COMPLETA COMO IMAGEN (PNG)
   ============================================
   Después de varios intentos, html2canvas resultó poco confiable
   capturando esta tarjeta en distintos navegadores (a veces el QR
   sale en blanco sin razón clara, incluso dibujándolo encima a mano).
   La solución definitiva es no depender de html2canvas en absoluto:
   dibujamos la tarjeta completa (fondo, textos y QR) nosotros mismos
   con la API de Canvas, generando además un QR nuevo y aislado
   (nunca tocado por html2canvas) directamente para esta imagen. */

function trazarRectRedondeado(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Parte el texto en líneas que quepan en maxAncho y las dibuja centradas.
// Devuelve la altura total ocupada.
function dibujarTextoEnvuelto(ctx, texto, cx, y, maxAncho, alturaLinea) {
  const palabras = texto.split(" ");
  const lineas = [];
  let linea = "";
  for (const palabra of palabras) {
    const prueba = linea ? linea + " " + palabra : palabra;
    if (ctx.measureText(prueba).width > maxAncho && linea) {
      lineas.push(linea);
      linea = palabra;
    } else {
      linea = prueba;
    }
  }
  if (linea) lineas.push(linea);
  lineas.forEach((l, i) => ctx.fillText(l, cx, y + i * alturaLinea));
  return lineas.length * alturaLinea;
}

// qrcode.js corre una prueba asíncrona interna antes de insertar el QR real
// en el DOM. Esperamos activamente hasta confirmar que existe y tiene
// contenido dibujado de verdad, en vez de asumir que ya está listo.
function elementoQRTieneContenido(el) {
  if (!el) return false;
  if (el.tagName === "IMG") return el.complete && el.naturalWidth > 0;
  if (el.tagName === "CANVAS") {
    if (el.width === 0 || el.height === 0) return false;
    try {
      const ctx = el.getContext("2d");
      const { data } = ctx.getImageData(Math.floor(el.width / 2) - 5, Math.floor(el.height / 2) - 5, 10, 10);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
      }
      return false;
    } catch (e) {
      return true;
    }
  }
  return false;
}

async function esperarQRListo(qrBox, timeoutMs = 3000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const el = qrBox.querySelector("img") || qrBox.querySelector("canvas");
    if (elementoQRTieneContenido(el)) return el;
    await new Promise(r => setTimeout(r, 80));
  }
  return null;
}

async function generarImagenTarjeta() {
  const cs = getComputedStyle(document.documentElement);
  const colorFondo = (cs.getPropertyValue("--tinta") || "#2E2822").trim();
  const colorCrema = (cs.getPropertyValue("--crema") || "#F8F3EA").trim();
  const colorCoral = (cs.getPropertyValue("--coral") || "#DD7E63").trim();

  const textoEyebrow = document.querySelector("#pantallaConfirmacion .eyebrow")?.textContent.trim() || "¡GRACIAS POR CONFIRMAR!";
  const textoTitulo = document.querySelector("#pantallaConfirmacion h2")?.textContent.trim() || "Te esperamos";
  const textoNota = document.querySelector("#pantallaConfirmacion .nota")?.textContent.trim() || "";

  // Nos aseguramos de que las fuentes ya estén cargadas antes de dibujar texto
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('600 14px Jost'),
    document.fonts.load('300 15px Jost'),
    document.fonts.load('400 46px "Petit Formal Script"')
  ]).catch(() => {});

  // Generamos un QR NUEVO y AISLADO (nunca tocado por html2canvas) directo
  // para esta imagen, apuntando a la misma URL que el QR visible en pantalla.
  const base = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
  const urlMesa = base + "mesa.html?id=" + encodeURIComponent(idInvitacion);
  const qrTemp = document.createElement("div");
  qrTemp.style.position = "fixed";
  qrTemp.style.left = "-9999px";
  qrTemp.style.top = "0";
  document.body.appendChild(qrTemp);
  new QRCode(qrTemp, { text: urlMesa, width: 300, height: 300, colorDark: "#2E2822", colorLight: "#ffffff" });
  const qrEl = await esperarQRListo(qrTemp);
  if (!qrEl) {
    document.body.removeChild(qrTemp);
    throw new Error("No se pudo generar el código QR.");
  }

  const escala = 2;
  const ancho = 460;
  const alto = 620;
  const canvas = document.createElement("canvas");
  canvas.width = ancho * escala;
  canvas.height = alto * escala;
  const ctx = canvas.getContext("2d");
  ctx.scale(escala, escala);

  // Fondo
  ctx.fillStyle = colorFondo;
  ctx.fillRect(0, 0, ancho, alto);

  let y = 56;

  // Eyebrow
  ctx.fillStyle = colorCoral;
  ctx.font = "600 12px Jost, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(textoEyebrow.split("").join("\u200a\u200a"), ancho / 2, y);
  y += 48;

  // Título en script
  ctx.fillStyle = colorCrema;
  ctx.font = '400 46px "Petit Formal Script", cursive';
  ctx.fillText(textoTitulo, ancho / 2, y);
  y += 56;

  // QR sobre fondo blanco redondeado
  const qrTam = 180;
  const qrX = ancho / 2 - qrTam / 2;
  const qrY = y;
  const margenQr = 20;
  ctx.fillStyle = "#ffffff";
  trazarRectRedondeado(ctx, qrX - margenQr, qrY - margenQr, qrTam + margenQr * 2, qrTam + margenQr * 2, 16);
  ctx.fill();
  ctx.drawImage(qrEl, qrX, qrY, qrTam, qrTam);
  y += qrTam + margenQr * 2 + 36;

  document.body.removeChild(qrTemp);

  // Nota inferior
  if (textoNota) {
    ctx.fillStyle = colorCrema;
    ctx.globalAlpha = 0.78;
    ctx.font = "300 14px Jost, sans-serif";
    dibujarTextoEnvuelto(ctx, textoNota, ancho / 2, y, ancho - 90, 21);
    ctx.globalAlpha = 1;
  }

  return canvas;
}

document.getElementById("btnGuardarQR").addEventListener("click", async () => {
  const btnGuardar = document.getElementById("btnGuardarQR");
  const textoOriginalBtn = btnGuardar.textContent;

  btnGuardar.disabled = true;
  btnGuardar.textContent = "Generando imagen...";

  try {
    const canvas = await generarImagenTarjeta();
    const nombreArchivo = "mi-invitacion-boda.png";
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

    if (navigator.share && navigator.canShare) {
      const archivo = new File([blob], nombreArchivo, { type: "image/png" });
      if (navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: "Mi confirmación - Boda" });
          return;
        } catch (e) { /* si cancela, seguimos con la descarga normal */ }
      }
    }

    const link = document.createElement("a");
    link.download = nombreArchivo;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  } catch (err) {
    console.error("[boda] error generando imagen:", err);
    alert("No se pudo generar la imagen. Intenta de nuevo.");
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = textoOriginalBtn;
  }
});
