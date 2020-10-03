//
//  RogueMain.h
//  Brogue
//
//  Created by Brian Walker on 12/26/08.
//  Copyright 2012. All rights reserved.
//
//  This file is part of Brogue.
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU Affero General Public License as
//  published by the Free Software Foundation, either version 3 of the
//  License, or (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.
//

// #include <stdio.h>
// #include <stdlib.h>
// #include <string.h>
// #include "PlatformDefines.h"


// unicode: comment this line to revert to ASCII

const USE_UNICODE = true;
const NULL = null;

// version string -- no more than 16 bytes:
const BROGUE_VERSION_STRING = "1.7.5-js";

// debug macros -- define DEBUGGING as 1 to enable wizard mode.

const DEBUGGING = 0;	// use 1 || 0

const DEBUG = console.debug;
const printf = function(...args) {
	args = args.map( (a) => {
		if (a instanceof BrogueString) return a.text;
		return a;
	});
	console.log(...args);
}

const MONSTERS_ENABLED = (!DEBUGGING || 1); // Quest room monsters can be generated regardless.
const ITEMS_ENABLED    = (!DEBUGGING || 1);

const D_BULLET_TIME =					(DEBUGGING && 0);
const D_WORMHOLING =					(DEBUGGING && 1);
const D_IMMORTAL =						(DEBUGGING && 1);

const D_SAFETY_VISION =								(DEBUGGING && 0);
const D_SCENT_VISION =                (DEBUGGING && 0);
const D_DISABLE_BACKGROUND_COLORS =		(DEBUGGING && 0);

const D_INSPECT_LEVELGEN =				 (DEBUGGING && 0);
const D_INSPECT_ROOM_ADD =         (D_INSPECT_LEVELGEN && 0);
const D_INSPECT_DOORS =            (D_INSPECT_ROOM_ADD && 0);
const D_INSPECT_LAKES =         	 (D_INSPECT_LEVELGEN && 0);
const D_INSPECT_AUTOGENERATORS =   (D_INSPECT_LEVELGEN && 0);
const D_INSPECT_MACHINES =				 (D_INSPECT_LEVELGEN && 0);
const D_INSPECT_MACHINE_FEATURES = (D_INSPECT_MACHINES && 0);
const D_INSPECT_ITEM_GEN = 				 (D_INSPECT_LEVELGEN && 0);
const D_INSPECT_MON_GEN  = 				 (D_INSPECT_LEVELGEN && 0);

const D_INSPECT_MONSTER_SPAWN = 				(DEBUGGING && 0);

const D_MESSAGE_ITEM_GENERATION =       (DEBUGGING && 0);
const D_MESSAGE_MONSTER_GENERATION =    (DEBUGGING && 0);
const D_MESSAGE_MACHINE_GENERATION =    (DEBUGGING && 0);

const D_MONSTER_OMNISCIENCE 			 = 		(DEBUGGING && 0);
const D_ITEM_OMNISCIENCE 					 = 		(DEBUGGING && 0);

// set to false to allow multiple loads from the same saved file:
const DELETE_SAVE_FILE_AFTER_LOADING	= true;

// set to false to disable references to keystrokes (e.g. for a tablet port)
const KEYBOARD_LABELS = true;

//#define BROGUE_ASSERTS		// introduces several assert()s -- useful to find certain array overruns and other bugs
//#define AUDIT_RNG             // VERY slow, but sometimes necessary to debug out-of-sync recording errors
//#define GENERATE_FONT_FILES	// Displays font in grid upon startup, which can be screen-captured into font files for PC.


function assert(v) {
	if (!v) throw new Error('Assertion failed');
}

function brogueAssert(v) {
	if (!v) {
		throw new Error('Assert failed.');
	}
}


// function clone(x) {
// 	if (Array.isArray(x)) {
// 		return x.slice();
// 	}
// 	else if (typeof x === 'object') {
// 		return Object.assign({}, x);
// 	}
// 	return x;
// }

function cloneDeep(x) {
	if (Array.isArray(x)) {
		return x.map( (v) => cloneDeep(v) );
	}
	else if (typeof x === 'object') {
		const entries = Object.entries(x);
		const out = {};
		entries.forEach( ([key, value]) => {
			out[key] = cloneDeep(value);
		});
		return out;
	}
	return x;
}


const PI = 3.14159265;

// const FLOAT_FUDGE = 0.00001;

const FP_BASE  = 16; // Don't change this without recalculating all of the power tables throughout the code!
const FP_FACTOR  = (1 << FP_BASE);


// recording and save filenames
const LAST_GAME_PATH =			"LastGame.broguesave";
const LAST_GAME_NAME =          "LastGame";
const LAST_RECORDING_NAME =     "LastRecording";
const RECORDING_SUFFIX =		".broguerec";
const GAME_SUFFIX =				".broguesave";
const ANNOTATION_SUFFIX =		".txt";
const RNG_LOG =					"RNGLog.txt";

const BROGUE_FILENAME_MAX		= 255; // (Math.min(1024*4, FILENAME_MAX))

// Allows unicode characters:
// #define uchar					unsigned short

const MESSAGE_LINES	=		3;

// Size of the entire terminal window. These need to be hard-coded here and in Viewport.h
const COLS =					100;
const ROWS =					(31 + MESSAGE_LINES);

const MESSAGE_ARCHIVE_LINES	= ROWS;

const STAT_BAR_WIDTH =		20;			// number of characters in the stats bar to the left of the map

// Size of the portion of the terminal window devoted to displaying the dungeon:
const DCOLS =					(COLS - STAT_BAR_WIDTH - 1); // n columns on the left for the sidebar;
                                                            // one column to separate the sidebar from the map.
const DROWS =					(ROWS - MESSAGE_LINES - 2);	// n lines at the top for messages;
															// one line at the bottom for flavor text;
															// another line at the bottom for the menu bar.


const LOS_SLOPE_GRANULARITY =	32768;		// how finely we divide up the squares when calculating slope;
											// higher numbers mean fewer artifacts but more memory and processing
const INTERFACE_OPACITY =		95;

const LIGHT_SMOOTHING_THRESHOLD = 150;       // light components higher than this magnitude will be toned down a little

const MAX_BOLT_LENGTH =			DCOLS*10;

const VISIBILITY_THRESHOLD =	50;			// how bright cumulative light has to be before the cell is marked visible

const AMULET_LEVEL =			26;			// how deep before the amulet appears
const DEEPEST_LEVEL =           40;          // how deep the universe goes

const MACHINES_FACTOR =         1.0;         // use this to adjust machine frequency

const MACHINES_BUFFER_LENGTH =  200;

// const DEFENSE_FACTOR =                      0.987;		// Each point of armor multiplies enemy attackers' accuracy by this value.
//                                                         // (displayed armor value is 10% of the real value)
// const WEAPON_ENCHANT_DAMAGE_FACTOR =        1.065;		// Each marginal point of weapon enchantment
//                                                         // multiplies damage by this factor.
// const WEAPON_ENCHANT_ACCURACY_FACTOR =      1.065;		// Each marginal point of weapon enchantment
//                                                         // multiplies accuracy by this factor.

const WEAPON_KILLS_TO_AUTO_ID =	20;
const ARMOR_DELAY_TO_AUTO_ID =	1000;
const RING_DELAY_TO_AUTO_ID =	1500;

const FALL_DAMAGE_MIN =         8;
const FALL_DAMAGE_MAX =         10;

const INPUT_RECORD_BUFFER =		1000;		// how many bytes of input data to keep in memory before saving it to disk
const DEFAULT_PLAYBACK_DELAY =	50;

const HIGH_SCORES_COUNT =		30;

// color escapes
const COLOR_ESCAPE =			25;
const COLOR_END    =      26;
const COLOR_VALUE_INTERCEPT =	25;


function centerText(bstring, len) {
	const totalPad = (len - bstring.textLength);
	const leftPad = Math.round(totalPad/2);
	return bstring.padStart(leftPad + bstring.textlength, ' ').padEnd(len, ' ');
}

function capitalize(bstring) {
	bstring = STRING(bstring);
	return bstring.capitalize();
}


// display characters:

// #ifdef USE_UNICODE

const FLOOR_CHAR =		'\u00b7';
const LIQUID_CHAR =		'~';
const CHASM_CHAR =		'\u2237';
const TRAP_CHAR =		'\u25c7';
const FIRE_CHAR =		'\u22CF';
const GRASS_CHAR =		'"';
const BRIDGE_CHAR =		'=';
const DESCEND_CHAR =	'>';
const ASCEND_CHAR =		'<';
const WALL_CHAR =		'#';
const DOOR_CHAR =		'+';
const OPEN_DOOR_CHAR =	'\'';
const ASH_CHAR =		'\'';
const BONES_CHAR =		',';
const MUD_CHAR =		',';
const WEB_CHAR =		':';
//const FOLIAGE_CHAR =	'\u03A8' // upper-case psi;
//const FOLIAGE_CHAR =	'\u2648' // Aries symbol (not supported on many browsers);
const FOLIAGE_CHAR =	'\u03C8' // lower case psi
const VINE_CHAR =       ':';
const ALTAR_CHAR =		'|';
const LEVER_CHAR =      '/';
const LEVER_PULLED_CHAR = '\\';
const STATUE_CHAR =		'\u00df';
const VENT_CHAR =		'=';
const DEWAR_CHAR =      '&';

const TRAMPLED_FOLIAGE_CHAR =	'"'		// '\u2034' // '\u2037';

const PLAYER_CHAR =		'@';

const AMULET_CHAR =		'\u2640';
const FOOD_CHAR =		';';
const SCROLL_CHAR =		'\u266A'//'?'		// '\u039E';
//const RING_CHAR =		'\u26AA' //'\uffee';
const RING_CHAR =		'o';
const CHARM_CHAR =      '\u03DE';
const POTION_CHAR =		'!';
const ARMOR_CHAR =		'[';
const WEAPON_CHAR =		'\u2191';
const STAFF_CHAR =		'\\';
const WAND_CHAR =		'~';
const GOLD_CHAR =		'*';
const GEM_CHAR =		'\u25cf';
const TOTEM_CHAR =		'\u26b2'; // 1.7.4 = '\u2641';
const TURRET_CHAR =		'\u25cf';
const UNICORN_CHAR =    '\u00da';
const KEY_CHAR =		'-';
const ELECTRIC_CRYSTAL_CHAR = '\u00a4'; // 1.7.4 = 164;

const UP_ARROW_CHAR =		'\u2191';
const DOWN_ARROW_CHAR =		'\u2193';
const LEFT_ARROW_CHAR =		'\u2190';
const RIGHT_ARROW_CHAR =	'\u2192';
const UP_TRIANGLE_CHAR =	'\u2206';
const DOWN_TRIANGLE_CHAR =	'\u2207';
const OMEGA_CHAR =			'\u03A9';
const THETA_CHAR =			'\u03B8';
const LAMDA_CHAR =			'\u03BB';
const KOPPA_CHAR =			'\u03DF'//'\u03DE';
const LOZENGE_CHAR =		'\u29eb'; // 1.7.4 = '\u25C6';
const CROSS_PRODUCT_CHAR =	'\u2A2F';

const CHAIN_TOP_LEFT =		'\\';
const CHAIN_BOTTOM_RIGHT =	'\\';
const CHAIN_TOP_RIGHT =		'/';
const CHAIN_BOTTOM_LEFT =	'/';
const CHAIN_TOP =			'|';
const CHAIN_BOTTOM =		'|';
const CHAIN_LEFT =			'-';
const CHAIN_RIGHT =			'-';

const BAD_MAGIC_CHAR =		'\u29f2'; // 1.7.4 = '\u25C6';
const GOOD_MAGIC_CHAR =		'\u29f3'; // 1.7.4 = '\u25C7';

// #else

// #define FLOOR_CHAR		'.'
// #define LIQUID_CHAR		'~'
// #define CHASM_CHAR		':'
// #define TRAP_CHAR		'%'
// #define FIRE_CHAR		'^'
// #define GRASS_CHAR		'"'
// #define BRIDGE_CHAR		'='
// #define DESCEND_CHAR	'>'
// #define ASCEND_CHAR		'<'
// #define WALL_CHAR		'#'
// #define DOOR_CHAR		'+'
// #define OPEN_DOOR_CHAR	'\''
// #define ASH_CHAR		'\''
// #define BONES_CHAR		','
// #define MUD_CHAR		','
// #define WEB_CHAR		':'
// #define FOLIAGE_CHAR	'&'
// #define VINE_CHAR       ':'
// #define ALTAR_CHAR		'|'
// #define LEVER_CHAR      '/'
// #define LEVER_PULLED_CHAR '\\'
// #define STATUE_CHAR		'&'
// #define VENT_CHAR		'='
// #define DEWAR_CHAR      '&'
//
// #define TRAMPLED_FOLIAGE_CHAR	'"'
//
// #define PLAYER_CHAR		'@'
//
// #define AMULET_CHAR		','
// #define FOOD_CHAR		';'
// #define SCROLL_CHAR		'?'
// #define RING_CHAR		'='
// #define CHARM_CHAR      '+'
// #define POTION_CHAR		'!'
// #define ARMOR_CHAR		'['
// #define WEAPON_CHAR		'('
// #define STAFF_CHAR		'\\'
// #define WAND_CHAR		'~'
// #define GOLD_CHAR		'*'
// #define GEM_CHAR		'+'
// #define TOTEM_CHAR		'0'
// #define TURRET_CHAR		'*'
// #define UNICORN_CHAR    'U'
// #define KEY_CHAR		'-'
// #define ELECTRIC_CRYSTAL_CHAR '$'
//
// #define UP_ARROW_CHAR		'^'
// #define DOWN_ARROW_CHAR		'v'
// #define LEFT_ARROW_CHAR		'<'
// #define RIGHT_ARROW_CHAR	'>'
// #define UP_TRIANGLE_CHAR	'^'
// #define DOWN_TRIANGLE_CHAR	'v'
// #define OMEGA_CHAR			'^'
// #define THETA_CHAR			'0'
// #define LAMDA_CHAR			'\\'
// #define KOPPA_CHAR			'k'
// #define LOZENGE_CHAR		'+'
// #define CROSS_PRODUCT_CHAR	'x'
//
// #define CHAIN_TOP_LEFT		'\\'
// #define CHAIN_BOTTOM_RIGHT	'\\'
// #define CHAIN_TOP_RIGHT		'/'
// #define CHAIN_BOTTOM_LEFT	'/'
// #define CHAIN_TOP			'|'
// #define CHAIN_BOTTOM		'|'
// #define CHAIN_LEFT			'-'
// #define CHAIN_RIGHT			'-'
//
// #define BAD_MAGIC_CHAR		'+'
// #define GOOD_MAGIC_CHAR		'$'
//
// #endif

const GLOBAL = (typeof global !== 'undefined') ? global : this;	// this === window

class Enum {
	constructor() {

	}

	toString(v) {
		if (v === undefined) return enumName;
		return Object.entries(out).reduce( (out, [key, value]) => (value == v) ? key : out, '?' );
	}
}

function ENUM(enumName, ...names) {

	const out = new Enum();
	let offset = 0;
	if (typeof names[0] === 'number') {
		offset = names.shift();
	}
	names.forEach( (name, index) => {
		GLOBAL[name] = index + offset;
		out[name] = index + offset;
	});

	GLOBAL[enumName] = out;
	return out;
}


ENUM('eventTypes',
	'UPDATE',
	'KEYSTROKE',
	'MOUSE_UP',
	'MOUSE_DOWN',
	'RIGHT_MOUSE_DOWN',
	'RIGHT_MOUSE_UP',
	'MOUSE_ENTERED_CELL',
	'RNG_CHECK',
	'SAVED_GAME_LOADED',
	'END_OF_RECORDING',
	'EVENT_ERROR',
	'NUMBER_OF_EVENT_TYPES', // unused
);

// 1.7.4
ENUM('notificationEventTypes',
	'GAMEOVER_QUIT',
	'GAMEOVER_DEATH',
	'GAMEOVER_VICTORY',
	'GAMEOVER_SUPERVICTORY',
	'GAMEOVER_RECORDING'
);


class RogueEvent {
	constructor(type, p1, p2, ctrl, shift) {
		/* ENUM eventTypes */ this.eventType = type || 0;
		/* signed long */ this.param1 = p1 || 0;
		/* signed long */ this.param2 = p2 || 0;
		/* boolean */ this.controlKey = ctrl || false;
		/* boolean */ this.shiftKey = shift || false;
	}

	copy(other) {
		Object.assign(this, other);
	}

	clone() {
		return new RogueEvent(this.eventType, this.param1, this.param2, this.controlKey, this.shiftKey);
	}
}

function rogueEvent(type, p1, p2, ctrl, shift) {
	return new RogueEvent(type, p1, p2, ctrl, shift);
}


class RogueHighScoresEntry {
	constructor() {
		this.score = 0;
		this.date = STRING();
		this.description = STRING();
	}

	clear() {
		this.score = 0;
		strcpy(this.date, "");
		strcpy(this.description, "");
	}

	copy(other) {
		this.score = other.score;
		strcpy(this.date, other.date);
		strcpy(this.description, other.description);
	}
}

function rogueHighScoresEntry() {
	return new RogueHighScoresEntry();
}


function fileEntry() {
	return {
		path: '',
		date: ''
	}
}


ENUM('RNGs',
	'RNG_SUBSTANTIVE',
	'RNG_COSMETIC',
	'NUMBER_OF_RNGS',
);

ENUM('displayDetailValues', 0,
	'DV_UNLIT',
	'DV_LIT',
	'DV_DARK',
);

ENUM('directions', -1,
  'NO_DIRECTION',

	// Cardinal directions; must be 0-3:
	'UP',
	'DOWN',
	'LEFT',
	'RIGHT',

	// Secondary directions; must be 4-7:
	'UPLEFT',
	'DOWNLEFT',
	'UPRIGHT',
	'DOWNRIGHT',

  'DIRECTION_COUNT',
);

