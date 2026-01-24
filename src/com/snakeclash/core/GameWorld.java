package com.snakeclash.core;

import com.snakeclash.entities.EnemyBot;
import com.snakeclash.entities.PlayerSnake;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * Game logic orchestrator. Handles collisions and object management.
 */
public class GameWorld {
    private PlayerSnake player;
    private List<EnemyBot> bots = new ArrayList<>();
    private List<Food> foods = new ArrayList<>();

    private float collisionRadius = 1.0f;

    public void update(float deltaTime) {
        // Update Player
        player.update(deltaTime);

        // Update Bots
        for (EnemyBot bot : bots) {
            bot.think(foods, 4.0f, deltaTime); // Simple automated thinking
            bot.update(deltaTime);
        }

        checkCollisions();
    }

    private void checkCollisions() {
        // 1. Player vs Food
        Iterator<Food> foodIter = foods.iterator();
        while (foodIter.hasNext()) {
            Food f = foodIter.next();
            if (player.getPosition().distanceTo(f.getPosition()) < collisionRadius) {
                player.addLevel(f.getValue());
                foodIter.remove();
            }
        }

        // 2. Player vs Enemy (Level-Based Collision)
        Iterator<EnemyBot> botIter = bots.iterator();
        while (botIter.hasNext()) {
            EnemyBot bot = botIter.next();
            if (player.getPosition().distanceTo(bot.getPosition()) < collisionRadius) {
                if (player.getLevel() >= bot.getLevel()) {
                    // Player consumes enemy
                    player.addLevel(bot.getLevel());
                    // Convert enemy to food logic could be added here
                    botIter.remove();
                    System.out.println("Enemy Destroyed! Player Level Up.");
                } else {
                    // Player dies
                    System.out.println("Game Over! Player eaten by Level " + bot.getLevel() + " enemy.");
                    // Reset game or handle death
                }
            }
        }
    }

    // Initialization methods
    public void setPlayer(PlayerSnake p) { this.player = p; }
    public void addBot(EnemyBot b) { this.bots.add(b); }
    public void spawnFood(Food f) { this.foods.add(f); }
}
