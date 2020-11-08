var app, dynamic_viewport, static_viewport, ui_viewport, game_res, init_res, gun_data, enemy_data, game, game_tick=0, game,start_screen,win_screen, lose_screen, missions_screen, map_data,global_state, lm_down=false, global_process_func=function(){},wasd=[0,0,0,0];
const pi_div2=Math.PI/2,pi=Math.PI,pi_mul2=Math.PI*2;
expl_anim_files = [29,39,42];


function norm_0_360(val)
{
	if (val>=0 && val<pi_mul2)
		return val;
	
	val+=pi_mul2;
	return val % (pi_mul2);				
}

class bullet_class extends PIXI.Sprite
{

	constructor()
	{
		super();
		this.dx=0;
		this.dy=0;
		this.anchor.set(0,0.5);
		this.texture=game_res.resources["bullet_0"].texture;
		this.tx=0;
		this.ty=0;
		this.pp=0;
		this.max_pp=3;
	}
	
	activate(sx, sy, tx, ty, dist, rot, bullet_level)
	{	
		this.texture=game_res.resources["bullet_"+bullet_level].texture;
		this.rotation=0;
		this.pp=0;
		this.tx=tx;
		this.ty=ty;
		this.x=sx;
		this.y=sy;
		this.dx=tx-sx;
		this.dy=ty-sy;
		
		this.max_pp=4;
		/*if (dist<250)
			this.max_pp=30
		else
			this.max_pp=6;*/
		
		this.width=dist/this.max_pp;
		this.dx=this.dx/dist;
		this.dy=this.dy/dist;		
		this.dx*=this.width;
		this.dy*=this.width;
		this.x-=this.dx;
		this.y-=this.dy;
		this.visible=true;
		this.rotation=rot;
	}
	
	process()
	{
		this.x+=this.dx;
		this.y+=this.dy;
		this.pp++;
		if (this.pp>this.max_pp)
			this.visible=false;
	}
	
}

class gun_class
{
	
	constructor(id)
	{
		this.gun_id=id;
		this.last_fire_time=0;
		this.last_state_time=0;
		this.holster_size=0;
		this.ammo=0;
		this.ammo2=0;
		this.state="idle";
		this.process_func=function(){};
		this.range=gun_data[this.gun_id][0];
		this.fire_delay=gun_data[this.gun_id][2];
		this.damage=gun_data[this.gun_id][4];
		this.x=400;
		this.y=300;	
	}
	
	draw_and_init()
	{		
		this.process_func=this.process;
		this.visible=false;
		this.holster_size=gun_data[this.gun_id][1];
		this.ammo=gun_data[this.gun_id][1];
		this.ammo2=0;
	}
		
	upgrade()
	{
		this.gun_id++;
		if (this.gun_id>=gun_data.length)
		{
			this.gun_id--;
			game.send_message("--- max gun upgrade reached ---");
			return this.gun_id;
		}
			
		game.send_message("--- gun upgraded ---");	
		this.range=gun_data[this.gun_id][0];
		this.holster_size=gun_data[this.gun_id][1];			
		this.fire_delay=gun_data[this.gun_id][2];	
		this.damage=gun_data[this.gun_id][4];	
		return this.gun_id;		
	}
	
	fire(sx, sy, tx, ty, dist, rot)
	{		
		
		if (game_tick>this.last_fire_time+this.fire_delay)
		{			
			if (this.ammo>0)
			{			
				dist=Math.min(dist,this.range);
				game.add_bullet(sx, sy, tx, ty, dist, rot,this.gun_id)	
				this.last_fire_time=game_tick;
				this.ammo--;				
				return 1;
			}	
			else
			{				
				this.last_fire_time=game_tick;	
				return 2;
			}				
		}
				
		return 0;
	}
	

}

class enemy_class extends PIXI.Container
{
	constructor(obj_id, base_id)
	{		
		super();
		this.class="ENEMY";
		this.obj_id=obj_id;
		this.next_state="";
		this.collision=[];
		this.base_id=base_id;
		this.type=map_data[obj_id]["type"];	
		this.reuse=map_data[obj_id]["reuse"];	
		this.tar_node=map_data[obj_id]["node"];		
		this.watch=map_data[obj_id]["watch"];	
		this.tar_x=0;
		this.tar_y=0;
		this.region=map_data[obj_id]["region"];
		this.path_graph=JSON.parse(game_res.resources["path_graph"].data);		
		this.x=map_data[obj_id]["pos"][0];
		this.y=map_data[obj_id]["pos"][1];
		this.life_lev=100;
		
		
		//добавляем уровень жизни		---------------------------------------------------------
		this.sprite_obj=new PIXI.Sprite(game_res.resources["enemy_"+this.type].texture);
		this.sprite_obj.anchor.set(0.5,0.5);
		
		this.sprite_hit=new PIXI.Sprite(game_res.resources["enemy_hit"].texture);
		this.sprite_hit.anchor.set(0.5,0.5);

		let tex=new PIXI.Texture(game_res.resources["health_head"].texture, new PIXI.Rectangle(0, 22, 34, 10))
		this.life_lev_back=new PIXI.Sprite(tex);
		this.life_lev_back.anchor.set(0,0.5);
		this.life_lev_back.y=-20;
		this.life_lev_back.x=-17;
		
		tex=new PIXI.Texture(game_res.resources["health_head"].texture, new PIXI.Rectangle(3, 32, 28, 10))
		this.life_lev_front=new PIXI.Sprite(tex);
		this.life_lev_front.anchor.set(0,0.5);
		this.life_lev_front.y=-20;
		this.life_lev_front.x=-17+3;
		
		
		this.addChild(this.life_lev_back,this.life_lev_front,this.sprite_obj,this.sprite_hit);
		//---------------------------------------------------------------------------------------

		this.radius=(this.sprite_obj.width+this.sprite_obj.height)/4;

		this.wait_time_d=enemy_data[this.type]["wait_time"];
		this.w_speed_d=enemy_data[this.type]["w_speed"];
		this.r_speed_d=enemy_data[this.type]["r_speed"];
		this.suspision_time_d=enemy_data[this.type]["suspision_time"];	
		

		
		this.wait_time=this.wait_time_d;
		this.w_speed=this.w_speed_d;
		this.r_speed=this.r_speed_d;
		this.suspision_time=this.suspision_time_d;
		
			
		this.dist_to_player=9999;
		this.ang_to_player=pi;
		this.ang_to_player2=pi;
		this.ray_pass=false;
		
		this.reuse_time=3;
		this.state_change_time=0;
				
		this.dx=0;
		this.dy=0;
		
		this.process_func=function(){};
		
		this.gun=new gun_class(enemy_data[this.type]["gun_id"]);
		
		this.draw_and_init();
	}
	
	draw_and_init()
	{
		this.gun.draw_and_init();		
		this.gun.ammo=1000;
		this.sprite_hit.visible=false;
		this.x=map_data[this.obj_id]["pos"][0];
		this.y=map_data[this.obj_id]["pos"][1];
		this.x_shift=Math.random()*16-8;
		this.y_shift=Math.random()*16-8;
		this.set_health(100);
		this.tar_node=map_data[this.obj_id]["node"];			
		this.sprite_obj.rotation=map_data[this.obj_id]["rotation"];
		this.tar_rot=0;
		this.inc_rot=0;	
		if (this.watch===1)
			this.set_state("watch");	
		else
			this.set_state("rot_to_cur_tar");	
		
		this.alpha=1;	
				
		if (this.base_id===-1)
			this.visible=true;	
		else
			this.visible=false;		
	}
	
	hide(cur_ind)
	{		
		if (cur_ind===this.base_id)
			this.visible=true;	
		else
			this.visible=false;	
	}
	
	show()
	{
		if (this.state!=="inactive")
		{
			if (this.base_id===-1)
				this.visible=true;	
			else
				this.visible=false;		
		}
		
	}
	
	set_health(amount)
	{
		
		this.life_lev=amount;
		this.life_lev_front.scale.x=1;
	}
	
	drop_life(amount)
	{
		
		this.sprite_hit.visible=true;
		this.sprite_hit.alpha=1;
		
		this.life_lev-=amount;
		this.life_lev_front.scale.x=this.life_lev/100;
		if (this.life_lev<=0)
		{		
			this.life_lev_front.scale.x=0;
			this.life_lev=0;
			this.set_state("dead");
		}
		
	}
	
	mod(a, n)
	{		
		return a - Math.floor(a/n) * n;
	}
	
	on_screen()
	{
		if (this.x>game.eye_x+400)
			return false;
		if (this.x<game.eye_x-400)
			return false;
		if (this.y>game.eye_y+300)
			return false;
		if (this.y<game.eye_y-300)
			return false;
		return true;		
	}
	
	set_next_point()
	{
		//choose next point randomly from graph
		var dist_nodes_cnt=this.path_graph[this.tar_node].length-2;
		var rnd_dist_node=Math.floor(Math.random()*dist_nodes_cnt);
		this.tar_node=this.path_graph[this.tar_node][rnd_dist_node+2];
		this.retarget();
	}
	
	retarget()
	{			
		//estimating direction vectors
		this.tar_x=this.path_graph[this.tar_node][0]+this.x_shift;
		this.tar_y=this.path_graph[this.tar_node][1]+this.y_shift;
		var dx=this.tar_x-this.x;
		var dy=this.tar_y-this.y;
		var d=Math.sqrt(dx*dx+dy*dy);
		this.dx=dx/d*this.w_speed;
		this.dy=dy/d*this.w_speed;	
		
		this.tar_rot=norm_0_360(Math.atan2(dy,dx));	// 0-360	
		var ang_diff=this.tar_rot-this.sprite_obj.rotation;

		if (ang_diff>pi)
			ang_diff-=pi_mul2;
			
		if (ang_diff<-pi)
			ang_diff=pi_mul2+ang_diff;
		
		this.inc_rot=Math.sign(ang_diff)*this.r_speed;
	}
	
	fire()
	{		
		var res=this.gun.fire(this.x, this.y, game.player.x, game.player.y,this.dist_to_player, this.sprite_obj.rotation);	
		if( res===1)
		{
			game.player.change_health(-5);			
			game.red_screen.visible=true;
		}

	}
	
	set_state(state, next_state)
	{	
		
		switch (state)
		{			
			case "go_to_tar":
				//console.log("go to target: "+this.tar_node);
				this.state="go_to_tar";
				this.state_change_time=game_tick;
				this.process_func=this.process_go_to_tar;								
			break;
			
			case "rot_to_new_tar":				
				this.set_next_point();
				//console.log("rotate to new target: "+this.tar_node);	
				this.process_func=this.process_rot_to_tar;	
			break;	
				
			case "suspision":	
				if (this.state==="fire"|| this.state==="suspision")
					break;
				
				//console.log("suspision!");	
				this.state=state;
				this.process_func=this.process_suspision;	
				this.state_change_time=game_tick;
			break;	
			
			case "under_fire":			
				if (this.state==="suspision")
					return;			
				this.set_state("suspision");				
			break;
			
			case "alarmed":				
				//console.log("alarmed!");	
				this.process_func=this.process_alarmed;	
				this.state_change_time=game_tick;
			break;	
			
			case "rot_to_cur_tar":		
				this.state=state;
				this.retarget();
				//console.log("retarget: "+this.tar_node);	
				this.process_func=this.process_rot_to_tar;	
			break;			
						
			case "wait":			
				//console.log("waiting...");
				this.next_state=next_state;
				this.state_change_time=game_tick;
				this.process_func=this.process_wait;	
			break;	
						
			case "dead":
				this.state=state;
				this.state_change_time=game_tick;
				this.process_func=this.process_dead;	
				game.send_expl_as_blood(this.x+Math.random()*50-25, this.y+Math.random()*50-25,0);
			break;		
			
			case "inactive":
				game.add_bonus(this.x,this.y,this.base_id,this.visible);				
				this.state=state;
				this.state_change_time=game_tick;
				this.visible=false;
				this.reuse_time=Math.random()*5+3;
				this.process_func=this.process_inactive;				
			break;		
			
			case "fire":
				this.state=state;
				//console.log("start firing...");
				this.state_change_time=game_tick;
				this.process_func=this.process_fire;		
			break;	

			case "watch":
				this.state=state;
				//console.log("watch...");
				this.state_change_time=game_tick;
				this.process_func=this.process_watch;		
			break;		

			case "back_to_watch":
				this.state=state;
				this.retarget2();
				//console.log("back_to_watch...");
				this.state_change_time=game_tick;
				this.process_func=this.process_back_to_watch;		
			break;		
			
			
			
		}		
	}
			
