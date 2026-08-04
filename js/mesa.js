const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const card = document.getElementById("card");

async function buscar() {
  if (!id) { card.innerHTML = '<p class="error">Falta el código de invitación.</p>'; return; }
  try {
    const res = await fetch(`${SCRIPT_URL}?action=lookup&id=${encodeURIComponent(id)}`);
    const data = await res.json();

    if (data.encontrado && data.confirmado) {
      card.innerHTML = `
        <p class="eyebrow">Mesa asignada</p>
        <p class="mesa-numero">${data.mesa || "—"}</p>
        <p class="nombre">${data.nombre || id}</p>
        <p class="invitados">Invitados: ${data.invitados || "—"}</p>
      `;
    } else if (data.encontrado) {
      card.innerHTML = '<p class="error">Esta invitación aún no ha confirmado asistencia.</p>';
    } else {
      card.innerHTML = '<p class="error">No se encontró esta invitación.</p>';
    }
  } catch (err) {
    card.innerHTML = '<p class="error">Error de conexión. Intenta de nuevo.</p>';
  }
}
buscar();
