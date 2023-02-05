var keys = new Array();fps = new Array(60,60,60,60,60,60,60,60,60,60,60,60,60,60,60
		,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60
		,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60);
var fps;
var c, d,l, bg, ctx;
var count = 0;
var p_ref = {};
var particles = [];
var particle_ref = {};
var workers = [];
var check_worker;
var w_total = 0;
var w_used = 0;
var types_array = [];
var types = [salt,lead,dirt,miracle,magma,water];
var hexes = [];
var CANVAS_WIDTH,CANVAS_HEIGHT = 0;
var CHEX_HEX_INTERVAL = 1000;
var HEX_COUNT = 1;
var COLLISION_DISTANCE = 2;
var GRAVITY = 0.07;
var BOUNCE = 0.7;//0.51;
var BOUNCE_MIN = 0.1;
var AIR_RESISTANCE = 0.0001;
var m_x1, m_x2, m_y1, m_y2 = 0;
var m1, m2;
var frames = 0;
var m_down = false;
var SPEED_THRESHOLD = 2;
var tree = {};
var real_fps;
var SQRT_3 = 1.7320508075688772935274463415058723669428052538103806280558069794519330169088000370811461867572485756756261414154;
var drawAsHexagons = true;
var flatgrav = false;
var centergrav = false;
var hexgrav = false;
var particlegrav = false;
var no_fi, lo_fi;
var maxF =0;
var collapse = false;
var ma = Math;
var worker_mode = false;
var max_dx = 0;
var max_dy = 0;
var p_size = 5;
var check_elapsed;

var img;
var d;
/*function InvSqrt(float x){
	   var xhalf = 0.5f * x;
	   var i = *(int*)&x; // store floating-point bits in integer
	   i = 0x5f3759d5 - (i >> 1); // initial guess for Newton's method
	   x = *(float*)&i; // convert new bits into float
	   x = x*(1.5f - xhalf*x*x); // One round of Newton's method
	   return x;
	}*/

function init(){
	//page layout init
	pageInit();
	//keyboard input
	keyHandlers();
	//quadtree init
	goQuad();
	
	d = new Date();
    
	particle_setup();


	//spawn threads to 
	initCollideWorkers(4);
	//spawn thread to handle assembly checks
	initCheckWorker();
	
	//always last in the init()
	level1();
	mainLoop();
}

function pageInit(){
	var width = $(window).width()-5;
	var height = $(window).height()-5;
	if (width>1280)
		width = 1280;
	if (height>720)
		height = 720;
	
	c = document.getElementById('c');
	c.width = width-180;
	c.height = height;
	
	c.onselectstart = function () { return false; } // ie
	c.onmousedown = function () { return false; }// mozilla
	c.onmousemove = function() { return false; }
	
    ctx = c.getContext('2d');
	
	CANVAS_WIDTH = $('#c').width();
	CANVAS_HEIGHT = $('#c').height();
}

function initCheckWorker(){
		check_worker = new Worker('resources/js/workers/check.js');
		// in main js file
		check_worker.onmessage = function(e) {
		  var data = e.data;
		  if (data.status == 'debug') {
		    console.log(data.value);
		  }
		  if (data.status == 'error') {
			    alert("error " +data.value);
			  }
		  else if (data.status == 'init_success') {
			    console.log(data.status);
			  }
		  else if (data.status == 'check_success') {
				    processCheckWorker(data.result);
			  }
		}
		//send initialization command to worker
		check_worker.postMessage({init:true, check:false
			});
}

function processCheckWorker(result){
	var now = new Date();
	console.log("check: "+(now.getTime() - check_elapsed.getTime()));
	
	//process the data returned;
	var this_response = result; 
	console.log("result: "+result);
	//do something with the data returned. for now, NIGGA HOW MANY TIMES I GOTTA TELL YOU, YOU AINT TEACH DIS
	//call it again, with interval
	setTimeout("chexHex()", CHEX_HEX_INTERVAL);
}

function chexHex(){
	var temp_hex = hexes[1].getBasic();
	if (temp_hex.t_count>3){
		check_elapsed = new Date();
		check_worker.postMessage({init:false, check:true, hex:JSON.stringify(temp_hex)});
	}
		
	else setTimeout("chexHex()", CHEX_HEX_INTERVAL);
}

function initCollideWorkers(amt){
	w_total = amt;
	for (var i=0;i<amt;i++){
		workers[i] = new Worker('resources/js/workers/collide.js');
		// in main js file
		workers[i].onmessage = function(e) {
		  var data = JSON.parse(e.data);
		  if (data.type === 'debug') {
		    console.log(data.value);
		  }
		  if (data.type === 'error') {
			    alert(data.value);
			  }
		  else if (data.type === 'success') {
		    processCollideWorker(data.result);
		  }
		}
	}
}

