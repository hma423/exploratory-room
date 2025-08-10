import * as THREE from "https://cdn.skypack.dev/three@0.129.0";



const canvas= document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({
    canvas,antialias: true,
    preserveDrawingBuffer: true,
});


renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3dada);

//filed of view, apsect ratio, near plane, far plane 
const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth/window.innerHeight,0.1, 100 
)
camera.position.z = 5;

const settings ={
    wheelSensitivity: 0.01,
    touchSensitivity: 0.01,
    momentumMutliplier: 2,
    smoothing :0.1,
    slideLerp: 0.075,
    distortionDecay: 0.95,
    maxDistortion: 2.5,
    distortionSensitivity: 0.15, 
    distortionSmoothing: 0.075,
}
const slideWidth = 3.0;
const slideHeight = 1.5;
const gap = 0.1; 
const slideCount = 10;
const imageCount = 5;
const totalWidth = slideCount * (slideWidth + gap);
const slideUnit = slideWidth + gap;

const slides = [];
let currentPosition  = 0; 
let targetPosition =0;
let isScrolling = false;
let autoScrollSpeed = 0;
let lastTime = 0; 
let touchStartX = 0;
let touchLastX = 0;
let prevPosition = 0 ;

let currentDistortionFactor = 0 ;
let targetdistortionFactor = 0 ;
let peakVelocity = 0;
let velocityHistory = [0,0,0,0,0];

const correctImageColor = (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};
const createSlide = (index) =>{
    const geometry = new THREE.PlaneGeometry(slideWidth, slideHeight, 32, 16);
    const colors  = ["#FF5733", "#33FF57", "#3357ff", "#F3FF33", "#FF33F3"];
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colors[index % colors.length]),
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = index * [slideWidth + gap];
    mesh.userData = {
        originalVertices: [...geometry.attributes.position.array],
        index, 
    };
    const imageIndex = (index % imageCount) + 1 ;
    const imagePath = `img/img${imageIndex}.jpg`;
    
    new THREE.TextureLoader().load(
        imagePath,
        (texture) =>{
            correctImageColor(texture);
            material.map = texture;
            material.color.set(0xffffff);
            material.needsUpdate = true;
            const imgAspect = texture.image.width / texture.image.height;
            const slideAspect = slideWidth/slideHeight;
            if (imgAspect > slideAspect){
                mesh.scale.y = slideAspect / imgAspect;

            }else{
                mesh.scale.x = imgAspect/ slideAspect;
            }
        },
        undefined, (err) =>{
            console.warn(`Couldn't load the image ${imagePath}`, err )
        }
    );
    scene.add(mesh);
    slides.push(mesh)

} ;

for ( let i =0; i <slideCount; i++){
    createSlide(i);
}

slides.forEach((slide) => {
    slide.position.x -= totalWidth/2;
    slide.userData.targetX = slide.position.x;
    slide.userData.currentX = slide.position.x;
});

const updateCurve=  (mesh, wordPositionX, distortionFactor) =>{
    const distortionCenter = new THREE.Vector2(0,0);
    const distortionRadius = 2.0;
    const maxCurvature = settings.maxDistortion * distortionFactor;
    const positionAttribute = mesh.geometry.attributes.position;
    const originalVertices  = mesh.userData.originalVertices;

    for(let i = 0 ;i < positionAttribute.count;i ++){
        const x = originalVertices[i * 3];
        const y = originalVertices[i*3 + 1];

        const vertextWorldPosX =  wordPositionX + x ;
        const distFromCenter = Math.sqrt(
             Math.pow(vertextWorldPosX - distortionCenter.x, 2)+
            Math.pow(y - distortionCenter.y, 2) );
        const distortionStrength = Math.max(0, 1-distFromCenter / distortionRadius);
        const curveZ = 
        Math.pow(Math.sin((distortionStrength * Math.PI)/2 ), 1.5) * maxCurvature;
        positionAttribute.setZ(i, curveZ);
    }
    positionAttribute.needsUpdate = true;
    mesh.geometry.computeVertexNormals();


};

