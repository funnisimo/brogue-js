/*
 *  Combat.c
 *  Brogue
 *
 *  Created by Brian Walker on 6/11/09.
 *  Copyright 2012. All rights reserved.
 *
 *  This file is part of Brogue.
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// #include <math.h>
// #include "Rogue.h"
// #include "IncludeGlobals.h"


/* Combat rules:
 * Each combatant has an accuracy rating. This is the percentage of their attacks that will ordinarily hit;
 * higher numbers are better for them. Numbers over 100 are permitted.
 *
 * Each combatant also has a defense rating. The "hit probability" is calculated as given by this formula:
 *
 * 			hit probability = (accuracy) * 0.987 ^ (defense)
 *
 * when hit determinations are made. Negative numbers and numbers over 100 are permitted.
 * The hit is then randomly determined according to this final percentage.
 *
 * Some environmental factors can modify these numbers. An unaware, sleeping, stuck or paralyzed
 * combatant is always hit. An unaware, sleeping or paralyzed combatant also takes treble damage.
 *
 * If the hit lands, damage is calculated in the range provided. However, the clumping factor affects the
 * probability distribution. If the range is 0-10 with a clumping factor of 1, it's a uniform distribution.
 * With a clumping factor of 2, it's calculated as 2d5 (with d5 meaing a die numbered from 0 through 5).
 * With 3, it's 3d3, and so on. Note that a range not divisible by the clumping factor is defective,
 * as it will never be resolved in the top few numbers of the range. In fact, the top
 * (rangeWidth % clumpingFactor) will never succeed. Thus we increment the maximum of the first
 * (rangeWidth % clumpingFactor) die by 1, so that in fact 0-10 with a CF of 3 would be 1d4 + 2d3. Similarly,
 * 0-10 with CF 4 would be 2d3 + 2d2. By playing with the numbers, one can approximate a gaussian
 * distribution of any mean and standard deviation.
 *
 * Player combatants take their base defense value of their actual armor. Their accuracy is a combination of weapon, armor
 * and strength.
 *
 * Players have a base accuracy value of 100 throughout the game. Each point of weapon enchantment (net of
 * strength penalty/benefit) increases
 */

function fp_strengthModifier( /* item */ theItem) {
	let difference = (rogue.strength - player.weaknessAmount) - theItem.strengthRequired;
	if (difference > 0) {
		return (difference << FP_BASE) / 4;			// 0.25x
	} else {
		return (difference << FP_BASE) * 5/2;		// 2.5x
	}
}

function fp_netEnchant(/* item */ theItem) {
  let retval;
	if (theItem.category & (WEAPON | ARMOR)) {
		retval = (Math.floor(theItem.enchant1) << FP_BASE) + fp_strengthModifier(theItem);
	} else {
		retval = (Math.floor(theItem.enchant1) << FP_BASE);
	}
    // Clamp all net enchantment values to [-20, 50].
    return clamp(retval, -20 << FP_BASE, 50 << FP_BASE);
}

function fp_monsterDamageAdjustmentAmount(/* creature */ monst) {
    if (monst === player) {
        // Handled through player strength routines elsewhere.
        return FP_FACTOR;
    } else {
        return fp_damageFraction((monst.weaknessAmount << FP_BASE) * -3/2);
    }
}

function monsterDefenseAdjusted(/* creature */ monst) {
    let retval;
    if (monst === player) {
        // Weakness is already taken into account in recalculateEquipmentBonuses() for the player.
        retval = monst.info.defense;
    } else {
        retval = monst.info.defense - 25 * monst.weaknessAmount;
    }
    return max(retval, 0);
}

function monsterAccuracyAdjusted(/* creature */ monst) {
    let retval = monst.info.accuracy * fp_accuracyFraction((monst.weaknessAmount << FP_BASE) * -3/2) >> FP_BASE;
    return max(retval, 0);
}


// does NOT account for auto-hit from sleeping or unaware defenders; does account for auto-hit from
// stuck or captive defenders and from weapons of slaying.
function hitProbability(/* creature */ attacker, /* creature */ defender) {
	let accuracy = monsterAccuracyAdjusted(attacker);
	let defense = monsterDefenseAdjusted(defender);
	let probability;

	if (defender.status[STATUS_STUCK] || (defender.bookkeepingFlags & MB_CAPTIVE)) {
		return 100;
	}

  if ((defender.bookkeepingFlags & MB_SEIZED)
      && (attacker.bookkeepingFlags & MB_SEIZING))
	{
      return 100;
  }

	if (attacker === player && rogue.weapon) {
    if ((rogue.weapon.flags & ITEM_RUNIC)
        && rogue.weapon.enchant2 == W_SLAYING
        && monsterIsInClass(defender, rogue.weapon.vorpalEnemy))
		{
        return 100;
    }
		accuracy = player.info.accuracy * fp_accuracyFraction(fp_netEnchant(rogue.weapon)) >> FP_BASE;
	}

	probability = accuracy * fp_defenseFraction(defense) >> FP_BASE;

	if (probability > 100) {
		probability = 100;
	} else if (probability < 0) {
		probability = 0;
	}

	return probability;
}

function attackHit(/* creature */ attacker, /* creature */ defender) {

	// automatically hit if the monster is sleeping or captive or stuck in a web
	if (defender.status[STATUS_STUCK]
		|| defender.status[STATUS_PARALYZED]
		|| (defender.bookkeepingFlags & MB_CAPTIVE))
	{
		return true;
	}

	return rand_percent(hitProbability(attacker, defender));
}

function addMonsterToContiguousMonsterGrid(x, y, /* creature */ monst, grid /* char[DCOLS][DROWS] */) {
	let newX, newY;
  let dir;	//   enum directions
	let tempMonst;	// creature *

	grid[x][y] = true;
	for (dir=0; dir<4; dir++) {
		newX = x + nbDirs[dir][0];
		newY = y + nbDirs[dir][1];

		if (coordinatesAreInMap(newX, newY) && !grid[newX][newY]) {
			tempMonst = monsterAtLoc(newX, newY);
			if (tempMonst && monstersAreTeammates(monst, tempMonst)) {
				addMonsterToContiguousMonsterGrid(newX, newY, monst, grid);
			}
		}
	}
}


// Splits a monster in half.
// The split occurs only if there is a spot adjacent to the contiguous
// group of monsters that the monster would not avoid.
// The contiguous group is supplemented with the given (x, y) coordinates, if any;
// this is so that jellies et al. can spawn behind the player in a hallway.
async function splitMonster( /* creature */ monst, x, y) {
	let i, j, b, dir, newX, newY, eligibleLocationCount, randIndex;
	const buf = STRING(); // char[DCOLS * 3];
	const monstName = STRING(); // char[DCOLS];
	const monsterGrid = GRID(DCOLS, DROWS), eligibleGrid = GRID(DCOLS, DROWS); // char[DCOLS][DROWS];
	let clone;	// creature *

	zeroOutGrid(monsterGrid);
	zeroOutGrid(eligibleGrid);
	eligibleLocationCount = 0;

	// Add the (x, y) location to the contiguous group, if any.
	if (x > 0 && y > 0) {
		monsterGrid[x][y] = true;
	}

	// Find the contiguous group of monsters.
	addMonsterToContiguousMonsterGrid(monst.xLoc, monst.yLoc, monst, monsterGrid);

	// Find the eligible edges around the group of monsters.
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (monsterGrid[i][j]) {
				for (dir=0; dir<4; dir++) {
					newX = i + nbDirs[dir][0];
					newY = j + nbDirs[dir][1];
					if (coordinatesAreInMap(newX, newY)
						&& !eligibleGrid[newX][newY]
						&& !monsterGrid[newX][newY]
						&& !(pmap[newX][newY].flags & (HAS_PLAYER | HAS_MONSTER))
						&& !monsterAvoids(monst, newX, newY))
					{
						eligibleGrid[newX][newY] = true;
						eligibleLocationCount++;
					}
				}
			}
		}
	}
//    DEBUG {
//        hiliteCharGrid(eligibleGrid, &green, 75);
//        hiliteCharGrid(monsterGrid, &blue, 75);
//        temporaryMessage("Jelly spawn possibilities (green = eligible, blue = monster):", true);
//        displayLevel();
//    }

	// Pick a random location on the eligibleGrid and add the clone there.
	if (eligibleLocationCount) {
		randIndex = rand_range(1, eligibleLocationCount);
		for (i=0; i<DCOLS; i++) {
			for (j=0; j<DROWS; j++) {
				if (eligibleGrid[i][j] && !--randIndex) {
					// Found the spot!

					monsterName(monstName, monst, true);
					monst.currentHP = (monst.currentHP + 1) / 2;
					clone = await cloneMonster(monst, false, false);

          // Split monsters don't inherit the learnings of their parents.
          // Sorry, but self-healing jelly armies are too much.
          // Mutation effects can be inherited, however; they're not learned abilities.
          if (monst.mutationIndex >= 0) {
              clone.info.flags           &= (monsterCatalog[clone.info.monsterID].flags | mutationCatalog[monst.mutationIndex].monsterFlags);
              clone.info.abilityFlags    &= (monsterCatalog[clone.info.monsterID].abilityFlags | mutationCatalog[monst.mutationIndex].monsterAbilityFlags);
          } else {
              clone.info.flags           &= monsterCatalog[clone.info.monsterID].flags;
              clone.info.abilityFlags    &= monsterCatalog[clone.info.monsterID].abilityFlags;
          }
          for (b = 0; b < 20; b++) {
              clone.info.bolts[b] = monsterCatalog[clone.info.monsterID].bolts[b];
          }

          if (!(clone.info.flags & MONST_FLIES)
              && clone.status[STATUS_LEVITATING] == 1000)
					{
              clone.status[STATUS_LEVITATING] = 0;
          }

					clone.xLoc = i;
					clone.yLoc = j;
					pmap[i][j].flags |= HAS_MONSTER;
					clone.ticksUntilTurn = max(clone.ticksUntilTurn, 101);
					fadeInMonster(clone);
					refreshSideBar(-1, -1, false);

					if (canDirectlySeeMonster(monst)) {
						sprintf(buf, "%s splits in two!", monstName);
						message(buf, false);
					}

					return;
				}
			}
		}
	}
}

