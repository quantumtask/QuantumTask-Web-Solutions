/* ---------- Data ---------- */
const PRICING = {
  'customer-support': { price: 899, csat: 90, fcr: 75, aht: 5.7, sla: 94 },
  'e-commerce':       { price: 999, csat: 90, fcr: 76, aht: 5.5, sla: 94 },
  'saas':             { price: 1099,csat: 91, fcr: 77, aht: 5.9, sla: 95 },
  'finance':          { price: 1299,csat: 92, fcr: 78, aht: 6.2, sla: 95 },
  'healthcare':       { price: 1399,csat: 94, fcr: 80, aht: 5.8, sla: 96 },
  'logistics':        { price: 1199,csat: 88, fcr: 72, aht: 6.7, sla: 92 },
  'real-estate':      { price: 1199,csat: 89, fcr: 74, aht: 6.5, sla: 93 },
};
const TIERS = { starter:1.00, growth:1.25, pro:1.50 };

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const txt = (id, v) => { const el=$(id); if(el) el.textContent=v; };

function animateNumber(el, to, decimals){
  if(!el) return;
  const clean = v => typeof v==='number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g,''))||0;
  const from = clean(el.textContent);
  const target = clean(to);
  const start = performance.now();
  const dur = 900;
  const step = (t)=>{
    const p = Math.min(1,(t-start)/dur), e = 1-Math.pow(1-p,3);
    const v = from + (target-from)*e;
    el.textContent = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Pricing + KPIs ---------- */
function recalc(){
  const ind = $('industry').value;
  const tier = $('tier').value;
  const base = PRICING[ind] || PRICING['customer-support'];
  animateNumber($('priceAmount'), base.price*TIERS[tier], 0);
  txt('priceNote', ind.replace('-', ' ') + ' · ' + tier[0].toUpperCase()+tier.slice(1));

  animateNumber($('kpi_csat'), base.csat, 0);
  animateNumber($('kpi_fcr'),  base.fcr,  0);
  animateNumber($('kpi_aht'),  base.aht,  1);
  animateNumber($('kpi_sla'),  base.sla,  0);
}

/* ---------- Testimonials ---------- */
function loadTestimonials(){
  const DATA = [
    {name:"Lerato M.", role:"CX Lead · E-commerce", stars:5, text:"Went live in 3 weeks. CSAT lifted and our queue time halved."},
    {name:"Daniel K.", role:"Ops Manager · SaaS", stars:5, text:"Handovers are clean. Weekly QA keeps quality consistent."},
    {name:"Aisha P.", role:"Support Director · Fintech", stars:4, text:"Chargeback handling improved and first contact resolution is up."},
    {name:"Marco V.", role:"Head of CX · Logistics", stars:5, text:"Night shift coverage is seamless. Good comms and reporting."},
    {name:"Naledi T.", role:"Care Manager · Healthcare", stars:4, text:"Scheduling and eligibility checks are accurate and fast."},
    {name:"Ethan R.", role:"Founder · Real Estate", stars:5, text:"Lead qualify + scheduling removed a huge burden from our team."}
  ];
  const grid = $('qt-t-grid');
  if(!grid) return;
  const pick = (arr,n)=>{ const a=arr.slice(),o=[]; while(a.length&&o.length<n)o.push(a.splice(Math.random()*a.length|0,1)[0]); return o; };
  grid.innerHTML = pick(DATA,3).map(t=>`
    <article class="qt-t-card reveal">
      <div class="qt-t-head">
        <div class="qt-t-avatar" aria-hidden="true"></div>
        <div>
          <div class="qt-t-name">${t.name}</div>
          <div class="qt-t-role">${t.role}</div>
        </div>
        <div style="margin-left:auto" aria-label="${t.stars} star rating" class="qt-t-stars">${"★".repeat(t.stars)}${"☆".repeat(5-t.stars)}</div>
      </div>
      <p class="muted">“${t.text}”</p>
    </article>
  `).join("");
}

/* ---------- Legal overlay ---------- */
function initLegal(){
  const mask = $('qtLegalMask');
  const panel = $('qtLegal');
  const body = $('qtLegalBody');
  const title = $('qtLegalTitle');
  const close = $('qtLegalClose');

  const open = (kind)=>{
    title.textContent = kind==='privacy'?'Privacy Policy':'Terms of Service';
    body.innerHTML = kind==='privacy'
      ? '<p>We process minimal data to deliver services. Access is role-limited and logged. Removal requests honored. Contact <a href="mailto:sales@quantumtask.io">sales@quantumtask.io</a>.</p>'
      : '<p>Engagement is governed by a signed SOW. SLAs, pricing, and data handling are defined in your SOW. Contact <a href="mailto:sales@quantumtask.io">sales@quantumtask.io</a>.</p>';
    document.body.classList.add('qt-open');
    mask.hidden = false; panel.hidden = false;
  };
  const shut = ()=>{
    document.body.classList.remove('qt-open');
    mask.hidden = true; panel.hidden = true;
  };

  close.addEventListener('click', shut);
  mask.addEventListener('click', shut);

  document.addEventListener('click', (e)=>{
    const a = e.target.closest('a[data-legal]');
    if(!a) return;
    e.preventDefault();
    open(a.getAttribute('data-legal'));
  });

  // Hash deep link
  const h = (location.hash||'').toLowerCase().replace('#','');
  if(h==='privacy' || h==='terms') open(h);
}

/* ---------- Reveal on view ---------- */
function initReveal(){
  const targets = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target); }});
  }, {root:null, rootMargin:"0px 0px -10% 0px", threshold:0.12});
  targets.forEach(el=>io.observe(el));
  // Also ensure hero shows quickly
  const hero = document.querySelector('.hero'); if(hero){ hero.classList.add('show'); }
}

/* ---------- Smooth anchor offset for sticky header ---------- */
function initAnchors(){
  const header = document.querySelector('header.top');
  const headerH = () => (header ? header.getBoundingClientRect().height : 0) + 12;

  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(!el) return;
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - headerH();
      history.pushState(null,'','#'+id);
      window.scrollTo({ top:y, behavior:'smooth' });
    });
  });

  if(location.hash){
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    if(el){
      setTimeout(()=>{
        const y = el.getBoundingClientRect().top + window.scrollY - headerH();
        window.scrollTo({ top:y, behavior:'smooth' });
      }, 0);
    }
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  // Year
  const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // Wiring
  document.addEventListener('change', (e)=>{
    if(e.target && (e.target.id==='industry' || e.target.id==='tier')) recalc();
  });

  recalc();
  loadTestimonials();
  initLegal();
  initReveal();
  initAnchors();
});