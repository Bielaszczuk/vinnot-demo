import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const path = '/wines/ar/00000000-0000-4000-8000-000000000001/'+'a'.repeat(64)+'.webp';
function fixture(found=true) {
  let gets=0;
  globalThis.caches={default:{match:async()=>undefined,put:async()=>{}}};
  const env={CATALOG_IMAGES:{get:async()=>{gets++;return found?{body:new Uint8Array([1]),size:1,httpEtag:'"digest"'}:null}}};
  return {env,ctx:{waitUntil:()=>{}},count:()=>gets};
}
test('invalid paths and write methods do not touch R2',async()=>{
 const f=fixture();
 for(const suffix of ['/','/../secret',path+'?resize=200','/wines/ar/a/a.webp']){
  assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+suffix),f.env,f.ctx)).status,404);
 }
 for(const method of ['PUT','POST','DELETE']) assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+path,{method}),f.env,f.ctx)).status,405);
 assert.equal(f.count(),0);
});
test('GET, HEAD and missing objects have at most one R2 read',async()=>{
 for(const method of ['GET','HEAD']){
  const f=fixture();const r=await worker.fetch(new Request('https://images.vinnot.com'+path,{method}),f.env,f.ctx);
  assert.equal(r.status,200);assert.equal(f.count(),1);assert.equal(r.headers.get('content-type'),'image/webp');assert.match(r.headers.get('cache-control'),/immutable/);
  if(method==='HEAD')assert.equal((await r.arrayBuffer()).byteLength,0);
 }
 const f=fixture(false);assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+path),f.env,f.ctx)).status,404);assert.equal(f.count(),1);
});
test('cache and CORS avoid R2 entirely',async()=>{
 const f=fixture();globalThis.caches.default.match=async()=>new Response('cached');
 assert.equal(await (await worker.fetch(new Request('https://images.vinnot.com'+path),f.env,f.ctx)).text(),'cached');
 assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+path,{method:'OPTIONS'}),f.env,f.ctx)).status,204);assert.equal(f.count(),0);
});
test('user uploads route to the right bucket and private folders stay inaccessible',async()=>{
 const f=fixture(); let dev=0,prod=0;
 const image={body:new Uint8Array([1]),size:1,httpEtag:'"image"'};
 f.env.DEV_UPLOADS={get:async()=>{dev++;return image}};
 f.env.PROD_UPLOADS={get:async()=>{prod++;return image}};
 const id='00000000-0000-4000-8000-000000000001';
 for(const environment of ['development','production']){
  const response=await worker.fetch(new Request(`https://images.vinnot.com/uploads/${environment}/wine-labels/wine_label_${id}.r2.webp`),f.env,f.ctx);
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'public, max-age=60, must-revalidate');
 }
 assert.equal(dev,1);assert.equal(prod,1);assert.equal(f.count(),0);
 for(const folder of ['quarantine','events','wine-routes','covers','../quarantine']){
  const r=await worker.fetch(new Request(`https://images.vinnot.com/uploads/development/${folder}/${id}.webp`),f.env,f.ctx);
  assert.equal(r.status,404);
 }
 assert.equal(dev,1);assert.equal(prod,1);
});

test('public folders reject swapped filenames and missing environment bindings', async () => {
 const f=fixture();const id='00000000-0000-4000-8000-000000000001';
 for (const suffix of [`avatars/wine_label_${id}.r2.webp`, `wine-labels/avatar_${id}_${id}.r2.webp`, `wine-labels/wine_label_${id}.r2.webp`]) {
  assert.equal((await worker.fetch(new Request(`https://images.vinnot.com/uploads/development/${suffix}`),f.env,f.ctx)).status,404);
 }
 assert.equal(f.count(),0);
});

test('documentation diagrams are served as sandboxed, immutable SVG', async () => {
 const key='/docs/diagrams/v1/es/modules-reviews-use-cases-uc-rev-02-publish-review-0123456789ab.svg';
 for (const method of ['GET','HEAD']) {
  const f=fixture();const r=await worker.fetch(new Request('https://images.vinnot.com'+key,{method}),f.env,f.ctx);
  assert.equal(r.status,200);assert.equal(f.count(),1);
  assert.equal(r.headers.get('content-type'),'image/svg+xml; charset=utf-8');
  assert.match(r.headers.get('content-security-policy'),/default-src 'none'.*sandbox/);
  assert.equal(r.headers.get('x-content-type-options'),'nosniff');
  assert.match(r.headers.get('cache-control'),/immutable/);
 }
 const f=fixture();
 for (const suffix of ['/docs/diagrams/v1/fr/a-0123456789ab.svg','/docs/diagrams/v1/es/A-0123456789ab.svg','/docs/diagrams/v1/es/a.svg',
  '/docs/diagrams/v1/es/a-0123456789ab.webp','/docs/diagrams/v1/es/x/a-0123456789ab.svg','/docs/diagrams/v2/es/a-0123456789ab.svg']) {
  assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+suffix),f.env,f.ctx)).status,404,suffix);
 }
 assert.equal(f.count(),0);
});

