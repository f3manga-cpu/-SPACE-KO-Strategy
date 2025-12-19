import streamlit as st
import math

# --- PAGE CONFIGURATION ---
st.set_page_config(
    page_title="SPACE KO Strategy App",
    page_icon="🛸",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for polished typography, metric styling, and cleaner expanders
st.markdown("""
    <style>
    .main { background-color: #0F172A; }
    
    .main p { font-size: 1.2rem; font-weight: 600; }
    
    div[data-testid="stMetricValue"] { font-size: 42px; font-weight: 700; color: #22C55E; }
    
    [data-testid="stMetric"][data-testid="neutral-metric"] div[data-testid="stMetricValue"] 
    { color: #94A3B8 !important; font-weight: 400 !important; font-size: 32px !important; }
        
    st.sidebar p { font-size: 1.2rem; font-weight: 600; }
    
    /* Style for the expander headers to make them look like cards */
    .stExpander { border: 1px solid #1E293B; border-radius: 8px; margin-bottom: 10px; }
    .stExpander p { font-size: 1.2rem; font-weight: 600; }
    </style>
    """, unsafe_allow_html=True)

# --- SIDEBAR: TOURNAMENT SETUP ---
with st.sidebar:
    st.header("🏆 Tournament Setup")
    st.markdown("---")
    buy_in = st.number_input("Total Buy-in (€)", min_value=0.50, value=10.0, step=5.0)
    starting_stack = st.number_input("Starting Stack (Chips)", min_value=1, value=20000, step=1000)
    
    # Bounty Pool Calculation
    bounty_pool = buy_in * 0.9
    chip_value_euro = bounty_pool / starting_stack
    
    st.info(f"Value: 1000 chips = €{chip_value_euro * 1000:.4f}")

# --- APP HEADER ---
st.title("🛸 SPACE KO In-Game Tool")

# --- MAIN LAYOUT ---
col_left, col_right = st.columns([3, 2], gap="large")

with col_left:
    # --- SECTION 1: BOUNTY CONVERTER (Always Visible) ---
    with st.container(border=True):
        st.markdown("## 🧮 Bounty Value Converter")
        c1, c2 = st.columns(2)
        with c1:
            current_bb = st.number_input("🪙 Current Big Blind (Chips)", min_value=1, value=200, step=100)
        with c2:
            current_bounty = st.number_input("🎯 Bounty on Head (€)", min_value=0.0, value=5.0, step=0.5)
        
        bounty_in_chips = (current_bounty / chip_value_euro) *0.5
        bounty_bb = bounty_in_chips / current_bb
        
        if bounty_bb > 8:
            label, msg_type = "HIGH VALUE 🚀", "success"
        elif bounty_bb >= 3:
            label, msg_type = "Significant Factor", "info"
        else:
            label, msg_type = "Standard", "secondary"

        st.metric(label=f"⚖️ Bounty Value (BB) ({label})", value=f"{bounty_bb:.2f} BB")
        st.session_state.bounty_bb = bounty_bb

    st.markdown(" ") 

    # --- SECTION 2: PRE-FLOP ODDS (Starts Closed) ---
    with st.container(border=True):
        with st.expander("## 📊 Pre-Flop Odds", expanded=False):
            if 'bounty_bb' in st.session_state and st.session_state.bounty_bb > 0:
                c1, c2 = st.columns(2)
                with c1:
                    pot_size_bb = st.number_input("💰 Pot Before Shove (BB)", min_value=2.25, value=2.25)
                    shove_size_bb = st.number_input("⚔️ Villain Shove Size (BB)", min_value=0.8, value=100.0)
                with c2:
                    total_pot_standard = pot_size_bb + (shove_size_bb * 2)
                    equity_standard = (shove_size_bb / total_pot_standard) * 100
                    total_pot_ko = total_pot_standard + st.session_state.bounty_bb
                    equity_ko = (shove_size_bb / total_pot_ko) * 100
                    reduction = equity_standard - equity_ko

                    st.markdown('<div data-testid="neutral-metric">', unsafe_allow_html=True)
                    st.metric("Standard Equity %", f"{equity_standard:.1f}%")
                    st.markdown('</div>', unsafe_allow_html=True)
                    st.metric("🟢 With Bounty %", f"{equity_ko:.1f}%", delta=f"-{reduction:.1f}%", delta_color="inverse")

                if reduction > 7:
                    st.success(f"**CALL WIDER! 💚** Equity requirement drops by **{reduction:.1f}%**.")
                elif reduction > 3:
                    st.info(f"**Impact:** Equity needed drops by **{reduction:.1f}%**.")
            else:
                st.warning("Enter bounty details in Section 1 to unlock.")

with col_right:
    # --- SECTION 3: POST-FLOP METRICS (Starts Closed) ---
    with st.container(border=True):
        with st.expander("## ♠️❤️ Post-Flop Metrics", expanded=False):
            pot_flop = st.number_input("💰 Flop Pot Size (BB)", min_value=2.75, value=10.0)
            eff_stack = st.number_input("🛡️ Effective Stack (BB)", min_value=1.0, value=50.0)
            
            spr = eff_stack / pot_flop
            st.metric("🧩 SPR", f"{spr:.2f}")
            
            st.markdown("---")
            st.markdown("### 📐 Geometric Sizing")
            
            # Math: Find the % of pot to bet to reach stacks at the end
            geo_2 = (math.sqrt((pot_flop + eff_stack) / pot_flop) - 1) * 100
            geo_3 = (math.pow((pot_flop + eff_stack) / pot_flop, 1/3) - 1) * 100
            
            st.markdown(f"**⏩ TURN All-In (2 Streets):**")
            st.markdown(f"**{geo_2:.1f}%** pot/street")
           # st.progress(min(geo_2/200, 1.0))
            
            st.markdown(f"**⏩⏩ RIVER All-In (3 Streets):**")
            st.markdown(f"**{geo_3:.1f}%** pot/street")
           # st.progress(min(geo_3/200, 1.0))
            
            if spr < 3:
                st.success("🎯 **COMMITMENT ALERT:** Low SPR detected.")

st.markdown("---")
st.caption("SPACE KO Strategy Calculator | Optimized for High-Speed Decisions")
