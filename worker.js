// @ts-nocheck

const ENV = globalThis;

const APP_NAME = String(ENV.APP_NAME || "Bori");
const DASHBOARD_PIN = String(ENV.DASHBOARD_PIN || "");
const SESSION_SECRET = String(
  ENV.SESSION_SECRET || DASHBOARD_PIN || "bori-session-secret"
);

const OPENROUTER_API_KEY = String(
  ENV.OPENROUTER_API_KEY || ""
);

const OPENROUTER_MODEL = String(
  ENV.OPENROUTER_MODEL || "openrouter/free"
);

const DISCORD_BOT_TOKEN = String(
  ENV.DISCORD_BOT_TOKEN || ""
);

const DISCORD_PUBLIC_KEY = String(
  ENV.DISCORD_PUBLIC_KEY || ""
);

const DISCORD_APPLICATION_ID = String(
  ENV.DISCORD_APPLICATION_ID ||
    ENV.DISCORD_CLIENT_ID ||
    ""
);

const DISCORD_GUILD_ID = String(
  ENV.DISCORD_GUILD_ID || ""
);

const DISCORD_API =
  "https://discord.com/api/v10";

const SESSION_COOKIE = "bori_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const WEB_TOOLS = [
  {
    type: "openrouter:web_search",
  },
  {
    type: "openrouter:web_fetch",
  },
];

addEventListener("fetch", event => {
  event.respondWith(
    Promise.resolve(
      handleRequest(event.request)
    ).catch(error => {
      console.error(error);

      return json(
        {
          error:
            error?.message ||
            "Internal server error.",
        },
        500,
        event.request
      );
    })
  );
});

async function handleRequest(request) {
  const url = new URL(
    request.url
  );

  if (
    request.method === "OPTIONS"
  ) {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(
        request
      ),
    });
  }

  if (
    url.pathname ===
    "/api/discord/interactions"
  ) {
    return handleDiscordInteraction(
      request
    );
  }

  if (
    url.pathname ===
    "/api/health"
  ) {
    return json(
      {
        ok: true,
        app: APP_NAME,
        time: new Date().toISOString(),
      },
      200,
      request
    );
  }

  if (
    url.pathname ===
      "/api/login" &&
    request.method === "POST"
  ) {
    return login(
      request
    );
  }

  if (
    url.pathname ===
      "/api/logout" &&
    request.method === "POST"
  ) {
    return logout(
      request
    );
  }

  if (
    url.pathname ===
      "/api/session" &&
    request.method === "GET"
  ) {
    return sessionStatus(
      request
    );
  }

  if (
    url.pathname ===
      "/api/ai/chat" &&
    request.method === "POST"
  ) {
    return aiChat(
      request
    );
  }

  if (
    url.pathname ===
      "/api/ai/rewrite" &&
    request.method === "POST"
  ) {
    return aiRewrite(
      request
    );
  }

  if (
    url.pathname ===
      "/api/discord/register" &&
    request.method === "POST"
  ) {
    const session =
      await getSession(
        request
      );

    if (!session) {
      return json(
        {
          error:
            "Unauthorized.",
        },
        401,
        request
      );
    }

    return registerDiscordCommands(
      request
    );
  }

  if (
    !url.pathname.startsWith(
      "/api/"
    )
  ) {
    return serveAsset(
      request
    );
  }

  return json(
    {
      error:
        "Not found.",
    },
    404,
    request
  );
}

/* ============================================================
   RESPONSE HELPERS
============================================================ */

function corsHeaders(request) {
  const origin =
    request.headers.get(
      "Origin"
    );

  const allowed =
    origin &&
    origin.startsWith(
      "https://bori.boriapp.workers.dev"
    )
      ? origin
      : "https://bori.boriapp.workers.dev";

  return {
    "Access-Control-Allow-Origin":
      allowed,
    "Access-Control-Allow-Credentials":
      "true",
    "Access-Control-Allow-Headers":
      "Content-Type",
    "Access-Control-Allow-Methods":
      "GET,POST,OPTIONS",
    Vary: "Origin",
  };
}

function json(
  data,
  status = 200,
  request = null,
  extraHeaders = {}
) {
  const headers = {
    "Content-Type":
      "application/json; charset=UTF-8",
    ...(request
      ? corsHeaders(request)
      : {}),
    ...extraHeaders,
  };

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers,
    }
  );
}

