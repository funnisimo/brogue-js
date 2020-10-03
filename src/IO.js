/*
 *  IO.c
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

// #include <math.h>
// #include <time.h>
//
// #include "Rogue.h"
// #include "IncludeGlobals.h"

var noSaves = false;

// Populates path[][] with a list of coordinates starting at origin and traversing down the map. Returns the number of steps in the path.
function getPlayerPathOnMap(path /* short [1000][2] */, /* short **/ map, originX, originY) {
	let dir, x, y, steps;

	x = originX;
	y = originY;

	dir = 0;

	for (steps = 0; dir != -1;) {
		dir = nextStep(map, x, y, player, false);
		if (dir != -1) {
			x += nbDirs[dir][0];
			y += nbDirs[dir][1];
			path[steps][0] = x;
			path[steps][1] = y;
			steps++;
      brogueAssert(coordinatesAreInMap(x, y));
		}
	}
	return steps;
}


function reversePath( path /* short[1000][2] */, steps) {
	let i, x, y;

	for (i=0; i<steps / 2; i++) {
		x = path[steps - i - 1][0];
		y = path[steps - i - 1][1];

		path[steps - i - 1][0] = path[i][0];
		path[steps - i - 1][1] = path[i][1];

		path[i][0] = x;
		path[i][1] = y;
	}
}

function hilitePath( path /* short[1000][2] */, steps, unhilite) {
	let i;
	if (unhilite) {
		for (i=0; i<steps; i++) {
      brogueAssert(coordinatesAreInMap(path[i][0], path[i][1]));
			pmap[path[i][0]][path[i][1]].flags &= ~IS_IN_PATH;
			refreshDungeonCell(path[i][0], path[i][1]);
		}
	} else {
		for (i=0; i<steps; i++) {
      brogueAssert(coordinatesAreInMap(path[i][0], path[i][1]));
			pmap[path[i][0]][path[i][1]].flags |= IS_IN_PATH;
			refreshDungeonCell(path[i][0], path[i][1]);
		}
	}
}


// More expensive than hilitePath(__, __, true), but you don't need access to the path itself.
function clearCursorPath() {
	let i, j;

	if (!rogue.playbackMode) { // There are no cursor paths during playback.
		for (i=1; i<DCOLS; i++) {
			for (j=1; j<DROWS; j++) {
				if (pmap[i][j].flags & IS_IN_PATH) {
					pmap[i][j].flags &= ~IS_IN_PATH;
					refreshDungeonCell(i, j);
				}
			}
		}
	}
}


function hideCursor() {
    // Drop out of cursor mode if we're in it, and hide the path either way.
    rogue.cursorMode = false;
    rogue.cursorPathIntensity = (rogue.cursorMode ? 50 : 20);
    rogue.cursorLoc[0] = -1;
    rogue.cursorLoc[1] = -1;
}


function showCursor() {
    // Return or enter turns on cursor mode. When the path is hidden, move the cursor to the player.
    if (!coordinatesAreInMap(rogue.cursorLoc[0], rogue.cursorLoc[1])) {
        rogue.cursorLoc[0] = player.xLoc;
        rogue.cursorLoc[1] = player.yLoc;
        rogue.cursorMode = true;
        rogue.cursorPathIntensity = (rogue.cursorMode ? 50 : 20);
    } else {
        rogue.cursorMode = true;
        rogue.cursorPathIntensity = (rogue.cursorMode ? 50 : 20);
    }
}


function getClosestValidLocationOnMap( loc /* short[2] */, /* short */map, x, y) {
	let i, j, dist, closestDistance, lowestMapScore;

	closestDistance = 10000;
	lowestMapScore = 10000;
	for (i=1; i<DCOLS-1; i++) {
		for (j=1; j<DROWS-1; j++) {
			if (map[i][j] >= 0 && map[i][j] < 30000) {
				dist = (i - x)*(i - x) + (j - y)*(j - y);
				//hiliteCell(i, j, &purple, min(dist / 2, 100), false);
				if (dist < closestDistance
					|| dist == closestDistance && map[i][j] < lowestMapScore)
				{
					loc[0] = i;
					loc[1] = j;
					closestDistance = dist;
					lowestMapScore = map[i][j];
				}
			}
		}
	}
}


function processSnapMap( /*short **/ map, costMap) {
  // let costMap;
  let dir;
  let i, j, newX, newY;

  // costMap = allocGrid();

  // populateCreatureCostMap(costMap, player);
  fillGrid(map, 30000);
  map[player.xLoc][player.yLoc] = 0;
  dijkstraScan(map, costMap, true);

	for (i = 0; i < DCOLS; i++) {
		for (j = 0; j < DROWS; j++) {
      if (cellHasTMFlag(i, j, TM_INVERT_WHEN_HIGHLIGHTED)) {
	      for (dir = 0; dir < 4; dir++) {
	        newX = i + nbDirs[dir][0];
	        newY = j + nbDirs[dir][1];
	        if (coordinatesAreInMap(newX, newY)
	            && map[newX][newY] >= 0
	            && map[newX][newY] < map[i][j])
					{
	            map[i][j] = map[newX][newY];
	        }
	      }
    	}
  	}
	}

  // freeGrid(costMap);
}


// Displays a menu of buttons for various commands.
// Buttons will be disabled if not permitted based on the playback state.
// Returns the keystroke to effect the button's command, or -1 if canceled.
// Some buttons take effect in this function instead of returning a value,
// i.e. true colors mode and display stealth mode.
async function actionMenu(x, playingBack) {
	let buttonCount;
  let y;
  let takeActionOurselves = []; // boolean[ROWS] = {false};
  const theEvent = rogueEvent();

	const buttons = ARRAY(ROWS, brogueButton); // [ROWS] = {{{0}}};
	const yellowColorEscape = STRING();
	const whiteColorEscape = STRING();
	const darkGrayColorEscape = STRING();
	let i, j, longestName = 0, buttonChosen;
	const dbuf = GRID(COLS, ROWS, cellDisplayBuffer); // cellDisplayBuffer[COLS][ROWS],
	const rbuf = GRID(COLS, ROWS, cellDisplayBuffer); // cellDisplayBuffer[COLS][ROWS];

	encodeMessageColor(yellowColorEscape, 0, itemMessageColor);
	encodeMessageColor(whiteColorEscape, 0, white);
	encodeMessageColor(darkGrayColorEscape, 0, black);

  do {
      for (i=0; i<ROWS; i++) {
          initializeButton(buttons[i]);
          buttons[i].buttonColor = interfaceBoxColor;
          buttons[i].opacity = INTERFACE_OPACITY;
      }

      buttonCount = 0;

      if (playingBack) {
          if (KEYBOARD_LABELS) {
              sprintf(buttons[buttonCount].text,	"  %{s}k: %{s}Faster playback  ", yellowColorEscape, whiteColorEscape);
          } else {
              strcpy(buttons[buttonCount].text, "  Faster playback  ");
          }
          buttons[buttonCount].hotkey[0] = UP_KEY;
          buttons[buttonCount].hotkey[1] = UP_ARROW;
          buttons[buttonCount].hotkey[2] = NUMPAD_8;
          buttonCount++;
					if (KEYBOARD_LABELS) {
							sprintf(buttons[buttonCount].text,	"  %{s}j: %{s}Slower playback  ", yellowColorEscape, whiteColorEscape);
					} else {
							strcpy(buttons[buttonCount].text, "  Slower playback  ");
					}
          buttons[buttonCount].hotkey[0] = DOWN_KEY;
          buttons[buttonCount].hotkey[1] = DOWN_ARROW;
          buttons[buttonCount].hotkey[2] = NUMPAD_2;
          buttonCount++;
					sprintf(buttons[buttonCount].text, "    %s---", darkGrayColorEscape);
          buttons[buttonCount].flags &= ~B_ENABLED;
          buttonCount++;

					if (KEYBOARD_LABELS) {
							sprintf(buttons[buttonCount].text,	"%{s}0-9: %{s}Fast forward to turn  ", yellowColorEscape, whiteColorEscape);
					} else {
							strcpy(buttons[buttonCount].text, "  Fast forward to turn  ");
					}
          buttons[buttonCount].hotkey[0] = '0';
          buttonCount++;
					if (KEYBOARD_LABELS) {
							sprintf(buttons[buttonCount].text,	"  %{s}>:%{s} Next Level  ", yellowColorEscape, whiteColorEscape);
					} else {
							strcpy(buttons[buttonCount].text, "  Next Level  ");
					}
          buttons[buttonCount].hotkey[0] = DESCEND_KEY;
          buttonCount++;
					sprintf(buttons[buttonCount].text, "    %s---", darkGrayColorEscape);
          buttons[buttonCount].flags &= ~B_ENABLED;
          buttonCount++;
      } else {
					if (KEYBOARD_LABELS) {
							sprintf(buttons[buttonCount].text, "  %{s}Z: %{s}Rest until better  ",		yellowColorEscape, whiteColorEscape);
					} else {
							strcpy(buttons[buttonCount].text, "  Rest until better  ");
					}
          buttons[buttonCount].hotkey[0] = AUTO_REST_KEY;
          buttonCount++;

					if (KEYBOARD_LABELS) {
							sprintf(buttons[buttonCount].text, "  %{s}A: %{s}Autopilot  ",				yellowColorEscape, whiteColorEscape);
					} else {
							strcpy(buttons[buttonCount].text, "  Autopilot  ");
					}
          buttons[buttonCount].hotkey[0] = AUTOPLAY_KEY;
          buttonCount++;

          if (!rogue.easyMode) {
							if (KEYBOARD_LABELS) {
									sprintf(buttons[buttonCount].text, "  %{s}&: %{s}Easy mode  ",				yellowColorEscape, whiteColorEscape);
							} else {
									strcpy(buttons[buttonCount].text, "  Easy mode  ");
							}
              buttons[buttonCount].hotkey[0] = EASY_MODE_KEY;
              buttonCount++;
          }

					sprintf(buttons[buttonCount].text, "    %s---", darkGrayColorEscape);
          buttons[buttonCount].flags &= ~B_ENABLED;
          buttonCount++;

          if(!noSaves) {
							if (KEYBOARD_LABELS) {
									sprintf(buttons[buttonCount].text, "  %{s}S: %{s}Suspend game and quit  ",	yellowColorEscape, whiteColorEscape);
							} else {
									strcpy(buttons[buttonCount].text, "  Suspend game and quit  ");
							}
              buttons[buttonCount].hotkey[0] = SAVE_GAME_KEY;
              buttonCount++;

							if (KEYBOARD_LABELS) {
									sprintf(buttons[buttonCount].text, "  %{s}O: %{s}Open suspended game  ",		yellowColorEscape, whiteColorEscape);
							} else {
									strcpy(buttons[buttonCount].text, "  Open suspended game  ");
							}
              buttons[buttonCount].hotkey[0] = LOAD_SAVED_GAME_KEY;
              buttonCount++;
          }
      }
      if(!noSaves) {
				if (KEYBOARD_LABELS) {
						sprintf(buttons[buttonCount].text, "  %{s}V: %{s}View saved recording  ",		yellowColorEscape, whiteColorEscape);
				} else {
						strcpy(buttons[buttonCount].text, "  View saved recording  ");
				}
          buttons[buttonCount].hotkey[0] = VIEW_RECORDING_KEY;
          buttonCount++;
      }
			sprintf(buttons[buttonCount].text, "    %s---", darkGrayColorEscape);
      buttons[buttonCount].flags &= ~B_ENABLED;
      buttonCount++;

			if (KEYBOARD_LABELS) {
					sprintf(buttons[buttonCount].text, "  %s\\: %s[%s] Hide color effects  ",	yellowColorEscape, whiteColorEscape, rogue.trueColorMode ? "X" : " ");
			} else {
					sprintf(buttons[buttonCount].text, "  [%s] Hide color effects  ",	rogue.trueColorMode ? " " : "X");
			}
      buttons[buttonCount].hotkey[0] = TRUE_COLORS_KEY;
      takeActionOurselves[buttonCount] = true;
      buttonCount++;
			if (KEYBOARD_LABELS) {
					sprintf(buttons[buttonCount].text, "  %s]: %s[%s] Display stealth range  ",	yellowColorEscape, whiteColorEscape, rogue.displayAggroRangeMode ? "X" : " ");
			} else {
					sprintf(buttons[buttonCount].text, "  [%s] Show stealth range  ",	rogue.displayAggroRangeMode ? "X" : " ");
			}
      buttons[buttonCount].hotkey[0] = AGGRO_DISPLAY_KEY;
      takeActionOurselves[buttonCount] = true;
      buttonCount++;
      // if (KEYBOARD_LABELS) {
			// 	sprintf(buttons[buttonCount].text, "  %s[: %s%s low hitpoint warnings  ",	yellowColorEscape, whiteColorEscape, rogue.warningPauseMode ? "Disable" : "Enable");
			// } else {
			// 	sprintf(buttons[buttonCount].text, "  %s low hitpoint warnings  ",	rogue.warningPauseMode ? "Disable" : "Enable");
			// }
			// buttons[buttonCount].hotkey[0] = WARNING_PAUSE_KEY;
			// takeActionOurselves[buttonCount] = true;
			// buttonCount++;
			sprintf(buttons[buttonCount].text, "    %s---", darkGrayColorEscape);
      buttons[buttonCount].flags &= ~B_ENABLED;
      buttonCount++;

			if (KEYBOARD_LABELS) {
					sprintf(buttons[buttonCount].text, "  %{s}D: %{s}Discovered items  ",	yellowColorEscape, whiteColorEscape);
			} else {
					strcpy(buttons[buttonCount].text, "  Discovered items  ");
			}
      buttons[buttonCount].hotkey[0] = DISCOVERIES_KEY;
      buttonCount++;
			if (KEYBOARD_LABELS) {
					sprintf(buttons[buttonCount].text, "  %s~: %{s}View dungeon seed  ",	yellowColorEscape, whiteColorEscape);
			} else {
					strcpy(buttons[buttonCount].text, "  View dungeon seed  ");
			}
      buttons[buttonCount].hotkey[0] = SEED_KEY;
      buttonCount++;
      if (KEYBOARD_LABELS) { // No help button if we're not in keyboard mode.
				sprintf(buttons[buttonCount].text, "  %s?: %{s}Help  ", yellowColorEscape, whiteColorEscape);
          buttons[buttonCount].hotkey[0] = HELP_KEY;
          buttonCount++;
      }
			sprintf(buttons[buttonCount].text, "    %s---", darkGrayColorEscape);
      buttons[buttonCount].flags &= ~B_ENABLED;
      buttonCount++;

			if (KEYBOARD_LABELS) {
					sprintf(buttons[buttonCount].text, "  %{s}Q: %{s}Quit %s  ",	yellowColorEscape, whiteColorEscape, (playingBack ? "to title screen" : "without saving"));
			} else {
					sprintf(buttons[buttonCount].text, "  Quit %s  ",	(playingBack ? "to title screen" : "without saving"));
			}
      buttons[buttonCount].hotkey[0] = QUIT_KEY;
      buttonCount++;

			strcpy(buttons[buttonCount].text, " ");
      buttons[buttonCount].flags &= ~B_ENABLED;
      buttonCount++;

      for (i=0; i<buttonCount; i++) {
          longestName = max(longestName, strLenWithoutEscapes(buttons[i].text));
      }
			if (x + longestName >= COLS) {
					x = COLS - longestName - 1;
			}
      y = ROWS - buttonCount;
      for (i=0; i<buttonCount; i++) {
          buttons[i].x = x;
          buttons[i].y = y + i;
          for (j = strLenWithoutEscapes(buttons[i].text); j < longestName; j++) {
						strcat(buttons[i].text, " "); // Schlemiel the Painter, but who cares.
          }
      }

      clearDisplayBuffer(dbuf);
      rectangularShading(x - 1, y, longestName + 2, buttonCount, black, INTERFACE_OPACITY / 2, dbuf);
      overlayDisplayBuffer(dbuf, rbuf);
      buttonChosen = await buttonInputLoop(buttons, buttonCount, x - 1, y, longestName + 2, buttonCount, NULL);
      overlayDisplayBuffer(rbuf, NULL);
      if (buttonChosen == -1) {
          return -1;
      }
			else if (takeActionOurselves[buttonChosen])
			{
          theEvent.eventType = KEYSTROKE;
          theEvent.param1 = buttons[buttonChosen].hotkey[0];
          theEvent.param2 = 0;
          theEvent.shiftKey = theEvent.controlKey = false;
          await executeEvent(theEvent);
      } else {
          return buttons[buttonChosen].hotkey[0];
      }
  } while (takeActionOurselves[buttonChosen]);

  brogueAssert(false);
}


const MAX_MENU_BUTTON_COUNT = 5;

function initializeMenuButtons( /* buttonState */ state, buttons /* brogueButton[5] */) {
	let i, x, buttonCount;
	const goldTextEscape = STRING(); // char[MAX_MENU_BUTTON_COUNT] = "";
	const whiteTextEscape = STRING(); // char[MAX_MENU_BUTTON_COUNT] = "";
	let tempColor;

	encodeMessageColor(goldTextEscape, 0, KEYBOARD_LABELS ? yellow : white);
	encodeMessageColor(whiteTextEscape, 0, white);

	for (i=0; i<MAX_MENU_BUTTON_COUNT; i++) {
		initializeButton(buttons[i]);
		buttons[i].opacity = 75;
		buttons[i].buttonColor.copy(interfaceButtonColor);
		buttons[i].y = ROWS - 1;
		buttons[i].flags |= B_WIDE_CLICK_AREA;
		buttons[i].flags &= ~B_KEYPRESS_HIGHLIGHT;
	}

	buttonCount = 0;

	if (rogue.playbackMode) {
		if (KEYBOARD_LABELS) {
				sprintf(buttons[buttonCount].text,  " Unpause (%{s}space%s) ", goldTextEscape, whiteTextEscape);
		} else {
				strcpy(buttons[buttonCount].text,   "     Unpause     ");
		}
		buttons[buttonCount].hotkey[0] = ACKNOWLEDGE_KEY;
		buttonCount++;

		if (KEYBOARD_LABELS) {
				sprintf(buttons[buttonCount].text,  "Omniscience (%{s}tab%s)", goldTextEscape, whiteTextEscape);
		} else {
				strcpy(buttons[buttonCount].text,	"   Omniscience   ");
		}
		buttons[buttonCount].hotkey[0] = TAB_KEY;
		buttonCount++;

		if (KEYBOARD_LABELS) {
				sprintf(buttons[buttonCount].text,	" Next Turn (%{s}l%s) ", goldTextEscape, whiteTextEscape);
		} else {
				strcpy(buttons[buttonCount].text,	"   Next Turn   ");
		}
		buttons[buttonCount].hotkey[0] = RIGHT_KEY;
		buttons[buttonCount].hotkey[1] = RIGHT_ARROW;
		buttons[buttonCount].hotkey[2] = NUMPAD_6;
		buttonCount++;

		strcpy(buttons[buttonCount].text,		"  Menu  ");
		buttonCount++;
	} else {
		sprintf(buttons[buttonCount].text,	"   E%{s}x%{s}plore   ", goldTextEscape, whiteTextEscape);
		buttons[buttonCount].hotkey[0] = EXPLORE_KEY;
		buttons[buttonCount].hotkey[1] = 'X';
		buttonCount++;

		if (KEYBOARD_LABELS) {
				sprintf(buttons[buttonCount].text,	"   Rest (%{s}z%s)   ", goldTextEscape, whiteTextEscape);
		} else {
				strcpy(buttons[buttonCount].text,	"     Rest     ");
		}
		buttons[buttonCount].hotkey[0] = REST_KEY;
		buttonCount++;

		if (KEYBOARD_LABELS) {
				sprintf(buttons[buttonCount].text,	"  Search (%{s}s%s)  ", goldTextEscape, whiteTextEscape);
		} else {
				strcpy(buttons[buttonCount].text,	"    Search    ");
		}
		buttons[buttonCount].hotkey[0] = SEARCH_KEY;
		buttonCount++;

		strcpy(buttons[buttonCount].text,		"    Menu    ");
		buttonCount++;
	}

	sprintf(buttons[4].text,	"   %{s}I%{s}nventory   ", goldTextEscape, whiteTextEscape);
	buttons[4].hotkey[0] = INVENTORY_KEY;
	buttons[4].hotkey[1] = 'I';

	x = mapToWindowX(0);
	for (i=0; i<5; i++) {
		buttons[i].x = x;
		x += strLenWithoutEscapes(buttons[i].text) + 2; // Gap between buttons.
	}

	initializeButtonState(state,
						  buttons,
						  5,
						  mapToWindowX(0),
						  ROWS - 1,
						  COLS - mapToWindowX(0),
						  1);

	for (i=0; i < 5; i++) {
		drawButton(state.buttons[i], BUTTON_NORMAL, state.rbuf);
	}
	for (i=0; i<COLS; i++) { // So the buttons stay (but are dimmed and desaturated) when inactive.
		tempColor = colorFromComponents(state.rbuf[i][ROWS - 1].backColorComponents);
		desaturate(tempColor, 60);
		applyColorAverage(tempColor, black, 50);
		storeColorComponents(state.rbuf[i][ROWS - 1].backColorComponents, tempColor);
		tempColor = colorFromComponents(state.rbuf[i][ROWS - 1].foreColorComponents);
		desaturate(tempColor, 60);
		applyColorAverage(tempColor, black, 50);
		storeColorComponents(state.rbuf[i][ROWS - 1].foreColorComponents, tempColor);
	}
}


function recordCurrentCreatureHealths() {
    let monst;	// creature *
    CYCLE_MONSTERS_AND_PLAYERS( (monst) => {
        monst.previousHealthPoints = monst.currentHP;
    });
}


