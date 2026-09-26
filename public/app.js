// ============================================================
// BORI APP
// ============================================================

const STORAGE_KEY =
  "bori_workspace_v1";

const SETTINGS_KEY =
  "bori_settings_v1";

const AI_HISTORY_KEY =
  "bori_ai_history_v1";

const DEFAULT_SETTINGS = {
  theme:
    "dark",

  accent:
    "#4f8cff",

  backgroundType:
    "solid",

  background:
    "#0b0f16",

  interfaceFont:
    "Inter, system-ui, sans-serif",

  writingFont:
    "Georgia, serif",

  radius:
    "medium",

  density:
    "comfortable",
};

const state = {
  currentPage:
    "home",

  currentEntryId:
    null,

  aiHistory:
    loadAIHistory(),

  workspace:
    loadWorkspace(),

  settings:
    loadSettings(),
};

// ============================================================
// STORAGE
// ============================================================

function loadWorkspace() {
  try {
    const value =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!value) {
      return {
        entries: [],
        brainDumps: [],
        chapters: [],
      };
    }

    const parsed =
      JSON.parse(
        value
      );

    return {
      entries:
        Array.isArray(
          parsed.entries
        )
          ? parsed.entries
          : [],

      brainDumps:
        Array.isArray(
          parsed.brainDumps
        )
          ? parsed.brainDumps
          : [],

      chapters:
        Array.isArray(
          parsed.chapters
        )
          ? parsed.chapters
          : [],
    };
  } catch {
    return {
      entries: [],
      brainDumps: [],
      chapters: [],
    };
  }
}

function saveWorkspace() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      state.workspace
    )
  );

  renderAll();
}

function loadSettings() {
  try {
    const value =
      localStorage.getItem(
        SETTINGS_KEY
      );

    return {
      ...DEFAULT_SETTINGS,
      ...(value
        ? JSON.parse(
            value
          )
        : {}),
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
    };
  }
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(
      state.settings
    )
  );

  applySettings();
}

function loadAIHistory() {
  try {
    const value =
      localStorage.getItem(
        AI_HISTORY_KEY
      );

    return value
      ? JSON.parse(
          value
        )
      : [];
  } catch {
    return [];
  }
}

function saveAIHistory() {
  localStorage.setItem(
    AI_HISTORY_KEY,
    JSON.stringify(
      state.aiHistory.slice(
        -30
      )
    )
  );
}

// ============================================================
// UTILITIES
// ============================================================

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function escapeHtml(
  value
) {
  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function formatDate(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    }
  ).format(
    date
  );
}

function excerpt(
  text,
  length = 180
) {
  const value =
    String(
      text || ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (
    value.length <=
    length
  ) {
    return value;
  }

  return `${value.slice(
    0,
    length
  )}…`;
}

function showToast(
  message
) {
  const toast =
    document.getElementById(
      "toast"
    );

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(
      () => {
        toast.classList.remove(
          "show"
        );
      },
      2200
    );
}

// ============================================================
// AUTH
// ============================================================

async function checkSession() {
  try {
    const response =
      await fetch(
        "/api/session",
        {
          credentials:
            "include",
        }
      );

    if (
      response.ok
    ) {
      showApp();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  document
    .getElementById(
      "loginScreen"
    )
    .classList.remove(
      "hidden"
    );

  document
    .getElementById(
      "mainApp"
    )
    .classList.add(
      "hidden"
    );
}

function showApp() {
  document
    .getElementById(
      "loginScreen"
    )
    .classList.add(
      "hidden"
    );

  document
    .getElementById(
      "mainApp"
    )
    .classList.remove(
      "hidden"
    );

  applySettings();

  renderAll();

  goToPage(
    state.currentPage
  );
}

async function login(
  pin
) {
  const error =
    document.getElementById(
      "loginError"
    );

  error.textContent =
    "";

  try {
    const response =
      await fetch(
        "/api/login",
        {
          method:
            "POST",

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              pin,
            }),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        data?.error ||
          "Login failed."
      );
    }

    showApp();
  } catch (
    err
  ) {
    error.textContent =
      err.message;
  }
}

async function logout() {
  await fetch(
    "/api/logout",
    {
      method:
        "POST",

      credentials:
        "include",
    }
  ).catch(
    () => {}
  );

  showLogin();
}

// ============================================================
// NAVIGATION
// ============================================================

function goToPage(
  page
) {
  state.currentPage =
    page;

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      button => {
        button.classList.toggle(
          "active",
          button.dataset
            .page ===
            page
        );
      }
    );

  document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      section => {
        section.classList.toggle(
          "active",
          section.dataset
            .section ===
            page
        );
      }
    );

  renderPageSpecific(
    page
  );
}

