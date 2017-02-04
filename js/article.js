function rand(min, max) 
{
	return Math.random() * (max-min) + min
}

var canvas
var context
var keyOn = []

// MOVEABLE //

var Movable = function (data) {
	if (data === undefined)
		return

	for (var i = 0; i < data.length; i++) {
		var setting = data[i]
		
		// By accessing 'this' (which refers to this very instance) as an array, we can set a new object-specific variable with the name of 'setting' to 'setting' its value
		this[setting[0]] = setting[1]
	}

	this.alive = true
}

Movable.prototype = {
	update: function () {
		if (this.alive) {
			this.move()
			this.draw()
		}
	},
	
	draw: function () {
		if (this.imageName || this.image) {
			this.animate()

		}
	},

	animate: function () {
		var image

		if (this.image) {
			image = this.image

		} else if (window.isFoodMode) {
			image = this.isGood ? window.loadedGoodFood[this.imageName] : window.loadedBadFood[this.imageName]
		} else {
			image = this.isGood ? window.loadedGoodLife[this.imageName] : window.loadedBadLife[this.imageName]
		}

    context.drawImage(image, this.x, this.y, this.width, this.height)
	}
}


// COUNTABLE //

var Countable = function () {
	this.x = 0
	this.y = 0
	
	this.speed = 2
	
	this.value = 0
	this.targetValue = 0
}

Countable.prototype = {
	update: function () 
	{
		this.move()
		this.draw()
	},
	
	change: function (amount) {
		this.targetValue += amount
	},
	
	move: function () {
		// The move routine should only be executed if the actual value is not identical to the target value
		if (this.value === this.targetValue)
			return
		
		// If the difference between the target and actual value is lower than the animation speed, set the value to the target value
		if (Math.abs(this.value - this.targetValue) < this.speed)
			this.value = this.targetValue
		else if (this.targetValue > this.value)
			this.value += this.speed
		else
			this.value -= this.speed
	}
}


// BASKET //

var Basket = function (data) {
	Movable.call(this, data)
	this.image = window.happyHowon
}

Basket.prototype = new Movable()
Basket.prototype.reset = function () {
	// Reset the position
	this.x = canvas.width / 2 - this.width / 2
	this.y = canvas.height - this.height

	this.image = window.happyHowon
	
}

Basket.prototype.move = function () {
	// 37 is the keycode representation of a left keypress
	if (keyOn[37])
		this.x -= this.xSpeed
	
	// 39 is the keycode representation of a right keypress
	if (keyOn[39])
		this.x += this.xSpeed

	// If the x co-ordinate is lower than 0, which is less than the outer left position of the canvas, move it back to the outer left position of the canvas 
	if (this.x < 0)
		this.x = 0

	// If the x co-ordinate plus the basket its width is greater than the canvas its width, move it back to the outer right position of the canvas
	if (this.x + this.width > canvas.width)
		this.x = canvas.width - this.width
}


var Block = function (data) {
	Movable.call(this, data)
	
	this.initPosition()
	this.initImage()
}

Block.prototype = new Movable()
Block.prototype.initPosition = function ()

{
	// Only allow to set the position of this block once
	if (this.x !== undefined || this.y !== undefined)
		return

	// By picking a rounded number between 0 and the canvas.width substracted by the block its width, we have a position for this block which is still inside the block its viewport
	this.x = Math.round(rand(0, canvas.width - this.width))
	
	// By setting the vertical position of the block to 0 substracted by the block its height, the block will look like it slides into the canvas its viewport
	this.y = 0 - this.height
}
Block.prototype.initImage = function () {
	// randomly choose between good and bad
	this.isGood = Math.random() < 0.5 ? true : false

	var names

	if (window.isFoodMode) {
		names = this.isGood ? window.goodFood : window.badFood
	} else {
		names = this.isGood ? window.goodLife : window.badLife
	}

	// get a random image name
	this.imageName = names[Math.floor(Math.random() * names.length)]

}

Block.prototype.move = function () {
	// Add the vertical speed to the block its current position to move it
	this.y += this.ySpeed
}


// HEALTH //

var Health = function () {
	Countable.call(this)
	
	this.x = canvas.width - 52 - 10
	this.y = 10
}