function processCollideWorker(data){
	//copy results back to actual particles
	var actual_a = p_ref[data.a.id];
	var actual_b = p_ref[data.b.id];

	actual_a.x = data.a.x;
	actual_a.y = data.a.y;
	actual_a.dx = data.a.dx;
	actual_a.dy = data.a.dy;
	
	actual_b.x = data.b.x;
	actual_b.y = data.b.y;
	actual_b.dx = data.b.dx;
	actual_b.dy = data.b.dy;
	
	if (data.removeB)
		hexes[actual_b.hex].remove(actual_b.i+" "+actual_b.j+" "+actual_b.k);
	if (data.addA){
		if (!hexes[actual_b.hex].getXY(actual_a.x,actual_a.y)){
			hexes[actual_b.hex].hex.add(actual_a);
		}
		else{
			//nudge away from hex, to prevent creep jumps
				var tx = actual_a.x - hexes[actual_b.hex].cx;
				var ty = actual_a.y - hexes[actual_b.hex].cy;
				var mag = Math.sqrt(tx * tx + ty * ty);
				actual_a.dx += (tx/mag);
				actual_a.dy += (ty/mag);
				//if (isNaN(actual_a.dx) || isNaN(actual_a.dy)) alert('5');
			//bounce from hex
				var dx  = actual_b.x - actual_a.x;
				var dy  = actual_b.y - actual_a.y;
				var dvx = - actual_a.dx;
				var dvy = - actual_a.dy;
				    var dvdr = dx*dvx + dy*dvy; //dot 
		
				    var F = 0.2 * actual_a.mass * dvdr / ((actual_a.mass + actual_b.mass));
				    var fx = (F * dx)+Math.random()/2;
				    var fy = (F * dy)+Math.random()/2;
		
				    actual_a.dx += (fx / actual_a.mass)/5;
				    actual_a.dy += (fy / actual_a.mass)/5;
			}
	}
	w_used--;
}

//build and initialize the code needed to handle each type of particle or object
function particle_setup(){
	//add each type to the types array
	 for (i=0;i<types.length;i++)
     {
       types[i].type_id = i;
       types_array[i] = [];
       $('select#click_mode').append($("<option></option>")
    	         .attr("value",i)
    	         .text(types[i].name)); 
     }
	 
	 
}

function level1(){
	//create miniscule center anchor, to increase entropy
	//anchors.push(new anchor(CANVAS_WIDTH/2,CANVAS_WIDTH/2,0,0,new Date(),0.01));
	particlegrav = false;
	hexgrav = false;
	collapse = true;
}

function randomSalt(amt,energy){
	for (var i=0;i<amt;i++){
		spawn("salt",ma.random()*CANVAS_WIDTH,ma.random()*CANVAS_HEIGHT,(ma.random()*energy)-energy/2,(ma.random()*energy)-energy/2,frames);
	}
}

function hexTest(){
	var testHex = new h(CANVAS_WIDTH/2,CANVAS_HEIGHT/2,p_size);
	hexes.push([]);
	//offset by 1 for easy tests
	hexes.push(testHex);
	var testP = spawn("lead",CANVAS_WIDTH/2,CANVAS_HEIGHT/2,0,0,frames);
	testP.freeze = true;
	testP.mass = 25;
	testHex.add(testP);
	chexHex();
}

function findLoose(hex){
	var ret = [];
	for (var i=0;i<particles.length;i++){
		if (!hexes[particles[i].hex])
			ret.push(particles[i]);
			}
	return ret;
}

function goQuad(){
	var pointQuad = true;
	var bounds = {
		x:0,
		y:0,
		width:CANVAS_WIDTH,
		height:CANVAS_HEIGHT
	};
	tree = new QuadTree(bounds, pointQuad);
}
Array.prototype.remove = function(object) {
	this.splice(this.indexOf(object),1);
	return this;
	};
function updateQuad(part_array){
	tree.clear();
	tree.insert(part_array); 
	}

function goClick(x,y,dx,dy){
	var mode = $('#click_mode').val();
	switch (mode){
	/*case 'hex':
		var ppp = spawn(new salt(count,x,y,0,0,frames));
		hexes[1].add(ppp);
		break;*/
	default:
		spawn(mode,x,y,dx,dy,frames);
		break;
	}
}


function spawn(type,x,y,dx,dy,frames){
	switch (type){
	case (salt.type_id):
		var object = new salt(++count,x,y,dx,dy,frames);
		break;
	case (lead.type_id):
		var object = new lead(++count,x,y,dx,dy,frames);
		break;
	case (magma.type_id):
		var object = new magma(++count,x,y,dx,dy,frames);
		break;
	case (dirt.type_id):
		var object = new dirt(++count,x,y,dx,dy,frames);
		break;
	case (lead.type_id):
		var object = new lead(++count,x,y,dx,dy,frames);
		break;
	case (water.type_id):
		var object = new water(++count,x,y,dx,dy,frames);
		break;
	case (miracle.type_id):
		var object = new miracle(++count,x,y,dx,dy,frames);
		break;
	default:
		return;
	}

	types_array[type].push(object);
	particles.push(object);
	particle_ref[count] = object;
	return object;
	/*
	if (object ==){
		particles.push(object);
		types_array["salts"].push(object);
	}
	else if (object instanceof dirt){
		particles.push(object);
		types_array["dirts"].push(object);
	}
	else if (object instanceof lead){
		particles.push(object);
		types_array["leads"].push(object);
	}
	else if (object instanceof miracle){
		particles.push(object);
		types_array["miracles"].push(object);
	}
	else if (object instanceof magma){
		particles.push(object);
		types_array["magma"].push(object);
	}
	else if (object instanceof water){
		particles.push(object);
		types_array["water"].push(object);
	}
	else if (object instanceof anchor){
		types_array["anchor"].push(object);
	}*/
}

