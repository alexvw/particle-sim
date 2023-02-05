var keys = new Array();fps = new Array(60,60,60,60,60,60,60,60,60,60,60,60,60,60,60
		,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60
		,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60);
var escapeCalc = new Array(0,0,0,0,0,0,0,0,0,0);
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
var hexes = [];
var CANVAS_WIDTH,CANVAS_HEIGHT = 0;
var HEX_COUNT = 0;
var COLLISION_DISTANCE = 2;
var GRAVITY = 0.02;
var BOUNCE = 0.9;//0.51;
var BOUNCE_MIN = 0.1;
var AIR_RESISTANCE = 0.0002;
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
var density = 0;
var hex_ready = false;

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


	//spawn threads to handle gravitation
	initGravitateWorkers(2);
	
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
	c.width = width-100;
	c.height = height;
	
	c.onselectstart = function () { return false; } // ie
	c.onmousedown = function () { return false; }// mozilla
	c.onmousemove = function() { return false; }
	
    ctx = c.getContext('2d');
	
	CANVAS_WIDTH = $('#c').width();
	CANVAS_HEIGHT = $('#c').height();
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

function randomDirt(amt,energy){
	for (var i=0;i<amt;i++){
		spawn(dirt.type_id,ma.random()*CANVAS_WIDTH,ma.random()*CANVAS_HEIGHT,(ma.random()*energy)-energy/2,(ma.random()*energy)-energy/2,frames);
	}
}

function goClick(x,y,dx,dy){
	var mode = $('#click_mode').val();
	switch (mode){
	default:
		spawn(mode,x,y,dx,dy,frames);
		break;
	}
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
		ctx.globalAlpha = 0.49;
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
		if (types_array[i].length){
			var this_type = types_array[types[i].type_id];
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
	var total =0;
	var i=0;
	while (i<fps.length){
		total += fps[i++];
	}
	real_fps = total/fps.length;
	
	//get average escapeCAlc
	escapeCalc.push(escapeCheck);
	escapeCalc.shift();
	var total = 0;
	i=0;
	while (i<escapeCalc.length){
		total += escapeCalc[i++];
	}
	avg_escape = total/escapeCalc.length;
	density = avg_escape/particles.length;
	
	if (density>22 && hexes.length==0)
		hex_ready = true;
	
	$('#info').html(particles.length + "p " +(real_fps).toFixed(1) + "FPS "+max_dx.toFixed(0) + " / " + max_dy.toFixed(0) + "  EC: "+(avg_escape).toFixed(1) + "  EC/#p: "+ (density).toFixed(1));
	
	escapeCheck = 0;
	
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