Health.prototype = new Countable()
Health.prototype.reset = function () {
	// If we would leave it at a default of 0, the game would immediately end as it equals a loss of the game
	this.value = 1
	this.targetValue = 100
}

Health.prototype.draw = function () {
	// The container
	context.fillStyle = '#fff'
	context.strokeRect(this.x, this.y, 50 + 2, 5 + 2)
	
	// The bar
	if (this.value >= 50)
		context.fillStyle = '#00ff00'
	else if (this.value >= 25)
		context.fillStyle = '#fa6600'
	else if (this.value >= 0)
		context.fillStyle = '#ff0000'
		
	context.fillRect(this.x + 1, this.y + 1, this.value * (50/100), 5)

	// The text
	context.fillStyle = '#000'
	context.textBaseline = 'top'
	context.fillText('HP', this.x - 25, this.y -3)
}


// SCORE //

var Score = function () {
	Countable.call(this)
	
	this.x = canvas.width - 52 - 10
	this.y = 10 + 7 + 5
}

Score.prototype = new Countable()

Score.prototype.reset = function ()  {
	this.value = this.targetValue = 0
}

Score.prototype.draw = function () {
	context.textBaseline = 'top'
	context.fillStyle = '#000'
	context.fillText(this.value, this.x, this.y)
	context.fillText('PT', this.x - 25, this .y)
}



