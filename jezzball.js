var pressedX = null;
var pressedY = null;
var gameOver = false;
var level = 0;
var mWidth;

function setup() {
	createCanvas(windowWidth, windowHeight);
	sc = pow((width*height)/(800*800), 0.3);
	split = [];
	gray_rects = [];
	num_balls = level + 3;
	var generation = true;
	while (generation) {
		balls = [];
		var broken = false;
		for (var i=0; i<num_balls; i++) {
			balls[i] = new Ball();
		};
		for (var j=0; j<num_balls; j++) {
			for (var i=0; i!=j; i++) {
				if (dist(balls[i].x, balls[i].y, balls[j].x, balls[j].y) < 4. * balls[i].r) {
					broken = true;
				};
			};
		};
		if (!broken) {
			generation = false;
		};
	};
}

function draw() {
	background(100);
	fill(238, 39, 55);
	stroke(255);
	strokeWeight(1);
	rect(10,10,width-20,height-20);

	if (gameOver) {
		textSize(32);
		fill(255);
		textAlign(CENTER, CENTER);
		mWidth = textWidth('Game Over.');
		text('Game Over.\nTry Again?', width/2., height/2.);
		rect(width/2. - mWidth/2., height/2. + 64, mWidth, 32);
		fill(238, 39, 55);
		textSize(20);
		text('press to restart', width/2., height/2. + 64 + 16);
		
	} else {
		fill(38, 164, 156);
		noStroke();
		var score = 0;
		for (var i=0; i<gray_rects.length; i++) {
			rect(gray_rects[i][0], gray_rects[i][1], gray_rects[i][2], gray_rects[i][3]);
			score += gray_rects[i][2]*gray_rects[i][3];
		};
		
		score = round((score*100.)/(0.75*width*height), 2);

		stroke(255);
		noFill();
		rect(10,10,width-20,height-20);

		for (var i=0; i<num_balls; i++) {
			if (balls[i].alive) {
				for (var j=0; j<num_balls; j++) {
					if (i < j) {
						balls[i].collide(balls[j]);
						balls[j].collide(balls[i]);
					};
				};
				balls[i].update();
				balls[i].render();
			};
		};

		for (var i=0; i<split.length; i++) {
			split[i].update();
			split[i].render();
		};
		
		textSize(20);
		strokeWeight(1);
		fill(255);
		text(str(score)+'%', 15, 30);
		text('Level: ' + str(level), width-textWidth('Level: ' + str(level))-15, 30);
		
		if (score >= 100.) {
			level += 1;
			setup();
		};
	};
}

function Ball() {
	this.alive = true;
	this.r = 9*sc;
	this.x = random(2*this.r, width-2*this.r);
	this.y = random(2*this.r, height-2*this.r);
	this.np = null;
	this.p = createVector(random(-1,1), random(-1,1));
	var pl = dist(0, 0, this.p.x, this.p.y);
	this.p.x *= (1.5*sc)/pl;
	this.p.y *= (1.5*sc)/pl;
	
	this.render = function() {
		ellipseMode(RADIUS);
		fill(255);
		noStroke();
		ellipse(this.x, this.y, this.r, this.r);
	};
	
	this.update = function() {
		if (this.np) {
			this.p = this.np;
			this.np = null;
		};
		
		var nx = this.x + this.p.x;
		var ny = this.y + this.p.y;
		
		if ((nx > width - 2*this.r) || (nx < 2*this.r)) {
			this.p.x *= -1;
		};
		if ((ny > height - 2*this.r) || (ny < 2*this.r)) {
			this.p.y *= -1;
		};
		
		for (var i=0; i<split.length; i++) {
			var s = split[i];
			if (s.finished) {
				if ((s.orientation == 'v') && (abs(s.limit - nx) < this.r) && (s.p1.y <= ny + this.r) && (s.p2.y >= ny - this.r)) {
					this.p.x *= -1;
				} else if ((s.orientation == 'h') && (abs(s.limit - ny) < this.r) && (s.p1.x <= nx + this.r) && (s.p2.x >= nx - this.r)) {
					this.p.y *= -1;
				};
			} else {
				if ((s.orientation == 'v') && (abs(s.limit - this.x) < this.r)) {
					if ((s.p1.y <= this.y - this.r) && (s.p2.y >= this.y + this.r)) {
						this.alive = false;
						gameOver = true;
					};
				} else if ((s.orientation == 'h') && (abs(s.limit - this.y) < this.r)) {
					if ((s.p1.x <= this.x - this.r) && (s.p2.x >= this.x + this.r)) {
						this.alive = false;
						gameOver = true;
					};
				};
			};
		};
		
		this.x += this.p.x;
		this.y += this.p.y;
	};
	
	this.collide = function(other) {
		var nx = this.x + this.p.x;
		var ny = this.y + this.p.y;
		var other_nx = other.x + other.p.x;
		var other_ny = other.y + other.p.y;
		if (dist(nx, ny, other_nx, other_ny) <= 2*this.r) {
			this.np = other.p;
		};
	};
};

