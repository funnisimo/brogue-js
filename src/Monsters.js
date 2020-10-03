/*
 *  Monsters.c
 *  Brogue
 *
 *  Created by Brian Walker on 1/13/09.
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

function mutateMonster( /* creature */ monst, mutationIndex) {
    brogueAssert(mutationIndex >= 0 && mutationIndex < NUMBER_MUTATORS);
    monst.mutationIndex = mutationIndex;
    const theMut = mutationCatalog[mutationIndex];

    monst.info.flags |= theMut.monsterFlags;
    monst.info.abilityFlags |= theMut.monsterAbilityFlags;
    monst.info.maxHP = Math.floor(monst.info.maxHP * theMut.healthFactor / 100);
    monst.info.movementSpeed = Math.floor(monst.info.movementSpeed * theMut.moveSpeedFactor / 100);
    monst.info.attackSpeed = Math.floor(monst.info.attackSpeed * theMut.attackSpeedFactor / 100);
    monst.info.defense = Math.floor(monst.info.defense * theMut.defenseFactor / 100);
    if (monst.info.damage.lowerBound > 0) {
        monst.info.damage.lowerBound = Math.floor(monst.info.damage.lowerBound * theMut.damageFactor / 100);
        monst.info.damage.lowerBound = max(monst.info.damage.lowerBound, 1);
    }
    if (monst.info.damage.upperBound > 0) {
        monst.info.damage.upperBound = Math.floor(monst.info.damage.upperBound * theMut.damageFactor / 100);
        monst.info.damage.upperBound = max(monst.info.damage.upperBound, (monst.info.abilityFlags & MA_POISONS) ? 2 : 1);
    }
    if (theMut.DFChance >= 0) {
        monst.info.DFChance = theMut.DFChance;
    }
    if (theMut.DFType > 0) {
        monst.info.DFType = theMut.DFType;
    }
}

function copyCreatureType(dest, source) {
  dest.monsterID = source.monsterID;
  dest.monsterName.copy(source.monsterName);
  dest.displayChar = source.displayChar;
  dest.foreColor = source.foreColor;
  dest.maxHP = source.maxHP;
  dest.defense = source.defense;
  dest.accuracy = source.accuracy;
  dest.damage = randomRange(source.damage);
  dest.turnsBetweenRegen = source.turnsBetweenRegen;
  dest.movementSpeed = source.movementSpeed;
  dest.attackSpeed = source.attackSpeed;
  dest.bloodType = source.bloodType;
  dest.ntrinsicLightType = source.ntrinsicLightType;
  dest.DFChance = source.DFChance;
  dest.DFType = source.DFType;
  dest.bolts = source.bolts.slice();
  dest.flags = source.flags;
  dest.abilityFlags = source.abilityFlags;

}

// 1.17^x * 10, with x from 1 to 13:
const POW_DEEP_MUTATION = [11, 13, 16, 18, 21, 25, 30, 35, 41, 48, 56, 65, 76];

// Allocates space, generates a creature of the given type,
// prepends it to the list of creatures, and returns a pointer to that creature. Note that the creature
// is not given a map location here!
function generateMonster(monsterID, itemPossible, mutationPossible) {
	let itemChance, mutationChance, i, mutationAttempt;
	let monst; // creature *

	monst = creature(); // (creature *) malloc(sizeof(creature));
	// memset(monst, '\0', sizeof(creature));
	clearStatus(monst);
	copyCreatureType(monst.info, monsterCatalog[monsterID]);

  monst.mutationIndex = -1;
  if (mutationPossible
      && !(monst.info.flags & MONST_NEVER_MUTATED)
      && !(monst.info.abilityFlags & MA_NEVER_MUTATED)
      && rogue.depthLevel > 10)
  {
      if (rogue.depthLevel <= AMULET_LEVEL) {
          mutationChance = clamp(rogue.depthLevel - 10, 1, 10);
      } else {
          mutationChance = POW_DEEP_MUTATION[min(rogue.depthLevel - AMULET_LEVEL, 12)];
          mutationChance = min(mutationChance, 75);
      }

      if (rand_percent(mutationChance)) {
          mutationAttempt = rand_range(0, NUMBER_MUTATORS - 1);
          if (!(monst.info.flags & mutationCatalog[mutationAttempt].forbiddenFlags)
              && !(monst.info.abilityFlags & mutationCatalog[mutationAttempt].forbiddenAbilityFlags))
          {
              mutateMonster(monst, mutationAttempt);
          }
      }
  }

	monst.nextCreature = monsters.nextCreature;
	monsters.nextCreature = monst;
	monst.xLoc = monst.yLoc = 0;
	monst.depth = rogue.depthLevel;
	monst.bookkeepingFlags = 0;
	monst.mapToMe = NULL;
	monst.safetyMap = NULL;
	monst.leader = NULL;
	monst.carriedMonster = NULL;
	monst.creatureState = (((monst.info.flags & MONST_NEVER_SLEEPS) || rand_percent(25))
							? MONSTER_TRACKING_SCENT : MONSTER_SLEEPING);
	monst.creatureMode = MODE_NORMAL;
	monst.currentHP = monst.info.maxHP;
	monst.spawnDepth = rogue.depthLevel;
	monst.ticksUntilTurn = monst.info.movementSpeed;
	monst.info.turnsBetweenRegen *= 1000; // tracked as thousandths to prevent rounding errors
	monst.turnsUntilRegen = monst.info.turnsBetweenRegen;
	monst.regenPerTurn = 0;
	monst.movementSpeed = monst.info.movementSpeed;
	monst.attackSpeed = monst.info.attackSpeed;
	monst.turnsSpentStationary = 0;
	monst.xpxp = 0;
  monst.machineHome = 0;
	monst.newPowerCount = monst.totalPowerCount = 0;
	monst.targetCorpseLoc[0] = monst.targetCorpseLoc[1] = 0;
  monst.lastSeenPlayerAt[0] = monst.lastSeenPlayerAt[1] = -1;
  monst.targetWaypointIndex = -1;
  for (i=0; i < MAX_WAYPOINT_COUNT; i++) {
      monst.waypointAlreadyVisited[i] = rand_range(0, 1);
  }

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

	if (monst.info.flags & MONST_CARRY_ITEM_100) {
		itemChance = 100;
	} else if (monst.info.flags & MONST_CARRY_ITEM_25) {
		itemChance = 25;
	} else {
		itemChance = 0;
	}

  if (ITEMS_ENABLED
      && itemPossible
      && (rogue.depthLevel <= AMULET_LEVEL)
      && monsterItemsHopper.nextItem
      && rand_percent(itemChance))
  {
      monst.carriedItem = monsterItemsHopper.nextItem;
      monsterItemsHopper.nextItem = monsterItemsHopper.nextItem.nextItem;
      monst.carriedItem.nextItem = NULL;
      monst.carriedItem.originDepth = rogue.depthLevel;
  } else {
      monst.carriedItem = NULL;
  }

	initializeGender(monst);

  if (!(monst.info.flags & MONST_INANIMATE) && !monst.status[STATUS_LIFESPAN_REMAINING]) {
      monst.bookkeepingFlags |= MB_HAS_SOUL;
  }

	return monst;
}


function monsterRevealed(/* creature */ monst) {
    if (monst === player) {
        return false;
    } else if (D_MONSTER_OMNISCIENCE) {
      return true;
    } else if (monst.bookkeepingFlags & MB_TELEPATHICALLY_REVEALED) {
        return true;
    } else if (monst.status[STATUS_ENTRANCED]) {
        return true;
    } else if (player.status[STATUS_TELEPATHIC] && !(monst.info.flags & MONST_INANIMATE)) {
        return true;
    }
    return false;
}

function monsterHiddenBySubmersion(/* creature */ monst, /* creature */ observer) {
    if (monst.bookkeepingFlags & MB_SUBMERGED) {
        if (observer
            && (terrainFlags(observer.xLoc, observer.yLoc) & T_IS_DEEP_WATER)
            && !observer.status[STATUS_LEVITATING])
        {
            // observer is in deep water, so target is not hidden by water
            return false;
        } else {
            // submerged and the observer is not in deep water.
            return true;
        }
    }
    return false;
}

function monsterIsHidden(/* creature */ monst, /* creature */ observer) {
    if (monst.bookkeepingFlags & MB_IS_DORMANT) {
        return true;
    }
    if (observer && monstersAreTeammates(monst, observer)) {
        // Teammates can always see each other.
        return false;
    }
    if ((monst.status[STATUS_INVISIBLE] && !pmap[monst.xLoc][monst.yLoc].layers[GAS])) {
        // invisible and not in gas
        return true;
    }
    if (monsterHiddenBySubmersion(monst, observer)) {
        return true;
    }
    return false;
}

function canSeeMonster(/* creature */ monst) {
	if (monst === player) {
		return true;
	}
	if (!monsterIsHidden(monst, player)
        && (playerCanSee(monst.xLoc, monst.yLoc) || monsterRevealed(monst))) {
		return true;
	}
	return false;
}

// This is different from canSeeMonster() in that it counts only physical sight -- not clairvoyance or telepathy.
function canDirectlySeeMonster( /* creature */ monst) {
	if (monst === player) {
		return true;
	}
	if (playerCanDirectlySee(monst.xLoc, monst.yLoc) && !monsterIsHidden(monst, player)) {
		return true;
	}
	return false;
}

function monsterName(buf, /* creature */ monst, includeArticle, omniscience) {

  omniscience = omniscience || rogue.playbackOmniscience;

	if (monst === player) {
    strcpy(buf, "you");
    return;
	}
	if (canSeeMonster(monst) || omniscience) {
		if (player.status[STATUS_HALLUCINATING] && !omniscience)
    {
			// assureCosmeticRNG();
      sprintf(buf, "%s%s", (includeArticle ? "the " : ""),
					monsterCatalog[cosmetic_range(1, NUMBER_MONSTER_KINDS - 1)].monsterName);
			// restoreRNG();
			return buf;
		}
    sprintf(buf, "%s%s", (includeArticle ? (monst.creatureState == MONSTER_ALLY ? "your " : "the ") : ""),
				monst.info.monsterName);
		return;
	} else {
    strcpy(buf, "something");
		return;
	}
}

function monsterIsInClass( /* creature */ monst, monsterClass) {
  let i;
  for (i = 0; monsterClassCatalog[monsterClass].memberList[i] != 0; i++) {
      if (monsterClassCatalog[monsterClass].memberList[i] == monst.info.monsterID) {
          return true;
      }
  }
  return false;
}

// Don't attack a revenant if you're not magical.
// Don't attack a monster embedded in obstruction crystal.
// Etc.
function attackWouldBeFutile(/* creature */ attacker, /* creature */ defender)
{
    if (cellHasTerrainFlag(defender.xLoc, defender.yLoc, T_OBSTRUCTS_PASSABILITY)
        && !(defender.info.flags & MONST_ATTACKABLE_THRU_WALLS))
    {
        return true;
    }
    if (attacker === player) {
        // Let the player do what she wants, if it's possible.
        return false;
    }
    if ((attacker.info.flags & MONST_RESTRICTED_TO_LIQUID)
        && !(attacker.status[STATUS_LEVITATING])
        && defender.status[STATUS_LEVITATING])
    {
        return true;
    }
    if (defender.info.flags & MONST_INVULNERABLE) {
        return true;
    }
    if (defender.info.flags & MONST_IMMUNE_TO_WEAPONS
        && !(attacker.info.abilityFlags & MA_POISONS))
    {
        return true;
    }
    return false;
}

// This is a specific kind of willingness, bordering on ability.
// Intuition: if it swung an axe from that position, should it
// hit the defender? Or silently pass through it, as it does for
// allies?
function monsterWillAttackTarget( /* creature */ attacker, /* creature */ defender) {
    if (attacker === defender || (defender.bookkeepingFlags & MB_IS_DYING)) {
        return false;
    }
    if (attacker === player
        && defender.creatureState == MONSTER_ALLY)
    {
        return false;
    }
    if (attacker.status[STATUS_ENTRANCED]
        && defender.creatureState != MONSTER_ALLY)
    {
        return true;
    }
    if (attacker.creatureState == MONSTER_ALLY
        && attacker !== player
        && defender.status[STATUS_ENTRANCED])
    {
        return false;
    }
    if (defender.bookkeepingFlags & MB_CAPTIVE) {
        return false;
    }
    if (attacker.status[STATUS_DISCORDANT]
        || defender.status[STATUS_DISCORDANT]
        || attacker.status[STATUS_CONFUSED])
    {
        return true;
    }
    if (monstersAreEnemies(attacker, defender)
      && !monstersAreTeammates(attacker, defender))
    {
        return true;
    }
    return false;
}

function monstersAreTeammates(/* creature */ monst1, /* creature */ monst2) {
	// if one follows the other, or the other follows the one, or they both follow the same
	return ((((monst1.bookkeepingFlags & MB_FOLLOWER) && monst1.leader == monst2)
			 || ((monst2.bookkeepingFlags & MB_FOLLOWER) && monst2.leader == monst1)
			 || (monst1.creatureState == MONSTER_ALLY && monst2 === player)
			 || (monst1 === player && monst2.creatureState == MONSTER_ALLY)
			 || (monst1.creatureState == MONSTER_ALLY && monst2.creatureState == MONSTER_ALLY)
			 || ((monst1.bookkeepingFlags & MB_FOLLOWER) && (monst2.bookkeepingFlags & MB_FOLLOWER)
				 && monst1.leader == monst2.leader)) ? true : false);
}


function monstersAreEnemies(/* creature */ monst1, /* creature */ monst2) {
	if ((monst1.bookkeepingFlags | monst2.bookkeepingFlags) & MB_CAPTIVE) {
		return false;
	}
	if (monst1 === monst2) {
		return false; // Can't be enemies with yourself, even if discordant.
	}
	if (monst1.status[STATUS_DISCORDANT] || monst2.status[STATUS_DISCORDANT]) {
		return true;
	}
	// eels and krakens attack anything in deep water
	if (((monst1.info.flags & MONST_RESTRICTED_TO_LIQUID)
		 && !(monst2.info.flags & MONST_IMMUNE_TO_WATER)
		 && !(monst2.status[STATUS_LEVITATING])
		 && cellHasTerrainFlag(monst2.xLoc, monst2.yLoc, T_IS_DEEP_WATER))

		|| ((monst2.info.flags & MONST_RESTRICTED_TO_LIQUID)
			&& !(monst1.info.flags & MONST_IMMUNE_TO_WATER)
			&& !(monst1.status[STATUS_LEVITATING])
			&& cellHasTerrainFlag(monst1.xLoc, monst1.yLoc, T_IS_DEEP_WATER)))
  {
		return true;
	}
	return ((monst1.creatureState == MONSTER_ALLY || monst1 === player)
			!= (monst2.creatureState == MONSTER_ALLY || monst2 === player));
}


function initializeGender(/* creature */ monst) {
	if ((monst.info.flags & MONST_MALE) && (monst.info.flags & MONST_FEMALE)) {
		monst.info.flags &= ~(rand_percent(50) ? MONST_MALE : MONST_FEMALE);
	}
}

// Returns true if either string has a null terminator before they otherwise disagree.
function stringsMatch(str1, str2) {
	let i, j;

  str1 = STRING(str1);
  str2 = STRING(str2);

  let limit = min( strlen(str1) , strlen(str2) );

	for (i=0, j=0; limit > 0; --limit) {

    // TODO - Handle COLOR_END also
    while (str1.text.charCodeAt(i) === COLOR_ESCAPE) {
      i += 4;
    }
    while(str2.text.charCodeAt(j) === COLOR_ESCAPE) {
      j += 4;
    }

		if (str1.text.charAt(i).toLowerCase() != str2.text.charAt(j).toLowerCase()) {
			return false;
		}
	}
	return true;
}

// Genders:
//	0 = [character escape sequence]
//	1 = you
//	2 = male
//	3 = female
//	4 = neuter
function resolvePronounEscapes(text, /* creature */ monst) {
	let pronounType, gender, i;
	let insert, scan;
	let capitalize;

  if (!(text instanceof BrogueString)) throw new Error('Must use BrogueString.');

	// Note: Escape sequences MUST be longer than EACH of the possible replacements.
	// That way, the string only contracts, and we don't need a buffer.
	const pronouns = [
		["$HESHE", "you", "he", "she", "it"],
		["$HIMHER", "you", "him", "her", "it"],
		["$HISHER", "your", "his", "her", "its"],
		["$HIMSELFHERSELF", "yourself", "himself", "herself", "itself"]
  ];

	if (monst === player) {
		gender = 1;
  } else if (!canSeeMonster(monst) && !rogue.playbackOmniscience) {
      gender = 4;
	} else if (monst.info.flags & MONST_MALE) {
		gender = 2;
	} else if (monst.info.flags & MONST_FEMALE) {
		gender = 3;
	} else {
		gender = 4;
	}

	capitalize = false;

  for(i = 0; i < strlen(text); ++i) {
    const ch = text.text.charCodeAt(i);
    if (ch === COLOR_ESCAPE) {
      i += 4;
    }
    else if (ch === COLOR_END) {
      // skip
    }
    else if (ch === '.'.charCodeAt(0)) {
      capitalize = true;
    }
    else if (ch === '$'.charCodeAt(0)) {
      for( let p = 0; p < pronouns.length; ++p) {
        if (text.text.startsWith(pronouns[p][0], i)) {
          const pronoun = STRING(pronouns[p][gender]);
          if (capitalize) {
            pronoun.capitalize();
          }
          text.splice(i, strlen(pronouns[p][0]), pronoun);
        }
      }
    }
    else if (ch !== ' '.charCodeAt(0) ) {
      capitalize = false;
    }
  }

  return text;
}


// Pass 0 for summonerType for an ordinary selection.
function pickHordeType(depth, /* monsterTypes */ summonerType, forbiddenFlags, requiredFlags) {
	let i, index, possCount = 0;

	if (depth <= 0) {
		depth = rogue.depthLevel;
	}

	for (i=0; i<NUMBER_HORDES; i++) {
		if (!(hordeCatalog[i].flags & forbiddenFlags)
			&& !(~(hordeCatalog[i].flags) & requiredFlags)
			&& ((!summonerType && hordeCatalog[i].minLevel <= depth && hordeCatalog[i].maxLevel >= depth)
				|| (summonerType && (hordeCatalog[i].flags & HORDE_IS_SUMMONED) && hordeCatalog[i].leaderType == summonerType)))
    {
			possCount += hordeCatalog[i].frequency;
		}
	}

	if (possCount == 0) {
		return -1;
	}

	index = rand_range(1, possCount);

	for (i=0; i<NUMBER_HORDES; i++) {
		if (!(hordeCatalog[i].flags & forbiddenFlags)
			&& !(~(hordeCatalog[i].flags) & requiredFlags)
			&& ((!summonerType && hordeCatalog[i].minLevel <= depth && hordeCatalog[i].maxLevel >= depth)
				|| (summonerType && (hordeCatalog[i].flags & HORDE_IS_SUMMONED) && hordeCatalog[i].leaderType == summonerType)))
    {
			if (index <= hordeCatalog[i].frequency) {
				return i;
			}
			index -= hordeCatalog[i].frequency;
		}
	}
	return 0; // should never happen
}

function empowerMonster( /* creature */ monst) {
    const theMonsterName = STRING(), buf = STRING(); // char[200];
    monst.info.maxHP += 5;
    monst.currentHP += Math.floor(5 * monst.currentHP / (monst.info.maxHP - 5));
    monst.info.defense += 5;
    monst.info.accuracy += 5;
    monst.info.damage.lowerBound += max(1, Math.floor(monst.info.damage.lowerBound / 20));
    monst.info.damage.upperBound += max(1, Math.floor(monst.info.damage.upperBound / 20));
    monst.newPowerCount++;
    monst.totalPowerCount++;
    heal(monst, 100, true);
    if (monst.info.turnsBetweenRegen > 0) {
        monst.info.turnsBetweenRegen = Math.floor((monst.info.turnsBetweenRegen * 2 + 2) / 3);
    }

    if (canSeeMonster(monst)) {
        monsterName(theMonsterName, monst, true);
        sprintf(bif, "%s looks stronger", theMonsterName);
        combatMessage(buf, advancementMessageColor);
    }
}


function copyCreature(dest, source) {
  copyCreatureType(dest.info, source.info);
  dest.xLoc = source.xLoc;
  dest.yLoc = source.yLoc;
  dest.depth = source.depth;
  dest.currentHP = source.currentHP;
  dest.turnsUntilRegen = source.turnsUntilRegen;
  dest.regenPerTurn = source.regenPerTurn;		 // number of HP to regenerate every single turn
  dest.weaknessAmount = source.weaknessAmount; // number of points of weakness that are inflicted by the weakness status
  dest.poisonAmount = source.poisonAmount;     // number of points of damage per turn from poison
  dest.creatureState = source.creatureState;	 // current behavioral state
  dest.creatureMode = source.creatureMode;	   // current behavioral mode (higher-level than state)

  dest.mutationIndex = source.mutationIndex;   // what mutation the monster has (or -1 for none)

  // Waypoints:
  dest.targetWaypointIndex = source.targetWaypointIndex;               // the index number of the waypoint we're pathing toward
  dest.waypointAlreadyVisited = source.waypointAlreadyVisited.slice(); // [MAX_WAYPOINT_COUNT]; // checklist of waypoints
  dest.lastSeenPlayerAt = source.lastSeenPlayerAt.slice();             // last location at which the monster hunted the player

  dest.targetCorpseLoc = source.targetCorpseLoc.slice();  // [2];			// location of the corpse that the monster is approaching to gain its abilities
  strcpy(dest.targetCorpseName,source.targetCorpseName); // [30];			// name of the deceased monster that we're approaching to gain its abilities
  dest.absorptionFlags = source.absorptionFlags;		// ability/behavior flags that the monster will gain when absorption is complete
  dest.absorbBehavior = source.absorbBehavior;				// above flag is behavior instead of ability (ignored if absorptionBolt is set)
  dest.absorptionBolt = source.absorptionBolt;               // bolt index that the monster will learn to cast when absorption is complete
  dest.corpseAbsorptionCounter = source.corpseAbsorptionCounter;		// used to measure both the time until the monster stops being interested in the corpse,
                    // and, later, the time until the monster finishes absorbing the corpse.
  dest.mapToMe = source.mapToMe; 					// if a pack leader, this is a periodically updated pathing map to get to the leader
  dest.safetyMap = source.safetyMap; 					// fleeing monsters store their own safety map when out of player FOV to avoid omniscience
  dest.ticksUntilTurn = source.ticksUntilTurn; 				// how long before the creature gets its next move

  // Locally cached statistics that may be temporarily modified:
  dest.movementSpeed = source.movementSpeed;
  dest.attackSpeed = source.attackSpeed;

  dest.turnsSpentStationary = source.turnsSpentStationary; 		// how many (subjective) turns it's been since the creature moved between tiles
  dest.flashStrength = source.flashStrength;				// monster will flash soon; this indicates the percent strength of flash
  dest.flashColor.copy(source.flashColor),					// the color that the monster will flash
  dest.status = source.status.slice(); // [NUMBER_OF_STATUS_EFFECTS];
  dest.maxStatus = source.maxStatus.slice(); // [NUMBER_OF_STATUS_EFFECTS]; // used to set the max point on the status bars
  dest.bookkeepingFlags = source.bookkeepingFlags;
  dest.spawnDepth = source.spawnDepth;					// keep track of the depth of the machine to which they relate (for activation monsters)
  dest.machineHome = source.machineHome;                  // monsters that spawn in a machine keep track of the machine number here (for activation monsters)
  dest.xpxp = source.xpxp;							// exploration experience (used to time telepathic bonding for allies)
  dest.newPowerCount = source.newPowerCount;                // how many more times this monster can absorb a fallen monster
  dest.totalPowerCount = source.totalPowerCount;              // how many times has the monster been empowered? Used to recover abilities when negated.
  dest.leader = source.leader;			// only if monster is a follower
  dest.carriedMonster = source.carriedMonster;	// when vampires turn into bats, one of the bats restores the vampire when it dies
  dest.nextCreature = source.nextCreature;
  dest.carriedItem = source.carriedItem;			// only used for monsters

}

