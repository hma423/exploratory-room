import * as THREE from "https://cdn.skypack.dev/three@0.129.0";

const canvas= document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({
    canvas,antialias: true,
    preserveDrawingBuffer: true,
});


renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

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
const slideWidth = 2.0;
const slideHeight = 0.8;
const gap = 0.1; 
const slideCount = 10;
const imageCount = 5;
const totalWidth = slideCount * (slideWidth + gap);
const slideUnit = slideWidth + gap;

class Slide{
    constructor(){
        this.currentPosition  = 0; 
        this.targetPosition =0;
        this.isScrolling = false;
        this.autoScrollSpeed = 0;
        this.lastTime = 0; 
        this.touchStartX = 0;
        this.touchLastX = 0;
        this.prevPosition = 0 ;
        this.currentDistortionFactor = 0 ;
        this.targetdistortionFactor = 0 ;
        this.peakVelocity = 0;
        this.velocityHistory = [0,0,0,0,0];
        this.slides= [];
    }
}

let sliderCount = 4;
let slideManager = [];
for (let i =0 ;i < sliderCount; i++){
    slideManager.push(new Slide())
}
const correctImageColor = (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};
const createSlide = (index, offset, currSlide) =>{
    const geometry = new THREE.PlaneGeometry(slideWidth, slideHeight, 32, 16);
    const colors  = ["#FF5733", "#33FF57", "#3357ff", "#F3FF33", "#FF33F3"];
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colors[index % colors.length]),
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
   
    const angle = (index / slideCount) * Math.PI * 2;
    mesh.position.x = index * [slideWidth + gap];
    mesh.position.y = offset;
    // Rotate to face outward toward the camera
    // mesh.rotation.y = angle;    
    // Rotate to face the center of the cylinder
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
    currSlide.push(mesh)

} ;


let spacing = [-1.629, -0.41, 1.618 * 0.5, 1.629]
for (let i = 0; i< sliderCount; i++){
    let multiplier = -1.5
    if ( i > sliderCount /2 ){
        multiplier = 0.5;
    }
    console.log(multiplier)
    for ( let j =0; j <slideCount; j++){
        createSlide(j, spacing[i], slideManager[i].slides);
    }
}


for (let i = 0; i< sliderCount; i++){
    slideManager[i].slides.forEach(slide =>{
        slide.position.x -= totalWidth / 2;
        slide.userData.targetX = slide.position.x;
        slide.userData.currentX = slide.position.x;  
    })

}




// const updateCurve=  (mesh, wordPositionX, distortionFactor) =>{
//     const distortionCenter = new THREE.Vector2(0,0);
//     const distortionRadius = 2.0;
//     const maxCurvature = settings.maxDistortion * distortionFactor;
//     const positionAttribute = mesh.geometry.attributes.position;
//     const originalVertices  = mesh.userData.originalVertices;

//     for(let i = 0 ;i < positionAttribute.count;i ++){
//         const x = originalVertices[i * 3];
//         const y = originalVertices[i*3 + 1];

//         const vertextWorldPosX =  wordPositionX + x ;
//         const distFromCenter = Math.sqrt(
//              Math.pow(vertextWorldPosX - distortionCenter.x, 2)+
//             Math.pow(y - distortionCenter.y, 2) );
//         const distortionStrength = Math.max(0, 1-distFromCenter / distortionRadius);
//         const curveZ = 
//         Math.pow(Math.sin((distortionStrength * Math.PI)/2 ), 1.5) * maxCurvature;
//         positionAttribute.setZ(i, curveZ);
//     }
//     positionAttribute.needsUpdate = true;
//     mesh.geometry.computeVertexNormals();


// };

