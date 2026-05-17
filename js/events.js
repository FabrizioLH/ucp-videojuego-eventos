/**
 * Sistema de eventos persistidos en LocalStorage.
 * Cada acción relevante se registra y las estadísticas totales se derivan de ellos.
 */
const EventStore = (() => {
  const STORAGE_KEY = "reaccion_rapida_eventos";

  const EVENT_TYPES = {
    APP_LOADED: "app_loaded",
    GAME_STARTED: "game_started",
    GAME_ENDED: "game_ended",
    TRIANGLE_DESTROYED: "triangle_destroyed",
    SQUARE_DESTROYED: "square_destroyed",
    STATS_RESET: "stats_reset",
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { events: [] };
      const data = JSON.parse(raw);
      return Array.isArray(data.events) ? data : { events: [] };
    } catch {
      return { events: [] };
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function record(type, payload = {}) {
    const data = load();
    const event = {
      id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random(),
      type,
      timestamp: new Date().toISOString(),
      ...payload,
    };
    data.events.push(event);
    save(data);
    return event;
  }

  function getEvents() {
    return load().events;
  }

  function getEventsByType(type) {
    return getEvents().filter((e) => e.type === type);
  }

  function computeTotals() {
    const events = getEvents();
    let partidas = 0;
    let tiempoMs = 0;
    let triangulos = 0;
    let cuadrados = 0;
    let puntuacion = 0;

    for (const e of events) {
      switch (e.type) {
        case EVENT_TYPES.GAME_ENDED:
          partidas += 1;
          tiempoMs += e.durationMs ?? 0;
          puntuacion += e.score ?? 0;
          break;
        case EVENT_TYPES.TRIANGLE_DESTROYED:
          triangulos += 1;
          break;
        case EVENT_TYPES.SQUARE_DESTROYED:
          cuadrados += 1;
          break;
        default:
          break;
      }
    }

    return {
      partidasJugadas: partidas,
      tiempoJugadoMs: tiempoMs,
      triangulosDestruidos: triangulos,
      cuadradosDestruidos: cuadrados,
      puntuacionAcumulada: puntuacion,
    };
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    record(EVENT_TYPES.STATS_RESET);
  }

  return {
    EVENT_TYPES,
    record,
    getEvents,
    getEventsByType,
    computeTotals,
    resetAll,
  };
})();
