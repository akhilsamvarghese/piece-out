const PICKUP_SCALE = 1.05;
const PICKUP_SHADOW = 15;
const SNAP_DURATION = 100;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeInOutQuad(progress) {
  if (progress < 0.5) {
    return 2 * progress * progress;
  }
  return 1 - ((-2 * progress + 2) ** 2) / 2;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function getSnapDistance(piece) {
  const dx = piece.x - piece.targetX;
  const dy = piece.y - piece.targetY;
  return Math.hypot(dx, dy);
}

export function isWithinSnapRadius(piece, snapRadius) {
  return getSnapDistance(piece) < snapRadius;
}

export function areAllPiecesSnapped(pieces) {
  return pieces.length > 0 && pieces.every((piece) => piece.isSnapped);
}

export default class PuzzleEngine {
  constructor({ canvas, imageBitmap, levelConfig, onProgress, onLevelComplete, onSnap }) {
    this.canvas = canvas;
    this.context = this.canvas.getContext('2d');
    this.imageBitmap = imageBitmap;
    this.levelConfig = levelConfig;

    this.onProgress = onProgress;
    this.onLevelComplete = onLevelComplete;
    this.onSnap = onSnap;

    this.pieces = [];
    this.activePiece = null;
    this.activePointerId = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.viewportWidth = 0;
    this.viewportHeight = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.boardSize = 0;
    this.pieceWidth = 0;
    this.pieceHeight = 0;

    this.rafId = null;
    this.isRunning = false;
    this.isDestroyed = false;
    this.levelCompleted = false;

    this.tick = this.tick.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.refreshCanvasMetrics();
    this.createPieces();
    this.attachEvents();
    this.emitProgress();
    this.draw(performance.now());
  }

  attachEvents() {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);
    window.addEventListener('resize', this.handleResize);
  }

  detachEvents() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('resize', this.handleResize);
  }

  refreshCanvasMetrics() {
    const bounds = this.canvas.getBoundingClientRect();
    this.viewportWidth = Math.max(320, bounds.width || 320);
    this.viewportHeight = Math.max(320, bounds.height || 320);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.viewportWidth * dpr);
    this.canvas.height = Math.round(this.viewportHeight * dpr);

    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.imageSmoothingEnabled = true;

    const boardPadding = 24;
    const maxBoard = Math.min(this.viewportWidth, this.viewportHeight) - boardPadding * 2;
    const gridSize = Math.max(this.levelConfig.rows, this.levelConfig.cols);
    const baseScale = this.viewportWidth < 760 ? 0.72 : 0.66;
    const boardScale = clamp(baseScale - (gridSize - 3) * 0.04, 0.52, 0.74);
    this.boardSize = Math.max(220, Math.min(maxBoard, Math.min(this.viewportWidth * boardScale, this.viewportHeight * boardScale)));
    this.boardX = (this.viewportWidth - this.boardSize) / 2;
    this.boardY = (this.viewportHeight - this.boardSize) / 2;

    this.pieceWidth = this.boardSize / this.levelConfig.cols;
    this.pieceHeight = this.boardSize / this.levelConfig.rows;
  }

  createPieces() {
    const sourceWidth = this.imageBitmap.width / this.levelConfig.cols;
    const sourceHeight = this.imageBitmap.height / this.levelConfig.rows;
    const total = this.levelConfig.rows * this.levelConfig.cols;

    const positions = this.buildSpawnPositions(total);
    const pieces = [];

    let index = 0;
    for (let row = 0; row < this.levelConfig.rows; row += 1) {
      for (let col = 0; col < this.levelConfig.cols; col += 1) {
        const spawn = positions[index];
        pieces.push({
          id: `${row}-${col}`,
          row,
          col,
          sx: col * sourceWidth,
          sy: row * sourceHeight,
          sw: sourceWidth,
          sh: sourceHeight,
          x: spawn.x,
          y: spawn.y,
          targetX: this.boardX + col * this.pieceWidth,
          targetY: this.boardY + row * this.pieceHeight,
          isSnapped: false,
          scale: 1,
          shadowBlur: 0,
          nearSnap: false,
          width: this.pieceWidth,
          height: this.pieceHeight,
          snapAnimation: null
        });
        index += 1;
      }
    }

    this.pieces = pieces;
    this.levelCompleted = false;
  }

  buildSpawnPositions(total) {
    const random = createSeededRandom(this.levelConfig.level * 1097 + total * 173);
    const positions = [];

    const outerMargin = 8;
    const sideGap = 16;
    const horizontalGap = Math.max(8, Math.round(this.pieceWidth * 0.12));
    const verticalGap = Math.max(10, Math.round(this.pieceHeight * 0.12));

    const minX = outerMargin;
    const maxX = this.viewportWidth - this.pieceWidth - outerMargin;
    const maxY = this.viewportHeight - this.pieceHeight - outerMargin;
    const hudReserveRatio = this.viewportWidth < 900 ? 0.28 : 0.21;
    const hudReservedTop = Math.round(this.viewportHeight * hudReserveRatio);
    const uiReservedTop = Math.min(
      Math.max(outerMargin, hudReservedTop),
      Math.max(outerMargin, maxY)
    );

    const boardSafeLeft = this.boardX - sideGap;
    const boardSafeTop = this.boardY - sideGap;
    const boardSafeRight = this.boardX + this.boardSize + sideGap;
    const boardSafeBottom = this.boardY + this.boardSize + sideGap;

    const logoSafeWidth = Math.min(220, this.viewportWidth * 0.24);
    const logoSafeHeight = Math.max(96, Math.round(this.viewportHeight * 0.15));

    const xStep = this.pieceWidth + horizontalGap;
    const yStep = this.pieceHeight + verticalGap;
    const slotKeys = new Set();
    const slots = [];

    const randomBetween = (min, max) => {
      if (max <= min) {
        return min;
      }
      return min + random() * (max - min);
    };

    const overlapsBoard = (x, y) =>
      x < boardSafeRight &&
      x + this.pieceWidth > boardSafeLeft &&
      y < boardSafeBottom &&
      y + this.pieceHeight > boardSafeTop;

    const overlapsLogoZone = (x, y) => x < logoSafeWidth && y < logoSafeHeight;

    const addSlot = (rawX, rawY) => {
      const x = clamp(Math.round(rawX), minX, maxX);
      const y = clamp(Math.round(rawY), uiReservedTop, maxY);
      if (overlapsBoard(x, y) || overlapsLogoZone(x, y)) {
        return;
      }

      const key = `${x}:${y}`;
      if (slotKeys.has(key)) {
        return;
      }

      slotKeys.add(key);
      slots.push({ x, y });
    };

    // Left rails (closest to the board first, then outward).
    for (let x = this.boardX - this.pieceWidth - sideGap; x >= minX; x -= xStep) {
      for (let y = uiReservedTop; y <= maxY; y += yStep) {
        addSlot(x, y);
      }
    }

    // Right rails.
    for (let x = this.boardX + this.boardSize + sideGap; x <= maxX; x += xStep) {
      for (let y = uiReservedTop; y <= maxY; y += yStep) {
        addSlot(x, y);
      }
    }

    // Bottom rails.
    for (let y = this.boardY + this.boardSize + sideGap; y <= maxY; y += yStep) {
      for (let x = minX; x <= maxX; x += xStep) {
        addSlot(x, y);
      }
    }

    // Top rails (if enough space below the reserved UI band).
    for (let y = this.boardY - this.pieceHeight - sideGap; y >= uiReservedTop; y -= yStep) {
      for (let x = minX; x <= maxX; x += xStep) {
        addSlot(x, y);
      }
    }

    for (let i = slots.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    const selected = [];
    const minOverlapBuffer = Math.max(8, Math.round(Math.min(this.pieceWidth, this.pieceHeight) * 0.18));
    const relaxedBuffer = Math.max(4, Math.round(minOverlapBuffer * 0.55));
    const overlapsPlaced = (a, b) =>
      !(
        a.x + this.pieceWidth - minOverlapBuffer <= b.x ||
        b.x + this.pieceWidth - minOverlapBuffer <= a.x ||
        a.y + this.pieceHeight - minOverlapBuffer <= b.y ||
        b.y + this.pieceHeight - minOverlapBuffer <= a.y
      );
    const overlapsPlacedRelaxed = (a, b) =>
      !(
        a.x + this.pieceWidth - relaxedBuffer <= b.x ||
        b.x + this.pieceWidth - relaxedBuffer <= a.x ||
        a.y + this.pieceHeight - relaxedBuffer <= b.y ||
        b.y + this.pieceHeight - relaxedBuffer <= a.y
      );

    for (const slot of slots) {
      if (selected.length >= total) {
        break;
      }
      if (selected.some((placed) => overlapsPlaced(slot, placed))) {
        continue;
      }
      selected.push(slot);
    }

    // Relax overlap threshold only if we still need more slots.
    if (selected.length < total) {
      for (const slot of slots) {
        if (selected.length >= total) {
          break;
        }
        if (selected.some((placed) => overlapsPlacedRelaxed(slot, placed))) {
          continue;
        }
        selected.push(slot);
      }
    }

    // Final fallback: place random safe positions to avoid hard failure on tiny viewports.
    let attempts = 0;
    while (selected.length < total && attempts < total * 300) {
      attempts += 1;
      const candidate = {
        x: randomBetween(minX, maxX),
        y: randomBetween(uiReservedTop, maxY)
      };

      if (overlapsBoard(candidate.x, candidate.y) || overlapsLogoZone(candidate.x, candidate.y)) {
        continue;
      }

      if (selected.some((placed) => overlapsPlacedRelaxed(candidate, placed))) {
        continue;
      }

      selected.push({
        x: Math.round(candidate.x),
        y: Math.round(candidate.y)
      });
    }

    while (selected.length < total) {
      const fallbackIndex = selected.length;
      selected.push({
        x: clamp(minX + (fallbackIndex % 2) * xStep, minX, maxX),
        y: clamp(uiReservedTop + (fallbackIndex % 6) * Math.max(16, yStep * 0.68), uiReservedTop, maxY)
      });
    }

    return selected;
  }

  handleResize() {
    if (this.isDestroyed) {
      return;
    }

    const previous = {
      boardX: this.boardX,
      boardY: this.boardY,
      boardSize: this.boardSize,
      pieceWidth: this.pieceWidth,
      pieceHeight: this.pieceHeight
    };

    this.refreshCanvasMetrics();

    for (const piece of this.pieces) {
      piece.targetX = this.boardX + piece.col * this.pieceWidth;
      piece.targetY = this.boardY + piece.row * this.pieceHeight;
      piece.width = this.pieceWidth;
      piece.height = this.pieceHeight;

      if (piece.isSnapped || piece.snapAnimation) {
        piece.x = piece.targetX;
        piece.y = piece.targetY;
        piece.snapAnimation = null;
        continue;
      }

      const relX = (piece.x - previous.boardX) / Math.max(previous.boardSize, 1);
      const relY = (piece.y - previous.boardY) / Math.max(previous.boardSize, 1);
      piece.x = clamp(this.boardX + relX * this.boardSize, 8, this.viewportWidth - piece.width - 8);
      piece.y = clamp(this.boardY + relY * this.boardSize, 8, this.viewportHeight - piece.height - 8);
    }

    this.startLoop();
  }

  getPointerPosition(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  }

  findPieceAt(x, y) {
    for (let index = this.pieces.length - 1; index >= 0; index -= 1) {
      const piece = this.pieces[index];
      if (piece.isSnapped) {
        continue;
      }

      const width = piece.width * piece.scale;
      const height = piece.height * piece.scale;
      const drawX = piece.x - (width - piece.width) / 2;
      const drawY = piece.y - (height - piece.height) / 2;

      if (x >= drawX && x <= drawX + width && y >= drawY && y <= drawY + height) {
        return { piece, index };
      }
    }

    return null;
  }

  handlePointerDown(event) {
    if (this.levelCompleted || this.activePiece) {
      return;
    }

    const point = this.getPointerPosition(event);
    const hit = this.findPieceAt(point.x, point.y);
    if (!hit) {
      return;
    }

    const { piece, index } = hit;
    if (index !== this.pieces.length - 1) {
      this.pieces.splice(index, 1);
      this.pieces.push(piece);
    }

    this.activePiece = piece;
    this.activePointerId = event.pointerId;
    this.dragOffsetX = point.x - piece.x;
    this.dragOffsetY = point.y - piece.y;

    piece.scale = PICKUP_SCALE;
    piece.shadowBlur = PICKUP_SHADOW;

    if (this.canvas.setPointerCapture) {
      this.canvas.setPointerCapture(event.pointerId);
    }

    this.startLoop();
    event.preventDefault();
  }

  handlePointerMove(event) {
    if (!this.activePiece || event.pointerId !== this.activePointerId) {
      return;
    }

    const point = this.getPointerPosition(event);
    this.activePiece.x = clamp(point.x - this.dragOffsetX, 8, this.viewportWidth - this.activePiece.width - 8);
    this.activePiece.y = clamp(point.y - this.dragOffsetY, 8, this.viewportHeight - this.activePiece.height - 8);
    this.activePiece.nearSnap = isWithinSnapRadius(this.activePiece, this.levelConfig.snapRadius);

    this.startLoop();
    event.preventDefault();
  }

  handlePointerUp(event) {
    if (!this.activePiece || event.pointerId !== this.activePointerId) {
      return;
    }

    if (this.canvas.releasePointerCapture && this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    this.activePiece.scale = 1;
    this.activePiece.shadowBlur = 0;

    if (isWithinSnapRadius(this.activePiece, this.levelConfig.snapRadius)) {
      this.startSnapAnimation(this.activePiece);
    } else {
      this.activePiece.nearSnap = false;
    }

    this.activePiece = null;
    this.activePointerId = null;

    this.startLoop();
    event.preventDefault();
  }

  startSnapAnimation(piece) {
    if (piece.isSnapped || piece.snapAnimation) {
      return;
    }

    piece.snapAnimation = {
      startX: piece.x,
      startY: piece.y,
      startedAt: performance.now(),
      duration: SNAP_DURATION
    };
    piece.nearSnap = false;
  }

  updateAnimations(timestamp) {
    let hasActiveAnimation = false;

    for (const piece of this.pieces) {
      if (!piece.snapAnimation) {
        continue;
      }

      hasActiveAnimation = true;
      const elapsed = timestamp - piece.snapAnimation.startedAt;
      const progress = clamp(elapsed / piece.snapAnimation.duration, 0, 1);
      const eased = easeInOutQuad(progress);

      piece.x = lerp(piece.snapAnimation.startX, piece.targetX, eased);
      piece.y = lerp(piece.snapAnimation.startY, piece.targetY, eased);

      if (progress >= 1) {
        piece.snapAnimation = null;
        if (!piece.isSnapped) {
          piece.isSnapped = true;
          piece.x = piece.targetX;
          piece.y = piece.targetY;
          this.onSnap?.(piece.id);
          this.emitProgress();
          this.checkCompletion();
        }
      }
    }

    return hasActiveAnimation;
  }

  checkCompletion() {
    if (this.levelCompleted) {
      return;
    }

    if (areAllPiecesSnapped(this.pieces)) {
      this.levelCompleted = true;
      this.onLevelComplete?.();
    }
  }

  emitProgress() {
    const snapped = this.pieces.filter((piece) => piece.isSnapped).length;
    this.onProgress?.(snapped, this.pieces.length);
  }

  startLoop() {
    if (this.isDestroyed || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.rafId = requestAnimationFrame(this.tick);
  }

  tick(timestamp) {
    if (this.isDestroyed) {
      return;
    }

    const hasMotion = this.updateAnimations(timestamp) || Boolean(this.activePiece);
    this.draw(timestamp);

    if (hasMotion) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    this.isRunning = false;
    this.rafId = null;
  }

  drawBoard(timestamp) {
    this.context.save();

    this.context.fillStyle = 'rgba(241, 241, 241, 0.75)';
    this.context.fillRect(this.boardX, this.boardY, this.boardSize, this.boardSize);

    this.context.strokeStyle = 'rgba(7, 7, 7, 0.28)';
    this.context.lineWidth = 1;

    for (let row = 0; row < this.levelConfig.rows; row += 1) {
      for (let col = 0; col < this.levelConfig.cols; col += 1) {
        const x = this.boardX + col * this.pieceWidth;
        const y = this.boardY + row * this.pieceHeight;
        this.context.strokeRect(x, y, this.pieceWidth, this.pieceHeight);
      }
    }

    if (this.levelConfig.snapStyle === 'pulse') {
      const alpha = 0.08 + ((Math.sin(timestamp / 200) + 1) / 2) * 0.08;
      this.context.fillStyle = `rgba(255, 0, 168, ${alpha})`;
      this.context.fillRect(this.boardX, this.boardY, this.boardSize, this.boardSize);
    }

    this.context.restore();
  }

  drawPiece(piece, timestamp) {
    const drawWidth = piece.width * piece.scale;
    const drawHeight = piece.height * piece.scale;
    const drawX = piece.x - (drawWidth - piece.width) / 2;
    const drawY = piece.y - (drawHeight - piece.height) / 2;

    this.context.save();

    if (piece.shadowBlur > 0) {
      this.context.shadowColor = 'rgba(255, 0, 168, 0.62)';
      this.context.shadowBlur = piece.shadowBlur;
    }

    if (piece.nearSnap && !piece.isSnapped) {
      this.context.shadowColor = 'rgba(36, 207, 239, 0.72)';
      this.context.shadowBlur = 14;
    }

    if (piece.isSnapped) {
      if (this.levelConfig.snapStyle === 'high-glow') {
        this.context.shadowColor = 'rgba(255, 0, 168, 0.54)';
        this.context.shadowBlur = 18;
      } else if (this.levelConfig.snapStyle === 'standard-glow') {
        this.context.shadowColor = 'rgba(36, 207, 239, 0.54)';
        this.context.shadowBlur = 12;
      } else {
        const pulse = 7 + ((Math.sin(timestamp / 220) + 1) / 2) * 6;
        this.context.shadowColor = 'rgba(238, 220, 150, 0.65)';
        this.context.shadowBlur = pulse;
      }
    }

    this.context.drawImage(
      this.imageBitmap,
      piece.sx,
      piece.sy,
      piece.sw,
      piece.sh,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );

    this.context.lineWidth = 1;
    this.context.strokeStyle = piece.isSnapped ? 'rgba(7, 7, 7, 0.88)' : 'rgba(7, 7, 7, 0.35)';
    this.context.strokeRect(drawX + 0.5, drawY + 0.5, drawWidth - 1, drawHeight - 1);

    this.context.restore();
  }

  draw(timestamp) {
    this.context.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

    this.drawBoard(timestamp);

    for (const piece of this.pieces) {
      this.drawPiece(piece, timestamp);
    }
  }

  destroy() {
    this.isDestroyed = true;

    this.detachEvents();

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.activePiece = null;
    this.activePointerId = null;
    this.pieces = [];
  }
}
