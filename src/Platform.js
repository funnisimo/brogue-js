

var SCREEN = null;


function fillBg(css) {
    SCREEN.ctx.fillStyle = css || '#000';
    SCREEN.ctx.fillRect(
        0,
        0,
        SCREEN.canvas.width,
        SCREEN.canvas.height
    );
}


function plotChar(char, x, y, fr, fg, fb, br, bg, bb) {
  fr = Math.floor(fr * 2.55);
  fg = Math.floor(fg * 2.55);
  fb = Math.floor(fb * 2.55);
  br = Math.floor(br * 2.55);
  bg = Math.floor(bg * 2.55);
  bb = Math.floor(bb * 2.55);

  const backCss = `#${br.toString(16).padStart(2,'0')}${bg.toString(16).padStart(2,'0')}${bb.toString(16).padStart(2,'0')}`;

  const ctx = SCREEN.ctx;
  const tileSize = SCREEN.tileSize * SCREEN.devicePixelRatio;

  ctx.fillStyle = backCss;
  ctx.fillRect(
    x * tileSize,
    y * tileSize,
    tileSize,
    tileSize
  );

  if (char && char !== ' ') {
    const foreCss = `#${fr.toString(16).padStart(2,'0')}${fg.toString(16).padStart(2,'0')}${fb.toString(16).padStart(2,'0')}`;
    const textX = x * tileSize + tileSize * 0.5;  // TODO - offsetX
    const textY = y * tileSize + tileSize * 0.5;  // TODO - offsetY
    ctx.fillStyle = foreCss;

    ctx.fillText(
      char,
      textX,
      textY
    );
  }

}


function setFont(size, name) {
  SCREEN.font = name || SCREEN.font || 'monospace';
  SCREEN.ctx.font = (size * SCREEN.devicePixelRatio) + 'px ' + SCREEN.font;
  SCREEN.ctx.textAlign = 'center';
  SCREEN.ctx.textBaseline = 'middle';
}

var EVENTS_QUEUE = [];

async function handleEvents(handler) {
  let resolveFn = null;

  _pushHandler( (theEvent) => {
    handler(theEvent, (result) => {
      _popHandler();
      resolveFn(result);
    });
  });

  return new Promise( (resolve, reject) => {
    resolveFn = resolve;
  });
}

function _pushHandler(handler) {
  SCREEN.handlerStack.push(this.inputHandler);
  SCREEN.inputHandler = handler;
}

function _popHandler(theEvent) {
  SCREEN.inputHandler = SCREEN.handlerStack.pop() || handleSilentEvent;
  if (theEvent) {
    SCREEN.inputHandler(theEvent);
  }
}

function handleSilentEvent(theEvent) {
  if (EVENTS_QUEUE.length) {
    const lastEvent = EVENTS_QUEUE[EVENTS_QUEUE.length - 1];
    if (lastEvent.eventType === MOUSE_ENTERED_CELL) {
      lastEvent.copy(theEvent);
      return;
    }
  }
  EVENTS_QUEUE.push(theEvent);
}

function animationTimer(t) {
  requestAnimationFrame(animationTimer);

  if (SCREEN) {
    let i, j;

  	for (i=0; i<COLS; i++) {
  		for (j=0; j<ROWS; j++) {
  			if (displayBuffer[i][j].needsUpdate) {
  				plotChar(displayBuffer[i][j].char, i, j,
  						 displayBuffer[i][j].foreColorComponents[0],
  						 displayBuffer[i][j].foreColorComponents[1],
  						 displayBuffer[i][j].foreColorComponents[2],
  						 displayBuffer[i][j].backColorComponents[0],
  						 displayBuffer[i][j].backColorComponents[1],
  						 displayBuffer[i][j].backColorComponents[2]);
  				displayBuffer[i][j].needsUpdate = false;
  			}
  		}
  	}
  }
}


function handleKeyDownEvent(event) {
  let key = event.key;
  if(['Ctrl', 'Alt', 'Meta', 'Shift'].includes(key)) {
      key = event.code;
  }
  else {
    if (event.shiftKey) {
      key = key.toUpperCase();
    }
    if (event.metaKey) {
      key = '#' + key;
    }
    if (event.ctrlKey) {
      key = '^' + key;
    }
  }

  if (event.key === 'Escape' && EVENTS_QUEUE.length) {
    EVENTS_QUEUE.length = 0;
    console.log('Cleared Events queue.');
  }

  const theEvent = rogueEvent(KEYSTROKE, key, null, event.ctrlKey, event.shiftKey);
  theEvent.time = performance.now();
  if (SCREEN) {
    SCREEN.ctrlKey = event.ctrlKey;
    SCREEN.metaKey = event.metaKey;
    SCREEN.shiftKey = event.shiftKey;
    SCREEN.inputHandler(theEvent);
  }
  else {
    console.log('keypress', key);
  }
  event.preventDefault();
  return false;
}

