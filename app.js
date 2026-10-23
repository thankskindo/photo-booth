'use strict';

const PHOTO_COUNT = 4;
const FILTERS = {
  original: 'none',
  soft: 'brightness(1.08) saturate(.82) contrast(.92)',
  film: 'sepia(.2) contrast(1.08) saturate(.84)',
  mono: 'grayscale(1) contrast(1.08)',
  vivid: 'saturate(1.42) contrast(1.06)',
  warm: 'sepia(.13) saturate(1.18) contrast(1.02)'
};
const FRAMES = {
  lilac: { background: '#e8dfff', ink: '#66528a', accent: '#c0a5ec' },
  pink: { background: '#ffdce6', ink: '#9a536f', accent: '#f4a6c0' },
  butter: { background: '#fff0b8', ink: '#85672b', accent: '#f4d66e' },
  mint: { background: '#d4f0df', ink: '#426e5e', accent: '#9bceb0' },
  night: { background: '#302a3e', ink: '#fff6ff', accent: '#c1a7f4' }
};
const STICKERS = ['♡', '✦', '✿', '★', '🎀', '🍒', '🐱', '🦋', '☁️', '✨', '💗', '🌷'];
const PLACEHOLDER_COLORS = [ ['#f7c0d5', '#b7a8ec'], ['#a9d8c1', '#fff0b8'], ['#ffb9a3', '#d6b8f2'], ['#9ec7e8', '#f2c3dd'] ];

const state = {
  photos: Array(PHOTO_COUNT).fill(null),
  layout: 'strip',
  frame: 'lilac',
  filter: 'original',
  topText: 'LITTLE MOMENTS, BIG MEMORIES',
  bottomText: '오늘도 반짝이는 우리 ♡',
  showDate: true,
  stickers: [],
  draggingSticker: -1,
  dragMoved: false
};

const canvas = document.getElementById('photoCanvas');
const ctx = canvas.getContext('2d');
const uploadGrid = document.getElementById('uploadGrid');
const toast = document.getElementById('toast');
let toastTimer = null;

function createUploadSlots() {
  uploadGrid.innerHTML = '';
  for (let index = 0; index < PHOTO_COUNT; index += 1) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.id = `photoInput${index}`;
    input.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) loadPhoto(file, index);
      event.target.value = '';
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upload-slot';
    button.setAttribute('aria-label', `${index + 1}번 사진 추가 또는 변경`);
    button.innerHTML = `<span class="slot-num">0${index + 1}</span><span class="slot-add">＋</span><span class="slot-label">사진 추가</span>`;
    button.addEventListener('click', () => input.click());
    uploadGrid.append(input, button);
  }
}

function loadPhoto(file, index) {
  if (!file.type.startsWith('image/')) {
    showToast('이미지 파일을 선택해주세요.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.photos[index] = image;
      renderUploadSlots();
      drawCanvas();
      showToast(`${index + 1}번 사진을 추가했어요 ✿`);
    };
    image.onerror = () => showToast('이 사진은 열 수 없어요. 다른 파일을 선택해주세요.');
    image.src = reader.result;
  };
  reader.onerror = () => showToast('사진을 읽지 못했어요. 다시 시도해주세요.');
  reader.readAsDataURL(file);
}

function renderUploadSlots() {
  const inputs = uploadGrid.querySelectorAll('input[type="file"]');
  const buttons = uploadGrid.querySelectorAll('.upload-slot');
  state.photos.forEach((photo, index) => {
    const button = buttons[index];
    button.classList.toggle('has-photo', Boolean(photo));
    button.innerHTML = `<span class="slot-num">0${index + 1}</span>${photo ? '<span class="slot-edit">변경</span>' : '<span class="slot-add">＋</span><span class="slot-label">사진 추가</span>'}`;
    if (photo) {
      const thumb = document.createElement('img');
      thumb.src = photo.src;
      thumb.alt = `${index + 1}번 사진 미리보기`;
      button.appendChild(thumb);
      // Keep the edit tag above the thumbnail.
      const editTag = button.querySelector('.slot-edit');
      if (editTag) button.appendChild(editTag);
    }
    button.onclick = () => inputs[index].click();
  });
  document.getElementById('photoCounter').textContent = `${state.photos.filter(Boolean).length} / 4 PHOTOS`;
}

