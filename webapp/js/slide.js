
import * as THREE from "https://cdn.skypack.dev/three@0.129.0";

export class Slider{
    constructor(yOffset = 0, scene = new THREE.Scene()){
        this.scene = scene;
        this.yOffset = yOffset;
        this. slideWidth = 2.0;
        this. slideHeight = 1.5;
        this. gap = 0.1; 
        this. slideCount = 10;
        this. imageCount = 5;
        this. totalWidth = this.slideCount * (this.slideWidth + this.gap);
        this.slideUnit = this.slideWidth + this. gap;
        this.slide = [];
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
        

        this.settings = {
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
        this.createSlideHelper();
    }
    correctImageColor(texture){
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    createSlide(index){
        const geometry = new THREE.PlaneGeometry(this. slideWidth, this. slideHeight, 32, 16);
        const colors  = ["#FF5733", "#33FF57", "#3357ff", "#F3FF33", "#FF33F3"];
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(colors[index % colors.length]),
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = index * [this.slideWidth + this.gap];
        mesh.position.y =  this.yOffset;
        mesh.userData = {
            originalVertices: [...geometry.attributes.position.array],
            index, 
        };
        const imageIndex = (index % this.imageCount) + 1 ;
        const imagePath = `img/img${imageIndex}.jpg`;
        
        new THREE.TextureLoader().load(
            imagePath,
            (texture) =>{
                this.correctImageColor(texture);
                material.map = texture;
                material.color.set(0xffffff);
                material.needsUpdate = true;
                const imgAspect = texture.image.width / texture.image.height;
                const slideAspect = this.slideWidth/this.slideHeight;
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
        this.scene.add(mesh);
        this.slide.push(mesh)
    }

    createSlideHelper(){
        for ( let i =0; i <this.slideCount; i++){
            this.createSlide(i);
        }   
        this.slide.forEach(slide =>{
            slide.position.x -= this.totalWidth / 2;
            slide.userData.targetX = slide.position.x;
            slide.userData.currentX = slide.position.x;
        });

    }
    updateCurve (mesh, wordPositionX, distortionFactor){
        const distortionCenter = new THREE.Vector2(0,0);
        const distortionRadius = 2.0;
        const maxCurvature = this.settings.maxDistortion * distortionFactor;
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
    }

    animateUpdate = (time) => {
        requestAnimationFrame(this.animateUpdate);
        const deltaTime = this.lastTime ? (time-this.lastTime)/ 1000: 0.016;

        const prevPos = this.currentPosition;
        if (this.isScrolling){
            this.targetPosition += this.autoScrollSpeed;
            const speedBasedDecay = 0.97 - Math.abs(this.autoScrollSpeed) * 0.5;
            this.autoScrollSpeed *= Math.max(0.92, speedBasedDecay);
            
            if (Math.abs(this.autoScrollSpeed) < 0.001){
                this.autoScrollSpeed = 0 ;
            }
        
        }
        this.currentPosition += (this.targetPosition- this.currentPosition) * this.settings.smoothing;
        const currentVelocity = Math.abs(this.currentPosition - prevPos)/deltaTime;
        this.velocityHistory.push(currentVelocity);
        this.velocityHistory.shift();

        const avgVelocity = 
            this.velocityHistory.reduce((sum, val) => sum + val, 0) / this.velocityHistory.length;

        if (avgVelocity > this.peakVelocity){
            this.peakVelocity = avgVelocity;
        }
        
        const velocityRatio = avgVelocity / (this.peakVelocity + 0.001);
        const isDecelerating = velocityRatio < 0.7 && this.peakVelocity > 0.5;

        this.peakVelocity *= 0.99;
        const movementDistortion = Math.min(1.0, currentVelocity * 0.1);
        if(currentVelocity > 0.05){
            this.targetdistortionFactor = Math.max(
                this.targetdistortionFactor,
                movementDistortion
            );
        }
        if (isDecelerating || avgVelocity < 0.2){
            const decayRate = isDecelerating ? this.settings.distortionDecay : this.settings.distortionDecay * 0.9;
            this.targetdistortionFactor*= decayRate;
        }
        this.currentDistortionFactor += (this.targetdistortionFactor- this.currentDistortionFactor) * 
        this.settings.distortionSmoothing;

        this.slide.forEach((slide, i) => {
                let baseX = i * this.slideUnit - this.currentPosition;
                baseX = ((baseX % this.totalWidth) + this.totalWidth) % this.totalWidth;
                if (baseX > this.totalWidth / 2) baseX -= this.totalWidth;

                const isWrapping = Math.abs(baseX - slide.userData.targetX) > this.slideWidth * 2;
                if (isWrapping) slide.userData.currentX = baseX;

                slide.userData.targetX = baseX;
                slide.userData.currentX += (slide.userData.targetX - slide.userData.currentX) * this.settings.slideLerp;

                const wrapThreshold = this.totalWidth / 2 + this.slideWidth;
                if (Math.abs(slide.userData.currentX) < wrapThreshold * 1.5) {
                    slide.position.x = slide.userData.currentX;
                    // this.updateCurve(slide, slide.position.x, this.currentDistortionFactor);
                }
        });


        // renderer.render(scene, camera)


    };
    
}