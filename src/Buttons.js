/*
 *  Buttons.c
 *  Brogue
 *
 *  Created by Brian Walker on 11/18/11.
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
// #include <time.h>

// Draws the smooth gradient that appears on a button when you hover over or depress it.
// Returns the percentage by which the current tile should be averaged toward a hilite color.
function smoothHiliteGradient(currentXValue, maxXValue) {
    return Math.floor(100 * Math.sin(PI * currentXValue / (maxXValue)));
}




// Draws the button to the screen, or to a display buffer if one is given.
// Button back color fades from -50% intensity at the edges to the back color in the middle.
// Text is white, but can use color escapes.
//		Hovering highlight augments fore and back colors with buttonHoverColor by 20%.
//		Pressed darkens the middle color (or turns it the hover color if the button is black).
function drawButton( /* brogueButton */ button, /*enum buttonDrawStates */ highlight, /* cellDisplayBuffer */ dbuf)
{
	let i, textLoc, width, midPercent, symbolNumber, opacity, oldRNG;
	let fColor = color(), bColor = color(), fColorBase, bColorBase, bColorEdge, bColorMid;
	let displayCharacter;

	if (!(button.flags & B_DRAW)) {
		return;
	}

  // assureCosmeticRNG();
	// oldRNG = rogue.RNG;
  // rogue.RNG = RNG_COSMETIC;

	symbolNumber = 0;

	width = strLenWithoutEscapes(button.text);
	bColorBase = button.buttonColor.clone();
	fColorBase = ((button.flags & B_ENABLED) ? white : gray).clone();

	if (highlight == BUTTON_HOVER && (button.flags & B_HOVER_ENABLED)) {
		//applyColorAugment(&fColorBase, &buttonHoverColor, 20);
		//applyColorAugment(&bColorBase, &buttonHoverColor, 20);
		applyColorAverage(fColorBase, buttonHoverColor, 25);
		applyColorAverage(bColorBase, buttonHoverColor, 25);
	}

	bColorEdge = bColorBase.clone();
	bColorMid	= bColorBase.clone();
	applyColorAverage(bColorEdge, black, 50);

	if (highlight == BUTTON_PRESSED) {
		applyColorAverage(bColorMid, black, 75);
		if (COLOR_DIFF(bColorMid, bColorBase) < 50) {
			bColorMid	= bColorBase;
			applyColorAverage(bColorMid, buttonHoverColor, 50);
		}
	}
	// bColor = bColorMid.clone();

	opacity = button.opacity;
	if (highlight == BUTTON_HOVER || highlight == BUTTON_PRESSED) {
		opacity = 100 - ((100 - opacity) * opacity / 100); // Apply the opacity twice.
	}

  for (i = textLoc = 0; i < width && i + button.x < COLS; i++, textLoc++) {
		while (button.text.charCodeAt(textLoc) === COLOR_ESCAPE) {
			textLoc = decodeMessageColor(button.text, textLoc, fColorBase);
		}

		fColor.copy(fColorBase);

  	if (button.flags & B_GRADIENT) {
      midPercent = smoothHiliteGradient(i, width - 1);
			bColor.copy(bColorEdge);
			applyColorAverage(bColor, bColorMid, midPercent);
		}
    else {
      bColor.copy(bColorMid);
    }

		if (highlight == BUTTON_PRESSED) {
			applyColorAverage(fColor, bColor, 30);
		}

		if (button.opacity < 100) {
			applyColorAverage(fColor, bColor, 100 - opacity);
		}

		bakeColor(fColor);
		bakeColor(bColor);
		separateColors(fColor, bColor);

		displayCharacter = button.text.text[textLoc];
		if (displayCharacter === '*') {
			if (button.symbol[symbolNumber]) {
				displayCharacter = button.symbol[symbolNumber];
			}
			symbolNumber++;
		}

		if (coordinatesAreInWindow(button.x + i, button.y)) {
			if (dbuf) {
				plotCharToBuffer(displayCharacter, button.x + i, button.y, fColor, bColor, dbuf);
				dbuf[button.x + i][button.y].opacity = opacity;
			} else {
				plotCharWithColor(displayCharacter, button.x + i, button.y, fColor, bColor);
			}
		}

  }

  // restoreRNG();
}