ENUM('whipAttackResult', 0,
	'WHIP_FAILED',
	'WHIP_SUCCESS',
	'WHIP_ABORTED'
);

ENUM('boltResult', 0,
	'BR_CONTINUES',
	'BR_DONE',
	'BR_AUTO_ID',
	'BR_LIGHTING_CHANGED'
);

ENUM('textEntryTypes', 0,
	'TEXT_INPUT_NORMAL',
	'TEXT_INPUT_FILENAME',
	'TEXT_INPUT_NUMBERS',
	'TEXT_INPUT_TYPES',
);

// const NUMBER_DYNAMIC_COLORS	= 6;

ENUM('tileType', 0,
	'NOTHING',
	'GRANITE',
	'FLOOR',
	'FLOOR_FLOODABLE',
	'CARPET',
	'MARBLE_FLOOR',
	'WALL',
	'DOOR',
	'OPEN_DOOR',
	'SECRET_DOOR',
	'LOCKED_DOOR',
	'OPEN_IRON_DOOR_INERT',
	'DOWN_STAIRS',
	'UP_STAIRS',
	'DUNGEON_EXIT',
  'DUNGEON_PORTAL',
	'TORCH_WALL', // wall lit with a torch
	'CRYSTAL_WALL',
	'PORTCULLIS_CLOSED',
	'PORTCULLIS_DORMANT',
	'WOODEN_BARRICADE',
	'PILOT_LIGHT_DORMANT',
	'PILOT_LIGHT',
  'HAUNTED_TORCH_DORMANT',
  'HAUNTED_TORCH_TRANSITIONING',
  'HAUNTED_TORCH',
  'WALL_LEVER_HIDDEN',
  'WALL_LEVER',
  'WALL_LEVER_PULLED',
  'WALL_LEVER_HIDDEN_DORMANT',
	'STATUE_INERT',
	'STATUE_DORMANT',
	'STATUE_CRACKING',
  'STATUE_INSTACRACK',
	'PORTAL',
	'TURRET_DORMANT',
	'WALL_MONSTER_DORMANT',
	'DARK_FLOOR_DORMANT',
	'DARK_FLOOR_DARKENING',
	'DARK_FLOOR',
	'MACHINE_TRIGGER_FLOOR',
	'ALTAR_INERT',
	'ALTAR_KEYHOLE',
	'ALTAR_CAGE_OPEN',
	'ALTAR_CAGE_CLOSED',
	'ALTAR_SWITCH',
	'ALTAR_SWITCH_RETRACTING',
	'ALTAR_CAGE_RETRACTABLE',
	'PEDESTAL',
	'MONSTER_CAGE_OPEN',
	'MONSTER_CAGE_CLOSED',
	'COFFIN_CLOSED',
	'COFFIN_OPEN',	////
	'GAS_TRAP_POISON_HIDDEN',
	'GAS_TRAP_POISON',
	'TRAP_DOOR_HIDDEN',
	'TRAP_DOOR',
	'GAS_TRAP_PARALYSIS_HIDDEN',
	'GAS_TRAP_PARALYSIS',
  'MACHINE_PARALYSIS_VENT_HIDDEN',
  'MACHINE_PARALYSIS_VENT',
	'GAS_TRAP_CONFUSION_HIDDEN',
	'GAS_TRAP_CONFUSION',
	'FLAMETHROWER_HIDDEN',
	'FLAMETHROWER',
	'FLOOD_TRAP_HIDDEN',
	'FLOOD_TRAP',
  'NET_TRAP_HIDDEN',
  'NET_TRAP',
  'ALARM_TRAP_HIDDEN',
  'ALARM_TRAP',
	'MACHINE_POISON_GAS_VENT_HIDDEN',
	'MACHINE_POISON_GAS_VENT_DORMANT',
	'MACHINE_POISON_GAS_VENT',
	'MACHINE_METHANE_VENT_HIDDEN',
	'MACHINE_METHANE_VENT_DORMANT',
	'MACHINE_METHANE_VENT',
	'STEAM_VENT',
	'MACHINE_PRESSURE_PLATE',
  'MACHINE_PRESSURE_PLATE_USED',
  'MACHINE_GLYPH',
  'MACHINE_GLYPH_INACTIVE',
  'DEWAR_CAUSTIC_GAS',
  'DEWAR_CONFUSION_GAS',
  'DEWAR_PARALYSIS_GAS',
  'DEWAR_METHANE_GAS',	////
	'DEEP_WATER',
	'SHALLOW_WATER',
	'MUD',
	'CHASM',
	'CHASM_EDGE',
	'MACHINE_COLLAPSE_EDGE_DORMANT',
	'MACHINE_COLLAPSE_EDGE_SPREADING',
	'LAVA',
	'LAVA_RETRACTABLE',
	'LAVA_RETRACTING',
	'SUNLIGHT_POOL',
	'DARKNESS_PATCH',
	'ACTIVE_BRIMSTONE',
	'INERT_BRIMSTONE',
	'OBSIDIAN',
	'BRIDGE',
  'BRIDGE_FALLING',
	'BRIDGE_EDGE',
	'STONE_BRIDGE',
	'MACHINE_FLOOD_WATER_DORMANT',
	'MACHINE_FLOOD_WATER_SPREADING',
	'MACHINE_MUD_DORMANT',	///
	'ICE_DEEP',							// 1.7.5
	'ICE_DEEP_MELT',				// 1.7.5
	'ICE_SHALLOW',					// 1.7.5
	'ICE_SHALLOW_MELT',			// 1.7.5
	'HOLE',
	'HOLE_GLOW',
	'HOLE_EDGE',
	'FLOOD_WATER_DEEP',
	'FLOOD_WATER_SHALLOW',
	'GRASS',
	'DEAD_GRASS',
	'GRAY_FUNGUS',
	'LUMINESCENT_FUNGUS',
	'LICHEN',
	'HAY',
	'RED_BLOOD',
	'GREEN_BLOOD',
	'PURPLE_BLOOD',
	'ACID_SPLATTER',
	'VOMIT',
	'URINE',
	'UNICORN_POOP',
	'WORM_BLOOD',
	'ASH',
	'BURNED_CARPET',
	'PUDDLE',
	'BONES',
	'RUBBLE',
	'JUNK',
  'BROKEN_GLASS',
	'ECTOPLASM',
	'EMBERS',
	'SPIDERWEB',
	'NETTING',
	'FOLIAGE',
	'DEAD_FOLIAGE',
	'TRAMPLED_FOLIAGE',
	'FUNGUS_FOREST',
	'TRAMPLED_FUNGUS_FOREST',
	'FORCEFIELD',
  'FORCEFIELD_MELT',
  'SACRED_GLYPH',
	'MANACLE_TL',
	'MANACLE_BR',
	'MANACLE_TR',
	'MANACLE_BL',
	'MANACLE_T',
	'MANACLE_B',
	'MANACLE_L',
	'MANACLE_R',
	'PORTAL_LIGHT',
  'GUARDIAN_GLOW',	///
	'PLAIN_FIRE',
	'BRIMSTONE_FIRE',
	'FLAMEDANCER_FIRE',
	'GAS_FIRE',
	'GAS_EXPLOSION',
	'DART_EXPLOSION',
  'ITEM_FIRE',
  'CREATURE_FIRE', ///
	'POISON_GAS',
	'CONFUSION_GAS',
	'ROT_GAS',
  'STENCH_SMOKE_GAS',
	'PARALYSIS_GAS',
	'METHANE_GAS',
	'STEAM',
	'DARKNESS_CLOUD',
  'HEALING_CLOUD',	///
  'BLOODFLOWER_STALK',
  'BLOODFLOWER_POD',	///
  'HAVEN_BEDROLL',	///
  'DEEP_WATER_ALGAE_WELL',
  'DEEP_WATER_ALGAE_1',
  'DEEP_WATER_ALGAE_2',	///
  'ANCIENT_SPIRIT_VINES',
  'ANCIENT_SPIRIT_GRASS',	///
	'AMULET_SWITCH',	///
  'COMMUTATION_ALTAR',
  'COMMUTATION_ALTAR_INERT',
  'PIPE_GLOWING',
  'PIPE_INERT',	///
  'RESURRECTION_ALTAR',
  'RESURRECTION_ALTAR_INERT',
  'MACHINE_TRIGGER_FLOOR_REPEATING',	///
	'SACRIFICE_ALTAR_DORMANT',	// 1.7.5
	'SACRIFICE_ALTAR', 					// 1.7.5
	'SACRIFICE_LAVA',						// 1.7.5
	'SACRIFICE_CAGE_DORMANT',		// 1.7.5
	'DEMONIC_STATUE',						// 1.7.5
	'STATUE_INERT_DOORWAY',
	'STATUE_DORMANT_DOORWAY', ///
	'CHASM_WITH_HIDDEN_BRIDGE',
	'CHASM_WITH_HIDDEN_BRIDGE_ACTIVE',
	'MACHINE_CHASM_EDGE', ///
  'RAT_TRAP_WALL_DORMANT',
  'RAT_TRAP_WALL_CRACKING',	///
  'ELECTRIC_CRYSTAL_OFF',
  'ELECTRIC_CRYSTAL_ON',
  'TURRET_LEVER',	///
  'WORM_TUNNEL_MARKER_DORMANT',
  'WORM_TUNNEL_MARKER_ACTIVE',
  'WORM_TUNNEL_OUTER_WALL',	///
  'BRAZIER', ///
  'MUD_FLOOR',
  'MUD_WALL',
  'MUD_DOORWAY',	///
	'NUMBER_TILETYPES',
);

ENUM('lightType',
	'NO_LIGHT',
	'MINERS_LIGHT',
	'BURNING_CREATURE_LIGHT',
	'WISP_LIGHT',
	'SALAMANDER_LIGHT',
	'IMP_LIGHT',
	'PIXIE_LIGHT',
	'LICH_LIGHT',
	'FLAMEDANCER_LIGHT',
	'SENTINEL_LIGHT',
	'UNICORN_LIGHT',
	'IFRIT_LIGHT',
	'PHOENIX_LIGHT',
	'PHOENIX_EGG_LIGHT',
  'YENDOR_LIGHT',
	'SPECTRAL_BLADE_LIGHT',
	'SPECTRAL_IMAGE_LIGHT',
	'SPARK_TURRET_LIGHT',
  'EXPLOSIVE_BLOAT_LIGHT',
	'BOLT_LIGHT_SOURCE',
	'TELEPATHY_LIGHT',
	'SACRIFICE_MARK_LIGHT',	// 1.7.5
  'SCROLL_PROTECTION_LIGHT',
  'SCROLL_ENCHANTMENT_LIGHT',
  'POTION_STRENGTH_LIGHT',
  'EMPOWERMENT_LIGHT',
  'GENERIC_FLASH_LIGHT',
  'FALLEN_TORCH_FLASH_LIGHT',
  'SUMMONING_FLASH_LIGHT',
  'EXPLOSION_FLARE_LIGHT',
  'QUIETUS_FLARE_LIGHT',
  'SLAYING_FLARE_LIGHT',
  'CHARGE_FLASH_LIGHT',
	'TORCH_LIGHT',
	'LAVA_LIGHT',
	'SUN_LIGHT',
	'DARKNESS_PATCH_LIGHT',
	'FUNGUS_LIGHT',
	'FUNGUS_FOREST_LIGHT',
  'LUMINESCENT_ALGAE_BLUE_LIGHT',
  'LUMINESCENT_ALGAE_GREEN_LIGHT',
	'ECTOPLASM_LIGHT',
	'UNICORN_POOP_LIGHT',
	'EMBER_LIGHT',
	'FIRE_LIGHT',
	'BRIMSTONE_FIRE_LIGHT',
	'EXPLOSION_LIGHT',
	'INCENDIARY_DART_LIGHT',
	'PORTAL_ACTIVATE_LIGHT',
	'CONFUSION_GAS_LIGHT',
	'DARKNESS_CLOUD_LIGHT',
	'FORCEFIELD_LIGHT',
	'CRYSTAL_WALL_LIGHT',
	'CANDLE_LIGHT',
  'HAUNTED_TORCH_LIGHT',
  'GLYPH_LIGHT_DIM',
  'GLYPH_LIGHT_BRIGHT',
  'SACRED_GLYPH_LIGHT',
  'DESCENT_LIGHT',
	'DEMONIC_STATUE_LIGHT',	// 1.7.5
	'NUMBER_LIGHT_KINDS'
);


function Fl(N) { return (1 << N); }
function flagToText(flagObj, value) {
	const inverse = Object.entries(flagObj).reduce( (out, [key, value]) => {
		out[value] = key;
		return out;
	}, {});

	const out = [];
	for(let index = 0; index < 32; ++index) {
		const fl = (1 << index);
		if (value & fl) {
			out.push(inverse[fl]);
		}
	}
	return out;
}

function FLAG(flagName, values) {
	Object.entries(values).forEach( ([key, value]) => {
		if (Array.isArray(value)) {
			value = value.reduce( (out, name) => {
      	return out | values[name];
      }, 0);
		}
    values[key] = value;
		GLOBAL[key] = value;
	});

	values.toString = function(v) {
		if (!v) return flagName;
		return flagToText(values, v);
	}

	GLOBAL[flagName] = values;
	return values;
}


// Item categories
FLAG('itemCategory', {
	FOOD				: Fl(0),
	WEAPON			: Fl(1),
	ARMOR				: Fl(2),
	POTION			: Fl(3),
	SCROLL			: Fl(4),
	STAFF				: Fl(5),
	WAND				: Fl(6),
	RING				: Fl(7),
  CHARM       : Fl(8),
	GOLD				: Fl(9),
	AMULET			: Fl(10),
	GEM					: Fl(11),
	KEY					: Fl(12),

	CAN_BE_DETECTED		  : ['WEAPON', 'ARMOR', 'POTION', 'SCROLL', 'RING', 'CHARM', 'WAND', 'STAFF', 'AMULET'],
	PRENAMED_CATEGORY	  : ['FOOD', 'GOLD', 'AMULET', 'GEM', 'KEY'],
  NEVER_IDENTIFIABLE  : ['FOOD', 'CHARM', 'GOLD', 'AMULET', 'GEM', 'KEY'],
  // COUNTS_TOWARD_SCORE : ['GOLD', 'AMULET', 'GEM'],		// 1.7.4
  CAN_BE_SWAPPED      : ['WEAPON', 'ARMOR', 'STAFF', 'CHARM', 'RING'],
	ALL_ITEMS						: ['FOOD', 'POTION', 'WEAPON', 'ARMOR', 'STAFF', 'WAND', 'SCROLL', 'RING', 'CHARM', 'GOLD', 'AMULET', 'GEM', 'KEY'],
});

ENUM('keyKind',
	'KEY_DOOR',
	'KEY_CAGE',
	'KEY_PORTAL',
	'NUMBER_KEY_TYPES'
);

ENUM('foodKind',
	'RATION',
	'FRUIT',
	'NUMBER_FOOD_KINDS'
);

ENUM('potionKind',
	'POTION_LIFE',
	'POTION_STRENGTH',
	'POTION_TELEPATHY',
	'POTION_LEVITATION',
	'POTION_DETECT_MAGIC',
	'POTION_HASTE_SELF',
	'POTION_FIRE_IMMUNITY',
	'POTION_INVISIBILITY',
	'POTION_POISON',
	'POTION_PARALYSIS',
	'POTION_HALLUCINATION',
	'POTION_CONFUSION',
	'POTION_INCINERATION',
	'POTION_DARKNESS',
	'POTION_DESCENT',
	'POTION_LICHEN',
	'NUMBER_POTION_KINDS'
);

ENUM('weaponKind',
	'DAGGER',
	'SWORD',
	'BROADSWORD',
  'WHIP',
  'RAPIER',
  'FLAIL',
	'MACE',
	'HAMMER',
	'SPEAR',
	'PIKE',
	'AXE',
	'WAR_AXE',
	'DART',
	'INCENDIARY_DART',
	'JAVELIN',
	'NUMBER_WEAPON_KINDS'
);

ENUM('weaponEnchants',
	'W_SPEED',
	'W_QUIETUS',
	'W_PARALYSIS',
	'W_MULTIPLICITY',
	'W_SLOWING',
	'W_CONFUSION',
  'W_FORCE',
	'W_SLAYING',
	'W_MERCY',
	'W_PLENTY',
	'NUMBER_WEAPON_RUNIC_KINDS'
);

const NUMBER_GOOD_WEAPON_ENCHANT_KINDS = weaponEnchants.NUMBER_GOOD_WEAPON_ENCHANT_KINDS = W_MERCY;	// Everything before this one...


ENUM('armorKind',
	'LEATHER_ARMOR',
	'SCALE_MAIL',
	'CHAIN_MAIL',
	'BANDED_MAIL',
	'SPLINT_MAIL',
	'PLATE_MAIL',
	'NUMBER_ARMOR_KINDS'
);

ENUM('armorEnchants',
	'A_MULTIPLICITY',
	'A_MUTUALITY',
	'A_ABSORPTION',
	'A_REPRISAL',
	'A_IMMUNITY',
	'A_REFLECTION',
  'A_RESPIRATION',
  'A_DAMPENING',
	'A_BURDEN',
	'A_VULNERABILITY',
  'A_IMMOLATION',
	'NUMBER_ARMOR_ENCHANT_KINDS',
);

const NUMBER_GOOD_ARMOR_ENCHANT_KINDS = armorEnchants.NUMBER_GOOD_ARMOR_ENCHANT_KINDS = A_BURDEN;	// everything before this