window.addEventListener("keydown", (e)=>{
    // console.log(clientX, clientY);
    let slide1= slideManager[2];
    if (e.key == "ArrowLeft"){
        slideManager.forEach((slide) =>{
            slide.targetPosition -= slideUnit;
            slide.targetdistortionFactor = Math.min(1.0, slide1.targetdistortionFactor + 0.3);
        });
    }else if (e.key == "ArrowRight"){
        slideManager.forEach((slide) =>{
            slide.targetPosition += slideUnit;
            slide.targetdistortionFactor = Math.min(1.0, slide1.targetdistortionFactor + 0.3);
        });
    }
});
window.addEventListener(
    "wheel",
    (e) =>{
        e.preventDefault();
        const wheelStrength = Math.abs(e.deltaY ) * 0.001;
        slide1.targetdistortionFactor = Math.min(
            1.0,
            slide1.targetdistortionFactor + wheelStrength);
        slide1.targetPosition -= e.deltaY * settings.wheelSensitivity;
        slide1.isScrolling = true;
        slide1.autoScrollSpeed = Math.min(Math.abs(e.deltaY) * 0.005, 0.05) * Math.sign(e.deltaY);

        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() =>{
            slide1.isScrolling = false;
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
    for (let i = 0; i < sliderCount; i++) {
        const currSlide = slideManager[i];
        const deltaTime = currSlide.lastTime ? (time - currSlide.lastTime) / 1000 : 0.016;

        const prevPos = currSlide.currentPosition;
        if (currSlide.isScrolling) {
            currSlide.targetPosition += currSlide.autoScrollSpeed;
            const speedBasedDecay = 0.97 - Math.abs(currSlide.autoScrollSpeed) * 0.5;
            currSlide.autoScrollSpeed *= Math.max(0.92, speedBasedDecay);
            
            if (Math.abs(currSlide.autoScrollSpeed) < 0.001) {
                currSlide.autoScrollSpeed = 0;
            }
        }
        
        currSlide.currentPosition += (currSlide.targetPosition - currSlide.currentPosition) * settings.smoothing;
        const currentVelocity = Math.abs(currSlide.currentPosition - prevPos) / deltaTime;
        currSlide.velocityHistory.push(currentVelocity);
        currSlide.velocityHistory.shift();

        const avgVelocity = 
            currSlide.velocityHistory.reduce((sum, val) => sum + val, 0) / currSlide.velocityHistory.length;

        if (avgVelocity > currSlide.peakVelocity) {
            currSlide.peakVelocity = avgVelocity;
        }
        
        const velocityRatio = avgVelocity / (currSlide.peakVelocity + 0.001);
        const isDecelerating = velocityRatio < 0.7 && currSlide.peakVelocity > 0.5;

        currSlide.peakVelocity *= 0.99;
        const movementDistortion = Math.min(1.0, currentVelocity * 0.1);
        if (currentVelocity > 0.05) {
            currSlide.targetdistortionFactor = Math.max(
                currSlide.targetdistortionFactor,
                movementDistortion
            );
        }
        if (isDecelerating || avgVelocity < 0.2) {
            const decayRate = isDecelerating ? settings.distortionDecay : settings.distortionDecay * 0.9;
            currSlide.targetdistortionFactor *= decayRate;
        }
        currSlide.currentDistortionFactor += (currSlide.targetdistortionFactor - currSlide.currentDistortionFactor) * 
            settings.distortionSmoothing;

        // 3D carousel settings
        const carousel3D = {
            radius: slideWidth * 2, // Distance from center for 3D positioning
            maxRotation: Math.PI / 3, // Maximum rotation angle (60 degrees)
            centerZone: slideWidth * 0.8, // Zone where slides are flat
            depthRange: slideWidth * 0.5 // How far back slides can go
        };

        currSlide.slides.forEach((slide, i) => {
            let baseX = i * slideUnit - currSlide.currentPosition;
            baseX = ((baseX % totalWidth) + totalWidth) % totalWidth;
            if (baseX > totalWidth / 2) baseX -= totalWidth;

            const isWrapping = Math.abs(baseX - slide.userData.targetX) > slideWidth * 2;
            if (isWrapping) slide.userData.currentX = baseX;

            slide.userData.targetX = baseX;
            slide.userData.currentX += (slide.userData.targetX - slide.userData.currentX) * settings.slideLerp;

            const wrapThreshold = totalWidth / 2 + slideWidth;
            if (Math.abs(slide.userData.currentX) < wrapThreshold * 1.5) {
                // Calculate 3D transformation based on distance from center
                const distanceFromCenter = Math.abs(slide.userData.currentX);
                const normalizedDistance = Math.min(1, Math.max(0, 
                    (distanceFromCenter - carousel3D.centerZone) / (slideWidth * 2)
                ));
                
                // Calculate rotation based on position
                const rotationIntensity = normalizedDistance;
                const rotationY = slide.userData.currentX > 0 ? 
                    -carousel3D.maxRotation * rotationIntensity : 
                    carousel3D.maxRotation * rotationIntensity;
                
                // Calculate depth (Z position) - slides move back as they rotate
                const depth = -carousel3D.depthRange * normalizedDistance * normalizedDistance;
                
                // Calculate X position adjustment for circular motion
                const radiusOffset = Math.sin(rotationY) * carousel3D.radius * 0.3;
                const adjustedX = slide.userData.currentX + radiusOffset;
                
                // Apply 3D transformations
                slide.position.x = adjustedX;
                slide.position.z = depth;
                slide.rotation.y = rotationY;
                
                // Optional: Scale slides slightly as they move away
                const scaleMultiplier = 1 - (normalizedDistance * 0.1);
                slide.scale.set(scaleMultiplier, scaleMultiplier, 1);
                
                // Optional: Adjust opacity for depth effect
                if (slide.material && slide.material.opacity !== undefined) {
                    slide.material.opacity = Math.max(0.3, 1 - normalizedDistance * 0.4);
                }
            }
        });
        
        currSlide.lastTime = time;
    }
    renderer.render(scene, camera);
};
animate();