function clearButton(button) {
  	button.text = STRING(); // [COLS*3];			// button label; can include color escapes
  	button.x = 0;					// button's leftmost cell will be drawn at (x, y)
  	button.y = 0;
  	button.hotkey = []; // [10];		// up to 10 hotkeys to trigger the button
  	button.buttonColor = null;			// background of the button; further gradient-ized when displayed
  	button.opacity = 0;				// further reduced by 50% if not enabled
  	button.symbol = [];	//[COLS]		// Automatically replace the nth asterisk in the button label text with
  								// the nth character supplied here, if one is given.
  								// (Primarily to display magic character and item symbols in the inventory display.)
  	button.flags = 0;
}


function initializeButton(button) {

	clearButton(button);
	// button.text = '';
	button.flags |= (B_ENABLED | B_GRADIENT | B_HOVER_ENABLED | B_DRAW | B_KEYPRESS_HIGHLIGHT);
	button.buttonColor = interfaceButtonColor;
	button.opacity = 100;
}

function drawButtonsInState(/* buttonState */ state) {
	let i;

	// Draw the buttons to the dbuf:
	for (i=0; i < state.buttonCount; i++) {
		if (state.buttons[i].flags & B_DRAW) {
			drawButton(state.buttons[i], BUTTON_NORMAL, state.dbuf);
		}
	}
}

function initializeButtonState(/* buttonState */ state,
						   buttons,
						   buttonCount,
						   winX,
						   winY,
						   winWidth,
						   winHeight)
{
	let i, j;

	// Initialize variables for the state struct:
	state.buttonChosen = state.buttonFocused = state.buttonDepressed = -1;
	state.buttonCount	= buttonCount;
	state.winX			= winX;
	state.winY			= winY;
	state.winWidth	= winWidth;
	state.winHeight	= winHeight;
	for (i=0; i < state.buttonCount; i++) {
		state.buttons[i] = buttons[i];
	}
	copyDisplayBuffer(state.rbuf, displayBuffer);
	clearDisplayBuffer(state.dbuf);

	drawButtonsInState(state);

	// Clear the rbuf so that it resets only those parts of the screen in which buttons are drawn in the first place:
	for (i=0; i<COLS; i++) {
		for (j=0; j<ROWS; j++) {
			state.rbuf[i][j].opacity = (state.dbuf[i][j].opacity ? 100 : 0);
		}
	}
}