function renderPageSpecific(
  page
) {
  if (
    page ===
    "home"
  ) {
    renderHome();
  }

  if (
    page ===
    "diary"
  ) {
    renderDiary();
  }

  if (
    page ===
    "brain-dump"
  ) {
    renderBrainDumps();
  }

  if (
    page ===
    "chapters"
  ) {
    renderChapters();
  }

  if (
    page ===
    "ai"
  ) {
    renderAIContext();
  }

  if (
    page ===
    "settings"
  ) {
    loadSettingsUI();
  }
}

// ============================================================
// RENDER
// ============================================================

function renderAll() {
  renderHome();
  renderDiary();
  renderBrainDumps();
  renderChapters();
  renderChapterFilters();
  renderAIContext();
}

function renderHome() {
  const stats =
    document.getElementById(
      "homeStats"
    );

  if (!stats) {
    return;
  }

  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">
        Diary entries
      </div>
      <div class="stat-value">
        ${state.workspace.entries.length}
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-label">
        Brain dumps
      </div>
      <div class="stat-value">
        ${state.workspace.brainDumps.length}
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-label">
        Chapters
      </div>
      <div class="stat-value">
        ${state.workspace.chapters.length}
      </div>
    </div>
  `;

  const recent =
    [...state.workspace.entries]
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.updatedAt
          ) -
          new Date(
            a.updatedAt
          )
      )
      .slice(
        0,
        6
      );

  const container =
    document.getElementById(
      "recentEntries"
    );

  container.innerHTML =
    recent.length
      ? recent
          .map(
            entry => `
              <div class="entry-row">
                <button data-open-entry="${entry.id}">
                  <div class="entry-title">
                    ${escapeHtml(
                      entry.title ||
                        "Untitled"
                    )}
                  </div>

                  <div class="entry-meta">
                    ${formatDate(
                      entry.updatedAt
                    )}
                  </div>

                  <div class="entry-excerpt">
                    ${escapeHtml(
                      excerpt(
                        entry.content
                      )
                    )}
                  </div>
                </button>
              </div>
            `
          )
          .join("")
      : `
        <div class="empty-state">
          Your writing will appear here.
        </div>
      `;
}

function renderDiary() {
  const container =
    document.getElementById(
      "diaryList"
    );

  if (!container) {
    return;
  }

  const search =
    (
      document.getElementById(
        "diarySearch"
      )?.value || ""
    )
      .toLowerCase()
      .trim();

  const chapter =
    document.getElementById(
      "diaryChapterFilter"
    )?.value || "";

  const entries =
    [...state.workspace.entries]
      .filter(
        entry => {
          const searchable =
            `${entry.title} ${entry.content}`
              .toLowerCase();

          const searchMatch =
            !search ||
            searchable.includes(
              search
            );

          const chapterMatch =
            !chapter ||
            entry.chapterId ===
              chapter;

          return (
            searchMatch &&
            chapterMatch
          );
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.updatedAt
          ) -
          new Date(
            a.updatedAt
          )
      );

  container.innerHTML =
    entries.length
      ? entries
          .map(
            entry => {
              const chapterInfo =
                state.workspace.chapters.find(
                  c =>
                    c.id ===
                    entry.chapterId
                );

              return `
                <article
                  class="entry-card"
                  data-open-entry="${entry.id}"
                >
                  <div class="panel-kicker">
                    ${
                      chapterInfo
                        ? escapeHtml(
                            chapterInfo.title
                          )
                        : "DIARY"
                    }
                  </div>

                  <h3>
                    ${escapeHtml(
                      entry.title ||
                        "Untitled"
                    )}
                  </h3>

                  <div class="entry-meta">
                    ${formatDate(
                      entry.updatedAt
                    )}
                  </div>

                  <p>
                    ${escapeHtml(
                      excerpt(
                        entry.content,
                        260
                      )
                    )}
                  </p>
                </article>
              `;
            }
          )
          .join("")
      : `
        <div class="empty-state">
          No matching entries.
        </div>
      `;
}

function renderBrainDumps() {
  const container =
    document.getElementById(
      "brainDumpList"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    state.workspace.brainDumps
      .length
      ? [...state.workspace.brainDumps]
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.updatedAt
              ) -
              new Date(
                a.updatedAt
              )
          )
          .map(
            dump => `
              <div class="entry-row">
                <div class="entry-title">
                  ${escapeHtml(
                    dump.title ||
                      "Untitled thought"
                  )}
                </div>

                <div class="entry-meta">
                  ${formatDate(
                    dump.updatedAt
                  )}
                </div>

                <div class="entry-excerpt">
                  ${escapeHtml(
                    excerpt(
                      dump.content
                    )
                  )}
                </div>
              </div>
            `
          )
          .join("")
      : `
        <div class="empty-state">
          No brain dumps yet.
        </div>
      `;
}

function renderChapters() {
  const container =
    document.getElementById(
      "chapterGrid"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    state.workspace.chapters
      .length
      ? state.workspace.chapters
          .map(
            chapter => {
              const count =
                state.workspace.entries.filter(
                  entry =>
                    entry.chapterId ===
                    chapter.id
                ).length;

              return `
                <article
                  class="chapter-card"
                  data-open-chapter="${chapter.id}"
                >
                  <div class="panel-kicker">
                    CHAPTER
                  </div>

                  <h3>
                    ${escapeHtml(
                      chapter.title
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      chapter.description ||
                        "No description."
                    )}
                  </p>

                  <div class="entry-meta">
                    ${count} ${count === 1 ? "entry" : "entries"}
                  </div>
                </article>
              `;
            }
          )
          .join("")
      : `
        <div class="empty-state">
          Create your first chapter when you are ready.
        </div>
      `;
}

function renderChapterFilters() {
  const select =
    document.getElementById(
      "diaryChapterFilter"
    );

  const entryChapter =
    document.getElementById(
      "entryChapter"
    );

  if (
    !select ||
    !entryChapter
  ) {
    return;
  }

  const current =
    select.value;

  select.innerHTML = `
    <option value="">
      All chapters
    </option>

    ${state.workspace.chapters
      .map(
        chapter => `
          <option value="${chapter.id}">
            ${escapeHtml(
              chapter.title
            )}
          </option>
        `
      )
      .join("")}
  `;

  entryChapter.innerHTML = `
    <option value="">
      No chapter
    </option>

    ${state.workspace.chapters
      .map(
        chapter => `
          <option value="${chapter.id}">
            ${escapeHtml(
              chapter.title
            )}
          </option>
        `
      )
      .join("")}
  `;

  select.value =
    current;
}

function renderAIContext() {
  const container =
    document.getElementById(
      "aiContextSummary"
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div>
      <strong>${state.workspace.entries.length}</strong>
      diary entries
    </div>

    <div>
      <strong>${state.workspace.brainDumps.length}</strong>
      brain dumps
    </div>

    <div>
      <strong>${state.workspace.chapters.length}</strong>
      chapters
    </div>

    <div>
      Current page:
      <strong>${escapeHtml(
        state.currentPage
      )}</strong>
    </div>

    <div>
      Theme:
      <strong>${escapeHtml(
        state.settings.theme
      )}</strong>
    </div>
  `;
}

