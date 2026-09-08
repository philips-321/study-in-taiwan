(function () {
  const API = "https://study-in-taiwan-api.philips-kie.workers.dev";
  const root = document.querySelector("[data-program-chat]");
  if (!root) return;
  const messages = root.querySelector("[data-chat-messages]");
  const form = root.querySelector("[data-chat-form]");
  const input = root.querySelector("[data-chat-input]");
  const submit = root.querySelector("[data-chat-submit]");
  const suggestions = root.querySelector("[data-chat-suggestions]");

  function addMessage(text, kind) {
    const el = document.createElement("div");
    el.className = `program-chat__message program-chat__message--${kind}`;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }
  function escapeText(value) { return String(value ?? ""); }
  function link(label, url) {
    if (!url) return "";
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = label;
    return a;
  }
  function renderResults(data, query) {
    const wrap = document.createElement("div");
    wrap.className = "program-chat__message program-chat__message--assistant";
    const intro = document.createElement("div");
    intro.textContent = data.total
      ? `I found ${data.total} active program${data.total === 1 ? "" : "s"} for “${query}”. Showing ${data.results.length}.`
      : `I could not find an active program matching “${query}”. Try a university, field, or program name.`;
    wrap.appendChild(intro);
    if (data.results.length) {
      const list = document.createElement("div"); list.className = "program-chat__result";
      data.results.slice(0, 5).forEach((program) => {
        const card = document.createElement("div"); card.className = "program-chat__card";
        const title = document.createElement("strong"); title.textContent = `${program.program_name} — ${program.university}`;
        card.appendChild(title);
        const details = document.createElement("small");
        details.textContent = [program.field, program.levels, program.region, program.teaching_language || "Teaching language: not available", `Scholarship records: ${program.scholarship_records ?? "not available"}`].filter(Boolean).join(" · ");
        card.appendChild(details);
        const source = document.createElement("div"); source.style.marginTop = "8px";
        const portal = link("Official source", program.portal_source_url); if (portal) source.appendChild(portal);
        const programLink = link("Program page", program.program_url); if (programLink) source.appendChild(programLink);
        card.appendChild(source); list.appendChild(card);
      });
      wrap.appendChild(list);
      const note = document.createElement("small");
      note.textContent = "Cost, application deadlines, admission requirements, and scholarship details are not available in the current database unless shown above; I will not guess them.";
      note.style.display = "block"; note.style.marginTop = "12px"; note.style.color = "#667085";
      wrap.appendChild(note);
    }
    messages.appendChild(wrap); messages.scrollTop = messages.scrollHeight;
  }
  function queryFor(text) {
    const value = text.trim();
    const universityMatch = value.match(/(?:at|from|di|universit(?:y|ies)?)\s+([A-Z][A-Za-z .&'-]{3,})/i);
    const university = value.match(/National Taiwan University(?: of [A-Za-z ]+)?/i)?.[0] || universityMatch?.[1]?.trim();
    const params = new URLSearchParams({ limit: "5" });
    if (university && /university/i.test(university)) params.set("university", university);
    else params.set("q", value);
    return params;
  }
  async function ask(text) {
    const value = text.trim(); if (!value) return;
    addMessage(value, "user"); input.value = ""; submit.disabled = true;
    const pending = addMessage("Searching the Study in Taiwan database…", "assistant");
    try {
      const response = await fetch(`${API}/api/programs?${queryFor(value)}`, { headers: { Accept: "application/json" }, credentials: "omit", cache: "no-store" });
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json(); pending.remove(); renderResults(data, value);
    } catch (_) { pending.textContent = "The program database is temporarily unavailable. Please try again shortly."; }
    finally { submit.disabled = false; input.focus(); }
  }
  form.addEventListener("submit", (event) => { event.preventDefault(); ask(input.value); });
  suggestions?.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => ask(button.dataset.query || button.textContent)));
  addMessage("Ask me to find active Taiwan programs. I use the Study in Taiwan database and include source links; missing costs, deadlines, requirements, language, or scholarship details are shown as unknown.", "assistant");
}());
