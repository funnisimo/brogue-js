/*
 *  Movement.c
 *  Brogue
 *
 *  Created by Brian Walker on 1/10/09.
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

// #include "Rogue.h"
// #include "IncludeGlobals.h"
// #include <math.h>

async function playerRuns(direction) {
	let newX, newY, dir;
	const cardinalPassability = []; // short[4];

	rogue.disturbed = (player.status[STATUS_CONFUSED] ? true : false);

	for (dir = 0; dir < 4; dir++) {
		newX = player.xLoc + nbDirs[dir][0];
		newY = player.yLoc + nbDirs[dir][1];
		cardinalPassability[dir] = monsterAvoids(player, newX, newY);
	}

	while (!rogue.disturbed) {
		if (!await playerMoves(direction)) {
			rogue.disturbed = true;
			break;
		}

		newX = player.xLoc + nbDirs[direction][0];
		newY = player.yLoc + nbDirs[direction][1];
		if (!coordinatesAreInMap(newX, newY)
			|| monsterAvoids(player, newX, newY)) {

			rogue.disturbed = true;
		}
		if (isDisturbed(player.xLoc, player.yLoc)) {
			rogue.disturbed = true;
		} else if (direction < 4) {
			for (dir = 0; dir < 4; dir++) {
				newX = player.xLoc + nbDirs[dir][0];
				newY = player.yLoc + nbDirs[dir][1];
				if (cardinalPassability[dir] != monsterAvoids(player, newX, newY)
					&& !(nbDirs[dir][0] + nbDirs[direction][0] == 0 &&
						 nbDirs[dir][1] + nbDirs[direction][1] == 0)) {
						// dir is not the x-opposite or y-opposite of direction
					rogue.disturbed = true;
				}
			}
		}
	}
	updateFlavorText();
}


function highestPriorityLayer(x, y, skipGas) {	// enum dungeonLayers
	let bestPriority = 10000;
	let tt, best;

	for (tt = 0; tt < NUMBER_TERRAIN_LAYERS; tt++) {
		if (tt == GAS && skipGas) {
			continue;
		}
		if (pmap[x][y].layers[tt] && tileCatalog[pmap[x][y].layers[tt]].drawPriority < bestPriority) {
			bestPriority = tileCatalog[pmap[x][y].layers[tt]].drawPriority;
			best = tt;
		}
	}
	return best;
}

function layerWithTMFlag(x, y, flag) {	// enum dungeonLayers
	let layer;

	for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
		if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & flag) {
			return layer;
		}
	}
	return NO_LAYER;
}

function layerWithFlag(x, y, flag) {
	let layer;

	for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
		if (tileCatalog[pmap[x][y].layers[layer]].flags & flag) {
			return layer;
		}
	}
	return NO_LAYER;
}

// Retrieves a pointer to the flavor text of the highest-priority terrain at the given location
function tileFlavor(x, y) {	// char *
	return tileCatalog[pmap[x][y].layers[highestPriorityLayer(x, y, false)]].flavorText;
}

// Retrieves a pointer to the description text of the highest-priority terrain at the given location
function tileText(x, y) {	// char *
	return tileCatalog[pmap[x][y].layers[highestPriorityLayer(x, y, false)]].description;
}

function describedItemBasedOnParameters(theCategory, theKind, theQuantity, buf) {
    let tempItem = initializeItem();
    tempItem.category = theCategory;
    tempItem.kind = theKind;
    tempItem.quantity = theQuantity;
    itemName(tempItem, buf, false, true, NULL);
}

// Describes the item in question either by naming it if the player has already seen its name,
// or by tersely identifying its category otherwise.
function describedItemName( /* item */ theItem, buf) {
	if (rogue.playbackOmniscience || (!player.status[STATUS_HALLUCINATING])) {
		itemName(theItem, buf, (theItem.category & (WEAPON | ARMOR) ? false : true), true, NULL);
	} else {
    describeHallucinatedItem(buf);
	}
}


function describeLocation(buf, x, y) {
	let monst;	// creature *
	let theItem, magicItem;		// item *
	let standsInTerrain;
	let subjectMoving;
	let prepositionLocked = false;
	let monsterDormant;

	const subject = STRING(); 		// char[COLS * 3];
	const verb = STRING(); 		// char[COLS * 3];
	const preposition = STRING(); 		// char[COLS * 3];
	const object = STRING(); 		// char[COLS * 3];
	const adjective = STRING(); 		// char[COLS * 3];

	// assureCosmeticRNG();

	if (x == player.xLoc && y == player.yLoc) {
		if (player.status[STATUS_LEVITATING]) {
			sprintf(buf, "you are hovering above %s.", tileText(x, y));
		} else {
			strcpy(buf, tileFlavor(x, y));
		}
		// restoreRNG();
		return buf;
	}

	monst = NULL;
	standsInTerrain = ((tileCatalog[pmap[x][y].layers[highestPriorityLayer(x, y, false)]].mechFlags & TM_STAND_IN_TILE) ? true : false);
	theItem = itemAtLoc(x, y);
	monsterDormant = false;
	if (pmap[x][y].flags & HAS_MONSTER) {
		monst = monsterAtLoc(x, y);
	} else if (pmap[x][y].flags & HAS_DORMANT_MONSTER) {
		monst = dormantMonsterAtLoc(x, y);
		monsterDormant = true;
	}

	// detecting magical items
	magicItem = NULL;
	if (theItem && !playerCanSeeOrSense(x, y)
		&& (theItem.flags & ITEM_MAGIC_DETECTED)
		&& itemMagicChar(theItem))
	{
		magicItem = theItem;
	} else if (monst && !canSeeMonster(monst)
			   && monst.carriedItem
			   && (monst.carriedItem.flags & ITEM_MAGIC_DETECTED)
			   && itemMagicChar(monst.carriedItem))
  {
		magicItem = monst.carriedItem;
	}
	if (magicItem) {
		switch (itemMagicChar(magicItem)) {
			case GOOD_MAGIC_CHAR:
			strcpy(object, "benevolent magic");
			break;
		case BAD_MAGIC_CHAR:
			strcpy(object, "malevolent magic");
			break;
		case AMULET_CHAR:
			strcpy(object, "the Amulet of Yendor");
			break;
		default:
			strcpy(object, "mysterious magic");
			break;
		}
		sprintf(buf, "you can detect the aura of %s here.", object);
		// restoreRNG();
		return;
	}

	// telepathy
	if (monst
        && !canSeeMonster(monst)
        && monsterRevealed(monst))
	{
		strcpy(adjective, (((!player.status[STATUS_HALLUCINATING] || rogue.playbackOmniscience) && monst.info.displayChar >= 'a' && monst.info.displayChar <= 'z')
						   || (player.status[STATUS_HALLUCINATING] && !rogue.playbackOmniscience && cosmetic_range(0, 1)) ? "small" : "large"));
		if (pmap[x][y].flags & DISCOVERED) {
			strcpy(object, tileText(x, y));
			if (monst.bookkeepingFlags & MB_SUBMERGED) {
				strcpy(preposition, "under ");
			} else if (monsterDormant) {
				strcpy(preposition, "coming from within ");
			} else if (standsInTerrain) {
				strcpy(preposition, "in ");
			} else {
				strcpy(preposition, "over ");
			}
		} else {
			strcpy(object, "here");
			strcpy(preposition, "");
		}

		sprintf(buf, "you can sense a %s psychic emanation %s%s.", adjective, preposition, object);
		// restoreRNG();
		return;
	}

	if (monst && !canSeeMonster(monst) && !rogue.playbackOmniscience) {
        // Monster is not visible.
		monst = NULL;
	}

	if (!playerCanSeeOrSense(x, y)) {
		if (pmap[x][y].flags & DISCOVERED) { // memory
			if (pmap[x][y].rememberedItemCategory) {
        if (player.status[STATUS_HALLUCINATING] && !rogue.playbackOmniscience) {
            describeHallucinatedItem(object);
        } else {
            describedItemBasedOnParameters(pmap[x][y].rememberedItemCategory, pmap[x][y].rememberedItemKind, pmap[x][y].rememberedItemQuantity, object);
        }
			} else {
				strcpy(object, tileCatalog[pmap[x][y].rememberedTerrain].description);
			}
			sprintf(buf, "you remember seeing %s here.", object);
			// restoreRNG();
			return;
		} else if (pmap[x][y].flags & MAGIC_MAPPED) { // magic mapped
			sprintf(buf, "you expect %s to be here.", tileCatalog[pmap[x][y].rememberedTerrain].description);
			// restoreRNG();
			return;
		}
		strcpy(buf, "");
		// restoreRNG();
		return;
	}

	if (monst) {
		monsterName(subject, monst, true);

		if (pmap[x][y].layers[GAS] && monst.status[STATUS_INVISIBLE]) { // phantoms in gas
			sprintf(buf, "you can perceive the faint outline of %s in %s.", subject, tileCatalog[pmap[x][y].layers[GAS]].description);
			// restoreRNG();
			return;
		}

		subjectMoving = (monst.turnsSpentStationary == 0
                         && !(monst.info.flags & (MONST_GETS_TURN_ON_ACTIVATION | MONST_IMMOBILE))
                         && monst.creatureState != MONSTER_SLEEPING
                         && !(monst.bookkeepingFlags & (MB_SEIZED | MB_CAPTIVE)));
		if ((monst.info.flags & MONST_ATTACKABLE_THRU_WALLS)
        && cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY))
		{
    	strcpy(verb, "is embedded");
    } else if (cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)) {
			strcpy(verb, "is trapped");
			subjectMoving = false;
		} else if (monst.bookkeepingFlags & MB_CAPTIVE) {
			strcpy(verb, "is shackled in place");
			subjectMoving = false;
		} else if (monst.status[STATUS_PARALYZED]) {
			strcpy(verb, "is frozen in place");
			subjectMoving = false;
		} else if (monst.status[STATUS_STUCK]) {
			strcpy(verb, "is entangled");
			subjectMoving = false;
		} else if (monst.status[STATUS_LEVITATING]) {
			strcpy(verb, (subjectMoving ? "is flying" : "is hovering"));
			strcpy(preposition, "over");
			prepositionLocked = true;
		} else if (monsterCanSubmergeNow(monst)) {
			strcpy(verb, (subjectMoving ? "is gliding" : "is drifting"));
		} else if (cellHasTerrainFlag(x, y, T_MOVES_ITEMS) && !(monst.info.flags & MONST_SUBMERGES)) {
			strcpy(verb, (subjectMoving ? "is swimming" : "is struggling"));
		} else if (cellHasTerrainFlag(x, y, T_AUTO_DESCENT)) {
			strcpy(verb, "is suspended in mid-air");
			strcpy(preposition, "over");
			prepositionLocked = true;
			subjectMoving = false;
		} else if (monst.status[STATUS_CONFUSED]) {
			strcpy(verb, "is staggering");
		} else if ((monst.info.flags & MONST_RESTRICTED_TO_LIQUID)
				   && !cellHasTMFlag(monst.xLoc, monst.yLoc, TM_ALLOWS_SUBMERGING))
 	  {
			strcpy(verb, "is lying");
			subjectMoving = false;
		} else if (monst.info.flags & MONST_IMMOBILE) {
			strcpy(verb, "is resting");
		} else {
			switch (monst.creatureState) {
				case MONSTER_SLEEPING:
					strcpy(verb, "is sleeping");
					subjectMoving = false;
					break;
				case MONSTER_WANDERING:
					strcpy(verb, (subjectMoving ? "is wandering" : "is standing"));
					break;
				case MONSTER_FLEEING:
					strcpy(verb, (subjectMoving ? "is fleeing" : "is standing"));
					break;
				case MONSTER_TRACKING_SCENT:
					strcpy(verb, (subjectMoving ? "is charging" : "is standing"));
					break;
				case MONSTER_ALLY:
					strcpy(verb, (subjectMoving ? "is following you" : "is standing"));
					break;
				default:
					strcpy(verb, "is standing");
					break;
			}
		}
		if (monst.status[STATUS_BURNING] && !(monst.info.flags & MONST_FIERY)) {
			strcat(verb, ", burning,");
		}

		if (theItem) {
			strcpy(preposition, "over");
			describedItemName(theItem, object);
		} else {
			if (!prepositionLocked) {
				strcpy(preposition, subjectMoving ? (standsInTerrain ? "through" : "across")
					   : (standsInTerrain ? "in" : "on"));
			}
			strcpy(object, tileText(x, y));
		}
	} else { // no monster
		strcpy(object, tileText(x, y));
		if (theItem) {
			describedItemName(theItem, object);
			subjectMoving = cellHasTerrainFlag(x, y, T_MOVES_ITEMS);
			if (player.status[STATUS_HALLUCINATING] && !rogue.playbackOmniscience) {
          strcpy(verb, "is");
      } else {
          strcpy(verb, (theItem.quantity > 1 || (theItem.category & GOLD)) ? "are" : "is");
      }
			if (cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)) {
				strcat(verb, " enclosed");
			} else {
				strcat(verb, subjectMoving ? " drifting" : " lying");
			}
			strcpy(preposition, standsInTerrain ? (subjectMoving ? "through" : "in")
				   : (subjectMoving ? "across" : "on"));
		} else { // no item
			sprintf(buf, "you %s %s.", (playerCanDirectlySee(x, y) ? "see" : "sense"), object);
      // restoreRNG();
			return;
		}
	}

	sprintf(buf, "%s %s %s %s.", subject, verb, preposition, object);
	// restoreRNG();
	return;
}