// ============================================================
// ENTRY DIALOG
// ============================================================

function openNewEntry() {
  state.currentEntryId =
    null;

  document.getElementById(
    "entryId"
  ).value = "";

  document.getElementById(
    "entryTitle"
  ).value = "";

  document.getElementById(
    "entryContent"
  ).value = "";

  document.getElementById(
    "entryChapter"
  ).value = "";

  document.getElementById(
    "deleteEntryButton"
  ).classList.add(
    "hidden"
  );

  document.getElementById(
    "entryDialog"
  ).showModal();
}

function openEntry(
  id
) {
  const entry =
    state.workspace.entries.find(
      item =>
        item.id ===
        id
    );

  if (!entry) {
    return;
  }

  state.currentEntryId =
    id;

  document.getElementById(
    "entryId"
  ).value =
    entry.id;

  document.getElementById(
    "entryTitle"
  ).value =
    entry.title || "";

  document.getElementById(
    "entryContent"
  ).value =
    entry.content || "";

  document.getElementById(
    "entryChapter"
  ).value =
    entry.chapterId || "";

  document.getElementById(
    "deleteEntryButton"
  ).classList.remove(
    "hidden"
  );

  document.getElementById(
    "entryDialog"
  ).showModal();
}

function saveEntryFromDialog(
  event
) {
  event.preventDefault();

  const id =
    document.getElementById(
      "entryId"
    ).value;

  const title =
    document.getElementById(
      "entryTitle"
    ).value.trim();

  const content =
    document.getElementById(
      "entryContent"
    ).value;

  const chapterId =
    document.getElementById(
      "entryChapter"
    ).value;

  const now =
    new Date().toISOString();

  if (!title && !content.trim()) {
    showToast(
      "Write something first."
    );
    return;
  }

  if (id) {
    const entry =
      state.workspace.entries.find(
        item =>
          item.id ===
          id
      );

    if (entry) {
      entry.title =
        title ||
        "Untitled";

      entry.content =
        content;

      entry.chapterId =
        chapterId;

      entry.updatedAt =
        now;
    }
  } else {
    state.workspace.entries.unshift(
      {
        id:
          uid("entry"),

        title:
          title ||
          "Untitled",

        content,

        chapterId,

        createdAt:
          now,

        updatedAt:
          now,

        tags: [],
      }
    );
  }

  saveWorkspace();

  document
    .getElementById(
      "entryDialog"
    )
    .close();

  showToast(
    "Entry saved."
  );
}

