import streamlit as st
import math
import pandas as pd
import os
from datetime import datetime

# --- PAGE CONFIGURATION ---
st.set_page_config(
    page_title="SPACE KO Strategy App",
    page_icon="🛸",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for polished typography
st.markdown("""
   <style>
    .main { background-color: #0F172A; }
    [data-testid="stMetricValue"] > div { color: #22C55E !important; font-weight: 700 !important; }
    .neutral-box [data-testid="stMetricValue"] > div { color: #94A3B8 !important; }
    .stExpander { border: 1px solid #1E293B; border-radius: 8px; margin-bottom: 10px; }
    /* Success/Fail coloring for the logger feedback */
    .log-success { color: #22C55E; font-weight: bold; }
   </style>
   """, unsafe_allow_html=True)

# --- FILE HANDLING: CSV TRACKER ---
LOG_FILE = "space_ko_session_log.csv"

def init_log_file():
    """Initializes the CSV file with headers if it doesn't exist."""
    if not os.path.exists(LOG_FILE):
        df = pd.DataFrame(columns=[
            "Date_Time", "Buy_In", "Token_Level", "Blind_Level", 
            "Tool_Advice", "Decision", "Outcome", 
            "Bounty_Won_Euro", "Multiplier_RNG", "Notes"
        ])
        df.to_csv(LOG_FILE, index=False)

def save_log_entry(entry_data):
    """Appends a new log entry to the CSV."""
    df = pd.DataFrame([entry_data])
    df.to_csv(LOG_FILE, mode='a', header=False, index=False)

# Initialize file on app load
init_log_file()

# --- SIDEBAR: TOURNAMENT & TRACKER ---
with st.sidebar:
    st.header("🏆 Setup & Tracker")
    
    with st.expander("⚙️ Tournament Config", expanded=True):
        buy_in = st.number_input("Total Buy-in (€)", min_value=0.50, value=10.0, step=5.0)
        starting_stack = st.number_input("Starting Stack", value=20000, step=1000)
        # Bounty Pool Calculation (Space KO specific)
        bounty_pool = buy_in * 0.9  # Approx pool deduction
        chip_value_euro = bounty_pool / starting_stack
        st.caption(f"1k Chips ≈ €{chip_value_euro * 1000:.2f}")

    st.markdown("---")
    st.subheader("📝 Hand Logger")
    
    with st.form("session_log_form", clear_on_submit=True):
        st.caption("Log key hands to track ROI & RNG")
        
        # Data Inputs
        s_token = st.number_input("My Token Lvl", min_value=1, max_value=14, value=1)
        s_blinds = st.text_input("Blinds (e.g. 200/400)", value="200/400")
        
        # Strategy Context
        s_advice = st.selectbox("Tool Advice", ["None", "Call Wider (Low Impact)", "Call Wider (High Impact)", "Shove (Geometric)"])
        s_decision = st.radio("My Decision", ["Followed Tool", "Ignored Tool (Gut)", "Standard Play"])
        
        # Result
        s_outcome = st.selectbox("Outcome", ["Won Pot (No KO)", "Won Bounty 🎯", "Lost Pot", "Busted ☠️"])
        
        # Space KO Specifics (Only matters if Bounty Won)
        s_bounty_amt = st.number_input("Bounty Won (€)", min_value=0.0, step=0.5)
        s_multiplier = st.select_slider("RNG Multiplier?", options=["x0.4", "x1", "x2", "x3", "x5", "x10", "x50+"], value="x1")
        
        s_notes = st.text_input("Brief Notes", placeholder="e.g. AKs vs 99 flip")
        
        submitted = st.form_submit_button("💾 Save to Log")
        
        if submitted:
            new_entry = {
                "Date_Time": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "Buy_In": buy_in,
                "Token_Level": s_token,
                "Blind_Level": s_blinds,
                "Tool_Advice": s_advice,
                "Decision": s_decision,
                "Outcome": s_outcome,
                "Bounty_Won_Euro": s_bounty_amt if "Bounty" in s_outcome else 0,
                "Multiplier_RNG": s_multiplier if "Bounty" in s_outcome else "N/A",
                "Notes": s_notes
            }
            save_log_entry(new_entry)
            st.success("✅ Hand Logged!")

# --- MAIN APP LAYOUT ---
st.title("🛸 SPACE KO In-Game Tool")

col_left, col_right = st.columns([3, 2], gap="large")

with col_left:
    # --- SECTION 1: BOUNTY CONVERTER ---
    with st.container(border=True):
        st.markdown("## 🧮 Bounty Value Converter")
        c1, c2 = st.columns(2)
        with c1:
            current_bb = st.number_input("🪙 Big Blind (Chips)", min_value=100, value=400, step=100)
        with c2:
            current_bounty = st.number_input("🎯 Bounty on Head (€)", min_value=0.0, value=5.0, step=0.5)
        
        # Math: Space KO credits 50% to balance, 50% to token.
        # Immediate value is the cash part + equity of increasing own token.
        # Simplified: We treat the full face value as the incentive for calculations.
        bounty_in_chips = (current_bounty / chip_value_euro) * 0.5
        bounty_bb = bounty_in_chips / current_bb
        
        if bounty_bb > 8:
            label, msg_type = "HIGH VALUE 🚀", "success"
        elif bounty_bb >= 3:
            label, msg_type = "Significant", "info"
        else:
            label, msg_type = "Standard", "secondary"

        st.metric(label=f"⚖️ Bounty Value (BB) ({label})", value=f"{bounty_bb:.2f} BB")
        st.session_state.bounty_bb = bounty_bb

    st.markdown(" ") 

    # --- SECTION 2: PRE-FLOP ODDS ---
    with st.container(border=True):
        with st.expander("## 📊 Pre-Flop Odds", expanded=True):
            if 'bounty_bb' in st.session_state and st.session_state.bounty_bb > 0:
                c1, c2 = st.columns(2)
                with c1:
                    pot_size_bb = st.number_input("💰 Pot Before Shove (BB)", min_value=1.0, value=2.5)
                    shove_size_bb = st.number_input("⚔️ Villain Shove (BB)", min_value=0.5, value=15.0)
                with c2:
                    # Standard Pot Odds
                    total_pot_standard = pot_size_bb + (shove_size_bb * 2)
                    equity_standard = (shove_size_bb / total_pot_standard) * 100
                    
                    # KO Pot Odds (The Pot is effectively larger by the bounty amount)
                    total_pot_ko = total_pot_standard + st.session_state.bounty_bb
                    equity_ko = (shove_size_bb / total_pot_ko) * 100
                    
                    reduction = equity_standard - equity_ko
                    
                    st.metric("Standard Equity Req", f"{equity_standard:.1f}%")      
                    st.metric("💸 With Bounty Req", f"{equity_ko:.1f}%", delta=f"-{reduction:.1f}% req", delta_color="inverse")

                if reduction > 7:
                    st.success(f"**CALL WIDER! 🚀** Equity needed drops by **{reduction:.1f}%**.")
                elif reduction > 3:
                    st.info(f"**Impact:** Equity needed drops by **{reduction:.1f}%**.")
            else:
                st.warning("Enter bounty details above to unlock.")

with col_right:
    # --- SECTION 3: POST-FLOP ---
    with st.container(border=True):
        with st.expander("## ♠️❤️ Post-Flop", expanded=True):
            pot_flop = st.number_input("💰 Flop Pot (BB)", min_value=1.0, value=10.0)
            eff_stack = st.number_input("🛡️ Eff. Stack (BB)", min_value=1.0, value=40.0)
            
            spr = eff_stack / pot_flop
            st.metric("🧩 SPR", f"{spr:.2f}")
            
            st.markdown("---")
            st.markdown("### 📐 Geometric Sizing")
            
            # Geometric Growth Math
            # 2 Streets (Turn shove)
            geo_2 = (math.sqrt((pot_flop + eff_stack) / pot_flop) - 1) * 100
            # 3 Streets (Flop, Turn, River shove)
            geo_3 = (math.pow((pot_flop + eff_stack) / pot_flop, 1/3) - 1) * 100
            
            st.info(f"**2-Street Shove:** Bet **{geo_2:.0f}%** Pot")
            st.caption(f"Bet Turn {geo_2:.0f}%, River Shove")
            
            st.info(f"**3-Street Shove:** Bet **{geo_3:.0f}%** Pot")
            st.caption(f"Bet Flop {geo_3:.0f}%, Turn {geo_3:.0f}%, River Shove")

# --- DATA VIEW (Bottom) ---
st.markdown("---")
if st.checkbox("📂 Show Session Log History"):
    if os.path.exists(LOG_FILE):
        df_log = pd.read_csv(LOG_FILE)
        st.dataframe(df_log.tail(10), use_container_width=True)
    else:
        st.warning("No logs found yet.")
