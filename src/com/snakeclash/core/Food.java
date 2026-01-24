package com.snakeclash.core;

/**
 * Simple food entity that contributes to the snake's level.
 */
public class Food {
    private Vector3 position;
    private int value;

    public Food(Vector3 position, int value) {
        this.position = position;
        this.value = value;
    }

    public Vector3 getPosition() { return position; }
    public int getValue() { return value; }
}
