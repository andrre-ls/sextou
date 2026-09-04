const isSexta = new Date().getDay() === 5;

document.getElementById("response").textContent = isSexta
  ? "sextou!"
  : "não sextou :(";

if (isSexta) {
  initSextouAudio();
}

function initSextouAudio() {
  const playEmoji = document.createElement("span");
  playEmoji.textContent = "👂";
  playEmoji.style.cssText =
    "position:absolute;top:0;left:0;padding:0.5rem;font-size:2rem;z-index:2;pointer-events:none;transform:translate(-100vw,-100vh);";

  document.body.addEventListener("mousemove", (e) => {
    playEmoji.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });

  const audio = new Audio("sextou.mp3");
  const visuals = createVisuals(audio);

  audio.addEventListener("ended", stop);

  document.body.addEventListener("click", () => {
    if (audio.paused) {
      playEmoji.textContent = "🪩";
      audio.play();
      visuals.start();
    } else {
      stop();
    }
  });

  function stop() {
    playEmoji.textContent = "👂";
    audio.pause();
    audio.currentTime = 0;
    visuals.stop();
  }

  document.body.appendChild(playEmoji);
}
