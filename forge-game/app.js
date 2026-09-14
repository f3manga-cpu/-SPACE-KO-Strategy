const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const geom=(spr,n)=>100*((Math.pow(1+2*spr,1/n)-1)/2);
const fmt=(v,d=1)=>Number(v).toFixed(d);
const now=()=>Date.now();
const rand=(a,b)=>a+Math.random()*(b-a);
const choice=a=>a[Math.floor(Math.random()*a.length)];

const ANCHORS=[
  {spr:2,n:3,a:35},{spr:3,n:3,a:46},{spr:4,n:3,a:54},{spr:5,n:3,a:61},{spr:6,n:3,a:68},
  {spr:1,n:2,a:37},{spr:1.5,n:2,a:50},{spr:2,n:2,a:62},{spr:3,n:2,a:82},{spr:4,n:2,a:100}
];
const RANKS=[
  {name:'ROOKIE',min:0,tag:'R'},{name:'BRONZE',min:250,tag:'B'},{name:'SILVER',min:650,tag:'S'},
  {name:'GOLD',min:1150,tag:'G'},{name:'PLATINUM',min:1750,tag:'P'},{name:'DIAMOND',min:2450,tag:'D'},
  {name:'MASTER',min:3200,tag:'M'},{name:'GRANDMASTER',min:3900,tag:'GM'}
];
const STORE='geometry-forge-arena-v4';
const todayKey=()=>new Date().toISOString().slice(0,10);
const defaultProgress=()=>({
  mastery:Array(10).fill(0),attempts:Array(10).fill(0),correct:Array(10).fill(0),misses:Array(10).fill(0),
  lastCorrect:Array(10).fill(0),latency:Array(10).fill(0),streakPB:0,tablePB:0,gauntletPB:0,gauntletBestTime:0,
  totalAttempts:0,totalCorrect:0,totalLatency:0,tableAttempts:0,tableCorrect:0,
  introSeen:false,audio:true,tutorialStep:0,
  daily:{date:todayKey(),anchor:0,snap:0,table:0}
});
const saved=(()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}})();
const progress=Object.assign(defaultProgress(),saved);
['mastery','attempts','correct','misses','lastCorrect','latency'].forEach(k=>{if(!Array.isArray(progress[k])||progress[k].length!==10)progress[k]=defaultProgress()[k]});
if(!progress.daily||progress.daily.date!==todayKey())progress.daily={date:todayKey(),anchor:0,snap:0,table:0};

const session={mode:'anchor',score:0,streak:0,current:2,locked:false,started:now(),questionStart:now(),queue:[],world:null,table:null,
  snap:null,runway:null,gauntlet:null,forceAnchor:null,reactorN:3};

