package com.snakeclash.core;

import java.util.LinkedList;
import java.util.List;

/**
 * Base Snake class containing core mechanics: Level, Segments, History, and Movement.
 */
public abstract class Snake {
    protected Vector3 position;
    protected int level;
    protected float moveSpeed = 5.0f;
    protected float segmentSpacing = 0.5f;
    protected boolean isBoosting = false;

    // History of positions to ensure segments follow the exact path
    protected LinkedList<Vector3> positionHistory = new LinkedList<>();
    protected int maxHistorySize = 500; // Adjust based on segment count/spacing

    public Snake(Vector3 startPos, int startLevel) {
        this.position = startPos;
        this.level = startLevel;
        // Initialize history with starting position
        for (int i = 0; i < maxHistorySize; i++) {
            positionHistory.add(startPos.copy());
        }
    }

    public void update(float deltaTime) {
        // Handle Boost
        float currentSpeed = moveSpeed;
        if (isBoosting && level > 1) {
            currentSpeed *= 2.0f;
            // Penalty: slowly decrease level while boosting
            // For logic simplicity, we could handle this every second
        }

        // Logic for movement (to be implemented by subclasses)
        move(currentSpeed, deltaTime);

        // Update history: Add new position, remove oldest
        positionHistory.addFirst(position.copy());
        if (positionHistory.size() > maxHistorySize) {
            positionHistory.removeLast();
        }
    }

    protected abstract void move(float speed, float deltaTime);

    /**
     * Logic for smooth segment following.
     * Each segment picks a position from the history based on index.
     */
    public Vector3 getSegmentPosition(int segmentIndex) {
        int historyIndex = (int) (segmentIndex * (segmentSpacing / 0.1f)); // Simplified multiplier
        if (historyIndex >= positionHistory.size()) {
            return positionHistory.getLast();
        }
        return positionHistory.get(historyIndex);
    }

    // Getters and Setters
    public int getLevel() { return level; }
    public void setLevel(int level) { this.level = level; }
    public void addLevel(int amount) { this.level += amount; }
    public Vector3 getPosition() { return position; }
    public boolean isBoosting() { return isBoosting; }
    public void setBoosting(boolean boosting) { isBoosting = boosting; }
}
