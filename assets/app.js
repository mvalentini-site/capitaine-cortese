(async function () {
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  let data, current = null;

  try {
    data = await (await fetch("episodes.json", { cache: "no-cache" })).json();
  } catch (e) {
    $("episodes").innerHTML = "<li>Impossible de charger les épisodes.</li>";
    return;
  }

  $("tagline").textContent = data.sousTitre || "";
  $("description").textContent = data.description || "";
  $("year").textContent = new Date().getFullYear();

  // Plus récent en premier
  const eps = [...data.episodes].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.numero || 0) - (a.numero || 0));
  $("count").textContent = eps.length + (eps.length > 1 ? " poèmes" : " poème");

  const fmtDate = (d) => d ? new Date(d + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
  const fmtTime = (s) => { s = Math.floor(s || 0); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const list = $("episodes");
  list.innerHTML = eps.map((ep) => `
    <li class="ep" id="${esc(ep.id)}" data-search="${esc((ep.titre + " " + ep.resume + " " + ep.texte).toLowerCase())}">
      <button class="ep-play" data-id="${esc(ep.id)}" ${ep.audio ? "" : "disabled"} aria-label="Écouter ${esc(ep.titre)}">▶</button>
      <div>
        <p class="ep-meta">N° ${esc(ep.numero)} · ${fmtDate(ep.date)}${ep.duree ? " · " + esc(ep.duree) : ""}${ep.recueil ? " · <em>" + esc(ep.recueil) + "</em>" : ""}</p>
        <h3>${esc(ep.titre)}</h3>
        ${ep.resume ? `<p class="resume">${esc(ep.resume)}</p>` : ""}
        ${ep.audio ? "" : `<p class="soon">Enregistrement bientôt disponible.</p>`}
        ${ep.texte ? `<details><summary>Lire le poème</summary><div class="poem">${esc(ep.texte)}</div></details>` : ""}
        ${ep.credits ? `<p class="credits">Sons : ${esc(ep.credits)}</p>` : ""}
      </div>
    </li>`).join("");

  function setButtons() {
    document.querySelectorAll(".ep").forEach((li) => {
      const on = current && li.id === current.id;
      li.classList.toggle("playing", !!on);
      const b = li.querySelector(".ep-play");
      if (b && !b.disabled) b.textContent = on && !audio.paused ? "❚❚" : "▶";
    });
    $("playBtn").textContent = audio.paused ? "▶" : "❚❚";
  }

  function play(ep) {
    if (current && current.id === ep.id) {
      audio.paused ? audio.play() : audio.pause();
      return;
    }
    current = ep;
    audio.src = ep.audio;
    $("plTitle").textContent = ep.titre;
    $("player").hidden = false;
    audio.play();
    history.replaceState(null, "", "#" + ep.id);
  }

  list.addEventListener("click", (e) => {
    const b = e.target.closest(".ep-play");
    if (b) play(eps.find((x) => x.id === b.dataset.id));
  });

  $("playBtn").onclick = () => (audio.paused ? audio.play() : audio.pause());
  const speeds = [1, 1.25, 1.5, 0.75];
  $("speedBtn").onclick = () => {
    const i = (speeds.indexOf(audio.playbackRate) + 1) % speeds.length;
    audio.playbackRate = speeds[i];
    $("speedBtn").textContent = String(speeds[i]).replace(".", ",") + "×";
  };
  audio.addEventListener("play", setButtons);
  audio.addEventListener("pause", setButtons);
  audio.addEventListener("loadedmetadata", () => { $("plDur").textContent = fmtTime(audio.duration); });
  audio.addEventListener("timeupdate", () => {
    $("plCur").textContent = fmtTime(audio.currentTime);
    if (audio.duration) $("plSeek").value = (audio.currentTime / audio.duration) * 100;
  });
  $("plSeek").addEventListener("input", (e) => {
    if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
  });

  $("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll(".ep").forEach((li) => {
      const ok = !q || li.dataset.search.includes(q);
      li.hidden = !ok;
      if (ok) shown++;
    });
    $("empty").hidden = shown > 0;
  });

  // Lien direct vers un épisode : …/#id
  if (location.hash) {
    const el = document.getElementById(location.hash.slice(1));
    if (el) { el.querySelector("details")?.setAttribute("open", ""); el.scrollIntoView(); }
  }
})();
