var grav_elapsed;
var check_elapsed;

var grav_workers = [];

var CHEX_HEX_INTERVAL = 80;
var GRAVITATE_INTERVAL = 80;

var grav_done = 0;

var escapeCheck = 0;

function initCheckWorker(){
		check_worker = new Worker('resources/js/particle/workers/check.js');
		// in main js file
		check_worker.onmessage = function(e) {
		  var data = e.data;
		  if (data.status == 'debug') {
		    //console.log(data.value);
		  }
		  if (data.status == 'error') {
			    alert("error " +data.value);
			  }
		  else if (data.status == 'init_success') {
			    //console.log(data.status);
			  }
		  else if (data.status == 'check_success') {
				    processCheckWorker(data);
			  }
		}
		var temp_types = new Array();
		for (x in types){
			temp_types.push([types[x].name,types[x].type_id]);
		}
		//send initialization command to worker
		check_worker.postMessage({init:true, check:false, sendtypes:temp_types
			});
}

function processCheckWorker(data){
	var now = new Date();
	var this_response = data.result; 
	//process the data returned;
	//console.log("Assembly Check - Calc: "+data.calc+" Elapsed: "+(now.getTime() - check_elapsed.getTime()));
	for (var loc in this_response){
		if (this_response[loc] == -1)
			{
				var gone = hexes[HEX_COUNT].remove(loc);
				if (gone != false)
					gone.kill();
			}
		else{
			var spawnP = spawn(this_response[loc],0,0,0,0,frames);
			hexes[HEX_COUNT].addIJK(spawnP, loc);
		}
		
	}
	
	
	//call it again, with interval
	setTimeout("chexHex()", CHEX_HEX_INTERVAL);
}

function chexHex(){
	var temp_hex = hexes[HEX_COUNT].getBasic();
	if (temp_hex.t_count>3){
		check_elapsed = new Date();
		check_worker.postMessage({init:false, check:true, hex:JSON.stringify(temp_hex)});
	}
		
	else setTimeout("chexHex()", CHEX_HEX_INTERVAL);
}

function initGravitateWorkers(amt){
	for (var a=0;a<amt;a++){
		grav_workers.push(new Worker('resources/js/particle/workers/gravitate.js'));
	}
	for (var a=0;a<grav_workers.length;a++){
		grav_workers[a].onmessage = function(e) {
			  var data = e.data;
			  if (data.status == 'debug') {
			    //console.log(data);
			  }
			  if (data.status == 'error') {
				    alert("error " +data);
				  }
			  else if (data.status == 'init_success') {
				    //console.log(data.status);
				    gravitate();
				  }
			  else if (data.status == 'grav_success') {
				  		 processGravitateWorker(data);
				  }
			}
		//send initialization command to worker
		grav_workers[a].postMessage({init:true, check:false
			});
	}
}

function gravitate(){
	var p_list = particle_ref;
	if (particles.length > 1){

		var worker_count = grav_workers.length;
		var distributed_ref = {};
		for (var a=0;a<worker_count;a++){
			distributed_ref[a] = {};
		}
		//distribute particles
		for (var p in particle_ref){
			var sorting_hat = Math.floor(Math.random() * (worker_count));
			distributed_ref[sorting_hat][p] = particle_ref[p];
		}
		
		grav_elapsed = new Date();		
		for (var a=0;a<worker_count;a++){
			//console.log("Sending some particles to grav thread "+a);
			grav_workers[a].postMessage({init:false, grav:true, particle_ref:JSON.stringify(distributed_ref[a])});
		}
		
	}
	else setTimeout("gravitate()", GRAVITATE_INTERVAL);
}