function Splitter(orient) {
	this.orientation = orient;
	this.finished = false;
	
	this.p1 = createVector(pressedX, pressedY);
	this.p2 = createVector(pressedX, pressedY);
	
	if (this.orientation == 'h') {
		this.limit = pressedY;
		this.init = pressedX;
	} else {
		this.limit = pressedX;
		this.init = pressedY;
	};
	
	this.render = function() {
		stroke(255);
		strokeWeight(1);
		line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
	};
	
	this.clear = function() {
		if (this.orientation == 'v') {
			var upper_limits = [width-10];
			var lower_limits = [10];
				
			for (var i=0; i<split.length; i++) {
				var s = split[i];
				if ((s.orientation == 'v') && (this.limit < s.limit) && (this.p1.y >= s.p1.y) && (this.p2.y <= s.p2.y)) {
					upper_limits.push(s.limit);
				} else if ((s.orientation == 'v') && (this.limit > s.limit) && (this.p1.y >= s.p1.y) && (this.p2.y <= s.p2.y)) {
					lower_limits.push(s.limit);
				};
			};
			
			var upper_limit = min(upper_limits);
			var lower_limit = max(lower_limits);
			
			var upper_empty = true;
			var lower_empty = true;
			
			for (var i=0; i<balls.length; i++) {
				var b = balls[i];
				if ((b.x <= this.limit) && (b.x >= lower_limit) && (b.y >= this.p1.y) && (b.y <= this.p2.y)) {
					lower_empty = false;
				} else if ((b.x >= this.limit) && (b.x <= upper_limit) && (b.y >= this.p1.y) && (b.y <= this.p2.y)) {
					upper_empty = false;
				};
			};
			
			if (lower_empty) {
				gray_rects.push([lower_limit, this.p1.y, this.limit - lower_limit, this.p2.y - this.p1.y]);
			};
			
			if (upper_empty) {
				gray_rects.push([this.limit, this.p1.y, upper_limit - this.limit, this.p2.y - this.p1.y]);
			};
		} else {
			
			var upper_limits = [height-10];
			var lower_limits = [10];
				
			for (var i=0; i<split.length; i++) {
				var s = split[i];
				if ((s.orientation == 'h') && (this.limit < s.limit) && (this.p1.x >= s.p1.x) && (this.p2.x <= s.p2.x)) {
					upper_limits.push(s.limit);
				} else if ((s.orientation == 'h') && (this.limit > s.limit) && (this.p1.x >= s.p1.x) && (this.p2.x <= s.p2.x)) {
					lower_limits.push(s.limit);
				};
			};
			
			var upper_limit = min(upper_limits);
			var lower_limit = max(lower_limits);
			
			var upper_empty = true;
			var lower_empty = true;
			
			for (var i=0; i<balls.length; i++) {
				var b = balls[i];
				if ((b.y <= this.limit) && (b.y >= lower_limit) && (b.x >= this.p1.x) && (b.x <= this.p2.x)) {
					lower_empty = false;
				} else if ((b.y >= this.limit) && (b.y <= upper_limit) && (b.x >= this.p1.x) && (b.x <= this.p2.x)) {
					upper_empty = false;
				};
			};
			
			if (lower_empty) {
				gray_rects.push([this.p1.x, lower_limit, this.p2.x - this.p1.x, this.limit - lower_limit]);
			};
			
			if (upper_empty) {
				gray_rects.push([this.p1.x, this.limit, this.p2.x - this.p1.x, upper_limit - this.limit]);
			};
		};
	};
	
	this.update = function() {
		if (!this.finished) {
			if (this.orientation == 'h') {
				
				var upper_limits = [];
				var lower_limits = [];
				
				for (var i=0; i<split.length; i++) {
					if ((split[i].orientation == 'v') && (this.limit >= split[i].p1.y) && (this.limit <= split[i].p2.y)) {
						if (split[i].limit >= this.init) {
							upper_limits.push(split[i].limit);
						} else {
							lower_limits.push(split[i].limit);
						};
					};
				};
				
				if (upper_limits.length == 0) {
					var upper_limit = width-10;
				} else {
					var upper_limit = min(upper_limits);
				};
				
				if (lower_limits.length == 0) {
					var lower_limit = 10;
				} else {
					var lower_limit = max(lower_limits);
				};
				
				this.p1.x -= 5.*sc;
				this.p1.x = max(lower_limit, this.p1.x);
				this.p2.x += 5.*sc;
				this.p2.x = min(upper_limit, this.p2.x);
				if ((this.p1.x == lower_limit) && (this.p2.x == upper_limit)) {
					this.finished = true;
					this.clear();
				};
			} else {
				
				var upper_limits = [];
				var lower_limits = [];
				
				for (var i=0; i<split.length; i++) {
					if ((split[i].orientation == 'h') && (this.limit >= split[i].p1.x) && (this.limit <= split[i].p2.x)) {
						if (split[i].limit >= this.init) {
							upper_limits.push(split[i].limit);
						} else {
							lower_limits.push(split[i].limit);
						};
					};
				};
				
				if (upper_limits.length == 0) {
					var upper_limit = height-10;
				} else {
					var upper_limit = min(upper_limits);
				};
				
				if (lower_limits.length == 0) {
					var lower_limit = 10;
				} else {
					var lower_limit = max(lower_limits);
				};
				
				this.p1.y -= 5.*sc;
				this.p1.y = max(lower_limit, this.p1.y);
				this.p2.y += 5.*sc;
				this.p2.y = min(upper_limit, this.p2.y);
				if ((this.p1.y == lower_limit) && (this.p2.y == upper_limit)) {
					this.finished = true;
					this.clear();
				};
			};
		};
	};
};