	calc_relative_data()
	{
		var dx=game.player.x-this.x;
		var dy=game.player.y-this.y;
		this.dist_to_player=Math.sqrt(dx*dx+dy*dy)+(1-game.player.alive)*9999;
		this.ray_pass=game.ray_pass(game.player.x,game.player.y,this.x,this.y);
		var ang1=norm_0_360(Math.atan2(dy,dx));
		this.ang_to_player2=ang1;
		this.ang_to_player=pi - Math.abs(Math.abs(ang1 - this.sprite_obj.rotation) - pi); 		

	}

	process_under_fire()
	{		
		//обработка попаданий красным цветом
		if (this.sprite_hit.visible===true)
		{			
			this.sprite_hit.rotation=this.sprite_obj.rotation;
			this.sprite_hit.alpha-=0.05;
			if (this.sprite_hit.alpha<=0)
			{
				this.sprite_hit.alpha=1;
				this.sprite_hit.visible=false;				
			}			
		}
	}
	
	process_go_to_tar()
	{
		this.process_under_fire();
		this.calc_relative_data();
		if (this.ang_to_player<pi/3 && this.ray_pass===true && this.dist_to_player<this.gun.range && this.on_screen()===true)
			this.set_state("suspision");
		
		this.x+=this.dx;
		this.y+=this.dy;		
		
		var dx=this.tar_x-this.x;
		var dy=this.tar_y-this.y;
		var d=Math.sqrt(dx*dx+dy*dy);
		if (d<1)
			this.set_state("wait","rot_to_new_tar");				
	}
	
	process_watch()
	{
		this.process_under_fire();
		this.calc_relative_data();
		if (this.ang_to_player<pi/3 && this.ray_pass===true && this.dist_to_player<this.gun.range && this.on_screen()===true)
			this.set_state("suspision");
		
	}
	
	process_wait()
	{
		this.process_under_fire();
		this.calc_relative_data();		
		if (this.ang_to_player<pi/3 && this.ray_pass===true && this.dist_to_player<this.gun.range && this.on_screen()===true)
			this.set_state("suspision");
		
		if (game_tick>this.state_change_time+this.wait_time)
			this.set_state(this.next_state)			
	}
	
	process_alarmed()
	{
		this.process_under_fire();
		this.calc_relative_data();	
		if (this.ang_to_player<pi/3 && this.ray_pass===true && this.dist_to_player<this.gun.range && this.on_screen()===true)
			this.set_state("fire");
		
		if (game_tick>this.state_change_time+5)
			this.set_state("rot_to_cur_tar")			
	}
	
	process_suspision()
	{
		this.process_under_fire();
		
		if (game_tick>this.state_change_time+this.suspision_time)
		{
			this.calc_relative_data();
			if (this.ray_pass===true && this.dist_to_player<this.gun.range && this.on_screen()===true)
			{
				this.set_state("fire");
			}
			else
			{
				this.set_state("rot_to_cur_tar")	
			}
		}
	}
	
	process_rot_to_tar()
	{		
		this.process_under_fire();
		this.calc_relative_data();
		if (this.ang_to_player<pi/3 && this.ray_pass===true && this.dist_to_player<this.gun.range && this.on_screen()===true)
			this.set_state("suspision");
		
	
		this.sprite_obj.rotation+=this.inc_rot;
		this.sprite_obj.rotation=norm_0_360(this.sprite_obj.rotation);
		if (Math.abs(this.sprite_obj.rotation-this.tar_rot)<(Math.abs(this.inc_rot)+0.02))
		{
			this.sprite_obj.rotation=this.tar_rot;
			this.set_state("go_to_tar")				
		}	
	}
		
	process_dead()
	{		
		this.alpha-=0.05;
		if (this.alpha<=0)
			this.set_state("inactive");			
	}
				
	process_fire()
	{		

		this.process_under_fire();
		this.calc_relative_data();		

		if (this.ray_pass===false || this.dist_to_player>this.gun.range)
		{
			this.set_state("alarmed");					
			return;
		}
		this.sprite_obj.rotation=this.ang_to_player2;	
		this.fire();	
	}
			
	process_inactive()
	{		
		if (this.reuse===1)
		{
			if (game_tick>this.state_change_time+this.reuse_time)		
			{
				this.draw_and_init();	
				if (game.is_indoor===true)
					this.visible=false;
				else
					this.visible=true;
			}

		}
	}
	
}

class tank_class extends PIXI.Container
{
	
	constructor(obj_id)
	{
		super();
		this.class="ENEMY";
		this.obj_id=obj_id;
		this.next_state="";
		this.collision=[];
		//this.base_id=base_id;
		this.type=map_data[obj_id]["type"];	
		this.tar_node=map_data[obj_id]["node"];		
		this.region=map_data[obj_id]["region"];
		this.path_graph=JSON.parse(game_res.resources["path_graph"].data);		
		this.x=map_data[obj_id]["pos"][0];
		this.y=map_data[obj_id]["pos"][1];
		this.life_lev=150;
		
		
		//добавляем уровень жизни		---------------------------------------------------------
		this.sprite_obj=new PIXI.Sprite(game_res.resources["tank"].texture);
		this.sprite_obj.anchor.set(0.5,0.5);
		
		this.sprite_hit=new PIXI.Sprite(game_res.resources["tank_hit"].texture);
		this.sprite_hit.anchor.set(0.5,0.5);

		
		let tex=new PIXI.Texture(game_res.resources["health_head"].texture, new PIXI.Rectangle(0, 0, 50, 10))
		this.life_lev_back=new PIXI.Sprite(tex);
		this.life_lev_back.anchor.set(0,0.5);
		this.life_lev_back.y=-35;
		this.life_lev_back.x=-25;
		
		tex=new PIXI.Texture(game_res.resources["health_head"].texture, new PIXI.Rectangle(3, 10, 44, 10))
		this.life_lev_front=new PIXI.Sprite(tex);
		this.life_lev_front.anchor.set(0,0.5);
		this.life_lev_front.y=-35;
		this.life_lev_front.x=-25+3;
		
		this.addChild(this.life_lev_back,this.life_lev_front,this.sprite_obj,this.sprite_hit);
		//---------------------------------------------------------------------------------------

		this.radius=(this.sprite_obj.width+this.sprite_obj.height)/4;
		
		//определяем границы
		this.bb=[];
		this.bb[0] =this.x-this.sprite_obj.width/2;
		this.bb[1] =this.y-this.sprite_obj.width/2;
		this.bb[2] = this.x+this.sprite_obj.width/2;
		this.bb[3] = this.y+this.sprite_obj.width/2;

		

		this.wait_time=enemy_data[this.type]["wait_time"];
		this.w_speed=enemy_data[this.type]["w_speed"];
		this.r_speed=enemy_data[this.type]["r_speed"];
	
	
		this.tar_x=0;
		this.tar_y=0;

		this.dist_to_player=9999;
		this.ang_to_player=pi;
		this.ang_to_player2=pi;
		this.ray_pass=false;
		
		this.state_change_time=0;
				
		this.dx=0;
		this.dy=0;
		
		this.process_func=function(){};
		

		this.draw_and_init();
	}
	
	hide()
	{		
		this.visible=false;
	}
	
	show()
	{
		if (this.life_lev>0)
			this.visible=true;
	}
	
	mod(a, n)
	{		
		return a - Math.floor(a/n) * n;
	}
	
	draw_and_init()
	{
		this.sprite_hit.visible=false;
		this.x=map_data[this.obj_id]["pos"][0];
		this.y=map_data[this.obj_id]["pos"][1];
		//this.set_health(100);
		this.tar_node=map_data[this.obj_id]["node"];			
		this.sprite_obj.rotation=map_data[this.obj_id]["rotation"];
		this.tar_rot=0;
		this.inc_rot=0;
		this.visible=true;
		this.alpha=1;			
		this.retarget();				
		this.set_state("rot_to_cur_tar");		
	
	}
	
	drop_life(amount)
	{
		this.sprite_hit.visible=true;
		this.sprite_hit.alpha=1;
		
		this.life_lev-=amount*0.25;
		this.life_lev_front.scale.x=this.life_lev/150;
		if (this.life_lev<=0)
		{		
			this.life_lev_front.scale.x=0;
			this.life_lev=0;
			this.set_state("explode");
			return;
		}
		
		if (this.state!=="idle")
			this.set_state("rotate_to_player");	
	}
	
	retarget()
	{			
		//estimating direction vectors
		var dx=this.path_graph[this.tar_node][0]-this.x;
		var dy=this.path_graph[this.tar_node][1]-this.y;
		var d=Math.sqrt(dx*dx+dy*dy);
		this.dx=dx/d*this.w_speed;
		this.dy=dy/d*this.w_speed;	
		
		this.tar_rot=norm_0_360(Math.atan2(dy,dx));	// 0-360	
		var ang_diff=this.tar_rot-this.sprite_obj.rotation;

		if (ang_diff>pi)
			ang_diff-=pi_mul2;
			
		if (ang_diff<-pi)
			ang_diff=pi_mul2+ang_diff;
		
		this.inc_rot=Math.sign(ang_diff)*this.r_speed;
	}
		
	retarget_to_player()
	{			
		//estimating direction vectors
		var dx=game.player.x-this.x;
		var dy=game.player.y-this.y;
		var d=Math.sqrt(dx*dx+dy*dy);
		this.dx=dx/d*this.w_speed;
		this.dy=dy/d*this.w_speed;	
		
		this.tar_x=game.player.x;
		this.tar_y=game.player.y;

		
		this.tar_rot=norm_0_360(Math.atan2(dy,dx));	// 0-360	
		var ang_diff=this.tar_rot-this.sprite_obj.rotation;

		if (ang_diff>pi)
			ang_diff-=pi_mul2;
			
		if (ang_diff<-pi)
			ang_diff=pi_mul2+ang_diff;
		
		this.inc_rot=Math.sign(ang_diff)*this.r_speed;
	}

	goto_init_point()
	{			
		//estimating direction vectors
		var dx=this.path_graph[this.tar_node][0]-this.m_image.x;
		var dy=this.path_graph[this.tar_node][1]-this.m_image.y;
		var d=Math.sqrt(dx*dx+dy*dy);
		this.dx=dx/d;
		this.dy=dy/d;
		
		
		//estimation rotation data
		this.tar_rot=norm_0_360(Math.atan2(dy,dx));	// 0-360
		var ang_diff = this.mod(this.tar_rot - this.m_image.rotation + pi, pi_mul2) - pi;			
		this.inc_rot=Math.sign(ang_diff)/100.0;
		
		this.set_state("rotate");
	}
	
	set_next_point()
	{
		//choose next point randomly from graph
		var dist_nodes_cnt=this.path_graph[this.tar_node].length-2;
		var rnd_dist_node=Math.floor(Math.random()*dist_nodes_cnt);
		this.tar_node=this.path_graph[this.tar_node][rnd_dist_node+2]
		this.retarget();
	}
	
