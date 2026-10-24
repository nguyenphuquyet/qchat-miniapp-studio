use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct TemplateFile {
    pub path: String,
    pub content: String,
}

/// Renders the embedded QChat Mini App starter template.
/// The `@qchat/miniapp-sdk` bridge client is vendored under `src/sdk/` so the
/// generated project builds standalone (no dependency on the QChat monorepo).
pub fn render_template(
    name: &str,
    app_id: &str,
    description: &str,
    version: &str,
    permissions: &[String],
) -> Vec<TemplateFile> {
    let permissions_json = serde_json::to_string(permissions).unwrap_or_else(|_| "[]".into());

    let mut files = vec![
        TemplateFile {
            path: "package.json".into(),
            content: include_str!("../templates/package.json")
                .replace("{{name}}", name)
                .replace("{{version}}", version),
        },
        TemplateFile {
            path: "tsconfig.json".into(),
            content: include_str!("../templates/tsconfig.json").into(),
        },
        TemplateFile {
            path: "vite.config.ts".into(),
            content: include_str!("../templates/vite.config.ts").into(),
        },
        TemplateFile {
            path: "index.html".into(),
            content: include_str!("../templates/index.html").replace("{{name}}", name),
        },
        TemplateFile {
            path: ".gitignore".into(),
            content: include_str!("../templates/.gitignore").into(),
        },
        TemplateFile {
            path: "README.md".into(),
            content: include_str!("../templates/README.md")
                .replace("{{name}}", name)
                .replace("{{appId}}", app_id),
        },
        TemplateFile {
            path: "qchat.manifest.json".into(),
            content: include_str!("../templates/qchat.manifest.json")
                .replace("{{appId}}", app_id)
                .replace("{{name}}", name)
                .replace("{{description}}", description)
                .replace("{{version}}", version)
                .replace("{{permissions}}", &permissions_json),
        },
        TemplateFile {
            path: "src/main.tsx".into(),
            content: include_str!("../templates/src/main.tsx").into(),
        },
        TemplateFile {
            path: "src/App.tsx".into(),
            content: include_str!("../templates/src/App.tsx").replace("{{name}}", name),
        },
        TemplateFile {
            path: "src/styles.css".into(),
            content: include_str!("../templates/src/styles.css").into(),
        },
        TemplateFile {
            path: "scripts/package.mjs".into(),
            content: include_str!("../templates/scripts/package.mjs").into(),
        },
        TemplateFile {
            path: "src/sdk/types.ts".into(),
            content: include_str!("../templates/src/sdk/types.ts").into(),
        },
        TemplateFile {
            path: "src/sdk/errors.ts".into(),
            content: include_str!("../templates/src/sdk/errors.ts").into(),
        },
        TemplateFile {
            path: "src/sdk/protocol.ts".into(),
            content: include_str!("../templates/src/sdk/protocol.ts").into(),
        },
        TemplateFile {
            path: "src/sdk/client.ts".into(),
            content: include_str!("../templates/src/sdk/client.ts").into(),
        },
        TemplateFile {
            path: "src/sdk/index.ts".into(),
            content: include_str!("../templates/src/sdk/index.ts").into(),
        },
    ];
    files.sort_by(|a, b| a.path.cmp(&b.path));
    files
}