window.addEventListener("keydown", (e)=>{
    if (e.key == "ArrowLeft"){
        targetPosition -= slideUnit;
        targetdistortionFactor = Math.min(1.0, targetdistortionFactor + 0.3);
    
    }else if (e.key == "ArrowRight"){
        targetPosition += slideUnit;
        targetdistortionFactor = Math.min(1.0, targetdistortionFactor +0.3);
    }
});
window.addEventListener(
    "wheel",
    (e) =>{
        e.preventDefault();
        const wheelStrength = Math.abs(e.deltaY ) * 0.001;
        targetdistortionFactor = Math.min(
            1.0,
            targetdistortionFactor + wheelStrength);
        targetPosition -= e.deltaY * settings.wheelSensitivity;
        isScrolling = true;
        autoScrollSpeed = Math.min(Math.abs(e.deltaY) * 0.005, 0.05) * Math.sign(e.deltaY);

        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() =>{
            isScroling = false;
        }, 150);
    }, {passive: false}
);



window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const animate = (time) => {
    requestAnimationFrame(animate);
    const deltaTime = lastTime ? (time-lastTime)/ 1000: 0.016;

    const prevPos = currentPosition;
    if (isScrolling){
        targetPosition += autoScrollSpeed;
        const speedBasedDecay = 0.97 - Math.abs(autoScrollSpeed) * 0.5;
        autoScrollSpeed *= Math.max(0.92, speedBasedDecay);
        
        if (Math.abs(autoScrollSpeed) < 0.001){
            autoScrollSpeed = 0 ;
        }
    
    }
    currentPosition += (targetPosition- currentPosition) * settings.smoothing;
    const currentVelocity = Math.abs(currentPosition - prevPos)/deltaTime;
    velocityHistory.push(currentVelocity);
    velocityHistory.shift();

    const avgVelocity = 
        velocityHistory.reduce((sum, val) => sum + val, 0) / velocityHistory.length;

    if (avgVelocity > peakVelocity){
        peakVelocity = avgVelocity;
    }
    
    const velocityRatio = avgVelocity / (peakVelocity + 0.001);
    const isDecelerating = velocityRatio < 0.7 && peakVelocity > 0.5;

    peakVelocity *= 0.99;
    const movementDistortion = Math.min(1.0, currentVelocity * 0.1);
    if(currentVelocity > 0.05){
        targetdistortionFactor = Math.max(
            targetdistortionFactor,
            movementDistortion
        );
    }
    if (isDecelerating || avgVelocity < 0.2){
        const decayRate = isDecelerating ? settings.distortionDecay : settings.distortionDecay * 0.9;
        targetdistortionFactor*= decayRate;
    }
    currentDistortionFactor += (targetdistortionFactor- currentDistortionFactor) * 
    settings.distortionSmoothing;

    slides.forEach((slide, i)=>{
        let baseX = i * slideUnit - currentPosition;
        baseX = ((baseX % totalWidth) + totalWidth) % totalWidth;
        if ( baseX > totalWidth /2){
            baseX -= totalWidth;
        }
        const isWrapping = 
        Math.abs (baseX - slide.userData.targetX) > slideWidth * 2;
        if (isWrapping){
            slide.userData.currentX = baseX;
        }
        slide.userData.targetX = baseX;
        slide.userData.currentX += (slide.userData.targetX - slide.userData.currentX) * settings.slideLerp;

        const wrapThreshold = totalWidth /2 + slideWidth;
        if (Math.abs(slide.userData.currentX)< wrapThreshold * 1.5){
            slide.position.x = slide.userData.currentX;
            updateCurve(slide, slide.position.x, currentDistortionFactor);

        }
    });
    renderer.render(scene, camera)


};
animate();