function persist(){try{localStorage.setItem(STORE,JSON.stringify(progress))}catch{}}
function label(v){return Math.round(v)===100?'POT':`${Math.round(v)}%`}
function anchorKey(a){return `SPR ${a.spr} · ${a.n} streets`}
function dueBoost(i){if(!progress.lastCorrect[i])return 2.5;const age=(now()-progress.lastCorrect[i])/86400000;return age>7?4:age>3?2.5:age>1?1.2:0}
function rankRating(){
  const mastery=progress.mastery.reduce((a,b)=>a+b,0)/50;
  const acc=progress.totalAttempts?progress.totalCorrect/progress.totalAttempts:0;
  const table=progress.tableAttempts?progress.tableCorrect/progress.tableAttempts:0;
  const avg=progress.totalCorrect?progress.totalLatency/progress.totalCorrect:5000;
  const speed=clamp((5000-avg)/3500,0,1);
  return Math.round(clamp(mastery*1850+acc*650+table*900+speed*600,0,4200));
}
function currentRank(){
  const r=rankRating();let idx=0;
  for(let i=0;i<RANKS.length;i++)if(r>=RANKS[i].min)idx=i;
  return {idx,rank:RANKS[idx],next:RANKS[idx+1]||null,r};
}
function modality(i){const m=progress.mastery[i];return m<2?'choice':m<4?'free':'timed'}
function weakestIndex(){let best=0,val=999;ANCHORS.forEach((a,i)=>{const v=progress.mastery[i]*2-progress.misses[i]*.7-dueBoost(i);if(v<val){val=v;best=i}});return best}
function adaptiveAnchor(){
  if(session.forceAnchor!==null){const x=session.forceAnchor;session.forceAnchor=null;return x}
  if(progress.tutorialStep<2){return [2,9][progress.tutorialStep++]}
  const due=session.queue.findIndex(x=>x.due<=progress.totalAttempts);
  if(due>=0)return session.queue.splice(due,1)[0].i;
  const weights=ANCHORS.map((_,i)=>Math.max(.5,7-progress.mastery[i]+progress.misses[i]*.8+dueBoost(i)));
  let total=weights.reduce((a,b)=>a+b,0),r=Math.random()*total;
  for(let i=0;i<weights.length;i++){r-=weights[i];if(r<=0)return i}
  return 0;
}
function weightedScore({difficulty=1,latency=3000,transfer=false}){
  const speed=clamp((5500-latency)/4000,0,.7);
  return Math.round(100*difficulty*(1+speed)*(transfer?1.35:1));
}
function updateStats(){
  const {rank,next,r}=currentRank();
  $('#rankName').textContent=rank.name;$('#rankTitle').textContent=rank.name;$('#rankEmblem').textContent=rank.tag;$('#rating').textContent=String(r).padStart(4,'0');
  const max=next?next.min:4200,min=rank.min,pct=next?100*(r-min)/(max-min):100;$('#rankFill').style.width=`${clamp(pct,0,100)}%`;
  $('#rankNext').innerHTML=next?`${Math.max(0,next.min-r)} rating to <span class="qualify">${next.name}</span>.`:'Top rank secured. Defend it.';
  $('#streak').textContent=`${session.streak}×`;$('#sessionScore').textContent=session.score;
  $('#accuracy').textContent=progress.totalAttempts?`${Math.round(100*progress.totalCorrect/progress.totalAttempts)}%`:'—';
  const avg=progress.totalCorrect?progress.totalLatency/progress.totalCorrect:0;$('#avgTime').textContent=avg?`${(avg/1000).toFixed(1)}s`:'—';
  $('#pbGauntlet').textContent=progress.gauntletPB?progress.gauntletPB.toLocaleString():'—';$('#pbStreak').textContent=progress.streakPB;$('#pbTable').textContent=progress.tablePB;
  updateMission();renderConstellation();renderRetention();persist();
}
function updateMission(){
  const d=progress.daily,score=Math.min(d.anchor,5)+Math.min(d.snap,3)+Math.min(d.table,2);
  $('#missionCount').textContent=`${score} / 10`;$('#missionFill').style.width=`${score*10}%`;
  $('#missionText').textContent=score>=10?'Mission complete. Now chase rating or a personal record.':'Forge five anchors, snap three SPRs, clear two table reads.';
}
function markDaily(kind){if(kind==='anchor')progress.daily.anchor++;if(kind==='snap')progress.daily.snap++;if(kind==='table')progress.daily.table++}

function setMode(mode){
  session.mode=mode;session.locked=false;$$('.mode-card').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  $('#timerBar').classList.remove('active');$('#timerBar span').style.transform='scaleX(1)';
  if(mode==='anchor')newAnchor();
  if(mode==='snap')newSnap();
  if(mode==='runway')newRunway();
  if(mode==='table')newTable();
  if(mode==='gauntlet')startGauntlet();
}
$$('.mode-card').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));

function setPrompt(kicker,title,sub,diff){
  $('#modeKicker').textContent=kicker;$('#prompt').textContent=title;$('#promptSub').textContent=sub;$('#difficulty').textContent=diff;
}
function setCausal(p,b){
  $('#cPot').textContent=fmt(p);$('#cBet').textContent=fmt(b);$('#cCall').textContent=fmt(b);$('#cNew').textContent=fmt(p+2*b);
}
function responseHTMLChoice(values,handler){
  $('#responseZone').innerHTML=`<div class="choice-grid">${values.map(v=>`<button class="answer" type="button" data-v="${v}">${typeof v==='string'?v:label(v)}</button>`).join('')}</div>`;
  $$('.answer',$('#responseZone')).forEach(b=>b.addEventListener('click',()=>handler(b.dataset.v,b)));
}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function nearbyAnswers(target){
  const vals=[35,37,46,50,54,61,62,68,82,100].filter(v=>v!==target).sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));
  return shuffle([target,...vals.slice(0,4)]);
}
function startTimer(ms,onExpire){
  const bar=$('#timerBar');bar.classList.add('active');const span=bar.querySelector('span');span.style.transition='none';span.style.transform='scaleX(1)';void span.offsetWidth;span.style.transition=`transform ${ms}ms linear`;span.style.transform='scaleX(0)';
  const token=Symbol();session.timerToken=token;setTimeout(()=>{if(session.timerToken===token&&!session.locked)onExpire()},ms);
}
function clearTimer(){session.timerToken=null;$('#timerBar').classList.remove('active')}