// If placeClone is false, the clone won't get a location
// and won't set any HAS_MONSTER flags or cause any refreshes;
// it's just generated and inserted into the chains.
async function cloneMonster( /* creature */ monst, announce, placeClone) {
	let newMonst, nextMonst, parentMonst;  // creature *
	const buf = STRING(), monstName = STRING(); // char[DCOLS];
  let jellyCount;

	newMonst = generateMonster(monst.info.monsterID, false, false);
	nextMonst = newMonst.nextCreature;
  copyCreature(newMonst, monst);   // *newMonst = *monst; // boink!
	newMonst.nextCreature = nextMonst;

	if (monst.carriedMonster) {
		parentMonst = await cloneMonster(monst.carriedMonster, false, false); // Also clone the carriedMonster
		removeMonsterFromChain(parentMonst, monsters);
		removeMonsterFromChain(parentMonst, dormantMonsters);
	} else {
		parentMonst = NULL;
	}

	initializeGender(newMonst);
	newMonst.bookkeepingFlags &= ~(MB_LEADER | MB_CAPTIVE | MB_HAS_SOUL);
	newMonst.bookkeepingFlags |= MB_FOLLOWER;
	newMonst.mapToMe = NULL;
	newMonst.safetyMap = NULL;
	newMonst.carriedItem = NULL;
	newMonst.carriedMonster = parentMonst;
	newMonst.ticksUntilTurn = 101;
  if (!(monst.creatureState == MONSTER_ALLY)) {
      newMonst.bookkeepingFlags &= ~MB_TELEPATHICALLY_REVEALED;
  }
	if (monst.leader) {
		newMonst.leader = monst.leader;
	} else {
		newMonst.leader = monst;
		monst.bookkeepingFlags |= MB_LEADER;
	}

  if (monst.bookkeepingFlags & MB_CAPTIVE) {
      // If you clone a captive, the clone will be your ally.
      await becomeAllyWith(newMonst);
  }

	if (placeClone) {
//		getQualifyingLocNear(loc, monst.xLoc, monst.yLoc, true, 0, forbiddenFlagsForMonster(&(monst.info)), (HAS_PLAYER | HAS_MONSTER), false, false);
//		newMonst.xLoc = loc[0];
//		newMonst.yLoc = loc[1];
    const loc = getQualifyingPathLocNear(monst.xLoc, monst.yLoc, true,
                                 T_DIVIDES_LEVEL & avoidedFlagsForMonster(newMonst.info), HAS_PLAYER,
                                 avoidedFlagsForMonster(newMonst.info), (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS), false);
    if (!loc) ERROR('EXPECTED LOCATION');
    newMonst.xLoc = loc[0];
    newMonst.yLoc = loc[1];
		pmap[newMonst.xLoc][newMonst.yLoc].flags |= HAS_MONSTER;
		refreshDungeonCell(newMonst.xLoc, newMonst.yLoc);
		if (announce && canSeeMonster(newMonst)) {
			monsterName(monstName, newMonst, false);
			sprintf(buf, "another %s appears!", monstName);
			message(buf, false);
		}
	}

	if (monst === player) { // Player managed to clone himself.
		newMonst.info.foreColor = gray;
		newMonst.info.damage.lowerBound = 1;
		newMonst.info.damage.upperBound = 2;
		newMonst.info.damage.clumpFactor = 1;
		newMonst.info.defense = 0;
		newMonst.info.monsterName = "clone";
		newMonst.creatureState = MONSTER_ALLY;
	}

  if (monst.creatureState == MONSTER_ALLY
      && (monst.info.abilityFlags & MA_CLONE_SELF_ON_DEFEND)
      && !rogue.featRecord[FEAT_JELLYMANCER])
  {
      jellyCount = 0;
      for (nextMonst = monsters.nextCreature; nextMonst != NULL; nextMonst = nextMonst.nextCreature) {
          if (nextMonst.creatureState == MONSTER_ALLY
              && (nextMonst.info.abilityFlags & MA_CLONE_SELF_ON_DEFEND))
          {
              jellyCount++;
          }
      }
      if (jellyCount >= 90) {
          rogue.featRecord[FEAT_JELLYMANCER] = true;
      }
  }
	return newMonst;
}


function forbiddenFlagsForMonster( /* creatureType */ monsterType) {
	let flags;

	flags = T_PATHING_BLOCKER;
  if (monsterType.flags & MONST_INVULNERABLE) {
      flags &= ~(T_LAVA_INSTA_DEATH | T_SPONTANEOUSLY_IGNITES | T_IS_FIRE);
  }
	if (monsterType.flags & (MONST_IMMUNE_TO_FIRE | MONST_FLIES)) {
		flags &= ~T_LAVA_INSTA_DEATH;
	}
	if (monsterType.flags & MONST_IMMUNE_TO_FIRE) {
		flags &= ~(T_SPONTANEOUSLY_IGNITES | T_IS_FIRE);
	}
	if (monsterType.flags & (MONST_IMMUNE_TO_WATER | MONST_FLIES)) {
		flags &= ~T_IS_DEEP_WATER;
	}
	if (monsterType.flags & (MONST_FLIES)) {
		flags &= ~(T_AUTO_DESCENT | T_IS_DF_TRAP);
	}
	return flags;
}


function avoidedFlagsForMonster( /* creatureType */ monsterType) {
	let flags;

	flags = forbiddenFlagsForMonster(monsterType) | T_HARMFUL_TERRAIN | T_SACRED;

  if (monsterType.flags & MONST_INVULNERABLE) {
      flags &= ~(T_HARMFUL_TERRAIN | T_IS_DF_TRAP);
  }
	if (monsterType.flags & MONST_INANIMATE) {
		flags &= ~(T_CAUSES_POISON | T_CAUSES_DAMAGE | T_CAUSES_PARALYSIS | T_CAUSES_CONFUSION);
	}
	if (monsterType.flags & MONST_IMMUNE_TO_FIRE) {
		flags &= ~T_IS_FIRE;
	}
	if (monsterType.flags & MONST_FLIES) {
		flags &= ~T_CAUSES_POISON;
	}
	return flags;
}

function monsterCanSubmergeNow(/* creature */ monst) {
	return ((monst.info.flags & MONST_SUBMERGES)
			&& cellHasTMFlag(monst.xLoc, monst.yLoc, TM_ALLOWS_SUBMERGING)
			&& !cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_OBSTRUCTS_PASSABILITY)
			&& !(monst.bookkeepingFlags & (MB_SEIZING | MB_SEIZED | MB_CAPTIVE))
			&& ((monst.info.flags & (MONST_IMMUNE_TO_FIRE | MONST_INVULNERABLE))
				|| monst.status[STATUS_IMMUNE_TO_FIRE]
				|| !cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_LAVA_INSTA_DEATH)));
}

// Returns true if at least one minion spawned.
async function spawnMinions(hordeID, /* creature */ leader, summoned) {
	let iSpecies, iMember, count;
	let forbiddenTerrainFlags;
	let theHorde;  // hordeType *
	let monst; // creature *
	let x, y, loc;
	let failsafe;
	let atLeastOneMinion = false;
  const buf = STRING(), buf2 = STRING();

	x = leader.xLoc;
	y = leader.yLoc;

	theHorde = hordeCatalog[hordeID];

	for (iSpecies = 0; iSpecies < theHorde.numberOfMemberTypes; iSpecies++) {
		count = randClump(theHorde.memberCount[iSpecies]);

		forbiddenTerrainFlags = forbiddenFlagsForMonster(monsterCatalog[theHorde.memberType[iSpecies]]);
		if (hordeCatalog[hordeID].spawnsIn) {
			forbiddenTerrainFlags &= ~(tileCatalog[hordeCatalog[hordeID].spawnsIn].flags);
		}

		for (iMember = 0; iMember < count; iMember++) {
			monst = generateMonster(theHorde.memberType[iSpecies], true, !summoned);
			failsafe = 0;
			do {
        loc = getQualifyingPathLocNear(x, y, summoned,
                                 T_DIVIDES_LEVEL & forbiddenTerrainFlags, (HAS_PLAYER | HAS_STAIRS),
                                 forbiddenTerrainFlags, HAS_MONSTER, false);
			} while (!loc || (theHorde.spawnsIn && !cellHasTerrainType(monst.xLoc, monst.yLoc, theHorde.spawnsIn) && failsafe++ < 20));
			if (failsafe >= 20) {
				// abort
				killCreature(monst, true);
				break;
			}
      monst.xLoc = loc[0];
      monst.yLoc = loc[1];

			if (monsterCanSubmergeNow(monst)) {
				monst.bookkeepingFlags |= MB_SUBMERGED;
			}
      brogueAssert(!(pmap[monst.xLoc][monst.yLoc].flags & HAS_MONSTER));
			pmap[monst.xLoc][monst.yLoc].flags |= HAS_MONSTER;
			monst.bookkeepingFlags |= (MB_FOLLOWER | MB_JUST_SUMMONED);
			monst.leader = leader;
			monst.creatureState = leader.creatureState;
			monst.mapToMe = NULL;
			if (theHorde.flags & HORDE_DIES_ON_LEADER_DEATH) {
				monst.bookkeepingFlags |= MB_BOUND_TO_LEADER;
			}
			if (hordeCatalog[hordeID].flags & HORDE_ALLIED_WITH_PLAYER) {
				await becomeAllyWith(monst);
			}
			atLeastOneMinion = true;

      if (D_MESSAGE_MONSTER_GENERATION) {
        monsterName(buf, monst, false, true);
        sprintf(buf2, "Added minion: %s @ %i,%i", buf, monst.xLoc, monst.yLoc);
        message(buf2, false);
      }

		}
	}

	if (atLeastOneMinion && !(theHorde.flags & HORDE_DIES_ON_LEADER_DEATH)) {
		leader.bookkeepingFlags |= MB_LEADER;
	}

	return atLeastOneMinion;
}

function drawManacle(x, y, dir) {
	const manacles = [MANACLE_T, MANACLE_B, MANACLE_L, MANACLE_R, MANACLE_TL, MANACLE_BL, MANACLE_TR, MANACLE_BR];
	let newX = x + nbDirs[dir][0];
	let newY = y + nbDirs[dir][1];
	if (coordinatesAreInMap(newX, newY)
		&& pmap[newX][newY].layers[DUNGEON] == FLOOR
		&& pmap[newX][newY].layers[LIQUID] == NOTHING)
  {
		pmap[x + nbDirs[dir][0]][y + nbDirs[dir][1]].layers[SURFACE] = manacles[dir];
		return true;
	}
	return false;
}

function drawManacles( x, y) {
	const fallback = [[UPLEFT, UP, LEFT], [DOWNLEFT, DOWN, LEFT], [UPRIGHT, UP, RIGHT], [DOWNRIGHT, DOWN, RIGHT]];
	let i, j;
	for (i = 0; i < 4; i++) {
		for (j = 0; j < 3 && !drawManacle(x, y, fallback[i][j]); j++);
	}
}


// If hordeID is 0, it's randomly assigned based on the depth, with a 10% chance of an out-of-depth spawn from 1-5 levels deeper.
// If x is negative, location is random.
// Returns a pointer to the leader.
async function spawnHorde(hordeID, x, y, forbiddenFlags, requiredFlags) {
	let loc; // short[2];
	let i, failsafe, depth;
	let theHorde;  // hordeType *
	let leader, preexistingMonst;  // creature *
  let tryAgain;
  const buf = STRING(), buf2 = STRING();

	if (rogue.depthLevel > 1 && rand_percent(10)) {
		depth = rogue.depthLevel + rand_range(1, min(5, Math.floor(rogue.depthLevel / 2)));
		if (depth > AMULET_LEVEL) {
			depth = max(rogue.depthLevel, AMULET_LEVEL);
		}
    forbiddenFlags |= HORDE_NEVER_OOD;
	} else {
		depth = rogue.depthLevel;
	}

	if (hordeID <= 0) {
		failsafe = 50;
		do {
      tryAgain = false;
			hordeID = pickHordeType(depth, 0, forbiddenFlags, requiredFlags);
			if (hordeID < 0) {
				return NULL;
			}
      if (x >= 0 && y >= 0) {
        if (cellHasTerrainFlag(x, y, T_PATHING_BLOCKER)
            && (!hordeCatalog[hordeID].spawnsIn || !cellHasTerrainType(x, y, hordeCatalog[hordeID].spawnsIn)))
        {
            // don't spawn a horde in special terrain unless it's meant to spawn there
            tryAgain = true;
        }
        if (hordeCatalog[hordeID].spawnsIn && !cellHasTerrainType(x, y, hordeCatalog[hordeID].spawnsIn)) {
            // don't spawn a horde on normal terrain if it's meant for special terrain
            tryAgain = true;
        }
      }
		} while (--failsafe && tryAgain);
	}

	failsafe = 50;

	if (x < 0 || y < 0) {
		i = 0;
		do {

      loc = randomMatchingLocation(FLOOR, NOTHING, (hordeCatalog[hordeID].spawnsIn ? hordeCatalog[hordeID].spawnsIn : -1));

			while (!loc || passableArcCount(loc[0], loc[1]) > 1)
      {
				if (!--failsafe) {
					return NULL;
				}
				hordeID = pickHordeType(depth, 0, forbiddenFlags, 0);

				if (hordeID < 0) {
					return NULL;
				}

        loc = randomMatchingLocation(FLOOR, NOTHING, (hordeCatalog[hordeID].spawnsIn ? hordeCatalog[hordeID].spawnsIn : -1));
			}

			x = loc[0];
			y = loc[1];
			i++;

			// This "while" condition should contain IN_FIELD_OF_VIEW, since that is specifically
			// calculated from the entry stairs when the level is generated, and will prevent monsters
			// from spawning within FOV of the entry stairs.
		} while (i < 25 && (pmap[x][y].flags & (ANY_KIND_OF_VISIBLE | IN_FIELD_OF_VIEW)));
	}

//	if (hordeCatalog[hordeID].spawnsIn == DEEP_WATER && pmap[x][y].layers[LIQUID] != DEEP_WATER) {
//		ERROR("Waterborne monsters spawned on land!", true);
//	}

	theHorde = hordeCatalog[hordeID];

	if (theHorde.machine > 0) {
		// Build the accompanying machine (e.g. a goblin encampment)
		await buildAMachine(theHorde.machine, x, y, 0, NULL, NULL, NULL);
	}

	leader = generateMonster(theHorde.leaderType, true, true);
	leader.xLoc = x;
	leader.yLoc = y;

	if (hordeCatalog[hordeID].flags & HORDE_LEADER_CAPTIVE) {
		leader.bookkeepingFlags |= MB_CAPTIVE;
		leader.creatureState = MONSTER_WANDERING;
    if (leader.info.turnsBetweenRegen > 0) {
        leader.currentHP = Math.floor(leader.info.maxHP / 4) + 1;
    }

		// Draw the manacles unless the horde spawns in weird terrain (e.g. cages).
		if (!hordeCatalog[hordeID].spawnsIn) {
			drawManacles(x, y);
		}
	} else if (hordeCatalog[hordeID].flags & HORDE_ALLIED_WITH_PLAYER) {
		await becomeAllyWith(leader);
	}

  if (hordeCatalog[hordeID].flags & HORDE_SACRIFICE_TARGET) {
      leader.bookkeepingFlags |= MB_MARKED_FOR_SACRIFICE;
      leader.info.intrinsicLightType = SACRIFICE_MARK_LIGHT;
  }

  preexistingMonst = monsterAtLoc(x, y);
  if (preexistingMonst) {
      await killCreature(preexistingMonst, true); // If there's already a monster here, quietly bury the body.
  }

  brogueAssert(!(pmap[x][y].flags & HAS_MONSTER));

	pmap[x][y].flags |= HAS_MONSTER;
  if (playerCanSeeOrSense(x, y)) {
      refreshDungeonCell(x, y);
  }
	if (monsterCanSubmergeNow(leader)) {
		leader.bookkeepingFlags |= MB_SUBMERGED;
	}

  if (D_MESSAGE_MONSTER_GENERATION) {
    monsterName(buf, leader, false, true);
    sprintf(buf2, "Added monster: %s @ %i,%i", buf, leader.xLoc, leader.yLoc);
    message(buf2, false);
  }

	await spawnMinions(hordeID, leader, false);

	return leader;
}

function fadeInMonster( /* creature */ monst) {
	let fColor, bColor;
	let displayChar;
	const app = getCellAppearance(monst.xLoc, monst.yLoc);
	flashMonster(monst, app.backColor, 100);
}

function removeMonsterFromChain( /* creature */ monst, /* creature */ theChain) {
	let previousMonster; // creature *

	for (previousMonster = theChain;
		 previousMonster.nextCreature;
		 previousMonster = previousMonster.nextCreature)
  {
		if (previousMonster.nextCreature == monst) {
			previousMonster.nextCreature = monst.nextCreature;
			return true;
		}
	}
	return false;
}

async function summonMinions(/* creature */ summoner) {
	let summonerType = summoner.info.monsterID; // enum monsterTypes
	const hordeID = pickHordeType(0, summonerType, 0, 0);
  let seenMinionCount = 0, x, y;
	let atLeastOneMinion = false;
	let monst, host; // creature *
	const buf = STRING(); // char[DCOLS];
	const monstName = STRING(); // char[DCOLS];
  let grid;

	if (hordeID < 0) {
		return false;
	}

  host = NULL;

  if (summoner.info.abilityFlags & MA_ENTER_SUMMONS) {
      pmap[summoner.xLoc][summoner.yLoc].flags &= ~HAS_MONSTER;
      removeMonsterFromChain(summoner, monsters);
  }

	atLeastOneMinion = await spawnMinions(hordeID, summoner, true);

  if (hordeCatalog[hordeID].flags & HORDE_SUMMONED_AT_DISTANCE) {
      // Create a grid where "1" denotes a valid summoning location: within DCOLS/2 pathing distance,
      // not in harmful terrain, and outside of the player's field of view.
      grid = allocGrid();
      fillGrid(grid, 0);
      calculateDistances(grid, summoner.xLoc, summoner.yLoc, (T_PATHING_BLOCKER | T_SACRED), NULL, true, true);
      findReplaceGrid(grid, 1, Math.floor(DCOLS/2), 1);
      findReplaceGrid(grid, 2, 30000, 0);
      getTerrainGrid(grid, 0, (T_PATHING_BLOCKER | T_HARMFUL_TERRAIN), (IN_FIELD_OF_VIEW | CLAIRVOYANT_VISIBLE | HAS_PLAYER | HAS_MONSTER));
  } else {
      grid = NULL;
  }

	for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
		if (monst != summoner && monstersAreTeammates(monst, summoner)
			&& (monst.bookkeepingFlags & MB_JUST_SUMMONED))
    {
      if (hordeCatalog[hordeID].flags & HORDE_SUMMONED_AT_DISTANCE) {
          x = y = -1;
          const loc = randomLocationInGrid(grid, 1);
          x = loc[0];
          y = loc[1];
          await teleport(monst, x, y, true);
          if (x != -1 && y != -1 && grid != NULL) {
              grid[x][y] = 0;
          }
      }

			monst.bookkeepingFlags &= ~MB_JUST_SUMMONED;
			if (canSeeMonster(monst)) {
				seenMinionCount++;
				refreshDungeonCell(monst.xLoc, monst.yLoc);
			}
			monst.ticksUntilTurn = 101;
			monst.leader = summoner;
			if (monst.carriedItem) {
				deleteItem(monst.carriedItem);
				monst.carriedItem = NULL;
			}
			fadeInMonster(monst);
			host = monst;
		}
	}

	if (canSeeMonster(summoner)) {
		monsterName(monstName, summoner, true);
		if (monsterText[summoner.info.monsterID].summonMessage) {
			sprintf(buf, "%s %s", monstName, monsterText[summoner.info.monsterID].summonMessage);
		} else {
			sprintf(buf, "%s incants darkly!", monstName);
		}
		message(buf, false);
	}

  if (summoner.info.abilityFlags & MA_ENTER_SUMMONS) {
      if (atLeastOneMinion && host) {
          host.carriedMonster = summoner;
          demoteMonsterFromLeadership(summoner);
          refreshDungeonCell(summoner.xLoc, summoner.yLoc);
      } else {
          pmap[summoner.xLoc][summoner.yLoc].flags |= HAS_MONSTER;
          summoner.nextCreature = monsters.nextCreature;
          monsters.nextCreature = summoner;
      }
  } else if (atLeastOneMinion) {
      summoner.bookkeepingFlags |= MB_LEADER;
  }
  createFlare(summoner.xLoc, summoner.yLoc, SUMMONING_FLASH_LIGHT);

  if (grid) {
    freeGrid(grid);
  }

	return atLeastOneMinion;
}

// Generates and places monsters for the level.
async function populateMonsters() {

	if (!MONSTERS_ENABLED) {
		return;
	}

	let i, numberOfMonsters = min(20, 6 + 3 * max(0, rogue.depthLevel - AMULET_LEVEL)); // almost always 6.

	while (rand_percent(60)) {
		numberOfMonsters++;
	}
  if (D_INSPECT_MON_GEN) {
    console.log('Generating ' + numberOfMonsters + ' monsters.');
  }
	for (i=0; i<numberOfMonsters; i++) {
		await spawnHorde(0, -1, -1, (HORDE_IS_SUMMONED | HORDE_MACHINE_ONLY), 0); // random horde type, random location
	}

  if (D_INSPECT_LEVELGEN) {
    let mon = monsters.nextMonster;
    while(mon) {
      hiliteCell(mon.xLoc, mon.yLoc, teal, 50);
      mon = mon.nextMonster;
    }
    await temporaryMessage("Added monsters.", true);
  }

}

