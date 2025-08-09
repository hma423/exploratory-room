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

  // Scene setup
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
  container.appendChild(renderer.domElement);

  const scaleFactor = 1.5; // enlargement factor
  const spacing = 2; // horizontal gap between images
  const numRows = 4;
  const rows = [];
  const rowVelocity = new Array(numRows).fill(0);

  // Create 4 evenly spaced rows
  const verticalGap = 10; // distance between rows
  const startY = ((numRows - 1) / 2) * verticalGap;
  for (let r = 0; r < numRows; r++) {
    const rowGroup = new THREE.Group();
    rowGroup.position.y = startY - r * verticalGap;
    scene.add(rowGroup);
    rows.push(rowGroup);
  }

  // Shuffle images randomly
  const shuffledFiles = [...files].sort(() => Math.random() - 0.5);

  // Load images into random rows
  shuffledFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const aspect = img.width / img.height;
      const targetHeight = 5 * scaleFactor;
      const targetWidth = targetHeight * aspect;

      const geometry = new THREE.PlaneGeometry(targetWidth, targetHeight);
      const texture = new THREE.TextureLoader().load(url, () => {
        URL.revokeObjectURL(url);
      });

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Assign to a random row
      const rowIndex = index % numRows;
      const row = rows[rowIndex];

      // Position X so rows have initial horizontal spread
      const xOffset = row.children.length * (targetWidth + spacing);
      mesh.position.x = xOffset;
      row.add(mesh);
    };
    img.src = url;
  });

  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // Interaction
  let isDragging = false;
  let previousMouseX = 0;
  let activeRow = null;

  window.addEventListener("mousedown", (event) => {
    isDragging = true;
    previousMouseX = event.clientX;

    // Pick nearest row based on mouse Y
    const mouseY = ((event.clientY / window.innerHeight) * 2 - 1) * -1;
    const approxRow = Math.floor((mouseY + 1) / 2 * numRows);
    activeRow = Math.min(Math.max(approxRow, 0), numRows - 1);

    rowVelocity[activeRow] = 0; // stop momentum
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    activeRow = null;
  });

  window.addEventListener("mousemove", (event) => {
    if (isDragging && activeRow !== null) {
      const deltaX = event.clientX - previousMouseX;
      rows[activeRow].position.x += deltaX * 0.02;
      rowVelocity[activeRow] = deltaX * 0.02;
      previousMouseX = event.clientX;
    }
  });

  // Infinite loop helper
  function updateRowLoop(row) {
    if (row.children.length === 0) return;

    const totalWidth = row.children.reduce(
      (sum, mesh) => sum + mesh.geometry.parameters.width + spacing,
      0
    );

    row.children.forEach((mesh) => {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);

      if (worldPos.x < -totalWidth / 2 - spacing) {
        mesh.position.x += totalWidth;
      }
      if (worldPos.x > totalWidth / 2 + spacing) {
        mesh.position.x -= totalWidth;
      }
    });
  }

  // Render loop
  function animate() {
    requestAnimationFrame(animate);

    rows.forEach((row, idx) => {
      if (!isDragging && Math.abs(rowVelocity[idx]) > 0.001) {
        row.position.x += rowVelocity[idx];
        rowVelocity[idx] *= 0.95; // friction
      }
      updateRowLoop(row);
    });

    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