function deleteCurrentEntry() {
  const id =
    document.getElementById(
      "entryId"
    ).value;

  if (!id) {
    return;
  }

  const confirmed =
    confirm(
      "Delete this diary entry?"
    );

  if (!confirmed) {
    return;
  }

  state.workspace.entries =
    state.workspace.entries.filter(
      entry =>
        entry.id !==
        id
    );

  saveWorkspace();

  document
    .getElementById(
      "entryDialog"
    )
    .close();

  showToast(
    "Entry deleted."
  );
}

// ============================================================
// BRAIN DUMPS
// ============================================================

function saveBrainDump() {
  const title =
    document.getElementById(
      "brainDumpTitle"
    ).value.trim();

  const content =
    document.getElementById(
      "brainDumpContent"
    ).value;

  if (!content.trim()) {
    showToast(
      "Write something first."
    );

    return;
  }

  const now =
    new Date().toISOString();

  state.workspace.brainDumps.unshift(
    {
      id:
        uid(
          "dump"
        ),

      title:
        title ||
        "Untitled thought",

      content,

      createdAt:
        now,

      updatedAt:
        now,

      chapterId:
        "",
    }
  );

  saveWorkspace();

  document.getElementById(
    "brainDumpTitle"
  ).value = "";

  document.getElementById(
    "brainDumpContent"
  ).value = "";

  showToast(
    "Brain dump saved."
  );
}

function saveHomeBrainDump() {
  const textarea =
    document.getElementById(
      "homeBrainDump"
    );

  const content =
    textarea.value.trim();

  if (!content) {
    return;
  }

  const now =
    new Date().toISOString();

  state.workspace.brainDumps.unshift(
    {
      id:
        uid(
          "dump"
        ),

      title:
        "Home brain dump",

      content,

      createdAt:
        now,

      updatedAt:
        now,

      chapterId:
        "",
    }
  );

  saveWorkspace();

  textarea.value = "";

  showToast(
    "Brain dump saved."
  );
}

// ============================================================
// CHAPTERS
// ============================================================

function openNewChapter() {
  document.getElementById(
    "chapterId"
  ).value = "";

  document.getElementById(
    "chapterTitle"
  ).value = "";

  document.getElementById(
    "chapterDescription"
  ).value = "";

  document
    .getElementById(
      "chapterDialog"
    )
    .showModal();
}

function saveChapter(
  event
) {
  event.preventDefault();

  const id =
    document.getElementById(
      "chapterId"
    ).value;

  const title =
    document.getElementById(
      "chapterTitle"
    ).value.trim();

  const description =
    document.getElementById(
      "chapterDescription"
    ).value.trim();

  if (!title) {
    showToast(
      "Give the chapter a title."
    );

    return;
  }

  if (id) {
    const chapter =
      state.workspace.chapters.find(
        item =>
          item.id ===
          id
      );

    if (chapter) {
      chapter.title =
        title;

      chapter.description =
        description;
    }
  } else {
    state.workspace.chapters.push(
      {
        id:
          uid(
            "chapter"
          ),

        title,

        description,

        createdAt:
          new Date().toISOString(),
      }
    );
  }

  saveWorkspace();

  document
    .getElementById(
      "chapterDialog"
    )
    .close();

  showToast(
    "Chapter saved."
  );
}

