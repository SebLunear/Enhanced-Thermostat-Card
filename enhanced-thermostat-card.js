class EnhancedThermostatCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Il faut définir 'entity' (climate.xxx)");
    }
    this._config = config;
    this._step = config.step || 0.5;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this._buildStaticDom();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._climateHistoryCard) this._climateHistoryCard.hass = hass;
    if (this._dehumidifierHistoryCard) this._dehumidifierHistoryCard.hass = hass;
    this._render();
    this._ensureHistoryCards();
  }

  async _ensureHistoryCards() {
    if (this._historyCardsRequested) return;
    if (this._config.show_history === false) return;
    if (!window.loadCardHelpers) return;
    this._historyCardsRequested = true;

    const helpers = await window.loadCardHelpers();
    const container = this.shadowRoot.querySelector(".history-section");
    if (!container) return;

    this._climateHistoryCard = helpers.createCardElement({
      type: "history-graph",
      show_names: false,
      entities: [{ entity: this._config.entity }],
      grid_options: { columns: 6, rows: 2 },
    });
    this._climateHistoryCard.hass = this._hass;
    container.appendChild(this._climateHistoryCard);

    if (this._config.dehumidifier_entity) {
      this._dehumidifierHistoryCard = helpers.createCardElement({
        type: "history-graph",
        show_names: false,
        entities: [{ entity: this._config.dehumidifier_entity }],
        grid_options: { columns: 6, rows: 2 },
      });
      this._dehumidifierHistoryCard.hass = this._hass;
      container.appendChild(this._dehumidifierHistoryCard);
    }
  }

  getCardSize() {
    // Base : header + arc + boutons +/- + boutons de mode + paddings
    let size = 9;
    if (this._config && (this._config.door_entity || this._config.window_entity || this._config.humidity_entity || this._config.dehumidifier_entity)) {
      size += 4;
    }
    if (this._config && this._config.show_history !== false) {
      size += 3;
      if (this._config.dehumidifier_entity) size += 3;
    }
    return size;
  }

  static getConfigElement() {
    return document.createElement("enhanced-thermostat-card-editor");
  }

  static getStubConfig(hass) {
    const climateEntities = hass ? Object.keys(hass.states).filter((e) => e.startsWith("climate.")) : [];
    return {
      entity: climateEntities[0] || "",
      name: "Climatisation",
    };
  }

  _buildStaticDom() {
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          container-type: inline-size;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }
        .header {
          position: relative;
          display: flex;
          justify-content: center;
          padding-right: 36px;
          box-sizing: border-box;
          gap: 8px;
          font-size: 1.15rem;
        }
        .header .name {
          text-align: center;
          white-space: normal;
          word-break: break-word;
          line-height: 1.25;
          padding-top: 2px;
        }
        .header ha-icon-button {
          position: absolute;
          top: 0;
          right: 0;
          width: 32px;
          height: 32px;
          --mdc-icon-button-size: 32px;
          color: var(--secondary-text-color);
          cursor: pointer;
        }
        .dial-wrap {
          display: flex;
          justify-content: center;
          margin: -8px -16px;
          box-sizing: border-box;
        }
        .dial {
          container-type: inline-size;
          position: relative;
          width: 100%;
          max-width: 400px;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          cursor: pointer;
        }
        .dial svg { width: 100%; height: 100%; transform: rotate(0deg); }
        .dial-bg { fill: none; stroke: var(--disabled-text-color); opacity: 0.25; stroke-width: 12; stroke-linecap: round; }
        .dial-fg { fill: none; stroke-width: 12; stroke-linecap: round; transition: stroke 0.3s ease; }
        .dial-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px;
          padding: 0 15cqw;
          box-sizing: border-box;
        }
        .dial-state { color: var(--secondary-text-color); font-size: clamp(0.65rem, 8cqw, 0.95rem); margin-bottom: 4px; }
        .dial-current {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-size: clamp(1.3rem, 22cqw, 2.6rem);
          font-weight: 400;
          color: var(--primary-text-color);
          line-height: 1;
        }
        .dial-current-int { font-size: 1em; }
        .dial-current-suffix {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-left: 2px;
          line-height: 1;
        }
        .dial-current-suffix .unit { font-size: 0.36em; }
        .dial-current-suffix .dial-current-dec { font-size: 0.5em; margin-top: 0.1em; }
        .dial-target { font-size: clamp(0.6rem, 7cqw, 0.9rem); font-weight: 500; margin-top: 6px; display: flex; align-items: center; gap: 4px; }
        .dial-target ha-icon { width: 1em; height: 1em; }
        .dial-controls {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: -16px;
        }
        .dial-controls button {
          width: 48px; height: 48px; border-radius: 50%;
          border: 2px solid var(--divider-color);
          background: transparent;
          color: var(--primary-text-color);
          font-size: 1.3rem;
          cursor: pointer;
          flex-shrink: 0;
        }
        .extra-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--secondary-background-color);
          border-radius: 12px;
          padding: 10px 14px;
        }
        .extra-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          color: var(--secondary-text-color);
          font-size: 0.9rem;
        }
        .extra-item.hidden { visibility: hidden; }
        .extra-item ha-icon { color: var(--secondary-text-color); flex-shrink: 0; }
        .extra-item.active ha-icon { color: #e8c84a; }
        .modes {
          display: flex;
          gap: clamp(4px, 2cqw, 8px);
          background: var(--secondary-background-color);
          border-radius: 16px;
          padding: 6px;
        }
        .mode-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: clamp(6px, 3cqw, 10px);
          border-radius: 12px;
          cursor: pointer;
          color: var(--secondary-text-color);
          min-width: 0;
        }
        .mode-btn ha-icon { flex-shrink: 0; }
        .mode-btn.selected { color: white; }
        .history-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      </style>
      <ha-card>
        <div class="header">
          <span class="name"></span>
          <ha-icon-button class="more-info">
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
        </div>
        <div class="dial-wrap">
          <div class="dial">
            <svg viewBox="0 0 200 200">
              <path class="dial-bg" d="M 40 160 A 80 80 0 1 1 160 160" />
              <path class="dial-fg" d="M 40 160 A 80 80 0 1 1 160 160" />
            </svg>
            <div class="dial-center">
              <div class="dial-state"></div>
              <div class="dial-current"><span class="dial-current-int"></span><span class="dial-current-suffix"><span class="unit">°C</span><span class="dial-current-dec"></span></span></div>
              <div class="dial-target"></div>
            </div>
          </div>
        </div>
        <div class="dial-controls">
          <button class="minus">−</button>
          <button class="plus">+</button>
        </div>
        <div class="extra-row">
          <div class="extra-item door-item">
            <ha-icon class="door-icon" icon="mdi:door-closed"></ha-icon>
            <span class="door-label"></span>
          </div>
          <div class="extra-item window-item">
            <ha-icon class="window-icon" icon="mdi:window-closed"></ha-icon>
            <span class="window-label"></span>
          </div>
          <div class="extra-item humidity-item">
            <ha-icon icon="mdi:water-percent"></ha-icon>
            <span class="humidity-label"></span>
          </div>
          <div class="extra-item dehumidifier-item">
            <ha-icon class="dehumidifier-icon" icon="mdi:air-humidifier-off"></ha-icon>
            <span class="dehumidifier-label"></span>
          </div>
        </div>
        <div class="modes"></div>
        <div class="history-section"></div>
      </ha-card>
    `;

    this.shadowRoot.querySelector(".more-info").addEventListener("click", () =>
      this._fireMoreInfo(this._config.entity)
    );
    this.shadowRoot.querySelector(".dial").addEventListener("click", (evt) =>
      this._handleDialClick(evt)
    );
    this.shadowRoot.querySelector(".door-item").addEventListener("click", () =>
      this._fireMoreInfo(this._config.door_entity)
    );
    this.shadowRoot.querySelector(".window-item").addEventListener("click", () =>
      this._fireMoreInfo(this._config.window_entity)
    );
    this.shadowRoot.querySelector(".humidity-item").addEventListener("click", () =>
      this._fireMoreInfo(this._config.humidity_entity)
    );
    this.shadowRoot.querySelector(".dehumidifier-item").addEventListener("click", () =>
      this._toggleDehumidifier()
    );
    this.shadowRoot.querySelector(".minus").addEventListener("click", () => this._setTemp(-this._step));
    this.shadowRoot.querySelector(".plus").addEventListener("click", () => this._setTemp(this._step));
  }

  _fireMoreInfo(entityId) {
    if (!entityId) return;
    const event = new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId },
    });
    this.shadowRoot.dispatchEvent(event);
  }

  _toggleDehumidifier() {
    const entityId = this._config.dehumidifier_entity;
    if (!entityId || !this._hass) return;
    const domain = entityId.split(".")[0];
    this._hass.callService(domain, "toggle", { entity_id: entityId });
  }

  _setTemp(delta) {
    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;
    const current = stateObj.attributes.temperature;
    if (current === undefined) return;
    const min = stateObj.attributes.min_temp ?? 7;
    const max = stateObj.attributes.max_temp ?? 35;
    const next = Math.min(max, Math.max(min, Math.round((current + delta) * 2) / 2));
    this._hass.callService("climate", "set_temperature", {
      entity_id: this._config.entity,
      temperature: next,
    });
  }

  // Clic sur l'anneau : convertit la position du clic en température,
  // comme sur la carte thermostat native (même effet que + / -).
  _handleDialClick(evt) {
    const stateObj = this._hass && this._hass.states[this._config.entity];
    if (!stateObj || stateObj.state === "off") return;

    const dial = this.shadowRoot.querySelector(".dial");
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = evt.clientX - cx;
    const dy = evt.clientY - cy;

    // Ignore les clics trop proches du centre (zone d'affichage du texte),
    // seule la couronne visible doit réagir.
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < rect.width * 0.28) return;

    // L'arc va de 135° à 405° (135° + 270°) en sens horaire, dans le
    // référentiel écran (y vers le bas). Le vide de 90° est en bas.
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    let rel = angle - 135;
    if (rel < 0) rel += 360;

    let ratio;
    if (rel > 270) {
      // Clic dans la zone du vide : on rattache au bord le plus proche.
      ratio = rel - 270 < 360 - rel ? 1 : 0;
    } else {
      ratio = rel / 270;
    }

    const min = stateObj.attributes.min_temp ?? 7;
    const max = stateObj.attributes.max_temp ?? 35;
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / this._step) * this._step;
    const clamped = Math.min(max, Math.max(min, stepped));

    this._hass.callService("climate", "set_temperature", {
      entity_id: this._config.entity,
      temperature: clamped,
    });
  }

  static _modeMeta(mode) {
    const map = {
      heat: { icon: "mdi:fire", color: "#e5484d", selectedBg: "#e5484d", selectedFg: "#ffffff" },
      cool: { icon: "mdi:snowflake", color: "#4aa8ff", selectedBg: "#4aa8ff", selectedFg: "#ffffff" },
      off: { icon: "mdi:power", color: "var(--secondary-text-color)", selectedBg: "#d4d7dc", selectedFg: "#20232a" },
      auto: { icon: "mdi:autorenew", color: "#4aa8ff", selectedBg: "#4aa8ff", selectedFg: "#ffffff" },
      dry: { icon: "mdi:water-percent", color: "#4aa8ff", selectedBg: "#4aa8ff", selectedFg: "#ffffff" },
      fan_only: { icon: "mdi:fan", color: "#4aa8ff", selectedBg: "#4aa8ff", selectedFg: "#ffffff" },
    };
    return map[mode] || { icon: "mdi:help", color: "var(--secondary-text-color)", selectedBg: "var(--primary-color)", selectedFg: "#ffffff" };
  }

  // Ordre d'affichage souhaité : chaud, froid, arrêt, puis le reste
  static _orderModes(modes) {
    const priority = ["heat", "cool", "off"];
    const known = priority.filter((m) => modes.includes(m));
    const rest = modes.filter((m) => !priority.includes(m));
    return [...known, ...rest];
  }

  _fmt(value, decimals = 1) {
    if (value === undefined || value === null) return "--";
    return Number(value).toFixed(decimals).replace(".", ",");
  }

  // Sépare la partie entière et la décimale pour un affichage à deux tailles,
  // comme sur la carte thermostat native.
  _fmtParts(value, decimals = 1) {
    if (value === undefined || value === null) return { int: "--", dec: "" };
    const [int, dec] = Number(value).toFixed(decimals).split(".");
    return { int, dec: dec ? `,${dec}` : "" };
  }

  _render() {
    if (!this._hass || !this._config) return;
    const root = this.shadowRoot;
    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) {
      root.querySelector(".name").textContent = "Entité introuvable";
      return;
    }

    const name = this._config.name || stateObj.attributes.friendly_name || "";
    root.querySelector(".name").textContent = name;

    const hvacMode = stateObj.state;
    const hvacAction = stateObj.attributes.hvac_action;
    const targetTemp = stateObj.attributes.temperature;
    const currentTemp = stateObj.attributes.current_temperature;
    const stateLabel = hvacAction
      ? this._hass.formatEntityAttributeValue
        ? this._hass.formatEntityAttributeValue(stateObj, "hvac_action")
        : hvacAction
      : (hvacMode === "off" ? "Inactif" : hvacMode);

    const meta = EnhancedThermostatCard._modeMeta(hvacMode);

    root.querySelector(".dial-state").textContent = stateLabel;
    const currentParts = this._fmtParts(currentTemp);
    root.querySelector(".dial-current-int").textContent = currentParts.int;
    root.querySelector(".dial-current-dec").textContent = currentParts.dec;
    const targetEl = root.querySelector(".dial-target");
    const isOff = hvacMode === "off";
    targetEl.style.display = isOff ? "none" : "flex";
    targetEl.textContent = targetTemp !== undefined ? `${this._fmt(targetTemp)} °C` : "";
    targetEl.style.color = isOff ? "var(--secondary-text-color)" : meta.color;
    root.querySelector(".dial-controls").style.display = isOff ? "none" : "flex";

    const fg = root.querySelector(".dial-fg");
    fg.style.stroke = hvacMode === "off" ? "var(--disabled-text-color)" : meta.color;

    // Remplissage de l'arc en fonction de la position de la consigne entre min_temp et max_temp
    const min = stateObj.attributes.min_temp ?? 7;
    const max = stateObj.attributes.max_temp ?? 35;
    const ratio = targetTemp !== undefined ? Math.min(1, Math.max(0, (targetTemp - min) / (max - min))) : 0;
    const totalLength = fg.getTotalLength ? fg.getTotalLength() : 340;
    fg.style.strokeDasharray = `${totalLength}`;
    fg.style.strokeDashoffset = `${totalLength * (1 - ratio)}`;

    // Porte / fenêtre
    const doorState = this._config.door_entity ? this._hass.states[this._config.door_entity] : null;
    const windowState = this._config.window_entity ? this._hass.states[this._config.window_entity] : null;
    const humidityState = this._config.humidity_entity ? this._hass.states[this._config.humidity_entity] : null;
    const dehumidifierState = this._config.dehumidifier_entity ? this._hass.states[this._config.dehumidifier_entity] : null;

    const doorOpen = doorState && ["on", "open"].includes(doorState.state);
    const windowOpen = windowState && ["on", "open"].includes(windowState.state);

    const doorItem = root.querySelector(".door-item");
    const windowItem = root.querySelector(".window-item");
    doorItem.classList.toggle("hidden", !doorState);
    windowItem.classList.toggle("hidden", !windowState);
    doorItem.classList.toggle("active", !!doorOpen);
    windowItem.classList.toggle("active", !!windowOpen);
    root.querySelector(".door-label").textContent = doorOpen ? "Ouverte" : "Fermée";
    root.querySelector(".window-label").textContent = windowOpen ? "Ouverte" : "Fermée";
    root.querySelector(".door-icon").setAttribute("icon", doorOpen ? "mdi:door-open" : "mdi:door-closed");
    root.querySelector(".window-icon").setAttribute("icon", windowOpen ? "mdi:window-open" : "mdi:window-closed");

    const humidityItem = root.querySelector(".humidity-item");
    humidityItem.classList.toggle("hidden", !humidityState);
    root.querySelector(".humidity-label").textContent = humidityState ? `${humidityState.state}%` : "";

    const dehumidifierOn = dehumidifierState && ["on", "true"].includes(dehumidifierState.state);
    const dehumidifierItem = root.querySelector(".dehumidifier-item");
    dehumidifierItem.classList.toggle("hidden", !dehumidifierState);
    dehumidifierItem.classList.toggle("active", !!dehumidifierOn);
    root.querySelector(".dehumidifier-icon").setAttribute(
      "icon", dehumidifierOn ? "mdi:air-humidifier" : "mdi:air-humidifier-off"
    );
    root.querySelector(".dehumidifier-label").textContent = dehumidifierOn ? "Marche" : "Arrêt";

    const anyExtra = !!(doorState || windowState || humidityState || dehumidifierState);
    root.querySelector(".extra-row").style.display = anyExtra ? "flex" : "none";

    // Boutons de mode : chaud / froid / arrêt, dans cet ordre
    const modes = EnhancedThermostatCard._orderModes(stateObj.attributes.hvac_modes || []);
    const modesEl = root.querySelector(".modes");
    modesEl.innerHTML = "";
    modes.forEach((mode) => {
      const m = EnhancedThermostatCard._modeMeta(mode);
      const btn = document.createElement("div");
      const isSelected = mode === hvacMode;
      btn.className = "mode-btn" + (isSelected ? " selected" : "");
      if (isSelected) {
        btn.style.background = m.selectedBg;
        btn.style.color = m.selectedFg;
      }
      btn.innerHTML = `<ha-icon icon="${m.icon}"></ha-icon>`;
      btn.addEventListener("click", () => {
        this._hass.callService("climate", "set_hvac_mode", {
          entity_id: this._config.entity,
          hvac_mode: mode,
        });
      });
      modesEl.appendChild(btn);
    });
  }
}

customElements.define("enhanced-thermostat-card", EnhancedThermostatCard);

// ---- Éditeur visuel (formulaire dans l'éditeur de carte HA) ----
class EnhancedThermostatCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  _schema() {
    return [
      { name: "entity", required: true, selector: { entity: { domain: "climate" } } },
      { name: "name", selector: { text: {} } },
      { name: "door_entity", selector: { entity: { domain: "binary_sensor" } } },
      { name: "window_entity", selector: { entity: { domain: "binary_sensor" } } },
      { name: "humidity_entity", selector: { entity: { domain: "sensor" } } },
      { name: "dehumidifier_entity", selector: { entity: { domain: ["switch", "humidifier"] } } },
      { name: "step", selector: { number: { min: 0.5, max: 5, step: 0.5, mode: "box" } } },
      { name: "show_history", selector: { boolean: {} } },
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const event = new CustomEvent("config-changed", {
          bubbles: true, composed: true,
          detail: { config: ev.detail.value },
        });
        this.dispatchEvent(event);
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = this._schema();
    this._form.computeLabel = (schema) => {
      const labels = {
        entity: "Entité climatisation",
        name: "Nom",
        door_entity: "Entité porte",
        window_entity: "Entité fenêtre",
        humidity_entity: "Entité humidité",
        dehumidifier_entity: "Entité déshumidificateur",
        step: "Pas de température (°C)",
        show_history: "Afficher les graphiques d'historique",
      };
      return labels[schema.name] || schema.name;
    };
  }
}

customElements.define("enhanced-thermostat-card-editor", EnhancedThermostatCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "enhanced-thermostat-card",
  name: "Enhanced Thermostat Card",
  description: "Carte thermostat avec porte, fenêtre et humidité",
});
