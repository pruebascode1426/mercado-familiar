// =============================================
//  MERCADO FAMILIAR PRO — app.js (CORREGIDO)
// =============================================

// --- ESTADO GLOBAL ---
var state = {
  familia: "",
  productos: [],
  historial: [],
  filtroCat: "Todos"
};

var STORAGE_KEY = "mercadoPro_v3";
var camaraStream = null;
var scanInterval = null;

// =============================================
//  INICIALIZACIÓN
// =============================================
window.addEventListener("DOMContentLoaded", function () {
  cargarDatos();
  renderProductos();
  renderPendientes();
  renderHistorial();

  // El Service Worker se registra directamente en index.html para PWABuilder

  // Cerrar modal con Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      cerrarModalQR();
    }
  });

  // Cerrar modal tocando el fondo oscuro
  var overlay = document.getElementById("qrOverlay");
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        cerrarModalQR();
      }
    });
  }
});

// =============================================
//  PERSISTENCIA
// =============================================
function cargarDatos() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      state.familia = parsed.familia || "";
      state.productos = Array.isArray(parsed.productos) ? parsed.productos : [];
      state.historial = Array.isArray(parsed.historial) ? parsed.historial : [];
    }
  } catch (e) {
    console.error("Error al cargar:", e);
  }

  var titulo = document.getElementById("familiaTitulo");
  var input = document.getElementById("familiaNombre");

  if (titulo) {
    titulo.textContent = state.familia
      ? "Familia: " + state.familia
      : "Configura tu familia";
  }
  if (input) {
    input.value = state.familia;
  }
}

function guardarDatos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    showToast("Error al guardar");
  }
}

// =============================================
//  FAMILIA
// =============================================
function crearFamilia() {
  var input = document.getElementById("familiaNombre");
  var nombre = input.value.trim();

  if (!nombre) {
    showToast("Escribe un nombre de familia");
    input.focus();
    return;
  }

  state.familia = nombre;
  guardarDatos();

  document.getElementById("familiaTitulo").textContent =
    "Familia: " + nombre;

  input.value = "";
  showToast("Familia guardada");
}

// =============================================
//  PRODUCTOS
// =============================================
function agregarProducto() {
  var inputNombre = document.getElementById("productoNombre");
  var inputCategoria = document.getElementById("productoCategoria");
  var inputCantidad = document.getElementById("productoCantidad");

  var nombre = inputNombre.value.trim();
  var cat = inputCategoria.value;
  var cant = parseInt(inputCantidad.value, 10);

  if (!nombre) {
    showToast("Escribe el nombre del producto");
    inputNombre.focus();
    return;
  }

  if (!cat) {
    showToast("Selecciona una categoría");
    inputCategoria.focus();
    return;
  }

  if (isNaN(cant) || cant < 0) {
    showToast("Cantidad inválida");
    inputCantidad.focus();
    return;
  }

  // Verificar duplicados
  var existe = state.productos.some(function (p) {
    return p.nombre.toLowerCase() === nombre.toLowerCase();
  });

  if (existe) {
    showToast("Ya existe ese producto");
    inputNombre.focus();
    return;
  }

  state.productos.push({
    id: Date.now(),
    nombre: nombre,
    categoria: cat,
    cantidad: cant,
    porAcabar: cant === 0
  });

  // Limpiar
  inputNombre.value = "";
  inputCantidad.value = "";
  inputCategoria.selectedIndex = 0;
  inputNombre.focus();

  guardarDatos();
  renderProductos();
  renderPendientes();
  showToast("Producto agregado");
}

function actualizarCantidad(id, valor) {
  var prod = state.productos.find(function (p) {
    return p.id === id;
  });
  if (!prod) return;

  prod.cantidad = Math.max(0, parseInt(valor) || 0);
  prod.porAcabar = prod.cantidad === 0;

  guardarDatos();
  renderProductos();
  renderPendientes();
}

function eliminarProducto(id) {
  if (!confirm("¿Eliminar este producto?")) return;

  state.productos = state.productos.filter(function (p) {
    return p.id !== id;
  });

  guardarDatos();
  renderProductos();
  renderPendientes();
  showToast("Producto eliminado");
}

