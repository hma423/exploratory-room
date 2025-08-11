import {Slider} from "./slide.js";
import * as THREE from "https://cdn.skypack.dev/three@0.129.0";

const canvas= document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({
    canvas,antialias: true,
    preserveDrawingBuffer: true,
});

const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth/window.innerHeight,0.1, 100 
)
camera.position.z = 5; 

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));


const slide = new Slider(0, scene);


window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


window.addEventListener("keydown", (e)=>{
    if (e.key == "ArrowLeft"){
        console.log("left arrow down")
        slide.targetPosition -= slide.slideUnit;
        slide.targetdistortionFactor = Math.min(1.0, slide.targetdistortionFactor + 0.3);
    
    }else if (e.key == "ArrowRight"){
        slide.targetPosition += slide.slideUnit;
        slide.targetdistortionFactor = Math.min(1.0, slide.targetdistortionFactor +0.3);
    }
});
window.addEventListener(
    "wheel",
    (e) =>{
        e.preventDefault();
        const wheelStrength = Math.abs(e.deltaY ) * 0.001;
        slide.targetdistortionFactor = Math.min(
            1.0,
            slide.targetdistortionFactor + slide.wheelStrength);
        slide.targetPosition -= e.deltaY * slide.settings.wheelSensitivity;
        slide.isScrolling = true;
        slide.autoScrollSpeed = Math.min(Math.abs(e.deltaY) * 0.005, 0.05) * Math.sign(e.deltaY);

        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() =>{
            slide.isScroling = false;
        }, 150);
    }, {passive: false}
);


function animate(time) {
    requestAnimationFrame(animate);
    slide.animateUpdate();
    renderer.render(scene, camera);
}
animate();
