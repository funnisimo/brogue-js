/*
 *  Time.c
 *  Brogue
 *
 *  Created by Brian Walker on 6/21/13.
 *  Copyright 2013. All rights reserved.
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

// #include "Rogue.h"
// #include "IncludeGlobals.h"
// #include <math.h>

function exposeCreatureToFire( /* creature */ monst) {
	const buf = STRING(), buf2 = STRING(); // char[COLS];
	if ( (monst.bookkeepingFlags & MB_IS_DYING)
		|| monst.status[STATUS_IMMUNE_TO_FIRE]
    || (monst.info.flags & MONST_INVULNERABLE)
		|| (monst.bookkeepingFlags & MB_SUBMERGED)
		|| ((!monst.status[STATUS_LEVITATING]) && cellHasTMFlag(monst.xLoc, monst.yLoc, TM_EXTINGUISHES_FIRE)))
  {
		return;
	}
	if (monst.status[STATUS_BURNING] == 0) {
		if (monst === player) {
			rogue.minersLight.lightColor = fireForeColor;
			player.info.foreColor = torchLightColor;
			refreshDungeonCell(player.xLoc, player.yLoc);
			//updateVision(); // this screws up the firebolt visual effect by erasing it while a message is displayed
			combatMessage("you catch fire!", badMessageColor);
		} else if (canDirectlySeeMonster(monst)) {
			monsterName(buf, monst, true);
			sprintf(buf2, "%s catches fire!", buf);
			combatMessage(buf2, messageColorFromVictim(monst));
		}
	}
	monst.status[STATUS_BURNING] = monst.maxStatus[STATUS_BURNING] = max(monst.status[STATUS_BURNING], 7);
}

function updateFlavorText() {
	const buf = STRING(); // char[DCOLS * 3];

	if (rogue.disturbed && !rogue.gameHasEnded) {
    if (rogue.armor
        && (rogue.armor.flags & ITEM_RUNIC)
        && rogue.armor.enchant2 == A_RESPIRATION
        && tileCatalog[pmap[player.xLoc][player.yLoc].layers[highestPriorityLayer(player.xLoc, player.yLoc, false)]].flags & T_RESPIRATION_IMMUNITIES)
		{
        flavorMessage("A pocket of cool, clean air swirls around you.");
		} else if (player.status[STATUS_LEVITATING]) {
			describeLocation(buf, player.xLoc, player.yLoc);
			flavorMessage(buf);
		} else {
			flavorMessage(tileFlavor(player.xLoc, player.yLoc));
		}
	}
}


function updatePlayerUnderwaterness() {
    if (rogue.inWater) {
        if (!cellHasTerrainFlag(player.xLoc, player.yLoc, T_IS_DEEP_WATER) || player.status[STATUS_LEVITATING]
            || cellHasTerrainFlag(player.xLoc, player.yLoc, (T_ENTANGLES | T_OBSTRUCTS_PASSABILITY)))
				{
            rogue.inWater = false;
            updateMinersLightRadius();
            updateVision(true);
            displayLevel();
        }
    } else {
        if (cellHasTerrainFlag(player.xLoc, player.yLoc, T_IS_DEEP_WATER) && !player.status[STATUS_LEVITATING]
            && !cellHasTerrainFlag(player.xLoc, player.yLoc, (T_ENTANGLES | T_OBSTRUCTS_PASSABILITY)))
				{
            rogue.inWater = true;
            updateMinersLightRadius();
            updateVision(true);
            displayLevel();
        }
    }
}


function monsterShouldFall(/* creature */ monst) {
	return (!(monst.status[STATUS_LEVITATING])
			&& cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_AUTO_DESCENT)
			&& !cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_ENTANGLES | T_OBSTRUCTS_PASSABILITY)
			&& !(monst.bookkeepingFlags & MB_PREPLACED));
}


// Called at least every 100 ticks; may be called more frequently.
async function applyInstantTileEffectsToCreature( /* creature */ monst) {
	const buf = STRING(), buf2 = STRING(); // char[COLS];
	let x = monst.xLoc, y = monst.yLoc, damage;
	let layer;		// enum dungeonLayers
	let theItem;	// item *

	if (monst.bookkeepingFlags & MB_IS_DYING) {
		return; // the monster is already dead.
	}

	if (monst === player) {
		if (!player.status[STATUS_LEVITATING]) {
			pmap[x][y].flags |= KNOWN_TO_BE_TRAP_FREE;
		}
	} else if (!player.status[STATUS_HALLUCINATING]
			   && !monst.status[STATUS_LEVITATING]
			   && canSeeMonster(monst)
			   && !(cellHasTerrainFlag(x, y, T_IS_DF_TRAP)))
  {
		pmap[x][y].flags |= KNOWN_TO_BE_TRAP_FREE;
	}

	// You will discover the secrets of any tile you stand on.
	if (monst === player
		&& !(monst.status[STATUS_LEVITATING])
		&& cellHasTMFlag(x, y, TM_IS_SECRET)
		&& playerCanSee(x, y))
	{
		discover(x, y);
	}

	// Submerged monsters in terrain that doesn't permit submersion should immediately surface.
	if ((monst.bookkeepingFlags & MB_SUBMERGED) && !cellHasTMFlag(x, y, TM_ALLOWS_SUBMERGING)) {
			monst.bookkeepingFlags &= ~MB_SUBMERGED;
	}

	// Visual effect for submersion in water.
	if (monst === player) {
    updatePlayerUnderwaterness();
	}

  // Obstructed krakens can't seize their prey.
  if ((monst.bookkeepingFlags & MB_SEIZING)
      && (cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY))
      && !(monst.info.flags & MONST_ATTACKABLE_THRU_WALLS))
  {
      monst.bookkeepingFlags &= ~MB_SEIZING;
  }

	// Creatures plunge into chasms and through trap doors.
	if (monsterShouldFall(monst)) {
			if (monst === player) {
					// player falling takes place at the end of the turn
					if (!(monst.bookkeepingFlags & MB_IS_FALLING)) {
							monst.bookkeepingFlags |= MB_IS_FALLING;
					}
					return;
			} else { // it's a monster
					monst.bookkeepingFlags |= MB_IS_FALLING; // handled at end of turn
			}
	}

	// lava
	if (!(monst.status[STATUS_LEVITATING])
		&& !(monst.status[STATUS_IMMUNE_TO_FIRE])
        && !(monst.info.flags & MONST_INVULNERABLE)
		&& !cellHasTerrainFlag(x, y, (T_ENTANGLES | T_OBSTRUCTS_PASSABILITY))
	  && !cellHasTMFlag(x, y, TM_EXTINGUISHES_FIRE)
		&& cellHasTerrainFlag(x, y, T_LAVA_INSTA_DEATH))
  {
		if (monst === player) {
			sprintf(buf, "you plunge into %s!",
					tileCatalog[pmap[x][y].layers[layerWithFlag(x, y, T_LAVA_INSTA_DEATH)]].description);
			await messageWithAck(buf);
			sprintf(buf, "Killed by %s",
					tileCatalog[pmap[x][y].layers[layerWithFlag(x, y, T_LAVA_INSTA_DEATH)]].description);
			await gameOver(buf, true);
			return;
		} else { // it's a monster
			if (canSeeMonster(monst)) {
				monsterName(buf, monst, true);
				sprintf(buf2, "%s is consumed by the %s instantly!", buf,
						tileCatalog[pmap[x][y].layers[layerWithFlag(x, y, T_LAVA_INSTA_DEATH)]].description);
				message(buf2, messageColorFromVictim(monst), false);
			}
			await killCreature(monst, false);
      await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_CREATURE_FIRE], true, false);
			refreshDungeonCell(x, y);
			return;
		}
	}

	// Water puts out fire.
	if (cellHasTMFlag(x, y, TM_EXTINGUISHES_FIRE)
        && monst.status[STATUS_BURNING]
        && !monst.status[STATUS_LEVITATING]
        && !(monst.info.flags & MONST_ATTACKABLE_THRU_WALLS)
		&& !(monst.info.flags & MONST_FIERY))
  {
		extinguishFireOnCreature(monst);
	}

	// If you see a monster use a secret door, you discover it.
	if (playerCanSee(x, y)
    && cellHasTMFlag(x, y, TM_IS_SECRET)
		&& (cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)))
  {
		await discover(x, y);
	}

	// Pressure plates.
	if (!(monst.status[STATUS_LEVITATING])
		&& !(monst.bookkeepingFlags & MB_SUBMERGED)
    && (!cellHasTMFlag(x, y, TM_ALLOWS_SUBMERGING) || !(monst.info.flags & MONST_SUBMERGES))
		&& cellHasTerrainFlag(x, y, T_IS_DF_TRAP)
		&& !(pmap[x][y].flags & PRESSURE_PLATE_DEPRESSED))
  {
		pmap[x][y].flags |= PRESSURE_PLATE_DEPRESSED;
		if (playerCanSee(x, y) && cellHasTMFlag(x, y, TM_IS_SECRET)) {
			await discover(x, y);
			refreshDungeonCell(x, y);
		}
		if (canSeeMonster(monst)) {
			monsterName(buf, monst, true);
			sprintf(buf2, "a pressure plate clicks underneath %s!", buf);
			await messageWithAck(buf2);
		} else if (playerCanSee(x, y)) {
			// usually means an invisible monster
			message("a pressure plate clicks!", false);
		}
		for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
			if (tileCatalog[pmap[x][y].layers[layer]].flags & T_IS_DF_TRAP) {
				await spawnDungeonFeature(x, y, dungeonFeatureCatalog[tileCatalog[pmap[x][y].layers[layer]].fireType], true, false);
				await promoteTile(x, y, layer, false);
			}
		}
	}

	if (cellHasTMFlag(x, y, TM_PROMOTES_ON_STEP)) { // flying creatures activate too
		// Because this uses no pressure plate to keep track of whether it's already depressed,
		// it will trigger every time this function is called while the monster or player is on the tile.
		// Because this function can be called several times per turn, multiple promotions can
        // happen unpredictably if the tile does not promote to a tile without the T_PROMOTES_ON_STEP
        // attribute. That's acceptable for some effects, e.g. doors opening,
        // but not for others, e.g. magical glyphs activating.
		for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
			if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_PROMOTES_ON_STEP) {
				await promoteTile(x, y, layer, false);
			}
		}
	}

	if (cellHasTMFlag(x, y, TM_PROMOTES_ON_PLAYER_ENTRY) && monst === player) {
		// Subject to same caveats as T_PROMOTES_ON_STEP above.
		for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
			if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_PROMOTES_ON_PLAYER_ENTRY) {
				await promoteTile(x, y, layer, false);
			}
		}
	}

	if (cellHasTMFlag(x, y, TM_PROMOTES_ON_SACRIFICE_ENTRY)
			&& monst.machineHome == pmap[x][y].machineNumber
			&& (monst.bookkeepingFlags & MB_MARKED_FOR_SACRIFICE)) {
			// Subject to same caveats as T_PROMOTES_ON_STEP above.
			for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
					if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_PROMOTES_ON_SACRIFICE_ENTRY) {
							await promoteTile(x, y, layer, false);
					}
			}
	}

	// spiderwebs
	if (cellHasTerrainFlag(x, y, T_ENTANGLES) && !monst.status[STATUS_STUCK]
		  && !(monst.info.flags & (MONST_IMMUNE_TO_WEBS | MONST_INVULNERABLE))
      && !(monst.bookkeepingFlags & MB_SUBMERGED))
  {
		monst.status[STATUS_STUCK] = monst.maxStatus[STATUS_STUCK] = rand_range(3, 7);
		if (monst === player) {
      if (!rogue.automationActive) {
          // Don't interrupt exploration with this message.
          sprintf(buf2, "you are stuck fast in %s!",
                  tileCatalog[pmap[x][y].layers[layerWithFlag(x, y, T_ENTANGLES)]].description);
          message(buf2, false);
      }
		} else if (canDirectlySeeMonster(monst)) { // it's a monster
      if (!rogue.automationActive) {
          monsterName(buf, monst, true);
          sprintf(buf2, "%s is stuck fast in %s!", buf,
                  tileCatalog[pmap[x][y].layers[layerWithFlag(x, y, T_ENTANGLES)]].description);
          message(buf2, false);
      }
		}
	}

	// explosions
	if (cellHasTerrainFlag(x, y, T_CAUSES_EXPLOSIVE_DAMAGE) && !monst.status[STATUS_EXPLOSION_IMMUNITY]
		&& !(monst.bookkeepingFlags & MB_SUBMERGED))
  {
		damage = rand_range(15, 20);
		damage = max(damage, monst.info.maxHP / 2);
		monst.status[STATUS_EXPLOSION_IMMUNITY] = 5;
		if (monst === player) {
			rogue.disturbed = true;
			for (layer = 0; layer < NUMBER_TERRAIN_LAYERS && !(tileCatalog[pmap[x][y].layers[layer]].flags & T_CAUSES_EXPLOSIVE_DAMAGE); layer++);
			message(tileCatalog[pmap[x][y].layers[layer]].flavorText, false);
      if (rogue.armor && (rogue.armor.flags & ITEM_RUNIC) && rogue.armor.enchant2 == A_DAMPENING) {
          itemName(rogue.armor, buf2, false, false, NULL);
          sprintf(buf, "Your %s pulses and absorbs the damage.", buf2);
          message(buf, goodMessageColor, false);
          autoIdentify(rogue.armor);
      } else if (await inflictDamage(NULL, player, damage, yellow, false)) {
				strcpy(buf2, tileCatalog[pmap[x][y].layers[layerWithFlag(x, y, T_CAUSES_EXPLOSIVE_DAMAGE)]].description);
				sprintf(buf, "Killed by %s", buf2);
				await gameOver(buf, true);
				return;
			}
		} else { // it's a monster
			if (monst.creatureState == MONSTER_SLEEPING) {
				monst.creatureState = MONSTER_TRACKING_SCENT;
			}
			monsterName(buf, monst, true);
			if (await inflictDamage(NULL, monst, damage, yellow, false)) {
				// if killed
				sprintf(buf2, "%s %s %s.", buf,
                  (monst.info.flags & MONST_INANIMATE) ? "is destroyed by" : "dies in",
		              tileCatalog[pmap[x][y].layers[layerWithFlag(x, y, T_CAUSES_EXPLOSIVE_DAMAGE)]].description);
				message(buf2, messageColorFromVictim(monst), false);
				refreshDungeonCell(x, y);
				return;
			} else {
				// if survived
				sprintf(buf2, "%s engulfs %s.",
						      tileCatalog[pmap[x][y].layers[layerWithFlag(x, y, T_CAUSES_EXPLOSIVE_DAMAGE)]].description, buf);
				message(buf2, messageColorFromVictim(monst), false);
			}
		}
	}

    // Toxic gases!
    // If it's the player, and he's wearing armor of respiration, then no effect from toxic gases.
    if (monst === player
        && cellHasTerrainFlag(x, y, T_RESPIRATION_IMMUNITIES)
        && rogue.armor
        && (rogue.armor.flags & ITEM_RUNIC)
        && rogue.armor.enchant2 == A_RESPIRATION)
    {
        if (!(rogue.armor.flags & ITEM_RUNIC_IDENTIFIED))
        {
          message("Your armor trembles and a pocket of clean air swirls around you.", false);
          autoIdentify(rogue.armor);
        }
    } else {
        // zombie gas
        if (cellHasTerrainFlag(x, y, T_CAUSES_NAUSEA)
            && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))
            && !(monst.bookkeepingFlags & MB_SUBMERGED)) {
            if (monst === player) {
                rogue.disturbed = true;
            }
            if (canDirectlySeeMonster(monst) && !(monst.status[STATUS_NAUSEOUS])) {
                if (monst.creatureState == MONSTER_SLEEPING) {
                    monst.creatureState = MONSTER_TRACKING_SCENT;
                }
                await flashMonster(monst, brown, 100);
                monsterName(buf, monst, true);
                sprintf(buf2, "%s choke%s and gag%s on the overpowering stench of decay.", buf,
                        (monst === player ? "": "s"), (monst === player ? "": "s"));
                message(buf2, false);
            }
            monst.status[STATUS_NAUSEOUS] = monst.maxStatus[STATUS_NAUSEOUS] = max(monst.status[STATUS_NAUSEOUS], 20);
        }

        // confusion gas
        if (cellHasTerrainFlag(x, y, T_CAUSES_CONFUSION) && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
            if (monst === player) {
                rogue.disturbed = true;
            }
            if (canDirectlySeeMonster(monst) && !(monst.status[STATUS_CONFUSED])) {
                if (monst.creatureState == MONSTER_SLEEPING) {
                    monst.creatureState = MONSTER_TRACKING_SCENT;
                }
                await flashMonster(monst, confusionGasColor, 100);
                monsterName(buf, monst, true);
                sprintf(buf2, "%s %s very confused!", buf, (monst === player ? "feel": "looks"));
                message(buf2, false);
            }
            monst.status[STATUS_CONFUSED] = monst.maxStatus[STATUS_CONFUSED] = max(monst.status[STATUS_CONFUSED], 25);
        }

        // paralysis gas
        if (cellHasTerrainFlag(x, y, T_CAUSES_PARALYSIS)
            && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))
            && !(monst.bookkeepingFlags & MB_SUBMERGED))
        {
            if (canDirectlySeeMonster(monst) && !monst.status[STATUS_PARALYZED]) {
                await flashMonster(monst, pink, 100);
                monsterName(buf, monst, true);
                sprintf(buf2, "%s %s paralyzed!", buf, (monst === player ? "are": "is"));
                if (monst === player) {
                   await messageWithAck(buf2);
                }
                else {
                   message(buf2);
                }
            }
            monst.status[STATUS_PARALYZED] = monst.maxStatus[STATUS_PARALYZED] = max(monst.status[STATUS_PARALYZED], 20);
            if (monst === player) {
                rogue.disturbed = true;
            }
        }
    }

    // poisonous lichen
    if (cellHasTerrainFlag(x, y, T_CAUSES_POISON)
        && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))
        && !monst.status[STATUS_LEVITATING])
    {
        if (monst === player && !player.status[STATUS_POISONED]) {
            rogue.disturbed = true;
        }
        if (canDirectlySeeMonster(monst) && !(monst.status[STATUS_POISONED])) {
            if (monst.creatureState == MONSTER_SLEEPING) {
                monst.creatureState = MONSTER_TRACKING_SCENT;
            }
            await flashMonster(monst, green, 100);
            monsterName(buf, monst, true);
            sprintf(buf2, "the lichen's grasping tendrils poison %s.", buf);
            message(buf2, messageColorFromVictim(monst), false);
        }
        damage = max(0, 5 - monst.status[STATUS_POISONED]);
        addPoison(monst, damage, 0); // Lichen doesn't increase poison concentration above 1.
    }

	// fire
	if (cellHasTerrainFlag(x, y, T_IS_FIRE)) {
		exposeCreatureToFire(monst);
	} else if (cellHasTerrainFlag(x, y, T_IS_FLAMMABLE)
			   && !cellHasTerrainFlag(x, y, T_IS_FIRE)
			   && monst.status[STATUS_BURNING]
         && !(monst.bookkeepingFlags & (MB_SUBMERGED | MB_IS_FALLING)))
  {
		await exposeTileToFire(x, y, true);
	}

	// keys
	if (cellHasTMFlag(x, y, TM_PROMOTES_WITH_KEY) && (theItem = keyOnTileAt(x, y))) {
		await useKeyAt(theItem, x, y);
	}
}


