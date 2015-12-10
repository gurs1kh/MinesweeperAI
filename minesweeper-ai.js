/*
Manvir Singh
TCSS 435: AI
Final Project
*/

//this function's code was taken (and modified) from:
//http://stackoverflow.com/questions/6157929/how-to-simulate-a-mouse-click-using-javascript
function simulate(element, eventName, button) {
	function extend(destination, source) {
		for (var property in source)
		  destination[property] = source[property];
		return destination;
	}

	var eventMatchers = {
		'HTMLEvents': /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
		'MouseEvents': /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/
	}
	var defaultOptions = {
		pointerX: 0,
		pointerY: 0,
		button: 0,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		bubbles: true,
		cancelable: true
	}
    var options = extend(defaultOptions, arguments[2] || {});
    var oEvent, eventType = null;
	
	if (button == undefined) button = options.button;
	
    for (var name in eventMatchers) {
        if (eventMatchers[name].test(eventName)) { eventType = name; break; }
    }

    if (!eventType)
        throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');

    if (document.createEvent) {
        oEvent = document.createEvent(eventType);
        if (eventType == 'HTMLEvents') {
            oEvent.initEvent(eventName, options.bubbles, options.cancelable);
        } else {
            oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
            options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
            options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, button, element);
        }
        element.dispatchEvent(oEvent);
    } else {
        options.clientX = options.pointerX;
        options.clientY = options.pointerY;
        var evt = document.createEventObject();
        oEvent = extend(evt, options);
        element.fireEvent('on' + eventName, oEvent);
    }
    return element;
}

//simulates a click on the provided element (for right click, use button = 2)
function simulateClick(element, button) {
	simulate(element, "mousedown", button);
	simulate(element, "mouseup", button)
}

//sets up the AI
function setup() {
	if (!$('#solve-link')[0])
		$('#game-container').prepend('<span id="solve-link" style="color:blue;text-decoration:underline;cursor:pointer;">Solve</span> | ');
	$('#solve-link').on("click", solveGame);
}

//returns whether or not the game is over
function isGameOver() {
	return $(".facedead")[0] != undefined;
}

//returns whether or not the game is won
function isGameWon() {
	return $(".facewin")[0] != undefined;
}

//starts a new game
function newGame() {
	simulateClick($("#face")[0]);
}

//clicks the selected tile
function chooseTile(tile) {
	simulateClick(tile.div);
}

//places a flag on the selected tile
function placeFlag(tile) {
	simulateClick(tile.div, 2);
}

//retrieves the current state of the game board.
function getBoard() {
	var tiles = $.map($(".square").not(":hidden"), function(d) { 
		var position = d.id.split("_").map(function(s) { return parseInt(s); });
		var state = d.classList[1];
		return {
			flag: state == "bombflagged",
			value: (state.indexOf("open") > -1) ? parseInt(state.split("open")[1]) : -1,
			x: position[0],
			y: position[1],
			div: d
		};
	});
	var board = new Array();
	for (var i = 0; i < tiles.length; i++) {
		var tile = tiles[i];
		if (!board[tile.x]) board[tile.x] = new Array();
		board[tile.x][tile.y] = tile;
	}
	return board;
}

//returns all of tiles on the game board
function getTiles() {
	return getBoard().reduce(function(a, b) { return a.concat(b); })
					 .filter(function(d) { return d; });
}

//solves the game
function solveGame() {
	if (isGameWon() || isGameOver())
		newGame();
	if (getTiles().length == getBlankTiles().length) 
		pickRandomTile();
	while (!isGameWon() && !isGameOver()) {
		console.log(isGameOver(), isGameWon());
		if (!clearObviousTiles())
			if (!chooseMostLikelyTile())
				pickRandomTile();
	}
}

//picks a random tile
function pickRandomTile() {
	var tiles = getBlankTiles();
	chooseTile(tiles[Math.ceil(Math.random() * tiles.length)]);
}

//returns all neighbors of the provided tile
function getNeighbors(board, tile) {
	var neighbors = [];
	for (var i = tile.x - 1 || tile.x; i <= ((tile.x + 1 < board.length) ? tile.x + 1 : tile.x); i++) {
		for (var j = tile.y - 1 || tile.y; j <= ((tile.y + 1 < board[i].length) ? tile.y + 1 : tile.y); j++) {
			if (i != tile.x || j != tile.y)
				neighbors.push(board[i][j]);
		}
	}
	return neighbors;
}

//returns all blank neighbors of the provided tile
function getBlankNeighbors(board, tile) {
	return getNeighbors(board, tile).filter(function(d) { return d.value < 0 && !d.flag; });
}

//returns all flagged neighbors of the provided tile
function getFlagNeighbors(board, tile) {
	return getNeighbors(board, tile).filter(function(d) { return d.flag; });
}

//returns all numbered neighbors of the provided tile
function getNumberedNeighbors(board, tile) {
	return getNeighbors(board, tile).filter(function(d) { return d.value >= 0 && !d.flag; });
}

//returns all of the available tiles
function getBlankTiles() {
	return getTiles().filter(function(d) { return d.value < 0 && !d.flag; });
}

//returns all of the numbered tiles
function getNumberedTiles(board) {
	return getTiles(board).filter(function(d) { return d.value > 0; });
}

