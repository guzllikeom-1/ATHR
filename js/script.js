
document.addEventListener("DOMContentLoaded", () => {
  setupHeader();
  updateAthrCartCount();
  const page = document.body.dataset.page || "";
  if (page === "home") loadHomeProducts();
  if (page === "shop") loadShopPage();
  if (page === "categories") loadCategoriesPage();
  if (page === "product") loadProductPage();
  if (page === "cart") loadCartPage();
  const year = document.getElementById("footerYear"); if(year) year.textContent = new Date().getFullYear();
});

let athrSearchProducts = null;
function setupHeader(){
  const menuBtn=document.getElementById("mobileMenuBtn"), menu=document.getElementById("mobileMenu"), close=document.getElementById("closeMenu");
  if(menuBtn&&menu) menuBtn.onclick=()=>{menu.classList.add("active");document.body.style.overflow="hidden"};
  if(close&&menu) close.onclick=()=>{menu.classList.remove("active");document.body.style.overflow=""};
  const catToggle=document.getElementById("categoriesToggle"), dropdown=document.getElementById("categoriesDropdown");
  if(catToggle&&dropdown) catToggle.onclick=(e)=>{e.stopPropagation();dropdown.classList.toggle("show")};
  const mobileCat=document.getElementById("mobileCategoriesToggle"), mobileCats=document.getElementById("mobileCategories");
  if(mobileCat&&mobileCats) mobileCat.onclick=()=>{mobileCats.classList.toggle("open");mobileCat.classList.toggle("open")};
  document.addEventListener("click",e=>{if(dropdown&&!e.target.closest(".nav-dropdown-wrap"))dropdown.classList.remove("show")});
 const searchBtn = document.getElementById("searchBtn");
const mobileSearchBtn = document.getElementById("mobileSearchBtn");
const panel = document.getElementById("searchPanel");
const closeSearch = document.getElementById("closeSearch");
const input = document.getElementById("searchInput");

const openSearch = async () => {
  if (!panel) return;

  panel.classList.add("show");

  setTimeout(() => {
    input?.focus();
  }, 50);

  await loadSearchProducts();
};

if (searchBtn && panel) {
  searchBtn.onclick = openSearch;
}

if (mobileSearchBtn && panel) {
  mobileSearchBtn.onclick = openSearch;
}
  if(closeSearch&&panel) closeSearch.onclick=()=>{panel.classList.remove("show");if(input)input.value="";const r=document.getElementById("searchResults");if(r)r.innerHTML=""};
  if(input) input.addEventListener("input",()=>renderSearchResults(input.value));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){menu?.classList.remove("active");panel?.classList.remove("show");dropdown?.classList.remove("show");document.body.style.overflow=""}});
  const page=document.body.dataset.page;document.querySelectorAll("[data-nav]").forEach(a=>{if(a.dataset.nav===page)a.classList.add("active")});
}
async function loadSearchProducts(){
  if(athrSearchProducts) return;
  try{const {data,error}=await athrSupabase.from("products").select(`id,name,price,image_url,category:categories(name,slug)`).order("created_at",{ascending:false});if(error)throw error;athrSearchProducts=data||[];renderSearchResults(document.getElementById("searchInput")?.value||"")}catch(e){console.error(e)}
}
function renderSearchResults(q){const box=document.getElementById("searchResults");if(!box)return;const term=(q||"").trim().toLowerCase();if(!term){box.innerHTML="";return}const rows=(athrSearchProducts||[]).filter(p=>(p.name||"").toLowerCase().includes(term)||(p.category?.name||"").toLowerCase().includes(term)).slice(0,8);box.innerHTML=rows.length?rows.map(p=>`<a class="search-result" href="product.html?id=${encodeURIComponent(p.id)}"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}"><span><strong>${escapeHtml(p.name)}</strong><small>${Number(p.price).toFixed(3)} ر.ع</small></span></a>`).join(""):`<div class="search-empty">لا توجد منتجات مطابقة للبحث.</div>`}