function printLocationDescription(x, y) {
	const buf = STRING(); // char[DCOLS*3];
	describeLocation(buf, x, y);
	flavorMessage(buf);
}

async function useKeyAt( /* item */ theItem, x, y) {
	let layer, i;
	let monst;		/// creature *
	const buf = STRING(), buf2 = STRING(), terrainName = STRING(), preposition = STRING(); // char[10];
	let disposable;

	strcpy(terrainName, "unknown terrain"); // redundant failsafe
	for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
		if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_PROMOTES_WITH_KEY) {
			if (tileCatalog[pmap[x][y].layers[layer]].description[0] == 'a'
				&& tileCatalog[pmap[x][y].layers[layer]].description[1] == ' ')
			{
				sprintf(terrainName, "the %s", tileCatalog[pmap[x][y].layers[layer]].description.substring(2));	// [2]
			} else {
				strcpy(terrainName, tileCatalog[pmap[x][y].layers[layer]].description);
			}
			if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_STAND_IN_TILE) {
				strcpy(preposition, "in");
			} else {
				strcpy(preposition, "on");
			}
			await promoteTile(x, y, layer, false);
		}
	}

	disposable = false;
	for (i=0; i < KEY_ID_MAXIMUM && (theItem.keyLoc[i].x || theItem.keyLoc[i].machine); i++) {
		if (theItem.keyLoc[i].x == x && theItem.keyLoc[i].y == y && theItem.keyLoc[i].disposableHere) {
			disposable = true;
		} else if (theItem.keyLoc[i].machine == pmap[x][y].machineNumber && theItem.keyLoc[i].disposableHere) {
			disposable = true;
		}
	}

	if (disposable) {
		if (removeItemFromChain(theItem, packItems)) {
			itemName(theItem, buf2, true, false, NULL);
			sprintf(buf, "you use your %s %s %s.",
					buf2,
					preposition,
					terrainName);
			message(buf, itemMessageColor, false);
			deleteItem(theItem);
		} else if (removeItemFromChain(theItem, floorItems)) {
			deleteItem(theItem);
			pmap[x][y].flags &= ~HAS_ITEM;
		} else if (pmap[x][y].flags & HAS_MONSTER) {
			monst = monsterAtLoc(x, y);
			if (monst.carriedItem && monst.carriedItem == theItem) {
				monst.carriedItem = NULL;
				deleteItem(theItem);
			}
		}
	}
}

function randValidDirectionFrom( /* creature */ monst, x, y, respectAvoidancePreferences) {
	let i, newX, newY, validDirectionCount = 0, randIndex;

  brogueAssert(rogue.RNG == RNG_SUBSTANTIVE);
	for (i=0; i<8; i++) {
		newX = x + nbDirs[i][0];
		newY = y + nbDirs[i][1];
		if (coordinatesAreInMap(newX, newY)
			&& !cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY)
      && !diagonalBlocked(x, y, newX, newY, false)
			&& (!respectAvoidancePreferences
				|| (!monsterAvoids(monst, newX, newY))
				|| ((pmap[newX][newY].flags & HAS_PLAYER) && monst.creatureState != MONSTER_ALLY)))
		{
			validDirectionCount++;
		}
	}

	if (validDirectionCount == 0) {
        // Rare, and important in this case that the function returns BEFORE a random roll is made to avoid OOS.
		return NO_DIRECTION;
	}

	randIndex = rand_range(1, validDirectionCount);
	validDirectionCount = 0;

	for (i=0; i<8; i++) {
		newX = x + nbDirs[i][0];
		newY = y + nbDirs[i][1];
		if (coordinatesAreInMap(newX, newY)
			&& !cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY)
			&& !diagonalBlocked(x, y, newX, newY, false)
			&& (!respectAvoidancePreferences
				|| (!monsterAvoids(monst, newX, newY))
				|| ((pmap[newX][newY].flags & HAS_PLAYER) && monst.creatureState != MONSTER_ALLY)))
		{
			validDirectionCount++;
			if (validDirectionCount == randIndex) {
				return i;
			}
		}
	}
	return NO_DIRECTION; // should rarely get here
}

async function vomit(/* creature */ monst) {
	const buf = STRING(), monstName = STRING(); // char[COLS];
	await spawnDungeonFeature(monst.xLoc, monst.yLoc, dungeonFeatureCatalog[DF_VOMIT], true, false);

	if (canDirectlySeeMonster(monst)
        && !rogue.automationActive)
	{
		monsterName(monstName, monst, true);
		sprintf(buf, "%s vomit%s profusely", monstName, (monst === player ? "" : "s"));
		combatMessage(buf, NULL);
	}
}


async function moveEntrancedMonsters(dir) {
	let monst, nextMonst;	// creature *

	dir = oppositeDirection(dir);

	for (monst = monsters.nextCreature; monst != NULL; monst = nextMonst) {
    nextMonst = monst.nextCreature;
		if (monst.status[STATUS_ENTRANCED]
			&& !monst.status[STATUS_STUCK]
			&& !monst.status[STATUS_PARALYZED]
			&& !(monst.bookkeepingFlags & MB_CAPTIVE))
		{
			await moveMonster(monst, nbDirs[dir][0], nbDirs[dir][1]);
		}
	}
}


async function becomeAllyWith( /* creature */ monst) {
	demoteMonsterFromLeadership(monst);
	// Drop your item.
	if (monst.carriedItem) {
		await makeMonsterDropItem(monst);
	}
	// If you're going to change into something, it should be friendly.
	if (monst.carriedMonster) {
		await becomeAllyWith(monst.carriedMonster);
	}
	monst.creatureState = MONSTER_ALLY;
	monst.bookkeepingFlags |= MB_FOLLOWER;
	monst.leader = player;
	monst.bookkeepingFlags &= ~(MB_CAPTIVE | MB_SEIZED);
	refreshDungeonCell(monst.xLoc, monst.yLoc);
}

async function freeCaptive( /* creature */ monst) {
	const buf = STRING(), monstName = STRING(); // char[COLS];

	await becomeAllyWith(monst);
	monsterName(monstName, monst, false);
	sprintf(buf, "you free the grateful %s and gain a faithful ally.", monstName);
	message(buf, false);
}

async function freeCaptivesEmbeddedAt(x, y) {
	let monst;	// creature *

	if (pmap[x][y].flags & HAS_MONSTER) {
		// Free any captives trapped in the tunnelized terrain.
		monst = monsterAtLoc(x, y);
		if ((monst.bookkeepingFlags & MB_CAPTIVE)
			&& !(monst.info.flags & MONST_ATTACKABLE_THRU_WALLS)
			&& (cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)))
		{
			await freeCaptive(monst);
			return true;
		}
	}
	return false;
}

// Do we need confirmation so we don't accidently hit an acid mound?
async function abortAttackAgainstAcidicTarget(/* creature[] */hitList) {
  let i;
	const monstName = STRING(), weaponName = STRING(); // char[COLS];
	const buf = STRING(); // char[COLS*3];

    if (rogue.weapon
        && !(rogue.weapon.flags & ITEM_PROTECTED)
        && !player.status[STATUS_HALLUCINATING]
        && !player.status[STATUS_CONFUSED])
		{
        for (i=0; i<8; i++) {
            if (hitList[i]
                && (hitList[i].info.flags & MONST_DEFEND_DEGRADE_WEAPON)
                && canSeeMonster(hitList[i])
                && (!(rogue.weapon.flags & ITEM_RUNIC)
                    || !(rogue.weapon.flags & ITEM_RUNIC_IDENTIFIED)
                    || rogue.weapon.enchant2 != W_SLAYING
                    || !monsterIsInClass(hitList[i], rogue.weapon.vorpalEnemy)))
						{
                monsterName(monstName, hitList[i], true);
                itemName(rogue.weapon, weaponName, false, false, NULL);
                sprintf(buf, "Degrade your %s by attacking %s?", weaponName, monstName);
                if (await confirm(buf, false)) {
                    return false; // Fire when ready!
                } else {
                    return true; // Abort!
                }
            }
        }
    }
    return false;
}

