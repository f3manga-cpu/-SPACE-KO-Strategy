from __future__ import annotations

import random
from collections import defaultdict

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from geometry import geometric_bet_percent, nearest_anchor, spr_from_pot_stack, street_schedule

st.set_page_config(page_title="SPACE KO Geometry Reflex Lab", page_icon="🛸", layout="wide", initial_sidebar_state="collapsed")

st.markdown("""
<style>
.block-container{max-width:1200px;padding-top:1.1rem;padding-bottom:3rem}
[data-testid="stMetric"]{background:#101a28;border:1px solid #25374d;border-radius:14px;padding:11px}
.hero{border:1px solid #26364b;border-radius:18px;padding:18px;background:linear-gradient(135deg,#101a28,#0d1522)}
.kicker{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:#86efac;font-weight:800}
.title{font-size:clamp(2rem,5vw,4rem);line-height:.96;letter-spacing:-.04em;font-weight:900;margin:.25rem 0 .6rem}
.sub{max-width:780px;color:#b6c4d5}.pipe{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px}
.stage,.anchor{border:1px solid #2c4058;background:#0d1724;border-radius:13px;padding:11px}.stage b{display:block;font-size:1.12rem}.stage small,.anchor small{color:#91a3b7}
.anchorgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.anchor{text-align:center}.anchor b{font-size:1.38rem;display:block}.gold{border-color:#755f25;background:#1b180f}
.recall{border:2px solid #2f6b47;border-radius:18px;padding:18px;background:#0d1b16}.question{font-size:clamp(2rem,7vw,4.5rem);font-weight:900;letter-spacing:-.05em;line-height:1}.micro{color:#91a3b7;font-size:.82rem}
.memory{border-left:4px solid #22c55e;background:#101a28;padding:11px 13px;border-radius:8px;margin:.55rem 0}.formula{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:clamp(1.25rem,3vw,2rem);font-weight:850}
@media(max-width:760px){.pipe,.anchorgrid{grid-template-columns:1fr}}
</style>
""", unsafe_allow_html=True)

ANCHORS={2:[1.0,1.5,2.0,3.0,4.0],3:[2.0,3.0,4.0,5.0,6.0]}

def key(n,s): return f"{n}:{s:g}"

def init_state():
    defaults={"attempts":0,"correct":0,"streak":0,"best":0,"mastery":{},"misses":defaultdict(int),"retries":[],"q":None,"feedback":None,"transfer":None,"transfer_fb":None}
    for k,v in defaults.items():
        if k not in st.session_state: st.session_state[k]=v
init_state()

def strength(n,s): return int(st.session_state.mastery.get(key(n,s),0))

def next_question():
    due=[x for x in st.session_state.retries if x[0]<=st.session_state.attempts]
    if due and random.random()<.65:
        item=due[0]; st.session_state.retries.remove(item); _,n,s=item
    else:
        cards=[(n,s) for n,vals in ANCHORS.items() for s in vals]
        weights=[max(1,6-strength(n,s)+.7*st.session_state.misses.get(key(n,s),0)) for n,s in cards]
        n,s=random.choices(cards,weights=weights,k=1)[0]
    st.session_state.q={"n":n,"spr":s}; st.session_state.feedback=None

def score(guess):
    q=st.session_state.q; n,s=q["n"],q["spr"]; ans=geometric_bet_percent(s,n); ok=abs(guess-ans)<=3
    st.session_state.attempts+=1
    if ok:
        st.session_state.correct+=1; st.session_state.streak+=1; st.session_state.best=max(st.session_state.best,st.session_state.streak); st.session_state.mastery[key(n,s)]=min(5,strength(n,s)+1)
    else:
        st.session_state.streak=0; st.session_state.mastery[key(n,s)]=max(0,strength(n,s)-1); st.session_state.misses[key(n,s)]+=1; st.session_state.retries.append((st.session_state.attempts+random.randint(2,4),n,s))
    st.session_state.feedback={"ok":ok,"ans":ans,"guess":guess,"n":n,"spr":s}

if st.session_state.q is None: next_question()

st.markdown("""<div class="hero"><div class="kicker">SPACE KO · POST-FLOP MEMORY SYSTEM</div><div class="title">Geometry Reflex Lab</div><div class="sub">Train one reflex: <b>effective stack → pot → SPR → streets → geometric size</b>. Retrieval, spacing, dual coding and real-table transfer are built into the loop.</div></div>""", unsafe_allow_html=True)