// This is basically the main loop for the game.
async function mainInputLoop() {
	const originLoc = [-1, -1]; // short[2],
	const pathDestination = [-1, -1]; // short[2],
	const oldTargetLoc = [-1, -1]; // short[2],
	const path = ARRAY(1000, () => [-1, -1] ); // [1000][2],
	let steps, oldRNG, dir, newX, newY;
	let monst = null;	// creature *
	let theItem; // item *
	const rbuf = GRID(COLS, ROWS, cellDisplayBuffer ); // cellDisplayBuffer[COLS][ROWS];

	let canceled, targetConfirmed, tabKey, focusedOnMonster, focusedOnItem, focusedOnTerrain, playingBack, doEvent, textDisplayed;

	const theEvent = rogueEvent();
	let costMap, playerPathingMap, cursorSnapMap;
	let buttons = ARRAY(5, brogueButton ); // [5] = {{{0}}};
	const state = buttonState();
	let buttonInput;
  let backupCost;

	const cursor = rogue.cursorLoc; // shorthand

	canceled = false;
	rogue.cursorMode = false; // Controls whether the keyboard moves the cursor or the character.
	steps = 0;

	rogue.cursorPathIntensity = (rogue.cursorMode ? 50 : 20);

	// Initialize buttons.
	initializeMenuButtons(state, buttons);

	playingBack = rogue.playbackMode;
	rogue.playbackMode = false;
	costMap = allocGrid();
  playerPathingMap = allocGrid();
  cursorSnapMap = allocGrid();

	cursor[0] = cursor[1] = -1;

	while (!rogue.gameHasEnded && (!playingBack || !canceled)) { // repeats until the game ends

		// assureCosmeticRNG();
		// oldRNG = rogue.RNG;
		// rogue.RNG = RNG_COSMETIC;

		focusedOnMonster = focusedOnItem = focusedOnTerrain = false;
		steps = 0;
		clearCursorPath();

		originLoc[0] = player.xLoc;
		originLoc[1] = player.yLoc;

		if (playingBack && rogue.cursorMode) {
			await temporaryMessage("Examine what? (<hjklyubn>, mouse, or <tab>)", false);
		}

		if (!playingBack
			&& player.xLoc == cursor[0]
			&& player.yLoc == cursor[1]
			&& oldTargetLoc[0] == cursor[0]
			&& oldTargetLoc[1] == cursor[1])
		{
			// Path hides when you reach your destination.
			rogue.cursorMode = false;
			rogue.cursorPathIntensity = (rogue.cursorMode ? 50 : 20);
			cursor[0] = -1;
			cursor[1] = -1;
		}

		oldTargetLoc[0] = cursor[0];
		oldTargetLoc[1] = cursor[1];

		populateCreatureCostMap(costMap, player);

		fillGrid(playerPathingMap, 30000);
		playerPathingMap[player.xLoc][player.yLoc] = 0;
		dijkstraScan(playerPathingMap, costMap, true);
    processSnapMap(cursorSnapMap, costMap);

		do {
			textDisplayed = false;

			// Draw the cursor and path
			if (coordinatesAreInMap(oldTargetLoc[0], oldTargetLoc[1])) {
				refreshDungeonCell(oldTargetLoc[0], oldTargetLoc[1]);				// Remove old cursor.
			}
			if (!playingBack) {
				if (coordinatesAreInMap(oldTargetLoc[0], oldTargetLoc[1])) {
					hilitePath(path, steps, true);									// Unhilite old path.
				}
				if (coordinatesAreInMap(cursor[0], cursor[1])) {
					if (cursorSnapMap[cursor[0]][cursor[1]] >= 0
						&& cursorSnapMap[cursor[0]][cursor[1]] < 30000)
					{
						pathDestination[0] = cursor[0];
						pathDestination[1] = cursor[1];
					} else {
						// If the cursor is aimed at an inaccessible area, find the nearest accessible area to path toward.
						getClosestValidLocationOnMap(pathDestination, cursorSnapMap, cursor[0], cursor[1]);
					}

          fillGrid(playerPathingMap, 30000);
          playerPathingMap[pathDestination[0]][pathDestination[1]] = 0;
          backupCost = costMap[pathDestination[0]][pathDestination[1]];
          costMap[pathDestination[0]][pathDestination[1]] = 1;
          dijkstraScan(playerPathingMap, costMap, true);
          costMap[pathDestination[0]][pathDestination[1]] = backupCost;
          steps = getPlayerPathOnMap(path, playerPathingMap, player.xLoc, player.yLoc);

//					steps = getPlayerPathOnMap(path, playerPathingMap, pathDestination[0], pathDestination[1]) - 1;	// Get new path.
//					reversePath(path, steps);   // Flip it around, back-to-front.

          if (steps >= 0) {
              path[steps][0] = pathDestination[0];
              path[steps][1] = pathDestination[1];
          }
					steps++;
//					if (playerPathingMap[cursor[0]][cursor[1]] != 1
          if (playerPathingMap[player.xLoc][player.yLoc] != 1
						|| pathDestination[0] != cursor[0]
						|| pathDestination[1] != cursor[1])
					{
						hilitePath(path, steps, false);		// Hilite new path.
					}
				}
			}

			if (coordinatesAreInMap(cursor[0], cursor[1])) {
				hiliteCell(cursor[0], cursor[1], white,
						   (steps <= 0
								 || (path[steps-1][0] == cursor[0] && path[steps-1][1] == cursor[1])
								 || (!playingBack && distanceBetween(player.xLoc, player.yLoc, cursor[0], cursor[1]) <= 1) ? 100 : 25),
						   true);

				oldTargetLoc[0] = cursor[0];
				oldTargetLoc[1] = cursor[1];

				monst = monsterAtLoc(cursor[0], cursor[1]);
				theItem = itemAtLoc(cursor[0], cursor[1]);
				if (monst != NULL && (canSeeMonster(monst) || rogue.playbackOmniscience)) {
					rogue.playbackMode = playingBack;
					refreshSideBar(cursor[0], cursor[1], false);
					rogue.playbackMode = false;

					focusedOnMonster = true;
					if (monst !== player && (!player.status[STATUS_HALLUCINATING] || rogue.playbackOmniscience)) {
						printMonsterDetails(monst, rbuf);
						textDisplayed = true;
					}
				} else if (theItem != NULL && playerCanSeeOrSense(cursor[0], cursor[1])) {
					rogue.playbackMode = playingBack;
					refreshSideBar(cursor[0], cursor[1], false);
					rogue.playbackMode = false;

					focusedOnItem = true;
					if (!player.status[STATUS_HALLUCINATING] || rogue.playbackOmniscience) {
						printFloorItemDetails(theItem, rbuf);
						textDisplayed = true;
					}
				} else if (cellHasTMFlag(cursor[0], cursor[1], TM_LIST_IN_SIDEBAR) && playerCanSeeOrSense(cursor[0], cursor[1])) {
					rogue.playbackMode = playingBack;
					refreshSideBar(cursor[0], cursor[1], false);
					rogue.playbackMode = false;
          focusedOnTerrain = true;
				}

				printLocationDescription(cursor[0], cursor[1]);
			}

			// Get the input!
			rogue.playbackMode = playingBack;
			// TODO - Move targetConfirmed, canceled, tabKey to event or return
			const moveResult = await moveCursor(/* &targetConfirmed, &canceled, &tabKey, */ cursor, theEvent, state, !textDisplayed, rogue.cursorMode, true);
			doEvent = moveResult.executeEvent;
			targetConfirmed = moveResult.targetConfirmed;
			canceled = moveResult.canceled;
			tabKey = moveResult.tabKey;
			rogue.playbackMode = false;

			if (state.buttonChosen == 3) { // Actions menu button.
				buttonInput = await actionMenu(buttons[3].x - 4, playingBack); // Returns the corresponding keystroke.
				if (buttonInput == -1) { // Canceled.
					doEvent = false;
				} else {
					theEvent.eventType = KEYSTROKE;
					theEvent.param1 = buttonInput;
					theEvent.param2 = 0;
					theEvent.shiftKey = theEvent.controlKey = false;
					doEvent = true;
				}
			} else if (state.buttonChosen > -1) {
				theEvent.eventType = KEYSTROKE;
				theEvent.param1 = buttons[state.buttonChosen].hotkey[0];
				theEvent.param2 = 0;
			}
			state.buttonChosen = -1;

			if (playingBack) {
				if (canceled) {
					rogue.cursorMode = false;
					rogue.cursorPathIntensity = (rogue.cursorMode ? 50 : 20);
				}

				if (theEvent.eventType == KEYSTROKE
					&& theEvent.param1 == ACKNOWLEDGE_KEY) // To unpause by button during playback.
				{
					canceled = true;
				} else {
					canceled = false;
				}
			}

			if (focusedOnMonster || focusedOnItem || focusedOnTerrain) {
				focusedOnMonster = false;
				focusedOnItem = false;
        focusedOnTerrain = false;
				if (textDisplayed) {
					overlayDisplayBuffer(rbuf, 0); // Erase the monster info window.
				}
				rogue.playbackMode = playingBack;
				refreshSideBar(-1, -1, false);
				rogue.playbackMode = false;
			}

			if (tabKey && !playingBack) { // The tab key cycles the cursor through monsters, items and terrain features.
				const target = nextTargetAfter(cursor[0], cursor[1], true, true, true, true, false, theEvent.shiftKey)
				if (target) {
            cursor[0] = target.x;
            cursor[1] = target.y;
        }
			}

			if (theEvent.eventType == KEYSTROKE
				&& (theEvent.param1 == ASCEND_KEY && cursor[0] == rogue.upLoc[0] && cursor[1] == rogue.upLoc[1]
					|| theEvent.param1 == DESCEND_KEY && cursor[0] == rogue.downLoc[0] && cursor[1] == rogue.downLoc[1]))
			{
				targetConfirmed = true;
				doEvent = false;
			}
		} while (!targetConfirmed && !canceled && !doEvent && !rogue.gameHasEnded);

		if (coordinatesAreInMap(oldTargetLoc[0], oldTargetLoc[1])) {
			refreshDungeonCell(oldTargetLoc[0], oldTargetLoc[1]);						// Remove old cursor.
		}

		// restoreRNG();
		recordCurrentCreatureHealths();

		if (canceled && !playingBack) {
      hideCursor();
      confirmMessages();
		} else if (targetConfirmed && !playingBack && coordinatesAreInMap(cursor[0], cursor[1])) {
			if (theEvent.eventType == MOUSE_UP
				&& theEvent.controlKey
				&& steps > 1)
			{
				// Control-clicking moves the player one step along the path.
				for (dir=0;
					 dir < DIRECTION_COUNT && (player.xLoc + nbDirs[dir][0] != path[0][0] || player.yLoc + nbDirs[dir][1] != path[0][1]);
					 dir++);
				await playerMoves(dir);
			} else if (D_WORMHOLING) {
				await travel(cursor[0], cursor[1], true);
			} else {
				confirmMessages();
				if (originLoc[0] == cursor[0]
					&& originLoc[1] == cursor[1])
				{
					confirmMessages();
				} else if (abs(player.xLoc - cursor[0]) + abs(player.yLoc - cursor[1]) == 1 // horizontal or vertical
						   || (distanceBetween(player.xLoc, player.yLoc, cursor[0], cursor[1]) == 1 // includes diagonals
							   && (!diagonalBlocked(player.xLoc, player.yLoc, cursor[0], cursor[1], !rogue.playbackOmniscience)
                   || ((pmap[cursor[0]][cursor[1]].flags & HAS_MONSTER) && (monsterAtLoc(cursor[0], cursor[1]).info.flags & MONST_ATTACKABLE_THRU_WALLS)) // there's a turret there
                   || ((terrainFlags(cursor[0], cursor[1]) & T_OBSTRUCTS_PASSABILITY) && (terrainMechFlags(cursor[0], cursor[1]) & TM_PROMOTES_ON_PLAYER_ENTRY))))) // there's a lever there
				{
             for (dir=0;
                  dir < DIRECTION_COUNT && (player.xLoc + nbDirs[dir][0] != cursor[0] || player.yLoc + nbDirs[dir][1] != cursor[1]);
                  dir++);
             await playerMoves(dir);
         } else if (steps) {
             await travelRoute(path, steps);
         }
			}
		} else if (doEvent) {
			// If the player entered input during moveCursor() that wasn't a cursor movement command.
			// Mainly, we want to filter out directional keystrokes when we're in cursor mode, since
			// those should move the cursor but not the player.
      brogueAssert(rogue.RNG == RNG_SUBSTANTIVE);
			if (playingBack) {
				rogue.playbackMode = true;
				executePlaybackInput(theEvent);
				playingBack = rogue.playbackMode;
				rogue.playbackMode = false;
			} else {
				await executeEvent(theEvent);
				if (rogue.playbackMode) {
					playingBack = true;
					rogue.playbackMode = false;
					confirmMessages();
					break;
				}
			}
		}
	}

	rogue.playbackMode = playingBack;
	refreshSideBar(-1, -1, false);
	freeGrid(costMap);
  freeGrid(playerPathingMap);
  freeGrid(cursorSnapMap);
}

//
// // accuracy depends on how many clock cycles occur per second
// function MILLISECONDS() { return performance.now(); } // (clock() * 1000 / CLOCKS_PER_SEC);

const MILLISECONDS_FOR_CAUTION	= 100;

function considerCautiousMode() {
	/*
	signed long oldMilliseconds = rogue.milliseconds;
	rogue.milliseconds = MILLISECONDS();
	clock_t i = clock();
	printf("\n%li", i);
	if (rogue.milliseconds - oldMilliseconds < MILLISECONDS_FOR_CAUTION) {
		rogue.cautiousMode = true;
	}*/
}

// // flags the entire window as needing to be redrawn at next flush.
// // very low level -- does not interface with the guts of the game.
// function refreshScreen() {
// 	let i, j;
//
// 	for( i=0; i<COLS; i++ ) {
// 		for( j=0; j<ROWS; j++ ) {
// 			displayBuffer[i][j].needsUpdate = true;
// 		}
// 	}
// 	commitDraws();
// }
//

// higher-level redraw
function displayLevel() {
	let i, j;

	for( i=0; i<DCOLS; i++ ) {
		for( j=0; j<DROWS; j++ ) {
			refreshDungeonCell(i, j);
		}
	}
}

function dumpDisplay(buf) {
	let i, j;

	buf = buf || displayBuffer;

	for( j=0; j < ROWS; j++) {
		let line = '';
		for( i=0; i < COLS; i++) {
			line += buf[i][j].char;
		}
		console.log(line);
	}
}


// converts colors into components
function storeColorComponents( components /* char[3] */, /* color */ theColor) {
	let rand = cosmetic_range(0, theColor.rand);
	components[0] = max(0, min(100, theColor.red + cosmetic_range(0, theColor.redRand) + rand));
	components[1] = max(0, min(100, theColor.green + cosmetic_range(0, theColor.greenRand) + rand));
	components[2] = max(0, min(100, theColor.blue + cosmetic_range(0, theColor.blueRand) + rand));
}


function bakeTerrainColors(/* color */foreColor, /* color */backColor, x, y) {
    let vals;
    if (rogue.trueColorMode) {
        const nf = 1000;
        const nb = 0;
        const neutralColors = [nf, nf, nf, nf, nb, nb, nb, nb];
        vals = neutralColors;
    } else {
        vals = terrainRandomValues[x][y];
    }

	const foreRand = Math.round(foreColor.rand * vals[6] / 1000);
	const backRand = Math.round(backColor.rand * vals[7] / 1000);

	foreColor.red   += Math.round(foreColor.redRand * vals[0] / 1000 + foreRand);
	foreColor.green += Math.round(foreColor.greenRand * vals[1] / 1000 + foreRand);
	foreColor.blue  += Math.round(foreColor.blueRand * vals[2] / 1000 + foreRand);
	foreColor.redRand = foreColor.greenRand = foreColor.blueRand = foreColor.rand = 0;

	backColor.red   += Math.round(backColor.redRand * vals[3] / 1000 + backRand);
	backColor.green += Math.round(backColor.greenRand * vals[4] / 1000 + backRand);
	backColor.blue  += Math.round(backColor.blueRand * vals[5] / 1000 + backRand);
	backColor.redRand = backColor.greenRand = backColor.blueRand = backColor.rand = 0;

	if (foreColor.colorDances || backColor.colorDances) {
		pmap[x][y].flags |= TERRAIN_COLORS_DANCING;
	} else {
		pmap[x][y].flags &= ~TERRAIN_COLORS_DANCING;
	}
}


function bakeColor(/* color */theColor) {
	let rand;
	rand = cosmetic_range(0, theColor.rand);
	theColor.red   += Math.round(cosmetic_range(0, theColor.redRand) + rand);
	theColor.green += Math.round(cosmetic_range(0, theColor.greenRand) + rand);
	theColor.blue  += Math.round(cosmetic_range(0, theColor.blueRand) + rand);
	theColor.redRand = theColor.greenRand = theColor.blueRand = theColor.rand = 0;
}


function shuffleTerrainColors(percentOfCells, refreshCells) {
  let dir;
	let i, j;

	// assureCosmeticRNG();

	for (i=0; i<DCOLS; i++) {
		for(j=0; j<DROWS; j++) {
			if (playerCanSeeOrSense(i, j)
				&& (!rogue.automationActive || !(rogue.playerTurnNumber % 5))
				&& ((pmap[i][j].flags & TERRAIN_COLORS_DANCING)
					|| (player.status[STATUS_HALLUCINATING] && playerCanDirectlySee(i, j)))
				&& (i != rogue.cursorLoc[0] || j != rogue.cursorLoc[1])
				&& (percentOfCells >= 100 || cosmetic_range(1, 100) <= percentOfCells))
			{
					for (dir=0; dir<DIRECTION_COUNT; dir++) {
						terrainRandomValues[i][j][dir] += cosmetic_range(-600, 600);
						terrainRandomValues[i][j][dir] = clamp(terrainRandomValues[i][j][dir], 0, 1000);
					}

					if (refreshCells) {
						refreshDungeonCell(i, j);
					}
				}
		}
	}

	// restoreRNG();
}


// if forecolor is too similar to back, darken or lighten it and return true.
// Assumes colors have already been baked (no random components).
function separateColors(/* color */ fore, /* color */ back) {
	let f, b, modifier = null;
	let failsafe;
	let madeChange;

	f = fore.clone();
	b = back.clone();

	f.red			= clamp(f.red, 0, 100);
	f.green		= clamp(f.green, 0, 100);
	f.blue		= clamp(f.blue, 0, 100);
	b.red			= clamp(b.red, 0, 100);
	b.green		= clamp(b.green, 0, 100);
	b.blue		= clamp(b.blue, 0, 100);

	if (f.red + f.blue + f.green > 50 * 3) {
		modifier = black;
	} else {
		modifier = white;
	}

	madeChange = false;
	failsafe = 10;

	while(COLOR_DIFF(f, b) < MIN_COLOR_DIFF && --failsafe) {
		applyColorAverage(f, modifier, 20);
		madeChange = true;
	}

	if (madeChange) {
		fore.copy(f);
		return true;
	} else {
		return false;
	}
}

function normColor( /* color */ baseColor, aggregateMultiplier, colorTranslation) {

    baseColor.red += colorTranslation;
    baseColor.green += colorTranslation;
    baseColor.blue += colorTranslation;
    let vectorLength =  baseColor.red + baseColor.green + baseColor.blue;

    if (vectorLength != 0) {
        baseColor.red =    Math.round(baseColor.red * 300    / vectorLength * aggregateMultiplier / 100);
        baseColor.green =  Math.round(baseColor.green * 300  / vectorLength * aggregateMultiplier / 100);
        baseColor.blue =   Math.round(baseColor.blue * 300   / vectorLength * aggregateMultiplier / 100);
    }
    baseColor.redRand = 0;
    baseColor.greenRand = 0;
    baseColor.blueRand = 0;
    baseColor.rand = 0;
}


var CELL_APPEARANCE = {
	char: null,
	foreColor: color(),
	backColor: color()
};

