//gravitate.js:

var GRAVITY = 0.07;
var ma = Math;

function messageHandler(event) {	
    // Accessing the message data sent by the main page
    var message = event.data;
    if (message.grav){
    	var particle_ref = JSON.parse(message.particle_ref);
	    	var ret = grav(particle_ref);
	    	this.postMessage(ret);
    }
    else if (message.init){
    	init();
   	 this.postMessage({status:"init_success"});
    }
    
    //this.postMessage(JSON.stringify({type:"success",result:{a:a,b:b,removeB:removeB,addA:addA,interactAB:interactAB}}));
}

// Defining the callback function raised when the main page will call us
this.addEventListener('message', messageHandler, false);

function init(){
//do init stuff? idk LOL

}

function grav(particle_ref){
	var interactions = 0;
	var result = {};
	for (var p in particle_ref){
		result[p] = {dx: 0, dy: 0};
	}

	for (var p in particle_ref){
		var this_p = particle_ref[p];
		var ddx = 0;
		var ddy = 0;
			
			//Do gravitation for particles passed in
				for (var o in particle_ref){
					var that_p = particle_ref[o];

					if (!(that_p === this_p || that_p.hex)){
						var dd = distance(this_p.x,this_p.y,that_p.x,that_p.y)/4;
						if (dd<2) dd=2;
						var drx = (that_p.x - this_p.x)/(dd*dd);
						var dry = (that_p.y - this_p.y)/(dd*dd);
						ddx += ((drx * GRAVITY) * that_p.mass)/4;
						ddy += ((dry * GRAVITY) * that_p.mass)/4;

						result[that_p.id].dx -= ((drx * (GRAVITY*2)) * this_p.mass)/4;
						result[that_p.id].dy -= ((dry * (GRAVITY*2)) * this_p.mass)/4;
						interactions++;
					}
				}

		result[this_p.id].dx -= ddx;
		result[this_p.id].dy -= ddy;

	}//end for in hex
	//return something
	var ret = {};
	ret.status = 'grav_success';
	ret.result = result;
	ret.interactions = interactions;
	return ret;
}

function distance(x1,y1,x2,y2){
	 return ma.sqrt(((x1 - x2)*(x1 - x2)) + ((y1 - y2)*(y1 - y2)));
}