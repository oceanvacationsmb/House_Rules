const test=require('node:test');
const assert=require('node:assert/strict');
const {GitHubGuidePublisher}=require('./github-publisher');
const property={slug:'1670',propertyName:'1670',sections:[{title:'Parking 🚗',details:'3 spaces — thank you'}]};
function response(value){return {ok:true,json:async()=>value};}
function file(data,sha='latest'){return {sha,content:Buffer.from('const PROPERTY_GUIDES = '+JSON.stringify(data)+';\n').toString('base64')};}
test('saves Unicode rules directly to GitHub and preserves other properties',async()=>{
 const original={'1670':property,'7500':{sections:['another editor’s update']}};
 let write;
 const publisher=new GitHubGuidePublisher({token:'test-only',request:async(url,options)=>{
  assert(url.startsWith('https://api.github.com/repos/oceanvacationsmb/House_Rules/contents/data.js'));
  assert.equal(options.headers.Authorization,'Bearer test-only');
  if(options.method==='GET')return response(file(original));
  write=JSON.parse(options.body);return response({commit:{sha:'saved',html_url:'commit'}});
 }});
 const changed={...property,propertyName:'1670 updated 🏠'};
 assert.equal((await publisher.save('1670',changed,property)).commit,'saved');
 const source=Buffer.from(write.content,'base64').toString('utf8');
 const saved=JSON.parse(source.replace(/^const PROPERTY_GUIDES = /,'').replace(/;\n$/,''));
 assert.deepEqual(saved['1670'],changed);assert.deepEqual(saved['7500'],original['7500']);assert.equal(write.sha,'latest');
});
test('refuses to overwrite another session’s edits to the same property',async()=>{
 const publisher=new GitHubGuidePublisher({token:'test-only',request:async()=>response(file({'1670':{...property,propertyName:'Other editor'}}))});
 await assert.rejects(publisher.save('1670',{...property,propertyName:'My changes'},property),/another session/);
});
test('retries a file conflict using the latest other-property data',async()=>{
 let reads=0,writes=0,lastWrite;
 const publisher=new GitHubGuidePublisher({token:'test-only',request:async(url,options)=>{
  if(options.method==='GET')return response(file({'1670':property,'7500':{version:++reads}},'sha'+reads));
  lastWrite=JSON.parse(options.body);if(++writes===1)return {ok:false,status:409};return response({commit:{sha:'saved'}});
 }});
 await publisher.save('1670',{...property,propertyName:'My change'},property);
 assert.equal(reads,2);assert.equal(lastWrite.sha,'sha2');assert(Buffer.from(lastWrite.content,'base64').toString().includes('"version": 2'));
});
test('GitHub rejection never reports success',async()=>{
 const publisher=new GitHubGuidePublisher({token:'invalid-test',request:async()=>({ok:false,status:403})});
 await assert.rejects(publisher.save('1670',property,property),/denied access/);
});
test('default browser fetch is not invoked with the publisher as receiver',async()=>{
 const originalFetch=global.fetch;
 let receiver;
 global.fetch=function(){receiver=this;return Promise.resolve(response(file({'1670':property})));};
 try{const publisher=new GitHubGuidePublisher({token:'test-only'});await publisher.read();assert.notEqual(receiver,publisher);}
 finally{global.fetch=originalFetch;}
});
