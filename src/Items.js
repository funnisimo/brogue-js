/*
 *  Items.c
 *  Brogue
 *
 *  Created by Brian Walker on 1/17/09.
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

function initializeItem() {
	let i;
	let theItem;	// item *

	theItem = item(); // (item *) malloc(sizeof(item));

	theItem.category = 0;
	theItem.kind = 0;
	theItem.flags = 0;
	theItem.displayChar = '&';
	theItem.foreColor = itemColor;
	theItem.inventoryColor = white;
	theItem.inventoryLetter = '';
	theItem.armor = 0;
	theItem.strengthRequired = 0;
	theItem.enchant1 = 0;
	theItem.enchant2 = 0;
  theItem.timesEnchanted = 0;
	theItem.vorpalEnemy = 0;
	theItem.charges = 0;
	theItem.quantity = 1;
	theItem.quiverNumber = 0;
	theItem.originDepth = 0;
	theItem.inscription.clear();
	theItem.nextItem = NULL;

	for (i=0; i < KEY_ID_MAXIMUM; i++) {
		theItem.keyLoc[i].x = 0;
		theItem.keyLoc[i].y = 0;
		theItem.keyLoc[i].machine = 0;
		theItem.keyLoc[i].disposableHere = false;
	}

  return theItem;
}

// Allocates space, generates a specified item (or random category/kind if -1)
// and returns a pointer to that item. The item is not given a location here
// and is not inserted into the item chain!
function generateItem(theCategory, theKind) {
	const theItem = initializeItem();
	makeItemInto(theItem, theCategory, theKind);
	return theItem;
}


function copyItem(dest, src) {
			dest.category = src.category
			dest.kind = src.kind;
			dest.flags = src.flags;
			dest.damage = randomRange(src.damage);		/* randomRange */
			dest.armor = src.armor;
			dest.charges = src.charges;
			dest.enchant1 = src.enchant1;
			dest.enchant2 = src.enchant2;
		  dest.timesEnchanted = src.timesEnchanted;
			dest.vorpalEnemy = src.vorpalEnemy;	/* ENUM monsterTypes */
			dest.strengthRequired = src.strengthRequired;
			dest.quiverNumber = src.quiverNumber;
			dest.displayChar = src.displayChar;
			dest.foreColor = src.foreColor;
			dest.inventoryColor = src.inventoryColor;
			dest.quantity = src.quantity;
			dest.inventoryLetter = src.inventoryLetter;
			dest.inscription.copy(src.inscription); // [DCOLS];
			dest.xLoc = src.xLoc;
			dest.yLoc = src.yLoc;
			dest.originDepth = src.originDepth;
			dest.nextItem = src.nextItem;		/* struct item */

			for(let i = 0; i < KEY_ID_MAXIMUM; ++i) {
				const dk = dest.keyLoc[i];
				const sk = src.keyLoc[i];

				dk.x = sk.x;
				dk.y = sk.y;
				dk.machine = sk.machine;
				dk.disposableHere = dk.disposableHere;
			}

}

function pickItemCategory(theCategory) {
	let i, sum, randIndex;
	const probabilities           =	[50,	  42,		  52,		  3,		  3,		10,		  8,		  2,		3,      2,        0,		  0,		0];
	const correspondingCategories =	[GOLD,	SCROLL,	POTION,	STAFF,	WAND,	WEAPON,	ARMOR,	FOOD,	RING,   CHARM,    AMULET,	GEM,	KEY];

	sum = 0;

	for (i=0; i<correspondingCategories.length; i++) {
		if (theCategory <= 0 || theCategory & correspondingCategories[i]) {
			sum += probabilities[i];
		}
	}

	if (sum == 0) {
		return theCategory; // e.g. when you pass in AMULET or GEM, since they have no frequency
	}

	randIndex = rand_range(1, sum);

	for (i=0; ; i++) {
		if (theCategory <= 0 || theCategory & correspondingCategories[i]) {
			if (randIndex <= probabilities[i]) {
				return correspondingCategories[i];
			}
			randIndex -= probabilities[i];
		}
	}
}

// Sets an item to the given type and category (or chooses randomly if -1) with all other stats
function makeItemInto(/* item */ theItem, itemCategory, itemKind) {
	let theEntry = NULL;  // itemTable *

	if (itemCategory <= 0) {
		itemCategory = ALL_ITEMS;
	}

	itemCategory = pickItemCategory(itemCategory);

	theItem.category = itemCategory;

	switch (itemCategory)
  {
		case FOOD:
			if (itemKind < 0) {
				itemKind = chooseKind(foodTable, NUMBER_FOOD_KINDS);
			}
			theEntry = foodTable[itemKind];
			theItem.displayChar = FOOD_CHAR;
			theItem.flags |= ITEM_IDENTIFIED;
			break;

		case WEAPON:
			if (itemKind < 0) {
				itemKind = chooseKind(weaponTable, NUMBER_WEAPON_KINDS);
			}
			theEntry = weaponTable[itemKind];
			theItem.damage = weaponTable[itemKind].range;
			theItem.strengthRequired = weaponTable[itemKind].strengthRequired;
			theItem.displayChar = WEAPON_CHAR;

			switch (itemKind) {
        case DAGGER:
            theItem.flags |= ITEM_SNEAK_ATTACK_BONUS;
            break;
				case MACE:
				case HAMMER:
					// theItem.flags |= ITEM_ATTACKS_HIT_SLOWLY;
					theItem.flags |= ITEM_ATTACKS_STAGGER;
					break;
        case WHIP:
            theItem.flags |= ITEM_ATTACKS_EXTEND;
            break;
				case RAPIER:
					theItem.flags |= (ITEM_ATTACKS_QUICKLY | ITEM_LUNGE_ATTACKS);
					break;
        case FLAIL:
            theItem.flags |= ITEM_PASS_ATTACKS;
            break;
				case SPEAR:
				case PIKE:
					theItem.flags |= ITEM_ATTACKS_PENETRATE;
					break;
				case AXE:
				case WAR_AXE:
					theItem.flags |= ITEM_ATTACKS_ALL_ADJACENT;
					break;
				default:
					break;
			}

			if (rand_percent(40)) {
				theItem.enchant1 += rand_range(1, 3);
				if (rand_percent(50)) {
					// cursed
					theItem.enchant1 *= -1;
					theItem.flags |= ITEM_CURSED;
					if (rand_percent(33)) { // give it a bad runic
						theItem.enchant2 = rand_range(NUMBER_GOOD_WEAPON_ENCHANT_KINDS, NUMBER_WEAPON_RUNIC_KINDS - 1);
						theItem.flags |= ITEM_RUNIC;
					}
				} else if (rand_range(3, 10)
                           * ((theItem.flags & ITEM_ATTACKS_STAGGER) ? 2 : 1)
                           / ((theItem.flags & ITEM_ATTACKS_QUICKLY) ? 2 : 1)
													 * ((theItem.flags & ITEM_ATTACKS_EXTEND)  ? 2 : 1)
                           > theItem.damage.lowerBound)
				{
					// give it a good runic; lower damage items are more likely to be runic
					theItem.enchant2 = rand_range(0, NUMBER_GOOD_WEAPON_ENCHANT_KINDS - 1);
					theItem.flags |= ITEM_RUNIC;
					if (theItem.enchant2 == W_SLAYING) {
						theItem.vorpalEnemy = chooseVorpalEnemy();
					}
				} else {
            while (rand_percent(10)) {
                theItem.enchant1++;
            }
        }
			}
			if (itemKind == DART || itemKind == INCENDIARY_DART || itemKind == JAVELIN) {
				if (itemKind == INCENDIARY_DART) {
					theItem.quantity = rand_range(3, 6);
				} else {
					theItem.quantity = rand_range(5, 18);
				}
				theItem.quiverNumber = rand_range(1, 60000);
				theItem.flags &= ~(ITEM_CURSED | ITEM_RUNIC); // throwing weapons can't be cursed or runic
				theItem.enchant1 = 0; // throwing weapons can't be magical
			}
			theItem.charges = WEAPON_KILLS_TO_AUTO_ID; // kill 20 enemies to auto-identify
			break;

		case ARMOR:
			if (itemKind < 0) {
				itemKind = chooseKind(armorTable, NUMBER_ARMOR_KINDS);
			}
			theEntry = armorTable[itemKind];
			theItem.armor = randClump(armorTable[itemKind].range);
			theItem.strengthRequired = armorTable[itemKind].strengthRequired;
			theItem.displayChar = ARMOR_CHAR;
			theItem.charges = ARMOR_DELAY_TO_AUTO_ID; // this many turns until it reveals its enchants and whether runic
			if (rand_percent(40)) {
				theItem.enchant1 += rand_range(1, 3);
				if (rand_percent(50)) {
					// cursed
					theItem.enchant1 *= -1;
					theItem.flags |= ITEM_CURSED;
					if (rand_percent(33)) { // give it a bad runic
						theItem.enchant2 = rand_range(NUMBER_GOOD_ARMOR_ENCHANT_KINDS, NUMBER_ARMOR_ENCHANT_KINDS - 1);
						theItem.flags |= ITEM_RUNIC;
					}
				} else if (rand_range(0, 95) > theItem.armor) { // give it a good runic
					theItem.enchant2 = rand_range(0, NUMBER_GOOD_ARMOR_ENCHANT_KINDS - 1);
					theItem.flags |= ITEM_RUNIC;
					if (theItem.enchant2 == A_IMMUNITY) {
						theItem.vorpalEnemy = chooseVorpalEnemy();
					}
				} else {
            while (rand_percent(10)) {
                theItem.enchant1++;
            }
        }
			}
			break;
		case SCROLL:
			if (itemKind < 0) {
				itemKind = chooseKind(scrollTable, NUMBER_SCROLL_KINDS);
			}
			theEntry = scrollTable[itemKind];
			theItem.displayChar = SCROLL_CHAR;
			theItem.flags |= ITEM_FLAMMABLE;
			break;
		case POTION:
			if (itemKind < 0) {
				itemKind = chooseKind(potionTable, NUMBER_POTION_KINDS);
			}
			theEntry = potionTable[itemKind];
			theItem.displayChar = POTION_CHAR;
			break;
		case STAFF:
			if (itemKind < 0) {
				itemKind = chooseKind(staffTable, NUMBER_STAFF_KINDS);
			}
			theEntry = staffTable[itemKind];
			theItem.displayChar = STAFF_CHAR;
			theItem.charges = 2;
			if (rand_percent(50)) {
				theItem.charges++;
				if (rand_percent(15)) {
					theItem.charges++;
          while (rand_percent(10)) {
              theItem.charges++;
          }
				}
			}
			theItem.enchant1 = theItem.charges;
			theItem.enchant2 = (itemKind == STAFF_BLINKING || itemKind == STAFF_OBSTRUCTION ? 1000 : 500); // start with no recharging mojo
			break;
		case WAND:
			if (itemKind < 0) {
				itemKind = chooseKind(wandTable, NUMBER_WAND_KINDS);
			}
			theEntry = wandTable[itemKind];
			theItem.displayChar = WAND_CHAR;
			theItem.charges = randClump(wandTable[itemKind].range);
			break;
		case RING:
			if (itemKind < 0) {
				itemKind = chooseKind(ringTable, NUMBER_RING_KINDS);
			}
			theEntry = ringTable[itemKind];
			theItem.displayChar = RING_CHAR;
			theItem.enchant1 = randClump(ringTable[itemKind].range);
			theItem.charges = RING_DELAY_TO_AUTO_ID; // how many turns of being worn until it auto-identifies
			if (rand_percent(16)) {
				// cursed
				theItem.enchant1 *= -1;
				theItem.flags |= ITEM_CURSED;
			} else {
          while (rand_percent(10)) {
              theItem.enchant1++;
          }
      }
			break;
    case CHARM:
			if (itemKind < 0) {
				itemKind = chooseKind(charmTable, NUMBER_CHARM_KINDS);
			}
      theItem.displayChar = CHARM_CHAR;
      theItem.charges = 0; // Charms are initially ready for use.
      theItem.enchant1 = randClump(charmTable[itemKind].range);
      while (rand_percent(7)) {
          theItem.enchant1++;
      }
			theItem.flags |= ITEM_IDENTIFIED;
      break;
		case GOLD:
			theEntry = NULL;
			theItem.displayChar = GOLD_CHAR;
			theItem.quantity = rand_range(50 + rogue.depthLevel * 10, 100 + rogue.depthLevel * 15);
			break;
		case AMULET:
			theEntry = NULL;
			theItem.displayChar = AMULET_CHAR;
			itemKind = 0;
			theItem.flags |= ITEM_IDENTIFIED;
			break;
		case GEM:
			theEntry = NULL;
			theItem.displayChar = GEM_CHAR;
			itemKind = 0;
			theItem.flags |= ITEM_IDENTIFIED;
			break;
		case KEY:
			theEntry = NULL;
			theItem.displayChar = KEY_CHAR;
			theItem.flags |= ITEM_IDENTIFIED;
			break;
		default:
			theEntry = NULL;
			ERROR("something has gone terribly wrong!", true);
			break;
	}
	if (theItem
		&& !(theItem.flags & ITEM_IDENTIFIED)
		&& (!(theItem.category & (POTION | SCROLL) ) || (theEntry && !theEntry.identified)))
	{
		theItem.flags |= ITEM_CAN_BE_IDENTIFIED;
	}
	theItem.kind = itemKind;

	return theItem;
}


function chooseKind(/* itemTable */ theTable, numKinds) {
	let i, totalFrequencies = 0, randomFrequency;
	for (i=0; i<numKinds; i++) {
		totalFrequencies += max(0, theTable[i].frequency);
	}
	randomFrequency = rand_range(1, totalFrequencies);
	for (i=0; randomFrequency > theTable[i].frequency; i++) {
		randomFrequency -= max(0, theTable[i].frequency);
	}
	return i;
}

// Places an item at (x,y) if provided or else a random location if they're 0. Inserts item into the floor list.
async function placeItem(/* item */ theItem, x, y, administrative) {
	let loc;
	let layer;		// enum dungeonLayers
	const theItemName = STRING(), buf = STRING(); // char[DCOLS];

	if (x <= 0 || y <= 0) {
		loc = randomMatchingLocation(FLOOR, NOTHING, -1);
		x = loc[0];
		y = loc[1];
	}

	theItem.xLoc = x;
	theItem.yLoc = y;

	if (D_MESSAGE_ITEM_GENERATION) {
		itemName(theItem, theItemName, false);
		sprintf(buf, "Generated Item: %s @ %i,%i", theItemName, theItem.xLoc, theItem.yLoc);
		printf(buf);
		message(buf, false);
	}

	removeItemFromChain(theItem, floorItems); // just in case; double-placing an item will result in game-crashing loops in the item list
  addItemToChain(theItem, floorItems);
	pmap[x][y].flags |= HAS_ITEM;
	if ((theItem.flags & ITEM_MAGIC_DETECTED) && itemMagicChar(theItem)) {
		pmap[x][y].flags |= ITEM_DETECTED;
	}
	if (D_ITEM_OMNISCIENCE) {
		pmap[x][y].flags |= ITEM_DETECTED;
		refreshDungeonCell(x, y);
	}
	if (cellHasTerrainFlag(x, y, T_IS_DF_TRAP)
    && !cellHasTerrainFlag(x, y, T_MOVES_ITEMS)
		&& !(pmap[x][y].flags & PRESSURE_PLATE_DEPRESSED))
	{
		pmap[x][y].flags |= PRESSURE_PLATE_DEPRESSED;
		if (!administrative && playerCanSee(x, y)) {
			if (cellHasTMFlag(x, y, TM_IS_SECRET)) {
				await discover(x, y);
				refreshDungeonCell(x, y);
			}
			itemName(theItem, theItemName, false, false, NULL);
			sprintf(buf, "a pressure plate clicks underneath the %s!", theItemName);
			await messageWithAck(buf);
		}
		for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
			if (tileCatalog[pmap[x][y].layers[layer]].flags & T_IS_DF_TRAP) {
				await spawnDungeonFeature(x, y, dungeonFeatureCatalog[tileCatalog[pmap[x][y].layers[layer]].fireType], true, false);
				await promoteTile(x, y, layer, false);
			}
		}
	}
	return theItem;
}

function fillItemSpawnHeatMap(heatMap /* short[DCOLS][DROWS] */, heatLevel, x, y) {
	let dir;
	let newX, newY;

	if (pmap[x][y].layers[DUNGEON] == DOOR) {
		heatLevel += 10;
	} else if (pmap[x][y].layers[DUNGEON] == SECRET_DOOR) {
		heatLevel += 3000;
	}
	if (heatMap[x][y] > heatLevel) {
		heatMap[x][y] = heatLevel;
	}
	for (dir = 0; dir < 4; dir++) {
		newX = x + nbDirs[dir][0];
		newY = y + nbDirs[dir][1];
		if (coordinatesAreInMap(newX, newY)
			&& !cellHasTerrainFlag(newX, newY, T_IS_DEEP_WATER | T_LAVA_INSTA_DEATH | T_AUTO_DESCENT)
			&& isPassableOrSecretDoor(newX, newY)
			&& heatLevel < heatMap[newX][newY])
		{
			fillItemSpawnHeatMap(heatMap, heatLevel, newX, newY);
		}
	}
}

function coolHeatMapAt( heatMap /* short[DCOLS][DROWS] */, x, y, totalHeat) {
	let k, l;
	let currentHeat;

	currentHeat = heatMap[x][y];
	if (currentHeat == 0) {
		return totalHeat;
	}
	totalHeat -= heatMap[x][y];
	heatMap[x][y] = 0;

	// lower the heat near the chosen location
	for (k = -5; k <= 5; k++) {
		for (l = -5; l <= 5; l++) {
			if (coordinatesAreInMap(x+k, y+l) && heatMap[x+k][y+l] == currentHeat) {
				heatMap[x+k][y+l] = max(1, Math.floor(heatMap[x+k][y+l] / 10) );
				totalHeat -= (currentHeat - heatMap[x+k][y+l]);
			}
		}
	}

	return totalHeat;
}

// Returns false if no place could be found.
// That should happen only if the total heat is zero.
function getItemSpawnLoc(heatMap /* short[DCOLS][DROWS]*/, totalHeat) {
	let randIndex;
	let currentHeat;
	let i, j;

	if (totalHeat <= 0) {
		return false;
	}

	randIndex = rand_range(1, totalHeat);

	//printf("\nrandIndex: %i", randIndex);

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			currentHeat = heatMap[i][j];
			if (randIndex <= currentHeat) { // this is the spot!
				return [i, j];
			}
			randIndex -= currentHeat;
		}
	}
  brogueAssert(0); // should never get here!
	return false;
}

// function aggregateGoldLowerBound(d)	{ return Math.floor(pow((d), 3.05) + 320 * (d) + FLOAT_FUDGE); }
// function aggregateGoldUpperBound(d)	{ return Math.floor(pow((d), 3.05) + 420 * (d) + FLOAT_FUDGE); }

const POW_GOLD = [
		// b^3.05, with b from 0 to 25:
		0, 1, 8, 28, 68, 135, 236, 378, 568, 813, 1122, 1500, 1956, 2497, 3131,
		3864, 4705, 5660, 6738, 7946, 9292, 10783, 12427, 14232, 16204, 18353];

function aggregateGoldLowerBound(d)	{ return (POW_GOLD[d] + 320 * (d)); }
function aggregateGoldUpperBound(d)	{ return (POW_GOLD[d] + 420 * (d)); }

const POW_FOOD = [
		// b^1.35 << FP_BASE, with b from 1 to 50 (for future-proofing):
		65536, 167059, 288797, 425854, 575558, 736180, 906488, 1085553, 1272645,
		1467168, 1668630, 1876612, 2090756, 2310749, 2536314, 2767208, 3003211,
		3244126, 3489773, 3739989, 3994624, 4253540, 4516609, 4783712, 5054741,
		5329591, 5608167, 5890379, 6176141, 6465373, 6758000, 7053950, 7353155,
		7655551, 7961076, 8269672, 8581283, 8895856, 9213341, 9533687, 9856849,
		10182782, 10511443, 10842789, 11176783, 11513384, 11852556, 12194264,
		12538472, 12885148];



// Generates and places items for the level. Must pass the location of the up-stairway on the level.
async function populateItems(upstairsX, upstairsY) {
	if (!ITEMS_ENABLED) {
		return;
	}
	let theItem;	// item *
	const itemSpawnHeatMap = GRID(DCOLS, DROWS); // unsigned short[DCOLS][DROWS];
	let i, j, numberOfItems, numberOfGoldPiles, goldBonusProbability, x = 0, y = 0;
	let totalHeat;
	let theCategory, theKind, randomDepthOffset = 0;
	const buf = STRING(), buf2 = STRING();

// #ifdef AUDIT_RNG
// 	char RNGmessage[100];
// #endif

	if (rogue.depthLevel > AMULET_LEVEL) {
    if (rogue.depthLevel - AMULET_LEVEL - 1 >= 8) {
        numberOfItems = 1;
    } else {
        const lumenstoneDistribution = [3, 3, 3, 2, 2, 2, 2, 2];
        numberOfItems = lumenstoneDistribution[rogue.depthLevel - AMULET_LEVEL - 1];
    }
		numberOfGoldPiles = 0;
	} else {
    rogue.lifePotionFrequency += 34;
		rogue.strengthPotionFrequency += 17;
		rogue.enchantScrollFrequency += 30;
		numberOfItems = 3;
		while (rand_percent(60)) {
			numberOfItems++;
		}
		if (rogue.depthLevel <= 2) {
			numberOfItems += 2; // 4 extra items to kickstart your career as a rogue
		} else if (rogue.depthLevel <= 4) {
			numberOfItems++; // and 2 more here
		}

		numberOfGoldPiles = min(5, Math.floor(rogue.depthLevel / 4));
		for (goldBonusProbability = 60;
			 rand_percent(goldBonusProbability) && numberOfGoldPiles <= 10;
			 goldBonusProbability -= 15)
		{
			numberOfGoldPiles++;
		}
		// Adjust the amount of gold if we're past depth 5 and we were below or above
		// the production schedule as of the previous depth.
		if (rogue.depthLevel > 5) {
			if (rogue.goldGenerated < aggregateGoldLowerBound(rogue.depthLevel - 1)) {
				numberOfGoldPiles += 2;
			} else if (rogue.goldGenerated > aggregateGoldUpperBound(rogue.depthLevel - 1)) {
				numberOfGoldPiles -= 2;
			}
		}
	}

  // Create an item spawn heat map to bias item generation behind secret doors (and, to a lesser
  // extent, regular doors). This is in terms of the number of secret/regular doors that must be
  // passed to reach the area when pathing to it from the upward staircase.
	// This is why there are often several items in well hidden secret rooms. Otherwise,
	// those rooms are usually empty, which is demoralizing after you take the trouble to find them.
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			itemSpawnHeatMap[i][j] = 50000;
		}
	}
	fillItemSpawnHeatMap(itemSpawnHeatMap, 5, upstairsX, upstairsY);
	totalHeat = 0;

// #ifdef AUDIT_RNG
// 	sprintf(RNGmessage, "\n\nInitial heat map for level %i:\n", rogue.currentTurnNumber);
// 	RNGLog(RNGmessage);
// #endif

	for (j=0; j<DROWS; j++) {
		for (i=0; i<DCOLS; i++) {
			if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_ITEMS | T_PATHING_BLOCKER)
				|| (pmap[i][j].flags & (IS_CHOKEPOINT | IN_LOOP | IS_IN_MACHINE))
				|| passableArcCount(i, j) > 1) // Not in walls, hallways, quest rooms, loops or chokepoints, please.
			{
				itemSpawnHeatMap[i][j] = 0;
			}
			else if (itemSpawnHeatMap[i][j] == 50000)
			{
				itemSpawnHeatMap[i][j] = 0;
				pmap[i][j].layers[DUNGEON] = WALL; // due to a bug that created occasional isolated one-cell islands;
                                           // not sure if it's still around, but this is a good-enough failsafe
			}
// #ifdef AUDIT_RNG
// 			sprintf(RNGmessage, "%u%s%s\t%s",
// 					itemSpawnHeatMap[i][j],
// 					((pmap[i][j].flags & IS_CHOKEPOINT) ? " (C)": ""), // chokepoint
// 					((pmap[i][j].flags & IN_LOOP) ? " (L)": ""), // loop
// 					(i == DCOLS-1 ? "\n" : ""));
// 			RNGLog(RNGmessage);
// #endif
			totalHeat += itemSpawnHeatMap[i][j];
		}
	}

	if (D_INSPECT_ITEM_GEN) {
		let map = allocGrid(); // short **
		for (i=0; i<DCOLS; i++) {
			for (j=0; j<DROWS; j++) {
				map[i][j] = itemSpawnHeatMap[i][j] * -1;
			}
		}
		dumpLevelToScreen();
		displayGrid(map);
		freeGrid(map);
		await temporaryMessage("Item spawn heat map:", true);
	}

  if (rogue.depthLevel > 2) {
      // Include a random factor in food and potion of life generation to make things slightly less predictable.
      randomDepthOffset = rand_range(-1, 1);
      randomDepthOffset += rand_range(-1, 1);
  }

	for (i=0; i<numberOfItems; i++) {
		theCategory = ALL_ITEMS & ~GOLD; // gold is placed separately, below, so it's not a punishment
		theKind = -1;

		scrollTable[SCROLL_ENCHANTING].frequency = rogue.enchantScrollFrequency;
		potionTable[POTION_STRENGTH].frequency = rogue.strengthPotionFrequency;
    potionTable[POTION_LIFE].frequency = rogue.lifePotionFrequency;

		// Adjust the desired item category if necessary.
		if ( (rogue.foodSpawned + Math.floor(foodTable[RATION].strengthRequired / 3)) * 4 << FP_BASE
			<= Math.floor((POW_FOOD[rogue.depthLevel - 1] + (randomDepthOffset << FP_BASE)) * foodTable[RATION].strengthRequired * 45/100))
		{
			// Guarantee a certain nutrition minimum of the approximate equivalent of one ration every four levels,
			// with more food on deeper levels since they generally take more turns to complete.
			theCategory = FOOD;
			if (rogue.depthLevel > AMULET_LEVEL) {
				numberOfItems++; // Food isn't at the expense of lumenstones.
			}
		} else if (rogue.depthLevel > AMULET_LEVEL) {
			theCategory = GEM;
		} else if (rogue.lifePotionsSpawned * 4 + 3 < rogue.depthLevel + randomDepthOffset) {
        theCategory = POTION;
        theKind = POTION_LIFE;
    }

		// Generate the item.
		theItem = generateItem(theCategory, theKind);
    theItem.originDepth = rogue.depthLevel;

		// printf("Generated item - ", theItem.category, theItem.kind);

		if (theItem.category & FOOD) {
			rogue.foodSpawned += foodTable[theItem.kind].strengthRequired;
      if (D_MESSAGE_ITEM_GENERATION) printf("\n(:)  Depth %i: generated food", rogue.depthLevel);
		}

		// Choose a placement location.
    if ((theItem.category & FOOD) || ((theItem.category & POTION) && theItem.kind == POTION_STRENGTH)) {
      do {
				const loc = randomMatchingLocation(FLOOR, NOTHING, -1); // Food and gain strength don't follow the heat map.
				x = loc[0];
				y = loc[1];
      } while (passableArcCount(x, y) > 1); // Not in a hallway.
    } else {
        const loc = getItemSpawnLoc(itemSpawnHeatMap, totalHeat);
				x = loc[0];
				y = loc[1];
    }

		brogueAssert(coordinatesAreInMap(x, y));
		// Cool off the item spawning heat map at the chosen location:
		totalHeat = coolHeatMapAt(itemSpawnHeatMap, x, y, totalHeat);

		// Regulate the frequency of enchantment scrolls and strength/life potions.
		if ((theItem.category & SCROLL) && theItem.kind == SCROLL_ENCHANTING) {
			rogue.enchantScrollFrequency -= 50;
			if (D_MESSAGE_ITEM_GENERATION) printf("\n(?)  Depth %i: generated an enchant scroll at %i frequency", rogue.depthLevel, rogue.enchantScrollFrequency);
		} else if (theItem.category & POTION && theItem.kind == POTION_LIFE) {
			if (D_MESSAGE_ITEM_GENERATION) printf("\n(!l) Depth %i: generated a life potion at %i frequency", rogue.depthLevel, rogue.lifePotionFrequency);
			rogue.lifePotionFrequency -= 150;
      rogue.lifePotionsSpawned++;
		} else if (theItem.category & POTION && theItem.kind == POTION_STRENGTH) {
			if (D_MESSAGE_ITEM_GENERATION) printf("\n(!s) Depth %i: generated a strength potion at %i frequency", rogue.depthLevel, rogue.strengthPotionFrequency);
			rogue.strengthPotionFrequency -= 50;
		}

		// Place the item.
		await placeItem(theItem, x, y, true); // Random valid location already obtained according to heat map.
    brogueAssert(!cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY));

		if (D_INSPECT_ITEM_GEN) {
			const map = allocGrid();
			let i2, j2;
			for (i2=0; i2<DCOLS; i2++) {
				for (j2=0; j2<DROWS; j2++) {
					map[i2][j2] = itemSpawnHeatMap[i2][j2] * -1;
				}
			}
			dumpLevelToScreen();
			displayGrid(map);
			freeGrid(map);
			plotCharWithColor(theItem.displayChar, mapToWindowX(x), mapToWindowY(y), black, purple);
			await temporaryMessage("Added an item.", true);
		}

	}

	if (D_INSPECT_ITEM_GEN) {
		dumpLevelToScreen();
	}

	// Now generate gold.
	for (i=0; i<numberOfGoldPiles; i++) {
		theItem = generateItem(GOLD, -1);
		const loc = getItemSpawnLoc(itemSpawnHeatMap, totalHeat);
		if (loc) {
			x = loc[0]; y = loc[1];
		}
		totalHeat = coolHeatMapAt(itemSpawnHeatMap, x, y, totalHeat);
		await placeItem(theItem, x, y);
		if (D_INSPECT_ITEM_GEN) {
			hiliteCell(x, y, yellow, 50, true);
		}
		rogue.goldGenerated += theItem.quantity;
	}

	if (D_INSPECT_ITEM_GEN) {
		await temporaryMessage("Added gold.", true);
	}

	scrollTable[SCROLL_ENCHANTING].frequency		= 0;	// No enchant scrolls or strength/life potions can spawn except via initial
	potionTable[POTION_STRENGTH].frequency      = 0;	// item population or blueprints that create them specifically.
  potionTable[POTION_LIFE].frequency          = 0;

	if (D_MESSAGE_ITEM_GENERATION) printf("\n---- Depth %i: %lu gold generated so far.", rogue.depthLevel, rogue.goldGenerated);


	if (D_INSPECT_LEVELGEN && !D_INSPECT_ITEM_GEN) {
		dumpLevelToScreen();
		theItem = floorItems.nextItem;
		while(theItem) {
			hiliteCell(theItem.xLoc, theItem.yLoc, teal, 50, true);
			theItem = theItem.nextItem;
		}
		await temporaryMessage('Items placed here.', true);
	}
}

// Name of this function is a bit misleading -- basically returns true iff the item will stack without consuming an extra slot
// i.e. if it's a throwing weapon with a sibling already in your pack. False for potions and scrolls.
function itemWillStackWithPack( /* item */ theItem) {
	let tempItem;		// item *
	if (theItem.category & GEM) {
			for (tempItem = packItems.nextItem;
					 tempItem != NULL && !((tempItem.category & GEM) && theItem.originDepth == tempItem.originDepth);
					 tempItem = tempItem.nextItem);
			return (tempItem ? true : false);
	} else if (!(theItem.quiverNumber)) {
		return false;
	} else {
		for (tempItem = packItems.nextItem;
			 tempItem != NULL && tempItem.quiverNumber != theItem.quiverNumber;
			 tempItem = tempItem.nextItem);
		return (tempItem ? true : false);
	}
}


async function removeItemFrom(x, y) {
	let layer;

	pmap[x][y].flags &= ~HAS_ITEM;

	if (cellHasTMFlag(x, y, TM_PROMOTES_ON_ITEM_PICKUP)) {
		for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
			if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_PROMOTES_ON_ITEM_PICKUP) {
				await promoteTile(x, y, layer, false);
			}
		}
	}
}

// adds the item at (x,y) to the pack
async function pickUpItemAt(x, y) {
	let theItem;	// item *
  let monst;		// creature *
	const buf = STRING(), buf2 = STRING(); // char[COLS * 3];
  let guardianX, guardianY;

	rogue.disturbed = true;

	// find the item
	theItem = itemAtLoc(x, y);

	if (!theItem) {
		ERROR("Error: Expected item; item not found.", true);
		return;
	}

	if ((theItem.flags & ITEM_KIND_AUTO_ID)
    && tableForItemCategory(theItem.category, NULL)
		&& !(tableForItemCategory(theItem.category, NULL)[theItem.kind].identified))
	{
    identifyItemKind(theItem);
	}

  if ((theItem.category & WAND)
      && wandTable[theItem.kind].identified
      && wandTable[theItem.kind].range.lowerBound == wandTable[theItem.kind].range.upperBound)
	{
      theItem.flags |= ITEM_IDENTIFIED;
  }

	if (numberOfItemsInPack() < MAX_PACK_ITEMS || (theItem.category & GOLD) || itemWillStackWithPack(theItem)) {
		// remove from floor chain
		pmap[x][y].flags &= ~ITEM_DETECTED;

		if (!removeItemFromChain(theItem, floorItems)) {
        brogueAssert(false);
    }

		if (theItem.category & GOLD) {
			rogue.gold += theItem.quantity;
			sprintf(buf, "you found %i pieces of gold.", theItem.quantity);
			message(buf, itemMessageColor, false);
			deleteItem(theItem);
			await removeItemFrom(x, y); // triggers tiles with T_PROMOTES_ON_ITEM_PICKUP
			return;
		}

		if ((theItem.category & AMULET) && numberOfMatchingPackItems(AMULET, 0, 0, false)) {
			message("you already have the Amulet of Yendor.", false);
			deleteItem(theItem);
			return;
		}

		theItem = addItemToPack(theItem);

		itemName(theItem, buf2, true, true, NULL); // include suffix, article

		sprintf(buf, "you now have %s (%c).", buf2, theItem.inventoryLetter);
		message(buf, itemMessageColor, false);

		await removeItemFrom(x, y); // triggers tiles with T_PROMOTES_ON_ITEM_PICKUP

    if ((theItem.category & AMULET)
        && !(rogue.yendorWarden)) {
        // Identify the amulet guardian, or generate one if there isn't one.
        for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
            if (monst.info.monsterID == MK_WARDEN_OF_YENDOR) {
                rogue.yendorWarden = monst;
                break;
            }
        }
        if (!rogue.yendorWarden) {
            const loc = getRandomMonsterSpawnLocation();
            monst = generateMonster(MK_WARDEN_OF_YENDOR, false, false);
            monst.xLoc = loc[0];
            monst.yLoc = loc[1];
            pmap[loc[0]][loc[1]].flags |= HAS_MONSTER;
            rogue.yendorWarden = monst;
        }
    }
	} else {
		theItem.flags |= ITEM_PLAYER_AVOIDS; // explore shouldn't try to pick it up more than once.
		itemName(theItem, buf2, false, true, NULL); // include article
		sprintf(buf, "Your pack is too full to pick up %s.", buf2);
		message(buf, false);
	}
}


function conflateItemCharacteristics(/* item */ newItem, /* item */ oldItem) {

    // let magic detection and other flags propagate to the new stack...
    newItem.flags |= (oldItem.flags & (ITEM_MAGIC_DETECTED | ITEM_IDENTIFIED | ITEM_PROTECTED | ITEM_RUNIC
                                         | ITEM_RUNIC_HINTED | ITEM_CAN_BE_IDENTIFIED | ITEM_MAX_CHARGES_KNOWN));

    // keep the higher enchantment and lower strength requirement...
    if (oldItem.enchant1 > newItem.enchant1) {
        newItem.enchant1 = oldItem.enchant1;
    }
    if (oldItem.strengthRequired < newItem.strengthRequired) {
        newItem.strengthRequired = oldItem.strengthRequired;
    }
    // Copy the inscription.
    if (oldItem.inscription && !newItem.inscription) {
        newItem.inscription = oldItem.inscription;
    }
    // Keep track of origin depth only if every item in the stack has the same origin depth.
    if (oldItem.originDepth <= 0 || newItem.originDepth != oldItem.originDepth) {
        newItem.originDepth = 0;
    }
}

function stackItems( /* item */ newItem, /* item */ oldItem) {
    //Increment the quantity of the old item...
    newItem.quantity += oldItem.quantity;

    // ...conflate attributes...
    conflateItemCharacteristics(newItem, oldItem);

    // ...and delete the new item.
    deleteItem(oldItem);
}

function inventoryLetterAvailable(proposedLetter) {
    let theItem;		// item *
    if (proposedLetter >= 'a'
        && proposedLetter <= 'z')
		{
        for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
            if (theItem.inventoryLetter == proposedLetter) {
                return false;
            }
        }
        return true;
    }
    return false;
}


