import { useState, useEffect, useRef, useMemo } from "react";
import { submitQuizScore, loadAllScores, onScoresChanged, clearAllScores, submitPortfolio, loadAllPortfolios, onPortfoliosChanged, clearAllPortfolios, submitTimingScore, loadAllTimingScores, onTimingScoresChanged, clearAllTimingScores } from "./firebase.js";

const C = {
  bg:"#0a0f1a",card:"#111827",border:"#1e293b",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.15)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.15)",
  red:"#f87171",redDim:"rgba(248,113,113,0.15)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.15)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.15)",
  text:"#f1f5f9",textMuted:"#94a3b8",textDim:"#64748b",
  gold:"#fbbf24",silver:"#cbd5e1",bronze:"#f59e0b",
};
const F = {
  display:"'DM Serif Display', Georgia, serif",
  body:"'DM Sans', 'Segoe UI', sans-serif",
  mono:"'JetBrains Mono', 'Fira Code', monospace",
};

// ─── DEFAULT SETTINGS ──────────────────────────────────
const DEFAULT_SETTINGS = {
  marketReturn:8.0, valueReturn:9.2, momentumReturn:9.5, qualityReturn:8.8, smallCapReturn:9.0,
  // Volatility pinned to MSCI historical (annualised %)
  marketVol:15.0, valueVol:17.5, momentumVol:16.5, qualityVol:14.0, smallCapVol:17.0,
  passiveFee:0.10, factorFee:0.25, activeFee:0.90,
  pizzaCost:12.00, defaultGrowthRate:8.0,
  // Section toggles
  showQuiz:true, showJargon:true, showPortfolio:true, showFees:true, showPizza:true, showPick:true, showDoNothing:true,
};

const DEFAULT_QUIZ = [
  {q:"What does a passive index fund try to do?",options:["Beat the market by picking winners","Match the return of a market index","Only invest in tech stocks","Avoid all risk entirely"],correct:1,explanation:"A passive fund tracks an index like the FTSE 100 — it doesn't try to outsmart the market, just mirror it."},
  {q:"Which of these is a common 'factor' in factor investing?",options:["Luck","Value","Astrology","Gut feeling"],correct:1,explanation:"Value targets stocks that appear cheap relative to fundamentals. Others include momentum, quality, and size."},
  {q:"Over 20 years, roughly what % of active managers fail to beat a simple index fund?",options:["About 25%","About 50%","About 75%","Over 90%"],correct:3,explanation:"Over 90% of active managers underperform their benchmark over 20 years, largely due to higher fees."},
  {q:"Factor investing sits somewhere between…",options:["Stocks and bonds","Passive indexing and active stock-picking","Savings accounts and property","Crypto and commodities"],correct:1,explanation:"Factor investing is rules-based like passive, but tilts towards characteristics like value or momentum."},
  {q:"Why do fees matter so much in investing?",options:["They don't — performance is all that matters","They compound over time, eating into returns","Higher fees always mean better returns","Fees only apply when you sell"],correct:1,explanation:"Fees compound just like returns. Even a 1% difference can cost tens of thousands over 30 years."},
];

const DEFAULT_JARGON = [
  {term:"Alpha",plain:"Extra return above the market. If the market returns 8% and your fund returns 10%, your alpha is 2%.",category:"Performance"},
  {term:"Beta",plain:"How much your investment moves with the market. Beta of 1 = exactly with the market.",category:"Risk"},
  {term:"Expense Ratio",plain:"Annual fee to own a fund. 0.10% is cheap (passive), 0.90% is expensive (active).",category:"Fees"},
  {term:"Tracking Error",plain:"How closely a fund follows its index. Lower = more faithful. Like GPS accuracy.",category:"Performance"},
  {term:"Rebalancing",plain:"Adjusting your portfolio back to target mix. Like resetting scales when one side gets heavy.",category:"Strategy"},
  {term:"Drawdown",plain:"Peak-to-trough decline. If £100k drops to £70k, that's a 30% drawdown.",category:"Risk"},
  {term:"Dividend Yield",plain:"Annual income as % of price. A £100 stock paying £3/year = 3% yield.",category:"Income"},
  {term:"Market Cap",plain:"Total value of a company's shares. Large cap = big, small cap = smaller companies.",category:"Size"},
  {term:"Sharpe Ratio",plain:"Return per unit of risk. Higher = better. Like miles per gallon for investments.",category:"Performance"},
  {term:"Factor Premium",plain:"Extra return for tilting towards a factor like value — the 'reward' for that risk.",category:"Factors"},
];

// ─── MSCI ACWI HISTORICAL ANNUAL RETURNS (USD, %) ─────
const MSCI_ACWI_RETURNS = {
  2000:-14.2,2001:-16.2,2002:-19.3,2003:34.6,2004:15.8,2005:11.4,2006:21.5,2007:12.2,2008:-41.8,2009:35.4,
  2010:13.2,2011:-6.9,2012:16.8,2013:23.4,2014:4.7,2015:-1.8,2016:8.5,2017:24.6,2018:-8.9,2019:27.3,
  2020:16.8,2021:19.0,2022:-18.0,2023:22.8,2024:18.0,
};

// ─── COVID CRASH DATA (Mar 2020 start, weekly) ─────────
function generateCovidCrashData() {
  // Starting from March 2020 (week index 0 = first week of March)
  const raw = [100,97.5,91.2,85.3,78.5,72.1,66.2,70.8,74.5,77.2,79.8,80.5,82.3,84.1,85.0,86.2,84.8,86.5,88.0,89.2,90.5,91.0,92.3,93.5,95.0,96.8,98.2,99.5,97.8,96.5,98.0,99.0,97.5,96.0,97.8,100.5,104.2,108.0,110.5,111.8,113.2,114.5,116.0,117.0,116.2,115.0,116.8,118.0,119.5,118.2,119.0,120.5,121.8,122.0,123.5,125.0,126.2,127.5,128.0,128.5,129.0,130.2,131.0,132.0,133.5,134.0,135.5];
  const headlines = {0:"🔴 Markets in sharp decline as pandemic spreads",2:"🔴 Countries entering lockdown worldwide",3:"🔴 MSCI ACWI down 34% from Feb peak",5:"🔴 Markets hit bottom — March 23, 2020",6:"📰 Central banks announce massive stimulus",8:"📰 Tentative recovery — cases still rising",13:"📰 Economies beginning to reopen",21:"📰 Markets approaching pre-crash levels",25:"📰 Second wave fears — wobble",33:"✅ Vaccine breakthroughs — markets surge",37:"✅ All-time highs — full recovery",45:"✅ Strong rally into 2021",55:"✅ Portfolio well above starting value"};
  const sellPrompts = [2,4,8]; // During crash
  const buyPrompts = [10,18,25,33,45]; // During recovery
  return {
    weeks: raw.map((v,i)=>({week:i,value:Math.round(v*1000),headline:headlines[i]||null})),
    sellPrompts, buyPrompts,
    startDate: new Date(2020,2,2), // March 2, 2020
  };
}
const covidData = generateCovidCrashData();

// ─── GROWTH GENERATOR (calibrated volatility) ──────────
function genGrowth(seed, annualVol, annualReturn, years=20) {
  // Convert annual vol to monthly vol parameter
  // Monthly std ≈ annualVol / sqrt(12), our rng has std ≈ 0.289
  // So vol param ≈ (annualVol/100) / (0.289 * sqrt(12)) ≈ annualVol/100
  const vol = annualVol / 100;
  const md = Math.pow(1+annualReturn/100,1/12)-1;
  const pts=[]; let v=1000; // Start at £1,000
  const rng=(s)=>{s=Math.sin(s)*10000;return s-Math.floor(s);};
  for(let y=0;y<=years*12;y++){
    v*=(1+(rng(seed+y*7.3)-0.48)*vol+md);
    if(y%3===0)pts.push({month:y,value:Math.round(v*100)/100});
  }
  return pts;
}

const fundPairs = [
  {aType:"Passive Index",bType:"Value Factor",aSeed:101,bSeed:202,insight:"The factor fund had higher returns but more volatility — the bumpy ride is the price of the premium."},
  {aType:"Momentum Factor",bType:"Passive Index",aSeed:303,bSeed:404,insight:"Momentum delivered slightly more but with wilder swings. Passive was more stable."},
  {aType:"Passive Index",bType:"Quality Factor",aSeed:505,bSeed:606,insight:"Very similar! Quality is a 'defensive' tilt — like passive but with slightly better downside protection."},
];

