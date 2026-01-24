package com.snakeclash.entities;

import com.snakeclash.core.Snake;
import com.snakeclash.core.Vector3;
import com.snakeclash.core.Food;
import java.util.List;

/**
 * AI Bot logic for computer-controlled snakes.
 */
public class EnemyBot extends Snake {
    
    public EnemyBot(Vector3 startPos, int startLevel) {
        super(startPos, startLevel);
    }

    @Override
    protected void move(float speed, float deltaTime) {
        // AI logic will move towards the target
        // For simplicity, the GameWorld will provide the moveTarget
    }

    /**
     * AI logic: Find and move towards the nearest food.
     */
    public void think(List<Food> foods, float speed, float deltaTime) {
        Food nearest = null;
        float minDist = Float.MAX_VALUE;

        for (Food f : foods) {
            float d = position.distanceTo(f.getPosition());
            if (d < minDist) {
                minDist = d;
                nearest = f;
            }
        }

        if (nearest != null) {
            // Simple logic: Move direction towards nearest food
            Vector3 target = nearest.getPosition();
            // In a real 3D engine, this would be: direction = (target - pos).normalize()
            // We'll simulate pathing here:
            position.lerp(target, (speed * deltaTime) / minDist);
        }
    }
}