function newAnchor(){
  session.current=adaptiveAnchor();const q=ANCHORS[session.current],m=progress.mastery[session.current],mode=modality(session.current);session.locked=false;session.questionStart=now();
  setPrompt(mode==='choice'?'ANCHOR FORGE · GUIDED RETRIEVAL':mode==='free'?'ANCHOR FORGE · FREE RECALL':'ANCHOR FORGE · SPACED PRESSURE',anchorKey(q),
    mode==='choice'?'Say the answer before selecting it.':mode==='free'?'Recognition cues removed. Produce it.':'Stable memory under light time pressure.',mode==='choice'?'SCAFFOLDED':mode==='free'?'UNASSISTED':'PRESSURE');
  resetWorld(q.spr*10,10,q.n);setCausal(10,10*q.a/100);
  if(mode==='choice')responseHTMLChoice(nearbyAnswers(q.a),(v,b)=>gradeAnchor(Number(v),b));
  else{
    $('#responseZone').innerHTML=`<form id="freeForm" class="free-form"><input id="freeGuess" type="number" inputmode="decimal" step="1" placeholder="% pot · 100 = POT" required><button class="commit-btn" type="submit">COMMIT</button></form>`;
    $('#freeForm').addEventListener('submit',e=>{e.preventDefault();gradeAnchor(Number($('#freeGuess').value),null)});
    setTimeout(()=>$('#freeGuess')?.focus(),20);if(mode==='timed')startTimer(6500,()=>gradeAnchor(NaN,null,true));
  }
  $('#feedback').textContent=m<2?'Build the landmark. The distractors are intentionally nearby.':m<4?'Free recall is stronger evidence than recognition.':'This anchor is back because stable memory must survive time and interference.';
}
function gradeAnchor(v,button,timeout=false){
  if(session.locked)return;session.locked=true;clearTimer();const i=session.current,q=ANCHORS[i],mode=modality(i),lat=now()-session.questionStart,tol=mode==='choice'?0:3,ok=!timeout&&Number.isFinite(v)&&Math.abs(v-q.a)<=tol;
  progress.attempts[i]++;progress.totalAttempts++;
  if(button)$$('.answer',$('#responseZone')).forEach(b=>{const x=Number(b.dataset.v);b.classList.add(x===q.a?'good':b===button?'bad':'dim')});
  if(ok){
    progress.correct[i]++;progress.totalCorrect++;progress.totalLatency+=lat;progress.latency[i]=progress.latency[i]?progress.latency[i]*.72+lat*.28:lat;progress.mastery[i]=Math.min(5,progress.mastery[i]+1);progress.lastCorrect[i]=now();
    session.streak++;progress.streakPB=Math.max(progress.streakPB,session.streak);const pts=weightedScore({difficulty:1+progress.mastery[i]*.13,latency:lat});session.score+=pts;markDaily('anchor');
    $('#feedback').innerHTML=`<strong>LOCKED.</strong> ${anchorKey(q)} → ${label(q.a)}. The stack and runway terminate together.`;impact(true,label(q.a),`+${pts}`);sound(true);haptic([16,18,28]);playWorld(q.spr*10,10,q.n,q.a,true);
  }else{
    progress.misses[i]++;progress.mastery[i]=Math.max(0,progress.mastery[i]-1);session.streak=0;session.queue.push({i,due:progress.totalAttempts+2+Math.floor(Math.random()*3)});
    const shown=timeout?'TIME':label(v);$('#feedback').innerHTML=`<strong>${timeout?'TIME EXPIRED':'LINE MISSED'}.</strong> ${shown} does not close this runway. Correct map: ${anchorKey(q)} → ${label(q.a)}. It will return after interference.`;
    impact(false,timeout?'TIME':shown,`TARGET ${label(q.a)}`);sound(false);haptic(26);playWorld(q.spr*10,10,q.n,Number.isFinite(v)?v:q.a*.72,false);
  }
  updateStats();setTimeout(()=>{if(session.mode==='anchor')newAnchor();else gauntletNext()},ok?1600:2200);
}