function mousePressed() {
	if (gameOver) {
		if ((mouseX >= width/2. - mWidth/2.) && (mouseX <= width/2. + mWidth/2.) && (mouseY >= height/2. + 64) && (mouseY <= height/2. + 64 + 32)) {
			gameOver = false;
			pressedX = null;
			pressedY = null;
			setup();
		};
	} else {
		pressedX = mouseX;
		pressedY = mouseY;
	};
};

function mouseReleased() {
	
	for (var i=split.length-1; i>=0; i--) {
		if (!split[i].finished) {
			return
		};
	};
	
	if (pressedX) {
		var broken = false;
		
		for (var i=0; i<gray_rects.length; i++) {
			var gr = gray_rects[i];
			if ((pressedX >= gr[0]) && (pressedY >= gr[1]) && (pressedX <= gr[0] + gr[2]) && (pressedY <= gr[1] + gr[3])) {
				broken = true;
			};
		};
		
		if (!broken) {
			var dx = mouseX - pressedX;
			var dy = mouseY - pressedY;

			if (abs(dx) > 5.*abs(dy)) {
					splitter = new Splitter('h');
					split.push(splitter);
			} else if (abs(dy) > 5.*abs(dx)) {
					splitter = new Splitter('v');
					split.push(splitter);
			};
		};
	};
};