// ─── CHART COMPONENTS ──────────────────────────────────
function MiniChart({data,color,width=280,height=80}) {
  if(!data?.length)return null;
  const min=Math.min(...data.map(d=>d.value))*0.95,max=Math.max(...data.map(d=>d.value))*1.05;
  const pts=data.map((d,i)=>`${(i/(data.length-1))*width},${height-((d.value-min)/(max-min))*height}`);
  return(<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:"block",maxWidth:"100%"}}><path d={`M${pts.join(" L")} L${width},${height} L0,${height} Z`} fill={color} opacity="0.1"/><path d={`M${pts.join(" L")}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}

function BigChart({datasets,width=700,height=300,yPrefix="£",yDivide=1}) {
  if(!datasets?.length)return null;
  const allVals=datasets.flatMap(ds=>ds.data.map(d=>d.value));
  const min=Math.min(...allVals)*0.9,max=Math.max(...allVals)*1.05;
  const pad={top:20,right:20,bottom:30,left:60};
  const w=width-pad.left-pad.right,h=height-pad.top-pad.bottom;
  const yTicks=Array.from({length:5},(_,i)=>min+((max-min)*i)/4);
  return(<svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
    {yTicks.map((v,i)=>{const y=pad.top+h-((v-min)/(max-min))*h;return(<g key={i}><line x1={pad.left} x2={width-pad.right} y1={y} y2={y} stroke={C.border}/><text x={pad.left-8} y={y+4} textAnchor="end" fill={C.textDim} fontSize="11" fontFamily={F.mono}>{yPrefix}{v>=10000?`${(v/1000).toFixed(0)}k`:v>=1000?`${(v/1000).toFixed(1)}k`:Math.round(v/yDivide)}</text></g>);})}
    {(datasets[0]?.xLabels||["0y","5y","10y","15y","20y"]).map((l,i,arr)=>l?<text key={i} x={pad.left+(w*i)/(arr.length-1)} y={height-6} textAnchor="middle" fill={C.textDim} fontSize="11" fontFamily={F.mono}>{l}</text>:null)}
    {datasets.map((ds,di)=>{const pts=ds.data.map((d,i)=>`${pad.left+(i/(ds.data.length-1))*w},${pad.top+h-((d.value-min)/(max-min))*h}`);return<path key={di} d={`M${pts.join(" L")}`} fill="none" stroke={ds.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={ds.opacity||0.9}/>;})}
  </svg>);
}

function CrashChart({data,soldWeek,boughtWeek,width=700,height=300}) {
  if(!data?.length)return null;
  const vals=data.map(d=>d.value);
  const min=Math.min(...vals)*0.92,max=Math.max(...vals)*1.05;
  const pad={top:20,right:20,bottom:45,left:65};
  const w=width-pad.left-pad.right,h=height-pad.top-pad.bottom;
  const x=(i)=>pad.left+(i/(data.length-1))*w;
  const y=(v)=>pad.top+h-((v-min)/(max-min))*h;
  const startVal=data[0].value;
  const yTicks=Array.from({length:5},(_,i)=>min+((max-min)*i)/4);
  const dateLabels=[];const startDate=covidData.startDate;const step=Math.max(1,Math.floor(data.length/8));
  for(let i=0;i<data.length;i+=step){const d=new Date(startDate.getTime()+i*7*86400000);dateLabels.push({idx:i,label:d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"})});}
  let segments=[],segStart=0,curCol=C.green;
  for(let i=1;i<=data.length;i++){const nc=i<data.length?(data[i].value<startVal?C.red:C.green):curCol;if(nc!==curCol||i===data.length){const pts=[];for(let j=segStart;j<i;j++)pts.push(`${x(j)},${y(data[j].value)}`);if(i<data.length)pts.push(`${x(i)},${y(data[i].value)}`);segments.push({color:curCol,d:`M${pts.join(" L")}`});curCol=nc;segStart=i;}}
  // Grey out cash period
  const cashStart = soldWeek !== null ? soldWeek : null;
  const cashEnd = boughtWeek !== null ? boughtWeek : null;
  return(<svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
    {yTicks.map((v,i)=>{const yp=y(v);return(<g key={i}><line x1={pad.left} x2={width-pad.right} y1={yp} y2={yp} stroke={C.border}/><text x={pad.left-8} y={yp+4} textAnchor="end" fill={C.textDim} fontSize="11" fontFamily={F.mono}>£{Math.round(v/1000)}k</text></g>);})}
    {dateLabels.map((dl,i)=>(<text key={i} x={x(dl.idx)} y={height-8} textAnchor="middle" fill={C.textDim} fontSize="10" fontFamily={F.mono}>{dl.label}</text>))}
    <line x1={pad.left} x2={width-pad.right} y1={y(startVal)} y2={y(startVal)} stroke={C.textDim} strokeDasharray="4,4" opacity="0.4"/>
    {cashStart!==null&&cashEnd!==null&&<rect x={x(cashStart)} y={pad.top} width={x(cashEnd)-x(cashStart)} height={h} fill={C.textDim} opacity="0.08" rx="4"/>}
    {segments.map((s,i)=><path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>)}
    {soldWeek!==null&&(<><circle cx={x(soldWeek)} cy={y(data[soldWeek].value)} r="6" fill={C.red}/><text x={x(soldWeek)} y={y(data[soldWeek].value)-14} textAnchor="middle" fill={C.red} fontSize="11" fontFamily={F.mono} fontWeight="700">SOLD</text></>)}
    {boughtWeek!==null&&(<><circle cx={x(boughtWeek)} cy={y(data[boughtWeek].value)} r="6" fill={C.green}/><text x={x(boughtWeek)} y={y(data[boughtWeek].value)-14} textAnchor="middle" fill={C.green} fontSize="11" fontFamily={F.mono} fontWeight="700">BOUGHT</text></>)}
  </svg>);
}

// ─── UI HELPERS ─────────────────────────────────────────
const TabBtn=({active,onClick,children,icon})=>(<button onClick={onClick} style={{display:"flex",alignItems:"center",gap:"6px",padding:"10px 12px",background:active?C.accentDim:"transparent",border:`1px solid ${active?C.accent:"transparent"}`,borderRadius:"10px",color:active?C.accent:C.textMuted,fontFamily:F.body,fontSize:"12px",fontWeight:active?600:400,cursor:"pointer",whiteSpace:"nowrap"}}><span style={{fontSize:"15px"}}>{icon}</span>{children}</button>);
const Stat=({label,value,sub,color})=>(<div style={{flex:1,minWidth:"110px",background:C.card,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"14px"}}><div style={{fontFamily:F.mono,fontSize:"10px",color:C.textDim,marginBottom:"4px",textTransform:"uppercase"}}>{label}</div><div style={{fontFamily:F.mono,fontSize:"20px",fontWeight:700,color}}>{value}</div>{sub&&<div style={{fontFamily:F.mono,fontSize:"10px",color:C.textDim,marginTop:"2px"}}>{sub}</div>}</div>);
const Legend=({color,label})=>(<div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:"12px",height:"3px",borderRadius:"2px",background:color}}/><span style={{fontFamily:F.mono,fontSize:"11px",color:C.textDim}}>{label}</span></div>);
const btn={padding:"14px 28px",background:C.accent,border:"none",borderRadius:"12px",color:"#0a0f1a",fontFamily:F.body,fontSize:"15px",fontWeight:700,cursor:"pointer"};
const sBtn={width:"32px",height:"32px",borderRadius:"8px",border:`1px solid ${C.border}`,background:C.card,color:C.text,fontFamily:F.mono,fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};
const chip={padding:"8px 14px",borderRadius:"8px",border:"1px solid",fontFamily:F.mono,fontSize:"13px",cursor:"pointer",background:C.card};
const inputStyle={padding:"8px 10px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:"6px",color:C.text,fontFamily:F.body,fontSize:"13px",outline:"none",width:"100%",boxSizing:"border-box"};

// ─── LEADERBOARD COMPONENT (reusable) ──────────────────
function Leaderboard({title,entries,columns,onBack,onRefresh,onClear}) {
  const medals=["🥇","🥈","🥉"],mCol=[C.gold,C.silver,C.bronze];
  const [sortCol,setSortCol]=useState(0);
  const [sortDir,setSortDir]=useState("desc");
  const sorted=[...entries].sort((a,b)=>{
    const col=columns[sortCol];
    const av=col.val(a),bv=col.val(b);
    return sortDir==="desc"?bv-av:av-bv;
  });
  const toggleSort=(i)=>{if(sortCol===i)setSortDir(d=>d==="desc"?"asc":"desc");else{setSortCol(i);setSortDir("desc");}};
  return(<div>
    <div style={{textAlign:"center",marginBottom:"24px"}}><div style={{fontSize:"48px",marginBottom:"8px"}}>🏆</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 4px"}}>{title}</h2><p style={{color:C.textMuted,fontSize:"14px",margin:0}}>{entries.length} participant{entries.length!==1?"s":""}</p></div>
    {entries.length===0?<p style={{color:C.textMuted,textAlign:"center",padding:"40px 0"}}>No submissions yet!</p>:(
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"12px",flexWrap:"wrap"}}>{columns.map((col,i)=>(<button key={i} onClick={()=>toggleSort(i)} style={{...chip,background:sortCol===i?C.accentDim:C.card,borderColor:sortCol===i?C.accent:C.border,color:sortCol===i?C.accent:C.textMuted,fontSize:"11px",padding:"6px 12px"}}>{col.label} {sortCol===i?(sortDir==="desc"?"↓":"↑"):""}</button>))}</div>
      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>{sorted.map((e,i)=>{const t3=i<3;return(<div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",background:t3?`${mCol[i]}12`:C.card,border:`1px solid ${t3?mCol[i]+"40":C.border}`,borderRadius:"10px"}}>
        <div style={{width:"36px",height:"36px",borderRadius:"8px",background:t3?`${mCol[i]}20`:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:t3?"18px":"13px",fontFamily:F.mono,color:t3?mCol[i]:C.textDim,fontWeight:700,flexShrink:0}}>{t3?medals[i]:`#${i+1}`}</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontFamily:F.body,fontWeight:600,color:C.text,fontSize:"15px"}}>{e.name}</div></div>
        {columns.map((col,ci)=>(<div key={ci} style={{fontFamily:F.mono,fontSize:"13px",color:sortCol===ci?C.accent:C.textMuted,minWidth:"60px",textAlign:"right"}}>{col.fmt(e)}</div>))}
      </div>);})}</div>
    </div>)}
    <div style={{display:"flex",gap:"12px",marginTop:"24px",justifyContent:"center",flexWrap:"wrap"}}><button onClick={onBack} style={{...btn,background:C.card,color:C.text,border:`1px solid ${C.border}`}}>← Back</button>{onRefresh&&<button onClick={onRefresh} style={{...btn,background:C.accentDim,color:C.accent,border:`1px solid ${C.accent}`}}>↻ Refresh</button>}{onClear&&<button onClick={onClear} style={{...btn,background:C.redDim,color:C.red,border:`1px solid ${C.red}`,fontSize:"13px",padding:"10px 18px"}}>Reset all</button>}</div>
  </div>);
}

