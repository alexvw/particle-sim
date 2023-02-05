//check.js


function messageHandler(event) {	
    // Accessing the message data sent by the main page
    var message = event.data;
    if (message.check){
    	var inHex = JSON.parse(message.hex);
    	if (inHex.t_count > 3)
    	{
	    	var ret = check(inHex.basic);
	    	this.postMessage(ret);
	    }
    }
    else if (message.init){
    	init(message.sendtypes);
   	 this.postMessage({status:"init_success"});
    }
    
    //this.postMessage(JSON.stringify({type:"success",result:{a:a,b:b,removeB:removeB,addA:addA,interactAB:interactAB}}));
}

// Defining the callback function raised when the main page will call us
this.addEventListener('message', messageHandler, false);


//store the assembly objects
/* id = id;
 * start_p = type_id;
 * ps = [
 * [id, i, j, k]
 * ]
 */
var get_new_a_id = 0;
//initially hold all assemblies
var ass_list = [];
//one object for each type of particle
//TODO: initialize for each type
var type_list = {};

//assembly object. Exists for prototyping purposes 
function a(start_p_type,ps,rs){
	//assembly id
	this.id = ++get_new_a_id;
	//starting particle type id
	this.sp = start_p_type;
	//list of particles to match against
	this.ps = ps;
	//list of particles with which to replace when found
	this.rs = rs;
}

function init(types_in){
	var EMPTY = -1;
	var t = new Array();
	for (x in types_in){
		t[types_in[x][0]] = types_in[x][1];
	}
	
	ass_list.push( 
			new a(t['dirt'],[
			         [t['dirt'], 1, -1, 0],
			         [t['dirt'], 1, 0, -1],
		           	],
		           	[
						[EMPTY, 1, -1, 0],
						[EMPTY, 1, 0, -1],
						[t['rock'],0,0,0]
		           	]
				) );
	
	ass_list.push( 
			new a(t['rock'],[
			         [t['rock'], 1, -1, 0],
			         [t['rock'], 1, 0, -1],
		           	],
		           	[
						[EMPTY, 1, -1, 0],
						[EMPTY, 1, 0, -1],
						[t['metal'],0,0,0]
		           	]
				) );
	
	ass_list.push( 
			new a(t['dirt'],[
			         [t['dirt'], 1, -1, 0],
			         [t['dirt'], -1, 1, 0],
			         [t['dirt'], -1, 0, 1],
			         [t['dirt'], 1, 0, -1],
			         [t['dirt'], 0, 1, -1],
			         [t['dirt'], 0, -1, 1]
		           	],
		           	[
						[EMPTY, 1, -1, 0],
						[EMPTY, -1, 1, 0],
						[EMPTY, -1, 0, 1],
						[EMPTY, 1, 0, -1],
						[EMPTY, 0, 1, -1],
						[EMPTY, 0, -1, 1],
						[t['metal'],0,0,0]
		           	]
				) );
	
	ass_list.push( 
			new a(t['metal'],[
			         [t['metal'], 1, -1, 0],
			         [t['metal'], -1, 1, 0],
			         [t['metal'], -1, 0, 1],
			         [t['metal'], 1, 0, -1],
			         [t['metal'], 0, 1, -1],
			         [t['metal'], 0, -1, 1]
		           	],
		           	[
						[EMPTY, 1, -1, 0],
						[EMPTY, -1, 1, 0],
						[EMPTY, -1, 0, 1],
						[EMPTY, 1, 0, -1],
						[EMPTY, 0, 1, -1],
						[EMPTY, 0, -1, 1],
						[t['magma'],0,0,0]
		           	]
				) );
	
	//init function:
	//for each assembly object
	for (var i=0;i<ass_list.length;i++){
	// check the start type, go to that object
		//create if not exist
		if (typeof type_list[ass_list[i].sp] === "undefined"){
			type_list[ass_list[i].sp] = {as: [], ps: [], rs:[]}
		}
		var this_type = type_list[ass_list[i].sp];
	// add the assembly id to the totals list, and set total=total and found=0
		this_type.as[ass_list[i].id] = {total: ass_list[i].ps.length, found: 0};
		this_type.rs[ass_list[i].id] = ass_list[i].rs;
	// for each particle in this assembly
		for (var x=0;x<ass_list[i].ps.length;x++){
		//  add the a.id to the ps[] location list at p_type_id
			//no list at this spot yet
			if (typeof this_type.ps[ass_list[i].ps[x][1]+" "+ass_list[i].ps[x][2]+" "+ass_list[i].ps[x][3]] === "undefined" )
				this_type.ps[ass_list[i].ps[x][1]+" "+ass_list[i].ps[x][2]+" "+ass_list[i].ps[x][3]] = {ijk:{i:ass_list[i].ps[x][1],j:ass_list[i].ps[x][2],k:ass_list[i].ps[x][3]}};
			if (typeof this_type.ps[ass_list[i].ps[x][1]+" "+ass_list[i].ps[x][2]+" "+ass_list[i].ps[x][3]][ass_list[i].ps[x][0]] === "undefined" )
				this_type.ps[ass_list[i].ps[x][1]+" "+ass_list[i].ps[x][2]+" "+ass_list[i].ps[x][3]][ass_list[i].ps[x][0]] = [];
			this_type.ps[ass_list[i].ps[x][1]+" "+ass_list[i].ps[x][2]+" "+ass_list[i].ps[x][3]][ass_list[i].ps[x][0]].push(ass_list[i].id);
			// :O it works, what a fkg miracle. SRSLY how the hell does the code above work perfectly the first run through? Not to mention it was a webworker so coded (mostly) blindly...
		}
	}
}