async function applyGradualTileEffectsToCreature( /* creature */ monst, ticks) {
	let itemCandidates, randItemIndex;
	let x = monst.xLoc, y = monst.yLoc, damage;
	const buf = STRING(), buf2 = STRING(); // char[COLS * 3];
	let theItem;	// item *
	let layer;		// enum dungeonLayers

	if (!(monst.status[STATUS_LEVITATING])
    && cellHasTerrainFlag(x, y, T_IS_DEEP_WATER)
		&& !cellHasTerrainFlag(x, y, (T_ENTANGLES | T_OBSTRUCTS_PASSABILITY))
		&& !(monst.info.flags & MONST_IMMUNE_TO_WATER)) {
		if (monst === player) {
			if (!(pmap[x][y].flags & HAS_ITEM) && rand_percent(ticks * 50 / 100)) {
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
					theItem = await dropItem(theItem);
					if (theItem) {
						itemName(theItem, buf2, false, true, NULL);
						sprintf(buf, "%s float%s away in the current!",
                                buf2,
                                (theItem.quantity == 1 ? "s" : ""));
						message(buf, itemMessageColor, false);
					}
				}
			}
		} else if (monst.carriedItem && !(pmap[x][y].flags & HAS_ITEM) && rand_percent(ticks * 50 / 100)) { // it's a monster with an item
			await makeMonsterDropItem(monst);
		}
	}

	if (cellHasTerrainFlag(x, y, T_CAUSES_DAMAGE)
		&& !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))
		&& !(monst.bookkeepingFlags & MB_SUBMERGED))
	{
		damage = (monst.info.maxHP / 15) * ticks / 100;
		damage = max(1, damage);
		for (layer = 0; layer < NUMBER_TERRAIN_LAYERS && !(tileCatalog[pmap[x][y].layers[layer]].flags & T_CAUSES_DAMAGE); layer++);
		if (monst === player) {
      if (rogue.armor && (rogue.armor.flags & ITEM_RUNIC) && rogue.armor.enchant2 == A_RESPIRATION) {
          if (!(rogue.armor.flags & ITEM_RUNIC_IDENTIFIED)) {
              message("Your armor trembles and a pocket of clean air swirls around you.", false);
              autoIdentify(rogue.armor);
          }
      } else {
          rogue.disturbed = true;
          message(tileCatalog[pmap[x][y].layers[layer]].flavorText, badMessageColor, false);
          if (await inflictDamage(NULL, player, damage, tileCatalog[pmap[x][y].layers[layer]].backColor, true)) {
              sprintf(buf, "Killed by %s", tileCatalog[pmap[x][y].layers[layer]].description);
              await gameOver(buf, true);
              return;
          }
      }
		} else { // it's a monster
			if (monst.creatureState == MONSTER_SLEEPING) {
				monst.creatureState = MONSTER_TRACKING_SCENT;
			}
			if (await inflictDamage(NULL, monst, damage, tileCatalog[pmap[x][y].layers[layer]].backColor, true)) {
				if (canSeeMonster(monst)) {
					monsterName(buf, monst, true);
					sprintf(buf2, "%s dies.", buf);
					message(buf2, messageColorFromVictim(monst), false);
				}
				refreshDungeonCell(x, y);
				return;
			}
		}
	}

  if (cellHasTerrainFlag(x, y, T_CAUSES_HEALING)
		&& !(monst.info.flags & MONST_INANIMATE)
		&& !(monst.bookkeepingFlags & MB_SUBMERGED))
	{
		damage = (monst.info.maxHP / 15) * ticks / 100;
		damage = max(1, damage);
    if (monst.currentHP < monst.info.maxHP) {
        monst.currentHP = min(monst.currentHP + damage, monst.info.maxHP);
        if (monst === player) {
            message("you feel much better.", goodMessageColor, false);
        }
    }
  }
}


function updateClairvoyance() {
	let i, j, clairvoyanceRadius, dx, dy;
	let cursed;
	let cFlags;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			pmap[i][j].flags &= ~WAS_CLAIRVOYANT_VISIBLE;
			if (pmap[i][j].flags & CLAIRVOYANT_VISIBLE) {
				pmap[i][j].flags |= WAS_CLAIRVOYANT_VISIBLE;
			}
			pmap[i][j].flags &= ~(CLAIRVOYANT_VISIBLE | CLAIRVOYANT_DARKENED);
		}
	}

	cursed = (rogue.clairvoyance < 0);
	if (cursed) {
		clairvoyanceRadius = (rogue.clairvoyance - 1) * -1;
		cFlags = CLAIRVOYANT_DARKENED;
	} else {
		clairvoyanceRadius = (rogue.clairvoyance > 0) ? rogue.clairvoyance + 1 : 0;
		cFlags = CLAIRVOYANT_VISIBLE | DISCOVERED;
	}

	for (i = max(0, player.xLoc - clairvoyanceRadius); i < min(DCOLS, player.xLoc + clairvoyanceRadius + 1); i++) {
		for (j = max(0, player.yLoc - clairvoyanceRadius); j < min(DROWS, player.yLoc + clairvoyanceRadius + 1); j++) {

			dx = (player.xLoc - i);
			dy = (player.yLoc - j);

			if (dx*dx + dy*dy < clairvoyanceRadius*clairvoyanceRadius + clairvoyanceRadius
				&& (pmap[i][j].layers[DUNGEON] != GRANITE || pmap[i][j].flags & DISCOVERED))
      {
				if (cFlags & DISCOVERED) {
          discoverCell(i, j);
				}
				pmap[i][j].flags |= cFlags;
				if (!(pmap[i][j].flags & HAS_PLAYER) && !cursed) {
					pmap[i][j].flags &= ~STABLE_MEMORY;
				}
			}
		}
	}
}

function updateTelepathy() {
	let i, j;
	let monst;		// creature *
	const grid = GRID(DCOLS, DROWS); // boolean[DCOLS][DROWS];

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			pmap[i][j].flags &= ~WAS_TELEPATHIC_VISIBLE;
			if (pmap[i][j].flags & TELEPATHIC_VISIBLE) {
				pmap[i][j].flags |= WAS_TELEPATHIC_VISIBLE;
			}
			pmap[i][j].flags &= ~(TELEPATHIC_VISIBLE);
		}
	}

  zeroOutGrid(grid);
  for (monst = monsters.nextCreature; monst; monst = monst.nextCreature) {
      if (monsterRevealed(monst)) {
          getFOVMask(grid, monst.xLoc, monst.yLoc, 2 << FP_BASE, T_OBSTRUCTS_VISION, 0, false);
          pmap[monst.xLoc][monst.yLoc].flags |= TELEPATHIC_VISIBLE;
          discoverCell(monst.xLoc, monst.yLoc);
      }
  }
  for (monst = dormantMonsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
      if (monsterRevealed(monst)) {
          getFOVMask(grid, monst.xLoc, monst.yLoc, 2 << FP_BASE, T_OBSTRUCTS_VISION, 0, false);
          pmap[monst.xLoc][monst.yLoc].flags |= TELEPATHIC_VISIBLE;
          discoverCell(monst.xLoc, monst.yLoc);
      }
  }
  for (i = 0; i < DCOLS; i++) {
      for (j = 0; j < DROWS; j++) {
          if (grid[i][j]) {
              pmap[i][j].flags |= TELEPATHIC_VISIBLE;
              discoverCell(i, j);
          }
      }
  }
}


