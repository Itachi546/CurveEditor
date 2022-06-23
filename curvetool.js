import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { TransformControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/TransformControls.js';
import { CubicBezierCurve } from "./polyinterp.js";
import { LineRenderer, PointRenderer } from './geometry.js'

export class Curve {
    #extrudeMode = false;
    #segDist = 0.05;

    constructor(controlPoints, params) {
        // Initialize Variables
        this.#segDist = params.segDist;
        this.#extrudeMode = params.extrudeMode;
        this.controlPointRadius = 0.02;
        this.points = [];
        //this.extrudeCurve = null;

        // Create Control Point Goemetry
        this.sphereGeom = new THREE.SphereGeometry(1.0, 4, 4);
        this.sphereMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        this.spheres = [];
        controlPoints.forEach((controlPoint) => this.spheres.push(this.#generateSphere(controlPoint, 0.02)));

        // Create Curves from Control Point
        this.curves = [];
        for (let i = 0; i < this.spheres.length; i += 4) {
            this.curves.push(new CubicBezierCurve(this.spheres[i].position,
                this.spheres[i + 1].position,
                this.spheres[i + 2].position,
                this.spheres[i + 3].position));
        }

        // For each curve generate points
        this.curves.forEach(curve => {
            curve.generateFixed(this.#segDist);
            this.points.push(...curve.points);
        });

        // Debug Draw Lines and Points
        this.lineRenderer = new LineRenderer(controlPoints, true);
        this.curveRenderer = new LineRenderer(this.points, false, 0xff0000);
        this.pointRenderer = new PointRenderer(this.points, this.controlPointRadius, 0xff0000);

        // Raycaster to select control point
        this.rayCaster = new THREE.Raycaster();
        this.transformControl = null;
        this.extrudeSphere = this.#generateSphere(new THREE.Vector3(0.0, 0.0, 0.0), this.controlPointRadius);
        this.extrudeSphere.visible = this.#extrudeMode;
        this.nextCurve = null;
    }

    setShowPoints(val) {
        this.pointRenderer.mesh.visible = val;
    }

    setShowGizmo(val) {
        this.transformControl.detach();
        this.transformControl.enabled = val;
        if (this.transformControl) {
            if (this.#extrudeMode) {
                if (val) this.transformControl.attach(this.extrudeSphere);
            }
            else {
                
                this.lineRenderer.mesh.visible = val;
                this.spheres.forEach(sphere => sphere.visible = val)
            }
        }
        else
            console.warn("TransformControl not initialized");
    }

    setScene(scene) {
        this.scene = scene;
        scene.add(this.lineRenderer.mesh);
        scene.add(this.curveRenderer.mesh);
        scene.add(this.pointRenderer.mesh);
        this.spheres.forEach(sphere => scene.add(sphere));

        if (this.transformControl)
            scene.add(this.transformControl);

        scene.add(this.extrudeSphere);
    }

    setExtrudeMode(mode) {
        this.extrudeSphere.visible = mode;
        this.spheres.forEach(sphere => sphere.visible = !mode);
        this.lineRenderer.mesh.visible = !mode;

        if (mode) {
            let lastCurve = this.curves[this.curves.length - 1];
            let p = lastCurve.p3;
            this.extrudeSphere.position.set(p.x, p.y, p.z);
            this.transformControl.attach(this.extrudeSphere);
        }
        else
            this.transformControl.detach();

        this.#extrudeMode = mode;
    }

    enableTransformControl(camera, domElement) {
        this.transformControl = new TransformControls(camera, domElement);
        this.transformControl.setMode('translate');

        this.transformControl.addEventListener('mouseUp', this.#onControlStop.bind(this));
        this.transformControl.addEventListener('mouseDown', this.#onControlStart.bind(this));
    }

    #onControlStart() {
        /*
            Record starting position, this is used to translate adjacent control
            point to keep the curve smooth when the point at boundary of curve 
            is selected
        */
        this.startPosition = this.transformControl.object.position.clone();
    }

    #onControlStop() {

        if (this.#extrudeMode && this.nextCurve) {

            let s1 = this.#generateSphere(this.nextCurve.p1, this.controlPointRadius);
            let s2 = this.#generateSphere(this.nextCurve.p2, this.controlPointRadius);
            let s3 = this.#generateSphere(this.nextCurve.p3, this.controlPointRadius);
            this.scene.add(s1), this.scene.add(s2), this.scene.add(s3);
            this.spheres.push(s1, s2, s3);    

            let curve = new CubicBezierCurve(this.nextCurve.p0, s1.position, s2.position, s3.position);
            curve.generateFixed(this.#segDist);
            this.curves.push(curve)
            this.nextCurve = null;
        }
    }

    #generateSphere(position, radius) {
        let mesh = new THREE.Mesh(this.sphereGeom, this.sphereMat);
        mesh.position.set(position.x, position.y, position.z);
        mesh.scale.set(radius, radius, radius);
        return mesh;
    }

    #generateCurveForPosition(position) {
        // Generate additional two point and add the new curve
        let lastCurve = this.curves[this.curves.length - 1];
        let p0 = lastCurve.p3;
        let p3 = position.clone();

        let len1 = p0.clone().sub(p3).length();
        let dir1 = p0.clone().sub(lastCurve.p2);
        let p1 = p0.clone().add(dir1.multiplyScalar(len1 * 0.5));

        let dir2 = p3.clone().sub(p1);
        let len2 = dir2.length();
        let p2 = p3.clone().sub(dir2.multiplyScalar(len2 * 0.5));

        
        let curve = new CubicBezierCurve(p0, p1, p2, p3);
        curve.generateFixed(this.#segDist);
        return curve;
    }

    
    isActive() {
        return this.transformControl?.dragging;
    }

    update(camera, pointer, mouseDown) {

        if (this.transformControl && mouseDown) {
            
            this.rayCaster.setFromCamera(pointer, camera);
            let intersection = [];

            if (!this.transformControl.dragging) {
                if (this.#extrudeMode)
                    this.extrudeSphere.raycast(this.rayCaster, intersection);
                else
                    intersection = this.rayCaster.intersectObjects(this.spheres);

                if (intersection.length > 0)
                    this.transformControl.attach(intersection[0].object);

            }
            else {
                if (!this.#extrudeMode) {
                    this.#updateCurve(this.transformControl.object.position, true);
                    this.updateDebugs();
                }
                else 
                {
                    this.nextCurve = this.#generateCurveForPosition(this.extrudeSphere.position);
                    this.updateDebugs();
                }
            }
        }
    }


    updateDebugs()
    {
        this.points = [];
        let controlPoints = [];
        this.curves.forEach((curve) => {
            this.points.push(...curve.points)
            controlPoints.push(curve.p0, curve.p1, curve.p2, curve.p3);
        });
        
        if(this.nextCurve)
        {
            this.points.push(...this.nextCurve.points);
            controlPoints.push(this.nextCurve.p0, this.nextCurve.p1, this.nextCurve.p2, this.nextCurve.p3);
        }

        this.curveRenderer.update(this.points);
        this.lineRenderer.update(controlPoints);
        this.pointRenderer.update(this.points);
    }

    #updateCurve(currentPoint, dragMode = false) {
        let indices = this.#findIndicesForPointInCurves(currentPoint);

        // Check if the points are being dragged or just added
        if (dragMode) {
            // if point is dragged we have to update constraint
            // Check if point is terminal point
            if (indices.length > 1) {
                let c0 = this.curves[indices[0]];
                let c1 = this.curves[indices[1]];

                if (c0.p3 === currentPoint) {
                    let delta = currentPoint.clone().sub(this.startPosition);
                    c0.p2 = c0.p2.add(delta);
                    c1.p1 = c1.p1.add(delta);
                    this.startPosition = currentPoint.clone();
                }
            }
            else {
                let c0 = this.curves[indices[0]];
                let prevCurve = this.curves[indices[0] - 1];
                let nextCurve = this.curves[indices[0] + 1];
                if (c0.p1 === currentPoint && prevCurve) {
                    let dir = c0.p0.clone().sub(currentPoint);
                    dir.normalize();

                    let dist = prevCurve.p2.clone().sub(prevCurve.p3).length();
                    const p = prevCurve.p3.clone().add(dir.multiplyScalar(dist));
                    prevCurve.p2.set(p.x, p.y, p.z);
                    indices.push(indices[0] - 1);
                }
                else if (c0.p2 == currentPoint && nextCurve) {
                    let dir = c0.p3.clone().sub(currentPoint);
                    dir.normalize();

                    let dist = nextCurve.p1.clone().sub(nextCurve.p0).length();
                    const p = nextCurve.p0.clone().add(dir.multiplyScalar(dist));
                    nextCurve.p1.set(p.x, p.y, p.z);
                    indices.push(indices[0] + 1);
                }
            }
        }

        indices.forEach(index => this.curves[index].generateFixed(this.#segDist));
    }

    #findIndicesForPointInCurves(point) {
        let indices = [];
        this.curves.forEach((curve, index) => {
            if (curve.p0 === point ||
                curve.p1 === point ||
                curve.p2 === point ||
                curve.p3 === point)
                indices.push(index);
        });
        return indices;
    }
}