// Returns true if a whip attack was launched.
// If "aborted" pointer is provided, sets it to true if it was aborted because
// the player opted not to attack an acid mound (in which case the whole turn
// should be aborted), as opposed to there being no valid whip attack available
// (in which case the player/monster should move instead).
async function handleWhipAttacks( /* creature */ attacker, dir) {
    let theBolt; // bolt
    let defender, hitList = []; // creature *
    let strikeLoc = [-1, -1], originLoc = [-1, -1], targetLoc = [-1, -1];

    const boltChar = "||~~\\//\\";

    brogueAssert(dir > NO_DIRECTION && dir < DIRECTION_COUNT);

    if (attacker === player) {
        if (!rogue.weapon || !(rogue.weapon.flags & ITEM_ATTACKS_EXTEND)) {
            return WHIP_FAILED;
        }
    } else if (!(attacker.info.abilityFlags & MA_ATTACKS_EXTEND)) {
        return WHIP_FAILED;
    }

    originLoc[0] = attacker.xLoc;
    originLoc[1] = attacker.yLoc;
    targetLoc[0] = attacker.xLoc + nbDirs[dir][0];
    targetLoc[1] = attacker.yLoc + nbDirs[dir][1];
    getImpactLoc(strikeLoc, originLoc, targetLoc, 5, false);

    defender = monsterAtLoc(strikeLoc[0], strikeLoc[1]);
    if (defender
        && (attacker !== player || canSeeMonster(defender))
        && !monsterIsHidden(defender, attacker)
        && monsterWillAttackTarget(attacker, defender))
		{
        if (attacker === player) {
            hitList[0] = defender;
            if (await abortAttackAgainstAcidicTarget(hitList)) {
                if (aborted) {
                    return WHIP_ABORTED;
                }
                return WHIP_FAILED;
            }
        }
        attacker.bookkeepingFlags &= ~MB_SUBMERGED;
        theBolt = boltCatalog[BOLT_WHIP];
        theBolt.theChar = boltChar[dir];
        await zap(originLoc, targetLoc, theBolt, false);
        return WHIP_SUCCESS;
    }
    return WHIP_FAILED;
}

// Returns true if a spear attack was launched.
// If "aborted" pointer is provided, sets it to true if it was aborted because
// the player opted not to attack an acid mound (in which case the whole turn
// should be aborted), as opposed to there being no valid spear attack available
// (in which case the player/monster should move instead).
async function handleSpearAttacks(/* creature */ attacker, dir, opts) {
    let defender;
		const hitList = [];
    const originLoc = [-1, -1], targetLoc = [-1, -1];
		let range = 2, i = 0, h = 0;
    let proceed = false, visualEffect = false;

    const boltChar = "||--\\//\\";

    brogueAssert(dir > NO_DIRECTION && dir < DIRECTION_COUNT);

    if (attacker === player) {
        if (!rogue.weapon || !(rogue.weapon.flags & ITEM_ATTACKS_PENETRATE)) {
            return false;
        }
    } else if (!(attacker.info.abilityFlags & MA_ATTACKS_PENETRATE)) {
        return false;
    }
    originLoc[0] = attacker.xLoc;
    originLoc[1] = attacker.yLoc;

    for (i = 0; i < range; i++) {
        targetLoc[0] = attacker.xLoc + (1 + i) * nbDirs[dir][0];
        targetLoc[1] = attacker.yLoc + (1 + i) * nbDirs[dir][1];
        if (!coordinatesAreInMap(targetLoc[0], targetLoc[1])) {
            break;
        }
        defender = monsterAtLoc(targetLoc[0], targetLoc[1]);
        if (defender
            && (!cellHasTerrainFlag(targetLoc[0], targetLoc[1], T_OBSTRUCTS_PASSABILITY)
                || (defender.info.flags & MONST_ATTACKABLE_THRU_WALLS))
            && (attacker !== player || defender.creatureState != MONSTER_ALLY)
            && (!monsterHiddenBySubmersion(defender, attacker) || i == 0)) {
            // Monster will get hit if we choose to attack.
            hitList[h++] = defender;
            if ((!monsterIsHidden(defender, attacker) || i == 0)
                && monsterWillAttackTarget(attacker, defender)
                && (attacker !== player || canSeeMonster(defender) || i == 0)) {
                // We'll attack.
                proceed = true;
            }
        }
        if (cellHasTerrainFlag(targetLoc[0], targetLoc[1], (T_OBSTRUCTS_PASSABILITY | T_OBSTRUCTS_VISION))) {
            break;
        }
    }
    range = i;
    if (proceed) {
        if (attacker === player) {
            if (await abortAttackAgainstAcidicTarget(hitList)) {
                if (opts) {
                    ops.aborted = true;
                }
                return false;
            }
        }
        if (!rogue.playbackFastForward) {
            for (i = 0; i < range; i++) {
                targetLoc[0] = attacker.xLoc + (1 + i) * nbDirs[dir][0];
                targetLoc[1] = attacker.yLoc + (1 + i) * nbDirs[dir][1];
                if (coordinatesAreInMap(targetLoc[0], targetLoc[1])
                    && playerCanSeeOrSense(targetLoc[0], targetLoc[1]))
								{
                    visualEffect = true;
                    plotForegroundChar(boltChar[dir], targetLoc[0], targetLoc[1], lightBlue, true);
                }
            }
        }
        attacker.bookkeepingFlags &= ~MB_SUBMERGED;
        // Artificially reverse the order of the attacks,
        // so that spears of force can send both monsters flying.
        for (i = h - 1; i >= 0; i--) {
            await attack(attacker, hitList[i], false);
        }
        if (visualEffect) {
            await pauseBrogue(16);
            for (i = 0; i < range; i++) {
                targetLoc[0] = attacker.xLoc + (1 + i) * nbDirs[dir][0];
                targetLoc[1] = attacker.yLoc + (1 + i) * nbDirs[dir][1];
                if (coordinatesAreInMap(targetLoc[0], targetLoc[1])) {
                    refreshDungeonCell(targetLoc[0], targetLoc[1]);
                }
            }
        }
        return true;
    }
    return false;
}


function buildFlailHitList(x, y, newX, newY, hitList /* creature *[16] */) {
    let monst;	// creature *
    let mx, my;
    let i = 0;

    for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
        mx = monst.xLoc;
        my = monst.yLoc;
        if (distanceBetween(x, y, mx, my) == 1
            && distanceBetween(newX, newY, mx, my) == 1
            && canSeeMonster(monst)
            && monstersAreEnemies(player, monst)
            && monst.creatureState != MONSTER_ALLY
            && !(monst.bookkeepingFlags & MB_IS_DYING)
            && (!cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_OBSTRUCTS_PASSABILITY) || (monst.info.flags & MONST_ATTACKABLE_THRU_WALLS)))
				{
            while (hitList[i]) {
                i++;
            }
            hitList[i] = monst;
        }
    }
}


function diagonalBlocked(x1, y1, x2, y2, limitToPlayerKnowledge) {
    let tFlags;
    if (x1 == x2 || y1 == y2) {
      return false; // If it's not a diagonal, it's not diagonally blocked.
    }
    const locFlags1 = getLocationFlags(x1, y2, limitToPlayerKnowledge);
    if (locFlags1.terrainFlags & T_OBSTRUCTS_DIAGONAL_MOVEMENT) {
        return true;
    }
    const locFlags2 = getLocationFlags(x2, y1, limitToPlayerKnowledge);
    if (locFlags2.terrainFlags & T_OBSTRUCTS_DIAGONAL_MOVEMENT) {
        return true;
    }
    return false;
}