function scentDistance(x1, y1, x2, y2) {
    if (abs(x1 - x2) > abs(y1 - y2)) {
        return 2 * abs(x1 - x2) + abs(y1 - y2);
    } else {
        return abs(x1 - x2) + 2 * abs(y1 - y2);
    }
}

function updateScent() {
	let i, j;
	const grid = GRID(DCOLS, DROWS); // char[DCOLS][DROWS];

	zeroOutGrid(grid);

	getFOVMask(grid, player.xLoc, player.yLoc, DCOLS << FP_BASE, T_OBSTRUCTS_SCENT, 0, false);

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (grid[i][j]) {
        addScentToCell(i, j, scentDistance(player.xLoc, player.yLoc, i, j));
			}
		}
	}
	addScentToCell(player.xLoc, player.yLoc, 0);
}

function armorAggroAdjustment( /* item */ theArmor) {
    if (!theArmor
        || !(theArmor.category & ARMOR))
		{
        return 0;
    }
    return max(0, armorTable[theArmor.kind].strengthRequired - 12);
}


function currentAggroValue() {
    // Default value of 14 in the light.
    let stealthVal = 14;

    if (player.status[STATUS_INVISIBLE]) {
        stealthVal = 1; // Invisibility means stealth range of 1, no matter what.
    } else {
        if (playerInDarkness()) {
            // In darkness, halve, rounded down.
            stealthVal = Math.floor(stealthVal / 2);
        } else if (pmap[player.xLoc][player.yLoc].flags & IS_IN_SHADOW) {
					// When not standing in a lit area, halve, rounded down (stacks with darkness halving).
					stealthVal = Math.floor(stealthVal / 2);
        }

        // Add 1 for each point of your armor's natural (unenchanted) strength requirement above 12.
        stealthVal += armorAggroAdjustment(rogue.armor);

        // Halve (rounded up) if you just rested.
        if (rogue.justRested) {
            stealthVal = (stealthVal + 1) / 2;
        }

				// Double while manually searching.
        if (player.status[STATUS_SEARCHING] > 0) {
            stealthVal *= 2;
        }

        if (player.status[STATUS_AGGRAVATING] > 0) {
            stealthVal += player.status[STATUS_AGGRAVATING];
        }

        // Subtract your bonuses from rings of stealth.
        // (Cursed rings of stealth will end up adding here.)
        stealthVal -= rogue.stealthBonus;

        // Can't go below 2 unless you just rested.
        if (stealthVal < 2 && !rogue.justRested) {
            stealthVal = 2;
        } else if (stealthVal < 1) { // Can't go below 1, ever.
            stealthVal = 1;
        }
    }
    return Math.floor(stealthVal);
}

function demoteVisibility() {
	let i, j;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			pmap[i][j].flags &= ~WAS_VISIBLE;
			if (pmap[i][j].flags & VISIBLE) {
				pmap[i][j].flags &= ~VISIBLE;
				pmap[i][j].flags |= WAS_VISIBLE;
			}
		}
	}
}


function discoverCell( x, y) {
  pmap[x][y].flags &= ~STABLE_MEMORY;
  if (!(pmap[x][y].flags & DISCOVERED)) {
    pmap[x][y].flags |= DISCOVERED;
    if (!cellHasTerrainFlag(x, y, T_PATHING_BLOCKER)) {
      rogue.xpxpThisTurn++;
    }
  }
}

function updateVision(refreshDisplay) {
	let i, j;
	let grid = GRID(DCOLS, DROWS); // char[DCOLS][DROWS];
	let theItem;	// item *
	let monst;	// creature *

  demoteVisibility();
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			pmap[i][j].flags &= ~IN_FIELD_OF_VIEW;
		}
	}

	// Calculate player's field of view (distinct from what is visible, as lighting hasn't been done yet).
	zeroOutGrid(grid);
	getFOVMask(grid, player.xLoc, player.yLoc, (DCOLS + DROWS) << FP_BASE, (T_OBSTRUCTS_VISION), 0, false);
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (grid[i][j]) {
				pmap[i][j].flags |= IN_FIELD_OF_VIEW;
			}
		}
	}
	pmap[player.xLoc][player.yLoc].flags |= IN_FIELD_OF_VIEW | VISIBLE;

	if (rogue.clairvoyance < 0) {
    discoverCell(player.xLoc, player.yLoc);
	}

	if (rogue.clairvoyance != 0) {
		updateClairvoyance();
	}

  updateTelepathy();
	updateLighting();
	updateFieldOfViewDisplay(true, refreshDisplay);

  //	for (i=0; i<DCOLS; i++) {
  //		for (j=0; j<DROWS; j++) {
  //			if (pmap[i][j].flags & VISIBLE) {
  //				plotCharWithColor(' ', mapToWindowX(i), mapToWindowY(j), &yellow, &yellow);
  //			} else if (pmap[i][j].flags & IN_FIELD_OF_VIEW) {
  //				plotCharWithColor(' ', mapToWindowX(i), mapToWindowY(j), &blue, &blue);
  //			}
  //		}
  //	}
  //	displayMoreSign();

	if (player.status[STATUS_HALLUCINATING] > 0) {
		for (theItem = floorItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
			if ((pmap[theItem.xLoc][theItem.yLoc].flags & DISCOVERED) && refreshDisplay) {
				refreshDungeonCell(theItem.xLoc, theItem.yLoc);
			}
		}
		for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
			if ((pmap[monst.xLoc][monst.yLoc].flags & DISCOVERED) && refreshDisplay) {
				refreshDungeonCell(monst.xLoc, monst.yLoc);
			}
		}
	}
}

async function checkNutrition() {
	let theItem;		// item *
	const buf = STRING(), foodWarning = STRING(); // char[DCOLS*3];

	if (numberOfMatchingPackItems(FOOD, 0, 0, false) == 0) {
		sprintf(foodWarning, " and have no food");
	} else {
		foodWarning.clear();
	}

	if (player.status[STATUS_NUTRITION] == HUNGER_THRESHOLD) {
    player.status[STATUS_NUTRITION]--;
		sprintf(buf, "you are hungry%s.", foodWarning);
		message(buf, foodWarning[0] || false);
	} else if (player.status[STATUS_NUTRITION] == WEAK_THRESHOLD) {
    player.status[STATUS_NUTRITION]--;
		sprintf(buf, "you feel weak with hunger%s.", foodWarning);
		await messageWithAck(buf);
	} else if (player.status[STATUS_NUTRITION] == FAINT_THRESHOLD) {
    player.status[STATUS_NUTRITION]--;
		sprintf(buf, "you feel faint with hunger%s.", foodWarning);
		await messageWithAck(buf);
	} else if (player.status[STATUS_NUTRITION] <= 1) {
    // Force the player to eat something if he has it
    for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
        if (theItem.category == FOOD) {
            sprintf(buf, "unable to control your hunger, you eat a %s.", (theItem.kind == FRUIT ? "mango" : "ration of food"));
            await messageWithAck(buf, itemMessageColor);
            await apply(theItem, false);
            break;
        }
		}
	}

	if (player.status[STATUS_NUTRITION] == 1) {	// Didn't manage to eat any food above.
		player.status[STATUS_NUTRITION] = 0;	// So the status bar changes in time for the message:
		await messageWithAck("you are starving to death!");
	}
}


async function burnItem( /* item */ theItem) {
	let x, y;
	const buf1 = STRING(), buf2 = STRING(); // char[COLS * 3];

	itemName(theItem, buf1, false, true, NULL);
	sprintf(buf2, "%s burn%s up!",
            buf1,
            theItem.quantity == 1 ? "s" : "");
	x = theItem.xLoc;
	y = theItem.yLoc;
	removeItemFromChain(theItem, floorItems);
	pmap[x][y].flags &= ~(HAS_ITEM | ITEM_DETECTED);
	if (pmap[x][y].flags & (ANY_KIND_OF_VISIBLE | DISCOVERED | ITEM_DETECTED)) {
		refreshDungeonCell(x, y);
	}
	if (playerCanSee(x, y)) {
		message(buf2, itemMessageColor, false);
	}
  await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_ITEM_FIRE], true, false);
}

async function flashCreatureAlert( /* creature */ monst, msg, /* color */ foreColor, /* color */ backColor) {
    let x, y;
    if (monst.yLoc > DROWS / 2) {
      y = mapToWindowY(monst.yLoc - 2);
    } else {
      y = mapToWindowY(monst.yLoc + 2);
    }
    x = mapToWindowX(monst.xLoc - Math.floor(strLenWithoutEscapes(msg) / 2) );
    if (x > COLS - strLenWithoutEscapes(msg)) {
        x = COLS - strLenWithoutEscapes(msg);
    }
    await flashMessage(msg, x, y, (rogue.playbackMode ? 100 : 1000), foreColor, backColor);
    rogue.disturbed = true;
}

async function handleHealthAlerts() {
	let i, currentPercent, previousPercent;
  const thresholds = [5, 10, 25, 40];
  const pThresholds = [100, 90, 50];
	const buf = STRING(); // char[DCOLS];
	const colorbuf = STRING(); // char[DCOLS + 4];

  // assureCosmeticRNG();

  const healthThresholdsCount = 4,
  poisonThresholdsCount = 3;

	currentPercent = Math.floor(player.currentHP * 100 / player.info.maxHP);
  previousPercent = Math.floor(player.previousHealthPoints * 100 / player.info.maxHP);

	if (currentPercent < previousPercent && !rogue.gameHasEnded) {
		for (i=0; i < healthThresholdsCount; i++) {
			if (currentPercent < thresholds[i] && previousPercent >= thresholds[i]) {
				sprintf(buf, " <%i%% health ", thresholds[i]);
				await flashCreatureAlert(player, buf, badMessageColor, darkRed);
				// if(rogue.warningPauseMode) {
				// 	encodeMessageColor(colorbuf, 0, badMessageColor);
				// 	strcat(colorbuf, "LOW HITPOINT WARNING:");
				// 	strcat(colorbuf, buf);	// strncat
				// 	await messageWithAck(colorbuf);
				// }
				break;
			}
		}
	}
	// rogue.previousHealthPercent = currentPercent;

  if (!rogue.gameHasEnded) {
    currentPercent = Math.floor(player.status[STATUS_POISONED] * player.poisonAmount * 100 / player.currentHP);

    if (currentPercent > rogue.previousPoisonPercent && !rogue.gameHasEnded) {
      for (i=0; i < poisonThresholdsCount; i++) {
        if (currentPercent > pThresholds[i] && rogue.previousPoisonPercent <= pThresholds[i]) {
            if (currentPercent < 100) {
              sprintf(buf, " >%i%% poisoned ", pThresholds[i]);
            } else {
							strcpy(buf, " Fatally poisoned ");
            }
            await flashCreatureAlert(player, buf, yellow, darkGreen);
            // if(rogue.warningPauseMode) {
						// 	encodeMessageColor(colorbuf, 0, badMessageColor);
						// 	strcat(colorbuf, "POISON WARNING:");
						// 	strncat(colorbuf, buf, DCOLS + 4 - 15);
						// 	await messageWithAck(colorbuf);
            // }
            break;
          }
      }
    }
    rogue.previousPoisonPercent = currentPercent;
  }

  // restoreRNG();
}

function addXPXPToAlly(XPXP, /* creature */ monst) {
    const theMonsterName = STRING(), buf = STRING(); // char[200];

    if (!(monst.info.flags & (MONST_INANIMATE | MONST_IMMOBILE))
        && !(monst.bookkeepingFlags & MB_TELEPATHICALLY_REVEALED)
        && monst.creatureState == MONSTER_ALLY
        && monst.spawnDepth <= rogue.depthLevel
        && rogue.depthLevel <= AMULET_LEVEL)
		{
        monst.xpxp += XPXP;
        //printf("\n%i xpxp added to your %s this turn.", rogue.xpxpThisTurn, monst.info.monsterName);
        if (monst.xpxp >= XPXP_NEEDED_FOR_TELEPATHIC_BOND
            && !(monst.bookkeepingFlags & MB_TELEPATHICALLY_REVEALED))
				{
            monst.bookkeepingFlags |= MB_TELEPATHICALLY_REVEALED;
            updateVision(true);
            monsterName(theMonsterName, monst, false);
            sprintf(buf, "you have developed a telepathic bond with your %s.", theMonsterName);
            message(buf, advancementMessageColor, false);
        }
        if (monst.xpxp > 1500 * 20) {
            rogue.featRecord[FEAT_COMPANION] = true;
        }
    }
}