function addItemToPack(/* item */ theItem) {
	let previousItem, tempItem; // item *
	let itemLetter;	// char

	// Can the item stack with another in the inventory?
	if (theItem.category & (FOOD|POTION|SCROLL|GEM)) {
		for (tempItem = packItems.nextItem; tempItem != NULL; tempItem = tempItem.nextItem) {
			if (theItem.category == tempItem.category
          && theItem.kind == tempItem.kind
          && (!(theItem.category & GEM) || theItem.originDepth == tempItem.originDepth)) 	// We found a match!
			{
        stackItems(tempItem, theItem);

				// Pass back the incremented (old) item. No need to add it to the pack since it's already there.
				return tempItem;
			}
		}
	} else if (theItem.category & WEAPON && theItem.quiverNumber > 0) {
		for (tempItem = packItems.nextItem; tempItem != NULL; tempItem = tempItem.nextItem) {
			if (theItem.category == tempItem.category && theItem.kind == tempItem.kind
				&& theItem.quiverNumber == tempItem.quiverNumber)
			{
				// We found a match!
        stackItems(tempItem, theItem);

				// Pass back the incremented (old) item. No need to add it to the pack since it's already there.
				return tempItem;
			}
		}
	}

	// assign a reference letter to the item
	if (!inventoryLetterAvailable(theItem.inventoryLetter)) {
		itemLetter = nextAvailableInventoryCharacter();
		if (itemLetter) {
			theItem.inventoryLetter = itemLetter;
		}
	}

	// insert at proper place in pack chain
	for (previousItem = packItems;
		 previousItem.nextItem != NULL && previousItem.nextItem.category <= theItem.category;
		 previousItem = previousItem.nextItem);
	theItem.nextItem = previousItem.nextItem;
	previousItem.nextItem = theItem;

	return theItem;
}


function numberOfItemsInPack() {
	let theCount = 0;
	let theItem;	// item *
	for(theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		theCount += (theItem.category & (WEAPON | GEM) ? 1 : theItem.quantity);
	}
	return theCount;
}

function nextAvailableInventoryCharacter() {
	const charTaken = []; // boolean[26];
	let i;
	let theItem;	// item *
	let c;
	for(i=0; i<26; i++) {
		charTaken[i] = false;
	}
	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		c = theItem.inventoryLetter;
		if (c >= 'a' && c <= 'z') {
			charTaken[c.charCodeAt(0) - 'a'.charCodeAt(0)] = true;
		}
	}
	for(i=0; i<26; i++) {
		if (!charTaken[i]) {
			return String.fromCharCode('a'.charCodeAt(0) + i);
		}
	}
	return null;
}

function checkForDisenchantment(/* item */ theItem) {
	const buf = STRING(), buf2 = STRING();

  if ((theItem.flags & ITEM_RUNIC)
			&& (((theItem.category & WEAPON) && theItem.enchant2 < NUMBER_GOOD_WEAPON_ENCHANT_KINDS) || ((theItem.category & ARMOR) && theItem.enchant2 < NUMBER_GOOD_ARMOR_ENCHANT_KINDS))
      && theItem.enchant1 <= 0)
	{
      theItem.enchant2 = 0;
      theItem.flags &= ~(ITEM_RUNIC | ITEM_RUNIC_HINTED | ITEM_RUNIC_IDENTIFIED);

      if (theItem.flags & ITEM_IDENTIFIED) {
        identify(theItem);
				itemName(theItem, buf2, false, false, NULL);
        sprintf(buf, "the runes fade from your %s!", buf2);
				message(buf, itemMessageColor, false);
      }
  }
	if (theItem.flags & ITEM_CURSED
			&& theItem.enchant1 >= 0)
	{
			theItem.flags &= ~ITEM_CURSED;
	}
}

function itemIsSwappable(/* item */ theItem) {
  if ((theItem.category & CAN_BE_SWAPPED)
      && theItem.quiverNumber == 0)
	{
      return true;
  } else {
      return false;
  }
}

function swapItemToEnchantLevel(/* item */ theItem, newEnchant, enchantmentKnown) {
    let x, y, charmPercent;
    const buf1 = STRING(), buf2 = STRING(); // char[COLS * 3];

    if ((theItem.category & STAFF) && newEnchant < 2
        || (theItem.category & CHARM) && newEnchant < 1
        || (theItem.category & WAND) && newEnchant < 0)
		{
        itemName(theItem, buf1, false, true, NULL);
        sprintf(buf2, "%s shatter%s from the strain!",
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
    } else {
        if ((theItem.category & STAFF)
            && theItem.charges > newEnchant)
				{
            theItem.charges = newEnchant;
        }
        if (theItem.category & CHARM) {
            charmPercent = Math.floor(theItem.charges * 100 / charmRechargeDelay(theItem.kind, theItem.enchant1));
            theItem.charges = Math.floor(charmPercent * charmRechargeDelay(theItem.kind, newEnchant) / 100);
        }
        if (enchantmentKnown) {
            if (theItem.category & STAFF) {
                theItem.flags |= ITEM_MAX_CHARGES_KNOWN;
            }
            theItem.flags |= ITEM_IDENTIFIED;
        } else {
            theItem.flags &= ~(ITEM_MAX_CHARGES_KNOWN | ITEM_IDENTIFIED);
            theItem.flags |= ITEM_CAN_BE_IDENTIFIED;
            if (theItem.category & WEAPON) {
                theItem.charges = WEAPON_KILLS_TO_AUTO_ID; // kill this many enemies to auto-identify
            } else if (theItem.category & ARMOR) {
                theItem.charges = ARMOR_DELAY_TO_AUTO_ID; // this many turns until it reveals its enchants and whether runic
            } else if (theItem.category & RING) {
                theItem.charges = RING_DELAY_TO_AUTO_ID; // how many turns of being worn until it auto-identifies
            }
        }
        if (theItem.category & WAND) {
            theItem.charges = newEnchant;
        } else {
            theItem.enchant1 = newEnchant;
        }
				checkForDisenchantment(theItem);
    }
}

function enchantLevelKnown(/* item */ theItem) {
  if ((theItem.category & STAFF)
      && (theItem.flags & ITEM_MAX_CHARGES_KNOWN))
	{
      return true;
  } else {
      return (theItem.flags & ITEM_IDENTIFIED);
  }
}

function effectiveEnchantLevel(/* item */ theItem) {
  if (theItem.category & WAND) {
      return theItem.charges;
  } else {
      return theItem.enchant1;
  }
}

function swapItemEnchants(machineNumber) {
    let lockedItem, tempItem;	// item *
    let i, j, oldEnchant;
    let enchantmentKnown;

    lockedItem = NULL;
    for (i = 0; i < DCOLS; i++) {
        for (j = 0; j < DROWS; j++) {
            tempItem = itemAtLoc(i, j);
            if (tempItem
                && pmap[i][j].machineNumber == machineNumber
								&& cellHasTMFlag(i, j, TM_SWAP_ENCHANTS_ACTIVATION)
                && itemIsSwappable(tempItem))
						{
                if (lockedItem) {
                    if (effectiveEnchantLevel(lockedItem) != effectiveEnchantLevel(tempItem)) {
                        // Presto change-o!
                        oldEnchant = effectiveEnchantLevel(lockedItem);
                        enchantmentKnown = enchantLevelKnown(lockedItem);
                        swapItemToEnchantLevel(lockedItem, effectiveEnchantLevel(tempItem), enchantLevelKnown(tempItem));
                        swapItemToEnchantLevel(tempItem, oldEnchant, enchantmentKnown);
                        return true;
                    }
                } else {
                    lockedItem = tempItem;
                }
            }
        }
    }
    return false;
}

async function updateFloorItems() {
  let x, y;
	let loc;
  const buf = STRING(), buf2 = STRING(); // char[DCOLS*3];
  let layer;	// enum dungeonLayers
  let theItem, nextItem;	// item *

	for (theItem=floorItems.nextItem; theItem != NULL; theItem = nextItem) {
		nextItem = theItem.nextItem;
    x = theItem.xLoc;
    y = theItem.yLoc;
    if (cellHasTerrainFlag(x, y, T_AUTO_DESCENT)) {
        if (playerCanSeeOrSense(x, y)) {
            itemName(theItem, buf, false, false, NULL);
            sprintf(buf2, "The %s plunge%s out of sight!", buf, (theItem.quantity > 1 ? "" : "s"));
            message(buf2, itemMessageColor, false);
        }
        if (playerCanSee(x, y)) {
            await discover(x, y);
        }
        theItem.flags |= ITEM_PREPLACED;

        // Remove from item chain.
        removeItemFromChain(theItem, floorItems);

        pmap[x][y].flags &= ~(HAS_ITEM | ITEM_DETECTED);

        if (theItem.category == POTION || rogue.depthLevel == DEEPEST_LEVEL) {
            // Potions don't survive the fall.
            deleteItem(theItem);
        } else {
            // Add to next level's chain.
            theItem.nextItem = levels[rogue.depthLevel-1 + 1].items;
            levels[rogue.depthLevel-1 + 1].items = theItem;
        }
        refreshDungeonCell(x, y);
        continue;
    }
		if ((cellHasTerrainFlag(x, y, T_IS_FIRE) && (theItem.flags & ITEM_FLAMMABLE))
        || (cellHasTerrainFlag(x, y, T_LAVA_INSTA_DEATH) && !(theItem.category & AMULET)))
		{
      await burnItem(theItem);
      continue;
    }
    if (cellHasTerrainFlag(x, y, T_MOVES_ITEMS)) {
      loc = getQualifyingLocNear(x, y, true, 0, (T_OBSTRUCTS_ITEMS | T_OBSTRUCTS_PASSABILITY), (HAS_ITEM), false, false);
      removeItemFrom(x, y);
      pmap[loc[0]][loc[1]].flags |= HAS_ITEM;
      if (pmap[x][y].flags & ITEM_DETECTED) {
          pmap[x][y].flags &= ~ITEM_DETECTED;
          pmap[loc[0]][loc[1]].flags |= ITEM_DETECTED;
      }
      theItem.xLoc = loc[0];
      theItem.yLoc = loc[1];
      refreshDungeonCell(x, y);
      refreshDungeonCell(loc[0], loc[1]);
      continue;
    }
    if (cellHasTMFlag(x, y, TM_PROMOTES_ON_STEP)) {
        for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
            if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_PROMOTES_ON_STEP) {
                await promoteTile(x, y, layer, false);
            }
        }
        continue;
    }
    if (pmap[x][y].machineNumber
        && pmap[x][y].machineNumber == pmap[player.xLoc][player.yLoc].machineNumber
        && (theItem.flags & ITEM_KIND_AUTO_ID))
		{
        identifyItemKind(theItem);
    }
    if (cellHasTMFlag(x, y, TM_SWAP_ENCHANTS_ACTIVATION)
        && pmap[x][y].machineNumber)
		{
        while (nextItem != NULL
               && pmap[x][y].machineNumber == pmap[nextItem.xLoc][nextItem.yLoc].machineNumber
               && cellHasTMFlag(nextItem.xLoc, nextItem.yLoc, TM_SWAP_ENCHANTS_ACTIVATION))
			 {
            // Skip future items that are also swappable, so that we don't inadvertently
            // destroy the next item and then try to update it.
            nextItem = nextItem.nextItem;
        }

        if (!circuitBreakersPreventActivation(pmap[x][y].machineNumber)
            && swapItemEnchants(pmap[x][y].machineNumber))
				{
            await activateMachine(pmap[x][y].machineNumber);
        }
    }
  }
}

async function inscribeItem( /* item */ theItem) {
	const itemText = STRING(), buf = STRING(), nameOfItem = STRING(), oldInscription = STRING();

	strcpy(oldInscription, theItem.inscription);
	strcpy(theItem.inscription, ''); // [0] = '\0';
	itemName(theItem, nameOfItem, true, true, NULL);
	strcpy(theItem.inscription, oldInscription);

	sprintf(buf, "inscribe: %s \"", nameOfItem);
 	const ok = await getInputTextString(itemText, buf, min(29, DCOLS - strLenWithoutEscapes(buf) - 1), "", "\"", TEXT_INPUT_NORMAL, false);
	if (ok && strlen(itemText)) {
		strcpy(theItem.inscription, itemText);
		confirmMessages();
		itemName(theItem, nameOfItem, true, true, NULL);
		sprintf(buf, "%s %s.", (theItem.quantity > 1 ? "they're" : "it's"), nameOfItem);
		message(buf, itemMessageColor, false);
		return true;
	} else {
		confirmMessages();
		return false;
	}
}

function itemCanBeCalled( /* item */ theItem) {
    if (theItem.category & (WEAPON|ARMOR|SCROLL|RING|POTION|STAFF|WAND|CHARM)) {
        return true;
    } else if ((theItem.category & (POTION | SCROLL))
               && !tableForItemCategory(theItem.category, NULL)[theItem.kind].identified)
		{
        return true;
    } else {
        return false;
    }
}

async function call( /* item */ theItem) {
	const itemText = STRING(), buf = STRING(); // char[COLS * 3];
	let c;
	const command = []; // char[100];
  let tempItem;	// item *

	c = 0;
	command[c++] = CALL_KEY;
	if (theItem == NULL) {
    // Need to gray out known potions and scrolls from inventory selection.
    // Hijack the "item can be identified" flag for this purpose,
    // and then reset it immediately afterward.
    for (tempItem = packItems.nextItem; tempItem != NULL; tempItem = tempItem.nextItem) {
        if ((tempItem.category & (POTION | SCROLL))
            && tableForItemCategory(tempItem.category, NULL)[tempItem.kind].identified) {

            tempItem.flags &= ~ITEM_CAN_BE_IDENTIFIED;
        } else {
            tempItem.flags |= ITEM_CAN_BE_IDENTIFIED;
        }
    }
		theItem = await promptForItemOfType((WEAPON|ARMOR|SCROLL|RING|POTION|STAFF|WAND|CHARM), ITEM_CAN_BE_IDENTIFIED, 0,
									  KEYBOARD_LABELS ? "Call what? (a-z, shift for more info; or <esc> to cancel)" : "Call what?",
                                      true);
    updateIdentifiableItems(); // Reset the flags.
	}
	if (theItem == NULL) {
		return;
	}

	command[c++] = theItem.inventoryLetter;

	confirmMessages();

	if ((theItem.flags & ITEM_IDENTIFIED) || theItem.category & (WEAPON|ARMOR|CHARM|FOOD|GOLD|AMULET|GEM)) {
		if (theItem.category & (WEAPON | ARMOR | CHARM | STAFF | WAND | RING)) {
			if (await inscribeItem(theItem)) {
				command[c++] = null;	// '\0';
				// strcat((char *) command, theItem.inscription);
				// recordKeystrokeSequence(command);
				// recordKeystroke(RETURN_KEY, false, false);
			}
		} else {
			message("you already know what that is.", false);
		}
		return;
	}

	if (theItem.category & (WEAPON | ARMOR | STAFF | WAND | RING)) {
    if (tableForItemCategory(theItem.category, NULL)[theItem.kind].identified) {
			if (await inscribeItem(theItem)) {
				command[c++] = null; // '\0';
				// strcat((char *) command, theItem.inscription);
				// recordKeystrokeSequence(command);
				// recordKeystroke(RETURN_KEY, false, false);
			}
      return;
    } else if (await confirm("Inscribe this particular item instead of all similar items?", true)) {
			command[c++] = 'y'; // y means yes, since the recording also needs to negotiate the above confirmation prompt.
			if (await inscribeItem(theItem)) {
				command[c++] = null; // '\0';
				// strcat((char *) command, theItem.inscription);
				// recordKeystrokeSequence(command);
				// recordKeystroke(RETURN_KEY, false, false);
			}
			return;
		} else {
			command[c++] = 'n'; // n means no
		}
	}

	if (tableForItemCategory(theItem.category, NULL)
        && !(tableForItemCategory(theItem.category, NULL)[theItem.kind].identified))
	{
    await getInputTextString(itemText, "call them: \"", 29, "", "\"", TEXT_INPUT_NORMAL, false);
    if (itemText && strlen(itemText)) {
        command[c++] = null; // '\0';
        // strcat((char *) command, itemText);
        // recordKeystrokeSequence(command);
        // recordKeystroke(RETURN_KEY, false, false);
        if (strlen(itemText)) {
            strcpy(tableForItemCategory(theItem.category, NULL)[theItem.kind].callTitle, itemText);
            tableForItemCategory(theItem.category, NULL)[theItem.kind].called = true;
        } else {
            strcpy(tableForItemCategory(theItem.category, NULL)[theItem.kind].callTitle, ''); // [0] = '\0';
            tableForItemCategory(theItem.category, NULL)[theItem.kind].called = false;
        }
        confirmMessages();
        itemName(theItem, buf, false, true, NULL);
        message(buf, itemMessageColor, false);
    }
	} else {
        message("you already know what that is.", false);
	}
}


// Generates the item name and returns it.
// IncludeDetails governs things such as enchantment, charges, strength requirement, times used, etc.
// IncludeArticle governs the article -- e.g. "some" food, "5" darts, "a" pink potion.
// If baseColor is provided, then the suffix will be in gray, flavor portions of the item name (e.g. a "pink" potion,
//	a "sandalwood" staff, a "ruby" ring) will be in dark purple, and the Amulet of Yendor and lumenstones will be in yellow.
//  BaseColor itself will be the color that the name reverts to outside of these colored portions.
function itemName(/* item */ theItem, /* char */ root, includeDetails, includeArticle, /* color */ baseColor) {
	const buf = STRING();
	const grayEscapeSequence = STRING(), purpleEscapeSequence = STRING(), yellowEscapeSequence = STRING(), baseEscapeSequence = STRING();
	const pluralization = STRING();

	const article = STRING();
	const tempColor = color();

	strcpy(pluralization, (theItem.quantity > 1 ? "s" : ""));

	if (baseColor) {
		tempColor.copy(backgroundMessageColor);
		applyColorMultiplier(tempColor, baseColor); // To gray out the purple if necessary.
		encodeMessageColor(purpleEscapeSequence, 0, tempColor);

		tempColor.copy(gray);
		//applyColorMultiplier(&tempColor, baseColor);
		encodeMessageColor(grayEscapeSequence, 0, tempColor);

		tempColor.copy(itemMessageColor);
		applyColorMultiplier(tempColor, baseColor);
		encodeMessageColor(yellowEscapeSequence, 0, tempColor);

		encodeMessageColor(baseEscapeSequence, 0, baseColor);
	}

	switch (theItem.category) {
		case FOOD:
			if (theItem.kind == FRUIT) {
				sprintf(root, "mango%s", pluralization);
			} else {
				if (theItem.quantity == 1) {
					sprintf(article, "some ");
					sprintf(root, "food");
				} else {
					sprintf(root, "ration%s of food", pluralization);
				}
			}
			break;
		case WEAPON:
			sprintf(root, "%s%s", weaponTable[theItem.kind].name, pluralization);
			if (includeDetails) {
				if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
					sprintf(buf, "%s%i %s", (theItem.enchant1 < 0 ? "" : "+"), theItem.enchant1, root);
					strcpy(root, buf);
				}

				if (theItem.flags & ITEM_RUNIC) {
					if ((theItem.flags & ITEM_RUNIC_IDENTIFIED) || rogue.playbackOmniscience) {
						if (theItem.enchant2 == W_SLAYING) {
							sprintf(root, "%s of %s slaying%s",
									root,
                  monsterClassCatalog[theItem.vorpalEnemy].name,
									grayEscapeSequence);
						} else {
							sprintf(root, "%s of %s%s",
									root,
									weaponRunicNames[theItem.enchant2],
									grayEscapeSequence);
						}
					} else if (theItem.flags & (ITEM_IDENTIFIED | ITEM_RUNIC_HINTED)) {
						if ( strlen(grayEscapeSequence) ) {
							strcat(root, grayEscapeSequence);
						}
						strcat(root, " (unknown runic)");
					}
				}
				sprintf(root, "%s%s <%i>", root, grayEscapeSequence, theItem.strengthRequired);
			}
			break;
		case ARMOR:
			sprintf(root, "%s", armorTable[theItem.kind].name);
			if (includeDetails) {
				if ((theItem.flags & ITEM_RUNIC)
					&& ((theItem.flags & ITEM_RUNIC_IDENTIFIED)
						|| rogue.playbackOmniscience))
        {
					if (theItem.enchant2 == A_IMMUNITY) {
						sprintf(root, "%s of %s immunity", root, monsterClassCatalog[theItem.vorpalEnemy].name);
					} else {
						sprintf(root, "%s of %s", root, armorRunicNames[theItem.enchant2]);
					}
				}

				if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
					if (theItem.enchant1 == 0) {
						sprintf(buf, "%s%s [%i]<%i>", root, grayEscapeSequence, Math.floor(theItem.armor/10), theItem.strengthRequired);
					} else {
						sprintf(buf, "%s%i %s%s [%i]<%i>",
								(theItem.enchant1 < 0 ? "" : "+"),
								theItem.enchant1,
								root,
								grayEscapeSequence,
								Math.floor(theItem.armor/10) + theItem.enchant1,
								theItem.strengthRequired);
					}
					strcpy(root, buf);
				} else {
					sprintf(root, "%s%s <%i>", root, grayEscapeSequence, theItem.strengthRequired);
				}

				if ((theItem.flags & ITEM_RUNIC)
					&& (theItem.flags & (ITEM_IDENTIFIED | ITEM_RUNIC_HINTED))
					&& !(theItem.flags & ITEM_RUNIC_IDENTIFIED)
					&& !rogue.playbackOmniscience)
        {
					strcat(root, " (unknown runic)");
				}
			}
			break;
		case SCROLL:
			if (scrollTable[theItem.kind].identified || rogue.playbackOmniscience) {
				sprintf(root, "scroll%s of %s", pluralization, scrollTable[theItem.kind].name);
			} else if (scrollTable[theItem.kind].called) {
				sprintf(root, "scroll%s called %s%s%s",
						pluralization,
						purpleEscapeSequence,
						scrollTable[theItem.kind].callTitle,
						baseEscapeSequence);
			} else {
				sprintf(root, "scroll%s entitled %s\"%s\"%s",
						pluralization,
						purpleEscapeSequence,
						scrollTable[theItem.kind].flavor,
						baseEscapeSequence);
			}
			break;
		case POTION:
			if (potionTable[theItem.kind].identified || rogue.playbackOmniscience) {
				sprintf(root, "potion%s of %s", pluralization, potionTable[theItem.kind].name);
			} else if (potionTable[theItem.kind].called) {
				sprintf(root, "potion%s called %s%s%s",
						pluralization,
						purpleEscapeSequence,
						potionTable[theItem.kind].callTitle,
						baseEscapeSequence);
			} else {
				sprintf(root, "%s%s%s potion%s",
						purpleEscapeSequence,
						potionTable[theItem.kind].flavor,
						baseEscapeSequence,
						pluralization);
			}
			break;
		case WAND:
			if (wandTable[theItem.kind].identified || rogue.playbackOmniscience) {
				sprintf(root, "wand%s of %s",
						pluralization,
						wandTable[theItem.kind].name);
			} else if (wandTable[theItem.kind].called) {
				sprintf(root, "wand%s called %s%s%s",
						pluralization,
						purpleEscapeSequence,
						wandTable[theItem.kind].callTitle,
						baseEscapeSequence);
			} else {
				sprintf(root, "%s%s%s wand%s",
						purpleEscapeSequence,
						wandTable[theItem.kind].flavor,
						baseEscapeSequence,
						pluralization);
			}
			if (includeDetails) {
				if (theItem.flags & (ITEM_IDENTIFIED | ITEM_MAX_CHARGES_KNOWN) || rogue.playbackOmniscience) {
					sprintf(root, "%s%s [%i]",
							root,
							grayEscapeSequence,
							theItem.charges);
				} else if (theItem.enchant2 > 2) {
					sprintf(root, "%s%s (used %i times)",
							root,
							grayEscapeSequence,
							theItem.enchant2);
				} else if (theItem.enchant2) {
					sprintf(root, "%s%s (used %s)",
							root,
							grayEscapeSequence,
							(theItem.enchant2 == 2 ? "twice" : "once"));
				}
			}
			break;
		case STAFF:
			if (staffTable[theItem.kind].identified || rogue.playbackOmniscience) {
				sprintf(root, "staff%s of %s", pluralization, staffTable[theItem.kind].name);
			} else if (staffTable[theItem.kind].called) {
				sprintf(root, "staff%s called %s%s%s",
						pluralization,
						purpleEscapeSequence,
						staffTable[theItem.kind].callTitle,
						baseEscapeSequence);
			} else {
				sprintf(root, "%s%s%s staff%s",
						purpleEscapeSequence,
						staffTable[theItem.kind].flavor,
						baseEscapeSequence,
						pluralization);
			}
			if (includeDetails) {
				if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
					sprintf(root, "%s%s [%i/%i]", root, grayEscapeSequence, theItem.charges, theItem.enchant1);
				} else if (theItem.flags & ITEM_MAX_CHARGES_KNOWN) {
					sprintf(root, "%s%s [?/%i]", root, grayEscapeSequence, theItem.enchant1);
				}
			}
			break;
		case RING:
			if (ringTable[theItem.kind].identified || rogue.playbackOmniscience) {
				sprintf(root, "ring%s of %s", pluralization, ringTable[theItem.kind].name);
			} else if (ringTable[theItem.kind].called) {
				sprintf(root, "ring%s called %s%s%s",
						pluralization,
						purpleEscapeSequence,
						ringTable[theItem.kind].callTitle,
						baseEscapeSequence);
			} else {
				sprintf(root, "%s%s%s ring%s",
						purpleEscapeSequence,
						ringTable[theItem.kind].flavor,
						baseEscapeSequence,
						pluralization);
			}
			if (includeDetails && ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience)) {
				sprintf(buf, "%s%i %s", (theItem.enchant1 < 0 ? "" : "+"), theItem.enchant1, root);
				strcpy(root, buf);
			}
			break;
		case CHARM:
			sprintf(root, "%s charm%s", charmTable[theItem.kind].name, pluralization);

			if (includeDetails) {
				sprintf(buf, "%s%i %s", (theItem.enchant1 < 0 ? "" : "+"), theItem.enchant1, root);
				strcpy(root, buf);
        if (theItem.charges) {
          const delay = Math.floor((charmRechargeDelay(theItem.kind, theItem.enchant1) - theItem.charges) * 100 / charmRechargeDelay(theItem.kind, theItem.enchant1));
					sprintf(buf, "%s %s(%i%)",
									root,
									grayEscapeSequence,
									delay);
					strcpy(root, buf);
        } else {
					strcat(root, grayEscapeSequence);
					strcat(root, " (ready)");
        }
			}
			break;
		case GOLD:
			sprintf(root, "gold piece%s", pluralization);
			break;
		case AMULET:
			sprintf(root, "%sAmulet%s of Yendor%s", yellowEscapeSequence, pluralization, baseEscapeSequence);
			break;
		case GEM:
			sprintf(root, "%slumenstone%s%s from depth %i", yellowEscapeSequence, pluralization, baseEscapeSequence, theItem.originDepth);
			break;
		case KEY:
			if (includeDetails && theItem.originDepth > 0 && theItem.originDepth != rogue.depthLevel) {
				sprintf(root, "%s%s%s from depth %i",
						keyTable[theItem.kind].name,
						pluralization,
						grayEscapeSequence,
						theItem.originDepth);
			} else {
				sprintf(root,
						keyTable[theItem.kind].name,
						"%s%s",
						pluralization);
			}
			break;
		default:
			sprintf(root, "unknown item%s", pluralization);
			break;
	}

	if (includeArticle && !strlen(article)) {
		// prepend number if quantity is over 1
		if (theItem.quantity > 1) {
			sprintf(article, "%i ", theItem.quantity);
		} else if (theItem.category & AMULET) {
			sprintf(article, "the ");
		} else if (!(theItem.category & ARMOR) && !(theItem.category & FOOD && theItem.kind == RATION)) {
			// otherwise prepend a/an if the item is not armor and not a ration of food;
			// armor gets no article, and "some food" was taken care of above.
			sprintf(article, "a%s ", (isVowelish(root) ? "n" : ""));
		}
	}
	// strcat(buf, suffixID);
	if (includeArticle) {
		sprintf(buf, "%s%s", article, root);
		strcpy(root, buf);
	}

	if (includeDetails && theItem.inscription[0]) {
		sprintf(buf, "%s \"%s\"", root, theItem.inscription);
		strcpy(root, buf);
	}
	return;
}


// kindCount is optional
function tableForItemCategory(/* enum itemCategory */ theCat) {	// itemTable *
  let returnedTable;	// itemTable *
	switch (theCat) {
		case FOOD:
			returnedTable = foodTable;
      break;
		case WEAPON:
			returnedTable = weaponTable;
      break;
		case ARMOR:
			returnedTable = armorTable;
      break;
		case POTION:
			returnedTable = potionTable;
      break;
		case SCROLL:
			returnedTable = scrollTable;
      break;
		case RING:
			returnedTable = ringTable;
      break;
		case WAND:
			returnedTable = wandTable;
      break;
		case STAFF:
			returnedTable = staffTable;
      break;
		case CHARM:
			returnedTable = charmTable;
      break;
		default:
			returnedTable = null;
      break;
	}
  return returnedTable;
}

function isVowelish(str) {
	str = STRING(str);

	if (stringsMatch(str, "uni")) return false;  // Words that start with "uni" aren't treated like vowels; e.g., "a" unicorn.
	if (stringsMatch(str, "eu"))  return false;  // Words that start with "eu" aren't treated like vowels; e.g., "a" eucalpytus staff.

	let i = 0;
	while( str.charCodeAt(i) == COLOR_ESCAPE ) {
		i += 4;
	}

	// TODO - Get rid of 'charAt'
	const ch = str.charAt(i).toLowerCase();
	return ['a', 'e', 'i', 'o', 'u'].includes(ch);
}
//
// function charmEffectDuration(charmKind, enchant) {
//     const duration = [
//         3,  // Health
//         20, // Protection
//         7,  // Haste
//         10, // Fire immunity
//         5,  // Invisibility
//         25, // Telepathy
//         10, // Levitation
//         0,  // Shattering
//         18, // Guardian
//         0,  // Teleportation
//         0,  // Recharging
//         0,  // Negation
//     ];
//     const increment = [
//         0,  // Health
//         0,  // Protection
//         20, // Haste
//         25, // Fire immunity
//         20, // Invisibility
//         25, // Telepathy
//         25, // Levitation
//         0,  // Shattering
//         0,  // Guardian
//         0,  // Teleportation
//         0,  // Recharging
//         0,  // Negation
//     ];
//
//     return Math.floor(duration[charmKind] * (pow((100 + (increment[charmKind])) / 100, enchant) + FLOAT_FUDGE));
// }
//
// function charmRechargeDelay(charmKind, enchant) {
//     const duration = [
//         2500,   // Health
//         1000,   // Protection
//         800,    // Haste
//         800,    // Fire immunity
//         800,    // Invisibility
//         800,    // Telepathy
//         800,    // Levitation
//         2500,   // Shattering
//         700,    // Guardian
//         1000,   // Teleportation
//         10000,  // Recharging
//         2500,   // Negation
//     ];
//     const increment = [
//         45, // Health
//         40, // Protection
//         35, // Haste
//         40, // Fire immunity
//         35, // Invisibility
//         35, // Telepathy
//         35, // Levitation
//         40, // Shattering
//         30, // Guardian
//         45, // Teleportation
//         45, // Recharging
//         40, // Negation
//     ];
//
//     return charmEffectDuration(charmKind, enchant) + Math.floor(duration[charmKind] * (pow((100 - (increment[charmKind])) / 100, enchant) + FLOAT_FUDGE));
// }

function fp_enchantIncrement(/* item */ theItem) {
	if (theItem.category & (WEAPON | ARMOR)) {
		if (theItem.strengthRequired == 0) {
			return (1 + 0) << FP_BASE;
		} else if (rogue.strength - player.weaknessAmount < theItem.strengthRequired) {
			return Math.floor((35 << FP_BASE) / 10);
		} else {
			return Math.floor((125 << FP_BASE) / 100);
		}
	} else {
		return (1 + 0) << FP_BASE;
	}
}

function itemIsCarried( /* item */ theItem) {
	let tempItem;  // item *

	for (tempItem = packItems.nextItem; tempItem != NULL; tempItem = tempItem.nextItem) {
		if (tempItem === theItem) {
			return true;
		}
	}
	return false;
}

function effectiveRingEnchant( /* item */ theItem) {
    if (theItem.category != RING) {
        return 0;
    }
    if (!(theItem.flags & ITEM_IDENTIFIED)
        && theItem.enchant1 > 0)
		{
        return theItem.timesEnchanted + 1; // Unidentified positive rings act as +1 until identified.
    }
    return theItem.enchant1;
}

function apparentRingBonus(/* ringKind */ kind) {
    const rings = [rogue.ringLeft, rogue.ringRight];
		let ring;
    let retval = 0;
    let i;

    if (ringTable[kind].identified) {
      for (i = 0; i < 2; i++) {
        ring = rings[i];
        if (ring && ring.kind == kind) {
            retval += effectiveRingEnchant(ring);
        }
      }
    }
    return retval;
}

const weaponRunicEffectDescriptions = [
	"time will stop while you take an extra turn",
	"the enemy will die instantly",
	"the enemy will be paralyzed",
	"[multiplicity]", // never used
	"the enemy will be slowed",
	"the enemy will be confused",
			"the enemy will be flung",
	"[slaying]", // never used
	"the enemy will be healed",
	"the enemy will be cloned"
];