function drawCanvas() {
  const width = state.layout === 'strip' ? 900 : 1400;
  const height = state.layout === 'strip' ? 2200 : 1500;
  canvas.width = width;
  canvas.height = height;
  const frame = FRAMES[state.frame];
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = frame.background;
  ctx.fillRect(0, 0, width, height);
  drawPaperDetails(width, height, frame);

  const outer = state.layout === 'strip' ? 54 : 68;
  const topBand = state.layout === 'strip' ? 150 : 170;
  const bottomBand = state.layout === 'strip' ? 165 : 185;
  const gap = state.layout === 'strip' ? 22 : 22;
  const cols = state.layout === 'strip' ? 1 : 2;
  const rows = state.layout === 'strip' ? 4 : 2;
  const cellWidth = (width - outer * 2 - gap * (cols - 1)) / cols;
  const cellHeight = (height - topBand - bottomBand - outer - gap * (rows - 1)) / rows;

  drawFrameText(width, height, topBand, bottomBand, frame);

  for (let index = 0; index < PHOTO_COUNT; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = outer + col * (cellWidth + gap);
    const y = topBand + row * (cellHeight + gap);
    ctx.save();
    ctx.shadowColor = 'rgba(50, 34, 72, .13)';
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 5;
    roundedRect(x, y, cellWidth, cellHeight, 7, '#ffffff');
    ctx.restore();
    ctx.save();
    roundedPath(x, y, cellWidth, cellHeight, 7);
    ctx.clip();
    if (state.photos[index]) {
      ctx.filter = FILTERS[state.filter] || 'none';
      drawCover(state.photos[index], x, y, cellWidth, cellHeight);
      ctx.filter = 'none';
    } else {
      drawPlaceholder(x, y, cellWidth, cellHeight, index);
    }
    ctx.restore();
    // A tiny frame number adds a collectible photo-booth feel without covering the photo.
    ctx.fillStyle = frame.ink;
    ctx.globalAlpha = state.frame === 'night' ? .8 : .56;
    ctx.font = `500 ${state.layout === 'strip' ? 18 : 20}px "DM Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`0${index + 1}`, x + cellWidth - 13, y + cellHeight - 12);
    ctx.globalAlpha = 1;
  }

  state.stickers.forEach((sticker) => drawSticker(sticker, width, height));
  // Thin border for a finished print-like edge.
  ctx.strokeStyle = state.frame === 'night' ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.78)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);
}

function drawPaperDetails(width, height, frame) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(255,255,255,.23)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = frame.accent;
  ctx.globalAlpha = state.frame === 'night' ? .23 : .32;
  ctx.beginPath();
  ctx.arc(width * .08, height * .06, width * .12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * .95, height * .95, width * .16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFrameText(width, height, topBand, bottomBand, frame) {
  ctx.fillStyle = frame.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const topText = state.topText.trim();
  const baseSize = state.layout === 'strip' ? 31 : 38;
  ctx.font = `800 ${baseSize}px "DM Sans", Arial, sans-serif`;
  ctx.letterSpacing = state.layout === 'strip' ? '1px' : '2px';
  drawFitText(topText, width / 2, topBand * .47, width - 105, baseSize);
  ctx.letterSpacing = '0px';

  ctx.font = `600 ${state.layout === 'strip' ? 37 : 41}px "Gowun Dodum", Arial, sans-serif`;
  drawFitText(state.bottomText.trim(), width / 2, height - bottomBand * .59, width - 100, state.layout === 'strip' ? 37 : 41);
  if (state.showDate) {
    const now = new Date();
    const dateText = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    ctx.font = '500 20px "DM Mono", monospace';
    ctx.globalAlpha = .7;
    ctx.fillText(dateText, width / 2, height - 31);
    ctx.globalAlpha = 1;
  }
  // Little registration marks echo editorial / archival graphic design.
  ctx.font = '500 19px "DM Mono", monospace';
  ctx.globalAlpha = .65;
  ctx.fillText('✳', 38, topBand * .47);
  ctx.fillText('✳', width - 38, topBand * .47);
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
}

function drawFitText(text, x, y, maxWidth, fontSize) {
  if (!text) return;
  let size = fontSize;
  ctx.font = `800 ${size}px "DM Sans", "Gowun Dodum", sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 1;
    ctx.font = `800 ${size}px "DM Sans", "Gowun Dodum", sans-serif`;
  }
  ctx.fillText(text, x, y, maxWidth);
}

