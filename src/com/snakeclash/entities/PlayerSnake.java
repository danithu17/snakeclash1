package com.snakeclash.entities;

import com.snakeclash.core.Snake;
import com.snakeclash.core.Vector3;

/**
 * Player-controlled snake.
 */
public class PlayerSnake extends Snake {
    private float boostDrainTimer = 0;

    public PlayerSnake(Vector3 startPos, int startLevel) {
        super(startPos, startLevel);
    }

    @Override
    protected void move(float speed, float deltaTime) {
        // In a real 3D game, 'direction' would come from input (joystick/touch)
        // Here we simulate forward movement along Z for logic demonstration
        position.z += speed * deltaTime;

        // Handle boost penalty logic
        if (isBoosting) {
            boostDrainTimer += deltaTime;
            if (boostDrainTimer >= 1.0f) { // Every 1 second
                if (level > 1) level--;
                boostDrainTimer = 0;
            }
        }
    }

    public void setDirection(float x, float y, float z) {
        // Implementation of input-based direction changes
    }
}