/// JavaScript mock of the Flutter `QChatNative` bridge. Injected into the
/// preview's index.html so the vendored SDK works exactly as on-device.
pub const MOCK_BRIDGE_JS: &str = r#"
(function () {
  var STORAGE_KEY = "__qchat_preview_storage__";
  function readStore() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (e) { return {}; } }
  function writeStore(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
  function respond(id, ok, result) {
    var payload = ok ? { id: id, ok: true, result: result } : { id: id, ok: false, error: result };
    if (typeof window.__QChatReceive === "function") window.__QChatReceive(JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("qchat:message", { detail: payload }));
  }
  function toast(msg) {
    var el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = "position:fixed;left:50%;bottom:48px;transform:translateX(-50%);background:rgba(0,0,0,.82);color:#fff;padding:10px 18px;border-radius:999px;font:13px system-ui;z-index:99999;box-shadow:0 6px 24px rgba(0,0,0,.35);";
    document.body.appendChild(el);
    setTimeout(function () { el.style.transition = "opacity .3s"; el.style.opacity = "0"; setTimeout(function () { el.remove(); }, 320); }, 1800);
  }
  window.QChatNative = {
    postMessage: function (raw) {
      var req;
      try { req = JSON.parse(raw); } catch (e) { return; }
      var id = req.id, method = req.method, params = req.params || {};
      switch (method) {
        case "getAppInfo":
          respond(id, true, {
            appId: window.__QCHAT_APP__.appId, name: window.__QCHAT_APP__.name,
            version: window.__QCHAT_APP__.version, entry: "index.html",
            runtimeVersion: "1.0.0-preview", minRuntimeVersion: "1.0.0",
            permissions: window.__QCHAT_APP__.permissions
          });
          break;
        case "getSystemInfo":
          respond(id, true, {
            platform: "android", osVersion: "14", appVersion: "3.0.0",
            runtimeVersion: "1.0.0-preview", locale: "vi_VN", theme: "dark",
            screenWidth: 390, screenHeight: 844, pixelRatio: 3,
            safeAreaTop: 44, safeAreaBottom: 34
          });
          break;
        case "getUserInfo":
          respond(id, true, {
            id: "u_preview", qchatId: "preview.user", nickname: "Preview User",
            avatarUrl: null
          });
          break;
        case "showToast":
          toast(params.message || "");
          respond(id, true, null);
          break;
        case "getStorage": {
          var s = readStore();
          respond(id, true, { value: s[params.key] !== undefined ? s[params.key] : null });
          break;
        }
        case "setStorage": {
          var s = readStore();
          s[params.key] = params.value;
          writeStore(s);
          respond(id, true, null);
          break;
        }
        case "removeStorage": {
          var s = readStore();
          delete s[params.key];
          writeStore(s);
          respond(id, true, null);
          break;
        }
        case "chooseImage": {
          var input = document.createElement("input");
          input.type = "file"; input.accept = "image/*";
          input.onchange = function () {
            var f = input.files && input.files[0];
            if (!f) { respond(id, false, { code: "CANCELLED", message: "Cancelled" }); return; }
            var reader = new FileReader();
            reader.onload = function () {
              var img = new Image();
              img.onload = function () {
                respond(id, true, { dataUrl: reader.result, mimeType: f.type, width: img.width, height: img.height, size: f.size });
              };
              img.onerror = function () { respond(id, false, { code: "HOST_ERROR", message: "Could not read image" }); };
              img.src = reader.result;
            };
            reader.onerror = function () { respond(id, false, { code: "HOST_ERROR", message: "Read failed" }); };
            reader.readAsDataURL(f);
          };
          input.click();
          break;
        }
        case "share":
          toast("Shared (preview): " + (params.text || params.url || ""));
          respond(id, true, { shared: true });
          break;
        case "navigateTo":
          respond(id, true, null);
          break;
        case "closeMiniApp":
          toast("Mini app closed (preview)");
          respond(id, true, null);
          break;
        case "request":
          if (params.path === "/users/me") respond(id, true, { id: "u_preview", qchatId: "preview.user", nickname: "Preview User" });
          else if (params.path === "/friends") respond(id, true, { items: [], total: 0 });
          else if (params.path === "/conversations") respond(id, true, { items: [], total: 0 });
          else respond(id, false, { code: "NOT_SUPPORTED", message: "Path not allowed in preview" });
          break;
        default:
          respond(id, false, { code: "NOT_SUPPORTED", message: "Method " + method + " is not implemented in preview" });
      }
    }
  };
})();
"#;
