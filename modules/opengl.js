/*
 */
const webgl = new function(){
	
	this.canvas_gl = null;
	this.gl = null;

	this.prog_last_switch = null;
	this.alpha = 1.;

	this.bgColor;
		
	/*
	 * document.ready içinde bir kere çalıştırılarak webgl kurulumu tamamlanır
	 */
	this.init = function(canvas, fullscreen, bgColor){
		this.canvas_gl = canvas;
		this.gl = canvas_gl.getContext("webgl");
		this.timeFirst = new Date().getTime();

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		this.bgColor = bgColor;

		if ( fullscreen ){
			this.onResize();
			window.addEventListener("resize", this.onResize);
		}
	}

	/*
	 */
	this.onResize = function(event){
		webgl.canvas_gl.width = window.innerWidth;
		webgl.canvas_gl.height = window.innerHeight;
	}
	
	/*
	 */
	this.onCanvasResize = function(w, h){
		this.canvas_gl.width = w;
		this.canvas_gl.height = h;
	}
	
	/*
	 * Çizim fonksiyonlarından önce her framede bir kere çalıştırılır
	 */
	this.draw_begin = function(){
		this.gl.viewport(0, 0, this.canvas_gl.width, this.canvas_gl.height);

		this.gl.clearColor(this.bgColor[0], this.bgColor[1], this.bgColor[2], 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	/*
	 * webgl buffer yaratmak için
	 */
	this.initBuffer = function(data){
		var buffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(data), this.gl.STATIC_DRAW);
		return buffer;
	}
	
	/*
	 * shader yaratılır, döndürür
	 * hata olursa console da yazar
	 */
	this.createShader = function(type, source){
		var shader = this.gl.createShader(type);
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);
		var success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
		if (success){
			return shader;
		}

		console.log(this.gl.getShaderInfoLog(shader));
		this.gl.deleteShader(shader);
		return null;
	}
	
	/*
	 * bir program yaratılır, vertex ve pixel shaderler bağlanır, döndürür
	 * hata olursa console da yazar
	 */
	this.createProgramFromShader = function(vertexShader, fragmentShader){
		var program = this.gl.createProgram();
		this.gl.attachShader(program, vertexShader);
		this.gl.attachShader(program, fragmentShader);
		this.gl.linkProgram(program);// programlar derlenir
		var success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
		if (success){
			return program;
		}

		console.log(this.gl.getProgramInfoLog(program));
		this.gl.deleteProgram(program);
		return null;
	}

	/*
	 */
	this.createProgramFromCode = function(vs_code, fs_code){
		var vs = this.createShader(this.gl.VERTEX_SHADER, vs_code);
		var fs = this.createShader(this.gl.FRAGMENT_SHADER, fs_code);
		
		return this.createProgramFromShader(vs, fs);
	}
}

export default webgl;