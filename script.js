const slides = [
  { title: "카드고릴라 트래블 오픈", sub: "트래블카드 순위부터 여행 꿀팁까지!", cta: "자세히 보기" },
  { title: "최대 혜택을 비교하세요", sub: "내게 맞는 카드를 빠르게 찾기", cta: "혜택 보기" }
];

let index = 0;
const titleEl = document.getElementById("slide-title");
const subEl = document.getElementById("slide-sub");
const ctaEl = document.getElementById("slide-cta");
const indicators = document.getElementById("indicators");

function renderIndicators() {
  indicators.innerHTML = "";
  slides.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.className = i === index ? "active" : "";
    btn.addEventListener("click", () => {
      index = i; updateSlide();
    });
    indicators.appendChild(btn);
  });
}

function updateSlide() {
  const s = slides[index];
  titleEl.textContent = s.title;
  subEl.textContent = s.sub;
  ctaEl.textContent = s.cta;
  renderIndicators();
}

// Auto slide
setInterval(() => {
  index = (index + 1) % slides.length;
  updateSlide();
}, 5000);

updateSlide();