function alliedCloneCount(/* creature */ monst) {
  let count;
  let temp;	// creature *

  count = 0;
  for (temp = monsters.nextCreature; temp != NULL; temp = temp.nextCreature) {
      if (temp != monst
          && temp.info.monsterID == monst.info.monsterID
          && monstersAreTeammates(temp, monst))
			{
          count++;
      }
  }
  if (rogue.depthLevel > 0) {
      for (temp = levels[rogue.depthLevel - 2].monsters; temp != NULL; temp = temp.nextCreature) {
          if (temp != monst
              && temp.info.monsterID == monst.info.monsterID
              && monstersAreTeammates(temp, monst))
					{
              count++;
          }
      }
  }
  if (rogue.depthLevel < DEEPEST_LEVEL) {
      for (temp = levels[rogue.depthLevel].monsters; temp != NULL; temp = temp.nextCreature) {
          if (temp != monst
              && temp.info.monsterID == monst.info.monsterID
              && monstersAreTeammates(temp, monst))
					{
              count++;
          }
      }
  }
  return count;
}

// This function is called whenever one creature acts aggressively against another in a way that directly causes damage.
// This can be things like melee attacks, fire/lightning attacks or throwing a weapon.
async function moralAttack( /* creature */ attacker, /* creature */ defender) {

  if (attacker === player && canSeeMonster(defender)) {
      rogue.featRecord[FEAT_PACIFIST] = false;
      if (defender.creatureState != MONSTER_TRACKING_SCENT) {
          rogue.featRecord[FEAT_PALADIN] = false;
      }
  }

	if (defender.currentHP > 0
		&& !(defender.bookkeepingFlags & MB_IS_DYING))
	{
        if (defender.status[STATUS_PARALYZED]) {
            defender.status[STATUS_PARALYZED] = 0;
             // Paralyzed creature gets a turn to react before the attacker moves again.
            defender.ticksUntilTurn = min(attacker.attackSpeed, 100) - 1;
        }
		if (defender.status[STATUS_MAGICAL_FEAR]) {
			defender.status[STATUS_MAGICAL_FEAR] = 1;
		}
		defender.status[STATUS_ENTRANCED] = 0;

		if (attacker === player
			&& defender.creatureState == MONSTER_ALLY
			&& !defender.status[STATUS_DISCORDANT]
			&& !attacker.status[STATUS_CONFUSED]
      && !(attacker.bookkeepingFlags & MB_IS_DYING))
		{
			unAlly(defender);
		}

    if ((attacker === player || attacker.creatureState == MONSTER_ALLY)
        && defender !== player
        && defender.creatureState != MONSTER_ALLY)
		{
        alertMonster(defender); // this alerts the monster that you're nearby
    }

		if ((defender.info.abilityFlags & MA_CLONE_SELF_ON_DEFEND) && alliedCloneCount(defender) < 100) {
			if (distanceBetween(defender.xLoc, defender.yLoc, attacker.xLoc, attacker.yLoc) <= 1) {
				await splitMonster(defender, attacker.xLoc, attacker.yLoc);
			} else {
				await splitMonster(defender, 0, 0);
			}
		}
	}
}


function playerImmuneToMonster(/* creature */ monst) {
	if (monst !== player
		&& rogue.armor
		&& (rogue.armor.flags & ITEM_RUNIC)
		&& (rogue.armor.enchant2 == A_IMMUNITY)
		&& monsterIsInClass(monst, rogue.armor.vorpalEnemy))
	{
		return true;
	} else {
		return false;
	}
}

async function specialHit( /* creature */ attacker, /* creature */ defender, damage) {
	let itemCandidates, randItemIndex, stolenQuantity;
	let theItem = NULL, itemFromTopOfStack;		// item *
	const buf = STRING(), buf2 = STRING(), buf3 = STRING();

	if (!(attacker.info.abilityFlags & SPECIAL_HIT)) {
		return;
	}

	// Special hits that can affect only the player:
	if (defender === player) {
      if (playerImmuneToMonster(attacker)) {
		return;
	}

	if (attacker.info.abilityFlags & MA_HIT_DEGRADE_ARMOR
		&& defender === player
		&& rogue.armor
		&& !(rogue.armor.flags & ITEM_PROTECTED)
		&& ( Math.floor(rogue.armor.enchant1 + rogue.armor.armor/10) > -10))
	{
		rogue.armor.enchant1--;
		equipItem(rogue.armor, true);
		itemName(rogue.armor, buf2, false, false, NULL);
    sprintf(buf, "your %s weakens!", buf2);
		message(buf, itemMessageColor, false);
    checkForDisenchantment(rogue.armor);
	}

	if (attacker.info.abilityFlags & MA_HIT_HALLUCINATE) {
		if (!player.status[STATUS_HALLUCINATING]) {
			combatMessage("you begin to hallucinate", 0);
		}
		if (!player.status[STATUS_HALLUCINATING]) {
			player.maxStatus[STATUS_HALLUCINATING] = 0;
		}
		player.status[STATUS_HALLUCINATING] += 20;
		player.maxStatus[STATUS_HALLUCINATING] = max(player.maxStatus[STATUS_HALLUCINATING], player.status[STATUS_HALLUCINATING]);
	}

	if (attacker.info.abilityFlags & MA_HIT_BURN
			 && !defender.status[STATUS_IMMUNE_TO_FIRE])
 	{
			await exposeCreatureToFire(defender);
	}

	if (attacker.info.abilityFlags & MA_HIT_STEAL_FLEE
		&& !(attacker.carriedItem)
		&& (packItems.nextItem)
		&& attacker.currentHP > 0
  	&& !attacker.status[STATUS_CONFUSED] // No stealing from the player if you bump him while confused.
		&& attackHit(attacker, defender))
	{
			itemCandidates = numberOfMatchingPackItems(ALL_ITEMS, 0, (ITEM_EQUIPPED), false);
			if (itemCandidates) {
				randItemIndex = rand_range(1, itemCandidates);
				for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
					if (!(theItem.flags & (ITEM_EQUIPPED))) {
						if (randItemIndex == 1) {
							break;
						} else {
							randItemIndex--;
						}
					}
				}
				if (theItem) {
          if (theItem.category & WEAPON) { // Monkeys will steal half of a stack of weapons, and one of any other stack.
              if (theItem.quantity > 3) {
                  stolenQuantity = (theItem.quantity + 1) / 2;
              } else {
                  stolenQuantity = theItem.quantity;
              }
          } else {
              stolenQuantity = 1;
          }
					if (stolenQuantity < theItem.quantity) { // Peel off stolen item(s).
						itemFromTopOfStack = generateItem(ALL_ITEMS, -1);
						copyItem(itemFromTopOfStack, theItem); // Clone the item.
						theItem.quantity -= stolenQuantity;
						itemFromTopOfStack.quantity = stolenQuantity;
						theItem = itemFromTopOfStack; // Redirect pointer.
					} else {
						removeItemFromChain(theItem, packItems);
					}
					theItem.flags &= ~ITEM_PLAYER_AVOIDS; // Explore will seek the item out if it ends up on the floor again.
					attacker.carriedItem = theItem;
					attacker.creatureMode = MODE_PERM_FLEEING;
					attacker.creatureState = MONSTER_FLEEING;
					monsterName(buf2, attacker, true);
					itemName(theItem, buf3, false, true, NULL);
					sprintf(buf, "%s stole %s!", buf2, buf3);
					message(buf, badMessageColor, false);
				}
			}
		}
	}
	if ((attacker.info.abilityFlags & MA_POISONS)
        && damage > 0
        && !(defender.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)))
	{
        addPoison(defender, damage, 1);
	}
	if ((attacker.info.abilityFlags & MA_CAUSES_WEAKNESS)
        && damage > 0
        && !(defender.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)))
	{
		weaken(defender, 300);
	}

	if (attacker.info.abilityFlags & MA_ATTACKS_STAGGER) {
			processStaggerHit(attacker, defender);
	}

}

