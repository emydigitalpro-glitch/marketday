function SellerDirectory({
  products,
  openSeller,
}: {
  products: Product[];
  openSeller: (sellerId: string) => void;
}) {
  const sellers = Array.from(
    products
      .reduce((groups, product) => {
        const listings = groups.get(product.sellerId) || [];
        listings.push(product);
        groups.set(product.sellerId, listings);
        return groups;
      }, new Map<string, Product[]>())
      .entries(),
  );
  return (
    <main className="seller-directory-page">
      <section className="directory-intro">
        <p className="eyebrow">Meet the people behind the products</p>
        <h1>Who would you like to shop with?</h1>
        <p>
          Start with a seller, browse their shop, and find something made or
          chosen with care.
        </p>
      </section>
      <div className="seller-directory-grid">
        {sellers.map(([sellerId, listings]) => {
          const seller = listings[0];
          return (
            <article className="seller-directory-card" key={sellerId}>
              <div className="seller-card-image">
                <img src={seller.image} alt="" />
                <span className="seller-card-avatar">{seller.seller[0]}</span>
              </div>
              <div className="seller-card-body">
                <p className="eyebrow">Local seller</p>
                <h2>{seller.seller}</h2>
                <p className="seller-card-location">{seller.location}</p>
                <p className="seller-card-copy">
                  {listings.length} {listings.length === 1 ? "item" : "items"}{" "}
                  available in this shop.
                </p>
                <button
                  className="primary-button full"
                  onClick={() => openSeller(sellerId)}
                >
                  Visit shop
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!sellers.length && (
        <div className="empty-state">No local sellers are available yet.</div>
      )}
    </main>
  );
}

function ShopHighlights({ products, openSeller, viewAllSellers }: { products: Product[]; openSeller: (sellerId: string) => void; viewAllSellers: () => void }) {
  const suggested = [...products].sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0)).slice(0, 3);
  const sellers = Array.from(products.reduce((groups, product) => { const current = groups.get(product.sellerId) || []; current.push(product); groups.set(product.sellerId, current); return groups; }, new Map<string, Product[]>()).values()).sort((a, b) => Math.max(...b.map((item) => item.performanceScore || 0)) - Math.max(...a.map((item) => item.performanceScore || 0))).slice(0, 3);
  const [suggestedIndex, setSuggestedIndex] = useState(0);
  const [sellerIndex, setSellerIndex] = useState(0);
  if (!suggested.length) return null;
  return <section className="shop-highlights"><div className="highlight-heading"><div><p className="eyebrow">Picked by performance</p><h2>Good places to start</h2></div><span>Sales and ratings guide these picks</span></div><div className="suggested-grid">{suggested.map((product, index) => <article className={`suggested-card ${index === suggestedIndex ? "mobile-active" : ""}`} key={product.id}><img src={product.image} alt="" /><div><strong>{product.name}</strong><small>Sold by {product.seller}</small><span>{product.rating ? `★ ${product.rating}` : "New listing"} · {money(product.price)}</span></div></article>)}</div><div className="mobile-pager" aria-label="Recommended products"><button disabled={suggestedIndex === 0} onClick={() => setSuggestedIndex((current) => Math.max(0, current - 1))}>←</button><span>{suggestedIndex + 1} / {suggested.length}</span><button disabled={suggestedIndex === suggested.length - 1} onClick={() => setSuggestedIndex((current) => Math.min(suggested.length - 1, current + 1))}>→</button></div><div className="highlight-heading seller-highlight-heading"><div><p className="eyebrow">Community favourites</p><h2>Top sellers nearby</h2></div></div><div className="top-sellers">{sellers.map((sellerProducts, index) => { const seller = sellerProducts[0]; const score = Math.max(...sellerProducts.map((item) => item.performanceScore || 0)); return <button className={`top-seller-card ${index === sellerIndex ? "mobile-active" : ""}`} key={seller.sellerId} onClick={() => openSeller(seller.sellerId)}><span className="top-seller-avatar">{seller.seller[0]}</span><span><strong>{seller.seller}</strong><small>{seller.location}</small><small>{seller.sellerRating ? `★ ${seller.sellerRating}` : "Building a reputation"} · {sellerProducts.length} {sellerProducts.length === 1 ? "listing" : "listings"}</small></span><em>{score > 0 ? "Top rated" : "New"}</em></button>; })}</div><div className="mobile-pager" aria-label="Community sellers"><button disabled={sellerIndex === 0} onClick={() => setSellerIndex((current) => Math.max(0, current - 1))}>←</button><span>{sellerIndex + 1} / {sellers.length}</span><button disabled={sellerIndex === sellers.length - 1} onClick={() => setSellerIndex((current) => Math.min(sellers.length - 1, current + 1))}>→</button></div><button className="section-link-button" onClick={viewAllSellers}>View all sellers</button></section>;
}

function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("marketday-admin-key") || "");
  const [keyInput, setKeyInput] = useState(adminKey);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [notice, setNotice] = useState("");
      const load = async (key: string) => {
    const result = await api.adminOverview(key);
    setUsers(result.users as AdminUser[]);
    setProducts(result.products as AdminProduct[]);
    setOrders(result.orders as Order[]);
  };
      useEffect(() => {
        if (!adminKey) return;
        load(adminKey).catch((adminError) => setNotice((adminError as Error).message));
      }, [adminKey]);
  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await load(keyInput);
      setAdminKey(keyInput);
      sessionStorage.setItem("marketday-admin-key", keyInput);
      setNotice("");
    } catch (adminError) {
      setNotice((adminError as Error).message);
    }
  };
  const refresh = async () => {
    try { await load(adminKey); } catch (adminError) { setNotice((adminError as Error).message); }
  };
  const approveSeller = async (id: string) => {
    await api.adminApproveSeller(adminKey, id); await refresh();
  };
  const setApproval = async (id: string, status: "approved" | "rejected") => {
    await api.adminSetApproval(adminKey, id, status); await refresh();
  };
  const setAccountStatus = async (id: string, status: "active" | "blocked") => {
    await api.adminSetAccountStatus(adminKey, id, status); await refresh();
  };
  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) return;
    const form = new FormData(event.currentTarget);
    await api.adminUpdateProduct(adminKey, selectedProduct.id, {
      name: form.get("name"), category: form.get("category"), location: form.get("location"),
      price: Number(form.get("price")), stock: Number(form.get("stock")), approvalStatus: form.get("approvalStatus"),
    });
    setSelectedProduct(null); await refresh();
  };
  if (!adminKey) return <main className="admin-login"><form className="admin-login-card" onSubmit={signIn}><p className="eyebrow">Marketday control room</p><h1>Admin sign in</h1><p>Use the private admin approval key configured on the API service.</p><label>Admin key<input type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} required /></label>{notice && <p className="form-error">{notice}</p>}<button className="primary-button full">Open dashboard</button><a href="/marketday/">Return to marketplace</a></form></main>;
  const showAccounts = activeTab === "accounts";
  if (showAccounts) return <AdminAccounts users={users} approve={setApproval} setStatus={setAccountStatus} back={() => setActiveTab("overview")} />;
  const pendingSellers = users.filter((item) => item.role === "seller" && item.approvalStatus === "pending").length;
  const pendingProducts = products.filter((item) => item.approvalStatus === "pending_review").length;
  return <main className="admin-page"><aside className="admin-sidebar"><div className="admin-brand"><span className="brand-mark">m</span><strong>marketday</strong><small>Admin studio</small></div><nav><button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button><button className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>Products <b>{pendingProducts}</b></button><button className={activeTab === "accounts" ? "active" : ""} onClick={() => setActiveTab("accounts")}>Accounts <b>{pendingSellers}</b></button></nav><a href="/marketday/">View marketplace</a></aside><section className="admin-content"><header className="admin-topbar"><div><p className="eyebrow">Operations</p><h1>{activeTab === "overview" ? "Good morning, admin." : activeTab === "products" ? "Product review" : "Account management"}</h1></div><button className="text-button" onClick={() => { sessionStorage.removeItem("marketday-admin-key"); setAdminKey(""); }}>Sign out</button></header>{notice && <p className="admin-notice">{notice}</p>}{activeTab === "overview" && <><div className="admin-metrics"><div><small>Total accounts</small><strong>{users.length}</strong></div><div><small>Live products</small><strong>{products.filter((item) => item.approvalStatus !== "pending_review").length}</strong></div><div><small>Needs review</small><strong>{pendingProducts + pendingSellers}</strong></div><div><small>Orders</small><strong>{orders.length}</strong></div></div><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Attention needed</p><h2>Review queue</h2></div><button className="section-link-button" onClick={() => setActiveTab("products")}>Manage products</button></div><div className="admin-queue"><span>{pendingSellers} seller applications waiting</span><span>{pendingProducts} products waiting</span></div></section></>}{activeTab === "products" && <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Catalog control</p><h2>Every product in the marketplace</h2></div></div><div className="admin-table">{products.map((product) => <div className="admin-row" key={product.id}><img src={product.image} alt="" /><div><strong>{product.name}</strong><small>{product.seller} · {product.category}</small></div><span className={`admin-status ${product.approvalStatus || "approved"}`}>{product.approvalStatus === "pending_review" ? "Needs review" : product.approvalStatus || "Approved"}</span><button className="section-link-button" onClick={() => setSelectedProduct(product)}>Edit</button></div>)}</div></section>}{activeTab === "accounts" && <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">People and shops</p><h2>Every account</h2></div></div><div className="admin-table">{users.map((account) => <div className="admin-row account-row" key={account.id}><div className="admin-avatar">{account.name[0]}</div><div><strong>{account.name}</strong><small>{account.email} · {account.role}</small></div><span className={`admin-status ${account.accountStatus || "active"}`}>{account.approvalStatus === "pending" ? "Seller review" : account.accountStatus || "Active"}</span><div className="admin-actions">{account.role === "seller" && account.approvalStatus === "pending" && <button className="primary-button small" onClick={() => approveSeller(account.id)}>Approve</button>}<button className="section-link-button" onClick={() => setAccountStatus(account.id, account.accountStatus === "blocked" ? "active" : "blocked")}>{account.accountStatus === "blocked" ? "Unblock" : "Block"}</button></div></div>)}</div></section>}{selectedProduct && <div className="modal-backdrop"><form className="modal admin-edit-modal" onSubmit={saveProduct}><button type="button" className="modal-close" onClick={() => setSelectedProduct(null)}>×</button><p className="eyebrow">Catalog editor</p><h2>Edit product</h2><label>Name<input name="name" defaultValue={selectedProduct.name} required /></label><label>Category<input name="category" defaultValue={selectedProduct.category} required /></label><label>Location<input name="location" defaultValue={selectedProduct.location} required /></label><div className="form-row"><label>Price<input name="price" type="number" defaultValue={selectedProduct.price} required /></label><label>Stock<input name="stock" type="number" defaultValue={selectedProduct.stock} required /></label></div><label>Status<select name="approvalStatus" defaultValue={selectedProduct.approvalStatus || "approved"}><option value="approved">Approved</option><option value="pending_review">Pending review</option><option value="rejected">Rejected</option></select></label><button className="primary-button full">Save changes</button></form></div>}</section></main>;
}

