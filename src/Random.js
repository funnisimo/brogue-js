/*
 *  RogueMain.c
 *  Brogue
 *
 *  Created by Brian Walker on 12/26/08.
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
// #include <limits.h>
// #include <stdint.h> // C99
//
// #include "Rogue.h"
// #include "IncludeGlobals.h"

function randClump(/* randomRange */ theRange) {
	return randClumpedRange(theRange.lowerBound, theRange.upperBound, theRange.clumpFactor);
}

// Get a random int between lowerBound and upperBound, inclusive, with probability distribution
// affected by clumpFactor.
function randClumpedRange(lowerBound, upperBound, clumpFactor) {
	if (upperBound <= lowerBound) {
		return lowerBound;
	}
	if (clumpFactor <= 1) {
		return rand_range(lowerBound, upperBound);
	}

	let i, total = 0, numSides = Math.floor((upperBound - lowerBound) / clumpFactor);

	for(i=0; i < (upperBound - lowerBound) % clumpFactor; i++) {
		total += rand_range(0, numSides + 1);
	}

	for(; i < clumpFactor; i++) {
		total += rand_range(0, numSides);
	}

	return (total + lowerBound);
}

// Get a random int between lowerBound and upperBound, inclusive
function rand_percent(percent) {
	return (rand_range(0, 99) < clamp(percent, 0, 100));
}

function shuffleList(list, fromIndex, toIndex) {
	if (arguments.length == 2) {
		toIndex = fromIndex;
		fromIndex = 0;
	}

	let i, r, buf;
	toIndex = toIndex || list.length;
	fromIndex = fromIndex || 0;

	for (i = fromIndex; i < toIndex; i++) {
		r = rand_range(fromIndex, toIndex-1);
		if (i != r) {
			buf = list[r];
			list[r] = list[i];
			list[i] = buf;
		}
	}
}

function fillSequentialList(list, listLength) {
    let i;
    for (i=0; i<listLength; i++) {
        list[i] = i;
    }
}

//typedef unsigned long int  u4;
// typedef uint32_t u4;
function ranctx() {
	return { a: 0, b: 0, c: 0, d: 0 };
}

var negRandom = 0;

const RNGState = [ranctx(), ranctx()];

function rot(x,k) { return ( (x << k) | (x >>> (32-k)) ) >>> 0; }

function ranval( /* ranctx */ x ) {

	const rb = rot(x.b, 27);
  const rc = rot(x.c, 17);
  const e = (x.a - rb) >>> 0;
  x.a = (x.b ^ rc) >>> 0;
  x.b = ((x.c + x.d) & 0xFFFFFFFF) >>> 0;
  x.c = ((x.d + e) & 0xFFFFFFFF) >>> 0;
  x.d = ((e + x.a) & 0xFFFFFFFF) >>> 0;

	// if (x.d < 0) {
	// 	++ negRandom;
	// 	return ranval(x);
	// }
  return x.d;
}

// // This is for debugging the random number generator
// function ranval_print( /* ranctx */ x ) {
//
// 	const rb = rot(x.b, 27);
//   const rc = rot(x.c, 17);
//   const e = (x.a - rb) >>> 0;
//   x.a = (x.b ^ rc) >>> 0;
//   x.b = ((x.c + x.d) & 0xFFFFFFFF) >>> 0;
//   x.c = ((x.d + e) & 0xFFFFFFFF) >>> 0;
//   x.d = ((e + x.a) & 0xFFFFFFFF) >>> 0;
//
// 	console.log('ranval');
// 	console.log(' rb => ', rb);
// 	console.log(' rc => ', rc);
// 	console.log('  e => ', e);
// 	console.log('  a => ', x.a);
// 	console.log('  b => ', x.b);
// 	console.log('  c => ', x.c);
// 	console.log('  d => ', x.d);
//
// 	// if (x.d < 0) {
// 	// 	++ negRandom;
// 	// 	return ranval(x);
// 	// }
//   return x.d;
// }


function raninit( /* ranctx */ x, seed ) {
    let i;

    x.a = 0xf1ea5eed, x.b = x.c = x.d = (seed & 0xFFFFFFFF) >>> 0;

		// if (x === RNGState[0]) {
		// 	console.log("raninit", seed);
		// 	logRNG();
		// }
    for (i=0; i<20; ++i) {
			ranval(x);
			// if (x === RNGState[0]) {
			// 	logRNG();
			// }
    }
}

function logRNG() {
	const r = RNGState[0];

	console.log("RNG = ", r.a, r.b, r.c, r.d);
}


/* ----------------------------------------------------------------------
 range

 returns a number between 0 and N-1
 without any bias.

 */

const RAND_MAX_COMBO = 4294967295; // Number.MAX_SAFE_INTEGER; // ((unsigned long) UINT32_MAX)
const INT_MAX = 4294967295; // Number.MAX_SAFE_INTEGER;

function range(n, RNG) {
	let div;
	let r;
	const rng = RNGState[RNG];

	div = (RAND_MAX_COMBO/n) >>> 0;

	do {
		// r = ranval(rng) % n;
		r = (ranval(rng) / div) >>> 0;
	} while (r >= n);

	return r;
}

// Get a random int between lowerBound and upperBound, inclusive, with uniform probability distribution

// #ifdef AUDIT_RNG // debug version
// int rand_range(int lowerBound, int upperBound) {
// 	int retval;
// 	char RNGMessage[100];
//
//     brogueAssert(lowerBound <= INT_MAX && upperBound <= INT_MAX);
//
// 	if (upperBound <= lowerBound) {
// 		return lowerBound;
// 	}
// 	retval = lowerBound + range(upperBound-lowerBound+1, rogue.RNG);
// 	if (rogue.RNG == RNG_SUBSTANTIVE) {
// 		randomNumbersGenerated++;
// 		if (1) { //randomNumbersGenerated >= 1128397) {
// 			sprintf(RNGMessage, "\n#%lu, %i to %i: %i", randomNumbersGenerated, lowerBound, upperBound, retval);
// 			RNGLog(RNGMessage);
// 		}
// 	}
// 	return retval;
// }
// #else // normal version
function rand_range(lowerBound, upperBound) {
  brogueAssert(lowerBound <= INT_MAX && upperBound <= INT_MAX);
	if (upperBound <= lowerBound) {
		return lowerBound;
	}
	if (rogue.RNG == RNG_SUBSTANTIVE) {
		randomNumbersGenerated++;
	}
	return lowerBound + range(upperBound-lowerBound+1, rogue.RNG);
}
// #endif


function cosmetic_range(lowerBound, upperBound) {
  brogueAssert(lowerBound <= INT_MAX && upperBound <= INT_MAX);
	if (upperBound <= lowerBound) {
		return lowerBound;
	}
	return lowerBound + range(upperBound-lowerBound+1, RNG_COSMETIC);
}


// seeds with the time if called with a parameter of 0; returns the seed regardless.
// All RNGs are seeded simultaneously and identically.
function seedRandomGenerator(seed) {
	if (!seed) {
		seed = Date.now() - 1352700000;
	}
	seed = seed % RAND_MAX_COMBO;

	raninit(RNGState[RNG_SUBSTANTIVE], seed);
	raninit(RNGState[RNG_COSMETIC], seed);
	return seed;
}

seedRandomGenerator();