// ═══════════════════════════════════════════════════════
// SETTINGS PANEL (with toggles + Q&A editors)
// ═══════════════════════════════════════════════════════
function SettingsPanel({settings,setSettings,quizQs,setQuizQs,jargonTs,setJargonTs}) {
  const [editTab,setEditTab]=useState("general");
  const numFields=[{section:"Annual Returns (%)",items:[{key:"marketReturn",label:"Market (passive)"},{key:"valueReturn",label:"Value"},{key:"momentumReturn",label:"Momentum"},{key:"qualityReturn",label:"Quality"},{key:"smallCapReturn",label:"Small Cap"}]},{section:"Annualised Volatility (%)",items:[{key:"marketVol",label:"Market"},{key:"valueVol",label:"Value"},{key:"momentumVol",label:"Momentum"},{key:"qualityVol",label:"Quality"},{key:"smallCapVol",label:"Small Cap"}]},{section:"Fees (OCF %)",items:[{key:"passiveFee",label:"Passive"},{key:"factorFee",label:"Factor"},{key:"activeFee",label:"Active"}]},{section:"Other",items:[{key:"pizzaCost",label:"Pizza cost (£)"},{key:"defaultGrowthRate",label:"Growth rate (%)"}]}];
  const toggles=[{key:"showQuiz",label:"Quiz"},{key:"showJargon",label:"Jargon Buster"},{key:"showPortfolio",label:"Portfolio Sim"},{key:"showFees",label:"Fee Explorer"},{key:"showPizza",label:"Pizza Test"},{key:"showPick",label:"Pick the Fund"},{key:"showDoNothing",label:"Do Nothing"}];
  const handleNum=(key,val)=>{const n=parseFloat(val);if(!isNaN(n))setSettings(s=>({...s,[key]:n}));};
  const toggleSection=(key)=>setSettings(s=>({...s,[key]:!s[key]}));

  // Quiz editor
  const updateQ=(idx,field,val)=>{const q=[...quizQs];q[idx]={...q[idx],[field]:val};setQuizQs(q);};
  const updateQOption=(qi,oi,val)=>{const q=[...quizQs];q[qi].options=[...q[qi].options];q[qi].options[oi]=val;setQuizQs(q);};
  const addQ=()=>setQuizQs([...quizQs,{q:"New question?",options:["Option A","Option B","Option C","Option D"],correct:0,explanation:"Explanation here."}]);
  const removeQ=(i)=>{if(quizQs.length>1)setQuizQs(quizQs.filter((_,j)=>j!==i));};

  // Jargon editor
  const updateJ=(idx,field,val)=>{const j=[...jargonTs];j[idx]={...j[idx],[field]:val};setJargonTs(j);};
  const addJ=()=>setJargonTs([...jargonTs,{term:"New Term",plain:"Definition here.",category:"General"}]);
  const removeJ=(i)=>{if(jargonTs.length>1)setJargonTs(jargonTs.filter((_,j)=>j!==i));};

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}><h3 style={{fontFamily:F.display,color:C.text,fontSize:"24px",margin:0}}>Settings</h3><button onClick={()=>{setSettings({...DEFAULT_SETTINGS});setQuizQs([...DEFAULT_QUIZ]);setJargonTs([...DEFAULT_JARGON]);}} style={{...btn,background:C.card,color:C.textMuted,border:`1px solid ${C.border}`,fontSize:"12px",padding:"8px 14px"}}>Reset all defaults</button></div>
    <div style={{display:"flex",gap:"6px",marginBottom:"24px",flexWrap:"wrap"}}>{[{id:"general",label:"General"},{id:"sections",label:"Sections"},{id:"quiz",label:"Quiz Qs"},{id:"jargon",label:"Jargon Qs"}].map(t=>(<button key={t.id} onClick={()=>setEditTab(t.id)} style={{...chip,background:editTab===t.id?C.accentDim:C.card,borderColor:editTab===t.id?C.accent:C.border,color:editTab===t.id?C.accent:C.textMuted}}>{t.label}</button>))}</div>

    {editTab==="sections"&&(<div><p style={{color:C.textMuted,fontSize:"13px",marginBottom:"16px"}}>Toggle sections on/off. Hidden sections won't appear in the tab bar.</p><div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{toggles.map(t=>(<div key={t.key} onClick={()=>toggleSection(t.key)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:C.card,borderRadius:"10px",border:`1px solid ${C.border}`,cursor:"pointer"}}><span style={{fontFamily:F.body,fontSize:"14px",color:C.text}}>{t.label}</span><div style={{width:"44px",height:"24px",borderRadius:"12px",background:settings[t.key]?C.green:C.border,display:"flex",alignItems:"center",padding:"2px",transition:"all 0.2s"}}><div style={{width:"20px",height:"20px",borderRadius:"10px",background:"white",transform:settings[t.key]?"translateX(20px)":"translateX(0)",transition:"all 0.2s"}}/></div></div>))}</div></div>)}

    {editTab==="general"&&(<div>{numFields.map((section,si)=>(<div key={si} style={{marginBottom:"20px"}}><div style={{fontFamily:F.mono,fontSize:"11px",color:C.textDim,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px"}}>{section.section}</div><div style={{display:"flex",flexDirection:"column",gap:"6px"}}>{section.items.map(item=>(<div key={item.key} style={{display:"flex",alignItems:"center",gap:"12px",padding:"8px 16px",background:C.card,borderRadius:"8px",border:`1px solid ${C.border}`}}><span style={{flex:1,fontFamily:F.body,fontSize:"14px",color:C.text}}>{item.label}</span><input type="number" step="0.01" value={settings[item.key]} onChange={e=>handleNum(item.key,e.target.value)} style={{width:"80px",padding:"6px 10px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:"6px",color:C.accent,fontFamily:F.mono,fontSize:"14px",textAlign:"right",outline:"none"}}/></div>))}</div></div>))}</div>)}

    {editTab==="quiz"&&(<div><p style={{color:C.textMuted,fontSize:"13px",marginBottom:"16px"}}>Edit, add or remove quiz questions. Correct answer is highlighted green.</p>{quizQs.map((q,qi)=>(<div key={qi} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"16px",marginBottom:"12px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}><span style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim}}>Q{qi+1}</span><button onClick={()=>removeQ(qi)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontFamily:F.mono,fontSize:"12px"}}>✕ Remove</button></div>
      <input value={q.q} onChange={e=>updateQ(qi,"q",e.target.value)} style={{...inputStyle,marginBottom:"8px",fontWeight:600}} placeholder="Question text"/>
      {q.options.map((o,oi)=>(<div key={oi} style={{display:"flex",gap:"8px",marginBottom:"4px",alignItems:"center"}}><button onClick={()=>updateQ(qi,"correct",oi)} style={{width:"28px",height:"28px",borderRadius:"6px",border:`1px solid ${q.correct===oi?C.green:C.border}`,background:q.correct===oi?C.greenDim:"transparent",color:q.correct===oi?C.green:C.textDim,fontFamily:F.mono,fontSize:"12px",cursor:"pointer",flexShrink:0}}>{String.fromCharCode(65+oi)}</button><input value={o} onChange={e=>updateQOption(qi,oi,e.target.value)} style={inputStyle}/></div>))}
      <input value={q.explanation} onChange={e=>updateQ(qi,"explanation",e.target.value)} style={{...inputStyle,marginTop:"8px"}} placeholder="Explanation shown after answering"/>
    </div>))}<button onClick={addQ} style={{...btn,background:C.card,color:C.accent,border:`1px solid ${C.accent}`,width:"100%",marginTop:"8px"}}>+ Add question</button></div>)}

    {editTab==="jargon"&&(<div><p style={{color:C.textMuted,fontSize:"13px",marginBottom:"16px"}}>Edit, add or remove jargon terms.</p>{jargonTs.map((t,ti)=>(<div key={ti} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"16px",marginBottom:"12px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}><span style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim}}>Term {ti+1}</span><button onClick={()=>removeJ(ti)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontFamily:F.mono,fontSize:"12px"}}>✕ Remove</button></div>
      <div style={{display:"flex",gap:"8px",marginBottom:"8px"}}><input value={t.term} onChange={e=>updateJ(ti,"term",e.target.value)} style={{...inputStyle,fontWeight:600}} placeholder="Term"/><input value={t.category} onChange={e=>updateJ(ti,"category",e.target.value)} style={{...inputStyle,width:"120px"}} placeholder="Category"/></div>
      <textarea value={t.plain} onChange={e=>updateJ(ti,"plain",e.target.value)} rows={2} style={{...inputStyle,resize:"vertical"}} placeholder="Plain English definition"/>
    </div>))}<button onClick={addJ} style={{...btn,background:C.card,color:C.accent,border:`1px solid ${C.accent}`,width:"100%",marginTop:"8px"}}>+ Add term</button></div>)}
  </div>);
}