async function readJson(
  request
) {
  const text =
    await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    throw new Error(
      "Invalid JSON request body."
    );
  }
}

function clamp(
  value,
  max
) {
  return String(
    value ?? ""
  ).slice(
    0,
    max
  );
}

function array(
  value
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function object(
  value
) {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
    ? value
    : {};
}

/* ============================================================
   SESSION / PIN
============================================================ */

function base64UrlEncode(
  bytes
) {
  let binary = "";

  const view =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(
          bytes
        );

  for (
    const byte of view
  ) {
    binary += String.fromCharCode(
      byte
    );
  }

  return btoa(binary)
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    )
    .replace(
      /=+$/g,
      ""
    );
}

function base64UrlDecode(
  value
) {
  const text =
    String(value || "")
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  const padded =
    text +
    "=".repeat(
      (4 -
        (text.length % 4)) %
        4
    );

  const binary =
    atob(padded);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(
        i
      );
  }

  return bytes;
}

async function hmac(
  value
) {
  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        SESSION_SECRET
      ),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

  return crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(
      value
    )
  );
}

async function createSession() {
  const payload = {
    created:
      Date.now(),
    expires:
      Date.now() +
      SESSION_MAX_AGE * 1000,
    nonce:
      crypto.randomUUID(),
  };

  const encoded =
    base64UrlEncode(
      new TextEncoder().encode(
        JSON.stringify(
          payload
        )
      )
    );

  const signature =
    base64UrlEncode(
      await hmac(
        encoded
      )
    );

  return `${encoded}.${signature}`;
}