// Called whenever the player voluntarily tries to move in a given direction.
// Can be called from movement keys, exploration, or auto-travel.
async function playerMoves(direction) {
	let initialDirection = direction, i, layer;
	let x = player.xLoc, y = player.yLoc;
	let newX, newY, newestX, newestY;
	let playerMoved = false, alreadyRecorded = false, specialAttackAborted = false, anyAttackHit = false;
	let defender = NULL, tempMonst = NULL, hitList = []; // creature *, creature *, creature *[16];
	const monstName = STRING(); // char[COLS];
	const buf = STRING(); // char[COLS*3];
	const directionKeys = [UP_KEY, DOWN_KEY, LEFT_KEY, RIGHT_KEY, UPLEFT_KEY, DOWNLEFT_KEY, UPRIGHT_KEY, DOWNRIGHT_KEY];

  brogueAssert(direction >= 0 && direction < DIRECTION_COUNT);

	newX = x + nbDirs[direction][0];
	newY = y + nbDirs[direction][1];

	if (!coordinatesAreInMap(newX, newY)) {
		return false;
	}

	if (player.status[STATUS_CONFUSED]) {
    // Confirmation dialog if you're moving while confused and you're next to lava and not levitating or immune to fire.
    if (player.status[STATUS_LEVITATING] <= 1
        && player.status[STATUS_IMMUNE_TO_FIRE] <= 1)
		{
        for (i=0; i<8; i++) {
            newestX = x + nbDirs[i][0];
            newestY = y + nbDirs[i][1];
            if (coordinatesAreInMap(newestX, newestY)
                && (pmap[newestX][newestY].flags & (DISCOVERED | MAGIC_MAPPED))
                && !diagonalBlocked(x, y, newestX, newestY, false)
                && cellHasTerrainFlag(newestX, newestY, T_LAVA_INSTA_DEATH)
                && !cellHasTerrainFlag(newestX, newestY, T_OBSTRUCTS_PASSABILITY | T_ENTANGLES)
                && !((pmap[newestX][newestY].flags & HAS_MONSTER)
                     && canSeeMonster(monsterAtLoc(newestX, newestY))
                     && monsterAtLoc(newestX, newestY).creatureState != MONSTER_ALLY))
					  {
                if (! await confirm("Risk stumbling into lava?", false)) {
                    return false;
                } else {
                    break;
                }
            }
        }
    }

		direction = randValidDirectionFrom(player, x, y, false);
		if (direction == NO_DIRECTION) {
			return false;
		} else {
			newX = x + nbDirs[direction][0];
			newY = y + nbDirs[direction][1];
			if (!coordinatesAreInMap(newX, newY)) {
				return false;
			}
			if (!alreadyRecorded) {
				recordKeystroke(directionKeys[initialDirection], false, false);
				alreadyRecorded = true;
			}
		}
	}

	if (pmap[newX][newY].flags & HAS_MONSTER) {
		defender = monsterAtLoc(newX, newY);
	}

  // If there's no enemy at the movement location that the player is aware of, consider terrain promotions.
  if (!defender
      || (!canSeeMonster(defender) && !monsterRevealed(defender))
      || !monstersAreEnemies(player, defender))
	{
      if (cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY) && cellHasTMFlag(newX, newY, TM_PROMOTES_ON_PLAYER_ENTRY)) {
          layer = layerWithTMFlag(newX, newY, TM_PROMOTES_ON_PLAYER_ENTRY);
          if (tileCatalog[pmap[newX][newY].layers[layer]].flags & T_OBSTRUCTS_PASSABILITY) {
              if (!alreadyRecorded) {
                  recordKeystroke(directionKeys[initialDirection], false, false);
                  alreadyRecorded = true;
              }
              message(tileCatalog[pmap[newX][newY].layers[layer]].flavorText, false);
              await promoteTile(newX, newY, layer, false);
              await playerTurnEnded();
              return true;
          }
      }

			if (player.status[STATUS_STUCK] && cellHasTerrainFlag(x, y, T_ENTANGLES)) {
							 // Don't interrupt exploration with this message.
					 if (--player.status[STATUS_STUCK]) {
							 if (!rogue.automationActive) {
									 message("you struggle but cannot free yourself.", false);
							 }
					 } else {
							 if (!rogue.automationActive) {
									 message("you break free!", false);
							 }
							 if (tileCatalog[pmap[x][y].layers[SURFACE]].flags & T_ENTANGLES) {
									 pmap[x][y].layers[SURFACE] = NOTHING;
							 }
					 }
					 await moveEntrancedMonsters(direction);
					 if (!alreadyRecorded) {
							 recordKeystroke(directionKeys[initialDirection], false, false);
							 alreadyRecorded = true;
					 }
					 if (player.status[STATUS_STUCK]) {
							 await playerTurnEnded();
							 return true;
					 }
			 }

  }

	if (((!cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY) || (cellHasTMFlag(newX, newY, TM_PROMOTES_WITH_KEY) && keyInPackFor(newX, newY)))
         && !diagonalBlocked(x, y, newX, newY, false)
         && (!cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY) || (cellHasTMFlag(x, y, TM_PROMOTES_WITH_KEY) && keyInPackFor(x, y))))
		|| (defender && defender.info.flags & MONST_ATTACKABLE_THRU_WALLS))
	{
		// if the move is not blocked

		const opts = {};
		if (await handleWhipAttacks(player, direction, opts)
				|| await handleSpearAttacks(player, direction, opts))
		{
				if (!alreadyRecorded) {
						recordKeystroke(directionKeys[initialDirection], false, false);
						alreadyRecorded = true;
				}
				playerRecoversFromAttacking(true);
				await moveEntrancedMonsters(direction);
				await playerTurnEnded();
				return true;
		} else if (opts.aborted) { // Canceled an attack against an acid mound.
				brogueAssert(!alreadyRecorded);
				rogue.disturbed = true;
				return false;
		}

		if (defender) {
			// if there is a monster there

			if (defender.bookkeepingFlags & MB_CAPTIVE) {
				monsterName(monstName, defender, false);
				sprintf(buf, "Free the captive %s?", monstName);
				if (alreadyRecorded || await confirm(buf, false)) {
					if (!alreadyRecorded) {
						recordKeystroke(directionKeys[initialDirection], false, false);
						alreadyRecorded = true;
					}
					if (cellHasTMFlag(newX, newY, TM_PROMOTES_WITH_KEY) && keyInPackFor(newX, newY)) {
						await useKeyAt(keyInPackFor(newX, newY), newX, newY);
					}
					await freeCaptive(defender);
					player.ticksUntilTurn += player.attackSpeed;
					await playerTurnEnded();
					return true;
				} else {
					return false;
				}
			}

			if (defender.creatureState != MONSTER_ALLY) {
				// Make a hit list of monsters the player is attacking this turn.
				// We separate this tallying phase from the actual attacking phase because sometimes the attacks themselves
				// create more monsters, and those shouldn't be attacked in the same turn.

				buildHitList(hitList, player, defender,
                             // rogue.weapon && (rogue.weapon.flags & ITEM_ATTACKS_PENETRATE),
                             rogue.weapon && (rogue.weapon.flags & ITEM_ATTACKS_ALL_ADJACENT));

				if (await abortAttackAgainstAcidicTarget(hitList)) { // Acid mound attack confirmation.
            brogueAssert(!alreadyRecorded);
            rogue.disturbed = true;
            return false;
        }

        if (player.status[STATUS_NAUSEOUS]) {
            if (!alreadyRecorded) {
                recordKeystroke(directionKeys[initialDirection], false, false);
                alreadyRecorded = true;
            }
            if (rand_percent(25)) {
                await vomit(player);
                await playerTurnEnded();
                return false;
            }
        }

				// Proceeding with the attack.

				if (!alreadyRecorded) {
					recordKeystroke(directionKeys[initialDirection], false, false);
					alreadyRecorded = true;
				}

				// Attack!
				for (i=0; i<16; i++) {
					if (hitList[i]
						&& monsterWillAttackTarget(player, hitList[i])
						&& !(hitList[i].bookkeepingFlags & MB_IS_DYING)
            && !rogue.gameHasEnded)
					{
						if (await attack(player, hitList[i], false)) {
                anyAttackHit = true;
            }
					}
				}

        playerRecoversFromAttacking(anyAttackHit);
				await moveEntrancedMonsters(direction);
				await playerTurnEnded();
				return true;
			}
		}

		// const whipResult = await handleWhipAttacks(player, direction);
    // if (whipResult == WHIP_SUCCESS ) {
    //     if (!alreadyRecorded) {
    //         recordKeystroke(directionKeys[initialDirection], false, false);
    //         alreadyRecorded = true;
    //     }
    //     playerRecoversFromAttacking(true);
    //     await moveEntrancedMonsters(direction);
    //     await playerTurnEnded();
    //     return true;
    // } else if (whipResult == WHIP_ABORTED) { // Canceled an attack against an acid mound.
    //     brogueAssert(!alreadyRecorded);
    //     rogue.disturbed = true;
    //     return false;
    // }

		if (player.bookkeepingFlags & MB_SEIZED) {
			for (tempMonst = monsters.nextCreature; tempMonst != NULL; tempMonst = tempMonst.nextCreature) {
				if ((tempMonst.bookkeepingFlags & MB_SEIZING)
					&& monstersAreEnemies(player, tempMonst)
					&& distanceBetween(player.xLoc, player.yLoc, tempMonst.xLoc, tempMonst.yLoc) == 1
					&& !diagonalBlocked(player.xLoc, player.yLoc, tempMonst.xLoc, tempMonst.yLoc, false)
          && !tempMonst.status[STATUS_ENTRANCED])
				{
          monsterName(monstname, tempMonst, true);
          if (alreadyRecorded || !canSeeMonster(tempMonst)) {
              if (!alreadyRecorded) {
                  recordKeystroke(directionKeys[initialDirection], false, false);
                  alreadyRecorded = true;
              }
              sprintf(buf, "you struggle but %s is holding your legs!", monstName);
              await moveEntrancedMonsters(direction);
              message(buf, false);
              await playerTurnEnded();
              return true;
          } else {
              sprintf(buf, "you cannot move; %s is holding your legs!", monstName);
              message(buf, false);
              return false;
          }
				}
			}
			player.bookkeepingFlags &= ~MB_SEIZED; // failsafe
		}

		if (pmap[newX][newY].flags & (DISCOVERED | MAGIC_MAPPED)
            && player.status[STATUS_LEVITATING] <= 1
            && !player.status[STATUS_CONFUSED]
            && cellHasTerrainFlag(newX, newY, T_LAVA_INSTA_DEATH)
            && player.status[STATUS_IMMUNE_TO_FIRE] <= 1
            && !cellHasTerrainFlag(newX, newY, T_ENTANGLES)
            && !cellHasTMFlag(newX, newY, TM_IS_SECRET))
		{
			message("that would be certain death!", false);
			return false; // player won't willingly step into lava
		} else if (pmap[newX][newY].flags & (DISCOVERED | MAGIC_MAPPED)
				   && player.status[STATUS_LEVITATING] <= 1
				   && !player.status[STATUS_CONFUSED]
				   && cellHasTerrainFlag(newX, newY, T_AUTO_DESCENT)
				   && !cellHasTerrainFlag(newX, newY, T_ENTANGLES)
           && !cellHasTMFlag(newX, newY, TM_IS_SECRET)
				   && !await confirm("Dive into the depths?", false))
	  {
			return false;
		} else if (playerCanSee(newX, newY)
				   && !player.status[STATUS_CONFUSED]
				   && !player.status[STATUS_BURNING]
				   && player.status[STATUS_IMMUNE_TO_FIRE] <= 1
				   && cellHasTerrainFlag(newX, newY, T_IS_FIRE)
				   && !cellHasTMFlag(newX, newY, TM_EXTINGUISHES_FIRE)
				   && !await confirm("Venture into flame?", false))
	  {
			return false;
		} else if (playerCanSee(newX, newY)
							 && !player.status[STATUS_CONFUSED]
							 && !player.status[STATUS_BURNING]
							 && cellHasTerrainFlag(newX, newY, T_CAUSES_CONFUSION | T_CAUSES_PARALYSIS)
							 && (!rogue.armor || !(rogue.armor.flags & ITEM_RUNIC) || !(rogue.armor.flags & ITEM_RUNIC_IDENTIFIED) || rogue.armor.enchant2 != A_RESPIRATION)
							 && !await confirm("Venture into dangerous gas?", false)) {
				return false;
		} else if (pmap[newX][newY].flags & (ANY_KIND_OF_VISIBLE | MAGIC_MAPPED)
				   && player.status[STATUS_LEVITATING] <= 1
				   && !player.status[STATUS_CONFUSED]
				   && cellHasTerrainFlag(newX, newY, T_IS_DF_TRAP)
				   && !(pmap[newX][newY].flags & PRESSURE_PLATE_DEPRESSED)
				   && !cellHasTMFlag(newX, newY, TM_IS_SECRET)
				   && !await confirm("Step onto the pressure plate?", false))
		{
			return false;
		}

    if (rogue.weapon && (rogue.weapon.flags & ITEM_LUNGE_ATTACKS)) {
        newestX = player.xLoc + 2 * nbDirs[direction][0];
        newestY = player.yLoc + 2 * nbDirs[direction][1];
        if (coordinatesAreInMap(newestX, newestY) && (pmap[newestX][newestY].flags & HAS_MONSTER)) {
            tempMonst = monsterAtLoc(newestX, newestY);
            if (tempMonst
                && canSeeMonster(tempMonst)
                && monstersAreEnemies(player, tempMonst)
                && tempMonst.creatureState != MONSTER_ALLY
                && !(tempMonst.bookkeepingFlags & MB_IS_DYING)
                && (!cellHasTerrainFlag(tempMonst.xLoc, tempMonst.yLoc, T_OBSTRUCTS_PASSABILITY) || (tempMonst.info.flags & MONST_ATTACKABLE_THRU_WALLS)))
						{
                hitList[0] = tempMonst;
                if (await abortAttackAgainstAcidicTarget(hitList)) { // Acid mound attack confirmation.
                    brogueAssert(!alreadyRecorded);
                    rogue.disturbed = true;
                    return false;
                }
            }
        }
    }
    if (rogue.weapon && (rogue.weapon.flags & ITEM_PASS_ATTACKS)) {
        buildFlailHitList(x, y, newX, newY, hitList);
        if (await abortAttackAgainstAcidicTarget(hitList)) { // Acid mound attack confirmation.
            brogueAssert(!alreadyRecorded);
            rogue.disturbed = true;
            return false;
        }
    }

    if (player.status[STATUS_NAUSEOUS]) {
        if (!alreadyRecorded) {
            recordKeystroke(directionKeys[initialDirection], false, false);
            alreadyRecorded = true;
        }
        if (rand_percent(25)) {
            await vomit(player);
            await playerTurnEnded();
            return true;
        }
    }

		// Are we taking the stairs?
		if (rogue.downLoc[0] == newX && rogue.downLoc[1] == newY) {
			if (!alreadyRecorded) {
				recordKeystroke(directionKeys[initialDirection], false, false);
				alreadyRecorded = true;
			}
			await useStairs(1);
		} else if (rogue.upLoc[0] == newX && rogue.upLoc[1] == newY) {
			if (!alreadyRecorded) {
				recordKeystroke(directionKeys[initialDirection], false, false);
				alreadyRecorded = true;
			}
			await useStairs(-1);
		} else {
			// Okay, we're finally moving!
			if (!alreadyRecorded) {
				recordKeystroke(directionKeys[initialDirection], false, false);
				alreadyRecorded = true;
			}

			player.xLoc += nbDirs[direction][0];
			player.yLoc += nbDirs[direction][1];
			pmap[x][y].flags &= ~HAS_PLAYER;
			pmap[player.xLoc][player.yLoc].flags |= HAS_PLAYER;
			pmap[player.xLoc][player.yLoc].flags &= ~IS_IN_PATH;
      if (defender && defender.creatureState == MONSTER_ALLY) { // Swap places with ally.
				pmap[defender.xLoc][defender.yLoc].flags &= ~HAS_MONSTER;
        defender.xLoc = x;
				defender.yLoc = y;
        if (monsterAvoids(defender, x, y)) {
            const loc = getQualifyingPathLocNear(player.xLoc, player.yLoc, true, forbiddenFlagsForMonster(defender.info), 0, 0, (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS), false);
						if (!loc) ERROR('EXPECTED LOCATION');
						defender.xLoc = loc[0];
						defender.yLoc = loc[1];
        }
        //getQualifyingLocNear(loc, player.xLoc, player.yLoc, true, NULL, forbiddenFlagsForMonster(&(defender.info)) & ~(T_IS_DF_TRAP | T_IS_DEEP_WATER | T_SPONTANEOUSLY_IGNITES), HAS_MONSTER, false, false);
				//defender.xLoc = loc[0];
				//defender.yLoc = loc[1];
				pmap[defender.xLoc][defender.yLoc].flags |= HAS_MONSTER;
			}

			if (pmap[player.xLoc][player.yLoc].flags & HAS_ITEM) {
				await pickUpItemAt(player.xLoc, player.yLoc);
				rogue.disturbed = true;
			}
			refreshDungeonCell(x, y);
			refreshDungeonCell(player.xLoc, player.yLoc);
			playerMoved = true;

			await checkForMissingKeys(x, y);
	    if (monsterShouldFall(player)) {
	        player.bookkeepingFlags |= MB_IS_FALLING;
	    }
			await moveEntrancedMonsters(direction);

      // Perform a lunge or flail attack if appropriate.
      for (i=0; i<16; i++) {
          if (hitList[i]) {
              if (await attack(player, hitList[i], (rogue.weapon && (rogue.weapon.flags & ITEM_LUNGE_ATTACKS)))) {
                  anyAttackHit = true;
              }
          }
      }
      if (hitList[0]) {
          playerRecoversFromAttacking(anyAttackHit);
      }

			await playerTurnEnded();
		}
	} else if (cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY)) {
		i = pmap[newX][newY].layers[layerWithFlag(newX, newY, T_OBSTRUCTS_PASSABILITY)];
		if ((tileCatalog[i].flags & T_OBSTRUCTS_PASSABILITY)
        && (!diagonalBlocked(x, y, newX, newY, false) || !cellHasTMFlag(newX, newY, TM_PROMOTES_WITH_KEY)))
		{
      if (!(pmap[newX][newY].flags & DISCOVERED)) {
          if (!alreadyRecorded) {
              recordKeystroke(directionKeys[initialDirection], false, false);
              alreadyRecorded = true;
          }
          discoverCell(newX, newY);
          refreshDungeonCell(newX, newY);
      }
			message(tileCatalog[i].flavorText, backgroundMessageColor, false);
		}
	}
	return playerMoved;
}