function newSnap(){
  session.locked=false;session.questionStart=now();const target=choice([1,1.5,2,3,4,5,6]),p=choice([7.5,9,10.5,12,14,16]),spr=target*rand(.94,1.06),stack=p*spr;session.snap={p,stack,spr,target};
  setPrompt('SPR SNAP · RATIO PERCEPTION',`${fmt(stack)}bb effective / ${fmt(p)}bb pot`,'Estimate the stack-to-pot ratio before touching an answer.','PERCEPTUAL');
  resetWorld(stack,p,3);setCausal(p,p*.5);const vals=[.5,1,1.5,2,3,4,5,6,8].sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));responseHTMLChoice(shuffle(vals.slice(0,5)),(v,b)=>gradeSnap(Number(v),b));
  $('#feedback').textContent='Train the first transformation: stack ÷ pot → approximate SPR.';
}
function gradeSnap(v,button){
  if(session.locked)return;session.locked=true;const q=session.snap,lat=now()-session.questionStart,ok=Math.abs(v-q.spr)<=Math.max(.22,q.spr*.09);
  $$('.answer',$('#responseZone')).forEach(b=>{const x=Number(b.dataset.v);b.classList.add(Math.abs(x-q.spr)<=Math.max(.22,q.spr*.09)?'good':b===button?'bad':'dim')});
  progress.totalAttempts++;if(ok){progress.totalCorrect++;progress.totalLatency+=lat;session.streak++;progress.streakPB=Math.max(progress.streakPB,session.streak);const pts=weightedScore({difficulty:1.15,latency:lat});session.score+=pts;markDaily('snap');$('#feedback').innerHTML=`<strong>SNAP.</strong> ${fmt(q.stack)} ÷ ${fmt(q.p)} = SPR ${fmt(q.spr,2)}. Your ${v} read is table-usable.`;impact(true,`SPR ${v}`,`+${pts}`);sound(true);haptic([14,15,22])}else{session.streak=0;$('#feedback').innerHTML=`<strong>RATIO LEAK.</strong> ${fmt(q.stack)} ÷ ${fmt(q.p)} = SPR ${fmt(q.spr,2)}. Calibrate the visual mass of stack against pot.`;impact(false,`SPR ${v}`,`ACTUAL ${fmt(q.spr,1)}`);sound(false);haptic(22)}
  updateStats();setTimeout(()=>session.mode==='snap'?newSnap():gauntletNext(),ok?1250:1800);
}

function newRunway(){
  session.locked=false;session.questionStart=now();const spr=choice([1.5,2,3,4,5,6]),n=Math.random()<.5?2:3,target=geom(spr,n);session.runway={spr,n,target};
  setPrompt('RUNWAY DUEL · STREET DISCRIMINATION',`SPR ${spr} · ${n} streets`,`Same stack burden, different runway. How hard must the pot grow?`,'DISCRIMINATION');
  resetWorld(spr*10,10,n);setCausal(10,10*target/100);
  const values=[Math.round(geom(spr,2)),Math.round(geom(spr,3)),35,50,68,82,100].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)).slice(0,5);
  responseHTMLChoice(shuffle(values),(v,b)=>gradeRunway(Number(v),b));$('#feedback').textContent='Fewer streets means steeper required pot growth. Feel the runway before recalling the number.';
}
function gradeRunway(v,button){
  if(session.locked)return;session.locked=true;const q=session.runway,lat=now()-session.questionStart,ok=Math.abs(v-q.target)<=4;
  $$('.answer',$('#responseZone')).forEach(b=>{const x=Number(b.dataset.v);b.classList.add(Math.abs(x-q.target)<=4?'good':b===button?'bad':'dim')});
  progress.totalAttempts++;if(ok){progress.totalCorrect++;progress.totalLatency+=lat;session.streak++;const pts=weightedScore({difficulty:1.25,latency:lat});session.score+=pts;$('#feedback').innerHTML=`<strong>RUNWAY READ.</strong> SPR ${q.spr} across ${q.n} streets needs ≈ ${fmt(q.target,1)}%.`;impact(true,label(q.target),`+${pts}`);playWorld(q.spr*10,10,q.n,q.target,true);sound(true)}else{session.streak=0;$('#feedback').innerHTML=`<strong>WRONG SLOPE.</strong> ${label(v)} ${v<q.target?'leaves residue':'burns stack too fast'}. Target ≈ ${fmt(q.target,1)}%.`;impact(false,label(v),`TARGET ${label(q.target)}`);playWorld(q.spr*10,10,q.n,v,false);sound(false)}
  updateStats();setTimeout(()=>session.mode==='runway'?newRunway():gauntletNext(),ok?1450:2000);
}

