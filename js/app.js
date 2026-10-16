/* English B2 Path · Static course app */
(function () {
  "use strict";

  const CONFIG = { hearts: 5, passExam: 70, examQuestions: 20, xpCorrect: 10, xpLesson: 20, xpRead: 15, xpSpeak: 5 };
  const DATA = window.CAMINO || [];
  const LEVELS = window.CAMINO_LEVELS || [];
  const KEY = "english-b2-path-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const main = () => $("#main");
  const TABS = [["theory", "📘", "Theory"], ["vocabulary", "🖼️", "Vocabulary"], ["practice", "🎯", "Practice"], ["reading", "📖", "Reading"], ["speaking", "🗣️", "Speaking"]];
  const TODAY = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const YESTERDAY = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000 - 864e5).toISOString().slice(0, 10);

  let S = { xp: 0, streak: 0, last: "", mode: "open", done: {}, exam: {}, slow: false };
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (stored && typeof stored === "object") S = { ...S, ...stored, done: stored.done || {}, exam: stored.exam || {} };
  } catch (error) {
    console.error("Could not read saved course progress.", error);
  }
  const urlMode = new URLSearchParams(location.search).get("mode");
  if (urlMode === "open" || urlMode === "progressive") S.mode = urlMode === "open" ? "open" : "prog";

  let view = { name: "home", id: null, tab: null };
  let currentQuiz = null;
  let recognition = null;
  const expanded = new Set(["B2.1", "B2.2"]);
  const levelOf = id => LEVELS.find(level => level.id === id);
  const moduleOf = id => DATA.find(module => module.id === id);
  const track = (level, kind) => DATA.filter(module => module.lvl === level && module.k === kind);
  const isDone = module => !!(S.done[module.id] && S.done[module.id].pass);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const shuffle = list => {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const normalise = value => String(value).toLowerCase().replace(/[.!?,;:"()]/g, "").replace(/\s+/g, " ").trim();
  function record(id) { return S.done[id] || (S.done[id] = {}); }
  function toast(message) {
    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 2800);
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (error) {
      console.error("Could not save course progress.", error);
      toast("Progress could not be saved in this browser.");
    }
    $("#xp").textContent = S.xp;
    $("#st").textContent = S.last === TODAY() || S.last === YESTERDAY() ? S.streak : 0;
    const pill = $("#modePill");
    pill.textContent = S.mode === "prog" ? "🔒 Progressive" : "🔓 Open access";
    pill.className = "mode-pill" + (S.mode === "prog" ? " prog" : "");
    pill.title = "Change course access mode";
  }
  function bumpStreak() {
    if (S.last === TODAY()) return;
    S.streak = S.last === YESTERDAY() ? S.streak + 1 : 1;
    S.last = TODAY();
  }
  function say(text, rate) {
    if (!("speechSynthesis" in window)) {
      toast("Speech audio is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, " "));
    const americanVoice = window.speechSynthesis.getVoices().find(voice => /^en-US(?:-|$)/i.test(voice.lang));
    utterance.lang = "en-US";
    if (americanVoice) utterance.voice = americanVoice;
    utterance.rate = rate || (S.slow ? 0.75 : 0.95);
    window.speechSynthesis.speak(utterance);
  }
  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (recognition) {
      recognition.onend = null;
      recognition.stop();
      recognition = null;
    }
  }
  function levelOpen() { return true; }
  function moduleOpen(module) {
    if (S.mode !== "prog") return true;
    const modules = track(module.lvl, module.k);
    return modules.indexOf(module) <= 0 || isDone(modules[modules.indexOf(module) - 1]) || isDone(module);
  }
  function levelPct() {
    return DATA.length ? Math.round(DATA.filter(isDone).length / DATA.length * 100) : 0;
  }
  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }
  function closeNav() { $("#nav").classList.remove("open"); }

  function renderNav() {
    const nav = $("#nav");
    let html = `<button class="mi ${view.name === "home" ? "on" : ""}" data-go="#/"><span class="ic">🏠</span>Home</button>`;
    LEVELS.forEach(level => {
      html += `<button class="lvl-h" data-lvl="${esc(level.id)}"><img src="${esc(level.img)}" alt="">${esc(level.name)}<span class="pct">${levelPct()}% ${expanded.has(level.id) ? "▾" : "▸"}</span></button>`;
      if (!expanded.has(level.id)) return;
      [["g", "Grammar"], ["v", "Vocabulary"]].forEach(([kind, title]) => {
        html += `<h4>${title}</h4>`;
        track(level.id, kind).forEach((module, index) => {
          html += `<button class="mi ${view.id === module.id ? "on" : ""} ${moduleOpen(module) ? "" : "lock"}" data-mod="${esc(module.id)}"><span class="ic">${moduleOpen(module) ? module.ic : "🔒"}</span>${index + 1}. ${esc(module.t)}${isDone(module) ? '<span class="ok">✓</span>' : ""}</button>`;
          if (view.id === module.id) {
            html += `<div class="sub">${TABS.map(([tab, icon, title]) => `<button class="mi ${view.tab === tab ? "on" : ""}" data-go="#/m/${module.id}/${tab}"><span class="ic">${icon}</span>${title}${S.done[module.id] && S.done[module.id][tab] ? '<span class="ok">✓</span>' : ""}</button>`).join("")}</div>`;
          }
        });
      });
      html += `<button class="mi ${view.name === "exam" ? "on" : ""}" data-go="#/exam/${level.id}"><span class="ic">🏆</span>${esc(level.id)} course test${S.exam[level.id] ? `<span class="ok">${S.exam[level.id]}%</span>` : ""}</button>`;
    });
    html += `<h4>More</h4><button class="mi ${view.name === "progress" ? "on" : ""}" data-go="#/progress"><span class="ic">📊</span>My progress</button><button class="mi ${view.name === "settings" ? "on" : ""}" data-go="#/settings"><span class="ic">⚙️</span>Settings</button>`;
    nav.innerHTML = html;
    $$("[data-lvl]", nav).forEach(button => button.onclick = () => {
      const id = button.dataset.lvl;
      expanded.has(id) ? expanded.delete(id) : expanded.add(id);
      renderNav();
    });
    $$("[data-go]", nav).forEach(button => button.onclick = () => { closeNav(); go(button.dataset.go); });
    $$("[data-mod]", nav).forEach(button => button.onclick = () => openModule(button.dataset.mod));
  }
  function openModule(id) {
    const module = moduleOf(id);
    if (!module) return;
    if (!moduleOpen(module)) {
      toast("Complete the previous module in this section to unlock this one.");
      return;
    }
    closeNav();
    go(`#/m/${id}/theory`);
  }

  function route() {
    stopSpeech();
    window.scrollTo(0, 0);
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    if (parts[0] === "m" && moduleOf(parts[1])) {
      const module = moduleOf(parts[1]);
      if (!moduleOpen(module)) {
        toast("Complete the previous module in this section to unlock this one.");
        return go("#/");
      }
      const tab = TABS.some(item => item[0] === parts[2]) ? parts[2] : "theory";
      view = { name: "module", id: module.id, tab };
      expanded.add(module.lvl);
      renderNav();
      return showModule(module, tab);
    }
    if (parts[0] === "exam" && levelOf(parts[1])) {
      view = { name: "exam", id: null, tab: null };
      renderNav();
      return examIntro(parts[1]);
    }
    if (parts[0] === "progress") {
      view = { name: "progress", id: null, tab: null };
      renderNav();
      return progress();
    }
    if (parts[0] === "settings") {
      view = { name: "settings", id: null, tab: null };
      renderNav();
      return settings();
    }
    view = { name: "home", id: null, tab: null };
    renderNav();
    home();
  }
  function bind(root = main()) {
    $$("[data-go]", root).forEach(button => button.onclick = () => go(button.dataset.go));
    $$("[data-mod]", root).forEach(button => button.onclick = () => openModule(button.dataset.mod));
    $$("table", root).forEach(table => {
      if (table.parentNode.classList.contains("tblw")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "tblw";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }
  function home() {
    const level = LEVELS[0];
    const complete = DATA.filter(isDone).length;
    let html = `<div class="hero"><img src="assets/img/mascot.svg" alt="English B2 Path mascot"><div><h1>Welcome to English B2 Path!</h1><p>Build confident upper-intermediate English skills with ${DATA.length} focused modules.</p><p><b>${complete}/${DATA.length}</b> modules completed · <b>${levelPct()}%</b> overall progress</p><p>Grammar, vocabulary, practice, reading and speaking — all in English.</p></div></div>
      <div class="lvl-banner" style="background:${level.color}"><img src="${level.img}" alt=""><div style="flex:1"><h2>${esc(level.name)}</h2><p>${esc(level.desc)}</p><div class="pbar"><i style="width:${levelPct()}%"></i></div></div></div>
      <div class="tracks">`;
    [["g", "📘 Grammar"], ["v", "🖼️ Vocabulary"]].forEach(([kind, title]) => {
      html += `<div class="path"><h3>${title}</h3>`;
      track(level.id, kind).forEach((module, index) => {
        html += `<button class="node ${kind === "v" ? "v" : ""} ${isDone(module) ? "done" : ""} ${moduleOpen(module) ? "" : "lock"}" data-mod="${module.id}" title="${esc(module.t)}">${moduleOpen(module) ? module.ic : "🔒"}${isDone(module) ? '<span class="chk">✓</span>' : ""}</button><div class="lab">${index + 1}. ${esc(module.t)}</div>`;
      });
      html += `</div>`;
    });
    html += `</div><div class="path"><h3>🏆 Course test</h3><button class="node exam" data-go="#/exam/B2">🏆</button><div class="lab">B2 test · pass mark ${CONFIG.passExam}%</div></div>`;
    main().innerHTML = html;
    bind();
  }
  function showModule(module, tab) {
    const level = levelOf(module.lvl);
    const header = `<div class="mhead ${module.k}"><div class="ic">${module.ic}</div><div><span class="tag" style="background:${level.color}">${module.lvl}</span><span class="tag" style="background:${module.k === "g" ? "var(--gd)" : "var(--bd)"}">${module.k === "g" ? "Grammar" : "Vocabulary"}</span><h1>${esc(module.t)}</h1><div class="en">${esc(module.en)}</div></div></div><div class="tabs">${TABS.map(([id, icon, label]) => `<button class="tab ${tab === id ? "on" : ""}" data-go="#/m/${module.id}/${id}">${icon} ${label}${S.done[module.id] && S.done[module.id][id] ? ' <span class="d">✓</span>' : ""}</button>`).join("")}</div>`;
    const renderers = { theory, vocabulary, practice, reading, speaking };
    const html = renderers[tab](module);
    main().innerHTML = header + html;
    bind();
    if (tab === "vocabulary") {
      const flipped = new Set();
      const markVocabularyComplete = () => {
        record(module.id).vocabulary = 1;
        save();
        renderNav();
      };
      $$(".vcard").forEach(card => card.onclick = () => {
        card.classList.toggle("flip");
        if (card.classList.contains("flip")) flipped.add(card.dataset.i);
        else flipped.delete(card.dataset.i);
        say(module.voc[Number(card.dataset.i)][1]);
        if (flipped.size === module.voc.length) markVocabularyComplete();
      });
      $("#flipall").onclick = () => {
        $$(".vcard").forEach(card => { card.classList.add("flip"); flipped.add(card.dataset.i); });
        markVocabularyComplete();
      };
      $("#allv").onclick = () => say(module.voc.map(item => item[1]).join(". "));
    }
    if (tab === "theory") {
      $$("[data-say]").forEach(button => button.onclick = () => say(button.dataset.say));
    }
    if (tab === "reading") bindReading(module);
    if (tab === "speaking") bindSpeaking(module);
    if (tab === "practice") bindPractice();
  }
  function nextButton(module, tab) {
    const index = TABS.findIndex(item => item[0] === tab);
    return TABS[index + 1] ? `<button class="btn" data-go="#/m/${module.id}/${TABS[index + 1][0]}">${TABS[index + 1][2]} →</button>` : "";
  }
  function theory(module) {
    const formCards = module.forms ? `
      <section class="grammar-forms card" aria-labelledby="forms-title">
        <div class="theory-kicker"><span aria-hidden="true">🧩</span> Sentence builder</div>
        <h2 id="forms-title">Build the three core forms</h2>
        <p class="muted">Compare the word order in affirmative statements, negatives and questions.</p>
        <div class="forms-grid">
          ${[
            ["positive", "+", "Affirmative", "form-positive"],
            ["negative", "−", "Negative", "form-negative"],
            ["question", "?", "Question", "form-question"]
          ].map(([key, symbol, label, className]) => `<article class="form-card ${className}"><span class="form-symbol" aria-hidden="true">${symbol}</span><div class="form-copy"><span class="form-label">Core form</span><h3>${label}</h3><p>${esc(module.forms[key] || "")}</p></div></article>`).join("")}
        </div>
        <p class="form-hint"><span aria-hidden="true">💡</span> <b>Check the auxiliary:</b> in questions, the auxiliary usually comes before the subject; in negatives, add <i>not</i> after the first auxiliary.</p>
      </section>` : "";
    const sentenceTypes = `
      <section class="sentence-toolkit card">
        <div class="theory-kicker"><span aria-hidden="true">🧭</span> English sentence toolkit</div>
        <h2>Common sentence types and word order</h2>
        <p class="muted">These patterns help you turn a statement into a question, add emphasis or connect ideas naturally.</p>
        <div class="sentence-grid">
          ${[
            ["statement", "📣", "Make a statement", "Statement", "Subject + verb + complement", "The team has completed the project."],
            ["statement", "🚫", "Make it negative", "Negative statement", "Subject + auxiliary + not + verb", "The team hasn't completed the project."],
            ["question", "🔵", "Ask a yes / no question", "Yes / no question", "Auxiliary + subject + main verb?", "Has the team completed the project?"],
            ["question", "🔎", "Ask for information", "Wh- question", "Question word + auxiliary + subject + verb?", "When did the team complete the project?"],
            ["question", "🙋", "Ask about the subject", "Subject question", "Who / what + verb + complement?", "Who completed the project?"],
            ["question", "💬", "Ask indirectly", "Indirect question", "Introductory phrase + subject + verb", "Could you tell me when the team completed it?"],
            ["question", "🏷️", "Check or confirm", "Question tag", "Statement + opposite auxiliary + pronoun?", "They've finished, haven't they?"],
            ["action", "👉", "Give an instruction", "Imperative", "Base verb (+ object)", "Please send the final version today."],
            ["action", "🤝", "Make a suggestion", "Suggestion", "Why don't we / Let's + base verb", "Why don't we review the figures together?"],
            ["reaction", "✨", "Show a reaction", "Exclamation", "What a/an + adjective + noun! / How + adjective!", "What a brilliant idea! / How useful!"],
            ["connect", "🔀", "Connect a condition and result", "Conditional", "If-clause + result clause", "If we finish early, we'll check the final draft."]
          ].map(([group, icon, category, label, pattern, example], index) => `<article class="sentence-card sentence-${group}"><div class="sentence-mark" aria-hidden="true">${icon}</div><div class="sentence-content"><div class="sentence-meta"><span>${category}</span><span>${String(index + 1).padStart(2, "0")}</span></div><h3>${label}</h3><p class="sentence-pattern">${pattern.split(/(\s+\+\s+|\s+\/\s+)/).map(part => part.trim() === "+" || part.trim() === "/" ? `<span class="pattern-join">${esc(part.trim())}</span>` : `<span class="pattern-part">${esc(part.trim())}</span>`).join("")}</p><p class="sentence-example"><span>Example</span>${esc(example)}</p></div></article>`).join("")}
        </div>
        <div class="tip"><b>Indirect questions:</b> use statement word order after the opening phrase: <i>Do you know where the station is?</i> (not <i>where is the station</i>).</div>
      </section>`;
    const formPractice = module.forms && Array.isArray(module.forms.practice) && module.forms.practice.length
      ? `<section class="form-practice card"><div class="theory-kicker">Quick check</div><h2>Try the + / − / ? forms</h2><div class="form-drills">${module.forms.practice.map((item, index) => `<details class="form-drill"><summary><span>${index + 1}</span>${esc(item.q)}</summary><p class="drill-answer"><b>Answer:</b> ${esc(Array.isArray(item.a) ? item.a[0] : item.a)}<br><span>${esc(item.t)}</span></p></details>`).join("")}</div></section>`
      : "";
    const irregularPast = module.irregular ? irregularPastTheory(module.irregular) : "";
    return `${module.th}${module.k === "g" ? grammarVisual(module) : ""}${formCards}${module.k === "g" ? sentenceTypes : ""}${irregularPast}${formPractice}<div class="row">${nextButton(module, "theory")}<button class="btn sec" data-go="#/m/${module.id}/practice">🎯 Practise now</button></div>`;
  }
  function grammarVisual(module) {
    if (module.id !== "b2-present-perfect") return "";
    return `
      <section class="past-simple-visual card">
        <div class="theory-kicker">Past simple · at a glance</div>
        <h2>Finished action, finished time</h2>
        <div class="timeline" aria-label="Past events happen before the present">
          <div class="timeline-event"><span>PAST</span><b>The meeting ended</b><small>yesterday · last week · in 2022 · two hours ago</small></div>
          <div class="timeline-line"><i></i><span>NOW</span></div>
        </div>
        <div class="past-forms">
          <article class="past-form past-affirmative"><span>+</span><div><b>Subject + past form</b><p>They <strong>visited</strong> the museum.</p><small>Regular: verb + -ed · Irregular: learn the V2 form</small></div></article>
          <article class="past-form past-negative"><span>−</span><div><b>Subject + didn't + base verb</b><p>They <strong>didn't visit</strong> the museum.</p><small>After <i>didn't</i>, always use the base verb.</small></div></article>
          <article class="past-form past-question"><span>?</span><div><b>Did + subject + base verb?</b><p><strong>Did</strong> they <strong>visit</strong> the museum?</p><small>Short answers: Yes, they did. / No, they didn't.</small></div></article>
        </div>
        <div class="be-forms"><b>Special verb: BE</b><span>I / he / she / it <strong>was</strong></span><span>you / we / they <strong>were</strong></span><span>Negative: <strong>wasn't / weren't</strong></span><span>Question: <strong>Was / Were + subject?</strong></span></div>
        <div class="ed-pronunciation">
          <div class="theory-kicker">Regular past · the three -ed sounds</div>
          <h2>Pronunciation depends on the final <em>sound</em></h2>
          <p class="muted">The spelling is always <b>-ed</b>, but the ending has three pronunciations. Listen to the examples in an American English voice.</p>
          <div class="ed-sound-grid">
            <article class="ed-sound ed-t"><span class="ipa">/t/</span><h3>Voiceless sound → /t/</h3><p>After a voiceless sound such as /p/, /k/, /f/, /s/, /ʃ/ or /tʃ/. Do not add a syllable.</p><b>worked · watched · laughed</b><small>/wɝkt/ · /wɑtʃt/ · /læft/</small><button class="sound-button" data-say="worked, watched, laughed">🔊 Listen</button></article>
            <article class="ed-sound ed-d"><span class="ipa">/d/</span><h3>Voiced sound → /d/</h3><p>After a vowel or voiced consonants such as /b/, /g/, /v/, /z/, /m/, /n/, /l/ or /r/, except /d/. Touch your throat to feel the vibration; do not add a syllable.</p><b>played · cleaned · called</b><small>/pleɪd/ · /klind/ · /kɔld/</small><button class="sound-button" data-say="played, cleaned, called">🔊 Listen</button></article>
            <article class="ed-sound ed-id"><span class="ipa">/ɪd/</span><h3>Final /t/ or /d/ → /ɪd/</h3><p>Only after the sounds /t/ or /d/. This is the only -ed ending that adds a syllable.</p><b>wanted · needed · decided</b><small>/ˈwɑntɪd/ · /ˈnidɪd/ · /dɪˈsaɪdɪd/</small><button class="sound-button" data-say="wanted, needed, decided">🔊 Listen</button></article>
          </div>
          <div class="ed-spelling"><b>Spelling the regular past:</b><span>work → work<strong>ed</strong> <small>(most verbs: +ed)</small></span><span>live → liv<strong>ed</strong> <small>(final e: +d)</small></span><span>carry → carr<strong>ied</strong> <small>(consonant + y: y → ied)</small></span><span>stop → stopp<strong>ed</strong> <small>(short vowel + consonant: double it)</small></span></div>
          <div class="tip"><b>Quick test:</b> say the verb without <i>-ed</i> and listen to its final sound, not its final letter. <i>Fix</i> ends in /s/ → fixed /t/. <i>Play</i> ends in a vowel sound → played /d/. <i>Start</i> ends in /t/ → started /ɪd/.</div>
        </div>
      </section>`;
  }
  function irregularPastTheory(irregular) {
    const groups = irregular.groups.map((group, index) => `
      <details class="irregular-group" ${index === 0 ? "open" : ""}>
        <summary><span class="group-index">${String(index + 1).padStart(2, "0")}</span><span><b>${esc(group.title)}</b><small>${esc(group.note)}</small></span><span class="group-count">${group.verbs.length} verbs</span></summary>
        <div class="irregular-table-wrap"><table class="irregular-table"><thead><tr><th>Base form</th><th>Past simple (V2)</th><th>Past participle (V3)</th><th>Meaning</th></tr></thead><tbody>${group.verbs.map(([base, past, participle, meaning]) => `<tr><td>${esc(base)}</td><td><b>${esc(past)}</b></td><td>${esc(participle)}</td><td>${esc(meaning)}</td></tr>`).join("")}</tbody></table></div>
      </details>`).join("");
    return `
      <section class="irregular-lesson card">
        <div class="theory-kicker">Irregular verb master list</div>
        <h2>Past simple irregular verbs</h2>
        <p class="muted">Irregular verbs do not make the past simple with <i>-ed</i>. Learn V1 (base), V2 (past simple) and V3 (past participle). These tables group ${irregular.groups.reduce((total, group) => total + group.verbs.length, 0)} common irregular verbs by their form patterns. Alternative British and American forms are shown where they are commonly used.</p>
        <div class="verb-key"><span><b>V1</b> base form</span><span><b>V2</b> past simple</span><span><b>V3</b> past participle (used with <i>have/has/had</i>)</span><span><b>US note:</b> <i>gotten</i> is the usual American past participle of <i>get</i>.</span></div>
        <div class="irregular-groups">${groups}</div>
        <div class="tip"><b>Important:</b> use V2 after <i>did / didn't</i> only as the main verb in an affirmative sentence (<i>She went</i>). After <i>did / didn't</i>, use V1 (<i>Did she go?</i> / <i>She didn't go</i>). Use V3 after <i>have / has / had</i> (<i>She has gone</i>).</div>
        <h2 class="classification-heading">How to classify irregular verbs</h2>
        <div class="verb-class-grid">
          <article><span>TYPE 1</span><b>All three forms are the same</b><p>V1 = V2 = V3</p><i>cut – cut – cut · put – put – put</i></article>
          <article><span>TYPE 2</span><b>Past simple = past participle</b><p>V2 = V3</p><i>buy – bought – bought · teach – taught – taught</i></article>
          <article><span>TYPE 3</span><b>All three forms are different</b><p>V1 ≠ V2 ≠ V3</p><i>begin – began – begun · write – wrote – written</i></article>
          <article><span>TYPE 4</span><b>Same vowel-change families</b><p>Remember the sound pattern</p><i>sing – sang – sung · drive – drove – driven</i></article>
        </div>
        <div class="tip"><b>There is no single rule</b> that predicts every irregular form. Learn them in pattern groups, say them aloud, and practise V2 and V3 in complete sentences.</div>
      </section>`;
  }
  function vocabulary(module) {
    return `<p class="muted">Tap a card to hear the word or phrase and reveal its definition.</p><div class="row"><button class="btn sec small" id="allv">🔊 Hear all</button><button class="btn sec small" id="flipall">🔄 Flip all</button></div><div class="vgrid">${module.voc.map((item, index) => `<button class="vcard" data-i="${index}" aria-label="${esc(item[1])}"><div class="vin"><div class="vf"><span class="e">${item[0]}</span><span class="w">${esc(item[1])}</span></div><div class="vb"><span class="e" style="font-size:30px">${item[0]}</span>${esc(item[2])}</div></div></button>`).join("")}</div><div class="row">${nextButton(module, "vocabulary")}</div>`;
  }
  function createQuestions(module) {
    const questions = module.ex.map(item => item.w
      ? { ...item, type: "order" }
      : Array.isArray(item.o) ? { ...item, type: "choice" } : { ...item, type: "fill" });
    if (module.forms && Array.isArray(module.forms.practice)) {
      module.forms.practice.forEach(item => questions.push({ ...item, type: "fill" }));
    }
    if (module.irregular && Array.isArray(module.irregular.practice)) {
      module.irregular.practice.forEach(item => questions.push({ ...item, type: Array.isArray(item.o) ? "choice" : "fill" }));
    }
    const vocab = shuffle(module.voc);
    [vocab[0], vocab[1]].forEach(item => {
      const answers = shuffle([item, ...shuffle(module.voc.filter(other => other[1] !== item[1])).slice(0, 3)]);
      questions.push({ type: "image", e: item[0], o: answers.map(answer => answer[1]), a: answers.findIndex(answer => answer[1] === item[1]), t: `${item[1]} means ${item[2]}.` });
    });
    return questions;
  }
  function practice(module) {
    return `<div class="card"><h2>Practise: ${esc(module.t)}</h2><p>Choose the best answer, complete the sentence or put the words in order. You have ${CONFIG.hearts} hearts.</p><button class="btn" id="startPractice">Start practice</button></div><div id="practiceArea"></div>`;
  }
  function bindPractice() {
    $("#startPractice").onclick = () => startQuiz(createQuestions(moduleOf(view.id)), moduleOf(view.id), false);
  }
  function startQuiz(items, module, exam) {
    currentQuiz = { items: shuffle(items), module, exam, index: 0, hits: 0, hearts: CONFIG.hearts, answered: false, selected: [] };
    drawQuestion();
  }
  function drawQuestion() {
    const quiz = currentQuiz;
    const area = $("#practiceArea") || main();
    if (quiz.index >= quiz.items.length || (!quiz.exam && quiz.hearts <= 0)) return finishQuiz();
    const item = quiz.items[quiz.index];
    quiz.answered = false;
    quiz.selected = [];
    let html = `<div class="exhead"><button class="x" id="quitQuiz" title="Exit">✕</button><div class="bar"><i style="width:${quiz.index / quiz.items.length * 100}%"></i></div><span class="muted">${quiz.index + 1}/${quiz.items.length}</span>${quiz.exam ? "" : `<span class="hearts">❤️ ${quiz.hearts}</span>`}</div>`;
    if (item.type === "choice" || item.type === "image") {
      html += `<div class="kind">${item.type === "image" ? "Choose the matching expression" : "Choose the correct answer"}</div>${item.type === "image" ? `<div class="big-emoji">${item.e}</div>` : `<h2>${esc(item.q).replace(/_{2,}/g, "________")}</h2>`}<div class="${item.type === "image" ? "opts-grid" : ""}">${item.o.map((option, index) => `<button class="opt" data-answer="${index}">${item.type === "choice" ? `<span class="muted">${index + 1}</span> ` : ""}${esc(option)}</button>`).join("")}</div>`;
    } else if (item.type === "fill") {
      html += `<div class="kind">Complete the sentence</div><h2>${esc(item.q).replace(/_{2,}/g, "________")}</h2><input class="fill" id="answerInput" placeholder="Type your answer" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn" id="checkAnswer">Check</button>`;
    } else {
      quiz.words = item.w.trim().split(/\s+/);
      quiz.bank = shuffle(quiz.words.map((word, index) => index));
      quiz.line = [];
      html += `<div class="kind">Put the words in order</div><h2>${esc(item.t)}</h2><div class="answer-line" id="answerLine"></div><div class="bank" id="wordBank"></div><div class="row"><button class="btn" id="checkAnswer">Check</button><button class="btn sec small" id="clearWords">↺ Clear</button></div>`;
    }
    html += `<div id="feedback"></div>`;
    area.innerHTML = html;
    $("#quitQuiz").onclick = () => {
      if (confirm("Exit this practice? Your current answers will not be saved.")) go(quiz.exam ? "#/" : `#/m/${quiz.module.id}/practice`);
    };
    $$("[data-answer]", area).forEach(button => button.onclick = () => checkAnswer(Number(button.dataset.answer)));
    if (item.type === "fill") {
      $("#answerInput").focus();
      $("#answerInput").onkeydown = event => { if (event.key === "Enter") checkAnswer(); };
      $("#checkAnswer").onclick = () => checkAnswer();
    }
    if (item.type === "order") {
      drawWordBank();
      $("#checkAnswer").onclick = () => checkAnswer();
      $("#clearWords").onclick = () => { quiz.bank = quiz.bank.concat(quiz.line); quiz.line = []; drawWordBank(); };
    }
  }
  function drawWordBank() {
    const quiz = currentQuiz;
    const renderChip = index => `<button class="chip" data-word="${index}">${esc(quiz.words[index])}</button>`;
    $("#answerLine").innerHTML = quiz.line.map(renderChip).join("");
    $("#wordBank").innerHTML = quiz.bank.map(renderChip).join("");
    $$("[data-word]").forEach(button => button.onclick = () => {
      const index = Number(button.dataset.word);
      if (button.parentElement.id === "wordBank") {
        quiz.bank = quiz.bank.filter(word => word !== index);
        quiz.line.push(index);
      } else {
        quiz.line = quiz.line.filter(word => word !== index);
        quiz.bank.push(index);
      }
      drawWordBank();
    });
  }
  function checkAnswer(selected) {
    const quiz = currentQuiz;
    if (quiz.answered) return;
    const item = quiz.items[quiz.index];
    let correct = false;
    let answer = "";
    if (item.type === "choice" || item.type === "image") {
      if (selected === undefined) return;
      correct = selected === item.a;
      answer = item.o[item.a];
      $$("[data-answer]").forEach((button, index) => {
        button.disabled = true;
        if (index === item.a) button.classList.add("ok");
        else if (index === selected) button.classList.add("no");
      });
    } else if (item.type === "fill") {
      const value = $("#answerInput").value.trim();
      if (!value) { $("#answerInput").focus(); return; }
      const answers = Array.isArray(item.a) ? item.a : [item.a];
      answer = answers[0];
      correct = answers.some(option => normalise(option) === normalise(value));
      $("#answerInput").disabled = true;
    } else {
      if (!quiz.line.length) return;
      answer = item.w;
      correct = normalise(quiz.line.map(index => quiz.words[index]).join(" ")) === normalise(item.w);
    }
    quiz.answered = true;
    if (correct) {
      quiz.hits++;
      S.xp += CONFIG.xpCorrect;
    } else if (!quiz.exam) {
      quiz.hearts--;
    }
    save();
    const finished = quiz.index + 1 >= quiz.items.length || (!quiz.exam && quiz.hearts <= 0);
    const feedback = correct ? `Correct! +${CONFIG.xpCorrect} XP` : `Correct answer: ${esc(answer)}`;
    $("#feedback").innerHTML = `<div class="fb ${correct ? "ok" : "no"}">${feedback}${item.t ? `<br><span class="en">${esc(item.t)}</span>` : ""}</div><p><button class="btn" id="continueQuiz">${finished ? "See results" : "Continue to the next question →"}</button></p>`;
    $("#continueQuiz").focus();
    $("#continueQuiz").onclick = () => { quiz.index++; drawQuestion(); };
  }
  function finishQuiz() {
    const quiz = currentQuiz;
    const percent = Math.round(quiz.hits / quiz.items.length * 100);
    if (quiz.exam) {
      const passed = percent >= CONFIG.passExam;
      if (passed) {
        S.exam[quiz.module] = Math.max(S.exam[quiz.module] || 0, percent);
        S.xp += 50;
        bumpStreak();
      }
      save();
      renderNav();
      main().innerHTML = `<div class="card center"><div class="big-emoji">${passed ? "🏆" : "📚"}</div><h1>${passed ? "Course test passed!" : "Keep practising"}</h1><p><b>${quiz.hits}/${quiz.items.length}</b> correct (${percent}%). The pass mark is ${CONFIG.passExam}%.</p><p>${passed ? "Excellent work! You have earned 50 XP." : "Review the modules and try the test again."}</p><div class="row center"><button class="btn sec" id="retryQuiz">Try again</button><button class="btn" data-go="#/">Back to home</button></div></div>`;
      bind();
      $("#retryQuiz").onclick = () => go(`#/exam/${quiz.module}`);
      currentQuiz = null;
      return;
    }
    const passed = quiz.hearts > 0;
    if (passed) {
      const progress = record(quiz.module.id);
      progress.pass = 1;
      progress.best = Math.max(progress.best || 0, percent);
      S.xp += CONFIG.xpLesson;
      bumpStreak();
    }
    save();
    renderNav();
    const module = quiz.module;
    main().innerHTML = `<div class="card center"><div class="big-emoji">${passed ? "🎉" : "💔"}</div><h1>${passed ? "Module complete!" : "Out of hearts"}</h1><p><b>${quiz.hits}/${quiz.items.length}</b> correct (${percent}%) ${passed ? `· +${CONFIG.xpLesson} XP` : ""}</p><p>${passed ? "Great work! Continue to the reading or review any answers you missed." : "Review the theory and try again."}</p><div class="row center"><button class="btn sec" id="again">Try again</button><button class="btn" data-go="#/m/${module.id}/${passed ? "reading" : "theory"}">${passed ? "Reading →" : "Review theory →"}</button></div></div>`;
    bind();
    $("#again").onclick = () => go(`#/m/${module.id}/practice`);
    currentQuiz = null;
  }

  function reading(module) {
    return `<h2>📖 ${esc(module.tx.ti)}</h2><div class="card reading" id="readingText">${module.tx.b}</div><div class="row"><button class="btn sec" id="listenReading">🔊 Listen</button><button class="btn sec" id="stopReading">⏹ Stop</button></div><h2>Check your understanding</h2>${module.q.map((question, index) => `<div class="card"><b>${index + 1}. ${esc(question[0])}</b>${question[1].map((option, choice) => `<button class="opt reading-option" data-question="${index}" data-choice="${choice}">${esc(option)}</button>`).join("")}<div class="reading-feedback" data-feedback="${index}"></div></div>`).join("")}<div class="row">${nextButton(module, "reading")}</div>`;
  }
  function bindReading(module) {
    $("#listenReading").onclick = () => say($("#readingText").innerText);
    $("#stopReading").onclick = () => stopSpeech();
    const answered = new Set();
    $$("[data-question]").forEach(button => button.onclick = () => {
      const questionIndex = Number(button.dataset.question);
      if (answered.has(questionIndex)) return;
      answered.add(questionIndex);
      const question = module.q[questionIndex];
      const correct = Number(button.dataset.choice) === question[2];
      const buttons = $$(`[data-question="${questionIndex}"]`);
      buttons.forEach(option => {
        option.disabled = true;
        if (Number(option.dataset.choice) === question[2]) option.classList.add("ok");
        else if (option === button) option.classList.add("no");
      });
      $(`[data-feedback="${questionIndex}"]`).innerHTML = `<div class="fb ${correct ? "ok" : "no"}">${correct ? "Correct!" : `Correct answer: ${esc(question[1][question[2]])}`}</div>`;
      if (answered.size === module.q.length) {
        record(module.id).reading = 1;
        S.xp += CONFIG.xpRead;
        bumpStreak();
        save();
        toast(`Reading complete! +${CONFIG.xpRead} XP`);
      }
    });
  }
  function speaking(module) {
    return `<div class="card center"><div class="big-emoji">🗣️</div><h2>Speak with confidence</h2><p>Choose a prompt, plan your answer and speak for 30–60 seconds. Use the microphone for speech recognition if your browser supports it.</p><div id="speakingPrompt" class="flash" role="button" tabindex="0">${esc(module.sp[0])}</div><div class="dots">${module.sp.map((_, index) => `<i class="${index === 0 ? "on" : ""}"></i>`).join("")}</div><div class="row center"><button class="btn sec" id="nextPrompt">Next prompt →</button><button class="btn blue mic" id="speakPrompt">🎙️ Start speaking</button></div><div id="speechResult"></div></div>`;
  }
  function bindSpeaking(module) {
    let index = 0;
    const prompt = $("#speakingPrompt");
    const showPrompt = () => {
      prompt.textContent = module.sp[index];
      $$(".dots i").forEach((dot, dotIndex) => dot.classList.toggle("on", dotIndex === index));
    };
    $("#nextPrompt").onclick = () => { index = (index + 1) % module.sp.length; showPrompt(); };
    prompt.onclick = () => say(prompt.textContent);
    prompt.onkeydown = event => { if (event.key === "Enter" || event.key === " ") say(prompt.textContent); };
    $("#speakPrompt").onclick = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast("Speech recognition is not supported here. You can still answer out loud.");
        return;
      }
      if (recognition) { recognition.stop(); recognition = null; return; }
      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.onresult = event => {
        $("#speechResult").innerHTML = `<div class="heard">${esc(Array.from(event.results).map(result => result[0].transcript).join(""))}</div>`;
      };
      recognition.onerror = event => {
        recognition = null;
        toast(event.error === "not-allowed" ? "Microphone permission was denied." : `Speech recognition error: ${event.error}`);
      };
      recognition.onend = () => {
        if (recognition) recognition = null;
        record(module.id).speaking = 1;
        S.xp += CONFIG.xpSpeak;
        bumpStreak();
        save();
        toast(`Speaking practice complete! +${CONFIG.xpSpeak} XP`);
      };
      recognition.start();
      $("#speakPrompt").classList.add("rec");
      $("#speakPrompt").textContent = "⏹ Stop speaking";
      recognition.onend = () => {
        recognition = null;
        $("#speakPrompt").classList.remove("rec");
        $("#speakPrompt").textContent = "🎙️ Start speaking";
        record(module.id).speaking = 1;
        S.xp += CONFIG.xpSpeak;
        bumpStreak();
        save();
        toast(`Speaking practice complete! +${CONFIG.xpSpeak} XP`);
      };
    };
  }
  function examIntro(levelId) {
    const questions = shuffle(DATA.filter(module => module.lvl === levelId).flatMap(module => module.q.map(question => ({ module, question })))).slice(0, CONFIG.examQuestions);
    main().innerHTML = `<div class="card center"><div class="big-emoji">🏆</div><h1>${levelId} course test</h1><p>Test your understanding across the whole course.</p><p>${questions.length} questions · Pass mark: ${CONFIG.passExam}% · Earn 50 XP for passing.</p><button class="btn" id="startExam">Start test</button></div>`;
    $("#startExam").onclick = () => {
      const items = questions.map(({ module, question }) => ({ type: "choice", q: `${module.t}: ${question[0]}`, o: question[1], a: question[2], t: `Module: ${module.t}` }));
      startQuiz(items, levelId, true);
    };
  }
  function progress() {
    const done = DATA.filter(isDone).length;
    const stats = `<div class="stats"><div class="stat-card"><span class="e">⭐</span><div><b>${S.xp}</b> XP</div></div><div class="stat-card"><span class="e">🔥</span><div><b>${S.last === TODAY() || S.last === YESTERDAY() ? S.streak : 0}</b> day streak</div></div><div class="stat-card"><span class="e">📚</span><div><b>${done}/${DATA.length}</b> modules complete</div></div><div class="stat-card"><span class="e">✅</span><div><b>${levelPct()}%</b> course progress</div></div></div>`;
    const modules = DATA.map(module => `<div class="card"><b>${module.ic} ${esc(module.t)}</b><span style="float:right">${isDone(module) ? `✓ Complete · best ${S.done[module.id].best || 0}%` : "Not completed"}</span></div>`).join("");
    main().innerHTML = `<h1>My progress</h1><p>Progress is stored in this browser only.</p>${stats}<h2>Module progress</h2>${modules}<div class="row"><button class="btn sec" id="exportProgress">Export progress</button><button class="btn sec" id="importProgress">Import progress</button><input id="progressFile" type="file" accept="application/json,.json" hidden></div>`;
    $("#exportProgress").onclick = () => {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "english-b2-progress.json";
      link.click();
      URL.revokeObjectURL(link.href);
    };
    $("#importProgress").onclick = () => $("#progressFile").click();
    $("#progressFile").onchange = async event => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text());
        if (!imported || typeof imported !== "object" || !imported.done || typeof imported.done !== "object") throw new Error("The selected file is not a valid course progress export.");
        S = { ...S, ...imported, done: imported.done, exam: imported.exam || {} };
        save();
        route();
        toast("Progress imported successfully.");
      } catch (error) {
        console.error("Could not import course progress.", error);
        toast(`Import failed: ${error.message}`);
      }
    };
  }
  function settings() {
    main().innerHTML = `<h1>Settings</h1><div class="card"><h2>Course access</h2><p>Choose how modules unlock. Grammar and vocabulary progress independently.</p><div class="modes"><button class="mode ${S.mode === "open" ? "sel" : ""}" id="openMode"><span class="e">🔓</span><b>Open access</b><span>All modules are available immediately.</span></button><button class="mode ${S.mode === "prog" ? "sel" : ""}" id="progressiveMode"><span class="e">🔒</span><b>Progressive</b><span>Complete each module to unlock the next one in its section.</span></button></div></div><div class="card"><h2>Audio</h2><label><input type="checkbox" id="slowVoice" ${S.slow ? "checked" : ""}> Speak more slowly</label><p class="muted">Speech is set to American English (en-US). Your browser's installed en-US voice is used when available; the voice itself depends on your device.</p></div><div class="card"><h2>Reset progress</h2><p>This removes saved XP, module results, test scores and streak data from this browser.</p><button class="btn red" id="resetProgress">Reset all progress</button></div>`;
    $("#openMode").onclick = () => { S.mode = "open"; save(); route(); };
    $("#progressiveMode").onclick = () => { S.mode = "prog"; save(); route(); };
    $("#slowVoice").onchange = event => { S.slow = event.target.checked; save(); };
    $("#resetProgress").onclick = () => {
      if (!confirm("Reset all English B2 progress stored in this browser?")) return;
      S = { xp: 0, streak: 0, last: "", mode: "open", done: {}, exam: {}, slow: false };
      save();
      route();
    };
  }
  function chooseMode() {
    S.mode = S.mode === "prog" ? "open" : "prog";
    save();
    route();
    toast(S.mode === "prog" ? "Progressive module unlocking enabled." : "Open access enabled.");
  }

  window.App = { home: () => go("#/"), chooseMode };
  $("#menuBtn").onclick = () => $("#nav").classList.toggle("open");
  window.addEventListener("hashchange", route);
  save();
  route();
}());