// Returns -1 if there are no beneficial moves.
// If preferDiagonals is true, we will prefer diagonal moves.
// Always rolls downhill on the distance map.
// If monst is provided, do not return a direction pointing to
// a cell that the monster avoids.
function nextStep( /* short **/ distanceMap, x, y, /* creature */ monst, preferDiagonals) {
	let newX, newY, bestScore;
  let dir, bestDir;
  let blocker;	// creature *
  let blocked;

  brogueAssert(coordinatesAreInMap(x, y));

	bestScore = 0;
	bestDir = NO_DIRECTION;

	for (dir = (preferDiagonals ? 7 : 0);
		 (preferDiagonals ? dir >= 0 : dir < DIRECTION_COUNT);
		 (preferDiagonals ? dir-- : dir++))
  {
		newX = x + nbDirs[dir][0];
		newY = y + nbDirs[dir][1];

    brogueAssert(coordinatesAreInMap(newX, newY));
    if (coordinatesAreInMap(newX, newY)) {
        blocked = false;
        blocker = monsterAtLoc(newX, newY);
        if (monst
            && monsterAvoids(monst, newX, newY))
				{
            blocked = true;
        } else if (monst
                   && blocker
                   && !canPass(monst, blocker)
                   && !monstersAreTeammates(monst, blocker)
                   && !monstersAreEnemies(monst, blocker))
				{
            blocked = true;
        }
        if ((distanceMap[x][y] - distanceMap[newX][newY]) > bestScore
            && !diagonalBlocked(x, y, newX, newY, monst === player)
            && knownToPlayerAsPassableOrSecretDoor(newX, newY)
            && !blocked)
				{
            bestDir = dir;
            bestScore = distanceMap[x][y] - distanceMap[newX][newY];
        }
    }
	}
	return bestDir;
}

function displayRoute(/* short **/ distanceMap, removeRoute) {
	let currentX = player.xLoc, currentY = player.yLoc, dir, newX, newY;
	let advanced;

	if (distanceMap[player.xLoc][player.yLoc] < 0 || distanceMap[player.xLoc][player.yLoc] == 30000) {
		return;
	}
	do {
		if (removeRoute) {
			refreshDungeonCell(currentX, currentY);
		} else {
			hiliteCell(currentX, currentY, hiliteColor, 50, true);
		}
		advanced = false;
		for (dir = 7; dir >= 0; dir--) {
			newX = currentX + nbDirs[dir][0];
			newY = currentY + nbDirs[dir][1];
			if (coordinatesAreInMap(newX, newY)
				&& distanceMap[newX][newY] >= 0 && distanceMap[newX][newY] < distanceMap[currentX][currentY]
				&& !diagonalBlocked(currentX, currentY, newX, newY, true))
			{
				currentX = newX;
				currentY = newY;
				advanced = true;
				break;
			}
		}
	} while (advanced);
}

async function travelRoute( path /* short[1000][2] */, steps) {
	let i, j;
	let dir;
  let monst;		// creature *

  brogueAssert(!rogue.playbackMode);

	rogue.disturbed = false;
	rogue.automationActive = true;

  for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
      if (canSeeMonster(monst)) {
          monst.bookkeepingFlags |= MB_ALREADY_SEEN;
      } else {
          monst.bookkeepingFlags &= ~MB_ALREADY_SEEN;
      }
  }

	for (i=0; i < steps && !rogue.disturbed; i++) {
    for (j = i + 1; j < steps - 1; j++) {
        // Check to see if the path has become obstructed or avoided since the last time we saw it.
        if (diagonalBlocked(path[j-1][0], path[j-1][1], path[j][0], path[j][1], true)
            || monsterAvoids(player, path[j][0], path[j][1]))
				{
            rogue.disturbed = true;
            break;
        }
    }
		for (dir = 0; dir < DIRECTION_COUNT && !rogue.disturbed; dir++) {
			if (player.xLoc + nbDirs[dir][0] == path[i][0]
				&& player.yLoc + nbDirs[dir][1] == path[i][1])
			{
				if (! await playerMoves(dir)) {
					rogue.disturbed = true;
				}
				if (await pauseBrogue(25)) {
					rogue.disturbed = true;
				}
				break;
			}
		}
	}
	rogue.disturbed = true;
	rogue.automationActive = false;
	updateFlavorText();
}

async function travelMap( /* short **/ distanceMap) {
	let currentX = player.xLoc, currentY = player.yLoc, dir, newX, newY;
	let advanced;

	rogue.disturbed = false;
	rogue.automationActive = true;

	if (distanceMap[player.xLoc][player.yLoc] < 0 || distanceMap[player.xLoc][player.yLoc] == 30000) {
		return;
	}
	do {
		advanced = false;
		for (dir = 7; dir >= 0; dir--) {
			newX = currentX + nbDirs[dir][0];
			newY = currentY + nbDirs[dir][1];
			if (coordinatesAreInMap(newX, newY)
				&& distanceMap[newX][newY] >= 0
				&& distanceMap[newX][newY] < distanceMap[currentX][currentY]
				&& !diagonalBlocked(currentX, currentY, newX, newY, true))
			{
				if (! await playerMoves(dir)) {
					rogue.disturbed = true;
				}
				if (await pauseBrogue(500)) {
					rogue.disturbed = true;
				}
				currentX = newX;
				currentY = newY;
				advanced = true;
				break;
			}
		}
	} while (advanced && !rogue.disturbed);
	rogue.disturbed = true;
	rogue.automationActive = false;
	updateFlavorText();
}


async function travel( x, y, autoConfirm) {
	let distanceMap, i;
	const theEvent = rogueEvent();
	let staircaseConfirmKey;

	confirmMessages();

	if (D_WORMHOLING) {
		recordMouseClick(mapToWindowX(x), mapToWindowY(y), true, false);
		pmap[player.xLoc][player.yLoc].flags &= ~HAS_PLAYER;
		refreshDungeonCell(player.xLoc, player.yLoc);
		player.xLoc = x;
		player.yLoc = y;
		pmap[x][y].flags |= HAS_PLAYER;
    updatePlayerUnderwaterness();
		refreshDungeonCell(x, y);
		updateVision(true);
		return;
	}

	if (abs(player.xLoc - x) + abs(player.yLoc - y) == 1) {
		// targeting a cardinal neighbor
		for (i=0; i<4; i++) {
			if (nbDirs[i][0] == (x - player.xLoc) && nbDirs[i][1] == (y - player.yLoc)) {
				await playerMoves(i);
				break;
			}
		}
		return;
	}

	if (!(pmap[x][y].flags & (DISCOVERED | MAGIC_MAPPED))) {
		message("You have not explored that location.", false);
		return;
	}

	distanceMap = allocGrid();

	calculateDistances(distanceMap, x, y, 0, player, false, false);
	if (distanceMap[player.xLoc][player.yLoc] < 30000) {
		if (autoConfirm) {
			await travelMap(distanceMap);
			//refreshSideBar(-1, -1, false);
		} else {
			if (rogue.upLoc[0] == x && rogue.upLoc[1] == y) {
				staircaseConfirmKey = ASCEND_KEY;
			} else if (rogue.downLoc[0] == x && rogue.downLoc[1] == y) {
				staircaseConfirmKey = DESCEND_KEY;
			} else {
				staircaseConfirmKey = 0;
			}
			displayRoute(distanceMap, false);
			message("Travel this route? (y/n)", false);

			do {
				await nextBrogueEvent(theEvent, true, false, false);
			} while (theEvent.eventType != MOUSE_UP && theEvent.eventType != KEYSTROKE);

			displayRoute(distanceMap, true); // clear route display
			confirmMessages();

			if ((theEvent.eventType == MOUSE_UP && windowToMapX(theEvent.param1) == x && windowToMapY(theEvent.param2) == y)
				|| (theEvent.eventType == KEYSTROKE && (theEvent.param1 == 'Y' || theEvent.param1 == 'y'
														|| theEvent.param1 == RETURN_KEY
														|| theEvent.param1 == ENTER_KEY
														|| (theEvent.param1 == staircaseConfirmKey
															&& theEvent.param1 != 0)))) {
				await travelMap(distanceMap);
				//refreshSideBar(-1, -1, false);
				commitDraws();
			} else if (theEvent.eventType == MOUSE_UP) {
				await executeMouseClick(theEvent);
			}
		}
//		if (player.xLoc == x && player.yLoc == y) {
//			rogue.cursorLoc[0] = rogue.cursorLoc[1] = 0;
//		} else {
//			rogue.cursorLoc[0] = x;
//			rogue.cursorLoc[1] = y;
//		}
	} else {
		rogue.cursorLoc[0] = rogue.cursorLoc[1] = -1;
		message("No path is available.", false);
	}
	freeGrid(distanceMap);
}