// ============================================================
// AI
// ============================================================

function buildAIWorkspace() {
  const currentEntry =
    state.currentEntryId
      ? state.workspace.entries.find(
          entry =>
            entry.id ===
            state.currentEntryId
        ) || null
      : null;

  return {
    app:
      "Bori",

    currentPage:
      state.currentPage,

    settings:
      state.settings,

    currentEntry,

    entries:
      state.workspace.entries,

    brainDumps:
      state.workspace.brainDumps,

    chapters:
      state.workspace.chapters,
  };
}

function appendAIMessage(
  role,
  text
) {
  const container =
    document.getElementById(
      "aiMessages"
    );

  const item =
    document.createElement(
      "div"
    );

  item.className =
    `ai-message ${
      role ===
      "user"
        ? "user"
        : "assistant"
    }`;

  item.innerHTML = `
    <div class="ai-avatar">
      ${
        role ===
        "user"
          ? "You"
          : "B"
      }
    </div>

    <div>
      <div class="message-author">
        ${
          role ===
          "user"
            ? "You"
            : "Bori"
        }
      </div>

      <div class="message-text"></div>
    </div>
  `;

  item
    .querySelector(
      ".message-text"
    )
    .textContent =
    text;

  container.appendChild(
    item
  );

  container.scrollTop =
    container.scrollHeight;
}

async function sendAIMessage(
  message
) {
  appendAIMessage(
    "user",
    message
  );

  const useWeb =
    document.getElementById(
      "useWeb"
    ).checked;

  const allowEdits =
    document.getElementById(
      "allowAiEdits"
    ).checked;

  state.aiHistory.push(
    {
      role:
        "user",
      content:
        message,
    }
  );

  try {
    const response =
      await fetch(
        "/api/ai/chat",
        {
          method:
            "POST",

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              message,

              history:
                state.aiHistory.slice(
                  -20
                ),

              workspace:
                buildAIWorkspace(),

              currentPage:
                state.currentPage,

              allowEdits,

              useWeb,
            }),
        }
      );

    const data =
      await response.json();

    if (
      response.status ===
      401
    ) {
      showLogin();
      return;
    }

    if (
      !response.ok
    ) {
      throw new Error(
        data?.error ||
          "AI request failed."
      );
    }

    const reply =
      data?.reply ||
      "I didn't get a response.";

    appendAIMessage(
      "assistant",
      reply
    );

    state.aiHistory.push(
      {
        role:
          "assistant",
        content:
          reply,
      }
    );

    saveAIHistory();

    if (
      allowEdits &&
      Array.isArray(
        data?.actions
      )
    ) {
      applyAIActions(
        data.actions
      );
    }
  } catch (
    error
  ) {
    appendAIMessage(
      "assistant",
      `I couldn't complete that request.\n\n${error.message}`
    );
  }
}

function applyAIActions(
  actions
) {
  let changed =
    false;

  for (
    const action of actions
  ) {
    if (
      action.type ===
      "update_entry"
    ) {
      const entry =
        state.workspace.entries.find(
          item =>
            item.id ===
            action.id
        );

      if (!entry) {
        continue;
      }

      if (
        action.title !==
        undefined
      ) {
        entry.title =
          action.title;
      }

      if (
        action.content !==
        undefined
      ) {
        entry.content =
          action.content;
      }

      if (
        action.chapterId !==
        undefined
      ) {
        entry.chapterId =
          action.chapterId;
      }

      entry.updatedAt =
        new Date().toISOString();

      changed = true;
    }

    if (
      action.type ===
      "create_entry"
    ) {
      state.workspace.entries.unshift(
        {
          id:
            uid(
              "entry"
            ),

          title:
            action.title ||
            "Untitled",

          content:
            action.content ||
            "",

          chapterId:
            action.chapterId ||
            "",

          createdAt:
            new Date().toISOString(),

          updatedAt:
            new Date().toISOString(),

          tags: [],
        }
      );

      changed = true;
    }

    if (
      action.type ===
      "update_chapter"
    ) {
      const chapter =
        state.workspace.chapters.find(
          item =>
            item.id ===
            action.id
        );

      if (!chapter) {
        continue;
      }

      if (
        action.title !==
        undefined
      ) {
        chapter.title =
          action.title;
      }

      if (
        action.description !==
        undefined
      ) {
        chapter.description =
          action.description;
      }

      changed = true;
    }

    if (
      action.type ===
      "create_chapter"
    ) {
      state.workspace.chapters.push(
        {
          id:
            uid(
              "chapter"
            ),

          title:
            action.title ||
            "Untitled chapter",

          description:
            action.description ||
            "",

          createdAt:
            new Date().toISOString(),
        }
      );

      changed = true;
    }

    if (
      action.type ===
      "set_setting"
    ) {
      const allowed = [
        "theme",
        "accent",
        "backgroundType",
        "background",
        "interfaceFont",
        "writingFont",
        "radius",
        "density",
      ];

      if (
        allowed.includes(
          action.key
        )
      ) {
        state.settings[
          action.key
        ] =
          action.value;

        changed = true;
      }
    }
  }

  if (changed) {
    saveWorkspace();
    saveSettings();

    showToast(
      "Bori updated the workspace."
    );
  }
}