test('documentation videos are immutable MP4 and honour byte ranges without reading the whole file', async () => {
 const key='/docs/videos/v1/es/02-wines-on-the-web-0123456789ab.mp4';
 const bytes=new Uint8Array(10).map((_,i)=>i);
 const calls=[];
 const video=()=>{
  globalThis.caches={default:{match:async()=>undefined,put:async()=>{}}};
  return {CATALOG_IMAGES:{
   head:async()=>{calls.push('head');return {size:bytes.length,httpEtag:'"video"'};},
   get:async(k,options)=>{calls.push(options?.range?'range':'get');
    const r=options?.range; const body=r?bytes.slice(r.offset,r.offset+r.length):bytes;
    return {body,size:bytes.length,httpEtag:'"video"'};}}};
 };
 const full=await worker.fetch(new Request('https://images.vinnot.com'+key),video(),{waitUntil:()=>{}});
 assert.equal(full.status,200);
 assert.equal(full.headers.get('content-type'),'video/mp4');
 assert.equal(full.headers.get('accept-ranges'),'bytes');
 assert.match(full.headers.get('cache-control'),/immutable/);
 assert.equal((await full.arrayBuffer()).byteLength,10);
 for (const [header,offset,length] of [['bytes=0-1',0,2],['bytes=4-',4,6],['bytes=-3',7,3],['bytes=8-99',8,2]]) {
  const r=await worker.fetch(new Request('https://images.vinnot.com'+key,{headers:{Range:header}}),video(),{waitUntil:()=>{}});
  assert.equal(r.status,206,header);
  assert.equal(r.headers.get('content-range'),`bytes ${offset}-${offset+length-1}/10`,header);
  assert.equal(r.headers.get('content-length'),String(length),header);
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[...bytes.slice(offset,offset+length)],header);
 }
 assert.deepEqual(calls.slice(1),['head','range','head','range','head','range','head','range']);
 calls.length=0;
 for (const header of ['bytes=10-12','bytes=5-2','bytes=0-1,4-5','items=0-1','bytes=-0']) {
  const r=await worker.fetch(new Request('https://images.vinnot.com'+key,{headers:{Range:header}}),video(),{waitUntil:()=>{}});
  assert.equal(r.status,416,header);
  assert.equal(r.headers.get('content-range'),'bytes */10',header);
 }
 assert.deepEqual(calls,['head','head','head','head','head'],'an unsatisfiable range never reads the body');
 const head=await worker.fetch(new Request('https://images.vinnot.com'+key,{method:'HEAD'}),video(),{waitUntil:()=>{}});
 assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'10');assert.equal((await head.arrayBuffer()).byteLength,0);
 const missing={CATALOG_IMAGES:{head:async()=>null,get:async()=>{throw new Error('body read');}}};
 assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+key,{headers:{Range:'bytes=0-1'}}),missing,{waitUntil:()=>{}})).status,404);
 const removed={CATALOG_IMAGES:{head:async()=>({size:10,httpEtag:'"v"'}),get:async()=>null}};
 assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+key,{headers:{Range:'bytes=0-1'}}),removed,{waitUntil:()=>{}})).status,404);
 const empty={CATALOG_IMAGES:{head:async()=>({size:0,httpEtag:'"v"'}),get:async()=>{throw new Error('body read');}}};
 assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+key,{headers:{Range:'bytes=-5'}}),empty,{waitUntil:()=>{}})).status,416);
 const f=fixture();
 for (const suffix of ['/docs/videos/v1/fr/a-0123456789ab.mp4','/docs/videos/v1/es/a.mp4','/docs/videos/v1/es/a-0123456789ab.mov',
  '/docs/videos/v2/es/a-0123456789ab.mp4','/docs/videos/v1/es/x/a-0123456789ab.mp4']) {
  assert.equal((await worker.fetch(new Request('https://images.vinnot.com'+suffix),f.env,f.ctx)).status,404,suffix);
 }
 assert.equal(f.count(),0);
});

