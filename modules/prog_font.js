import webgl from 'opengl';

/*
 *
 */
const font = new function(){
	this.vertexShader = `
	attribute vec2 a_vertex;
	attribute vec2 a_texcoord;

	uniform vec2 u_canvasSize;
	uniform float u_size;// pixel olarak büyüklük
	uniform vec2 u_position;// yazı pozisyonu

	uniform float u_widthScale;// char width [0,1]
	uniform float u_heightScale;// char width [0,1]
	uniform float u_yoffsetScale;// [0,1]

	varying vec2 v_texcoord;

	void main(){
		vec2 pixelScale = vec2(2.0)/u_canvasSize;

		vec2 p;

		p = a_vertex.xy * u_size;
		p.x *= u_widthScale;
		p.y *= u_heightScale;

		p.y += (1.0 - u_heightScale) * u_size;
		p.y -= u_yoffsetScale * u_size;

		p += u_position*vec2(1, -1) - u_canvasSize*vec2(0.5, -0.5);

		p *= pixelScale;

		gl_Position = vec4(p.xy, 0, 1);

		v_texcoord = a_texcoord;//*vec2(1,-1);
	}
	`;

	this.fragmentShader = `
	precision mediump float;

	uniform vec3 u_rgb;// renk
	uniform float u_alpha;
	uniform sampler2D u_texture;// hangi texture

	varying vec2 v_texcoord;

	void main(){
		//gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
		float r = texture2D(u_texture, v_texcoord).r;
		if ( r>0.0 ){
			gl_FragColor = vec4(r*u_rgb, r*u_alpha);
		}else{
			gl_FragColor = vec4(0);
		}
	}
	`;

	this.program = null;
	this.vertexBuffer = null;
	this.textureBuffer = null;

	this.fontTexture = [];
	this.fontMap = [];

	this.info_size = 0;
	this.common_scaleW = 0;
	this.common_scaleH = 0;

	// attribute
	this.loc_vertex = null;
	this.loc_texcoord = null;
	
	// uniform
	this.loc_translate = null;
	this.loc_scale = null;
	this.loc_canvasSize = null;
	this.loc_size = null;
	this.loc_rgb = null;
	this.loc_alpha = null;
	this.loc_position =  null;
	this.loc_widthScale = null;
	this.loc_heightScale = null;
	this.loc_yoffsetScale = null;

	this.drc = null;

	/*
	 */
	this.init = function(drc){
		this.drc = drc;

		this.program = webgl.createProgramFromCode(this.vertexShader, this.fragmentShader);
		webgl.gl.useProgram(this.program);

		this.loadFont();

		this.loc_vertex 	= webgl.gl.getAttribLocation(this.program, "a_vertex");
		this.loc_texcoord 	= webgl.gl.getAttribLocation(this.program, "a_texcoord");

		this.loc_canvasSize 	= webgl.gl.getUniformLocation(this.program, "u_canvasSize");
		this.loc_size 			= webgl.gl.getUniformLocation(this.program, "u_size");
		this.loc_rgb 			= webgl.gl.getUniformLocation(this.program, "u_rgb");
		this.loc_alpha 			= webgl.gl.getUniformLocation(this.program, "u_alpha");
		this.loc_position 		= webgl.gl.getUniformLocation(this.program, "u_position");
		this.loc_widthScale 	= webgl.gl.getUniformLocation(this.program, "u_widthScale");
		this.loc_heightScale 	= webgl.gl.getUniformLocation(this.program, "u_heightScale");
		this.loc_yoffsetScale 	= webgl.gl.getUniformLocation(this.program, "u_yoffsetScale");
	}

	/*
	 */
	this.initFontVertex = function(){
		// vertex buffer {
		this.vertexBuffer = webgl.gl.createBuffer();
		webgl.gl.bindBuffer(webgl.gl.ARRAY_BUFFER, this.vertexBuffer);
		var vertexList = [];
		for(var i=0; i<this.fontMap.length; i++){
			vertexList.push(...[	0.0, 0.0,
									0.0, 1.0,
									1.0, 0.0,
									1.0, 1.0]);
		}
		webgl.gl.bufferData(webgl.gl.ARRAY_BUFFER, new Float32Array(vertexList), webgl.gl.STATIC_DRAW);
		
		var loc = webgl.gl.getAttribLocation(this.program, "a_vertex");
		webgl.gl.vertexAttribPointer(loc, 2/*each data size*/, webgl.gl.FLOAT, false/*normalize*/, 0/*stride*/, 0/*offset*/ );
		webgl.gl.enableVertexAttribArray(loc);
		// }
	}

	/*
	 */
	this.initFontTexture = function(){
		// texture coord buffer {
		var texturePointList = [];
		var i=0;
		for(var id in this.fontMap){
			let charMap = this.fontMap[id];
			charMap.offset = i;
			i++;
			var x = charMap.x/this.common_scaleW;
			var y = charMap.y/this.common_scaleH;
			var w = charMap.width/this.common_scaleW;
			var h = charMap.height/this.common_scaleH;
			texturePointList.push(...[	x, y+h,
										x, y,
										x+w, y+h,
										x+w, y] );
		}
		this.textureBuffer = webgl.gl.createBuffer();
		webgl.gl.bindBuffer(webgl.gl.ARRAY_BUFFER, this.textureBuffer);
		webgl.gl.bufferData(webgl.gl.ARRAY_BUFFER, new Float32Array(texturePointList), webgl.gl.STATIC_DRAW);
	}

	/*
	 * https://stackoverflow.com/questions/25956272/better-quality-text-in-webgl
	 * https://www.angelcode.com/products/bmfont/
	 * https://css-tricks.com/techniques-for-rendering-text-with-webgl/
	 */
	this.loadFont = function(){
		var xhr = new XMLHttpRequest();

		xhr.onload = () => {
			this.loadInfoCommon(xhr.responseXML);
			this.loadFontTexture(xhr.responseXML);
			this.loadFontMap(xhr.responseXML);
			this.initFontTexture();
			this.initFontVertex();
		};

		xhr.onerror = () => {
			console.log("Error while getting XML.");
		};

		xhr.open("GET", this.drc+"index.fnt");
		xhr.responseType = "document";
		xhr.send();
	}

	/*
	 */
	this.loadInfoCommon = function(responseXML){
		var info = responseXML.querySelectorAll('info')[0];
		var common = responseXML.querySelectorAll('common')[0];

		this.info_size = Math.abs(info.attributes.size.value);
		this.common_scaleW = Number(common.attributes.scaleW.value);
		this.common_scaleH = Number(common.attributes.scaleH.value);

		console.log('WebGL Font',info, common);
	}
	
	/*
	 */
	this.loadFontMap = function(responseXML){
		var charList = responseXML.querySelectorAll('char');
		console.log('WebGL Karakter Sayısı', charList.length);
		this.fontMap = [];
		for(var c of charList){
			var id = c.getAttribute('id');
			this.fontMap[id] = {};
			for (const attr of c.attributes) {
				this.fontMap[id][attr.name] =Number(attr.value);
			}
			this.fontMap[id].widthScale 	= this.fontMap[id].width / this.info_size;
			this.fontMap[id].heightScale 	= this.fontMap[id].height / this.info_size;
			this.fontMap[id].xoffsetScale 	= this.fontMap[id].xoffset / this.info_size;
			this.fontMap[id].yoffsetScale 	= this.fontMap[id].yoffset / this.info_size;
			this.fontMap[id].xadvanceScale 	= this.fontMap[id].xadvance / this.info_size;
		}
		//console.log(this.fontMap);
	}

	/*
	 */
	this.loadFontTexture = function(responseXML){
		var textureList = responseXML.querySelectorAll('page');
		this.fontTexture = [];
		for(var c of textureList){
			var id = c.getAttribute('id');
			this.fontTexture[id] = {};
		  for (const attr of c.attributes) {
			  this.fontTexture[id][attr.name] = attr.value;
		  }
		}
  
		for(var t of this.fontTexture){
		  t.img = new Image;
		  t.img.src = "//agarz.com"+this.drc+t.file;
		  t.texture = null;
		  t.img.onload = function(){
			  this.texture = webgl.gl.createTexture();
			  webgl.gl.bindTexture(webgl.gl.TEXTURE_2D, this.texture);
			  webgl.gl.texImage2D(webgl.gl.TEXTURE_2D, 0, webgl.gl.RGBA, webgl.gl.RGBA, webgl.gl.UNSIGNED_BYTE, this.img);
			  webgl.gl.texParameteri(webgl.gl.TEXTURE_2D, webgl.gl.TEXTURE_MIN_FILTER, webgl.gl.LINEAR);
			  webgl.gl.texParameteri(webgl.gl.TEXTURE_2D, webgl.gl.TEXTURE_MAG_FILTER, webgl.gl.LINEAR);
			  webgl.gl.generateMipmap(webgl.gl.TEXTURE_2D);
			  //this.texture = webgl.createTexture(this.img);
			  //console.log(this);
		  }.bind(t);
		}
		//console.log("this.fontTexture", this.fontTexture);
	}

	/*
	 */
	this.switch = function(){
		if ( webgl.prog_last_switch==this ){
			return;
		}		
		webgl.prog_last_switch = this;

		webgl.gl.useProgram(this.program);
		
		webgl.gl.enableVertexAttribArray(this.loc_vertex);
		webgl.gl.bindBuffer(webgl.gl.ARRAY_BUFFER, this.vertexBuffer);
		webgl.gl.vertexAttribPointer(this.loc_vertex, 2/*each data size*/, webgl.gl.FLOAT, false/*normalize*/, 0/*stride*/, 0/*offset*/ );

		
		webgl.gl.enableVertexAttribArray(this.loc_texcoord);
		webgl.gl.bindBuffer(webgl.gl.ARRAY_BUFFER, this.textureBuffer);
		webgl.gl.vertexAttribPointer(this.loc_texcoord, 2, webgl.gl.FLOAT, false, 0, 0);
	}

	/*
	 */
	this.getTextWidth = function(text){
		if ( this.fontMap.length==0 )
			return 0;

		let w = 0;
		for(var i=0; i<text.length; i++){
			let code = text.charCodeAt(i);
			if ( code=="undefined" || code==null){
				//debugger;
			}
			let charMap = this.fontMap[code];
			if ( charMap==null ){
				//console.log('..',ctx.font, text[i], " code ", code, code.toString(16));
				continue;
				//debugger;
			}
			//let wh = charMap.width / charMap.height;
			//w += wh;
			w += charMap.xadvanceScale;
		}
		return w;
	}

	/*
	 * text size değerleri için x koordinbatı orta noktasını döndürür
	 * bu noktada çizilen size büyüklüğünde text yazısı tam ortada görünür
	 */
	this.getCenterX = function(text, size){
		let w = this.getTextWidth(text)*size;
		let x = (webgl.gl.canvas.width-w)*.5;
		return x;
	}

	/*
	 */
	this.draw = function(x, y, rgb, alpha, size, text){
		if ( this.fontTexture.length == 0 )
			return;

		this.switch();

		webgl.gl.uniform2f(this.loc_canvasSize, webgl.gl.canvas.width, webgl.gl.canvas.height );
		webgl.gl.uniform1f(this.loc_size, size);
		webgl.gl.uniform3fv(this.loc_rgb, rgb);
		webgl.gl.uniform1f(this.loc_alpha, alpha);

		//x -= this.getTextWidth(text)*.5*size;
		//y -= 0.5*size;

		var w = 0;
		for(var i=0; i<text.length; i++){
			let code = text.charCodeAt(i);
			let charMap = this.fontMap[code];
			if ( charMap==null )
				continue;

			webgl.gl.uniform2f(this.loc_position, x, y);
			webgl.gl.uniform1f(this.loc_widthScale, charMap.widthScale);
			webgl.gl.uniform1f(this.loc_heightScale, charMap.heightScale);
			webgl.gl.uniform1f(this.loc_yoffsetScale, charMap.yoffsetScale);

			webgl.gl.bindTexture(webgl.gl.TEXTURE_2D, this.fontTexture[charMap.page].texture);
			webgl.gl.drawArrays(webgl.gl.TRIANGLE_STRIP, charMap.offset*4/*offset*/, 4/*count*/);

			let wd = size*charMap.xadvanceScale;
			x += wd;
			w += wd;
		}

		return w;
	}
}

export default font;