// function runicWeaponChance( /* item */ theItem, customEnchantLevel, enchantLevel) {
// 	const effectChances = [
// 		0.16,	// W_SPEED
// 		0.06,	// W_QUIETUS
// 		0.07,	// W_PARALYSIS
// 		0.15,	// W_MULTIPLICITY
// 		0.14,	// W_SLOWING
// 		0.11,	// W_CONFUSION
//   	0.15, // W_FORCE
// 		0,		// W_SLAYING
// 		0,		// W_MERCY
// 		0];		// W_PLENTY
// 	let rootChance, modifier;		// float
// 	let runicType = theItem.enchant2;
// 	let chance, adjustedBaseDamage;
//
// 	if (runicType === W_SLAYING) {
// 		return 0;
// 	}
// 	if (runicType >= NUMBER_GOOD_WEAPON_ENCHANT_KINDS) { // bad runic
// 		return 15;
// 	}
// 	if (!customEnchantLevel) {
// 		enchantLevel = netEnchant(theItem);
// 	}
//
// 	rootChance = effectChances[runicType] || 0;
//
// 	// Innately high-damage weapon types are less likely to trigger runic effects.
// 	adjustedBaseDamage = Math.floor((theItem.damage.lowerBound + theItem.damage.upperBound) / 2);
//
//   if (theItem.flags & ITEM_ATTACKS_HIT_SLOWLY) {
// 		adjustedBaseDamage = Math.floor(adjustedBaseDamage / 2); // Normalize as though they attacked once per turn instead of every other turn.
// 	}
// //    if (theItem.flags & ITEM_ATTACKS_QUICKLY) {
// //		adjustedBaseDamage *= 2; // Normalize as though they attacked once per turn instead of twice per turn.
// //	} // Testing disabling this for balance reasons...
//
//   modifier = 1.0 - min(0.99, (adjustedBaseDamage) / 18.0);
// 	rootChance *= modifier;
//
// 	chance = 100 - Math.floor(100 * pow(1.0 - rootChance, enchantLevel) + FLOAT_FUDGE); // good runic
//
// 	// Slow weapons get an adjusted chance of 1 - (1-p)^2 to reflect two bites at the apple instead of one.
// 	if (theItem.flags & ITEM_ATTACKS_HIT_SLOWLY) {
// 		chance = 100 - (100 - chance) * (100 - chance) / 100;
// 	}
//     // Fast weapons get an adjusted chance of 1 - sqrt(1-p) to reflect one bite at the apple instead of two.
// 	if (theItem.flags & ITEM_ATTACKS_QUICKLY) {
// 		chance = 100 * (1.0 - sqrt(1 - ((chance)/100.0)));
// 	}
//
// 	// The lowest percent change that a weapon will ever have is its enchantment level (if greater than 0).
// 	// That is so that even really heavy weapons will improve at least 1% per enchantment.
// 	chance = clamp(chance, max(1, Math.floor(enchantLevel)), 100);
//
// 	return chance;
// }



async function forceWeaponHit( /* creature */ defender, /* item */ theItem) {
	let oldLoc = [-1, -1], newLoc = [-1, -1], forceDamage;
	const buf = STRING(), buf2 = STRING(), monstName = STRING(); // char[DCOLS];
  let otherMonster = NULL;	// creature *
  let knowFirstMonsterDied = false, autoID = false;
  let theBolt;		// bolt

  monsterName(monstName, defender, true);

  oldLoc[0] = defender.xLoc;
  oldLoc[1] = defender.yLoc;
  newLoc[0] = defender.xLoc + clamp(defender.xLoc - player.xLoc, -1, 1);
  newLoc[1] = defender.yLoc + clamp(defender.yLoc - player.yLoc, -1, 1);
  if (canDirectlySeeMonster(defender)
      && !cellHasTerrainFlag(newLoc[0], newLoc[1], T_OBSTRUCTS_PASSABILITY | T_OBSTRUCTS_VISION)
      && !(pmap[newLoc[0]][newLoc[1]].flags & (HAS_MONSTER | HAS_PLAYER)))
	{
      sprintf(buf, "you launch %s backward with the force of your blow", monstName);
      // buf[DCOLS] = '\0';
      combatMessage(buf, messageColorFromVictim(defender));
      autoID = true;
  }
  theBolt = boltCatalog[BOLT_BLINKING];
  theBolt.magnitude = max(1, fp_netEnchant(theItem) >> FP_BASE);
  await zap(oldLoc, newLoc, theBolt, false);
  if (!(defender.bookkeepingFlags & MB_IS_DYING)
      && distanceBetween(oldLoc[0], oldLoc[1], defender.xLoc, defender.yLoc) > 0
      && distanceBetween(oldLoc[0], oldLoc[1], defender.xLoc, defender.yLoc) << FP_BASE < fp_weaponForceDistance(fp_netEnchant(theItem)))
	{
      if (pmap[defender.xLoc + newLoc[0] - oldLoc[0]][defender.yLoc + newLoc[1] - oldLoc[1]].flags & (HAS_MONSTER | HAS_PLAYER)) {
          otherMonster = monsterAtLoc(defender.xLoc + newLoc[0] - oldLoc[0], defender.yLoc + newLoc[1] - oldLoc[1]);
          monsterName(buf2, otherMonster, true);
      } else {
          otherMonster = NULL;
          strcpy(buf2, tileCatalog[pmap[defender.xLoc + newLoc[0] - oldLoc[0]][defender.yLoc + newLoc[1] - oldLoc[1]].layers[highestPriorityLayer(defender.xLoc + newLoc[0] - oldLoc[0], defender.yLoc + newLoc[1] - oldLoc[1], true)]].description);
      }

      forceDamage = distanceBetween(oldLoc[0], oldLoc[1], defender.xLoc, defender.yLoc);

      if (!(defender.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE))
          && await inflictDamage(NULL, defender, forceDamage, white, false))
			{
          if (canDirectlySeeMonster(defender)) {
              knowFirstMonsterDied = true;
              sprintf(buf, "%s %s on impact with %s",
                      monstName,
                      (defender.info.flags & MONST_INANIMATE) ? "is destroyed" : "dies",
                      buf2);
              // buf[DCOLS] = '\0';
              combatMessage(buf, messageColorFromVictim(defender));
              autoID = true;
          }
      } else {
          if (canDirectlySeeMonster(defender)) {
              sprintf(buf, "%s slams against %s",
                      monstName,
                      buf2);
              // buf[DCOLS] = '\0';
              combatMessage(buf, messageColorFromVictim(defender));
              autoID = true;
          }
      }
      await moralAttack(player, defender);

      if (otherMonster
          && !(defender.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE)))
			{
          if (await inflictDamage(NULL, otherMonster, forceDamage, white, false)) {
              if (canDirectlySeeMonster(otherMonster)) {
                  sprintf(buf, "%s %s%s when %s slams into $HIMHER",
                          buf2,
                          (knowFirstMonsterDied ? "also " : ""),
                          (defender.info.flags & MONST_INANIMATE) ? "is destroyed" : "dies",
                          monstName);
                  resolvePronounEscapes(buf, otherMonster);
                  // buf[DCOLS] = '\0';
                  combatMessage(buf, messageColorFromVictim(otherMonster));
                  autoID = true;
              }
          }
          if (otherMonster.creatureState != MONSTER_ALLY) {
              // Allies won't defect if you throw another monster at them, even though it hurts.
              await moralAttack(player, otherMonster);
          }
      }
  }
  return autoID;
}