ENUM('wandKind',
	'WAND_TELEPORT',
	'WAND_SLOW',
	'WAND_POLYMORPH',
	'WAND_NEGATION',
	'WAND_DOMINATION',
	'WAND_BECKONING',
	'WAND_PLENTY',
	'WAND_INVISIBILITY',
  'WAND_EMPOWERMENT',
	'NUMBER_WAND_KINDS'
);

ENUM('staffKind',
	'STAFF_LIGHTNING',
	'STAFF_FIRE',
	'STAFF_POISON',
	'STAFF_TUNNELING',
	'STAFF_BLINKING',
	'STAFF_ENTRANCEMENT',
	'STAFF_OBSTRUCTION',
	'STAFF_DISCORD',
	'STAFF_CONJURATION',
	'STAFF_HEALING',
	'STAFF_HASTE',
	'STAFF_PROTECTION',
	'NUMBER_STAFF_KINDS'
);

// these must be wand bolts, in order, and then staff bolts, in order:
ENUM('boltType',
  'BOLT_NONE',
	'BOLT_TELEPORT',
	'BOLT_SLOW',
	'BOLT_POLYMORPH',
	'BOLT_NEGATION',
	'BOLT_DOMINATION',
	'BOLT_BECKONING',
	'BOLT_PLENTY',
	'BOLT_INVISIBILITY',
  'BOLT_EMPOWERMENT',
	'BOLT_LIGHTNING',
	'BOLT_FIRE',
	'BOLT_POISON',
	'BOLT_TUNNELING',
	'BOLT_BLINKING',
	'BOLT_ENTRANCEMENT',
	'BOLT_OBSTRUCTION',
	'BOLT_DISCORD',
	'BOLT_CONJURATION',
	'BOLT_HEALING',
	'BOLT_HASTE',
  'BOLT_SLOW_2',
	'BOLT_SHIELDING',
  'BOLT_SPIDERWEB',
  'BOLT_SPARK',
  'BOLT_DRAGONFIRE',
  'BOLT_DISTANCE_ATTACK',
  'BOLT_POISON_DART',
  // 'BOLT_ACID_TURRET_ATTACK',	// 1.7.4	TODO - ADD BACK IN CUSTOM
  'BOLT_ANCIENT_SPIRIT_VINES',
  'BOLT_WHIP',
	'NUMBER_BOLT_KINDS'
);

ENUM('ringKind',
	'RING_CLAIRVOYANCE',
	'RING_STEALTH',
	'RING_REGENERATION',
	'RING_TRANSFERENCE',
	'RING_LIGHT',
	'RING_AWARENESS',
	'RING_WISDOM',
  'RING_REAPING',
	'NUMBER_RING_KINDS'
);

ENUM('charmKind',
	'CHARM_HEALTH',
  'CHARM_PROTECTION',
  'CHARM_HASTE',
  'CHARM_FIRE_IMMUNITY',
  'CHARM_INVISIBILITY',
  'CHARM_TELEPATHY',
  'CHARM_LEVITATION',
  'CHARM_SHATTERING',
  'CHARM_GUARDIAN',
  'CHARM_TELEPORTATION',
  'CHARM_RECHARGING',
  'CHARM_NEGATION',
  'NUMBER_CHARM_KINDS'
);

ENUM('scrollKind',
	'SCROLL_ENCHANTING',
	'SCROLL_IDENTIFY',
	'SCROLL_TELEPORT',
	'SCROLL_REMOVE_CURSE',
	'SCROLL_RECHARGING',
	'SCROLL_PROTECT_ARMOR',
	'SCROLL_PROTECT_WEAPON',
  'SCROLL_SANCTUARY',
	'SCROLL_MAGIC_MAPPING',
	'SCROLL_NEGATION',
	'SCROLL_SHATTERING',
  'SCROLL_DISCORD',
	'SCROLL_AGGRAVATE_MONSTER',
	'SCROLL_SUMMON_MONSTER',
	'NUMBER_SCROLL_KINDS'
);

const MAX_PACK_ITEMS =				26;

ENUM('monsterTypes',
	'MK_YOU',
	'MK_RAT',
	'MK_KOBOLD',
	'MK_JACKAL',
	'MK_EEL',
	'MK_MONKEY',
	'MK_BLOAT',
	'MK_PIT_BLOAT',
	'MK_GOBLIN',
	'MK_GOBLIN_CONJURER',
	'MK_GOBLIN_MYSTIC',
	'MK_GOBLIN_TOTEM',
	'MK_PINK_JELLY',
	'MK_TOAD',
	'MK_VAMPIRE_BAT',
	'MK_ARROW_TURRET',
	'MK_ACID_MOUND',
	'MK_CENTIPEDE',
	'MK_OGRE',
	'MK_BOG_MONSTER',
	'MK_OGRE_TOTEM',
	'MK_SPIDER',
	'MK_SPARK_TURRET',
	'MK_WILL_O_THE_WISP',
	'MK_WRAITH',
	'MK_ZOMBIE',
	'MK_TROLL',
	'MK_OGRE_SHAMAN',
	'MK_NAGA',
	'MK_SALAMANDER',
	'MK_EXPLOSIVE_BLOAT',
	'MK_DAR_BLADEMASTER',
	'MK_DAR_PRIESTESS',
	'MK_DAR_BATTLEMAGE',
	'MK_ACID_JELLY',
	'MK_CENTAUR',
	'MK_UNDERWORM',
	'MK_SENTINEL',
	// 'MK_ACID_TURRET', // 1.7.4 -- TODO: ADD BACK IN CUSTOM
	'MK_DART_TURRET',
	'MK_KRAKEN',
	'MK_LICH',
	'MK_PHYLACTERY',
	'MK_PIXIE',
	'MK_PHANTOM',
	'MK_FLAME_TURRET',
	'MK_IMP',
	'MK_FURY',
	'MK_REVENANT',
	'MK_TENTACLE_HORROR',
	'MK_GOLEM',
	'MK_DRAGON',
	'MK_GOBLIN_CHIEFTAN',
	'MK_BLACK_JELLY',
	'MK_VAMPIRE',
	'MK_FLAMEDANCER',
	'MK_SPECTRAL_BLADE',
	'MK_SPECTRAL_IMAGE',
  'MK_GUARDIAN',
  'MK_WINGED_GUARDIAN',
  'MK_CHARM_GUARDIAN',
  'MK_WARDEN_OF_YENDOR',
  'MK_ELDRITCH_TOTEM',
  'MK_MIRRORED_TOTEM',
	'MK_UNICORN',
	'MK_IFRIT',
	'MK_PHOENIX',
	'MK_PHOENIX_EGG',
  'MK_ANCIENT_SPIRIT',
	'NUMBER_MONSTER_KINDS'
);

const NUMBER_MUTATORS 		=          8;
const MONSTER_CLASS_COUNT =         13;

// flavors

const NUMBER_ITEM_COLORS =			21;
const NUMBER_TITLE_PHONEMES =		21;
const NUMBER_ITEM_WOODS =				21;
const NUMBER_POTION_DESCRIPTIONS =	18;
const NUMBER_ITEM_METALS =			12;
const NUMBER_ITEM_GEMS =				18;

// Dungeon flags
FLAG('tileFlags', {
	DISCOVERED					: Fl(0),
	VISIBLE							: Fl(1),	// cell has sufficient light and is in field of view, ready to draw.
	HAS_PLAYER					: Fl(2),
	HAS_MONSTER					: Fl(3),
	HAS_DORMANT_MONSTER	: Fl(4),	// hidden monster on the square
	HAS_ITEM						: Fl(5),
	IN_FIELD_OF_VIEW		: Fl(6),	// player has unobstructed line of sight whether or not there is enough light
	WAS_VISIBLE					: Fl(7),
	HAS_STAIRS					: Fl(8),
	SEARCHED_FROM_HERE	: Fl(9),	// Player already auto-searched from here; can't auto search here again
	IS_IN_SHADOW				: Fl(10),	// so that a player gains an automatic stealth bonus
	MAGIC_MAPPED				: Fl(11),
	ITEM_DETECTED				: Fl(12),
	CLAIRVOYANT_VISIBLE			: Fl(13),
	WAS_CLAIRVOYANT_VISIBLE	: Fl(14),
	CLAIRVOYANT_DARKENED		: Fl(15),	// magical blindness from a cursed ring of clairvoyance
	CAUGHT_FIRE_THIS_TURN		: Fl(16),	// so that fire does not spread asymmetrically
	PRESSURE_PLATE_DEPRESSED	: Fl(17),	// so that traps do not trigger repeatedly while you stand on them
	STABLE_MEMORY						: Fl(18),	// redraws will simply be pulled from the memory array, not recalculated
	KNOWN_TO_BE_TRAP_FREE		: Fl(19),	// keep track of where the player has stepped as he knows no traps are there
	IS_IN_PATH					: Fl(20),	// the yellow trail leading to the cursor
	IN_LOOP							: Fl(21),	// this cell is part of a terrain loop
	IS_CHOKEPOINT				: Fl(22),	// if this cell is blocked, part of the map will be rendered inaccessible
	IS_GATE_SITE				: Fl(23),	// consider placing a locked door here
	IS_IN_ROOM_MACHINE	: Fl(24),
	IS_IN_AREA_MACHINE	: Fl(25),
	IS_POWERED					: Fl(26),	// has been activated by machine power this turn (can probably be eliminate if needed)
	IMPREGNABLE					: Fl(27),	// no tunneling allowed!
	TERRAIN_COLORS_DANCING	: Fl(28),	// colors here will sparkle when the game is idle
	TELEPATHIC_VISIBLE			: Fl(29),	// potions of telepathy let you see through other creatures' eyes
	WAS_TELEPATHIC_VISIBLE	: Fl(30),	// potions of telepathy let you see through other creatures' eyes

	IS_IN_MACHINE				: ['IS_IN_ROOM_MACHINE', 'IS_IN_AREA_MACHINE'], 	// sacred ground; don't generate items here, or teleport randomly to it

	PERMANENT_TILE_FLAGS : ['DISCOVERED', 'MAGIC_MAPPED', 'ITEM_DETECTED', 'HAS_ITEM', 'HAS_DORMANT_MONSTER',
							'HAS_STAIRS', 'SEARCHED_FROM_HERE', 'PRESSURE_PLATE_DEPRESSED',
							'STABLE_MEMORY', 'KNOWN_TO_BE_TRAP_FREE', 'IN_LOOP',
							'IS_CHOKEPOINT', 'IS_GATE_SITE', 'IS_IN_MACHINE', 'IMPREGNABLE'],

	ANY_KIND_OF_VISIBLE			: ['VISIBLE', 'CLAIRVOYANT_VISIBLE', 'TELEPATHIC_VISIBLE'],
});

const TURNS_FOR_FULL_REGEN =	300;
const STOMACH_SIZE =					2150;
const HUNGER_THRESHOLD =			(STOMACH_SIZE - 1800);
const WEAK_THRESHOLD =				150;
const FAINT_THRESHOLD =				50;
const MAX_EXP_LEVEL =					20;
const MAX_EXP =								100000000;

// XPXP required to enable telepathic awareness with the ally
const XPXP_NEEDED_FOR_TELEPATHIC_BOND =     1400 ;

const ROOM_MIN_WIDTH =						4;
const ROOM_MAX_WIDTH =						20;
const ROOM_MIN_HEIGHT =						3;
const ROOM_MAX_HEIGHT =						7;
const HORIZONTAL_CORRIDOR_MIN_LENGTH =	5;
const HORIZONTAL_CORRIDOR_MAX_LENGTH =	15;
const VERTICAL_CORRIDOR_MIN_LENGTH =		2;
const VERTICAL_CORRIDOR_MAX_LENGTH =		9;
const CROSS_ROOM_MIN_WIDTH =				3;
const CROSS_ROOM_MAX_WIDTH =				12;
const CROSS_ROOM_MIN_HEIGHT =				2;
const CROSS_ROOM_MAX_HEIGHT =				5;
const MIN_SCALED_ROOM_DIMENSION =		2;

const ROOM_TYPE_COUNT =             8;

const CORRIDOR_WIDTH =						  1;

const WAYPOINT_SIGHT_RADIUS =				10;
const MAX_WAYPOINT_COUNT =          40;

const MAX_ITEMS_IN_MONSTER_ITEMS_HOPPER =   100;

// Making these larger means cave generation will take more trials; set them too high and the program will hang.
const CAVE_MIN_WIDTH =						50;
const CAVE_MIN_HEIGHT =						20;

// Keyboard commands:
const UP_KEY =				'k';
const DOWN_KEY =			'j';
const LEFT_KEY =			'h';
const RIGHT_KEY =			'l';
const UPLEFT_KEY =			'y';
const UPRIGHT_KEY =			'u';
const DOWNLEFT_KEY =		'b';
const DOWNRIGHT_KEY =		'n';

const UP_ARROW =			'ArrowUp'; // 63232;
const LEFT_ARROW =			'ArrowLeft'; // 63234;
const DOWN_ARROW =			'ArrowDown'; // 63233;
const RIGHT_ARROW =			'ArrowRight'; // 63235;

const SHIFT_UP_KEY      =			'K';
const SHIFT_DOWN_KEY    =			'J';
const SHIFT_LEFT_KEY    =			'H';
const SHIFT_RIGHT_KEY   =			'L';
const SHIFT_UPLEFT_KEY =			'Y';
const SHIFT_UPRIGHT_KEY =			'U';
const SHIFT_DOWNLEFT_KEY =		'B';
const SHIFT_DOWNRIGHT_KEY =		'N';
const SHIFT_UP_ARROW    =			'ARROWUP'; // 63232;
const SHIFT_LEFT_ARROW  =			'ARROWLEFT'; // 63234;
const SHIFT_DOWN_ARROW  =			'ARROWDOWN'; // 63233;
const SHIFT_RIGHT_ARROW =			'ARROWRIGHT'; // 63235;

const DESCEND_KEY =			'>';
const ASCEND_KEY =			'<';
const REST_KEY =			'z';
const AUTO_REST_KEY =		'Z';
const SEARCH_KEY =			's';
const INVENTORY_KEY =		'i';
const ACKNOWLEDGE_KEY =		' ';
const EQUIP_KEY =			'e';
const UNEQUIP_KEY =			'r';
const APPLY_KEY =			'a';
const THROW_KEY =			't';
const RELABEL_KEY =         'R';
const TRUE_COLORS_KEY =		'\\';
const AGGRO_DISPLAY_KEY =   ']';
// const WARNING_PAUSE_KEY =   '[';	// REMOVED in 1.7.5
const DROP_KEY =			'd';
const CALL_KEY =			'c';
const QUIT_KEY =			'Q';
const MESSAGE_ARCHIVE_KEY =	'M';
const HELP_KEY =			'?';
const DISCOVERIES_KEY =		'D';
const EXPLORE_KEY =			'x';
const AUTOPLAY_KEY =		'A';
const SEED_KEY =			'~';
const EASY_MODE_KEY =		'&';
const ESCAPE_KEY =			'Escape'; // '\033';
const RETURN_KEY =			'Enter';  // '\015';
const ENTER_KEY =				'Enter';  // '\012';
const DELETE_KEY =			'Delete'; // '\177';
const BACKSPACE_KEY =		'Backspace';
const TAB_KEY =					'Tab'; 		// '\t';
// Cocoa reports shift-tab this way for some reason.
const SHIFT_TAB_KEY =   'TAB'; // 25 ;
const PERIOD_KEY =			'.';
const VIEW_RECORDING_KEY =	'V';
const LOAD_SAVED_GAME_KEY =	'O';
const SAVE_GAME_KEY =		'S';
const NEW_GAME_KEY =		'N';
const NUMPAD_0 =			'Numpad0'; // 48;
const NUMPAD_1 =			'Numpad1'; // 49;
const NUMPAD_2 =			'Numpad2'; // 50;
const NUMPAD_3 =			'Numpad3'; // 51;
const NUMPAD_4 =			'Numpad4'; // 52;
const NUMPAD_5 =			'Numpad5'; // 53;
const NUMPAD_6 =			'Numpad6'; // 54;
const NUMPAD_7 =			'Numpad7'; // 55;
const NUMPAD_8 =			'Numpad8'; // 56;
const NUMPAD_9 =			'Numpad9'; // 57;
const PAGE_UP_KEY =			'PageUp'; // 63276;
const PAGE_DOWN_KEY =		'PageDown'; // 63277;

const TEST_KEY = 'T';

const UNKNOWN_KEY =			(128+19);

const min = Math.min;
const max = Math.max;
const pow = Math.pow;
const abs = Math.abs;
const cos = Math.cos;
const sin = Math.sin;
const sqrt = Math.sqrt;
const log10 = Math.log10;

function clamp(x, low, hi)	{ return min(hi, max(x, low)); } // pins x to the [y, z] interval

function terrainFlags(x, y)	{
	return (tileCatalog[pmap[x][y].layers[DUNGEON]].flags
				| tileCatalog[pmap[x][y].layers[LIQUID]].flags
				| tileCatalog[pmap[x][y].layers[SURFACE]].flags
				| tileCatalog[pmap[x][y].layers[GAS]].flags);
}

function terrainMechFlags(x, y)	{
	return (tileCatalog[pmap[x][y].layers[DUNGEON]].mechFlags
        | tileCatalog[pmap[x][y].layers[LIQUID]].mechFlags
        | tileCatalog[pmap[x][y].layers[SURFACE]].mechFlags
        | tileCatalog[pmap[x][y].layers[GAS]].mechFlags);
}


// #ifdef BROGUE_ASSERTS
// boolean cellHasTerrainFlag(short x, short y, unsigned long flagMask);
// #else
function cellHasTerrainFlag(x, y, flagMask)	{
	return (flagMask & terrainFlags(x, y)) ? true : false;
}
// #endif

function cellHasTMFlag(x, y, flagMask) {
	return (flagMask & terrainMechFlags(x, y)) ? true : false;
}

