/* Shader and jelly physics ported from user-supplied Claude HTML. */

(function(){
var cv=document.getElementById('glassCanvas');
var gl=cv.getContext('webgl',{antialias:false,alpha:true,premultipliedAlpha:false})||cv.getContext('experimental-webgl');
if(!gl){document.documentElement.dataset.glassRenderer='fallback';return;}

var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
var FS=[
'#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec2 u_res;uniform sampler2D u_tex;uniform vec4 u_a;uniform vec4 u_b;uniform float u_s;',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
'float sdBar(vec2 x){return sdRB(x-u_a.xy,u_a.zw,min(u_a.z,u_a.w));}',
'float sdInd(vec2 x){return sdRB(x-u_b.xy,u_b.zw,min(u_b.z,u_b.w));}',
'vec3 bg(vec2 x){return texture2D(u_tex,clamp(x/u_res,0.001,0.999)).rgb;}',
'vec3 barView(vec2 x){',
' float d=sdBar(x);vec3 col=bg(x);',
' if(d>0.){float sh=1.-clamp(d/(26.*u_s),0.,1.);col*=1.-0.26*sh*sh;}',
' if(d<1.5*u_s){',
'  float m=min(u_a.z,u_a.w);float t=clamp(-d/(0.6*m),0.,1.);float e=1.5;',
'  vec2 n=normalize(vec2(sdBar(x+vec2(e,0.))-sdBar(x-vec2(e,0.)),sdBar(x+vec2(0.,e))-sdBar(x-vec2(0.,e)))+1e-5);',
'  vec3 ci=bg(x-n*pow(1.-t,2.2)*0.6*m);',
'  float rim=pow(1.-t,3.);',
'  float sp=pow(max(dot(n,normalize(vec2(-0.6,-0.8))),0.),3.)+0.5*pow(max(dot(n,normalize(vec2(0.6,0.8))),0.),3.);',
'  ci+=vec3(rim*(0.06+0.35*sp));',
'  col=mix(col,ci,clamp(-d/(1.5*u_s)+0.5,0.,1.));',
' }',
' return col;}',
'void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);',
' if(sdBar(px)>26.*u_s && sdInd(px)>1.5*u_s){gl_FragColor=vec4(0.);return;}',
' vec3 col=barView(px);',
' float d=sdInd(px);',
' if(d<1.5*u_s){',
'  float m=min(u_b.z,u_b.w);float t=clamp(-d/(0.6*m),0.,1.);float e=1.5;',
'  vec2 n=normalize(vec2(sdInd(px+vec2(e,0.))-sdInd(px-vec2(e,0.)),sdInd(px+vec2(0.,e))-sdInd(px-vec2(0.,e)))+1e-5);',
'  vec3 ci=barView(px-n*pow(1.-t,2.2)*0.6*m)*0.84;',
'  float rim=pow(1.-t,3.);',
'  float sp=pow(max(dot(n,normalize(vec2(-0.6,-0.8))),0.),3.)+0.5*pow(max(dot(n,normalize(vec2(0.6,0.8))),0.),3.);',
'  ci+=vec3(rim*(0.05+0.3*sp));',
'  col=mix(col,ci,clamp(-d/(1.5*u_s)+0.5,0.,1.));',
' }',
' gl_FragColor=vec4(col,1.);',
'}'
].join('\n');

function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(s));return s;}
var pr=gl.createProgram();
gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));
gl.bindAttribLocation(pr,0,'p');gl.linkProgram(pr);
if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){document.documentElement.dataset.glassRenderer='fallback';return;}
gl.useProgram(pr);
var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
var U={};['u_res','u_tex','u_a','u_b','u_s'].forEach(function(n){U[n]=gl.getUniformLocation(pr,n);});

