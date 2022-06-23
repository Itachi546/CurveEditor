import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { Curve } from './curvetool.js';
import {CurveSkinModifier} from './modifier.js';

let camera, scene, renderer, controls,
    curveTool, modifier, leftmouseDown;
let pointer = new THREE.Vector2();

const setting = {
    showMesh: false,
    showPoints: true,
    extrudeMode: false,
    showGizmo: true,
    segDist: 0.05,
    wire: {
        showTBN: false,
        radius: 0.03,
        color:0xff0000,
        castShadow: false,
        shininess: 50
    }
};

init();
animate();

/*
    1. @TODO Refactor the code, maybe 
       remove unused variables, 
       remove repeated code,
       remove unused code,
       remove memory reallocation ...
    2.  Runtime update of the curve when extrusion is done. [DONE]
    3.  Visualize bitangent and normal vector for the point in curve. [DONE]
    4.  Analytic derivative computation rather than numerical.
    5.  Other types of modifiers.
    6.  Debug why skin modifier bugs in some places. [DONE]
          This occurs due to the fact that the direction of bitangent and normal vector
          are reversed at some point in the curve(maybe inflection point). 
    7.  No depth test for debug data.
    8.  Revisit how scene object is moved around and how invisible objects. [DONE]
        are handled. (visible property rather than removing from scene)
    9.  Generate mesh based on curve rather than list of points (May cause seams on the edge)
    10. Add Some Comments :)
    11. Refactor how curveTools and other properties are initialized [DONE]
    12. Convert all Vec3 like object to THREE.Vector3 [DONE]
    13. Finally push it to github :)
*/

function createMesh(geom, mat, receiveShadow = true, castShadow = true)
{
    let mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
}

function init() {

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 500);
    camera.up.set(0.0, 0.0, 1.0);
    camera.position.set(0.8, 0.8, 0.8);

    scene = new THREE.Scene();

    const planeGeometry = new THREE.PlaneGeometry(10, 10, 5, 5);
    const planeMaterial = new THREE.MeshPhongMaterial({color: '#fff'});
    const plane = createMesh(planeGeometry, planeMaterial);
    scene.add(plane);

    // Directional Light
    const dirLight = new THREE.DirectionalLight();
    dirLight.position.set(-20.0, 20.0, 20.0);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Setup Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    let controlPoints = [
        new THREE.Vector3(0.581, 1.51, 0.1),
        new THREE.Vector3(1.53, -0.61, 2.47),
        new THREE.Vector3(0.85, -2.09, 0.1),
        new THREE.Vector3(-0.3, 0.6, 0.1),
    ];
    
    curveTool = new Curve(controlPoints, setting);
    curveTool.enableTransformControl(camera, renderer.domElement);
    curveTool.setShowGizmo(setting.showGizmo);
    curveTool.setShowPoints(setting.showPoints);
    curveTool.setScene(scene);

    modifier = new CurveSkinModifier();
    modifier.toggleTBN(setting.showTBN);
    scene.add(modifier.lineRenderer.mesh);

    // GUI
    let gui = new dat.GUI();
    gui.add(setting, 'showMesh').onChange((val)=>{ 
        modifier.update(scene, curveTool.points, val);
    });

    gui.add(setting, 'showPoints').onChange(val=> curveTool.setShowPoints(val));
    gui.add(setting, "extrudeMode").onChange(val => curveTool.setExtrudeMode(val));
    gui.add(setting, "showGizmo").onChange(val => {
        curveTool.setShowGizmo(val);
    });

    let wire = gui.addFolder("Wire");
    wire.add(setting.wire, "showTBN").onChange(val =>{
        modifier.toggleTBN(val);
    })

    wire.add(setting.wire, "radius", 0.01, 0.2).onChange(val => {
        modifier.setRadius(val, curveTool.points, scene, setting.showMesh);
    });

    wire.addColor(setting.wire, "color").onChange(val => {
        modifier.setColor(val);
    });
    wire.add(setting.wire, "shininess", 0, 100).onChange(val => modifier.setShininess(val));
    wire.add(setting.wire, "castShadow").onChange(val => modifier.setCastShadow(val));
    
}

function animate() {

    requestAnimationFrame(animate);

    controls.update();

    if(curveTool.isActive())
    {
        controls.enabled = false;
        modifier.update(scene, curveTool.points, setting.showMesh);
    }
    else {
        controls.enabled = true;
    }
    curveTool.update(camera, pointer, leftmouseDown);

    renderer.render(scene, camera);

}

window.addEventListener('resize', (evt)=>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('pointermove', (evt)=>{
    pointer.x = ( evt.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( evt.clientY / window.innerHeight ) * 2 + 1
});

window.addEventListener('pointerdown', (evt)=>{
    if(evt.button === 0)
        leftmouseDown = true;
});

window.addEventListener('pointerup', (evt)=>{
    if(evt.button === 0)
        leftmouseDown = false;
});