async function magicWeaponHit(/* creature */ defender, /* item */ theItem, backstabbed) {
	const buf = STRING(), monstName = STRING(), theItemName = STRING(); // char[DCOLS];

	const effectColors = [white, 		black, 		yellow, 			pink, 				green, 			confusionGasColor, NULL, 		NULL, 		darkRed, rainbow];
	   								//	W_SPEED, W_QUIETUS, W_PARALYSIS, W_MULTIPLICITY, W_SLOWING, W_CONFUSION, 			W_FORCE, W_SLAYING, W_MERCY, W_PLENTY
	let chance, i;
	let enchant;	// float
	let enchantType = theItem.enchant2;		// enum weaponEnchants
	let newMonst;		// creature *
  let autoID = false;

	// If the defender is already dead, proceed only if the runic is speed or multiplicity.
	// (Everything else acts on the victim, which would literally be overkill.)
	if ((defender.bookkeepingFlags & MB_IS_DYING)
		&& theItem.enchant2 != W_SPEED
		&& theItem.enchant2 != W_MULTIPLICITY)
	{
		return;
	}

	enchant = fp_netEnchant(theItem);

	if (theItem.enchant2 == W_SLAYING) {
		chance = (monsterIsInClass(defender, theItem.vorpalEnemy) ? 100 : 0);
	} else if (defender.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)) {
      chance = 0;
  } else {
		chance = runicWeaponChance(theItem, false, 0);
		if (backstabbed && chance < 100) {
			chance = min(chance * 2, (chance + 100) / 2);
		}
  }

	if (chance > 0 && rand_percent(chance)) {
		if (!(defender.bookkeepingFlags & MB_SUBMERGED)) {
      switch (enchantType) {
		    case W_SPEED:
		        createFlare(player.xLoc, player.yLoc, SCROLL_ENCHANTMENT_LIGHT);
		        break;
		    case W_QUIETUS:
		        createFlare(defender.xLoc, defender.yLoc, QUIETUS_FLARE_LIGHT);
		        break;
		    case W_SLAYING:
		        createFlare(defender.xLoc, defender.yLoc, SLAYING_FLARE_LIGHT);
		        break;
		    default:
		        flashMonster(defender, effectColors[enchantType], 100);
		        break;
      }
			autoID = true;
		}
		rogue.disturbed = true;
		monsterName(monstName, defender, true);
		itemName(theItem, theItemName, false, false, NULL);

		switch (enchantType) {
			case W_SPEED:
				if (player.ticksUntilTurn != -1) {
					sprintf(buf, "your %s trembles and time freezes for a moment", theItemName);
					// buf[DCOLS] = '\0';
					combatMessage(buf, 0);
					player.ticksUntilTurn = -1; // free turn!
          autoID = true;
				}
				break;
			case W_SLAYING:
			case W_QUIETUS:
				await inflictLethalDamage(player, defender);
				sprintf(buf, "%s suddenly %s",
                        monstName,
                        (defender.info.flags & MONST_INANIMATE) ? "shatters" : "dies");
				// buf[DCOLS] = '\0';
				combatMessage(buf, messageColorFromVictim(defender));
        autoID = true;
				break;
			case W_PARALYSIS:
				defender.status[STATUS_PARALYZED] = max(defender.status[STATUS_PARALYZED], fp_weaponParalysisDuration(enchant));
				defender.maxStatus[STATUS_PARALYZED] = defender.status[STATUS_PARALYZED];
				if (canDirectlySeeMonster(defender)) {
					sprintf(buf, "%s is frozen in place", monstName);
					buf[DCOLS] = '\0';
					combatMessage(buf, messageColorFromVictim(defender));
                    autoID = true;
				}
				break;
			case W_MULTIPLICITY:
				sprintf(buf, "Your %s emits a flash of light, and %sspectral duplicate%s appear%s!",
						theItemName,
						(fp_weaponImageCount(enchant) == 1 ? "a " : ""),
						(fp_weaponImageCount(enchant) == 1 ? "" : "s"),
						(fp_weaponImageCount(enchant) == 1 ? "s" : ""));
				buf[DCOLS] = '\0';

				for (i = 0; i < (fp_weaponImageCount(enchant)); i++) {
					newMonst = generateMonster(MK_SPECTRAL_IMAGE, true, false);
          const loc = getQualifyingPathLocNear(defender.xLoc, defender.yLoc, true,
                                   T_DIVIDES_LEVEL & avoidedFlagsForMonster((newMonst.info)), HAS_PLAYER,
                                   avoidedFlagsForMonster((newMonst.info)), (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS), false);
					if (!loc) ERROR('Expected location');
					newMonst.xLoc = loc[0];
					newMonst.yLoc = loc[1];
					newMonst.bookkeepingFlags |= (MB_FOLLOWER | MB_BOUND_TO_LEADER | MB_DOES_NOT_TRACK_LEADER | MB_TELEPATHICALLY_REVEALED);
					newMonst.bookkeepingFlags &= ~MB_JUST_SUMMONED;
					newMonst.leader = player;
					newMonst.creatureState = MONSTER_ALLY;
					// if (theItem.flags & ITEM_ATTACKS_HIT_SLOWLY) {
					// 	newMonst.info.attackSpeed *= 2;
					// }
					if (theItem.flags & ITEM_ATTACKS_STAGGER) {
						newMonst.info.attackSpeed *= 2;
						newMonst.info.abilityFlags |= MA_ATTACKS_STAGGER;
					}
					if (theItem.flags & ITEM_ATTACKS_QUICKLY) {
						newMonst.info.attackSpeed = Math.floor(newMonst.info.attackSpeed / 2);
					}
          if (theItem.flags & ITEM_ATTACKS_PENETRATE) {
              newMonst.info.abilityFlags |= MA_ATTACKS_PENETRATE;
          }
          if (theItem.flags & ITEM_ATTACKS_ALL_ADJACENT) {
              newMonst.info.abilityFlags |= MA_ATTACKS_ALL_ADJACENT;
          }
          if (theItem.flags & ITEM_ATTACKS_EXTEND) {
              newMonst.info.abilityFlags |= MA_ATTACKS_EXTEND;
          }
					newMonst.ticksUntilTurn = 100;
					newMonst.info.accuracy = player.info.accuracy + Math.floor(5 * fp_netEnchant(theItem) >> FP_BASE);
					newMonst.info.damage = player.info.damage;
					newMonst.status[STATUS_LIFESPAN_REMAINING] = newMonst.maxStatus[STATUS_LIFESPAN_REMAINING] = fp_weaponImageDuration(enchant);
					if (strLenWithoutEscapes(theItemName) <= 8) {
						sprintf(newMonst.info.monsterName, "spectral %s", theItemName);
					} else {
						switch (rogue.weapon.kind) {
							case BROADSWORD:
								strcpy(newMonst.info.monsterName, "spectral sword");
								break;
							case HAMMER:
								strcpy(newMonst.info.monsterName, "spectral hammer");
								break;
							case PIKE:
								strcpy(newMonst.info.monsterName, "spectral pike");
								break;
							case WAR_AXE:
								strcpy(newMonst.info.monsterName, "spectral axe");
								break;
							default:
								strcpy(newMonst.info.monsterName, "spectral weapon");
								break;
						}
					}
					pmap[newMonst.xLoc][newMonst.yLoc].flags |= HAS_MONSTER;
					fadeInMonster(newMonst);
				}
        updateVision(true);

				message(buf, false);
        autoID = true;
				break;
			case W_SLOWING:
				slow(defender, fp_weaponSlowDuration(enchant));
				if (canDirectlySeeMonster(defender)) {
					sprintf(buf, "%s slows down", monstName);
					buf[DCOLS] = '\0';
					combatMessage(buf, messageColorFromVictim(defender));
          autoID = true;
				}
				break;
			case W_CONFUSION:
				defender.status[STATUS_CONFUSED] = max(defender.status[STATUS_CONFUSED], fp_weaponConfusionDuration(enchant));
				defender.maxStatus[STATUS_CONFUSED] = defender.status[STATUS_CONFUSED];
				if (canDirectlySeeMonster(defender)) {
					sprintf(buf, "%s looks very confused", monstName);
					buf[DCOLS] = '\0';
					combatMessage(buf, messageColorFromVictim(defender));
          autoID = true;
				}
				break;
			case W_FORCE:
        autoID = await forceWeaponHit(defender, theItem);
				break;
			case W_MERCY:
				heal(defender, 50, false);
        if (canSeeMonster(defender)) {
            autoID = true;
        }
				break;
			case W_PLENTY:
				newMonst = await cloneMonster(defender, true, true);
				if (newMonst) {
					flashMonster(newMonst, effectColors[enchantType], 100);
          if (canSeeMonster(newMonst)) {
              autoID = true;
          }
				}
				break;
			default:
				break;
		}
	}
  if (autoID) {
      autoIdentify(theItem);
  }
}

function attackVerb(returnString /* char[DCOLS] */, /* creature */ attacker, hitPercentile) {
	let verbCount, increment;

	if (attacker !== player && (player.status[STATUS_HALLUCINATING] || !canSeeMonster(attacker))) {
		strcpy(returnString, "hits");
		return;
	}

  if (attacker === player && !rogue.weapon) {
		strcpy(returnString, "punch");
		return;
  }

	for (verbCount = 0; verbCount < 4 && strlen(monsterText[attacker.info.monsterID].attack[verbCount + 1]); verbCount++);

	increment = Math.floor(100 / (verbCount + 1));
	hitPercentile = max(0, min(hitPercentile, Math.floor(increment * (verbCount + 1) - 1)));
	strcpy(returnString, monsterText[attacker.info.monsterID].attack[ Math.floor(hitPercentile / increment) ]);
  resolvePronounEscapes(returnString, attacker);
}

