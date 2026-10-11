const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{for(const mode of ['pov','follow']){const p=await browser.newPage({viewport:{width:1365,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||require('node:url').pathToFileURL(require('node:path').resolve(__dirname,'../index.html')).href);await p.click('#'+mode);
async function route(name,points,level){const result=await p.evaluate(({points})=>{const h=__house,out=[];for(const [x,z] of points){let count=0;for(;count<650;count++){const dx=x-h.player.x,dz=z-h.player.z,dist=Math.hypot(dx,dz);if(dist<.025)break;h.player.yaw=Math.atan2(dx,-dz);document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));h.movePlayer(Math.min(1/60,dist/1.8));}document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));out.push({target:[x,z],x:h.player.x,z:h.player.z,y:h.player.y,level:h.player.level,count});if(count===650)break;}return out;},{points});const last=result.at(-1);assert(result.every(r=>r.count<650),`${mode} ${name}: ${JSON.stringify(last)}`);assert.equal(last.level,level,`${mode} ${name}`);console.log(mode,name,'PASS',last.level,last.y);}
// Start at normal living-room spawn. No repositioning or floor selector after this.
await route('first to second',[[3.3,6.45],[3.3,7.22],[.72,7.22],[.72,3.86],[3.3,3.86],[3.3,5]],2);
await route('second to penthouse',[[3.3,7.22],[.72,7.22],[.72,3.86],[3.3,3.86],[3.3,5]],3);
await route('penthouse to second',[[3.3,3.86],[.72,3.86],[.72,7.22],[3.3,7.22],[3.3,5]],2);
await route('second to first',[[3.3,3.86],[.72,3.86],[.72,7.22],[3.3,7.22],[3.3,4.15],[6.65,4.15]],1);
await p.keyboard.press('e');await p.waitForTimeout(500);
await route('through lobby doorway',[[6.65,2.5],[5.1,2.5],[5.1,.95]],1);
await route('first to stilt',[[4.65,.95],[.7,.95],[.7,2.5],[4.8,2.5],[5.4,2.5]],0);
await route('stilt back to first',[[4.65,2.5],[.7,2.5],[.7,.95],[4.8,.95],[5.1,.95]],1);
assert.deepEqual(errors,[]);await p.close();}}finally{await browser.close()}})();
