/*
 *  Light.c
 *  Brogue
 *
 *  Created by Brian Walker on 1/21/09.
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

// void logLights() {
//
// 	short i, j;
//
// 	printf("    ");
// 	for (i=0; i<COLS-2; i++) {
// 		printf("%i", i % 10);
// 	}
// 	printf("\n");
// 	for( j=0; j<DROWS-2; j++ ) {
// 		if (j < 10) {
// 			printf(" ");
// 		}
// 		printf("%i: ", j);
// 		for( i=0; i<DCOLS-2; i++ ) {
// 			if (tmap[i][j].light[0] == 0) {
// 				printf(" ");
// 			} else {
// 				printf("%i", max(0, tmap[i][j].light[0] / 10 - 1));
// 			}
// 		}
// 		printf("\n");
// 	}
// 	printf("\n");
// }

// Returns true if any part of the light hit cells that are in the player's field of view.
function paintLight( /* lightSource */theLight, x, y, isMinersLight, maintainShadows) {
	let i, j, k;
	let colorComponents = [0,0,0], randComponent, lightMultiplier;
	let fadeToPercent, radiusRounded;
	let radius;
	let grid = GRID(DCOLS, DROWS); // char[DCOLS][DROWS];
	let dispelShadows, overlappedFieldOfView;

  brogueAssert(rogue.RNG == RNG_SUBSTANTIVE);

	radius = Math.floor((randClump(theLight.lightRadius) << FP_BASE) / 100);
	radiusRounded = Math.floor(radius >> FP_BASE);

	randComponent = rand_range(0, theLight.lightColor.rand);
	colorComponents[0] = randComponent + theLight.lightColor.red + rand_range(0, theLight.lightColor.redRand);
	colorComponents[1] = randComponent + theLight.lightColor.green + rand_range(0, theLight.lightColor.greenRand);
	colorComponents[2] = randComponent + theLight.lightColor.blue + rand_range(0, theLight.lightColor.blueRand);

	// the miner's light does not dispel IS_IN_SHADOW,
	// so the player can be in shadow despite casting his own light.
	dispelShadows = !maintainShadows && (colorComponents[0] + colorComponents[1] + colorComponents[2]) > 0;

	fadeToPercent = theLight.radialFadeToPercent;

	// zero out only the relevant rectangle of the grid
	for (i = max(0, x - radiusRounded); i < DCOLS && i < x + radiusRounded; i++) {
		for (j = max(0, y - radiusRounded); j < DROWS && j < y + radiusRounded; j++) {
			grid[i][j] = 0;
		}
	}

	getFOVMask(grid, x, y, radius, T_OBSTRUCTS_VISION, (theLight.passThroughCreatures ? 0 : (HAS_MONSTER | HAS_PLAYER)), (!isMinersLight));

  overlappedFieldOfView = false;

	for (i = max(0, x - radiusRounded); i < DCOLS && i < x + radiusRounded; i++) {
		for (j = max(0, y - radiusRounded); j < DROWS && j < y + radiusRounded; j++) {
			if (grid[i][j]) {
				lightMultiplier = Math.floor(100 - (100 - fadeToPercent) * (fp_sqrt( ((i-x) * (i-x) + (j-y) * (j-y)) << FP_BASE) / radius));
				for (k=0; k<3; k++) {
					tmap[i][j].light[k] += Math.floor(colorComponents[k] * lightMultiplier / 100);
				}
				if (dispelShadows) {
					pmap[i][j].flags &= ~IS_IN_SHADOW;
				}
        if (pmap[i][j].flags & (IN_FIELD_OF_VIEW | ANY_KIND_OF_VISIBLE)) {
            overlappedFieldOfView = true;
        }
			}
		}
	}

	tmap[x][y].light[0] += colorComponents[0];
	tmap[x][y].light[1] += colorComponents[1];
	tmap[x][y].light[2] += colorComponents[2];

	if (dispelShadows) {
		pmap[x][y].flags &= ~IS_IN_SHADOW;
	}

  return overlappedFieldOfView;
}


// sets miner's light strength and characteristics based on rings of illumination, scrolls of darkness and water submersion
function updateMinersLightRadius() {
	let base_fraction, fraction, lightRadius;

	lightRadius = 100 * rogue.minersLightRadius;

	if (rogue.lightMultiplier < 0) {
		lightRadius = lightRadius / (-1 * rogue.lightMultiplier + 1);
	} else {
		lightRadius *= (rogue.lightMultiplier);
		lightRadius = max(lightRadius, (rogue.lightMultiplier * 2 + 2) << FP_BASE);
	}

	if (player.status[STATUS_DARKNESS]) {
        base_fraction = FP_FACTOR - (player.status[STATUS_DARKNESS] << FP_BASE) / player.maxStatus[STATUS_DARKNESS];
        fraction = (base_fraction * base_fraction >> FP_BASE) * base_fraction >> FP_BASE;
        //fraction = (double) pow(1.0 - (((double) player.status[STATUS_DARKNESS]) / player.maxStatus[STATUS_DARKNESS]), 3);
		if (fraction < FP_FACTOR / 20) {
			fraction = FP_FACTOR / 20;
    }
    lightRadius = lightRadius * fraction >> FP_BASE;
  } else {
      fraction = FP_FACTOR;
  }

	if (lightRadius < 2 << FP_BASE) {
		lightRadius = 2 << FP_BASE;
	}

	if (rogue.inWater && lightRadius > 3 << FP_BASE) {
		lightRadius = max(lightRadius / 2, 3 << FP_BASE);
	}

	rogue.minersLight.radialFadeToPercent = 35 + max(0, min(65, rogue.lightMultiplier * 5)) * fraction >> FP_BASE;
	rogue.minersLight.lightRadius.upperBound = rogue.minersLight.lightRadius.lowerBound = clamp(lightRadius >> FP_BASE, -30000, 30000);
}


