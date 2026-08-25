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
    this._render();
  }

  getCardSize() {
    return 4;
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
          display: grid;
          grid-template-columns: 28px 1fr 28px;
          align-items: center;
          column-gap: 4px;
          font-size: clamp(0.85rem, 5.5cqw, 1.1rem);
          min-height: 32px;
        }
        .header .name {
          grid-column: 2;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .header ha-icon-button {
          grid-column: 3;
          justify-self: end;
          --mdc-icon-button-size: 28px;
          color: var(--secondary-text-color);
          cursor: pointer;
        }
        .dial-wrap {
          display: flex;
          justify-content: center;
          padding: 0 8px;
          box-sizing: border-box;
        }
        .dial {
          container-type: inline-size;
          position: relative;
          width: 100%;
          max-width: 220px;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
        }
        .dial svg { width: 100%; height: 100%; transform: rotate(0deg); }
        .dial-bg { fill: none; stroke: var(--disabled-text-color); opacity: 0.25; stroke-width: 12; stroke-linecap: round; }
        .dial-fg { fill: none; stroke-width: 12; stroke-linecap: round; transition: stroke 0.3s ease; }
        .dial-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px;
          padding: 0 20cqw;
          box-sizing: border-box;
        }
        .dial-state { color: var(--secondary-text-color); font-size: clamp(0.65rem, 8cqw, 0.95rem); margin-bottom: 4px; }
        .dial-current { font-size: clamp(1.3rem, 22cqw, 2.6rem); font-weight: 400; color: var(--primary-text-color); position: relative; line-height: 1; }
        .dial-current sup { font-size: 0.4em; position: relative; top: -0.9em; margin-left: 2px; }
        .dial-target { font-size: clamp(0.6rem, 7cqw, 0.9rem); font-weight: 500; margin-top: 6px; display: flex; align-items: center; gap: 4px; }
        .dial-target ha-icon { width: 1em; height: 1em; }
        .dial-controls {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: -8px;
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
          flex-wrap: wrap;
          gap: 8px;
          background: var(--secondary-background-color);
          border-radius: 12px;
          padding: 10px 14px;
          justify-content: center;
        }
        .extra-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          color: var(--secondary-text-color);
          font-size: 0.9rem;
          flex: 1 1 auto;
          min-width: 90px;
        }
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
        .mode-btn.selected { background: var(--primary-color); color: white; }
      </style>
      <ha-card>
        <div class="header">
          <span class="header-spacer"></span>
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
              <div class="dial-current"><span class="dial-current-value"></span><sup>°C</sup></div>
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
        </div>
        <div class="modes"></div>
      </ha-card>
    `;

    this.shadowRoot.querySelector(".more-info").addEventListener("click", () =>
      this._fireMoreInfo(this._config.entity)
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

  _setTemp(delta) {
    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;
    const current = stateObj.attributes.temperature;
    if (current === undefined) return;
    this._hass.callService("climate", "set_temperature", {
      entity_id: this._config.entity,
      temperature: Math.round((current + delta) * 2) / 2,
    });
  }

  static _modeMeta(mode) {
    const map = {
      heat: { icon: "mdi:fire", color: "#ff8a3d" },
      cool: { icon: "mdi:snowflake", color: "#4aa8ff" },
      off: { icon: "mdi:power", color: "var(--secondary-text-color)" },
      auto: { icon: "mdi:autorenew", color: "#4aa8ff" },
      dry: { icon: "mdi:water-percent", color: "#4aa8ff" },
      fan_only: { icon: "mdi:fan", color: "#4aa8ff" },
    };
    return map[mode] || { icon: "mdi:help", color: "var(--secondary-text-color)" };
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
    root.querySelector(".dial-current-value").textContent = this._fmt(currentTemp);
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

    const doorOpen = doorState && ["on", "open"].includes(doorState.state);
    const windowOpen = windowState && ["on", "open"].includes(windowState.state);

    const doorItem = root.querySelector(".door-item");
    const windowItem = root.querySelector(".window-item");
    doorItem.style.display = doorState ? "flex" : "none";
    windowItem.style.display = windowState ? "flex" : "none";
    doorItem.classList.toggle("active", !!doorOpen);
    windowItem.classList.toggle("active", !!windowOpen);
    root.querySelector(".door-label").textContent = doorOpen ? "Ouverte" : "Fermée";
    root.querySelector(".window-label").textContent = windowOpen ? "Ouverte" : "Fermée";
    root.querySelector(".door-icon").setAttribute("icon", doorOpen ? "mdi:door-open" : "mdi:door-closed");
    root.querySelector(".window-icon").setAttribute("icon", windowOpen ? "mdi:window-open" : "mdi:window-closed");

    const humidityItem = root.querySelector(".humidity-item");
    humidityItem.style.display = humidityState ? "flex" : "none";
    root.querySelector(".humidity-label").textContent = humidityState ? `${humidityState.state}%` : "";

    // Boutons de mode : chaud / froid / arrêt, dans cet ordre
    const modes = EnhancedThermostatCard._orderModes(stateObj.attributes.hvac_modes || []);
    const modesEl = root.querySelector(".modes");
    modesEl.innerHTML = "";
    modes.forEach((mode) => {
      const m = EnhancedThermostatCard._modeMeta(mode);
      const btn = document.createElement("div");
      btn.className = "mode-btn" + (mode === hvacMode ? " selected" : "");
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
      { name: "step", selector: { number: { min: 0.5, max: 5, step: 0.5, mode: "box" } } },
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
        step: "Pas de température (°C)",
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