async function getRandomMonsterSpawnLocation() {
    let grid;
    let x, y;

    grid = allocGrid();
    fillGrid(grid, 0);
    calculateDistances(grid, player.xLoc, player.yLoc, T_DIVIDES_LEVEL, NULL, true, true);
    getTerrainGrid(grid, 0, (T_PATHING_BLOCKER | T_HARMFUL_TERRAIN), (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS | IN_FIELD_OF_VIEW));
    findReplaceGrid(grid, -30000, Math.floor(DCOLS/2) - 1, 0);
    findReplaceGrid(grid, 30000, 30000, 0);
    findReplaceGrid(grid, Math.floor(DCOLS/2), 30000-1, 1);
    let loc = randomLocationInGrid(grid, 1);
    x = loc[0];
    y = loc[1];
    if (x < 0 || y < 0) {
        fillGrid(grid, 1);
        getTerrainGrid(grid, 0, (T_PATHING_BLOCKER | T_HARMFUL_TERRAIN), (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS | IN_FIELD_OF_VIEW | IS_IN_MACHINE));
        loc = randomLocationInGrid(grid, 1);
        x = loc[0];
        y = loc[1];
    }
    if (D_INSPECT_MONSTER_SPAWN) {
      const dbuf = GRID(COLS, ROWS, cellDisplayBuffer );
      copyDisplayBuffer(dbuf, displayBuffer);
      hiliteGrid(grid, orange, 50);
      plotCharWithColor('X', mapToWindowX(x), mapToWindowY(y), black, white);
      await temporaryMessage("Horde spawn location possibilities:", true);
      overlayDisplayBuffer(dbuf);
    }
    freeGrid(grid);
    if (x < 0 || y < 0) {
        return null;
    }
    return [x, y];
}

async function spawnPeriodicHorde() {
	let monst, monst2;   // creature *
	let x, y;

	if (!MONSTERS_ENABLED) {
		return;
	}

  const loc = await getRandomMonsterSpawnLocation();
  if (loc) {
    x = loc[0];
    y = loc[1];
    monst = await spawnHorde(0, x, y, (HORDE_IS_SUMMONED | HORDE_LEADER_CAPTIVE | HORDE_NO_PERIODIC_SPAWN | HORDE_MACHINE_ONLY), 0);
    if (monst) {
        monst.creatureState = MONSTER_WANDERING;
        for (monst2 = monsters.nextCreature; monst2 != NULL; monst2 = monst2.nextCreature) {
            if (monst2.leader == monst) {
                monst2.creatureState = MONSTER_WANDERING;
            }
        }
    }
  }
}

// x and y are optional.
async function teleport( /* creature */ monst, x, y, respectTerrainAvoidancePreferences) {
	let grid, i, j;
	let monstFOV = GRID(DCOLS, DROWS); // char[DCOLS][DROWS];

  if (!coordinatesAreInMap(x, y)) {
      zeroOutGrid(monstFOV);
      getFOVMask(monstFOV, monst.xLoc, monst.yLoc, DCOLS, T_OBSTRUCTS_VISION, 0, false);
      grid = allocGrid();
      fillGrid(grid, 0);
      calculateDistances(grid, monst.xLoc, monst.yLoc, forbiddenFlagsForMonster(monst.info) & T_DIVIDES_LEVEL, NULL, true, false);
      findReplaceGrid(grid, -30000, Math.floor(DCOLS/2), 0);
      findReplaceGrid(grid, 2, 30000, 1);
      if (validLocationCount(grid, 1) < 1) {
          fillGrid(grid, 1);
      }
      if (respectTerrainAvoidancePreferences) {
          if (monst.info.flags & MONST_RESTRICTED_TO_LIQUID) {
              fillGrid(grid, 0);
              getTMGrid(grid, 1, TM_ALLOWS_SUBMERGING);
          }
          getTerrainGrid(grid, 0, avoidedFlagsForMonster(monst.info), (IS_IN_MACHINE | HAS_PLAYER | HAS_MONSTER | HAS_STAIRS));
      } else {
          getTerrainGrid(grid, 0, forbiddenFlagsForMonster(monst.info), (IS_IN_MACHINE | HAS_PLAYER | HAS_MONSTER | HAS_STAIRS));
      }
      for (i=0; i<DCOLS; i++) {
          for (j=0; j<DROWS; j++) {
              if (monstFOV[i][j]) {
                  grid[i][j] = 0;
              }
          }
      }
      const loc = randomLocationInGrid(grid, 1);
//        DEBUG {
//            dumpLevelToScreen();
//            hiliteGrid(grid, orange, 50);
//            plotCharWithColor('X', mapToWindowX(x), mapToWindowY(y), &white, &red);
//            temporaryMessage("Teleport candidate locations:", true);
//        }
      freeGrid(grid);
      if (!loc || loc[0] < 0 || loc[1] < 0) {
          return; // Failure!
      }
      x = loc[0];
      y = loc[1];
  }
  setMonsterLocation(monst, x, y);
  if (monst !== player) {
      chooseNewWanderDestination(monst);
  }
}

function isValidWanderDestination( /* creature */ monst, wpIndex) {
    return (wpIndex >= 0
            && wpIndex < rogue.wpCount
            && !monst.waypointAlreadyVisited[wpIndex]
            && rogue.wpDistance[wpIndex][monst.xLoc][monst.yLoc] >= 0
            && nextStep(rogue.wpDistance[wpIndex], monst.xLoc, monst.yLoc, monst, false) != NO_DIRECTION);
}

function closestWaypointIndex( /* creature */ monst) {
    let i, closestDistance, closestIndex;

    closestDistance = Math.floor(DCOLS/2);
    closestIndex = -1;
    for (i=0; i < rogue.wpCount; i++) {
        if (isValidWanderDestination(monst, i)
            && rogue.wpDistance[i][monst.xLoc][monst.yLoc] < closestDistance)
        {

            closestDistance = rogue.wpDistance[i][monst.xLoc][monst.yLoc];
            closestIndex = i;
        }
    }
    return closestIndex;
}

function chooseNewWanderDestination( /* creature */ monst) {
    let i;

    brogueAssert(monst.targetWaypointIndex < MAX_WAYPOINT_COUNT);
    brogueAssert(rogue.wpCount > 0 && rogue.wpCount <= MAX_WAYPOINT_COUNT);

    // Set two checkpoints at random to false (which equilibrates to 50% of checkpoints being active).
    monst.waypointAlreadyVisited[rand_range(0, rogue.wpCount - 1)] = false;
    monst.waypointAlreadyVisited[rand_range(0, rogue.wpCount - 1)] = false;
    // Set the targeted checkpoint to true.
    if (monst.targetWaypointIndex >= 0) {
        monst.waypointAlreadyVisited[monst.targetWaypointIndex] = true;
    }

    monst.targetWaypointIndex = closestWaypointIndex(monst); // Will be -1 if no waypoints were available.
    if (monst.targetWaypointIndex == -1) {
        for (i=0; i < rogue.wpCount; i++) {
            monst.waypointAlreadyVisited[i] = 0;
        }
        monst.targetWaypointIndex = closestWaypointIndex(monst);
    }
}

ENUM('subseqDFTypes',
	'SUBSEQ_PROMOTE',
	'SUBSEQ_BURN',
  'SUBSEQ_DISCOVER',
);

// Returns the terrain flags of this tile after it's promoted according to the event corresponding to subseqDFTypes.
function successorTerrainFlags(/* tileType*/ tile, /* subseqDFTypes */ promotionType) {
    let DF = 0;   // enum dungeonFeatureTypes

    switch (promotionType) {
        case SUBSEQ_PROMOTE:
            DF = tileCatalog[tile].promoteType;
            break;
        case SUBSEQ_BURN:
            DF = tileCatalog[tile].fireType;
            break;
        case SUBSEQ_DISCOVER:
            DF = tileCatalog[tile].discoverType;
            break;
        default:
            break;
    }

    if (DF) {
        return tileCatalog[dungeonFeatureCatalog[DF].tile].flags;
    } else {
        return 0;
    }
}

function burnedTerrainFlagsAtLoc( x,  y) {
    let layer;
    let flags = 0;

    for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
        if (tileCatalog[pmap[x][y].layers[layer]].flags & T_IS_FLAMMABLE) {
            flags |= successorTerrainFlags(pmap[x][y].layers[layer], SUBSEQ_BURN);
            if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_EXPLOSIVE_PROMOTE) {
                flags |= successorTerrainFlags(pmap[x][y].layers[layer], SUBSEQ_PROMOTE);
            }
        }
    }

    return flags;
}


function discoveredTerrainFlagsAtLoc(x, y) {
    let layer;
    let flags = 0;

    for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
        if (tileCatalog[pmap[x][y].layers[layer]].mechFlags & TM_IS_SECRET) {
            flags |= successorTerrainFlags(pmap[x][y].layers[layer], SUBSEQ_DISCOVER);
        }
    }

    return flags;
}


function monsterAvoids( /* creature */ monst, x, y) {
  let terrainImmunities;
	let defender;  // creature *
  let tFlags, cFlags;

  const flags = getLocationFlags(x, y, monst === player);
  tFlags = flags.terrainFlags;
  cFlags = flags.cellFlags;

	// everyone but the player avoids the stairs
	if ((x == rogue.downLoc[0] && y == rogue.downLoc[1])
		|| (x == rogue.upLoc[0] && y == rogue.upLoc[1]))
  {
		return monst !== player;
	}

	// dry land
	if (monst.info.flags & MONST_RESTRICTED_TO_LIQUID
		&& !cellHasTMFlag(x, y, TM_ALLOWS_SUBMERGING)) {
		return true;
	}

	// non-allied monsters can always attack the player
	if (player.xLoc == x && player.yLoc == y && monst !== player && monst.creatureState != MONSTER_ALLY) {
		return false;
	}

	// walls
	if (tFlags & T_OBSTRUCTS_PASSABILITY) {
        if (monst !== player
            && cellHasTMFlag(x, y, TM_IS_SECRET)
            && !(discoveredTerrainFlagsAtLoc(x, y) & avoidedFlagsForMonster(monst.info)))
        {
            // This is so monsters can use secret doors but won't embed themselves in secret levers.
            return false;
        }
        if (distanceBetween(monst.xLoc, monst.yLoc, x, y) <= 1) {
            defender = monsterAtLoc(x, y);
            if (defender && (defender.info.flags & MONST_ATTACKABLE_THRU_WALLS)) {
                return false;
            }
        }
		return true;
	}

  // Monsters can always attack unfriendly neighboring monsters,
  // unless it is immune to us for whatever reason.
  if (distanceBetween(monst.xLoc, monst.yLoc, x, y) <= 1) {
      defender = monsterAtLoc(x, y);
      if (defender
        && !(defender.bookkeepingFlags & MB_IS_DYING)
        && monsterWillAttackTarget(monst, defender))
      {
          if (attackWouldBeFutile(monst, defender)) {
              return true;
          } else {
              return false;
          }
      }
  }

  // Monsters always avoid enemy monsters that we can't damage.
  defender = monsterAtLoc(x, y);
  if (defender
      && !(defender.bookkeepingFlags & MB_IS_DYING)
      && monstersAreEnemies(monst, defender)
      && attackWouldBeFutile(monst, defender))
  {
      return true;
  }

	// hidden terrain
	if (cellHasTMFlag(x, y, TM_IS_SECRET) && monst === player) {
		return false; // player won't avoid what he doesn't know about
	}

    // Determine invulnerabilities based only on monster characteristics.
    terrainImmunities = 0;
    if (monst.status[STATUS_IMMUNE_TO_FIRE]) {
        terrainImmunities |= (T_IS_FIRE | T_SPONTANEOUSLY_IGNITES | T_LAVA_INSTA_DEATH);
    }
    if (monst.info.flags & MONST_INVULNERABLE) {
        terrainImmunities |= T_HARMFUL_TERRAIN | T_ENTANGLES | T_SPONTANEOUSLY_IGNITES | T_LAVA_INSTA_DEATH;
    }
    if (monst.info.flags & MONST_INANIMATE) {
        terrainImmunities |= (T_CAUSES_DAMAGE | T_CAUSES_PARALYSIS | T_CAUSES_CONFUSION | T_CAUSES_NAUSEA | T_CAUSES_POISON);
    }
    if (monst.status[STATUS_LEVITATING]) {
        terrainImmunities |= (T_AUTO_DESCENT | T_CAUSES_POISON | T_IS_DEEP_WATER | T_IS_DF_TRAP | T_LAVA_INSTA_DEATH);
    }
    if (monst.info.flags & MONST_IMMUNE_TO_WEBS) {
        terrainImmunities |= T_ENTANGLES;
    }
    if (monst.info.flags & MONST_IMMUNE_TO_WATER) {
        terrainImmunities |= T_IS_DEEP_WATER;
    }
    if (monst === player) {
        terrainImmunities |= T_SACRED;
    }
    if (monst === player
        && rogue.armor
        && (rogue.armor.flags & ITEM_RUNIC)
        && rogue.armor.enchant2 == A_RESPIRATION)
    {
        terrainImmunities |= T_RESPIRATION_IMMUNITIES;
    }

    // sacred ground
    if ((tFlags & T_SACRED & ~terrainImmunities)) {
        return true;
    }

	// brimstone
	if (!(monst.status[STATUS_IMMUNE_TO_FIRE])
        && !(monst.info.flags & MONST_INVULNERABLE)
        && (tFlags & T_SPONTANEOUSLY_IGNITES)
		&& !(cFlags & (HAS_MONSTER | HAS_PLAYER))
		&& !cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_IS_FIRE | T_SPONTANEOUSLY_IGNITES)
		&& (monst === player || (monst.creatureState != MONSTER_TRACKING_SCENT && monst.creatureState != MONSTER_FLEEING)))
  {
		return true;
	}

	// burning wandering monsters avoid flammable terrain out of common courtesy
	if (monst !== player
		&& monst.creatureState == MONSTER_WANDERING
		&& (monst.info.flags & MONST_FIERY)
		&& (tFlags & T_IS_FLAMMABLE))
  {
		return true;
	}

    // burning monsters avoid explosive terrain and steam-emitting terrain
    if (monst !== player
        && monst.status[STATUS_BURNING]
        && (burnedTerrainFlagsAtLoc(x, y) & (T_CAUSES_EXPLOSIVE_DAMAGE | T_CAUSES_DAMAGE | T_AUTO_DESCENT) & ~terrainImmunities))
    {
        return true;
    }

	// fire
	if ((tFlags & T_IS_FIRE & ~terrainImmunities)
		&& !cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_IS_FIRE)
		&& !(cFlags & (HAS_MONSTER | HAS_PLAYER))
		&& (monst !== player || rogue.mapToShore[x][y] >= player.status[STATUS_IMMUNE_TO_FIRE]))
  {
		return true;
	}

	// non-fire harmful terrain
	if ((tFlags & T_HARMFUL_TERRAIN & ~T_IS_FIRE & ~terrainImmunities)
		&& !cellHasTerrainFlag(monst.xLoc, monst.yLoc, (T_HARMFUL_TERRAIN & ~T_IS_FIRE)))
  {
		return true;
	}

    // chasms or trap doors
    if ((tFlags & T_AUTO_DESCENT & ~terrainImmunities)
        && (!(tFlags & T_ENTANGLES) || !(monst.info.flags & MONST_IMMUNE_TO_WEBS)))
    {
        return true;
    }

    // gas or other environmental traps
    if ((tFlags & T_IS_DF_TRAP & ~terrainImmunities)
        && !(cFlags & PRESSURE_PLATE_DEPRESSED)
        && (monst === player || monst.creatureState == MONSTER_WANDERING
            || (monst.creatureState == MONSTER_ALLY && !(cellHasTMFlag(x, y, TM_IS_SECRET))))
        && !(monst.status[STATUS_ENTRANCED])
        && (!(tFlags & T_ENTANGLES) || !(monst.info.flags & MONST_IMMUNE_TO_WEBS)))
    {
        return true;
    }

    // lava
    if ((tFlags & T_LAVA_INSTA_DEATH & ~terrainImmunities)
        && (!(tFlags & T_ENTANGLES) || !(monst.info.flags & MONST_IMMUNE_TO_WEBS))
        && (monst !== player || rogue.mapToShore[x][y] >= max(player.status[STATUS_IMMUNE_TO_FIRE], player.status[STATUS_LEVITATING])))
    {
        return true;
    }

    // deep water
    if ((tFlags & T_IS_DEEP_WATER & ~terrainImmunities)
        && (!(tFlags & T_ENTANGLES) || !(monst.info.flags & MONST_IMMUNE_TO_WEBS))
        && !cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_IS_DEEP_WATER))
    {
        return true; // avoid only if not already in it
    }

    // poisonous lichen
    if ((tFlags & T_CAUSES_POISON & ~terrainImmunities)
        && !cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_CAUSES_POISON)
        && (monst === player || monst.creatureState != MONSTER_TRACKING_SCENT || monst.currentHP < 10))
    {
        return true;
    }

    // Smart monsters don't attack in corridors if they belong to a group and they can help it.
    if ((monst.info.abilityFlags & MA_AVOID_CORRIDORS)
        && monst.creatureState == MONSTER_TRACKING_SCENT
        && (monst.bookkeepingFlags & (MB_FOLLOWER | MB_LEADER))
        && passableArcCount(x, y) >= 2
        && passableArcCount(monst.xLoc, monst.yLoc) < 2
        && !cellHasTerrainFlag(monst.xLoc, monst.yLoc, (T_HARMFUL_TERRAIN & ~terrainImmunities)))
    {
        return true;
    }

    return false;
}

async function moveMonsterPassivelyTowards(/* creature */ monst, targetLoc /* short[2] */, willingToAttackPlayer) {
	let x, y, dx, dy, newX, newY;

	x = monst.xLoc;
	y = monst.yLoc;

	if (targetLoc[0] == x) {
		dx = 0;
	} else {
		dx = (targetLoc[0] < x ? -1 : 1);
	}
	if (targetLoc[1] == y) {
		dy = 0;
	} else {
		dy = (targetLoc[1] < y ? -1 : 1);
	}

	if (dx == 0 && dy == 0) { // already at the destination
		return false;
	}

	newX = x + dx;
	newY = y + dy;

	if (!coordinatesAreInMap(newX, newY)) {
		return false;
	}

	if (monst.creatureState != MONSTER_TRACKING_SCENT && dx && dy) {
		if (abs(targetLoc[0] - x) > abs(targetLoc[1] - y) && rand_range(0, abs(targetLoc[0] - x)) > abs(targetLoc[1] - y)) {
			if (!(monsterAvoids(monst, newX, y) || (!willingToAttackPlayer && (pmap[newX][y].flags & HAS_PLAYER)) || !await moveMonster(monst, dx, 0))) {
				return true;
			}
		} else if (abs(targetLoc[0] - x) < abs(targetLoc[1] - y) && rand_range(0, abs(targetLoc[1] - y)) > abs(targetLoc[0] - x)) {
			if (!(monsterAvoids(monst, x, newY) || (!willingToAttackPlayer && (pmap[x][newY].flags & HAS_PLAYER)) || !await moveMonster(monst, 0, dy))) {
				return true;
			}
		}
	}

	// Try to move toward the goal diagonally if possible or else straight.
	// If that fails, try both directions for the shorter coordinate.
	// If they all fail, return false.
	if (monsterAvoids(monst, newX, newY) || (!willingToAttackPlayer && (pmap[newX][newY].flags & HAS_PLAYER)) || ! await moveMonster(monst, dx, dy)) {
		if (distanceBetween(x, y, targetLoc[0], targetLoc[1]) <= 1 && (dx == 0 || dy == 0)) { // cardinally adjacent
			return false; // destination is blocked
		}
		//abs(targetLoc[0] - x) < abs(targetLoc[1] - y)
		if ((max(targetLoc[0], x) - min(targetLoc[0], x)) < (max(targetLoc[1], y) - min(targetLoc[1], y))) {
			if (monsterAvoids(monst, x, newY) || (!willingToAttackPlayer && pmap[x][newY].flags & HAS_PLAYER) || ! await moveMonster(monst, 0, dy)) {
				if (monsterAvoids(monst, newX, y) || (!willingToAttackPlayer &&  pmap[newX][y].flags & HAS_PLAYER) || ! await moveMonster(monst, dx, 0)) {
					if (monsterAvoids(monst, x-1, newY) || (!willingToAttackPlayer && pmap[x-1][newY].flags & HAS_PLAYER) || ! await moveMonster(monst, -1, dy)) {
						if (monsterAvoids(monst, x+1, newY) || (!willingToAttackPlayer && pmap[x+1][newY].flags & HAS_PLAYER) || ! await moveMonster(monst, 1, dy)) {
							return false;
						}
					}
				}
			}
		} else {
			if (monsterAvoids(monst, newX, y) || (!willingToAttackPlayer && pmap[newX][y].flags & HAS_PLAYER) || ! await moveMonster(monst, dx, 0)) {
				if (monsterAvoids(monst, x, newY) || (!willingToAttackPlayer && pmap[x][newY].flags & HAS_PLAYER) || ! await moveMonster(monst, 0, dy)) {
					if (monsterAvoids(monst, newX, y-1) || (!willingToAttackPlayer && pmap[newX][y-1].flags & HAS_PLAYER) || ! await moveMonster(monst, dx, -1)) {
						if (monsterAvoids(monst, newX, y+1) || (!willingToAttackPlayer && pmap[newX][y+1].flags & HAS_PLAYER) || ! await moveMonster(monst, dx, 1)) {
							return false;
						}
					}
				}
			}
		}
	}
	return true;
}

function distanceBetween(x1, y1, x2, y2) {
	return max(abs(x1 - x2), abs(y1 - y2));
}

function alertMonster( /* creature */ monst) {
    monst.creatureState = (monst.creatureMode == MODE_PERM_FLEEING ? MONSTER_FLEEING : MONSTER_TRACKING_SCENT);
    monst.lastSeenPlayerAt[0] = player.xLoc;
    monst.lastSeenPlayerAt[1] = player.yLoc;
}

function wakeUp(/* creature */ monst) {
	let teammate;  // creature *

	if (monst.creatureState != MONSTER_ALLY) {
    alertMonster(monst);
	}
	monst.ticksUntilTurn = 100;
	for (teammate = monsters.nextCreature; teammate != NULL; teammate = teammate.nextCreature) {
		if (monst != teammate && monstersAreTeammates(monst, teammate) && teammate.creatureMode == MODE_NORMAL) {
      if (teammate.creatureState == MONSTER_SLEEPING
          || teammate.creatureState == MONSTER_WANDERING)
      {
          teammate.ticksUntilTurn = max(100, teammate.ticksUntilTurn);
      }
			if (monst.creatureState != MONSTER_ALLY) {
				teammate.creatureState = (teammate.creatureMode == MODE_PERM_FLEEING ? MONSTER_FLEEING : MONSTER_TRACKING_SCENT);
        updateMonsterState(teammate);
			}
		}
	}
}

function monsterCanShootWebs(/* creature */ monst) {
    let i;
    for (i=0; monst.info.bolts[i] != 0; i++) {
        const theBolt = boltCatalog[monst.info.bolts[i]];
        if (theBolt.pathDF && (tileCatalog[dungeonFeatureCatalog[theBolt.pathDF].tile].flags & T_ENTANGLES)) {
            return true;
        }
    }
    return false;
}

// Assumes that observer is not the player.
// Returns approximately double the actual (quasi-euclidian) distance.
function awarenessDistance( /* creature */ observer, /* creature */ target) {
	let perceivedDistance;

	// start with base distance
	if ((observer.status[STATUS_LEVITATING]
         || (observer.info.flags & MONST_RESTRICTED_TO_LIQUID)
         || (observer.info.flags & MONST_IMMOBILE)
         || (observer.bookkeepingFlags & MB_SUBMERGED)
		 || ((observer.info.flags & MONST_IMMUNE_TO_WEBS) && monsterCanShootWebs(observer)))
		&& ((target === player && (pmap[observer.xLoc][observer.yLoc].flags & IN_FIELD_OF_VIEW))
            || (target !== player && openPathBetween(observer.xLoc, observer.yLoc, target.xLoc, target.yLoc)))) {
			// if monster flies or is immobile or waterbound or underwater or can cross pits with webs,
            // use absolute distance.
			perceivedDistance = scentDistance(observer.xLoc, observer.yLoc, target.xLoc, target.yLoc);
		} else {
			perceivedDistance = (rogue.scentTurnNumber - scentMap[observer.xLoc][observer.yLoc]); // this value is double the apparent distance
		}

	perceivedDistance = min(perceivedDistance, 1000);

	if (perceivedDistance < 0) {
		perceivedDistance = 1000;
	}
	return Math.floor(perceivedDistance);
}