function updateDisplayDetail() {
	let i, j;

	for (i = 0; i < DCOLS; i++) {
		for (j = 0; j < DROWS; j++) {
			if (tmap[i][j].light[0] < -10
				&& tmap[i][j].light[1] < -10
				&& tmap[i][j].light[2] < -10) {

				displayDetail[i][j] = DV_DARK;
			} else if (pmap[i][j].flags & IS_IN_SHADOW) {
				displayDetail[i][j] = DV_UNLIT;
			} else {
				displayDetail[i][j] = DV_LIT;
			}
		}
	}
}

function backUpLighting( lights /* short[DCOLS][DROWS][3] */ ) {
	let i, j, k;
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			for (k=0; k<3; k++) {
				lights[i][j][k] = tmap[i][j].light[k];
			}
		}
	}
}

function restoreLighting( lights /* short[DCOLS][DROWS][3] */) {
	let i, j, k;
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			for (k=0; k<3; k++) {
				tmap[i][j].light[k] = lights[i][j][k];
			}
		}
	}
}

function recordOldLights() {
    let i, j, k;
    for (i = 0; i < DCOLS; i++) {
		for (j = 0; j < DROWS; j++) {
			for (k=0; k<3; k++) {
				tmap[i][j].oldLight[k] = tmap[i][j].light[k];
			}
		}
	}
}

function updateLighting() {
	let i, j, k;
	let layer;		// enum dungeonLayers
	let tile;			// enum tileType
	let monst;		// creature *

	// Copy Light over oldLight
  recordOldLights();

    // and then zero out Light.
	for (i = 0; i < DCOLS; i++) {
		for (j = 0; j < DROWS; j++) {
			for (k=0; k<3; k++) {
				tmap[i][j].light[k] = 0;
			}
			pmap[i][j].flags |= IS_IN_SHADOW;
		}
	}

	// Paint all glowing tiles.
	for (i = 0; i < DCOLS; i++) {
		for (j = 0; j < DROWS; j++) {
			for (layer = 0; layer < NUMBER_TERRAIN_LAYERS; layer++) {
				tile = pmap[i][j].layers[layer];
				if (tileCatalog[tile].glowLight) {
					paintLight(lightCatalog[tileCatalog[tile].glowLight], i, j, false, false);
				}
			}
		}
	}

	// Cycle through monsters and paint their lights:
	CYCLE_MONSTERS_AND_PLAYERS( (monst) => {
		if (monst.info.intrinsicLightType) {
			paintLight(lightCatalog[monst.info.intrinsicLightType], monst.xLoc, monst.yLoc, false, false);
		}
    if (monst.mutationIndex >= 0 && mutationCatalog[monst.mutationIndex].light != NO_LIGHT) {
        paintLight(lightCatalog[mutationCatalog[monst.mutationIndex].light], monst.xLoc, monst.yLoc, false, false);
    }
		if (monst.status[STATUS_BURNING] && !(monst.info.flags & MONST_FIERY)) {
			paintLight(lightCatalog[BURNING_CREATURE_LIGHT], monst.xLoc, monst.yLoc, false, false);
		}
		if (monsterRevealed(monst)) {
			paintLight(lightCatalog[TELEPATHY_LIGHT], monst.xLoc, monst.yLoc, false, true);
		}
	});

	// Also paint telepathy lights for dormant monsters.
  for (monst = dormantMonsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
      if (monsterRevealed(monst)) {
          paintLight(lightCatalog[TELEPATHY_LIGHT], monst.xLoc, monst.yLoc, false, true);
      }
  }

	updateDisplayDetail();

	// Miner's light:
	paintLight(rogue.minersLight, player.xLoc, player.yLoc, true, true);

  if (player.status[STATUS_INVISIBLE]) {
      player.info.foreColor = playerInvisibleColor;
	} else if (playerInDarkness()) {
		player.info.foreColor = playerInDarknessColor;
	} else if (pmap[player.xLoc][player.yLoc].flags & IS_IN_SHADOW) {
		player.info.foreColor = playerInShadowColor;
	} else {
		player.info.foreColor = playerInLightColor;
	}
}