// returns a string with the item description details
function itemDetails( buf, /* item */ theItem) {
	const buf2 = STRING(), buf3 = STRING(), theName = STRING(), goodColorEscape = STRING(), badColorEscape = STRING(), whiteColorEscape = STRING();
	let singular, carried;
	let enchant;
	let nextLevelState = 0, newValue;
	let accuracyChange, damageChange, current, currentDamage, newDamage;

	encodeMessageColor(goodColorEscape, 0, goodMessageColor);
	encodeMessageColor(badColorEscape, 0, badMessageColor);
	encodeMessageColor(whiteColorEscape, 0, white);

	singular = (theItem.quantity == 1 ? true : false);
	carried = itemIsCarried(theItem);

	// Name
	itemName(theItem, theName, true, true, NULL);
	encodeMessageColor(buf, 0, itemMessageColor);
	capitalize(theName);
	strcat(buf, theName);
	if (carried) {
		sprintf(buf2, " (%c)", theItem.inventoryLetter);
		strcat(buf, buf2);
	}
	encodeMessageColor(buf2, 0, white);
	strcat(buf, buf2);
	strcat(buf, "\n\n");

	enchant = fp_netEnchant(theItem);
	itemName(theItem, theName, false, false, NULL);

	// introductory text
  const itemTable = tableForItemCategory(theItem.category, NULL);
	if (itemTable && (itemTable[theItem.kind].identified || rogue.playbackOmniscience))
  {
		strcat(buf, tableForItemCategory(theItem.category, NULL)[theItem.kind].description);

    if (theItem.category == POTION && theItem.kind == POTION_LIFE) {
			sprintf(buf2, "\n\nIt will increase your maximum health by %s%i%%s.",
							goodColorEscape,
							Math.floor((player.info.maxHP + 10) * 100 / player.info.maxHP - 100),
							whiteColorEscape);
			strcat(buf, buf2);
    }
	} else {
		switch (theItem.category) {
			case POTION:
				sprintf(buf2, "%s flask%s contain%s a swirling %s liquid. Who knows what %s will do when drunk or thrown?",
						(singular ? "This" : "These"),
						(singular ? "" : "s"),
						(singular ? "s" : ""),
						itemTable[theItem.kind].flavor,
						(singular ? "it" : "they"));
				break;
			case SCROLL:
				sprintf(buf2, "%s parchment%s %s covered with indecipherable writing, and bear%s a title of \"%s.\" Who knows what %s will do when read aloud?",
						(singular ? "This" : "These"),
						(singular ? "" : "s"),
						(singular ? "is" : "are"),
						(singular ? "s" : ""),
						itemTable[theItem.kind].flavor,
						(singular ? "it" : "they"));
				break;
			case STAFF:
				sprintf(buf2, "This gnarled %s staff is warm to the touch. Who knows what it will do when used?",
						itemTable[theItem.kind].flavor);
				break;
			case WAND:
				sprintf(buf2, "This thin %s wand is warm to the touch. Who knows what it will do when used?",
						itemTable[theItem.kind].flavor);
				break;
			case RING:
				sprintf(buf2, "This metal band is adorned with a%s %s gem that glitters in the darkness. Who knows what effect it has when worn? ",
            isVowelish(itemTable[theItem.kind].flavor) ? "n" : "",
						itemTable[theItem.kind].flavor);
				break;
			case CHARM: // Should never be displayed.
				strcat(buf2, "What a perplexing charm!");
				break;
			case AMULET:
				strcpy(buf2, "Legends are told about this mysterious golden amulet, and legions of adventurers have perished in its pursuit. Unfathomable riches await anyone with the skill and ambition to carry it into the light of day.");
				break;
			case GEM:
				sprintf(buf2, "Faint golden lights swirl and fluoresce beneath the stone%s surface. Lumenstones are said to contain mysterious properties of untold power, but for you, they mean one thing: riches.",
						(singular ? "'s" : "s'"));
				break;
			case KEY:
				strcpy(buf2, keyTable[theItem.kind].description);
				break;
			case GOLD:
				sprintf(buf2, "A pile of %i shining gold coins.", theItem.quantity);
				break;
			default:
				break;
		}
		strcat(buf, buf2);
	}

  if (carried && theItem.originDepth > 0) {
      sprintf(buf2, " (You found %s on depth %i.) ",
              singular ? "it" : "them",
              theItem.originDepth);
			strcat(buf, buf2);
  }

	// detailed description
	switch (theItem.category) {

		case FOOD:
			sprintf(buf2, "\n\nYou are %shungry enough to fully enjoy a %s.",
					((STOMACH_SIZE - player.status[STATUS_NUTRITION]) >= foodTable[theItem.kind].strengthRequired ? "" : "not yet "),
					foodTable[theItem.kind].name);
			strcat(buf, buf2);
			break;

		case WEAPON:
		case ARMOR:
			// enchanted? strength modifier?
			if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
				if (theItem.enchant1) {
                    if (theItem.enchant1 > 0) {
                        sprintf(buf2, "\n\nThe %s bear%s an intrinsic enchantment of %s+%i%s",
                                theName,
                                (singular ? "s" : ""),
                                goodColorEscape,
                                theItem.enchant1,
                                whiteColorEscape);
                    } else {
                        sprintf(buf2, "\n\nThe %s bear%s an intrinsic penalty of %s%i%s",
                                theName,
                                (singular ? "s" : ""),
                                badColorEscape,
                                theItem.enchant1,
                                whiteColorEscape);
                    }
				} else {
					sprintf(buf2, "\n\nThe %s bear%s no intrinsic enchantment",
							theName,
							(singular ? "s" : ""));
				}
				strcat(buf, buf2);
				if (fp_strengthModifier(theItem)) {
					sprintf(buf2, ", %s %s %s %s%s%{f,2}%s because of your %s strength. ",
							(theItem.enchant1 ? "and" : "but"),
							(singular ? "carries" : "carry"),
							(theItem.enchant1 && (theItem.enchant1 > 0) == (fp_strengthModifier(theItem) > 0) ? "an additional" : "a"),
							(fp_strengthModifier(theItem) > 0 ? "bonus of +" : "penalty of "),
              (fp_strengthModifier(theItem) > 0 ? goodColorEscape : badColorEscape),
							Math.floor(fp_strengthModifier(theItem) / FP_FACTOR),
              whiteColorEscape,
							(fp_strengthModifier(theItem) > 0 ? "excess" : "inadequate"));
					strcat(buf, buf2);
				} else {
					strcat(buf, ". ");
				}
			} else {
				if ((theItem.enchant1 > 0) && (theItem.flags & ITEM_MAGIC_DETECTED)) {
					sprintf(buf2, "\n\nYou can feel an %saura of benevolent magic%s radiating from the %s. ",
              goodColorEscape,
              whiteColorEscape,
							theName);
					strcat(buf, buf2);
				}
				if (fp_strengthModifier(theItem)) {
					sprintf(buf2, "\n\nThe %s %s%s a %s%s%{f,2}%s because of your %s strength. ",
							theName,
							((theItem.enchant1 > 0) && (theItem.flags & ITEM_MAGIC_DETECTED) ? "also " : ""),
							(singular ? "carries" : "carry"),
							(fp_strengthModifier(theItem) > 0 ? "bonus of +" : "penalty of "),
              (fp_strengthModifier(theItem) > 0 ? goodColorEscape : badColorEscape),
							Math.floor(fp_strengthModifier(theItem) / FP_FACTOR),
              whiteColorEscape,
							(fp_strengthModifier(theItem) > 0 ? "excess" : "inadequate"));
					strcat(buf, buf2);
				}

				if (theItem.category & WEAPON) {
					sprintf(buf2, "It will reveal its secrets if you defeat %i%s %s with it. ",
							theItem.charges,
							(theItem.charges == WEAPON_KILLS_TO_AUTO_ID ? "" : " more"),
							(theItem.charges == 1 ? "enemy" : "enemies"));
				} else {
					sprintf(buf2, "It will reveal its secrets if worn for %i%s turn%s. ",
							theItem.charges,
							(theItem.charges == ARMOR_DELAY_TO_AUTO_ID ? "" : " more"),
							(theItem.charges == 1 ? "" : "s"));
				}
				strcat(buf, buf2);
			}

			// Display the known percentage by which the armor/weapon will increase/decrease accuracy/damage/defense if not already equipped.
			if (!(theItem.flags & ITEM_EQUIPPED)) {
				if (theItem.category & WEAPON) {
					current = player.info.accuracy;
					if (rogue.weapon) {
            currentDamage = Math.floor((rogue.weapon.damage.lowerBound + rogue.weapon.damage.upperBound << FP_BASE) / 2);
						if ((rogue.weapon.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
							current = current * fp_accuracyFraction(fp_netEnchant(rogue.weapon)) >> FP_BASE;
							currentDamage = currentDamage * fp_damageFraction(fp_netEnchant(rogue.weapon)) >> FP_BASE;
						} else {
							current = current * fp_accuracyFraction(fp_strengthModifier(rogue.weapon)) >> FP_BASE;
							currentDamage = currentDamage * fp_damageFraction(fp_strengthModifier(rogue.weapon)) >> FP_BASE;
						}
					} else {
              currentDamage = Math.floor((player.info.damage.lowerBound + player.info.damage.upperBound << FP_BASE) / 2);
          }

					newValue = player.info.accuracy;
					newDamage = Math.floor((theItem.damage.lowerBound + theItem.damage.upperBound << FP_BASE) / 2);
					if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
						newValue = newValue * fp_accuracyFraction(fp_netEnchant(theItem)) >> FP_BASE;
						newDamage = newDamage * fp_damageFraction(fp_netEnchant(theItem)) >> FP_BASE;
					} else {
						newValue = newValue * fp_accuracyFraction(fp_strengthModifier(theItem)) >> FP_BASE;
						newDamage = newDamage * fp_damageFraction(fp_strengthModifier(theItem)) >> FP_BASE;
					}
					accuracyChange	= Math.floor(newValue * 100 / current) - 100;
					damageChange	= Math.floor(newDamage * 100 / currentDamage) - 100;
					sprintf(buf2, "Wielding the %s%s will %s your current accuracy by %s%i%%s, and will %s your current damage by %s%i%%s. ",
							theName,
							((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) ? "" : ", assuming it has no hidden properties,",
							((accuracyChange) < 0) ? "decrease" : "increase",
              ((accuracyChange) < 0) ? badColorEscape : (accuracyChange > 0 ? goodColorEscape : ""),
							abs(accuracyChange),
              whiteColorEscape,
							((damageChange) < 0) ? "decrease" : "increase",
              ((damageChange) < 0) ? badColorEscape : (damageChange > 0 ? goodColorEscape : ""),
							abs(damageChange),
              whiteColorEscape);
				} else {
					newValue = theItem.armor;
					if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
						newValue += 10 * fp_netEnchant(theItem) >> FP_BASE;
					} else {
						newValue += 10 * fp_strengthModifier(theItem) >> FP_BASE;
					}
					newValue = max(0, newValue);
          newValue = Math.floor(newValue / 10);
					sprintf(buf2, "Wearing the %s%s will result in an armor rating of %s%i%s. ",
							theName,
							((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) ? "" : ", assuming it has no hidden properties,",
              (newValue > displayedArmorValue() ? goodColorEscape : (newValue < displayedArmorValue() ? badColorEscape : whiteColorEscape)),
							Math.floor(newValue),
              whiteColorEscape);
				}
				strcat(buf, buf2);
			}

			// protected?
			if (theItem.flags & ITEM_PROTECTED) {
				sprintf(buf2, "%sThe %s cannot be corroded by acid.%s ",
            goodColorEscape,
						theName,
            whiteColorEscape);
				strcat(buf, buf2);
			}

			// heavy armor?
      current = armorAggroAdjustment(rogue.armor);
			if ((theItem.category & ARMOR)
                && !(theItem.flags & ITEM_EQUIPPED)
                && (current != armorAggroAdjustment(theItem)))
      {
        newValue = armorAggroAdjustment(theItem);
        if (rogue.armor) {
            newValue -= armorAggroAdjustment(rogue.armor);
        }
				sprintf(buf2, "Equipping the %s will %s%s your stealth range by %i%s. ",
						theName,
            newValue > 0 ? badColorEscape : goodColorEscape,
            newValue > 0 ? "increase" : "decrease",
            abs(newValue),
            whiteColorEscape);
				strcat(buf, buf2);
			}

			if (theItem.category & WEAPON) {

				// runic?
				if (theItem.flags & ITEM_RUNIC) {
					if ((theItem.flags & ITEM_RUNIC_IDENTIFIED) || rogue.playbackOmniscience) {
						sprintf(buf2, "\n\nGlowing runes of %s adorn the %s. ",
								weaponRunicNames[theItem.enchant2],
								theName);
						strcat(buf, buf2);
						if (theItem.enchant2 == W_SLAYING) {
              describeMonsterClass(buf3, theItem.vorpalEnemy, false);
							sprintf(buf2, "It will never fail to slay a%s %s in a single stroke. ",
                  (isVowelish(buf3) ? "n" : ""),
									buf3);
							strcat(buf, buf2);
						} else if (theItem.enchant2 == W_MULTIPLICITY) {
							if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
								sprintf(buf2, "%i% of the time that it hits an enemy, %i spectral %s%s will spring into being with accuracy and attack power equal to your own, and will dissipate %i turns later. (If the %s is enchanted, %i image%s will appear %i% of the time, and will last %i turns.)",
										runicWeaponChance(theItem, false, 0),
										fp_weaponImageCount(enchant),
										theName,
										(fp_weaponImageCount(enchant) > 1 ? "s" : ""),
										fp_weaponImageDuration(enchant),
										theName,
										fp_weaponImageCount(enchant + fp_enchantIncrement(theItem)),
										(fp_weaponImageCount(enchant + fp_enchantIncrement(theItem)) > 1 ? "s" : ""),
										runicWeaponChance(theItem, true, enchant + fp_enchantIncrement(theItem)),
										fp_weaponImageDuration(enchant + fp_enchantIncrement(theItem)));
							} else {
								sprintf(buf2, "Sometimes, when it hits an enemy, spectral %ss will spring into being with accuracy and attack power equal to your own, and will dissipate shortly thereafter.",
										theName);
							}
							strcat(buf, buf2);
						} else {
							if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
                if (runicWeaponChance(theItem, false, 0) < 2
                    && rogue.strength - player.weaknessAmount < theItem.strengthRequired)
                {
									strcpy(buf2, "Its runic effect will almost never activate because of your inadequate strength, but sometimes, when");
                } else {
									sprintf(buf2, "%i% of the time that",
													runicWeaponChance(theItem, false, 0));
                }
								strcat(buf, buf2);
							} else {
								strcat(buf, "Sometimes, when");
							}
							sprintf(buf2, " it hits an enemy, %s",
									weaponRunicEffectDescriptions[theItem.enchant2]);
							strcat(buf, buf2);

							if ((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience) {
								switch (theItem.enchant2) {
									case W_SPEED:
										strcat(buf, ". ");
										break;
									case W_PARALYSIS:
										sprintf(buf2, " for %i turns. ",
												(fp_weaponParalysisDuration(enchant)));
										strcat(buf, buf2);
										nextLevelState = Math.floor(fp_weaponParalysisDuration(enchant + fp_enchantIncrement(theItem)));
										break;
									case W_SLOWING:
										sprintf(buf2, " for %i turns. ",
												fp_weaponSlowDuration(enchant));
										strcat(buf, buf2);
										nextLevelState = fp_weaponSlowDuration(enchant + fp_enchantIncrement(theItem));
										break;
									case W_CONFUSION:
										sprintf(buf2, " for %i turns. ",
												fp_weaponConfusionDuration(enchant));
										strcat(buf, buf2);
										nextLevelState = fp_weaponConfusionDuration(enchant + fp_enchantIncrement(theItem));
										break;
									case W_FORCE:
										sprintf(buf2, " up to %i spaces backward. If the enemy hits an obstruction, it (and any monster it hits) will take damage in proportion to the distance it flew. ",
												fp_weaponForceDistance(enchant));
										strcat(buf, buf2);
										nextLevelState = fp_weaponForceDistance(enchant + fp_enchantIncrement(theItem));
										break;
									case W_MERCY:
										strcpy(buf2, " by 50% of its maximum health. ");
										strcat(buf, buf2);
										break;
									default:
										strcpy(buf2, ". ");
										strcat(buf, buf2);
										break;
								}

								if (((theItem.flags & ITEM_IDENTIFIED) || rogue.playbackOmniscience)
									&& runicWeaponChance(theItem, false, 0) < runicWeaponChance(theItem, true, (enchant + fp_enchantIncrement(theItem))))
                {
									sprintf(buf2, "(If the %s is enchanted, the chance will increase to %i%",
											theName,
											runicWeaponChance(theItem, true, (enchant + fp_enchantIncrement(theItem))));
									strcat(buf, buf2);
									if (nextLevelState) {
                      if (theItem.enchant2 == W_FORCE) {
                          sprintf(buf2, " and the distance will increase to %i.)",
                                  nextLevelState);
                      } else {
                          sprintf(buf2, " and the duration will increase to %i turns.)",
                                  nextLevelState);
                      }
									} else {
										strcpy(buf2, ".)");
									}
									strcat(buf, buf2);
								}
							} else {
								strcat(buf, ". ");
							}
						}

					} else if (theItem.flags & ITEM_IDENTIFIED) {
						sprintf(buf2, "\n\nGlowing runes of an indecipherable language run down the length of the %s. ",
								theName);
						strcat(buf, buf2);
					}
				}

				// equipped? cursed?
				if (theItem.flags & ITEM_EQUIPPED) {
					sprintf(buf2, "\n\nYou hold the %s at the ready%s. ",
							theName,
							((theItem.flags & ITEM_CURSED) ? ", and because it is cursed, you are powerless to let go" : ""));
					strcat(buf, buf2);
				} else if (((theItem.flags & (ITEM_IDENTIFIED | ITEM_MAGIC_DETECTED)) || rogue.playbackOmniscience)
						   && (theItem.flags & ITEM_CURSED))
        {
					sprintf(buf2, "\n\n%sYou can feel a malevolent magic lurking within the %s.%s ",
                            badColorEscape,
                            theName,
                            whiteColorEscape);
					strcat(buf, buf2);
				}

			} else if (theItem.category & ARMOR) {

				// runic?
				if (theItem.flags & ITEM_RUNIC) {
					if ((theItem.flags & ITEM_RUNIC_IDENTIFIED) || rogue.playbackOmniscience) {
						sprintf(buf2, "\n\nGlowing runes of %s adorn the %s. ",
								armorRunicNames[theItem.enchant2],
								theName);
						strcat(buf, buf2);

						// A_MULTIPLICITY, A_MUTUALITY, A_ABSORPTION, A_REPRISAL, A_IMMUNITY, A_REFLECTION, A_BURDEN, A_VULNERABILITY, A_IMMOLATION
						switch (theItem.enchant2) {
							case A_MULTIPLICITY:
								sprintf(buf2, "When worn, 33% of the time that an enemy's attack connects, %i allied spectral duplicate%s of your attacker will appear for 3 turns. ",
										fp_armorImageCount(enchant),
										(fp_armorImageCount(enchant) == 1 ? "" : "s"));
								if (fp_armorImageCount(enchant + fp_enchantIncrement(theItem)) > fp_armorImageCount(enchant)) {
									sprintf(buf3, "(If the %s is enchanted, the number of duplicates will increase to %i.) ",
											theName,
											(fp_armorImageCount(enchant + fp_enchantIncrement(theItem))));
									strcat(buf2, buf3);
								}
								break;
							case A_MUTUALITY:
								strcpy(buf2, "When worn, the damage that you incur from physical attacks will be split evenly among yourself and all other adjacent enemies. ");
								break;
							case A_ABSORPTION:
                if (theItem.flags & ITEM_IDENTIFIED) {
                    sprintf(buf2, "It will reduce the damage of inbound attacks by a random amount between 0 and %i, which is %i% of your current maximum health. (If the %s is enchanted, this maximum amount will %s %i.) ",
                            fp_armorAbsorptionMax(enchant),
                            Math.floor(100 * fp_armorAbsorptionMax(enchant) / player.info.maxHP),
                            theName,
                            (fp_armorAbsorptionMax(enchant) == fp_armorAbsorptionMax((enchant + fp_enchantIncrement(theItem))) ? "remain at" : "increase to"),
                            fp_armorAbsorptionMax((enchant + fp_enchantIncrement(theItem))));
                } else {
									strcpy(buf2, "It will reduce the damage of inbound attacks by a random amount determined by its enchantment level. ");
                }
								break;
							case A_REPRISAL:
                if (theItem.flags & ITEM_IDENTIFIED) {
                    sprintf(buf2, "Any enemy that attacks you will itself be wounded by %i% of the damage that it inflicts. (If the %s is enchanted, this percentage will increase to %i%.) ",
                            fp_armorReprisalPercent(enchant),
                            theName,
                            fp_armorReprisalPercent((enchant + fp_enchantIncrement(theItem))));
                } else {
                    strcpy(buf2, "Any enemy that attacks you will itself be wounded by a percentage (determined by enchantment level) of the damage that it inflicts. ");
                }
								break;
							case A_IMMUNITY:
                describeMonsterClass(buf3, theItem.vorpalEnemy, false);
								sprintf(buf2, "It offers complete protection from any attacking %s. ",
										buf3);
								break;
							case A_REFLECTION:
                if (theItem.flags & ITEM_IDENTIFIED) {
                    if (theItem.enchant1 > 0) {
                        const reflectChance = fp_reflectionChance(enchant);
                        const reflectChance2 = fp_reflectionChance(enchant + fp_enchantIncrement(theItem));
                        sprintf(buf2, "When worn, you will deflect %i% of incoming spells -- including directly back at their source %i% of the time. (If the armor is enchanted, these will increase to %i% and %i%.) ",
                                reflectChance,
                                Math.floor(reflectChance * reflectChance / 100),
                                reflectChance2,
                                Math.floor(reflectChance2 * reflectChance2 / 100));
                    } else if (theItem.enchant1 < 0) {
                        const reflectChance = fp_reflectionChance(enchant);
                        const reflectChance2 = fp_reflectionChance(enchant + fp_enchantIncrement(theItem));
                        sprintf(buf2, "When worn, %i% of your own spells will deflect from their target -- including directly back at you %i% of the time. (If the armor is enchanted, these will decrease to %i% and %i%.) ",
                                reflectChance,
                                Math.floor(reflectChance * reflectChance / 100),
                                reflectChance2,
                                Math.floor(reflectChance2 * reflectChance2 / 100));
                    }
                } else {
									strcpy(buf2, "When worn, you will deflect some percentage of incoming spells, determined by enchantment level. ");
                }
								break;
              case A_RESPIRATION:
									strcpy(buf2, "When worn, it will maintain a pocket of fresh air around you, rendering you immune to the effects of steam and all toxic gases. ");
                  break;
              case A_DAMPENING:
									strcpy(buf2, "When worn, it will safely absorb the concussive impact of any explosions (though you may still be burned). ");
                  break;
							case A_BURDEN:
								strcpy(buf2, "10% of the time it absorbs a blow, its strength requirement will permanently increase. ");
								break;
							case A_VULNERABILITY:
								strcpy(buf2, "While it is worn, inbound attacks will inflict twice as much damage. ");
								break;
              case A_IMMOLATION:
								strcpy(buf2, "10% of the time it absorbs a blow, it will explode in flames. ");
								break;
							default:
								break;
						}
						strcat(buf, buf2);
					} else if (theItem.flags & ITEM_IDENTIFIED) {
						sprintf(buf2, "\n\nGlowing runes of an indecipherable language spiral around the %s. ",
								theName);
						strcat(buf, buf2);
					}
				}

				// equipped? cursed?
				if (theItem.flags & ITEM_EQUIPPED) {
					sprintf(buf2, "\n\nYou are wearing the %s%s. ",
							theName,
							((theItem.flags & ITEM_CURSED) ? ", and because it is cursed, you are powerless to remove it" : ""));
					strcat(buf, buf2);
				} else if (((theItem.flags & (ITEM_IDENTIFIED | ITEM_MAGIC_DETECTED)) || rogue.playbackOmniscience)
						   && (theItem.flags & ITEM_CURSED))
        {
					sprintf(buf2, "\n\n%sYou can feel a malevolent magic lurking within the %s.%s ",
                            badColorEscape,
                            theName,
                            whiteColorEscape);
					strcat(buf, buf2);
				}
			}
			break;

		case STAFF:
			// charges

			newValue = apparentRingBonus(RING_WISDOM);
			if ((theItem.flags & ITEM_IDENTIFIED)  || rogue.playbackOmniscience) {
				sprintf(buf2, "\n\nThe %s has %i charges remaining out of a maximum of %i charges, and%s recovers a charge in approximately %i turns. ",
						theName,
						theItem.charges,
						theItem.enchant1,
            newValue == 0 ? "" : ", with your current rings,",
            Math.floor(staffChargeDuration(theItem) / fp_ringWisdomMultiplier(newValue << FP_BASE)));
				strcat(buf, buf2);
			} else if (theItem.flags & ITEM_MAX_CHARGES_KNOWN) {
				sprintf(buf2, "\n\nThe %s has a maximum of %i charges, and%s recovers a charge in approximately %i turns. ",
							theName,
              theItem.enchant1,
              newValue == 0 ? "" : ", with your current rings,",
              Math.floor(staffChargeDuration(theItem) / fp_ringWisdomMultiplier(newValue << FP_BASE)));
				strcat(buf, buf2);
			}

			// effect description
			if (((theItem.flags & (ITEM_IDENTIFIED | ITEM_MAX_CHARGES_KNOWN)) && staffTable[theItem.kind].identified)
				|| rogue.playbackOmniscience)
      {
				switch (theItem.kind) {
					case STAFF_LIGHTNING:
						sprintf(buf2, "This staff deals damage to every creature in its line of fire; nothing is immune. (If the staff is enchanted, its average damage will increase by %i%.)",
								Math.floor(100 * (fp_staffDamageLow(enchant + FP_FACTOR) + fp_staffDamageHigh(enchant + FP_FACTOR)) / (fp_staffDamageLow(enchant) + fp_staffDamageHigh(enchant)) - 100));
						break;
					case STAFF_FIRE:
						sprintf(buf2, "This staff deals damage to any creature that it hits, unless the creature is immune to fire. (If the staff is enchanted, its average damage will increase by %i%.) It also sets creatures and flammable terrain on fire.",
								Math.floor(100 * (fp_staffDamageLow(enchant + FP_FACTOR) + fp_staffDamageHigh(enchant + FP_FACTOR)) / (fp_staffDamageLow(enchant) + fp_staffDamageHigh(enchant)) - 100));
            break;
					case STAFF_POISON:
						sprintf(buf2, "The bolt from this staff will poison any creature that it hits for %i turns. (If the staff is enchanted, this will increase to %i turns.)",
								fp_staffPoison(enchant),
								fp_staffPoison(enchant + FP_FACTOR));
						break;
					case STAFF_TUNNELING:
						sprintf(buf2, "The bolt from this staff will dissolve %i layers of obstruction. (If the staff is enchanted, this will increase to %i layers.)",
								theItem.enchant1,
								theItem.enchant1 + 1);
						break;
					case STAFF_BLINKING:
						sprintf(buf2, "This staff enables you to teleport up to %i spaces. (If the staff is enchanted, this will increase to %i spaces.)",
								fp_staffBlinkDistance(enchant),
								fp_staffBlinkDistance(enchant + FP_FACTOR));
						break;
					case STAFF_ENTRANCEMENT:
						sprintf(buf2, "This staff will compel its target to mirror your movements for %i turns. (If the staff is enchanted, this will increase to %i turns.)",
								fp_staffEntrancementDuration(enchant),
								fp_staffEntrancementDuration(enchant + FP_FACTOR));
						break;
					case STAFF_HEALING:
						if (enchant < 10) {
							sprintf(buf2, "This staff will heal its target by %i% of its maximum health. (If the staff is enchanted, this will increase to %i%.)",
									theItem.enchant1 * 10,
									(theItem.enchant1 + 1) * 10);
						} else {
							strcpy(buf2, "This staff will completely heal its target.");
						}
						break;
					case STAFF_HASTE:
						sprintf(buf2, "This staff will cause its target to move twice as fast for %i turns. (If the staff is enchanted, this will increase to %i turns.)",
								fp_staffHasteDuration(enchant),
								fp_staffHasteDuration(enchant + FP_FACTOR));
						break;
					case STAFF_OBSTRUCTION:
						strcpy(buf2, "");
						break;
					case STAFF_DISCORD:
						sprintf(buf2, "This staff will cause discord for %i turns. (If the staff is enchanted, this will increase to %i turns.)",
								fp_staffDiscordDuration(enchant),
								fp_staffDiscordDuration(enchant + FP_FACTOR));
						break;
					case STAFF_CONJURATION:
						sprintf(buf2, "%i phantom blades will be called into service. (If the staff is enchanted, this will increase to %i blades.)",
								fp_staffBladeCount(enchant),
								fp_staffBladeCount(enchant + FP_FACTOR));
						break;
					case STAFF_PROTECTION:
						sprintf(buf2, "This staff will shield a creature for up to 20 turns against up to %i damage. (If the staff is enchanted, this will increase to %i damage.)",
								Math.floor(fp_staffProtection(enchant) / 10),
								Math.floor(fp_staffProtection(enchant + FP_FACTOR) / 10));
						break;

					default:
						strcpy(buf2, "No one knows what this staff does.");
						break;
				}
        if (strlen(buf2)) {
            strcat(buf, "\n\n");
            strcat(buf, buf2);
        }
			}
			break;

		case WAND:
			strcat(buf, "\n\n");
			if ((theItem.flags & (ITEM_IDENTIFIED | ITEM_MAX_CHARGES_KNOWN)) || rogue.playbackOmniscience) {
				if (theItem.charges) {
					sprintf(buf2, "%i charge%s remain%s. Enchanting this wand will add %i charge%s.",
							theItem.charges,
							(theItem.charges == 1 ? "" : "s"),
							(theItem.charges == 1 ? "s" : ""),
              wandTable[theItem.kind].range.lowerBound,
              (wandTable[theItem.kind].range.lowerBound == 1 ? "" : "s"));
				} else {
					sprintf(buf2, "No charges remain.  Enchanting this wand will add %i charge%s.",
                            wandTable[theItem.kind].range.lowerBound,
                            (wandTable[theItem.kind].range.lowerBound == 1 ? "" : "s"));
				}
			} else {
				if (theItem.enchant2) {
					sprintf(buf2, "You have used this wand %i time%s, but do not know how many charges, if any, remain.",
							theItem.enchant2,
							(theItem.enchant2 == 1 ? "" : "s"));
				} else {
					strcpy(buf2, "You have not yet used this wand.");
				}

				if (wandTable[theItem.kind].identified) {
					strcat(buf, buf2);
					sprintf(buf2, " Wands of this type can be found with %i to %i charges. Enchanting this wand will add %i charge%s.",
							wandTable[theItem.kind].range.lowerBound,
							wandTable[theItem.kind].range.upperBound,
              wandTable[theItem.kind].range.lowerBound,
              (wandTable[theItem.kind].range.lowerBound == 1 ? "" : "s"));
				}
			}
			strcat(buf, buf2);
			break;

		case RING:
			if (((theItem.flags & ITEM_IDENTIFIED) && ringTable[theItem.kind].identified) || rogue.playbackOmniscience) {
        if (theItem.enchant1) {
            switch (theItem.kind) {
                case RING_CLAIRVOYANCE:
                    if (theItem.enchant1 > 0) {
                        sprintf(buf2, "\n\nThis ring provides magical sight with a radius of %i. (If the ring is enchanted, this will increase to %i.)",
                                theItem.enchant1 + 1,
                                theItem.enchant1 + 2);
                    } else {
                        sprintf(buf2, "\n\nThis ring magically blinds you to a radius of %i. (If the ring is enchanted, this will decrease to %i.)",
                                (theItem.enchant1 * -1) + 1,
                                (theItem.enchant1 * -1));
                    }
                    strcat(buf, buf2);
                    break;
                case RING_REGENERATION:
                    sprintf(buf2, "\n\nWith this ring equipped, you will regenerate all of your health in %li turns (instead of %li). (If the ring is enchanted, this will decrease to %li turns.)",
                            Math.floor(fp_turnsForFullRegenInThousandths(theItem.enchant1) / 1000),
                            TURNS_FOR_FULL_REGEN,
                            Math.floor(fp_turnsForFullRegenInThousandths(theItem.enchant1 + 1) / 1000));
                    strcat(buf, buf2);
                    break;
                case RING_TRANSFERENCE:
                    sprintf(buf2, "\n\nDealing direct damage to a creature (whether in melee or otherwise) will %s you by %i% of the damage dealt. (If the ring is enchanted, this will %s to %i%.)",
                            (theItem.enchant1 >= 0 ? "heal" : "harm"),
                            abs(theItem.enchant1) * 5,
                            (theItem.enchant1 >= 0 ? "increase" : "decrease"),
                            abs(theItem.enchant1 + 1) * 5);
                    strcat(buf, buf2);
                    break;
                case RING_WISDOM:
                    sprintf(buf2, "\n\nWhen worn, your staffs will recharge at %i% of their normal rate. (If the ring is enchanted, the rate will increase to %i% of the normal rate.)",
											Math.floor(100 * fp_ringWisdomMultiplier(enchant) >> FP_BASE),
											Math.floor(100 * fp_ringWisdomMultiplier(enchant + FP_FACTOR) >> FP_BASE));
                    strcat(buf, buf2);
                    break;
                case RING_REAPING:
                    sprintf(buf2, "\n\nEach blow that you land with a weapon will %s your staffs and charms by 0-%i turns per point of damage dealt. (If the ring is enchanted, this will %s to 0-%i turns per point of damage.)",
                            (theItem.enchant1 >= 0 ? "recharge" : "drain"),
                            abs(theItem.enchant1),
                            (theItem.enchant1 >= 0 ? "increase" : "decrease"),
                            abs(theItem.enchant1 + 1));
                    strcat(buf, buf2);
                    break;
                default:
                    break;
            }
        }
			} else {
				sprintf(buf2, "\n\nIt will reveal its secrets if worn for %i%s turn%s",
						theItem.charges,
						(theItem.charges == RING_DELAY_TO_AUTO_ID ? "" : " more"),
						(theItem.charges == 1 ? "" : "s"));
				strcat(buf, buf2);

        if ((theItem.charges < RING_DELAY_TO_AUTO_ID || (theItem.flags & (ITEM_MAGIC_DETECTED | ITEM_IDENTIFIED)))
            && theItem.enchant1 > 0) // Mention the unknown-positive-ring footnote only if it's good magic and you know it.
        {
            sprintf(buf2, ", and until you understand its secrets, it will function as a +%i ring.", theItem.timesEnchanted + 1);
            strcat(buf, buf2);
        } else {
						strcat(buf, ".");
        }
			}

			// equipped? cursed?
			if (theItem.flags & ITEM_EQUIPPED) {
				sprintf(buf2, "\n\nThe %s is on your finger%s. ",
						theName,
						((theItem.flags & ITEM_CURSED) ? ", and because it is cursed, you are powerless to remove it" : ""));
				strcat(buf, buf2);
			} else if (((theItem.flags & (ITEM_IDENTIFIED | ITEM_MAGIC_DETECTED)) || rogue.playbackOmniscience)
					   && (theItem.flags & ITEM_CURSED))
      {
				sprintf(buf2, "\n\n%sYou can feel a malevolent magic lurking within the %s.%s ",
                        badColorEscape,
                        theName,
                        whiteColorEscape);
				strcat(buf, buf2);
			}
			break;
  case CHARM:
      switch (theItem.kind) {
          case CHARM_HEALTH:
              sprintf(buf2, "\n\nWhen used, the charm will heal %i% of your health and recharge in %i turns. (If the charm is enchanted, it will heal %i% of your health and recharge in %i turns.)",
											fp_charmHealing(enchant),
											charmRechargeDelay(theItem.kind, theItem.enchant1),
											fp_charmHealing(enchant + FP_FACTOR),
											charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_PROTECTION:
							sprintf(buf2, "\n\nWhen used, the charm will shield you for up to 20 turns for up to %i% of your total health and recharge in %i turns. (If the charm is enchanted, it will shield up to %i% of your total health and recharge in %i turns.)",
											Math.floor(100 * fp_charmProtection(enchant) / 10 / player.info.maxHP),
											charmRechargeDelay(theItem.kind, theItem.enchant1),
											Math.floor(100 * fp_charmProtection(enchant + FP_FACTOR) / 10 / player.info.maxHP),
											charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_HASTE:
              sprintf(buf2, "\n\nWhen used, the charm will haste you for %i turns and recharge in %i turns. (If the charm is enchanted, the haste will last %i turns and it will recharge in %i turns.)",
                      charmEffectDuration(theItem.kind, theItem.enchant1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1),
                      charmEffectDuration(theItem.kind, theItem.enchant1 + 1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_FIRE_IMMUNITY:
              sprintf(buf2, "\n\nWhen used, the charm will grant you immunity to fire for %i turns and recharge in %i turns. (If the charm is enchanted, the immunity will last %i turns and it will recharge in %i turns.)",
                      charmEffectDuration(theItem.kind, theItem.enchant1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1),
                      charmEffectDuration(theItem.kind, theItem.enchant1 + 1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_INVISIBILITY:
              sprintf(buf2, "\n\nWhen used, the charm will turn you invisible for %i turns and recharge in %i turns. While invisible, monsters more than two spaces away cannot track you. (If the charm is enchanted, the invisibility will last %i turns and it will recharge in %i turns.)",
                      charmEffectDuration(theItem.kind, theItem.enchant1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1),
                      charmEffectDuration(theItem.kind, theItem.enchant1 + 1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_TELEPATHY:
              sprintf(buf2, "\n\nWhen used, the charm will grant you telepathy for %i turns and recharge in %i turns. (If the charm is enchanted, the telepathy will last %i turns and it will recharge in %i turns.)",
                      charmEffectDuration(theItem.kind, theItem.enchant1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1),
                      charmEffectDuration(theItem.kind, theItem.enchant1 + 1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_LEVITATION:
              sprintf(buf2, "\n\nWhen used, the charm will lift you off the ground for %i turns and recharge in %i turns. (If the charm is enchanted, the levitation will last %i turns and it will recharge in %i turns.)",
                      charmEffectDuration(theItem.kind, theItem.enchant1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1),
                      charmEffectDuration(theItem.kind, theItem.enchant1 + 1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_SHATTERING:
							sprintf(buf2, "\n\nWhen used, the charm will dissolve the nearby walls up to %i spaces away, and recharge in %i turns. (If the charm is enchanted, it will reach up to %i spaces and recharge in %i turns.)",
											fp_charmShattering(enchant),
											charmRechargeDelay(theItem.kind, theItem.enchant1),
											fp_charmShattering(enchant + FP_FACTOR),
											charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_GUARDIAN:
              sprintf(buf2, "\n\nWhen used, a guardian will materialize for %i turns, and the charm will recharge in %i turns. (If the charm is enchanted, the guardian will last for %i turns and the charm will recharge in %i turns.)",
											fp_charmGuardianLifespan(enchant),
											charmRechargeDelay(theItem.kind, theItem.enchant1),
											fp_charmGuardianLifespan(enchant + FP_FACTOR),
											charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_TELEPORTATION:
              sprintf(buf2, "\n\nWhen used, the charm will teleport you elsewhere in the dungeon and recharge in %i turns. (If the charm is enchanted, it will recharge in %i turns.)",
                      charmRechargeDelay(theItem.kind, theItem.enchant1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_RECHARGING:
              sprintf(buf2, "\n\nWhen used, the charm will recharge your staffs (though not your wands or charms), after which it will recharge in %i turns. (If the charm is enchanted, it will recharge in %i turns.)",
                      charmRechargeDelay(theItem.kind, theItem.enchant1),
                      charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          case CHARM_NEGATION:
              sprintf(buf2, "\n\nWhen used, the charm will negate all magical effects on the creatures in your field of view and the items on the ground up to %i spaces away, and recharge in %i turns. (If the charm is enchanted, it will reach up to %i spaces and recharge in %i turns.)",
											fp_charmNegationRadius(enchant),
											charmRechargeDelay(theItem.kind, theItem.enchant1),
											fp_charmNegationRadius(enchant + FP_FACTOR),
											charmRechargeDelay(theItem.kind, theItem.enchant1 + 1));
              break;
          default:
              break;
      }
      strcat(buf, buf2);
      break;
		default:
			break;
	}

  return buf;
}

function displayMagicCharForItem( /* item */ theItem) {
	if (!(theItem.flags & ITEM_MAGIC_DETECTED)
		|| (theItem.category & PRENAMED_CATEGORY)) {
		return false;
	}
  return true;
}

async function displayInventory(categoryMask,
					  requiredFlags,
					  forbiddenFlags,
					  waitForAcknowledge,
					  includeButtons)
{
	let theItem;		// item *
	let i, j, m, maxLength = 0, itemNumber, itemCount, equippedItemCount;
	let extraLineCount = 0;
	let itemList = []; // item *[DROWS];
	const buf = STRING(); // char[COLS*3];
	let theKey;
	let theEvent = rogueEvent();
	let magicDetected, repeatDisplay;
	let highlightItemLine, itemSpaceRemaining;
	const dbuf = GRID(COLS, ROWS, cellDisplayBuffer); // cellDisplayBuffer[COLS][ROWS];
	const rbuf = GRID(COLS, ROWS, cellDisplayBuffer); // cellDisplayBuffer[COLS][ROWS];
	const buttons = ARRAY(50, brogueButton); // brogueButton[50] = {{{0}}};
	let actionKey;
	let darkItemColor = color();

	const whiteColorEscapeSequence = STRING(),
				grayColorEscapeSequence = STRING(),
				yellowColorEscapeSequence = STRING(),
				darkYellowColorEscapeSequence = STRING(),
				goodColorEscapeSequence = STRING(),
				badColorEscapeSequence = STRING();
	let magicEscapePtr;	// char *

	// assureCosmeticRNG();

	clearCursorPath();
	clearDisplayBuffer(dbuf);

	encodeMessageColor(whiteColorEscapeSequence, 0, white);
	encodeMessageColor(grayColorEscapeSequence, 0, gray);
	encodeMessageColor(yellowColorEscapeSequence, 0, itemColor);
	darkItemColor.copy(itemColor);
	applyColorAverage(darkItemColor, black, 50);
	encodeMessageColor(darkYellowColorEscapeSequence, 0, darkItemColor);
	encodeMessageColor(goodColorEscapeSequence, 0, goodMessageColor);
	encodeMessageColor(badColorEscapeSequence, 0, badMessageColor);

	if (packItems.nextItem == NULL) {
		confirmMessages();
		message("Your pack is empty!", false);
		// restoreRNG();
		return 0;
	}

	magicDetected = false;
	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		if (displayMagicCharForItem(theItem) && (theItem.flags & ITEM_MAGIC_DETECTED)) {
			magicDetected = true;
		}
	}

	// List the items in the order we want to display them, with equipped items at the top.
	itemNumber = 0;
	equippedItemCount = 0;
	// First, the equipped weapon if any.
	if (rogue.weapon) {
		itemList[itemNumber] = rogue.weapon;
		itemNumber++;
		equippedItemCount++;
	}
	// Now, the equipped armor if any.
	if (rogue.armor) {
		itemList[itemNumber] = rogue.armor;
		itemNumber++;
		equippedItemCount++;
	}
	// Now, the equipped rings, if any.
	if (rogue.ringLeft) {
		itemList[itemNumber] = rogue.ringLeft;
		itemNumber++;
		equippedItemCount++;
	}
	if (rogue.ringRight) {
		itemList[itemNumber] = rogue.ringRight;
		itemNumber++;
		equippedItemCount++;
	}
	// Now all of the non-equipped items.
	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		if (!(theItem.flags & ITEM_EQUIPPED)) {
			itemList[itemNumber] = theItem;
			itemNumber++;
		}
	}

	// Initialize the buttons:
	for (i=0; i < max(MAX_PACK_ITEMS, ROWS); i++) {
		buttons[i].y = mapToWindowY(i + (equippedItemCount && i >= equippedItemCount ? 1 : 0));
		buttons[i].buttonColor.copy(black);
		buttons[i].opacity = INTERFACE_OPACITY;
		buttons[i].flags |= B_DRAW;
	}
	// Now prepare the buttons.
	//for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {

  const closeParen = KEYBOARD_LABELS ? ')' : ' ';
	for (i=0; i<itemNumber; i++) {
		theItem = itemList[i];
		// Set button parameters for the item:
		buttons[i].flags |= (B_DRAW | B_GRADIENT | B_ENABLED);
		if (!waitForAcknowledge) {
			buttons[i].flags |= B_KEYPRESS_HIGHLIGHT;
		}
		buttons[i].hotkey[0] = theItem.inventoryLetter;
		buttons[i].hotkey[1] = theItem.inventoryLetter.toUpperCase();

		if ((theItem.category & categoryMask) &&
			!(~(theItem.flags) & requiredFlags) &&
			!(theItem.flags & forbiddenFlags))
		{
			buttons[i].flags |= (B_HOVER_ENABLED);
		}

		// Set the text for the button:
		itemName(theItem, buf, true, true, (buttons[i].flags & B_HOVER_ENABLED) ? white : gray);
		capitalize(buf);

		if ((theItem.flags & ITEM_MAGIC_DETECTED) && !(theItem.category & AMULET)) { // Won't include food, keys, lumenstones or amulet.

			buttons[i].symbol[0] = (itemMagicChar(theItem) ? itemMagicChar(theItem) : '-');
			if (buttons[i].symbol[0] == '-') {
				magicEscapePtr = yellowColorEscapeSequence;
			} else if (buttons[i].symbol[0] == GOOD_MAGIC_CHAR) {
				magicEscapePtr = goodColorEscapeSequence;
			} else {
				magicEscapePtr = badColorEscapeSequence;
			}

			// The first '*' is the magic detection symbol, e.g. '-' for non-magical.
			// The second '*' is the item character, e.g. ':' for food.
			sprintf(buttons[i].text, " %c%c %s* %s* %s%s%s",
					KEYBOARD_LABELS ? theItem.inventoryLetter : ' ',
					(theItem.flags & ITEM_PROTECTED ? '}' : closeParen),
					magicEscapePtr,
					(buttons[i].flags & B_HOVER_ENABLED) ? yellowColorEscapeSequence : darkYellowColorEscapeSequence,
					(buttons[i].flags & B_HOVER_ENABLED) ? whiteColorEscapeSequence : grayColorEscapeSequence,
					buf,
					// grayColorEscapeSequence,
					(theItem.flags & ITEM_EQUIPPED ? ((theItem.category & WEAPON) ? " (in hand) " : " (worn) ") : ""));
			buttons[i].symbol[1] = theItem.displayChar;
		} else {
			sprintf(buttons[i].text, " %c%c %s%s* %s%s%s", // The '*' is the item character, e.g. ':' for food.
					KEYBOARD_LABELS ? theItem.inventoryLetter : ' ',
					(theItem.flags & ITEM_PROTECTED ? '}' : closeParen),
					(magicDetected ? "  " : ""), // For proper spacing when this item is not detected but another is.
					(buttons[i].flags & B_HOVER_ENABLED) ? yellowColorEscapeSequence : darkYellowColorEscapeSequence,
					(buttons[i].flags & B_HOVER_ENABLED) ? whiteColorEscapeSequence : grayColorEscapeSequence,
					buf,
					// grayColorEscapeSequence,
					(theItem.flags & ITEM_EQUIPPED ? ((theItem.category & WEAPON) ? " (in hand) " : " (worn) ") : ""));
			buttons[i].symbol[0] = theItem.displayChar;
		}

		// Keep track of the maximum width needed:
		maxLength = max(maxLength, strLenWithoutEscapes(buttons[i].text));

        //		itemList[itemNumber] = theItem;
        //
        //		itemNumber++;
	}
	//printf("\nMaxlength: %i", maxLength);
	itemCount = itemNumber;
	if (!itemNumber) {
		confirmMessages();
		message("Nothing of that type!", false);
		// restoreRNG();
		return 0;
	}
	if (waitForAcknowledge) {
		// Add the two extra lines as disabled buttons.
		itemSpaceRemaining = MAX_PACK_ITEMS - numberOfItemsInPack();
		if (itemSpaceRemaining) {
			sprintf(buttons[itemNumber + extraLineCount].text, "%s%s    You have room for %i more item%s.",
					grayColorEscapeSequence,
					(magicDetected ? "  " : ""),
					itemSpaceRemaining,
					(itemSpaceRemaining == 1 ? "" : "s"));
		} else {
			sprintf(buttons[itemNumber + extraLineCount].text, "%s%s    Your pack is full.",
					grayColorEscapeSequence,
					(magicDetected ? "  " : ""));
		}
		maxLength = max(maxLength, (strLenWithoutEscapes(buttons[itemNumber + extraLineCount].text)));
		extraLineCount++;

		sprintf(buttons[itemNumber + extraLineCount].text, KEYBOARD_LABELS ? "%s%s -- press (a-z) for more info -- " : "%s%s -- touch an item for more info -- ",
				grayColorEscapeSequence,
				(magicDetected ? "  " : ""));
		maxLength = max(maxLength, (strLenWithoutEscapes(buttons[itemNumber + extraLineCount].text)));
		extraLineCount++;
	}
	if (equippedItemCount) {
		// Add a separator button to fill in the blank line between equipped and unequipped items.
		sprintf(buttons[itemNumber + extraLineCount].text, "      %s%s---",
				(magicDetected ? "  " : ""),
				grayColorEscapeSequence);
		buttons[itemNumber + extraLineCount].y = mapToWindowY(equippedItemCount);
		extraLineCount++;
	}

	for (i=0; i < itemNumber + extraLineCount; i++) {

		// Position the button.
		buttons[i].x = COLS - maxLength;

		// Pad the button label with space, so the button reaches to the right edge of the screen.
		m = strlen(buttons[i].text);
		for (j=buttons[i].x + strLenWithoutEscapes(buttons[i].text); j < COLS; j++) {
			buttons[i].text.append(' ');
		}

		// Display the button. This would be redundant with the button loop,
		// except that we want the display to stick around until we get rid of it.
		drawButton(buttons[i], BUTTON_NORMAL, dbuf);
	}

	// Add invisible previous and next buttons, so up and down arrows can select items.
	// Previous
	buttons[itemNumber + extraLineCount + 0].flags = B_ENABLED; // clear everything else
	buttons[itemNumber + extraLineCount + 0].hotkey[0] = NUMPAD_8;
	buttons[itemNumber + extraLineCount + 0].hotkey[1] = UP_ARROW;
	// Next
	buttons[itemNumber + extraLineCount + 1].flags = B_ENABLED; // clear everything else
	buttons[itemNumber + extraLineCount + 1].hotkey[0] = NUMPAD_2;
	buttons[itemNumber + extraLineCount + 1].hotkey[1] = DOWN_ARROW;

	overlayDisplayBuffer(dbuf, rbuf);

	do {
		repeatDisplay = false;

		// Do the button loop.
		highlightItemLine = -1;
		overlayDisplayBuffer(rbuf, NULL);	// Remove the inventory display while the buttons are active,
											// since they look the same and we don't want their opacities to stack.

		highlightItemLine = await buttonInputLoop(buttons,
											itemCount + extraLineCount + 2, // the 2 is for up/down hotkeys
											COLS - maxLength,
											mapToWindowY(0),
											maxLength,
											itemNumber + extraLineCount,
											theEvent);
		if (highlightItemLine == itemNumber + extraLineCount + 0) {
			// Up key
			highlightItemLine = itemNumber - 1;
			theEvent.shiftKey = true;
		} else if (highlightItemLine == itemNumber + extraLineCount + 1) {
			// Down key
			highlightItemLine = 0;
			theEvent.shiftKey = true;
		}

		if (highlightItemLine >= 0) {
			theKey = itemList[highlightItemLine].inventoryLetter;
			theItem = itemList[highlightItemLine];
		} else {
			theKey = ESCAPE_KEY;
		}

		// Was an item selected?
		if (highlightItemLine > -1 && (waitForAcknowledge || theEvent.shiftKey || theEvent.controlKey)) {

			do {
				// Yes. Highlight the selected item. Do this by changing the button color and re-displaying it.
				overlayDisplayBuffer(dbuf, NULL);

				//buttons[highlightItemLine].buttonColor = interfaceBoxColor;
				drawButton(buttons[highlightItemLine], BUTTON_PRESSED, NULL);
				//buttons[highlightItemLine].buttonColor = black;

				if (theEvent.shiftKey || theEvent.controlKey || waitForAcknowledge) {
					// Display an information window about the item.
					actionKey = await printCarriedItemDetails(theItem, max(2, mapToWindowX(DCOLS - maxLength - 42)), mapToWindowY(2), 40, includeButtons, NULL);

					overlayDisplayBuffer(rbuf, NULL); // remove the item info window

					if (actionKey == -1) {
						repeatDisplay = true;
						overlayDisplayBuffer(dbuf, NULL); // redisplay the inventory
					} else {
						// restoreRNG();
						repeatDisplay = false;
						overlayDisplayBuffer(rbuf, NULL); // restore the original screen
					}

					switch (actionKey) {
						case APPLY_KEY:
							await apply(theItem, true);
							break;
						case EQUIP_KEY:
							await equip(theItem);
							break;
						case UNEQUIP_KEY:
							await unequip(theItem);
							break;
						case DROP_KEY:
							await drop(theItem);
							break;
						case THROW_KEY:
							await throwCommand(theItem);
							break;
						case RELABEL_KEY:
							await relabel(theItem);
							break;
						case CALL_KEY:
							await call(theItem);
							break;
						case UP_KEY:
							highlightItemLine = highlightItemLine - 1;
							if (highlightItemLine < 0) {
								highlightItemLine = itemNumber - 1;
							}
							break;
						case DOWN_KEY:
							highlightItemLine = highlightItemLine + 1;
							if (highlightItemLine >= itemNumber) {
								highlightItemLine = 0;
							}
							break;
						default:
							break;
					}

					if (actionKey == UP_KEY || actionKey == DOWN_KEY) {
						theKey = itemList[highlightItemLine].inventoryLetter;
						theItem = itemList[highlightItemLine];
					} else if (actionKey != -1) {	// cannot use > -1 b/c we have a string
						// Player took an action directly from the item screen; we're done here.
						// restoreRNG();
						return 0;
					}
				}
			} while (actionKey == UP_KEY || actionKey == DOWN_KEY);
		}
	} while (repeatDisplay); // so you can get info on multiple items sequentially

	overlayDisplayBuffer(rbuf, NULL); // restore the original screen

	// restoreRNG();
	return theKey;
}


function numberOfMatchingPackItems( categoryMask, requiredFlags,  forbiddenFlags, displayErrors) {
	let theItem;		// item *
	let matchingItemCount = 0;

	if (packItems.nextItem == NULL) {
		if (displayErrors) {
			confirmMessages();
			message("Your pack is empty!", false);
		}
		return 0;
	}

	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {

		if (theItem.category & categoryMask &&
			!(~(theItem.flags) & requiredFlags) &&
			!(theItem.flags & forbiddenFlags))
		{
			matchingItemCount++;
		}
	}

	if (matchingItemCount == 0) {
		if (displayErrors) {
			confirmMessages();
			message("You have nothing suitable.", false);
		}
		return 0;
	}

	return matchingItemCount;
}

function updateEncumbrance() {
	let moveSpeed, attackSpeed;

	moveSpeed = player.info.movementSpeed;
	attackSpeed = player.info.attackSpeed;

	if (player.status[STATUS_HASTED]) {
		moveSpeed = Math.floor(moveSpeed/2);
		attackSpeed = Math.floor(attackSpeed/2);
	} else if (player.status[STATUS_SLOWED]) {
		moveSpeed *= 2;
		attackSpeed *= 2;
	}

	player.movementSpeed = moveSpeed;
	player.attackSpeed = attackSpeed;

	recalculateEquipmentBonuses();
}

function displayedArmorValue() {
    if (!rogue.armor || (rogue.armor.flags & ITEM_IDENTIFIED)) {
        return Math.floor(player.info.defense / 10);
    } else {
			return Math.floor(((armorTable[rogue.armor.kind].range.upperBound + armorTable[rogue.armor.kind].range.lowerBound << FP_BASE) / 2 / 10
											 + fp_strengthModifier(rogue.armor)) >> FP_BASE);
    }
}

function strengthCheck( /* item */ theItem) {
	const buf1 = STRING(), buf2 = STRING(); // char[COLS*2];
	let strengthDeficiency;

	updateEncumbrance();
	if (theItem) {
		if (theItem.category & WEAPON && theItem.strengthRequired > rogue.strength - player.weaknessAmount) {
			strengthDeficiency = theItem.strengthRequired - max(0, rogue.strength - player.weaknessAmount);
			strcpy(buf1, "");
			itemName(theItem, buf1, false, false, NULL);
			sprintf(buf2, "You can barely lift the %s; %i more strength would be ideal.", buf1, strengthDeficiency);
			message(buf2, false);
		}

		if (theItem.category & ARMOR && theItem.strengthRequired > rogue.strength - player.weaknessAmount) {
			strengthDeficiency = theItem.strengthRequired - max(0, rogue.strength - player.weaknessAmount);
			strcpy(buf1, "");
			itemName(theItem, buf1, false, false, NULL);
			sprintf(buf2, "You stagger under the weight of the %s; %i more strength would be ideal.",
					buf1, strengthDeficiency);
			message(buf2, false);
		}
	}
}

function canEquip(/* item */ theItem) {
	let previouslyEquippedItem = NULL;	// item *

	if (theItem.category & WEAPON) {
		previouslyEquippedItem = rogue.weapon;
	} else if (theItem.category & ARMOR) {
		previouslyEquippedItem = rogue.armor;
	}
	if (previouslyEquippedItem && (previouslyEquippedItem.flags & ITEM_CURSED)) {
		return false; // already using a cursed item
	}

	if ((theItem.category & RING) && rogue.ringLeft && rogue.ringRight) {
		return false;
	}
	return true;
}

// Will prompt for an item if none is given.
// Equips the item and records input if successful.
// Player's failure to select an item will result in failure.
// Failure does not record input.
async function equip( /* item */ theItem) {
	const buf1 = STRING(), buf2 = STRING();
	const command = []; // cahr[10];
	let c = 0;
	let theItem2;	// item *

	command[c++] = EQUIP_KEY;
	if (!theItem) {
		theItem = await promptForItemOfType((WEAPON|ARMOR|RING), 0, ITEM_EQUIPPED,
                                      KEYBOARD_LABELS ? "Equip what? (a-z, shift for more info; or <esc> to cancel)" : "Equip what?", true);
	}
	if (theItem == NULL) {
		return;
	}

	command[c++] = theItem.inventoryLetter;

	if (theItem.category & (WEAPON|ARMOR|RING)) {

		if (theItem.category & RING) {
			if (theItem.flags & ITEM_EQUIPPED) {
				confirmMessages();
				message("you are already wearing that ring.", false);
				return;
			} else if (rogue.ringLeft && rogue.ringRight) {
				confirmMessages();
				theItem2 = await promptForItemOfType((RING), ITEM_EQUIPPED, 0,
											   "You are already wearing two rings; remove which first?", true);
				if (!theItem2 || theItem2.category != RING || !(theItem2.flags & ITEM_EQUIPPED)) {
					if (theItem2) { // No message if canceled or did an inventory action instead.
						message("Invalid entry.", false);
					}
					return;
				} else {
					if (theItem2.flags & ITEM_CURSED) {
						itemName(theItem2, buf1, false, false, NULL);
						sprintf(buf2, "You can't remove your %s: it appears to be cursed.", buf1);
						confirmMessages();
						message(buf2, itemMessageColor, false);
						return;
					}
					unequipItem(theItem2, false);
					command[c++] = theItem2.inventoryLetter;
				}
			}
		}

		if (theItem.flags & ITEM_EQUIPPED) {
			confirmMessages();
			message("already equipped.", false);
			return;
		}

		if (!canEquip(theItem)) {
			// equip failed because current item is cursed
			if (theItem.category & WEAPON) {
				itemName(rogue.weapon, buf1, false, false, NULL);
			} else if (theItem.category & ARMOR) {
				itemName(rogue.armor, buf1, false, false, NULL);
			} else {
				sprintf(buf1, "one");
			}
			sprintf(buf2, "You can't; the %s you are using appears to be cursed.", buf1);
			confirmMessages();
			message(buf2, itemMessageColor, false);
			return;
		}
		command[c] = null;
		recordKeystrokeSequence(command);

		equipItem(theItem, false);

		itemName(theItem, buf2, true, true, NULL);
		sprintf(buf1, "Now %s %s.", (theItem.category & WEAPON ? "wielding" : "wearing"), buf2);
		confirmMessages();
		message(buf1, itemMessageColor, false);

		strengthCheck(theItem);

		if (theItem.flags & ITEM_CURSED) {
			itemName(theItem, buf2, false, false, NULL);
			switch(theItem.category) {
				case WEAPON:
					sprintf(buf1, "you wince as your grip involuntarily tightens around your %s.", buf2);
					break;
				case ARMOR:
					sprintf(buf1, "your %s constricts around you painfully.", buf2);
					break;
				case RING:
					sprintf(buf1, "your %s tightens around your finger painfully.", buf2);
					break;
				default:
					sprintf(buf1, "your %s seizes you with a malevolent force.", buf2);
					break;
			}
			message(buf1, itemMessageColor, false);
		}
		await playerTurnEnded();
	} else {
		confirmMessages();
		message("You can't equip that.", false);
	}
}


// Returns whether the given item is a key that can unlock the given location.
// An item qualifies if:
// (1) it's a key (has ITEM_IS_KEY flag),
// (2) its originDepth matches the depth, and
// (3) either its key (x, y) location matches (x, y), or its machine number matches the machine number at (x, y).
function keyMatchesLocation( /* item */ theItem, x, y) {
	let i;

	if ((theItem.flags & ITEM_IS_KEY)
		&& theItem.originDepth == rogue.depthLevel)
	{
		for (i=0; i < KEY_ID_MAXIMUM && (theItem.keyLoc[i].x || theItem.keyLoc[i].machine); i++) {
			if (theItem.keyLoc[i].x == x && theItem.keyLoc[i].y == y) {
				return true;
			} else if (theItem.keyLoc[i].machine == pmap[x][y].machineNumber) {
				return true;
			}
		}
	}
	return false;
}


function keyInPackFor(x, y) {
	let theItem;		// item *

	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		if (keyMatchesLocation(theItem, x, y)) {
			return theItem;
		}
	}
	return NULL;
}

function keyOnTileAt(x, y) {
	let theItem;		// item *
	let monst;			// creature *

	if ((pmap[x][y].flags & HAS_PLAYER)
		&& player.xLoc == x
		&& player.yLoc == y
		&& keyInPackFor(x, y))
	{
		return keyInPackFor(x, y);
	}
	if (pmap[x][y].flags & HAS_ITEM) {
		theItem = itemAtLoc(x, y);
		if (keyMatchesLocation(theItem, x, y)) {
			return theItem;
		}
	}
	if (pmap[x][y].flags & HAS_MONSTER) {
		monst = monsterAtLoc(x, y);
		if (monst.carriedItem) {
			theItem = monst.carriedItem;
			if (keyMatchesLocation(theItem, x, y)) {
				return theItem;
			}
		}
	}
	return NULL;
}

// Aggroes out to the given distance.
async function aggravateMonsters(distance, x, y, /* color */ flashColor) {
	let monst;	// creature *
	let i, j, grid;

  rogue.wpCoordinates[0][0] = x;
  rogue.wpCoordinates[0][1] = y;
  refreshWaypoint(0);

	grid = allocGrid();
	fillGrid(grid, 0);
	calculateDistances(grid, x, y, T_PATHING_BLOCKER, NULL, true, false);

	for (monst=monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
    if (grid[monst.xLoc][monst.yLoc] <= distance) {
      if (monst.creatureState == MONSTER_SLEEPING) {
        wakeUp(monst);
      }
      if (monst.creatureState != MONSTER_ALLY && monst.leader !== player) {
        alertMonster(monst);
				monst.info.flags &= ~MONST_MAINTAINS_DISTANCE;
				monst.info.abilityFlags &= ~MA_AVOID_CORRIDORS;
      }
    }
	}
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (grid[i][j] >= 0 && grid[i][j] <= distance) {
				scentMap[i][j] = 0;
				addScentToCell(i, j, 2 * grid[i][j]);
			}
		}
	}
	freeGrid(grid);

  if (player.xLoc == x && player.yLoc == y) {
    player.status[STATUS_AGGRAVATING] = player.maxStatus[STATUS_AGGRAVATING] = distance;
    rogue.aggroRange = currentAggroValue();
  }

  if (grid[player.xLoc][player.yLoc] >= 0 && grid[player.xLoc][player.yLoc] <= distance) {
      await discover(x, y);
      discoverCell(x, y);
      await colorFlash(flashColor, 0, (DISCOVERED | MAGIC_MAPPED), 10, distance, x, y);
      if (!playerCanSee(x, y)) {
          message("You hear a piercing shriek; something must have triggered a nearby alarm.", false);
      }
  }
}

// Simple line algorithm (maybe this is Bresenham?) that returns a list of coordinates
// that extends all the way to the edge of the map based on an originLoc (which is not included
// in the list of coordinates) and a targetLoc.
// Returns the number of entries in the list, and includes (-1, -1) as an additional
// terminus indicator after the end of the list.
function getLineCoordinates( listOfCoordinates /* short[][2] */, originLoc /* short[2] */, targetLoc /* short[2] */) {
	let targetVector = [], error = [], currentVector = [], previousVector = [], quadrantTransform = [];
	let largerTargetComponent, i;
	let currentLoc = [], previousLoc = [];
	let cellNumber = 0;

	if (originLoc[0] == targetLoc[0] && originLoc[1] == targetLoc[1]) {
		return 0;
	}

	// Neither vector is negative. We keep track of negatives with quadrantTransform.
	for (i=0; i<= 1; i++) {
		targetVector[i] = targetLoc[i] - originLoc[i] << FP_BASE;	// FIXME: should use parens?
		if (targetVector[i] < 0) {
			targetVector[i] *= -1;
			quadrantTransform[i] = -1;
		} else {
			quadrantTransform[i] = 1;
		}
		currentVector[i] = previousVector[i] = error[i] = 0;
		currentLoc[i] = originLoc[i];
	}

	// normalize target vector such that one dimension equals 1 and the other is in [0, 1].
	largerTargetComponent = max(targetVector[0], targetVector[1]);
	// targetVector[0] = Math.floor( (targetVector[0] << FP_BASE) / largerTargetComponent);
	// targetVector[1] = Math.floor( (targetVector[1] << FP_BASE) / largerTargetComponent);
	targetVector[0] = Math.floor(targetVector[0] * FP_FACTOR / largerTargetComponent);
	targetVector[1] = Math.floor(targetVector[1] * FP_FACTOR / largerTargetComponent);

	do {
		for (i=0; i<= 1; i++) {

			previousLoc[i] = currentLoc[i];

			currentVector[i] += targetVector[i] >> FP_BASE;
			error[i] += (targetVector[i] == FP_FACTOR ? 0 : targetVector[i]);

			if (error[i] >= Math.floor(FP_FACTOR / 2) ) {
				currentVector[i]++;
				error[i] -= FP_FACTOR;
			}

			currentLoc[i] = Math.floor(quadrantTransform[i]*currentVector[i] + originLoc[i]);

			listOfCoordinates[cellNumber][i] = currentLoc[i];
		}

		//DEBUG printf("\ncell %i: (%i, %i)", cellNumber, listOfCoordinates[cellNumber][0], listOfCoordinates[cellNumber][1]);
		cellNumber++;

	} while (coordinatesAreInMap(currentLoc[0], currentLoc[1]));

	cellNumber--;

	listOfCoordinates[cellNumber][0] = listOfCoordinates[cellNumber][1] = -1; // demarcates the end of the list
	return cellNumber;
}

// If a hypothetical bolt were launched from originLoc toward targetLoc,
// with a given max distance and a toggle as to whether it halts at its impact location
// or one space prior, where would it stop?
// Takes into account the caster's knowledge; i.e. won't be blocked by monsters
// that the caster is not aware of.
function getImpactLoc(returnLoc /* short[2] */, originLoc /* short[2] */, targetLoc /* short[2] */,
				  maxDistance, returnLastEmptySpace)
{
  let coords = ARRAY(DCOLS + 1, () => [-1, -1] ); /// short[DCOLS + 1][2];
  let i, n;
	let monst;	// creature *

  n = getLineCoordinates(coords, originLoc, targetLoc);
  n = min(n, maxDistance);
	for (i=0; i<n; i++) {
    monst = monsterAtLoc(coords[i][0], coords[i][1]);
    if (monst
        && !monsterIsHidden(monst, monsterAtLoc(originLoc[0], originLoc[1]))
        && !(monst.bookkeepingFlags & MB_SUBMERGED))
		{
        // Imaginary bolt hit the player or a monster.
        break;
    }
		if (cellHasTerrainFlag(coords[i][0], coords[i][1], (T_OBSTRUCTS_VISION | T_OBSTRUCTS_PASSABILITY))) {
        break;
    }
	}
  if (i == maxDistance) {
      returnLoc[0] = coords[i-1][0];
      returnLoc[1] = coords[i-1][1];
  } else if (returnLastEmptySpace) {
      if (i == 0) {
          returnLoc[0] = originLoc[0];
          returnLoc[1] = originLoc[1];
      } else {
          returnLoc[0] = coords[i-1][0];
          returnLoc[1] = coords[i-1][1];
      }
	} else {
		returnLoc[0] = coords[i][0];
		returnLoc[1] = coords[i][1];
	}
  brogueAssert(coordinatesAreInMap(returnLoc[0], returnLoc[1]));

	return returnLoc;
}

// Returns true if the two coordinates are unobstructed and diagonally adjacent,
// but their two common neighbors are obstructed and at least one blocks diagonal movement.
function impermissibleKinkBetween(x1, y1, x2, y2) {
    brogueAssert(coordinatesAreInMap(x1, y1));
    brogueAssert(coordinatesAreInMap(x2, y2));
    if (cellHasTerrainFlag(x1, y1, T_OBSTRUCTS_PASSABILITY)
        || cellHasTerrainFlag(x2, y2, T_OBSTRUCTS_PASSABILITY))
		{
        // One of the two locations is obstructed.
        return false;
    }
    if (abs(x1 - x2) != 1 || abs(y1 - y2) != 1) {
        // Not diagonally adjacent.
        return false;
    }
    if (!cellHasTerrainFlag(x2, y1, T_OBSTRUCTS_PASSABILITY)
        || !cellHasTerrainFlag(x1, y2, T_OBSTRUCTS_PASSABILITY))
		{
        // At least one of the common neighbors isn't obstructed.
        return false;
    }
    if (!cellHasTerrainFlag(x2, y1, T_OBSTRUCTS_DIAGONAL_MOVEMENT)
        && !cellHasTerrainFlag(x1, y2, T_OBSTRUCTS_DIAGONAL_MOVEMENT))
		{
        // Neither of the common neighbors obstructs diagonal movement.
        return false;
    }
    return true;
}


async function tunnelize(x, y) {
	let layer;		// enum dungeonLayers
	let didSomething = false;
	let monst;		// creature *
  let x2, y2;
  let dir;			// enum directions

	if (pmap[x][y].flags & IMPREGNABLE) {
		return false;
	}

	await freeCaptivesEmbeddedAt(x, y);

  if (x == 0 || x == DCOLS - 1 || y == 0 || y == DROWS - 1) {
      pmap[x][y].layers[DUNGEON] = CRYSTAL_WALL; // don't dissolve the boundary walls
      didSomething = true;
  } else {
      for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
          if (tileCatalog[pmap[x][y].layers[layer]].flags & (T_OBSTRUCTS_PASSABILITY | T_OBSTRUCTS_VISION)) {
              pmap[x][y].layers[layer] = (layer == DUNGEON ? FLOOR : NOTHING);
              didSomething = true;
          }
      }
  }
  if (didSomething) {
      await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_TUNNELIZE], true, false);
      if (pmap[x][y].flags & HAS_MONSTER) {
          // Kill turrets and sentinels if you tunnelize them.
          monst = monsterAtLoc(x, y);
          if (monst.info.flags & MONST_ATTACKABLE_THRU_WALLS) {
              await inflictLethalDamage(NULL, monst);
          }
      }
  }
  if (!cellHasTerrainFlag(x, y, T_OBSTRUCTS_DIAGONAL_MOVEMENT)
      && didSomething)
	{
      // Tunnel out any diagonal kinks between walls.
      for (dir = 0; dir < DIRECTION_COUNT; dir++) {
          x2 = x + nbDirs[dir][0];
          y2 = y + nbDirs[dir][1];
          if (coordinatesAreInMap(x2, y2) && impermissibleKinkBetween(x, y, x2, y2))
					{
              if ((pmap[x][y2].flags & IMPREGNABLE)
                  || (!(pmap[x2][y].flags & IMPREGNABLE) && rand_percent(50)))
							{
                  await tunnelize(x2, y);
              } else {
                  await tunnelize(x, y2);
              }
          }
      }
  }
	return didSomething;
}


async function negate( /* creature */ monst) {
    let i, j;
    let backupBolts = []; // boltType[20];
    monst.info.abilityFlags &= MA_NON_NEGATABLE_ABILITIES; // negated monsters lose all special abilities
    monst.bookkeepingFlags &= ~MB_SEIZING;

	if (monst.info.flags & MONST_DIES_IF_NEGATED) {
		let buf, monstName; // char [DCOLS];
		monsterName(monstName, monst, true);
		if (monst.status[STATUS_LEVITATING]) {
			sprintf(buf, "%s dissipates into thin air", monstName);
		} else if (monst.info.flags & MONST_INANIMATE) {
            sprintf(buf, "%s shatters into tiny pieces", monstName);
        } else {
			sprintf(buf, "%s falls to the ground, lifeless", monstName);
		}
		await killCreature(monst, false);
		combatMessage(buf, messageColorFromVictim(monst));
	} else if (!(monst.info.flags & MONST_INVULNERABLE)) {
		// works on inanimates
		monst.status[STATUS_IMMUNE_TO_FIRE] = 0;
		monst.status[STATUS_SLOWED] = 0;
		monst.status[STATUS_HASTED] = 0;
		monst.status[STATUS_CONFUSED] = 0;
		monst.status[STATUS_ENTRANCED] = 0;
		monst.status[STATUS_DISCORDANT] = 0;
		monst.status[STATUS_SHIELDED] = 0;
		monst.status[STATUS_INVISIBLE] = 0;
		if (monst === player) {
			monst.status[STATUS_TELEPATHIC] = min(monst.status[STATUS_TELEPATHIC], 1);
			monst.status[STATUS_MAGICAL_FEAR] = min(monst.status[STATUS_MAGICAL_FEAR], 1);
			monst.status[STATUS_LEVITATING] = min(monst.status[STATUS_LEVITATING], 1);
			if (monst.status[STATUS_DARKNESS]) {
				monst.status[STATUS_DARKNESS] = 0;
				updateMinersLightRadius();
				updateVision(true);
			}
		} else {
			monst.status[STATUS_TELEPATHIC] = 0;
			monst.status[STATUS_MAGICAL_FEAR] = 0;
			monst.status[STATUS_LEVITATING] = 0;
		}
		monst.info.flags &= ~MONST_IMMUNE_TO_FIRE;
		monst.movementSpeed = monst.info.movementSpeed;
		monst.attackSpeed = monst.info.attackSpeed;
		if (monst !== player && (monst.info.flags & NEGATABLE_TRAITS)) {
			if ((monst.info.flags & MONST_FIERY) && monst.status[STATUS_BURNING]) {
				extinguishFireOnCreature(monst);
			}
			monst.info.flags &= ~NEGATABLE_TRAITS;
			refreshDungeonCell(monst.xLoc, monst.yLoc);
			refreshSideBar(-1, -1, false);
		}
    for (i = 0; i < 20; i++) {
        backupBolts[i] = monst.info.bolts[i];
        monst.info.bolts[i] = BOLT_NONE;
    }
    for (i = 0, j = 0; i < 20 && backupBolts[i]; i++) {
        if (boltCatalog[backupBolts[i]].flags & BF_NOT_NEGATABLE) {
            monst.info.bolts[j] = backupBolts[i];
            j++;
        }
    }
    monst.newPowerCount = monst.totalPowerCount; // Allies can re-learn lost ability slots.
		await applyInstantTileEffectsToCreature(monst); // in case it should immediately die or fall into a chasm
	}
}

// function monsterAccuracyAdjusted( /* creature */ monst) {
//     let retval = Math.floor(monst.info.accuracy * (pow(WEAPON_ENCHANT_ACCURACY_FACTOR, -2.5 * monst.weaknessAmount) + FLOAT_FUDGE));
//     return max(retval, 0);
// }
//
// function monsterDamageAdjustmentAmount( /* creature */ monst) {
//     if (monst === player) {
//         // Handled through player strength routines elsewhere.
//         return Math.floor(1.0 + FLOAT_FUDGE);
//     } else {
//         return Math.floor(pow(WEAPON_ENCHANT_DAMAGE_FACTOR, -2.5 * monst.weaknessAmount) + FLOAT_FUDGE);
//     }
// }
//
// function monsterDefenseAdjusted(/* creature */ monst) {
//     let retval;
//     if (monst === player) {
//         // Weakness is already taken into account in recalculateEquipmentBonuses() for the player.
//         retval = monst.info.defense;
//     } else {
//         retval = Math.floor(monst.info.defense - 25 * monst.weaknessAmount);
//     }
//     return max(retval, 0);
// }

// Adds one to the creature's weakness, sets the weakness status duration to maxDuration.
function weaken(/* creature */ monst, maxDuration) {
    if (monst.weaknessAmount < 10) {
        monst.weaknessAmount++;
    }
	monst.status[STATUS_WEAKENED] = max(monst.status[STATUS_WEAKENED], maxDuration);
	monst.maxStatus[STATUS_WEAKENED] = max(monst.maxStatus[STATUS_WEAKENED], maxDuration);
	if (monst === player) {
    message("your muscles weaken as an enervating toxin fills your veins.", badMessageColor, false);
		strengthCheck(rogue.weapon);
		strengthCheck(rogue.armor);
	}
}

// True if the creature polymorphed; false if not.
function polymorph( /* creature */ monst) {
	let previousDamageTaken, healthFraction, newMonsterIndex;

	if (monst === player || (monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
		return false; // Sorry, this is not Nethack.
	}

  if (monst.creatureState == MONSTER_FLEEING
      && (monst.info.flags & (MONST_MAINTAINS_DISTANCE | MONST_FLEES_NEAR_DEATH)) || (monst.info.abilityFlags & MA_HIT_STEAL_FLEE))
	{
      monst.creatureState = MONSTER_TRACKING_SCENT;
      monst.creatureMode = MODE_NORMAL;
  }

	unAlly(monst); // Sorry, no cheap dragon allies.
  monst.mutationIndex = -1; // Polymorph cures mutation -- basic science.
	healthFraction = Math.floor(monst.currentHP * 1000 / monst.info.maxHP);
	previousDamageTaken = monst.info.maxHP - monst.currentHP;

	do {
        newMonsterIndex = rand_range(1, NUMBER_MONSTER_KINDS - 1);
	} while (monsterCatalog[newMonsterIndex].flags & (MONST_INANIMATE | MONST_NO_POLYMORPH) // Can't turn something into an inanimate object or lich/phoenix/warden.
             || newMonsterIndex == monst.info.monsterID); // Can't stay the same monster.

  monst.info = monsterCatalog[newMonsterIndex]; // Presto change-o!

  monst.info.turnsBetweenRegen *= 1000;
	monst.currentHP = max(1, max( Math.floor(healthFraction * monst.info.maxHP / 1000), monst.info.maxHP - previousDamageTaken));

	monst.movementSpeed = monst.info.movementSpeed;
	monst.attackSpeed = monst.info.attackSpeed;
	if (monst.status[STATUS_HASTED]) {
		monst.movementSpeed = Math.floor(monst.movementSpeed / 2);
		monst.attackSpeed = Math.floor(monst.attackSpeed / 2);
	}
	if (monst.status[STATUS_SLOWED]) {
		monst.movementSpeed *= 2;
		monst.attackSpeed *= 2;
	}

	clearStatus(monst);

	if (monst.info.flags & MONST_FIERY) {
		monst.status[STATUS_BURNING] = monst.maxStatus[STATUS_BURNING] = 1000; // won't decrease
	}
	if (monst.info.flags & MONST_FLIES) {
		monst.status[STATUS_LEVITATING] = monst.maxStatus[STATUS_LEVITATING] = 1000; // won't decrease
	}
	if (monst.info.flags & MONST_IMMUNE_TO_FIRE) {
		monst.status[STATUS_IMMUNE_TO_FIRE] = monst.maxStatus[STATUS_IMMUNE_TO_FIRE] = 1000; // won't decrease
	}
	if (monst.info.flags & MONST_INVISIBLE) {
		monst.status[STATUS_INVISIBLE] = monst.maxStatus[STATUS_INVISIBLE] = 1000; // won't decrease
	}
	monst.status[STATUS_NUTRITION] = monst.maxStatus[STATUS_NUTRITION] = 1000;

	if (monst.bookkeepingFlags & MB_CAPTIVE) {
		demoteMonsterFromLeadership(monst);
		monst.creatureState = MONSTER_TRACKING_SCENT;
		monst.bookkeepingFlags &= ~MB_CAPTIVE;
	}
  monst.bookkeepingFlags &= ~(MB_SEIZING | MB_SEIZED);

	monst.ticksUntilTurn = max(monst.ticksUntilTurn, 101);

	refreshDungeonCell(monst.xLoc, monst.yLoc);
  if (boltCatalog[BOLT_POLYMORPH].backColor) {
      flashMonster(monst, boltCatalog[BOLT_POLYMORPH].backColor, 100);
  }
	return true;
}


function slow( /* creature */ monst, turns) {
	if (!(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
		monst.status[STATUS_SLOWED] = monst.maxStatus[STATUS_SLOWED] = turns;
		monst.status[STATUS_HASTED] = 0;
		if (monst === player) {
			updateEncumbrance();
			message("you feel yourself slow down.", false);
		} else {
			monst.movementSpeed = monst.info.movementSpeed * 2;
			monst.attackSpeed = monst.info.attackSpeed * 2;
		}
	}
}

function haste( /* creature */ monst, turns) {
	if (monst && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
		monst.status[STATUS_SLOWED] = 0;
		monst.status[STATUS_HASTED] = monst.maxStatus[STATUS_HASTED] = turns;
		if (monst === player) {
			updateEncumbrance();
			message("you feel yourself speed up.", false);
		} else {
			monst.movementSpeed = Math.floor(monst.info.movementSpeed / 2);
			monst.attackSpeed = Math.floor(monst.info.attackSpeed / 2);
		}
	}
}

function heal( /* creature */ monst, percent, panacea) {
	const buf = STRING(), monstName = STRING(); // char[COLS];
	monst.currentHP = min(monst.info.maxHP, monst.currentHP + Math.floor(percent * monst.info.maxHP / 100));
  if (panacea) {
      if (monst.status[STATUS_HALLUCINATING] > 1) {
          monst.status[STATUS_HALLUCINATING] = 1;
      }
      if (monst.status[STATUS_CONFUSED] > 1) {
          monst.status[STATUS_CONFUSED] = 1;
      }
      if (monst.status[STATUS_NAUSEOUS] > 1) {
          monst.status[STATUS_NAUSEOUS] = 1;
      }
      if (monst.status[STATUS_SLOWED] > 1) {
          monst.status[STATUS_SLOWED] = 1;
      }
      if (monst.status[STATUS_WEAKENED] > 1) {
          monst.weaknessAmount = 0;
          monst.status[STATUS_WEAKENED] = 0;
          updateEncumbrance();
      }
      if (monst.status[STATUS_POISONED]) {
          monst.poisonAmount = 0;
          monst.status[STATUS_POISONED] = 0;
      }
      if (monst.status[STATUS_DARKNESS] > 0) {
          monst.status[STATUS_DARKNESS] = 0;
          if (monst === player) {
              updateMinersLightRadius();
              updateVision(true);
          }
      }
  }
	if (canDirectlySeeMonster(monst)
        && monst !== player
        && !panacea)
	{
		monsterName(monstName, monst, true);
		sprintf(buf, "%s looks healthier", monstName);
		combatMessage(buf, NULL);
	}
}

function makePlayerTelepathic(duration) {
    let monst;	// creature *

    player.status[STATUS_TELEPATHIC] = player.maxStatus[STATUS_TELEPATHIC] = duration;
    for (monst=monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
        refreshDungeonCell(monst.xLoc, monst.yLoc);
    }
    if (monsters.nextCreature == NULL) {
        message("you can somehow tell that you are alone on this depth at the moment.", false);
    } else {
        message("you can somehow feel the presence of other creatures' minds!", false);
    }
}

function rechargeItems( categories) {
  let tempItem;	// item *
  let x, y, z, i, categoryCount;
  const buf = STRING(); // char[DCOLS * 3];

  x = y = z = 0; // x counts staffs, y counts wands, z counts charms
  for (tempItem = packItems.nextItem; tempItem != NULL; tempItem = tempItem.nextItem) {
      if (tempItem.category & categories & STAFF) {
          x++;
          tempItem.charges = tempItem.enchant1;
          tempItem.enchant2 = Math.floor((tempItem.kind == STAFF_BLINKING || tempItem.kind == STAFF_OBSTRUCTION ? 10000 : 5000) / tempItem.enchant1);
      }
      if (tempItem.category & categories & WAND) {
          y++;
          tempItem.charges++;
      }
      if (tempItem.category & categories & CHARM) {
          z++;
          tempItem.charges = 0;
      }
  }

  categoryCount = (x ? 1 : 0) + (y ? 1 : 0) + (z ? 1 : 0);

  if (categoryCount) {
      i = 0;
      strcpy(buf, "a surge of energy courses through your pack, recharging your ");
      if (x) {
          i++;
          strcat(buf, x == 1 ? "staff" : "staffs");
          if (i == categoryCount - 1) {
              strcat(buf, " and ");
          } else if (i <= categoryCount - 2) {
              strcat(buf, ", ");
          }
      }
      if (y) {
          i++;
          strcat(buf, y == 1 ? "wand" : "wands");
          if (i == categoryCount - 1) {
              strcat(buf, " and ");
          } else if (i <= categoryCount - 2) {
              strcat(buf, ", ");
          }
      }
      if (z) {
          strcat(buf, z == 1 ? "charm" : "charms");
      }
      strcat(buf, ".");
      message(buf, false);
  } else {
      message("a surge of energy courses through your pack, but nothing happens.", false);
  }
}

// //async void causeFear(const char *emitterName) {
// //    creature *monst;
// //    short numberOfMonsters = 0;
// //    char buf[DCOLS*3], mName[DCOLS];
// //
// //    for (monst = monsters->nextCreature; monst != NULL; monst = monst->nextCreature) {
// //        if (pmap[monst->xLoc][monst->yLoc].flags & IN_FIELD_OF_VIEW
// //            && monst->creatureState != MONSTER_FLEEING
// //            && !(monst->info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
// //
// //            monst->status[STATUS_MAGICAL_FEAR] = monst->maxStatus[STATUS_MAGICAL_FEAR] = rand_range(150, 225);
// //            monst->creatureState = MONSTER_FLEEING;
// //            if (canSeeMonster(monst)) {
// //                numberOfMonsters++;
// //                monsterName(mName, monst, true);
// //            }
// //        }
// //    }
// //    if (numberOfMonsters > 1) {
// //        sprintf(buf, "%s emits a brilliant flash of red light, and the monsters flee!", emitterName);
// //    } else if (numberOfMonsters == 1) {
// //        sprintf(buf, "%s emits a brilliant flash of red light, and %s flees!", emitterName, mName);
// //    } else {
// //        sprintf(buf, "%s emits a brilliant flash of red light!", emitterName);
// //    }
// //    message(buf, false);
// //    await colorFlash(&redFlashColor, 0, IN_FIELD_OF_VIEW, 15, DCOLS, player.xLoc, player.yLoc);
// //}

async function negationBlast( /* char */ emitterName, distance) {
    let monst, nextMonst;		// creature *
    let theItem;						// item *
    const buf = STRING(); 	// char[DCOLS];

    sprintf(buf, "%s emits a numbing torrent of anti-magic!", emitterName);
    message(buf, itemMessageColor, false);
    await colorFlash(pink, 0, IN_FIELD_OF_VIEW, 3 + Math.floor(distance / 5), distance, player.xLoc, player.yLoc);
    await negate(player);
    flashMonster(player, pink, 100);
    for (monst = monsters.nextCreature; monst != NULL;) {
        nextMonst = monst.nextCreature;
        if ((pmap[monst.xLoc][monst.yLoc].flags & IN_FIELD_OF_VIEW)
            && (player.xLoc - monst.xLoc) * (player.xLoc - monst.xLoc) + (player.yLoc - monst.yLoc) * (player.yLoc - monst.yLoc) <= distance * distance)
				{
            if (canSeeMonster(monst)) {
                flashMonster(monst, pink, 100);
            }
            await negate(monst); // This can be fatal.
        }
        monst = nextMonst;
    }
    for (theItem = floorItems; theItem != NULL; theItem = theItem.nextItem) {
        if ((pmap[theItem.xLoc][theItem.yLoc].flags & IN_FIELD_OF_VIEW)
            && (player.xLoc - theItem.xLoc) * (player.xLoc - theItem.xLoc) + (player.yLoc - theItem.yLoc) * (player.yLoc - theItem.yLoc) <= distance * distance)
				{
            theItem.flags &= ~(ITEM_MAGIC_DETECTED | ITEM_CURSED);
            switch (theItem.category) {
                case WEAPON:
                case ARMOR:
                    theItem.enchant1 = theItem.enchant2 = theItem.charges = 0;
                    theItem.flags &= ~(ITEM_RUNIC | ITEM_RUNIC_HINTED | ITEM_RUNIC_IDENTIFIED | ITEM_PROTECTED);
                    identify(theItem);
                    break;
                case STAFF:
                    theItem.charges = 0;
                    break;
                case WAND:
                    theItem.charges = 0;
                    theItem.flags |= ITEM_MAX_CHARGES_KNOWN;
                    break;
                case RING:
                    theItem.enchant1 = 0;
                    theItem.flags |= ITEM_IDENTIFIED; // Reveal that it is (now) +0, but not necessarily which kind of ring it is.
                    updateIdentifiableItems();
                    break;
                case CHARM:
                    theItem.charges = charmRechargeDelay(theItem.kind, theItem.enchant1);
                    break;
                default:
                    break;
            }
        }
    }
}

async function discordBlast(/* char */emitterName, distance) {
    let monst, nextMonst;	// creature *
    const buf = STRING(); // char[DCOLS];

    sprintf(buf, "%s emits a wave of unsettling purple radiation!", emitterName);
    message(buf, itemMessageColor, false);
    await colorFlash(discordColor, 0, IN_FIELD_OF_VIEW, 3 + Math.floor(distance / 5), distance, player.xLoc, player.yLoc);
    for (monst = monsters.nextCreature; monst != NULL;) {
        nextMonst = monst.nextCreature;
        if ((pmap[monst.xLoc][monst.yLoc].flags & IN_FIELD_OF_VIEW)
            && (player.xLoc - monst.xLoc) * (player.xLoc - monst.xLoc) + (player.yLoc - monst.yLoc) * (player.yLoc - monst.yLoc) <= distance * distance)
				{
            if (!(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
                if (canSeeMonster(monst)) {
                    flashMonster(monst, discordColor, 100);
                }
                monst.status[STATUS_DISCORDANT] = monst.maxStatus[STATUS_DISCORDANT] = 30;
            }
        }
        monst = nextMonst;
    }
}

async function crystalize(radius) {
	let i, j;
	let monst;	// creature *

	for (i=0; i<DCOLS; i++) {
		for (j=0; j < DROWS; j++) {
			if ((player.xLoc - i) * (player.xLoc - i) + (player.yLoc - j) * (player.yLoc - j) <= radius * radius
				&& !(pmap[i][j].flags & IMPREGNABLE))
			{
				if (i == 0 || i == DCOLS - 1 || j == 0 || j == DROWS - 1) {
					pmap[i][j].layers[DUNGEON] = CRYSTAL_WALL; // don't dissolve the boundary walls
				} else if (tileCatalog[pmap[i][j].layers[DUNGEON]].flags & (T_OBSTRUCTS_PASSABILITY | T_OBSTRUCTS_VISION)) {

					pmap[i][j].layers[DUNGEON] = FORCEFIELD;
          await spawnDungeonFeature(i, j, dungeonFeatureCatalog[DF_SHATTERING_SPELL], true, false);

					if (pmap[i][j].flags & HAS_MONSTER) {
						monst = monsterAtLoc(i, j);
						if (monst.info.flags & MONST_ATTACKABLE_THRU_WALLS) {
              await inflictLethalDamage(NULL, monst);
						} else {
							await freeCaptivesEmbeddedAt(i, j);
						}
					}
				}
			}
		}
	}
	updateVision(false);
	await colorFlash(forceFieldColor, 0, 0, radius, radius, player.xLoc, player.yLoc);
	displayLevel();
	refreshSideBar(-1, -1, false);
}

function imbueInvisibility( /* creature */ monst, duration) {
    let autoID = false;

    if (monst && !(monst.info.flags & (MONST_INANIMATE | MONST_INVISIBLE | MONST_INVULNERABLE))) {
        if (monst === player || monst.creatureState == MONSTER_ALLY) {
            autoID = true;
        }
        monst.status[STATUS_INVISIBLE] = monst.maxStatus[STATUS_INVISIBLE] = duration;
        refreshDungeonCell(monst.xLoc, monst.yLoc);
        refreshSideBar(-1, -1, false);
        if (boltCatalog[BOLT_POLYMORPH].backColor) {
            flashMonster(monst, boltCatalog[BOLT_INVISIBILITY].backColor, 100);
        }
    }
    return autoID;
}

function projectileReflects( /* creature */ attacker, /* creature */ defender) {
	let prob;
  let netReflectionLevel;

	// immunity armor always reflects its vorpal enemy's projectiles
	if (defender === player && rogue.armor && (rogue.armor.flags & ITEM_RUNIC) && rogue.armor.enchant2 == A_IMMUNITY
		&& monsterIsInClass(attacker, rogue.armor.vorpalEnemy)
    && monstersAreEnemies(attacker, defender))
	{
		return true;
	}

	if (defender === player && rogue.armor && (rogue.armor.flags & ITEM_RUNIC) && rogue.armor.enchant2 == A_REFLECTION) {
		netReflectionLevel = fp_netEnchant(rogue.armor);
	} else {
		netReflectionLevel = 0;
	}

	if (defender && (defender.info.flags & MONST_REFLECT_4)) {
    if (defender.info.flags & MONST_ALWAYS_USE_ABILITY) {
        return true;
    }
		netReflectionLevel += 4 << FP_BASE;
	}

	if (netReflectionLevel <= 0) {
		return false;
	}

	prob = fp_reflectionChance(netReflectionLevel);

	return rand_percent(prob);
}


// Alters listOfCoordinates to describe reflected path,
// which diverges from the existing path at kinkCell,
// and then returns the path length of the reflected path.
function reflectBolt(targetX, targetY, listOfCoordinates /* short[][2] */, kinkCell, retracePath) {
	let k, target = [-1, -1], origin = [-1, -1], newPathLength, failsafe, finalLength;
	let newPath = ARRAY(DCOLS, () => [-1, -1] ); // short[DCOLS][2],
	let needRandomTarget;

	needRandomTarget = (targetX < 0 || targetY < 0
						|| (targetX == listOfCoordinates[kinkCell][0] && targetY == listOfCoordinates[kinkCell][1]));

	if (retracePath) {
		// if reflecting back at caster, follow precise trajectory until we reach the caster
		for (k = 1; k <= kinkCell && kinkCell + k < MAX_BOLT_LENGTH; k++) {
			listOfCoordinates[kinkCell + k][0] = listOfCoordinates[kinkCell - k][0];
			listOfCoordinates[kinkCell + k][1] = listOfCoordinates[kinkCell - k][1];
		}

		// Calculate a new "extension" path, with an origin at the caster, and a destination at
		// the caster's location translated by the vector from the reflection point to the caster.
		//
		// For example, if the player is at (0,0), and the caster is at (2,3), then the newpath
		// is from (2,3) to (4,6):
		// (2,3) + ((2,3) - (0,0)) = (4,6).

		origin[0] = listOfCoordinates[2 * kinkCell][0];
		origin[1] = listOfCoordinates[2 * kinkCell][1];
		target[0] = targetX + (targetX - listOfCoordinates[kinkCell][0]);
		target[1] = targetY + (targetY - listOfCoordinates[kinkCell][1]);
		newPathLength = getLineCoordinates(newPath, origin, target);
		for (k=0; k<=newPathLength; k++) {
			listOfCoordinates[2 * kinkCell + k + 1][0] = newPath[k][0];
			listOfCoordinates[2 * kinkCell + k + 1][1] = newPath[k][1];
		}
		finalLength = 2 * kinkCell + newPathLength + 1;
	} else {
		failsafe = 50;
		do {
			if (needRandomTarget) {
				// pick random target
				perimeterCoords(target, rand_range(0, 39));
				target[0] += listOfCoordinates[kinkCell][0];
				target[1] += listOfCoordinates[kinkCell][1];
			} else {
				target[0] = targetX;
				target[1] = targetY;
			}
			newPathLength = getLineCoordinates(newPath, listOfCoordinates[kinkCell], target);
			if (newPathLength > 0
                && !cellHasTerrainFlag(newPath[0][0], newPath[0][1], (T_OBSTRUCTS_VISION | T_OBSTRUCTS_PASSABILITY))) {

				needRandomTarget = false;
			}
		} while (needRandomTarget && --failsafe);

		for (k = 0; k < newPathLength; k++) {
			listOfCoordinates[kinkCell + k + 1][0] = newPath[k][0];
			listOfCoordinates[kinkCell + k + 1][1] = newPath[k][1];
		}

		finalLength = kinkCell + newPathLength + 1;
	}

	listOfCoordinates[finalLength][0] = -1;
	listOfCoordinates[finalLength][1] = -1;
	return finalLength;
}


// Update stuff that promotes without keys so players can't abuse item libraries with blinking/haste shenanigans
async function checkForMissingKeys(x, y) {
	let layer;

	if (cellHasTMFlag(x, y, TM_PROMOTES_WITHOUT_KEY) && !keyOnTileAt(x, y)) {
		for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
			if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_PROMOTES_WITHOUT_KEY) {
				await promoteTile(x, y, layer, false);
			}
		}
	}
}

async function beckonMonster( /* creature */ monst, x, y) {
    let from = [-1, -1], to = [-1, -1];
    const theBolt = boltCatalog[BOLT_BLINKING];

    if (monst.bookkeepingFlags & MB_CAPTIVE) {
        await freeCaptive(monst);
    }
    from[0] = monst.xLoc;
    from[1] = monst.yLoc;
    to[0] = x;
    to[1] = y;
    theBolt.magnitude = max(1, Math.floor((distanceBetween(x, y, monst.xLoc, monst.yLoc) - 2) / 2));
    await zap(from, to, theBolt, false);
    if (monst.ticksUntilTurn < player.attackSpeed+1) {
        monst.ticksUntilTurn = player.attackSpeed+1;
    }
}

function boltEffectForItem( /* item */ theItem) {		// enum boltEffects
    if (theItem.category & (STAFF | WAND)) {
        return boltCatalog[tableForItemCategory(theItem.category, NULL)[theItem.kind].strengthRequired].boltEffect;
    } else {
        return BE_NONE;
    }
}

function boltForItem( /* item */ theItem) {		// enum boltType
    if (theItem.category & (STAFF | WAND)) {
        return tableForItemCategory(theItem.category, NULL)[theItem.kind].strengthRequired;
    } else {
        return 0;
    }
}


// Called on each space of the bolt's flight.
// Returns true if the bolt terminates here.
// Caster can be null.
// Pass in true for boltInView if any part of the bolt is currently visible to the player.
// Pass in true for alreadyReflected if the bolt has already reflected off of something.
// If the effect is visible enough for the player to identify the shooting item,
// *autoID will be set to true. (AutoID can be null.)
// If the effect causes the level's lighting or vision to change, *lightingChanged
// will be set to true. (LightingChanged can be null.)
async function updateBolt( /* bolt */ theBolt, /* creature */ caster, x, y,
                   boltInView, alreadyReflected)
{
	let autoID = false;
	let lightingChanged = false;

	const buf = STRING(), monstName = STRING(); // char[COLS];
  let monst; // Creature being hit by the bolt, if any.
  let newMonst; // Utility variable for plenty
  let terminateBolt = false;

  // Handle collisions with monsters.

  monst = monsterAtLoc(x, y);
  if (monst && !(monst.bookkeepingFlags & MB_SUBMERGED)) {
      monsterName(monstName, monst, true);

      switch(theBolt.boltEffect) {
          case BE_ATTACK:
            if (!cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)
                || (monst.info.flags & MONST_ATTACKABLE_THRU_WALLS))
						{
                await attack(caster, monst, false);
								autoID = true;
            }
            break;
          case BE_DAMAGE:
							autoID = true;
              if (((theBolt.flags & BF_FIERY) && monst.status[STATUS_IMMUNE_TO_FIRE] > 0)
                  || (monst.info.flags & MONST_INVULNERABLE))
							{
                  if (canSeeMonster(monst)) {
                      sprintf(buf, "%s ignore%s %s %s",
                              monstName,
                              (monst === player ? "" : "s"),
                              canSeeMonster(caster) ? "the" : "a",
                              theBolt.name);
                      combatMessage(buf, 0);
                  }
              } else if (await inflictDamage(caster, monst, fp_staffDamage(theBolt.magnitude << FP_BASE), theBolt.backColor, false)) {
                  // killed monster
                  if (player.currentHP <= 0) {
                      if (caster === player) {
                          sprintf(buf, "Killed by a reflected %s", theBolt.name);
                          await gameOver(buf, true);
                      }
                      terminateBolt = true;
                      return true;
                  }
                  if (boltInView || canSeeMonster(monst)) {
                      sprintf(buf, "%s %s %s %s",
                              canSeeMonster(caster) ? "the" : "a",
                              theBolt.name,
                              ((monst.info.flags & MONST_INANIMATE) ? "destroys" : "kills"),
                              monstName);
                      combatMessage(buf, messageColorFromVictim(monst));
                  } else {
                      sprintf(buf, "you hear %s %s", monstName, ((monst.info.flags & MONST_INANIMATE) ? "get destroyed" : "die"));
                      combatMessage(buf, 0);
                  }
              } else {
                  // monster lives
                  if (monst.creatureMode != MODE_PERM_FLEEING
                      && monst.creatureState != MONSTER_ALLY
                      && (monst.creatureState != MONSTER_FLEEING || monst.status[STATUS_MAGICAL_FEAR]))
									{
                      monst.creatureState = MONSTER_TRACKING_SCENT;
                      monst.status[STATUS_MAGICAL_FEAR] = 0;
                  }
                  if (boltInView) {
                      sprintf(buf, "%s %s hits %s",
                              canSeeMonster(caster) ? "the" : "a",
                              theBolt.name,
                              monstName);
                      combatMessage(buf, messageColorFromVictim(monst));
                  }
                  if (theBolt.flags & BF_FIERY) {
                      await exposeCreatureToFire(monst);
                  }
                  if (!alreadyReflected
                      || caster !== player)
									{
                      await moralAttack(caster, monst);
                  }
              }
              if (theBolt.flags & BF_FIERY) {
                  await exposeTileToFire(x, y, true); // burninate
              }
              break;
          case BE_TELEPORT:
              if (!(monst.info.flags & MONST_IMMOBILE)) {
                  if (monst.bookkeepingFlags & MB_CAPTIVE) {
                      await freeCaptive(monst);
                  }
                  await teleport(monst, -1, -1, false);
              }
              break;
          case BE_BECKONING:
              if (!(monst.info.flags & MONST_IMMOBILE)
                  && caster
                  && distanceBetween(caster.xLoc, caster.yLoc, monst.xLoc, monst.yLoc) > 1)
							{
                  if (canSeeMonster(monst)) {
										autoID = true;
                  }
                  await beckonMonster(monst, caster.xLoc, caster.yLoc);
                  if (canSeeMonster(monst)) {
										autoID = true;
                  }
              }
              break;
          case BE_SLOW:
              slow(monst, theBolt.magnitude * 5);
              if (boltCatalog[BOLT_SLOW].backColor) {
                  await flashMonster(monst, boltCatalog[BOLT_SLOW].backColor, 100);
              }
							autoID = true;
              break;
          case BE_HASTE:
              haste(monst, fp_staffHasteDuration(theBolt.magnitude << FP_BASE));
              if (boltCatalog[BOLT_HASTE].backColor) {
                  await flashMonster(monst, boltCatalog[BOLT_HASTE].backColor, 100);
              }
							autoID = true;
              break;
          case BE_POLYMORPH:
              if (polymorph(monst)) {
                  if (!monst.status[STATUS_INVISIBLE]) {
										autoID = true;
                  }
              }
              break;
          case BE_INVISIBILITY:
              if (imbueInvisibility(monst, 150)) {
								autoID = true;
              }
              break;
          case BE_DOMINATION:
              if (monst !== player && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
                  if (rand_percent(wandDominate(monst))) {
                      // domination succeeded
                      monst.status[STATUS_DISCORDANT] = 0;
                      await becomeAllyWith(monst);
                      //refreshSideBar(-1, -1, false);
                      refreshDungeonCell(monst.xLoc, monst.yLoc);
                      if (canSeeMonster(monst)) {
												autoID = true;
                          sprintf(buf, "%s is bound to your will!", monstName);
                          message(buf, false);
                          if (boltCatalog[BOLT_DOMINATION].backColor) {
                              flashMonster(monst, boltCatalog[BOLT_DOMINATION].backColor, 100);
                          }
                      }
                  } else if (canSeeMonster(monst)) {
										autoID = true;
                      sprintf(buf, "%s resists the bolt of domination.", monstName);
                      message(buf, false);
                  }
              }
              break;
          case BE_NEGATION:
              await negate(monst);
              if (boltCatalog[BOLT_NEGATION].backColor) {
                  flashMonster(monst, boltCatalog[BOLT_NEGATION].backColor, 100);
              }
              break;
          case BE_EMPOWERMENT:
              if (monst !== player
                  && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)))
							{
                  empowerMonster(monst);
                  createFlare(monst.xLoc, monst.yLoc, EMPOWERMENT_LIGHT);
                  if (canSeeMonster(monst)) {
										autoID = true;
                  }
              }
              break;
          case BE_POISON:
              if (!(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
                  addPoison(monst, fp_staffPoison(theBolt.magnitude << FP_BASE), 1);
                  if (canSeeMonster(monst)) {
                      if (boltCatalog[BOLT_POISON].backColor) {
                          flashMonster(monst, boltCatalog[BOLT_POISON].backColor, 100);
                      }
											autoID = true;
                      if (monst !== player) {
                          sprintf(buf, "%s %s %s sick",
                                  monstName,
                                  (monst === player ? "feel" : "looks"),
                                  (monst.status[STATUS_POISONED] * monst.poisonAmount >= monst.currentHP && !player.status[STATUS_HALLUCINATING] ? "fatally" : "very"));
                          combatMessage(buf, messageColorFromVictim(monst));
                      }
                  }
              }
              break;
          case BE_ENTRANCEMENT:
              if (monst === player) {
                  flashMonster(monst, confusionGasColor, 100);
                  monst.status[STATUS_CONFUSED] = fp_staffEntrancementDuration(theBolt.magnitude << FP_BASE);
                  monst.maxStatus[STATUS_CONFUSED] = max(monst.status[STATUS_CONFUSED], monst.maxStatus[STATUS_CONFUSED]);
                  await messageWithAck("the bolt hits you and you suddently feel disoriented.");
									autoID = true;
              } else if (!(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
                  monst.status[STATUS_ENTRANCED] = monst.maxStatus[STATUS_ENTRANCED] = fp_staffEntrancementDuration(theBolt.magnitude << FP_BASE);
                  wakeUp(monst);
                  if (canSeeMonster(monst)) {
                      if (boltCatalog[BOLT_ENTRANCEMENT].backColor) {
                          flashMonster(monst, boltCatalog[BOLT_ENTRANCEMENT].backColor, 100);
                      }
											autoID = true;
                      sprintf(buf, "%s is entranced!", monstName);
                      message(buf, false);
                  }
              }
              break;
          case BE_HEALING:
              heal(monst, theBolt.magnitude * 10, false);
              if (canSeeMonster(monst)) {
								autoID = true;
              }
              break;
          case BE_PLENTY:
              if (!(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
                  newMonst = await cloneMonster(monst, true, true);
                  if (newMonst) {
                      newMonst.currentHP = Math.floor((newMonst.currentHP + 1) / 2);
                      monst.currentHP = Math.floor((monst.currentHP + 1) / 2);
                      if (boltCatalog[BOLT_PLENTY].backColor) {
                          flashMonster(monst, boltCatalog[BOLT_PLENTY].backColor, 100);
                          flashMonster(newMonst, boltCatalog[BOLT_PLENTY].backColor, 100);
                      }
											autoID = true;
                  }
              }
              break;
          case BE_DISCORD:
              if (!(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))) {
                  monst.status[STATUS_DISCORDANT] = monst.maxStatus[STATUS_DISCORDANT] = max(fp_staffDiscordDuration(theBolt.magnitude << FP_BASE), monst.status[STATUS_DISCORDANT]);
                  if (canSeeMonster(monst)) {
                      if (boltCatalog[BOLT_DISCORD].backColor) {
                          flashMonster(monst, boltCatalog[BOLT_DISCORD].backColor, 100);
                      }
											autoID = true;
                  }
              }
              break;
          case BE_SHIELDING:
              if (staffProtection(theBolt.magnitude) > monst.status[STATUS_SHIELDED]) {
                  monst.status[STATUS_SHIELDED] = fp_staffProtection(theBolt.magnitude << FP_BASE);
              }
              monst.maxStatus[STATUS_SHIELDED] = monst.status[STATUS_SHIELDED];
              if (boltCatalog[BOLT_SHIELDING].backColor) {
                  flashMonster(monst, boltCatalog[BOLT_SHIELDING].backColor, 100);
              }
							autoID = true;
              break;
          default:
              break;
      }

      if (!(theBolt.flags & BF_PASSES_THRU_CREATURES)) {
          terminateBolt = true;
      }
  }

  // Handle ordinary bolt updates that aren't dependent on hitting a creature.
  switch (theBolt.boltEffect) {
      case BE_BLINKING:
          if (caster === player) {
              player.xLoc = x;
              player.yLoc = y;
              lightingChanged = true;
          }
          break;
      default:
          break;
  }

  if (theBolt.pathDF) {
      await spawnDungeonFeature(x, y, dungeonFeatureCatalog[theBolt.pathDF], true, false);
  }

  if ((theBolt.flags & BF_FIERY)
      && await exposeTileToFire(x, y, true))
	{
		lightingChanged = true;
		autoID = true;
  }

  if ((theBolt.flags & BF_ELECTRIC)
      && await exposeTileToElectricity(x, y))
	{
		lightingChanged = true;
		autoID = true;
  }

	let result = BR_CONTINUES;
	if (terminateBolt) 		{ result |= BR_DONE; }
	if (autoID) 					{ result |= BR_AUTO_ID; }
	if (lightingChanged) 	{ result |= BR_LIGHTING_CHANGED; }

  return result;
}


const POW_OBSTRUCTION = [
		// 0.8^x << FP_BASE, with x from 2 to 40:
		41943, 33554, 26843, 21474, 17179, 13743, 10995, 8796, 7036, 5629, 4503, 3602,
		2882, 2305, 1844, 1475, 1180, 944, 755, 604, 483, 386, 309, 247, 198, 158, 126,
		101, 81, 64, 51, 41, 33, 26, 21, 17, 13, 10, 8, 6, 5];

// Called when the bolt hits something.
// Caster can be null.
// Pass in true for alreadyReflected if the bolt has already reflected off of something.
// If the effect is visible enough for the player to identify the shooting item,
// *autoID will be set to true. (AutoID can be null.)
async function detonateBolt( /* bolt */ theBolt, /* creature */ caster, x, y) {
	let autoID = false;
	let feat;	// dungeonFeature
  let i, x2, y2;
  let monst;	// creature *

  switch(theBolt.boltEffect) {
      case BE_OBSTRUCTION:
          feat = dungeonFeatureCatalog[DF_FORCEFIELD];
					feat.probabilityDecrement = max(1, 75 * POW_OBSTRUCTION[min(40, theBolt.magnitude) - 2] >> FP_BASE);
          await spawnDungeonFeature(x, y, feat, true, false);
          autoID = true;
          break;
      case BE_CONJURATION:
          for (i = 0; i < (fp_staffBladeCount(theBolt.magnitude << FP_BASE)); i++) {
              monst = generateMonster(MK_SPECTRAL_BLADE, true, false);
              const loc = getQualifyingPathLocNear(x, y, true,
                                       T_DIVIDES_LEVEL & avoidedFlagsForMonster(monst.info) & ~T_SPONTANEOUSLY_IGNITES, HAS_PLAYER,
                                       avoidedFlagsForMonster(monst.info) & ~T_SPONTANEOUSLY_IGNITES, (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS), false);
							if (!loc) ERROR('EXPECTED LOCATION');
							monst.xLoc = loc[0];
							monst.yLoc = loc[1];
              monst.bookkeepingFlags |= (MB_FOLLOWER | MB_BOUND_TO_LEADER | MB_DOES_NOT_TRACK_LEADER);
              monst.bookkeepingFlags &= ~MB_JUST_SUMMONED;
              monst.leader = player;
              monst.creatureState = MONSTER_ALLY;
              monst.ticksUntilTurn = monst.info.attackSpeed + 1; // So they don't move before the player's next turn.
              pmap[monst.xLoc][monst.yLoc].flags |= HAS_MONSTER;
              //refreshDungeonCell(monst.xLoc, monst.yLoc);
              fadeInMonster(monst);
          }
          updateVision(true);
          //refreshSideBar(-1, -1, false);
          monst = NULL;
					autoID = true;
          break;
      case BE_BLINKING:
          if (pmap[x][y].flags & HAS_MONSTER) { // We're blinking onto an area already occupied by a submerged monster.
                                                // Make sure we don't get the shooting monster by accident.
              caster.xLoc = caster.yLoc = -1; // Will be set back to the destination in a moment.
              monst = monsterAtLoc(x, y);
              const loc = findAlternativeHomeFor(monst, x2, y2, true);
							x2 = loc[0];
							y2 = loc[1];
              if (x2 >= 0) {
                  // Found an alternative location.
                  monst.xLoc = x2;
                  monst.yLoc = y2;
                  pmap[x][y].flags &= ~HAS_MONSTER;
                  pmap[x2][y2].flags |= HAS_MONSTER;
              } else {
                  // No alternative location?? Hard to imagine how this could happen.
                  // Just bury the monster and never speak of this incident again.
                  await killCreature(monst, true);
                  pmap[x][y].flags &= ~HAS_MONSTER;
                  monst = NULL;
              }
          }
          caster.bookkeepingFlags &= ~MB_SUBMERGED;
          pmap[x][y].flags |= (caster === player ? HAS_PLAYER : HAS_MONSTER);
          caster.xLoc = x;
          caster.yLoc = y;
          await applyInstantTileEffectsToCreature(caster);
          if (caster === player) {
              // increase scent turn number so monsters don't sniff around at the old cell like idiots
              rogue.scentTurnNumber += 30;
              // get any items at the destination location
              if (pmap[player.xLoc][player.yLoc].flags & HAS_ITEM) {
                  await pickUpItemAt(player.xLoc, player.yLoc);
              }
              updateVision(true);
          }
					autoID = true;
          break;
      case BE_TUNNELING:
          setUpWaypoints(); // Recompute waypoints based on the new situation.
          break;
  }

  if (theBolt.targetDF) {
      await spawnDungeonFeature(x, y, dungeonFeatureCatalog[theBolt.targetDF], true, false);
  }

	return autoID;
}

// returns whether the bolt effect should autoID any staff or wand it came from, if it came from a staff or wand

async function zap(originLoc /* short[2] */, targetLoc /* short[2] */, /* bolt */ theBolt, hideDetails) {
	let listOfCoordinates = ARRAY(MAX_BOLT_LENGTH, () => [-1, -1] ); // short [MAX_BOLT_LENGTH][2];
	let i, j, k, x, y, x2, y2, numCells, blinkDistance, boltLength, initialBoltLength;
	const lights = GRID(DCOLS, DROWS, () => [0, 0, 0] ); 	// char [DCOLS][DROWS][3];
	let monst = NULL, shootingMonst;	// creature *
	const buf = STRING(), monstName = STRING(); 	// char[COLS];
	let autoID = false;
  let lightingChanged = false;
	let fastForward = false;
	let alreadyReflected = false;
	let boltInView;
	let boltColor;
	let boltLightRadius;

  let theChar;
  const foreColor = color(), backColor = color(), multColor = color();

	const boltLights = ARRAY(500, lightSource);
	const boltLightColors = ARRAY(500, color);

  brogueAssert(originLoc[0] != targetLoc[0] || originLoc[1] != targetLoc[1]);
	if (originLoc[0] == targetLoc[0] && originLoc[1] == targetLoc[1]) {
		return false;
	}

	x = originLoc[0];
	y = originLoc[1];

	initialBoltLength = boltLength = 5 * theBolt.magnitude;
	numCells = getLineCoordinates(listOfCoordinates, originLoc, targetLoc);
	shootingMonst = monsterAtLoc(originLoc[0], originLoc[1]);

	if (hideDetails) {
		boltColor = gray;
	} else {
		boltColor = theBolt.backColor;
	}

	refreshSideBar(-1, -1, false);
  displayCombatText(); // To announce who fired the bolt while the animation plays.

	if (theBolt.boltEffect == BE_BLINKING) {
		if (cellHasTerrainFlag(listOfCoordinates[0][0], listOfCoordinates[0][1], (T_OBSTRUCTS_PASSABILITY | T_OBSTRUCTS_VISION))
			|| ((pmap[listOfCoordinates[0][0]][listOfCoordinates[0][1]].flags & (HAS_PLAYER | HAS_MONSTER))
				&& !(monsterAtLoc(listOfCoordinates[0][0], listOfCoordinates[0][1]).bookkeepingFlags & MB_SUBMERGED)))
		{
			// shooting blink point-blank into an obstruction does nothing.
			return false;
		}
    theBolt.foreColor = black;
    theBolt.theChar = shootingMonst.info.displayChar;
		pmap[originLoc[0]][originLoc[1]].flags &= ~(HAS_PLAYER | HAS_MONSTER);
		refreshDungeonCell(originLoc[0], originLoc[1]);
		blinkDistance = theBolt.magnitude * 2 + 1;
		await checkForMissingKeys(originLoc[0], originLoc[1]);
	}

  if (boltColor) {
      for (i=0; i<initialBoltLength; i++) {
          boltLightColors[i].copy(boltColor);
          boltLights[i] = lightCatalog[BOLT_LIGHT_SOURCE];
          boltLights[i].lightColor = boltLightColors[i];
					boltLightRadius = 50 * ((3 << FP_BASE) + (theBolt.magnitude << FP_BASE) * 4/3) * (initialBoltLength - i) / initialBoltLength >> FP_BASE;
					boltLights[i].lightRadius.lowerBound = boltLights[i].lightRadius.upperBound = boltLightRadius;
      }
  }

	if (theBolt.boltEffect == BE_TUNNELING) {
		await tunnelize(originLoc[0], originLoc[1]);
	}

	backUpLighting(lights);
	boltInView = true;
	for (i=0; i<numCells; i++) {

		x = listOfCoordinates[i][0];
		y = listOfCoordinates[i][1];

		monst = monsterAtLoc(x, y);

    // Handle bolt reflection off of creatures (reflection off of terrain is handled further down).
		if (monst
            && !(theBolt.flags & BF_NEVER_REFLECTS)
            && projectileReflects(shootingMonst, monst)
            && i < MAX_BOLT_LENGTH - max(DCOLS, DROWS))
		{
			if (projectileReflects(shootingMonst, monst)) { // if it scores another reflection roll, reflect at caster
				numCells = reflectBolt(originLoc[0], originLoc[1], listOfCoordinates, i, !alreadyReflected);
			} else {
				numCells = reflectBolt(-1, -1, listOfCoordinates, i, false); // otherwise reflect randomly
			}

			alreadyReflected = true;

			if (boltInView) {
				monsterName(monstName, monst, true);
				sprintf(buf, "%s deflect%s the %s",
                        monstName,
                        (monst === player ? "" : "s"),
                        theBolt.name);
				combatMessage(buf, 0);
			}
      if (monst === player
          && rogue.armor
          && rogue.armor.enchant2 == A_REFLECTION
          && !(rogue.armor.flags & ITEM_RUNIC_IDENTIFIED))
			{
          autoIdentify(rogue.armor);
      }
			continue;
		}

		const boltResult = await updateBolt(theBolt, shootingMonst, x, y, boltInView, alreadyReflected);
		autoID = boltResult & BR_AUTO_ID;
		lightingChanged = boltResult & BR_LIGHTING_CHANGED;
    if (boltResult & BR_DONE) {
        break;
    }

    if (lightingChanged) {
        updateVision(true);
        backUpLighting(lights);
    }

		// Update the visual effect of the bolt.
        // First do lighting. This lighting effect is expensive; do it only if the player can see the bolt.
		if (boltInView && boltColor) {
			demoteVisibility();
			restoreLighting(lights);
			for (k = min(i, boltLength + 2); k >= 0; k--) {
				if (k < initialBoltLength) {
					paintLight(boltLights[k], listOfCoordinates[i-k][0], listOfCoordinates[i-k][1], false, false);
				}
			}
		}
		boltInView = false;
		updateFieldOfViewDisplay(false, true);
    // Now draw the bolt itself.
		for (k = min(i, boltLength + 2); k >= 0; k--) {
            x2 = listOfCoordinates[i-k][0];
            y2 = listOfCoordinates[i-k][1];
            if (playerCanSeeOrSense(x2, y2)) {
                if (!fastForward) {
                    const app = getCellAppearance(x2, y2);
                    if (boltColor) {
                        applyColorAugment(app.foreColor, boltColor, max(0, 100 - k * 100 / (boltLength)));
                        applyColorAugment(app.backColor, boltColor, max(0, 100 - k * 100 / (boltLength)));
                    }
                    const displayChar = (k == 0 || (theBolt.flags & BF_DISPLAY_CHAR_ALONG_LENGTH));
                    if (displayChar) {
                        if (theBolt.foreColor) {
                            app.foreColor.copy(theBolt.foreColor);
                        }
                        if (theBolt.theChar) {
                            app.char = theBolt.theChar;
                        }
                    }
                    if (displayChar
                        && theBolt.foreColor
                        && theBolt.theChar)
										{
                        colorMultiplierFromDungeonLight(x2, y2, multColor);
                        applyColorMultiplier(app.foreColor, multColor);
                        plotCharWithColor(app.char, mapToWindowX(x2), mapToWindowY(y2), app.foreColor, app.backColor);
                    } else if (boltColor) {
                        plotCharWithColor(app.char, mapToWindowX(x2), mapToWindowY(y2), app.foreColor, app.backColor);
                    } else if (k == 1
                               && theBolt.foreColor
                               && theBolt.theChar)
										 {
                        refreshDungeonCell(x2, y2); // Clean up the contrail so it doesn't leave a trail of characters.
                    }
                }
                if (playerCanSee(x2, y2)) {
                    // Don't want to let omniscience mode affect boltInView; causes OOS.
                    boltInView = true;
                }
            }
		}
		if (!fastForward && (boltInView || rogue.playbackOmniscience)) {
			fastForward = rogue.playbackFastForward || await pauseBrogue(16);
		}

		if (theBolt.boltEffect == BE_BLINKING) {
			theBolt.magnitude = Math.floor((blinkDistance - i) / 2) + 1;
			boltLength = theBolt.magnitude * 5;
			for (j=0; j<i; j++) {
				refreshDungeonCell(listOfCoordinates[j][0], listOfCoordinates[j][1]);
			}
			if (i >= blinkDistance) {
				break;
			}
		}

		// Some bolts halt at the square before they hit something.
		if ((theBolt.flags & BF_HALTS_BEFORE_OBSTRUCTION) && i + 1 < numCells)
		{
      x2 = listOfCoordinates[i+1][0];
      y2 = listOfCoordinates[i+1][1];

			if (cellHasTerrainFlag(x2, y2, (T_OBSTRUCTS_VISION | T_OBSTRUCTS_PASSABILITY))) {
          break;
      }

      if (!(theBolt.flags & BF_PASSES_THRU_CREATURES)) {
          monst = monsterAtLoc(listOfCoordinates[i+1][0], listOfCoordinates[i+1][1]);
          if (monst && !(monst.bookkeepingFlags & MB_SUBMERGED)) {
              break;
          }
      }
  	}

    // Tunnel if we hit a wall.
    if (cellHasTerrainFlag(x, y, (T_OBSTRUCTS_PASSABILITY | T_OBSTRUCTS_VISION))
        && theBolt.boltEffect == BE_TUNNELING
        && await tunnelize(x, y))
		{
        updateVision(true);
        backUpLighting(lights);
        autoID = true;
        theBolt.magnitude--;
        boltLength = theBolt.magnitude * 5;
        for (j=0; j<i; j++) {
            refreshDungeonCell(listOfCoordinates[j][0], listOfCoordinates[j][1]);
        }
        if (theBolt.magnitude <= 0) {
            refreshDungeonCell(listOfCoordinates[i-1][0], listOfCoordinates[i-1][1]);
            refreshDungeonCell(x, y);
            break;
        }
    }

    // Stop when we hit a wall.
		if (cellHasTerrainFlag(x, y, (T_OBSTRUCTS_PASSABILITY | T_OBSTRUCTS_VISION))) {
        break;
		}

		// Does the bolt bounce before hitting a wall?
		// Can happen with a cursed deflection ring or a reflective terrain target, or when shooting a tunneling bolt into an impregnable wall.
		if (i + 1 < numCells && !(theBolt.flags & BF_NEVER_REFLECTS))
		{
      x2 = listOfCoordinates[i+1][0];
      y2 = listOfCoordinates[i+1][1];
			if (cellHasTerrainFlag(x2, y2, (T_OBSTRUCTS_VISION | T_OBSTRUCTS_PASSABILITY))
          && (projectileReflects(shootingMonst, NULL)
              || cellHasTMFlag(x2, y2, TM_REFLECTS_BOLTS)
              || (theBolt.boltEffect == BE_TUNNELING && (pmap[x2][y2].flags & IMPREGNABLE)))
          && i < MAX_BOLT_LENGTH - max(DCOLS, DROWS))
			{
        sprintf(buf, "the bolt reflects off of %s", tileText(x2, y2));
        if (projectileReflects(shootingMonst, NULL)) {
            // If it scores another reflection roll, reflect at caster, unless it's already reflected.
            numCells = reflectBolt(originLoc[0], originLoc[1], listOfCoordinates, i, !alreadyReflected);
        } else {
            numCells = reflectBolt(-1, -1, listOfCoordinates, i, false); // Otherwise reflect randomly.
        }
        alreadyReflected = true;
        if (boltInView) {
            combatMessage(buf, 0);
        }
      }
    }
	}

  if (!fastForward) {
      refreshDungeonCell(x, y);
      if (i > 0) {
          refreshDungeonCell(listOfCoordinates[i-1][0], listOfCoordinates[i-1][1]);
      }
  }

	if (pmap[x][y].flags & (HAS_MONSTER | HAS_PLAYER)) {
		monst = monsterAtLoc(x, y);
		monsterName(monstName, monst, true);
	} else {
		monst = NULL;
	}

  autoID = await detonateBolt(theBolt, shootingMonst, x, y);

	updateLighting();
	backUpLighting(lights);
	boltInView = true;
	refreshSideBar(-1, -1, false);
	if (boltLength > 0) {
        if (boltColor) {
            // j is where the front tip of the bolt would be if it hadn't collided at i
            for (j=i; j < i + boltLength + 2; j++) { // j can imply a bolt tip position that is off the map

                // dynamic lighting
                if (boltInView) {
                    demoteVisibility();
                    restoreLighting(lights);

                    // k = j-i;
                    // boltLights[k].lightRadius.lowerBound *= 2;
                    // boltLights[k].lightRadius.upperBound *= 2;
                    // boltLights[k].lightColor = &boltImpactColor;

                    for (k = min(j, boltLength + 2); k >= j-i; k--) {
                        if (k < initialBoltLength) {
                            paintLight(boltLights[k], listOfCoordinates[j-k][0], listOfCoordinates[j-k][1], false, false);
                        }
                    }
                    updateFieldOfViewDisplay(false, true);
                }

                boltInView = false;

                // beam graphic
                // k iterates from the tail tip of the visible portion of the bolt to the head
                for (k = min(j, boltLength + 2); k >= j-i; k--) {
                    if (playerCanSee(listOfCoordinates[j-k][0], listOfCoordinates[j-k][1])) {
                        if (boltColor) {
                            hiliteCell(listOfCoordinates[j-k][0], listOfCoordinates[j-k][1], boltColor, max(0, 100 - k * 100 / (boltLength)), false);
                        }
                        boltInView = true;
                    }
                }

                if (!fastForward && boltInView) {
                    fastForward = rogue.playbackFastForward || await pauseBrogue(16);
                }
            }
        } else if (theBolt.flags & BF_DISPLAY_CHAR_ALONG_LENGTH) {
            for (j = 0; j < i; j++) {
                x2 = listOfCoordinates[j][0];
                y2 = listOfCoordinates[j][1];
                if (playerCanSeeOrSense(x2, y2)) {
                    refreshDungeonCell(x2, y2);
                }
            }
        }
    }
    return autoID;
}

// Relies on the sidebar entity list. If one is already selected, select the next qualifying. Otherwise, target the first qualifying.
function nextTargetAfter(
                        targetX,
                        targetY,
                        targetEnemies,
                        targetAllies,
                        targetItems,
                        targetTerrain,
                        requireOpenPath,
                        reverseDirection)
{
	let returnX = -1, returnY = -1;
  let i, n, targetCount, newX, newY;
  let selectedIndex = 0;
  let monst;		// creature *
  let theItem;	// item *
  const deduplicatedTargetList = ARRAY(ROWS, () => [-1, -1]); // short[ROWS][2];

  targetCount = 0;
  for (i=0; i<ROWS; i++) {
      if (rogue.sidebarLocationList[i][0] != -1) {
          if (targetCount == 0
              || deduplicatedTargetList[targetCount-1][0] != rogue.sidebarLocationList[i][0]
              || deduplicatedTargetList[targetCount-1][1] != rogue.sidebarLocationList[i][1])
					{
              deduplicatedTargetList[targetCount][0] = rogue.sidebarLocationList[i][0];
              deduplicatedTargetList[targetCount][1] = rogue.sidebarLocationList[i][1];
              if (rogue.sidebarLocationList[i][0] == targetX
                  && rogue.sidebarLocationList[i][1] == targetY)
							{
                  selectedIndex = targetCount;
              }
              targetCount++;
          }
      }
  }

  for (i = reverseDirection ? targetCount - 1 : 0; reverseDirection ? i >= 0 : i < targetCount; reverseDirection ? i-- : i++) {
      n = (selectedIndex + i) % targetCount;
      newX = deduplicatedTargetList[n][0];
      newY = deduplicatedTargetList[n][1];
      if ((newX != player.xLoc || newY != player.yLoc)
          && (newX != targetX || newY != targetY)
          && (!requireOpenPath || openPathBetween(player.xLoc, player.yLoc, newX, newY)))
			{
          brogueAssert(coordinatesAreInMap(newX, newY));
          brogueAssert(n >= 0 && n < targetCount);
          monst = monsterAtLoc(newX, newY);
          if (monst) {
              if (monstersAreEnemies(player, monst)) {
                  if (targetEnemies) {
                      return [newX, newY];
                  }
              } else {
                  if (targetAllies) {
                      return [newX, newY];
                  }
              }
          }
          theItem = itemAtLoc(newX, newY);
          if (!monst && theItem && targetItems) {
              return [newX, newY];
          }
          if (!monst && !theItem && targetTerrain) {
              return [newX, newY];
          }
      }
  }
  return null;
}

// Returns how far it went before hitting something.
function hiliteTrajectory( coordinateList /* short[DCOLS][2] */, numCells, eraseHiliting, passThroughMonsters, /* color */ hiliteColor)
{
	let x, y, i;
	let monst;	// creature *

	for (i=0; i<numCells; i++) {
		x = coordinateList[i][0];
		y = coordinateList[i][1];
		if (eraseHiliting) {
			refreshDungeonCell(x, y);
		} else {
			hiliteCell(x, y, hiliteColor, 20, true);
		}

		if (cellHasTerrainFlag(x, y, (T_OBSTRUCTS_VISION | T_OBSTRUCTS_PASSABILITY))
			|| pmap[x][y].flags & (HAS_PLAYER))
		{
			i++;
			break;
		} else if (!(pmap[x][y].flags & DISCOVERED)) {
			break;
		} else if (!passThroughMonsters && pmap[x][y].flags & (HAS_MONSTER)
				   && (playerCanSee(x, y) || player.status[STATUS_TELEPATHIC]))
	  {
			monst = monsterAtLoc(x, y);
			if (!(monst.bookkeepingFlags & MB_SUBMERGED)
				&& !monsterIsHidden(monst, player))
			{
				i++;
				break;
			}
		}
	}
	return i;
}

// Event is optional. Returns true if the event should be executed by the parent function.
async function moveCursor(
				   targetLoc, // short[2],
				   returnEvent,	// rogueEvent *
				   state,			// buttonState *
				   colorsDance,
				   keysMoveCursor,
				   targetCanLeaveMap)
{
	let keystroke;
	let moveIncrement;
	let buttonInput;
	let cursorMovementCommand, again, movementKeystroke, sidebarHighlighted;
	const theEvent = rogueEvent();

	const cursor = rogue.cursorLoc; // shorthand
	cursor[0] = targetLoc[0];
	cursor[1] = targetLoc[1];

	const result = {
		targetConfirmed: false,
		canceled: false,
		tabKey: false,
		executeEvent: false,
		targetLoc: targetLoc, // reference same one so it is in the results
	};

	sidebarHighlighted = false;

	do {
		again = false;
		cursorMovementCommand = false;
		movementKeystroke = false;

    // oldRNG = rogue.RNG;
    // rogue.RNG = RNG_COSMETIC;
		// assureCosmeticRNG();

		if (state) { // Also running a button loop.

			// Update the display.
			overlayDisplayBuffer(state.dbuf, NULL);

			// Get input.
			await nextBrogueEvent(theEvent, false, colorsDance, true);

			// Process the input.
			buttonInput = await processButtonInput(state, theEvent);

			if (buttonInput != -1) {
				state.buttonDepressed = state.buttonFocused = -1;
				drawButtonsInState(state);
			}

			// Revert the display.
			overlayDisplayBuffer(state.rbuf, NULL);

		} else { // No buttons to worry about.
			await nextBrogueEvent(theEvent, false, colorsDance, true);
		}
		// restoreRNG();

		if (theEvent.eventType == MOUSE_UP || theEvent.eventType == MOUSE_ENTERED_CELL) {
			if (theEvent.param1 >= 0
				&& theEvent.param1 < mapToWindowX(0)
				&& theEvent.param2 >= 0
				&& theEvent.param2 < ROWS - 1
				&& rogue.sidebarLocationList[theEvent.param2][0] > -1) {

				// If the cursor is on an entity in the sidebar.
				cursor[0] = rogue.sidebarLocationList[theEvent.param2][0];
				cursor[1] = rogue.sidebarLocationList[theEvent.param2][1];
				sidebarHighlighted = true;
				cursorMovementCommand = true;
				refreshSideBar(cursor[0], cursor[1], false);
				if (theEvent.eventType == MOUSE_UP) {
					result.targetConfirmed = true;
				}
			} else if (coordinatesAreInMap(windowToMapX(theEvent.param1), windowToMapY(theEvent.param2))
                       || targetCanLeaveMap && theEvent.eventType != MOUSE_UP)
			{
				// If the cursor is in the map area, or is allowed to leave the map and it isn't a click.
				if (theEvent.eventType == MOUSE_UP
					&& !theEvent.shiftKey
					&& (theEvent.controlKey || (cursor[0] == windowToMapX(theEvent.param1) && cursor[1] == windowToMapY(theEvent.param2))))
				{
					result.targetConfirmed = true;
				}
				cursor[0] = windowToMapX(theEvent.param1);
				cursor[1] = windowToMapY(theEvent.param2);
				cursorMovementCommand = true;
			} else {
				cursorMovementCommand = false;
				again = theEvent.eventType != MOUSE_UP;
			}
		} else if (theEvent.eventType == KEYSTROKE) {
			keystroke = theEvent.param1;
			moveIncrement = ( (theEvent.controlKey || theEvent.shiftKey) ? 5 : 1 );
			keystroke = stripShiftFromMovementKeystroke(keystroke);
			switch(keystroke) {
				case LEFT_ARROW:
				case LEFT_KEY:
				case NUMPAD_4:
					if (keysMoveCursor && cursor[0] > 0) {
						cursor[0] -= moveIncrement;
					}
					cursorMovementCommand = movementKeystroke = keysMoveCursor;
					break;
				case RIGHT_ARROW:
				case RIGHT_KEY:
				case NUMPAD_6:
					if (keysMoveCursor && cursor[0] < DCOLS - 1) {
						cursor[0] += moveIncrement;
					}
					cursorMovementCommand = movementKeystroke = keysMoveCursor;
					break;
				case UP_ARROW:
				case UP_KEY:
				case NUMPAD_8:
					if (keysMoveCursor && cursor[1] > 0) {
						cursor[1] -= moveIncrement;
					}
					cursorMovementCommand = movementKeystroke = keysMoveCursor;
					break;
				case DOWN_ARROW:
				case DOWN_KEY:
				case NUMPAD_2:
					if (keysMoveCursor && cursor[1] < DROWS - 1) {
						cursor[1] += moveIncrement;
					}
					cursorMovementCommand = movementKeystroke = keysMoveCursor;
					break;
				case UPLEFT_KEY:
				case NUMPAD_7:
					if (keysMoveCursor && cursor[0] > 0 && cursor[1] > 0) {
						cursor[0] -= moveIncrement;
						cursor[1] -= moveIncrement;
					}
					cursorMovementCommand = movementKeystroke = keysMoveCursor;
					break;
				case UPRIGHT_KEY:
				case NUMPAD_9:
					if (keysMoveCursor && cursor[0] < DCOLS - 1 && cursor[1] > 0) {
						cursor[0] += moveIncrement;
						cursor[1] -= moveIncrement;
					}
					cursorMovementCommand = movementKeystroke = keysMoveCursor;
					break;
				case DOWNLEFT_KEY:
				case NUMPAD_1:
					if (keysMoveCursor && cursor[0] > 0 && cursor[1] < DROWS - 1) {
						cursor[0] -= moveIncrement;
						cursor[1] += moveIncrement;
					}
					cursorMovementCommand = movementKeystroke = keysMoveCursor;
					break;
				case DOWNRIGHT_KEY:
				case NUMPAD_3:
					if (keysMoveCursor && cursor[0] < DCOLS - 1 && cursor[1] < DROWS - 1) {
						cursor[0] += moveIncrement;
						cursor[1] += moveIncrement;
					}
					cursorMovementCommand = movementKeystroke = keysMoveCursor;
					break;
				case TAB_KEY:
        case SHIFT_TAB_KEY:
				case NUMPAD_0:
					result.tabKey = true;
					break;
				case RETURN_KEY:
				case ENTER_KEY:
					result.targetConfirmed = true;
					break;
				case ESCAPE_KEY:
				case ACKNOWLEDGE_KEY:
					result.canceled = true;
					break;
				default:
					break;
			}
		} else if (theEvent.eventType == RIGHT_MOUSE_UP) {
			// do nothing
		} else {
			again = true;
		}

		if (sidebarHighlighted
			&& (!(pmap[cursor[0]][cursor[1]].flags & (HAS_PLAYER | HAS_MONSTER))
                || !canSeeMonster(monsterAtLoc(cursor[0], cursor[1])))
			&& (!(pmap[cursor[0]][cursor[1]].flags & HAS_ITEM) || !playerCanSeeOrSense(cursor[0], cursor[1]))
			&& (!cellHasTMFlag(cursor[0], cursor[1], TM_LIST_IN_SIDEBAR) || !playerCanSeeOrSense(cursor[0], cursor[1])))
		{
			// The sidebar is highlighted but the cursor is not on a visible item, monster or terrain. Un-highlight the sidebar.
			refreshSideBar(-1, -1, false);
			sidebarHighlighted = false;
		}

		if (targetCanLeaveMap && !movementKeystroke) {
			// permit it to leave the map by up to 1 space in any direction if mouse controlled.
			cursor[0] = clamp(cursor[0], -1, DCOLS);
			cursor[1] = clamp(cursor[1], -1, DROWS);
		} else {
			cursor[0] = clamp(cursor[0], 0, DCOLS - 1);
			cursor[1] = clamp(cursor[1], 0, DROWS - 1);
		}
	} while (again && (!event || !cursorMovementCommand));

	if (returnEvent) {
		returnEvent.copy(theEvent);
	}

	if (sidebarHighlighted) {
		// Don't leave the sidebar highlighted when we exit.
		refreshSideBar(-1, -1, false);
		sidebarHighlighted = false;
	}

	targetLoc[0] = cursor[0];
	targetLoc[1] = cursor[1];

	result.executeEvent = !cursorMovementCommand;
	return result; // !cursorMovementCommand;
}

async function pullMouseClickDuringPlayback( loc /* short[2] */) {
	const theEvent = rogueEvent();

  brogueAssert(rogue.playbackMode);
	await nextBrogueEvent(theEvent, false, false, false);
	loc[0] = windowToMapX(theEvent.param1);
	loc[1] = windowToMapY(theEvent.param2);
}

// Return true if a target is chosen, or false if canceled.
async function chooseTarget( returnLoc,	// short[2]
					 maxDistance,
					 stopAtTarget,
					 autoTarget,
					 targetAllies,
					 passThroughCreatures,
           trajectoryColor /* color */)
{
	const originLoc = [-1, -1], targetLoc = [-1, -1], oldTargetLoc = [-1, -1], coordinates = ARRAY(DCOLS, () => [-1, -1] ); // short[DCOLS][2],
	let numCells, i, distance, newX, newY;
	let monst;		// creature *
	let canceled, targetConfirmed, tabKey, cursorInTrajectory, focusedOnSomething = false;
	let moveResult;
	const event = rogueEvent();
    // short oldRNG;
  const trajColor = color(); // *trajectoryColor;
	trajColor.copy(trajectoryColor);

  normColor(trajColor, 100, 10);

	if (rogue.playbackMode) {
		// In playback, pull the next event (a mouseclick) and use that location as the target.
		await pullMouseClickDuringPlayback(returnLoc);
		rogue.cursorLoc[0] = rogue.cursorLoc[1] = -1;
		return true;
	}

  // oldRNG = rogue.RNG;
  // rogue.RNG = RNG_COSMETIC;
	// assureCosmeticRNG();

	originLoc[0] = player.xLoc;
	originLoc[1] = player.yLoc;

	targetLoc[0] = oldTargetLoc[0] = player.xLoc;
	targetLoc[1] = oldTargetLoc[1] = player.yLoc;

	if (autoTarget) {
		if (rogue.lastTarget
			&& canSeeMonster(rogue.lastTarget)
			&& (targetAllies == (rogue.lastTarget.creatureState == MONSTER_ALLY))
			&& rogue.lastTarget.depth == rogue.depthLevel
			&& !(rogue.lastTarget.bookkeepingFlags & MB_IS_DYING)
			&& openPathBetween(player.xLoc, player.yLoc, rogue.lastTarget.xLoc, rogue.lastTarget.yLoc))
		{
			monst = rogue.lastTarget;
		} else {
			//rogue.lastTarget = NULL;
			const loc = nextTargetAfter(targetLoc[0], targetLoc[1], !targetAllies, targetAllies, false, false, true, false);
			if (loc) {
				newX = loc[0];
				newY = loc[1];
        targetLoc[0] = newX;
        targetLoc[1] = newY;
      }
      monst = monsterAtLoc(targetLoc[0], targetLoc[1]);
		}
		if (monst) {
			targetLoc[0] = monst.xLoc;
			targetLoc[1] = monst.yLoc;
			refreshSideBar(monst.xLoc, monst.yLoc, false);
			focusedOnSomething = true;
		}
	}

	numCells = getLineCoordinates(coordinates, originLoc, targetLoc);
	if (maxDistance > 0) {
		numCells = min(numCells, maxDistance);
	}
	if (stopAtTarget) {
		numCells = min(numCells, distanceBetween(player.xLoc, player.yLoc, targetLoc[0], targetLoc[1]));
	}

	targetConfirmed = canceled = tabKey = false;

	do {
		printLocationDescription(targetLoc[0], targetLoc[1]);

		if (canceled) {
			refreshDungeonCell(oldTargetLoc[0], oldTargetLoc[1]);
			hiliteTrajectory(coordinates, numCells, true, passThroughCreatures, trajectoryColor);
			confirmMessages();
			rogue.cursorLoc[0] = rogue.cursorLoc[1] = -1;
			// restoreRNG();
			return false;
		}

		if (tabKey) {
			const loc = nextTargetAfter(targetLoc[0], targetLoc[1], !targetAllies, targetAllies, false, false, true, event.shiftKey);
			if (loc) {
				newX = loc[0];
				newY = loc[1];
        targetLoc[0] = newX;
        targetLoc[1] = newY;
      }
		}

		monst = monsterAtLoc(targetLoc[0], targetLoc[1]);
		if (monst != NULL && monst !== player && canSeeMonster(monst)) {
			focusedOnSomething = true;
    } else if (playerCanSeeOrSense(targetLoc[0], targetLoc[1])
               && (pmap[targetLoc[0]][targetLoc[1]].flags & HAS_ITEM) || cellHasTMFlag(targetLoc[0], targetLoc[1], TM_LIST_IN_SIDEBAR))
	  {
        focusedOnSomething = true;
		} else if (focusedOnSomething) {
			refreshSideBar(-1, -1, false);
			focusedOnSomething = false;
		}
    if (focusedOnSomething) {
			refreshSideBar(targetLoc[0], targetLoc[1], false);
    }

		refreshDungeonCell(oldTargetLoc[0], oldTargetLoc[1]);
		hiliteTrajectory(coordinates, numCells, true, passThroughCreatures, trajColor);

		if (!targetConfirmed) {
			numCells = getLineCoordinates(coordinates, originLoc, targetLoc);
			if (maxDistance > 0) {
				numCells = min(numCells, maxDistance);
			}

			if (stopAtTarget) {
				numCells = min(numCells, distanceBetween(player.xLoc, player.yLoc, targetLoc[0], targetLoc[1]));
			}
			distance = hiliteTrajectory(coordinates, numCells, false, passThroughCreatures, trajColor);
			cursorInTrajectory = false;
			for (i=0; i<distance; i++) {
				if (coordinates[i][0] == targetLoc[0] && coordinates[i][1] == targetLoc[1]) {
					cursorInTrajectory = true;
					break;
				}
			}
			hiliteCell(targetLoc[0], targetLoc[1], white, (cursorInTrajectory ? 100 : 35), true);
		}

		oldTargetLoc[0] = targetLoc[0];
		oldTargetLoc[1] = targetLoc[1];
		// restoreRNG();
		moveResult = await moveCursor( /* &targetConfirmed, &canceled, &tabKey, */ targetLoc, event, NULL, false, true, false);
		targetConfirmed = moveResult.targetConfirmed;
		canceled = moveResult.canceled;
		tabKey = moveResult.tabKey;
		// assureCosmeticRNG();
		if (event.eventType == RIGHT_MOUSE_UP) { // Right mouse cancels.
			canceled = true;
		}
	} while (!moveResult || !moveResult.targetConfirmed);

	if (maxDistance > 0) {
		numCells = min(numCells, maxDistance);
	}
	hiliteTrajectory(coordinates, numCells, true, passThroughCreatures, trajectoryColor);
	refreshDungeonCell(oldTargetLoc[0], oldTargetLoc[1]);

	if (originLoc[0] == targetLoc[0] && originLoc[1] == targetLoc[1]) {
		confirmMessages();
		// restoreRNG();
		rogue.cursorLoc[0] = rogue.cursorLoc[1] = -1;
		return false;
	}

	monst = monsterAtLoc(targetLoc[0], targetLoc[1]);
	if (monst && monst !== player && canSeeMonster(monst)) {
		rogue.lastTarget = monst;
	}

	returnLoc[0] = targetLoc[0];
	returnLoc[1] = targetLoc[1];
	// restoreRNG();
	rogue.cursorLoc[0] = rogue.cursorLoc[1] = -1;
	return true;
}


function identifyItemKind( /* item */ theItem) {
  let theTable;	// itemTable *
	let tableCount, i, lastItem;

    theTable = tableForItemCategory(theItem.category, NULL);
    if (theTable) {
			theItem.flags &= ~ITEM_KIND_AUTO_ID;

	    tableCount = 0;
	    lastItem = -1;

	    switch (theItem.category) {
	        case SCROLL:
	            tableCount = NUMBER_SCROLL_KINDS;
	            break;
	        case POTION:
	            tableCount = NUMBER_POTION_KINDS;
	            break;
	        case WAND:
	            tableCount = NUMBER_WAND_KINDS;
	            break;
	        case STAFF:
	            tableCount = NUMBER_STAFF_KINDS;
	            break;
	        case RING:
	            tableCount = NUMBER_RING_KINDS;
	            break;
	        default:
	            break;
	    }
	    if ((theItem.category & RING)
	        && theItem.enchant1 <= 0)
			{
	        theItem.flags |= ITEM_IDENTIFIED;
	    }

	    if ((theItem.category & WAND)
	        && theTable[theItem.kind].range.lowerBound == theTable[theItem.kind].range.upperBound)
			{
	        theItem.flags |= ITEM_IDENTIFIED;
	    }
	    if (tableCount) {
	        theTable[theItem.kind].identified = true;
	        for (i=0; i<tableCount; i++) {
	            if (!(theTable[i].identified)) {
	                if (lastItem != -1) {
	                    return; // At least two unidentified items remain.
	                }
	                lastItem = i;
	            }
	        }
	        if (lastItem != -1) {
	            // Exactly one unidentified item remains; identify it.
	            theTable[lastItem].identified = true;
	        }
	    }
    }
}

function autoIdentify(/* item */ theItem) {
	let quantityBackup;
	const buf = STRING(), oldName = STRING(), newName = STRING();

    if (tableForItemCategory(theItem.category, NULL)
        && !tableForItemCategory(theItem.category, NULL)[theItem.kind].identified)
		{
        identifyItemKind(theItem);
        quantityBackup = theItem.quantity;
        theItem.quantity = 1;
        itemName(theItem, newName, false, true, NULL);
        theItem.quantity = quantityBackup;
        sprintf(buf, "(It must %s %s.)",
                ((theItem.category & (POTION | SCROLL)) ? "have been" : "be"),
                newName);
        message(buf, itemMessageColor, false);
    }

    if ((theItem.category & (WEAPON | ARMOR))
        && (theItem.flags & ITEM_RUNIC)
        && !(theItem.flags & ITEM_RUNIC_IDENTIFIED))
		{
        itemName(theItem, oldName, false, false, NULL);
        theItem.flags |= (ITEM_RUNIC_IDENTIFIED | ITEM_RUNIC_HINTED);
        itemName(theItem, newName, true, true, NULL);
        sprintf(buf, "(Your %s must be %s.)", oldName, newName);
        message(buf, itemMessageColor, false);
    }
}

// returns whether the item disappeared
async function hitMonsterWithProjectileWeapon( /* creature */ thrower, /* creature */ monst, /* item */ theItem) {
	const buf = STRING(), theItemName = STRING(), targetName = STRING(), armorRunicString = STRING(); // char[DCOLS]
	let thrownWeaponHit;
	let equippedWeapon;		// item *
	let damage;

	if (!(theItem.category & WEAPON)) {
		return false;
	}

	// armorRunicString[0] = '\0';

	itemName(theItem, theItemName, false, false, NULL);
	monsterName(targetName, monst, true);

	monst.status[STATUS_ENTRANCED] = 0;

	if (monst !== player
		&& monst.creatureMode != MODE_PERM_FLEEING
		&& (monst.creatureState != MONSTER_FLEEING || monst.status[STATUS_MAGICAL_FEAR])
		&& !(monst.bookkeepingFlags & MB_CAPTIVE)
        && monst.creatureState != MONSTER_ALLY)
	{
		monst.creatureState = MONSTER_TRACKING_SCENT;
		if (monst.status[STATUS_MAGICAL_FEAR]) {
			monst.status[STATUS_MAGICAL_FEAR] = 1;
		}
	}

	if (thrower === player) {
		equippedWeapon = rogue.weapon;
		equipItem(theItem, true);
		thrownWeaponHit = attackHit(player, monst);
		if (equippedWeapon) {
			equipItem(equippedWeapon, true);
		} else {
			unequipItem(theItem, true);
		}
	} else {
		thrownWeaponHit = attackHit(thrower, monst);
	}

	if (thrownWeaponHit) {
		damage = monst.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE) ? 0 :
				  (randClump(theItem.damage) * fp_damageFraction(fp_netEnchant(theItem)) >> FP_BASE);

		if (monst === player) {
			const runicResult = await applyArmorRunicEffect(thrower, damage, false);
     armorRunicString = runicResult.message;
     damage = runicResult.damage;
		}

		if (await inflictDamage(thrower, monst, damage, red, false)) { // monster killed
			sprintf(buf, "the %s %s %s.",
                    theItemName,
                    (monst.info.flags & MONST_INANIMATE) ? "destroyed" : "killed",
                    targetName);
			message(buf, messageColorFromVictim(monst), false);
		} else {
			sprintf(buf, "the %s hit %s.", theItemName, targetName);
			if (theItem.flags & ITEM_RUNIC) {
				await magicWeaponHit(monst, theItem, false);
			}
			message(buf, messageColorFromVictim(monst), false);
		}
    await moralAttack(thrower, monst);
		if ( strlen(armorRunicString) ) {
			message(armorRunicString, false);
		}
		return true;
	} else {
		theItem.flags &= ~ITEM_PLAYER_AVOIDS; // Don't avoid thrown weapons that missed.
		sprintf(buf, "the %s missed %s.", theItemName, targetName);
		message(buf, false);
		return false;
	}
}


async function throwItem(/* item */ theItem, /* creature */ thrower, targetLoc /* short[2] */, maxDistance) {
	const listOfCoordinates = ARRAY(MAX_BOLT_LENGTH, () => [-1, -1] );
	const originLoc = [-1, -1];
	let i, x, y, numCells;
	let monst = NULL;		// creature *
	const buf = STRING(), buf2 = STRING(), buf3 = STRING(); // char[COLS*3];
	let displayChar;
	const multColor = color();
	let dropLoc = [-1, -1];
	let hitSomethingSolid = false, fastForward = false;
  let layer;	// enum dungeonLayers

	theItem.flags |= ITEM_PLAYER_AVOIDS; // Avoid thrown items, unless it's a weapon that misses a monster.

	x = originLoc[0] = thrower.xLoc;
	y = originLoc[1] = thrower.yLoc;

	numCells = getLineCoordinates(listOfCoordinates, originLoc, targetLoc);

	thrower.ticksUntilTurn = thrower.attackSpeed;

	if (thrower !== player
        && (pmap[originLoc[0]][originLoc[1]].flags & IN_FIELD_OF_VIEW))
	{
		monsterName(buf2, thrower, true);
		itemName(theItem, buf3, false, true, NULL);
		sprintf(buf, "%s hurls %s.", buf2, buf3);
		message(buf, false);
	}

	for (i=0; i<numCells && i < maxDistance; i++) {
		x = listOfCoordinates[i][0];
		y = listOfCoordinates[i][1];

		if (pmap[x][y].flags & (HAS_MONSTER | HAS_PLAYER)) {
			monst = monsterAtLoc(x, y);
      if (!(monst.bookkeepingFlags & MB_SUBMERGED)) {
//			if (projectileReflects(thrower, monst) && i < DCOLS*2) {
//				if (projectileReflects(thrower, monst)) { // if it scores another reflection roll, reflect at caster
//					numCells = reflectBolt(originLoc[0], originLoc[1], listOfCoordinates, i, true);
//				} else {
//					numCells = reflectBolt(-1, -1, listOfCoordinates, i, false); // otherwise reflect randomly
//				}
//
//				monsterName(buf2, monst, true);
//				itemName(theItem, buf3, false, false, NULL);
//				sprintf(buf, "%s deflect%s the %s", buf2, (monst === player ? "" : "s"), buf3);
//				combatMessage(buf, 0);
//				continue;
//			}
        if ((theItem.category & WEAPON)
            && theItem.kind != INCENDIARY_DART
            && await hitMonsterWithProjectileWeapon(thrower, monst, theItem))
				{
            return;
        }
        break;
      }
  	}

    // We hit something!
    if (cellHasTerrainFlag(x, y, (T_OBSTRUCTS_PASSABILITY | T_OBSTRUCTS_VISION))) {
        if ((theItem.category & WEAPON)
            && (theItem.kind == INCENDIARY_DART)
            && (cellHasTerrainFlag(x, y, T_IS_FLAMMABLE) || (pmap[x][y].flags & (HAS_MONSTER | HAS_PLAYER))))
				{
            // Incendiary darts thrown at flammable obstructions (foliage, wooden barricades, doors) will hit the obstruction
            // instead of bursting a cell earlier.
        } else if (cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)
                   && cellHasTMFlag(x, y, TM_PROMOTES_ON_PLAYER_ENTRY)
                   && tileCatalog[pmap[x][y].layers[layerWithTMFlag(x, y, TM_PROMOTES_ON_PLAYER_ENTRY)]].flags & T_OBSTRUCTS_PASSABILITY)
			  {
            layer = layerWithTMFlag(x, y, TM_PROMOTES_ON_PLAYER_ENTRY);
            if (tileCatalog[pmap[x][y].layers[layer]].flags & T_OBSTRUCTS_PASSABILITY) {
                message(tileCatalog[pmap[x][y].layers[layer]].flavorText, false);
                await promoteTile(x, y, layer, false);
            }
        } else {
            i--;
            if (i >= 0) {
                x = listOfCoordinates[i][0];
                y = listOfCoordinates[i][1];
            } else { // it was aimed point-blank into an obstruction
                x = thrower.xLoc;
                y = thrower.yLoc;
            }
        }
        hitSomethingSolid = true;
        break;
    }

		if (playerCanSee(x, y)) { // show the graphic
			const app = getCellAppearance(x, y);
			app.foreColor.copy(theItem.foreColor);
			if (playerCanDirectlySee(x, y)) {
				colorMultiplierFromDungeonLight(x, y, multColor);
				applyColorMultiplier(app.foreColor, multColor);
			} else { // clairvoyant visible
				applyColorMultiplier(app.foreColor, clairvoyanceColor);
			}
			plotCharWithColor(theItem.displayChar, mapToWindowX(x), mapToWindowY(y), app.foreColor, app.backColor);

			if (!fastForward) {
				fastForward = rogue.playbackFastForward || await pauseBrogue(25);
			}

			refreshDungeonCell(x, y);
		}

		if (x == targetLoc[0] && y == targetLoc[1]) { // reached its target
			break;
		}
	}

	if ((theItem.category & POTION) && (hitSomethingSolid || !cellHasTerrainFlag(x, y, T_AUTO_DESCENT))) {
		if (theItem.kind == POTION_CONFUSION || theItem.kind == POTION_POISON
			|| theItem.kind == POTION_PARALYSIS || theItem.kind == POTION_INCINERATION
			|| theItem.kind == POTION_DARKNESS || theItem.kind == POTION_LICHEN
			|| theItem.kind == POTION_DESCENT)
		{
			switch (theItem.kind) {
				case POTION_POISON:
					strcpy(buf, "the flask shatters and a deadly purple cloud billows out!");
					await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_POISON_GAS_CLOUD_POTION], true, false);
					message(buf, false);
					break;
				case POTION_CONFUSION:
					strcpy(buf, "the flask shatters and a multi-hued cloud billows out!");
					await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_CONFUSION_GAS_CLOUD_POTION], true, false);
					message(buf, false);
					break;
				case POTION_PARALYSIS:
					strcpy(buf, "the flask shatters and a cloud of pink gas billows out!");
					await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_PARALYSIS_GAS_CLOUD_POTION], true, false);
					message(buf, false);
					break;
				case POTION_INCINERATION:
					strcpy(buf, "the flask shatters and its contents burst violently into flame!");
					message(buf, false);
					await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_INCINERATION_POTION], true, false);
					break;
				case POTION_DARKNESS:
					strcpy(buf, "the flask shatters and the lights in the area start fading.");
					await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_DARKNESS_POTION], true, false);
					message(buf, false);
					break;
				case POTION_DESCENT:
					strcpy(buf, "as the flask shatters, the ground vanishes!");
					message(buf, false);
					await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_HOLE_POTION], true, false);
					break;
				case POTION_LICHEN:
					strcpy(buf, "the flask shatters and deadly spores spill out!");
					message(buf, false);
					await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_LICHEN_PLANTED], true, false);
					break;
			}

			autoIdentify(theItem);

			refreshDungeonCell(x, y);

			//if (pmap[x][y].flags & (HAS_MONSTER | HAS_PLAYER)) {
			//	monst = monsterAtLoc(x, y);
			//	applyInstantTileEffectsToCreature(monst);
			//}
		} else {
			if (cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)) {
				strcpy(buf2, "against");
			} else if (tileCatalog[pmap[x][y].layers[highestPriorityLayer(x, y, false)]].mechFlags & TM_STAND_IN_TILE) {
				strcpy(buf2, "into");
			} else {
				strcpy(buf2, "on");
			}
			sprintf(buf, "the flask shatters and %s liquid splashes harmlessly %s %s.",
					potionTable[theItem.kind].flavor, buf2, tileText(x, y));
			message(buf, false);
			if (theItem.kind == POTION_HALLUCINATION && (theItem.flags & ITEM_MAGIC_DETECTED)) {
				autoIdentify(theItem);
			}
		}
		return; // potions disappear when they break
	}
	if ((theItem.category & WEAPON) && theItem.kind == INCENDIARY_DART) {
		await spawnDungeonFeature(x, y, dungeonFeatureCatalog[DF_DART_EXPLOSION], true, false);
		if (pmap[x][y].flags & (HAS_MONSTER | HAS_PLAYER)) {
			await exposeCreatureToFire(monsterAtLoc(x, y));
		}
		return;
	}
	dropLoc = getQualifyingLocNear(x, y, true, 0, (T_OBSTRUCTS_ITEMS | T_OBSTRUCTS_PASSABILITY), (HAS_ITEM), false, false);
	await placeItem(theItem, dropLoc[0], dropLoc[1]);
	refreshDungeonCell(dropLoc[0], dropLoc[1]);
}