	set_state(state, next_state)
	{		
		
		switch (state)
		{

			case "go_to_tar":
				//console.log("go to target: "+this.tar_node);
				this.state=state;
				this.state_change_time=game_tick;
				this.process_func=this.process_go_to_tar;								
			break;
			
			case "rot_to_new_tar":				
				this.set_next_point();
				this.state=state;
				//console.log("rotate to new target: "+this.tar_node);	
				this.process_func=this.process_rot_to_tar;	
			break;		
			
			case "rot_to_cur_tar":				
				this.retarget();
				this.state=state;
				//console.log("rot_to_cur_tar: "+this.tar_node);	
				this.process_func=this.process_rot_to_tar;	
			break;	
			
			case "idle":
				this.state=state;
				//console.log("idle");
				this.state_change_time=game_tick;
				this.process_func=this.process_idle;		
			break;	
			
			case "explode":				
				this.state=state;
				this.visible=false;
				this.state_change_time=game_tick;
				game.send_expl_as_bomb(this.x, this.y, 2, 50, 1)
				this.process_func=this.process_explode;	
			break;				
						
			case "dead":
				this.state=state;
				this.visible=false;
				game.send_expl_as_bomb(this.x, this.y, 2, 50, 1)
				this.process_func=this.process_dead;		
			break;	
			
			case "wait":			
				//console.log("waiting...");
				this.next_state=next_state;
				this.state_change_time=game_tick;
				this.process_func=this.process_wait;	
			break;				
			
			case "rotate_to_player":
				//console.log("rotate_to_player...");
				this.state=state;
				this.state_change_time=game_tick;
				this.retarget_to_player();
				this.process_func=this.process_rotate_to_player;		
			break;	
			
			
			
		}		
	}
		
	calc_relative_data()
	{
		var dx=game.player.x-this.x;
		var dy=game.player.y-this.y;
		this.dist_to_player=Math.sqrt(dx*dx+dy*dy)+(1-game.player.alive)*9999;
		this.ray_pass=game.ray_pass(game.player.x,game.player.y,this.x,this.y,this.ind);
		var ang1=norm_0_360(Math.atan2(dy,dx));
		this.ang_to_player2=ang1;
		this.ang_to_player=pi - Math.abs(Math.abs(ang1 - this.sprite_obj.rotation) - pi); 		

	}
		
	process_under_fire()
	{		
		//обработка попаданий красным цветом
		if (this.sprite_hit.visible===true)
		{			
			this.sprite_hit.rotation=this.sprite_obj.rotation;
			this.sprite_hit.alpha-=0.05;
			if (this.sprite_hit.alpha<=0)
			{
				this.sprite_hit.alpha=1;
				this.sprite_hit.visible=false;				
			}			
		}
	}
	
	process_go_to_tar()
	{
		this.process_collisions();
		this.process_under_fire();
		this.calc_relative_data();
		if (this.ang_to_player<pi/3 && this.ray_pass===true && this.dist_to_player<500)
		{
			this.set_state("rotate_to_player");			
			return;
		}

			
		this.x+=this.dx;
		this.y+=this.dy;
		
		this.bb[0]+=dx;
		this.bb[1]+=dy;
		this.bb[2]+=dx;
		this.bb[3]+=dy;
		
		var dx=this.path_graph[this.tar_node][0]-this.x;
		var dy=this.path_graph[this.tar_node][1]-this.y;
		var d=Math.sqrt(dx*dx+dy*dy);
		if (d<1)
			this.set_state("rot_to_new_tar");				

	}
	
	process_rot_to_tar()
	{		
		this.process_collisions();
		this.process_under_fire();
		this.calc_relative_data();
		if (this.ang_to_player<pi/3 && this.ray_pass===true && this.dist_to_player<500)
			this.set_state("rotate_to_player");
	
		this.sprite_obj.rotation+=this.inc_rot;
		this.sprite_obj.rotation=norm_0_360(this.sprite_obj.rotation);
		if (Math.abs(this.sprite_obj.rotation-this.tar_rot)<(Math.abs(this.inc_rot)+0.02))
		{
			this.sprite_obj.rotation=this.tar_rot;
			this.set_state("go_to_tar")				
		}	
	}
	
	process_idle()
	{		
		this.process_under_fire();
		this.process_collisions();	
		if (game_tick>this.state_change_time+1)
			this.set_state("rot_to_cur_tar");		
	}
		
	process_explode()
	{		
		if (game_tick>this.state_change_time+3)
			this.set_state("dead");	
	}
	
	
	process_dead()
	{		
	
	}
	
	
	process_rotate_to_player()
	{		
	
		this.retarget_to_player();
		this.process_collisions();		
		this.process_under_fire();
		
		this.sprite_obj.rotation+=this.inc_rot*4;
		this.sprite_obj.rotation=norm_0_360(this.sprite_obj.rotation);
	
		if (Math.abs(this.sprite_obj.rotation-this.tar_rot)<(Math.abs(this.inc_rot)+0.02))
		{
			this.calc_relative_data();
			if (this.ang_to_player<pi/3 && this.ray_pass===true && this.dist_to_player<1000)
			{
				game.add_tank_bullet(this.x,this.y,this.tar_x,this.tar_y);
				this.set_state("idle");				
			}
			else
			{			
				this.set_state("rot_to_cur_tar");
			}
		}
	}

	move (dx, dy)
	{		


		
	
		this.m_image.x+=dx;
		this.m_image.y+=dy;
	}

	process_collisions()
	{			
		if (this.visible===true)
		{		
			var dx=this.x-game.player.x;
			var dy=this.y-game.player.y;
			this.dist_to_player=Math.sqrt(dx*dx+dy*dy);
			dx/=this.dist_to_player;
			dy/=this.dist_to_player;			
			
			if (this.dist_to_player<45)
			{					
				var d_diff=45-this.dist_to_player;
				game.player.x-=d_diff*dx;
				game.player.y-=d_diff*dy;					
			}						
		}		
	}

	
}

class player_class extends PIXI.Sprite
{
	constructor()
	{
		super();		

	}
	
	redraw_ammo_text()
	{
		this.ammo_text.text="x "+this.gun.ammo.toString();		
	}
		
	draw_and_init()
	{		
	
		this.process_func=function(){};
		this.texture=game_res.resources["player"].texture;
		this.anchor.set(0.5,0.5);		
		this.health=100;
		this.invincible=false;
	
		this.gun=new gun_class(0);
		
		let tex=new PIXI.Texture(game_res.resources["health_head"].texture, new PIXI.Rectangle(0, 22, 34, 10))
		this.life_lev_back=new PIXI.Sprite(tex);
		this.life_lev_back.anchor.set(0,0.5);
		
		tex=new PIXI.Texture(game_res.resources["health_head"].texture, new PIXI.Rectangle(3, 32, 28, 10))
		this.life_lev_front=new PIXI.Sprite(tex);
		this.life_lev_front.anchor.set(0,0.5);
		
		
		
		//загружаем спрайты оружия
		this.gun_sprite = new PIXI.Sprite(init_res.resources["m_gun_0"].texture);
		this.gun_sprite.x=5;
		this.gun_sprite.y=550;
		this.gun_sprite.visible=true;		
		static_viewport.addChild(this.gun_sprite);
		
		this.ammo_text = new PIXI.Text("X 0", { fontSize: 15, fontFamily: "Tempus Sans ITC", fill: 0x002222, fontWeight: "bold" });
		this.ammo_text.x=85;
		this.ammo_text.y=560;
		this.ammo_text.visible=true;		
		static_viewport.addChild(this.ammo_text);

		dynamic_viewport.addChild(this);	
	
	
		this.process_func=this.process;
		this.visible=true;
		this.life_lev_back.visible=true;
		this.life_lev_front.visible=true;
		this.life_lev_front.scale.x=1;
		this.alive=1;
		this.gun.draw_and_init();
		this.redraw_ammo_text();
	}
	
	upgrade_gun()
	{
		var res=this.gun.upgrade();		
		this.gun_sprite.texture = init_res.resources["m_gun_"+res].texture;
		
	}
	
	set_state(state)
	{
		this.state=state;
		
		switch(state)
		{
		
		}		
	}
	
	change_health(val)
	{		
		return;
		if (this.invincible)
			if (val<0)
				return;
	
		this.health+=val;
		if (this.health<0)
		{
			this.visible=false;
			this.life_lev_back.visible=false;
			this.life_lev_front.visible=false;
			this.alive=0;
			game.mission_arrow.visible=false;
			game.m_failed.visible=true;
			game.m_failed.alpha=0;
			return;
		}		
		
		this.health=Math.min(this.health,100);
		
		if (this.invincible===false)		
			this.life_lev_front.scale.x=this.health/100;
	}
	
	fire()
	{	
	
		if (this.alive===0)
			return;
	
		var tx=this.x+Math.cos(game.rot_ang)*this.gun.range;
		var ty=this.y+Math.sin(game.rot_ang)*this.gun.range;
		var closest_point=game.closest_intersection(this.x, this.y, tx, ty);		
		
		var ret=this.gun.fire(this.x, this.y,closest_point[0],closest_point[1],closest_point[2], game.rot_ang);		
		
		if (ret===2)
		{
			game.send_message("out of ammo");
			return;
		}
		
		if (ret===1)
		{
			this.redraw_ammo_text();
			for (var i=0;i<game.regions.length;i++)
			{			
				if (game.regions[i].vis===true)
				{				
					//iterate through all objects in region
					for (var j=0;j<game.regions[i].obj.length;j++)
					{
						var obj_id=game.regions[i].obj[j];
						var classfg=game.all_obj[obj_id].class;
						
						//only enemies of interest
						if (classfg==="ENEMY")
						{
							if (game.all_obj[obj_id].state!=="inactive" && game.all_obj[obj_id].state!=="dead" && game.all_obj[obj_id].state!=="explode")
							{
								var d=game.dist_to_line(game.all_obj[obj_id].x, game.all_obj[obj_id].y,game.player.x, game.player.y,closest_point[0],closest_point[1])
								if (d<game.all_obj[obj_id].radius)
								{
									game.all_obj[obj_id].set_state("under_fire");					
									game.all_obj[obj_id].drop_life(game.player.gun.damage);
								}
							}
						}
					}
				}
			}
		}
	}
		
	start_invincible()
	{
		this.invincible=true;
		this.life_lev_front.scale.x=1;	
		this.life_lev_front.tint=0xFF0000;	
	}
	
	process(angle)
	{		
		this.rotation=angle;	
		//this.gun.process_func(angle);
		
		this.life_lev_front.x=this.x-14;		
		this.life_lev_front.y=this.y-20;

		this.life_lev_back.x=this.x-17;		
		this.life_lev_back.y=this.y-20;

		if (this.invincible)
		{		
			this.life_lev_front.scale.x-=0.002;
			if (this.life_lev_front.scale.x<=0)
			{
				this.invincible=false;
				this.life_lev_front.scale.x=this.health/100;	
				this.life_lev_front.tint=0xFFFFFF;	
				this.change_health(0);
			}			
		}
		
		
		if (lm_down)
			this.fire();
	}
}

class obj_class
{
	constructor(obj_id)
	{
		this.ind=obj_id
		this.class=map_data[obj_id].class;
		this.bb=map_data[obj_id].bb;
		this.region=map_data[obj_id].region;
		this.collision=[];
		this.col_dist=15;
		this.process_func=function(){};
	}	
	
	hide()
	{
		
		
	}
	
	show()
	{
		
		
	}
	
	draw_and_init()
	{		
		this.process_func=this.process;		
	}
	
	process()
	{
		
		
		
	}
	
	pnt_in_quad(x,y,x1,y1,x2,y2)
	{
		
		if (x>x2)
			return false;
		if (x<x1)
			return false;
		if (y>y2)
			return false;
		if (y<y1)
			return false;
		return true;		
	}
	