function mainLoop(){
	//if (frames%60==1 && particles.length > 100)
	//	$('#tree').html($('#tree').html()+"<br>"+particles.length + ", "+real_fps.toFixed(1));
	
	/*if (real_fps<30)
		lo_fi = true;
	if (real_fps<50){
		particlegrav = false;
		drawAsHexagons = false;
		no_fi = true;
		}
	else {
		particlegrav = true;
		drawAsHexagons = true;
		lo_fi = false;
		no_fi = false;
	}*/
	
	if (no_fi && particles.length > 50 && (frames%3 == 0))
		particles[0].kill();
	if (lo_fi && particles.length > 50)
		particles[0].kill();
	
	//update logic
	updateQuad(particles);
	ctx.fillStyle = "#000";
	
	/*if (lo_fi)
	{*/
		// ctx.fillRect(1, 1, CANVAS_WIDTH, CANVAS_HEIGHT);
	/*}
	else
		{*/
		ctx.globalAlpha = 0.3;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		ctx.globalAlpha = 1;
	/*	}

	if (lo_fi)
		{
			ctx.fillStyle = "#fff";
			//draw particles
			for (var x=0; x<salts.length;x++){
				salts[x].step(ctx);
			}
		}
	else{
		ctx.strokeStyle = "#fff";
		ctx.beginPath();
		ctx.lineWidth = 2;
		//draw particles
		for (var x=0; x<salts.length;x++){
			salts[x].step(ctx);
		}
	    ctx.stroke();
	}*/
/*
	//update hex tile locations
	if (hexes.length){
		ctx.strokeStyle = salts[0].color;
		ctx.fillStyle = salts[0].color;
		ctx.beginPath();
		ctx.lineWidth = salts[0].size;
		//draw particles
		for (var x=0; x<salts.length;x++){
			salts[x].step(ctx);
		}
	    ctx.stroke();
	}*/
	
	//draw particles based on type (drawing all particles of a color is more efficient)
	for (var i=0;i<types.length;i++){
		if (types_array[types[i]].length){
			var this_type = types_array[types[i]];
			ctx.fillStyle = this_type[0].color;
			//draw particles
			for (var x=0; x<this_type.length;x++){
				this_type[x].step(ctx);
			}
		}
	}
	
	//calculate FPS
	var n = new Date().getTime();
	l = d - n;
	f = (ma.abs(1000/l));
	fps.push(f);
	fps.shift();
	d = new Date();
	var i=0;
	var total =0;
	while (i<fps.length){
		total += fps[i];
		i++;
	}
	real_fps = total/i;
	
		$('#info').html(particles.length + "p " +(real_fps).toFixed(1) + "FPS "+max_dx.toFixed(0) + " / " + max_dy.toFixed(0));
	d = new Date().getTime();
	frames++;
	requestAnimFrame( mainLoop );
}
//requestAnim shim layer by Paul Irish
//paulirish.com
//thx paul
window.requestAnimFrame = (function(){
return  window.requestAnimationFrame       || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function(/* function */ callback, /* DOMElement */ element){
          window.setTimeout(callback, 1000 / 60);
        };
})();


