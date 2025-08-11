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
const slideHeight = 1.5;
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

const slide1 = new Slide();

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
    mesh.position.x = index * [slideWidth + gap];
    mesh.position.y = offset
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

for ( let i =0; i <slideCount; i++){
    createSlide(i, 0, slide1.slides);
}

slide1.slides.forEach(slide => {
        slide.position.x -= totalWidth / 2;
        slide.userData.targetX = slide.position.x;
        slide.userData.currentX = slide.position.x;
    });



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
    if (e.key == "ArrowLeft"){
        slide1.targetPosition -= slideUnit;
        slide1.targetdistortionFactor = Math.min(1.0, slide1.targetdistortionFactor + 0.3);
    
    }else if (e.key == "ArrowRight"){
        slide1.targetPosition += slideUnit;
        slide1.targetdistortionFactor = Math.min(1.0, slide1.targetdistortionFactor +0.3);
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
    const deltaTime = slide1.lastTime ? (time-slide1.lastTime)/ 1000: 0.016;

    const prevPos = slide1.currentPosition;
    if (slide1.isScrolling){
        slide1.targetPosition += slide1.autoScrollSpeed;
        const speedBasedDecay = 0.97 - Math.abs(slide1.autoScrollSpeed) * 0.5;
        slide1.autoScrollSpeed *= Math.max(0.92, speedBasedDecay);
        
        if (Math.abs(slide1.autoScrollSpeed) < 0.001){
            slide1.autoScrollSpeed = 0 ;
        }
    
    }
    slide1.currentPosition += (slide1.targetPosition- slide1.currentPosition) * settings.smoothing;
    const currentVelocity = Math.abs(slide1.currentPosition - prevPos)/deltaTime;
    slide1.velocityHistory.push(currentVelocity);
    slide1.velocityHistory.shift();

    const avgVelocity = 
        slide1.velocityHistory.reduce((sum, val) => sum + val, 0) / slide1.velocityHistory.length;

    if (avgVelocity > slide1.peakVelocity){
        slide1.peakVelocity = avgVelocity;
    }
    
    const velocityRatio = avgVelocity / (slide1.peakVelocity + 0.001);
    const isDecelerating = velocityRatio < 0.7 && slide1.peakVelocity > 0.5;

    slide1.peakVelocity *= 0.99;
    const movementDistortion = Math.min(1.0, currentVelocity * 0.1);
    if(currentVelocity > 0.05){
        slide1.targetdistortionFactor = Math.max(
            slide1.targetdistortionFactor,
            movementDistortion
        );
    }
    if (isDecelerating || avgVelocity < 0.2){
        const decayRate = isDecelerating ? settings.distortionDecay : settings.distortionDecay * 0.9;
        slide1.targetdistortionFactor*= decayRate;
    }
    slide1.currentDistortionFactor += (slide1.targetdistortionFactor- slide1.currentDistortionFactor) * 
    settings.distortionSmoothing;

    slide1.slides.forEach((slide, i )=> {
            let baseX = i * slideUnit - slide1.currentPosition;
            baseX = ((baseX % totalWidth) + totalWidth) % totalWidth;
            if (baseX > totalWidth / 2) baseX -= totalWidth;

            const isWrapping = Math.abs(baseX - slide.userData.targetX) > slideWidth * 2;
            if (isWrapping) slide.userData.currentX = baseX;

            slide.userData.targetX = baseX;
            slide.userData.currentX += (slide.userData.targetX - slide.userData.currentX) * settings.slideLerp;

            const wrapThreshold = totalWidth / 2 + slideWidth;
            if (Math.abs(slide.userData.currentX) < wrapThreshold * 1.5) {
                slide.position.x = slide.userData.currentX;
                // updateCurve(slide, slide.position.x, slide1.currentDistortionFactor);
            }
    });

    renderer.render(scene, camera)


};
animate();
