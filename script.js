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
    "position:absolute;top:0;left:0;padding:0.5rem;font-size:2rem;pointer-events:none;transform:translate(-100vw,-100vh);";

  document.body.addEventListener("mousemove", (e) => {
    playEmoji.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });

  document.body.addEventListener("click", () => {
    playEmoji.textContent = "🪩";

    const audio = new Audio("sextou.mp3");
    audio.play();
  });

  document.getElementById("response").appendChild(playEmoji);
}