c1,c2,c3,c4=st.columns(4); acc=100*st.session_state.correct/st.session_state.attempts if st.session_state.attempts else 0
c1.metric("Attempts",st.session_state.attempts); c2.metric("Accuracy",f"{acc:.0f}%"); c3.metric("Streak",st.session_state.streak); c4.metric("Best",st.session_state.best)

learn,drill,real,maptab,tools=st.tabs(["🧠 Learn","⚡ Reflex drill","♠️ Real-hand transfer","🗺️ 3D map","🛸 SPACE KO tools"])

with learn:
    st.subheader("A mnemonic with meaning")
    st.markdown("""<div class="pipe">
    <div class="stage"><small>1 · DOUBLE</small><b>2 × SPR</b><small>Two effective stacks must enter.</small></div>
    <div class="stage"><small>2 · PLUS ONE</small><b>+ 1</b><small>Add the pot already there.</small></div>
    <div class="stage"><small>3 · ROOT</small><b>ⁿ√</b><small>Spread growth across streets.</small></div>
    <div class="stage"><small>4 · MINUS ONE</small><b>− 1</b><small>Remove the original-pot part.</small></div>
    <div class="stage"><small>5 · HALF</small><b>÷ 2</b><small>Bet/call adds two equal parts.</small></div></div>""",unsafe_allow_html=True)
    st.markdown("### Reconstruction chant")
    st.markdown('<div class="formula">2S + 1 → ROOT → −1 → ÷2</div>',unsafe_allow_html=True)
    st.caption("2 streets = square root · 3 streets = cube root")
    a,b=st.columns(2)
    with a:
        st.markdown("#### 3-street ladder")
        cells=''.join(f'<div class="anchor {"gold" if s==4 else ""}"><small>SPR {s:g}</small><b>{geometric_bet_percent(s,3):.0f}%</b></div>' for s in ANCHORS[3])
        st.markdown(f'<div class="anchorgrid">{cells}</div>',unsafe_allow_html=True)
        st.markdown('<div class="memory"><b>2–35 · 3–46 · 4–54 · 5–61 · 6–68</b></div>',unsafe_allow_html=True)
    with b:
        st.markdown("#### 2-street ladder")
        cells=''.join(f'<div class="anchor {"gold" if s in (1.5,4) else ""}"><small>SPR {s:g}</small><b>{geometric_bet_percent(s,2):.0f}%</b></div>' for s in ANCHORS[2])
        st.markdown(f'<div class="anchorgrid">{cells}</div>',unsafe_allow_html=True)
        st.markdown('<div class="memory"><b>1–37 · 1.5–50 · 2–62 · 3–82 · 4–POT</b></div>',unsafe_allow_html=True)
    g1,g2,g3=st.columns(3); g1.info("**SPR 4 · 3 streets**\n\n≈ **54 / 54 / 54**"); g2.info("**SPR 4 · 2 streets**\n\n= **POT / POT**"); g3.info("**SPR 1.5 · 2 streets**\n\n= **HALF / HALF**")
    st.markdown("### Why it works")
    st.write("A bet of **b × pot** that is called multiplies the pot by **1+2b**. After n equal-percentage streets, growth is **(1+2b)ⁿ**. To absorb both stacks, the final pot is **1+2×SPR** starting pots.")
    st.latex(r"(1+2b)^n=1+2SPR\quad\Rightarrow\quad b=\frac{(1+2SPR)^{1/n}-1}{2}")