async function verifySession(
  token
) {
  if (!token) {
    return null;
  }

  const parts =
    String(token).split(
      "."
    );

  if (
    parts.length !== 2
  ) {
    return null;
  }

  const [
    encoded,
    providedSignature,
  ] = parts;

  const expected =
    base64UrlEncode(
      await hmac(
        encoded
      )
    );

  if (
    expected !==
    providedSignature
  ) {
    return null;
  }

  try {
    const payload =
      JSON.parse(
        new TextDecoder().decode(
          base64UrlDecode(
            encoded
          )
        )
      );

    if (
      payload.expires <
      Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function cookies(
  header
) {
  const result = {};

  for (
    const piece of String(
      header || ""
    ).split(";")
  ) {
    const index =
      piece.indexOf(
        "="
      );

    if (
      index === -1
    ) {
      continue;
    }

    const name =
      piece
        .slice(
          0,
          index
        )
        .trim();

    const value =
      piece
        .slice(
          index + 1
        )
        .trim();

    result[name] =
      value;
  }

  return result;
}

async function getSession(
  request
) {
  const all =
    cookies(
      request.headers.get(
        "Cookie"
      )
    );

  return verifySession(
    all[
      SESSION_COOKIE
    ]
  );
}

async function login(
  request
) {
  if (
    !DASHBOARD_PIN
  ) {
    return json(
      {
        error:
          "DASHBOARD_PIN is not configured.",
      },
      503,
      request
    );
  }

  const body =
    await readJson(
      request
    );

  const pin =
    String(
      body?.pin || ""
    );

  if (
    pin !==
    DASHBOARD_PIN
  ) {
    return json(
      {
        error:
          "Incorrect PIN.",
      },
      401,
      request
    );
  }

  const token =
    await createSession();

  return json(
    {
      ok: true,
      authenticated:
        true,
    },
    200,
    request,
    {
      "Set-Cookie":
        `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`,
    }
  );
}

async function logout(
  request
) {
  return json(
    {
      ok: true,
    },
    200,
    request,
    {
      "Set-Cookie":
        `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    }
  );
}

async function sessionStatus(
  request
) {
  const current =
    await getSession(
      request
    );

  return json(
    {
      authenticated:
        Boolean(
          current
        ),
    },
    current
      ? 200
      : 401,
    request
  );
}

/* ============================================================
   AI
============================================================ */

function cleanHistory(
  history
) {
  return array(history)
    .slice(-24)
    .map(item => ({
      role:
        [
          "system",
          "user",
          "assistant",
        ].includes(
          item?.role
        )
          ? item.role
          : "user",

      content:
        clamp(
          item?.content,
          12000
        ),
    }))
    .filter(
      item =>
        item.content.trim()
    );
}

function cleanWorkspace(
  workspace
) {
  const data =
    object(
      workspace
    );

  return {
    app:
      clamp(
        data.app,
        100
      ),

    currentPage:
      clamp(
        data.currentPage,
        100
      ),

    settings:
      object(
        data.settings
      ),

    currentEntry:
      cleanEntry(
        data.currentEntry
      ),

    entries:
      array(
        data.entries
      )
        .slice(0, 80)
        .map(
          cleanEntry
        ),

    brainDumps:
      array(
        data.brainDumps
      )
        .slice(0, 80)
        .map(
          cleanEntry
        ),

    chapters:
      array(
        data.chapters
      )
        .slice(0, 50)
        .map(
          chapter => ({
            id:
              clamp(
                chapter?.id,
                100
              ),
            title:
              clamp(
                chapter?.title,
                200
              ),
            description:
              clamp(
                chapter?.description,
                1000
              ),
          })
        ),
  };
}

function cleanEntry(
  entry
) {
  if (
    !entry ||
    typeof entry !==
      "object"
  ) {
    return null;
  }

  return {
    id:
      clamp(
        entry.id,
        100
      ),

    title:
      clamp(
        entry.title,
        200
      ),

    content:
      clamp(
        entry.content,
        12000
      ),

    chapterId:
      clamp(
        entry.chapterId ||
          entry.chapter_id,
        100
      ),

    createdAt:
      clamp(
        entry.createdAt,
        100
      ),

    updatedAt:
      clamp(
        entry.updatedAt,
        100
      ),

    tags:
      array(
        entry.tags
      )
        .slice(0, 20)
        .map(
          tag =>
            clamp(
              tag,
              50
            )
        ),
  };
}

function buildBoriPrompt(
  workspace,
  currentPage,
  allowEdits
) {
  return `
You are Bori, the AI inside a private diary, brain-dump and writing workspace.

Your personality:
- calm
- intelligent
- direct
- thoughtful
- never patronizing
- never fake
- never overly enthusiastic

Your job:
- help the user think
- help them understand their own writing
- rewrite and polish text
- summarize
- organize ideas
- connect related material
- help with chapters
- help with diary entries
- help with brain dumps
- perform web research when needed

The current page is:
${currentPage}

Workspace:
${JSON.stringify(
  workspace,
  null,
  2
)}

Editing permission:
${
  allowEdits
    ? "The user has enabled workspace edits."
    : "The user has NOT enabled workspace edits."
}

Never invent memories, entries, dates, events or facts that are not present.

When the user asks for current information, news, verification, prices, releases, websites or research, use the available web tools.

When the user asks about their Bori workspace, use the supplied workspace data.

If editing is enabled, you may output actions using exactly:

[ACTIONS_JSON]
{
  "actions": [
    {
      "type": "update_entry",
      "id": "existing-entry-id",
      "title": "new title",
      "content": "new content",
      "chapterId": "chapter-id"
    },
    {
      "type": "create_entry",
      "title": "title",
      "content": "content",
      "chapterId": "chapter-id"
    },
    {
      "type": "update_chapter",
      "id": "existing-chapter-id",
      "title": "new title",
      "description": "new description"
    },
    {
      "type": "create_chapter",
      "title": "title",
      "description": "description"
    },
    {
      "type": "set_setting",
      "key": "settingName",
      "value": "settingValue"
    }
  ]
}
[/ACTIONS_JSON]

Never invent IDs.

If editing is disabled, do not emit actions and do not claim that you changed anything.
`.trim();
}

async function callOpenRouter({
  messages,
  useWeb = false,
  temperature = 0.7,
}) {
  if (
    !OPENROUTER_API_KEY
  ) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured."
    );
  }

  const body = {
    model:
      OPENROUTER_MODEL,
    messages,
    temperature,
  };

  if (useWeb) {
    body.tools =
      WEB_TOOLS;
    body.tool_choice =
      "auto";
    body.max_tool_calls =
      4;
  }

  const response =
    await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${OPENROUTER_API_KEY}`,

          "Content-Type":
            "application/json",

          "HTTP-Referer":
            "https://bori.boriapp.workers.dev",

          "X-Title":
            "Bori",
        },

        body:
          JSON.stringify(
            body
          ),
      }
    );

  const data =
    await response
      .json()
      .catch(
        () => null
      );

  if (
    !response.ok
  ) {
    throw new Error(
      data?.error?.message ||
        `OpenRouter returned HTTP ${response.status}.`
    );
  }

  return (
    data?.choices?.[0]
      ?.message || {
      content:
        "",
    }
  );
}

function aiText(
  message
) {
  if (
    typeof message?.content ===
    "string"
  ) {
    return message.content.trim();
  }

  if (
    Array.isArray(
      message?.content
    )
  ) {
    return message.content
      .map(
        part =>
          typeof part ===
          "string"
            ? part
            : part?.text || ""
      )
      .join("")
      .trim();
  }

  return "";
}

function extractActions(
  text
) {
  const match =
    String(
      text || ""
    ).match(
      /\[ACTIONS_JSON\]([\s\S]*?)\[\/ACTIONS_JSON\]/i
    );

  if (!match) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        match[1]
      );

    return array(
      parsed?.actions
    );
  } catch {
    return [];
  }
}

