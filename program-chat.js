(function () {
  const API = "https://study-in-taiwan-api.philips-kie.workers.dev";
  const root = document.querySelector("[data-program-chat]");
  if (!root) return;
  const messages = root.querySelector("[data-chat-messages]");
  const form = root.querySelector("[data-chat-form]");
  const input = root.querySelector("[data-chat-input]");
  const submit = root.querySelector("[data-chat-submit]");
  const languageButtons = root.querySelectorAll("[data-chat-lang]");

  // Add another language by providing the same keys in this dictionary.
  const copy = {
    en: { title: "Ask the Study in Taiwan AI consultant", subtitle: "Search active programs from the official database and open the source for each result.", ask: "Ask", placeholder: "Try: English-taught engineering programs", suggestEngineering: "Engineering programs", suggestNtu: "National Taiwan University", welcome: "Ask me to find active Taiwan programs. I use the Study in Taiwan database and include source links; missing costs, deadlines, requirements, language, or scholarship details are shown as unknown.", searching: "Searching the Study in Taiwan database…", found: (n, q, shown) => `I found ${n} active program${n === 1 ? "" : "s"} for “${q}”. Showing ${shown}.`, none: q => `I could not find an active program matching “${q}”. Try a university, field, or program name.`, unavailable: "The program database is temporarily unavailable. Please try again shortly.", unknown: "Cost, application deadlines, admission requirements, teaching language, and scholarship details are not available in the current database unless shown above; I will not guess them.", languageUnknown: "I support English, Bahasa Indonesia, and 한국어. Please choose one of those languages.", official: "Official source", programPage: "Program page", languageMissing: "Teaching language: not available", scholarshipMissing: "Scholarship records: not available" },
    id: { title: "Tanya konsultan AI Study in Taiwan", subtitle: "Cari program aktif dari database resmi dan buka sumber untuk setiap hasil.", ask: "Tanya", placeholder: "Contoh: program teknik berbahasa Inggris", suggestEngineering: "Program teknik", suggestNtu: "National Taiwan University", welcome: "Tanyakan program Taiwan yang aktif. Saya memakai database Study in Taiwan dan menyertakan tautan sumber; biaya, deadline, syarat, bahasa, atau beasiswa yang belum tersedia akan disebut belum diketahui.", searching: "Sedang mencari di database Study in Taiwan…", found: (n, q, shown) => `Saya menemukan ${n} program aktif untuk “${q}”. Menampilkan ${shown}.`, none: q => `Saya tidak menemukan program aktif yang cocok dengan “${q}”. Coba nama universitas, bidang, atau program.`, unavailable: "Database program sedang tidak tersedia. Silakan coba lagi sebentar.", unknown: "Biaya, deadline pendaftaran, syarat masuk, bahasa pengantar, dan detail beasiswa belum tersedia di database kecuali yang ditampilkan di atas; saya tidak akan mengarangnya.", languageUnknown: "Saya mendukung Bahasa Indonesia, English, dan 한국어. Silakan pilih salah satunya.", official: "Sumber resmi", programPage: "Halaman program", languageMissing: "Bahasa pengantar: belum tersedia", scholarshipMissing: "Catatan beasiswa: belum tersedia" },
    ko: { title: "Study in Taiwan AI 컨설턴트에게 질문하세요", subtitle: "공식 데이터베이스의 현재 프로그램을 검색하고 각 결과의 출처를 확인하세요.", ask: "질문", placeholder: "예: 영어로 가르치는 공학 프로그램", suggestEngineering: "공학 프로그램", suggestNtu: "National Taiwan University", welcome: "대만의 현재 프로그램을 질문하세요. Study in Taiwan 데이터베이스와 출처 링크를 사용하며, 비용·마감일·입학 요건·수업 언어·장학금 정보가 없으면 알 수 없음으로 표시합니다.", searching: "Study in Taiwan 데이터베이스를 검색하는 중…", found: (n, q, shown) => `“${q}”에 대해 활성 프로그램 ${n}개를 찾았습니다. ${shown}개를 표시합니다.`, none: q => `“${q}”와 일치하는 활성 프로그램을 찾지 못했습니다. 대학, 분야 또는 프로그램 이름을 입력해 보세요.`, unavailable: "프로그램 데이터베이스를 잠시 사용할 수 없습니다. 잠시 후 다시 시도하세요.", unknown: "비용, 지원 마감일, 입학 요건, 수업 언어 및 장학금 세부 정보는 위에 표시된 경우를 제외하고 현재 데이터베이스에 없습니다. 추측하지 않습니다.", languageUnknown: "English, Bahasa Indonesia, 한국어를 지원합니다. 이 중 하나를 선택하세요.", official: "공식 출처", programPage: "프로그램 페이지", languageMissing: "수업 언어: 정보 없음", scholarshipMissing: "장학금 기록: 정보 없음" }
  };
  const aliases = { engineering: ["engineering", "teknik", "공학", "엔지니어링"], "computer science": ["computer science", "informatika", "ilmu komputer", "komputer", "컴퓨터"], business: ["business", "bisnis", "경영"], design: ["design", "desain", "디자인"], scholarship: ["scholarship", "beasiswa", "장학금"] };
  const saved = localStorage.getItem("studyTaiwanLanguage");
  let lang = copy[saved] ? saved : (document.documentElement.lang === "id" ? "id" : "en");

  function t(key, ...args) { const value = copy[lang][key]; return typeof value === "function" ? value(...args) : value; }
  function setLanguage(next) {
    if (!copy[next]) return;
    lang = next; localStorage.setItem("studyTaiwanLanguage", next);
    root.querySelectorAll("[data-chat-i18n]").forEach(el => { el.textContent = t(el.dataset.chatI18n); });
    root.querySelectorAll("[data-chat-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.chatI18nPlaceholder); el.setAttribute("aria-label", t("title")); });
    languageButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.chatLang === lang)));
    document.documentElement.lang = next;
  }
  function detectLanguage(text) {
    if (/[\uac00-\ud7af]/.test(text)) return "ko";
    if (/\b(bahasa indonesia|indonesia|universitas|program|teknik|beasiswa|dengan|untuk|di|dan|cari|tolong)\b/i.test(text)) return "id";
    if (/\b(english|inggris|korean|korea|bahasa)\b/i.test(text)) return /korean|korea/i.test(text) ? "ko" : "en";
    return lang;
  }
  function normalizedQuery(text) {
    let value = text.trim().replace(/\b(국립대만대학교|국립대만 대학)\b/gi, "National Taiwan University");
    Object.entries(aliases).forEach(([english, words]) => words.forEach(word => { value = value.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), english); }));
    return value.replace(/\b(please|tolong|cari|find|search|program|programs|di|at|yang|untuk|with|in|dan|and)\b/gi, " ").replace(/\s+/g, " ").trim();
  }
  function queryFor(text) {
    const original = text.trim();
    const params = new URLSearchParams({ limit: "5" });
    const knownUniversity = original.match(/National Taiwan University(?: of [A-Za-z ]+)?/i)?.[0] || (/국립대만대학교/i.test(original) ? "National Taiwan University" : null);
    if (knownUniversity) {
      params.set("university", knownUniversity);
      const remainder = normalizedQuery(original.replace(knownUniversity, ""));
      if (remainder) params.set("q", remainder);
    } else params.set("q", normalizedQuery(original) || original);
    return params;
  }
  function addMessage(text, kind) { const el = document.createElement("div"); el.className = `program-chat__message program-chat__message--${kind}`; el.textContent = text; messages.appendChild(el); messages.scrollTop = messages.scrollHeight; return el; }
  function addLink(parent, label, url) { if (!url) return; const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = label; parent.appendChild(a); }
  function renderResults(data, query) {
    const wrap = document.createElement("div"); wrap.className = "program-chat__message program-chat__message--assistant";
    const intro = document.createElement("div"); intro.textContent = data.total ? t("found", data.total, query, data.results.length) : t("none", query); wrap.appendChild(intro);
    if (data.results.length) {
      const list = document.createElement("div"); list.className = "program-chat__result";
      data.results.slice(0, 5).forEach(program => {
        const card = document.createElement("div"); card.className = "program-chat__card";
        const title = document.createElement("strong"); title.textContent = `${program.program_name} — ${program.university}`; card.appendChild(title);
        const details = document.createElement("small"); details.textContent = [program.field, program.levels, program.region, program.teaching_language || t("languageMissing"), program.scholarship_records == null ? t("scholarshipMissing") : `${lang === "ko" ? "장학금 기록" : lang === "id" ? "Catatan beasiswa" : "Scholarship records"}: ${program.scholarship_records}`].filter(Boolean).join(" · "); card.appendChild(details);
        const source = document.createElement("div"); source.style.marginTop = "8px"; addLink(source, t("official"), program.portal_source_url); addLink(source, t("programPage"), program.program_url); card.appendChild(source); list.appendChild(card);
      });
      wrap.appendChild(list); const note = document.createElement("small"); note.textContent = t("unknown"); note.style.display = "block"; note.style.marginTop = "12px"; note.style.color = "#667085"; wrap.appendChild(note);
    }
    messages.appendChild(wrap); messages.scrollTop = messages.scrollHeight;
  }
  async function ask(text) {
    const value = text.trim(); if (!value) return;
    const detected = detectLanguage(value); if (detected !== lang) setLanguage(detected);
    addMessage(value, "user"); input.value = ""; submit.disabled = true; const pending = addMessage(t("searching"), "assistant");
    try { const response = await fetch(`${API}/api/programs?${queryFor(value)}`, { headers: { Accept: "application/json" }, credentials: "omit", cache: "no-store" }); if (!response.ok) throw new Error("search"); const data = await response.json(); pending.remove(); renderResults(data, value); }
    catch (_) { pending.textContent = t("unavailable"); }
    finally { submit.disabled = false; input.focus(); }
  }
  languageButtons.forEach(button => button.addEventListener("click", () => setLanguage(button.dataset.chatLang)));
  document.querySelectorAll(".lang").forEach(button => button.addEventListener("click", () => setLanguage(button.dataset.lang)));
  root.querySelector("[data-chat-suggestions]")?.querySelectorAll("button").forEach(button => button.addEventListener("click", () => ask(button.dataset.query || button.textContent)));
  form.addEventListener("submit", event => { event.preventDefault(); const value = input.value; if (/^(english|inggris|bahasa inggris)$/i.test(value.trim())) { setLanguage("en"); addMessage("English", "user"); return; } if (/^(bahasa indonesia|indonesia)$/i.test(value.trim())) { setLanguage("id"); addMessage("Bahasa Indonesia", "user"); return; } if (/^(한국어|korean|korea)$/i.test(value.trim())) { setLanguage("ko"); addMessage("한국어", "user"); return; } ask(value); });
  setLanguage(lang); addMessage(t("welcome"), "assistant");
}());
