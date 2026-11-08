(async function () {
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  let data;
  let queue = [];   // pistes à enchaîner (mode album) ; vide = lecture d'un seul poème
  let qi = -1;      // position dans la file
  let current = null;

  try {
    data = await (await fetch("episodes.json", { cache: "no-cache" })).json();
  } catch (e) {
    $("albums").innerHTML = "<p>Impossible de charger les poèmes.</p>";
    return;
  }

  $("tagline").textContent = data.sousTitre || "";
  $("description").textContent = data.description || "";
  $("year").textContent = new Date().getFullYear();

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtTime = (s) => { s = Math.floor(s || 0); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const toSec = (d) => { const p = String(d || "").split(":").map(Number); return p.length === 2 ? p[0] * 60 + p[1] : 0; };

  // Albums dans l'ordre du fichier ; poèmes sans album regroupés à la fin
  const albums = (data.albums || []).map((a) => ({ ...a, pistes: [] }));
  const isoles = { id: "poemes", titre: "Poèmes", pistes: [] };
  for (const ep of data.episodes) {
    (albums.find((a) => a.id === ep.album) || isoles).pistes.push(ep);
  }
  if (isoles.pistes.length) albums.push(isoles);
  albums.forEach((a) => a.pistes.sort((x, y) => (x.numero || 0) - (y.numero || 0)));

  const total = data.episodes.length;
  $("count").textContent = total + (total > 1 ? " poèmes" : " poème");

  function pisteHTML(ep) {
    const dispo = !!ep.audio;
    return `
      <li class="track" id="${esc(ep.id)}" data-search="${esc((ep.titre + " " + (ep.resume || "") + " " + (ep.texte || "")).toLowerCase())}">
        <button class="tr-play" data-id="${esc(ep.id)}" ${dispo ? "" : "disabled"} aria-label="Écouter ${esc(ep.titre)}">
          <span class="tr-num">${esc(ep.numero)}</span><span class="tr-icon">▶</span>
        </button>
        <div class="tr-body">
          <div class="tr-head">
            <h4>${esc(ep.titre)}</h4>
            <span class="tr-dur">${dispo ? esc(ep.duree) : "bientôt"}</span>
          </div>
          ${ep.resume ? `<p class="tr-resume">${esc(ep.resume)}</p>` : ""}
          ${ep.texte ? `<details><summary>Lire le poème</summary><div class="poem">${esc(ep.texte)}</div></details>` : ""}        </div>
      </li>`;
  }

  function albumHTML(a) {
    const jouables = a.pistes.filter((p) => p.audio);
    const duree = jouables.reduce((s, p) => s + toSec(p.duree), 0);
    let html = "", partie = null;
    for (const ep of a.pistes) {
      if ((ep.partie || "") !== partie) {
        if (partie !== null) html += "</ol>";
        partie = ep.partie || "";
        html += (partie ? `<h3 class="partie">${esc(partie)}</h3>` : "") + `<ol class="tracks">`;
      }
      html += pisteHTML(ep);
    }
    if (partie !== null) html += "</ol>";
    return `
      <section class="album" id="album-${esc(a.id)}">
        <header class="album-head">
          <p class="kicker-dark">Album</p>
          <h2>${esc(a.titre)}</h2>
          ${a.description ? `<p class="album-desc">${esc(a.description)}</p>` : ""}
          <div class="album-actions">
            <button class="btn-album" data-album="${esc(a.id)}" ${jouables.length ? "" : "disabled"}>▶ Lire l'album</button>
            <span class="album-meta">${a.pistes.length} poème${a.pistes.length > 1 ? "s" : ""}${duree ? " · " + Math.round(duree / 60) + " min" : ""}</span>
          </div>
        </header>
        ${html}
      </section>`;
  }

  $("albums").innerHTML = albums.map(albumHTML).join("");

  const allEps = albums.flatMap((a) => a.pistes);

  // Crédits des sons, regroupés en bas de page
  const avecCredits = allEps.filter((p) => p.credits);
  if (avecCredits.length) {
    $("credits").hidden = false;
    $("creditsList").innerHTML = avecCredits
      .map((p) => `<li><strong>${esc(p.titre)}</strong> — ${esc(p.credits)}</li>`).join("");
  }

  // ----- Lecture -----
  function load(ep) {
    current = ep;
    audio.src = ep.audio;
    $("plTitle").textContent = ep.titre;
    $("player").hidden = false;
    audio.play();
    history.replaceState(null, "", "#" + ep.id);
    refresh();
  }

  function playSingle(ep) {
    if (current && current.id === ep.id) { audio.paused ? audio.play() : audio.pause(); return; }
    queue = []; qi = -1;
    load(ep);
  }

  function playAlbum(id) {
    const a = albums.find((x) => x.id === id);
    queue = a.pistes.filter((p) => p.audio);
    if (!queue.length) return;
    qi = 0;
    load(queue[0]);
  }

  function step(dir) {
    if (!queue.length) return;
    const n = qi + dir;
    if (n < 0) { audio.currentTime = 0; return; }
    if (n >= queue.length) { queue = []; qi = -1; refresh(); return; }
    qi = n;
    load(queue[qi]);
  }

  function refresh() {
    const enAlbum = queue.length > 0;
    document.querySelectorAll(".track").forEach((li) => {
      const on = current && li.id === current.id;
      li.classList.toggle("playing", !!on);
      li.classList.toggle("paused", !!on && audio.paused);
    });
    $("playBtn").textContent = audio.paused ? "▶" : "❚❚";
    $("prevBtn").hidden = $("nextBtn").hidden = !enAlbum;
    if (enAlbum) $("plTitle").textContent = `${current.titre} · ${qi + 1}/${queue.length}`;
    else if (current) $("plTitle").textContent = current.titre;
  }

  $("albums").addEventListener("click", (e) => {
    const b = e.target.closest(".tr-play");
    if (b) return playSingle(allEps.find((x) => x.id === b.dataset.id));
    const a = e.target.closest(".btn-album");
    if (a) playAlbum(a.dataset.album);
  });

  $("playBtn").onclick = () => (audio.paused ? audio.play() : audio.pause());
  $("prevBtn").onclick = () => (audio.currentTime > 3 ? (audio.currentTime = 0) : step(-1));
  $("nextBtn").onclick = () => step(1);
  const speeds = [1, 1.25, 1.5, 0.75];
  $("speedBtn").onclick = () => {
    const i = (speeds.indexOf(audio.playbackRate) + 1) % speeds.length;
    $("speedBtn").textContent = String(speeds[i]).replace(".", ",") + "×";
    audio.defaultPlaybackRate = audio.playbackRate = speeds[i];
  };
  audio.addEventListener("play", refresh);
  audio.addEventListener("pause", refresh);
  audio.addEventListener("ended", () => (queue.length ? step(1) : refresh()));
  audio.addEventListener("loadedmetadata", () => {
    $("plDur").textContent = fmtTime(audio.duration);
    audio.playbackRate = audio.defaultPlaybackRate;
  });
  audio.addEventListener("timeupdate", () => {
    $("plCur").textContent = fmtTime(audio.currentTime);
    if (audio.duration) $("plSeek").value = (audio.currentTime / audio.duration) * 100;
  });
  $("plSeek").addEventListener("input", (e) => {
    if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
  });

  // Lien direct vers un poème : …/#id
  if (location.hash) {
    const el = document.getElementById(location.hash.slice(1));
    if (el) { el.querySelector("details")?.setAttribute("open", ""); el.scrollIntoView(); }
  }
})();