function AdminAccounts({ users, approve, setStatus, back }: { users: AdminUser[]; approve: (id: string, status: "approved" | "rejected") => Promise<void>; setStatus: (id: string, status: "active" | "blocked") => Promise<void>; back: () => void }) {
  return <main className="admin-page"><aside className="admin-sidebar"><div className="admin-brand"><span className="brand-mark">m</span><strong>marketday</strong><small>Admin studio</small></div><nav><button onClick={back}>Overview</button><button className="active">Accounts</button></nav><a href="/marketday/">View marketplace</a></aside><section className="admin-content"><header className="admin-topbar"><div><p className="eyebrow">People and shops</p><h1>Account management</h1></div><button className="text-button" onClick={back}>Back to overview</button></header><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Approval workflow</p><h2>Buyers and sellers</h2></div></div><div className="admin-table">{users.map((account) => <div className="admin-row account-row" key={account.id}><div className="admin-avatar">{account.name[0]}</div><div><strong>{account.name}</strong><small>{account.email} · {account.role}</small></div><span className={`admin-status ${account.approvalStatus === "rejected" ? "rejected" : account.accountStatus || "active"}`}>{account.approvalStatus === "rejected" ? "Rejected" : account.approvalStatus === "pending" ? "Awaiting approval" : account.accountStatus || "Active"}</span><div className="admin-actions"><button className="primary-button small" onClick={() => approve(account.id, "approved")}>Approve</button><button className="section-link-button" onClick={() => approve(account.id, "rejected")}>Reject</button><button className="section-link-button" onClick={() => setStatus(account.id, account.accountStatus === "blocked" ? "active" : "blocked")}>{account.accountStatus === "blocked" ? "Unblock" : "Block"}</button></div></div>)}</div></section></section></main>;
}

function ProductPage({ products, add, openSeller, back }: { products: Product[]; add: (product: Product) => void; openSeller: (sellerId: string) => void; back: () => void }) {
  return <main className="product-page"><button className="back-button" onClick={back}>← Back to home</button><div className="product-page-heading"><div><p className="eyebrow">The full marketplace</p><h1>Browse all products</h1><p>Explore products from local sellers and open a seller's shop before you buy.</p></div><span>{products.length} available items</span></div><div className="listing-grid product-page-grid">{products.map((product) => <article className="listing-card" key={product.id}><div className="listing-image"><img src={product.image} alt={product.name} />{product.tag && <span className="listing-tag">{product.tag}</span>}</div><div className="listing-info"><div className="listing-title"><h3>{product.name}</h3><strong>{money(product.price)}</strong></div><div className="product-seller"><span className="seller-label">Sold by</span><button className="seller-link" onClick={() => openSeller(product.sellerId)}>{product.seller}</button></div><span className="listing-location">⌖ {product.location}</span><button className="add-button" onClick={() => add(product)}>Add to cart</button></div></article>)}</div>{!products.length && <div className="empty-state">No products are available yet.</div>}</main>;
}

