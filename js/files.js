// Sistema de archivos del ordenador del juego (en memoria) e iconos en SVG.
// Las fotos se pintan en un canvas al cargar, así no hacen falta archivos de imagen.
window.Game = window.Game || {};

(function () {
  // ---------- Fotos ----------
  function seeded(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function paint(draw, w = 960, h = 640) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    return c.toDataURL('image/jpeg', 0.9);
  }

  function beach(g, w, h) {
    const rnd = seeded(7);
    const horizon = h * 0.56;
    let gr = g.createLinearGradient(0, 0, 0, horizon);
    gr.addColorStop(0, '#2f6fbf');
    gr.addColorStop(0.6, '#8fb7d9');
    gr.addColorStop(1, '#ffd3a3');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, horizon);

    // sol y halo
    const sx = w * 0.68, sy = horizon - h * 0.07;
    gr = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.3);
    gr.addColorStop(0, 'rgba(255,240,200,0.9)');
    gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, horizon);
    g.fillStyle = '#fff4d6';
    g.beginPath();
    g.arc(sx, sy, h * 0.055, 0, Math.PI * 2);
    g.fill();

    // nubes
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 5; i++) {
      const cx = rnd() * w, cy = h * (0.08 + rnd() * 0.25), r = h * (0.03 + rnd() * 0.03);
      for (let j = 0; j < 4; j++) {
        g.beginPath();
        g.ellipse(cx + j * r * 0.9, cy + (j % 2) * r * 0.3, r * 1.4, r * 0.7, 0, 0, Math.PI * 2);
        g.fill();
      }
    }

    // mar
    gr = g.createLinearGradient(0, horizon, 0, h * 0.8);
    gr.addColorStop(0, '#3b7fb3');
    gr.addColorStop(1, '#4fb0be');
    g.fillStyle = gr;
    g.fillRect(0, horizon, w, h * 0.3);
    // reflejo del sol
    for (let i = 0; i < 26; i++) {
      const y = horizon + 4 + i * 6;
      const half = (h * 0.05) * (1 + i * 0.05) * (0.5 + rnd());
      g.fillStyle = `rgba(255,236,190,${0.5 - i * 0.017})`;
      g.fillRect(sx - half, y, half * 2, 2);
    }

    // arena con orilla ondulada
    const shore = (x) => h * 0.74 + Math.sin(x / w * 7) * h * 0.02 + Math.sin(x / w * 17) * h * 0.006;
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, shore(x) - 5);
    g.lineTo(w, h);
    g.fill();
    gr = g.createLinearGradient(0, h * 0.72, 0, h);
    gr.addColorStop(0, '#f0d6a8');
    gr.addColorStop(1, '#d4a970');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, shore(x));
    g.lineTo(w, h);
    g.fill();

    // palmera
    g.strokeStyle = '#5a3d27';
    g.lineWidth = w * 0.018;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(w * 0.14, h * 1.02);
    g.quadraticCurveTo(w * 0.1, h * 0.55, w * 0.2, h * 0.3);
    g.stroke();
    g.fillStyle = '#2f6b3a';
    const top = [w * 0.2, h * 0.3];
    [[-0.6, 0.2], [-0.3, 0.32], [0.2, 0.3], [0.55, 0.22], [0.9, 0.1], [-0.95, 0.1]].forEach(([dx, dy]) => {
      g.beginPath();
      g.moveTo(top[0], top[1]);
      g.quadraticCurveTo(top[0] + dx * w * 0.08, top[1] - h * 0.12,
        top[0] + dx * w * 0.16, top[1] + dy * h * 0.35);
      g.quadraticCurveTo(top[0] + dx * w * 0.08, top[1] - h * 0.05, top[0], top[1]);
      g.fill();
    });
  }

  function mountains(g, w, h) {
    const rnd = seeded(42);
    let gr = g.createLinearGradient(0, 0, 0, h * 0.65);
    gr.addColorStop(0, '#1c2a4d');
    gr.addColorStop(0.55, '#6b5b8c');
    gr.addColorStop(1, '#f2a477');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 70; i++) g.fillRect(rnd() * w, rnd() * h * 0.3, 1.5, 1.5);

    const ridge = (base, amp, color, seed) => {
      const r = seeded(seed);
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, h);
      let y = base;
      for (let x = 0; x <= w + 40; x += 40) {
        y = Math.min(base + amp * 0.3, Math.max(base - amp, y + (r() - 0.5) * amp * 0.7));
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.fill();
    };
    ridge(h * 0.4, h * 0.2, '#7c6f9a', 3);
    ridge(h * 0.5, h * 0.16, '#4d4a78', 9);
    ridge(h * 0.6, h * 0.1, '#2e3258', 15);

    // lago
    gr = g.createLinearGradient(0, h * 0.68, 0, h);
    gr.addColorStop(0, '#d9967a');
    gr.addColorStop(1, '#283055');
    g.fillStyle = gr;
    g.fillRect(0, h * 0.68, w, h * 0.32);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 30; i++) g.fillRect(rnd() * w, h * (0.7 + rnd() * 0.28), w * (0.02 + rnd() * 0.06), 1.5);

    // pinos
    g.fillStyle = '#141a30';
    for (let i = 0; i < 26; i++) {
      const x = (i / 26) * w + rnd() * 20;
      if (x > w * 0.3 && x < w * 0.75) continue;
      const th = h * (0.12 + rnd() * 0.12);
      const base = h * 0.7;
      g.beginPath();
      g.moveTo(x, base - th);
      g.lineTo(x - th * 0.22, base);
      g.lineTo(x + th * 0.22, base);
      g.fill();
    }
  }

  // ---------- Archivos ----------
  // loc: 'desktop' | 'documents' | 'pictures' | 'trash'
  const items = [
    {
      id: 'nota', name: 'nota.txt', type: 'text', loc: 'desktop',
      content:
        'Cosas pendientes:\n' +
        '- Ordenar las fotos de las vacaciones\n' +
        '- Devolver el libro a la biblioteca\n' +
        '- Revisar la carpeta Documentos\n\n' +
        'No te olvides de vaciar la papelera de vez en cuando.',
    },
    { id: 'playa', name: 'playa.jpg', type: 'image', loc: 'desktop', paint: beach },
    { id: 'montana', name: 'montaña.jpg', type: 'image', loc: 'pictures', paint: mountains },
    {
      id: 'recordatorio', name: 'recordatorio.txt', type: 'text', loc: 'documents',
      content: 'Reunión el jueves a las 10:00.\nLlevar el informe impreso.',
    },
    {
      id: 'borrador', name: 'borrador.txt', type: 'text', loc: 'trash', prevLoc: 'documents',
      content: 'Esto no debería haberlo escrito...',
    },
  ];
  items.forEach((it) => { if (it.paint) it.src = paint(it.paint); });

  Game.files = {
    items,
    in: (loc) => items.filter((i) => i.loc === loc),
    get: (id) => items.find((i) => i.id === id),
    move(item, loc) {
      if (item.loc === loc) return false;
      if (loc === 'trash') item.prevLoc = item.loc;
      item.loc = loc;
      return true;
    },
    restore(item) {
      item.loc = item.prevLoc || 'desktop';
      delete item.prevLoc;
    },
    remove(item) {
      const i = items.indexOf(item);
      if (i >= 0) items.splice(i, 1);
    },
  };

  // ---------- Iconos ----------
  const svg = (body) => `<svg viewBox="0 0 48 48">${body}</svg>`;
  Game.icons = {
    pc: () => svg(
      '<rect x="5" y="8" width="38" height="26" rx="2.5" fill="#2b3240" stroke="#151922"/>' +
      '<rect x="8" y="11" width="32" height="20" rx="1" fill="#5aa9e6"/>' +
      '<path d="M8 25 L18 17 L26 23 L31 19 L40 26 V31 H8Z" fill="#3b82c4"/>' +
      '<rect x="20" y="34" width="8" height="5" fill="#3a4150"/>' +
      '<rect x="13" y="39" width="22" height="3" rx="1.5" fill="#4a5262"/>'),
    folder: () => svg(
      '<path d="M4 12 a2 2 0 0 1 2-2 h12 l4 4 h20 a2 2 0 0 1 2 2 v4 H4Z" fill="#d9a527"/>' +
      '<path d="M4 18 h40 v20 a2 2 0 0 1 -2 2 H6 a2 2 0 0 1 -2-2Z" fill="#f4c64b"/>' +
      '<path d="M4 18 h40 v3 H4Z" fill="#ffe08a" opacity=".7"/>'),
    text: () => svg(
      '<path d="M11 4 h19 l9 9 v31 H11Z" fill="#fbfbf8" stroke="#9aa1ab"/>' +
      '<path d="M30 4 v9 h9" fill="#e3e6ea" stroke="#9aa1ab"/>' +
      '<g stroke="#7f95b5" stroke-width="1.6"><path d="M15 19h20M15 24h20M15 29h20M15 34h13"/></g>'),
    image: (src) =>
      `<div class="thumb"><img src="${src}" alt="" draggable="false"></div>`,
    trash: (full) => svg(
      '<path d="M12 14 h24 l-2.2 28 a2 2 0 0 1 -2 1.8 H16.2 a2 2 0 0 1 -2-1.8Z" fill="#cfd8e3" stroke="#6b7b8e"/>' +
      '<g stroke="#8e9db0" stroke-width="1.4"><path d="M19 19 l.8 20M24 19v20M29 19 l-.8 20"/></g>' +
      (full
        ? '<path d="M14 13 l5-7 7 3 5-4 4 8Z" fill="#f4f1e8" stroke="#9aa1ab"/>' +
          '<path d="M20 12 l9-6 3 6Z" fill="#9cc3e6" stroke="#6a8bb0"/>'
        : '') +
      '<rect x="9" y="11" width="30" height="4" rx="1.5" fill="#aebccb" stroke="#6b7b8e"/>' +
      '<rect x="20" y="8" width="8" height="3" rx="1" fill="#aebccb" stroke="#6b7b8e"/>'),
    viewer: () => svg(
      '<rect x="5" y="9" width="38" height="30" rx="3" fill="#3d8bd6"/>' +
      '<circle cx="16" cy="19" r="4" fill="#ffe08a"/>' +
      '<path d="M5 34 L17 24 L25 31 L32 25 L43 34 V36 a3 3 0 0 1 -3 3 H8 a3 3 0 0 1 -3-3Z" fill="#2d6aa8"/>'),
    notes: () => svg(
      '<rect x="9" y="6" width="30" height="37" rx="2" fill="#fff6c9" stroke="#b39b3d"/>' +
      '<rect x="9" y="6" width="30" height="6" rx="2" fill="#f0c94a"/>' +
      '<g stroke="#b9a35a" stroke-width="1.4"><path d="M14 19h20M14 24h20M14 29h20M14 34h12"/></g>'),
  };
})();