// okay, this is kind of a beast...
function getCellAppearance(x, y) {
	let bestBCPriority, bestFCPriority, bestCharPriority;
  let distance;
	let cellChar = 0;
	let cellForeColor = color(), cellBackColor = color(), lightMultiplierColor = color(), gasAugmentColor = color();
	let monsterWithDetectedItem = false, needDistinctness = false;
	let gasAugmentWeight = 0;
	let monst = NULL;	// creature *
	let theItem = NULL; // item *
  let tile = NOTHING;	// enum tileType
	const itemChars = [POTION_CHAR, SCROLL_CHAR, FOOD_CHAR, WAND_CHAR,
						STAFF_CHAR, GOLD_CHAR, ARMOR_CHAR, WEAPON_CHAR, RING_CHAR, CHARM_CHAR];
	let layer, maxLayer;	// enum dungeonLayers

	// assureCosmeticRNG();

  brogueAssert(coordinatesAreInMap(x, y));

	if (pmap[x][y].flags & HAS_MONSTER) {
		monst = monsterAtLoc(x, y);
	} else if (pmap[x][y].flags & HAS_DORMANT_MONSTER) {
		monst = dormantMonsterAtLoc(x, y);
	}
	if (monst) {
		monsterWithDetectedItem = (monst.carriedItem && (monst.carriedItem.flags & ITEM_MAGIC_DETECTED)
								   && itemMagicChar(monst.carriedItem) && !canSeeMonster(monst));
	}

	if (monsterWithDetectedItem) {
		theItem = monst.carriedItem;
	} else {
		theItem = itemAtLoc(x, y);
	}

	if (!playerCanSeeOrSense(x, y)
		&& !(pmap[x][y].flags & (ITEM_DETECTED | HAS_PLAYER))
		&& (!monst || !monsterRevealed(monst))
		&& !monsterWithDetectedItem
		&& (pmap[x][y].flags & (DISCOVERED | MAGIC_MAPPED))
		&& (pmap[x][y].flags & STABLE_MEMORY))
	{
		// restore memory
		cellChar = pmap[x][y].rememberedAppearance.char;
		cellForeColor = colorFromComponents(pmap[x][y].rememberedAppearance.foreColorComponents);
		cellBackColor = colorFromComponents(pmap[x][y].rememberedAppearance.backColorComponents);
	} else {
		// Find the highest-priority fore color, back color and character.
		bestFCPriority = bestBCPriority = bestCharPriority = 10000;

    // Default to the appearance of floor.
    cellForeColor.copy(tileCatalog[FLOOR].foreColor);
    cellBackColor.copy(tileCatalog[FLOOR].backColor);
    cellChar = tileCatalog[FLOOR].displayChar;

		if (!(pmap[x][y].flags & DISCOVERED) && !rogue.playbackOmniscience) {
      if (pmap[x][y].flags & MAGIC_MAPPED) {
          maxLayer = LIQUID + 1; // Can see only dungeon and liquid layers with magic mapping.
      } else {
          maxLayer = 0; // Terrain shouldn't influence the tile appearance at all if it hasn't been discovered.
      }
		} else {
			maxLayer = NUMBER_TERRAIN_LAYERS;
		}

		for (layer = 0; layer < maxLayer; layer++) {
			// Gas shows up as a color average, not directly.
			if (pmap[x][y].layers[layer] && layer != GAS) {
        tile = pmap[x][y].layers[layer];
        if (rogue.playbackOmniscience && (tileCatalog[tile].mechFlags & TM_IS_SECRET)) {
            tile = dungeonFeatureCatalog[tileCatalog[tile].discoverType].tile;
        }

				if (tileCatalog[tile].drawPriority < bestFCPriority
					&& tileCatalog[tile].foreColor)
				{
					cellForeColor.copy(tileCatalog[tile].foreColor);
					bestFCPriority = tileCatalog[tile].drawPriority;
				}
				if (tileCatalog[tile].drawPriority < bestBCPriority
					&& tileCatalog[tile].backColor)
				{
					cellBackColor.copy(tileCatalog[tile].backColor);
					bestBCPriority = tileCatalog[tile].drawPriority;
				}
				if (tileCatalog[tile].drawPriority < bestCharPriority
					&& tileCatalog[tile].displayChar)
				{
					cellChar = tileCatalog[tile].displayChar;
					bestCharPriority = tileCatalog[tile].drawPriority;
          needDistinctness = (tileCatalog[tile].mechFlags & TM_VISUALLY_DISTINCT) ? true : false;
				}
			}
		}

		if (rogue.trueColorMode) {
			lightMultiplierColor.copy(colorMultiplier100);
		} else {
			colorMultiplierFromDungeonLight(x, y, lightMultiplierColor);
		}

		if (pmap[x][y].layers[GAS]
			&& tileCatalog[pmap[x][y].layers[GAS]].backColor)
		{
			gasAugmentColor.copy(tileCatalog[pmap[x][y].layers[GAS]].backColor);
			if (rogue.trueColorMode) {
				gasAugmentWeight = 30;
			} else {
				gasAugmentWeight = min(90, 30 + pmap[x][y].volume);
			}
		}

    if (D_DISABLE_BACKGROUND_COLORS) {
        if (COLOR_DIFF(cellBackColor, black) > COLOR_DIFF(cellForeColor, black)) {
            cellForeColor.copy(cellBackColor);
        }
        cellBackColor.copy(black);
        needDistinctness = true;
    }

		if (pmap[x][y].flags & HAS_PLAYER) {
			cellChar = player.info.displayChar;
			cellForeColor.copy(player.info.foreColor);
			needDistinctness = true;
		} else if (((pmap[x][y].flags & HAS_ITEM) && (pmap[x][y].flags & ITEM_DETECTED)
					&& itemMagicChar(theItem)
					&& !playerCanSeeOrSense(x, y))
				|| monsterWithDetectedItem)
		{
			cellChar = itemMagicChar(theItem);
			needDistinctness = true;
			if (cellChar == GOOD_MAGIC_CHAR) {
				cellForeColor.copy(goodMessageColor);
			} else if (cellChar == BAD_MAGIC_CHAR) {
				cellForeColor.copy(badMessageColor);
			} else {
        cellForeColor.copy(white);
      }
			//cellBackColor = black;
		} else if ((pmap[x][y].flags & HAS_MONSTER)
				   && (playerCanSeeOrSense(x, y) || ((monst.info.flags & MONST_IMMOBILE) && (pmap[x][y].flags & DISCOVERED)))
                   && (!monsterIsHidden(monst, player) || rogue.playbackOmniscience)) {
			needDistinctness = true;
			if (player.status[STATUS_HALLUCINATING] > 0 && !(monst.info.flags & (MONST_INANIMATE | MONST_INVULNERABLE)) && !rogue.playbackOmniscience) {
				cellChar = String.fromCharCode(cosmetic_range('a'.charCodeAt(0), 'z'.charCodeAt(0)));
        if (cosmetic_range(0, 1)) {
            cellChar = cellChar.toUpperCase();
        }
				cellForeColor.copy(monsterCatalog[cosmetic_range(1, NUMBER_MONSTER_KINDS - 1)].foreColor);
			} else {
				cellChar = monst.info.displayChar;
        cellForeColor.copy(monst.info.foreColor);
				if (monst.status[STATUS_INVISIBLE] || (monst.bookkeepingFlags & MB_SUBMERGED)) {
                    // Invisible allies show up on the screen with a transparency effect.
					//cellForeColor = cellBackColor;
          applyColorAverage(cellForeColor, cellBackColor, 75);
				} else {
					if (monst.creatureState == MONSTER_ALLY
						&& (monst.info.displayChar >= 'a' && monst.info.displayChar <= 'z' || monst.info.displayChar >= 'A' && monst.info.displayChar <= 'Z'))
					{
						if (rogue.trueColorMode) {
                cellForeColor.copy(white);
            } else {
                //applyColorAverage(&cellForeColor, &blue, 50);
                applyColorAverage(cellForeColor, pink, 50);
            }
					}
				}
				//DEBUG if (monst.bookkeepingFlags & MB_LEADER) applyColorAverage(&cellBackColor, &purple, 50);
			}
		} else if (monst
           && monsterRevealed(monst)
				   && !canSeeMonster(monst)) {
			if (player.status[STATUS_HALLUCINATING] && !rogue.playbackOmniscience) {
				cellChar = (cosmetic_range(0, 1) ? 'X' : 'x');
			} else {
				cellChar = (monst.info.displayChar >= 'a' && monst.info.displayChar <= 'z' ? 'x' : 'X');
			}
			cellForeColor.copy(white);
			lightMultiplierColor.copy(white);
			if (!(pmap[x][y].flags & DISCOVERED)) {
				cellBackColor.copy(black);
				gasAugmentColor.copy(black);
			}
		} else if ((pmap[x][y].flags & HAS_ITEM) && !cellHasTerrainFlag(x, y, T_OBSTRUCTS_ITEMS)
				   && (playerCanSeeOrSense(x, y) || ((pmap[x][y].flags & DISCOVERED) && !cellHasTerrainFlag(x, y, T_MOVES_ITEMS))))
 	  {
			 needDistinctness = true;
			if (player.status[STATUS_HALLUCINATING] && !rogue.playbackOmniscience) {
				cellChar = itemChars[cosmetic_range(0, 9)];
				cellForeColor.copy(itemColor);
			} else {
				theItem = itemAtLoc(x, y);
				cellChar = theItem.displayChar;
				cellForeColor.copy(theItem.foreColor);
			}
		} else if (playerCanSeeOrSense(x, y) || (pmap[x][y].flags & (DISCOVERED | MAGIC_MAPPED))) {
			// just don't want these to be plotted as black
		} else {
			CELL_APPEARANCE.char = ' ';
			CELL_APPEARANCE.foreColor.copy(black);
			CELL_APPEARANCE.backColor.copy(undiscoveredColor);

      if (D_DISABLE_BACKGROUND_COLORS) CELL_APPEARANCE.backColor.copy(black);

			// restoreRNG();
			return CELL_APPEARANCE;
		}

		if (gasAugmentWeight && ((pmap[x][y].flags & DISCOVERED) || rogue.playbackOmniscience)) {
			if (!rogue.trueColorMode || !needDistinctness) {
				applyColorAverage(cellForeColor, gasAugmentColor, gasAugmentWeight);
			}
			// phantoms create sillhouettes in gas clouds
			if ((pmap[x][y].flags & HAS_MONSTER)
				&& monst.status[STATUS_INVISIBLE]
				&& playerCanSeeOrSense(x, y)
                && !monsterRevealed(monst)
                && !monsterHiddenBySubmersion(monst, player)) {

				if (player.status[STATUS_HALLUCINATING] && !rogue.playbackOmniscience) {
					cellChar = monsterCatalog[cosmetic_range(1, NUMBER_MONSTER_KINDS - 1)].displayChar;
				} else {
					cellChar = monst.info.displayChar;
				}
				cellForeColor.copy(cellBackColor);
			}
			applyColorAverage(cellBackColor, gasAugmentColor, gasAugmentWeight);
		}

		if (!(pmap[x][y].flags & (ANY_KIND_OF_VISIBLE | ITEM_DETECTED | HAS_PLAYER))
			&& !playerCanSeeOrSense(x, y)
			&& (!monst || !monsterRevealed(monst)) && !monsterWithDetectedItem)
		{
      if (rogue.trueColorMode) {
          bakeTerrainColors(cellForeColor, cellBackColor, x, y);
      }

			// store memory
			storeColorComponents(pmap[x][y].rememberedAppearance.foreColorComponents, cellForeColor);
			storeColorComponents(pmap[x][y].rememberedAppearance.backColorComponents, cellBackColor);

			applyColorAugment(lightMultiplierColor, basicLightColor, 100);
			if (!rogue.trueColorMode || !needDistinctness) {
				applyColorMultiplier(cellForeColor, lightMultiplierColor);
			}
			applyColorMultiplier(cellBackColor, lightMultiplierColor);
			bakeTerrainColors(cellForeColor, cellBackColor, x, y);

			pmap[x][y].rememberedAppearance.char = cellChar;
			pmap[x][y].flags |= STABLE_MEMORY;
			if (pmap[x][y].flags & HAS_ITEM) {
        theItem = itemAtLoc(x, y);
				pmap[x][y].rememberedItemCategory = theItem.category;
        pmap[x][y].rememberedItemKind = theItem.kind;
        pmap[x][y].rememberedItemQuantity = theItem.quantity;
			} else {
				pmap[x][y].rememberedItemCategory = 0;
        pmap[x][y].rememberedItemKind = 0;
        pmap[x][y].rememberedItemQuantity = 0;
			}

			// Then restore, so that it looks the same on this pass as it will when later refreshed.
			cellForeColor = colorFromComponents(pmap[x][y].rememberedAppearance.foreColorComponents);
			cellBackColor = colorFromComponents(pmap[x][y].rememberedAppearance.backColorComponents);
		}
	}

	if (((pmap[x][y].flags & ITEM_DETECTED) || monsterWithDetectedItem
		 || (monst && monsterRevealed(monst)))
		&& !playerCanSeeOrSense(x, y)) {
		// do nothing
	} else if (!(pmap[x][y].flags & VISIBLE) && (pmap[x][y].flags & CLAIRVOYANT_VISIBLE)) {
		// can clairvoyantly see it
		if (rogue.trueColorMode) {
			lightMultiplierColor.copy(basicLightColor);
		} else {
			applyColorAugment(lightMultiplierColor, basicLightColor, 100);
		}
		if (!rogue.trueColorMode || !needDistinctness) {
			applyColorMultiplier(cellForeColor, lightMultiplierColor);
			applyColorMultiplier(cellForeColor, clairvoyanceColor);
		}
		applyColorMultiplier(cellBackColor, lightMultiplierColor);
		applyColorMultiplier(cellBackColor, clairvoyanceColor);
	} else if (!(pmap[x][y].flags & VISIBLE) && (pmap[x][y].flags & TELEPATHIC_VISIBLE)) {
		// Can telepathically see it through another creature's eyes.

		applyColorAugment(lightMultiplierColor, basicLightColor, 100);

		if (!rogue.trueColorMode || !needDistinctness) {
			applyColorMultiplier(cellForeColor, lightMultiplierColor);
			applyColorMultiplier(cellForeColor, telepathyMultiplier);
		}
		applyColorMultiplier(cellBackColor, lightMultiplierColor);
		applyColorMultiplier(cellBackColor, telepathyMultiplier);
	} else if (!(pmap[x][y].flags & DISCOVERED) && (pmap[x][y].flags & MAGIC_MAPPED)) {
		// magic mapped only
		if (!rogue.playbackOmniscience) {
			needDistinctness = false;
			if (!rogue.trueColorMode || !needDistinctness) {
				applyColorMultiplier(cellForeColor, magicMapColor);
			}
			applyColorMultiplier(cellBackColor, magicMapColor);
		}
	} else if (!(pmap[x][y].flags & VISIBLE) && !rogue.playbackOmniscience) {
		// if it's not visible

		needDistinctness = false;
		if (rogue.inWater) {
			applyColorAverage(cellForeColor, black, 80);
			applyColorAverage(cellBackColor, black, 80);
		} else {
			if (!cellHasTMFlag(x, y, TM_BRIGHT_MEMORY)
          && (!rogue.trueColorMode || !needDistinctness))
			{
				applyColorMultiplier(cellForeColor, memoryColor);
				applyColorAverage(cellForeColor, memoryOverlay, 25);
			}
			applyColorMultiplier(cellBackColor, memoryColor);
			applyColorAverage(cellBackColor, memoryOverlay, 25);
		}
	} else if (playerCanSeeOrSense(x, y) && rogue.playbackOmniscience && !(pmap[x][y].flags & ANY_KIND_OF_VISIBLE)) {
		// omniscience
		applyColorAugment(lightMultiplierColor, basicLightColor, 100);
		if (!rogue.trueColorMode || !needDistinctness) {
			applyColorMultiplier(cellForeColor, lightMultiplierColor);
			applyColorMultiplier(cellForeColor, omniscienceColor);
		}
    applyColorMultiplier(cellBackColor, lightMultiplierColor);
		applyColorMultiplier(cellBackColor, omniscienceColor);
	} else {
		if (!rogue.trueColorMode || !needDistinctness) {
			applyColorMultiplier(cellForeColor, lightMultiplierColor);
		}
		applyColorMultiplier(cellBackColor, lightMultiplierColor);

		if (player.status[STATUS_HALLUCINATING] && !rogue.trueColorMode) {
			randomizeColor(cellForeColor, 40 * player.status[STATUS_HALLUCINATING] / 300 + 20);
			randomizeColor(cellBackColor, 40 * player.status[STATUS_HALLUCINATING] / 300 + 20);
		}
		if (rogue.inWater) {
			applyColorMultiplier(cellForeColor, deepWaterLightColor);
			applyColorMultiplier(cellBackColor, deepWaterLightColor);
		}
	}
	// DEBUG cellBackColor.red = max(0,((scentMap[x][y] - rogue.scentTurnNumber) * 2) + 100);
	// DEBUG if (pmap[x][y].flags & KNOWN_TO_BE_TRAP_FREE) cellBackColor.red += 20;
	// DEBUG if (cellHasTerrainFlag(x, y, T_IS_FLAMMABLE)) cellBackColor.red += 50;

	if (pmap[x][y].flags & IS_IN_PATH) {
        if (cellHasTMFlag(x, y, TM_INVERT_WHEN_HIGHLIGHTED)) {
            swapColors(cellForeColor, cellBackColor);
        } else {
            if (!rogue.trueColorMode || !needDistinctness) {
                applyColorAverage(cellForeColor, yellow, rogue.cursorPathIntensity);
            }
            applyColorAverage(cellBackColor, yellow, rogue.cursorPathIntensity);
        }
		needDistinctness = true;
	}

	bakeTerrainColors(cellForeColor, cellBackColor, x, y);

    if (rogue.displayAggroRangeMode && (pmap[x][y].flags & IN_FIELD_OF_VIEW)) {
        distance = min(rogue.scentTurnNumber - scentMap[x][y], scentDistance(x, y, player.xLoc, player.yLoc));
        if (distance > rogue.aggroRange * 2) {
            applyColorAverage(cellForeColor, orange, 12);
            applyColorAverage(cellBackColor, orange, 12);
            applyColorAugment(cellForeColor, orange, 12);
            applyColorAugment(cellBackColor, orange, 12);
        }
    }

	if (rogue.trueColorMode
        && playerCanSeeOrSense(x, y))
	{
		if (displayDetail[x][y] == DV_DARK) {
      applyColorMultiplier(cellForeColor, inDarknessMultiplierColor);
      applyColorMultiplier(cellBackColor, inDarknessMultiplierColor);

			applyColorAugment(cellForeColor, purple, 10);
			applyColorAugment(cellBackColor, white, -10);
			applyColorAverage(cellBackColor, purple, 20);
		}
		else if (displayDetail[x][y] == DV_LIT)
		{
			colorMultiplierFromDungeonLight(x, y, lightMultiplierColor);
      normColor(lightMultiplierColor, 175, 50);
      //applyColorMultiplier(cellForeColor, lightMultiplierColor);
      //applyColorMultiplier(cellBackColor, lightMultiplierColor);
			applyColorAugment(cellForeColor, lightMultiplierColor, 5);
			applyColorAugment(cellBackColor, lightMultiplierColor, 5);
		}
	}

	if (needDistinctness) {
		separateColors(cellForeColor, cellBackColor);
	}

  if (D_SCENT_VISION) {
      if (rogue.scentTurnNumber > Math.floor(scentMap[x][y]) ) {
          cellBackColor.red = rogue.scentTurnNumber - Math.floor(scentMap[x][y]);
          cellBackColor.red = clamp(cellBackColor.red, 0, 100);
      } else {
          cellBackColor.green = abs(rogue.scentTurnNumber - Math.floor(scentMap[x][y]));
          cellBackColor.green = clamp(cellBackColor.green, 0, 100);
      }
  }

	CELL_APPEARANCE.char = cellChar;
	CELL_APPEARANCE.foreColor.copy(cellForeColor);
	CELL_APPEARANCE.backColor.copy(cellBackColor);

  if (D_DISABLE_BACKGROUND_COLORS) CELL_APPEARANCE.backColor.copy(black);
	// restoreRNG();

	return CELL_APPEARANCE;
}


function refreshDungeonCell(x, y) {
	let cellChar;
  brogueAssert(coordinatesAreInMap(x, y));
	const appearance = getCellAppearance(x, y);
	plotCharWithColor(appearance.char, mapToWindowX(x), mapToWindowY(y), appearance.foreColor, appearance.backColor);
}


function applyColorMultiplier(baseColor, multiplierColor) {
	baseColor.red = Math.round(baseColor.red * multiplierColor.red / 100);
	baseColor.redRand = Math.round(baseColor.redRand * multiplierColor.redRand / 100);
	baseColor.green = Math.round(baseColor.green * multiplierColor.green / 100);
	baseColor.greenRand = Math.round(baseColor.greenRand * multiplierColor.greenRand / 100);
	baseColor.blue = Math.round(baseColor.blue * multiplierColor.blue / 100);
	baseColor.blueRand = Math.round(baseColor.blueRand * multiplierColor.blueRand / 100);
	baseColor.rand = Math.round(baseColor.rand * multiplierColor.rand / 100);
	//baseColor.colorDances *= multiplierColor.colorDances;
	return;
}

function applyColorAverage(baseColor, newColor, averageWeight) {
	const weightComplement = 100 - averageWeight;
	baseColor.red = Math.round((baseColor.red * weightComplement + newColor.red * averageWeight) / 100);
	baseColor.redRand = Math.round((baseColor.redRand * weightComplement + newColor.redRand * averageWeight) / 100);
	baseColor.green = Math.round((baseColor.green * weightComplement + newColor.green * averageWeight) / 100);
	baseColor.greenRand = Math.round((baseColor.greenRand * weightComplement + newColor.greenRand * averageWeight) / 100);
	baseColor.blue = Math.round((baseColor.blue * weightComplement + newColor.blue * averageWeight) / 100);
	baseColor.blueRand = Math.round((baseColor.blueRand * weightComplement + newColor.blueRand * averageWeight) / 100);
	baseColor.rand = Math.round((baseColor.rand * weightComplement + newColor.rand * averageWeight) / 100);
	baseColor.colorDances = (baseColor.colorDances || newColor.colorDances);
	return;
}

function applyColorAugment(baseColor, augmentingColor, augmentWeight) {
	baseColor.red += Math.round((augmentingColor.red * augmentWeight) / 100);
	baseColor.redRand += Math.round((augmentingColor.redRand * augmentWeight) / 100);
	baseColor.green += Math.round((augmentingColor.green * augmentWeight) / 100);
	baseColor.greenRand += Math.round((augmentingColor.greenRand * augmentWeight) / 100);
	baseColor.blue += Math.round((augmentingColor.blue * augmentWeight) / 100);
	baseColor.blueRand += Math.round((augmentingColor.blueRand * augmentWeight) / 100);
	baseColor.rand += Math.round((augmentingColor.rand * augmentWeight) / 100);
	return;
}

function applyColorScalar(baseColor, scalar) {
	baseColor.red          = Math.round(baseColor.red        * scalar / 100);
	baseColor.redRand      = Math.round(baseColor.redRand    * scalar / 100);
	baseColor.green        = Math.round(baseColor.green      * scalar / 100);
	baseColor.greenRand    = Math.round(baseColor.greenRand  * scalar / 100);
	baseColor.blue         = Math.round(baseColor.blue       * scalar / 100);
	baseColor.blueRand     = Math.round(baseColor.blueRand   * scalar / 100);
	baseColor.rand         = Math.round(baseColor.rand       * scalar / 100);
}

function applyColorBounds(baseColor, lowerBound, upperBound) {
	baseColor.red          = clamp(baseColor.red, lowerBound, upperBound);
	baseColor.redRand      = clamp(baseColor.redRand, lowerBound, upperBound);
	baseColor.green        = clamp(baseColor.green, lowerBound, upperBound);
	baseColor.greenRand    = clamp(baseColor.greenRand, lowerBound, upperBound);
	baseColor.blue         = clamp(baseColor.blue, lowerBound, upperBound);
	baseColor.blueRand     = clamp(baseColor.blueRand, lowerBound, upperBound);
	baseColor.rand         = clamp(baseColor.rand, lowerBound, upperBound);
}

function desaturate(baseColor, weight) {
	let avg;
	avg = (baseColor.red + baseColor.green + baseColor.blue) / 3 + 1;
	baseColor.red = Math.round(baseColor.red * (100 - weight) / 100 + (avg * weight / 100));
	baseColor.green = Math.round(baseColor.green * (100 - weight) / 100 + (avg * weight / 100));
	baseColor.blue = Math.round(baseColor.blue * (100 - weight) / 100 + (avg * weight / 100));

	avg = (baseColor.redRand + baseColor.greenRand + baseColor.blueRand);
  baseColor.redRand = Math.round(baseColor.redRand * (100 - weight) / 100);
  baseColor.greenRand = Math.round(baseColor.greenRand * (100 - weight) / 100);
  baseColor.blueRand = Math.round(baseColor.blueRand * (100 - weight) / 100);

	baseColor.rand += Math.round(avg * weight / 3 / 100);
}


function randomizeByPercent(input, percent) {
	return (cosmetic_range( Math.floor(input * (100 - percent) / 100), Math.floor(input * (100 + percent) / 100)));
}

function randomizeColor(baseColor, randomizePercent) {
	baseColor.red = randomizeByPercent(baseColor.red, randomizePercent);
	baseColor.green = randomizeByPercent(baseColor.green, randomizePercent);
	baseColor.blue = randomizeByPercent(baseColor.blue, randomizePercent);
}

function swapColors(color1, color2) {
    const tempColor = color1.clone();
    color1.copy(color2);
    color2.copy(tempColor);
}


// Assumes colors are pre-baked.
function blendAppearances(/* color */ fromForeColor, /* color */ fromBackColor, fromChar,
                      /* color */ toForeColor, /* color */ toBackColor, toChar,
                      // /* color */ retForeColor, color return.backColor, uchar *retChar,
                      percent)
{
	const result = {
		foreColor: color(),
		backColor: color(),
		char: ' '
	};

  // Straight average of the back color:
  result.backColor.copy(fromBackColor);
  applyColorAverage(result.backColor, toBackColor, percent);

  // Pick the character:
  if (percent >= 50) {
      result.char = toChar;
  } else {
      result.char = fromChar;
  }

  // Pick the method for blending the fore color.
  if (fromChar == toChar) {
      // If the character isn't changing, do a straight average.
      result.foreColor.copy(fromForeColor);
      applyColorAverage(result.foreColor, toForeColor, percent);
  } else {
      // If it is changing, the first half blends to the current back color, and the second half blends to the final back color.
      if (percent >= 50) {
          result.foreColor.copy(result.backColor);
          applyColorAverage(result.foreColor, toForeColor, (percent - 50) * 2);
      } else {
          result.foreColor.copy(fromForeColor);
          applyColorAverage(result.foreColor, result.backColor, percent * 2);
      }
  }
}

async function irisFadeBetweenBuffers( fromBuf /* cellDisplayBuffer[COLS][ROWS] */,
                            toBuf, // cellDisplayBuffer[COLS][ROWS],
                            x, y,
                            frameCount,
                            outsideIn)
{
    let i, j, frame, percentBasis, thisCellPercent;
    let fastForward;
    let fromBackColor, toBackColor, fromForeColor, toForeColor, currentForeColor, currentBackColor;	// color
    let fromChar, toChar, currentChar;
    const completionMap = GRID(COLS, ROWS); // short[COLS][ROWS],
		let maxDistance;

    fastForward = false;
    frame = 1;

    // Calculate the square of the maximum distance from (x, y) that the iris will have to spread.
    if (x < COLS / 2) {
        i = COLS - x;
    } else {
        i = x;
    }
    if (y < ROWS / 2) {
        j = ROWS - y;
    } else {
        j = y;
    }
    maxDistance = i*i + j*j;

    // Generate the initial completion map as a percent of maximum distance.
    for (i=0; i<COLS; i++) {
        for (j=0; j<ROWS; j++) {
            completionMap[i][j] = (i - x)*(i - x) + (j - y)*(j - y); // square of distance
            completionMap[i][j] = Math.floor(100 * completionMap[i][j] / maxDistance); // percent of max distance
            if (outsideIn) {
                completionMap[i][j] -= 100; // translate to [-100, 0], with the origin at -100 and the farthest point at 0.
            } else {
                completionMap[i][j] *= -1; // translate to [-100, 0], with the origin at 0 and the farthest point at -100.
            }
        }
    }

    do {
        percentBasis = 10000 * frame / frameCount;

        for (i=0; i<COLS; i++) {
            for (j=0; j<ROWS; j++) {
                thisCellPercent = Math.floor(percentBasis * 3 / 100 + completionMap[i][j]);

                fromBackColor = colorFromComponents(fromBuf[i][j].backColorComponents);
                fromForeColor = colorFromComponents(fromBuf[i][j].foreColorComponents);
                fromChar = fromBuf[i][j].char;

                toBackColor = colorFromComponents(toBuf[i][j].backColorComponents);
                toForeColor = colorFromComponents(toBuf[i][j].foreColorComponents);
                toChar = toBuf[i][j].char;

                const app = blendAppearances(fromForeColor, fromBackColor, fromChar, toForeColor, toBackColor, toChar, clamp(thisCellPercent, 0, 100));
								currentBackColor = app.backColor;
								currentForeColor = app.foreColor;
								currentChar = app.char;
                plotCharWithColor(currentChar, i, j, currentForeColor, currentBackColor);
            }
        }

        fastForward = await pauseBrogue(10);
        frame++;
    } while (frame <= frameCount && !fastForward);
    overlayDisplayBuffer(toBuf, NULL);
}

// takes dungeon coordinates
function colorBlendCell(x, y, /* color */ hiliteColor, hiliteStrength) {
	let displayChar;
	// let foreColor, backColor;

	const app = getCellAppearance(x, y);
	applyColorAverage(app.foreColor, hiliteColor, hiliteStrength);
	applyColorAverage(app.backColor, hiliteColor, hiliteStrength);
	plotCharWithColor(app.char, mapToWindowX(x), mapToWindowY(y), app.foreColor, app.backColor);
}


// takes dungeon coordinates
function hiliteCell(x, y, /* color */ hiliteColor, hiliteStrength, distinctColors) {
	let displayChar;
	let foreColor, backColor;

	// assureCosmeticRNG();

	let appearance = getCellAppearance(x, y);
	applyColorAugment(appearance.foreColor, hiliteColor, hiliteStrength);
	applyColorAugment(appearance.backColor, hiliteColor, hiliteStrength);
	if (distinctColors) {
		separateColors(appearance.foreColor, appearance.backColor);
	}
	// restoreRNG();

	plotCharWithColor(appearance.char, mapToWindowX(x), mapToWindowY(y), appearance.foreColor, appearance.backColor);

}

function adjustedLightValue(x) {
    if (x <= LIGHT_SMOOTHING_THRESHOLD) {
        return x;
    } else {
        return fp_sqrt( Math.floor((x << FP_BASE)/LIGHT_SMOOTHING_THRESHOLD) ) * LIGHT_SMOOTHING_THRESHOLD >> FP_BASE;
    }
}

function colorMultiplierFromDungeonLight(x, y, /* color */ editColor) {

	editColor.red		= editColor.redRand		= adjustedLightValue(max(0, tmap[x][y].light[0]));
	editColor.green	= editColor.greenRand	= adjustedLightValue(max(0, tmap[x][y].light[1]));
	editColor.blue	= editColor.blueRand	= adjustedLightValue(max(0, tmap[x][y].light[2]));

	editColor.rand = adjustedLightValue(max(0, tmap[x][y].light[0] + tmap[x][y].light[1] + tmap[x][y].light[2]) / 3);
	editColor.colorDances = false;
}