async function throwCommand( /* item */ theItem) {
	let thrownItem; // item *
	const buf = STRING(), theName = STRING(); // char[COLS];
	const command = []; // unsigned char[10];
	let maxDistance, zapTarget = [-1, -1], originLoc = [-1, -1], quantity;
	let autoTarget;

	command[0] = THROW_KEY;
	if (theItem == NULL) {
		theItem = await promptForItemOfType((ALL_ITEMS), 0, 0,
                                      KEYBOARD_LABELS ? "Throw what? (a-z, shift for more info; or <esc> to cancel)" : "Throw what?", true);
	}
	if (theItem == NULL) {
		return;
	}

	quantity = theItem.quantity;
	theItem.quantity = 1;
	itemName(theItem, theName, false, false, NULL);
	theItem.quantity = quantity;

	command[1] = theItem.inventoryLetter;
	confirmMessages();

	if (((theItem.flags & ITEM_EQUIPPED) || theItem.timesEnchanted > 0)
        && theItem.quantity <= 1)
	{
		sprintf(buf, "Are you sure you want to throw your %s?", theName);
		if (!await confirm(buf, false)) {
			return;
		}
    if (theItem.flags & ITEM_CURSED) {
        sprintf(buf, "You cannot unequip your %s; it appears to be cursed.", theName);
        message(buf, itemMessageColor, false);
        return;
    }
	}

	sprintf(buf, "Throw %s %s where? (<hjklyubn>, mouse, or <tab>)",
			(theItem.quantity > 1 ? "a" : "your"),
			theName);
	await temporaryMessage(buf, false);
	maxDistance = (12 + 2 * max(rogue.strength - player.weaknessAmount - 12, 2));
	autoTarget = (theItem.category & (WEAPON | POTION)) ? true : false;
	if (await chooseTarget(zapTarget, maxDistance, true, autoTarget, false, false, red)) {
    if ((theItem.flags & ITEM_EQUIPPED) && theItem.quantity <= 1) {
        unequipItem(theItem, false);
    }
		// command[2] = '\0';
		recordKeystrokeSequence(command);
		recordMouseClick(mapToWindowX(zapTarget[0]), mapToWindowY(zapTarget[1]), true, false);

		confirmMessages();

		thrownItem = generateItem(ALL_ITEMS, -1);
		copyItem(thrownItem, theItem); // clone the item
		thrownItem.flags &= ~ITEM_EQUIPPED;
		thrownItem.quantity = 1;

		itemName(thrownItem, theName, false, false, NULL);
		originLoc[0] = player.xLoc;
		originLoc[1] = player.yLoc;

		await throwItem(thrownItem, player, zapTarget, maxDistance);
	} else {
		return;
	}

	// Now decrement or delete the thrown item out of the inventory.
	if (theItem.quantity > 1) {
		theItem.quantity--;
	} else {
		removeItemFromChain(theItem, packItems);
		deleteItem(theItem);
	}
	await playerTurnEnded();
}

