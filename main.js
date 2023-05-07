import webgl from 'opengl';
import font from 'prog_font';

function render(){
	webgl.draw_begin();
	font.draw(100, 100, [1.,0.,0.], 1., 20, "Hello WebGL");

	window.requestAnimationFrame(render);
}

window.addEventListener("load", (event)=>{
	var canvas = document.querySelector("#canvas_gl");
	webgl.init(canvas, true/*fullscreen*/, [0, 0, 0]/*background color*/);

	font.init('/imgs/webgl/arial-bold/');

	window.requestAnimationFrame(render);
});