function plotCharWithColor(inputChar, xLoc, yLoc, /* color */ cellForeColor, /* color */ cellBackColor) {

	let foreRed = cellForeColor.red,
	foreGreen = cellForeColor.green,
	foreBlue = cellForeColor.blue,

	backRed = cellBackColor.red,
	backGreen = cellBackColor.green,
	backBlue = cellBackColor.blue,

	foreRand, backRand;

  brogueAssert(coordinatesAreInWindow(xLoc, yLoc));

	if (rogue.gameHasEnded || rogue.playbackFastForward) {
		return;
	}

  // assureCosmeticRNG();

	foreRand = cosmetic_range(0, cellForeColor.rand);
	backRand = cosmetic_range(0, cellBackColor.rand);
	foreRed += cosmetic_range(0, cellForeColor.redRand) + foreRand;
	foreGreen += cosmetic_range(0, cellForeColor.greenRand) + foreRand;
	foreBlue += cosmetic_range(0, cellForeColor.blueRand) + foreRand;
	backRed += cosmetic_range(0, cellBackColor.redRand) + backRand;
	backGreen += cosmetic_range(0, cellBackColor.greenRand) + backRand;
	backBlue += cosmetic_range(0, cellBackColor.blueRand) + backRand;

	foreRed =		min(100, max(0, foreRed));
	foreGreen =		min(100, max(0, foreGreen));
	foreBlue =		min(100, max(0, foreBlue));
	backRed =		min(100, max(0, backRed));
	backGreen =		min(100, max(0, backGreen));
	backBlue =		min(100, max(0, backBlue));

	if (inputChar != ' '
		&& foreRed		== backRed
		&& foreGreen	== backGreen
		&& foreBlue		== backBlue)
  {
		inputChar = ' ';
	}

	if (inputChar		!= displayBuffer[xLoc][yLoc].char
		|| foreRed		!= displayBuffer[xLoc][yLoc].foreColorComponents[0]
		|| foreGreen	!= displayBuffer[xLoc][yLoc].foreColorComponents[1]
		|| foreBlue		!= displayBuffer[xLoc][yLoc].foreColorComponents[2]
		|| backRed		!= displayBuffer[xLoc][yLoc].backColorComponents[0]
		|| backGreen	!= displayBuffer[xLoc][yLoc].backColorComponents[1]
		|| backBlue		!= displayBuffer[xLoc][yLoc].backColorComponents[2])
  {
		displayBuffer[xLoc][yLoc].needsUpdate = true;

		displayBuffer[xLoc][yLoc].char = inputChar;
		displayBuffer[xLoc][yLoc].foreColorComponents[0] = foreRed;
		displayBuffer[xLoc][yLoc].foreColorComponents[1] = foreGreen;
		displayBuffer[xLoc][yLoc].foreColorComponents[2] = foreBlue;
		displayBuffer[xLoc][yLoc].backColorComponents[0] = backRed;
		displayBuffer[xLoc][yLoc].backColorComponents[1] = backGreen;
		displayBuffer[xLoc][yLoc].backColorComponents[2] = backBlue;
	}

	// restoreRNG();
}

function plotCharToBuffer(inputChar, x, y, /* color */ foreColor, /* color */ backColor,  dbuf /* cellDisplayBuffer[COLS][ROWS] */) {

  if (!dbuf) {
		plotCharWithColor(inputChar, x, y, foreColor, backColor);
		return;
	}

  brogueAssert(coordinatesAreInWindow(x, y));

	// oldRNG = rogue.RNG;
  // rogue.RNG = RNG_COSMETIC;
	// assureCosmeticRNG();

  const foreRand = cosmetic_range(0, foreColor.rand);
	const backRand = cosmetic_range(0, backColor.rand);

  dbuf[x][y].char = inputChar;
	dbuf[x][y].foreColorComponents[0] = foreColor.red + cosmetic_range(0, foreColor.redRand) + foreRand;
	dbuf[x][y].foreColorComponents[1] = foreColor.green + cosmetic_range(0, foreColor.greenRand) + foreRand;
	dbuf[x][y].foreColorComponents[2] = foreColor.blue + cosmetic_range(0, foreColor.blueRand) + foreRand;
	dbuf[x][y].backColorComponents[0] = backColor.red + cosmetic_range(0, backColor.redRand) + backRand;
	dbuf[x][y].backColorComponents[1] = backColor.green + cosmetic_range(0, backColor.greenRand) + backRand;
	dbuf[x][y].backColorComponents[2] = backColor.blue + cosmetic_range(0, backColor.blueRand) + backRand;
	dbuf[x][y].opacity = 100;
  dbuf[x][y].needsUpdate = true;

  // restoreRNG();
}

function plotForegroundChar( inputChar, x, y, /* color */foreColor, affectedByLighting) {
    const multColor = color(), myColor = color();
    let ignoredChar;

    myColor.copy(foreColor);
    const app = getCellAppearance(x, y);
    if (affectedByLighting) {
        colorMultiplierFromDungeonLight(x, y, multColor);
        applyColorMultiplier(myColor, multColor);
    }
    plotCharWithColor(inputChar, mapToWindowX(x), mapToWindowY(y), myColor, app.backColor);
}

// Set to false and draws don't take effect, they simply queue up. Set to true and all of the
// queued up draws take effect.
function commitDraws() {
	// let i, j;
	// let tempFore = color();
	// let tempBack = color();
	//
	// for (i=0; i<COLS; i++) {
	// 	for (j=0; j<ROWS; j++) {
	// 		if (displayBuffer[i][j].needsUpdate) {
	// 			plotChar(displayBuffer[i][j].char, i, j,
	// 					 displayBuffer[i][j].foreColorComponents[0],
	// 					 displayBuffer[i][j].foreColorComponents[1],
	// 					 displayBuffer[i][j].foreColorComponents[2],
	// 					 displayBuffer[i][j].backColorComponents[0],
	// 					 displayBuffer[i][j].backColorComponents[1],
	// 					 displayBuffer[i][j].backColorComponents[2]);
	// 			displayBuffer[i][j].needsUpdate = false;
	// 		}
	// 	}
	// }
}

// Debug feature: display the level to the screen without regard to lighting, field of view, etc.
function dumpLevelToScreen() {
	let i, j;
	let backup = pcell();

	// assureCosmeticRNG();
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			// if (pmap[i][j].layers[DUNGEON] != GRANITE
      //     || (pmap[i][j].flags & DISCOVERED))
			// {
				Object.assign(backup, pmap[i][j]);
				pmap[i][j].flags |= (VISIBLE | DISCOVERED);
				tmap[i][j].light[0] = 100;
				tmap[i][j].light[1] = 100;
				tmap[i][j].light[2] = 100;
				refreshDungeonCell(i, j);
				Object.assign(pmap[i][j], backup);
			// } else {
			// 	plotCharWithColor(' ', mapToWindowX(i), mapToWindowY(j), white, black);
			// }

		}
	}
	// restoreRNG();
}

// To be used immediately after dumpLevelToScreen() above.
// Highlight the portion indicated by hiliteCharGrid with the hiliteColor at the hiliteStrength -- both latter arguments are optional.
function hiliteCharGrid( hiliteCharGrid /* char[DCOLS][DROWS] */, /* color */ hiliteColor, hiliteStrength) {
	let i, j, x, y;
	let hCol;

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
			if (hiliteCharGrid[i][j]) {
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


function blackOutScreen() {
	let i, j;

	for (i=0; i<COLS; i++) {
		for (j=0; j<ROWS; j++) {
			plotCharWithColor(' ', i, j, black, black);
		}
	}
}


function colorOverDungeon( /* const color */color) {
	let i, j;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			plotCharWithColor(' ', mapToWindowX(i), mapToWindowY(j), color, color);
		}
	}
}


function copyDisplayBuffer( toBuf /* cellDisplayBuffer[COLS][ROWS] */, fromBuf /* cellDisplayBuffer[COLS][ROWS] */) {
	let i, j, k;

	for (i=0; i<COLS; i++) {
		for (j=0; j<ROWS; j++) {
			toBuf[i][j].char = fromBuf[i][j].char;
      for(k = 0; k < 3; ++k) {
        toBuf[i][j].foreColorComponents[k] = fromBuf[i][j].foreColorComponents[k];
        toBuf[i][j].backColorComponents[k] = fromBuf[i][j].backColorComponents[k];
      }
      toBuf[i][j].opacity = fromBuf[i][j].opacity;
      toBuf[i][j].needsUpdate = fromBuf[i][j].needsUpdate;
		}
	}
}

function clearDisplayBuffer( dbuf /* cellDisplayBuffer[COLS][ROWS] */) {
	let i, j, k;

	dbuf = dbuf || displayBuffer;

	for (i=0; i<COLS; i++) {
		for (j=0; j<ROWS; j++) {
			dbuf[i][j].char = ' ';
			for (k=0; k<3; k++) {
				dbuf[i][j].foreColorComponents[k] = 0;
				dbuf[i][j].backColorComponents[k] = 0;
			}
			dbuf[i][j].opacity = 0;
		}
	}
}

function colorFromComponents( rgb /* char[3] */) {
	let theColor = color();
	theColor.red	= rgb[0];
	theColor.green	= rgb[1];
	theColor.blue	= rgb[2];
	return theColor;
}

// draws overBuf over the current display with per-cell pseudotransparency as specified in overBuf.
// If previousBuf is not null, it gets filled with the preexisting display for reversion purposes.
function overlayDisplayBuffer( overBuf /* cellDisplayBuffer[COLS][ROWS] */,  previousBuf /* cellDisplayBuffer[COLS][ROWS]*/) {
	let i, j;
	let foreColor, backColor, tempColor;
	let character;

	if (previousBuf) {
		copyDisplayBuffer(previousBuf, displayBuffer);
	}

	for (i=0; i<COLS; i++) {
		for (j=0; j<ROWS; j++) {

			if (overBuf[i][j].opacity != 0) {
				backColor = colorFromComponents(overBuf[i][j].backColorComponents);

				if (overBuf[i][j].char === 0) {
					throw new Error('Where is this coming from!');
				}

				// character and fore color:
				if (overBuf[i][j].char == ' ') { // Blank cells in the overbuf take the character from the screen.
					character = displayBuffer[i][j].char;
					foreColor = colorFromComponents(displayBuffer[i][j].foreColorComponents);
					applyColorAverage(foreColor, backColor, overBuf[i][j].opacity);
				} else {
					character = overBuf[i][j].char;
					foreColor = colorFromComponents(overBuf[i][j].foreColorComponents);
				}

				// back color:
				tempColor = colorFromComponents(displayBuffer[i][j].backColorComponents);
				applyColorAverage(backColor, tempColor, 100 - overBuf[i][j].opacity);

				plotCharWithColor(character, i, j, foreColor, backColor);
			}
		}
	}
}


// Takes a list of locations, a color and a list of strengths and flashes the foregrounds of those locations.
// Strengths are percentages measuring how hard the color flashes at its peak.
async function flashForeground(/* short[] */ x, /* short[] */ y, /* color[] */ flashColor, /* short[] */ flashStrength, count, frames) {
	let i, j, percent;
	let displayChar;	// uchar *
	let bColor, fColor, newColor = color();
  // short oldRNG;

	if (count <= 0) {
		return;
	}

	// oldRNG = rogue.RNG;
  // rogue.RNG = RNG_COSMETIC;
	// assureCosmeticRNG();

	displayChar = ARRAY(count); // (uchar *) malloc(count * sizeof(uchar));
	fColor = ARRAY(count, color); // (color *) malloc(count * sizeof(color));
	bColor = ARRAY(count, color); // (color *) malloc(count * sizeof(color));

	for (i=0; i<count; i++) {
		const app = getCellAppearance(x[i], y[i]);
		displayChar[i] = app.char;
		fColor[i].copy(app.foreColor);
		bColor[i].copy(app.backColor);
		bakeColor(fColor[i]);
		bakeColor(bColor[i]);
	}

	// restoreRNG();

	for (j=frames; j>= 0; j--) {
		// assureCosmeticRNG();
		for (i=0; i<count; i++) {
			percent = flashStrength[i] * j / frames;
			newColor.copy(fColor[i]);
			applyColorAverage(newColor, flashColor[i], percent);
			plotCharWithColor(displayChar[i], mapToWindowX(x[i]), mapToWindowY(y[i]), newColor, (bColor[i]));
		}
		// restoreRNG();
		if (j) {
			if (await pauseBrogue(16)) {
				j = 1;
			}
		}
	}

	// free(displayChar);
	// free(fColor);
	// free(bColor);

	// restoreRNG();
}

async function flashCell( /* color */ theColor, frames, x, y) {
	let i;
	let interrupted = false;

	for (i=0; i<frames && !interrupted; i++) {
		colorBlendCell(x, y, theColor, 100 - 100 * i / frames);
		interrupted = await pauseBrogue(50);
	}

	refreshDungeonCell(x, y);
}

// special effect expanding flash of light at dungeon coordinates (x, y) restricted to tiles with matching flags
async function colorFlash( /* color */ theColor, reqTerrainFlags, reqTileFlags, frames, maxRadius, x, y)
{
	let i, j, k, intensity, currentRadius, fadeOut;
	let localRadius = GRID(DCOLS, DROWS); // short[DCOLS][DROWS];
	let tileQualifies = GRID(DCOLS, DROWS); // boolean[DCOLS][DROWS],
	let aTileQualified, fastForward;

	aTileQualified = false;
	fastForward = false;
	maxRadius = Math.floor(maxRadius);

	for (i = max(x - maxRadius, 0); i <= min(x + maxRadius, DCOLS - 1); i++) {
		for (j = max(y - maxRadius, 0); j <= min(y + maxRadius, DROWS - 1); j++) {
			if ((!reqTerrainFlags || cellHasTerrainFlag(reqTerrainFlags, i, j))
				&& (!reqTileFlags || (pmap[i][j].flags & reqTileFlags))
				&& (i-x) * (i-x) + (j-y) * (j-y) <= maxRadius * maxRadius)
			{
				tileQualifies[i][j] = true;
				localRadius[i][j] = fp_sqrt((i-x) * (i-x) + (j-y) * (j-y) << FP_BASE) >> FP_BASE;
				aTileQualified = true;
			} else {
				tileQualifies[i][j] = false;
			}
		}
	}

	if (!aTileQualified) {
		return;
	}

	for (k = 1; k <= frames; k++) {
		currentRadius = max(1, maxRadius * k / frames);
		fadeOut = min(100, (frames - k) * 100 * 5 / frames);
		for (i = max(x - maxRadius, 0); i <= min(x + maxRadius, DCOLS - 1); i++) {
			for (j = max(y - maxRadius, 0); j <= min(y + maxRadius, DROWS - 1); j++) {
				if (tileQualifies[i][j] && (localRadius[i][j] <= currentRadius))
				{
					intensity = 100 - 100 * (currentRadius - localRadius[i][j] - 2) / currentRadius;
					intensity = fadeOut * intensity / 100;

					hiliteCell(i, j, theColor, intensity, false);
				}
			}
		}
		if (!fastForward && (rogue.playbackFastForward || await pauseBrogue(50))) {
			k = frames - 1;
			fastForward = true;
		}
	}

}

function bCurve(x) { return (((x) * (x) + 11) / (10 * ((x) * (x) + 1)) - 0.1); }

const WEIGHT_GRID = GRID(COLS, ROWS, () => [0,0,0] ); // [COLS][ROWS][3],


// x and y are global coordinates, not within the playing square
async function funkyFade( displayBuf /* cellDisplayBuffer[COLS][ROWS] */, /* color */ colorStart,
			   /* color */ colorEnd, stepCount, x, y, invert)
{
	let i, j, n, weight;
	let x2, y2;
  let percentComplete;
	let tempColor = color(), colorMid = color(), foreColor = color(), backColor = color();
	let tempChar;
	let distanceMap;
	let fastForward;

// #ifdef BROGUE_LIBTCOD
// 	stepCount *= 15; // libtcod displays much faster
// #endif

	fastForward = false;
	distanceMap = allocGrid();
	fillGrid(distanceMap, 0);
	calculateDistances(distanceMap, player.xLoc, player.yLoc, T_OBSTRUCTS_PASSABILITY, 0, true, true);

	for (i=0; i<COLS; i++) {
		x2 = ((i - x) * 5.0 / COLS);
		for (j=0; j<ROWS; j++) {
			y2 = ((j - y) * 2.5 / ROWS);

			WEIGHT_GRID[i][j][0] = bCurve(x2*x2+y2*y2) * (.7 + .3 * cos(5*x2*x2) * cos(5*y2*y2));
			WEIGHT_GRID[i][j][1] = bCurve(x2*x2+y2*y2) * (.7 + .3 * sin(5*x2*x2) * cos(5*y2*y2));
			WEIGHT_GRID[i][j][2] = bCurve(x2*x2+y2*y2);
		}
	}


	for (n=(invert ? stepCount - 1 : 0); (invert ? n >= 0 : n <= stepCount); n += (invert ? -1 : 1)) {

		// assureCosmeticRNG();

		for (i=0; i<COLS; i++) {
			for (j=0; j<ROWS; j++) {

				percentComplete = (n) * 100 / stepCount;

				colorMid.copy(colorStart);
				if (colorEnd) {
					applyColorAverage(colorMid, colorEnd, n * 100 / stepCount);
				}

				// the fade color floods the reachable dungeon tiles faster
				if (!invert && coordinatesAreInMap(windowToMapX(i), windowToMapY(j))
					&& distanceMap[windowToMapX(i)][windowToMapY(j)] >= 0 && distanceMap[windowToMapX(i)][windowToMapY(j)] < 30000)
				{
					percentComplete *= 1.0 + (100.0 - min(100, distanceMap[windowToMapX(i)][windowToMapY(j)])) / 100.;
				}

				weight = Math.floor(percentComplete + WEIGHT_GRID[i][j][2] * percentComplete * 10);
				weight = min(100, weight);
				tempColor.copy(black);

				tempColor.red = Math.floor((percentComplete + WEIGHT_GRID[i][j][0] * percentComplete * 10) * colorMid.red / 100);
				tempColor.red = min(colorMid.red, tempColor.red);

				tempColor.green = Math.floor((percentComplete + WEIGHT_GRID[i][j][1] * percentComplete * 10) * colorMid.green / 100);
				tempColor.green = min(colorMid.green, tempColor.green);

				tempColor.blue = Math.floor((percentComplete + WEIGHT_GRID[i][j][2] * percentComplete * 10) * colorMid.blue / 100);
				tempColor.blue = min(colorMid.blue, tempColor.blue);

				backColor.copy(black);

				backColor.red = displayBuf[i][j].backColorComponents[0];
				backColor.green = displayBuf[i][j].backColorComponents[1];
				backColor.blue = displayBuf[i][j].backColorComponents[2];

				foreColor.copy(invert ? white : black);

				if (j < MESSAGE_LINES
					&& i >= mapToWindowX(0)
					&& i < mapToWindowX(strLenWithoutEscapes(displayedMessage[MESSAGE_LINES - j - 1])))
				{
					tempChar = displayedMessage[MESSAGE_LINES - j - 1].charAt(windowToMapX(i));
				} else {
					tempChar = displayBuf[i][j].char;

					foreColor.red = displayBuf[i][j].foreColorComponents[0];
					foreColor.green = displayBuf[i][j].foreColorComponents[1];
					foreColor.blue = displayBuf[i][j].foreColorComponents[2];

					applyColorAverage(foreColor, tempColor, weight);
				}
				applyColorAverage(backColor, tempColor, weight);
				plotCharWithColor(tempChar, i, j, foreColor, backColor);
			}
		}
		// restoreRNG();
		if (!fastForward && await pauseBrogue(16)) {
			fastForward = true;
			n = (invert ? 1 : stepCount - 2);
		}
	}

	freeGrid(distanceMap);

}


async function displayWaypoints() {
    let i, j, w, lowestDistance;

    for (i=0; i<DCOLS; i++) {
        for (j=0; j<DROWS; j++) {
            lowestDistance = 30000;
            for (w=0; w<rogue.wpCount; w++) {
                if (rogue.wpDistance[w][i][j] < lowestDistance) {
                    lowestDistance = rogue.wpDistance[w][i][j];
                }
            }
            if (lowestDistance < 10) {
                hiliteCell(i, j, white, clamp(100 - lowestDistance*15, 0, 100), true);
            }
        }
    }
    await temporaryMessage("Waypoints:", true);
}


async function displayMachines() {
	let i, j;
	let foreColor, backColor, machineColors = [];
	let dchar;

	// assureCosmeticRNG();

	for (i=0; i<50; i++) {
		machineColors[i] = color();
		machineColors[i].red = cosmetic_range(0, 100);
		machineColors[i].green = cosmetic_range(0, 100);
		machineColors[i].blue = cosmetic_range(0, 100);
	}

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (pmap[i][j].machineNumber) {
				const app = getCellAppearance(i, j);
				applyColorAugment(app.backColor, machineColors[pmap[i][j].machineNumber], 50);
				//plotCharWithColor(dchar, mapToWindowX(i), mapToWindowY(j), &foreColor, &backColor);
          if (pmap[i][j].machineNumber < 10) {
              dchar = String.fromCharCode('0'.charCodeAt(0) + pmap[i][j].machineNumber);
          } else if (pmap[i][j].machineNumber < 10 + 26) {
              dchar = String.fromCharCode('a'.charCodeAt(0) + pmap[i][j].machineNumber - 10);
          } else {
              dchar = String.fromCharCode('A'.charCodeAt(0) + pmap[i][j].machineNumber - 10 - 26);
          }
          plotCharWithColor(dchar, mapToWindowX(i), mapToWindowY(j), app.foreColor, app.backColor);
			}
		}
	}

	// restoreRNG();

	await displayMoreSign();
	displayLevel();

}

const CHOKEMAP_DISPLAY_CUTOFF	 = 160;

async function displayChokeMap() {
	let i, j;
	let foreColor, backColor;
	let dchar;
	let app;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (chokeMap[i][j] < CHOKEMAP_DISPLAY_CUTOFF) {
				if (pmap[i][j].flags & IS_GATE_SITE) {
					app = getCellAppearance(i, j);
					applyColorAugment(app.backColor, teal, 50);
					plotCharWithColor(app.char, mapToWindowX(i), mapToWindowY(j), app.foreColor, app.backColor);
				} else
					if (chokeMap[i][j] < CHOKEMAP_DISPLAY_CUTOFF) {
					app = getCellAppearance(i, j);
					applyColorAugment(app.backColor, red, 100 - chokeMap[i][j] * 100 / CHOKEMAP_DISPLAY_CUTOFF);
					plotCharWithColor(app.char, mapToWindowX(i), mapToWindowY(j), app.foreColor, app.backColor);
				}
			}
		}
	}
	await displayMoreSign();
	displayLevel();
}

async function displayLoops() {
	let i, j;
	let foreColor, backColor;
	let dchar;
	let app;

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (pmap[i][j].flags & IN_LOOP) {
				app = getCellAppearance(i, j);
				applyColorAugment(app.backColor, yellow, 50);
				plotCharWithColor(app.char, mapToWindowX(i), mapToWindowY(j), app.foreColor, app.backColor);
				//colorBlendCell(i, j, &tempColor, 100);//hiliteCell(i, j, &tempColor, 100, true);
			}
			if (pmap[i][j].flags & IS_CHOKEPOINT) {
				getCellAppearance(i, j);
				applyColorAugment(app.backColor, teal, 50);
				plotCharWithColor(app.char, mapToWindowX(i), mapToWindowY(j), app.foreColor, app.backColor);
			}
		}
	}
	await waitForAcknowledgment();
}

async function exploreKey(controlKey) {
  let x, y, finalX, finalY;
  let exploreMap;
  let dir;
  let tooDark = false;

  // fight any adjacent enemies first
  dir = adjacentFightingDir();
  if (dir == NO_DIRECTION) {
      for (dir = 0; dir < DIRECTION_COUNT; dir++) {
          x = player.xLoc + nbDirs[dir][0];
          y = player.yLoc + nbDirs[dir][1];
          if (coordinatesAreInMap(x, y)
              && !(pmap[x][y].flags & DISCOVERED))
					{
              tooDark = true;
              break;
          }
      }
      if (!tooDark) {
          x = finalX = player.xLoc;
          y = finalY = player.yLoc;

          exploreMap = allocGrid();
          getExploreMap(exploreMap, false);
          do {
              dir = nextStep(exploreMap, x, y, NULL, false);
              if (dir != NO_DIRECTION) {
                  x += nbDirs[dir][0];
                  y += nbDirs[dir][1];
                  if (pmap[x][y].flags & (DISCOVERED | MAGIC_MAPPED)) {
                      finalX = x;
                      finalY = y;
                  }
              }
          } while (dir != NO_DIRECTION);
          freeGrid(exploreMap);
      }
  } else {
      x = finalX = player.xLoc + nbDirs[dir][0];
      y = finalY = player.yLoc + nbDirs[dir][1];
  }

  if (tooDark) {
      message("It's too dark to explore!", false);
  } else if (x == player.xLoc && y == player.yLoc) {
      message("I see no path for further exploration.", false);
  } else if (proposeOrConfirmLocation(finalX, finalY, "I see no path for further exploration.")) {
      await explore(controlKey ? 1 : 20); // Do the exploring until interrupted.
      hideCursor();
      await exploreKey(controlKey);
  }
}


function pausingTimerStartsNow() {
	// NULL
}