async function relabel(/* item */ theItem) {
  let oldItem;	// item *
	const buf = STRING(), theName = STRING();
	let newLabel;
	const command = []; // char[10];

  if (!KEYBOARD_LABELS && !rogue.playbackMode) {
      return;
  }
	if (theItem == NULL) {
 		theItem = await promptForItemOfType((ALL_ITEMS), 0, 0,
                                    KEYBOARD_LABELS ? "Relabel what? (a-z, shift for more info; or <esc> to cancel)" : "Relabel what?", true);
 	}
	if (theItem == NULL) {
 		return;
 	}
  await temporaryMessage("New letter? (a-z)", false);
  newLabel = '';
  do {
      newLabel = await nextKeyPress(true);
  } while (!strlen(newLabel));

  if (newLabel >= 'A' && newLabel <= 'Z') {
      newLabel = newLabel.toLowerCase(); // += 'a' - 'A'; // lower-case.
  }
  if (newLabel >= 'a' && newLabel <= 'z') {
      if (newLabel != theItem.inventoryLetter) {
          command[0] = RELABEL_KEY;
          command[1] = theItem.inventoryLetter;
          command[2] = newLabel;
          command[3] = '';
          recordKeystrokeSequence(command);

          oldItem = itemOfPackLetter(newLabel);
          if (oldItem) {
              oldItem.inventoryLetter = theItem.inventoryLetter;
              itemName(oldItem, theName, true, true, NULL);
              sprintf(buf, "Relabeled %s as (%c);", theName, oldItem.inventoryLetter);
              message(buf, itemMessageColor, false);
          }
          theItem.inventoryLetter = newLabel;
          itemName(theItem, theName, true, true, NULL);
          sprintf(buf, "%{s}elabeled %s as (%c).", oldItem ? " r" : "R", theName, newLabel);
          message(buf, itemMessageColor, false);
      } else {
          itemName(theItem, theName, true, true, NULL);
          sprintf(buf, "%s %s already labeled (%c).",
                  theName,
                  theItem.quantity == 1 ? "is" : "are",
                  theItem.inventoryLetter);
          message(buf, itemMessageColor, false);
      }
  }
}