function distance(x1,y1,x2,y2){
	 return ma.sqrt(((x1 - x2)*(x1 - x2)) + ((y1 - y2)*(y1 - y2)));
}
function h(centerx,centery,sideLength){
	this.id = HEX_COUNT++;
	this.cx = centerx;
	this.cy = centery;
	//angle for hex grid
	this.cr = 0;
	this.d = 1;
	this.maxD = 0;
	this.mass = 0;
	this.s = sideLength;
	this.h2 = this.s;
	this.h4 = this.s/2;
	this.h = this.s*2;
	this.w = this.s*SQRT_3; 
	this.w2 = this.w/2;
	this.w4=this.w2/2;
	this.tiles = {};
	this.tiles.length = 0;
	this.getBasic = function(){
		var basic = {};
		var t_count = 0;
		for (var p in this.tiles){
			if (p != "length"){
				basic[""+this.tiles[p].i +" "+this.tiles[p].j +" "+this.tiles[p].k] = this.tiles[p];
				t_count++;
			}
		}
		var temp = {};
		temp.basic = basic;
		temp.t_count = t_count;
		return temp;
	};
	this.add = function(p){
		p.updateIJK(this.getHexByXY(p.x,p.y));
		if (!this.getIJK(p.i,p.j,p.k)){
			p.dx = 0;p.dy=0;
			p.hex = this.id;
			var key = p.i +" " + p.j +" "+ p.k; 
			this.tiles[key] = p;
			//p.size = this.s*5/4;
			this.mass += p.mass;
			this.maxD = ma.max(this.maxD , distance(this.cx,this.cy,p.x,p.y));
			p.updateXY();
			this.tiles.length++;
		}
	}
	this.remove = function(key){
		var p = this.tiles[key];
		delete this.tiles[key];
		this.tiles.length--;
		p.hex = false;
		this.mass -= p.mass;
	}
	
	this.getHexByXY = function(x,y){
		var xx = x-this.cx;
		var yy = y-this.cy;
		var k = (2/3) * yy / this.h2;
		var i = (SQRT_3/3 * xx - yy/3 ) / this.h2;
		var j = -(SQRT_3/3 * xx + yy/3 ) / this.h2;
		i = (~~ (i + (i > 0 ? .5 : -.5)));
		j = (~~ (j + (j > 0 ? .5 : -.5)));
		k = (~~ (k + (k > 0 ? .5 : -.5)));
		//TODO: fix the root cause, not the symptom here
		if (i + j + k != 0){
			if (i != 0)
				k = -i-j;
			else i = -k-j;
		}
			
		return [i,j,k];
	}
	
	this.getXY = function(x,y){
		var ijk = this.getHexByXY(x,y);
		if (this.tiles[ijk[0] +" " + ijk[1] +" "+ ijk[2]])
			return this.tiles[ijk[0] +" " + ijk[1] +" "+ ijk[2]];
		else return false;
	}
	
	this.getIJK = function(i,j,k){
		if (this.tiles[i +" " + j +" "+ k])
			return this.tiles[i +" " + j +" "+ k];
		else return false;
	}
}


function planet(x,y,r){
	this.x = x;
	this.y = y;
	this.r = r;
}

function p(id,x,y,dx,dy,time){
	this.type_id = -1;
	this.id = id;
	this.freeze = false;
	this.color = "pink";
	this.viscosity = 0;
	this.x = x;
	this.y = y;
	this.dx = dx;
	this.dy = dy;
	this.mass = 0.1;
	this.birth = time;
	this.speed =0; //ma.sqrt(ma.pow(this.dx, 2) + ma.pow(this.dy, 2));
	this.inertia = 0;
	//this.size = 2;
	
	//dynamic hexing. for now, YOU CANT HANDLE DIS
	this.hex = false;
	//grav hex coordinates
	this.i = 0; //r
	this.j = 0; //g
	this.k = 0; //b
	
	this.earlyEscape = function(p){
		if (this.x == p.x && this.y == p.y)
			return true;
		var dist = ma.sqrt(((this.x - p.x)*(this.x - p.x)) + ((this.y - p.y)*(this.y - p.y)));
		var sumRadii = (p_size);/*
		if (dist > sumRadii)
			return true;*/
		var mag = this.speed;
		//var mag = ma.sqrt(this.dx * this.dx + this.dy * this.dy);
		dist -= sumRadii;
		if(mag < dist){
		  return false;
		}
		if (mag == 0)
			var thisNorm = [0,0]
		else	var thisNorm = [this.dx/mag,this.dy/mag];

		var vectorto = [p.x - this.x, p.y - this.y];

		var D = thisNorm[0] * vectorto[0] + thisNorm[1] * vectorto[1];

		if(D <= 0){
		  return false;
		}

		var vectortoMag = ma.sqrt(vectorto[0] * vectorto[0] + vectorto[1] * vectorto[1]);

		var F = (vectortoMag * vectortoMag) - (D * D);

		var sumRadiiSquared = sumRadii * sumRadii;
		if(F >= sumRadiiSquared){
		  return false;
		}

		var T = sumRadiiSquared - F;

		if(T < 0){
		  return false;
		}

		var dist2 = D - ma.sqrt(T);

		if(mag < dist2){
		  return false;
		}

		if (p.hex){
			this.x += thisNorm[0]*dist2;
			this.y += thisNorm[1]*dist2;
		} else{
			this.x += thisNorm[0]*dist2;
			this.y += thisNorm[1]*dist2;
		}
		
		return true;
	}
	
		this.getMagnitude = function() {
			   return ma.sqrt(this.dx * this.dx + this.dy * this.dy);
			};
		this.vectorTo = function (p) {
		   return [p.x - this.x, p.y - this.y];
		};
		this.withinBounds = function(point, size) {
		   return this.x >= point.x - size/2 && this.x <= point.x + size/2 && this.y >= point.y - size/2 && this.y <= point.y+size/2;
		};
		this.multiply = function( amt ){
			this.dx *= amt; 
			this.dy *= amt;
		};
		this.add = function( p ){ 
			this.dx += p.dx;  
			this.dy += p.dy;
		};
		this.dot = function(p){
			return (this.dx * p.dx + this.dy * p.dy);
		};
		this.getNormal = function(p){
			var mag = this.getMagnitude();
			return [this.dx/mag,this.dy/mag];
		};
		this.getAngle = function() {
		   var ratio = 0;
		   var offset = 0;
		   if (this.dx > 0) {
		      if (this.dy > 0) {
		         offset = 0;
		         ratio = this.dy / this.dx;
		      } else {
		         offset = (3 * ma.PI)/2;
		         ratio = this.dx / this.dy;
		      }  
		   } else {
		      if (this.dy > 0) {
		         offset = ma.PI / 2;
		         ratio = this.dx / this.dy;
		      } else {
		         offset = ma.PI;
		         ratio = this.dy / this.dx;
		      }
		   }
		   var angle = ma.atan(ma.abs(ratio)) + offset;
		   return angle;
		};
		this.getAngleDegrees = function() {
		   return this.getAngle() * 180 / ma.PI;
		};
		this.randomize = function(amt) {
		      this.dx += this.dx * amt * ma.random();
		      this.dy += this.dy * amt * ma.random();
		};
		this.force = function(f){
		      var xy = this.vectorTo(f);
		      var force = f.mass / ma.pow((xy[0]*xy[1]+f.mass/2+xy[1]*xy[1]+f.mass/2),1.5); 
		      totalAccelerationX += xy[0] * force;
		      totalAccelerationY += xy[1] * force;
		};
		

	this.pixel_y = function(){
		return ((3/2) * hexes[this.hex].s * this.k) + hexes[this.hex].cy;
	}
	this.pixel_x = function(){
		return (- SQRT_3 * hexes[this.hex].s * ( this.k/2 + this.j ))+ hexes[this.hex].cx;
	}
}

