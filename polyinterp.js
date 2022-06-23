import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';

export class Interpolation {
    static Lerp(a, b, t) {
        return a + t * (b - a);
    }

    static QuadraticBezier(p0, p1, p2, t) {
        const a = (1 - t) * (1 - t);
        const b = t * t;
        return p1 + a * (p0 - p1) + b * (p2 - p1);
    }

    static QuadraticDerivative(p0, p1, p2, t) {
        return 2.0 * (p1 - p0) * (1 - t) + 2 * t * (p2 - p1);
    }

    static CubicBezier(p0, p1, p2, p3, t) {
        let a = this.QuadraticBezier(p0, p1, p2, t);
        let b = this.QuadraticBezier(p1, p2, p3, t);
        return this.Lerp(a, b, t);
    }
}

export class QuadraticBezierCurve {
    constructor(p0, p1, p2, segments = 16) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;

        this.segments = segments;
        this.points = [];
    }

    generate() {
        for (let i = 0; i <= this.segments; ++i) {
            const t = i / this.segments;

            this.points.push({
                x: Interpolation.QuadraticBezier(this.p0.x, this.p1.x, this.p2.x, t),
                y: Interpolation.QuadraticBezier(this.p0.y, this.p1.y, this.p2.y, t),
                z: Interpolation.QuadraticBezier(this.p0.z, this.p1.z, this.p2.z, t)
            });

        }
    }
}

export class CubicBezierCurve {
    constructor(p0, p1, p2, p3, segments = 16) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;

        this.segments = segments;
        this.points = [];
    }

    generateFixed(segDist) {

        this.points = [];

        let t = 0.0;
        let lp = this.p0;

        let distance = 0.0;
        const stepSize = 0.01;
        while (t <= 1.0) {
            t += stepSize;
            let p = new THREE.Vector3(
                Interpolation.CubicBezier(this.p0.x, this.p1.x, this.p2.x, this.p3.x, t),
                Interpolation.CubicBezier(this.p0.y, this.p1.y, this.p2.y, this.p3.y, t),
                Interpolation.CubicBezier(this.p0.z, this.p1.z, this.p2.z, this.p3.z, t));

            let delta = lp.clone().sub(p);
            let d = delta.length();
            distance += d;

            if (distance >= segDist) {
                const f = (1.0 - Math.min(Math.max((segDist / distance), 0.0), 1.0)) * stepSize;
                t = t - f;
                p = new THREE.Vector3(
                    Interpolation.CubicBezier(this.p0.x, this.p1.x, this.p2.x, this.p3.x, t),
                    Interpolation.CubicBezier(this.p0.y, this.p1.y, this.p2.y, this.p3.y, t),
                    Interpolation.CubicBezier(this.p0.z, this.p1.z, this.p2.z, this.p3.z, t));
                distance = p.clone().sub(p).length();
                this.points.push(p);
            }
            lp = p;
        }

        if(distance > 0.0)
            this.points.push(this.p3);
    }

    generate() {
        this.points = [];
        for (let i = 0; i <= this.segments; ++i) {
            const t = i / this.segments;

            this.points.push( new THREE.Vector3(
                Interpolation.CubicBezier(this.p0.x, this.p1.x, this.p2.x, this.p3.x, t),
                Interpolation.CubicBezier(this.p0.y, this.p1.y, this.p2.y, this.p3.y, t),
                Interpolation.CubicBezier(this.p0.z, this.p1.z, this.p2.z, this.p3.z, t)
            ));
        }
    }
}