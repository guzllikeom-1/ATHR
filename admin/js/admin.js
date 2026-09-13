/* =====================================================
   ATHR STORE — ADMIN DASHBOARD
   Supabase Auth + Products + Storage
===================================================== */

const BUCKET = "product-images";
let categories = [];
let allProducts = [];
let editingProduct = null;

const $ = (id) => document.getElementById(id);

const loginView = $("loginView");
const dashboardView = $("dashboardView");
const loginForm = $("loginForm");
const loginError = $("loginError");
const productModal = $("productModal");
const productForm = $("productForm");
const productsTableBody = $("productsTableBody");
const productsLoading = $("productsLoading");
const productsEmpty = $("productsEmpty");
const productsTableWrap = $("productsTableWrap");
const productSearch = $("productSearch");
const categoryFilter = $("categoryFilter");
const productImage = $("productImage");
const imagePreview = $("imagePreview");
const formMessage = $("formMessage");
const saveProductBtn = $("saveProductBtn");

function showToast(message, isError = false) {
    const toast = $("toast");
    toast.textContent = message;
    toast.className = `toast show${isError ? " error" : ""}`;
    clearTimeout(window.athrToastTimer);
    window.athrToastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setLoading(button, loading, text = "حفظ المنتج") {
    button.disabled = loading;
    button.textContent = loading ? "جاري الحفظ..." : text;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function initAdmin() {
    const { data: { session } } = await athrSupabase.auth.getSession();

    if (session) {
        const isAdmin = await verifyAdmin(session.user.id);
        if (isAdmin) {
            await enterDashboard();
            return;
        }
        await athrSupabase.auth.signOut();
    }

    showLogin();

    athrSupabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session) {
            showLogin();
            return;
        }
        const isAdmin = await verifyAdmin(session.user.id);
        if (isAdmin) await enterDashboard();
    });
}

async function verifyAdmin(userId) {
    const { data, error } = await athrSupabase
        .from("admin_users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.error(error);
        loginError.textContent = "تعذر التحقق من صلاحية الحساب.";
        return false;
    }

    if (!data) {
        loginError.textContent = "هذا الحساب ليس لديه صلاحية إدارة المتجر.";
        return false;
    }

    return true;
}

function showLogin() {
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
}

async function enterDashboard() {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    loginError.textContent = "";
    await loadCategories();
    await loadProducts();
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    const loginBtn = $("loginBtn");

    loginBtn.disabled = true;
    loginBtn.textContent = "جاري الدخول...";

    const { data, error } = await athrSupabase.auth.signInWithPassword({ email, password });

    loginBtn.disabled = false;
    loginBtn.textContent = "دخول";

    if (error) {
        loginError.textContent = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        return;
    }

    const isAdmin = await verifyAdmin(data.user.id);
    if (!isAdmin) {
        await athrSupabase.auth.signOut();
        return;
    }

    await enterDashboard();
});

$("logoutBtn").addEventListener("click", async () => {
    await athrSupabase.auth.signOut();
    showToast("تم تسجيل الخروج");
    showLogin();
});

async function loadCategories() {
    const { data, error } = await athrSupabase
        .from("categories")
        .select("id, name, slug")
        .order("name", { ascending: true });

    if (error) {
        console.error(error);
        showToast("تعذر تحميل الأقسام.", true);
        return;
    }

    categories = data || [];

    $("productCategory").innerHTML = '<option value="">اختر القسم</option>' +
        categories.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join("");

    categoryFilter.innerHTML = '<option value="all">كل الأقسام</option>' +
        categories.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join("");
}

async function loadProducts() {
    productsLoading.classList.remove("hidden");
    productsEmpty.classList.add("hidden");
    productsTableWrap.classList.add("hidden");

    const { data, error } = await athrSupabase
        .from("products")
        .select(`
            id,
            name,
            price,
            image_url,
            is_best_seller,
            is_new_arrival,
            created_at,
            category:categories (id, name, slug)
        `)
        .order("created_at", { ascending: false });

    productsLoading.classList.add("hidden");

    if (error) {
        console.error(error);
        showToast("تعذر تحميل المنتجات.", true);
        return;
    }

    allProducts = data || [];
    updateStats();
    renderProducts();
}

function updateStats() {
    $("totalCount").textContent = allProducts.length;
    $("bestCount").textContent = allProducts.filter(p => p.is_best_seller).length;
    $("newCount").textContent = allProducts.filter(p => p.is_new_arrival).length;
}