with drill:
    st.subheader("Retrieval before recognition")
    st.caption("Say it aloud before typing. Weak and missed anchors are weighted up; misses return after 2–4 other attempts.")
    q=st.session_state.q
    st.markdown(f'<div class="recall"><div class="micro">COMMIT BEFORE REVEAL</div><div class="question">SPR {q["spr"]:g} · {q["n"]} streets</div><div class="micro">Constant geometric % pot?</div></div>',unsafe_allow_html=True)
    with st.form("recall"):
        guess=st.number_input("Your answer (% pot)",min_value=0.0,max_value=250.0,step=1.0,value=None,placeholder="e.g. 54")
        submitted=st.form_submit_button("Commit answer",type="primary",use_container_width=True)
        if submitted and guess is not None: score(float(guess))
    fb=st.session_state.feedback
    if fb:
        if fb["ok"]: st.success(f"Correct — target {fb['ans']:.1f}%.")
        else:
            st.error(f"Target {fb['ans']:.1f}%. You answered {fb['guess']:.1f}%.")
            st.markdown(f"**Repair:** say **{fb['spr']:g}–{fb['ans']:.0f}** three times. This card is now scheduled to return.")
        f1,f2=st.columns([1,2])
        with f1:
            if st.button("Next retrieval →",type="primary",use_container_width=True): next_question(); st.rerun()
        with f2:
            with st.expander("Reconstruct from first principles"):
                final=1+2*fb["spr"]; root=final**(1/fb["n"]); st.write(f"2×SPR+1 = **{final:g}** → {fb['n']}th root = **{root:.3f}** → −1 → ÷2 = **{fb['ans']:.1f}%**")
    rows=[{"Streets":n,"SPR":s,"Target":f"{geometric_bet_percent(s,n):.0f}%","Mastery /5":strength(n,s),"Misses":st.session_state.misses.get(key(n,s),0)} for n,vals in ANCHORS.items() for s in vals]
    st.dataframe(pd.DataFrame(rows),hide_index=True,use_container_width=True)

with real:
    st.subheader("Transfer the reflex to table numbers")
    st.caption("Effective stack → pot → SPR → streets → % → actual bb bet.")
    p1,p2,p3=st.columns(3)
    pot=p1.number_input("Pot before first bet (bb)",min_value=.1,value=10.0,step=.5)
    stack=p2.number_input("Effective stack (bb)",min_value=0.0,value=40.0,step=.5)
    streets=p3.radio("Streets remaining",[3,2],horizontal=True)
    spr=spr_from_pot_stack(pot,stack); pct=geometric_bet_percent(spr,streets); sched=street_schedule(pot,stack,streets); first=sched[0].bet if sched else 0; a_spr,a_pct=nearest_anchor(spr,streets)
    k1,k2,k3,k4=st.columns(4); k1.metric("SPR",f"{spr:.2f}"); k2.metric("Geometry",f"{pct:.1f}%"); k3.metric("First bet",f"{first:.2f}bb"); k4.metric("Nearest anchor",f"{a_spr:g} → {a_pct:.0f}%")
    st.markdown(f'<div class="memory"><b>Table sentence:</b> Pot {pot:g} · stack {stack:g} → SPR {spr:.2f} → {streets} streets → <b>{pct:.1f}% pot</b></div>',unsafe_allow_html=True)
    names=["Flop","Turn","River"] if streets==3 else ["Street 1","Final street"]
    data=[]
    for i,s in enumerate(sched): data.append({"Street":names[i],"Pot before":round(s.pot_before,2),"Bet":round(s.bet,2),"% pot":round(100*s.bet/s.pot_before,1),"Pot after call":round(s.pot_after_call,2),"Stack left":round(s.stack_remaining,2)})
    st.dataframe(pd.DataFrame(data),hide_index=True,use_container_width=True)
    fig=go.Figure(); fig.add_trace(go.Bar(name="Pot before",x=names,y=[x["Pot before"] for x in data])); fig.add_trace(go.Bar(name="Bet",x=names,y=[x["Bet"] for x in data])); fig.add_trace(go.Scatter(name="Stack left",x=names,y=[x["Stack left"] for x in data],mode="lines+markers",yaxis="y2")); fig.update_layout(barmode="group",height=360,margin=dict(l=10,r=10,t=35,b=10),yaxis2=dict(overlaying="y",side="right",showgrid=False),legend=dict(orientation="h",y=1.12)); st.plotly_chart(fig,use_container_width=True,config={"displayModeBar":False})
    st.markdown("#### Blind transfer")
    if st.session_state.transfer is None:
        st.session_state.transfer={"pot":random.choice([6,8,10,12,15,20]),"stack":random.choice([12,16,20,24,30,32,40,48,60]),"n":random.choice([2,3])}
    tq=st.session_state.transfer; st.info(f"Pot **{tq['pot']}bb** · effective stack **{tq['stack']}bb** · **{tq['n']} streets**")
    with st.form("transfer_form"):
        z1,z2=st.columns(2); gs=z1.number_input("Your SPR",min_value=0.0,max_value=50.0,step=.1,value=None); gp=z2.number_input("Your geometric size (%)",min_value=0.0,max_value=250.0,step=1.0,value=None)
        check=st.form_submit_button("Check transfer",type="primary",use_container_width=True)
        if check and gs is not None and gp is not None:
            ts=tq["stack"]/tq["pot"]; tp=geometric_bet_percent(ts,tq["n"]); st.session_state.transfer_fb=(abs(gs-ts)<=.25,abs(gp-tp)<=4,ts,tp)
    if st.session_state.transfer_fb:
        os,op,ts,tp=st.session_state.transfer_fb
        (st.success if os and op else st.warning)(f"Correct chain: {tq['stack']} ÷ {tq['pot']} = SPR {ts:.2f} → {tq['n']} streets = {tp:.1f}% pot.")
        if st.button("New transfer spot"): st.session_state.transfer=None; st.session_state.transfer_fb=None; st.rerun()