// If the blink trajectory lands in lava based on the player's knowledge, abort.
// If the blink trajectory might land in lava based on the player's knowledge,
// prompt for confirmation.
async function playerCancelsBlinking(originLoc /* short[2] */, targetLoc /* short[2] */, maxDistance) {
  const coordinates = ARRAY(DCOLS, () => [-1, -1] ), impactLoc = [-1, -1];
  let numCells, i, x, y;
  let certainDeath = false;
  let possibleDeath = false;
  let flags, tFlags, tmFlags;

  if (rogue.playbackMode) {
      return false;
  }

  if (player.status[STATUS_IMMUNE_TO_FIRE]
      || player.status[STATUS_LEVITATING])
	{
      return false;
  }

  getImpactLoc(impactLoc, originLoc, targetLoc, maxDistance > 0 ? maxDistance : DCOLS, true);
  flags = getLocationFlags(impactLoc[0], impactLoc[1], true);
	tFlags = flags.terrainFlags;
	tmFlags = flags.TMFlags;

	if (maxDistance > 0) {
    if ((pmap[impactLoc[0]][impactLoc[1]].flags & DISCOVERED)
        && (tFlags & T_LAVA_INSTA_DEATH)
        && !(tFlags & (T_ENTANGLES | T_AUTO_DESCENT))
				&& !(tmFlags & TM_EXTINGUISHES_FIRE))
		{
        certainDeath = possibleDeath = true;
    }
	} else {
    certainDeath = true;
    numCells = getLineCoordinates(coordinates, originLoc, targetLoc);
    for (i = 0; i < numCells; i++) {
        x = coordinates[i][0];
        y = coordinates[i][1];
        if (pmap[x][y].flags & DISCOVERED) {
            flags = getLocationFlags(x, y, true);
						tFlags = flags.terrainFlags;
            if ((tFlags & (T_LAVA_INSTA_DEATH | T_AUTO_DESCENT))
                && !(tmFlags & TM_EXTINGUISHES_FIRE))
						{
                possibleDeath = true;
            } else if (i >= fp_staffBlinkDistance(2 << FP_BASE) - 1) {
                // Found at least one possible safe landing spot.
                certainDeath = false;
            }
        }
        if (x == impactLoc[0] && y == impactLoc[1]) {
            break;
        }
    }
  }
  if (possibleDeath && certainDeath) {
      message("that would be certain death!", false);
      return true;
  }
  if (possibleDeath
      && ! await confirm("Blink across lava with unknown range?", false))
	{
      return true;
  }
  return false;
}