var tex=gl.createTexture(),W=0,H=0,dpr=1,cssWidth=0,cssHeight=0;
/* Reference painted pages replaced by real finance HTML. */
var background=WebGLBackground(gl,tex,cv),cur=3;
function site(dt){if(sel!==cur){cur=sel;WebGLFinance.navigate(sel);}background.draw(W,H);}
function resize(){
 dpr=Math.min(window.devicePixelRatio||1,2);
 var cw=cv.clientWidth||window.innerWidth,ch=cv.clientHeight||window.innerHeight;
 cssWidth=cw;cssHeight=ch;
 W=Math.round(cw*dpr);H=Math.round(ch*dpr);
 var m=Math.max(W,H);if(m>2048){var f=2048/m;W=Math.round(W*f);H=Math.round(H*f);dpr*=f;}
 cv.width=W;cv.height=H;gl.viewport(0,0,W,H);
 background.resize(W,H);
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',function(){setTimeout(resize,200);});
var lost=false;
cv.addEventListener('webglcontextlost',function(e){e.preventDefault();lost=true;});
cv.addEventListener('webglcontextrestored',function(){location.reload();});

/* ---- tab bar + jelly physics (CSS px) ---- */
var bar=document.getElementById('bar'),btns=[].slice.call(bar.children);
var sel=3,x=null,v=0,j=0,jv=0,dir=1,last=0;
var lastReport=0;
var K=160,D=15,KJ=300,DJ=12,GJ=0.002;
function cells(){var r=bar.getBoundingClientRect(),pad=6,cw=(r.width-2*pad)/5;
 return{r:r,cw:cw,cx:function(i){return r.left+pad+cw*(i+.5);}};}
var drag=null,dragTarget=0,nearest=0;
function idxAt(c,px){return Math.max(0,Math.min(4,Math.round((px-c.cx(0))/c.cw)));}
function setOn(i){btns.forEach(function(o,k){o.classList.toggle('on',k===i);});}
bar.addEventListener('pointerdown',function(e){
 e.preventDefault();
 var c=cells(),px=e.clientX;
 if(x!==null&&Math.abs(px-x)<c.cw/2+4){            /* grab the indicator */
  drag={id:e.pointerId,off:x-px,start:px,index:idxAt(c,px),moved:false};dragTarget=x;
  try{bar.setPointerCapture(e.pointerId);}catch(_){}
 }else{                                              /* tap a button: new animation starts from current position */
  var i=idxAt(c,px);if(i===sel)return;
  sel=i;if(x!==null)dir=(c.cx(i)-x)>=0?1:-1;setOn(i);
 }
},{passive:false});
bar.addEventListener('pointermove',function(e){
 if(!drag||e.pointerId!==drag.id)return;e.preventDefault();
 var c=cells();if(Math.abs(e.clientX-drag.start)>5)drag.moved=true;if(!drag.moved)return;
 dragTarget=Math.max(c.cx(0),Math.min(c.cx(4),e.clientX+drag.off));
 nearest=idxAt(c,dragTarget);setOn(nearest);
},{passive:false});
function release(e){
 if(!drag||e.pointerId!==drag.id)return;
 var c=cells();sel=e.type==='pointercancel'?cur:drag.moved?idxAt(c,Math.max(c.cx(0),Math.min(c.cx(4),x+v*0.12))):drag.index;
 var tappedMore=!drag.moved&&sel===4&&cur===4;setOn(sel);drag=null;if(tappedMore)WebGLFinance.navigate(4);
}
bar.addEventListener('pointerup',release);bar.addEventListener('pointercancel',release);
function step(h,target){
 var kk=drag?420:K,dd=drag?26:D;
 var a=kk*(target-x)-dd*v;
 v+=a*h;x+=v*h;
 var ad=a*dir;
 var ja=-KJ*j-DJ*jv+GJ*ad;
 jv+=ja*h;j+=jv*h;
}
function frame(t){
 requestAnimationFrame(frame);if(lost||!W||document.hidden)return;
 if(cv.clientWidth!==cssWidth||cv.clientHeight!==cssHeight)resize();
 if(document.body.classList.contains('sheet-open')||document.body.classList.contains('keyboard-open')){last=t;return;}
 var dt=Math.min(Math.max((t-last)/1000,0),1/30);last=t;
 site(dt);
 var c=cells(),target=drag?dragTarget:c.cx(sel);
 if(x===null)x=target;
 if(drag&&Math.abs(v)>5)dir=v>=0?1:-1;
 var n=3;for(var i=0;i<n;i++)step(dt/n,target);
 if(Math.abs(target-x)<0.05&&Math.abs(v)<0.5&&Math.abs(j)<0.002&&Math.abs(jv)<0.05){x=target;v=0;j=0;jv=0;}
 var e=Math.max(-0.25,Math.min(0.7,j+Math.abs(v)*0.00015));
 var r=c.r,sc=W/cv.clientWidth,cy=(r.top+r.height/2)*sc;
 var hw=(c.cw/2+4)*(1+e),hh=(r.height/2+5)/(1+e*0.7);
 gl.uniform2f(U.u_res,W,H);gl.uniform1i(U.u_tex,0);gl.uniform1f(U.u_s,sc);
 gl.uniform4f(U.u_a,(r.left+r.width/2)*sc,cy,r.width/2*sc,r.height/2*sc);
 gl.uniform4f(U.u_b,x*sc,cy,hw*sc,hh*sc);
 gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.SCISSOR_TEST);
var top=Math.max(0,Math.floor(cy-Math.max(r.height/2*sc+26*sc,hh*sc+3*sc)));
var bottom=Math.min(H,Math.ceil(cy+Math.max(r.height/2*sc+26*sc,hh*sc+3*sc)));
gl.scissor(0,H-bottom,W,bottom-top);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.disable(gl.SCISSOR_TEST);
if(!lastReport||t-lastReport>200){lastReport=t;cv.dataset.indicatorX=x.toFixed(2);cv.dataset.targetX=target.toFixed(2);cv.dataset.indicatorWidth=(hw*2).toFixed(2);cv.dataset.selected=String(sel);}
}
document.addEventListener('finance:navigation',function(event){sel=cur=event.detail.index;var c=cells();if(x!==null)dir=c.cx(sel)>=x?1:-1;setOn(sel);});
btns.forEach(function(button,index){button.addEventListener('click',function(event){if(event.detail!==0)return;if(index===4&&sel===4){WebGLFinance.navigate(4);return;}sel=index;if(x!==null)dir=cells().cx(index)>=x?1:-1;setOn(sel);});});
document.documentElement.dataset.glassRenderer='webgl';
notifyGlassNavigation();
resize();requestAnimationFrame(frame);
})();