function newTable(){
  session.locked=false;session.questionStart=now();const n=Math.random()<.65?3:2,p=choice([7.4,8.8,10.2,11.8,13.6,15.4,17.2]),base=choice(n===3?[2,3,4,5,6]:[1,1.5,2,3,4]),spr=base*rand(.91,1.09),stack=p*spr,target=geom(spr,n);session.table={p,stack,spr,n,target};
  setPrompt('LIVE TABLE · CONTEXTUAL TRANSFER',`${fmt(p)}bb pot · ${fmt(stack)}bb effective`,`${n===3?'FLOP · 3 streets':'TURN-LINE · 2 streets'} — build SPR, then size.`,progress.mastery.filter(x=>x>=4).length>=5?'RANKED TRANSFER':'TRANSFER');
  resetWorld(stack,p,n);setCausal(p,p*target/100);
  $('#responseZone').innerHTML=`<div class="slider-wrap"><div class="slider-head"><div><div class="eyebrow">BET SIZING</div><span>Commit your table read.</span></div><b id="betReadout">54%</b></div><input id="betSlider" type="range" min="20" max="120" step="1" value="54"><div class="slider-labels"><span>20%</span><span>HALF</span><span>POT</span><span>120%</span></div><button id="tableCommit" class="commit-btn" type="button">COMMIT BET</button></div>`;
  $('#betSlider').addEventListener('input',e=>$('#betReadout').textContent=`${e.target.value}%`);$('#tableCommit').addEventListener('click',()=>gradeTable(Number($('#betSlider').value)));
  $('#feedback').textContent='No SPR is given. The table gives you pot and effective stack; you construct the rest.';
}
function gradeTable(v){
  if(session.locked)return;session.locked=true;const q=session.table,lat=now()-session.questionStart,err=Math.abs(v-q.target),ok=err<=5;progress.totalAttempts++;progress.tableAttempts++;
  if(ok){progress.totalCorrect++;progress.tableCorrect++;progress.totalLatency+=lat;session.streak++;progress.tablePB=Math.max(progress.tablePB,session.streak);const pts=weightedScore({difficulty:1.55,latency:lat,transfer:true});session.score+=pts;markDaily('table');$('#feedback').innerHTML=`<strong>TABLE-READY.</strong> SPR ${fmt(q.spr,2)} → geometry ${fmt(q.target,1)}% → ${fmt(q.p*q.target/100)}bb. Your ${v}% sizing is usable in flow.`;impact(true,`${v}%`,`+${pts}`);playWorld(q.stack,q.p,q.n,v,true);sound(true);haptic([18,18,35])}else{session.streak=0;$('#feedback').innerHTML=`<strong>${v<q.target?'TOO SLOW':'TOO FAST'}.</strong> Actual SPR ${fmt(q.spr,2)} requires ≈ ${fmt(q.target,1)}%. ${v<q.target?'Stack survives the runway.':'Stack disappears before intended.'}`;impact(false,`${v}%`,`TARGET ${fmt(q.target,0)}%`);playWorld(q.stack,q.p,q.n,v,false);sound(false);haptic(28)}
  updateStats();setTimeout(()=>session.mode==='table'?newTable():gauntletNext(),ok?1700:2300);
}

function startGauntlet(){
  session.score=0;session.streak=0;updateStats();
  session.gauntlet={round:0,score:0,correct:0,start:now(),pattern:shuffle(['anchor','snap','runway','table','anchor','table','snap','anchor','runway','table'])};
  setPrompt('RANKED GAUNTLET · 10 TRIALS','Qualification run','Ten mixed trials. Accuracy first. Speed breaks ties.','RANKED');
  $('#responseZone').innerHTML=`<div class="gauntlet-banner"><div><small>PERSONAL BEST</small><b>${progress.gauntletPB||'No score yet'}</b></div><div class="ghost-delta" id="ghostDelta">READY</div></div><button id="gauntletStart" class="cta" type="button">BEGIN RANKED RUN</button>`;
  $('#feedback').textContent='Mixed retrieval, ratio perception, runway discrimination, and table transfer. No farming one skill.';
  $('#gauntletStart').addEventListener('click',gauntletNext);
}
function gauntletNext(){
  if(session.mode!=='gauntlet'||!session.gauntlet)return;const g=session.gauntlet;
  if(g.round>=10)return finishGauntlet();
  const mode=g.pattern[g.round++];const elapsed=(now()-g.start)/1000;const pace=progress.gauntletBestTime?progress.gauntletBestTime*(g.round/10):0;
  if($('#ghostDelta'))$('#ghostDelta').textContent=pace?`${elapsed<=pace?'AHEAD':'BEHIND'} ${Math.abs(elapsed-pace).toFixed(1)}s`:`ROUND ${g.round}/10`;
  if(mode==='anchor'){session.current=adaptiveAnchor();newAnchor()}
  if(mode==='snap')newSnap();
  if(mode==='runway')newRunway();
  if(mode==='table')newTable();
  session.mode='gauntlet';
  $('#modeKicker').textContent=`RANKED GAUNTLET · ROUND ${g.round}/10 · ${$('#modeKicker').textContent.split('·')[0]}`;
}
function finishGauntlet(){
  const g=session.gauntlet,elapsed=(now()-g.start)/1000;const score=session.score;const isPB=score>progress.gauntletPB;progress.gauntletPB=Math.max(progress.gauntletPB,score);if(!progress.gauntletBestTime||elapsed<progress.gauntletBestTime)progress.gauntletBestTime=elapsed;persist();
  setPrompt('RANKED GAUNTLET · COMPLETE',isPB?'NEW PERSONAL RECORD':'RUN COMPLETE',`${elapsed.toFixed(1)} seconds · ${progress.totalAttempts?Math.round(100*progress.totalCorrect/progress.totalAttempts):0}% lifetime accuracy`,'RESULT');
  $('#responseZone').innerHTML=`<div class="gauntlet-banner"><div><small>RUN SCORE</small><b>${score.toLocaleString()}</b></div><div><small>PB</small><b>${progress.gauntletPB.toLocaleString()}</b></div></div><button id="again" class="cta" type="button">RUN IT AGAIN</button>`;
  $('#feedback').innerHTML=isPB?'<strong>NEW PERSONAL RECORD.</strong> Your benchmark moved. Beat this run next.':'Your ghost is now waiting. Repair weak anchors or run again.';
  if(isPB){impact(true,'NEW PB',score.toLocaleString());sound(true,true)}$('#again').addEventListener('click',startGauntlet);updateStats();
}