p.prototype.updateHex = function(di,dj,dk){
	delete hexes[this.hex].tiles[this.i +" "+this.j+" "+this.k];
	this.i += di;
	this.j += dj;
	this.k += dk;
	hexes[this.hex].tiles[this.i +" "+this.j+" "+this.k] = this;

	this.x = this.pixel_x();
	this.y = this.pixel_y();
}
p.prototype.updateXY = function(){
	this.x = this.pixel_x();
	this.y = this.pixel_y();
}
p.prototype.updateIJK = function(idk){
	this.i = idk[0];
	this.j = idk[1];
	this.k = idk[2];
}

p.prototype.kill = function(){
	var thisTypeArray = types_array[types[this.typeid]]
	for (var x=0; x<types_array["salts"].length;x++){
		if (types_array["salts"][x] === this){
			types_array["salts"].splice(x,1);
			break;
		}
	}
	
	if (hexes[this.hex]){
		hexes[this.hex].tiles.length--;
		delete hexes[this.hex].tiles[this.i+" "+this.j+" "+this.k];
	}
	for (var x=0; x<particles.length;x++){
		if (particles[x] === this){
			particles.splice(x,1);
			break;
		}
	}
	delete particle_ref[this.id];
	delete this;
}

/*
p.prototype.processHexes = function(){
	for (var i=0; i<hexes.length; i++){
		tempHex = hexes[i];
		if (distance(tempHex.cx, tempHex.cy, this.x, this.y) < tempHex.maxD + 2*tempHex.h)
		{
			for(var j = 0; j < tempHex.tiles.length; j++){
				tempTile = tempHex.tiles[j];
				if (distance(tempTile.x , tempTile.y , this.x , this.y) < this.size)
				{
				this.attach(tempHex);
				return;
				}
			}
		}
	}
}
*/

p.prototype.draw = function(ctx,x,y,s){
	//just dis. be super quick bro
	ctx.fillRect(x-(s/2), y-(s/2), s, s);	
		/*ctx.save();
		ctx.translate(hexes[this.hex].cx,hexes[this.hex].cy);
		ctx.rotate(hexes[this.hex].cr);*/
		/*if (drawAsHexagons){
			drawPolygon(ctx,this.x, this.y,hexes[this.hex].h2*0.8,6);
		}*/
		//else{
		//draw as chunk of gravitational body
			
		//}
		//ctx.restore();
		//if (lo_fi){
			
		//}
		/*
		else{
			ctx.fillRect(this.x-1, this.y-1, this.size, this.size);
			ctx.moveTo(this.x,this.y);
	    		ctx.lineTo(this.x+(this.dx/2),this.y+(this.dy/2));
		}*/
		
	    	//sweet warp effect
			//ctx.moveTo(this.x-((this.dx/this.dy)*1),this.y-((this.dy/this.dx)*1));		
}
p.prototype.gravitate = function(type){
	//accumulate momentum shifts, and assign once at end
	var ddx = 0;
	var ddy = 0;
		if (flatgrav)
			ddy += GRAVITY*this.mass;
		if (centergrav)
			{
				var dd = distance(this.x,this.y,CANVAS_WIDTH/2,CANVAS_HEIGHT/2)/4;
				var drx = (CANVAS_WIDTH/2 - this.x)/(dd*dd);
				var dry = (CANVAS_HEIGHT/2 - this.y)/(dd*dd);
				ddx += (drx * GRAVITY);
				ddy += (dry * GRAVITY);
			}
	
		if (hexgrav)
		{
			for (var i=1;i<hexes.length;i++){
				var dd = distance(this.x,this.y,hexes[i].cx,hexes[i].cy)/4;
				if (dd<hexes[i].maxD) dd = hexes[i].maxD;
				var drx = (hexes[i].cx - this.x)/(dd*dd);
				var dry = (hexes[i].cy - this.y)/(dd*dd);
				ddx += (drx * GRAVITY) * hexes[i].mass/4;
				ddy += (dry * GRAVITY) * hexes[i].mass/4;
			}
		}
		if (particlegrav)
		{
				var that;
				for (var i=0;i<particles.length;i++){
					//randomly skip gravitation. Imperceptible at 60fps, yet massive performance increase
					if (Math.random()>0.8)break;
					that = particles[i];
					if (!(that === this || that.hex)){
						var dd = distance(this.x,this.y,that.x,that.y)/4;
						if (dd<2) dd=2;
						var drx = (that.x - this.x)/(dd*dd);
						var dry = (that.y - this.y)/(dd*dd);
						ddx += ((drx * GRAVITY) * that.mass)/4;
						ddy += ((dry * GRAVITY) * that.mass)/4;
						that.dx -= ((drx * (GRAVITY*2)) * this.mass)/4;
						that.dy -= ((dry * (GRAVITY*2)) * this.mass)/4;
					}
				}
		}
		this.dx += ddx;
		this.dy += ddy;
};