async function pauseBrogue(milliseconds, wantMouseMoves) {
	let interrupted = false;

	commitDraws();
	if (rogue.playbackMode && rogue.playbackFastForward) {
    interrupted = true;
	} else {
		interrupted = await pauseForMilliseconds(milliseconds, wantMouseMoves);
	}
	// pausingTimerStartsNow();
	return interrupted;
}


async function nextBrogueEvent( returnEvent, textInput, colorsDance, realInputEvenInPlayback ) {
	const recordingInput = rogueEvent();
	let repeatAgain;
	let pauseDuration;

	returnEvent.eventType = EVENT_ERROR;

	if (rogue.playbackMode && !realInputEvenInPlayback) {
		do {
			repeatAgain = false;
			if ((!rogue.playbackFastForward && rogue.playbackBetweenTurns)
				|| rogue.playbackOOS)
			{
				pauseDuration = (rogue.playbackPaused ? DEFAULT_PLAYBACK_DELAY : rogue.playbackDelayThisTurn);
				if (pauseDuration && await pauseBrogue(pauseDuration)) {
					// if the player did something during playback
					await nextBrogueEvent(recordingInput, false, false, true);
					await executePlaybackInput(recordingInput);
					repeatAgain = !rogue.playbackPaused;
				}
			}
		} while ((repeatAgain || rogue.playbackOOS) && !rogue.gameHasEnded);
		rogue.playbackDelayThisTurn = rogue.playbackDelayPerTurn;
		recallEvent(returnEvent);
	} else {
		commitDraws();
		if (rogue.creaturesWillFlashThisTurn) {
			await displayMonsterFlashes(true);
		}
		do {
			await nextKeyOrMouseEvent(returnEvent, textInput, colorsDance); // No mouse clicks outside of the window will register.
		} while (returnEvent.eventType == MOUSE_UP && !coordinatesAreInWindow(returnEvent.param1, returnEvent.param2));
		// recording done elsewhere
		// console.log('nextBrogueEvent', returnEvent.eventType);
	}

	if (returnEvent.eventType == EVENT_ERROR) {
		rogue.playbackPaused = rogue.playbackMode; // pause if replaying
		ERROR("Event error!", true);
	}
}


async function executeMouseClick( /* rogueEvent */ theEvent) {
	let x, y;
	let autoConfirm;
	x = theEvent.param1;
	y = theEvent.param2;
	autoConfirm = theEvent.controlKey;

	if (theEvent.eventType == RIGHT_MOUSE_UP) {
		await displayInventory(ALL_ITEMS, 0, 0, true, true);
	} else if (coordinatesAreInMap(windowToMapX(x), windowToMapY(y))) {
		if (autoConfirm) {
			// await travel(windowToMapX(x), windowToMapY(y), autoConfirm);
		} else {
			rogue.cursorLoc[0] = windowToMapX(x);
			rogue.cursorLoc[1] = windowToMapY(y);
			// await mainInputLoop();
		}

	} else if (windowToMapX(x) >= 0 && windowToMapX(x) < DCOLS && y >= 0 && y < MESSAGE_LINES) {
		// If the click location is in the message block, display the message archive.
		await displayMessageArchive();
	}
}

async function executeKeystroke( keystroke, controlKey, shiftKey) {
	let path; // char[BROGUE_FILENAME_MAX];
	let direction = -1;

	confirmMessages();
	keystroke = stripShiftFromMovementKeystroke(keystroke);

	switch (keystroke) {
		case UP_KEY:
		case UP_ARROW:
		case NUMPAD_8:
			direction = UP;
			break;
		case DOWN_KEY:
		case DOWN_ARROW:
		case NUMPAD_2:
			direction = DOWN;
			break;
		case LEFT_KEY:
		case LEFT_ARROW:
		case NUMPAD_4:
			direction = LEFT;
			break;
		case RIGHT_KEY:
		case RIGHT_ARROW:
		case NUMPAD_6:
			direction = RIGHT;
			break;
		case NUMPAD_7:
		case UPLEFT_KEY:
			direction = UPLEFT;
			break;
		case UPRIGHT_KEY:
		case NUMPAD_9:
			direction = UPRIGHT;
			break;
		case DOWNLEFT_KEY:
		case NUMPAD_1:
			direction = DOWNLEFT;
			break;
		case DOWNRIGHT_KEY:
		case NUMPAD_3:
			direction = DOWNRIGHT;
			break;
		case DESCEND_KEY:
			considerCautiousMode();
			if (D_WORMHOLING) {
				recordKeystroke(DESCEND_KEY, false, false);
				await useStairs(1);
			} else if (proposeOrConfirmLocation(rogue.downLoc[0], rogue.downLoc[1], "I see no way down.")) {
		    await travel(rogue.downLoc[0], rogue.downLoc[1], true);
			}
			break;
		case ASCEND_KEY:
			considerCautiousMode();
			if (D_WORMHOLING) {
				recordKeystroke(ASCEND_KEY, false, false);
				await useStairs(-1);
			} else if (proposeOrConfirmLocation(rogue.upLoc[0], rogue.upLoc[1], "I see no way up.")) {
		    await travel(rogue.upLoc[0], rogue.upLoc[1], true);
			}
			break;
    case RETURN_KEY:
        showCursor();
        break;
		case REST_KEY:
		case PERIOD_KEY:
		case NUMPAD_5:
			considerCautiousMode();
			rogue.justRested = true;
			recordKeystroke(REST_KEY, false, false);
			await playerTurnEnded();
			break;
		case AUTO_REST_KEY:
			rogue.justRested = true;
			await autoRest();
			break;
		case SEARCH_KEY:
			await manualSearch();
			break;
		case INVENTORY_KEY:
			await displayInventory(ALL_ITEMS, 0, 0, true, true);
			break;
		case EQUIP_KEY:
			await equip(NULL);
			break;
		case UNEQUIP_KEY:
			await unequip(NULL);
			break;
		case DROP_KEY:
			await drop(NULL);
			break;
		case APPLY_KEY:
			await apply(NULL, true);
			break;
		case THROW_KEY:
			await throwCommand(NULL);
			break;
    case RELABEL_KEY:
        await relabel(NULL);
        break;
		case TRUE_COLORS_KEY:
			rogue.trueColorMode = !rogue.trueColorMode;
			displayLevel();
			refreshSideBar(-1, -1, false);
			if (rogue.trueColorMode) {
				message(KEYBOARD_LABELS ? "Color effects disabled. Press '\\' again to enable." : "Color effects disabled.",
                                 teal, false);
			} else {
				message(KEYBOARD_LABELS ? "Color effects enabled. Press '\\' again to disable." : "Color effects enabled.",
                                 teal, false);
			}
			break;
		case AGGRO_DISPLAY_KEY:
			rogue.displayAggroRangeMode = !rogue.displayAggroRangeMode;
			displayLevel();
			refreshSideBar(-1, -1, false);
			if (rogue.displayAggroRangeMode) {
          message(KEYBOARD_LABELS ? "Stealth range displayed. Press ']' again to hide." : "Stealth range displayed.",
                           teal, false);
      } else {
          message(KEYBOARD_LABELS ? "Stealth range hidden. Press ']' again to display." : "Stealth range hidden.",
                           teal, false);
			}
			break;
		// case WARNING_PAUSE_KEY:
		// 	rogue.warningPauseMode = !rogue.warningPauseMode;
		// 	if (rogue.warningPauseMode) {
    //     message(KEYBOARD_LABELS ? "Low hitpoint warnings (paused) enabled. Press '[' again to disable." : "Low HP warnings (paused) activated.",
    //                      teal, false);
    //   } else {
    //     message(KEYBOARD_LABELS ? "Low hitpoint warnings (paused) disabled. Press '[' again to enable." : "Low HP warnings (paused) deactivated.",
    //                      teal, false);
		// 	}
		// 	break;
		case CALL_KEY:
			await call(NULL);
			break;
		case EXPLORE_KEY:
			considerCautiousMode();
      await exploreKey(controlKey);
			break;
		// case AUTOPLAY_KEY:
		// 	autoPlayLevel(controlKey);
		// 	break;
		case MESSAGE_ARCHIVE_KEY:
			await displayMessageArchive();
			break;
		case HELP_KEY:
			await printHelpScreen();
			break;
		case DISCOVERIES_KEY:
			await printDiscoveriesScreen();
			break;
		// case VIEW_RECORDING_KEY:
		// 	if (rogue.playbackMode) {
		// 		return;
		// 	}
		// 	if (noSaves) {
    //     return;
    //   }
		// 	confirmMessages();
		// 	if ((rogue.playerTurnNumber < 50 || confirm("End this game and view a recording?", false))
		// 		&& dialogChooseFile(path, RECORDING_SUFFIX, "View recording: ")) {
		// 		if (fileExists(path)) {
		// 			strcpy(rogue.nextGamePath, path);
		// 			rogue.nextGame = NG_VIEW_RECORDING;
		// 			rogue.gameHasEnded = true;
		// 		} else {
		// 			message("File not found.", false);
		// 		}
		// 	}
		// 	break;
		// case LOAD_SAVED_GAME_KEY:
		// 	if (rogue.playbackMode) {
		// 		return;
		// 	}
		// 	if (noSaves) {
    //     return;
    //   }
		// 	confirmMessages();
		// 	if ((rogue.playerTurnNumber < 50 || confirm("End this game and load a saved game?", false))
		// 		&& dialogChooseFile(path, GAME_SUFFIX, "Open saved game: ")) {
		// 		if (fileExists(path)) {
		// 			strcpy(rogue.nextGamePath, path);
		// 			rogue.nextGame = NG_OPEN_GAME;
		// 			rogue.gameHasEnded = true;
		// 		} else {
		// 			message("File not found.", false);
		// 		}
		// 	}
		// 	break;
		// case SAVE_GAME_KEY:
		// 	if (rogue.playbackMode) {
		// 		return;
		// 	}
		// 	if (noSaves) {
		// 	  return;
		// 	}
		// 	if (confirm("Suspend this game? (This feature is still in beta.)", false)) {
		// 		saveGame();
		// 	}
		// 	break;
		case NEW_GAME_KEY:
			if (rogue.playerTurnNumber < 50 || await confirm("End this game and begin a new game?", false)) {
				rogue.nextGame = NG_NEW_GAME;
				rogue.gameHasEnded = true;
			}
			break;
		case QUIT_KEY:
			if (await confirm("Quit this game without saving?", false)) {
				recordKeystroke(QUIT_KEY, false, false);
				rogue.quit = true;
				await gameOver("Quit", true);
			}
			break;
		case SEED_KEY:
			// DEBUG {
			// 	cellDisplayBuffer dbuf[COLS][ROWS];
			// 	copyDisplayBuffer(dbuf, displayBuffer);
			// 	await funkyFade(dbuf, &white, 0, 100, mapToWindowX(player.xLoc), mapToWindowY(player.yLoc), false);
			// }
			// DEBUG displayLoops();
			// DEBUG displayChokeMap();
			if (DEBUG) { await displayMachines(); }
      //DEBUG displayWaypoints();
			// DEBUG {displayGrid(safetyMap); displayMoreSign(); displayLevel();}
			// parseFile();
			// DEBUG spawnDungeonFeature(player.xLoc, player.yLoc, &dungeonFeatureCatalog[DF_METHANE_GAS_ARMAGEDDON], true, false);
			printSeed();
			break;
		case EASY_MODE_KEY:
			//if (shiftKey) {
				await enableEasyMode();
			//}
			break;
		case TEST_KEY:
			await flashCreatureAlert(player, 'Testing', teal, black);
			break;
		default:
			break;
	}
	if (direction >= 0) { // if it was a movement command
    hideCursor();
		considerCautiousMode();
		if (controlKey || shiftKey) {
			await playerRuns(direction);
		} else {
			await playerMoves(direction);
		}
		refreshSideBar(-1, -1, false);
	}

  if (D_SAFETY_VISION) {
      displayGrid(safetyMap);
  }
  if (rogue.trueColorMode || D_SCENT_VISION) {
      displayLevel();
  }

	rogue.cautiousMode = false;
}




async function getInputTextString( /* char */ inputText,
						   prompt,
						   maxLength,
						   defaultEntry,
						   promptSuffix,
						   textEntryType,
						   useDialogBox)
{
	let charNum, i, x, y;
	let keystroke;
	const suffix = STRING();
	const textEntryBounds = [[' ', '~'], [' ', '~'], ['0', '9']];
	const dbuf = GRID(COLS, ROWS, cellDisplayBuffer), rbuf = GRID(COLS, ROWS, cellDisplayBuffer);

	inputText = STRING(inputText);
	defaultEntry = STRING(defaultEntry);
	promptSuffix = STRING(promptSuffix);

	// x and y mark the origin for text entry.
	if (useDialogBox) {
		x = Math.floor((COLS - max(maxLength, strLenWithoutEscapes(prompt))) / 2);
		y = Math.floor(ROWS / 2 - 1);
		clearDisplayBuffer(dbuf);
		rectangularShading(x - 1, y - 2, max(maxLength, strLenWithoutEscapes(prompt)) + 2,
						   4, interfaceBoxColor, INTERFACE_OPACITY, dbuf);
		overlayDisplayBuffer(dbuf, rbuf);
		printString(prompt, x, y - 1, white, interfaceBoxColor, NULL);
		for (i=0; i<maxLength; i++) {
			plotCharWithColor(' ', x + i, y, black, black);
		}
		printString(defaultEntry, x, y, white, black, 0);
	} else {
		confirmMessages();
		x = mapToWindowX(strLenWithoutEscapes(prompt));
		y = MESSAGE_LINES - 1;
		message(prompt, false);
		printString(defaultEntry, x, y, white, black, 0);
	}

	maxLength = min(maxLength, COLS - x);

	strcpy(inputText, defaultEntry);
	charNum = strLenWithoutEscapes(inputText);
	// for (i = charNum; i < maxLength; i++) {
	// 	inputText.append(' '); // TODO - Make more efficient
	// }

	if (strlen(promptSuffix) == 0) { // empty suffix
		strcpy(suffix, " "); // so that deleting doesn't leave a white trail
	} else {
		strcpy(suffix, promptSuffix);
	}

	do {
		printString(suffix, charNum + x, y, gray, black, 0);
		plotCharWithColor((strlen(suffix) ? suffix.charAt(0) : ' '), x + charNum, y, black, white);
		keystroke = await nextKeyPress(true);
		if ( (keystroke == DELETE_KEY || keystroke == BACKSPACE_KEY) && charNum > 0) {
			printString(suffix, charNum + x - 1, y, gray, black, 0);
			plotCharWithColor(' ', x + charNum + strlen(suffix) - 1, y, black, black);
			charNum--;
			inputText.splice(charNum, 1);
		} else if (strlen(keystroke) > 1) {
			// ignore other special keys...
		} else if (keystroke >= textEntryBounds[textEntryType][0]
				   && keystroke <= textEntryBounds[textEntryType][1]) // allow only permitted input
		{
      if (textEntryType == TEXT_INPUT_FILENAME
          && characterForbiddenInFilename(keystroke))
			{
          keystroke = '-';
      }

			strcat(inputText, keystroke);
			plotCharWithColor(keystroke, x + charNum, y, white, black);
			printString(suffix, charNum + x + 1, y, gray, black, 0);
			if (charNum < maxLength) {
				charNum++;
			}
		}
	} while (keystroke != RETURN_KEY && keystroke != ESCAPE_KEY && keystroke != ENTER_KEY);

	if (useDialogBox) {
		overlayDisplayBuffer(rbuf, NULL);
	}

	// inputText[charNum] = '\0';

	if (keystroke == ESCAPE_KEY) {
		return false;
	}
	strcat(displayedMessage[0], inputText);
	strcat(displayedMessage[0], suffix);
	return true;
}


// void displayCenteredAlert(char *message) {
// 	printString(message, (COLS - strLenWithoutEscapes(message)) / 2, ROWS / 2, &teal, &black, 0);
// }

// Flashes a message on the screen starting at (x, y) lasting for the given time and with the given colors.
async function flashMessage(message, x, y, time, /* color */ fColor, /* color */ bColor) {
	let fastForward;
	let		i, j, messageLength, percentComplete, previousPercentComplete;
	let backColors = []; // color[COLS],
  let backColor = color(), foreColor = color();
	const dbufs = ARRAY(COLS, cellDisplayBuffer); // cellDisplayBuffer[COLS];
	let dchar;
  const startTime = performance.now();
	let nowTime, elapsed;

	if (rogue.playbackFastForward) {
		return;
	}

  previousPercentComplete = -1;
	messageLength = strLenWithoutEscapes(message);
	fastForward = false;

  // assureCosmeticRNG();
	for (j=0; j<messageLength; j++) {
		backColors[j] = colorFromComponents(displayBuffer[j + x][y].backColorComponents);
		dbufs[j].copy(displayBuffer[j + x][y]);
	}
  // restoreRNG();

	previousPercentComplete = -1;
	// for (i=0; i < time && fastForward == false; i++) {
	while( previousPercentComplete < 100 && !fastForward ) {
		// assureCosmeticRNG();

		nowTime = performance.now();
		elapsed = nowTime - startTime;
		percentComplete = Math.floor(100 * elapsed / time);
		percentComplete = Math.floor(percentComplete * percentComplete / 100); // transition is front-loaded
		percentComplete = Math.min(100, Math.max(0, percentComplete));

		if (previousPercentComplete != percentComplete) {
			for (j=0; j<messageLength; j++) {
				if (i==0) {
					backColors[j] = colorFromComponents(displayBuffer[j + x][y].backColorComponents);
					dbufs[j] = displayBuffer[j + x][y];
				}
				backColor.copy(backColors[j]);
				applyColorAverage(backColor, bColor, 100 - percentComplete);
				if (percentComplete < 50) {
					dchar = message.charAt(j); // [j];
					foreColor.copy(fColor);
					applyColorAverage(foreColor, backColor, percentComplete * 2);
				} else {
					dchar = dbufs[j].char;
					foreColor = colorFromComponents(dbufs[j].foreColorComponents);
					applyColorAverage(foreColor, backColor, (100 - percentComplete) * 2);
				}
				plotCharWithColor(dchar, j+x, y, foreColor, backColor);
			}
		}
		previousPercentComplete = percentComplete;
		// restoreRNG();
		fastForward = await pauseBrogue(1);
	}

	console.log('FlashMessage', time, elapsed);

	// assureCosmeticRNG();
	for (j=0; j<messageLength; j++) {
    foreColor = colorFromComponents(dbufs[j].foreColorComponents);
		plotCharWithColor(dbufs[j].char, j+x, y, foreColor, (backColors[j]));
	}
	// restoreRNG();
}

async function flashTemporaryAlert(message, time) {
	await flashMessage(message, Math.round((COLS - strLenWithoutEscapes(message)) / 2), Math.round(ROWS / 2), time, teal, black);
}

async function waitForAcknowledgment() {
	const theEvent = rogueEvent();

	if (rogue.autoPlayingLevel || (rogue.playbackMode && !rogue.playbackOOS)) {
		return;
	}

	do {
		await nextBrogueEvent(theEvent, false, false, false);
		if (theEvent.eventType == KEYSTROKE && theEvent.param1 != ACKNOWLEDGE_KEY && theEvent.param1 != ESCAPE_KEY) {
			await flashTemporaryAlert(" -- Press space or click to continue -- ", 500);
		}
	} while (!(theEvent.eventType == KEYSTROKE && (theEvent.param1 == ACKNOWLEDGE_KEY || theEvent.param1 == ESCAPE_KEY)
			   || theEvent.eventType == MOUSE_UP));
}


async function waitForKeystrokeOrMouseClick() {
	const theEvent = rogueEvent();
	do {
		await nextBrogueEvent(theEvent, false, false, false);
	} while (theEvent.eventType != KEYSTROKE && theEvent.eventType != MOUSE_UP);
}


async function confirm(prompt, alsoDuringPlayback) {
	let retVal;
	let buttons = ARRAY(2, brogueButton); // brogueButton[2] = {{{0}}};
	const rbuf = GRID(COLS, ROWS, cellDisplayBuffer); // cellDisplayBuffer[COLS][ROWS];
	const whiteColorEscape = STRING();
	const yellowColorEscape = STRING();

	if (rogue.autoPlayingLevel || (!alsoDuringPlayback && rogue.playbackMode)) {
		return true; // oh yes he did
	}

	encodeMessageColor(whiteColorEscape, 0, white);
	encodeMessageColor(yellowColorEscape, 0, KEYBOARD_LABELS ? yellow : white);

	initializeButton(buttons[0]);
	sprintf(buttons[0].text, "     %{s}Y%{s}es     ", yellowColorEscape, whiteColorEscape);
	buttons[0].hotkey[0] = 'y';
	buttons[0].hotkey[1] = 'Y';
	buttons[0].hotkey[2] = RETURN_KEY;
	buttons[0].hotkey[3] = ENTER_KEY;
	buttons[0].flags |= (B_WIDE_CLICK_AREA | B_KEYPRESS_HIGHLIGHT);

	initializeButton(buttons[1]);
	sprintf(buttons[1].text, "     %{s}N%{s}o      ", yellowColorEscape, whiteColorEscape);
	buttons[1].hotkey[0] = 'n';
	buttons[1].hotkey[1] = 'N';
	buttons[1].hotkey[2] = ACKNOWLEDGE_KEY;
	buttons[1].hotkey[3] = ESCAPE_KEY;
	buttons[1].flags |= (B_WIDE_CLICK_AREA | B_KEYPRESS_HIGHLIGHT);

	retVal = await printTextBox(prompt, Math.round(COLS/3), Math.round(ROWS/3), Math.round(COLS/3), white, interfaceBoxColor, rbuf, buttons, 2);
	overlayDisplayBuffer(rbuf, NULL);

	if (retVal == -1 || retVal == 1) { // If they canceled or pressed no.
		return false;
	} else {
		return true;
	}

	confirmMessages();	// UNREACHABLE!!!!
	return retVal;
}



function clearMonsterFlashes() {

}

async function displayMonsterFlashes(flashingEnabled) {
	let monst;	// creature *
	const x = [], y = [], strength = [];
	let count = 0;
	const flashColor = ARRAY(100, color); // color *[100];
  // short oldRNG;

	rogue.creaturesWillFlashThisTurn = false;

	if (rogue.autoPlayingLevel || rogue.blockCombatText) {
		return;
	}

  // oldRNG = rogue.RNG;
  // rogue.RNG = RNG_COSMETIC;
	// assureCosmeticRNG();

	CYCLE_MONSTERS_AND_PLAYERS( (monst) => {
		if (monst.bookkeepingFlags & MB_WILL_FLASH) {
			monst.bookkeepingFlags &= ~MB_WILL_FLASH;
			if (flashingEnabled && canSeeMonster(monst) && count < 100) {
				x[count] = monst.xLoc;
				y[count] = monst.yLoc;
				strength[count] = monst.flashStrength;
				flashColor[count].copy(monst.flashColor);
				count++;
			}
		}
	});
	await flashForeground(x, y, flashColor, strength, count, 20);
	// restoreRNG();
}


async function dequeueEvent() {
	const returnEvent = rogueEvent();
	await nextBrogueEvent(returnEvent, false, false, true);
}


async function displayMessageArchive() {
	let i, j, k, reverse, fadePercent, totalMessageCount, currentMessageCount;
	let fastForward;
	const dbuf = GRID(COLS, ROWS, cellDisplayBuffer), rbuf = GRID(COLS, ROWS, cellDisplayBuffer); // [COLS][ROWS];

	// Count the number of lines in the archive.
	for (totalMessageCount=0;
		 totalMessageCount < MESSAGE_ARCHIVE_LINES && strlen(messageArchive[totalMessageCount]);
		 totalMessageCount++);

	if (totalMessageCount <= MESSAGE_LINES) return;

	copyDisplayBuffer(rbuf, displayBuffer);

	// Pull-down/pull-up animation:
	for (reverse = 0; reverse <= 1; reverse++) {
		fastForward = false;
		for (currentMessageCount = (reverse ? totalMessageCount : MESSAGE_LINES);
			 (reverse ? currentMessageCount >= MESSAGE_LINES : currentMessageCount <= totalMessageCount);
			 currentMessageCount += (reverse ? -1 : 1))
	  {
			clearDisplayBuffer(dbuf);

			// Print the message archive text to the dbuf.
			for (j=0; j < currentMessageCount && j < ROWS; j++) {
				printString(messageArchive[(messageArchivePosition - currentMessageCount + MESSAGE_ARCHIVE_LINES + j) % MESSAGE_ARCHIVE_LINES],
							mapToWindowX(0), j, white, black, dbuf);
			}

			// Set the dbuf opacity, and do a fade from bottom to top to make it clear that the bottom messages are the most recent.
			for (j=0; j < currentMessageCount && j<ROWS; j++) {
				fadePercent = 50 * (j + totalMessageCount - currentMessageCount) / totalMessageCount + 50;
				for (i=0; i<DCOLS; i++) {
					dbuf[mapToWindowX(i)][j].opacity = INTERFACE_OPACITY;
					if (dbuf[mapToWindowX(i)][j].char != ' ') {
						for (k=0; k<3; k++) {
							dbuf[mapToWindowX(i)][j].foreColorComponents[k] = dbuf[mapToWindowX(i)][j].foreColorComponents[k] * fadePercent / 100;
						}
					}
				}
			}

			// Display.
			overlayDisplayBuffer(rbuf, 0);
			overlayDisplayBuffer(dbuf, 0);

			if (!fastForward && await pauseBrogue(reverse ? 1 : 2)) {
				fastForward = true;
				// dequeueEvent();
				currentMessageCount = (reverse ? MESSAGE_LINES + 1 : totalMessageCount - 1); // skip to the end
			}
		}

		if (!reverse) {
			await displayMoreSign();
		}
	}
	overlayDisplayBuffer(rbuf, 0);
	updateFlavorText();
	confirmMessages();
	updateMessageDisplay();
}