function renderProducts() {
    const search = productSearch.value.trim().toLowerCase();
    const categoryId = categoryFilter.value;

    const filtered = allProducts.filter(product => {
        const matchesSearch = !search || product.name.toLowerCase().includes(search);
        const matchesCategory = categoryId === "all" || product.category?.id === categoryId;
        return matchesSearch && matchesCategory;
    });

    if (!filtered.length) {
        productsEmpty.textContent = allProducts.length ? "لا توجد نتائج مطابقة للبحث." : "لا توجد منتجات حتى الآن.";
        productsEmpty.classList.remove("hidden");
        productsTableWrap.classList.add("hidden");
        return;
    }

    productsEmpty.classList.add("hidden");
    productsTableWrap.classList.remove("hidden");

    productsTableBody.innerHTML = filtered.map(product => {
        const date = new Date(product.created_at).toLocaleDateString("ar-OM", {
            year: "numeric", month: "short", day: "numeric"
        });
        const badges = [
            product.is_best_seller ? '<span class="badge best">⭐ الأكثر مبيعًا</span>' : "",
            product.is_new_arrival ? '<span class="badge new">🆕 وصل حديثًا</span>' : ""
        ].join("");

        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <img class="product-thumb" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">
                        <div>
                            <div class="product-name">${escapeHtml(product.name)}</div>
                            <div class="product-id">${escapeHtml(product.id.slice(0, 8))}...</div>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(product.category?.name || "—")}</td>
                <td><strong>${Number(product.price).toFixed(3)} ر.ع</strong></td>
                <td><div class="badges">${badges || '<span class="badge">المتجر</span>'}</div></td>
                <td>${date}</td>
                <td>
                    <div class="actions">
                        <button class="action-btn edit" type="button" data-edit="${escapeHtml(product.id)}">تعديل</button>
                        <button class="action-btn delete" type="button" data-delete="${escapeHtml(product.id)}">حذف</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    productsTableBody.querySelectorAll("[data-edit]").forEach(button => {
        button.addEventListener("click", () => openEditProduct(button.dataset.edit));
    });

    productsTableBody.querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", () => deleteProduct(button.dataset.delete));
    });
}

productSearch.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
$("addProductTopBtn").addEventListener("click", () => openAddProduct());

function openAddProduct() {
    editingProduct = null;
    productForm.reset();
    $("productId").value = "";
    $("oldImageUrl").value = "";
    $("modalTitle").textContent = "إضافة منتج";
    saveProductBtn.textContent = "حفظ المنتج";
    formMessage.textContent = "";
    imagePreview.innerHTML = "<span>صورة المنتج</span>";
    productModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function openEditProduct(productId) {
    const product = allProducts.find(item => item.id === productId);
    if (!product) return;

    editingProduct = product;
    $("productId").value = product.id;
    $("oldImageUrl").value = product.image_url || "";
    $("productName").value = product.name || "";
    $("productPrice").value = Number(product.price).toFixed(3);
    $("productCategory").value = product.category?.id || "";
    $("isBestSeller").checked = !!product.is_best_seller;
    $("isNewArrival").checked = !!product.is_new_arrival;
    productImage.value = "";
    imagePreview.innerHTML = product.image_url
        ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">`
        : "<span>صورة المنتج</span>";
    $("modalTitle").textContent = "تعديل المنتج";
    saveProductBtn.textContent = "حفظ التعديلات";
    formMessage.textContent = "";
    productModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    productModal.classList.add("hidden");
    document.body.style.overflow = "";
    editingProduct = null;
}

document.querySelectorAll("[data-close-modal]").forEach(element => element.addEventListener("click", closeModal));
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !productModal.classList.contains("hidden")) closeModal();
});

productImage.addEventListener("change", () => {
    const file = productImage.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        productImage.value = "";
        formMessage.textContent = "اختر ملف صورة فقط.";
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        productImage.value = "";
        formMessage.textContent = "حجم الصورة أكبر من 50MB.";
        return;
    }

    formMessage.textContent = "";
    const url = URL.createObjectURL(file);
    imagePreview.innerHTML = `<img src="${url}" alt="معاينة الصورة">`;
});

