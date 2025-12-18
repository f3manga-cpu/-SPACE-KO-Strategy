import streamlit as st
import math

# --- PAGE CONFIGURATION ---
st.set_page_config(
    page_title="SPACE KO Strategy App",
    page_icon="🛸",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for polished typography and metric styling
st.markdown("""
    <style>
    .main { background-color: #0F172A; }
    div[data-testid="stMetricValue"] { font-size: 42px; font-weight: 700; color: #22C55E; }
    h2, h3 { margin-bottom: -10px; padding-bottom: 10px; }
    .stAlert { border: none; border-left: 5px solid #22C55E; }
    </style>
    """, unsafe_allow_html=True)

# --- SIDEBAR: TOURNAMENT SETUP ---
with st.sidebar:
    st.header("🏆 Tournament Setup")
    st.markdown("---")
    buy_in = st.number_input("Total Buy-in (€)", min_value=0.50, value=10.0, step=0.50)
    starting_stack = st.number_input("Starting Stack (Chips)", min_value=1, value=20000, step=1000)
    
    # Calculate Bounty Pool (Usually 50% in Winamax KO)
    bounty_pool = buy_in * 0.50
    chip_value_euro = bounty_pool / starting_stack
    
    st.info(f"Tournament Value: 1000 chips = €{chip_value_euro * 1000:.4f}")

# --- APP HEADER ---
st.title("🛸 SPACE KO In-Game Tool")

# --- MAIN LAYOUT ---
col_left, col_right = st.columns([3, 2], gap="large")

with col_left:
    # --- SECTION 1: BOUNTY CONVERTER ---
    with st.container(border=True):
        st.markdown("## 🚀 Bounty Value Converter")
        c1, c2 = st.columns(2)
        with c1:
            current_bounty = st.number_input("Bounty on Head (€)", min_value=0.0, value=5.0, step=0.5)
        with c2:
            current_bb = st.number_input("Current Big Blind (Chips)", min_value=1, value=1000, step=100)
        
        # Calculation: Bounty BB = (Bounty / (Bounty_Pool / Starting_Stack)) / BB
        # Simplified: (Bounty / chip_value_euro) / current_bb
        bounty_in_chips = current_bounty / chip_value_euro
        bounty_bb = bounty_in_chips / current_bb
        
        # Color Logic & Labels
        if bounty_bb > 8:
            label = "HIGH VALUE 🚀"
            color = "normal"
            msg_type = "success"
        elif bounty_bb >= 3:
            label = "Significant Factor"
            color = "normal"
            msg_type = "info"
        else:
            label = "Standard"
            color = "off"
            msg_type = "secondary"

        st.metric(label=f"Bounty Value in BB ({label})", value=f"{bounty_bb:.2f} BB")
        st.session_state.bounty_bb = bounty_bb

    st.markdown(" ") # Spacer

    # --- SECTION 2: PRE-FLOP ADVISOR ---
    with st.container(border=True):
        st.markdown("## 📊 Pre-Flop Call Advisor")
        
        if 'bounty_bb' in st.session_state and st.session_state.bounty_bb > 0:
            c1, c2 = st.columns(2)
            with c1:
                pot_size_bb = st.number_input("Pot Before Shove (BB)", min_value=1.0, value=5.0)
                shove_size_bb = st.number_input("Villain Shove Size (BB)", min_value=1.0, value=15.0)
            with c2:
                # Math for Equity
                # Standard Equity = Call / (Pot + Shove + Call)
                total_pot_standard = pot_size_bb + (shove_size_bb * 2)
                equity_standard = (shove_size_bb / total_pot_standard) * 100
                
                # KO Equity = Call / (Pot + Shove + Call + BountyBB)
                total_pot_ko = total_pot_standard + st.session_state.bounty_bb
                equity_ko = (shove_size_bb / total_pot_ko) * 100
                
                reduction = equity_standard - equity_ko
                
                st.metric("Standard Equity %", f"{equity_standard:.1f}%")
                st.metric("With Bounty %", f"{equity_ko:.1f}%", delta=f"-{reduction:.1f}%", delta_color="inverse")

            # Feedback Message
            if reduction > 7:
                st.success(f"**CALL WIDER! 💚** The bounty significantly lowers your requirements by **{reduction:.1f}%**.")
            elif reduction > 3:
                st.info(f"**Noticeable Impact:** You can expand your calling range by roughly **{reduction:.1f}%**.")
            else:
                st.write("Minor bounty impact. Use standard ranges.")
        else:
            st.warning("Please enter bounty details above to unlock the Advisor.")

with col_right:
    # --- SECTION 3: POST-FLOP PLANNING ---
    with st.container(border=True):
        st.markdown("## ♠️❤️ Post-Flop Planner")
        
        pot_flop = st.number_input("Current Pot (BB)", min_value=1.0, value=10.0)
        eff_stack = st.number_input("Effective Stack (BB)", min_value=1.0, value=50.0)
        
        spr = eff_stack / pot_flop
        st.metric("SPR (Stack-to-Pot Ratio)", f"{spr:.2f}")
        
        st.markdown("---")
        st.markdown("### 📐 Geometric Sizing")
        
        # Geometric Growth Formulas
        # 2 Streets (Turn-River): Pot * (1+x)^2 = Pot + Stack -> (1+x) = sqrt((Pot+Stack)/Pot)
        geo_2 = (math.sqrt((pot_flop + eff_stack) / pot_flop) - 1) * 100
        # 3 Streets (Flop-Turn-River): (1+x) = cuberoot((Pot+Stack)/Pot)
        geo_3 = (math.pow((pot_flop + eff_stack) / pot_flop, 1/3) - 1) * 100
        
        # Display Visual Sizing
        st.markdown(f"**⏩ To get All-In by TURN (2 Streets):**")
        st.markdown(f"**{geo_2:.1f}%** pot per street")
        st.progress(min(geo_2/200, 1.0))
        
        st.markdown(f"**⏩⏩ To get All-In by RIVER (3 Streets):**")
        st.markdown(f"**{geo_3:.1f}%** pot per street")
        st.progress(min(geo_3/200, 1.0))
        
        if spr < 3:
            st.success("🎯 **COMMITMENT ALERT:** Low SPR detected. Prioritize stack-off with any strong draw or top pair.")

st.markdown("---")
st.caption("SPACE KO Strategy Calculator | Mathematically optimized for Winamax Formats.")
