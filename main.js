import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const _VS = `
    varying vec3 vNormal;
    varying vec2 vUv;
    uniform mat4 bindMatrix;
    uniform mat4 bindMatrixInverse;
    uniform mat4 boneMatrices[46];
    void main() {
        mat4 skinMatrix = mat4(0.0);
        skinMatrix += boneMatrices[int(skinIndex.x)] * skinWeight.x;
        skinMatrix += boneMatrices[int(skinIndex.y)] * skinWeight.y;
        skinMatrix += boneMatrices[int(skinIndex.z)] * skinWeight.z;
        skinMatrix += boneMatrices[int(skinIndex.w)] * skinWeight.w;
        vec4 skinVertex = bindMatrix * vec4(position, 1.0);
        skinVertex = skinMatrix * skinVertex;
        vUv = uv;
        vNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * skinVertex;
    }
`;

const _FS = `
// Define material properties
uniform vec3 uColor;
uniform float uShininess;
uniform float uReflectivity;

// Define lighting parameters
uniform vec3 uAmbientColor;
uniform vec3 uSpecularColor;
uniform vec3 uLightDirection;
varying vec3 vNormal;
// Perlin noise function
float noise3d(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n = p.x + p.y * 157.0 + 113.0 * p.z;
  return mix(mix(mix(fract(sin(n) * 753.5453123), fract(sin(n + 1.0) * 753.5453123), f.x),
                 mix(fract(sin(n + 157.0) * 753.5453123), fract(sin(n + 158.0) * 753.5453123), f.x), f.y),
             mix(mix(fract(sin(n + 113.0) * 753.5453123), fract(sin(n + 114.0) * 753.5453123), f.x),
                 mix(fract(sin(n + 270.0) * 753.5453123), fract(sin(n + 271.0) * 753.5453123), f.x), f.y), f.z);
}
void main() {
    // Define noise parameters
    float noiseScale = 5.0;
    float noiseIntensity = 0.15;
  
    // Compute noise value
    float noise = noise3d(vNormal * noiseScale);
  
    // Define base color and add noise
    vec3 baseColor = vec3(0.1, 0.6, 0.2);
    vec3 color = mix(baseColor, uColor, noise * noiseIntensity);
  
    // Compute lighting
    vec3 light = normalize(uLightDirection);
    float diffuse = max(dot(vNormal, light), 0.0);
    vec3 ambient = uAmbientColor * color;
    vec3 specular = uSpecularColor * pow(max(
        dot(
        reflect(-light, vNormal), normalize(-vNormal)
        ), 0.0
        ), uShininess);
  
    // Combine lighting and material properties
    vec3 finalColor = mix(ambient + color * diffuse, specular, uReflectivity);
    gl_FragColor = vec4(finalColor, 1.0);
  }
  
`;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enablePan = true;
controls.enableKeys = true;
controls.enableRotate = true;
controls.update();

const PI = 3.141592653589793238462643383279502884197169399;

var root, frog, armature, eyes, spine0, spine1, head;
const loader = new GLTFLoader();
loader.load('model.gltf', function (gltf) {

    gltf.scene.rotation.set(0, 0, PI);
    armature = gltf.scene.children[0];
    eyes = armature.children[0];
    frog = armature.children[1];
    root = armature.children[2];
    spine0 = root.children[0];
    spine1 = spine0.children[0];
    head = spine1.children[1];
    console.log(frog);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0x1f7753) },
            uShininess: { value: 0.4 },
            uReflectivity: { value: 0.2 },
            uAmbientColor: { value: new THREE.Color(0x1f7753) },
            uSpecularColor: { value: new THREE.Color(0xffffff) },
            uLightDirection: { value: new THREE.Vector3(0, -1, 0) },
            boneMatrices: { value: new Array(frog.skeleton.bones.length) }
        },
        vertexShader: _VS,
        fragmentShader: _FS
    });
    material.skinning = true;
    let x = [];
    for (let i = 0; i < 46; i++) {
        const m = new THREE.Matrix4();
        for (let j = i * 16; j < i * 16 + 16; j++) {
            m.elements[j % 16] = frog.skeleton.boneMatrices[j];
        }
        x.push(m);
    }
    material.uniforms.boneMatrices.value = x;
    frog.material = material;
    // var boneMatrices = [];
    // for (var i = 0; i < 50; i++) {
    //     boneMatrices.push(new THREE.Matrix4());
    // }
    // frog.material.uniforms.boneMatrices = { value: boneMatrices };
    // frog.material = frog.material;
    // armature.add(frog);
    // frog.bind(root.skeleton);
    // scene.add(frog);
    // scene.add(gltf.scene);
    // console.log(gltf.scene);



    // Create a new SkinnedMesh from the frog geometry and skeleton
    // var skinnedMesh = new THREE.SkinnedMesh(frog.geometry, new THREE.MeshStandardMaterial({ color: 0xffffff }), false);
    frog.add(frog.skeleton.bones[0]); // Add the root bone as a child of the skinned mesh
    frog.bind(frog.skeleton); // Set up skinning for the skinned mesh

    scene.add(frog); // Add the skinned mesh to the scene

    // frog.rotation.z = PI;
    // const armature = gltf.scene.children[0]
    // bone = armature.children[4].children[1].children[0].children[2];
    // console.log(frog);
    // frog.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // frog.rotation.y = PI / 2;
    // console.log(frog);
    // console.log(armature);
    // scene.add(frog);
    // const bone = gltf.scene.children.find((child) => child.name === "bone2.027");
    // scene.add(frog);
}, undefined, function (error) {
    console.error(error);
});
// scene.add(cube);

//add light
// const light = new THREE.AmbientLight(0xFFFFFF); // soft white light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
// const light2 = new THREE.PointLight(0xffffff, 1, 100);
// light2.position.set(2, 10, 2);
// scene.add(light2);
// scene.add(light);
scene.add(directionalLight);
// scene.add(cube);

camera.position.z = 10;
// camera.position.x = 1;
// camera.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), PI / 8);

var counter = 1;
function animate() {
    counter += 0.4;
    requestAnimationFrame(animate);
    // frog.material.uniforms.time.value = counter;
    updateBones();
    // 
    head.rotation.x = PI / 10 + 0.2 * Math.cos(counter);
    // head.rotation.y = 0.2 * Math.cos(0.5 * counter);
    renderer.render(scene, camera);
}
animate();

function updateBones() {
    for (let i = 0; i < frog.skeleton.bones.length; i++) {
        for (let j = i * 16; j < i * 16 + 16; j++) {
            frog.material.uniforms.boneMatrices.value[i].elements[j % 16] = frog.skeleton.boneMatrices[j];
        }
    }
}