	process_collisions_on_line(x1,y1,x2,y2)
	{
		
		var x=game.player.x;
		var y=game.player.y;
		
			
		var A = x - x1;
		var B = y - y1;
		var C = x2 - x1;
		var D = y2 - y1;
		
		var dot = A * C + B * D;
		var len_sq = C * C + D * D;
		var param = -1;
		param = dot / len_sq;

		var xx, yy;

		if (param < 0)
		{
			xx = x1;
			yy = y1;
		}
		else if (param > 1)
		{
			xx = x2;
			yy = y2;
		}
		else
		{
			xx = x1 + param * C;
			yy = y1 + param * D;
		}

		var dx = x - xx;
		var dy = y - yy;				
		var d = Math.sqrt(dx * dx + dy * dy);
		
		if (d<this.col_dist)
		{					
			game.player.x+=dx*(this.col_dist-d)/d;
			game.player.y+=dy*(this.col_dist-d)/d;		
		}		
	}
	
	process_collisions()
	{			
		if (this.visible===true)
		{		
			var x=game.player.x;
			var y=game.player.y;
	
			var player_in_bb=this.pnt_in_quad(x,y,this.bb[0],this.bb[1],this.bb[2],this.bb[3]);
			if (player_in_bb===true)
			{					
				for (var l=0;l<this.collision.length;l++)
				{						
					var player_in_bb_line=this.pnt_in_quad(x,y,this.collision[l][4],this.collision[l][5],this.collision[l][6],this.collision[l][7]);
					if (player_in_bb_line===true)
					{
						this.process_collisions_on_line(this.collision[l][0],this.collision[l][1],this.collision[l][2],this.collision[l][3]);
					}					
				}			
			}						
		}		
	}

}

class base_class extends obj_class
{
	constructor(obj_id)
	{
		super(obj_id);
		this.collision=map_data[obj_id].collision;
		this.indoor=map_data[obj_id].indoor;
		
		this.floor=new PIXI.Sprite();
		this.floor.texture=game_res.resources[map_data[obj_id]["floor"][0]].texture;
		this.floor.anchor.set(0.5,0.5);
		this.floor.x=map_data[obj_id]["floor"][1];
		this.floor.y=map_data[obj_id]["floor"][2];
		this.floor.visible=false;
		
		
		this.roof=new PIXI.Sprite();
		this.roof.texture=game_res.resources[map_data[obj_id]["roof"][0]].texture;
		this.roof.anchor.set(0.5,0.5);
		this.roof.x=map_data[obj_id]["roof"][1];
		this.roof.y=map_data[obj_id]["roof"][2];	
		
		this.player_inside=false;
		this.process_func=this.process_collisions;
	}	
	
	hide()
	{		
		this.roof.visible=false;
		this.floor.visible=false;
	}
	
	show()
	{
		this.roof.visible=true;
		//this.floor.visible=true;
	}
	
	pnt_inside_base(x, y)
	{
		
		var int_counts=0;
		for (var l=0;l<this.indoor.length;l++)
		{
			var x1=this.indoor[l][0];
			var y1=this.indoor[l][1];

			var x2=this.indoor[l][2];
			var y2=this.indoor[l][3];
				
			var res=game.lines_intersect_check(x1,y1,x2,y2,x,y,x+935684.13643,y+935387.17647);
			if (res===true)
				int_counts++;
		}			
		
		if (int_counts%2===0)
		{
			return false;
		}
		else
		{
			return true;
		}
		
	}
	
	process_collisions()
	{			
	
			var x=game.player.x;
			var y=game.player.y;
	
			var player_in_bb=this.pnt_in_quad(x,y,this.bb[0],this.bb[1],this.bb[2],this.bb[3]);
			if (player_in_bb===true)
			{					
				for (var l=0;l<this.collision.length;l++)
				{						
					var player_in_bb_line=this.pnt_in_quad(x,y,this.collision[l][4],this.collision[l][5],this.collision[l][6],this.collision[l][7]);
					if (player_in_bb_line===true)
					{
						this.process_collisions_on_line(this.collision[l][0],this.collision[l][1],this.collision[l][2],this.collision[l][3]);
					}					
				}	
				
				
				//checking indoor and outdoor changes
				var indoor_check=this.pnt_inside_base(x,y);

				if (indoor_check===true)
				{
					if (this.player_inside===false)
					{
						game.hide_outdoor(this.ind);
						this.player_inside=true;						
					}
				}
				else
				{
					if (this.player_inside===true)
					{
						game.show_outdoor();
						this.player_inside=false;
					}
				}
			}						
	
	}
}

class tank_bullet_class extends PIXI.Sprite
{
	
	constructor()
	{
		super();
		this.dx=0;
		this.dy=0;
		this.anchor.set(0.5,0.5);
		this.texture=game_res.resources["tank_bullet"].texture;
		this.tx=0;
		this.ty=0;
	}	
	
	activate(px,py,tx,ty)
	{
		this.x=px;
		this.y=py;
		this.tx=tx;
		this.ty=ty;
		this.rotation=Math.atan2(ty-py,tx-px);	
		this.visible=true;	

		var dx=tx-px;
		var dy=ty-py;
		var d=Math.sqrt(dx*dx+dy*dy);
		this.dx=dx/d;
		this.dy=dy/d;
		
		
	}
	
	process()
	{		
		this.x+=this.dx*15;
		this.y+=this.dy*15;			
		
		var dx=this.tx-this.x;
		var dy=this.ty-this.y;
		
		var d=Math.sqrt(dx*dx+dy*dy);
		if (d<8.1)
		{
			game.send_expl_as_bomb(this.x, this.y,1);
			this.visible=false;		
		}

		
	}	
}

class expl_class extends PIXI.extras.AnimatedSprite
{
	
	constructor()
	{
		super("1");
		this.visible=false;	
		this.alpha=0.7;
		this.anchor.set(0.5);		
	}
	
	place_as_bomb(px, py, id, range, damage)
	{
		this.x=px;
		this.y=py;
		this.textures=game.expl_textures[id];	
		this.animationSpeed = 0.5;
		this.gotoAndPlay(0);
		this.visible=true;
		
		var dx=px-game.player.x;
		var dy=py-game.player.y;
		var d=dx*dx+dy*dy;
		d=Math.sqrt(d);
		if (d<40)
		{
			game.player.change_health(d-40);
			game.red_screen.visible=true;
		}

		
		
	}
	
	place_as_blood(px, py, id, range, damage)
	{
		this.x=px;
		this.y=py;
		this.alpha=1;
		this.textures=game.expl_textures[id];	
		this.animationSpeed = 0.5;
		this.gotoAndPlay(0);
		this.visible=true;
	}
	
	process()
	{		
		if (this.visible===false)
			return;
			
		if (this.currentFrame === (this.totalFrames - 1))
					this.visible=false;		
	}
	
}

class platform_class extends obj_class
{
	
	constructor(obj_id)
	{
		super(obj_id);
		this.collision=map_data[obj_id].collision;
		this.path_graph=JSON.parse(game_res.resources["path_graph"].data);
		
		this.m_image=new PIXI.Sprite();
		this.m_image.texture=game_res.resources[map_data[obj_id]["image"][0]].texture;
		this.m_image.anchor.set(0.5,0.5);
		this.m_image.x=map_data[obj_id]["image"][1];
		this.m_image.y=map_data[obj_id]["image"][2];

		
		this.shift_x=0;
		this.shift_y=0;				
		
		this.dx=0;
		this.dy=0;
		
		this.spd=0;
		
		this.mission=map_data[obj_id]["mission"];
		this.cur_node=map_data[obj_id]["node"];
		this.tar_node=map_data[obj_id]["node"];
		
		var sdx=this.path_graph[this.tar_node][0]-this.m_image.x;
		var sdy=this.path_graph[this.tar_node][1]-this.m_image.y;
		
		this.move(sdx,sdy);
		
		
		this.set_next_point();
							
		this.process_func=this.process;
	}
	
	retarget()
	{
		var dx=this.path_graph[this.tar_node][0]-this.m_image.x;
		var dy=this.path_graph[this.tar_node][1]-this.m_image.y;
		var d=Math.sqrt(dx*dx+dy*dy);
		this.dx=dx/d;
		this.dy=dy/d;	
	}
	
	hide()
	{		
		this.m_image.visible=false;
	}
	
	show()
	{
		this.m_image.visible=true;
	}
	
	
	move(dx,dy)
	{
		
		this.bb[0]+=dx;
		this.bb[1]+=dy;
		this.bb[2]+=dx;
		this.bb[3]+=dy;
		
		for (var c=0;c<this.collision.length;c++)
		{			
			for (var i=0;i<4;i++)
			{
				this.collision[c][i*2]+=dx;
				this.collision[c][i*2+1]+=dy;				
			}	
		}
		
		this.m_image.x+=dx;
		this.m_image.y+=dy;
		
	}
	
	process()
	{	
	
	
		this.process_collisions();	
		if (game.cur_mission_target!==this.mission)
			return;
	
		var x=game.player.x;
		var y=game.player.y;	
	
		var dx=this.path_graph[this.tar_node][0]-this.m_image.x;
		var dy=this.path_graph[this.tar_node][1]-this.m_image.y;
	
		var dir_x=this.dx*this.spd;
		var dir_y=this.dy*this.spd;		
	
		if (game.pnt_in_quad(x,y,this.m_image.x-this.m_image.width/2,this.m_image.y-this.m_image.height/2,this.m_image.x+this.m_image.width/2,this.m_image.y+this.m_image.height/2))
		{			
			game.player.x+=dir_x;
			game.player.y+=dir_y;
			
			this.spd+=0.02;
			this.spd=Math.min(this.spd,7);		
		}			
		else
		{
			this.spd-=0.05;
			this.spd=Math.max(this.spd,0);
		}
		
		this.move(dir_x,dir_y)
		
		var d=Math.sqrt(dx*dx+dy*dy);
		if (d<(this.spd+0.1))
			this.set_next_point();	
				
			
	}
	
	set_next_point()
	{
		//choose next point from graph
		var next_node_cnt=this.path_graph[this.tar_node].length-2;
		var next_node=0;
		if (next_node_cnt===1)
		{			
			//приехали в конечный нод
			next_node=this.path_graph[this.tar_node][2];
			this.spd=0;
		}
		else
		{
			//промежуточный нод
			if (this.path_graph[this.tar_node][2]===this.cur_node)
				next_node=this.path_graph[this.tar_node][3];
			else
				next_node=this.path_graph[this.tar_node][2];
		}
		this.cur_node=this.tar_node;
		this.tar_node=next_node;
		
		this.retarget();	
	}
	
}

class img_class extends obj_class
{
	constructor(obj_id)
	{
		super(obj_id);	
		this.collision=map_data[obj_id].collision;
		this.m_image=new PIXI.Sprite();
		this.m_image.texture=game_res.resources[map_data[obj_id]["image"][0]].texture;
		//this.m_image.width/=1.3335;	
		//this.m_image.height/=1.3335;	
		this.m_image.anchor.set(0.5,0.5);
		this.m_image.x=map_data[obj_id]["image"][1];
		this.m_image.y=map_data[obj_id]["image"][2];
		this.process_func=this.process_collisions;
	}	

	hide()
	{		
		this.m_image.visible=false;
	}
	
	show()
	{
		this.m_image.visible=true;
	}
	
	process_collisions()
	{			
		if (this.visible===true)
		{		
			
			var x=game.player.x;
			var y=game.player.y;
	
			var player_in_bb=this.pnt_in_quad(x,y,this.bb[0],this.bb[1],this.bb[2],this.bb[3]);
			if (player_in_bb===true)
			{			
				
				for (var l=0;l<this.collision.length;l++)
				{						
					var player_in_bb_line=this.pnt_in_quad(x,y,this.collision[l][4],this.collision[l][5],this.collision[l][6],this.collision[l][7]);
					if (player_in_bb_line===true)
					{
						this.process_collisions_on_line(this.collision[l][0],this.collision[l][1],this.collision[l][2],this.collision[l][3]);
					}					
				}	
			}						
		}		
	}
	
}

class bonus_class extends obj_class
{
	