// yes or no -- observer is aware of the target as of this new turn.
// takes into account whether it is ALREADY aware of the target.
function awareOfTarget( /* creature */ observer, /* creature */ target) {
	let perceivedDistance = awarenessDistance(observer, target);
	let awareness = rogue.aggroRange * 2;
  let retval;

  brogueAssert(perceivedDistance >= 0 && awareness >= 0);

	if (observer.info.flags & MONST_ALWAYS_HUNTING) {
    retval = true;
  } else if (observer.info.flags & MONST_IMMOBILE) {
    // Turrets and totems are aware of you iff they are within stealth range.
    // The only exception is mirror totems; they're always ready to shoot because they have "always hunting" set.
    retval = (perceivedDistance <= awareness);
  } else if (perceivedDistance > awareness * 3) {
		// out of awareness range, even if hunting
		retval = false;
	} else if (observer.creatureState == MONSTER_TRACKING_SCENT) {
		// already aware of the target, lose track 3% of the time if outside of stealth range.
    if (perceivedDistance > awareness) {
      retval = rand_percent(3);
    } else {
       retval = true;
    }
	} else if (target === player
		&& !(pmap[observer.xLoc][observer.yLoc].flags & IN_FIELD_OF_VIEW))
  {
		// observer not hunting and player-target not in field of view
		retval = false;
	} else if (perceivedDistance <= awareness) {
    // within range but currently unaware
    retval = rand_percent(25);
  } else {
    retval = false;
  }
  return retval;
}

function closestWaypointIndexTo(x, y) {
    let i, closestDistance, closestIndex;

    closestDistance = 1000;
    closestIndex = -1;
    for (i=0; i < rogue.wpCount; i++) {
        if (rogue.wpDistance[i][x][y] < closestDistance) {
            closestDistance = rogue.wpDistance[i][x][y];
            closestIndex = i;
        }
    }
    return closestIndex;
}

function wanderToward(/* creature */ monst, x, y) {
    if (coordinatesAreInMap(x, y)) {
        const theWaypointIndex = closestWaypointIndexTo(x, y);
        if (theWaypointIndex != -1) {
            monst.waypointAlreadyVisited[theWaypointIndex] = false;
            monst.targetWaypointIndex = theWaypointIndex;
        }
    }
}

function updateMonsterState( /* creature */ monst) {
	let x, y, closestFearedEnemy;
	let awareOfPlayer;
	//char buf[DCOLS*3], monstName[DCOLS];
  let monst2; // creature *

	x = monst.xLoc;
	y = monst.yLoc;

	if ((monst.info.flags & MONST_ALWAYS_HUNTING)
        && monst.creatureState != MONSTER_ALLY)
  {
    monst.creatureState = MONSTER_TRACKING_SCENT;
    return;
  }

	awareOfPlayer = awareOfTarget(monst, player);

  if ((monst.info.flags & MONST_IMMOBILE)
      && monst.creatureState != MONSTER_ALLY)
  {
      if (awareOfPlayer) {
          monst.creatureState = MONSTER_TRACKING_SCENT;
      } else {
          monst.creatureState = MONSTER_SLEEPING;
      }
		return;
	}

	if (monst.creatureMode == MODE_PERM_FLEEING
		&& (monst.creatureState == MONSTER_WANDERING || monst.creatureState == MONSTER_TRACKING_SCENT))
  {
		monst.creatureState = MONSTER_FLEEING;
	}

  closestFearedEnemy = DCOLS+DROWS;
  CYCLE_MONSTERS_AND_PLAYERS( (monst2) => {
      if (monsterFleesFrom(monst, monst2)
          && distanceBetween(x, y, monst2.xLoc, monst2.yLoc) < closestFearedEnemy
          && traversiblePathBetween(monst2, x, y)
          && openPathBetween(x, y, monst2.xLoc, monst2.yLoc))
      {
          closestFearedEnemy = distanceBetween(x, y, monst2.xLoc, monst2.yLoc);
      }
  });

	if ((monst.creatureState == MONSTER_WANDERING)
        && awareOfPlayer
        && (pmap[player.xLoc][player.yLoc].flags & IN_FIELD_OF_VIEW)) {

		// If wandering and you notice the player, start tracking the scent.
		alertMonster(monst);
	} else if (monst.creatureState == MONSTER_SLEEPING) {
		// if sleeping, the monster has a chance to awaken

		if (awareOfPlayer) {
			wakeUp(monst); // wakes up the whole horde if necessary

//			if (canSeeMonster(monst)) {
//				monsterName(monstName, monst, true);
//				sprintf(buf, "%s awakens!", monstName);
//				combatMessage(buf, 0);
//			}
		}
	} else if (monst.creatureState == MONSTER_TRACKING_SCENT && !awareOfPlayer) {
		// if tracking scent, but the scent is weaker than the scent detection threshold, begin wandering.
		monst.creatureState = MONSTER_WANDERING;
        wanderToward(monst, monst.lastSeenPlayerAt[0], monst.lastSeenPlayerAt[1]);
	} else if (monst.creatureState == MONSTER_TRACKING_SCENT
			   && closestFearedEnemy < 3)
  {
		monst.creatureState = MONSTER_FLEEING;
  } else if (monst.creatureState != MONSTER_ALLY
               && (monst.info.flags & MONST_FLEES_NEAR_DEATH)
               && monst.currentHP <= Math.floor(3 * monst.info.maxHP / 4))
  {
    if (monst.creatureState == MONSTER_FLEEING
        || monst.currentHP <= Math.floor(monst.info.maxHP / 4))
    {
        monst.creatureState = MONSTER_FLEEING;
    }
	} else if (monst.creatureMode == MODE_NORMAL
			   && monst.creatureState == MONSTER_FLEEING
			   && !(monst.status[STATUS_MAGICAL_FEAR])
			   && closestFearedEnemy >= 3)
 {
		monst.creatureState = MONSTER_TRACKING_SCENT;
	} else if (monst.creatureMode == MODE_PERM_FLEEING
			   && monst.creatureState == MONSTER_FLEEING
			   && (monst.info.abilityFlags & MA_HIT_STEAL_FLEE)
			   && !(monst.status[STATUS_MAGICAL_FEAR])
			   && !(monst.carriedItem))
 {
		monst.creatureMode = MODE_NORMAL;
    alertMonster(monst);
	} else if (monst.creatureMode == MODE_NORMAL
			   && monst.creatureState == MONSTER_FLEEING
			   && (monst.info.flags & MONST_FLEES_NEAR_DEATH)
			   && !(monst.status[STATUS_MAGICAL_FEAR])
			   && monst.currentHP >= Math.floor(monst.info.maxHP * 3 / 4))
   {
      if ((monst.bookkeepingFlags & MB_FOLLOWER) && monst.leader === player) {
          monst.creatureState = MONSTER_ALLY;
      } else {
          alertMonster(monst);
      }
	}

  if (awareOfPlayer) {
      if (monst.creatureState == MONSTER_FLEEING
          || monst.creatureState == MONSTER_TRACKING_SCENT)
      {
          monst.lastSeenPlayerAt[0] = player.xLoc;
          monst.lastSeenPlayerAt[1] = player.yLoc;
      }
  }
}

async function decrementMonsterStatus( /* creature */ monst) {
	let i, damage;
	const buf = STRING(), buf2 = STRING(); // char[COLS];

	monst.bookkeepingFlags &= ~MB_JUST_SUMMONED;

	if (monst.currentHP < monst.info.maxHP
        && monst.info.turnsBetweenRegen > 0
        && !monst.status[STATUS_POISONED])
  {
		if ((monst.turnsUntilRegen -= 1000) <= 0) {
			monst.currentHP++;
      monst.previousHealthPoints++;
			monst.turnsUntilRegen += monst.info.turnsBetweenRegen;
		}
	}

	for (i=0; i<NUMBER_OF_STATUS_EFFECTS; i++) {
    switch (i) {
      case STATUS_LEVITATING:
          if (monst.status[i] && !(monst.info.flags & MONST_FLIES)) {
              monst.status[i]--;
          }
          break;
      case STATUS_SLOWED:
          if (monst.status[i] && !--monst.status[i]) {
              monst.movementSpeed = monst.info.movementSpeed;
              monst.attackSpeed = monst.info.attackSpeed;
          }
          break;
      case STATUS_WEAKENED:
          if (monst.status[i] && !--monst.status[i]) {
              monst.weaknessAmount = 0;
          }
          break;
      case STATUS_HASTED:
          if (monst.status[i]) {
              if (!--monst.status[i]) {
                  monst.movementSpeed = monst.info.movementSpeed;
                  monst.attackSpeed = monst.info.attackSpeed;
              }
          }
          break;
      case STATUS_BURNING:
          if (monst.status[i]) {
              if (!(monst.info.flags & MONST_FIERY)) {
                  monst.status[i]--;
              }
              damage = rand_range(1, 3);
              if (!(monst.status[STATUS_IMMUNE_TO_FIRE])
                  && !(monst.info.flags & MONST_INVULNERABLE)
                  && await inflictDamage(NULL, monst, damage, orange, true))
              {
                  if (canSeeMonster(monst)) {
                      monsterName(buf, monst, true);
                      sprintf(buf2, "%s burns %s.",
                              buf,
                              (monst.info.flags & MONST_INANIMATE) ? "up" : "to death");
                      message(buf2, messageColorFromVictim(monst), false);
                  }
                  return;
              }
              if (monst.status[i] <= 0) {
                  extinguishFireOnCreature(monst);
              }
          }
          break;
      case STATUS_LIFESPAN_REMAINING:
          if (monst.status[i]) {
              monst.status[i]--;
              if (monst.status[i] <= 0) {
                  await killCreature(monst, false);
                  if (canSeeMonster(monst)) {
                      monsterName(buf, monst, true);
                      sprintf(buf2, "%s dissipates into thin air.", buf);
                      message(buf2, white, false);
                  }
                  return;
              }
          }
          break;
      case STATUS_POISONED:
          if (monst.status[i]) {
              monst.status[i]--;
              if (await inflictDamage(NULL, monst, monst.poisonAmount, green, true)) {
                  if (canSeeMonster(monst)) {
                      monsterName(buf, monst, true);
                      sprintf(buf2, "%s dies of poison.", buf);
                      message(buf2, messageColorFromVictim(monst), false);
                  }
                  return;
              }
              if (!monst.status[i]) {
                  monst.poisonAmount = 0;
              }
          }
          break;
      case STATUS_STUCK:
          if (monst.status[i] && !cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_ENTANGLES)) {
              monst.status[i] = 0;
          }
          break;
      case STATUS_DISCORDANT:
          if (monst.status[i] && !--monst.status[i]) {
              if (monst.creatureState == MONSTER_FLEEING
                  && !monst.status[STATUS_MAGICAL_FEAR]
                  && monst.leader === player)
              {
                  monst.creatureState = MONSTER_ALLY;
                  if (monst.carriedItem) {
                      await makeMonsterDropItem(monst);
                  }
              }
          }
          break;
      case STATUS_MAGICAL_FEAR:
          if (monst.status[i]) {
              if (!--monst.status[i]) {
                  monst.creatureState = (monst.leader === player ? MONSTER_ALLY : MONSTER_TRACKING_SCENT);
              }
          }
          break;
      case STATUS_SHIELDED:
          monst.status[i] -= Math.floor(monst.maxStatus[i] / 20);
          if (monst.status[i] <= 0) {
              monst.status[i] = monst.maxStatus[i] = 0;
          }
          break;
      case STATUS_IMMUNE_TO_FIRE:
          if (monst.status[i] && !(monst.info.flags & MONST_IMMUNE_TO_FIRE)) {
              monst.status[i]--;
          }
          break;
      case STATUS_INVISIBLE:
          if (monst.status[i]
              && !(monst.info.flags & MONST_INVISIBLE)
              && !--monst.status[i]
              && playerCanSee(monst.xLoc, monst.yLoc))
          {
              refreshDungeonCell(monst.xLoc, monst.yLoc);
          }
          break;
      default:
          if (monst.status[i]) {
              monst.status[i]--;
          }
          break;
		}
	}

	if (monsterCanSubmergeNow(monst) && !(monst.bookkeepingFlags & MB_SUBMERGED)) {
		if (rand_percent(20)) {
			monst.bookkeepingFlags |= MB_SUBMERGED;
			if (!monst.status[STATUS_MAGICAL_FEAR]
        && monst.creatureState == MONSTER_FLEEING
				&& (!(monst.info.flags & MONST_FLEES_NEAR_DEATH) || monst.currentHP >= Math.floor(monst.info.maxHP * 3 / 4)))
      {
				monst.creatureState = MONSTER_TRACKING_SCENT;
			}
			refreshDungeonCell(monst.xLoc, monst.yLoc);
		} else if (monst.info.flags & (MONST_RESTRICTED_TO_LIQUID)
				   && monst.creatureState != MONSTER_ALLY)
    {
			monst.creatureState = MONSTER_FLEEING;
		}
	}
}


function traversiblePathBetween( /* creature */ monst, x2, y2) {
	const coords = ARRAY(DCOLS + DROWS, () => [-1, -1] );
  let i, x, y, n;
	let originLoc = [monst.xLoc, monst.yLoc];
	let targetLoc = [x2, y2];

	n = getLineCoordinates(coords, originLoc, targetLoc);

	for (i=0; i<n; i++) {
		x = coords[i][0];
		y = coords[i][1];
		if (x == x2 && y == y2) {
			return true;
		}
		if (monsterAvoids(monst, x, y)) {
			return false;
		}
	}
  brogueAssert(false);
	return true; // should never get here
}

// boolean specifiedPathBetween(short x1, short y1, short x2, short y2,
// 							 unsigned long blockingTerrain, unsigned long blockingFlags) {
// 	short coords[DCOLS][2], i, x, y, n;
// 	short originLoc[2] = {x1, y1};
// 	short targetLoc[2] = {x2, y2};
// 	n = getLineCoordinates(coords, originLoc, targetLoc);
//
// 	for (i=0; i<n; i++) {
// 		x = coords[i][0];
// 		y = coords[i][1];
// 		if (cellHasTerrainFlag(x, y, blockingTerrain) || (pmap[x][y].flags & blockingFlags)) {
// 			return false;
// 		}
// 		if (x == x2 && y == y2) {
// 			return true;
// 		}
// 	}
//     brogueAssert(false);
// 	return true; // should never get here
// }

function openPathBetween(x1, y1, x2, y2) {
	let returnLoc = [], startLoc = [x1, y1], targetLoc = [x2, y2];

	getImpactLoc(returnLoc, startLoc, targetLoc, DCOLS, false);
	if (returnLoc[0] == targetLoc[0] && returnLoc[1] == targetLoc[1]) {
		return true;
	}
	return false;
}

// will return the player if the player is at (x, y).
function monsterAtLoc(x, y) { // creature *
	let monst; // creature *
	if (!(pmap[x][y].flags & (HAS_MONSTER | HAS_PLAYER))) {
		return NULL;
	}
	if (player.xLoc == x && player.yLoc == y) {
		return player;
	}
	for (monst = monsters.nextCreature; monst != NULL && (monst.xLoc != x || monst.yLoc != y); monst = monst.nextCreature);
	return monst;
}

function dormantMonsterAtLoc(x, y) {  // creature *
	let monst; // creature *
	if (!(pmap[x][y].flags & HAS_DORMANT_MONSTER)) {
		return NULL;
	}
	for (monst = dormantMonsters.nextCreature; monst != NULL && (monst.xLoc != x || monst.yLoc != y); monst = monst.nextCreature);
	return monst;
}

function monsterHasBoltEffect( /* creature */ monst, boltEffectIndex) {
    let i;
    for (i=0; monst.info.bolts[i] != 0; i++) {
        if (boltCatalog[monst.info.bolts[i]].boltEffect == boltEffectIndex) {
            return monst.info.bolts[i];
        }
    }
    return BOLT_NONE;
}

async function pathTowardCreature( /* creature */ monst, /* creature */ target) {
	const targetLoc = [-1, -1];
  let dir;

	if (traversiblePathBetween(monst, target.xLoc, target.yLoc)) {
        if (distanceBetween(monst.xLoc, monst.yLoc, target.xLoc, target.yLoc) <= 2) {
            monst.bookkeepingFlags &= ~MB_GIVEN_UP_ON_SCENT;
        }
		targetLoc[0] = target.xLoc;
		targetLoc[1] = target.yLoc;
		await moveMonsterPassivelyTowards(monst, targetLoc, (monst.creatureState != MONSTER_ALLY));
		return;
	}

	// is the target missing his map altogether?
	if (!target.mapToMe) {
		target.mapToMe = allocGrid();
		fillGrid(target.mapToMe, 0);
		calculateDistances(target.mapToMe, target.xLoc, target.yLoc, 0, monst, true, false);
	}

	// is the target map out of date?
	if (target.mapToMe[target.xLoc][target.yLoc] > 3) {
		// it is. recalculate the map.
		calculateDistances(target.mapToMe, target.xLoc, target.yLoc, 0, monst, true, false);
	}

	// blink to the target?
	if (distanceBetween(monst.xLoc, monst.yLoc, target.xLoc, target.yLoc) > 10
        || monstersAreEnemies(monst, target))
  {
        if (await monsterBlinkToPreferenceMap(monst, target.mapToMe, false)) { // if it blinked
            monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
            return;
        }
    }

	// follow the map.
	dir = nextStep(target.mapToMe, monst.xLoc, monst.yLoc, monst, true);
  if (dir == NO_DIRECTION) {
    targetLoc[0] = target.xLoc;
		targetLoc[1] = target.yLoc;
		await moveMonsterPassivelyTowards(monst, targetLoc, (monst.creatureState != MONSTER_ALLY));
		return;
  }
  targetLoc[0] = monst.xLoc + nbDirs[dir][0];
	targetLoc[1] = monst.yLoc + nbDirs[dir][1];

	if (!await moveMonsterPassivelyTowards(monst, targetLoc, (monst.creatureState != MONSTER_ALLY))) {
		// monster is blocking the way
		dir = randValidDirectionFrom(monst, monst.xLoc, monst.yLoc, true);
		if (dir != -1) {
			targetLoc[0] = monst.xLoc + nbDirs[dir][0];
			targetLoc[1] = monst.yLoc + nbDirs[dir][1];
			await moveMonsterPassivelyTowards(monst, targetLoc, (monst.creatureState != MONSTER_ALLY));
		}
	}
}

function creatureEligibleForSwarming(/* creature */ monst) {
    if ((monst.info.flags & (MONST_IMMOBILE | MONST_GETS_TURN_ON_ACTIVATION | MONST_MAINTAINS_DISTANCE))
        || monst.status[STATUS_ENTRANCED]
        || monst.status[STATUS_CONFUSED]
        || monst.status[STATUS_STUCK]
        || monst.status[STATUS_PARALYZED]
        || monst.status[STATUS_MAGICAL_FEAR]
        || monst.status[STATUS_LIFESPAN_REMAINING] == 1
        || (monst.bookkeepingFlags & (MB_SEIZED | MB_SEIZING)))
    {
        return false;
    }
    if (monst !== player
        && monst.creatureState != MONSTER_ALLY
        && monst.creatureState != MONSTER_TRACKING_SCENT)
    {
        return false;
    }
    return true;
}

// Swarming behavior.
// If you’re adjacent to an enemy and about to strike it, and you’re adjacent to a hunting-mode tribemate
// who is not adjacent to another enemy, and there is no empty space adjacent to the tribemate AND the enemy,
// and there is an empty space adjacent to you AND the enemy, then move into that last space.
// (In each case, "adjacent" excludes diagonal tiles obstructed by corner walls.)
function monsterSwarmDirection( /* creature */ monst, /* creature */ enemy) {
    let newX, newY, i;
    let dir, targetDir;
    const dirList = [0, 1, 2, 3, 4, 5, 6, 7];
    let alternateDirectionExists;
    let ally, otherEnemy;   // creature *

    if (monst === player || !creatureEligibleForSwarming(monst)) {
        return NO_DIRECTION;
    }

    if (distanceBetween(monst.xLoc, monst.yLoc, enemy.xLoc, enemy.yLoc) != 1
        || (diagonalBlocked(monst.xLoc, monst.yLoc, enemy.xLoc, enemy.yLoc, false) || (enemy.info.flags & MONST_ATTACKABLE_THRU_WALLS))
        || !monstersAreEnemies(monst, enemy))
    {
        return NO_DIRECTION; // Too far from the enemy, diagonally blocked, or not enemies with it.
    }

    // Find a location that is adjacent to you and to the enemy.
    targetDir = NO_DIRECTION;
    shuffleList(dirList, 0, 4);
    shuffleList(dirList, 4, 8);
    for (i=0; i<8 && targetDir == NO_DIRECTION; i++) {
        dir = dirList[i];
        newX = monst.xLoc + nbDirs[dir][0];
        newY = monst.yLoc + nbDirs[dir][1];
        if (coordinatesAreInMap(newX, newY)
            && distanceBetween(enemy.xLoc, enemy.yLoc, newX, newY) == 1
            && !(pmap[newX][newY].flags & (HAS_PLAYER | HAS_MONSTER))
            && !diagonalBlocked(monst.xLoc, monst.yLoc, newX, newY, false)
            && (!diagonalBlocked(enemy.xLoc, enemy.yLoc, newX, newY, false) || (enemy.info.flags & MONST_ATTACKABLE_THRU_WALLS))
            && !monsterAvoids(monst, newX, newY))
        {
            targetDir = dir;
        }
    }
    if (targetDir == NO_DIRECTION) {
        return NO_DIRECTION; // No open location next to both you and the enemy.
    }

    // OK, now we have a place to move toward. Let's analyze the teammates around us to make sure that
    // one of them could take advantage of the space we open.
    // CYCLE_MONSTERS_AND_PLAYERS( (ally) => {
    for (ally = player; ally != NULL; ally = (ally === player ? monsters.nextCreature : ally.nextCreature)) {

      if (ally !== monst
          && ally !== enemy
          && monstersAreTeammates(monst, ally)
          && monstersAreEnemies(ally, enemy)
          && creatureEligibleForSwarming(ally)
          && distanceBetween(monst.xLoc, monst.yLoc, ally.xLoc, ally.yLoc) == 1
          && !diagonalBlocked(monst.xLoc, monst.yLoc, ally.xLoc, ally.yLoc, false)
          && !monsterAvoids(ally, monst.xLoc, monst.yLoc)
          && (distanceBetween(enemy.xLoc, enemy.yLoc, ally.xLoc, ally.yLoc) > 1 || diagonalBlocked(enemy.xLoc, enemy.yLoc, ally.xLoc, ally.yLoc, false)))
      {
          // Found a prospective ally.
          // Check that there isn't already an open space from which to attack the enemy that is accessible to the ally.
          alternateDirectionExists = false;
          for (dir=0; dir< DIRECTION_COUNT && !alternateDirectionExists; dir++) {
              newX = ally.xLoc + nbDirs[dir][0];
              newY = ally.yLoc + nbDirs[dir][1];
              if (coordinatesAreInMap(newX, newY)
                  && !(pmap[newX][newY].flags & (HAS_PLAYER | HAS_MONSTER))
                  && distanceBetween(enemy.xLoc, enemy.yLoc, newX, newY) == 1
                  && !diagonalBlocked(enemy.xLoc, enemy.yLoc, newX, newY, false)
                  && !diagonalBlocked(ally.xLoc, ally.yLoc, newX, newY, false)
                  && !monsterAvoids(ally, newX, newY))
              {
                  alternateDirectionExists = true;
              }
          }
          if (!alternateDirectionExists) {
              // OK, no alternative open spaces exist.
              // Check that the ally isn't already occupied with an enemy of its own.

              // CYCLE_MONSTERS_AND_PLAYERS( (otherEnemy) => {
              for (otherEnemy = player; otherEnemy != NULL; otherEnemy = (otherEnemy === player ? monsters.nextCreature : otherEnemy.nextCreature)) {
                  if (ally !== otherEnemy
                      && monst !== otherEnemy
                      && enemy !== otherEnemy
                      && monstersAreEnemies(ally, otherEnemy)
                      && distanceBetween(ally.xLoc, ally.yLoc, otherEnemy.xLoc, otherEnemy.yLoc) == 1
                      && (!diagonalBlocked(ally.xLoc, ally.yLoc, otherEnemy.xLoc, otherEnemy.yLoc, false) || (otherEnemy.info.flags & MONST_ATTACKABLE_THRU_WALLS)))
                  {
                      break; // Ally is already occupied.
                  }
              }
              if (otherEnemy == NULL) {
                  // Success!
                  return targetDir;
              }
            }
        }
    }

    return NO_DIRECTION; // Failure!
}