async function useStaffOrWand(/* item */theItem, /* boolean * */commandsRecorded) {
	const buf = STRING(), buf2 = STRING();
	const command = []; // char[10];
	const zapTarget = [-1, -1], originLoc = [-1, -1];
	let maxDistance, c;
	let autoTarget, targetAllies, autoID, boltKnown, passThroughCreatures, confirmedTarget;
  const theBolt = bolt();
  const trajectoryHiliteColor = color();

	c = 0;
	command[c++] = APPLY_KEY;
	command[c++] = theItem.inventoryLetter;

  if (theItem.charges <= 0 && (theItem.flags & ITEM_IDENTIFIED)) {
      itemName(theItem, buf2, false, false, NULL);
      sprintf(buf, "Your %s has no charges.", buf2);
      message(buf, itemMessageColor, false);
      return false;
  }
  await temporaryMessage("Direction? (<hjklyubn>, mouse, or <tab>; <return> to confirm)", false);
  itemName(theItem, buf2, false, false, NULL);
  sprintf(buf, "Zapping your %s:", buf2);
  printString(buf, mapToWindowX(0), 1, itemMessageColor, black, NULL);

  theBolt.copy(boltCatalog[tableForItemCategory(theItem.category, NULL)[theItem.kind].strengthRequired]);
  if (theItem.category == STAFF) {
      theBolt.magnitude = theItem.enchant1;
  }

  if ((theItem.category & STAFF) && theItem.kind == STAFF_BLINKING
      && theItem.flags & (ITEM_IDENTIFIED | ITEM_MAX_CHARGES_KNOWN))
	{
		maxDistance = fp_staffBlinkDistance(fp_netEnchant(theItem));
  } else {
      maxDistance = -1;
  }
  if (tableForItemCategory(theItem.category, NULL)[theItem.kind].identified) {
      autoTarget = targetAllies = passThroughCreatures = false;
      if (!player.status[STATUS_HALLUCINATING]) {
          if (theBolt.flags & (BF_TARGET_ALLIES | BF_TARGET_ENEMIES)) {
              autoTarget = true;
          }
          if (theBolt.flags & BF_TARGET_ALLIES) {
              targetAllies = true;
          }
      }
      if (theBolt.flags & BF_PASSES_THRU_CREATURES) {
          passThroughCreatures = true;
      }
  } else {
      autoTarget = true;
      targetAllies = false;
      passThroughCreatures = false;
  }
  boltKnown = (((theItem.category & WAND) && wandTable[theItem.kind].identified)
               || ((theItem.category & STAFF) && staffTable[theItem.kind].identified));
  if (!boltKnown) {
      trajectoryHiliteColor.copy(gray);
  } else if (theBolt.backColor == NULL) {
      trajectoryHiliteColor.copy(red);
  } else {
      trajectoryHiliteColor.copy(theBolt.backColor);
  }

  originLoc[0] = player.xLoc;
  originLoc[1] = player.yLoc;
  confirmedTarget = await chooseTarget(zapTarget, maxDistance, false, autoTarget, targetAllies, passThroughCreatures, trajectoryHiliteColor);
  if (confirmedTarget
      && boltKnown
      && theBolt.boltEffect == BE_BLINKING
      && await playerCancelsBlinking(originLoc, zapTarget, maxDistance))
	{
      confirmedTarget = false;
  }
  if (confirmedTarget) {
      command[c] = null;
      if (!(commandsRecorded)) {
          recordKeystrokeSequence(command);
          recordMouseClick(mapToWindowX(zapTarget[0]), mapToWindowY(zapTarget[1]), true, false);
          commandsRecorded = true;
      }
      confirmMessages();

      rogue.featRecord[FEAT_PURE_WARRIOR] = false;

      if (theItem.charges > 0) {
          autoID = await zap(originLoc, zapTarget,
                       theBolt,
                       !boltKnown);	// hide bolt details
          if (autoID) {
              if (!tableForItemCategory(theItem.category, NULL)[theItem.kind].identified) {
                  itemName(theItem, buf2, false, false, NULL);
                  sprintf(buf, "(Your %s must be ", buf2);
                  identifyItemKind(theItem);
                  itemName(theItem, buf2, false, true, NULL);
                  strcat(buf, buf2);
                  strcat(buf, ".)");
                  message(buf, itemMessageColor, false);
              }
          }
      } else {
          itemName(theItem, buf2, false, false, NULL);
          if (theItem.category == STAFF) {
              sprintf(buf, "Your %s fizzles; it must be out of charges for now.", buf2);
          } else {
              sprintf(buf, "Your %s fizzles; it must be depleted.", buf2);
          }
          message(buf, itemMessageColor, false);
          theItem.flags |= ITEM_MAX_CHARGES_KNOWN;
          await playerTurnEnded();
          return false;
      }
  } else {
      return false;
  }
  return true;
}

function summonGuardian( /* item */ theItem) {
    let x = player.xLoc, y = player.yLoc;
    let monst;	// creature *

    monst = generateMonster(MK_CHARM_GUARDIAN, false, false);
    const loc = getQualifyingPathLocNear(x, y, true,
                             T_DIVIDES_LEVEL & avoidedFlagsForMonster((monst.info)) & ~T_SPONTANEOUSLY_IGNITES, HAS_PLAYER,
                             avoidedFlagsForMonster((monst.info)) & ~T_SPONTANEOUSLY_IGNITES, (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS), false);
		monst.xLoc = loc[0];
		monst.yLoc = loc[1];
    monst.bookkeepingFlags |= (MB_FOLLOWER | MB_BOUND_TO_LEADER | MB_DOES_NOT_TRACK_LEADER);
    monst.bookkeepingFlags &= ~MB_JUST_SUMMONED;
    monst.leader = player;
    monst.creatureState = MONSTER_ALLY;
    monst.ticksUntilTurn = monst.info.attackSpeed + 1; // So they don't move before the player's next turn.
    monst.status[STATUS_LIFESPAN_REMAINING] = monst.maxStatus[STATUS_LIFESPAN_REMAINING] = fp_charmGuardianLifespan(fp_netEnchant(theItem));
    pmap[monst.xLoc][monst.yLoc].flags |= HAS_MONSTER;
    fadeInMonster(monst);
}

async function useCharm(/* item */ theItem) {
	let enchant = fp_netEnchant(theItem);

    rogue.featRecord[FEAT_PURE_WARRIOR] = false;

    switch (theItem.kind) {
        case CHARM_HEALTH:
            heal(player, fp_charmHealing(enchant), false);
            message("You feel much healthier.", false);
            break;
        case CHARM_PROTECTION:
            if (fp_charmProtection(enchant) > player.status[STATUS_SHIELDED]) {
                player.status[STATUS_SHIELDED] = fp_charmProtection(enchant);
            }
            player.maxStatus[STATUS_SHIELDED] = player.status[STATUS_SHIELDED];
            if (boltCatalog[BOLT_SHIELDING].backColor) {
                flashMonster(player, boltCatalog[BOLT_SHIELDING].backColor, 100);
            }
            message("A shimmering shield coalesces around you.", false);
            break;
        case CHARM_HASTE:
            haste(player, charmEffectDuration(theItem.kind, theItem.enchant1));
            break;
        case CHARM_FIRE_IMMUNITY:
            player.status[STATUS_IMMUNE_TO_FIRE] = player.maxStatus[STATUS_IMMUNE_TO_FIRE] = charmEffectDuration(theItem.kind, theItem.enchant1);
            if (player.status[STATUS_BURNING]) {
                extinguishFireOnCreature(player);
            }
            message("you no longer fear fire.", false);
            break;
        case CHARM_INVISIBILITY:
            imbueInvisibility(player, charmEffectDuration(theItem.kind, theItem.enchant1));
            message("You shiver as a chill runs up your spine.", false);
            break;
        case CHARM_TELEPATHY:
            makePlayerTelepathic(charmEffectDuration(theItem.kind, theItem.enchant1));
            break;
        case CHARM_LEVITATION:
            player.status[STATUS_LEVITATING] = player.maxStatus[STATUS_LEVITATING] = charmEffectDuration(theItem.kind, theItem.enchant1);
            player.bookkeepingFlags &= ~MB_SEIZED; // break free of holding monsters
            message("you float into the air!", false);
            break;
        case CHARM_SHATTERING:
            message("your charm emits a wave of turquoise light that pierces the nearby walls!", itemMessageColor, false);
            crystalize(fp_charmShattering(enchant));
            break;
        case CHARM_GUARDIAN:
            message("your charm flashes and the form of a mythical guardian coalesces!", itemMessageColor, false);
            summonGuardian(theItem);
            break;
        case CHARM_TELEPORTATION:
            await teleport(player, -1, -1, true);
            break;
        case CHARM_RECHARGING:
            rechargeItems(STAFF);
            break;
        case CHARM_NEGATION:
            await negationBlast("your charm", fp_charmNegationRadius(enchant) + 1); // Add 1 because otherwise radius 1 would affect only the player.
            break;
        default:
            break;
    }
}

async function apply( /* item */theItem, recordCommands) {
	const buf = STRING(), buf2 = STRING();
	let commandsRecorded, revealItemType;
	const command = []; // char[10] = "";
	let c;

	commandsRecorded = !recordCommands;
	c = 0;
	command[c++] = APPLY_KEY;

	revealItemType = false;

	if (!theItem) {
		theItem = await promptForItemOfType((SCROLL|FOOD|POTION|STAFF|WAND|CHARM), 0, 0,
									  KEYBOARD_LABELS ? "Apply what? (a-z, shift for more info; or <esc> to cancel)" : "Apply what?",
                                      true);
	}

	if (theItem == NULL) {
		return;
	}

  if ((theItem.category == SCROLL || theItem.category == POTION)
      && magicCharDiscoverySuffix(theItem.category, theItem.kind) == -1
      && ((theItem.flags & ITEM_MAGIC_DETECTED) || tableForItemCategory(theItem.category, NULL)[theItem.kind].identified))
	{
      if (tableForItemCategory(theItem.category, NULL)[theItem.kind].identified) {
          sprintf(buf,
                  "Really %s a %s of %s?",
                  theItem.category == SCROLL ? "read" : "drink",
                  theItem.category == SCROLL ? "scroll" : "potion",
                  tableForItemCategory(theItem.category, NULL)[theItem.kind].name);
      } else {
          sprintf(buf,
                  "Really %s a cursed %s?",
                  theItem.category == SCROLL ? "read" : "drink",
                  theItem.category == SCROLL ? "scroll" : "potion");
      }
      if (! await confirm(buf, false)) {
          return;
      }
  }

	command[c++] = theItem.inventoryLetter;
	confirmMessages();
	switch (theItem.category) {
		case FOOD:
			if (STOMACH_SIZE - player.status[STATUS_NUTRITION] < foodTable[theItem.kind].strengthRequired) { // Not hungry enough.
				sprintf(buf, "You're not hungry enough to fully enjoy the %s. Eat it anyway?",
						(theItem.kind == RATION ? "food" : "mango"));
				if (!await confirm(buf, false)) {
					return;
				}
			}
			player.status[STATUS_NUTRITION] = min(foodTable[theItem.kind].strengthRequired + player.status[STATUS_NUTRITION], STOMACH_SIZE);
			if (theItem.kind == RATION) {
				message("That food tasted delicious!", itemMessageColor, false);
			} else {
				message("My, what a yummy mango!", itemMessageColor, false);
			}
      rogue.featRecord[FEAT_MYSTIC] = false;
			break;
		case POTION:
			command[c] = null;
      if (!commandsRecorded) {
          recordKeystrokeSequence(command);
          commandsRecorded = true;
      }
			if (!potionTable[theItem.kind].identified) {
				revealItemType = true;
			}
			await drinkPotion(theItem);
			break;
		case SCROLL:
			command[c] = null;
      if (!commandsRecorded) {
          recordKeystrokeSequence(command);
          commandsRecorded = true; // have to record in case further keystrokes are necessary (e.g. enchant scroll)
      }
			if (!scrollTable[theItem.kind].identified
				&& theItem.kind != SCROLL_ENCHANTING
				&& theItem.kind != SCROLL_IDENTIFY)
			{
				revealItemType = true;
			}
			await readScroll(theItem);
			break;
		case STAFF:
		case WAND:
      if (! await useStaffOrWand(theItem, commandsRecorded)) {
          return;
      }
			break;
    case CHARM:
			if (theItem.charges > 0) {
				itemName(theItem, buf2, false, false, NULL);
				sprintf(buf, "Your %s hasn't finished recharging.", buf2);
				message(buf, itemMessageColor, false);
				return;
			}
      if (!commandsRecorded) {
          command[c] = null;
          recordKeystrokeSequence(command);
          commandsRecorded = true;
      }
      await useCharm(theItem);
      break;
		default:
			itemName(theItem, buf2, false, true, NULL);
			sprintf(buf, "you can't apply %s.", buf2);
			message(buf, false);
			return;
	}

	if (!commandsRecorded) { // to make sure we didn't already record the keystrokes above with staff/wand targeting
		command[c] = null;
		recordKeystrokeSequence(command);
    commandsRecorded = true;
	}

	// Reveal the item type if appropriate.
	if (revealItemType) {
		autoIdentify(theItem);
	}

	if (theItem.category & CHARM) {
    theItem.charges = charmRechargeDelay(theItem.kind, theItem.enchant1);
  } else if (theItem.charges > 0) {
		theItem.charges--;
		if (theItem.category == WAND) {
			theItem.enchant2++; // keeps track of how many times the wand has been discharged for the player's convenience
		}
	} else if (theItem.quantity > 1) {
		theItem.quantity--;
	} else {
		removeItemFromChain(theItem, packItems);
		deleteItem(theItem);
	}
	await playerTurnEnded();
}


function identify(/* item */ theItem) {
	theItem.flags |= ITEM_IDENTIFIED;
	theItem.flags &= ~ITEM_CAN_BE_IDENTIFIED;
	if (theItem.flags & ITEM_RUNIC) {
		theItem.flags |= (ITEM_RUNIC_IDENTIFIED | ITEM_RUNIC_HINTED);
	}
    if (theItem.category & RING) {
        updateRingBonuses();
    }
	identifyItemKind(theItem);
}

// /*
// enum monsterTypes chooseVorpalEnemy() {
// 	short i, index, possCount = 0, deepestLevel = 0, deepestHorde, chosenHorde, failsafe = 25;
// 	enum monsterTypes candidate;
//
//     for (i=0; i<NUMBER_HORDES; i++) {
//         if (hordeCatalog[i].minLevel >= rogue.depthLevel && !hordeCatalog[i].flags) {
//             possCount += hordeCatalog[i].frequency;
//         }
//         if (hordeCatalog[i].minLevel > deepestLevel) {
//             deepestHorde = i;
//             deepestLevel = hordeCatalog[i].minLevel;
//         }
//     }
//
// 	do {
// 		if (possCount == 0) {
// 			chosenHorde = deepestHorde;
// 		} else {
// 			index = rand_range(1, possCount);
// 			for (i=0; i<NUMBER_HORDES; i++) {
// 				if (hordeCatalog[i].minLevel >= rogue.depthLevel && !hordeCatalog[i].flags) {
// 					if (index <= hordeCatalog[i].frequency) {
// 						chosenHorde = i;
// 						break;
// 					}
// 					index -= hordeCatalog[i].frequency;
// 				}
// 			}
// 		}
//
// 		index = rand_range(-1, hordeCatalog[chosenHorde].numberOfMemberTypes - 1);
// 		if (index == -1) {
// 			candidate = hordeCatalog[chosenHorde].leaderType;
// 		} else {
// 			candidate = hordeCatalog[chosenHorde].memberType[index];
// 		}
// 	} while (((monsterCatalog[candidate].flags & MONST_NEVER_VORPAL_ENEMY)
//               || (monsterCatalog[candidate].abilityFlags & MA_NEVER_VORPAL_ENEMY))
//              && --failsafe > 0);
// 	return candidate;
// }*/

function lotteryDraw(/* short */frequencies, itemCount) {
    let i, maxFreq, randIndex;
    maxFreq = 0;
    for (i = 0; i < itemCount; i++) {
        maxFreq += frequencies[i];
    }
    brogueAssert(maxFreq > 0);
    randIndex = rand_range(0, maxFreq - 1);
    for (i = 0; i < itemCount; i++) {
      if (frequencies[i] > randIndex) {
          return i;
      } else {
          randIndex -= frequencies[i];
      }
    }
    brogueAssert(false);
    return 0;
}

function chooseVorpalEnemy() {
    let i, frequencies = []; // short[MONSTER_CLASS_COUNT];
    for (i = 0; i < MONSTER_CLASS_COUNT; i++) {
        if (monsterClassCatalog[i].maxDepth <= 0
            || rogue.depthLevel <= monsterClassCatalog[i].maxDepth)
				{
            frequencies[i] = monsterClassCatalog[i].frequency;
        } else {
            frequencies[i] = 0;
        }
    }
    return lotteryDraw(frequencies, MONSTER_CLASS_COUNT);
}

function describeMonsterClass(buf, lassID, conjunctionAnd) {
    let i;
    const buf2 = STRING(); // char[50];

    for (i = 0; monsterClassCatalog[classID].memberList[i] != 0; i++) {
        strcpy(buf2, monsterCatalog[monsterClassCatalog[classID].memberList[i]].monsterName);
        if (monsterClassCatalog[classID].memberList[i + 1] != 0) {
            if (monsterClassCatalog[classID].memberList[i + 2] == 0) {
                strcat(buf2, (conjunctionAnd ? " and " : " or "));
            } else {
                strcat(buf2, ", ");
            }
        }
				strcat(buf, buf2);
    }
    return buf;
}

function updateIdentifiableItem( /* item */ theItem) {
	if ((theItem.category & SCROLL) && scrollTable[theItem.kind].identified) {
  	theItem.flags &= ~ITEM_CAN_BE_IDENTIFIED;
  }
	else if ((theItem.category & POTION) && potionTable[theItem.kind].identified)
	{
		theItem.flags &= ~ITEM_CAN_BE_IDENTIFIED;
	} else if ((theItem.category & (RING | STAFF | WAND))
			   && (theItem.flags & ITEM_IDENTIFIED)
			   && tableForItemCategory(theItem.category, NULL)[theItem.kind].identified)
  {
		theItem.flags &= ~ITEM_CAN_BE_IDENTIFIED;
	} else if ((theItem.category & (WEAPON | ARMOR))
			   && (theItem.flags & ITEM_IDENTIFIED)
			   && (!(theItem.flags & ITEM_RUNIC) || (theItem.flags & ITEM_RUNIC_IDENTIFIED)))
  {
		theItem.flags &= ~ITEM_CAN_BE_IDENTIFIED;
	} else if (theItem.category & NEVER_IDENTIFIABLE) {
      theItem.flags &= ~ITEM_CAN_BE_IDENTIFIED;
  }
}

function updateIdentifiableItems() {
	let theItem;	// item *
	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		updateIdentifiableItem(theItem);
	}
	for (theItem = floorItems; theItem != NULL; theItem = theItem.nextItem) {
		updateIdentifiableItem(theItem);
	}
}


function magicMapCell(x, y) {
    pmap[x][y].flags |= MAGIC_MAPPED;
    pmap[x][y].rememberedTerrainFlags = tileCatalog[pmap[x][y].layers[DUNGEON]].flags | tileCatalog[pmap[x][y].layers[LIQUID]].flags;
    pmap[x][y].rememberedTMFlags = tileCatalog[pmap[x][y].layers[DUNGEON]].mechFlags | tileCatalog[pmap[x][y].layers[LIQUID]].mechFlags;
    if (pmap[x][y].layers[LIQUID] && tileCatalog[pmap[x][y].layers[LIQUID]].drawPriority < tileCatalog[pmap[x][y].layers[DUNGEON]].drawPriority) {
        pmap[x][y].rememberedTerrain = pmap[x][y].layers[LIQUID];
    } else {
        pmap[x][y].rememberedTerrain = pmap[x][y].layers[DUNGEON];
    }
}



async function readIdentifyScroll(theItem) {
  const buf = STRING(), buf2 = STRING();

  identify(theItem);
  updateIdentifiableItems();
  await messageWithAck("this is a scroll of identify.", itemMessageColor);
  if (numberOfMatchingPackItems(ALL_ITEMS, ITEM_CAN_BE_IDENTIFIED, 0, false) == 0) {
  	message("everything in your pack is already identified.", false);
  	return;
  }
  do {
  	theItem = await promptForItemOfType((ALL_ITEMS), ITEM_CAN_BE_IDENTIFIED, 0,
  								  KEYBOARD_LABELS ? "Identify what? (a-z; shift for more info)" : "Identify what?",
                    false);
  	if (rogue.gameHasEnded) {
  		return;
  	}
  	if (theItem && !(theItem.flags & ITEM_CAN_BE_IDENTIFIED)) {
  		confirmMessages();
  		itemName(theItem, buf2, true, true, NULL);
  		sprintf(buf, "you already know %s %s.", (theItem.quantity > 1 ? "they're" : "it's"), buf2);
  		message(buf, itemMessageColor, false);
  	}
  } while (theItem == NULL || !(theItem.flags & ITEM_CAN_BE_IDENTIFIED));

  recordKeystroke(theItem.inventoryLetter, false, false);
  confirmMessages();
  identify(theItem);
  itemName(theItem, buf, true, true, NULL);
  sprintf(buf2, "%s %s.", (theItem.quantity == 1 ? "this is" : "these are"), buf);
  message(buf2, itemMessageColor, false);
}