function processGravitateWorker(data){
	//process the data returned;
	var now = new Date();
	
	var delta_list = data.result; 
	for (var p in delta_list){
		if (typeof particle_ref[p] === "undefined"){
			//this particle has been destroyed or summat, move on
		}else{
			particle_ref[p].dx += delta_list[p].dx;
			particle_ref[p].dy += delta_list[p].dy;
		}
		
	}
	//console.log("Gravitate - Calc: "+data.interactions+" Elapsed: "+(now.getTime() - grav_elapsed.getTime()));
	//call it again, with interval
	grav_done++;
  	if (grav_done == grav_workers.length){
  		grav_done =0;
  		setTimeout("gravitate()", GRAVITATE_INTERVAL);
  	}
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

function updateQuad(part_array){
	tree.clear();
	tree.insert(part_array); 
	}


function spawn(type,x,y,dx,dy,frames){
	switch (parseInt(type)){
	case (salt.type_id):
		var object = new salt(++count,x,y,dx,dy,frames);
		break;
	case (magma.type_id):
		var object = new magma(++count,x,y,dx,dy,frames);
		break;
	case (dirt.type_id):
		var object = new dirt(++count,x,y,dx,dy,frames);
		break;
	case (rock.type_id):
		var object = new rock(++count,x,y,dx,dy,frames);
		break;
	case (metal.type_id):
		var object = new metal(++count,x,y,dx,dy,frames);
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
}

function h(centerx,centery,sideLength){
	this.id = ++HEX_COUNT;
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
	//function to export this particles state to JSON
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
	this.addIJK = function(p, IJK){
		var IJKarray = IJK.split(" ");
			p.dx = 0;p.dy=0;
			p.hex = this.id;
			p.i = parseInt(IJKarray[0]);
			p.j = parseInt(IJKarray[1]);
			p.k = parseInt(IJKarray[2]);
			//TODO: determine why this is sometimes returning undefined...
			var op = this.remove(IJK);
			if (op)
				op.kill();
			//op is kill. no.
			this.tiles[IJK] = p;
			//p.size = this.s*5/4;
			this.mass += p.mass;
			this.maxD = ma.max(this.maxD , distance(this.cx,this.cy,p.x,p.y));
			p.updateXY();
			this.tiles.length++;
	}
	this.remove = function(key){
		var p = this.tiles[key];
		if (typeof p === "undefined"){
			return false;
		}else{
			delete this.tiles[key];
			this.tiles.length--;
			p.hex = false;
			this.mass -= p.mass;
			return p;
		}
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
	this.lastCollision = time;
	//this.size = 2;
	
	//dynamic hexing. for now, YOU CANT HANDLE DIS
	this.hex = false;
	//grav hex coordinates
	this.i = 0; //r
	this.j = 0; //g
	this.k = 0; //b
	
	this.earlyEscape = function(p){
		escapeCheck++;
		if (this.x == p.x && this.y == p.y)
			return true;
		escapeCheck++;
		var dist = ma.sqrt(((this.x - p.x)*(this.x - p.x)) + ((this.y - p.y)*(this.y - p.y)));
		var sumRadii = (p_size);
		/*if (dist > sumRadii)
			return true;*/
		var mag = this.speed;
		//var mag = ma.sqrt(this.dx * this.dx + this.dy * this.dy);
		dist -= sumRadii;
		if(mag < dist){
		  return false;
		}
		escapeCheck++;
		if (mag == 0)
			var thisNorm = [0,0];
		else	var thisNorm = [this.dx/mag,this.dy/mag];
		escapeCheck++;
		var vectorto = [p.x - this.x, p.y - this.y];

		var D = thisNorm[0] * vectorto[0] + thisNorm[1] * vectorto[1];

		if(D <= 0){
		  return false;
		}
		escapeCheck++;
		var vectortoMag = ma.sqrt(vectorto[0] * vectorto[0] + vectorto[1] * vectorto[1]);

		var F = (vectortoMag * vectortoMag) - (D * D);

		var sumRadiiSquared = sumRadii * sumRadii;
		if(F >= sumRadiiSquared){
		  return false;
		}
		escapeCheck++;
		var T = sumRadiiSquared - F;

		if(T < 0){
		  return false;
		}
		escapeCheck++;
		var dist2 = D - ma.sqrt(T);

		if(mag < dist2){
		  return false;
		}
		escapeCheck++;
		if (p.hex){
			this.x += thisNorm[0]*dist2;
			this.y += thisNorm[1]*dist2;
		} else{
			this.x += thisNorm[0]*dist2;
			this.y += thisNorm[1]*dist2;
		}
		escapeCheck++;
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
	var thisTypeArray = types_array[this.type_id]
	for (var x=0; x < thisTypeArray.length;x++){
		if (thisTypeArray[x] === this){
			thisTypeArray.splice(x,1);
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
			for (var i in hexes){
				var dd = distance(this.x,this.y,hexes[i].cx,hexes[i].cy)/4;
				if (dd<hexes[i].maxD) dd = hexes[i].maxD;
				var drx = (hexes[i].cx - this.x)/(dd*dd);
				var dry = (hexes[i].cy - this.y)/(dd*dd);
				ddx += (drx * GRAVITY) * hexes[i].mass/4;
				ddy += (dry * GRAVITY) * hexes[i].mass/4;
			}
		}
		/*if (particlegrav)
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
		}*/
		this.dx += ddx;
		this.dy += ddy;
};
var maxw=0;
var avgw = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
p.prototype.step = function(ctx){
	this.speed = ma.sqrt(this.dx * this.dx + this.dy * this.dy);
	if (this.hex!=false){
	
		//do hex test stuff
		
		//new style, better falling.
		//based on the Centered hexagonal number formula 3n(n-1)+1 = total
		//3n(n-1)+1 = t
		//3n2 - 3n +1 = t
			var hSize = hexes[this.hex].tiles.length/2;
			if (this.i<0) var ineg = true;
			if (this.j<0) var jneg = true;
			if (this.k<0) var kneg = true;
			
			//oddlyInaccurateCenteredHexQuadraticSolver(t)
			//(-b + ma.sqrt((b*b)-(4*a*c)))/a*2
			
			//calculate weights based on optimal hex radius
			var optimal = oddlyInaccurateCenteredHexQuadraticSolver(hSize);
			
			
			//weights in each dimension
			var weights = [
				["i", ma.abs(this.i)/optimal],
				["j", ma.abs(this.j)/optimal],
				["k", ma.abs(this.k)/optimal]
			]
			
			weights.sort(
				function(a, b)
				{	return (	ma.abs(b[1]) - ma.abs(a[1])		)
				}
			);
		
			//maxw = ma.max(ma.abs(weights[0][1]),maxw);
			avgw.push(weights[0][1]);
			avgw.shift();
			var totalw = 0;
			for (var i=0;i<avgw.length;i++){
				totalw += avgw[i];
			}
			var averagew = totalw / avgw.length;
			
			
			$('#poss').html(optimal.toFixed(1) +" "+averagew.toFixed(2));
		//end hex test stuff
	
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
		if (frames%4==0)
			this.gravitate();
		//gravity, air resistance
		this.dx *= 1-(AIR_RESISTANCE*this.speed);
		this.dy *= 1-(AIR_RESISTANCE*this.speed);
		//collide only with quadtree friends
		//check particles
		var possible = tree.retrieve(this);
		if(hex_ready && hexes.length==0 && possible.length>(particles.length/40))
			{
			hex_ready = false;
			var thisHex = new h(this.x,this.y,p_size);
			hexes[HEX_COUNT]=thisHex;
			this.freeze = true;
			this.mass = 15;
			thisHex.add(this);
			chexHex();
			}
			
		//hack to include root. TODO: figure out why this is not always included -- FIXED
		//if (hexes[HEX_COUNT] && hexes[HEX_COUNT].tiles["0 0 0"]) possible.push(hexes[HEX_COUNT].tiles["0 0 0"]);
		//ignore 
		
		if (frames - this.lastCollision > 3)
			if (possible.length>1)
				for (var i=0;i<possible.length;i++){
						if (!(possible[i]===this))
								if (this.hex == false)
										this.collide(ctx,possible[i]);
				}
			 
		//bounce, boundaries
		if (this.x < 0){
			this.dx = ma.abs(this.dx *BOUNCE) + BOUNCE_MIN;
		}
		else if (this.x > CANVAS_WIDTH){
			this.dx = -ma.abs(this.dx *BOUNCE) - BOUNCE_MIN;
		}
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
			if (that.hex != false){
				//check speed. if fast enough, bounce
				if (this.speed > 4 && !that.freeze && that.i!=0 && that.j!=0 && that.k!=0 && frames - this.lastCollision > 1){
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
						var mag = ma.sqrt(tx * tx + ty * ty)/3;
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
						    

						    //draw boom when bounce
						    if (fx + fy > 0.2)
						    drawBoom(ctx,this.x,this.y,8,"#FFC1A9",0.9);
						    
						    //set collision delay, to avoid runs
						    this.lastCollision = frames;
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
					    
					    //draw bounce
					    if (fx + fy > 0.4)
						    drawBoom(ctx,this.x,this.y,8,"#FFC1A9",0.9);

					    //set collision delay, to avoid runs
					    this.lastCollision = frames;
			}
		}
};

//utility functions
function drawPolygon(ctx,x,y,size,numOfSides) {
	ctx.beginPath();
	ctx.moveTo (x +  size * ma.sin(0), y +  size *  ma.cos(0));          
 
	for (var i = 1; i <= numOfSides;i++) {
	    ctx.lineTo (x + size * ma.sin((i * 2 * (ma.PI) / numOfSides)), y + size * ma.cos((i * 2 * (ma.PI) / numOfSides)));
	}
	ctx.closePath();
	ctx.fill();
}

function drawBoom(ctx,x,y,s,color,opacity){
	//stash old fillstyle first
	var prevStyle = ctx.fillStyle;
	
	ctx.fillStyle = color;
	ctx.globalAlpha = opacity;
	ctx.fillRect(x-(s/2), y-(s/2), s, s);	
	ctx.globalAlpha = 1;
	
	ctx.fillStyle = prevStyle;
}

function distance(x1,y1,x2,y2){
	 return ma.sqrt(((x1 - x2)*(x1 - x2)) + ((y1 - y2)*(y1 - y2)));
}

Array.prototype.remove = function(object) {
	this.splice(this.indexOf(object),1);
	return this;
	};
	
//solve quadratic, useful for determining optimal radius of hex.
	//May be too expensive, may not need this accuracy
function quadraticSolver(a,b,c){
	return (-b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
}
//a=3 b=-3 c=-t+1
/*function centeredHexQuadraticSolver(t){
	return quadraticSolver(3,-3,-t+1);
}*/
//precompute
//weird, when done like this it's always off a tiny tiny amount. luckily I dont need accuracy so...
//named weird so I dont forget, TODO: deal with this later maybe, at least test
function oddlyInaccurateCenteredHexQuadraticSolver(t){
	return (3 + Math.sqrt(9 - (12 * -t+1))) / (6);
}

function findLoose(hex){
	var ret = [];
	for (var i=0;i<particles.length;i++){
		if (!hexes[particles[i].hex])
			ret.push(particles[i]);
			}
	return ret;
}

	