// Clears the message area and prints the given message in the area.
// It will disappear when messages are refreshed and will not be archived.
// This is primarily used to display prompts.
async function temporaryMessage(msg, requireAcknowledgment) {
	let message; // char[COLS];
	let i, j;

	// assureCosmeticRNG();
	message = capitalize(msg);

	// for (i=0; message[i] == COLOR_ESCAPE; i += 4) {
	// 	message[i] = capitalize(&(message[i]));
	// }

	refreshSideBar(-1, -1, false);

	for (i=0; i<MESSAGE_LINES; i++) {
		for (j=0; j<DCOLS; j++) {
			plotCharWithColor(' ', mapToWindowX(j), i, black, black);
		}
	}
	printString(message, mapToWindowX(0), mapToWindowY(-1), white, black, 0);
	// restoreRNG();

	if (requireAcknowledgment) {
		await waitForAcknowledgment();
		updateMessageDisplay();
	}
}


function flavorMessage(msg) {
	let i;
	let text; // char[COLS*20];

	msg = STRING(msg);
	capitalize(msg);

	printString(msg, mapToWindowX(0), ROWS - 2, flavorTextColor, black, 0);
	for (i = strLenWithoutEscapes(msg); i < DCOLS; i++) {
		plotCharWithColor(' ', mapToWindowX(i), ROWS - 2, black, black);
	}
}


// function messageWithoutCaps(msg, requireAcknowledgment) {
function addMessageLine(msg) {
	let i;
	if (!strlen(msg)) {
      return;
  }

	// // need to confirm the oldest message? (Disabled!)
	// if (!messageConfirmed[MESSAGE_LINES - 1]) {
	// 	//refreshSideBar(-1, -1, false);
	// 	displayMoreSign();
	// 	for (i=0; i<MESSAGE_LINES; i++) {
	// 		messageConfirmed[i] = true;
	// 	}
	// }

	for (i = MESSAGE_LINES - 1; i >= 1; i--) {
		messageConfirmed[i] = messageConfirmed[i-1];
		displayedMessage[i] = displayedMessage[i-1];
	}
	messageConfirmed[0] = false;
	displayedMessage[0] = STRING(msg);

	// Add the message to the archive.
	messageArchive[messageArchivePosition] = displayedMessage[0];
	messageArchivePosition = (messageArchivePosition + 1) % MESSAGE_ARCHIVE_LINES;

}


// function messageWith_Color(msg, /* color */ theColor, requireAcknowledgment) {
// 	let buf; // char[COLS*2] = "";
// 	let i;
//
// 	i=0;
// 	buf = encodeMessageColor(theColor, msg);
// 	message(buf, requireAcknowledgment);
// }


async function messageWithAck(msg, color) {

	refreshSideBar(-1, -1, false);
  message(msg, color);

	await displayMoreSign();

  confirmMessages();
	rogue.cautiousMode = false;
}

function message(msg, color) {
	let msgPtr;
	const text = STRING();
	let i, lines;

	// assureCosmeticRNG();

	rogue.disturbed = true;
	displayCombatText();

	msg = STRING(msg);
	capitalize(msg);

  if (color) {
		const buf = STRING();
    encodeMessageColor(buf, 0, color);
		strcat(buf, msg);
		msg = buf;
  }

	lines = wrapText(text, msg, DCOLS);

  // Implement the American quotation mark/period/comma ordering rule.
  for (i=0; text.text[i] && text.text[i+1]; i++) {
      if (text.charCodeAt(i) === COLOR_ESCAPE) {
          i += 4;
      } else if (text.text[i] === '"'
                 && (text.text[i+1] === '.' || text.text[i+1] === ','))
			{
				const replace = text.text[i+1] + '"';
				text.splice(i, 2, replace);
      }
  }

	if (lines == 1) {
		addMessageLine(text);
	}
	else {
		let msgPtr = 0;
		for (i=0; text.text[i]; i++) {
			if (text.text[i] === '\n') {
				addMessageLine( text.text.substring(msgPtr, i) );
				msgPtr = i + 1;
			}
		}
		if (msgPtr < strlen(text)) {
			addMessageLine( text.text.substring(msgPtr) );
		}
	}

  // display the message:
	updateMessageDisplay();
  // restoreRNG();

  if (rogue.playbackMode) {
		rogue.playbackDelayThisTurn += rogue.playbackDelayPerTurn * 5;
	}
}


// Only used for the "you die..." message, to enable posthumous inventory viewing.
function displayMoreSignWithoutWaitingForAcknowledgment() {
	if (strLenWithoutEscapes(displayedMessage[0]) < DCOLS - 8 || messageConfirmed[0]) {
		printString("--MORE--", COLS - 8, MESSAGE_LINES-1, black, white, 0);
	} else {
		printString("--MORE--", COLS - 8, MESSAGE_LINES, black, white, 0);
	}
}

function displayMoreSign() {
	let i;

	if (rogue.autoPlayingLevel) {
		return;
	}

	if (strLenWithoutEscapes(displayedMessage[0]) < DCOLS - 8 || messageConfirmed[0]) {
		printString("--MORE--", COLS - 8, MESSAGE_LINES-1, black, white, 0);
		return waitForAcknowledgment( () => {
			printString("        ", COLS - 8, MESSAGE_LINES-1, black, black, 0);
		});
	} else {
		printString("--MORE--", COLS - 8, MESSAGE_LINES, black, white, 0);
		return waitForAcknowledgment( () => {
			for (i=1; i<=8; i++) {
				refreshDungeonCell(DCOLS - i, 0);
			}
		});
	}
}

// Inserts a four-character color escape sequence into a string at the insertion point.
// Does NOT check string lengths, so it could theoretically write over the null terminator.
// Returns the new insertion point.
function encodeMessageColor(theMsg, i, theColor) {
  if (!theColor) {
    return theMsg;
  }

	if (i == 0) {
		theMsg.clear();
	}

	const col = theColor.clone();
	// assureCosmeticRNG();
	bakeColor(col);
	col.red		= clamp(col.red, 0, 100);
	col.green	= clamp(col.green, 0, 100);
	col.blue	= clamp(col.blue, 0, 100);
	// restoreRNG();

	theMsg.encodeColor(col, i);
	return i + 4;
}

// Call this when the i'th character of msg is COLOR_ESCAPE.
// It will return the encoded color, and will advance i past the color escape sequence.
function decodeMessageColor(msg, i, /* color */ returnColor) {

	msg = STRING(msg).text;

	if (msg.charCodeAt(i) !== COLOR_ESCAPE) {
		printf("\nAsked to decode a color escape that didn't exist!");
		returnColor.copy(white);
	} else {
		i++;
		returnColor.copy(black);
		returnColor.red	= (msg.charCodeAt(i++) - COLOR_VALUE_INTERCEPT);
		returnColor.green	= (msg.charCodeAt(i++) - COLOR_VALUE_INTERCEPT);
		returnColor.blue	= (msg.charCodeAt(i++) - COLOR_VALUE_INTERCEPT);

		returnColor.red	= clamp(returnColor.red, 0, 100);
		returnColor.green	= clamp(returnColor.green, 0, 100);
		returnColor.blue	= clamp(returnColor.blue, 0, 100);
	}
	return i;
}



// Returns a color for combat text based on the identity of the victim.
function messageColorFromVictim(/* creature */monst) {
	if (monst === player) {
		return badMessageColor;
  } else if (player.status[STATUS_HALLUCINATING] && !rogue.playbackOmniscience) {
      return white;
  } else if (monst.creatureState == MONSTER_ALLY) {
      return badMessageColor;
	} else if (monstersAreEnemies(player, monst)) {
		return goodMessageColor;
	} else {
		return white;
	}
}


function updateMessageDisplay() {
	let i, j, m;
	let messageColor = color();

	for (i=0; i<MESSAGE_LINES; i++) {
		messageColor.copy(white);

		if (messageConfirmed[i]) {
			applyColorAverage(messageColor, black, 50);
			applyColorAverage(messageColor, black, 75 * i / MESSAGE_LINES);
		}

		for (j = m = 0; displayedMessage[i].text[m] && j < DCOLS; j++, m++) {

			while (displayedMessage[i].charCodeAt(m) === COLOR_ESCAPE) {
				m = decodeMessageColor(displayedMessage[i], m, messageColor); // pulls the message color out and advances m
				if (messageConfirmed[i]) {
					applyColorAverage(messageColor, black, 50);
					applyColorAverage(messageColor, black, 75 * i / MESSAGE_LINES);
				}
			}

      plotCharWithColor(displayedMessage[i].text[m], mapToWindowX(j), MESSAGE_LINES - i - 1, messageColor, black);
    }

		for (; j < DCOLS; j++) {
			plotCharWithColor(' ', mapToWindowX(j), MESSAGE_LINES - i - 1, black, black);
		}
	}
}

// Does NOT clear the message archive.
function deleteMessages() {
	let i;
	for (i=0; i<MESSAGE_LINES; i++) {
		displayedMessage[i].clear();
	}
	confirmMessages();
}

function confirmMessages() {
	let i;
	for (i=0; i<MESSAGE_LINES; i++) {
		messageConfirmed[i] = true;
	}
	updateMessageDisplay();
}

const shiftedKeystrokes = [
  SHIFT_UP_KEY, SHIFT_DOWN_KEY, SHIFT_LEFT_KEY, SHIFT_RIGHT_KEY,
  SHIFT_UPLEFT_KEY, SHIFT_UPRIGHT_KEY, SHIFT_DOWNLEFT_KEY, SHIFT_DOWNRIGHT_KEY,
  SHIFT_UP_ARROW, SHIFT_LEFT_ARROW, SHIFT_DOWN_ARROW, SHIFT_RIGHT_ARROW];

const normalKeystrokes = [
  UP_KEY, DOWN_KEY, LEFT_KEY, RIGHT_KEY,
  UPLEFT_KEY, UPRIGHT_KEY, DOWNLEFT_KEY, DOWNRIGHT_KEY,
  UP_ARROW, LEFT_ARROW, DOWN_ARROW, RIGHT_ARROW];

function stripShiftFromMovementKeystroke(keystroke) {
  const index = shiftedKeystrokes.indexOf(keystroke);
  if (index < 0) return keystroke;
  return normalKeystrokes[index];
}


function upperCase(theChar) {
  theChar.capitalize();
}


ENUM('entityDisplayTypes',
	'EDT_NOTHING',
	'EDT_CREATURE',
	'EDT_ITEM',
  'EDT_TERRAIN',
);


// Refreshes the sidebar.
// Progresses from the closest visible monster to the farthest.
// If a monster, item or terrain is focused, then display the sidebar with that monster/item highlighted,
// in the order it would normally appear. If it would normally not fit on the sidebar at all,
// then list it first.
// Also update rogue.sidebarLocationList[ROWS][2] list of locations so that each row of
// the screen is mapped to the corresponding entity, if any.
// FocusedEntityMustGoFirst should usually be false when called externally. This is because
// we won't know if it will fit on the screen in normal order until we try.
// So if we try and fail, this function will call itself again, but with this set to true.
function refreshSideBar(focusX, focusY, focusedEntityMustGoFirst) {
	let printY, oldPrintY, shortestDistance, i, j, k, px, py, x, y, displayEntityCount, indirectVision;
	let monst, closestMonst; // creature *
	let theItem, closestItem;  // item *
	let buf = ''; // char[COLS];
	let entityList = [], focusEntity = NULL;
	let entityType = [], focusEntityType = EDT_NOTHING;
  let terrainLocationMap = ARRAY(ROWS, () => [] ); // short[ROWS][2];
	let gotFocusedEntityOnScreen = (focusX >= 0 ? false : true);
	let addedEntity = GRID(DCOLS, DROWS); // char[DCOLS][DROWS];
  // short oldRNG;

	if (rogue.gameHasEnded || rogue.playbackFastForward) {
		return false;
	}

	// assureCosmeticRNG();

	if (focusX < 0) {
		focusedEntityMustGoFirst = false; // just in case!
	} else {
		if (pmap[focusX][focusY].flags & (HAS_MONSTER | HAS_PLAYER)) {
			monst = monsterAtLoc(focusX, focusY);
			if (canSeeMonster(monst) || rogue.playbackOmniscience) {
				focusEntity = monst;
				focusEntityType = EDT_CREATURE;
			}
		}
		if (!focusEntity && (pmap[focusX][focusY].flags & HAS_ITEM)) {
			theItem = itemAtLoc(focusX, focusY);
			if (playerCanSeeOrSense(focusX, focusY)) {
				focusEntity = theItem;
				focusEntityType = EDT_ITEM;
			}
		}
    if (!focusEntity
        && cellHasTMFlag(focusX, focusY, TM_LIST_IN_SIDEBAR)
        && playerCanSeeOrSense(focusX, focusY))
    {
        focusEntity = tileCatalog[pmap[focusX][focusY].layers[layerWithTMFlag(focusX, focusY, TM_LIST_IN_SIDEBAR)]].description;
        focusEntityType = EDT_TERRAIN;
    }
	}

	printY = 0;

	px = player.xLoc;
	py = player.yLoc;

	zeroOutGrid(addedEntity);

	// Header information for playback mode.
	if (rogue.playbackMode) {
		printString("   -- PLAYBACK --   ", 0, printY++, white, black, 0);
		if (rogue.howManyTurns > 0) {
			buf = `Turn ${rogue.playerTurnNumber}/${rogue.howManyTurns}`;
			printProgressBar(0, printY++, buf, rogue.playerTurnNumber, rogue.howManyTurns, darkPurple, false);
		}
		if (rogue.playbackOOS) {
			printString("    [OUT OF SYNC]   ", 0, printY++, badMessageColor, black, 0);
		} else if (rogue.playbackPaused) {
			printString("      [PAUSED]      ", 0, printY++, gray, black, 0);
		}
		printString("                    ", 0, printY++, white, black, 0);
	}

	// Now list the monsters that we'll be displaying in the order of their proximity to player (listing the focused first if required).

	// Initialization.
	displayEntityCount = 0;
	for (i=0; i<ROWS*2; i++) {
		rogue.sidebarLocationList[i][0] = -1;
		rogue.sidebarLocationList[i][1] = -1;
	}

	// Player always goes first.
	entityList[displayEntityCount] = player;
	entityType[displayEntityCount] = EDT_CREATURE;
	displayEntityCount++;
	addedEntity[player.xLoc][player.yLoc] = true;

	// Focused entity, if it must go first.
	if (focusedEntityMustGoFirst && !addedEntity[focusX][focusY]) {
		addedEntity[focusX][focusY] = true;
		entityList[displayEntityCount] = focusEntity;
		entityType[displayEntityCount] = focusEntityType;
    terrainLocationMap[displayEntityCount][0] = focusX;
    terrainLocationMap[displayEntityCount][1] = focusY;
		displayEntityCount++;
	}

  for (indirectVision = 0; indirectVision < 2; indirectVision++) {
      // Non-focused monsters.
      do {
          shortestDistance = 10000;
          for (monst = monsters.nextCreature; monst != NULL; monst = monst.nextCreature) {
              if ((canDirectlySeeMonster(monst) || (indirectVision && (canSeeMonster(monst) || rogue.playbackOmniscience)))
                  && !addedEntity[monst.xLoc][monst.yLoc]
                  && !(monst.info.flags & MONST_NOT_LISTED_IN_SIDEBAR)
                  && (px - monst.xLoc) * (px - monst.xLoc) + (py - monst.yLoc) * (py - monst.yLoc) < shortestDistance)
              {
                  shortestDistance = (px - monst.xLoc) * (px - monst.xLoc) + (py - monst.yLoc) * (py - monst.yLoc);
                  closestMonst = monst;
              }
          }
          if (shortestDistance < 10000) {
              addedEntity[closestMonst.xLoc][closestMonst.yLoc] = true;
              entityList[displayEntityCount] = closestMonst;
              entityType[displayEntityCount] = EDT_CREATURE;
              displayEntityCount++;
          }
      } while (shortestDistance < 10000 && displayEntityCount * 2 < ROWS); // Because each entity takes at least 2 rows in the sidebar.

      // Non-focused items.
      do {
          shortestDistance = 10000;
          for (theItem = floorItems.nextItem; theItem != NULL; theItem = theItem.nextItem) {
              if ((playerCanDirectlySee(theItem.xLoc, theItem.yLoc) || (indirectVision && (playerCanSeeOrSense(theItem.xLoc, theItem.yLoc) || rogue.playbackOmniscience)))
                  && !addedEntity[theItem.xLoc][theItem.yLoc]
                  && (px - theItem.xLoc) * (px - theItem.xLoc) + (py - theItem.yLoc) * (py - theItem.yLoc) < shortestDistance)
              {
                  shortestDistance = (px - theItem.xLoc) * (px - theItem.xLoc) + (py - theItem.yLoc) * (py - theItem.yLoc);
                  closestItem = theItem;
              }
          }
          if (shortestDistance < 10000) {
              addedEntity[closestItem.xLoc][closestItem.yLoc] = true;
              entityList[displayEntityCount] = closestItem;
              entityType[displayEntityCount] = EDT_ITEM;
              displayEntityCount++;
          }
      } while (shortestDistance < 10000 && displayEntityCount * 2 < ROWS); // Because each entity takes at least 2 rows in the sidebar.

      // Non-focused terrain.

      // count up the number of candidate locations
      for (k=0; k<max(DROWS, DCOLS); k++) {
          for (i = px-k; i <= px+k; i++) {
              for (j = py-k; j <= py+k; j++) {
                  if (coordinatesAreInMap(i, j)
                      && (i == px-k || i == px+k || j == py-k || j == py+k)
                      && !addedEntity[i][j]
                      && (playerCanDirectlySee(i, j) || (indirectVision && (playerCanSeeOrSense(i, j) || rogue.playbackOmniscience)))
                      && cellHasTMFlag(i, j, TM_LIST_IN_SIDEBAR)
                      && displayEntityCount < ROWS - 1)
                  {
                      addedEntity[i][j] = true;
                      entityList[displayEntityCount] = tileCatalog[pmap[i][j].layers[layerWithTMFlag(i, j, TM_LIST_IN_SIDEBAR)]].description;
                      entityType[displayEntityCount] = EDT_TERRAIN;
                      terrainLocationMap[displayEntityCount][0] = i;
                      terrainLocationMap[displayEntityCount][1] = j;
                      displayEntityCount++;
                  }
              }
          }
      }
  }

	// Entities are now listed. Start printing.

	for (i=0; i<displayEntityCount && printY < ROWS - 1; i++) { // Bottom line is reserved for the depth.
		oldPrintY = printY;
		if (entityType[i] == EDT_CREATURE) {
			x = entityList[i].xLoc;
			y = entityList[i].yLoc;
			printY = printMonsterInfo(entityList[i],
									  printY,
									  (focusEntity && (x != focusX || y != focusY)),
									  (x == focusX && y == focusY));

		}
    else if (entityType[i] == EDT_ITEM)
    {
			x = entityList[i].xLoc;
			y = entityList[i].yLoc;
			printY = printItemInfo(entityList[i],
								   printY,
								   (focusEntity && (x != focusX || y != focusY)),
								   (x == focusX && y == focusY));
		} else if (entityType[i] == EDT_TERRAIN) {
            x = terrainLocationMap[i][0];
            y = terrainLocationMap[i][1];
            printY = printTerrainInfo(x, y,
                                      printY,
                                      entityList[i],
                                      (focusEntity && (x != focusX || y != focusY)),
                                      (x == focusX && y == focusY));
        }
		if (focusEntity && (x == focusX && y == focusY) && printY < ROWS) {
			gotFocusedEntityOnScreen = true;
		}
		for (j=oldPrintY; j<printY; j++) {
			rogue.sidebarLocationList[j][0] = x;
			rogue.sidebarLocationList[j][1] = y;
		}
	}

	if (gotFocusedEntityOnScreen) {
		// Wrap things up.
		for (i=printY; i< ROWS - 1; i++) {
			printString("                    ", 0, i, white, black, 0);
		}
		buf = `  -- Depth: ${rogue.depthLevel} --${rogue.depthLevel < 10 ? " " : ""}   `;
		printString(buf, 0, ROWS - 1, white, black, 0);
	} else if (!focusedEntityMustGoFirst) {
		// Failed to get the focusMonst printed on the screen. Try again, this time with the focus first.
		// restoreRNG();
		return refreshSideBar(focusX, focusY, true);
	}

	// restoreRNG();
	return !!focusEntity;
}


function printString(theString, x, y, /* color */ foreColor, /* color */ backColor,  dbuf /* cellDisplayBuffer[COLS][ROWS] */) {
	const fColor = color();
	let i;

	theString = STRING(theString);
	fColor.copy(foreColor);

	for (i=0; theString.text[i] && x < COLS; i++, x++) {
		while (theString.charCodeAt(i) === COLOR_ESCAPE) {
			i = decodeMessageColor(theString, i, fColor);
			if (!theString.text[i]) {
        return;
			}
		}

    if (dbuf) {
			plotCharToBuffer(theString.text[i], x, y, fColor, backColor, dbuf);
		} else {
			plotCharWithColor(theString.text[i], x, y, fColor, backColor);
		}
  }
}


// Inserts line breaks into really long words. Optionally adds a hyphen, but doesn't do anything
// clever regarding hyphen placement. Plays nicely with color escapes.
function breakUpLongWordsIn(sourceText, width, useHyphens) {
	let buf = ''; // char[COLS * ROWS * 2] = "";
	let i, m, nextChar, wordWidth;
	//const short maxLength = useHyphens ? width - 1 : width;

	sourceText = STRING(sourceText);
	const text = sourceText.text;

	// i iterates over characters in sourceText; m keeps track of the length of buf.
	wordWidth = 0;
	for (i=0; text[i]; ) {
		if (text.charCodeAt(i) === COLOR_ESCAPE) {
			buf += text.substring(i, i + 4);
			i += 4;
		} else if (text[i] === ' ' || text[i] === '\n') {
			wordWidth = 0;
			buf += text[i++];
		} else {
			if (!useHyphens && wordWidth >= width) {
				buf += '\n';
				wordWidth = 0;
			} else if (useHyphens && wordWidth >= width - 1) {
				nextChar = i+1;
				while (text[nextChar] === COLOR_ESCAPE) {
					nextChar += 4;
				}
				if (text[nextChar] && text[nextChar] !== ' ' && text[nextChar] !== '\n') {
					buf += '-\n';
					wordWidth = 0;
				}
			}
			buf += text[i++];
			wordWidth++;
		}
	}
	strcpy(sourceText, buf);
}


// Returns the number of lines, including the newlines already in the text.
// Puts the output in "to" only if we receive a "to" -- can make it null and just get a line count.
function wrapText(to, sourceText, width) {
	let i, w, textLength, lineCount;
	const printString = STRING(); // char[COLS * ROWS * 2];
	let spaceLeftOnLine, wordWidth;

	strcpy(printString, sourceText); // a copy we can write on
	breakUpLongWordsIn(printString, width, true); // break up any words that are wider than the width.

	textLength = strlen(printString); // do NOT discount escape sequences
	lineCount = 1;

	// Now go through and replace spaces with newlines as needed.

	// Fast foward until i points to the first character that is not a color escape.
	for (i=0; printString.charCodeAt(i) == COLOR_ESCAPE; i+= 4);
	spaceLeftOnLine = width;

	while (i < textLength) {
		// wordWidth counts the word width of the next word without color escapes.
		// w indicates the position of the space or newline or null terminator that terminates the word.
		wordWidth = 0;
		for (w = i + 1; w < textLength && printString.text[w] !== ' ' && printString.text[w] !== '\n';) {
			if (printString.charCodeAt(w) === COLOR_ESCAPE) {
				w += 4;
			} else {
				w++;
				wordWidth++;
			}
		}

		if (1 + wordWidth > spaceLeftOnLine || printString.text[i] === '\n') {
			printString.splice(i, 1, '\n');	// [i] = '\n';
			lineCount++;
			spaceLeftOnLine = width - wordWidth; // line width minus the width of the word we just wrapped
			//printf("\n\n%s", printString);
		} else {
			spaceLeftOnLine -= 1 + wordWidth;
		}
		i = w; // Advance to the terminator that follows the word.
	}
	if (to) {
		strcpy(to, printString);
	}

	return lineCount;
}