async function applyArmorRunicEffect( returnString, /* creature */ attacker, damage, melee) {
	let returnDamage = damage;
	let armorName = STRING(), attackerName = STRING(), monstName = STRING(), buf = STRING(); // char[DCOLS * 3];
	let runicKnown;
	let runicDiscovered;
	let newDamage, dir, newX, newY, count, i;
	let enchant;
	let monst, hitList = [];	// creature *, creature* [8]

	returnString.clear();

	if (!(rogue.armor && rogue.armor.flags & ITEM_RUNIC)) {
		return; // just in case
	}

	enchant = fp_netEnchant(rogue.armor);

	runicKnown = rogue.armor.flags & ITEM_RUNIC_IDENTIFIED;
	runicDiscovered = false;

	armorName = itemName(rogue.armor, false, false, NULL);

	monsterName(attackerName, attacker, true);

	switch (rogue.armor.enchant2) {
		case A_MULTIPLICITY:
			if (melee && !(attacker.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)) && rand_percent(33)) {
				for (i = 0; i < fp_armorImageCount(enchant); i++) {
					monst = await cloneMonster(attacker, false, true);
					monst.bookkeepingFlags |= (MB_FOLLOWER | MB_BOUND_TO_LEADER | MB_DOES_NOT_TRACK_LEADER | MB_TELEPATHICALLY_REVEALED);
					monst.info.flags |= MONST_DIES_IF_NEGATED;
					monst.bookkeepingFlags &= ~(MB_JUST_SUMMONED | MB_SEIZED | MB_SEIZING);
					monst.info.abilityFlags &= ~(MA_CAST_SUMMON | MA_DF_ON_DEATH); // No summoning by spectral images. Gotta draw the line!
                                                                                    // Also no exploding or infecting by spectral clones.
					monst.leader = player;
					monst.creatureState = MONSTER_ALLY;
          monst.status[STATUS_DISCORDANT] = 0; // Otherwise things can get out of control...
					monst.ticksUntilTurn = 100;
					monst.info.monsterID = MK_SPECTRAL_IMAGE;
          if (monst.carriedMonster) {
              killCreature(monst.carriedMonster, true); // Otherwise you can get infinite phoenixes from a discordant phoenix.
              monst.carriedMonster = NULL;
          }

					// Give it the glowy red light and color.
					monst.info.intrinsicLightType = SPECTRAL_IMAGE_LIGHT;
					monst.info.foreColor = spectralImageColor;

					// Temporary guest!
					monst.status[STATUS_LIFESPAN_REMAINING] = monst.maxStatus[STATUS_LIFESPAN_REMAINING] = 3;
					monst.currentHP = monst.info.maxHP = 1;
					monst.info.defense = 0;

					if (strLenWithoutEscapes(attacker.info.monsterName) <= 6) {
						sprintf(monst.info.monsterName, "spectral %s", attacker.info.monsterName);
					} else {
						strcpy(monst.info.monsterName, "spectral clone");
					}
					fadeInMonster(monst);
				}
        updateVision(true);

				runicDiscovered = true;
				sprintf(returnString, "Your %s flashes, and spectral images of %s appear!", armorName, attackerName);
			}
			break;
		case A_MUTUALITY:
			if (returnDamage > 0) {
				count = 0;
				for (i=0; i<8; i++) {
					hitList[i] = NULL;
					dir = i % 8;
					newX = player.xLoc + nbDirs[dir][0];
					newY = player.yLoc + nbDirs[dir][1];
					if (coordinatesAreInMap(newX, newY) && (pmap[newX][newY].flags & HAS_MONSTER)) {
						monst = monsterAtLoc(newX, newY);
						if (monst
							&& monst != attacker
							&& monstersAreEnemies(player, monst)
							&& !(monst.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE))
							&& !(monst.bookkeepingFlags & MB_IS_DYING))
						{
							hitList[i] = monst;
							count++;
						}
					}
				}
				if (count) {
					for (i=0; i<8; i++) {
						if (hitList[i] && !(hitList[i].bookkeepingFlags & MB_IS_DYING)) {
							monsterName(monstName, hitList[i], true);
							if (await inflictDamage(player, hitList[i], (returnDamage + count) / (count + 1), blue, true)
								&& canSeeMonster(hitList[i]))
							{
								sprintf(buf, "%s %s", monstName, ((hitList[i].info.flags & MONST_INANIMATE) ? "is destroyed" : "dies"));
								combatMessage(buf, messageColorFromVictim(hitList[i]));
							}
						}
					}
					runicDiscovered = true;
					if (!runicKnown) {
						sprintf(returnString, "Your %s pulses, and the damage is shared with %s!",
								armorName,
								(count == 1 ? monstName : "the other adjacent enemies"));
					}
					returnDamage = (returnDamage + count) / (count + 1);
				}
			}
			break;
		case A_ABSORPTION:
			returnDamage -= rand_range(0, fp_armorAbsorptionMax(enchant));
			if (returnDamage <= 0) {
				returnDamage = 0;
				runicDiscovered = true;
				if (!runicKnown) {
					sprintf(returnString, "your %s pulses and absorbs the blow!", armorName);
				}
			}
			break;
		case A_REPRISAL:
			if (melee && !(attacker.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
				newDamage = max(1, fp_armorReprisalPercent(enchant) * (returnDamage) / 100); // 5% reprisal per armor level
				if (await inflictDamage(player, attacker, newDamage, blue, true)) {
					if (canSeeMonster(attacker)) {
						sprintf(returnString, "your %s pulses and %s drops dead!", armorName, attackerName);
						runicDiscovered = true;
					}
				} else if (!runicKnown) {
					if (canSeeMonster(attacker)) {
						sprintf(returnString, "your %s pulses and %s shudders in pain!", armorName, attackerName);
						runicDiscovered = true;
					}
				}
			}
			break;
		case A_IMMUNITY:
			if (monsterIsInClass(attacker, rogue.armor.vorpalEnemy)) {
				returnDamage = 0;
				runicDiscovered = true;
			}
			break;
		case A_BURDEN:
			if (rand_percent(10)) {
				rogue.armor.strengthRequired++;
				sprintf(returnString, "your %s suddenly feels heavier!", armorName);
				equipItem(rogue.armor, true);
				runicDiscovered = true;
			}
			break;
		case A_VULNERABILITY:
			returnDamage *= 2;
			if (!runicKnown) {
				sprintf(returnString, "your %s pulses and you are wracked with pain!", armorName);
				runicDiscovered = true;
			}
			break;
    case A_IMMOLATION:
      if (rand_percent(10)) {
        sprintf(buf, "flames suddenly explode out of your %s!", armorName);
				if (!runicKnown) {
					await messageWithAck(returnString);
				}
				else {
					message(returnString);
				}
        returnString.clear();
        await spawnDungeonFeature(player.xLoc, player.yLoc, dungeonFeatureCatalog[DF_ARMOR_IMMOLATION], true, false);
        runicDiscovered = true;
      }
		default:
			break;
	}

	if (runicDiscovered && !runicKnown) {
		autoIdentify(rogue.armor);
	}

	return returnDamage;
}

function decrementWeaponAutoIDTimer() {
    const buf = STRING(), buf2 = STRING(); // char[COLS*3];

    if (rogue.weapon
        && !(rogue.weapon.flags & ITEM_IDENTIFIED)
        && !--rogue.weapon.charges)
		{
        rogue.weapon.flags |= ITEM_IDENTIFIED;
        updateIdentifiableItems();
        message("you are now familiar enough with your weapon to identify it.", itemMessageColor);
        itemName(rogue.weapon, buf2, true, true, NULL);
        sprintf(buf, "%s %s.", (rogue.weapon.quantity > 1 ? "they are" : "it is"), buf2);
        message(buf, itemMessageColor);
    }
}

function processStaggerHit(/* creature */ attacker, /* creature */ defender) {
    if ((defender.info.flags & (MONST_INVULNERABLE | MONST_IMMOBILE | MONST_INANIMATE))
        || (defender.bookkeepingFlags & MB_CAPTIVE)
        || cellHasTerrainFlag(defender.xLoc, defender.yLoc, T_OBSTRUCTS_PASSABILITY))
		{
        return;
    }
    let newX = clamp(defender.xLoc - attacker.xLoc, -1, 1) + defender.xLoc;
    let newY = clamp(defender.yLoc - attacker.yLoc, -1, 1) + defender.yLoc;
    if (coordinatesAreInMap(newX, newY)
        && !cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY)
        && !(pmap[newX][newY].flags & (HAS_MONSTER | HAS_PLAYER)))
		{
        setMonsterLocation(defender, newX, newY);
    }
}


