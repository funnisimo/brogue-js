/*
 *  Grid
 *  Brogue
 *
 *  Created by Brian Walker on 12/7/12.
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


const GRID_CACHE = [];




// mallocing two-dimensional arrays! dun dun DUN!
function allocGrid() {

	if (GRID_CACHE.length) return GRID_CACHE.pop();

	// return GRID(DCOLS, DROWS, () => 0);

	let grid = [];
	for( let i = 0; i < DCOLS; ++i) {
		grid[i] = new Array(DROWS).fill(0); // new Uint16Array(DROWS);	// 16 b/c we assign Unicode chars and value of 30000
	}
	return grid;

}

function freeGrid(grid) {
	GRID_CACHE.push(grid);
}

function copyGrid(to, from) {
	let i, j;

	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
			to[i][j] = from[i][j];
		}
	}
}

function fillGrid(grid, fillValue) {
	let i, j;

	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
			grid[i][j] = fillValue;
		}
	}
}


function dumpGrid(grid) {
	let i, j;

	for(j = 0; j < DROWS; j++) {
		let line = '';
		for(i = 0; i < DCOLS; i++) {
			const v = grid[i][j];
			if (v === false) {
				line += ' ';
			}
			else if (v === true) {
				line += 'T';
			}
			else if (v < 10) {
				line += '' + v;
			}
			else if (v < 36) {
				line += String.fromCharCode( 'a'.charCodeAt(0) + v - 10);
			}
			else if (v < 62) {
				line += String.fromCharCode( 'A'.charCodeAt(0) + v - 10 - 26);
			}
			else {
				line += '#';
			}
		}
		console.log(line);
	}
}

// Highlight the portion indicated by hiliteCharGrid with the hiliteColor at the hiliteStrength -- both latter arguments are optional.
function hiliteGrid(grid, /* color */ hiliteColor, hiliteStrength) {
	let i, j, x, y;
	let hCol;	// color

	// assureCosmeticRNG();

	if (hiliteColor) {
		hCol = hiliteColor.clone();
	} else {
		hCol = yellow.clone();
	}

	bakeColor(hCol);

	if (!hiliteStrength) {
		hiliteStrength = 75;
	}

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (grid[i][j]) {
				x = mapToWindowX(i);
				y = mapToWindowY(j);

				displayBuffer[x][y].needsUpdate = true;
				displayBuffer[x][y].backColorComponents[0] = clamp(displayBuffer[x][y].backColorComponents[0] + hCol.red * hiliteStrength / 100, 0, 100);
				displayBuffer[x][y].backColorComponents[1] = clamp(displayBuffer[x][y].backColorComponents[1] + hCol.green * hiliteStrength / 100, 0, 100);
				displayBuffer[x][y].backColorComponents[2] = clamp(displayBuffer[x][y].backColorComponents[2] + hCol.blue * hiliteStrength / 100, 0, 100);
				displayBuffer[x][y].foreColorComponents[0] = clamp(displayBuffer[x][y].foreColorComponents[0] + hCol.red * hiliteStrength / 100, 0, 100);
				displayBuffer[x][y].foreColorComponents[1] = clamp(displayBuffer[x][y].foreColorComponents[1] + hCol.green * hiliteStrength / 100, 0, 100);
				displayBuffer[x][y].foreColorComponents[2] = clamp(displayBuffer[x][y].foreColorComponents[2] + hCol.blue * hiliteStrength / 100, 0, 100);
			}
		}
	}
	// restoreRNG();
}

function findReplaceGrid(grid, findValueMin, findValueMax, fillValue) {
	let i, j;

	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (grid[i][j] >= findValueMin && grid[i][j] <= findValueMax) {
                grid[i][j] = fillValue;
            }
		}
	}
}

// Flood-fills the grid from (x, y) along cells that are within the eligible range.
// Returns the total count of filled cells.
function floodFillGrid(grid, x, y, eligibleValueMin, eligibleValueMax, fillValue) {
  let dir;
	let newX, newY, fillCount = 1;

  brogueAssert(fillValue < eligibleValueMin || fillValue > eligibleValueMax);

  grid[x][y] = fillValue;
  for (dir = 0; dir < 4; dir++) {
      newX = x + nbDirs[dir][0];
      newY = y + nbDirs[dir][1];
      if (coordinatesAreInMap(newX, newY)
          && grid[newX][newY] >= eligibleValueMin
          && grid[newX][newY] <= eligibleValueMax)
			{
          fillCount += floodFillGrid(grid, newX, newY, eligibleValueMin, eligibleValueMax, fillValue);
      }
  }
  return fillCount;
}