	constructor(obj_id, base_id, type)
	{
		super(obj_id);
		this.base_id=base_id;
		this.type=type;
		this.m_image=new PIXI.Sprite();
		this.m_image.texture=game_res.resources[this.type].texture;
		this.m_image.anchor.set(0.5,0.5);
		this.m_image.x=map_data[obj_id]["pos"][0];
		this.m_image.y=map_data[obj_id]["pos"][1];
		this.is_static=map_data[obj_id]["static"];
		this.process_func=this.process;
		this.draw_and_init();
		this.place_time=0;
	}	
	
	draw_and_init()
	{
		if (this.is_static===0)
		{
			this.process_func=this.process_zero;
			this.m_image.visible=false;		
			this.active=0;			
		}
		else
		{
			this.process_func=this.process;	
			this.m_image.visible=true;
			this.active=1;
		}
	}	

	process()
	{		
		var dx=this.m_image.x-game.player.x;
		var dy=this.m_image.y-game.player.y;
		var d=Math.sqrt(dx*dx+dy*dy);
		this.m_image.rotation+=0.02;
		if (d<20)
		{			
			//console.log(this.type);
			
			switch (this.type)
			{
				
				case "U":
				game.player.upgrade_gun();								
				break;
				
				case "I":
				game.player.start_invincible();
				game.send_message("--- invincible mode ---",10);				
				break;
				
				case "H":
				game.player.change_health(25);
				game.send_message("--- health level increased ---");
				break;				
				
				case "A":
				game.player.gun.ammo+=30;
				game.player.redraw_ammo_text();
				game.send_message("--- picked up ammo ---");
				break;
			}

			this.process_func=this.process_zero;
			this.m_image.visible=false;
			this.active=0;
			this.base_id=-1;
		}		
		
		
		//убираем если долго никто не взял
		if (this.is_static===0)
		{
			if (game_tick>this.place_time+15)
			{
				this.process_func=this.process_zero;
				this.m_image.visible=false;
				this.active=0;
			}			
		}
	}	
	
	process_zero()
	{
		
		
		
		
	}
	
	hide(cur_ind)
	{
		if (this.active===1)
		{			
			if (cur_ind!==this.base_id)
				this.m_image.visible=false;		
			else
				this.m_image.visible=true;		
		}

	}
	
	show()
	{
		if (this.active===1)
			this.m_image.visible=true;
	}
	
	activate(px,py,base_id,vis)
	{			
		var r_int=Math.floor(Math.random() * 4);
	
		switch (r_int)
		{			
			case 0:
			this.type="H";
			
			break;
			
			case 1:
			this.type="U";
			break;
			
			case 2:
			this.type="A";
			break;		

			case 3:
			this.type="I";
			break;	
			
		}

		this.m_image.texture=game_res.resources[this.type].texture;
		this.m_image.x=px;
		this.m_image.y=py;
		this.m_image.visible=vis;
		this.base_id=base_id;
		this.process_func=this.process;	
		this.place_time=game_tick;
		this.active=1;		
	}
	
}

class coll_class extends obj_class
{
	constructor(obj_id)
	{
		super(obj_id);	
		this.collision=map_data[obj_id].collision;
		this.process_func=this.process_collisions;
		this.col_dist=map_data[obj_id].col_dist;
	}	

	hide()
	{		
	}
	
	show()
	{
	}
	
}

class start_screen_class
{
	
	constructor()
	{
	
		this.m_image=new PIXI.Sprite();
		this.m_image.texture=init_res.resources["start_screen"].texture;
		this.m_image.x=0;
		this.m_image.y=0;
		ui_viewport.addChild(this.m_image);		
		
		this.start_button=new PIXI.Sprite();
		this.start_button.texture=init_res.resources["start_button"].texture;
		this.start_button.interactive = true;
		this.start_button.buttonMode = true;
		this.start_button.x=0;
		this.start_button.y=525;		
		this.start_button.anchor.set(0,0);		
        this.start_button.pointerover=this.pointer_over.bind(this);;
		this.start_button.pointerout=this.pointer_out.bind(this);;
		this.start_button.pointerdown=this.pointer_down;		
		ui_viewport.addChild(this.start_button);
		
		this.load_bar_frame = new PIXI.Sprite();
		this.load_bar_fill = new PIXI.Sprite();
		this.load_bar_frame.visible=false;
		this.load_bar_fill.visible=false;
		this.load_bar_frame.texture=init_res.resources["load_bar_frame"].texture;
		this.load_bar_fill.texture=init_res.resources["load_bar_fill"].texture;
		this.load_bar_frame.x=20;
		this.load_bar_fill.x=20;
		this.load_bar_frame.y=280;
		this.load_bar_fill.y=280;
		this.load_bar_fill.anchor.set(0);
		//this.load_bar_fill.width=0;
		ui_viewport.addChild(this.load_bar_frame, this.load_bar_fill);
		
		
	}
	
	draw_and_init()
	{				
		ui_viewport.visible=true;
		for (var i = 0; i < ui_viewport.children.length; i++)
			ui_viewport.getChildAt(i).visible = false;
		
		this.m_image.visible=true;	
		this.start_button.visible=true;	
		global_process_func=this.process.bind(this);	
		
	}
	
	process()
	{
		
		
		
	}
	
	pointer_down()
	{
		
		set_global_state("missions_screen");
		
	}
	
	pointer_out()
	{
		this.start_button.tint=0xFFFFFF;
	}
	
	
	pointer_over()
	{
		this.start_button.tint=0xFF7777;
	}
}

class lose_screen_class
{
	
	constructor()
	{
	
		this.m_image=new PIXI.Sprite();
		this.m_image.texture=init_res.resources["lose_screen"].texture;
		this.m_image.x=0;
		this.m_image.y=0;
		ui_viewport.addChild(this.m_image);		

		this.next_button=new PIXI.Sprite();
		this.next_button.texture=init_res.resources["next_button"].texture;
		this.next_button.interactive = true;
		this.next_button.buttonMode = true;
		this.next_button.x=200;
		this.next_button.y=400;		
		this.next_button.anchor.set(0.5,0.5);		
        this.next_button.pointerover=this.pointer_over;
		this.next_button.pointerout=this.pointer_out;
		this.next_button.pointerdown=this.pointer_down;		
		ui_viewport.addChild(this.next_button);
		
		
	}
	
	draw_and_init()
	{				
		ui_viewport.visible=true;
		for (var i = 0; i < ui_viewport.children.length; i++)
			ui_viewport.getChildAt(i).visible = false;
		
		this.next_button.visible=true;	
		this.m_image.visible=true;	
		global_process_func=this.process.bind(this);	
	}
	
	process()
	{
		
		
		
	}
	
	pointer_down()
	{		
		set_global_state("missions_screen");		
	}
	
	pointer_out()
	{
		//console.log("out");
	}
	
	pointer_over()
	{
		//console.log("over");
	}
}

class win_screen_class
{
	
	constructor()
	{
	
		this.m_image=new PIXI.Sprite();
		this.m_image.texture=init_res.resources["win_screen"].texture;
		this.m_image.x=0;
		this.m_image.y=0;
		ui_viewport.addChild(this.m_image);		

		this.next_button=new PIXI.Sprite();
		this.next_button.texture=init_res.resources["next_button"].texture;
		this.next_button.interactive = true;
		this.next_button.buttonMode = true;
		this.next_button.x=0;
		this.next_button.y=525;		
		this.next_button.anchor.set(0,0);	
        this.next_button.pointerover=this.pointer_over.bind(this);
		this.next_button.pointerout=this.pointer_out.bind(this);
		this.next_button.pointerdown=this.pointer_down;		
		ui_viewport.addChild(this.next_button);
		
	}
	
	draw_and_init()
	{				
	
		
		ui_viewport.visible=true;
		for (var i = 0; i < ui_viewport.children.length; i++)
			ui_viewport.getChildAt(i).visible = false;
		
		missions_screen.max_mission_passed=Math.max(missions_screen.max_mission_passed,missions_screen.selected_mission_id);
		kongregate.stats.submit('mission', missions_screen.max_mission_passed+1);
		this.next_button.visible=true;	
		this.m_image.visible=true;	
		global_process_func=this.process.bind(this);	

	}
	
	process()
	{
		
		
		
	}
	
	pointer_down()
	{		
		set_global_state("missions_screen");		
	}
	
	pointer_out()
	{
		this.next_button.tint=0xFFFFFF;
	}
		
	pointer_over()
	{
		this.next_button.tint=0xFF7777;
	}
}

class missions_screen_class
{
	
	constructor()
	{
		this.max_mission_passed=-1;
		this.m_image=new PIXI.Sprite();
		this.m_image.texture=init_res.resources["missions_screen"].texture;
		this.m_image.x=0;
		this.m_image.y=0;
		ui_viewport.addChild(this.m_image);		

		this.m_lock=new PIXI.Sprite();
		this.m_lock.texture=init_res.resources["lock"].texture;
		ui_viewport.addChild(this.m_lock);	
				

				
		this.m_icon_pos = [[50, 140], [300, 140], [550, 140], [50, 330], [300, 330], [550, 330]];
		
		this.m_windows=[];
		this.m_locks=[];
		for (var m=0;m<6;m++)
		{
			this.m_windows.push(new PIXI.Sprite(init_res.resources["m_window_"+m].texture));
			this.m_windows[m].x=this.m_icon_pos[m][0];
			this.m_windows[m].y=this.m_icon_pos[m][1];
			this.m_windows[m].interactive = true;
			this.m_windows[m].buttonMode = true;
			this.m_windows[m].on("pointerdown", (function (thevar) { return function () { this.set_active_map(thevar) } })(m).bind(this));
			ui_viewport.addChild(this.m_windows[m]);
			
			this.m_locks.push(new PIXI.Sprite(init_res.resources["lock"].texture));
			this.m_locks[m].x=this.m_icon_pos[m][0];
			this.m_locks[m].y=this.m_icon_pos[m][1];
			ui_viewport.addChild(this.m_locks[m]);
		}
		
		this.selected_window=new PIXI.Sprite();
		this.selected_mission_id=0;
		this.selected_window.texture=init_res.resources["selected_window"].texture;
		ui_viewport.addChild(this.selected_window);	
		
		this.start_button=new PIXI.Sprite();
		this.start_button.texture=init_res.resources["start_button"].texture;
		this.start_button.interactive = true;
		this.start_button.buttonMode = true;
		this.start_button.x=0;
		this.start_button.y=525;		
		this.start_button.anchor.set(0,0);
		
        this.start_button.pointerover=this.pointer_over.bind(this);		
		this.start_button.pointerout=this.pointer_out.bind(this);		
		this.start_button.pointerdown=this.pointer_down.bind(this);		
		
		ui_viewport.addChild(this.start_button);
	}
	
	set_active_map(id)
	{				
		this.selected_mission_id=id;
		this.selected_window.visible=true;
		this.selected_window.x=this.m_icon_pos[id][0];
		this.selected_window.y=this.m_icon_pos[id][1];			
	}
	
	draw_and_init()
	{			
		ui_viewport.visible=true;
		for (var i = 0; i < ui_viewport.children.length; i++)
			ui_viewport.getChildAt(i).visible = false;
	
		this.m_image.visible=true;	
		this.start_button.visible=true;	
		global_process_func=this.process.bind(this);	
		
		for (var i=0;i<6;i++)
		{
			this.m_windows[i].visible=true;		

			if (this.max_mission_passed+1>=i)
				this.m_locks[i].visible=false;
			else
				this.m_locks[i].visible=true;	
		}		
	}
	
	process()
	{
		
		
		
	}
	
	pointer_down()
	{	
		if (this.max_mission_passed+1>=this.selected_mission_id)	
		{
			
			set_global_state("game");	
		}			
	
	}
	
	pointer_out()
	{
		this.start_button.tint=0xFFFFFF;
	}
		
	pointer_over()
	{
		this.start_button.tint=0xFF7777;
	}
}