/*function addStrings(first, second){
	var firstArr = first.split(" ");
	var secondArr = second.split(" ");
	var returnArr = [];
	for (var i=0;i<firstArr.length;i++){
		returnArr.add(parseInt(firstArr[i]) + parseInt(secondArr[i]));
	}
	return returnArr.join(" ");
}*/
function addToArr(string, arr){
	var firstArr = string.split(" ");
	var returnArr = [];
	for (var i=0;i<firstArr.length;i++){
		returnArr.push(parseInt(firstArr[i]) + parseInt(arr[i+1]));
	}
	return returnArr.join(" ");
}

function check(hex){
	var result = {};
	var calc =0;
	/* Not needed? not sure if even faster...
			var check_list = [];
			//hex data to be returned at the end
			var ret_hex = {};
			//run through the hex, add each particle to its appropriate check_list (sweet var name, huh)
			for(var i=0;i<hex.length;i++){
				//for each particle in the original hex
				//if no check_list for this type exists, 
				if (check_list[hex[i].type] typeof undefined)
					//create a new list
					check_list[hex[i].type] = [];
				//add this particle to the list
				check_list[hex[i].type].add(hex[i]);
	}*/
//for each particle in the hex
//FUCK IT WE'LL DO IT LIVE
//BRUTE FORCE 
	//convert incoming hex list into native hex object
	for (h in hex){
		var h = hex[h];
		//for each spot in the lookup object for this particle type
		var this_list = type_list[h.type_id];
		//check if no assemblies of this type. if so, continue on
		if (typeof this_list === "undefined"){
			//no type, do something 
		}else{
			//assembly exists, move on
			//reset found counts
			for (a in this_list.as){
				this_list.as[a].found = 0;
			}
			
			//check for the other particles in the assembly
			for (x in this_list.ps){
				//check if there is a particle at this spot
				//console.log("checking "+(h.i+this_list.ps[x].ijk.i) + " " + (h.j+this_list.ps[x].ijk.j) + " " + (h.k+this_list.ps[x].ijk.k));
				var h_p = hex[(h.i+this_list.ps[x].ijk.i) + " " + (h.j+this_list.ps[x].ijk.j) + " " + (h.k+this_list.ps[x].ijk.k)];
				
				if (typeof h_p === "undefined"){
					//no particle here, could not possibly finish the assembly, break out. 
					break;
				}else{
					//found a particle, check its type
					var p_here= h_p.type_id;
					//check for array at # matching type
					if (typeof this_list.ps[x][p_here] === "undefined"){
						//not found
						//if not, cancel out the assemblies for that object. 
						//once no assemblies left, break.
						for (a in this_list.ps[x]){
							if (a != "ijk")
							for (b in this_list.ps[x][a])
								this_list.as[this_list.ps[x][a][b]].found = -1;
						}
					}
					else{
						//found, ++counter for the assemblies in that spot. 
						for (a in this_list.ps[x][p_here]){
							//make sure its not a false
							var b = this_list.ps[x][p_here][a];
							if (this_list.as[b].found != -1){
								this_list.as[b].found++;
								//check for full matches
								//if counter=limit
								if (this_list.as[b].found == this_list.as[b].total){
									//apply assembly to ret_hex:
										for (var f in this_list.rs[b]){
											var newLoc = addToArr(h.i+" "+h.j+" "+h.k, this_list.rs[b][f]);
											var newType = this_list.rs[b][f][0];
												result[newLoc] = newType;
												calc++;
										}
								}
								
							}
						} 
					}//end else
				}//end check if particle is here
			}//end for each in type
		}//end check if assembly exists
	}//end for in hex
	//return something
	var ret = {};
	ret.status = 'check_success';
	ret.result = result;
	ret.calc = calc;
	return ret;
}