function handleKeyUpEvent(event) {
  if (SCREEN) {
    SCREEN.ctrlKey = event.ctrlKey;
    SCREEN.metaKey = event.metaKey;
    SCREEN.shiftKey = event.shiftKey;
  }
  event.preventDefault();
}


function handleMouseEvent(e) {
  if (!SCREEN) {
    console.log(e.type, e.clientX, e.clientY);
    return;
  }

  let mouseX = Math.floor(e.clientX / SCREEN.mouseWidth);
  let mouseY = Math.floor(e.clientY / SCREEN.mouseHeight);

  if (e.type === 'mouseleave') {
    x = null;
    y = null;
  }

  const time = performance.now();

  if(e.type === 'click'){
    let theEvent = rogueEvent(MOUSE_DOWN, mouseX, mouseY);
    theEvent.time = time;
    SCREEN.inputHandler(theEvent);
    theEvent = rogueEvent(MOUSE_UP, mouseX, mouseY);
    theEvent.time = time;
    SCREEN.inputHandler(theEvent);
  }
  else {
    let theEvent = rogueEvent(MOUSE_ENTERED_CELL, mouseX, mouseY);
    theEvent.time = time;
    SCREEN.inputHandler(theEvent);
  }
}

function handleResizeEvent() {

  SCREEN.tileSize = Math.min(Math.floor(window.innerWidth / COLS), Math.floor(window.innerHeight / ROWS));
  const rect = SCREEN.canvas.getBoundingClientRect();
  SCREEN.mouseWidth = rect.width / COLS;
  SCREEN.mouseHeight = rect.height / ROWS;

  console.log('resize', window.innerWidth, window.innerHeight, SCREEN.tileSize, SCREEN.mouseWidth, SCREEN.mouseHeight);

  let width = COLS * SCREEN.tileSize;
  let height = ROWS * SCREEN.tileSize;

  const devicePixelRatio = window.devicePixelRatio || 1;
  if (devicePixelRatio !== 1) {
      SCREEN.canvas.style.width = width + 'px';
      SCREEN.canvas.style.height = height + 'px';

      width = Math.floor(width * devicePixelRatio);
      height = Math.floor(height * devicePixelRatio);
  }

  SCREEN.devicePixelRatio = devicePixelRatio;
  SCREEN.canvas.width = width;
  SCREEN.canvas.height = height;

  setFont(SCREEN.tileSize, SCREEN.font);
  fillBg('#000');

  for (let i=0; i<COLS; i++) {
		for (let j=0; j<ROWS; j++) {
			displayBuffer[i][j].needsUpdate = true;
    }
  }

}


async function pauseForMilliseconds( milliseconds, wantMouseMoves ) {

  while (EVENTS_QUEUE.length) {
    if (wantMouseMoves || (EVENTS_QUEUE[0].eventType != MOUSE_ENTERED_CELL) ) {
		    return true;  // interrupted
    }
    EVENTS_QUEUE.shift();
	}

	let resolveFn = null;
	let timeout = null;
	let interrupted = false;

	function complete() {
		_popHandler();
		if (interrupted) {
			clearTimeout(timeout);
		}
		resolveFn(interrupted || false);
	}

	timeout = setTimeout( complete, milliseconds );

	handleEvents( (e) => {
		if (e.eventType !== UPDATE && (wantMouseMoves || (e.eventType !== MOUSE_ENTERED_CELL)) ) {
			interrupted = true;
      EVENTS_QUEUE.push(e.clone()); // save the event
			complete();
		}
	});

	const p = new Promise( (resolve) => {
		resolveFn = resolve;
	});

	await p;

	return interrupted;
}


async function nextKeyOrMouseEvent(returnEvent, textInput, colorsDance) {

	let finished = false;

	if (EVENTS_QUEUE.length) {
		const e = EVENTS_QUEUE.shift();
		returnEvent.copy(e);
		return;
	}

	await handleEvents( (theEvent, done) => {
		if (theEvent.eventType === UPDATE) {
			if (colorsDance) {
				shuffleTerrainColors(3, true);
			}
			return;
		}

		if (finished) {
			// console.log('I need to queue this one!', theEvent.eventType);
			if (EVENTS_QUEUE.length) {
				const e = EVENTS_QUEUE[EVENTS_QUEUE.length - 1];	// last one
				if (e.eventType === theEvent.eventType && theEvent.eventType === MOUSE_ENTERED_CELL) {
					e.copy(theEvent);
					return;
				}
			}
			EVENTS_QUEUE.push(theEvent.clone());
			return;
		}
		// console.log('nextKeyOrMouseEvent', theEvent.eventType);
		finished = true;
		returnEvent.copy(theEvent);
		done();
	});

}