function populateGenericCostMap(/* short **/ costMap) {
  let i, j;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
      if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)
          && (!cellHasTMFlag(i, j, TM_IS_SECRET) || (discoveredTerrainFlagsAtLoc(i, j) & T_OBSTRUCTS_PASSABILITY)))
			{
				costMap[i][j] = cellHasTerrainFlag(i, j, T_OBSTRUCTS_DIAGONAL_MOVEMENT) ? PDS_OBSTRUCTION : PDS_FORBIDDEN;
      } else if (cellHasTerrainFlag(i, j, T_PATHING_BLOCKER & ~T_OBSTRUCTS_PASSABILITY)) {
				costMap[i][j] = PDS_FORBIDDEN;
      } else {
        costMap[i][j] = 1;
      }
    }
  }
}


const LOCATION_FLAGS = {
	terrainFlags: 0,
	TMFlags: 0,
	cellFlags: 0
};

function getLocationFlags(x, y, limitToPlayerKnowledge)
{
  if (limitToPlayerKnowledge
      && (pmap[x][y].flags & (DISCOVERED | MAGIC_MAPPED))
      && !playerCanSee(x, y))
	{
      LOCATION_FLAGS.terrainFlags = pmap[x][y].rememberedTerrainFlags;
      LOCATION_FLAGS.TMFlags = pmap[x][y].rememberedTMFlags;
      LOCATION_FLAGS.cellFlags = pmap[x][y].rememberedCellFlags;
  } else {
      LOCATION_FLAGS.terrainFlags = terrainFlags(x, y);
      LOCATION_FLAGS.TMFlags = terrainMechFlags(x, y);
      LOCATION_FLAGS.cellFlags = pmap[x][y].flags;
  }

	return LOCATION_FLAGS;
}


function populateCreatureCostMap(costMap, /* creature */ monst) {
	let i, j, unexploredCellCost;
  let currentTenant;	// creature *
  let theItem;		// item *
  let terrainFlags, cFlags;

	unexploredCellCost = 10 + (clamp(rogue.depthLevel, 5, 15) - 5) * 2;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (monst === player && !(pmap[i][j].flags & (DISCOVERED | MAGIC_MAPPED))) {
				costMap[i][j] = PDS_OBSTRUCTION;
        continue;
			}

      const locFlags = getLocationFlags(i, j, monst === player);

      if ((locFlags.terrainFlags & T_OBSTRUCTS_PASSABILITY)
           && (!cellHasTMFlag(i, j, TM_IS_SECRET) || (discoveredTerrainFlagsAtLoc(i, j) & T_OBSTRUCTS_PASSABILITY) || monst === player))
		  {
					costMap[i][j] = (locFlags.terrainFlags & T_OBSTRUCTS_DIAGONAL_MOVEMENT) ? PDS_OBSTRUCTION : PDS_FORBIDDEN;
          continue;
      }

      if ((locFlags.terrainFlags & T_LAVA_INSTA_DEATH)
          && !(monst.info.flags & (MONST_IMMUNE_TO_FIRE | MONST_FLIES | MONST_INVULNERABLE))
          && (monst.status[STATUS_LEVITATING] || monst.status[STATUS_IMMUNE_TO_FIRE])
          && max(monst.status[STATUS_LEVITATING], monst.status[STATUS_IMMUNE_TO_FIRE]) < (rogue.mapToShore[i][j] + distanceBetween(i, j, monst.xLoc, monst.yLoc) * monst.movementSpeed / 100))
			{
          // Only a temporary effect will permit the monster to survive the lava, and the remaining duration either isn't
          // enough to get it to the spot, or it won't suffice to let it return to shore if it does get there.
          // Treat these locations as obstacles.
					costMap[i][j] = PDS_FORBIDDEN;
          continue;
			}

    if (((locFlags.terrainFlags & T_AUTO_DESCENT) || (locFlags.terrainFlags & T_IS_DEEP_WATER) && !(monst.info.flags & MONST_IMMUNE_TO_WATER))
        && !(monst.info.flags & MONST_FLIES)
        && (monst.status[STATUS_LEVITATING])
        && monst.status[STATUS_LEVITATING] < (rogue.mapToShore[i][j] + distanceBetween(i, j, monst.xLoc, monst.yLoc) * monst.movementSpeed / 100))
		{
        // Only a temporary effect will permit the monster to levitate over the chasm/water, and the remaining duration either isn't
        // enough to get it to the spot, or it won't suffice to let it return to shore if it does get there.
        // Treat these locations as obstacles.
				costMap[i][j] = PDS_FORBIDDEN;
        continue;
			}

      if (monsterAvoids(monst, i, j)) {
				costMap[i][j] = PDS_FORBIDDEN;
        continue;
			}

      if (cFlags & HAS_MONSTER) {
          currentTenant = monsterAtLoc(i, j);
          if (currentTenant
              && (currentTenant.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE))
              && !canPass(monst, currentTenant))
					{
              costMap[i][j] = PDS_FORBIDDEN;
              continue;
          }
			}

      if ((locFlags.cellFlags & KNOWN_TO_BE_TRAP_FREE)
          || (monst !== player && monst.creatureState != MONSTER_ALLY))
			{
          costMap[i][j] = 10;
      } else {
          // Player and allies give locations that are known to be free of traps
          // an advantage that increases with depth level, based on the depths
          // at which traps are generated.
          costMap[i][j] = unexploredCellCost;
      }

      if (!(monst.info.flags & MONST_INVULNERABLE)) {
          if ((locFlags.terrainFlags & T_CAUSES_NAUSEA)
              || cellHasTMFlag(i, j, TM_PROMOTES_ON_ITEM_PICKUP)
              || (locFlags.terrainFlags & T_ENTANGLES) && !(monst.info.flags & MONST_IMMUNE_TO_WEBS))
					{
              costMap[i][j] += 20;
          }
      }

      if (monst === player) {
          theItem = itemAtLoc(i, j);
          if (theItem && (theItem.flags & ITEM_PLAYER_AVOIDS)) {
              costMap[i][j] += 10;
          }
      }
		}
	}
}

function adjacentFightingDir() {
  let newX, newY;
  let dir;
  let monst;	// creature *

	if (cellHasTerrainFlag(player.xLoc, player.yLoc, T_OBSTRUCTS_PASSABILITY)) {
			return NO_DIRECTION;
	}

  for (dir = 0; dir < DIRECTION_COUNT; dir++) {
      newX = player.xLoc + nbDirs[dir][0];
      newY = player.yLoc + nbDirs[dir][1];
      monst = monsterAtLoc(newX, newY);
      if (monst
          && canSeeMonster(monst)
          && (!diagonalBlocked(player.xLoc, player.yLoc, newX, newY, false) || (monst.info.flags & MONST_ATTACKABLE_THRU_WALLS))
          && monstersAreEnemies(player, monst)
          && !(monst.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE)))
			{
          return dir;
      }
  }
  return NO_DIRECTION;
}

function exploreGoalValue(x, y) {	return Math.floor(0 - abs((x) - DCOLS / 2) / 3 - abs((x) - DCOLS / 2) / 4); }

function getExploreMap(/* short **/ map, headingToStairs) {// calculate explore map
	let i, j;
	let costMap;	// short **
	let theItem;	// item *

	costMap = allocGrid();
	populateCreatureCostMap(costMap, player);

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			map[i][j] = 30000; // Can be overridden later.
      theItem = itemAtLoc(i, j);
			if (!(pmap[i][j].flags & DISCOVERED)) {
        if ((pmap[i][j].flags & MAGIC_MAPPED)
            && (tileCatalog[pmap[i][j].layers[DUNGEON]].flags | tileCatalog[pmap[i][j].layers[LIQUID]].flags) & T_PATHING_BLOCKER) {
            // Magic-mapped cells revealed as obstructions should be treated as such even though they're not discovered.
            costMap[i][j] = cellHasTerrainFlag(i, j, T_OBSTRUCTS_DIAGONAL_MOVEMENT) ? PDS_OBSTRUCTION : PDS_FORBIDDEN;
        } else {
            costMap[i][j] = 1;
            map[i][j] = exploreGoalValue(i, j);
        }
			} else if (theItem
					   && !monsterAvoids(player, i, j))
		  {
				if (theItem.flags & ITEM_PLAYER_AVOIDS) {
					costMap[i][j] = 20;
				} else {
					costMap[i][j] = 1;
					map[i][j] = exploreGoalValue(i, j) - 10;
				}
			}
		}
	}

	costMap[rogue.downLoc[0]][rogue.downLoc[1]]	= 100;
	costMap[rogue.upLoc[0]][rogue.upLoc[1]]		= 100;

	if (headingToStairs) {
		map[rogue.downLoc[0]][rogue.downLoc[1]] = 0; // head to the stairs
	}

	dijkstraScan(map, costMap, true);

	//displayGrid(costMap);
	freeGrid(costMap);
}

async function explore(frameDelay) {
	let distanceMap;	// short **
  const path = ARRAY(1000, () => [-1, -1]); // short[1000][2],
	let steps;
	let madeProgress, headingToStairs;
	let dir;
	let monst;	// creature *

  // Explore commands should never be written to a recording.
  // Instead, the elemental movement commands that compose it
  // should be written individually.
  brogueAssert(!rogue.playbackMode);

	clearCursorPath();

	madeProgress	= false;
	headingToStairs	= false;

	if (player.status[STATUS_CONFUSED]) {
		message("Not while you're confused.", false);
		return false;
	}
	if (cellHasTerrainFlag(player.xLoc, player.yLoc, T_OBSTRUCTS_PASSABILITY)) {
			message("Not while you're trapped.", false);
			return false;
	}

  for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
      if (canSeeMonster(monst)) {
          monst.bookkeepingFlags |= MB_ALREADY_SEEN;
      } else {
          monst.bookkeepingFlags &= ~MB_ALREADY_SEEN;
      }
  }

	// fight any adjacent enemies
  dir = adjacentFightingDir();
  if (dir != NO_DIRECTION
      && await startFighting(dir, (player.status[STATUS_HALLUCINATING] ? true : false)))
	{
      return true;
  }

	if (!rogue.autoPlayingLevel) {
		message(KEYBOARD_LABELS ? "Exploring... press any key to stop." : "Exploring... touch anywhere to stop.",
                false);
		// A little hack so the exploring message remains bright while exploring and then auto-dims when
		// another message is displayed:
		confirmMessages();
		printString(KEYBOARD_LABELS ? "Exploring... press any key to stop." : "Exploring... touch anywhere to stop.",
                    mapToWindowX(0), mapToWindowY(-1), white, black, NULL);
	}
	rogue.disturbed = false;
	rogue.automationActive = true;

	distanceMap = allocGrid();
	do {
    // fight any adjacent enemies
    dir = adjacentFightingDir();
    if (dir != NO_DIRECTION) {
        await startFighting(dir, (player.status[STATUS_HALLUCINATING] ? true : false));
        if (rogue.disturbed) {
            madeProgress = true;
            continue;
        }
    }
    if (rogue.disturbed) {
        continue;
    }

		getExploreMap(distanceMap, headingToStairs);

    // hilite path
    steps = getPlayerPathOnMap(path, distanceMap, player.xLoc, player.yLoc);
    hilitePath(path, steps, false);

		// take a step
		dir = nextStep(distanceMap, player.xLoc, player.yLoc, NULL, false);

		if (!headingToStairs && rogue.autoPlayingLevel && dir == NO_DIRECTION) {
			headingToStairs = true;
			continue;
		}

		refreshSideBar(-1, -1, false);

		if (dir == NO_DIRECTION) {
			rogue.disturbed = true;
		} else if (! await playerMoves(dir)) {
			rogue.disturbed = true;
		} else {
			madeProgress = true;
			if (await pauseBrogue(frameDelay)) {
				rogue.disturbed = true;
				rogue.autoPlayingLevel = false;
			}
		}
    hilitePath(path, steps, true);
	} while (!rogue.disturbed);
	//clearCursorPath();
	rogue.automationActive = false;
	refreshSideBar(-1, -1, false);
	freeGrid(distanceMap);
	return madeProgress;
}