function SellerShop({
  sellerId,
  products,
  back,
  add,
  contact,
}: {
  sellerId: string;
  products: Product[];
  back: () => void;
  add: (product: Product) => void;
  contact: (sellerId: string) => void;
}) {
  const listings = products.filter((product) => product.sellerId === sellerId);
  const seller = listings[0];
  const [profile, setProfile] = useState<{
    shopName?: string;
    shopDescription?: string;
    shopLocation?: string;
    shopImage?: string;
  } | null>(null);
  useEffect(() => {
    api
      .sellerProfile(sellerId)
      .then((result) => setProfile(result.seller))
      .catch(() => undefined);
  }, [sellerId]);
  if (!seller && !profile)
    return (
      <main className="account-page">
        <div className="account-empty">
          <h2>Shop not found.</h2>
          <button className="primary-button" onClick={back}>
            Back to marketplace
          </button>
        </div>
      </main>
    );
  return (
    <main className="seller-shop-page">
      <button className="back-button" onClick={back}>
        ← Back to marketplace
      </button>
      <section className="seller-profile">
        <div className="profile-badge">
          {(profile?.shopName || seller?.seller || "S")[0]}
        </div>
        <div>
          <p className="eyebrow">Independent seller</p>
          <h1>{profile?.shopName || seller?.seller}</h1>
          <p className="seller-location">
            {profile?.shopLocation || seller?.location || "Local seller"}
          </p>
          <p className="seller-description">
            {profile?.shopDescription ||
              "A local seller sharing carefully selected products with the Marketday community."}
          </p>
        </div>
        <div className="seller-stats">
          <strong>{listings.length}</strong>
          <span>active listings</span>
          <strong>Local</strong>
          <span>seller status</span>
        </div>
      </section>
      <div className="seller-shop-heading">
        <div>
          <p className="eyebrow">Seller shop</p>
          <h2>Browse this seller's work</h2>
        </div>
        <span>
          {listings.length} {listings.length === 1 ? "item" : "items"}
        </span>
      </div>
      <button className="contact-seller-button" onClick={() => contact(sellerId)}>Contact this seller</button>
      <div className="listing-grid seller-listing-grid">
        {listings.map((product) => (
          <article className="listing-card" key={product.id}>
            <div className="listing-image">
              <img src={product.image} alt={product.name} />
              {product.tag && (
                <span className="listing-tag">{product.tag}</span>
              )}
            </div>
            <div className="listing-info">
              <div className="listing-title">
                <h3>{product.name}</h3>
                <strong>{money(product.price)}</strong>
              </div>
              <span className="listing-location">{product.location}</span>
              <button className="add-button" onClick={() => add(product)}>
                Add to cart
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import "./App.css";

type Role = "buyer" | "seller";
type Product = {
  id: string;
  name: string;
  sellerId: string;
  seller: string;
  price: number;
  category: string;
  location: string;
  image: string;
  stock: number;
  tag?: string;
  approvalStatus?: "pending_review" | "approved";
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  performanceScore?: number;
  sellerRating?: number;
  sellerReviewCount?: number;
};
type AdminUser = User & { accountStatus?: "active" | "blocked" };
type AdminProduct = Product & { approvalStatus?: "pending_review" | "approved" | "rejected" };
type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  approvalStatus?: "pending" | "approved" | "rejected";
  profileImage?: string;
  address?: string;
  details?: string;
  shopName?: string;
  shopDescription?: string;
  shopLocation?: string;
  shopImage?: string;
  paymentEmail?: string;
  phone?: string;
  payoutReady?: boolean;
  payoutBank?: string;
  payoutAccountLast4?: string;
};
type CartItem = { productId: string; quantity: number };
type Order = {
  id: string;
  buyerId: string;
  items: CartItem[];
  total: number;
  date: string;
  status?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: string;
};
type Contact = { id: string; buyerId: string; sellerId: string; buyerName: string; buyerEmail: string; buyerPhone?: string; buyerAddress?: string; message?: string; date: string };

const categories = [
  "All items",
  "Foodstuff",
  "Fashion",
  "Electronics",
  "Beauty",
  "Home & living",
];
const productsSeed: Product[] = [
  {
    id: "eggs",
    name: "Fresh brown eggs",
    sellerId: "seed-1",
    seller: "Mama Efe Foods",
    price: 3500,
    category: "Foodstuff",
    location: "Bodija, Ibadan",
    image:
      "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=700&q=80",
    stock: 18,
    tag: "Fresh today",
  },
  {
    id: "tote",
    name: "Handwoven raffia tote",
    sellerId: "seed-2",
    seller: "Adunni Crafts",
    price: 12000,
    category: "Fashion",
    location: "Challenge, Ibadan",
    image:
      "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=700&q=80",
    stock: 7,
    tag: "Popular",
  },
  {
    id: "speaker",
    name: "Bluetooth speaker",
    sellerId: "seed-3",
    seller: "Tech Corner",
    price: 18500,
    category: "Electronics",
    location: "Mokola, Ibadan",
    image:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=80",
    stock: 5,
  },
  {
    id: "shea",
    name: "Shea butter glow set",
    sellerId: "seed-4",
    seller: "Kemi Naturals",
    price: 9800,
    category: "Beauty",
    location: "Ring Road, Ibadan",
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80",
    stock: 12,
    tag: "Made locally",
  },
];
const money = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;
function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

type Auth = {
  mode: "signin" | "signup";
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  role: Role;
  shopName: string;
  bankCode: string;
  accountNumber: string;
};
function App() {
  const [products, setProducts] = useState<Product[]>(() =>
    load("marketday-products", productsSeed),
  );
  const [user, setUser] = useState<User | null>(() =>
    load("marketday-user", null),
  );
  const [cart, setCart] = useState<CartItem[]>(() =>
    load("marketday-cart", []),
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    load("marketday-orders", []),
  );
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState<
    "shop" | "products" | "account" | "seller" | "sellers" | "settings"
  >("shop");
  const [selectedSeller, setSelectedSeller] = useState("");
  const [category, setCategory] = useState("All items");
  const [query, setQuery] = useState("");
  const [auth, setAuth] = useState<Auth | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    price: "",
    category: "Foodstuff",
    stock: "1",
    location: "Ibadan, Nigeria",
    image: "",
  });
  const [shopDraft, setShopDraft] = useState(() => ({
    shopName: user?.shopName || "",
    shopDescription: user?.shopDescription || "",
    shopLocation: user?.shopLocation || "Ibadan, Nigeria",
    shopImage: user?.shopImage || "",
  }));
  const [settingsDraft, setSettingsDraft] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    profileImage: user?.profileImage || "",
    address: user?.address || "",
    details: user?.details || "",
    paymentEmail: user?.paymentEmail || user?.email || "",
    phone: user?.phone || "",
    businessName: user?.shopName || "",
    bankCode: "",
    accountNumber: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  }));
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  };
  useEffect(
    () => localStorage.setItem("marketday-products", JSON.stringify(products)),
    [products],
  );
  useEffect(
    () => localStorage.setItem("marketday-user", JSON.stringify(user)),
    [user],
  );
  useEffect(
    () => localStorage.setItem("marketday-cart", JSON.stringify(cart)),
    [cart],
  );
  useEffect(
    () => localStorage.setItem("marketday-orders", JSON.stringify(orders)),
    [orders],
  );
  useEffect(() => {
    api
      .products()
      .then((items) => setProducts(items as Product[]))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!user) return;
    api.session(user.id).catch(() => {
      setUser(null);
      setPage("shop");
      localStorage.removeItem("marketday-user");
    });
  }, [user]);
  useEffect(() => {
    if (user)
      api
        .orders(user.id, user.role)
        .then((items) => setOrders(items as Order[]))
        .catch(() => undefined);
  }, [user]);
  useEffect(() => {
    if (user?.role === "seller") api.sellerContacts(user.id).then((items) => setContacts(items as Contact[])).catch(() => setContacts([]));
  }, [user]);
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get(
      "reference",
    );
    if (!user || !reference) return;
    api
      .verifyPayment(reference)
      .then((result) => {
        setOrders((items) => [
          result.order as Order,
          ...items.filter((item) => item.id !== (result.order as Order).id),
        ]);
        setProducts(result.products as Product[]);
        setPage("account");
        window.history.replaceState({}, "", window.location.pathname);
        notify("Payment successful. Your order is confirmed.");
      })
      .catch((paymentError: Error) => notify(paymentError.message));
  }, [user]);
  const visible = useMemo(
    () =>
      products
        .filter(
        (item) =>
          item.stock > 0 &&
          (category === "All items" || item.category === category) &&
          `${item.name} ${item.seller} ${item.location}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0)),
    [products, category, query],
  );
  const cartItems = cart
    .map((item) => ({
      ...item,
      product: products.find((product) => product.id === item.productId),
    }))
    .filter((item): item is CartItem & { product: Product } =>
      Boolean(item.product),
    );
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const openAuth = (mode: Auth["mode"], role: Role = "buyer") => {
    setError("");
    setAuth({
      mode,
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
      role,
      shopName: "",
      bankCode: "",
      accountNumber: "",
    });
  };
  const add = (product: Product) => {
    if (!user) {
      notify("Please sign up or sign in before purchasing.");
      openAuth("signup");
      return;
    }
    if (user.role !== "buyer") {
      notify("Please use a buyer account to purchase products.");
      return;
    }
    setCart((items) => {
      const found = items.find((item) => item.productId === product.id);
      return found
        ? items.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, product.stock),
                }
              : item,
          )
        : [...items, { productId: product.id, quantity: 1 }];
    });
    setCartOpen(true);
    notify(`${product.name} added to cart.`);
  };
  const change = (id: string, amount: number) =>
    setCart((items) =>
      items.flatMap((item) => {
        if (item.productId !== id) return [item];
        const stock =
          products.find((product) => product.id === id)?.stock || item.quantity;
        return item.quantity + amount > 0
          ? [{ ...item, quantity: Math.min(item.quantity + amount, stock) }]
          : [];
      }),
    );
  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth) return;
    const email = auth.email.trim().toLowerCase();
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/.test(
        auth.password,
      );
    if (
      !auth.email ||
      !auth.password ||
      (auth.mode === "signup" &&
        (!auth.name ||
          !auth.confirmPassword ||
          auth.password !== auth.confirmPassword ||
          !auth.acceptedTerms ||
          !strongPassword ||
          (auth.role === "seller" && !auth.shopName)))
    ) {
      setError(
        auth.mode === "signup" && auth.password !== auth.confirmPassword
          ? "Passwords do not match."
          : "Use a strong password and complete all required fields.",
      );
      return;
    }
    if (auth.mode === "signup" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    try {
      const result =
        auth.mode === "signup"
          ? await api.signup({
              name: auth.name,
              email,
              password: auth.password,
              confirmPassword: auth.confirmPassword,
              acceptedTerms: auth.acceptedTerms,
              role: auth.role,
              shopName: auth.shopName,
              bankCode: auth.bankCode,
              accountNumber: auth.accountNumber,
            })
          : await api.signin({ email, password: auth.password, role: auth.role });
      const signedIn = { ...result.user };
      setUser(signedIn);
      setShopDraft({
        shopName: signedIn.shopName || "",
        shopDescription: signedIn.shopDescription || "",
        shopLocation: signedIn.shopLocation || "Ibadan, Nigeria",
        shopImage: signedIn.shopImage || "",
      });
      setSettingsDraft({
        name: signedIn.name,
        email: signedIn.email,
        profileImage: signedIn.profileImage || "",
        address: signedIn.address || "",
        details: signedIn.details || "",
        paymentEmail: signedIn.paymentEmail || signedIn.email,
        phone: signedIn.phone || "",
        businessName: signedIn.shopName || "",
        bankCode: "",
        accountNumber: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setAuth(null);
      setPage(signedIn.role === "buyer" ? "sellers" : "account");
      notify(
        signedIn.role === "seller" && signedIn.approvalStatus === "pending"
          ? "Your seller application is saved and awaiting review."
          : auth.mode === "signup"
            ? "Welcome to Marketday."
            : `Welcome back, ${signedIn.name.split(" ")[0]}.`,
      );
    } catch (authError) {
      setError(
        (authError as Error).message || "Account service is unavailable.",
      );
    }
  };
  const checkout = async () => {
    if (!user) {
      setCartOpen(false);
      openAuth("signin");
      return;
    }
    if (user.role !== "buyer") {
      notify("Switch to a buyer account to place an order.");
      return;
    }
    try {
      const payment = await api.initializePayment(cart);
      window.location.assign(payment.authorization_url);
    } catch (paymentError) {
      notify((paymentError as Error).message);
    }
  };
  const publish = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || user.role !== "seller") return;
    if (user.approvalStatus === "pending") {
      notify("Your seller account must be approved before publishing products.");
      return;
    }
    const product: Product = {
      id: crypto.randomUUID(),
      name: draft.name,
      sellerId: user.id,
      seller: user.shopName || user.name,
      price: Number(draft.price),
      category: draft.category,
      location: draft.location,
      stock: Number(draft.stock),
      image:
        draft.image ||
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=80",
      tag: "New listing",
    };
    if (!product.name || !product.price || !product.stock) {
      notify("Add a name, price and stock quantity.");
      return;
    }
    let publishMessage = "Your product is now live.";
    try {
      const result = await api.createProduct(product);
      const createdProduct = result.product as Product;
      setProducts((items) => [createdProduct, ...items]);
      publishMessage = result.reviewRequired ? "Your product was submitted for review." : publishMessage;
    } catch {
      setProducts((items) => [product, ...items]);
    }
    setDraft({
      name: "",
      price: "",
      category: "Foodstuff",
      stock: "1",
      location: "Ibadan, Nigeria",
      image: "",
    });
    notify(publishMessage);
  };
  const removeProduct = async (id: string) => {
    try {
      await api.removeProduct(id);
      setProducts((items) => items.filter((item) => item.id !== id));
      notify("Product removed from your shop.");
    } catch (removeError) {
      notify((removeError as Error).message);
    }
  };
  const saveShop = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || user.role !== "seller") return;
    try {
      const result = await api.saveSellerProfile(shopDraft);
      setUser(result.user as User);
      setShopDraft({
        shopName: result.user.shopName || "",
        shopDescription: result.user.shopDescription || "",
        shopLocation: result.user.shopLocation || "Ibadan, Nigeria",
        shopImage: result.user.shopImage || "",
      });
      notify("Your online shop is ready.");
    } catch (shopError) {
      notify((shopError as Error).message);
    }
  };
  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    try {
      const result = await api.saveAccountSettings(settingsDraft);
      const updated = result.user as User;
      setUser(updated);
      setSettingsDraft({
        ...settingsDraft,
        name: updated.name,
        email: updated.email,
        profileImage: updated.profileImage || "",
        address: updated.address || "",
        details: updated.details || "",
        paymentEmail: updated.paymentEmail || updated.email,
        phone: updated.phone || "",
        businessName: updated.shopName || "",
        bankCode: "",
        accountNumber: "",
      });
      notify(
        user.role === "seller"
          ? "Withdrawal details saved for review."
          : "Payment details saved.",
      );
    } catch (settingsError) {
      notify((settingsError as Error).message);
    }
  };
  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.changePassword(settingsDraft);
      setSettingsDraft({
        ...settingsDraft,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      notify("Password updated.");
    } catch (passwordError) {
      notify((passwordError as Error).message);
    }
  };
  const submitRating = async (input: unknown) => {
    try {
      await api.submitRating(input);
      const items = await api.products();
      setProducts(items as Product[]);
      notify("Thanks for sharing your rating.");
    } catch (ratingError) {
      notify((ratingError as Error).message);
    }
  };
  const contactSeller = async (sellerId: string) => {
    if (!user || user.role !== "buyer") return;
    try {
      await api.contactSeller({ sellerId, message: "I am interested in your shop." });
      notify("Your message was sent to the seller.");
    } catch (contactError) {
      notify((contactError as Error).message);
    }
  };
  const signOut = () => {
    setUser(null);
    setPage("shop");
    notify("You have been signed out.");
  };
  const openSellerShop = (sellerId: string) => {
    if (!user) {
      notify("Please sign in to browse seller shops.");
      openAuth("signin");
      return;
    }
    if (user.role !== "buyer") {
      notify("Seller browsing is available from a buyer account.");
      return;
    }
    setSelectedSeller(sellerId);
    setPage("seller");
  };
  if (window.location.pathname.endsWith("/admin") || new URLSearchParams(window.location.search).get("admin") === "1") return <AdminPage />;
  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => setPage("shop")}>
          <span className="brand-mark">m</span>
          <span>marketday</span>
        </button>
        <nav className="desktop-nav">
          <button onClick={() => setPage("shop")}>Shop</button>
          {user?.role !== "seller" && <button onClick={() => setPage("products")}>Products</button>}
          {user?.role === "buyer" && <button onClick={() => setPage("sellers")}>Sellers</button>}
          {user?.role === "seller" && <button onClick={() => setPage("account")}>My shop</button>}
          {user && <button onClick={() => setPage("account")}>{user.role === "seller" ? "Seller account" : "Buyer account"}</button>}
          {user && <button onClick={() => setPage("settings")}>Settings</button>}
          <a href="#support">Support</a>
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <button
                className="account-chip"
                onClick={() => setPage("account")}
              >
                {user.name[0]} <span>{user.name.split(" ")[0]}</span>
              </button>
              {user.role === "buyer" && (
                <button className="cart-button" onClick={() => setCartOpen(true)}>
                  Cart <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>
                </button>
              )}
            </>
          ) : (
            <>
              <button className="text-button" onClick={() => openAuth("signin", "buyer")}>Buyer sign in</button>
              <button className="text-button" onClick={() => openAuth("signin", "seller")}>Seller sign in</button>
              <button className="mobile-signin text-button" onClick={() => openAuth("signin")}>Sign in</button>
              <button
                className="primary-button small"
                onClick={() => openAuth("signup")}
              >
                Create account
              </button>
            </>
          )}
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={page === "shop" ? "active" : ""} onClick={() => setPage("shop")}>Shop</button>
        {user?.role !== "seller" && (
          <button className={page === "products" ? "active" : ""} onClick={() => setPage("products")}>Products</button>
        )}
        {user?.role === "buyer" && (
          <button className={page === "sellers" ? "active" : ""} onClick={() => setPage("sellers")}>Sellers</button>
        )}
        {user && (
          <button className={page === "account" ? "active" : ""} onClick={() => setPage("account")}>Account</button>
        )}
        {user?.role !== "seller" && (
          <button onClick={() => user ? setCartOpen(true) : openAuth("signin", "buyer")}>Cart <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b></button>
        )}
      </nav>
      {page === "shop" ? (
        <main>
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">Your neighbourhood marketplace</p>
              <h1>
                Good finds.
                <br />
                <em>Good people.</em>
              </h1>
              <p className="hero-description">
                Buy from people you can trust, right around you. Fresh food,
                handmade goods and everyday essentials, all in one easy place.
              </p>
              <div className="role-switch">
                <button
                  className="active"
                  onClick={() =>
                    document
                      .getElementById("shop")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  I want to buy
                </button>
                <button
                  onClick={() =>
                    user?.role === "seller"
                      ? setPage("account")
                      : openAuth("signup")
                  }
                >
                  I want to sell
                </button>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-image">
                <img
                  src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1000&q=85"
                  alt="Colourful fresh produce at a local market"
                />
                <div className="image-note">
                  <span className="note-dot"></span>
                  <span>Fresh from local sellers</span>
                </div>
              </div>
              <div className="floating-card">
                <span className="floating-icon">+</span>
                <div>
                  <strong>Supporting local</strong>
                  <small>Every purchase makes a difference</small>
                </div>
              </div>
            </div>
          </section>
          <section className="shop-section" id="shop">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Explore the marketplace</p>
                <h2>Find something good</h2>
              </div>
              <button className="location-button">
                ◎ <span>Ibadan, Nigeria</span>⌄
              </button>
            </div>
            <div className="search-row">
              <label className="search-box">
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for anything..."
                />
              </label>
              <div className="category-list">
                {categories.map((item) => (
                  <button
                    key={item}
                    className={category === item ? "selected" : ""}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <ShopHighlights products={visible} openSeller={openSellerShop} viewAllSellers={() => user?.role === "buyer" ? setPage("sellers") : openAuth("signin")} />
            <div className="listing-grid">
              {visible.slice(0, 4).map((product) => (
                <article className="listing-card" key={product.id}>
                  <div className="listing-image">
                    <img src={product.image} alt={product.name} />
                    {product.tag && (
                      <span className="listing-tag">{product.tag}</span>
                    )}
                  </div>
                  <div className="listing-info">
                    <div className="listing-title">
                      <h3>{product.name}</h3>
                      <strong>{money(product.price)}</strong>
                    </div>
                    <div className="product-seller">
                      <span className="seller-label">Sold by</span>
                      <button
                        className="seller-link"
                        onClick={() => openSellerShop(product.sellerId)}
                      >
                        {product.seller}
                      </button>
                    </div>
                    <span className="listing-location">
                      ⌖ {product.location}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            {visible.length > 4 && <button className="section-link-button product-preview-link" onClick={() => setPage("products")}>View all products</button>}
            {!visible.length && (
              <div className="empty-state">No items match your search yet.</div>
            )}
          </section>
          <section className="seller-banner">
            <div>
              <p className="eyebrow">Have something to share?</p>
              <h2>
                Turn what you have
                <br />
                into something useful.
              </h2>
              <p>
                Set up your free seller profile and reach people in your
                neighbourhood.
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() =>
                user?.role === "seller"
                  ? setPage("account")
                  : openAuth("signup")
              }
            >
              Start selling <span>→</span>
            </button>
          </section>
        </main>
      ) : page === "products" && user?.role !== "seller" ? (
        <ProductPage products={products.filter((item) => item.stock > 0).sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))} add={add} openSeller={openSellerShop} back={() => setPage("shop")} />
      ) : page === "sellers" && user?.role === "buyer" ? (
        <SellerDirectory products={products} openSeller={openSellerShop} />
      ) : page === "seller" && user?.role === "buyer" ? (
        <SellerShop
          sellerId={selectedSeller}
          products={products}
          back={() => setPage("shop")}
          add={add}
          contact={contactSeller}
        />
      ) : page === "settings" && user ? (
        <SettingsView
          user={user}
          draft={settingsDraft}
          setDraft={setSettingsDraft}
          save={saveSettings}
          savePassword={savePassword}
          back={() => setPage(user ? "account" : "shop")}
        />
      ) : (
        <AccountView
          user={user}
          products={products}
          orders={orders}
          back={() => setPage("shop")}
          signOut={signOut}
          draft={draft}
          setDraft={setDraft}
          publish={publish}
          shopDraft={shopDraft}
          setShopDraft={setShopDraft}
          saveShop={saveShop}
          remove={removeProduct}
          rate={submitRating}
          contacts={contacts}
        />
      )}
      <footer id="support">
        <span>marketday</span>
        <span>Made for local trade, with care.</span>
        <a
          className="github-link"
          href="https://github.com/emydigitalpro-glitch/marketday"
          target="_blank"
          rel="noreferrer noopener"
        >
          GitHub
        </a>
      </footer>
      {cartOpen && user?.role === "buyer" && (
        <Cart
          items={cartItems}
          total={cartTotal}
          close={() => setCartOpen(false)}
          change={change}
          checkout={checkout}
        />
      )}
      {auth && (
        <Auth
          value={auth}
          setValue={setAuth}
          error={error}
          close={() => setAuth(null)}
          submit={submitAuth}
          switchMode={() => {
            setError("");
            setAuth({
              ...auth,
              mode: auth.mode === "signin" ? "signup" : "signin",
            });
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function Auth({
  value,
  setValue,
  error,
  close,
  submit,
  switchMode,
}: {
  value: Auth;
  setValue: (value: Auth) => void;
  error: string;
  close: () => void;
  submit: (event: FormEvent) => void;
  switchMode: () => void;
}) {
  const passwordChecks = [
    ["At least 8 characters", value.password.length >= 8],
    ["One uppercase letter", /[A-Z]/.test(value.password)],
    ["One lowercase letter", /[a-z]/.test(value.password)],
    ["One number", /\d/.test(value.password)],
    ["One special character", /[^A-Za-z\d]/.test(value.password)],
  ] as const;
  return (
    <div className="modal-backdrop">
      <form className="modal auth-modal" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={close}>
          ×
        </button>
        <p className="eyebrow">Welcome to marketday</p>
        <h2>
          {value.mode === "signin"
            ? `${value.role === "seller" ? "Seller" : "Buyer"} sign in.`
            : "Create your account."}
        </h2>
        {value.mode === "signin" && <div className="role-options"><button type="button" className={value.role === "buyer" ? "selected" : ""} onClick={() => setValue({ ...value, role: "buyer" })}>Buyer sign in</button><button type="button" className={value.role === "seller" ? "selected" : ""} onClick={() => setValue({ ...value, role: "seller" })}>Seller sign in</button></div>}
        {value.mode === "signup" && (
          <>
            <label>
              Your name
              <input
                required
                value={value.name}
                onChange={(event) =>
                  setValue({ ...value, name: event.target.value })
                }
              />
            </label>
            <div className="role-options">
              <button
                type="button"
                className={value.role === "buyer" ? "selected" : ""}
                onClick={() => setValue({ ...value, role: "buyer" })}
              >
                I am buying
              </button>
              <button
                type="button"
                className={value.role === "seller" ? "selected" : ""}
                onClick={() => setValue({ ...value, role: "seller" })}
              >
                I am selling
              </button>
            </div>
            {value.role === "seller" && (
              <>
                <label>
                  Shop name
                  <input
                    required
                    value={value.shopName}
                    onChange={(event) =>
                      setValue({ ...value, shopName: event.target.value })
                    }
                  />
                </label>
              </>
            )}
          </>
        )}
        <label>
          Email address
          <input
            required
            type="email"
            value={value.email}
            onChange={(event) =>
              setValue({ ...value, email: event.target.value })
            }
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            minLength={8}
            maxLength={72}
            value={value.password}
            onChange={(event) =>
              setValue({ ...value, password: event.target.value })
            }
          />
        </label>
        {value.mode === "signup" && (
          <>
            <ul
              className="password-checklist"
              aria-label="Password requirements"
            >
              {passwordChecks.map(([label, passes]) => (
                <li className={passes ? "passes" : ""} key={label}>
                  <span aria-hidden="true">{passes ? "✓" : "○"}</span> {label}
                </li>
              ))}
            </ul>
            <label>
              Confirm password
              <input
                required
                type="password"
                minLength={8}
                maxLength={72}
                value={value.confirmPassword}
                onChange={(event) =>
                  setValue({ ...value, confirmPassword: event.target.value })
                }
              />
            </label>
            <label className="terms-check">
              <input
                required
                type="checkbox"
                checked={value.acceptedTerms}
                onChange={(event) =>
                  setValue({ ...value, acceptedTerms: event.target.checked })
                }
              />
              <span>I agree to the Marketday terms and privacy policy.</span>
            </label>
          </>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full" type="submit">
          {value.mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <p className="auth-switch-prompt">
          {value.mode === "signin" ? "New to Marketday?" : "Already have an account?"}{" "}
          <button className="switch-auth" type="button" onClick={switchMode}>
            {value.mode === "signin" ? "Create one" : "Sign in here"}
          </button>
        </p>
      </form>
    </div>
  );
}
function Cart({
  items,
  total,
  close,
  change,
  checkout,
}: {
  items: (CartItem & { product: Product })[];
  total: number;
  close: () => void;
  change: (id: string, amount: number) => void;
  checkout: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <aside className="cart-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Your basket</p>
            <h2>
              {items.length ? "Ready to check out?" : "Your cart is empty"}
            </h2>
          </div>
          <button className="modal-close" onClick={close}>
            ×
          </button>
        </div>
        {items.length ? (
          <>
            <div className="cart-items">
              {items.map(({ product, quantity }) => (
                <div className="cart-item" key={product.id}>
                  <img src={product.image} alt="" />
                  <div>
                    <strong>{product.name}</strong>
                    <small>{money(product.price)} each</small>
                    <div className="quantity">
                      <button onClick={() => change(product.id, -1)}>-</button>
                      <span>{quantity}</span>
                      <button onClick={() => change(product.id, 1)}>+</button>
                    </div>
                  </div>
                  <b>{money(product.price * quantity)}</b>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <button className="primary-button full" onClick={checkout}>
              Continue to checkout
            </button>
          </>
        ) : (
          <p className="empty-cart">
            Add something from the shop and it will show up here.
          </p>
        )}
      </aside>
    </div>
  );
}
const prepareProfileImage = (file: File) => new Promise<string>((resolve, reject) => {
  if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file."));
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const size = 480;
      const scale = Math.min(1, size / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => reject(new Error("The image could not be read."));
    image.src = String(reader.result);
  };
  reader.onerror = () => reject(new Error("The image could not be read."));
  reader.readAsDataURL(file);
});

function SettingsView({
  user,
  draft,
  setDraft,
  save,
  savePassword,
  back,
}: {
  user: User | null;
  draft: {
    name: string;
    email: string;
    profileImage: string;
    address: string;
    details: string;
    paymentEmail: string;
    phone: string;
    businessName: string;
    bankCode: string;
    accountNumber: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  setDraft: (value: {
    name: string;
    email: string;
    profileImage: string;
    address: string;
    details: string;
    paymentEmail: string;
    phone: string;
    businessName: string;
    bankCode: string;
    accountNumber: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => void;
  save: (event: FormEvent) => void;
  savePassword: (event: FormEvent) => void;
  back: () => void;
}) {
  if (!user)
    return (
      <main className="account-page">
        <div className="account-empty">
          <h2>Sign in to manage settings.</h2>
          <button className="primary-button" onClick={back}>
            Back to shop
          </button>
        </div>
      </main>
    );
  return (
    <main className="settings-page">
      <div className="account-top">
        <button className="back-button" onClick={back}>
          ← Back
        </button>
      </div>
      <div className="settings-heading">
        <p className="eyebrow">Account settings</p>
        <h1>Keep your details up to date.</h1>
        <p>
          Payment details stay private and are only used for your account
          activity.
        </p>
      </div>
      <form className="settings-form" onSubmit={save}>
        <section className="dashboard-card">
          <p className="eyebrow">Personal contact</p>
          <h2>Contact details</h2>
          <label>Full name<input required maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Email address<input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
          <label>Profile image URL <span className="optional">(optional)</span><input type="url" value={draft.profileImage.startsWith("data:") ? "" : draft.profileImage} onChange={(event) => setDraft({ ...draft, profileImage: event.target.value })} placeholder="https://..." /></label>
          <label>Upload profile image <span className="optional">(JPG, PNG, or WebP)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setDraft({ ...draft, profileImage: await prepareProfileImage(file) }); } catch { event.target.value = ""; } }} /></label>
          <label>
            Phone number
            <input
              value={draft.phone}
              onChange={(event) =>
                setDraft({ ...draft, phone: event.target.value })
              }
              placeholder="0800 000 0000"
            />
          </label>
          {user.role === "buyer" && (
            <label>
              Payment email
              <input
                required
                type="email"
                value={draft.paymentEmail}
                onChange={(event) =>
                  setDraft({ ...draft, paymentEmail: event.target.value })
                }
              />
            </label>
          )}
          <label>Address <span className="optional">(optional)</span><input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="Street, area, city" /></label>
          <label>About you <span className="optional">(optional)</span><textarea maxLength={500} value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} placeholder="Anything important you want to share" /></label>
        </section>
        {user.role === "seller" ? (
          <section className="dashboard-card">
            <p className="eyebrow">Seller withdrawals</p>
            <h2>Where should payouts go?</h2>
            <p className="settings-note">
              Your full account number is sent securely to Paystack and is not
              stored by Marketday.
            </p>
            {user.payoutReady && (
              <p className="saved-payout">
                Connected bank ending in {user.payoutAccountLast4}
              </p>
            )}
            <label>
              Business name
              <input
                required
                value={draft.businessName}
                onChange={(event) =>
                  setDraft({ ...draft, businessName: event.target.value })
                }
              />
            </label>
            <label>
              Bank code
              <input
                required
                inputMode="numeric"
                value={draft.bankCode}
                onChange={(event) =>
                  setDraft({ ...draft, bankCode: event.target.value })
                }
              />
            </label>
            <label>
              Account number
              <input
                required
                inputMode="numeric"
                value={draft.accountNumber}
                onChange={(event) =>
                  setDraft({ ...draft, accountNumber: event.target.value })
                }
              />
            </label>
          </section>
        ) : (
          <section className="dashboard-card">
            <p className="eyebrow">Buyer payments</p>
            <h2>Ready for checkout</h2>
            <p className="settings-note">
              Marketday uses Paystack checkout. We do not store card numbers or
              CVV details.
            </p>
          </section>
        )}
        <button className="primary-button" type="submit">
          Save settings
        </button>
      </form>
      <form className="settings-form security-form" onSubmit={savePassword}>
        <section className="dashboard-card">
          <p className="eyebrow">Security</p>
          <h2>Change your password</h2>
          <p className="settings-note">Use a unique password with at least 8 characters, a number, upper and lowercase letters, and a special character.</p>
          <label>Current password<input required type="password" value={draft.currentPassword} onChange={(event) => setDraft({ ...draft, currentPassword: event.target.value })} /></label>
          <label>New password<input required type="password" minLength={8} maxLength={72} value={draft.newPassword} onChange={(event) => setDraft({ ...draft, newPassword: event.target.value })} /></label>
          <label>Confirm new password<input required type="password" minLength={8} maxLength={72} value={draft.confirmPassword} onChange={(event) => setDraft({ ...draft, confirmPassword: event.target.value })} /></label>
          <button className="primary-button" type="submit">Update password</button>
        </section>
      </form>
    </main>
  );
}

function RatingForm({ orderId, targetType, targetId, label, onRate }: { orderId: string; targetType: "seller" | "product" | "buyer"; targetId: string; label: string; onRate: (input: unknown) => Promise<void> }) {
  const [score, setScore] = useState("5");
  const [comment, setComment] = useState("");
  const [complete, setComplete] = useState(false);
  if (complete) return <span className="rating-complete">Rated</span>;
  return <form className="rating-form" onSubmit={async (event) => { event.preventDefault(); await onRate({ orderId, targetType, targetId, score: Number(score), comment }); setComplete(true); }}><span>{label}</span><select value={score} onChange={(event) => setScore(event.target.value)} aria-label="Rating"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional comment" maxLength={300} /><button type="submit">Rate</button></form>;
}

function AccountView({
  user,
  products,
  orders,
  back,
  signOut,
  draft,
  setDraft,
  publish,
  shopDraft,
  setShopDraft,
  saveShop,
  remove,
  rate,
  contacts,
}: {
  user: User | null;
  products: Product[];
  orders: Order[];
  back: () => void;
  signOut: () => void;
  draft: {
    name: string;
    price: string;
    category: string;
    stock: string;
    location: string;
    image: string;
  };
  setDraft: (value: {
    name: string;
    price: string;
    category: string;
    stock: string;
    location: string;
    image: string;
  }) => void;
  publish: (event: FormEvent) => void;
  shopDraft: {
    shopName: string;
    shopDescription: string;
    shopLocation: string;
    shopImage: string;
  };
  setShopDraft: (value: {
    shopName: string;
    shopDescription: string;
    shopLocation: string;
    shopImage: string;
  }) => void;
  saveShop: (event: FormEvent) => void;
  remove: (id: string) => void;
  rate: (input: unknown) => Promise<void>;
  contacts: Contact[];
}) {
  if (!user)
    return (
      <main className="account-page">
        <div className="account-empty">
          <h2>Sign in to see your account.</h2>
          <button className="primary-button" onClick={back}>
            Back to shop
          </button>
        </div>
      </main>
    );
  const mine = products.filter((item) => item.sellerId === user.id);
  const mineOrders = user.role === "buyer" ? orders.filter((item) => item.buyerId === user.id) : orders;
  const customers = Array.from(mineOrders.reduce((groups, order) => {
    const existing = groups.get(order.buyerId) || { id: order.buyerId, name: order.buyerName || "Buyer", email: order.buyerEmail || "", phone: order.buyerPhone || "", address: order.buyerAddress || "", orders: [], total: 0 };
    existing.orders.push(order);
    existing.total += order.total;
    groups.set(order.buyerId, existing);
    return groups;
  }, new Map<string, { id: string; name: string; email: string; phone: string; address: string; orders: Order[]; total: number }>()).values());
  return (
    <main className="account-page">
      <div className="account-top">
        <button className="back-button" onClick={back}>
          ← Back to shop
        </button>
        <button className="text-button" onClick={signOut}>
          Sign out
        </button>
      </div>
      <div className="account-heading">
        <div>
          <p className="eyebrow">
            {user.role === "seller" ? "Seller workspace" : "Buyer workspace"}
          </p>
          <h1>Hello, {user.name.split(" ")[0]}.</h1>
          <p>
            {user.role === "seller"
              ? "Manage your listings and reach nearby customers."
              : "Keep track of your purchases and discover your next good find."}
          </p>
        </div>
        <div className="account-heading-actions">
          <div className="profile-badge">{user.profileImage ? <img src={user.profileImage} alt={`${user.name}'s profile`} /> : user.name[0]}</div>
        </div>
      </div>
      {user.role === "seller" ? (
        <div className="seller-workspace">
          {user.approvalStatus === "pending" && <section className="dashboard-card approval-card"><p className="eyebrow">Application received</p><h2>Your shop is under review.</h2><p>Set up your shop while our team checks your account. Product publishing will unlock after approval.</p><div className="approval-steps"><span>✓ Account created</span><span>✓ Details received</span><span>3 Review pending</span></div></section>}
          <section className="dashboard-card">
            <p className="eyebrow">Your shop</p>
            <h2>Set up your online shop</h2>
            <form
              className="product-form shop-profile-form"
              onSubmit={saveShop}
            >
              <label>
                Shop name
                <input
                  required
                  value={shopDraft.shopName}
                  onChange={(event) =>
                    setShopDraft({ ...shopDraft, shopName: event.target.value })
                  }
                  placeholder="The name buyers will see"
                />
              </label>
              <label>
                About your shop
                <textarea
                  value={shopDraft.shopDescription}
                  onChange={(event) =>
                    setShopDraft({
                      ...shopDraft,
                      shopDescription: event.target.value,
                    })
                  }
                  placeholder="Tell buyers what makes your shop special"
                  maxLength={300}
                />
              </label>
              <div className="form-row">
                <label>
                  Shop location
                  <input
                    required
                    value={shopDraft.shopLocation}
                    onChange={(event) =>
                      setShopDraft({
                        ...shopDraft,
                        shopLocation: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Shop image URL
                  <input
                    value={shopDraft.shopImage}
                    onChange={(event) =>
                      setShopDraft({
                        ...shopDraft,
                        shopImage: event.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>
              <button className="primary-button" type="submit">
                Save shop profile
              </button>
            </form>
            <h2 className="publish-heading">Add a product</h2>
            <form className="product-form" onSubmit={publish}>
              <label>
                Product name
                <input
                  required
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </label>
              <div className="form-row">
                <label>
                  Price (NGN)
                  <input
                    required
                    type="number"
                    min="1"
                    value={draft.price}
                    onChange={(event) =>
                      setDraft({ ...draft, price: event.target.value })
                    }
                  />
                </label>
                <label>
                  Stock
                  <input
                    required
                    type="number"
                    min="1"
                    value={draft.stock}
                    onChange={(event) =>
                      setDraft({ ...draft, stock: event.target.value })
                    }
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Category
                  <select
                    value={draft.category}
                    onChange={(event) =>
                      setDraft({ ...draft, category: event.target.value })
                    }
                  >
                    {categories.slice(1).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input
                    value={draft.location}
                    onChange={(event) =>
                      setDraft({ ...draft, location: event.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Image URL <span className="optional">(optional)</span>
                <input
                  value={draft.image}
                  onChange={(event) =>
                    setDraft({ ...draft, image: event.target.value })
                  }
                />
              </label>
              <label>
                Upload product image <span className="optional">(JPG, PNG, or WebP)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      setDraft({ ...draft, image: await prepareProfileImage(file) });
                    } catch {
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              <button className="primary-button" type="submit">
                Publish product
              </button>
            </form>
          </section>
          <section className="dashboard-card">
            <p className="eyebrow">Inventory</p>
            <h2>
              Your listings <span className="count">{mine.length}</span>
            </h2>
            {mine.length ? (
              <div className="seller-list">
                {mine.map((item) => (
                  <div className="seller-product" key={item.id}>
                    <img src={item.image} alt="" />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {money(item.price)} · {item.stock} in stock
                      </small>
                    </div>
                    <button
                      className="delete-button"
                      onClick={() => remove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-copy">
                Your published products will appear here.
              </p>
            )}
          </section>
          <section className="dashboard-card seller-orders-card">
            <p className="eyebrow">People who patronised your shop</p>
            <h2>Your buyers <span className="count">{customers.length}</span></h2>
            {customers.length ? <div className="customer-list">{customers.map((customer) => { const latest = [...customer.orders].sort((a, b) => b.date.localeCompare(a.date))[0]; const paidOrder = customer.orders.find((order) => order.status === "Paid"); return <div className="customer-card" key={customer.id}><div className="customer-avatar">{customer.name[0]}</div><div className="customer-details"><strong>{customer.name}</strong><small>{customer.orders.length} {customer.orders.length === 1 ? "order" : "orders"} · {money(customer.total)} spent</small><small>Last visit: {latest?.date}</small><div className="customer-contact">{customer.email && <a href={`mailto:${customer.email}`}>Email buyer</a>}{customer.phone && <a href={`tel:${customer.phone}`}>Call buyer</a>}</div></div>{paidOrder && <RatingForm orderId={paidOrder.id} targetType="buyer" targetId={customer.id} label="Rate buyer" onRate={rate} />}</div>; })}</div> : <p className="muted-copy">Buyers who complete purchases from your shop will appear here.</p>}
          </section>
          <section className="dashboard-card seller-orders-card">
            <p className="eyebrow">Buyer enquiries</p>
            <h2>People who contacted you <span className="count">{contacts.length}</span></h2>
            {contacts.length ? <div className="customer-list">{contacts.map((contact) => <div className="customer-card" key={contact.id}><div className="customer-avatar">{contact.buyerName[0]}</div><div className="customer-details"><strong>{contact.buyerName}</strong><small>{contact.date} · {contact.message || "Interested in your shop"}</small><div className="customer-contact"><a href={`mailto:${contact.buyerEmail}`}>Email buyer</a>{contact.buyerPhone && <a href={`tel:${contact.buyerPhone}`}>Call buyer</a>}</div></div></div>)}</div> : <p className="muted-copy">Buyer enquiries will appear here when someone contacts your shop.</p>}
          </section>
        </div>
      ) : (
        <section className="dashboard-card orders-card">
          <p className="eyebrow">Your activity</p>
          <h2>
            Recent orders <span className="count">{mineOrders.length}</span>
          </h2>
          {mineOrders.length ? (
            <div className="orders-list">
              {mineOrders.map((item) => (
                <div className="order-row" key={item.id}>
                  <div>
                    <strong>{item.id}</strong>
                    <small>
                      {item.date} ·{" "}
                      {item.items.reduce(
                        (sum, entry) => sum + entry.quantity,
                        0,
                      )}{" "}
                      items
                    </small>
                  </div>
                  <span className="status-pill">{item.status || "Pending"}</span>
                  <b>{money(item.total)}</b>
                  {item.status === "Paid" && (() => { const purchased = products.find((product) => product.id === item.items[0]?.productId); return purchased ? <RatingForm orderId={item.id} targetType="seller" targetId={purchased.sellerId} label={`Rate ${purchased.seller}`} onRate={rate} /> : null; })()}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-orders">
              <p>You have not placed an order yet.</p>
              <button className="primary-button" onClick={back}>
                Explore the shop
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