// Isomorphs a number in [0, 39] to coordinates along the square of radius 5 surrounding (0,0).
// This is used as the sample space for bolt target coordinates, e.g. when reflecting or when
// monsters are deciding where to blink.
function perimeterCoords( returnCoords /* short[2] */, n) {
	if (n <= 10) {			// top edge, left to right
		returnCoords[0] = n - 5;
		returnCoords[1] = -5;
	} else if (n <= 21) {	// bottom edge, left to right
		returnCoords[0] = (n - 11) - 5;
		returnCoords[1] = 5;
	} else if (n <= 30) {	// left edge, top to bottom
		returnCoords[0] = -5;
		returnCoords[1] = (n - 22) - 4;
	} else if (n <= 39) {	// right edge, top to bottom
		returnCoords[0] = 5;
		returnCoords[1] = (n - 31) - 4;
	} else {
		ERROR("ERROR! Bad perimeter coordinate request!", true);
		returnCoords[0] = returnCoords[1] = 0; // garbage in, garbage out
	}
}

// Tries to make the monster blink to the most desirable square it can aim at, according to the
// preferenceMap argument. "blinkUphill" determines whether it's aiming for higher or lower numbers on
// the preference map -- true means higher. Returns true if the monster blinked; false if it didn't.
async function monsterBlinkToPreferenceMap(/* creature */ monst, /* short **/ preferenceMap, blinkUphill) {
	let i, bestPreference, nowPreference, maxDistance;
  const bestTarget = [-1, -1], target = [-1, -1], impact = [-1, -1], origin = [-1, -1];
	let gotOne;
	const monstName = STRING(); // char[DCOLS];
	const buf = STRING(); // char[DCOLS];
  let theBoltType;  // enum boltType
  let theBolt = bolt();

  theBoltType = monsterHasBoltEffect(monst, BE_BLINKING);
  if (!theBoltType) {
      return false;
  }

	maxDistance = fp_staffBlinkDistance(5 << FP_BASE);
	gotOne = false;

	origin[0] = monst.xLoc;
	origin[1] = monst.yLoc;

	bestTarget[0]	= 0;
	bestTarget[1]	= 0;
	bestPreference	= preferenceMap[monst.xLoc][monst.yLoc];

	// make sure that we beat the four cardinal neighbors
	for (i = 0; i < 4; i++) {
		nowPreference = preferenceMap[monst.xLoc + nbDirs[i][0]][monst.yLoc + nbDirs[i][1]];

		if (((blinkUphill && nowPreference > bestPreference) || (!blinkUphill && nowPreference < bestPreference))
			&& !monsterAvoids(monst, monst.xLoc + nbDirs[i][0], monst.yLoc + nbDirs[i][1]))
    {
			bestPreference = nowPreference;
		}
	}

	for (i=0; i<40; i++) {
		perimeterCoords(target, i);
		target[0] += monst.xLoc;
		target[1] += monst.yLoc;

		getImpactLoc(impact, origin, target, maxDistance, true);
		nowPreference = preferenceMap[impact[0]][impact[1]];

		if (((blinkUphill && (nowPreference > bestPreference))
         || (!blinkUphill && (nowPreference < bestPreference)))
			&& !monsterAvoids(monst, impact[0], impact[1]))
    {
			bestTarget[0]	= target[0];
			bestTarget[1]	= target[1];
			bestPreference	= nowPreference;

			if ((abs(impact[0] - origin[0]) > 1 || abs(impact[1] - origin[1]) > 1)
                || (cellHasTerrainFlag(impact[0], origin[1], T_OBSTRUCTS_PASSABILITY))
                || (cellHasTerrainFlag(origin[0], impact[1], T_OBSTRUCTS_PASSABILITY)))
      {
				gotOne = true;
			} else {
				gotOne = false;
			}
		}
	}

	if (gotOne) {
		if (canDirectlySeeMonster(monst)) {
			monsterName(monstName, monst, true);
			sprintf(buf, "%s blinks", monstName);
			combatMessage(buf, 0);
		}
		monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
    theBolt.copy(boltCatalog[theBoltType]);
		await zap(origin, bestTarget, theBolt, false);
		return true;
	}
	return false;
}

function fleeingMonsterAwareOfPlayer(/* creature */ monst) {
    if (player.status[STATUS_INVISIBLE]) {
        return (distanceBetween(monst.xLoc, monst.yLoc, player.xLoc, player.yLoc) <= 1);
    } else {
        return (pmap[monst.xLoc][monst.yLoc].flags & IN_FIELD_OF_VIEW) ? true : false;
    }
}

// returns whether the monster did something (and therefore ended its turn)
async function monsterBlinkToSafety(/* creature */ monst) {
	let blinkSafetyMap;    // short **

	if (monst.creatureState == MONSTER_ALLY) {
		if (!rogue.updatedAllySafetyMapThisTurn) {
			updateAllySafetyMap();
		}
		blinkSafetyMap = allySafetyMap;
	} else if (fleeingMonsterAwareOfPlayer(monst)) {
		if (monst.safetyMap) {
			freeGrid(monst.safetyMap);
			monst.safetyMap = NULL;
		}
		if (!rogue.updatedSafetyMapThisTurn) {
			updateSafetyMap();
		}
		blinkSafetyMap = safetyMap;
	} else {
		if (!monst.safetyMap) {
			if (!rogue.updatedSafetyMapThisTurn) {
				updateSafetyMap();
			}
			monst.safetyMap = allocGrid();
			copyGrid(monst.safetyMap, safetyMap);
		}
		blinkSafetyMap = monst.safetyMap;
	}

	return await monsterBlinkToPreferenceMap(monst, blinkSafetyMap, false);
}

// returns whether or not the monster did something.
async function monsterSummons(/* creature */ monst, alwaysUse) {
	let target;    // creature *
	let minionCount = 0;

  if (monst.info.abilityFlags & (MA_CAST_SUMMON)) {
        // Count existing minions.
		for (target = monsters.nextCreature; target != NULL; target = target.nextCreature) {
      if (monst.creatureState == MONSTER_ALLY) {
          if (target.creatureState == MONSTER_ALLY) {
              minionCount++; // Allied summoners count all allies.
          }
			} else if ((target.bookkeepingFlags & MB_FOLLOWER) && target.leader == monst) {
				minionCount++; // Enemy summoners count only direct followers, not teammates.
			}
		}
    if (monst.creatureState == MONSTER_ALLY) { // Allied summoners also count monsters on the previous and next depths.
        if (rogue.depthLevel > 1) {
            for (target = levels[rogue.depthLevel - 2].monsters; target != NULL; target = target.nextCreature) {
                if (target.creatureState == MONSTER_ALLY && !(target.info.flags & MONST_WILL_NOT_USE_STAIRS)) {
                    minionCount++;
                }
            }
        }
        if (rogue.depthLevel < DEEPEST_LEVEL) {
            for (target = levels[rogue.depthLevel].monsters; target != NULL; target = target.nextCreature) {
                if (target.creatureState == MONSTER_ALLY && !(target.info.flags & MONST_WILL_NOT_USE_STAIRS)) {
                    minionCount++;
                }
            }
        }
    }
    if (alwaysUse && minionCount < 50) {
			await summonMinions(monst);
			return true;
    } else if (monst.info.abilityFlags & MA_ENTER_SUMMONS) {
        if (!rand_range(0, 7)) {
            await summonMinions(monst);
            return true;
        }
    } else if ((monst.creatureState != MONSTER_ALLY || minionCount < 5)
               && !rand_range(0, minionCount * minionCount * 3 + 1))
    {
			await summonMinions(monst);
			return true;
		}
	}
  return false;
}

// Some monsters never make good targets irrespective of what bolt we're contemplating.
// Return false for those. Otherwise, return true.
function generallyValidBoltTarget(/* creature */ caster, /* creature */ target) {
    if (caster === target) {
        // Can't target yourself; that's the fundamental theorem of Brogue bolts.
        return false;
    }
    if (monsterIsHidden(target, caster)
        || (target.bookkeepingFlags & MB_SUBMERGED))
    {
        // No bolt will affect a submerged creature. Can't shoot at invisible creatures unless it's in gas.
        return false;
    }
    return openPathBetween(caster.xLoc, caster.yLoc, target.xLoc, target.yLoc);
}

function targetEligibleForCombatBuff(/* creature */ caster, /* creature */ target) {
    let enemy;    // creature *

    if (caster.creatureState == MONSTER_ALLY) {
        if (canDirectlySeeMonster(caster)) {
            // CYCLE_MONSTERS_AND_PLAYERS(enemy) {
            for (enemy = player; enemy != NULL; enemy = (enemy === player ? monsters.nextCreature : enemy.nextCreature)) {
                if (monstersAreEnemies(player, enemy)
                    && canSeeMonster(enemy)
                    && (pmap[enemy.xLoc][enemy.yLoc].flags & IN_FIELD_OF_VIEW))
                {
                    return true;
                }
            }
        }
        return false;
    } else {
        return (target.creatureState == MONSTER_TRACKING_SCENT);
    }
}

// Make a decision as to whether the given caster should fire the given bolt at the given target.
// Assumes that the conditions in generallyValidBoltTarget have already been satisfied.
function specificallyValidBoltTarget(/* creature */ caster, /* creature */ target, theBoltType) {

    if ((boltCatalog[theBoltType].flags & BF_TARGET_ALLIES)
        && (!monstersAreTeammates(caster, target) || monstersAreEnemies(caster, target)))
    {
        return false;
    }
    if ((boltCatalog[theBoltType].flags & BF_TARGET_ENEMIES)
        && (!monstersAreEnemies(caster, target)))
    {
        return false;
    }
    if ((boltCatalog[theBoltType].flags & BF_TARGET_ENEMIES)
        && (target.info.flags & MONST_INVULNERABLE))
    {
        return false;
    }
    if ((target.info.flags & MONST_REFLECT_4)
        && target.creatureState != MONSTER_ALLY
        && !(boltCatalog[theBoltType].flags & (BF_NEVER_REFLECTS | BF_HALTS_BEFORE_OBSTRUCTION))) {
        // Don't fire a reflectable bolt at a reflective target unless it's your ally.
        return false;
    }
    if (boltCatalog[theBoltType].forbiddenMonsterFlags & target.info.flags) {
        // Don't fire a bolt at a creature type that it won't affect.
        return false;
    }
    if ((boltCatalog[theBoltType].flags & BF_FIERY)
        && target.status[STATUS_IMMUNE_TO_FIRE])
    {
        // Don't shoot fireballs at fire-immune creatures.
        return false;
    }
    if ((boltCatalog[theBoltType].flags & BF_FIERY)
        && burnedTerrainFlagsAtLoc(caster.xLoc, caster.yLoc) & avoidedFlagsForMonster((caster.info)))
    {
        // Don't shoot fireballs if you're standing on a tile that could combust into something that harms you.
        return false;
    }

    // Rules specific to bolt effects:
    switch (boltCatalog[theBoltType].boltEffect) {
        case BE_BECKONING:
            if (distanceBetween(caster.xLoc, caster.yLoc, target.xLoc, target.yLoc) <= 1) {
                return false;
            }
            break;
        case BE_ATTACK:
            if (cellHasTerrainFlag(target.xLoc, target.yLoc, T_OBSTRUCTS_PASSABILITY)
                && !(target.info.flags & MONST_ATTACKABLE_THRU_WALLS))
            {
                // Don't shoot an arrow at an embedded creature.
                return false;
            }
            // continue to BE_DAMAGE below
        case BE_DAMAGE:
            if (target.status[STATUS_ENTRANCED]
                && monstersAreEnemies(caster, target))
            {
                // Don't break your enemies' entrancement.
                return false;
            }
            break;
        case BE_NONE:
            // BE_NONE bolts are always going to be all about the terrain effects,
            // so our logic has to follow from the terrain parameters of the bolt's target DF.
            if (boltCatalog[theBoltType].targetDF) {
                const terrainFlags = tileCatalog[dungeonFeatureCatalog[boltCatalog[theBoltType].targetDF].tile].flags;
                if ((terrainFlags & T_ENTANGLES)
                    && target.status[STATUS_STUCK])
                {
                    // Don't try to entangle a creature that is already entangled.
                    return false;
                }
                if ((boltCatalog[theBoltType].flags & BF_TARGET_ENEMIES)
                    && !(terrainFlags & avoidedFlagsForMonster((target.info)))
                    && (!(terrainFlags & T_ENTANGLES) || (target.info.flags & MONST_IMMUNE_TO_WEBS)))
                {
                    return false;
                }
            }
            break;
        case BE_DISCORD:
            if (target.status[STATUS_DISCORDANT]
                || target === player)
            {
                // Don't cast discord if the target is already discordant, or if it is the player.
                // (Players should never be intentionally targeted by discord. It's just a fact of monster psychology.)
                return false;
            }
            break;
        case BE_NEGATION:
            if (monstersAreEnemies(caster, target)) {
                if (target.status[STATUS_HASTED] || target.status[STATUS_TELEPATHIC] || target.status[STATUS_SHIELDED]) {
                    // Dispel haste, telepathy, protection.
                    return true;
                }
                if (target.info.flags & (MONST_DIES_IF_NEGATED | MONST_IMMUNE_TO_WEAPONS)) {
                    // Dispel magic creatures; strip weapon invulnerability from revenants.
                    return true;
                }
                if ((target.status[STATUS_IMMUNE_TO_FIRE] || target.status[STATUS_LEVITATING])
                    && cellHasTerrainFlag(target.xLoc, target.yLoc, (T_LAVA_INSTA_DEATH | T_IS_DEEP_WATER | T_AUTO_DESCENT))) {
                    // Drop the target into lava or a chasm if opportunity knocks.
                    return true;
                }
                if (monstersAreTeammates(caster, target)
                    && target.status[STATUS_DISCORDANT]
                    && !(target.info.flags & MONST_DIES_IF_NEGATED))
                {
                    // Dispel discord from allies unless it would destroy them.
                    return true;
                }
            } else if (monstersAreTeammates(caster, target)) {
                if (target === player && rogue.armor && (rogue.armor.flags & ITEM_RUNIC) && (rogue.armor.flags & ITEM_RUNIC_IDENTIFIED)
                    && rogue.armor.enchant2 == A_REFLECTION && fp_netEnchant(rogue.armor) > 0)
                {
                    // Allies shouldn't cast negation on the player if she's knowingly wearing armor of reflection.
                    // Too much risk of negating themselves in the process.
                    return false;
                }
                if (target.info.flags & MONST_DIES_IF_NEGATED) {
                    // Never cast negation if it would destroy an allied creature.
                    return false;
                }
                if (target.status[STATUS_ENTRANCED]
                    && caster.creatureState != MONSTER_ALLY)
                {
                    // Non-allied monsters will dispel entrancement on their own kind.
                    return true;
                }
                if (target.status[STATUS_MAGICAL_FEAR]) {
                    // Dispel magical fear.
                    return true;
                }
            }
            return false; // Don't cast negation unless there's a good reason.
            break;
        case BE_SLOW:
            if (target.status[STATUS_SLOWED]) {
                return false;
            }
            break;
        case BE_HASTE:
            if (target.status[STATUS_HASTED]) {
                return false;
            }
            if (!targetEligibleForCombatBuff(caster, target)) {
                return false;
            }
            break;
        case BE_SHIELDING:
            if (target.status[STATUS_SHIELDED]) {
                return false;
            }
            if (!targetEligibleForCombatBuff(caster, target)) {
                return false;
            }
            break;
        case BE_HEALING:
            if (target.currentHP >= target.info.maxHP) {
                // Don't heal a creature already at full health.
                return false;
            }
            break;
        case BE_TUNNELING:
        case BE_OBSTRUCTION:
            // Monsters will never cast these.
            return false;
            break;
        default:
            break;
    }
    return true;
}

async function monsterCastSpell(/* creature */ caster, /* creature */ target,  boltIndex) {
    const theBolt = bolt();
    const originLoc = [-1, -1], targetLoc = [-1, -1];
    const buf = STRING(), monstName = STRING();

    if (canDirectlySeeMonster(caster)) {
        monsterName(monstName, caster, true);
        sprintf(buf, "%s %s", monstName, boltCatalog[boltIndex].description);
        resolvePronounEscapes(buf, caster);
        combatMessage(buf, 0);
    }

    theBolt.copy(boltCatalog[boltIndex]);
    originLoc[0] = caster.xLoc;
    originLoc[1] = caster.yLoc;
    targetLoc[0] = target.xLoc;
    targetLoc[1] = target.yLoc;
    await zap(originLoc, targetLoc, theBolt, false);

    if (player.currentHP <= 0) {
        await gameOver(monsterCatalog[caster.info.monsterID].monsterName, false);
    }
}

// returns whether the monster cast a bolt.
async function monstUseBolt(/* creature */ monst) {
  let target;   // creature *
  let i;

  if (!monst.info.bolts[0]) {
      return false; // Don't waste time with monsters that can't cast anything.
  }

  // CYCLE_MONSTERS_AND_PLAYERS(target) {
  for (target = player; target != NULL; target = (target === player ? monsters.nextCreature : target.nextCreature)) {
      if (generallyValidBoltTarget(monst, target)) {
          for (i = 0; monst.info.bolts[i]; i++) {
              if (boltCatalog[monst.info.bolts[i]].boltEffect == BE_BLINKING) {
                  continue; // Blinking is handled elsewhere.
              }
              if (specificallyValidBoltTarget(monst, target, monst.info.bolts[i])) {
                  if ((monst.info.flags & MONST_ALWAYS_USE_ABILITY)
                      || rand_percent(30))
                  {
                      await monsterCastSpell(monst, target, monst.info.bolts[i]);
                      return true;
                  }
              }
          }
      }
  }
  return false;
}

// returns whether the monster did something (and therefore ended its turn)
async function monstUseMagic(/* creature */ monst) {
    if (await monsterSummons(monst, (monst.info.flags & MONST_ALWAYS_USE_ABILITY))) {
        return true;
    } else if (await monstUseBolt(monst)) {
        return true;
    }
    return false;
}

function isLocalScentMaximum(x, y) {
    let dir;
    let newX, newY;

    const baselineScent = scentMap[x][y];

    for (dir=0; dir< DIRECTION_COUNT; dir++) {
        newX = x + nbDirs[dir][0];
        newY = y + nbDirs[dir][1];
        if (coordinatesAreInMap(newX, newY)
            && (scentMap[newX][newY] > baselineScent)
            && !cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY)
            && !diagonalBlocked(x, y, newX, newY, false))
        {
            return false;
        }
    }
    return true;
}

// Returns the direction the player's scent points to from a given cell. Returns -1 if the nose comes up blank.
function scentDirection(/* creature */ monst) {
	let newX, newY, x, y, newestX, newestY;
  let bestDirection = NO_DIRECTION, dir, dir2;
	let bestNearbyScent = 0;
	let canTryAgain = true;
	let otherMonst;  // creature *

	x = monst.xLoc;
	y = monst.yLoc;

	for (;;) {

		for (dir=0; dir< DIRECTION_COUNT; dir++) {
			newX = x + nbDirs[dir][0];
			newY = y + nbDirs[dir][1];
			otherMonst = monsterAtLoc(newX, newY);
			if (coordinatesAreInMap(newX, newY)
				&& (scentMap[newX][newY] > bestNearbyScent)
				&& (!(pmap[newX][newY].flags & HAS_MONSTER) || (otherMonst && canPass(monst, otherMonst)))
				&& !cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY)
				&& !diagonalBlocked(x, y, newX, newY, false)
				&& !monsterAvoids(monst, newX, newY))
      {
				bestNearbyScent = scentMap[newX][newY];
				bestDirection = dir;
			}
		}

		if (bestDirection >= 0 && bestNearbyScent > scentMap[x][y]) {
			return bestDirection;
		}

		if (canTryAgain) {
			// Okay, the monster may be stuck in some irritating diagonal.
			// If so, we can diffuse the scent into the offending kink and solve the problem.
			// There's a possibility he's stuck for some other reason, though, so we'll only
			// try once per his move -- hence the failsafe.
			canTryAgain = false;
			for (dir=0; dir<4; dir++) {
				newX = x + nbDirs[dir][0];
				newY = y + nbDirs[dir][1];
				for (dir2=0; dir2<4; dir2++) {
					newestX = newX + nbDirs[dir2][0];
					newestY = newY + nbDirs[dir2][1];
					if (coordinatesAreInMap(newX, newY) && coordinatesAreInMap(newestX, newestY)) {
						scentMap[newX][newY] = max(scentMap[newX][newY], scentMap[newestX][newestY] - 1);
					}
				}
			}
		} else {
			return NO_DIRECTION; // failure!
		}
	}
}

// returns true if the resurrection was successful.
function resurrectAlly( x, y) {
    let success;
    let monst;  // creature *
    monst = purgatory.nextCreature;
    if (monst) {
        // Remove from purgatory and insert into the mortal plane.
        purgatory.nextCreature = purgatory.nextCreature.nextCreature;
        monst.nextCreature = monsters.nextCreature;
        monsters.nextCreature = monst;
        const loc = getQualifyingPathLocNear(x, y, true,
                                 (T_PATHING_BLOCKER | T_HARMFUL_TERRAIN), 0,
                                 0, (HAS_PLAYER | HAS_MONSTER), false);
        monst.xLoc = loc[0];
        monst.yLoc = loc[1];
        pmap[monst.xLoc][monst.yLoc].flags |= HAS_MONSTER;

        // Restore health etc.
        monst.bookkeepingFlags &= ~(MB_IS_DYING | MB_IS_FALLING);
        if (!(monst.info.flags & MONST_FIERY)
             && monst.status[STATUS_BURNING])
        {
             monst.status[STATUS_BURNING] = 0;
        }
        monst.status[STATUS_DISCORDANT] = 0;
        heal(monst, 100, true);

        success = true;
    } else {
        success = false;
    }
    return success;
}