class message_class extends PIXI.Container
{
	constructor()
	{		
		super();
		var text_msg = new PIXI.Text("---", { fontSize: 20, fontFamily: "Tempus Sans ITC", fill: 0x000000, fontWeight: "bold" });
		var text_bcg = new PIXI.Sprite(game_res.resources["text_bcg"].texture);				
		this.addChild(text_bcg,text_msg);	
		this.visible=false;
		this.msg_time=0;
		this.active_time=3;
		static_viewport.addChild(this);
	}		
	
	process()
	{		
		if (this.visible===true)
		{
			if (game_tick>this.msg_time+this.active_time)
			{
				this.alpha-=0.005;
				if (this.alpha<=0)
				{
					this.alpha=1;
					this.visible=false;
				}				
			}			
		}
	}
}

class game_class extends PIXI.Sprite
{
	constructor()
	{
		super();		
	}
	
	load_res0()
	{
		
		ui_viewport.visible=true;
		for (var i = 0; i < ui_viewport.children.length; i++)
			ui_viewport.getChildAt(i).visible = false;
		
		start_screen.load_bar_frame.visible=true;
		start_screen.load_bar_fill.visible=true;
		start_screen.load_bar_fill.width=0;
		
		var m_id=missions_screen.selected_mission_id;
		this.res0=0;
		this.res0=new PIXI.loaders.Loader();
		this.res0.add("map_data", "mission_"+m_id+"/map_data.txt");
		this.res0.add("i_data", "mission_"+m_id+"/init_data.txt");
		this.res0.load(function(){this.load_res1();}.bind(this));	
		
		
	}
		
	load_res1()
	{
		var m_id=missions_screen.selected_mission_id;
		map_data=JSON.parse(this.res0.resources["map_data"].data);
		
		game_res=0;
		game_res=new PIXI.loaders.Loader();
		game_res.add("player", "mission_"+m_id+"/enemy_0.png");
		game_res.add("enemy_0", "mission_"+m_id+"/enemy_0.png");
		game_res.add("enemy_1", "mission_"+m_id+"/enemy_1.png");
		game_res.add("enemy_2", "mission_"+m_id+"/enemy_2.png");
		game_res.add("enemy_3", "mission_"+m_id+"/enemy_3.png");
		
		
		game_res.add("enemy_hit", "mission_"+m_id+"/enemy_hit.png");
		
		game_res.add("tank", "mission_"+m_id+"/tank.png");
		game_res.add("tank_hit", "mission_"+m_id+"/tank_hit.png");
		
		game_res.add("regions", "mission_"+m_id+"/regions.txt");
		game_res.add("path_graph", "mission_"+m_id+"/path_graph.txt");
		game_res.add("terrain", "mission_"+m_id+"/terrain.png");
		
		game_res.add("bullet_0", "mission_"+m_id+"/bullet_0.png");
		game_res.add("bullet_1", "mission_"+m_id+"/bullet_1.png");
		game_res.add("bullet_2", "mission_"+m_id+"/bullet_2.png");
		game_res.add("bullet_3", "mission_"+m_id+"/bullet_3.png");
		game_res.add("bullet_4", "mission_"+m_id+"/bullet_4.png");
		game_res.add("bullet_5", "mission_"+m_id+"/bullet_5.png");
		game_res.add("bullet_6", "mission_"+m_id+"/bullet_6.png");
		
		
		
		
		
		
		
		
		game_res.add("A", "mission_"+m_id+"/a.png");
		game_res.add("H", "mission_"+m_id+"/h.png");
		game_res.add("U", "mission_"+m_id+"/u.png");
		game_res.add("I", "mission_"+m_id+"/i.png");
		game_res.add("mission_arrow", "mission_"+m_id+"/mission_arrow.png");
		game_res.add("tank_bullet", "mission_"+m_id+"/tank_bullet.png");
		game_res.add("init_data", "mission_"+m_id+"/init_data.txt");
		
		game_res.add("missions", "mission_"+m_id+"/missions.txt");
		game_res.add("mission_target", "mission_"+m_id+"/mission.png");
		game_res.add("health_head", "mission_"+m_id+"/health_head.png");
	
		game_res.add("text_bcg", "init_res/text_bcg.png");
		game_res.add("ammo_text_bcg", "init_res/ammo_text_bcg.png");
		
		var i_data=JSON.parse(this.res0.resources["i_data"].data);
		for (var i=0;i<i_data.terrain.length;i++)
			game_res.add("terrain_"+i_data.terrain[i][0]+"_"+i_data.terrain[i][1], "mission_"+m_id+"/terrain_"+i_data.terrain[i][0]+"_"+i_data.terrain[i][1]+".png");

	
		for (var key in map_data)
		{
			switch (map_data[key]["class"])
			{				
				case "BASE":
					game_res.add(map_data[key].floor[0], "mission_"+m_id+"/"+map_data[key].floor[0]+".png");			
					game_res.add(map_data[key].roof[0], "mission_"+m_id+"/"+map_data[key].roof[0]+".png");	
				break;
				
				case "PLATFORM":
					game_res.add(map_data[key].image[0], "mission_"+m_id+"/"+map_data[key].image[0]+".png");	
				break;				
			
				case "IMG":
					game_res.add(map_data[key].image[0], "mission_"+m_id+"/"+map_data[key].image[0]+".png");	
				break;		

				case "IMG2":
					game_res.add(map_data[key].image[0], "mission_"+m_id+"/"+map_data[key].image[0]+".png");	
				break;	
				
			}			
		}
		
			
		//loading explosion textures
		for (var i = 0; i < expl_anim_files.length; i++)
			for (var e = 0; e < expl_anim_files[i]; e++)
				game_res.add("expl" + i + "_" + e, "expl/explosion_" + i + "/" + e + ".png");
			
		game_res.onProgress.add(this.game_res_loading.bind(this));	
		game_res.load(this.draw_and_init.bind(this));		
		
	}
	
	game_res_loading(loader, resource)
	{
		start_screen.load_bar_fill.width=760*loader.progress/100;
	}
	
	add_bonus(px,py,base_id,vis)
	{		
		
		//iterate through all objects in region
		for (var j=0;j<this.regions[0].obj.length;j++)
		{
			var obj_id=this.regions[0].obj[j];		

			if (this.all_obj[obj_id].class==="BONUS")
			{
				if (this.all_obj[obj_id].is_static===0)
				{
					if (this.all_obj[obj_id].m_image.visible===false)
					{
						
						this.all_obj[obj_id].activate(px,py,base_id,vis);								
						return;
					}						
				}				
			}
		}				

		
	}
	
	draw_and_init()
	{		
	
		static_viewport.removeChildren();
		dynamic_viewport.removeChildren();
			
		//hide load bar
		ui_viewport.visible=false;
		
		

		//general game and map data		
		gun_data=JSON.parse(init_res.resources["gun_data"].data);
		enemy_data=JSON.parse(init_res.resources["enemy_data"].data);
		this.init_data=JSON.parse(game_res.resources["init_data"].data);
		this.missions=JSON.parse(game_res.resources["missions"].data);
		this.regions=JSON.parse(game_res.resources["regions"].data);
		this.map_graphics = new PIXI.Graphics();
		this.map_graphics.lineStyle(1, 0xffd900, 1);
		
		
		this.all_obj=[];
								
		this.eye_x=400;
		this.eye_y=300;
		
		this.is_indoor=false;	
				
		//for mouse down events
		static_viewport.addChild(this);
		this.interactive = true;		
		this.width=800;
		this.height=600;
		this.pointerdown=this.mouse_down;
		this.pointerup=this.mouse_up;
		
		this.rot_ang=0;
		this.dir_x=0;
		this.dir_y=0;
		
		//making array of all objects
		for (var i=0;i< map_data.length;i++)
		{	
			switch (map_data[i]["class"])
			{				
				case "BASE":
					this.all_obj.push(new base_class(i))
				break;
				
				case "PLATFORM":
					this.all_obj.push(new platform_class(i))
				break;
				
				case "TANK":
					this.all_obj.push(new tank_class(i))
				break;
				
				case "IMG":
					this.all_obj.push(new img_class(i))
				break;
				
				case "IMG2":
					this.all_obj.push(new img_class(i))
				break;
				
				case "BONUS":
				
					//finding base of bonus if exists
					var block_ind=-1;
					for (var k=0;k<map_data.length;k++)
					{
						if (map_data[k].class==="BASE")
						{							
							if (this.pnt_inside_base(map_data[i]["pos"][0],map_data[i]["pos"][1],k))
								block_ind=k;							
						}						
					}				
					this.all_obj.push(new bonus_class(i,block_ind,map_data[i]["type"]));
				break;
				
				case "COL":
					this.all_obj.push(new coll_class(i))
				break;
				
				case "ENEMY":		

					//finding base of enemy if exists
					var block_ind=-1;
					for (var k=0;k<map_data.length;k++)
					{
						if (map_data[k].class==="BASE")
						{							
							if (this.pnt_inside_base(map_data[i]["pos"][0],map_data[i]["pos"][1],k))
								block_ind=k;							
						}						
					}				
					this.all_obj.push(new enemy_class(i,block_ind));
					
				break;
								
			}
		}
		
					
		//terrain image		
		this.custom_texture=this.init_data.terrain;	
		//-cut 3 pixels of terrain image because of excel problem
		var t_w=game_res.resources["terrain"].texture.width;
		var t_h=game_res.resources["terrain"].texture.height;
		var cur_pix=29;
		var cut_rect=new PIXI.Rectangle(cur_pix, cur_pix, t_w-cur_pix*2, t_h-cur_pix*2)
		game_res.resources["terrain"].texture=new PIXI.Texture(game_res.resources["terrain"].texture, cut_rect);
		for (var i=0;i<this.init_data.terrain.length;i++)
		{
			var bx=this.init_data.terrain[i][0];
			var by=this.init_data.terrain[i][1];
			game_res.resources["terrain_"+bx+"_"+by].texture=new PIXI.Texture(game_res.resources["terrain_"+bx+"_"+by].texture, cut_rect);			
		}
		
		this.terrain=[];
		for (var i=0;i<4;i++)
		{
			this.terrain.push(new PIXI.Sprite(game_res.resources["terrain"].texture));		
			this.terrain[i].width=800;
			this.terrain[i].height=600;
			this.terrain[i].visible=true;
			dynamic_viewport.addChild(this.terrain[i]);
		}

		this.terrain[0].x=0;
		this.terrain[0].y=0;	
		
		this.terrain[1].x=800;
		this.terrain[1].y=0;	
		
		this.terrain[2].x=0;
		this.terrain[2].y=600;	
		
		this.terrain[3].x=800;
		this.terrain[3].y=600;	
				

		//free images
		for (var i=0;i<this.all_obj.length;i++)
			if (this.all_obj[i].class==="IMG2")
				dynamic_viewport.addChild(this.all_obj[i].m_image);	

		//bottom pictures
		for (var i=0;i<this.all_obj.length;i++)
			if (this.all_obj[i].class==="BASE")
				dynamic_viewport.addChild(this.all_obj[i].floor);	
		
		//other pictures	
		for (var i=0;i<this.all_obj.length;i++)
		{	
			switch (this.all_obj[i].class)
			{				
				
				case "BONUS":
				dynamic_viewport.addChild(this.all_obj[i].m_image);	
				break;
				
				case "PLATFORM":
				dynamic_viewport.addChild(this.all_obj[i].m_image);	
				break;
				
				case "TANK":
				dynamic_viewport.addChild(this.all_obj[i]);	
				break;	
				
				case "ENEMY":
				dynamic_viewport.addChild(this.all_obj[i]);	
				break;	
			}
		}
		
				
		//fire traces
		this.bullets=[];
		for (var i=0;i<20;i++)
		{
			this.bullets.push(new bullet_class());			
			this.bullets[i].visible=false;
			dynamic_viewport.addChild(this.bullets[i]);	
		}
		
	
		//player class - all data in it
		this.player=new player_class();		
		this.player.x=this.init_data.player_pos[0];
		this.player.y=this.init_data.player_pos[1];
		this.player.draw_and_init();
		
		//load explosion textures 
		this.expl_textures=[];
		for (var f=0;f<expl_anim_files.length;f++)
		{
			var expl=[];
			for (var b=0;b<expl_anim_files[f];b++)
				expl.push(game_res.resources["expl" + f + "_" + b].texture);
			this.expl_textures.push(expl);				
		}		
		
		//load explosions
		this.expl=[];
		for (var i=0;i<10;i++)
		{
			this.expl.push(new expl_class());			
			dynamic_viewport.addChild(this.expl[i]);
		}

		//roof pictures
		for (var i=0;i<this.all_obj.length;i++)
			if (this.all_obj[i].class==="BASE")
				dynamic_viewport.addChild(this.all_obj[i].roof);	
		
		//images with collisions pictures
		for (var i=0;i<this.all_obj.length;i++)
			if (this.all_obj[i].class==="IMG")
				dynamic_viewport.addChild(this.all_obj[i].m_image);	

		
		//arrow that shows direction to current target
		this.mission_arrow=new PIXI.Sprite();
		this.mission_arrow.texture=game_res.resources["mission_arrow"].texture;
		this.mission_arrow.anchor.set(0.5,0.5);
		this.mission_arrow.x=400;
		this.mission_arrow.y=300;
		this.mission_arrow.visible=true;		
		dynamic_viewport.addChild(this.mission_arrow);	
			
		
		//array of tank bullets
		this.tank_bullets=[];
		for (var b=0;b<5;b++)
		{
			this.tank_bullets.push(new tank_bullet_class());		
			this.tank_bullets[b].visible=false;		
			dynamic_viewport.addChild(this.tank_bullets[b]);	
		}
		

		//mission target 
		this.cur_mission_target=0;
		this.mission_target=new PIXI.Sprite();
		this.mission_target.texture=game_res.resources["mission_target"].texture;
		this.mission_target.anchor.set(0.5,0.5);
		if (this.missions[this.cur_mission_target].id===-1)
		{
			this.mission_target.visible=true;
			this.mission_target.x=this.missions[this.cur_mission_target].pos[0];
			this.mission_target.y=this.missions[this.cur_mission_target].pos[1];					
		}
		else
		{					
			this.mission_target.visible=true;
		}				

		dynamic_viewport.addChild(this.mission_target);	
		
		
		//уровень жизни (здесь чтобы был выше остальных объектов)
		dynamic_viewport.addChild(this.player.life_lev_back,this.player.life_lev_front);	
		
		//окно что миссия проиграна
		this.m_failed=new PIXI.Sprite();
		this.m_failed.texture=init_res.resources["lose_screen"].texture;
		static_viewport.addChild(this.m_failed);
		this.m_failed.visible=false;
		
		
		//игровые сообщения
		this.messages=[new message_class(),new message_class(),new message_class(),new message_class(),new message_class()];
		for (var i=0;i<this.messages.length;i++)
		{
			this.messages[i].visible=false;
			this.messages[i].y=10+i*40;			
		}

								
		dynamic_viewport.visible=true;		
		static_viewport.visible=true;	
		
		global_process_func=this.process.bind(this);		
		
		this.eye_x=this.init_data.player_pos[0];
		this.eye_y=this.init_data.player_pos[1];
		
		
		//red blood screen
		this.red_screen=new PIXI.Sprite(init_res.resources["red_screen"].texture);
		static_viewport.addChild(this.red_screen);
		this.red_screen.visible=false;
		
		//следуй за стрелкой
		this.send_message("Follow the arrow");
		
	}
	