function cellHasTerrainType(x, y, terrain)	{
	return (pmap[x][y].layers[DUNGEON] === terrain
 			 || pmap[x][y].layers[LIQUID] === terrain
			 || pmap[x][y].layers[SURFACE] === terrain
			 || pmap[x][y].layers[GAS] === terrain) ? true : false;
}

function cellHasKnownTerrainFlag(x, y, flagMask) {
		return (flagMask & pmap[x][y].rememberedTerrainFlags) ? true : false;
}

function cellIsPassableOrDoor(x, y)	{
		return (!cellHasTerrainFlag(x, y, T_PATHING_BLOCKER)
					  || (cellHasTMFlag(x, y, (TM_IS_SECRET | TM_PROMOTES_WITH_KEY | TM_CONNECTS_LEVEL))
						    && cellHasTerrainFlag(x, y, T_OBSTRUCTS_PASSABILITY)));
}

function coordinatesAreInMap(x, y)    { return ((x) >= 0 && (x) < DCOLS	&& (y) >= 0 && (y) < DROWS); }
function coordinatesAreInWindow(x, y) { return ((x) >= 0 && (x) < COLS		&& (y) >= 0 && (y) < ROWS); }
function mapToWindowX(x)						  { return ((x) + STAT_BAR_WIDTH + 1); }
function mapToWindowY(y)						  { return ((y) + MESSAGE_LINES); }
function windowToMapX(x)						  { return ((x) - STAT_BAR_WIDTH - 1); }
function windowToMapY(y)						  { return ((y) - MESSAGE_LINES); }

function playerCanDirectlySee(x, y)	  { return (pmap[x][y].flags & VISIBLE); }
function playerCanSee(x, y)					  { return (pmap[x][y].flags & ANY_KIND_OF_VISIBLE); }
function playerCanSeeOrSense(x, y)		{
	return ((pmap[x][y].flags & ANY_KIND_OF_VISIBLE)
					 || (rogue.playbackOmniscience
               && (pmap[x][y].layers[DUNGEON] != GRANITE || (pmap[x][y].flags & DISCOVERED))));
}

// TODO ????
function CYCLE_MONSTERS_AND_PLAYERS(fn)	{
	let v;
	for (v = player; v != NULL; v = (v === player ? monsters.nextCreature : v.nextCreature)) {
		fn(v);
	}
}

var RNG_STACK = [];
function assureCosmeticRNG()	{
	RNG_STACK.push(rogue.RNG);
	rogue.RNG = RNG_COSMETIC;
}

function restoreRNG()					{
	rogue.RNG = RNG_STACK.length ? RNG_STACK.pop() : RNG_SUBSTANTIVE;
}


const MIN_COLOR_DIFF =			600;
// weighted sum of the squares of the component differences. Weights are according to color perception.
function COLOR_DIFF(f, b)		 {
	return ((f.red - b.red) * (f.red - b.red) * 0.2126
		+ (f.green - b.green) * (f.green - b.green) * 0.7152
		+ (f.blue - b.blue) * (f.blue - b.blue) * 0.0722);
}

// game data formulae:

// function staffDamageLow(enchant) 			{ return (Math.floor(3 * (2 + (enchant)) / 4 + FLOAT_FUDGE)); }
// function staffDamageHigh(enchant) 		{ return (Math.floor(4 + 5 * (enchant) / 2 + FLOAT_FUDGE)); }
// function staffDamage(enchant) 				{ return (randClumpedRange(staffDamageLow(enchant), staffDamageHigh(enchant), 1 + (enchant) / 3)); }
// function staffPoison(enchant) 				{ return (Math.floor(5 * pow(1.3, (enchant) - 2) + FLOAT_FUDGE)); }
// function staffBlinkDistance(enchant) 	{ return (Math.floor((enchant) * 2 + 2 + FLOAT_FUDGE)); }
// function staffHasteDuration(enchant) 	{ return (Math.floor(2 + (enchant) * 4 + FLOAT_FUDGE)); }
// function staffBladeCount(enchant) 		{ return (Math.floor((enchant) * 3 / 2 + FLOAT_FUDGE)); }
// function staffDiscordDuration(enchant) { return	(Math.floor((enchant) * 4 + FLOAT_FUDGE)); }
// function staffProtection(enchant) 		{ return (Math.floor(50 * pow(1.53, (enchant) - 2) + FLOAT_FUDGE)); }
// function staffEntrancementDuration(enchant) { return	(Math.floor((enchant) * 3 + FLOAT_FUDGE)); }
//
// function ringWisdomMultiplier(enchant) { return Math.floor(10 * pow(1.3, min(27, (enchant))) + FLOAT_FUDGE); }
//
// function charmHealing(enchant)           { return (Math.floor(clamp(20 * (enchant), 0, 100) + FLOAT_FUDGE)); }
// function charmProtection(enchant)				 { return (Math.floor(150 * pow(1.35, (double) (enchant) - 1) + FLOAT_FUDGE)); }
// function charmShattering(enchant)        { return (Math.floor(4 + (enchant) + FLOAT_FUDGE)); }
// function charmGuardianLifespan(enchant)  { return (Math.floor(4 + (2 * (enchant)) + FLOAT_FUDGE)); }
// function charmNegationRadius(enchant)    { return (Math.floor(1 + (3 * (enchant)) + FLOAT_FUDGE)); }
//
// function wandDominate(monst) {
// 	return ((monst.currentHP * 5 < monst.info.maxHP) ? 100 : max(0, 100 * (monst.info.maxHP - monst.currentHP) / monst.info.maxHP));
// }
//
// function weaponParalysisDuration(enchant)	{ return (max(2, Math.floor(2 + ((enchant) / 2) + FLOAT_FUDGE))); }
// function weaponConfusionDuration(enchant)	{ return (max(3, Math.floor(1.5 * (enchant) + FLOAT_FUDGE))); }
// function weaponForceDistance(enchant)			{ return (max(4, ((Math.floor(enchant + FLOAT_FUDGE)) * 2 + 2))); } // Depends on definition of staffBlinkDistance() above.;
// function weaponSlowDuration(enchant)			{ return (max(3, Math.floor(((enchant) + 2) * ((enchant) + 2) / 3 + FLOAT_FUDGE))); }
// function weaponImageCount(enchant)				{ return (clamp(Math.floor((enchant) / 3 + FLOAT_FUDGE), 1, 7)); }
// function weaponImageDuration(enchant)			{ return 3; }										//(max((int) (1 + (enchant) / 3), 2));
//
// function armorReprisalPercent(enchant)	{ return (max(5, Math.floor((enchant) * 5 + FLOAT_FUDGE))); }
// function armorAbsorptionMax(enchant)		{ return 	(max(1, Math.floor((enchant) + FLOAT_FUDGE))); }
// function armorImageCount(enchant)		{ return 	(clamp(Math.floor((enchant) / 3 + FLOAT_FUDGE), 1, 5)); }
// function reflectionChance(enchant)		{ return 	(clamp((100 - Math.floor(100 * pow(0.85, (enchant)) + FLOAT_FUDGE)), 1, 100)); }
//
// // This will max out at full regeneration in about two turns.
// // This is the Syd nerf, after Syd broke the game over his knee with a +18 ring of regeneration.
// function turnsForFullRegen(bonus)			{ return (Math.floor(1000 * TURNS_FOR_FULL_REGEN * pow(0.75, (bonus)) + 2000 + FLOAT_FUDGE)); }

// structs

ENUM('dungeonLayers', -1,
  'NO_LAYER',
	'DUNGEON',		// dungeon-level tile	(e.g. walls)
	'LIQUID',				// liquid-level tile	(e.g. lava)
	'GAS',				// gas-level tile		(e.g. fire, smoke, swamp gas)
	'SURFACE',			// surface-level tile	(e.g. grass)
	'NUMBER_TERRAIN_LAYERS'
);

class CellDisplayBuffer {
	constructor() {
		this.char = '';
		this.foreColorComponents = []; // [3];
		this.backColorComponents = []; // [3];
		this.opacity = 0;
		this.needsUpdate = false;
	}

	copy(other) {
		this.char = other.char;
		for(let i = 0; i < 3; ++i) {
			this.foreColorComponents[i] = other.foreColorComponents[i];
			this.backColorComponents[i] = other.backColorComponents[i];
		}
		this.opacity = other.opacity;
		this.needsUpdate = other.needsUpdate;
	}
}

// keeps track of graphics so we only redraw if the cell has changed:
function cellDisplayBuffer() {
	return new CellDisplayBuffer();
}

class PCell {
	constructor() {
		this.layers = []; // [NUMBER_TERRAIN_LAYERS];	// terrain  /* ENUM tileType */
		this.flags = 0;							// non-terrain cell flags
		this.volume = 0;						// quantity of gas in cell
		this.machineNumber = 0;
		this.rememberedAppearance = cellDisplayBuffer();			// how the player remembers the cell to look
		this.rememberedItemCategory = 0;		// what category of item the player remembers lying there
		this.rememberedItemKind = 0;        // what kind of item the player remembers lying there
	  this.rememberedItemQuantity = 0;    // how many of the item the player remembers lying there
		this.rememberedTerrain = 0;					// what the player remembers as the terrain (i.e. highest priority terrain upon last seeing)
	  this.rememberedCellFlags = 0;       // map cell flags the player remembers from that spot
	  this.rememberedTerrainFlags = 0;    // terrain flags the player remembers from that spot
	  this.rememberedTMFlags = 0;         // TM flags the player remembers from that spot
	}

	copy(other) {
		this.layers = other.layers.slice();
		this.flags = other.flags;
		this.volume = other.volume;						// quantity of gas in cell
		this.machineNumber = other.machineNumber;
		this.rememberedAppearance.copy(other.rememberedAppearance);			// how the player remembers the cell to look
		this.rememberedItemCategory = other.rememberedItemCategory;		// what category of item the player remembers lying there
		this.rememberedItemKind = other.rememberedItemKind;        // what kind of item the player remembers lying there
	  this.rememberedItemQuantity = other.rememberedItemQuantity;    // how many of the item the player remembers lying there
		this.rememberedTerrain = other.rememberedTerrain;					// what the player remembers as the terrain (i.e. highest priority terrain upon last seeing)
	  this.rememberedCellFlags = other.rememberedCellFlags;       // map cell flags the player remembers from that spot
	  this.rememberedTerrainFlags = other.rememberedTerrainFlags;    // terrain flags the player remembers from that spot
	  this.rememberedTMFlags = other.rememberedTMFlags;         // TM flags the player remembers from that spot
	}
}

function pcell() {								// permanent cell; have to remember this stuff to save levels
	return new PCell();
}

function tcell() {			// transient cell; stuff we don't need to remember between levels
	return {
		light: [0, 0, 0], // [3];				// RGB components of lighting
		oldLight: [0, 0, 0], // [3];			// compare with subsequent lighting to determine whether to refresh cell
	}
}

class RandomRange {
	constructor(lower, upper, clump) {
		this.lowerBound = lower || 0;
		this.upperBound = upper || 0;
		this.clumpFactor = clump || 0;
	}

	copy(other) {
		this.lowerBound = other.lowerBound;
		this.upperBound = other.upperBound;
		this.clumpFactor = other.clumpFactor;
	}
}

function randomRange(lower, upper, clump) {
	if (arguments.length == 1) {
		if (Array.isArray(lower)) {
			clump = lower[2];
			upper = lower[1];
			lower = lower[0];
		}
		else {
			clump = lower.clumpFactor;
			upper = lower.upperBound;
			lower = lower.lowerBound;
		}
	}
	return new RandomRange(lower, upper, clump);
}

class Color {
	constructor(r, g, b, rr, gr, br, rnd, d) {
		// base RGB components:
		this.red = r || 0;
		this.green = g || 0;
		this.blue = b || 0;

		// random RGB components to add to base components:
		this.redRand = rr || 0;
		this.greenRand = gr || 0;
		this.blueRand = br || 0;

		// random scalar to add to all components:
		this.rand = rnd || 0;

		// Flag: this color "dances" with every refresh:
		this.colorDances = d || false;
	}

	copy(other) {
		Object.assign(this, other);
	}

	clone() {
		return new Color(this.red, this.green, this.blue,
				this.redRand, this.greenRand, this.blueRand, this.rand,
				this.colorDances);
	}
}

function color(r, g, b, rr, gr, br, rnd, d) {
	if (arguments.length == 1 && r instanceof Color) {
		const n = r.clone();
		return n;
	}
	return new Color(r, g, b, rr, gr, br, rnd, d);
}

FLAG('itemFlags', {
	ITEM_IDENTIFIED			: Fl(0),
	ITEM_EQUIPPED				: Fl(1),
	ITEM_CURSED					: Fl(2),
	ITEM_PROTECTED			: Fl(3),
	// unused               : Fl(4),
	ITEM_RUNIC					: Fl(5),
	ITEM_RUNIC_HINTED		: Fl(6),
	ITEM_RUNIC_IDENTIFIED		: Fl(7),
	ITEM_CAN_BE_IDENTIFIED	: Fl(8),
	ITEM_PREPLACED					: Fl(9),
	ITEM_FLAMMABLE					: Fl(10),
	ITEM_MAGIC_DETECTED			: Fl(11),
	ITEM_MAX_CHARGES_KNOWN	: Fl(12),
	ITEM_IS_KEY							: Fl(13),

	// ITEM_ATTACKS_HIT_SLOWLY		: Fl(14),	// mace, hammer		1.7.4
	ITEM_ATTACKS_STAGGER			: Fl(14),		// mace, hammer
  ITEM_ATTACKS_EXTEND     	: Fl(15),   // whip
  ITEM_ATTACKS_QUICKLY    	: Fl(16),   // rapier
	ITEM_ATTACKS_PENETRATE		: Fl(17),	// spear, pike
	ITEM_ATTACKS_ALL_ADJACENT : Fl(18),	// axe, war axe
  ITEM_LUNGE_ATTACKS      	: Fl(19),   // rapier
  ITEM_SNEAK_ATTACK_BONUS 	: Fl(20),   // dagger
  ITEM_PASS_ATTACKS       	: Fl(21),   // flail
	ITEM_KIND_AUTO_ID       	: Fl(22),	// the item type will become known when the item is picked up.
	ITEM_PLAYER_AVOIDS				: Fl(23),	// explore and travel will try to avoid picking the item up
});

const KEY_ID_MAXIMUM	= 20;

function keyLocationProfile() {
	return {
		x: 0,
		y: 0,
		machine: 0,
		disposableHere: false
	};
}


function item() {
	return {
		category: 0,
		kind: 0,
		flags: 0,
		/* randomRange */ damage: randomRange(),
		armor: 0,
		charges: 0,
		enchant1: 0,
		enchant2: 0,
	  timesEnchanted: 0,
		/* ENUM monsterTypes */vorpalEnemy: 0,
		strengthRequired: 0,
		quiverNumber: 0,
		displayChar: '',
		foreColor: null,
		inventoryColor: null,
		quantity: 0,
		inventoryLetter: '',
		inscription: STRING(), // [DCOLS];
		xLoc: 0,
		yLoc: 0,
		/* keyLocationProfile */ keyLoc: ARRAY(KEY_ID_MAXIMUM, keyLocationProfile), // [KEY_ID_MAXIMUM];
		originDepth: 0,
		/* struct item */ nextItem: null,
	};
}

function itemTable(name, flavor, title, freq, value, str, range, ident, called, desc) {
	range = range || [];
	return {
		name: name || '',
		flavor: flavor || '',
		callTitle: STRING(title || ''), // [30];
		frequency: freq || 0,
		marketValue: value || 0,
		strengthRequired: str || 0,
		range: randomRange(range),
		identified: ident || false,
		called: called || false,
		description: desc || '', // [1500];
	};
}


