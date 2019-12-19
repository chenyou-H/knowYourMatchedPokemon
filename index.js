//require
const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const querystring = require('querystring');

//const special value
const server_address = 'localhost';
const port = 3000;

let server = http.createServer(function(req,res){
	const str1=req.url.toString();
	
	if(req.url==='/'){
		console.log("Now Listening on Port 3000");
		console.log("request was made: /");
		
		let html_stream = fs.createReadStream('./html/search-SP.html','utf8');
		res.writeHead(200, {'Content-Type':"text/html"});
		html_stream.pipe(res);
	}
	else if(str1.startsWith('/favicon.ico')===true){
		
		console.log("request was made: /favicon.ico");
		
		res.writeHead(404);
		res.end();
	}
	else if(str1.startsWith('/ShinyPokePng/')===true){
		
		console.log("request was made: /ShinyPokePng/");
		
		let image_stream = fs.createReadStream(`.${str1}`);
		res.writeHead(200,{'Content-Type':'image/jpeg'});
		image_stream.pipe(res);
		
		image_stream.on('error',function(err){
			console.log(err);
			res.writeHead(404);
			return res.end();
		});
	}
	else if(str1.startsWith('/search')===true){
		let q = url.parse(req.url,true);
		console.log("request was made: /"+`${q.query.q}`);
		
		let user_input = q.query.q.match(/\d+/g).map(Number);

		
		let pokiApiEndpoint = 'https://pokeapi.co/api/v2/pokemon/';
		
		console.log(`${user_input}`);
		let sum=0;
		for(let i=0;i<user_input.length;i++){
			sum+=user_input[i];
		}
	
		//moduls 802 is because pokeApi only have sprites's image until ID 802 
		let pokeID = sum%802;
		
		if(fs.existsSync(`./ShinyPokePng/${pokeID}.jpg`)===true){
			console.log("!!!the image is cached!!!");
			let pokeInfor="";
			let readPokeStream = fs.createReadStream(`./ShinyPokeJSON/${pokeID}.txt`,'utf8');
			readPokeStream.on("data",function(chunk){
				pokeInfor+=chunk;
			});
			readPokeStream.on("end",function(){
				let image_path = "./ShinyPokePng/"+pokeID+".jpg";
				let pokeInforJSON = JSON.parse(pokeInfor);
			
				pokeAbility(image_path,pokeInforJSON.species.name,pokeInforJSON,res);
			});
		}
		else{
			create_Search_Rrquest(`${pokiApiEndpoint}${pokeID}`,res,pokeID);
		}
		
	}	
});

const create_Search_Rrquest = function(apiEndpoint,res,pokeID){

		let pokeReq = https.request(apiEndpoint,function(pokeBuffer){
			let pokeResponse="";
			console.log("poke_request: request pokemon infomation JSON");
			
			let JSON_path = "./ShinyPokeJSON/";
			
			let writer = fs.createWriteStream(JSON_path+pokeID+".txt");
			
			pokeBuffer.on("data",data=>{pokeResponse+=data});
			pokeBuffer.on("end",()=>{
				let pokeInfor = JSON.parse(pokeResponse);
				download_PokePNG(pokeInfor,res);
				writer.write(pokeResponse);
				
			});
			
	}).on("error",(err)=>{
		console.log("Error: "+err.message)
	});
	
	pokeReq.end();
}

const download_PokePNG = function(pokeInfor,res){
	
	let pokemonName = pokeInfor.species.name;
	let pokemonID = pokeInfor.id;
	let image_path = "./ShinyPokePng/"+pokemonID+".jpg";
	let imag_url = pokeInfor.sprites.front_shiny;
	
	let image_req = https.get(imag_url, function(image_res){
		let new_img = fs.createWriteStream(image_path,{'encoding':null});
		image_res.pipe(new_img);
		new_img.on('finish',function(){
			console.log("the image " +pokemonName+" is downloaded");
			pokeAbility(image_path,pokemonName,pokeInfor,res);
		});
	});
	image_req.on('error',function(err){console.log(err);});
}

const pokeAbility  = function(image_path,pokemonName,pokeInfor,res){
	
	let pokeAbilityEndpoint ='https://pokeapi.co/api/v2/ability/';
	
	let min=0; 
    let max=pokeInfor.abilities.length-1;  
	
    let random =Math.floor(Math.random() * (+max - +min)) + +min; 
	let pokeAbilityText = pokeInfor.abilities[random].ability.name;
	let pokeAbility_path = "./PokeAbility/";
	
	if(fs.existsSync(`./pokeAbility_path/${pokeAbilityText}.txt`)===true){
		let pokeAbilityInfor="";
		let readPokeStream = fs.createReadStream(`./pokeAbility_path/${pokeAbilityText}.txt`,'utf8');
			readPokeStream.on("data",function(chunk){
				pokeAbilityInfor+=chunk;
			});
			readPokeStream.on("end",function(){
				
				let pokeAbilityInforJSON = JSON.parse(pokeAbilityInfor);
			
				genererate_webpage(image_path,pokemonName,pokeAbilityInforJSON.name,pokeAbilityInforJSON.effect_entries[0].effect ,res);
			});
			
	}
	else{
		let apiEndpoint = pokeAbilityEndpoint+pokeAbilityText;
		reqPokeAbility(image_path,pokemonName,pokeAbilityText,apiEndpoint,res);
	}
	
	
	
};

const reqPokeAbility = function(image_path,pokemonName,pokeAbility, apiEndpoint,res){
	
	let pokeReq = https.request(apiEndpoint,function(pokeBuffer){
			let pokeResponse="";
			console.log("poke_request: request pokemon infomation JSON");
			
			let pokeAbility_path = "./PokeAbility/";
			
			let writer = fs.createWriteStream(pokeAbility_path+pokeAbility+".txt");
			
			pokeBuffer.on("data",data=>{pokeResponse+=data});
			pokeBuffer.on("end",()=>{
				let pokeAbilityJSON = JSON.parse(pokeResponse);
				writer.write(pokeResponse);
				console.log("poke_request: write to file is done");
			
				genererate_webpage(image_path,pokemonName,pokeAbilityJSON.name,pokeAbilityJSON.effect_entries[0].effect ,res);
			});
			
	}).on("error",(err)=>{
		console.log("Error: "+err.message)
	});
	
	pokeReq.end();
	
	
}


const genererate_webpage = function(image_path,pokemonName,pokeAbilityName,pokeAbilityEfffect,res){
		res.writeHead(200, {'Content-Type':"text/html"});
		setTimeout(function(){res.write(`<style>body{	background-image: url("./ShinyPokePng/bg.jpg")	}</style>`); res.end();	},0)	
		
		res.write(`<style>h2{	font-style: italic	}</style>`);
		res.write(`<body>`);
		res.write(`<h1> You are the shiny pokemon -- ${pokemonName}</h1>`);
		res.write(`<img src = "${image_path}" alt="something wrong" width=250 height = 250; vertical-align:center>`);
		res.write(`<h2> You ability is ${pokeAbilityName}<br>`);
		res.write(`${pokeAbilityEfffect}</h2>`);

		res.write(`</body>`);
		
}

server.listen(port,server_address);