// ============================================================
// REWRITE
// ============================================================

async function rewriteSelectedText() {
  const text =
    document.getElementById(
      "entryContent"
    ).value;

  if (!text.trim()) {
    return;
  }

  try {
    const response =
      await fetch(
        "/api/ai/rewrite",
        {
          method:
            "POST",

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              text,

              mode:
                "polish",
            }),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        data?.error ||
          "Rewrite failed."
      );
    }

    document.getElementById(
      "entryContent"
    ).value =
      data.rewrite ||
      text;
  } catch (
    error
  ) {
    showToast(
      error.message
    );
  }
}

// ============================================================
// SETTINGS
// ============================================================

function applySettings() {
  const root =
    document.documentElement;

  document.body.classList.toggle(
    "theme-light",
    state.settings.theme ===
      "light"
  );

  document.body.classList.toggle(
    "theme-slate",
    state.settings.theme ===
      "slate"
  );

  root.style.setProperty(
    "--accent",
    state.settings.accent
  );

  root.style.setProperty(
    "--interface-font",
    state.settings.interfaceFont
  );

  root.style.setProperty(
    "--writing-font",
    state.settings.writingFont
  );

  const radius =
    {
      small:
        "8px",
      medium:
        "14px",
      large:
        "20px",
    }[
      state.settings.radius
    ] ||
    "14px";

  root.style.setProperty(
    "--radius",
    radius
  );

  if (
    state.settings.backgroundType ===
    "image"
  ) {
    document.body.style.background =
      `linear-gradient(rgba(8,12,18,.82),rgba(8,12,18,.94)),url("${state.settings.background}") center/cover fixed`;
  } else if (
    state.settings.backgroundType ===
    "gradient"
  ) {
    document.body.style.background =
      `radial-gradient(circle at top right, ${state.settings.accent}18, transparent 35%), ${state.settings.background}`;
  } else {
    document.body.style.background =
      state.settings.background;
  }
}

function loadSettingsUI() {
  const fields = {
    settingTheme:
      state.settings.theme,

    settingAccent:
      state.settings.accent,

    settingBackgroundType:
      state.settings.backgroundType,

    settingBackground:
      state.settings.background,

    settingInterfaceFont:
      state.settings.interfaceFont,

    settingWritingFont:
      state.settings.writingFont,

    settingRadius:
      state.settings.radius,

    settingDensity:
      state.settings.density,
  };

  for (
    const [
      id,
      value,
    ] of Object.entries(
      fields
    )
  ) {
    const element =
      document.getElementById(
        id
      );

    if (
      element
    ) {
      element.value =
        value;
    }
  }
}

function saveSettingsFromUI() {
  state.settings = {
    theme:
      document.getElementById(
        "settingTheme"
      ).value,

    accent:
      document.getElementById(
        "settingAccent"
      ).value,

    backgroundType:
      document.getElementById(
        "settingBackgroundType"
      ).value,

    background:
      document.getElementById(
        "settingBackground"
      ).value,

    interfaceFont:
      document.getElementById(
        "settingInterfaceFont"
      ).value,

    writingFont:
      document.getElementById(
        "settingWritingFont"
      ).value,

    radius:
      document.getElementById(
        "settingRadius"
      ).value,

    density:
      document.getElementById(
        "settingDensity"
      ).value,
  };

  saveSettings();

  showToast(
    "Appearance saved."
  );

  renderAIContext();
}

