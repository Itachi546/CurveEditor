import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';

export class LineRenderer {
    constructor(points, segmented = false, color = 0x00ff00, maxPoints = 10000) {
        this.maxPoints = maxPoints;
        if (points.length > maxPoints)
            console.error("Point exceed maxPoints");

        let geometry = new THREE.BufferGeometry();
        let positions = new Float32Array(maxPoints * 3);

        points.forEach((point, i) => {
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;
        });
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, points.length);

        let material = new THREE.LineBasicMaterial({ color });
        if(segmented)
            this.mesh = new THREE.LineSegments(geometry, material);
        else
            this.mesh = new THREE.Line(geometry, material);
    }

    update(points) {
        if (points.length > this.maxPoints)
            console.error("Point exceed maxPoints");

        const positions = this.mesh.geometry.attributes.position.array;
        points.forEach((point, i) => {
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;
        });
        this.mesh.geometry.setDrawRange(0, points.length);
        this.mesh.geometry.attributes.position.needsUpdate = true;
    }
}

export class PointRenderer {

    constructor(points, size, color = 0x00ff00, maxPoints = 1000) {
        
        this.maxPoints = maxPoints;
        if (points.length > maxPoints)
            console.error("Point exceed maxPoints");

        let geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(maxPoints * 3);

        points.forEach((point, i) => {
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;
        });

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, points.length);

        let material = new THREE.PointsMaterial({ size, color });
        this.mesh = new THREE.Points(geometry, material);
    }

    update(points) {
        if (points.length > this.maxPoints)
            console.error("Point exceed maxPoints");

        const positions = this.mesh.geometry.attributes.position.array;
        points.forEach((point, i) => {
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;
        });
        this.mesh.geometry.setDrawRange(0, points.length);
        this.mesh.geometry.attributes.position.needsUpdate = true;
    }
}