//attempts to solve the game as much as possible before probability is used
//returns true if any changes were made to the game
function clearObviousTiles() {
	var changed = false;
	var board = getBoard();
	var numbered = getNumberedTiles(board).sort(function(a, b) { return a.value - b.value; });
	for (var i = 0; i < numbered.length; i++) {
		board = getBoard();
		var blanks = getBlankNeighbors(board, numbered[i]);
		var flags = getFlagNeighbors(board, numbered[i]);
		var value = numbered[i].value - flags.length;
		if (value == 0) {
			for (var j = 0; j < blanks.length; j++) {
				changed = true;
				chooseTile(blanks[j]);
			}
		} else if (value == blanks.length) {
			for (var j = 0; j < blanks.length; j++) {
				changed = true;
				placeFlag(blanks[j]);
			}
		}
	}
	return changed;
}

//returns true if the provided tiles are neighbors
function areNeighbors(tile1, tile2) {
	return [tile1.x - 1, tile1.x, tile1.x + 1].indexOf(tile2.x) >= 0
		&& [tile1.y - 1, tile1.y, tile1.y + 1].indexOf(tile2.y) >= 0;
}

//return true if the provided i, j position contains a border tile
function isBorderTile(board, i, j) {
	if (board[i][j].value >= 0 || board[i][j].flag) return false;
	var up = false, down = false, left = false, right = false;
	if (i == 1) up = true;
	if (i == board.length - 1) down = true;
	if (j == 1) left = true;
	if (j == board[1].length - 1) right = true;
	return ((!up && board[i - 1][j].value >= 0) ||
			(!left && board[i][j - 1].value >= 0) ||
			(!down && board[i + 1][j].value >= 0) ||
			(!right && board[i][j + 1].value >= 0) ||
			(!up && !left && board[i - 1][j - 1].value >= 0) ||
			(!up && !right && board[i - 1][j + 1].value >= 0) ||
			(!down && !left && board[i + 1][j - 1].value >= 0) ||
			(!down && !right && board[i + 1][j + 1].value >= 0)
		   );
}

//returns all of the border tiles
function getBorderTiles(board) {
	if (!board) board = getBoard();
	return getBlankTiles().filter(function(d) { return isBorderTile(board, d.x, d.y); });
}

//calculates the distance between a and b
function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

//returns all of the border tiles organized by region
function getBorderTilesByRegion(board) {
	var borderTiles = getBorderTiles();
	var regions = new Array();
	var prev = borderTiles[0];
	var region = new Array();
	region.push(prev);
	borderTiles = borderTiles.slice(1);
	while(borderTiles.length > 0) {
		borderTiles.sort(function(a,b) {
			return distance(prev, a) - distance(prev, b);
		});
		if (!areNeighbors(prev, borderTiles[0])) {
			regions.push(region);
			region = new Array();
		}
		region.push(borderTiles[0]);
		prev = borderTiles[0];
		borderTiles = borderTiles.slice(1);
	}
	regions.push(region);
	return regions;
}

//returns the smallest border tile region
function getSmallestBorderTileRegion(board) {
	if (!board) board = getBoard();
	return getBorderTilesByRegion(board).sort(function(a, b) {
		return a.length - b.length;
	}).filter(function(d) { return d.length > 1; })[0];
}

//returns true if the board state is a valid one
function isValidBoard(board) {
	var numbered = getNumberedTiles(board);
	for (var i = 0; i < numbered.length; i++) {
		var blanks = getBlankNeighbors(board, numbered[i]);
		var flags = getFlagNeighbors(board, numbered[i]);
		var value = numbered[i].value - flags.length;
		if (value < 0) {
			return false;
		}
	}
	return true;
}

//returns all possible boards result from the placement of flags on the border tiles
function getPossibleBoards(board, borderTiles) {
	if (!board) board = getBoard();
	if (!borderTiles) borderTiles = getSmallestBorderTileRegion(board);
	if (borderTiles && borderTiles.length > 10) borderTiles.splice(9);
	var possibleBoards = new Array();
	var a;
	if (borderTiles && borderTiles.length > 0) {
		a = combine(borderTiles, 1);
		a.sort(function(a, b) { return b.length - a.length });
	}
	for (var i = 0; i < a.length; i++) {
		var board2 = JSON.parse(JSON.stringify(board));
		for (var j = 0; j < a[i].length; j++) {
			board2[a[i][j].x][a[i][j].y].flag = true;
		}
		if (isValidBoard(board2))
			possibleBoards.push(board2);
	}
	return possibleBoards;
}

//returns all possible permutations of the elements in an array (with min number of values for the permutations)
//code taken from http://stackoverflow.com/questions/5752002/find-all-possible-subset-combos-in-an-array
var combine = function(a, min) {
    var fn = function(n, src, got, all) {
        if (n == 0) {
            if (got.length > 0) {
                all[all.length] = got;
            }
            return;
        }
        for (var j = 0; j < src.length; j++) {
            fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
        }
        return;
    }
    var all = [];
    for (var i = min; i < a.length; i++) {
        fn(i, a, [], all);
    }
    all.push(a);
    return all;
}

//selects the border tile (from the smallest region) most likely not to contain a mine
function chooseMostLikelyTile() {
	var changed = false;
	var borderTiles = getSmallestBorderTileRegion();
	var possibleBoards = getPossibleBoards();
	var board = getBoard();
	for (var i = 0; i < borderTiles.length; i++) {
		var tile = borderTiles[i];
		tile.aValue = 0;
		board[tile.x][tile.y].aValue = 0;
		for (var j = 0; j < possibleBoards.length; j++) {
			if (possibleBoards[j][tile.x][tile.y].flag) {
				tile.aValue++;
				board[tile.x][tile.y].aValue++;
			}
		}
	}
	var aTiles = board.reduce(function(a, b) { return a.concat(b); })
					  .filter(function(d) { return d.aValue; });
	aTiles.sort(function(a,b) { return a.aValue - b.aValue; });
	if (aTiles[0]) changed = true;
	chooseTile(aTiles[0]);
	return changed;
}

setup();