function handleXPXP() {
	let monst;	// creature *
	//char buf[DCOLS*2], theMonsterName[50];

	for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
        addXPXPToAlly(rogue.xpxpThisTurn, monst);
	}
  if (rogue.depthLevel > 1) {
      for (monst = levels[rogue.depthLevel - 2].monsters; monst != NULL; monst = monst.nextCreature) {
          addXPXPToAlly(rogue.xpxpThisTurn, monst);
      }
  }
  if (rogue.depthLevel < DEEPEST_LEVEL) {
      for (monst = levels[rogue.depthLevel].monsters; monst != NULL; monst = monst.nextCreature) {
          addXPXPToAlly(rogue.xpxpThisTurn, monst);
      }
  }
	rogue.xpxpThisTurn = 0;
}

async function playerFalls() {
	let damage;
	let layer;

  if (cellHasTMFlag(player.xLoc, player.yLoc, TM_IS_SECRET)
      && playerCanSee(player.xLoc, player.yLoc))
	{
		await discover(player.xLoc, player.yLoc);
  }

  await monstersFall();			// Monsters must fall with the player rather than getting suspended on the previous level.
  await updateFloorItems(); // Likewise, items should fall with the player rather than getting suspended above.

	layer = layerWithFlag(player.xLoc, player.yLoc, T_AUTO_DESCENT);
	if (layer >= 0) {
		await messageWithAck(tileCatalog[pmap[player.xLoc][player.yLoc].layers[layer]].flavorText);
	} else if (layer == -1) {
		await messageWithAck("You plunge downward!");
	}

  player.bookkeepingFlags &= ~(MB_IS_FALLING | MB_SEIZED | MB_SEIZING);
	rogue.disturbed = true;

  if (rogue.depthLevel < DEEPEST_LEVEL) {
      rogue.depthLevel++;
      await startLevel(rogue.depthLevel - 1, 0);
      damage = randClumpedRange(FALL_DAMAGE_MIN, FALL_DAMAGE_MAX, 2);
      message("You are damaged by the fall.", badMessageColor, false);
      if (await inflictDamage(NULL, player, damage, red, false)) {
          await gameOver("Killed by a fall", true);
      } else if (rogue.depthLevel > rogue.deepestLevel) {
          rogue.deepestLevel = rogue.depthLevel;
      }
  } else {
      message("A strange force seizes you as you fall.", false);
      await teleport(player, -1, -1, true);
  }
  createFlare(player.xLoc, player.yLoc, GENERIC_FLASH_LIGHT);
  await animateFlares(rogue.flares, rogue.flareCount);
  rogue.flareCount = 0;
}



async function activateMachine(machineNumber) {
	let i, j, x, y, layer, monsterCount, maxMonsters;
	let sRows = [], sCols = []; // short[DCOLS],
  let activatedMonsterList, monst;		// creature **

  fillSequentialList(sCols, DCOLS);
  shuffleList(sCols, DCOLS);
  fillSequentialList(sRows, DROWS);
  shuffleList(sRows, DROWS);

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			x = sCols[i];
			y = sRows[j];
			if ((pmap[x][y].flags & IS_IN_MACHINE)
				&& pmap[x][y].machineNumber == machineNumber
				&& !(pmap[x][y].flags & IS_POWERED)
				&& cellHasTMFlag(x, y, TM_IS_WIRED))
			{
				pmap[x][y].flags |= IS_POWERED;
				for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
					if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_IS_WIRED) {
						await promoteTile(x, y, layer, false);
					}
				}
			}
		}
	}

  monsterCount = maxMonsters = 0;
  activatedMonsterList = [];
  for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
      if (monst.machineHome == machineNumber
          && monst.spawnDepth == rogue.depthLevel
          && (monst.info.flags & MONST_GETS_TURN_ON_ACTIVATION))
			{
          activatedMonsterList.push(monst);
      }
  }
  for (i=0; i<activatedMonsterList.length; i++) {
      if (!(activatedMonsterList[i].bookkeepingFlags & MB_IS_DYING)) {
          await monstersTurn(activatedMonsterList[i]);
      }
  }

}


function circuitBreakersPreventActivation(machineNumber) {
  let i, j;
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
      if (pmap[i][j].machineNumber == machineNumber
          && cellHasTMFlag(i, j, TM_IS_CIRCUIT_BREAKER))
			{
          return true;
      }
    }
  }
  return false;
}


async function promoteTile(x, y, /* dungeonLayers */ layer, useFireDF) {
	let i, j;
	let DFType;	// dungeonFeatureTypes
	let tile;	// floorTileType *

	tile = tileCatalog[pmap[x][y].layers[layer]];

	DFType = (useFireDF ? tile.fireType : tile.promoteType);

	if ((tile.mechFlags & TM_VANISHES_UPON_PROMOTION)) {
		if (tileCatalog[pmap[x][y].layers[layer]].flags & T_PATHING_BLOCKER) {
			rogue.staleLoopMap = true;
		}
		pmap[x][y].layers[layer] = (layer == DUNGEON ? FLOOR : NOTHING); // even the dungeon layer implicitly has floor underneath it
		if (layer == GAS) {
			pmap[x][y].volume = 0;
		}
		refreshDungeonCell(x, y);
	}
	if (DFType) {
		await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DFType], true, false);
	}

	if (!useFireDF && (tile.mechFlags & TM_IS_WIRED)
        && !(pmap[x][y].flags & IS_POWERED)
        && !circuitBreakersPreventActivation(pmap[x][y].machineNumber))
	{
		// Send power through all cells in the same machine that are not IS_POWERED,
		// and on any such cell, promote each terrain layer that is T_IS_WIRED.
		// Note that machines need not be contiguous.
		pmap[x][y].flags |= IS_POWERED;
		await activateMachine(pmap[x][y].machineNumber); // It lives!!!

		// Power fades from the map immediately after we finish.
		for (i=0; i<DCOLS; i++) {
			for (j=0; j<DROWS; j++) {
				pmap[i][j].flags &= ~IS_POWERED;
			}
		}
	}
}

async function exposeTileToElectricity(x, y) {
	let layer;
  let promotedSomething = false;

	if (!cellHasTMFlag(x, y, TM_PROMOTES_ON_ELECTRICITY)) {
		return false;
	}
	for (layer=0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
		if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_PROMOTES_ON_ELECTRICITY) {
            await promoteTile(x, y, layer, false);
            promotedSomething = true;
		}
	}
	return promotedSomething;
}

async function exposeTileToFire(x, y, alwaysIgnite) {
	let layer;		// enum dungeonLayers
	let ignitionChance = 0, bestExtinguishingPriority = 1000, explosiveNeighborCount = 0;
  let newX, newY;
  let dir;
	let fireIgnited = false, explosivePromotion = false;

	if (!cellHasTerrainFlag(x, y, T_IS_FLAMMABLE)) {
		return false;
	}

	// Pick the extinguishing layer with the best priority.
	for (layer=0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
		if ((tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_EXTINGUISHES_FIRE)
			&& tileCatalog[pmap[x][y].layers[layer]].drawPriority < bestExtinguishingPriority)
		{
			bestExtinguishingPriority = tileCatalog[pmap[x][y].layers[layer]].drawPriority;
		}
	}

	// Pick the fire type of the most flammable layer that is either gas or equal-or-better priority than the best extinguishing layer.
	for (layer=0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
		if ((tileCatalog[pmap[x][y].layers[layer]].flags & T_IS_FLAMMABLE)
			&& (layer == GAS || tileCatalog[pmap[x][y].layers[layer]].drawPriority <= bestExtinguishingPriority)
			&& tileCatalog[pmap[x][y].layers[layer]].chanceToIgnite > ignitionChance)
		{
			ignitionChance = tileCatalog[pmap[x][y].layers[layer]].chanceToIgnite;
		}
	}

	if (alwaysIgnite || (ignitionChance && rand_percent(ignitionChance))) {	// If it ignites...
		fireIgnited = true;

    // Count explosive neighbors.
    if (cellHasTMFlag(x, y, TM_EXPLOSIVE_PROMOTE)) {
        for (dir = 0, explosiveNeighborCount = 0; dir < DIRECTION_COUNT; dir++) {
            newX = x + nbDirs[dir][0];
            newY = y + nbDirs[dir][1];
            if (coordinatesAreInMap(newX, newY)
                && (cellHasTerrainFlag(newX, newY, T_IS_FIRE | T_OBSTRUCTS_GAS) || cellHasTMFlag(newX, newY, TM_EXPLOSIVE_PROMOTE)))
						{
                explosiveNeighborCount++;
            }
        }
        if (explosiveNeighborCount >= 8) {
            explosivePromotion = true;
        }
    }

		// Flammable layers are consumed.
		for (layer=0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
			if (tileCatalog[pmap[x][y].layers[layer]].flags & T_IS_FLAMMABLE) {
				if (layer == GAS) {
					pmap[x][y].volume = 0; // Flammable gas burns its volume away.
				}
				await promoteTile(x, y, layer, !explosivePromotion);
			}
		}
		refreshDungeonCell(x, y);
	}
	return fireIgnited;
}


// Only the gas layer can be volumetric.
function updateVolumetricMedia() {
	let i, j, newX, newY, numSpaces;
	let highestNeighborVolume;
	let sum;
	let gasType;		// enum tileType
	let dir;				// enum directions
	let newGasVolume = GRID(DCOLS, DROWS); // short[DCOLS][DROWS];

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			newGasVolume[i][j] = 0;
		}
	}

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (!cellHasTerrainFlag(i, j, T_OBSTRUCTS_GAS)) {
				sum = pmap[i][j].volume;
				numSpaces = 1;
				highestNeighborVolume = pmap[i][j].volume;
				gasType = pmap[i][j].layers[GAS];
				for (dir=0; dir< DIRECTION_COUNT; dir++) {
					newX = i + nbDirs[dir][0];
					newY = j + nbDirs[dir][1];
					if (coordinatesAreInMap(newX, newY)
						&& !cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_GAS))
					{
						sum += pmap[newX][newY].volume;
						numSpaces++;
						if (pmap[newX][newY].volume > highestNeighborVolume) {
							highestNeighborVolume = pmap[newX][newY].volume;
							gasType = pmap[newX][newY].layers[GAS];
						}
					}
				}
				if (cellHasTerrainFlag(i, j, T_AUTO_DESCENT)) { // if it's a chasm tile or trap door,
					numSpaces++; // this will allow gas to escape from the level entirely
				}
				newGasVolume[i][j] += Math.floor(sum / max(1, numSpaces));
				if (rand_range(0, Math.max(0, numSpaces - 1) ) < (sum % numSpaces)) {
					newGasVolume[i][j]++; // stochastic rounding
				}
				if (pmap[i][j].layers[GAS] != gasType && newGasVolume[i][j] > 3) {
					if (pmap[i][j].layers[GAS] != NOTHING) {
						newGasVolume[i][j] = min(3, newGasVolume[i][j]); // otherwise interactions between gases are crazy
					}
					pmap[i][j].layers[GAS] = gasType;
				} else if (pmap[i][j].layers[GAS] && newGasVolume[i][j] < 1) {
					pmap[i][j].layers[GAS] = NOTHING;
					refreshDungeonCell(i, j);
				}
				if (pmap[i][j].volume > 0) {
					if (tileCatalog[pmap[i][j].layers[GAS]].mechFlags & TM_GAS_DISSIPATES_QUICKLY) {
						newGasVolume[i][j] -= (rand_percent(50) ? 1 : 0);
					} else if (tileCatalog[pmap[i][j].layers[GAS]].mechFlags & TM_GAS_DISSIPATES) {
						newGasVolume[i][j] -= (rand_percent(20) ? 1 : 0);
					}
				}
			} else if (pmap[i][j].volume > 0) { // if has gas but can't hold gas,
				// disperse gas instantly into neighboring tiles that can hold gas
				numSpaces = 0;
				for (dir = 0; dir < DIRECTION_COUNT; dir++) {
					newX = i + nbDirs[dir][0];
					newY = j + nbDirs[dir][1];
					if (coordinatesAreInMap(newX, newY)
						&& !cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_GAS))
					{
						numSpaces++;
					}
				}
				if (numSpaces > 0) {
					for (dir = 0; dir < DIRECTION_COUNT; dir++) {
						newX = i + nbDirs[dir][0];
						newY = j + nbDirs[dir][1];
						if (coordinatesAreInMap(newX, newY)
							&& !cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_GAS))
						{
							newGasVolume[newX][newY] += Math.floor(pmap[i][j].volume / numSpaces);
							if ( Math.floor(pmap[i][j].volume / numSpaces) ) {
								pmap[newX][newY].layers[GAS] = pmap[i][j].layers[GAS];
							}
						}
					}
				}
				newGasVolume[i][j] = 0;
				pmap[i][j].layers[GAS] = NOTHING;
			}
		}
	}

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (pmap[i][j].volume != newGasVolume[i][j]) {
				pmap[i][j].volume = newGasVolume[i][j];
				refreshDungeonCell(i, j);
			}
		}
	}
}