function unAlly( /* creature */ monst) {
	if (monst.creatureState == MONSTER_ALLY) {
		monst.creatureState = MONSTER_TRACKING_SCENT;
		monst.bookkeepingFlags &= ~(MB_FOLLOWER | MB_TELEPATHICALLY_REVEALED);
		monst.leader = NULL;
	}
}

function monsterFleesFrom( /* creature */ monst, /* creature */ defender) {
    const x = monst.xLoc;
    const y = monst.yLoc;

    if (!monsterWillAttackTarget(defender, monst)) {
        return false;
    }

    if (distanceBetween(x, y, defender.xLoc, defender.yLoc) >= 4) {
        return false;
    }

    if ((defender.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE))
        && !(defender.info.flags & MONST_IMMOBILE)) {
        // Don't charge if the monster is damage-immune and is NOT immobile;
        // i.e., keep distance from revenants and stone guardians but not mirror totems.
        return true;
    }

    if ((monst.info.flags & MONST_MAINTAINS_DISTANCE)
        || (defender.info.abilityFlags & MA_KAMIKAZE))
    {
        // Don't charge if you maintain distance or if it's a kamikaze monster.
        return true;
    }

    if (monst.info.abilityFlags & MA_POISONS
        && defender.status[STATUS_POISONED] * defender.poisonAmount > defender.currentHP)
    {
        return true;
    }

    return false;
}

function allyFlees( /* creature */ ally, /* creature */ closestEnemy) {
    const x = ally.xLoc;
    const y = ally.yLoc;

    if (!closestEnemy) {
        return false; // No one to flee from.
    }

    if (ally.info.maxHP <= 1 || (ally.status[STATUS_LIFESPAN_REMAINING]) > 0) { // Spectral blades and timed allies should never flee.
        return false;
    }

    if (distanceBetween(x, y, closestEnemy.xLoc, closestEnemy.yLoc) < 10
        && (Math.floor(100 * ally.currentHP / ally.info.maxHP) <= 33)
        && ally.info.turnsBetweenRegen > 0
        && !ally.carriedMonster
        && ((ally.info.flags & MONST_FLEES_NEAR_DEATH) || (Math.floor(100 * ally.currentHP / ally.info.maxHP * 2) < Math.floor(100 * player.currentHP / player.info.maxHP))))
    {
        // Flee if you're within 10 spaces, your HP is under 1/3, you're not a phoenix or lich or vampire in bat form,
        // and you either flee near death or your health fraction is less than half of the player's.
        return true;
    }

    // so do allies that keep their distance or while in the presence of damage-immune or kamikaze enemies
    if (monsterFleesFrom(ally, closestEnemy)) {
        // Flee if you're within 3 spaces and you either flee near death or the closest enemy is a bloat, revenant or guardian.
        return true;
    }

    return false;
}

async function monsterMillAbout(/* creature */ monst, movementChance) {
  let dir;
  const targetLoc = [-1, -1];

  const x = monst.xLoc;
	const y = monst.yLoc;

    if (rand_percent(movementChance)) {
        dir = randValidDirectionFrom(monst, x, y, true);
        if (dir != -1) {
            targetLoc[0] = x + nbDirs[dir][0];
            targetLoc[1] = y + nbDirs[dir][1];
            await moveMonsterPassivelyTowards(monst, targetLoc, false);
        }
    }
}

async function moveAlly(/* creature */ monst) {
	let target, closestMonster = NULL;   // creature *
	let i, j, x, y, dir, shortestDistance, leashLength;
  const targetLoc = [-1, -1];
	let enemyMap, costMap;   // short **
	const buf = STRING(), monstName = STRING();

	x = monst.xLoc;
	y = monst.yLoc;

	targetLoc[0] = targetLoc[1] = 0;

  if (!(monst.leader)) {
		monst.leader = player;
		monst.bookkeepingFlags |= MB_FOLLOWER;
  }

	// If we're standing in harmful terrain and there is a way to escape it, spend this turn escaping it.
	if (cellHasTerrainFlag(x, y, (T_HARMFUL_TERRAIN & ~(T_IS_FIRE | T_CAUSES_DAMAGE | T_CAUSES_PARALYSIS | T_CAUSES_CONFUSION)))
		|| (cellHasTerrainFlag(x, y, T_IS_FIRE) && !monst.status[STATUS_IMMUNE_TO_FIRE])
		|| (cellHasTerrainFlag(x, y, T_CAUSES_DAMAGE | T_CAUSES_PARALYSIS | T_CAUSES_CONFUSION) && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE))))
  {
		if (!rogue.updatedMapToSafeTerrainThisTurn) {
			updateSafeTerrainMap();
		}

		if (await monsterBlinkToPreferenceMap(monst, rogue.mapToSafeTerrain, false)) {
			monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
			return;
		}

		dir = nextStep(rogue.mapToSafeTerrain, x, y, monst, true);
		if (dir != -1) {
			targetLoc[0] = x + nbDirs[dir][0];
			targetLoc[1] = y + nbDirs[dir][1];
			if (await moveMonsterPassivelyTowards(monst, targetLoc, false)) {
				return;
			}
		}
	}

	// Look around for enemies; shortestDistance will be the distance to the nearest.
	shortestDistance = max(DROWS, DCOLS);
	for (target = monsters.nextCreature; target != NULL; target = target.nextCreature) {
		if (target != monst
			&& (!(target.bookkeepingFlags & MB_SUBMERGED) || (monst.bookkeepingFlags & MB_SUBMERGED))
			&& monsterWillAttackTarget(monst, target)
			&& distanceBetween(x, y, target.xLoc, target.yLoc) < shortestDistance
			&& traversiblePathBetween(monst, target.xLoc, target.yLoc)
			&& (!cellHasTerrainFlag(target.xLoc, target.yLoc, T_OBSTRUCTS_PASSABILITY) || (target.info.flags & MONST_ATTACKABLE_THRU_WALLS))
			&& (!target.status[STATUS_INVISIBLE] || rand_percent(33)))
    {
			shortestDistance = distanceBetween(x, y, target.xLoc, target.yLoc);
			closestMonster = target;
		}
	}

	// Weak allies in the presence of enemies seek safety;
	if (allyFlees(monst, closestMonster)) {
		if (monsterHasBoltEffect(monst, BE_BLINKING)
			&& ((monst.info.flags & MONST_ALWAYS_USE_ABILITY) || rand_percent(30))
			&& await monsterBlinkToSafety(monst))
    {
			return;
		}
    if (await monsterSummons(monst, (monst.info.flags & MONST_ALWAYS_USE_ABILITY))) {
        return;
    }
		if (!rogue.updatedAllySafetyMapThisTurn) {
			updateAllySafetyMap();
		}
		dir = nextStep(allySafetyMap, monst.xLoc, monst.yLoc, monst, true);
		if (dir != -1) {
			targetLoc[0] = x + nbDirs[dir][0];
			targetLoc[1] = y + nbDirs[dir][1];
		}
		if (dir == -1
			|| (allySafetyMap[targetLoc[0]][targetLoc[1]] >= allySafetyMap[x][y])
			|| (!await moveMonster(monst, nbDirs[dir][0], nbDirs[dir][1]) && !await moveMonsterPassivelyTowards(monst, targetLoc, true))) {
			// ally can't flee; continue below
		} else {
			return;
		}
	}

	// Magic users sometimes cast spells.
  if (await monstUseMagic(monst)) { // if he actually cast a spell
      monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
      return;
  }

  if (monst.bookkeepingFlags & MB_SEIZED) {
       leashLength = max(DCOLS, DROWS); // Ally will never be prevented from attacking while seized.
   } else if (rogue.justRested || rogue.justSearched) {
       leashLength = 10;
   } else {
       leashLength = 4;
   }

   if (shortestDistance == 1) {
       if (closestMonster.movementSpeed < monst.movementSpeed
           && !(closestMonster.info.flags & (MONST_FLITS | MONST_IMMOBILE))
           && closestMonster.creatureState == MONSTER_TRACKING_SCENT)
       {
           // Never try to flee from combat with a faster enemy.
           leashLength = max(DCOLS, DROWS);
       } else {
           leashLength++; // If the ally is adjacent to a monster at the end of its leash, it shouldn't be prevented from attacking.
       }
   }

	if (closestMonster
		&& (distanceBetween(x, y, player.xLoc, player.yLoc) < leashLength || (monst.bookkeepingFlags & MB_DOES_NOT_TRACK_LEADER))
		&& !(monst.info.flags & MONST_MAINTAINS_DISTANCE)
        && !attackWouldBeFutile(monst, closestMonster))
  {
		// Blink toward an enemy?
		if (monsterHasBoltEffect(monst, BE_BLINKING)
			&& ((monst.info.flags & MONST_ALWAYS_USE_ABILITY) || rand_percent(30))) {

			enemyMap = allocGrid();
			costMap = allocGrid();

			for (i=0; i<DCOLS; i++) {
				for (j=0; j<DROWS; j++) {
					if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)) {
						costMap[i][j] = cellHasTerrainFlag(i, j, T_OBSTRUCTS_DIAGONAL_MOVEMENT) ? PDS_OBSTRUCTION : PDS_FORBIDDEN;
						enemyMap[i][j] = 0; // safeguard against OOS
					} else if (monsterAvoids(monst, i, j)) {
						costMap[i][j] = PDS_FORBIDDEN;
						enemyMap[i][j] = 0; // safeguard against OOS
					} else {
						costMap[i][j] = 1;
						enemyMap[i][j] = 10000;
					}
				}
			}

			for (target = monsters.nextCreature; target != NULL; target = target.nextCreature) {
				if (target != monst
					&& (!(target.bookkeepingFlags & MB_SUBMERGED) || (monst.bookkeepingFlags & MB_SUBMERGED))
					&& monsterWillAttackTarget(monst, target)
					&& distanceBetween(x, y, target.xLoc, target.yLoc) < shortestDistance
					&& traversiblePathBetween(monst, target.xLoc, target.yLoc)
					&& (!monsterAvoids(monst, target.xLoc, target.yLoc) || (target.info.flags & MONST_ATTACKABLE_THRU_WALLS))
					&& (!target.status[STATUS_INVISIBLE] || ((monst.info.flags & MONST_ALWAYS_USE_ABILITY) || rand_percent(33))))
        {
					enemyMap[target.xLoc][target.yLoc] = 0;
					costMap[target.xLoc][target.yLoc] = 1;
				}
			}

			dijkstraScan(enemyMap, costMap, true);
			freeGrid(costMap);

			if (await monsterBlinkToPreferenceMap(monst, enemyMap, false)) {
				monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
				freeGrid(enemyMap);
				return;
			}
			freeGrid(enemyMap);
		}

		targetLoc[0] = closestMonster.xLoc;
		targetLoc[1] = closestMonster.yLoc;
		await moveMonsterPassivelyTowards(monst, targetLoc, false);
	} else if (monst.targetCorpseLoc[0]
			   && !monst.status[STATUS_POISONED]
			   && (!monst.status[STATUS_BURNING] || monst.status[STATUS_IMMUNE_TO_FIRE])) // Going to start eating a corpse.
  {
		await moveMonsterPassivelyTowards(monst, monst.targetCorpseLoc, false);
		if (monst.xLoc == monst.targetCorpseLoc[0]
			&& monst.yLoc == monst.targetCorpseLoc[1]
			&& !(monst.bookkeepingFlags & MB_ABSORBING))
    {
			if (canSeeMonster(monst)) {
				monsterName(monstName, monst, true);
				sprintf(buf, "%s begins %s the fallen %s.", monstName, monsterText[monst.info.monsterID].absorbing, monst.targetCorpseName);
				message(buf, goodMessageColor, false);
			}
			monst.corpseAbsorptionCounter = 20;
			monst.bookkeepingFlags |= MB_ABSORBING;
		}
	} else if ((monst.bookkeepingFlags & MB_DOES_NOT_TRACK_LEADER)
			   || (distanceBetween(x, y, player.xLoc, player.yLoc) < 3 && (pmap[x][y].flags & IN_FIELD_OF_VIEW)))
  {
		monst.bookkeepingFlags &= ~MB_GIVEN_UP_ON_SCENT;
    await monsterMillAbout(monst, 30);
	} else {
		if (!(monst.bookkeepingFlags & MB_GIVEN_UP_ON_SCENT)
			&& distanceBetween(x, y, player.xLoc, player.yLoc) > 10
			&& await monsterBlinkToPreferenceMap(monst, scentMap, true))
    {
			monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
			return;
		}
		dir = scentDirection(monst);
		if (dir == -1 || (monst.bookkeepingFlags & MB_GIVEN_UP_ON_SCENT)) {
			monst.bookkeepingFlags |= MB_GIVEN_UP_ON_SCENT;
			await pathTowardCreature(monst, monst.leader);
		} else {
			targetLoc[0] = x + nbDirs[dir][0];
			targetLoc[1] = y + nbDirs[dir][1];
			await moveMonsterPassivelyTowards(monst, targetLoc, false);
		}
	}
}


// Returns whether to abort the turn.
function updateMonsterCorpseAbsorption(/* creature */ monst) {
  let i;
	const buf = STRING(), buf2 = STRING();

    if (monst.xLoc == monst.targetCorpseLoc[0]
        && monst.yLoc == monst.targetCorpseLoc[1]
        && (monst.bookkeepingFlags & MB_ABSORBING))
    {
        if (--monst.corpseAbsorptionCounter <= 0) {
            monst.targetCorpseLoc[0] = monst.targetCorpseLoc[1] = 0;
            if (monst.absorptionBolt != BOLT_NONE) {
                for (i=0; monst.info.bolts[i] != BOLT_NONE; i++);
                monst.info.bolts[i] = monst.absorptionBolt;
            } else if (monst.absorbBehavior) {
                monst.info.flags |= monst.absorptionFlags;
            } else {
                monst.info.abilityFlags |= monst.absorptionFlags;
            }
            monst.newPowerCount--;
            monst.bookkeepingFlags &= ~MB_ABSORBING;

            if (monst.info.flags & MONST_FIERY) {
                monst.status[STATUS_BURNING] = monst.maxStatus[STATUS_BURNING] = 1000; // won't decrease
            }
            if (monst.info.flags & MONST_FLIES) {
                monst.status[STATUS_LEVITATING] = monst.maxStatus[STATUS_LEVITATING] = 1000; // won't decrease
                monst.info.flags &= ~(MONST_RESTRICTED_TO_LIQUID | MONST_SUBMERGES);
                monst.bookkeepingFlags &= ~(MB_SUBMERGED);
            }
            if (monst.info.flags & MONST_IMMUNE_TO_FIRE) {
                monst.status[STATUS_IMMUNE_TO_FIRE] = monst.maxStatus[STATUS_IMMUNE_TO_FIRE] = 1000; // won't decrease
            }
            if (monst.info.flags & MONST_INVISIBLE) {
                monst.status[STATUS_INVISIBLE] = monst.maxStatus[STATUS_INVISIBLE] = 1000; // won't decrease
            }
            if (canSeeMonster(monst)) {
                monsterName(buf2, monst, true);
                sprintf(buf, "%s finished %s the %s.", buf2, monsterText[monst.info.monsterID].absorbing, monst.targetCorpseName);
                message(buf, goodMessageColor, false);
                if (monst.absorptionBolt != BOLT_NONE) {
                    sprintf(buf, "%s %s!", buf2, boltCatalog[monst.absorptionBolt].abilityDescription);
                } else if (monst.absorbBehavior) {
                    sprintf(buf, "%s now %s!", buf2, monsterBehaviorFlagDescriptions[unflag(monst.absorptionFlags)]);
                } else {
                    sprintf(buf, "%s now %s!", buf2, monsterAbilityFlagDescriptions[unflag(monst.absorptionFlags)]);
                }
                resolvePronounEscapes(buf, monst);
                message(buf, advancementMessageColor, false);
            }
            monst.absorptionFlags = 0;
            monst.absorptionBolt = BOLT_NONE;
        }
        monst.ticksUntilTurn = 100;
        return true;
    } else if (--monst.corpseAbsorptionCounter <= 0) {
        monst.targetCorpseLoc[0] = monst.targetCorpseLoc[1] = 0; // lost its chance
        monst.bookkeepingFlags &= ~MB_ABSORBING;
        monst.absorptionFlags = 0;
        monst.absorptionBolt = BOLT_NONE;
    } else if (monst.bookkeepingFlags & MB_ABSORBING) {
        monst.bookkeepingFlags &= ~MB_ABSORBING; // absorbing but not on the corpse
        if (monst.corpseAbsorptionCounter <= 15) {
            monst.targetCorpseLoc[0] = monst.targetCorpseLoc[1] = 0; // lost its chance
            monst.absorptionFlags = 0;
            monst.absorptionBolt = BOLT_NONE;
        }
    }
    return false;
}