Feeder = new function () {
	
	var basketData = [
		['width', 60],
		['height', 77],
		['xSpeed', 6],
	]
	var blockData = [
		['width', 30],
		['height', 30],
		['ySpeed', 2],
		['strength', 30]
	]
	
	var blocksPerLevel = 20
	var blocksSpawnSec = 0
	var blocksSpawned = 0
	var blocksOnScreen = 0
	var blocks = []
	
	var level
	var levelUp
	
	var basket
	var health
	var score
	
	var info
	var infoScreenChange = true
	
	var startTime
	var frameTime

	this.run = function (image) {
		// Set the global 'canvas' object to the #canvas DOM object to be able to access its width, height and other attributes are
		canvas = document.getElementById('canvas')
		
		// Set the local 'info' object to the #info DOM object
		info = document.getElementById('info')
		
		// This is where its all about getting a new instance of the C2A object — pretty simple huh?
		context = canvas.getContext('2d')
	
		// Add an eventListener for the global keydown event
		document.addEventListener('keydown', function (event) {
			// Add the keyCode of this event to the global keyOn Array
			// We can then easily check if a specific key is pressed by simply checking whether its keycode is set to true
			keyOn[event.keyCode] = true
		}, false)
	
		// Add another eventListener for the global keyup event
		document.addEventListener('keyup', function (event) {
			// Set the keyCode of this event to false, to avoid an inifinite keydown appearance
			keyOn[event.keyCode] = false
		}, false)
		
		// Instantiate required objects
		basket = new Basket(basketData)
		health = new Health()
		score = new Score()
		
		// Go to the title screen at 50 frames per second
		interval = setInterval(titleScreen, 50/1000)
	}
	
	function resetGame() {
		basket = new Basket(basketData)
		basket.reset()
		health.reset()
		score.reset()
		
		blocksSpawnSec = 2.5
		blocksSpawned = 0
		blocksOnScreen = 0
		blocks = []
		
		level = 1

		startTime = new Date().getTime()
	}
	
	function resetLevel() {
		basket.reset()
		health.reset()

		blocksSpawned = 0
		blocksOnScreen = 0
		blocks = []		
	}
	
	function titleScreen() {
		// Should the info screen be updated?
		if (infoScreenChange)
		{
			// Set the HTML value of the info DOM object so it displays a fancy titlescreen
			info.innerHTML = '<p id="title">FEED HOWON</p>'

			var displayHappyHowon = document.createElement('p')
			displayHappyHowon.append(window.happyHowon)
			displayHappyHowon.id = 'happy-howon-display'
			info.append(displayHappyHowon)

			var instr = document.createElement('p')
			instr.innerText = 'Press spacebar to start'
			info.appendChild(instr)
			
			// Only update the info screen once
			infoScreenChange = false
		}
		
		// 32 is the key code representation of a press on the spacebar
		if (keyOn[32])
		{
			// Set the infoScreenChange variable to its default value again
			infoScreenChange = true
			
			// Set the CSS 'display' rule of the info element to none so it disappears
			info.style.display = 'none'
			
			// The player wants to start playing so the current 'titleScreen loop' will be cleared
			clearInterval(interval)
			
			// Reset the game
			resetGame()
			
			// Enter the game loop at 50 frames per second
			interval = setInterval(gameLoop, 1000/50)
		}
	}
	
	function gameOverScreen() {
		frameTime = new Date().getTime()
		
		// Should the info screen be changed?
		if (infoScreenChange)
		{
			// First clear the canvas with the basket and blocks from the background
			context.clearRect(0, 0, canvas.width, canvas.height)
			
			// Change the text of the info screen and show it
			info.innerHTML = '<p id="game-over">Game over</p><p id="hbd">HAPPY BIRTHDAY HOWON!</p>'
			info.appendChild(window.upsetHowon)
			info.style.display = 'block'
			
			// Do not update the info screen again
			infoScreenChange = false
		}
		
		// If three seconds have passed
		if (frameTime > startTime + (5*1000))
		{	
			// A new info screen should be pushed next time
			infoScreenChange = true
			
			// Reset the timer
			startTime = frameTime
			
			// Quit this loop and set a new the loop for the title screen
			clearInterval(interval)
			interval = setInterval(titleScreen, 30/1000)
		}
	}
	
	function gameLoop() {
		frameTime = new Date().getTime()
		
		if (health.value < 1)
		{
			basket.alive = false
			
			// Abort the game loop and set a new loop for the game over screen
			clearInterval(interval)
			interval = setInterval(gameOverScreen, 30/1000)
			
			return
		}
		
		if (levelUp)
		{
			if (infoScreenChange)
			{
				// First clear the canvas with the basket and blocks from the background
				context.clearRect(0, 0, canvas.width, canvas.height)
			
				// Change the text of the info screen and show it
				info.innerHTML = '<p>Level ' + (level-1) + ' cleared!</p><p>Get ready for level ' + level + '!</p>'
				info.style.display = 'block'
			
				// Do not update the info screen again
				infoScreenChange = false
			}
		
			// If three seconds have passed
			if (frameTime >= startTime + (3*1000))
			{	
				// Flashing of the message has been completed
				levelUp = false
				
				// Hide the info screen and force an update next time
				info.style.display = 'none'
				infoScreenChange = true
				
				// Set a new timer
				startTime = frameTime
			}
			
			return
		}
		
		context.clearRect(0, 0, canvas.width, canvas.height)
		
		basket.update()
		health.update()
		score.update()
		
		updateBlocks()
		
		// blocksSpawnSec * 1000 because the timer values are in miliseconds
		if (frameTime >= startTime + (blocksSpawnSec*1000))
		{	
			// If all blocks have been added
			if (addBlock() === false)
			{
				// The player should go up a level
				levelUp = true
				level++
				window.isFoodMode = !window.isFoodMode
				
				blocksSpawnSec *= 0.99
				blockData['ySpeed'] *= 1.01
				basketData['xSpeed'] *= 1.02
				
				// Reset level specific variables
				resetLevel()	
			}
			
			// The timer is finished, reset it
			startTime = frameTime
		}
	}
	
	function updateBlocks() {
		for (var i = 0; i < blocks.length; i++) {
			// Assign a local copy
 			var block = blocks[i]
			
			block.update()
			checkCollision(block)
		}
	}
	
	// By passing a reference of the block object to the function, we can use the current very block to perform our collision detection
	function checkCollision(block) {
		if (block === undefined || block.alive === false)
			return

		// If the block hasn't passed the vertical line the basket resides on, we're not dealing with a collision (yet)
		if (block.y + block.height < basket.y)
			return
		
		// If the block its x co-ordinate is in the range of the basket its width, then we've got a collision
		if (basket.x - block.width <= block.x && block.x <= basket.x + basket.width) {
			// Whether its a good block or not, the current block should disappear and the amount of blocks on the screen should decrease with one
			if (block.alive == true) {
				block.alive = false
				blocksOnScreen--
			}
			
			if (window.loadedGoodFood[block.imageName] || window.loadedGoodLife[block.imageName]) {
				// So give the player some points
				score.change(block.strength)
				basket.image = window.happyHowon
			} else {
				// Otherwise, inflict damage to the health of the player
				health.change(- block.strength)
				basket.image = window.upsetHowon
			}

		} else { // If it's not, the block has missed the basket and will thus, eventually, collide with the ground

			// The player missed a good block and no damage has been inflicted yet
			if ((window.loadedGoodFood[block.imageName] || window.loadedGoodLife[block.imageName]) && block.strength > 0
					&& block.y + block.height >= canvas.height) {
				// So lets inflict damage to the health of the player
				health.change(- block.strength)
				basket.image = window.upsetHowon
				
				// To prevent this block from inflicting damage again, we set its strength to 0
				block.strength = 0
			}
			
			// If the block its y co-ordinate is greater than the canvas its height, it has disappeared from the viewport and can be removed
			if (block.alive === true && block.y > canvas.height) {
				block.alive = false
				blocksOnScreen--
			}
		}
	}
	
	function addBlock() {
		if (blocksSpawned != blocksPerLevel * level)
		{
			// Add a new block the the blocks array	
			blocks[blocks.length] = new Block(blockData)
			
			// Both increase the amount of blocks on the screen and the amount of spawned blocks
			blocksSpawned++
			blocksOnScreen++
		}
		else
		{
			// Check whether all blocks have been processed
			if (blocksOnScreen == 0)
				return false
		}
		
		// Return true if there's still something to work with
		return true
	}
}