	send_message(msg, a_time=3)
	{
		

		var max_tm=9999999;
		var max_tm_ind=0;
		for (var i=0;i<this.messages.length;i++)
		{
			
			if (this.messages[i].msg_time<max_tm)
			{
				max_tm=this.messages[i].msg_time;
				max_tm_ind=i;
			}
			
			
			if (this.messages[i].visible===false)
			{
				this.messages[i].msg_time=game_tick;
				this.messages[i].alpha=1;
				this.messages[i].getChildAt(1).text=msg;
				this.messages[i].getChildAt(1).x=400-this.messages[i].getChildAt(1).width/2;
				this.messages[i].visible=true;
				this.messages[i].active_time=a_time;
				return;				
			}	
		}	
		
		//если не нашли ничего
		this.messages[max_tm_ind].msg_time=game_tick;
		this.messages[max_tm_ind].alpha=1;
		this.messages[max_tm_ind].getChildAt(1).text=msg;
		this.messages[max_tm_ind].getChildAt(1).x=400-this.messages[max_tm_ind].getChildAt(1).width/2;
		this.messages[max_tm_ind].visible=true;
		this.messages[max_tm_ind].active_time=a_time;
		
	}

	send_expl_as_bomb(px, py, id, range, damage)
	{
		for (var b=0;b<game.expl.length;b++)
		{
			if (game.expl[b].visible===false)
			{
				game.expl[b].place_as_bomb(px, py, id, range, damage);						
				return;
			}					
		}		
	}
	
	send_expl_as_blood(px, py, id, range, damage)
	{
		for (var b=0;b<game.expl.length;b++)
		{
			if (game.expl[b].visible===false)
			{
				game.expl[b].place_as_blood(px, py, 0, range, damage);						
				return;
			}					
		}		
	}
	
	add_tank_bullet(px, py, tx, ty)
	{		
		for (var b=0;b<this.tank_bullets.length;b++)
		{			
			if (this.tank_bullets[b].visible===false)
			{				
				this.tank_bullets[b].activate(px, py, tx, ty);
				return;				
			}
		}	
	}
	
	hide_outdoor(base_id)
	{
		this.is_indoor=true;
		for (var i=0;i<this.terrain.length;i++)
			this.terrain[i].visible=false;
		
		for (var i=0;i<this.regions.length;i++)
		{			
			if (this.regions[i].vis===true)
			{				
				for (var j=0;j<this.regions[i].obj.length;j++)
				{
					var obj_id=this.regions[i].obj[j];
					this.all_obj[obj_id].hide(base_id);
				}				
			}
		}		
		
		this.all_obj[base_id].floor.visible=true;
	}
	
	show_outdoor()
	{
		this.is_indoor=false;
		for (var i=0;i<this.terrain.length;i++)
			this.terrain[i].visible=true;
		
		for (var i=0;i<this.all_obj.length;i++)
			this.all_obj[i].show();			
	}
	
	bb_in_screen(x_min, y_min, x_max, y_max)
	{		
		var scr_minx=this.eye_x-400;
		var scr_miny=this.eye_y-300;
		var scr_maxx=this.eye_x+400;
		var scr_maxy=this.eye_y+300;
		
		if (x_min>scr_maxx)
			return false;
		
		if (y_min>scr_maxy)
			return false;
		
		if (x_max<scr_minx)
			return false;
		
		if (y_max<scr_miny)
			return false;
		
		return true;
	}
	
	ray_pass(x,y,x1,y1,uncheck_obj_id=-1)
	{		
		for (var i=0;i<this.regions.length;i++)
		{			
			//check if region visible
			if (this.regions[i].vis===true)
			{				
				//iterate through all objects in region
				for (var j=0;j<this.regions[i].obj.length;j++)
				{
					//do not check object with id (tank)
					var obj_id=this.regions[i].obj[j];
					if (this.all_obj[obj_id].visible===true)
					{
						if (this.all_obj[obj_id].ind!==uncheck_obj_id)
						{
							for (var k=0;k<this.all_obj[obj_id].collision.length;k++)
							{
								var x2=this.all_obj[obj_id].collision[k][0];
								var y2=this.all_obj[obj_id].collision[k][1];	

								var x3=this.all_obj[obj_id].collision[k][2];
								var y3=this.all_obj[obj_id].collision[k][3];
								
								var res=this.lines_intersect_check(x, y, x1, y1, x2, y2, x3, y3);
							
								if (res===true)
									return false;	
							}					
							
						}	
					}
				}				
			}
		}

		return true;		
	}
	
	lines_intersect_check(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y)
	{
		var s1_x, s1_y, s2_x, s2_y, i_x, i_y;
		s1_x = p1_x - p0_x;     s1_y = p1_y - p0_y;
		s2_x = p3_x - p2_x;     s2_y = p3_y - p2_y;

		var s, t;
		s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
		t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

		if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
			return true;		
		return false;
	}
	
	lines_intersect_pnt(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y)
	{
		var s1_x, s1_y, s2_x, s2_y, i_x, i_y;
		s1_x = p1_x - p0_x;     s1_y = p1_y - p0_y;
		s2_x = p3_x - p2_x;     s2_y = p3_y - p2_y;

		var s, t;
		s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
		t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

		if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
		{
			i_x = p0_x + (t * s1_x);
			i_y = p0_y + (t * s1_y);
			return [i_x,i_y];			
		}

		return [-999,-999];
	}
	
	closest_intersection(x0, y0, x1, y1)
	{
		var min_dist=999;
		var closest_point=[x1,y1,999,-999];
		
		var num_of_vis_obj=0;
		for (var i=0;i<this.regions.length;i++)
		{			
			//check if region visible
			if (this.regions[i].vis===true)
			{				
				//iterate through all objects in region
				for (var j=0;j<this.regions[i].obj.length;j++)
				{
					var obj_id=this.regions[i].obj[j];
					if (this.all_obj[obj_id].visible===true)
					{
						for (var l=0;l<this.all_obj[obj_id].collision.length;l++)
						{
							var x2=this.all_obj[obj_id].collision[l][0];
							var y2=this.all_obj[obj_id].collision[l][1];	

							var x3=this.all_obj[obj_id].collision[l][2];
							var y3=this.all_obj[obj_id].collision[l][3];	
								
							var ret0=this.lines_intersect_pnt(x0, y0, x1, y1, x2, y2, x3, y3);
							var i_x=ret0[0];
							var i_y=ret0[1];
							if (i_x!==-999)
							{
								var dx=i_x-this.player.x;
								var dy=i_y-this.player.y;
								var d=Math.sqrt(dx*dx+dy*dy);
								if (d<min_dist)
								{
									min_dist=d;
									closest_point=[i_x,i_y,min_dist,-999];								
								}
							}			
						}	
					}
				}				
			}
		}
		return closest_point;		
	}
		
	process_vis_obj(ax, ay)
	{		

		for (var i=0;i<this.regions.length;i++)
		{			
			if (this.bb_in_screen(this.regions[i].bb[0], this.regions[i].bb[1],this.regions[i].bb[2],this.regions[i].bb[3])===true)
			{						
		
				this.regions[i].vis=true;	

				//iterate through all objects in region
				for (var j=0;j<this.regions[i].obj.length;j++)
				{
					var obj_id=this.regions[i].obj[j];		

					if (this.all_obj[obj_id].class!=="ENEMY")
						this.all_obj[obj_id].visible=this.bb_in_screen(this.all_obj[obj_id].bb[0],this.all_obj[obj_id].bb[1],this.all_obj[obj_id].bb[2],this.all_obj[obj_id].bb[3]);
					this.all_obj[obj_id].process_func();
				}				
			}
			else
			{			
				this.regions[i].vis=false;	
			}
		}
	}
		
	dist_to_line(x, y, x1, y1, x2, y2)
	{

		var A = x - x1;
		var B = y - y1;
		var C = x2 - x1;
		var D = y2 - y1;

		var dot = A * C + B * D;
		var len_sq = C * C + D * D;
		var param = -1;
		param = dot / len_sq;

		var xx, yy;

		if (param < 0) {
		xx = x1;
		yy = y1;
		}
		else if (param > 1) {
		xx = x2;
		yy = y2;
		}
		else {
		xx = x1 + param * C;
		yy = y1 + param * D;
		}

		var dx = x - xx;
		var dy = y - yy;
		return Math.sqrt(dx * dx + dy * dy);
	}
	
