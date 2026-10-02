const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let name;try{name=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
}).listen(8777,'127.0.0.1',()=>console.log('WebGL Glass Bar: http://localhost:8777'));