function drawPlaceholder(x, y, width, height, index) {
  const colors = PLACEHOLDER_COLORS[index];
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.save();
  ctx.globalAlpha = .33;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + width * .78, y + height * .18, height * .18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.font = `800 ${Math.min(width, height) * .23}px "DM Sans", sans-serif`;
  ctx.fillText(`0${index + 1}`, x + width / 2, y + height * .42);
  ctx.font = `600 ${Math.min(width, height) * .047}px "Gowun Dodum", sans-serif`;
  ctx.fillText('사진을 추가해 주세요', x + width / 2, y + height * .61);
  ctx.textBaseline = 'alphabetic';
}

function drawCover(image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  if (imageRatio > boxRatio) {
    sourceWidth = image.height * boxRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / boxRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawSticker(sticker, width, height) {
  const x = sticker.x * width;
  const y = sticker.y * height;
  const fontSize = sticker.size * width;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.shadowColor = 'rgba(66, 42, 85, .18)';
  ctx.shadowBlur = fontSize * .12;
  ctx.fillText(sticker.emoji, x, y);
  ctx.restore();
}

function roundedRect(x, y, width, height, radius, fill) {
  roundedPath(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundedPath(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function addSticker(emoji) {
  const count = state.stickers.length;
  const x = count % 2 === 0 ? .14 : .86;
  const y = .16 + ((count * .115) % .65);
  state.stickers.push({ emoji, x, y, size: .075 });
  drawCanvas();
  showToast('스티커를 붙였어요! 미리보기에서 움직여보세요.');
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function findStickerAt(point) {
  for (let index = state.stickers.length - 1; index >= 0; index -= 1) {
    const sticker = state.stickers[index];
    const x = sticker.x * canvas.width;
    const y = sticker.y * canvas.height;
    const radius = sticker.size * canvas.width * .75;
    if (Math.hypot(point.x - x, point.y - y) < radius) return index;
  }
  return -1;
}

function handleCanvasPointerDown(event) {
  const point = getCanvasPoint(event);
  state.draggingSticker = findStickerAt(point);
  state.dragMoved = false;
  if (state.draggingSticker >= 0) {
    canvas.classList.add('dragging');
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
}

function handleCanvasPointerMove(event) {
  if (state.draggingSticker < 0) return;
  const point = getCanvasPoint(event);
  const sticker = state.stickers[state.draggingSticker];
  sticker.x = Math.min(.96, Math.max(.04, point.x / canvas.width));
  sticker.y = Math.min(.97, Math.max(.025, point.y / canvas.height));
  state.dragMoved = true;
  drawCanvas();
}

function handleCanvasPointerUp() {
  state.draggingSticker = -1;
  canvas.classList.remove('dragging');
}

function setupControls() {
  document.querySelectorAll('[data-layout]').forEach((button) => {
    button.addEventListener('click', () => {
      state.layout = button.dataset.layout;
      document.querySelectorAll('[data-layout]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      drawCanvas();
    });
  });

  document.querySelectorAll('[data-frame]').forEach((button) => {
    button.addEventListener('click', () => {
      state.frame = button.dataset.frame;
      document.querySelectorAll('[data-frame]').forEach((item) => item.classList.toggle('selected', item === button));
      drawCanvas();
    });
  });

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('selected', active);
        item.setAttribute('aria-pressed', String(active));
      });
      drawCanvas();
    });
  });

  document.getElementById('topText').addEventListener('input', (event) => {
    state.topText = event.target.value;
    drawCanvas();
  });
  document.getElementById('bottomText').addEventListener('input', (event) => {
    state.bottomText = event.target.value;
    drawCanvas();
  });
  document.getElementById('showDate').addEventListener('change', (event) => {
    state.showDate = event.target.checked;
    drawCanvas();
  });

  const tray = document.getElementById('stickerTray');
  STICKERS.forEach((emoji) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sticker-choice';
    button.textContent = emoji;
    button.setAttribute('aria-label', `${emoji} 스티커 추가`);
    button.addEventListener('click', () => addSticker(emoji));
    tray.appendChild(button);
  });

  document.getElementById('clearStickers').addEventListener('click', () => {
    state.stickers = [];
    drawCanvas();
    showToast('스티커를 모두 지웠어요.');
  });
  document.getElementById('multiUpload').addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    let nextIndex = state.photos.findIndex((photo) => !photo);
    if (nextIndex < 0) nextIndex = 0;
    files.slice(0, PHOTO_COUNT).forEach((file) => {
      loadPhoto(file, nextIndex);
      nextIndex = (nextIndex + 1) % PHOTO_COUNT;
    });
    if (files.length > PHOTO_COUNT) showToast('사진은 최대 4장까지 넣을 수 있어요.');
    event.target.value = '';
  });
  document.getElementById('downloadButton').addEventListener('click', downloadImage);
  document.getElementById('resetButton').addEventListener('click', resetStudio);

  canvas.addEventListener('pointerdown', handleCanvasPointerDown);
  canvas.addEventListener('pointermove', handleCanvasPointerMove);
  canvas.addEventListener('pointerup', handleCanvasPointerUp);
  canvas.addEventListener('pointercancel', handleCanvasPointerUp);
  canvas.addEventListener('lostpointercapture', handleCanvasPointerUp);
}

