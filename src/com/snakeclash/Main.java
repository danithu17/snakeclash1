package com.snakeclash;

import com.snakeclash.core.GameWorld;
import com.snakeclash.core.Vector3;
import com.snakeclash.core.Food;
import com.snakeclash.entities.PlayerSnake;
import com.snakeclash.entities.EnemyBot;

/**
 * Entry point demo showing how the logic is wired.
 */
public class Main {
    public static void main(String[] args) {
        GameWorld world = new GameWorld();

        // 1. Initialize Player
        PlayerSnake player = new PlayerSnake(new Vector3(0, 0, 0), 10);
        world.setPlayer(player);

        // 2. Add an Enemy Bot (Lower level)
        world.addBot(new EnemyBot(new Vector3(5, 0, 10), 5));

        // 3. Add some Food
        world.spawnFood(new Food(new Vector3(2, 0, 5), 2));

        System.out.println("--- Snake Clash Logic Initialized ---");
        System.out.println("Player Level: " + player.getLevel());

        // Simulate a few frames
        float deltaTime = 0.1f;
        for (int i = 0; i < 100; i++) {
            world.update(deltaTime);
        }

        // Trigger a boost
        player.setBoosting(true);
        System.out.println("Boosting enabled... Level will slowly decrease while speed increases.");
    }
}