function impact(good,title,sub){
  const layer=$('#impact');layer.innerHTML=`<div class="impact-card ${good?'':'bad'}"><div class="impact-ring"></div><small>${good?'GEOMETRY LOCKED':'CORRECTION SIGNAL'}</small><strong>${title}</strong><em>${sub}</em></div>`;
  const wrap=$('#worldWrap');wrap.classList.remove('screen-good','screen-bad');void wrap.offsetWidth;wrap.classList.add(good?'screen-good':'screen-bad');setTimeout(()=>layer.innerHTML='',1050);
}
let audioCtx=null;
function sound(good,big=false){if(!progress.audio)return;try{audioCtx||=new(window.AudioContext||window.webkitAudioContext)();const t=audioCtx.currentTime,notes=good?(big?[392,523,659,784]:[523,659,784]):[185,155];notes.forEach((hz,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=good?'sine':'triangle';o.frequency.value=hz;g.gain.setValueAtTime(.001,t+i*.055);g.gain.exponentialRampToValueAtTime(big?.07:.045,t+i*.055+.012);g.gain.exponentialRampToValueAtTime(.001,t+i*.055+.22);o.connect(g).connect(audioCtx.destination);o.start(t+i*.055);o.stop(t+i*.055+.24)})}catch{}}
function haptic(p){try{navigator.vibrate?.(p)}catch{}}
$('#audioToggle').addEventListener('click',()=>{progress.audio=!progress.audio;$('#audioToggle').textContent=progress.audio?'◈':'◇';persist();sound(true)});

function renderConstellation(){
  const svg=$('#constellation'),pts=[[48,61],[113,37],[180,64],[247,37],[312,61],[48,218],[113,244],[180,218],[247,244],[312,218]];let h='';
  for(const base of [0,5])for(let i=base;i<base+4;i++)h+=`<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[i+1][0]}" y2="${pts[i+1][1]}" stroke="#1b4146" stroke-width="2"/>`;
  h+=`<line x1="${pts[2][0]}" y1="${pts[2][1]}" x2="${pts[9][0]}" y2="${pts[9][1]}" stroke="#55466f" stroke-dasharray="4 6" opacity=".6"/><text x="10" y="17" fill="#708c88" font-size="9">3-STREET PATH</text><text x="10" y="282" fill="#708c88" font-size="9">2-STREET PATH</text>`;
  ANCHORS.forEach((a,i)=>{const m=progress.mastery[i],r=8+m*2.2,c=i<5?'#5ef1d3':'#5da8ff',op=.22+m*.15,stroke=m>=4?c:'#28484e';h+=`<g class="node" data-i="${i}" style="cursor:pointer"><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="${r+7}" fill="none" stroke="${stroke}" opacity="${m>=4?.55:.18}" stroke-width="2"/><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="${r}" fill="${c}" opacity="${op}"/><text x="${pts[i][0]}" y="${pts[i][1]+4}" text-anchor="middle" fill="#ecfaf6" font-size="10" font-weight="900">${a.a===100?'P':a.a}</text><text x="${pts[i][0]}" y="${pts[i][1]+27}" text-anchor="middle" fill="#75918d" font-size="9">SPR ${a.spr}</text></g>`});
  svg.innerHTML=h;$$('.node',svg).forEach(g=>g.addEventListener('click',()=>{session.forceAnchor=Number(g.dataset.i);setMode('anchor')}));
}
function renderRetention(){
  const list=ANCHORS.map((a,i)=>({a,i,p:(5-progress.mastery[i])+progress.misses[i]*.7+dueBoost(i)})).sort((a,b)=>b.p-a.p);$('#retentionTitle').textContent=progress.totalAttempts?`Priority: ${anchorKey(list[0].a)}`:'Your weakest anchors will return.';
  $('#retentionList').innerHTML=list.map(({a,i})=>`<div class="retention-item"><div class="row"><b>${a.spr}/${a.n}st</b><strong>${label(a.a)}</strong></div><div class="mastery-track"><span style="width:${progress.mastery[i]*20}%"></span></div><div class="row"><span>${progress.mastery[i]>=4?'forged':progress.mastery[i]>=2?'recall':'guided'}</span><span>${progress.misses[i]} miss</span></div></div>`).join('');
}
$('#weakestBtn').addEventListener('click',()=>{session.forceAnchor=weakestIndex();setMode('anchor')});
$('#resetProgress').addEventListener('click',()=>{if(confirm('Reset all mastery, rank history and records?')){Object.assign(progress,defaultProgress());persist();location.reload()}});

