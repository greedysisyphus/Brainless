import{r as d,j as t,D as g,C as b,c,e as w,a as f}from"./index.C-VfGy2l.js";const j=[{label:"Brainless",href:"#/sandwich"},{label:"人事與航班",href:"#/"},{label:"資料格式測試",href:"#/data-tester"}];function C(){const[n,m]=d.useState(""),[x,i]=d.useState(""),h=()=>{if(!n.trim()){i("請輸入測試資料");return}const a=n.trim().split(`
`);let e=`資料格式分析結果：

`;e+=`總行數: ${a.length}

`,a.forEach((l,o)=>{if(!l.trim()){e+=`第 ${o+1} 行: 空白行
`;return}e+=`第 ${o+1} 行: "${l}"
`;const s=l.split("	"),r=l.split(/\s+/);e+=`  Tab 分隔: ${s.length} 個欄位
`,e+=`  空格分隔: ${r.length} 個欄位
`,s.length>=2?(e+=`  職員編號: "${s[0].trim()}"
`,e+=`  姓名: "${s[1].trim()}"
`,e+=`  班表欄位數: ${s.length-2}
`):r.length>=2?(e+=`  職員編號: "${r[0].trim()}"
`,e+=`  姓名: "${r[1].trim()}"
`,e+=`  班表欄位數: ${r.length-2}
`):e+=`  ❌ 格式錯誤：欄位數不足
`,e+=`
`}),i(e)},u=t.jsxs(c,{title:"正確格式與範例",children:[t.jsx("p",{className:"text-sm font-semibold text-[var(--cw-text)]",children:"Excel 複製規則"}),t.jsxs("ul",{className:"mt-2 list-inside list-disc space-y-1 text-sm text-[var(--cw-text-muted)]",children:[t.jsx("li",{children:"第一欄職員編號、第二欄姓名"}),t.jsx("li",{children:"之後為每日班表欄"}),t.jsx("li",{children:"以 Tab 分隔"})]}),t.jsx("pre",{className:"mt-4 overflow-x-auto rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-3 font-mono text-xs text-[var(--cw-text-muted)]",children:`A45	林小余	K	K	Y	L
A51	黃紅葉	K	K	Y	L`})]}),p=t.jsxs(b,{className:"!gap-[var(--cw-stack-gap)]",children:[t.jsxs("div",{className:"grid gap-6 lg:grid-cols-2",children:[t.jsxs(c,{title:"輸入測試資料",children:[t.jsx(w,{value:n,onChange:a=>m(a.target.value),placeholder:"從 Excel 複製並貼上…",rows:12,textareaClassName:"font-mono text-sm min-h-[12rem]"}),t.jsx(f,{type:"button",variant:"primary",className:"mt-4",onClick:h,children:"分析資料格式"})]}),t.jsx(c,{title:"分析結果",children:t.jsx("pre",{className:"max-h-[24rem] overflow-auto rounded-[var(--cw-radius)] border border-[var(--cw-border-strong)] bg-[var(--cw-bg)] p-4 font-mono text-xs whitespace-pre-wrap text-[var(--cw-text-muted)]",children:x||"請輸入資料並點擊「分析資料格式」"})})]}),u]});return t.jsx(g,{breadcrumbs:j,title:"資料格式測試工具",description:"檢查從 Excel 複製貼上班表資料是否符合 Tab 欄結構。",studio:p})}export{C as default};