ENUM('dungeonFeatureTypes',
	'DF_NONE',
	'DF_GRANITE_COLUMN',
	'DF_CRYSTAL_WALL',
	'DF_LUMINESCENT_FUNGUS',
	'DF_GRASS',
	'DF_DEAD_GRASS',
	'DF_BONES',
	'DF_RUBBLE',
	'DF_FOLIAGE',
	'DF_FUNGUS_FOREST',
	'DF_DEAD_FOLIAGE',

	'DF_SUNLIGHT',
	'DF_DARKNESS',

	'DF_SHOW_DOOR',
	'DF_SHOW_POISON_GAS_TRAP',
	'DF_SHOW_PARALYSIS_GAS_TRAP',
	'DF_SHOW_TRAPDOOR_HALO',
	'DF_SHOW_TRAPDOOR',
	'DF_SHOW_CONFUSION_GAS_TRAP',
	'DF_SHOW_FLAMETHROWER_TRAP',
	'DF_SHOW_FLOOD_TRAP',
  'DF_SHOW_NET_TRAP',
  'DF_SHOW_ALARM_TRAP',

	'DF_RED_BLOOD',
	'DF_GREEN_BLOOD',
	'DF_PURPLE_BLOOD',
	'DF_WORM_BLOOD',
	'DF_ACID_BLOOD',
	'DF_ASH_BLOOD',
	'DF_EMBER_BLOOD',
	'DF_ECTOPLASM_BLOOD',
	'DF_RUBBLE_BLOOD',
	'DF_ROT_GAS_BLOOD',

	'DF_VOMIT',
	'DF_BLOAT_DEATH',
	'DF_BLOAT_EXPLOSION',
	'DF_BLOOD_EXPLOSION',
	'DF_FLAMEDANCER_CORONA',

	'DF_MUTATION_EXPLOSION',
  'DF_MUTATION_LICHEN',

	'DF_REPEL_CREATURES',
	'DF_ROT_GAS_PUFF',
	'DF_STEAM_PUFF',
	'DF_STEAM_ACCUMULATION',
	'DF_METHANE_GAS_PUFF',
	'DF_SALAMANDER_FLAME',
	'DF_URINE',
	'DF_UNICORN_POOP',
	'DF_PUDDLE',
	'DF_ASH',
	'DF_ECTOPLASM_DROPLET',
	'DF_FORCEFIELD',
  'DF_FORCEFIELD_MELT',
  'DF_SACRED_GLYPHS',
	'DF_LICHEN_GROW',
	'DF_TUNNELIZE',
  'DF_SHATTERING_SPELL',

  // spiderwebs
  'DF_WEB_SMALL',
  'DF_WEB_LARGE',

  // ancient spirit
  'DF_ANCIENT_SPIRIT_VINES',
  'DF_ANCIENT_SPIRIT_GRASS',

  // foliage
	'DF_TRAMPLED_FOLIAGE',
	'DF_SMALL_DEAD_GRASS',
	'DF_FOLIAGE_REGROW',
	'DF_TRAMPLED_FUNGUS_FOREST',
	'DF_FUNGUS_FOREST_REGROW',

  // brimstone
	'DF_ACTIVE_BRIMSTONE',
	'DF_INERT_BRIMSTONE',

  // bloodwort
  'DF_BLOODFLOWER_PODS_GROW_INITIAL',
  'DF_BLOODFLOWER_PODS_GROW',
  'DF_BLOODFLOWER_POD_BURST',

  // dewars
  'DF_DEWAR_CAUSTIC',
  'DF_DEWAR_CONFUSION',
  'DF_DEWAR_PARALYSIS',
  'DF_DEWAR_METHANE',
  'DF_DEWAR_GLASS',
  'DF_CARPET_AREA',

  // algae
  'DF_BUILD_ALGAE_WELL',
  'DF_ALGAE_1',
  'DF_ALGAE_2',
  'DF_ALGAE_REVERT',

	'DF_OPEN_DOOR',
	'DF_CLOSED_DOOR',
	'DF_OPEN_IRON_DOOR_INERT',
	'DF_ITEM_CAGE_OPEN',
	'DF_ITEM_CAGE_CLOSE',
	'DF_ALTAR_INERT',
	'DF_ALTAR_RETRACT',
	'DF_PORTAL_ACTIVATE',
  'DF_INACTIVE_GLYPH',
  'DF_ACTIVE_GLYPH',
  'DF_SILENT_GLYPH_GLOW',
  'DF_GUARDIAN_STEP',
  'DF_MIRROR_TOTEM_STEP',
  'DF_GLYPH_CIRCLE',
  'DF_REVEAL_LEVER',
  'DF_PULL_LEVER',
  'DF_CREATE_LEVER',

  'DF_BRIDGE_FALL_PREP',
  'DF_BRIDGE_FALL',

	'DF_PLAIN_FIRE',
	'DF_GAS_FIRE',
	'DF_EXPLOSION_FIRE',
	'DF_DART_EXPLOSION',
	'DF_BRIMSTONE_FIRE',
	'DF_BRIDGE_FIRE',
	'DF_FLAMETHROWER',
	'DF_EMBERS',
	'DF_EMBERS_PATCH',
	'DF_OBSIDIAN',
  'DF_ITEM_FIRE',
  'DF_CREATURE_FIRE',

	'DF_FLOOD',
	'DF_FLOOD_2',
	'DF_FLOOD_DRAIN',
	'DF_HOLE_2',
	'DF_HOLE_DRAIN',

	// 1.7.5
	'DF_DEEP_WATER_FREEZE',
	'DF_ALGAE_1_FREEZE',
	'DF_ALGAE_2_FREEZE',
	'DF_DEEP_WATER_MELTING',
	'DF_DEEP_WATER_THAW',
	'DF_SHALLOW_WATER_FREEZE',
	'DF_SHALLOW_WATER_MELTING',
	'DF_SHALLOW_WATER_THAW',

	'DF_POISON_GAS_CLOUD',
	'DF_CONFUSION_GAS_TRAP_CLOUD',
  'DF_NET',
  'DF_AGGRAVATE_TRAP',
	'DF_METHANE_GAS_ARMAGEDDON',

	// potions
	'DF_POISON_GAS_CLOUD_POTION',
	'DF_PARALYSIS_GAS_CLOUD_POTION',
	'DF_CONFUSION_GAS_CLOUD_POTION',
	'DF_INCINERATION_POTION',
	'DF_DARKNESS_POTION',
	'DF_HOLE_POTION',
	'DF_LICHEN_PLANTED',

  // other items
  'DF_ARMOR_IMMOLATION',
  'DF_STAFF_HOLE',
  'DF_STAFF_HOLE_EDGE',

  // commutation altar
  'DF_ALTAR_COMMUTE',
  'DF_MAGIC_PIPING',
  'DF_INERT_PIPE',

  // resurrection altar
  'DF_ALTAR_RESURRECT',
  'DF_MACHINE_FLOOR_TRIGGER_REPEATING',

	// sacrifice altar	1.7.5
	'DF_SACRIFICE_ALTAR',
	'DF_SACRIFICE_COMPLETE',
	'DF_SACRIFICE_CAGE_ACTIVE',

	// vampire in coffin
	'DF_COFFIN_BURSTS',
	'DF_COFFIN_BURNS',
	'DF_TRIGGER_AREA',

	// throwing tutorial -- button in chasm
	'DF_CAGE_DISAPPEARS',
	'DF_MEDIUM_HOLE',
	'DF_MEDIUM_LAVA_POND',
  'DF_MACHINE_PRESSURE_PLATE_USED',

  // rat trap
  'DF_WALL_CRACK',

	// wooden barricade at entrance
	'DF_WOODEN_BARRICADE_BURN',

	// wooden barricade around altar, dead grass all around
	'DF_SURROUND_WOODEN_BARRICADE',

	// pools of water that, when triggered, slowly expand to fill the room
	'DF_SPREADABLE_WATER',
	'DF_SHALLOW_WATER',
	'DF_WATER_SPREADS',
	'DF_SPREADABLE_WATER_POOL',
	'DF_SPREADABLE_DEEP_WATER_POOL',

	// when triggered, the ground gradually turns into chasm:
	'DF_SPREADABLE_COLLAPSE',
	'DF_COLLAPSE',
	'DF_COLLAPSE_SPREADS',
	'DF_ADD_MACHINE_COLLAPSE_EDGE_DORMANT',

	// when triggered, a bridge appears:
  'DF_BRIDGE_ACTIVATE',
  'DF_BRIDGE_ACTIVATE_ANNOUNCE',
	'DF_BRIDGE_APPEARS',
  'DF_ADD_DORMANT_CHASM_HALO',

	// when triggered, the lava retracts:
  'DF_LAVA_RETRACTABLE',
	'DF_RETRACTING_LAVA',
	'DF_OBSIDIAN_WITH_STEAM',

	// when triggered, the door seals and caustic gas fills the room
	'DF_SHOW_POISON_GAS_VENT',
	'DF_POISON_GAS_VENT_OPEN',
	'DF_ACTIVATE_PORTCULLIS',
	'DF_OPEN_PORTCULLIS',
	'DF_VENT_SPEW_POISON_GAS',

	// when triggered, pilot light ignites and explosive gas fills the room
	'DF_SHOW_METHANE_VENT',
	'DF_METHANE_VENT_OPEN',
	'DF_VENT_SPEW_METHANE',
	'DF_PILOT_LIGHT',

    // paralysis trap: trigger plate with gas vents nearby
	'DF_DISCOVER_PARALYSIS_VENT',
	'DF_PARALYSIS_VENT_SPEW',
	'DF_REVEAL_PARALYSIS_VENT_SILENTLY',

	// thematic dungeon
	'DF_AMBIENT_BLOOD',

	// statues crack for a few turns and then shatter, revealing the monster inside
	'DF_CRACKING_STATUE',
	'DF_STATUE_SHATTER',

	// a turret appears:
	'DF_TURRET_EMERGE',

  // an elaborate worm catacomb opens up
  'DF_WORM_TUNNEL_MARKER_DORMANT',
  'DF_WORM_TUNNEL_MARKER_ACTIVE',
  'DF_GRANITE_CRUMBLES',
  'DF_WALL_OPEN',

	// the room gradually darkens
	'DF_DARKENING_FLOOR',
	'DF_DARK_FLOOR',
  'DF_HAUNTED_TORCH_TRANSITION',
  'DF_HAUNTED_TORCH',

	// bubbles rise from the mud and bog monsters spawn
	'DF_MUD_DORMANT',
	'DF_MUD_ACTIVATE',

  // crystals charge when hit by lightning
  'DF_ELECTRIC_CRYSTAL_ON',
  'DF_TURRET_LEVER',

	// idyll:
	'DF_SHALLOW_WATER_POOL',
  'DF_DEEP_WATER_POOL',

	// swamp:
	'DF_SWAMP_WATER',
	'DF_SWAMP',
	'DF_SWAMP_MUD',

	// camp:
	'DF_HAY',
	'DF_JUNK',

	// remnants:
	'DF_REMNANT',
	'DF_REMNANT_ASH',

	// chasm catwalk:
	'DF_CHASM_HOLE',
	'DF_CATWALK_BRIDGE',

	// lake catwalk:
	'DF_LAKE_CELL',
	'DF_LAKE_HALO',

	// worm den:
	'DF_WALL_SHATTER',

	// monster cages open:
	'DF_MONSTER_CAGE_OPENS',

  // goblin warren:
  'DF_STENCH_BURN',
  'DF_STENCH_SMOLDER',

	'NUMBER_DUNGEON_FEATURES',
);

ENUM('dungeonProfileTypes',
    'DP_BASIC',
    'DP_BASIC_FIRST_ROOM',
    'DP_GOBLIN_WARREN',
    'DP_SENTINEL_SANCTUARY',
    'NUMBER_DUNGEON_PROFILES',
);


class LightSource {
	constructor(color, range, fadeTo, pass) {
		this.lightColor = color || null;	/* color */
		this.lightRadius = randomRange(range);
		this.radialFadeToPercent = fadeTo || 0;
		this.passThroughCreatures = pass || false; // generally no, but miner light does
	}

	copy(other) {
		this.lightColor = other.lightColor;
		this.lightRadius.copy(other.lightRadius);
		this.radialFadeToPercent = other.radialFadeToPercent;
		this.passThroughCreatures = other.passThroughCreatures;
	}
}


function lightSource(color, range, fadeTo, pass) {
	if (arguments.length == 1 && color.lightColor) {
		pass = color.passThroughCreatures;
		fadeTo = color.radialFadeToPercent;
		range = color.lightRadius;
		color = color.lightColor;
	}

	range = range || [];
	return new LightSource(color, range, fadeTo, pass);
}


function flare() {
	return {
    /* lightSource */ light: null,      // Flare light
    coeffChangeAmount: 0,    // The constant amount by which the coefficient changes per frame, e.g. -25 means it gets 25% dimmer per frame.
    coeffLimit: 0,           // Flare ends if the coefficient passes this percentage (whether going up or down).
    xLoc: 0, yLoc: 0,        // Current flare location.
    coeff: 0,                // Current flare coefficient; always starts at 100.
    turnNumber: 0,           // So we can eliminate those that fired one or more turns ago.
	};
}

FLAG('DFFlags', {
	DFF_EVACUATE_CREATURES_FIRST	: Fl(0),	// Creatures in the DF area get moved outside of it
	DFF_SUBSEQ_EVERYWHERE			: Fl(1),	// Subsequent DF spawns in every cell that this DF spawns in, instead of only the origin
	DFF_TREAT_AS_BLOCKING			: Fl(2),	// If filling the footprint of this DF with walls would disrupt level connectivity, then abort.
	DFF_PERMIT_BLOCKING				: Fl(3),	// Generate this DF without regard to level connectivity.
	DFF_ACTIVATE_DORMANT_MONSTER	: Fl(4),	// Dormant monsters on this tile will appear -- e.g. when a statue bursts to reveal a monster.
	DFF_CLEAR_OTHER_TERRAIN			: Fl(5),	// Erase other terrain in the footprint of this DF.
	DFF_BLOCKED_BY_OTHER_LAYERS		: Fl(6),	// Will not propagate into a cell if any layer in that cell has a superior priority.
	DFF_SUPERPRIORITY				: Fl(7),	// Will overwrite terrain of a superior priority.
    DFF_AGGRAVATES_MONSTERS         : Fl(8),    // Will act as though an aggravate monster scroll of effectRadius radius had been read at that point.
    DFF_RESURRECT_ALLY              : Fl(9),    // Will bring back to life your most recently deceased ally.
});

ENUM('boltEffects',
    'BE_NONE',
    'BE_ATTACK',
    'BE_TELEPORT',
    'BE_SLOW',
    'BE_POLYMORPH',
    'BE_NEGATION',
    'BE_DOMINATION',
    'BE_BECKONING',
    'BE_PLENTY',
    'BE_INVISIBILITY',
    'BE_EMPOWERMENT',
    'BE_DAMAGE',
    'BE_POISON',
    'BE_TUNNELING',
    'BE_BLINKING',
    'BE_ENTRANCEMENT',
    'BE_OBSTRUCTION',
    'BE_DISCORD',
    'BE_CONJURATION',
    'BE_HEALING',
    'BE_HASTE',
    'BE_SHIELDING',
);

FLAG('boltFlags', {
	BF_PASSES_THRU_CREATURES        : Fl(0),		// Bolt continues through creatures (e.g. lightning and tunneling)
  BF_HALTS_BEFORE_OBSTRUCTION     : Fl(1),    // Bolt takes effect the space before it terminates (e.g. conjuration, obstruction, blinking)
  BF_TARGET_ALLIES                : Fl(2),    // Staffs/wands/creatures that shoot this bolt will auto-target allies.
  BF_TARGET_ENEMIES               : Fl(3),    // Staffs/wands/creatures that shoot this bolt will auto-target enemies.
  BF_FIERY                        : Fl(4),    // Bolt will light flammable terrain on fire as it passes, and will ignite monsters hit.
  BF_NEVER_REFLECTS               : Fl(6),    // Bolt will never reflect (e.g. spiderweb, arrows).
  BF_NOT_LEARNABLE                : Fl(7),    // This technique cannot be absorbed by empowered allies.
  BF_NOT_NEGATABLE                : Fl(8),    // Won't be erased by negation.
  BF_ELECTRIC                     : Fl(9),    // Activates terrain that has TM_PROMOTES_ON_ELECTRICITY
  BF_DISPLAY_CHAR_ALONG_LENGTH    : Fl(10),		// Display the character along the entire length of the bolt instead of just at the front.
});


class Bolt {
	constructor(name, desc, abDesc, ch, fg, bg, effect, mag, path, target, forbid, flags) {
		this.name = name || ''; // [DCOLS];
    this.description = desc || ''; // [COLS];
    this.abilityDescription = abDesc || ''; // [COLS*2];
    this.theChar = ch || '';
    this.foreColor = fg || null;
    this.backColor = bg || null;
    this.boltEffect = effect || 0;
    this.magnitude = mag || 0;
    this.pathDF = path || 0;
    this.targetDF = target || 0;
    this.forbiddenMonsterFlags = forbid || 0;
    this.flags = flags || 0;
	}

	copy(other) {
		Object.assign(this, other);
	}
}

function bolt(...args) {
	return new Bolt(...args);
}

// Level profiles, affecting what rooms get chosen and how they're connected:
// Room frequencies:
//      0. Cross room
//      1. Small symmetrical cross room
//      2. Small room
//      3. Circular room
//      4. Chunky room
//      5. Cave
//      6. Cavern (the kind that fills a level)
//      7. Entrance room (the big upside-down T room at the start of depth 1)
function dungeonProfile(rooms, corridors) {
	return {
    // Room type weights (in the natural dungeon, these are also adjusted based on depth):
    roomFrequencies: rooms || [], // [ROOM_TYPE_COUNT];
    corridorChance: corridors || 0,
	};
}


// Dungeon features, spawned from Architect.c:
function dungeonFeature(tile, layer, start, decr, flag, text, flare, color, radius, propTile, subDF) {
	return {
		// tile info:
		/* ENUM tileType */ tile: tile || 0,
		/* ENUM dungeonLayers */ layer: layer || 0,

		// spawning pattern:
		startProbability: start || 0,
		probabilityDecrement: decr || 0,
		flags: flag || 0,
		description: text || '', // [DCOLS];
	  /* ENUM lightType */ lightFlare: flare || 0,
		/* color */ flashColor: color || null,
		effectRadius: radius || 0,
		/* ENUM tileType */ propagationTerrain: propTile || 0,
		/* ENUM dungeonFeatureTypes */ subsequentDF: subDF || 0,
		messageDisplayed: false,
	};
}


// Terrain types:
function floorTileType(char, fg, bg, priority, chance, fire, discover, promote, promChance, light, flag, mech, desc, flavor) {
	return {
		// appearance:
		displayChar: char || '',
		foreColor: fg || null,
		backColor: bg || null,
		drawPriority: priority || 0,                     // priority (lower number means higher priority); governs drawing as well as tile replacement comparisons.
		chanceToIgnite: chance || 0,					// chance to burn if a flame terrain is on one of the four cardinal neighbors
		/* ENUM dungeonFeatureTypes */ fireType: fire || 0,		// spawn this DF when the terrain ignites (or, if it's T_IS_DF_TRAP, when the pressure plate clicks)
		/* ENUM dungeonFeatureTypes */ discoverType: discover || 0,	// spawn this DF when successfully searched if T_IS_SECRET is set
		/* ENUM dungeonFeatureTypes */ promoteType: promote || 0,	// creates this dungeon spawn type when it promotes for some other reason (random promotion or promotion through machine activation)
		promoteChance: promChance || 0,					// percent chance per turn to spawn the promotion type; will also vanish upon doing so if T_VANISHES_UPON_PROMOTION is set
		glowLight: light || 0,						// if it glows, this is the ID of the light type
		flags: flag || 0,
	  mechFlags: mech || 0,
		description: desc || '', // [COLS];
		flavorText: flavor || '', // [COLS];
	};
}


