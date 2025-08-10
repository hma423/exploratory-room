import * as THREE from "https://cdn.skypack.dev/three@0.129.0";

const startButton = document.getElementById("startButton");
const fileInput = document.getElementById("fileInput");
let uploadedFiles = [];

fileInput.addEventListener("change", (e) => {
  uploadedFiles = Array.from(e.target.files);
});

startButton.addEventListener("click", () => {
  if (uploadedFiles.length > 0) {
    document.getElementById("uploadUI").style.display = "none";
    document.getElementById("marqueeContainer").style.display = "block";
    startMarquee(uploadedFiles);
  }
});



function startMarquee(files) {
  const container = document.getElementById("container3D");

  // --- Scene setup ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#191920");

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 25);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // --- Layout settings ---
  const numRows = 4;
  const targetHeight = 4.5; // Fixed gallery height for all images (world units)
  const horizontalSpacing = 1.5; // space between images in world units
  const verticalGap = 8; // space between rows in world units
  const minSlotsPerRow = 6;
  const estimatedSlotWidthPx = 200;
  const imagesPerRow = Math.max(
    minSlotsPerRow,
    Math.ceil(window.innerWidth / estimatedSlotWidthPx)
  );

  // --- Rows ---
  const rows = [];
  const rowVelocities = new Array(numRows).fill(0);
  const rowTotalWidths = new Array(numRows).fill(0);

  const startY = ((numRows - 1) / 2) * verticalGap;
  for (let r = 0; r < numRows; r++) {
    const g = new THREE.Group();
    g.position.y = startY - r * verticalGap;
    scene.add(g);
    rows.push(g);
  }

  const minImagesPerRow = 12;

  // Fill slots with round robin + duplication
  const slots = Array.from({ length: numRows }, () =>
    Array.from({ length: minImagesPerRow }, () => ({ file: null, mesh: null }))
  );

  files = Array.from(files); // ensure array form

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < minImagesPerRow; c++) {
      if (files.length === 0) break;

      // Pick from uploaded images — duplicate randomly if not enough
      const fileIndex = c < files.length ? c : Math.floor(Math.random() * files.length);
      slots[r][c].file = files[fileIndex];
    }
  }
  // --- Helper: create mesh from image ---
  function createMeshFromImage(img) {
    const texture = new THREE.Texture(img);
    texture.needsUpdate = true;
    texture.generateMipmaps = true;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy() || 1;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const aspect = img.naturalWidth / img.naturalHeight;
    const targetWidth = targetHeight * aspect;

    const geometry = new THREE.PlaneGeometry(targetWidth, targetHeight);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.userData = {
      worldWidth: targetWidth,
      worldHeight: targetHeight,
    };

    return mesh;
  }

  // --- Load and position images ---
  const pendingLoads = [];
  for (let r = 0; r < numRows; r++) {
    let xCursor = 0;
    for (let c = 0; c < imagesPerRow; c++) {
      const slot = slots[r][c];
      if (!slot.file) continue;

      const url = URL.createObjectURL(slot.file);
      const img = new Image();
      const p = new Promise((resolve) => {
        img.onload = () => {
          const mesh = createMeshFromImage(img);
          mesh.position.x = xCursor + mesh.userData.worldWidth / 2;
          xCursor += mesh.userData.worldWidth + horizontalSpacing;
          rows[r].add(mesh);
          slot.mesh = mesh;
          resolve();
        };
        img.onerror = resolve;
      });
      pendingLoads.push(p);
      img.src = url;
      img.onload
        ? setTimeout(() => URL.revokeObjectURL(url), 1000)
        : setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    rowTotalWidths[r] = xCursor;
  }

  // --- Center rows after loading ---
  Promise.all(pendingLoads).then(() => {
    rows.forEach((row, rIdx) => {
      if (row.children.length === 0) return;
      const totalWidth = row.children.reduce(
        (sum, m) => sum + (m.userData.worldWidth + horizontalSpacing),
        0
      );
      row.children.forEach((m) => {
        m.position.x -= totalWidth / 2;
      });
      rowTotalWidths[rIdx] = totalWidth;
    });
  });

  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // --- Drag interaction ---
  let isDragging = false;
  let previousMouseX = 0;
  let activeRow = null;

  window.addEventListener("mousedown", (event) => {
    isDragging = true;
    previousMouseX = event.clientX;
    const ndcY = -(event.clientY / window.innerHeight) * 2 + 1;
    const rowHeightNdc = 2 / numRows;
    let approxRow = Math.floor((ndcY + 1) / rowHeightNdc);
    approxRow = Math.min(Math.max(approxRow, 0), numRows - 1);
    activeRow = approxRow;
    rowVelocities[activeRow] = 0;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    activeRow = null;
  });

  window.addEventListener("mousemove", (event) => {
    if (isDragging && activeRow !== null) {
      const deltaX = event.clientX - previousMouseX;
      const worldDelta = deltaX * 0.02;
      rows[activeRow].position.x += worldDelta;
      rowVelocities[activeRow] = worldDelta;
      previousMouseX = event.clientX;
    }
  });

  // --- Wrapping helper ---
  function updateRowWrap(row, totalWidth) {
    if (row.children.length === 0) return;
    row.children.forEach((mesh) => {
      if (mesh.position.x < -totalWidth / 2 - mesh.userData.worldWidth) {
        mesh.position.x += totalWidth;
      } else if (mesh.position.x > totalWidth / 2 + mesh.userData.worldWidth) {
        mesh.position.x -= totalWidth;
      }
    });
  }

  // --- Animation loop ---
  function animate() {
    requestAnimationFrame(animate);
    rows.forEach((row, idx) => {
      if (!(isDragging && activeRow === idx)) {
        if (Math.abs(rowVelocities[idx]) < 0.0005) {
          rowVelocities[idx] = 0.002 * (idx % 2 === 0 ? 1 : -1);
        }
        row.position.x += rowVelocities[idx];
        rowVelocities[idx] *= 0.96;
      }
      updateRowWrap(row, rowTotalWidths[idx]);
    });
    renderer.render(scene, camera);
  }
  animate();

  // --- Resize handling ---
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}


    // <!-- <body>
    //     <header id = "ExploratoryTitle"> 
    //         <h1> Explorartory Room</h1>
    //     </header>
    //     <div id="uploadUI">
    //         <h2>Upload Images</h2>
    //         <input type="file" id="fileInput" multiple accept="image/*" />
    //         <div id="imageList"></div>
    //         <button id="startButton">Start 3D Marquee</button>
    //     </div>
    //     <div id = "marqueeContainer" style = "display: none;">
    //         <div id="container3D" style="width: 100vw; height: 80vh;"></div>
    //         <script type="module" src = "js/main.js"></script>
    //     </div>

    // </body> -->