// =============================================
//  RENDER: INVENTARIO
// =============================================
function renderProductos() {
  var lista = document.getElementById("listaProductos");
  var badge = document.getElementById("countBadge");
  var vacio = document.getElementById("emptyInventario");

  if (!lista) return;

  var busquedaEl = document.getElementById("buscador");
  var busqueda = busquedaEl ? busquedaEl.value.toLowerCase() : "";

  lista.innerHTML = "";

  var filtrados = state.productos.filter(function (p) {
    var matchCat = state.filtroCat === "Todos" || p.categoria === state.filtroCat;
    var matchSearch = p.nombre.toLowerCase().indexOf(busqueda) !== -1;
    return matchCat && matchSearch;
  });

  if (badge) badge.textContent = filtrados.length;
  if (vacio) vacio.style.display = filtrados.length ? "none" : "block";

  filtrados.forEach(function (p) {
    var div = document.createElement("div");
    div.className = "product-card";

    var info = document.createElement("div");
    info.className = "p-info";
    info.innerHTML =
      '<span class="p-name">' + escapeHtml(p.nombre) + "</span>" +
      '<span class="p-cat">' + escapeHtml(p.categoria) + "</span>";

    var controls = document.createElement("div");
    controls.className = "p-controls";

    // Input de cantidad
    var qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.className = "qty-input";
    qtyInput.value = p.cantidad;
    qtyInput.min = "0";
    qtyInput.setAttribute("data-id", p.id);
    qtyInput.addEventListener("change", function () {
      actualizarCantidad(p.id, this.value);
    });

    // Botón eliminar
    var btnDel = document.createElement("button");
    btnDel.className = "danger small";
    btnDel.textContent = "🗑";
    btnDel.addEventListener("click", function () {
      eliminarProducto(p.id);
    });

    controls.appendChild(qtyInput);
    controls.appendChild(btnDel);

    div.appendChild(info);
    div.appendChild(controls);
    lista.appendChild(div);
  });
}

// =============================================
//  RENDER: PENDIENTES
// =============================================
function renderPendientes() {
  var tbody = document.getElementById("tablaPendientesBody");
  var vacio = document.getElementById("emptyPendientes");

  if (!tbody) return;

  tbody.innerHTML = "";

  var pendientes = state.productos.filter(function (p) {
    return p.porAcabar || p.cantidad === 0;
  });

  if (vacio) vacio.style.display = pendientes.length ? "none" : "block";

  pendientes.forEach(function (p) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + escapeHtml(p.nombre) + "</td>" +
      '<td><small>' + escapeHtml(p.categoria) + "</small></td>" +
      "<td><b>" + p.cantidad + "</b></td>";
    tbody.appendChild(tr);
  });
}

// =============================================
//  RENDER: HISTORIAL
// =============================================
function renderHistorial() {
  var ul = document.getElementById("historial");
  var vacio = document.getElementById("emptyHistorial");

  if (!ul) return;

  ul.innerHTML = "";
  if (vacio) vacio.style.display = state.historial.length ? "none" : "block";

  state.historial.slice().reverse().forEach(function (h, revI) {
    var realIndex = state.historial.length - 1 - revI;
    var li = document.createElement("li");
    li.className = "product-card";
    li.innerHTML =
      '<div class="p-info">' +
        '<span class="p-name">📋 ' + escapeHtml(h.fecha) + "</span>" +
        '<span class="p-cat">' + (h.items ? h.items.length : 0) + " productos</span>" +
      "</div>" +
      '<button class="ghost small" data-hist="' + realIndex + '">Cargar</button>';

    li.querySelector("button").addEventListener("click", function () {
      cargarHistorial(parseInt(this.getAttribute("data-hist"), 10));
    });

    ul.appendChild(li);
  });
}

function cargarHistorial(index) {
  if (index < 0 || index >= state.historial.length) return;
  if (!confirm("¿Cargar esta compra al inventario actual?")) return;

  state.productos = JSON.parse(JSON.stringify(state.historial[index].items));
  guardarDatos();
  renderProductos();
  renderPendientes();
  showToast("Historial cargado");
}

function guardarCompra() {
  if (state.productos.length === 0) {
    showToast("No hay productos para guardar");
    return;
  }

  state.historial.push({
    fecha: new Date().toLocaleString(),
    items: JSON.parse(JSON.stringify(state.productos))
  });

  guardarDatos();
  renderHistorial();
  showToast("Compra guardada en historial");
}