async function aiChat(
  request
) {
  const session =
    await getSession(
      request
    );

  if (!session) {
    return json(
      {
        error:
          "Unauthorized.",
      },
      401,
      request
    );
  }

  const body =
    await readJson(
      request
    );

  const message =
    clamp(
      body?.message,
      20000
    ).trim();

  if (!message) {
    return json(
      {
        error:
          "Message is empty.",
      },
      400,
      request
    );
  }

  const workspace =
    cleanWorkspace(
      body?.workspace
    );

  const history =
    cleanHistory(
      body?.history
    );

  const currentPage =
    clamp(
      body?.currentPage ||
        workspace.currentPage ||
        "home",
      100
    );

  const allowEdits =
    Boolean(
      body?.allowEdits
    );

  const messages = [
    {
      role:
        "system",
      content:
        buildBoriPrompt(
          workspace,
          currentPage,
          allowEdits
        ),
    },

    ...history,

    {
      role:
        "user",
      content:
        message,
    },
  ];

  try {
    const result =
      await callOpenRouter(
        {
          messages,
          useWeb:
            Boolean(
              body?.useWeb
            ),
          temperature:
            0.7,
        }
      );

    const text =
      aiText(
        result
      );

    return json(
      {
        ok: true,
        reply:
          text,
        actions:
          allowEdits
            ? extractActions(
                text
              )
            : [],
      },
      200,
      request
    );
  } catch (error) {
    console.error(
      "AI chat error:",
      error
    );

    return json(
      {
        error:
          error?.message ||
          "AI request failed.",
      },
      502,
      request
    );
  }
}

async function aiRewrite(
  request
) {
  const session =
    await getSession(
      request
    );

  if (!session) {
    return json(
      {
        error:
          "Unauthorized.",
      },
      401,
      request
    );
  }

  const body =
    await readJson(
      request
    );

  const text =
    clamp(
      body?.text,
      30000
    ).trim();

  if (!text) {
    return json(
      {
        error:
          "Nothing to rewrite.",
      },
      400,
      request
    );
  }

  const mode =
    clamp(
      body?.mode || "polish",
      100
    );

  const instruction =
    clamp(
      body?.instruction,
      3000
    );

  try {
    const result =
      await callOpenRouter(
        {
          messages: [
            {
              role:
                "system",
              content:
                "You are the writing editor inside Bori. Preserve meaning, facts, voice and emotional intent. Remove unnecessary repetition and clichés. Return only the rewritten text.",
            },

            {
              role:
                "user",
              content:
                `Mode: ${mode}\nInstruction: ${instruction || "None"}\n\nText:\n${text}`,
            },
          ],

          useWeb:
            false,

          temperature:
            0.65,
        }
      );

    return json(
      {
        ok: true,
        rewrite:
          aiText(
            result
          ),
      },
      200,
      request
    );
  } catch (error) {
    console.error(
      "Rewrite error:",
      error
    );

    return json(
      {
        error:
          error?.message ||
          "Rewrite failed.",
      },
      502,
      request
    );
  }
}

/* ============================================================
   STATIC ASSETS
============================================================ */

async function serveAsset(
  request
) {
  const assets =
    ENV.ASSETS;

  if (
    assets &&
    typeof assets.fetch ===
      "function"
  ) {
    return assets.fetch(
      request
    );
  }

  return new Response(
    "Bori is running, but the public assets are not attached to this deployment.",
    {
      status: 503,
      headers: {
        "Content-Type":
          "text/plain; charset=UTF-8",
      },
    }
  );
}