FLAG('terrainFlagCatalog', {
	T_OBSTRUCTS_PASSABILITY	: Fl(0),		// cannot be walked through
	T_OBSTRUCTS_VISION			: Fl(1),		// blocks line of sight
	T_OBSTRUCTS_ITEMS				: Fl(2),		// items can't be on this tile
	T_OBSTRUCTS_SURFACE_EFFECTS		: Fl(3),		// grass, blood, etc. cannot exist on this tile
	T_OBSTRUCTS_GAS					: Fl(4),		// blocks the permeation of gas
  T_OBSTRUCTS_DIAGONAL_MOVEMENT : Fl(5),    // can't step diagonally around this tile
	T_SPONTANEOUSLY_IGNITES	: Fl(6),		// monsters avoid unless chasing player or immune to fire
	T_AUTO_DESCENT					: Fl(7),		// automatically drops creatures down a depth level and does some damage (2d6)
	T_LAVA_INSTA_DEATH			: Fl(8),		// kills any non-levitating non-fire-immune creature instantly
	T_CAUSES_POISON					: Fl(9),		// any non-levitating creature gets 10 poison
	T_IS_FLAMMABLE					: Fl(10),		// terrain can catch fire
	T_IS_FIRE								: Fl(11),		// terrain is a type of fire; ignites neighboring flammable cells
	T_ENTANGLES							: Fl(12),		// entangles players and monsters like a spiderweb
	T_IS_DEEP_WATER					: Fl(13),		// steals items 50% of the time and moves them around randomly
	T_CAUSES_DAMAGE					: Fl(14),		// anything on the tile takes max(1-2, 10%) damage per turn
	T_CAUSES_NAUSEA					: Fl(15),		// any creature on the tile becomes nauseous
	T_CAUSES_PARALYSIS			: Fl(16),		// anything caught on this tile is paralyzed
	T_CAUSES_CONFUSION			: Fl(17),		// causes creatures on this tile to become confused
  T_CAUSES_HEALING   	    : Fl(18),   // heals 20% max HP per turn for any player or non-inanimate monsters
	T_IS_DF_TRAP						: Fl(19),		// spews gas of type specified in fireType when stepped on
	T_CAUSES_EXPLOSIVE_DAMAGE		: Fl(20),		// is an explosion; deals higher of 15-20 or 50% damage instantly, but not again for five turns
  T_SACRED                : Fl(21),   // monsters that aren't allies of the player will avoid stepping here

	T_OBSTRUCTS_SCENT				: ['T_OBSTRUCTS_PASSABILITY', 'T_OBSTRUCTS_VISION', 'T_AUTO_DESCENT', 'T_LAVA_INSTA_DEATH', 'T_IS_DEEP_WATER', 'T_SPONTANEOUSLY_IGNITES'],
	T_PATHING_BLOCKER				: ['T_OBSTRUCTS_PASSABILITY', 'T_AUTO_DESCENT', 'T_IS_DF_TRAP', 'T_LAVA_INSTA_DEATH', 'T_IS_DEEP_WATER', 'T_IS_FIRE', 'T_SPONTANEOUSLY_IGNITES'],
  T_DIVIDES_LEVEL       	: ['T_OBSTRUCTS_PASSABILITY', 'T_AUTO_DESCENT', 'T_IS_DF_TRAP', 'T_LAVA_INSTA_DEATH', 'T_IS_DEEP_WATER'],
	T_LAKE_PATHING_BLOCKER	: ['T_AUTO_DESCENT', 'T_LAVA_INSTA_DEATH', 'T_IS_DEEP_WATER', 'T_SPONTANEOUSLY_IGNITES'],
	T_WAYPOINT_BLOCKER			: ['T_OBSTRUCTS_PASSABILITY', 'T_AUTO_DESCENT', 'T_IS_DF_TRAP', 'T_LAVA_INSTA_DEATH', 'T_IS_DEEP_WATER', 'T_SPONTANEOUSLY_IGNITES'],
	T_MOVES_ITEMS						: ['T_IS_DEEP_WATER', 'T_LAVA_INSTA_DEATH'],
	T_CAN_BE_BRIDGED				: ['T_AUTO_DESCENT'],
	T_OBSTRUCTS_EVERYTHING	: ['T_OBSTRUCTS_PASSABILITY', 'T_OBSTRUCTS_VISION', 'T_OBSTRUCTS_ITEMS', 'T_OBSTRUCTS_GAS', 'T_OBSTRUCTS_SURFACE_EFFECTS', 'T_OBSTRUCTS_DIAGONAL_MOVEMENT'],
	T_HARMFUL_TERRAIN				: ['T_CAUSES_POISON', 'T_IS_FIRE', 'T_CAUSES_DAMAGE', 'T_CAUSES_PARALYSIS', 'T_CAUSES_CONFUSION', 'T_CAUSES_EXPLOSIVE_DAMAGE'],
  T_RESPIRATION_IMMUNITIES  : ['T_CAUSES_DAMAGE', 'T_CAUSES_CONFUSION', 'T_CAUSES_PARALYSIS', 'T_CAUSES_NAUSEA'],
});


FLAG('terrainMechanicalFlagCatalog', {
  TM_IS_SECRET							: Fl(0),		// successful search or being stepped on while visible transforms it into discoverType
	TM_PROMOTES_WITH_KEY			: Fl(1),		// promotes if the key is present on the tile (in your pack, carried by monster, or lying on the ground)
	TM_PROMOTES_WITHOUT_KEY		: Fl(2),		// promotes if the key is NOT present on the tile (in your pack, carried by monster, or lying on the ground)
	TM_PROMOTES_ON_STEP				: Fl(3),		// promotes when a creature, player or item is on the tile (whether or not levitating)
	TM_PROMOTES_ON_ITEM_PICKUP		: Fl(4),		// promotes when an item is lifted from the tile (primarily for altars)
	TM_PROMOTES_ON_PLAYER_ENTRY		: Fl(5),		// promotes when the player enters the tile (whether or not levitating)
	TM_PROMOTES_ON_SACRIFICE_ENTRY: Fl(6),		// promotes when the sacrifice target enters the tile (whether or not levitating)
  TM_PROMOTES_ON_ELECTRICITY    : Fl(7),    // promotes when hit by a lightning bolt
	TM_ALLOWS_SUBMERGING					: Fl(8),		// allows submersible monsters to submerge in this terrain
	TM_IS_WIRED										: Fl(9),		// if wired, promotes when powered, and sends power when promoting
  TM_IS_CIRCUIT_BREAKER 				: Fl(10),        // prevents power from circulating in its machine
	TM_GAS_DISSIPATES							: Fl(11),		// does not just hang in the air forever
	TM_GAS_DISSIPATES_QUICKLY			: Fl(12),		// dissipates quickly
	TM_EXTINGUISHES_FIRE					: Fl(13),		// extinguishes burning terrain or creatures
	TM_VANISHES_UPON_PROMOTION		: Fl(14),		// vanishes when creating promotion dungeon feature, even if the replacement terrain priority doesn't require it
  TM_REFLECTS_BOLTS           	: Fl(15),       // magic bolts reflect off of its surface randomly (similar to pmap flag IMPREGNABLE)
  TM_STAND_IN_TILE            	: Fl(16),		// earthbound creatures will be said to stand "in" the tile, not on it
  TM_LIST_IN_SIDEBAR          	: Fl(17),       // terrain will be listed in the sidebar with a description of the terrain type
  TM_VISUALLY_DISTINCT        	: Fl(18),       // terrain will be color-adjusted if necessary so the character stands out from the background
  TM_BRIGHT_MEMORY            	: Fl(19),       // no blue fade when this tile is out of sight
  TM_EXPLOSIVE_PROMOTE        	: Fl(20),       // when burned, will promote to promoteType instead of burningType if surrounded by tiles with T_IS_FIRE or TM_EXPLOSIVE_PROMOTE
  TM_CONNECTS_LEVEL           	: Fl(21),       // will be treated as passable for purposes of calculating level connectedness, irrespective of other aspects of this terrain layer
  TM_INTERRUPT_EXPLORATION_WHEN_SEEN : Fl(22),    // will generate a message when discovered during exploration to interrupt exploration
  TM_INVERT_WHEN_HIGHLIGHTED  	: Fl(23),       // will flip fore and back colors when highlighted with pathing
  TM_SWAP_ENCHANTS_ACTIVATION 	: Fl(24),       // in machine, swap item enchantments when two suitable items are on this terrain, and activate the machine when that happens
});

ENUM('statusEffects',
	'STATUS_SEARCHING',	// 1.7.5
  'STATUS_DONNING',
	'STATUS_WEAKENED',
	'STATUS_TELEPATHIC',
	'STATUS_HALLUCINATING',
	'STATUS_LEVITATING',
	'STATUS_SLOWED',
	'STATUS_HASTED',
	'STATUS_CONFUSED',
	'STATUS_BURNING',
	'STATUS_PARALYZED',
	'STATUS_POISONED',
	'STATUS_STUCK',
	'STATUS_NAUSEOUS',
	'STATUS_DISCORDANT',
	'STATUS_IMMUNE_TO_FIRE',
	'STATUS_EXPLOSION_IMMUNITY',
	'STATUS_NUTRITION',
	'STATUS_ENTERS_LEVEL_IN',
	'STATUS_MAGICAL_FEAR',
	'STATUS_ENTRANCED',
	'STATUS_DARKNESS',
	'STATUS_LIFESPAN_REMAINING',
	'STATUS_SHIELDED',
  'STATUS_INVISIBLE',
  'STATUS_AGGRAVATING',
	'NUMBER_OF_STATUS_EFFECTS',
);

const statusStrings = [
	"Searching",	// 1.7.5
	"Donning Armor",
	"Weakened: -",
	"Telepathic",
	"Hallucinating",
	"Levitating",
	"Slowed",
	"Hasted",
	"Confused",
	"Burning",
	"Paralyzed",
	"Poisoned",
	"Stuck",
	"Nauseous",
	"Discordant",
	"Immune to Fire",
	"", // STATUS_EXPLOSION_IMMUNITY,
	"", // STATUS_NUTRITION,
	"", // STATUS_ENTERS_LEVEL_IN,
	"Frightened",
	"Entranced",
	"Darkened",
	"Lifespan",
	"Shielded",
	"Invisible",
	"", // STATUS_AGGRAVATING
];


const hallucinationStrings = [
	"     (Dancing)      ",
	"     (Singing)      ",
	"  (Pontificating)   ",
	"     (Skipping)     ",
	"     (Spinning)     ",
	"      (Crying)      ",
	"     (Laughing)     ",
	"     (Humming)      ",
	"    (Whistling)     ",
	"    (Quivering)     ",
	"    (Muttering)     ",
	"    (Gibbering)     ",
	"     (Giggling)     ",
	"     (Moaning)      ",
	"    (Shrieking)     ",
	"   (Caterwauling)   ",
];




FLAG('hordeFlags', {
	HORDE_DIES_ON_LEADER_DEATH		: Fl(0),	// if the leader dies, the horde will die instead of electing new leader
	HORDE_IS_SUMMONED				: Fl(1),	// minions summoned when any creature is the same species as the leader and casts summon
  HORDE_SUMMONED_AT_DISTANCE      : Fl(2),    // summons will appear across the level, and will naturally path back to the leader
	HORDE_LEADER_CAPTIVE			: Fl(3),	// the leader is in chains and the followers are guards
	HORDE_NO_PERIODIC_SPAWN			: Fl(4),	// can spawn only when the level begins -- not afterwards
	HORDE_ALLIED_WITH_PLAYER		: Fl(5),

	HORDE_MACHINE_BOSS				: Fl(6),	// used in machines for a boss challenge
	HORDE_MACHINE_WATER_MONSTER		: Fl(7),	// used in machines where the room floods with shallow water
	HORDE_MACHINE_CAPTIVE			: Fl(8),	// powerful captive monsters without any captors
	HORDE_MACHINE_STATUE			: Fl(9),	// the kinds of monsters that make sense in a statue
	HORDE_MACHINE_TURRET			: Fl(10),	// turrets, for hiding in walls
	HORDE_MACHINE_MUD					: Fl(11),	// bog monsters, for hiding in mud
	HORDE_MACHINE_KENNEL			: Fl(12),	// monsters that can appear in cages in kennels
	HORDE_VAMPIRE_FODDER			: Fl(13),	// monsters that are prone to capture and farming by vampires
	HORDE_MACHINE_LEGENDARY_ALLY	: Fl(14),	// legendary allies
  HORDE_NEVER_OOD             : Fl(15),   // Horde cannot be generated out of depth
  HORDE_MACHINE_THIEF         : Fl(16),   // monsters that can be generated in the key thief area machines
  HORDE_MACHINE_GOBLIN_WARREN : Fl(17),   // can spawn in goblin warrens
	HORDE_SACRIFICE_TARGET			: Fl(18),		// can be the target of an assassination challenge; leader will get scary light.

	HORDE_MACHINE_ONLY	: ['HORDE_MACHINE_BOSS', 'HORDE_MACHINE_WATER_MONSTER',
									  'HORDE_MACHINE_CAPTIVE', 'HORDE_MACHINE_STATUE',
									  'HORDE_MACHINE_TURRET', 'HORDE_MACHINE_MUD',
									  'HORDE_MACHINE_KENNEL', 'HORDE_VAMPIRE_FODDER',
									  'HORDE_MACHINE_LEGENDARY_ALLY', 'HORDE_MACHINE_THIEF',
                    'HORDE_MACHINE_GOBLIN_WARREN',
										'HORDE_SACRIFICE_TARGET'],
});


FLAG('monsterBehaviorFlags', {
	MONST_INVISIBLE					: Fl(0),	// monster is invisible
	MONST_INANIMATE					: Fl(1),	// monster has abbreviated stat bar display and is immune to many things
	MONST_IMMOBILE					: Fl(2),	// monster won't move or perform melee attacks
	MONST_CARRY_ITEM_100			: Fl(3),	// monster carries an item 100% of the time
	MONST_CARRY_ITEM_25				: Fl(4),	// monster carries an item 25% of the time
	MONST_ALWAYS_HUNTING			: Fl(5),	// monster is never asleep or in wandering mode
	MONST_FLEES_NEAR_DEATH			: Fl(6),	// monster flees when under 25% health and re-engages when over 75%
	MONST_ATTACKABLE_THRU_WALLS		: Fl(7),	// can be attacked when embedded in a wall
	MONST_DEFEND_DEGRADE_WEAPON		: Fl(8),	// hitting the monster damages the weapon
	MONST_IMMUNE_TO_WEAPONS			: Fl(9),	// weapons ineffective
	MONST_FLIES						: Fl(10),	// permanent levitation
	MONST_FLITS						: Fl(11),	// moves randomly a third of the time
	MONST_IMMUNE_TO_FIRE			: Fl(12),	// won't burn, won't die in lava
	MONST_CAST_SPELLS_SLOWLY		: Fl(13),	// takes twice the attack duration to cast a spell
	MONST_IMMUNE_TO_WEBS			: Fl(14),	// monster passes freely through webs
	MONST_REFLECT_4					: Fl(15),	// monster reflects projectiles as though wearing +4 armor of reflection
	MONST_NEVER_SLEEPS				: Fl(16),	// monster is always awake
	MONST_FIERY						: Fl(17),	// monster carries an aura of flame (but no automatic fire light)
	MONST_INVULNERABLE              : Fl(18),	// monster is immune to absolutely everything
	MONST_IMMUNE_TO_WATER			: Fl(19),	// monster moves at full speed in deep water and (if player) doesn't drop items
	MONST_RESTRICTED_TO_LIQUID		: Fl(20),	// monster can move only on tiles that allow submersion
	MONST_SUBMERGES					: Fl(21),	// monster can submerge in appropriate terrain
	MONST_MAINTAINS_DISTANCE		: Fl(22),	// monster tries to keep a distance of 3 tiles between it and player
	MONST_WILL_NOT_USE_STAIRS		: Fl(23),	// monster won't chase the player between levels
	MONST_DIES_IF_NEGATED			: Fl(24),	// monster will die if exposed to negation magic
	MONST_MALE						: Fl(25),	// monster is male (or 50% likely to be male if also has MONST_FEMALE)
	MONST_FEMALE					: Fl(26),	// monster is female (or 50% likely to be female if also has MONST_MALE)
  MONST_NOT_LISTED_IN_SIDEBAR     : Fl(27),   // monster doesn't show up in the sidebar
  MONST_GETS_TURN_ON_ACTIVATION   : Fl(28),   // monster never gets a turn, except when its machine is activated
  MONST_ALWAYS_USE_ABILITY        : Fl(29),   // monster will never fail to use special ability if eligible (no random factor)
  MONST_NO_POLYMORPH              : Fl(30),   // monster cannot result from a polymorph spell (liches, phoenixes and Warden of Yendor)

	NEGATABLE_TRAITS	: ['MONST_INVISIBLE', 'MONST_DEFEND_DEGRADE_WEAPON', 'MONST_IMMUNE_TO_WEAPONS', 'MONST_FLIES',
									   'MONST_FLITS', 'MONST_IMMUNE_TO_FIRE', 'MONST_REFLECT_4', 'MONST_FIERY', 'MONST_MAINTAINS_DISTANCE'],
	MONST_TURRET			: ['MONST_IMMUNE_TO_WEBS', 'MONST_NEVER_SLEEPS', 'MONST_IMMOBILE', 'MONST_INANIMATE',
									     'MONST_ATTACKABLE_THRU_WALLS', 'MONST_WILL_NOT_USE_STAIRS'],
	LEARNABLE_BEHAVIORS				: ['MONST_INVISIBLE', 'MONST_FLIES', 'MONST_IMMUNE_TO_FIRE', 'MONST_REFLECT_4'],
	MONST_NEVER_VORPAL_ENEMY	: ['MONST_INANIMATE', 'MONST_INVULNERABLE', 'MONST_IMMOBILE', 'MONST_RESTRICTED_TO_LIQUID', 'MONST_GETS_TURN_ON_ACTIVATION', 'MONST_MAINTAINS_DISTANCE'],
  MONST_NEVER_MUTATED       : ['MONST_INVISIBLE', 'MONST_INANIMATE', 'MONST_IMMOBILE', 'MONST_INVULNERABLE'],
});