async function fetchProducts(){const {data,error}=await athrSupabase.from("products").select(`id,name,price,image_url,is_best_seller,is_new_arrival,created_at,category:categories(id,name,slug)`).order("created_at",{ascending:false});if(error)throw error;return data||[]}
function renderProductCards(container,products,empty="لا توجد منتجات حاليًا."){if(!container)return;if(!products.length){container.innerHTML=`<div class="shop-state">${empty}</div>`;return}container.innerHTML=products.map(p=>`<article class="athr-product-card"><a href="product.html?id=${encodeURIComponent(p.id)}" class="athr-product-image"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy"></a><div class="athr-product-info">${p.category?.name?`<span class="athr-product-category">${escapeHtml(p.category.name)}</span>`:""}<h3>${escapeHtml(p.name)}</h3><div class="athr-product-bottom"><span class="athr-product-price">${Number(p.price).toFixed(3)} ر.ع</span><button type="button" class="athr-add-cart" data-id="${escapeHtml(p.id)}">أضف للسلة</button></div></div></article>`).join("");container.querySelectorAll(".athr-add-cart").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.dataset.id);if(p)addAthrProductToCart(p)})}
async function loadHomeProducts(){const best=document.getElementById("bestSellersGrid"),newG=document.getElementById("newArrivalsGrid");if(!best&&!newG)return;try{const ps=await fetchProducts();renderProductCards(best,ps.filter(p=>p.is_best_seller).slice(0,8),"لا توجد منتجات مميزة حاليًا.");renderProductCards(newG,ps.filter(p=>p.is_new_arrival).slice(0,8),"لا توجد منتجات جديدة حاليًا.")}catch(e){console.error(e);if(best)best.innerHTML='<div class="shop-state">تعذر تحميل المنتجات حاليًا.</div>';if(newG)newG.innerHTML='<div class="shop-state">تعذر تحميل المنتجات حاليًا.</div>'}}

async function loadShopPage(){
  const grid=document.getElementById("shopProductsGrid");
  if(!grid)return;

  try{
    const products=await fetchProducts();
    window.athrShopProducts=products;

    const params=new URLSearchParams(location.search);
    let category=params.get("category")||"all";
    let sort=params.get("sort")||"new";

    const sortSelect=document.getElementById("shopSort");
    if(sortSelect) sortSelect.value=sort;

    buildShopFilters(products,category);

    const updateCategoryIntro=(selected)=>{
      const intro=document.getElementById("shopCategoryIntro");
      if(!intro)return;

      const meta=categoryMeta[selected];
      if(selected && selected!=="all" && meta){
        intro.innerHTML=`<h2>${escapeHtml(meta.title)}</h2><p>${escapeHtml(meta.desc)}</p>`;
        intro.classList.add("show");
      }else{
        intro.innerHTML="";
        intro.classList.remove("show");
      }
    };

    const apply=()=>{
      const selected=document.querySelector(".filter-chip.active")?.dataset.category||category;
      const s=sortSelect?.value||"new";
      category=selected;
      updateCategoryIntro(selected);

      let rows=products.filter(p=>selected==="all"||p.category?.slug===selected);
      if(s==="price-asc") rows.sort((a,b)=>Number(a.price)-Number(b.price));
      else if(s==="price-desc") rows.sort((a,b)=>Number(b.price)-Number(a.price));
      else if(s==="best") rows.sort((a,b)=>Number(b.is_best_seller)-Number(a.is_best_seller)||new Date(b.created_at)-new Date(a.created_at));
      else rows.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

      renderProductCards(grid,rows,"لا توجد منتجات في هذا القسم حاليًا.");
    };

    document.querySelectorAll(".filter-chip").forEach(b=>b.onclick=()=>{
      document.querySelectorAll(".filter-chip").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      apply();
    });

    sortSelect?.addEventListener("change",()=>{
      const selected=document.querySelector(".filter-chip.active")?.dataset.category||"all";
      const newUrl=new URL(location.href);
      if(selected==="all") newUrl.searchParams.delete("category");
      else newUrl.searchParams.set("category",selected);
      if(sortSelect.value==="new") newUrl.searchParams.delete("sort");
      else newUrl.searchParams.set("sort",sortSelect.value);
      history.replaceState({},"",newUrl);
      apply();
    });

    apply();
  }catch(e){
    console.error(e);
    grid.innerHTML='<div class="shop-state">تعذر تحميل المنتجات حاليًا.</div>';
  }
}