	add_bullet(sx, sy, tx, ty, dist, rot, level)
	{
		for (var i=0;i<this.bullets.length;i++)
		{
			if (this.bullets[i].visible===false)
			{
				this.bullets[i].activate(sx, sy, tx, ty, dist, rot, level);
				return;				
			}			
		}			
	}
	
	pnt_in_quad(x,y,x1,y1,x2,y2)
	{
		
		if (x>x2)
			return false;
		if (x<x1)
			return false;
		if (y>y2)
			return false;
		if (y<y1)
			return false;
		return true;		
	}
	
	pnt_inside_base(x, y, obj_id)
	{
		
		var int_counts=0;
		for (var l=0;l<map_data[obj_id].indoor.length;l++)
		{
			var x1=map_data[obj_id].indoor[l][0];
			var y1=map_data[obj_id].indoor[l][1];

			var x2=map_data[obj_id].indoor[l][2];
			var y2=map_data[obj_id].indoor[l][3];
				
			var res=this.lines_intersect_check(x1,y1,x2,y2,x,y,x+9524683.46,y+93153563.12321);
			if (res===true)
				int_counts++;
		}			
		
		if (int_counts%2===0)
		{
			return false;
		}
		else
		{
			return true;
		}
		
	}
	
	mouse_down()
	{
		lm_down=true;
		this.player.fire();
	}
	
	mouse_up()
	{		
		lm_down=false;
	}
	
	get_terrain_image(bx,by)
	{
		for (var i=0; i<this.custom_texture.length;i++)
		{			
			if (bx===this.custom_texture[i][0])
			{
				if (by===this.custom_texture[i][1])
				{					
					return game_res.resources["terrain_"+bx+"_"+by].texture;					
				}
			}		
		}
		return game_res.resources["terrain"].texture;		
	}
			
	process()
	{
		
		var px = app.renderer.plugins.interaction.mouse.global.x;
		var py = app.renderer.plugins.interaction.mouse.global.y;
		//bound mouse to screen sizeToContent
		px=Math.min(px,800);
		px=Math.max(px,0);
		py=Math.min(py,600);
		py=Math.max(py,0);
		
		
		var m_dx=px-400;
		var m_dy=300-py;
		
		var dx=(wasd[3]-wasd[1])*this.player.alive;		
		var dy=(wasd[0]-wasd[2])*this.player.alive;	
		var d=Math.sqrt(dx*dx+dy*dy);
		
		if (d>0)
		{
			dx=dx/d;
			dy=dy/d;		
		}			
		
		this.player.x+=dx*1.5;
		this.player.y-=dy*1.5;
		this.mission_arrow.x=this.player.x;
		this.mission_arrow.y=this.player.y;
		
		this.eye_x=this.player.x+m_dx/1.5;
		this.eye_y=this.player.y-m_dy/1.5;		
		
		this.rot_ang=Math.atan2(this.eye_y-this.player.y,this.eye_x-this.player.x);
		this.player.process_func(this.rot_ang);		
					
		dynamic_viewport.x=400-this.eye_x;
		dynamic_viewport.y=300-this.eye_y;		

		//process terrain image shiftings
		{
		var terrain_block_x=Math.floor(this.eye_x/800);
		var terrain_block_y=Math.floor(this.eye_y/600);
		var cur_block_cen_x=terrain_block_x*800+400;
		var cur_block_cen_y=terrain_block_y*600+300;
		
		if (this.eye_x>cur_block_cen_x)
			cur_block_cen_x=1;
		else
			cur_block_cen_x=0;
		
		if (this.eye_y>cur_block_cen_y)
			cur_block_cen_y=1;
		else
			cur_block_cen_y=0;
		
		var tl_x=terrain_block_x+cur_block_cen_x-1;
		var tl_y=terrain_block_y+cur_block_cen_y-1;
		
		this.terrain[0].x=tl_x*800;
		this.terrain[0].y=tl_y*600;
		this.terrain[0].texture=this.get_terrain_image(tl_x,tl_y);
		
		this.terrain[1].x=(tl_x+1)*800;
		this.terrain[1].y=tl_y*600;
		this.terrain[1].texture=this.get_terrain_image(tl_x+1,tl_y);
		
		this.terrain[2].x=(tl_x+1)*800;
		this.terrain[2].y=(tl_y+1)*600;
		this.terrain[2].texture=this.get_terrain_image(tl_x+1,tl_y+1);
		
		this.terrain[3].x=tl_x*800;
		this.terrain[3].y=(tl_y+1)*600;
		this.terrain[3].texture=this.get_terrain_image(tl_x,tl_y+1);
		}
		
		//calc and process dynamic objects
		this.process_vis_obj(this.eye_x,this.eye_y);
		
		//process tank bullets
		for (var b=0;b<this.tank_bullets.length;b++)
			if (this.tank_bullets[b].visible===true)
				this.tank_bullets[b].process();
		
		//process fire traces
		for (var i=0;i<this.bullets.length;i++)
			if (this.bullets[i].visible===true)
				this.bullets[i].process();

		//process explosions
        for (var e= 0; e < this.expl.length; e++)
            this.expl[e].process();
		
		//process arrow to target and mission targets
		if (this.missions[this.cur_mission_target].id===-1)
		{
			var dt_x=this.missions[this.cur_mission_target].pos[0]-this.player.x;
			var dt_y=this.missions[this.cur_mission_target].pos[1]-this.player.y;
			var dt=Math.sqrt(dt_x*dt_x+dt_y*dt_y);
			this.mission_target.alpha=Math.sin(game_tick*3)/2+0.5;
			if (dt<10)
			{						
				//console.log(this.cur_mission_target);
				this.cur_mission_target++;		
				if (this.cur_mission_target===this.missions.length)
				{
					set_global_state("win_screen");		
					return;
				}
				
				if (this.missions[this.cur_mission_target].id===-1)
				{						
					this.mission_target.visible=true;
					this.mission_target.x=this.missions[this.cur_mission_target].pos[0];
					this.mission_target.y=this.missions[this.cur_mission_target].pos[1];					
				}
				else
				{					
					this.mission_target.visible=false;
				}
				this.send_message("★★★Mission "+this.cur_mission_target+" complete★★★");
			}
			var ang4=Math.atan2(dt_y, dt_x);
			this.mission_arrow.rotation=ang4;
		}
		else
		{
			var dt_x=this.all_obj[this.missions[this.cur_mission_target].id].x-this.player.x;
			var dt_y=this.all_obj[this.missions[this.cur_mission_target].id].y-this.player.y;
			var dt=Math.sqrt(dt_x*dt_x+dt_y*dt_y);
			this.mission_target.alpha=Math.sin(game_tick*3)/2+0.5;
			if (this.all_obj[this.missions[this.cur_mission_target].id].state==="dead")
			{						
				this.cur_mission_target++;		
				if (this.cur_mission_target===this.missions.length)
				{
					
					set_global_state("win_screen");	
					
					
					return;
				}

				if (this.missions[this.cur_mission_target].id===-1)
				{
					this.mission_target.visible=true;
					this.mission_target.x=this.missions[this.cur_mission_target].pos[0];
					this.mission_target.y=this.missions[this.cur_mission_target].pos[1];					
				}
				else
				{					
					this.mission_target.visible=false;
				}
				
				this.send_message("Mission "+this.cur_mission_target+" complete");
			}
			var ang4=Math.atan2(dt_y, dt_x);

			this.mission_arrow.rotation=ang4;
		}
		
		//process messages
		for (var i=0;i<this.messages.length;i++)
			this.messages[i].process();

	
		//process red screen
		if (this.red_screen.visible===true)
		{
			
			this.red_screen.alpha-=0.05;
			if (this.red_screen.alpha<=0)
			{
				this.red_screen.alpha=1;
				this.red_screen.visible=false;				
			}			
		}
		
		//process lose screen
		if (this.m_failed.visible===true)
		{
			this.m_failed.alpha+=0.002;
			if (this.m_failed.alpha>=1)
			{		
				this.m_failed.visible=false;
				this.m_failed.alpha=0;
				set_global_state("missions_screen");
			}
		}
		
		
		game_tick += 0.01666666;
	}
	
}

function load()
{
	
    app = new PIXI.Application(800, 600);
    app.view.style.position = 'absolute';
    app.view.style.left = '50%';
    app.view.style.top = '50%';
    app.view.style.transform = 'translate3d( -50%, -50%, 0 )';
    document.body.appendChild(app.view);
    document.body.style.backgroundColor = "black";
	
	dynamic_viewport=new PIXI.Container();
	static_viewport=new PIXI.Container();
	ui_viewport=new PIXI.Container();	
	
	app.stage.addChild(dynamic_viewport,static_viewport,ui_viewport);
	
	init_res=new PIXI.loaders.Loader();
    init_res.add("load_bar_frame", "init_res/load_bar_frame.png");
    init_res.add("load_bar_fill", "init_res/load_bar_fill.png");
	init_res.add("start_screen", "init_res/start_screen.png");
	init_res.add("lose_screen", "init_res/lose_screen.png");
	init_res.add("win_screen", "init_res/win_screen.png");
	init_res.add("red_screen", "init_res/red_screen.png");
	init_res.add("start_button", "init_res/start_button.png");
	init_res.add("next_button", "init_res/next_button.png");
	init_res.add("lock", "init_res/lock.png");
	init_res.add("missions_screen", "init_res/missions_screen.png");
	init_res.add("selected_window", "init_res/m_windows/selected_window.png");
	init_res.add("gun_data", "init_res/gun_data.txt");
	init_res.add("enemy_data", "init_res/enemy_data.txt");
	
	for (var i=0;i<6;i++)
		init_res.add("m_window_"+i, "init_res/m_windows/m_"+(i+1)+".png");		
	
	for (var i=0;i<7;i++)
		init_res.add("m_gun_"+i, "init_res/gun"+(i)+".png");	
	
	init_res.load(init_res_loaded);

	kongregateAPI.loadAPI(function(){
	  window.kongregate = kongregateAPI.getAPI();
	});


	function init_res_loaded()
	{		
	
		window.onkeydown = function (e)
		{		
			switch (e.keyCode)
			{				
				case 87:
				wasd[0]=1;
				break;
				
				case 65:
				wasd[1]=1;
				break;
				
				case 83:
				wasd[2]=1;
				break;
				
				case 68:
				wasd[3]=1;
				break;
				
				case 27:
				set_global_state("missions_screen");
				break;
				
			}		
		}
		window.onkeyup = function (e)
		{			
			switch (e.keyCode)
			{				
				case 87:
				wasd[0]=0;
				break;
				
				case 65:
				wasd[1]=0;
				break;
				
				case 83:
				wasd[2]=0;
				break;
				
				case 68:
				wasd[3]=0;
				break;
			}		
		};
			
		game=new game_class();
		start_screen=new start_screen_class();		
		lose_screen=new lose_screen_class();	
		win_screen=new win_screen_class();				
		missions_screen=new missions_screen_class();		
		set_global_state("start_screen");
		main_loop();		
	}	

}

function set_global_state(state)
{
	//clearing screen
	
    var stage_size = app.stage.children.length;
    for (var i = 0; i < stage_size; i++)
        app.stage.getChildAt(i).visible = false;
	global_state=state;	
	
	switch (global_state)
	{
        case "game":
			game.load_res0();
        break;
		
        case "start_screen":			
			start_screen.draw_and_init();
        break;
		
        case "lose_screen":			
			lose_screen.draw_and_init();
        break;
		
        case "win_screen":			
			win_screen.draw_and_init();
        break;
		
        case "missions_screen":
			missions_screen.draw_and_init();
        break;
		
	}
}

function main_loop()
{
	global_process_func();
    app.render(app.stage);
    requestAnimationFrame(main_loop);
}