p.prototype.step = function(ctx){
	this.speed = ma.sqrt(this.dx * this.dx + this.dy * this.dy);
	if (this.hex){
		this.dx = 0; this.dy = 0;
		//check for those below, if not drop
		var newXY = false;
		if (!this.freeze && collapse && ma.random()*2<this.viscosity){
			//edge cases
			if (this.i==-this.j){
				if (this.i > 0){
					if (ma.random()>0.8){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i-1,this.j,this.k+1)){
								this.updateHex(-1,0,1);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i,this.j+1,this.k-1)){
								this.updateHex(0,1,-1);
							}
						}
					}else if (!hexes[this.hex].getIJK(this.i-1,this.j+1,this.k)){
						this.updateHex(-1,1,0);
					}
				}else{
					if (ma.random()>0.8){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i+1,this.j,this.k-1)){
								this.updateHex(1,0,-1);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i,this.j-1,this.k+1)){
								this.updateHex(0,-1,1);
							}
						}
					}else if (!hexes[this.hex].getIJK(this.i+1,this.j-1,this.k)){
						this.updateHex(1,-1,0);
					}
				}
			}else if (this.i==-this.k){
				if (this.i > 0){
					if (ma.random()>0.8){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i-1,this.j+1,this.k)){
								this.updateHex(-1,1,0);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i,this.j-1,this.k+1)){
								this.updateHex(0,-1,1);
							}
						}
					}else if (!hexes[this.hex].getIJK(this.i-1,this.j,this.k+1)){
						this.updateHex(-1,0,1);
					}
				}else{
					if (ma.random()>0.8){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i+1,this.j-1,this.k)){
								this.updateHex(1,-1,0);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i,this.j+1,this.k-1)){
								this.updateHex(0,1,-1);
							}
						}
					}else if (!hexes[this.hex].getIJK(this.i+1,this.j,this.k-1)){
						this.updateHex(1,0,-1);
					}
				}
			}else if (this.j==-this.k){
				if (this.j > 0){
					if (ma.random()>0.8){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i+1,this.j-1,this.k)){
								this.updateHex(1,-1,0);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i-1,this.j,this.k+1)){
								this.updateHex(-1,0,1);
							}
						}
					}else if (!hexes[this.hex].getIJK(this.i,this.j-1,this.k+1)){
						this.updateHex(0,-1,1);
					}
				}else{
					if (ma.random()>0.8){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i-1,this.j+1,this.k)){
								this.updateHex(-1,1,0);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i+1,this.j,this.k-1)){
								this.updateHex(1,0,-1);
							}
						}
					}else if (!hexes[this.hex].getIJK(this.i,this.j+1,this.k-1)){
						this.updateHex(0,1,-1);
					}
				}
			}
		//centerline case
			else{
				var ai = ma.abs(this.i);
				var aj = ma.abs(this.j);
				var ak = ma.abs(this.k);
				if (ai>aj && ai>ak){
					if (this.i>0){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i-1,this.j+1,this.k)){
								this.updateHex(-1,1,0);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i-1,this.j,this.k+1)){
								this.updateHex(-1,0,1);
							}
						}
					}else{
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i+1,this.j-1,this.k)){
								this.updateHex(1,-1,0);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i+1,this.j,this.k-1)){
								this.updateHex(1,0,-1);
							}
						}
					}
				}else if (aj>ai && aj>ak){
					if (this.j>0){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i,this.j-1,this.k+1)){
								this.updateHex(0,-1,1);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i+1,this.j-1,this.k)){
								this.updateHex(1,-1,0);
							}
						}
					}else{
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i,this.j+1,this.k-1)){
								this.updateHex(0,1,-1);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i-1,this.j+1,this.k)){
								this.updateHex(-1,1,0);
							}
						}
					}
				}else if (ak>ai && ak>aj){
					if (this.k>0){
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i,this.j+1,this.k-1)){
								this.updateHex(0,1,-1);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i+1,this.j,this.k-1)){
								this.updateHex(1,0,-1);
							}
						}
					}else{
						if (ma.random()>0.5){
							if (!hexes[this.hex].getIJK(this.i-1,this.j,this.k+1)){
								this.updateHex(-1,0,1);
							}
						}else{
							if (!hexes[this.hex].getIJK(this.i,this.j-1,this.k+1)){
								this.updateHex(0,-1,1);
							}
						}
					}
				}
			}
		}
	}
	else {	
		//to improve performance, gravitate x3 as hard x0.3 as often :)
		if (frames%3==0)
			this.gravitate();
		//gravity, air resistance
		this.dx *= 1-(AIR_RESISTANCE*this.speed);
		this.dy *= 1-(AIR_RESISTANCE*this.speed);
		//collide only with quadtree friends
		//check particles
		var possible = tree.retrieve(this);
		//hack to include root. TODO: figure out why this is not always included
		if (hexes[1]) possible.push(hexes[1].tiles["0 0 0"]);
		
		if (worker_mode){
			//WEBWORKER NEW CODE
			if (possible.length>1)
				for (var i=0;i<possible.length;i++){
						if (!(possible[i]===this))
								if (!this.hex){
									if (w_used<w_total){
										if (possible[i].hex)
											var bHasHex = true;
										else var bHasHex = false;
										workers[i%w_total].postMessage({
											  aid: this.id,
											  ax: this.x,
											  ay: this.y,
											  adx: this.dx,
											  ady: this.dy,
											  asize: this.size,
											  aspeed: this.speed,
											  amass: this.mass,
											  afreeze: this.freeze,
											  bid: possible[i].id,
									    	  bx: possible[i].x,
									    	  by: possible[i].y,
									    	  bdx: possible[i].dx,
									    	  bdy: possible[i].dy,
									    	  bsize: possible[i].size,
									    	  bspeed: possible[i].speed,
									    	  bmass: possible[i].mass,
									    	  bfreeze: possible[i].freeze,
									    	  bhasHex: bHasHex
											});
										w_used++;
									}else{
										this.collide(ctx,possible[i]);
									}
								}
				}
			//END WEBWORKER NEWNEW
		}else{
			/* OLD CODE, NON-THREADED. KEEP JUST IN CASE DIS AINT NONE UNSLOWER
			 * 
			 */ if (possible.length>1)
				for (var i=0;i<possible.length;i++){
						if (!(possible[i]===this))
								if (!this.hex)
										this.collide(ctx,possible[i]);
				}
		}
		
		//bounce, boundaries
		if (this.x < 0)
			this.dx = ma.abs(this.dx *BOUNCE) + BOUNCE_MIN;
		else if (this.x > CANVAS_WIDTH)
			this.dx = -ma.abs(this.dx *BOUNCE) - BOUNCE_MIN;
		if (this.y < 0)
			this.dy = ma.abs(this.dy *BOUNCE) + BOUNCE_MIN;
		else if (this.y > CANVAS_HEIGHT)
			this.dy = -ma.abs(this.dy *BOUNCE) - BOUNCE_MIN;
		}
	//inline
	if (this.dx > max_dx) max_dx = this.dx;
	if (this.dy > max_dy) max_dy = this.dy;
	this.x += Math.min(this.dx,25);
	this.y += Math.min(this.dy,25);
	this.draw(ctx,this.x,this.y,p_size);
};
p.prototype.collide = function(ctx,that){
		if (this.earlyEscape(that))
		{
			if (that.hex){
				//check speed. if fast enough, bounce
				if (this.speed > 6 && !that.freeze){
					//delete that.hex.tiles[that.i+" "+that.j+" "+that.k];
					hexes[that.hex].remove(that.i+" "+that.j+" "+that.k);
					var dx  = that.x - this.x;
					var dy  = that.y - this.y;
					var dvx = - this.dx;
					var dvy = - this.dy;
					    var dvdr = dx*dvx + dy*dvy; //dot 

						   var F = 0.2 * this.mass * dvdr / ((this.mass + that.mass));
						   var fx = (F * dx)/4+ma.random()/2;
						   var fy = (F * dy)/4+ma.random()/2;
		
						    this.dx += fx / this.mass;
						    this.dy += fy / this.mass;
						    
						    F = 0.2 * that.mass * dvdr / ((this.mass + that.mass));
							fx = (F * dx)/4+ma.random()/2;
							fy = (F * dy)/4+ma.random()/2;
						    that.dx -= fx / that.mass;
						    that.dy -= fy / that.mass;
				}
				else if (this.speed > 4){
					this.dx = -this.dx/2;
					this.dy = -this.dy/2;
				}
				//else attach
				else if (!hexes[that.hex].getXY(this.x,this.y)){
					hexes[that.hex].add(this);
				}
				else{
					//nudge away from hex, to prevent creep jumps
						var tx = this.x - hexes[that.hex].cx;
						var ty = this.y - hexes[that.hex].cy;
						var mag = ma.sqrt(tx * tx + ty * ty)/2;
						this.x += (tx/mag)*p_size/2;
						this.y += (ty/mag)*p_size/2;/*
						this.dx += (tx/mag)/6;
						this.dy += (ty/mag)/6;*/
						//if (isNaN(this.dx) || isNaN(this.dy)) alert('5');
					//bounce from hex
						var dx  = that.x - this.x;
						var dy  = that.y - this.y;
						var dvx = - this.dx;
						var dvy = - this.dy;
						    var dvdr = dx*dvx + dy*dvy; //dot 
		
						    var F = 0.2 * this.mass * dvdr / ((this.mass + that.mass));
						    var fx = (F * dx)+(ma.random()/4);
						    var fy = (F * dy)+(ma.random()/4);
		
						    this.dx += (fx / this.mass)/8;
						    this.dy += (fy / this.mass)/8;
					}
			}
			else{
					var dx  = that.x - this.x;
					var dy  = that.y - this.y;
					var dvx = that.dx - this.dx;
					var dvy = that.dy - this.dy;
					    var dvdr = ma.min(0.7,dx*dvx + dy*dvy); //dot 
	
					   var F = 0.2 * this.mass * dvdr / ((this.mass + that.mass));
					   var fx = (F * dx)/4+(ma.random()/4);
					   var fy = (F * dy)/4+(ma.random()/4);
	
					    this.dx += (fx / this.mass)*BOUNCE;
					    this.dy += (fy / this.mass)*BOUNCE;
					    
					    F = 0.2 * that.mass * dvdr / ((this.mass + that.mass));
						fx = (F * dx)/4+(ma.random()/4);
						fy = (F * dy)/4+(ma.random()/4);
					    that.dx -= (fx / that.mass)*BOUNCE;
					    that.dy -= (fy / that.mass)*BOUNCE;
			}
		}
};