const EXPLAIN=[
  '<strong>DOUBLE S.</strong> Both effective stacks must be absorbed: yours and the caller’s.',
  '<strong>PLUS ONE.</strong> Keep the starting pot. Final burden is 1 + 2S.',
  '<strong>ROOT.</strong> Share the required pot growth equally across the remaining streets.',
  '<strong>MINUS ONE.</strong> Remove the pot that already existed.',
  '<strong>HALF.</strong> Half the new growth is your bet; half is the matching call.'
];
function renderReactor(){
  const s=Number($('#reactorSpr').value),n=session.reactorN,b=geom(s,n);$('#reactorSprLabel').textContent=fmt(s);$('#formulaResult').textContent=`${fmt(b,1)}%`;
}
$('#reactorSpr').addEventListener('input',renderReactor);$$('.segmented button').forEach(b=>b.addEventListener('click',()=>{session.reactorN=Number(b.dataset.n);$$('.segmented button').forEach(x=>x.classList.toggle('active',x===b));renderReactor()}));
$$('.formula-steps button').forEach((b,i)=>b.addEventListener('click',()=>{$$('.formula-steps button').forEach((x,j)=>x.classList.toggle('active',j<=i));$('#formulaExplain').innerHTML=EXPLAIN[i];sound(true)}));

