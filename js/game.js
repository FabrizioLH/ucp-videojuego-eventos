
(() => {
  const DURACION_PARTIDA_MS = 60_000;
  const PUNTOS_TRIANGULO = 10;
  const PUNTOS_CUADRADO = -5;
  const TAM_OBJETIVO = 56;
  const MARGEN = 12;

  const pantallas = {
    menu: document.getElementById("menu-principal"),
    juego: document.getElementById("pantalla-juego"),
    resultados: document.getElementById("resultados-partida"),
    estadisticas: document.getElementById("estadisticas-totales"),
  };

  const el = {
    puntuacion: document.getElementById("puntuacion"),
    tiempo: document.getElementById("tiempo"),
    areaJuego: document.getElementById("area-juego"),
    hudTimer: document.querySelector(".hud__item--timer"),
    resPuntuacion: document.getElementById("res-puntuacion"),
    resTriangulos: document.getElementById("res-triangulos"),
    resCuadrados: document.getElementById("res-cuadrados"),
    resTiempo: document.getElementById("res-tiempo"),
    totalPartidas: document.getElementById("total-partidas"),
    totalTiempo: document.getElementById("total-tiempo"),
    totalTriangulos: document.getElementById("total-triangulos"),
    totalCuadrados: document.getElementById("total-cuadrados"),
    totalPuntuacion: document.getElementById("total-puntuacion"),
    totalPuntuacionMax: document.getElementById("total-puntuacion-max"),
  };

  let estado = null;
  let timerInterval = null;

  // VARIABLES PARA WEBSOCKET
  let socket = null;
  let nombreJugador = "Jugador Anonimo";

  // Inicializar conexión con el servidor de la UCP
  // Inicializar conexión con el servidor de la UCP
  function conectarWebSocket() {
    socket = new WebSocket('wss://gamehubmanager.azurewebsites.net/ws');

    // Capturamos el contenedor de la lista en la UI
    const listaNode = document.getElementById("ranking-lista-rt");

    socket.onopen = () => {
      console.log('📡 Conectado al servidor de WebSocket de la UCP');
    };

    socket.onmessage = (event) => {
      try {
        const datosRanking = JSON.parse(event.data);
        actualizarRankingUI(datosRanking);
      } catch (error) {
        console.error('Error al procesar el ranking entrante:', error);
      }
    };

    socket.onclose = () => {
      console.log('🔌 Conexión cerrada. Intentando reconectar en 3 segundos...');
      
      // NUEVO: Avisar visualmente en la interfaz que se perdió la conexión
      if (listaNode) {
        listaNode.innerHTML = `<li style="color: var(--muted); list-style: none; font-size: 0.85rem;">
          ⚠️ Desconectado del servidor. Reconectando...
        </li>`;
      }
      
      setTimeout(conectarWebSocket, 3000); // Reconexión automática
    };

    socket.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error);
      
      // NUEVO: Avisar visualmente que el servidor está inaccesible o caído
      if (listaNode) {
        listaNode.innerHTML = `<li style="color: var(--danger); list-style: none; font-size: 0.85rem;">
          ❌ Servidor de ranking fuera de línea.
        </li>`;
      }
    };
  }

  // Renderizar la lista recibida por la red
  function actualizarRankingUI(ranking) {
    const listaNode = document.getElementById("ranking-lista-rt");
    if (!listaNode) return;

    listaNode.innerHTML = "";

    // Muestra los primeros 5 puestos
    ranking.slice(0, 5).forEach((item) => {
      const li = document.createElement("li");
      // Mapeamos dinámicamente por si las keys vienen con variaciones de mayúsculas (Player/Value)
      const nombre = item.Player || item.player || "Anónimo";
      const puntaje = item.Value !== undefined ? item.Value : (item.value !== undefined ? item.value : 0);
      
      li.innerHTML = `<strong>${nombre}</strong>: ${puntaje} pts`;
      listaNode.appendChild(li);
    });
  }

  // Enviar evento de actualización de posición al servidor
  function transmitirPuntajeRed(valorPuntaje) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const payload = {
      "game": "ReaccionRapida", // Nombre identificador de tu juego
      "event": "posicion",      // Evento solicitado en el TP
      "player": nombreJugador,
      "value": parseInt(valorPuntaje)
    };

    socket.send(JSON.stringify(payload));
  }

  function mostrarPantalla(nombre) {
    Object.entries(pantallas).forEach(([key, section]) => {
      const visible = key === nombre;
      section.classList.toggle("panel--hidden", !visible);
      section.setAttribute("aria-hidden", String(!visible));
    });
  }

  function formatearTiempo(ms) {
    const totalSeg = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSeg / 60);
    const seg = totalSeg % 60;
    return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  }

  function formatearDuracionLegible(ms) {
    const seg = Math.round(ms / 1000);
    if (seg < 60) return `${seg} s`;
    const min = Math.floor(seg / 60);
    const resto = seg % 60;
    return resto > 0 ? `${min} min ${resto} s` : `${min} min`;
  }

  const TAM_TRIANGULO = { ancho: 56, alto: 50 };
  const TAM_CUADRADO = { ancho: TAM_OBJETIVO, alto: TAM_OBJETIVO };
  const SEPARACION_MIN = 24;

  function obtenerDimensionesArea() {
    return {
      ancho: el.areaJuego.clientWidth,
      alto: el.areaJuego.clientHeight,
    };
  }

  function posicionAleatoria(anchoArea, altoArea, anchoObj, altoObj) {
    const maxX = anchoArea - anchoObj - MARGEN * 2;
    const maxY = altoArea - altoObj - MARGEN * 2;
    return {
      x: MARGEN + Math.random() * Math.max(0, maxX),
      y: MARGEN + Math.random() * Math.max(0, maxY),
    };
  }

  function rectangulosSolapan(a, b) {
    const pad = SEPARACION_MIN / 2;
    return !(
      a.x + a.ancho + pad <= b.x ||
      b.x + b.ancho + pad <= a.x ||
      a.y + a.alto + pad <= b.y ||
      b.y + b.alto + pad <= a.y
    );
  }

  function posicionesSinSolapar(ancho, alto) {
    const rectTri = () => ({
      ...posicionAleatoria(ancho, alto, TAM_TRIANGULO.ancho, TAM_TRIANGULO.alto),
      ancho: TAM_TRIANGULO.ancho,
      alto: TAM_TRIANGULO.alto,
    });
    const rectCuad = () => ({
      ...posicionAleatoria(ancho, alto, TAM_CUADRADO.ancho, TAM_CUADRADO.alto),
      ancho: TAM_CUADRADO.ancho,
      alto: TAM_CUADRADO.alto,
    });

    let tri = rectTri();
    let cuad = rectCuad();
    let intentos = 0;

    while (rectangulosSolapan(tri, cuad) && intentos < 50) {
      cuad = rectCuad();
      intentos++;
      if (intentos % 10 === 0) tri = rectTri();
    }

    return {
      triangulo: { x: tri.x, y: tri.y },
      cuadrado: { x: cuad.x, y: cuad.y },
    };
  }

  function crearObjetivo(tipo, x, y) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `objetivo objetivo--${tipo}`;
    node.setAttribute("aria-label", tipo === "triangulo" ? "Triángulo rojo" : "Cuadrado azul");
    node.dataset.tipo = tipo;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.addEventListener("click", (ev) => {
      ev.stopPropagation();
      destruirObjetivo(node);
    });
    return node;
  }

  function mostrarFlash(x, y, texto, positivo) {
    const flash = document.createElement("span");
    flash.className = `puntuacion-flash puntuacion-flash--${positivo ? "positivo" : "negativo"}`;
    flash.textContent = texto;
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    el.areaJuego.appendChild(flash);
    setTimeout(() => flash.remove(), 700);
  }

  function actualizarHud() {
    el.puntuacion.textContent = estado.puntuacion;
    const restante = Math.max(0, estado.finEn - Date.now());
    el.tiempo.textContent = formatearTiempo(restante);
    el.hudTimer.classList.toggle("hud__item--urgent", restante <= 10_000);
  }

  function spawnObjetivos() {
    el.areaJuego.querySelectorAll(".objetivo").forEach((n) => n.remove());

    const { ancho, alto } = obtenerDimensionesArea();
    if (ancho < 50 || alto < 50) {
      requestAnimationFrame(spawnObjetivos);
      return;
    }

    const { triangulo, cuadrado } = posicionesSinSolapar(ancho, alto);

    el.areaJuego.appendChild(crearObjetivo("triangulo", triangulo.x, triangulo.y));
    el.areaJuego.appendChild(crearObjetivo("cuadrado", cuadrado.x, cuadrado.y));
  }

  function destruirObjetivo(node) {
    if (!estado?.activo) return;

    const tipo = node.dataset.tipo;
    node.classList.add("objetivo--destruido");

    const rect = node.getBoundingClientRect();
    const areaRect = el.areaJuego.getBoundingClientRect();
    const cx = rect.left - areaRect.left + rect.width / 2;
    const cy = rect.top - areaRect.top;

    if (tipo === "triangulo") {
      estado.puntuacion += PUNTOS_TRIANGULO;
      estado.triangulos += 1;
      EventStore.record(EventStore.EVENT_TYPES.TRIANGLE_DESTROYED, {
        scoreDelta: PUNTOS_TRIANGULO,
        gameSessionId: estado.sessionId,
      });
      mostrarFlash(cx, cy, `+${PUNTOS_TRIANGULO}`, true);
    } else {
      estado.puntuacion += PUNTOS_CUADRADO;
      estado.cuadrados += 1;
      EventStore.record(EventStore.EVENT_TYPES.SQUARE_DESTROYED, {
        scoreDelta: PUNTOS_CUADRADO,
        gameSessionId: estado.sessionId,
      });
      mostrarFlash(cx, cy, String(PUNTOS_CUADRADO), false);
    }

    actualizarHud();

    // NUEVO: Transmitir el nuevo puntaje al servidor en tiempo real
    transmitirPuntajeRed(estado.puntuacion);

    setTimeout(() => {
      node.remove();
      if (estado?.activo) spawnObjetivos();
    }, 180);

    setTimeout(() => {
      node.remove();
      if (estado?.activo) spawnObjetivos();
    }, 180);
  }

  function finalizarPartida() {
    if (!estado?.activo) return;
    estado.activo = false;

    clearInterval(timerInterval);
    timerInterval = null;

    el.areaJuego.querySelectorAll(".objetivo").forEach((n) => n.remove());

    const duracionMs = Date.now() - estado.inicioEn;

    EventStore.record(EventStore.EVENT_TYPES.GAME_ENDED, {
      gameSessionId: estado.sessionId,
      score: estado.puntuacion,
      trianglesDestroyed: estado.triangulos,
      squaresDestroyed: estado.cuadrados,
      durationMs: duracionMs,
    });

    el.resPuntuacion.textContent = estado.puntuacion;
    el.resTriangulos.textContent = estado.triangulos;
    el.resCuadrados.textContent = estado.cuadrados;
    el.resTiempo.textContent = formatearDuracionLegible(duracionMs);

    mostrarPantalla("resultados");
    estado = null;
  }

  function iniciarPartida() {
    if (estado?.activo) return;

    // Solicitar nombre para el ranking de red
    const nombreIngresado = prompt("Ingresa tu nombre para el ranking:", nombreJugador);
    if (nombreIngresado && nombreIngresado.trim() !== "") {
      nombreJugador = nombreIngresado.trim();
    }

    const sessionId = crypto.randomUUID?.() ?? String(Date.now());

    estado = {
      activo: true,
      sessionId,
      puntuacion: 0,
      triangulos: 0,
      cuadrados: 0,
      inicioEn: Date.now(),
      finEn: Date.now() + DURACION_PARTIDA_MS,
    };

    EventStore.record(EventStore.EVENT_TYPES.GAME_STARTED, {
      gameSessionId: sessionId,
    });

    actualizarHud();
    mostrarPantalla("juego");
    requestAnimationFrame(() => spawnObjetivos());

    timerInterval = setInterval(() => {
      actualizarHud();
      if (Date.now() >= estado.finEn) finalizarPartida();
    }, 100);
  }

  function renderEstadisticasTotales() {
    const t = EventStore.computeTotals();
    el.totalPartidas.textContent = t.partidasJugadas;
    el.totalTiempo.textContent = formatearDuracionLegible(t.tiempoJugadoMs);
    el.totalTriangulos.textContent = t.triangulosDestruidos;
    el.totalCuadrados.textContent = t.cuadradosDestruidos;
    el.totalPuntuacion.textContent = t.puntuacionAcumulada;
    el.totalPuntuacionMax.textContent = t.puntuacionMaxima;
  }

  document.getElementById("btn-iniciar").addEventListener("click", iniciarPartida);
  document.getElementById("btn-jugar-otra").addEventListener("click", iniciarPartida);
  document.getElementById("btn-estadisticas").addEventListener("click", () => {
    renderEstadisticasTotales();
    mostrarPantalla("estadisticas");
  });
  document.getElementById("btn-volver-menu").addEventListener("click", () => mostrarPantalla("menu"));
  document.getElementById("btn-volver-desde-stats").addEventListener("click", () => mostrarPantalla("menu"));
  document.getElementById("btn-reset-stats").addEventListener("click", () => {
    if (confirm("¿Borrar todas las estadísticas guardadas? Esta acción no se puede deshacer.")) {
      EventStore.resetAll();
      renderEstadisticasTotales();
    }
  });

  EventStore.record(EventStore.EVENT_TYPES.APP_LOADED);
  // Conectar al servidor al cargar la aplicación
  conectarWebSocket();
  mostrarPantalla("menu");
})();
