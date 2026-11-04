(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STORAGE_KEY = "secretSantaWheel.v1";
  const SOUND_KEY = "secretSantaWheel.sound";
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 16;
  const NAME_LIMIT = 18;

  const WEDGE_COLORS = [
    { fill: "#b7343f", text: "#fff6e4" },
    { fill: "#f3e3c3", text: "#133d32" },
    { fill: "#155647", text: "#fff6e4" },
    { fill: "#dfa84f", text: "#3b2611" }
  ];

  const AVATAR_COLORS = [
    "#f2ca76", "#e7a7a0", "#a8ceb8", "#eac77b", "#c9b6dc", "#f0b77e", "#9dc7c5", "#e8a9b1"
  ];

  const NUMBER_WORDS = [
    "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen"
  ];

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const dom = {
    stage: $("stage"),
    page: document.querySelector(".page"),
    starfield: $("starfield"),
    snowfall: $("snowfall"),
    soundToggle: $("soundToggle"),
    newGameBtn: $("newGameBtn"),
    howBtn: $("howBtn"),
    footerHowBtn: $("footerHowBtn"),
    setupIntro: $("setupIntro"),
    gameIntro: $("gameIntro"),
    setupPanel: $("setupPanel"),
    gamePanel: $("gamePanel"),
    wheelFrame: $("wheelFrame"),
    wheelRotor: $("wheelRotor"),
    wheelSegments: $("wheelSegments"),
    wheelLabels: $("wheelLabels"),
    wheelBulbs: $("wheelBulbs"),
    wheelTitle: $("wheelTitle"),
    wheelDesc: $("wheelDesc"),
    hubBtn: $("hubBtn"),
    hubKicker: $("hubKicker"),
    hubSub: $("hubSub"),
    wheelCaption: $("wheelCaption"),
    wheelCaptionText: $("wheelCaptionText"),
    addForm: $("addForm"),
    nameInput: $("nameInput"),
    addBtn: $("addBtn"),
    inputWrap: document.querySelector(".input-wrap"),
    formError: $("formError"),
    chipList: $("chipList"),
    emptyList: $("emptyList"),
    countBadge: $("countBadge"),
    clearBtn: $("clearBtn"),
    demoBtn: $("demoBtn"),
    footerNote: $("footerNote"),
    startBtn: $("startBtn"),
    startBtnLabel: document.querySelector("#startBtn > span:first-child"),
    startHint: $("startHint"),
    turnKicker: $("turnKicker"),
    giverName: $("giverName"),
    turnCopy: $("turnCopy"),
    progressLabel: $("progressLabel"),
    nextLabel: $("nextLabel"),
    progressTrack: document.querySelector(".progress-track"),
    progressFill: $("progressFill"),
    turnList: $("turnList"),
    spinBtn: $("spinBtn"),
    spinLabel: $("spinLabel"),
    spinNote: $("spinNote"),
    spinNoteText: $("spinNoteText"),
    revealOverlay: $("revealOverlay"),
    revealEyebrow: $("revealEyebrow"),
    recipientInitial: $("recipientInitial"),
    recipientName: $("recipientName"),
    revealCopy: $("revealCopy"),
    keepSecretBtn: $("keepSecretBtn"),
    keepSecretLabel: $("keepSecretLabel"),
    finaleOverlay: $("finaleOverlay"),
    finaleTitle: $("finaleTitle"),
    finaleCopy: $("finaleCopy"),
    roundAgainBtn: $("roundAgainBtn"),
    editNamesBtn: $("editNamesBtn"),
    hostListBtn: $("hostListBtn"),
    howDialog: $("howDialog"),
    confirmDialog: $("confirmDialog"),
    confirmResetBtn: $("confirmResetBtn"),
    hostDialog: $("hostDialog"),
    hostList: $("hostList"),
    copyListBtn: $("copyListBtn"),
    copyStatus: $("copyStatus"),
    toast: $("toast"),
    fxCanvas: $("fxCanvas")
  };

  let names = [];
  let assignment = [];
  let order = [];
  let turn = 0;
  let phase = "setup";
  let wheelAngle = 0;
  let spinning = false;
  let spinAnimation = 0;
  let toastTimer = 0;
  let lastOverlayTrigger = null;
  let soundEnabled = true;
  let audioContext = null;

  const randomInt = (max) => {
    if (max <= 0) return 0;
    if (window.crypto && window.crypto.getRandomValues) {
      const limit = Math.floor(0x100000000 / max) * max;
      const buf = new Uint32Array(1);
      let value = 0;
      do {
        window.crypto.getRandomValues(buf);
        value = buf[0];
      } while (value >= limit);
      return value % max;
    }
    return Math.floor(Math.random() * max);
  };

  const shuffle = (items) => {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

  const initials = (name) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("").toUpperCase();
    return (Array.from(parts[0])[0] + Array.from(parts[parts.length - 1])[0]).toUpperCase();
  };

  const possessive = (name) => {
    if (/s$/i.test(name)) return `${name}’`;
    return `${name}’s`;
  };

  const colorForName = (name) => {
    let hash = 0;
    for (const char of name) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  };

  const normalizeName = (value) => value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_LIMIT);

  const isNameTaken = (name) => names.some((existing) => existing.toLocaleLowerCase() === name.toLocaleLowerCase());

  function saveState() {
    try {
      const safePhase = phase === "spinning" ? "ready" : phase;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        names,
        assignment: phase === "setup" ? [] : assignment,
        order: phase === "setup" ? [] : order,
        turn: phase === "setup" ? 0 : turn,
        phase: safePhase,
        savedAt: Date.now()
      }));
    } catch (error) {
      /* Storage can be unavailable in private browsing. The draw still works. */
    }
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.names)) return null;

      const savedNames = saved.names
        .map((name) => normalizeName(String(name || "")))
        .filter(Boolean)
        .slice(0, MAX_PLAYERS);

      if (!savedNames.length) return null;
      const unique = [];
      for (const name of savedNames) {
        if (!unique.some((entry) => entry.toLocaleLowerCase() === name.toLocaleLowerCase())) unique.push(name);
      }

      if (saved.phase === "setup" || savedNames.length < MIN_PLAYERS) {
        return { names: unique, phase: "setup" };
      }

      const count = unique.length;
      const validPermutation = Array.isArray(saved.assignment)
        && saved.assignment.length === count
        && saved.assignment.every((value) => Number.isInteger(value) && value >= 0 && value < count)
        && new Set(saved.assignment).size === count
        && saved.assignment.every((value, index) => value !== index);

      const validOrder = Array.isArray(saved.order)
        && saved.order.length === count
        && saved.order.every((value) => Number.isInteger(value) && value >= 0 && value < count)
        && new Set(saved.order).size === count;

      if (!validPermutation || !validOrder) return { names: unique, phase: "setup" };

      let savedPhase = saved.phase;
      if (!["ready", "reveal", "finale"].includes(savedPhase)) savedPhase = "ready";
      let savedTurn = Number.isInteger(saved.turn) ? saved.turn : 0;
      savedTurn = Math.max(0, Math.min(savedTurn, count));
      if (savedPhase === "finale") savedTurn = count;
      if (savedPhase !== "finale" && savedTurn >= count) savedPhase = "finale";
      if (savedPhase === "reveal" && savedTurn >= count) savedPhase = "finale";

      return {
        names: unique,
        assignment: saved.assignment.slice(),
        order: saved.order.slice(),
        turn: savedTurn,
        phase: savedPhase
      };
    } catch (error) {
      return null;
    }
  }

  function setPageLocked(locked) {
    document.body.classList.toggle("is-locked", locked);
    if (dom.page) {
      if (locked) dom.page.setAttribute("inert", "");
      else dom.page.removeAttribute("inert");
    }
  }

  function showToast(message, duration = 2600) {
    window.clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove("is-visible");
    }, duration);
  }

  /* ---------------------------- Sound ---------------------------- */

  function ensureAudio() {
    if (!soundEnabled) return null;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioContext) audioContext = new AudioCtor();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function playTick(strength = 1) {
    if (!soundEnabled) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1220 + Math.random() * 220, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.035);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.033 * strength, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function playChime() {
    if (!soundEnabled) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const start = now + index * 0.095;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.072, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.76);
    });
  }

  function playClick() {
    if (!soundEnabled) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(390, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.055);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  function updateSoundButton() {
    dom.soundToggle.classList.toggle("is-on", soundEnabled);
    dom.soundToggle.classList.toggle("is-muted", !soundEnabled);
    dom.soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    dom.soundToggle.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Unmute sound");
  }

  function readSoundPreference() {
    try {
      const stored = localStorage.getItem(SOUND_KEY);
      return stored !== "off";
    } catch (error) {
      return true;
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
    } catch (error) {
      /* no-op */
    }
    updateSoundButton();
    if (soundEnabled) {
      ensureAudio();
      playClick();
      showToast("Sound is on.");
    } else {
      showToast("Sound is off.");
    }
  }

  /* ---------------------------- Wheel ---------------------------- */

  function createSvg(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }

  function labelSize(count) {
    if (count <= 4) return 25;
    if (count <= 6) return 22;
    if (count <= 8) return 19;
    if (count <= 10) return 17;
    if (count <= 12) return 15;
    if (count <= 14) return 13.5;
    return 12.2;
  }

  function labelLimit(count) {
    if (count <= 4) return 16;
    if (count <= 8) return 14;
    if (count <= 11) return 11;
    if (count <= 13) return 10;
    return 9;
  }

  function truncateLabel(name, limit) {
    const chars = Array.from(name);
    if (chars.length <= limit) return name;
    return `${chars.slice(0, Math.max(1, limit - 1)).join("").trimEnd()}…`;
  }

  function wedgePath(start, end, radius = 266) {
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = 300 + radius * Math.cos(startRad);
    const y1 = 300 + radius * Math.sin(startRad);
    const x2 = 300 + radius * Math.cos(endRad);
    const y2 = 300 + radius * Math.sin(endRad);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M 300 300 L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
  }

  function renderWheel() {
    dom.wheelSegments.replaceChildren();
    dom.wheelLabels.replaceChildren();
    dom.wheelBulbs.replaceChildren();

    const count = names.length;
    const segments = count || 8;
    const segmentAngle = 360 / segments;
    const fontSize = labelSize(segments);
    const limit = labelLimit(segments);

    for (let index = 0; index < segments; index += 1) {
      const start = -90 + index * segmentAngle;
      const end = start + segmentAngle;
      const color = WEDGE_COLORS[index % WEDGE_COLORS.length];
      const path = createSvg("path", {
        d: wedgePath(start, end),
        fill: color.fill,
        stroke: "#09221c",
        "stroke-opacity": "0.34",
        "stroke-width": "1.3"
      });
      dom.wheelSegments.appendChild(path);

      const middle = start + segmentAngle / 2;
      const labelGroup = createSvg("g", {
        transform: `rotate(${middle + 90} 300 300)`
      });
      const uprightAngle = mod(middle + 90, 360);
      const shouldFlip = uprightAngle > 90 && uprightAngle < 270;

      if (count) {
        const title = createSvg("title");
        title.textContent = names[index];
        labelGroup.appendChild(title);

        const text = createSvg("text", {
          x: "300",
          y: "101",
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: color.text,
          "font-family": '"DM Sans", "Avenir Next", sans-serif',
          "font-size": String(fontSize),
          "font-weight": "700",
          "letter-spacing": "0.025em"
        });
        if (shouldFlip) text.setAttribute("transform", "rotate(180 300 101)");
        text.textContent = truncateLabel(names[index], limit);
        labelGroup.appendChild(text);
      } else {
        const star = createSvg("path", {
          d: "M 0 -10 L 2.9 -3.1 L 10 0 L 2.9 3.1 L 0 10 L -2.9 3.1 L -10 0 L -2.9 -3.1 Z",
          fill: index % 4 === 1 ? "#8a6327" : "#f6d689",
          opacity: "0.42",
          transform: "translate(300 101)"
        });
        labelGroup.appendChild(star);
      }

      dom.wheelLabels.appendChild(labelGroup);
    }

    for (let index = 0; index < 24; index += 1) {
      const angle = (index * 15 * Math.PI) / 180;
      const bulb = createSvg("circle", {
        cx: (300 + Math.cos(angle) * 280).toFixed(2),
        cy: (300 + Math.sin(angle) * 280).toFixed(2),
        r: index % 6 === 0 ? "3" : "2.1",
        class: "wheel-bulb"
      });
      dom.wheelBulbs.appendChild(bulb);
    }

    dom.wheelRotor.style.transform = `rotate(${wheelAngle}deg)`;
    dom.wheelTitle.textContent = count ? `Secret Santa wheel with ${count} names` : "Secret Santa spinning wheel";
    dom.wheelDesc.textContent = count
      ? `A festive wheel with ${names.join(", ")}.`
      : "A festive wheel waiting for your guest list.";
    dom.wheelFrame.setAttribute("aria-label", count ? `Secret Santa wheel with ${count} players` : "Empty Secret Santa wheel");
  }

  /* ---------------------------- Setup ---------------------------- */

  function setFormError(message = "") {
    dom.formError.textContent = message;
    dom.inputWrap.classList.toggle("has-error", Boolean(message));
  }

  function buildChip(name, index) {
    const chip = document.createElement("span");
    chip.className = "chip";

    const avatar = document.createElement("span");
    avatar.className = "chip-avatar";
    avatar.style.setProperty("--avatar", colorForName(name));
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = initials(name);
    chip.appendChild(avatar);

    const label = document.createElement("span");
    label.className = "chip-name";
    label.textContent = name;
    chip.appendChild(label);

    const remove = document.createElement("button");
    remove.className = "chip-remove";
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${name}`);
    remove.dataset.index = String(index);
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    chip.appendChild(remove);
    return chip;
  }

  function renderSetup() {
    phase = "setup";
    spinning = false;
    wheelAngle = 0;
    dom.wheelFrame.classList.remove("can-spin", "is-spinning");
    dom.wheelFrame.style.pointerEvents = "";
    dom.stage.dataset.view = "setup";
    dom.setupIntro.hidden = false;
    dom.gameIntro.hidden = true;
    dom.setupPanel.hidden = false;
    dom.gamePanel.hidden = true;
    dom.newGameBtn.hidden = true;
    dom.revealOverlay.hidden = true;
    dom.finaleOverlay.hidden = true;

    dom.chipList.replaceChildren();
    if (!names.length) {
      dom.chipList.appendChild(dom.emptyList);
      dom.emptyList.hidden = false;
    } else {
      names.forEach((name, index) => dom.chipList.appendChild(buildChip(name, index)));
    }

    dom.countBadge.textContent = `${names.length} / ${MAX_PLAYERS}`;
    dom.clearBtn.hidden = names.length === 0;
    dom.demoBtn.hidden = names.length > 0;
    dom.footerNote.hidden = names.length === 0;
    dom.nameInput.disabled = names.length >= MAX_PLAYERS;
    dom.addBtn.disabled = names.length >= MAX_PLAYERS;
    dom.nameInput.placeholder = names.length >= MAX_PLAYERS ? "The guest list is full" : "Type a name…";
    dom.startBtnLabel.textContent = names.length >= MIN_PLAYERS
      ? `Deal ${names.length} secret spins`
      : "Deal the secret spins";

    const missing = Math.max(0, MIN_PLAYERS - names.length);
    if (!names.length) {
      dom.startHint.textContent = "Add at least 3 names to start the draw.";
    } else if (missing) {
      dom.startHint.textContent = `Add ${missing} more ${missing === 1 ? "name" : "names"} to start the draw.`;
    } else {
      dom.startHint.textContent = `${names.length} names ready — every match stays secret until you spin.`;
    }

    if (!names.length) {
      dom.hubKicker.textContent = "ADD";
      dom.hubSub.textContent = "YOUR CREW";
    } else if (names.length < MIN_PLAYERS) {
      dom.hubKicker.textContent = "ADD";
      dom.hubSub.textContent = "MORE NAMES";
    } else {
      dom.hubKicker.textContent = "READY";
      dom.hubSub.textContent = "WHEN YOU ARE";
    }
    dom.hubBtn.disabled = true;
    dom.hubBtn.setAttribute("aria-label", "Add at least three names to spin the wheel");
    dom.wheelCaption.classList.remove("is-live");
    if (!names.length) dom.wheelCaptionText.textContent = "Your names will fill the wheel.";
    else if (names.length === 1) dom.wheelCaptionText.textContent = "One name down — a few more to go.";
    else if (names.length === 2) dom.wheelCaptionText.textContent = "Nearly there — add one more name.";
    else dom.wheelCaptionText.textContent = "The wheel is ready when you are.";

    renderWheel();
  }

  function addPlayer(rawName) {
    const name = normalizeName(rawName);
    if (!name) {
      setFormError("A name would help the wheel along.");
      dom.nameInput.focus();
      return false;
    }
    if (names.length >= MAX_PLAYERS) {
      setFormError(`The wheel can hold ${MAX_PLAYERS} names. That's a full house!`);
      return false;
    }
    if (isNameTaken(name)) {
      setFormError(`${name} is already on the nice list. Try another.`);
      dom.nameInput.select();
      return false;
    }

    names.push(name);
    setFormError("");
    dom.nameInput.value = "";
    renderSetup();
    saveState();
    dom.nameInput.focus();
    return true;
  }

  function removePlayer(index) {
    if (!Number.isInteger(index) || index < 0 || index >= names.length) return;
    const [removed] = names.splice(index, 1);
    setFormError("");
    renderSetup();
    saveState();
    dom.nameInput.focus();
    showToast(`${removed} left the guest list.`, 1800);
  }

  function addDemoCrew() {
    if (names.length) return;
    const demoNames = ["Mia", "Noah", "Ava", "Leo", "Priya", "Sam"];
    names = demoNames.slice();
    setFormError("");
    renderSetup();
    saveState();
    showToast("Six festive guests added.");
  }

  function clearGuestList() {
    if (!names.length) return;
    names = [];
    setFormError("");
    renderSetup();
    saveState();
    dom.nameInput.focus();
    showToast("The guest list is clear.");
  }

  function makeDerangement(count) {
    const source = Array.from({ length: count }, (_, index) => index);
    for (let attempt = 0; attempt < 20000; attempt += 1) {
      const candidate = shuffle(source);
      if (candidate.every((recipient, giver) => recipient !== giver)) return candidate;
    }
    return source.map((_, index) => (index + 1) % count);
  }

  function startDraw() {
    if (spinning) return;
    if (names.length < MIN_PLAYERS) {
      const missing = MIN_PLAYERS - names.length;
      setFormError(`Add ${missing} more ${missing === 1 ? "name" : "names"} — Secret Santa needs at least three.`);
      dom.nameInput.focus();
      return;
    }

    ensureAudio();
    assignment = makeDerangement(names.length);
    order = shuffle(Array.from({ length: names.length }, (_, index) => index));
    turn = 0;
    phase = "ready";
    wheelAngle = 0;
    dom.wheelRotor.style.transform = "rotate(0deg)";
    saveState();
    renderGame();
    playClick();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    requestAnimationFrame(() => dom.spinBtn.focus({ preventScroll: true }));
  }

  /* ---------------------------- Game ---------------------------- */

  function currentGiver() {
    return order[turn] ?? null;
  }

  function setSpinUi(isSpinning) {
    dom.spinBtn.disabled = isSpinning || phase !== "ready";
    dom.spinBtn.classList.toggle("is-spinning", isSpinning);
    dom.spinLabel.textContent = isSpinning ? "Round and round…" : "Spin the wheel";
    dom.wheelFrame.classList.toggle("is-spinning", isSpinning);
    dom.wheelFrame.classList.toggle("can-spin", !isSpinning && phase === "ready");
    dom.hubBtn.disabled = isSpinning || phase !== "ready";
    if (isSpinning) {
      dom.hubKicker.textContent = "WHEE";
      dom.hubSub.textContent = "ROUND & ROUND";
      dom.hubBtn.setAttribute("aria-label", "Wheel is spinning");
    } else if (phase === "ready") {
      dom.hubKicker.textContent = "SPIN";
      dom.hubSub.textContent = "FOR JOY";
      dom.hubBtn.setAttribute("aria-label", `Spin the wheel for ${names[currentGiver()]}`);
    }
  }

  function renderTurnList() {
    dom.turnList.replaceChildren();
    if (!order.length) return;
    order.forEach((playerIndex, orderPosition) => {
      const item = document.createElement("li");
      item.className = "turn-person";
      const isDone = orderPosition < turn;
      const isCurrent = orderPosition === turn && phase !== "finale";
      if (isDone) item.classList.add("is-done");
      if (isCurrent) item.classList.add("is-current");
      const name = names[playerIndex];
      item.textContent = initials(name);
      item.title = name;
      item.setAttribute("aria-label", `${name}: ${isDone ? "matched" : isCurrent ? "up now" : "waiting"}`);
      if (isCurrent) item.setAttribute("aria-current", "step");
      dom.turnList.appendChild(item);
    });
  }

  function renderGame() {
    if (!names.length || !order.length) {
      renderSetup();
      return;
    }

    if (phase === "finale") {
      renderFinale();
      return;
    }

    dom.stage.dataset.view = "game";
    dom.setupIntro.hidden = true;
    dom.gameIntro.hidden = false;
    dom.setupPanel.hidden = true;
    dom.gamePanel.hidden = false;
    dom.newGameBtn.hidden = false;
    dom.wheelFrame.style.pointerEvents = "";

    const giverIndex = currentGiver();
    if (giverIndex === null) {
      phase = "finale";
      renderFinale();
      return;
    }

    const giver = names[giverIndex];
    dom.turnKicker.textContent = `Turn ${Math.min(turn + 1, names.length)} of ${names.length}`;
    dom.giverName.textContent = giver;
    dom.turnCopy.textContent = `Take the wheel, ${giver}. Everyone else, look away.`;
    dom.spinNoteText.textContent = `For ${possessive(giver)} eyes only — no peeking, please.`;
    dom.progressLabel.textContent = `${turn} of ${names.length} matched`;

    if (turn === 0) dom.nextLabel.textContent = `${giver} is up first`;
    else if (turn === names.length - 1) dom.nextLabel.textContent = "The last spin";
    else dom.nextLabel.textContent = `${giver} is up now`;

    dom.progressFill.style.width = `${(turn / names.length) * 100}%`;
    dom.progressTrack.setAttribute("aria-valuemax", String(names.length));
    dom.progressTrack.setAttribute("aria-valuenow", String(turn));

    renderTurnList();
    renderWheel();
    setSpinUi(false);
    dom.wheelCaption.classList.toggle("is-live", phase === "ready");
    dom.wheelCaptionText.textContent = phase === "ready"
      ? "The wheel is ready. Give it a good spin."
      : "A match made at the North Pole.";

    dom.hubBtn.disabled = phase !== "ready";
    dom.wheelFrame.classList.toggle("can-spin", phase === "ready");
    dom.spinBtn.disabled = phase !== "ready";
  }

  function spinWheel() {
    if (phase !== "ready" || spinning || !order.length) return;
    ensureAudio();

    const giverIndex = currentGiver();
    if (giverIndex === null) return;
    const recipientIndex = assignment[giverIndex];
    const count = names.length;
    const segmentAngle = 360 / count;
    const sectorCenter = -90 + (recipientIndex + 0.5) * segmentAngle;
    const jitter = (Math.random() * 0.56 - 0.28) * segmentAngle;
    const desiredAngle = mod(-90 - sectorCenter + jitter, 360);
    const delta = mod(desiredAngle - wheelAngle, 360);
    const fullSpins = reducedMotion ? 1 : 5 + randomInt(3);
    const fromAngle = wheelAngle;
    const toAngle = fromAngle + delta + fullSpins * 360;
    const duration = reducedMotion ? 900 : 4900 + randomInt(950);

    spinning = true;
    phase = "spinning";
    setSpinUi(true);
    dom.spinNoteText.textContent = "Fate is doing the wrapping…";
    dom.wheelCaption.classList.add("is-live");
    dom.wheelCaptionText.textContent = "Round and round — no peeking yet.";
    dom.spinBtn.setAttribute("aria-busy", "true");

    const spinId = ++spinAnimation;
    let lastTickBucket = Math.floor(fromAngle / segmentAngle);
    let lastTickAt = 0;
    const startedAt = performance.now();

    const frame = (now) => {
      if (spinId !== spinAnimation) return;
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const angle = fromAngle + (toAngle - fromAngle) * eased;
      dom.wheelRotor.style.transform = `rotate(${angle}deg)`;

      const bucket = Math.floor(angle / segmentAngle);
      if (bucket !== lastTickBucket) {
        lastTickBucket = bucket;
        if (now - lastTickAt > 45) {
          lastTickAt = now;
          playTick(progress < 0.82 ? 1 : 0.55);
          if (!reducedMotion) {
            dom.wheelFrame.querySelector(".wheel-pointer").classList.remove("bounce");
            void dom.wheelFrame.offsetWidth;
            dom.wheelFrame.querySelector(".wheel-pointer").classList.add("bounce");
          }
          if (navigator.vibrate && progress < 0.82) navigator.vibrate(4);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
        return;
      }

      wheelAngle = mod(toAngle, 360);
      dom.wheelRotor.style.transform = `rotate(${wheelAngle}deg)`;
      spinning = false;
      phase = "reveal";
      dom.spinBtn.removeAttribute("aria-busy");
      dom.wheelFrame.classList.remove("is-spinning", "can-spin");
      dom.wheelFrame.classList.add("is-spinning");
      dom.wheelFrame.style.pointerEvents = "none";
      dom.hubKicker.textContent = "TADA";
      dom.hubSub.textContent = "MERRY MATCH";
      dom.hubBtn.disabled = true;
      dom.wheelCaptionText.textContent = "A match made at the North Pole.";
      saveState();
      window.setTimeout(() => {
        if (phase === "reveal") revealMatch(false);
      }, 340);
    };

    requestAnimationFrame(frame);
  }

  function revealMatch(restored) {
    if (!order.length || dom.revealOverlay.hidden === false) return;
    const giverIndex = currentGiver();
    if (giverIndex === null) return;
    const giver = names[giverIndex];
    const recipient = names[assignment[giverIndex]];
    const isLast = turn === names.length - 1;

    lastOverlayTrigger = document.activeElement;
    dom.revealEyebrow.textContent = `For ${possessive(giver)} eyes only`;
    dom.recipientInitial.textContent = initials(recipient).slice(0, 1);
    dom.recipientName.textContent = recipient;
    dom.revealCopy.textContent = isLast
      ? "That’s the final secret. You’re their Secret Santa — keep it until gift day."
      : "You’re their Secret Santa. Keep it under your Santa hat until gift day.";
    dom.keepSecretLabel.textContent = isLast ? "Finish the draw" : "Keep it secret";
    dom.keepSecretBtn.disabled = false;
    dom.revealOverlay.hidden = false;
    dom.finaleOverlay.hidden = true;
    setPageLocked(true);
    if (!reducedMotion) burstConfetti(window.innerWidth / 2, window.innerHeight * 0.3, 105);
    if (!restored) playChime();
    requestAnimationFrame(() => dom.keepSecretBtn.focus({ preventScroll: true }));
  }

  function finishReveal() {
    if (dom.revealOverlay.hidden) return;
    dom.keepSecretBtn.disabled = true;
    dom.revealOverlay.hidden = true;
    dom.wheelFrame.style.pointerEvents = "";
    turn += 1;

    if (turn >= names.length) {
      phase = "finale";
      saveState();
      setPageLocked(false);
      renderFinale();
      if (!reducedMotion) {
        window.setTimeout(() => burstConfetti(window.innerWidth * 0.32, window.innerHeight * 0.32, 85), 170);
        window.setTimeout(() => burstConfetti(window.innerWidth * 0.68, window.innerHeight * 0.32, 85), 300);
      }
      playChime();
      return;
    }

    phase = "ready";
    wheelAngle = 0;
    dom.wheelRotor.style.transform = "rotate(0deg)";
    dom.wheelFrame.querySelector(".wheel-pointer").classList.remove("bounce");
    saveState();
    setPageLocked(false);
    renderGame();
    const nextGiver = names[currentGiver()];
    showToast(`Pass the device to ${nextGiver}.`);
    requestAnimationFrame(() => dom.spinBtn.focus({ preventScroll: true }));
    if (lastOverlayTrigger && typeof lastOverlayTrigger.focus === "function") {
      lastOverlayTrigger = null;
    }
  }

  /* ---------------------------- Finale ---------------------------- */

  function renderFinale() {
    phase = "finale";
    dom.stage.dataset.view = "game";
    dom.setupIntro.hidden = true;
    dom.gameIntro.hidden = false;
    dom.setupPanel.hidden = true;
    dom.gamePanel.hidden = false;
    dom.revealOverlay.hidden = true;
    dom.finaleOverlay.hidden = false;
    dom.newGameBtn.hidden = true;

    const count = names.length;
    dom.finaleTitle.innerHTML = `${NUMBER_WORDS[count] || count} little secrets.<br><em>Ready to keep.</em>`;
    dom.finaleCopy.textContent = "Everyone has a match. Now the real magic is keeping quiet until gift day.";
    dom.gamePanel.hidden = true;
    dom.spinLabel.textContent = "Spin the wheel";
    dom.spinBtn.classList.remove("is-spinning");
    dom.spinBtn.disabled = true;
    dom.spinBtn.removeAttribute("aria-busy");
    dom.spinNoteText.textContent = "Every secret has found its home.";
    dom.giverName.textContent = "everyone";
    dom.turnKicker.textContent = "The wheel has spoken";
    dom.turnCopy.textContent = "Every name is matched. Keep your secret close and your gifts even closer.";
    dom.progressLabel.textContent = `${count} of ${count} matched`;
    dom.nextLabel.textContent = "All done";
    dom.progressFill.style.width = "100%";
    dom.progressTrack.setAttribute("aria-valuenow", String(count));
    dom.turnList.replaceChildren();
    renderTurnList();
    dom.wheelCaption.classList.remove("is-live");
    dom.wheelCaptionText.textContent = "Every secret has found its home.";
    dom.hubKicker.textContent = "TA-DA";
    dom.hubSub.textContent = "ALL MATCHED";
    dom.hubBtn.disabled = true;
    dom.spinBtn.disabled = true;
    dom.wheelFrame.classList.remove("can-spin", "is-spinning");
    dom.wheelFrame.style.pointerEvents = "none";
    setPageLocked(true);
    buildHostList();
    requestAnimationFrame(() => dom.roundAgainBtn.focus({ preventScroll: true }));
  }

  function buildHostList() {
    dom.hostList.replaceChildren();
    names.forEach((giver, giverIndex) => {
      const item = document.createElement("li");
      const from = document.createElement("span");
      from.className = "host-from";
      from.textContent = giver;
      const arrow = document.createElement("span");
      arrow.className = "host-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      const to = document.createElement("span");
      to.className = "host-to";
      to.textContent = names[assignment[giverIndex]];
      item.append(from, arrow, to);
      dom.hostList.appendChild(item);
    });
    dom.copyStatus.textContent = "";
  }

  function openHostList() {
    if (!assignment.length || dom.hostDialog.open) return;
    buildHostList();
    dom.hostDialog.showModal();
  }

  async function copyHostList() {
    const text = ["Secret Santa", ...names.map((giver, index) => `${giver} → ${names[assignment[index]]}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      dom.copyStatus.textContent = "Copied! Keep it somewhere private.";
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (copyError) {
        copied = false;
      }
      area.remove();
      dom.copyStatus.textContent = copied ? "Copied! Keep it somewhere private." : "Couldn’t copy automatically — please write it down.";
    }
  }

  function newRound() {
    if (phase !== "finale") return;
    if (names.length < MIN_PLAYERS) {
      returnToSetup(false);
      return;
    }
    dom.finaleOverlay.hidden = true;
    setPageLocked(false);
    assignment = makeDerangement(names.length);
    order = shuffle(Array.from({ length: names.length }, (_, index) => index));
    turn = 0;
    phase = "ready";
    wheelAngle = 0;
    dom.wheelRotor.style.transform = "rotate(0deg)";
    saveState();
    renderGame();
    playClick();
    showToast("A fresh draw is ready.");
    requestAnimationFrame(() => dom.spinBtn.focus({ preventScroll: true }));
  }

  function returnToSetup(preserveNames = true) {
    spinAnimation += 1;
    spinning = false;
    assignment = [];
    order = [];
    turn = 0;
    phase = "setup";
    wheelAngle = 0;
    if (!preserveNames) names = [];
    dom.revealOverlay.hidden = true;
    dom.finaleOverlay.hidden = true;
    dom.wheelRotor.style.transform = "rotate(0deg)";
    dom.wheelFrame.style.pointerEvents = "";
    dom.wheelFrame.classList.remove("is-spinning", "can-spin");
    setPageLocked(false);
    saveState();
    renderSetup();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    requestAnimationFrame(() => {
      if (names.length < MAX_PLAYERS) dom.nameInput.focus({ preventScroll: true });
      else dom.startBtn.focus({ preventScroll: true });
    });
  }

  /* ---------------------------- Dialogs ---------------------------- */

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setPageLocked(false);
    document.body.classList.add("is-locked");
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    dialog.close();
    document.body.classList.remove("is-locked");
  }

  function askForNewGame() {
    if (dom.confirmDialog.open) return;
    dom.confirmDialog.showModal();
    document.body.classList.add("is-locked");
  }

  function setupDialogDismissal() {
    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("close", () => {
        if (!document.querySelector("dialog[open]") && dom.revealOverlay.hidden && dom.finaleOverlay.hidden) {
          document.body.classList.remove("is-locked");
        }
      });
      dialog.querySelectorAll("[data-close]").forEach((button) => {
        button.addEventListener("click", () => {
          dialog.close();
          playClick();
        });
      });
    });
  }

  /* ---------------------------- Confetti & snow ---------------------------- */

  const fx = (() => {
    const canvas = dom.fxCanvas;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let dpr = 1;
    let confetti = [];
    let running = false;
    let lastTime = 0;
    let lastFrame = 0;

    const palette = ["#b7343f", "#e8b95f", "#f8eed8", "#155647", "#f7d78e", "#c95b62"];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
    }

    function burst(x, y, count = 90) {
      if (reducedMotion) return;
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.11 + Math.random() * 0.36;
        confetti.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.22,
          gravity: 0.00045 + Math.random() * 0.00042,
          drag: 0.988,
          width: 4 + Math.random() * 6,
          height: 5 + Math.random() * 9,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.012,
          color: palette[Math.floor(Math.random() * palette.length)],
          shape: Math.random() > 0.78 ? "circle" : "rectangle",
          life: 0,
          ttl: 2200 + Math.random() * 1800
        });
      }
      if (!running) {
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
      }
    }

    function drawConfetti(delta) {
      for (let index = confetti.length - 1; index >= 0; index -= 1) {
        const piece = confetti[index];
        piece.life += delta;
        piece.vx *= piece.drag;
        piece.vy = piece.vy * piece.drag + piece.gravity * delta;
        piece.x += piece.vx * delta;
        piece.y += piece.vy * delta;
        piece.rotation += piece.rotationSpeed * delta;

        if (piece.life > piece.ttl || piece.y > height + 50) {
          confetti.splice(index, 1);
          continue;
        }

        const fade = Math.min(1, (piece.ttl - piece.life) / 500);
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        if (piece.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, piece.width * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height * 0.55);
        }
        ctx.restore();
      }
    }

    function draw(delta) {
      ctx.clearRect(0, 0, width, height);
      drawConfetti(delta);
    }

    function loop(now) {
      const delta = Math.min(34, now - lastTime);
      lastTime = now;
      if (now - lastFrame > 28) {
        lastFrame = now;
        draw(delta);
      }
      if (confetti.length) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();

    return { burst };
  })();

  const burstConfetti = fx.burst;

  /* ---------------------------- Events ---------------------------- */

  function bindEvents() {
    dom.addForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addPlayer(dom.nameInput.value);
    });

    dom.nameInput.addEventListener("input", () => {
      if (dom.formError.textContent) setFormError("");
    });

    dom.chipList.addEventListener("click", (event) => {
      const button = event.target.closest(".chip-remove");
      if (!button) return;
      removePlayer(Number(button.dataset.index));
    });

    dom.demoBtn.addEventListener("click", () => {
      ensureAudio();
      addDemoCrew();
    });
    dom.clearBtn.addEventListener("click", clearGuestList);
    dom.startBtn.addEventListener("click", startDraw);

    dom.spinBtn.addEventListener("click", spinWheel);
    dom.hubBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      spinWheel();
    });
    dom.wheelFrame.addEventListener("click", (event) => {
      if (event.target.closest("#hubBtn")) return;
      spinWheel();
    });

    dom.keepSecretBtn.addEventListener("click", () => {
      playClick();
      finishReveal();
    });

    dom.roundAgainBtn.addEventListener("click", () => {
      playClick();
      newRound();
    });

    dom.editNamesBtn.addEventListener("click", () => {
      playClick();
      returnToSetup(true);
    });

    dom.hostListBtn.addEventListener("click", () => {
      playClick();
      openHostList();
    });

    dom.copyListBtn.addEventListener("click", copyHostList);

    dom.soundToggle.addEventListener("click", toggleSound);

    const openHow = () => {
      openDialog(dom.howDialog);
      playClick();
    };
    dom.howBtn.addEventListener("click", openHow);
    dom.footerHowBtn.addEventListener("click", openHow);

    dom.newGameBtn.addEventListener("click", askForNewGame);
    dom.confirmResetBtn.addEventListener("click", () => {
      dom.confirmDialog.close();
      document.body.classList.remove("is-locked");
      returnToSetup(true);
      showToast("Current draw ended. The guest list is still here.");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (dom.hostDialog.open) {
          dom.hostDialog.close();
          return;
        }
        return;
      }

      if (event.key !== " " && event.code !== "Space") return;
      const target = event.target;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || target.isContentEditable) return;
      if (dom.revealOverlay.hidden === false || dom.finaleOverlay.hidden === false) return;
      if (document.querySelector("dialog[open]")) return;
      if (phase === "ready") {
        event.preventDefault();
        spinWheel();
      }
    });

    setupDialogDismissal();
  }

  function createStars() {
    const fragment = document.createDocumentFragment();
    const total = window.innerWidth < 700 ? 34 : 62;
    for (let index = 0; index < total; index += 1) {
      const star = document.createElement("i");
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.setProperty("--duration", `${3.5 + Math.random() * 6}s`);
      star.style.setProperty("--delay", `${-Math.random() * 8}s`);
      if (Math.random() > 0.84) star.classList.add("big");
      fragment.appendChild(star);
    }
    dom.starfield.appendChild(fragment);
  }

  function createSnow() {
    if (reducedMotion) return;
    const fragment = document.createDocumentFragment();
    const total = window.innerWidth < 700 ? 22 : 44;
    for (let index = 0; index < total; index += 1) {
      const flake = document.createElement("i");
      const size = 1.2 + Math.random() * 2.6;
      const speed = 11 + Math.random() * 14;
      flake.style.left = `${Math.random() * 100}%`;
      flake.style.setProperty("--size", `${size.toFixed(2)}px`);
      flake.style.setProperty("--speed", `${speed.toFixed(2)}s`);
      flake.style.setProperty("--delay", `${(-Math.random() * speed).toFixed(2)}s`);
      flake.style.setProperty("--drift", `${(-70 + Math.random() * 140).toFixed(0)}px`);
      flake.style.setProperty("--alpha", `${(0.14 + Math.random() * 0.3).toFixed(2)}`);
      if (Math.random() > 0.76) flake.classList.add("gold");
      fragment.appendChild(flake);
    }
    dom.snowfall.appendChild(fragment);
  }

  function restoreState() {
    const saved = readState();
    if (!saved) return false;

    names = saved.names;
    if (saved.phase === "setup") {
      renderSetup();
      return true;
    }

    assignment = saved.assignment;
    order = saved.order;
    turn = saved.turn;
    phase = saved.phase;
    renderGame();
    if (phase === "reveal") {
      revealMatch(true);
      showToast("Picking up where you left off.", 2200);
    } else if (phase === "finale") {
      /* renderGame already opened the finale overlay. */
    } else {
      showToast("Picking up where you left off.", 2200);
    }
    return true;
  }

  function init() {
    createStars();
    createSnow();
    soundEnabled = readSoundPreference();
    updateSoundButton();
    bindEvents();

    if (!restoreState()) {
      renderSetup();
    }

    if (names.length >= MIN_PLAYERS && phase === "setup") {
      dom.startHint.textContent = `${names.length} names ready — every match stays secret until you spin.`;
    }
  }

  init();
})();