async function monstersTurn(/* creature */ monst) {
	let x, y, dir, shortestDistance;
  const playerLoc = [-1, -1], targetLoc = [-1, -1];
	let alreadyAtBestScent;
	let ally, target, closestMonster;    // creature *

	monst.turnsSpentStationary++;

	if (monst.corpseAbsorptionCounter >= 0 && updateMonsterCorpseAbsorption(monst)) {
        return;
	}

  if (monst.info.DFChance
      && (monst.info.flags & MONST_GETS_TURN_ON_ACTIVATION)
      && rand_percent(monst.info.DFChance))
  {
      await spawnDungeonFeature(monst.xLoc, monst.yLoc, dungeonFeatureCatalog[monst.info.DFType], true, false);
  }

  await applyInstantTileEffectsToCreature(monst); // Paralysis, confusion etc. take effect before the monster can move.

	// if the monster is paralyzed, entranced or chained, this is where its turn ends.
	if (monst.status[STATUS_PARALYZED] || monst.status[STATUS_ENTRANCED] || (monst.bookkeepingFlags & MB_CAPTIVE)) {
		monst.ticksUntilTurn = monst.movementSpeed;
		if ((monst.bookkeepingFlags & MB_CAPTIVE) && monst.carriedItem) {
			await makeMonsterDropItem(monst);
		}
		return;
	}

  if (monst.bookkeepingFlags & MB_IS_DYING) {
      return;
  }

	monst.ticksUntilTurn = Math.floor(monst.movementSpeed / 3); // will be later overwritten by movement or attack

	x = monst.xLoc;
	y = monst.yLoc;

	// Sleepers can awaken, but it takes a whole turn.
	if (monst.creatureState == MONSTER_SLEEPING) {
		monst.ticksUntilTurn = monst.movementSpeed;
		updateMonsterState(monst);
		return;
	}

	// Update creature state if appropriate.
	updateMonsterState(monst);

	if (monst.creatureState == MONSTER_SLEEPING) {
		monst.ticksUntilTurn = monst.movementSpeed;
		return;
	}

	// and move the monster.

	// immobile monsters can only use special abilities:
	if (monst.info.flags & MONST_IMMOBILE) {
    if (await monstUseMagic(monst)) { // if he actually cast a spell
        monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
        return;
    }
		monst.ticksUntilTurn = monst.attackSpeed;
		return;
	}

	// discordant monsters
	if (monst.status[STATUS_DISCORDANT] && monst.creatureState != MONSTER_FLEEING) {
		shortestDistance = max(DROWS, DCOLS);
		closestMonster = NULL;
		// CYCLE_MONSTERS_AND_PLAYERS(target) {
    for (target = player; target != NULL; target = (target === player ? monsters.nextCreature : target.nextCreature)) {
			if (target !== monst
				&& (!(target.bookkeepingFlags & MB_SUBMERGED) || (monst.bookkeepingFlags & MB_SUBMERGED))
				&& monsterWillAttackTarget(monst, target)
				&& distanceBetween(x, y, target.xLoc, target.yLoc) < shortestDistance
				&& traversiblePathBetween(monst, target.xLoc, target.yLoc)
				&& (!monsterAvoids(monst, target.xLoc, target.yLoc) || (target.info.flags & MONST_ATTACKABLE_THRU_WALLS))
				&& (!target.status[STATUS_INVISIBLE] || rand_percent(33)))
      {
				shortestDistance = distanceBetween(x, y, target.xLoc, target.yLoc);
				closestMonster = target;
			}
		}
		if (closestMonster && await monstUseMagic(monst)) {
			monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
			return;
		}
		if (closestMonster && !(monst.info.flags & MONST_MAINTAINS_DISTANCE)) {
			targetLoc[0] = closestMonster.xLoc;
			targetLoc[1] = closestMonster.yLoc;
			if (await moveMonsterPassivelyTowards(monst, targetLoc, false)) {
				return;
			}
		}
	}

	// hunting
	if ((monst.creatureState == MONSTER_TRACKING_SCENT
		   || (monst.creatureState == MONSTER_ALLY && monst.status[STATUS_DISCORDANT]))
		// eels don't charge if you're not in the water
		&& (!(monst.info.flags & MONST_RESTRICTED_TO_LIQUID) || cellHasTMFlag(player.xLoc, player.yLoc, TM_ALLOWS_SUBMERGING)))
  {
		// magic users sometimes cast spells
    if (await monstUseMagic(monst)
        || (monsterHasBoltEffect(monst, BE_BLINKING)
            && ((monst.info.flags & MONST_ALWAYS_USE_ABILITY) || rand_percent(30))
            && await monsterBlinkToPreferenceMap(monst, scentMap, true))) // if he actually cast a spell
    {
        monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
        return;
    }

		// if the monster is adjacent to an ally and not adjacent to the player, attack the ally
		if (distanceBetween(x, y, player.xLoc, player.yLoc) > 1
			|| diagonalBlocked(x, y, player.xLoc, player.yLoc, false))
    {
			for (ally = monsters.nextCreature; ally != NULL; ally = ally.nextCreature) {
				if (monsterWillAttackTarget(monst, ally)
            && distanceBetween(x, y, ally.xLoc, ally.yLoc) == 1
		        && (!ally.status[STATUS_INVISIBLE] || rand_percent(33)))
        {
					targetLoc[0] = ally.xLoc;
					targetLoc[1] = ally.yLoc;
					if (await moveMonsterPassivelyTowards(monst, targetLoc, true)) { // attack
						return;
					}
				}
			}
		}

		if ((monst.status[STATUS_LEVITATING] || (monst.info.flags & MONST_RESTRICTED_TO_LIQUID) || (monst.bookkeepingFlags & MB_SUBMERGED)
			     || ((monst.info.flags & (MONST_IMMUNE_TO_WEBS | MONST_INVULNERABLE) && monsterCanShootWebs(monst))))
			  && pmap[x][y].flags & IN_FIELD_OF_VIEW)
    {
			playerLoc[0] = player.xLoc;
			playerLoc[1] = player.yLoc;
			await moveMonsterPassivelyTowards(monst, playerLoc, true); // attack
			return;
		}
    if ((monst.info.flags & MONST_ALWAYS_HUNTING)
        && (monst.bookkeepingFlags & MB_GIVEN_UP_ON_SCENT))
    {
        await pathTowardCreature(monst, player);
        return;
    }

		dir = scentDirection(monst);
		if (dir == NO_DIRECTION) {
			alreadyAtBestScent = isLocalScentMaximum(monst.xLoc, monst.yLoc);
			if (alreadyAtBestScent && monst.creatureState != MONSTER_ALLY) {
        if (monst.info.flags & MONST_ALWAYS_HUNTING) {
            await pathTowardCreature(monst, player);
            monst.bookkeepingFlags |= MB_GIVEN_UP_ON_SCENT;
            return;
        }
				monst.creatureState = MONSTER_WANDERING;
				chooseNewWanderDestination(monst);
			}
		} else {
			await moveMonster(monst, nbDirs[dir][0], nbDirs[dir][1]);
		}
	} else if (monst.creatureState == MONSTER_FLEEING) {
		// fleeing
		if (monsterHasBoltEffect(monst, BE_BLINKING)
			&& ((monst.info.flags & MONST_ALWAYS_USE_ABILITY) || rand_percent(30))
			&& await monsterBlinkToSafety(monst))
    {
			return;
		}

    if (await monsterSummons(monst, (monst.info.flags & MONST_ALWAYS_USE_ABILITY))) {
        return;
    }

		if (fleeingMonsterAwareOfPlayer(monst)) {
			if (monst.safetyMap) {
				freeGrid(monst.safetyMap);
				monst.safetyMap = NULL;
			}
			if (!rogue.updatedSafetyMapThisTurn) {
				updateSafetyMap();
			}
			dir = nextStep(safetyMap, monst.xLoc, monst.yLoc, NULL, true);
		} else {
			if (!monst.safetyMap) {
				monst.safetyMap = allocGrid();
				copyGrid(monst.safetyMap, safetyMap);
			}
			dir = nextStep(monst.safetyMap, monst.xLoc, monst.yLoc, NULL, true);
		}
		if (dir != -1) {
			targetLoc[0] = x + nbDirs[dir][0];
			targetLoc[1] = y + nbDirs[dir][1];
		}
		if (dir == -1 || (!moveMonster(monst, nbDirs[dir][0], nbDirs[dir][1]) && !await moveMonsterPassivelyTowards(monst, targetLoc, true))) {
			// CYCLE_MONSTERS_AND_PLAYERS(ally) {
      for (ally = player; ally != NULL; ally = (ally === player ? monsters.nextCreature : ally.nextCreature)) {
				if (!monst.status[STATUS_MAGICAL_FEAR] // Fearful monsters will never attack.
					&& monsterWillAttackTarget(monst, ally)
					&& distanceBetween(x, y, ally.xLoc, ally.yLoc) <= 1)
        {
					await moveMonster(monst, ally.xLoc - x, ally.yLoc - y); // attack the player if cornered
					return;
				}
			}
		}
		return;
	} else if (monst.creatureState == MONSTER_WANDERING
			   // eels wander if you're not in water
			   || ((monst.info.flags & MONST_RESTRICTED_TO_LIQUID) && !cellHasTMFlag(player.xLoc, player.yLoc, TM_ALLOWS_SUBMERGING)))
  {
		// if we're standing in harmful terrain and there is a way to escape it, spend this turn escaping it.
		if (cellHasTerrainFlag(x, y, (T_HARMFUL_TERRAIN & ~T_IS_FIRE))
			|| (cellHasTerrainFlag(x, y, T_IS_FIRE) && !monst.status[STATUS_IMMUNE_TO_FIRE] && !(monst.info.flags & MONST_INVULNERABLE)))
    {
			if (!rogue.updatedMapToSafeTerrainThisTurn) {
				updateSafeTerrainMap();
			}

			if (await monsterBlinkToPreferenceMap(monst, rogue.mapToSafeTerrain, false)) {
				monst.ticksUntilTurn = monst.attackSpeed * (monst.info.flags & MONST_CAST_SPELLS_SLOWLY ? 2 : 1);
				return;
			}

			dir = nextStep(rogue.mapToSafeTerrain, x, y, monst, true);
			if (dir != -1) {
				targetLoc[0] = x + nbDirs[dir][0];
				targetLoc[1] = y + nbDirs[dir][1];
				if (await moveMonsterPassivelyTowards(monst, targetLoc, true)) {
					return;
				}
			}
		}

    // if a captive leader is captive, regenerative and healthy enough to withstand an attack,
    // and we're not poisonous, then approach or attack him.
		if ((monst.bookkeepingFlags & MB_FOLLOWER)
            && (monst.leader.bookkeepingFlags & MB_CAPTIVE)
			      && monst.leader.currentHP > Number(BigInt(monst.info.damage.upperBound * fp_monsterDamageAdjustmentAmount(monst)) >> BIG_BASE)
            && monst.leader.info.turnsBetweenRegen > 0
            && !(monst.info.abilityFlags & MA_POISONS)
            && !diagonalBlocked(monst.xLoc, monst.yLoc, monst.leader.xLoc, monst.leader.yLoc, false))
    {
      if (distanceBetween(monst.xLoc, monst.yLoc, monst.leader.xLoc, monst.leader.yLoc) == 1) {
          // Attack if adjacent.
          monst.ticksUntilTurn = monst.attackSpeed;
          await attack(monst, monst.leader, false);
          return;
      } else {
          // Otherwise, approach.
          await pathTowardCreature(monst, monst.leader);
          return;
      }
		}

		// if the monster is adjacent to an ally and not fleeing, attack the ally
		if (monst.creatureState == MONSTER_WANDERING) {
			for (ally = monsters.nextCreature; ally != NULL; ally = ally.nextCreature) {
				if (monsterWillAttackTarget(monst, ally)
          && distanceBetween(x, y, ally.xLoc, ally.yLoc) == 1
					&& (!ally.status[STATUS_INVISIBLE] || rand_percent(33)))
        {
					targetLoc[0] = ally.xLoc;
					targetLoc[1] = ally.yLoc;
					if (await moveMonsterPassivelyTowards(monst, targetLoc, true)) {
						return;
					}
				}
			}
		}

		// if you're a follower, don't get separated from the pack
		if (monst.bookkeepingFlags & MB_FOLLOWER) {
      if (distanceBetween(x, y, monst.leader.xLoc, monst.leader.yLoc) > 2) {
          await pathTowardCreature(monst, monst.leader);
      } else if (monst.leader.info.flags & MONST_IMMOBILE) {
          await monsterMillAbout(monst, 100); // Worshipers will pace frenetically.
      } else if (monst.leader.bookkeepingFlags & MB_CAPTIVE) {
          await monsterMillAbout(monst, 10); // Captors are languid.
      } else {
          await monsterMillAbout(monst, 30); // Other followers mill about like your allies do.
      }
		} else {
        // Step toward the chosen waypoint.
        dir = NO_DIRECTION;
        if (isValidWanderDestination(monst, monst.targetWaypointIndex)) {
            dir = nextStep(rogue.wpDistance[monst.targetWaypointIndex], monst.xLoc, monst.yLoc, monst, false);
        }
        // If there's no path forward, call that waypoint finished and pick a new one.
        if (!isValidWanderDestination(monst, monst.targetWaypointIndex)
            || dir == NO_DIRECTION) {

            chooseNewWanderDestination(monst);
            if (isValidWanderDestination(monst, monst.targetWaypointIndex)) {
                dir = nextStep(rogue.wpDistance[monst.targetWaypointIndex], monst.xLoc, monst.yLoc, monst, false);
            }
        }
        // If there's still no path forward, step randomly as though flitting.
        // (This is how eels wander in deep water.)
        if (dir == NO_DIRECTION) {
            dir = randValidDirectionFrom(monst, x, y, true);
        }
        if (dir != NO_DIRECTION) {
				targetLoc[0] = x + nbDirs[dir][0];
				targetLoc[1] = y + nbDirs[dir][1];
				if (await moveMonsterPassivelyTowards(monst, targetLoc, true)) {
					return;
				}
      }
    }
	} else if (monst.creatureState == MONSTER_ALLY) {
		await moveAlly(monst);
	}
}


function canPass( /* creature */ mover, /* creature */ blocker) {

    if (blocker === player) {
        return false;
    }

	if (blocker.status[STATUS_CONFUSED]
		|| blocker.status[STATUS_STUCK]
		|| blocker.status[STATUS_PARALYZED]
		|| blocker.status[STATUS_ENTRANCED]
		|| mover.status[STATUS_ENTRANCED])
  {
		return false;
	}

	if ((blocker.bookkeepingFlags & (MB_CAPTIVE | MB_ABSORBING))
		|| (blocker.info.flags & MONST_IMMOBILE))
  {
		return false;
	}

	if (monstersAreEnemies(mover, blocker)) {
		return false;
	}

	if (blocker.leader == mover) {
		return true;
	}

	if (mover.leader == blocker) {
		return false;
	}

	return (monstersAreTeammates(mover, blocker) && blocker.currentHP < mover.currentHP);
}

function isPassableOrSecretDoor(x, y) {
	return (!cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)
            || (cellHasTMFlag(x, y, TM_IS_SECRET) && !(discoveredTerrainFlagsAtLoc(x, y) & T_OBSTRUCTS_PASSABILITY)));
}

function knownToPlayerAsPassableOrSecretDoor(x, y) {
  let tFlags, TMFlags;
  const flags = getLocationFlags(x, y, true);
  tFlags = flags.terrainFlags;
  TMFlags = flags.TMFlags;
	return (!(tFlags & T_OBSTRUCTS_PASSABILITY)
            || ((TMFlags & TM_IS_SECRET) && !(discoveredTerrainFlagsAtLoc(x, y) & T_OBSTRUCTS_PASSABILITY)));
}

async function setMonsterLocation(/* creature */ monst, newX, newY) {
    const creatureFlag = (monst === player ? HAS_PLAYER : HAS_MONSTER);
    pmap[monst.xLoc][monst.yLoc].flags &= ~creatureFlag;
    refreshDungeonCell(monst.xLoc, monst.yLoc);
    monst.turnsSpentStationary = 0;
    monst.xLoc = newX;
    monst.yLoc = newY;
    pmap[newX][newY].flags |= creatureFlag;
    if ((monst.bookkeepingFlags & MB_SUBMERGED) && !cellHasTMFlag(newX, newY, TM_ALLOWS_SUBMERGING)) {
        monst.bookkeepingFlags &= ~MB_SUBMERGED;
    }
    if (playerCanSee(newX, newY)
        && cellHasTMFlag(newX, newY, TM_IS_SECRET)
        && cellHasTerrainFlag(newX, newY, T_OBSTRUCTS_PASSABILITY))
    {
        await discover(newX, newY); // if you see a monster use a secret door, you discover it
    }
    refreshDungeonCell(newX, newY);
    monst.ticksUntilTurn = monst.movementSpeed;
    await applyInstantTileEffectsToCreature(monst);
    if (monst === player) {
        updateVision(true);
        // get any items at the destination location
        if (pmap[player.xLoc][player.yLoc].flags & HAS_ITEM) {
            pickUpItemAt(player.xLoc, player.yLoc);
        }
    }

}

// Tries to move the given monster in the given vector; returns true if the move was legal
// (including attacking player, vomiting or struggling in vain)
// Be sure that dx, dy are both in the range [-1, 1] or the move will sometimes fail due to the diagonal check.
async function moveMonster(/* creature */ monst, dx, dy) {
	let x = monst.xLoc, y = monst.yLoc;
	let newX, newY;
  let i;
	let confusedDirection, swarmDirection;
	let defender = NULL; // creature *
  const hitList = []; // creature *[16] = {NULL};
  let dir;

  if (dx == 0 && dy == 0) {
      return false;
  }

	newX = x + dx;
	newY = y + dy;

	if (!coordinatesAreInMap(newX, newY)) {
		//DEBUG printf("\nProblem! Monster trying to move more than one space at a time.");
		return false;
	}

	// vomiting
	if (monst.status[STATUS_NAUSEOUS] && rand_percent(25)) {
		await vomit(monst);
		monst.ticksUntilTurn = monst.movementSpeed;
		return true;
	}

	// move randomly?
	if (!monst.status[STATUS_ENTRANCED]) {
		if (monst.status[STATUS_CONFUSED]) {
			confusedDirection = randValidDirectionFrom(monst, x, y, false);
			if (confusedDirection != -1) {
				dx = nbDirs[confusedDirection][0];
				dy = nbDirs[confusedDirection][1];
			}
		} else if ((monst.info.flags & MONST_FLITS) && !(monst.bookkeepingFlags & MB_SEIZING) && rand_percent(33)) {
			confusedDirection = randValidDirectionFrom(monst, x, y, true);
			if (confusedDirection != -1) {
				dx = nbDirs[confusedDirection][0];
				dy = nbDirs[confusedDirection][1];
			}
		}
	}

	newX = x + dx;
	newY = y + dy;

	// Liquid-based monsters should never move or attack outside of liquid.
	if ((monst.info.flags & MONST_RESTRICTED_TO_LIQUID) && !cellHasTMFlag(newX, newY, TM_ALLOWS_SUBMERGING)) {
		return false;
	}

	// Caught in spiderweb?
	if (monst.status[STATUS_STUCK] && !(pmap[newX][newY].flags & (HAS_PLAYER | HAS_MONSTER))
		&& cellHasTerrainFlag(x, y, T_ENTANGLES) && !(monst.info.flags & MONST_IMMUNE_TO_WEBS))
  {
		if (!(monst.info.flags & MONST_INVULNERABLE)
            && --monst.status[STATUS_STUCK])
    {
			monst.ticksUntilTurn = monst.movementSpeed;
			return true;
		} else if (tileCatalog[pmap[x][y].layers[SURFACE]].flags & T_ENTANGLES) {
			pmap[x][y].layers[SURFACE] = NOTHING;
		}
	}

	if (pmap[newX][newY].flags & (HAS_MONSTER | HAS_PLAYER)) {
		defender = monsterAtLoc(newX, newY);
	} else {
		if (monst.bookkeepingFlags & MB_SEIZED) {
			for (defender = monsters.nextCreature; defender != NULL; defender = defender.nextCreature) {
				if ((defender.bookkeepingFlags & MB_SEIZING)
					&& monstersAreEnemies(monst, defender)
          && distanceBetween(monst.xLoc, monst.yLoc, defender.xLoc, defender.yLoc) == 1
          && !diagonalBlocked(monst.xLoc, monst.yLoc, defender.xLoc, defender.yLoc, false))
        {
					monst.ticksUntilTurn = monst.movementSpeed;
					return true;
				}
			}
			monst.bookkeepingFlags &= ~MB_SEIZED; // failsafe
		}
		if (monst.bookkeepingFlags & MB_SEIZING) {
			monst.bookkeepingFlags &= ~MB_SEIZING;
		}
	}

  for (dir = 0; dir < DIRECTION_COUNT; dir++) {
       if (dx == nbDirs[dir][0]
           && dy == nbDirs[dir][1])
       {
           break;
       }
   }
   brogueAssert(dir != NO_DIRECTION);
   if (await handleWhipAttacks(monst, dir, NULL)
       || await handleSpearAttacks(monst, dir, NULL))
   {
       monst.ticksUntilTurn = monst.attackSpeed;
       return true;
   }

	if (((defender && (defender.info.flags & MONST_ATTACKABLE_THRU_WALLS))
		    || (isPassableOrSecretDoor(newX, newY)
            && !diagonalBlocked(x, y, newX, newY, false)
	          && isPassableOrSecretDoor(x, y)))
		 && (!defender || canPass(monst, defender) || monsterWillAttackTarget(monst, defender)))
  {
			// if it's a legal move

			if (defender) {
				if (canPass(monst, defender)) {
            // swap places
            pmap[defender.xLoc][defender.yLoc].flags &= ~HAS_MONSTER;
            refreshDungeonCell(defender.xLoc, defender.yLoc);

            pmap[monst.xLoc][monst.yLoc].flags &= ~HAS_MONSTER;
            refreshDungeonCell(monst.xLoc, monst.yLoc);

            monst.xLoc = newX;
            monst.yLoc = newY;
            pmap[monst.xLoc][monst.yLoc].flags |= HAS_MONSTER;

            if (monsterAvoids(defender, x, y)) { // don't want a flying monster to swap a non-flying monster into lava!
                const loc = getQualifyingPathLocNear(x, y, true,
                                         forbiddenFlagsForMonster((defender.info)), HAS_PLAYER,
                                         forbiddenFlagsForMonster((defender.info)), (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS), false);
                defender.xLoc = loc[0];
                defender.yLoc = loc[1];
            } else {
                defender.xLoc = x;
                defender.yLoc = y;
            }
            pmap[defender.xLoc][defender.yLoc].flags |= HAS_MONSTER;

            refreshDungeonCell(monst.xLoc, monst.yLoc);
            refreshDungeonCell(defender.xLoc, defender.yLoc);

            monst.ticksUntilTurn = monst.movementSpeed;
            return true;
        }

        // Sights are set on an enemy monster. Would we rather swarm than attack?
        swarmDirection = monsterSwarmDirection(monst, defender);
        if (swarmDirection != NO_DIRECTION) {
            newX = monst.xLoc + nbDirs[swarmDirection][0];
            newY = monst.yLoc + nbDirs[swarmDirection][1];
            await setMonsterLocation(monst, newX, newY);
            monst.ticksUntilTurn = monst.movementSpeed;
            return true;
        } else {
            // attacking another monster!
            monst.ticksUntilTurn = monst.attackSpeed;
            if (!((monst.info.abilityFlags & MA_SEIZES) && !(monst.bookkeepingFlags & MB_SEIZING))) {
                // Bog monsters and krakens won't surface on the turn that they seize their target.
                monst.bookkeepingFlags &= ~MB_SUBMERGED;
            }
            refreshDungeonCell(x, y);

            buildHitList(hitList, monst, defender,
                         // (monst.info.abilityFlags & MA_ATTACKS_PENETRATE) ? true : false,
                         (monst.info.abilityFlags & MA_ATTACKS_ALL_ADJACENT) ? true : false);
            // Attack!
            for (i=0; i<16; i++) {
                if (hitList[i]
                    && monsterWillAttackTarget(monst, hitList[i])
                    && !(hitList[i].bookkeepingFlags & MB_IS_DYING)
                    && !rogue.gameHasEnded)
                {
                    await attack(monst, hitList[i], false);
                }
            }
        }
        return true;
			} else {
        // okay we're moving!
        await setMonsterLocation(monst, newX, newY);
        monst.ticksUntilTurn = monst.movementSpeed;
				return true;
			}
		}
	return false;
}


function clearStatus(/* creature */ monst) {
	let i;

	for (i=0; i<NUMBER_OF_STATUS_EFFECTS; i++) {
		monst.status[i] = monst.maxStatus[i] = 0;
	}
}

// Bumps a creature to a random nearby hospitable cell.
function findAlternativeHomeFor( /* creature */ monst, x, y, chooseRandomly) {
	let sCols = [], sRows = [], i, j, maxPermissibleDifference, dist;

  fillSequentialList(sCols, DCOLS);
  fillSequentialList(sRows, DROWS);
	if (chooseRandomly) {
		shuffleList(sCols, DCOLS);
		shuffleList(sRows, DROWS);
	}

	for (maxPermissibleDifference = 1; maxPermissibleDifference < max(DCOLS, DROWS); maxPermissibleDifference++) {
		for (i=0; i < DCOLS; i++) {
			for (j=0; j<DROWS; j++) {
				dist = abs(sCols[i] - monst.xLoc) + abs(sRows[j] - monst.yLoc);
				if (dist <= maxPermissibleDifference
					&& dist > 0
					&& !(pmap[sCols[i]][sRows[j]].flags & (HAS_PLAYER | HAS_MONSTER))
					&& !monsterAvoids(monst, sCols[i], sRows[j])
					&& !(monst === player && cellHasTerrainFlag(sCols[i], sRows[j], T_PATHING_BLOCKER)))
        {
					// Success!
					return [sCols[i], sRows[j]];
				}
			}
		}
	}
	// Failure!
  return [-1, -1];
}

// blockingMap is optional
function getQualifyingLocNear(x, y,
							 hallwaysAllowed,
							 blockingMap /* char[DCOLS][DROWS] */,
							 forbiddenTerrainFlags,
							 forbiddenMapFlags,
							 forbidLiquid,
							 deterministic)
{
  let loc = [];
	let i, j, k, candidateLocs, randIndex;

	candidateLocs = 0;

	// count up the number of candidate locations
	for (k=0; k<max(DROWS, DCOLS) && !candidateLocs; k++) {
		for (i = x-k; i <= x+k; i++) {
			for (j = y-k; j <= y+k; j++) {
				if (coordinatesAreInMap(i, j)
					&& (i == x-k || i == x+k || j == y-k || j == y+k)
					&& (!blockingMap || !blockingMap[i][j])
					&& !cellHasTerrainFlag(i, j, forbiddenTerrainFlags)
					&& !(pmap[i][j].flags & forbiddenMapFlags)
					&& (!forbidLiquid || pmap[i][j].layers[LIQUID] == NOTHING)
					&& (hallwaysAllowed || passableArcCount(i, j) < 2))
        {
					candidateLocs++;
				}
			}
		}
	}

	if (candidateLocs == 0) {
		return null;
	}

	// and pick one
	if (deterministic) {
    randIndex = 1 + Math.floor(candidateLocs / 2);
	} else {
		randIndex = rand_range(1, candidateLocs);
	}

	for (k=0; k<max(DROWS, DCOLS); k++) {
		for (i = x-k; i <= x+k; i++) {
			for (j = y-k; j <= y+k; j++) {
				if (coordinatesAreInMap(i, j)
					&& (i == x-k || i == x+k || j == y-k || j == y+k)
					&& (!blockingMap || !blockingMap[i][j])
					&& !cellHasTerrainFlag(i, j, forbiddenTerrainFlags)
					&& !(pmap[i][j].flags & forbiddenMapFlags)
					&& (!forbidLiquid || pmap[i][j].layers[LIQUID] == NOTHING)
					&& (hallwaysAllowed || passableArcCount(i, j) < 2))
        {
					if (--randIndex == 0) {
						loc[0] = i;
						loc[1] = j;
						return loc;
					}
				}
			}
		}
	}

  brogueAssert(false);
	return null; // should never reach this point
}

function getQualifyingGridLocNear(
								 x, y,
								 grid /* boolean[DCOLS][DROWS] */,
								 deterministic)
{
  let loc = [];
	let i, j, k, candidateLocs, randIndex;

	candidateLocs = 0;

	// count up the number of candidate locations
	for (k=0; k<max(DROWS, DCOLS) && !candidateLocs; k++) {
		for (i = x-k; i <= x+k; i++) {
			for (j = y-k; j <= y+k; j++) {
				if (coordinatesAreInMap(i, j)
					&& (i == x-k || i == x+k || j == y-k || j == y+k)
					&& grid[i][j])
        {
					candidateLocs++;
				}
			}
		}
	}

	if (candidateLocs == 0) {
		return null;
	}

	// and pick one
	if (deterministic) {
		randIndex = 1 + Math.floor(candidateLocs / 2);
	} else {
		randIndex = rand_range(1, candidateLocs);
	}

	for (k=0; k<max(DROWS, DCOLS); k++) {
		for (i = x-k; i <= x+k; i++) {
			for (j = y-k; j <= y+k; j++) {
				if (coordinatesAreInMap(i, j)
					&& (i == x-k || i == x+k || j == y-k || j == y+k)
					&& grid[i][j])
        {
					if (--randIndex == 0) {
						loc[0] = i;
						loc[1] = j;
						return loc;
					}
				}
			}
		}
	}

  brogueAssert(false);
	return null; // should never reach this point
}


