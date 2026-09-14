import './app.js';

const STORE='geometry-forge-arena-v4';
const RANKS=[
  {name:'ROOKIE',min:0,tag:'R'},
  {name:'BRONZE',min:250,tag:'B'},
  {name:'SILVER',min:650,tag:'S'},
  {name:'GOLD',min:1150,tag:'G'},
  {name:'PLATINUM',min:1750,tag:'P'},
  {name:'DIAMOND',min:2450,tag:'D'},
  {name:'MASTER',min:3200,tag:'M'},
  {name:'GRANDMASTER',min:3900,tag:'GM'}
];

const $=s=>document.querySelector(s);
let applying=false;

function readProgress(){
  try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}
}

function evidenceAdjustedRating(p){
  const mastery=Array.isArray(p.mastery)?p.mastery.reduce((a,b)=>a+(Number(b)||0),0)/50:0;
  const attempts=Number(p.totalAttempts)||0;
  const correct=Number(p.totalCorrect)||0;
  const tableAttempts=Number(p.tableAttempts)||0;
  const tableCorrect=Number(p.tableCorrect)||0;
  const totalLatency=Number(p.totalLatency)||0;

  const accuracy=attempts?correct/attempts:0;
  const tableAccuracy=tableAttempts?tableCorrect/tableAttempts:0;
  const avgLatency=correct?totalLatency/correct:5000;
  const speed=Math.max(0,Math.min(1,(5000-avgLatency)/3500));

  // Evidence gates prevent one or two lucky answers from producing a high rank.
  const accuracyEvidence=Math.min(1,attempts/30);
  const tableEvidence=Math.min(1,tableAttempts/12);
  const speedEvidence=Math.min(1,correct/20);

  return Math.round(Math.max(0,Math.min(4200,
    mastery*1850+
    accuracy*650*accuracyEvidence+
    tableAccuracy*900*tableEvidence+
    speed*600*speedEvidence
  )));
}

function setText(selector,value){
  const el=$(selector);
  if(el&&el.textContent!==value) el.textContent=value;
}

function fixRankUI(){
  const p=readProgress();
  const rating=evidenceAdjustedRating(p);
  let idx=0;
  for(let i=0;i<RANKS.length;i++) if(rating>=RANKS[i].min) idx=i;
  const rank=RANKS[idx],next=RANKS[idx+1]||null;
  const max=next?next.min:4200;
  const pct=next?100*(rating-rank.min)/(max-rank.min):100;

  setText('#rating',String(rating).padStart(4,'0'));
  setText('#rankName',rank.name);
  setText('#rankTitle',rank.name);
  setText('#rankEmblem',rank.tag);

  const fill=$('#rankFill');
  const width=`${Math.max(0,Math.min(100,pct))}%`;
  if(fill&&fill.style.width!==width) fill.style.width=width;

  const nextEl=$('#rankNext');
  if(nextEl){
    const html=next
      ? `${Math.max(0,next.min-rating)} rating to <span class="qualify">${next.name}</span>.`
      : 'Top rank secured. Defend it.';
    if(nextEl.innerHTML!==html) nextEl.innerHTML=html;
  }
}

function fixSnapLabels(){
  const kicker=$('#modeKicker');
  if(!kicker||!kicker.textContent.includes('SPR SNAP')) return;
  document.querySelectorAll('#responseZone .answer[data-v]').forEach(button=>{
    const value=button.dataset.v;
    const text=`SPR ${value}`;
    if(value!==undefined && button.textContent!==text) button.textContent=text;
  });
}

function applyPolish(){
  if(applying)return;
  applying=true;
  try{fixRankUI();fixSnapLabels()}finally{applying=false}
}

applyPolish();
const observer=new MutationObserver(()=>queueMicrotask(applyPolish));
observer.observe(document.body,{subtree:true,childList:true,characterData:true});
window.addEventListener('storage',applyPolish);