function drawPolygon(ctx,x,y,size,numOfSides) {
	ctx.beginPath();
	ctx.moveTo (x +  size * ma.sin(0), y +  size *  ma.cos(0));          
 
	for (var i = 1; i <= numOfSides;i++) {
	    ctx.lineTo (x + size * ma.sin((i * 2 * (ma.PI) / numOfSides)), y + size * ma.cos((i * 2 * (ma.PI) / numOfSides)));
	}
	ctx.closePath();
	ctx.fill();
}

function salt(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.type_id;
    this.color = "#efefef";
    this.mass = 1;
    //this.size = 3;
    this.viscosity = 0.5;
}
// setting up the inheritance
salt.prototype = Object.create( p.prototype );

function dirt(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.type_id;
    this.color = "#AE782D";
    this.mass = 2;
    //this.size = 5;
    this.viscosity = 0.2;
    
    this.kill = function(ctx){
        for (var x=0; x<types_array["dirts"].length;x++){
    		if (types_array["dirts"][x] === this){
    			types_array["dirts"].splice(x,1);
    			break;
    		}
    	}
    	p.prototype.kill.call(this);
    };
}
// setting up the inheritance
dirt.prototype = Object.create( p.prototype );

function lead(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.type_id;
    this.color = "#778";
    this.mass = 10;
    //this.size = 4;
    this.viscosity = 0.1;
    
}
// setting up the inheritance
lead.prototype = Object.create( p.prototype );