function controlKeyIsDown() {
  return SCREEN && SCREEN.ctrlKey;
}

var HIGH_SCORE_LIST = [];

function getHighScoresList( returnList /* rogueHighScoresEntry[HIGH_SCORES_COUNT] */) {
	let i, mostRecentLineNumber = 0;

  returnList.forEach( (e) => e.clear() );

  HIGH_SCORE_LIST.forEach( (e, i) => {
    if (i < returnList.length) {
      returnList[i].copy(e);
    }
  });

	return 0; // ??? mostRecentLineNumber;
}

function saveHighScore(entry) {
  const copy = Object.assign({}, entry);
  HIGH_SCORE_LIST.push(copy);
  HIGH_SCORE_LIST.sort((a, b) => b.score - a.score);
  return HIGH_SCORE_LIST.length;
}


function notifyEvent(/* short */ eventId, /* int */ data1, /* int */ data2, str1, str2) {
	// TODO - ????
}


async function launch() {

  document.addEventListener('keydown', handleKeyDownEvent);
  document.addEventListener('keyup', handleKeyUpEvent);
  window.addEventListener('resize', handleResizeEvent);

  const canvas = document.getElementById('game');
  canvas.addEventListener('mousemove', handleMouseEvent);
  canvas.addEventListener('mouseenter', handleMouseEvent);
  canvas.addEventListener('mouseleave', handleMouseEvent);
  canvas.addEventListener('click', handleMouseEvent);

  SCREEN = {
    canvas,
    tileSize: 16,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    ctx: canvas.getContext('2d'),
    inputHandler: handleSilentEvent,
    handlerStack: [],
    font: 'monospace',
    devicePixelRatio: window.devicePixelRatio
  }

  handleResizeEvent();
  requestAnimationFrame( animationTimer );

  await mainBrogueJunction();
}



window.onload = function() {
  // RL.Game.start(gameConfig);
  setTimeout( launch, 0 );
};




class BrogueString {
	constructor(value) {
  	this.text = value || '';
    this._textLength = -1;
  }

  get fullLength() { return this.text.length; }

  get length() {
    throw new Error('Convert to fullLength or textLength');
  }

  get textLength() {
    if (this._textLength > -1) return this._textLength;

		let length = 0;

  	for(let i = 0; i < this.text.length; ++i) {
    	const ch = this.text.charCodeAt(i);
      if (ch === COLOR_ESCAPE) {
          i += 3;	// skip color parts
      }
      else if (ch === COLOR_END) {
      		// skip
      }
      else {
      	++length;
      }
    }

		this._textLength = length;
    return this._textLength;
  }

  eachChar(callback) {
  	let color = null;
    const components = [100, 100, 100];
    let index = 0;

  	for(let i = 0; i < this.text.length; ++i) {
    	const ch = this.text.charCodeAt(i);
      if (ch === COLOR_ESCAPE) {
          components[0] = this.text.charCodeAt(i + 1) - COLOR_VALUE_INTERCEPT;
          components[1] = this.text.charCodeAt(i + 2) - COLOR_VALUE_INTERCEPT;
          components[2] = this.text.charCodeAt(i + 3) - COLOR_VALUE_INTERCEPT;
          color = colorFromComponents(components);
          i += 3;
      }
      else if (ch === COLOR_END) {
      	color = null;
      }
      else {
      	callback(this.text[i], color, index);
      	++index;
      }
    }

  }

  encodeColor(color, i) {
    let colorText;
  	if (!color) {
    	colorText = String.fromCharCode(COLOR_END);
    }
    else {
	  	colorText = String.fromCharCode(COLOR_ESCAPE, color.red + COLOR_VALUE_INTERCEPT, color.green + COLOR_VALUE_INTERCEPT, color.blue + COLOR_VALUE_INTERCEPT);
    }
    if (i == 0) {
      this.text = colorText;
    }
    else if (i < this.text.length) {
      this.splice(i, 4, colorText);
    }
    else {
      this.text += colorText;
    }
    return this;
  }

  setText(value) {
  	if (value instanceof BrogueString) {
    	this.text = value.text;
      this._textLength = value._textLength;
      return this;
    }

		this.text = value;
    this._textLength = -1;
    return this;
  }

  append(value) {
  	if (value instanceof BrogueString) {
    	this.text += value.text;
      this._textLength += value._textLength;
      return this;
    }

		this.text += value;
    this._textLength = -1;
    return this;
  }

