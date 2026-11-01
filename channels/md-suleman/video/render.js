// Usage: node render.js stills t1,t2,...   |   node render.js frames <outDir> [workers]
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const URL='file://'+path.join(__dirname,'day01.html');
const FPS=30, DUR=52;
(async()=>{
 const mode=process.argv[2];const b=await chromium.launch();
 const mk=async()=>{const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.error('PAGEERR',e.message));await p.goto(URL);await p.evaluate(()=>window.ready);return p};
 if(mode==='stills'){const p=await mk();for(const t of process.argv[3].split(',').map(Number)){await p.evaluate(t=>seek(t),t);await p.screenshot({path:`/tmp/stills/t${t}.png`})}await b.close();return}
 const out=process.argv[3],W=+(process.argv[4]||4);fs.mkdirSync(out,{recursive:true});
 const total=FPS*DUR;let next=0;
 await Promise.all(Array.from({length:W},async()=>{const p=await mk();for(;;){const i=next++;if(i>=total)break;await p.evaluate(t=>seek(t),i/FPS);await p.screenshot({path:`${out}/${String(i).padStart(5,'0')}.jpg`,type:'jpeg',quality:94});if(i%150===0)console.log('frame',i,'/',total)}}));
 await b.close();
})();