function buildShopFilters(products, selected) {
  const row = document.getElementById("shopFilters");
  if (!row) return;

  const order = [
    ["all", "الكل"],
    ["clubs", "أكواب الأندية"],
    ["university", "أكواب الجامعات"],
    ["girls", "أكواب البنات"],
    ["quotes", "أكواب العبارات"],
    ["redbull", "Red Bull المضيئة"],
    ["stanley", "Stanley"],
    ["mugs", "المجات"],
    ["coffee", "أدوات القهوة"],
    ["wallets", "المحافظ"],
    ["makeup-bags", "حقائب المكياج"]
  ];

  row.innerHTML = order
    .map(([slug, name]) => `
      <button
        type="button"
        class="filter-chip ${slug === selected ? "active" : ""}"
        data-category="${escapeHtml(slug)}">
        ${escapeHtml(name)}
      </button>
    `)
    .join("");

  if (!row.querySelector(".filter-chip.active")) {
    row.querySelector('[data-category="all"]')?.classList.add("active");
  }
}

const categoryMeta={
 clubs:{title:'أكواب الأندية ⚽🏆',desc:'اختر ناديك المفضل واستمتع بكوب بتصميم النادي الذي تحبه.'},
 university:{title:'أكواب الجامعات 🏫',desc:'كوب يعبر عن حبك لجامعتك .. ☕🤍'},
 girls:{title:'أكواب البنات 🎀',desc:'تصاميم لطيفة تضيف لمسة جميلة ليومك 🤍'},
 quotes:{title:'أكواب عبارات 💬',desc:'كلمات تعبّر عنك… وتصاميم تخلي كوبك مميز ☕🤍'},
 redbull:{title:'أكواب Red Bull المضيئة ⚡',desc:'خلك مميز مع أكواب Red Bull المضيئة ✨'},
 stanley:{title:'أكواب Stanley 🥤',desc:'أكواب Stanley لمحبي الأناقة والعملية.'},
 mugs:{title:'المجات ☕',desc:'ألوان بسيطة وجميلة تناسب قهوتك ومشروباتك اليومية ☕🤍'},
 coffee:{title:'سيرفر وقمع قهوة ☕',desc:'كل ما تحتاجه لتحضير قهوتك بطريقة أنيقة وممتعة.'},
 wallets:{title:'المحافظ 👛',desc:'تصاميم بسيطة وأنيقة للاستخدام اليومي.'},
 'makeup-bags':{title:'حقيبة مكياج 💄',desc:'حقيبة عملية وأنيقة لترتيب أغراضك ومكياجك بكل سهول'}
};
async function loadCategoriesPage(){const box=document.getElementById("categoriesSections");if(!box)return;try{const products=await fetchProducts();const slugs=Object.keys(categoryMeta);document.getElementById("categoryIndex").innerHTML=slugs.map(s=>`<a href="#cat-${s}" class="category-index-card"><span>${categoryMeta[s].title}</span></a>`).join("");box.innerHTML=slugs.map(s=>{const rows=products.filter(p=>p.category?.slug===s);return `<section class="category-section" id="cat-${s}"><div class="category-title"><h2>${categoryMeta[s].title}</h2><p>${categoryMeta[s].desc}</p></div><div class="page-products-grid" id="grid-${s}"></div></section>`}).join("");slugs.forEach(s=>renderProductCards(document.getElementById(`grid-${s}`),products.filter(p=>p.category?.slug===s),"لا توجد منتجات في هذا القسم حاليًا."))}catch(e){console.error(e);box.innerHTML='<div class="shop-state">تعذر تحميل الأقسام حاليًا.</div>'}}

async function loadProductPage(){const box=document.getElementById("productDetail");if(!box)return;const id=new URLSearchParams(location.search).get("id");if(!id){box.innerHTML='<div class="shop-state">المنتج غير موجود.</div>';return}try{const {data,error}=await athrSupabase.from("products").select(`id,name,price,image_url,category:categories(name,slug)`).eq("id",id).maybeSingle();if(error)throw error;if(!data){box.innerHTML='<div class="shop-state">المنتج غير موجود.</div>';return}box.innerHTML=`<div class="product-detail-image"><img src="${escapeHtml(data.image_url)}" alt="${escapeHtml(data.name)}"></div><div class="product-detail-info"><span class="category-label">${escapeHtml(data.category?.name||'أثر')}</span><h1>${escapeHtml(data.name)}</h1><div class="detail-price">${Number(data.price).toFixed(3)} ر.ع</div><p class="detail-note">منتج من تشكيلتنا في متجر أثر. اختره وأضفه إلى السلة لإكمال طلبك.</p><button class="primary-large" id="detailAdd">أضف للسلة</button></div>`;document.getElementById("detailAdd").onclick=()=>addAthrProductToCart(data);document.title=`${data.name} | أثر`}catch(e){console.error(e);box.innerHTML='<div class="shop-state">تعذر تحميل المنتج حاليًا.</div>'}}

