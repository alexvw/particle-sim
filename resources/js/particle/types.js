
var types = [salt,dirt,rock,metal,miracle,magma,water];

function salt(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.color = "#efefef";
    this.mass = 1;
    //this.size = 3;
    this.viscosity = 0.5;
    this.type_id = salt.type_id;
}
// setting up the inheritance
salt.prototype = Object.create( p.prototype );

function dirt(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.color = "#807753";
    this.mass = 1;
    //this.size = 5;
    this.viscosity = 0.2;
    this.type_id = dirt.type_id;
}
// setting up the inheritance
dirt.prototype = Object.create( p.prototype );

function rock(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.color = "#aaa";
    this.mass = 2;
    //this.size = 4;
    this.viscosity = 0.1;
    this.type_id = rock.type_id;
}
// setting up the inheritance
rock.prototype = Object.create( p.prototype );

function metal(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.color = "#778";
    this.mass = 3;
    //this.size = 4;
    this.viscosity = 0.1;
    this.type_id = metal.type_id;
}
// setting up the inheritance
metal.prototype = Object.create( p.prototype );

function miracle(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.color = "#f11";
    this.mass = 10;
    //this.size = 4;
    this.viscosity = 1;
    this.type_id = miracle.type_id;
    
    this.draw = function(ctx,x,y,s){
    	ctx.fillStyle = "hsl(" + (this.birth+frames*2)%255+",100%,60%)";
		ctx.fillRect(x-(s/2), y-(s/2), s, s);
    };
}
// setting up the inheritance
miracle.prototype = Object.create( p.prototype );

function magma(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.color = "#F99";
    this.mass = 4;
    //this.size = 4;
    this.viscosity = 0.7;
    this.type_id = magma.type_id;
    
    this.draw = function(ctx,x,y,s){
    	if (ma.random() > 0.3) ctx.fillStyle = "hsl(" + (this.birth*2+frames/4)%30+",100%,"+ (50+((frames/2)%20) ) + "%)";
		ctx.fillRect(x-(s/2), y-(s/2), s, s);
    };
}
// setting up the inheritance
magma.prototype = Object.create( p.prototype );

function water(id,x,y,dx,dy,time) {
    p.call( this,id, x,y,dx,dy,time );
    this.color = "#3aF";
    this.mass = 1;
    //this.size = 3;
    this.viscosity = 1;
    this.type_id = water.type_id;
    
    this.draw = function(ctx,x,y,s){
		ctx.fillRect(x-((s+2)/2), y-((s+2)/2), (s+2), (s+2));
    };

}
// setting up the inheritance
water.prototype = Object.create( p.prototype );
