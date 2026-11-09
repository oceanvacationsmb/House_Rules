(function(root){
  class GitHubGuidePublisher {
    constructor({token,request=(...args)=>fetch(...args)}){this.token=token;this.request=request;}
    async github(method,body){
      const url='https://api.github.com/repos/oceanvacationsmb/House_Rules/contents/data.js';
      const response=await this.request(method==='GET'?url+'?ref=main':url,{
        method,cache:'no-store',headers:{Authorization:'Bearer '+this.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
        ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)
      });
      if(!response.ok){const error=new Error(response.status===401?'GitHub token is invalid or expired.':response.status===403?'GitHub denied access. The token needs Contents read/write on House_Rules.':response.status===409||response.status===422?'GitHub changed during saving. Please retry.':'GitHub could not complete the request ('+response.status+'). Please retry.');error.status=response.status;throw error;}
      return response.json();
    }
    async read(){
      const file=await this.github('GET');
      const source=new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
      const data=JSON.parse(source.trim().replace(/^const\s+PROPERTY_GUIDES\s*=\s*/,'').replace(/;\s*$/,''));
      if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('The guide data file is invalid.');
      return {data,sha:file.sha};
    }
    async save(slug,property,baseProperty){
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      if(!property||property.slug!==slug||!Array.isArray(property.sections))throw new Error('Invalid property guide.');
      for(let attempt=0;attempt<3;attempt++){
        const latest=await this.read();
        if(!Object.hasOwn(latest.data,slug))throw new Error('This property is not registered in GitHub.');
        if(same(latest.data[slug],property))return {property,unchanged:true};
        if(!same(latest.data[slug],baseProperty))throw new Error('This property was edited in another session. Export your changes before reconnecting to review the latest version.');
        latest.data[slug]=property;
        const text='const PROPERTY_GUIDES = '+JSON.stringify(latest.data,null,2)+';\n';
        const bytes=new TextEncoder().encode(text);
        let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
        try{
          const result=await this.github('PUT',{branch:'main',sha:latest.sha,content:btoa(binary),message:'Update '+slug+' house rules from admin'});
          return {property,commit:result.commit.sha,url:result.commit.html_url};
        }catch(error){if(![409,422].includes(error.status)||attempt===2)throw error;}
      }
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={GitHubGuidePublisher};
  else root.GitHubGuidePublisher=GitHubGuidePublisher;
})(typeof window!=='undefined'?window:globalThis);
