class ClimatePlusCard extends HTMLElement {
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

  _buildStaticDom() {
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.1rem;
        }
        .header ha-icon-button {
          --mdc-icon-button-size: 32px;
          color: var(--secondary-text-color);
          cursor: pointer;
        }
        .dial-wrap {
          display: flex;
          justify-content: center;
        }
        .dial {
          position: relative;
          width: 220px;
          height: 220px;
        }
        .dial svg { width: 100%; height: 100%; transform: rotate(135deg); }
        .dial-bg { fill: none; stroke: var(--disabled-text-color); opacity: 0.25; stroke-width: 12; stroke-linecap: round; }
        .dial-fg { fill: none; stroke-width: 12; stroke-linecap: round; transition: stroke 0.3s ease; }
        .dial-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px;
        }
        .dial-state { color: var(--secondary-text-color); font-size: 0.95rem; }
        .dial-temp-row { display: flex; align-items: center; gap: 10px; }
        .dial-temp-row button {
          width: 30px; height: 30px; border-radius: 50%; border: none;
          background: var(--secondary-background-color);
          color: var(--primary-text-color); font-size: 1rem; cursor: pointer;
        }
        .dial-temp { font-size: 2.6rem; font-weight: 400; color: var(--primary-text-color); position: relative; }
        .dial-temp sup { font-size: 1rem; position: absolute; top: 6px; }
        .extra-row {
          display: flex;
          gap: 8px;
          background: var(--secondary-background-color);
          border-radius: 12px;
          padding: 10px 14px;
          justify-content: space-around;
        }
        .extra-item { display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--secondary-text-color); font-size: 0.9rem; }
        .extra-item ha-icon { color: var(--secondary-text-color); }
        .extra-item.active ha-icon { color: #e8c84a; }
        .modes {
          display: flex;
          gap: 8px;
          background: var(--secondary-background-color);
          border-radius: 16px;
          padding: 6px;
        }
        .mode-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 10px;
          border-radius: 12px;
          cursor: pointer;
          color: var(--secondary-text-color);
        }
        .mode-btn.selected { background: var(--primary-color); color: white; }
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
              <div class="dial-temp-row">
                <button class="minus">−</button>
                <div class="dial-temp"></div>
                <button class="plus">+</button>
              </div>
            </div>
          </div>
        </div>
        <div class="extra-row">
          <div class="extra-item door-item">
            <ha-icon icon="mdi:door"></ha-icon>
            <span class="door-label"></span>
          </div>
          <div class="extra-item window-item">
            <ha-icon icon="mdi:window-open-variant"></ha-icon>
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
    const temp = stateObj.attributes.temperature;
    const stateLabel = hvacAction
      ? this._hass.formatEntityAttributeValue
        ? this._hass.formatEntityAttributeValue(stateObj, "hvac_action")
        : hvacAction
      : (hvacMode === "off" ? "Inactif" : hvacMode);

    root.querySelector(".dial-state").textContent = stateLabel;
    root.querySelector(".dial-temp").innerHTML =
      temp !== undefined ? `${temp}<sup>°C</sup>` : "--";

    const meta = ClimatePlusCard._modeMeta(hvacMode);
    const fg = root.querySelector(".dial-fg");
    fg.style.stroke = hvacMode === "off" ? "var(--disabled-text-color)" : meta.color;

    // Remplissage de l'arc en fonction de la position de temp entre min_temp et max_temp
    const min = stateObj.attributes.min_temp ?? 7;
    const max = stateObj.attributes.max_temp ?? 35;
    const ratio = temp !== undefined ? Math.min(1, Math.max(0, (temp - min) / (max - min))) : 0;
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

    const humidityItem = root.querySelector(".humidity-item");
    humidityItem.style.display = humidityState ? "flex" : "none";
    root.querySelector(".humidity-label").textContent = humidityState ? `${humidityState.state}%` : "";

    // Boutons de mode
    const modes = stateObj.attributes.hvac_modes || [];
    const modesEl = root.querySelector(".modes");
    modesEl.innerHTML = "";
    modes.forEach((mode) => {
      const m = ClimatePlusCard._modeMeta(mode);
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

customElements.define("climate-plus-card", ClimatePlusCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "climate-plus-card",
  name: "Climate Plus Card",
  description: "Carte thermostat avec porte, fenêtre et humidité",
});