FLAG('monsterAbilityFlags', {
	MA_HIT_HALLUCINATE		: Fl(0),	// monster can hit to cause hallucinations
	MA_HIT_STEAL_FLEE			: Fl(1),	// monster can steal an item and then run away
	MA_HIT_BURN						: Fl(2),	// monster can hit to set you on fire
	MA_ENTER_SUMMONS			: Fl(3),	// monster will "become" its summoned leader, reappearing when that leader is defeated
	MA_HIT_DEGRADE_ARMOR	: Fl(4),	// monster damages armor
	MA_CAST_SUMMON				: Fl(5),	// requires that there be one or more summon hordes with this monster type as the leader
	MA_SEIZES							: Fl(6),	// monster seizes enemies before attacking
	MA_POISONS						: Fl(7),	// monster's damage is dealt in the form of poison
	MA_DF_ON_DEATH				: Fl(8),	// monster spawns its DF when it dies
	MA_CLONE_SELF_ON_DEFEND	: Fl(9),	// monster splits in two when struck
	MA_KAMIKAZE						: Fl(10),	// monster dies instead of attacking
	MA_TRANSFERENCE				: Fl(11),	// monster recovers 40 or 90% of the damage that it inflicts as health
	MA_CAUSES_WEAKNESS		: Fl(12),	// monster attacks cause weakness status in target
  MA_ATTACKS_PENETRATE     : Fl(13),   // monster attacks all adjacent enemies, like an axe
  MA_ATTACKS_ALL_ADJACENT  : Fl(14),   // monster attacks penetrate one layer of enemies, like a spear
  MA_ATTACKS_EXTEND        : Fl(15),   // monster attacks from a distance in a cardinal direction, like a whip
	MA_ATTACKS_STAGGER			 : Fl(16),	 // monster attacks will push the player backward by one space if there is room
  MA_AVOID_CORRIDORS       : Fl(17),   // monster will avoid corridors when hunting

	SPECIAL_HIT						: ['MA_HIT_HALLUCINATE', 'MA_HIT_STEAL_FLEE', 'MA_HIT_DEGRADE_ARMOR', 'MA_POISONS', 'MA_TRANSFERENCE', 'MA_CAUSES_WEAKNESS', 'MA_HIT_BURN', 'MA_ATTACKS_STAGGER'],
	LEARNABLE_ABILITIES		: ['MA_TRANSFERENCE', 'MA_CAUSES_WEAKNESS'],

  MA_NON_NEGATABLE_ABILITIES      : ['MA_ATTACKS_PENETRATE', 'MA_ATTACKS_ALL_ADJACENT', 'MA_ATTACKS_EXTEND', 'MA_ATTACKS_STAGGER'],
  MA_NEVER_VORPAL_ENEMY           : ['MA_KAMIKAZE'],
  MA_NEVER_MUTATED                : ['MA_KAMIKAZE'],
});


FLAG('monsterBookkeepingFlags', {
	MB_WAS_VISIBLE				: Fl(0),	// monster was visible to player last turn
	MB_TELEPATHICALLY_REVEALED  : Fl(1),    // player can magically see monster and adjacent cells
	MB_PREPLACED                : Fl(2),	// monster dropped onto the level and requires post-processing
	MB_APPROACHING_UPSTAIRS		: Fl(3),	// following the player up the stairs
	MB_APPROACHING_DOWNSTAIRS	: Fl(4),	// following the player down the stairs
	MB_APPROACHING_PIT	: Fl(5),	// following the player down a pit
	MB_LEADER						: Fl(6),	// monster is the leader of a horde
	MB_FOLLOWER					: Fl(7),	// monster is a member of a horde
	MB_CAPTIVE					: Fl(8),	// monster is all tied up
	MB_SEIZED						: Fl(9),	// monster is being held
	MB_SEIZING					: Fl(10),	// monster is holding another creature immobile
	MB_SUBMERGED				: Fl(11),	// monster is currently submerged and hence invisible until it attacks
	MB_JUST_SUMMONED		: Fl(12),	// used to mark summons so they can be post-processed
	MB_WILL_FLASH				: Fl(13),	// this monster will flash as soon as control is returned to the player
	MB_BOUND_TO_LEADER	: Fl(14),	// monster will die if the leader dies or becomes separated from the leader
	MB_MARKED_FOR_SACRIFICE 	: Fl(15),		// scary glow, monster can be sacrificed in the appropriate machine
	MB_ABSORBING							: Fl(16),	// currently learning a skill by absorbing an enemy corpse
	MB_DOES_NOT_TRACK_LEADER	: Fl(17),	// monster will not follow its leader around
	MB_IS_FALLING							: Fl(18),	// monster is plunging downward at the end of the turn
	MB_IS_DYING								: Fl(19),	// monster has already been killed and is awaiting the end-of-turn graveyard sweep (or in purgatory)
	MB_GIVEN_UP_ON_SCENT			: Fl(20),	// to help the monster remember that the scent map is a dead end
	MB_IS_DORMANT							: Fl(21),	// lurking, waiting to burst out
  MB_HAS_SOUL               : Fl(22),   // slaying the monster will count toward weapon auto-ID
  MB_ALREADY_SEEN           : Fl(23),   // seeing this monster won't interrupt exploration
});


// Defines all creatures, which include monsters and the player:
function creatureType(id, name, ch, fg, hp, def, acc, dmg, regen, move, attack, blood, light, chance, feature, bolts, flags, abilities) {
	dmg = dmg || [];
	return {
		/* ENUM monsterTypes */ monsterID: id || 0, // index number for the monsterCatalog
		monsterName: STRING(name || ''), // [COLS];
		displayChar: ch || '',
		foreColor: fg || null,
		maxHP: hp || 0,
		defense: def || 0,
		accuracy: acc || 0,
		damage: randomRange(dmg),
		turnsBetweenRegen: regen || 0,		// turns to wait before regaining 1 HP
		movementSpeed: move || 0,
		attackSpeed: attack || 0,
		/* ENUM dungeonFeatureTypes */ bloodType: blood || 0,
		/* ENUM lightType */ intrinsicLightType: light || 0,
		DFChance: chance || 0,						// percent chance to spawn the dungeon feature per awake turn
		/* ENUM dungeonFeatureTypes */ DFType: feature || 0,	// kind of dungeon feature
	  /* ENUM boltType */ bolts: bolts || [], // [20];
		flags: flags || 0,
		abilityFlags: abilities || 0,
	};
}


function monsterWords(flavor, absorb, status, attacks, feature, summon) {
	return {
		flavorText: flavor || '', // [COLS*5];
		absorbing: absorb || '', // [40];
		absorbStatus: status || '', // [40];
		attack: attacks || [], // [5][30];
		DFMessage: feature || '', // [DCOLS * 2];
		summonMessage: summon || '', // [DCOLS * 2];
	};
}


ENUM('creatureStates',
	'MONSTER_SLEEPING',
	'MONSTER_TRACKING_SCENT',
	'MONSTER_WANDERING',
	'MONSTER_FLEEING',
	'MONSTER_ALLY',
);

ENUM('creatureModes',
	'MODE_NORMAL',
	'MODE_PERM_FLEEING'
);


function mutation(name, fg, hp, move, attack, def, dmg, chance, feature, light, flags, abilities, noFlags, noAbilities, desc) {
	return {
    title: name || '', // [100];
    textColor: fg || null,
    healthFactor: hp || 0,
    moveSpeedFactor: move || 0,
    attackSpeedFactor: attack || 0,
    defenseFactor: def || 0,
    damageFactor: dmg || 0,
    DFChance: chance || 0,
    /* ENUM dungeonFeatureTypes */ DFType: feature || 0,
    /* ENUM lightType */ light: light || 0,
    monsterFlags: flags || 0,
    monsterAbilityFlags: abilities || 0,
    forbiddenFlags: noFlags || 0,
    forbiddenAbilityFlags: noAbilities || 0,
    description: desc || '', // [1000];
	};
}


function hordeType(leader, count, types, number, minLevel, maxLevel, freq, spawn, machine, flags) {
	number = number || [];
	return {
		/* ENUM monsterTypes */ leaderType: leader || 0,

		// membership information
		numberOfMemberTypes: count || 0,
		/* ENUM monsterTypes */ memberType: types || [],	// [5]
		memberCount: number.map( (v) => randomRange(v) ), // randomRange[5];

		// spawning information
		minLevel: minLevel || 0,
		maxLevel: maxLevel || 0,
		frequency: freq || 0,
		/* ENUM tileType */ spawnsIn: spawn || 0,
		machine: machine || 0,

		/* ENUM hordeFlags */ flags: flags || 0,
	};
}


function monsterClass(name, freq, depth, members) {
	return {
    name: name || '', // [30];
    frequency: freq || 0,
    maxDepth: depth || 0,
    /* ENUM monsterTypes */ memberList: members || [], // [15];
	};
}


function creature() {
	return {
		/* creatureType */ info: creatureType(),
		xLoc: 0,
		yLoc: 0,
		depth: 0,
		currentHP: 0,
		turnsUntilRegen: 0,
		regenPerTurn: 0,					// number of HP to regenerate every single turn
		weaknessAmount: 0,				// number of points of weakness that are inflicted by the weakness status
    poisonAmount: 0,                 // number of points of damage per turn from poison
		/* ENUM creatureStates */ creatureState: 0,	// current behavioral state
		/* ENUM creatureModes */ creatureMode: 0,	// current behavioral mode (higher-level than state)

    mutationIndex: -1,                // what mutation the monster has (or -1 for none)

    // Waypoints:
    targetWaypointIndex: 0,          // the index number of the waypoint we're pathing toward
    waypointAlreadyVisited: [], // [MAX_WAYPOINT_COUNT]; // checklist of waypoints
    lastSeenPlayerAt: [], // [2];          // last location at which the monster hunted the player

    targetCorpseLoc: [], // [2];			// location of the corpse that the monster is approaching to gain its abilities
		targetCorpseName: STRING(), // char[30];			// name of the deceased monster that we're approaching to gain its abilities
		absorptionFlags: 0,		// ability/behavior flags that the monster will gain when absorption is complete
		absorbBehavior: false,				// above flag is behavior instead of ability (ignored if absorptionBolt is set)
	  absorptionBolt: 0,               // bolt index that the monster will learn to cast when absorption is complete
		corpseAbsorptionCounter: 0,		// used to measure both the time until the monster stops being interested in the corpse,
											// and, later, the time until the monster finishes absorbing the corpse.
		mapToMe: null,					// if a pack leader, this is a periodically updated pathing map to get to the leader
		safetyMap: null,					// fleeing monsters store their own safety map when out of player FOV to avoid omniscience
		ticksUntilTurn: 0,				// how long before the creature gets its next move

		// Locally cached statistics that may be temporarily modified:
		movementSpeed: 0,
		attackSpeed: 0,

		previousHealthPoints: 0,			// remembers what your health proportion was at the start of the turn
		turnsSpentStationary: 0,			// how many (subjective) turns it's been since the creature moved between tiles
		flashStrength: 0,				// monster will flash soon; this indicates the percent strength of flash
		flashColor: color(),					// the color that the monster will flash
		status: [], // [NUMBER_OF_STATUS_EFFECTS];
		maxStatus: [], // [NUMBER_OF_STATUS_EFFECTS]; // used to set the max point on the status bars
		bookkeepingFlags: 0,
		spawnDepth: 0,					// keep track of the depth of the machine to which they relate (for activation monsters)
	  machineHome: 0,                  // monsters that spawn in a machine keep track of the machine number here (for activation monsters)
		xpxp: 0,							// exploration experience (used to time telepathic bonding for allies)
		newPowerCount: 0,                // how many more times this monster can absorb a fallen monster
	  totalPowerCount: 0,              // how many times has the monster been empowered? Used to recover abilities when negated.
		/* struct creature */ leader: null,			// only if monster is a follower
		/* struct creature */ carriedMonster: null,	// when vampires turn into bats, one of the bats restores the vampire when it dies
		/* struct creature */ nextCreature: null,
		/* struct item */ carriedItem: null,			// only used for monsters
	};
}


ENUM('NGCommands',
	'NG_NOTHING',
	'NG_NEW_GAME',
	'NG_NEW_GAME_WITH_SEED',
	'NG_OPEN_GAME',
	'NG_VIEW_RECORDING',
	'NG_HIGH_SCORES',
  'NG_SCUM',
	'NG_QUIT',
);

ENUM('featTypes',
  'FEAT_PURE_MAGE',
  'FEAT_PURE_WARRIOR',
  'FEAT_PACIFIST',
  'FEAT_ARCHIVIST',
  'FEAT_COMPANION',
  'FEAT_SPECIALIST',
  'FEAT_JELLYMANCER',
  'FEAT_INDOMITABLE',
  'FEAT_MYSTIC',
  'FEAT_DRAGONSLAYER',
  'FEAT_PALADIN',
  'FEAT_COUNT',
);


// these are basically global variables pertaining to the game state and player's unique variables:
function playerCharacter() {
	return {
		depthLevel: 0,					// which dungeon level are we on
	  deepestLevel: 0,
		disturbed: false,					// player should stop auto-acting
		gameHasEnded: false,				// stop everything and go to death screen
		highScoreSaved: false,				// so that it saves the high score only once
		blockCombatText: false,			// busy auto-fighting
		autoPlayingLevel: false,			// seriously, don't interrupt
		automationActive: false,			// cut some corners during redraws to speed things up
		justRested: false,					// previous turn was a rest -- used in stealth
		justSearched: false,				// previous turn was a search -- used in manual searches
		cautiousMode: false,				// used to prevent careless deaths caused by holding down a key
		receivedLevitationWarning: false,	// only warn you once when you're hovering dangerously over liquid
		updatedSafetyMapThisTurn: false,	// so it's updated no more than once per turn
		updatedAllySafetyMapThisTurn: false,	// so it's updated no more than once per turn
		updatedMapToSafeTerrainThisTurn: false,// so it's updated no more than once per turn
		updatedMapToShoreThisTurn: false,		// so it's updated no more than once per turn
		easyMode: false,					// enables easy mode
		inWater: false,					// helps with the blue water filter effect
		heardCombatThisTurn: false,		// so you get only one "you hear combat in the distance" per turn
		creaturesWillFlashThisTurn: false,	// there are creatures out there that need to flash before the turn ends
		staleLoopMap: false,				// recalculate the loop map at the end of the turn
		alreadyFell: false,				// so the player can fall only one depth per turn
		eligibleToUseStairs: false,		// so the player uses stairs only when he steps onto them
		trueColorMode: false,				// whether lighting effects are disabled
	  displayAggroRangeMode: false,      // whether your stealth range is displayed
	  // warningPauseMode: false,	// 1.7.4
		quit: false,						// to skip the typical end-game theatrics when the player quits
		seed: 0,					// the master seed for generating the entire dungeon
		RNG: 0,							// which RNG are we currently using
		gold: 0,					// how much gold we have
		goldGenerated: 0,		// how much gold has been generated on the levels, not counting gold held by monsters
		strength: 0,
		monsterSpawnFuse: 0,	// how much longer till a random monster spawns

		/* item */ weapon: null,
		/* item */ armor: null,
		/* item */ ringLeft: null,
		/* item */ ringRight: null,

	  /* flare */ flares: [],
	  flareCount: 0,
	  flareCapacity: 0,

	  /* creature */ yendorWarden: null,

		/* lightSource */ minersLight: lightSource(),
		minersLightRadius: 0,
		ticksTillUpdateEnvironment: 0,	// so that some periodic things happen in objective time
		scentTurnNumber: 0,		// helps make scent-casting work
		playerTurnNumber: 0,     // number of input turns in recording. Does not increment during paralysis.
	  absoluteTurnNumber: 0,   // number of turns since the beginning of time. Always increments.
		milliseconds: 0,			// milliseconds since launch, to decide whether to engage cautious mode
		xpxpThisTurn: 0,					// how many squares the player explored this turn
	  aggroRange: 0,                   // distance from which monsters will notice you

		// previousHealthPercent: 0,        // remembers what your health proportion was at the start of the turn,		// removed 1.7.5
	  previousPoisonPercent: 0,        // and your poison proportion, to display percentage alerts for each

		upLoc: [0, 0], // [2]						// upstairs location this level
		downLoc: [0, 0], // [2]					// downstairs location this level

		cursorLoc: [0, 0], // [2]					// used for the return key functionality
		/* creature */ lastTarget: null,				// to keep track of the last monster the player has thrown at or zapped
		rewardRoomsGenerated: 0,			// to meter the number of reward machines
		machineNumber: 0,				// so each machine on a level gets a unique number
		sidebarLocationList: ARRAY(ROWS*2, () => [0,0]), // [ROWS*2][2];	// to keep track of which location each line of the sidebar references

		// maps
		mapToShore: null,					// how many steps to get back to shore
		mapToSafeTerrain: null,			// so monsters can get to safety

		// recording info
		playbackMode: false,				// whether we're viewing a recording instead of playing
		currentTurnNumber: 0,	// how many turns have elapsed
		howManyTurns: 0,			// how many turns are in this recording
		howManyDepthChanges: 0,			// how many times the player changes depths
		playbackDelayPerTurn: 0,			// base playback speed; modified per turn by events
		playbackDelayThisTurn: 0,		// playback speed as modified
		playbackPaused: false,
		playbackFastForward: false,		// for loading saved games and such -- disables drawing and prevents pauses
		playbackOOS: false,				// playback out of sync -- no unpausing allowed
		playbackOmniscience: false,		// whether to reveal all the map during playback
		playbackBetweenTurns: false,		// i.e. waiting for a top-level input -- iff, permit playback commands
		nextAnnotationTurn: 0,	// the turn number during which to display the next annotation
		nextAnnotation: '', // [5000];			// the next annotation
		locationInAnnotationFile: 0, // how far we've read in the annotations file

		// metered items
		foodSpawned: 0,					// amount of nutrition units spawned so far this game
		lifePotionFrequency: 0,
	  lifePotionsSpawned: 0,
		strengthPotionFrequency: 0,
		enchantScrollFrequency: 0,

		// ring bonuses:
		clairvoyance: 0,
		stealthBonus: 0,
		regenerationBonus: 0,
		lightMultiplier: 0,
		awarenessBonus: 0,
		transference: 0,
		wisdomBonus: 0,
	  reaping: 0,

	  // feats:
	  featRecord: [], // bool[FEAT_COUNT];

	  // waypoints:
	  wpDistance: [], //short**[MAX_WAYPOINT_COUNT];
	  wpCount: 0,
	  wpCoordinates: [], // short[MAX_WAYPOINT_COUNT][2];
	  wpRefreshTicker: 0,

		// cursor trail:
		cursorPathIntensity: 0,
	  cursorMode: false,

		// What do you want to do, player -- play, play with seed, resume, recording, high scores or quit?
		/* ENUM NGCommands */ nextGame: 0,
		nextGamePath: '', // char[BROGUE_FILENAME_MAX];
		nextGameSeed: 0,
	};
}