/* ============================================================
   DISCORD
============================================================ */

function hexToBytes(
  hex
) {
  const clean =
    String(hex || "")
      .replace(
        /[^a-f0-9]/gi,
        ""
      );

  const bytes =
    new Uint8Array(
      clean.length / 2
    );

  for (
    let i = 0;
    i < bytes.length;
    i++
  ) {
    bytes[i] =
      parseInt(
        clean.slice(
          i * 2,
          i * 2 + 2
        ),
        16
      );
  }

  return bytes;
}

async function verifyDiscordSignature(
  request,
  body
) {
  if (
    !DISCORD_PUBLIC_KEY
  ) {
    return false;
  }

  const signature =
    request.headers.get(
      "X-Signature-Ed25519"
    );

  const timestamp =
    request.headers.get(
      "X-Signature-Timestamp"
    );

  if (
    !signature ||
    !timestamp
  ) {
    return false;
  }

  try {
    const key =
      await crypto.subtle.importKey(
        "raw",
        hexToBytes(
          DISCORD_PUBLIC_KEY
        ),
        {
          name:
            "Ed25519",
        },
        false,
        [
          "verify",
        ]
      );

    return crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBytes(
        signature
      ),
      new TextEncoder().encode(
        timestamp +
          body
      )
    );
  } catch (
    error
  ) {
    console.error(
      "Discord signature error:",
      error
    );

    return false;
  }
}

async function handleDiscordInteraction(
  request
) {
  const rawBody =
    await request.text();

  const valid =
    await verifyDiscordSignature(
      request,
      rawBody
    );

  if (!valid) {
    return new Response(
      "Invalid signature.",
      {
        status: 401,
      }
    );
  }

  let interaction;

  try {
    interaction =
      JSON.parse(
        rawBody
      );
  } catch {
    return new Response(
      "Invalid JSON.",
      {
        status: 400,
      }
    );
  }

  if (
    interaction.type ===
    1
  ) {
    return json({
      type: 1,
    });
  }

  if (
    interaction.type ===
    2
  ) {
    return handleDiscordCommand(
      interaction
    );
  }

  if (
    interaction.type ===
    3
  ) {
    return handleDiscordComponent(
      interaction
    );
  }

  return discordReply(
    "I don't recognize that interaction."
  );
}

function discordReply(
  content,
  options = {}
) {
  return json({
    type: 4,
    data: {
      content:
        clamp(
          content,
          2000
        ),

      allowed_mentions: {
        parse: [],
      },

      ...options,
    },
  });
}

function discordOption(
  interaction,
  name
) {
  return array(
    interaction?.data
      ?.options
  ).find(
    option =>
      option.name ===
      name
  )?.value;
}

async function handleDiscordCommand(
  interaction
) {
  const name =
    interaction?.data
      ?.name;

  if (
    name ===
    "help"
  ) {
    return discordReply(
      [
        "**BoriBot**",
        "",
        "`/ask` — ask Bori a question",
        "`/startchat` — create a private Bori thread",
        "`/stopchat` — stop your Bori session",
        "`/generate-roles` — generate role ideas",
      ].join(
        "\n"
      )
    );
  }

  if (
    name ===
    "ask"
  ) {
    return discordAsk(
      interaction
    );
  }

  if (
    name ===
    "startchat"
  ) {
    return discordStartChat(
      interaction
    );
  }

  if (
    name ===
    "stopchat"
  ) {
    return discordReply(
      "Your Bori session can be stopped from the current Bori chat controls.",
      {
        flags: 64,
      }
    );
  }

  if (
    name ===
    "generate-roles"
  ) {
    return discordGenerateRoles(
      interaction
    );
  }

  return discordReply(
    "Unknown command."
  );
}

