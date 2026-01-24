package com.snakeclash.core;

/**
 * A simple 3D Vector for position and translation.
 */
public class Vector3 {
    public float x, y, z;

    public Vector3(float x, float y, float z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public Vector3 copy() {
        return new Vector3(x, y, z);
    }

    public float distanceTo(Vector3 other) {
        return (float) Math.sqrt(Math.pow(x - other.x, 2) + Math.pow(y - other.y, 2) + Math.pow(z - other.z, 2));
    }

    public void lerp(Vector3 target, float alpha) {
        this.x += (target.x - this.x) * alpha;
        this.y += (target.y - this.y) * alpha;
        this.z += (target.z - this.z) * alpha;
    }
}