function downloadImage() {
  if (!state.photos.some(Boolean)) {
    showToast('먼저 사진을 한 장 이상 추가해주세요.');
    document.getElementById('uploadGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  drawCanvas();
  canvas.toBlob((blob) => {
    if (!blob) {
      showToast('이미지를 저장하지 못했어요. 다시 시도해주세요.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    link.href = url;
    link.download = `fourcut-club-${stamp}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('완성! 나만의 네 컷 사진을 저장했어요 ✨');
  }, 'image/png');
}

function resetStudio() {
  state.photos = Array(PHOTO_COUNT).fill(null);
  state.layout = 'strip';
  state.frame = 'lilac';
  state.filter = 'original';
  state.topText = 'LITTLE MOMENTS, BIG MEMORIES';
  state.bottomText = '오늘도 반짝이는 우리 ♡';
  state.showDate = true;
  state.stickers = [];
  document.getElementById('topText').value = state.topText;
  document.getElementById('bottomText').value = state.bottomText;
  document.getElementById('showDate').checked = true;
  document.querySelectorAll('[data-layout]').forEach((button) => {
    const active = button.dataset.layout === 'strip';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-frame]').forEach((button) => button.classList.toggle('selected', button.dataset.frame === 'lilac'));
  document.querySelectorAll('[data-filter]').forEach((button) => {
    const active = button.dataset.filter === 'original';
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  createUploadSlots();
  renderUploadSlots();
  drawCanvas();
  showToast('처음 상태로 돌아왔어요.');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

createUploadSlots();
setupControls();
renderUploadSlots();
drawCanvas();
