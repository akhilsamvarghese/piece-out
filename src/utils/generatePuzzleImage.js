function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function generatePuzzleImage(levelConfig, size = 920) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;

  const random = createSeededRandom(levelConfig.level * 131 + levelConfig.rows * 37 + levelConfig.cols * 17);

  const pink = '#ff00a8';
  const cyan = '#24cfef';
  const cream = '#eedc96';
  const paper = '#f1f1f1';
  const black = '#070707';

  context.fillStyle = paper;
  context.fillRect(0, 0, size, size);

  const centerX = size * 0.5;
  const centerY = size * 0.5;
  const radius = size * 1.05;
  const rays = 22 + levelConfig.level * 2;

  context.save();
  context.translate(centerX, centerY);
  context.rotate((levelConfig.level * Math.PI) / 14);

  for (let i = 0; i < rays; i += 1) {
    const start = (i / rays) * Math.PI * 2;
    const end = ((i + 1) / rays) * Math.PI * 2;

    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius, start, end);
    context.closePath();
    context.fillStyle = i % 2 === 0 ? pink : paper;
    context.fill();
  }

  context.restore();

  const cardCount = 7 + levelConfig.level * 2;
  for (let i = 0; i < cardCount; i += 1) {
    const width = size * (0.13 + random() * 0.2);
    const height = size * (0.08 + random() * 0.16);
    const x = random() * (size - width);
    const y = random() * (size - height);
    const rotation = (-5 + random() * 10) * (Math.PI / 180);

    context.save();
    context.translate(x + width / 2, y + height / 2);
    context.rotate(rotation);

    context.fillStyle = pick(random, [cream, cyan, paper, pink]);
    context.fillRect(-width / 2, -height / 2, width, height);

    context.strokeStyle = black;
    context.lineWidth = 5;
    context.strokeRect(-width / 2, -height / 2, width, height);

    context.restore();
  }

  context.save();
  context.fillStyle = pink;
  context.fillRect(size * 0.17, size * 0.75, size * 0.66, size * 0.14);
  context.strokeStyle = black;
  context.lineWidth = 8;
  context.strokeRect(size * 0.17, size * 0.75, size * 0.66, size * 0.14);

  context.fillStyle = black;
  context.font = `700 ${Math.round(size * 0.055)}px "Archivo Black", Impact, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(`LEVEL ${String(levelConfig.level).padStart(2, '0')}`, size * 0.5, size * 0.82);
  context.restore();

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `700 ${Math.round(size * 0.2)}px "Archivo Black", Impact, sans-serif`;
  context.fillStyle = cyan;
  context.fillText('FLOW', size * 0.505 + size * 0.01, size * 0.35 + size * 0.01);
  context.fillStyle = pink;
  context.fillText('FLOW', size * 0.505 + size * 0.005, size * 0.35 + size * 0.005);
  context.fillStyle = black;
  context.fillText('FLOW', size * 0.505, size * 0.35);
  context.restore();

  context.strokeStyle = 'rgba(7, 7, 7, 0.25)';
  context.lineWidth = 2;
  for (let i = 1; i < 12; i += 1) {
    context.beginPath();
    context.moveTo(0, (size / 12) * i);
    context.lineTo(size, (size / 12) * i);
    context.stroke();
  }

  return canvas;
}