test('rendered social media is served from the environment bucket as immutable JPEG or PNG', async () => {
 const f=fixture(); const reads={dev:[],prod:[]};
 const image={body:new Uint8Array([1]),size:1,httpEtag:'"social"'};
 f.env.DEV_UPLOADS={get:async(k)=>{reads.dev.push(k);return image}};
 f.env.PROD_UPLOADS={get:async(k)=>{reads.prod.push(k);return image}};
 const post='posts/0f0e0d0c-0b0a-4908-8706-050403020100';
 for (const [environment,file,type] of [['development',`${post}/hero-0123456789abcdef.png`,'image/png'],
  ['production',`${post}/instagram-01-0123456789abcdef.jpg`,'image/jpeg'],['production',`${post}/tiktok-12-0123456789abcdef.jpg`,'image/jpeg']]) {
  for (const method of ['GET','HEAD']) {
   const r=await worker.fetch(new Request(`https://images.vinnot.com/uploads/${environment}/social/${file}`,{method}),f.env,f.ctx);
   assert.equal(r.status,200,file);
   assert.equal(r.headers.get('content-type'),type,file);
   assert.equal(r.headers.get('x-content-type-options'),'nosniff');
   assert.equal(r.headers.get('cache-control'),'public, max-age=31536000, immutable');
   assert.equal(r.headers.get('access-control-allow-origin'),'*');
  }
 }
 assert.deepEqual(reads.dev,[`uploads/development/social/${post}/hero-0123456789abcdef.png`,`uploads/development/social/${post}/hero-0123456789abcdef.png`]);
 assert.equal(reads.prod.length,4);assert.equal(f.count(),0,'social media never reads the catalogue bucket');
});

test('only the social keys the backend writes are served', async () => {
 const f=fixture(); let uploads=0;
 const image={body:new Uint8Array([1]),size:1,httpEtag:'"social"'};
 f.env.DEV_UPLOADS={get:async()=>{uploads++;return image}};
 f.env.PROD_UPLOADS={get:async()=>{uploads++;return image}};
 const longest='a'.repeat(156)+'.jpg';
 assert.equal((await worker.fetch(new Request(`https://images.vinnot.com/uploads/development/social/${longest}`),f.env,f.ctx)).status,200);
 uploads=0;
 for (const suffix of ['uploads/development/social/../avatars/a.jpg','uploads/development/social/posts/../../quarantine/a.png',
  'uploads/development/social/%2e%2e/a.jpg','uploads/development/social/posts/Hero.png','uploads/development/social/posts/hero.JPG',
  'uploads/development/social/posts/hero.webp','uploads/development/social/posts/hero.jpeg','uploads/development/social/posts/hero.svg',
  'uploads/development/social/posts/hero.r2.webp','uploads/development/social/posts//hero.png','uploads/development/social/posts/hero_1.png',
  'uploads/development/social/-hero.png','uploads/development/social/.png','uploads/development/social/hero.png/',
  'uploads/development/social/'+'a'.repeat(157)+'.jpg','uploads/staging/social/posts/hero.png','uploads/development/socials/posts/hero.png',
  'uploads/development/quarantine/posts/hero.png','uploads/development/events/hero.jpg','social/posts/hero.png',
  'wines/ar/social/hero.png','uploads/development/social/posts/hero.png?v=1']) {
  assert.equal((await worker.fetch(new Request(`https://images.vinnot.com/${suffix}`),f.env,f.ctx)).status,404,suffix);
 }
 assert.equal(uploads,0);assert.equal(f.count(),0);
 const unbound=fixture();
 assert.equal((await worker.fetch(new Request('https://images.vinnot.com/uploads/production/social/posts/hero.png'),unbound.env,unbound.ctx)).status,404);
 assert.equal(unbound.count(),0);
});

test('avatars and labels keep their webp type and short public cache', async () => {
 const f=fixture(); const image={body:new Uint8Array([1]),size:1,httpEtag:'"image"'};
 f.env.DEV_UPLOADS={get:async()=>image};
 const id='00000000-0000-4000-8000-000000000001';
 for (const suffix of [`avatars/avatar_${id}_${id}.r2.webp`,`wine-labels/wine_label_${id}.r2.webp`]) {
  const r=await worker.fetch(new Request(`https://images.vinnot.com/uploads/development/${suffix}`),f.env,f.ctx);
  assert.equal(r.status,200,suffix);assert.equal(r.headers.get('content-type'),'image/webp');
  assert.equal(r.headers.get('cache-control'),'public, max-age=60, must-revalidate');
 }
 for (const suffix of [`social/avatar_${id}_${id}.r2.webp`,`avatars/avatar_${id}_${id}.png`,`wine-labels/wine_label_${id}.jpg`]) {
  assert.equal((await worker.fetch(new Request(`https://images.vinnot.com/uploads/development/${suffix}`),f.env,f.ctx)).status,404,suffix);
 }
});