function updateYendorWardenTracking() {
    let prevMonst;		// creature *
    let n;

    if (!rogue.yendorWarden) {
        return;
    }
    if (rogue.yendorWarden.depth == rogue.depthLevel) {
        return;
    }
    if (!(rogue.yendorWarden.bookkeepingFlags & MB_PREPLACED)) {
        levels[rogue.yendorWarden.depth - 1].mapStorage[rogue.yendorWarden.xLoc][rogue.yendorWarden.yLoc].flags &= ~HAS_MONSTER;
    }
    n = rogue.yendorWarden.depth - 1;

    // remove traversing monster from other level monster chain
    if (rogue.yendorWarden == levels[n].monsters) {
        levels[n].monsters = rogue.yendorWarden.nextCreature;
    } else {
        for (prevMonst = levels[n].monsters; prevMonst.nextCreature != rogue.yendorWarden; prevMonst = prevMonst.nextCreature);
        prevMonst.nextCreature = rogue.yendorWarden.nextCreature;
    }

    if (rogue.yendorWarden.depth > rogue.depthLevel) {
        rogue.yendorWarden.depth = rogue.depthLevel + 1;
        n = rogue.yendorWarden.depth - 1;
        rogue.yendorWarden.bookkeepingFlags |= MB_APPROACHING_UPSTAIRS;
        rogue.yendorWarden.xLoc = levels[n].downStairsLoc[0];
        rogue.yendorWarden.yLoc = levels[n].downStairsLoc[1];
    } else {
        rogue.yendorWarden.depth = rogue.depthLevel - 1;
        n = rogue.yendorWarden.depth - 1;
        rogue.yendorWarden.bookkeepingFlags |= MB_APPROACHING_DOWNSTAIRS;
        rogue.yendorWarden.xLoc = levels[n].upStairsLoc[0];
        rogue.yendorWarden.yLoc = levels[n].upStairsLoc[1];
    }
    rogue.yendorWarden.nextCreature = levels[rogue.yendorWarden.depth - 1].monsters;
    levels[rogue.yendorWarden.depth - 1].monsters = rogue.yendorWarden;
    rogue.yendorWarden.bookkeepingFlags |= MB_PREPLACED;
    rogue.yendorWarden.status[STATUS_ENTERS_LEVEL_IN] = 50;
}

// Monsters who are over chasms or other descent tiles won't fall until this is called.
// This is to avoid having the monster chain change unpredictably in the middle of a turn.
async function monstersFall() {
	let monst, previousCreature, nextCreature;	// creature *
	let x, y;
	const buf = STRING(), buf2 = STRING(); // char[DCOLS];

	// monsters plunge into chasms at the end of the turn
	for (monst = monsters.nextCreature; monst != NULL; monst = nextCreature) {
		nextCreature = monst.nextCreature;
		if ((monst.bookkeepingFlags & MB_IS_FALLING) || monsterShouldFall(monst)) {
			x = monst.xLoc;
			y = monst.yLoc;

			if (canSeeMonster(monst)) {
				monsterName(buf, monst, true);
				sprintf(buf2, "%s plunges out of sight!", buf);
				message(buf2, messageColorFromVictim(monst), false);
			}
      monst.status[STATUS_ENTRANCED] = 0;
			monst.bookkeepingFlags |= MB_PREPLACED;
			monst.bookkeepingFlags &= ~(MB_IS_FALLING | MB_SEIZED | MB_SEIZING);
      monst.targetCorpseLoc[0] = monst.targetCorpseLoc[1] = 0;
      if (monst.info.flags & MONST_GETS_TURN_ON_ACTIVATION) {
          // Guardians and mirrored totems never survive the fall. If they did, they might block the level below.
          await killCreature(monst, false);
      } else if (!await inflictDamage(NULL, monst, randClumpedRange(6, 12, 2), red, false)) {
				demoteMonsterFromLeadership(monst);

				// remove from monster chain
				for (previousCreature = monsters;
					 previousCreature.nextCreature != monst;
					 previousCreature = previousCreature.nextCreature);
				previousCreature.nextCreature = monst.nextCreature;

				// add to next level's chain
				monst.nextCreature = levels[rogue.depthLevel-1 + 1].monsters;
				levels[rogue.depthLevel-1 + 1].monsters = monst;

				monst.depth = rogue.depthLevel + 1;

		    if (monst == rogue.yendorWarden) {
		        updateYendorWardenTracking();
		    }
			}

			pmap[x][y].flags &= ~HAS_MONSTER;
			refreshDungeonCell(x, y);
		}
	}
}

async function updateEnvironment() {
	let i, j, direction, newX, newY;
	let promotions = GRID(DCOLS, DROWS); // short[DCOLS][DROWS];
  let promoteChance;
	let layer;	// enum dungeonLayers
	let tile;	// floorTileType *
	let isVolumetricGas = false;

	await monstersFall();

	// update gases twice
	for (i=0; i<DCOLS && !isVolumetricGas; i++) {
		for (j=0; j<DROWS && !isVolumetricGas; j++) {
			if (!isVolumetricGas && pmap[i][j].layers[GAS]) {
				isVolumetricGas = true;
			}
		}
	}
	if (isVolumetricGas) {
		updateVolumetricMedia();
		updateVolumetricMedia();
	}

	// Do random tile promotions in two passes to keep generations distinct.
	// First pass, make a note of each terrain layer at each coordinate that is going to promote:
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			promotions[i][j] = 0;
			for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
				tile = tileCatalog[pmap[i][j].layers[layer]];
				if (tile.promoteChance < 0) {
					promoteChance = 0;
					for (direction = 0; direction < 4; direction++) {
						if (coordinatesAreInMap(i + nbDirs[direction][0], j + nbDirs[direction][1])
							&& !cellHasTerrainFlag(i + nbDirs[direction][0], j + nbDirs[direction][1], T_OBSTRUCTS_PASSABILITY)
							&& pmap[i + nbDirs[direction][0]][j + nbDirs[direction][1]].layers[layer] != pmap[i][j].layers[layer]
							&& !(pmap[i][j].flags & CAUGHT_FIRE_THIS_TURN))
						{
							promoteChance += -1 * tile.promoteChance;
						}
					}
				} else {
					promoteChance = tile.promoteChance;
				}
				if (promoteChance
					&& !(pmap[i][j].flags & CAUGHT_FIRE_THIS_TURN)
					&& rand_range(0, 10000) < promoteChance)
				{
					promotions[i][j] |= Fl(layer);
					//await promoteTile(i, j, layer, false);
				}
			}
		}
	}
	// Second pass, do the promotions:
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
				if ((promotions[i][j] & Fl(layer)))
				{
					//&& (tileCatalog[pmap[i][j].layers[layer]].promoteChance != 0)){
					// make sure that it's still a promotable layer
					await promoteTile(i, j, layer, false);
				}
			}
		}
	}

	// Bookkeeping for fire, pressure plates and key-activated tiles.
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			pmap[i][j].flags &= ~(CAUGHT_FIRE_THIS_TURN);
			if (!(pmap[i][j].flags & (HAS_PLAYER | HAS_MONSTER | HAS_ITEM))
                && (pmap[i][j].flags & PRESSURE_PLATE_DEPRESSED))
			{
				pmap[i][j].flags &= ~PRESSURE_PLATE_DEPRESSED;
			}
			if (cellHasTMFlag(i, j, TM_PROMOTES_WITHOUT_KEY) && !keyOnTileAt(i, j)) {
				for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
					if (tileCatalog[pmap[i][j].layers[layer]].mechFlags & TM_PROMOTES_WITHOUT_KEY) {
						await promoteTile(i, j, layer, false);
					}
				}
			}
		}
	}

	// Update fire.
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (cellHasTerrainFlag(i, j, T_IS_FIRE) && !(pmap[i][j].flags & CAUGHT_FIRE_THIS_TURN)) {
				await exposeTileToFire(i, j, false);
				for (direction=0; direction<4; direction++) {
					newX = i + nbDirs[direction][0];
					newY = j + nbDirs[direction][1];
					if (coordinatesAreInMap(newX, newY)) {
						await exposeTileToFire(newX, newY, false);
					}
				}
			}
		}
	}

  // Terrain that affects items and vice versa
  await updateFloorItems();
}

function updateAllySafetyMap() {
	let i, j;
	let playerCostMap, monsterCostMap;

	rogue.updatedAllySafetyMapThisTurn = true;

	playerCostMap = allocGrid();
	monsterCostMap = allocGrid();

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			allySafetyMap[i][j] = 30000;

			playerCostMap[i][j] = monsterCostMap[i][j] = 1;

			if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)
                && (!cellHasTMFlag(i, j, TM_IS_SECRET) || (discoveredTerrainFlagsAtLoc(i, j) & T_OBSTRUCTS_PASSABILITY)))
			{
				playerCostMap[i][j] = monsterCostMap[i][j] = cellHasTerrainFlag(i, j, T_OBSTRUCTS_DIAGONAL_MOVEMENT) ? PDS_OBSTRUCTION : PDS_FORBIDDEN;
			} else if (cellHasTerrainFlag(i, j, T_PATHING_BLOCKER & ~T_OBSTRUCTS_PASSABILITY)) {
				playerCostMap[i][j] = monsterCostMap[i][j] = PDS_FORBIDDEN;
			} else if (cellHasTerrainFlag(i, j, T_SACRED)) {
					playerCostMap[i][j] = 1;
					monsterCostMap[i][j] = PDS_FORBIDDEN;
			} else if ((pmap[i][j].flags & HAS_MONSTER) && monstersAreEnemies(player, monsterAtLoc(i, j))) {
				playerCostMap[i][j] = 1;
				monsterCostMap[i][j] = PDS_FORBIDDEN;
				allySafetyMap[i][j] = 0;
			}
		}
	}

	playerCostMap[player.xLoc][player.yLoc] = PDS_FORBIDDEN;
	monsterCostMap[player.xLoc][player.yLoc] = PDS_FORBIDDEN;

	dijkstraScan(allySafetyMap, playerCostMap, false);

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (monsterCostMap[i][j] < 0) {
				continue;
			}

			if (allySafetyMap[i][j] == 30000) {
				allySafetyMap[i][j] = 150;
			}

			allySafetyMap[i][j] = Math.floor(50 * allySafetyMap[i][j] / (50 + allySafetyMap[i][j]));

			allySafetyMap[i][j] *= -3;

			if (pmap[i][j].flags & IN_LOOP) {
				allySafetyMap[i][j] -= 10;
			}
		}
	}
	dijkstraScan(allySafetyMap, monsterCostMap, false);

	freeGrid(playerCostMap);
	freeGrid(monsterCostMap);
}

function resetDistanceCellInGrid(grid, x, y) {
    let dir;
    let newX, newY;
    for (dir = 0; dir < 4; dir++) {
        newX = x + nbDirs[dir][0];
        newY = y + nbDirs[dir][1];
        if (coordinatesAreInMap(newX, newY)
            && grid[x][y] > grid[newX][newY] + 1)
				{
            grid[x][y] = grid[newX][newY] + 1;
        }
    }
}