async function readScrollOfEnchanting(theItem) {

	const buf = STRING(), buf2 = STRING();

	identify(theItem);
	await messageWithAck("this is a scroll of enchanting.", itemMessageColor, true);
	if (!numberOfMatchingPackItems((WEAPON | ARMOR | RING | STAFF | WAND | CHARM), 0, 0, false)) {
		confirmMessages();
		message("you have nothing that can be enchanted.", false);
		return;
	}
	do {
		theItem = await promptForItemOfType((WEAPON | ARMOR | RING | STAFF | WAND | CHARM), 0, 0,
									  KEYBOARD_LABELS ? "Enchant what? (a-z; shift for more info)" : "Enchant what?",
                    false);
		confirmMessages();
		if (theItem == NULL || !(theItem.category & (WEAPON | ARMOR | RING | STAFF | WAND | CHARM))) {
			await messageWithAck("Can't enchant that.");
		}
		if (rogue.gameHasEnded) {
			return;
		}
	} while (theItem == NULL || !(theItem.category & (WEAPON | ARMOR | RING | STAFF | WAND | CHARM)));

	recordKeystroke(theItem.inventoryLetter, false, false);
	confirmMessages();

	switch (theItem.category) {
		case WEAPON:
			theItem.strengthRequired = max(0, theItem.strengthRequired - 1);
			theItem.enchant1++;
      if (theItem.quiverNumber) {
          theItem.quiverNumber = rand_range(1, 60000);
      }
			break;
		case ARMOR:
			theItem.strengthRequired = max(0, theItem.strengthRequired - 1);
			theItem.enchant1++;
			break;
		case RING:
			theItem.enchant1++;
			updateRingBonuses();
			if (theItem.kind == RING_CLAIRVOYANCE) {
				updateClairvoyance();
				displayLevel();
			}
			break;
		case STAFF:
			theItem.enchant1++;
			theItem.charges++;
			theItem.enchant2 = Math.floor(500 / theItem.enchant1);
			break;
		case WAND:
      theItem.charges += wandTable[theItem.kind].range.lowerBound;
			break;
		case CHARM:
      theItem.enchant1++;
      theItem.charges = min(0, theItem.charges); // Enchanting instantly recharges charms.
      // theItem.charges = theItem.charges * charmRechargeDelay(theItem.kind, theItem.enchant1) / charmRechargeDelay(theItem.kind, theItem.enchant1 - 1);
			break;
		default:
			break;
	}
  theItem.timesEnchanted++;
  if ((theItem.category & (WEAPON | ARMOR | STAFF | RING | CHARM))
      && theItem.enchant1 >= 16)
  {
      rogue.featRecord[FEAT_SPECIALIST] = true;
  }
	if (theItem.flags & ITEM_EQUIPPED) {
		equipItem(theItem, true);
	}
	itemName(theItem, buf, false, false, NULL);
	sprintf(buf2, "your %s gleam%s briefly in the darkness.", buf, (theItem.quantity == 1 ? "s" : ""));
	message(buf2, itemMessageColor, false);
	if (theItem.flags & ITEM_CURSED) {
		sprintf(buf2, "a malevolent force leaves your %s.", buf);
		message(buf2, itemMessageColor, false);
		theItem.flags &= ~ITEM_CURSED;
	}
  createFlare(player.xLoc, player.yLoc, SCROLL_ENCHANTMENT_LIGHT);

}



async function readScroll(/* item */ theItem) {
	let i, j, x, y, numberOfMonsters = 0;
	let tempItem;		// item *
	let monst;			// creature *
	let hadEffect = false;
	const buf = STRING(), buf2 = STRING();

  rogue.featRecord[FEAT_ARCHIVIST] = false;

	switch (theItem.kind) {
		case SCROLL_IDENTIFY:
    	await readIdentifyScroll(theItem);
			break;
		case SCROLL_TELEPORT:
			await teleport(player, -1, -1, true);
			break;
		case SCROLL_REMOVE_CURSE:
			for (tempItem = packItems.nextItem; tempItem != NULL; tempItem = tempItem.nextItem) {
				if (tempItem.flags & ITEM_CURSED) {
					hadEffect = true;
					tempItem.flags &= ~ITEM_CURSED;
				}
			}
			if (hadEffect) {
				message("your pack glows with a cleansing light, and a malevolent energy disperses.", false);
			} else {
				message("your pack glows with a cleansing light, but nothing happens.", false);
			}
			break;
		case SCROLL_ENCHANTING:
    	await readScrollOfEnchanting(theItem);
			break;
		case SCROLL_RECHARGING:
      rechargeItems(STAFF | CHARM);
			break;
		case SCROLL_PROTECT_ARMOR:
			if (rogue.armor) {
				tempItem = rogue.armor;
				tempItem.flags |= ITEM_PROTECTED;
				itemName(tempItem, buf2, false, false, NULL);
				sprintf(buf, "a protective golden light covers your %s.", buf2);
				message(buf, itemMessageColor, false);
				if (tempItem.flags & ITEM_CURSED) {
					sprintf(buf, "a malevolent force leaves your %s.", buf2);
					message(buf, itemMessageColor, false);
					tempItem.flags &= ~ITEM_CURSED;
				}
			} else {
				message("a protective golden light surrounds you, but it quickly disperses.", false);
			}
      createFlare(player.xLoc, player.yLoc, SCROLL_PROTECTION_LIGHT);
			break;
		case SCROLL_PROTECT_WEAPON:
			if (rogue.weapon) {
				tempItem = rogue.weapon;
				tempItem.flags |= ITEM_PROTECTED;
				itemName(tempItem, buf2, false, false, NULL);
				sprintf(buf, "a protective golden light covers your %s.", buf2);
				message(buf, itemMessageColor, false);
				if (tempItem.flags & ITEM_CURSED) {
					sprintf(buf, "a malevolent force leaves your %s.", buf2);
					message(buf, itemMessageColor, false);
					tempItem.flags &= ~ITEM_CURSED;
				}
        if (rogue.weapon.quiverNumber) {
            rogue.weapon.quiverNumber = rand_range(1, 60000);
        }
			} else {
				message("a protective golden light covers your empty hands, but it quickly disperses.", false);
			}
      createFlare(player.xLoc, player.yLoc, SCROLL_PROTECTION_LIGHT);
			break;
		case SCROLL_SANCTUARY:
			await spawnDungeonFeature(player.xLoc, player.yLoc, dungeonFeatureCatalog[DF_SACRED_GLYPHS], true, false);
      message("sprays of color arc to the ground, forming glyphs where they alight.", itemMessageColor, false);
			break;
		case SCROLL_MAGIC_MAPPING:
			confirmMessages();
			message("this scroll has a map on it!",itemMessageColor, false);
			for (i=0; i<DCOLS; i++) {
				for (j=0; j<DROWS; j++) {
					if (cellHasTMFlag(i, j, TM_IS_SECRET)) {
						discover(i, j);
            magicMapCell(i, j);
						pmap[i][j].flags &= ~(STABLE_MEMORY | DISCOVERED);
					}
				}
			}
			for (i=0; i<DCOLS; i++) {
				for (j=0; j<DROWS; j++) {
					if (!(pmap[i][j].flags & DISCOVERED) && pmap[i][j].layers[DUNGEON] != GRANITE) {
            magicMapCell(i, j);
					}
				}
			}
			await colorFlash(magicMapFlashColor, 0, MAGIC_MAPPED, 15, DCOLS + DROWS, player.xLoc, player.yLoc);
			break;
		case SCROLL_AGGRAVATE_MONSTER:
			await aggravateMonsters(DCOLS + DROWS, player.xLoc, player.yLoc, gray);
			message("the scroll emits a piercing shriek that echoes throughout the dungeon!", false);
			break;
		case SCROLL_SUMMON_MONSTER:
			for (j=0; j<25 && numberOfMonsters < 3; j++) {
				for (i=0; i<8; i++) {
					x = player.xLoc + nbDirs[i][0];
					y = player.yLoc + nbDirs[i][1];
					if (!cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY) && !(pmap[x][y].flags & HAS_MONSTER)
						&& rand_percent(10) && (numberOfMonsters < 3))
					{
						monst = await spawnHorde(0, x, y, (HORDE_LEADER_CAPTIVE | HORDE_NO_PERIODIC_SPAWN | HORDE_IS_SUMMONED | HORDE_MACHINE_ONLY), 0);
						if (monst) {
							// refreshDungeonCell(x, y);
							// monst.creatureState = MONSTER_TRACKING_SCENT;
							// monst.ticksUntilTurn = player.movementSpeed;
							wakeUp(monst);
							fadeInMonster(monst);
							numberOfMonsters++;
						}
					}
				}
			}
			if (numberOfMonsters > 1) {
				message("the fabric of space ripples, and monsters appear!", false);
			} else if (numberOfMonsters == 1) {
				message("the fabric of space ripples, and a monster appears!", false);
			} else {
				message("the fabric of space boils violently around you, but nothing happens.", false);
			}
			break;
		case SCROLL_NEGATION:
      await negationBlast("the scroll", DCOLS);
			break;
		case SCROLL_SHATTERING:
			message("the scroll emits a wave of turquoise light that pierces the nearby walls!", itemMessageColor, false);
			await crystalize(9);
			break;
    case SCROLL_DISCORD:
      await discordBlast("the scroll", DCOLS);
      break;
	}
}

function detectMagicOnItem( /* item */ theItem) {
    theItem.flags |= ITEM_MAGIC_DETECTED;
    if ((theItem.category & (WEAPON | ARMOR))
        && theItem.enchant1 == 0
        && !(theItem.flags & ITEM_RUNIC))
		{
        identify(theItem);
    }
}

async function drinkPotion(/* item */ theItem) {
	let tempItem = NULL;		// item *
	let monst = NULL;				// creature *
	let hadEffect = false;
	let hadEffect2 = false;
  const buf = STRING(); 	// char[1000] = "";

  brogueAssert(rogue.RNG == RNG_SUBSTANTIVE);

  rogue.featRecord[FEAT_ARCHIVIST] = false;

	switch (theItem.kind) {
		case POTION_LIFE:
      sprintf(buf, "%{s}your maximum health increases by %{i}%.",
              ((player.currentHP < player.info.maxHP) ? "you heal completely and " : ""),
              Math.floor((player.info.maxHP + 10) * 100 / player.info.maxHP) - 100);

      player.info.maxHP += 10;
      heal(player, 100, true);
      updatePlayerRegenerationDelay();
      message(buf, advancementMessageColor, false);
			break;
		case POTION_HALLUCINATION:
			player.status[STATUS_HALLUCINATING] = player.maxStatus[STATUS_HALLUCINATING] = 300;
			message("colors are everywhere! The walls are singing!", false);
			break;
		case POTION_INCINERATION:
			//await colorFlash(&darkOrange, 0, IN_FIELD_OF_VIEW, 4, 4, player.xLoc, player.yLoc);
			message("as you uncork the flask, it explodes in flame!", false);
			await spawnDungeonFeature(player.xLoc, player.yLoc, dungeonFeatureCatalog[DF_INCINERATION_POTION], true, false);
			await exposeCreatureToFire(player);
			break;
		case POTION_DARKNESS:
			player.status[STATUS_DARKNESS] = max(400, player.status[STATUS_DARKNESS]);
			player.maxStatus[STATUS_DARKNESS] = max(400, player.maxStatus[STATUS_DARKNESS]);
			updateMinersLightRadius();
			updateVision(true);
			message("your vision flickers as a cloak of darkness settles around you!", false);
			break;
		case POTION_DESCENT:
			await colorFlash(darkBlue, 0, IN_FIELD_OF_VIEW, 3, 3, player.xLoc, player.yLoc);
			message("vapor pours out of the flask and causes the floor to disappear!", false);
			await spawnDungeonFeature(player.xLoc, player.yLoc, dungeonFeatureCatalog[DF_HOLE_POTION], true, false);
      if (!player.status[STATUS_LEVITATING]) {
          player.bookkeepingFlags |= MB_IS_FALLING;
      }
			break;
		case POTION_STRENGTH:
			rogue.strength++;
			if (player.status[STATUS_WEAKENED]) {
				player.status[STATUS_WEAKENED] = 1;
			}
			updateEncumbrance();
			message("newfound strength surges through your body.", advancementMessageColor, false);
      createFlare(player.xLoc, player.yLoc, POTION_STRENGTH_LIGHT);
			break;
		case POTION_POISON:
			await spawnDungeonFeature(player.xLoc, player.yLoc, dungeonFeatureCatalog[DF_POISON_GAS_CLOUD_POTION], true, false);
			message("caustic gas billows out of the open flask!", false);
			break;
		case POTION_PARALYSIS:
			await spawnDungeonFeature(player.xLoc, player.yLoc, dungeonFeatureCatalog[DF_PARALYSIS_GAS_CLOUD_POTION], true, false);
			message("your muscles stiffen as a cloud of pink gas bursts from the open flask!", false);
			break;
		case POTION_TELEPATHY:
      makePlayerTelepathic(300);
			break;
		case POTION_LEVITATION:
			player.status[STATUS_LEVITATING] = player.maxStatus[STATUS_LEVITATING] = 100;
			player.bookkeepingFlags &= ~MB_SEIZED; // break free of holding monsters
			message("you float into the air!", false);
			break;
		case POTION_CONFUSION:
			await spawnDungeonFeature(player.xLoc, player.yLoc, dungeonFeatureCatalog[DF_CONFUSION_GAS_CLOUD_POTION], true, false);
			message("a shimmering cloud of rainbow-colored gas billows out of the open flask!", false);
			break;
		case POTION_LICHEN:
			message("a handful of tiny spores burst out of the open flask!", false);
			await spawnDungeonFeature(player.xLoc, player.yLoc, dungeonFeatureCatalog[DF_LICHEN_PLANTED], true, false);
			break;
		case POTION_DETECT_MAGIC:
			hadEffect = false;
			hadEffect2 = false;
			for (tempItem = floorItems.nextItem; tempItem != NULL; tempItem = tempItem.nextItem) {
				if (tempItem.category & CAN_BE_DETECTED) {
          detectMagicOnItem(tempItem);
					if (itemMagicChar(tempItem)) {
						pmap[tempItem.xLoc][tempItem.yLoc].flags |= ITEM_DETECTED;
						hadEffect = true;
						refreshDungeonCell(tempItem.xLoc, tempItem.yLoc);
					}
				}
			}
			for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
				if (monst.carriedItem && (monst.carriedItem.category & CAN_BE_DETECTED)) {
          detectMagicOnItem(monst.carriedItem);
					if (itemMagicChar(monst.carriedItem)) {
						hadEffect = true;
						refreshDungeonCell(monst.xLoc, monst.yLoc);
					}
				}
			}
			for (tempItem = packItems.nextItem; tempItem != NULL; tempItem = tempItem.nextItem) {
				if (tempItem.category & CAN_BE_DETECTED) {
          detectMagicOnItem(tempItem);
					if (itemMagicChar(tempItem)) {
						if (tempItem.flags & ITEM_MAGIC_DETECTED) {
							hadEffect2 = true;
						}
					}
				}
			}
			if (hadEffect || hadEffect2) {
				if (hadEffect && hadEffect2) {
					message("you can somehow feel the presence of magic on the level and in your pack.", false);
				} else if (hadEffect) {
					message("you can somehow feel the presence of magic on the level.", false);
				} else {
					message("you can somehow feel the presence of magic in your pack.", false);
				}
			} else {
				message("you can somehow feel the absence of magic on the level and in your pack.", false);
			}
			break;
		case POTION_HASTE_SELF:
			haste(player, 25);
			break;
		case POTION_FIRE_IMMUNITY:
			player.status[STATUS_IMMUNE_TO_FIRE] = player.maxStatus[STATUS_IMMUNE_TO_FIRE] = 150;
			if (player.status[STATUS_BURNING]) {
				extinguishFireOnCreature(player);
			}
			message("a comforting breeze envelops you, and you no longer fear fire.", false);
			break;
		case POTION_INVISIBILITY:
			player.status[STATUS_INVISIBLE] = player.maxStatus[STATUS_INVISIBLE] = 75;
			message("you shiver as a chill runs up your spine.", false);
			break;
		default:
			ERROR("you feel very strange, as though your body doesn't know how to react!", true);
	}
}

// Used for the Discoveries screen. Returns a number: 1 == good, -1 == bad, 0 == could go either way.
function magicCharDiscoverySuffix(category, kind) {
	let result = 0;

	switch (category) {
		case SCROLL:
			switch (kind) {
				case SCROLL_AGGRAVATE_MONSTER:
				case SCROLL_SUMMON_MONSTER:
					result = -1;
					break;
				default:
					result = 1;
					break;
			}
			break;
		case POTION:
			switch (kind) {
				case POTION_HALLUCINATION:
				case POTION_INCINERATION:
				case POTION_DESCENT:
				case POTION_POISON:
				case POTION_PARALYSIS:
				case POTION_CONFUSION:
				case POTION_LICHEN:
				case POTION_DARKNESS:
					result = -1;
					break;
				default:
					result = 1;
					break;
			}
			break;
		case WAND:
        case STAFF:
            if (boltCatalog[tableForItemCategory(category, NULL)[kind].strengthRequired].flags & (BF_TARGET_ALLIES)) {
                result = -1;
            } else {
                result = 1;
            }
            break;
		case RING:
			result = 0;
            break;
		case CHARM:
			result = 1;
			break;
	}
	return result;
}


function itemMagicChar(theItem) {
	switch (theItem.category) {
		case WEAPON:
		case ARMOR:
			if ((theItem.flags & ITEM_CURSED) || theItem.enchant1 < 0) {
				return BAD_MAGIC_CHAR;
			} else if (theItem.enchant1 > 0) {
				return GOOD_MAGIC_CHAR;
			}
			return 0;
			break;
		case SCROLL:
			switch (theItem.kind) {
				case SCROLL_AGGRAVATE_MONSTER:
				case SCROLL_SUMMON_MONSTER:
					return BAD_MAGIC_CHAR;
				default:
					return GOOD_MAGIC_CHAR;
			}
		case POTION:
			switch (theItem.kind) {
				case POTION_HALLUCINATION:
				case POTION_INCINERATION:
				case POTION_DESCENT:
				case POTION_POISON:
				case POTION_PARALYSIS:
				case POTION_CONFUSION:
				case POTION_LICHEN:
				case POTION_DARKNESS:
					return BAD_MAGIC_CHAR;
				default:
					return GOOD_MAGIC_CHAR;
			}
		case WAND:
			if (theItem.charges == 0) {
				return 0;
			}
		case STAFF:
            if (boltCatalog[tableForItemCategory(theItem.category)[theItem.kind].strengthRequired].flags & (BF_TARGET_ALLIES)) {
                return BAD_MAGIC_CHAR;
            } else {
                return GOOD_MAGIC_CHAR;
            }
		case RING:
			if (theItem.flags & ITEM_CURSED || theItem.enchant1 < 0) {
				return BAD_MAGIC_CHAR;
			} else if (theItem.enchant1 > 0) {
				return GOOD_MAGIC_CHAR;
			} else {
				return 0;
			}
        case CHARM:
            return GOOD_MAGIC_CHAR;
            break;
		case AMULET:
			return AMULET_CHAR;
	}
	return 0;
}

async function unequip(/* item */ theItem) {
	const buf = STRING(), buf2 = STRING();
	const command = []; // char[3];

	command[0] = UNEQUIP_KEY;
	if (theItem == NULL) {
		theItem = await promptForItemOfType(ALL_ITEMS, ITEM_EQUIPPED, 0,
									  KEYBOARD_LABELS ? "Remove (unequip) what? (a-z or <esc> to cancel)" : "Remove (unequip) what?",
                                      true);
	}
	if (theItem == NULL) {
		return;
	}

	command[1] = theItem.inventoryLetter;
	command[2] = null;

	if (!(theItem.flags & ITEM_EQUIPPED)) {
		itemName(theItem, buf2, false, false, NULL);
		sprintf(buf, "your %s %s not equipped.",
                buf2,
                theItem.quantity == 1 ? "was" : "were");
		confirmMessages();
		message(buf, itemMessageColor, false);
		return;
	} else if (theItem.flags & ITEM_CURSED) { // this is where the item gets unequipped
		itemName(theItem, buf2, false, false, NULL);
		sprintf(buf, "you can't; your %s appear%s to be cursed.",
                buf2,
                theItem.quantity == 1 ? "s" : "");
		confirmMessages();
		message(buf, itemMessageColor, false);
		return;
	} else {
		recordKeystrokeSequence(command);
		unequipItem(theItem, false);
		if (theItem.category & RING) {
			updateRingBonuses();
		}
		itemName(theItem, buf2, true, true, NULL);
		if (strLenWithoutEscapes(buf2) > 52) {
			itemName(theItem, buf2, false, true, NULL);
		}
		confirmMessages();
		updateEncumbrance();
		sprintf(buf, "you are no longer %s %s.", (theItem.category & WEAPON ? "wielding" : "wearing"), buf2);
		message(buf, itemMessageColor, false);
	}
	await playerTurnEnded();
}

function canDrop() {
	if (cellHasTerrainFlag(player.xLoc, player.yLoc, T_OBSTRUCTS_ITEMS)) {
		return false;
	}
	return true;
}

async function drop(/* item */ theItem) {
	const buf = STRING(), buf2 = STRING();
	const command = []; // char[3];

	command[0] = DROP_KEY;
	if (theItem == NULL) {
		theItem = await promptForItemOfType(ALL_ITEMS, 0, 0,
									  KEYBOARD_LABELS ? "Drop what? (a-z, shift for more info; or <esc> to cancel)" : "Drop what?",
                                      true);
	}
	if (theItem == NULL) {
		return;
	}
	command[1] = theItem.inventoryLetter;
	command[2] = null;

	if ((theItem.flags & ITEM_EQUIPPED) && (theItem.flags & ITEM_CURSED)) {
		itemName(theItem, buf2, false, false, NULL);
		sprintf(buf, "you can't; your %s appears to be cursed.", buf2);
		confirmMessages();
		message(buf, itemMessageColor, false);
	} else if (canDrop()) {
		recordKeystrokeSequence(command);
		if (theItem.flags & ITEM_EQUIPPED) {
			unequipItem(theItem, false);
		}
		theItem = await dropItem(theItem); // This is where it gets dropped.
		theItem.flags |= ITEM_PLAYER_AVOIDS; // Try not to pick up stuff you've already dropped.
		itemName(theItem, buf2, true, true, NULL);
		sprintf(buf, "You dropped %s.", buf2);
		message(buf, itemMessageColor, false);
		await playerTurnEnded();
	} else {
		confirmMessages();
		message("There is already something there.", false);
	}
}

async function promptForItemOfType(category,
						  requiredFlags,
						  forbiddenFlags,
						  prompt,
						  allowInventoryActions)
{
	let keystroke;
	let theItem;	// item *

	if (!numberOfMatchingPackItems(ALL_ITEMS, requiredFlags, forbiddenFlags, true)) {
		return NULL;
	}

	await temporaryMessage(prompt, false);

	keystroke = await displayInventory(category, requiredFlags, forbiddenFlags, false, allowInventoryActions);

	if (!keystroke) {
		// This can happen if the player does an action with an item directly from the inventory screen via a button.
		return NULL;
	}

	if (keystroke < 'a' || keystroke > 'z') {
		confirmMessages();
		if (keystroke != ESCAPE_KEY && keystroke != ACKNOWLEDGE_KEY) {
			message("Invalid entry.", false);
		}
		return NULL;
	}

	theItem = itemOfPackLetter(keystroke);
	if (theItem == NULL) {
		confirmMessages();
		message("No such item.", false);
		return NULL;
	}

	return theItem;
}


function itemOfPackLetter(letter) {
	let theItem;		// item *
	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		if (theItem.inventoryLetter == letter) {
			return theItem;
		}
	}
	return NULL;
}

function itemAtLoc(x, y) {  // item *
	let theItem; // item *

	if (!(pmap[x][y].flags & HAS_ITEM)) {
		return NULL; // easy optimization
	}
	for (theItem = floorItems.nextItem; theItem != NULL && (theItem.xLoc != x || theItem.yLoc != y); theItem = theItem.nextItem);
	if (theItem == NULL) {
		pmap[x][y].flags &= ~HAS_ITEM;
		hiliteCell(x, y, white, 75, true);
		rogue.automationActive = false;
		ERROR("ERROR: An item was supposed to be @ " + x + ", " + y + ", but I couldn't find it.", true);
		refreshDungeonCell(x, y);
	}
	return theItem;
}

async function dropItem( /* item */ theItem) {
	let itemFromTopOfStack, itemOnFloor;		// item *

	if (cellHasTerrainFlag(player.xLoc, player.yLoc, T_OBSTRUCTS_ITEMS)) {
		return NULL;
	}

	itemOnFloor = itemAtLoc(player.xLoc, player.yLoc);

	if (theItem.quantity > 1 && !(theItem.category & (WEAPON | GEM))) { // peel off the top item and drop it
		itemFromTopOfStack = generateItem(ALL_ITEMS, -1);
		copyItem(itemFromTopOfStack, theItem); // clone the item
		theItem.quantity--;
		itemFromTopOfStack.quantity = 1;
		if (itemOnFloor) {
			itemOnFloor.inventoryLetter = theItem.inventoryLetter; // just in case all letters are taken
			await pickUpItemAt(player.xLoc, player.yLoc);
		}
		await placeItem(itemFromTopOfStack, player.xLoc, player.yLoc);
		return itemFromTopOfStack;
	} else { // drop the entire item
		removeItemFromChain(theItem, packItems);
		if (itemOnFloor) {
			itemOnFloor.inventoryLetter = theItem.inventoryLetter;
			await pickUpItemAt(player.xLoc, player.yLoc);
		}
		await placeItem(theItem, player.xLoc, player.yLoc);
		return theItem;
	}
}

function recalculateEquipmentBonuses() {
	let enchant;
	let theItem;	// item *

	if (rogue.weapon) {
		theItem = rogue.weapon;
		enchant = fp_netEnchant(theItem);
		player.info.damage.copy(theItem.damage);
		player.info.damage.lowerBound = player.info.damage.lowerBound * fp_damageFraction(enchant) >> FP_BASE;
		player.info.damage.upperBound = player.info.damage.upperBound * fp_damageFraction(enchant) >> FP_BASE;
		if (player.info.damage.lowerBound < 1) {
			player.info.damage.lowerBound = 1;
		}
		if (player.info.damage.upperBound < 1) {
			player.info.damage.upperBound = 1;
		}
	}

	if (rogue.armor) {
		theItem = rogue.armor;
		enchant = fp_netEnchant(theItem);
    enchant -= player.status[STATUS_DONNING] << FP_BASE;
		player.info.defense = (theItem.armor << FP_BASE) + enchant * 10 >> FP_BASE;
		if (player.info.defense < 0) {
			player.info.defense = 0;
		}
	}
}


function equipItem( /*item */ theItem, force)
{
	let previouslyEquippedItem = NULL;	// item *

	if ((theItem.category & RING) && (theItem.flags & ITEM_EQUIPPED)) {
		return;
	}

	if (theItem.category & WEAPON) {
		previouslyEquippedItem = rogue.weapon;
	} else if (theItem.category & ARMOR) {
		previouslyEquippedItem = rogue.armor;
	}
	if (previouslyEquippedItem) {
		if (!force && (previouslyEquippedItem.flags & ITEM_CURSED)) {
			return; // already using a cursed item
		} else {
			unequipItem(previouslyEquippedItem, force);
		}
	}
	if (theItem.category & WEAPON) {
		rogue.weapon = theItem;
		recalculateEquipmentBonuses();
	} else if (theItem.category & ARMOR) {
        if (!force) {
            player.status[STATUS_DONNING] = player.maxStatus[STATUS_DONNING] = Math.floor(theItem.armor / 10);
        }
		rogue.armor = theItem;
		recalculateEquipmentBonuses();
	} else if (theItem.category & RING) {
		if (rogue.ringLeft && rogue.ringRight) {
			return;
		}
		if (rogue.ringLeft) {
			rogue.ringRight = theItem;
		} else {
			rogue.ringLeft = theItem;
		}
		updateRingBonuses();
		if (theItem.kind == RING_CLAIRVOYANCE) {
			updateClairvoyance();
			displayLevel();
            identifyItemKind(theItem);
		} else if (theItem.kind == RING_LIGHT
                   || theItem.kind == RING_STEALTH) {
            identifyItemKind(theItem);
		}
	}
	theItem.flags |= ITEM_EQUIPPED;
	return;
}

function unequipItem( /* item */ theItem, force)
{
	if (theItem == NULL || !(theItem.flags & ITEM_EQUIPPED)) {
		return;
	}
	if ((theItem.flags & ITEM_CURSED) && !force) {
		return;
	}
	theItem.flags &= ~ITEM_EQUIPPED;
	if (theItem.category & WEAPON) {
		player.info.damage.lowerBound = 1;
		player.info.damage.upperBound = 2;
		player.info.damage.clumpFactor = 1;
		rogue.weapon = NULL;
	}
	if (theItem.category & ARMOR) {
		player.info.defense = 0;
		rogue.armor = NULL;
    player.status[STATUS_DONNING] = 0;
	}
	if (theItem.category & RING) {
		if (rogue.ringLeft == theItem) {
			rogue.ringLeft = NULL;
		} else if (rogue.ringRight == theItem) {
			rogue.ringRight = NULL;
		}
		updateRingBonuses();
		if (theItem.kind == RING_CLAIRVOYANCE) {
			updateClairvoyance();
      updateFieldOfViewDisplay(false, false);
			updateClairvoyance(); // Yes, we have to call this a second time.
			displayLevel();
		}
	}
	updateEncumbrance();
	return;
}

function updateRingBonuses() {
	let i;
	let rings = [rogue.ringLeft, rogue.ringRight];

	rogue.clairvoyance = rogue.stealthBonus = rogue.transference = rogue.awarenessBonus = rogue.regenerationBonus = rogue.wisdomBonus = rogue.reaping = 0;
	rogue.lightMultiplier = 1;

	for (i=0; i<= 1; i++) {
		if (rings[i]) {
			switch (rings[i].kind) {
				case RING_CLAIRVOYANCE:
					rogue.clairvoyance += effectiveRingEnchant(rings[i]);
					break;
				case RING_STEALTH:
					rogue.stealthBonus += effectiveRingEnchant(rings[i]);
					break;
				case RING_REGENERATION:
					rogue.regenerationBonus += effectiveRingEnchant(rings[i]);
					break;
				case RING_TRANSFERENCE:
					rogue.transference += effectiveRingEnchant(rings[i]);
					break;
				case RING_LIGHT:
					rogue.lightMultiplier += effectiveRingEnchant(rings[i]);
					break;
				case RING_AWARENESS:
					rogue.awarenessBonus += 20 * effectiveRingEnchant(rings[i]);
					break;
				case RING_WISDOM:
					rogue.wisdomBonus += effectiveRingEnchant(rings[i]);
          break;
      case RING_REAPING:
          rogue.reaping += effectiveRingEnchant(rings[i]);
					break;
			}
		}
	}

	if (rogue.lightMultiplier <= 0) {
		rogue.lightMultiplier--; // because it starts at positive 1 instead of 0
	}

	updateMinersLightRadius();
	updatePlayerRegenerationDelay();

	if (rogue.stealthBonus < 0) {
		rogue.stealthBonus *= 4;
	}
}

function updatePlayerRegenerationDelay() {
	let maxHP;
	let turnsForFull; // In thousandths of a turn.
	maxHP = player.info.maxHP;
	turnsForFull = fp_turnsForFullRegenInThousandths(rogue.regenerationBonus << FP_BASE);

	player.regenPerTurn = 0;
	while (maxHP > Math.floor(turnsForFull / 1000) ) {
		player.regenPerTurn++;
		maxHP -= Math.floor(turnsForFull / 1000);
	}

	player.info.turnsBetweenRegen = Math.floor(turnsForFull / maxHP);
	// DEBUG printf("\nTurnsForFull: %i; regenPerTurn: %i; (thousandths of) turnsBetweenRegen: %i", turnsForFull, player.regenPerTurn, player.info.turnsBetweenRegen);
}


function removeItemFromChain(/* item */ theItem, /* item */ theChain) {
	let previousItem; // item *

	for (previousItem = theChain;
		 previousItem.nextItem;
		 previousItem = previousItem.nextItem) {
		if (previousItem.nextItem == theItem) {
			previousItem.nextItem = theItem.nextItem;
			return true;
		}
	}
	return false;
}

function addItemToChain( /* item */ theItem, /* item */ theChain) {
    theItem.nextItem = theChain.nextItem;
    theChain.nextItem = theItem;
}

function deleteItem( /* item */ theItem) {
	// free(theItem);
  theItem.nextItem = null;
	// TODO - Put on free list
}

function resetItemTableEntry(/* itemTable */ theEntry) {
	theEntry.identified = false;
	theEntry.called = false;
	strcpy(theEntry.callTitle, '');
}

function shuffleFlavors() {
	let i, j, randIndex, randNumber;
	const buf = STRING(); // char[COLS];

	for (i=0; i<NUMBER_POTION_KINDS; i++) {
		resetItemTableEntry(potionTable[i]);
	}
	for (i=0; i<NUMBER_STAFF_KINDS; i++) {
		resetItemTableEntry(staffTable[i]);
	}
	for (i=0; i<NUMBER_WAND_KINDS; i++) {
		resetItemTableEntry(wandTable[i]);
	}
	for (i=0; i<NUMBER_SCROLL_KINDS; i++) {
		resetItemTableEntry(scrollTable[i]);
	}
	for (i=0; i<NUMBER_RING_KINDS; i++) {
		resetItemTableEntry(ringTable[i]);
	}

	for (i=0; i<NUMBER_ITEM_COLORS; i++) {
		itemColors[i] = itemColorsRef[i];
	}
	for (i=0; i<NUMBER_ITEM_COLORS; i++) {
		randIndex = rand_range(0, NUMBER_ITEM_COLORS - 1);
    if (randIndex != i) {
        const temp = itemColors[i];
        itemColors[i] = itemColors[randIndex];
        itemColors[randIndex] = temp;
				// printf("Color %i -> %s\n", i, itemColors[i]);
				// printf("Color %i -> %s\n", randIndex, itemColors[randIndex]);
    }
	}

	if (NUMBER_ITEM_COLORS < NUMBER_POTION_KINDS) {
		throw new Error('Need more colors to cover the number of potions! HAVE:', NUMBER_ITEM_COLORS, 'NEED:', NUMBER_POTION_KINDS);
	}

	for( i = 0; i < NUMBER_POTION_KINDS; i++) {
		potionTable[i].flavor = itemColors[i + 1];
		// console.log('Potion', potionTable[i].name, potionTable[i].flavor);
	}

	for (i=0; i<NUMBER_ITEM_WOODS; i++) {
		itemWoods[i] = itemWoodsRef[i];
	}
	for (i=0; i<NUMBER_ITEM_WOODS; i++) {
		randIndex = rand_range(0, NUMBER_ITEM_WOODS - 1);
    if (randIndex != i) {
        const temp = itemWoods[i];
        itemWoods[i] = itemWoods[randIndex];
        itemWoods[randIndex] = temp;
    }
		// printf("Wood %i -> %s\n", i, itemWoods[i]);
	}

	if (NUMBER_ITEM_WOODS < NUMBER_STAFF_KINDS) {
		throw new Error('Need more woods to cover the number of staffs! HAVE:', NUMBER_ITEM_WOODS, 'NEED:', NUMBER_STAFF_KINDS);
	}

	for (i=0; i<NUMBER_STAFF_KINDS; i++) {
		staffTable[i].flavor = itemWoods[i];
	}

	for (i=0; i<NUMBER_ITEM_GEMS; i++) {
		itemGems[i] = itemGemsRef[i];
	}
	for (i=0; i<NUMBER_ITEM_GEMS; i++) {
		randIndex = rand_range(0, NUMBER_ITEM_GEMS - 1);
    if (randIndex != i) {
        const temp = itemGems[i];
        itemGems[i] = itemGems[randIndex];
        itemGems[randIndex] = temp;
    }
		// printf("Gem %i -> %s\n", i, itemGems[i]);
	}

	if (NUMBER_ITEM_GEMS < NUMBER_RING_KINDS) {
		throw new Error('Need more gems to cover the number of rings! HAVE:', NUMBER_ITEM_GEMS, 'NEED:', NUMBER_RING_KINDS);
	}

	for (i=0; i<NUMBER_RING_KINDS; i++) {
		ringTable[i].flavor = itemGems[i];
	}


	for (i=0; i<NUMBER_ITEM_METALS; i++) {
		itemMetals[i] = itemMetalsRef[i];
	}
	for (i=0; i<NUMBER_ITEM_METALS; i++) {
      randIndex = rand_range(0, NUMBER_ITEM_METALS - 1);
      if (randIndex != i) {
          const temp = itemMetals[i];
          itemMetals[i] = itemMetals[randIndex];
          itemMetals[randIndex] = temp;
      }
			// printf("Metal %i -> %s\n", i, itemMetals[i]);
	}

	if (NUMBER_ITEM_METALS < NUMBER_WAND_KINDS) {
		throw new Error('Need more metals to cover the number of wands! HAVE:', NUMBER_ITEM_METALS, 'NEED:', NUMBER_WAND_KINDS);
	}

	for (i=0; i<NUMBER_WAND_KINDS; i++) {
		wandTable[i].flavor = itemMetals[i];
	}

	for (i=0; i<NUMBER_SCROLL_KINDS; i++) {
		itemTitles[i] = STRING();
		randNumber = rand_range(3, 4);
		for (j=0; j<randNumber; j++) {
			randIndex = rand_range(0, NUMBER_TITLE_PHONEMES - 1);
			strcpy(buf, itemTitles[i]);
			sprintf(itemTitles[i], "%s%s%s", buf, ((rand_percent(50) && j>0) ? " " : ""), titlePhonemes[randIndex]);
		}
		scrollTable[i].flavor = itemTitles[i];
		// console.log(scrollTable[i].name, '->', itemTitles[i].text);
	}
}

function itemValue(/* item */ theItem) {
	switch (theItem.category) {
		case AMULET:
			return 35000;
			break;
		case GEM:
			return 5000 * theItem.quantity;
			break;
		default:
			return 0;
			break;
	}
}