var loadImage = function (name, path, loadedImages) {
	var image = new Image()
	image.src = path
	image.onload = function () {
		loadedImages[name] = image
		window.imagesLoaded++
		if (window.imagesLoaded == window.totalBlockImages) {
			loadHowonImage('happyHowon', 'img/happy_howon.png')
			loadHowonImage('upsetHowon', 'img/upset_howon.png')
		}
	}
}

var loadHowonImage = function (name, path) {
	var image = new Image()
	image.src = path
	image.onload = function () {
		window[name] = image
		window.imagesLoaded++
		if (window.imagesLoaded == window.totalBlockImages + 2) {
			Feeder.run()
		}
	}
}

var loadImagesAndRun = function () {

	for (var i = 0; i < goodFood.length; i++) {
		var name = goodFood[i]
		var path = 'img/food/good/' + name + '.png'
		loadImage(name, path, window.loadedGoodFood)
	}

	for (var i = 0; i < badFood.length; i++) {
		var name = badFood[i]
		var path = 'img/food/bad/' + name + '.png'
		loadImage(name, path, window.loadedBadFood)
	}

	for (var i = 0; i < goodLife.length; i++) {
		var name = goodLife[i]
		var path = 'img/life/good/' + name + '.png'
		loadImage(name, path, window.loadedGoodLife)
	}

	for (var i = 0; i < badLife.length; i++) {
		var name = badLife[i]
		var path = 'img/life/bad/' + name + '.png'
		loadImage(name, path, window.loadedBadLife)
	}

}

window.onload = function () {

	window.goodFood = [
		"bento",
		"birthday_cake",
		"curry",
		"dumpling",
		"noodles",
		"oden",
		"pot_of_food",
		"rice",
		"sushi",
		"takeout_box"
	]

	window.badFood = [
		"bread",
		"carrot",
		"cocktail",
		"cucumber",
		"salad",
		"wine"
	]

	window.goodLife = [
		"games",
		"gift",
		"money",
		"puppy",
		"singing",
		"sleeping",
		"taxi"
	]

	window.badLife = [
		"alarm",
		"bus",
		"computer",
		"debug",
		"exercise",
		"poop",
	]

	window.loadedGoodFood = {}
	window.loadedBadFood = {}
	window.loadedGoodLife = {}
	window.loadedBadLife = {}

	window.totalBlockImages = window.goodFood.length + window.badFood.length
														+ window.goodLife.length + window.badLife.length

	window.imagesLoaded = 0

	window.isFoodMode = true

	loadImagesAndRun()
}