function drawRectangleOnGrid(grid, x, y, width, height, value) {
    let i, j;

    for (i=x; i < x+width; i++) {
        for (j=y; j<y+height; j++) {
            grid[i][j] = value;
        }
    }
}


function drawCircleOnGrid(grid, x, y, radius, value) {
    let i, j;

    for (i=max(0, x - radius - 1); i < max(DCOLS, x + radius); i++) {
        for (j=max(0, y - radius - 1); j < max(DROWS, y + radius); j++) {
            if ((i-x)*(i-x) + (j-y)*(j-y) < radius * radius + radius) {
                grid[i][j] = value;
            }
        }
    }
}

function intersectGrids(onto, from) {
  let i, j;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (onto[i][j] && from[i][j]) {
                onto[i][j] = true;
            } else {
                onto[i][j] = false;
            }
        }
    }
}

function uniteGrids(onto, from) {
  let i, j;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (!onto[i][j] && from[i][j]) {
                onto[i][j] = from[i][j];
            }
        }
    }
}

function invertGrid(grid) {
  let i, j;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            grid[i][j] = !grid[i][j];
        }
    }
}

// Fills grid locations with the given value if they match any terrain flags or map flags.
// Otherwise does not change the grid location.
function getTerrainGrid(grid, value, terrainFlags, mapFlags) {
  let i, j;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (grid[i][j] != value && cellHasTerrainFlag(i, j, terrainFlags) || (pmap[i][j].flags & mapFlags)) {
                grid[i][j] = value;
            }
        }
    }
}

function getTMGrid(grid, value, TMflags) {
  let i, j;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (grid[i][j] != value && cellHasTMFlag(i, j, TMflags)) {
                grid[i][j] = value;
            }
        }
    }
}

function getPassableArcGrid(grid, minPassableArc, maxPassableArc, value) {
  let i, j, count;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (grid[i][j] != value) {
                count = passableArcCount(i, j);
                if (count >= minPassableArc && count <= maxPassableArc) {
                    grid[i][j] = value;
                }
            }
        }
    }
}

function validLocationCount(grid, validValue) {
  let i, j, count;
  count = 0;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (grid[i][j] == validValue) {
                count++;
            }
        }
    }
    return count;
}

function leastPositiveValueInGrid(grid) {
  let i, j, leastPositiveValue = 0;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (grid[i][j] > 0 && (leastPositiveValue == 0 || grid[i][j] < leastPositiveValue)) {
                leastPositiveValue = grid[i][j];
            }
        }
    }
    return leastPositiveValue;
}

// Takes a grid as a mask of valid locations, chooses one randomly and returns it as (x, y).
// If there are no valid locations, returns (-1, -1).
function randomLocationInGrid(grid, validValue) {
  const locationCount = validLocationCount(grid, validValue);
  let i, j;

  if (locationCount <= 0) {
      return [-1, -1];
  }
  let index = rand_range(0, locationCount - 1);
	for(i = 0; i < DCOLS && index >= 0; i++) {
		for(j = 0; j < DROWS && index >= 0; j++) {
            if (grid[i][j] == validValue) {
                if (index == 0) {
                    return [i, j];
                }
                index--;
            }
        }
    }
    return [-1,-1];
}

// Finds the lowest positive number in a grid, chooses one location with that number randomly and returns it as (x, y).
// If there are no valid locations, returns (-1, -1).
function randomLeastPositiveLocationInGrid(grid, deterministic) {
  const targetValue = leastPositiveValueInGrid(grid);
  let locationCount;
  let i, j, index;

  if (targetValue == 0) {
		return [-1,-1];
  }

  locationCount = 0;
	for(i = 0; i < DCOLS; i++) {
		for(j = 0; j < DROWS; j++) {
            if (grid[i][j] == targetValue) {
                locationCount++;
            }
        }
    }

    if (deterministic) {
        index = Math.floor(locationCount / 2);
    } else {
        index = rand_range(0, locationCount - 1);
    }

	for(i = 0; i < DCOLS && index >= 0; i++) {
		for(j = 0; j < DROWS && index >= 0; j++) {
            if (grid[i][j] == targetValue) {
                if (index == 0) {
									return [i,j];
                }
                index--;
            }
        }
    }
		return [-1,-1];
}