// // returns whether the attack hit
async function attack( /* creature */ attacker, /* creature */ defender, lungeAttack)
{
	let damage, specialDamage, poisonDamage;
	const buf = STRING(), buf2 = STRING(), attackerName = STRING(), defenderName = STRING(), verb = STRING(), explicationClause = STRING(), armorRunicString = STRING();
	let sneakAttack, defenderWasAsleep, defenderWasParalyzed, degradesAttackerWeapon, sightUnseen;

  if (attacker === player && canSeeMonster(defender)) {
      rogue.featRecord[FEAT_PURE_MAGE] = false;
  }

	if (attacker.info.abilityFlags & MA_KAMIKAZE) {
		await killCreature(attacker, false);
		return true;
	}

	poisonDamage = 0;

	degradesAttackerWeapon = (defender.info.flags & MONST_DEFEND_DEGRADE_WEAPON ? true : false);

	sightUnseen = !canSeeMonster(attacker) && !canSeeMonster(defender);

	if (defender.status[STATUS_LEVITATING] && (attacker.info.flags & MONST_RESTRICTED_TO_LIQUID)) {
		return false; // aquatic or other liquid-bound monsters cannot attack flying opponents
	}

	if ((attacker === player || defender === player) && !rogue.blockCombatText) {
		rogue.disturbed = true;
	}

	defender.status[STATUS_ENTRANCED] = 0;
	if (defender.status[STATUS_MAGICAL_FEAR]) {
		defender.status[STATUS_MAGICAL_FEAR] = 1;
	}

  if (attacker === player && defender.creatureState != MONSTER_TRACKING_SCENT)
	{
      rogue.featRecord[FEAT_PALADIN] = false;
  }

	if (attacker !== player && defender === player && attacker.creatureState == MONSTER_WANDERING) {
		attacker.creatureState = MONSTER_TRACKING_SCENT;
	}

  if (defender.info.flags & MONST_INANIMATE) {
      sneakAttack = false;
      defenderWasAsleep = false;
      defenderWasParalyzed = false;
  } else {
      sneakAttack = (defender !== player && attacker === player && (defender.creatureState == MONSTER_WANDERING) ? true : false);
      defenderWasAsleep = (defender !== player && (defender.creatureState == MONSTER_SLEEPING) ? true : false);
      defenderWasParalyzed = defender.status[STATUS_PARALYZED] > 0;
  }

	monsterName(attackerName, attacker, true);
	monsterName(defenderName, defender, true);

	if ((attacker.info.abilityFlags & MA_SEIZES)
        && (!(attacker.bookkeepingFlags & MB_SEIZING) || !(defender.bookkeepingFlags & MB_SEIZED)))
	{
		attacker.bookkeepingFlags |= MB_SEIZING;
		defender.bookkeepingFlags |= MB_SEIZED;
		if (canSeeMonster(attacker) || canSeeMonster(defender)) {
			sprintf(buf, "%s seizes %s!", attackerName, (defender === player ? "your legs" : defenderName));
			message(buf, white);
		}
		return false;
	}

	if (sneakAttack || defenderWasAsleep || defenderWasParalyzed || lungeAttack || attackHit(attacker, defender)) {
		// If the attack hit:
		damage = (defender.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE)
                  ? 0 : randClump(attacker.info.damage) * fp_monsterDamageAdjustmentAmount(attacker) >> FP_BASE);

		if (sneakAttack || defenderWasAsleep || defenderWasParalyzed) {
        if (defender !== player) {
            // The non-player defender doesn't hit back this turn because it's still flat-footed.
            defender.ticksUntilTurn += max(defender.movementSpeed, defender.attackSpeed);
            if (defender.creatureState != MONSTER_ALLY) {
                defender.creatureState = MONSTER_TRACKING_SCENT; // Wake up!
            }
        }
    }
    if (sneakAttack || defenderWasAsleep || defenderWasParalyzed || lungeAttack) {
        if (attacker === player
            && rogue.weapon
            && (rogue.weapon.flags & ITEM_SNEAK_ATTACK_BONUS))
				{
            damage *= 5; // 5x damage for dagger sneak attacks.
        } else {
            damage *= 3; // Treble damage for general sneak attacks.
        }
		}

		if (defender === player && rogue.armor && (rogue.armor.flags & ITEM_RUNIC)) {
			damage = await applyArmorRunicEffect(armorRunicString, attacker, damage, true);
		}

    if (attacker === player
        && rogue.reaping
        && !(defender.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)))
		{
        specialDamage = min(damage, defender.currentHP) * rogue.reaping; // Maximum reaped damage can't exceed the victim's remaining health.
        if (rogue.reaping > 0) {
            specialDamage = rand_range(0, specialDamage);
        } else {
            specialDamage = rand_range(specialDamage, 0);
        }
        if (specialDamage) {
            rechargeItemsIncrementally(specialDamage);
        }
    }

		if (damage == 0) {
			sprintf(explicationClause, " but %s no damage", (attacker === player ? "do" : "does"));
			if (attacker === player) {
				rogue.disturbed = true;
			}
    } else if (lungeAttack) {
			strcpy(explicationClause, " with a vicious lunge attack");
		} else if (defenderWasParalyzed) {
			sprintf(explicationClause, " while $HESHE %s paralyzed", (defender === player ? "are" : "is"));
		} else if (defenderWasAsleep) {
			strcpy(explicationClause, " in $HISHER sleep");
		} else if (sneakAttack) {
			strcpy(explicationClause, ", catching $HIMHER unaware");
		} else if (defender.status[STATUS_STUCK] || defender.bookkeepingFlags & MB_CAPTIVE) {
			sprintf(explicationClause, " while %s dangle%s helplessly",
					(canSeeMonster(defender) ? "$HESHE" : "it"),
					(defender === player ? "" : "s"));
		}
		resolvePronounEscapes(explicationClause, defender);

		if ((attacker.info.abilityFlags & MA_POISONS) && damage > 0) {
			poisonDamage = damage;
			damage = 1;
		}

		if (await inflictDamage(attacker, defender, damage, red, false)) { // if the attack killed the defender
			if (defenderWasAsleep || sneakAttack || defenderWasParalyzed || lungeAttack) {
				sprintf(buf, "%s %s %s%s", attackerName,
						((defender.info.flags & MONST_INANIMATE) ? "destroyed" : "dispatched"),
						defenderName,
						explicationClause);
			} else {
				sprintf(buf, "%s %s %s%s",
						attackerName,
						((defender.info.flags & MONST_INANIMATE) ? "destroyed" : "defeated"),
						defenderName,
						explicationClause);
			}
			if (sightUnseen) {
				if (defender.info.flags & MONST_INANIMATE) {
					combatMessage("you hear something get destroyed in combat");
				} else {
					combatMessage("you hear something die in combat");
				}
			} else {
				combatMessage(buf, (damage > 0 ? messageColorFromVictim(defender) : white));
			}
			if (player === defender) {
				await gameOver(attacker.info.monsterName, false);
				return true;
			}
			else if (player === attacker && defender.info.monsterID == MK_DRAGON) {
          rogue.featRecord[FEAT_DRAGONSLAYER] = true;
      }
		} else { // if the defender survived
			if (!rogue.blockCombatText && (canSeeMonster(attacker) || canSeeMonster(defender))) {
				attackVerb(verb, attacker, max(damage - attacker.info.damage.lowerBound * fp_monsterDamageAdjustmentAmount(attacker) >> FP_BASE, 0) * 100
						   / max(1, (attacker.info.damage.upperBound - attacker.info.damage.lowerBound) * fp_monsterDamageAdjustmentAmount(attacker) >> FP_BASE));
				sprintf(buf, "%s %s %s%s", attackerName, verb, defenderName, explicationClause);
				if (sightUnseen) {
					if (!rogue.heardCombatThisTurn) {
						rogue.heardCombatThisTurn = true;
						combatMessage("you hear combat in the distance");
					}
				} else {
					combatMessage(buf, messageColorFromVictim(defender));
				}
			}
			if (attacker === player && rogue.weapon && (rogue.weapon.flags & ITEM_ATTACKS_STAGGER)) {
				processStaggerHit(attacker, defender);
		 	}
			if (attacker.info.abilityFlags & SPECIAL_HIT) {
				specialHit(attacker, defender, (attacker.info.abilityFlags & MA_POISONS) ? poisonDamage : damage);
			}
			if (strlen(armorRunicString)) {
				message(armorRunicString);
				if (rogue.armor && (rogue.armor.flags & ITEM_RUNIC) && rogue.armor.enchant2 == A_BURDEN) {
					strengthCheck(rogue.armor);
				}
			}
		}

		await moralAttack(attacker, defender);

		if (attacker === player && rogue.weapon && (rogue.weapon.flags & ITEM_RUNIC)) {
			await magicWeaponHit(defender, rogue.weapon, sneakAttack || defenderWasAsleep || defenderWasParalyzed);
		}

    if (attacker === player
        && (defender.bookkeepingFlags & MB_IS_DYING)
        && (defender.bookkeepingFlags & MB_HAS_SOUL))
		{
        decrementWeaponAutoIDTimer();
    }

		if (degradesAttackerWeapon
			&& attacker === player
			&& rogue.weapon
			&& !(rogue.weapon.flags & ITEM_PROTECTED)
				// Can't damage a Weapon of Acid Mound Slaying by attacking an acid mound... just ain't right!
			&& !((rogue.weapon.flags & ITEM_RUNIC) && rogue.weapon.enchant2 == W_SLAYING && monsterIsInClass(defender, rogue.weapon.vorpalEnemy))
			&& rogue.weapon.enchant1 >= -10)
		{
			rogue.weapon.enchant1--;
      if (rogue.weapon.quiverNumber) {
          rogue.weapon.quiverNumber = rand_range(1, 60000);
      }
			equipItem(rogue.weapon, true);
			itemName(rogue.weapon, buf2, false, false, NULL);
			sprintf(buf, "your %s weakens!", buf2);
			message(buf, itemMessageColor);
      checkForDisenchantment(rogue.weapon);
		}
		return true;
	} else { // if the attack missed
		if (!rogue.blockCombatText) {
			if (sightUnseen) {
				if (!rogue.heardCombatThisTurn) {
					rogue.heardCombatThisTurn = true;
					combatMessage("you hear combat in the distance");
				}
			} else {
				sprintf(buf, "%s missed %s", attackerName, defenderName);
				combatMessage(buf);
			}
		}
		return false;
	}
}



// Gets the length of a string without the color escape sequences, since those aren't displayed.
function strLenWithoutEscapes(text) {
	text = STRING(text);
	return text.textLength;
}


function combatMessage(theMsg, /* color */ theColor) {
	const newMsg = STRING(); // char[COLS * 2];

	if (!theColor) {
		theColor = white;
	}

	// newMsg[0] = '\0';
	encodeMessageColor(newMsg, 0, theColor);
	strcat(newMsg, theMsg);

	if (strLenWithoutEscapes(combatText) + strLenWithoutEscapes(newMsg) + 3 > DCOLS) {
		// the "3" is for the semicolon, space and period that get added to conjoined combat texts.
		displayCombatText();
	}

	if ( strlen(combatText) ) {
    strcat(combatText, "; ");
    strcat(combatText, newMsg);
	} else {
		strcpy(combatText, newMsg);
	}
}

function displayCombatText() {
	const buf = STRING();
	if ( strlen(combatText) ) {
		sprintf(buf, "%s.", combatText);
		combatText.clear();
		message(buf /* , rogue.cautiousMode */);	// NO ACK
		rogue.cautiousMode = false;
	}
}

function flashMonster( /* creature */ monst, /* color */ theColor, strength) {
    if (!theColor) {
        return;
    }
	if (!(monst.bookkeepingFlags & MB_WILL_FLASH) || monst.flashStrength < strength) {
		monst.bookkeepingFlags |= MB_WILL_FLASH;
		monst.flashStrength = strength;
		monst.flashColor.copy(theColor);
		rogue.creaturesWillFlashThisTurn = true;
	}
}


function canAbsorb( /* creature */ ally, ourBolts /* boolean[NUMBER_BOLT_KINDS] */, /* creature */ prey, grid) {
  let i;

	if (ally.creatureState == MONSTER_ALLY
        && ally.newPowerCount > 0
        && (ally.targetCorpseLoc[0] <= 0)
        && !((ally.info.flags | prey.info.flags) & (MONST_INANIMATE | MONST_IMMOBILE))
        && !monsterAvoids(ally, prey.xLoc, prey.yLoc)
        && grid[ally.xLoc][ally.yLoc] <= 10)
	{
        if (~(ally.info.abilityFlags) & prey.info.abilityFlags & LEARNABLE_ABILITIES) {
            return true;
        } else if (~(ally.info.flags) & prey.info.flags & LEARNABLE_BEHAVIORS) {
            return true;
        } else {
            for (i = 0; i < NUMBER_BOLT_KINDS; i++) {
                ourBolts[i] = false;
            }
            for (i = 0; ally.info.bolts[i] != BOLT_NONE; i++) {
                ourBolts[ally.info.bolts[i]] = true;
            }

            for (i=0; prey.info.bolts[i] != BOLT_NONE; i++) {
                if (!(boltCatalog[prey.info.bolts[i]].flags & BF_NOT_LEARNABLE)
                    && !ourBolts[prey.info.bolts[i]])
								{
                    return true;
                }
            }
        }
    }
    return false;
}

