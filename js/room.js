// Habitación: pared de hormigón agrietada, una estampa de una santa sin rostro colgada
// de un cable, cables colgando del techo y cables sobre el escritorio.
// Todo se genera en SVG al cargar (sin archivos de imagen). Las grietas usan un azar con
// semilla, así la habitación es siempre la misma.
window.Game = window.Game || {};

(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const LIT = 'rgba(120, 225, 210, 0.28)';   // reflejo de la luz del monitor en los cables
  const CABLE = '#060608';

  function seeded(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  const f1 = (n) => n.toFixed(1);

  // ---------- Grietas ----------
  // Paseo aleatorio con ramas. Devuelve SVG: un borde claro desplazado (profundidad) y la grieta oscura.
  function crack(rnd, x, y, ang, len, w, depth = 0) {
    const pts = [[x, y]];
    let out = '';
    const steps = Math.max(3, Math.round(len / 14));
    for (let i = 0; i < steps; i++) {
      ang += (rnd() - 0.5) * 0.9;
      const seg = 8 + rnd() * 14;
      x += Math.cos(ang) * seg;
      y += Math.sin(ang) * seg;
      pts.push([x, y]);
      if (depth < 2 && rnd() < 0.14) {
        out += crack(rnd, x, y, ang + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.7), len * 0.45, w * 0.6, depth + 1);
      }
    }
    // Trozos de 4 segmentos que se van estrechando hacia la punta.
    for (let i = 0; i < pts.length - 1; i += 4) {
      const chunk = pts.slice(i, i + 5);
      const d = 'M' + chunk.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L');
      const width = Math.max(0.6, w * (1 - i / pts.length));
      out += `<path d="${d}" transform="translate(1.4 1.6)" stroke="#2c3133" stroke-width="${f1(width * 0.7)}"/>` +
             `<path d="${d}" stroke="#020203" stroke-width="${f1(width)}"/>`;
    }
    return out;
  }

  // ---------- Cables ----------
  // Curva colgante simple (cuadrática) con un brillo fino en el lado de arriba.
  function cable(d, w) {
    return `<path d="${d}" stroke="${CABLE}" stroke-width="${w}"/>` +
           `<path d="${d}" transform="translate(0 ${f1(-w * 0.28)})" stroke="${LIT}" stroke-width="${f1(Math.max(0.8, w * 0.22))}"/>`;
  }
  const hang = (x1, y1, x2, y2, sag, w) =>
    cable(`M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + sag} ${x2} ${y2}`, w);
  const curve = (x1, y1, cx, cy, x2, y2, w) => cable(`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, w);

  // ---------- Estampa de una santa colgada en la pared ----------
  // Cuadrito con arco: santa con velo, aureola y manos juntas, pero sin rostro (óvalo vacío).
  // Cuelga de un cable en vez de un cordel; cristal agrietado y una lucecita roja debajo.
  const FRAME = 'M-70,95 V-50 A70,70 0 0 1 70,-50 V95 Z';
  const PICTURE = 'M-57,82 V-48 A57,57 0 0 1 57,-48 V82 Z';

  function saint() {
    return '<g transform="translate(225 250) rotate(4)">' +
      // cable del que cuelga, desde un clavo
      `<g fill="none" stroke-linejoin="round">${cable('M-44,-88 L0,-150 L44,-88', 3)}</g>` +
      '<circle cx="0" cy="-150" r="4" fill="#3a3d40" stroke="#000"/>' +
      // sombra en la pared y marco
      `<path d="${FRAME}" transform="translate(8 10)" fill="#000" opacity=".6" filter="url(#soft)"/>` +
      `<path d="${FRAME}" fill="url(#frame)" stroke="#000" stroke-width="2"/>` +
      '<path d="M-64,90 V-50 A64,64 0 0 1 64,-50 V90 Z" fill="none" stroke="#8a7240" stroke-width="1.5" opacity=".6"/>' +
      // pintura
      '<g clip-path="url(#picclip)">' +
      `  <path d="${PICTURE}" fill="url(#icon-bg)"/>` +
      '  <circle cx="0" cy="-38" r="44" fill="url(#icon-glow)"/>' +
      '  <circle cx="0" cy="-38" r="27" fill="#9c7f3c" opacity=".55" stroke="#c9a24a" stroke-width="2"/>' +
      '  <path d="M-42,-2 C-50,30 -54,60 -56,90 L56,90 C54,60 50,30 42,-2 Z" fill="#5a1c22"/>' +
      '  <path d="M-15,0 C-17,30 -17,60 -19,90 L19,90 C17,60 17,30 15,0 Z" fill="#1f3a39"/>' +
      '  <path d="M0,-64 C17,-64 26,-48 27,-28 C29,-14 33,-6 42,0 L-42,0 C-33,-6 -29,-14 -27,-28 C-26,-48 -17,-64 0,-64 Z" fill="#5a1c22"/>' +
      '  <path d="M0,-64 C17,-64 26,-48 27,-28" fill="none" stroke="#c9a24a" stroke-width="1.4" opacity=".7"/>' +
      '  <path d="M0,-64 C-17,-64 -26,-48 -27,-28" fill="none" stroke="#c9a24a" stroke-width="1.4" opacity=".7"/>' +
      // sin rostro: solo un óvalo liso
      '  <ellipse cx="0" cy="-36" rx="12" ry="16" fill="#cfc8b4"/>' +
      '  <path d="M-5,34 C-6,24 -2,14 0,10 C2,14 6,24 5,34 Z" fill="#cfc8b4"/>' +
      '  <path d="M-30,20 C-22,34 -12,38 -5,34 M30,20 C22,34 12,38 5,34" fill="none" stroke="#2a0c10" stroke-width="2"/>' +
      // pintura vieja: grano, sombra del lado lejos de la pantalla, reflejo y grietas del cristal
      '  <rect x="-60" y="-110" width="120" height="200" filter="url(#grit)" opacity=".45"/>' +
      '  <rect x="-60" y="-110" width="60" height="200" fill="#000" opacity=".35" filter="url(#soft)"/>' +
      '  <path d="M-60,-20 L20,-110 L45,-110 L-60,10 Z" fill="#fff" opacity=".05"/>' +
      '  <path d="M22,40 L-40,-30 M22,40 L50,-60 M22,40 L-10,90 M22,40 L60,55 M22,40 L-45,62" stroke="#d6fff4" stroke-width=".9" opacity=".35"/>' +
      '</g>' +
      // lucecita roja de vela bajo el cuadro
      '<circle cx="0" cy="128" r="26" fill="url(#votive)"/>' +
      '<rect x="-6" y="122" width="12" height="16" rx="2" fill="#2a1416" stroke="#000"/>' +
      '<circle cx="0" cy="124" r="3" fill="#ff3346"/>' +
      '</g>';
  }

  // ---------- Pared completa ----------
  function buildWalls() {
    const rnd = seeded(2024);
    let cracks = '';
    // grietas por la pared (izquierda, derecha y techo), algunas salen de donde entran cables
    [
      [20, 40, 0.5, 320, 5], [140, 0, 1.4, 260, 4], [60, 600, -0.6, 280, 4.5],
      [1600, 300, 2.9, 360, 5.5], [1290, 320, 0.2, 240, 4], [1460, 0, 1.8, 300, 4.5],
      [1350, 640, -1.2, 260, 4], [700, 0, 1.2, 140, 3], [980, 0, 1.9, 160, 3.2],
    ].forEach(([x, y, a, l, w]) => { cracks += crack(rnd, x, y, a, l, w); });

    // manchas de humedad
    let stains = '';
    for (let i = 0; i < 9; i++) {
      stains += `<ellipse cx="${f1(rnd() * 1600)}" cy="${f1(rnd() * 500)}" rx="${f1(60 + rnd() * 160)}" ` +
        `ry="${f1(40 + rnd() * 120)}" fill="${rnd() < 0.5 ? '#2a1c14' : '#000'}" opacity=".35" filter="url(#blur)"/>`;
    }
    // chorretones desde el techo
    let drips = '';
    for (let i = 0; i < 14; i++) {
      const x = rnd() * 1600;
      drips += `<path d="M${f1(x)} 0 l${f1((rnd() - 0.5) * 6)} ${f1(60 + rnd() * 200)}" stroke="#000" ` +
        `stroke-width="${f1(2 + rnd() * 5)}" opacity=".25" filter="url(#soft)"/>`;
    }

    const back =
      hang(-40, 30, 760, -10, 170, 7) + hang(380, -10, 1250, -20, 150, 9) + hang(900, -10, 1650, 60, 200, 7) +
      hang(-20, 140, 520, -10, 160, 12) + hang(1100, -10, 1640, 180, 210, 12) +
      curve(1600, 120, 1400, 420, 1290, 320, 10) +            // entra en la grieta de la derecha
      curve(-40, 520, 40, 420, 20, 40, 8);                    // entra en la grieta de arriba a la izquierda

    const front =
      curve(90, -10, 60, 400, 70, 910, 6) + curve(130, -10, 120, 500, 40, 910, 9) +
      curve(1480, -10, 1500, 500, 1460, 910, 8) + curve(1540, -10, 1520, 400, 1580, 910, 11) +
      curve(1420, -10, 1440, 300, 1350, 640, 7) +             // baja hasta otra grieta
      hang(-30, 250, 470, 120, 260, 14) + hang(1180, 140, 1640, 260, 260, 16) +
      curve(-20, 700, 160, 520, 470, 640, 18) + curve(1630, 620, 1420, 520, 1150, 660, 20);

    // caja de empalmes en la pared derecha, con un cable que sale de ella
    const box =
      '<g transform="translate(1300 420) rotate(2)">' +
      '<rect width="90" height="120" fill="#24272a" stroke="#0a0b0c" stroke-width="3"/>' +
      '<rect x="8" y="8" width="74" height="104" fill="none" stroke="#3b4144" stroke-width="1.5"/>' +
      '<rect x="12" y="70" width="38" height="16" fill="#8a7d5c" opacity=".7" transform="rotate(-6 31 78)"/>' +
      '<circle cx="66" cy="22" r="4" fill="#c4202f" opacity=".85"/>' +
      '</g>' + curve(1345, 540, 1340, 620, 1250, 660, 9);

    return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">` +
      '<defs>' +
      '<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16181b"/>' +
      '<stop offset=".6" stop-color="#1c1f22"/><stop offset="1" stop-color="#0c0d0f"/></linearGradient>' +
      '<linearGradient id="stone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#121516"/>' +
      '<stop offset=".55" stop-color="#3e4a49"/><stop offset="1" stop-color="#7e908d"/></linearGradient>' +
      '<filter id="grit" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .05" numOctaves="4" seed="3"/>' +
      '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.1"/></filter>' +
      '<filter id="concrete" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5"/>' +
      '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 .75"/></filter>' +
      '<filter id="blotch" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006 .01" numOctaves="3" seed="8"/>' +
      '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 1.2"/></filter>' +
      '<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>' +
      '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>' +
      `<clipPath id="picclip"><path d="${PICTURE}"/></clipPath>` +
      '<linearGradient id="frame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#17130f"/>' +
      '<stop offset=".7" stop-color="#3a3128"/><stop offset="1" stop-color="#5b5246"/></linearGradient>' +
      '<linearGradient id="icon-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14201e"/>' +
      '<stop offset="1" stop-color="#070d0c"/></linearGradient>' +
      '<radialGradient id="icon-glow"><stop offset="0" stop-color="#c9a24a" stop-opacity=".35"/>' +
      '<stop offset="1" stop-color="#c9a24a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="votive"><stop offset="0" stop-color="#ff3346" stop-opacity=".45"/>' +
      '<stop offset="1" stop-color="#ff3346" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="1600" height="900" fill="url(#wall)"/>' +
      '<rect width="1600" height="900" filter="url(#blotch)" opacity=".5"/>' +
      '<rect width="1600" height="900" filter="url(#concrete)" opacity=".35"/>' +
      stains + drips +
      '<path d="M150 0 V900 M1450 0 V900" stroke="#08090a" stroke-width="3" opacity=".6"/>' +
      `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${cracks}</g>` +
      `<g fill="none" stroke-linecap="round">${back}</g>` +
      saint() + box +
      `<g fill="none" stroke-linecap="round">${front}</g>` +
      '</svg>';
  }

  document.getElementById('walls').innerHTML = buildWalls();

  // ---------- Cables sobre el escritorio ----------
  // El SVG vive en el plano inclinado y usa sus unidades (1 = una tecla).
  const deskSvg = document.getElementById('desk-cables');
  let mouseCable = null;
  let mouseAnchor = { x: 0, y: 0 };

  const flat = (d, w) =>
    `<path d="${d}" stroke="${CABLE}" stroke-width="${w}"/>` +
    `<path d="${d}" transform="translate(0 ${f1(-w * 0.3)})" stroke="${LIT}" stroke-width="${(w * 0.25).toFixed(3)}"/>`;

  function layoutDesk({ planeW, planeH, kx, ky, kw, mouseHome }) {
    deskSvg.setAttribute('viewBox', `0 0 ${planeW.toFixed(3)} ${planeH.toFixed(3)}`);
    deskSvg.style.width = `${planeW}em`;
    deskSvg.style.height = `${planeH}em`;
    const H = planeH;
    const kc = kx + kw / 2;
    mouseAnchor = { x: mouseHome.x + 1.2, y: -1 };
    deskSvg.innerHTML =
      '<g fill="none" stroke-linecap="round">' +
      // cable del teclado, se pierde detrás del monitor
      flat(`M${kc} ${ky + 0.1} Q${kc + 1.5} ${ky - 1.5} ${kc + 0.6} -1`, 0.22) +
      // marañas a los lados
      flat(`M-1 ${H * 0.35} Q${kx * 0.6} ${H * 0.2} ${kx * 0.8} ${H * 0.55} T-1 ${H * 0.95}`, 0.34) +
      flat(`M-1 ${H * 0.6} Q${kx * 0.5} ${H * 0.4} ${kx - 0.6} -1`, 0.26) +
      flat(`M-1 ${H * 0.15} C${kx * 0.4} ${H * 0.1} ${kx * 0.7} ${H * 0.9} ${kx * 0.2} ${H + 1}`, 0.4) +
      flat(`M${planeW + 1} ${H * 0.3} Q${mouseHome.x + 4} ${H * 0.15} ${mouseHome.x + 3.5} ${H * 0.7} T${planeW + 1} ${H * 0.9}`, 0.36) +
      flat(`M${planeW + 1} ${H * 0.55} C${mouseHome.x + 5} ${H * 0.6} ${mouseHome.x + 2} -0.5 ${mouseHome.x + 4} -1`, 0.3) +
      '</g><g fill="none" stroke-linecap="round" id="mouse-cable"></g>';
    mouseCable = deskSvg.querySelector('#mouse-cable');
  }

  // Cable del ratón: sale de la parte de arriba del ratón y se va detrás del monitor.
  function updateMouseCable(top) {
    if (!mouseCable) return;
    const a = mouseAnchor;
    mouseCable.innerHTML = flat(
      `M${top.x.toFixed(3)} ${top.y.toFixed(3)} C${top.x.toFixed(3)} ${(top.y - 1.4).toFixed(3)} ` +
      `${(a.x - 0.8).toFixed(3)} ${(a.y + 1.6).toFixed(3)} ${a.x.toFixed(3)} ${a.y}`, 0.16);
  }

  Game.room = { layoutDesk, updateMouseCable };
})();