function getQualifyingPathLocNear(/* short *retValX, short *retValY, */
                                 x, y,
                                 hallwaysAllowed,
                                 blockingTerrainFlags,
                                 blockingMapFlags,
                                 forbiddenTerrainFlags,
                                 forbiddenMapFlags,
                                 deterministic)
{
    let grid, costMap;
    let loc;

    // First check the given location to see if it works, as an optimization.
    if (!cellHasTerrainFlag(x, y, blockingTerrainFlags | forbiddenTerrainFlags)
        && !(pmap[x][y].flags & (blockingMapFlags | forbiddenMapFlags))
        && (hallwaysAllowed || passableArcCount(x, y) <= 1))
		{
			return [ x, y ];
    }

    // Allocate the grids.
    grid = allocGrid();
    costMap = allocGrid();

    // Start with a base of a high number everywhere.
    fillGrid(grid, 30000);
    fillGrid(costMap, 1);

    // Block off the pathing blockers.
    getTerrainGrid(costMap, PDS_FORBIDDEN, blockingTerrainFlags, blockingMapFlags);
    if (blockingTerrainFlags & (T_OBSTRUCTS_DIAGONAL_MOVEMENT | T_OBSTRUCTS_PASSABILITY)) {
        getTerrainGrid(costMap, PDS_OBSTRUCTION, T_OBSTRUCTS_DIAGONAL_MOVEMENT, 0);
    }

    // Run the distance scan.
    grid[x][y] = 1;
    costMap[x][y] = 1;
    dijkstraScan(grid, costMap, true);
    findReplaceGrid(grid, 30000, 30000, 0);

    // Block off invalid targets that aren't pathing blockers.
    getTerrainGrid(grid, 0, forbiddenTerrainFlags, forbiddenMapFlags);
    if (!hallwaysAllowed) {
        getPassableArcGrid(grid, 2, 10, 0);
    }

    // Get the solution.
    loc = randomLeastPositiveLocationInGrid(grid, deterministic);

//    dumpLevelToScreen();
//    displayGrid(grid);
//    if (coordinatesAreInMap(*retValX, *retValY)) {
//        hiliteCell(*retValX, *retValY, &yellow, 100, true);
//    }
//    temporaryMessage("Qualifying path selected:", true);

    freeGrid(grid);
    freeGrid(costMap);

    // Fall back to a pathing-agnostic alternative if there are no solutions.
    if (loc[0] == -1 && loc[1] == -1) {
				// look for secondary solution
        return getQualifyingLocNear(x, y, hallwaysAllowed, NULL,
                                 (blockingTerrainFlags | forbiddenTerrainFlags),
                                 (blockingMapFlags | forbiddenMapFlags),
                                 false, deterministic);
    } else {
        return loc; // Found a primary solution.
    }
}

function cellularAutomataRound(grid, birthParameters /* char[9] */, survivalParameters /* char[9] */) {
    let i, j, nbCount, newX, newY;
    let dir;
    let buffer2;

    buffer2 = allocGrid();
    copyGrid(buffer2, grid); // Make a backup of grid in buffer2, so that each generation is isolated.

    for(i=0; i<DCOLS; i++) {
        for(j=0; j<DROWS; j++) {
            nbCount = 0;
            for (dir=0; dir< DIRECTION_COUNT; dir++) {
                newX = i + nbDirs[dir][0];
                newY = j + nbDirs[dir][1];
                if (coordinatesAreInMap(newX, newY)
                    && buffer2[newX][newY])
								{
                    nbCount++;
                }
            }
            if (!buffer2[i][j] && birthParameters[nbCount] == 't') {
                grid[i][j] = 1;	// birth
            } else if (buffer2[i][j] && survivalParameters[nbCount] == 't') {
                // survival
            } else {
                grid[i][j] = 0;	// death
            }
        }
    }

    freeGrid(buffer2);
}

// Marks a cell as being a member of blobNumber, then recursively iterates through the rest of the blob
function fillContiguousRegion(grid, x, y, fillValue) {
  let dir;
	let newX, newY, numberOfCells = 1;

	grid[x][y] = fillValue;

	// Iterate through the four cardinal neighbors.
	for (dir=0; dir<4; dir++) {
		newX = x + nbDirs[dir][0];
		newY = y + nbDirs[dir][1];
		if (!coordinatesAreInMap(newX, newY)) {
			break;
		}
		if (grid[newX][newY] == 1) { // If the neighbor is an unmarked region cell,
			numberOfCells += fillContiguousRegion(grid, newX, newY, fillValue); // then recurse.
		}
	}
	return numberOfCells;
}