function updateSafetyMap() {
	let i, j;
	let playerCostMap, monsterCostMap;
	let monst;	// creature *

	rogue.updatedSafetyMapThisTurn = true;

	playerCostMap = allocGrid();
	monsterCostMap = allocGrid();

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			safetyMap[i][j] = 30000;

			playerCostMap[i][j] = monsterCostMap[i][j] = 1; // prophylactic

			if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)
            && (!cellHasTMFlag(i, j, TM_IS_SECRET) || (discoveredTerrainFlagsAtLoc(i, j) & T_OBSTRUCTS_PASSABILITY)))
			{
				playerCostMap[i][j] = monsterCostMap[i][j] = cellHasTerrainFlag(i, j, T_OBSTRUCTS_DIAGONAL_MOVEMENT) ? PDS_OBSTRUCTION : PDS_FORBIDDEN;
			} else if (cellHasTerrainFlag(i, j, T_SACRED)) {
					playerCostMap[i][j] = 1;
					monsterCostMap[i][j] = PDS_FORBIDDEN;
			} else if (cellHasTerrainFlag(i, j, T_LAVA_INSTA_DEATH)) {
        monsterCostMap[i][j] = PDS_FORBIDDEN;
        if (player.status[STATUS_LEVITATING] || !player.status[STATUS_IMMUNE_TO_FIRE]) {
            playerCostMap[i][j] = 1;
        } else {
            playerCostMap[i][j] = PDS_FORBIDDEN;
        }
			} else {
				if (pmap[i][j].flags & HAS_MONSTER) {
					monst = monsterAtLoc(i, j);
					if ((monst.creatureState == MONSTER_SLEEPING
						 || monst.turnsSpentStationary > 2
             || (monst.info.flags & MONST_GETS_TURN_ON_ACTIVATION)
						 || monst.creatureState == MONSTER_ALLY)
						&& monst.creatureState != MONSTER_FLEEING)
					{
						playerCostMap[i][j] = 1;
						monsterCostMap[i][j] = PDS_FORBIDDEN;
						continue;
					}
				}

				if (cellHasTerrainFlag(i, j, (T_AUTO_DESCENT | T_IS_DF_TRAP))) {
					monsterCostMap[i][j] = PDS_FORBIDDEN;
          if (player.status[STATUS_LEVITATING]) {
              playerCostMap[i][j] = 1;
          } else {
              playerCostMap[i][j] = PDS_FORBIDDEN;
          }
				} else if (cellHasTerrainFlag(i, j, T_IS_FIRE)) {
					monsterCostMap[i][j] = PDS_FORBIDDEN;
          if (player.status[STATUS_IMMUNE_TO_FIRE]) {
              playerCostMap[i][j] = 1;
          } else {
              playerCostMap[i][j] = PDS_FORBIDDEN;
          }
				} else if (cellHasTerrainFlag(i, j, (T_IS_DEEP_WATER | T_SPONTANEOUSLY_IGNITES))) {
          if (player.status[STATUS_LEVITATING]) {
              playerCostMap[i][j] = 1;
          } else {
              playerCostMap[i][j] = 5;
          }
					monsterCostMap[i][j] = 5;
        } else if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)
                   && cellHasTMFlag(i, j, TM_IS_SECRET) && !(discoveredTerrainFlagsAtLoc(i, j) & T_OBSTRUCTS_PASSABILITY)
                   && !(pmap[i][j].flags & IN_FIELD_OF_VIEW))
			 {
            // Secret door that the player can't currently see
            playerCostMap[i][j] = 100;
            monsterCostMap[i][j] = 1;
				} else {
					playerCostMap[i][j] = monsterCostMap[i][j] = 1;
				}
			}
		}
	}

	safetyMap[player.xLoc][player.yLoc] = 0;
	playerCostMap[player.xLoc][player.yLoc] = 1;
	monsterCostMap[player.xLoc][player.yLoc] = PDS_FORBIDDEN;

	playerCostMap[rogue.upLoc[0]][rogue.upLoc[1]] = PDS_FORBIDDEN;
	monsterCostMap[rogue.upLoc[0]][rogue.upLoc[1]] = PDS_FORBIDDEN;
	playerCostMap[rogue.downLoc[0]][rogue.downLoc[1]] = PDS_FORBIDDEN;
	monsterCostMap[rogue.downLoc[0]][rogue.downLoc[1]] = PDS_FORBIDDEN;

	dijkstraScan(safetyMap, playerCostMap, false);

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
      if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)
          && cellHasTMFlag(i, j, TM_IS_SECRET) && !(discoveredTerrainFlagsAtLoc(i, j) & T_OBSTRUCTS_PASSABILITY)
          && !(pmap[i][j].flags & IN_FIELD_OF_VIEW))
			{
          // Secret doors that the player can't see are not particularly safe themselves;
          // the areas behind them are.
          resetDistanceCellInGrid(safetyMap, i, j);
      }
    }
  }

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (monsterCostMap[i][j] < 0) {
				continue;
			}

			if (safetyMap[i][j] == 30000) {
				safetyMap[i][j] = 150;
			}

			safetyMap[i][j] = Math.floor(50 * safetyMap[i][j] / (50 + safetyMap[i][j]));

			safetyMap[i][j] *= -3;

			if (pmap[i][j].flags & IN_LOOP) {
				safetyMap[i][j] -= 10;
			}
		}
	}
	dijkstraScan(safetyMap, monsterCostMap, false);
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (monsterCostMap[i][j] < 0) {
				safetyMap[i][j] = 30000;
			}
		}
	}
	freeGrid(playerCostMap);
	freeGrid(monsterCostMap);
}

function updateSafeTerrainMap() {
	let i, j;
	let costMap;
	let monst;		// creature *

	rogue.updatedMapToSafeTerrainThisTurn = true;
	costMap = allocGrid();

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			monst = monsterAtLoc(i, j);
			if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)
                && (!cellHasTMFlag(i, j, TM_IS_SECRET) || (discoveredTerrainFlagsAtLoc(i, j) & T_OBSTRUCTS_PASSABILITY)))
			{
				costMap[i][j] = cellHasTerrainFlag(i, j, T_OBSTRUCTS_DIAGONAL_MOVEMENT) ? PDS_OBSTRUCTION : PDS_FORBIDDEN;
				rogue.mapToSafeTerrain[i][j] = 30000; // OOS prophylactic
			} else if ((monst && (monst.turnsSpentStationary > 1 || (monst.info.flags & MONST_GETS_TURN_ON_ACTIVATION)))
                       || (cellHasTerrainFlag(i, j, T_PATHING_BLOCKER & ~T_HARMFUL_TERRAIN) && !cellHasTMFlag(i, j, TM_IS_SECRET)))
		  {
				costMap[i][j] = PDS_FORBIDDEN;
				rogue.mapToSafeTerrain[i][j] = 30000;
			} else if (cellHasTerrainFlag(i, j, T_HARMFUL_TERRAIN) || pmap[i][j].layers[DUNGEON] == DOOR) {
				// The door thing is an aesthetically offensive but necessary hack to make sure
				// that monsters trying to find their way out of caustic gas do not sprint for
				// the doors. Doors are superficially free of gas, but as soon as they are opened,
				// gas will fill their tile, so they are not actually safe. Without this fix,
				// allies will fidget back and forth in a doorway while they asphyxiate.
				// This will have to do. It's a difficult problem to solve elegantly.
				costMap[i][j] = 1;
				rogue.mapToSafeTerrain[i][j] = 30000;
			} else {
				costMap[i][j] = 1;
				rogue.mapToSafeTerrain[i][j] = 0;
			}
		}
	}
	dijkstraScan(rogue.mapToSafeTerrain, costMap, false);
	freeGrid(costMap);
}


function processIncrementalAutoID() {
  let theItem; // item *
	let autoIdentifyItems = [rogue.armor, rogue.ringLeft, rogue.ringRight];
  const buf = STRING(), theItemName = STRING(); // char[DCOLS*3];
  let i;

	for (i=0; i<3; i++) {
		theItem = autoIdentifyItems[i];
		if (theItem
			&& theItem.charges > 0
			&& (!(theItem.flags & ITEM_IDENTIFIED) || ((theItem.category & RING) && !ringTable[theItem.kind].identified)))
		{
			theItem.charges--;
			if (theItem.charges <= 0) {
				itemName(theItem, theItemName, false, false, NULL);
				sprintf(buf, "you are now familiar enough with your %s to identify it.", theItemName);
				message(buf, itemMessageColor, false);

				if (theItem.category & ARMOR) {
					// Don't necessarily reveal the armor's runic specifically, just that it has one.
					theItem.flags |= ITEM_IDENTIFIED;
				} else if (theItem.category & RING) {
					identify(theItem);
				}
				updateIdentifiableItems();

				itemName(theItem, theItemName, true, true, NULL);
				sprintf(buf, "%s %s.", (theItem.quantity > 1 ? "they are" : "it is"), theItemName);
				message(buf, itemMessageColor, false);
			}
		}
	}
}

function staffChargeDuration( /* item */ theItem) {
    // staffs of blinking and obstruction recharge half as fast so they're less powerful
    return Math.floor((theItem.kind == STAFF_BLINKING || theItem.kind == STAFF_OBSTRUCTION ? 10000 : 5000) / theItem.enchant1);
}

// Multiplier can be negative, in which case staffs and charms will be drained instead of recharged.
function rechargeItemsIncrementally(multiplier) {
	let theItem;		// item *
	const buf = STRING(), theItemName = STRING(); // char[DCOLS*3];
	let rechargeIncrement, staffRechargeDuration;

	if (rogue.wisdomBonus) {
		rechargeIncrement = fp_ringWisdomMultiplier(rogue.wisdomBonus << FP_BASE); // at level 27, you recharge anything to full in one turn
	} else {
		rechargeIncrement = 10;
	}

  rechargeIncrement *= multiplier;

	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		if (theItem.category & STAFF) {
      if (theItem.charges < theItem.enchant1 && rechargeIncrement > 0
          || theItem.charges > 0 && rechargeIncrement < 0)
			{
          theItem.enchant2 -= rechargeIncrement;
      }
      staffRechargeDuration = staffChargeDuration(theItem);
      while (theItem.enchant2 <= 0) {
          // if it's time to add a staff charge
          if (theItem.charges < theItem.enchant1) {
              theItem.charges++;
          }
          theItem.enchant2 += randClumpedRange(max(staffRechargeDuration / 3, 1), staffRechargeDuration * 5 / 3, 3);
      }
      while (theItem.enchant2 > staffRechargeDuration * 5 / 3) {
          // if it's time to drain a staff charge
          if (theItem.charges > 0) {
              theItem.charges--;
          }
          theItem.enchant2 -= staffRechargeDuration;
      }
		} else if ((theItem.category & CHARM) && (theItem.charges > 0)) {
      theItem.charges = clamp(theItem.charges - multiplier, 0, charmRechargeDelay(theItem.kind, theItem.enchant1));
      if (theItem.charges == 0) {
				itemName(theItem, theItemName, false, false, NULL);
				sprintf(buf, "your %s has recharged.", theItemName);
        message(buf, false);
      }
    }
	}
}


function extinguishFireOnCreature( /* creature */ monst) {

	monst.status[STATUS_BURNING] = 0;
	if (monst === player) {
		player.info.foreColor = white;
		rogue.minersLight.lightColor = minersLightColor;
		refreshDungeonCell(player.xLoc, player.yLoc);
		updateVision(true);
		message("you are no longer on fire.", false);
	}
}

// n is the monster's depthLevel - 1.
async function monsterEntersLevel( /* creature */ monst, n) {
  let prevMonst;	// creature *
	const monstName = STRING(), buf = STRING(); // char[COLS];
	let pit = false;

  // place traversing monster near the stairs on this level
  if (monst.bookkeepingFlags & MB_APPROACHING_DOWNSTAIRS) {
      monst.xLoc = rogue.upLoc[0];
      monst.yLoc = rogue.upLoc[1];
  } else if (monst.bookkeepingFlags & MB_APPROACHING_UPSTAIRS) {
      monst.xLoc = rogue.downLoc[0];
      monst.yLoc = rogue.downLoc[1];
  } else if (monst.bookkeepingFlags & MB_APPROACHING_PIT) { // jumping down pit
      pit = true;
      monst.xLoc = levels[n].playerExitedVia[0];
      monst.yLoc = levels[n].playerExitedVia[1];
  } else {
      brogueAssert(false);
  }
  monst.depth = rogue.depthLevel;
  monst.targetCorpseLoc[0] = monst.targetCorpseLoc[1] = 0;

  if (!pit) {
      const loc = getQualifyingPathLocNear(monst.xLoc, monst.yLoc, true,
                               T_DIVIDES_LEVEL & avoidedFlagsForMonster(monst.info), 0,
                               avoidedFlagsForMonster(monst.info), HAS_STAIRS, false);
			if (!loc) ERROR('EXPECTED LOCATION');
			monst.xLoc = loc[0];
			monst.yLoc = loc[1];
  }
  if (!pit
      && (pmap[monst.xLoc][monst.yLoc].flags & (HAS_PLAYER | HAS_MONSTER))
      && !(terrainFlags(monst.xLoc, monst.yLoc) & avoidedFlagsForMonster(monst.info)))
	{
      // Monsters using the stairs will displace any creatures already located there, to thwart stair-dancing.
      prevMonst = monsterAtLoc(monst.xLoc, monst.yLoc);
      brogueAssert(prevMonst);
      const loc = getQualifyingPathLocNear(monst.xLoc, monst.yLoc, true,
                               T_DIVIDES_LEVEL & avoidedFlagsForMonster(prevMonst.info), 0,
                               avoidedFlagsForMonster(prevMonst.info), (HAS_MONSTER | HAS_PLAYER | HAS_STAIRS), false);
		  if (!loc) ERROR('EXPECTED LOCATION');
			prevMonst.xLoc = loc[0];
			prevMonst.yLoc = loc[1];

      pmap[monst.xLoc][monst.yLoc].flags &= ~(HAS_PLAYER | HAS_MONSTER);
      pmap[prevMonst.xLoc][prevMonst.yLoc].flags |= (prevMonst === player ? HAS_PLAYER : HAS_MONSTER);
      refreshDungeonCell(prevMonst.xLoc, prevMonst.yLoc);
      //DEBUG printf("\nBumped a creature (%s) from (%i, %i) to (%i, %i).", prevMonst.info.monsterName, monst.xLoc, monst.yLoc, prevMonst.xLoc, prevMonst.yLoc);
  }

  // remove traversing monster from other level monster chain
  if (monst == levels[n].monsters) {
      levels[n].monsters = monst.nextCreature;
  } else {
      for (prevMonst = levels[n].monsters; prevMonst.nextCreature != monst; prevMonst = prevMonst.nextCreature);
      prevMonst.nextCreature = monst.nextCreature;
  }

  // prepend traversing monster to current level monster chain
  monst.nextCreature = monsters.nextCreature;
  monsters.nextCreature = monst;

  monst.status[STATUS_ENTERS_LEVEL_IN] = 0;
  monst.bookkeepingFlags |= MB_PREPLACED;
  monst.bookkeepingFlags &= ~MB_IS_FALLING;
  restoreMonster(monst, NULL, NULL);
  //DEBUG printf("\nPlaced a creature (%s) at (%i, %i).", monst.info.monsterName, monst.xLoc, monst.yLoc);
  monst.ticksUntilTurn = monst.movementSpeed;
  refreshDungeonCell(monst.xLoc, monst.yLoc);

  if (pit) {
      monsterName(monstName, monst, true);
      if (!monst.status[STATUS_LEVITATING]) {
          if (await inflictDamage(NULL, monst, randClumpedRange(6, 12, 2), red, false)) {
              if (canSeeMonster(monst)) {
                  sprintf(buf, "%s plummets from above and splatters against the ground!", monstName);
                  message(buf, messageColorFromVictim(monst), false);
              }
          } else {
              if (canSeeMonster(monst)) {
                  sprintf(buf, "%s falls from above and crashes to the ground!", monstName);
                  message(buf, false);
              }
          }
      } else if (canSeeMonster(monst)) {
          sprintf(buf, "%s swoops into the cavern from above.", monstName);
          message(buf, false);
      }
  }
}


