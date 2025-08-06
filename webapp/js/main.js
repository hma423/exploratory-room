import * as THREE from "https://cdn.skypack.dev/three@0.129.0";

const fileInput = document.getElementById("fileInput");
const startButton = document.getElementById("startButton");
const uploadUI = document.getElementById("uploadUI");
const container3D = document.getElementById("container3D");

let uploadedImages = [];
let marqueeActive = false;
// Handle file uploads
fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);
  uploadedImages = files;

  const imageList = document.getElementById("imageList");
  imageList.innerHTML = "";
  files.forEach((file) => {
                const url = URL.createObjectURL(file);
                const container = document.createElement('div');
                container.classList.add('image-item');

                const img = document.createElement('img');
                img.src = url;

                const btn = document.createElement('button');
                btn.textContent = '✕';
                btn.className = 'remove-btn';
                btn.addEventListener('click', () => {
                container.remove();
                    URL.revokeObjectURL(url);
                });

                container.appendChild(img);
                container.appendChild(btn);
                imageList.appendChild(container);
  });
});

// Start 3D Marquee on button click
startButton.addEventListener("click", () => {
    console.log("CLICKED STARTBUTTON")
  if (uploadedImages.length === 0) {
    alert("Please  at least one image first.");
    return;
  }

  // Hide upload UI
    document.getElementById("uploadUI").style.display = "none";
    document.getElementById("marqueeContainer").style.display = "block";    
    document.getElementById("ExploratoryTitle").style.display = 'none';
    marqueeActive = true

  //show container ui 

  // Launch 3D view
  startMarquee(uploadedImages);
});

// ------------------
// Three.js Section
// ------------------

function startMarquee(files) {
  // Hide upload UI, show 3D marquee
  document.getElementById("uploadUI").style.display = "none";
  document.getElementById("marqueeContainer").style.display = "block";

  const container3D = document.getElementById("container3D");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 20;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container3D.innerHTML = ""; // clear previous render if any
  container3D.appendChild(renderer.domElement);

  const light = new THREE.AmbientLight(0xffffff, 1);
  scene.add(light);

  const group = new THREE.Group();
  scene.add(group);

  const radius = 10;
  const planeWidth = 5;
  const planeHeight = 3;

  files.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const texture = new THREE.TextureLoader().load(url, () => {
      URL.revokeObjectURL(url); // Clean up memory
    });

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);

    // Half-circle layout (only 180 degrees)
    const angle = (index / (files.length - 1)) * Math.PI; // 0 to π
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    mesh.position.set(x, 0, z);
    mesh.lookAt(0, 0, 0);

    group.add(mesh);
  });

  // Animation
  function animate() {
    requestAnimationFrame(animate);
    // group.rotation.y += 0.005;
    renderer.render(scene, camera);
  }
  animate();

  // Handle screen resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && marqueeActive) {
    marqueeActive = false;
    document.getElementById("uploadUI").style.display = "block";
    document.getElementById("marqueeContainer").style.display = "none";

    // Dispose Three.js
    renderer.dispose();
    renderer.domElement.remove();
    scene = null;
    camera = null;
    renderer = null;
  }
});