// Loads up **grid with the results of a cellular automata simulation.
function createBlobOnGrid(grid,
                      /* short *retMinX, short *retMinY, short *retWidth, short *retHeight, */
                      roundCount,
                      minBlobWidth, minBlobHeight,
					  maxBlobWidth, maxBlobHeight, percentSeeded,
					  birthParameters /* char[9] */, survivalParameters /* char[9] */)
{
	let i, j, k;
	let blobNumber, blobSize, topBlobNumber, topBlobSize;

  let topBlobMinX, topBlobMinY, topBlobMaxX, topBlobMaxY, blobWidth, blobHeight;
	//short buffer2[maxBlobWidth][maxBlobHeight]; // buffer[][] is already a global short array
	let foundACellThisLine;

	// Generate blobs until they satisfy the minBlobWidth and minBlobHeight restraints
	do {
		// Clear buffer.
    fillGrid(grid, 0);

		// Fill relevant portion with noise based on the percentSeeded argument.
		for(i=0; i<maxBlobWidth; i++) {
			for(j=0; j<maxBlobHeight; j++) {
				grid[i][j] = (rand_percent(percentSeeded) ? 1 : 0);
			}
		}

//        colorOverDungeon(&darkGray);
//        hiliteGrid(grid, &white, 100);
//        temporaryMessage("Random starting noise:", true);

		// Some iterations of cellular automata
		for (k=0; k<roundCount; k++) {
			cellularAutomataRound(grid, birthParameters, survivalParameters);

//            colorOverDungeon(&darkGray);
//            hiliteGrid(grid, &white, 100);
//            temporaryMessage("Cellular automata progress:", true);
		}

//        colorOverDungeon(&darkGray);
//        hiliteGrid(grid, &white, 100);
//        temporaryMessage("Cellular automata result:", true);

		// Now to measure the result. These are best-of variables; start them out at worst-case values.
		topBlobSize =   0;
		topBlobNumber = 0;
		topBlobMinX =   maxBlobWidth;
		topBlobMaxX =   0;
		topBlobMinY =   maxBlobHeight;
		topBlobMaxY =   0;

		// Fill each blob with its own number, starting with 2 (since 1 means floor), and keeping track of the biggest:
		blobNumber = 2;

		for(i=0; i<DCOLS; i++) {
			for(j=0; j<DROWS; j++) {
				if (grid[i][j] == 1) { // an unmarked blob
					// Mark all the cells and returns the total size:
					blobSize = fillContiguousRegion(grid, i, j, blobNumber);
					if (blobSize > topBlobSize) { // if this blob is a new record
						topBlobSize = blobSize;
						topBlobNumber = blobNumber;
					}
					blobNumber++;
				}
			}
		}

		// Figure out the top blob's height and width:
		// First find the max & min x:
		for(i=0; i<DCOLS; i++) {
			foundACellThisLine = false;
			for(j=0; j<DROWS; j++) {
				if (grid[i][j] == topBlobNumber) {
					foundACellThisLine = true;
					break;
				}
			}
			if (foundACellThisLine) {
				if (i < topBlobMinX) {
					topBlobMinX = i;
				}
				if (i > topBlobMaxX) {
					topBlobMaxX = i;
				}
			}
		}

		// Then the max & min y:
		for(j=0; j<DROWS; j++) {
			foundACellThisLine = false;
			for(i=0; i<DCOLS; i++) {
				if (grid[i][j] == topBlobNumber) {
					foundACellThisLine = true;
					break;
				}
			}
			if (foundACellThisLine) {
				if (j < topBlobMinY) {
					topBlobMinY = j;
				}
				if (j > topBlobMaxY) {
					topBlobMaxY = j;
				}
			}
		}

		blobWidth =		(topBlobMaxX - topBlobMinX) + 1;
		blobHeight =	(topBlobMaxY - topBlobMinY) + 1;

	} while (blobWidth < minBlobWidth
             || blobHeight < minBlobHeight
             || topBlobNumber == 0);

	// Replace the winning blob with 1's, and everything else with 0's:
    for(i=0; i<DCOLS; i++) {
        for(j=0; j<DROWS; j++) {
			if (grid[i][j] == topBlobNumber) {
				grid[i][j] = 1;
			} else {
				grid[i][j] = 0;
			}
		}
	}

    // Populate the returned variables.
	return { x: topBlobMinX, y: topBlobMinY, width: blobWidth, height: blobHeight };
}
