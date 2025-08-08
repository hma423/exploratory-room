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
  camera.position.set(0, 2, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Group for images
  const group = new THREE.Group();
  scene.add(group);

  // Arrange images in a half-sphere arc
  const radius = 10;
  const verticalTilt = Math.PI; // slight tilt toward viewer


  files.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      const texture = new THREE.TextureLoader().load(url, () => {
        URL.revokeObjectURL(url);
      });
      
      // Calculate proper size maintaining aspect ratio
      const aspect = img.width / img.height;
      const maxSize = 4; // Adjust this to control frame size
      const width = aspect > 1 ? maxSize : maxSize * aspect;
      const height = aspect > 1 ? maxSize / aspect : maxSize;
      
      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);

      // Position on half-circle horizontally
      const angle = (index / (files.length - 1)) * Math.PI; 
      console.log(camera.position)
      mesh.position.set(
        0 + index*5, 2 , 0
      );

      // Make it look toward center but also angled vertically
      mesh.lookAt(camera.position);
      // mesh.rotation.x -= verticalTilt;

      group.add(mesh);
    };
    
    img.src = url;
  });

  // Light
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // ESC key to exit
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      container.innerHTML = "";
      document.getElementById("marqueeContainer").style.display = "none";
      document.getElementById("uploadUI").style.display = "block";
    }
  });

//animation function variables to change :) 
let autoRotate = true;
let autoRotateSpeed = 0.005;
let lastInteractionTime = 0;
function animate() {
  requestAnimationFrame(animate);
  
  // group.rotation.y += autoRotateSpeed;
  
  renderer.render(scene, camera);
}
  animate();

  // Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });


// Variables to track mouse state
  let isDragging = false;
  let previousMouseX = 0;
  let previousMouseY = 0;
  let cameraAngleX = 0;
  let cameraAngleY = 0;
  let cameraDistance = 15; // Your current camera distance

  // Mouse down - start dragging
  window.addEventListener("mousedown", (event) => {
    isDragging = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
  });

  // Mouse up - stop dragging
  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Mouse move - handle dragging
  window.addEventListener("mousemove", (event) => {
    if (isDragging) {
      const deltaX = event.clientX - previousMouseX;
      const deltaY = event.clientY - previousMouseY;
      
      // Update camera angles based on mouse movement
      cameraAngleY += deltaX * 0.01; // Horizontal rotation
      cameraAngleX += deltaY * 0.01; // Vertical rotation
      
      // Clamp vertical rotation to prevent flipping
      cameraAngleX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraAngleX));
      
      // Update camera position
      camera.position.x = Math.cos(cameraAngleY) * Math.cos(cameraAngleX) * cameraDistance;
      camera.position.y = Math.sin(cameraAngleX) * cameraDistance + 2; // +2 to keep it elevated
      camera.position.z = Math.sin(cameraAngleY) * Math.cos(cameraAngleX) * cameraDistance;
      
      camera.lookAt(0, 0, 0); // Always look at center
      
      previousMouseX = event.clientX;
      previousMouseY = event.clientY;
    }
  });

  // // Mouse wheel - handle zoom
  // window.addEventListener("wheel", (event) => {
  //   cameraDistance += event.deltaY * 0.01;
  //   cameraDistance = Math.max(5, Math.min(30, cameraDistance)); // Clamp between 5 and 30
    
  //   // Update camera position with new distance
  //   camera.position.x = Math.cos(cameraAngleY) * Math.cos(cameraAngleX) * cameraDistance;
  //   camera.position.y = Math.sin(cameraAngleX) * cameraDistance + 2;
  //   camera.position.z = Math.sin(cameraAngleY) * Math.cos(cameraAngleX) * cameraDistance;
    
  //   camera.lookAt(0, 0, 0);
  // });
}