function anyoneWantABite(/* creature */ decedent) {
	let candidates, randIndex, i;
	let grid;
	let ally;	// creature *
  let success = false;
  let ourBolts = [false]; // boolean[NUMBER_BOLT_KINDS];

	candidates = 0;
	if ((!(decedent.info.abilityFlags & LEARNABLE_ABILITIES)
		 && !(decedent.info.flags & LEARNABLE_BEHAVIORS)
         && decedent.info.bolts[0] == BOLT_NONE)
		|| (cellHasTerrainFlag(decedent.xLoc, decedent.yLoc, T_PATHING_BLOCKER))
		|| (decedent.info.flags & (MONST_INANIMATE | MONST_IMMOBILE)))
	{
		return false;
	}

	grid = allocGrid();
	fillGrid(grid, 0);
	calculateDistances(grid, decedent.xLoc, decedent.yLoc, T_PATHING_BLOCKER, NULL, true, true);
	for (ally = monsters.nextCreature; ally != NULL; ally = ally.nextCreature) {
		if (canAbsorb(ally, ourBolts, decedent, grid)) {
			candidates++;
		}
	}
	if (candidates > 0) {
		randIndex = rand_range(1, candidates);
		for (ally = monsters.nextCreature; ally != NULL; ally = ally.nextCreature) {
			// CanAbsorb() populates ourBolts if it returns true and there are no learnable behaviors or flags:
			if (canAbsorb(ally, ourBolts, decedent, grid) && !--randIndex) {
				break;
			}
		}
		if (ally) {
			ally.targetCorpseLoc[0] = decedent.xLoc;
			ally.targetCorpseLoc[1] = decedent.yLoc;
			strcpy(ally.targetCorpseName, decedent.info.monsterName);
			ally.corpseAbsorptionCounter = 20; // 20 turns to get there and start eating before he loses interest

			// Choose a superpower.
      // First, select from among learnable ability or behavior flags, if one is available.
			candidates = 0;
			for (i=0; i<32; i++) {
				if (Fl(i) & ~(ally.info.abilityFlags) & decedent.info.abilityFlags & LEARNABLE_ABILITIES) {
					candidates++;
				}
			}
			for (i=0; i<32; i++) {
				if (Fl(i) & ~(ally.info.flags) & decedent.info.flags & LEARNABLE_BEHAVIORS) {
					candidates++;
				}
			}
			if (candidates > 0) {
				randIndex = rand_range(1, candidates);
				for (i=0; i<32; i++) {
					if ((Fl(i) & ~(ally.info.abilityFlags) & decedent.info.abilityFlags & LEARNABLE_ABILITIES)
						&& !--randIndex)
					{
						ally.absorptionFlags = Fl(i);
						ally.absorbBehavior = false;
						success = true;
            break;
					}
				}
				for (i=0; i<32 && !success; i++) {
					if ((Fl(i) & ~(ally.info.flags) & decedent.info.flags & LEARNABLE_BEHAVIORS)
						&& !--randIndex)
					{
						ally.absorptionFlags = Fl(i);
						ally.absorbBehavior = true;
						success = true;
            break;
					}
				}
			} else if (decedent.info.bolts[0] != BOLT_NONE) {
          // If there are no learnable ability or behavior flags, pick a learnable bolt.
          candidates = 0;
          for (i=0; decedent.info.bolts[i] != BOLT_NONE; i++) {
              if (!(boltCatalog[decedent.info.bolts[i]].flags & BF_NOT_LEARNABLE)
                  && !ourBolts[decedent.info.bolts[i]])
							{
                  candidates++;
              }
          }
          if (candidates > 0) {
              randIndex = rand_range(1, candidates);
              for (i=0; decedent.info.bolts[i] != BOLT_NONE; i++) {
                  if (!(boltCatalog[decedent.info.bolts[i]].flags & BF_NOT_LEARNABLE)
                      && !ourBolts[decedent.info.bolts[i]]
                      && !--randIndex)
									{
                      ally.absorptionBolt = decedent.info.bolts[i];
                      success = true;
                      break;
                  }
              }
          }
      }
		}
	}
	freeGrid(grid);
	return success;
}

const MIN_FLASH_STRENGTH	= 50;

async function inflictLethalDamage(/* creature */ attacker, /* creature */ defender) {
    return await inflictDamage(attacker, defender, defender.currentHP, NULL, true);
}

// returns true if this was a killing stroke; does NOT free the pointer, but DOES remove it from the monster chain
// flashColor indicates the color that the damage will cause the creature to flash
async function inflictDamage( /* creature */ attacker, /* creature */ defender,
                      damage, /* color */ flashColor, ignoresProtectionShield)
{
	let killed = false;
	let theBlood;	// dungeonFeature
  let transferenceAmount;

	if (damage == 0
        || (defender.info.flags & MONST_INVULNERABLE))
	{
		return false;
	}

	if (!ignoresProtectionShield
        && defender.status[STATUS_SHIELDED])
	{
		if (defender.status[STATUS_SHIELDED] > damage * 10) {
			defender.status[STATUS_SHIELDED] -= damage * 10;
			damage = 0;
		} else {
			damage -= (defender.status[STATUS_SHIELDED] + 9) / 10;
			defender.status[STATUS_SHIELDED] = defender.maxStatus[STATUS_SHIELDED] = 0;
		}
	}

	defender.bookkeepingFlags &= ~MB_ABSORBING; // Stop eating a corpse if you are getting hurt.

	// bleed all over the place, proportionately to damage inflicted:
	if (damage > 0 && defender.info.bloodType) {
		theBlood = dungeonFeatureCatalog[defender.info.bloodType];
		theBlood.startProbability = (theBlood.startProbability * (15 + min(damage, defender.currentHP) * 3 / 2) / 100);
		if (theBlood.layer == GAS) {
			theBlood.startProbability *= 100;
		}
		await spawnDungeonFeature(defender.xLoc, defender.yLoc, theBlood, true, false);
	}

	if (defender !== player && defender.creatureState == MONSTER_SLEEPING) {
		wakeUp(defender);
	}

	if (defender === player
        && rogue.easyMode
        && damage > 0)
	{
		damage = max(1, damage/5);
	}

    if (((attacker === player && rogue.transference) || (attacker && attacker !== player && (attacker.info.abilityFlags & MA_TRANSFERENCE)))
        && !(defender.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)))
		{
        transferenceAmount = min(damage, defender.currentHP); // Maximum transferred damage can't exceed the victim's remaining health.

        if (attacker === player) {
            transferenceAmount = transferenceAmount * rogue.transference / 20;
            if (transferenceAmount == 0) {
                transferenceAmount = ((rogue.transference > 0) ? 1 : -1);
            }
        } else if (attacker.creatureState == MONSTER_ALLY) {
            transferenceAmount = transferenceAmount * 4 / 10; // allies get 40% recovery rate
        } else {
            transferenceAmount = transferenceAmount * 9 / 10; // enemies get 90% recovery rate, deal with it
        }

        attacker.currentHP += transferenceAmount;

        if (attacker === player && player.currentHP <= 0) {
            await gameOver("Drained by a cursed ring", true);
            return false;
        }
    }

	if (defender.currentHP <= damage) { // killed
		await killCreature(defender, false);
		anyoneWantABite(defender);
		killed = true;
	} else { // survived
		if (damage < 0 && defender.currentHP - damage > defender.info.maxHP) {
			defender.currentHP = max(defender.currentHP, defender.info.maxHP);
		} else {
			defender.currentHP -= damage; // inflict the damage!
      if (defender === player && damage > 0) {
          rogue.featRecord[FEAT_INDOMITABLE] = false;
      }
		}

		if (defender !== player && defender.creatureState != MONSTER_ALLY
			&& defender.info.flags & MONST_FLEES_NEAR_DEATH
			&& defender.info.maxHP / 4 >= defender.currentHP)
		{
			defender.creatureState = MONSTER_FLEEING;
		}
		if (flashColor && damage > 0) {
			flashMonster(defender, flashColor, MIN_FLASH_STRENGTH + (100 - MIN_FLASH_STRENGTH) * damage / defender.info.maxHP);
		}
	}

	refreshSideBar(-1, -1, false);
	return killed;
}

function addPoison( /* creature */ monst, durationIncrement, concentrationIncrement) {
    if (durationIncrement > 0) {
        if (monst === player && !player.status[STATUS_POISONED]) {
            combatMessage("scalding poison fills your veins", badMessageColor);
        }
        if (!monst.status[STATUS_POISONED]) {
            monst.maxStatus[STATUS_POISONED] = 0;
        }
        monst.poisonAmount += concentrationIncrement;
        if (monst.poisonAmount == 0) {
            monst.poisonAmount = 1;
        }
        monst.status[STATUS_POISONED] += durationIncrement;
        monst.maxStatus[STATUS_POISONED] = monst.info.maxHP / monst.poisonAmount;

        if (canSeeMonster(monst)) {
            flashMonster(monst, poisonColor, 100);
        }
    }
}


