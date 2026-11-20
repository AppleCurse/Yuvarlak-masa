// Subjective ratings must retain the identity of the original answer.
const {JSDOM} = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../static/index.html'), 'utf8');
const sent = [];
const dom = new JSDOM(html, {url:'http://localhost:8888/', runScripts:'dangerously', beforeParse(w){
  w.fetch = async (url, opts) => {
    if (String(url).includes('/api/neuro/feedback')) sent.push(JSON.parse(opts.body));
    return {ok:true, status:200, json:async()=>({ok:true}), text:async()=>''};
  };
  w.matchMedia = () => ({matches:false, addListener(){}, removeListener(){}});
}});
(async()=>{
  const w=dom.window;
  w.eval(`state.backend=true; state.demo=false; state.council.sessionId='session-2';
    state.seats.A.id='replacement';
    window.original={id:'turn-1',seat:'A',kind:'model',streaming:false,
      cognitiveCharacterId:'character:original',cognitiveSessionId:'session-1'};`);
  const row=w.document.createElement('div'); row.className='neuro-feedback';
  row.innerHTML='<button data-reward="1">Faydalı</button><span class="feedback-status"></span>';
  w.document.body.appendChild(row);
  w.submitNeuroFeedback(w.original,1,row.querySelector('button'));
  await new Promise(r=>setTimeout(r,20));
  const actual=sent[0];
  if (!actual || actual.character_id!=='character:original' || actual.session_id!=='session-1' || actual.message_id!=='turn-1') throw Error('wrong feedback identity: '+JSON.stringify(actual));
  if (!row.textContent.includes('öğrenmede kullanılmaz')) throw Error('misleading feedback label');
  console.log('OK: original answer identity and non-learning rating');
})().catch(e=>{console.error(e); process.exitCode=1;}).finally(()=>dom.window.close());
