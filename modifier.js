import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { LineRenderer } from './geometry.js';

/**************************************************************************************** */
export class CurveSkinModifier {
    #radius;
    constructor(ring = 16, radius = 0.03, color = 0xff0000) {
        this.ring = ring;
        this.#radius = radius;
        //this.material = new THREE.MeshNormalMaterial();
        this.material = new THREE.MeshPhongMaterial({color, shininess: 100, emissive: 0x4f4040});
        this.lineRenderer = new LineRenderer([], true);
        this.castShadow = false;
    }

    update(scene, points, showMesh) {
        if (this.mesh) {
            scene.remove(this.mesh)
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        this.mesh = this.#generateMesh(points);
        this.mesh.castShadow = this.castShadow;
        this.mesh.receiveShadow = this.castShadow;
        if(showMesh)
            scene.add(this.mesh);
    }

    setRadius(radius, points, scene, showMesh)
    {
        this.#radius = radius;
        if(showMesh)
            this.update(scene, points, true);
    }

    setColor(color)
    {
        this.mesh.material.color.setHex(color);
    }

    setCastShadow(val)
    {
        this.castShadow = val;
        this.mesh.castShadow = val;
    }

    setShininess(val)
    {
        this.material.shininess = val;
    }

    toggleTBN(val)
    {
        this.lineRenderer.mesh.visible = val;
    }

    #generateMesh(points) {
        let vertices = [];
        let dirLines = [];
        let prevBT = new THREE.Vector3(0.0, 0.0, 0.0);
        let prevN = new THREE.Vector3(0.0, 0.0, 0.0);
        for (let i = 0; i < points.length; ++i) {

            // Skip degenerate points
            let t = new THREE.Vector3(0.0, 0.0, 0.0);
            if (i == points.length - 1) {
                t.x = points[i].x - points[i - 1].x;
                t.y = points[i].y - points[i - 1].y;
                t.z = points[i].z - points[i - 1].z;
            }
            else {
                t.x = points[i + 1].x - points[i].x;
                t.y = points[i + 1].y - points[i].y;
                t.z = points[i + 1].z - points[i].z
            }

            t.normalize();
            let up = new THREE.Vector3(0.0, 1.0, 0.0);
            let bt = up.clone().cross(t);
            let n  = t.clone().cross(bt);
            
            bt.normalize();
            n.normalize();
            
            let cosAng = bt.dot(prevBT);
            if(cosAng < 0.0)
                bt.multiplyScalar(-1.0);

            cosAng = n.dot(prevN);
            if(cosAng < 0.0)
                n.multiplyScalar(-1.0);
            
            prevBT = bt.clone();
            prevN = n.clone();

            const step = Math.PI * 2.0 / this.ring;
            for (let r = 0; r <= this.ring; ++r) {
                const theta = r * step;
                let bit = bt.clone().multiplyScalar(Math.cos(theta) * this.#radius);
                let nor = n.clone().multiplyScalar(Math.sin(theta) * this.#radius);
                let vert = points[i].clone().add(bit).add(nor);
                vertices.push(vert.x, vert.y, vert.z);
            }

            dirLines.push(points[i], points[i].clone().add(bt.clone().multiplyScalar(0.04)));
            dirLines.push(points[i], points[i].clone().add(n.clone().multiplyScalar(0.04)));
        }

        this.lineRenderer.update(dirLines);
        let geometry = new THREE.BufferGeometry();
        geometry.attributes.position = new THREE.Float32BufferAttribute(vertices, 3);

        let index = [];
        for (let y = 0; y < points.length - 1; ++y) {
            for (let x = 0; x <= this.ring; ++x) {
                let i0 = y * (this.ring + 1) + x;
                let i1 = i0 + 1;
                let i2 = i0 + (this.ring + 1);
                let i3 = i2 + 1;
                index.push(i0, i1, i2, i1, i3, i2);
            }
        }

        geometry.setIndex(index);
        geometry.computeVertexNormals();
        return new THREE.Mesh(geometry, this.material);
    }
}