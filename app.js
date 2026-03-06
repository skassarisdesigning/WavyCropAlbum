/* ================================================================
   Wavy Crop Album — app.js
   Image upload → wavy-rectangle clip on <canvas> → virtual album
   ================================================================ */

(() => {
  "use strict";

  // ── DOM refs ────────────────────────────────────────
  const dropZone      = document.getElementById("drop-zone");
  const fileInput     = document.getElementById("file-input");
  const editorSection = document.getElementById("editor-section");
  const canvas        = document.getElementById("preview-canvas");
  const ctx           = canvas.getContext("2d");

  const cropWidthInput  = document.getElementById("crop-width");
  const cropHeightInput = document.getElementById("crop-height");
  const waveAmpInput    = document.getElementById("wave-amp");
  const waveFreqInput   = document.getElementById("wave-freq");

  const btnAdd   = document.getElementById("btn-add");
  const btnReset = document.getElementById("btn-reset");

  const albumGrid      = document.getElementById("album-grid");
  const albumEmpty     = document.getElementById("album-empty");
  const btnClearAlbum  = document.getElementById("btn-clear-album");

  // ── State ───────────────────────────────────────────
  let sourceImage = null;   // loaded HTMLImageElement
  let album = loadAlbum();  // array of data-URL strings

  // ── Upload handling ─────────────────────────────────
  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        sourceImage = img;
        editorSection.classList.remove("hidden");
        drawPreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── Wavy-rectangle clipping path ───────────────────
  /**
   * Build a closed path that forms a rectangle whose four edges
   * are sine-wave curves (like a decorative paper punch).
   *
   * @param {CanvasRenderingContext2D} c
   * @param {number} x       top-left x
   * @param {number} y       top-left y
   * @param {number} w       rectangle width
   * @param {number} h       rectangle height
   * @param {number} amp     wave amplitude (px)
   * @param {number} waves   number of full wave periods per edge
   */
  function wavyRectPath(c, x, y, w, h, amp, waves) {
    const steps = 200; // segments per edge — enough for smooth curves
    c.beginPath();

    // Top edge → left to right
    for (let i = 0; i <= steps; i++) {
      const t  = i / steps;
      const px = x + t * w;
      const py = y + Math.sin(t * waves * Math.PI * 2) * amp;
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    // Right edge → top to bottom
    for (let i = 0; i <= steps; i++) {
      const t  = i / steps;
      const px = x + w + Math.sin(t * waves * Math.PI * 2) * amp;
      const py = y + t * h;
      c.lineTo(px, py);
    }
    // Bottom edge → right to left
    for (let i = 0; i <= steps; i++) {
      const t  = i / steps;
      const px = x + w - t * w;
      const py = y + h + Math.sin(t * waves * Math.PI * 2) * amp;
      c.lineTo(px, py);
    }
    // Left edge → bottom to top
    for (let i = 0; i <= steps; i++) {
      const t  = i / steps;
      const px = x + Math.sin(t * waves * Math.PI * 2) * (-amp);
      const py = y + h - t * h;
      c.lineTo(px, py);
    }

    c.closePath();
  }

  // ── Preview drawing ─────────────────────────────────
  function drawPreview() {
    if (!sourceImage) return;

    const cropW = parseInt(cropWidthInput.value, 10);
    const cropH = parseInt(cropHeightInput.value, 10);
    const amp   = parseInt(waveAmpInput.value, 10);
    const freq  = parseInt(waveFreqInput.value, 10);

    // extra margin so the wave peaks aren't clipped
    const margin = amp + 2;
    canvas.width  = cropW + margin * 2;
    canvas.height = cropH + margin * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clip
    ctx.save();
    wavyRectPath(ctx, margin, margin, cropW, cropH, amp, freq);
    ctx.clip();

    // Draw image centred / cover-fit inside crop rect
    const scale = Math.max(cropW / sourceImage.width, cropH / sourceImage.height);
    const sw = sourceImage.width  * scale;
    const sh = sourceImage.height * scale;
    const dx = margin + (cropW - sw) / 2;
    const dy = margin + (cropH - sh) / 2;
    ctx.drawImage(sourceImage, dx, dy, sw, sh);

    ctx.restore();

    // Optional: draw a subtle shadow of the wavy border
    ctx.save();
    wavyRectPath(ctx, margin, margin, cropW, cropH, amp, freq);
    ctx.strokeStyle = "rgba(0,0,0,.15)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Redraw on slider change
  [cropWidthInput, cropHeightInput, waveAmpInput, waveFreqInput].forEach((el) =>
    el.addEventListener("input", drawPreview)
  );

  // ── Add to album ────────────────────────────────────
  btnAdd.addEventListener("click", () => {
    if (!sourceImage) return;
    const dataURL = canvas.toDataURL("image/png");
    album.push(dataURL);
    saveAlbum();
    renderAlbum();
  });

  btnReset.addEventListener("click", () => {
    sourceImage = null;
    editorSection.classList.add("hidden");
    fileInput.value = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  // ── Album rendering ─────────────────────────────────
  function renderAlbum() {
    // clear
    albumGrid.querySelectorAll(".album-item").forEach((el) => el.remove());

    if (album.length === 0) {
      albumEmpty.classList.remove("hidden");
      btnClearAlbum.classList.add("hidden");
      return;
    }

    albumEmpty.classList.add("hidden");
    btnClearAlbum.classList.remove("hidden");

    album.forEach((dataURL, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "album-item";

      const img = document.createElement("img");
      img.src = dataURL;
      img.alt = `Фото ${idx + 1}`;

      const del = document.createElement("button");
      del.textContent = "✕";
      del.title = "Удалить";
      del.addEventListener("click", () => removeFromAlbum(idx));

      wrapper.appendChild(img);
      wrapper.appendChild(del);
      albumGrid.appendChild(wrapper);
    });
  }

  function removeFromAlbum(index) {
    album.splice(index, 1);
    saveAlbum();
    renderAlbum();
  }

  btnClearAlbum.addEventListener("click", () => {
    if (!confirm("Очистить весь альбом?")) return;
    album = [];
    saveAlbum();
    renderAlbum();
  });

  // ── localStorage persistence ────────────────────────
  function saveAlbum() {
    try {
      localStorage.setItem("wavyCropAlbum", JSON.stringify(album));
    } catch {
      // storage full — silently skip
    }
  }

  function loadAlbum() {
    try {
      return JSON.parse(localStorage.getItem("wavyCropAlbum")) || [];
    } catch {
      return [];
    }
  }

  // ── Boot ────────────────────────────────────────────
  renderAlbum();
})();
