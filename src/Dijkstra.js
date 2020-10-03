/*
 *  Dijkstra.c
 *  Brogue
 *
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

// This code was created by Joshua Day, to replace my clunkier and slower Dijkstra scanning algorithm in Movement.c.
// Thanks very much, Joshua.

// #include "Rogue.h"
// #include "IncludeGlobals.h"

function pdsLink(i) {
	return {
		distance: 0,
		cost: 0,
		index: i,
		left: null, right: null
	};
}

function pdsMap() {
	return {
		eightWays: false,
		front: pdsLink(-1),
		links: ARRAY(DCOLS * DROWS, (i) => pdsLink(i) )
	};
}


function pdsUpdate(map) {
	let dir, dirs;
	let linkIndex;
	let left = NULL, right = NULL, link = NULL;

	dirs = map.eightWays ? 8 : 4;

	head = map.front.right;
	map.front.right = NULL;

	while (head != NULL) {
		for (dir = 0; dir < dirs; dir++) {
			linkIndex = head.index + (nbDirs[dir][0] + DCOLS * nbDirs[dir][1]);
			if (linkIndex < 0 || linkIndex >= DCOLS * DROWS) continue;
			link = map.links[linkIndex];

			// verify passability
			if (link.cost < 0) continue;
			if (dir >= 4) {
				let way1, way1index, way2, way2index;
				way1index = head.index + nbDirs[dir][0];
				if (way1index < 0 || way1index >= DCOLS * DROWS) continue;

				way2index = head.index + DCOLS * nbDirs[dir][1];
				if (way2index < 0 || way2index >= DCOLS * DROWS) continue;

				way1 = map.links[way1index];
				way2 = map.links[way2index];

				if (way1.cost == PDS_OBSTRUCTION || way2.cost == PDS_OBSTRUCTION) continue;
			}

			if (head.distance + link.cost < link.distance) {
				link.distance = head.distance + link.cost;

				// reinsert the touched cell; it'll be close to the beginning of the list now, so
				// this will be very fast.  start by removing it.

				if (link.right != NULL) link.right.left = link.left;
				if (link.left != NULL) link.left.right = link.right;

				left = head;
				right = head.right;
				while (right != NULL && right.distance < link.distance) {
					left = right;
					right = right.right;
				}
				if (left != NULL) left.right = link;
				link.right = right;
				link.left = left;
				if (right != NULL) right.left = link;
			}
		}

		right = head.right;

		head.left = NULL;
		head.right = NULL;

		head = right;
	}
}

function pdsClear(map, maxDistance, eightWays) {
	let i;

	map.eightWays = eightWays;

	map.front.right = NULL;

	for (i=0; i < DCOLS*DROWS; i++) {
		map.links[i].distance = maxDistance;
		map.links[i].left = map.links[i].right = NULL;
	}
}

function pdsGetDistance(map, x, y) {
	pdsUpdate(map);
	return PDS_CELL(map, x, y).distance;
}

function pdsSetDistance(map, x, y, distance) {
	let left, right, link;

	if (x > 0 && y > 0 && x < DCOLS - 1 && y < DROWS - 1) {
		link = PDS_CELL(map, x, y);
		if (link.distance > distance) {
			link.distance = distance;

			if (link.right != NULL) link.right.left = link.left;
			if (link.left != NULL) link.left.right = link.right;

			left = map.front;
			right = map.front.right;

			while (right != NULL && right.distance < link.distance) {
				left = right;
				right = right.right;
			}

			link.right = right;
			link.left = left;
			left.right = link;
			if (right != NULL) right.left = link;
		}
	}
}

function pdsSetCosts(map, costMap) {
	let i, j;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (i != 0 && j != 0 && i < DCOLS - 1 && j < DROWS - 1) {
				PDS_CELL(map, i, j).cost = costMap[i][j];
			} else {
				PDS_CELL(map, i, j).cost = PDS_FORBIDDEN;
			}
		}
	}
}

function pdsBatchInput(map, distanceMap, costMap, maxDistance, eightWays) {
	let i, j;
	let left, right;

	map.eightWays = eightWays;

	left = NULL;
	right = NULL;

	map.front.right = NULL;
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			let link = PDS_CELL(map, i, j);

			if (distanceMap != NULL) {
				link.distance = distanceMap[i][j];
			} else {
				if (costMap != NULL) {
					// totally hackish; refactor
					link.distance = maxDistance;
				}
			}

			let cost;

			if (i == 0 || j == 0 || i == DCOLS - 1 || j == DROWS - 1) {
				cost = PDS_OBSTRUCTION;
			} else if (costMap === NULL) {
				if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY) && cellHasTerrainFlag(i, j, T_OBSTRUCTS_DIAGONAL_MOVEMENT)) {
					cost = PDS_OBSTRUCTION;
				}
				else {
					cost = PDS_FORBIDDEN;
				}
			} else {
				cost = costMap[i][j];
			}

			link.cost = cost;

			if (cost > 0) {
				if (link.distance < maxDistance) {
					if (right == NULL || right.distance > link.distance) {
						// left and right are used to traverse the list; if many cells have similar values,
						// some time can be saved by not clearing them with each insertion.  this time,
						// sadly, we have to start from the front.

						left = map.front;
						right = map.front.right;
					}

					while (right != NULL && right.distance < link.distance) {
						left = right;
						right = right.right;
					}

					link.right = right;
					link.left = left;
					left.right = link;
					if (right != NULL) right.left = link;

					left = link;
				} else {
					link.right = NULL;
					link.left = NULL;
				}
			} else {
				link.right = NULL;
				link.left = NULL;
			}
		}
	}
}

function pdsBatchOutput(map, distanceMap) {
	let i, j;

	pdsUpdate(map);
	// transfer results to the distanceMap
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			distanceMap[i][j] = PDS_CELL(map, i, j).distance;
		}
	}
}

function pdsInvalidate(map, maxDistance) {
	pdsBatchInput(map, NULL, NULL, maxDistance, map.eightWays);
}

const DIJKSTRA_MAP = pdsMap();

function dijkstraScan(distanceMap, costMap, useDiagonals) {
	// static pdsMap map;

	pdsBatchInput(DIJKSTRA_MAP, distanceMap, costMap, 30000, useDiagonals);
	pdsBatchOutput(DIJKSTRA_MAP, distanceMap);
}

function calculateDistances(distanceMap,
						destinationX, destinationY,
						blockingTerrainFlags,
						traveler,
						canUseSecretDoors,
						eightWays)
{
	let monst;
  // static pdsMap map;

	let i, j;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			let cost;
      monst = monsterAtLoc(i, j);
      if (monst
          && (monst.info.flags & (MONST_IMMUNE_TO_WEAPONS | MONST_INVULNERABLE))
          && (monst.info.flags & (MONST_IMMOBILE | MONST_GETS_TURN_ON_ACTIVATION)))
			{
          // Always avoid damage-immune stationary monsters.
        cost = PDS_FORBIDDEN;
      } else if (canUseSecretDoors
          && cellHasTMFlag(i, j, TM_IS_SECRET)
          && cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)
          && !(discoveredTerrainFlagsAtLoc(i, j) & T_OBSTRUCTS_PASSABILITY))
			{
				cost = 1;
			} else if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY)
					   || (traveler && traveler === player && !(pmap[i][j].flags & (DISCOVERED | MAGIC_MAPPED))))
			{
				cost = cellHasTerrainFlag(i, j, T_OBSTRUCTS_DIAGONAL_MOVEMENT) ? PDS_OBSTRUCTION : PDS_FORBIDDEN;
			} else if ((traveler && monsterAvoids(traveler, i, j)) || cellHasTerrainFlag(i, j, blockingTerrainFlags)) {
				cost = PDS_FORBIDDEN;
			} else {
				cost = 1;
			}

			PDS_CELL(DIJKSTRA_MAP, i, j).cost = cost;
		}
	}

	pdsClear(DIJKSTRA_MAP, 30000, eightWays);
	pdsSetDistance(DIJKSTRA_MAP, destinationX, destinationY, 0);
	pdsBatchOutput(DIJKSTRA_MAP, distanceMap);
}

function pathingDistance(x1, y1, x2, y2, blockingTerrainFlags) {
	let retval;
	const distanceMap = allocGrid();
	calculateDistances(distanceMap, x2, y2, blockingTerrainFlags, NULL, true, true);
	retval = distanceMap[x1][y1];
	freeGrid(distanceMap);
	return retval;
}