// Removes the decedent from the screen and from the monster chain; inserts it into the graveyard chain; does NOT free the memory.
// Or, if the decedent is a player ally at the moment of death, insert it into the purgatory chain for possible future resurrection.
// Use "administrativeDeath" if the monster is being deleted for administrative purposes, as opposed to dying as a result of physical actions.
// AdministrativeDeath means the monster simply disappears, with no messages, dropped item, DFs or other effect.
async function killCreature( /* creature */ decedent, administrativeDeath) {
	let x, y;
	const monstName = STRING(), buf = STRING(); // char[DCOLS];

	if (decedent.bookkeepingFlags & MB_IS_DYING) {
		// monster has already been killed; let's avoid overkill
		return;
	}

  if (decedent !== player) {
    decedent.bookkeepingFlags |= MB_IS_DYING;
  }

	if (rogue.lastTarget === decedent) {
		rogue.lastTarget = NULL;
	}
  if (rogue.yendorWarden === decedent) {
      rogue.yendorWarden = NULL;
  }

	if (decedent.carriedItem) {
		if (administrativeDeath) {
			deleteItem(decedent.carriedItem);
			decedent.carriedItem = NULL;
		} else {
			await makeMonsterDropItem(decedent);
		}
	}

	if (!administrativeDeath && (decedent.info.abilityFlags & MA_DF_ON_DEATH)) {
		await spawnDungeonFeature(decedent.xLoc, decedent.yLoc, dungeonFeatureCatalog[decedent.info.DFType], true, false);

		if (monsterText[decedent.info.monsterID].DFMessage[0] && canSeeMonster(decedent)) {
			monsterName(monstName, decedent, true);
			sprintf(buf, "%s %s", monstName, monsterText[decedent.info.monsterID].DFMessage);
			resolvePronounEscapes(buf, decedent);
			message(buf, false);
		}
	}

	if (decedent === player) { // the player died
		// game over handled elsewhere
	} else {
		if (!administrativeDeath
			&& decedent.creatureState == MONSTER_ALLY
			&& !canSeeMonster(decedent)
			&& !(decedent.info.flags & MONST_INANIMATE)
			&& !(decedent.bookkeepingFlags & MB_BOUND_TO_LEADER)
			&& !decedent.carriedMonster)
		{
			message("you feel a sense of loss.", badMessageColor, false);
		}
		x = decedent.xLoc;
		y = decedent.yLoc;
		if (decedent.bookkeepingFlags & MB_IS_DORMANT) {
			pmap[x][y].flags &= ~HAS_DORMANT_MONSTER;
		} else {
			pmap[x][y].flags &= ~HAS_MONSTER;
		}
		removeMonsterFromChain(decedent, dormantMonsters);
		removeMonsterFromChain(decedent, monsters);

    if (decedent.leader === player
        && !(decedent.info.flags & MONST_INANIMATE)
        && (decedent.bookkeepingFlags & MB_HAS_SOUL)
        && !administrativeDeath)
		{
        decedent.nextCreature = purgatory.nextCreature;
        purgatory.nextCreature = decedent;
    } else {
        decedent.nextCreature = graveyard.nextCreature;
        graveyard.nextCreature = decedent;
    }

		if (!administrativeDeath && !(decedent.bookkeepingFlags & MB_IS_DORMANT)) {
			// Was there another monster inside?
			if (decedent.carriedMonster) {
				// Insert it into the chain.
				decedent.carriedMonster.nextCreature = monsters.nextCreature;
				monsters.nextCreature = decedent.carriedMonster;
				decedent.carriedMonster.xLoc = x;
				decedent.carriedMonster.yLoc = y;
				decedent.carriedMonster.ticksUntilTurn = 200;
				pmap[x][y].flags |= HAS_MONSTER;
				fadeInMonster(decedent.carriedMonster);

				if (canSeeMonster(decedent.carriedMonster)) {
					monsterName(monstName, decedent.carriedMonster, true);
					sprintf(buf, "%s appears", monstName);
					combatMessage(buf, NULL);
				}

				await applyInstantTileEffectsToCreature(decedent.carriedMonster);
				decedent.carriedMonster = NULL;
			}
			refreshDungeonCell(x, y);
		}
	}
	decedent.currentHP = 0;
	demoteMonsterFromLeadership(decedent);
  if (decedent.leader) {
      checkForContinuedLeadership(decedent.leader);
  }
}


function buildHitList(/* creature **/ hitList,
		/* creature */ attacker, /* creature */ defender, /* penetrate, */ sweep)
{
  let i, x, y, newX, newY, newestX, newestY;
  let dir, newDir;	// enum directions

  x = attacker.xLoc;
  y = attacker.yLoc;
  newX = defender.xLoc;
  newY = defender.yLoc;

  dir = NO_DIRECTION;
  for (i = 0; i < DIRECTION_COUNT; i++) {
      if (nbDirs[i][0] == newX - x
          && nbDirs[i][1] == newY - y)
			{
          dir = i;
          break;
      }
  }
	//
  // if (penetrate && dir != NO_DIRECTION) {
  //     hitList[0] = defender;
  //     newestX = newX + nbDirs[dir][0];
  //     newestY = newY + nbDirs[dir][1];
  //     if (coordinatesAreInMap(newestX, newestY) && (pmap[newestX][newestY].flags & HAS_MONSTER)) {
  //         defender = monsterAtLoc(newestX, newestY);
  //         if (defender
  //             && monsterWillAttackTarget(attacker, defender)
  //             && (!cellHasTerrainFlag(defender.xLoc, defender.yLoc, T_OBSTRUCTS_PASSABILITY) || (defender.info.flags & MONST_ATTACKABLE_THRU_WALLS)))
	// 				{
  //             // NOTE: Attack the outermost monster first, so that spears of force can potentially send both of them flying.
  //             hitList[1] = hitList[0];
  //             hitList[0] = defender;
  //         }
  //     }
  // } else
	if (sweep) {
      if (dir == NO_DIRECTION) {
          dir = UP; // Just pick one.
      }
      for (i=0; i<8; i++) {
          newDir = (dir + i) % DIRECTION_COUNT;
          newestX = x + cDirs[newDir][0];
          newestY = y + cDirs[newDir][1];
          if (coordinatesAreInMap(newestX, newestY) && (pmap[newestX][newestY].flags & (HAS_MONSTER | HAS_PLAYER))) {
              defender = monsterAtLoc(newestX, newestY);
              if (defender
                  && monsterWillAttackTarget(attacker, defender)
                  && (!cellHasTerrainFlag(defender.xLoc, defender.yLoc, T_OBSTRUCTS_PASSABILITY) || (defender.info.flags & MONST_ATTACKABLE_THRU_WALLS)))
							{
                  hitList[i] = defender;
              }
          }
      }
  } else {
      hitList[0] = defender;
  }
}

// // Basically runs a simplified deterministic melee combat simulation against a hypothetical
// // monster with infinite HP (the dummy) and returns the amount of damage the tested
// // monster deals before succumbing. Takes into account various environmental factors
// // (e.g. current status effects).
// function monsterPower( /*creature */ theMonst) {
// 	const damageDealt = [0, 0]; // short[2] = {0, 0};
// 	const statuses = []; // short[NUMBER_OF_STATUS_EFFECTS];
// 	const ticksTillTurn = [0, 0];
// 	let speed;
// 	let i, k;
// 	const damagePerHit = [0, 0];
// 	const hitChance = [0, 0];
//
// 	// [0] is the tested monster and [1] is the dummy.
// 	// damageDealt measures how much damage each contestant has inflicted.
//
// 	for (i=0; i<NUMBER_OF_STATUS_EFFECTS; i++) {
// 		statuses[i] = theMonst.status[i];
// 	}
//
// 	damagePerHit[0] = (theMonst.info.damage.lowerBound + theMonst.info.damage.upperBound) * monsterDamageAdjustmentAmount(theMonst) / 2;
// 	damagePerHit[1] = 10;
// 	hitChance[0] = monsterAccuracyAdjusted(theMonst) * pow(DEFENSE_FACTOR, 100); // Assumes the dummy has 100 armor.
// 	hitChance[1] = monsterAccuracyAdjusted(theMonst) * pow(DEFENSE_FACTOR, theMonst.info.defense);
//
// 	while (damageDealt[1] < theMonst.currentHP) { // Loop until the dummy kills the monster in the simulation.
// 		for (k=0; k<=1; k++) { // k is whose turn it is
//
// 			if (k==0) { // monster
// 				speed = theMonst.info.attackSpeed;
// 				if (statuses[STATUS_POISONED]) {
// 					damageDealt[1] += theMonst.poisonAmount; // dummy gets credit for poison
// 				}
// 				if (statuses[STATUS_HASTED]) {
// 					speed /= 2;
// 				}
// 				if (statuses[STATUS_SLOWED]) {
// 					speed *= 2;
// 				}
// 				for (i=0; i<NUMBER_OF_STATUS_EFFECTS; i++) {
// 					if (statuses[i] > 0) {
// 						statuses[i]--;
// 					}
// 				}
// 			}
//
// 			while (ticksTillTurn[k] <= 0) {
// 				if (k == 1 || !statuses[STATUS_PARALYZED]) {
// 					damageDealt[k] += damagePerHit[k] * hitChance[k];
// 				}
// 				ticksTillTurn[k] += k ? 100 : speed;
// 			}
// 			ticksTillTurn[k] -= 100;
// 		}
// 	}
//
// 	return Math.floor(damageDealt[0]);
// }