	clear() {
  	this.text = '';
    this._textLength = 0;
    return this;
  }

  capitalize() {
  	if (!this.text.length) return;

    let index = 0;
    let ch = this.text.charCodeAt(index);
    while (ch === COLOR_ESCAPE) {
    	index += 4;
      ch = this.text.charCodeAt(index);
    }

		const preText = index ? this.text.substring(0, index) : '';
    this.text = preText + this.text[index].toUpperCase() + this.text.substring(index + 1);
		return this;
  }

	padStart(finalLength) {
		const diff = (finalLength - this.textLength);
		if (diff <= 0) return this;
		this.text = this.text.padStart(diff + this.text.length, ' ');
		this._textLength += diff;
		return this;
	}

	padEnd(finalLength) {
		const diff = (finalLength - this.textLength);
		if (diff <= 0) return this;
		this.text = this.text.padEnd(diff + this.text.length, ' ');
		this._textLength += diff;
		return this;
	}

	toString() {
		return this.text;
	}

	charAt(index) {
		return this.text.charAt(index);
	}

	charCodeAt(index) {
		return this.text.charCodeAt(index);
	}

	copy(other) {
		this.text = other.text;
		this._textLength = other._textLength;
		return this;
	}

	splice(begin, length, add) {
  	const preText = this.text.substring(0, begin);
    const postText = this.text.substring(begin + length);
		add = (add && add.text) ? add.text : (add || '');

    this.text = preText + add + postText;
    this._textLength = -1;
  }

  toString() {
    return this.text;
  }

}


// return a new string object
function STRING(text) {
	if (text instanceof BrogueString) return text;
	return new BrogueString(text);
}

function strlen(bstring) {
  if (!bstring) return 0;
  if (typeof bstring === 'string') return bstring.length;
	return bstring.fullLength;
}

function strcat(bstring, txt) {
	bstring.append(txt);
}

function strncat(bstring, txt, n) {
	txt = STRING(txt);
	bstring.append(txt.text.substring(0, n));
}

function sprintf(bstring, fmt, ...args) {

  const map = FORMAT_MAP;

  var replacer = function replacer(match, group1, group2, index) {
    // if (message.charAt(index - 1) == "%") {
    //   return match.substring(1);
    // }

    if (!args.length) {
      return match;
    }

    var obj = args[0];
    var group = group1 || group2;
    var parts = group.split(",");
    var name = parts.shift() || "";
    var method = map[name];

    if (!method) {
      // TODO - Need to check less than full length...
      // for instance %lucky should check:
      // lucky -> luck -> luc -> lu -> l -> FAIL
      return match;
    }

    let result;
    obj = args.shift();
    if (typeof method === 'function') {
      result = method(obj, ...parts);
    }
    else {
      result = '' + obj;
    }

    return result;
  };

  const txt = fmt.replace(/%(?:([\w]+)|(?:{([^}]+)}))/g, replacer);

  bstring.setText(txt);
}



FORMAT_MAP = {};

FORMAT_MAP['s'] = function(value) { return '' + value; }

FORMAT_MAP['i'] = function(value) {
  if (typeof value === 'number') return '' + Math.round(value);
  return '?';
}

FORMAT_MAP['d']  = FORMAT_MAP['i'];
FORMAT_MAP['li'] = FORMAT_MAP['i'];
FORMAT_MAP['lu'] = FORMAT_MAP['i'];
FORMAT_MAP['l']  = FORMAT_MAP['i'];
FORMAT_MAP['u']  = FORMAT_MAP['i'];
FORMAT_MAP['c']  = function(value) {
  if (!value) return '?';
  if (typeof value === 'number') { value = '' + number; }
  if (typeof value === 'string') { return value.length ? value[0] : '?'; }
  if (value.toString) {
    return value.toString()[0];
  }
  return '?';
}

FORMAT_MAP['f'] = function(value, decimals) {
  if (typeof value === 'number') {
    console.log('format float', value, decimals);
    if (decimals === undefined) {
      return '' + value;
    }

    return value.toFixed(decimals);
  }
  return '?';
}



function strncat(bstring, n, txt) {
	if (n !== bstring.fullLength) throw new Error('Rewrite this using strcat.');
  bstring.append(txt);
}

function strcpy(bstring, txt) {
	bstring.setText(txt);
}

function strcmp(a, b) {
	a = STRING(a);
	b = STRING(b);

	if (a.text == b.text) return 0;
	return (a.text < b.text) ? -1 : 1;
}


// function eachChar(bstring, callback) {
// 	bstring = STRING(bstring);
// 	return bstring.eachChar(callback);
// }