// ═══════════════════════════════════════════════════════
// QUIZ PAGE
// ═══════════════════════════════════════════════════════
function QuizPage({userName,isPresenter,quizQs}) {
  const [cur,setCur]=useState(0);const [sel,setSel]=useState(null);const [score,setScore]=useState(0);
  const [ans,setAns]=useState(false);const [done,setDone]=useState(false);
  const [submitted,setSubmitted]=useState(false);const [submitting,setSubmitting]=useState(false);
  const [submitError,setSubmitError]=useState(null);
  const [showBoard,setShowBoard]=useState(false);const [scores,setScores]=useState([]);
  const [loading,setLoading]=useState(false);const [pCount,setPCount]=useState(0);
  const q=quizQs[cur]||quizQs[0];
  const pick=(i)=>{if(ans)return;setSel(i);setAns(true);if(i===q.correct)setScore(s=>s+1);};
  const next=()=>{if(cur<quizQs.length-1){setCur(c=>c+1);setSel(null);setAns(false);}else setDone(true);};
  useEffect(()=>{if(!isPresenter)return;const unsub=onScoresChanged((e)=>{setPCount(e.length);setScores(e);});return()=>{if(typeof unsub==='function')unsub();};},[isPresenter]);
  const handleSubmit=async()=>{setSubmitting(true);setSubmitError(null);try{await submitQuizScore(userName,score,quizQs.length);setSubmitted(true);}catch(e){setSubmitError(e.message||"Failed");}setSubmitting(false);};
  const reveal=async()=>{setLoading(true);try{const e=await loadAllScores();setScores(e);setPCount(e.length);}catch(e){}setLoading(false);setShowBoard(true);};
  const handleClear=async()=>{try{await clearAllScores();}catch(e){}setScores([]);setPCount(0);setShowBoard(false);};
  const restart=()=>{setCur(0);setSel(null);setScore(0);setAns(false);setDone(false);setSubmitted(false);setSubmitError(null);};

  if(showBoard&&isPresenter)return(<Leaderboard title="Quiz Leaderboard" entries={scores} columns={[{label:"Score",val:e=>e.score,fmt:e=>`${e.score}/${e.total}`},{label:"%",val:e=>Math.round(e.score/e.total*100),fmt:e=>`${Math.round(e.score/e.total*100)}%`}]} onBack={()=>setShowBoard(false)} onRefresh={reveal} onClear={handleClear}/>);

  if(done){const pct=Math.round((score/quizQs.length)*100);return(<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:"64px",marginBottom:"16px"}}>{pct>=80?"🏆":pct>=50?"👍":"📚"}</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"32px",margin:"0 0 8px"}}>{score}/{quizQs.length}</h2><p style={{color:C.textMuted,fontSize:"16px",marginBottom:"32px"}}>{pct>=80?"Excellent!":pct>=50?"Good start!":"That's what this session is for!"}</p>
    {!isPresenter&&!submitted&&!submitError&&<button onClick={handleSubmit} disabled={submitting} style={{...btn,marginBottom:"12px",opacity:submitting?0.6:1}}>{submitting?"Submitting...":"Submit score to leaderboard"}</button>}
    {!isPresenter&&submitError&&<div style={{padding:"16px 20px",background:C.redDim,border:`1px solid ${C.red}`,borderRadius:"12px",marginBottom:"16px"}}><span style={{color:C.red,fontSize:"14px",display:"block",marginBottom:"8px"}}>⚠ {submitError}</span><button onClick={handleSubmit} disabled={submitting} style={{...btn,background:C.red,fontSize:"13px",padding:"8px 16px"}}>Try again</button></div>}
    {!isPresenter&&submitted&&<div style={{padding:"16px",background:C.greenDim,border:`1px solid ${C.green}`,borderRadius:"12px",marginBottom:"16px",display:"inline-block"}}><span style={{color:C.green,fontSize:"15px"}}>✓ Submitted!</span></div>}
    {isPresenter&&(<div style={{display:"flex",flexDirection:"column",gap:"12px",alignItems:"center"}}><div style={{padding:"12px 20px",background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"12px"}}><span style={{color:C.amber,fontFamily:F.mono,fontSize:"14px"}}>📊 {pCount} submitted (live)</span></div><button onClick={reveal} style={{...btn,fontSize:"18px",padding:"18px 36px"}}>{loading?"Loading...":"🏆 Reveal Leaderboard"}</button></div>)}
    <div style={{marginTop:"16px"}}><button onClick={restart} style={{...btn,background:"transparent",color:C.textMuted,border:`1px solid ${C.border}`,fontSize:"13px",padding:"10px 20px"}}>Retake</button></div></div>);}

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"32px"}}><span style={{color:C.textDim,fontFamily:F.mono,fontSize:"13px"}}>Q{cur+1}/{quizQs.length}</span><span style={{color:C.accent,fontFamily:F.mono,fontSize:"13px"}}>SCORE: {score}</span></div>
    <div style={{display:"flex",gap:"6px",marginBottom:"32px"}}>{quizQs.map((_,i)=><div key={i} style={{flex:1,height:"4px",borderRadius:"2px",background:i<cur?C.accent:i===cur?C.accentDim:C.border}}/>)}</div>
    <h3 style={{fontFamily:F.display,color:C.text,fontSize:"24px",margin:"0 0 28px",lineHeight:1.3}}>{q.q}</h3>
    <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"24px"}}>{q.options.map((o,i)=>{let bg=C.card,bd=C.border;if(ans){if(i===q.correct){bg=C.greenDim;bd=C.green;}else if(i===sel){bg=C.redDim;bd=C.red;}}return(<button key={i} onClick={()=>pick(i)} style={{padding:"16px 20px",background:bg,border:`1px solid ${bd}`,borderRadius:"12px",color:C.text,fontFamily:F.body,fontSize:"15px",cursor:ans?"default":"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:"12px"}}><span style={{width:"28px",height:"28px",borderRadius:"8px",background:ans&&i===q.correct?C.green:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontFamily:F.mono,color:ans&&i===q.correct?"#000":C.textMuted,flexShrink:0}}>{String.fromCharCode(65+i)}</span>{o}</button>);})}</div>
    {ans&&<div style={{background:sel===q.correct?C.greenDim:C.amberDim,border:`1px solid ${sel===q.correct?C.green:C.amber}`,borderRadius:"12px",padding:"16px 20px",marginBottom:"20px"}}><strong style={{color:sel===q.correct?C.green:C.amber}}>{sel===q.correct?"Correct! ✓":"Not quite ✗"}</strong><p style={{color:C.text,margin:"8px 0 0",fontSize:"14px",lineHeight:1.5}}>{q.explanation}</p></div>}
    {ans&&<button onClick={next} style={btn}>{cur<quizQs.length-1?"Next →":"See results"}</button>}
    {isPresenter&&<div style={{marginTop:"24px",padding:"12px 16px",background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"10px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}><span style={{color:C.amber,fontFamily:F.mono,fontSize:"13px"}}>🎙 {pCount} submitted</span><button onClick={reveal} style={{...btn,fontSize:"13px",padding:"8px 16px"}}>Leaderboard</button></div>}
  </div>);
}

// ═══════════════════════════════════════════════════════
// JARGON BUSTER
// ═══════════════════════════════════════════════════════
function JargonPage({jargonTs}) {
  const [idx,setIdx]=useState(0);const [revealed,setRevealed]=useState(false);const [done,setDone]=useState(false);
  const term=jargonTs[idx]||jargonTs[0];
  if(done)return(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:"64px",marginBottom:"16px"}}>🎓</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 12px"}}>Jargon Busted!</h2><p style={{color:C.textMuted,fontSize:"15px",marginBottom:"32px"}}>{jargonTs.length} terms covered.</p><button onClick={()=>{setIdx(0);setRevealed(false);setDone(false);}} style={btn}>Go again</button></div>);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"24px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textDim}}>TERM {idx+1}/{jargonTs.length}</span><span style={{fontFamily:F.mono,fontSize:"12px",color:C.purple,background:C.purpleDim,padding:"4px 10px",borderRadius:"6px"}}>{term.category}</span></div>
    <div style={{display:"flex",gap:"6px",marginBottom:"32px"}}>{jargonTs.map((_,i)=><div key={i} style={{flex:1,height:"4px",borderRadius:"2px",background:i<idx?C.purple:i===idx?C.purpleDim:C.border}}/>)}</div>
    <div style={{background:`linear-gradient(135deg, ${C.card} 0%, #1a1a2e 100%)`,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"40px 32px",textAlign:"center",marginBottom:"24px",minHeight:"200px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,marginBottom:"12px",letterSpacing:"2px",textTransform:"uppercase"}}>{revealed?"In plain English":"What does this mean?"}</div>
      <h2 style={{fontFamily:F.display,fontSize:"42px",color:C.text,margin:"0 0 20px"}}>{term.term}</h2>
      {revealed?<p style={{color:C.text,fontSize:"17px",lineHeight:1.6,maxWidth:"500px",margin:0}}>{term.plain}</p>:<p style={{color:C.textDim,fontSize:"15px",fontStyle:"italic",margin:0}}>Ask the audience…</p>}
    </div>
    <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
      {!revealed&&<button onClick={()=>setRevealed(true)} style={{...btn,fontSize:"16px",padding:"16px 32px"}}>Reveal</button>}
      {revealed&&<button onClick={()=>{if(idx<jargonTs.length-1){setIdx(i=>i+1);setRevealed(false);}else setDone(true);}} style={{...btn,fontSize:"16px",padding:"16px 32px"}}>{idx<jargonTs.length-1?"Next →":"Finish"}</button>}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════
// PORTFOLIO SIM (with leaderboard)
// ═══════════════════════════════════════════════════════
function PortfolioPage({settings:s,userName,isPresenter}) {
  const fDefs={Market:{color:C.accent,desc:"Pure passive — whole market",fee:s.passiveFee,ret:s.marketReturn,vol:s.marketVol},Value:{color:C.green,desc:"Cheap, undervalued stocks",fee:s.factorFee,ret:s.valueReturn,vol:s.valueVol},Momentum:{color:C.amber,desc:"Stocks with recent strong performance",fee:s.factorFee,ret:s.momentumReturn,vol:s.momentumVol},Quality:{color:C.purple,desc:"Profitable, stable companies",fee:s.factorFee,ret:s.qualityReturn,vol:s.qualityVol},"Small Cap":{color:C.red,desc:"Smaller companies for growth",fee:s.factorFee,ret:s.smallCapReturn,vol:s.smallCapVol}};
  const gData=useMemo(()=>({Market:genGrowth(42,s.marketVol,s.marketReturn),Value:genGrowth(99,s.valueVol,s.valueReturn),Momentum:genGrowth(17,s.momentumVol,s.momentumReturn),Quality:genGrowth(73,s.qualityVol,s.qualityReturn),"Small Cap":genGrowth(55,s.smallCapVol,s.smallCapReturn)}),[s.marketReturn,s.valueReturn,s.momentumReturn,s.qualityReturn,s.smallCapReturn,s.marketVol,s.valueVol,s.momentumVol,s.qualityVol,s.smallCapVol]);
  const [alloc,setAlloc]=useState({Market:60,Value:20,Momentum:10,Quality:10,"Small Cap":0});
  const [show,setShow]=useState(false);
  const [submitted,setSubmitted]=useState(false);const [submitting,setSubmitting]=useState(false);
  const [showBoard,setShowBoard]=useState(false);const [portfolios,setPortfolios]=useState([]);const [pCount,setPCount]=useState(0);
  const total=Object.values(alloc).reduce((a,b)=>a+b,0);
  const adj=(f,d)=>{setAlloc({...alloc,[f]:Math.max(0,Math.min(100,alloc[f]+d))});setShow(false);setSubmitted(false);};
  const blended=gData.Market.map((_,i)=>{let v=0;Object.keys(alloc).forEach(f=>v+=(alloc[f]/100)*gData[f][i].value);return{month:gData.Market[i].month,value:Math.round(v*100)/100};});
  const fee=Object.keys(alloc).reduce((a,f)=>a+(alloc[f]/100)*fDefs[f].fee,0);
  const fv=blended[blended.length-1]?.value||1000;
  const ret=((fv-1000)/1000)*100;

  // Calculate volatility
  const calcVol=(data)=>{const r=[];for(let i=1;i<data.length;i++)r.push((data[i].value-data[i-1].value)/data[i-1].value);const avg=r.reduce((a,b)=>a+b,0)/r.length;return Math.sqrt(r.reduce((a,x)=>a+Math.pow(x-avg,2),0)/(r.length-1))*Math.sqrt(12)*100;};
  const annVol=show?calcVol(blended).toFixed(1):"";
  const mktVol=show?calcVol(gData.Market).toFixed(1):"";
  const sharpe=show?((ret/20-2)/(parseFloat(annVol)||1)).toFixed(2):""; // Simplified: (ann return - 2% risk-free) / vol

  useEffect(()=>{if(!isPresenter)return;const unsub=onPortfoliosChanged((e)=>{setPCount(e.length);setPortfolios(e);});return()=>{if(typeof unsub==='function')unsub();};},[isPresenter]);
  const handleSubmitPortfolio=async()=>{setSubmitting(true);try{await submitPortfolio({name:userName,alloc:{...alloc},finalValue:Math.round(fv),totalReturn:Math.round(ret*10)/10,fee:Math.round(fee*100)/100,volatility:parseFloat(annVol),sharpe:parseFloat(sharpe)});setSubmitted(true);}catch(e){}setSubmitting(false);};
  const reveal=async()=>{try{const e=await loadAllPortfolios();setPortfolios(e);setPCount(e.length);}catch(e){}setShowBoard(true);};

  if(showBoard&&isPresenter)return(<Leaderboard title="Portfolio Leaderboard" entries={portfolios} columns={[{label:"Return",val:e=>e.totalReturn,fmt:e=>`${e.totalReturn}%`},{label:"Fee",val:e=>-e.fee,fmt:e=>`${e.fee}%`},{label:"Vol",val:e=>-e.volatility,fmt:e=>`${e.volatility}%`},{label:"Sharpe",val:e=>e.sharpe,fmt:e=>e.sharpe?.toFixed(2)||"—"}]} onBack={()=>setShowBoard(false)} onRefresh={reveal} onClear={async()=>{await clearAllPortfolios();setPortfolios([]);setPCount(0);setShowBoard(false);}}/>);

  return(<div>
    <p style={{color:C.textMuted,fontSize:"14px",marginBottom:"28px",lineHeight:1.5}}>Build your portfolio from £1,000. Allocations should total 100%.</p>
    <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"24px"}}>{Object.keys(alloc).map(f=>(<div key={f} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`}}><div style={{width:"10px",height:"10px",borderRadius:"3px",background:fDefs[f].color,flexShrink:0}}/><div style={{flex:1}}><div style={{fontFamily:F.body,fontWeight:600,color:C.text,fontSize:"14px"}}>{f} <span style={{fontFamily:F.mono,fontSize:"11px",color:C.textDim,fontWeight:400}}>({fDefs[f].ret}% / {fDefs[f].vol}% vol)</span></div><div style={{color:C.textDim,fontSize:"12px"}}>{fDefs[f].desc}</div></div><div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}><button onClick={()=>adj(f,-10)} style={sBtn}>−</button><span style={{fontFamily:F.mono,color:C.text,fontSize:"16px",width:"45px",textAlign:"center"}}>{alloc[f]}%</span><button onClick={()=>adj(f,10)} style={sBtn}>+</button></div></div>))}</div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:total===100?C.green:C.red}}>Total: {total}%{total!==100?" (needs 100%)":" ✓"}</span><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textDim}}>Fee: {fee.toFixed(2)}%</span></div>
    <button onClick={()=>setShow(true)} disabled={total!==100} style={{...btn,opacity:total!==100?0.4:1}}>Simulate 20 years →</button>
    {show&&total===100&&(<div style={{marginTop:"28px"}}>
      <div style={{display:"flex",gap:"16px",marginBottom:"20px",flexWrap:"wrap"}}><Stat label="Final value" value={`£${Math.round(fv).toLocaleString()}`} sub="from £1,000" color={C.accent}/><Stat label="Return" value={`${ret.toFixed(0)}%`} sub="20 years" color={C.green}/><Stat label="Fee" value={`${fee.toFixed(2)}%`} sub="p.a." color={C.amber}/><Stat label="Volatility" value={`${annVol}%`} sub={`vs ${mktVol}% passive`} color={C.purple}/></div>
      <div style={{background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"20px"}}><BigChart datasets={[{data:blended,color:C.accent},{data:gData.Market,color:C.textDim}]}/><div style={{display:"flex",gap:"20px",marginTop:"12px",justifyContent:"center"}}><Legend color={C.accent} label="Your portfolio"/><Legend color={C.textDim} label="Pure passive"/></div></div>
      <div style={{marginTop:"20px",display:"flex",gap:"12px",flexWrap:"wrap"}}>
        {!isPresenter&&!submitted&&<button onClick={handleSubmitPortfolio} disabled={submitting} style={{...btn,opacity:submitting?0.6:1}}>{submitting?"Submitting...":"Submit to leaderboard"}</button>}
        {!isPresenter&&submitted&&<span style={{color:C.green,fontFamily:F.mono,fontSize:"14px",padding:"14px"}}>✓ Portfolio submitted!</span>}
        {isPresenter&&<><span style={{color:C.amber,fontFamily:F.mono,fontSize:"13px",padding:"14px"}}>📊 {pCount} submitted</span><button onClick={reveal} style={{...btn,fontSize:"13px",padding:"10px 20px"}}>🏆 Leaderboard</button></>}
      </div>
    </div>)}
  </div>);
}

// ═══════════════════════════════════════════════════════
// FEE EXPLORER (real MSCI ACWI data + multiple fee lines)
// ═══════════════════════════════════════════════════════
function FeeCalcPage({settings:s}) {
  const years=Object.keys(MSCI_ACWI_RETURNS).map(Number).sort();
  const startYear=2000;
  const [feeLines,setFeeLines]=useState([{label:"Passive",rate:s.passiveFee,color:C.accent},{label:"Active",rate:s.activeFee,color:C.red}]);
  const [newLabel,setNewLabel]=useState("");const [newRate,setNewRate]=useState("");

  const addFee=()=>{if(newLabel&&newRate){const colors=[C.amber,C.purple,C.green,"#f472b6","#fb923c"];setFeeLines([...feeLines,{label:newLabel,rate:parseFloat(newRate),color:colors[(feeLines.length-1)%colors.length]}]);setNewLabel("");setNewRate("");}};
  const removeFee=(i)=>{if(feeLines.length>1)setFeeLines(feeLines.filter((_,j)=>j!==i));};

  const availableYears=years.filter(y=>y>=startYear);
  const xLabelYears=availableYears.filter(y=>y%5===0);

  // Calculate growth for each fee line
  const datasets=feeLines.map(fl=>{
    let val=10000;const data=[{value:val}];
    for(const y of availableYears){
      const ret=MSCI_ACWI_RETURNS[y]/100;
      val=val*(1+ret)*(1-fl.rate/100);
      data.push({value:Math.round(val)});
    }
    return{data,color:fl.color,label:fl.label,finalValue:Math.round(val),xLabels:[String(startYear),...availableYears.map(y=>xLabelYears.includes(y)?String(y):"")]};
  });
  // Also pure (no fee) line
  let pureVal=10000;const pureData=[{value:pureVal}];
  for(const y of availableYears){pureVal=pureVal*(1+MSCI_ACWI_RETURNS[y]/100);pureData.push({value:Math.round(pureVal)});}

  const allDatasets=[{data:pureData,color:C.textDim,opacity:0.4,xLabels:[String(startYear),...availableYears.map(y=>xLabelYears.includes(y)?String(y):"")]},...datasets];

  return(<div>
    <p style={{color:C.textMuted,fontSize:"14px",marginBottom:"20px",lineHeight:1.5}}>Real MSCI ACWI annual returns ({startYear}–{availableYears[availableYears.length-1]}) applied to £10,000. See how different fee levels eat into actual historical growth.</p>

    <div style={{marginBottom:"20px"}}><span style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim}}>FEE LINES</span>
      <div style={{display:"flex",flexDirection:"column",gap:"6px",marginTop:"8px"}}>{feeLines.map((fl,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",background:C.card,borderRadius:"8px",border:`1px solid ${C.border}`}}><div style={{width:"12px",height:"12px",borderRadius:"3px",background:fl.color,flexShrink:0}}/><span style={{flex:1,fontFamily:F.body,fontSize:"13px",color:C.text}}>{fl.label}</span><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textMuted}}>{fl.rate}%</span><span style={{fontFamily:F.mono,fontSize:"13px",color:fl.color,fontWeight:700}}>→ £{datasets[i]?.finalValue?.toLocaleString()}</span><button onClick={()=>removeFee(i)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:"14px"}}>✕</button></div>))}
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}><input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Label" style={{...inputStyle,width:"120px"}}/><input value={newRate} onChange={e=>setNewRate(e.target.value)} placeholder="Fee %" type="number" step="0.01" style={{...inputStyle,width:"80px"}}/><button onClick={addFee} style={{...btn,fontSize:"12px",padding:"8px 14px"}}>+ Add</button></div>
      </div>
    </div>

    <div style={{background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"20px",marginBottom:"20px"}}><BigChart datasets={allDatasets} yPrefix="£"/><div style={{display:"flex",gap:"16px",marginTop:"12px",justifyContent:"center",flexWrap:"wrap"}}><Legend color={C.textDim} label="No fees"/>{feeLines.map((fl,i)=><Legend key={i} color={fl.color} label={`${fl.label} (${fl.rate}%)`}/>)}</div></div>

    <div style={{background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"12px",padding:"16px 20px"}}><p style={{color:C.text,fontSize:"14px",margin:0,lineHeight:1.5}}><strong style={{color:C.amber}}>Key takeaway:</strong> From {startYear} to {availableYears[availableYears.length-1]}, £10,000 with no fees would be <strong>£{Math.round(pureVal).toLocaleString()}</strong>. The difference between {feeLines[0]?.label} ({feeLines[0]?.rate}%) and {feeLines[feeLines.length-1]?.label} ({feeLines[feeLines.length-1]?.rate}%) is <strong>£{Math.abs((datasets[0]?.finalValue||0)-(datasets[datasets.length-1]?.finalValue||0)).toLocaleString()}</strong>.</p></div>
  </div>);
}

// ═══════════════════════════════════════════════════════
// PIZZA TEST
// ═══════════════════════════════════════════════════════
function PizzaPage({settings:s}) {
  const [amount,setAmount]=useState(50000);const [years,setYears]=useState(30);
  const pc=s.pizzaCost; const gr=s.defaultGrowthRate/100;
  const feeTypes=[{label:"Passive",rate:s.passiveFee,color:C.accent,emoji:"📈"},{label:"Active",rate:s.activeFee,color:C.red,emoji:"👔"}];
  const calcFees=(p,r,y)=>{let total=0,v=p;for(let i=0;i<y;i++){const fee=v*(r/100);total+=fee;v=v*(1+gr)-fee;}return total;};
  const results=feeTypes.map(f=>{const tf=calcFees(amount,f.rate,years);return{...f,totalFees:tf,pizzas:Math.round(tf/pc),ppw:(Math.round(tf/pc)/(years*52)).toFixed(1)};});
  const feeDiff=results[results.length-1].totalFees-results[0].totalFees;
  return(<div>
    <p style={{color:C.textMuted,fontSize:"14px",marginBottom:"12px",lineHeight:1.5}}>Let's convert fees into something tangible — pizzas. 🍕</p>
    <div style={{background:C.purpleDim,border:`1px solid ${C.purple}40`,borderRadius:"10px",padding:"12px 16px",marginBottom:"28px"}}><span style={{color:C.text,fontFamily:F.body,fontSize:"13px"}}>🍕 Using <strong style={{color:C.purple}}>£{pc.toFixed(2)}</strong> per pizza — roughly a decent takeaway Margherita in the UK.</span></div>
    <div style={{display:"flex",gap:"16px",marginBottom:"32px",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:"200px"}}><label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px"}}>PORTFOLIO</label><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{[25000,50000,100000,250000,500000].map(v=><button key={v} onClick={()=>setAmount(v)} style={{...chip,background:amount===v?C.accentDim:C.card,borderColor:amount===v?C.accent:C.border,color:amount===v?C.accent:C.textMuted}}>£{(v/1000)}k</button>)}</div></div>
      <div style={{flex:1,minWidth:"200px"}}><label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px"}}>YEARS</label><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{[10,20,30,40].map(v=><button key={v} onClick={()=>setYears(v)} style={{...chip,background:years===v?C.accentDim:C.card,borderColor:years===v?C.accent:C.border,color:years===v?C.accent:C.textMuted}}>{v}y</button>)}</div></div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:"16px",marginBottom:"24px"}}>{results.map((r,i)=>(<div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"20px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}><div><span style={{fontSize:"18px",marginRight:"8px"}}>{r.emoji}</span><span style={{fontFamily:F.body,fontWeight:600,color:C.text}}>{r.label}</span><span style={{fontFamily:F.mono,color:C.textDim,fontSize:"13px",marginLeft:"8px"}}>{r.rate}%</span></div><span style={{fontFamily:F.mono,color:r.color,fontSize:"18px",fontWeight:700}}>£{Math.round(r.totalFees).toLocaleString()}</span></div><div style={{display:"flex",alignItems:"center",gap:"12px"}}><div style={{fontSize:"32px"}}>🍕</div><div><div style={{fontFamily:F.mono,color:C.text,fontSize:"20px",fontWeight:700}}>{r.pizzas.toLocaleString()} pizzas</div><div style={{fontFamily:F.mono,color:C.textDim,fontSize:"13px"}}>{r.ppw} pizzas/week for {years} years</div></div></div></div>))}</div>
    <div style={{background:`linear-gradient(135deg, ${C.redDim} 0%, rgba(248,113,113,0.05) 100%)`,border:`1px solid ${C.red}40`,borderRadius:"16px",padding:"24px",textAlign:"center"}}><p style={{color:C.text,fontSize:"16px",margin:"0 0 8px"}}>Switching from active to passive saves you</p><div style={{fontFamily:F.mono,color:C.red,fontSize:"36px",fontWeight:700,marginBottom:"8px"}}>£{Math.round(feeDiff).toLocaleString()}</div><p style={{color:C.textMuted,fontSize:"15px",margin:0}}>That's <strong style={{color:C.amber}}>{Math.round(feeDiff/pc).toLocaleString()} fewer pizzas</strong> for your fund manager 🍕</p></div>
  </div>);
}

// ═══════════════════════════════════════════════════════
// PICK THE FUND
// ═══════════════════════════════════════════════════════
function PickFundPage({settings:s}) {
  const [round,setRound]=useState(0);const [guess,setGuess]=useState(null);const [score,setScore]=useState(0);const [done,setDone]=useState(false);
  const pair=fundPairs[round];
  const getParams=(type)=>{if(type.includes("Passive"))return{vol:s.marketVol,ret:s.marketReturn};if(type.includes("Value"))return{vol:s.valueVol,ret:s.valueReturn};if(type.includes("Momentum"))return{vol:s.momentumVol,ret:s.momentumReturn};return{vol:s.qualityVol,ret:s.qualityReturn};};
  const aP=getParams(pair.aType),bP=getParams(pair.bType);
  const aData=useMemo(()=>genGrowth(pair.aSeed,aP.vol,aP.ret),[pair.aSeed,aP.vol,aP.ret]);
  const bData=useMemo(()=>genGrowth(pair.bSeed,bP.vol,bP.ret),[pair.bSeed,bP.vol,bP.ret]);
  const pick=(w)=>{setGuess(w);if((w==="a"&&pair.aType.includes("Passive"))||(w==="b"&&pair.bType.includes("Passive")))setScore(s=>s+1);};
  const next=()=>{if(round<fundPairs.length-1){setRound(r=>r+1);setGuess(null);}else setDone(true);};
  const restart=()=>{setRound(0);setGuess(null);setScore(0);setDone(false);};
  const calcVol=(data)=>{const r=[];for(let i=1;i<data.length;i++)r.push((data[i].value-data[i-1].value)/data[i-1].value);const avg=r.reduce((a,b)=>a+b,0)/r.length;return(Math.sqrt(r.reduce((a,x)=>a+Math.pow(x-avg,2),0)/(r.length-1))*Math.sqrt(12)*100).toFixed(1);};
  if(done)return(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:"64px",marginBottom:"16px"}}>{score===fundPairs.length?"🎯":"🤔"}</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 8px"}}>{score}/{fundPairs.length} right</h2><p style={{color:C.textMuted,fontSize:"15px",marginBottom:"32px"}}>{score===fundPairs.length?"Perfect!":"Surprisingly tricky — that's the point!"}</p><button onClick={restart} style={btn}>Play again</button></div>);
  const funds={a:{data:aData,label:"Fund A",type:pair.aType},b:{data:bData,label:"Fund B",type:pair.bType}};
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"24px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textDim}}>ROUND {round+1}/{fundPairs.length}</span><span style={{fontFamily:F.mono,fontSize:"13px",color:C.accent}}>SCORE: {score}</span></div>
    <h3 style={{fontFamily:F.display,color:C.text,fontSize:"22px",margin:"0 0 8px"}}>Which is the passive fund?</h3>
    <p style={{color:C.textMuted,fontSize:"13px",marginBottom:"24px"}}>Hint: look at how smooth or jagged the line is.</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"24px"}}>{["a","b"].map(k=>{const f=funds[k];let bd=C.border,bg=C.card;if(guess){if(f.type.includes("Passive")){bd=C.green;bg=C.greenDim;}else{bd=C.amber;bg=C.amberDim;}}const vol=calcVol(f.data);return(<div key={k} onClick={()=>!guess&&pick(k)} style={{background:bg,border:`2px solid ${bd}`,borderRadius:"12px",padding:"20px",cursor:guess?"default":"pointer"}}><div style={{fontFamily:F.mono,color:C.textMuted,fontSize:"13px",marginBottom:"12px"}}>{f.label}{guess&&<span style={{color:f.type.includes("Passive")?C.green:C.amber,marginLeft:"8px",fontWeight:600}}>— {f.type}</span>}</div><MiniChart data={f.data} color={guess?(f.type.includes("Passive")?C.green:C.amber):C.accent} width={300} height={140}/><div style={{display:"flex",justifyContent:"space-between",marginTop:"10px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:C.text}}>£{Math.round(f.data[f.data.length-1].value).toLocaleString()}</span>{guess&&<span style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim}}>Vol: {vol}%</span>}</div></div>);})}</div>
    {guess&&<><div style={{background:C.accentDim,border:`1px solid ${C.accent}`,borderRadius:"12px",padding:"16px 20px",marginBottom:"20px"}}><p style={{color:C.text,fontSize:"14px",margin:0,lineHeight:1.5}}><strong style={{color:C.accent}}>Insight:</strong> {pair.insight}</p></div><button onClick={next} style={btn}>{round<fundPairs.length-1?"Next →":"Results"}</button></>}
  </div>);
}

// ═══════════════════════════════════════════════════════
// DO NOTHING CHALLENGE (COVID — sell AND rebuy timing)
// ═══════════════════════════════════════════════════════
function DoNothingPage({userName,isPresenter}) {
  const [phase,setPhase]=useState("intro"); // intro, playing, inCash, sold-result, held-result
  const [weekIdx,setWeekIdx]=useState(0);
  const [soldWeek,setSoldWeek]=useState(null);const [boughtWeek,setBoughtWeek]=useState(null);
  const [dismissedPrompts,setDismissedPrompts]=useState(new Set());
  const [speed,setSpeed]=useState(200);const [paused,setPaused]=useState(false);
  const [submitted,setSubmitted]=useState(false);const [submitting,setSubmitting]=useState(false);
  const [showBoard,setShowBoard]=useState(false);const [timingScores,setTimingScores]=useState([]);const [tCount,setTCount]=useState(0);
  const timerRef=useRef(null);
  const weeks=covidData.weeks;const sellPrompts=covidData.sellPrompts;const buyPrompts=covidData.buyPrompts;
  const currentData=weeks.slice(0,weekIdx+1);
  const currentVal=weeks[weekIdx]?.value||100000;const startVal=100000;
  const change=((currentVal-startVal)/startVal*100).toFixed(1);
  const getDateLabel=(w)=>{const d=new Date(covidData.startDate.getTime()+w*7*86400000);return d.toLocaleDateString("en-GB",{month:"short",year:"numeric"});};

  // Determine if we're at a decision point (not yet dismissed)
  const isAtSellPrompt = phase==="playing" && sellPrompts.includes(weekIdx) && !dismissedPrompts.has(`sell-${weekIdx}`);
  const isAtBuyPrompt = phase==="inCash" && buyPrompts.includes(weekIdx) && !dismissedPrompts.has(`buy-${weekIdx}`);
  const isDecisionPoint = isAtSellPrompt || isAtBuyPrompt;

  const headline=weeks[weekIdx]?.headline;

  const startSim=()=>{setPhase("playing");setWeekIdx(0);setSoldWeek(null);setBoughtWeek(null);setPaused(false);setSubmitted(false);setDismissedPrompts(new Set());};

  useEffect(()=>{
    if((phase!=="playing"&&phase!=="inCash")||paused||isDecisionPoint)return;
    timerRef.current=setTimeout(()=>{
      if(weekIdx<weeks.length-1)setWeekIdx(w=>w+1);
      else setPhase(soldWeek!==null?(boughtWeek!==null?"rebought-result":"stayed-cash-result"):"held-result");
    },speed);
    return()=>clearTimeout(timerRef.current);
  },[weekIdx,phase,paused,isDecisionPoint,speed,dismissedPrompts]);

  const sell=()=>{setSoldWeek(weekIdx);setPhase("inCash");};
  const hold=()=>{setDismissedPrompts(prev=>{const s=new Set(prev);s.add(`sell-${weekIdx}`);return s;});};
  const buyBack=()=>{setBoughtWeek(weekIdx);setPhase("playing");};
  const stayInCash=()=>{setDismissedPrompts(prev=>{const s=new Set(prev);s.add(`buy-${weekIdx}`);return s;});};

  // Calculate final value based on decisions
  const calcFinalValue=()=>{
    const endVal=weeks[weeks.length-1].value;
    if(soldWeek===null)return endVal; // Held throughout
    const soldVal=weeks[soldWeek].value;
    if(boughtWeek===null)return soldVal; // Sold and never rebought — stuck with sell price
    // Sold at soldWeek, rebought at boughtWeek
    // Cash = soldVal during cash period, then growth from boughtWeek to end
    const boughtVal=weeks[boughtWeek].value;
    const growthAfterBuy=endVal/boughtVal;
    return Math.round(soldVal*growthAfterBuy);
  };

  useEffect(()=>{if(!isPresenter)return;const unsub=onTimingScoresChanged((e)=>{setTCount(e.length);setTimingScores(e);});return()=>{if(typeof unsub==='function')unsub();};},[isPresenter]);
  const handleSubmitTiming=async()=>{setSubmitting(true);try{const fv=calcFinalValue();await submitTimingScore({name:userName,soldWeek,boughtWeek,finalValue:fv,returnPct:Math.round((fv-startVal)/startVal*1000)/10,strategy:soldWeek===null?"Held":boughtWeek===null?"Sold & stayed out":`Sold wk${soldWeek}, rebought wk${boughtWeek}`});setSubmitted(true);}catch(e){}setSubmitting(false);};
  const revealTiming=async()=>{try{const e=await loadAllTimingScores();setTimingScores(e);setTCount(e.length);}catch(e){}setShowBoard(true);};

  const restart=()=>{setPhase("intro");setWeekIdx(0);setSoldWeek(null);setBoughtWeek(null);setSubmitted(false);setDismissedPrompts(new Set());};

  // LEADERBOARD
  if(showBoard&&isPresenter)return(<Leaderboard title="Market Timing Leaderboard" entries={timingScores} columns={[{label:"Final £",val:e=>e.finalValue,fmt:e=>`£${e.finalValue?.toLocaleString()}`},{label:"Return",val:e=>e.returnPct,fmt:e=>`${e.returnPct>0?"+":""}${e.returnPct}%`}]} onBack={()=>setShowBoard(false)} onRefresh={revealTiming} onClear={async()=>{await clearAllTimingScores();setTimingScores([]);setTCount(0);setShowBoard(false);}}/>);

  // INTRO
  if(phase==="intro")return(<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:"64px",marginBottom:"16px"}}>😰</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"28px",margin:"0 0 12px"}}>The "Do Nothing" Challenge</h2><p style={{color:C.textMuted,fontSize:"15px",maxWidth:"500px",margin:"0 auto 12px",lineHeight:1.6}}>It's <strong style={{color:C.accent}}>March 2020</strong>. You have <strong style={{color:C.accent}}>£100,000</strong> in the <strong style={{color:C.accent}}>MSCI ACWI</strong>. A pandemic is unfolding.</p><p style={{color:C.textMuted,fontSize:"15px",maxWidth:"500px",margin:"0 auto 12px",lineHeight:1.6}}>You'll be asked: <strong style={{color:C.amber}}>sell or hold?</strong> If you sell, you'll then decide <strong style={{color:C.green}}>when to buy back in</strong>. Can you time the market?</p><p style={{color:C.textDim,fontSize:"13px",maxWidth:"500px",margin:"0 auto 32px"}}>Based on MSCI ACWI. The index fell 34% peak-to-trough in 5 weeks.</p><button onClick={startSim} style={{...btn,fontSize:"18px",padding:"18px 40px"}}>Start →</button></div>);

  // RESULTS
  const showResults=(resultType)=>{
    const fv=calcFinalValue();const heldVal=weeks[weeks.length-1].value;
    const isGood=resultType==="held-result";
    const title=resultType==="held-result"?"💎 Diamond hands!":resultType==="stayed-cash-result"?"😱 You sold and stayed out!":"🔄 You tried to time it!";
    const message=resultType==="held-result"?"You held through a 34% crash. Time in the market wins.":resultType==="stayed-cash-result"?`You sold at ${getDateLabel(soldWeek)} and never bought back. The market recovered without you.`:`You sold at ${getDateLabel(soldWeek)} and bought back at ${getDateLabel(boughtWeek)}.`;
    return(<div>
      <div style={{textAlign:"center",marginBottom:"24px"}}><div style={{fontSize:"48px",marginBottom:"8px"}}>{isGood?"💎":"🔄"}</div><h2 style={{fontFamily:F.display,color:C.text,fontSize:"24px",margin:"0 0 8px"}}>{title}</h2></div>
      <div style={{background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"20px",marginBottom:"24px"}}><CrashChart data={weeks} soldWeek={soldWeek} boughtWeek={boughtWeek}/></div>
      <div style={{display:"flex",gap:"12px",marginBottom:"20px",flexWrap:"wrap"}}><Stat label="Your result" value={`£${fv.toLocaleString()}`} sub={`${((fv-startVal)/startVal*100).toFixed(1)}%`} color={fv>=startVal?C.green:C.red}/><Stat label="If held" value={`£${heldVal.toLocaleString()}`} sub={`+${((heldVal-startVal)/startVal*100).toFixed(1)}%`} color={C.green}/>{fv<heldVal&&<Stat label="Cost of timing" value={`£${(heldVal-fv).toLocaleString()}`} sub="left on the table" color={C.amber}/>}</div>
      <div style={{background:isGood?C.greenDim:C.amberDim,border:`1px solid ${isGood?C.green:C.amber}`,borderRadius:"12px",padding:"16px 20px",marginBottom:"20px"}}><p style={{color:C.text,fontSize:"14px",margin:0,lineHeight:1.6}}><strong style={{color:isGood?C.green:C.amber}}>{isGood?"The lesson:":"What happened:"}</strong> {message}</p></div>
      <div style={{display:"flex",gap:"12px",flexWrap:"wrap",alignItems:"center"}}>
        {!isPresenter&&!submitted&&<button onClick={handleSubmitTiming} disabled={submitting} style={{...btn,opacity:submitting?0.6:1}}>{submitting?"Submitting...":"Submit to leaderboard"}</button>}
        {!isPresenter&&submitted&&<span style={{color:C.green,fontFamily:F.mono,fontSize:"14px"}}>✓ Submitted!</span>}
        {isPresenter&&<><span style={{color:C.amber,fontFamily:F.mono,fontSize:"13px"}}>📊 {tCount} submitted</span><button onClick={revealTiming} style={{...btn,fontSize:"13px",padding:"10px 20px"}}>🏆 Leaderboard</button></>}
        <button onClick={restart} style={{...btn,background:C.card,color:C.text,border:`1px solid ${C.border}`}}>Try again</button>
      </div>
    </div>);
  };

  if(phase==="held-result"||phase==="sold-result"||phase==="stayed-cash-result"||phase==="rebought-result")return showResults(phase);
  // Check if we've reached the end while in cash
  if(phase==="inCash"&&weekIdx>=weeks.length-1&&!showBoard){setPhase("stayed-cash-result");return null;}
  if(phase==="playing"&&weekIdx>=weeks.length-1&&soldWeek!==null&&boughtWeek!==null&&!showBoard){setPhase("rebought-result");return null;}

  // PLAYING / IN CASH
  const inCash=phase==="inCash";
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}><span style={{fontFamily:F.mono,fontSize:"13px",color:C.textDim}}>{getDateLabel(weekIdx)} — Week {weekIdx+1}/{weeks.length}</span><div style={{display:"flex",gap:"8px",alignItems:"center"}}>{inCash&&<span style={{fontFamily:F.mono,fontSize:"11px",color:C.amber,background:C.amberDim,padding:"4px 10px",borderRadius:"6px"}}>💰 IN CASH</span>}<span style={{fontFamily:F.mono,fontSize:"11px",color:C.textDim}}>SPEED:</span>{[{l:"1x",v:300},{l:"2x",v:150},{l:"4x",v:75}].map(sp=><button key={sp.l} onClick={()=>setSpeed(sp.v)} style={{...chip,padding:"4px 10px",fontSize:"11px",background:speed===sp.v?C.accentDim:C.card,borderColor:speed===sp.v?C.accent:C.border,color:speed===sp.v?C.accent:C.textMuted}}>{sp.l}</button>)}</div></div>
    <div style={{display:"flex",gap:"20px",marginBottom:"20px",flexWrap:"wrap"}}><Stat label={inCash?"Cash value":"Portfolio"} value={inCash?`£${weeks[soldWeek].value.toLocaleString()}`:`£${currentVal.toLocaleString()}`} color={inCash?C.amber:(currentVal>=startVal?C.green:C.red)}/>{!inCash&&<Stat label="Change" value={`${parseFloat(change)>0?"+":""}${change}%`} color={parseFloat(change)>=0?C.green:C.red}/>}{inCash&&<Stat label="Market now" value={`£${currentVal.toLocaleString()}`} sub={currentVal>weeks[soldWeek].value?"Market above your exit":"Still below your exit"} color={currentVal>weeks[soldWeek].value?C.red:C.green}/>}</div>
    <div style={{background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"16px",marginBottom:"16px"}}><CrashChart data={currentData} soldWeek={soldWeek} boughtWeek={boughtWeek}/></div>
    {headline&&(<div style={{padding:"12px 16px",background:headline.startsWith("🔴")?C.redDim:headline.startsWith("✅")?C.greenDim:C.amberDim,border:`1px solid ${headline.startsWith("🔴")?C.red+"40":headline.startsWith("✅")?C.green+"40":C.amber+"40"}`,borderRadius:"10px",marginBottom:"16px"}}><span style={{color:C.text,fontFamily:F.body,fontSize:"14px"}}>{headline}</span></div>)}

    {isAtSellPrompt&&(<div style={{background:`linear-gradient(135deg, ${C.amberDim} 0%, rgba(251,191,36,0.05) 100%)`,border:`2px solid ${C.amber}`,borderRadius:"16px",padding:"28px",textAlign:"center"}}><div style={{fontSize:"32px",marginBottom:"8px"}}>⚠️</div><h3 style={{fontFamily:F.display,color:C.amber,fontSize:"22px",margin:"0 0 8px"}}>Decision — {getDateLabel(weekIdx)}</h3><p style={{color:C.text,fontSize:"15px",marginBottom:"20px"}}>Portfolio {parseFloat(change)<0?"down":"up"} <strong>{Math.abs(parseFloat(change))}%</strong>.</p><div style={{display:"flex",gap:"16px",justifyContent:"center"}}><button onClick={sell} style={{...btn,background:C.red,fontSize:"16px",padding:"16px 32px"}}>😰 Sell</button><button onClick={hold} style={{...btn,background:C.green,fontSize:"16px",padding:"16px 32px"}}>💎 Hold</button></div></div>)}

    {isAtBuyPrompt&&(<div style={{background:`linear-gradient(135deg, ${C.greenDim} 0%, rgba(52,211,153,0.05) 100%)`,border:`2px solid ${C.green}`,borderRadius:"16px",padding:"28px",textAlign:"center"}}><div style={{fontSize:"32px",marginBottom:"8px"}}>🤔</div><h3 style={{fontFamily:F.display,color:C.green,fontSize:"22px",margin:"0 0 8px"}}>Buy back in? — {getDateLabel(weekIdx)}</h3><p style={{color:C.text,fontSize:"15px",marginBottom:"8px"}}>You sold at <strong>£{weeks[soldWeek].value.toLocaleString()}</strong>. Market is now <strong>£{currentVal.toLocaleString()}</strong>.</p><p style={{color:C.textMuted,fontSize:"13px",marginBottom:"20px"}}>{currentVal>weeks[soldWeek].value?"The market is above your exit — buying back means locking in a loss.":"The market is still below your exit — but will it drop more?"}</p><div style={{display:"flex",gap:"16px",justifyContent:"center"}}><button onClick={buyBack} style={{...btn,background:C.green,fontSize:"16px",padding:"16px 32px"}}>📈 Buy back in</button><button onClick={stayInCash} style={{...btn,background:C.card,color:C.text,border:`1px solid ${C.border}`,fontSize:"16px",padding:"16px 32px"}}>💰 Stay in cash</button></div></div>)}

    {!isDecisionPoint&&(<div style={{textAlign:"center"}}><button onClick={()=>setPaused(!paused)} style={{...btn,background:C.card,color:C.text,border:`1px solid ${C.border}`,fontSize:"13px",padding:"10px 20px"}}>{paused?"▶ Resume":"⏸ Pause"}</button></div>)}

    {isPresenter&&!isDecisionPoint&&<div style={{marginTop:"16px",padding:"12px 16px",background:C.amberDim,border:`1px solid ${C.amber}`,borderRadius:"10px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}><span style={{color:C.amber,fontFamily:F.mono,fontSize:"13px"}}>🎙 {tCount} submitted</span><button onClick={revealTiming} style={{...btn,fontSize:"13px",padding:"8px 16px"}}>Leaderboard</button></div>}
  </div>);
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
const allTabs=[{id:"quiz",label:"Quiz",icon:"❓",key:"showQuiz"},{id:"jargon",label:"Jargon",icon:"🎓",key:"showJargon"},{id:"portfolio",label:"Portfolio",icon:"📊",key:"showPortfolio"},{id:"fees",label:"Fees",icon:"💰",key:"showFees"},{id:"pizza",label:"Pizza",icon:"🍕",key:"showPizza"},{id:"pick",label:"Pick Fund",icon:"🎯",key:"showPick"},{id:"donothing",label:"Do Nothing",icon:"😰",key:"showDoNothing"}];

export default function App() {
  const [screen,setScreen]=useState("join");
  const [userName,setUserName]=useState("");
  const [isPresenter,setIsPresenter]=useState(false);
  const [presenterPass,setPresenterPass]=useState("");
  const PRESENTER_CODE="daniel007";
  const [activeTab,setActiveTab]=useState("quiz");
  const [settings,setSettings]=useState({...DEFAULT_SETTINGS});
  const [quizQs,setQuizQs]=useState([...DEFAULT_QUIZ]);
  const [jargonTs,setJargonTs]=useState([...DEFAULT_JARGON]);

  const join=()=>{if(userName.trim()&&(!isPresenter||presenterPass===PRESENTER_CODE))setScreen("main");};
  const canJoin=userName.trim()&&(!isPresenter||presenterPass===PRESENTER_CODE);
  const visibleTabs=allTabs.filter(t=>settings[t.key]);
  const activeTabs=isPresenter?[...visibleTabs,{id:"settings",label:"Settings",icon:"⚙️"}]:visibleTabs;

  if(screen==="join")return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.body}}>
      <div style={{maxWidth:"440px",width:"100%",padding:"24px"}}>
        <div style={{textAlign:"center",marginBottom:"48px"}}><div style={{fontFamily:F.mono,fontSize:"12px",color:C.accent,letterSpacing:"3px",marginBottom:"16px",textTransform:"uppercase"}}>Interactive Workshop</div><h1 style={{fontFamily:F.display,fontSize:"36px",margin:"0 0 12px",color:C.text,lineHeight:1.2}}>Passive vs Factor<br/>Investing</h1><p style={{color:C.textMuted,fontSize:"15px",margin:0}}>Join the session</p></div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"32px"}}>
          <label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"1px"}}>Your name</label>
          <input type="text" value={userName} onChange={e=>setUserName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&join()} placeholder="Enter your name…" autoFocus style={{width:"100%",padding:"14px 16px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:"10px",color:C.text,fontFamily:F.body,fontSize:"16px",outline:"none",boxSizing:"border-box",marginBottom:"20px"}}/>
          <label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>I am the…</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:isPresenter?"16px":"24px"}}>
            <button onClick={()=>setIsPresenter(true)} style={{padding:"16px",borderRadius:"12px",cursor:"pointer",background:isPresenter?C.amberDim:C.bg,border:`1px solid ${isPresenter?C.amber:C.border}`,color:isPresenter?C.amber:C.textMuted,fontFamily:F.body,fontSize:"14px",fontWeight:600}}><div style={{fontSize:"24px",marginBottom:"6px"}}>🎙</div>Presenter</button>
            <button onClick={()=>setIsPresenter(false)} style={{padding:"16px",borderRadius:"12px",cursor:"pointer",background:!isPresenter?C.accentDim:C.bg,border:`1px solid ${!isPresenter?C.accent:C.border}`,color:!isPresenter?C.accent:C.textMuted,fontFamily:F.body,fontSize:"14px",fontWeight:600}}><div style={{fontSize:"24px",marginBottom:"6px"}}>👋</div>Participant</button>
          </div>
          {isPresenter&&(<div style={{marginBottom:"24px"}}><label style={{fontFamily:F.mono,fontSize:"12px",color:C.textDim,display:"block",marginBottom:"8px",textTransform:"uppercase",letterSpacing:"1px"}}>Presenter code</label><input type="password" value={presenterPass} onChange={e=>setPresenterPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&join()} placeholder="Enter code…" style={{width:"100%",padding:"14px 16px",background:C.bg,border:`1px solid ${presenterPass===PRESENTER_CODE?C.green:C.border}`,borderRadius:"10px",color:C.text,fontFamily:F.body,fontSize:"16px",outline:"none",boxSizing:"border-box"}}/>{presenterPass&&presenterPass!==PRESENTER_CODE&&<span style={{fontFamily:F.mono,fontSize:"12px",color:C.red,marginTop:"6px",display:"block"}}>Incorrect code</span>}</div>)}
          <button onClick={join} disabled={!canJoin} style={{...btn,width:"100%",opacity:canJoin?1:0.4,fontSize:"16px",padding:"16px"}}>{isPresenter?"Start presenting":"Join session"} →</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:F.body}}>
      <div style={{maxWidth:"960px",margin:"0 auto",padding:"32px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"28px",flexWrap:"wrap",gap:"12px"}}>
          <div><div style={{fontFamily:F.mono,fontSize:"12px",color:C.accent,letterSpacing:"3px",marginBottom:"4px",textTransform:"uppercase"}}>Interactive Workshop</div><h1 style={{fontFamily:F.display,fontSize:"26px",margin:0,color:C.text}}>Passive vs Factor Investing</h1></div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:F.mono,fontSize:"12px",color:isPresenter?C.amber:C.accent,marginBottom:"2px"}}>{isPresenter?"🎙 PRESENTER":"👋 PARTICIPANT"}</div><div style={{fontFamily:F.body,fontSize:"14px",color:C.text}}>{userName}</div></div>
        </div>
        <div style={{display:"flex",gap:"6px",marginBottom:"32px",overflowX:"auto",paddingBottom:"4px"}}>{activeTabs.map(t=><TabBtn key={t.id} active={activeTab===t.id} onClick={()=>setActiveTab(t.id)} icon={t.icon}>{t.label}</TabBtn>)}</div>
        <div style={{background:`linear-gradient(135deg, ${C.card} 0%, rgba(17,24,39,0.6) 100%)`,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"32px"}}>
          {activeTab==="quiz"&&<QuizPage userName={userName} isPresenter={isPresenter} quizQs={quizQs}/>}
          {activeTab==="jargon"&&<JargonPage jargonTs={jargonTs}/>}
          {activeTab==="portfolio"&&<PortfolioPage settings={settings} userName={userName} isPresenter={isPresenter}/>}
          {activeTab==="fees"&&<FeeCalcPage settings={settings}/>}
          {activeTab==="pizza"&&<PizzaPage settings={settings}/>}
          {activeTab==="pick"&&<PickFundPage settings={settings}/>}
          {activeTab==="donothing"&&<DoNothingPage userName={userName} isPresenter={isPresenter}/>}
          {activeTab==="settings"&&isPresenter&&<SettingsPanel settings={settings} setSettings={setSettings} quizQs={quizQs} setQuizQs={setQuizQs} jargonTs={jargonTs} setJargonTs={setJargonTs}/>}
        </div>
        <div style={{textAlign:"center",marginTop:"24px",fontFamily:F.mono,fontSize:"11px",color:C.textDim}}>Simulated data for educational purposes — not financial advice. Returns based on MSCI factor index research (1975–2025).</div>
      </div>
    </div>
  );
}
