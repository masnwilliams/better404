export default function NotFound() {
  return (
    <>
      <div id="smart-404"></div>
      <script
        dangerouslySetInnerHTML={{
          __html: '(function(){const siteKey="pk_N9vAT61RbM9NDTWIm51gpBE4vInZ";const url=location.href;const ref=document.referrer||null;fetch("https://404-solver-production.up.railway.app/api/v1/recommendations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({siteKey,url,referrer:ref,topN:5})}).then(r=>r.json()).then(({results})=>{const el=document.getElementById("smart-404");if(!el||!Array.isArray(results))return;el.innerHTML=`<div style="margin:16px 0"><h2 style="margin:0 0 8px">Were you looking for one of these?</h2><ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">${results.map(r=>`+"<li><a href=\"${r.url}\">${r.title||r.url}</a><div style=\"opacity:.7\">${r.snippet||\"\"}</div></li>"+`).join("")}</ul></div>`;}).catch(()=>{});})();'
        }}
      />
    </>
  )
}