async function discordAsk(
  interaction
) {
  const message =
    clamp(
      discordOption(
        interaction,
        "message"
      ),
      12000
    ).trim();

  if (!message) {
    return discordReply(
      "Please provide a message.",
      {
        flags: 64,
      }
    );
  }

  if (
    !OPENROUTER_API_KEY
  ) {
    return discordReply(
      "The AI service is not configured.",
      {
        flags: 64,
      }
    );
  }

  try {
    const result =
      await callOpenRouter(
        {
          messages: [
            {
              role:
                "system",
              content:
                "You are BoriBot, a Discord AI assistant. Be useful and concise. Use web tools whenever current or externally verifiable information is requested.",
            },

            {
              role:
                "user",
              content:
                message,
            },
          ],

          useWeb:
            true,

          temperature:
            0.65,
        }
      );

    return discordReply(
      aiText(
        result
      ) ||
        "(No response returned.)"
    );
  } catch (
    error
  ) {
    console.error(
      "Discord ask error:",
      error
    );

    return discordReply(
      `I couldn't process that: ${clamp(error?.message || "Unknown error.", 700)}`
    );
  }
}

async function discordStartChat(
  interaction
) {
  if (
    !DISCORD_BOT_TOKEN
  ) {
    return discordReply(
      "DISCORD_BOT_TOKEN is not configured.",
      {
        flags: 64,
      }
    );
  }

  const guildId =
    interaction?.guild_id;

  const channelId =
    interaction?.channel_id;

  const userId =
    interaction
      ?.member
      ?.user
      ?.id ||
    interaction
      ?.user
      ?.id;

  if (
    !guildId ||
    !channelId ||
    !userId
  ) {
    return discordReply(
      "This command must be used inside a server.",
      {
        flags: 64,
      }
    );
  }

  try {
    const thread =
      await discordApi(
        `/channels/${channelId}/threads`,
        {
          method:
            "POST",

          body: {
            name:
              "Bori AI Chat",
            type:
              12,
            invitable:
              false,
            auto_archive_duration:
              1440,
          },
        }
      );

    await discordApi(
      `/channels/${thread.id}/thread-members/${userId}`,
      {
        method:
          "PUT",
      }
    ).catch(
      () => {}
    );

    return discordReply(
      `Your private Bori thread is ready: <#${thread.id}>`,
      {
        flags: 64,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Discord thread error:",
      error
    );

    return discordReply(
      `I couldn't create the private thread: ${clamp(error?.message || "Unknown error.", 700)}`,
      {
        flags: 64,
      }
    );
  }
}

async function discordGenerateRoles(
  interaction
) {
  const title =
    clamp(
      discordOption(
        interaction,
        "title"
      ),
      200
    );

  const description =
    clamp(
      discordOption(
        interaction,
        "description"
      ),
      1000
    );

  try {
    const result =
      await callOpenRouter(
        {
          messages: [
            {
              role:
                "system",
              content:
                'Return ONLY JSON in the format {"roles":[{"name":"...","description":"...","emoji":"..."}]}. Generate 3-8 useful Discord self-role ideas.',
            },

            {
              role:
                "user",
              content:
                `Title: ${title}\nDescription: ${description}`,
            },
          ],

          useWeb:
            false,

          temperature:
            0.8,
        }
      );

    const parsed =
      extractJson(
        aiText(
          result
        )
      );

    const roles =
      array(
        parsed?.roles
      ).slice(
        0,
        8
      );

    if (
      !roles.length
    ) {
      throw new Error(
        "The AI returned no roles."
      );
    }

    return discordReply(
      [
        `### ${title}`,
        "",
        description,
        "",
        ...roles.map(
          role =>
            `${role.emoji || "🎯"} **${role.name}** — ${role.description || ""}`
        ),
      ].join(
        "\n"
      )
    );
  } catch (
    error
  ) {
    return discordReply(
      `Role generation failed: ${clamp(error?.message || "Unknown error.", 700)}`,
      {
        flags: 64,
      }
    );
  }
}

function extractJson(
  text
) {
  const value =
    String(
      text || ""
    ).trim();

  try {
    return JSON.parse(
      value
    );
  } catch {}

  const fenced =
    value.match(
      /```(?:json)?\s*([\s\S]*?)```/i
    );

  if (
    fenced
  ) {
    try {
      return JSON.parse(
        fenced[1]
      );
    } catch {}
  }

  const start =
    value.indexOf(
      "{"
    );

  const end =
    value.lastIndexOf(
      "}"
    );

  if (
    start >= 0 &&
    end > start
  ) {
    try {
      return JSON.parse(
        value.slice(
          start,
          end + 1
        )
      );
    } catch {}
  }

  return null;
}

async function handleDiscordComponent(
  interaction
) {
  const customId =
    String(
      interaction
        ?.data
        ?.custom_id ||
        ""
    );

  if (
    customId.startsWith(
      "bori-role:"
    )
  ) {
    return discordReply(
      "Role controls are ready, but role storage/selection needs to be connected to your server configuration.",
      {
        flags: 64,
      }
    );
  }

  return discordReply(
    "That control is no longer active.",
    {
      flags: 64,
    }
  );
}

async function discordApi(
  path,
  options = {}
) {
  if (
    !DISCORD_BOT_TOKEN
  ) {
    throw new Error(
      "DISCORD_BOT_TOKEN is not configured."
    );
  }

  const config = {
    method:
      options.method ||
      "GET",

    headers: {
      Authorization:
        `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type":
        "application/json",
    },
  };

  if (
    options.body !==
      undefined
  ) {
    config.body =
      JSON.stringify(
        options.body
      );
  }

  const response =
    await fetch(
      `${DISCORD_API}${path}`,
      config
    );

  const text =
    await response.text();

  if (
    !response.ok
  ) {
    let message =
      `Discord returned HTTP ${response.status}.`;

    try {
      const data =
        JSON.parse(
          text
        );

      message =
        data?.message ||
        message;
    } catch {}

    throw new Error(
      message
    );
  }

  if (
    !text
  ) {
    return null;
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return text;
  }
}

/* ============================================================
   DISCORD COMMAND REGISTRATION
============================================================ */

function commandDefinitions() {
  return [
    {
      name:
        "help",
      description:
        "Show BoriBot commands.",
      type: 1,
    },

    {
      name:
        "ask",
      description:
        "Ask BoriBot a question.",
      type: 1,
      options: [
        {
          name:
            "message",
          description:
            "Your question or request.",
          type: 3,
          required:
            true,
        },
      ],
    },

    {
      name:
        "startchat",
      description:
        "Create a private Bori AI thread.",
      type: 1,
    },

    {
      name:
        "stopchat",
      description:
        "Stop your Bori chat.",
      type: 1,
    },

    {
      name:
        "generate-roles",
      description:
        "Generate Discord self-role ideas.",
      type: 1,
      options: [
        {
          name:
            "title",
          description:
            "Role panel title.",
          type: 3,
          required:
            true,
        },

        {
          name:
            "description",
          description:
            "Explain the roles.",
          type: 3,
          required:
            true,
        },
      ],
    },
  ];
}

async function registerDiscordCommands(
  request
) {
  if (
    !DISCORD_BOT_TOKEN ||
    !DISCORD_APPLICATION_ID
  ) {
    return json(
      {
        error:
          "Discord credentials are incomplete.",
      },
      503,
      request
    );
  }

  const endpoint =
    DISCORD_GUILD_ID
      ? `/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`
      : `/applications/${DISCORD_APPLICATION_ID}/commands`;

  try {
    const result =
      await discordApi(
        endpoint,
        {
          method:
            "PUT",

          body:
            commandDefinitions(),
        }
      );

    return json(
      {
        ok: true,
        commands:
          result,
      },
      200,
      request
    );
  } catch (
    error
  ) {
    return json(
      {
        error:
          error?.message ||
          "Command registration failed.",
      },
      502,
      request
    );
  }
}

/* ============================================================
   COMPATIBILITY HELPERS
============================================================ */

async function deferDiscordInteraction(
  interaction,
  ephemeral = false
) {
  const body = {
    type:
      5,
  };

  if (
    ephemeral
  ) {
    body.data = {
      flags:
        64,
    };
  }

  return discordWebhook(
    `/interactions/${interaction.id}/${interaction.token}/callback`,
    {
      method:
        "POST",
      body,
    }
  );
}

async function editDiscordInteraction(
  interaction,
  payload
) {
  return discordWebhook(
    `/webhooks/${DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`,
    {
      method:
        "PATCH",
      body:
        payload,
    }
  );
}

async function discordWebhook(
  path,
  options = {}
) {
  const config = {
    method:
      options.method ||
      "GET",
    headers: {
      "Content-Type":
        "application/json",
    },
  };

  if (
    options.body !==
      undefined
  ) {
    config.body =
      JSON.stringify(
        options.body
      );
  }

  const response =
    await fetch(
      `${DISCORD_API}${path}`,
      config
    );

  const text =
    await response.text();

  if (
    !response.ok
  ) {
    throw new Error(
      `Discord webhook returned HTTP ${response.status}.`
    );
  }

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return text;
  }
}