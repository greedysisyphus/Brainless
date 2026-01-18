const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index.BdHW5VF-.js","assets/index.0zZ4fKQh.css"])))=>i.map(i=>d[i]);
import{r as o,j as e,F as v,_ as T}from"./index.BdHW5VF-.js";function L({title:l,titleId:m,...d},y){return o.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:y,"aria-labelledby":m},d),l?o.createElement("title",{id:m},l):null,o.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"}))}const M=o.forwardRef(L);function R(){const[l,m]=o.useState(""),[d,y]=o.useState(""),[g,k]=o.useState(""),[s,z]=o.useState(""),[r,j]=o.useState(""),[p,N]=o.useState(""),[u,$]=o.useState(20),c="w-full px-4 py-2 bg-surface/60 border border-white/10 rounded-lg text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary/50 transition-colors",x="block text-sm font-medium text-text-secondary mb-2",w=()=>`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
            orientation: landscape !important;
          }
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 0 !important;
              orientation: landscape !important;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft JhengHei', sans-serif;
            padding: 5.6mm;
            background: #fafafa;
            color: #1d1d1f;
            box-sizing: border-box;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.08);
            height: 100%;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e5e7;
            flex-shrink: 0;
          }
          .header-fields {
            display: flex;
            gap: 20px;
            align-items: flex-end;
            flex: 1;
            width: 100%;
          }
          .field-group {
            margin-bottom: 0;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }
          .field-group.machine-type {
            flex: 1;
            min-width: 200px;
          }
          .field-label {
            font-size: 13px;
            color: #1d1d1f;
            margin-bottom: 10px;
            font-weight: 500;
            display: block;
          }
          .field-value {
            font-size: 14px;
            color: #1d1d1f;
            font-weight: 400;
            height: 24px;
            padding: 2px 0;
            border-bottom: 1.5px solid #d2d2d7;
            min-width: 100px;
            display: block;
            width: 100%;
            line-height: 20px;
            box-sizing: border-box;
          }
          .field-group.machine-type .field-value {
            min-width: 200px;
          }
          .field-value.empty {
            color: transparent;
            border-bottom-color: #d2d2d7;
          }
          .date-field {
            margin-top: 0;
            overflow: visible;
          }
          .date-inputs {
            display: flex;
            align-items: flex-end;
            gap: 0;
            height: 24px;
            box-sizing: border-box;
          }
          .date-input-wrapper {
            display: flex;
            align-items: flex-end;
            position: relative;
          }
          .date-input {
            font-size: 14px;
            font-weight: 400;
            padding: 2px 8px;
            border-bottom: 1.5px solid #d2d2d7;
            min-width: 50px;
            text-align: center;
            display: inline-block;
            line-height: 20px;
            height: 24px;
            box-sizing: border-box;
            position: relative;
          }
          .date-input.month,
          .date-input.day {
            min-width: 45px;
          }
          .date-label {
            font-size: 12px;
            color: #8e8e93;
            font-weight: 400;
            white-space: nowrap;
            line-height: 24px;
            padding: 0 4px;
          }
          .table-container {
            width: 100%;
            border: 1px solid #e5e5e7;
            border-collapse: collapse;
            margin-top: 0;
            border-radius: 8px;
            overflow: hidden;
            background: white;
            flex: 1;
            min-height: 0;
          }
          .table-container th,
          .table-container td {
            border: 1px solid #e5e5e7;
            padding: 6px 10px;
            font-size: 11px;
            vertical-align: middle;
          }
          .table-container th {
            background: #f5f5f7;
            font-weight: 600;
            color: #1d1d1f;
            text-align: center;
            padding: 8px 10px;
          }
          .table-container td {
            color: #515154;
            height: 28px;
          }
          .table-container .col-no {
            width: 6%;
            text-align: center;
            color: #1d1d1f;
            font-weight: 500;
          }
          .table-container th.col-code,
          .table-container th.col-chinese,
          .table-container th.col-english,
          .table-container th.col-spec,
          .table-container th.col-location,
          .table-container th.col-remark {
            text-align: center;
          }
          .table-container .col-code {
            width: 11%;
            text-align: left;
          }
          .table-container .col-chinese {
            width: 17%;
            text-align: left;
          }
          .table-container .col-english {
            width: 17%;
            text-align: left;
          }
          .table-container .col-spec {
            width: 16%;
            text-align: left;
          }
          .table-container .col-location {
            width: 12%;
            text-align: left;
          }
          .table-container .col-qty {
            width: 7%;
            text-align: center;
          }
          .table-container .col-remark {
            width: 14%;
            text-align: left;
          }
          .table-container tbody tr:nth-child(even) {
            background: #fafafa;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-fields">
              <div class="field-group date-field">
                <span class="field-label">日期</span>
                <div class="date-inputs">
                  <span class="date-input" style="color: ${s?"#1d1d1f":"transparent"}">${s||""}</span>
                  <span class="date-label">年</span>
                  <span class="date-input month" style="color: ${r?"#1d1d1f":"transparent"}">${r||""}</span>
                  <span class="date-label">月</span>
                  <span class="date-input day" style="color: ${p?"#1d1d1f":"transparent"}">${p||""}</span>
                  <span class="date-label">日</span>
                </div>
              </div>
              <div class="field-group machine-type">
                <span class="field-label">機種</span>
                <span class="field-value ${l?"":"empty"}">${l||""}</span>
              </div>
              <div class="field-group">
                <span class="field-label">數量</span>
                <span class="field-value ${d?"":"empty"}">${d||""}</span>
              </div>
              <div class="field-group">
                <span class="field-label">P</span>
                <span class="field-value ${g?"":"empty"}">${g||""}</span>
              </div>
            </div>
          </div>
          
          <table class="table-container">
            <thead>
              <tr>
                <th class="col-no">No.</th>
                <th class="col-code">Part Code</th>
                <th class="col-chinese">中文</th>
                <th class="col-english">英文</th>
                <th class="col-spec">規格</th>
                <th class="col-location">零件位置</th>
                <th class="col-qty">Q'ty</th>
                <th class="col-remark">備註</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({length:u},(b,h)=>`
                <tr>
                  <td class="col-no">${h+1}</td>
                  <td class="col-code"></td>
                  <td class="col-chinese"></td>
                  <td class="col-english"></td>
                  <td class="col-spec"></td>
                  <td class="col-location"></td>
                  <td class="col-qty"></td>
                  <td class="col-remark"></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `,C=()=>`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft JhengHei', sans-serif; width: 1123px; height: 794px; padding: 20px; background: #fafafa; color: #1d1d1f; box-sizing: border-box; overflow: hidden;">
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); width: 100%; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e7; flex-shrink: 0;">
            <div style="display: flex; gap: 20px; align-items: flex-end; flex: 1; width: 100%;">
              <div style="margin-bottom: 0; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 13px; color: #1d1d1f; margin-bottom: 10px; font-weight: 500; display: block;">日期</span>
                <div style="display: flex; align-items: flex-end; gap: 0; height: 24px; box-sizing: border-box;">
                  <span style="font-size: 14px; color: ${s?"#1d1d1f":"transparent"}; font-weight: 400; padding: 2px 8px; border-bottom: 1.5px solid #d2d2d7; min-width: 50px; text-align: center; display: inline-block; line-height: 20px; height: 24px; box-sizing: border-box;">${s||""}</span>
                  <span style="font-size: 12px; color: #8e8e93; font-weight: 400; white-space: nowrap; line-height: 24px; padding: 0 4px;">年</span>
                  <span style="font-size: 14px; color: ${r?"#1d1d1f":"transparent"}; font-weight: 400; padding: 2px 8px; border-bottom: 1.5px solid #d2d2d7; min-width: 45px; text-align: center; display: inline-block; line-height: 20px; height: 24px; box-sizing: border-box;">${r||""}</span>
                  <span style="font-size: 12px; color: #8e8e93; font-weight: 400; white-space: nowrap; line-height: 24px; padding: 0 4px;">月</span>
                  <span style="font-size: 14px; color: ${p?"#1d1d1f":"transparent"}; font-weight: 400; padding: 2px 8px; border-bottom: 1.5px solid #d2d2d7; min-width: 45px; text-align: center; display: inline-block; line-height: 20px; height: 24px; box-sizing: border-box;">${p||""}</span>
                  <span style="font-size: 12px; color: #8e8e93; font-weight: 400; white-space: nowrap; line-height: 24px; padding: 0 4px;">日</span>
                </div>
              </div>
              <div style="margin-bottom: 0; flex: 1; min-width: 200px; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 13px; color: #1d1d1f; margin-bottom: 10px; font-weight: 500; display: block;">機種</span>
                <span style="font-size: 14px; color: ${l?"#1d1d1f":"transparent"}; font-weight: 400; height: 24px; padding: 2px 0; border-bottom: 1.5px solid #d2d2d7; min-width: 200px; display: block; width: 100%; line-height: 20px; box-sizing: border-box;">${l||""}</span>
              </div>
              <div style="margin-bottom: 0; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 13px; color: #1d1d1f; margin-bottom: 10px; font-weight: 500; display: block;">數量</span>
                <span style="font-size: 14px; color: ${d?"#1d1d1f":"transparent"}; font-weight: 400; height: 24px; padding: 2px 0; border-bottom: 1.5px solid #d2d2d7; min-width: 100px; display: block; line-height: 20px; box-sizing: border-box;">${d||""}</span>
              </div>
              <div style="margin-bottom: 0; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-end;">
                <span style="font-size: 13px; color: #1d1d1f; margin-bottom: 10px; font-weight: 500; display: block;">P</span>
                <span style="font-size: 14px; color: ${g?"#1d1d1f":"transparent"}; font-weight: 400; height: 24px; padding: 2px 0; border-bottom: 1.5px solid #d2d2d7; min-width: 100px; display: block; line-height: 20px; box-sizing: border-box;">${g||""}</span>
              </div>
            </div>
          </div>
          
          <table style="width: 100%; border: 1px solid #e5e5e7; border-collapse: collapse; margin-top: 0; border-radius: 8px; overflow: hidden; background: white; flex: 1; min-height: 0;">
            <thead>
              <tr>
                <th style="width: 6%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">No.</th>
                <th style="width: 11%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">Part Code</th>
                <th style="width: 17%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">中文</th>
                <th style="width: 17%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">英文</th>
                <th style="width: 16%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">規格</th>
                <th style="width: 12%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">零件位置</th>
                <th style="width: 7%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">Q'ty</th>
                <th style="width: 14%; border: 1px solid #e5e5e7; padding: 8px 10px; font-size: 11px; vertical-align: middle; background: #f5f5f7; font-weight: 600; color: #1d1d1f; text-align: center;">備註</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({length:u},(b,h)=>`
                <tr style="background: ${h%2===0?"white":"#fafafa"};">
                  <td style="width: 6%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #1d1d1f; font-weight: 500; text-align: center; height: 28px;">${h+1}</td>
                  <td style="width: 11%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 17%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 17%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 16%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 12%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                  <td style="width: 7%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: center; height: 28px;"></td>
                  <td style="width: 14%; border: 1px solid #e5e5e7; padding: 6px 10px; font-size: 11px; vertical-align: middle; color: #515154; text-align: left; height: 28px;"></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `,_=()=>{const i=w(),n=window.open("","_blank");if(!n){alert("無法開啟新視窗，請允許彈出視窗");return}n.document.open(),n.document.write(i),n.document.close(),n.onload=()=>{setTimeout(()=>{const t=n.document.createElement("style");t.textContent=`
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 0 !important;
            }
            body {
              width: 297mm !important;
              height: 210mm !important;
            }
          }
        `,n.document.head.appendChild(t),n.print()},500)},setTimeout(()=>{if(n.document.readyState==="complete"){const t=n.document.createElement("style");t.textContent=`
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 0 !important;
            }
            body {
              width: 297mm !important;
              height: 210mm !important;
            }
          }
        `,n.document.head.appendChild(t),n.print()}},1e3)},D=()=>{const i=w(),n=window.open("","_blank");if(!n){alert("無法開啟新視窗，請允許彈出視窗");return}n.document.open(),n.document.write(i),n.document.close()},E=async()=>{try{let i;try{i=(await T(async()=>{const{default:a}=await import("./index.BdHW5VF-.js").then(f=>f.bG);return{default:a}},__vite__mapDeps([0,1]))).default}catch(a){console.error("html2canvas 載入失敗:",a),alert("匯出功能暫時無法使用，請重新整理頁面後再試");return}const n=C(),t=document.createElement("div");t.innerHTML=n,t.style.position="absolute",t.style.left="-9999px",t.style.top="0",t.style.width="1123px",t.style.height="794px",t.style.overflow="visible",t.style.backgroundColor="#fafafa",document.body.appendChild(t);const b=t.firstElementChild;if(!b)throw new Error("無法找到要渲染的元素");await new Promise(a=>setTimeout(a,1e3));const h=t.style.left;t.style.left="0",t.style.top="0",t.style.zIndex="9999";try{const a=await i(b,{backgroundColor:"#fafafa",scale:2,useCORS:!0,allowTaint:!0,logging:!1,width:1123,height:794,scrollX:0,scrollY:0,windowWidth:1123,windowHeight:794});if(t.style.left=h,document.body.removeChild(t),!a||a.width===0||a.height===0)throw new Error("Canvas 渲染失敗：寬度或高度為 0");const f=document.createElement("a"),P=s&&r&&p?`${s}_${r}_${p}`:"未填寫日期";f.download=`個人表格_${P}.png`,f.href=a.toDataURL("image/png",1),f.click()}catch(a){throw t.style.left=h,document.body.removeChild(t),a}}catch(i){console.error("匯出 PNG 失敗:",i),alert(`匯出 PNG 失敗：${i.message}`)}};return e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"bg-surface/40 backdrop-blur-md border border-white/10 rounded-xl p-6",children:[e.jsx("h2",{className:"text-xl font-bold text-primary mb-6",children:"表格設定"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4 mb-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:x,children:"機種"}),e.jsx("input",{type:"text",value:l,onChange:i=>m(i.target.value),placeholder:"留空可手寫",className:c})]}),e.jsxs("div",{children:[e.jsx("label",{className:x,children:"數量"}),e.jsx("input",{type:"text",value:d,onChange:i=>y(i.target.value),placeholder:"留空可手寫",className:c})]}),e.jsxs("div",{children:[e.jsx("label",{className:x,children:"頁碼 (P)"}),e.jsx("input",{type:"text",value:g,onChange:i=>k(i.target.value),placeholder:"留空可手寫",className:c})]}),e.jsxs("div",{children:[e.jsx("label",{className:x,children:"表格行數"}),e.jsx("input",{type:"number",value:u,onChange:i=>{const n=parseInt(i.target.value)||20;$(Math.max(1,Math.min(50,n)))},min:"1",max:"50",className:c})]})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:x,children:"年份"}),e.jsx("input",{type:"text",value:s,onChange:i=>z(i.target.value.replace(/\D/g,"").slice(0,4)),placeholder:"例如：2024",maxLength:"4",className:c})]}),e.jsxs("div",{children:[e.jsx("label",{className:x,children:"月份"}),e.jsx("input",{type:"text",value:r,onChange:i=>j(i.target.value.replace(/\D/g,"").slice(0,2)),placeholder:"例如：01",maxLength:"2",className:c})]}),e.jsxs("div",{children:[e.jsx("label",{className:x,children:"日期"}),e.jsx("input",{type:"text",value:p,onChange:i=>N(i.target.value.replace(/\D/g,"").slice(0,2)),placeholder:"例如：15",maxLength:"2",className:c})]})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-4",children:[e.jsxs("button",{onClick:D,className:"flex-1 min-w-[140px] px-6 py-3 bg-surface/40 border border-white/10 text-primary rounded-lg hover:bg-surface/60 transition-colors font-medium flex items-center justify-center gap-2",children:[e.jsx(v,{className:"w-5 h-5"}),"預覽表格"]}),e.jsxs("button",{onClick:_,className:"flex-1 min-w-[140px] px-6 py-3 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors font-medium flex items-center justify-center gap-2",children:[e.jsx(M,{className:"w-5 h-5"}),"列印表格"]}),e.jsxs("button",{onClick:E,className:"flex-1 min-w-[140px] px-6 py-3 bg-primary/20 border border-primary/30 text-primary rounded-lg hover:bg-primary/30 transition-colors font-medium flex items-center justify-center gap-2",children:[e.jsx(v,{className:"w-5 h-5"}),"匯出 PNG"]})]})]})}export{R as default};