//
// // returns the y-coordinate of the last line
// function printStringWithWrapping(theString, x, y, width, /* color */foreColor,
//   					/* color */ backColor,
// 						dbuf /* cellDisplayBuffer[COLS][ROWS] */)
// {
// 	const fColor = color();
// 	const printString = STRING(); // char[COLS * ROWS * 2];
// 	let i, px, py;
// 	const lines = [];
//
// 	wrapText(lines, theString, width); // inserts newlines as necessary
//
// 	// display the string
// 	px = x; //px and py are the print insertion coordinates; x and y remain the top-left of the text box
// 	py = y;
// 	fColor.copy(foreColor);
//
// 	for (i=0; printString.text[i]; i++) {
// 		if (printString.text[i] === '\n') {
// 			px = x; // back to the leftmost column
// 			if (py < ROWS - 1) { // don't advance below the bottom of the screen
// 				py++; // next line
// 			} else {
// 				break; // If we've run out of room, stop.
// 			}
// 			continue;
// 		} else if (printString.text.charCodeAt(i) === COLOR_ESCAPE) {
// 			i = decodeMessageColor(printString, i, fColor) - 1;
// 			continue;
// 		}
//
// 		if (dbuf) {
// 			if (coordinatesAreInWindow(px, py)) {
// 				plotCharToBuffer(printString.text[i], px, py, fColor, backColor, dbuf);
// 			}
// 		} else {
// 			if (coordinatesAreInWindow(px, py)) {
// 				plotCharWithColor(printString.text[i], px, py, fColor, backColor);
// 			}
// 		}
//
// 		px++;
// 	}
// 	return py;
// }

// returns the y-coordinate of the last line
function printStringWithWrapping(theString, x, y, width, /* color */ foreColor,
  /* color */ backColor, dbuf /* cellDisplayBuffer[COLS][ROWS] */)
{
	const fColor = color();
	let i, px, py;
	const printString = STRING();

	wrapText(printString, theString, width); // inserts newlines as necessary

	// display the string
	px = x; //px and py are the print insertion coordinates; x and y remain the top-left of the text box
	py = y;
	fColor.copy(foreColor);

	for (i=0; printString.text[i]; i++) {
		if (printString.text[i] === '\n') {
			px = x; // back to the leftmost column
			if (py < ROWS - 1) { // don't advance below the bottom of the screen
				py++; // next line
			} else {
				break; // If we've run out of room, stop.
			}
			continue;
		} else if (printString.charCodeAt(i) === COLOR_ESCAPE) {
			i = decodeMessageColor(printString, i, fColor) - 1;
			continue;
		}

		if (dbuf) {
			if (coordinatesAreInWindow(px, py)) {
				plotCharToBuffer(printString.text[i], px, py, fColor, backColor, dbuf);
			}
		} else {
			if (coordinatesAreInWindow(px, py)) {
				plotCharWithColor(printString.text[i], px, py, fColor, backColor);
			}
		}

		px++;
	}

  return py;
}

async function nextKeyPress(textInput) {
	const theEvent = rogueEvent();
	do {
		await nextBrogueEvent(theEvent, textInput, false, false);
	} while (theEvent.eventType != KEYSTROKE);
	return theEvent.param1;
}

// const BROGUE_HELP_LINE_COUNT	 = 33;

async function printHelpScreen() {
	let i, j;
	const dbuf = GRID(COLS, ROWS, cellDisplayBuffer), rbuf = GRID(COLS, ROWS, cellDisplayBuffer); // cellDisplayBuffer[COLS][ROWS];
	let helpText = [
		"",
		"",
		"          -- Commands --",
		"",
		"         mouse  ****move cursor (including to examine monsters and terrain)",
		"         click  ****travel",
		" control-click  ****advance one space",
		"      <return>  ****enable keyboard cursor control",
		"   <space/esc>  ****disable keyboard cursor control",
		"hjklyubn, arrow keys, or numpad  ****move or attack (control or shift to run)",
		"",
		" a/e/r/t/d/c/R  ****apply/equip/remove/throw/drop/call/relabel an item",
		"i, right-click  ****view inventory",
		"             D  ****list discovered items",
        "",
		"             z  ****rest once",
		"             Z  ****rest for 100 turns or until something happens",
		"             s  ****search for secret doors and traps",
		"          <, >  ****travel to stairs",
		"             x  ****auto-explore (control-x: fast forward)",
		"             A  ****autopilot (control-A: fast forward)",
		"             M  ****display old messages",
        "",
		"             Q  ****quit to title screen",
        "",
		"             \\  ****disable/enable color effects",
		"             ]  ****display/hide stealth range",
		// "             [  ****enable/disable low HP warning",
		"   <space/esc>  ****clear message or cancel command",
		"",
		"        -- press space or click to continue --"
	];

	const BROGUE_HELP_LINE_COUNT = helpText.length;

	// Replace the "****"s with color escapes.
	for (i=0; i<BROGUE_HELP_LINE_COUNT; i++) {
		helpText[i] = STRING(helpText[i]);
		for (j=0; j < strlen(helpText[i]); j++) {
			if (helpText[i].charAt(j) == '*') {
				j = encodeMessageColor(helpText[i], j, white);
			}
		}
	}

	clearDisplayBuffer(dbuf);

	// Print the text to the dbuf.
	for (i=0; i<helpText.length && i < ROWS; i++) {
		printString(helpText[i], mapToWindowX(1), i, itemMessageColor, black, dbuf);
	}

	// Set the dbuf opacity.
	for (i=0; i<DCOLS; i++) {
		for (j=0; j<ROWS; j++) {
			//plotCharWithColor(' ', mapToWindowX(i), j, &black, &black);
			dbuf[mapToWindowX(i)][j].opacity = INTERFACE_OPACITY;
		}
	}

	// Display.
	overlayDisplayBuffer(dbuf, rbuf);
	commitDraws();
	await waitForAcknowledgment();
	overlayDisplayBuffer(rbuf, 0);
	updateFlavorText();
	updateMessageDisplay();
	commitDraws();
}


function printDiscoveries(category, count, itemCharacter, x, y, dbuf /* cellDisplayBuffer[COLS][ROWS] */) {
	const theColor = color(), goodColor = color(), badColor = color();
	const buf = STRING(), buf2 = STRING(); // char[COLS];
	let i, magic, totalFrequency;
	const theTable = tableForItemCategory(category, NULL);	// itemTable *

	goodColor.copy(goodMessageColor);
	applyColorAverage(goodColor, black, 50);
	badColor.copy(badMessageColor);
	applyColorAverage(badColor, black, 50);

  totalFrequency = 0;
	for (i = 0; i < count; i++) {
      if (!theTable[i].identified) {
          totalFrequency += theTable[i].frequency;
      }
  }

	for (i = 0; i < count; i++) {
		if (theTable[i].identified) {
			theColor.copy(white);
			plotCharToBuffer(itemCharacter, x, y + i, itemColor, black, dbuf);
		} else {
			theColor.copy(darkGray);
      magic = magicCharDiscoverySuffix(category, i);
      if (magic == 1) {
          plotCharToBuffer(GOOD_MAGIC_CHAR, x, y + i, goodColor, black, dbuf);
      } else if (magic == -1) {
          plotCharToBuffer(BAD_MAGIC_CHAR, x, y + i, badColor, black, dbuf);
      }
		}
		strcpy(buf, theTable[i].name);

	  if (!theTable[i].identified
	      && theTable[i].frequency > 0
	      && totalFrequency > 0)
		{
	      sprintf(buf2, " (%i%)", Math.floor(theTable[i].frequency * 100 / totalFrequency));
	      strcat(buf, buf2);
	  }

		capitalize(buf);
		strcat(buf, " ");
		printString(buf, x + 2, y + i, theColor, black, dbuf);
	}
}


async function printDiscoveriesScreen() {
	let i, j, y;
	const dbuf = GRID(COLS, ROWS, cellDisplayBuffer), rbuf = GRID(COLS, ROWS, cellDisplayBuffer); // cellDisplayBuffer[COLS][ROWS];

	clearDisplayBuffer(dbuf);

	printString("-- SCROLLS --", mapToWindowX(2), y = mapToWindowY(1), flavorTextColor, black, dbuf);
	printDiscoveries(SCROLL, NUMBER_SCROLL_KINDS, SCROLL_CHAR, mapToWindowX(3), ++y, dbuf);

	printString("-- RINGS --", mapToWindowX(2), y += NUMBER_SCROLL_KINDS + 1, flavorTextColor, black, dbuf);
	printDiscoveries(RING, NUMBER_RING_KINDS, RING_CHAR, mapToWindowX(3), ++y, dbuf);

	printString("-- POTIONS --", mapToWindowX(29), y = mapToWindowY(1), flavorTextColor, black, dbuf);
	printDiscoveries(POTION, NUMBER_POTION_KINDS, POTION_CHAR, mapToWindowX(30), ++y, dbuf);

	printString("-- STAFFS --", mapToWindowX(53), y = mapToWindowY(1), flavorTextColor, black, dbuf);
	printDiscoveries(STAFF, NUMBER_STAFF_KINDS, STAFF_CHAR, mapToWindowX(54), ++y, dbuf);

	printString("-- WANDS --", mapToWindowX(53), y += NUMBER_STAFF_KINDS + 1, flavorTextColor, black, dbuf);
	printDiscoveries(WAND, NUMBER_WAND_KINDS, WAND_CHAR, mapToWindowX(54), ++y, dbuf);

  printString(KEYBOARD_LABELS ? "-- press any key to continue --" : "-- touch anywhere to continue --",
              mapToWindowX(20), mapToWindowY(DROWS-2), itemMessageColor, black, dbuf);

	for (i=0; i<COLS; i++) {
		for (j=0; j<ROWS; j++) {
			dbuf[i][j].opacity = (i < STAT_BAR_WIDTH ? 0 : INTERFACE_OPACITY);
		}
	}
	overlayDisplayBuffer(dbuf, rbuf);

  await waitForKeystrokeOrMouseClick();
  overlayDisplayBuffer(rbuf, NULL);

}

//
//
// /* ALWAYS
//
// // Creates buttons for the discoveries screen in the buttons pointer; returns the number of buttons created.
// //short createDiscoveriesButtons(short category, short count, unsigned short itemCharacter, short x, short y, brogueButton *buttons) {
// //	color *theColor, goodColor, badColor;
// //	char whiteColorEscape[20] = "", darkGrayColorEscape[20] = "", yellowColorEscape[20] = "", goodColorEscape[20] = "", badColorEscape[20] = "";
// //	short i, x2, magic, symbolCount;
// //	itemTable *theTable = tableForItemCategory(category, NULL);
// //
// //	goodColor = goodMessageColor;
// //	applyColorAverage(&goodColor, &black, 50);
// //	encodeMessageColor(goodColorEscape, 0, &goodColor);
// //	badColor = badMessageColor;
// //	applyColorAverage(&badColor, &black, 50);
// //	encodeMessageColor(badColorEscape, 0, &goodColor);
// //	encodeMessageColor(whiteColorEscape, 0, &white);
// //	encodeMessageColor(darkGrayColorEscape, 0, &darkGray);
// //
// //	for (i = 0; i < count; i++) {
// //		buttons[i].x = x;
// //		buttons[i].y = y + i;
// //		buttons[i].opacity = 100;
// //		symbolCount = 0;
// //		if (theTable[i].identified) {
// //			strcat(buttons[i].text, yellowColorEscape);
// //			buttons[i].symbol[symbolCount++] = itemCharacter;
// //			strcat(buttons[i].text, "*");
// //			strcat(buttons[i].text, whiteColorEscape);
// //			//plotCharToBuffer(itemCharacter, x, y + i, &itemColor, &black, dbuf);
// //		} else {
// //			strcat(buttons[i].text, darkGrayColorEscape);
// //		}
// //		strcpy(buf, theTable[i].name);
// //		buf = capitalize(buf);
// //		strcat(buf, " ");
// //		printString(buf, x + 2, y + i, theColor, &black, dbuf);
// //
// //		x2 = x + 2 + strLenWithoutEscapes(buf);
// //		magic = magicCharDiscoverySuffix(category, i);
// //		plotCharToBuffer('(', x2++, y + i, &darkGray, &black, dbuf);
// //		if (magic != -1) {
// //			plotCharToBuffer(GOOD_MAGIC_CHAR, x2++, y + i, &goodColor, &black, dbuf);
// //		}
// //		if (magic != 1) {
// //			plotCharToBuffer(BAD_MAGIC_CHAR, x2++, y + i, &badColor, &black, dbuf);
// //		}
// //		plotCharToBuffer(')', x2++, y + i, &darkGray, &black, dbuf);
// //	}
// //	return i;
// //}
// //
// //void printDiscoveriesScreen() {
// //	short i, j, y, buttonCount;
// //	cellDisplayBuffer dbuf[COLS][ROWS], rbuf[COLS][ROWS];
// //	brogueButton buttons[NUMBER_SCROLL_KINDS + NUMBER_WAND_KINDS + NUMBER_POTION_KINDS + NUMBER_STAFF_KINDS + NUMBER_RING_KINDS] = {{{0}}};
// //
// //	clearDisplayBuffer(dbuf);
// //	buttonCount = 0;
// //
// //	printString("-- SCROLLS --", mapToWindowX(3), y = mapToWindowY(1), &flavorTextColor, &black, dbuf);
// //	buttonCount += createDiscoveriesButtons(SCROLL, NUMBER_SCROLL_KINDS, SCROLL_CHAR, mapToWindowX(3), ++y, &(buttons[buttonCount]));
// //
// //	printString("-- WANDS --", mapToWindowX(3), y += NUMBER_SCROLL_KINDS + 1, &flavorTextColor, &black, dbuf);
// //	buttonCount += createDiscoveriesButtons(WAND, NUMBER_WAND_KINDS, WAND_CHAR, mapToWindowX(3), ++y, &(buttons[buttonCount]));
// //
// //	printString("-- POTIONS --", mapToWindowX(29), y = mapToWindowY(1), &flavorTextColor, &black, dbuf);
// //	buttonCount += createDiscoveriesButtons(POTION, NUMBER_POTION_KINDS, POTION_CHAR, mapToWindowX(29), ++y, &(buttons[buttonCount]));
// //
// //	printString("-- STAFFS --", mapToWindowX(54), y = mapToWindowY(1), &flavorTextColor, &black, dbuf);
// //	buttonCount += createDiscoveriesButtons(STAFF, NUMBER_STAFF_KINDS, STAFF_CHAR, mapToWindowX(54), ++y, &(buttons[buttonCount]));
// //
// //	printString("-- RINGS --", mapToWindowX(54), y += NUMBER_STAFF_KINDS + 1, &flavorTextColor, &black, dbuf);
// //	buttonCount += createDiscoveriesButtons(RING, NUMBER_RING_KINDS, RING_CHAR, mapToWindowX(54), ++y, &(buttons[buttonCount]));
// //
// //	for (i=0; i<COLS; i++) {
// //		for (j=0; j<ROWS; j++) {
// //			dbuf[i][j].opacity = (i < STAT_BAR_WIDTH ? 0 : INTERFACE_OPACITY);
// //		}
// //	}
// //	overlayDisplayBuffer(dbuf, rbuf);
// //
// //	displayMoreSign();
// //
// //	overlayDisplayBuffer(rbuf, NULL);
// //}
//
// // ALWAYS
//  */
//
//

async function printHighScores(hiliteMostRecent) {
	let i, hiliteLineNum, maxLength = 0, leftOffset;
	const list = ARRAY(HIGH_SCORES_COUNT, rogueHighScoresEntry); // rogueHighScoresEntry[HIGH_SCORES_COUNT] = {{0}};
	const buf = STRING(); // char[DCOLS*3];
	const scoreColor = color();

	hiliteLineNum = getHighScoresList(list);

	if (!hiliteMostRecent) {
		hiliteLineNum = -1;
	}

	blackOutScreen();

	for (i = 0; i < HIGH_SCORES_COUNT && list[i].score > 0; i++) {
		if (strLenWithoutEscapes(list[i].description) > maxLength) {
			maxLength = strLenWithoutEscapes(list[i].description);
		}
	}

	leftOffset = min(COLS - maxLength - 21 - 1, Math.round(COLS/5));

	scoreColor.copy(black);
	applyColorAverage(scoreColor, itemMessageColor, 100);
	printString("-- HIGH SCORES --", (COLS - 17 + 1) / 2, 0, scoreColor, black, 0);

	for (i = 0; i < HIGH_SCORES_COUNT && list[i].score > 0; i++) {
		scoreColor.copy(black);
		if (i == hiliteLineNum) {
			applyColorAverage(scoreColor, itemMessageColor, 100);
		} else {
			applyColorAverage(scoreColor, white, 100);
			applyColorAverage(scoreColor, black, (i * 50 / 24));
		}

		// rank
		sprintf(buf, "%s%i)", (i + 1 < 10 ? " " : ""), i + 1);
		printString(buf, leftOffset, i + 2, scoreColor, black, 0);

		// score
		sprintf(buf, "%i", list[i].score);
		printString(buf, leftOffset + 5, i + 2, scoreColor, black, 0);

		// date
		printString(list[i].date, leftOffset + 12, i + 2, scoreColor, black, 0);

		// description
		printString(list[i].description, leftOffset + 21, i + 2, scoreColor, black, 0);
	}

	scoreColor.copy(black);
	applyColorAverage(scoreColor, goodMessageColor, 100);

	printString(KEYBOARD_LABELS ? "Press space to continue." : "Touch anywhere to continue.",
                (COLS - strLenWithoutEscapes(KEYBOARD_LABELS ? "Press space to continue." : "Touch anywhere to continue.")) / 2,
                ROWS - 1, scoreColor, black, 0);

	commitDraws();
	await waitForAcknowledgment();
}

function displayGrid(/* short **/ map) {
	let i, j, score, topRange, bottomRange;
	let tempColor, foreColor, backColor;
	let dchar;

	topRange = -30000;
	bottomRange = 30000;
	tempColor = black.clone();

	if (map == safetyMap && !rogue.updatedSafetyMapThisTurn) {
		updateSafetyMap();
	}

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (cellHasTerrainFlag(i, j, T_WAYPOINT_BLOCKER) || (map[i][j] == map[0][0]) || (i == player.xLoc && j == player.yLoc)) {
				continue;
			}
			if (map[i][j] > topRange) {
				topRange = map[i][j];
				//if (topRange == 0) {
					//printf("\ntop is zero at %i,%i", i, j);
				//}
			}
			if (map[i][j] < bottomRange) {
				bottomRange = map[i][j];
			}
		}
	}

	for (i=0; i<DCOLS; i++) {
		for (j=0; j<DROWS; j++) {
			if (cellHasTerrainFlag(i, j, T_OBSTRUCTS_PASSABILITY | T_LAVA_INSTA_DEATH)
				|| (map[i][j] == map[0][0])
				|| (i == player.xLoc && j == player.yLoc))
			{
				continue;
			}
			score = 300 - (map[i][j] - bottomRange) * 300 / max(1, (topRange - bottomRange));
			tempColor.blue = max(min(score, 100), 0);
			score -= 100;
			tempColor.red = max(min(score, 100), 0);
			score -= 100;
			tempColor.green = max(min(score, 100), 0);
			const app = getCellAppearance(i, j);
			plotCharWithColor(app.char, mapToWindowX(i), mapToWindowY(j), app.foreColor, tempColor);
			//colorBlendCell(i, j, &tempColor, 100);//hiliteCell(i, j, &tempColor, 100, false);
		}
	}
	//printf("\ntop: %i; bottom: %i", topRange, bottomRange);
}

function printSeed() {
	const buf = STRING(); // char[COLS];
	sprintf(buf, "Dungeon seed #%i; turn #%i", rogue.seed, rogue.playerTurnNumber);
	message(buf, false);
}


function printProgressBar(x, y, barLabel, amtFilled, amtMax, /* color */ fillColor, dim) {
	const barText = STRING(barLabel); // string length is 20
	let i, labelOffset;
	let currentFillColor = color(), textColor = color(), progressBarColor, darkenedBarColor; // color

	if (y >= ROWS - 1) { // don't write over the depth number
		return;
	}

	if (amtFilled > amtMax) {
		amtFilled = amtMax;
	}

	if (amtMax <= 0) {
		amtMax = 1;
	}

	progressBarColor = fillColor.clone();
	if (!(y % 2)) {
		applyColorAverage(progressBarColor, black, 25);
	}

	if (dim) {
		applyColorAverage(progressBarColor, black, 50);
	}
	darkenedBarColor = progressBarColor.clone();
	applyColorAverage(darkenedBarColor, black, 75);

  centerText(barText, 20);

	amtFilled = clamp(amtFilled, 0, amtMax);

	if (amtMax < 10000000) {
		amtFilled *= 100;
		amtMax *= 100;
	}

	for (i=0; i<20; i++) {
		currentFillColor.copy(i <= (20 * amtFilled / amtMax) ? progressBarColor : darkenedBarColor);
		if (i == 20 * amtFilled / amtMax) {
			applyColorAverage(currentFillColor, black, 75 - 75 * (amtFilled % (amtMax / 20)) / (amtMax / 20));
		}
		textColor.copy(dim ? gray : white);
		applyColorAverage(textColor, currentFillColor, (dim ? 50 : 33));
		plotCharWithColor(barText.text[i], x + i, y, textColor, currentFillColor);
	}

}


// // Very low-level. Changes displayBuffer directly.
function highlightScreenCell(x, y, /* color */ highlightColor, strength)
{
	let tempColor; // color

	tempColor = colorFromComponents(displayBuffer[x][y].foreColorComponents);
	applyColorAugment(tempColor, highlightColor, strength);
	storeColorComponents(displayBuffer[x][y].foreColorComponents, tempColor);

	tempColor = colorFromComponents(displayBuffer[x][y].backColorComponents);
	applyColorAugment(tempColor, highlightColor, strength);
	storeColorComponents(displayBuffer[x][y].backColorComponents, tempColor);

	displayBuffer[x][y].needsUpdate = true;
}

function estimatedArmorValue() {
    let retVal = 0;

    retVal = ((armorTable[rogue.armor.kind].range.upperBound + armorTable[rogue.armor.kind].range.lowerBound) / 2) / 10;
    retVal += fp_strengthModifier(rogue.armor) >> FP_BASE;
    retVal -= player.status[STATUS_DONNING];

    return max(0, Math.floor(retVal));
}

function creatureHealthChangePercent(/* creature */ monst) {
    let currentPercent, previousPercent;
    if (monst.previousHealthPoints <= 0) {
        return 0;
    }
    currentPercent = Math.floor(monst.currentHP * 100 / monst.info.maxHP);
    previousPercent = Math.floor(monst.previousHealthPoints * 100 / monst.info.maxHP);
    return Math.floor(monst.currentHP * 100 / monst.previousHealthPoints) - 100;
}