let THREE=null,renderer=null,scene=null,camera=null,stackMesh=null,potMesh=null,gates=[],particles=[],targetState={stack:40,pot:10,n:3},yaw=0,drag=false,lastX=0;
async function initWorld3D(){
  try{
    THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/+esm');
    const c=$('#world');renderer=new THREE.WebGLRenderer({canvas:c,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(42,16/8.3,.1,100);camera.position.set(0,5.3,9);
    scene.add(new THREE.HemisphereLight(0xffffff,0x12202d,2.4));const dl=new THREE.DirectionalLight(0xffffff,3.1);dl.position.set(4,8,5);scene.add(dl);
    const table=new THREE.Mesh(new THREE.CylinderGeometry(4.9,4.9,.25,72),new THREE.MeshStandardMaterial({color:0x0c3b37,roughness:.78,metalness:.08}));table.scale.z=.64;table.position.y=-.22;scene.add(table);
    const rail=new THREE.Mesh(new THREE.TorusGeometry(3.95,.09,12,80),new THREE.MeshStandardMaterial({color:0x28615e,emissive:0x071817,roughness:.45}));rail.rotation.x=Math.PI/2;rail.scale.z=.65;rail.position.y=.02;scene.add(rail);
    stackMesh=new THREE.Mesh(new THREE.CylinderGeometry(.78,.78,2.8,48),new THREE.MeshStandardMaterial({color:0x5da8ff,roughness:.34,metalness:.26,emissive:0x081829}));stackMesh.position.set(-2.55,1.4,0);scene.add(stackMesh);
    potMesh=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,2.1,48),new THREE.MeshStandardMaterial({color:0xffcf70,roughness:.38,metalness:.3,emissive:0x2a1a05}));potMesh.position.set(2.45,.3,0);scene.add(potMesh);
    for(let i=0;i<3;i++){const g=new THREE.Mesh(new THREE.TorusGeometry(.62,.055,14,48),new THREE.MeshStandardMaterial({color:[0x5ef1d3,0xa88cff,0xffcf70][i],transparent:true,opacity:.28,emissive:[0x103c34,0x251a39,0x3a280a][i]}));g.rotation.x=Math.PI/2;g.position.set(-.85+i*.85,.28,0);scene.add(g);gates.push(g)}
    const pg=new THREE.SphereGeometry(.055,10,10),pm=new THREE.MeshStandardMaterial({color:0xbefcf0,emissive:0x18443e});for(let i=0;i<42;i++){const m=new THREE.Mesh(pg,pm);m.visible=false;m.userData={};scene.add(m);particles.push(m)}
    function resize(){const r=c.getBoundingClientRect(),w=Math.max(300,Math.floor(r.width)),h=Math.floor(w*(innerWidth<720?.75:.52));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}resize();new ResizeObserver(resize).observe(c);
    c.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;c.setPointerCapture(e.pointerId)});c.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-lastX)*.007;lastX=e.clientX});c.addEventListener('pointerup',()=>drag=false);
    function loop(){scene.rotation.y+=(yaw-scene.rotation.y)*.08;particles.forEach(p=>{if(!p.visible)return;p.position.x+=p.userData.vx||0;p.position.y+=p.userData.vy||0;p.position.z+=p.userData.vz||0;p.userData.life=(p.userData.life||1)-.018;if(p.userData.life<=0)p.visible=false});camera.lookAt(0,.45,0);renderer.render(scene,camera);requestAnimationFrame(loop)}loop();resetWorld(40,10,3);
  }catch(e){$('#world').classList.add('hidden');$('#worldFallback').classList.remove('hidden')}
}
function resetWorld(stack,pot,n){
  targetState={stack,pot,n};$('#worldStack').textContent=`${fmt(stack)}bb`;$('#worldPot').textContent=`${fmt(pot)}bb`;$('#fallbackStack').textContent=fmt(stack);$('#fallbackPot').textContent=fmt(pot);$('#streetLabel').textContent='READY';
  if(!THREE)return;stackMesh.scale.y=1;stackMesh.position.y=1.4;potMesh.scale.y=.18;potMesh.position.y=.18;gates.forEach((g,i)=>g.material.opacity=i<n?.3:.08);
}
async function playWorld(stack,pot,n,pct,good){
  let s=stack,p=pot;for(let i=0;i<n;i++){const bet=Math.min(s,p*pct/100);s=Math.max(0,s-bet);p+=2*bet;$('#streetLabel').textContent=n===3?['FLOP','TURN','RIVER'][i]:`STREET ${i+1}`;$('#worldStack').textContent=`${fmt(s)}bb`;$('#worldPot').textContent=`${fmt(p)}bb`;
    if(THREE){stackMesh.scale.y=clamp(s/stack,.035,1);stackMesh.position.y=1.4*stackMesh.scale.y;potMesh.scale.y=clamp(p/(pot+2*stack),.12,1.05);potMesh.position.y=1.05*potMesh.scale.y;gates[i].material.opacity=1;emitTransfer(i)}
    await new Promise(r=>setTimeout(r,330));if(THREE)gates[i].material.opacity=.2;
  }
  $('#streetLabel').textContent=good?'STACK = 0 · LOCKED':s>.25?`${fmt(s)}bb RESIDUE`:'STACK EXHAUSTED';if(good&&THREE)burst();
}
function emitTransfer(i){for(let k=0;k<6;k++){const p=particles[(i*7+k)%particles.length];p.visible=true;p.position.set(-1.7+k*.15,.35+Math.random()*.3,(Math.random()-.5)*.3);p.userData={vx:.06+Math.random()*.04,vy:.005,vz:0,life:1}}}
function burst(){particles.forEach((p,i)=>{p.visible=true;p.position.set(0,.65,0);const a=i/particles.length*Math.PI*2;p.userData={vx:Math.cos(a)*(.03+Math.random()*.04),vy:.035+Math.random()*.04,vz:Math.sin(a)*(.03+Math.random()*.04),life:1}})}

$('#enterForge').addEventListener('click',()=>{$('#intro').classList.add('hide');progress.introSeen=true;persist();sound(true,true);setTimeout(()=>$('#intro').classList.add('hidden'),450)});
if(progress.introSeen)$('#intro').classList.add('hidden');
$('#audioToggle').textContent=progress.audio?'◈':'◇';

renderReactor();updateStats();initWorld3D();newAnchor();