// =============================================
//  FILTROS
// =============================================
function filtrarCategoria(cat, btn) {
  state.filtroCat = cat;

  var chips = document.querySelectorAll(".cat-chip");
  for (var i = 0; i < chips.length; i++) {
    chips[i].classList.remove("active");
  }
  btn.classList.add("active");

  renderProductos();
}

// =============================================
//  MODAL QR — ABRIR / CERRAR
// =============================================
function abrirModalQR() {
  var overlay = document.getElementById("qrOverlay");
  if (!overlay) return;

  overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  generarQR();
}

function cerrarModalQR() {
  var overlay = document.getElementById("qrOverlay");
  if (!overlay) return;

  overlay.classList.add("hidden");
  document.body.style.overflow = "";
  detenerCamara();
}

// =============================================
//  TABS DEL MODAL
// =============================================
function mostrarTab(tab, btn) {
  var tabs = document.querySelectorAll(".tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove("active");
  }
  btn.classList.add("active");

  var tabGenerar = document.getElementById("tabGenerar");
  var tabEscanear = document.getElementById("tabEscanear");

  if (tabGenerar) tabGenerar.classList.toggle("hidden", tab !== "generar");
  if (tabEscanear) tabEscanear.classList.toggle("hidden", tab !== "escanear");

  if (tab === "escanear") {
    iniciarCamara();
  } else {
    detenerCamara();
  }
}

// =============================================
//  GENERAR QR
// =============================================
function generarQR() {
  var canvas = document.getElementById("qrCanvas");
  var sizeLabel = document.getElementById("qrTamanio");

  if (!canvas) return;
  canvas.innerHTML = "";

  var payload = {
    v: 1,
    f: state.familia,
    p: state.productos,
    h: state.historial
  };

  var jsonStr = JSON.stringify(payload);
  var sizeKB = (new Blob([jsonStr]).size / 1024).toFixed(1);

  if (sizeLabel) sizeLabel.textContent = "Tamaño: " + sizeKB + " KB";

  // Límite de QR: ~4000 caracteres
  if (jsonStr.length > 4000) {
    canvas.innerHTML =
      '<div style="text-align:center;color:#ef4444;padding:1rem;">' +
        "⚠️ Datos demasiado grandes (" + sizeKB + " KB).<br>" +
        "<small>Máximo para QR: ~4 KB de texto.</small><br>" +
        "<small>Reduce productos o historial.</small>" +
      "</div>";
    return;
  }

  // Verificar que QRCode esté disponible
  if (typeof QRCode === "undefined") {
    canvas.innerHTML =
      '<div style="text-align:center;color:#ef4444;">' +
        "No se cargó la librería QRCode.<br>" +
        "<small>Revisa tu conexión a internet.</small>" +
      "</div>";
    return;
  }

  try {
    new QRCode(canvas, {
      text: jsonStr,
      width: 220,
      height: 220,
      colorDark: "#1e293b",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {
    console.error("Error QR:", e);
    canvas.innerHTML =
      '<div style="text-align:center;color:#ef4444;">Error al generar QR</div>';
  }
}

// =============================================
//  ESCANEAR QR (CÁMARA)
// =============================================
function iniciarCamara() {
  var video = document.getElementById("qrVideo");
  var status = document.getElementById("qrScanStatus");

  if (!video || !status) return;

  // Verificar soporte
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    status.textContent = "❌ Cámara no soportada en este navegador";
    return;
  }

  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 640 },
        height: { ideal: 640 }
      }
    })
    .then(function (stream) {
      camaraStream = stream;
      video.srcObject = stream;
      status.textContent = "Escaneando... apunta al QR";

      // Usar BarcodeDetector si está disponible (Chrome Android)
      if ("BarcodeDetector" in window) {
        var detector = new BarcodeDetector({ formats: ["qr_code"] });
        scanInterval = setInterval(function () {
          detector
            .detect(video)
            .then(function (codes) {
              if (codes.length > 0) {
                procesarQREscaneado(codes[0].rawValue);
              }
            })
            .catch(function () {});
        }, 500);
      } else {
        status.textContent =
          "⚠️ Escaneo automático no disponible. " +
          "Usa Exportar/Importar archivo como alternativa.";
      }
    })
    .catch(function (err) {
      console.error("Cámara error:", err);
      status.textContent = "❌ No se pudo acceder a la cámara";
    });
}