// returns the y-coordinate after the last line printed
function printMonsterInfo(/* creature */monst, y, dim, highlight)
{
	const buf = STRING(), buf2 = STRING(), monstName = STRING(), tempColorEscape = STRING(), grayColorEscape = STRING();
	let monstChar;
	let monstForeColor, monstBackColor, healthBarColor, tempColor = white.clone();
	let initialY, i, j, highlightStrength, displayedArmor, percent;
	let inPath;

	if (y >= ROWS - 1) {
		return ROWS - 1;
	}

	initialY = y;

	// assureCosmeticRNG();

	if (y < ROWS - 1) {
		printString("                    ", 0, y, white, black, 0); // Start with a blank line

		// Unhighlight if it's highlighted as part of the path.
		inPath = (pmap[monst.xLoc][monst.yLoc].flags & IS_IN_PATH) ? true : false;
		pmap[monst.xLoc][monst.yLoc].flags &= ~IS_IN_PATH;
		const monstApp = getCellAppearance(monst.xLoc, monst.yLoc);

    applyColorBounds(monstApp.foreColor, 0, 100);
    applyColorBounds(monstApp.backColor, 0, 100);
		if (inPath) {
			pmap[monst.xLoc][monst.yLoc].flags |= IS_IN_PATH;
		}

		if (dim) {
			applyColorAverage(monstApp.foreColor, black, 50);
			applyColorAverage(monstApp.backColor, black, 50);
		} else if (highlight) {
			applyColorAugment(monstApp.foreColor, black, 100);
			applyColorAugment(monstApp.backColor, black, 100);
		}
		plotCharWithColor(monstApp.char, 0, y, monstApp.foreColor, monstApp.backColor);

		//patch to indicate monster is carrying item
		// if(monst.carriedItem) {
		// 	plotCharWithColor(monst.carriedItem.displayChar, 1, y, itemColor, black);
		// }
		//end patch


		monsterName(monstName, monst, false);
		capitalize(monstName);

    if (monst === player) {
        if (player.status[STATUS_INVISIBLE]) {
					strcat(monstName, " ");
					encodeMessageColor(monstName, strlen(monstName), monstForeColor);
					strcat(monstName, "(invisible)");
        } else if (playerInDarkness()) {
					strcat(monstName, " ");
					//encodeMessageColor(monstName, strlen(monstName) - 4, &playerInDarknessColor);
					encodeMessageColor(monstName, strlen(monstName), monstForeColor);
					strcat(monstName, "(dark)");
        } else if (!pmap[player.xLoc][player.yLoc].flags & IS_IN_SHADOW) {
					strcat(monstName, " ");
					//encodeMessageColor(monstName, strlen(monstName) - 4, &playerInLightColor);
					encodeMessageColor(monstName, strlen(monstName), monstForeColor);
					strcat(monstName, "(lit)");
        }
    }

		sprintf(buf, ": %s", monstName);

		printString("                   ", 1, y, white, black, 0);
		printString(buf, 1, y++, (dim ? gray : white), black, 0);
	}

  // mutation, if any
  if (y < ROWS - 1
      && monst.mutationIndex >= 0
      && (!player.status[STATUS_HALLUCINATING] || rogue.playbackOmniscience))
  {
      tempColor.copy(mutationCatalog[monst.mutationIndex].textColor);
      if (dim) {
          applyColorAverage(tempColor, black, 50);
      }
			encodeMessageColor(buf, 0, tempColor);
			sprintf(buf2, "(%s)", mutationCatalog[monst.mutationIndex].title);
			strcat(buf, buf2);
      centerText(buf, 20);
	    printString(buf, 0, y++, (dim ? gray : white), black, 0);
  }

	// hit points
	if (monst.info.maxHP > 1 && !(monst.info.flags & MONST_INVULNERABLE))
  {
		if (monst === player) {
			healthBarColor = redBar.clone();
			applyColorAverage(healthBarColor, blueBar, min(100, 100 * player.currentHP / player.info.maxHP));
		} else {
			healthBarColor = blueBar;
		}

		percent = creatureHealthChangePercent(monst);
		if (monst.currentHP <= 0) {
				strcpy(buf, "Dead");
		} else if (percent != 0) {
				strcpy(buf, "Health");
				sprintf(buf2, " (%s%i%)", percent > 0 ? "+" : "", percent);
				strcat(buf, buf2);
				centerText(buf, 20);
		} else {
				strcpy(buf, "Health");
		}
		printProgressBar(0, y++, buf, monst.currentHP, monst.info.maxHP, healthBarColor, dim);
	}

	if (monst === player) {
		// nutrition
		if (player.status[STATUS_NUTRITION] > HUNGER_THRESHOLD) {
			printProgressBar(0, y++, "Nutrition", player.status[STATUS_NUTRITION], STOMACH_SIZE, blueBar, dim);
		} else if (player.status[STATUS_NUTRITION] > WEAK_THRESHOLD) {
			printProgressBar(0, y++, "Nutrition (Hungry)", player.status[STATUS_NUTRITION], STOMACH_SIZE, blueBar, dim);
		} else if (player.status[STATUS_NUTRITION] > FAINT_THRESHOLD) {
			printProgressBar(0, y++, "Nutrition (Weak)", player.status[STATUS_NUTRITION], STOMACH_SIZE, blueBar, dim);
		} else if (player.status[STATUS_NUTRITION] > 0) {
			printProgressBar(0, y++, "Nutrition (Faint)", player.status[STATUS_NUTRITION], STOMACH_SIZE, blueBar, dim);
		} else if (y < ROWS - 1) {
			printString("      STARVING      ", 0, y++, badMessageColor, black, NULL);
		}
	}

	if (!player.status[STATUS_HALLUCINATING] || rogue.playbackOmniscience || monst === player) {

		for (i=0; i<NUMBER_OF_STATUS_EFFECTS; i++) {
			if (i == STATUS_WEAKENED && monst.status[i] > 0) {
				buf = statusStrings[STATUS_WEAKENED] + monst.weaknessAmount;
				printProgressBar(0, y++, buf, monst.status[i], monst.maxStatus[i], redBar, dim);
			} else if (i == STATUS_LEVITATING && monst.status[i] > 0) {
				printProgressBar(0, y++, (monst === player ? "Levitating" : "Flying"), monst.status[i], monst.maxStatus[i], redBar, dim);
			} else if (i == STATUS_POISONED
					   && monst.status[i] > 0)
      {
				if (monst.status[i] * monst.poisonAmount >= monst.currentHP) {
						strcpy(buf, "Fatal Poison");
				} else {
						strcpy(buf, "Poisoned");
				}
        if (monst.poisonAmount == 1) {
            printProgressBar(0, y++, buf, monst.status[i], monst.maxStatus[i], redBar, dim);
        } else {
						sprintf(buf2, "%s (x%i)",
									buf,
									monst.poisonAmount);
            printProgressBar(0, y++, buf2, monst.status[i], monst.maxStatus[i], redBar, dim);
        }
			} else if (statusStrings[i][0] && monst.status[i] > 0) {
				printProgressBar(0, y++, statusStrings[i], monst.status[i], monst.maxStatus[i], redBar, dim);
			}
		}
		if (monst.targetCorpseLoc[0] == monst.xLoc && monst.targetCorpseLoc[1] == monst.yLoc) {
			printProgressBar(0, y++,  monsterText[monst.info.monsterID].absorbStatus, monst.corpseAbsorptionCounter, 20, redBar, dim);
		}
	}

	if (monst !== player &&
    (!(monst.info.flags & MONST_INANIMATE) || monst.creatureState == MONSTER_ALLY))
  {
			if (y < ROWS - 1) {
				if (player.status[STATUS_HALLUCINATING] && !rogue.playbackOmniscience && y < ROWS - 1) {
					printString(hallucinationStrings[cosmetic_range(0, 9)], 0, y++, (dim ? darkGray : gray), black, 0);
				} else if (monst.bookkeepingFlags & MB_CAPTIVE && y < ROWS - 1) {
					printString("     (Captive)      ", 0, y++, (dim ? darkGray : gray), black, 0);
				} else if ((monst.info.flags & MONST_RESTRICTED_TO_LIQUID)
						   && !cellHasTMFlag(monst.xLoc, monst.yLoc, TM_ALLOWS_SUBMERGING)) {
					printString("     (Helpless)     ", 0, y++, (dim ? darkGray : gray), black, 0);
				} else if (monst.creatureState == MONSTER_SLEEPING && y < ROWS - 1) {
					printString("     (Sleeping)     ", 0, y++, (dim ? darkGray : gray), black, 0);
        } else if ((monst.creatureState == MONSTER_ALLY) && y < ROWS - 1) {
                    printString("       (Ally)       ", 0, y++, (dim ? darkGray : gray), black, 0);
				} else if (monst.creatureState == MONSTER_FLEEING && y < ROWS - 1) {
					printString("     (Fleeing)      ", 0, y++, (dim ? darkGray : gray), black, 0);
				} else if ((monst.creatureState == MONSTER_WANDERING) && y < ROWS - 1) {
					if ((monst.bookkeepingFlags & MB_FOLLOWER) && monst.leader && (monst.leader.info.flags & MONST_IMMOBILE)) {
						// follower of an immobile leader -- i.e. a totem
						printString("    (Worshiping)    ", 0, y++, (dim ? darkGray : gray), black, 0);
					} else if ((monst.bookkeepingFlags & MB_FOLLOWER) && monst.leader && (monst.leader.bookkeepingFlags & MB_CAPTIVE)) {
						// actually a captor/torturer
						printString("     (Guarding)     ", 0, y++, (dim ? darkGray : gray), black, 0);
					} else {
						printString("    (Wandering)     ", 0, y++, (dim ? darkGray : gray), black, 0);
					}
        } else if (monst.ticksUntilTurn > max(0, player.ticksUntilTurn) + player.movementSpeed) {
            printString("   (Off balance)    ", 0, y++, (dim ? darkGray : gray), black, 0);
        } else if ((monst.creatureState == MONSTER_TRACKING_SCENT) && y < ROWS - 1) {
					printString("     (Hunting)      ", 0, y++, (dim ? darkGray : gray), black, 0);
				}
			}
	} else if (monst === player) {
		if (y < ROWS - 1) {
			// tempColorEscape[0] = '\0';
			// grayColorEscape[0] = '\0';
			if (player.status[STATUS_WEAKENED]) {
				tempColor.copy(red);
				if (dim) {
					applyColorAverage(tempColor, black, 50);
				}
				// encodeMessageColor(tempColorEscape, 0, &tempColor);
				// encodeMessageColor(grayColorEscape, 0, (dim ? &darkGray : &gray));
			}

      displayedArmor = displayedArmorValue();

			if (!rogue.armor || rogue.armor.flags & ITEM_IDENTIFIED || rogue.playbackOmniscience) {
				sprintf(buf, "Str: %s%i%s  Armor: %i",
						tempColorEscape,
						rogue.strength - player.weaknessAmount,
						grayColorEscape,
						displayedArmor);
			} else {
				sprintf(buf, "Str: %s%i%s  Armor: %i?",
						tempColorEscape,
						rogue.strength - player.weaknessAmount,
						grayColorEscape,
						estimatedArmorValue());
			}
			//buf[20] = '\0';
			centerText(buf, 20);
			printString(buf, 0, y++, (dim ? darkGray : gray), black, 0);
		}
		if (y < ROWS - 1 && rogue.gold) {
			sprintf(buf, "Gold: %li", rogue.gold);
			centerText(buf, 20);
			printString(buf, 0, y++, (dim ? darkGray : gray), black, 0);
		}
    if (y < ROWS - 1) {
      tempColor.copy(playerInShadowColor);
      percent = (rogue.aggroRange - 2) * 100 / 28;
      applyColorAverage(tempColor, black, percent);
      applyColorAugment(tempColor, playerInLightColor, percent);
      if (dim) {
          applyColorAverage(tempColor, black, 50);
      }
			encodeMessageColor(tempColorEscape, 0, tempColor);
			encodeMessageColor(grayColorEscape, 0, (dim ? darkGray : gray));
			sprintf(buf, "%{s}Stealth range: %i%s",
							tempColorEscape,
							rogue.aggroRange,
							grayColorEscape);
			centerText(buf, 20);
			// printString("                    ", 0, y, white, black, 0);
			printString(buf, 0, y++, (dim ? darkGray : gray), black, 0);
    }
  }

	if (y < ROWS - 1) {
		printString("                    ", 0, y++, (dim ? darkGray : gray), black, 0);
	}

	if (highlight) {
		for (i=0; i<20; i++) {
			highlightStrength = smoothHiliteGradient(i, 20-1) / 10;
			for (j=initialY; j < (y == ROWS - 1 ? y : min(y - 1, ROWS - 1)); j++) {
				highlightScreenCell(i, j, white, highlightStrength);
			}
		}
	}

	// restoreRNG();
	return y;
}


function describeHallucinatedItem(buf) {
	const itemCats = [FOOD, WEAPON, ARMOR, POTION, SCROLL, STAFF, WAND, RING, CHARM/* , GOLD */];
  let cat, kind, maxKinds, table;
  // assureCosmeticRNG();
	do {
		cat = itemCats[cosmetic_range(0, 9)];
	  table = tableForItemCategory(cat);
		if (!table) {
			message('ERROR - item category has no table = ' + itemCategory.toString(cat), red);
		}
	}
	while(!table)

  kind = cosmetic_range(0, table.length - 1);
  describedItemBasedOnParameters(cat, kind, 1, buf);
  // restoreRNG();
}

// Returns the y-coordinate after the last line printed.
function printItemInfo(/* item */ theItem, y, dim, highlight) {
	const name = STRING(); // char[COLS * 3];
	let itemChar;
	let itemForeColor, itemBackColor;  // color
	let initialY, i, j, highlightStrength, lineCount;
	let inPath;

	if (y >= ROWS - 1) {
		return ROWS - 1;
	}

	initialY = y;

	// assureCosmeticRNG();

	if (y < ROWS - 1) {
		// Unhighlight if it's highlighted as part of the path.
		inPath = (pmap[theItem.xLoc][theItem.yLoc].flags & IS_IN_PATH) ? true : false;
		pmap[theItem.xLoc][theItem.yLoc].flags &= ~IS_IN_PATH;
		const app = getCellAppearance(theItem.xLoc, theItem.yLoc);
    applyColorBounds(app.foreColor, 0, 100);
    applyColorBounds(app.backColor, 0, 100);
		if (inPath) {
			pmap[theItem.xLoc][theItem.yLoc].flags |= IS_IN_PATH;
		}
		if (dim) {
			applyColorAverage(app.foreColor, black, 50);
			applyColorAverage(app.backColor, black, 50);
		}
		plotCharWithColor(app.char, 0, y, app.foreColor, app.backColor);
		printString(":                  ", 1, y, (dim ? gray : white), black, 0);
		if (rogue.playbackOmniscience || !player.status[STATUS_HALLUCINATING]) {
			itemName(theItem, name, true, true, (dim ? gray : white));
		} else {
      describeHallucinatedItem(name);
		}
		capitalize(name);
		lineCount = wrapText(NULL, name, 20-3);
		for (i=initialY + 1; i <= initialY + lineCount + 1 && i < ROWS - 1; i++) {
			printString("                    ", 0, i, (dim ? darkGray : gray), black, 0);
		}
		y = printStringWithWrapping(name, 3, y, 20-3, (dim ? gray : white), black, NULL); // Advances y.
	}

	if (highlight) {
		for (i=0; i<20; i++) {
			highlightStrength = smoothHiliteGradient(i, 20-1) / 10;
			for (j=initialY; j <= y && j < ROWS - 1; j++) {
				highlightScreenCell(i, j, white, highlightStrength);
			}
		}
	}
	y += 2;

	// restoreRNG();
	return y;
}

// Returns the y-coordinate after the last line printed.
function printTerrainInfo(x, y, py, description, dim, highlight) {
	let displayChar;
	let foreColor, backColor;    // color
	let initialY, i, j, highlightStrength, lineCount;
	let inPath;
  const name = STRING(); // char[DCOLS*2];
  const textColor = color();

	if (py >= ROWS - 1) {
		return ROWS - 1;
	}

	initialY = py;
  // assureCosmeticRNG();

	if (py < ROWS - 1) {
		// Unhighlight if it's highlighted as part of the path.
		inPath = (pmap[x][y].flags & IS_IN_PATH) ? true : false;
		pmap[x][y].flags &= ~IS_IN_PATH;
		const app = getCellAppearance(x, y);
    applyColorBounds(app.foreColor, 0, 100);
    applyColorBounds(app.backColor, 0, 100);
		if (inPath) {
			pmap[x][y].flags |= IS_IN_PATH;
		}
		if (dim) {
			applyColorAverage(app.foreColor, black, 50);
			applyColorAverage(app.backColor, black, 50);
		}
		plotCharWithColor(app.char, 0, py, app.foreColor, app.backColor);
		printString(":                  ", 1, py, (dim ? gray : white), black, 0);
		strcpy(name, description);
		capitalize(name);
		lineCount = wrapText(NULL, name, 20-3);
		for (i=initialY + 1; i <= initialY + lineCount + 1 && i < ROWS - 1; i++) {
			printString("                    ", 0, i, (dim ? darkGray : gray), black, 0);
		}
    textColor.copy(flavorTextColor);
    if (dim) {
        applyColorScalar(textColor, 50);
    }
		py = printStringWithWrapping(name, 3, py, 20-3, textColor, black, NULL); // Advances y.
	}

	if (highlight) {
		for (i=0; i<20; i++) {
			highlightStrength = smoothHiliteGradient(i, 20-1) / 10;
			for (j=initialY; j <= py && j < ROWS - 1; j++) {
				highlightScreenCell(i, j, white, highlightStrength);
			}
		}
	}
	py += 2;

	// restoreRNG();
	return py;
}


function rectangularShading( x,  y,  width,  height,
  /* color */ backColor, opacity,  dbuf /* cellDisplayBuffer[COLS][ROWS] */)
{
	let i, j, dist;

	// assureCosmeticRNG();
	for (i=0; i<COLS; i++) {
		for (j=0; j<ROWS; j++) {
			storeColorComponents(dbuf[i][j].backColorComponents, backColor);

			if (i >= x && i < x + width
				&& j >= y && j < y + height)
      {
				dbuf[i][j].opacity = min(100, opacity);
			} else {
				dist = 0;
				dist += max(0, max(x - i, i - x - width + 1));
				dist += max(0, max(y - j, j - y - height + 1));
				dbuf[i][j].opacity = Math.floor((opacity - 10) / max(1, dist));
				if (dbuf[i][j].opacity < 3) {
					dbuf[i][j].opacity = 0;
				}
			}
		}
	}

//	for (i=0; i<COLS; i++) {
//		for (j=0; j<ROWS; j++) {
//			if (i >= x && i < x + width && j >= y && j < y + height) {
//				plotCharWithColor(' ', i, j, &white, &darkGreen);
//			}
//		}
//	}
//	displayMoreSign();

	// restoreRNG();
}

const MIN_DEFAULT_INFO_PANEL_WIDTH	= 33;



// y and width are optional and will be automatically calculated if width <= 0.
// Width will automatically be widened if the text would otherwise fall off the bottom of the
// screen, and x will be adjusted to keep the widening box from spilling off the right of the
// screen.
// If buttons are provided, we'll extend the text box downward, re-position the buttons,
// run a button input loop and return the result.
// (Returns -1 for canceled; otherwise the button index number.)
async function printTextBox(textBuf, x, y, width,
				   /* color */ foreColor, /* color */ backColor,
				   rbuf /* cellDisplayBuffer[COLS][ROWS] */,
				   /* brogueButton[] */ buttons, buttonCount)
{
	const dbuf = GRID(COLS, ROWS, cellDisplayBuffer); // cellDisplayBuffer[COLS][ROWS];

	let x2, y2, lineCount, i, bx, by, padLines;

	if (width <= 0) {
		// autocalculate y and width
		if (x < DCOLS / 2 - 1) {
			x2 = mapToWindowX(x + 10);
			width = (DCOLS - x) - 20;
		} else {
			x2 = mapToWindowX(10);
			width = x - 20;
		}
		y2 = mapToWindowY(2);

		if (width < MIN_DEFAULT_INFO_PANEL_WIDTH) {
      x2 -= Math.round((MIN_DEFAULT_INFO_PANEL_WIDTH - width) / 2);
			width = MIN_DEFAULT_INFO_PANEL_WIDTH;
		}
	} else {
		y2 = y;
		x2 = x;
	}

	while (((lineCount = wrapText(NULL, textBuf, width)) + y2) >= ROWS - 2 && width < COLS-5) {
		// While the text doesn't fit and the width doesn't fill the screen, increase the width.
		width++;
		if (x2 + (width / 2) > COLS / 2) {
			// If the horizontal midpoint of the text box is on the right half of the screen,
			// move the box one space to the left.
			x2--;
		}
	}

	if (buttonCount > 0) {
		padLines = 2;
		bx = x2 + width;
		by = y2 + lineCount + 1;
		for (i=0; i<buttonCount; i++) {
			if (buttons[i].flags & B_DRAW) {
				bx -= strLenWithoutEscapes(buttons[i].text) + 2;
				buttons[i].x = bx;
				buttons[i].y = by;
				if (bx < x2) {
					// Buttons can wrap to the next line (though are double-spaced).
					bx = x2 + width - (strLenWithoutEscapes(buttons[i].text) + 2);
					by += 2;
					padLines += 2;
					buttons[i].x = bx;
					buttons[i].y = by;
				}
			}
		}
	} else {
		padLines = 0;
	}

	clearDisplayBuffer(dbuf);
	printStringWithWrapping(textBuf, x2, y2, width, foreColor, backColor, dbuf);
	rectangularShading(x2, y2, width, lineCount + padLines, backColor, INTERFACE_OPACITY, dbuf);
	overlayDisplayBuffer(dbuf, rbuf);

	if (buttonCount > 0) {
		return await buttonInputLoop(buttons, buttonCount, x2, y2, width, by - y2 + 1 + padLines, NULL);
	} else {
		return -1;
	}
}

function printMonsterDetails( /* creature */ monst,  rbuf /* cellDisplayBuffer[COLS][ROWS] */) {
	const textBuf = STRING(); // char[COLS * 100];

	monsterDetails(textBuf, monst);
	printTextBox(textBuf, monst.xLoc, 0, 0, white, black, rbuf);
}

// Displays the item info box with the dark blue background.
// If includeButtons is true, we include buttons for item actions.
// Returns the key of an action to take, if any; otherwise -1.
async function printCarriedItemDetails( /* item */ theItem,
									  x, y, width,
									  includeButtons,
									  rbuf /* cellDisplayBuffer[COLS][ROWS] */)
{
	const textBuf = STRING();  // [COLS * 100],
  const goldColorEscape = STRING(), whiteColorEscape = STRING();
	const buttons = ARRAY(20, brogueButton ); // [20] = {{{0}}};
	let b;

	itemDetails(textBuf, theItem);

	for (b=0; b<20; b++) {
		initializeButton(buttons[b]);
		buttons[b].flags |= B_WIDE_CLICK_AREA;
	}

	b = 0;
	if (includeButtons) {
		encodeMessageColor(goldColorEscape, 0, KEYBOARD_LABELS ? yellow : white);
		encodeMessageColor(whiteColorEscape, 0, white);

		if (theItem.category & (FOOD | SCROLL | POTION | WAND | STAFF | CHARM)) {
			sprintf(buttons[b].text, "   %{s}a%{s}pply   ", goldColorEscape, whiteColorEscape);
			buttons[b].hotkey[0] = APPLY_KEY;
			b++;
		}
		if (theItem.category & (ARMOR | WEAPON | RING)) {
			if (theItem.flags & ITEM_EQUIPPED) {
				sprintf(buttons[b].text, "  %{s}r%{s}emove   ", goldColorEscape, whiteColorEscape);
				buttons[b].hotkey[0] = UNEQUIP_KEY;
				b++;
			} else {
				sprintf(buttons[b].text, "   %{s}e%{s}quip   ", goldColorEscape, whiteColorEscape);
				buttons[b].hotkey[0] = EQUIP_KEY;
				b++;
			}
		}
		sprintf(buttons[b].text, "   %{s}d%{s}rop    ", goldColorEscape, whiteColorEscape);
		buttons[b].hotkey[0] = DROP_KEY;
		b++;

		sprintf(buttons[b].text, "   %{s}t%{s}hrow   ", goldColorEscape, whiteColorEscape);
		buttons[b].hotkey[0] = THROW_KEY;
		b++;

		if (itemCanBeCalled(theItem)) {
			sprintf(buttons[b].text, "   %{s}c%{s}all    ", goldColorEscape, whiteColorEscape);
			buttons[b].hotkey[0] = CALL_KEY;
			b++;
		}

		if (KEYBOARD_LABELS) {
        sprintf(buttons[b].text, "  %{s}R%{s}elabel  ", goldColorEscape, whiteColorEscape);
        buttons[b].hotkey[0] = RELABEL_KEY;
        b++;
    }

		// Add invisible previous and next buttons, so up and down arrows can page through items.
		// Previous
		buttons[b].flags = B_ENABLED; // clear everything else
		buttons[b].hotkey[0] = UP_KEY;
		buttons[b].hotkey[1] = NUMPAD_8;
		buttons[b].hotkey[2] = UP_ARROW;
		b++;
		// Next
		buttons[b].flags = B_ENABLED; // clear everything else
		buttons[b].hotkey[0] = DOWN_KEY;
		buttons[b].hotkey[1] = NUMPAD_2;
		buttons[b].hotkey[2] = DOWN_ARROW;
		b++;
	}

  b = await printTextBox(textBuf, x, y, width, white, interfaceBoxColor, rbuf, buttons, b);

	if (!includeButtons) {
		await waitForKeystrokeOrMouseClick();
		return -1;
	}

	if (b >= 0) {
		return buttons[b].hotkey[0];
	} else {
		return -1;
	}
}

// Returns true if an action was taken.
function printFloorItemDetails( /* item */ theItem,  rbuf /* cellDisplayBuffer[COLS][ROWS] */) {
	const textBuf = STRING(); // char[COLS * 100];

	itemDetails(textBuf, theItem);
	printTextBox(textBuf, theItem.xLoc, 0, 0, white, black, rbuf);
}