with maptab:
    st.subheader("Interactive geometry landscape")
    st.caption("Rotate, pan and zoom. Only 2 and 3 are real street counts; the surface between them is visual interpolation.")
    hs=st.slider("Highlight SPR",.5,8.0,4.0,.1); hn=st.radio("Highlight streets",[2,3],horizontal=True,key="map_n")
    xs=[.5+i*.1 for i in range(76)]; ys=[2+i*.05 for i in range(21)]; zs=[[geometric_bet_percent(x,y) for x in xs] for y in ys]
    fig3=go.Figure([go.Surface(x=xs,y=ys,z=zs,colorscale="Viridis",opacity=.72,colorbar=dict(title="% pot"))])
    for n,vals in ANCHORS.items(): fig3.add_trace(go.Scatter3d(x=vals,y=[n]*len(vals),z=[geometric_bet_percent(s,n) for s in vals],mode="markers+text",text=[f"{s:g}→{geometric_bet_percent(s,n):.0f}%" for s in vals],textposition="top center",marker=dict(size=6),name=f"{n}-street anchors"))
    hz=geometric_bet_percent(hs,hn); fig3.add_trace(go.Scatter3d(x=[hs],y=[hn],z=[hz],mode="markers+text",text=[f"YOU {hz:.1f}%"],textposition="top center",marker=dict(size=9,symbol="diamond"),name="Selected")); fig3.update_layout(height=620,margin=dict(l=0,r=0,t=15,b=0),scene=dict(xaxis_title="SPR",yaxis_title="Streets",zaxis_title="Geometric % pot")); st.plotly_chart(fig3,use_container_width=True,config={"scrollZoom":True})
    st.markdown(f"**Selected:** SPR **{hs:.1f}** · {hn} streets → **{hz:.1f}% pot**")
    st.write("Across the surface: higher SPR demands a larger percentage. Adding a third street lowers the percentage required on each street.")

with tools:
    st.subheader("SPACE KO quick tools")
    st.caption("Kept separate so bounty arithmetic does not contaminate the geometry reflex.")
    x,y=st.columns(2)
    with x:
        buy=st.number_input("Total buy-in (€)",min_value=.5,value=10.0,step=.5); start=st.number_input("Starting stack",min_value=1000,value=20000,step=1000); bb=st.number_input("Current big blind (chips)",min_value=1,value=200,step=50); bounty=st.number_input("Bounty on head (€)",min_value=0.0,value=5.0,step=.5)
        pool=buy*.9; chip=pool/start; bounty_bb=((bounty/chip)*.5)/bb if chip else 0; st.metric("Approx. bounty value",f"{bounty_bb:.2f} BB"); st.caption("Legacy approximate pool assumption; verify event-specific bounty mechanics before treating as exact EV.")
    with y:
        base=st.number_input("Pot before villain shove (bb)",min_value=.1,value=2.5,step=.5); shove=st.number_input("Villain shove / amount to call (bb)",min_value=.1,value=15.0,step=.5); standard=100*shove/(base+2*shove); ko=100*shove/(base+2*shove+bounty_bb); st.metric("Standard required equity",f"{standard:.1f}%"); st.metric("With approximate bounty",f"{ko:.1f}%",delta=f"-{standard-ko:.1f} pts")

st.divider(); st.markdown("**3-minute pre-session ritual:** recite both ladders → 10 retrievals → 3 real-hand transfers."); st.caption("Geometry assumes heads-up bet/call action with no raises and equal percentage sizing across remaining streets. It is a stackoff-planning baseline, not a command to use that size with every range or board.")
