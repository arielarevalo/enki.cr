/** Seeded PRNG (mulberry32) for deterministic ray generation */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hero: Radiant Emergence SVG */
export function generateHeroBg() {
  const rand = mulberry32(42);
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 1400 900");
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

  const defs = document.createElementNS(ns, "defs");

  // Glow filter — wide bloom
  const filter = document.createElementNS(ns, "filter");
  filter.setAttribute("id", "glow");
  filter.setAttribute("x", "-50%");
  filter.setAttribute("y", "-50%");
  filter.setAttribute("width", "200%");
  filter.setAttribute("height", "200%");
  const blur = document.createElementNS(ns, "feGaussianBlur");
  blur.setAttribute("stdDeviation", "6");
  filter.appendChild(blur);
  defs.appendChild(filter);

  // Soft bloom filter for core
  const filter2 = document.createElementNS(ns, "filter");
  filter2.setAttribute("id", "core-bloom");
  filter2.setAttribute("x", "-100%");
  filter2.setAttribute("y", "-100%");
  filter2.setAttribute("width", "300%");
  filter2.setAttribute("height", "300%");
  const blur2 = document.createElementNS(ns, "feGaussianBlur");
  blur2.setAttribute("stdDeviation", "18");
  filter2.appendChild(blur2);
  defs.appendChild(filter2);

  // Radial gradient for central glow
  const radGrad = document.createElementNS(ns, "radialGradient");
  radGrad.setAttribute("id", "center-glow");
  radGrad.setAttribute("cx", "0.6");
  radGrad.setAttribute("cy", "0.4");
  radGrad.setAttribute("r", "0.25");
  const stop1 = document.createElementNS(ns, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "rgba(180,230,200,0.45)");
  const stop2 = document.createElementNS(ns, "stop");
  stop2.setAttribute("offset", "40%");
  stop2.setAttribute("stop-color", "rgba(120,200,160,0.15)");
  const stop3 = document.createElementNS(ns, "stop");
  stop3.setAttribute("offset", "100%");
  stop3.setAttribute("stop-color", "transparent");
  radGrad.appendChild(stop1);
  radGrad.appendChild(stop2);
  radGrad.appendChild(stop3);
  defs.appendChild(radGrad);

  svg.appendChild(defs);

  // Bright core radial gradient
  const coreGrad = document.createElementNS(ns, "radialGradient");
  coreGrad.setAttribute("id", "hot-core");
  coreGrad.setAttribute("cx", "0.5");
  coreGrad.setAttribute("cy", "0.5");
  coreGrad.setAttribute("r", "0.5");
  const cs1 = document.createElementNS(ns, "stop");
  cs1.setAttribute("offset", "0%");
  cs1.setAttribute("stop-color", "rgba(230,255,245,1)");
  const cs2 = document.createElementNS(ns, "stop");
  cs2.setAttribute("offset", "25%");
  cs2.setAttribute("stop-color", "rgba(150,220,180,0.5)");
  const cs3 = document.createElementNS(ns, "stop");
  cs3.setAttribute("offset", "100%");
  cs3.setAttribute("stop-color", "transparent");
  coreGrad.appendChild(cs1);
  coreGrad.appendChild(cs2);
  coreGrad.appendChild(cs3);
  defs.appendChild(coreGrad);

  // Central ambient glow rectangle
  const glowRect = document.createElementNS(ns, "rect");
  glowRect.setAttribute("width", "1400");
  glowRect.setAttribute("height", "900");
  glowRect.setAttribute("fill", "url(#center-glow)");
  svg.appendChild(glowRect);

  const mainG = document.createElementNS(ns, "g");
  const glowG = document.createElementNS(ns, "g");
  glowG.setAttribute("filter", "url(#glow)");
  const coreG = document.createElementNS(ns, "g");
  coreG.setAttribute("filter", "url(#core-bloom)");

  const cx = 840,
    cy = 360;
  let pulseCount = 0;

  // Hot core — layered circles at focal point
  const hotCore = document.createElementNS(ns, "circle");
  hotCore.setAttribute("cx", String(cx));
  hotCore.setAttribute("cy", String(cy));
  hotCore.setAttribute("r", "90");
  hotCore.setAttribute("fill", "url(#hot-core)");
  coreG.appendChild(hotCore);

  // Dense inner burst — 30 very short bright rays
  for (let j = 0; j < 30; j++) {
    const ba = rand() * Math.PI * 2;
    const bl = 30 + rand() * 120;
    const bline = document.createElementNS(ns, "line");
    bline.setAttribute("x1", String(cx));
    bline.setAttribute("y1", String(cy));
    bline.setAttribute("x2", String(Math.round(cx + bl * Math.cos(ba))));
    bline.setAttribute("y2", String(Math.round(cy + bl * Math.sin(ba))));
    bline.setAttribute(
      "stroke",
      rand() < 0.5 ? "rgba(180,240,210,0.7)" : "rgba(255,255,255,0.8)"
    );
    bline.setAttribute("stroke-width", (0.5 + rand() * 1.5).toFixed(1));
    bline.setAttribute("opacity", (0.15 + rand() * 0.35).toFixed(2));
    mainG.appendChild(bline);
    const bgl = bline.cloneNode(false) as SVGLineElement;
    glowG.appendChild(bgl);
  }

  for (let i = 0; i < 120; i++) {
    // Angle: ~270° arc, sparse at bottom-left where text lives
    const angleDeg = -135 + rand() * 270;
    const angle = (angleDeg * Math.PI) / 180;
    const len = 150 + rand() * 700;

    // Shorter rays = brighter (concentrated near core)
    const distFactor = 1 - (len - 150) / 700;
    const baseOpacity = 0.03 + distFactor * 0.3;
    const opacity = baseOpacity * (0.4 + rand() * 0.6);

    const sw = 0.3 + rand() * 1.5 + distFactor * 1.0;
    const isGreen = rand() < 0.4;
    const color = isGreen
      ? "rgba(120,200,160,0.6)"
      : "rgba(255,255,255,0.9)";

    const x2 = cx + len * Math.cos(angle);
    const y2 = cy + len * Math.sin(angle);

    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(cx));
    line.setAttribute("y1", String(cy));
    line.setAttribute("x2", String(Math.round(x2)));
    line.setAttribute("y2", String(Math.round(y2)));
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", sw.toFixed(1));
    line.setAttribute("opacity", opacity.toFixed(3));

    if (pulseCount < 8 && opacity > 0.12 && rand() < 0.4) {
      line.classList.add("ray-pulse");
      line.style.setProperty("--base-opacity", opacity.toFixed(3));
      line.style.setProperty(
        "--pulse-duration",
        (3 + rand() * 5).toFixed(1) + "s"
      );
      line.style.setProperty(
        "--pulse-delay",
        (rand() * 3).toFixed(1) + "s"
      );
      pulseCount++;
    }

    mainG.appendChild(line);

    // Bright rays get glow duplicates
    if (opacity > 0.12) {
      const gl = line.cloneNode(false) as SVGLineElement;
      gl.classList.remove("ray-pulse");
      glowG.appendChild(gl);
    }

    // Core rays (very short, bright) get extra bloom
    if (len < 300 && opacity > 0.15) {
      const cl = line.cloneNode(false) as SVGLineElement;
      cl.classList.remove("ray-pulse");
      cl.setAttribute("opacity", (opacity * 0.6).toFixed(3));
      coreG.appendChild(cl);
    }
  }

  // Fill left-side gap (135° to 225°) with same length distribution
  for (let k = 0; k < 40; k++) {
    const angleDeg2 = 135 + rand() * 90;
    const angle2 = (angleDeg2 * Math.PI) / 180;
    const len2 = 150 + rand() * 700;

    const distFactor2 = 1 - (len2 - 150) / 700;
    const baseOpacity2 = 0.03 + distFactor2 * 0.3;
    const opacity2 = baseOpacity2 * (0.4 + rand() * 0.6);

    const sw2 = 0.3 + rand() * 1.5 + distFactor2 * 1.0;
    const isGreen2 = rand() < 0.4;
    const color2 = isGreen2
      ? "rgba(120,200,160,0.6)"
      : "rgba(255,255,255,0.9)";

    const lx2 = cx + len2 * Math.cos(angle2);
    const ly2 = cy + len2 * Math.sin(angle2);

    const line2 = document.createElementNS(ns, "line");
    line2.setAttribute("x1", String(cx));
    line2.setAttribute("y1", String(cy));
    line2.setAttribute("x2", String(Math.round(lx2)));
    line2.setAttribute("y2", String(Math.round(ly2)));
    line2.setAttribute("stroke", color2);
    line2.setAttribute("stroke-width", sw2.toFixed(1));
    line2.setAttribute("opacity", opacity2.toFixed(3));

    mainG.appendChild(line2);

    if (opacity2 > 0.12) {
      const gl2 = line2.cloneNode(false) as SVGLineElement;
      glowG.appendChild(gl2);
    }
    if (len2 < 300 && opacity2 > 0.15) {
      const cl2 = line2.cloneNode(false) as SVGLineElement;
      cl2.setAttribute("opacity", (opacity2 * 0.6).toFixed(3));
      coreG.appendChild(cl2);
    }
  }

  // White-hot center point — rendered last (on top of all rays)
  const whiteCore = document.createElementNS(ns, "circle");
  whiteCore.setAttribute("cx", String(cx));
  whiteCore.setAttribute("cy", String(cy));
  whiteCore.setAttribute("r", "8");
  whiteCore.setAttribute("fill", "rgba(255,255,255,0.85)");
  const bloomRing = document.createElementNS(ns, "circle");
  bloomRing.setAttribute("cx", String(cx));
  bloomRing.setAttribute("cy", String(cy));
  bloomRing.setAttribute("r", "25");
  bloomRing.setAttribute("fill", "rgba(200,245,220,0.35)");

  svg.appendChild(coreG);
  svg.appendChild(glowG);
  svg.appendChild(mainG);
  // Top layer: bloom ring (blurred) then crisp white core
  const topG = document.createElementNS(ns, "g");
  topG.setAttribute("filter", "url(#glow)");
  topG.appendChild(bloomRing);
  svg.appendChild(topG);
  svg.appendChild(whiteCore);
  document.getElementById("hero-bg")!.appendChild(svg);
}

/** Contact: Convergence SVG */
export function generateContactBg() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 800 800");
  svg.setAttribute("fill", "none");

  for (let i = 0; i < 24; i++) {
    const angle = (i * 15 * Math.PI) / 180;
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", "400");
    line.setAttribute("y1", "400");
    line.setAttribute("x2", String(Math.round(400 + 400 * Math.cos(angle))));
    line.setAttribute("y2", String(Math.round(400 + 400 * Math.sin(angle))));
    line.setAttribute("stroke", "white");
    line.setAttribute("stroke-width", "0.5");
    line.setAttribute("opacity", "0.04");
    svg.appendChild(line);
  }

  document.getElementById("contact-bg")!.appendChild(svg);
}