function miracle(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.type_id;
    this.color = "#f11";
    this.mass = 10;
    //this.size = 4;
    this.viscosity = 1;
    
    this.draw = function(ctx,x,y,s){
    	ctx.fillStyle = "hsl(" + (this.birth+frames*2)%255+",100%,60%)";
		ctx.fillRect(x-(s/2), y-(s/2), s, s);
    };
}
// setting up the inheritance
miracle.prototype = Object.create( p.prototype );


function magma(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.type_id;
    this.color = "#F99";
    this.mass = 4;
    //this.size = 4;
    this.viscosity = 0.7;
    
    this.draw = function(ctx,x,y,s){
    	if (ma.random() > 0.3) ctx.fillStyle = "hsl(" + (this.birth*2+frames/4)%30+",100%,"+ (50+((frames/2)%20) ) + "%)";
		ctx.fillRect(x-(s/2), y-(s/2), s, s);
    };
}
// setting up the inheritance
magma.prototype = Object.create( p.prototype );

function water(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.type_id;
    this.color = "#3aF";
    this.mass = 1;
    //this.size = 3;
    this.viscosity = 1;

    this.draw = function(ctx,x,y,s){
		ctx.fillRect(x-((s+2)/2), y-((s+2)/2), (s+2), (s+2));
    };

}
// setting up the inheritance
water.prototype = Object.create( p.prototype );