// Stores the necessary info about a level so it can be regenerated:
function levelData() {

	const storage = GRID(DCOLS, DROWS, () => pcell() );

	return {
		visited: false,
		mapStorage: storage, // pcell[DCOLS][DROWS];
		items: null,	// item * => points to first item, use nextItem on that item to walk chain
		monsters: null, // creature * => points to first monster, use nextMonster on that monster to walk chain
		dormantMonsters: null, // creature * => see above.
	  scentMap: null,
		levelSeed: 0,
		upStairsLoc: [], // short[2];
		downStairsLoc: [], // short[2];
		playerExitedVia: [], // short[2];
		awaySince: 0,
	};
}


FLAG('machineFeatureFlags', {
	MF_GENERATE_ITEM				: Fl(0),	// feature entails generating an item (overridden if the machine is adopting an item)
	MF_OUTSOURCE_ITEM_TO_MACHINE	: Fl(1),	// item must be adopted by another machine
	MF_BUILD_VESTIBULE      : Fl(2),	// call this at the origin of a door room to create a new door guard machine there
	MF_ADOPT_ITEM						: Fl(3),	// this feature will take the adopted item (be it from another machine or a previous feature)
	MF_NO_THROWING_WEAPONS	: Fl(4),	// the generated item cannot be a throwing weapon
	MF_GENERATE_HORDE				: Fl(5),	// generate a monster horde that has all of the horde flags
	MF_BUILD_AT_ORIGIN			: Fl(6),	// generate this feature at the room entrance
	// unused                       : Fl(7),	//
	MF_PERMIT_BLOCKING			: Fl(8),	// permit the feature to block the map's passability (e.g. to add a locked door)
	MF_TREAT_AS_BLOCKING		: Fl(9),	// treat this terrain as though it blocks, for purposes of deciding whether it can be placed there
	MF_NEAR_ORIGIN					: Fl(10),	// feature must spawn in the rough quarter of tiles closest to the origin
	MF_FAR_FROM_ORIGIN			: Fl(11),	// feature must spawn in the rough quarter of tiles farthest from the origin
	MF_MONSTER_TAKE_ITEM		: Fl(12),	// the item associated with this feature (including if adopted) will be in possession of the horde leader that's generated
	MF_MONSTER_SLEEPING			: Fl(13),	// the monsters should be asleep when generated
  MF_MONSTER_FLEEING      : Fl(14),   // the monsters should be permanently fleeing when generated
	MF_EVERYWHERE						: Fl(15),	// generate the feature on every tile of the machine (e.g. carpeting)
	MF_ALTERNATIVE					: Fl(16),	// build only one feature that has this flag per machine; the rest are skipped
	MF_ALTERNATIVE_2				: Fl(17),	// same as MF_ALTERNATIVE, but provides for a second set of alternatives of which only one will be chosen
	MF_REQUIRE_GOOD_RUNIC		: Fl(18),	// generated item must be uncursed runic
	MF_MONSTERS_DORMANT			: Fl(19),	// monsters are dormant, and appear when a dungeon feature with DFF_ACTIVATE_DORMANT_MONSTER spawns on their tile
	// unused                       : Fl(20),	//
	MF_BUILD_IN_WALLS				: Fl(21),	// build in an impassable tile that is adjacent to the interior
	MF_BUILD_ANYWHERE_ON_LEVEL		: Fl(22),	// build anywhere on the level that is not inside the machine
	MF_REPEAT_UNTIL_NO_PROGRESS		: Fl(23),	// keep trying to build this feature set until no changes are made
	MF_IMPREGNABLE					: Fl(24),	// this feature's location will be immune to tunneling
	MF_IN_VIEW_OF_ORIGIN		: Fl(25),	// this feature must be in view of the origin
	MF_IN_PASSABLE_VIEW_OF_ORIGIN	: Fl(26),	// this feature must be in view of the origin, where "view" is blocked by pathing blockers
	MF_NOT_IN_HALLWAY				: Fl(27),	// the feature location must have a passableArcCount of <= 1
	MF_NOT_ON_LEVEL_PERIMETER			: Fl(28),	// don't build it in the outermost walls of the level
	MF_SKELETON_KEY					: Fl(29),	// if a key is generated or adopted by this feature, it will open all locks in this machine.
	MF_KEY_DISPOSABLE				: Fl(30),	// if a key is generated or adopted, it will self-destruct after being used at this current location.
});


function machineFeature(feature, tile, layer, count, minCount, item, kind, monster, space, horde, itemFlags, flags) {
	return {
		// terrain
		/* ENUM dungeonFeatureTypes */ featureDF: feature || 0,	// generate this DF at the feature location (0 for none)
		/* ENUM tileType */ terrain: tile || 0,				// generate this terrain tile at the feature location (0 for none)
		/* ENUM dungeonLayers */ layer: layer || 0,			// generate the terrain tile in this layer

		instanceCountRange: count || [], // short[2];		// generate this range of instances of this feature
		minimumInstanceCount: minCount || 0,			// abort if fewer than this

		// items: these will be ignored if the feature is adopting an item
		itemCategory: item || 0,					// generate this category of item (or -1 for random)
		itemKind: kind || 0,						// generate this kind of item (or -1 for random)

		monsterID: monster || 0,					// generate a monster of this kind if MF_GENERATE_MONSTER is set

		personalSpace: space || 0,				// subsequent features must be generated more than this many tiles away from this feature
		hordeFlags: horde || 0,			// choose a monster horde based on this
		itemFlags: itemFlags || 0,			// assign these flags to the item
		flags: flags || 0,				// feature flags
	};
}


FLAG('blueprintFlags', {
	BP_ADOPT_ITEM         : Fl(0),	// the machine must adopt an item (e.g. a door key)
  BP_VESTIBULE          : Fl(1),    // spawns in a doorway (location must be given) and expands outward, to guard the room
	BP_PURGE_PATHING_BLOCKERS	: Fl(2),	// clean out traps and other T_PATHING_BLOCKERs
	BP_PURGE_INTERIOR			: Fl(3),	// clean out all of the terrain in the interior before generating the machine
	BP_PURGE_LIQUIDS			: Fl(4),	// clean out all of the liquids in the interior before generating the machine
	BP_SURROUND_WITH_WALLS		: Fl(5),	// fill in any impassable gaps in the perimeter (e.g. water, lava, brimstone, traps) with wall
	BP_IMPREGNABLE				: Fl(6),	// impassable perimeter and interior tiles are locked; tunneling bolts will bounce off harmlessly
	BP_REWARD							: Fl(7),	// metered reward machines
	BP_OPEN_INTERIOR			: Fl(8),	// clear out walls in the interior, widen the interior until convex or bumps into surrounding areas
  BP_MAXIMIZE_INTERIOR  : Fl(9),    // same as BP_OPEN_INTERIOR but expands the room as far as it can go, potentially surrounding the whole level.
	BP_ROOM								: Fl(10),	// spawns in a dead-end room that is dominated by a chokepoint of the given size (as opposed to a random place of the given size)
	BP_TREAT_AS_BLOCKING	: Fl(11),	// abort the machine if, were it filled with wall tiles, it would disrupt the level connectivity
	BP_REQUIRE_BLOCKING		: Fl(12),	// abort the machine unless, were it filled with wall tiles, it would disrupt the level connectivity
	BP_NO_INTERIOR_FLAG		: Fl(13),	// don't flag the area as being part of a machine
  BP_REDESIGN_INTERIOR  : Fl(14),   // nuke and pave -- delete all terrain in the interior and build entirely new rooms within the bounds
});


function blueprint(depth, size, freq, count, profile, flags, features) {
	depth = depth || [];
	size = size || [];
	features = features || [];
	count = count || 0;

	if (count != features.length) {
		console.warn('blueprint feature count != features array length');
		console.log(depth, size, freq, count, profile, flags, features);
		count = features.length;
	}

	return {
		depthRange: depth, // short[2];				// machine must be built between these dungeon depths
		roomSize: size, // short[2];					// machine must be generated in a room of this size
		frequency: freq || 0,					// frequency (number of tickets this blueprint enters in the blueprint selection raffle)
		featureCount: count || 0,					// how many different types of features follow (max of 20)
	  dungeonProfileType: profile || 0,           // if BP_REDESIGN_INTERIOR is set, which dungeon profile do we use?
		flags: flags || 0,				// blueprint flags
		feature: features.map( (v) => machineFeature(...v) ), // machineFeature[20];			// the features themselves
	};
}


ENUM('machineTypes',
  'MT_NONE',
	// Reward rooms:
	'MT_REWARD_MULTI_LIBRARY',
	'MT_REWARD_MONO_LIBRARY',
	'MT_REWARD_CONSUMABLES',
	'MT_REWARD_PEDESTALS_PERMANENT',
	'MT_REWARD_PEDESTALS_CONSUMABLE',
	'MT_REWARD_COMMUTATION_ALTARS',
	'MT_REWARD_RESURRECTION_ALTAR',
  'MT_REWARD_ADOPTED_ITEM',
	'MT_REWARD_DUNGEON',
	'MT_REWARD_KENNEL',
	'MT_REWARD_VAMPIRE_LAIR',
	'MT_REWARD_ASTRAL_PORTAL',
  'MT_REWARD_GOBLIN_WARREN',
  'MT_REWARD_SENTINEL_SANCTUARY',

  // Amulet holder:
  'MT_AMULET_AREA',

  // Door guard machines:
  'MT_LOCKED_DOOR_VESTIBULE',
  'MT_SECRET_DOOR_VESTIBULE',
  'MT_SECRET_LEVER_VESTIBULE',
	'MT_FLAMMABLE_BARRICADE_VESTIBULE',
	'MT_STATUE_SHATTERING_VESTIBULE',
	'MT_STATUE_MONSTER_VESTIBULE',
	'MT_THROWING_TUTORIAL_VESTIBULE',
  'MT_PIT_TRAPS_VESTIBULE',
  'MT_BECKONING_OBSTACLE_VESTIBULE',
  'MT_GUARDIAN_VESTIBULE',

	// Key guard machines:
	'MT_KEY_REWARD_LIBRARY',
	'MT_KEY_SECRET_ROOM',
	'MT_KEY_THROWING_TUTORIAL_AREA',
  'MT_KEY_RAT_TRAP_ROOM',
	'MT_KEY_FIRE_TRANSPORTATION_ROOM',
	'MT_KEY_FLOOD_TRAP_ROOM',
  'MT_KEY_FIRE_TRAP_ROOM',
  'MT_KEY_THIEF_AREA',
	'MT_KEY_COLLAPSING_FLOOR_AREA',
	'MT_KEY_PIT_TRAP_ROOM',
	'MT_KEY_LEVITATION_ROOM',
	'MT_KEY_WEB_CLIMBING_ROOM',
	'MT_KEY_LAVA_MOAT_ROOM',
	'MT_KEY_LAVA_MOAT_AREA',
	'MT_KEY_POISON_GAS_TRAP_ROOM',
	'MT_KEY_EXPLOSIVE_TRAP_ROOM',
	'MT_KEY_BURNING_TRAP_ROOM',
	'MT_KEY_STATUARY_TRAP_AREA',
  'MT_KEY_GUARDIAN_WATER_PUZZLE_ROOM',
  'MT_KEY_GUARDIAN_GAUNTLET_ROOM',
  'MT_KEY_GUARDIAN_CORRIDOR_ROOM',
	'MT_KEY_SACRIFICE_ROOM',	// 1.7.5
  'MT_KEY_SUMMONING_CIRCLE_ROOM',
  'MT_KEY_BECKONING_OBSTACLE_ROOM',
	'MT_KEY_WORM_TRAP_AREA',
	'MT_KEY_MUD_TRAP_ROOM',
  'MT_KEY_ELECTRIC_CRYSTALS_ROOM',
	'MT_KEY_ZOMBIE_TRAP_ROOM',
	'MT_KEY_PHANTOM_TRAP_ROOM',
  'MT_KEY_WORM_TUNNEL_ROOM',
	'MT_KEY_TURRET_TRAP_ROOM',
	'MT_KEY_BOSS_ROOM',

	// Thematic machines:
	'MT_BLOODFLOWER_AREA',
  'MT_SHRINE_AREA',
  'MT_IDYLL_AREA',
	'MT_SWAMP_AREA',
	'MT_CAMP_AREA',
	'MT_REMNANT_AREA',
	'MT_DISMAL_AREA',
	'MT_BRIDGE_TURRET_AREA',
	'MT_LAKE_PATH_TURRET_AREA',
  'MT_PARALYSIS_TRAP_AREA',
  'MT_PARALYSIS_TRAP_HIDDEN_AREA',
	'MT_TRICK_STATUE_AREA',
	'MT_WORM_AREA',
	'MT_SENTINEL_AREA',

	'NUMBER_BLUEPRINTS',
);


function autoGenerator(tile, layer, df, mach, reqTile, reqLiquid, minD, maxD, freq, int, slope, max) {
	return {
		// What spawns:
		/* ENUM tileType */ terrain: tile || 0,
		/* ENUM dungeonLayers */ layer: layer || 0,

		/* ENUM dungeonFeatureTypes */ DFType: df || 0,

		/* ENUM machineTypes */ machine: mach || 0, // Machine placement also respects BP_ placement flags in the machine blueprint

		// Parameters governing when and where it spawns:
		/* ENUM tileType */ requiredDungeonFoundationType: reqTile || 0,
		/* ENUM tileType */ requiredLiquidFoundationType: reqLiquid || 0,
		minDepth: minD || 0,
		maxDepth: maxD || 0,
		frequency: freq || 0,
		minNumberIntercept: int || 0, // actually intercept * 100
		minNumberSlope: slope || 0, // actually slope * 100
		maxNumber: max || 0,
	};
}


// const NUMBER_AUTOGENERATORS = 49;

function feat(name, desc, value) {
	return {
		name: name || '', // char[100];
    description: desc || '', // char[200];
    initialValue: value || false,
	};
}



const PDS_FORBIDDEN   = -1;
const PDS_OBSTRUCTION = -2;
function PDS_CELL(map, x, y) {
	return (map.links[x + DCOLS * y]);
}

// function pdsLink() {
// 	return {};
// };
// function pdsMap() {
// 	return {};
// };


function brogueButton() {
	return {
		text: STRING(), // char[COLS*3];			// button label; can include color escapes
		x: 0,					// button's leftmost cell will be drawn at (x, y)
		y: 0,
		hotkey: [], // long[10];		// up to 10 hotkeys to trigger the button
		buttonColor: color(),			// background of the button; further gradient-ized when displayed
		opacity: 0,				// further reduced by 50% if not enabled
		symbol: [], // uchar[COLS];			// Automatically replace the nth asterisk in the button label text with
									// the nth character supplied here, if one is given.
									// (Primarily to display magic character and item symbols in the inventory display.)
		flags: 0,
	};
}


ENUM('buttonDrawStates',
	'BUTTON_NORMAL',
	'BUTTON_HOVER',
	'BUTTON_PRESSED',
);

FLAG('BUTTON_FLAGS', {
	B_DRAW					: Fl(0),
	B_ENABLED				: Fl(1),
	B_GRADIENT				: Fl(2),
	B_HOVER_ENABLED			: Fl(3),
	B_WIDE_CLICK_AREA		: Fl(4),
	B_KEYPRESS_HIGHLIGHT	: Fl(5),
});


function buttonState() {

	const dbuf = [];
	const rbuf = [];

	for(let i = 0; i < COLS; ++i) {
		const drow = dbuf[i] = [];
		const rrow = rbuf[i] = [];
		for(let j = 0; j < ROWS; ++j) {
			drow.push(cellDisplayBuffer());
			rrow.push(cellDisplayBuffer());
		}
	}

	return {
		// Indices of the buttons that are doing stuff:
		buttonFocused: 0,
		buttonDepressed: 0,

		// Index of the selected button:
		buttonChosen: 0,

		// The buttons themselves:
		buttonCount: 0,
		buttons: [], // brogueButton [50];

		// The window location, to determine whether a click is a cancelation:
		winX: 0,
		winY: 0,
		winWidth: 0,
		winHeight: 0,

		// Graphical buffers:
		dbuf, // cellDisplayBuffer [COLS][ROWS]; // Where buttons are drawn.
		rbuf, // cellDisplayBuffer [COLS][ROWS]; // Reversion screen state.
	};
}
