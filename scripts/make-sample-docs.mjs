// Renders the fake sample documents for the seed (watermarked SAMPLE,
// not copies of real document designs). Some have planted problems.
//
// Usage: CHROME=/path/to/chrome-headless-shell node scripts/make-sample-docs.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME;
if (!CHROME) throw new Error("Set CHROME to a Chromium/Chrome binary");
const OUT = new URL("../seed/docs/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "seva-docs-"));

const base = `
  *{box-sizing:border-box} body{margin:0;font-family:"Noto Sans Telugu","Telugu Sangam MN","Telugu MN",sans-serif;background:#ddd}
  .doc{position:relative;width:900px;height:620px;margin:0;background:#fffdf7;padding:36px 44px;overflow:hidden;color:#222}
  .wm{position:absolute;inset:0;display:grid;place-items:center;font:900 120px sans-serif;color:rgba(200,30,30,.10);transform:rotate(-22deg);pointer-events:none;letter-spacing:12px}
  h1{margin:0 0 4px;font-size:30px} h2{margin:0;font-size:18px;color:#555;font-weight:500}
  table{border-collapse:collapse;width:100%;font-size:19px} td,th{border:1px solid #999;padding:6px 10px;text-align:left}
  .row{display:flex;gap:28px;font-size:21px;margin:6px 0} .k{color:#666;min-width:190px}
  .sig{position:absolute;right:60px;bottom:50px;text-align:center;font-size:17px}
  .sig .line{width:220px;border-top:1px solid #333;margin-bottom:4px}
  .scrawl{font:italic 30px "Snell Roundhand","Brush Script MT",cursive;color:#1a3d8f}
`;

const idCard = (d) => `
<div class="doc" style="background:#f4f8ff;border:6px solid #3b6fb6;border-radius:24px">
  <div class="wm">SAMPLE</div>
  <h1>గుర్తింపు కార్డు · Identity Card</h1>
  <h2>ఆధార్ నమూనా — DEMO ONLY, NOT A REAL DOCUMENT</h2>
  <div style="display:flex;gap:36px;margin-top:30px">
    <div style="width:170px;height:210px;background:#c9d6ea;border-radius:12px;display:grid;place-items:center;font-size:70px;color:#6c86ad">👤</div>
    <div style="flex:1">
      <div class="row"><span class="k">పేరు / Name</span><b>${d.nameTe}<br>${d.nameEn}</b></div>
      <div class="row"><span class="k">పుట్టిన సంవత్సరం / YoB</span><b>${d.yob}</b></div>
      <div class="row"><span class="k">లింగం / Gender</span><b>${d.gender}</b></div>
      <div class="row"><span class="k">చిరునామా / Address</span><b>${d.address}</b></div>
    </div>
  </div>
  <div style="position:absolute;bottom:40px;left:0;right:0;text-align:center;font:700 40px monospace;letter-spacing:6px">XXXX XXXX ${d.last4}</div>
</div>`;

const rationCard = (d) => `
<div class="doc" style="background:#fdf6e9;border:4px solid #b07a2a">
  <div class="wm">SAMPLE</div>
  <h1>ఆహార భద్రత కార్డు (నమూనా)</h1>
  <h2>Food Security Card — DEMO ONLY · కార్డు సంఖ్య: ${d.cardNo}</h2>
  <div class="row" style="margin-top:18px"><span class="k">కుటుంబ పెద్ద</span><b>${d.head}</b></div>
  <div class="row"><span class="k">గ్రామం / మండలం</span><b>${d.village}, ${d.mandal} మండలం, రంగారెడ్డి జిల్లా</b></div>
  <table style="margin-top:16px"><tr><th>#</th><th>సభ్యుని పేరు / Member</th><th>సంబంధం</th><th>వయస్సు</th></tr>
  ${d.members.map((m, i) => `<tr><td>${i + 1}</td><td>${m[0]}</td><td>${m[1]}</td><td>${m[2]}</td></tr>`).join("")}
  </table>
</div>`;

const salaryCert = (d) => `
<div class="doc" style="font-family:Georgia,serif">
  <div class="wm">SAMPLE</div>
  <div style="border-bottom:3px solid #2b5d34;padding-bottom:10px;margin-bottom:24px">
    <div style="font-size:32px;font-weight:700;color:#2b5d34">${d.company}</div>
    <div style="font-size:16px;color:#555">${d.companyAddress}</div>
  </div>
  <div style="text-align:right;font-size:18px">Date: ${d.date}</div>
  <h1 style="text-align:center;text-decoration:underline;font-size:26px;margin:18px 0">SALARY CERTIFICATE</h1>
  <p style="font-size:21px;line-height:1.8">This is to certify that <b>${d.name}</b>, S/o ${d.father}, R/o ${d.village},
  is working in our organisation as <b>${d.post}</b> since ${d.since}. His gross monthly salary is
  <b>Rs. ${d.monthly}/-</b> (${d.words} only).</p>
  <p style="font-size:21px">This certificate is issued on his request.</p>
  <div class="sig"><div class="scrawl">${d.signer}</div><div class="line"></div>Manager (HR)</div>
</div>`;

const selfDecl = (d) => `
<div class="doc">
  <div class="wm">SAMPLE</div>
  <h1 style="text-align:center">స్వీయ ధృవీకరణ పత్రం (ఆదాయం)</h1>
  <h2 style="text-align:center">Self-declaration of income — DEMO ONLY</h2>
  <p style="font-size:22px;line-height:1.9;margin-top:26px">
  నేను <b>${d.name}</b>, ${d.relation}, ${d.village} గ్రామం, చేవెళ్ల మండలం నివాసిని. మా కుటుంబ వార్షిక ఆదాయం
  అన్ని వనరుల నుండి <b>రూ. ${d.income}</b> మాత్రమే అని ప్రకటిస్తున్నాను.<br>
  ఆదాయ వనరులు: ${d.sources}<br>
  పై వివరాలు నిజమని ధృవీకరిస్తున్నాను.</p>
  <div style="position:absolute;left:44px;bottom:50px;font-size:18px">తేదీ: ${d.date}</div>
  <div class="sig"><div class="scrawl" style="font-family:'Telugu Sangam MN',cursive;font-style:normal">${d.sign}</div><div class="line"></div>దరఖాస్తుదారు సంతకం</div>
</div>`;

const DOCS = {
  // lakshmi: all fine
  "lakshmi-id": idCard({ nameTe: "పి. లక్ష్మి", nameEn: "P. Lakshmi", yob: 2007, gender: "స్త్రీ / F", address: "ఇం.నం. 2-41, ఆలూరు, చేవెళ్ల, రంగారెడ్డి", last4: "4821" }),
  "lakshmi-ration": rationCard({ cardNo: "TAP-1520-0331", head: "పి. వెంకటయ్య", village: "ఆలూరు", mandal: "చేవెళ్ల", members: [["పి. వెంకటయ్య", "కుటుంబ పెద్ద", 48], ["పి. యాదమ్మ", "భార్య", 42], ["పి. లక్ష్మి", "కుమార్తె", 19]] }),
  "lakshmi-income": selfDecl({ name: "పి. లక్ష్మి", relation: "పి. వెంకటయ్య గారి కుమార్తె", village: "ఆలూరు", income: "72,000", sources: "తండ్రి వ్యవసాయ కూలి పని (రోజుకు సుమారు రూ. 300).", date: "18-11-2026", sign: "లక్ష్మి" }),

  // srinivas: wrong village on ID
  "srinivas-id": idCard({ nameTe: "జి. శ్రీనివాస్", nameEn: "G. Srinivas", yob: 1984, gender: "పురుషుడు / M", address: "ఇం.నం. 5-12, కందవాడ, చేవెళ్ల, రంగారెడ్డి", last4: "7315" }),
  "srinivas-ration": rationCard({ cardNo: "TAP-1520-0912", head: "జి. శ్రీనివాస్", village: "ఆలూరు", mandal: "చేవెళ్ల", members: [["జి. శ్రీనివాస్", "కుటుంబ పెద్ద", 42], ["జి. రేణుక", "భార్య", 36], ["జి. సాయి", "కుమారుడు", 14], ["జి. శ్రావ్య", "కుమార్తె", 11]] }),
  "srinivas-income": selfDecl({ name: "జి. శ్రీనివాస్", relation: "జి. నర్సింహులు గారి కుమారుడు", village: "ఆలూరు", income: "1,10,000", sources: "ఆటో నడపడం. భార్య గృహిణి.", date: "14-11-2026", sign: "శ్రీనివాస్" }),

  // fathima: Fatima on ration card
  "fathima-id": idCard({ nameTe: "ఎస్. ఫాతిమా బేగం", nameEn: "S. Fathima Begum", yob: 1991, gender: "స్త్రీ / F", address: "ఇం.నం. 1-77, ముడిమ్యాల, చేవెళ్ల, రంగారెడ్డి", last4: "2290" }),
  "fathima-ration": rationCard({ cardNo: "TAP-1520-1408", head: "ఎస్. ఖాజా మియా (S. Khaja Miya)", village: "ముడిమ్యాల", mandal: "చేవెళ్ల", members: [["ఎస్. ఖాజా మియా", "కుటుంబ పెద్ద", 40], ["S. Fatima Begum", "భార్య", 35], ["ఎస్. ఇమ్రాన్", "కుమారుడు", 12]] }),
  "fathima-income": selfDecl({ name: "ఎస్. ఫాతిమా బేగం", relation: "ఎస్. ఖాజా మియా గారి భార్య", village: "ముడిమ్యాల", income: "60,000", sources: "ఇంట్లో టైలరింగ్. భర్త అప్పుడప్పుడు కూలి పని.", date: "21-11-2026", sign: "ఫాతిమా" }),

  // raju: 22k/month salary = 2.64L, declared 1.8L
  "raju-id": idCard({ nameTe: "బి. రాజు", nameEn: "B. Raju", yob: 2003, gender: "పురుషుడు / M", address: "ఇం.నం. 3-9, కందవాడ, చేవెళ్ల, రంగారెడ్డి", last4: "6604" }),
  "raju-ration": rationCard({ cardNo: "TAP-1520-0745", head: "బి. యాదయ్య", village: "కందవాడ", mandal: "చేవెళ్ల", members: [["బి. యాదయ్య", "కుటుంబ పెద్ద", 50], ["బి. లక్ష్మమ్మ", "భార్య", 45], ["బి. రాజు", "కుమారుడు", 23]] }),
  "raju-income": salaryCert({ company: "Sri Sai Agro Industries Pvt. Ltd.", companyAddress: "Plot 14, Industrial Area, Chevella, Ranga Reddy Dist.", date: "15-11-2026", name: "B. Raju", father: "B. Yadaiah", village: "Kandawada", post: "Machine Operator", since: "June 2023", monthly: "22,000", words: "Rupees Twenty Two Thousand", signer: "K. Prasad" }),

  // anitha: no income proof
  "anitha-id": idCard({ nameTe: "కె. అనిత", nameEn: "K. Anitha", yob: 2009, gender: "స్త్రీ / F", address: "ఇం.నం. 4-20, దేవుని ఎర్రవల్లి, చేవెళ్ల, రంగారెడ్డి", last4: "1187" }),
  "anitha-ration": rationCard({ cardNo: "TAP-1520-1630", head: "కె. మల్లేష్", village: "దేవుని ఎర్రవల్లి", mandal: "చేవెళ్ల", members: [["కె. మల్లేష్", "కుటుంబ పెద్ద", 46], ["కె. సరిత", "భార్య", 40], ["కె. అనిత", "కుమార్తె", 17], ["కె. అఖిల్", "కుమారుడు", 13]] }),

  // later-stage apps
  "narasimha-id": idCard({ nameTe: "ఎం. నరసింహ", nameEn: "M. Narasimha", yob: 1978, gender: "పురుషుడు / M", address: "ఇం.నం. 6-3, గొల్లపల్లి, చేవెళ్ల, రంగారెడ్డి", last4: "3349" }),
  "narasimha-income": selfDecl({ name: "ఎం. నరసింహ", relation: "ఎం. బాలయ్య గారి కుమారుడు", village: "గొల్లపల్లి", income: "1,20,000", sources: "3 ఎకరాల వ్యవసాయం (వర్షాధారం).", date: "17-11-2026", sign: "నరసింహ" }),
  "saroja-id": idCard({ nameTe: "డి. సరోజ", nameEn: "D. Saroja", yob: 1974, gender: "స్త్రీ / F", address: "ఇం.నం. 2-115, ఇబ్రహీంపల్లి, చేవెళ్ల, రంగారెడ్డి", last4: "9052" }),
  "saroja-income": selfDecl({ name: "డి. సరోజ", relation: "కీ.శే. డి. ఎల్లయ్య గారి భార్య", village: "ఇబ్రహీంపల్లి", income: "48,000", sources: "వ్యవసాయ కూలి పని. భర్త మరణించారు.", date: "16-11-2026", sign: "సరోజ" }),
  "padma-id": idCard({ nameTe: "వై. పద్మ", nameEn: "Y. Padma", yob: 2006, gender: "స్త్రీ / F", address: "ఇం.నం. 1-30, ఆలూరు, చేవెళ్ల, రంగారెడ్డి", last4: "5518" }),
  "krishna-id": idCard({ nameTe: "టి. కృష్ణ", nameEn: "T. Krishna", yob: 1981, gender: "పురుషుడు / M", address: "ఇం.నం. 8-1, కందవాడ, చేవెళ్ల, రంగారెడ్డి", last4: "8876" }),
  "krishna-income": selfDecl({ name: "టి. కృష్ణ", relation: "టి. రాములు గారి కుమారుడు", village: "కందవాడ", income: "1,00,000", sources: "వ్యవసాయం.", date: "16-11-2026", sign: "కృష్ణ" }),
};

for (const [name, body] of Object.entries(DOCS)) {
  const html = join(tmp, `${name}.html`);
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${base}</style>${body}`);
  execFileSync(CHROME, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=900,620",
    `--screenshot=${join(OUT, `${name}.png`)}`,
    `file://${html}`,
  ], { stdio: "ignore" });
  console.log("✓", name);
}