async function convertImageToJpeg(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");

                const maxSize = 2400;
                let width = img.naturalWidth;
                let height = img.naturalHeight;

                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error("تعذر تجهيز الصورة."));
                    return;
                }

                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    blob => {
                        URL.revokeObjectURL(objectUrl);

                        if (!blob) {
                            reject(new Error("تعذر تحويل الصورة."));
                            return;
                        }

                        resolve(blob);
                    },
                    "image/jpeg",
                    0.90
                );

            } catch (error) {
                URL.revokeObjectURL(objectUrl);
                reject(error);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("تعذر قراءة الصورة. جربي صورة JPG أو PNG."));
        };

        img.src = objectUrl;
    });
}

productForm.addEventListener("submit", async event => {
    event.preventDefault();
    formMessage.textContent = "";

    const name = $("productName").value.trim();
    const price = Number($("productPrice").value);
    const categoryId = $("productCategory").value;
    const isBestSeller = $("isBestSeller").checked;
    const isNewArrival = $("isNewArrival").checked;
    const selectedFile = productImage.files?.[0] || null;

    if (!name || !Number.isFinite(price) || price < 0 || !categoryId) {
        formMessage.textContent = "تأكد من إدخال الاسم والسعر والقسم بشكل صحيح.";
        return;
    }

    setLoading(saveProductBtn, true, editingProduct ? "حفظ التعديلات" : "حفظ المنتج");

    try {
        let imageUrl = editingProduct?.image_url || "";
        let uploadedPath = null;

       if (selectedFile) {
    const jpegBlob = await convertImageToJpeg(selectedFile);

    uploadedPath = `${Date.now()}-${crypto.randomUUID().replaceAll("-", "")}.jpg`;

    const { error: uploadError } = await athrSupabase.storage
        .from(BUCKET)
        .upload(uploadedPath, jpegBlob, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg"
        });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = athrSupabase.storage
        .from(BUCKET)
        .getPublicUrl(uploadedPath);

    imageUrl = publicUrlData.publicUrl;
}
        if (!imageUrl) {
            formMessage.textContent = "اختر صورة للمنتج أولًا.";
            return;
        }

        const payload = {
            name,
            price: Number(price.toFixed(3)),
            category_id: categoryId,
            image_url: imageUrl,
            is_best_seller: isBestSeller,
            is_new_arrival: isNewArrival
        };

        if (editingProduct) {
            const { error } = await athrSupabase
                .from("products")
                .update(payload)
                .eq("id", editingProduct.id);

            if (error) throw error;

            if (uploadedPath && editingProduct.image_url) {
                await deleteStorageImage(editingProduct.image_url);
            }

            showToast("تم تحديث المنتج بنجاح ✅");
        } else {
            const { error } = await athrSupabase
                .from("products")
                .insert(payload);

            if (error) {
                if (uploadedPath) await deleteStoragePath(uploadedPath);
                throw error;
            }

            showToast("تمت إضافة المنتج بنجاح ✅");
        }

        closeModal();
        await loadProducts();

    } catch (error) {
        console.error(error);
        formMessage.textContent = getFriendlyError(error);
    } finally {
        setLoading(saveProductBtn, false, editingProduct ? "حفظ التعديلات" : "حفظ المنتج");
    }
});

async function deleteProduct(productId) {
    const product = allProducts.find(item => item.id === productId);
    if (!product) return;

    const confirmed = window.confirm(
        `هل أنت متأكد من حذف المنتج:\n\n${product.name}\n\nسيتم حذفه من الموقع أيضًا.`
    );
    if (!confirmed) return;

    try {
        const { error } = await athrSupabase
            .from("products")
            .delete()
            .eq("id", productId);

        if (error) throw error;

        if (product.image_url) await deleteStorageImage(product.image_url);

        showToast("تم حذف المنتج من المتجر ✅");
        await loadProducts();
    } catch (error) {
        console.error(error);
        showToast(getFriendlyError(error), true);
    }
}

async function deleteStorageImage(publicUrl) {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = publicUrl.indexOf(marker);
    if (index === -1) return;

    const path = decodeURIComponent(publicUrl.slice(index + marker.length));
    if (path) await deleteStoragePath(path);
}

async function deleteStoragePath(path) {
    const { error } = await athrSupabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn("Storage cleanup failed:", error);
}

function getFriendlyError(error) {
    if (!error) return "حدث خطأ غير متوقع.";
    if (error.message?.includes("row-level security")) {
        return "ليس لديك صلاحية لهذه العملية. تأكد من أن حسابك مضاف في admin_users.";
    }
    if (error.message?.includes("duplicate")) return "هذا المنتج موجود مسبقًا.";
    return error.message || "حدث خطأ أثناء العملية.";
}

initAdmin();