// ============================================================
// DISCORD REGISTRATION
// ============================================================

async function registerDiscordCommands() {
  const status =
    document.getElementById(
      "discordStatus"
    );

  status.textContent =
    "Registering...";

  try {
    const response =
      await fetch(
        "/api/discord/register",
        {
          method:
            "POST",

          credentials:
            "include",
        }
      );

    const data =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        data?.error ||
          "Registration failed."
      );
    }

    status.textContent =
      "Discord commands registered.";
  } catch (
    error
  ) {
    status.textContent =
      error.message;
  }
}

// ============================================================
// EVENTS
// ============================================================

document.addEventListener(
  "click",
  event => {
    const nav =
      event.target.closest(
        ".nav-item"
      );

    if (
      nav
    ) {
      goToPage(
        nav.dataset.page
      );
      return;
    }

    const pageTarget =
      event.target.closest(
        "[data-page-target]"
      );

    if (
      pageTarget
    ) {
      goToPage(
        pageTarget.dataset
          .pageTarget
      );
      return;
    }

    const action =
      event.target.closest(
        "[data-action]"
      );

    if (
      action
    ) {
      if (
        action.dataset.action ===
        "new-diary"
      ) {
        openNewEntry();
      }

      if (
        action.dataset.action ===
        "new-chapter"
      ) {
        openNewChapter();
      }

      return;
    }

    const entry =
      event.target.closest(
        "[data-open-entry]"
      );

    if (
      entry
    ) {
      openEntry(
        entry.dataset
          .openEntry
      );

      return;
    }

    const chapter =
      event.target.closest(
        "[data-open-chapter]"
      );

    if (
      chapter
    ) {
      const target =
        state.workspace.chapters.find(
          item =>
            item.id ===
            chapter.dataset
              .openChapter
        );

      if (
        target
      ) {
        showToast(
          `${target.title}: ${target.description || "No description."}`
        );
      }
    }
  }
);

document
  .getElementById(
    "loginForm"
  )
  .addEventListener(
    "submit",
    event => {
      event.preventDefault();

      login(
        document.getElementById(
          "pinInput"
        ).value
      );
    }
  );

document
  .getElementById(
    "logoutButton"
  )
  .addEventListener(
    "click",
    logout
  );

document
  .getElementById(
    "entryForm"
  )
  .addEventListener(
    "submit",
    saveEntryFromDialog
  );

document
  .getElementById(
    "deleteEntryButton"
  )
  .addEventListener(
    "click",
    deleteCurrentEntry
  );

document
  .getElementById(
    "chapterForm"
  )
  .addEventListener(
    "submit",
    saveChapter
  );

document
  .getElementById(
    "saveBrainDump"
  )
  .addEventListener(
    "click",
    saveBrainDump
  );

document
  .getElementById(
    "clearBrainDump"
  )
  .addEventListener(
    "click",
    () => {
      document.getElementById(
        "brainDumpTitle"
      ).value = "";

      document.getElementById(
        "brainDumpContent"
      ).value = "";
    }
  );

document
  .getElementById(
    "saveHomeDump"
  )
  .addEventListener(
    "click",
    saveHomeBrainDump
  );

document
  .getElementById(
    "diarySearch"
  )
  .addEventListener(
    "input",
    renderDiary
  );

document
  .getElementById(
    "diaryChapterFilter"
  )
  .addEventListener(
    "change",
    renderDiary
  );

document
  .getElementById(
    "aiForm"
  )
  .addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const input =
        document.getElementById(
          "aiInput"
        );

      const message =
        input.value.trim();

      if (!message) {
        return;
      }

      input.value = "";

      await sendAIMessage(
        message
      );
    }
  );

document
  .getElementById(
    "saveSettings"
  )
  .addEventListener(
    "click",
    saveSettingsFromUI
  );

document
  .getElementById(
    "registerDiscord"
  )
  .addEventListener(
    "click",
    registerDiscordCommands
  );

document
  .querySelectorAll(
    "[data-close-dialog]"
  )
  .forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          button
            .closest(
              "dialog"
            )
            ?.close();
        }
      );
    }
  );

document
  .getElementById(
    "brandButton"
  )
  .addEventListener(
    "click",
    () =>
      goToPage(
        "home"
      )
  );

// ============================================================
// START
// ============================================================

applySettings();

checkSession();