async function makeMonsterDropItem(/* creature */ monst) {
	let x, y;
  const loc = getQualifyingPathLocNear(monst.xLoc, monst.yLoc, true,
                           T_DIVIDES_LEVEL, 0,
                           0, (HAS_PLAYER | HAS_STAIRS | HAS_ITEM), false);
  x = loc[0];
  y = loc[1];
	//getQualifyingLocNear(loc, monst.xLoc, monst.yLoc, true, 0, (T_OBSTRUCTS_ITEMS), (HAS_ITEM), false, false);
	await placeItem(monst.carriedItem, x, y);
	monst.carriedItem = NULL;
	refreshDungeonCell(x, y);
}


function checkForContinuedLeadership(/* creature */ monst) {
	let follower;  // creature *
  let maintainLeadership = false;

  if (monst.bookkeepingFlags & MB_LEADER) {
      for (follower = monsters.nextCreature; follower != NULL; follower = follower.nextCreature) {
          if (follower.leader === monst && monst !== follower) {
              maintainLeadership = true;
              break;
          }
      }
  }
  if (!maintainLeadership) {
      monst.bookkeepingFlags &= ~MB_LEADER;
  }
}

function demoteMonsterFromLeadership( /* creature */ monst) {
	let follower, newLeader = NULL; // creature *
  let atLeastOneNewFollower = false;

	monst.bookkeepingFlags &= ~MB_LEADER;
	if (monst.mapToMe) {
		freeGrid(monst.mapToMe);
		monst.mapToMe = NULL;
	}
	for (follower = monsters.nextCreature; follower != NULL; follower = follower.nextCreature) {
		if (follower.leader === monst && monst !== follower) {
			if (follower.bookkeepingFlags & MB_BOUND_TO_LEADER) {
				// gonna die in playerTurnEnded().
				follower.leader = NULL;
				follower.bookkeepingFlags &= ~MB_FOLLOWER;
			} else if (newLeader) {
				follower.leader = newLeader;
        atLeastOneNewFollower = true;
        follower.targetWaypointIndex = monst.targetWaypointIndex;
        if (follower.targetWaypointIndex >= 0) {
            follower.waypointAlreadyVisited[follower.targetWaypointIndex] = false;
        }
			} else {
				newLeader = follower;
				follower.bookkeepingFlags |= MB_LEADER;
				follower.bookkeepingFlags &= ~MB_FOLLOWER;
				follower.leader = NULL;
			}
		}
	}
  if (newLeader
      && !atLeastOneNewFollower)
  {
      newLeader.bookkeepingFlags &= ~MB_LEADER;
  }
	for (follower = dormantMonsters.nextCreature; follower != NULL; follower = follower.nextCreature) {
		if (follower.leader === monst && monst !== follower) {
			follower.leader = NULL;
			follower.bookkeepingFlags &= ~MB_FOLLOWER;
		}
	}
}

// Makes a monster dormant, or awakens it from that state
function toggleMonsterDormancy( /* creature */ monst) {
	let prevMonst;   // creature *
	let loc;

	for (prevMonst = dormantMonsters; prevMonst != NULL; prevMonst = prevMonst.nextCreature) {
		if (prevMonst.nextCreature == monst) {
			// Found it! It's dormant. Wake it up.

			// Remove it from the dormant chain.
			prevMonst.nextCreature = monst.nextCreature;

			// Add it to the normal chain.
			monst.nextCreature = monsters.nextCreature;
			monsters.nextCreature = monst;

			pmap[monst.xLoc][monst.yLoc].flags &= ~HAS_DORMANT_MONSTER;

			// Does it need a new location?
			if (pmap[monst.xLoc][monst.yLoc].flags & (HAS_MONSTER | HAS_PLAYER)) { // Occupied!
          loc = getQualifyingPathLocNear(monst.xLoc, monst.yLoc, true,
                                         T_DIVIDES_LEVEL & avoidedFlagsForMonster(monst.info), HAS_PLAYER,
                                         avoidedFlagsForMonster(monst.info), (HAS_PLAYER | HAS_MONSTER | HAS_STAIRS), false);
          if (loc) {
            monst.xLoc = loc[0];
            monst.yLoc = loc[1];
          }
			}

      if (monst.bookkeepingFlags & MB_MARKED_FOR_SACRIFICE) {
           monst.bookkeepingFlags |= MB_TELEPATHICALLY_REVEALED;
           if (monst.carriedItem) {
               makeMonsterDropItem(monst);
           }
       }

			// Miscellaneous transitional tasks.
			// Don't want it to move before the player has a chance to react.
			monst.ticksUntilTurn = 200;

			pmap[monst.xLoc][monst.yLoc].flags |= HAS_MONSTER;
			monst.bookkeepingFlags &= ~MB_IS_DORMANT;
			fadeInMonster(monst);
			return;
		}
	}

	for (prevMonst = monsters; prevMonst != NULL; prevMonst = prevMonst.nextCreature) {
		if (prevMonst.nextCreature == monst) {
			// Found it! It's alive. Put it into dormancy.
			// Remove it from the monsters chain.
			prevMonst.nextCreature = monst.nextCreature;
			// Add it to the dormant chain.
			monst.nextCreature = dormantMonsters.nextCreature;
			dormantMonsters.nextCreature = monst;
			// Miscellaneous transitional tasks.
			pmap[monst.xLoc][monst.yLoc].flags &= ~HAS_MONSTER;
			pmap[monst.xLoc][monst.yLoc].flags |= HAS_DORMANT_MONSTER;
			monst.bookkeepingFlags |= MB_IS_DORMANT;
			return;
		}
	}
}

function staffOrWandEffectOnMonsterDescription( newText, /* item */ theItem, /* creature */ monst) {
    const theItemName = STRING(), monstName = STRING(); // char[COLS];
    let successfulDescription = false;
    const enchant = fp_netEnchant(theItem);

    if ((theItem.category & (STAFF | WAND))
        && tableForItemCategory(theItem.category, NULL)[theItem.kind].identified)
    {
        monsterName(monstName, monst, true);
        itemName(theItem, theItemName, false, false, NULL);

        switch (boltEffectForItem(theItem)) {
            case BE_DAMAGE:
                if ((boltCatalog[boltForItem(theItem)].flags & BF_FIERY) && (monst.status[STATUS_IMMUNE_TO_FIRE])
                    || (monst.info.flags & MONST_INVULNERABLE))
                {
                    sprintf(newText, "\n     Your %s (%c) will not harm %s.",
                            theItemName,
                            theItem.inventoryLetter,
                            monstName);
                    successfulDescription = true;
                } else if (theItem.flags & (ITEM_MAX_CHARGES_KNOWN | ITEM_IDENTIFIED)) {
                    if (fp_staffDamageLow(enchant) >= monst.currentHP) {
                        sprintf(newText, "\n     Your %s (%c) will %s the %s in one hit.",
                                theItemName,
                                theItem.inventoryLetter,
                                (monst.info.flags & MONST_INANIMATE) ? "destroy" : "kill",
                                monstName);
                    } else {
                        sprintf(newText, "\n     Your %s (%c) will hit %s for between %i% and %i% of $HISHER current health.",
                                theItemName,
                                theItem.inventoryLetter,
                                monstName,
                                Math.floor(100 * fp_staffDamageLow(enchant) / monst.currentHP),
                                Math.floor(100 * fp_staffDamageHigh(enchant) / monst.currentHP));
                    }
                    successfulDescription = true;
                }
                break;
            case BE_POISON:
                if (monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)) {
                    sprintf(newText, "\n     Your %s (%c) will not affect %s.",
                            theItemName,
                            theItem.inventoryLetter,
                            monstName);
                } else {
                    sprintf(newText, "\n     Your %s (%c) will poison %s for %i% of $HISHER current health.",
                            theItemName,
                            theItem.inventoryLetter,
                            monstName,
                            Math.floor(100 * fp_staffPoison(enchant) / monst.currentHP));
                }
                successfulDescription = true;
                break;
            case BE_DOMINATION:
                if (monst.creatureState != MONSTER_ALLY) {
                    if (monst.info.flags & MONST_INANIMATE) {
                        sprintf(newText, "\n     A wand of domination will have no effect on objects like %s.",
                                monstName);
                    } else if (monst.info.flags & MONST_INVULNERABLE) {
                        sprintf(newText, "\n     A wand of domination will not affect %s.",
                                monstName);
                    } else if (wandDominate(monst) <= 0) {
                        sprintf(newText, "\n     A wand of domination will fail at %s's current health level.",
                                monstName);
                    } else if (wandDominate(monst) >= 100) {
                        sprintf(newText, "\n     A wand of domination will always succeed at %s's current health level.",
                                monstName);
                    } else {
                        sprintf(newText, "\n     A wand of domination will have a %i% chance of success at %s's current health level.",
                                wandDominate(monst),
                                monstName);
                    }
                    successfulDescription = true;
                }
                break;
            default:
                strcpy(newText, "");
                break;
        }
    }
    return successfulDescription;
}

function monsterDetails( buf, /* creature */ monst) {
	const monstName = STRING(), capMonstName = STRING(), theItemName = STRING(), newText = STRING(); // char[20*COLS];
	let i, j, combatMath, combatMath2, playerKnownAverageDamage, playerKnownMaxDamage, commaCount, realArmorValue;
	let anyFlags, displayedItemText = false, alreadyDisplayedDominationText = false;
	let theItem; // item *
  let color = null;

	buf.clear();
	commaCount = 0;

	monsterName(monstName, monst, true);
  strcpy(capMonstName, monstName);
	capitalize(capMonstName);

	if (!(monst.info.flags & MONST_RESTRICTED_TO_LIQUID)
		 || cellHasTMFlag(monst.xLoc, monst.yLoc, TM_ALLOWS_SUBMERGING))
  {
		// If the monster is not a beached whale, print the ordinary flavor text.
    sprintf(newText, "     %s\n     ", monsterText[monst.info.monsterID].flavorText);
		strcat(buf, newText);
	}

  if (monst.mutationIndex >= 0) {
    i = strlen(buf);
    i = encodeMessageColor(buf, i, mutationCatalog[monst.mutationIndex].textColor);
    strcpy(newText, mutationCatalog[monst.mutationIndex].description);
    resolvePronounEscapes(newText, monst);
    upperCase(newText);
    strcat(newText, "\n     ");
    strcat(buf, newText);
    i = strlen(buf);
    i = encodeMessageColor(buf, i, white);
  }

	if (!(monst.info.flags & MONST_ATTACKABLE_THRU_WALLS)
		&& cellHasTerrainFlag(monst.xLoc, monst.yLoc, T_OBSTRUCTS_PASSABILITY))
  {
		// If the monster is trapped in impassible terrain, explain as much.
		sprintf(newText, "%s is trapped %s %s.\n     ",
				capMonstName,
				(tileCatalog[pmap[monst.xLoc][monst.yLoc].layers[layerWithFlag(monst.xLoc, monst.yLoc, T_OBSTRUCTS_PASSABILITY)]].mechFlags & TM_STAND_IN_TILE) ? "in" : "on",
				tileCatalog[pmap[monst.xLoc][monst.yLoc].layers[layerWithFlag(monst.xLoc, monst.yLoc, T_OBSTRUCTS_PASSABILITY)]].description);
    strcat(buf, newText);
	}

	if (!rogue.armor || (rogue.armor.flags & ITEM_IDENTIFIED)) {
		combatMath2 = hitProbability(monst, player);
	} else {
		realArmorValue = player.info.defense;
		player.info.defense = Math.floor((armorTable[rogue.armor.kind].range.upperBound + armorTable[rogue.armor.kind].range.lowerBound) / 2);
		player.info.defense += Number(BigInt(10 * fp_strengthModifier(rogue.armor)) >> BIG_BASE);
		combatMath2 = hitProbability(monst, player);
		player.info.defense = realArmorValue;
	}

	if ((monst.info.flags & MONST_RESTRICTED_TO_LIQUID) && !cellHasTMFlag(monst.xLoc, monst.yLoc, TM_ALLOWS_SUBMERGING)) {
		sprintf(newText, "     %s writhes helplessly on dry land.\n     ", capMonstName);
	} else if (rogue.armor
			   && (rogue.armor.flags & ITEM_RUNIC)
			   && (rogue.armor.flags & ITEM_RUNIC_IDENTIFIED)
			   && rogue.armor.enchant2 == A_IMMUNITY
			   && monsterIsInClass(monst, rogue.armor.vorpalEnemy))
  {
    itemName(rogue.armor, theItemName, false, false, NULL);
    sprintf(newText, "Your %s renders you immune to %s.\n     ", theItemName, monstName);
	} else if (Number(BigInt(monst.info.damage.upperBound * fp_monsterDamageAdjustmentAmount(monst)) >> BIG_BASE) == 0) {
    sprintf(newText, "%s deals no direct damage.\n     ", capMonstName);
	} else {
    i = strlen(buf);
		encodeMessageColor(buf, i, badMessageColor);
    if (monst.info.abilityFlags & MA_POISONS) {
        combatMath = player.status[STATUS_POISONED]; // combatMath is poison duration
        for (i = 0; combatMath * (player.poisonAmount + i) < player.currentHP; i++) {
            combatMath += Number(BigInt(monst.info.damage.upperBound * fp_monsterDamageAdjustmentAmount(monst)) >> BIG_BASE);
        }
        if (i == 0) {
            // Already fatally poisoned.
            sprintf(newText, "%s has a %i% chance to poison you and typically poisons for %i turns.\n     ",
                    capMonstName,
                    combatMath2,
                    Number(BigInt((monst.info.damage.lowerBound + monst.info.damage.upperBound) * fp_monsterDamageAdjustmentAmount(monst)) / 2n >> BIG_BASE));
        } else {
          sprintf(newText, "%s has a %i% chance to poison you, typically poisons for %i turns, and at worst, could fatally poison you in %i hit%s.\n     ",
                capMonstName,
                combatMath2,
                Number(BigInt(monst.info.damage.lowerBound + monst.info.damage.upperBound) * fp_monsterDamageAdjustmentAmount(monst) / 2n >> BIG_BASE),
                i,
                (i > 1 ? "s" : ""));
        }
    } else {
        combatMath = Number( ((BigInt(player.currentHP + monst.info.damage.upperBound * fp_monsterDamageAdjustmentAmount(monst)) >> BIG_BASE - 1n) << BIG_BASE) / BigInt(monst.info.damage.upperBound * fp_monsterDamageAdjustmentAmount(monst) ));
        if (combatMath < 1) {
            combatMath = 1;
        }
        sprintf(newText, "%s has a %i% chance to hit you, typically hits for %i% of your current health, and at worst, could defeat you in %i hit%s.\n     ",
                capMonstName,
                combatMath2,
                Number((100n * BigInt(monst.info.damage.lowerBound + monst.info.damage.upperBound) * BigInt(fp_monsterDamageAdjustmentAmount(monst)) / 2n / BigInt(player.currentHP)) >> BIG_BASE),
                combatMath,
                (combatMath > 1 ? "s" : ""));
    }
	}
	capitalize(newText);
  strcat(buf, newText);

	if (monst.creatureState == MONSTER_ALLY) {
    i = strlen(buf);
		i = encodeMessageColor(buf, i, goodMessageColor);

		sprintf(newText, "%s is your ally.", capMonstName);
		if (monst.newPowerCount > 0) {
      capitalize(newText);
			strcat(buf, newText);
			strcat(buf, "\n     ");
			i = strlen(buf);
			i = encodeMessageColor(buf, i, advancementMessageColor);

      if (monst.newPowerCount == 1) {
          strcpy(newText, "$HESHE seems ready to learn something new.");
      } else {
          sprintf(newText, "$HESHE seems ready to learn %i new talents.", monst.newPowerCount);
      }
			resolvePronounEscapes(newText, monst); // So that it gets capitalized appropriately.
		}
	} else if (monst.bookkeepingFlags & MB_CAPTIVE) {
    i = strlen(buf);
		i = encodeMessageColor(buf, i, goodMessageColor);
		sprintf(newText, "%s is being held captive.", capMonstName);
	} else {

		if (!rogue.weapon || (rogue.weapon.flags & ITEM_IDENTIFIED)) {
			playerKnownAverageDamage = Math.floor((player.info.damage.upperBound + player.info.damage.lowerBound) / 2);
			playerKnownMaxDamage = player.info.damage.upperBound;
		} else {
			playerKnownAverageDamage = Math.floor((rogue.weapon.damage.upperBound + rogue.weapon.damage.lowerBound) / 2);
			playerKnownMaxDamage = rogue.weapon.damage.upperBound;
		}

		if (playerKnownMaxDamage == 0) {
      i = strlen(buf);
			i = encodeMessageColor(buf, i, white);

			sprintf(newText, "You deal no direct damage.");
    } else if (rogue.weapon
               && (rogue.weapon.flags & ITEM_RUNIC)
               && (rogue.weapon.flags & ITEM_RUNIC_IDENTIFIED)
               && rogue.weapon.enchant2 == W_SLAYING
               && monsterIsInClass(monst, rogue.weapon.vorpalEnemy))
    {
      i = strlen(buf);
			i = encodeMessageColor(buf, i, goodMessageColor);
      itemName(rogue.weapon, theItemName, false, false, NULL);
      sprintf(newText, "Your %s will slay %s in one stroke.", theItemName, monstName);
		} else if (monst.info.flags & (MONST_INVULNERABLE | MONST_IMMUNE_TO_WEAPONS)) {
      i = strlen(buf);
			i = encodeMessageColor(buf, i, white);
      sprintf(newText, "%s is immune to your attacks.", monstName);
    } else {
      i = strlen(buf);
			i = encodeMessageColor(buf, i, goodMessageColor);

			combatMath = Math.floor((monst.currentHP + playerKnownMaxDamage - 1) / playerKnownMaxDamage);
      if (combatMath < 1) {
          combatMath = 1;
      }
			if (rogue.weapon && !(rogue.weapon.flags & ITEM_IDENTIFIED)) {
				realArmorValue = rogue.weapon.enchant1;
				rogue.weapon.enchant1 = 0;
				combatMath2 = hitProbability(player, monst);
				rogue.weapon.enchant1 = realArmorValue;
			} else {
				combatMath2 = hitProbability(player, monst);
			}
			sprintf(newText, "You have a %i% chance to hit %s, typically hit for %i% of $HISHER current health, and at best, could defeat $HIMHER in %i hit%s.",
					combatMath2,
					monstName,
					Math.floor(100 * playerKnownAverageDamage / monst.currentHP),
					combatMath,
					(combatMath > 1 ? "s" : ""));
		}
	}
	capitalize(newText);
  strcat(buf, newText);

	for (theItem = packItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
		if (staffOrWandEffectOnMonsterDescription(newText, theItem, monst)) {
      if (boltEffectForItem(theItem) == BE_DOMINATION) {
          if (alreadyDisplayedDominationText) {
              continue;
          } else {
              alreadyDisplayedDominationText = true;
          }
      }
      i = strlen(buf);
			i = encodeMessageColor(buf, i, itemMessageColor);
			strcat(buf, newText);
			displayedItemText = true;
		}
	}

	if (monst.carriedItem) {
    i = strlen(buf);
		i = encodeMessageColor(buf, i, itemMessageColor);
		itemName(monst.carriedItem, theItemName, true, true, NULL);
		sprintf(newText, "%s has %s.", capMonstName, theItemName);
		upperCase(newText);
		strcat(buf, "\n     ");
		strcat(buf, newText);
	}

  strcat(buf, "\n     ");

  i = strlen(buf);
	i = encodeMessageColor(buf, i, white);

	anyFlags = false;
	sprintf(newText, "%s ", capMonstName);

	if (monst.attackSpeed < 100) {
    strcat(newText, "attacks quickly");
		anyFlags = true;
	} else if (monst.attackSpeed > 100) {
    strcat(newText, "attacks slowly");
		anyFlags = true;
	}

	if (monst.movementSpeed < 100) {
		if (anyFlags) {
      strcat(newText, "& ");
			commaCount++;
		}
    strcat(newText, "moves quickly");
		anyFlags = true;
	} else if (monst.movementSpeed > 100) {
		if (anyFlags) {
      strcat(newText, "& ");
			commaCount++;
		}
    strcat(newText, "moves slowly");
		anyFlags = true;
	}

	if (monst.info.turnsBetweenRegen == 0) {
		if (anyFlags) {
      strcat(newText, "& ");
			commaCount++;
		}
    strcat(newText, "does not regenerate");
		anyFlags = true;
	} else if (monst.info.turnsBetweenRegen < 5000) {
		if (anyFlags) {
      strcat(newText, "& ");
			commaCount++;
		}
    strcat(newText, "regenerates quickly");
		anyFlags = true;
	}

	// bolt flags
	for (i = 0; monst.info.bolts[i] != BOLT_NONE; i++) {
		if (boltCatalog[monst.info.bolts[i]].abilityDescription[0]) {
			if (anyFlags) {
        strcat(newText, "& ");
				commaCount++;
			}
      strcat(newText, boltCatalog[monst.info.bolts[i]].abilityDescription);
			anyFlags = true;
		}
	}

	// ability flags
	for (i=0; i<32; i++) {
		if ((monst.info.abilityFlags & (Fl(i)))
			&& monsterAbilityFlagDescriptions[i]) {
			if (anyFlags) {
        strcat(newText, "& ");
				commaCount++;
			}
      strcat(newText, monsterAbilityFlagDescriptions[i]);
			anyFlags = true;
		}
	}

	// behavior flags
	for (i=0; i<32; i++) {
		if ((monst.info.flags & (Fl(i)))
			&& monsterBehaviorFlagDescriptions[i]) {
			if (anyFlags) {
        strcat(newText, "& ");
				commaCount++;
			}
      strcat(newText, monsterBehaviorFlagDescriptions[i]);
			anyFlags = true;
		}
	}

	// bookkeeping flags
	for (i=0; i<32; i++) {
		if ((monst.bookkeepingFlags & (Fl(i)))
			&& monsterBookkeepingFlagDescriptions[i])
    {
			if (anyFlags) {
        strcat(newText, "& ");
				commaCount++;
			}
      strcat(newText, monsterBookkeepingFlagDescriptions[i]);
			anyFlags = true;
		}
	}

	if (anyFlags) {
    strcat(newText, ". ");
		//strcat(buf, "\n\n");
		// j = strlen(buf);
		for (i=0; i < strlen(newText); i++) {
			if (newText.text[i] == '&') {
				if (!--commaCount) {
					// buf[j] = '\0';
          strcat(buf, " and");
					// j += 4;
				} else {
          strcat(buf, ",");
				}
			} else {
        strcat(buf, newText.text[i]);
			}
		}
		// buf[j] = '\0';
	}
	resolvePronounEscapes(buf, monst);
}