function playerInDarkness() {
	return (tmap[player.xLoc][player.yLoc].light[0] + 10 < minersLightColor.red
			&& tmap[player.xLoc][player.yLoc].light[1] + 10 < minersLightColor.green
			&& tmap[player.xLoc][player.yLoc].light[2] + 10 < minersLightColor.blue);
}

const flarePrecision = 1000;


function newFlare( /* lightSource */ light, x, y, changePerFrame, limit) {
    const theFlare = flare(); // malloc(sizeof(flare));
	// memset(theFlare, '\0', sizeof(flare));
    theFlare.light = light;
    theFlare.xLoc = x;
    theFlare.yLoc = y;
    theFlare.coeffChangeAmount = changePerFrame;
    if (theFlare.coeffChangeAmount == 0) {
        theFlare.coeffChangeAmount = 1; // no change would mean it lasts forever, which usually breaks things
    }
    theFlare.coeffLimit = limit;
    theFlare.coeff = 100 * flarePrecision;
    theFlare.turnNumber = rogue.absoluteTurnNumber;
    return theFlare;
}

// Creates a new fading flare as described and sticks it into the stack so it will fire at the end of the turn.
function createFlare(x, y, /* lightType */ lightIndex) {
    let theFlare;	// flare *

    theFlare = newFlare(lightCatalog[lightIndex], x, y, -15, 0);

    // if (rogue.flareCount >= rogue.flareCapacity) {
    //     rogue.flareCapacity += 10;
    //     rogue.flares = realloc(rogue.flares, sizeof(flare *) * rogue.flareCapacity);
    // }
    rogue.flares[rogue.flareCount] = theFlare;
    rogue.flareCount++;
}

function flareIsActive( /* flare */ theFlare) {
    const increasing = (theFlare.coeffChangeAmount > 0);
    let active = true;

    if (theFlare.turnNumber > 0 && theFlare.turnNumber < rogue.absoluteTurnNumber - 1) {
        active = false;
    }
    if (increasing) {
        if ( Math.floor(theFlare.coeff / flarePrecision) > theFlare.coeffLimit) {
            active = false;
        }
    } else {
        if ( Math.floor(theFlare.coeff / flarePrecision) < theFlare.coeffLimit) {
            active = false;
        }
    }
    return active;
}

// Returns true if the flare is still active; false if it's not.
function updateFlare( /* flare */ theFlare) {
    if (!flareIsActive(theFlare)) {
        return false;
    }
    theFlare.coeff += (theFlare.coeffChangeAmount) * flarePrecision / 10;
    theFlare.coeffChangeAmount = theFlare.coeffChangeAmount * 12 / 10;
    return flareIsActive(theFlare);
}

// Returns whether it overlaps with the field of view.
function drawFlareFrame( /* flare */ theFlare) {
    let inView;
    const tempLight = lightSource(theFlare.light);
    const tempColor = color(tempLight.lightColor);

    if (!flareIsActive(theFlare)) {
        return false;
    }
    tempLight.lightRadius.lowerBound = Math.floor( tempLight.lightRadius.lowerBound) * theFlare.coeff / (flarePrecision * 100);
    tempLight.lightRadius.upperBound = Math.floor( tempLight.lightRadius.upperBound) * theFlare.coeff / (flarePrecision * 100);
    applyColorScalar(tempColor, theFlare.coeff / flarePrecision);
    tempLight.lightColor = tempColor;
    inView = paintLight(tempLight, theFlare.xLoc, theFlare.yLoc, false, true);

    return inView;
}

// Frees the flares as they expire.
async function animateFlares( /* flare** */ flares, count) {
	const lights = GRID(DCOLS, DROWS, () => [0, 0, 0] ); 	// short[DCOLS][DROWS][3];
	let inView, fastForward, atLeastOneFlareStillActive;
	let i; // i iterates through the flare list

	brogueAssert(rogue.RNG == RNG_SUBSTANTIVE);

	backUpLighting(lights);
	fastForward = rogue.trueColorMode || rogue.playbackFastForward;

	do {
			inView = false;
			atLeastOneFlareStillActive = false;
			for (i = 0; i < count; i++) {
					if (flares[i]) {
							if (updateFlare(flares[i])) {
									atLeastOneFlareStillActive = true;
									if (drawFlareFrame(flares[i])) {
											inView = true;
									}
							} else {
									// free(flares[i]);
									flares[i] = NULL;
							}
					}
			}
			demoteVisibility();
			updateFieldOfViewDisplay(false, true);
			if (!fastForward && (inView || rogue.playbackOmniscience) && atLeastOneFlareStillActive) {
					fastForward = await pauseBrogue(10);
			}
			recordOldLights();
			restoreLighting(lights);
	} while (atLeastOneFlareStillActive);
	updateFieldOfViewDisplay(false, true);

}

function deleteAllFlares() {
    let i;
    for (i=0; i<rogue.flareCount; i++) {
        const flare = rogue.flares[i];
        flare.light = null;
        rogue.flares[i] = null;
    }
    rogue.flareCount = 0;
}