// Processes one round of user input, and bakes the necessary graphical changes into state.dbuf.
// Does NOT display the buttons or revert the display afterward.
// Assumes that the display has already been updated (via overlayDisplayBuffer(state.dbuf, NULL))
// and that input has been solicited (via nextBrogueEvent(event, ___, ___, ___)).
// Also relies on the buttonState having been initialized with initializeButtonState() or otherwise.
// Returns the index of a button if one is chosen.
// Otherwise, returns -1. That can be if the user canceled (in which case *canceled is true),
// or, more commonly, if the user's input in this particular split-second round was not decisive.
async function processButtonInput(/*buttonState */ state, /* rogueEvent */ theEvent) {
	let i, k, x, y;
	let buttonUsed = false;

	// Mouse event:
	if (theEvent.eventType == MOUSE_DOWN
		|| theEvent.eventType == MOUSE_UP
		|| theEvent.eventType == MOUSE_ENTERED_CELL)
  {
		x = theEvent.param1;
		y = theEvent.param2;

		// Revert the button with old focus, if any.
		if (state.buttonFocused >= 0) {
			drawButton(state.buttons[state.buttonFocused], BUTTON_NORMAL, state.dbuf);
			state.buttonFocused = -1;
		}

    if (theEvent.eventType == MOUSE_ENTERED_CELL && state.buttonDepressed >= 0) {
			drawButton(state.buttons[state.buttonDepressed], BUTTON_NORMAL, state.dbuf);
			state.buttonDepressed = -1;
		}

		// Find the button with new focus, if any.
		for (i=0; i < state.buttonCount; i++) {
			if ((state.buttons[i].flags & B_DRAW)
				&& (state.buttons[i].flags & B_ENABLED)
				&& (state.buttons[i].y == y || ((state.buttons[i].flags & B_WIDE_CLICK_AREA) && abs(state.buttons[i].y - y) <= 1))
				&& x >= state.buttons[i].x
				&& x < state.buttons[i].x + strLenWithoutEscapes(state.buttons[i].text))
      {
				state.buttonFocused = i;
				if (theEvent.eventType == MOUSE_DOWN) {
					state.buttonDepressed = i; // Keeps track of which button is down at the moment. Cleared on mouseup.
				}
				break;
			}
		}
		if (i == state.buttonCount) { // No focus this round.
			state.buttonFocused = -1;
		}

		if (state.buttonDepressed >= 0) {
			if (state.buttonDepressed == state.buttonFocused) {
				drawButton(state.buttons[state.buttonDepressed], BUTTON_PRESSED, state.dbuf);
			}
		} else if (state.buttonFocused >= 0) {
			// If no button is depressed, then update the appearance of the button with the new focus, if any.
			drawButton(state.buttons[state.buttonFocused], BUTTON_HOVER, state.dbuf);
		}

		// Mouseup:
		if (theEvent.eventType == MOUSE_UP) {
			if (state.buttonDepressed == state.buttonFocused && state.buttonFocused >= 0) {
				// If a button is depressed, and the mouseup happened on that button, it has been chosen and we're done.
				buttonUsed = true;
			} else {
				// Otherwise, no button is depressed. If one was previously depressed, redraw it.
				if (state.buttonDepressed >= 0) {
					drawButton(state.buttons[state.buttonDepressed], BUTTON_NORMAL, state.dbuf);
				} else if (!(x >= state.winX && x < state.winX + state.winWidth
							 && y >= state.winY && y < state.winY + state.winHeight))
        {
					// Clicking outside of a button means canceling.
					theEvent.canceled = true;
				}

				if (state.buttonFocused >= 0) {
					// Buttons don't hover-highlight when one is depressed, so we have to fix that when the mouse is up.
					drawButton(state.buttons[state.buttonFocused], BUTTON_HOVER, state.dbuf);
				}
				state.buttonDepressed = -1;
			}
		}
	}

	// Keystroke:
	if (theEvent.eventType == KEYSTROKE) {

		// Cycle through all of the hotkeys of all of the buttons.
		for (i=0; i < state.buttonCount; i++) {
			for (k = 0; k < 10 && state.buttons[i].hotkey[k]; k++) {
				if (theEvent.param1 == state.buttons[i].hotkey[k]) {
					// This button was chosen.

					if (state.buttons[i].flags & B_DRAW) {
						// Restore the depressed and focused buttons.
						if (state.buttonDepressed >= 0) {
							drawButton(state.buttons[state.buttonDepressed], BUTTON_NORMAL, state.dbuf);
						}
						if (state.buttonFocused >= 0) {
							drawButton(state.buttons[state.buttonFocused], BUTTON_NORMAL, state.dbuf);
						}

						// If the button likes to flash when keypressed:
						if (state.buttons[i].flags & B_KEYPRESS_HIGHLIGHT) {
							// Depress the chosen button.
							drawButton(state.buttons[i], BUTTON_PRESSED, state.dbuf);

							// Update the display.
							// overlayDisplayBuffer(state.rbuf, NULL);
							// overlayDisplayBuffer(state.dbuf, NULL);

							// Wait for a little; then we're done.
							await pauseBrogue(50);
						}
					}

					state.buttonDepressed = i;
					buttonUsed = true;
					break;
				}
			}
		}

		if (!buttonUsed
			&& (theEvent.param1 == ESCAPE_KEY || theEvent.param1 == ACKNOWLEDGE_KEY)) {
			// If the player pressed escape, we're done.
			theEvent.canceled = true;
		}
	}

	if (buttonUsed) {
		state.buttonChosen = state.buttonDepressed;
		return state.buttonChosen;
	} else {
		return -1;
	}
}

// Displays a bunch of buttons and collects user input.
// Returns the index number of the chosen button, or -1 if the user cancels.
// A window region is described by winX, winY, winWidth and winHeight.
// Clicking outside of that region will constitute canceling.
async function buttonInputLoop(/* brogueButton */ buttons,
					  buttonCount,
					  winX,
					  winY,
					  winWidth,
					  winHeight,
            returnEvent)
{
  let x, y, button; // (x, y) keeps track of the mouse location
	let canceled;
	const theEvent = rogueEvent();
	const state = buttonState();

	// assureCosmeticRNG();

	canceled = false;
	x = y = -1;
	initializeButtonState(state, buttons, buttonCount, winX, winY, winWidth, winHeight);

	do {
		// Update the display.
		overlayDisplayBuffer(state.dbuf, NULL);

		// Get input.
		await nextBrogueEvent(theEvent, true, false, false);

		// Process the input.
		button = await processButtonInput(state, theEvent);

		// Revert the display.
		overlayDisplayBuffer(state.rbuf, NULL);

	} while (button == -1 && !theEvent.canceled);

	if (returnEvent) {
		returnEvent.copy(theEvent);
	}

	//overlayDisplayBuffer(dbuf, NULL); // hangs around

	// restoreRNG();

	return button;
}