async function autoPlayLevel(fastForward) {
	let madeProgress;

	rogue.autoPlayingLevel = true;

	confirmMessages();
	message(KEYBOARD_LABELS ? "Playing... press any key to stop." : "Playing... touch anywhere to stop.", false);

	// explore until we are not making progress
	do {
		madeProgress = await explore(fastForward ? 1 : 50);
		//refreshSideBar(-1, -1, false);

		if (!madeProgress && rogue.downLoc[0] == player.xLoc && rogue.downLoc[1] == player.yLoc) {
			await useStairs(1);
			madeProgress = true;
		}
	} while (madeProgress && rogue.autoPlayingLevel);

	confirmMessages();

	rogue.autoPlayingLevel = false;
}

// short directionOfKeypress(unsigned short ch) {
// 	switch (ch) {
// 		case LEFT_KEY:
// 		case LEFT_ARROW:
// 		case NUMPAD_4:
// 			return LEFT;
// 		case RIGHT_KEY:
// 		case RIGHT_ARROW:
// 		case NUMPAD_6:
// 			return RIGHT;
// 		case UP_KEY:
// 		case UP_ARROW:
// 		case NUMPAD_8:
// 			return UP;
// 		case DOWN_KEY:
// 		case DOWN_ARROW:
// 		case NUMPAD_2:
// 			return DOWN;
// 		case UPLEFT_KEY:
// 		case NUMPAD_7:
// 			return UPLEFT;
// 		case UPRIGHT_KEY:
// 		case NUMPAD_9:
// 			return UPRIGHT;
// 		case DOWNLEFT_KEY:
// 		case NUMPAD_1:
// 			return DOWNLEFT;
// 		case DOWNRIGHT_KEY:
// 		case NUMPAD_3:
// 			return DOWNRIGHT;
// 		default:
// 			return -1;
// 	}
// }

async function startFighting(dir, tillDeath) {
	let x, y, expectedDamage;
	let monst;	// creature *

	x = player.xLoc + nbDirs[dir][0];
	y = player.yLoc + nbDirs[dir][1];
	monst = monsterAtLoc(x, y);
  if (monst.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE)) {
      return false;
  }
	expectedDamage = monst.info.damage.upperBound * fp_monsterDamageAdjustmentAmount(monst) >> FP_BASE;
	if (rogue.easyMode) {
		expectedDamage /= 5;
	}
	rogue.blockCombatText = true;
	rogue.disturbed = false;
	do {
		if (!await playerMoves(dir)) {
			break;
		}
		if (await pauseBrogue(1)) {
			break;
		}
	} while (!rogue.disturbed && !rogue.gameHasEnded && (tillDeath || player.currentHP > expectedDamage)
			 && (pmap[x][y].flags & HAS_MONSTER) && monsterAtLoc(x, y) == monst);

	rogue.blockCombatText = false;
  return rogue.disturbed;
}

function isDisturbed(x, y) {
	let i;
	let monst;	// creature *

	for (i=0; i< DIRECTION_COUNT; i++) {
		monst = monsterAtLoc(x + nbDirs[i][0], y + nbDirs[i][1]);
		if (pmap[x + nbDirs[i][0]][y + nbDirs[i][1]].flags & (HAS_ITEM)) {
			// Do not trigger for submerged or invisible or unseen monsters.
			return true;
		}
		if (monst
			&& !(monst.creatureState == MONSTER_ALLY)
			&& (canSeeMonster(monst) || monsterRevealed(monst))) {
			// Do not trigger for submerged or invisible or unseen monsters.
			return true;
		}
	}
	return false;
}

async function discover(x, y) {
	let layer;		// enum dungeonLayers
	let feat;			// dungeonFeature *
	if (cellHasTMFlag(x, y, TM_IS_SECRET)) {
		for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
			if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_IS_SECRET) {
				feat = dungeonFeatureCatalog[tileCatalog[pmap[x][y].layers[layer]].discoverType];
				pmap[x][y].layers[layer] = (layer == DUNGEON ? FLOOR : NOTHING);
				await spawnDungeonFeature(x, y, feat, true, false);
			}
		}
		refreshDungeonCell(x, y);

    if (playerCanSee(x, y)) {
        rogue.disturbed = true;
    }
	}
}

// returns true if found anything
async function search(searchStrength) {
	let i, j, radius, x, y, percent;
	let foundSomething = false;

	radius = Math.floor(searchStrength / 10);
	x = player.xLoc;
	y = player.yLoc;

	for (i = x - radius; i <= x + radius; i++) {
		for (j = y - radius; j <= y + radius; j++) {
			if (coordinatesAreInMap(i, j)
				&& playerCanDirectlySee(i, j))
			{
        percent = searchStrength - distanceBetween(x, y, i, j) * 10;
        if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)) {
            percent = percent * 2/3;
        }
				if (percent >= 100) {
						pmap[i][j].flags |= KNOWN_TO_BE_TRAP_FREE;
				}
        percent = min(percent, 100);

				if (cellHasTMFlag(i, j, TM_IS_SECRET)) {
					if (rand_percent(percent)) {
            await discover(i, j);
            foundSomething = true;
        	}
				}
			}
		}
	}
	return foundSomething;
}

function proposeOrConfirmLocation(x, y, failureMessage) {
  let retval = false;

	if (player.xLoc == x && player.yLoc == y) {
		message("you are already there.", false);
	} else if (pmap[x][y].flags & (DISCOVERED | MAGIC_MAPPED)) {
		if (rogue.cursorLoc[0] == x && rogue.cursorLoc[1] == y) {
    	retval = true;
		} else {
			rogue.cursorLoc[0] = x;
			rogue.cursorLoc[1] = y;
		}
	} else {
		message(failureMessage, false);
	}
  return retval;
}

async function useStairs(stairDirection) {
	let succeeded = false;
  //cellDisplayBuffer fromBuf[COLS][ROWS], toBuf[COLS][ROWS];

	if (stairDirection == 1) {
    if (rogue.depthLevel < DEEPEST_LEVEL) {
        //copyDisplayBuffer(fromBuf, displayBuffer);
        rogue.cursorLoc[0] = rogue.cursorLoc[1] = -1;
        rogue.depthLevel++;
        message("You descend.", false);
        await startLevel(rogue.depthLevel - 1, stairDirection);
        if (rogue.depthLevel > rogue.deepestLevel) {
            rogue.deepestLevel = rogue.depthLevel;
        }
        //copyDisplayBuffer(toBuf, displayBuffer);
        //irisFadeBetweenBuffers(fromBuf, toBuf, mapToWindowX(player.xLoc), mapToWindowY(player.yLoc), 10, false);
    } else if (numberOfMatchingPackItems(AMULET, 0, 0, false)) {
        await victory(true);
    } else {
				confirmMessages();
        message("the crystal archway repels you with a mysterious force!", lightBlue, false);
        message("(Only the bearer of the Amulet of Yendor may pass.)", backgroundMessageColor, false);
    }
		succeeded = true;
	} else {
		if (rogue.depthLevel > 1 || numberOfMatchingPackItems(AMULET, 0, 0, false)) {
			rogue.cursorLoc[0] = rogue.cursorLoc[1] = -1;
			rogue.depthLevel--;
			if (rogue.depthLevel == 0) {
				await victory(false);
			} else {
        //copyDisplayBuffer(fromBuf, displayBuffer);
				message("You ascend.", false);
				startLevel(rogue.depthLevel + 1, stairDirection);
        //copyDisplayBuffer(toBuf, displayBuffer);
        //irisFadeBetweenBuffers(fromBuf, toBuf, mapToWindowX(player.xLoc), mapToWindowY(player.yLoc), 10, true);
			}
			succeeded = true;
		} else {
			confirmMessages();
      message("The dungeon exit is magically sealed!", lightBlue, false);
      message("(Only the bearer of the Amulet of Yendor may pass.)", backgroundMessageColor, false);
		}
	}

	if (succeeded) {
      updatePlayerUnderwaterness();
	}

	return succeeded;
}


function storeMemories(x, y) {
    pmap[x][y].rememberedTerrainFlags = terrainFlags(x, y);
    pmap[x][y].rememberedTMFlags = terrainMechFlags(x, y);
    pmap[x][y].rememberedCellFlags = pmap[x][y].flags;
    pmap[x][y].rememberedTerrain = pmap[x][y].layers[highestPriorityLayer(x, y, false)];
}