async function monstersApproachStairs() {
	let monst, nextMonst;		// creature *
	let n;

	for (n = rogue.depthLevel - 2; n <= rogue.depthLevel; n += 2) { // cycle through previous and next level
		if (n >= 0 && n < DEEPEST_LEVEL && levels[n].visited) {
			for (monst = levels[n].monsters; monst != NULL;) {
				nextMonst = monst.nextCreature;
				if (monst.status[STATUS_ENTERS_LEVEL_IN] > 1) {
					monst.status[STATUS_ENTERS_LEVEL_IN]--;
				} else if (monst.status[STATUS_ENTERS_LEVEL_IN] == 1) {
            await monsterEntersLevel(monst, n);
        }
				monst = nextMonst;
			}
		}
	}

    if (rogue.yendorWarden
        && abs(rogue.depthLevel - rogue.yendorWarden.depth) > 1)
		{
        updateYendorWardenTracking();
    }
}

async function decrementPlayerStatus() {
    // Handle hunger.
    if (!player.status[STATUS_PARALYZED]) {
      // No nutrition is expended while paralyzed.
      if (player.status[STATUS_NUTRITION] > 0) {
          if (!numberOfMatchingPackItems(AMULET, 0, 0, false) || rand_percent(20)) {
              player.status[STATUS_NUTRITION]--;
          }
      }
      await checkNutrition();
    }

	if (player.status[STATUS_TELEPATHIC] > 0 && !--player.status[STATUS_TELEPATHIC]) {
		updateVision(true);
		message("your preternatural mental sensitivity fades.", false);
	}

	if (player.status[STATUS_DARKNESS] > 0) {
		player.status[STATUS_DARKNESS]--;
		updateMinersLightRadius();
		//updateVision();
	}

	if (player.status[STATUS_HALLUCINATING] > 0 && !--player.status[STATUS_HALLUCINATING]) {
		displayLevel();
		message("your hallucinations fade.", false);
	}

	if (player.status[STATUS_LEVITATING] > 0 && !--player.status[STATUS_LEVITATING]) {
		message("you are no longer levitating.", false);
	}

	if (player.status[STATUS_CONFUSED] > 0 && !--player.status[STATUS_CONFUSED]) {
		message("you no longer feel confused.", false);
	}

	if (player.status[STATUS_NAUSEOUS] > 0 && !--player.status[STATUS_NAUSEOUS]) {
		message("you feel less nauseous.", false);
	}

	if (player.status[STATUS_PARALYZED] > 0 && !--player.status[STATUS_PARALYZED]) {
		message("you can move again.", false);
	}

	if (player.status[STATUS_HASTED] > 0 && !--player.status[STATUS_HASTED]) {
		player.movementSpeed = player.info.movementSpeed;
		player.attackSpeed = player.info.attackSpeed;
    synchronizePlayerTimeState();
		message("your supernatural speed fades.", false);
	}

	if (player.status[STATUS_SLOWED] > 0 && !--player.status[STATUS_SLOWED]) {
		player.movementSpeed = player.info.movementSpeed;
		player.attackSpeed = player.info.attackSpeed;
    synchronizePlayerTimeState();
		message("your normal speed resumes.", false);
	}

	if (player.status[STATUS_WEAKENED] > 0 && !--player.status[STATUS_WEAKENED]) {
		player.weaknessAmount = 0;
		message("strength returns to your muscles as the weakening toxin wears off.", false);
		updateEncumbrance();
	}

    if (player.status[STATUS_DONNING]) {
        player.status[STATUS_DONNING]--;
        recalculateEquipmentBonuses();
    }

	if (player.status[STATUS_IMMUNE_TO_FIRE] > 0 && !--player.status[STATUS_IMMUNE_TO_FIRE]) {
		message("you no longer feel immune to fire.", false);
	}

	if (player.status[STATUS_STUCK] && !cellHasTerrainFlag(player.xLoc, player.yLoc, T_ENTANGLES)) {
		player.status[STATUS_STUCK] = 0;
	}

	if (player.status[STATUS_EXPLOSION_IMMUNITY]) {
		player.status[STATUS_EXPLOSION_IMMUNITY]--;
	}

	if (player.status[STATUS_DISCORDANT]) {
		player.status[STATUS_DISCORDANT]--;
	}

	if (player.status[STATUS_AGGRAVATING]) {
		player.status[STATUS_AGGRAVATING]--;
	}

	if (player.status[STATUS_SHIELDED]) {
		player.status[STATUS_SHIELDED] -= player.maxStatus[STATUS_SHIELDED] / 20;
        if (player.status[STATUS_SHIELDED] <= 0) {
            player.status[STATUS_SHIELDED] = player.maxStatus[STATUS_SHIELDED] = 0;
        }
	}

	if (player.status[STATUS_INVISIBLE] > 0 && !--player.status[STATUS_INVISIBLE]) {
		message("you are no longer invisible.", false);
	}

	if (rogue.monsterSpawnFuse <= 0) {
		await spawnPeriodicHorde();
		rogue.monsterSpawnFuse = rand_range(125, 175);
	}
}

function dangerChanged(danger /* boolean[4] */) {
    let dir;
    let newX, newY;
    for (dir = 0; dir < 4; dir++) {
        newX = player.xLoc + nbDirs[dir][0];
        newY = player.yLoc + nbDirs[dir][1];
        if (danger[dir] != monsterAvoids(player, newX, newY)) {
            return true;
        }
    }
    return false;
}

async function autoRest() {
	let i = 0;
	let initiallyEmbedded; // Stop as soon as we're free from crystal.
	const danger = []; // boolean[4];
	let newX, newY;
	let dir;

	for (dir = 0; dir < 4; dir++) {
			newX = player.xLoc + nbDirs[dir][0];
			newY = player.yLoc + nbDirs[dir][1];
			danger[dir] = monsterAvoids(player, newX, newY);
	}

	rogue.disturbed = false;
	rogue.automationActive = true;
	initiallyEmbedded = cellHasTerrainFlag(player.xLoc, player.yLoc, T_OBSTRUCTS_PASSABILITY);

	if ((player.currentHP < player.info.maxHP
		 || player.status[STATUS_HALLUCINATING]
		 || player.status[STATUS_CONFUSED]
		 || player.status[STATUS_NAUSEOUS]
		 || player.status[STATUS_POISONED]
		 || player.status[STATUS_DARKNESS]
		 || initiallyEmbedded)
		&& !rogue.disturbed)
	{
		while (i++ < TURNS_FOR_FULL_REGEN
			   && (player.currentHP < player.info.maxHP
				   || player.status[STATUS_HALLUCINATING]
				   || player.status[STATUS_CONFUSED]
				   || player.status[STATUS_NAUSEOUS]
				   || player.status[STATUS_POISONED]
				   || player.status[STATUS_DARKNESS]
				   || cellHasTerrainFlag(player.xLoc, player.yLoc, T_OBSTRUCTS_PASSABILITY))
			   && !rogue.disturbed
			   && (!initiallyEmbedded || cellHasTerrainFlag(player.xLoc, player.yLoc, T_OBSTRUCTS_PASSABILITY)))
	 {
			recordKeystroke(REST_KEY, false, false);
			rogue.justRested = true;
			await playerTurnEnded();
			if (dangerChanged(danger) || await pauseBrogue(1)) {
				rogue.disturbed = true;
			}
		}
	} else {
		for (i=0; i<100 && !rogue.disturbed; i++) {
			recordKeystroke(REST_KEY, false, false);
			rogue.justRested = true;
			await playerTurnEnded();
			//refreshSideBar(-1, -1, false);
			if (dangerChanged(danger) || await pauseBrogue(1)) {
				rogue.disturbed = true;
			}
			//refreshSideBar(-1, -1, false);
		}
	}
	rogue.automationActive = false;
}


async function searchTurn() {
    let foundSomething = false;
    recordKeystroke(SEARCH_KEY, false, false);
    if (player.status[STATUS_SEARCHING] <= 0) {
        player.status[STATUS_SEARCHING] = player.maxStatus[STATUS_SEARCHING] = 5;
    } else {
        player.status[STATUS_SEARCHING]--;
        if (player.status[STATUS_SEARCHING] <= 0) {
            // Manual search complete!
            foundSomething = await search(200);
            if (foundSomething) {
                message("you finish searching the area.", false);
            } else {
                message("you finish searching the area, but find nothing.", false);
            }
        }
    }
    rogue.justSearched = true;
    await playerTurnEnded();
}

async function manualSearch() {
    if (rogue.playbackMode) {
        await searchTurn();
    } else {
        rogue.disturbed = false;
        rogue.automationActive = true;
        do {
            await searchTurn();
            if (await pauseBrogue(80)) {
                rogue.disturbed = true;
            }
        } while (player.status[STATUS_SEARCHING] > 0 && !rogue.disturbed);
        rogue.automationActive = false;
    }
}


// Call this periodically (when haste/slow wears off and when moving between depths)
// to keep environmental updates in sync with player turns.
function synchronizePlayerTimeState() {
    rogue.ticksTillUpdateEnvironment = player.ticksUntilTurn;
}

function playerRecoversFromAttacking(anAttackHit) {
    if (player.ticksUntilTurn >= 0) {
        // Don't do this if the player's weapon of speed just fired.
        if (rogue.weapon && (rogue.weapon.flags & ITEM_ATTACKS_STAGGER) && anAttackHit) {		// ITEM_ATTACKS_HIT_SLOWLY
            player.ticksUntilTurn += 2 * player.attackSpeed;
        } else if (rogue.weapon && (rogue.weapon.flags & ITEM_ATTACKS_QUICKLY)) {
            player.ticksUntilTurn += player.attackSpeed / 2;
        } else {
            player.ticksUntilTurn += player.attackSpeed;
        }
    }
}