function detenerCamara() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  if (camaraStream) {
    camaraStream.getTracks().forEach(function (t) {
      t.stop();
    });
    camaraStream = null;
  }
  var video = document.getElementById("qrVideo");
  if (video) video.srcObject = null;
}

// =============================================
//  PROCESAR QR ESCANEADO
// =============================================
function procesarQREscaneado(texto) {
  try {
    var data = JSON.parse(texto);

    if (data.v !== 1 || !Array.isArray(data.p)) {
      showToast("QR no válido para esta app");
      return;
    }

    detenerCamara();

    var continuar = confirm(
      "¿Importar datos?\n\n" +
      "Familia: " + (data.f || "(sin nombre)") + "\n" +
      "Productos: " + (data.p ? data.p.length : 0) + "\n" +
      "Historial: " + (data.h ? data.h.length : 0) + " compras\n\n" +
      "⚠️ Esto REEMPLAZARÁ tus datos actuales"
    );

    if (!continuar) return;

    // IMPORTAR
    state.familia = data.f || "";
    state.productos = data.p || [];
    state.historial = data.h || [];

    guardarDatos();

    // Actualizar UI
    var titulo = document.getElementById("familiaTitulo");
    var input = document.getElementById("familiaNombre");
    if (titulo) titulo.textContent = state.familia ? "Familia: " + state.familia : "";
    if (input) input.value = state.familia;

    renderProductos();
    renderPendientes();
    renderHistorial();
    cerrarModalQR();
    showToast("✅ Datos importados correctamente");
  } catch (e) {
    console.error("QR parse error:", e);
    showToast("QR inválido o dañado");
  }
}

// =============================================
//  COMPARTIR LISTA
// =============================================
function compartirLista() {
  var pendientes = state.productos.filter(function (p) {
    return p.porAcabar || p.cantidad === 0;
  });

  if (pendientes.length === 0) {
    showToast("No hay pendientes para compartir");
    return;
  }

  var texto = "🛒 *Lista de compras*\n";
  if (state.familia) texto += "👨‍👩‍👧 Familia: " + state.familia + "\n";
  texto += "\n";

  // Agrupar por categoría
  var grupos = {};
  pendientes.forEach(function (p) {
    if (!grupos[p.categoria]) grupos[p.categoria] = [];
    grupos[p.categoria].push(p);
  });

  var cats = Object.keys(grupos);
  cats.forEach(function (cat) {
    texto += "*" + cat + ":*\n";
    grupos[cat].forEach(function (p) {
      texto += "  • " + p.nombre + " x" + p.cantidad + "\n";
    });
    texto += "\n";
  });

  if (navigator.share) {
    navigator.share({ title: "Lista de Compras", text: texto }).catch(function () {});
  } else {
    navigator.clipboard.writeText(texto).then(function () {
      showToast("📋 Lista copiada al portapapeles");
    });
  }
}

// =============================================
//  NOTIFICACIONES
// =============================================
function activarRecordatorio() {
  var pendientes = state.productos.filter(function (p) {
    return p.porAcabar;
  });

  if (pendientes.length === 0) {
    showToast("No hay pendientes para recordar");
    return;
  }

  if (!("Notification" in window)) {
    showToast("Tu navegador no soporta notificaciones");
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission().then(function (permiso) {
      if (permiso === "granted") {
        enviarNotificacion(pendientes.length);
      } else {
        showToast("Permiso denegado");
      }
    });
  } else if (Notification.permission === "granted") {
    enviarNotificacion(pendientes.length);
  } else {
    showToast("Notificaciones bloqueadas en ajustes del navegador");
  }
}

function enviarNotificacion(cantidad) {
  new Notification("🛒 Recordatorio de Mercado", {
    body: "Tienes " + cantidad + " producto(s) por comprar",
    tag: "mercado-recordatorio"
  });
  showToast("🔔 Notificación enviada");
}

// =============================================
//  UTILIDADES
// =============================================
function showToast(msg) {
  var t = document.getElementById("toast");
  if (!t) return;

  t.textContent = msg;
  t.classList.add("show");

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(function () {
    t.classList.remove("show");
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}