function updateFieldOfViewDisplay(updateDancingTerrain, refreshDisplay) {
	let i, j;
	let theItem;	// item *
  const buf = STRING(), name = STRING();	// char[]

	// assureCosmeticRNG();

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (pmap[i][j].flags & IN_FIELD_OF_VIEW
				&& (max(0, tmap[i][j].light[0])
              + max(0, tmap[i][j].light[1])
              + max(0, tmap[i][j].light[2]) > VISIBILITY_THRESHOLD)
				&& !(pmap[i][j].flags & CLAIRVOYANT_DARKENED))
			{
				pmap[i][j].flags |= VISIBLE;
			}

			if ((pmap[i][j].flags & VISIBLE) && !(pmap[i][j].flags & WAS_VISIBLE)) { // if the cell became visible this move
				if (!(pmap[i][j].flags & DISCOVERED) && rogue.automationActive) {
            if (pmap[i][j].flags & HAS_ITEM) {
                theItem = itemAtLoc(i, j);
                if (theItem && (theItem.category & KEY)) {
                    itemName(theItem, name, false, true, NULL);
                    sprintf(buf, "you see %s.", name);
                    message(buf, itemMessageColor, false);
                }
            }
            if (!(pmap[i][j].flags & MAGIC_MAPPED)
                && cellHasTMFlag(i, j, TM_INTERRUPT_EXPLORATION_WHEN_SEEN))
						{
                strcpy(name, tileCatalog[pmap[i][j].layers[layerWithTMFlag(i, j, TM_INTERRUPT_EXPLORATION_WHEN_SEEN)]].description);
                sprintf(buf, "you see %s.", name);
                message(buf, backgroundMessageColor, false);
            }
        }
        discoverCell(i, j);
				if (refreshDisplay) {
					refreshDungeonCell(i, j);
				}
			} else if (!(pmap[i][j].flags & VISIBLE) && (pmap[i][j].flags & WAS_VISIBLE)) { // if the cell ceased being visible this move
        storeMemories(i, j);
				if (refreshDisplay) {
					refreshDungeonCell(i, j);
				}
			} else if (!(pmap[i][j].flags & CLAIRVOYANT_VISIBLE) && (pmap[i][j].flags & WAS_CLAIRVOYANT_VISIBLE)) { // ceased being clairvoyantly visible
				storeMemories(i, j);
				if (refreshDisplay) {
					refreshDungeonCell(i, j);
				}
			} else if (!(pmap[i][j].flags & WAS_CLAIRVOYANT_VISIBLE) && (pmap[i][j].flags & CLAIRVOYANT_VISIBLE)) { // became clairvoyantly visible
				pmap[i][j].flags &= ~STABLE_MEMORY;
				if (refreshDisplay) {
					refreshDungeonCell(i, j);
				}
			} else if (!(pmap[i][j].flags & TELEPATHIC_VISIBLE) && (pmap[i][j].flags & WAS_TELEPATHIC_VISIBLE)) { // ceased being telepathically visible
        storeMemories(i, j);
				if (refreshDisplay) {
					refreshDungeonCell(i, j);
				}
			} else if (!(pmap[i][j].flags & WAS_TELEPATHIC_VISIBLE) && (pmap[i][j].flags & TELEPATHIC_VISIBLE)) { // became telepathically visible
        if (!(pmap[i][j].flags & DISCOVERED)
					&& !cellHasTerrainFlag(i, j, T_PATHING_BLOCKER))
				{
					rogue.xpxpThisTurn++;
        }

				pmap[i][j].flags &= ~STABLE_MEMORY;
				if (refreshDisplay) {
					refreshDungeonCell(i, j);
				}
			} else if (playerCanSeeOrSense(i, j)
					   && (tmap[i][j].light[0] != tmap[i][j].oldLight[0] ||
						   tmap[i][j].light[1] != tmap[i][j].oldLight[1] ||
						   tmap[i][j].light[2] != tmap[i][j].oldLight[2])) // if the cell's light color changed this move
			{
			   if (refreshDisplay) {
				   refreshDungeonCell(i, j);
			   }
	   } else if (updateDancingTerrain
				  && playerCanSee(i, j)
				  && (!rogue.automationActive || !(rogue.playerTurnNumber % 5))
				  && ((tileCatalog[pmap[i][j].layers[DUNGEON]].backColor)       && tileCatalog[pmap[i][j].layers[DUNGEON]].backColor.colorDances
					  || (tileCatalog[pmap[i][j].layers[DUNGEON]].foreColor)    && tileCatalog[pmap[i][j].layers[DUNGEON]].foreColor.colorDances
					  || (tileCatalog[pmap[i][j].layers[LIQUID]].backColor)     && tileCatalog[pmap[i][j].layers[LIQUID]].backColor.colorDances
					  || (tileCatalog[pmap[i][j].layers[LIQUID]].foreColor)     && tileCatalog[pmap[i][j].layers[LIQUID]].foreColor.colorDances
					  || (tileCatalog[pmap[i][j].layers[SURFACE]].backColor)    && tileCatalog[pmap[i][j].layers[SURFACE]].backColor.colorDances
					  || (tileCatalog[pmap[i][j].layers[SURFACE]].foreColor)    && tileCatalog[pmap[i][j].layers[SURFACE]].foreColor.colorDances
					  || (tileCatalog[pmap[i][j].layers[GAS]].backColor)        && tileCatalog[pmap[i][j].layers[GAS]].backColor.colorDances
					  || (tileCatalog[pmap[i][j].layers[GAS]].foreColor)        && tileCatalog[pmap[i][j].layers[GAS]].foreColor.colorDances
					  || player.status[STATUS_HALLUCINATING]))
			{
				  pmap[i][j].flags &= ~STABLE_MEMORY;
				  if (refreshDisplay) {
					  refreshDungeonCell(i, j);
				  }
			  }
		}
	}
	// restoreRNG();
}


//		   Octants:      //
//			\7|8/        //
//			6\|/1        //
//			--@--        //
//			5/|\2        //
//			/4|3\        //

function betweenOctant1andN(x, y, x0, y0, n) {
	let x1 = x, y1 = y;
	let dx = x1 - x0, dy = y1 - y0;
	switch (n) {
		case 1:
			return [x,y];
		case 2:
			return [x, y0 - dy];
		case 5:
			return [x0 - dx, y0 - dy];
		case 6:
			return [x0 - dx, y];
		case 8:
			return [x0 - dy, y0 - dx];
		case 3:
			return [x0 - dy, y0 + dx];
		case 7:
			return [x0 + dy, y0 - dx];
		case 4:
			return [x0 + dy, y0 + dx];
	}
}

// Returns a boolean grid indicating whether each square is in the field of view of (xLoc, yLoc).
// forbiddenTerrain is the set of terrain flags that will block vision (but the blocking cell itself is
// illuminated); forbiddenFlags is the set of map flags that will block vision.
// If cautiousOnWalls is set, we will not illuminate blocking tiles unless the tile one space closer to the origin
// is visible to the player; this is to prevent lights from illuminating a wall when the player is on the other
// side of the wall.
function getFOVMask( grid /* char[DCOLS][DROWS] */, xLoc, yLoc, maxRadius,
				forbiddenTerrain,	forbiddenFlags, cautiousOnWalls)
{
	let i;

	for (i=1; i<=8; i++) {
		scanOctantFOV(grid, xLoc, yLoc, i, maxRadius, 1, LOS_SLOPE_GRANULARITY * -1, 0,
					  forbiddenTerrain, forbiddenFlags, cautiousOnWalls);
	}
}

// Number.parseInt((t * t).toString(16).padStart(16, '0').substring(0, 8), 16)

// This is a custom implementation of recursive shadowcasting.
function scanOctantFOV( grid /* char[DCOLS][DROWS] */, xLoc, yLoc, octant, maxRadius,
				   columnsRightFromOrigin, startSlope, endSlope, forbiddenTerrain,
				   forbiddenFlags, cautiousOnWalls)
{
	if (columnsRightFromOrigin << FP_BASE >= maxRadius) return;

	let i, a, b, iStart, iEnd, x, y, x2, y2; // x and y are temporary variables on which we do the octant transform
	let newStartSlope, newEndSlope;
	let cellObstructed;
	let loc;

	if (Math.floor(maxRadius) != maxRadius) {
			maxRadius = Math.floor(maxRadius);
	}
	newStartSlope = startSlope;

	a = Math.round(((LOS_SLOPE_GRANULARITY / -2 + 1) + startSlope * columnsRightFromOrigin) / LOS_SLOPE_GRANULARITY);
	b = Math.round(((LOS_SLOPE_GRANULARITY / -2 + 1) + endSlope * columnsRightFromOrigin) / LOS_SLOPE_GRANULARITY);

	iStart = min(a, b);
	iEnd = max(a, b);

	// restrict vision to a circle of radius maxRadius

	// !!!!!!!!!!!!!!!
	// SEAN FIXME!!!!!!  WE CANNOT DO 32 Bit Shift
	// !!!!!!!!!!!!!!!
	const radiusSquared = Number(BigInt(maxRadius*maxRadius) >> (BIG_BASE*2n));
	if ((columnsRightFromOrigin*columnsRightFromOrigin + iEnd*iEnd) >= radiusSquared ) {
		return;
	}
	if ((columnsRightFromOrigin*columnsRightFromOrigin + iStart*iStart) >= radiusSquared ) {
		const bigRadiusSquared = Number(BigInt(maxRadius*maxRadius) >> BIG_BASE); // (maxRadius*maxRadius >> FP_BASE)
		const bigColumsRightFromOriginSquared = Number(BigInt(columnsRightFromOrigin*columnsRightFromOrigin) << BIG_BASE);	// (columnsRightFromOrigin*columnsRightFromOrigin << FP_BASE)
		iStart = Math.floor(-1 * fp_sqrt(bigRadiusSquared - bigColumsRightFromOriginSquared) >> FP_BASE);
	}

	x = xLoc + columnsRightFromOrigin;
	y = yLoc + iStart;
	loc = betweenOctant1andN(x, y, xLoc, yLoc, octant);
	x = loc[0];
	y = loc[1];
	let currentlyLit = coordinatesAreInMap(x, y) && !(cellHasTerrainFlag(x, y, forbiddenTerrain) ||
														  (pmap[x][y].flags & forbiddenFlags));
	for (i = iStart; i <= iEnd; i++) {
		x = xLoc + columnsRightFromOrigin;
		y = yLoc + i;
		loc = betweenOctant1andN(x, y, xLoc, yLoc, octant);
		x = loc[0];
		y = loc[1];
		if (!coordinatesAreInMap(x, y)) {
			// We're off the map -- here there be memory corruption.
			continue;
		}
		cellObstructed = (cellHasTerrainFlag(x, y, forbiddenTerrain) || (pmap[x][y].flags & forbiddenFlags));
		// if we're cautious on walls and this is a wall:
		if (cautiousOnWalls && cellObstructed) {
			// (x2, y2) is the tile one space closer to the origin from the tile we're on:
			x2 = xLoc + columnsRightFromOrigin - 1;
			y2 = yLoc + i;
			if (i < 0) {
				y2++;
			} else if (i > 0) {
				y2--;
			}
			loc = betweenOctant1andN(x2, y2, xLoc, yLoc, octant);
			x2 = loc[0];
			y2 = loc[1];

			if (pmap[x2][y2].flags & IN_FIELD_OF_VIEW) {
				// previous tile is visible, so illuminate
				grid[x][y] = 1;
			}
		} else {
			// illuminate
			grid[x][y] = 1;
		}
		if (!cellObstructed && !currentlyLit) { // next column slope starts here
			newStartSlope = Math.round((LOS_SLOPE_GRANULARITY * (i) - LOS_SLOPE_GRANULARITY / 2) / (columnsRightFromOrigin * 2 + 1) * 2);
			currentlyLit = true;
		} else if (cellObstructed && currentlyLit) { // next column slope ends here
			newEndSlope = Math.round((LOS_SLOPE_GRANULARITY * (i) - LOS_SLOPE_GRANULARITY / 2)
							/ (columnsRightFromOrigin * 2 - 1) * 2);
			if (newStartSlope <= newEndSlope) {
				// run next column
				scanOctantFOV(grid, xLoc, yLoc, octant, maxRadius, columnsRightFromOrigin + 1, newStartSlope, newEndSlope,
							  forbiddenTerrain, forbiddenFlags, cautiousOnWalls);
			}
			currentlyLit = false;
		}
	}
	if (currentlyLit) { // got to the bottom of the scan while lit
		newEndSlope = endSlope;
		if (newStartSlope <= newEndSlope) {
			// run next column
			scanOctantFOV(grid, xLoc, yLoc, octant, maxRadius, columnsRightFromOrigin + 1, newStartSlope, newEndSlope,
						  forbiddenTerrain, forbiddenFlags, cautiousOnWalls);
		}
	}
}

function addScentToCell(x, y, distance) {
  let value;
	if (!cellHasTerrainFlag(x, y, T_OBSTRUCTS_SCENT) || !cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)) {
    value = Math.floor(rogue.scentTurnNumber - distance);
		scentMap[x][y] = max(value, Math.floor(scentMap[x][y]) );
	}
}