// This is the dungeon schedule manager, called every time the player's turn comes to an end.
// It hands control over to monsters until they've all expended their accumulated ticks,
// updating the environment (gas spreading, flames spreading and burning out, etc.) every
// 100 ticks.
async function playerTurnEnded() {
	let soonestTurn, damage, turnsRequiredToShore, turnsToShore;
	const buf = STRING(), buf2 = STRING(); // char[COLS];
	let monst, monst2, nextMonst;		// creature *
	let fastForward = false;

  brogueAssert(rogue.RNG == RNG_SUBSTANTIVE);

	handleXPXP();
	resetDFMessageEligibility();

	if (player.bookkeepingFlags & MB_IS_FALLING) {
		await playerFalls();
    if (!rogue.gameHasEnded) {
        await handleHealthAlerts();
    }
		return;
	}

	do {
		if (rogue.gameHasEnded) {
			return;
		}

		if (!player.status[STATUS_PARALYZED]) {
			rogue.playerTurnNumber++; // So recordings don't register more turns than you actually have.
		}
    rogue.absoluteTurnNumber++;

    if (player.status[STATUS_INVISIBLE]) {
        rogue.scentTurnNumber += 10; // Your scent fades very quickly while you are invisible.
    } else {
        rogue.scentTurnNumber += 3; // this must happen per subjective player time
    }
		if (rogue.scentTurnNumber > 20000) {
			resetScentTurnNumber();
		}

		//updateFlavorText();

		// Regeneration/starvation:
		if (player.status[STATUS_NUTRITION] <= 0) {
			player.currentHP--;
			if (player.currentHP <= 0) {
				await gameOver("Starved to death", true);
				return;
			}
		} else if (player.currentHP < player.info.maxHP
				   && !player.status[STATUS_POISONED])
	  {
			if ((player.turnsUntilRegen -= 1000) <= 0) {
				player.currentHP++;
				if (player.previousHealthPoints < player.currentHP) {
						player.previousHealthPoints++; // Regeneration doesn't display on the status bar.
				}
				player.turnsUntilRegen += player.info.turnsBetweenRegen;
			}
			if (player.regenPerTurn) {
				player.currentHP += player.regenPerTurn;
				if (player.previousHealthPoints < player.currentHP) {
						player.previousHealthPoints = min(player.currentHP, player.previousHealthPoints + player.regenPerTurn);
				}
			}
		}

		if (rogue.awarenessBonus > -30 && !(pmap[player.xLoc][player.yLoc].flags & SEARCHED_FROM_HERE)) {
			await search(rogue.awarenessBonus + 30);
			pmap[player.xLoc][player.yLoc].flags |= SEARCHED_FROM_HERE;
		}
    if (!rogue.justSearched && player.status[STATUS_SEARCHING] > 0) {
        // If you don't resume manually searching when interrupted, abort the search and post a message.
        player.status[STATUS_SEARCHING] = 0;
        message("you abandon your search.", false);
    }

		if (rogue.staleLoopMap) {
			analyzeMap(false); // Don't need to update the chokemap.
		}

		for (monst = monsters.nextCreature; monst != NULL; monst = nextMonst) {
			nextMonst = monst.nextCreature;
			if ((monst.bookkeepingFlags & MB_BOUND_TO_LEADER)
				&& (!monst.leader || !(monst.bookkeepingFlags & MB_FOLLOWER))
				&& (monst.creatureState != MONSTER_ALLY))
			{
				await killCreature(monst, false);
				if (canSeeMonster(monst)) {
					monsterName(buf2, monst, true);
					sprintf(buf, "%s dissipates into thin air", buf2);
					combatMessage(buf, messageColorFromVictim(monst));
				}
			}
		}

		if (player.status[STATUS_BURNING] > 0) {
			damage = rand_range(1, 3);
			if (!(player.status[STATUS_IMMUNE_TO_FIRE]) && await inflictDamage(NULL, player, damage, orange, true)) {
				await gameOver("Burned to death", true);
			}
			if (!--player.status[STATUS_BURNING]) {
				player.status[STATUS_BURNING]++; // ugh
				extinguishFireOnCreature(player);
			}
		}

		if (player.status[STATUS_POISONED] > 0) {
			player.status[STATUS_POISONED]--;
			if (await inflictDamage(NULL, player, player.poisonAmount, green, true)) {
				await gameOver("Died from poison", true);
			}
      if (!player.status[STATUS_POISONED]) {
          player.poisonAmount = 0;
      }
		}

		if (player.ticksUntilTurn == 0) { // attacking adds ticks elsewhere
			player.ticksUntilTurn += player.movementSpeed;
		} else if (player.ticksUntilTurn < 0) { // if he gets a free turn
			player.ticksUntilTurn = 0;
		}

		updateScent();
//		updateVision(true);
//        rogue.aggroRange = currentAggroValue();
//        if (rogue.displayAggroRangeMode) {
//            displayLevel();
//        }
		rogue.updatedSafetyMapThisTurn			= false;
		rogue.updatedAllySafetyMapThisTurn		= false;
		rogue.updatedMapToSafeTerrainThisTurn	= false;

		for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
			if (D_SAFETY_VISION || monst.creatureState == MONSTER_FLEEING && pmap[monst.xLoc][monst.yLoc].flags & IN_FIELD_OF_VIEW) {
				updateSafetyMap(); // only if there is a fleeing monster who can see the player
				break;
			}
		}

		if (D_BULLET_TIME && !rogue.justRested) {
			player.ticksUntilTurn = 0;
		}

		await applyGradualTileEffectsToCreature(player, player.ticksUntilTurn);

		if (rogue.gameHasEnded) {
			return;
		}

		rogue.heardCombatThisTurn = false;

		while (player.ticksUntilTurn > 0) {
			soonestTurn = 10000;
			for(monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
				soonestTurn = min(soonestTurn, monst.ticksUntilTurn);
			}
			soonestTurn = min(soonestTurn, player.ticksUntilTurn);
			soonestTurn = min(soonestTurn, rogue.ticksTillUpdateEnvironment);
			for(monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
				monst.ticksUntilTurn -= soonestTurn;
			}
			rogue.ticksTillUpdateEnvironment -= soonestTurn;
			if (rogue.ticksTillUpdateEnvironment <= 0) {
				rogue.ticksTillUpdateEnvironment += 100;

				// stuff that happens periodically according to an objective time measurement goes here:
				rechargeItemsIncrementally(1); // staffs recharge every so often
        processIncrementalAutoID();   // become more familiar with worn armor and rings
				rogue.monsterSpawnFuse--; // monsters spawn in the level every so often

				for (monst = monsters.nextCreature; monst != NULL;) {
					nextMonst = monst.nextCreature;
					await applyInstantTileEffectsToCreature(monst);
					monst = nextMonst; // this weirdness is in case the monster dies in the previous step
				}

				for (monst = monsters.nextCreature; monst != NULL;) {
					nextMonst = monst.nextCreature;
					await decrementMonsterStatus(monst);
					monst = nextMonst;
				}

				// monsters with a dungeon feature spawn it every so often
				for (monst = monsters.nextCreature; monst != NULL;) {
					nextMonst = monst.nextCreature;
					if (monst.info.DFChance
              && !(monst.info.flags & MONST_GETS_TURN_ON_ACTIVATION)
              && rand_percent(monst.info.DFChance))
					{
						await spawnDungeonFeature(monst.xLoc, monst.yLoc, dungeonFeatureCatalog[monst.info.DFType], true, false);
					}
					monst = nextMonst;
				}

				await updateEnvironment(); // Update fire and gas, items floating around in water, monsters falling into chasms, etc.
				await decrementPlayerStatus();
				await applyInstantTileEffectsToCreature(player);
				if (rogue.gameHasEnded) { // caustic gas, lava, trapdoor, etc.
					return;
				}
				await monstersApproachStairs();

				if (player.ticksUntilTurn > 100 && !fastForward) {
						fastForward = rogue.playbackFastForward || await pauseBrogue(25);
				}

        // Rolling waypoint refresh:
        rogue.wpRefreshTicker++;
        if (rogue.wpRefreshTicker >= rogue.wpCount) {
            rogue.wpRefreshTicker = 0;
        }
        refreshWaypoint(rogue.wpRefreshTicker);
			}

			let monsterActed = false;
			for (monst = monsters.nextCreature; (monst != NULL) && (rogue.gameHasEnded == false); monst = monst.nextCreature) {
				if (monst.ticksUntilTurn <= 0) {
          if (monst.currentHP > monst.info.maxHP) {
              monst.currentHP = monst.info.maxHP;
          }

          if ((monst.info.flags & MONST_GETS_TURN_ON_ACTIVATION)
              || monst.status[STATUS_PARALYZED]
              || monst.status[STATUS_ENTRANCED]
              || (monst.bookkeepingFlags & MB_CAPTIVE))
					{
              // Do not pass go; do not collect 200 gold.
              monst.ticksUntilTurn = monst.movementSpeed;
          } else {
              await monstersTurn(monst);
							if (canSeeMonster(monst)) {
								monsterActed = true;
							}
							monst.ticksUntilTurn = monst.movementSpeed;
          }

					for(monst2 = monsters.nextCreature; monst2 != NULL; monst2 = monst2.nextCreature) {
						if (monst2 === monst) { // monst still alive and on the level
							await applyGradualTileEffectsToCreature(monst, monst.ticksUntilTurn);
							break;
						}
					}
					monst = monsters; // loop through from the beginning to be safe
				}
			}

			// SWC - See enemy movements
			if (monsterActed) {
				await pauseBrogue(50);
			}

			player.ticksUntilTurn -= soonestTurn;

			if (rogue.gameHasEnded) {
				return;
			}
		}
		// DEBUG displayLevel();
		//checkForDungeonErrors();

    updateVision(true);
    rogue.aggroRange = currentAggroValue();
    if (rogue.displayAggroRangeMode) {
        displayLevel();
    }

		for(monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
			if (canSeeMonster(monst) && !(monst.bookkeepingFlags & (MB_WAS_VISIBLE | MB_ALREADY_SEEN))) {
				monst.bookkeepingFlags |= MB_WAS_VISIBLE;
				if (monst.creatureState != MONSTER_ALLY) {
					rogue.disturbed = true;
					if (rogue.cautiousMode || rogue.automationActive) {
						// assureCosmeticRNG();
						monsterName(buf2, monst, false);
						sprintf(buf, "you %s a%s %s",
								playerCanDirectlySee(monst.xLoc, monst.yLoc) ? "see" : "sense",
								(isVowelish(buf2) ? "n" : ""),
								buf2);
						if (rogue.cautiousMode) {
							strcat(buf, ".");
							await messageWithAck(buf);
						} else {
							combatMessage(buf, 0);
						}
						// restoreRNG();
					}
				}
				if (cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_OBSTRUCTS_PASSABILITY)
					&& cellHasTMFlag(monst.xLoc, monst.yLoc, TM_IS_SECRET))
				{
					await	discover(monst.xLoc, monst.yLoc);
				}
        if (canDirectlySeeMonster(monst)) {
            if (rogue.weapon && rogue.weapon.flags & ITEM_RUNIC
                && rogue.weapon.enchant2 == W_SLAYING
                && !(rogue.weapon.flags & ITEM_RUNIC_HINTED)
                && monsterIsInClass(monst, rogue.weapon.vorpalEnemy))
						{
                rogue.weapon.flags |= ITEM_RUNIC_HINTED;
                buf2 = itemName(rogue.weapon, false, false, NULL);
                sprintf(buf, "the runes on your %s gleam balefully.", buf2);
                await messageWithAck(buf, itemMessageColor);
            }
            if (rogue.armor && rogue.armor.flags & ITEM_RUNIC
                && rogue.armor.enchant2 == A_IMMUNITY
                && !(rogue.armor.flags & ITEM_RUNIC_HINTED)
                && monsterIsInClass(monst, rogue.armor.vorpalEnemy))
						{
                rogue.armor.flags |= ITEM_RUNIC_HINTED;
                buf2 = itemName(rogue.armor, false, false, NULL);
                sprintf(buf, "the runes on your %s glow protectively.", buf2);
                await messageWithAck(buf, itemMessageColor);
            }
        }
			} else if (!canSeeMonster(monst)
					   && (monst.bookkeepingFlags & MB_WAS_VISIBLE)
					   && !(monst.bookkeepingFlags & MB_CAPTIVE))
		  {
				monst.bookkeepingFlags &= ~MB_WAS_VISIBLE;
			}
		}

		displayCombatText();

		if (player.status[STATUS_PARALYZED]) {
			if (!fastForward) {
				fastForward = rogue.playbackFastForward || await pauseBrogue(25);
			}
		}

		//checkNutrition(); // Now handled within decrementPlayerStatus().
    if (!rogue.playbackFastForward) {
        shuffleTerrainColors(100, false);
    }

		displayAnnotation();

		refreshSideBar(-1, -1, false);

		await applyInstantTileEffectsToCreature(player);
		if (rogue.gameHasEnded) { // caustic gas, lava, trapdoor, etc.
			return;
		}

    if (player.currentHP > player.info.maxHP) {
        player.currentHP = player.info.maxHP;
    }

    if (player.bookkeepingFlags & MB_IS_FALLING) {
        await playerFalls();
        await handleHealthAlerts();
        return;
    }
	} while (player.status[STATUS_PARALYZED]);

	rogue.justRested = false;
	rogue.justSearched = false;
	updateFlavorText();

	if (!rogue.updatedMapToShoreThisTurn) {
		updateMapToShore();
	}

	// "point of no return" check
	if ((player.status[STATUS_LEVITATING] && cellHasTerrainFlag(player.xLoc, player.yLoc, T_LAVA_INSTA_DEATH | T_IS_DEEP_WATER | T_AUTO_DESCENT))
		|| (player.status[STATUS_IMMUNE_TO_FIRE] && cellHasTerrainFlag(player.xLoc, player.yLoc, T_LAVA_INSTA_DEATH)))
	{
		if (!rogue.receivedLevitationWarning) {
			turnsRequiredToShore = Math.ceil(rogue.mapToShore[player.xLoc][player.yLoc] * player.movementSpeed / 100);
			if (cellHasTerrainFlag(player.xLoc, player.yLoc, T_LAVA_INSTA_DEATH)) {
				turnsToShore = max(player.status[STATUS_LEVITATING], player.status[STATUS_IMMUNE_TO_FIRE]) * 100 / player.movementSpeed;
			} else {
				turnsToShore = player.status[STATUS_LEVITATING] * 100 / player.movementSpeed;
			}
			turnsToShore = Math.ceil(turnsToShore);

			if (turnsRequiredToShore == turnsToShore || turnsRequiredToShore + 1 == turnsToShore) {
				await messageWithAck("better head back to solid ground!");
				rogue.receivedLevitationWarning = true;
			} else if (turnsRequiredToShore > turnsToShore
			 					&& turnsRequiredToShore < 10000)
			{
				await messageWithAck("you're past the point of no return!");
				rogue.receivedLevitationWarning = true;
			}
		}
	} else {
		rogue.receivedLevitationWarning = false;
	}

	emptyGraveyard();
	rogue.playbackBetweenTurns = true;
	RNGCheck();
	await handleHealthAlerts();

  if (rogue.flareCount > 0) {
      await animateFlares(rogue.flares, rogue.flareCount);
      rogue.flareCount = 0;
  }
}


function resetScentTurnNumber() { // don't want player.scentTurnNumber to roll over the short maxint!
	let i, j, d;
	rogue.scentTurnNumber -= 15000;
  for (d = 0; d < DEEPEST_LEVEL; d++) {
    if (levels[d].visited) {
      for (i=0; i<DCOLS; i++) {
        for (j=0; j<DROWS; j++) {
          if (levels[d].scentMap[i][j] > 15000) {
            levels[d].scentMap[i][j] -= 15000;
          } else {
            levels[d].scentMap[i][j] = 0;
          }
        }
      }
    }
  }
}