function getCart(){try{return JSON.parse(localStorage.getItem("athr_cart")||"[]")}catch{return []}}
function saveCart(c){localStorage.setItem("athr_cart",JSON.stringify(c));updateAthrCartCount()}
function addAthrProductToCart(product){const cart=getCart();const found=cart.find(x=>x.id===product.id);if(found)found.quantity+=1;else cart.push({id:product.id,name:product.name,price:Number(product.price),image_url:product.image_url,quantity:1});saveCart(cart);showMiniToast("تمت إضافة المنتج إلى السلة 🤍")}
function updateAthrCartCount(){const count=getCart().reduce((s,x)=>s+Number(x.quantity||0),0);document.querySelectorAll(".cart-count").forEach(x=>x.textContent=count)}
function showMiniToast(msg){let t=document.getElementById("athrToast");if(!t){t=document.createElement("div");t.id="athrToast";t.className="athr-mini-toast";document.body.appendChild(t)}t.textContent=msg;t.classList.add("show");clearTimeout(window._athrToast);window._athrToast=setTimeout(()=>t.classList.remove("show"),1800)}
function escapeHtml(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}

async function loadCartPage(){
  const box=document.getElementById("cartContent");
  if(!box)return;

  function render(){
    const cart=getCart();

    if(!cart.length){
      box.innerHTML='<div class="empty-cart">السلة فارغة حاليًا 🤍<br><a href="shop.html" class="primary-large" style="display:inline-flex;align-items:center;margin-top:18px">ابدأ التسوق</a></div>';
      return;
    }

    const total=cart.reduce(
      (s,x)=>s+Number(x.price)*Number(x.quantity),
      0
    );

    const whatsappMessage=`✨طلب جديد من متجر أثر OM✨

${cart.map(x=>`🛍️ ${x.name} - ${(Number(x.price)*Number(x.quantity)).toFixed(3)} ر.ع`).join('\n')}


━━━━━━━━━━━━━━━━━━
💰 مجموع الطلب: ${total.toFixed(3)} ر.ع
━━━━━━━━━━━━━━━━━━

🏦 بيانات التحويل البنكي:
👤 الاسم: Hazaa Alsheyadi
📱 رقم التحويل: 77336242

📸 بعد التحويل يرجى إرسال إيصال التحويل لإكمال الطلب. شكرًا لتسوقكم من متجر أثر♥️🪄.`;

    box.innerHTML=`
      <div class="cart-list">
        ${cart.map(x=>`
          <div class="cart-item">
            <img src="${escapeHtml(x.image_url)}" alt="${escapeHtml(x.name)}">
            <div>
              <h3>${escapeHtml(x.name)}</h3>
              <p>${Number(x.price).toFixed(3)} ر.ع</p>
            </div>

            <div class="qty-control">
              <button data-minus="${escapeHtml(x.id)}">−</button>
              <strong>${x.quantity}</strong>
              <button data-plus="${escapeHtml(x.id)}">+</button>
            </div>

            <button class="remove-item" data-remove="${escapeHtml(x.id)}">
              حذف
            </button>
          </div>
        `).join('')}
      </div>

      <div class="cart-summary">
        <strong>الإجمالي: ${total.toFixed(3)} ر.ع</strong>

        <a
          class="primary-large"
          target="_blank"
          rel="noopener"
          href="https://wa.me/96877336242?text=${encodeURIComponent(whatsappMessage)}"
        >
          إتمام الطلب عبر واتساب
        </a>
      </div>
    `;

    box.querySelectorAll('[data-minus]').forEach(
      b=>b.onclick=()=>changeQty(b.dataset.minus,-1)
    );

    box.querySelectorAll('[data-plus]').forEach(
      b=>b.onclick=()=>changeQty(b.dataset.plus,1)
    );

    box.querySelectorAll('[data-remove]').forEach(
      b=>b.onclick=()=>{
        saveCart(getCart().filter(x=>x.id!==b.dataset.remove));
        render();
      }
    );
  }

  function changeQty(id,d){
    const c=getCart();
    const x=c.find(i=>i.id===id);

    if(!x)return;

    x.quantity+=d;

    if(x.quantity<=0){
      saveCart(c.filter(i=>i.id!==id));
    }else{
      saveCart(c);
    }

    render();
  }

  render();
}
