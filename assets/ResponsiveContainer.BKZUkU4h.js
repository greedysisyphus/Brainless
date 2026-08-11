import{j as n}from"./index.Dchr8IH-.js";const u=({children:t,className:e="",maxWidth:r="container-custom",padding:s="py-4 sm:py-6 lg:py-8",center:a=!0})=>n.jsx("div",{className:`${r} ${s} ${a?"mx-auto":""} ${e}`,children:t}),g=({children:t,className:e="",padding:r="p-4 sm:p-6",hover:s=!0})=>n.jsx("div",{className:`
      bg-surface rounded-xl shadow-lg border border-white/5 
      ${r} 
      ${s?"hover:shadow-xl hover:border-white/10 transition-all duration-200":""} 
      ${e}
    `,children:t}),b=({children:t,onClick:e,variant:r="primary",size:s="md",disabled:a=!1,loading:l=!1,className:o="",...x})=>{const i=()=>{switch(r){case"primary":return"bg-primary text-white hover:bg-primary/80 disabled:bg-primary/50";case"secondary":return"bg-white/10 text-white hover:bg-white/20 disabled:bg-white/5";case"danger":return"bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 disabled:bg-red-500/10";case"ghost":return"text-text-secondary hover:text-text-primary hover:bg-white/5 disabled:text-gray-500";default:return"bg-primary text-white hover:bg-primary/80 disabled:bg-primary/50"}},c=()=>{switch(s){case"sm":return"px-3 py-2 text-sm";case"md":return"px-4 py-2";case"lg":return"px-6 py-3 text-lg";default:return"px-4 py-2"}};return n.jsx("button",{onClick:e,disabled:a||l,className:`
        ${i()}
        ${c()}
        rounded-lg transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary/50
        ${o}
      `,...x,children:l?n.jsxs("div",{className:"flex items-center gap-2",children:[n.jsx("div",{className:"animate-spin rounded-full h-4 w-4 border-b-2 border-current"}),"載入中..."]}):t})},m=({value:t,onChange:e,placeholder:r="",type:s="text",disabled:a=!1,error:l=!1,className:o="",...x})=>n.jsx("input",{type:s,value:t,onChange:e,placeholder:r,disabled:a,className:`
        w-full p-3 sm:p-4
        bg-white/10 border rounded-lg
        text-white placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-primary/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${l?"border-red-500/50 focus:ring-red-500/50":"border-white/20"}
        ${o}
      `,...x}),p=({children:t,htmlFor:e,className:r="",required:s=!1})=>n.jsx("label",{htmlFor:e,className:`
        block text-sm sm:text-base text-white mb-2
        ${s?'after:content-["*"] after:text-red-400 after:ml-1':""}
        ${r}
      `,children:t}),h=({children:t,level:e=1,className:r="",gradient:s=!1})=>{const a=()=>{switch(e){case 1:return"text-2xl sm:text-3xl lg:text-4xl";case 2:return"text-xl sm:text-2xl lg:text-3xl";case 3:return"text-lg sm:text-xl lg:text-2xl";case 4:return"text-base sm:text-lg lg:text-xl";case 5:return"text-sm sm:text-base lg:text-lg";case 6:return"text-xs sm:text-sm lg:text-base";default:return"text-xl sm:text-2xl lg:text-3xl"}},l=()=>s?"bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent":"text-white",o=`h${e}`;return n.jsx(o,{className:`font-bold ${a()} ${l()} ${r}`,children:t})},y=({children:t,size:e="base",color:r="white",className:s="",...a})=>{const l=()=>{switch(e){case"xs":return"text-xs";case"sm":return"text-sm";case"base":return"text-base";case"lg":return"text-lg";case"xl":return"text-xl";default:return"text-base"}},o=()=>{switch(r){case"white":return"text-white";case"secondary":return"text-text-secondary";case"primary":return"text-primary";case"danger":return"text-red-400";case"success":return"text-green-400";default:return"text-white"}};return n.jsx("p",{className:`${l()} ${o()} ${s}`,...a,children:t})};export{y as R,b as a,g as b,h as c,p as d,u as e,m as f};
