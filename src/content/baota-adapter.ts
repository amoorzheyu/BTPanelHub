/** Self-contained function serialized by chrome.scripting; no external runtime references. */
export async function baotaAdapter(action:'inspect'|'fill'|'submit',credentials?:{username:string;password:string},delay=0):Promise<{status:'login'|'filled'|'success'|'needs_user_action'|'submitting';reason?:string}>{
 const visible=(el:Element|null):el is HTMLElement=>!!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'
 const branded=/宝塔|BaoTa|aaPanel/i.test(document.title)
 const user=document.querySelector<HTMLInputElement>('input[name="username"]')
 const pass=document.querySelector<HTMLInputElement>('input[name="password"]')
 const button=Array.from(document.querySelectorAll('button')).find(b=>visible(b)&&/^登\s*录$|^Log\s*in$/i.test(b.textContent?.trim()||''))
 if(branded&&!visible(pass)&&document.querySelector('a[href="/site"]')&&document.querySelector('a[href="/files"]'))return {status:'success'}
 if(!branded||!visible(user)||!visible(pass)||!button)return {status:'needs_user_action',reason:'无法识别支持的宝塔登录页，请手动登录'}
 const challenges=Array.from(document.querySelectorAll('input[name="code"],input[name="vcode"],iframe[src*="captcha"],.geetest_panel')).filter(visible)
 if(challenges.length)return {status:'needs_user_action',reason:'检测到验证码或动态口令，请手动完成登录'}
 if(action==='inspect')return {status:'login'}
 if(action==='fill'){
  if(!credentials?.username||!credentials.password)return {status:'needs_user_action',reason:'缺少登录凭据，请编辑服务器补充'}
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!
  for(const [input,value] of [[user,credentials.username],[pass,credentials.password]] as const){setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}
  return {status:'filled'}
 }
 await new Promise(r=>setTimeout(r,Math.max(0,Math.min(delay,5000))))
 // Re-check challenges immediately before clicking. Never solve or bypass them.
 if(Array.from(document.querySelectorAll('input[name="code"],input[name="vcode"],iframe[src*="captcha"],.geetest_panel')).some(visible))return {status:'needs_user_action',reason:'需要验证码或动态口令，请手动完成登录'}
 button.click();return {status:'submitting'}
}
